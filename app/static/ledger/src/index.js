// SecretGate ledger — Custom UI (vanilla JS, no framework).
// Runs inside Jira via @forge/bridge: invoke() calls this app's resolver,
// view.getContext() provides the Jira site URL for issue links.
// No raw secret ever reaches this file: the resolver returns redacted
// evidence only (see app/src/lib/scan.js).
//
// Design: cold Jira-native ADS look (design/DESIGN_CONSTITUTION.md).
// White surfaces, Atlassian blue #0C66E4 for structure, red strictly for
// LEAKED, amber for REVIEW, green for rotated/CLEAR. Mono font for redacted
// evidence and receipt IDs.
//
// The 3D exposure graph is a canvas force-directed graph (issues ↔ secret
// types) with a real 3D simulation + perspective projection — no Three.js,
// no extra dependency. It has a list fallback with identical information.

import { invoke, view } from '@forge/bridge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY = {
  LEAKED: { label: 'LEAKED', dot: '#DE350B' },
  REVIEW: { label: 'REVIEW', dot: '#FFAB00' },
  CLEAR: { label: 'CLEAR', dot: '#36B37E' },
};

const STATUS = {
  open: { label: 'Open' },
  rotated: { label: 'Rotated' },
  'false-positive': { label: 'False positive' },
};

const SEVERITY_RANK = { LEAKED: 3, REVIEW: 2, CLEAR: 1 };
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE_BREAKPOINT = 768;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  findings: [],
  filters: { status: 'all', ruleId: 'all', projectKey: 'all' },
  selectedIssue: null,
  sortDir: 'desc', // by updatedAt, newest first
  loading: true,
  error: null,
  lastLoadedAt: null,
  siteUrl: '',
  notice: '',
  actionForm: null, // { storageKey, action: 'rotated' | 'false-positive' }
  actionError: {}, // storageKey -> resolver error message (shown verbatim)
  actionBusy: {}, // storageKey -> true while a resolver call is in flight
  graph: {
    nodes: [],
    edges: [],
    angle: 0.6,
    tilt: 0.35,
    autoRotate: !REDUCED_MOTION,
    selected: null, // { kind: 'issue' | 'type', key }
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
    rafId: null,
  },
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleString();
}

// Receipt ID: the storage key minus the `finding:` prefix, e.g.
// `PROJ-123:aws_access_key:1a2b3c4d`. Mono font — this is evidence.
function receiptId(finding) {
  return (finding.storageKey || '').replace(/^finding:/, '') || 'unknown';
}

function worstSeverity(findings) {
  let worst = 'CLEAR';
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst]) worst = f.severity;
  }
  return worst;
}

// Worst OPEN severity (rotated / false-positive findings no longer count as
// live exposure). Null when nothing on the node is still open.
function worstOpenSeverity(findings) {
  const open = findings.filter((f) => f.status === 'open');
  if (open.length === 0) return null;
  return worstSeverity(open);
}

// Node colour: red only when a LEAKED finding is still open on that node,
// amber when a REVIEW finding is open, green otherwise. This is what keeps
// the constitution's "red strictly for LEAKED" rule true in the graph.
function nodeColor(findings) {
  const worst = worstOpenSeverity(findings);
  if (worst === 'LEAKED') return SEVERITY.LEAKED.dot;
  if (worst === 'REVIEW') return SEVERITY.REVIEW.dot;
  return SEVERITY.CLEAR.dot;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

async function load() {
  state.loading = true;
  state.error = null;
  render();
  try {
    const ctx = await view.getContext();
    state.siteUrl = (ctx && ctx.siteUrl) || '';
  } catch (e) {
    // A missing site URL only affects issue links (they render as text).
    state.siteUrl = '';
  }
  try {
    const findings = await invoke('listFindings', {});
    state.findings = Array.isArray(findings) ? findings : [];
    state.lastLoadedAt = new Date().toISOString();
    state.loading = false;
    rebuildFilterOptions();
    buildGraph();
    render();
  } catch (e) {
    state.loading = false;
    state.error = (e && e.message) || 'Failed to load findings.';
    render();
  }
}

// ---------------------------------------------------------------------------
// Filtering + sorting
// ---------------------------------------------------------------------------

function visibleFindings() {
  let list = state.findings;
  const { status, ruleId, projectKey } = state.filters;
  if (status !== 'all') list = list.filter((f) => f.status === status);
  if (ruleId !== 'all') list = list.filter((f) => f.ruleId === ruleId);
  if (projectKey !== 'all') list = list.filter((f) => f.projectKey === projectKey);
  if (state.selectedIssue) list = list.filter((f) => f.issueKey === state.selectedIssue);
  const dir = state.sortDir === 'desc' ? -1 : 1;
  return [...list].sort(
    (a, b) => dir * String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')),
  );
}

function rebuildFilterOptions() {
  const typeSelect = $('filterType');
  const projectSelect = $('filterProject');
  const prevType = state.filters.ruleId;
  const prevProject = state.filters.projectKey;

  const types = new Map();
  const projects = new Set();
  for (const f of state.findings) {
    if (!types.has(f.ruleId)) types.set(f.ruleId, f.label);
    if (f.projectKey) projects.add(f.projectKey);
  }
  typeSelect.innerHTML =
    '<option value="all">All types</option>' +
    [...types.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`)
      .join('');
  projectSelect.innerHTML =
    '<option value="all">All projects</option>' +
    [...projects]
      .sort()
      .map((p) => `<option value="${esc(p)}">${esc(p)}</option>`)
      .join('');

  state.filters.ruleId = types.has(prevType) ? prevType : 'all';
  state.filters.projectKey = projects.has(prevProject) ? prevProject : 'all';
  typeSelect.value = state.filters.ruleId;
  projectSelect.value = state.filters.projectKey;
}

// ---------------------------------------------------------------------------
// Rendering — summary, table, filters, empty/error states
// ---------------------------------------------------------------------------

function render() {
  $('loading').hidden = !state.loading;
  $('errorBox').hidden = !state.error;
  $('errorText').textContent = state.error || '';
  $('notice').textContent = state.notice || '';

  const list = visibleFindings();
  const hasData = !state.loading && !state.error;
  $('findingsTable').hidden = !hasData || list.length === 0;
  $('emptyState').hidden = !hasData || list.length !== 0;
  if (hasData && list.length === 0) {
    $('emptyText').textContent =
      `No findings in this project — last full scan ${formatTime(state.lastLoadedAt)}`;
  }

  renderSummary();
  renderTable(list);
  renderIssueChip();
  $('graphPanel').hidden = !hasData || state.findings.length === 0;
  $('sortDir').textContent = state.sortDir === 'desc' ? '↓' : '↑';
  $('sortUpdated').setAttribute(
    'aria-label',
    state.sortDir === 'desc' ? 'Updated, newest first. Activate to sort oldest first.' : 'Updated, oldest first. Activate to sort newest first.',
  );
}

function renderSummary() {
  const total = state.findings.length;
  const open = state.findings.filter((f) => f.status === 'open').length;
  const leaked = state.findings.filter((f) => f.severity === 'LEAKED' && f.status === 'open').length;
  const rotated = state.findings.filter((f) => f.status === 'rotated').length;
  $('summary').textContent =
    total === 0
      ? 'No findings recorded yet.'
      : `${total} finding${total === 1 ? '' : 's'} · ${open} open · ${leaked} open LEAKED · ${rotated} rotated`;
}

function issueLink(issueKey) {
  if (state.siteUrl) {
    return `<a href="${esc(state.siteUrl)}/browse/${esc(issueKey)}" target="_blank" rel="noopener">${esc(issueKey)}</a>`;
  }
  return `<span class="mono" title="Open in Jira (site URL unavailable)">${esc(issueKey)}</span>`;
}

function stampHtml(severity) {
  const meta = SEVERITY[severity] || SEVERITY.REVIEW;
  return `<span class="stamp ${severity.toLowerCase()}">${esc(meta.label)}</span>`;
}

function statusPillHtml(status) {
  const meta = STATUS[status] || STATUS.open;
  return `<span class="pill ${esc(status)}">${esc(meta.label)}</span>`;
}

function actionFormHtml(finding, action) {
  const key = finding.storageKey;
  const verb = action === 'rotated' ? 'mark rotated' : 'mark false positive';
  const err = state.actionError[key];
  return `<tr class="detail"><td colspan="7"><div class="receipt">
    <div><span class="mono">receipt: ${esc(receiptId(finding))}</span></div>
    <div>${esc(finding.replay || '')}</div>
    <div class="note">Field: ${esc(finding.field || '—')}${finding.commentId ? ` · Comment: ${esc(finding.commentId)}` : ''}</div>
    <label>Reason (required, at least 3 characters)
      <input type="text" data-reason-input="${esc(key)}" placeholder="e.g. Key revoked in AWS console, ticket ABC-123" autocomplete="off">
    </label>
    ${err ? `<p class="inline-error" role="alert">${esc(err)}</p>` : ''}
    <div class="row">
      <button type="button" class="primary" data-confirm="${esc(action)}" data-key="${esc(key)}" disabled>Confirm — ${esc(verb)}</button>
      <button type="button" data-cancel="${esc(key)}">Cancel</button>
    </div>
  </div></td></tr>`;
}

function renderTable(list) {
  const body = $('findingsBody');
  let html = '';
  for (const f of list) {
    const key = f.storageKey || '';
    const busy = !!state.actionBusy[key];
    html += `<tr>
      <td>${stampHtml(f.severity)}</td>
      <td>${issueLink(f.issueKey)}</td>
      <td>${esc(f.label)}</td>
      <td class="mono">${esc(f.redactedEvidence)}</td>
      <td>${esc(formatTime(f.updatedAt))}</td>
      <td>${statusPillHtml(f.status)}</td>
      <td><div class="actions">
        <button type="button" data-action="rotated" data-key="${esc(key)}" ${busy ? 'disabled' : ''}>Mark rotated</button>
        <button type="button" data-action="false-positive" data-key="${esc(key)}" ${busy ? 'disabled' : ''}>Mark false positive</button>
      </div></td>
    </tr>`;
    if (state.actionForm && state.actionForm.storageKey === key) {
      html += actionFormHtml(f, state.actionForm.action);
    }
  }
  body.innerHTML = html;
}

function renderIssueChip() {
  const chip = $('issueChip');
  if (!state.selectedIssue) {
    chip.hidden = true;
    chip.innerHTML = '';
    return;
  }
  chip.hidden = false;
  chip.innerHTML = `Issue: <span class="mono">${esc(state.selectedIssue)}</span> <button type="button" data-clear-issue aria-label="Clear issue filter">✕</button>`;
}

// ---------------------------------------------------------------------------
// Actions — markRotated / markFalsePositive
// ---------------------------------------------------------------------------

async function submitAction(storageKey, action, reason) {
  state.actionBusy[storageKey] = true;
  delete state.actionError[storageKey];
  renderTable(visibleFindings());
  try {
    const fn = action === 'rotated' ? 'markRotated' : 'markFalsePositive';
    const updated = await invoke(fn, { storageKey, reason });
    // The resolver returns the stored record without its storage key.
    const idx = state.findings.findIndex((f) => f.storageKey === storageKey);
    if (idx >= 0) state.findings[idx] = { ...updated, storageKey };
    state.actionForm = null;
    delete state.actionBusy[storageKey];
    state.notice =
      action === 'rotated'
        ? 'Marked rotated — receipt updated. The finding stays on record with full history.'
        : 'Marked false positive — receipt updated.';
    window.setTimeout(() => {
      state.notice = '';
      $('notice').textContent = '';
    }, 6000);
    buildGraph();
    render();
  } catch (e) {
    // Fail-closed, shown plainly: the resolver's message (e.g. the LEAKED
    // false-positive refusal) is never hidden or reworded.
    delete state.actionBusy[storageKey];
    state.actionError[storageKey] = (e && e.message) || 'Action failed.';
    renderTable(visibleFindings());
  }
}

// ---------------------------------------------------------------------------
// 3D exposure graph — canvas force-directed, 3D sim + perspective projection
// ---------------------------------------------------------------------------

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildGraph() {
  const issues = new Map();
  const types = new Map();
  const edgeSet = new Set();
  for (const f of state.findings) {
    if (!issues.has(f.issueKey)) issues.set(f.issueKey, { kind: 'issue', key: f.issueKey, findings: [] });
    issues.get(f.issueKey).findings.push(f);
    if (!types.has(f.ruleId)) types.set(f.ruleId, { kind: 'type', key: f.ruleId, label: f.label, findings: [] });
    types.get(f.ruleId).findings.push(f);
    edgeSet.add(`${f.issueKey}|${f.ruleId}`);
  }
  const nodes = [];
  for (const issue of issues.values()) {
    const h = hashString(issue.key);
    nodes.push({
      ...issue,
      x: (h % 420) - 210,
      y: ((h >> 4) % 300) - 150,
      z: ((h >> 7) % 220) - 110,
      vx: 0, vy: 0, vz: 0,
      r: Math.min(8 + issue.findings.length * 3, 22),
    });
  }
  for (const type of types.values()) {
    const h = hashString(type.key);
    nodes.push({
      ...type,
      x: (h % 420) - 210,
      y: ((h >> 4) % 300) - 150,
      z: ((h >> 7) % 220) - 110,
      vx: 0, vy: 0, vz: 0,
      r: Math.min(7 + type.findings.length * 3, 20),
    });
  }
  state.graph.nodes = nodes;
  state.graph.edges = [...edgeSet].map((k) => {
    const [a, b] = k.split('|');
    return { a, b };
  });
  for (let i = 0; i < 150; i++) simStep();
  renderGraphList();
  drawGraph();
  startAutoRotate();
}

function simStep() {
  const nodes = state.graph.nodes;
  const byKey = new Map(nodes.map((n) => [`${n.kind}:${n.key}`, n]));
  const REP = 26000;
  const SPRING = 0.02;
  const REST = 140;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const d2 = dx * dx + dy * dy + dz * dz + 1;
      const d = Math.sqrt(d2);
      const f = Math.min(REP / d2, 4);
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      a.vz += (dz / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
      b.vz -= (dz / d) * f;
    }
  }
  for (const e of state.graph.edges) {
    const a = byKey.get(`issue:${e.a}`);
    const b = byKey.get(`type:${e.b}`);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const f = (d - REST) * SPRING;
    a.vx += (dx / d) * f;
    a.vy += (dy / d) * f;
    a.vz += (dz / d) * f;
    b.vx -= (dx / d) * f;
    b.vy -= (dy / d) * f;
    b.vz -= (dz / d) * f;
  }
  for (const n of nodes) {
    n.vx += -n.x * 0.004;
    n.vy += -n.y * 0.004;
    n.vz += -n.z * 0.006;
    n.vx *= 0.82;
    n.vy *= 0.82;
    n.vz *= 0.82;
    n.x += n.vx;
    n.y += n.vy;
    n.z += n.vz;
  }
}

function projectNode(n, angle, tilt, w, h) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const x1 = n.x * cosA + n.z * sinA;
  const z1 = -n.x * sinA + n.z * cosA;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const y1 = n.y * cosT - z1 * sinT;
  const z2 = n.y * sinT + z1 * cosT;
  const focal = 900;
  const scale = focal / (focal + z2);
  return { x: w / 2 + x1 * scale, y: h / 2 + y1 * scale, r: Math.max(n.r * scale, 2), depth: z2, scale };
}

function nodeMatchesFilters(node) {
  const { status, ruleId, projectKey } = state.filters;
  return node.findings.some((f) => {
    if (status !== 'all' && f.status !== status) return false;
    if (ruleId !== 'all' && f.ruleId !== ruleId) return false;
    if (projectKey !== 'all' && f.projectKey !== projectKey) return false;
    if (state.selectedIssue && f.issueKey !== state.selectedIssue) return false;
    return true;
  });
}

function drawGraph() {
  const canvas = $('graphCanvas');
  const panel = $('graphPanel');
  if (panel.hidden || panel.classList.contains('collapsed') || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW === 0 || cssH === 0) return;
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const { nodes, edges, angle, tilt } = state.graph;
  const byKey = new Map(nodes.map((n) => [`${n.kind}:${n.key}`, n]));
  const projected = new Map(
    nodes.map((n) => [`${n.kind}:${n.key}`, { node: n, p: projectNode(n, angle, tilt, cssW, cssH) }]),
  );

  ctx.lineWidth = 1;
  for (const e of edges) {
    const a = projected.get(`issue:${e.a}`);
    const b = projected.get(`type:${e.b}`);
    if (!a || !b) continue;
    const dim = !nodeMatchesFilters(a.node) || !nodeMatchesFilters(b.node);
    ctx.strokeStyle = dim ? 'rgba(98,111,134,0.15)' : 'rgba(98,111,134,0.45)';
    ctx.beginPath();
    ctx.moveTo(a.p.x, a.p.y);
    ctx.lineTo(b.p.x, b.p.y);
    ctx.stroke();
  }

  const sorted = [...projected.values()].sort((a, b) => b.p.depth - a.p.depth);
  for (const { node, p } of sorted) {
    const dim = !nodeMatchesFilters(node);
    const color = nodeColor(node.findings);
    const isSelected =
      state.graph.selected &&
      state.graph.selected.kind === node.kind &&
      state.graph.selected.key === node.key;
    ctx.globalAlpha = dim ? 0.25 : 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (isSelected) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0C66E4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = dim ? 0.35 : 0.9;
    ctx.fillStyle = '#172B4D';
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(node.kind === 'issue' ? node.key : node.label || node.key, p.x, p.y + p.r + 13);
  }
  ctx.globalAlpha = 1;
}

// List fallback — identical information to the graph, always available.
function renderGraphList() {
  const list = $('graphList');
  const issues = new Map();
  for (const f of state.findings) {
    if (!issues.has(f.issueKey)) issues.set(f.issueKey, []);
    issues.get(f.issueKey).push(f);
  }
  if (issues.size === 0) {
    list.innerHTML = '';
    return;
  }
  let html = '<strong>Blast-radius list</strong> (same information as the map):<ul>';
  for (const [issueKey, findings] of [...issues.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const worst = worstOpenSeverity(findings);
    const worstLabel = worst ? `${worst} open` : 'all rotated / false positive';
    const byType = new Map();
    for (const f of findings) {
      if (!byType.has(f.ruleId)) byType.set(f.ruleId, { label: f.label, count: 0, worst: 'CLEAR' });
      const t = byType.get(f.ruleId);
      t.count += 1;
      if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[t.worst]) t.worst = f.severity;
    }
    html += `<li><span class="mono">${esc(issueKey)}</span> — ${findings.length} finding${findings.length === 1 ? '' : 's'} · worst open: ${esc(worstLabel)}<ul>`;
    for (const t of [...byType.values()].sort((a, b) => b.count - a.count)) {
      html += `<li>${esc(t.label)} ×${t.count} (${esc(t.worst)})</li>`;
    }
    html += '</ul></li>';
  }
  html += '</ul>';
  list.innerHTML = html;
}

function startAutoRotate() {
  if (!state.graph.autoRotate || state.graph.rafId !== null) return;
  const tick = () => {
    if (!state.graph.autoRotate) {
      state.graph.rafId = null;
      return;
    }
    state.graph.angle += 0.0025;
    drawGraph();
    state.graph.rafId = requestAnimationFrame(tick);
  };
  state.graph.rafId = requestAnimationFrame(tick);
}

function stopAutoRotate() {
  state.graph.autoRotate = false;
  if (state.graph.rafId !== null) {
    cancelAnimationFrame(state.graph.rafId);
    state.graph.rafId = null;
  }
}

function nodeAtPoint(clientX, clientY) {
  const canvas = $('graphCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { nodes, angle, tilt } = state.graph;
  const projected = nodes
    .map((n) => ({ node: n, p: projectNode(n, angle, tilt, rect.width, rect.height) }))
    .sort((a, b) => a.p.depth - b.p.depth);
  for (const { node, p } of projected) {
    const dx = x - p.x;
    const dy = y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) <= p.r + 6) return node;
  }
  return null;
}

function selectGraphNode(node) {
  if (!node) {
    state.graph.selected = null;
    state.selectedIssue = null;
    render();
    drawGraph();
    return;
  }
  state.graph.selected = { kind: node.kind, key: node.key };
  if (node.kind === 'issue') {
    state.selectedIssue = node.key;
  } else {
    state.filters.ruleId = node.key;
    $('filterType').value = node.key;
  }
  render();
  drawGraph();
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function wireEvents() {
  $('filterStatus').addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    render();
    drawGraph();
  });
  $('filterType').addEventListener('change', (e) => {
    state.filters.ruleId = e.target.value;
    render();
    drawGraph();
  });
  $('filterProject').addEventListener('change', (e) => {
    state.filters.projectKey = e.target.value;
    render();
    drawGraph();
  });
  $('clearFilters').addEventListener('click', () => {
    state.filters = { status: 'all', ruleId: 'all', projectKey: 'all' };
    state.selectedIssue = null;
    state.graph.selected = null;
    $('filterStatus').value = 'all';
    $('filterType').value = 'all';
    $('filterProject').value = 'all';
    render();
    drawGraph();
  });
  $('sortUpdated').addEventListener('click', () => {
    state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
    render();
  });
  $('retryBtn').addEventListener('click', () => load());
  $('refreshBtn').addEventListener('click', () => load());

  // Table actions — event delegation (rows are re-rendered).
  $('findingsBody').addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      state.actionForm = { storageKey: actionBtn.dataset.key, action: actionBtn.dataset.action };
      delete state.actionError[actionBtn.dataset.key];
      renderTable(visibleFindings());
      return;
    }
    const confirmBtn = e.target.closest('[data-confirm]');
    if (confirmBtn) {
      const key = confirmBtn.dataset.key;
      const input = document.querySelector(`[data-reason-input="${CSS.escape(key)}"]`);
      const reason = (input && input.value ? input.value : '').trim();
      if (reason.length < 3) {
        state.actionError[key] = 'A reason of at least 3 characters is required.';
        renderTable(visibleFindings());
        return;
      }
      submitAction(key, confirmBtn.dataset.confirm, reason);
      return;
    }
    const cancelBtn = e.target.closest('[data-cancel]');
    if (cancelBtn) {
      state.actionForm = null;
      delete state.actionError[cancelBtn.dataset.key];
      renderTable(visibleFindings());
      return;
    }
    const clearIssue = e.target.closest('[data-clear-issue]');
    if (clearIssue) {
      state.selectedIssue = null;
      state.graph.selected = null;
      render();
      drawGraph();
    }
  });

  // Enable the confirm button only once the reason is ≥ 3 chars.
  $('findingsBody').addEventListener('input', (e) => {
    const input = e.target.closest('[data-reason-input]');
    if (!input) return;
    const key = input.dataset.reasonInput;
    const confirmBtn = document.querySelector(`[data-confirm][data-key="${CSS.escape(key)}"]`);
    if (confirmBtn) confirmBtn.disabled = input.value.trim().length < 3;
  });

  // Graph panel collapse — starts collapsed below ~768px.
  const panel = $('graphPanel');
  const toggle = $('graphToggle');
  const setCollapsed = (collapsed) => {
    panel.classList.toggle('collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? 'View blast-radius map' : 'Hide map';
    if (!collapsed) {
      drawGraph();
      startAutoRotate();
    } else {
      stopAutoRotate();
    }
  };
  if (window.innerWidth < MOBILE_BREAKPOINT) setCollapsed(true);
  toggle.addEventListener('click', () => setCollapsed(!panel.classList.contains('collapsed')));

  // Graph drag-to-rotate + click-to-filter.
  const canvas = $('graphCanvas');
  if (canvas.getContext('2d')) {
    canvas.addEventListener('pointerdown', (e) => {
      state.graph.dragging = true;
      state.graph.moved = false;
      state.graph.lastX = e.clientX;
      state.graph.lastY = e.clientY;
      canvas.classList.add('dragging');
      canvas.setPointerCapture(e.pointerId);
      stopAutoRotate(); // first interaction stops the auto-rotate, for good
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!state.graph.dragging) return;
      const dx = e.clientX - state.graph.lastX;
      const dy = e.clientY - state.graph.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) state.graph.moved = true;
      state.graph.lastX = e.clientX;
      state.graph.lastY = e.clientY;
      state.graph.angle += dx * 0.005;
      state.graph.tilt = Math.max(-0.9, Math.min(0.9, state.graph.tilt + dy * 0.003));
      drawGraph();
    });
    const endDrag = (e) => {
      if (!state.graph.dragging) return;
      state.graph.dragging = false;
      canvas.classList.remove('dragging');
      if (!state.graph.moved) selectGraphNode(nodeAtPoint(e.clientX, e.clientY));
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', () => {
      state.graph.dragging = false;
      canvas.classList.remove('dragging');
    });
  } else {
    const note = $('graphNote');
    note.hidden = false;
    note.textContent = 'Canvas is unavailable in this browser — the list below has the same information.';
  }

  window.addEventListener('resize', () => drawGraph());
}

wireEvents();
load();
