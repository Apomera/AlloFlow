// Wait-not-stop (2026-07-05, maintainer decision): the host auto-continue loop used to fire full
// rounds of chunk calls INTO an active Canvas rate-limit storm — on the 7/5 run each call failed
// after ~150s AND extended the throttle window, until the 12-minute dead-man switch killed the loop
// (a premature stop dressed as a safety net). Maintainer's requirement: never stop early — WAIT.
// The pipeline now exposes geminiThrottleInfo (storm snapshot) + waitForGeminiCalm (bounded wait:
// sleep out the active cooldown, confirm recovery with ONE tiny probe call, then proceed at full
// strength; on timeout it proceeds anyway — the run only ever gets slower, never stopped).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');

let pipeline;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => 'OK',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (k) => k,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});

describe('pipeline API — LIVE instance', () => {
  it('geminiThrottleInfo + waitForGeminiCalm are exported', () => {
    expect(typeof pipeline.geminiThrottleInfo).toBe('function');
    expect(typeof pipeline.waitForGeminiCalm).toBe('function');
  });
  it('a calm gate reports not-storming and the wait is an exact no-op', async () => {
    const info = pipeline.geminiThrottleInfo();
    expect(info.storming).toBe(false);
    expect(info.cooldownRemainingMs).toBe(0);
    const r = await pipeline.waitForGeminiCalm({ maxWaitMs: 50 });
    expect(r.calm).toBe(true);
    expect(r.waitedMs).toBe(0);
  });
});

describe('pipeline behavior — source pins', () => {
  it('sleeps out ACTIVE cooldowns, probes with ONE tiny call, is bounded, and feeds the idle watchdog', () => {
    expect(dp).toContain('var waitForGeminiCalm = async function (opts) {');
    expect(dp).toContain("await callGemini('Reply with exactly: OK')");                      // the probe
    expect(dp).toContain('await _sleep(Math.min(inf.cooldownRemainingMs + 250, 15000));');   // cooldown sleep
    expect(dp).toContain('{ calm: false, waitedMs: _now() - t0, timedOut: true }');          // bounded → proceeds anyway
    expect(dp).toContain('_pulsePipelineWatchdog(); // waiting IS pipeline activity');
  });
  it('a reduced cap alone is NOT storming — it recovers on successes, so waiting on it would deadlock', () => {
    expect(dp).toContain('storming: cooldownRemainingMs > 0 || _geminiAuthStreak >= _GEMINI_STORM_TRIP || _geminiTransientStreak >= _GEMINI_TRANSIENT_TRIP');
  });
});

describe('deferred final re-audit CIRCLES BACK to throttle-skipped sections until the AI audit completes', () => {
  // Maintainer 2026-07-07: a run whose AI audit did not finish shows NO score (by design). The old
  // deferred re-audit WAITED once (<=45s) and re-audited ONCE, so a sustained storm could leave a
  // section un-read forever. It now LOOPS (wait-for-calm -> re-audit) until FULL AI coverage, a genuine
  // non-throttle failure, or a bounded safety cap. Purely AI re-auditing — no deterministic/scoring change.
  it('loops (not one-shot): re-audits while partial OR score-less, gated on waitForGeminiCalm', () => {
    // M1 (2026-07-09): the loop also covers a NULL/thrown final audit under the same storm — the
    // worst throttle outcome used to ship degraded immediately with the whole wait budget unused.
    expect(dp).toContain('while ((!verification || verification._partialAudit || !_finalAuditHadUsableScore) && Date.now() < _deferHardStop) {');
    // M2 (2026-07-09): the wait AND each re-audit are _withTimeout-clamped to the remaining budget so
    // a probe/re-audit launched just inside the bound can never push a FINISHED remediation past the
    // batch per-file wall (the R5 class). M6: the wait ticks the visible step + aborts on a gen bump.
    expect(dp).toContain('await _withTimeout(waitForGeminiCalm({');
    expect(dp).toContain('maxWaitMs: Math.max(0, _deferHardStop - Date.now()),');
    expect(dp).toContain('shouldAbort: _genStale,');
    expect(dp).toContain('const _reFinalAuditHtml = accessibleHtml;');
    expect(dp).toContain("_reFinalAudit = await _withTimeout(auditOutputAccessibility(_reFinalAuditHtml), Math.max(5000, _deferHardStop - Date.now()), 'deferred re-audit round ' + _roundNow);");
  });
  it('re-runs the AI audit (auditOutputAccessibility), NOT a deterministic substitute', () => {
    // the loop body must call the AI audit and must not swap in axe/EA as the coverage source
    const s = dp.indexOf('Circle-back-until-the-AI-audit-COMPLETES');
    const e = dp.indexOf('Deferred re-audit SKIPPED', s);
    const block = dp.slice(s, e);
    expect(block).toContain('const _reFinalAuditHtml = accessibleHtml;');
    expect(block).toContain('auditOutputAccessibility(_reFinalAuditHtml)');
    expect(block).not.toContain('deterministicScore');
    expect(block).not.toContain('runAxeAudit');
  });
  it('adopts only equal-or-better coverage, and logs real coverage growth', () => {
    expect(dp).toContain('if (_reFinalAudit && (_reFinalAudit.chunksAudited || 0) >= _prevAudited) {');
    expect(dp).toContain("(_reFinalAudit._partialAudit ? ' (still partial — circling back)' : ' (full coverage restored)')");
  });
  it('stop-improving guard: a CALM round with no new section is a genuine failure → break (not an infinite loop)', () => {
    expect(dp).toContain('const _stormNow = _geminiThrottleInfo().storming;');
    // M1 (2026-07-09): null-tolerant — verification can be absent when both the loop verify and the
    // final audit failed at the storm peak (the exact shape the loop now covers).
    expect(dp).toContain('if (((verification && verification.chunksAudited) || 0) <= _prevAudited && !_stormNow) break;');
  });
  it('bounded: a single-file safety cap + the batch per-file wall (never an unbounded hang)', () => {
    expect(dp).toContain('Date.now() + 600000,');
    expect(dp).toContain('_perFileDeadlineTs ? _perFileDeadlineTs - 30000 : Infinity');
  });
  it('the memo makes each re-audit cheap: only FAILED sections are re-called (successful parses memoized)', () => {
    // Strict-schema successes are memoized; thrown/invalid replies return null and retry.
    expect(dp).toMatch(/const p = _requireStrictOutputAudit\(parseAuditJson\(r\)\);[\s\S]{0,500}_auditMemoPut\(_memoKey, p\);/);
    expect(dp).toContain('_outputAuditIssueArrayIsValid(parsed.issues)');
  });
});

describe('host auto-continue wiring (AlloFlowANTI)', () => {
  it('the loop binds the export with an immediate-calm fallback (an older pipeline module changes nothing)', () => {
    expect(anti).toContain("const waitForGeminiCalm = (_docPipeline && _docPipeline.waitForGeminiCalm) ? _docPipeline.waitForGeminiCalm : async () => ({ calm: true, waitedMs: 0 });");
  });
  it('each round awaits calm BEFORE firing its calls, with a ticking status (disarms the dead-man switch)', () => {
    // H3 (2026-07-09): the wait also carries shouldAbort so a Stop press exits it within seconds.
    const waitIdx = anti.indexOf('await waitForGeminiCalm({ maxWaitMs: 240000, shouldAbort:');
    expect(waitIdx).toBeGreaterThan(-1);
    const fireIdx = anti.indexOf("aiFixChunked(cur.accessibleHtml, _instr, 'auto-continue-ai-round-'", waitIdx);
    expect(fireIdx).toBeGreaterThan(waitIdx); // wait precedes the round's calls
    expect(anti).toContain('nothing is skipped, the run just takes longer');
  });
  it('the callback dep array carries waitForGeminiCalm', () => {
    expect(anti).toMatch(/aiFixChunked, waitForGeminiCalm, runAxeAudit/);
  });
});
