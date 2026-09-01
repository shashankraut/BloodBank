"use strict";

const nodemailer = require("nodemailer");
const { defineSecret, defineString } = require("firebase-functions/params");
const { logger } = require("firebase-functions");

/**
 * COMP-009 — feedback mail dispatch.
 *
 * Contract (REQ-009, REQ-010, REQ-018):
 *  - `sendFeedbackEmail(...)` NEVER throws — the promise always resolves
 *    to one of "SENT" | "FAILED" | "SKIPPED". This guarantee is what
 *    makes REQ-010 hold: a mail failure never downgrades the 200 the
 *    RTDB write already earned.
 *  - Credentials come from `defineSecret`. Non-secret config comes from
 *    `defineString`. Every name in feedback.js's `secrets:` array MUST
 *    exist in Secret Manager before deploy — see the deploy runbook note
 *    in design_spec §3.7.
 *  - There is NO `SMTP_FROM` param (F-17). `from` is `SMTP_USER.value()`
 *    because an SMTP account may only send as itself under SPF/DKIM.
 *  - The message body is `text/plain` ONLY. `html` is NEVER set — this
 *    is what makes SMTP + HTML injection impossible by construction (§3.3).
 *  - C0 controls are already stripped upstream in feedback.js by
 *    feedbackValidation.sanitizeSingleLine / sanitizeMultiLine, so no
 *    interpolated value here can terminate a header (REQ-017 / AC-028).
 */

// ---------------------------------------------------------------------------
// Params (F-11, F-17) — defineSecret for credentials ONLY.
// ---------------------------------------------------------------------------

/** SMTP auth user — AND the message `From` address. */
const SMTP_USER = defineSecret("SMTP_USER");
/** SMTP auth password. */
const SMTP_PASS = defineSecret("SMTP_PASS");

/** SMTP host. Unset → dispatch returns "SKIPPED". */
const SMTP_HOST = defineString("SMTP_HOST");
/** SMTP port. Defaults to 587. */
const SMTP_PORT = defineString("SMTP_PORT", { default: "587" });
/** Recipient (FR-03 / REQ-009). Default is the address in source. */
const FEEDBACK_RECIPIENT = defineString("FEEDBACK_RECIPIENT", {
  default: "shashank28raut@gmail.com"
});

// ---------------------------------------------------------------------------
// Transport (cold-start amortised — created lazily on first use)
// ---------------------------------------------------------------------------

/**
 * Module-scoped transport handle. `null` until first use, then reused across
 * warm invocations. Bounded timeouts are mandatory: the function budget is
 * 30 s, and a hung SMTP socket would otherwise burn all of it after the
 * feedback record is already safely persisted.
 * @type {null | import("nodemailer").Transporter}
 */
let cachedTransport = null;

/**
 * Return a nodemailer transport, or `null` when any required config
 * (SMTP_HOST / SMTP_USER / SMTP_PASS) is unset. A `null` return signals
 * the "SKIPPED" path and is not an error condition.
 *
 * @returns {import("nodemailer").Transporter | null}
 */
function getTransport() {
  const host = SMTP_HOST.value();
  const user = SMTP_USER.value();
  const pass = SMTP_PASS.value();
  const port = Number(SMTP_PORT.value() || "587");

  if (!host || !user || !pass) return null;

  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000
    });
  }

  return cachedTransport;
}

// ---------------------------------------------------------------------------
// Public API — MUST NEVER THROW (REQ-010).
// ---------------------------------------------------------------------------

/**
 * Dispatch the feedback notification email.
 *
 * @param {{
 *   id: string,
 *   createdAt: number,
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   comment: string
 * }} payload — already sanitized upstream (§3.3).
 * @returns {Promise<"SENT" | "FAILED" | "SKIPPED">}
 *          Never rejects. Callers use the string to patch
 *          `feedback/$id/emailDispatch`.
 */
async function sendFeedbackEmail(payload) {
  try {
    const transport = getTransport();
    if (!transport) return "SKIPPED";

    const from = SMTP_USER.value();
    const to = FEEDBACK_RECIPIENT.value() || "shashank28raut@gmail.com";
    if (!from || !to) return "SKIPPED";

    const subject = `BloodPoint feedback: ${payload.firstName} ${payload.lastName}`.slice(0, 160);
    const text = [
      `Feedback ID: ${payload.id}`,
      `Received: ${new Date(payload.createdAt).toISOString()}`,
      `First Name: ${payload.firstName}`,
      `Last Name: ${payload.lastName}`,
      `Email: ${payload.email}`,
      "",
      "Comment:",
      payload.comment
    ].join("\n");

    await transport.sendMail({
      from,
      to,
      replyTo: isValidEmail(payload.email) ? payload.email : undefined,
      subject,
      text
    });

    return "SENT";
  } catch (err) {
    // Log name only — never .message (may echo user data) or .stack.
    logger.warn("feedbackSubmit: mail dispatch failed", {
      name: /** @type {Error} */ (err)?.name
    });
    return "FAILED";
  }
}

/**
 * Local email-shape check for the optional `Reply-To` header. This is
 * intentionally a subset of the client validator — its job is to guard
 * against a caller passing an already-invalidated value, not to reject
 * anything the sanitizer let through.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isValidEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value)
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  sendFeedbackEmail,
  // Re-exported so functions/feedback.js can compose them into the
  // onRequest `secrets:` / config surface (§3.1). SMTP_HOST etc are
  // `defineString` and MUST NOT be added to `secrets:` (F-11).
  SMTP_USER,
  SMTP_PASS,
  SMTP_HOST,
  SMTP_PORT,
  FEEDBACK_RECIPIENT
};
