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
  const bBlock = dp.slice(bIdx, bIdx + 2800);
  it('gates on a PARTIAL final audit AND a throttle signal (confirmed GeminiGate vars)', () => {
    expect(bIdx).toBeGreaterThan(-1);
    expect(bBlock).toContain('verification._partialAudit');
    expect(bBlock).toContain('_geminiCooldownUntil > Date.now()');
    expect(bBlock).toContain('_geminiCap === _GEMINI_STORM_MIN');
    expect(bBlock).not.toContain('authThrottles'); // the non-existent field the design first suggested
  });
  it('bounded wait, then re-audits ONCE and adopts only if coverage increased', () => {
    expect(bBlock).toContain('Date.now() + 45000'); // bounded deadline — never wait out a true outage
    expect(bBlock).toContain('_pulsePipelineWatchdog()'); // a deliberate wait is activity, not a stall
    expect(bBlock).toContain('await auditOutputAccessibility(accessibleHtml)');
    expect(bBlock).toMatch(/_reFinalAudit\.chunksAudited\s*\|\|\s*0\)\s*>\s*\(verification\.chunksAudited/);
    // fail-soft: keep the partial result on any error
    expect(bBlock).toMatch(/catch\s*\(_reErr\)/);
  });
  it('re-audits only if the window actually eased (no re-call under an active cooldown)', () => {
    expect(bBlock).toContain('if (!(typeof _geminiCooldownUntil === \'number\' && _geminiCooldownUntil > Date.now()))');
  });
});

describe('source-pins: D — honest reframe of a residual throttled partial', () => {
  const dIdx = dp.indexOf('honest reframe of a residual throttled partial');
  const dBlock = dp.slice(dIdx, dIdx + 1300);
  it('sets _aiReCheckThrottled and rewrites the summary to honest wording', () => {
    expect(dIdx).toBeGreaterThan(-1);
    expect(dBlock).toContain('verification._aiReCheckThrottled = true');
    expect(dBlock).toContain('The AI semantic re-check reached');
    expect(dBlock).toContain('axe-core + IBM Equal Access');
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
    expect(aBlock).toContain('_geminiCap === _GEMINI_STORM_MIN');
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
