// @vitest-environment jsdom
// Canvas "proxy hold" signature (field log 2026-09-13). In a Canvas throttle the proxy holds each
// request about a minute and then answers 401. The ladder's 12 to 108 s cooldowns then bought a
// minute-long refusal per attempt: twelve full-size failures (21 KB each) for two successes in a
// 25-minute storm, and the audit ended degraded. Once three consecutive auth failures each took
// 45 s or more, the gate waits at least two minutes and sends a 1 KB probe before the next real
// request. Instant failures keep the existing ladder, so the older breaker tests stay as they are.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

const PROBE = 'Connectivity check for a rate-limited account. Reply with the single word OK.';
const HTML = '<main><h1>x</h1><p>y</p></main>';
function makePipeline(callGemini) {
  const noop = () => {};
  return window.AlloModules.createDocPipeline({
    callGemini, callGeminiVision: callGemini, callImagen: async () => null,
    addToast: noop, t: (k) => k, isRtlLang: () => false,
    updateExportPreview: noop, getDefaultTitle: () => 'D', state: {},
  });
}
function canvasThrottleError() {
  const e = new Error('API_AUTH_FAILED');
  e.canvasTransientAuth = true;
  return e;
}
let clock;
beforeEach(() => {
  loadAlloModule('doc_pipeline_module.js');
  clock = 1_800_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('Canvas proxy-hold signature', () => {
  it('three held auth failures arm a long wait and a probe-first gate; the probe then clears it', async () => {
    let mode = 'held';
    const prompts = [];
    const p = makePipeline(async (prompt) => {
      prompts.push(String(prompt));
      if (mode === 'held') { clock += 60000; throw canvasThrottleError(); }
      return String(prompt) === PROBE ? 'OK' : JSON.stringify({ score: 100, issues: [], passes: [] });
    });
    for (let i = 0; i < 3; i++) {
      await p.auditOutputAccessibility(HTML, { owner: { runId: 'hold', operation: 'audit', chunkId: String(i), passNumber: 1 } }).catch(() => {});
      clock += 400000; // past whatever cooldown the trip installed
    }
    const armed = p.geminiThrottleInfo();
    expect(armed.holdStreak, 'each held failure (60 s before the 401) must count toward the signature').toBeGreaterThanOrEqual(3);
    expect(armed.holdGateArmed).toBe(true);
    const trace = p.getDiagnosticSnapshot().throttle.trace;
    const hold = trace.filter((event) => event.kind === 'hold_signature');
    expect(hold.length, 'the hold decision must be visible in the diagnostic bundle').toBeGreaterThan(0);
    expect(hold[hold.length - 1].cooldownMs, 'the cooldown floor is two minutes, not the 12 to 25 s ladder').toBeGreaterThanOrEqual(120000);
    expect(hold[hold.length - 1].cooldownMs).toBeLessThanOrEqual(180000);

    mode = 'ok';
    prompts.length = 0;
    await p.auditOutputAccessibility(HTML, { owner: { runId: 'hold', operation: 'audit', chunkId: 'after', passNumber: 1 } }).catch(() => {});
    expect(prompts[0], 'the first request after the wait is the 1 KB probe').toBe(PROBE);
    expect(prompts.length, 'the real request follows in the same slot once the probe answered').toBe(2);
    expect(prompts[1].length).toBeGreaterThan(PROBE.length);
    const cleared = p.geminiThrottleInfo();
    expect(cleared.holdGateArmed).toBe(false);
    expect(cleared.holdStreak).toBe(0);
    expect(cleared.authStreak).toBe(0);
  }, 60000);

  it('a refused probe fails the call like the full request would, without sending the full request', async () => {
    let mode = 'held';
    const prompts = [];
    const p = makePipeline(async (prompt) => {
      prompts.push(String(prompt));
      if (mode === 'held') { clock += 60000; throw canvasThrottleError(); }
      if (String(prompt) === PROBE) { clock += 60000; throw canvasThrottleError(); }
      return JSON.stringify({ score: 100, issues: [], passes: [] });
    });
    for (let i = 0; i < 3; i++) {
      await p.auditOutputAccessibility(HTML, { owner: { runId: 'hold2', operation: 'audit', chunkId: String(i), passNumber: 1 } }).catch(() => {});
      clock += 400000;
    }
    expect(p.geminiThrottleInfo().holdGateArmed).toBe(true);
    mode = 'probe-refused';
    prompts.length = 0;
    await p.auditOutputAccessibility(HTML, { owner: { runId: 'hold2', operation: 'audit', chunkId: 'p', passNumber: 1 } }).catch(() => {});
    expect(prompts.every((text) => text === PROBE), 'only probes went out; the 21 KB request was never uploaded').toBe(true);
    expect(p.geminiThrottleInfo().holdGateArmed).toBe(true);
    expect(p.geminiThrottleInfo().holdStreak).toBeGreaterThanOrEqual(4);
  }, 60000);

  it('instant failures never arm the hold gate (the older ladder and breaker behaviour stand)', async () => {
    const prompts = [];
    const p = makePipeline(async (prompt) => { prompts.push(String(prompt)); throw canvasThrottleError(); });
    for (let i = 0; i < 4; i++) {
      await p.auditOutputAccessibility(HTML, { owner: { runId: 'fast', operation: 'audit', chunkId: String(i), passNumber: 1 } }).catch(() => {});
      clock += 400000;
    }
    const state = p.geminiThrottleInfo();
    expect(state.authStreak).toBeGreaterThan(0);
    expect(state.holdStreak).toBe(0);
    expect(state.holdGateArmed).toBe(false);
    expect(prompts.some((text) => text === PROBE)).toBe(false);
  }, 60000);
});
