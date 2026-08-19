# Verification Report: <STORY-ID>

## Meta

| Field | Value |
|---|---|
| Story ID | <STORY-ID> |
| Artifact | docs/verification-report.md |
| Phase | 7 |
| Version | v1 |
| Status | draft |
| Updated | <YYYY-MM-DD> |
| Upstream | docs/requirements.md, docs/impl-plan.md, docs/impl-manifest.md, docs/review-report.md |
| Verified SHA | <git rev-parse HEAD> |

## Summary

<3-5 lines: what was verified, the score, and the readiness decision.>

## Test Commands

| # | Command | Layer | Exit code | Result |
|---|---|---|---|---|
| 1 | `<exact command>` | unit | | passed \| failed \| not run |
| 2 | `<exact command>` | integration | | |

If no test harness was detected, record `blocked - no test harness detected` here and set the
readiness decision to `blocked`. Never report `passed` when nothing was executed.

## Unit Test Results

```
$ <exact command>
<pasted output>
exit code: <N>
```

| Passed | Failed | Skipped | Total | Pass rate |
|---|---|---|---|---|
| | | | | % |

## Integration Test Results

```
$ <exact command>
<pasted output>
exit code: <N>
```

| Passed | Failed | Skipped | Total | Pass rate |
|---|---|---|---|---|
| | | | | % |

Write `N/A - no integration layer in scope` if that is genuinely true.

## Requirement Coverage Matrix

| REQ | Priority | AC | TEST | Test status | Verdict |
|---|---|---|---|---|---|
| REQ-001 | P0 | AC-001 | TEST-001 | passed \| failed \| not run | covered \| uncovered |

| Metric | Value |
|---|---|
| Total ACs | |
| ACs passed | |
| ACs uncovered | |
| P0 requirements with zero passing AC | |

## Edge Case Coverage

| EC | Scenario | Tested by | Status |
|---|---|---|---|
| EC-001 | | TEST-### | tested \| not tested (reason) \| failed |

## Document Quality Check

| Artifact | Exists | Required sections present | ID integrity | Cross-refs resolve | Verdict |
|---|---|---|---|---|---|
| docs/requirements.md | | | | | pass \| fail |
| docs/architecture.md | | | | | |
| docs/design-review.md | | | | | |
| docs/impl-plan.md | | | | | |
| docs/impl-manifest.md | | | | | |
| docs/review-report.md | | | | | |

Also check the feature's **output document(s)**, if the story produces one:

| Output document | Completeness | Accuracy vs source | Unresolved placeholders | Verdict |
|---|---|---|---|---|
| | | | | |

Missing sections, dangling `REQ-###` references, and unresolved `TBD`/`<placeholder>` text are
each defects.

## Score

| Component | Max | Earned | Basis |
|---|---|---|---|
| Requirement coverage | 60 | | (ACs passed / total ACs) x 60 |
| Test pass rate | 40 | | (tests passed / total tests) x 40 |
| Document quality deduction | -20 | | -5 per artifact failing its checks |
| **Total** | **100** | | |

Special cases: zero tests earns 0 for test pass rate; zero ACs earns the full 60 only when the
requirements artifact genuinely has none, and that fact is stated here.

## Open Risks

| ID | Risk | Severity | Blocking? |
|---|---|---|---|
| RISK-### | | | yes \| no |

## Readiness Decision

| Field | Value |
|---|---|
| **Status** | `passed` \| `passed_with_warnings` \| `failed` \| `blocked` |
| Score | <N>/100 |
| P0 coverage | <n>/<total> |
| Blocking issues | <n> |
| Verified SHA | <sha> |

Status ladder, first match wins:

1. Any P0 requirement with zero passing ACs -> `failed`
2. Score < 50 -> `failed`
3. Test pass rate < 60% -> `failed`
4. Score >= 70 and test pass rate >= 80% and no blocking issues -> `passed`
5. Score >= 50 -> `passed_with_warnings`
6. Otherwise -> `failed`

`blocked` overrides all of the above when prerequisites are missing or no harness exists.
