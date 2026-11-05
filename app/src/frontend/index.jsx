// SecretGate issue panel — Forge UI Kit 2 (@forge/react).
// Shows the verdict stamp + redacted finding receipts for the open issue.
// No raw secret ever reaches this file: the resolver only returns redacted
// evidence (see src/lib/scan.js).

import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  Heading,
  Inline,
  Lozenge,
  Stack,
  Text,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

const VERDICT_APPEARANCE = {
  CLEAR: 'success',
  REVIEW: 'moved',
  LEAKED: 'removed',
};

const App = () => {
  const [context, setContext] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runScan = async (issueKey) => {
    setLoading(true);
    setError(null);
    try {
      const r = await invoke('scanIssue', { issueKey });
      setResult(r);
    } catch (e) {
      setError(`Scan failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    view.getContext().then((ctx) => {
      setContext(ctx);
      const issueKey = ctx?.extension?.issue?.key;
      if (issueKey) runScan(issueKey);
      else {
        setLoading(false);
        setError('No issue in context.');
      }
    });
  }, []);

  const issueKey = context?.extension?.issue?.key;

  return (
    <Box padding="space.300">
      <Stack space="space.300">
        <Inline space="space.200" alignBlock="center">
          <Heading size="medium">SecretGate</Heading>
          {result && (
            <Lozenge appearance={VERDICT_APPEARANCE[result.verdict]}>
              {result.verdict}
            </Lozenge>
          )}
        </Inline>

        {loading && <Text>Scanning this issue for leaked secrets…</Text>}
        {error && (
          <Stack space="space.200">
            <Text>{error}</Text>
            <Button appearance="primary" onClick={() => runScan(issueKey)}>
              Retry scan
            </Button>
          </Stack>
        )}

        {!loading && !error && result && result.verdict === 'CLEAR' && (
          <Text>No secrets found in the description or comments of {issueKey}.</Text>
        )}

        {!loading && !error && result && result.findings.map((f) => (
          <Box
            key={f.dedupeKey}
            padding="space.200"
            xcss={{
              borderWidth: 'border.width',
              borderStyle: 'solid',
              borderColor: 'color.border',
              borderRadius: 'border.radius.200',
            }}
          >
            <Stack space="space.100">
              <Inline space="space.200" alignBlock="center">
                <Lozenge appearance={VERDICT_APPEARANCE[f.severity]}>
                  {f.severity}
                </Lozenge>
                <Text weight="bold">{f.label}</Text>
                <Text color="color.text.subtle">· {f.field}</Text>
              </Inline>
              <Text fontFamily="monospace">{f.redactedEvidence}</Text>
              <Text color="color.text.subtle">{f.replay}</Text>
            </Stack>
          </Box>
        ))}

        {!loading && !error && result && result.findings.length > 0 && (
          <Inline space="space.200">
            <Button appearance="default" onClick={() => runScan(issueKey)}>
              Re-scan issue
            </Button>
          </Inline>
        )}
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
