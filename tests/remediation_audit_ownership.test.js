import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const start = source.indexOf('  let _activePdfAuditRun = null;');
const end = source.indexOf('    const _run = _makeRunCtx();', start);
if (start < 0 || end < start) throw new Error('Audit lifecycle source markers missing');
const lifecycle = source.slice(start, end) + `
    return {
      signal: _auditSignal,
      enableWait: () => { _auditOwner.waitEnabled = true; },
      publish: _publishAuditUi,
      finish: _finishAuditUi,
      cancelled: _auditCancelled,
    };
  };
  return { run: runPdfAccessibilityAudit, wait: getPdfAuditWait, stop: stopPdfAccessibilityAudit };
`;
function harness() {
  const host = { pdfDocumentEpoch: 1 };
  const loading = [];
  const fakeWindow = { __alloAuditStage: null, dispatchEvent() {} };
  const make = new Function('_s', '_geminiSyncWait', '_geminiStormBudget', '_pipelineStats', '_alloCarriedAuditPayload', 'AbortController', 'setPdfAuditLoading', 'window', 'addToast', lifecycle);
  const api = make(() => host, () => ({ reason: 'pacing', remainingMs: 12000 }), () => ({ spentMs: 1000, exhausted: false }), {}, null, AbortController, value => loading.push(value), fakeWindow, () => {});
  return { api, host, loading, fakeWindow };
}

describe('opening audit wait ownership and cancellation', () => {
  it('scopes wait feedback and stop to the active document epoch', async () => {
    const h = harness();
    const audit = await h.api.run('fixture');
    expect(h.api.wait(1)).toBeNull();
    audit.enableWait();
    expect(h.api.wait(1)).toMatchObject({ reason: 'pacing', remainingMs: 12000, budget: { spentMs: 1000 } });
    expect(h.api.wait(2)).toBeNull();
    expect(h.api.stop(2)).toBe(false);
    expect(audit.signal.aborted).toBe(false);
    expect(h.api.stop(1)).toBe(true);
    expect(audit.signal.aborted).toBe(true);
    expect(audit.cancelled()).toBe(true);
    expect(h.api.wait(1)).toBeNull();
    expect(h.api.stop(1)).toBe(false);
    expect(h.loading).toEqual([false]);
  });

  it('supersedes a previous UI audit on a host without run-token helpers', async () => {
    const h = harness();
    const first = await h.api.run('first');
    first.enableWait();
    h.host.pdfDocumentEpoch = 2;
    const second = await h.api.run('second');
    second.enableWait();
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    const rendered = [];
    expect(first.publish(() => rendered.push('old'))).toBe(false);
    expect(second.publish(() => rendered.push('new'))).toBe(true);
    expect(rendered).toEqual(['new']);
    const previousLoadingCount = h.loading.length;
    first.finish();
    expect(h.loading).toHaveLength(previousLoadingCount);
    expect(h.api.wait(1)).toBeNull();
    expect(h.api.wait(2)).toMatchObject({ reason: 'pacing' });
    expect(h.api.stop(1)).toBe(false);
    expect(second.signal.aborted).toBe(false);
    expect(h.api.stop(2)).toBe(true);
  });

  it('cleans up a completed audit without marking its normal returned result cancelled', async () => {
    const h = harness();
    const parent = new AbortController();
    const audit = await h.api.run('fixture', { signal: parent.signal });
    audit.enableWait();
    audit.finish();
    expect(audit.cancelled()).toBe(false);
    expect(h.api.wait(1)).toBeNull();
    expect(h.api.stop(1)).toBe(false);
    parent.abort();
    expect(audit.signal.aborted).toBe(false);
    expect(h.loading).toEqual([false]);
  });

  it('propagates both an already-cancelled parent and a later parent cancellation', async () => {
    const h = harness();
    const cancelled = new AbortController();
    cancelled.abort();
    const early = await h.api.run('early', { signal: cancelled.signal });
    expect(early.signal.aborted).toBe(true);
    expect(h.api.wait(1)).toBeNull();
    const live = new AbortController();
    const later = await h.api.run('later', { signal: live.signal });
    live.abort();
    expect(later.cancelled()).toBe(true);
    expect(h.api.stop(1)).toBe(false);
  });

  it('keeps a background batch audit outside the UI audit ownership slot', async () => {
    const h = harness();
    const visible = await h.api.run('visible');
    visible.enableWait();
    const background = await h.api.run('batch', { skipUiUpdates: true });
    expect(visible.signal.aborted).toBe(false);
    expect(h.api.wait(1)).toMatchObject({ reason: 'pacing' });
    expect(h.api.stop(1)).toBe(true);
    expect(visible.signal.aborted).toBe(true);
    expect(background.signal.aborted).toBe(false);
    background.finish();
  });
});
