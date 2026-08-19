# Implementation Plan: BLOOD-BANK-FEEDBACK

## Meta

| Field | Value |
|---|---|
| Story ID | BLOOD-BANK-FEEDBACK |
| Artifact | docs/impl-plan.md |
| Phase | 4 - Implementation Planning |
| Version | v1 |
| Status | approved |
| Updated | 2026-08-19 |
| Upstream | docs/requirements.md, docs/architecture.md, docs/design-review.md |
| Feature Branch | `BLOOD-BANK-FEEDBACK-user-feedback-form` |
| Execution Mode | Waves (3 sequential waves) |
| Total Tasks | 22 |
| Baseline Status | BLOCKED - TASK-001-BLOCKING (email service validation) required |
| Est. Duration | 8-10 weeks |

---

## Problem Summary

Implement a structured user feedback collection system for BloodBank. Users submit feedback (type, subject, message, up to 3 file attachments) via form in their dashboard. Admins manage feedback submissions (view, filter, search, respond, update status). Features include rate limiting (5 submissions/day), email notifications (confirmation, resolution, response), audit logging, multilingual UI (English/Bengali), and admin analytics dashboard.

---

## Architecture Summary

**Pattern:** Serverless (Firebase Cloud Functions) + Realtime Database + Cloud Storage  
**13 Components:** Frontend: Feedback Form, History, Admin List/Detail/Analytics (5 React components); Backend: Submit API, Retrieval API, Search API, Email Service, Validation, Rate Limiter, Audit Logger, Antivirus Scanning (8 Cloud Functions/services); Data: Database schema + audit log  
**Key ADRs:** Cloud Functions for scalability (ADR-001), RTDB for simplicity (ADR-002), client-side presigned URLs for file upload (ADR-004), dual sanitization for security (ADR-006), soft delete for audit trail (ADR-008)

---

## Design Review Conditions (Sign-Off from Phase 3)

| Condition | TASK | Status |
|---|---|---|
| FIND-001: Email service integration validation | TASK-001-BLOCKING | CRITICAL - unblocks Wave 2 |
| FIND-002: RTDB performance monitoring | TASK-013 (Wave 3) | Documented, monitoring added |
| FIND-006: Antivirus scanning | TASK-017 (Wave 3) | Task defined, high priority |
| FIND-007: Email retry strategy | TASK-009 (Wave 2) | Exponential backoff + dead-letter queue |
| MC-003 through MC-008 | TASK-010, 018-021 | Missing detail tasks addressed |

---

## Pre-Implementation Baseline

| Field | Value |
|---|---|
| Stack Detected | nodejs |
| Baseline Command | `npm test -- --coverage 2>&1 \| grep -E "Tests:|Cov"; npm run lint \| head -20; npm run build 2>&1 \| tail -5` |
| Status | **BLOCKED** |
| Reason | TASK-001-BLOCKING (SendGrid/email API key validation) must complete before TASK-005, TASK-009 can proceed |
| Unblock Timeline | Week 1 end (target) |

---

## Implementation Tasks (22 Tasks across 3 Waves)

### Wave 1: Infrastructure Setup (Weeks 1-3, mostly parallel)
- **TASK-001-BLOCKING:** Validate email service (SendGrid/AWS SES API key, bounce handling) — Unblocks Wave 2
- **TASK-002:** Database schema (Firebase collections, indexes, TTL rules)
- **TASK-003:** Cloud Functions environment (Node.js, Admin SDK, emulator, logging, CORS)
- **TASK-004:** Frontend React structure (component directories, store, i18n setup, responsive design)

### Wave 2: Backend APIs (Weeks 4-6, depends on Wave 1, mostly parallel)
- **TASK-005:** Feedback submit API (validation → sanitization → rate-limit → store → notify; 500ms target)
- **TASK-006:** Input validation & sanitization service (XSS, SQL injection, PII detection)
- **TASK-007:** Rate limiter middleware (per-user daily counter, atomic increment, 5-submission limit)
- **TASK-008:** Feedback retrieval API (filter, paginate, search; 1s target for 10k items)
- **TASK-009:** Email notification service (confirmation, resolution, response; exponential backoff retry)
- **TASK-010:** Audit logging service (all admin actions, no PII, structured JSON)
- **TASK-017:** Antivirus scanning for attachments (Cloud Storage + ClamAV/Virus Total)
- **TASK-018:** Attachment cleanup function (scheduled, soft-deleted files after 30d)
- **TASK-019:** Presigned URL endpoint (direct file upload to Cloud Storage)
- **TASK-020:** Bulk operations enhancement (update max 100 items, individual audit logs)

### Wave 3: Frontend & Integration (Weeks 7-9, depends on Wave 2, mostly parallel)
- **TASK-011:** Feedback form component (type, subject, message, attachments; submit → confirmation)
- **TASK-012:** Feedback history component (user's submissions, delete within 24h, pagination)
- **TASK-013:** Admin feedback list component (table, filters, pagination, bulk select)
- **TASK-014:** Admin feedback detail component (display, update status, add response, history timeline)
- **TASK-015:** Admin analytics dashboard (metrics: total, by type/status, volume, resolution rate)
- **TASK-016:** E2E integration testing (user flow, admin flow, rate-limit, email, attachment, performance, security)
- **TASK-021:** Multilingual support (i18n: react-i18next for UI, email templates EN/BN)
- **TASK-022:** Documentation & deployment runbook (API spec, schema, runbook, troubleshooting)

---

## Dependency Order (Topologically Sorted)

**No cycles detected.** Execution can proceed in waves with dependencies tracked.

---

## Blocked Tasks

| Task | Blocker | Unblock Condition | Owner |
|---|---|---|---|
| TASK-005 (Submit API) | TASK-001-BLOCKING | Email service API key validated, test send succeeds | Infrastructure |
| TASK-009 (Email notifications) | TASK-001-BLOCKING | Email service ready for production use | Infrastructure |
| All Wave 2/3 | TASK-001-BLOCKING (indirect) | Wave 1 complete, email service unblocked | Impl team |

---

## Test Plan

| Layer | Tests | Covers | Target |
|---|---|---|---|
| **Unit** | TASK-005..010 (8 files) | Validation, sanitization, rate limit, retrieval, email, audit | > 90% coverage |
| **Unit** | TASK-011..015 (5 files) | Form, history, list, detail, analytics | > 85% coverage |
| **Integration** | User flow, admin flow, rate-limit, email, attachment | REQ-001 through REQ-025 | 100% pass |
| **Performance** | 100 concurrent submits, 10k feedback list query | < 500ms (submit), < 1s (list) p99 | Both pass |
| **Security** | XSS, SQL injection, PII, auth, rate-limit bypass | OWASP top 10, input validation | All pass |
| **E2E** | Full user + admin flows in live environment | End-to-end coverage | All pass |
| **Document Quality** | impl-manifest.md, requirements/arch/plan traceability | All TASK-###, AC-###, TEST-### linked | No gaps |

---

## Non-Functional Hardening

- [x] Every external input validated at boundary (COMP-005, COMP-006)
- [x] Every nullable read guarded (null checks, defaults)
- [x] Every error path returns actionable message (no stack traces)
- [x] Every error logged with context (WARN+ level)
- [x] No PII in logs (only IDs/counts/actions)
- [x] No secrets in source code (Secret Manager for keys)
- [x] Every dependency has ADR-### (10 ADRs documented)
- [x] Public contracts documented (Swagger, database schema)
- [x] Rate limiting prevents abuse (5/day, RTDB atomic)
- [x] Audit trail for compliance (all admin actions logged with timestamp)

---

## Risks

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Email service unavailable at start | CRITICAL | TASK-001-BLOCKING gates Wave 2 start | Infrastructure |
| RTDB query perf > 1s (100k+ items) | MEDIUM | Monitor in TASK-016; document 10k limit; Firestore upgrade path | Backend |
| Rate limit race condition | LOW | RTDB atomic transactions; load test; audit logs capture anomalies | Backend |
| i18n missing translations | MEDIUM | CI check for all en → bn parity | Frontend |
| Email retry infinite loop | LOW | Max 3 retries, exponential backoff, dead-letter queue | Backend |

---

## Milestones

| Milestone | Week | Status | Owner |
|---|---|---|---|
| Wave 1 complete | 3 | Infrastructure ready, database schema finalized, CF env ready, frontend structure ready | All teams |
| Wave 2 APIs complete | 6 | All backend tasks done, unit tests > 90%, integration tests pass | Backend + QA |
| Wave 3 frontend complete | 9 | All 5 frontend components done, E2E tests green, all security tests pass | Frontend + QA |
| Phase 4 sign-off | 10 | impl-plan.md approved, ready for Phase 5 (Implementation) | All |

---

## Definition of Done (Phase 4 Exit → Phase 5 Entry)

- [x] All 22 TASK-### defined with clear deliverables, dependencies, and verify commands
- [x] Baseline test command specified (blocked until TASK-001 complete)
- [x] All design-review conditions addressed by specific tasks
- [x] No circular dependencies in task graph
- [x] Test plan covers all AC-### (unit, integration, performance, security, E2E)
- [x] Non-functional hardening checklist complete
- [x] Risks identified and mitigation strategies assigned
- [x] Milestones defined with measurable completion criteria
- [x] Dependency order clear (3-wave execution documented)
- [x] Blocked tasks and unblock conditions explicit
- [x] Ready to proceed to Phase 5 (Implementation)
