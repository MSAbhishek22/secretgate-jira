# DESIGN CONSTITUTION — SecretGate for Jira

## Personality and tone

A **forensic evidence desk**: calm, precise, un-dramatic. Secrets leaking is
already alarming; the product does not shout. It stamps, receipts and files.
Tone: "Here is exactly what leaked, where, and what to do next." No jokes in
the verdict path; no gamification.

## Target user and context

A software-team lead or security-minded developer inside Jira, mid-incident
or mid-review. They open an issue to check whether a pasted log is safe. They
need a verdict in under 5 seconds and a receipt they can paste into the
rotation ticket. Context: dense Jira chrome, many panels, small text.

## Visual metaphor — the redaction receipt

Every finding is a **receipt slip**: monospace redacted evidence, a rule
stamp (LEAKED / REVIEW / CLEAR), a timestamp, a replay line. The ledger is a
filing cabinet of receipts. The 3D graph is the "blast-radius map" pinned
above the cabinet. This is the same receipt idea as CageCheck, but the visual
treatment is different: CageCheck was paper/ink/stamp on a warm cream desk;
SecretGate is **cold Jira-native ADS**: white surfaces, Atlassian blue for
structure, red reserved strictly for LEAKED, amber for REVIEW, green for
rotated/clear. No paper texture, no stamp grunge, no cream.

## Palette (semantic roles — ADS tokens, never hardcoded hex in UI Kit)

| Role | ADS token | Use |
|---|---|---|
| Primary action / structure | `color.background.brand.bold` (#0C66E4 light) | One primary button per screen, links, graph "selected" |
| Danger / LEAKED | `color.background.danger.bold`, `color.text.danger` | LEAKED stamp, open-finding rows only |
| Warning / REVIEW | `color.background.warning.bold` | REVIEW stamp |
| Success / rotated & CLEAR | `color.background.success.bold` | CLEAR stamp, rotated status |
| Surface / text | `color.background.neutral`, `color.text`, `color.text.subtle` | Panels, body, metadata |
| Border | `color.border` | Receipt card borders, table dividers |

Red appears nowhere except a real LEAKED state — that scarcity is what makes
the stamp meaningful.

## Typography

- UI Kit / ADS defaults: Atlassian Sans for UI, Atlassian Mono for redacted
  evidence, hashes and receipt IDs (monospace = "this is evidence").
- Hierarchy: panel title (Heading medium) → verdict stamp (Lozenge large) →
  receipt body (Text) → metadata (Text subtle, small).
- Custom UI ledger uses the same scale; the 3D graph labels use mono 11–12px.

## Layout and information architecture

- **Issue panel:** single column. Verdict stamp top, then receipt cards
  (one per finding), then actions (Re-scan, Mark rotated, Mark false
  positive). No sidebar, no tabs.
- **Ledger page:** left = filter rail (status, secret type, project);
  centre = findings table (dense, sortable); right/top = 3D exposure graph
  in a collapsible panel. Graph never pushes the table off-screen on desktop;
  on mobile the graph collapses to a "View blast-radius map" disclosure.
- Grid: ADS 8px spacing (`space.100`–`space.400`); receipts use
  `space.200` internal padding.

## Components and interaction

- Verdict = `Lozenge` (danger/warning/success appearance) + `Badge` count.
- Receipts = `Box` with border + mono evidence line + `Button` (subtle) for
  "Copy replay" (copies the re-scan instruction, never the secret).
- Ledger filters = `Select` + `Checkbox`; table rows are links to the issue.
- Every async action shows loading state, then success only after the
  resolver confirms; errors show a recoverable message + Retry.
- Empty state: "No findings in this project — last full scan <time>" with a
  Scan-now button. Never a blank table.

## Motion

- Restrained: 150ms fades on panel open, stamp "lands" with a single
  200ms scale-in. No bounce, no confetti, no decorative animation.
- The 3D graph rotates only on user drag (or a slow auto-rotate that stops
  on first interaction and is disabled under `prefers-reduced-motion`).

## 3D concept

See `ARCHITECTURE.md` — force-directed exposure graph: issues ↔ secret
types, sized by finding count, coloured by status. It exists to answer one
question ("how far did this leak spread?") that a table answers badly.

## Responsive and accessibility

- Panel and ledger work at desktop, tablet and mobile widths; the graph
  collapses below ~768px.
- All stamps have text labels, never colour alone. Focus visible, keyboard
  operable, `prefers-reduced-motion` honoured, graph has a list fallback
  with identical information.

## References

See `RESEARCH.md` § "Design references" (Forge dashboard tutorial, issue
panel + global page manifest references, ADS tokens, Codegeist Devpost page,
CageCheck receipt pattern).
