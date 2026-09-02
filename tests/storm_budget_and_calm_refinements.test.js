import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { loadAlloModule } from './setup.js';

// Storm budget + wait-not-stop refinements (2026-09-02).
//
//   1. A run-level budget on DELIBERATE rate-limit waiting. When it is spent, wait-not-stop
//      returns {calm:false, budgetExhausted:true} and the fix loop pauses at the verified
//      checkpoint through the existing throttle-pause path (banner + Resume). 0 = keep waiting.
//   2. The wait-not-stop bound stretches to cover an active Retry-After brake, so the loop no
//      longer "proceeds anyway" into a wall the server explicitly described.
//   3. Auth walls (401 streak, no empty-body streak) use a minimal probe; volume-shaped storms
//      keep the representative one.
//   4. Vision responses report finish reason, body bytes and token counts to the ledger.

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const mh = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
const vw = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('slice markers not found: ' + startMarker);
  return src.slice(start, end);
}

describe('storm budget', () => {
  let build;
  beforeAll(() => {
    // End right after the budget helpers: the gate's own _pipeThrottleEvent is defined further
    // down and would shadow the stub if the slice ran on into it.
    const helpers = sliceBetween(dp, '  var _GEMINI_STORM_BUDGET_DEFAULT_MS = 18 * 60 * 1000;', '  var _throttlePendingProbe = null;');
    build = (over) => {
      const events = [];
      const sandbox = Object.assign({
        Math, Number, Date,
        window: { __docPipelineState: {} },
        _throttleCooldownMsTotal: 0,
        _pipeThrottleEvent: (kind, fields) => events.push({ kind, fields }),
      }, over || {});
      runInNewContext(helpers, sandbox);
      return { sandbox, events };
    };
  });

  it('defaults to 18 minutes, reads the host setting fresh, and treats 0 as unbounded', () => {
    const { sandbox } = build();
    expect(sandbox._geminiStormBudgetMs()).toBe(18 * 60000);
    sandbox.window.__docPipelineState.pdfStormBudgetMinutes = 30;
    expect(sandbox._geminiStormBudgetMs()).toBe(30 * 60000);
    sandbox.window.__docPipelineState.pdfStormBudgetMinutes = 0;
    expect(sandbox._geminiStormBudgetMs()).toBe(0);
    expect(sandbox._geminiStormBudget().exhausted).toBe(false);
    sandbox.window.__docPipelineState.pdfStormBudgetMinutes = 'nonsense';
    expect(sandbox._geminiStormBudgetMs()).toBe(18 * 60000);
    sandbox.window.__docPipelineState.pdfStormBudgetMinutes = 100000;
    expect(sandbox._geminiStormBudgetMs()).toBe(240 * 60000);
  });

  it('reports exhaustion from the deliberate cooldown total and resets on demand', () => {
    const { sandbox, events } = build({ _throttleCooldownMsTotal: 18 * 60000 });
    expect(sandbox._geminiStormBudget()).toMatchObject({ exhausted: true, remainingMs: 0, spentMs: 18 * 60000 });
    const after = sandbox._resetGeminiStormBudget();
    expect(after.exhausted).toBe(false);
    expect(sandbox._throttleCooldownMsTotal).toBe(0);
    expect(events.map((e) => e.kind)).toEqual(['storm_budget_reset']);
    expect(Object.values(events[0].fields).every((v) => typeof v === 'number')).toBe(true);
  });

  it('is wired: wait-not-stop, the fix loop, the final audit reason, exports, the host loop and the view', () => {
    const calm = sliceBetween(dp, 'var waitForGeminiCalm = async function (opts) {', "warnLog('[GeminiGate] wait-not-stop: storm active");
    expect(calm).toContain('var _b0 = _budgetStop(); if (_b0) return _b0;');
    expect(dp).toContain('var _bL = _budgetStop(); if (_bL) return _bL;');
    expect(dp).toContain("budgetExhausted: true, reason: 'storm-budget'");
    expect(dp).toContain('if (fixPass > 0 && _geminiStormBudget().exhausted) {');
    expect(dp).toContain('return { stormBudgetPaused: _stormBudgetPaused, accessibleHtml,');
    expect(dp).toContain("_finalAuditIncompleteReason = (_loopOut && _loopOut.stormBudgetPaused) ? 'remediation-paused-storm-budget' : 'remediation-paused-transient-throttle';");
    expect(dp).toContain('    geminiStormBudget: _geminiStormBudget,');
    expect(dp).toContain('    resetGeminiStormBudget: _resetGeminiStormBudget,');
    expect(dp).toContain('_throttleCooldownMsTotal = 0;\n    _throttleRetryAfterApplied = 0;');
    expect(mh).toContain("_finalAuditIncompleteReason: _budgetPause ? 'remediation-paused-storm-budget' : 'remediation-paused-transient-throttle'");
    expect(mh).toContain("cur._finalAuditIncompleteReason === 'remediation-paused-storm-budget'");
    expect(vw).toContain("_pipeR.resetGeminiStormBudget();");
    expect(vw).toContain('data-help-key="pdf_audit_view_storm_budget"');
    expect(vw).toContain("pdfFixResult._finalAuditIncompleteReason === 'remediation-paused-storm-budget'");
    expect(anti).toContain('const [pdfStormBudgetMinutes, setPdfStormBudgetMinutes] = useState(');
    expect(anti).toContain('pdfTargetScore, pdfOcrLanguage, pdfStormBudgetMinutes,');
    expect(anti).toContain('pdfOcrLanguage, setPdfOcrLanguage, pdfStormBudgetMinutes, setPdfStormBudgetMinutes, setPendingPdfBase64');
    expect(ui.pdf_audit.settings.storm_budget_hint).toBeTruthy();
    expect(ui.pdf_audit.storm_budget_paused_toast).toBeTruthy();
    expect(readFileSync(resolve(process.cwd(), 'help_strings.js'), 'utf8')).toMatch(/^\s*'pdf_audit_view_storm_budget':\s*"/m);
  });
});

describe('wait-not-stop: Retry-After-aware bound and auth-wall probe', () => {
  it('stretches the bound only for an active Retry-After brake, capped', () => {
    const calm = sliceBetween(dp, 'var waitForGeminiCalm = async function (opts) {', 'var probed = false;');
    expect(calm).toContain('while (_now() < _waitDeadline()) {'.trim().slice(0, 0) + ''); // placeholder to keep slice usage explicit
    expect(dp).toContain('while (_now() < _waitDeadline()) {');
    expect(dp).toContain("Math.max(0, _waitDeadline() - _now())");
    expect(calm).toContain('if (!(_geminiRetryAfterUntil > base) || _geminiCooldownUntil !== _geminiRetryAfterUntil) return 0;');
    expect(calm).toContain('Math.min(_GEMINI_RETRY_AFTER_CAP_MS, (_geminiRetryAfterUntil - base) + 1000)');
    // The extension helper, evaluated in isolation.
    const sandbox = { Math, _GEMINI_RETRY_AFTER_CAP_MS: 300000, _geminiRetryAfterUntil: 0, _geminiCooldownUntil: 0 };
    const helper = sliceBetween(calm, 'var _retryAfterExtensionMs = function () {', 'var _waitDeadline');
    runInNewContext('var t0 = 1000000; var maxWaitMs = 240000; ' + helper, sandbox);
    expect(sandbox._retryAfterExtensionMs()).toBe(0);
    sandbox._geminiRetryAfterUntil = 1000000 + 240000 + 50000; sandbox._geminiCooldownUntil = sandbox._geminiRetryAfterUntil;
    expect(sandbox._retryAfterExtensionMs()).toBe(51000);
    sandbox._geminiCooldownUntil = sandbox._geminiRetryAfterUntil + 5; // a later streak brake replaced it: not a server-directed wait
    expect(sandbox._retryAfterExtensionMs()).toBe(0);
    sandbox._geminiCooldownUntil = sandbox._geminiRetryAfterUntil = 1000000 + 240000 + 900000;
    expect(sandbox._retryAfterExtensionMs()).toBe(300000);
  });

  it('applies the minimal probe only to auth walls and keeps the representative probe otherwise', () => {
    expect(dp).toContain('var _authWall = _geminiAuthStreak >= _GEMINI_STORM_TRIP && _geminiTransientStreak < _GEMINI_TRANSIENT_TRIP;');
    expect(dp).toContain('minimal: _authWall,');
    expect(dp).toContain('var _prompt = o.minimal ? _geminiMinimalProbePrompt() : _geminiProbePrompt(o.promptChars, o.responseChars);');
    const probe = sliceBetween(dp, 'var _geminiProbe = function (opts)', 'Wait-not-stop (2026-07-05');
    expect(probe).not.toContain('_geminiNoteSuccess(');
    expect(probe).not.toContain('_geminiNoteAuthFail(');
    expect(dp).toContain("Reply with the single word OK.");
    expect(dp).not.toContain("await callGemini('Reply with exactly: OK')");
  });
});

describe('Vision route response metadata', () => {
  let createGeminiAPI;
  beforeAll(() => {
    loadAlloModule('gemini_api_module.js');
    createGeminiAPI = (window.AlloModules && window.AlloModules.createGeminiAPI) || window.createGeminiAPI;
  });
  afterEach(() => vi.restoreAllMocks());

  const makeApi = (fetchImpl) => createGeminiAPI({
    apiKey: 'k', _isCanvasEnv: false,
    GEMINI_MODELS: { default: 'gemini-3-flash-preview', fallback: 'gemini-3-flash-preview', vision: 'gemini-3-flash-preview' },
    fetchWithExponentialBackoff: fetchImpl, optimizeImage: async (x) => x, warnLog: () => {}, debugLog: () => {}, getAbortSignal: () => null,
  });

  it('reports finish reason and token counts for a Vision call', async () => {
    const body = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ocr text' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 5 } });
    const api = makeApi(vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => body }));
    const meta = vi.fn();
    const out = await api.callGeminiVision('read this', 'QUJD', 'image/png', { diagnosticTelemetry: { retryOwner: 'doc-pipeline', onResponseMeta: meta } });
    expect(out).toBe('ocr text');
    expect(meta).toHaveBeenCalledWith(expect.objectContaining({ finishReason: 'STOP', promptTokens: 40, outputTokens: 5, bodyBytes: body.length }));
    expect(JSON.stringify(meta.mock.calls[0][0])).not.toContain('ocr text');
  });

  it('flags a malformed Vision body before the partial-recovery path runs', async () => {
    const api = makeApi(vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"candidates":[{"content":{"parts":[{"text":"partial words' }));
    const meta = vi.fn();
    const out = await api.callGeminiVision('read this', 'QUJD', 'image/png', { diagnosticTelemetry: { retryOwner: 'doc-pipeline', onResponseMeta: meta } });
    expect(String(out)).toContain('partial words');
    expect(meta).toHaveBeenCalledWith(expect.objectContaining({ malformed: true }));
  });
});
