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
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const _s = dp.indexOf('function readingOrderSequenceRatio(textA, textB) {');
const _e = dp.indexOf('\n}', _s) + 2;
if (_s === -1 || _e < 2) throw new Error('extraction markers for readingOrderSequenceRatio missing');
const ratio = new Function(dp.slice(_s, _e) + '\nreturn readingOrderSequenceRatio;')();
const _treeS = dp.indexOf('function collectTaggedTreeReferenceOrder(');
const _treeE = dp.indexOf('\n\n// Order-SENSITIVE round-trip signal', _treeS);
if (_treeS === -1 || _treeE < _treeS) throw new Error('extraction markers for collectTaggedTreeReferenceOrder missing');
const collectTreeOrder = new Function(
  dp.slice(_treeS, _treeE) + '\nreturn collectTaggedTreeReferenceOrder;'
)();

// A realistic two-column page. LEFT column reads top-to-bottom, then the RIGHT column. Reading order is
// left-then-right; a scrambled content stream emits right-then-left.
const LEFT = 'Photosynthesis converts sunlight into chemical energy stored within glucose molecules. Chloroplasts contain chlorophyll pigments that absorb red and blue wavelengths efficiently.';
const RIGHT = 'Cellular respiration releases that stored energy through controlled oxidation reactions. Mitochondria generate adenosine triphosphate which powers nearly every cellular process.';
const sourceOrder = LEFT + ' ' + RIGHT;          // correct reading order
const scrambled = RIGHT + ' ' + LEFT;            // right column emitted first (multi-column scramble)

class FakeRef {
  constructor(id) { this.id = id; }
  toString() { return this.id + ' 0 R'; }
}
class FakeArray {
  constructor(items) { this.items = items; }
  size() { return this.items.length; }
  get(index) { return this.items[index]; }
}
class FakeDict {
  constructor(values) { this.values = values; }
  get(name) { return this.values[name]; }
}
const FakeName = { of: (name) => name };

const makeFakeTree = ({ swapped = false, cyclic = false } = {}) => {
  const refs = new Map();
  const docRef = new FakeRef(10);
  const sectRef = new FakeRef(11);
  const firstRef = new FakeRef(12);
  const secondRef = new FakeRef(13);
  const mcr = new FakeDict({ Type: '/MCR' });
  refs.set(String(firstRef), new FakeDict({ Type: '/StructElem', K: new FakeArray([mcr]) }));
  refs.set(String(secondRef), new FakeDict({ Type: '/StructElem', K: new FakeArray([mcr]) }));
  refs.set(String(sectRef), new FakeDict({ Type: '/StructElem', K: new FakeArray(cyclic ? [secondRef, docRef] : [secondRef]) }));
  refs.set(String(docRef), new FakeDict({ Type: '/StructElem', K: new FakeArray(swapped ? [sectRef, firstRef] : [firstRef, sectRef]) }));
  const root = new FakeDict({ Type: '/StructTreeRoot', K: new FakeArray([docRef]) });
  return { context: { lookup: (ref) => refs.get(String(ref)) }, root };
};

describe('collectTaggedTreeReferenceOrder: walks the saved /K hierarchy, not content streams', () => {
  it('returns tracked semantic leaves in depth-first StructTreeRoot order', () => {
    const { context, root } = makeFakeTree();
    expect(collectTreeOrder(context, root, FakeName, new Set(['12 0 R', '13 0 R'])))
      .toEqual(['12 0 R', '13 0 R']);
  });
  it('exposes a reordered /K sequence even when the same leaves remain present', () => {
    const { context, root } = makeFakeTree({ swapped: true });
    expect(collectTreeOrder(context, root, FakeName, new Set(['12 0 R', '13 0 R'])))
      .toEqual(['13 0 R', '12 0 R']);
  });
  it('stops malformed cycles instead of recursing forever', () => {
    const { context, root } = makeFakeTree({ cyclic: true });
    expect(collectTreeOrder(context, root, FakeName, new Set(['12 0 R', '13 0 R'])))
      .toEqual(['12 0 R', '13 0 R']);
  });
});
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

describe('H-5 wiring: the order ratio is exported + surfaced with a catastrophic-failure tier', () => {
  it('readingOrderSequenceRatio is on the factory API + survives the build', () => {
    expect(dp).toMatch(/readingOrderSequenceRatio: readingOrderSequenceRatio,/);
    expect(dpMod).toMatch(/readingOrderSequenceRatio/);
    expect(dp).toMatch(/collectTaggedTreeReferenceOrder: collectTaggedTreeReferenceOrder,/);
    expect(dpMod).toMatch(/collectTaggedTreeReferenceOrder/);
  });
  it('the round-trip block computes it, surfaces readingOrderRatio, and adds a reading-order check', () => {
    const block = dp.slice(dp.indexOf('const _coverage = _origTokens.size'), dp.indexOf('if (_coverage < 0.99) {'));
    expect(block).toMatch(/readingOrderSequenceRatio\(_origText, _shipText\)/);
    expect(block).toMatch(/readingOrderRatio: Math\.round\(_orderRatio \* 1000\) \/ 10/);
    expect(block).toMatch(/rule: 'Extracted text sequence remains in source order \(content-stream signal\)'/);
    // Catastrophic scrambles fail closed; the 0.50-0.90 uncertainty band stays
    // warning/information only.
    const orderCheck = block.slice(block.indexOf('if (_orderRatio < 0.90)'));
    expect(orderCheck).toMatch(/_orderRatio < 0\.50 \? 'fail'/);
    expect(orderCheck).toMatch(/if \(_roStatus === 'fail'\) _roundTrip\.ok = false/);
    expect(orderCheck).toMatch(/_orderRatio < 0\.80 \? 'warn' : 'info'/);
  });
  it('walks the reparsed StructTreeRoot and fails closed on an exact leaf-order mismatch', () => {
    const treeBlock = dp.slice(dp.indexOf('// Exact saved-tree reading-order check'), dp.indexOf('// Content-loss guard'));
    expect(treeBlock).toMatch(/collectTaggedTreeReferenceOrder\(_rt\.context, _savedRootRef/);
    expect(treeBlock).toMatch(/_rtCat\.get\(PDFName\.of\('StructTreeRoot'\)\)/);
    expect(treeBlock).toMatch(/rule: 'Logical reading order follows saved StructTreeRoot \/K'/);
    expect(treeBlock).toMatch(/_orderExact \? 'pass' : 'fail'/);
    expect(dp).toMatch(/tagTreeOrder: _tagTreeOrderReport/);
  });
  it('surfaces the saved StructTreeRoot order as authoritative and labels content-stream order as supplemental', () => {
    expect(view).toMatch(/roundTrip && _currentTaggedValidation\.roundTrip\.tagTreeOrder/);
    expect(view).toMatch(/typeof _tree\.exact === 'boolean'/);
    expect(view).toContain('saved StructTreeRoot /K');
    expect(view).toContain('Supplemental content-stream sequence');
  });

});
