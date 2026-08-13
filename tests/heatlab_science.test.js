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
let HEAT_MODELS;

beforeEach(() => {
  resetStemLab();
  const tool = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
  HEAT_MODELS = tool.models;
  expect(HEAT_MODELS).toBeTruthy();
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
  const mix = (c1, m1, t1, c2, m2, t2) => HEAT_MODELS.mixTemperature({ c: c1 }, m1, t1, { c: c2 }, m2, t2);

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

  it('explains unequal masses using total heat capacity, not specific heat alone', () => {
    const water = SUBSTANCES.find(s => s.id === 'water');
    const iron = SUBSTANCES.find(s => s.id === 'iron');
    const text = HEAT_MODELS.mixExplanation(water, 0.1, 20, iron, 2, 90);
    expect(text).toMatch(/iron has the larger total heat capacity/i);
    expect(text).toMatch(/mass × specific heat/i);
  });
});

describe('Water heating curve', () => {
  const state = kJ => {
    const result = HEAT_MODELS.waterState(kJ);
    return { phase: result.phase, temp: result.temp };
  };

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

describe('Insulated mug cooling model', () => {
  it('uses the exact Newton-cooling solution and starts at the stated 90 degrees', () => {
    const fibre = MATERIALS.find(m => m.id === 'fibre');
    const curve = HEAT_MODELS.coolingCurve(fibre, 10, 60);
    const rTotal = (0.010 / fibre.k) + 0.12;
    const conductance = 0.045 / rTotal;
    const expectedAfterHour = 20 + 70 * Math.exp(-(conductance * 3600) / (0.35 * 4186));

    expect(curve).toHaveLength(61);
    expect(curve[0]).toBe(90);
    expect(curve[60]).toBeCloseTo(expectedAfterHour, 10);
    for (let minute = 1; minute < curve.length; minute++) {
      expect(curve[minute]).toBeLessThan(curve[minute - 1]);
      expect(curve[minute]).toBeGreaterThan(20);
    }
  });

  it('retains more heat with lower conductivity or greater thickness', () => {
    const copper = MATERIALS.find(m => m.id === 'copper');
    const fibre = MATERIALS.find(m => m.id === 'fibre');
    const aerogel = MATERIALS.find(m => m.id === 'aerogel');
    const afterHour = (material, mm) => HEAT_MODELS.coolingTemperature(material, mm, 60);

    expect(afterHour(fibre, 20)).toBeGreaterThan(afterHour(fibre, 10));
    expect(afterHour(aerogel, 10)).toBeGreaterThan(afterHour(fibre, 10));
    expect(afterHour(fibre, 10)).toBeGreaterThan(afterHour(copper, 10));
  });
});

describe('Conduction race model', () => {
  it('keeps a ten-second copper step finite, bounded, and equivalent to safe smaller steps', () => {
    const copper = MATERIALS.find(m => m.id === 'copper');
    const oneStep = new Float64Array(90);
    const splitSteps = new Float64Array(90);
    oneStep.fill(20);
    splitSteps.fill(20);

    HEAT_MODELS.advanceBar(oneStep, copper, 200, 10, 0.20);
    for (let i = 0; i < 10; i++) HEAT_MODELS.advanceBar(splitSteps, copper, 200, 1, 0.20);

    for (const value of oneStep) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(value).toBeLessThanOrEqual(200 + 1e-9);
    }
    expect(oneStep[Math.floor(oneStep.length / 2)]).toBeCloseTo(splitSteps[Math.floor(splitSteps.length / 2)], 1);
  });

  it('names the same winner and positive ratio regardless of bar order', () => {
    const copper = MATERIALS.find(m => m.id === 'copper');
    const wood = MATERIALS.find(m => m.id === 'wood');
    const forward = HEAT_MODELS.racePrediction(copper, wood);
    const reverse = HEAT_MODELS.racePrediction(wood, copper);
    expect(forward.fasterId).toBe('copper');
    expect(reverse.fasterId).toBe('copper');
    expect(forward.ratio).toBeGreaterThan(1);
    expect(reverse.ratio).toBeCloseTo(forward.ratio, 12);
  });

  it('uses one shared 50 degree finish line in the model and accessible copy', () => {
    expect(HEAT_MODELS.finishC).toBe(50);
    const html = renderTool('heatLab', {});
    expect(html).toContain('The finish line is 50 °C at the midpoint');
    expect(SRC).not.toMatch(/passes 100 degrees/i);
  });
});

describe('Heat pump boundary', () => {
  it('marks heating COP undefined when outdoor temperature meets or exceeds the target', () => {
    expect(HEAT_MODELS.heatPump(20, 15)).toMatchObject({
      heating: false,
      idealCOP: null,
      realisticCOP: null
    });
    expect(HEAT_MODELS.heatPump(20, 20).heating).toBe(false);
  });

  it('keeps ordinary heating conditions finite and renders no Infinity boundary values', () => {
    const ordinary = HEAT_MODELS.heatPump(2, 21);
    expect(ordinary.heating).toBe(true);
    expect(Number.isFinite(ordinary.idealCOP)).toBe(true);
    expect(Number.isFinite(ordinary.realisticCOP)).toBe(true);

    const html = renderTool('heatLab', { _heatLab: { hpOut: 20, hpIn: 15 } });
    expect(html).toMatch(/No heating lift is required/i);
    expect(html).not.toMatch(/Infinity|∞/);
  });

  it('keeps the practical teaching estimate plausible near zero lift while leaving Carnot uncapped', () => {
    const mild = HEAT_MODELS.heatPump(20, 21);
    const ordinary = HEAT_MODELS.heatPump(2, 21);
    const veryCold = HEAT_MODELS.heatPump(-20, 21);
    expect(mild.idealCOP).toBeGreaterThan(100);
    expect(mild.realisticCOP).toBeLessThanOrEqual(8);
    expect(ordinary.realisticCOP).toBeGreaterThan(veryCold.realisticCOP);
    expect(ordinary.equipmentLiftK).toBeGreaterThan(ordinary.liftK);
    const html = renderTool('heatLab', { _heatLab: { hpOut: 20, hpIn: 21 } });
    expect(html).toContain('Teaching estimate COP');
    expect(html).toMatch(/not a product rating/i);
    expect(html).not.toMatch(/Realistic COP/);
  });

  it('keeps the COP curve above the bar-heater line the caption promises', () => {
    // The chart draws a reference line at 1.0 and the caption under it states
    // the curve "never touches 1.0". That sentence is only true because of how
    // the approach temperatures and defrost penalty happen to be tuned, so it
    // is worth pinning across the whole of both sliders rather than trusting it.
    for (let indoor = 15; indoor <= 26; indoor++) {
      for (let outdoor = -20; outdoor < indoor; outdoor += 0.5) {
        const m = HEAT_MODELS.heatPump(outdoor, indoor);
        if (!m.heating) continue;
        expect(m.realisticCOP, `outdoor ${outdoor}, indoor ${indoor}`).toBeGreaterThan(1);
      }
    }
    const html = renderTool('heatLab', { _heatLab: { hpOut: -20, hpIn: 21 } });
    expect(html).toMatch(/never touches 1\.0/);
  });

  it('describes insulation and entropy limits without contradicting the implemented models', () => {
    const html = renderTool('heatLab', { _heatLab: { thickness: 10, entSplit: 39 } });
    expect(html).toMatch(/approaches a one-half reduction only when the wrap dominates/i);
    expect(html).toMatch(/near equilibrium, not exactly at it/i);
    expect(html).not.toMatch(/still-air film.*sets a floor/i);
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

  it('splits the surface films for display without moving the total they contribute', () => {
    // The cross-section drawing shows the inside and outside air films as
    // separate bands so the arithmetic on screen adds up. Their SUM is what
    // every U-value on the page depends on, so a change to one film that is not
    // matched by the other would silently shift every result in this section.
    const inside = Number(/var WALL_FILM_INSIDE = ([\d.]+)/.exec(SRC)[1]);
    const outside = Number(/var WALL_FILM_OUTSIDE = ([\d.]+)/.exec(SRC)[1]);
    expect(inside + outside).toBeCloseTo(SURFACE, 9);
    // Published still-air film resistances: the inside face resists appreciably
    // more than the wind-scoured outside face.
    expect(inside).toBeGreaterThan(outside);

    const html = renderTool('heatLab', {});
    expect(html).toContain('Inside air film');
    expect(html).toContain('Outside air film');
  });

  it('makes the 0.18 target reachable but not trivial', () => {
    expect(U(['brick', 'cavity', 'block', 'plaster']), 'default wall').toBeGreaterThan(0.18);
    expect(U(['brick', 'cavity', 'mineral', 'block', 'plaster']), 'one batt').toBeGreaterThan(0.18);
    expect(U(['brick', 'cavity', 'mineral', 'mineral', 'block', 'plaster']), 'two batts').toBeLessThanOrEqual(0.18);
  });
});

describe('Radiation and thermal expansion', () => {
  it('obeys the fourth-power law exactly', () => {
    const hot = HEAT_MODELS.radiation(600 - 273.15, 20, 1, 1);
    const cool = HEAT_MODELS.radiation(300 - 273.15, 20, 1, 1);
    expect(hot.emittedW / cool.emittedW).toBeCloseTo(16, 10);
  });

  it('keeps net radiation signed and describes cold surfaces in the correct direction', () => {
    const equal = HEAT_MODELS.radiation(20, 20, 1.8, 0.98);
    const cold = HEAT_MODELS.radiation(-20, 20, 1.8, 0.98);
    const warm = HEAT_MODELS.radiation(33, 20, 1.8, 0.98);
    expect(equal.netToRoomW).toBeCloseTo(0, 12);
    expect(cold.netToRoomW).toBeLessThan(0);
    expect(warm.netToRoomW).toBeGreaterThan(0);

    const html = renderTool('heatLab', { _heatLab: { radT: -20 } });
    expect(html).toContain('Net absorbed from a 20 °C room');
    expect(html).toMatch(/surface is colder than the room/i);
    expect(html).not.toMatch(/Net into a 20 °C room/);
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

  it('provides concise live results and phone-width slider layouts', () => {
    const html = renderTool('heatLab', { _heatLab: { thickness: 10, energyIn: 200 } });
    expect(html).toMatch(/aria-controls=.ht-insulation-status./);
    expect(html).toMatch(/aria-controls=.ht-heating-status./);
    expect(html).toMatch(/id=.ht-insulation-status./);
    expect(html).toMatch(/id=.ht-heating-status./);
    expect((html.match(/role=.status./g) || []).length).toBeGreaterThanOrEqual(3);
    expect(SRC).toContain('grid-cols-[minmax(0,1fr)_auto]');
    expect(SRC).toContain('grid-cols-1 sm:grid-cols-3');
    expect(SRC).toMatch(/htmlFor: id, id: id \+ '-value'/);
    expect(SRC).toContain('w-full min-w-0 h-11 accent-orange-500');
  });

  it('keeps chart data disclosures independent and explicitly connected', () => {
    const html = renderTool('heatLab', {});
    const collapsedDisclosures = html.match(/aria-expanded=.false./g);
    expect(html).toMatch(/aria-controls=.ht-table-cooling./);
    expect(html).toMatch(/aria-controls=.ht-table-heating./);
    expect(collapsedDisclosures ? collapsedDisclosures.length : 0).toBeGreaterThanOrEqual(2);
    expect(SRC).toMatch(/dataTable\('cooling'/);
    expect(SRC).toMatch(/dataTable\('heating'/);
    expect(SRC).toContain('var tableVisibility = stTables[0]');
    expect(SRC).not.toContain('var showTables =');
  });

  // Same drift as the nuclear lab: sections were inserted without renumbering,
  // so the tool shipped reading 1,2,3,4,3,4,5,-,6,7,8,9,10 — two 3s, two 4s,
  // and the 3D convection card with no number at all.
  it('numbers its sections 1..N with no duplicates or gaps', () => {
    const nums = [...SRC.matchAll(/heading\([^,]+, '[^']*?(\d+)\. /g)].map((m) => Number(m[1]));
    expect(nums.length).toBeGreaterThan(10);
    expect(nums).toEqual(nums.map((_, i) => i + 1));
  });

  it('keeps the topic index in the same order as the sections it links to', () => {
    const registry = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', grp: '[a-z]+', icon:/g)].map((m) => m[1]);
    const dom = [...SRC.matchAll(/^        sec\('([a-z0-9]+)'/gm)].map((m) => m[1]).filter((id) => id !== 'next');
    expect(registry.length).toBe(13);
    // Order IS the contract: the index prints each topic's position as its
    // section number, so a reordering that kept the same set would misnumber.
    expect(dom).toEqual(registry);
  });

  it('gives every indexed topic a reachable anchor and a jump button', () => {
    const html = renderTool('heatLab', {});
    const registry = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', grp: '[a-z]+', icon:/g)].map((m) => m[1]);
    registry.forEach((id) => expect(html, 'no anchor for ' + id).toContain('id="htsec-' + id + '"'));
    expect((html.match(/aria-label="Jump to /g) || []).length).toBe(registry.length);
    expect(html).toContain('aria-label="Heat lab topics"');
  });

  it('filters the index by search text without hiding the sections themselves', () => {
    const html = renderTool('heatLab', { _heatLab: { htQuery: 'carnot' } });
    const jumps = (html.match(/aria-label="Jump to /g) || []).length;
    expect(jumps).toBeGreaterThan(0);
    expect(jumps).toBeLessThan(13);
    expect(html).toContain('id="htsec-conduction"');
  });
});
