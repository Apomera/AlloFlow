// 2026-07-24 — wait-not-stop recovery probe: representative + breaker-neutral.
//
// Field regression (App-E, 8-page scanned PDF): under a sustained Canvas "empty-body" throttle the
// run ground for ~84 min and shipped a degraded/partial result instead of completing. Root cause:
// the old recovery probe was a 4-byte `callGemini('Reply with exactly: OK')`. Under a VOLUME-based
// throttle that trivial call always succeeded even mid-storm AND — via _geminiNoteSuccess — zeroed
// the live storm streak, flipping `storming` false and reopening the breaker straight back into the
// throttle. That false "storm has passed" resumed a full document-sized round every ~25s, which kept
// the rate-limit window from ever recovering (the very firing-into-the-storm wait-not-stop exists to
// prevent). These are anti-drift pins on the three load-bearing properties of the fix.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('recovery probe is REPRESENTATIVE (tests the throttled volume dimension)', () => {
  it('carries a document-sized, content-free (FERPA) payload — not a 4-byte call', () => {
    expect(dp).toContain('var _geminiProbe = function (opts)');
    // Document-SIZED: 24–64KB filler, representative of the largest real audit/fix prompts.
    expect(dp).toContain('Math.max(24000, Math.min(64000, Number(promptChars) || 0))');
    expect(dp).toContain('while (_buf.length < _targetChars)');
    // Content-free: framed as ignorable filler, never document text.
    expect(dp).toContain('FILLER (ignore)');
  });
  it('the old always-succeeds 4-byte probe is gone', () => {
    // Only the explanatory comment may mention the retired string; no live call may issue it.
    expect(dp).not.toContain("await callGemini('Reply with exactly: OK')");
  });
});

describe('recovery probe is BREAKER-NEUTRAL (a probe result cannot move the real streak)', () => {
  it('runs through the gate directly, bypassing callGemini\'s note-success/fail accounting', () => {
    // Goes through _geminiGate (respects cap + cooldown) with the run signal, labelled gemini-probe.
    expect(dp).toContain("}, _sig, 'gemini-probe')");
    // The probe body must NOT feed the breaker — assert the two accounting calls are absent between
    // the probe helper's start and the wait-not-stop comment that follows it.
    const start = dp.indexOf('var _geminiProbe = function (opts)');
    const end = dp.indexOf('Wait-not-stop (2026-07-05', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const probeBody = dp.slice(start, end);
    expect(probeBody).not.toContain('_geminiNoteSuccess');
    expect(probeBody).not.toContain('_geminiNoteTransientFail');
  });
});

describe('recovery requires SUSTAINED probe success before resuming', () => {
  it('needs _GEMINI_PROBE_RECOVER consecutive representative probe successes', () => {
    expect(dp).toContain('var _GEMINI_PROBE_RECOVER = 2;');
    expect(dp).toContain('_probeOkStreak >= _GEMINI_PROBE_RECOVER');
    // A failed probe resets the counter and re-arms the escalating cooldown (no hammering).
    expect(dp).toContain('_probeOkStreak = 0;');
  });
});

describe('the inline transient retry is SUPPRESSED during an active storm', () => {
  it('defers to wait-not-stop instead of burning a second full timeout into the throttle', () => {
    expect(dp).toContain('err.geminiStormDeferred = true');
    expect(dp).toContain('if (e.geminiStormDeferred) return true;');
    expect(dp).toContain('if (_deferredIdx.length) {');
    expect(dp).toContain('single-chunk throttle deferred');
    expect(dp).toContain('continuing without counting a semantic plateau');
    expect(dp).toContain('let _throttleRecoveryRetriesRemaining = 2;');
    expect(dp).toContain('fixPass--;');
    expect(dp).toContain('shouldAbort: _shouldAbort, signal: _controlSignal, owner: _controlOwner');
    expect(dp).toContain('if ((_verifyCalm && _verifyCalm.aborted) || _shouldAbort()) break;');
    const exhausted = dp.indexOf('if (_throttleRecoveryRetriesRemaining <= 0)');
    const calmWait = dp.indexOf('waitForGeminiCalm({ maxWaitMs: 120000', exhausted);
    expect(exhausted).toBeGreaterThan(-1);
    expect(calmWait).toBeGreaterThan(exhausted);

  });
});
describe('probe failure pacing, cancellation, and route fidelity', () => {
  it('rearms a dedicated cooldown without feeding synthetic failures to the breaker', () => {
    expect(dp).toContain('_rearmGeminiProbeCooldown(_probeFailStreak)');
    const start = dp.indexOf('if (!_probeOk) {');
    const end = dp.indexOf('_probeOkStreak++;', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(dp.slice(start, end)).not.toContain('_geminiNoteTransientFail');
  });

  it('does not let a text probe certify Vision or slow local routes', () => {
    expect(dp).toContain("_geminiLastFailureProfile.kind === 'vision'");
    expect(dp).toContain('_usesLocalTextBackend() || _probeRouteMismatch');
  });

  it('propagates cancellation without turning it into a failed probe', () => {
    expect(dp).toContain("throw _mkGateAbortErr('gemini-probe')");
    expect(dp).toContain('_rawCallGemini(_prompt, false, false, null, null, _sig)');
    expect(dp).toContain("if (_sig && _sig.aborted) throw _mkGateAbortErr('gemini-probe')");
    expect(dp).toContain('return { calm: false, waitedMs: _now() - t0, aborted: true }');
  });

  it('keeps failed probe cooldown rearming inside the gate hold', () => {
    expect(dp).toContain('_outcome.then(function () {}, function () {})');
    expect(dp).toContain('var _slotUntil = Promise.all([');
  });
});
