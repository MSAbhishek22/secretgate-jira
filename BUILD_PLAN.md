# BUILD PLAN — SecretGate for Jira (Codegeist 2026)

**Window:** 5 Nov – 21 Dec 2026 (safe submit target) | **Hard deadline:** 23 Dec 2026, 01:30 IST
**Winners announced:** on/around 15 Feb 2027, 09:00 PT (22:30 IST) — **after the
Dec 2026 cash goal window; this is a Feb 2027 payout, not December cash.**
**Effort:** solo, evenings/weekends around the other live tracks (SPECS,
BharatCode, Founding.dev build 6–10 Nov, Vultr 9 Nov). Codegeist is the
longest runway — it must not eat the November deadlines.

## Phase 0 — Prep (DONE 5 Nov 2026)

- [x] Rules/prizes/deadline/eligibility verified from official Devpost rules
- [x] Concept picked + justified (`CONCEPT.md`)
- [x] Architecture + design constitution + registry
- [x] Forge CLI 15.0.0 proven runnable in sandbox (with `--ignore-scripts`
      install workaround; `forge create` blocked on login — user's tap)
- [x] Hand-written app skeleton + scanner unit tests passing

## Phase 1 — User taps (BLOCKED on user, ~30 min of his time)

These cannot be done by the agent. Do them in one sitting, ideally 6–7 Nov:

1. **Devpost:** register for Codegeist 2026 (Join Hackathon) — free account.
2. **Atlassian:** sign up for a free Atlassian Cloud Developer License at
   https://developer.atlassian.com/cloud/ (free; stop if a card is asked).
3. **Forge login:** `forge login` (Atlassian account) — or create an API token
   and set `FORGE_API_TOKEN` / `FORGE_EMAIL` per
   https://go.atlassian.com/dac/platform/forge/getting-started/#log-in-with-an-atlassian-api-token
   (token via the user's own Atlassian account — never share it in chat).
4. **GitHub repo:** create public repo `secretgate-jira` (user's tap or
   browser flow) and push `app/` + docs.

## Phase 2 — Real Forge app (target: 8–15 Nov)

1. `forge create --template jira-issue-panel-ui-kit` (or register the
   hand-written skeleton with `forge register`) — reconcile skeleton diffs.
2. `forge deploy` to development; `forge install --demo-site` (demo sites
   include seeded data, active 90 days).
3. Wire resolver → Jira API → scanner → storage; verify verdict on a seeded
   issue containing a fake AWS key.
4. `forge lint` clean; fix manifest/scopes from deploy errors.
5. **Gate:** issue panel shows LEAKED with redacted receipt on a live Jira
   issue. Screenshot + test receipt.

## Phase 3 — Ledger + 3D graph (target: 16–30 Nov)

1. Custom UI ledger page (React + Vite) with filters + finding detail.
2. Three.js exposure graph (lazy, fallback 2D SVG + list, reduced-motion).
3. Actions: markRotated / markFalsePositive with reason + audit entries.
4. Responsive + accessibility pass (keyboard, focus, contrast).
5. **Gate:** ledger + graph work on the installed app; interaction inventory
   filled with PASS evidence.

## Phase 4 — Stretch, only if Phase 3 is green (1–7 Dec)

- S1 Teamwork Graph integration (bonus $1,500 × 6) — write leak events to
  the graph; verify via TWG API read-back.
- S2 Rovo agent (`rovo:agent`) answering ledger questions (bonus $1,500 × 6).
- Do NOT start S1/S2 if P0 is not deployed and verified.

## Phase 5 — Release evidence (8–18 Dec)

1. Freeze release commit; record Forge deployment id + environment in
   `deployment/RELEASE_MANIFEST.json`.
2. Fresh-browser verification of the installed app on the demo site.
3. **Demo video (< 5 min, target < 3 min) recorded from the LIVE installed
   app** — real leak caught on a real Jira issue, ledger + 3D graph shown.
   Upload to YouTube as Public (user's tap).
4. Submission draft text (description, Forge-requirement explanation,
   category + bonuses, installation instructions).
5. **Gate:** all rulebook gates A–G re-checked; status set honestly.

## Phase 6 — Submit (19–21 Dec, safe target 21 Dec 20:00 IST)

1. User files the Devpost submission (own browser tap) with installation
   link + public video + text.
2. Verify submission shows as submitted; record receipt/confirmation.
3. **Hard deadline: 23 Dec 2026, 01:30 IST.** No edits after.

## Critical path

`User taps (Phase 1) → forge create/register + deploy (Phase 2) → ledger + 3D
(Phase 3) → video from live install (Phase 5) → submit (Phase 6)`.

The single biggest schedule risk is Phase 1 slipping: every later phase
needs the Atlassian login. If login is not done by ~15 Nov, cut S1/S2 and
shrink Phase 3 to a UI Kit ledger (no Custom UI) to protect the submit date.

## What is NOT in this plan

- No Marketplace publication (review time not guaranteed).
- No paid Forge/Atlassian tier, no card, no external service.
- No submission video before a live install exists (rulebook §7 + user rule).
