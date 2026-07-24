// Throttle-resilience for the FINAL output audit under a sustained Canvas rate-limit storm
// (2026-07-03). Three storm-GATED changes in doc_pipeline_source.jsx, each an exact no-op in the
// common (non-throttled) case:
//   B — cooldown-aware deferred final re-audit: when the final audit is PARTIAL and a throttle signal
//       is present, wait (bounded 45s) for _geminiCooldownUntil to clear, then re-audit ONCE; the
//       temp-0 chunk memo makes it ~1 real call. Adopt only if coverage increased.
//   D — honest reframe: a residual throttled partial's summary is rewritten to say the automated
//       engines covered the whole doc and only the AI re-check was throttled. Messaging only; score
//       untouched.
//   minimal-A — storm-aware loop early-stop: under an active storm with axe==0 and a partial re-audit,
//       stop grinding (further passes mostly fail and DEEPEN the storm — the cause of the lost section).
// This file pins the control flow (source-pins) + mirrors the pure decisions.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('source-pins: B — cooldown-aware deferred final re-audit', () => {
  // Slice the B block so the pins are scoped (the block is right after the final-audit try/catch).
  const bIdx = dp.indexOf('cooldown-aware deferred final re-audit');
  const bBlock = dp.slice(bIdx, bIdx + 14000); // widened: the circle-back loop + M1/M2/M6 grew the block
  it('gates on a PARTIAL final audit OR an absent-under-throttle one, with a throttle signal (confirmed GeminiGate vars)', () => {
    expect(bIdx).toBeGreaterThan(-1);
    expect(bBlock).toContain('verification._partialAudit');
    expect(bBlock).toContain('_finalAuditThrottled && !_finalAuditHadUsableScore'); // M1: null/thrown audits circle back too
    expect(bBlock).toContain('_geminiCooldownUntil > Date.now()');
    expect(bBlock).toContain('_geminiCap < _geminiEffectiveMax'); // R7: cap suppressed below the run ceiling = storm
    expect(bBlock).not.toContain('authThrottles'); // the non-existent field the design first suggested
  });
  it('bounded LOOP (superseded the one-shot ≤45s wait, 2026-07-07 + M1/M2 2026-07-09): circles back until coverage completes, clamped to the budget', () => {
    // The one-shot design (Date.now() + 45000, re-audit ONCE) was replaced by the maintainer-asked
    // circle-back loop: wait-for-calm → re-audit, repeating until FULL AI coverage, a genuine
    // failure, or the bounded cap (~10 min single-file / the batch per-file wall − 30s).
    expect(bBlock).toContain('Date.now() + 600000,');
    expect(bBlock).toContain('_perFileDeadlineTs ? _perFileDeadlineTs - 30000 : Infinity');
    expect(bBlock).toContain('await _withTimeout(waitForGeminiCalm({'); // M2: budget-clamped wait (pulses the watchdog internally)
    // Capture the exact bytes before the await so the adopted audit cannot silently
    // attest to a different HTML revision.
    expect(bBlock).toContain('const _reFinalAuditHtml = accessibleHtml;');
    expect(bBlock).toContain('_reFinalAudit = await _withTimeout(auditOutputAccessibility(_reFinalAuditHtml)');
    // fail-soft: keep the best result on any error (incl. a budget timeout)
    expect(bBlock).toMatch(/catch\s*\(_reErr\)/);
  });
  it('adopts only equal-or-better coverage and stops when a CALM round recovers nothing new', () => {
    expect(bBlock).toContain('if (_reFinalAudit && (_reFinalAudit.chunksAudited || 0) >= _prevAudited) {');
    expect(bBlock).toContain('const _stormNow = _geminiThrottleInfo().storming;');
  });
});

describe('source-pins: D — honest reframe of a residual throttled partial', () => {
  const dIdx = dp.indexOf('honest reframe of a residual throttled partial');
  const dBlock = dp.slice(dIdx, dIdx + 2050); // contains all of D; stops before the next branch's finalAfterScore=
  it('sets _aiReCheckThrottled from the throttle flag and rewrites the summary honestly (R3)', () => {
    expect(dIdx).toBeGreaterThan(-1);
    expect(dBlock).toContain('verification._aiReCheckThrottled = _finalAuditThrottled');
    expect(dBlock).toContain('The AI semantic re-check reached');
    expect(dBlock).toContain("eaScoreAvailable ? 'IBM Equal Access' : null"); // R3: EA named only if it actually ran
    expect(dBlock).toContain('const _reason = _finalAuditThrottled'); // R3: rate-limit attribution gated on the flag
  });
  it('is MESSAGING ONLY — never nulls or re-weights the score', () => {
    // D lives inside the governing (min-blend) branch; it must not touch finalAfterScore / score.
    expect(dBlock).not.toMatch(/finalAfterScore\s*=/);
    expect(dBlock).not.toMatch(/\.score\s*=\s*null/);
    expect(dBlock).not.toMatch(/verification\.score\s*=/);
  });
});

describe('source-pins: minimal-A — storm-aware loop early-stop', () => {
  const aIdx = dp.indexOf('minimal-A (throttle resilience 2026-07-03): storm-aware early stop');
  const aBlock = dp.slice(aIdx, aIdx + 1400);
  it('breaks only under storm AND axe==0 AND partial re-audit', () => {
    expect(aIdx).toBeGreaterThan(-1);
    expect(aBlock).toContain('_geminiCap < _geminiEffectiveMax'); // R7: cap suppressed below the run ceiling = storm
    expect(aBlock).toMatch(/if \(_stormActive && newAxeViolations === 0 && _rePartial\)/);
    expect(aBlock).toContain('Canvas rate-limit storm active + axe clean + AI audit partial');
  });
  it('lives after the target-score stop gate (ships the axe-clean best, does not lower the bar in the common case)', () => {
    const excellentIdx = dp.indexOf('Excellent: axe clean + AI');
    expect(excellentIdx).toBeGreaterThan(-1);
    expect(aIdx).toBeGreaterThan(excellentIdx); // A is AFTER the normal target stop
  });
});

// ── Faithful mirrors of the pure decisions (timing omitted; the contract is the logic) ──

// B: wait-until-not-throttled (bounded), re-audit once, adopt only if coverage increased.
async function deferredReaudit({ partial, throttleSignal, cooldownClearsAt, now, reAudit }) {
  let verification = partial; // {chunksAudited, chunksRequested, _partialAudit}
  if (!(verification && verification._partialAudit)) return { verification, reaudited: false };
  if (!throttleSignal) return { verification, reaudited: false }; // non-throttle partial: never wait
  const deadline = now + 45000;
  let t = now;
  while (cooldownClearsAt > t && t < deadline) t = Math.min(t + 3000, cooldownClearsAt, deadline);
  if (cooldownClearsAt > t) return { verification, reaudited: false }; // deadline hit: keep partial, no call
  const re = await reAudit();
  let reaudited = false;
  if (re && (re.chunksAudited || 0) > (verification.chunksAudited || 0)) { verification = re; reaudited = true; }
  return { verification, reaudited };
}

describe('mirror: B decision', () => {
  it('recovered coverage is adopted after the cooldown eases', async () => {
    const r = await deferredReaudit({
      partial: { chunksAudited: 2, chunksRequested: 3, _partialAudit: true },
      throttleSignal: true, cooldownClearsAt: 5000, now: 0,
      reAudit: async () => ({ chunksAudited: 3, chunksRequested: 3, _partialAudit: false }),
    });
    expect(r.reaudited).toBe(true);
    expect(r.verification.chunksAudited).toBe(3);
    expect(r.verification._partialAudit).toBe(false);
  });
  it('a re-audit that did NOT improve coverage is discarded (keep the original)', async () => {
    const r = await deferredReaudit({
      partial: { chunksAudited: 2, chunksRequested: 3, _partialAudit: true },
      throttleSignal: true, cooldownClearsAt: 1000, now: 0,
      reAudit: async () => ({ chunksAudited: 2, chunksRequested: 3, _partialAudit: true }),
    });
    expect(r.reaudited).toBe(false);
    expect(r.verification.chunksAudited).toBe(2);
  });
  it('a storm that never clears within 45s skips the re-audit (ZERO extra failing calls)', async () => {
    let called = false;
    const r = await deferredReaudit({
      partial: { chunksAudited: 2, chunksRequested: 3, _partialAudit: true },
      throttleSignal: true, cooldownClearsAt: 999999, now: 0,
      reAudit: async () => { called = true; return { chunksAudited: 3, chunksRequested: 3 }; },
    });
    expect(called).toBe(false);
    expect(r.verification.chunksAudited).toBe(2);
  });
  it('a NON-throttle partial never waits or re-audits (waiting cannot help a content failure)', async () => {
    let called = false;
    const r = await deferredReaudit({
      partial: { chunksAudited: 2, chunksRequested: 3, _partialAudit: true },
      throttleSignal: false, cooldownClearsAt: 0, now: 0,
      reAudit: async () => { called = true; return { chunksAudited: 3, chunksRequested: 3 }; },
    });
    expect(called).toBe(false);
    expect(r.reaudited).toBe(false);
  });
  it('a NON-partial final audit is untouched (common case)', async () => {
    let called = false;
    const r = await deferredReaudit({
      partial: { chunksAudited: 3, chunksRequested: 3, _partialAudit: false },
      throttleSignal: true, cooldownClearsAt: 5000, now: 0,
      reAudit: async () => { called = true; return {}; },
    });
    expect(called).toBe(false);
    expect(r.reaudited).toBe(false);
  });
});

describe('mirror: minimal-A predicate (storm ∧ axe0 ∧ partial)', () => {
  const stormEarlyStop = (stormActive, newAxe, rePartial) => !!(stormActive && newAxe === 0 && rePartial);
  it('true ONLY for the pathological triple', () => {
    expect(stormEarlyStop(true, 0, true)).toBe(true);
  });
  it('false in every common combination', () => {
    expect(stormEarlyStop(false, 0, true)).toBe(false);  // no storm → keep going
    expect(stormEarlyStop(true, 2, true)).toBe(false);   // axe not clean → keep going
    expect(stormEarlyStop(true, 0, false)).toBe(false);  // full coverage → normal stop gates handle it
    expect(stormEarlyStop(false, 0, false)).toBe(false);
  });
});

describe('mirror: D summary rewrite (honest, score untouched)', () => {
  const reframe = (summary, did, req) => String(summary || '')
    .replace(/\s*\(\s*\d+\s*\/\s*\d+\s+sections audited[^)]*\)\s*$/i, '')
    + ` (The AI semantic re-check reached ${did} of ${req} section${req === 1 ? '' : 's'} — the rest were throttled by a temporary Canvas rate-limit. The full document was still verified by the automated engines (axe-core + IBM Equal Access), and this headline reflects that complete structural coverage.)`;
  it('drops the alarming "N/M sections audited" tail and appends honest wording', () => {
    const out = reframe('scripted audit (2/3 sections audited; 1 failed under throttle)', 2, 3);
    expect(out).not.toMatch(/\(2\/3 sections audited/);
    expect(out).toContain('reached 2 of 3 sections');
    expect(out).toContain('axe-core + IBM Equal Access');
  });
  it('works when there was no prior tail (idempotent-ish append)', () => {
    const out = reframe('scripted audit', 2, 3);
    expect(out).toContain('scripted audit');
    expect(out).toContain('reached 2 of 3 sections');
  });
});
