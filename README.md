# Codegeist 2026 — SecretGate for Jira

**Status: PREP + SCAFFOLD (IN_PROGRESS) — NOT complete, NOT submitted, NOT deployed.**
**Rulebook gates:** A (research/design) partial — research + constitution done, registry done.
B/C/D/E/F/G outstanding. See `submission/SUBMISSION_CHECKLIST.md` for the gate table.

## What this is

**SecretGate for Jira** — a Forge app that stops leaked secrets from spreading
through a team's Jira. Developers paste API keys, tokens and private keys into
issue descriptions, comments and code blocks every day; those secrets then sit
in search, notifications and exports. SecretGate scans an issue the moment it
is opened, flags every suspected secret with a redacted receipt, and gives the
team a ledger of what leaked, where, and whether it was revoked.

- **Category:** Apps for Software Teams
- **Forge modules:** `jira:issuePanel` (per-issue verdict) + `jira:globalPage`
  (Custom UI leak-ledger dashboard with a 3D exposure graph)
- **Bonus prizes targeted:** Best app with Teamwork Graph integration
  (stretch — leak events written to the graph); Rovo agent (stretch, Phase 3)
- **Entrant:** M S Abhishek, solo, India, 18+, Shobhit University, Meerut
- **Prize pool:** $120,000+ (verified — see `RESEARCH.md`)

## Concept lineage (fresh code, not a copy)

Adapted from the *idea* behind CageCheck (3 Nov 2026, secret-leak guard with
receipts and a fail-closed policy) and ClinicLink (triage ledger). **No code
was copied** — Codegeist rules require a Forge app with a Forge manifest and
at least one Forge module, and CageCheck is a standalone Python server. The
scanner in `app/src/lib/scan.js` is a fresh implementation written for Forge
resolvers, with the same honest principles: deterministic rules first,
redacted evidence, BLOCKED can never be approved as clean.

## What is BUILT vs PREP-ONLY (honest ledger, 5 Nov 2026)

| Item | State | Evidence |
|---|---|---|
| Rules / prizes / deadline / eligibility | VERIFIED | `RESEARCH.md`, official Devpost rules page read 5 Nov 2026 |
| Concept + architecture + build plan | DONE | `CONCEPT.md`, `ARCHITECTURE.md`, `BUILD_PLAN.md` |
| Design constitution + registry | DONE | `design/` |
| Forge CLI 15.0.0 runs in sandbox | VERIFIED | `forge-cli/` — installed with `--ignore-scripts`; `forge --version` → 15.0.0 |
| Forge app skeleton (manifest, UI Kit panel, resolver, scanner) | SCAFFOLD — hand-written, NOT CLI-generated | `app/` — see note below |
| Scanner unit tests | PASS (sandbox) | `app/tests/scan.test.js` — run with `node --test` |
| `forge create` / `forge login` / `forge deploy` / `forge install` | BLOCKED — needs user's Atlassian account | CLI prints "Not logged in" (see `deployment/DEPLOYMENT_RUNBOOK.md`) |
| GitHub repo | NOT CREATED (user tap) | — |
| Live install / demo site / video | NOT DONE — needs login + install first | — |
| Devpost registration / submission | NOT DONE — user taps only | — |

**Skeleton note:** `forge create` cannot run without an Atlassian login, so
`app/` was hand-written from the official Forge docs (dashboard tutorial +
`jira:globalPage` + `jira:issuePanel` manifest references, all read 5 Nov
2026). The first `forge deploy` after login is the moment this skeleton is
proven or corrected — `forge lint` + `forge deploy` errors are expected to
drive small fixes (e.g. `app.id` assignment, scope consent).

## Quick links

- Official hackathon page: https://codegeist2026.devpost.com/
- Official rules: https://codegeist2026.devpost.com/rules
- Forge docs — global full page dashboard tutorial: https://developer.atlassian.com/platform/forge/build-a-dashboard-app-with-the-global-full-page-module-connected-to-jira/
- Forge docs — Jira issue panel: https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-issue-panel/
- Forge docs — Jira global page: https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-global-page/

## Repo layout

```
codegeist/
  README.md  RESEARCH.md  CONCEPT.md  ARCHITECTURE.md  BUILD_PLAN.md
  design/DESIGN_CONSTITUTION.md  design/PROJECT_DESIGN_REGISTRY.md
  app/                 Forge app skeleton (manifest.yml, src/, static/)
  app/tests/           scanner unit tests (node --test, no Forge deps)
  qa/INTERACTION_INVENTORY.md
  deployment/DEPLOYMENT_RUNBOOK.md
  submission/SUBMISSION_CHECKLIST.md
  forge-cli/           Forge CLI 15.0.0 install (sandbox workaround notes inside)
```
