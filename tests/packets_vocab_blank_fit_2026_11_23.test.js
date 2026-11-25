// A meaning with a blank (___) must take the word as it is written (2026-11-23). Aaron, listening to the meaning
// recordings: "prey" in "If you are ___ on something, you are acting like a predator" needs "preying", and "prey" there
// reads as the opposite. A read of all 5,394 blank meanings changed 1,955 of them (reworded, or a rare circular meaning
// such as shrimp "To fish for ___" dropped); unchecked ones through the curation file's senseFixes, so their words stay
// unchecked and the core does not grow. dev-tools/build_packets_vocab_bank.cjs blankFitProblem guards the bank now: a
// meaning the rules flag must be listed, with why it fits, in blankFitOk.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const B = require('../dev-tools/build_packets_vocab_bank.cjs');
const cur = JSON.parse(readFileSync('data/packets_vocab_curation_en.json', 'utf8'));
const rows = [];
for (const n of readdirSync('packets_vocab').filter((x) => /^en-\d+\.json$/.test(x))) for (const [w, ss] of JSON.parse(readFileSync('packets_vocab/' + n, 'utf8')).words) for (const r of ss) rows.push({ w, id: w + '|' + r[0].charAt(0) + '|' + r[0].slice(1), p: r[0].charAt(0), def: r[1] });
for (const n of readdirSync('packets_vocab_ext').filter((x) => /\.json$/.test(x))) for (const [w, ss] of JSON.parse(readFileSync('packets_vocab_ext/' + n, 'utf8')).words) for (const r of ss) rows.push({ w, id: w + '|' + r[0].charAt(0) + '|' + r[0].slice(1), p: r[0].charAt(0), def: r[1] });

describe('blank meanings take the word as written', () => {
  it('the rules find the kinds Aaron found', () => {
    expect(B.blankFitProblem('prey', 'v', 'If you are ___ on something, you are acting like a predator')).toMatch(/be/);
    expect(B.blankFitProblem('decompose', 'v', 'If something ___ it changes back into what it was made from')).toMatch(/-s form/);
    expect(B.blankFitProblem('leg', 'n', 'Your ___ are the two long parts of your body')).toMatch(/plural/);
    expect(B.blankFitProblem('pivot', 'v', 'To turn on an ___')).toMatch(/"an"/);
    expect(B.blankFitProblem('shrimp', 'v', 'To fish for ___')).toMatch(/-ing|circular/);
    expect(B.blankFitProblem('jump', 'v', 'If you ___, you push yourself into the air')).toBe('');
    expect(B.blankFitProblem('prey', 'v', 'If animals ___ on other animals, they hunt and eat them')).toBe('');
    expect(B.blankFitProblem('media', 'n', 'The ___ are the ways news reaches people')).toBe('');
  });

  it('no meaning in the bank has a blank the rules flag, unless it is listed with why it fits', () => {
    const flagged = rows.filter((r) => B.blankFitProblem(r.w, r.p, r.def) && !Object.prototype.hasOwnProperty.call(cur.blankFitOk || {}, r.id));
    expect(flagged.map((r) => r.id + ': ' + B.blankFitProblem(r.w, r.p, r.def) + ': ' + r.def).slice(0, 20)).toEqual([]);
    for (const [id, why] of Object.entries(cur.blankFitOk || {})) expect(String(why).length, id).toBeGreaterThan(5);
  });

  it('a sense fix rewords or drops a meaning without making its word checked', () => {
    const fixes = cur.senseFixes || {};
    expect(Object.keys(fixes).length).toBeGreaterThan(1000);
    for (const [id, f] of Object.entries(fixes)) {
      expect(cur.words[id.split('|')[0]] && cur.words[id.split('|')[0]].senses && cur.words[id.split('|')[0]].senses[id], id + ' has a verdict: fix it there').toBeFalsy();
      expect(!!f.reject !== !!f.def, id).toBe(true);
      if (f.def) expect(B.safety(f.def), id).toBe('');
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    // The fixes are in the bank as written (US spelling may change a word), and the dropped meanings are gone.
    const reworded = Object.entries(fixes).filter(([id, f]) => f.def && byId.has(id));
    expect(reworded.length).toBeGreaterThan(1000);
    expect(reworded.filter(([id, f]) => byId.get(id).def === f.def).length / reworded.length).toBeGreaterThan(0.97);
    for (const [id, f] of Object.entries(fixes)) if (f.reject) expect(byId.has(id), id).toBe(false);
    // prey was a checked meaning: its fix is its verdict.
    expect(byId.get('prey|v|1').def).toBe(cur.words.prey.senses['prey|v|1'].def);
    expect(cur.words.prey.senses['prey|v|1'].verdict).toBe('fixed');
  });
});
