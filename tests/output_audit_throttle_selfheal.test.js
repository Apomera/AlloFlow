// Throttle self-heal in auditOutputAccessibility (2026-06-28). The chunked output audit fires one Gemini
// call per HTML section in parallel batches; a section that returned null (an empty-body / rate-limit
// throttle, or a parse miss) used to be SILENTLY DROPPED — the score was then computed from only the
// sections that returned, capping coverage at "N of M sections audited" and reading artificially high
// ("1 of 3 sections audited"). Fix: track which chunk INDICES failed, then RETURN TO THE FAILED SECTIONS —
// re-audit exactly those once, after a settle, and fold any recovered sections back into the merge +
// coverage. This test pins the recovery control flow + the source carrying the self-heal block.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Faithful mirror of the loop + self-heal control flow in auditOutputAccessibility (the batch loop that
// records _failedIdx, then the throttle self-heal pass). `audit(chunk, chunkNum)` stands in for the hoisted
// _auditOneChunk → callGemini. The settle delay is omitted (timing isn't the contract; the recovery is).
async function runWithSelfHeal(chunks, audit) {
  const batchSize = 6;
  const chunkResults = [];
  const _failedIdx = [];
  for (let b = 0; b < chunks.length; b += batchSize) {
    const batch = chunks.slice(b, b + batchSize);
    const results = await Promise.all(batch.map((chunk, idx) => audit(chunk, b + idx + 1)));
    results.forEach((res, idx) => { if (res) chunkResults.push(res); else _failedIdx.push(b + idx); });
  }
  let retried = [];
  if (_failedIdx.length > 0 && chunkResults.length > 0) {
    retried = _failedIdx.slice();
    for (let b = 0; b < _failedIdx.length; b += batchSize) {
      const slice = _failedIdx.slice(b, b + batchSize);
      const rr = await Promise.all(slice.map((ci) => audit(chunks[ci], ci + 1)));
      rr.forEach((res) => { if (res) chunkResults.push(res); });
    }
  }
  return { chunkResults, failedIdx: _failedIdx, retried };
}

describe('auditOutputAccessibility throttle self-heal — control flow', () => {
  it('a section that throttles on pass 1 but succeeds on retry is RECOVERED (full coverage, not "N of M")', async () => {
    const chunks = ['a', 'b', 'c', 'd', 'e'];
    const failFirstPass = new Set([1, 3]); // indices that throttle on the first attempt only
    const seen = new Set();
    const audit = async (chunk, chunkNum) => {
      const idx = chunkNum - 1;
      if (failFirstPass.has(idx) && !seen.has(idx)) { seen.add(idx); return null; } // throttle once
      return { score: 90, issues: [], summary: 's' };
    };
    const { chunkResults, failedIdx, retried } = await runWithSelfHeal(chunks, audit);
    expect(failedIdx).toEqual([1, 3]);    // both throttled on pass 1
    expect(retried).toEqual([1, 3]);      // retry targets ONLY the failed indices (not the whole document)
    expect(chunkResults).toHaveLength(5); // ...and recovers them → full coverage, no partial-score cap
  });

  it('a permanently-failing section stays dropped — the retry is a single bounded pass (no hang)', async () => {
    const chunks = ['a', 'b', 'c'];
    const audit = async (chunk, chunkNum) => (chunkNum === 2 ? null : { score: 88 }); // section 2 always fails
    const { chunkResults, failedIdx } = await runWithSelfHeal(chunks, audit);
    expect(failedIdx).toEqual([1]);
    expect(chunkResults).toHaveLength(2); // 2/3 — the permanent failure isn't recovered, but there's no loop
  });

  it('NO retry when NOTHING returned (a total outage — retrying would only hammer the throttle)', async () => {
    const chunks = ['a', 'b'];
    let calls = 0;
    const audit = async () => { calls++; return null; }; // every section fails
    const { chunkResults } = await runWithSelfHeal(chunks, audit);
    expect(chunkResults).toHaveLength(0);
    expect(calls).toBe(2); // 2 first-pass calls, ZERO retries (guarded by chunkResults.length > 0)
  });
});

describe('anti-drift: the self-heal ships in the engine', () => {
  it('tracks failed indices + re-audits only those once + folds recoveries into the merge', () => {
    expect(dp).toContain('const _failedIdx = [];');
    expect(dp).toContain('const _auditOneChunk = (chunk, chunkNum) =>');
    expect(dp).toMatch(/else _failedIdx\.push\(b \+ idx\)/);
    expect(dp).toContain('Throttle self-heal');
    // guarded (skip on total outage) + bounded to a single pass that re-hits exactly the failed indices
    expect(dp).toMatch(/if \(_failedIdx\.length > 0 && chunkResults\.length > 0\)/);
    expect(dp).toMatch(/_auditOneChunk\(chunks\[ci\], ci \+ 1\)/);
  });
});
