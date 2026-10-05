import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals, renderTab } from './helpers/dino_lab_harness.js';

const src = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
const start = src.indexOf('  // Comparison drafts belong to an unordered pair');
const end = src.indexOf('  function timeInquiryState(raw)', start);
if (start < 0 || end < 0) throw Error('Comparison helper bounds missing');
const I = internals();
const H = new Function('byId', 'fmtMya', src.slice(start, end) + '\nreturn {comparisonFacts,comparisonPairKey,comparisonInquiryState,comparisonInquiryText};')(I.byId, I.fmtMya);
const pair = { a: 'utahraptor', b: 'eolambia' };

describe('comparison evidence and restored drafts', () => {
  it('distinguishes separation, overlap and a rounded touching boundary', () => {
    expect(H.comparisonFacts(I.byId('utahraptor'), I.byId('eolambia')).time).toMatchObject({ kind: 'separate', gap: 30 });
    expect(H.comparisonFacts(I.byId('tyrannosaurus'), I.byId('triceratops')).time.kind).toBe('overlap');
    const a = { id: 'a', myaHi: 10, myaLo: 5 }, b = { id: 'b', myaHi: 5, myaLo: 1 };
    expect(H.comparisonFacts(a, b).time).toMatchObject({ kind: 'boundary', low: 5, high: 5, gap: 0 });
    expect(H.comparisonFacts({ id: 'a', myaHi: 3, myaLo: 5 }, b).time.kind).toBe('unknown');
    expect(H.comparisonFacts(null, null)).toMatchObject({ valid: false, sameSpecies: false });
  });
  it('uses consistent ratios and does not mistake unknown metrics or placeholders for evidence', () => {
    const facts = H.comparisonFacts({ id: 'a', lengthM: 0.02, formation: 'Various', region: 'Unknown' }, { id: 'b', lengthM: 35, formation: 'Various', region: 'Unknown' });
    expect(facts.length.ratio).toBe(1750);
    expect(facts.length.axisMax).toBeGreaterThanOrEqual(35);
    expect(Number.isFinite(facts.length.tickStep)).toBe(true);
    expect(facts.place.sameFormation).toBe(false); expect(facts.place.sameRegion).toBe(false);
    expect(H.comparisonFacts({ id: 'a', lengthM: 0 }, { id: 'b', lengthM: NaN }).length).toMatchObject({ values: [null, null], ratio: null });
    expect(H.comparisonFacts(I.byId('eolambia'), I.byId('eolambia'))).toMatchObject({ sameSpecies: true, key: '' });
  });
  it('normalizes unknown species, bounded text, duplicate keys and invalid choices', () => {
    for (const raw of [null, [], 42, { pairs: {} }, { pairs: [{ a: 'missing', b: 'utahraptor' }, { a: 'utahraptor', b: 'utahraptor' }] }]) expect(H.comparisonInquiryState(raw).pairs).toEqual([]);
    const raw = { pairs: [{ ...pair, prediction: 'old' }, { a: pair.b, b: pair.a, prediction: 'new', evidence: ['time', 'forged', 'time'], explanation: 'x'.repeat(3000), limit: {} }] };
    const copy = JSON.stringify(raw), q = H.comparisonInquiryState(raw).pairs[0];
    expect(q).toMatchObject({ a: 'eolambia', b: 'utahraptor', key: 'eolambia|utahraptor', prediction: 'new', evidence: ['time'], limit: '' });
    expect(q.explanation).toHaveLength(1800); expect(JSON.stringify(raw)).toBe(copy);
    expect(H.comparisonPairKey(I.byId(pair.a), I.byId(pair.b))).toBe(H.comparisonPairKey(I.byId(pair.b), I.byId(pair.a)));
  });
  it('retains twelve bounded pair drafts and exports partial reasoning honestly', () => {
    const pairs = I.DINOS.slice(0, 14).map(animal => ({ a: 'utahraptor', b: animal.id, prediction: animal.common }));
    expect(H.comparisonInquiryState({ pairs }).pairs).toHaveLength(12);
    expect(H.comparisonInquiryText({ pairs: [{ ...pair }] })).toBe('');
    const text = H.comparisonInquiryText({ pairs: [{ ...pair, prediction: 'Were they neighbours?', evidence: ['time', 'place'], explanation: '<img src=x> The catalog gap is 30 million years.', limit: 'Local occurrence dates are not provided.' }] });
    for (const phrase of ['Utahraptor', 'Eolambia', '30 million years', 'Written reasoning has not been automatically assessed', 'Catalog age ranges', 'Local occurrence dates', 'not establish that the animals lived together']) expect(text).toContain(phrase);
    const html = renderTab({ tab: 'notes', compareInquiry: { pairs: [{ ...pair, prediction: '<img src=x onerror=alert(1)>', evidence: ['time'], explanation: 'The dates differ.' }] } });
    expect(html).toContain('&lt;img src=x'); expect(html).not.toContain('<img src=x');
    expect(html).toContain('Resume this comparison'); expect(html).toContain('The dates differ.');
  });
  it('rejects missing contrast and recovers a forged inquiry stage', () => {
    expect(renderTab({ tab: 'compare', compareA: 'utahraptor', compareB: 'utahraptor', compareInquiryOpen: true })).not.toContain('id="dino-compare-prediction"');
    const html = renderTab({ tab: 'compare', compareA: 'utahraptor', compareB: 'eolambia', compareInquiryOpen: true, compareInquiry: { pairs: [{ ...pair, step: 'explain', prediction: ' ', evidence: ['time'] }] } });
    expect(html).toContain('id="dino-compare-prediction"'); expect(html).not.toContain('id="dino-compare-explanation"');
  });
});

describe('new dynamic English keys', () => {
  it.each(['ui_strings.js', 'desktop/web-app/public/ui_strings.js'])('registers ecosystem and comparison keys in %s', path => {
    const ui = JSON.parse(readFileSync(path, 'utf8')).stem.dinolab;
    for (const [helper, prefix] of [['ect', 'eco_'], ['cpt', 'compare_']]) {
      const pattern = new RegExp('\\b' + helper + "\\('([^']+)',\\s*'", 'g');
      for (const match of src.matchAll(pattern)) expect(ui[prefix + match[1]], prefix + match[1]).toBeTruthy();
    }
    for (const key of ['compare_stage_predict', 'compare_stage_inspect', 'compare_stage_explain', 'compare_first_bar', 'compare_second_bar', 'compare_pair_coeval', 'compare_pair_formation', 'compare_evidence_time']) expect(ui[key], key).toBeTruthy();
  });
});
