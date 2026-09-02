import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { loadAlloModule } from './setup.js';

// Canvas throttle refinements (2026-09-02), from the holistic remediation review.
//
//   1. Retry-After drives the cooldown (it was parsed and printed, never obeyed).
//   2. The Canvas 401 ladder is deadline-aware, so a rung that cannot finish before
//      the pipeline's outer wall fails as AUTH instead of being killed as a timeout.
//   3. Gate timers and wait-not-stop sleeps run in a Worker while the tab is hidden
//      (or for long waits), so Chrome's hidden-tab timer throttling no longer
//      stretches cooldowns; setTimeout stays in charge everywhere else.
//   4. The call ledger records finish reason, block reason, body bytes and token
//      counts, so the next field log can tell an empty body from a short one.

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const ga = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('slice markers not found: ' + startMarker);
  return src.slice(start, end);
}

describe('Retry-After drives the gate cooldown', () => {
  let build;
  beforeAll(() => {
    const helpers = sliceBetween(dp, '  var _geminiRetryAfterMsFromError = function (err) {', '  var _geminiNoteAuthFail = function(stats, owner) {');
    build = (over) => {
      const events = [];
      const sandbox = Object.assign({
        Math, Number, Date, String,
        _GEMINI_RETRY_AFTER_CAP_MS: 300000,
        _geminiCooldownUntil: 0,
        _geminiLastRetryAfterMs: 0,
        _throttleRetryAfterApplied: 0,
        _throttleCooldownMsTotal: 0,
        _pipeThrottleEvent: (kind, fields) => events.push({ kind, fields }),
        warnLog: () => {},
      }, over || {});
      runInNewContext(helpers, sandbox);
      return { sandbox, events };
    };
  });

  it('extends the cooldown to the server-directed wait and records the decision', () => {
    const { sandbox, events } = build();
    const before = Date.now();
    const applied = sandbox._geminiApplyRetryAfter({ retryAfterSec: 45, httpStatus: 429 }, null);
    expect(applied).toBe(45000);
    expect(sandbox._geminiCooldownUntil).toBeGreaterThanOrEqual(before + 45000);
    expect(sandbox._throttleRetryAfterApplied).toBe(1);
    expect(sandbox._geminiLastRetryAfterMs).toBe(45000);
    expect(sandbox._throttleCooldownMsTotal).toBeGreaterThanOrEqual(44000);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('retry_after');
    expect(events[0].fields).toMatchObject({ retryAfterMs: 45000, httpStatus: 429 });
    expect(Object.values(events[0].fields).every((v) => typeof v === 'number')).toBe(true);
  });

  it('never shortens an active longer brake, caps absurd values, and ignores missing headers', () => {
    const { sandbox, events } = build({ _geminiCooldownUntil: Date.now() + 120000 });
    expect(sandbox._geminiApplyRetryAfter({ retryAfterSec: 10 }, null)).toBe(0);
    expect(events).toHaveLength(0);
    expect(sandbox._geminiApplyRetryAfter({ retryAfterSec: 3600 }, null)).toBe(300000);
    expect(sandbox._geminiCooldownUntil).toBeLessThanOrEqual(Date.now() + 300000 + 5);
    expect(sandbox._geminiApplyRetryAfter({ message: 'API_AUTH_FAILED' }, null)).toBe(0);
    expect(sandbox._geminiApplyRetryAfter(null, null)).toBe(0);
    expect(sandbox._geminiApplyRetryAfter({ retryAfterSec: 'soon' }, null)).toBe(0);
  });

  it('is wired after the permanent-error return and before repeat-offender suppression', () => {
    const start = dp.indexOf('if (_perm) return; // real auth/quota/config: permanent, and never fed the breaker');
    const suppress = dp.indexOf('if (_repeatState && _repeatState.suppressed) return;', start);
    const apply = dp.indexOf('_geminiApplyRetryAfter(err, owner);', start);
    expect(start).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(start);
    expect(apply).toBeLessThan(suppress);
    // A later streak trip must not overwrite a longer Retry-After brake with its shorter formula.
    expect((dp.match(/_geminiCooldownUntil = Math\.max\(_geminiCooldownUntil, \(\(typeof Date !== 'undefined' && Date\.now\) \? Date\.now\(\) : 0\) \+ _cd\);/g) || []).length).toBe(2);
    expect(dp).toContain('lastRetryAfterMs: _geminiLastRetryAfterMs,');
    // Read defensively: vm harnesses (pipeline_throttle_telemetry) sandbox the summary with a fixed var list.
    expect((dp.match(/retryAfterApplied: \(typeof _throttleRetryAfterApplied === 'number'\) \? _throttleRetryAfterApplied : 0,/g) || []).length).toBe(2);
  });
});

describe('hidden-tab-safe timers', () => {
  let build;
  beforeAll(() => {
    const shim = sliceBetween(dp, 'var _alloTimerWorker = null;', 'function _alloWaitForVisibleTab(maxWaitMs, label) {');
    build = (env) => {
      const sandbox = Object.assign({ Math, Number, Date, Object, setTimeout, clearTimeout }, env || {});
      runInNewContext(shim, sandbox);
      return sandbox;
    };
  });

  class FakeWorker {
    constructor(url) {
      FakeWorker.instances.push(this);
      this.url = url;
      this.posted = [];
      this.onmessage = null;
      this.onerror = null;
    }
    postMessage(msg) {
      this.posted.push(msg);
      if (msg && msg.op === 'ping' && FakeWorker.answersPing) {
        const self = this;
        queueMicrotask(() => self.onmessage && self.onmessage({ data: { pong: 1 } }));
      }
    }
    fire(id) { this.onmessage && this.onmessage({ data: { id } }); }
  }
  FakeWorker.instances = [];
  FakeWorker.answersPing = true;
  const browserEnv = (hidden) => ({
    Worker: FakeWorker,
    Blob: class { constructor(parts) { this.parts = parts; } },
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} },
    document: { visibilityState: hidden ? 'hidden' : 'visible' },
  });

  afterEach(() => { FakeWorker.instances.length = 0; FakeWorker.answersPing = true; });

  it('falls back to setTimeout when no Worker is available and still fires', async () => {
    const sb = build({});
    const fn = vi.fn();
    const handle = sb._alloHiddenSafeTimeout(fn, 1);
    expect(handle && handle._alloWorkerTimer).toBeFalsy();
    await new Promise((r) => setTimeout(r, 15));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sb._alloTimerWorkerState).toBe('broken');
  });

  it('uses the Worker only after it answers the ping, and only when hidden or for long waits', async () => {
    const sb = build(browserEnv(false));
    const first = sb._alloHiddenSafeTimeout(() => {}, 5);
    expect(first && first._alloWorkerTimer).toBeFalsy(); // worker still starting → main thread
    await new Promise((r) => setTimeout(r, 0));
    expect(sb._alloTimerWorkerState).toBe('ready');
    const shortVisible = sb._alloHiddenSafeTimeout(() => {}, 5);
    expect(shortVisible && shortVisible._alloWorkerTimer).toBeFalsy();
    const longVisible = sb._alloHiddenSafeTimeout(() => {}, 60000);
    expect(longVisible._alloWorkerTimer).toBeTruthy();
    sb.document.visibilityState = 'hidden';
    const fn = vi.fn();
    const hiddenShort = sb._alloHiddenSafeTimeout(fn, 5);
    expect(hiddenShort._alloWorkerTimer).toBeTruthy();
    const worker = FakeWorker.instances[0];
    const setMsg = worker.posted.find((m) => m.op === 'set' && m.id === hiddenShort._alloWorkerTimer);
    expect(setMsg).toMatchObject({ op: 'set', ms: 5 });
    expect(Object.keys(setMsg)).toEqual(['op', 'id', 'ms']); // ids and milliseconds only
    worker.fire(hiddenShort._alloWorkerTimer);
    expect(fn).toHaveBeenCalledTimes(1);
    sb._alloHiddenSafeClear(longVisible);
    expect(worker.posted.some((m) => m.op === 'clear' && m.id === longVisible._alloWorkerTimer)).toBe(true);
    worker.fire(longVisible._alloWorkerTimer);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-homes pending waits on the main thread if the Worker dies', async () => {
    const sb = build(browserEnv(true));
    sb._alloHiddenSafeTimeout(() => {}, 1);
    await new Promise((r) => setTimeout(r, 0));
    const fn = vi.fn();
    const h = sb._alloHiddenSafeTimeout(fn, 5);
    expect(h._alloWorkerTimer).toBeTruthy();
    FakeWorker.instances[0].onerror(new Error('worker died'));
    expect(sb._alloTimerWorkerState).toBe('broken');
    await new Promise((r) => setTimeout(r, 20));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is what the gate, wait-not-stop and the inline backoff actually use', () => {
    // The gate reaches the shim through a call-time indirection so harnesses that slice the
    // gate block and inject their own setTimeout keep working; only the indirection's own
    // fallback may name setTimeout inside the block.
    const gate = sliceBetween(dp, 'var _GEMINI_QUEUE_PULSE_MS = 30000;', 'var _geminiGate = function(fn, signal, label, owner) {');
    expect((gate.match(/setTimeout\(/g) || []).length).toBe(1);
    expect(gate).toContain("(typeof _alloHiddenSafeTimeout === 'function') ? _alloHiddenSafeTimeout(fn, ms) : setTimeout(fn, ms)");
    expect((gate.match(/_gateTimeout\(/g) || []).length).toBe(6);
    const calm = sliceBetween(dp, 'var waitForGeminiCalm = async function (opts) {', 'var t0 = _now();');
    expect(calm).toContain("timer = (typeof _alloHiddenSafeTimeout === 'function')");
    expect(calm).toContain("if (typeof _alloHiddenSafeClear === 'function') _alloHiddenSafeClear(timer); else clearTimeout(timer);");
    expect(dp).toContain("(typeof _alloHiddenSafeTimeout === 'function') ? _alloHiddenSafeTimeout(r, _backoff) : setTimeout(r, _backoff);");
    expect(dp).toContain("var timer = _alloHiddenSafeTimeout(function () { finish('still-hidden'); }, bound);");
    expect((dp.match(/_gateClearTimer\(_geminiRateTimer\)/g) || []).length).toBe(3);
  });
});

describe('Gemini API adapter: deadline-aware 401 ladder and response metadata', () => {
  let createGeminiAPI;
  const OK_TEXT = JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'hello' }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3 },
    modelVersion: 'gemini-3-flash-preview',
  });
  const throwStatus = (status, label) => { const e = new Error(`Gemini API error: ${status} ${label}`); e.status = status; return e; };
  const okResponse = (body) => ({ ok: true, status: 200, text: async () => (body == null ? OK_TEXT : body) });
  const makeApi = (fetchImpl, extra) => createGeminiAPI(Object.assign({
    apiKey: '',
    _isCanvasEnv: true,
    GEMINI_MODELS: { default: 'gemini-3-flash-preview', fallback: 'gemini-3-flash-preview' },
    fetchWithExponentialBackoff: fetchImpl,
    optimizeImage: async (x) => x,
    warnLog: () => {},
    debugLog: () => {},
    getAbortSignal: () => null,
    canvasAuthBackoffMs: [0, 0],
  }, extra || {}));

  beforeAll(() => {
    loadAlloModule('gemini_api_module.js');
    createGeminiAPI = (window.AlloModules && window.AlloModules.createGeminiAPI) || window.createGeminiAPI;
    if (typeof createGeminiAPI !== 'function') throw new Error('createGeminiAPI failed to register');
  });
  afterEach(() => vi.restoreAllMocks());

  it('climbs the ladder when the deadline leaves room', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(throwStatus(401, 'UNAUTHENTICATED')).mockResolvedValueOnce(okResponse());
    const api = makeApi(fetchImpl);
    const telemetry = { retryOwner: 'doc-pipeline', getDeadlineTs: () => Date.now() + 180000, onAuthLadderCut: vi.fn() };
    await expect(api.callGemini('hi', false, false, null, null, null, false, telemetry)).resolves.toBe('hello');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(telemetry.onAuthLadderCut).not.toHaveBeenCalled();
  });

  it('fails as auth, not timeout, when the next rung cannot finish before the deadline', async () => {
    // Deadline 4s away: the first attempt may start (the transport plan needs >=1s of room), but a
    // second rung (3s backoff + at least 1s + margin) cannot finish before it.
    const fetchImpl = vi.fn().mockRejectedValue(throwStatus(401, 'UNAUTHENTICATED'));
    const api = makeApi(fetchImpl, { canvasAuthBackoffMs: [3000, 3000] });
    const cut = vi.fn();
    const telemetry = { retryOwner: 'doc-pipeline', getDeadlineTs: () => Date.now() + 4000, onAuthLadderCut: cut };
    let caught = null;
    try { await api.callGemini('hi', false, false, null, null, null, false, telemetry); } catch (e) { caught = e; }
    expect(caught).toBeTruthy();
    expect(caught.canvasTransientAuth).toBe(true);
    expect(String(caught.message)).toMatch(/AUTH/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(cut).toHaveBeenCalledTimes(1);
    expect(cut.mock.calls[0][0]).toMatchObject({ attempt: 1 });
  });

  it('keeps the historical three-attempt ladder for callers without a deadline', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(throwStatus(401, 'UNAUTHENTICATED'));
    const api = makeApi(fetchImpl);
    await expect(api.callGemini('hi')).rejects.toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('reports finish reason, token counts and body bytes to the pipeline ledger', async () => {
    const meta = vi.fn();
    const api = makeApi(vi.fn().mockResolvedValue(okResponse()));
    await api.callGemini('hi', false, false, null, null, null, false, { retryOwner: 'doc-pipeline', onResponseMeta: meta });
    expect(meta).toHaveBeenCalledTimes(1);
    expect(meta.mock.calls[0][0]).toMatchObject({ finishReason: 'STOP', promptTokens: 12, outputTokens: 3, candidateCount: 1, bodyBytes: OK_TEXT.length });
    expect(JSON.stringify(meta.mock.calls[0][0])).not.toContain('hello');
  });

  it('reports an empty body, a malformed body, and a block reason before throwing', async () => {
    const empty = vi.fn();
    await expect(makeApi(vi.fn().mockResolvedValue(okResponse('   '))).callGemini('hi', false, false, null, null, null, false, { retryOwner: 'doc-pipeline', onResponseMeta: empty })).rejects.toThrow(/Empty response body/);
    expect(empty).toHaveBeenCalledWith(expect.objectContaining({ bodyBytes: 0, empty: true }));
    const malformed = vi.fn();
    await expect(makeApi(vi.fn().mockResolvedValue(okResponse('{"candidates":[{"content":{"parts":[{"text":"tru'))).callGemini('hi', false, false, null, null, null, false, { retryOwner: 'doc-pipeline', onResponseMeta: malformed })).rejects.toThrow(/invalid JSON/);
    expect(malformed).toHaveBeenCalledWith(expect.objectContaining({ malformed: true }));
    const blocked = vi.fn();
    const blockedBody = JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' }, candidates: [] });
    // A blocked prompt is a refusal: callGemini returns a graceful placeholder rather than
    // rejecting, and the ledger still learns WHY the body carried no candidates.
    await expect(makeApi(vi.fn().mockResolvedValue(okResponse(blockedBody))).callGemini('hi', false, false, null, null, null, false, { retryOwner: 'doc-pipeline', onResponseMeta: blocked })).resolves.toMatch(/safety/i);
    expect(blocked).toHaveBeenCalledWith(expect.objectContaining({ blockReason: 'SAFETY', candidateCount: 0 }));
  });

  it('pipeline ledger stores the metadata and prints it in the HTTP trail', () => {
    expect((dp.match(/onResponseMeta: function \(info\) \{/g) || []).length).toBe(2);
    expect(dp).toContain("if (ledger.finishReason && ledger.finishReason !== 'STOP') bits.push('finish ' + ledger.finishReason);");
    expect(dp).toContain("bits.push('body ' + ledger.bodyBytes + 'B');");
  });
});
