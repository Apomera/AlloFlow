// Throttle self-heal in auditOutputAccessibility (2026-06-28, hardened for SUSTAINED throttling). The chunked
// output audit fires one Gemini call per HTML section; a section that returned null (an empty-body / rate-limit
// throttle, or a parse miss) used to be SILENTLY DROPPED — capping coverage at "N of M sections audited" and
// reading artificially high. The self-heal RETURNS TO THE FAILED SECTIONS and re-audits them. A SINGLE retry
// pass isn't enough when the rate-limit persists (the storm outlasts one pass), so it loops up to 3 ROUNDS,
// re-trying only the still-failed sections each round (the GeminiGate cooldown decays over time, so later rounds
// get more headroom). It early-outs only when a whole round recovers NOTHING while NOT throttled (a genuine
// content/parse failure), and is bounded to 3 rounds so a true outage can't spin. This pins that control flow.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Faithful mirror of the batch loop + multi-round self-heal in auditOutputAccessibility. `audit(chunk,chunkNum)`
// stands in for the hoisted _auditOneChunk → callGemini; `isThrottled()` stands in for the live
// `_geminiCooldownUntil > Date.now()` check that distinguishes a rate-limit from a genuine failure. Settle
// delays are omitted (timing isn't the contract; the recovery + round-bounding are).
async function runWithSelfHeal(chunks, audit, opts = {}) {
  const maxRounds = opts.maxRounds ?? 3;
  const isThrottled = opts.isThrottled || (() => false);
  const batchSize = 6;
  const chunkResults = [];
  const _failedIdx = [];
  for (let b = 0; b < chunks.length; b += batchSize) {
    const batch = chunks.slice(b, b + batchSize);
    const results = await Promise.all(batch.map((chunk, idx) => audit(chunk, b + idx + 1)));
    results.forEach((res, idx) => { if (res) chunkResults.push(res); else _failedIdx.push(b + idx); });
  }
  let _stillFailed = _failedIdx.slice();
  let rounds = 0;
  for (let _round = 0; _round < maxRounds && _stillFailed.length > 0 && chunkResults.length > 0; _round++) {
    rounds++;
    const _beforeLen = _stillFailed.length;
    const _next = [];
    for (let b = 0; b < _stillFailed.length; b += batchSize) {
      const slice = _stillFailed.slice(b, b + batchSize);
      const rr = await Promise.all(slice.map((ci) => audit(chunks[ci], ci + 1)));
      rr.forEach((res, k) => { if (res) chunkResults.push(res); else _next.push(slice[k]); });
    }
    _stillFailed = _next;
    if (_stillFailed.length === _beforeLen && !isThrottled()) break;
  }
  return { chunkResults, failedIdx: _failedIdx, stillFailed: _stillFailed, rounds };
}

describe('auditOutputAccessibility throttle self-heal — multi-round recovery', () => {
  it('a section that throttles on the first pass but recovers on round 1 → full coverage (not "N of M")', async () => {
    const chunks = ['a', 'b', 'c', 'd', 'e'];
    const failOnce = new Set([1, 3]); const seen = new Set();
    const audit = async (_c, n) => { const i = n - 1; if (failOnce.has(i) && !seen.has(i)) { seen.add(i); return null; } return { score: 90 }; };
    const { chunkResults, failedIdx, rounds } = await runWithSelfHeal(chunks, audit);
    expect(failedIdx).toEqual([1, 3]);
    expect(chunkResults).toHaveLength(5); // full coverage
    expect(rounds).toBe(1);
  });

  it('SUSTAINED throttle: a section that fails the first TWO retry rounds but recovers on the third is STILL saved (a single pass would have dropped it)', async () => {
    const chunks = ['a', 'b', 'c'];
    let attempts = 0; // section 2 throttles until its 4th total attempt (initial + 3 rounds)
    const audit = async (_c, n) => { if (n === 2) { attempts++; return attempts >= 4 ? { score: 80 } : null; } return { score: 90 }; };
    const { chunkResults, stillFailed, rounds } = await runWithSelfHeal(chunks, audit, { isThrottled: () => true });
    expect(stillFailed).toEqual([]);      // fully recovered
    expect(chunkResults).toHaveLength(3);
    expect(rounds).toBe(3);               // took all three rounds — the whole point: one pass wasn't enough
  });

  it('a genuinely-stuck section that is NOT throttled early-outs after one fruitless round (no grind)', async () => {
    const chunks = ['a', 'b', 'c'];
    const audit = async (_c, n) => (n === 2 ? null : { score: 88 });
    const { chunkResults, stillFailed, rounds } = await runWithSelfHeal(chunks, audit, { isThrottled: () => false });
    expect(stillFailed).toEqual([1]);
    expect(chunkResults).toHaveLength(2);
    expect(rounds).toBe(1);               // one fruitless round, then early-out (not a rate-limit)
  });

  it('a section stuck under a PERSISTENT cooldown is bounded to 3 rounds (no infinite loop)', async () => {
    const chunks = ['a', 'b'];
    const audit = async (_c, n) => (n === 2 ? null : { score: 90 });
    const { stillFailed, rounds } = await runWithSelfHeal(chunks, audit, { isThrottled: () => true });
    expect(stillFailed).toEqual([1]);
    expect(rounds).toBe(3);               // capped even though "throttled" never clears
  });

  it('NO retry when NOTHING returned (a total stall — retrying would only hammer the throttle)', async () => {
    const chunks = ['a', 'b'];
    let calls = 0;
    const audit = async () => { calls++; return null; };
    const { chunkResults } = await runWithSelfHeal(chunks, audit);
    expect(chunkResults).toHaveLength(0);
    expect(calls).toBe(2); // 2 first-pass calls, ZERO retry rounds (guarded by chunkResults.length > 0)
  });
});

describe('anti-drift: the multi-round self-heal ships in the engine', () => {
  it('tracks failed indices, loops bounded rounds re-trying only the still-failed, with a not-throttled early-out', () => {
    expect(dp).toContain('const _failedIdx = [];');
    expect(dp).toContain('const _auditOneChunk = (chunk, chunkNum) =>');
    expect(dp).toMatch(/else _failedIdx\.push\(b \+ idx\)/);
    expect(dp).toContain('Throttle self-heal');
    expect(dp).toContain('const _SELFHEAL_MAX_ROUNDS = 3;');
    expect(dp).toContain('let _stillFailed = _failedIdx.slice();');
    // chunkResults is a position-preserving preallocated array; length alone is
    // always non-zero, so require an actual successful result and a live owner.
    expect(dp).toMatch(/_round < _SELFHEAL_MAX_ROUNDS && _stillFailed\.length > 0 && chunkResults\.some\(Boolean\) && !_outputAuditCancelled\(\)/);
    expect(dp).toMatch(/_stillFailed\.length === _beforeLen && !\(typeof _geminiCooldownUntil/);
    expect(dp).toMatch(/_auditOneChunk\(chunks\[ci\], ci \+ 1\)/);
  });
});
