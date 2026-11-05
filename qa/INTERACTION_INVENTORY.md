# INTERACTION INVENTORY — SecretGate for Jira

Rulebook §4.1. Status is honest as of 5 Nov 2026: the app is a scaffold,
not installed, so every control is **BLOCKED (not yet testable on a live
install)** except the scanner logic, which is unit-tested.

## Issue panel (`jira:issuePanel`, UI Kit)

| Control | Action | Expected behaviour | Evidence | Status |
|---|---|---|---|---|
| Verdict stamp (Lozenge) | View | Shows CLEAR / REVIEW / LEAKED for the open issue | Scanner tests 8/8 PASS (logic); panel render untested | BLOCKED |
| Finding receipt card | View | Redacted evidence + rule + replay, one card per finding | Same as above | BLOCKED |
| Re-scan issue button | Click | Re-runs `scanIssue`, updates verdict + receipts | Not yet runnable (needs install) | BLOCKED |
| Retry scan button | Click | Re-runs scan after an error | Not yet runnable | BLOCKED |
| (Phase 3) Mark rotated | Click + reason | Flips finding to `rotated`, writes audit record | Resolver code written, not deployed | BLOCKED |
| (Phase 3) Mark false positive | Click + reason | Only for REVIEW findings; LEAKED throws | Resolver code written, not deployed | BLOCKED |

## Ledger page (`jira:globalPage`, Custom UI — Phase 3, not built)

| Control | Action | Expected behaviour | Evidence | Status |
|---|---|---|---|---|
| Status / type / project filters | Change | Filters the findings table | Not built | BLOCKED |
| Findings table row | Click | Opens the Jira issue | Not built | BLOCKED |
| 3D exposure graph node | Click | Filters ledger to that issue/type | Not built | BLOCKED |
| Graph rotate / zoom | Drag / scroll | Orbit + zoom; stops under reduced-motion | Not built | BLOCKED |
| 2D fallback toggle | Auto / manual | Same data as SVG graph + list when WebGL unavailable | Not built | BLOCKED |
| Finding detail → Mark rotated | Click + reason | Audited status change | Resolver written, UI not built | BLOCKED |

## Scanner logic (tested, sandbox)

| Check | Evidence | Status |
|---|---|---|
| AWS key → LEAKED, redacted | `tests/scan.test.js` | PASS |
| Clean issue → CLEAR | `tests/scan.test.js` | PASS |
| Private key in comment → LEAKED, comment field | `tests/scan.test.js` | PASS |
| GitHub + Slack tokens → LEAKED | `tests/scan.test.js` | PASS |
| Password assignment → REVIEW | `tests/scan.test.js` | PASS |
| Duplicate secret dedupes | `tests/scan.test.js` | PASS |
| Redaction keeps first 4 + last 2 only | `tests/scan.test.js` | PASS |
| Plain-string ADF fallback | `tests/scan.test.js` | PASS |

**Test command:** `cd app && node --test tests/scan.test.js` → **8/8 PASS**
(5 Nov 2026, Linux sandbox, Node v24.22.1).
