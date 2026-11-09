// _alignCallsToRuns (2026-11-09): when a scan's OCR boxes and its tagged leaves disagree in word COUNT (the M15 mismatch),
// the boxes are matched to the leaves by their WORDS, so the page keeps its search layer on the printed words instead of
// falling to a column at the top of the page. The garden newsletter scan: Tesseract missed the whole harvest table (118 leaf
// words, 88 boxes) and read the bullets as "*" and "+". Runs the REAL function, sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
function arrow(name) {
  const at = SRC.indexOf('const ' + name + ' = ');
  if (at < 0) throw new Error('Missing source function: ' + name);
  const open = SRC.indexOf('{', SRC.indexOf('=>', at));
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}' && --depth === 0) return SRC.slice(at, i + 1) + ';';
  }
  throw new Error('Unbalanced source function: ' + name);
}
const { align, distribute } = new Function(arrow('_distributeCallsToRuns') + '\n' + arrow('_alignCallsToRuns') + '\nreturn { align: _alignCallsToRuns, distribute: _distributeCallsToRuns };')();

const run = (role, text) => ({ role, text, mcid: 0 });
// one draw call per printed word, left to right on its line (PDF space: y decreases down the page)
function lineCalls(words, y) { let x = 72; return words.map((t) => { const c = { text: t, x, y, size: 11, w: t.length * 6, angle: 0 }; x += t.length * 6 + 4; return c; }); }
const RUNS = [
  run('H1', 'Maple Street School Garden'),
  run('P', 'Students planted beans, lettuce and carrots behind the library.'),
  run('H2', 'How families can help'),
  run('LI', 'Bring clean yogurt cups for seed starting.'),
  run('LI', 'Sign up for one weekend watering visit.'),
  run('H2', 'Harvest schedule'),
  run('TH', 'Crop'), run('TH', 'Ready in'), run('TD', 'Lettuce'), run('TD', 'May'), run('TD', 'Beans'), run('TD', 'June'), run('TD', 'Carrots'), run('TD', 'June'),
  run('P', 'Questions? Contact Ms. Okafor in room 112.'),
];
// Tesseract: everything but the table, bullets misread as "*" and "+", a stray quote on nothing
const CALLS = [
  ...lineCalls(['Maple', 'Street', 'School', 'Garden'], 740),
  ...lineCalls(['Students', 'planted', 'beans,', 'lettuce', 'and', 'carrots', 'behind', 'the', 'library.'], 710),
  ...lineCalls(['How', 'families', 'can', 'help'], 680),
  ...lineCalls(['*', 'Bring', 'clean', 'yogurt', 'cups', 'for', 'seed', 'starting.'], 660),
  ...lineCalls(['+', 'Sign', 'up', 'for', 'one', 'weekend', 'watering', 'visit.'], 645),
  ...lineCalls(['Harvest', 'schedule'], 620),
  ...lineCalls(['Questions?', 'Contact', 'Ms.', 'Okafor', 'in', 'room', '112.'], 500),
];

describe('_alignCallsToRuns', () => {
  it('is needed whenever the counts differ: under 20% the count method shifts words onto the wrong leaves', () => {
    const d = distribute(RUNS, CALLS);
    expect(d.mismatch).toBeUndefined(); // 49 leaf words, 42 boxes: within the old 20% tolerance
    expect(d.countsDiffer).toBe(true);
    // counting hands the table header "Crop" the box of a word printed far below it
    expect(d[6].calls.map((c) => c.text)).not.toEqual(['Crop']);
    expect(['Harvest', 'schedule', 'Questions?']).toContain(d[6].calls[0].text); // a heading's or a later paragraph's box
    // equal counts: no flag, the validated count method stays
    expect(distribute([run('P', 'a b')], lineCalls(['a', 'b'], 700)).countsDiffer).toBeUndefined();
  });
  it('puts every read word on its own leaf, at its printed position', () => {
    const out = align(RUNS, CALLS);
    expect(out.mismatch).toBeUndefined();
    const words = (i) => out[i].calls.map((c) => c.text);
    expect(words(0)).toEqual(['Maple', 'Street', 'School', 'Garden']);
    expect(words(3)).toEqual(['Bring', 'clean', 'yogurt', 'cups', 'for', 'seed', 'starting.']);
    expect(words(14)).toEqual(['Questions?', 'Contact', 'Ms.', 'Okafor', 'in', 'room', '112.']);
    expect(out[14].calls[0]).toBe(CALLS.find((c) => c.text === 'Questions?')); // the real box, untouched
  });
  it('keeps misread bullets out of the leaves (searchable /Artifact overflow)', () => {
    expect(align(RUNS, CALLS).overflow.map((c) => c.text)).toEqual(['*', '+']);
  });
  it('places the table the OCR engine missed just after the heading before it, and counts it as approximate', () => {
    const out = align(RUNS, CALLS);
    expect(out.approximatedRuns).toBe(8);
    const crop = out[6].calls;
    expect(crop.map((c) => c.text)).toEqual(['Crop']);
    expect(crop[0].approximate).toBe(true);
    const harvestY = CALLS.find((c) => c.text === 'schedule').y;
    expect(crop[0].y).toBeLessThan(harvestY); // below the heading
    expect(crop[0].y).toBeGreaterThan(500); // and above "Questions?", where the table is printed
    expect(out[7].calls.map((c) => c.text)).toEqual(['Ready', 'in']);
    for (const g of out.slice(6, 14)) for (const c of g.calls) expect(c.approximate).toBe(true);
  });
  it('gives up (mismatch, as before) when the boxes describe some other reading', () => {
    const other = lineCalls('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'.split(' '), 700);
    expect(align(RUNS, other).mismatch).toBeTruthy();
    expect(align(RUNS, []).mismatch).toBeTruthy();
  });
  it('every leaf has an entry, so every MCID still gets its marked content', () => {
    const out = align(RUNS, CALLS);
    expect(out).toHaveLength(RUNS.length);
    expect(out.every((g) => g.calls.length > 0)).toBe(true);
  });
  it('is wired as the fallback for the count mismatch, and reported in ocrTextLayer', () => {
    expect(SRC).toContain('const _al = _alignCallsToRuns(_runs, _posCalls);');
    expect(SRC).toContain('alignedPages: _ocrAlignedPages.slice(), approximatedRuns: _ocrApproximatedRuns }');
  });
});
