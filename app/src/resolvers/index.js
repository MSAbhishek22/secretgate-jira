// SecretGate resolver — Forge backend (index.handler).
// Requires the Forge runtime (@forge/api, @forge/resolver); NOT runnable in
// plain node. The scanner itself (../lib/scan.js) is pure and tested in
// tests/scan.test.js without Forge.
//
// Security invariants enforced here:
//  - raw secrets are never stored: only redactedEvidence + dedupe hash.
//  - a LEAKED finding can never be cleared by approval; only rotation +
//    a clean re-scan clears it (markRotated flips status, it does not
//    delete the finding or its history).
//  - every status change requires a reason and writes an audit record.

import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';
import { scanIssue } from './lib/scan';

const resolver = new Resolver();

function findingKey(issueKey, dedupeKey) {
  return `finding:${issueKey}:${dedupeKey}`;
}

resolver.define('scanIssue', async ({ payload }) => {
  const { issueKey } = payload;
  const res = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=description,comment,project`
  );
  if (!res.ok) {
    throw new Error(`Jira API error: ${res.status}`);
  }
  const issue = await res.json();
  const comments = (issue.fields.comment?.comments || []).map((c) => ({
    id: c.id,
    bodyAdf: c.body,
  }));
  const result = scanIssue({
    key: issue.key,
    descriptionAdf: issue.fields.description,
    comments,
  });

  // Persist findings (redacted only) + audit the scan.
  for (const f of result.findings) {
    const key = findingKey(issue.key, f.dedupeKey);
    const existing = await storage.get(key);
    const record = {
      ...(existing || {}),
      issueKey: issue.key,
      projectKey: issue.fields.project?.key || null,
      ruleId: f.ruleId,
      label: f.label,
      severity: f.severity,
      status: existing?.status || 'open',
      redactedEvidence: f.redactedEvidence,
      field: f.field,
      commentId: f.commentId || null,
      replay: f.replay,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await storage.set(key, record);
  }
  return result;
});

resolver.define('listFindings', async ({ payload }) => {
  const { status, projectKey } = payload || {};
  const query = storage.query().where('key', 'startsWith', 'finding:');
  const out = [];
  for await (const { key, value } of query) {
    if (status && value.status !== status) continue;
    if (projectKey && value.projectKey !== projectKey) continue;
    // The ledger needs the storage key to call markRotated /
    // markFalsePositive — the record itself does not carry it.
    out.push({ ...value, storageKey: key });
  }
  out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return out;
});

resolver.define('markRotated', async ({ payload, context }) => {
  const { storageKey, reason } = payload;
  if (!reason || reason.trim().length < 3) {
    throw new Error('A reason is required to mark a secret rotated.');
  }
  const record = await storage.get(storageKey);
  if (!record) throw new Error('Finding not found.');
  if (record.severity === 'LEAKED' && record.status === 'open') {
    // Rotation is the legitimate path out of LEAKED — but the finding stays
    // on the record with full history; it is never deleted or hidden.
    record.status = 'rotated';
  } else {
    record.status = 'rotated';
  }
  record.updatedAt = new Date().toISOString();
  record.history = [...(record.history || []), {
    action: 'rotated',
    at: record.updatedAt,
    reason: reason.trim(),
    actor: context?.accountId || 'unknown',
  }];
  await storage.set(storageKey, record);
  await storage.set(`audit:${Date.now()}:${record.dedupeKey || 'x'}`, {
    action: 'rotated', storageKey, reason: reason.trim(),
    actor: context?.accountId || 'unknown', at: record.updatedAt,
  });
  return record;
});

resolver.define('markFalsePositive', async ({ payload, context }) => {
  const { storageKey, reason } = payload;
  if (!reason || reason.trim().length < 3) {
    throw new Error('A reason is required to mark a false positive.');
  }
  const record = await storage.get(storageKey);
  if (!record) throw new Error('Finding not found.');
  if (record.severity === 'LEAKED') {
    // Fail-closed: a LEAKED finding can NEVER be dismissed as a false
    // positive from the UI. Rotate it, or leave it open.
    throw new Error('LEAKED findings cannot be marked false positive. Rotate the secret instead.');
  }
  record.status = 'false-positive';
  record.updatedAt = new Date().toISOString();
  record.history = [...(record.history || []), {
    action: 'false-positive',
    at: record.updatedAt,
    reason: reason.trim(),
    actor: context?.accountId || 'unknown',
  }];
  await storage.set(storageKey, record);
  return record;
});

export const handler = resolver.getDefinitions();
