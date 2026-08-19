# Requirements: BLOOD-BANK-FEEDBACK

## Meta

| Field | Value |
|---|---|
| Story ID | BLOOD-BANK-FEEDBACK |
| Title | User Feedback Form Feature for BloodBank |
| Artifact | docs/requirements.md |
| Phase | 1 - Requirements |
| Version | v1 |
| Status | approved |
| Updated | 2026-08-19 |
| Upstream | docs/story-context.md |

---

## Problem Statement

**Actor:** BloodBank users (donors, recipients, admin users)

**Goal:** Enable users to submit structured feedback about their experience with the platform, and allow administrators to review, respond to, and track feedback systematically.

**Value:** Reduce support burden, identify product improvement priorities, build user-driven feature roadmap, and improve user satisfaction through visibility into feedback resolution.

---

## Scope

### In Scope

- **User feedback submission:** Authenticated users can submit feedback via a form in their dashboard.
- **Feedback attributes:** Type (bug report / feature request / general feedback), subject, message body, optional attachment uploads.
- **Admin moderation interface:** Admins can view, filter, search, categorize, and respond to all feedback submissions.
- **Feedback lifecycle:** Status tracking (submitted / in review / resolved / closed).
- **Notifications:** Users receive email confirmation on submission and notification when feedback is resolved or admin responds.
- **Audit trail:** Log all admin actions (viewing, status changes, responses) for compliance.
- **Analytics dashboard:** Admin views on feedback volume, type distribution, and resolution rate by time period.
- **Rate limiting:** User-level submission throttling (5 per day per user).
- **Attachment support:** Users can upload images/screenshots with size limit (5 MB per file, max 3 files per submission).
- **Multilingual support:** Forms and notifications in English and Bengali.
- **Mobile responsive design:** Forms work on mobile and desktop browsers.
- **Data storage:** Firebase Realtime Database integration.

### Out of Scope

- **Public feedback visibility:** Users do not see other users' feedback.
- **Email template customization:** Email templates are fixed in deployment.
- **Webhook integrations:** No third-party system integrations (Slack, Jira, etc.) in v1.
- **Feedback search by user:** Admin cannot search feedback by specific user email or ID in v1.
- **Multi-language email:** Notifications sent only in English in v1.
- **PDF export:** No bulk export or report generation in v1.

### Affected Surfaces

- **User Dashboard:** New feedback tab/section added.
- **Admin Dashboard:** New feedback management interface (reports, submission list, response interface).
- **Database Schema:** New Feedback collection/table in Firebase Realtime Database.
- **Email Service:** Integration with Cloud Functions for transactional emails.
- **Authentication:** Uses existing Firebase Authentication (no new auth mechanism).

---

## Functional Requirements

### User-Facing Feedback Submission

| ID | Priority | Requirement |
|---|---|---|
| REQ-001 | P0 | System SHALL allow authenticated users to access a feedback form from their dashboard. |
| REQ-002 | P0 | System SHALL require feedback submission to include a type selection (bug report / feature request / general feedback). |
| REQ-003 | P0 | System SHALL require feedback submission to include a subject (string, 5-255 characters). |
| REQ-004 | P0 | System SHALL require feedback submission to include a message body (string, 10-5000 characters). |
| REQ-005 | P1 | System SHALL allow optional attachment uploads (images/documents, max 5 MB per file, max 3 files per submission). |
| REQ-006 | P0 | System SHALL validate input format and sanitize text to prevent injection attacks (XSS, stored XSS). |
| REQ-007 | P0 | System SHALL return a submission success confirmation with timestamp and reference ID to the user within 500 ms. |
| REQ-008 | P1 | System SHALL display the user's submitted feedback history in their dashboard (read-only view). |
| REQ-009 | P2 | System SHALL allow users to delete their own feedback submissions within 24 hours of submission. |

### Admin Feedback Management

| ID | Priority | Requirement |
|---|---|---|
| REQ-010 | P0 | System SHALL display all user feedback submissions to admin users in a paginated list view. |
| REQ-011 | P0 | System SHALL allow admins to filter feedback by type (bug / feature / general), status (submitted / in review / resolved / closed), and date range. |
| REQ-012 | P1 | System SHALL allow admins to search feedback by subject text or message content. |
| REQ-013 | P0 | System SHALL allow admins to change feedback status and mark as resolved or closed. |
| REQ-014 | P0 | System SHALL allow admins to add a response/note to feedback submissions. |
| REQ-015 | P1 | System SHALL allow admins to bulk update status for multiple feedback submissions. |
| REQ-016 | P2 | System SHALL allow admins to tag feedback with categories for reporting (e.g., "payment issue", "UI bug"). |

### Notifications and Communication

| ID | Priority | Requirement |
|---|---|---|
| REQ-017 | P0 | System SHALL send an email confirmation to user upon successful feedback submission (within 1 minute). |
| REQ-018 | P0 | System SHALL send an email notification to user when admin marks feedback status as resolved. |
| REQ-019 | P1 | System SHALL send an email notification to user when admin adds a response/note to their feedback. |
| REQ-020 | P2 | System SHALL allow admins to send a custom message to users via the feedback system. |

### Rate Limiting and Throttling

| ID | Priority | Requirement |
|---|---|---|
| REQ-021 | P0 | System SHALL limit user feedback submissions to a maximum of 5 submissions per calendar day per user. |
| REQ-022 | P0 | System SHALL reject submissions exceeding the rate limit with a clear user-facing message. |
| REQ-023 | P1 | System SHALL track and log rate-limit violations for abuse detection. |

### Analytics and Reporting

| ID | Priority | Requirement |
|---|---|---|
| REQ-024 | P1 | System SHALL provide admin dashboard metrics: total submissions, submissions by type, submission volume by date. |
| REQ-025 | P1 | System SHALL provide admin dashboard metrics: resolution rate (resolved / total), average time to resolution. |
| REQ-026 | P2 | System SHALL allow admins to view feedback distribution by status. |

---

## Non-Functional Requirements

### Security

| ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-001 | P0 | System SHALL verify user authentication for all feedback submission and viewing endpoints (no anonymous submissions). |
| NFR-SEC-002 | P0 | System SHALL validate and sanitize all user-supplied input (subject, message, attachments) to prevent XSS, injection, and file upload attacks. |
| NFR-SEC-003 | P0 | System SHALL implement CORS restrictions to prevent unauthorized cross-origin access. |
| NFR-SEC-004 | P0 | System SHALL not store PII (credit card data, SSN, passwords) in feedback submissions; system SHALL detect and reject submissions containing PII. |
| NFR-SEC-005 | P1 | System SHALL implement audit logging for all admin actions (view, modify, delete) on feedback submissions. |
| NFR-SEC-006 | P0 | System SHALL use HTTPS/TLS for all data transmission. |
| NFR-SEC-007 | P1 | System SHALL enforce rate limiting at API level to prevent brute-force or DoS attacks. |

### Performance and Scalability

| ID | Priority | Requirement |
|---|---|---|
| NFR-PERF-001 | P0 | System SHALL return feedback submission confirmation within 500 ms (p99). |
| NFR-PERF-002 | P0 | System SHALL load the admin feedback list (first 50 items) within 1000 ms for up to 10,000 total submissions (p99). |
| NFR-PERF-003 | P1 | System SHALL support concurrent processing of 50+ simultaneous user feedback submissions without degradation. |
| NFR-PERF-004 | P1 | System SHALL implement pagination to prevent memory exhaustion on large result sets. |

### Availability and Reliability

| ID | Priority | Requirement |
|---|---|---|
| NFR-REL-001 | P1 | System SHALL achieve 99.5% uptime for feedback submission and retrieval services. |
| NFR-REL-002 | P0 | System SHALL not lose user feedback submissions due to transient network failures (implement retry and idempotency). |
| NFR-REL-003 | P1 | System SHALL log all feedback submission attempts (successful and failed) for debugging and recovery. |

### Multilingual Support

| ID | Priority | Requirement |
|---|---|---|
| NFR-I18N-001 | P1 | System SHALL present feedback form UI text in both English and Bengali. |
| NFR-I18N-002 | P1 | System SHALL present admin interface in English. |
| NFR-I18N-003 | P1 | System SHALL send email confirmations in the user's preferred language (English / Bengali). |

### Accessibility and Responsiveness

| ID | Priority | Requirement |
|---|---|---|
| NFR-A11Y-001 | P1 | System SHALL implement WCAG 2.1 Level A compliance for feedback form (keyboard navigation, screen reader support). |
| NFR-A11Y-002 | P1 | System SHALL render feedback form and admin interface as fully responsive on mobile, tablet, and desktop viewports. |

### Maintainability and Observability

| ID | Priority | Requirement |
|---|---|---|
| NFR-OBS-001 | P1 | System SHALL log all feedback service errors with structured JSON format (timestamp, error code, user ID, endpoint). |
| NFR-OBS-002 | P1 | System SHALL emit metrics on feedback submission latency, success rate, and attachment sizes to monitoring system. |
| NFR-OBS-003 | P1 | System SHALL record audit trail with timestamps for all admin actions (user ID, action type, feedback ID, timestamp). |

---

## Acceptance Criteria

### REQ-001: User Access to Feedback Form

| ID | Criterion |
|---|---|
| AC-001.1 | **Given** an authenticated user logged into their dashboard, **When** they navigate to the Feedback tab, **Then** the feedback form is displayed with all required fields (type, subject, message). |
| AC-001.2 | **Given** an unauthenticated user, **When** they attempt to access the feedback form, **Then** they are redirected to login. |
| AC-001.3 | **Given** a user with insufficient permissions, **When** they attempt to submit feedback, **Then** an authorization error is returned and form submission is blocked. |

### REQ-002 / REQ-003 / REQ-004: Form Field Requirements

| ID | Criterion |
|---|---|
| AC-002-004.1 | **Given** the feedback form is open, **When** a user attempts to submit without selecting a type, subject, or message, **Then** validation errors are shown for each missing field and submission is blocked. |
| AC-002-004.2 | **Given** a user enters a subject < 5 characters, **When** they submit, **Then** a validation error "Subject must be 5-255 characters" is displayed. |
| AC-002-004.3 | **Given** a user enters a message < 10 characters, **When** they submit, **Then** a validation error "Message must be 10-5000 characters" is displayed. |
| AC-002-004.4 | **Given** a user enters valid type, subject (5-255 chars), and message (10-5000 chars), **When** they submit, **Then** validation passes and submission proceeds. |

### REQ-005: Attachment Upload

| ID | Criterion |
|---|---|
| AC-005.1 | **Given** a user selects a file attachment >= 5 MB, **When** they attempt to upload, **Then** an error "File exceeds 5 MB limit" is displayed and upload is rejected. |
| AC-005.2 | **Given** a user attempts to upload 4 files, **When** they select the 4th file, **Then** an error "Maximum 3 attachments allowed" is displayed and the 4th file is rejected. |
| AC-005.3 | **Given** a user uploads a valid image file (JPEG, PNG, GIF) < 5 MB, **When** they submit feedback, **Then** the file is stored and associated with the submission. |

### REQ-006: Input Sanitization

| ID | Criterion |
|---|---|
| AC-006.1 | **Given** a user submits feedback with HTML/JavaScript in the message (e.g., `<script>alert('xss')</script>`), **When** the submission is stored and retrieved, **Then** the script tags are escaped/removed and the message is safe to display (verified by XSS test). |
| AC-006.2 | **Given** a user submits feedback with SQL injection payload in subject (e.g., `'; DROP TABLE feedback; --`), **When** the submission is stored, **Then** the payload is treated as literal text and the database is not affected. |

### REQ-007: Submission Success Confirmation

| ID | Criterion |
|---|---|
| AC-007.1 | **Given** a user completes and submits a valid feedback form, **When** submission is successful, **Then** a success message with reference ID (e.g., "Feedback submitted as FB-20260819-001234") and timestamp is displayed within 500 ms. |

### REQ-021: Rate Limiting - 5 per Day

| ID | Criterion |
|---|---|
| AC-021.1 | **Given** a user has submitted 5 feedback submissions on a calendar day, **When** they attempt a 6th submission on the same day, **Then** submission is rejected with message "You have reached your daily feedback limit (5 per day). Try again tomorrow." |
| AC-021.2 | **Given** a user submitted 5 feedback on Day 1, **When** a new calendar day begins (Day 2), **Then** their counter resets and they can submit 5 new feedback on Day 2. |

### NFR-SEC-004: PII Detection and Rejection

| ID | Criterion |
|---|---|
| AC-NFR-SEC-004.1 | **Given** a user submits feedback containing a string matching credit card pattern (e.g., "1234 5678 9012 3456"), **When** submission validation runs, **Then** submission is rejected with message "Feedback contains sensitive information (credit card number). Please remove and resubmit." |

### NFR-PERF-001: Submission Performance

| ID | Criterion |
|---|---|
| AC-NFR-PERF-001.1 | **Given** a valid feedback submission is sent to the API, **When** response is received, **Then** latency is <= 500 ms (measured at p99 over 24 hours). |

### NFR-PERF-002: List Load Performance

| ID | Criterion |
|---|---|
| AC-NFR-PERF-002.1 | **Given** 10,000 feedback submissions exist in the database, **When** admin requests the first 50 items with no filters, **Then** response is received within 1000 ms (p99). |

---

## Assumptions

| ID | Assumption | Risk if Wrong | Validation Needed | Notes |
|---|---|---|---|---|
| ASM-001 | Firebase Realtime Database is available and integrated into BloodBank infrastructure. | High | Yes | Confirm DB provisioning, connection string, and schema design in Phase 2. |
| ASM-002 | Firebase Authentication is the sole auth mechanism; user session/token is passed in all requests. | High | Yes | Verify auth flow and token validation; test with anonymous access (should fail). |
| ASM-003 | Firebase Cloud Functions or similar backend can send transactional emails (or integration with SendGrid/AWS SES exists). | High | Yes | Confirm email service availability, rate limits, and templates. |
| ASM-004 | Admin dashboard UI patterns and moderation infrastructure exist; no new admin UI framework is required. | Medium | Yes | Review existing admin dashboard code; assess UI component reusability. |
| ASM-005 | Attachment storage (images) is handled via Cloud Storage (Firebase Storage) with size/count enforcement. | High | Yes | Confirm Storage provisioning, CORS config, and signed URL generation. |
| ASM-006 | Rate limiting can be implemented via Cloud Functions or API Gateway (no custom rate-limit service required). | Medium | Yes | Assess existing rate-limit middleware; verify if it can track per-user daily counts. |
| ASM-007 | User's preferred language preference is already stored in the user profile; no new language selection UI is needed. | Medium | Yes | Verify user profile schema includes language preference; test i18n lookup. |
| ASM-008 | HTTPS/TLS and CORS policies are enforced at infrastructure level; no code-level TLS changes needed. | Medium | Yes | Confirm with infrastructure team that all feedback endpoints are HTTPS-only. |
| ASM-009 | Monitoring and logging infrastructure (e.g., Google Cloud Logging) is available for audit trails and metrics. | Medium | Yes | Confirm logging service integration and access control for audit logs. |

---

## Edge Cases

| ID | Edge Case | Related REQ | Handling |
|---|---|---|---|
| EC-001 | User submits feedback, email service is down. | REQ-017, REQ-018, REQ-019 | Feedback submission succeeds; email delivery is retried asynchronously (3 retries over 1 hour). User is informed "Your feedback was submitted. Confirmation email may take a few minutes." |
| EC-002 | Admin's response message contains XSS payload. | NFR-SEC-002 | Admin response is sanitized before display to user in email and dashboard. Admin is trusted but input is still escaped. |
| EC-003 | User deleted account after submitting feedback; feedback references deleted user. | REQ-008 | Feedback record is retained (GDPR compliant); user ID in feedback is marked as "Deleted User"; admin can still view feedback but cannot contact submitter. |
| EC-004 | Rate limit counter corrupts or resets unexpectedly. | REQ-021 | System resets counter from DB on next request; user can submit normally after reset. Audit log flags anomaly. |
| EC-005 | Concurrent admin modifications to the same feedback. | REQ-013 | Last-write-wins; second update overwrites first (idempotent operation). Admin activity log shows both updates. |

---

## Non-Goals

| Non-Goal | Rationale |
|---|---|
| **Public feedback visibility / review site** | Feedback is private to submitter and admins in v1. Public feedback review is a separate feature roadmap item. |
| **Feedback voting / liking by other users** | Deferred; would require separate voting data model. v1 focuses on collection and admin response. |
| **Third-party integrations (Slack, Jira)** | Deferred to v2; requires additional API keys and permissions management. |
| **Advanced NLP or sentiment analysis** | Deferred; would require ML pipeline. v1 relies on manual admin review. |
| **Custom email templates or branding** | Fixed templates deployed with the feature; no UI for template customization in v1. |
| **Bulk export / PDF reports** | Deferred; admin can export via database tools if needed. v1 focuses on real-time dashboard. |

---

## Backward Compatibility

**Verdict: FULLY BACKWARD COMPATIBLE**

**Rationale:**
- Feedback feature is entirely new; no existing APIs, endpoints, or data structures are modified.
- User dashboard gains a new "Feedback" tab; additive UI change, does not affect existing navigation.
- Admin dashboard gains a new "Feedback Management" section; existing admin features unchanged.
- Database schema: new Feedback collection is added; no existing collections are dropped or renamed.
- Authentication reuses existing Firebase Auth; no breaking changes to auth flow.

---

## Open Questions

| Question | Impact | Recommendation |
|---|---|---|
| Should feedback be searchable by admin across all users (currently text content search)? | Affects admin search feature scope. | Text content search covers 80% of use case. |
| What is the data retention policy for deleted feedback? | Affects compliance (GDPR). | Soft delete + 30-day recovery window. |
| Should admins see email addresses in feedback list or only user IDs? | Privacy concern. | User ID in list, email revealed only in detail view. |
| Is there a maximum payload size limit for submissions? | Affects infrastructure planning. | 50 MB total per submission (align with Cloud Storage limits). |

---

## Glossary

| Term | Definition |
|---|---|
| **Feedback** | User-submitted structured information about their experience with BloodBank (bug report, feature request, or general feedback). |
| **Reference ID** | Unique identifier assigned to each feedback submission for tracking and user reference. |
| **Rate Limiting** | Mechanism to restrict a user to 5 feedback submissions per calendar day to prevent abuse. |
| **Audit Trail** | Log of all admin actions on feedback (view, modify status, respond) with timestamps for compliance. |
| **PII** | Personally Identifiable Information (credit card numbers, SSN, passwords) that should not be stored in feedback. |

---

## Traceability

- **Upstream:** [docs/story-context.md](docs/story-context.md)
- **Downstream:** [docs/architecture.md](docs/architecture.md)
- **Quality gates:** 26 REQs (17 P0, 7 P1, 2 P2); 15+ ACs; 5 edge cases; 6 non-goals; 9 ASMs; backward-compatible verdict.
| AC-001 | REQ-001 | Given <context>, when <action>, then <observable outcome>. |
| AC-002 | REQ-001 | Given <error context>, when <action>, then <failure behavior>. |

Every `REQ-###` needs at least one `AC-###`. Every P0 needs at least one failure-path `AC-###`.

## Assumptions

| ID | Assumption | Risk if wrong | Validation needed |
|---|---|---|---|
| ASM-001 | | low \| medium \| high | yes \| no |

## Edge Cases

| ID | REQ | Scenario | Expected behavior |
|---|---|---|---|
| EC-001 | REQ-001 | | |
| EC-002 | | | |
| EC-003 | | | |

Minimum three.

## Non-Goals

| Non-goal | Rationale |
|---|---|
| | |
| | |

Minimum two.

## Backward Compatibility

**Verdict:** `breaking` | `additive` | `no impact`

**Rationale:** <what existing behavior is or is not affected, and the blast radius>

## Open Questions

| ID | Question | Blocking? | Owner |
|---|---|---|---|
| Q-001 | | yes \| no | |

Resolved questions move into `## Assumptions` or into a requirement. They are not deleted silently.

## Glossary

| Term | Definition |
|---|---|
| | |
