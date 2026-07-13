// Throttle redesign (2026-06-21): the Gemini breaker over-throttled a Canvas rate-limit — it pinned cap=1
// for a whole run (the "4 consecutive successes, one failure resets" recovery can never trip under a
// throttle trickle) and ground each call through 4 retries × escalating 90s cooldowns (6-17 min/call). The
// fix: TIME-DECAY recovery (cap steps back as cooldowns elapse), fail-fast (1 jittered retry then DEFER),
// and a defer-and-revisit catch-up drain in aiFixChunked — a chunk the throttle skipped is recorded, then
// revisited after a pause and spliced back AT THE SAME INDEX. This pins the index-splice (the deep-dive's
// top risk) + the breaker changes.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Faithful mirror of the catch-up drain's index-splice (the part that could go off-by-one) ──
// fixer(part, ci, round) → { out, deferred }: on throttle returns { out: original, deferred: true }.
const drain = async (chunks, initialDeferred, fixer) => {
  const fixed = chunks.slice(); // main pass left deferred chunks as their original
  let _todo = initialDeferred.slice();
  const log = [];
  if (initialDeferred.length && initialDeferred.length < chunks.length) {
    for (let round = 0; round < 2 && _todo.length; round++) {
      const nextDeferred = [];
      const again = await Promise.all(_todo.map(async (ci) => {
        const { out, deferred } = await fixer(chunks[ci], ci, round);
        if (deferred) nextDeferred.push(ci);
        log.push({ round, ci }); // which index was revisited
        return { ci, out };
      }));
      for (const { ci, out } of again) { if (out != null) fixed[ci] = out; } // splice at the SAME index
      _todo = nextDeferred;
    }
  }
  return { fixed, log, stillDeferred: _todo };
};

describe('defer-and-revisit catch-up: results splice back at the correct index', () => {
  it('a throttled chunk is revisited and its fix lands at ITS OWN index (not shuffled)', async () => {
    const chunks = ['A', 'B', 'C', 'D'];
    // B (1) throttled on round 0 then succeeds round 1; D (3) succeeds on round 0.
    const fixer = async (part, ci, round) => {
      if (ci === 1 && round === 0) return { out: part, deferred: true };
      return { out: part + '-fixed', deferred: false };
    };
    const { fixed, log } = await drain(chunks, [1, 3], fixer);
    expect(fixed).toEqual(['A', 'B-fixed', 'C', 'D-fixed']); // fixes at 1 & 3; 0 & 2 untouched
    expect(log.filter((e) => e.ci === 1).length).toBe(2); // B revisited twice (round 0 throttled, round 1 fixed)
    expect(log.some((e) => e.ci === 0 || e.ci === 2)).toBe(false); // non-deferred chunks NEVER revisited
  });
  it('a chunk still throttled after 2 rounds keeps its original (shipped for retry)', async () => {
    const chunks = ['A', 'B', 'C'];
    const fixer = async (part, ci) => (ci === 2 ? { out: part, deferred: true } : { out: part + '!', deferred: false });
    const { fixed, stillDeferred } = await drain(chunks, [2], fixer);
    expect(fixed).toEqual(['A', 'B', 'C']); // C unchanged (never recovered)
    expect(stillDeferred).toEqual([2]);
  });
  it('when ALL chunks were deferred the drain is SKIPPED (no spin on a total stall)', async () => {
    const chunks = ['A', 'B'];
    let calls = 0;
    const fixer = async (part) => { calls++; return { out: part, deferred: true }; };
    const { fixed } = await drain(chunks, [0, 1], fixer);
    expect(calls).toBe(0); // never entered the drain
    expect(fixed).toEqual(['A', 'B']);
  });
});

describe('anti-drift: the breaker recovers over time + fails fast', () => {
  it('time-decay recovery steps the cap back up as cooldowns elapse (toward this run\'s effective ceiling)', () => {
    // 2026-06-24: recovery now climbs toward _geminiEffectiveMax (the per-run ceiling, lowered for heavy/scanned
    // docs by _applyGeminiPacing) instead of the raw global _GEMINI_MAX_CONCURRENT — so pacing isn't undone.
    expect(pipe).toMatch(/_geminiCap = Math\.min\(_geminiEffectiveMax, _geminiCap \+ 1\);\s*\n\s*_geminiCooldownUntil = 0;/);
  });
  it('one inline auth retry (then defer), not three', () => {
    expect(pipe).toMatch(/var _GEMINI_AUTH_RETRIES = 1;/);
  });
  it('cooldown ladder capped at 25s, not 90s', () => {
    expect(pipe).not.toMatch(/Math\.min\(90000,/);
    expect(pipe).toMatch(/Math\.min\(25000, _GEMINI_COOLDOWN_MS \* \(_geminiAuthStreak/);
  });
  it('the retry backoff is jittered', () => {
    expect(pipe).toMatch(/0\.7 \+ Math\.random\(\) \* 0\.6/);
  });
});

describe('anti-drift: aiFixChunked records + revisits throttle-deferred chunks', () => {
  it('records a throttle-skipped chunk index', () => {
    expect(pipe).toMatch(/if \(_isThrottleErr\(e\)\) _deferredIdx\.push\(ci\)/);
    expect(pipe).toMatch(/var _isThrottleErr = function \(e\)/);
  });
  it('the catch-up drain revisits them (skipped when ALL deferred) and splices by index', () => {
    expect(pipe).toMatch(/if \(_deferredIdx\.length && _deferredIdx\.length < chunks\.length\)/);
    expect(pipe).toMatch(/for \(const \{ ci, out \} of _again\) \{ if \(out != null\) fixed\[ci\] = out; \}/);
  });
});
