import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// These assertions are written against PUBLISHED values — NIST, IPCC, standard
// engineering tables — rather than against whatever the tool currently returns.
// That is deliberate: every error this suite has caught was in a constant or a
// sentence chosen by intuition, never in the equations, and a test that merely
// pins current behaviour would have caught none of them.

const SRC = fs.readFileSync('stem_lab/stem_tool_heatlab.js', 'utf8');

function table(startMark) {
  const a = SRC.indexOf(startMark);
  const b = SRC.indexOf('\n  ];', a);
  expect(a, 'data table not found: ' + startMark).toBeGreaterThan(-1);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}

const MATERIALS = table('var MATERIALS = [');
const SUBSTANCES = table('var SUBSTANCES = [');
const ENGINES = table('var ENGINES = [');
const EXPANSION = table('var EXPANSION = [');
const WALL = table('var WALL_LAYERS = [');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
});

describe('Heat lab material constants', () => {
  it('matches published thermal conductivity and specific heat', () => {
    const ref = { copper: [401, 385], aluminium: [237, 897], steel: [50, 490], water: [0.6, 4186], aerogel: [0.015, 1000] };
    for (const [id, [k, c]] of Object.entries(ref)) {
      const m = MATERIALS.find(x => x.id === id);
      expect(m, id + ' missing').toBeTruthy();
      expect(Math.abs(m.k - k) / k, id + ' conductivity').toBeLessThan(0.05);
      expect(Math.abs(m.c - c) / c, id + ' specific heat').toBeLessThan(0.05);
    }
  });

  it('never allows a zero constant, which would divide by zero in the diffusivity', () => {
    for (const m of MATERIALS) {
      expect(m.k, m.name).toBeGreaterThan(0);
      expect(m.c, m.name).toBeGreaterThan(0);
      expect(m.rho, m.name).toBeGreaterThan(0);
    }
  });

  it("puts copper's diffusivity at about 116 mm2/s and orders of magnitude above aerogel", () => {
    const alpha = m => m.k / (m.rho * m.c);
    const cu = alpha(MATERIALS.find(m => m.id === 'copper'));
    const ag = alpha(MATERIALS.find(m => m.id === 'aerogel'));
    expect(cu * 1e6).toBeCloseTo(116, 0);
    expect(cu / ag).toBeGreaterThan(100);
  });
});

describe('Calorimetry', () => {
  const mix = (c1, m1, t1, c2, m2, t2) => (m1 * c1 * t1 + m2 * c2 * t2) / (m1 * c1 + m2 * c2);

  it('lands exactly halfway for equal masses of the same substance', () => {
    expect(mix(4186, 1, 20, 4186, 1, 80)).toBeCloseTo(50, 6);
  });

  it('never returns a temperature outside the two inputs', () => {
    for (let i = 0; i < 400; i++) {
      const a = SUBSTANCES[i % SUBSTANCES.length];
      const b = SUBSTANCES[(i * 3) % SUBSTANCES.length];
      const ta = (i * 7) % 101, tb = (i * 13) % 101;
      const f = mix(a.c, 0.1 + (i % 20) / 10, ta, b.c, 0.1 + (i % 17) / 10, tb);
      expect(f).toBeGreaterThanOrEqual(Math.min(ta, tb) - 1e-9);
      expect(f).toBeLessThanOrEqual(Math.max(ta, tb) + 1e-9);
    }
  });

  it('shows water resisting temperature change against hot iron', () => {
    const water = SUBSTANCES.find(s => s.id === 'water');
    const iron = SUBSTANCES.find(s => s.id === 'iron');
    const r = mix(water.c, 0.5, 20, iron.c, 0.5, 90);
    expect(r).toBeGreaterThan(20);
    expect(r).toBeLessThan(35);
  });
});

describe('Water heating curve', () => {
  function state(kJ) {
    let e = kJ * 1000;
    if (e < 2090 * 20) return { phase: 'Ice', temp: -20 + e / 2090 };
    e -= 2090 * 20;
    if (e < 334000) return { phase: 'Ice melting', temp: 0 };
    e -= 334000;
    if (e < 4186 * 100) return { phase: 'Liquid water', temp: e / 4186 };
    e -= 4186 * 100;
    if (e < 2260000) return { phase: 'Water boiling', temp: 100 };
    e -= 2260000;
    return { phase: 'Steam', temp: 100 + e / 2010 };
  }

  it('holds temperature flat through both latent plateaus', () => {
    expect(state(200)).toEqual({ phase: 'Ice melting', temp: 0 });
    expect(state(1500)).toEqual({ phase: 'Water boiling', temp: 100 });
  });

  it('places the stage boundaries at the published latent heats', () => {
    expect(state(41.8).phase).toBe('Ice melting');
    expect(state(376).phase).toBe('Liquid water');
    expect(state(795).temp).toBeCloseTo(100, 0);
    expect(state(3060).phase).toBe('Steam');
  });

  it('never lets temperature fall as energy goes in', () => {
    let prev = -Infinity;
    for (let kJ = 0; kJ <= 3100; kJ += 5) {
      const t = state(kJ).temp;
      expect(t).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = t;
    }
  });

  it('reaches steam within the slider range, so the badge is attainable', () => {
    expect(state(3100).phase).toBe('Steam');
  });
});

describe('Heat engines', () => {
  it('never claims a heat engine beats its own Carnot limit', () => {
    for (const e of ENGINES) {
      if (e.name.includes('Human')) continue;
      expect(e.real, e.name).toBeLessThanOrEqual((1 - e.cold / e.hot) * 100);
    }
  });

  it('explains the body as the one entry that is not a heat engine', () => {
    const body = ENGINES.find(e => e.name.includes('Human'));
    expect(body.real).toBeGreaterThan((1 - body.cold / body.hot) * 100);
    expect(body.note).toMatch(/not a heat engine/i);
    // the chart must be skipped for it, or the three shares would total 120%
    expect(SRC).toMatch(/useful > carnot/);
  });

  it('splits fuel energy into three shares that total exactly 100%', () => {
    for (const e of ENGINES) {
      const carnot = (1 - e.cold / e.hot) * 100;
      if (e.real > carnot) continue;
      const total = e.real + Math.max(0, carnot - e.real) + Math.max(0, 100 - carnot);
      expect(total, e.name).toBeCloseTo(100, 9);
    }
  });

  it('covers both a second-law-dominated and an engineering-dominated engine', () => {
    let law = 0, eng = 0;
    for (const e of ENGINES) {
      const carnot = (1 - e.cold / e.hot) * 100;
      if (e.real > carnot) continue;
      if (100 - carnot > carnot - e.real) law++; else eng++;
    }
    expect(law, 'a steam plant near its thermodynamic floor').toBeGreaterThanOrEqual(1);
    expect(eng, 'a petrol engine with recoverable losses').toBeGreaterThanOrEqual(1);
  });
});

describe('Composite wall', () => {
  const SURFACE = 0.17;
  const R = ids => ids.reduce((s, id) => s + WALL.find(w => w.id === id).r, SURFACE);
  const U = ids => 1 / R(ids);

  it('adds resistances in series, so layer order cannot matter', () => {
    expect(R(['brick', 'mineral'])).toBeCloseTo(R(['mineral', 'brick']), 12);
  });

  it('keeps the two still-air surface films even with no layers', () => {
    expect(U([])).toBeCloseTo(1 / SURFACE, 9);
  });

  it('shows that mass is not insulation', () => {
    const brickWall = Array(13).fill('brick');
    expect(U(brickWall), 'thirteen layers of brick').toBeGreaterThan(0.18);
  });

  it('makes the 0.18 target reachable but not trivial', () => {
    expect(U(['brick', 'cavity', 'block', 'plaster']), 'default wall').toBeGreaterThan(0.18);
    expect(U(['brick', 'cavity', 'mineral', 'block', 'plaster']), 'one batt').toBeGreaterThan(0.18);
    expect(U(['brick', 'cavity', 'mineral', 'mineral', 'block', 'plaster']), 'two batts').toBeLessThanOrEqual(0.18);
  });
});

describe('Radiation and thermal expansion', () => {
  const SIGMA = 5.670374419e-8;
  const rad = (c, a, e) => e * SIGMA * a * Math.pow(c + 273.15, 4);

  it('obeys the fourth-power law exactly', () => {
    expect(rad(600 - 273.15, 1, 1) / rad(300 - 273.15, 1, 1)).toBeCloseTo(16, 2);
  });

  it('defaults to skin temperature, not core temperature', () => {
    // 37 C is core; skin sits near 33 C, and using the core figure overstates
    // the radiated power by about a third.
    expect(SRC).toMatch(/d\.radT : 33/);
  });

  it('matches published linear expansion coefficients', () => {
    const ref = { steel: 12e-6, alum: 23e-6, copper: 17e-6, glass: 9e-6, pyrex: 3.3e-6, invar: 1.2e-6, concrete: 12e-6 };
    for (const [id, a] of Object.entries(ref)) {
      const e = EXPANSION.find(x => x.id === id);
      expect(Math.abs(e.alpha - a) / a, id).toBeLessThan(0.08);
    }
  });

  it('reproduces the 480 mm movement of a kilometre of steel rail over 40 K', () => {
    const steel = EXPANSION.find(e => e.id === 'steel');
    expect(steel.alpha * 1000 * 40 * 1000).toBeCloseTo(480, 0);
  });

  it('keeps steel and concrete near-identical, which reinforced concrete depends on', () => {
    const steel = EXPANSION.find(e => e.id === 'steel');
    const concrete = EXPANSION.find(e => e.id === 'concrete');
    expect(Math.abs(steel.alpha - concrete.alpha)).toBeLessThan(2e-6);
  });
});

describe('Heat lab renders', () => {
  it('renders without throwing and names its modules', () => {
    const html = renderTool('heatLab', {});
    expect(html).toContain('Heat &amp; Thermodynamics Lab');
    expect(html).toContain('The three ways heat moves');
    expect(html).toContain('Entropy');
    expect(html).toContain('Heat pumps');
  });

  it('states the model limits rather than implying licensing accuracy', () => {
    const html = renderTool('heatLab', {});
    expect(html).toMatch(/order-of-magnitude accurate for teaching/i);
  });
});
