// Multi-column reading-order REPAIR (_alloOrderTextItems) — H-5's harder half.
// The extractor's legacy (y desc, x asc) sort interleaves the columns of a
// multi-column page line-by-line; the repair reads column-by-column when (and
// ONLY when) a high-confidence gutter exists. These fixtures are synthetic
// pdf.js-shaped items ({str, transform:[sx,0,0,sy,x,y], width}) so the pure
// function is exercised without pdf.js.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const block = dp.match(/function _alloOrderTextItems\(items, opts\) \{[\s\S]*?\n  var _multi = \{ items: out, columns: res\.cols\.length, gutters: res\.gutters, applied: true \};\r?\n  return _multi;\r?\n\}/);
if (!block) throw new Error('could not extract _alloOrderTextItems from source');
const order = new Function(block[0] + '\n; return _alloOrderTextItems;')();

// Also extract the DETECTOR so we can assert the repair moves its needle.
const ratioBlock = dp.match(/function readingOrderSequenceRatio\(textA, textB\) \{[\s\S]*?\n  var _r = tails\.length \/ present;\r?\n  return _r;\r?\n\}/);
if (!ratioBlock) throw new Error('could not extract readingOrderSequenceRatio');
const seqRatio = new Function(ratioBlock[0] + '\n; return readingOrderSequenceRatio;')();

// ── fixture builders ──
const W = 9; // char width at size ~9 for width estimates
const item = (str, x, y) => ({ str, transform: [9, 0, 0, 9, x, y], width: str.length * 5 });

// A column of text lines: returns items, one per line, at the given x, from yTop downward.
const column = (lines, x, yTop, lead = 14) => lines.map((s, i) => item(s, x, yTop - i * lead));

const joined = (items) => items.map((i) => i.str || '').join(' ').replace(/\s+/g, ' ').trim();

// Two independent columns (different line counts → drifting baselines, like real body text).
const LEFT_LINES = [
  'Reading is the gateway skill that unlocks every other', 'subject a student will ever encounter in school.',
  'Fluent readers decode automatically which frees their', 'working memory for comprehension and analysis.',
  'Struggling readers spend their effort on the words', 'themselves and arrive at the period exhausted.',
  'Systematic phonics paired with rich read alouds', 'builds both the code and the love of story.',
  'Assessment should inform instruction not punish', 'the learner for the gaps adults failed to close.',
];
const RIGHT_LINES = [
  'Universal design for learning asks teachers to plan', 'for variability from the first draft of a lesson,',
  'not to retrofit access after a student struggles', 'publicly in front of peers.',
  'Multiple means of representation engagement and', 'action give every learner a legitimate path in.',
  'Accessible documents are the printed voice of that', 'philosophy carried home in every backpack.',
  'A tagged PDF reads aloud in the order the author', 'intended which is the whole point of this work.',
];

describe('_alloOrderTextItems — multi-column repair', () => {
  it('reads a clean 2-column page column-by-column (left fully before right)', () => {
    const left = column(LEFT_LINES, 40, 700);           // x ∈ [40, ~290]
    const right = column(RIGHT_LINES, 330, 704, 13);    // x ∈ [330, ~580], slightly offset grid
    // Present INTERLEAVED (content-stream-ish order) to prove input order is irrelevant.
    const mixed = [];
    for (let i = 0; i < left.length; i++) { mixed.push(right[i]); mixed.push(left[i]); }
    const r = order(mixed, {});
    expect(r.applied).toBe(true);
    expect(r.columns).toBe(2);
    expect(joined(r.items)).toBe(joined(left) + ' ' + joined(right));
  });

  it('repair moves the H-5 detector from ~half to 1.0 on a 2-column page', () => {
    const left = column(LEFT_LINES, 40, 700);
    const right = column(RIGHT_LINES, 330, 704, 13);
    const truth = joined(left) + ' ' + joined(right);
    // Legacy (y desc, x asc) = what the extractor did before: interleaves lines.
    const legacy = [...left, ...right].sort((a, b) => {
      const dy = b.transform[5] - a.transform[5];
      return Math.abs(dy) > 2 ? dy : a.transform[4] - b.transform[4];
    });
    const before = seqRatio(truth, joined(legacy));
    const after = seqRatio(truth, joined(order([...left, ...right], {}).items));
    expect(before).toBeLessThan(0.8);   // the scramble is real
    expect(after).toBeGreaterThan(0.99); // the repair fixes it
  });

  it('3-column layout recurses to three columns in left→right order', () => {
    // Narrow newspaper-style columns: ≤26-char lines (~130pt wide) at x=30/220/410
    // → real ~60pt gutters between the bands (the 2-col fixtures' long lines would
    // physically overlap at this spacing).
    const narrow = (lines) => lines.map((s) => s.slice(0, 26).trim());
    const a = column(narrow(LEFT_LINES), 30, 700);
    const b = column(narrow(RIGHT_LINES), 220, 703, 15);
    const c = column(narrow(LEFT_LINES.slice(2).concat(RIGHT_LINES.slice(0, 2))).map((s) => s.toUpperCase()), 410, 698, 13);
    const r = order([...c, ...a, ...b], {});
    expect(r.applied).toBe(true);
    expect(r.columns).toBe(3);
    expect(joined(r.items)).toBe(joined(a) + ' ' + joined(b) + ' ' + joined(c));
  });

  it('RTL option reads columns right→left', () => {
    const left = column(LEFT_LINES, 40, 700);
    const right = column(RIGHT_LINES, 330, 704, 13);
    const r = order([...left, ...right], { rtl: true });
    expect(r.applied).toBe(true);
    expect(joined(r.items)).toBe(joined(right) + ' ' + joined(left));
  });

  it('single-column page: passthrough, byte-identical to the legacy sort', () => {
    const lines = column([...LEFT_LINES, ...RIGHT_LINES], 60, 720, 13);
    const shuffled = [...lines].reverse();
    const r = order(shuffled, {});
    expect(r.applied).toBe(false);
    expect(r.columns).toBe(1);
    expect(joined(r.items)).toBe(joined(lines));
  });

  it('table-aligned rows are NOT split (row-major order preserved)', () => {
    // Two x-bands with a wide gutter BUT aligned baselines — a 2-column data table.
    // Correct reading order is row-major: cell A1 B1 A2 B2 ...
    const rows = 14;
    const items = [];
    for (let i = 0; i < rows; i++) {
      items.push(item('rowlabel' + i, 60, 700 - i * 16));
      items.push(item('value' + i, 400, 700 - i * 16)); // same baseline → aligned
    }
    const r = order(items, {});
    expect(r.applied).toBe(false);
    const txt = joined(r.items);
    expect(txt.indexOf('rowlabel0')).toBeLessThan(txt.indexOf('value0'));
    expect(txt.indexOf('value0')).toBeLessThan(txt.indexOf('rowlabel1')); // row-major, not column-major
  });

  it('tiny pages (<20 items) fall through to the legacy sort', () => {
    const few = column(LEFT_LINES.slice(0, 4), 40, 700).concat(column(RIGHT_LINES.slice(0, 4), 330, 700));
    const r = order(few, {});
    expect(r.applied).toBe(false);
  });

  it('a stray margin note does not count as a column (balance guard)', () => {
    const body = column([...LEFT_LINES, ...RIGHT_LINES], 40, 740, 13); // 20 lines, x ∈ [40, ~300]
    const note = [item('margin note', 520, 700), item('see fig 2', 520, 686)];
    const r = order([...body, ...note], {});
    expect(r.applied).toBe(false); // 20 vs 2 → 10:1 imbalance → no split
  });

  it('wiring: the extractor routes items through _alloOrderTextItems and discloses columns', () => {
    expect(dp).toMatch(/const _ordered = _alloOrderTextItems\(tc\.items \|\| \[\], \{\}\)/);
    expect(dp).toMatch(/pages\.push\(\{ pageNum: p, text: pageText, columns: _ordered\.applied \? _ordered\.columns : 1 \}\)/);
    expect(dp).toMatch(/multi-column layout detected/);
  });
});
