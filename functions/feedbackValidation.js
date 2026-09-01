// SOURCE OF TRUTH: outputs/USER-FEEDBACK-FORM/design_spec.md §2.7 "Validation Rule Table".
// This file is a deliberate mirror of web-admin/src/services/feedbackValidation.ts.
// The two module systems (ESM/TS vs CommonJS) cannot share a module — see design_spec.md §2.7.
// ANY change here MUST be applied to the mirror in the same commit.
// Parity is enforced by functions/test/validation-parity.test.js (advisory — RULING D3).

"use strict";

/**
 * Server-side validation + gate helpers for the feedback endpoint.
 *
 * The gate helpers (resolveOrigin, checkMethod, checkContentType,
 * checkBodySize, pickAllowedFields) are declared as PURE FUNCTIONS so the
 * cheap-rejection matrix in §3.2 can be asserted under `node --test` with
 * no req/res doubles. See §3.9.
 *
 * validateFeedback returns the ARRAY shape {field, message}[] that the
 * REQ-021 `errors[]` envelope requires. This differs from the client
 * mirror which returns a map keyed by field — same rules, different
 * return container (documented, intentional).
 *
 * Messages are short ENGLISH strings — user-facing Bengali copy lives
 * client-side. Do NOT translate these; RULING D3 flags any such change.
 */

// ---------------------------------------------------------------------------
// Constants — mirrored verbatim with web-admin/src/services/feedbackValidation.ts
// ---------------------------------------------------------------------------

const NAME_MIN = 2;
const NAME_MAX = 50;
const EMAIL_MAX = 254;
const COMMENT_MIN = 10;
const COMMENT_MAX = 1000;

const NAME_PATTERN = /^[\p{L}][\p{L}\s'’-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Strict allow-list of persisted body keys — order is API-facing (REQ-021). */
const ALLOWED_FIELDS = ["firstName", "lastName", "email", "comment"];

/** Body-size ceiling — 8 KB (ASM-009 / EC-015). */
const MAX_BODY_BYTES = 8192;

// ---------------------------------------------------------------------------
// Sanitization pipeline (§3.3)
// ---------------------------------------------------------------------------

/**
 * Sanitize a single-line value: strip C0 controls (incl. CR/LF), collapse
 * whitespace runs, then trim. Makes SMTP header injection structurally
 * impossible for firstName / lastName / email (§3.3, REQ-017).
 *
 * @param {string} value
 * @returns {string}
 */
function sanitizeSingleLine(value) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitize a multi-line value: strip C0 controls EXCEPT U+000A (LF), then
 * trim. Preserves newlines in `comment` so the mail body renders as the
 * visitor intended (§3.3 step 3).
 *
 * @param {string} value
 * @returns {string}
 */
function sanitizeMultiLine(value) {
  return value
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Validation — returns the ARRAY envelope shape (REQ-021)
// ---------------------------------------------------------------------------

/**
 * Validate a trimmed / sanitized draft. Returns an array of
 * `{field, message}` entries in the mandatory order:
 *   required → length → pattern
 * on every field (RULING D3 — asserted independently by Agent 6).
 *
 * An empty array means the draft is valid.
 *
 * @param {{firstName?:string,lastName?:string,email?:string,comment?:string}} draft
 * @returns {Array<{field:string,message:string}>}
 */
function validateFeedback(draft) {
  const errors = [];

  const firstName = draft.firstName;
  if (!firstName) {
    errors.push({ field: "firstName", message: "First name is required" });
  } else if (firstName.length < NAME_MIN || firstName.length > NAME_MAX) {
    errors.push({ field: "firstName", message: "First name length is invalid" });
  } else if (!NAME_PATTERN.test(firstName)) {
    errors.push({ field: "firstName", message: "First name contains invalid characters" });
  }

  const lastName = draft.lastName;
  if (!lastName) {
    errors.push({ field: "lastName", message: "Last name is required" });
  } else if (lastName.length < NAME_MIN || lastName.length > NAME_MAX) {
    errors.push({ field: "lastName", message: "Last name length is invalid" });
  } else if (!NAME_PATTERN.test(lastName)) {
    errors.push({ field: "lastName", message: "Last name contains invalid characters" });
  }

  const email = draft.email;
  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (email.length > EMAIL_MAX) {
    errors.push({ field: "email", message: "Email length is invalid" });
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Email format is invalid" });
  }

  const comment = draft.comment;
  if (!comment) {
    errors.push({ field: "comment", message: "Comment is required" });
  } else if (comment.length < COMMENT_MIN || comment.length > COMMENT_MAX) {
    errors.push({ field: "comment", message: "Comment length is invalid" });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Gate helpers — pure functions, no req/res, no I/O (§3.1, F-05)
// ---------------------------------------------------------------------------

/**
 * Gates 1 + partial 2: same-origin comparison plus the two dev ports
 * (binding instruction #8 / §3.4). NEVER emits `*`.
 *
 * @param {string|undefined} originHeader Value of `Origin` request header (may be undefined).
 * @param {string}           hostname     `req.hostname` from Express-compatible req.
 * @returns {{allowed:boolean, echo:string|null}}
 *          `allowed=true` + `echo=<origin>` on an allowed origin;
 *          `allowed=true` + `echo=null` when the header is absent (proceed, do not emit ACAO);
 *          `allowed=false` + `echo=null` on a disallowed origin (403).
 */
function resolveOrigin(originHeader, hostname) {
  const origin = typeof originHeader === "string" ? originHeader : "";
  if (!origin) return { allowed: true, echo: null };

  const sameOrigin = origin === `https://${hostname}`;
  const isDev = origin === "http://localhost:5173" || origin === "http://localhost:4173";
  if (sameOrigin || isDev) {
    return { allowed: true, echo: origin };
  }
  return { allowed: false, echo: null };
}

/**
 * Gate 3: only POST is accepted (§3.2 / REQ-005).
 *
 * @param {string} method
 * @returns {null | {status:number, message:string}}
 *          `null` on POST; a verdict object on any other method (caller
 *          also sets `Allow: POST, OPTIONS`).
 */
function checkMethod(method) {
  return method === "POST" ? null : { status: 405, message: "Method not allowed" };
}

/**
 * Gate 4: `Content-Type` must start with `application/json`
 * (charset params allowed).
 *
 * @param {string|undefined} contentTypeHeader
 * @returns {null | {status:number, message:string}}
 */
function checkContentType(contentTypeHeader) {
  const value = (contentTypeHeader || "").toLowerCase();
  return value.startsWith("application/json")
    ? null
    : { status: 415, message: "Unsupported media type" };
}

/**
 * Gate 5: 8 KB rawBody ceiling — GUARDED dereference (F-13).
 * Uses `rawBody?.length ?? 0` — a naked `.length` throws TypeError when
 * `rawBody` is undefined and turns a cheap 413 into an unhandled 500.
 *
 * @param {Buffer|string|undefined} rawBody
 * @returns {null | {status:number, message:string}}
 */
function checkBodySize(rawBody) {
  const size = rawBody?.length ?? 0;
  return size > MAX_BODY_BYTES ? { status: 413, message: "Payload too large" } : null;
}

/**
 * Gate 7: build a fresh object by PULLING the four allow-listed keys, and
 * count (never name) any extras (F-12 / AC-018 / EC-016).
 *
 * NEVER echoes attacker-supplied key names — response and logs record the
 * `rejectedCount` integer only. Prototype pollution is defeated by
 * literal key-by-key construction, not by a __proto__ deny-list.
 *
 * @param {unknown} body
 * @returns {{picked:{firstName:unknown,lastName:unknown,email:unknown,comment:unknown},
 *            rejectedCount:number}}
 */
function pickAllowedFields(body) {
  const plain = isPlainObject(body) ? body : {};
  const keys = Object.keys(plain);
  const rejectedCount = keys.filter((key) => !ALLOWED_FIELDS.includes(key)).length;

  return {
    picked: {
      firstName: plain.firstName,
      lastName: plain.lastName,
      email: plain.email,
      comment: plain.comment
    },
    rejectedCount
  };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  // constants (mirrored)
  NAME_MIN,
  NAME_MAX,
  EMAIL_MAX,
  COMMENT_MIN,
  COMMENT_MAX,
  NAME_PATTERN,
  EMAIL_PATTERN,
  ALLOWED_FIELDS,
  MAX_BODY_BYTES,
  // sanitizers
  sanitizeSingleLine,
  sanitizeMultiLine,
  // validation
  validateFeedback,
  // gate helpers (F-05 — §3.1 claims these live here; this is that declaration)
  resolveOrigin,
  checkMethod,
  checkContentType,
  checkBodySize,
  pickAllowedFields
};
