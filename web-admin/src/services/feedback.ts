import type {
  FeedbackApiSuccess,
  FeedbackApiFailure,
  FeedbackDraft,
  FeedbackFieldErrors,
  FeedbackLocalRecord,
  FeedbackSubmitResult,
  FeedbackSyncState
} from "../types";

/**
 * Feedback network + localStorage service.
 *
 * Contract:
 *  - Owns all `fetch` and all `localStorage` for the feedback feature.
 *  - No JSX. No React import.
 *  - `submitFeedback` writes the local record BEFORE the network call
 *    (REQ-008) and updates the sync state (SYNCED/FAILED) after.
 *  - Storage failures MUST NEVER propagate — the network call must still
 *    round-trip and `ok: true` must still be returned even when nothing
 *    could be persisted locally (AC-016).
 *
 * See §2.3 of the design spec for the full sequence, error mapping, and
 * `localStorage` hardening rules (EC-009 / EC-010 / EC-011).
 */

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

/** Same-origin relative endpoint — no VITE_API_BASE_URL (§4.1 rewrite). */
export const FEEDBACK_ENDPOINT = "/api/feedback/submit";

/** Versioned localStorage key (ASM-007). */
export const FEEDBACK_STORAGE_KEY = "bloodpoint.feedback.v1";

/** Local record cap — oldest-first eviction (ASM-008 / EC-010). */
export const FEEDBACK_LOCAL_LIMIT = 50;

/** Client-side network timeout (ASM-013 / EC-006). */
export const FEEDBACK_REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist the draft locally (PENDING), POST it to the feedback endpoint
 * with a bounded timeout, then reconcile the local record's `syncState`
 * to SYNCED (on 200 with the AC-010 envelope) or FAILED (on any other
 * outcome including network error, timeout, 4xx and 5xx).
 *
 * Never throws — every expected outcome is encoded in the returned
 * `FeedbackSubmitResult` discriminated union.
 *
 * See §2.3 for the full nine-step algorithm.
 *
 * @param draft Trimmed / lower-cased normalization is performed internally.
 * @returns     A `FeedbackSubmitResult` describing success or the failure
 *              class (VALIDATION / RATE_LIMITED / NETWORK / TIMEOUT / SERVER).
 */
export async function submitFeedback(
  draft: FeedbackDraft
): Promise<FeedbackSubmitResult> {
  const normalized: FeedbackDraft = {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim().toLowerCase(),
    comment: draft.comment.trim()
  };

  const localId = newLocalId();
  const createdAt = Date.now();
  appendLocalFeedback({ ...normalized, localId, createdAt, syncState: "PENDING" });

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FEEDBACK_REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
        signal: controller.signal
      });
    } catch (error) {
      markLocalFeedback(localId, "FAILED");
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: false, reason: "TIMEOUT", userMessage: "সময় শেষ হয়েছে, আবার চেষ্টা করুন" };
      }
      return { ok: false, reason: "NETWORK", userMessage: "নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন" };
    }

    const payload = await safeJson(response);

    if (response.status === 200 && isFeedbackApiSuccess(payload)) {
      markLocalFeedback(localId, "SYNCED", payload.data.id);
      return { ok: true, userMessage: "Saved!! Thank you." };
    }

    markLocalFeedback(localId, "FAILED");

    if (response.status === 400) {
      const fieldErrors = mapServerErrors(payload);
      return {
        ok: false,
        reason: "VALIDATION",
        userMessage: "দয়া করে তথ্যগুলো ঠিক করে আবার চেষ্টা করুন",
        fieldErrors
      };
    }

    if (response.status === 429) {
      return { ok: false, reason: "RATE_LIMITED", userMessage: "অনেকবার চেষ্টা করা হয়েছে, একটু পরে আবার চেষ্টা করুন" };
    }

    return { ok: false, reason: "SERVER", userMessage: "সার্ভারে সমস্যা হয়েছে, পরে আবার চেষ্টা করুন" };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Storage primitives (exported for testability — §6.2)
// ---------------------------------------------------------------------------

/**
 * Read all locally-persisted feedback records. Returns `[]` on any of:
 *  - key missing
 *  - JSON.parse throws (EC-011)
 *  - parsed value is not an array (EC-011)
 *  - any getItem-time throw (EC-009)
 *
 * Additionally filters out entries missing `localId` or `syncState` so a
 * hand-edited store cannot crash `markLocalFeedback`.
 */
export function readLocalFeedback(): FeedbackLocalRecord[] {
  try {
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is FeedbackLocalRecord => {
      if (!isRecord(item)) return false;
      return (
        typeof item.localId === "string" &&
        typeof item.firstName === "string" &&
        typeof item.lastName === "string" &&
        typeof item.email === "string" &&
        typeof item.comment === "string" &&
        typeof item.createdAt === "number" &&
        (item.syncState === "PENDING" || item.syncState === "SYNCED" || item.syncState === "FAILED")
      );
    });
  } catch {
    return [];
  }
}

/**
 * Append a record to the store, capped at `FEEDBACK_LOCAL_LIMIT` with
 * oldest-first eviction. `QuotaExceededError` triggers ONE retry after
 * truncating to the newest 10 records; a second throw is swallowed
 * silently (EC-009 / AC-016).
 */
export function appendLocalFeedback(record: FeedbackLocalRecord): void {
  const write = (records: FeedbackLocalRecord[]) => {
    window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(records));
  };

  try {
    const next = [...readLocalFeedback(), record].slice(-FEEDBACK_LOCAL_LIMIT);
    write(next);
  } catch (error) {
    if (isQuotaError(error)) {
      try {
        const truncated = [...readLocalFeedback(), record].slice(-10);
        write(truncated);
      } catch {
        // Swallow localStorage failures; network flow must continue.
      }
    }
  }
}

/**
 * Update the `syncState` (and optionally `remoteId`) of a previously-appended
 * record. Silently no-ops when the record is not found (a `readLocalFeedback`
 * reset may have removed it — that is not an error). Never throws.
 */
export function markLocalFeedback(
  localId: string,
  syncState: FeedbackSyncState,
  remoteId?: string
): void {
  try {
    const records = readLocalFeedback();
    const index = records.findIndex((entry) => entry.localId === localId);
    if (index < 0) return;
    records[index] = { ...records[index], syncState, remoteId };
    window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Swallow localStorage failures; feedback result should still return.
  }
}

// ---------------------------------------------------------------------------
// Response typing (F-10) — must NEVER be `any`; must be `unknown` + guards
// ---------------------------------------------------------------------------

/**
 * Parse a `Response` body as JSON returning `unknown`. Never throws — a
 * non-JSON body, a JSON.parse failure, or a `res.json()` rejection all
 * resolve to `null`.
 *
 * The `Promise<unknown>` return type is load-bearing: `Promise<any>`
 * silently disables type safety across the whole result path and would
 * fail RULING D3's parity intent. See §2.3.
 */
async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Type-guard for the FeedbackApiSuccess envelope (REQ-021 / AC-010).
 * Order of checks (mandatory): object → non-null → success===true → data
 * present → data.id string → data.timestamp string.
 */
function isFeedbackApiSuccess(v: unknown): v is FeedbackApiSuccess {
  if (!isRecord(v)) return false;
  if (v.success !== true) return false;
  if (!isRecord(v.data)) return false;
  return typeof v.data.id === "string" && typeof v.data.timestamp === "string";
}

/**
 * Type-guard for the FeedbackApiFailure envelope. `errors` may be empty
 * (all 5xx use `errors: []` per AC-031).
 */
function isFeedbackApiFailure(v: unknown): v is FeedbackApiFailure {
  if (!isRecord(v)) return false;
  if (v.success !== false) return false;
  if (typeof v.message !== "string") return false;
  return Array.isArray(v.errors);
}

/**
 * Map a server 400 failure envelope into a client-side field error map.
 * Applies `isFeedbackApiFailure` FIRST, then keeps only entries whose
 * `field` name is one of the four known keys — so neither a malformed
 * body nor a hostile response can inject arbitrary keys into React state.
 */
function mapServerErrors(payload: unknown): FeedbackFieldErrors {
  if (!isFeedbackApiFailure(payload)) return {};
  const allowed = new Set<keyof FeedbackDraft>(["firstName", "lastName", "email", "comment"]);
  const mapped: FeedbackFieldErrors = {};
  for (const err of payload.errors) {
    if (!isRecord(err)) continue;
    const field = err.field;
    const message = err.message;
    if (typeof field === "string" && typeof message === "string" && allowed.has(field as keyof FeedbackDraft)) {
      mapped[field as keyof FeedbackDraft] = message;
    }
  }
  return mapped;
}

/**
 * Generate a local id. Uses `crypto.randomUUID()` when available, falls
 * back to `${Date.now()}-${random36}` otherwise. Never sent to the server;
 * carries no security meaning — used only to correlate PENDING → SYNCED /
 * FAILED transitions.
 */
function newLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
}
