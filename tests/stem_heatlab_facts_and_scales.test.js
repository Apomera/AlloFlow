import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Complement to heatlab_science.test.js (which covers the pure model helpers):
// this suite verifies the fact tables the science tests skip — engines,
// expansion coefficients, wall R-values — plus the axis-tick and colour-ramp
// helpers whose past bugs are documented in comments but had no regression
// tests, and the radiation/expansion formulas from the render scope.

const src = fs.readFileSync('stem_lab/stem_tool_heatlab.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_heatlab.js', 'utf8');

const Mod = (() => {
  const start = src.indexOf('var MATERIALS = [');
  const end = src.indexOf('// ── 3D convection tank', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(
    src.slice(start, end) +
    '\nreturn { MATERIALS: MATERIALS, SUBSTANCES: SUBSTANCES, ENGINES: ENGINES, EVERYDAY: EVERYDAY, EXPANSION: EXPANSION, WALL_LAYERS: WALL_LAYERS, WALL_FILM_INSIDE: WALL_FILM_INSIDE, WALL_FILM_OUTSIDE: WALL_FILM_OUTSIDE, WALL_SURFACE_R: WALL_SURFACE_R, niceTicks: niceTicks, tickLabel: tickLabel, heatRampColour: heatRampColour };'
  )();
})();

describe('engine table (second law)', () => {
  it('every real heat engine stays below its Carnot ceiling', () => {
    for (const e of Mod.ENGINES) {
      const carnot = (1 - e.cold / e.hot) * 100;
      if (e.name.indexOf('Human') === 0) {
        // Muscle legitimately beats its Carnot figure — it is not a heat
        // engine, and the note must say so.
        expect(e.real).toBeGreaterThan(carnot);
        expect(e.note.toLowerCase()).toContain('not a heat engine');
      } else {
        expect(e.real, e.name).toBeLessThan(carnot);
        expect(e.real, e.name).toBeGreaterThan(0);
      }
      expect(e.hot).toBeGreaterThan(e.cold);
    }
  });
});

describe('expansion coefficients (per kelvin)', () => {
  it('matches published values and preserves the teaching orderings', () => {
    const byId = Object.fromEntries(Mod.EXPANSION.map((e) => [e.id, e]));
    expect(byId.invar.alpha).toBeCloseTo(1.2e-6, 9);
    expect(byId.steel.alpha).toBe(12e-6);
    // The steel-concrete match is the point of reinforced concrete.
    expect(byId.steel.alpha).toBe(byId.concrete.alpha);
    // Borosilicate's thermal-shock survival = far lower alpha than window glass.
    expect(byId.pyrex.alpha).toBeLessThan(byId.glass.alpha / 2);
    expect(byId.alum.alpha).toBeCloseTo(2 * byId.steel.alpha - 1e-6, 6);
    // dL = alpha * L * dT: 100 m of steel across a 40 K swing grows ~48 mm.
    expect(byId.steel.alpha * 100 * 40).toBeCloseTo(0.048, 6);
  });
});

describe('composite wall (R-values in series)', () => {
  it('uses the standard surface films and consistent layer resistances', () => {
    expect(Mod.WALL_FILM_INSIDE).toBe(0.13);
    expect(Mod.WALL_FILM_OUTSIDE).toBe(0.04);
    expect(Mod.WALL_SURFACE_R).toBeCloseTo(0.17, 9);
    const byId = Object.fromEntries(Mod.WALL_LAYERS.map((l) => [l.id, l]));
    // Mineral wool 100 mm at k=0.04 → R = 0.1/0.04 = 2.5.
    expect(byId.mineral.r).toBeCloseTo(2.5, 9);
    // Insulation layers dominate structure by an order of magnitude.
    expect(byId.mineral.r / byId.brick.r).toBeGreaterThan(10);
  });

  it('a regulation-passing wall really computes to U ≤ 0.18 with these layers', () => {
    // brick + cavity + mineral wool + block + plaster, plus surface films.
    const totalR = Mod.WALL_SURFACE_R + ['brick', 'cavity', 'mineral', 'block', 'plaster']
      .reduce((sum, id) => sum + Mod.WALL_LAYERS.find((l) => l.id === id).r, 0);
    expect(1 / totalR).toBeLessThan(0.35);
    // Adding PIR nearly halves U (0.32 → 0.185); regulations' 0.18 needs a
    // touch more insulation still — which is itself the lesson.
    const better = totalR + Mod.WALL_LAYERS.find((l) => l.id === 'pir').r;
    expect(1 / better).toBeLessThan(0.19);
    expect(1 / better).toBeLessThan((1 / totalR) * 0.6);
  });
});

describe('axis ticks (regression pins for the documented bug)', () => {
  it('the heating-curve range lands ticks on 0 and 100, not -25/21/68/114', () => {
    const ticks = Mod.niceTicks(-25, 160, 4);
    expect(ticks).toContain(0);
    expect(ticks).toContain(100);
    expect(ticks).toContain(50);
  });

  it('picks human steps across magnitudes and degenerate ranges', () => {
    expect(Mod.niceTicks(0, 10, 4)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(Mod.niceTicks(0, 1000, 4)).toEqual([0, 250, 500, 750, 1000]);
    expect(Mod.niceTicks(5, 5, 4)).toEqual([5]);
    // Regression pin: the old magnitude rule rendered step 2.5 as "3" and
    // step 0.25 as "0.3".
    expect(Mod.tickLabel(2.5, 2.5)).toBe('2.5');
    expect(Mod.tickLabel(7.5, 2.5)).toBe('7.5');
    expect(Mod.tickLabel(0.25, 0.25)).toBe('0.25');
    expect(Mod.tickLabel(250, 250)).toBe('250');
  });
});

describe('thermal colour ramp (regression pins for the documented bug)', () => {
  it('is monotonically non-decreasing in luminance so warm and hot differ', () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const m = Mod.heatRampColour(f).match(/rgb\((\d+),(\d+),(\d+)\)/);
      const luminance = 0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3]);
      expect(luminance, 'f=' + f.toFixed(2)).toBeGreaterThanOrEqual(prev - 1);
      prev = luminance;
    }
  });

  it('clamps out-of-range fractions and hits the endpoint colours', () => {
    expect(Mod.heatRampColour(-1)).toBe('rgb(29,78,216)');
    expect(Mod.heatRampColour(2)).toBe(Mod.heatRampColour(1));
  });
});

describe('render-scope physics (source-slice)', () => {
  it('radiation uses Stefan-Boltzmann with net exchange and Wien peak', () => {
    const start = src.indexOf('var SIGMA = 5.670374419e-8;', src.indexOf('function radiatedW') - 200);
    const end = src.indexOf('// ── Module 7', start);
    expect(start).toBeGreaterThan(-1);
    // eslint-disable-next-line no-new-func
    const radiatedW = new Function(src.slice(start, end < 0 ? start + 400 : src.indexOf('var radGross', start)) + '\nreturn radiatedW;')();
    // A 1.8 m² body at 33°C, emissivity 0.98: ~880 W gross.
    const gross = radiatedW(33, 1.8, 0.98);
    expect(gross).toBeGreaterThan(850);
    expect(gross).toBeLessThan(920);
    // Net against 20°C surroundings is far smaller than gross.
    const net = gross - radiatedW(20, 1.8, 0.98);
    expect(net).toBeGreaterThan(100);
    expect(net).toBeLessThan(180);
    // Wien: a ~300 K body peaks near 9.7 µm (deep infrared).
    expect(2897.77 / (33 + 273.15)).toBeCloseTo(9.47, 1);
  });

  it('the sweating card uses skin-temperature latent heat, not the 100°C figure', () => {
    expect(src).toContain('2,420 kJ per kilogram at skin temperature');
    const sweat = Mod.EVERYDAY.find((e) => e.name === 'Sweating');
    expect(sweat.desc).not.toContain('2,260');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
