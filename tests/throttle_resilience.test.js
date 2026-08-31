// Throttle resilience (2026-06-20). The Canvas Gemini proxy throttles under sustained fan-out by
// returning EMPTY 200 bodies + timeouts — not only 401s. The existing circuit breaker only tripped on
// the 401 manifestation, so an empty-body storm flew under its radar and the pipeline kept hammering
// (a 30-min grind). This extends the breaker to also trip on a sustained empty-body/timeout cluster,
// and softens the partial-audit floor so ONE transient failure on a tiny audit doesn't null everything.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Mirror of the transient-storm breaker (streak trips at 3, resets on success) ──
const transientStormTrips = (events) => {
  let streak = 0, tripped = false;
  for (const e of events) {
    if (e === 'ok') streak = 0;
    else { streak++; if (streak >= 3) tripped = true; }
  }
  return tripped;
};
// ── Mirror of the softened partial-audit floor ──
const coverageTooLow = (chunks, failed) => {
  const audited = chunks - failed;
  return chunks > 0 && (failed / chunks) > 0.25 && (failed >= 2 || audited < 2);
};

describe('empty-body/timeout storm trips the breaker (the gap that caused the grind)', () => {
  it('3 consecutive empty-body failures → breaker trips (back off to 1 + cooldown)', () => {
    expect(transientStormTrips(['fail', 'fail', 'fail'])).toBe(true);
  });
  it('a success in the middle resets the streak (an isolated timeout does NOT trip)', () => {
    expect(transientStormTrips(['fail', 'fail', 'ok', 'fail'])).toBe(false);
  });
  it('a sustained storm keeps it tripped', () => {
    expect(transientStormTrips(['fail', 'fail', 'fail', 'fail', 'fail'])).toBe(true);
  });
  it('a healthy run (calls succeed) never trips', () => {
    expect(transientStormTrips(['ok', 'fail', 'ok', 'ok', 'fail', 'ok'])).toBe(false);
  });
});

describe('partial-audit floor — one transient blip on a tiny audit no longer nulls the score', () => {
  it('1 of 3 sections fail (2 audited) → KEPT (the fix; was nulled before)', () => {
    expect(coverageTooLow(3, 1)).toBe(false);
  });
  it('1 of 2 fail (only 1 audited) → still nulled (too thin)', () => {
    expect(coverageTooLow(2, 1)).toBe(true);
  });
  it('3 of 8 fail (>=2 failures, 37%) → nulled', () => {
    expect(coverageTooLow(8, 3)).toBe(true);
  });
  it('a genuinely thin audit (4 of 30 audited = 26 failed) → nulled', () => {
    expect(coverageTooLow(30, 26)).toBe(true);
  });
  it('no failures → kept', () => {
    expect(coverageTooLow(3, 0)).toBe(false);
  });
});

describe('anti-drift: the breaker + floor ship the fixes', () => {
  it('the breaker has a transient-storm handler fed from the generic-transient path', () => {
    expect(pipeSrc).toMatch(/var _geminiNoteTransientFail = function/);
    expect(pipeSrc).toMatch(/_GEMINI_TRANSIENT_TRIP = 3/);
    // The direct transient call before the rethrow became _noteGeminiOutcome,
    // one recorder used by the settle, success, and rethrow paths alike. It
    // dispatches auth vs transient internally, which is what let it absorb the
    // 2026-07-27 field bug where a Canvas 401 read as PERMANENT: the breaker was
    // never fed, the cap stayed at 3, storming stayed false, and a run hammered
    // a throttled proxy for 60+ calls over 5,000s without one [GeminiGate] line.
    // The invariant this test exists for is unchanged and still pinned: the
    // breaker is fed BEFORE the throw, so a rethrown failure still counts.
    expect(pipeSrc).toMatch(/_noteGeminiOutcome\(null, err\);\s*\n\s*if \(n >= 1\) throw err;/);
    expect(pipeSrc).toMatch(/var _noteGeminiOutcome = function \(res, err\) \{/);
    expect(pipeSrc).toMatch(/if \(_canvasAuth\) _geminiNoteAuthFail\(_callStats, owner\);\s*\n\s*else _geminiNoteTransientFail\(_callStats, owner\);/);
    expect(pipeSrc).toMatch(/var _transientBackoff = Math\.round\(2500 \* \(0\.7 \+ Math\.random\(\) \* 0\.6\)\)/);
// F1 (2026-08-14): a repeat-offender check now precedes the transient mark so a
// deterministic signature stops ratcheting the shared breaker.
expect(pipeSrc).toMatch(/if \(res == null \|\| \(typeof res === 'string' && !res\.trim\(\)\)[\s\S]{0,300}_geminiNoteTransientFail\(_callStats, owner\)/);
    // The if/else split; the empty-body-is-a-throttle half moved into
    // _noteGeminiOutcome so every path shares it, leaving a negated guard here.
    // The invariant is the same one: an empty 200 body is NOT a recovered retry.
    expect(pipeSrc).toMatch(/if \(!\(res == null \|\| \(typeof res === 'string' && !res\.trim\(\)\)\)\) \{\s*\n\s*if \(n > 0\) _callStats\.recoveredRetries/);
  });
  it('the transient streak resets on success (so isolated blips do not trip it)', () => {
    expect(pipeSrc).toMatch(/_geminiAuthStreak = 0;\s*\n\s*_geminiTransientStreak = 0;/);
  });
  it('the partial-audit floor requires material failures, not the bare ratio', () => {
    expect(pipeSrc).toMatch(/\(_failedChunks \/ chunks\.length\) > 0\.25 && \(_failedChunks >= 2 \|\| _auditedCount < 2\)/);
  });
});


describe('run-scoped cancellation and post-loop containment', () => {
  it('throws immediately when the main loop returns after losing ownership', () => {
    const loop = pipeSrc.indexOf('const _loopOut = await _runMainFixLoop');
    const guard = pipeSrc.indexOf('_throwIfRunCancelled();', loop);
    expect(loop).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(loop);
    expect(guard - loop).toBeLessThan(900);
  });

  it('threads the immutable signal through final/deferred/post-mutation AI audits', () => {
    expect(pipeSrc).toContain("auditOutputAccessibility(_finalAuditHtml, { signal: _runAbortSignal, trigger: 'primary-final-audit' })");
    expect(pipeSrc).toMatch(/auditOutputAccessibility\(_reFinalAuditHtml, \{ signal: _runAbortSignal, trigger: 'deferred-chunk-circle-back-reaudit/);
    expect(pipeSrc).toMatch(/auditOutputAccessibility\(accessibleHtml, \{ signal: _runAbortSignal, trigger: 'post-mutation-reaudit/);
    expect(pipeSrc).toContain('const _genStale = _runGenStale;');
    expect(pipeSrc).toContain('signal: _runAbortSignal,');
    expect(pipeSrc).toContain('owner: _runTelemetry,');
  });

  it('captures explicit signals at the gate and rechecks nested chunk calls after awaits', () => {
    expect(pipeSrc).toContain('owner, explicitSignal)');
    expect(pipeSrc).toContain('var _gateSignal = explicitSignal ||');
    // The call gained an owner descriptor for the F1 repeat-offender ledger.
    expect(pipeSrc).toContain('callGemini(prompt, false, false, null, null, _control && _control.signal, _callOwnerFor(');
    expect(pipeSrc).toContain('const _retryRaw = await callGemini(retryPrompt');
    expect(pipeSrc).toContain('var _capturedVisionSignal = _explicitSignal');
    expect(pipeSrc).toContain("args[3] = _capturedOptions;");
    expect(pipeSrc).toContain("throw _mkGateAbortErr('local PDF Vision extraction')");
    expect(pipeSrc).toContain('const _throwIfImageCancelled =');
    expect(pipeSrc).toContain('_base64, _mimeType, { signal: _imageSignal }');
    expect(pipeSrc).toContain('signal: _runAbortSignal, shouldAbort: _runGenStale');
    expect(pipeSrc).toContain('if ((imgErr && (imgErr.name === \'AbortError\' || imgErr.isAbort)) || _imageCancelled()) throw imgErr;');
    expect(pipeSrc).toContain('const _halfRaw = await callGemini(halfPrompt');
  });
});

describe('honest empty-response and cancellation telemetry', () => {
  it('logs empty responses as terminal failures, but does not count AbortError as a service failure', () => {
    expect(pipeSrc).toContain("_pipeLog('API-empty'");
    expect(pipeSrc).toContain("_pipeLog('Vision-empty'");
    expect(pipeSrc).toContain("var _abortedCall = !!(err && (err.name === 'AbortError' || err.isAbort));");
    expect(pipeSrc).toContain('if (!_abortedCall) _callStats.terminalFailures');
    expect(pipeSrc).toContain('_geminiSuccessRepresentsFailure(requestProfile)');
    expect(pipeSrc).toMatch(/catch\(function\(err\) \{[\s\S]*?_callStats\.totalApiMs \+= dur;[\s\S]*?API-stop/);
  });
});
