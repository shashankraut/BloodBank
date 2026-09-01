"use strict";

const crypto = require("node:crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { getDatabase } = require("firebase-admin/database");

const {
  sendFeedbackEmail,
  SMTP_USER,
  SMTP_PASS
} = require("./feedbackMailer");

const {
  // constants
  ALLOWED_FIELDS,
  // sanitizers
  sanitizeSingleLine,
  sanitizeMultiLine,
  // validation
  validateFeedback,
  // pure gate helpers (§3.9 / F-05)
  resolveOrigin,
  checkMethod,
  checkContentType,
  checkBodySize,
  pickAllowedFields
} = require("./feedbackValidation");

/**
 * COMP-006 — feedback HTTP endpoint.
 *
 * DEPLOY MODEL
 *  - Hosting rewrite `/api/feedback/submit` → this function (§4.1).
 *  - The rewrite MUST be array element 0 of `firebase.json` rewrites,
 *    ahead of the `**` catch-all — binding instruction #19.
 *
 * MODULE SHAPE (F-05 / binding instruction #12)
 *  - `handleFeedbackRequest(req, res, deps)` is the BARE handler.
 *    `deps` defaults to `{ getDatabase, sendFeedbackEmail, now: Date.now }`
 *    and is overridable in tests with fakes.
 *  - `exports.feedbackSubmit` is the onRequest-wrapped deploy artefact
 *    only — never the unit under test.
 *  - `exports.handleFeedbackRequest` re-exports the bare handler.
 *
 * DO NOT call `initializeApp()` here — `functions/index.js` already calls
 * it once and re-exports us AFTER that call. A second `initializeApp()`
 * throws `app/duplicate-app` (binding instruction #20).
 */

// ---------------------------------------------------------------------------
// Params — secrets: credentials ONLY (F-11 / binding instruction #9)
// ---------------------------------------------------------------------------

/** Salt for the SHA-256 IP hash used by the rate limiter (§3.5). */
const RATE_LIMIT_SALT = defineSecret("RATE_LIMIT_SALT");

// ---------------------------------------------------------------------------
// onRequest options
// ---------------------------------------------------------------------------

const OPTIONS = {
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 30,
  maxInstances: 10,
  cors: false,               // CORS handled manually — see resolveOrigin.
  secrets: [SMTP_USER, SMTP_PASS, RATE_LIMIT_SALT],
  invoker: "public"
};

// ---------------------------------------------------------------------------
// Bare handler (the unit under test)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} FeedbackDeps
 * @property {typeof getDatabase}     getDatabase
 * @property {typeof sendFeedbackEmail} sendFeedbackEmail
 * @property {() => number}            now
 */

/** @type {FeedbackDeps} */
const DEFAULT_DEPS = {
  getDatabase,
  sendFeedbackEmail,
  now: Date.now
};

/**
 * Handle a single feedback request through gates 1..12.
 *
 * Never throws — every branch either sets a status + JSON envelope on
 * `res` (per REQ-021) or forwards to the RTDB write / mail dispatch path.
 *
 * Success envelope (AC-010):
 *   { success: true, message: "Feedback received successfully",
 *     data: { id, timestamp } }
 * Failure envelope (REQ-021 / REQ-022):
 *   { success: false, message: "<safe generic>", errors: [] | [{field, message}] }
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {FeedbackDeps}               [deps]  Injectable — defaults to real impls.
 * @returns {Promise<void>}
 */
async function handleFeedbackRequest(req, res, deps = DEFAULT_DEPS) {
  const correlationId = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const originHeader = req.get("origin");
    const originVerdict = resolveOrigin(originHeader, req.hostname || "");
    res.set("Vary", "Origin");
    if (originVerdict.echo) {
      res.set("Access-Control-Allow-Origin", originVerdict.echo);
    }

    if (originHeader && !originVerdict.allowed) {
      res.status(403).json({ success: false, message: "Origin not allowed", errors: [] });
      return;
    }

    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "3600");
      res.status(204).send("");
      return;
    }

    const methodVerdict = checkMethod(req.method);
    if (methodVerdict) {
      res.set("Allow", "POST, OPTIONS");
      res.status(methodVerdict.status).json({ success: false, message: methodVerdict.message, errors: [] });
      return;
    }

    const contentTypeVerdict = checkContentType(req.get("content-type"));
    if (contentTypeVerdict) {
      res.status(contentTypeVerdict.status).json({ success: false, message: contentTypeVerdict.message, errors: [] });
      return;
    }

    const sizeVerdict = checkBodySize(req.rawBody);
    if (sizeVerdict) {
      res.status(sizeVerdict.status).json({ success: false, message: sizeVerdict.message, errors: [] });
      return;
    }

    const isPlainObject = typeof req.body === "object" && req.body !== null && !Array.isArray(req.body);
    if (!isPlainObject) {
      res.status(400).json({ success: false, message: "Invalid payload", errors: [] });
      return;
    }

    const { picked, rejectedCount } = pickAllowedFields(req.body);
    if (rejectedCount > 0) {
      logger.warn("feedbackSubmit: unexpected payload keys", {
        correlationId,
        rejectedCount
      });
      res.status(400).json({ success: false, message: "Unexpected fields in payload", errors: [] });
      return;
    }

    const typeErrors = [];
    for (const field of ALLOWED_FIELDS) {
      if (typeof picked[field] !== "string") {
        typeErrors.push({ field, message: `${field} must be a string` });
      }
    }
    if (typeErrors.length > 0) {
      res.status(400).json({ success: false, message: "Validation failed", errors: typeErrors });
      return;
    }

    const normalized = {
      firstName: sanitizeSingleLine(picked.firstName),
      lastName: sanitizeSingleLine(picked.lastName),
      email: sanitizeSingleLine(picked.email).toLowerCase(),
      comment: sanitizeMultiLine(picked.comment)
    };
    const validationErrors = validateFeedback(normalized);
    if (validationErrors.length > 0) {
      res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
      return;
    }

    const db = deps.getDatabase();
    const now = deps.now();

    try {
      const xff = req.get("x-forwarded-for") || "";
      const parts = xff.split(",").map((part) => part.trim()).filter(Boolean);
      const candidate = parts[parts.length - 2] ?? parts[parts.length - 1] ?? req.ip ?? "unknown";
      const ipShape = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Fa-f0-9:]+)$/;
      const ip = ipShape.test(candidate) ? candidate : "unknown";

      const salt = RATE_LIMIT_SALT.value() || process.env.GCLOUD_PROJECT || "bloodpoint";
      const ipHash = crypto.createHash("sha256").update(`${salt}|${ip}`).digest("hex");
      const windowKey = String(Math.floor(now / 3_600_000));

      const rateRef = db.ref(`feedbackRateLimit/${windowKey}/${ipHash}`);
      const tx = await rateRef.transaction((current) => {
        const currentCount = typeof current?.count === "number" ? current.count : 0;
        return { count: currentCount + 1, updatedAt: deps.now() };
      });

      const count = tx.snapshot.child("count").val();
      if (typeof count === "number" && count > 5) {
        res.set("Retry-After", "3600");
        res.status(429).json({ success: false, message: "Too many requests", errors: [] });
        return;
      }
    } catch (error) {
      logger.warn("feedbackSubmit: rate limiter unavailable", {
        correlationId,
        reason: "RATE_LIMIT_UNAVAILABLE",
        name: error instanceof Error ? error.name : "UnknownError"
      });
    }

    const createdAt = deps.now();
    const feedbackRef = db.ref("feedback").push();
    const id = feedbackRef.key || correlationId;

    await feedbackRef.set({
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      email: normalized.email,
      comment: normalized.comment,
      createdAt,
      status: "NEW",
      emailDispatch: "SKIPPED",
      source: "web"
    });

    const dispatch = await deps.sendFeedbackEmail({
      id,
      createdAt,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      email: normalized.email,
      comment: normalized.comment
    });

    try {
      await feedbackRef.child("emailDispatch").set(dispatch);
    } catch (error) {
      logger.warn("feedbackSubmit: unable to store email dispatch status", {
        correlationId,
        name: error instanceof Error ? error.name : "UnknownError"
      });
    }

    res.status(200).json({
      success: true,
      message: "Feedback received successfully",
      data: {
        id,
        timestamp: new Date(createdAt).toISOString()
      }
    });
  } catch (error) {
    logger.error("feedbackSubmit: unhandled", {
      correlationId,
      name: error instanceof Error ? error.name : "UnknownError"
    });
    res.status(500).json({ success: false, message: "Internal error", errors: [] });
  }
}

// ---------------------------------------------------------------------------
// Deploy export (platform-wrapped) + bare-handler export (for tests)
// ---------------------------------------------------------------------------

/**
 * The single deploy artefact. Firebase invokes this; tests do not.
 */
exports.feedbackSubmit = onRequest(OPTIONS, (req, res) =>
  handleFeedbackRequest(req, res)
);

/**
 * The unit-under-test — a plain async function with an injectable `deps`
 * argument. Assertable under `node --test` without firebase-functions-test.
 */
exports.handleFeedbackRequest = handleFeedbackRequest;
