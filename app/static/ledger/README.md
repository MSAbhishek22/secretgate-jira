# SecretGate Ledger — Custom UI (Phase 3)

Status: **BUILT 6 Nov 2026 — NOT forge-validated.** First `forge deploy` after
the user's Atlassian login will surface corrections (manifest resource wiring,
Custom UI module behaviour, `@forge/bridge` invoke on the live site). Do not
claim a live install, a deploy, or a working Forge run from this directory.

## What it is

The ledger page (`jira:globalPage` `secretgate-ledger` in `../manifest.yml`):
a filing cabinet of redacted receipts for every finding the resolver stored,
plus a 3D blast-radius map (issues ↔ secret types).

- **Filter rail** — status (open / rotated / false-positive), secret type
  (rule), project. Client-side over one `listFindings` fetch, so the table
  and the graph always agree.
- **Findings table** — dense, sortable by `updatedAt` (newest first by
  default), rows link to the Jira issue (`{siteUrl}/browse/{issueKey}` from
  `view.getContext()`; plain text if the site URL is unavailable). Each row
  shows the severity stamp, secret type, redacted evidence (mono), updated
  time and status pill.
- **Per-finding actions** — Mark rotated / Mark false positive, each opening
  an inline reason form (reason required, min 3 chars, enforced client-side
  and server-side). The resolver's error is shown verbatim — a LEAKED
  finding's false-positive refusal ("LEAKED findings cannot be marked false
  positive. Rotate the secret instead.") is never hidden or reworded.
  Successful actions update the row in place and re-colour the graph.
- **Empty state** — "No findings in this project — last full scan
  &lt;time&gt;" (time = last successful ledger load). Never a blank table.
- **Loading / error states** — spinner while loading; error message + Retry
  on a failed fetch.
- **3D exposure graph** — canvas force-directed graph, issues ↔ secret
  types, node size by finding count, drag to rotate (Y) and tilt (X),
  click a node to filter the table (issue node → issue filter chip; type
  node → secret-type filter). Slow auto-rotate stops on first interaction
  and is disabled under `prefers-reduced-motion`. Collapses to a
  "View blast-radius map" disclosure below ~768px. A **list fallback with
  identical information** (issue → types × counts · worst open severity) is
  always rendered below the canvas; if canvas 2D is unavailable it is the
  only view, with a note saying so.
- **Graph colour rule** — red only when a LEAKED finding is still open on
  that node, amber when a REVIEW finding is open, green otherwise. This is
  what keeps the constitution's "red strictly for LEAKED" rule true in the
  graph (colour = worst *open* severity, not raw status).

## Stack — deliberate deviation from ARCHITECTURE.md

`ARCHITECTURE.md` / `BUILD_PLAN.md` said React + Vite + Three.js. This
ledger is **vanilla JS + `@forge/bridge`, bundled with esbuild** — the
Phase 3 build instruction was dependency-light (only `@forge/bridge` +
esbuild as devDependency). The graph is a hand-written 3D force simulation
with perspective projection on a 2D canvas, not Three.js. Functionally it
meets the constitution: force-directed, drag to rotate, list fallback,
reduced-motion. If a later phase wants React/Vite/Three.js, that is a
rebuild decision, not a bug fix.

One more deliberate deviation: the constitution's empty-state "Scan-now"
button is a **Refresh** button here. There is no scan-all resolver
(`scanIssue` is per-issue), so the button re-queries the ledger instead of
claiming to scan issues it cannot scan.

## Depends on — resolver fix (6 Nov 2026)

`listFindings` in `../src/resolvers/index.js` used to destructure only
`{ value }` from the storage query, dropping the storage key — the ledger
could not call `markRotated` / `markFalsePositive` (they need `storageKey`).
Fixed minimally: the loop now destructures `{ key, value }` and returns
`{ ...value, storageKey: key }`. Nothing else changed; no security
invariant touched (LEAKED can never be marked false-positive — enforced
server-side in the resolver).

## Build

```bash
cd app/static/ledger
npm install        # 131 packages (6 Nov 2026, no failures)
npm run build      # esbuild: src/index.js → build/index.js (106.6kb) + copies src/index.html → build/
npm test           # node --check src/index.js (parse only)
```

`build/` is the Forge resource path (`static/ledger/build` in
`../manifest.yml`). The bundle is IIFE, minified; the HTML references it
relatively (`<script src="index.js">`).

## Validation (6 Nov 2026, Linux sandbox, Node 24.22.1)

- `node --check src/index.js` — PASS (package is `"type": "module"`).
- `node --check ../src/resolvers/index.js` — PASS (after the storageKey fix).
- `npm install` — OK, 131 packages, no failures.
- `npm run build` — esbuild bundle 106.6kb in 62ms; `build/index.js`
  (109,119 bytes) + `build/index.html` (9,377 bytes) present.
- `node --check build/index.js` — PASS.
- Served `build/` over HTTP: `index.html` 200, `index.js` 200.
- Scanner tests (no Forge needed): `cd app && node --test
  tests/scan.test.js` — **8/8 PASS, 0 fail** (no regression from the
  resolver fix).
- **Not validated:** no browser render (no headless Chromium in sandbox),
  no Forge runtime run, no live Jira install. The first real render check
  happens on the demo site after `forge deploy` + `forge install`.

## Still needs the Forge login (user's taps)

1. `forge register` (real app.id) → `forge deploy` → `forge install
   --demo-site` → `forge lint` clean.
2. Verify on the live demo site: panel shows LEAKED on a seeded issue,
   ledger loads, actions work, graph renders, mobile collapse works.
3. Fix whatever `forge deploy` / lint surfaces — expect small corrections
   (the manifest `app.id` is still a placeholder by design).
