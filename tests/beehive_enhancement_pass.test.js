// Regression guards for the 2026-09-27 beehive enhancement pass. Each block pins a defect
// that shipped because no test looked at it from the student's side.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// BEEHIVE_TEST_SOURCE lets a mutation run point these guards at a scratch copy instead of the tree.
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
const SRC_TEXT = readFileSync(TOOL, 'utf8');

describe('collapse-only restart controls', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });

  it('never offers the colony-reset buttons to a living colony, in any mode', () => {
    ['beekeeper', 'queen', 'drone'].forEach((viewMode) => {
      const html = renderTool('beehive', { beehive: { viewMode, day: 12, tutorialDone: true } });
      expect(html).not.toContain('data-beehive-restart=');
      expect(html).not.toContain('Next time, try');
    });
  });

  it('still offers both restart paths once the colony has collapsed', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 68, colonySurvived: false, simulationSeed: 2468, randomState: 1357, seededFromDay: 0 } });
    expect(html).toContain('Colony Collapse');
    expect(html).toContain('data-beehive-restart="same-seed"');
    expect(html).toContain('data-beehive-restart="fresh-seed"');
  });
});

describe('Colony Network live clock keeps the student\'s moves', () => {
  let host;
  let root;
  let latest;
  let config;
  let originalRaf;
  let originalCancelRaf;

  async function mountQueen(overrides = {}) {
    const initialQueen = Object.assign({
      active: true, paused: false, speed: 1, day: 3, hiveHealth: 100, territory: 50,
      resources: { nectar: 80, pollen: 60, wax: 40, royalJelly: 20 },
      rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 },
    }, overrides);
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', tutorialDone: true, queen: initialQueen } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    resetStemLab();
    config = loadTool(TOOL, 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('a raid launched while the clock runs survives the next cycle', async () => {
    await mountQueen();
    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
    const raid = host.querySelector('[data-quick-command="raid_rival"]');
    expect(raid).toBeTruthy();
    await act(async () => { raid.click(); await Promise.resolve(); });
    const afterRaid = latest.beehive.queen.rival.health;
    expect(afterRaid).toBeLessThan(100);
    const dayBefore = latest.beehive.queen.day;
    await act(async () => { vi.advanceTimersByTime(2500); await Promise.resolve(); });
    expect(latest.beehive.queen.day).toBe(dayBefore + 1);
    // Rival health only ever falls from player raids; the tick must not restore it.
    expect(latest.beehive.queen.rival.health).toBeLessThanOrEqual(afterRaid);
  });
});

describe('Drone live flight ends at the queen catch', () => {
  let host, root, latest, frames, cfg;
  const live = () => window.__testHooks.beehive.droneStateRef.current;
  beforeEach(async () => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    frames = []; vi.stubGlobal('requestAnimationFrame', (cb) => (frames.push(cb), frames.length)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ beehive: { viewMode: 'drone', honey: 80, workers: 10000, queenHealth: 100, morale: 90, varroaLevel: 2, soundOn: false, drone: { active: false, difficulty: 'easy', pacing: 'live', courseSeed: 20260904 } } });
      latest = data; return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    await act(async () => { launch.click(); await Promise.resolve(); });
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('moves from the catch to the debrief without waiting out the timer', async () => {
    const s = live();
    Object.assign(s, { paused: false, phase: 'congregation', reachedDca: true, x: 0, y: 180, z: 0, vx: 0, vy: 0, vz: 0, speed: 0, obstacles: [], drones: [], birds: [], thermals: [], nearQueens: [{ x: 0, y: 180, z: 0, caught: false }] });
    let clock = performance.now();
    for (let i = 0; i < 200 && live().phase !== 'end'; i++) {
      const frame = frames.shift();
      if (!frame) break;
      clock += 16;
      await act(async () => { frame(clock); });
    }
    expect(live().reachedQueen).toBe(true);
    expect(live().phase).toBe('end');
    expect(live().timer).toBeGreaterThan(60); // most of the flight clock was still left
    await act(async () => { await Promise.resolve(); });
    expect(latest.beehive.drone.lastRun).toMatchObject({ success: true, pacing: 'live' });
  });
});

describe('one fact, one number', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });

  it('states the same per-pound honey arithmetic everywhere', () => {
    // 2 million flower visits per lb and ~21.6 tbsp per lb => ~90,000 visits per tablespoon;
    // 1/12 tsp per forager and ~65 tsp per lb => ~780 foragers per lb.
    expect(SRC_TEXT).not.toContain('roughly 556');
    expect(SRC_TEXT).not.toContain('10,000 flower visits per tablespoon');
    expect(SRC_TEXT).toContain('~90,000 flower visits per tablespoon');
  });

  it('drops claims the tool cannot back up', () => {
    expect(SRC_TEXT).not.toContain('ONLY food produced by an insect');
    expect(SRC_TEXT).not.toContain('hover any card');
    expect(SRC_TEXT).not.toContain('70% of wildflowers');
    expect(SRC_TEXT).not.toContain('Abdomen (5 segments');
  });

  it('shows one day number across the status chips and the header', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 45, tutorialDone: true } });
    expect(html).toContain('Summer · Day 45');
    expect(html).not.toContain('Summer Day 16');
  });

  it('uses one mite scale: the meter danger band starts where the coach says to act', () => {
    expect(SRC_TEXT).toContain("danger: '20+ points'");
    expect(SRC_TEXT).not.toContain("danger: '25+ points'");
  });
});

describe('the apiary scene reports the model, not a wall clock', () => {
  it('draws rain from the flood event only, and grounds foragers in rain and winter', () => {
    expect(SRC_TEXT).not.toContain('Date.now() % _wxPeriod');
    expect(SRC_TEXT).toContain("_wxEventId === 'flood'");
    expect(SRC_TEXT).toContain("var _foragersGrounded = _wxRain > 0.3 ? 'rain' : season === 3 ? 'winter'");
  });
});

describe('fed syrup is not harvestable honey', () => {
  let host, root, latest, cfg;
  beforeEach(() => {
    resetStemLab(); cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() }; vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  async function mount(state) {
    function App() { const [data, setData] = React.useState({ beehive: Object.assign({ viewMode: 'beekeeper', tutorialDone: true, motionPaused: true, soundOn: false }, state) }); latest = data; return cfg.render(makeCtx({ toolData: data, setToolData: setData })); }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  const button = (label) => host.querySelector('[data-management-action="' + label + '"]');

  it('feeding twice then harvesting takes nothing when only the syrup is above the reserve', async () => {
    await mount({ day: 40, honey: 25, actionPoints: 3 }); // summer reserve is 25 lb
    for (let i = 0; i < 2; i++) { const feed = button('Feed'); expect(feed).toBeTruthy(); await act(async () => { feed.click(); await Promise.resolve(); }); }
    expect(latest.beehive.honey).toBe(35);
    expect(latest.beehive.syrup).toBe(10);
    const harvest = button('Harvest');
    if (harvest) await act(async () => { harvest.click(); await Promise.resolve(); });
    expect(latest.beehive.totalHarvested || 0).toBe(0);
    expect(latest.beehive.honey).toBe(35);
  });

  it('harvests the real honey above the reserve and leaves the syrup in the hive', async () => {
    await mount({ day: 40, honey: 45, syrup: 5, actionPoints: 3 });
    const harvest = button('Harvest');
    expect(harvest).toBeTruthy();
    await act(async () => { harvest.click(); await Promise.resolve(); });
    expect(latest.beehive.totalHarvested).toBe(15); // 45 - 5 syrup - 25 reserve
    expect(latest.beehive.honey).toBe(30);
  });
});

describe('pesticide harm is named while it is happening', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });

  it('the colony outlook flags poisoning with its daily toll and duration', () => {
    const s = BH.bhCreateNewColonyState(4242, 1);
    s.day = 20; s.pesticideExposure = 35;
    const forecast = BH.bhForecastColony(s, { params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [] }, 7);
    const risk = forecast.risks.find((r) => r.id === 'pesticide');
    expect(risk).toBeTruthy();
    expect(risk.level).toBe('critical');
    expect(risk.detail).toContain('3.5% of the workers every day');
    expect(risk.detail).toContain('50 more days');
  });

  it('the status sentence names poisoning first', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 20, tutorialDone: true, pesticideExposure: 35 } });
    expect(html).toContain('Pesticide poisoning is killing workers every day');
  });
});

describe('Colony Network signals and biology', () => {
  let host, root, latest, config;
  async function mountQueen(overrides = {}) {
    const initialQueen = Object.assign({ active: true, paused: true, speed: 1, day: 5, hiveHealth: 100, territory: 50,
      rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 } }, overrides);
    const Component = () => { const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', tutorialDone: true, queen: initialQueen } }); latest = toolData; return config.render(makeCtx({ toolData, setToolData })); };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }
  beforeEach(() => {
    vi.useFakeTimers(); resetStemLab(); config = loadTool(TOOL, 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  const click = async (sel) => { const el = host.querySelector(sel); expect(el, sel).toBeTruthy(); await act(async () => { el.click(); await Promise.resolve(); }); };
  const total = (p) => Object.values(p).reduce((a, b) => a + (Number(b) || 0), 0);

  it('an alarm moves foragers to guarding instead of creating bees, once per cycle', async () => {
    await mountQueen({ population: { nurses: 200, foragers: 300, guards: 50, builders: 40, scouts: 20 } });
    const before = Object.assign({}, latest.beehive.queen.population || {});
    await click('[data-quick-command="alarm_signal"]');
    const after = latest.beehive.queen.population;
    expect(after.guards - (before.guards || 0)).toBeGreaterThan(0);
    expect(after.guards - (before.guards || 0)).toBe((before.foragers || 0) - after.foragers);
    if (Object.keys(before).length) expect(total(after)).toBe(total(before));
    const guardsOnce = after.guards;
    await click('[data-quick-command="alarm_signal"]'); // same cycle: workers are already responding
    expect(latest.beehive.queen.population.guards).toBe(guardsOnce);
  });

  it('Recruit Builders turns nectar into wax now, and is not limited like the free signals', async () => {
    await mountQueen({ resources: { nectar: 40, pollen: 20, wax: 2, royalJelly: 5 } });
    const btn = Array.from(host.querySelectorAll('button')).find((b) => (b.getAttribute('title') || b.getAttribute('aria-label') || '').includes('House bees eat nectar'));
    expect(btn).toBeTruthy();
    await act(async () => { btn.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.resources).toMatchObject({ nectar: 32, wax: 5 });
    await act(async () => { btn.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.resources).toMatchObject({ nectar: 24, wax: 8 });
  });

  it('supersedure replaces a failing queen instead of ending the match', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    await mountQueen({ day: 20, pheromones: { qmp: 0, alarm: 0, nasonov: 0, brood: 20 }, paused: false });
    await act(async () => { vi.advanceTimersByTime(2450); await Promise.resolve(); });
    const q = latest.beehive.queen;
    expect((q.events || []).some((e) => e.type === 'supersedure')).toBe(true);
    expect(q.result).not.toBe('defeat');
    expect(q.pheromones.qmp).toBeGreaterThanOrEqual(50);
  });

  it('teaches swarming as reproduction and mites as a nurse (hygiene) problem', () => {
    expect(SRC_TEXT).toContain('the old queen left with about half the workers');
    expect(SRC_TEXT).not.toContain('left with a rebel queen');
    expect(SRC_TEXT).toContain("th.type === 'mites' ? pop.nurses * 0.3");
    expect(SRC_TEXT).not.toContain("label: __alloT('stem.beehive.giant_hornet', 'Giant Hornet')");
  });
});

describe('colony model: a year with a buildup, a swarm season and recoverable weather', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  const cfg = (extra = {}) => Object.assign({ params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: () => 1 }, extra);
  function runYear(capacity) {
    let s = Object.assign(BH.bhCreateNewColonyState(777, 1), { capacity });
    const trace = [];
    for (let i = 0; i < 120; i++) { const r = BH.bhStepColony(s, cfg()); s = Object.assign({}, s, r.next); trace.push(r.next); }
    return trace;
  }

  it('an event-free colony builds well past 20,000 workers instead of stalling on pollen near 16k', () => {
    const peak = Math.max(...runYear(80).map((t) => t.workers));
    expect(peak).toBeGreaterThan(20000);
    expect(peak).toBeLessThan(60000);
  });

  it('an unsupered hive crowds at its peak and one super prevents it', () => {
    const k = BH.SIMULATION_PARAMS.beesPerCapacityUnit;
    const crowdAt = (cap) => Math.max(...runYear(cap).map((t) => t.workers / (cap * k)));
    expect(crowdAt(80)).toBeGreaterThan(1);
    expect(crowdAt(120)).toBeLessThan(1);
  });

  it('draws random events only in their seasons, and never a random swarm', () => {
    const events = [{ id: 'swarm', effect: {} }, { id: 'late_frost', effect: {} }];
    const pick = (day) => { const s = Object.assign(BH.bhCreateNewColonyState(5, 1), { day }); return BH.bhStepColony(s, cfg({ hiveEvents: events, rand: () => 0 })).event; };
    expect(pick(10) && pick(10).id).toBe('late_frost'); // spring
    expect(pick(70)).toBeFalsy(); // autumn: no frost, no random swarm
    expect(pick(100)).toBeFalsy(); // winter
  });

  it('weather damage to foraging fades instead of lasting forever', () => {
    const s = Object.assign(BH.bhCreateNewColonyState(5, 1), { day: 40, foragingEfficiency: 30 });
    expect(BH.bhStepColony(s, cfg()).next.foragingEfficiency).toBe(31);
  });
});

describe('waggle dance diagram: the comb and the map tell the same story', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  const wrap = (deg) => ((deg % 360) + 360) % 360;

  it('flower bearing = sun bearing + dance angle at every moment of the demo', () => {
    for (let t = 0; t < 240; t += 0.37) {
      const w = BH.bhWaggleDemoState(t, null);
      expect(wrap(w.sun + w.dance)).toBe(w.food);
      expect(Math.abs(w.dance)).toBeLessThanOrEqual(180);
    }
  });

  it('encodes distance as run duration (~1 s per km) and alternates return loops', () => {
    const sides = new Set();
    for (let t = 0; t < 14; t += 0.1) { const w = BH.bhWaggleDemoState(t, null); expect(w.runSec).toBeCloseTo(w.distM / 1000, 5); sides.add(w.side); }
    expect(sides).toEqual(new Set([1, -1]));
  });

  it("shows the student's own dial settings when they have set them", () => {
    const w = BH.bhWaggleDemoState(3, { dance: -45, sun: 120 });
    expect(w).toMatchObject({ source: 'lab', sun: 120, dance: -45, food: 75 });
  });

  it('the canvas reads that shared state instead of two separate oscillators', () => {
    expect(SRC_TEXT).toContain('var ws = bhWaggleDemoState(t2 / 60, (_liveState.current || {}).waggleLab);');
    expect(SRC_TEXT).not.toContain('var vSunAng = Math.sin(t2 * 0.003) * 0.5;');
    expect(SRC_TEXT).not.toContain('Only symbolic language in non-human animals');
  });
});

describe('mites compound, so treating early pays', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  const cfg = () => ({ params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: () => 1 });
  // With proportional growth a 75% kill leaves the same load a month later whenever it is given;
  // what early treatment saves is the mite-days in between, and the workers those mites kill.
  function run(treatDay) {
    let s = Object.assign(BH.bhCreateNewColonyState(9, 1), { day: 10, varroaLevel: 10, workers: 18000, brood: 15000, honey: 40, pollen: 20 });
    let miteDays = 0;
    for (let d = 10; d < 85; d++) {
      if (d === treatDay) s = Object.assign({}, s, { varroaLevel: s.varroaLevel * 0.25 }); // one 75% treatment
      s = Object.assign({}, s, BH.bhStepColony(s, cfg()).next);
      miteDays += s.varroaLevel;
    }
    return { miteDays, workers: s.workers };
  }
  it('the same 75% treatment given on day 15 instead of day 60 cuts the mite burden and saves workers', () => {
    const early = run(15), late = run(60);
    expect(early.miteDays).toBeLessThan(late.miteDays * 0.6);
    expect(early.workers).toBeGreaterThan(late.workers);
  });
  it('a heavier load grows faster than a light one (growth is proportional)', () => {
    const grow = (v) => { const s = Object.assign(BH.bhCreateNewColonyState(9, 1), { day: 40, varroaLevel: v, brood: 15000, workers: 20000 }); return BH.bhStepColony(s, cfg()).next.varroaLevel - v; };
    expect(grow(40)).toBeGreaterThan(grow(10) * 2);
  });
  it('a brood break makes the load fall', () => {
    const s = Object.assign(BH.bhCreateNewColonyState(9, 1), { day: 100, varroaLevel: 30, brood: 500, workers: 15000, honey: 60 });
    expect(BH.bhStepColony(s, cfg()).next.varroaLevel).toBeLessThan(30);
  });
});

describe('ownership and rhythm: named colony, season reports', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('offers naming on day 0 and carries the names into the header', () => {
    const day0 = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 0, tutorialDone: true } });
    expect(day0).toContain('data-beehive-colony-name="true"');
    expect(day0).toContain('data-beehive-queen-name="true"');
    const named = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 12, tutorialDone: true, colonyName: 'Clover Hill', queenName: 'Marigold' } });
    expect(named).toContain('Clover Hill · Queen Marigold');
    expect(named).not.toContain('data-beehive-colony-name="true"'); // naming is a day-0 step
    expect(named).not.toContain('50,000 minds');
  });
  it('shows a season report after spring, not before, and not once it is dismissed', () => {
    const base = { viewMode: 'beekeeper', tutorialDone: true, colonyName: 'Clover Hill', history: [{ d: 0, w: 10000, h: 20, v: 5, m: 80 }] };
    expect(renderTool('beehive', { beehive: Object.assign({}, base, { day: 29 }) })).not.toContain('beehive-season-report');
    const summer = renderTool('beehive', { beehive: Object.assign({}, base, { day: 31, workers: 16000, honey: 30, varroaLevel: 9 }) });
    expect(summer).toContain('Clover Hill · Spring report');
    expect(summer).toContain('Start Summer');
    expect(renderTool('beehive', { beehive: Object.assign({}, base, { day: 31, seasonReviewsSeen: [1] }) })).not.toContain('beehive-season-report');
  });
});

describe('calm scene: homestead details can step back so the hive stands out', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('gates the homestead cameos behind one switch and keeps the signal sections', () => {
    expect(SRC_TEXT).toContain('var _calmScene = !!ls.calmScene;');
    expect((SRC_TEXT.match(/end calm-scene gate/g) || []).length).toBeGreaterThanOrEqual(90);
    const hive = SRC_TEXT.indexOf('// ── Hive (detailed cross-section with 3D-ish look) ──');
    const water = SRC_TEXT.indexOf('// ── Water station: ceramic birdbath with water-forager bees ──');
    // The hive and the bees' water source are never behind the gate.
    expect(SRC_TEXT.slice(hive - 120, hive)).not.toContain('if (!_calmScene)');
    expect(SRC_TEXT.slice(water - 120, water)).not.toContain('if (!_calmScene)');
  });
  it('offers a Homestead details toggle that reports its state', () => {
    const on = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 12, tutorialDone: true, calmScene: false } });
    const off = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 12, tutorialDone: true, calmScene: true } });
    expect(on).toMatch(/data-beehive-homestead-toggle="true" aria-pressed="true"|aria-pressed="true"[^>]*data-beehive-homestead-toggle="true"/);
    expect(off).toMatch(/data-beehive-homestead-toggle="true" aria-pressed="false"|aria-pressed="false"[^>]*data-beehive-homestead-toggle="true"/);
  });
});

describe('drone energy: climbing costs muscle power', () => {
  let host, root, frames, cfg;
  const live = () => window.__testHooks.beehive.droneStateRef.current;
  const click = async (sel) => { const el = host.querySelector(sel); expect(el, sel).toBeTruthy(); await act(async () => { el.click(); await Promise.resolve(); }); };
  const maneuver = async (id) => { await click('input[name="bee-flight-decision"][value="' + id + '"]'); await click('[data-flight-advance-decision]'); };
  beforeEach(async () => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    frames = []; vi.stubGlobal('requestAnimationFrame', (cb) => (frames.push(cb), frames.length)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function App() { const [data, setData] = React.useState({ beehive: { viewMode: 'drone', honey: 80, workers: 10000, queenHealth: 100, morale: 90, varroaLevel: 2, soundOn: false, drone: { active: false, difficulty: 'easy', pacing: 'steps', courseSeed: 20260904 } } }); return cfg.render(makeCtx({ toolData: data, setToolData: setData })); }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
    await click('[data-mobile-rail="drone-difficulty"] button');
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('a one-second climb spends more energy than one second of level powered flight', async () => {
    const start = structuredClone({ x: live().x, y: live().y, z: live().z, vx: live().vx, vy: live().vy, vz: live().vz, energy: live().energy, phase: live().phase });
    await maneuver('climb');
    const climbCost = start.energy - live().energy;
    Object.assign(live(), start, { paused: true });
    await maneuver('forward'); // same thrust, no pitch-up: before 2026-09-28 these cost exactly the same
    const levelCost = start.energy - live().energy;
    expect(climbCost).toBeGreaterThan(levelCost);
  });

  it('the queen flies once the congregation area is reached, so the catch is a chase', async () => {
    Object.assign(live(), { phase: 'congregation', reachedDca: true, paused: true });
    const q = live().nearQueens[0]; const before = { x: q.x, z: q.z };
    await maneuver('coast');
    const after = live().nearQueens[0];
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(5);
  });
});

describe('grade level changes what a student meets', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('folds the fair-test machinery into a drawer for grades K-5 and leaves it open for 6-12', () => {
    const state = { beehive: { viewMode: 'beekeeper', day: 12, tutorialDone: true } };
    expect(renderTool('beehive', state, { gradeLevel: '4th Grade' })).toContain('data-beehive-experiment-tools="drawer"');
    expect(renderTool('beehive', state, { gradeLevel: '8th Grade' })).toContain('data-beehive-experiment-tools="open"');
  });
});

describe('guided hive inspection: judge first, then read the verdict', () => {
  let host, root, latest, cfg;
  beforeEach(() => {
    resetStemLab(); cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  async function mount(state) {
    function App() { const [data, setData] = React.useState({ beehive: Object.assign({ viewMode: 'beekeeper', tutorialDone: true, motionPaused: true, soundOn: false }, state) }); latest = data; return cfg.render(makeCtx({ toolData: data, setToolData: setData })); }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  const click = async (sel) => { const el = host.querySelector(sel); expect(el, sel).toBeTruthy(); await act(async () => { el.click(); await Promise.resolve(); }); };

  it('holds back the brood verdict until the student records a judgement, then scores it', async () => {
    await mount({ day: 40, queenHealth: 100, workers: 8000 }); // below the crowding at which queen cells appear
    expect(host.querySelector('[data-beehive-guided-inspection="open"]')).toBeTruthy();
    expect(host.textContent).toContain('Judge the brood pattern');
    expect(host.textContent).not.toContain('wall-to-wall');
    expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
    await click('[data-inspection-choice="brood:solid"]');
    await click('[data-inspection-choice="cells:no"]');
    await click('[data-inspection-record]');
    expect(latest.beehive.lastInspection).toMatchObject({ day: 40, brood: 'solid', broodCorrect: true, cells: 'no', cellsCorrect: true });
    expect(host.textContent).toContain('wall-to-wall');
  });

  it('keeps the hive closed in winter', async () => {
    await mount({ day: 100 });
    expect(host.querySelector('[data-beehive-guided-inspection="winter"]')).toBeTruthy();
  });
});

describe('stock and site cards promise only what the model does', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  const cfg = (subExtra = {}, siteExtra = {}, rand = () => 1) => ({ params: BH.SIMULATION_PARAMS, subMods: Object.assign({ honey: 1, spring: 1, winter: 1, varroa: 1 }, subExtra), siteMods: Object.assign({ forage: 1, disease: 1 }, siteExtra), gardenBonus: 0, hiveEvents: [{ id: 'swarm', effect: {} }], diseaseEvents: [], rand });

  it('a swarm-prone stock swarms at a crowding level where a calm stock does not', () => {
    const s = Object.assign(BH.bhCreateNewColonyState(3, 1), { day: 40, workers: 22000, capacity: 80 }); // crowd ratio 1.1
    // First draw decides the crowding swarm: base odds 0.11; a 1.5x stock has 0.165.
    const fires = (swarm) => !!BH.bhStepColony(s, cfg({ swarm }, {}, () => 0.14)).event;
    expect(fires(1.5)).toBe(true);
    expect(fires(1)).toBe(false);
  });
  it('an urban heat island breeds mites faster; a mountain valley slower', () => {
    const s = Object.assign(BH.bhCreateNewColonyState(3, 1), { day: 40, varroaLevel: 20, brood: 15000, workers: 20000 });
    const grow = (varroa) => BH.bhStepColony(s, cfg({}, { varroa })).next.varroaLevel;
    expect(grow(1.25)).toBeGreaterThan(grow(1));
    expect(grow(0.8)).toBeLessThan(grow(1));
  });
  it('the cards show the traits and their bars actually fill', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 0, tutorialDone: true } });
    expect(html.includes('Stays put')).toBe(true);
    // The number is the model's own multiplier (Russian mites grow at 0.60, Carniolans swarm 1.5x),
    // not the inverted 2 - x that read "x1.40" beside a MORE resistant bee.
    expect(html.includes('mites ×0.60')).toBe(true);
    expect(html.includes('swarms ×1.50')).toBe(true);
    expect(html.includes('×1.40</span>')).toBe(false);
    expect(html.includes('data-beehive-trait-legend="true"')).toBe(true);
    expect(html).toContain('Mites 125%');
    expect(html).toContain('Big early-summer flow');
    expect(html).toContain('Bears ×3');
    expect(html).not.toContain('bg-bg-');
  });
});

describe('pass 6: honest props, plain words, fair information', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('hides the rival doctrine until the student scouts', () => {
    const unscouted = renderTool('beehive', { beehive: { viewMode: 'queen', tutorialDone: true, queen: { active: true, paused: true, day: 3, rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0, doctrine: 'shock' } } } });
    expect(unscouted).toContain('Thistle Crown - doctrine unknown');
    expect(unscouted).toContain('Scout to find out which');
  });
  it('gives drones a reproductive payoff in the mating season', () => {
    expect(SRC_TEXT).toContain("score: queenScore + 10 + (qSeason <= 1 ? Math.floor((pop.drones || 0) / 20) : 0)");
  });
  it('ties the swarm bivouac, feeder and harvest props to what actually happened', () => {
    expect(SRC_TEXT).toContain("if (day - _swarmSeenDay >= 0 && day - _swarmSeenDay <= 2 && season !== 3) {");
    expect(SRC_TEXT).toContain('if ((ls.syrup || 0) > 0.5) {');
    expect((SRC_TEXT.match(/if \(ls\.harvestedThisYear && \(season === 1 \|\| season === 2\)\)/g) || []).length).toBe(2);
    expect(SRC_TEXT).not.toContain('Math.random() * (hiveW - 20)'); // mites no longer strobe
  });
  it('speaks plainly in headings and prompts', () => {
    ['Interrupt the parasite-virus pathway', 'Restore the forage-to-food pathway', 'Build a CER link', 'integral of (birth rate', 'They are not sampled infestation rates'].forEach((jargon) => expect(SRC_TEXT).not.toContain(jargon));
  });
});

describe('field guide: student-first topics, search, and a way in from the views', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  const base = { viewMode: 'beekeeper', day: 5, tutorialDone: true, showGuide: true };
  it('keeps teacher resources behind a toggle outside teacher mode', () => {
    const student = renderTool('beehive', { beehive: base });
    expect(student).not.toContain('label="Teacher resources"');
    expect(student).toContain('Show teacher resources (5)');
    expect(renderTool('beehive', { beehive: base }, { isTeacherMode: true })).toContain('label="Teacher resources"');
  });
  it('searches across topics', () => {
    const html = renderTool('beehive', { beehive: Object.assign({}, base, { guideQuery: 'propolis' }) });
    expect(html).toContain('data-beehive-guide-results="true"');
    expect(html).toMatch(/\d+ match(es)? for “propolis”/);
  });
  it('offers Learn more from a science view', () => {
    expect(renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 5, tutorialDone: true, beeView: 'waggle' } })).toContain('data-beehive-learn-more="waggle"');
  });
});

describe('thermoregulation diagram reports the student trial', () => {
  it('reads d.thermHunt through the live ref and redraws a paused diagram when it changes', () => {
    expect(SRC_TEXT).toContain('var trial = (_liveState.current || {}).thermHunt;');
    expect(SRC_TEXT).toContain("thermHunt: d.thermHunt || null");
    expect(SRC_TEXT).toContain('d.activeEvent, d.waggleLab, d.calmScene, d.thermHunt, d.supersAdded, d.winterized]);');
  });
});

describe('drone HUD: developer telemetry only in the detailed HUD', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('keeps renderer and frame-rate badges as screen-reader status in the clear HUD', () => {
    expect(SRC_TEXT).toContain("style: droneData.detailedHud === true ? { position: 'absolute', top: '58px', right: '8px', zIndex: 20 } : BH_VISUALLY_HIDDEN,");
    expect(SRC_TEXT).toContain("style: droneData.detailedHud === true ? { position: 'absolute', top: '58px', left: '8px', zIndex: 20 } : BH_VISUALLY_HIDDEN,");
  });
});

describe('queens age, and colonies replace failing queens', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  const cfg = (rand) => ({ params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: rand || (() => 1) });
  it('a queen loses a few points of laying over an event-free brood season', () => {
    let s = Object.assign(BH.bhCreateNewColonyState(11, 1), { queenHealth: 100 });
    for (let i = 0; i < 90; i++) s = Object.assign({}, s, BH.bhStepColony(s, cfg()).next);
    expect(s.queenHealth).toBeLessThan(96);
    expect(s.queenHealth).toBeGreaterThan(85);
  });
  it('a failing queen can be superseded in spring, with a brood gap and a healthy successor', () => {
    const s = Object.assign(BH.bhCreateNewColonyState(11, 1), { day: 20, queenHealth: 30, brood: 10000 });
    const r = BH.bhStepColony(s, cfg(() => 0));
    expect(r.event && r.event.id).toBe('supersedure');
    expect(r.next.queenHealth).toBeGreaterThanOrEqual(80);
    expect(r.next.brood).toBeLessThan(10000);
  });
});

describe('splits and the hive scale report what they really mean', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('counts splits on the year-end card (the counter used to be written and never shown)', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 121, splitsMade: 1, history: [{ d: 0, w: 10000, h: 20, v: 5, m: 80 }] } });
    expect(html.includes('New colonies (splits)'), 'year-end card lists splits').toBe(true);
    expect(html.includes('/10 points'), 'grade out of 10').toBe(true);
  });
  it('the split parent raises a new queen, and the scale shows a readable gross weight', () => {
    expect(SRC_TEXT.includes('b.queenHealth = 90;                  // the old queen goes with the split')).toBe(true);
    expect(SRC_TEXT.includes('var _hsclWt = 22 + Math.min(2, ls.supersAdded || 0) * 5 + (honey || 0) * 0.45')).toBe(true);
    expect(SRC_TEXT.includes("c.font = 'bold 2.6px monospace';")).toBe(false);
  });
});

describe('threats and castes diagrams show this colony', () => {
  it('adds a live "your colony now" line to both, from the live ref', () => {
    expect(SRC_TEXT.includes("'Your colony now: mites ' + Math.round(_yc.varroaLevel || 0)")).toBe(true);
    expect(SRC_TEXT.includes("'Your colony now: 1 queen (' + Math.round(_yc.queenHealth || 0)")).toBe(true);
    expect(SRC_TEXT.includes('raise a new queen in 3 days')).toBe(false);
  });
});

describe('the sun sets at night instead of running backwards', () => {
  it('moves east to west by day, fades at the edges, and is gone at night', () => {
    expect(SRC_TEXT.includes('var _sunT_arc = _sunCycle < 1 ? _sunCycle : (2 - _sunCycle)')).toBe(false);
    expect(SRC_TEXT.includes('var _sunT_arc = _sunDown ? _sunCycle - 1 : _sunCycle;')).toBe(true);
    expect(SRC_TEXT.includes('c.globalAlpha = (_stormNow ? 0.18 : 1) * _sunVis;')).toBe(true);
    expect(SRC_TEXT.includes('if (season === 3 && !_sunDown && _sunT_arc > 0.15')).toBe(true);
  });
  it('daytime-only effects read the sun height, which is 0 all night', () => {
    expect(SRC_TEXT.includes('var _sunDay = _sunDown ? 0 :')).toBe(true);
    for (const v of ['_csDay', '_pdDay', '_dpDay']) expect(SRC_TEXT.includes('var ' + v + ' = _sunDay;'), v).toBe(true);
    expect(SRC_TEXT.includes("(season === 0 || season === 1) && !_sunDown && _sunT_arc > 0.3")).toBe(true);
  });
  it('sunflowers turn east at night (they read a clock that is already set)', () => {
    expect(SRC_TEXT.includes('var _isNight = _tdT >= 1.05')).toBe(false);
    expect(SRC_TEXT.includes('var _isNight = _sunCycle >= 1.05 && _sunCycle <= 1.95;')).toBe(true);
  });
});

describe('foragers go home at night', () => {
  it('grounds foragers after dark, shows fanners at the entrance, and says why', () => {
    expect(SRC_TEXT.includes("(_sunCycle >= 1.05 && _sunCycle < 1.92) ? 'night' : ''")).toBe(true);
    expect(SRC_TEXT.includes("_foragersGrounded === 'night' ? 2 : 0")).toBe(true);
    expect(SRC_TEXT.includes("__alloT('stem.beehive.night_foragers_home'")).toBe(true);
    expect(SRC_TEXT.includes('_gX = Math.max(_gW / 2 + 4, Math.min(W - _gW / 2 - 4, hiveX + hiveW / 2))')).toBe(true);
  });
});

describe('the year-end card grades this year, not lifetime totals', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  const T = (o) => Object.assign({ harvested: 0, varietalLbs: {}, conservations: 0, splits: 0, totalHoney: 0, flowerVisits: 0 }, o);
  const twoYears = {
    totalHarvested: 45, varietals: { clover: { lbs: 40 }, buckwheat: { lbs: 5 } }, conservationsDone: 5, splitsMade: 1, totalHoney: 260, totalFlowerVisits: 3000,
    yearLedger: {
      1: { start: T({}), fromDay: 0, peakVarroa: 12, peakWorkers: 24000, winterHoney: 50 },
      2: { start: T({ harvested: 30, varietalLbs: { clover: 30 }, conservations: 4, splits: 1, totalHoney: 200, flowerVisits: 1000 }), fromDay: 120, peakVarroa: 27, peakWorkers: 26000, winterHoney: 31 },
    },
  };
  it('splits the totals at the year boundary', () => {
    const y1 = BH.bhYearReport(twoYears, 1, BH.SIMULATION_PARAMS);
    const y2 = BH.bhYearReport(twoYears, 2, BH.SIMULATION_PARAMS);
    expect(y1).toMatchObject({ exact: true, harvested: 30, varietals: 1, conservations: 4, splits: 1, totalHoney: 200, peakVarroa: 12, winterHoney: 50 });
    expect(y2).toMatchObject({ exact: true, harvested: 15, varietals: 2, conservations: 1, splits: 0, totalHoney: 60, flowerVisits: 2000, peakVarroa: 27, peakWorkers: 26000, winterHoney: 31 });
    expect(y2.winterNeed).toBe(BH.SIMULATION_PARAMS.seasonReserve[3]);
  });
  it('says so when a save predates the ledger, and reads winter stores from the history', () => {
    const old = { totalHarvested: 45, history: [{ d: 210, w: 20000, h: 38, v: 9 }, { d: 215, w: 21000, h: 36, v: 22 }] };
    const r = BH.bhYearReport(old, 2, BH.SIMULATION_PARAMS);
    expect(r.exact).toBe(false);
    expect(r.winterHoney).toBe(38);
    expect(r.peakVarroa).toBe(22);
    const late = BH.bhYearReport({ yearLedger: { 2: { start: T({}), fromDay: 150, peakVarroa: 3, peakWorkers: 1, winterHoney: null } } }, 2, BH.SIMULATION_PARAMS);
    expect(late).toMatchObject({ exact: false, fromDay: 150 });
  });
  it('shows the year-2 card with this year\'s harvest and a per-point checklist', () => {
    const html = renderTool('beehive', { beehive: Object.assign({ viewMode: 'beekeeper', tutorialDone: true, day: 240, yearReviewsSeen: [1] }, twoYears) });
    expect(html.includes('Scored on year 2 only (days 121 to 240).')).toBe(true);
    expect(html.includes('Honey harvested this year')).toBe(true);
    expect(html.includes('data-beehive-year-score="checklist"')).toBe(true);
    expect(html.includes('Harvested 15 lb (1 point at 10+ lb, 2 at 25+ lb')).toBe(true);
    expect(html.includes('Mites peaked at 27')).toBe(true);
    expect(html.includes('31 lb of stores on the first day of winter (needs 45')).toBe(true);
    expect(html.includes('Min. varroa')).toBe(false);
    expect(html.includes('Events handled')).toBe(false);
  });
});

describe('advancing a day writes the year ledger', () => {
  let host, root, latest, cfg;
  async function mount(state) {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ viewMode: 'beekeeper', tutorialDone: true, soundOn: false, simulationSeed: 4242, randomState: 4242, seededFromDay: 0 }, state) });
      latest = data; return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  async function nextDay() {
    const btn = host.querySelector('#beehive-next-day');
    expect(btn, 'Next Day button').toBeTruthy();
    await act(async () => { btn.click(); await Promise.resolve(); });
  }
  afterEach(() => { act(() => root.unmount()); host.remove(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('year 1 starts at zero even when the first recorded day is mid-year', async () => {
    await mount({ day: 89, workers: 20000, honey: 52, varroaLevel: 14, totalHarvested: 12 });
    await nextDay();
    const led = latest.beehive.yearLedger[1];
    expect(latest.beehive.day).toBe(90);
    expect(led.start.harvested).toBe(0);
    expect(led.fromDay).toBe(0);
    expect(led.peakVarroa).toBeGreaterThan(0);
    expect(typeof led.winterHoney).toBe('number'); // day 90 = first day of winter
  });
  it('a new year snapshots the totals as it begins', async () => {
    await mount({ day: 120, workers: 20000, honey: 52, varroaLevel: 8, totalHarvested: 33, conservationsDone: 2, yearReviewsSeen: [1],
      yearLedger: { 1: { start: { harvested: 0, varietalLbs: {}, conservations: 0, splits: 0, totalHoney: 0, flowerVisits: 0 }, fromDay: 0, peakVarroa: 10, peakWorkers: 20000, winterHoney: 50 } } });
    await nextDay();
    const led = latest.beehive.yearLedger[2];
    expect(led).toMatchObject({ fromDay: 120 });
    expect(led.start).toMatchObject({ harvested: 33, conservations: 2 });
    expect(latest.beehive.yearLedger[1].peakVarroa).toBe(10); // last year is left alone
  });
});

describe('the drone flight says how sped up it is', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  it('states the speed-up next to the other model simplifications', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'drone', tutorialDone: true } });
    expect(html.includes('data-flight-time-scale="true"'), 'note rendered in drone mode').toBe(true);
    expect(html).toContain('75 to 150 seconds');
    expect(html).toContain('12 to 24 times longer');
    expect(html).toContain('not measurements of real bee flight');
  });
  it('the note\'s numbers still match the flight physics and timers', () => {
    // Coast = 1.05 thrust, full = 1.05 + 5.15; per-frame velocity settles at thrust/60 / (1 - 0.968).
    expect(SRC_TEXT.includes('var thrust = 1.05 + (ds.controlThrust >= 0 ? ds.controlThrust * 5.15')).toBe(true);
    expect(SRC_TEXT.includes('var drag = Math.pow(0.968, frameScale);')).toBe(true);
    const perSecond = (thrust) => thrust / 60 / (1 - 0.968) * 60;
    expect(Math.round(perSecond(1.05))).toBeGreaterThanOrEqual(28);
    expect(Math.round(perSecond(1.05))).toBeLessThanOrEqual(36);
    expect(Math.round(perSecond(6.2) / 10) * 10).toBe(190);
    expect(BH.DRONE_FLIGHT_PARAMS.timerByDifficulty).toEqual({ easy: 150, normal: 110, hard: 75 });
  });
});

describe('the scene card names its numbers', () => {
  it('labels morale and mites in words, with the Varroa meter bands', () => {
    expect(SRC_TEXT.includes("_drawHudChip(chipX, __alloT('stem.beehive.hud_morale', 'Morale')")).toBe(true);
    expect(SRC_TEXT.includes("_drawHudChip(chipX, __alloT('stem.beehive.hud_mites', 'Mites'), Math.round(varroaLevel || 0), '', varroaLevel >= 20 ? 'high' : (varroaLevel >= 10 ? 'warn' : 'ok'))")).toBe(true);
    expect(SRC_TEXT.includes('varroaLevel >= 25 ? \'high\' : (varroaLevel >= 15')).toBe(false);
    expect(SRC_TEXT.includes('var hudW = 196,')).toBe(true);
  });
});

describe('the thermoregulation trial has heater bees as well as fanners', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  it('heater bees warm the nest and fanners cool it; brood count is not a heater', () => {
    const T = (o) => BH.bhThermoEstimate(Object.assign({}, BH.BH_THERMO_DEFAULTS, o));
    expect(T({})).toBeCloseTo(29.6, 5); // chilly default invites the investigation
    expect(T({ heaterBees: 0, beesFanning: 0, outsideC: 12 })).toBe(12);
    expect(T({ heaterBees: 2000 })).toBeGreaterThan(T({ heaterBees: 1000 }));
    expect(T({ beesFanning: 200 })).toBeLessThan(T({ beesFanning: 0 }));
    expect(T({ broodCount: 20000 })).toBe(T({})); // the old lever no longer heats
    // Both ends of the outside-temperature slider can be brought into the 34-36 C band.
    expect(T({ outsideC: -10, heaterBees: 5000, beesFanning: 0 })).toBeGreaterThanOrEqual(34);
    expect(T({ outsideC: 45, heaterBees: 0, beesFanning: 250 })).toBeLessThanOrEqual(36);
  });
  it('renders the heater slider, and loads a save from the brood-count model', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 5, discoveryLesson: 'thermo',
      thermHunt: { outsideC: 20, beesFanning: 30, broodCount: 5000, log: [{ o: 20, f: 30, b: 5000, t: '22.8', st: 'chilled' }] } } });
    expect(html.includes('id="th-heaterBees"')).toBe(true);
    expect(html.includes('id="th-broodCount"')).toBe(false);
    expect(html.includes('1,200 heater bees') || html.includes('value="1200"')).toBe(true);
    expect(html.includes('5,000 brood (older model)')).toBe(true);
    expect(html.includes('Hive ≈ 29.6 °C')).toBe(true);
  });
  it('the paused diagram redraws when the heater slider moves', () => {
    expect(SRC_TEXT.includes("d.thermHunt.beesFanning + ',' + d.thermHunt.heaterBees : ''")).toBe(true);
  });
});

describe('each mode states its own goal in the header', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('beekeeper keeps the year goal; network and drone say theirs', () => {
    const keeper = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true } });
    const network = renderTool('beehive', { beehive: { viewMode: 'queen', tutorialDone: true } });
    const drone = renderTool('beehive', { beehive: { viewMode: 'drone', tutorialDone: true } });
    expect(keeper.includes('Keep a honeybee colony alive for a whole year')).toBe(true);
    expect(network.includes('Keep a honeybee colony alive for a whole year')).toBe(false);
    expect(network.includes('out-compete a rival colony')).toBe(true);
    expect(drone.includes('reach a queen before his energy runs out')).toBe(true);
  });
});

describe('every year-card point can be earned in year 1', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('scores a strong first year (26 lb harvested, syrup fed back, mites treated early) near the top', () => {
    const T = (o) => Object.assign({ harvested: 0, varietalLbs: {}, conservations: 0, splits: 0, totalHoney: 0, flowerVisits: 0 }, o);
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 120, colonyHealth: 85, morale: 90, queenHealth: 95, workers: 22000, honey: 50,
      totalHarvested: 26, varietals: { clover: { lbs: 20 }, linden: { lbs: 4 }, goldenrod: { lbs: 2 } }, conservationsDone: 3, splitsMade: 1,
      yearLedger: { 1: { start: T({}), fromDay: 0, peakVarroa: 12, peakWorkers: 24989, winterHoney: 54 } } } });
    expect(html.includes('Harvested 26 lb (1 point at 10+ lb, 2 at 25+ lb')).toBe(true);
    expect(html.includes('Peak workforce 25.0K') || html.includes('Peak workforce 24,989') || html.includes('Peak workforce 25K')).toBe(true);
    const m = html.match(/(\d+)\/10 points/);
    expect(m, 'grade shown').toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(9);
  });
});

describe('the daily model version says the equations changed', () => {
  let BH;
  beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
  it('is 1.1, and a baseline saved under 1.0 does not count as the same model', () => {
    expect(BH.BEEHIVE_COLONY_MODEL_VERSION).toBe('colony-daily-1.1');
    const state = Object.assign(BH.bhCreateNewColonyState(2468, 1), { day: 8 });
    const old = Object.assign(BH.bhCreateExperimentSnapshot(state), { modelVersion: 'colony-daily-1.0' });
    const cmp = BH.bhCompareExperiments(old, state);
    const model = cmp.checks.find((c) => c.id === 'model');
    expect(model).toMatchObject({ matched: false, baseline: 'colony-daily-1.0', current: 'colony-daily-1.1' });
  });
});

describe('notebooks merged: one thermo lab, one notebook next to the day\'s moves', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  const count = (html, needle) => html.split(needle).length - 1;
  it('Stage-first: the thermo lab is a launcher unless its discovery is open, and then has no second set of writing boxes', () => {
    const other = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 8 } });
    expect(count(other, 'data-beehive-thermoregulation="true"')).toBe(0);
    expect(other.includes('data-beehive-thermo-launcher="true"')).toBe(true);
    expect(other.includes('id="beehive-thermo-hypothesis"')).toBe(false);
    const thermo = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 8, discoveryLesson: 'thermo', thermHunt: { outsideC: 20, beesFanning: 30, heaterBees: 1200, hypothesis: 'More fanners cool it', understood: true, explanation: 'They move air', log: [] } } });
    expect(count(thermo, 'data-beehive-thermoregulation="true"')).toBe(1);
    expect(thermo.includes('data-beehive-thermo-launcher="true"')).toBe(false);
    expect(thermo.includes('id="beehive-thermo-hypothesis"')).toBe(false);
    expect(thermo.includes('id="beehive-thermo-explanation"')).toBe(false);
    expect(thermo.includes('data-thermo-writes-to="discovery"')).toBe(true);
    expect(thermo.includes('Hypothesis: More fanners cool it')).toBe(true); // earlier notes kept, read-only
  });
  it('overview layout keeps the full lab with its own boxes; other roles get no thermo lab', () => {
    const overview = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 8, focusLayout: false } });
    expect(count(overview, 'data-beehive-thermoregulation="true"')).toBe(1);
    expect(overview.includes('id="beehive-thermo-hypothesis"')).toBe(true);
    expect(overview.includes('data-beehive-thermo-launcher')).toBe(false);
    for (const viewMode of ['queen', 'drone']) {
      const html = renderTool('beehive', { beehive: { viewMode, tutorialDone: true } });
      expect(html.includes('data-beehive-thermoregulation'), viewMode).toBe(false);
      expect(html.includes('data-beehive-thermo-launcher'), viewMode).toBe(false);
    }
  });
  it('puts the Science Notebook right after the day\'s moves, with the discovery\'s step names', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true, day: 8, notebookOpen: true } });
    const moves = html.indexOf('id="beehive-colony-interventions"');
    const notebook = html.indexOf('data-beehive-notebook="beekeeper"');
    const brief = html.indexOf('data-beehive-learning-brief="true"');
    expect(moves).toBeGreaterThan(0);
    expect(notebook).toBeGreaterThan(moves);
    expect(notebook).toBeLessThan(brief);
    expect(html.includes('1. Predict')).toBe(true);
    expect(html.includes('2. Observe (evidence)')).toBe(true);
    expect(html.includes('3. Explain')).toBe(true);
    expect(html.includes('1. Prediction')).toBe(false);
  });
});

describe('saved discoveries flow into the notebook claim', () => {
  let host, root, latest, cfg;
  async function mount(state) {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ viewMode: 'beekeeper', tutorialDone: true, soundOn: false, motionPaused: true }, state) });
      latest = data; return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  afterEach(() => { act(() => root.unmount()); host.remove(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('adds each finding once to the evidence box', async () => {
    await mount({ day: 8, notebookOpen: true, notebook: { discoveries: { stores: { title: 'Follow the food', observation: 'Stores fell while bees foraged', comparison: '21 → 19 lb', explanation: 'They eat more than they bring in' } } } });
    const btn = host.querySelector('[data-beehive-add-discoveries="beekeeper"]');
    expect(btn, 'add-findings button').toBeTruthy();
    await act(async () => { btn.click(); await Promise.resolve(); });
    const line = 'Follow the food: Stores fell while bees foraged (21 → 19 lb)';
    expect(latest.beehive.notebook.beekeeper.evidence).toBe(line);
    await act(async () => { host.querySelector('[data-beehive-add-discoveries="beekeeper"]').click(); await Promise.resolve(); });
    expect(latest.beehive.notebook.beekeeper.evidence).toBe(line); // not duplicated
  });
  it('the launcher opens the thermoregulation discovery', async () => {
    await mount({ day: 8 });
    const open = host.querySelector('[data-beehive-open-thermo="true"]');
    expect(open).toBeTruthy();
    await act(async () => { open.click(); await Promise.resolve(); });
    expect(latest.beehive.discoveryLesson).toBe('thermo');
    expect(host.querySelectorAll('[data-beehive-thermoregulation="true"]').length).toBe(1);
  });
});

describe('Colony Network plays one bee year with a winter truce', () => {
  let host, root, latest, cfg, BH;
  const baseRival = { name: 'Thistle Crown', doctrine: 'opportunist', health: 80, strength: 400, stores: 40, structures: 3, pressure: 10, intel: 1 };
  async function mountQueen(overrides = {}) {
    const queen = Object.assign({ active: true, paused: true, speed: 1, day: 0, hiveHealth: 90, territory: 50, phase: 'build',
      resources: { nectar: 40, pollen: 20, wax: 10, royalJelly: 5 }, pheromones: { qmp: 90, alarm: 0, nasonov: 50, brood: 40 },
      population: { nurses: 200, builders: 100, guards: 50, foragers: 300, scouts: 30, drones: 40 }, rival: Object.assign({}, baseRival) }, overrides);
    function App() {
      const [data, setData] = React.useState({ beehive: { viewMode: 'queen', tutorialDone: true, soundOn: false, queen } });
      latest = data; return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  async function resumeAndRun(cycles) {
    const resume = Array.from(host.querySelectorAll('button')).find((b) => /Resume RTS/.test(b.textContent || ''));
    if (resume) await act(async () => { resume.click(); await Promise.resolve(); });
    for (let i = 0; i < cycles; i++) await act(async () => { vi.advanceTimersByTime(2450); await Promise.resolve(); });
  }
  beforeEach(() => {
    vi.useFakeTimers();
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (t, p) => (p in t ? t[p] : (t[p] = () => ({ addColorStop() {} }))) }));
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no random threats, swarms or rebellions
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.useRealTimers(); });

  it('runs 40 cycles: 10 each of spring, summer, autumn and winter', () => {
    expect(BH.BH_QUEEN_YEAR_CYCLES).toBe(40);
    expect([0, 1, 10, 11, 20, 21, 30, 31, 40, 41].map((c) => BH.bhQueenSeason(c))).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 0]);
  });
  it('no raids fly in winter; the rival clusters instead', async () => {
    await mountQueen({ day: 30, rival: Object.assign({}, baseRival, { pressure: 95 }) });
    await resumeAndRun(4); // cycles 31-34, including cadence cycle 32 and pressure 95
    const q = latest.beehive.queen;
    expect(q.day).toBe(34);
    expect((q.events || []).some((e) => e.type === 'rival_raid')).toBe(false);
    expect(q.hiveHealth).toBeGreaterThanOrEqual(90);
    expect(q.rival.posture).toBe('cluster');
    expect(q.phase).toBe('winter');
  });
  it('in winter your own raids and scouts are grounded', async () => {
    await mountQueen({ day: 32 });
    const raid = host.querySelector('[data-quick-command="raid_rival"]');
    expect(raid.getAttribute('data-command-ready')).toBe('false');
    expect(raid.getAttribute('data-unavailable-reason')).toBe('Too cold to fly in winter');
    const before = JSON.stringify(latest.beehive.queen.resources);
    await act(async () => { raid.click(); await Promise.resolve(); });
    expect(JSON.stringify(latest.beehive.queen.resources)).toBe(before);
  });
  it('a rival with no stores starves in its winter cluster', async () => {
    await mountQueen({ day: 33, rival: Object.assign({}, baseRival, { stores: 0, health: 50 }) });
    await resumeAndRun(1);
    expect(latest.beehive.queen.rival.health).toBe(45);
    expect(latest.beehive.queen.events.some((e) => e.type === 'rival_starve')).toBe(true);
  });
  it('a raid robs the rival\'s stores', async () => {
    await mountQueen({ day: 5, rival: Object.assign({}, baseRival, { stores: 60 }) });
    const nectar0 = latest.beehive.queen.resources.nectar;
    const raid = host.querySelector('[data-quick-command="raid_rival"]');
    await act(async () => { raid.click(); await Promise.resolve(); });
    const q = latest.beehive.queen;
    const damage = 80 - q.rival.health;
    expect(damage).toBeGreaterThanOrEqual(4);
    expect(q.rival.stores).toBe(60 - (6 + damage));
    expect(q.resources.nectar).toBe(nectar0 - 10 + 6 + damage);
    expect(q.feedback.text).toContain('robbed ' + (6 + damage) + ' nectar');
  });
  it('the spring census at cycle 40 ends the year for the healthier colony', async () => {
    await mountQueen({ day: 39, hiveHealth: 60, rival: Object.assign({}, baseRival, { health: 40 }) });
    await resumeAndRun(1);
    expect(latest.beehive.queen.result).toBe('victory');
    expect(latest.beehive.queen.feedback.text).toContain('SPRING CENSUS');
    await mountQueen({ day: 39, hiveHealth: 30, rival: Object.assign({}, baseRival, { health: 55 }) });
    await resumeAndRun(1);
    expect(latest.beehive.queen.result).toBe('defeat');
  });
  it('the advice knows the season: grow in spring, stock up in autumn, cluster in winter', async () => {
    await mountQueen({ day: 2 });
    expect(host.querySelector('[data-rts-recommended-command="true"]').getAttribute('data-recommended-action')).toBe('lay_workers');
    await mountQueen({ day: 22, resources: { nectar: 12, pollen: 20, wax: 10, royalJelly: 5 }, rival: Object.assign({}, baseRival, { stores: 2 }) });
    expect(host.querySelector('[data-rts-decision-window="stockup"]')).toBeTruthy();
    await mountQueen({ day: 32, pheromones: { qmp: 30, alarm: 0, nasonov: 50, brood: 40 } });
    expect(host.querySelector('[data-rts-decision-window="winter"]')).toBeTruthy();
    expect(host.querySelector('[data-rts-recommended-command="true"]').getAttribute('data-recommended-action')).toBe('emit_qmp');
    expect(host.textContent.includes('census in 8')).toBe(true);
  });
});

describe('the scene shows what the student did to the hive', () => {
  it('draws added supers under a raised roof, a winter wrap with a mouse guard, and weighs the supers', () => {
    expect(SRC_TEXT.includes('supersAdded: d.supersAdded || 0, winterized: !!d.winterized,')).toBe(true);
    expect(SRC_TEXT.includes('var _supers = Math.min(2, ls.supersAdded || 0);')).toBe(true);
    expect(SRC_TEXT.includes('c.translate(0, -_superH);')).toBe(true);
    expect(SRC_TEXT.includes('if (ls.winterized && season >= 2) {')).toBe(true);
    expect(SRC_TEXT.includes('var _hsclWt = 22 + Math.min(2, ls.supersAdded || 0) * 5 +')).toBe(true);
    expect(SRC_TEXT.includes('_gY = hiveY - 34 - (_superH || 0);')).toBe(true);
  });
});

describe('Colony Network battlefield shows the winter cluster', () => {
  it('draws a tight, warm ball in winter and no per-frame random jitter', () => {
    expect(SRC_TEXT.includes('var qCluster = qSeason2 === 3;')).toBe(true);
    expect(SRC_TEXT.includes('+ Math.random() * 20;')).toBe(false);
    expect(SRC_TEXT.includes("'👑 COLONY NETWORK · Cycle ' + qs.queenDay + ' / ' + BH_QUEEN_YEAR_CYCLES")).toBe(true);
  });
});
