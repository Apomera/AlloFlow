// Tagged-PDF reading-order verification (H-5, audit 2026-06-23). The shipped round-trip check compares token
// SETS (order-blind), so a tagged PDF whose tree reading order is SCRAMBLED — the classic multi-column
// content stream that draws the right column before the left — passes at ~100% coverage and still earns the
// PDF/UA-1 declaration (a §7.2 violation). readingOrderSequenceRatio adds the order-sensitive signal. This is
// the MULTI-COLUMN GOLDEN the prior audits lacked (their fixtures were single-column page-1 synthetics), at
// the logic level: a two-column swap the set-coverage check cannot see, which this ratio catches.
// NOTE: the real end-to-end golden (a multi-column fixture PDF through the tagging pipeline + veraPDF) still
// needs the Canvas environment; this pins the detection logic + the round-trip wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const dpMod = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');
const _s = dp.indexOf('function readingOrderSequenceRatio(textA, textB) {');
const _e = dp.indexOf('\n}', _s) + 2;
if (_s === -1 || _e < 2) throw new Error('extraction markers for readingOrderSequenceRatio missing');
const ratio = new Function(dp.slice(_s, _e) + '\nreturn readingOrderSequenceRatio;')();

// A realistic two-column page. LEFT column reads top-to-bottom, then the RIGHT column. Reading order is
// left-then-right; a scrambled content stream emits right-then-left.
const LEFT = 'Photosynthesis converts sunlight into chemical energy stored within glucose molecules. Chloroplasts contain chlorophyll pigments that absorb red and blue wavelengths efficiently.';
const RIGHT = 'Cellular respiration releases that stored energy through controlled oxidation reactions. Mitochondria generate adenosine triphosphate which powers nearly every cellular process.';
const sourceOrder = LEFT + ' ' + RIGHT;          // correct reading order
const scrambled = RIGHT + ' ' + LEFT;            // right column emitted first (multi-column scramble)

describe('readingOrderSequenceRatio: catches a scramble the token-SET coverage check cannot', () => {
  it('identical order → 1.0', () => {
    expect(ratio(sourceOrder, sourceOrder)).toBe(1);
  });
  it('a two-column SWAP scores low even though every token is present (100% set coverage)', () => {
    const r = ratio(sourceOrder, scrambled);
    expect(r).toBeLessThan(0.7);                  // clearly flags the scramble
    // sanity: token SET coverage is ~100% (the order-blind check would pass) — confirm the words are all there
    const setOf = (s) => new Set(s.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(/\s+/).filter((t) => t.length >= 3));
    const a = setOf(sourceOrder), b = setOf(scrambled);
    let shared = 0; for (const t of a) if (b.has(t)) shared++;
    expect(shared / a.size).toBeGreaterThan(0.99); // ← the exact blind spot: set says "perfect", order says "scrambled"
  });
  it('a minor local edit (same order) stays high', () => {
    const edited = sourceOrder.replace('efficiently', 'effectively');
    expect(ratio(sourceOrder, edited)).toBeGreaterThan(0.95);
  });
  it('dropped tokens (same order) do NOT depress the order ratio (coverage handles loss, not this)', () => {
    const dropped = sourceOrder.replace('Chloroplasts contain chlorophyll pigments that absorb red and blue wavelengths efficiently. ', '');
    expect(ratio(sourceOrder, dropped)).toBeGreaterThan(0.9); // remaining text is still in order
  });
  it('repeated common words do not cause a false low ratio', () => {
    const t = 'the cell uses the energy and the water and the light and the carbon';
    expect(ratio(t, t)).toBe(1);
  });
  it('guards empty input', () => {
    expect(ratio('', 'anything here')).toBe(1);
    expect(() => ratio(null, undefined)).not.toThrow();
  });
});

describe('H-5 wiring: the order ratio is exported + surfaced in the round-trip (WARN-first, never auto-fails)', () => {
  it('readingOrderSequenceRatio is on the factory API + survives the build', () => {
    expect(dp).toMatch(/readingOrderSequenceRatio: readingOrderSequenceRatio,/);
    expect(dpMod).toMatch(/readingOrderSequenceRatio/);
  });
  it('the round-trip block computes it, surfaces readingOrderRatio, and adds a reading-order check', () => {
    const block = dp.slice(dp.indexOf('const _coverage = _origTokens.size'), dp.indexOf('if (_coverage < 0.99) {'));
    expect(block).toMatch(/readingOrderSequenceRatio\(_origText, _shipText\)/);
    expect(block).toMatch(/readingOrderRatio: Math\.round\(_orderRatio \* 1000\) \/ 10/);
    expect(block).toMatch(/rule: 'Reading order preserved in the tagged tree \(sequence match\)'/);
    // WARN-first: the order check must NOT use 'fail' (uncalibrated heuristic can't false-fail a real doc)
    const orderCheck = block.slice(block.indexOf('if (_orderRatio < 0.90)'));
    expect(orderCheck).not.toMatch(/status: 'fail'/);
    expect(orderCheck).not.toMatch(/_roundTrip\.ok = false/);
  });
});
