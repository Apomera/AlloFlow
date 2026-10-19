// Cell Simulator — the models behind the Knowledge & History visuals: Gram-stain
// colour logic, the Abbe resolution limit, the "what could we see?" chart points,
// the streak-plate colony layout and the limits-of-life records. Numbers shown to
// students must come from these functions, so the functions are pinned here.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let K;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  delete window.__alloCellKnow;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_cell.js'), 'utf8'))();
  K = window.__alloCellKnow;
});

describe('Gram stain', () => {
  const look = (step, wall, timing) => K.knowGramState(step, wall, timing).colour;
  it('follows crystal violet -> iodine -> alcohol -> safranin for both wall types', () => {
    expect([0, 1, 2, 3, 4].map((s) => look(s, 'pos', 'right'))).toEqual(['none', 'purple', 'purple', 'purple', 'purple']);
    expect([0, 1, 2, 3, 4].map((s) => look(s, 'neg', 'right'))).toEqual(['none', 'purple', 'purple', 'none', 'pink']);
    // The dye-iodine complex forms at the iodine step, not before.
    expect(K.knowGramState(1, 'pos').holds).toBe('cv');
    expect(K.knowGramState(2, 'pos').holds).toBe('complex');
  });
  it('shows the classic mistakes: under- and over-decolourising', () => {
    expect(look(4, 'neg', 'short')).toBe('purple');   // false Gram-positive
    expect(look(4, 'pos', 'long')).toBe('pink');      // false Gram-negative
    expect(K.knowGramState(4, 'neg', 'short').misread).toBe(true);
    expect(K.knowGramState(4, 'pos', 'long').misread).toBe(true);
    expect(K.knowGramState(4, 'pos', 'right').misread).toBe(false);
    expect(K.knowGramState(4, 'neg', 'right').misread).toBe(false);
    // Timing cannot matter before the alcohol step.
    for (const t of ['short', 'right', 'long']) expect(look(2, 'neg', t)).toBe('purple');
  });
  it('clamps junk input instead of inventing a state', () => {
    expect(K.knowGramState('x', 'zebra', 7)).toMatchObject({ step: 0, wall: 'pos', timing: 'right', colour: 'none' });
    expect(K.knowGramState(99, 'neg').step).toBe(4);
    expect(K.KNOW_GRAM_STEPS.map((s) => s.id)).toEqual(['smear', 'cv', 'iodine', 'decolor', 'safranin']);
  });
});

describe('Resolution', () => {
  it('Abbe limit d = wavelength / (2 NA)', () => {
    expect(K.knowAbbeLimitNm(550, 1.4)).toBe(196);
    expect(K.knowAbbeLimitNm(550, 1.25)).toBe(220);
    expect(K.knowAbbeLimitNm(400, 0.25)).toBe(800);
    expect(K.knowAbbeLimitNm(0, 1)).toBe(null);
    expect(K.knowAbbeLimitNm(550, -1)).toBe(null);
    // Shorter wavelength and bigger NA both resolve finer detail.
    expect(K.knowAbbeLimitNm(400, 1.4)).toBeLessThan(K.knowAbbeLimitNm(700, 1.4));
    expect(K.knowAbbeLimitNm(550, 1.4)).toBeLessThan(K.knowAbbeLimitNm(550, 0.65));
  });
  it('the chart plots the computed Abbe value and sourced points only', () => {
    const P = Object.fromEntries(K.KNOW_RESOLUTION.map((p) => [p.id, p]));
    expect(P.abbe.nm).toBe(K.knowAbbeLimitNm(550, 1.4));
    expect(P.leeuwenhoek.nm).toBe(1350);          // Cocquyt et al. 2021, Utrecht lens
    expect([P.superres.lo, P.superres.hi]).toEqual([20, 50]);
    expect(P.tem.nm).toBe(2);
    expect(P.cryoem.nm).toBeCloseTo(0.122, 3);    // 1.22 Å, Nakane et al. 2020
    K.KNOW_RESOLUTION.forEach((p) => expect(p.note, p.id).toMatch(/\(|Abbe/));
    // Hooke's resolution was never measured, so it is an annotation, not a point.
    expect(K.KNOW_RESOLUTION.some((p) => /Hooke/.test(p.label))).toBe(false);
  });
  it('what a setting can show: below the limit blurs; above it may still need magnification', () => {
    expect(K.knowResolveStatus(100, 220, 1000)).toBe('blur');    // influenza vs light
    expect(K.knowResolveStatus(2000, 220, 1000)).toBe('ok');     // E. coli at 1000x
    expect(K.knowResolveStatus(2000, 1100, 40)).toBe('tiny');    // resolvable, image 0.08 mm
    expect(K.knowResolveStatus(7500, 220, 100)).toBe('ok');
    expect(K.knowFormatLength(1350)).toBe('1.35 µm');
    expect(K.knowFormatLength(196)).toBe('196 nm');
    expect(K.knowFormatLength(100000)).toBe('100 µm');
    expect(K.knowFormatLength(0.122)).toBe('0.12 nm');
    expect(K.knowLogFrac(1000, 10000, 10)).toBeCloseTo(1 / 3, 6);
  });
});

describe('Streak plate', () => {
  it('colony numbers fall each quadrant and quadrant 4 has isolated colonies', () => {
    const p = K.knowStreakPlate();
    expect(p.counts[0]).toBe(0);                       // quadrant 1 is drawn as a lawn
    expect(p.counts[1]).toBeGreaterThan(p.counts[2]);
    expect(p.counts[2]).toBeGreaterThan(p.counts[3]);
    expect(p.counts[3]).toBeGreaterThan(0);
    expect(p.isolated[3]).toBeGreaterThanOrEqual(3);
    expect(p.isolated[1]).toBe(0);                     // the crowded quadrant has none
    p.colonies.forEach((c) => {
      const r = Math.hypot(c.x - p.cx, c.y - p.cy);
      expect(r + c.r, 'colony inside the agar').toBeLessThan(p.R);
    });
    expect(K.knowStreakPlate()).toBe(p);               // memoised, same every render
  });
});

describe('Limits of life', () => {
  const row = (w, id) => K.KNOW_LIMITS[w].rows.find((r) => r.id === id);
  it('record values match their primary sources', () => {
    expect(row('temp', 'methanopyrus').v).toBe(122);   // Takai et al. 2008, 20 MPa
    expect(row('temp', 'methanopyrus').val).toMatch(/20 MPa/);
    expect(row('temp', 'planococcus').v).toBe(-15);    // Mykytczuk et al. 2013
    expect([row('temp', 'pyrolobus').lo, row('temp', 'pyrolobus').hi, row('temp', 'pyrolobus').v]).toEqual([90, 113, 106]);
    expect([row('ph', 'picrophilus').v, row('ph', 'picrophilus').lo]).toEqual([0.7, 0]);
    expect([row('ph', 'alkaliphilus').lo, row('ph', 'alkaliphilus').hi]).toEqual([8.5, 12.5]);
  });
  it('every bar and pin sits on its axis', () => {
    for (const w of ['temp', 'ph']) {
      const L = K.KNOW_LIMITS[w];
      L.rows.forEach((r) => {
        ['lo', 'hi', 'v'].forEach((f) => { if (typeof r[f] === 'number') { expect(r[f], r.id).toBeGreaterThanOrEqual(L.lo); expect(r[f], r.id).toBeLessThanOrEqual(L.hi); } });
        if (typeof r.lo === 'number') expect(r.hi, r.id).toBeGreaterThan(r.lo);
        if (typeof r.v === 'number' && typeof r.lo === 'number') { expect(r.v).toBeGreaterThanOrEqual(r.lo); expect(r.v).toBeLessThanOrEqual(r.hi); }
        expect(r.color, r.id).toMatch(/^#[0-9a-f]{6}$/);
      });
    }
  });
});
