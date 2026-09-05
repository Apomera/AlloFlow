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
    expect(hs).toContain('From sky to sugar');
    expect(hs).toContain('Bottleneck right now');
    expect(hs).toContain('allo-tree-reaction');
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

  it('does not let a student score the quiz by answer length', () => {
    // The position rotation cannot help here: length travels WITH the option text,
    // so shifting the order moves the tell around rather than removing it. The
    // authored bank keyed the longest option in 7 of 10 questions — "pick the
    // wordiest one" scored 70% knowing no biology. The usual cause is that the key
    // gets a full explanation while the distractors are three-word throwaways.
    const E = engine();
    let longest = 0;
    let shortest = 0;
    for (const q of E.QUIZ) {
      const lens = q.a.map((o) => String(o).length);
      if (lens[q.correct] === Math.max(...lens)) longest++;
      if (lens[q.correct] === Math.min(...lens)) shortest++;
    }
    // Chance is 1/4; the ceiling leaves room for a ten-question bank without
    // leaving room for a strategy. Both directions are checked, because trimming
    // every key is how a length tell gets reintroduced upside down.
    expect(longest / E.QUIZ.length, 'key-is-longest tell').toBeLessThanOrEqual(0.4);
    expect(shortest / E.QUIZ.length, 'key-is-shortest tell').toBeLessThanOrEqual(0.4);
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
    expect(html).toContain('From one tree to a forest');
    expect(html).toContain('Strategy signature');
    expect(html).toContain('allo-tree-strategy-grid');
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

    const html = render({ treeLab: { view: 'grow', tree: t, bandOverride: 'g68', growAdvancedOpen: true } });
    expect(html).toContain('What was limiting, year by year');
    // The band legend names only the factors that actually occurred.
    expect(html).toContain('Water');
    // K-2 does not get it: the idea needs the limiting-factor concept first.
    const k2 = render({ treeLab: { view: 'grow', tree: t, bandOverride: 'k2', growAdvancedOpen: true } });
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
    expect(summer).toContain('Whole-year source: canopy photosynthesis');
    expect(summer).toContain('Stored reserves');
    expect(summer).not.toContain('Source right now');
    expect(summer).toContain('Trace the flow');
    expect(summer).toContain('allo-tree-pipe-path is-xylem');
    expect(summer).toContain('Water still rises');

    // Spring runs the phloem the other way: the tree builds a canopy out of last
    // year's store before it has leaves to make sugar with.
    const spring = render({ treeLab: { view: 'transport', tree: t, season: 'spring', bandOverride: 'g68' } });
    expect(spring).toContain('Stored reserves');
    expect(spring).toContain('New leaves');
    // The route is seasonal, but the bars remain the complete whole-year plan.
    const springPlan = spring.slice(spring.indexOf('Where the whole-year carbon plan goes'));
    expect(springPlan).toContain('Whole-year source: canopy photosynthesis');
    expect(springPlan).toContain('Stored reserves');
    expect(spring).not.toContain('Source right now');
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
    expect(html).toContain('No whole-year surplus to divide');
    expect(html).toContain('Sinks become the source');
    expect(html).not.toMatch(/0 kg C/);
  });

  it('does not teach a cruder rule than its own engine models', () => {
    // Q9 said a closed stoma admits NO CO2, and the Chemistry tab said the same. The
    // engine disagrees: a drought-stressed oak sits at aperture 0.65, and the CO2
    // saturation curve gives the SAME relative gain at every water status — what
    // collapses is the absolute amount. The quiz would have marked the careful answer
    // wrong.
    const E = engine();
    const oak = E.speciesById('oak');
    const droughtAperture = E.stomatalAperture(0.75 * 0.35, oak.droughtTol, false);
    expect(droughtAperture, 'the engine models PARTIAL closure').toBeGreaterThan(0.1);

    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    expect(/closed stoma admits no/i.test(src), 'an absolute-closure claim came back').toBe(false);

    const q9 = E.QUIZ.find((q) => /Raising CO/.test(q.q));
    expect(q9, 'the CO2-limitation question').toBeTruthy();
    expect(q9.a[q9.correct]).toMatch(/mostly shut/);
    expect(q9.why).toMatch(/PERCENTAGE|absolute/i);
  });

  it('flags the reproduction take rates as tuned, not measured', () => {
    // The Grow tab has carried a model-limitations note from the start. Spread showed
    // "Takes 13%" and "Takes 72%" as bare figures with no such note, and a student
    // would reasonably read them as measurements. The ordering is real; the numbers
    // are tuned so one decade is playable.
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 40; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const html = render({ treeLab: { view: 'spread', tree } });
    expect(html).toMatch(/tuned so that one decade is playable, not measured/);
    // And the claim it makes about the ordering has to hold in the data.
    const seed = E.strategyById('seed_wind');
    const clonal = E.strategyById('root_sucker');
    expect(clonal.establish).toBeGreaterThan(seed.establish * 5);
  });

  it('states adaptations mechanistically, not as intent', () => {
    // "Willow snaps easily on purpose" is the misconception science teaching works
    // hardest against: organisms do not act with intent. The mechanism was right and
    // the framing was wrong.
    const E = engine();
    const prose = E.SPECIES.map((s) => s.note).concat(E.STRATEGIES.map((s) => s.blurb)).join(' ');
    expect(/on purpose|in order to survive|wants to|tries to/i.test(prose), 'teleological framing').toBe(false);
    // Acorns are destroyed by digestion; caching is what disperses them.
    expect(E.strategyById('seed_animal').blurb).toMatch(/cached/);
  });

  it('shows a cumulative record so the tradeoff can be read across rounds', () => {
    // spreadTotals, bestDiverse, bestClonal and spreadRounds were all written and the
    // only UI read was the 3D clone count. One round is an anecdote; the seed-versus-
    // clonal tradeoff only becomes visible across several against different events.
    const E = engine();
    let tree = E.newTree('oak');
    for (let i = 0; i < 50; i += 1) tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);

    const oneRound = render({
      treeLab: {
        view: 'spread', tree,
        spreadLog: [{ event: 'calm', diverse: 1, clonal: 4 }],
        spreadTotals: { diverse: 1, clonal: 4 },
      },
    });
    expect(oneRound).toContain('Your record so far');
    expect(oneRound).toContain('One decade is an anecdote');   // refuses to conclude

    // A clonal-heavy record names the specific exposure it bought.
    const clonal = render({
      treeLab: {
        view: 'spread', tree,
        spreadLog: [
          { event: 'calm', diverse: 0, clonal: 5 },
          { event: 'fire', diverse: 1, clonal: 6 },
          { event: 'browsing', diverse: 0, clonal: 4 },
        ],
        spreadTotals: { diverse: 1, clonal: 15 },
      },
    });
    expect(clonal).toMatch(/One root pathogen reaches all of them/);

    const seedy = render({
      treeLab: {
        view: 'spread', tree,
        spreadLog: [{ event: 'calm', diverse: 6, clonal: 0 }, { event: 'pathogen', diverse: 5, clonal: 0 }],
        spreadTotals: { diverse: 11, clonal: 0 },
      },
    });
    expect(seedy).toMatch(/paid for that in how few of them took/);
  });

  it('does not carry one tree’s clones over to the next seedling', () => {
    // The 3D scene reads its clone count straight from spreadTotals, and resetTree did
    // not clear it, so a fresh seedling rendered the previous tree's whole stand.
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const start = src.indexOf('function resetTree(');
    const body = src.slice(start, src.indexOf('\n      }', start));
    expect(body, 'resetTree leaves spreadTotals behind').toContain('spreadTotals');
    expect(body).toContain('spreadLog');
  });

  it('scores the knowledge check per question, not per click', () => {
    // Re-answering the same question must not inflate the score, and the score must
    // count only questions the current band actually shows.
    const E = engine();
    const html = render({
      treeLab: { view: 'quiz', bandOverride: 'k2', quizSeen: { 0: 'right', 7: 'wrong' } },
    });
    expect(html).toMatch(/1 \/ 2 right/);

    const fresh = render({ treeLab: { view: 'quiz', bandOverride: 'k2' } });
    expect(fresh).toContain('Not answered yet');

    // A k2 learner sees a subset, so a g912-only answer must not count toward it.
    const g912only = render({ treeLab: { view: 'quiz', bandOverride: 'k2', quizSeen: { 4: 'right' } } });
    expect(g912only).toContain('Not answered yet');
  });
  it('turns the knowledge check into an evidence-led mastery journey', () => {
    const fresh = render({ treeLab: { view: 'quiz', bandOverride: 'k2' } });
    expect(fresh).toContain('Canopy of understanding');
    expect(fresh).toContain('The forest story you built');
    expect(fresh).toContain('Find what is missing');
    expect(fresh).toContain('role="progressbar"');
    expect(fresh).toContain('allo-tree-quiz-leaf is-open is-current');

    const rethink = render({
      treeLab: {
        view: 'quiz', bandOverride: 'k2',
        quizPicks: { 0: 0 }, quizPickKey: 0, quizSeen: { 0: 'wrong' },
      },
    });
    expect(rethink).toContain('Not yet - look at the clue');
    expect(rethink).toContain('Clue from the tree');
    expect(rethink).toContain('Try this thinking move');
    expect(rethink).toContain('Try again');

    const complete = render({
      treeLab: {
        view: 'quiz', bandOverride: 'k2',
        quizSeen: { 0: 'right', 7: 'wrong', 13: 'right', 14: 'right', 15: 'right' },
      },
    });
    expect(complete).toContain('Reflection clearing');
    expect(complete).toContain('allo-tree-quiz-finale');
    for (const step of ['Claim', 'Evidence', 'Reasoning']) expect(complete).toContain(step);
  });

  it('keeps saved choices attached to their question and repairs malformed quiz state', () => {
    const otherQuestion = render({
      treeLab: {
        view: 'quiz', bandOverride: 'g35', quizIdx: 1,
        quizPick: 3, quizPickKey: 0, quizPicks: { 0: 3 },
      },
    });
    expect(otherQuestion).toContain('Idea 2 / 8');
    expect(otherQuestion).not.toContain('class="allo-tree-quiz-feedback');

    const repaired = render({
      treeLab: {
        view: 'quiz', bandOverride: 'k2',
        quizIdx: 'not-a-number', quizPick: 'not-a-pick',
      },
    });
    expect(repaired).toContain('Show what you know');
    expect(repaired).toContain('Idea 1 / 5');
    expect(repaired).not.toContain('undefined');
  });

  it('shares the visible growth goal across playback and year-step controls', () => {
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const step = src.slice(src.indexOf('function stepYears('), src.indexOf('function tick('));
    const tick = src.slice(src.indexOf('function tick('), src.indexOf('CLOCK.beat('));
    const reset = src.slice(src.indexOf('function resetTree('), src.indexOf('CLOCK.stop()', src.indexOf('function resetTree(')));
    expect(step).toContain('treeGoalReached(st)');
    expect(step).toContain('goalReached');
    expect(tick).toContain('treeGoalReached(st)');
    expect(reset).toContain('goalReached');
  });

  it('honors app-level reduced motion and exposes chapter progress semantics', () => {
    const html = render({ treeLab: { view: 'grow' } }, { reduceMotion: true });
    expect(html).toContain('is-reduced-motion');
    expect(html).toContain('aria-labelledby="treelab-chapter-title"');
    expect(html).toContain('aria-label="Chapter 1 of');
    expect(html).toContain('allo-tree-workbench-mission');
  });

  it('connects the filtered chapter path with conceptual handoffs', () => {
    const k2Grow = render({ treeLab: { view: 'grow', bandOverride: 'k2' } });
    expect(k2Grow).toContain('data-tree-next="chem"');
    expect(k2Grow).toContain('Tree Food');

    const k2Food = render({ treeLab: { view: 'chem', bandOverride: 'k2' } });
    expect(k2Food).toContain('data-tree-next="spread"');
    expect(k2Food).toContain('Leaves made sugar');

    const olderChem = render({ treeLab: { view: 'chem', bandOverride: 'g68' } });
    expect(olderChem).toContain('data-tree-next="transport"');

    const compare = render({ treeLab: { view: 'compare', bandOverride: 'g68' } });
    expect(compare).toContain('data-tree-next="quiz"');

    const check = render({ treeLab: { view: 'quiz', bandOverride: 'k2' } });
    expect(check).not.toContain('data-tree-next=');
    expect(check).not.toContain('class="allo-tree-species-context');
  });

  it('makes the immersive viewer a named, keyboard-bounded dialog', () => {
    const full = render({ treeLab: { view: 'grow', viewerFull: true } });
    expect(full).toContain('data-tree-fullstage="true"');
    expect(full).toContain('role="dialog"');
    expect(full).toContain('aria-modal="true"');
    expect(full).toContain('aria-labelledby="treelab-full-title"');
    expect(full).toContain('aria-describedby="treelab-full-description"');
    expect(full).toContain('tabindex="-1"');
    expect(full).toContain('aria-haspopup="dialog"');
    expect(full).toContain('aria-controls="treelab-full-stage"');

    const ordinary = render({ treeLab: { view: 'grow' } });
    expect(ordinary).not.toContain('data-tree-fullstage="true"');

    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const trap = src.slice(src.indexOf('function handleFullScreenKey('), src.indexOf('// A read-out chip'));
    expect(trap).toContain("e.key !== 'Tab'");
    expect(trap).toContain('querySelectorAll');
    expect(src).toContain('FULLSCREEN_RETURN_FOCUS');
  });

  it('stages one mission action and gives primary readers their own language layer', () => {
    const fresh = render({ treeLab: { view: 'grow', discoveryMode: 'free', bandOverride: 'k2' } });
    expect(fresh).toContain('data-mission-next="change"');
    expect(fresh).toContain('Try one change. Grow 10 years. Then tell what helped or hurt your tree.');
    expect((fresh.match(/allo-tree-button is-primary/g) || [])).toHaveLength(1);

    const changed = render({ treeLab: { view: 'grow', discoveryMode: 'free', bandOverride: 'k2', light: 0.5 } });
    expect(changed).toContain('data-mission-next="grow"');
    expect((changed.match(/allo-tree-button is-primary/g) || [])).toHaveLength(1);

    const olderTree = engine().newTree('oak');
    olderTree.age = 12;
    const explain = render({ treeLab: { view: 'grow', discoveryMode: 'free', bandOverride: 'k2', light: 0.5, tree: olderTree } });
    expect(explain).toContain('data-mission-next="explain"');
    expect((explain.match(/allo-tree-button is-primary/g) || [])).toHaveLength(1);

    const spread = render({ treeLab: { view: 'spread', bandOverride: 'k2' } });
    for (const phrase of ['Food saved', 'Starts growing', 'How far it goes', 'Try 10 years']) {
      expect(spread).toContain(phrase);
    }
    expect(spread).not.toContain('The take rates below are tuned');

    const quiz = render({ treeLab: { view: 'quiz', bandOverride: 'k2' } });
    expect(quiz).toContain('A young tree grows in deep shade');
    expect(quiz).toContain('Idea 1 / 5');
  });


  it('draws the trunk in cross-section from the tree’s own record', () => {
    // Transport explained "phloem sits just inside the bark, xylem is deeper in the
    // wood" in prose and then built the girdling lesson on that trust. The ring record
    // and the sapwood/heartwood split have been collected since year one; this shows
    // them rather than asserting them.
    const E = engine();
    const oak = E.speciesById('oak');
    let t = E.newTree('oak');
    for (let i = 0; i < 40; i += 1) t = E.simulateYear(t, oak, GOOD_ENV, ALLOC);

    const html = render({ treeLab: { view: 'transport', tree: t, bandOverride: 'g68' } });
    expect(html).toContain('Inside the trunk');
    for (const layer of ['Bark', 'Phloem', 'Cambium', 'Sapwood', 'Heartwood']) {
      expect(html, `${layer} missing from the section`).toContain(layer);
    }
    // One circle per drawn ring, plus the five layers.
    const circles = (html.match(/<circle/g) || []).length;
    expect(circles, 'rings are not being drawn').toBeGreaterThan(10);
  });

  it('scars the rings red for the years the tree ran a deficit', () => {
    // A drought is recorded permanently in the wood. That is the whole reason a ring
    // record is worth reading, and it should be visible in the section, not only in
    // the bar chart on the Grow tab.
    const E = engine();
    const oak = E.speciesById('oak');
    let t = E.newTree('oak');
    // A drought only marks a ring stressed when it pushes NET carbon negative, and a
    // small tree's respiration bill is too low for that — so this uses a mature tree,
    // which is also the case the lesson is about.
    const cfg = { ...GOOD_ENV, droughtYears: [45, 46, 47, 48, 49, 50] };
    for (let i = 0; i < 70; i += 1) t = E.simulateYear(t, oak, E.envForYear(cfg, t.age), ALLOC);
    expect(t.rings.some((r) => r.stress), 'the drought left no stressed rings').toBe(true);

    const html = render({ treeLab: { view: 'transport', tree: t, bandOverride: 'g912' } });
    expect(html, 'stressed rings are not marked in the section').toMatch(/#b91c1c/);
  });

  it('grows the dead core as the tree ages', () => {
    // Sapwood converting to heartwood is what keeps an old tree's respiration bill from
    // rising forever. The section should show that, not a fixed diagram.
    const E = engine();
    const oak = E.speciesById('oak');
    const at = (years) => {
      let t = E.newTree('oak');
      for (let i = 0; i < years; i += 1) t = E.simulateYear(t, oak, GOOD_ENV, ALLOC);
      return t;
    };
    const young = at(15);
    const old = at(150);
    const frac = (t) => t.heartwoodMass / (t.heartwoodMass + t.sapwoodMass);
    expect(frac(old), 'heartwood share did not grow with age').toBeGreaterThan(frac(young));
    expect(frac(young)).toBeLessThan(0.5);
  });

  it('keeps the section on the contrast ramp', () => {
    const E = engine();
    let t = E.newTree('oak');
    for (let i = 0; i < 40; i += 1) t = E.simulateYear(t, E.speciesById('oak'), GOOD_ENV, ALLOC);
    const html = render({ treeLab: { view: 'transport', tree: t, bandOverride: 'g68' } }, { isContrast: true });
    // The wood browns and the amber phloem must not survive into high contrast.
    for (const hex of ['#c89b62', '#6b4b2a', '#f59e0b', '#4ade80']) {
      expect(html.includes(hex), `section leaks ${hex} into high contrast`).toBe(false);
    }
  });

  it('compares all five species under one set of conditions', () => {
    // A student could only ever see one species at a time, so "why are there different
    // kinds of trees" was a question the tool could not answer. Every run uses the SAME
    // conditions and allocation, so any difference on screen is the strategy itself.
    const html = render({ treeLab: { view: 'compare', bandOverride: 'g68', compareYears: 150 } });
    const E = engine();
    for (const sp of E.SPECIES) {
      expect(html, `${sp.name} missing from the comparison`).toContain(sp.name);
    }
    expect(html).toContain('Five strategies, one set of conditions');
    // It must say the numbers are one run, not a ranking of which tree is better.
    expect(html).toMatch(/built for different conditions/);
    expect(html).toContain('A controlled forest experiment');
    expect(html).toContain('What this run reveals');
    expect(html).toContain('allo-tree-species-grid');
  });

  it('distinguishes dying of old age from starving', () => {
    // Both used to read "died at N". Aspen hits its 120-year lifespan in ANY conditions;
    // willow starves early in severe shade and drought but reaches its lifespan in good ones. Reporting
    // those identically hides the whole point of the comparison.
    const E = engine();
    const run = (spId, env, years) => {
      const sp = E.speciesById(spId);
      let t = E.newTree(spId);
      for (let i = 0; i < years && t.alive; i += 1) t = E.simulateYear(t, sp, env, ALLOC);
      return t;
    };
    const aspen = run('aspen', GOOD_ENV, 200);
    expect(aspen.alive).toBe(false);
    expect(aspen.causeOfDeath, 'aspen should reach its lifespan in good conditions').toBe('senescence');

    const harsh = { tempC: 22, light: 0.25, co2ppm: 420, soilWater: 0.2 };
    const willow = run('willow', harsh, 200);
    expect(willow.causeOfDeath, 'willow should starve in shade and drought').toBe('carbon_starvation');
    expect(willow.age, 'willow should die far earlier than its lifespan').toBeLessThan(40);

    const html = render({ treeLab: { view: 'compare', bandOverride: 'g68', light: 0.25, soilWater: 0.2, compareYears: 150 } });
    expect(html).toContain('starved');
    const goodHtml = render({ treeLab: { view: 'compare', bandOverride: 'g68', light: GOOD_ENV.light, soilWater: GOOD_ENV.soilWater, compareYears: 150 } });
    expect(goodHtml).toContain('old age');
  });

  it('lets conditions change the ranking, as the note claims', () => {
    // The panel tells the student a losing species is not a worse tree, and that
    // changing the light or water can change the order. That claim has to be true.
    const E = engine();
    const finalHeight = (spId, env) => {
      const sp = E.speciesById(spId);
      let t = E.newTree(spId);
      for (let i = 0; i < 150 && t.alive; i += 1) t = E.simulateYear(t, sp, env, ALLOC);
      return t.heightM;
    };
    const harsh = { tempC: 22, light: 0.25, co2ppm: 420, soilWater: 0.3 };
    const goodOrder = finalHeight('redwood', GOOD_ENV) > finalHeight('pine', GOOD_ENV);
    const harshOrder = finalHeight('redwood', harsh) > finalHeight('pine', harsh);
    expect(goodOrder, 'redwood should out-grow pine in good conditions').toBe(true);
    expect(harshOrder, 'the order should reverse in shade and drought').toBe(false);
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

    const experimentBaseline = {
      speciesId: 'oak', tree: E.cloneTreeSnapshot(tree, 'oak'),
      env: { ...GOOD_ENV, droughtYears: [] }, alloc: { ...ALLOC },
    };
    const experimentTreatment = {
      env: { ...GOOD_ENV, soilWater: 0.3, droughtYears: [] }, alloc: { ...ALLOC },
    };
    const experimentPrediction = { limiter: 'water', outcome: 'struggle', reason: '' };
    const experimentResult = E.runExperimentTrial(
      experimentBaseline.tree, 'oak', experimentTreatment.env, experimentTreatment.alloc, 10,
    );
    const experimentTrial = E.normaliseTrialRecord({
      speciesId: 'oak', duration: 10, prediction: experimentPrediction,
      baseline: experimentBaseline, treatment: experimentTreatment,
      result: experimentResult, explanation: '',
    });

    const SURFACES = [
      ['grow/k2', { view: 'grow', bandOverride: 'k2', tree }],
      ['grow/g68', { view: 'grow', bandOverride: 'g68', tree }],
      ['grow/g912', { view: 'grow', bandOverride: 'g912', tree }],
      ['grow/predict', {
        view: 'grow', bandOverride: 'g68', tree,
        experiment: { phase: 'predict', duration: 10, prediction: experimentPrediction,
          baseline: experimentBaseline },
      }],
      ['grow/ready', {
        view: 'grow', bandOverride: 'g68', tree,
        experiment: { phase: 'ready', duration: 10, prediction: experimentPrediction,
          baseline: experimentBaseline, treatment: experimentTreatment },
      }],
      ['grow/explain-ab', {
        view: 'grow', bandOverride: 'g68', tree: experimentResult.tree,
        experiment: { phase: 'explain', duration: 10, prediction: experimentPrediction,
          baseline: experimentBaseline, treatment: experimentTreatment, result: experimentResult },
        experimentTrials: { A: experimentTrial, B: experimentTrial },
      }],
      // Full screen is a SEPARATE render path — its own HUD, conditions panel,
      // presets, budget lines and toolbar — and it was outside this sweep entirely,
      // so nothing checked whether any of that text could be translated.
      ['grow/full', { view: 'grow', bandOverride: 'g68', tree, viewerFull: true }],
      ['grow/full-dead', {
        view: 'grow', bandOverride: 'g68', viewerFull: true,
        tree: { ...tree, alive: false, causeOfDeath: 'carbon_starvation', deficitYears: 9 },
      }],
      ['chem/k2', { view: 'chem', bandOverride: 'k2', tree }],
      ['chem/g912', { view: 'chem', bandOverride: 'g912', tree }],
      ['transport/g68', { view: 'transport', bandOverride: 'g68', tree }],
      ['transport/g912', { view: 'transport', bandOverride: 'g912', tree }],
      ['quiz', { view: 'quiz', tree, quizPick: 1 }],
      ['dead/starved', {
        view: 'grow', bandOverride: 'g68',
        tree: { ...tree, alive: false, causeOfDeath: 'carbon_starvation', deficitYears: 9 },
      }],
      ['dead/old', {
        view: 'grow', bandOverride: 'g68',
        tree: { ...tree, alive: false, causeOfDeath: 'senescence' },
        spreadTotals: { diverse: 2, clonal: 3 },
      }],
      ['grow/winter', { view: 'grow', bandOverride: 'g68', tree, season: 'winter' }],
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

    // The sweep above strips TAGS, so accessible names were invisible to it — and
    // that is exactly where the worst gap lived: the 3-D scene description, the only
    // account of the canvas a screen-reader user ever gets, was assembled from bare
    // English ("Three-dimensional summer view of White Oak, age 40 years...") and
    // stayed English in every language. Attribute values get the same treatment as
    // visible prose.
    const attrLeftovers = [];
    for (const [label, state] of SURFACES) {
      const html = render({ treeLab: state }, { t: (k) => MARK + k + MARK });
      const attrRe = /(?:aria-label|title|alt)="([^"]*)"/g;
      let am;
      while ((am = attrRe.exec(html))) {
        const v = am[1]
          .replace(new RegExp(MARK + '[^' + MARK + ']*' + MARK, 'g'), ' ')
          .replace(/&[a-z]+;/g, ' ');
        const words = v.split(/\s+/).filter((w) => /[a-zA-Z]{3}/.test(w));
        if (words.length >= 4) attrLeftovers.push(`${label}: ${v.trim().slice(0, 100)}`);
      }
    }
    expect(attrLeftovers, `untranslated accessible names:\n  ${attrLeftovers.join('\n  ')}`).toEqual([]);

    // Non-vacuity. Two of the surfaces above are full screen, which is a separate
    // render path; if it ever stops rendering in this harness those entries would
    // pass by containing no text at all, and a sweep that is green because it found
    // nothing to look at is worse than no sweep.
    const fullHtml = render({ treeLab: { view: 'grow', bandOverride: 'g68', tree, viewerFull: true } });
    expect(fullHtml, 'full-screen toolbar missing — the sweep above covered nothing').toContain('data-tree-fullbar');
    expect(fullHtml, 'full-screen conditions panel missing').toContain('data-tree-fullconds');
    expect(fullHtml, 'full-screen HUD missing').toContain('data-tree-fullhud');
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

describe('Tree Life Lab — season control and post-mortem', () => {
  function grown(years, over) {
    const E = engine();
    const sp = E.speciesById('oak');
    let t = E.newTree('oak');
    for (let i = 0; i < years && t.alive; i++) t = E.simulateYear(t, sp, GOOD_ENV, ALLOC);
    return { ...t, ...(over || {}) };
  }

  it('offers all four seasons as pressable controls on the Grow view', () => {
    const html = render({ treeLab: { view: 'grow', tree: grown(40), season: 'autumn' } });
    for (const s of ['Spring', 'Summer', 'Autumn', 'Winter']) {
      expect(html, `no control for ${s}`).toContain(s);
    }
    // The chosen one is the pressed one. Before this existed the season was reachable
    // only by running the clock at its slowest speed and catching the right moment.
    const seasonButton = html.match(/<button[^>]*allo-tree-season-choice is-current[^>]*>[\s\S]*?<\/button>/);
    expect(seasonButton, 'Autumn season control is missing').not.toBeNull();
    expect(seasonButton[0], 'Autumn is selected but not marked pressed').toMatch(/aria-pressed="true"/);
    expect(seasonButton[0]).toMatch(/Autumn/);
  });

  it('labels seasonal numbers as a modelled trace that rolls up to the yearly step', () => {
    const html = render({ treeLab: { view: 'grow', tree: grown(40), season: 'winter' } });
    expect(html).toContain('data-tree-season-ledger="modelled-seasonal-trace"');
    expect(html).toMatch(/modelled seasonal trace/i);
    expect(html).toMatch(/whole YEAR/);
    expect(html).toMatch(/add exactly to the yearly carbon budget/i);
    expect(html).toMatch(/year boundary/i);
    expect(html).not.toContain('not a figure the model has recalculated');
  });

  it('a season note is keyed on leaf habit, because that IS the lesson', () => {
    const broad = render({ treeLab: { view: 'grow', speciesId: 'oak', tree: grown(40), season: 'spring' } });
    const conifer = render({ treeLab: { view: 'grow', speciesId: 'pine', tree: grown(40), season: 'spring' } });
    expect(broad).toMatch(/build a whole new canopy/);
    expect(conifer).toMatch(/already built and in place/);
    expect(broad).not.toEqual(conifer);
  });

  it('tells old age and starvation apart, and only advises about the fixable one', () => {
    const starved = render({ treeLab: { view: 'grow', tree: grown(40, { alive: false, causeOfDeath: 'carbon_starvation', deficitYears: 9 }) } });
    const old = render({ treeLab: { view: 'grow', tree: grown(40, { alive: false, causeOfDeath: 'senescence' }) } });

    expect(starved).toMatch(/starved/i);
    expect(starved, 'no actionable advice after a death the student caused').toMatch(/To get further next time/);

    expect(old).toMatch(/old age/i);
    // Reaching a lifespan is not a failure, so offering fixes for it teaches the wrong
    // thing about what killed the tree.
    expect(old, 'old age is not a mistake to correct').not.toMatch(/To get further next time/);
    expect(old).toMatch(/Nothing went wrong/);
  });

  it('claims "passed its maximum age" only when the age actually passed it', () => {
    // Senescence normally fires at age > maxAgeYears, so the claim is usually true. But
    // it is read off a FLAG, and stored state can be older than the code reading it, so
    // a 71-year-old white oak must not be told it outlived a 400-year lifespan.
    const young = render({ treeLab: { view: 'grow', speciesId: 'oak', tree: grown(40, { alive: false, causeOfDeath: 'senescence' }) } });
    expect(young).toMatch(/Nothing went wrong/);
    expect(young, 'stated a lifespan it had not reached').not.toMatch(/passed the typical maximum/);
    expect(young).toMatch(/typically lives up to/);

    const E = engine();
    const sp = E.speciesById('willow');
    let t = E.newTree('willow');
    for (let i = 0; i < 400 && t.alive; i++) t = E.simulateYear(t, sp, GOOD_ENV, ALLOC);
    expect(t.alive, 'a willow should not survive 400 years').toBe(false);
    expect(t.causeOfDeath).toBe('senescence');
    const old = render({ treeLab: { view: 'grow', speciesId: 'willow', tree: t } });
    expect(old, 'a genuinely over-age tree should say so').toMatch(/passed the typical maximum/);
  });

  it('says the genet outlives the stem only when there are clones to outlive it', () => {
    const withClones = render({
      treeLab: {
        view: 'grow', speciesId: 'aspen',
        tree: grown(40, { alive: false, causeOfDeath: 'senescence' }),
        spreadTotals: { diverse: 0, clonal: 4 },
      },
    });
    const alone = render({
      treeLab: {
        view: 'grow', speciesId: 'aspen',
        tree: grown(40, { alive: false, causeOfDeath: 'senescence' }),
        spreadTotals: { diverse: 0, clonal: 0 },
      },
    });
    expect(withClones).toMatch(/not finished/);
    expect(alone).not.toMatch(/not finished/);
  });
});

describe('Tree Life Lab — the spread map', () => {
  // The map's whole claim is that it DRAWS the decade that was already resolved. If it
  // rolled its own dice it would be a second, disagreeing simulation sitting directly
  // above the table it contradicts.
  function mapHtml(spend, eventId, mutate) {
    const E = engine();
    const sp = E.speciesById('aspen');
    let t = E.newTree('aspen');
    for (let i = 0; i < 60 && t.alive; i++) {
      t = E.simulateYear(t, sp, GOOD_ENV, { leaf: 0.3, root: 0.2, wood: 0.3, repro: 0.1, store: 0.1 });
    }
    const res = E.resolveSpread(spend, { id: eventId, name: eventId, icon: '•', blurb: '' }, E.lcg(11));
    if (mutate) mutate(res);
    return {
      res,
      html: render({ treeLab: { view: 'spread', speciesId: 'aspen', tree: t, lastSpread: { event: eventId, res } } }),
    };
  }
  // Count by data-mark, not by geometry: the LEGEND draws the same shapes at the same
  // radii, so a geometric regex silently counts the key as part of the map.
  const marks = (html, kind) => [...html.matchAll(new RegExp(`data-mark="${kind}"`, 'g'))].length;
  const seedMarks = (html) => marks(html, 'seed');
  const cloneMarks = (html) => marks(html, 'clone');
  const failMarks = (html) => marks(html, 'fail');

  it('draws exactly the descendants that were resolved, and no others', () => {
    const { res, html } = mapHtml({ seed_wind: 8, root_sucker: 4 }, 'calm');
    const attempts = res.results.reduce((n, r) => n + r.attempts, 0);
    expect(attempts, 'test needs a decade small enough to draw uncapped').toBeLessThan(70);
    expect(seedMarks(html), 'seed survivors drawn ≠ seed survivors resolved').toBe(res.diverseCount);
    expect(cloneMarks(html), 'clonal survivors drawn ≠ clonal survivors resolved').toBe(res.clonalCount);
    expect(seedMarks(html) + cloneMarks(html) + failMarks(html)).toBe(attempts);
    expect(html).toContain('Decade outcome');
    expect(html).toContain('allo-tree-spread-results-grid');
  });

  it('is stable: the same resolved decade draws the same picture', () => {
    const a = mapHtml({ seed_wind: 8, root_sucker: 4 }, 'calm').html;
    const b = mapHtml({ seed_wind: 8, root_sucker: 4 }, 'calm').html;
    expect(a).toBe(b);
  });

  it('puts clonal stems beside the parent and seed further out', () => {
    // This is the entire point of drawing it. If the geometry does not carry the
    // distance trade, the map is decoration.
    const { html } = mapHtml({ seed_wind: 10, root_sucker: 4 }, 'calm');
    const C = 160;
    const dist = (x, y) => Math.hypot(x - C, y - C);
    const clones = [...html.matchAll(/data-mark="clone"[^>]*x="([\d.]+)"[^>]*y="([\d.]+)"/g)]
      .map((m) => dist(parseFloat(m[1]) + 4, parseFloat(m[2]) + 4));
    const seeds = [...html.matchAll(/data-mark="seed"[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"/g)]
      .map((m) => dist(parseFloat(m[1]), parseFloat(m[2])));
    expect(clones.length).toBeGreaterThan(0);
    expect(seeds.length).toBeGreaterThan(0);
    expect(Math.max(...clones), 'the furthest clone should not out-reach the nearest seed')
      .toBeLessThan(Math.min(...seeds));
    // And nothing may hide underneath the parent marker, which is what buried the root
    // connections in the first version.
    expect(Math.min(...clones, ...seeds)).toBeGreaterThan(13);
  });

  it('draws a shared-root wipe as struck-out stems still joined to the parent', () => {
    const { html } = mapHtml({ seed_wind: 6, root_sucker: 5 }, 'pathogen', (res) => {
      for (const r of res.results) if (r.diversity === 0) { r.wiped = true; r.took = 0; }
    });
    expect(marks(html, 'wiped'), 'no struck-out stems drawn').toBeGreaterThan(4);
    expect(cloneMarks(html), 'a wiped clone must not also be drawn as a survivor').toBe(0);
    expect(html, 'the legend must explain the crosses it is showing').toMatch(/Killed together/);
    // The root lines ARE the mechanism. Without them, "killed together" is an assertion
    // rather than something the picture shows you.
    expect(marks(html, 'root'), 'wiped stems drawn with no root connection to the parent')
      .toBeGreaterThan(4);
  });

  it('never claims a scale in metres it does not have', () => {
    const { html } = mapHtml({ seed_wind: 8, root_sucker: 4 }, 'calm');
    expect(html).toMatch(/RELATIVE/);
  });

  it('says so when it draws fewer markers than there were attempts', () => {
    // A big mast year overruns the per-strategy cap. Silently truncating would make a
    // heavily-committed decade look identical to a modest one.
    const { res, html } = mapHtml({ seed_wind: 90 }, 'calm');
    const attempts = res.results.reduce((n, r) => n + r.attempts, 0);
    expect(attempts, 'test needs enough attempts to trip the cap').toBeGreaterThan(70);
    expect(html, 'markers were dropped without saying so').toMatch(/Showing \d+ of \d+ attempts/);
  });
});

describe('Tree Life Lab — response curves', () => {
  function chem(over) {
    const E = engine();
    const sp = E.speciesById('oak');
    let t = E.newTree('oak');
    for (let i = 0; i < 70 && t.alive; i++) t = E.simulateYear(t, sp, GOOD_ENV, ALLOC);
    return render({
      treeLab: Object.assign(
        { view: 'chem', bandOverride: 'g912', speciesId: 'oak', tree: t,
          light: 0.85, soilWater: 0.75, tempC: 22, co2ppm: 420 },
        over || {}),
    });
  }
  // Each panel's polyline, as arrays of plotted y values.
  function paths(html) {
    return [...html.matchAll(/<path d="(M[^"]+?)" fill="none"/g)].map((m) =>
      m[1].split(/[ML]/).filter(Boolean).map((p) => parseFloat(p.trim().split(/\s+/)[1])));
  }

  it('plots the whole rate, so a gated input comes back FLAT', () => {
    // The point of the figure. In deep shade, light is the smaller of the two supply
    // terms, so sweeping CO2 from 180 to 900 ppm must change nothing at all — the
    // curve is a straight horizontal line. Plotting the isolated CO2 factor instead
    // would draw a rising curve and teach the opposite of what the tool says.
    const shade = paths(chem({ light: 0.06 }));
    expect(shade.length, 'expected four panels').toBe(4);
    const co2 = shade[1];
    const spread = Math.max(...co2) - Math.min(...co2);
    expect(spread, `the CO2 curve moved ${spread.toFixed(2)}px while light was limiting`).toBeLessThan(0.6);

    // And with light plentiful it is NOT flat, or the test above would pass on a bug
    // that simply never draws the CO2 curve.
    const lit = paths(chem({ light: 0.95 }))[1];
    expect(Math.max(...lit) - Math.min(...lit)).toBeGreaterThan(5);
  });

  it('shares one y scale across all four panels', () => {
    // Per-panel autoscaling would make a flat curve look like a full-height one and
    // destroy the only comparison the figure exists to support.
    const html = chem();
    // Every panel prints two ticks, its maximum and a zero; only the maxima are
    // compared. A first version of this compared both and "found" two scales.
    const ticks = [...html.matchAll(/tabular-nums[^>]*>([\d.]+)<\/text>/g)].map((m) => m[1]);
    const maxima = [...new Set(ticks.filter((v) => v !== '0'))];
    expect(ticks.filter((v) => v === '0').length, 'expected one zero tick per panel').toBe(4);
    expect(maxima.length, `panels disagree on the y maximum: ${maxima.join(', ')}`).toBe(1);
  });

  it('marks exactly one panel as limiting, and it is the one the engine names', () => {
    const html = chem({ light: 0.12 });
    expect([...html.matchAll(/LIMITING/g)].length).toBe(1);
    // In deep shade with everything else ample, light is what the engine reports.
    const limitingStart = html.indexOf('allo-tree-curve-panel is-limiting');
    const limitingHeader = html.slice(limitingStart, html.indexOf('<svg', limitingStart));
    expect(limitingStart, 'no curve panel has the limiting treatment').toBeGreaterThan(-1);
    expect(limitingHeader, 'the badge is not on the light panel').toContain('Light');
  });

  it('reports water, not CO2, when drought is the real cause', () => {
    // The tool's signature subtlety: under drought CO2 is the smallest NUMBER, but
    // closed stomata are why. The figure must not send a student off to add CO2.
    const html = chem({ soilWater: 0.1, tempC: 26 });
    expect(html).toMatch(/closed the stomata/);
  });

  it('never claims a scale in units it does not have, and says the points are the model’s', () => {
    const html = chem();
    expect(html).toMatch(/kg of carbon a year/);
    expect(html).toMatch(/re-run with that one input changed/);
  });

  it('gives K-2 the picture-free version rather than four axes', () => {
    const html = chem({ bandOverride: 'k2' });
    expect(html).not.toMatch(/LIMITING/);
    expect(html).toMatch(/does not eat food from the soil/);
  });

  it('uses a factor palette that a colour-blind reader can separate', () => {
    // The previous palette put CO2 on #60a5fa and water on #38bdf8 — two light blues
    // 6.7 ΔE apart for NORMAL vision, and they are the exact pair this tool teaches
    // students to distinguish. Pin the fix so it cannot quietly regress.
    const html = chem();
    // The validated hues are in use...
    expect(html, 'CO2 is not on the validated violet').toMatch(/#7c3aed/);
    expect(html, 'water is not on the validated blue').toMatch(/#0284c7/);
    expect(html, 'light is not on the validated gold').toMatch(/#ca8a04/);
    expect(html, 'temperature is not on the validated red').toMatch(/#dc2626/);
    // ...and the retired two-blues pair is gone from this view entirely, including
    // the factor BARS under the figure, which kept their own hardcoded copies and
    // would otherwise have shown a different colour for the same factor.
    expect(html, 'an old factor hue survived').not.toMatch(/#60a5fa|#facc15/);
  });
});

describe('Tree Life Lab — the comparison chart', () => {
  function cmp(over) {
    const E = engine();
    return render({
      treeLab: Object.assign(
        { view: 'compare', bandOverride: 'g912', speciesId: 'oak', tree: E.newTree('oak'),
          compareYears: 150, light: 0.85, soilWater: 0.75, tempC: 22, co2ppm: 420 },
        over || {}),
    });
  }
  const hues = (html) => Object.fromEntries(
    [...html.matchAll(/data-species="(\w+)"[^>]*stroke="([^"]+)"/g)].map((m) => [m[1], m[2]]));

  it('overlays all five species on one pair of axes', () => {
    // They used to be five sparklines in five boxes, each stretched to its own width.
    // Comparing five pictures is the one thing a comparison view must not require.
    const html = cmp();
    const found = hues(html);
    expect(Object.keys(found).sort()).toEqual(['aspen', 'oak', 'pine', 'redwood', 'willow']);
    // All of them inside a single <svg>, or they are not sharing axes.
    const firstSvg = html.slice(html.indexOf('<svg'), html.indexOf('</svg>'));
    expect([...firstSvg.matchAll(/data-species=/g)].length).toBe(5);
  });

  it('colours follow the species, never its rank', () => {
    // The named anti-pattern: assigning by current order means changing the years
    // slider repaints every survivor, and a reader who learned "oak is blue" is misled.
    const short = hues(cmp({ compareYears: 60 }));
    const long = hues(cmp({ compareYears: 400 }));
    for (const id of Object.keys(short)) {
      expect(long[id], `${id} changed colour when the run length changed`).toBe(short[id]);
    }
    // And the same holds when the student switches their own species.
    const asAspen = hues(cmp({ speciesId: 'aspen' }));
    expect(asAspen.oak).toBe(short.oak);
  });

  it('marks where a run ended and says when in the legend', () => {
    const html = cmp({ compareYears: 400 });
    const died = [...html.matchAll(/data-died="(\w+)"/g)].map((m) => m[1]);
    expect(died.length, 'nothing died in a 400-year run of five species').toBeGreaterThan(0);
    // The legend has to carry the AGE, because a cross on a crowded chart is easy to
    // miss and impossible to read a number off.
    //
    // A regex literal, not `new RegExp('...\d+')`: inside a JS string literal `\d` is
    // just the letter d, so the first version of this asserted the page contained the
    // text "d+" and would have passed against almost anything.
    expect(html, 'no death age in the legend').toMatch(/[\u2715\u00d7][0-9]+/);
  });

  it('keeps five identities when high contrast collapses every hue', () => {
    const html = cmp({}, );
    const contrast = render({
      treeLab: { view: 'compare', bandOverride: 'g912', speciesId: 'oak',
        tree: engine().newTree('oak'), compareYears: 150 },
    }, { isContrast: true });
    // Every decorative hue becomes the one accent, so the dash pattern is the only
    // identity channel left. Five series need five distinguishable patterns.
    const dashes = [...contrast.matchAll(/data-species="\w+"[^>]*stroke-dasharray="([^"]*)"/g)]
      .map((m) => m[1]);
    const solid = [...contrast.matchAll(/data-species="\w+"(?![^>]*stroke-dasharray)/g)].length;
    expect(dashes.length + solid, 'not every species is drawn in contrast mode').toBe(5);
    expect(new Set(dashes).size, `dash patterns repeat: ${dashes.join(' | ')}`).toBe(dashes.length);
    expect(html).toBeTruthy();
  });

  it('describes the whole chart for a reader who cannot see it', () => {
    const html = cmp();
    expect(html).toMatch(/Height against age for five species/);
    expect(html).toMatch(/Coast Redwood (reached|died)/);
  });
});

describe('Tree Life Lab — controlled investigations and A/B notebook', () => {
  function grown(E, years = 25) {
    let tree = E.newTree('oak');
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, E.speciesById('oak'), GOOD_ENV, ALLOC);
    }
    return tree;
  }

  function baseline(E, tree) {
    return {
      speciesId: 'oak',
      tree: E.cloneTreeSnapshot(tree, 'oak'),
      env: { ...GOOD_ENV, droughtYears: [] },
      alloc: { ...ALLOC },
    };
  }

  it('runs a frozen trial deterministically without mutating its starting tree', () => {
    const E = engine();
    const tree = grown(E);
    const before = JSON.parse(JSON.stringify(tree));
    const first = E.runExperimentTrial(tree, 'oak', GOOD_ENV, ALLOC, 10);
    const second = E.runExperimentTrial(tree, 'oak', GOOD_ENV, ALLOC, 10);

    expect(first).toEqual(second);
    expect(tree).toEqual(before);
    expect(first.summary.yearsCompleted).toBe(10);
    expect(first.summary.endAge - first.summary.startAge).toBe(10);
    expect(Number.isFinite(first.summary.meanNet)).toBe(true);
    expect(Number.isFinite(first.summary.meanRingWidth)).toBe(true);

    first.tree.history[0].net = -999;
    expect(tree.history[0].net).toBe(before.history[0].net);
  });

  it('stops a lethal treatment at death and reports finite evidence', () => {
    const E = engine();
    const result = E.runExperimentTrial(
      grown(E, 5), 'oak',
      { tempC: 22, light: 0.01, co2ppm: 420, soilWater: 0.8 },
      ALLOC, 100,
    );

    expect(result.summary.alive).toBe(false);
    expect(result.summary.observedOutcome).toBe('die');
    expect(result.summary.yearsCompleted).toBeLessThan(100);
    expect(result.summary.causeOfDeath).toBe('carbon_starvation');
    for (const value of Object.values(result.summary)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('normalises hostile persisted workflow and notebook state safely', () => {
    const E = engine();
    const tree = grown(E, 10);
    const invalid = E.normaliseExperiment({
      phase: 'teleport', duration: Infinity,
      prediction: { limiter: 'magic', outcome: 'maybe', reason: 9 },
      baseline: null,
    });
    expect(invalid.phase).toBe('idle');
    expect(invalid.duration).toBe(10);
    expect(invalid.prediction).toEqual({ limiter: null, outcome: null, reason: '' });

    const missingResult = E.normaliseExperiment({
      phase: 'explain', duration: 10,
      prediction: { limiter: 'light', outcome: 'thrive' },
      baseline: baseline(E, tree),
      treatment: { env: GOOD_ENV, alloc: ALLOC },
      result: { tree: null, summary: { meanNet: NaN } },
    });
    expect(missingResult.phase).toBe('ready');
    expect(E.normaliseExperimentTrials({ A: 'broken', B: { baseline: {} } }))
      .toEqual({ A: null, B: null });

    const html = render({ treeLab: {
      view: 'grow', tree, experiment: { phase: 'explain', baseline: null },
      experimentTrials: { A: 'broken', B: { result: false } },
    } });
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain('Investigation studio');
  });
  it('keeps advanced evidence calm by default and opens it on demand', () => {
    const E = engine();
    const tree = grown(E, 12);

    const calm = render({ treeLab: { view: 'grow', tree, bandOverride: 'g68' } });
    expect(calm).toContain('aria-expanded="false"');
    expect(calm).toContain('Go deeper');
    expect(calm).toContain('Investigation studio');
    expect(calm).not.toContain('Survival margin');
    expect(calm).not.toContain('What was limiting, year by year');

    const open = render({ treeLab: {
      view: 'grow', tree, bandOverride: 'g68', growAdvancedOpen: true,
    } });
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('Hide advanced tools');
    expect(open).toContain('Survival margin');
    expect(open).toContain('What was limiting, year by year');

    const active = render({ treeLab: {
      view: 'grow', tree,
      experiment: {
        phase: 'predict', duration: 10,
        prediction: { limiter: null, outcome: null, reason: '' },
        baseline: baseline(E, tree),
      },
    } });
    expect(active).toContain('aria-expanded="true"');
    expect(active).toContain('Advanced tools in use');
    expect(active).toContain('Make your prediction');
  });

  it('connects a changed condition to budget, limiter, and tree response', () => {
    const E = engine();
    const tree = grown(E, 5);
    const html = render({ treeLab: {
      view: 'grow', tree,
      lastEffect: {
        seq: 1, factor: 'light', before: 0.4, after: 0.8,
        netBefore: 1.2, netAfter: 3.7, limiting: 'water', mode: 'slider',
      },
    } });

    expect(html).toContain('data-tree-effect="light"');
    expect(html).toContain('data-tree-scene-effect="light"');
    expect(html).toContain('Last change');
    expect(html).toContain('You changed');
    expect(html).toContain('Carbon budget');
    expect(html).toContain('Limiting at that change');
    expect(html).toContain('Response to that change');
  });

  it('renders Predict, Run, Explain, and a controlled A/B evidence table', () => {
    const E = engine();
    const tree = grown(E);
    const base = baseline(E, tree);
    const prediction = { limiter: 'water', outcome: 'struggle', reason: 'Less water closes stomata.' };
    const treatmentA = {
      env: { ...GOOD_ENV, soilWater: 0.3, droughtYears: [] },
      alloc: { ...ALLOC },
    };
    const treatmentB = {
      env: { ...GOOD_ENV, soilWater: 0.75, droughtYears: [] },
      alloc: { ...ALLOC },
    };
    const resultA = E.runExperimentTrial(base.tree, 'oak', treatmentA.env, treatmentA.alloc, 10);
    const resultB = E.runExperimentTrial(base.tree, 'oak', treatmentB.env, treatmentB.alloc, 10);

    const predictHtml = render({ treeLab: { view: 'grow', tree, playing: true,
      experiment: { phase: 'predict', duration: 10, prediction, baseline: base } } });
    expect(predictHtml).toContain('allo-tree-workbench');
    expect(predictHtml).toContain('allo-tree-workbench-sticky');
    expect(predictHtml).toContain('Make your prediction');
    expect(predictHtml).toContain('▶ Play');
    expect(predictHtml).not.toContain('Pause');

    const readyHtml = render({ treeLab: { view: 'grow', tree,
      experiment: { phase: 'ready', duration: 10, prediction, baseline: base, treatment: treatmentA } } });
    expect(readyHtml).toContain('Prediction locked');
    expect(readyHtml).toContain('Run trial');

    const explainHtml = render({ treeLab: { view: 'grow', tree: resultA.tree,
      experiment: { phase: 'explain', duration: 10, prediction, baseline: base,
        treatment: treatmentA, result: resultA, explanation: '' } } });
    expect(explainHtml).toContain('Observed outcome');
    expect(explainHtml).toContain('treelab-explanation');
    expect(explainHtml).toContain('role="status"');

    const makeTrial = (treatment, result) => E.normaliseTrialRecord({
      speciesId: 'oak', duration: 10, prediction, baseline: base,
      treatment, result, explanation: 'The carbon evidence supports the result.',
    });
    const notebookHtml = render({ treeLab: { view: 'grow', tree: resultB.tree,
      experimentTrials: { A: makeTrial(treatmentA, resultA), B: makeTrial(treatmentB, resultB) } } });
    expect(notebookHtml).toContain('Controlled pair');
    expect(notebookHtml).toContain('Trial evidence; difference is Trial B minus Trial A.');
    expect(notebookHtml).toContain('<table');
    expect(notebookHtml).toContain('Difference');
  });
});

describe('Tree Life Lab - derived 3D visual state', () => {
  function visual(E, tree, speciesId, env, season) {
    expect(typeof E.deriveTreeVisualState,
      'deriveTreeVisualState must be exported with the pure engine').toBe('function');
    return E.deriveTreeVisualState(tree, E.speciesById(speciesId), env, season);
  }

  it('keeps water stress and chronic carbon deficit as independent visual channels', () => {
    const E = engine();
    const healthy = { rootMass: 5, leafMass: 5, deficitYears: 0 };
    const wet = visual(E, healthy, 'oak', { soilWater: 0.9 }, 'summer');
    const dry = visual(E, healthy, 'oak', { soilWater: 0.03 }, 'summer');

    expect(dry.waterStress).toBeGreaterThan(wet.waterStress);
    expect(dry.severeWaterStress).toBe(true);
    expect(wet.severeWaterStress).toBe(false);
    expect(dry.carbonStress).toBe(wet.carbonStress);
    expect(dry.chronicDeficit).toBe(false);
    // Drought changes turgor/colour in the scene, not the carbon-driven canopy count.
    expect(dry.leafDensity).toBeCloseTo(wet.leafDensity, 10);
    expect(dry.leafScale).toBeCloseTo(wet.leafScale, 10);

    const carbonStarved = visual(E, { ...healthy, deficitYears: 99 }, 'oak',
      { soilWater: 0.9 }, 'summer');
    expect(carbonStarved.waterStress).toBeCloseTo(wet.waterStress, 10);
    expect(carbonStarved.carbonStress).toBeGreaterThan(wet.carbonStress);
    expect(carbonStarved.chronicDeficit).toBe(true);
    expect(carbonStarved.leafDensity).toBeLessThan(wet.leafDensity);
    expect(carbonStarved.leafScale).toBeLessThan(wet.leafScale);
  });

  it('draws broadleaf phenology without making evergreen needles disappear', () => {
    const E = engine();
    const tree = { rootMass: 5, leafMass: 5, deficitYears: 0 };
    const oakSpring = visual(E, tree, 'oak', { soilWater: 0.8 }, 'spring');
    const oakSummer = visual(E, tree, 'oak', { soilWater: 0.8 }, 'summer');
    const oakAutumn = visual(E, tree, 'oak', { soilWater: 0.8 }, 'autumn');
    const oakWinter = visual(E, tree, 'oak', { soilWater: 0.8 }, 'winter');
    const pineWinter = visual(E, tree, 'pine', { soilWater: 0.8 }, 'winter');

    expect(oakSpring.springGrowth).toBe(1);
    expect(oakSpring.leafDensity).toBeGreaterThan(0);
    expect(oakSpring.leafDensity).toBeLessThan(oakSummer.leafDensity);
    expect(oakSpring.leafScale).toBeLessThan(oakSummer.leafScale);
    expect(oakAutumn.leafDensity).toBeGreaterThan(oakSpring.leafDensity);
    expect(oakAutumn.leafDensity).toBeLessThan(oakSummer.leafDensity);
    expect(oakWinter.leafDensity).toBe(0);
    expect(pineWinter.leafDensity).toBe(1);
    expect(pineWinter.leafScale).toBe(1);
  });

  it('derives bounded root vigor from root investment rather than tree size alone', () => {
    const E = engine();
    const lowRoots = visual(E, { rootMass: 1, leafMass: 9, deficitYears: 0 }, 'oak',
      { soilWater: 0.8 }, 'summer');
    const balanced = visual(E, { rootMass: 5, leafMass: 5, deficitYears: 0 }, 'oak',
      { soilWater: 0.8 }, 'summer');
    const highRoots = visual(E, { rootMass: 9, leafMass: 1, deficitYears: 0 }, 'oak',
      { soilWater: 0.8 }, 'summer');
    const sameShareLargerTree = visual(E,
      { rootMass: 90, leafMass: 10, deficitYears: 0 }, 'oak',
      { soilWater: 0.8 }, 'summer');

    expect(lowRoots.rootVigor).toBeGreaterThanOrEqual(0.30);
    expect(lowRoots.rootVigor).toBeLessThan(balanced.rootVigor);
    expect(balanced.rootVigor).toBeLessThan(highRoots.rootVigor);
    expect(highRoots.rootVigor).toBeLessThanOrEqual(1);
    expect(sameShareLargerTree.rootVigor).toBeCloseTo(highRoots.rootVigor, 10);

    // Real model trajectories must retain separation too; synthetic mass shares can
    // hide a mapping that saturates immediately under ordinary allocation dynamics.
    const env = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.78 };
    let leafInvested = E.newTree('oak');
    let rootInvested = E.newTree('oak');
    for (let year = 0; year < 14; year += 1) {
      leafInvested = E.simulateYear(leafInvested, E.speciesById('oak'), env,
        { leaf: 0.55, root: 0.05, wood: 0.3, repro: 0, store: 0.1 });
      rootInvested = E.simulateYear(rootInvested, E.speciesById('oak'), env,
        { leaf: 0.1, root: 0.55, wood: 0.25, repro: 0, store: 0.1 });
    }
    const leafInvestedVisual = visual(E, leafInvested, 'oak', env, 'summer');
    const rootInvestedVisual = visual(E, rootInvested, 'oak', env, 'summer');
    expect(rootInvestedVisual.rootVigor).toBeGreaterThan(leafInvestedVisual.rootVigor + 0.08);
  });
});

describe('Survival margin: the death rule, made visible', () => {
  // deficitYears and the reserve floor decide carbon_starvation inside
  // simulateYear, but the only place a student ever saw deficitYears was the
  // sentence explaining the death AFTER it happened. These assert the gauge
  // reads the engine's own rule rather than a number invented for the UI.
  it('counts one deficit year per negative year and kills at the species limit', () => {
    const E = window.__alloTreeLabEngine;
    const sp = E.SPECIES.oak || Object.values(E.SPECIES)[0];
    const limit = Math.max(1, Math.round(6 + (sp.droughtTol || 0) * 8));
    const alloc = E.normaliseAlloc({});
    let t = E.newTree(sp.id);
    const good = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
    for (let y = 0; y < 20 && t.alive; y++) t = E.simulateYear(t, sp, good, alloc);
    expect(t.alive).toBe(true);
    expect(t.deficitYears).toBe(0);

    const dark = { tempC: 22, light: 0.005, co2ppm: 420, soilWater: 0.75 };
    const seen = [];
    for (let y = 0; y < limit + 5; y++) {
      t = E.simulateYear(t, sp, dark, alloc);
      seen.push(t.deficitYears);
      if (!t.alive) break;
    }
    // Climbs by one a year, so the gauge can count DOWN from the limit.
    expect(seen.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(t.alive).toBe(false);
    expect(t.causeOfDeath).toBe('carbon_starvation');
    // The student gets the whole tolerance as warning, not a surprise.
    expect(Math.max.apply(null, seen)).toBeLessThanOrEqual(limit);
  });

  it('a good year resets the counter, so the bar refills as the card promises', () => {
    const E = window.__alloTreeLabEngine;
    const sp = E.SPECIES.oak || Object.values(E.SPECIES)[0];
    const alloc = E.normaliseAlloc({});
    let t = E.newTree(sp.id);
    const good = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
    for (let y = 0; y < 20 && t.alive; y++) t = E.simulateYear(t, sp, good, alloc);
    const dark = { tempC: 22, light: 0.005, co2ppm: 420, soilWater: 0.75 };
    for (let y = 0; y < 3; y++) t = E.simulateYear(t, sp, dark, alloc);
    expect(t.deficitYears).toBeGreaterThan(0);
    t = E.simulateYear(t, sp, good, alloc);
    expect(t.deficitYears).toBe(0);
  });
});

describe('The objective: targets come from the model, not from a score', () => {
  it('uses the maturity height the renderer uses, and a strategy the species has', () => {
    const E = window.__alloTreeLabEngine;
    const S = E.STRATEGIES;
    for (const sp of Object.values(E.SPECIES)) {
      // Same definition the renderer uses to decide a tree looks mature.
      const goalH = Math.max(0.5, (sp.maxHeight || 30) * 0.6);
      expect(goalH).toBeGreaterThan(0);
      expect(goalH).toBeLessThan(sp.maxHeight);
      // The reproduction target must be a strategy this species actually has.
      let cheap = null;
      for (const st of S) { if (sp.modes.indexOf(st.id) < 0) continue; if (!cheap || st.cost < cheap.cost) cheap = st; }
      expect(cheap, sp.id + ' has no legal strategy').toBeTruthy();
      expect(sp.modes).toContain(cheap.id);
    }
  });

  it('is reachable for every species, at an age that reflects its biology', () => {
    const E = window.__alloTreeLabEngine;
    const S = E.STRATEGIES;
    const alloc = E.normaliseAlloc({ leaf: 0.3, wood: 0.4, root: 0.2, repro: 0.1 });
    const env = { tempC: 20, light: 0.8, co2ppm: 420, soilWater: 0.7 };
    const ages = {};
    for (const sp of Object.values(E.SPECIES)) {
      const goalH = Math.max(0.5, (sp.maxHeight || 30) * 0.6);
      let cheap = null;
      for (const st of S) { if (sp.modes.indexOf(st.id) < 0) continue; if (!cheap || st.cost < cheap.cost) cheap = st; }
      let t = E.newTree(sp.id), reached = null;
      for (let y = 0; y < (sp.maxAgeYears || 300) && t.alive; y++) {
        t = E.simulateYear(t, sp, env, alloc);
        if (!reached && t.heightM >= goalH && (t.seedsBanked || 0) >= cheap.cost) reached = t.age;
      }
      expect(reached, sp.id + ' can never reach the goal').toBeTruthy();
      expect(reached).toBeLessThan(sp.maxAgeYears);
      ages[sp.id] = reached;
    }
    // A pioneer aspen must get there sooner than a redwood, or the goal is not
    // teaching anything about the species the student picked.
    expect(ages.aspen).toBeLessThan(ages.redwood);
  });
});

describe('Tree Life Lab - observe, predict, explain chapter language', () => {
  it('turns K-2 chemistry into a structured leaf-kitchen story', () => {
    const html = render({ treeLab: { view: 'chem', bandOverride: 'k2' } });
    expect(html).toContain('data-science-trail="chem"');
    expect(html).toContain('Leaf kitchen');
    expect(html).toContain('Carbon dioxide from air');
    expect(html).toContain('Back to the air');
    expect(html).toContain('Make a guess');
    expect(html).toContain('Tell why');
    expect(html).toContain('allo-tree-reaction');
  });

  it('marks chemistry evidence and decodes the response curves', () => {
    const html = render({ treeLab: { view: 'chem', bandOverride: 'g68' } });
    expect(html).toMatch(/data-limiting-factor="(light|water|co2|temperature)"/);
    expect(html).toContain('Sets the pace');
    expect(html).toContain('your tree now');
    expect(html).toContain('flat means something else is limiting');
    expect(html).toContain('data-reasoning-step="predict"');
  });

  it('lets Transport reveal a reversible source-to-sink story', () => {
    const html = render({ treeLab: { view: 'transport', bandOverride: 'g68', season: 'spring' } });
    expect(html).toContain('data-science-trail="transport"');
    expect(html).toContain('Modelled daily flow');
    expect(html).toContain('Evaporation pulls');
    expect(html).toContain('Stored reserves');
    expect(html).toContain('New leaves');
    expect(html).toContain('where sugar starts');
    expect(html).toContain('where sugar is used or stored');
    expect(html).toContain('Water and sugar move through different tissues');
  });

  it('gives New Trees and Compare explicit evidence-reading scaffolds', () => {
    const E = engine();
    const tree = E.newTree('aspen');
    tree.seedsBanked = 30;
    const event = { id: 'calm', name: 'A quiet decade', icon: '\u00B7', blurb: 'No major disturbance.' };
    const res = E.resolveSpread({ seed_wind: 6, root_sucker: 6 }, event, E.lcg(9));
    const spread = render({ treeLab: {
      view: 'spread', bandOverride: 'k2', speciesId: 'aspen', tree,
      lastSpread: { event: 'calm', res }, spend: {}
    } });
    expect(spread).toContain('data-science-trail="spread"');
    expect(spread).toContain('Ten years pass');
    expect(spread).toContain('Weather and luck act');
    expect(spread).toContain('food points');
    expect(spread).toContain('What happened this time');
    expect(spread).toContain('New shoot from a root');
    expect(spread).not.toContain('Root sucker');
    expect(spread).not.toContain('Clonal copies');
    expect(spread).not.toContain('kg C');

    const compare = render({ treeLab: { view: 'compare', bandOverride: 'g68' } });
    expect(compare).toContain('data-science-trail="compare"');
    expect(compare).toContain('Scrollable chart comparing tree height through time');
    expect(compare).toContain('Swipe sideways to read the full chart');
    expect(compare).toContain('Typical lifespan');
    expect(compare).toContain('Height ceiling');
  });
});

describe('Tree Life Lab - tree memory yearbook', () => {
  function grownOak(years) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    }
    return tree;
  }

  it('invites a new learner to grow the first ring', () => {
    const html = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: grownOak(0) },
    });

    expect(html).toContain('data-tree-memory="empty"');
    expect(html).toContain('A lifetime record begins with one year');
    expect(html).toContain('Grow first year');
  });

  it('makes recent rings selectable and explains the selected evidence', () => {
    const tree = grownOak(15);
    const focusYear = tree.history[5].year;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: focusYear,
      },
    });

    expect(html).toContain('data-tree-memory="yearbook"');
    expect(html.match(/data-memory-year="/g)).toHaveLength(12);
    expect(html).toMatch(new RegExp('data-memory-year="' + focusYear + '"[^>]*aria-pressed="true"'));
    expect(html).toContain('data-memory-detail-year="' + focusYear + '"');
    expect(html).toContain('Net carbon');
    expect(html).toContain('Ring width');
    expect(html).toContain('Limiting factor');
    expect(html).toContain('Ring width remembers carbon sent to wood');
  });

  it('falls back to the newest valid record when focus state is malformed', () => {
    const tree = grownOak(9);
    const newestYear = tree.history[tree.history.length - 1].year;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: 'not-a-year',
      },
    });

    expect(html).toContain('data-memory-detail-year="' + newestYear + '"');
    expect(html).toMatch(new RegExp('data-memory-year="' + newestYear + '"[^>]*aria-pressed="true"'));
  });

  it('turns a drought ring into a causal stress story', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = grownOak(8);
    tree = E.simulateYear(tree, sp, { ...GOOD_ENV, soilWater: 0.001 }, ALLOC);
    const stressYear = tree.history[tree.history.length - 1].year;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: stressYear,
      },
    });

    expect(html).toMatch(new RegExp('data-memory-year="' + stressYear + '"[^>]*data-memory-stress="true"'));
    expect(html).toContain('Water stress closed the stomata');
    expect(html).toContain('drew on reserves');
    expect(html).toContain('not a direct weather measurement');
  });
});

describe('Tree Life Lab - tree memory pattern lens', () => {
  function grownOak(years) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    }
    return tree;
  }

  it('decodes height, color, and dashed stress marks before the timeline', () => {
    const tree = grownOak(1);
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: tree.history[0].year,
      },
    });

    expect(html).toContain('data-memory-key="height-color-outline"');
    expect(html).toContain('Height shows wood growth');
    expect(html).toContain('Top color shows the limiter');
    expect(html).toContain('Dashed means carbon deficit');
    expect(html).toContain('data-memory-trend="baseline"');
    expect(html).toContain('No earlier year to compare');
  });

  it('compares carbon and ring-width changes without overstating causality', () => {
    const tree = grownOak(10);
    const selected = tree.history[tree.history.length - 1];
    const previous = tree.history[tree.history.length - 2];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-compare="' + previous.year + '-to-' + selected.year + '"');
    expect(html).toMatch(/data-memory-trend="(wider|narrower|steady)"/);
    expect(html).toContain('Compared with Year ' + previous.year);
    expect(html).toContain('Net carbon change');
    expect(html).toContain('Ring-width change');
    expect(html).toContain('evidence, not proof');
  });

  it('recognizes a return to carbon surplus as recovery after stress', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = grownOak(8);
    tree = E.simulateYear(tree, sp, { ...GOOD_ENV, soilWater: 0.001 }, ALLOC);
    const stressYear = tree.history[tree.history.length - 1];
    tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    const recoveryYear = tree.history[tree.history.length - 1];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: recoveryYear.year,
      },
    });

    expect(stressYear.net).toBeLessThan(0);
    expect(recoveryYear.net).toBeGreaterThanOrEqual(0);
    expect(html).toContain('data-memory-trend="recovery"');
    expect(html).toContain('Recovery after stress');
    expect(html).toContain('Net carbon returned to surplus');
  });
});

describe('Tree Life Lab - tree memory detective', () => {
  function grownOak(years) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    }
    return tree;
  }

  function recoveryTree() {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = grownOak(8);
    tree = E.simulateYear(tree, sp, { ...GOOD_ENV, soilWater: 0.001 }, ALLOC);
    tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    return tree;
  }

  it('offers three evidence claims and waits without revealing a score', () => {
    const tree = grownOak(5);
    const selected = tree.history[tree.history.length - 1];
    const previous = tree.history[tree.history.length - 2];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-detective="' + previous.year + '-to-' + selected.year + '"');
    expect(html).toContain('data-memory-claim-result="waiting"');
    expect(html.match(/data-memory-claim="(recovery|setback|continuity)"/g)).toHaveLength(3);
    expect(html).toContain('Make an evidence-based claim');
    expect(html).toContain('Choose the claim best supported');
  });

  it('confirms a recovery claim with the two carbon-balance records', () => {
    const tree = recoveryTree();
    const selected = tree.history[tree.history.length - 1];
    const previous = tree.history[tree.history.length - 2];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
        historyClaimYear: selected.year,
        historyClaim: 'recovery',
      },
    });

    expect(previous.net).toBeLessThan(0);
    expect(selected.net).toBeGreaterThanOrEqual(0);
    expect(html).toContain('data-memory-claim-result="correct"');
    expect(html).toMatch(/data-memory-claim="recovery"[^>]*aria-pressed="true"/);
    expect(html).toContain('returned to surplus. That is recovery in this model.');
  });

  it('gives a retry cue and ignores an answer saved for another year', () => {
    const tree = recoveryTree();
    const selected = tree.history[tree.history.length - 1];
    const previous = tree.history[tree.history.length - 2];
    const retry = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
        historyClaimYear: selected.year,
        historyClaim: 'continuity',
      },
    });
    expect(retry).toContain('data-memory-claim-result="retry"');
    expect(retry).toContain('Not yet. Read the surplus or deficit label');

    const stale = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
        historyClaimYear: previous.year,
        historyClaim: 'recovery',
      },
    });
    expect(stale).toContain('data-memory-claim-result="waiting"');
    expect(stale).toMatch(/data-memory-claim="recovery"[^>]*aria-pressed="false"/);
  });
});

describe('Tree Life Lab - selected-year causal trail', () => {
  function grownOak(years) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    }
    return tree;
  }

  it('connects conditions, leaf response, carbon, and wood in order', () => {
    const tree = grownOak(5);
    const selected = tree.history[tree.history.length - 1];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-causal="condition-leaf-carbon-wood"');
    expect(html.match(/data-memory-causal-step="(condition|leaf|carbon|wood)"/g)).toHaveLength(4);
    expect(html).toMatch(/data-memory-causal-step="carbon"[^>]*data-causal-state="surplus"/);
    expect(html).toContain('Limiting condition');
    expect(html).toContain('Leaf response');
    expect(html).toContain('Carbon balance');
    expect(html).toContain('Growth-ring record');
    expect(html).toContain('Photosynthetic income minus maintenance respiration');
  });

  it('shows drought closing stomata before the deficit reaches wood', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = grownOak(8);
    tree = E.simulateYear(tree, sp, { ...GOOD_ENV, soilWater: 0.001 }, ALLOC);
    const selected = tree.history[tree.history.length - 1];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(selected.net).toBeLessThan(0);
    expect(html).toMatch(/data-memory-causal-step="leaf"[^>]*data-causal-state="closed"/);
    expect(html).toMatch(/data-memory-causal-step="carbon"[^>]*data-causal-state="deficit"/);
    expect(html).toMatch(/data-memory-causal-step="wood"[^>]*data-causal-state="stress"/);
    expect(html).toContain('Water stress restricted carbon dioxide entry');
    expect(html).toContain('little carbon available for wood');
  });

  it('keeps older histories useful when stomatal opening was not stored', () => {
    const tree = grownOak(4);
    const selected = tree.history[tree.history.length - 1];
    delete selected.aperture;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toMatch(/data-memory-causal-step="leaf"[^>]*data-causal-state="unknown"/);
    expect(html).toContain('Not recorded');
    expect(html).toContain('older record did not store a stomatal opening value');
  });
});

describe('Tree Life Lab - annual Field Notes', () => {
  function simulateWith(env) {
    const E = engine();
    const sp = E.speciesById('oak');
    return E.simulateYear(E.newTree('oak'), sp, env, ALLOC);
  }

  it('stores the annual model inputs with the ring that used them', () => {
    const env = {
      tempC: 17.4, light: 0.42, co2ppm: 610, soilWater: 0.33,
      forcedClose: false, drought: true,
    };
    const tree = simulateWith(env);
    const record = tree.history[0];

    expect(record).toMatchObject({
      tempC: 17.4,
      light: 0.42,
      co2ppm: 610,
      soilWater: 0.33,
      drought: true,
    });
  });

  it('reveals four condition notes while preserving the evidence boundary', () => {
    const tree = simulateWith({
      tempC: 17.4, light: 0.42, co2ppm: 610, soilWater: 0.33,
      forcedClose: false, drought: false,
    });
    const selected = tree.history[0];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-field-notes="available"');
    expect(html.match(/data-memory-field-note="(temperature|light|water|co2)"/g)).toHaveLength(4);
    expect(html).toContain('Open the annual Field Notes');
    expect(html).toContain('17.4\u00B0C');
    expect(html).toContain('42%');
    expect(html).toContain('610 ppm');
    expect(html).toContain('Evidence boundary: this snapshot records inputs supplied to the model');
    expect(html).toContain('not weather reconstructed from the ring');
  });

  it('labels legacy rings without fabricating missing weather inputs', () => {
    const tree = simulateWith(GOOD_ENV);
    const selected = tree.history[0];
    delete selected.tempC;
    delete selected.light;
    delete selected.co2ppm;
    delete selected.soilWater;
    delete selected.drought;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-field-notes="legacy"');
    expect(html).toContain('annual condition snapshots');
    expect(html).toContain('carbon, limiter, and ring evidence remain available');
    expect(html).not.toContain('data-memory-field-note=');
  });
});

describe('Tree Life Lab - Field Notes Change Lens', () => {
  function growWithEnvironments(environments) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    environments.forEach((env) => {
      tree = E.simulateYear(tree, sp, env, ALLOC);
    });
    return tree;
  }

  it('shows a steady comparison when all four annual inputs are unchanged', () => {
    const tree = growWithEnvironments([GOOD_ENV, GOOD_ENV]);
    const selected = tree.history[1];
    const previous = tree.history[0];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-field-compare="' + previous.year + '-to-' + selected.year + '"');
    expect(html).toContain('data-largest-input-shift="steady"');
    expect(html.match(/data-memory-condition-delta="(temperature|light|water|co2)"/g)).toHaveLength(4);
    expect(html.match(/data-delta-state="steady"/g)).toHaveLength(4);
    expect(html).toContain('The four stored inputs were unchanged');
    expect(html).toContain('tree became older and larger');
  });

  it('highlights soil water as the largest shift during drought recovery', () => {
    const drought = { ...GOOD_ENV, soilWater: 0.001, drought: true };
    const tree = growWithEnvironments([
      GOOD_ENV, GOOD_ENV, GOOD_ENV, drought, GOOD_ENV,
    ]);
    const selected = tree.history[tree.history.length - 1];
    const previous = tree.history[tree.history.length - 2];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(previous.soilWater).toBe(0.001);
    expect(selected.soilWater).toBe(0.75);
    expect(html).toContain('data-largest-input-shift="water"');
    expect(html).toMatch(/data-memory-condition-delta="water"[^>]*data-delta-state="increased"/);
    expect(html).toContain('Largest input shift: Soil water +75 points');
    expect(html).toContain('what changed most, not what caused the ring');
  });

  it('does not compare against a previous record whose conditions were never stored', () => {
    const tree = growWithEnvironments([GOOD_ENV, GOOD_ENV]);
    const selected = tree.history[1];
    const previous = tree.history[0];
    delete previous.tempC;
    delete previous.light;
    delete previous.co2ppm;
    delete previous.soilWater;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-field-notes="available"');
    expect(html).not.toContain('data-memory-field-compare=');
    expect(html).not.toContain('data-memory-condition-delta=');
  });
});

describe('Tree Life Lab - recreating historical conditions', () => {
  it('validates, clamps, and loads a snapshot without double-applying drought', () => {
    const E = engine();
    const current = {
      tempC: 22, light: 0.8, co2ppm: 420, soilWater: 0.7,
      droughtYears: [2, 5, 8],
      preservedSetting: 'yes',
    };
    const loaded = E.configForHistorySnapshot({
      tempC: 60,
      light: -0.2,
      co2ppm: 1200,
      soilWater: 1.4,
    }, current, 5);

    expect(loaded).toMatchObject({
      tempC: 45,
      light: 0,
      co2ppm: 900,
      soilWater: 1,
      droughtYears: [2, 8],
      preservedSetting: 'yes',
    });
    expect(current.droughtYears).toEqual([2, 5, 8]);
  });

  it('rejects incomplete or non-finite historical conditions', () => {
    const E = engine();
    expect(E.configForHistorySnapshot({
      tempC: 20, light: 0.5, co2ppm: 420,
    }, {}, 1)).toBeNull();
    expect(E.configForHistorySnapshot({
      tempC: 20, light: Number.NaN, co2ppm: 420, soilWater: 0.5,
    }, {}, 1)).toBeNull();
  });

  it('offers a conditions-only experiment bridge for complete records', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    const tree = E.simulateYear(E.newTree('oak'), sp, GOOD_ENV, ALLOC);
    const selected = tree.history[0];
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-field-action="load-conditions"');
    expect(html).toContain('Recreate the annual inputs');
    expect(html).toContain('Load these conditions');
    expect(html).toContain('does not rewind tree age or guarantee the same ring');
  });

  it('never offers the loader when a legacy snapshot is incomplete', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    const tree = E.simulateYear(E.newTree('oak'), sp, GOOD_ENV, ALLOC);
    const selected = tree.history[0];
    delete selected.soilWater;
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: selected.year,
      },
    });

    expect(html).toContain('data-memory-field-notes="legacy"');
    expect(html).not.toContain('data-memory-field-action=');
    expect(html).not.toContain('Load these conditions');
  });
});

describe('Tree Life Lab - historical-condition Replay Lab', () => {
  function growWith(environments) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    environments.forEach((env) => {
      tree = E.simulateYear(tree, sp, env, ALLOC);
    });
    return tree;
  }

  function replayFor(tree, source) {
    return {
      sourceYear: source.year,
      startAge: tree.age,
      sourceRing: source.ring,
      sourceNet: source.net,
      tempC: source.tempC,
      light: source.light,
      co2ppm: source.co2ppm,
      soilWater: source.soilWater,
    };
  }

  function replayMarkup(tree, source, replay, controls) {
    return render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
        historyFocusYear: source.year,
        historyReplay: replay,
        tempC: controls.tempC,
        light: controls.light,
        co2ppm: controls.co2ppm,
        soilWater: controls.soilWater,
        droughtYears: [],
      },
    });
  }

  it('turns a loaded snapshot into a clearly labelled one-year replay', () => {
    const tree = growWith([GOOD_ENV, GOOD_ENV, GOOD_ENV, GOOD_ENV]);
    const source = tree.history[1];
    const replay = replayFor(tree, source);
    const html = replayMarkup(tree, source, replay, replay);

    expect(html).toContain('data-memory-replay="ready"');
    expect(html).toContain('data-replay-source-year="' + source.year + '"');
    expect(html).toContain('data-replay-controlled-inputs="4-of-4"');
    expect(html.match(/data-replay-control="(tempC|light|soilWater|co2ppm)"/g)).toHaveLength(4);
    expect(html.match(/data-control-state="matched"/g)).toHaveLength(4);
    expect(html).toContain('4 of 4 controlled inputs matched');
    expect(html).toContain('data-replay-context="ready"');
    expect(html.match(/data-replay-context-metric="(age|height|diameter)"/g)).toHaveLength(3);
    expect(html).toContain('Tree context changed');
    expect(html).toContain('Replay ready at age ' + tree.age);
    expect(html).toContain('Grow one test year');
    expect(html).toContain('test them on the tree as it exists now');
  });

  it('compares carbon and ring outcomes after a faithful replay', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    const before = growWith([GOOD_ENV, GOOD_ENV, GOOD_ENV, GOOD_ENV]);
    const source = before.history[1];
    const replay = replayFor(before, source);
    const tree = E.simulateYear(before, sp, {
      tempC: replay.tempC, light: replay.light, co2ppm: replay.co2ppm,
      soilWater: replay.soilWater,
    }, ALLOC);
    const html = replayMarkup(tree, source, replay, replay);

    expect(html).toContain('data-memory-replay="complete"');
    expect(html).toContain('data-replay-controlled-inputs="4-of-4"');
    expect(html).toContain('data-replay-context="complete"');
    expect(html).toContain('Inputs stayed controlled while age, size, and maintenance demands continued changing.');
    expect(html).toContain('data-replay-ring-specimens="paired"');
    expect(html.match(/data-replay-ring-specimen="(historical|replay)"/g)).toHaveLength(2);
    expect(html).toContain('Paired ring specimens');
    expect(html).toContain('The outer band is scaled within this pair');
    expect(html).toContain('not a literal reconstruction of the whole trunk');
    expect(html).toContain('Same inputs, a different tree');
    expect(html).toContain('Net carbon change');
    expect(html).toContain('Ring-width change');
    expect(html).toContain('Same annual inputs do not freeze tree age, size, maintenance costs, or carbon allocation.');
  });

  it('does not present a changed treatment as a same-input result', () => {
    const E = engine();
    const sp = E.speciesById('oak');
    const before = growWith([GOOD_ENV, GOOD_ENV, GOOD_ENV, GOOD_ENV]);
    const source = before.history[1];
    const replay = replayFor(before, source);
    const changed = { ...replay, soilWater: 0.001 };
    const tree = E.simulateYear(before, sp, changed, ALLOC);
    const html = replayMarkup(tree, source, replay, changed);

    expect(html).toContain('data-memory-replay="modified"');
    expect(html).toContain('data-replay-controlled-inputs="3-of-4"');
    expect(html).toMatch(/data-replay-control="soilWater"[^>]*data-control-state="changed"/);
    expect(html).not.toContain('data-replay-context=');
    expect(html).not.toContain('data-replay-ring-specimens=');
    expect(html).toContain('Replay year used different inputs');
    expect(html).toContain('not a same-input replay');
    expect(html).not.toContain('Same annual inputs do not freeze');
  });

  it('asks learners to reload when controls change before the replay', () => {
    const tree = growWith([GOOD_ENV, GOOD_ENV, GOOD_ENV, GOOD_ENV]);
    const source = tree.history[1];
    const replay = replayFor(tree, source);
    const changed = { ...replay, soilWater: 0.2 };
    const html = replayMarkup(tree, source, replay, changed);

    expect(html).toContain('data-memory-replay="changed"');
    expect(html).toContain('data-replay-controlled-inputs="3-of-4"');
    expect(html).toMatch(/data-replay-control="soilWater"[^>]*data-control-state="changed"/);
    expect(html.match(/data-control-state="matched"/g)).toHaveLength(3);
    expect(html).toContain('Replay settings changed');
    expect(html).toContain('Reload the historical conditions before growing');
    expect(html).not.toContain('Grow one test year');

    const malformed = replayMarkup(tree, source, { ...replay, sourceNet: Number.NaN }, replay);
    expect(malformed).not.toContain('data-memory-replay=');
  });
});

describe('Tree Life Lab - three biological clocks', () => {
  function grownOak(years) {
    const E = engine();
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    }
    return tree;
  }

  it('separates a current snapshot, whole-year projection, and stored history', () => {
    const html = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: grownOak(40) },
    });

    expect(html).toContain('data-tree-timescales="now-year-life"');
    expect(html).toContain('data-tree-clock="now"');
    expect(html).toContain('data-tree-clock="year"');
    expect(html).toContain('data-tree-clock="lifetime"');
    expect(html).toContain('Minutes to hours');
    expect(html).toContain('One whole year');
    expect(html).toContain('Across a lifetime');
    expect(html).toMatch(/current-condition snapshot[\s\S]*whole-year projection[\s\S]*stored lifetime history/);
  });

  it('connects dry soil to closed stomata and an annual carbon deficit', () => {
    const html = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak',
        tree: grownOak(40), soilWater: 0.02,
      },
    });

    expect(html).toContain('data-clock-state="closed"');
    expect(html).toContain('Mostly closed');
    expect(html).toContain('Water stress is restricting carbon dioxide entry');
    expect(html).toContain('data-clock-state="deficit"');
  });

  it('stops every active clock claim when the tree has died', () => {
    const dead = grownOak(40);
    dead.alive = false;
    dead.causeOfDeath = 'carbon_starvation';
    const html = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: dead },
    });

    expect(html).toContain('No active exchange');
    expect(html).toContain('No carbon income');
    expect(html).toContain('Stem ended');
    expect(html.match(/data-clock-state="stopped"/g)).toHaveLength(2);
  });
});

describe('Tree Life Lab - seasonal observatory and species lens', () => {
  function matureTree(speciesId) {
    const E = engine();
    const sp = E.speciesById(speciesId);
    let tree = E.newTree(speciesId);
    for (let i = 0; i < 40 && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);
    }
    return tree;
  }

  it('turns winter into a qualitative, species-aware field guide', () => {
    const broad = render({
      treeLab: { view: 'grow', bandOverride: 'k2', speciesId: 'oak', tree: matureTree('oak'), season: 'winter' },
    });
    const conifer = render({
      treeLab: { view: 'grow', bandOverride: 'k2', speciesId: 'pine', tree: matureTree('pine'), season: 'winter' },
    });

    expect(broad).toContain('data-tree-season-guide="winter"');
    expect(broad).toContain('Season field guide');
    expect(broad).toContain('Bare');
    expect(broad).toContain('Stopped');
    expect(broad).toContain('Stores pay costs');
    expect(conifer).toContain('Needles stay');
    expect(conifer).toContain('Very low');
    expect(broad).toMatch(/whole YEAR/);
    expect(broad).not.toContain('<section class="allo-tree-autumn-lab"');
  });

  it('makes color change, abscission, and evergreen shedding explicit', () => {
    const broad = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: matureTree('oak'), season: 'autumn' },
    });
    const conifer = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'pine', tree: matureTree('pine'), season: 'autumn' },
    });

    expect(broad).toContain('data-tree-phenology="deciduous"');
    expect(broad).toContain('data-current-phenology-stage="autumn"');
    expect(broad.match(/data-phenology-stage="(spring|summer|autumn|winter)"/g)).toHaveLength(4);
    expect(broad).toMatch(/data-phenology-stage="autumn"[^>]*data-leaf-action="falling"[^>]*aria-current="step"/);
    expect(broad).toContain('Color + leaf fall');
    expect(broad).toContain('chlorophyll breaks down');
    expect(broad).toContain('abscission layer');
    expect(broad).toContain('leaf detaches');
    expect(broad).toContain('data-tree-autumn-lab="pigment-decoder"');
    expect(broad.match(/data-autumn-evidence="(chlorophyll|carotenoids|anthocyanins|tannins)"/g)).toHaveLength(4);
    expect(broad).toContain('Autumn pigment decoder');
    expect(broad).toContain('Carotenoids');
    expect(broad).toContain('Yellow and orange pigments already present become visible');
    expect(broad).toContain('Anthocyanins');
    expect(broad).toContain('Red and purple pigments can be produced');
    expect(broad).toContain('leaf color alone cannot reconstruct one exact');
    expect(broad).toContain('data-autumn-detective="pigments"');
    expect(broad).toContain('data-autumn-claim-result="waiting"');
    expect(broad).toContain('data-autumn-specimen="pigments"');
    expect(broad.match(/data-autumn-claim="(different-processes|all-hidden|exact-weather)"/g)).toHaveLength(3);
    expect(broad).toContain('Observe');
    expect(broad).toContain('Match evidence');
    expect(broad).toContain('Make a careful claim');

    expect(conifer).toContain('data-tree-phenology="evergreen"');
    expect(conifer).toMatch(/data-phenology-stage="autumn"[^>]*data-leaf-action="gradual-shed"[^>]*aria-current="step"/);
    expect(conifer).toContain('Older needles shed');
    expect(conifer).toContain('Evergreen means foliage is retained across seasons, not forever');
    expect(conifer).toContain('forest-floor duff');
    expect(conifer).toContain('data-tree-autumn-lab="needle-cohorts"');
    expect(conifer.match(/data-autumn-evidence="(newest|middle|oldest)"/g)).toHaveLength(3);
    expect(conifer).toContain('Evergreen needle-age map');
    expect(conifer).toContain('Several needle cohorts share the canopy');
    expect(conifer).toContain('Older needles still fall');
    expect(conifer).toContain('data-autumn-detective="needle-cohorts"');
    expect(conifer).toContain('data-autumn-claim-result="waiting"');
    expect(conifer).toContain('data-autumn-specimen="needles"');
    expect(conifer.match(/data-autumn-claim="(age-cohorts|not-evergreen|all-at-once)"/g)).toHaveLength(3);
    expect(conifer).toContain('small inner cohort turns yellow and falls');
  });

  it('shows leaf release as a prepared seal and evergreen shedding as cohort renewal', () => {
    const broad = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: matureTree('oak'), season: 'autumn' },
    });
    const conifer = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'pine', tree: matureTree('pine'), season: 'autumn' },
    });
    const young = render({
      treeLab: { view: 'grow', bandOverride: 'k2', speciesId: 'oak', tree: matureTree('oak'), season: 'autumn' },
    });

    expect(broad).toContain('data-autumn-release-sequence="leaf-release"');
    expect(broad.match(/data-autumn-release-stage="(signal|resorption|seal|detach)"/g)).toHaveLength(4);
    expect(broad).toContain('From canopy to forest floor');
    expect(broad).toContain('Nitrogen and phosphorus move from the leaf into the twig');
    expect(broad).toContain('Protective seal');
    expect(broad).toContain('abscission layer forms at the leaf base');
    expect(broad).toContain('does not tear away from an open wound');
    expect(broad).toContain('decomposers later return some fallen-leaf nutrients to the soil');

    expect(conifer).toContain('data-autumn-release-sequence="needle-renewal"');
    expect(conifer.match(/data-autumn-release-stage="(new-cohort|overlap|separation|duff)"/g)).toHaveLength(4);
    expect(conifer).toContain('Evergreen needle renewal');
    expect(conifer).toContain('Canopy ages overlap');
    expect(conifer).toContain('forms a separation layer');
    expect(conifer).toContain('not permanent individual needles');

    expect(young).toContain('How a leaf lets go');
    expect(young).toContain('Leaf fall is a prepared handoff, not a random tear');
  });

  it('turns autumn observations into careful claims with explanatory feedback', () => {
    const broadCorrect = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: matureTree('oak'),
        season: 'autumn', autumnPigmentClaim: 'different-processes',
      },
    });
    const broadRetry = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: matureTree('oak'),
        season: 'autumn', autumnPigmentClaim: 'exact-weather',
      },
    });
    const coniferCorrect = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'pine', tree: matureTree('pine'),
        season: 'autumn', autumnNeedleClaim: 'age-cohorts',
      },
    });
    const coniferRetry = render({
      treeLab: {
        view: 'grow', bandOverride: 'g68', speciesId: 'pine', tree: matureTree('pine'),
        season: 'autumn', autumnNeedleClaim: 'not-evergreen',
      },
    });
    const young = render({
      treeLab: { view: 'grow', bandOverride: 'k2', speciesId: 'oak', tree: matureTree('oak'), season: 'autumn' },
    });

    expect(broadCorrect).toContain('data-autumn-claim-result="correct"');
    expect(broadCorrect).toContain('data-autumn-claim="different-processes" aria-pressed="true"');
    expect(broadCorrect).toContain('red-purple anthocyanins can be produced');
    expect(broadRetry).toContain('data-autumn-claim-result="retry"');
    expect(broadRetry).toContain('data-autumn-claim="exact-weather" aria-pressed="true"');
    expect(broadRetry).toContain('not a thermometer or rain gauge');

    expect(coniferCorrect).toContain('data-autumn-claim-result="correct"');
    expect(coniferCorrect).toContain('data-autumn-claim="age-cohorts" aria-pressed="true"');
    expect(coniferCorrect).toContain('younger cohorts keep the canopy green');
    expect(coniferRetry).toContain('data-autumn-claim-result="retry"');
    expect(coniferRetry).toContain('does not mean that no needle ever falls');

    expect(young).toContain('Be a leaf detective');
    expect(young).toContain('Yellow may show through; red may be made.');
  });

  it('explains the effects and tradeoffs of simulated species traits', () => {
    const oak = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree: matureTree('oak') },
    });
    const aspen = render({
      treeLab: { view: 'grow', bandOverride: 'g68', speciesId: 'aspen', tree: matureTree('aspen') },
    });

    expect(oak).toContain('data-tree-species-lens="oak"');
    expect(oak).toContain('Drought tolerance');
    expect(oak).toContain('High');
    expect(oak).toContain('3 routes');
    expect(oak).toContain('Shade tolerance improves low-light capture');
    expect(aspen).toContain('data-tree-species-lens="aspen"');
    expect(aspen).toContain('Low');
  });

  it('gives young redwood learners their own concise species story', () => {
    const html = render({
      treeLab: { view: 'grow', bandOverride: 'k2', speciesId: 'redwood', tree: matureTree('redwood') },
    });
    expect(html).toMatch(/Redwood trees can grow very tall/);
    expect(html).toContain('Each kind of tree has different strengths');
  });
});

describe('Tree Life Lab - truthful edge states and primary-reader clarity', () => {
  it('pauses Chemistry when the tree is no longer alive', () => {
    const E = engine();
    const dead = E.newTree('oak');
    dead.alive = false;
    dead.causeOfDeath = 'carbon_starvation';
    dead.leafArea = 25;

    const older = render({ treeLab: { view: 'chem', bandOverride: 'g68', tree: dead } });
    expect(older).toContain('Photosynthesis has stopped');
    expect(older).toContain('Start a new seedling');
    expect(older).toContain('Carbon income becomes zero');
    expect(older).not.toContain('Live reaction');
    expect(older).not.toMatch(/class="[^"]*allo-tree-curves-card/);
    expect(older).not.toContain('Sets the pace');
    expect(older).not.toContain('kg C/year');

    const young = render({ treeLab: { view: 'chem', bandOverride: 'k2', tree: dead } });
    expect(young).toContain('This tree has stopped making food');
    expect(young).not.toContain('Food for growing');
  });

  it('shows winter dormancy without summer-like water flow', () => {
    const E = engine();
    const oak = E.newTree('oak');
    const pine = E.newTree('pine');

    const broad = render({ treeLab: { view: 'transport', bandOverride: 'g68', speciesId: 'oak', tree: oak, season: 'winter' } });
    expect(broad).toContain('Winter flow is very low');
    expect(broad).toContain('Bare crown');
    expect(broad).toContain('No leaf pull');
    expect(broad).toContain('stored reserves');
    expect(broad).toContain('living tissues');
    expect(broad).not.toContain('Modelled daily flow');
    expect(broad).not.toContain('litres move daily');
    expect(broad).not.toContain('Evaporation pulls');
    expect(broad).not.toContain('Source right now');

    const evergreen = render({ treeLab: { view: 'transport', bandOverride: 'g68', speciesId: 'pine', tree: pine, season: 'winter' } });
    expect(evergreen).toContain('Needles remain');
    expect(evergreen).toContain('Stomata mostly shut');
    expect(evergreen).toContain('stored reserves');
    expect(evergreen).toContain('living tissues');
    expect(evergreen).not.toContain('Modelled daily flow');

    const summer = render({ treeLab: { view: 'transport', bandOverride: 'g68', speciesId: 'oak', tree: oak, season: 'summer' } });
    expect(summer).toContain('Modelled daily flow');
    expect(summer).toContain('Evaporation pulls');
  });

  it('treats cleared and corrupt quiz state as open, not choice A', () => {
    const cleared = render({
      treeLab: { view: 'quiz', bandOverride: 'k2', quizPick: null, quizPickKey: 0 },
    });
    expect(cleared).not.toContain('class="allo-tree-quiz-feedback');
    expect(cleared).toContain('Answer choices');

    const corrupt = render({
      treeLab: {
        view: 'quiz', bandOverride: 'k2',
        quizPicks: { 0: null },
        quizSeen: { 0: 'banana', 7: 'banana', 13: 'banana', 14: 'banana', 15: 'banana' },
      },
    });
    expect(corrupt).toContain('Not answered yet');
    expect(corrupt).not.toMatch(/class="[^"]*allo-tree-quiz-finale/);
    expect(corrupt).not.toContain('is-banana');
  });

  it('uses friendly event and map language throughout K-2 New Trees', () => {
    const E = engine();
    const tree = E.newTree('aspen');
    tree.seedsBanked = 20;
    const res = {
      established: 2, diverseCount: 0, clonalCount: 2, diversityIndex: 0,
      results: [{ id: 'root_sucker', icon: 'R', attempts: 3, took: 2, diversity: 0, wiped: false, note: '' }],
    };
    const html = render({ treeLab: {
      view: 'spread', bandOverride: 'k2', speciesId: 'aspen', tree,
      lastSpread: { event: 'pathogen', res },
      spreadLog: [{ event: 'pathogen', diverse: 0, clonal: 2 }],
      spreadTotals: { diverse: 0, clonal: 2 },
    } });

    for (const phrase of ['Root sickness', 'A fungus can spread through roots that are joined together.', 'New-tree map', 'Read what happened', 'seeds 0 · shoots 2', 'This map shows near and far']) {
      expect(html).toContain(phrase);
    }
    for (const phrase of ['Root pathogen', 'spatial pattern', 'orders of magnitude', 're-rolled']) {
      expect(html).not.toContain(phrase);
    }
  });

  it('uses semantic card headings and names every visible learning step', () => {
    const grow = render({ treeLab: { view: 'grow', bandOverride: 'g68' } });
    expect(grow).toMatch(/<h3[^>]*>[^<]+<\/h3>/);
    expect(grow).toContain('role="group"');
    expect(grow).toContain('aria-label="Step 1:');
  });
});
describe('Tree Life Lab - canopy plumbing and year-outcome evidence', () => {
  function advance(E, start, years, env = GOOD_ENV, alloc = ALLOC) {
    const sp = E.speciesById(start.speciesId || 'oak');
    let tree = start;
    for (let i = 0; i < years && tree.alive; i += 1) {
      tree = E.simulateYear(tree, sp, env, alloc);
    }
    return tree;
  }

  it('uses the same pure canopy projection in the preview and annual engine', () => {
    const E = engine();
    const tree = E.newTree('oak');
    const sp = E.speciesById('oak');
    const aperture = E.stomatalAperture(GOOD_ENV.soilWater, sp.droughtTol, false);
    const live = E.treePhysiology(tree, sp, GOOD_ENV);
    const surplus = Math.max(0, live.gross - E.maintenanceRespiration(sp, tree));
    const alloc = E.normaliseAlloc(ALLOC);
    const projection = E.projectCanopySupport(
      tree, surplus * alloc.leaf, surplus * alloc.wood);
    const next = E.simulateYear(tree, sp, GOOD_ENV, ALLOC);

    expect(next.sapwoodMass).toBeCloseTo(projection.sapwoodMass, 10);
    expect(next.leafMass).toBeCloseTo(projection.supportedLeafMass, 10);
    expect(next.leafArea).toBeCloseTo(projection.leafArea, 10);
  });

  it('distinguishes available, nearly-full, and pipe-limited canopy plans', () => {
    const E = engine();
    const tree = { ...E.newTree('oak'), sapwoodMass: 1, leafMass: 0.1 };
    const base = E.projectCanopySupport(tree, 0, 0);
    const nearlyLeaf = Math.max(0, (base.leafCapacity * 0.9 - tree.leafMass * 0.62) / 3.4);
    const available = E.projectCanopySupport(tree, 0, 3);
    const nearly = E.projectCanopySupport(tree, nearlyLeaf, 0);
    const blocked = E.projectCanopySupport(tree, nearlyLeaf + 1, 0);
    const woodBacked = E.projectCanopySupport(tree, nearlyLeaf + 1, 3);

    expect(available.state).toBe('capacity-available');
    expect(nearly.state).toBe('nearly-full');
    expect(nearly.blockedLeafMass).toBeCloseTo(0, 8);
    expect(blocked.state).toBe('pipe-limited');
    expect(blocked.blockedLeafMass).toBeGreaterThan(0);
    expect(woodBacked.leafCapacity).toBeGreaterThan(blocked.leafCapacity);
  });

  it('renders a numeric, non-color-only pipe-limit preview and a headroom state', () => {
    const E = engine();
    const pipeTree = {
      ...E.newTree('oak'), age: 12, heightM: 4, dbhCm: 8,
      leafArea: 60, leafMass: 4, sapwoodMass: 0.05, rootMass: 0.5,
    };
    const pipeHtml = render({ treeLab: {
      view: 'grow', bandOverride: 'g68', tree: pipeTree,
      alloc: { leaf: 0.9, root: 0.025, wood: 0.025, repro: 0.025, store: 0.025 },
    } });
    expect(pipeHtml).toContain('data-canopy-support="pipe-limited"');
    expect(pipeHtml).toContain('Canopy plumbing: preview the hidden limit');
    expect(pipeHtml).toContain('Projected leaf demand');
    expect(pipeHtml).toContain('Sapwood capacity');
    expect(pipeHtml).toContain('Blocked plan');
    expect(pipeHtml).toContain('not rerouted automatically');
    expect(pipeHtml).toContain('square metres blocked by the pipe limit');
    expect(pipeHtml).toContain('repeating-linear-gradient');

    const roomyTree = {
      ...E.newTree('oak'), age: 12, heightM: 4, dbhCm: 8,
      leafArea: 12, leafMass: 0.01, sapwoodMass: 20, rootMass: 0.2,
    };
    const roomyHtml = render({ treeLab: {
      view: 'grow', bandOverride: 'g68', tree: roomyTree,
      alloc: { leaf: 0.05, root: 0.05, wood: 0.8, repro: 0.05, store: 0.05 },
    } });
    expect(roomyHtml).toContain('data-canopy-support="capacity-available"');
    expect(roomyHtml).toContain('headroom');
  });

  it('keeps the K-2 canopy explanation concrete and jargon-free', () => {
    const E = engine();
    const tree = {
      ...E.newTree('oak'), age: 8, heightM: 3, dbhCm: 5,
      leafArea: 40, leafMass: 3, sapwoodMass: 0.05, rootMass: 0.4,
    };
    const html = render({ treeLab: {
      view: 'grow', bandOverride: 'k2', tree,
      alloc: { leaf: 0.9, root: 0.025, wood: 0.025, repro: 0.025, store: 0.025 },
    } });
    const panel = html.match(/<section[^>]*data-canopy-support="[^"]+"[\s\S]*?<\/section>/)?.[0] || '';

    expect(panel).toContain('Can the trunk feed the leaf roof?');
    expect(panel).toContain('Trunk water pipes');
    expect(panel).toContain('Move some food from Leaves to Wood');
    expect(panel).not.toContain('sapwood');
    expect(panel).not.toContain('hydraulic');
  });

  it('summarises each time jump from the exact records it added', () => {
    const E = engine();
    const before = advance(E, E.newTree('oak'), 8);
    const after = advance(E, before, 10);
    const summary = E.summariseYearAdvance(before, after, 10);
    const added = after.history.filter((r) => r.year >= before.age && r.year < after.age);
    const total = added.reduce((sum, r) => sum + r.net, 0);

    expect(summary.version).toBe(1);
    expect(summary.requestedYears).toBe(10);
    expect(summary.completedYears).toBe(10);
    expect(summary.ringsAdded).toBe(10);
    expect(summary.ageBefore).toBe(before.age);
    expect(summary.ageAfter).toBe(after.age);
    expect(summary.carbonTotal).toBeCloseTo(total, 2);
    expect(summary.dominantLimiter).toMatch(/^(light|water|temperature|co2)$/);
  });

  it('renders a persistent outcome receipt and a separate polite announcement', () => {
    const E = engine();
    const before = advance(E, E.newTree('oak'), 8);
    const after = advance(E, before, 10);
    const summary = E.summariseYearAdvance(before, after, 10);
    const html = render({ treeLab: {
      view: 'grow', bandOverride: 'g68', tree: after, lastYearOutcome: summary,
    } });

    expect(html).toContain('data-year-outcome="10"');
    expect(html).toContain('Year outcome: your decision became evidence');
    expect(html).toContain('Carbon result');
    expect(html).toContain('Visible growth evidence');
    expect(html).toContain('Consequence');
    expect(html).toContain('Look for');
    expect(html).toContain('data-year-outcome-live="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Time result. Advanced 10 years.');
  });

  it('uses explicit deficit language and simpler K-2 outcome copy', () => {
    const E = engine();
    const before = advance(E, E.newTree('oak'), 5);
    const dark = { ...GOOD_ENV, light: 0.001, soilWater: 0.08 };
    const after = advance(E, before, 1, dark);
    const summary = E.summariseYearAdvance(before, after, 1);
    const older = render({ treeLab: {
      view: 'grow', bandOverride: 'g68', tree: after, lastYearOutcome: summary,
    } });
    expect(summary.carbonTotal).toBeLessThan(0);
    expect(older).toContain('data-year-carbon-state="deficit"');
    expect(older).toContain('deficit years');
    expect(older).toContain('stress-marked ring');

    const young = render({ treeLab: {
      view: 'grow', bandOverride: 'k2', tree: after, lastYearOutcome: summary,
    } });
    const panel = young.match(/<section[^>]*data-year-outcome="1"[\s\S]*?<\/section>/)?.[0] || '';
    expect(panel).toContain('What happened when time moved?');
    expect(panel).toContain('Not enough food overall');
    expect(panel).toContain('Biggest need:');
    expect(panel).not.toContain('kg C');
  });
});

describe('Tree Life Lab - causal four-season carbon trace', () => {
  it('orders the four phases and conserves the annual carbon budget', () => {
    const E = engine();
    const tree = E.newTree('oak');
    const sp = E.speciesById('oak');
    const trace = E.seasonalCarbonTrace(tree, sp, GOOD_ENV);
    const aperture = E.stomatalAperture(GOOD_ENV.soilWater, sp.droughtTol, false);
    const annualPhoto = E.treePhysiology(tree, sp, GOOD_ENV);
    const annualResp = E.maintenanceRespiration(sp, tree);

    expect(trace.phases.map((phase) => phase.id)).toEqual([
      'spring', 'summer', 'autumn', 'winter',
    ]);
    expect(trace.phases.map((phase) => phase.order)).toEqual([0, 1, 2, 3]);
    expect(trace.phases.reduce((sum, phase) => sum + phase.gross, 0))
      .toBeCloseTo(annualPhoto.gross, 12);
    expect(trace.phases.reduce((sum, phase) => sum + phase.resp, 0))
      .toBeCloseTo(annualResp, 12);
    expect(trace.phases.reduce((sum, phase) => sum + phase.net, 0))
      .toBeCloseTo(annualPhoto.gross - annualResp, 12);
    expect(trace.annual.gross).toBeCloseTo(annualPhoto.gross, 12);
    expect(trace.annual.resp).toBeCloseTo(annualResp, 12);
    expect(trace.annual.net).toBeCloseTo(trace.annual.gross - trace.annual.resp, 12);
    expect(trace.phases.reduce((sum, phase) => sum + phase.photosynthesisShare, 0))
      .toBeCloseTo(1, 12);
    expect(trace.phases.reduce((sum, phase) => sum + phase.respirationShare, 0))
      .toBeCloseTo(1, 12);
    expect(trace.phases.reduce((sum, phase) => sum + phase.reserveChange, 0))
      .toBeCloseTo(0, 12);
    expect(trace.annual.reserveBalance).toBe(0);
    const committed = E.simulateYear(tree, sp, GOOD_ENV, ALLOC).history.at(-1);
    expect(Number(trace.annual.gross.toFixed(3))).toBe(committed.gross);
    expect(Number(trace.annual.resp.toFixed(3))).toBe(committed.resp);
    expect(Number(trace.annual.net.toFixed(3))).toBe(committed.net);
  });

  it('shows deciduous spring debt, summer peak production, and evergreen winter opportunity', () => {
    const E = engine();
    const oak = E.seasonalCarbonTrace(
      E.newTree('oak'), E.speciesById('oak'), GOOD_ENV);
    const pine = E.seasonalCarbonTrace(
      E.newTree('pine'), E.speciesById('pine'), GOOD_ENV);
    const oakSpring = oak.phases[0];
    const oakSummer = oak.phases[1];
    const oakAutumn = oak.phases[2];
    const oakWinter = oak.phases[3];
    const pineWinter = pine.phases[3];

    expect(oakSpring.reserveChange).toBeLessThan(0);
    expect(oakSpring.reserveDebtAfter).toBeGreaterThan(0);
    expect(oakAutumn.reserveChange).toBeGreaterThan(0);
    expect(oakAutumn.reserveDebtAfter).toBeCloseTo(0, 12);
    expect(oakSummer.gross).toBe(Math.max(...oak.phases.map((phase) => phase.gross)));
    expect(oakWinter.photosynthesisShare).toBeLessThanOrEqual(0.001);
    expect(pineWinter.photosynthesisShare).toBeGreaterThan(0.04);
    expect(pineWinter.gross).toBeGreaterThan(oakWinter.gross);
    expect(pineWinter.phenology).toBe('retained-needles');
  });

  it('responds deterministically to drought and temperature while preserving needle cold-season activity', () => {
    const E = engine();
    const oak = E.speciesById('oak');
    const pine = E.speciesById('pine');
    const tree = E.newTree('oak');
    const good = E.seasonalCarbonTrace(tree, oak, GOOD_ENV);
    const drought = E.seasonalCarbonTrace(tree, oak, {
      ...GOOD_ENV, soilWater: 0.04, drought: true,
    });
    const frozenOak = E.seasonalCarbonTrace(tree, oak, { ...GOOD_ENV, tempC: -3 });
    const coldPine = E.seasonalCarbonTrace(
      E.newTree('pine'), pine, { ...GOOD_ENV, tempC: -3 });

    expect(drought.annual.gross).toBeLessThan(good.annual.gross);
    expect(drought.phases[1].photosynthesisShare)
      .toBeLessThan(good.phases[1].photosynthesisShare);
    expect(frozenOak.annual.gross).toBe(0);
    expect(coldPine.annual.gross).toBeGreaterThan(0);
    expect(coldPine.phases[3].gross).toBeGreaterThan(0);
    expect(E.seasonalCarbonTrace(tree, oak, GOOD_ENV)).toEqual(good);
  });

  it('contains no NaN or Infinity even when restored inputs are malformed', () => {
    const E = engine();
    const trace = E.seasonalCarbonTrace(
      {
        speciesId: 'oak', leafArea: NaN, leafMass: Infinity,
        rootMass: -Infinity, sapwoodMass: undefined, reserves: NaN,
      },
      { id: 'oak', amax: NaN, respRate: Infinity, droughtTol: NaN },
      { tempC: NaN, light: Infinity, co2ppm: NaN, soilWater: -Infinity },
    );
    const numbers = [];
    (function visit(value) {
      if (typeof value === 'number') numbers.push(value);
      else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    }(trace));

    expect(numbers.length).toBeGreaterThan(20);
    expect(numbers.every(Number.isFinite)).toBe(true);
  });
});

describe('Tree Life Lab - card-scale phenology and weather', () => {
  it('maps every paused season to a valid representative point in the year', () => {
    const E = engine();
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const phases = seasons.map((season) => E.canonicalPhaseForSeason(season));
    phases.forEach((phase, index) => {
      expect(Number.isFinite(phase)).toBe(true);
      expect(E.seasonForPhase(phase)).toBe(seasons[index]);
    });
    expect(phases).toEqual([...phases].sort((a, b) => a - b));
  });

  it('gives each card a stable, ordered biological biography', () => {
    const E = engine();
    const first = E.leafCardTraits('oak:42', 7, 0.82, 0.64);
    const repeat = E.leafCardTraits('oak:42', 7, 0.82, 0.64);
    const neighbour = E.leafCardTraits('oak:42', 8, 0.82, 0.64);

    expect(repeat).toEqual(first);
    expect(neighbour).not.toEqual(first);
    expect(first.budAt).toBeLessThan(first.colorAt);
    expect(first.colorAt).toBeLessThan(first.releaseAt);
    expect(first.fallDuration).toBeGreaterThan(0);
    for (const key of [
      'cohort', 'exposure', 'hydraulic', 'budAt', 'colorAt',
      'releaseAt', 'fallDuration', 'fallSample',
    ]) {
      expect(Number.isFinite(first[key]), key).toBe(true);
      expect(first[key], key).toBeGreaterThanOrEqual(0);
      expect(first[key], key).toBeLessThanOrEqual(1);
    }
    expect(first.drift).toBeGreaterThanOrEqual(-1);
    expect(first.drift).toBeLessThanOrEqual(1);
  });

  it('moves a broadleaf through bud, canopy, colour, flight, and litter exactly once', () => {
    const E = engine();
    const trait = {
      cohort: 0.45, exposure: 0.7, hydraulic: 0.8,
      budAt: 0.1, colorAt: 0.6, releaseAt: 0.7,
      fallDuration: 0.1, fallSample: 0.2, drift: 0.4,
    };
    const beforeBud = E.leafCardState(trait, 0.05, 'broadleaf', 0, 0);
    const green = E.leafCardState(trait, 0.3, 'broadleaf', 0, 0);
    const coloured = E.leafCardState(trait, 0.65, 'broadleaf', 0, 0);
    const airborne = E.leafCardState(trait, 0.75, 'broadleaf', 0, 0);
    const litter = E.leafCardState(trait, 0.9, 'broadleaf', 0, 0);

    expect(beforeBud.canopyScale).toBe(0);
    expect(green.retained).toBe(true);
    expect(coloured.retained).toBe(true);
    expect(coloured.pigment).toBeGreaterThan(0);
    expect(airborne.flight).toBeGreaterThan(0);
    expect(airborne.canopyScale).toBe(0);
    expect(litter.landed).toBe(true);
    for (const state of [beforeBud, green, coloured, airborne, litter]) {
      const occupancy = Number(state.retained) + Number(state.flight > 0) + Number(state.landed);
      expect(occupancy).toBeLessThanOrEqual(1);
    }
  });

  it('sheds only the oldest needle cohort and keeps stress bounded', () => {
    const E = engine();
    const base = {
      exposure: 0.7, hydraulic: 0.8, budAt: 0.1, colorAt: 0.6,
      releaseAt: 0.7, fallDuration: 0.1, fallSample: 0.2, drift: 0.4,
    };
    const young = E.leafCardState({ ...base, cohort: 0.2 }, 0.75, 'needle', 0.9, 0.9);
    const oldest = E.leafCardState({ ...base, cohort: 0.95 }, 0.75, 'needle', 0.9, 0.9);

    expect(young.retained).toBe(true);
    expect(young.flight).toBe(0);
    expect(oldest.retained).toBe(false);
    expect(oldest.flight).toBeGreaterThan(0);
    expect(Number.isFinite(young.stress)).toBe(true);
    expect(young.stress).toBeGreaterThanOrEqual(0);
    expect(young.stress).toBeLessThanOrEqual(1);
  });

  it('keeps static wetness, frost, and snow under reduced motion but stops particles', () => {
    const E = engine();
    const rain = { kind: 'rain', startedAt: 1000, durationMs: 6500 };
    const active = E.deriveWeatherVisualState(
      'summer', { tempC: 22, soilWater: 0.7 }, rain, false, 2000);
    const expired = E.deriveWeatherVisualState(
      'summer', { tempC: 22, soilWater: 0.7 }, rain, false, 8000);
    const winter = E.deriveWeatherVisualState(
      'winter', { tempC: -5, soilWater: 0.9 }, null, false, 2000);
    const winterStill = E.deriveWeatherVisualState(
      'winter', { tempC: -5, soilWater: 0.9 }, null, true, 2000);

    expect(active.kind).toBe('rain');
    expect(active.precipitating).toBe(true);
    expect(active.animate).toBe(true);
    expect(active.eventEndsAt).toBe(7500);
    expect(expired.precipitating).toBe(false);
    expect(expired.animate).toBe(false);
    expect(winter.frost).toBeGreaterThan(0);
    expect(winter.snow).toBeGreaterThan(0);
    expect(winterStill.wetness).toBe(winter.wetness);
    expect(winterStill.frost).toBe(winter.frost);
    expect(winterStill.snow).toBe(winter.snow);
    expect(winterStill.animate).toBe(false);
    for (const state of [active, expired, winter, winterStill]) {
      for (const key of ['wetness', 'frost', 'snow']) {
        expect(Number.isFinite(state[key]), key).toBe(true);
        expect(state[key], key).toBeGreaterThanOrEqual(0);
        expect(state[key], key).toBeLessThanOrEqual(1);
      }
    }
  });

  it('starts honest rain on drought recovery and clears stale events elsewhere', () => {
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const recovery = src.match(/function endDrought\(\)[\s\S]*?function resetTree/)?.[0] || '';
    const drought = src.match(/function sendDrought\(years\)[\s\S]*?function endDrought/)?.[0] || '';
    const reset = src.match(/function resetTree\([\s\S]*?\/\/ ── 3D panel/)?.[0] || '';
    expect(recovery).toMatch(/weatherEvent:\s*\{\s*kind:\s*'rain'/);
    expect(recovery).toMatch(/durationMs:\s*6500/);
    expect(drought).toMatch(/weatherEvent:\s*null/);
    expect(reset).toMatch(/weatherEvent:\s*null/);
  });
});

describe('Tree Life Lab - causal seasonal carbon ledger', () => {
  function ledgerOf(html) {
    return html.match(
      /<section[^>]*data-tree-season-ledger="modelled-seasonal-trace"[\s\S]*?<\/section>/,
    )?.[0] || '';
  }

  it('renders one static chronological ledger whose values roll up to the annual equation', () => {
    const E = engine();
    const tree = E.newTree('oak');
    const html = render({ treeLab: {
      view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
      season: 'autumn', tempC: GOOD_ENV.tempC, light: GOOD_ENV.light,
      co2ppm: GOOD_ENV.co2ppm, soilWater: GOOD_ENV.soilWater,
    } });
    const ledger = ledgerOf(html);

    expect(ledger).not.toBe('');
    expect(ledger).toContain('data-ledger-active-season="autumn"');
    expect(ledger).toContain('data-ledger-leaf-habit="deciduous"');
    expect(ledger).toContain('data-ledger-state="surplus"');
    expect(ledger.match(/data-ledger-stage="(spring|summer|autumn|winter)"/g)).toHaveLength(4);
    const order = ['spring', 'summer', 'autumn', 'winter']
      .map((stage) => ledger.indexOf('data-ledger-stage="' + stage + '"'));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(ledger).toMatch(/data-ledger-stage="autumn"[^>]*aria-current="step"/);
    expect(ledger).toContain('<ol');
    expect(ledger).not.toContain('<button');
    expect(ledger).not.toContain('tabindex');
    expect(ledger).not.toContain('aria-live');
    expect(ledger).toMatch(/aria-label="Modelled whole-year carbon equation:[^"]*gross[^"]*respiration[^"]*net/i);
    expect(ledger).toContain('Reserve draw');
    expect(ledger).toContain('Returned to reserves');
  });

  it('distinguishes evergreen winter opportunity from a stopped dead tree', () => {
    const E = engine();
    const pine = render({ treeLab: {
      view: 'grow', bandOverride: 'g68', speciesId: 'pine',
      tree: E.newTree('pine'), season: 'winter',
    } });
    const pineLedger = ledgerOf(pine);
    expect(pineLedger).toContain('data-ledger-leaf-habit="evergreen"');
    expect(pineLedger).toMatch(/data-ledger-stage="winter"[^>]*aria-current="step"/);
    expect(pineLedger).toMatch(/Retained needles allow limited activity/i);

    const deadTree = { ...E.newTree('oak'), alive: false, causeOfDeath: 'carbon_starvation' };
    const dead = ledgerOf(render({ treeLab: {
      view: 'grow', bandOverride: 'g68', speciesId: 'oak',
      tree: deadTree, season: 'summer',
    } }));
    expect(dead).toContain('data-ledger-state="stopped"');
    expect(dead).toMatch(/carbon income and seasonal exchange have stopped/i);
    expect(dead).not.toContain('data-ledger-state="surplus"');
    expect(dead).not.toContain('kg C');
  });

  it('adapts the same causal structure to all four reading bands', () => {
    const E = engine();
    const tree = E.newTree('oak');
    const cases = [
      ['k2', 'A year of making and using food'],
      ['g35', 'The tree&#x27;s food year'],
      ['g68', 'Four seasons, one carbon budget'],
      ['g912', 'Seasonal carbon sources and sinks'],
    ];
    for (const [bandOverride, title] of cases) {
      const ledger = ledgerOf(render({ treeLab: {
        view: 'grow', bandOverride, speciesId: 'oak', tree, season: 'summer',
      } }));
      expect(ledger, bandOverride).toContain(title);
      expect(ledger.match(/data-ledger-stage=/g), bandOverride).toHaveLength(4);
      if (bandOverride === 'k2') {
        expect(ledger).not.toContain('kg C');
        expect(ledger.toLowerCase()).not.toContain('respiration');
        expect(ledger.toLowerCase()).not.toContain('source');
        expect(ledger.toLowerCase()).not.toContain('sink');
      } else if (bandOverride === 'g912') {
        expect(ledger).toContain('kg C');
      }
    }
  });
});
