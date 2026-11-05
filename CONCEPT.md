# CONCEPT — SecretGate for Jira

## The problem (one paragraph)

A developer debugging a failing deploy pastes a log into a Jira issue. The
log contains a live AWS key, a Slack token and a database password. The issue
is now visible to the whole project, copied into email notifications, indexed
by search, and exported in the next board report. The secret is revoked hours
later — after it has already spread. Jira has no built-in tripwire for this:
the leak is discovered by accident, if at all.

## The product

**SecretGate for Jira** is a Forge app that puts a tripwire on every Jira
issue:

1. **Issue panel (UI Kit, `jira:issuePanel`).** Open any issue and SecretGate
   shows a verdict stamp — **CLEAR**, **REVIEW** or **LEAKED** — with each
   finding as a redacted receipt: rule name, field (description / comment /
   code block), redacted evidence (`AKIA…XXXX`), and a replay instruction.
   A LEAKED finding can never be stamped CLEAR by clicking "approve" — the
   only way to clear it is to rotate the secret and re-scan.
2. **Leak ledger (Custom UI global page, `jira:globalPage`).** Every finding
   across the project in one ledger: which issue, which secret type, who
   reported it, status (open / rotated / false positive), and age. A **3D
   exposure graph** shows issues as nodes and shared secrets as edges, so a
   team can see at a glance that one leaked key touches seven issues.
3. **Deterministic scanner first.** The scan is a fixed set of rules
   (well-known secret formats + entropy check on high-entropy strings),
   running in a Forge resolver — no network call, no LLM deciding
   block/approve. An optional explanation step (never a decision) is a
   Phase-3 stretch.
4. **Fail-closed by design.** Unknown secret shapes are flagged REVIEW, never
   silently passed. Redaction happens before anything is stored or rendered.

## Why this concept (justification)

- **Theme-sharp:** Codegeist 2026 is "build with context, ship with
  confidence" — the Teamwork Graph connects work, people and decisions, and
  SecretGate answers "what already leaked, and where does it touch?" using
  exactly that context. Category fit is direct: *Apps for Software Teams —
  issue triage that actually understands what matters.*
- **Buildable by one person:** two Forge modules, one deterministic scanner,
  Forge storage, no external services, no paid APIs, no custom backend. The
  whole P0 fits in ~2 weeks of focused work inside a 7-week window.
- **Reuses his proven strength, not his code:** CageCheck (3 Nov) proved the
  secret-leak-guard concept, the receipt pattern and the fail-closed policy
  with 10/10 tests — but it is a standalone Python server and Codegeist
  requires a *new Forge app*. SecretGate re-implements the idea natively on
  Forge (Jira API + resolvers + storage). No CageCheck code is copied.
- **Differentiated from generic "AI security" entries:** no LLM in the loop
  for decisions, every verdict is reproducible and explainable, and the
  receipt is the product — the same honesty that made CageCheck distinct.
- **Prize-path aware:** P0 targets a Grand Prize in Software Teams. Two
  cheap stretch paths add bonus eligibility without risking P0: Teamwork
  Graph integration (write leak events to the graph, $1,500 × 6) and a Rovo
  agent (`rovo:agent`, $1,500 × 6). Marketplace publication is deliberately
  NOT targeted — it needs a review ticket and review time the schedule
  cannot guarantee.
- **Judge-friendly:** installation link + demo site is the native Forge flow;
  the demo video can show a real leak being caught on a real Jira issue in
  under 3 minutes.

## What it is NOT

- Not a secrets manager, not a vault, not a rotation tool — it detects,
  records and tracks; rotation happens in the provider console.
- Not an LLM scanner — the deterministic scanner is the decision-maker.
- Not a fork of CageCheck — fresh Forge code, fresh manifest, fresh UI.

## P0 scope (must ship)

1. `jira:issuePanel` — scan current issue (description + comments), verdict
   stamp, redacted finding receipts, re-scan button, false-positive marking
   (with reason, audited).
2. `jira:globalPage` (Custom UI) — leak ledger table, filters (status /
   secret type / project), per-finding detail, 3D exposure graph (Three.js,
   lazy-loaded, 2D list fallback).
3. Forge storage — findings + audit log (append-only, who did what when).
4. Scanner rules — AWS keys, GitHub tokens, Slack tokens, private keys,
   generic high-entropy + keyword-context rules; redaction everywhere.
5. Installation link + judge instructions; demo video from the installed app.

## Stretch (only after P0 is live)

- **S1 — Teamwork Graph:** write leak events (issue ↔ secret-type ↔ reporter)
  into the graph; bonus-prize eligibility.
- **S2 — Rovo agent:** `rovo:agent` that answers "what leaked in this
  project this week?" from the ledger; bonus-prize eligibility.
- **S3 — JSM:** extend panel to Jira Service Management queues.
- **S4 — Scheduled re-scan:** scan all issues nightly via Forge scheduled
  trigger, ledger shows drift.

## Risks

- Forge UI Kit cannot run Three.js — hence the split: UI Kit panel +
  Custom UI global page. If Custom UI proves too heavy, the 3D graph drops
  to a 2D SVG graph with the same data (documented fallback, not a silent cut).
- `jira:issuePanel` only shows to users with edit permission (verified in
  Forge docs) — the video must be recorded as a user who can edit issues.
- Judges install on their own test site — the install instructions must be
  exact; a broken install is a Stage-One fail.
