// Universe Explorer, sixteenth pass (2026-10-19): Star Lifecycle gets "Our Sun's fate, to
// scale". Orbits are drawn at their true ratio; the Sun's mass loss widens them (a ~ 1/mass),
// and a planet the red giant swallows stays gone when the white dwarf appears.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true, showStarLife: true }, state) });
const stage = (id) => pure.UNIVERSE_SUN_STAGES.find((s) => s.id === id);
const fates = (id) => Object.fromEntries(pure.universeSunPlanets(stage(id)).map((p) => [p.name, p.fate]));

describe('Sun fate model (pure)', () => {
  it('swallows Mercury and Venus, spares Earth and Mars, at the red giant tip', () => {
    expect(fates('now')).toEqual({ Mercury: 'outside', Venus: 'outside', Earth: 'outside', Mars: 'outside' });
    expect(fates('giant')).toEqual({ Mercury: 'engulfed', Venus: 'engulfed', Earth: 'outside', Mars: 'outside' });
  });

  it('keeps swallowed planets gone for the white dwarf', () => {
    expect(fates('dwarf')).toEqual({ Mercury: 'gone', Venus: 'gone', Earth: 'outside', Mars: 'outside' });
  });

  it('widens orbits as the Sun loses mass', () => {
    const earth = (id) => pure.universeSunPlanets(stage(id)).find((p) => p.name === 'Earth').au;
    expect(earth('now')).toBe(1);
    expect(earth('giant')).toBeCloseTo(1.49, 2);
    expect(earth('dwarf')).toBeCloseTo(1.85, 2);
  });

  it('has radii consistent with the notes (250 times wider; Earth-sized)', () => {
    expect(stage('giant').radius / stage('now').radius).toBeGreaterThan(240);
    expect(stage('giant').radius / stage('now').radius).toBeLessThan(270);
    expect(stage('dwarf').radius * 149597870.7).toBeGreaterThan(6000);
    expect(stage('dwarf').radius * 149597870.7).toBeLessThan(6700);
  });
});

describe('Sun fate lab (rendered)', () => {
  it('starts today, with the Sun as a dot and the right width', () => {
    const html = render({});
    expect(html.includes('Today the Sun is a tiny dot at this scale: its whole width is about 1.4 million km')).toBe(true);
  });

  it('marks each planet’s fate in the picture', () => {
    const svg = sliceBetween(render({ sunFate: 'giant' }), 'data-planet="Mercury"', '</svg>');
    expect(svg.includes('data-fate="engulfed"')).toBe(true);
    expect(svg.includes('data-planet="Earth" data-fate="outside"')).toBe(true);
    const dwarf = sliceBetween(render({ sunFate: 'dwarf' }), 'uni-sunfate-title', '</svg>');
    expect(dwarf.includes('data-planet="Mercury"')).toBe(false);
    expect(dwarf.includes('data-planet="Earth"')).toBe(true);
    expect(render({ sunFate: 'dwarf' }).includes('Mercury and Venus are gone, swallowed by the red giant.')).toBe(true);
  });
});
