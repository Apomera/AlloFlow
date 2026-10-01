// Unit tests for the deterministic table/reading-order scorers (2026-06-14):
// TEDS / TEDS-Struct (tests/lib/teds.js) + reading-order edit distance
// (tests/lib/edit_distance.js). These are the CI-testable measurement primitives
// of the golden-master benchmark; the vision pipeline that produces the tables is
// Canvas-only and lives behind the harness, not here.

import { describe, it, expect } from 'vitest';
import { teds, tedsStruct, parseTableToTree, treeEditDistance } from './lib/teds.js';
import { sequenceEditDistance, readingOrderDistance, readingOrderScore } from './lib/edit_distance.js';

const T = (body) => `<table>${body}</table>`;
const r2x2 = T('<tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr>');

describe('TEDS — table structural+content similarity', () => {
  it('identical tables score exactly 1.0', () => {
    expect(teds(r2x2, r2x2)).toBe(1);
  });

  it('parses td/th uniformly as cells (header promotion does NOT lower TEDS)', () => {
    const withTd = T('<tr><td>H1</td><td>H2</td></tr><tr><td>1</td><td>2</td></tr>');
    const withTh = T('<tr><th scope="col">H1</th><th scope="col">H2</th></tr><tr><td>1</td><td>2</td></tr>');
    // promoting the header row to <th scope> is an accessibility edit, not a
    // structural/content change → TEDS must stay 1.0 (preservation metric).
    expect(teds(withTd, withTh)).toBe(1);
  });

  it('a single changed cell lowers TEDS below 1 but stays high', () => {
    const changed = T('<tr><td>a</td><td>b</td></tr><tr><td>c</td><td>X</td></tr>');
    const s = teds(r2x2, changed);
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThan(0.8); // one cell of a 7-node tree (table+2tr+4cell)
  });

  it('a missing row lowers TEDS more than a single cell edit', () => {
    const oneRow = T('<tr><td>a</td><td>b</td></tr>');
    const cellEdit = T('<tr><td>a</td><td>b</td></tr><tr><td>c</td><td>Z</td></tr>');
    expect(teds(r2x2, oneRow)).toBeLessThan(teds(r2x2, cellEdit));
  });

  it('colspan/rowspan differences are penalized', () => {
    const span = T('<tr><td colspan="2">a</td></tr><tr><td>c</td><td>d</td></tr>');
    const nospan = T('<tr><td>a</td><td>x</td></tr><tr><td>c</td><td>d</td></tr>');
    expect(teds(span, nospan)).toBeLessThan(1);
  });

  it('TEDS-Struct ignores cell text (same grid, different words → 1.0)', () => {
    const other = T('<tr><td>w</td><td>x</td></tr><tr><td>y</td><td>z</td></tr>');
    expect(tedsStruct(r2x2, other)).toBe(1);
    expect(teds(r2x2, other)).toBeLessThan(1); // full TEDS still sees the text change
  });

  it('completely different tables score low (but in range)', () => {
    const big = T('<tr><td>1</td><td>2</td><td>3</td></tr><tr><td>4</td><td>5</td><td>6</td></tr><tr><td>7</td><td>8</td><td>9</td></tr>');
    const s = teds(r2x2, big);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(0.6);
  });

  it('parser captures rows, cells, spans', () => {
    const tree = parseTableToTree(T('<tr><th colspan="2" rowspan="3">x</th></tr>'));
    expect(tree.children.length).toBe(1);
    expect(tree.children[0].children[0]).toMatchObject({ label: 'cell', colspan: 2, rowspan: 3, text: 'x' });
  });

  it('tree edit distance of identical trees is 0', () => {
    const t = parseTableToTree(r2x2);
    expect(treeEditDistance(t, t).distance).toBe(0);
  });
});

describe('reading-order normalized edit distance', () => {
  it('identical order = distance 0 (score 1)', () => {
    expect(readingOrderDistance(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
    expect(readingOrderScore(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1);
  });

  it('a single adjacent swap is a small distance', () => {
    // ['a','c','b'] vs ['a','b','c'] → Levenshtein 2 (sub c→b, sub b→c) / 3
    expect(readingOrderDistance(['a', 'c', 'b'], ['a', 'b', 'c'])).toBeCloseTo(2 / 3, 5);
  });

  it('a fully reversed long order is a high distance', () => {
    const fwd = ['1', '2', '3', '4', '5', '6'];
    const rev = fwd.slice().reverse();
    expect(readingOrderDistance(rev, fwd)).toBeGreaterThan(0.6);
  });

  it('column-scramble (the Adobe failure mode) scores worse than order-preserving', () => {
    const truth = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3']; // human order: left column then right
    const scrambled = ['L1', 'R1', 'L2', 'R2', 'L3', 'R3']; // geometry interleave
    const preserved = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'];
    expect(readingOrderDistance(scrambled, truth)).toBeGreaterThan(readingOrderDistance(preserved, truth));
  });

  it('sequenceEditDistance handles empties', () => {
    expect(sequenceEditDistance([], ['a', 'b'])).toBe(2);
    expect(sequenceEditDistance(['a'], [])).toBe(1);
  });
});
