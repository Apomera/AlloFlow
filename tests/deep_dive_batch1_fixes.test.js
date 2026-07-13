// Deep dive 2026-07-09, batch 1 (H1/H2/H3) — goldens + anti-drift pins.
//
// H2 — quota/429 errors used to BYPASS the entire throttle machinery: gemini_api's _throwClassified
//      rewrites every quota-class error to the 'API_QUOTA_EXHAUSTED' sentinel, which none of
//      _isThrottleErr's regex patterns could match — so a per-minute 429 burst got zero retries,
//      never tripped the breaker, was never deferred-and-revisited, and never triggered the
//      circle-back re-audit. Now: per-minute/ambiguous quota = throttle; explicit per-day = permanent.
// H3 — a Stop press (or watchdog invalidation) during the auto-continue storm wait (up to 240s) went
//      unnoticed until AFTER the next full round had fired into the storm. Now: waitForGeminiCalm
//      accepts shouldAbort (exits the wait within seconds) and the host re-checks abort/gen between
//      the wait and the round.
// H1 — the per-leaf positioned draw pushed one BDC/EMC pair per run BEFORE knowing whether any word
//      would draw; when every word folded empty (non-Latin scan whose Unicode font failed to load)
//      the block fallback re-emitted the SAME MCIDs → two marked-content sequences claiming one MCID
//      (ISO 32000 §14.7.4). Now drawability is decided before any operator is committed; folded-away
//      chars are tallied (the non-Latin coverage warning was dead on this default path); an
//      artifact-only per-leaf page strips its unbacked leaf MCRs; the bare-text safety net no longer
//      fires on per-leaf pages.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const gem = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// ── eval-slice helpers (same technique as axe_selector_targeting) ──
const sliceFns = () => {
  const start = dp.indexOf('var _isBurstQuotaErr = function (e) {');
  const end = dp.indexOf('// Per-attempt gated call with breaker-aware retry.', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const src = dp.slice(start, end);
  return new Function(src + '\nreturn { _isBurstQuotaErr, _isThrottleErr };')();
};

const sliceWait = (stubs) => {
  const start = dp.indexOf('var waitForGeminiCalm = async function (opts) {');
  const end = dp.indexOf('// Pulse the dead-man watchdog', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const src = dp.slice(start, end);
  const make = new Function('_geminiThrottleInfo', '_pulsePipelineWatchdog', 'warnLog', 'callGemini',
    src + '\nreturn waitForGeminiCalm;');
  return make(stubs.info, stubs.pulse || (() => {}), stubs.warn || (() => {}), stubs.callGemini);
};

describe('H2 — quota-classed errors feed the throttle machinery', () => {
  const { _isBurstQuotaErr, _isThrottleErr } = sliceFns();

  it('per-minute quota IS a throttle (deferrable/retryable)', () => {
    const e = Object.assign(new Error('API_QUOTA_EXHAUSTED'), {
      isQuota: true, classification: { kind: 'quota', perMinute: true, perDay: false },
      originalMessage: 'HTTP 429: rate limit: 15 requests per minute',
    });
    expect(_isBurstQuotaErr(e)).toBe(true);
    expect(_isThrottleErr(e)).toBe(true);
  });
  it('AMBIGUOUS quota leans throttle (the classifier itself says "try again in a minute first")', () => {
    const e = Object.assign(new Error('API_QUOTA_EXHAUSTED'), { isQuota: true, classification: { kind: 'quota', perMinute: false, perDay: false } });
    expect(_isThrottleErr(e)).toBe(true);
    const eNoCls = Object.assign(new Error('API_QUOTA_EXHAUSTED'), { isQuota: true });
    expect(_isThrottleErr(eNoCls)).toBe(true);
  });
  it('explicit per-DAY quota is NOT a throttle — even when its originalMessage contains "429"', () => {
    const e = Object.assign(new Error('API_QUOTA_EXHAUSTED'), {
      isQuota: true, classification: { kind: 'quota', perMinute: false, perDay: true },
      originalMessage: 'HTTP 429: daily limit reached (rpd)',
    });
    expect(_isBurstQuotaErr(e)).toBe(false);
    expect(_isThrottleErr(e)).toBe(false);
  });
  it('non-quota errors: originalMessage evidence now counts (the sentinel rewrite hid the raw 429 text)', () => {
    const e = Object.assign(new Error('Upstream call failed'), { originalMessage: 'HTTP 429: slow down' });
    expect(_isThrottleErr(e)).toBe(true);
  });
  it('pre-existing behavior preserved: timeouts/empty-body are throttles, content errors are not', () => {
    expect(_isThrottleErr(new Error('Timeout after 90s'))).toBe(true);
    expect(_isThrottleErr(new Error('Empty response body'))).toBe(true);
    expect(_isThrottleErr(Object.assign(new Error('x'), { canvasTransientAuth: true }))).toBe(true);
    expect(_isThrottleErr(new Error('RECITATION'))).toBe(false);
    expect(_isThrottleErr(null)).toBe(false);
  });

  it('_geminiCall routes a burst quota into the breaker+backoff path (never bare-permanent)', () => {
    expect(dp).toContain('var _burstQuota = isPermanent && _isBurstQuotaErr(err);');
    expect(dp).toContain('if (_burstQuota) { isPermanent = false; _canvasAuthRetry = true; }');
    // the throttle log names the real cause instead of claiming "Canvas throttle" for a 429
    expect(dp).toContain("var _throttleKind = _burstQuota ? 'Rate-limit (429/quota burst)' : 'Canvas throttle';");
  });
  it('gemini_api classifier carries the per-minute/per-day evidence on the classification object', () => {
    expect(gem).toContain('perMinute: perMinHint, perDay: perDayHint');
    expect(gem).toContain('perMinute: false, perDay: false'); // the ambiguous 403-quota branch
    expect(gem).toContain('out.classification = cls;');       // _throwClassified forwards it
  });
});

describe('H3 — Stop/staleness honored during the storm wait', () => {
  it('waitForGeminiCalm exits within one step when shouldAbort turns true (was: held to maxWaitMs)', async () => {
    const wait = sliceWait({
      info: () => ({ cooldownRemainingMs: 10000, authStreak: 3, transientStreak: 0, capped: true, storming: true }),
      callGemini: async () => { throw new Error('must not probe once aborted'); },
    });
    const t0 = Date.now();
    const r = await wait({ maxWaitMs: 240000, shouldAbort: () => true });
    expect(r.aborted).toBe(true);
    expect(r.calm).toBe(false);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
  it('a throwing shouldAbort is treated as not-aborted (fail-safe: the wait continues)', async () => {
    let calls = 0;
    const wait = sliceWait({
      info: () => (++calls === 1
        ? { cooldownRemainingMs: 10, authStreak: 3, transientStreak: 0, capped: true, storming: true }
        : { cooldownRemainingMs: 0, authStreak: 0, transientStreak: 0, capped: false, storming: false }),
      callGemini: async () => 'OK',
    });
    const r = await wait({ maxWaitMs: 5000, shouldAbort: () => { throw new Error('boom'); } });
    expect(r.calm).toBe(true);
  });
  it('no shouldAbort → behavior unchanged (calm gate is an exact no-op)', async () => {
    const wait = sliceWait({ info: () => ({ cooldownRemainingMs: 0, authStreak: 0, transientStreak: 0, capped: false, storming: false }) });
    const r = await wait({ maxWaitMs: 50 });
    expect(r.calm).toBe(true);
    expect(r.waitedMs).toBe(0);
  });
  it('ANTI auto-continue passes shouldAbort AND re-checks abort/gen between the wait and the round', () => {
    expect(anti).toContain('shouldAbort: () => pdfAutoContinueAbortRef.current || _genStale()');
    // the post-wait re-check (distinct from the loop-top check: anchored to its own comment)
    expect(anti).toContain('// Re-check before firing; shouldAbort above also exits the wait itself within seconds.');
    const at = anti.indexOf('// Re-check before firing; shouldAbort above also exits the wait itself within seconds.');
    const after = anti.slice(at, at + 500);
    expect(after).toMatch(/if \(pdfAutoContinueAbortRef\.current \|\| _genStale\(\)\s*\n\s*\|\| pdfHtmlRevisionRef\.current !== _roundHtmlRevision\) \{/);
    expect(after).toContain('cur = pdfFixResultRef.current;');
    expect(after).toContain('break;');
  });
});

describe('H1 — per-leaf positioned draw: drawability decided BEFORE any BDC is committed', () => {
  it('pre-folds words and gates emission on _anyDrawable (no empty emit → no fallback re-emit)', () => {
    expect(dp).toContain('const _anyDrawable = _grps.some((g) => g.words.some((w) => w.txt.trim()));');
    expect(dp).toContain('if (_anyDrawable) {');
  });
  it('_posDrew flips true BEFORE the emit loop, so a mid-emission throw can never trigger a re-emit', () => {
    const anchor = dp.indexOf('// BDC/EMC are committed from here on');
    expect(anchor).toBeGreaterThan(-1);
    const seg = dp.slice(anchor, anchor + 500);
    const setIdx = seg.indexOf('_posDrew = true;');
    const pushIdx = seg.indexOf('page.pushOperators(_grp.bdc);');
    expect(setIdx).toBeGreaterThan(-1);
    expect(pushIdx).toBeGreaterThan(setIdx);
    // the outer catch no longer resets _posDrew (the old reset is what re-emitted the MCIDs)
    expect(dp).not.toContain('catch (_posErr) { _posDrew = false;');
  });
  it('folded-away chars are tallied on BOTH per-leaf branches (the coverage warning was dead here)', () => {
    expect(dp).toContain('if (_fold) for (const _g of _grps) for (const _w of _g.words) _foldDrops += _countNonWinAnsi(_w.call.text);');
    expect(dp).toContain("if (_fold) for (const _r of _runs) _ocrDroppedChars += _countNonWinAnsi(_r.text || '');");
  });
  it('the per-word Helvetica rescue keeps rotation and tallies the fold', () => {
    expect(dp).toContain('if (_c.angle && _PLx.degrees) _fbOpts.rotate = _PLx.degrees(_c.angle);');
    expect(dp).toContain('if (!_fold) _ocrDroppedChars += _countNonWinAnsi(_c.text);');
  });
  it('the bare-text safety net is SKIPPED on per-leaf pages (bare drawText there = §7.1 untagged content)', () => {
    expect(dp).toContain('if (!_pageDrewAny && !_blockTried && !(_perLeafExp && _perLeafPlan && _perLeafPlan.has(pi)))');
  });
  it('an artifact-only per-leaf page strips its unbacked leaf MCRs (dangling MCR = hard veraPDF/PAC failure)', () => {
    expect(dp).toContain('if (_perLeafExp && _perLeafPlan && _perLeafPlan.has(pi) && _pageArtifactOnly) {');
    expect(dp).toContain("_leaf.delete(PDFName.of('K'))");
    expect(dp).toContain('unbacked leaf MCR');
  });
});
