// REF lane: sizes shown on the ladder and in Compare come from each row's own `size` text.
import { beforeAll, describe, expect, it } from 'vitest';
import { extractArray, harness } from './cell_ref_helpers.js';

let R, DB;
beforeAll(async () => {
  const H = await harness();
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  R = window.__alloCellRef;
  DB = extractArray('ORGANISM_DB');
});
const byName = name => DB.find(o => o.name === name);

describe('REF size parsing', () => {
  it('parses every row that states a measurement, and only "size varies" rows return null', () => {
    const unparsed = [];
    for (const o of DB) {
      const p = R.cellRefParseSize(o.size);
      const hasMeasure = /\d\s*(?:-\s*\d+(?:\.\d+)?\s*)?(nm|μm|µm|um|mm|cm|m)\b/.test(o.size);
      if (!p) { unparsed.push(o.name); expect(hasMeasure, o.name + ' states a size the parser missed: ' + o.size).toBe(false); continue; }
      expect(Number.isFinite(p.lo) && Number.isFinite(p.hi) && Number.isFinite(p.mid), o.name).toBe(true);
      expect(p.lo, o.name).toBeGreaterThan(0.001);
      expect(p.hi, o.name).toBeLessThan(1e6);
      expect(p.lo, o.name).toBeLessThanOrEqual(p.mid);
      expect(p.mid, o.name).toBeLessThanOrEqual(p.hi);
      expect(o.size, o.name).toContain(p.source);
    }
    expect(unparsed.sort()).toEqual(['Algae (general)', 'Penicillium', 'Plasmodial slime mold', 'Slime Mold', 'Sponge cell', 'Stem cell']);
  });

  it('reads the unit that belongs to the number, not one later in the text', () => {
    expect(R.cellRefParseSize('Cell body 4-100 μm; axons can exceed 1 m')).toMatchObject({ lo: 4, hi: 100 });
    expect(R.cellRefParseSize('1-2 mm extended (large!)')).toMatchObject({ lo: 1000, hi: 2000 });
    expect(R.cellRefParseSize('About 2 μm long, 0.25-1 μm wide')).toMatchObject({ lo: 2, hi: 2, range: false });
    expect(R.cellRefParseSize('25 nm').mid).toBeCloseTo(0.025, 6);
    for (const bad of ['Variable', '', null, undefined, 12, {}, 'several cm', '0 μm']) expect(R.cellRefParseSize(bad)).toBeNull();
  });

  it('takes data-backed landmarks from the encyclopedia rows themselves', () => {
    const marks = R.cellRefLandmarks(DB);
    const get = id => marks.find(m => m.id === id);
    expect(get('ecoli')).toMatchObject({ fromData: true, um: R.cellRefParseSize(byName('E. coli').size).mid });
    expect(get('rbc').um).toBeCloseTo(R.cellRefParseSize(byName('Erythrocyte (RBC)').size).mid, 6);
    expect(get('rbc').um).toBeGreaterThan(7);
    expect(get('rbc').um).toBeLessThan(8);
    expect(get('amoeba').fromData).toBe(true);
    // the ladder is monotonic: bigger things sit further right
    const sorted = marks.slice().sort((a, b) => a.um - b.um);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].pos).toBeGreaterThan(sorted[i - 1].pos);
    // a landmark missing from the data is dropped, never shown as a guess
    expect(R.cellRefLandmarks([]).map(m => m.id)).toEqual(['ribosome', 'virus', 'hair', 'fly']);
  });

  it('builds a ladder model for every row without raw values in its sentences', () => {
    for (const o of DB) {
      const m = R.cellRefLadderModel(o, DB);
      const text = [m.midText, m.rangeText].concat(m.comparisons).join(' ');
      expect(text, o.name).not.toMatch(/NaN|undefined|Infinity/);
      if (m.parsed) {
        expect(m.comparisons.length, o.name).toBe(2);
        expect(m.mid).toBeGreaterThanOrEqual(0);
        expect(m.mid).toBeLessThanOrEqual(1);
        expect(m.comparisons.join(' '), o.name + ' must not compare with itself').not.toMatch(new RegExp('^' + o.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' is roughly [0-9.,]+× the size of an? ' + o.name));
      } else expect(m.comparisons).toEqual([]);
    }
    const amoeba = R.cellRefLadderModel(byName('Amoeba'), DB);
    expect(amoeba.comparisons.join(' ')).not.toContain('an amoeba');
  });
});

describe('REF relative-scale comparison', () => {
  it('draws faithfully when the ratio is mild and says so', () => {
    const m = R.cellRefScalePairModel(byName('Amoeba'), byName('Paramecium'));
    expect(m.scaled).toBe(true);
    expect(m.boosted).toBeNull();
    expect(m.ha / m.hb).toBeCloseTo(R.cellRefParseSize(byName('Amoeba').size).mid / R.cellRefParseSize(byName('Paramecium').size).mid, 6);
    expect(R.cellRefScalePairNote(m, byName('Amoeba'), byName('Paramecium'))).toMatch(/^Drawn to relative scale/);
  });

  it('flags an extreme ratio with an explicit enlargement factor', () => {
    const a = byName('E. coli'), b = byName('Amoeba');
    const m = R.cellRefScalePairModel(a, b);
    expect(m.boosted).toBe('a');
    expect(m.factor).toBeGreaterThan(5);
    // the enlarged picture is exactly factor × its true-scale height
    expect(m.ha).toBeCloseTo(96 * (R.cellRefParseSize(a.size).mid / R.cellRefParseSize(b.size).mid) * m.factor, 6);
    const note = R.cellRefScalePairNote(m, a, b);
    expect(note).toMatch(/^Not fully to scale/);
    expect(note).toContain('E. coli');
    expect(note).toMatch(/shown ×[0-9.,]+ larger/);
  });

  it('refuses to scale when a size is unknown', () => {
    const m = R.cellRefScalePairModel(byName('Stem cell'), byName('Amoeba'));
    expect(m.scaled).toBe(false);
    expect(R.cellRefScalePairNote(m, byName('Stem cell'), byName('Amoeba'))).toMatch(/^Not to scale: Stem cell/);
  });
});
