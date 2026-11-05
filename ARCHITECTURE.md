# ARCHITECTURE — SecretGate for Jira

## Stack (all free)

- **Platform:** Atlassian Forge (serverless, Node.js runtime `nodejs24.x` —
  per the official Forge dashboard tutorial, read 5 Nov 2026).
- **Frontend — issue panel:** Forge UI Kit 2 (`@forge/react`,
  `ForgeReconciler`), `render: native`. ADS tokens + primitives only.
- **Frontend — ledger dashboard:** Custom UI (React + Vite build inside
  `static/ledger/`), Three.js for the 3D exposure graph (lazy-loaded).
- **Backend:** Forge resolver functions (`@forge/resolver`), Forge storage
  (`@forge/api` `storage`), Jira REST API via `requestJira` / `asApp`.
- **Scanner:** pure JS, zero dependencies (`app/src/lib/scan.js`) — runs in
  the resolver, unit-tested with plain `node --test` (no Forge login needed).
- **CLI:** Forge CLI 15.0.0 (see `forge-cli/` notes).

## Modules (manifest.yml)

| Module | Key | UI | Purpose |
|---|---|---|---|
| `jira:issuePanel` | `secretgate-issue-panel` | UI Kit | Per-issue verdict + receipts |
| `jira:globalPage` | `secretgate-ledger` | Custom UI | Ledger + 3D exposure graph |
| `function` | `resolver` | — | `index.handler` — all resolver endpoints |

Scopes (classic, per Forge docs — classic scopes recommended over granular
for `requestJira` compatibility):

- `read:jira-work` — read issues, comments
- `read:jira-user` — reporter/assignee display names
- `storage:app` — findings + audit log
- (stretch S1 adds Teamwork Graph scopes; stretch S2 adds `rovo:agent`)

Compatibility: `jira.required: true`, `confluence.required: false`.
One `jira:globalPage` only (Forge allows a single global page per app).

## Data flow

```
Issue opened → issue panel (UI Kit)
  → invoke('scanIssue', {issueKey}) → resolver
  → requestJira: GET /rest/api/3/issue/{key}?fields=description,comment
  → scan.js: deterministic rules over description + comments
  → redact evidence → verdict CLEAR / REVIEW / LEAKED
  → storage.set(`finding:${issueKey}:${hash}`, record) + audit append
  → panel renders verdict stamp + receipts

Ledger page → invoke('listFindings', {projectKey?, status?})
  → storage.query → table + 3D graph (issues ↔ secret types)
  → actions: markRotated / markFalsePositive (audited, reason required)
```

## Scanner rules (deterministic, fail-closed)

| Rule | Pattern | Verdict |
|---|---|---|
| `aws_access_key` | `AKIA[0-9A-Z]{16}` | LEAKED |
| `aws_secret` | 40-char base64 near `aws_secret` / `secret` context | REVIEW |
| `github_token` | `ghp_|gho_|github_pat_` + charset | LEAKED |
| `slack_token` | `xox[baprs]-…` | LEAKED |
| `private_key` | `-----BEGIN (RSA\|EC\|OPENSSH\|PGP) PRIVATE KEY-----` | LEAKED |
| `generic_high_entropy` | ≥32-char high-entropy token near secret keywords | REVIEW |
| `password_in_text` | `password\s*[:=]\s*\S{8,}` (outside code fence) | REVIEW |

- Every match is stored **redacted** (first 4 + last 2 chars only, e.g.
  `AKIA…XXXX`); raw secrets are never written to Forge storage, logs or UI.
- Unknown shapes → REVIEW, never silent pass. A LEAKED finding can only
  clear by rotation + re-scan, never by an "approve" click.
- Scanner is pure and synchronous — testable without Forge (see
  `app/tests/scan.test.js`).

## Storage schema (Forge storage, `storage:app`)

- `finding:{issueKey}:{ruleId}:{hash8}` →
  `{ issueKey, projectKey, ruleId, severity, status: open|rotated|false-positive,
     redactedEvidence, field, reporter, createdAt, updatedAt, history[] }`
- `audit:{timestamp}:{id}` → `{ actor, action, findingRef, reason }`
  (append-only; no delete path in the resolver)

## 3D exposure graph (rulebook §3 — meaningful, not decorative)

- **What:** force-directed 3D graph (Three.js) in the ledger page.
  Nodes = Jira issues (sized by finding count) and secret types; edges =
  "this secret type leaked in this issue". Colour = status (red open,
  amber review, green rotated).
- **Why 3D helps:** a flat table cannot show that one AWS key touches 7
  issues across 3 projects; the graph makes blast radius visible at a glance.
- **Interaction:** drag to rotate, scroll to zoom, click a node to filter the
  ledger table to that issue/type; keyboard-accessible list fallback.
- **Fallback:** if WebGL is unavailable, reduced-motion is set, or the
  device is low-power, the same data renders as a 2D SVG graph + plain list.
  The graph is lazy-loaded and never blocks the ledger table.

## Files

```
app/
  manifest.yml            Forge manifest (app.id placeholder — set by forge register/create)
  package.json            @forge/react, @forge/api, @forge/resolver, @forge/bridge
  src/
    frontend/index.jsx    UI Kit issue panel
    resolvers/index.js    Forge resolver (scanIssue, listFindings, markRotated, markFalsePositive)
    lib/scan.js           deterministic scanner + redaction (pure JS)
  static/ledger/          Custom UI ledger app (scaffolded in Phase 2)
  tests/scan.test.js      scanner unit tests (node --test)
  .env.example            (no secrets — Forge uses no .env for this app)
```

## Deployment model (Forge-native, not a website)

There is no separate web host: `forge deploy` pushes the app to Atlassian's
Forge runtime; `forge install` installs it on a Jira site; judges use the
**installation link** (`forge install --upgrade` / sharing flow). The
"live HTTPS deployment" rulebook gate maps here to: *installed on a live
Atlassian developer site and verified in a fresh browser session*. The GitHub
repo holds the exact source; the release manifest records the Forge
deployment id + environment. See `deployment/DEPLOYMENT_RUNBOOK.md`.
