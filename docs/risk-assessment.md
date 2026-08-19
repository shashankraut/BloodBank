# Risk Assessment: <STORY-ID>

## Meta

| Field | Value |
|---|---|
| Story ID | <STORY-ID> |
| Artifact | docs/risk-assessment.md |
| Phase | 7 |
| Version | v1 |
| Status | draft |
| Updated | <YYYY-MM-DD> |
| Upstream | docs/requirements.md, docs/architecture.md, docs/impl-manifest.md, docs/review-report.md, docs/verification-report.md |
| Assessed SHA | <git rev-parse HEAD> |

## Summary

<3-5 lines: the worst realistic failure, whether it is mitigated, and the ship recommendation.>

## Assumption Challenges

| ASM | Assumption | If wrong | Likelihood | Impact | Mitigated? |
|---|---|---|---|---|---|
| ASM-001 | | | very likely \| likely \| unlikely \| very unlikely | low \| medium \| high \| critical | yes \| no |

## Failure Modes

| ID | Category | Failure | Trigger | Likelihood | Impact | Severity | Detection | Mitigation |
|---|---|---|---|---|---|---|---|---|
| FM-001 | data | | | | | | | |

Categories to walk, every time:

1. Infrastructure - host, storage, scaling, restart
2. Data - corruption, loss, drift, partial write, migration
3. Dependency - upstream outage, breaking change, supply chain
4. Concurrency - race, deadlock, duplicate delivery, idempotency
5. Performance - latency, memory, unbounded growth, N+1
6. Security - OWASP Top 10, secret exposure, privilege escalation
7. Human / process - runbook gaps, deploy procedure, rollback rehearsal

Severity matrix:

| Likelihood \ Impact | Low | Medium | High | Critical |
|---|---|---|---|---|
| Very likely | Low | Medium | High | Critical |
| Likely | Low | Medium | High | Critical |
| Unlikely | Low | Low | Medium | High |
| Very unlikely | Low | Low | Low | Medium |

## Attack Scenarios

| ID | Attacker profile | Vector | What they gain | Prevented by | Residual |
|---|---|---|---|---|---|
| ATK-001 | external unauthenticated | | | | |
| ATK-002 | authenticated low-privilege user | | | | |
| ATK-003 | compromised dependency or insider | | | | |

## Blind Spots

| Area | Considered? | Finding |
|---|---|---|
| Time zones, DST, clock skew | yes \| no | |
| Unicode, localization, encoding | | |
| Empty, null, zero, and maximum inputs | | |
| Duplicate requests and idempotency | | |
| Partial writes and crash mid-operation | | |
| Very large or pathological payloads | | |
| Rollback and forward compatibility | | |
| Observability of the failure itself | | |

## Dependency Risks

| Dependency | Type | Version pinned | Failure impact | Fallback |
|---|---|---|---|---|
| | library \| service \| infra \| human | yes \| no | | |

## Recommendations

| ID | Priority | Effort | Category | Recommendation |
|---|---|---|---|---|
| R-001 | 1-5 | 30m \| 2h \| 1d | | |

### MANDATORY_PRE_SHIP

Items that must be resolved before a pull request is created. Any effort <= 2h is not deferrable.

| Done | ID | Effort | Item | Resolved notes |
|---|---|---|---|---|
| [ ] | R-001 | | | |

If there are none, write a single row: `| [x] | - | - | None identified | - |`

## Sign-Off

| Field | Value |
|---|---|
| **Recommendation** | `ship` \| `ship_with_monitoring` \| `fix_first` \| `redesign` |
| Critical findings | <n> |
| High findings | <n> (mitigated: <n>) |
| Open MANDATORY_PRE_SHIP items | <n> |
| Confidence | <0-100> |

Rules:
- `ship` - zero critical; every high has a mitigation in place.
- `ship_with_monitoring` - zero critical; highs have alerting and a documented response.
  All MANDATORY_PRE_SHIP items with effort <= 2h are still resolved first.
- `fix_first` - any critical finding, or a high finding with no mitigation plan.
- `redesign` - the critical findings originate from the architecture or a wrong core assumption.

Confidence calibration: 90-100 all artifacts and code reviewed; 70-89 good coverage;
50-69 partial, artifacts or code access limited; below 50 incomplete - state what is missing.
