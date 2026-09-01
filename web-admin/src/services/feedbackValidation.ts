// SOURCE OF TRUTH: outputs/USER-FEEDBACK-FORM/design_spec.md §2.7 "Validation Rule Table".
// This file is a deliberate mirror of functions/feedbackValidation.js.
// The two module systems (ESM/TS vs CommonJS) cannot share a module — see design_spec.md §2.7.
// ANY change here MUST be applied to the mirror in the same commit.
// Parity is enforced by functions/test/validation-parity.test.js (advisory — RULING D3).

import type { FeedbackDraft, FeedbackFieldErrors } from "../types";

/**
 * Pure client-side validation module for the public feedback form.
 *
 * Contract:
 *  - No React import.
 *  - No Firebase import.
 *  - No DOM access.
 *  - No I/O.
 *
 * Rules are applied to the *trimmed* value (EC-002). Message ordering is
 * required → length → pattern and MUST be asserted independently by tests
 * on both this file and functions/feedbackValidation.js (RULING D3).
 *
 * See §2.4 of the design spec for full field-by-field rule tables.
 */

// ---------------------------------------------------------------------------
// Constants (mirrored — see functions/feedbackValidation.js)
// ---------------------------------------------------------------------------

/** Minimum length for firstName / lastName (inclusive). */
export const NAME_MIN = 2;
/** Maximum length for firstName / lastName (inclusive). */
export const NAME_MAX = 50;
/** Maximum email length (RFC 5321 practical ceiling — ASM-005). */
export const EMAIL_MAX = 254;
/** Minimum comment length (inclusive). */
export const COMMENT_MIN = 10;
/** Maximum comment length (inclusive). */
export const COMMENT_MAX = 1000;

/**
 * Name pattern — Unicode letter (leading), then letters / spaces / apostrophes / hyphens.
 * Linear-time by construction — see §2.4.
 */
export const NAME_PATTERN: RegExp = /^[\p{L}][\p{L}\s'’-]*$/u;

/**
 * Email pattern — deliberately not the RFC 5322 grammar (ASM-005 / ReDoS avoidance).
 * Uses only negated character classes so it is linear-time.
 */
export const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a single field. Returns a Bengali (ASM-015) user-facing error
 * message string when invalid, or `undefined` when the value passes.
 *
 * Message ordering (mandatory): required → length → pattern.
 *
 * @param field    One of "firstName" | "lastName" | "email" | "comment".
 * @param rawValue The raw (un-trimmed) input string as typed by the user.
 * @returns        Bengali error message when invalid; `undefined` when valid.
 */
export function validateField(
  field: keyof FeedbackDraft,
  rawValue: string
): string | undefined {
  const value = rawValue.trim();

  if (field === "firstName" || field === "lastName") {
    if (!value) return "এই ঘরটি পূরণ করুন";
    if (value.length < NAME_MIN || value.length > NAME_MAX) {
      return `নাম ${NAME_MIN}-${NAME_MAX} অক্ষরের মধ্যে হতে হবে`;
    }
    if (!NAME_PATTERN.test(value)) {
      return "শুধু বর্ণ, স্পেস, হাইফেন, অ্যাপোস্ট্রফি ব্যবহার করুন";
    }
    return undefined;
  }

  if (field === "email") {
    if (!value) return "ইমেইল দিন";
    if (value.length > EMAIL_MAX) {
      return `ইমেইল ${EMAIL_MAX} অক্ষরের বেশি হতে পারবে না`;
    }
    if (!EMAIL_PATTERN.test(value)) {
      return "সঠিক ইমেইল দিন";
    }
    return undefined;
  }

  if (!value) return "মন্তব্য লিখুন";
  if (value.length < COMMENT_MIN || value.length > COMMENT_MAX) {
    return `মন্তব্য ${COMMENT_MIN}-${COMMENT_MAX} অক্ষরের মধ্যে হতে হবে`;
  }
  return undefined;
}

/**
 * Validate every field in a draft. Returns a `FeedbackFieldErrors` map
 * containing only the fields that failed. An empty map means the draft
 * is valid.
 *
 * Called by `FeedbackPage.handleSubmit` (step 4) — always evaluated
 * regardless of `touched` state so autofill without change events (EC-020)
 * is covered.
 *
 * @param draft Full draft object with the four persisted fields.
 * @returns     Map keyed by field name — omit keys that pass.
 */
export function validateFeedback(draft: FeedbackDraft): FeedbackFieldErrors {
  const next: FeedbackFieldErrors = {};
  const firstNameError = validateField("firstName", draft.firstName);
  const lastNameError = validateField("lastName", draft.lastName);
  const emailError = validateField("email", draft.email);
  const commentError = validateField("comment", draft.comment);

  if (firstNameError) next.firstName = firstNameError;
  if (lastNameError) next.lastName = lastNameError;
  if (emailError) next.email = emailError;
  if (commentError) next.comment = commentError;

  return next;
}
