// activity4h (2026-11-05): an output in perfect order scored 76% and was held as "noticeably different order", because a
// footer printed on both pages and kept once counted its second copy as out of sequence. Copies beyond the ones the output
// holds can never be in sequence; they are a loss question for coverage. Real reordering must still score low.
// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = fs.readFileSync(process.env.ALLO_PIPELINE_SOURCE || path.resolve('doc_pipeline_source.jsx'), 'utf8');
const ratio = new Function(sliceBetween(SRC, 'function readingOrderSequenceRatio', '\n}', { file: 'doc_pipeline_source.jsx', includeEnd: true }) + '\nreturn readingOrderSequenceRatio;')();

const FOOT = 'The University of Maine is an equal opportunity employer designated office handles inquiries regarding policies located North Stevens Hall Orono';
const A = 'Fill your container about three quarters full of water before adding shaving cream';
const B = 'Reflective questions what represents this experiment explain rain formed using model';
const C = 'Extensions draw label parts write about happening prediction another colour tried';

describe('readingOrderSequenceRatio with text the source repeats', () => {
  it('a footer on both pages, kept once, reads as in order', () => {
    expect(ratio(A + ' ' + FOOT + ' ' + B + ' ' + FOOT, A + ' ' + B + ' ' + FOOT)).toBe(1);
  });
  it('a frozen row on five pages, kept once, reads as in order', () => {
    const row = 'Acadia Academy tuition approved budget transport total';
    expect(ratio([1, 2, 3, 4, 5].map((n) => row + ' page word' + n + ' more').join(' '), row + ' ' + [1, 2, 3, 4, 5].map((n) => 'page word' + n + ' more').join(' '))).toBeGreaterThan(0.75);
  });
  it('reordered sections still score low, repeats or not', () => {
    expect(ratio(A + ' ' + B + ' ' + C, C + ' ' + B + ' ' + A)).toBeLessThan(0.5);
    expect(ratio(A + ' ' + FOOT + ' ' + B + ' ' + FOOT + ' ' + C, FOOT + ' ' + C + ' ' + B + ' ' + A)).toBeLessThan(0.8); // the check's own threshold
  });
  it('a shuffled sentence still scores low when its words repeat in the source', () => {
    const words = (A + ' ' + A).split(' ');
    expect(ratio(words.join(' '), words.slice().reverse().join(' '))).toBeLessThan(0.3);
  });
  it('an unchanged document stays at 1, and the ratio never passes 1', () => {
    const t = [A, FOOT, B, FOOT, C, FOOT].join(' ');
    expect(ratio(t, t)).toBe(1);
    expect(ratio(FOOT, FOOT + ' ' + FOOT + ' ' + FOOT)).toBeLessThanOrEqual(1);
  });
  it('words the output lost are not counted as out of order (coverage reports those)', () => {
    expect(ratio(A + ' ' + B, A)).toBe(1);
  });
});
