# PROJECT DESIGN REGISTRY — comparison vs 3 most recent projects

Rulebook §1.3: the new project must be recognizably different from at least
the three most recent projects in more than accent colour.

## The three most recent (Nov 2026)

### 1. CageCheck (3 Nov 2026) — paper / ink / stamp
- Metaphor: a physical cage + rubber-stamp receipts on a warm cream desk.
- Palette: warm cream paper, ink black, red stamp, typewriter mono.
- Layout: single-column "paste snippet → verdict" flow, receipt slip cards.
- Hero: big stamp (PASSED / HELD / BLOCKED).
- Signature interaction: the stamp landing on the receipt; approval gate.
- 3D: none shipped (local stdlib web UI).
- **SecretGate differs:** cold Jira-native ADS system UI (white/blue, no
  paper texture, no cream, no stamp grunge); two-surface product (panel +
  ledger dashboard); 3D exposure graph; verdicts are Lozenge stamps inside
  Jira chrome, not a standalone desk.

### 2. NoteVault (3 Nov 2026, Mozilla Otari) — notes vault
- Metaphor: a personal vault / notebook; calm note-taking surface.
- Palette: (from repo) muted, note-paper tones; card-grid of notes.
- Layout: sidebar + note grid + editor.
- Signature interaction: semantic search + AI summary of notes.
- **SecretGate differs:** no sidebar/note-grid/editor at all; dense ledger
  table + filter rail + 3D graph; forensic tone instead of calm personal
  tone; no AI summary in the core loop.

### 3. ClinicLink Bharat (3 Nov 2026) — clinic triage
- Metaphor: a clinic triage desk; danger-sign checklist, ESCALATE panel.
- Palette: clinical whites/reds for escalation.
- Layout: triage form + patient queue.
- Signature interaction: danger-sign checklist with red escalation panel.
- **SecretGate differs:** audience is developers, not clinics; object is
  leaked secrets, not patients; ledger + graph instead of queue + checklist;
  red is reserved for LEAKED verdicts, not a persistent escalation banner.

## SecretGate identity (this project)

- Metaphor: forensic evidence desk — redaction receipts + blast-radius map.
- Palette: ADS white/blue structure; red ONLY for LEAKED, amber REVIEW,
  green rotated/clear.
- Layout: Jira issue panel (single column) + ledger (filter rail + dense
  table + collapsible 3D graph).
- Hero: the verdict stamp + receipt, inside Jira — not a marketing hero.
- Signature interaction: redacted receipt with copyable replay; 3D graph
  node click filters the ledger.
- 3D: Three.js force-directed exposure graph (issues ↔ secret types).
- Typography: Atlassian Sans UI + Atlassian Mono evidence.
- Motion: restrained 150–200ms fades; graph rotates on drag only.

**Verdict:** distinct on metaphor, palette use, layout, hierarchy,
interaction model and 3D treatment. PASS on UI distinctiveness (pending
real screenshots at Phase 3).
