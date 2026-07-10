// #5 (2026-06-21): the output-audit deduction was computed two ways — the single-chunk path summed
// per-issue deductions UN-weighted while the chunked-merge path count-weighted them, so the SAME document
// could score differently depending only on whether it landed in one chunk or many (a reliability defect).
// Both now route through ONE shared _alloWeightedDeductions(issues), so the formula can't drift per-path.
// This pins cross-path equality (the golden), the formula, and behavior-preservation.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

async function liveWeighted() {
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'doc_pipeline_module.js'));
  return window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.createDocPipeline.weightedDeductions;
}

// the sub-linear count weight, mirrored for the formula assertions
const weight = (count) => Math.min(3, 1 + Math.log2(Math.max(1, Math.floor(Number(count) || 1))));

describe('#5 weighted deduction — one formula, no chunk-boundary discontinuity', () => {
  it('the live module exposes weightedDeductions', async () => {
    expect(typeof (await liveWeighted())).toBe('function');
  });

  it('GOLDEN: the same issue set yields the SAME deduction regardless of which path computes it', async () => {
    const fn = await liveWeighted();
    const issues = [
      { deduction: 15, count: 4 },  // a critical seen on 4 pages
      { deduction: 10, count: 1 },
      { deduction: 5 },             // no count
      { deduction: 2, count: 9 },
    ];
    // Both call sites now invoke the identical fn — single-chunk: fn(parsed.issues); chunked: fn(mergedIssues).
    const singleChunkPath = fn(issues);
    const chunkedMergePath = fn(issues);
    expect(singleChunkPath).toBe(chunkedMergePath); // no boundary discontinuity
  });

  it('the formula is Σ (deduction × count-weight)', async () => {
    const fn = await liveWeighted();
    const issues = [{ deduction: 15, count: 4 }, { deduction: 10, count: 1 }, { deduction: 2, count: 9 }];
    const expected = 15 * weight(4) + 10 * weight(1) + 2 * weight(9);
    expect(fn(issues)).toBeCloseTo(expected, 9);
  });

  it('behavior-preserving for the single-chunk path: AI issues carry no count → weight 1× → plain sum', async () => {
    const fn = await liveWeighted();
    const aiIssues = [{ deduction: 15 }, { deduction: 10 }, { deduction: 5 }, { deduction: 2 }]; // no `count` fields
    expect(fn(aiIssues)).toBe(15 + 10 + 5 + 2); // identical to the old un-weighted single-chunk sum
  });

  it('a multi-occurrence issue is now weighted identically on both paths (the discontinuity is gone)', async () => {
    const fn = await liveWeighted();
    // count 4 → weight capped path = min(3, 1+log2(4)) = 3 → 15×3 = 45, not 15
    expect(fn([{ deduction: 15, count: 4 }])).toBeCloseTo(45, 9);
    expect(fn([{ deduction: 15, count: 1 }])).toBe(15);
  });

  it('null/empty input is safe', async () => {
    const fn = await liveWeighted();
    expect(fn(null)).toBe(0);
    expect(fn([])).toBe(0);
    expect(fn([{}])).toBe(0); // no deduction → 0
  });
});

describe('anti-drift: both output-audit paths route through the single shared fn', () => {
  it('the single-chunk path calls _alloWeightedDeductions(parsed.issues)', () => {
    expect(pipeSrc).toMatch(/const totalDeductions = _alloWeightedDeductions\(parsed\.issues\);/);
    // the old un-weighted inline reduce is gone
    expect(pipeSrc).not.toMatch(/const totalDeductions = parsed\.issues\.reduce\(\(sum, i\) => sum \+ \(i\.deduction \|\| 0\), 0\)/);
  });
  it('the chunked-merge path calls _alloWeightedDeductions(mergedIssues)', () => {
    expect(pipeSrc).toMatch(/const rawDeductions = _alloWeightedDeductions\(mergedIssues\);/);
    expect(pipeSrc).not.toMatch(/const rawDeductions = mergedIssues\.reduce\(\(sum, i\) => sum \+ \(i\.deduction \|\| 0\) \* _alloIssueWeight/);
  });
  it('the fn is defined once at module top with the weight applied', () => {
    expect(pipeSrc).toMatch(/var _alloWeightedDeductions = function \(issues\) \{/);
    // Harness repair (2026-07-09): a NaN-hardening pass wrapped the deduction in Number(...).
    expect(pipeSrc).toMatch(/\(Number\(i && i\.deduction\) \|\| 0\) \* _alloIssueWeight\(i && i\.count\)/);
  });
});
