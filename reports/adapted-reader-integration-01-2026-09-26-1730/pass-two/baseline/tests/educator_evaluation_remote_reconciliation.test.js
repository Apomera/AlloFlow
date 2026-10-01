import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('educator_evaluation_source.jsx', 'utf8');
const saveFlow = src.slice(src.indexOf('const enqueueRemoteSave'), src.indexOf('const queueRemoteSave'));

describe('remote save reconciliation status', () => {
  it('rejects failures before honoring a secondary-reconciliation flag', () => {
    expect(saveFlow.indexOf('result.ok === false')).toBeGreaterThanOrEqual(0);
    expect(saveFlow.indexOf('result.reconciliationPending')).toBeGreaterThan(saveFlow.indexOf('result.ok === false'));
  });

  it('shows a distinct status after the primary record is saved', () => {
    expect(saveFlow).toMatch(/status: reconciliationPending \? 'reconciliation' : 'saved'/);
    expect(src).toContain('Primary record saved; secondary reconciliation pending');
    expect(src).toContain("['saved', 'reconciliation'].includes(remoteState.status)");
  });
});
