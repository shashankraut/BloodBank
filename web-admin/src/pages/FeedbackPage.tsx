import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { Link } from "react-router-dom";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";
import { submitFeedback } from "../services/feedback";
import {
  COMMENT_MAX,
  EMAIL_MAX,
  NAME_MAX,
  validateField,
  validateFeedback
} from "../services/feedbackValidation";
import type {
  FeedbackDraft,
  FeedbackFieldErrors
} from "../types";

/**
 * Public feedback page (REQ-001, REQ-002, REQ-003, REQ-011, REQ-012,
 * REQ-013, REQ-014, REQ-015, REQ-021).
 *
 * Route: `/feedback` — a direct <Routes> child, sibling to `/submit-content`,
 * OUTSIDE the /admin ProtectedRoute branch (binding instruction #23).
 *
 * NO honeypot (binding instruction #14 / F-07). Every path that reaches the
 * submit step issues exactly one POST (AC-009).
 *
 * See design_spec.md §2.1 for full render structure, per-field contract,
 * and the nine-step handleSubmit algorithm.
 */

// ---------------------------------------------------------------------------
// Module-local constants
// ---------------------------------------------------------------------------

const EMPTY_DRAFT: FeedbackDraft = {
  firstName: "",
  lastName: "",
  email: "",
  comment: ""
};

/** Visible-until-fade-out duration (ASM-006). */
const TOAST_VISIBLE_MS = 4000;
/** Fade-out duration (matches CSS transition/animation). */
const TOAST_FADE_MS = 300;

// ---------------------------------------------------------------------------
// Types (page-local)
// ---------------------------------------------------------------------------

type TouchedMap = Partial<Record<keyof FeedbackDraft, boolean>>;

// ---------------------------------------------------------------------------
// FeedbackPage — named function export, NO return-type annotation (F-20).
// ---------------------------------------------------------------------------

export function FeedbackPage() {
  const [draft, setDraft] = useState<FeedbackDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FeedbackFieldErrors>({});
  const [touched, setTouched] = useState<TouchedMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const firstNameRef = useRef<HTMLInputElement>(null);

  /**
   * Stable callback so FeedbackToast's timer effect does not restart on
   * every parent render. See design_spec §2.2 — an unstable callback would
   * make the 4 s timer restart on each keystroke and the toast would never
   * dismiss.
   */
  const dismissToast = useCallback(() => setToastOpen(false), []);

  /**
   * Change handler factory (§2.1). If `touched[field]` is true, re-runs
   * `validateField(field, value)` and updates only that key of `errors`
   * (REQ-003 "on change after first blur").
   */
  function handleChange(field: keyof FeedbackDraft) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      setDraft((prev) => ({ ...prev, [field]: nextValue }));
      if (touched[field]) {
        const nextError = validateField(field, nextValue);
        setErrors((prev) => {
          const next = { ...prev };
          if (nextError) next[field] = nextError;
          else delete next[field];
          return next;
        });
      }
    };
  }

  /**
   * Blur handler factory (§2.1). Marks the field touched, validates it,
   * updates `errors[field]`.
   */
  function handleBlur(field: keyof FeedbackDraft) {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const nextError = validateField(field, draft[field]);
      setErrors((prev) => {
        const next = { ...prev };
        if (nextError) next[field] = nextError;
        else delete next[field];
        return next;
      });
    };
  }

  /**
   * Nine-step submit sequence — see design_spec §2.1 handleSubmit.
   * NO honeypot branch — every path reaching step 7 issues exactly one POST.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setBanner(null);
    setToastOpen(false);
    setLiveMessage("");

    const nextErrors = validateFeedback(draft);
    setTouched({ firstName: true, lastName: true, email: true, comment: true });
    setErrors(nextErrors);

    const fields: Array<keyof FeedbackDraft> = ["firstName", "lastName", "email", "comment"];
    const firstInvalidField = fields.find((field) => Boolean(nextErrors[field]));
    if (firstInvalidField) {
      if (firstInvalidField === "firstName") firstNameRef.current?.focus();
      else {
        const el = document.getElementById(`feedback-${firstInvalidField}`);
        if (el instanceof HTMLElement) el.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitFeedback(draft);
      if (result.ok) {
        setDraft(EMPTY_DRAFT);
        setErrors({});
        setTouched({});
        setBanner(null);
        setToastOpen(true);
        setLiveMessage("Saved!! Thank you.");
        return;
      }

      setBanner(result.userMessage);
      if (result.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Reset (REQ-013). Clears state + banner + toast, refocuses First Name.
   * Does NOT clear localStorage — RULING D5 binding condition (4).
   * Wired as type="button" onClick — not a native form reset.
   */
  function handleReset(): void {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setTouched({});
    setBanner(null);
    setToastOpen(false);
    setLiveMessage("");
    firstNameRef.current?.focus();
  }

  /**
   * Helper for the per-field `aria-describedby` id list. Never returns an
   * id for a node that is not rendered (§2.1).
   */
  function describedBy(field: keyof FeedbackDraft): string | undefined {
    const ids = [] as string[];
    if (errors[field]) ids.push(`feedback-${field}-error`);
    if (field === "email") ids.push("feedback-email-helper");
    else ids.push(`feedback-${field}-counter`);
    return ids.length > 0 ? ids.join(" ") : undefined;
  }

  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <section className="legal-card feedback-card">
          <div className="heading-row">
            <h1 id="feedback-heading">USER FEEDBACK FORM</h1>
            <Link className="btn" to="/">হোমে ফিরুন</Link>
          </div>
          <p className="muted">We&apos;d love to hear from you. Share your thoughts and feedback.</p>
          {banner ? (
            <div className="error" role="alert">{banner}</div>
          ) : null}
          <div className="feedback-live sr-only" role="status" aria-live="polite">{liveMessage}</div>
          <form className="submit-form feedback-form" onSubmit={handleSubmit} noValidate>
            <div className="feedback-field">
              <label htmlFor="feedback-firstName">First Name *</label>
              <input
                ref={firstNameRef}
                id="feedback-firstName"
                type="text"
                value={draft.firstName}
                maxLength={NAME_MAX}
                aria-invalid={errors.firstName ? "true" : undefined}
                aria-describedby={describedBy("firstName")}
                onChange={handleChange("firstName")}
                onBlur={handleBlur("firstName")}
              />
              {errors.firstName ? <p id="feedback-firstName-error" className="error-text">{errors.firstName}</p> : null}
              <div id="feedback-firstName-counter" className="muted">{draft.firstName.length}/{NAME_MAX} characters</div>
            </div>

            <div className="feedback-field">
              <label htmlFor="feedback-lastName">Last Name *</label>
              <input
                id="feedback-lastName"
                type="text"
                value={draft.lastName}
                maxLength={NAME_MAX}
                aria-invalid={errors.lastName ? "true" : undefined}
                aria-describedby={describedBy("lastName")}
                onChange={handleChange("lastName")}
                onBlur={handleBlur("lastName")}
              />
              {errors.lastName ? <p id="feedback-lastName-error" className="error-text">{errors.lastName}</p> : null}
              <div id="feedback-lastName-counter" className="muted">{draft.lastName.length}/{NAME_MAX} characters</div>
            </div>

            <div className="feedback-field">
              <label htmlFor="feedback-email">Email Address *</label>
              <input
                id="feedback-email"
                type="email"
                value={draft.email}
                maxLength={EMAIL_MAX}
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={describedBy("email")}
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
              />
              {errors.email ? <p id="feedback-email-error" className="error-text">{errors.email}</p> : null}
              <div id="feedback-email-helper" className="muted">Please enter valid email</div>
            </div>

            <div className="feedback-field">
              <label htmlFor="feedback-comment">Your Feedback/Comment *</label>
              <textarea
                id="feedback-comment"
                value={draft.comment}
                maxLength={COMMENT_MAX}
                aria-invalid={errors.comment ? "true" : undefined}
                aria-describedby={describedBy("comment")}
                onChange={handleChange("comment")}
                onBlur={handleBlur("comment")}
              />
              {errors.comment ? <p id="feedback-comment-error" className="error-text">{errors.comment}</p> : null}
              <div id="feedback-comment-counter" className="muted">{draft.comment.length}/{COMMENT_MAX} characters</div>
            </div>

            <div className="feedback-actions">
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button type="button" className="btn" onClick={handleReset} disabled={submitting}>
                Reset
              </button>
            </div>
          </form>
        </section>
      </main>
      {toastOpen ? <FeedbackToast onDismiss={dismissToast} /> : null}
      <PublicFooter />
    </>
  );
}

// ---------------------------------------------------------------------------
// FeedbackToast (COMP-003) — co-located, module-local, non-exported.
// ---------------------------------------------------------------------------

type FeedbackToastProps = { onDismiss: () => void };

/**
 * Visual-only confirmation toast (REQ-011). Purely visual — carries
 * `aria-hidden="true"`. The AT announcement is owned by the persistent
 * `.feedback-live` region in FeedbackPage (F-08).
 *
 * Lifecycle (§2.2):
 *  1. Mount with phase === "in".
 *  2. Timer flips phase to "out" after TOAST_VISIBLE_MS.
 *  3. Second timer calls onDismiss after TOAST_FADE_MS so the fade-out
 *     is visible before unmount.
 *  4. Both effects MUST return a clearTimeout cleanup — StrictMode
 *     double-invokes effects in dev.
 */
function FeedbackToast(props: FeedbackToastProps) {
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("out"), TOAST_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (phase !== "out") return;
    const id = window.setTimeout(props.onDismiss, TOAST_FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase, props.onDismiss]);

  return (
    <div
      className={`feedback-toast feedback-toast-${phase}`}
      aria-hidden="true"
    >
      <span className="feedback-toast-text">Saved!! Thank you.</span>
      <button
        type="button"
        className="feedback-toast-close"
        tabIndex={-1}
        aria-label="Dismiss confirmation"
        onClick={props.onDismiss}
      >
        ×
      </button>
    </div>
  );
}
