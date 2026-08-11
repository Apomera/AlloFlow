import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_treelab.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_treelab.js';

function render(toolData, overrides) {
  resetStemLab();
  loadTool(SOURCE, 'treeLab');
  return renderTool('treeLab', toolData || {}, overrides);
}

// The engine is deliberately exposed as pure functions with no DOM, ctx or React, so
// the biology can be tested directly instead of being inferred from rendered markup.
function engine() {
  resetStemLab();
  loadTool(SOURCE, 'treeLab');
  return window.__alloTreeLabEngine;
}

const GOOD_ENV = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
const ALLOC = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };

afterEach(() => vi.restoreAllMocks());

describe('Tree Life Lab — limiting factor is computed, not narrated', () => {
  it('names the factor that is actually smallest', () => {
    const E = engine();
    const oak = E.speciesById('oak');
    const cases = [
      [{ tempC: 22, light: 0.02, co2ppm: 420, soilWater: 0.8 }, 1, 'light'],
      [{ tempC: -3, light: 0.9, co2ppm: 420, soilWater: 0.8 }, 1, 'temperature'],
      [{ tempC: 24, light: 0.95, co2ppm: 150, soilWater: 1 }, 1, 'co2'],
    ];
    for (const [env, ap, expected] of cases) {
      expect(E.grossPhotosynthesis(oak, env, 50, ap).limiting.id).toBe(expected);
    }
  });

  it('blames WATER, not CO2, when drought has shut the stomata', () => {
    // In a drought the CO2 term is the smallest number, but only because water stress
    // closed the pores that admit CO2. Naming CO2 would send a student off to add CO2,
    // which this same tool teaches is useless to a tree that cannot open its stomata.
    const E = engine();
    const oak = E.speciesById('oak');
    const env = { tempC: 24, light: 0.9, co2ppm: 420, soilWater: 0.08 };
    const ap = E.stomatalAperture(env.soilWater, oak.droughtTol, false);
    const result = E.grossPhotosynthesis(oak, env, 50, ap);
    expect(result.factors.co2).toBeLessThan(result.factors.water);   // CO2 IS the minimum
    expect(result.limiting.id).toBe('water');                        // ...but water is the cause
    expect(result.limiting.viaStomata).toBe(true);
  });
});

describe('Tree Life Lab — the trade with no free side', () => {
  it('opens stomata fully only when there is water to spend', () => {
    const E = engine();
    expect(E.stomatalAperture(0.9, 0.5, false)).toBe(1);
    expect(E.stomatalAperture(0.05, 0.5, false)).toBeLessThan(0.3);
    expect(E.stomatalAperture(0.02, 0.5, true)).toBeLessThanOrEqual(0.02);
  });

  it('lets a drought-tolerant species hold out longer at the same soil water', () => {
    const E = engine();
    expect(E.stomatalAperture(0.3, 0.75, false)).toBeGreaterThan(E.stomatalAperture(0.3, 0.15, false));
  });

  it('makes extra CO2 nearly worthless in ABSOLUTE terms under drought', () => {
    // The ratio between two CO2 levels is fixed by the saturation curve and is
    // identical at every water status. What collapses under drought is the rate that
    // ratio applies to, so absolute gain is the only measure that carries the claim.
    const E = engine();
    const oak = E.speciesById('oak');
    const gain = (soilWater) => {
      const env = { tempC: 24, light: 0.9, co2ppm: 420, soilWater };
      const ap = E.stomatalAperture(soilWater, oak.droughtTol, false);
      const lo = E.grossPhotosynthesis(oak, env, 200, ap).gross;
      const hi = E.grossPhotosynthesis(oak, { ...env, co2ppm: 900 }, 200, ap).gross;
      return { abs: hi - lo, rel: (hi - lo) / Math.max(lo, 1e-12) };
    };
    const wet = gain(0.95);
    const dry = gain(0.06);
    expect(wet.abs).toBeGreaterThan(5);
    expect(dry.abs).toBeLessThan(0.2);
    expect(wet.abs / dry.abs).toBeGreaterThan(50);
    expect(Math.abs(wet.rel - dry.rel)).toBeLessThan(1e-6);
  });
});

describe('Tree Life Lab — respiration and self-shading are the two brakes', () => {
  it('charges for living tissue only, so heartwood is free to carry', () => {
    const E = engine();
    const oak = E.speciesById('oak');
    const live = { leafMass: 5, rootMass: 5, sapwoodMass: 10, heartwoodMass: 0 };
    const withHeart = { ...live, heartwoodMass: 500 };
    expect(E.maintenanceRespiration(oak, withHeart)).toBe(E.maintenanceRespiration(oak, live));
    expect(E.maintenanceRespiration(oak, { ...live, sapwoodMass: 40 }))
      .toBeGreaterThan(E.maintenanceRespiration(oak, live));
  });

  it('gives sublinear carbon returns on leaf area', () => {
    // Without a self-shading term the model runs away: more leaf produces more wood,
    // more wood raises the pipe-model cap, and the cap admits more leaf, forever.
    const E = engine();
    const oak = E.speciesById('oak');
    const env = { tempC: 24, light: 0.9, co2ppm: 420, soilWater: 0.9 };
    const small = E.grossPhotosynthesis(oak, env, 100, 1).gross;
    const big = E.grossPhotosynthesis(oak, env, 400, 1).gross;
    expect(big).toBeGreaterThan(small);
    expect(big / small).toBeLessThan(2.8);
  });
});

describe('Tree Life Lab — growth over centuries', () => {
  it('grows a 60-year oak to a plausible size', () => {
    const E = engine();
    const oak = E.speciesById('oak');
    let t = E.newTree('oak');
    for (let i = 0; i < 60; i++) t = E.simulateYear(t, oak, GOOD_ENV, ALLOC);
    expect(t.alive).toBe(true);
    expect(t.heightM).toBeGreaterThan(12);
    expect(t.heightM).toBeLessThan(22);
    expect(t.dbhCm).toBeGreaterThan(35);
    expect(t.dbhCm).toBeLessThan(65);
    expect(t.rings).toHaveLength(60);
    expect(t.heartwoodMass).toBeGreaterThan(0);
  });

  it('narrows rings with age even while the tree stays healthy', () => {
    // The misreading this exists to correct: narrow outer rings are usually geometry,
    // not decline. The same volume of wood spreads thinner around a longer circumference.
    const E = engine();
    const oak = E.speciesById('oak');
    let t = E.newTree('oak');
    for (let i = 0; i < 120; i++) t = E.simulateYear(t, oak, GOOD_ENV, ALLOC);
    const mean = (rs) => rs.reduce((a, r) => a + r.widthMm, 0) / rs.length;
    expect(mean(t.rings.slice(-10))).toBeLessThan(mean(t.rings.slice(20, 30)));
    expect(t.alive).toBe(true);                       // narrower, but not dying
    expect(t.rings.slice(-10).every((r) => !r.stress)).toBe(true);
  });

  it('kills a tree held in deep shade rather than letting it idle forever', () => {
    // A starving tree sheds canopy, which drops its respiration bill with it, so a
    // pure reserves test lets it survive indefinitely as a twig. Deficit YEARS is the
    // honest test.
    const E = engine();
    const oak = E.speciesById('oak');
    let t = E.newTree('oak');
    const dark = { tempC: 22, light: 0.005, co2ppm: 420, soilWater: 0.7 };
    for (let i = 0; i < 100 && t.alive; i++) t = E.simulateYear(t, oak, dark, ALLOC);
    expect(t.alive).toBe(false);
    expect(t.causeOfDeath).toBe('carbon_starvation');
  });

  it('keeps every species within a believable height-to-diameter ratio', () => {
    const E = engine();
    for (const sp of E.SPECIES) {
      let t = E.newTree(sp.id);
      for (let i = 0; i < 60 && t.alive; i++) t = E.simulateYear(t, sp, GOOD_ENV, ALLOC);
      const hd = (t.heightM * 100) / t.dbhCm;
      expect(hd, sp.name + ' H/D').toBeGreaterThan(12);
      expect(hd, sp.name + ' H/D').toBeLessThan(130);
      expect(Number.isFinite(t.heightM)).toBe(true);
      expect(t.rings.every((r) => Number.isFinite(r.widthMm))).toBe(true);
    }
  });

  it('gives every species every trait the engine and the scene read', () => {
    // This exact defect landed TWICE, both times from a scripted edit appending a
    // field onto a line that ended in a trailing comment, so the new trait was
    // commented out on one species only. The first time it silently NaN-ed every
    // height and ring; the second it silently fell back to a default crown shape.
    // A missing trait is now a hard failure rather than a plausible-looking picture.
    const E = engine();
    const REQUIRED = ['amax', 'respRate', 'maxHeight', 'maxAgeYears', 'woodDensity',
      'slenderness', 'crownWidth', 'tiers', 'droughtTol', 'barkThick', 'shadeTol'];
    for (const sp of E.SPECIES) {
      for (const key of REQUIRED) {
        expect(typeof sp[key], `${sp.id}.${key}`).toBe('number');
        expect(Number.isFinite(sp[key]), `${sp.id}.${key}`).toBe(true);
      }
      expect(Array.isArray(sp.modes) && sp.modes.length > 0, `${sp.id}.modes`).toBe(true);
      expect(typeof sp.leafType).toBe('string');
    }
  });

  it('degrades instead of emitting NaN when a species trait is missing', () => {
    // NaN propagates silently through clamp(), because Math.min/max return NaN. A
    // single undefined trait once turned every height and ring into NaN while the
    // carbon figures still looked healthy, which is exactly the defect that ships.
    const E = engine();
    const broken = { ...E.speciesById('oak') };
    delete broken.slenderness;
    let t = E.newTree('oak');
    for (let i = 0; i < 20; i++) t = E.simulateYear(t, broken, GOOD_ENV, ALLOC);
    expect(Number.isFinite(t.heightM)).toBe(true);
    expect(Number.isFinite(t.dbhCm)).toBe(true);
  });

  it('normalises any allocation, including an all-zero one', () => {
    const E = engine();
    const sum = (a) => a.leaf + a.root + a.wood + a.repro + a.store;
    expect(sum(E.normaliseAlloc({ leaf: 5, root: 5, wood: 5, repro: 5, store: 5 }))).toBeCloseTo(1, 9);
    expect(sum(E.normaliseAlloc({ leaf: 0, root: 0, wood: 0, repro: 0, store: 0 }))).toBeCloseTo(1, 9);
    expect(sum(E.normaliseAlloc(undefined))).toBeCloseTo(1, 9);
  });
});

describe('Tree Life Lab — reproduction is a real tradeoff', () => {
  it('lets one pathogen take an entire clonal cohort through the shared root system', () => {
    const E = engine();
    const res = E.resolveSpread({ root_sucker: 20 }, { id: 'pathogen', name: 'Root pathogen' }, E.lcg(42));
    const row = res.results.find((r) => r.id === 'root_sucker');
    expect(row.attempts).toBeGreaterThan(0);
    expect(row.wiped === true || row.took < row.attempts).toBe(true);
  });

  it('never wipes a seed cohort as a block', () => {
    const E = engine();
    const res = E.resolveSpread({ seed_wind: 20 }, { id: 'pathogen', name: 'Root pathogen' }, E.lcg(7));
    expect(res.results.some((r) => r.wiped)).toBe(false);
  });

  it('produces identical outcomes from the same seed so two runs can be compared', () => {
    // A class comparing two strategies has to face the same decade, or the comparison
    // means nothing. Math.random() here would make every run incomparable.
    const E = engine();
    const spend = { seed_wind: 15, root_sucker: 10 };
    const ev = { id: 'calm', name: 'A quiet decade' };
    expect(JSON.stringify(E.resolveSpread(spend, ev, E.lcg(2024))))
      .toBe(JSON.stringify(E.resolveSpread(spend, ev, E.lcg(2024))));
  });

  it('trades establishment rate against genetic diversity', () => {
    const E = engine();
    const res = E.resolveSpread({ seed_wind: 12, root_sucker: 12 }, { id: 'calm', name: 'calm' }, E.lcg(9));
    expect(res.clonalCount).toBeGreaterThan(res.diverseCount);
    expect(res.diversityIndex).toBeGreaterThanOrEqual(0);
    expect(res.diversityIndex).toBeLessThanOrEqual(1);
  });

  it('only offers strategies the species actually uses', () => {
    const E = engine();
    for (const sp of E.SPECIES) {
      for (const mode of sp.modes) expect(E.strategyById(mode), sp.id + ' -> ' + mode).toBeTruthy();
    }
    // A pine has no clonal route at all; seed is its only way forward.
    expect(E.speciesById('pine').modes.every((m) => E.strategyById(m).diversity === 1)).toBe(true);
    expect(E.speciesById('aspen').modes.some((m) => E.strategyById(m).diversity === 0)).toBe(true);
  });
});

describe('Tree Life Lab — grade bands span K-12', () => {
  it('honours the host band and lets a teacher override it', () => {
    const E = engine();
    expect(E.resolveBand({ gradeBand: 'k2' }, {})).toBe('k2');
    expect(E.resolveBand({ gradeBand: 'k2' }, { bandOverride: 'g912' })).toBe('g912');
    expect(E.resolveBand({}, {})).toBe('g68');
    // watercycle spells its bands 'K-2'; the host spells them 'k2'. A stale spelling
    // must fall through to the host value rather than silently selecting nothing.
    expect(E.resolveBand({ gradeBand: 'g35' }, { bandOverride: 'K-2' })).toBe('g35');
  });

  it('renders at every band without throwing', () => {
    for (const b of ['k2', 'g35', 'g68', 'g912']) {
      const html = render({ treeLab: { bandOverride: b } });
      expect(html, 'band ' + b).toBeTruthy();
      expect(html).toContain('Tree Life Lab');
    }
  });

  it('withholds the equation-level chemistry from the youngest band', () => {
    const k2 = render({ treeLab: { bandOverride: 'k2', view: 'chem' } });
    expect(k2).toContain('How a tree feeds itself');
    expect(k2).not.toContain('Calvin');
    expect(k2).not.toContain('respiration bill');

    const hs = render({ treeLab: { bandOverride: 'g912', view: 'chem' } });
    expect(hs).toContain('respiration bill');
    expect(hs).toContain('Heartwood');
  });

  it('offers the hand-off to chemBalance and cell only where those tools go deeper', () => {
    // The deep equation work is NOT duplicated here: chemBalance owns stoichiometry
    // and cell owns the organelle. The hand-off exists so this tool does not fork them.
    const hs = render({ treeLab: { bandOverride: 'g912', view: 'chem' } });
    expect(hs).toContain('Chemical Balance');
    expect(hs).toContain('Cell Explorer');
    const k2 = render({ treeLab: { bandOverride: 'k2', view: 'chem' } });
    expect(k2).not.toContain('Chemical Balance');
  });
});

describe('Tree Life Lab — renders every view', () => {
  it('renders each tab for a mid-life tree', () => {
    const E = engine();
    const oak = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < 40; i++) tree = E.simulateYear(tree, oak, GOOD_ENV, ALLOC);

    for (const view of ['grow', 'chem', 'transport', 'spread', 'quiz']) {
      const html = render({ treeLab: { view, tree, bandOverride: 'g68' } });
      expect(html, view).toBeTruthy();
      expect(html.length, view).toBeGreaterThan(500);
    }
  });

  it('states plainly that the numbers are a teaching model, not measurements', () => {
    const html = render({ treeLab: { view: 'grow' } });
    expect(html).toContain('teaching model');
  });

  it('survives a dead tree and a tree with no reproduction budget', () => {
    const E = engine();
    const dead = { ...E.newTree('oak'), alive: false, causeOfDeath: 'senescence', age: 400 };
    expect(render({ treeLab: { view: 'grow', tree: dead } })).toBeTruthy();
    expect(render({ treeLab: { view: 'spread', tree: E.newTree('pine'), speciesId: 'pine' } })).toBeTruthy();
  });
});

describe('Tree Life Lab — the playback clock', () => {
  // The clock cannot be a hook: renderTool() inlines tool.render(ctx) into the bridge
  // fiber, so the hook COUNT would change whenever a student switches tools and React
  // would tear. It lives at module scope instead, which creates the opposite hazard —
  // nothing tells a module-scope timer that the tool unmounted.
  afterEach(() => {
    try { window.__alloTreeLabEngine.CLOCK.stop(); } catch { /* not loaded */ }
    vi.useRealTimers();
  });

  it('maps a sub-year phase onto the four seasons in order', () => {
    const E = engine();
    expect(E.seasonForPhase(0.0)).toBe('spring');
    expect(E.seasonForPhase(0.3)).toBe('summer');
    expect(E.seasonForPhase(0.6)).toBe('autumn');
    expect(E.seasonForPhase(0.9)).toBe('winter');
    // Whole years must not shift the season: only the fraction matters.
    expect(E.seasonForPhase(7.3)).toBe('summer');
    expect(E.seasonForPhase(112.9)).toBe('winter');
  });

  it('offers a sub-year speed so the seasons can actually be seen', () => {
    const E = engine();
    const seasonal = E.SPEEDS.filter((s) => s.seasonal);
    expect(seasonal.length).toBeGreaterThan(0);
    // Above roughly one year a second the seasons would only strobe, and every change
    // rebuilds the whole WebGL scene.
    for (const s of seasonal) expect(s.yps).toBeLessThanOrEqual(1);
    for (const s of E.SPEEDS) {
      expect(typeof s.label).toBe('string');
      expect(Number.isFinite(s.yps)).toBe(true);
      expect(s.yps).toBeGreaterThan(0);
    }
    expect(E.speedById('nonsense').id).toBeTruthy();   // unknown id must not throw
  });

  it('stops itself when nothing has rendered for a while (the unmount case)', () => {
    // A student navigates away. No render happens, so no heartbeat lands, and the
    // clock must notice and stop rather than simulate forever in the background.
    vi.useFakeTimers();
    const E = engine();
    let ticks = 0;
    E.CLOCK.beat(() => { ticks += 1; });
    E.CLOCK.ensure(true);
    vi.advanceTimersByTime(600);
    const whileMounted = ticks;
    expect(whileMounted).toBeGreaterThan(0);

    // Now stop stamping the heartbeat, as an unmounted tool would.
    vi.advanceTimersByTime(5000);
    expect(E.CLOCK.running()).toBe(false);
    const afterUnmount = ticks;
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(afterUnmount);   // truly stopped, not just slowed
  });

  it('keeps running while renders keep stamping the heartbeat', () => {
    vi.useFakeTimers();
    const E = engine();
    let ticks = 0;
    // A healthy loop: each tick writes state, which re-renders, which re-stamps.
    E.CLOCK.beat(function stamp() { ticks += 1; E.CLOCK.beat(stamp); });
    E.CLOCK.ensure(true);
    vi.advanceTimersByTime(3000);
    expect(E.CLOCK.running()).toBe(true);
    expect(ticks).toBeGreaterThan(5);
  });

  it('survives a tick callback that throws instead of spinning on it', () => {
    vi.useFakeTimers();
    const E = engine();
    E.CLOCK.beat(() => { throw new Error('boom'); });
    E.CLOCK.ensure(true);
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    expect(E.CLOCK.running()).toBe(false);
  });

  it('renders the play control and reflects the running state', () => {
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 30; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const paused = render({ treeLab: { view: 'grow', tree, playing: false } });
    expect(paused).toContain('Run the clock');
    expect(paused).toContain('Play');
    const running = render({ treeLab: { view: 'grow', tree, playing: true, speed: 'seasons' } });
    expect(running).toContain('Pause');
    expect(running).toContain('Season');
  });

  it('will not run the clock on a dead tree', () => {
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 30; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const dead = { ...tree, alive: false, causeOfDeath: 'senescence' };
    const html = render({ treeLab: { view: 'grow', tree: dead, playing: true } });
    expect(html).toContain('clock stopped');
    expect(html).toContain('Play');       // not Pause: playing is forced false
  });
});

describe('Tree Life Lab — never renders blank', () => {
  // StemLab.renderTool() CATCHES and returns null, so any throw in render is a
  // silently blank tool: no console error, no failing gate, nothing a teacher could
  // report beyond "it does not work". Eight states used to do exactly that, all of
  // them reachable from ordinary persisted JSON.
  function goodTree() {
    const E = engine();
    let t = E.newTree('oak');
    for (let i = 0; i < 60; i += 1) t = E.simulateYear(t, E.speciesById('oak'), GOOD_ENV, ALLOC);
    return t;
  }

  it('survives a partial or corrupt stored tree', () => {
    const t = goodTree();
    const HOSTILE = [
      ['missing rings', { age: 5, heightM: 2, dbhCm: 3, leafArea: 4, alive: true }],
      ['only an age', { age: 9 }],
      ['empty object', {}],
      ['a string', 'corrupt'],
      ['rings null', { ...t, rings: null }],
      ['rings a string', { ...t, rings: 'x' }],
      ['rings holding junk', { ...t, rings: [null, 'x', { widthMm: 'wide' }, { widthMm: NaN }] }],
      ['numbers as NaN', { ...t, heightM: NaN, dbhCm: NaN, leafArea: NaN }],
      ['no deficitYears (older save)', { ...t, deficitYears: undefined }],
      ['seedsBanked undefined', { ...t, seedsBanked: undefined }],
    ];
    for (const [label, tree] of HOSTILE) {
      for (const view of ['grow', 'spread']) {
        const html = render({ treeLab: { view, tree } });
        expect(html.length, `${view} blanked on ${label}`).toBeGreaterThan(500);
      }
    }
  });

  it('survives a malformed spread result', () => {
    const tree = goodTree();
    const HOSTILE = [
      ['no res', { event: 'fire' }],
      ['res without results', { event: 'fire', res: {} }],
      ['results not an array', { event: 'fire', res: { results: 'x' } }],
      ['unknown event id', { event: 'meteor', res: { results: [], established: 0 } }],
    ];
    for (const [label, lastSpread] of HOSTILE) {
      const html = render({ treeLab: { view: 'spread', tree, lastSpread } });
      expect(html.length, `spread blanked on ${label}`).toBeGreaterThan(500);
    }
  });

  it('survives junk in every other stored field', () => {
    const tree = goodTree();
    const CASES = [
      ['no toolData', undefined],
      ['empty', {}],
      ['null slice', { treeLab: null }],
      ['unknown view', { treeLab: { view: 'nope', tree } }],
      ['unknown species', { treeLab: { view: 'grow', speciesId: 'banana', tree } }],
      ['alloc null', { treeLab: { view: 'grow', tree, alloc: null } }],
      ['alloc a string', { treeLab: { view: 'grow', tree, alloc: 'x' } }],
      ['spend a string', { treeLab: { view: 'spread', tree, spend: 'nope' } }],
      ['spend unknown strategy', { treeLab: { view: 'spread', tree, spend: { warp_drive: 5 } } }],
      ['quizIdx out of range', { treeLab: { view: 'quiz', tree, quizIdx: 999 } }],
      ['quizIdx negative', { treeLab: { view: 'quiz', tree, quizIdx: -5 } }],
      ['sliders out of range', { treeLab: { view: 'grow', tree, light: 99, soilWater: -3, tempC: 9999, co2ppm: -1 } }],
      ['unknown death cause', { treeLab: { view: 'grow', tree: { ...tree, alive: false, causeOfDeath: 'lightning' } } }],
    ];
    for (const [label, data] of CASES) {
      const html = render(data);
      expect(html.length, `blanked on ${label}`).toBeGreaterThan(500);
    }
  });

  it('survives a hostile ctx', () => {
    const tree = goodTree();
    const OVERRIDES = [
      ['no t()', { t: undefined }],
      ['t() throws', { t: () => { throw new Error('lang pack missing'); } }],
      ['t() returns undefined', { t: () => undefined }],
      ['no addToast', { addToast: undefined }],
      ['no awardXP', { awardXP: undefined }],
      ['no gradeBand', { gradeBand: undefined }],
      ['stale gradeBand spelling', { gradeBand: 'K-2' }],
    ];
    for (const [label, over] of OVERRIDES) {
      const html = render({ treeLab: { view: 'grow', tree } }, over);
      expect(html.length, `blanked on ${label}`).toBeGreaterThan(500);
    }
  });

  it('normalises any stored tree into a shape the renderer can use', () => {
    const E = engine();
    for (const raw of [null, undefined, 'x', 42, {}, { age: 'old' }, { rings: 'no' }]) {
      const t = E.normaliseTree(raw, 'oak');
      expect(Array.isArray(t.rings)).toBe(true);
      expect(Array.isArray(t.history)).toBe(true);
      expect(Number.isFinite(t.heightM)).toBe(true);
      expect(Number.isFinite(t.age)).toBe(true);
      expect(Number.isFinite(t.seedsBanked)).toBe(true);
    }
    // Good values must pass through untouched.
    const real = goodTree();
    const kept = E.normaliseTree(real, 'oak');
    expect(kept.heightM).toBe(real.heightM);
    expect(kept.rings.length).toBe(real.rings.length);
  });

  it('keeps working when the host viewer shell is absent', () => {
    // Plugins load on first hub-open while the host loads at boot. If that ordering
    // ever slips, the tool must still render its numbers — and capturing the viewer
    // at module load would have made 3D silently dead for the whole session.
    const html = render({ treeLab: { view: 'grow', tree: goodTree() } });
    expect(html).toContain('carbon budget');
    expect(html.length).toBeGreaterThan(1000);
  });
});

describe('Tree Life Lab — banks and mirrors', () => {
  it('does not let a student score the quiz by answer position', () => {
    const E = engine();
    const counts = {};
    for (const q of E.QUIZ) {
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.a.length);
      counts[q.correct] = (counts[q.correct] || 0) + 1;
    }
    const maxShare = Math.max(...Object.values(counts)) / E.QUIZ.length;
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(3);
    expect(maxShare).toBeLessThanOrEqual(0.5);
  });

  it('only seeds handoff keys the destination tool actually reads', () => {
    // The first handoff invented requestedEquation / requestedOrganelle /
    // requestedType. All three are plausible names that appear nowhere in either
    // destination, so the button navigated and then dropped the student on the
    // default screen while implying it had taken them somewhere. Nothing failed;
    // it just quietly did not work.
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const start = src.indexOf('function handoff(');
    expect(start, 'handoff() not found').toBeGreaterThan(0);
    const body = src.slice(start, src.indexOf('\n      }', start));

    const TARGETS = {
      cell: 'stem_lab/stem_tool_cell.js',
      chemBalance: 'stem_lab/stem_tool_chembalance.js',
    };
    for (const [tool, file] of Object.entries(TARGETS)) {
      const assign = new RegExp('next\\.' + tool + '\\s*=\\s*Object\\.assign\\([^;]*?\\{([^}]*)\\}', 's');
      const m = body.match(assign);
      if (!m) continue;                       // seeding nothing is a valid choice
      const target = readFileSync(resolve(process.cwd(), file), 'utf8');
      const keys = [...m[1].matchAll(/([a-zA-Z_][\w]*)\s*:/g)].map((k) => k[1]);
      for (const key of keys) {
        if (key.startsWith('_')) continue;    // breadcrumbs are not read by contract
        expect(target.includes(key), `${tool} never reads "${key}" — the handoff is cosmetic`).toBe(true);
      }
    }
    // The invented names must not come back. Strip comments first: the code above is
    // documented by naming them, and this assertion is about executable code.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const dead of ['requestedEquation', 'requestedOrganelle', 'requestedType']) {
      expect(code.includes(dead), `${dead} is read by no tool`).toBe(false);
    }
  });

  it('has quest hooks that read the slice the host actually hands them', () => {
    // The host resolves quest state as toolData[toolId], so a hook reading d.treeLab
    // would silently never fire. Nothing would report that: an award that never
    // arrives looks exactly like an award not yet earned.
    resetStemLab();
    const cfg = loadTool(SOURCE, 'treeLab');
    const E = window.__alloTreeLabEngine;
    expect(Array.isArray(cfg.questHooks)).toBe(true);
    expect(cfg.questHooks.length).toBeGreaterThan(0);

    let tree = E.newTree('oak');
    for (let i = 0; i < 60; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);

    // Exactly what the host passes: toolData[toolId], not the whole toolData.
    const earned = {
      tree,
      limitsSeen: { light: true, co2: true, water: true, temperature: true },
      spreadRounds: 2,
      bestDiverse: 3,
      bestClonal: 4,
    };
    for (const hook of cfg.questHooks) {
      expect(typeof hook.check, `${hook.id}.check`).toBe('function');
      expect(hook.check(earned), `${hook.id} never fires on a fully-played state`).toBe(true);
      expect(hook.check({}), `${hook.id} fires on an empty state`).toBeFalsy();
      // progress() must survive an empty slice: it renders before anything is earned.
      expect(() => hook.progress({}), `${hook.id}.progress({}) threw`).not.toThrow();
      expect(typeof hook.progress(earned)).toBe('string');
    }
  });

  it('keeps its state JSON-serialisable', () => {
    // Persisted toolData round-trips through JSON. A function stored in state is
    // silently dropped, which has bitten several tools in this repo (grading fns and
    // label fns vanishing between sessions).
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 25; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const state = {
      tree,
      lastSpread: { event: 'fire', res: E.resolveSpread({ seed_wind: 8 }, { id: 'fire', name: 'Ground fire' }, E.lcg(3)) },
      alloc: E.normaliseAlloc({}),
      spend: { seed_wind: 2 },
      droughtYears: [4, 5],
    };
    const round = JSON.parse(JSON.stringify(state));
    expect(round).toEqual(state);
    // And the round-tripped tree must still simulate.
    const next = E.simulateYear(round.tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    expect(Number.isFinite(next.heightM)).toBe(true);
    expect(next.rings.length).toBe(round.tree.rings.length + 1);
  });

  it('is wired into every link of the registration chain', () => {
    // Registering a tool takes SIX separate edits in this repo and nothing checks them
    // together. Miss the last one and the tool is registered, catalogued, loadable,
    // mirrored, indexed, deployed — and renders an empty panel, with every gate green.
    // That is exactly how treeLab shipped.
    const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

    // 1. Cache-bust list: without it the CDN serves stale code forever after an edit.
    expect(read('build.js'), 'missing from PLUGIN_FILES in build.js')
      .toContain("'stem_lab/stem_tool_treelab.js'");

    // 2. Runtime loader manifest. It lives in a .txt, so .js-only greps miss it.
    const anti = read('AlloFlowANTI.txt');
    expect(anti, 'missing from the stemToolModules loader array in AlloFlowANTI.txt')
      .toContain("'stem_lab/stem_tool_treelab.js'");

    // 3. The loader resolves a registration id to a file with its own normaliser, so
    //    use the REAL rule rather than a copy of it that could drift.
    const normSrc = anti.slice(anti.indexOf('function normalizedToolKey'));
    const body = normSrc.slice(0, normSrc.indexOf('\n        }') + 10);
    // eslint-disable-next-line no-new-func
    const normalizedToolKey = new Function(body + '; return normalizedToolKey;')();
    expect(normalizedToolKey('treeLab'), 'the id no longer normalises to the filename')
      .toBe(normalizedToolKey('stem_lab/stem_tool_treelab.js'));

    // 4. Hub catalogue tile, in both host copies.
    for (const host of ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js']) {
      expect(read(host), `${host}: no catalogue tile`).toContain("id: 'treeLab'");
    }

    // 5. tool_index.json feeds STEM search and the lesson-plan agent.
    const index = JSON.parse(read('tool_index.json'));
    const tools = Array.isArray(index) ? index : index.tools;
    expect(tools.some((t) => t && t.id === 'treeLab'), 'missing from tool_index.json').toBe(true);

    // 6. The desktop mirror has to exist at all, not merely match.
    expect(() => read('desktop/web-app/public/stem_lab/stem_tool_treelab.js')).not.toThrow();
  });

  it('is listed in the hub gate that lets a pure plugin render at all', () => {
    // The hub has exactly ONE StemLab.renderTool() call site and it sits behind
    //   if (!_pluginOnlyTools[stemLabTool]) return null;
    // A tool can be registered, catalogued, in PLUGIN_FILES, in the ANTI loader array,
    // mirrored, indexed and DEPLOYED and still render nothing without an entry there.
    // treeLab shipped in exactly that state: every gate in the repo was green because
    // they all call renderTool() directly and never go through the hub path.
    const HOST = 'stem_lab/stem_lab_module.js';
    const MIRROR_HOST = 'desktop/web-app/public/stem_lab/stem_lab_module.js';
    for (const file of [HOST, MIRROR_HOST]) {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      const start = src.indexOf('_pluginOnlyTools = {');
      expect(start, `${file}: _pluginOnlyTools not found`).toBeGreaterThan(0);
      const map = src.slice(start, src.indexOf('};', start));
      expect(/\btreeLab\s*:\s*true\b/.test(map), `${file}: treeLab is not in _pluginOnlyTools, so it renders null`).toBe(true);
    }
  });

  it('keeps the CDN and desktop copies byte-identical', () => {
    // Two live copies: stem_lab/ is served by the CDN, desktop/web-app/public/stem_lab/
    // is the desktop app. An edit to one only is the classic silent divergence here.
    const cdn = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const mirror = readFileSync(resolve(process.cwd(), MIRROR), 'utf8');
    expect(mirror).toBe(cdn);
  });

  it('lets no decorative colour survive into high-contrast mode', () => {
    // Found by screenshot, not by any gate: the CONDITION sliders adapted because
    // they read T.accent, but the ALLOCATION sliders and the ring bars carried raw
    // hex, so brown-on-black tracks survived into the one mode whose entire purpose
    // is maximum contrast.
    const E = engine();
    const oak = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < 50; i += 1) tree = E.simulateYear(tree, oak, GOOD_ENV, ALLOC);
    const DECORATIVE = ['#22c55e', '#a16207', '#f59e0b', '#ec4899', '#38bdf8',
      '#facc15', '#60a5fa', '#fb923c', '#78716c'];
    for (const view of ['grow', 'chem']) {
      resetStemLab();
      loadTool(SOURCE, 'treeLab');
      const html = renderTool('treeLab', { treeLab: { view, tree, bandOverride: 'g912' } }, { isContrast: true });
      for (const hex of DECORATIVE) {
        expect(html.includes(hex), `${view} leaks ${hex} into high contrast`).toBe(false);
      }
    }
  });

  it('offers only the strategies the current species actually uses', () => {
    // Stale committed carbon used to survive a species switch, so the Spread list
    // offered oak's three routes while a run resolved aspen's root suckers as well.
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 60; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const html = render({
      treeLab: { view: 'spread', speciesId: 'oak', tree, spend: { root_sucker: 9 } },
    });
    // Oak has seed_animal, mast and basal_resprout. Root suckering is aspen's route.
    expect(html).toContain('Animal-planted seed');
    expect(html).toContain('Basal resprout');
    expect(html).not.toContain('Root sucker');
  });

  it('labels every carbon mass as carbon, not biomass', () => {
    // These are kg of CARBON throughout the engine; a bare "kg" reads as biomass and
    // is about half the real figure.
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 60; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const html = render({ treeLab: { view: 'chem', bandOverride: 'g912', tree } });
    expect(html).toContain('kg C');
    expect(/(\d)\s*kg(?!\s*C)/.test(html.replace(/kg C/g, 'kgC')), 'a bare "kg" survived').toBe(false);
  });

  it('names every glyph-only view control', () => {
    // The six 3D controls show only "◀ ▶ ▲ ▼ + −". A screen reader announces
    // those as punctuation or nothing, so each needs an accessible name from
    // somewhere other than its label text — this was 6 of the repo's a11y
    // errors. btn() takes opts.ariaLabel; the glyph buttons must pass one.
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    // Only real btn(...) calls — searching the file for a glyph also matches the
    // comment that explains this rule.
    const calls = src.split('\n').filter(l => /\bbtn\(\s*'/.test(l));
    expect(calls.length, 'expected btn() calls').toBeGreaterThan(5);

    // Glyph-only means the whole label literal has no letters or digits AND is
    // not concatenated with translated text — `btn('prev', '← ' + t(...))` is
    // already named by the text that follows the arrow.
    const glyphOnly = calls.filter(l => /btn\(\s*'[^']*'\s*,\s*'[^'a-zA-Z0-9]+'\s*,/.test(l));
    expect(glyphOnly.length, 'expected the glyph view controls').toBeGreaterThanOrEqual(6);
    for (const line of glyphOnly) {
      expect(line.trim(), 'glyph-only button needs an ariaLabel').toContain('ariaLabel:');
    }
    expect(src, 'btn() must forward ariaLabel to the element').toContain("'aria-label': o.ariaLabel || undefined");
  });

  it('lets a student cause a drought and shows the whole causal chain', () => {
    // The engine modelled drought from the start (soil water cut to a third, which
    // shuts the stomata, makes water the limit and starts the deficit clock) and
    // nothing in the UI could ever trigger one. Built but unreachable.
    const E = engine();
    const oak = E.speciesById('oak');
    let t = E.newTree('oak');
    const cfg = { ...GOOD_ENV, droughtYears: [28, 29, 30, 31, 32] };
    for (let i = 0; i < 45; i += 1) t = E.simulateYear(t, oak, E.envForYear(cfg, t.age), ALLOC);

    const byYear = Object.fromEntries(t.history.map((h) => [h.year, h]));
    const before = byYear[27];
    const during = byYear[31];
    const after = byYear[38];

    expect(during.limiting, 'drought did not make water the limit').toBe('water');
    expect(during.ring, 'drought did not narrow the ring').toBeLessThan(before.ring * 0.5);
    expect(after.ring, 'the tree never recovered after the rains').toBeGreaterThan(during.ring);
    expect(t.alive, 'a five-year drought should be survivable').toBe(true);

    // A drought-intolerant species must shut its stomata harder at the same soil water
    // than a tolerant one. That difference IS the trait.
    const dry = 0.75 * 0.35;
    expect(E.stomatalAperture(dry, E.speciesById('willow').droughtTol, false))
      .toBeLessThan(E.stomatalAperture(dry, oak.droughtTol, false));

    // And the UI must surface it rather than leaving it to the numbers.
    const html = render({ treeLab: { view: 'grow', tree: t, droughtYears: [t.age, t.age + 1] } });
    expect(html).toContain('Drought year');
    expect(html).toContain('End the drought');
  });

  it('shows which factor was limiting in each past year', () => {
    // Every simulated year has always recorded its limiting factor, and nothing ever
    // displayed it. It is the tool's thesis as a picture: light limits a young tree,
    // water takes over in a drought, and the ring beneath narrows the same year.
    const E = engine();
    let t = E.newTree('oak');
    const cfg = { ...GOOD_ENV, droughtYears: [20, 21, 22] };
    for (let i = 0; i < 35; i += 1) t = E.simulateYear(t, E.speciesById('oak'), E.envForYear(cfg, t.age), ALLOC);

    const html = render({ treeLab: { view: 'grow', tree: t, bandOverride: 'g68' } });
    expect(html).toContain('What was limiting, year by year');
    // The band legend names only the factors that actually occurred.
    expect(html).toContain('Water');
    // K-2 does not get it: the idea needs the limiting-factor concept first.
    const k2 = render({ treeLab: { view: 'grow', tree: t, bandOverride: 'k2' } });
    expect(k2).not.toContain('What was limiting, year by year');
  });

  it('does not call the stomata wide open while they are closing', () => {
    // They read 57% during a drought and the caption still said "Wide open", which is
    // exactly backwards from what that panel exists to teach.
    const E = engine();
    let t = E.newTree('oak');
    for (let i = 0; i < 40; i += 1) t = E.simulateYear(t, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const drought = render({
      treeLab: { view: 'grow', tree: t, bandOverride: 'g68', droughtYears: [t.age] },
    });
    expect(drought).toContain('Closing to save water');
    expect(drought).not.toContain('Wide open');
  });

  it('drives Transport from live state instead of prose alone', () => {
    // It was the only view with no numbers in it: two prose cards and one aperture
    // bar. Phloem in particular was pure assertion — "sugar goes where it is needed"
    // with nothing showing where that is, when the allocation sliders on the Grow tab
    // ARE the sink list.
    const E = engine();
    let t = E.newTree('oak');
    for (let i = 0; i < 55; i += 1) t = E.simulateYear(t, E.speciesById('oak'), GOOD_ENV, ALLOC);

    const summer = render({ treeLab: { view: 'transport', tree: t, season: 'summer', bandOverride: 'g68' } });
    expect(summer).toContain('litres a day');          // xylem carries a real volume
    expect(summer).toContain('Source right now: the leaves');
    expect(summer).toContain('Stored reserves');

    // Spring runs the phloem the other way: the tree builds a canopy out of last
    // year's store before it has leaves to make sugar with.
    const spring = render({ treeLab: { view: 'transport', tree: t, season: 'spring', bandOverride: 'g68' } });
    expect(spring).toContain('stored reserves in the roots and trunk');
    // ...and the store cannot be a destination while it is the source.
    const springSinks = spring.slice(spring.indexOf('Source right now'));
    expect(springSinks).not.toContain('Stored reserves');
  });

  it('says a deficit year is a deficit instead of dividing zero five ways', () => {
    // With no surplus every sink rendered a full-width share bar labelled "0 kg C".
    // The shares said 30/25/30/5/10 and the values said nothing is moving; both were
    // true and together they read as broken.
    const E = engine();
    let t = E.newTree('oak');
    for (let i = 0; i < 55; i += 1) t = E.simulateYear(t, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const html = render({
      treeLab: { view: 'transport', tree: t, season: 'summer', bandOverride: 'g912', droughtYears: [t.age] },
    });
    expect(html).toContain('Nothing to send out');
    expect(html).toContain('Sinks become the source');
    expect(html).not.toMatch(/0 kg C/);
  });

  it('leaves no user-visible string a language pack cannot reach', () => {
    // Static greps cannot answer this and never could: a string routed through a
    // module-scope data table reaches __alloT at RENDER time and looks hardcoded to a
    // scanner, while a string built inline looks fine and never reaches it at all. A
    // static pass put coverage at 31% when the real figure was already far higher.
    //
    // So render with a translator that replaces every translated string with a marker
    // and read what English is LEFT. Whatever remains is permanently English no matter
    // how many packs get written. This tool started at 19 such strings.
    const MARK = '░';
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 60; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);

    const SURFACES = [
      ['grow/k2', { view: 'grow', bandOverride: 'k2', tree }],
      ['grow/g68', { view: 'grow', bandOverride: 'g68', tree }],
      ['grow/g912', { view: 'grow', bandOverride: 'g912', tree }],
      ['chem/k2', { view: 'chem', bandOverride: 'k2', tree }],
      ['chem/g912', { view: 'chem', bandOverride: 'g912', tree }],
      ['transport/g68', { view: 'transport', bandOverride: 'g68', tree }],
      ['transport/g912', { view: 'transport', bandOverride: 'g912', tree }],
      ['quiz', { view: 'quiz', tree, quizPick: 1 }],
      ['spread', {
        view: 'spread',
        tree,
        lastSpread: {
          event: 'pathogen',
          res: E.resolveSpread({ seed_animal: 6 }, { id: 'pathogen', name: 'Root pathogen' }, E.lcg(11)),
        },
      }],
    ];

    const leftovers = [];
    for (const [label, state] of SURFACES) {
      const html = render({ treeLab: state }, { t: (k) => MARK + k + MARK });
      const text = html
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        .replace(/<[^>]+>/g, '\n')
        .replace(new RegExp(MARK + '[^' + MARK + ']*' + MARK, 'g'), ' ')
        .replace(/&[a-z]+;/g, ' ');
      for (const line of text.split('\n')) {
        const t = line.trim();
        // Four or more word-like tokens is prose; anything shorter is a number, a
        // unit or a symbol that needs no translation.
        const words = t.split(/\s+/).filter((w) => /[a-zA-Z]{3}/.test(w));
        if (words.length >= 4 && /[a-z]{3}/.test(t)) leftovers.push(`${label}: ${t.slice(0, 100)}`);
      }
    }
    expect(leftovers, `untranslatable:\n  ${leftovers.join('\n  ')}`).toEqual([]);
  });

  it('avoids var() in canvas and THREE colour paths', () => {
    // ctx.fillStyle = 'var(--x)' is SILENTLY IGNORED (the previous fill persists), and
    // an SVG presentation attribute cannot resolve a token either. Both must be hex.
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    expect(/fillStyle\s*=\s*['"]var\(/.test(src)).toBe(false);
    expect(/strokeStyle\s*=\s*['"]var\(/.test(src)).toBe(false);
    expect(/\bfill:\s*['"]var\(/.test(src)).toBe(false);
    expect(/new THREE\.Color\(['"]var\(/.test(src)).toBe(false);
  });
});
