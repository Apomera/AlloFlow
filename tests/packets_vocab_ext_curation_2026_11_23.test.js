// Checked extended words (2026-11-23): a curation entry with ext: true applies to a word of the extended files
// (packets_vocab_ext/) by the same rules as a core word (order, rejects, rewrites, examples, added meanings), and the word
// stays extended. dev-tools/build_packets_vocab_bank.cjs curateExtended().
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const B = require('../dev-tools/build_packets_vocab_bank.cjs');
const sense = (id, def, extra = {}) => Object.assign({ id, word: id.split('|')[0], p: id.split('|')[1], def, style: 'phrase', source: 'simple', ex: [], syn: [], ant: [], soft: false, tags: '', raw: def }, extra);

describe('curateExtended', () => {
  const ss = [sense('jasmine|n|1', 'A plant with sweet-smelling flowers'), sense('jasmine|n|2', 'The perfume made from these plants'), sense('jasmine|n|w1', 'Any of several shrubs')];

  it('rejects, rewrites, orders, keeps only the listed meanings, and marks them checked', () => {
    const C = { ext: true, order: ['jasmine|n|1'], keepOnlyOrdered: true, senses: {
      'jasmine|n|1': { verdict: 'fixed', def: 'A plant with small white or yellow flowers that smell sweet', example: 'The jasmine by the door smelled sweet.', exampleEdited: true },
      'jasmine|n|2': { verdict: 'reject' }, 'jasmine|n|w1': { verdict: 'reject' } } };
    const out = B.curateExtended('jasmine', ss, C, {});
    expect(out.map((s) => s.id)).toEqual(['jasmine|n|1']);
    expect(out[0].def).toBe('A plant with small white or yellow flowers that smell sweet');
    expect(out[0].checked).toBe('fixed');
    expect(out[0].edited).toBe(true);
    expect(out[0].fixedExample).toBe('The jasmine by the door smelled sweet.');
    // The input list is not changed.
    expect(ss.map((s) => s.def)).toEqual(['A plant with sweet-smelling flowers', 'The perfume made from these plants', 'Any of several shrubs']);
  });

  it('keeps a "good" meaning as written, can clear its example, and leaves an unseen meaning unchecked', () => {
    const out = B.curateExtended('jasmine', ss, { ext: true, senses: { 'jasmine|n|1': { verdict: 'good', example: '' } } }, {});
    expect(out[0].checked).toBe('good');
    expect(out[0].def).toBe('A plant with sweet-smelling flowers');
    expect(out[0].fixedExample).toBe('');
    expect(out.slice(1).map((s) => s.checked)).toEqual(['', '']);
  });

  it('adds a meaning the sources lack, and puts it where the order says', () => {
    const out = B.curateExtended('jasmine', ss, { ext: true, order: ['jasmine|n|x1', 'jasmine|n|1'], keepOnlyOrdered: true,
      senses: { 'jasmine|n|1': { verdict: 'good' } }, add: [{ id: 'jasmine|n|x1', def: 'A kind of tea that smells of these flowers', source: 'alloflow' }] }, {});
    expect(out.map((s) => s.id)).toEqual(['jasmine|n|x1', 'jasmine|n|1']);
    expect(out[0].checked).toBe('fixed');
    expect(out[0].source).toBe('alloflow');
  });

  it('refuses an unknown verdict, a rewrite the safety filter rejects, and adding a meaning that exists', () => {
    expect(() => B.curateExtended('jasmine', ss, { ext: true, senses: { 'jasmine|n|1': { verdict: 'maybe' } } }, {})).toThrow(/unknown verdict/);
    expect(() => B.curateExtended('jasmine', ss, { ext: true, add: [{ id: 'jasmine|n|1', def: 'x' }] }, {})).toThrow(/exists/);
    const hard = String(B.HARD).match(/[a-z]{4,}/i);
    if (hard) expect(() => B.curateExtended('jasmine', ss, { ext: true, senses: { 'jasmine|n|1': { verdict: 'fixed', def: 'A word about ' + hard[0] } } }, {})).toThrow(/safety/);
  });

  it('records a checked meaning the sources no longer give as stale, and shows at most three', () => {
    const stats = {};
    const many = [1, 2, 3, 4].map((n) => sense('jasmine|n|' + n, 'Meaning ' + n));
    const out = B.curateExtended('jasmine', many, { ext: true, senses: { 'jasmine|v|9': { verdict: 'good' } } }, stats);
    expect(out).toHaveLength(3);
    expect(stats.extCurationStale).toEqual(['jasmine|v|9']);
  });
});

describe('the bank as built', () => {
  const cur = JSON.parse(readFileSync('data/packets_vocab_curation_en.json', 'utf8')).words;
  const extWords = new Map();
  for (const f of readdirSync('packets_vocab_ext').filter((n) => /^[a-z]\.json$/.test(n))) for (const [w, rows] of JSON.parse(readFileSync('packets_vocab_ext/' + f, 'utf8')).words) extWords.set(w, rows);
  const coreWords = new Set();
  for (const f of readdirSync('packets_vocab').filter((n) => /^en-\d+\.json$/.test(n))) for (const [w] of JSON.parse(readFileSync('packets_vocab/' + f, 'utf8')).words) coreWords.add(w);
  const checked = Object.keys(cur).filter((w) => cur[w].ext);

  it('every checked extended word stays extended and shows its checked meanings, in order, marked checked', () => {
    for (const w of checked) {
      expect(coreWords.has(w), w).toBe(false);
      const rows = extWords.get(w);
      expect(rows, w).toBeTruthy();
      const order = cur[w].order || [];
      expect(rows.map((r) => w + '|' + r[0].charAt(0) + '|' + r[0].slice(1)), w).toEqual(order.slice(0, 3));
      rows.forEach((r) => {
        const id = w + '|' + r[0].charAt(0) + '|' + r[0].slice(1);
        const v = (cur[w].senses || {})[id];
        const added = (cur[w].add || []).find((a) => a.id === id);
        if (v && v.verdict === 'fixed' && v.def) expect(r[1], id).toBe(v.def);
        if (added) expect(r[1], id).toBe(added.def);
        expect(r[4] & 6, id).toBeGreaterThan(0);
      });
    }
  });
});
