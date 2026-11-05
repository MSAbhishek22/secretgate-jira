// Scanner unit tests — plain node, no Forge login needed.
// Run:  node --test tests/   (from app/)
const test = require('node:test');
const assert = require('node:assert/strict');
const { scanIssue, scanText, redact } = require('../src/lib/scan');

test('AWS access key in description -> LEAKED, evidence redacted', () => {
  const r = scanIssue({
    key: 'SG-1',
    descriptionAdf: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'key is AKIAIOSFODNN7EXAMPLE' }] }] },
    comments: [],
  });
  assert.equal(r.verdict, 'LEAKED');
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].ruleId, 'aws_access_key');
  assert.ok(!r.findings[0].redactedEvidence.includes('AKIAIOSFODNN7EXAMPLE'));
  assert.ok(r.findings[0].redactedEvidence.startsWith('AKIA'));
});

test('clean issue -> CLEAR, no findings', () => {
  const r = scanIssue({
    key: 'SG-2',
    descriptionAdf: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fix the login redirect on the settings page.' }] }] },
    comments: [],
  });
  assert.equal(r.verdict, 'CLEAR');
  assert.equal(r.findings.length, 0);
});

test('private key block in a comment -> LEAKED with comment field', () => {
  const r = scanIssue({
    key: 'SG-3',
    descriptionAdf: '',
    comments: [{ id: '10001', bodyAdf: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'pasted cert:\n-----BEGIN RSA PRIVATE KEY-----\nMIIE...' }] }] } }],
  });
  assert.equal(r.verdict, 'LEAKED');
  assert.equal(r.findings[0].field, 'comment');
  assert.equal(r.findings[0].commentId, '10001');
});

test('GitHub token -> LEAKED; Slack token -> LEAKED', () => {
  const f = scanText('token ghp_' + 'a'.repeat(36) + ' and xoxb-123456789012-abcdefghij', 'description');
  assert.equal(f.filter((x) => x.severity === 'LEAKED').length, 2);
});

test('password assignment -> REVIEW, not LEAKED', () => {
  const r = scanIssue({
    key: 'SG-5',
    descriptionAdf: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'db password: hunter2hunter2' }] }] },
    comments: [],
  });
  assert.equal(r.verdict, 'REVIEW');
});

test('same secret twice dedupes to one finding', () => {
  const key = 'AKIAIOSFODNN7EXAMPLE';
  const f = scanText(`${key} and again ${key}`, 'description');
  assert.equal(f.length, 1);
});

test('redact keeps first 4 + last 2 only', () => {
  assert.equal(redact('AKIAIOSFODNN7EXAMPLE'), 'AKIA…LE');
  assert.ok(!redact('AKIAIOSFODNN7EXAMPLE').includes('IOSFODNN7EXAMP'));
});

test('plain string ADF fallback works', () => {
  const r = scanIssue({ key: 'SG-8', descriptionAdf: 'AKIAIOSFODNN7EXAMPLE', comments: [] });
  assert.equal(r.verdict, 'LEAKED');
});
