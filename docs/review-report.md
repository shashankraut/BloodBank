# Review Report: BLOOD-BANK-FEEDBACK

## Meta

| Field | Value |
|---|---|
| Story ID | <STORY-ID> |
| Artifact | docs/review-report.md |
| Phase | 6 |
| Version | v1 |
| Status | draft |
| Updated | <YYYY-MM-DD> |
| Upstream | docs/impl-plan.md, docs/impl-manifest.md |
| Reviewed SHA | <git rev-parse HEAD> |
| Iteration | 1 of 2 |

## Summary

<3-5 lines: overall code health, the single most serious finding, and the gate decision.>

## Code Review Findings

| ID | Severity | Location | Issue | Fix | Status |
|---|---|---|---|---|---|
| FIND-101 | critical \| major \| minor | `path/file.ext:42` | | | open \| fixed \| accepted |

Dimensions checked - mark each `pass`, `fail`, or `N/A`:

| Dimension | Result | Notes |
|---|---|---|
| Correctness vs AC | | |
| Input validation | | |
| Error handling | | |
| Naming and clarity | | |
| Structure and size | | |
| Duplication (DRY) | | |
| Async / concurrency | | |
| Performance | | |
| Logging and PII | | |
| Test quality | | |
| Dependency safety | | |

**Positives** - at least one, always:
- <what was done well>

## Security Findings

| ID | Severity | Location | Issue | Risk | OWASP | Remediation | Status |
|---|---|---|---|---|---|---|---|
| FIND-201 | critical \| high \| medium \| low \| info | `path/file.ext:42` | | | A03:2021 | | open \| fixed \| accepted |

Areas scanned - mark each `clean`, `findings`, or `N/A`:

| Area | Result |
|---|---|
| Hardcoded secrets and credentials | |
| Dependency vulnerabilities | |
| Injection (SQL / command / template / XSS) | |
| Authentication and authorization | |
| Sensitive data at rest and in transit | |
| PII in logs and telemetry | |
| Input validation at boundaries | |
| Insecure defaults and configuration | |

Report secrets by **category and location only**. Never paste the value.

## Simplification Report

| File | Issues found | Issues fixed | Tests re-run |
|---|---|---|---|
| | | | |

**Changes made**
- `file.ext:42` - <what changed>

Behavior must be unchanged. Any behavior change is a defect, not a simplification.

## Resolution Status

| Finding | Severity | Resolution | Evidence |
|---|---|---|---|
| FIND-101 | | fixed \| accepted-with-reason \| deferred | `<commit or file:line>` |

## Gate Decision

| Field | Value |
|---|---|
| Critical findings (open) | <N> |
| High findings (open) | <N> |
| High findings acknowledged by user | true \| false |
| Major code findings (open) | <N> |
| Tests re-run after fixes | <passed/total> |
| **Cleared for verification** | true \| false |

Rules:
- Any open **critical** finding -> `cleared_for_verification = false`. Route back to
  implementation. Maximum 2 iterations.
- Any open **high** finding requires explicit user acknowledgement in chat before proceeding.
- Medium and below are reported, not blocking.
