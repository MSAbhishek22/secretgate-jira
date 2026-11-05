# SecretGate for Jira — app README

Forge app for Codegeist 2026 (Apps for Software Teams). Scans Jira issues
for leaked secrets and keeps a redacted receipt ledger.

## Status

**Scaffold, hand-written (5 Nov 2026).** Not yet registered/deployed — that
needs the user's Atlassian login (`forge login`), which is a user tap. See
`../deployment/DEPLOYMENT_RUNBOOK.md`.

## Run the scanner tests (no Forge login needed)

```bash
cd app
node --test tests/scan.test.js
```

The scanner (`src/lib/scan.js`) is pure JS with zero dependencies, so it is
testable without the Forge runtime. The resolver (`src/resolvers/index.js`)
and UI Kit panel (`src/frontend/index.jsx`) need `forge deploy`.

## After login (user's taps first)

```bash
forge register            # assigns the real app.id — update manifest.yml
forge deploy              # deploys to the development environment
forge install --demo-site # install on a seeded demo Jira site (90 days)
forge lint                # must be clean before submit
```

Note: `static/ledger/build` (Custom UI ledger, Phase 3) does not exist yet.
Until it is built, `forge deploy` will fail on the missing resource path —
either build the ledger first or temporarily repoint the `ledger` resource.
This is called out in `manifest.yml` so the gap stays visible.

## Structure

- `manifest.yml` — modules (`jira:issuePanel`, `jira:globalPage`), scopes,
  runtime `nodejs24.x`
- `src/lib/scan.js` — deterministic secret scanner + redaction
- `src/resolvers/index.js` — `scanIssue`, `listFindings`, `markRotated`,
  `markFalsePositive` (LEAKED can never be marked false-positive)
- `src/frontend/index.jsx` — UI Kit issue panel (verdict stamp + receipts)
- `static/ledger/` — Custom UI ledger + 3D exposure graph (Phase 3)
- `tests/scan.test.js` — scanner unit tests
