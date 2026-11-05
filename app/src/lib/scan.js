// SecretGate scanner — deterministic, fail-closed, zero dependencies.
// Fresh implementation for Forge (NOT copied from CageCheck — different
// language, runtime and integration surface; same honest principles).
// Runs in the Forge resolver; also unit-testable with plain `node --test`
// because it imports nothing from @forge/*.
//
// Rules return LEAKED (known secret format) or REVIEW (suspicious, needs a
// human). Anything unknown is REVIEW, never a silent pass. Evidence is
// ALWAYS redacted before it leaves this module.

const RULES = [
  {
    id: 'aws_access_key',
    label: 'AWS access key',
    severity: 'LEAKED',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: 'github_token',
    label: 'GitHub token',
    severity: 'LEAKED',
    // ghp_ / gho_ / ghu_ / ghs_ / ghr_ (36 chars) and fine-grained PATs
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g,
  },
  {
    id: 'slack_token',
    label: 'Slack token',
    severity: 'LEAKED',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: 'private_key',
    label: 'Private key block',
    severity: 'LEAKED',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: 'password_assignment',
    label: 'Password in plain text',
    severity: 'REVIEW',
    pattern: /\bpassword\s*[:=]\s*['"]?\S{8,}['"]?/gi,
  },
  {
    id: 'generic_high_entropy',
    label: 'High-entropy string near a secret keyword',
    severity: 'REVIEW',
    // 32+ chars of base64-ish alphabet on a line mentioning a secret keyword
    pattern: /(?:api[_-]?key|secret|token|passwd|auth)[^\n]{0,80}?([A-Za-z0-9_\-+/=]{32,})/gi,
  },
];

// Keep only the shape of the secret: first 4 + last 2 chars, middle redacted.
// A 40-char AWS secret becomes e.g. "AKIA…XXXX" — enough to identify the key
// in a rotation ticket, never enough to use it.
function redact(match) {
  const s = String(match);
  if (s.length <= 8) return s.slice(0, 2) + '…' + s.slice(-2);
  return s.slice(0, 4) + '…' + s.slice(-2);
}

function shortHash(text) {
  // FNV-1a 32-bit, hex — stable dedupe key, not a secret store.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ADF (Atlassian Document Format) is JSON: walk it and collect plain text.
// Falls back to treating a plain string as text.
function adfToText(node, out = []) {
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => adfToText(n, out));
    return out;
  }
  if (node && typeof node === 'object') {
    if (typeof node.text === 'string') out.push(node.text);
    if (node.content) adfToText(node.content, out);
  }
  return out;
}

function scanText(text, field) {
  const findings = [];
  const seen = new Set();
  for (const rule of RULES) {
    // Fresh regex per rule (patterns carry /g); reset lastIndex for safety.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const evidence = m[1] !== undefined ? m[1] : m[0];
      const key = `${rule.id}:${shortHash(evidence)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        ruleId: rule.id,
        label: rule.label,
        severity: rule.severity,
        field,
        redactedEvidence: redact(evidence),
        dedupeKey: key,
        replay: `Re-scan this issue after rotating the ${rule.label.toLowerCase()}; SecretGate clears only on a clean re-scan.`,
      });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return findings;
}

// issue: { key, descriptionAdf, comments: [{id, bodyAdf, author}] }
// Returns { verdict: 'CLEAR'|'REVIEW'|'LEAKED', findings: [...] }
function scanIssue(issue) {
  const findings = [];
  const descText = adfToText(issue.descriptionAdf || '').join('\n');
  findings.push(...scanText(descText, 'description'));
  for (const c of issue.comments || []) {
    const body = adfToText(c.bodyAdf || '').join('\n');
    findings.push(
      ...scanText(body, 'comment').map((f) => ({ ...f, commentId: c.id }))
    );
  }
  const verdict = findings.some((f) => f.severity === 'LEAKED')
    ? 'LEAKED'
    : findings.length > 0
      ? 'REVIEW'
      : 'CLEAR';
  return { issueKey: issue.key, verdict, findings };
}

module.exports = { scanIssue, scanText, redact, adfToText, RULES };
