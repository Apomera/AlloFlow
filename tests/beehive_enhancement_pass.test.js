// Regression guards for the 2026-09-27 beehive enhancement pass. Each block pins a defect
// that shipped because no test looked at it from the student's side.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

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
    expect(host.querySelector('[role="radiogroup"][aria-label="Brood pattern"]').textContent).toContain('The brood pattern is');
    expect(host.querySelector('[data-inspection-feedback]')).toBeNull();
    expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
    await click('[data-inspection-choice="brood:solid"]');
    await click('[data-inspection-choice="cells:no"]');
    await click('[data-inspection-record]');
    expect(latest.beehive.lastInspection).toMatchObject({ day: 40, brood: 'solid', broodCorrect: true, cells: 'no', cellsCorrect: true });
    const broodResult = host.querySelector('[data-inspection-result="brood"]');
    expect(broodResult.getAttribute('data-result')).toBe('match');
    expect(broodResult.querySelector('[data-inspection-answer]').textContent).toBe('Solid, mostly continuous');
    expect(broodResult.querySelector('[data-inspection-expected]').textContent).toBe('Solid, mostly continuous');
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
    expect(SRC_TEXT.includes("thermHunt: beeView === 'thermo' ? Object.assign({}, d.thermHunt || {}, bhThermoReading(d.thermHunt))")).toBe(true);
    // 79e3e5eae appended d.pollinationLab and isDark to the same effect deps; d.thermHunt must stay in them.
    expect(SRC_TEXT.includes('d.activeEvent, d.waggleLab, d.calmScene, d.thermHunt, d.supersAdded, d.winterized, d.pollinationLab, isDark]);'), 'diagram effect redraws on d.thermHunt').toBe(true);
  });
});

describe('drone HUD: developer telemetry only in the detailed HUD', () => {
  beforeAll(() => { resetStemLab(); loadTool(TOOL, 'beehive'); });
  it('keeps renderer and frame-rate badges as screen-reader status in the clear HUD', () => {
    // f7b4d993f grouped both badges in one diagnostics container (was two absolutely placed badges).
    const anchor = "h('div', { className: 'bee-flight-command-diagnostics', style: droneData.detailedHud === true ? undefined : BH_VISUALLY_HIDDEN },";
    const at = SRC_TEXT.indexOf(anchor);
    expect(at > -1 && SRC_TEXT.indexOf(anchor, at + 1) === -1, 'one diagnostics container, hidden unless detailed HUD').toBe(true);
    const block = sliceBetween(SRC_TEXT, anchor, '\n        }', { file: TOOL, label: 'flight diagnostics container' });
    expect(block.includes("h('span', { 'data-flight-renderer-badge': 'true',") && block.includes("role: 'status', 'aria-live': 'polite' }, 'Preparing 3D')"), 'renderer badge stays a status').toBe(true);
    expect(block.includes("h('span', { 'data-flight-quality-badge': 'true', role: 'status',"), 'quality badge stays a status').toBe(true);
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
    expect(r.next.queenHealth).toBe(0);
    expect(r.next.eggsLaid).toBe(0);
    expect(r.next.queenTransition).toMatchObject({ kind: 'supersedure', daysRemaining: 21, pendingHealth: 85 });
    expect(r.next.brood).toBeLessThan(10000);
    let waiting = Object.assign({}, s, r.next);
    for (let i = 0; i < 21; i++) {
      waiting = Object.assign({}, waiting, BH.bhStepColony(waiting, cfg()).next);
      expect(waiting.eggsLaid).toBe(0);
    }
    expect(waiting.queenTransition).toBeNull();
    expect(waiting.queenHealth).toBeGreaterThanOrEqual(80);
    expect(BH.bhStepColony(waiting, cfg()).next.eggsLaid).toBeGreaterThan(0);
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
    const html = renderTool('beehive', { beehive: { viewMode: 'beekeeper', tutorialDone: true,
      day: 10, queenHealth: 0, queenTransition: { kind: 'split', daysRemaining: 21, pendingHealth: 90 } } });
    expect(html).toContain('laying is paused for 21 more modeled day(s)');
    expect(html).toContain('Existing brood keeps developing');
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
    expect(html).toContain('29.6 °C');
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
  it('is 1.2, and a baseline saved under 1.0 does not count as the same model', () => {
    expect(BH.BEEHIVE_COLONY_MODEL_VERSION).toBe('colony-daily-1.2');
    const state = Object.assign(BH.bhCreateNewColonyState(2468, 1), { day: 8 });
    const old = Object.assign(BH.bhCreateExperimentSnapshot(state), { modelVersion: 'colony-daily-1.0' });
    const cmp = BH.bhCompareExperiments(old, state);
    const model = cmp.checks.find((c) => c.id === 'model');
    expect(model).toMatchObject({ matched: false, baseline: 'colony-daily-1.0', current: 'colony-daily-1.2' });
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
  let scrollDescriptor, scrollIntoView;
  beforeEach(() => {
    scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  });
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
  afterEach(() => {
    act(() => root.unmount()); host.remove(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
    if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
    else delete HTMLElement.prototype.scrollIntoView;
  });

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
    vi.useFakeTimers();
    await mount({ day: 8 });
    const open = host.querySelector('[data-beehive-open-thermo="true"]');
    expect(open).toBeTruthy();
    await act(async () => { open.click(); await Promise.resolve(); });
    await act(async () => { vi.runOnlyPendingTimers(); await Promise.resolve(); });
    expect(latest.beehive.discoveryLesson).toBe('thermo');
    expect(host.querySelectorAll('[data-beehive-thermoregulation="true"]').length).toBe(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
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

describe('phase 7 (candidate10): IPM meter, event quick-jump, RTS quick-build, and drone sweet-spot HUD', () => {
  let host, root, latest, cfg;
  beforeEach(() => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, motionPaused: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('renders aria-hidden before->after Varroa meters and recommends the best seasonal IPM option', async () => {
    // Day 100 is Winter (season === 3); with brood 500, oxalic acid dribble is ideal
    await mountState({ viewMode: 'beekeeper', day: 100, brood: 500, varroaLevel: 28, showTreatModal: true });
    const meter = host.querySelector('[data-treatment-id="oxalic"] [data-treatment-meter="oxalic"]');
    expect(meter).toBeTruthy();
    expect(meter.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelectorAll('[data-treatment-id] [role="meter"], [data-treatment-id] [role="progressbar"]').length).toBe(0);
    const oxalicBadge = host.querySelector('[data-treatment-id="oxalic"] [data-treatment-recommended="true"]');
    expect(oxalicBadge).toBeTruthy();
    expect(oxalicBadge.textContent).toContain('★ Best match now');
  });

  it('offers one-click Acknowledge & go to response on known events and focuses the matched control without spending AP', async () => {
    await mountState({
      viewMode: 'beekeeper',
      day: 14,
      actionPoints: 3,
      varroaLevel: 26,
      activeEvent: { id: 'varroa_spike', emoji: '🦟', label: 'Varroa Mite Surge', desc: 'Mites are surging.', effect: { varroaLevel: 20, morale: -10 }, lesson: 'Treat promptly.' }
    });
    const treatJump = host.querySelector('[data-event-respond="treat"]');
    const ackOnly = host.querySelector('[data-event-acknowledge="true"]');
    expect(treatJump).toBeTruthy();
    expect(ackOnly).toBeTruthy();
    const treatChoice = host.querySelector('[data-management-choice="varroa_treatment"]');
    treatChoice.scrollIntoView = vi.fn();

    await act(async () => { treatJump.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(latest.beehive.activeEvent).toBeNull();
    expect(latest.beehive.actionPoints).toBe(3); // never auto-spends AP
    expect(document.activeElement).toBe(treatChoice);
    expect(treatChoice.scrollIntoView).toHaveBeenCalled();

    // Unknown/fixture events omit the secondary jump button and acknowledge returns to #beehive-next-day
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(host);
    await mountState({
      viewMode: 'beekeeper',
      day: 16,
      actionPoints: 3,
      activeEvent: { id: 'storm', emoji: '⚠', label: 'Sudden storm', desc: 'Foragers return early.', effect: { morale: -4 }, lesson: 'Storm.' }
    });
    expect(host.querySelector('[data-event-respond]')).toBeNull();
    await act(async () => { host.querySelector('[data-event-acknowledge="true"]').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(document.activeElement).toBe(host.querySelector('#beehive-next-day'));
  });

  it('shows live resource pills and the zero-scroll Quick Build strip inside the Colony Network dock', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true, paused: true, speed: 1, day: 4, hiveHealth: 100, territory: 50,
        resources: { nectar: 80, pollen: 60, wax: 40, royalJelly: 20 },
        rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 }
      }
    });
    const dock = host.querySelector('[data-beehive-battlefield-dock="true"]');
    expect(dock).toBeTruthy();
    expect(dock.querySelectorAll('[data-dock-resource]').length).toBe(4);
    const strip = dock.querySelector('[data-quick-build-strip="true"]');
    expect(strip).toBeTruthy();
    const firstQuickBuild = strip.querySelector('[data-quick-build]');
    expect(firstQuickBuild).toBeTruthy();
    const stId = firstQuickBuild.getAttribute('data-quick-build');

    await act(async () => { firstQuickBuild.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.buildMode).toBe(stId);
    expect(strip.querySelector('[data-quick-build-cancel="true"]')).toBeTruthy();

    await act(async () => { strip.querySelector('[data-quick-build="' + stId + '"]').click(); await Promise.resolve(); });
    expect(latest.beehive.queen.buildMode).toBeNull();
  });

  it('displays live DCA altitude sweet-spot and thermal lift pills in Drone Flight controls', async () => {
    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', pacing: 'live', courseSeed: 20260904 }
    });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    await act(async () => { launch.click(); await Promise.resolve(); });

    const controls = host.querySelector('[data-beehive-touch-controls="true"]');
    expect(controls).toBeTruthy();
    expect(controls.previousElementSibling && controls.previousElementSibling.id).toBe('beehive-drone-playfield');
    expect(controls.querySelector('[data-flight-sweetspot-pill="true"]')).toBeTruthy();
    expect(controls.querySelector('[data-flight-alt-band-pill="true"]').textContent).toMatch(/DCA|ft/);
    expect(controls.querySelector('[data-flight-thermal-pill="true"]').textContent).toMatch(/Thermal|Updraft/);
  });
});

describe('phase 8 (candidate11): quest jump, RTS care & advisor actions, sub-lab presets, and replay click-scrub', () => {
  let host, root, latest, cfg;
  beforeEach(() => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, motionPaused: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('shows live quest progress and focuses the matching action control on click without spending AP', async () => {
    await mountState({
      viewMode: 'beekeeper',
      focusLayout: true,
      day: 4,
      workers: 12000,
      varroaLevel: 8,
      honey: 25,
      actionPoints: 3,
    });
    const questProg = host.querySelector('[data-quest-progress="true"]');
    expect(questProg).toBeTruthy();
    expect(questProg.textContent).toBe('12,000 / 20,000');

    const questJump = host.querySelector('[data-quest-jump]');
    expect(questJump).toBeTruthy();
    const targetBtn = host.querySelector(questJump.getAttribute('data-quest-jump'));
    expect(targetBtn).toBe(host.querySelector('[data-management-choice="feed_bees"]'));
    targetBtn.scrollIntoView = vi.fn();

    await act(async () => { questJump.click(); await Promise.resolve(); });
    expect(latest.beehive.actionPoints).toBe(3); // never auto-spends AP
    expect(document.activeElement).toBe(targetBtn);
    expect(targetBtn.scrollIntoView).toHaveBeenCalled();

    // Overview layout shows inline numeric badges for all season goals
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(host);
    await mountState({ viewMode: 'beekeeper', focusLayout: false, day: 4, workers: 12000, varroaLevel: 8, honey: 25 });
    const overviewBadges = host.querySelectorAll('[data-season-goal-progress="true"]');
    expect(overviewBadges.length).toBe(3);
    expect(overviewBadges[0].textContent).toBe('12,000 / 20,000');
  });

  it('provides zero-scroll Colony Care signals and one-click Strategic Advisor execution in Colony Network RTS', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true, paused: true, speed: 1, day: 4, hiveHealth: 100, territory: 50,
        resources: { nectar: 30, pollen: 20, wax: 15, royalJelly: 10 },
        rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 }
      }
    });
    const dock = host.querySelector('[data-beehive-battlefield-dock="true"]');
    expect(dock.querySelectorAll('[data-quick-command]').length).toBe(3);

    const careStrip = dock.querySelector('[data-quick-colony-strip="true"]');
    expect(careStrip).toBeTruthy();
    const careSignals = Array.from(careStrip.querySelectorAll('[data-quick-signal]'));
    expect(careSignals.map((btn) => btn.getAttribute('data-quick-signal'))).toEqual(['emit_qmp', 'nasonov_call', 'lay_workers', 'build_comb']);

    const advisorAct = host.querySelector('[data-strategic-advisor-act="scout_rival"]');
    expect(advisorAct).toBeTruthy();
    await act(async () => { advisorAct.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.rival.intel).toBeGreaterThan(0);

    const qmpSignal = careStrip.querySelector('[data-quick-signal="emit_qmp"]');
    expect(qmpSignal).toBeTruthy();
    await act(async () => { qmpSignal.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.lastImpact.title).toBe('Emit QMP');
  });

  it('adds Waggle time-of-day sun presets, visual cues, and Thermoregulation single-variable weather presets', async () => {
    await mountState({ viewMode: 'beekeeper', focusLayout: true, beeView: 'waggle', discoveryLesson: 'waggle' });
    const waggleLab = host.querySelector('[data-waggle-lab]');
    expect(waggleLab).toBeTruthy();
    expect(waggleLab.querySelector('[data-waggle-wave="true"]')).toBeTruthy();
    expect(waggleLab.querySelector('[data-waggle-sun-glyph="true"]')).toBeTruthy();
    expect(waggleLab.querySelectorAll('.bee-discovery-button').length).toBe(2);

    const noonPreset = waggleLab.querySelector('[data-waggle-sun-preset="180"]');
    expect(noonPreset).toBeTruthy();
    await act(async () => { noonPreset.click(); await Promise.resolve(); });
    expect(latest.beehive.waggleLab.sun).toBe(180);

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(host);
    await mountState({ viewMode: 'beekeeper', focusLayout: true, beeView: 'thermo', discoveryLesson: 'thermo' });
    const frostPreset = host.querySelector('[data-thermo-preset="0"]');
    expect(frostPreset).toBeTruthy();
    await act(async () => { frostPreset.click(); await Promise.resolve(); });
    expect(latest.beehive.thermHunt.outsideC).toBe(0);
    expect(latest.beehive.thermHunt.beesFanning).toBe(30);
    expect(latest.beehive.thermHunt.heaterBees).toBe(1200);
  });

  it('renders the DCA altitude band on the altitude replay lane and supports click-to-scrub', async () => {
    const telemetry = [
      { t: 0, altitude: 0, energy: 100, wind: 0, phase: 'launch', action: 'Launch', hazard: false },
      { t: 1, altitude: 35, energy: 92, wind: 0.6, phase: 'flight', action: 'Powered climb', hazard: false },
      { t: 4, altitude: 118, energy: 78, wind: 1.4, phase: 'flight', action: 'Powered climb', hazard: true },
      { t: 9, altitude: 110, energy: 70, wind: 2.0, phase: 'congregation', action: 'Coast', hazard: false },
      { t: 15, altitude: 96, energy: 64, wind: 0.8, phase: 'end', action: 'Coast', hazard: false }
    ];
    await mountState({
      viewMode: 'drone',
      drone: {
        active: false, difficulty: 'easy', pacing: 'steps', courseSeed: 20260908,
        lastRun: { pacing: 'steps', courseSeed: 20260908, difficulty: 'easy', success: true, reachedDca: true, maxAlt: 120, distance: 700, energyLeft: 64, telemetry }
      }
    });
    const toggle = host.querySelector('[data-drone-saved-review-toggle]');
    expect(toggle).toBeTruthy();
    await act(async () => { toggle.click(); await Promise.resolve(); });

    const altSvg = host.querySelector('svg[data-replay-chart="altitude"]');
    const energySvg = host.querySelector('svg[data-replay-chart="energy"]');
    const windSvg = host.querySelector('svg[data-replay-chart="wind"]');
    expect(altSvg).toBeTruthy();
    expect(altSvg.querySelector('rect[data-replay-dca-band="true"]')).toBeTruthy();
    expect(energySvg.querySelector('rect[data-replay-dca-band="true"]')).toBeNull();
    expect(windSvg.querySelector('rect[data-replay-dca-band="true"]')).toBeNull();

    altSvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 96, right: 640, bottom: 96, x: 0, y: 0, toJSON() {} });
    await act(async () => {
      altSvg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 380, clientY: 48 }));
      await Promise.resolve();
    });
    expect(latest.beehive.drone.replayIndex).toBe(3);
  });
});

describe('phase 9 (candidate12): guided inspector & varietal jar shelf, clickable brood bars, RTS clock dock, and DCA gate range pill', () => {
  let host, root, latest, cfg;
  beforeEach(() => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, motionPaused: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('steps through unexplored Hive Inspector layers with progress bar and renders varietal honey jar shelves', async () => {
    await mountState({
      viewMode: 'beekeeper',
      showInspect: true,
      inspectLayer: 'roles',
      layersViewed: ['roles'],
    });
    expect(host.querySelector('[data-inspector-progress-bar="true"]')).toBeTruthy();
    expect(host.querySelector('[data-inspector-progress-fill="11"]')).toBeTruthy();
    const nextBtn = host.querySelector('[data-inspector-next-unexplored="honey_chem"]');
    expect(nextBtn).toBeTruthy();

    await act(async () => { nextBtn.click(); await Promise.resolve(); });
    expect(latest.beehive.inspectLayer).toBe('honey_chem');
    expect(latest.beehive.layersViewed).toContain('honey_chem');
    expect(host.querySelector('[data-inspector-next-unexplored="lifecycle"]')).toBeTruthy();

    await mountState({
      viewMode: 'beekeeper',
      showInspect: false,
      focusLayout: false,
      totalHarvested: 14,
      varietals: {
        buckwheat: { name: 'Dark Buckwheat', emoji: '🌾', note: 'Rich', lbs: 14, jars: 11, firstDay: 185, lastDay: 185 }
      }
    });
    const shelf = host.querySelector('[data-varietal-jar-shelf="buckwheat"]');
    expect(shelf).toBeTruthy();
    expect(shelf.querySelectorAll('[data-varietal-jar]').length).toBe(8);
    expect(shelf.querySelector('[data-varietal-jar-overflow="3"]').textContent).toBe('+3');
  });

  it('selects Brood Emergence Calendar days directly by clicking chart bars without changing colony time', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const workers = Array(21).fill(0);
    const drones = Array(24).fill(0);
    workers[0] = 12; workers[3] = 100;
    drones[0] = 3; drones[3] = 12;
    await mountState({
      ...BH.bhCreateNewColonyState(777, 1),
      viewMode: 'beekeeper',
      beeView: 'lifecycle',
      showInspect: false,
      day: 60,
      workers: 20000,
      drones: 15,
      brood: 127,
      broodCohorts: { schemaVersion: 1, workers, drones },
    });

    const bar4 = host.querySelector('[data-brood-bar-offset="4"]');
    expect(bar4).toBeTruthy();
    const before = structuredClone(latest.beehive);

    await act(async () => { bar4.click(); await Promise.resolve(); });
    expect(host.querySelector('#bee-brood-calendar-day').value).toBe('4');
    expect(host.querySelector('[data-brood-reading-workers]').textContent).toBe('100');
    expect(host.querySelector('[data-brood-reading-drones]').textContent).toBe('12');
    expect(latest.beehive).toEqual(before);
  });

  it('steps +1 cycle while staying paused and toggles pause from the Colony Network quick dock', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true, paused: true, speed: 1, day: 4, hiveHealth: 100, territory: 50,
        resources: { nectar: 80, pollen: 60, wax: 40, royalJelly: 20 },
        rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 }
      }
    });

    const dock = host.querySelector('[data-beehive-battlefield-dock="true"]');
    expect(dock).toBeTruthy();
    expect(dock.querySelectorAll('[data-quick-command]').length).toBe(3);
    const clockGroup = dock.querySelector('[data-dock-clock-controls="true"]');
    expect(clockGroup).toBeTruthy();

    await act(async () => {
      clockGroup.querySelector('[data-dock-step-cycle="true"]').click();
      await Promise.resolve();
    });
    expect(latest.beehive.queen.day).toBe(5);
    expect(latest.beehive.queen.paused).toBe(true);
    expect(latest.beehive.queen.lastImpact.kind).toBe('cycle');

    await act(async () => {
      dock.querySelector('[data-dock-pause-toggle="true"]').click();
      await Promise.resolve();
    });
    expect(latest.beehive.queen.paused).toBe(false);
  });

  it('updates the Drone Flight live DCA gate range pill across en-route, over-DCA, and inside-gate states', async () => {
    let droneRafCb = null;
    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', pacing: 'live', courseSeed: 20260909 }
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { droneRafCb = cb; return 1; }));

    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    await act(async () => { launch.click(); await Promise.resolve(); });

    const dcaPill = host.querySelector('[data-flight-dca-range-pill="true"]');
    expect(dcaPill).toBeTruthy();
    expect(dcaPill.getAttribute('data-dca-gate-state')).toBe('info');
    expect(dcaPill.textContent).toContain('DCA gate:');
    expect(typeof droneRafCb).toBe('function');

    Object.assign(window.__testHooks.beehive.droneStateRef.current, { x: 0, z: -590, y: 60, paused: true, _nextInstrumentSync: 0 });
    await act(async () => { droneRafCb(1000); await Promise.resolve(); });
    expect(dcaPill.getAttribute('data-dca-gate-state')).toBe('warn');
    expect(dcaPill.textContent).toMatch(/Over DCA/);

    Object.assign(window.__testHooks.beehive.droneStateRef.current, { x: 0, z: -590, y: 115, paused: true, _nextInstrumentSync: 0 });
    await act(async () => { droneRafCb(2000); await Promise.resolve(); });
    expect(dcaPill.getAttribute('data-dca-gate-state')).toBe('good');
    expect(dcaPill.textContent).toMatch(/Inside DCA gate/);
  });
});

describe('phase 10 (candidate13): quiz answer review, guide quick chips & intervention priority spotlight, RTS doctrine scout, and replay reserve line', () => {
  let host, root, latest, cfg;
  beforeEach(() => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, motionPaused: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('shows a missed-first Bee Knowledge Quiz answer & explanation review on completion without mutating state schema', async () => {
    const questions = [
      { q: 'Which caste lays fertilized eggs?', opts: ['Worker', 'Queen'], ans: 1, explain: 'Only the mated queen lays fertilized diploid eggs.' },
      { q: 'What does propolis seal?', opts: ['Comb cracks', 'Flower anthers'], ans: 0, explain: 'Resin-rich propolis seals gaps and inhibits microbes.' }
    ];
    await mountState({
      viewMode: 'beekeeper', day: 5,
      quizOpen: true, quizComplete: false, quizIdx: 0, quizScore: 0, quizAnswered: 0, quizFeedback: null, quizQuestions: questions
    });

    await act(async () => { host.querySelector('[aria-label="Answer: Queen"]').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('[data-beehive-quiz-next="true"]').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('[aria-label="Answer: Flower anthers"]').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('[data-beehive-quiz-next="true"]').click(); await Promise.resolve(); });

    expect(latest.beehive.quizComplete).toBe(true);
    expect(latest.beehive.quizScore).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(latest.beehive, 'quizLog')).toBe(false);

    const list = host.querySelector('[data-quiz-review-list="true"]');
    expect(list).toBeTruthy();
    const items = Array.from(list.querySelectorAll('[data-quiz-review-item]'));
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('data-quiz-review-item')).toBe('missed');
    expect(items[0].textContent).toContain('Your answer: Flower anthers · Correct: Comb cracks');
    expect(items[0].textContent).toContain('Resin-rich propolis seals gaps');
    expect(items[1].getAttribute('data-quiz-review-item')).toBe('correct');
    expect(items[1].textContent).toContain('Correct: Queen');
  });

  it('provides Field Guide quick-search chips with clear search and highlights priority Beekeeper colony interventions', async () => {
    await mountState({
      viewMode: 'beekeeper', showGuide: true, guideQuery: '',
      actionPoints: 3, varroaLevel: 26, diseaseRisk: 0, honey: 40, inDearth: false
    });

    const chip = host.querySelector('[data-guide-quick-chip="varroa"]');
    expect(chip).toBeTruthy();
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { chip.click(); await Promise.resolve(); });
    expect(latest.beehive.guideQuery).toBe('Varroa');
    expect(host.querySelector('[data-beehive-guide-results="true"]')).toBeTruthy();
    const clearBtn = host.querySelector('[data-guide-search-clear="true"]');
    expect(clearBtn).toBeTruthy();
    await act(async () => { clearBtn.click(); await Promise.resolve(); });
    expect(latest.beehive.guideQuery).toBe('');
    expect(host.querySelector('[data-beehive-guide-results="true"]')).toBeNull();

    const treat = host.querySelector('[data-management-action="Treat"]');
    expect(treat.getAttribute('data-management-recommended')).toBe('true');
    expect(treat.querySelector('[data-management-status="varroa_treatment"]').textContent).toContain('★ Suggested');
    expect(host.querySelectorAll('[data-management-recommended="true"]').length).toBe(1);

    await mountState({
      viewMode: 'beekeeper', actionPoints: 2, varroaLevel: 5, diseaseRisk: 0, honey: 12, inDearth: true
    });
    const feed = host.querySelector('[data-management-action="Feed"]');
    expect(feed.getAttribute('data-management-recommended')).toBe('true');
    expect(feed.querySelector('[data-management-status="feed_bees"]').textContent).toContain('★ Suggested');
  });

  it('allows direct rival scouting from Competitor Intelligence and transitions to Refresh Intel', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true, paused: true, speed: 1, day: 4, hiveHealth: 100, territory: 50,
        resources: { nectar: 80, pollen: 60, wax: 40, royalJelly: 20 },
        rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 }
      }
    });

    const doctrineCard = host.querySelector('[data-rts-rival-doctrine="true"]');
    const scoutBtn = doctrineCard.querySelector('[data-rts-doctrine-scout="true"]');
    expect(scoutBtn).toBeTruthy();
    expect(scoutBtn.textContent).toContain('Scout Rival');

    await act(async () => { scoutBtn.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.rival.intel).toBeGreaterThan(0);
    expect(latest.beehive.queen.lastImpact.title).toBe('Scout Rival');

    const updatedBtn = host.querySelector('[data-rts-rival-doctrine="true"] [data-rts-doctrine-scout="true"]');
    if ((latest.beehive.queen.rival.intel || 0) < 85) {
      expect(updatedBtn).toBeTruthy();
      expect(updatedBtn.textContent).toContain('Refresh Intel');
    }
  });

  it('draws a 22% reserve warning line on the Energy replay chart only when percentage energy units are recorded', async () => {
    await mountState({
      viewMode: 'drone',
      drone: {
        active: false, paused: true,
        lastRun: {
          success: false, courseSeed: 2026, energyUnits: 'percent-of-difficulty-reserve',
          telemetry: [
            { t: 0, altitude: 20, energy: 80, wind: 1, phase: 'launch' },
            { t: 8, altitude: 110, energy: 14, wind: 2, phase: 'end' }
          ]
        }
      }
    });
    await act(async () => { host.querySelector('[data-drone-saved-review-toggle="true"]').click(); await Promise.resolve(); });
    expect(host.querySelector('svg[data-replay-chart="energy"] [data-replay-reserve-line="true"]')).toBeTruthy();

    await mountState({
      viewMode: 'drone',
      drone: {
        active: false, paused: true,
        lastRun: {
          success: false, courseSeed: 2026,
          telemetry: [
            { t: 0, altitude: 20, energy: 80, wind: 1, phase: 'launch' },
            { t: 8, altitude: 110, energy: 14, wind: 2, phase: 'end' }
          ]
        }
      }
    });
    expect(host.querySelector('svg[data-replay-chart="energy"] [data-replay-reserve-line="true"]')).toBeNull();
  });
});

describe('phase 11 (candidate14): worker balance presets, RTS brood queue shortcuts, drone spatial camera toggle & same-plan retry, conservation spotlight, and badge jumps', () => {
  let host, root, latest, cfg, rafQueue;
  beforeEach(() => {
    resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: (t) => ({ width: String(t).length * 6 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())), set: (t, p, v) => ((t[p] = v), true) }));
    rafQueue = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafQueue.push(cb); return rafQueue.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, motionPaused: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('offers one-click Worker Balance scenario presets that update flows, clear stale answers, and leave colony data untouched', async () => {
    await mountState({ viewMode: 'beekeeper', beeView: 'lifecycle', day: 45, honey: 22 });
    const snapshotBefore = structuredClone(latest.beehive);
    const lab = host.querySelector('[data-worker-balance-lab]');
    expect(lab).toBeTruthy();

    await act(async () => { lab.querySelector('[data-worker-balance-preset="growth"]').click(); await Promise.resolve(); });
    expect(lab.querySelector('[data-worker-balance-flow="arrivals"]').value).toBe('3');
    expect(lab.querySelector('[data-worker-balance-flow="losses"]').value).toBe('1');
    expect(lab.querySelector('[data-worker-balance-preset="growth"]').getAttribute('aria-pressed')).toBe('true');

    await act(async () => { lab.querySelector('input[value="increase"]').click(); await Promise.resolve(); });
    await act(async () => { lab.querySelector('[data-worker-balance-check]').click(); await Promise.resolve(); });
    expect(lab.querySelector('[data-worker-balance-equation]').textContent).toBe('100 + 40 − 5 = 135');

    await act(async () => { lab.querySelector('[data-worker-balance-preset="same"]').click(); await Promise.resolve(); });
    expect(lab.querySelector('[data-worker-balance-flow="arrivals"]').value).toBe('2');
    expect(lab.querySelector('[data-worker-balance-flow="losses"]').value).toBe('2');
    expect(lab.querySelector('[data-worker-balance-result]')).toBeNull();
    expect(latest.beehive).toEqual(snapshotBefore);
  });

  it('allows queuing worker and drone brood directly from the RTS Production Queue card', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true, paused: true, speed: 1, day: 5, hiveHealth: 100, territory: 50,
        resources: { nectar: 60, pollen: 40, wax: 20, royalJelly: 2 },
        rival: { name: 'Thistle Crown', health: 100, strength: 300, stores: 30, structures: 2, pressure: 10, intel: 0 }
      }
    });

    const queueCard = host.querySelector('[data-rts-production-queue="true"]');
    const workerBtn = queueCard.querySelector('[data-rts-queue-order="lay_workers"]');
    const droneBtn = queueCard.querySelector('[data-rts-queue-order="lay_drones"]');
    expect(workerBtn).toBeTruthy();
    expect(droneBtn).toBeTruthy();
    expect(workerBtn.getAttribute('data-command-ready')).toBe('true');

    await act(async () => { workerBtn.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.resources.royalJelly).toBe(1);
    expect(host.querySelector('[data-rts-production-queue="true"] [data-rts-production-order="workers"]')).toBeTruthy();
  });

  it('toggles 3D perspective camera from the Spatial Cue card and lets debrief retry the exact same route plan', async () => {
    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', routePlan: 'boost-first', pacing: 'steps' }
    });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    expect(launch).toBeTruthy();
    await act(async () => { launch.click(); await Promise.resolve(); await Promise.resolve(); });

    const camLabelBefore = host.querySelector('[data-flight-spatial-camera="true"]').textContent.toLowerCase();
    const camToggle = host.querySelector('[data-flight-spatial-camera-toggle="true"]');
    expect(camToggle).toBeTruthy();
    await act(async () => { camToggle.click(); await Promise.resolve(); });
    const camLabelAfter = host.querySelector('[data-flight-spatial-camera="true"]').textContent.toLowerCase();
    expect(camLabelAfter).not.toBe(camLabelBefore);

    const state = window.__testHooks.beehive.droneStateRef.current;
    state.phase = 'end';
    state.energy = 4;
    state.maxAlt = 68;
    state.distance = 420;
    state.reachedDca = false;
    state.obstacleHits = 1;
    state.trafficHits = 1;
    state.nectarCollected = 3;
    state.nectarGoal = 8;
    const rafCb = rafQueue.shift();
    expect(rafCb).toBeTypeOf('function');
    await act(async () => { rafCb(performance.now() + 16); await Promise.resolve(); await Promise.resolve(); });

    expect(host.querySelector('[data-drone-debrief-coach="energy-budget"]')).toBeTruthy();
    const samePlanBtn = host.querySelector('[data-flight-retry-same-plan="true"]');
    expect(samePlanBtn).toBeTruthy();
    await act(async () => { samePlanBtn.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(latest.beehive.drone.routePlan).toBe('boost-first');
    expect(latest.beehive.drone.active).toBe(true);
  });

  it('highlights the urgent Conservation priority action and wires one-click jumps from Next Badges', async () => {
    await mountState({
      viewMode: 'beekeeper',
      actionPoints: 3, pesticideExposure: 25, habitat: 45, layersViewed: ['roles'], showInspect: false
    });
    expect(host.querySelector('[data-conservation-impact="ban_pesticides"]').getAttribute('data-conservation-recommended')).toBe('true');
    expect(host.querySelector('[data-conservation-spotlight="ban_pesticides"]')).toBeTruthy();

    await mountState({
      viewMode: 'beekeeper',
      actionPoints: 2, pesticideExposure: 0, habitat: 45,
      layersViewed: ['roles', 'comb', 'brood', 'waggle', 'thermoregulation', 'foraging', 'mites', 'seasons'],
      showInspect: false
    });
    expect(host.querySelector('[data-conservation-impact="plant_wildflowers"]').getAttribute('data-conservation-recommended')).toBe('true');
    expect(host.querySelector('[data-conservation-spotlight="plant_wildflowers"]')).toBeTruthy();

    const inspectorJump = host.querySelector('[data-next-badge-jump="inspector"]');
    expect(inspectorJump).toBeTruthy();
    await act(async () => { inspectorJump.click(); await Promise.resolve(); });
    expect(latest.beehive.showInspect).toBe(true);
  });

  it('lets learners click Colony History chart points and table rows directly to inspect recorded days', async () => {
    const history = [
      { d: 1, w: 18000, h: 65, v: 2, m: 82 },
      { d: 2, w: 19500, h: 72, v: 4, m: 80 },
      { d: 4, w: 22000, h: 88, v: 6, m: 78 }
    ];
    await mountState({ viewMode: 'beekeeper', day: 4, actionPoints: 3, history });
    const snapshotBefore = structuredClone(latest.beehive);

    expect(host.querySelector('[data-history-selected]').textContent).toContain('Day 4');
    const guideInitial = host.querySelector('[data-history-selected-guide="true"]');
    expect(guideInitial).toBeTruthy();
    expect(guideInitial.getAttribute('data-day')).toBe('4');

    const pointDay1 = host.querySelector('[data-history-point][data-day="1"]');
    expect(pointDay1).toBeTruthy();
    await act(async () => {
      pointDay1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('[data-history-selected]').textContent).toContain('Day 1');
    expect(host.querySelector('[data-history-selected-guide="true"]').getAttribute('data-day')).toBe('1');

    const rowDay2 = host.querySelector('[data-history-row="2"]');
    expect(rowDay2).toBeTruthy();
    await act(async () => { rowDay2.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-history-selected]').textContent).toContain('Day 2');
    expect(latest.beehive).toEqual(snapshotBefore);
  });

  it('connects Bee Science quick reference cards directly to their matching interactive views', async () => {
    await mountState({ viewMode: 'beekeeper', beeView: 'scene', showInspect: false });
    const region = host.querySelector('[data-science-reference-cards="true"]');
    expect(region).toBeTruthy();

    const expectedViews = ['waggle', 'castes', 'honey', 'threats'];
    const buttons = expectedViews.map((id) => region.querySelector(`[data-science-card-open="${id}"]`));
    buttons.forEach((btn) => {
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('type')).toBe('button');
      expect(btn.className).toContain('min-h-[44px]');
    });

    await act(async () => { region.querySelector('[data-science-card-open="waggle"]').click(); await Promise.resolve(); });
    expect(latest.beehive.beeView).toBe('waggle');
    expect(latest.beehive.visitedBeeViews).toContain('waggle');
    expect(region.querySelector('[data-science-card-open="waggle"]').getAttribute('aria-pressed')).toBe('true');

    await act(async () => { region.querySelector('[data-science-card-open="threats"]').click(); await Promise.resolve(); });
    expect(latest.beehive.beeView).toBe('threats');
    expect(latest.beehive.visitedBeeViews).toContain('threats');
    expect(region.querySelector('[data-science-card-open="threats"]').getAttribute('aria-pressed')).toBe('true');
    expect(region.querySelector('[data-science-card-open="waggle"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('offers an in-place Resume flight button inside the paused Drone Route Inspector panel', async () => {
    await mountState({ viewMode: 'drone', drone: { active: false, difficulty: 'easy', pacing: 'live' } });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    expect(launch).toBeTruthy();
    await act(async () => { launch.click(); await Promise.resolve(); await Promise.resolve(); });

    const pauseBtn = host.querySelector('[data-beehive-flight-pause="true"]');
    expect(pauseBtn).toBeTruthy();
    await act(async () => { pauseBtn.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(true);

    const routePanel = host.querySelector('[data-flight-route-panel="true"]');
    expect(routePanel).toBeTruthy();
    await act(async () => { routePanel.querySelector('summary').click(); await Promise.resolve(); });
    expect(routePanel.open).toBe(true);

    const resumeInMap = routePanel.querySelector('[data-route-resume-flight="true"]');
    expect(resumeInMap).toBeTruthy();
    await act(async () => { resumeInMap.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(false);
    expect(routePanel.open).toBe(false);
  });

  it('steps through flower patches with Prev/Next buttons in the Colony Network 3D Patch Explorer without spending resources', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true, paused: true, speed: 1, day: 5, hiveHealth: 100, territory: 50,
        resources: { nectar: 60, pollen: 40, wax: 20, royalJelly: 2 },
        rival: { name: 'Thistle Crown', health: 100, strength: 300, stores: 30, structures: 2, pressure: 10, intel: 0 }
      }
    });
    const resourcesBefore = structuredClone(latest.beehive.queen.resources);
    const explorer = host.querySelector('[data-rts-patch-explorer]');
    expect(explorer).toBeTruthy();
    expect(explorer.getAttribute('data-rts-patch-explorer')).toBe('all');

    const prevBtn = host.querySelector('[data-rts-patch-step="prev"]');
    const nextBtn = host.querySelector('[data-rts-patch-step="next"]');
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();

    await act(async () => { nextBtn.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-rts-patch-explorer]').getAttribute('data-rts-patch-explorer')).toBe('patch_a');

    await act(async () => { nextBtn.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-rts-patch-explorer]').getAttribute('data-rts-patch-explorer')).toBe('patch_b');

    await act(async () => { prevBtn.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-rts-patch-explorer]').getAttribute('data-rts-patch-explorer')).toBe('patch_a');

    await act(async () => { prevBtn.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-rts-patch-explorer]').getAttribute('data-rts-patch-explorer')).toBe('patch_f');
    expect(latest.beehive.queen.resources).toEqual(resourcesBefore);
  });
});

describe('phase 13 (candidate16): simulation graphics and visual pedagogy enhancements', () => {
  let host, root, latest, cfg;
  let fillHistory, strokeHistory, rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    fillHistory = [];
    strokeHistory = [];
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => {
        if (p === 'fillStyle') fillHistory.push(v);
        if (p === 'strokeStyle') strokeHistory.push(v);
        t[p] = v;
        return true;
      },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxProxy);
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('renders live colony-driven SVG pedagogy schematics across Hive Inspector roles, honey chemistry, and thermoregulation tabs', async () => {
    await mountState({
      viewMode: 'beekeeper',
      motionPaused: true,
      showInspect: true,
      inspectLayer: 'roles',
      workers: 20000,
      honey: 24,
      syrup: 8,
      day: 45,
    });

    const rolesSvg = host.querySelector('[data-inspector-polyethism-svg="true"]');
    expect(rolesSvg).toBeTruthy();
    expect(rolesSvg.getAttribute('role')).toBe('img');
    expect(rolesSvg.getAttribute('aria-label')).toContain('nurses');
    expect(rolesSvg.textContent).toContain('Inner Brood Core');
    expect(rolesSvg.textContent).toContain('Open Meadow');

    const honeyTab = host.querySelector('[data-inspection-tab="honey_chem"]');
    expect(honeyTab).toBeTruthy();
    await act(async () => { honeyTab.click(); await Promise.resolve(); });
    const honeySvg = host.querySelector('[data-inspector-honey-svg="true"]');
    expect(honeySvg).toBeTruthy();
    expect(honeySvg.getAttribute('role')).toBe('img');
    expect(honeySvg.getAttribute('data-syrup-lbs')).toBe('8');
    expect(honeySvg.textContent).toContain('8 lb fed syrup');

    const thermoTab = host.querySelector('[data-inspection-tab="temperature"]');
    expect(thermoTab).toBeTruthy();
    await act(async () => { thermoTab.click(); await Promise.resolve(); });
    const summerThermo = host.querySelector('[data-inspector-thermo-svg="true"]');
    expect(summerThermo).toBeTruthy();
    expect(summerThermo.getAttribute('role')).toBe('img');
    expect(summerThermo.getAttribute('data-thermo-mode')).toBe('cooling');

    await mountState({
      viewMode: 'beekeeper',
      motionPaused: true,
      showInspect: true,
      inspectLayer: 'temperature',
      workers: 12000,
      day: 105,
    });
    const winterThermo = host.querySelector('[data-inspector-thermo-svg="true"]');
    expect(winterThermo).toBeTruthy();
    expect(winterThermo.getAttribute('data-thermo-mode')).toBe('cluster');
  });

  it('renders sky-aqua fed syrup comb/feeder visuals and summer entrance cooling streamlines on the 2D Beekeeper canvas', async () => {
    await mountState({
      viewMode: 'beekeeper',
      beeView: 'scene',
      motionPaused: false,
      day: 45,
      workers: 22000,
      honey: 18,
      syrup: 14,
      pollen: 6,
      brood: 5000,
    });
    expect(fillHistory).toContain('#38bdf8');
    expect(strokeHistory.some((s) => typeof s === 'string' && s.includes('rgba(186,230,253,'))).toBe(true);

    fillHistory.length = 0;
    strokeHistory.length = 0;
    await mountState({
      viewMode: 'beekeeper',
      beeView: 'scene',
      motionPaused: false,
      day: 105,
      workers: 12000,
      honey: 25,
      syrup: 0,
      pollen: 4,
      brood: 1200,
    });
    expect(fillHistory).not.toContain('#38bdf8');
    expect(strokeHistory.some((s) => typeof s === 'string' && s.includes('rgba(186,230,253,'))).toBe(false);
  });

  it('differentiates nurse, builder, guard, and forager spatial zones plus guard interception arcs on the 2D Colony Network canvas', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true,
        paused: true,
        speed: 1,
        day: 5,
        hiveHealth: 100,
        territory: 55,
        population: { nurses: 120, builders: 80, guards: 80, foragers: 120, scouts: 20 },
        threats: [{ id: 't1', type: 'hornet', label: 'Hornet', icon: '🐝', hp: 80, maxHp: 100, strength: 100 }],
        resources: { nectar: 80, pollen: 40, wax: 20, royalJelly: 10 },
      },
    });
    expect(rafCallbacks.length).toBeGreaterThan(0);
    await act(async () => {
      rafCallbacks.slice().forEach((cb) => cb());
      await Promise.resolve();
    });
    expect(fillHistory).toContain('#f472b6');
    expect(fillHistory).toContain('#fbbf24');
    expect(fillHistory).toContain('#fb7185');
    expect(fillHistory).toContain('#34d399');
    expect(strokeHistory).toContain('rgba(251,113,133,0.62)');
  });

  it('updates 3D Hive Interior entrance syrup feeder jar and returning forager pollen baskets without reallocating Three.js geometries', () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const feeder = model.meshes.entrance.getObjectByName('entrance-syrup-feeder');
    expect(feeder).toBeTruthy();

    model.frame(0, { season: 1, syrupFill: 0, pollenLevel: 0, traffic: 1 }, true);
    expect(feeder.visible).toBe(false);
    const carryingBees = model.meshes.foragers.children.filter((b) => Array.isArray(b.userData.pollenPellets));
    expect(carryingBees.length).toBeGreaterThan(0);
    expect(carryingBees[0].userData.pollenPellets[0].visible).toBe(false);

    model.frame(100, { season: 1, syrupFill: 0.7, pollenLevel: 0.85, traffic: 1 }, true);
    expect(feeder.visible).toBe(true);
    const liquidMesh = feeder.children[3];
    expect(liquidMesh.scale.y).toBeCloseTo(0.7);
    expect(carryingBees[0].userData.pollenPellets[0].visible).toBe(true);
    expect(carryingBees[0].userData.pollenPellets[0].scale.x).toBeGreaterThan(1.0);

    model.frame(200, { season: 3, syrupFill: 0.4, pollenLevel: 0.85, traffic: 1 }, true);
    expect(feeder.visible).toBe(true);
    expect(carryingBees[0].userData.pollenPellets[0].visible).toBe(false);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
  });
});

describe('phase 14 (candidate17): complete inspector SVG schematics, 3D physiology/smoker, and 2D dearth/nectar cues', () => {
  let host, root, latest, setBeehiveState, cfg;
  let fillHistory, strokeHistory, rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    fillHistory = [];
    strokeHistory = [];
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => {
        if (p === 'fillStyle') fillHistory.push(v);
        if (p === 'strokeStyle') strokeHistory.push(v);
        t[p] = v;
        return true;
      },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxProxy);
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('renders live colony-driven SVG schematics for lifecycle, waggle, pheromones, anatomy, and native Hive Inspector tabs', async () => {
    await mountState({
      viewMode: 'beekeeper',
      motionPaused: true,
      showInspect: true,
      inspectLayer: 'lifecycle',
      workers: 22000,
      brood: 6200,
      drones: 450,
      queenHealth: 88,
      pollen: 6,
      habitat: 82,
      gardenPollinators: 3,
      waggleLab: { dance: 75, sun: 0, fixedFood: true },
      bkAnim: { type: 'smoke', startedAt: Date.now(), duration: 5000 },
    });

    const lifeSvg = host.querySelector('[data-inspector-lifecycle-svg="true"]');
    expect(lifeSvg).toBeTruthy();
    expect(lifeSvg.getAttribute('role')).toBe('img');
    expect(lifeSvg.getAttribute('focusable')).toBe('false');
    expect(lifeSvg.getAttribute('data-brood-count')).toBe('6200');
    expect(lifeSvg.textContent).toContain('16d');
    expect(lifeSvg.textContent).toContain('21d');
    expect(lifeSvg.textContent).toContain('24d');
    expect(lifeSvg.textContent).toContain('6.2K');

    await act(async () => { host.querySelector('[data-inspection-tab="waggle"]').click(); await Promise.resolve(); });
    const waggleSvg = host.querySelector('[data-inspector-waggle-svg="true"]');
    expect(waggleSvg).toBeTruthy();
    expect(waggleSvg.getAttribute('role')).toBe('img');
    expect(waggleSvg.getAttribute('focusable')).toBe('false');
    expect(waggleSvg.getAttribute('data-waggle-angle')).toBe('75');
    expect(waggleSvg.textContent).toContain('θ = 75°');

    await act(async () => { host.querySelector('[data-inspection-tab="pheromones"]').click(); await Promise.resolve(); });
    const pherSvg = host.querySelector('[data-inspector-pheromones-svg="true"]');
    expect(pherSvg).toBeTruthy();
    expect(pherSvg.getAttribute('role')).toBe('img');
    expect(pherSvg.getAttribute('focusable')).toBe('false');
    expect(pherSvg.getAttribute('data-qmp-pct')).toBe('88');
    expect(pherSvg.getAttribute('data-alarm-pct')).toBe('8');
    expect(pherSvg.textContent).toContain('Calmed 💨');

    await act(async () => { host.querySelector('[data-inspection-tab="anatomy"]').click(); await Promise.resolve(); });
    const anatSvg = host.querySelector('[data-inspector-anatomy-svg="true"]');
    expect(anatSvg).toBeTruthy();
    expect(anatSvg.getAttribute('role')).toBe('img');
    expect(anatSvg.getAttribute('focusable')).toBe('false');
    expect(anatSvg.textContent).toContain('Corbicula (Pollen Basket)');
    expect(anatSvg.textContent).toContain('Honey Crop · 40mg');

    await act(async () => { host.querySelector('[data-inspection-tab="native"]').click(); await Promise.resolve(); });
    const nativeSvg = host.querySelector('[data-inspector-native-svg="true"]');
    expect(nativeSvg).toBeTruthy();
    expect(nativeSvg.getAttribute('role')).toBe('img');
    expect(nativeSvg.getAttribute('focusable')).toBe('false');
    expect(nativeSvg.getAttribute('data-habitat-score')).toBe('82');
    expect(nativeSvg.textContent).toContain('20,000+');
    expect(nativeSvg.textContent).toContain('Yard Habitat: 82%');
  });

  it('updates 3D winter-cluster thermal core, phoretic mites on bees, and raycast-safe smoker plume without reallocating geometries', () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const clusterCore = model.anchor.getObjectByName('winter-cluster-core');
    const smokePlume = model.anchor.getObjectByName('entrance-smoke-plume');
    expect(clusterCore).toBeTruthy();
    expect(smokePlume).toBeTruthy();
    for (const puff of smokePlume.children) {
      expect(model.picks).not.toContain(puff);
    }

    model.frame(0, { season: 3, varroa: 0.45, clusterWarmth: 0.85, smokeActive: false, traffic: 1 }, true);
    expect(clusterCore.material.color.getHex()).toBe(0xf97316);
    const warmScale = clusterCore.scale.x;
    expect(smokePlume.visible).toBe(false);

    model.frame(100, { season: 3, varroa: 0.45, clusterWarmth: 0.25, smokeActive: false, traffic: 1 }, true);
    expect(clusterCore.material.color.getHex()).toBe(0xef4444);
    expect(clusterCore.scale.x).toBeLessThan(warmScale);

    model.frame(200, { season: 1, varroa: 0.45, clusterWarmth: 0.9, smokeActive: true, traffic: 1 }, true);
    expect(smokePlume.visible).toBe(true);
    const miteHouseBees = [];
    model.meshes.brood_frames.traverse((o) => { if (o.userData && o.userData.phoreticMite) miteHouseBees.push(o); });
    const miteForagers = model.meshes.foragers.children.filter((b) => b.userData && b.userData.phoreticMite);
    expect(miteHouseBees.length).toBeGreaterThan(0);
    expect(miteHouseBees.some((b) => b.userData.phoreticMite.visible)).toBe(true);
    expect(miteForagers.some((b) => b.userData.phoreticMite.visible)).toBe(true);

    model.frame(300, { season: 1, varroa: 0, smokeActive: false, traffic: 1 }, true);
    expect(smokePlume.visible).toBe(false);
    expect(miteHouseBees.every((b) => !b.userData.phoreticMite.visible)).toBe(true);
    expect(miteForagers.every((b) => !b.userData.phoreticMite.visible)).toBe(true);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
  });

  it('draws nectar-flow richness rings during healthy bloom and robbing-defense interception arcs during summer dearth including paused redraws', async () => {
    await mountState({
      viewMode: 'beekeeper',
      beeView: 'scene',
      motionPaused: true,
      day: 45,
      workers: 22000,
      honey: 25,
      pollen: 6,
      brood: 5000,
      habitat: 75,
      gardenBonus: 10,
      inDearth: false,
    });
    expect(strokeHistory).toContain('rgba(253,224,71,0.46)');
    expect(fillHistory).toContain('#fef08a');
    expect(strokeHistory).not.toContain('rgba(251,113,133,0.68)');

    fillHistory.length = 0;
    strokeHistory.length = 0;
    const rafBefore = rafCallbacks.length;
    await act(async () => {
      setBeehiveState({ inDearth: true });
      await Promise.resolve();
    });
    expect(rafCallbacks.length).toBeGreaterThan(rafBefore);
    await act(async () => {
      rafCallbacks.slice(rafBefore).forEach((cb) => cb());
      await Promise.resolve();
    });
    expect(strokeHistory).toContain('rgba(251,113,133,0.68)');
    expect(strokeHistory).not.toContain('rgba(253,224,71,0.46)');
  });
});

describe('phase 15 (candidate18): shared-patch meadow genetics/guards, queen transition cues, outlook sparklines, preview click-scrub, and guide-to-science bridge', () => {
  let host, root, latest, setBeehiveState, cfg;
  let fillHistory, strokeHistory, rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    fillHistory = [];
    strokeHistory = [];
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => {
        if (p === 'fillStyle') fillHistory.push(v);
        if (p === 'strokeStyle') strokeHistory.push(v);
        t[p] = v;
        return true;
      },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxProxy);
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('shows inbound pollen baskets on Colony Network swarm bees and raycast-safe guard patrol around guard towers', () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const model = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });
    const combSlotsBefore = model.meshes.comb_works.children.length;
    const picksBefore = model.picks.length;
    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const guardPatrol = model.anchor.getObjectByName('home-guard-patrol');
    expect(guardPatrol).toBeTruthy();
    expect(model.meshes.comb_works.children.length).toBe(combSlotsBefore);
    for (const guard of guardPatrol.children) {
      expect(model.picks).not.toContain(guard);
    }

    model.frame(0, {
      season: 1,
      showGamePieces: true,
      structures: [{ id: 'g1', type: 'guard', x: 1, y: 1, level: 2 }],
      alarm: 0.4,
      forageRate: 1,
      homeHealth: 1,
      rivalHealth: 1,
    }, true);
    expect(guardPatrol.visible).toBe(true);
    expect(guardPatrol.children.some((g) => g.visible)).toBe(true);

    const swarmBees = model.meshes.swarm.children;
    expect(swarmBees[0].visible).toBe(true);
    expect(swarmBees[0].userData.pollenPellets.every((p) => !p.visible)).toBe(true);
    expect(swarmBees[6].visible).toBe(true);
    expect(swarmBees[6].userData.pollenPellets.every((p) => p.visible)).toBe(true);

    model.frame(100, {
      season: 3,
      showGamePieces: true,
      structures: [{ id: 'g1', type: 'guard', x: 1, y: 1, level: 2 }],
      alarm: 0.4,
      forageRate: 1,
      homeHealth: 1,
      rivalHealth: 1,
    }, true);
    expect(guardPatrol.visible).toBe(false);
    expect(swarmBees.every((b) => !b.visible)).toBe(true);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
    expect(model.picks.length).toBe(picksBefore);
  });

  it('switches 3D intro cage vs supersedure comb cells and redraws 2D queenTransition comb graphics on paused updates', async () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });
    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const introCage = model.anchor.getObjectByName('queen-intro-cage');
    const supCells = model.anchor.getObjectByName('supersedure-cells');
    expect(introCage).toBeTruthy();
    expect(supCells).toBeTruthy();

    model.frame(0, { season: 1, queenTransitionKind: 'requeen', layingRate: 0 }, true);
    expect(introCage.visible).toBe(true);
    expect(supCells.visible).toBe(false);
    expect(model.meshes.queen.visible).toBe(false);

    model.frame(100, { season: 1, queenTransitionKind: 'supersedure', layingRate: 0 }, true);
    expect(introCage.visible).toBe(false);
    expect(supCells.visible).toBe(true);
    expect(model.meshes.queen.visible).toBe(false);

    model.frame(200, { season: 1, queenTransitionKind: null, layingRate: 0.8 }, true);
    expect(introCage.visible).toBe(false);
    expect(supCells.visible).toBe(false);
    expect(model.meshes.queen.visible).toBe(true);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);

    await mountState({
      viewMode: 'beekeeper',
      beeView: 'scene',
      motionPaused: true,
      day: 24,
      workers: 21000,
      queenHealth: 0,
      queenTransition: { kind: 'requeen', daysRemaining: 3, pendingHealth: 100 },
    });
    expect(fillHistory).toContain('rgba(226,232,240,0.68)');
    expect(fillHistory).toContain('#92400e');
    expect(fillHistory).toContain('#f8fafc');
    expect(strokeHistory).toContain('#64748b');
    expect(strokeHistory).not.toContain('#78350f');

    fillHistory.length = 0;
    strokeHistory.length = 0;
    const rafBefore = rafCallbacks.length;
    await act(async () => {
      setBeehiveState({ queenTransition: { kind: 'supersedure', daysRemaining: 20, pendingHealth: 85 } });
      await Promise.resolve();
    });
    expect(rafCallbacks.length).toBeGreaterThan(rafBefore);
    await act(async () => {
      rafCallbacks.slice(rafBefore).forEach((cb) => cb());
      await Promise.resolve();
    });
    expect(fillHistory).toContain('#ca8a04');
    expect(strokeHistory).toContain('#78350f');
    expect(fillHistory).not.toContain('rgba(226,232,240,0.68)');
  });

  it('renders Colony Outlook metric sparklines with thresholds and supports click-to-inspect on the management timing chart', async () => {
    await mountState({
      viewMode: 'beekeeper',
      focusLayout: false,
      day: 12,
      actionPoints: 4,
      workers: 24000,
      honey: 45,
      varroaLevel: 12,
      diseaseRisk: 8,
    });

    for (const key of ['workers', 'honey', 'varroa', 'disease']) {
      const svg = host.querySelector(`[data-outlook-metric="${key}"] svg[data-outlook-sparkline="${key}"]`);
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelector('polyline')).toBeTruthy();
    }
    expect(host.querySelector('[data-outlook-metric="honey"] [data-outlook-threshold]')).toBeTruthy();
    expect(host.querySelector('[data-outlook-metric="varroa"] [data-outlook-threshold="20"]')).toBeTruthy();
    expect(host.querySelector('[data-outlook-metric="disease"] [data-outlook-threshold="35"]')).toBeTruthy();
    expect(host.querySelector('[data-outlook-metric="workers"] [data-outlook-threshold]')).toBeNull();

    const previewDetails = host.querySelector('[data-management-preview]');
    expect(previewDetails).toBeTruthy();
    await act(async () => {
      previewDetails.open = true;
      previewDetails.dispatchEvent(new Event('toggle'));
      await Promise.resolve();
    });

    const selectedTextBefore = host.querySelector('[data-preview-timeline-selected-day]').textContent;
    expect(selectedTextBefore).toContain('Day 13');
    const timingChart = host.querySelector('svg[data-management-preview-chart="true"]');
    expect(timingChart).toBeTruthy();
    timingChart.getBoundingClientRect = () => ({ left: 0, width: 600, top: 0, height: 240, right: 600, bottom: 240 });
    await act(async () => {
      timingChart.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 500, clientY: 120 }));
      await Promise.resolve();
    });
    const selectedTextAfter = host.querySelector('[data-preview-timeline-selected-day]').textContent;
    expect(selectedTextAfter).not.toBe(selectedTextBefore);
    expect(selectedTextAfter).toContain('of 7');
  });

  it('opens the linked interactive science diagram directly from the Field Guide panel and closes the guide modal', async () => {
    await mountState({
      viewMode: 'drone',
      beeView: 'scene',
      showGuide: true,
      guideSection: 'waggle',
    });

    const jumpBtn = host.querySelector('[data-guide-open-science-view="waggle"]');
    expect(jumpBtn).toBeTruthy();
    await act(async () => {
      jumpBtn.click();
      await Promise.resolve();
    });

    expect(latest.beehive.showGuide).toBe(false);
    expect(latest.beehive.viewMode).toBe('beekeeper');
    expect(latest.beehive.beeView).toBe('waggle');
    expect(latest.beehive.visitedBeeViews).toContain('waggle');
  });
});

describe('Beehive enhancement pass — phase 16 (candidate19)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;
  let rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    cfg = loadTool(TOOL, 'beehive');
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.THREE;
    delete window.AlloPostFXEnabled;
    delete window.__testHooks;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('adds downwind queen pheromone plume rings and standalone predator ground shadows to the Drone Flight 3D scene', async () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    let capturedScene = null;
    THREE.WebGLRenderer = function FakeWebGLRenderer(options) {
      this.domElement = options.canvas;
      this.shadowMap = { enabled: false, type: null };
      this.outputEncoding = 0;
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn((w, h) => { options.canvas.width = w; options.canvas.height = h; });
      this.setClearColor = vi.fn();
      this.render = vi.fn((scene) => { capturedScene = scene; });
      this.dispose = vi.fn();
    };
    window.THREE = THREE;
    window.AlloPostFXEnabled = false;
    window.__testHooks = {};
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve(THREE));

    await mountState({ viewMode: 'drone', drone: { active: false, difficulty: 'easy', pacing: 'steps' } });
    const launchBtn = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    expect(launchBtn).toBeTruthy();
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const initCb = rafCallbacks.shift();
    expect(typeof initCb).toBe('function');
    await act(async () => { initCb(performance.now() + 16); await Promise.resolve(); });
    expect(capturedScene).toBeTruthy();

    const plume = capturedScene.getObjectByName('drone-queen-pheromone-plume');
    expect(plume).toBeTruthy();
    expect(plume.children).toHaveLength(3);
    const queenBeacon = plume.parent;
    expect(queenBeacon.children[1].geometry.type).toBe('TorusGeometry');
    expect(queenBeacon.children[2]).toBe(plume);

    const birdGroup = capturedScene.getObjectByName('drone-bee-eater-0');
    const birdShadow = capturedScene.getObjectByName('drone-bird-shadow-0');
    expect(birdGroup).toBeTruthy();
    expect(birdShadow).toBeTruthy();
    expect(birdShadow.parent).toBe(capturedScene);
    expect(birdGroup.children.at(-1).geometry.type).toBe('TorusGeometry');

    const ds = window.__testHooks.beehive.droneStateRef.current;
    ds.phase = 'congregation';
    ds.reachedDca = true;
    ds.windNow = { x: 2.0, z: -1.0 };
    ds.nearQueens = [{ x: 10, y: 120, z: -610, caught: false }];
    ds.birds[0].x = 40;
    ds.birds[0].y = 45;
    ds.birds[0].z = -380;

    const frameCb = rafCallbacks.shift();
    expect(typeof frameCb).toBe('function');
    await act(async () => { frameCb(performance.now() + 16); await Promise.resolve(); });

    expect(queenBeacon.visible).toBe(true);
    expect(plume.children[0].position.x).toBeGreaterThan(0);
    expect(plume.children[0].position.z).toBeLessThan(0);
    expect(plume.children[2].position.x).toBeGreaterThan(plume.children[0].position.x);
    expect(birdShadow.visible).toBe(true);
    const lowScaleX = birdShadow.scale.x;
    const lowOpacity = birdShadow.material.opacity;

    ds.birds[0].y = 140;
    const frameCb2 = rafCallbacks.shift();
    if (typeof frameCb2 === 'function') {
      await act(async () => { frameCb2(performance.now() + 32); await Promise.resolve(); });
      expect(birdShadow.scale.x).toBeGreaterThan(lowScaleX);
      expect(birdShadow.material.opacity).toBeLessThan(lowOpacity);
    }
  });

  it('provides Pollination Lab ecological presets that update flags while preserving custom metadata and colony state', async () => {
    const custom = { pollen: true, contact: false, compatible: true, note: 'Field note', teacher: { keep: true } };
    await mountState({ viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', motionPaused: true, day: 60, honey: 42, pollinationLab: custom });

    const presets = host.querySelector('[data-pollination-presets="true"]');
    expect(presets).toBeTruthy();
    const buttons = Array.from(presets.querySelectorAll('[data-pollination-preset]'));
    expect(buttons.map((b) => b.dataset.pollinationPreset)).toEqual([
      'side_visit',
      'cross_pollination',
      'incompatible_pollen',
      'clean_visitor',
    ]);
    expect(presets.querySelector('[data-pollination-preset="side_visit"]').getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      presets.querySelector('[data-pollination-preset="cross_pollination"]').click();
      await Promise.resolve();
    });
    expect(latest.beehive.pollinationLab).toEqual({
      pollen: true,
      contact: true,
      compatible: true,
      note: 'Field note',
      teacher: { keep: true },
    });
    expect(host.querySelector('#bee-pollen-contact').checked).toBe(true);
    expect(host.querySelector('output[data-pollination-outcome]').dataset.pollinationOutcome).toBe('transfer');
    expect(latest.beehive.day).toBe(60);
    expect(latest.beehive.honey).toBe(42);

    await act(async () => {
      presets.querySelector('[data-pollination-preset="incompatible_pollen"]').click();
      await Promise.resolve();
    });
    expect(latest.beehive.pollinationLab).toMatchObject({ pollen: true, contact: true, compatible: false });
    expect(host.querySelector('output[data-pollination-outcome]').textContent).toContain('transfer still occurred');

    await act(async () => {
      presets.querySelector('[data-pollination-preset="clean_visitor"]').click();
      await Promise.resolve();
    });
    expect(latest.beehive.pollinationLab).toMatchObject({ pollen: false, contact: true, compatible: true });
    expect(host.querySelector('output[data-pollination-outcome]').dataset.pollinationOutcome).toBe('no-transfer');
  });

  it('renders an interactive daily food-pathway SVG in Honey Lab synced with the pathway controls', async () => {
    await mountState({
      viewMode: 'beekeeper',
      day: 17,
      honey: 31,
      honeyInvestigation: { version: 'honey-stores-1', active: true, step: 1 },
    });

    const pathway = host.querySelector('svg[data-honey-pathway-svg="true"]');
    expect(pathway).toBeTruthy();
    expect(pathway.getAttribute('aria-hidden')).toBe('true');
    expect(pathway.dataset.pathwayActive).toBe('stores');
    const nodes = Array.from(pathway.querySelectorAll('[data-honey-pathway-node]'));
    expect(nodes.map((n) => n.dataset.honeyPathwayNode)).toEqual(['forage', 'consumption', 'stores']);

    await act(async () => {
      pathway.querySelector('[data-honey-pathway-node="consumption"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.honeyInvestigation.selectedCause).toBe('consumption');
    expect(host.querySelector('svg[data-honey-pathway-svg="true"]').dataset.pathwayActive).toBe('consumption');
    expect(host.querySelector('#bee-honey-cause').textContent).toContain('Compare consumption with incoming food');

    const forageBtn = Array.from(host.querySelectorAll('.bhh-cause-controls button')).find((b) => b.textContent.includes('Forage'));
    await act(async () => { forageBtn.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-honey-pathway-node="forage"]').dataset.selected).toBe('true');
  });

  it('lets learners click top-view brood slots and the close-up orientation map directly inside the Hive Interior panel', async () => {
    await mountState({
      viewMode: 'beekeeper',
      day: 15,
      workers: 24000,
      honey: 40,
      pollen: 12,
      brood: 6000,
      queenHealth: 90,
      hive3dFrame: 0,
    });

    const openBtn = host.querySelector('[data-hive-interior-open]');
    expect(openBtn).toBeTruthy();
    await act(async () => { openBtn.click(); await Promise.resolve(); });

    const slot4 = host.querySelector('[data-interior-slot="4"]');
    expect(slot4).toBeTruthy();
    await act(async () => { slot4.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(latest.beehive.hive3dFrame).toBe(4);
    expect(host.querySelector('[data-interior-frame="4"]').getAttribute('aria-pressed')).toBe('true');

    const lensToggle = host.querySelector('[data-interior-lens-toggle]');
    expect(lensToggle).toBeTruthy();
    await act(async () => { lensToggle.click(); await Promise.resolve(); });

    const mapSvg = host.querySelector('svg[data-lens-map-diagram="true"]');
    expect(mapSvg).toBeTruthy();
    mapSvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 650, height: 345, right: 650, bottom: 345 });
    // Target row = 8 (svgY = 47 + 22*8 = 223 => clientY = 233), col = 14 (svgX = 43 + 25*14 = 393 => clientX = 413).
    await act(async () => {
      mapSvg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 413, clientY: 233 }));
      await Promise.resolve();
    });

    expect(host.querySelector('[data-interior-lens-row]').value).toBe('8');
    expect(host.querySelector('[data-interior-lens-column]').value).toBe('14');
    expect(mapSvg.querySelector('[data-lens-map-position]').getAttribute('cx')).toBe('393');
    expect(mapSvg.querySelector('[data-lens-map-position]').getAttribute('cy')).toBe('223');
    expect(latest.beehive.honey).toBe(40);
    expect(latest.beehive.brood).toBe(6000);
  });
});

describe('Beehive enhancement pass — phase 17 (candidate20)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;
  let fillHistory;
  let strokeHistory;
  let rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    fillHistory = [];
    strokeHistory = [];
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => {
        if (p === 'fillStyle') fillHistory.push(v);
        if (p === 'strokeStyle') strokeHistory.push(v);
        t[p] = v;
        return true;
      },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.THREE;
    delete window.AlloPostFXEnabled;
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('renders the Drone Flight artificial horizon SVG and synchronizes its world transform on rAF HUD updates', async () => {
    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', pacing: 'steps', courseSeed: 20260904 },
    });

    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
    });

    const horizonSvg = host.querySelector('[data-flight-attitude-cue="true"] svg[data-flight-horizon-svg="true"]');
    expect(horizonSvg).toBeTruthy();
    expect(horizonSvg.getAttribute('aria-hidden')).toBe('true');
    const horizonWorld = horizonSvg.querySelector('[data-flight-horizon-world="true"]');
    expect(horizonWorld).toBeTruthy();

    const ds = window.__testHooks.beehive && window.__testHooks.beehive.droneStateRef && window.__testHooks.beehive.droneStateRef.current;
    expect(ds).toBeTruthy();
    ds.paused = true;
    ds.pitch = 10 * Math.PI / 180;
    ds.roll = -15 * Math.PI / 180;
    ds._nextInstrumentSync = 0;

    expect(rafCallbacks.length).toBeGreaterThan(0);
    await act(async () => {
      rafCallbacks[rafCallbacks.length - 1](5000);
      await Promise.resolve();
    });

    expect(horizonSvg.getAttribute('data-pitch-deg')).toBe('10');
    expect(horizonSvg.getAttribute('data-bank-deg')).toBe('-15');
    expect(horizonWorld.getAttribute('transform')).toBe('translate(60 38) rotate(15) translate(0 5.5)');
  });

  it('draws Colony Network 2D rival raid-staging, expand construction ring, and winter starving cluster graphics', async () => {
    const baseQueen = {
      active: true,
      paused: true,
      speed: 1,
      day: 5,
      hiveHealth: 100,
      territory: 55,
      population: { nurses: 120, builders: 80, guards: 80, foragers: 120, scouts: 20 },
      resources: { nectar: 80, pollen: 40, wax: 20, royalJelly: 10 },
    };

    await mountState({
      viewMode: 'queen',
      queen: {
        ...baseQueen,
        rival: { health: 90, pressure: 68, intel: 40, posture: 'assault', structures: 4 },
      },
    });
    expect(rafCallbacks.length).toBeGreaterThan(0);
    await act(async () => {
      rafCallbacks.slice().forEach((cb) => cb());
      await Promise.resolve();
    });
    expect(strokeHistory).toContain('rgba(244,63,94,0.88)');
    expect(fillHistory).toContain('#fda4af');

    fillHistory.length = 0;
    strokeHistory.length = 0;
    await act(async () => {
      setBeehiveState({
        queen: {
          ...baseQueen,
          rival: { health: 90, pressure: 20, intel: 25, posture: 'expand', structures: 4 },
        },
      });
      await Promise.resolve();
    });
    await act(async () => {
      rafCallbacks[rafCallbacks.length - 1]();
      await Promise.resolve();
    });
    expect(strokeHistory).toContain('rgba(250,204,21,0.78)');

    fillHistory.length = 0;
    strokeHistory.length = 0;
    await act(async () => {
      setBeehiveState({
        queen: {
          ...baseQueen,
          day: 32,
          rival: { health: 70, pressure: 10, intel: 20, posture: 'cluster', stores: 0, structures: 3 },
        },
      });
      await Promise.resolve();
    });
    await act(async () => {
      rafCallbacks[rafCallbacks.length - 1]();
      await Promise.resolve();
    });
    expect(fillHistory).toContain('#cbd5e1');
    expect(fillHistory).toContain('#bae6fd');
  });

  it('adds Fair-Test Experiment Compare paired and diverging bars plus predicted-metric spotlight without altering cell text', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const runA = { ...BH.bhCreateNewColonyState(100, 1, 0), day: 12, honey: 20 };
    const baseline = BH.bhCreateExperimentSnapshot(runA);
    const runB = {
      ...BH.bhCreateNewColonyState(100, 2, 0),
      day: 12,
      honey: 26,
      managementTrail: [{ day: 4, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP', summary: 'Native forage planted.' }],
    };
    const notebookPlan = {
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: 'Does forage change honey stores?',
      hypothesis: 'More forage increases stores.',
      changedVariable: 'Plant wildflowers once',
      prediction: 'Run B honey will be higher.',
    };
    const registeredPlan = BH.bhCreateExperimentPlanRegistration(notebookPlan, runB.experimentRunSerial, baseline.runSerial);

    await mountState({
      ...runB,
      viewMode: 'beekeeper',
      gradeBand: '6–8',
      motionPaused: true,
      experimentBaseline: baseline,
      notebook: { experiment: { ...notebookPlan, registeredPlan } },
    });

    const table = host.querySelector('table[data-experiment-compare-table="true"]');
    expect(table).toBeTruthy();
    const honeyRow = table.querySelector('tr[data-experiment-metric="honey"][data-predicted-metric="true"]');
    expect(honeyRow).toBeTruthy();
    expect(honeyRow.querySelector('th[scope="row"] [data-experiment-predicted-badge="true"]').textContent).toBe('Predicted');
    expect(honeyRow.querySelector('[data-experiment-bar="baseline"]')).toBeTruthy();
    expect(honeyRow.querySelector('[data-experiment-bar="current"]')).toBeTruthy();
    expect(honeyRow.querySelector('[data-experiment-delta-bar="positive"]')).toBeTruthy();
    expect(Array.from(honeyRow.querySelectorAll('td'), (td) => td.textContent)).toEqual(['20 lb', '26 lb', '+6 lb']);
  });

  it('masks the Worker Balance stock-and-flow schematic pre-check and lets learners click Brood Calendar table rows without mutating state', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const baseState = BH.bhCreateNewColonyState(100, 1, 0);
    await mountState({
      ...baseState,
      viewMode: 'beekeeper',
      beeView: 'lifecycle',
      motionPaused: true,
      day: 10,
      workers: 12000,
      honey: 35,
    });

    const balanceDisclosure = host.querySelector('[data-worker-balance-lab] details[data-worker-balance-open="true"]');
    if (balanceDisclosure) balanceDisclosure.open = true;
    const schematic = host.querySelector('svg[data-worker-balance-schematic="true"]');
    expect(schematic).toBeTruthy();
    expect(schematic.getAttribute('aria-hidden')).toBe('true');
    expect(schematic.getAttribute('data-schematic-reviewed')).toBe('false');
    expect(schematic.querySelector('[data-flow-node="after"]').getAttribute('data-flow-after')).toBe('?');
    expect(schematic.textContent).toContain('After step: ? adults');

    const radio = host.querySelector('[data-worker-balance-lab] input[type="radio"]');
    const checkBtn = host.querySelector('[data-worker-balance-lab] button[data-worker-balance-check="true"]');
    expect(radio).toBeTruthy();
    expect(checkBtn).toBeTruthy();
    await act(async () => {
      radio.click();
      await Promise.resolve();
    });
    await act(async () => {
      host.querySelector('[data-worker-balance-lab] button[data-worker-balance-check="true"]').click();
      await Promise.resolve();
    });

    const reviewedSchematic = host.querySelector('svg[data-worker-balance-schematic="true"]');
    expect(reviewedSchematic.getAttribute('data-schematic-reviewed')).toBe('true');
    const revealedAfter = reviewedSchematic.querySelector('[data-flow-node="after"]').getAttribute('data-flow-after');
    expect(revealedAfter).toMatch(/^\d+$/);

    const broodDetails = host.querySelector('[data-beehive-brood-calendar] details[data-brood-calendar-table="true"]');
    if (broodDetails) broodDetails.open = true;
    const row5 = host.querySelector('[data-beehive-brood-calendar] tr[data-brood-table-row="5"]');
    expect(row5).toBeTruthy();
    const row5WorkersText = row5.querySelector('[data-brood-table-count="workers"]').textContent;
    await act(async () => {
      row5.click();
      await Promise.resolve();
    });

    expect(host.querySelector('[data-beehive-brood-calendar] tr[data-brood-table-row="5"]').getAttribute('data-selected')).toBe('true');
    expect(host.querySelector('[data-brood-reading-workers]').textContent).toBe(row5WorkersText);
    expect(latest.beehive.workers).toBe(12000);
  });

  it('renders Colony Collapse post-mortem trajectory strip and supports direct Position-Study frame-heading clicks without SVG clicks mutating state', async () => {
    await mountState({
      viewMode: 'beekeeper',
      colonySurvived: false,
      day: 45,
      workers: 320,
      honey: 4,
      varroaLevel: 62,
      history: [
        { d: 10, w: 9500, h: 38, v: 8, m: 82 },
        { d: 25, w: 4200, h: 18, v: 34, m: 54 },
        { d: 45, w: 300, h: 5, v: 60, m: 20 },
        { d: 45, w: 320, h: 4, v: 62, m: 18 },
      ],
    });

    const trajectory = host.querySelector('#beehive-collapse-report [data-collapse-trajectory="true"]');
    expect(trajectory).toBeTruthy();
    const trajectorySvg = trajectory.querySelector('svg[data-collapse-trajectory-svg="true"]');
    expect(trajectorySvg).toBeTruthy();
    expect(trajectorySvg.getAttribute('aria-hidden')).toBe('true');
    expect(trajectorySvg.querySelector('line[data-collapse-threshold="true"]').getAttribute('y1')).toBe('68.4');
    for (const seriesId of ['workers', 'food', 'mites']) {
      expect(trajectorySvg.querySelector(`polyline[data-collapse-series="${seriesId}"]`)).toBeTruthy();
    }
    const summaryText = trajectory.querySelector('[data-collapse-trajectory-summary="true"]').textContent;
    expect(summaryText).toContain('Day 10 to Day 45');
    expect(summaryText).toContain('320');

    act(() => root.unmount());
    host.innerHTML = '';
    root = ReactDOMClient.createRoot(host);
    const livingColony = window.__RR_TEST_EXPORTS__.beehive.bhCreateNewColonyState(100, 1, 0);
    await mountState({
      ...livingColony,
      viewMode: 'beekeeper',
      show3dHive: true,
      hive3dFrame: 0,
      motionPaused: true,
      day: 15,
      workers: 14000,
      honey: 40,
    });

    const studyDisclosure = host.querySelector('[data-interior-position-study-disclosure="true"]');
    expect(studyDisclosure).toBeTruthy();
    await act(async () => {
      studyDisclosure.open = true;
      studyDisclosure.dispatchEvent(new Event('toggle'));
      await Promise.resolve();
    });

    const diagramTarget = host.querySelector('[data-position-study-diagram="2"] [data-position-study-cell]') || host.querySelector('svg[data-position-study-diagram="2"]');
    expect(diagramTarget).toBeTruthy();
    await act(async () => {
      diagramTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.hive3dFrame).toBe(0);

    const heading = host.querySelector('[data-position-study-heading="2"]');
    expect(heading).toBeTruthy();
    await act(async () => {
      heading.click();
      await Promise.resolve();
    });
    expect(latest.beehive.hive3dFrame).toBe(2);
    expect(host.querySelector('[data-position-study-frame="2"]').getAttribute('data-selected')).toBe('true');
  });
});

describe('Beehive enhancement pass — phase 18 (candidate21)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('adds raycast-safe 3D winter cluster glow and rival raid staging cues to the forage meadow without geometry allocations', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const m = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });
    const beforeGeos = new Set();
    m.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const cluster = m.anchor.getObjectByName('winter-cluster-glow');
    const homeGlow = m.anchor.getObjectByName('winter-glow-home');
    const rivalGlow = m.anchor.getObjectByName('winter-glow-rival');
    const staging = m.anchor.getObjectByName('rival-raid-staging');
    const raidRing = m.anchor.getObjectByName('raid-staging-ring');
    const chevrons = [0, 1, 2].map((i) => m.anchor.getObjectByName('raid-chevron-' + i));

    expect(cluster).toBeTruthy();
    expect(staging).toBeTruthy();
    expect(m.picks).not.toContain(homeGlow);
    expect(m.picks).not.toContain(raidRing);
    const bodySizeBefore = new THREE.Box3().setFromObject(m.meshes.home_hive.userData.body).getSize(new THREE.Vector3());

    m.frame(0, { season: 0, homeHealth: 0.2, rivalHealth: 0.2, raidPressure: 0.9, showGamePieces: false }, true);
    expect(cluster.visible).toBe(false);
    expect(staging.visible).toBe(false);

    m.frame(100, { season: 3, homeHealth: 0.2, rivalHealth: 0.9, raidPressure: 0.9, showGamePieces: false }, true);
    expect(cluster.visible).toBe(true);
    expect(staging.visible).toBe(false);
    const weakHomeOp = homeGlow.material.opacity;
    const weakHomeScale = homeGlow.scale.x;

    m.frame(200, { season: 3, homeHealth: 1, rivalHealth: 0.3, raidPressure: 0.85, showGamePieces: true }, true);
    expect(cluster.visible).toBe(true);
    expect(homeGlow.material.opacity).toBeGreaterThan(weakHomeOp);
    expect(homeGlow.scale.x).toBeGreaterThan(weakHomeScale);
    expect(staging.visible).toBe(true);
    expect(chevrons.every((c) => c.visible)).toBe(true);
    expect(chevrons[2].position.x).toBeLessThan(chevrons[0].position.x);

    const staticSnap = [homeGlow.material.opacity, raidRing.scale.x, chevrons[1].position.x];
    m.frame(5000, { season: 3, homeHealth: 1, rivalHealth: 0.3, raidPressure: 0.85, showGamePieces: true }, true);
    expect([homeGlow.material.opacity, raidRing.scale.x, chevrons[1].position.x]).toEqual(staticSnap);

    const afterGeos = new Set();
    m.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
    expect(new THREE.Box3().setFromObject(m.meshes.home_hive.userData.body).getSize(new THREE.Vector3()).equals(bodySizeBefore)).toBe(true);

    const mats = new Set();
    m.anchor.traverse((o) => {
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => mats.add(mat));
      if (o.isInstancedMesh && o.dispose) o.dispose();
    });
    afterGeos.forEach((g) => g.dispose());
    mats.forEach((mat) => mat.dispose());
  });

  it('renders the stacked food-origin partition SVG in Colony Food Balance across surplus thresholds', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper',
      focusLayout: true,
      beeView: 'pollination',
      day: 60,
      honey: 90,
      syrup: 40,
      actionPoints: 3,
    });

    expect(host.querySelectorAll('[data-colony-food-origins] > dl > div')).toHaveLength(4);
    const svg = host.querySelector('svg[data-food-partition-svg="true"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(Number(svg.querySelector('[data-food-segment="syrup"]').getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(svg.querySelector('[data-food-segment="nectar-reserve"]').getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(svg.querySelector('[data-food-segment="nectar-surplus"]').getAttribute('width'))).toBe(0);
    expect(Number(svg.querySelector('[data-food-reserve-line="true"]').getAttribute('x1'))).toBeCloseTo(236, 0);

    await act(async () => {
      setBeehiveState({ honey: 115, syrup: 40 });
      await Promise.resolve();
    });

    const surplusW = Number(host.querySelector('[data-food-segment="nectar-surplus"]').getAttribute('width'));
    expect(surplusW).toBeGreaterThan(40);
  });

  it('renders paired before-and-after magnitude bars on available Saved Observation comparison cards and omits them for missing endpoints', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    let state = {
      ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper',
      notebookOpen: true,
      focusLayout: true,
      day: 12,
      history: [
        { d: 6, w: 12000, h: 40, v: 4, m: 80 },
        { d: 12, w: 18000, h: 30, v: 25 },
      ],
    };
    state = BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, 6)).state;
    state = BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, 12)).state;

    await mountState(state);

    const workersBars = host.querySelector('[data-observation-metric="workers"] [data-observation-bars="true"]');
    expect(workersBars).toBeTruthy();
    expect(workersBars.getAttribute('aria-hidden')).toBe('true');
    expect(workersBars.querySelector('[data-observation-bar="before"]').style.width).toBe('66.7%');
    expect(workersBars.querySelector('[data-observation-bar="after"]').style.width).toBe('100%');

    const mitesBars = host.querySelector('[data-observation-metric="mites"] [data-observation-bars="true"]');
    expect(mitesBars.querySelector('[data-observation-bar="before"]').style.width).toBe('4%');
    expect(mitesBars.querySelector('[data-observation-bar="after"]').style.width).toBe('25%');

    expect(host.querySelector('[data-observation-metric="stability"] [data-observation-bars="true"]')).toBeNull();
  });

  it('renders the live hive heat-flow mechanism SVG below the temperature ruler and updates reactively without mutating colony state', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper',
      beeView: 'thermo',
      discoveryLesson: 'thermo',
      day: 22,
      workers: 15000,
      thermHunt: { outsideC: 0, heaterBees: 2500, beesFanning: 0 },
    });

    const lab = host.querySelector('[data-beehive-thermoregulation="true"]');
    expect(lab).toBeTruthy();
    const firstSvg = lab.querySelector('svg');
    expect(firstSvg.closest('.bee-thermo-scale')).toBeTruthy();
    const mechSvg = lab.querySelector('svg[data-thermo-mechanism-svg="true"]');
    expect(mechSvg).toBeTruthy();
    expect(mechSvg.getAttribute('aria-hidden')).toBe('true');
    expect(mechSvg.querySelector('[data-thermo-weather]').getAttribute('data-thermo-weather')).toBe('cold');
    expect(mechSvg.querySelector('[data-thermo-fanners]').getAttribute('data-thermo-fanners')).toBe('0');
    expect(Number(mechSvg.querySelector('[data-thermo-heaters]').getAttribute('data-thermo-heaters'))).toBeGreaterThan(0);

    const heatPreset = lab.querySelector('[data-thermo-preset="38"]');
    await act(async () => {
      heatPreset.click();
      await Promise.resolve();
    });
    const fanSlider = lab.querySelector('#th-beesFanning');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(fanSlider, '350');
      fanSlider.dispatchEvent(new Event('input', { bubbles: true }));
      fanSlider.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mechSvg.querySelector('[data-thermo-weather]').getAttribute('data-thermo-weather')).toBe('hot');
    expect(mechSvg.querySelector('[data-thermo-fanners]').getAttribute('data-thermo-fanners')).toBe('4');
    expect(mechSvg.querySelectorAll('[data-thermo-airflow-arrow]')).toHaveLength(4);
    expect(latest.beehive.day).toBe(22);
    expect(latest.beehive.workers).toBe(15000);
  });

  it('renders the 4-season colony arc SVG and proportional checklist bars in #beehive-year-report when in-year history exists', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper',
      day: 120,
      colonySurvived: true,
      workers: 18000,
      honey: 55,
      varroaLevel: 12,
      history: [
        { d: 15, w: 9000, h: 22, v: 4, m: 78 },
        { d: 55, w: 28000, h: 48, v: 9, m: 88 },
        { d: 95, w: 21000, h: 64, v: 15, m: 82 },
        { d: 120, w: 18000, h: 55, v: 12, m: 84 },
      ],
    });

    const report = host.querySelector('#beehive-year-report');
    expect(report).toBeTruthy();
    const arc = report.querySelector('div[data-year-trajectory="true"]');
    expect(arc).toBeTruthy();
    const arcSvg = arc.querySelector('svg[data-year-trajectory-svg="true"]');
    expect(arcSvg).toBeTruthy();
    expect(arcSvg.getAttribute('aria-hidden')).toBe('true');
    expect(arcSvg.querySelectorAll('[data-year-season-band]')).toHaveLength(4);
    for (const id of ['workers', 'food', 'mites']) {
      expect(arcSvg.querySelector(`polyline[data-year-series="${id}"]`)).toBeTruthy();
    }
    expect(arc.querySelector('[data-year-trajectory-summary="true"]').textContent).toContain('Day 15 to Day 120');
    expect(report.querySelectorAll('[data-year-score-bar="true"]')).toHaveLength(8);
    expect(report.querySelectorAll('[data-year-score-fill="true"]')).toHaveLength(8);

    await act(async () => {
      setBeehiveState({ history: [{ d: 120, w: 18000, h: 55, v: 12 }] });
      await Promise.resolve();
    });
    expect(host.querySelector('#beehive-year-report [data-year-trajectory="true"]')).toBeNull();
  });
});

describe('Beehive enhancement pass — phase 19 (candidate22)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;
  let rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('adds raycast-safe 3D winter wrap + mouse guard and warm-season crowding beard to hive3dBuildScene without geometry allocations', () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const wrap = model.anchor.getObjectByName('winter-insulation-wrap');
    const guard = model.anchor.getObjectByName('entrance-mouse-guard');
    const beard = model.anchor.getObjectByName('entrance-bearding-cluster');
    expect(wrap).toBeTruthy();
    expect(guard).toBeTruthy();
    expect(beard).toBeTruthy();

    wrap.traverse((o) => { expect(model.picks).not.toContain(o); });
    beard.traverse((o) => { expect(model.picks).not.toContain(o); });

    model.frame(0, { season: 2, winterized: true, swarmPressure: 0.4, traffic: 0.6 }, true);
    expect(wrap.visible).toBe(true);
    expect(beard.visible).toBe(false);

    model.frame(100, { season: 1, winterized: true, swarmPressure: 1.18, traffic: 1 }, false);
    expect(wrap.visible).toBe(false);
    expect(beard.visible).toBe(true);

    model.frame(200, { season: 3, winterized: false, swarmPressure: 1.25, traffic: 0.1 }, true);
    expect(wrap.visible).toBe(false);
    expect(beard.visible).toBe(false);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
  });

  it('renders and live-syncs Drone heading, ground-track, and wind vector dial without mutating bhDroneMotionReadout or state', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const probeState = { x: 50, y: 90, z: -250, yaw: 0.05, pitch: 0.1, vx: 0.9, vy: 0.25, vz: -1.8, windNow: { x: 0.4, z: 0 } };
    const snap = JSON.stringify(probeState);
    const r = BH.bhDroneMotionReadout(probeState);
    const dial = BH.bhDroneMotionDialData(probeState, r);
    expect(dial.hasTrack).toBe(true);
    expect(dial.trackDeg).toBe(r.degrees);
    expect(dial.hasWind).toBe(true);
    expect(dial.vertKey).toBe('rising');
    expect(JSON.stringify(probeState)).toBe(snap);

    const stationaryDial = BH.bhDroneMotionDialData({ vx: 0, vy: 0, vz: 0, yaw: 0 });
    expect(stationaryDial.hasTrack).toBe(false);

    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', pacing: 'live', courseSeed: 20260904 },
    });
    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => { launchBtn.click(); await Promise.resolve(); });

    const panel = host.querySelector('[data-flight-motion]');
    expect(panel).toBeTruthy();
    panel.open = true;
    const dialSvg = panel.querySelector('svg[data-motion-vector-svg="true"]');
    expect(dialSvg).toBeTruthy();
    expect(dialSvg.getAttribute('aria-hidden')).toBe('true');
    expect(dialSvg.getAttribute('focusable')).toBe('false');
    expect(dialSvg.querySelector('[data-motion-heading-vec="true"]')).toBeTruthy();
    expect(dialSvg.querySelector('[data-motion-track-vec="true"]')).toBeTruthy();
    expect(dialSvg.querySelector('[data-motion-wind-vec="true"]')).toBeTruthy();
    expect(dialSvg.querySelector('[data-motion-vertical-cue="true"]')).toBeTruthy();

    const ds = window.__testHooks.beehive && window.__testHooks.beehive.droneStateRef && window.__testHooks.beehive.droneStateRef.current;
    expect(ds).toBeTruthy();
    ds.paused = true;
    ds.yaw = 0.05;
    ds.vx = 0.9;
    ds.vy = 0.25;
    ds.vz = -1.8;
    ds.windNow = { x: 0.4, z: 0 };
    ds._nextInstrumentSync = 0;

    expect(rafCallbacks.length).toBeGreaterThan(0);
    await act(async () => {
      rafCallbacks[rafCallbacks.length - 1](5000);
      await Promise.resolve();
    });

    expect(dialSvg.getAttribute('data-vertical-state')).toBe('rising');
    expect(dialSvg.getAttribute('data-has-track')).toBe('true');
    expect(dialSvg.getAttribute('data-has-wind')).toBe('true');
    expect(dialSvg.querySelector('[data-motion-track-vec="true"]').getAttribute('transform')).toMatch(/^rotate\(-?\d+ 52 56\)$/);
  });

  it('adds zero-text aria-hidden before/after bars to Colony Event recorded readings and omits them when readings are missing', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const def = {
      id: 'nectar_surge',
      label: 'Nectar flow surge',
      emoji: '🌼',
      desc: 'Warm rain boosted clover nectar across the valley.',
      lesson: 'Forage availability can raise colony stores.',
      effect: { honey: 6, varroaLevel: 4 },
    };
    const before = { ...BH.bhCreateNewColonyState(21, 1, 0), day: 18, honey: 24, varroaLevel: 10, morale: 70 };
    const after = { ...before, day: 19, honey: 30, varroaLevel: 14, morale: 75 };
    const captured = BH.bhCaptureColonyEvent(def, before, after, before);

    await mountState({
      ...before,
      viewMode: 'beekeeper',
      activeEvent: captured,
    });

    const forecast = host.querySelector('#beehive-active-event [data-beehive-event-forecast="true"]');
    expect(forecast).toBeTruthy();
    const honeyBars = forecast.querySelector('[data-event-reading="honey"] [data-event-reading-bars="true"]');
    expect(honeyBars).toBeTruthy();
    expect(honeyBars.getAttribute('aria-hidden')).toBe('true');
    expect(honeyBars.getAttribute('data-delta-tone')).toBe('beneficial');
    expect(honeyBars.textContent).toBe('');
    const varroaBars = forecast.querySelector('[data-event-reading="varroaLevel"] [data-event-reading-bars="true"]');
    expect(varroaBars).toBeTruthy();
    expect(varroaBars.getAttribute('data-delta-tone')).toBe('adverse');

    await act(async () => {
      setBeehiveState({ activeEvent: def });
      await Promise.resolve();
    });
    expect(host.querySelector('#beehive-active-event [data-event-reading-bars="true"]')).toBeNull();
  });

  it('renders delta bars in latest intervention evidence and 30-day seasonal arc SVG in #beehive-season-report', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      ...BH.bhCreateNewColonyState(333, 1, 0),
      viewMode: 'beekeeper',
      day: 30,
      colonySurvived: true,
      workers: 16500,
      honey: 42,
      varroaLevel: 9,
      lastManagement: {
        label: 'Treat for mites',
        day: 29,
        cost: '1 AP',
        summary: 'Oxalic treatment reduced phoretic mites.',
        changes: [
          { label: 'Varroa', before: 24, after: 9, delta: -15, suffix: '' },
          { label: 'Honey', before: 40, after: 42, delta: 2, suffix: ' lb' },
        ],
      },
      history: [
        { d: 0, w: 10000, h: 20, v: 4, m: 78 },
        { d: 15, w: 14000, h: 31, v: 18, m: 82 },
        { d: 30, w: 16500, h: 42, v: 9, m: 86 },
      ],
    });

    const mgmtBars = host.querySelectorAll('[data-beehive-management-evidence] [data-management-change-bars="true"]');
    expect(mgmtBars).toHaveLength(2);
    expect(mgmtBars[0].getAttribute('data-change-tone')).toBe('good');
    expect(mgmtBars[0].getAttribute('aria-hidden')).toBe('true');
    expect(mgmtBars[0].textContent).toBe('');

    const seasonArc = host.querySelector('#beehive-season-report [data-season-report-trajectory="true"]');
    expect(seasonArc).toBeTruthy();
    const arcSvg = seasonArc.querySelector('svg[data-season-report-svg="true"]');
    expect(arcSvg).toBeTruthy();
    expect(arcSvg.getAttribute('aria-hidden')).toBe('true');
    expect(arcSvg.querySelectorAll('polyline')).toHaveLength(3);
    expect(seasonArc.querySelector('[data-season-report-trajectory-summary="true"]').textContent).toContain('Day 0 to Day 30');

    await act(async () => {
      setBeehiveState({ history: [{ d: 30, w: 16500, h: 42, v: 9 }] });
      await Promise.resolve();
    });
    expect(host.querySelector('#beehive-season-report [data-season-report-trajectory="true"]')).toBeNull();
  });

  it('adds RTS brood queue progress bars, impact metric delta bars, and Colony Network debrief head-to-head + caste mix visuals', async () => {
    await mountState({
      viewMode: 'queen',
      queen: {
        active: true,
        paused: true,
        speed: 1,
        day: 16,
        score: 260,
        hiveHealth: 82,
        territory: 72,
        result: 'victory',
        rival: { name: 'Thistle Crown', health: 18, pressure: 22, intel: 60, posture: 'cluster', structures: 3, strength: 85, stores: 12 },
        population: { nurses: 240, builders: 110, guards: 90, foragers: 360, scouts: 45, drones: 40 },
        resources: { nectar: 44, pollen: 28, wax: 10, royalJelly: 6 },
        pheromones: { qmp: 88, alarm: 12, nasonov: 60, brood: 54 },
        productionQueue: [
          { id: 'worker-brood-1', type: 'workers', label: 'Worker brood', icon: '🐣', amount: 20, remaining: 1, totalCycles: 2 },
          { id: 'drone-brood-2', type: 'drones', label: 'Drone brood', icon: '♂️', amount: 40, remaining: 2, totalCycles: 3 },
        ],
        lastImpact: {
          kind: 'signal',
          title: 'Workers reallocated',
          summary: 'Foraging output rose after Nasonov relay.',
          cycle: 16,
          changes: [{ label: 'QMP', before: 58, after: 88, delta: 30, suffix: '%' }],
          events: ['Nasonov relay oriented house bees.'],
        },
      },
    });

    const progressBars = host.querySelectorAll('[data-rts-production-queue="true"] [data-rts-order-progress="true"]');
    expect(progressBars).toHaveLength(2);
    expect(progressBars[0].getAttribute('aria-hidden')).toBe('true');
    expect(progressBars[0].getAttribute('data-progress-pct')).toBe('67');

    const impactBars = host.querySelectorAll('[data-rts-impact-metric] [data-rts-impact-bars="true"]');
    expect(impactBars).toHaveLength(1);
    expect(impactBars[0].getAttribute('data-delta-tone')).toBe('beneficial');

    const debriefVisual = host.querySelector('[data-rts-debrief-visual="true"]');
    expect(debriefVisual).toBeTruthy();
    expect(debriefVisual.querySelector('[data-rts-debrief-bar="core"]').textContent).toContain('You 82%');
    expect(debriefVisual.querySelector('[data-rts-debrief-bar="forage"]').textContent).toContain('Neighbor 28%');
    expect(debriefVisual.querySelector('[data-rts-debrief-castes="true"]').textContent).toContain('Foragers 360');
    expect(debriefVisual.querySelectorAll('[data-rts-caste-seg]')).toHaveLength(5);
  });
});

describe('Beehive enhancement pass — phase 20 (candidate23)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;
  let rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.THREE;
    delete window.AlloPostFXEnabled;
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('adds raycast-safe streamside water collectors with crop glints and fan cooling airflow plumes in the 3D forage meadow', () => {
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const model = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });
    const picksBefore = model.picks.length;
    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    const waterGroup = model.anchor.getObjectByName('water-bank-foragers');
    const fanPlumes = model.anchor.getObjectByName('fan-cooling-plumes');
    expect(waterGroup).toBeTruthy();
    expect(fanPlumes).toBeTruthy();
    expect(waterGroup.children).toHaveLength(8);
    expect(fanPlumes.children).toHaveLength(6);
    waterGroup.traverse((o) => { expect(model.picks).not.toContain(o); });
    fanPlumes.traverse((o) => { expect(model.picks).not.toContain(o); });

    model.frame(0, {
      season: 1,
      showRoutes: true,
      showGamePieces: true,
      forageRate: 0.9,
      homeHealth: 1,
      rivalHealth: 1,
      structures: [{ id: 'f1', type: 'fan', x: 0.25, y: 0.4, level: 1 }],
    }, true);

    expect(waterGroup.visible).toBe(true);
    expect(fanPlumes.visible).toBe(true);
    expect(fanPlumes.children[0].visible).toBe(true);
    expect(fanPlumes.children[1].visible).toBe(false);
    const activeWaterBees = waterGroup.children.filter((b) => b.visible);
    expect(activeWaterBees.length).toBeGreaterThanOrEqual(3);
    expect(activeWaterBees.some((b) => b.userData.waterDrop && b.userData.waterDrop.visible)).toBe(true);
    expect(activeWaterBees.some((b) => b.userData.waterDrop && !b.userData.waterDrop.visible)).toBe(true);

    model.frame(100, {
      season: 3,
      showRoutes: true,
      showGamePieces: true,
      forageRate: 0.9,
      homeHealth: 1,
      rivalHealth: 1,
      structures: [{ id: 'f1', type: 'fan', x: 0.25, y: 0.4, level: 1 }],
    }, true);
    expect(waterGroup.visible).toBe(false);
    expect(fanPlumes.visible).toBe(false);
    expect(waterGroup.children.every((b) => !b.visible)).toBe(true);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
    expect(model.picks.length).toBe(picksBefore);
  });

  it('adds a 3D DCA altitude-lock ring and Pause-and-Plan horizontal range gauge while keeping helper shapes intact', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const pureRange = BH.bhDronePlanningReadings({ x: 0, y: 115, z: -500, energy: 105, difficulty: 'normal', reachedDca: false, nearQueens: [] }).range;
    expect(pureRange).toEqual({ value: 100, text: '100 model m', reference: 'To DCA center', detail: 'Move 28 model m closer to the DCA boundary.', status: 'outside' });

    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    let capturedScene = null;
    THREE.WebGLRenderer = function FakeWebGLRenderer(options) {
      this.domElement = options.canvas;
      this.shadowMap = { enabled: false, type: null };
      this.outputEncoding = 0;
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn((w, h) => { options.canvas.width = w; options.canvas.height = h; });
      this.setClearColor = vi.fn();
      this.render = vi.fn((scene) => { capturedScene = scene; });
      this.dispose = vi.fn();
    };
    window.THREE = THREE;
    window.AlloPostFXEnabled = false;
    window.__testHooks = {};
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve(THREE));

    await mountState({ viewMode: 'drone', drone: { active: false, difficulty: 'easy', pacing: 'steps' } });
    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const initCb = rafCallbacks.shift();
    expect(typeof initCb).toBe('function');
    await act(async () => { initCb(performance.now() + 16); await Promise.resolve(); });
    expect(capturedScene).toBeTruthy();

    const lockRing = capturedScene.getObjectByName('drone-dca-altitude-lock');
    expect(lockRing).toBeTruthy();
    const ds = window.__testHooks.beehive.droneStateRef.current;
    ds.phase = 'flight';
    ds.reachedDca = false;
    ds.y = 40;
    const frameOut = rafCallbacks.shift();
    await act(async () => { frameOut(performance.now() + 16); await Promise.resolve(); });
    expect(lockRing.material.opacity).toBeCloseTo(0.18, 2);

    ds.y = 115;
    const frameIn = rafCallbacks.shift();
    if (typeof frameIn === 'function') {
      await act(async () => { frameIn(performance.now() + 32); await Promise.resolve(); });
      expect(lockRing.material.opacity).toBeGreaterThan(0.5);
      expect(lockRing.position.y).toBe(115);
    }

    const rangeCard = host.querySelector('article[data-planning-reading="range"]');
    expect(rangeCard).toBeTruthy();
    const rangeSvg = rangeCard.querySelector('svg[data-planning-range-scale="true"]');
    expect(rangeSvg).toBeTruthy();
    expect(rangeSvg.getAttribute('aria-hidden')).toBe('true');
    expect(rangeSvg.getAttribute('focusable')).toBe('false');
    expect(rangeSvg.querySelector('[data-planning-range-dca-zone="true"]')).toBeTruthy();
    expect(rangeSvg.querySelector('[data-planning-range-pointer="true"]')).toBeTruthy();
    expect(rangeCard.textContent).toContain('0');
    expect(rangeCard.textContent).toContain('600 model m');
  });

  it('renders paired before/after delta bars in Drone Maneuver Evidence and omits them when trend is unknown', async () => {
    await mountState({
      viewMode: 'drone',
      drone: {
        active: false,
        lastRun: {
          difficulty: 'easy',
          scenario: 'clear',
          courseSeed: 20260908,
          success: false,
          energyLeft: 80,
          score: 25,
          maxAlt: 120,
          distance: 220,
          decisionLog: [
            { turn: 1, action: 'Follow navigation cue', seconds: 2, altitudeBefore: 95, altitude: 115, energyBefore: 90, energy: 86, rangeBefore: 73, range: 180, targetBefore: 'DCA', target: 'Queen cue' },
          ],
          telemetry: [],
        },
      },
    });

    const review = host.querySelector('[data-drone-saved-review]');
    expect(review).toBeTruthy();
    review.open = true;

    const altBars = review.querySelector('[data-maneuver-metric="altitude"] [data-maneuver-bars="true"]');
    expect(altBars).toBeTruthy();
    expect(altBars.getAttribute('aria-hidden')).toBe('true');
    expect(altBars.textContent).toBe('');
    expect(altBars.getAttribute('data-delta-tone')).toBe('neutral');

    const energyBars = review.querySelector('[data-maneuver-metric="energy"] [data-maneuver-bars="true"]');
    expect(energyBars).toBeTruthy();
    expect(energyBars.getAttribute('data-delta-tone')).toBe('adverse');

    expect(review.querySelector('[data-maneuver-metric="range"]').getAttribute('data-maneuver-trend')).toBe('unknown');
    expect(review.querySelector('[data-maneuver-metric="range"] [data-maneuver-bars="true"]')).toBeNull();
  });

  it('adds zero-text paired delta bars to Management Choice Preview immediate and horizon comparisons', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      ...BH.bhCreateNewColonyState(42, 1, 0),
      viewMode: 'beekeeper',
      focusLayout: false,
      day: 14,
      actionPoints: 3,
      varroaLevel: 26,
      honey: 40,
      pollen: 14,
    });

    const previewDetails = host.querySelector('[data-management-preview]');
    expect(previewDetails).toBeTruthy();
    await act(async () => {
      previewDetails.open = true;
      previewDetails.dispatchEvent(new Event('toggle'));
      await Promise.resolve();
    });

    const immBars = previewDetails.querySelectorAll('[data-management-preview-immediate] [data-preview-immediate-bars="true"]');
    expect(immBars.length).toBeGreaterThanOrEqual(1);
    for (const bar of immBars) {
      expect(bar.getAttribute('aria-hidden')).toBe('true');
      expect(bar.textContent).toBe('');
    }
    const scenarioBars = previewDetails.querySelectorAll('[data-management-preview-results] [data-preview-scenario-bars="true"]');
    expect(scenarioBars.length).toBeGreaterThanOrEqual(1);
    const varroaScenarioBar = previewDetails.querySelector('[data-management-preview-metric="varroaLevel"] [data-preview-scenario-bars="true"]');
    if (varroaScenarioBar) {
      expect(['beneficial', 'adverse', 'neutral']).toContain(varroaScenarioBar.getAttribute('data-delta-tone'));
    }
  });

  it('renders paired evidence bars in Discovery Studio, Thermoregulation trials, and RTS next-cycle forecast', async () => {
    await mountState({
      viewMode: 'beekeeper',
      beeView: 'waggle',
      discoveryLesson: 'waggle',
      focusLayout: true,
      waggleLab: { angle: 90, sun: 45 },
      thermHunt: { outsideC: 40, heaterBees: 1000, beesFanning: 0 },
    });

    const card = host.querySelector('[data-beehive-discovery]');
    expect(card).toBeTruthy();
    const captureBtn = Array.from(card.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Capture observation');
    expect(captureBtn).toBeTruthy();
    await act(async () => { captureBtn.click(); await Promise.resolve(); });

    await act(async () => {
      setBeehiveState({ waggleLab: { angle: 120, sun: 135 } });
      await Promise.resolve();
    });

    const compareBtn = Array.from(card.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Compare now');
    expect(compareBtn).toBeTruthy();
    await act(async () => { compareBtn.click(); await Promise.resolve(); });

    const discBars = card.querySelectorAll('[data-discovery-comparison] [data-discovery-metric-bars="true"]');
    expect(discBars.length).toBeGreaterThanOrEqual(3);
    expect(discBars[0].getAttribute('aria-hidden')).toBe('true');
    expect(discBars[0].textContent).toBe('');

    await act(async () => {
      setBeehiveState({ beeView: 'thermo', discoveryLesson: 'thermo' });
      await Promise.resolve();
    });

    const thermoLab = host.querySelector('[data-beehive-thermoregulation]');
    expect(thermoLab).toBeTruthy();
    const logTrialBtn = Array.from(thermoLab.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Log current trial');
    expect(logTrialBtn).toBeTruthy();
    await act(async () => { logTrialBtn.click(); await Promise.resolve(); });
    await act(async () => {
      setBeehiveState({ thermHunt: { outsideC: 40, heaterBees: 1000, beesFanning: 350, comparisonBaseline: latest.beehive.thermHunt.comparisonBaseline, log: latest.beehive.thermHunt.log } });
      await Promise.resolve();
    });

    const thermoTempBar = thermoLab.querySelector('[data-thermo-delta="temperature"] [data-thermo-delta-bars="true"]');
    expect(thermoTempBar).toBeTruthy();
    expect(thermoTempBar.getAttribute('aria-hidden')).toBe('true');
    expect(thermoTempBar.textContent).toBe('');
    expect(thermoTempBar.getAttribute('data-delta-tone')).toBe('beneficial');

    await act(async () => {
      setBeehiveState({
        viewMode: 'queen',
        queen: {
          active: true,
          paused: true,
          speed: 1,
          day: 4,
          resources: { nectar: 30, pollen: 18, wax: 8, royalJelly: 4 },
        },
      });
      await Promise.resolve();
    });

    const rtsForecastBars = host.querySelectorAll('[data-rts-next-cycle-economy="true"] [data-rts-next-cycle-bars="true"]');
    expect(rtsForecastBars).toHaveLength(4);
    for (const bar of rtsForecastBars) {
      expect(bar.getAttribute('aria-hidden')).toBe('true');
      expect(bar.textContent).toBe('');
    }
  });
});

describe('Beehive enhancement pass — phase 21 (candidate24)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;
  let rafCallbacks;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.THREE;
    delete window.AlloPostFXEnabled;
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}) {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('adds raycast-safe 3D entrance fanners, propolis seals, and apiary conservation props with zero per-frame allocations', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhHasManagementChoice([{ choiceId: 'water_station' }], 'water_station')).toBe(true);
    expect(BH.bhHasManagementChoice([{ choiceId: 'other' }], 'water_station')).toBe(false);
    expect(BH.bhHasManagementChoice(null, 'water_station')).toBe(false);

    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const fanners = model.anchor.getObjectByName('entrance-fanner-line');
    const propolis = model.anchor.getObjectByName('propolis-envelope-seals');
    const props = model.anchor.getObjectByName('apiary-conservation-props');
    const waterer = model.anchor.getObjectByName('pebble-bee-waterer');
    const hotel = model.anchor.getObjectByName('solitary-bee-hotel');
    expect(fanners).toBeTruthy();
    expect(propolis).toBeTruthy();
    expect(props).toBeTruthy();
    expect(waterer).toBeTruthy();
    expect(hotel).toBeTruthy();

    [fanners, propolis, props, waterer, hotel].forEach((g) => {
      g.traverse((o) => expect(model.picks).not.toContain(o));
    });

    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    model.frame(1000, {
      season: 1,
      traffic: 0.45,
      swarmPressure: 0.25,
      smokeActive: false,
      hygieneSeal: true,
      waterStation: true,
      beeHotel: true,
    }, false);
    expect(fanners.visible).toBe(true);
    expect(propolis.visible).toBe(true);
    expect(propolis.scale.y).toBeGreaterThan(1.2);
    expect(waterer.visible).toBe(true);
    expect(hotel.visible).toBe(true);

    model.frame(2200, {
      season: 3,
      traffic: 0.5,
      swarmPressure: 0.8,
      smokeActive: true,
      hygieneSeal: false,
      honeyFill: 0.1,
      waterStation: false,
      beeHotel: false,
    }, false);
    expect(fanners.visible).toBe(false);
    expect(propolis.visible).toBe(false);
    expect(waterer.visible).toBe(false);
    expect(hotel.visible).toBe(false);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos).toEqual(beforeGeos);
  });

  it('renders peak-altitude vs DCA band scale SVG on Drone recorded snapshot while preserving meter/icon counts and omitting when missing', async () => {
    await mountState({
      viewMode: 'drone',
      drone: {
        active: false,
        lastRun: {
          difficulty: 'easy',
          scenario: 'clear',
          courseSeed: 20260908,
          success: true,
          energyLeft: 64,
          energyUnits: 'percent-of-difficulty-reserve',
          score: 120,
          maxAlt: 118,
          distance: 310,
          decisionLog: [],
          telemetry: [],
        },
      },
    });

    const review = host.querySelector('[data-drone-saved-review]');
    expect(review).toBeTruthy();
    review.open = true;

    const peakWrap = review.querySelector('[data-result-peak-meter-wrap="true"]');
    expect(peakWrap).toBeTruthy();
    expect(peakWrap.getAttribute('data-in-dca-band')).toBe('true');

    const peakSvg = peakWrap.querySelector('svg[data-result-peak-scale="true"]');
    expect(peakSvg).toBeTruthy();
    expect(peakSvg.getAttribute('aria-hidden')).toBe('true');
    expect(peakSvg.getAttribute('focusable')).toBe('false');
    expect(peakSvg.querySelectorAll('text')).toHaveLength(0);
    expect(peakSvg.querySelector('[data-result-peak-dca-band="true"]')).toBeTruthy();
    expect(peakSvg.querySelector('[data-result-peak-fill="true"]')).toBeTruthy();
    expect(peakSvg.querySelector('[data-result-peak-marker="true"]')).toBeTruthy();

    expect(review.querySelectorAll('svg[data-result-energy-meter]')).toHaveLength(1);
    expect(review.querySelectorAll('svg[data-result-icon]')).toHaveLength(5);

    await act(async () => {
      setBeehiveState({
        drone: {
          active: false,
          lastRun: {
            difficulty: 'easy',
            scenario: 'clear',
            courseSeed: 20260908,
            success: false,
            energyLeft: 50,
            score: 40,
            maxAlt: 45,
            distance: 140,
            decisionLog: [],
            telemetry: [],
          },
        },
      });
      await Promise.resolve();
    });
    expect(host.querySelector('[data-result-peak-meter-wrap="true"]').getAttribute('data-in-dca-band')).toBe('false');

    await act(async () => {
      setBeehiveState({
        drone: {
          active: false,
          lastRun: {
            difficulty: 'easy',
            scenario: 'clear',
            courseSeed: 20260908,
            success: false,
            energyLeft: 50,
            score: 40,
            distance: 140,
            decisionLog: [],
            telemetry: [],
          },
        },
      });
      await Promise.resolve();
    });
    expect(host.querySelector('svg[data-result-peak-scale="true"]')).toBeNull();
  });

  it('adds pause-and-plan proximity radar SVGs and live updraft lift altitude marker syncing', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const probe = {
      x: 0,
      z: 0,
      yaw: 0,
      obstacles: [{ x: 10, z: 0 }],
      drones: [{ x: 0, z: -45 }],
    };
    const snap = JSON.stringify(probe);
    const obsProx = BH.bhDroneSurroundingsProximityVisual(probe, 'obstacle');
    const trafProx = BH.bhDroneSurroundingsProximityVisual(probe, 'traffic');
    expect(obsProx.available).toBe(true);
    expect(obsProx.band).toBe('close');
    expect(trafProx.available).toBe(true);
    expect(trafProx.band).toBe('moderate');
    expect(BH.bhDroneSurroundingsProximityVisual({ x: 0, z: 0, obstacles: [] }, 'obstacle').available).toBe(false);
    expect(BH.bhDroneSurroundingsProximityVisual(probe, 'wind').available).toBe(false);
    expect(JSON.stringify(probe)).toBe(snap);

    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', pacing: 'steps', courseSeed: 20260904 },
    });
    const launchSteps = host.querySelector('[data-flight-launch="easy"]');
    expect(launchSteps).toBeTruthy();
    await act(async () => { launchSteps.click(); await Promise.resolve(); });

    const surroundings = host.querySelector('[data-flight-surroundings="true"]');
    expect(surroundings).toBeTruthy();
    surroundings.open = true;
    expect(surroundings.querySelectorAll('svg[data-surroundings-dial]')).toHaveLength(2);

    const obsSvg = surroundings.querySelector('svg[data-surroundings-proximity="obstacle"]');
    const trafSvg = surroundings.querySelector('svg[data-surroundings-proximity="traffic"]');
    expect(obsSvg).toBeTruthy();
    expect(trafSvg).toBeTruthy();
    for (const svg of [obsSvg, trafSvg]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
      expect(svg.querySelector('[data-surroundings-proximity-ray="true"], [data-surroundings-proximity-ring="true"]')).toBeTruthy();
    }

    await mountState({
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy', pacing: 'live', courseSeed: 20260904 },
    });
    const launchLive = host.querySelector('[data-flight-launch="easy"]');
    expect(launchLive).toBeTruthy();
    await act(async () => { launchLive.click(); await Promise.resolve(); });

    const liftSvg = host.querySelector('[data-flight-lift] svg[data-lift-svg="true"]');
    expect(liftSvg).toBeTruthy();
    expect(liftSvg.getAttribute('aria-hidden')).toBe('true');
    expect(liftSvg.getAttribute('focusable')).toBe('false');
    expect(liftSvg.querySelector('[data-lift-column="true"]')).toBeTruthy();
    expect(liftSvg.querySelector('[data-lift-ceiling-line="true"]')).toBeTruthy();
    const liftDot = liftSvg.querySelector('[data-lift-altitude-dot="true"]');
    expect(liftDot).toBeTruthy();

    const ds = window.__testHooks.beehive && window.__testHooks.beehive.droneStateRef && window.__testHooks.beehive.droneStateRef.current;
    expect(ds).toBeTruthy();
    ds.paused = true;
    ds.y = 40;
    ds._nextInstrumentSync = 0;
    await act(async () => {
      rafCallbacks[rafCallbacks.length - 1](6000);
      await Promise.resolve();
    });
    expect(liftDot.getAttribute('cy')).toBe('29');

    ds.y = 180;
    ds._nextInstrumentSync = 0;
    await act(async () => {
      rafCallbacks[rafCallbacks.length - 1](6500);
      await Promise.resolve();
    });
    expect(liftDot.getAttribute('cy')).toBe('15');
  });

  it('renders zero-text threshold gauge SVG inside Beekeeper #beehive-sign-card for quantitative signs', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const mitesMeter = BH.bhColonySignMeter('mites', { varroaLevel: 38 });
    expect(mitesMeter.thresholdPct).toBe(20);
    expect(mitesMeter.badStartPct).toBe(35);
    expect(mitesMeter.markerPct).toBe(38);
    expect(BH.bhColonySignMeter('thriving', {})).toBeNull();

    await mountState({
      ...BH.bhCreateNewColonyState(77, 1, 0),
      viewMode: 'beekeeper',
      day: 12,
      honey: 5,
      varroaLevel: 38,
    });

    const mitesBtn = host.querySelector('[data-beehive-sign="mites"]');
    expect(mitesBtn).toBeTruthy();
    await act(async () => { mitesBtn.click(); await Promise.resolve(); });

    const mitesWrap = host.querySelector('#beehive-sign-card [data-sign-threshold-meter="mites"]');
    expect(mitesWrap).toBeTruthy();
    const mitesSvg = mitesWrap.querySelector('svg[data-sign-threshold-svg="true"]');
    expect(mitesSvg).toBeTruthy();
    expect(mitesSvg.getAttribute('aria-hidden')).toBe('true');
    expect(mitesSvg.getAttribute('focusable')).toBe('false');
    expect(mitesSvg.querySelectorAll('text')).toHaveLength(0);
    expect(mitesSvg.querySelector('[data-sign-threshold-band="warn"]')).toBeTruthy();
    expect(mitesSvg.querySelector('[data-sign-threshold-band="bad"]')).toBeTruthy();
    expect(mitesSvg.querySelector('[data-sign-threshold-line="true"]')).toBeTruthy();
    expect(mitesSvg.querySelector('[data-sign-threshold-marker="true"]')).toBeTruthy();

    const storesBtn = host.querySelector('[data-beehive-sign="stores"]');
    expect(storesBtn).toBeTruthy();
    await act(async () => { storesBtn.click(); await Promise.resolve(); });
    const storesSvg = host.querySelector('#beehive-sign-card [data-sign-threshold-meter="stores"] svg[data-sign-threshold-svg="true"]');
    expect(storesSvg).toBeTruthy();
    expect(storesSvg.querySelector('[data-sign-threshold-marker="true"]')).toBeTruthy();
  });

  it('adds paired delta bars to Time-Advance Evidence and Queen RTS 3D Map Impact chips', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      ...BH.bhCreateNewColonyState(88, 1, 0),
      viewMode: 'beekeeper',
      workers: 11200,
      honey: 26,
      varroaLevel: 14,
      morale: 80,
      lastAdvance: {
        fromDay: 4,
        toDay: 7,
        days: 3,
        workers: 1200,
        honey: 4,
        varroa: 6,
        morale: 2,
        stoppedForEvent: false,
      },
    });

    const advBars = host.querySelectorAll('[data-beehive-advance-evidence="true"] [data-advance-evidence-bars="true"]');
    expect(advBars).toHaveLength(4);
    for (const bar of advBars) {
      expect(bar.getAttribute('aria-hidden')).toBe('true');
      expect(bar.textContent).toBe('');
    }
    expect(advBars[0].getAttribute('data-delta-tone')).toBe('beneficial');
    expect(advBars[2].getAttribute('data-delta-tone')).toBe('adverse');

    await act(async () => {
      setBeehiveState({
        viewMode: 'queen',
        show3dQueen: true,
        queen: {
          active: true,
          paused: true,
          speed: 1,
          day: 6,
          lastImpact: {
            kind: 'command',
            cycle: 6,
            title: 'Send Scout',
            summary: 'Scout mapped shared clover.',
            changes: [
              { label: 'Territory', before: 40, after: 55, delta: 15, suffix: '%' },
              { label: 'Alarm', before: 30, after: 18, delta: -12, suffix: '%' },
            ],
          },
        },
      });
      await Promise.resolve();
    });

    const rtsImpactBars = host.querySelectorAll('[data-rts-map-impact="command"] [data-rts-map-impact-chip] [data-rts-map-impact-bars="true"]');
    expect(rtsImpactBars).toHaveLength(2);
    for (const bar of rtsImpactBars) {
      expect(bar.getAttribute('aria-hidden')).toBe('true');
      expect(bar.textContent).toBe('');
      expect(bar.getAttribute('data-delta-tone')).toBe('beneficial');
    }
  });
});

describe('Beehive enhancement pass — phase 22 (candidate25)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;
  let rafCallbacks;
  let ctxProxy;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    rafCallbacks = [];
    const gradient = { addColorStop: vi.fn() };
    ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.THREE;
    delete window.AlloPostFXEnabled;
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('adds raycast-safe 3D Nasonov waves + nursery warmth on anchor and Path2D-free pollination canvas fallback', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const nasonovGroup = model.anchor.getObjectByName('nasonov-orientation-waves');
    const warmthGroup = model.anchor.getObjectByName('comb-nursery-warmth');
    expect(nasonovGroup).toBeTruthy();
    expect(warmthGroup).toBeTruthy();

    [nasonovGroup, warmthGroup].forEach((g) => {
      g.traverse((o) => expect(model.picks).not.toContain(o));
    });

    const beforeGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) beforeGeos.add(o.geometry); });

    // Pixel-diff guard: hidden when showSignals and showGamePieces are false
    model.frame(1000, {
      season: 1,
      showSignals: false,
      showGamePieces: false,
      nasonov: 0.75,
      structures: [{ type: 'brood', level: 2, x: -1.8, z: 0.1 }],
    }, false);
    expect(nasonovGroup.visible).toBe(false);
    expect(warmthGroup.visible).toBe(false);

    // Pixel-diff guard: nursery warmth stays hidden without placed brood/nursery structures
    model.frame(1200, {
      season: 1,
      showSignals: false,
      showGamePieces: true,
      territory: 12,
      structures: [{ type: 'honey', level: 2, x: -1.8, z: 0.1 }],
    }, false);
    expect(nasonovGroup.visible).toBe(false);
    expect(warmthGroup.visible).toBe(false);

    // Visible when gated overlays + structures are active
    model.frame(1500, {
      season: 1,
      showSignals: true,
      showGamePieces: true,
      paused: false,
      nasonov: 0.8,
      structures: [
        { type: 'brood', level: 2, x: -1.8, z: 0.1 },
        { type: 'nursery', level: 3, x: -1.4, z: -0.2 },
      ],
    }, false);
    expect(nasonovGroup.visible).toBe(true);
    expect(warmthGroup.visible).toBe(true);

    // Freeze when reduced motion or paused is set
    model.frame(2000, {
      season: 1,
      showSignals: true,
      showGamePieces: true,
      paused: true,
      nasonov: 0.8,
      structures: [{ type: 'brood', level: 2, x: -1.8, z: 0.1 }],
    }, true);
    const wave0 = nasonovGroup.getObjectByName('nasonov-wave-0');
    const slot0Halo = warmthGroup.getObjectByName('nursery-warmth-halo-0');
    const frozenWaveScale = wave0.scale.x;
    const frozenHaloScale = slot0Halo.scale.x;
    model.frame(3600, {
      season: 1,
      showSignals: true,
      showGamePieces: true,
      paused: true,
      nasonov: 0.8,
      structures: [{ type: 'brood', level: 2, x: -1.8, z: 0.1 }],
    }, true);
    expect(wave0.scale.x).toBe(frozenWaveScale);
    expect(slot0Halo.scale.x).toBe(frozenHaloScale);

    // Winter hides both overlays
    model.frame(4000, {
      season: 3,
      showSignals: true,
      showGamePieces: true,
      nasonov: 0.9,
      structures: [{ type: 'brood', level: 2, x: -1.8, z: 0.1 }],
    }, false);
    expect(nasonovGroup.visible).toBe(false);
    expect(warmthGroup.visible).toBe(false);

    const afterGeos = new Set();
    model.anchor.traverse((o) => { if (o.geometry) afterGeos.add(o.geometry); });
    expect(afterGeos.size).toBe(beforeGeos.size);

    // Path2D-free SVG path fallback
    const cmdCtx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
    };
    BH.bhTraceSvgPathOnCanvas(cmdCtx, 'M 2 3 L 10 12 H 16 V 20 Q 18 22 24 20 C 26 18 28 14 30 12 A 4 4 0 0 1 36 16 Z');
    expect(cmdCtx.beginPath).toHaveBeenCalledTimes(1);
    expect(cmdCtx.moveTo).toHaveBeenCalledWith(2, 3);
    expect(cmdCtx.lineTo).toHaveBeenCalled();
    expect(cmdCtx.quadraticCurveTo).toHaveBeenCalled();
    expect(cmdCtx.bezierCurveTo).toHaveBeenCalled();
    expect(cmdCtx.closePath).toHaveBeenCalled();

    const OrigPath2D = globalThis.Path2D;
    globalThis.Path2D = undefined;
    try {
      await mountState({ viewMode: 'beekeeper', beeView: 'pollination', motionPaused: true });
      expect(host.querySelector('[data-beehive-root="true"]')).toBeTruthy();
      expect(ctxProxy.beginPath).toHaveBeenCalled();
    } finally {
      globalThis.Path2D = OrigPath2D;
    }
  });

  it('renders archive across-seed whiskers, pair delta bars, and forecast comparison rail visuals without SVG text', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhExperimentArchiveWhisker({ metricId: 'honey', minDelta: -2, maxDelta: 6, meanDelta: 2 }).tone).toBe('beneficial');
    expect(BH.bhExperimentArchiveWhisker({ metricId: 'varroa', minDelta: 1, maxDelta: 5, meanDelta: 3 }).tone).toBe('adverse');
    expect(BH.bhExperimentArchiveWhisker({ metricId: 'honey', minDelta: 0, maxDelta: 0, meanDelta: 0 }).tone).toBe('neutral');
    expect(BH.bhForecastComparisonVisual({ start: 20, projected: 24, actual: 26, error: 2, alignment: 'aligned' }).tone).toBe('aligned');
    expect(BH.bhForecastComparisonVisual({ start: 20, projected: 24, actual: null, error: null, alignment: 'unavailable' }).tone).toBe('pending');
    expect(BH.bhForecastComparisonVisual({ start: 20, projected: 24, actual: 18, error: -6, alignment: 'not-aligned' }).tone).toBe('diverged');

    function buildPair(seed, delta) {
      const runA = { ...BH.bhCreateNewColonyState(seed, 1, 0), day: 12 };
      const runB = { ...BH.bhCreateNewColonyState(seed, 2, 0), day: 12, honey: 20 + delta };
      runB.managementTrail = [{ day: 4, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP', summary: 'Planted wildflowers.' }];
      const notebook = {
        plannedActionId: 'plant_wildflowers',
        predictedMetricId: 'honey',
        predictedDirection: 'higher',
        question: 'Does forage help honey?',
        hypothesis: 'More nectar raises stores.',
        changedVariable: 'Plant wildflowers once',
        prediction: 'Run B honey will be higher.',
        observations: 'Paired difference observed.',
        alternativeExplanation: 'Events can vary.',
        conclusion: 'Needs replication across seeds.',
      };
      notebook.registeredPlan = BH.bhCreateExperimentPlanRegistration(notebook, runB.experimentRunSerial, runA.experimentRunSerial);
      return { baseline: BH.bhCreateExperimentSnapshot(runA), runB, notebook };
    }

    let archive;
    const p1 = buildPair(101, 4);
    archive = BH.bhSaveCompletedExperimentPair(archive, p1.baseline, p1.runB, p1.notebook).archive;
    const p2 = buildPair(202, 8);
    archive = BH.bhSaveCompletedExperimentPair(archive, p2.baseline, p2.runB, p2.notebook).archive;

    const colony = { ...BH.bhCreateNewColonyState(777, 1, 0), workers: 22000, honey: 80, pollen: 80, day: 10, actionPoints: 3 };
    const created = BH.bhCreateForecastStudy(
      colony,
      { params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: () => 1 },
      { metricId: 'workers', horizon: 7, direction: 'higher', prediction: 'Brood emerges during spring.' },
      'study-22'
    );
    let study = created.study;
    let sim = colony;
    for (let i = 0; i < 7; i++) {
      sim = { ...sim, ...BH.bhStepColony(sim, { params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: () => 1 }).next };
      study = BH.bhObserveForecastStudy(study, sim);
    }

    await mountState({ ...sim, viewMode: 'beekeeper', focusLayout: false, motionPaused: true, experimentArchive: archive, forecastInvestigation: study });

    const archDetails = host.querySelector('[data-experiment-archive] details');
    expect(archDetails).toBeTruthy();
    await act(async () => {
      archDetails.open = true;
      archDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
    });

    const whiskers = host.querySelectorAll('svg[data-archive-range-whisker="true"]');
    expect(whiskers.length).toBeGreaterThanOrEqual(1);
    for (const w of whiskers) {
      expect(w.getAttribute('aria-hidden')).toBe('true');
      expect(w.querySelectorAll('text')).toHaveLength(0);
    }
    const pairBars = host.querySelectorAll('[data-archive-pair-bars="true"]');
    expect(pairBars).toHaveLength(2);
    for (const bar of pairBars) {
      expect(bar.getAttribute('data-delta-tone')).toBe('beneficial');
      expect(bar.textContent).toBe('');
    }

    const forecastDetails = host.querySelector('[data-forecast-investigation]');
    expect(forecastDetails).toBeTruthy();
    await act(async () => {
      forecastDetails.open = true;
      forecastDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
    });
    const forecastSvg = host.querySelector('[data-forecast-result-visual="true"] svg');
    expect(forecastSvg).toBeTruthy();
    expect(forecastSvg.getAttribute('aria-hidden')).toBe('true');
    expect(forecastSvg.querySelectorAll('text')).toHaveLength(0);
  });

  it('adds zero-text approach range meter and predator spatial gauge helpers and controls', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhDroneApproachRangeVisual({ x: NaN, y: 120, z: 0 }).known).toBe(false);
    expect(BH.bhDroneApproachRangeVisual({ x: 0, y: 120, z: 0 }).inRange).toBe(false);
    expect(BH.bhDroneApproachRangeVisual({ x: 0, y: 120, z: -BH.DRONE_FLIGHT_PARAMS.dcaDistanceM }).inRange).toBe(true);

    expect(BH.bhDronePredatorGauge({ x: 0, y: 50, z: 0, birds: [] }).available).toBe(false);
    expect(BH.bhDronePredatorGauge({ x: 0, y: 50, z: 0, birds: [{ x: 180, y: 50, z: 0 }] }).status).toBe('clear');
    expect(BH.bhDronePredatorGauge({ x: 0, y: 50, z: 0, birds: [{ x: 60, y: 50, z: 0 }] }).status).toBe('nearby');
    expect(BH.bhDronePredatorGauge({ x: 0, y: 50, z: 0, birds: [{ x: 10, y: 50, z: 0 }] }).status).toBe('contact');

    await mountState({
      viewMode: 'drone',
      focusLayout: false,
      drone: { active: false, difficulty: 'easy', pacing: 'live', courseSeed: 20260904 },
    });
    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => { launchBtn.click(); await Promise.resolve(); });

    const rangeMeter = host.querySelector('[data-flight-approach] [data-approach-range-meter="true"]');
    expect(rangeMeter).toBeTruthy();
    expect(rangeMeter.textContent).toBe('');

    const predatorGauge = host.querySelector('[data-flight-ecology] [data-ecology-predator-gauge="true"]');
    expect(predatorGauge).toBeTruthy();
    expect(predatorGauge.getAttribute('aria-hidden')).toBe('true');
    expect(predatorGauge.textContent).toBe('');
  });

  it('renders converging two-nest schematic and flower-visit pipeline / live preview without breaking output or bar invariants', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    await mountState({
      viewMode: 'queen',
      focusLayout: false,
      show3dQueen: true,
      queen: { active: true, paused: true, speed: 1, day: 6 },
      queenMapStudyOpen: true,
      queenMapStudy: {
        version: 1,
        patchId: 'patch_a',
        prediction: 'shared',
        captures: {
          home: { source: 'shared-map-v1', patchId: 'patch_a', colony: 'home', routeCount: 1, cycle: 4, recordedAt: '2026-06-01T00:00:00.000Z' },
        },
      },
    });
    expect(host.querySelector('[data-rts-map-investigation]')).toBeTruthy();
    expect(host.querySelector('[data-map-study-schematic="shared"]')).toBeNull();

    await act(async () => {
      setBeehiveState({
        queenMapStudy: {
          version: 1,
          patchId: 'patch_a',
          prediction: 'shared',
          captures: {
            home: { source: 'shared-map-v1', patchId: 'patch_a', colony: 'home', routeCount: 1, cycle: 4, recordedAt: '2026-06-01T00:00:00.000Z' },
            neighbor: { source: 'shared-map-v1', patchId: 'patch_a', colony: 'neighbor', routeCount: 1, cycle: 4, recordedAt: '2026-06-01T00:01:00.000Z' },
          },
        },
      });
      await Promise.resolve();
    });
    const mapSvg = host.querySelector('[data-map-study-schematic="shared"] svg');
    expect(mapSvg).toBeTruthy();
    expect(mapSvg.getAttribute('aria-hidden')).toBe('true');
    expect(mapSvg.querySelectorAll('text')).toHaveLength(0);

    const baseColony = { ...BH.bhCreateNewColonyState(777, 2, 0), day: 3, totalFlowerVisits: 2000 };
    const started = BH.bhStartFlowerVisitStudy({}, BH.bhCaptureFlowerVisits(baseColony)).study;
    await mountState({ ...baseColony, viewMode: 'beekeeper', beeView: 'pollination', day: 5, totalFlowerVisits: 3400, flowerVisitStudy: started, motionPaused: true });

    const studyPanel = host.querySelector('[data-flower-visit-study]');
    expect(studyPanel).toBeTruthy();
    const stepIcons = studyPanel.querySelectorAll('svg[data-visit-step-icon]');
    expect(stepIcons).toHaveLength(3);
    expect(studyPanel.querySelector('svg[data-visit-step-icon="visits"]').getAttribute('data-measured')).toBe('true');
    expect(studyPanel.querySelector('svg[data-visit-step-icon="pollen"]').getAttribute('data-measured')).toBe('false');
    expect(studyPanel.querySelector('svg[data-visit-step-icon="seeds"]').getAttribute('data-measured')).toBe('false');
    for (const icon of stepIcons) expect(icon.querySelectorAll('text')).toHaveLength(0);

    const preview = studyPanel.querySelector('[data-flower-visit-live-preview="true"]');
    expect(preview).toBeTruthy();
    expect(preview.querySelectorAll('.bee-visits-live-segment')).toHaveLength(2);
    expect(studyPanel.querySelectorAll('output')).toHaveLength(1);
    expect(studyPanel.querySelectorAll('.bee-visits-track > span')).toHaveLength(0);

    const freezeBtn = Array.from(studyPanel.querySelectorAll('button')).find((b) => b.textContent === 'Freeze current interval');
    await act(async () => { freezeBtn.click(); });
    expect(studyPanel.querySelectorAll('.bee-visits-track > span')).toHaveLength(2);
  });

  it('adds topic pathway pips and notebook role pips while rejecting self-review on blank text', async () => {
    await mountState({
      viewMode: 'beekeeper',
      focusLayout: false,
      notebookOpen: true,
      exploredBeeViews: ['anatomy', 'lifecycle'],
      notebook: {
        beekeeper: {
          prediction: ' Honey rises ',
          evidence: '   ',
          explanation: '',
          review: { prediction: true, evidence: true, explanation: false },
        },
        queen: {
          prediction: 'Shared patch',
          evidence: '',
          explanation: '',
          review: { prediction: false },
        },
      },
    });

    const pathwayPips = host.querySelectorAll('[data-topic-pathway-pips]');
    expect(pathwayPips.length).toBeGreaterThanOrEqual(4);
    for (const group of pathwayPips) {
      expect(group.getAttribute('aria-hidden')).toBe('true');
      const pid = group.getAttribute('data-topic-pathway-pips');
      const openedCount = group.querySelectorAll('[data-pip-opened="true"]').length;
      const countText = host.querySelector(`#beehive-path-${pid}-count`)?.textContent || '';
      expect(countText.startsWith(`${openedCount}/`)).toBe(true);
      expect(countText).toContain(' views opened');
    }

    const beekeeperPips = host.querySelector('[data-notebook-role-pips="beekeeper"]');
    expect(beekeeperPips).toBeTruthy();
    expect(beekeeperPips.getAttribute('aria-hidden')).toBe('true');
    const predPip = beekeeperPips.querySelector('[data-pip-field="prediction"]');
    const evidPip = beekeeperPips.querySelector('[data-pip-field="evidence"]');
    const explPip = beekeeperPips.querySelector('[data-pip-field="explanation"]');
    expect(predPip.getAttribute('data-written')).toBe('true');
    expect(predPip.getAttribute('data-reviewed')).toBe('true');
    // Blank text with legacy review.evidence === true MUST NOT appear self-reviewed
    expect(evidPip.getAttribute('data-written')).toBe('false');
    expect(evidPip.getAttribute('data-reviewed')).toBe('false');
    expect(explPip.getAttribute('data-written')).toBe('false');
    expect(explPip.getAttribute('data-reviewed')).toBe('false');
  });
});

describe('Beehive enhancement pass — phase 23 (candidate26)', () => {
  let cfg;
  let host;
  let root;
  let latest;
  let setBeehiveState;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      latest = data;
      setBeehiveState = (patch) => setData((prev) => ({ beehive: Object.assign({}, prev.beehive, patch) }));
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhProjectedPairScale and renders zero-text shared-scale SVG rails without altering reading values', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhProjectedPairScale(NaN, 10, 'honey').available).toBe(false);
    expect(BH.bhProjectedPairScale(-1, 10, 'honey').available).toBe(false);
    expect(BH.bhProjectedPairScale('10', 20, 'honey').available).toBe(false);
    expect(BH.bhProjectedPairScale(0, 0, 'honey')).toMatchObject({ available: true, maximum: 0, baselinePercent: 0, actionPercent: 0 });
    expect(BH.bhProjectedPairScale(40, 60, 'queenHealth')).toMatchObject({ available: true, maximum: 100, baselinePercent: 40, actionPercent: 60 });
    expect(BH.bhProjectedPairScale(10, 40, 'honey')).toMatchObject({ available: true, maximum: 40, baselinePercent: 25, actionPercent: 100 });

    const base = { ...BH.bhCreateNewColonyState(777, 1), day: 10, workers: 22000, honey: 80, syrup: 10, pollen: 80, brood: 8000, queenHealth: 90, actionPoints: 3 };
    await mountState({ ...base, viewMode: 'beekeeper', focusLayout: false, show3dHive: true, notebookOpen: true, motionPaused: true });

    const holdBtn = host.querySelector('[data-interior-hold="true"]');
    expect(holdBtn).toBeTruthy();
    await act(async () => { holdBtn.click(); await Promise.resolve(); });

    const nbHeld = host.querySelectorAll('svg[data-notebook-reading-bar="held"]');
    const nbCurrent = host.querySelectorAll('svg[data-notebook-reading-bar="current"]');
    expect(nbHeld).toHaveLength(1);
    expect(nbCurrent).toHaveLength(1);
    expect(host.querySelector('p[data-notebook-hive-scale="true"]')).toBeTruthy();
    for (const svg of [...nbHeld, ...nbCurrent]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }

    const previewDetails = host.querySelector('[data-management-preview="true"]');
    expect(previewDetails).toBeTruthy();
    await act(async () => {
      previewDetails.open = true;
      previewDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
      await Promise.resolve();
    });

    const mgmtBars = host.querySelectorAll('svg[data-management-hive-bar]');
    expect(mgmtBars.length).toBeGreaterThanOrEqual(2);
    const projBars = host.querySelectorAll('svg[data-projected-reading-bar]');
    expect(projBars.length).toBe(2);
    for (const svg of [...mgmtBars, ...projBars]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }

    const saveProjBtn = host.querySelector('[data-management-projection-save="true"]');
    expect(saveProjBtn).toBeTruthy();
    await act(async () => { saveProjBtn.click(); await Promise.resolve(); });

    const nbProjBars = host.querySelectorAll('svg[data-notebook-projection-bar]');
    expect(nbProjBars).toHaveLength(2);
    for (const svg of nbProjBars) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }
    expect(latest.beehive.honey).toBe(80);
  });

  it('renders 6-slot comb schematic and verdict icons in guided inspection without forced-color-adjust: none', async () => {
    const combCssStart = SRC_TEXT.indexOf('@media(forced-colors:active) { .bee-guided-inspection svg');
    const combCssEnd = SRC_TEXT.indexOf('.bee-interior {');
    expect(combCssStart).toBeGreaterThan(-1);
    expect(combCssEnd).toBeGreaterThan(combCssStart);
    const combCssSlice = SRC_TEXT.slice(combCssStart, combCssEnd);
    expect(combCssSlice).toContain('forced-color-adjust:auto');
    expect(combCssSlice).not.toContain('forced-color-adjust:none');
    expect(combCssSlice).not.toContain('forced-color-adjust: none');

    await mountState({
      viewMode: 'beekeeper',
      focusLayout: false,
      show3dHive: true,
      day: 40,
      hive3dFrame: 2,
      hive3dFramesSeen: [0, 2, 4],
      lastInspection: { day: 40, framesRead: 6, queenFound: true, brood: 'solid', broodCorrect: true, cells: 'no', cellsCorrect: false },
    });

    const combSvg = host.querySelector('svg[data-inspection-frame-comb="true"]');
    expect(combSvg).toBeTruthy();
    expect(combSvg.getAttribute('aria-hidden')).toBe('true');
    expect(combSvg.querySelectorAll('text')).toHaveLength(0);
    const slots = combSvg.querySelectorAll('[data-comb-slot]');
    expect(slots).toHaveLength(6);
    expect(combSvg.querySelector('[data-comb-slot="0"]').getAttribute('data-comb-visited')).toBe('true');
    expect(combSvg.querySelector('[data-comb-slot="1"]').getAttribute('data-comb-visited')).toBe('false');
    expect(combSvg.querySelector('[data-comb-slot="2"]').getAttribute('data-comb-current')).toBe('true');
    expect(combSvg.querySelector('[data-comb-slot="4"]').getAttribute('data-comb-visited')).toBe('true');

    const feedback = host.querySelector('[data-inspection-feedback="true"]');
    expect(feedback).toBeTruthy();
    const matchIcon = feedback.querySelector('svg[data-inspection-result-icon="match"]');
    const reviewIcon = feedback.querySelector('svg[data-inspection-result-icon="review"]');
    expect(matchIcon).toBeTruthy();
    expect(reviewIcon).toBeTruthy();
    for (const icon of [matchIcon, reviewIcon]) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelectorAll('text')).toHaveLength(0);
    }
  });

  it('renders 3-milestone journey pips and role/evidence icons with zero progressbar role', async () => {
    await mountState({
      viewMode: 'beekeeper',
      focusLayout: false,
      day: 32,
      inspectionsDone: 1,
      queen: { career: { wins: 1 } },
    });

    const disclosure = host.querySelector('[data-beehive-journey-disclosure]');
    expect(disclosure).toBeTruthy();
    expect(disclosure.querySelectorAll('[role="progressbar"]')).toHaveLength(0);

    const summaryPips = disclosure.querySelector('[data-journey-milestone-pips="summary"]');
    expect(summaryPips).toBeTruthy();
    expect(summaryPips.getAttribute('aria-hidden')).toBe('true');
    expect(summaryPips.querySelectorAll('[data-journey-pip]')).toHaveLength(3);
    expect(summaryPips.querySelector('[data-journey-pip="beekeeper"]').getAttribute('data-pip-reached')).toBe('true');
    expect(summaryPips.querySelector('[data-journey-pip="beekeeper"]').getAttribute('data-pip-current')).toBe('true');
    expect(summaryPips.querySelector('[data-journey-pip="queen"]').getAttribute('data-pip-reached')).toBe('true');
    expect(summaryPips.querySelector('[data-journey-pip="drone"]').getAttribute('data-pip-reached')).toBe('false');

    await act(async () => {
      disclosure.open = true;
      disclosure.dispatchEvent(new Event('toggle', { bubbles: true }));
      await Promise.resolve();
    });

    const bodyPips = disclosure.querySelector('[data-journey-milestone-pips="body"]');
    expect(bodyPips).toBeTruthy();
    expect(bodyPips.querySelectorAll('[data-journey-pip]')).toHaveLength(3);

    const roleIcons = disclosure.querySelectorAll('svg[data-journey-role-icon]');
    const evidenceIcons = disclosure.querySelectorAll('svg[data-journey-evidence-icon]');
    expect(roleIcons).toHaveLength(3);
    expect(evidenceIcons).toHaveLength(3);
    for (const svg of [...roleIcons, ...evidenceIcons]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }
  });

  it('computes bhExperimentPredictionVisual and renders Fair-Test audit strip, prediction arrows, and schedule status icons', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhExperimentPredictionVisual(null)).toEqual({ status: 'unplanned', expectedDir: 'unset', observedDir: 'pending', matched: false });
    expect(BH.bhExperimentPredictionVisual({ status: 'aligned', directionId: 'higher', observedDirectionId: 'higher', delta: 5 })).toEqual({ status: 'aligned', expectedDir: 'up', observedDir: 'up', matched: true });
    expect(BH.bhExperimentPredictionVisual({ status: 'aligned', direction: 'higher', delta: 5 })).toEqual({ status: 'aligned', expectedDir: 'up', observedDir: 'up', matched: true });
    expect(BH.bhExperimentPredictionVisual({ status: 'not-aligned', directionId: 'lower', observedDirectionId: 'higher', delta: 2 })).toEqual({ status: 'not-aligned', expectedDir: 'down', observedDir: 'up', matched: false });
    expect(BH.bhExperimentPredictionVisual({ status: 'aligned', directionId: 'same', observedDirectionId: 'same', delta: 0 })).toEqual({ status: 'aligned', expectedDir: 'same', observedDir: 'same', matched: true });
    expect(BH.bhExperimentPredictionVisual({ status: 'waiting', directionId: 'lower', delta: -3 })).toEqual({ status: 'waiting', expectedDir: 'down', observedDir: 'pending', matched: false });

    const runA = { ...BH.bhCreateNewColonyState(4321, 1), day: 12, honey: 20 };
    BH.bhAppendManagementAction(runA, { day: 1, choiceId: 'feed_bees', label: 'Feed bees', cost: '1 AP' });
    BH.bhAppendManagementAction(runA, { day: 2, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP' });
    const baseline = BH.bhCreateExperimentSnapshot(runA);
    const plan = {
      plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
      question: 'Does skipping Day 2 wildflowers change honey?', hypothesis: 'Wildflowers may increase honey.',
      changedVariable: 'Skip wildflowers on Day 2 in Run B.', prediction: 'Honey differs at Day 12.',
    };
    const notebook = { ...plan, registeredPlan: BH.bhCreateExperimentPlanRegistration(plan, 2, 1) };
    const runB = {
      ...BH.bhCreateNewColonyState(4321, 2), day: 12, honey: 28,
      managementTrail: [{ choiceId: 'feed_bees', day: 1, label: 'Feed bees', cost: '1 AP' }],
      managementHistory: { schemaVersion: 1, retainedCount: 1, omittedCount: 0, complete: true },
      experimentBaseline: baseline, notebook: { experiment: notebook },
      viewMode: 'beekeeper', focusLayout: false,
    };

    await mountState(runB);

    const trailSvg = host.querySelector('svg[data-audit-trail-strip="true"]');
    expect(trailSvg).toBeTruthy();
    expect(trailSvg.getAttribute('data-audit-trail-state')).toBe('one-change');
    expect(trailSvg.getAttribute('aria-hidden')).toBe('true');
    expect(trailSvg.querySelectorAll('text')).toHaveLength(0);
    expect(trailSvg.querySelectorAll('[data-audit-divergence="true"]')).toHaveLength(1);

    const expArrow = host.querySelector('svg[data-prediction-arrow="expected"]');
    const obsArrow = host.querySelector('svg[data-prediction-arrow="observed"]');
    expect(expArrow).toBeTruthy();
    expect(obsArrow).toBeTruthy();
    expect(expArrow.getAttribute('data-arrow-dir')).toBe('up');
    expect(obsArrow.getAttribute('data-arrow-dir')).toBe('up');
    expect(expArrow.getAttribute('aria-hidden')).toBe('true');
    expect(obsArrow.getAttribute('aria-hidden')).toBe('true');
    expect(expArrow.querySelectorAll('text')).toHaveLength(0);
    expect(obsArrow.querySelectorAll('text')).toHaveLength(0);

    const schedTimeline = host.querySelector('[data-experiment-schedule-timeline]');
    expect(schedTimeline).toBeTruthy();
    await act(async () => {
      schedTimeline.open = true;
      schedTimeline.dispatchEvent(new Event('toggle', { bubbles: true }));
      await Promise.resolve();
    });

    const matchedIcon = host.querySelector('svg[data-schedule-status-icon="matched"]');
    const exceptionIcon = host.querySelector('svg[data-schedule-status-icon="exception"]');
    expect(matchedIcon).toBeTruthy();
    expect(exceptionIcon).toBeTruthy();
    for (const icon of [matchedIcon, exceptionIcon]) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelectorAll('text')).toHaveLength(0);
    }
  });

  it('adds raycast-safe entrance guards, pollen specks, and frame lug markers to 3D hive without mutating pick keys', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const guardGroup = model.anchor.getObjectByName('entrance-guard-patrol');
    const pollenGroup = model.anchor.getObjectByName('pollen-landing-specks');
    const lugGroup = model.anchor.getObjectByName('selected-frame-lug-tabs');
    expect(guardGroup).toBeTruthy();
    expect(pollenGroup).toBeTruthy();
    expect(lugGroup).toBeTruthy();

    [guardGroup, pollenGroup, lugGroup].forEach((g) => {
      g.traverse((o) => {
        expect(model.picks).not.toContain(o);
        expect(o.userData && o.userData.partId).toBeUndefined();
      });
    });
    const partIds = Array.from(new Set(model.picks.map((p) => p && p.userData && p.userData.partId).filter(Boolean)));
    expect(partIds.length).toBeGreaterThanOrEqual(6);
    expect(partIds).toContain('brood_frames');
    expect(partIds).toContain('entrance');

    // Zero traffic hides guards (and enclosing pollen specks subtree)
    model.frame(1000, { traffic: 0, season: 1, pollenLevel: 0.8, smokeActive: false }, false);
    expect(guardGroup.visible).toBe(false);
    expect(lugGroup.visible).toBe(false);

    // Wintering or active smoke hides guards
    model.frame(1100, { traffic: 0.6, season: 3, pollenLevel: 0.8, smokeActive: false }, false);
    expect(guardGroup.visible).toBe(false);
    model.frame(1150, { traffic: 0.6, season: 1, pollenLevel: 0.8, smokeActive: true }, false);
    expect(guardGroup.visible).toBe(false);

    // Active summer/spring foraging reveals guards and toggles pollen specks by pollenLevel
    model.frame(1200, { traffic: 0.6, season: 1, pollenLevel: 0.05, smokeActive: false }, false);
    expect(guardGroup.visible).toBe(true);
    expect(pollenGroup.children.every((c) => !c.visible)).toBe(true);

    model.frame(1200, { traffic: 0.6, season: 1, pollenLevel: 0.85, smokeActive: false }, false);
    expect(guardGroup.visible).toBe(true);
    expect(pollenGroup.children.some((c) => c.visible)).toBe(true);
    const guard0RotAt1200 = guardGroup.children[0].rotation.y;

    model.frame(1700, { traffic: 0.6, season: 1, pollenLevel: 0.85, smokeActive: false }, false);
    expect(guardGroup.children[0].rotation.y).not.toBe(guard0RotAt1200);

    // Reduced motion locks guard patrol animation to clock=0
    model.frame(1200, { traffic: 0.6, season: 1, pollenLevel: 0.85, smokeActive: false }, true);
    const reducedRotA = guardGroup.children[0].rotation.y;
    model.frame(2500, { traffic: 0.6, season: 1, pollenLevel: 0.85, smokeActive: false }, true);
    expect(guardGroup.children[0].rotation.y).toBe(reducedRotA);

    // Selected-frame lug tabs track exploded frames 0 vs 5 and pulled state
    model.frame(3000, { traffic: 0.5, season: 1, exploded: true, pulled: false, frameIndex: 0 }, true);
    expect(lugGroup.visible).toBe(true);
    const zFrame0 = lugGroup.position.z;

    model.frame(3000, { traffic: 0.5, season: 1, exploded: true, pulled: false, frameIndex: 5 }, true);
    expect(lugGroup.visible).toBe(true);
    expect(lugGroup.position.z).not.toBe(zFrame0);

    model.frame(3100, { traffic: 0.5, season: 1, exploded: false, pulled: false, frameIndex: 3 }, true);
    expect(lugGroup.visible).toBe(false);
    model.frame(3100, { traffic: 0.5, season: 1, exploded: false, pulled: true, frameIndex: 3 }, true);
    expect(lugGroup.visible).toBe(true);
    expect(lugGroup.position.z).toBeGreaterThan(zFrame0);
  });
});

describe('Beehive enhancement pass — phase 24 (candidate27)', () => {
  let cfg;
  let host;
  let root;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhStatThresholdRuler & bhScoreContributionStack and renders zero-text Dashboard SVGs with forced-colors CSS', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhStatThresholdRuler('varroa', 5)).toMatchObject({ direction: 'lower', activeBand: 'healthy', clampedPct: 5, ticksPct: [10, 20] });
    expect(BH.bhStatThresholdRuler('varroa', 15).activeBand).toBe('watch');
    expect(BH.bhStatThresholdRuler('varroa', 24).activeBand).toBe('danger');
    expect(BH.bhStatThresholdRuler('disease', 45).activeBand).toBe('watch');
    expect(BH.bhStatThresholdRuler('disease', 46).activeBand).toBe('danger');
    expect(BH.bhStatThresholdRuler('morale', 35)).toMatchObject({ direction: 'higher', activeBand: 'danger', ticksPct: [40, 70] });
    expect(BH.bhStatThresholdRuler('foraging', 120)).toMatchObject({ clampedPct: 100, activeBand: 'healthy' });
    expect(BH.bhStatThresholdRuler('foraging', NaN).clampedPct).toBe(0);

    const stack = BH.bhScoreContributionStack([
      { id: 'workers', label: 'workforce', score: 80, weight: 30 },
      { id: 'queen', label: 'queen condition', score: 90, weight: 20 },
      { id: 'varroa', label: 'mite control', score: 50, weight: 20 },
      { id: 'morale', label: 'colony stability', score: 60, weight: 15 },
      { id: 'honey', label: 'combined food', score: 30, weight: 15 },
    ]);
    expect(stack.segments).toHaveLength(5);
    expect(stack.segments.map((s) => s.slotStartPct)).toEqual([0, 30, 50, 70, 85]);
    expect(stack.segments.map((s) => s.slotWidthPct)).toEqual([30, 20, 20, 15, 15]);
    expect(stack.segments[0]).toMatchObject({ id: 'workers', fillWidthPct: 24, pts: 24, tone: 'healthy' });
    expect(stack.segments[4]).toMatchObject({ id: 'honey', fillWidthPct: 4.5, pts: 4.5, tone: 'danger' });
    expect(stack.totalPts).toBeCloseTo(65.5, 1);

    await mountState({ viewMode: 'beekeeper', focusLayout: false, day: 10, varroaLevel: 18, morale: 62, diseaseRisk: 46, foragingEfficiency: 75 });

    const rulers = host.querySelectorAll('svg[data-stat-threshold-ruler]');
    expect(rulers).toHaveLength(4);
    for (const r of rulers) {
      expect(r.getAttribute('aria-hidden')).toBe('true');
      expect(r.getAttribute('focusable')).toBe('false');
      expect(r.querySelectorAll('text')).toHaveLength(0);
      expect(r.querySelectorAll('[data-ruler-segment-active="true"]')).toHaveLength(1);
      expect(r.querySelector('[data-ruler-marker="true"]')).toBeTruthy();
      expect(r.querySelector('[data-ruler-direction-arrow]')).toBeTruthy();
    }
    expect(host.querySelector('svg[data-stat-threshold-ruler="disease"]').getAttribute('data-ruler-active-band')).toBe('danger');

    const stackSvg = host.querySelector('svg[data-score-contribution-stack="true"]');
    expect(stackSvg).toBeTruthy();
    expect(stackSvg.getAttribute('aria-hidden')).toBe('true');
    expect(stackSvg.getAttribute('focusable')).toBe('false');
    expect(stackSvg.querySelectorAll('text')).toHaveLength(0);
    expect(stackSvg.querySelectorAll('[data-score-stack-slot]')).toHaveLength(5);
    expect(stackSvg.querySelectorAll('[data-score-stack-fill]')).toHaveLength(5);
    expect(stackSvg.querySelectorAll('[data-score-stack-divider]')).toHaveLength(4);

    expect(SRC_TEXT).toContain('.bee-stat-threshold-ruler, .bee-stat-threshold-ruler *, .bee-score-contribution-stack, .bee-score-contribution-stack * { forced-color-adjust:auto; }');
  });

  it('computes bhNotebookCaptureVisuals and renders bounded reading bars and capacity rails without unrecorded false bars', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const beekeeperCap = BH.bhBeekeeperNotebookCapture({
      ...BH.bhCreateNewColonyState(901, 1), day: 8, workers: 24000, honey: 50, syrup: 10, varroaLevel: 15, morale: 75,
    });
    const bkAdded = BH.bhNotebookCaptureVisuals(beekeeperCap, { evidence: '' }, 'beekeeper');
    expect(bkAdded.readingBars.health).toBeTruthy();
    expect(bkAdded.readingBars.mites).toEqual({ pct: 15, tone: 'watch' });
    expect(bkAdded.readingBars.stability).toEqual({ pct: 75, tone: 'healthy' });
    expect(bkAdded.readingBars.workers).toBeNull();
    expect(bkAdded.readingBars.food).toBeNull();
    expect(bkAdded.readingBars.syrup).toBeNull();
    expect(bkAdded.capacity).toMatchObject({ status: 'added', usedChars: 0, showIncoming: true });

    const bkDup = BH.bhNotebookCaptureVisuals(beekeeperCap, { evidence: beekeeperCap.text }, 'beekeeper');
    expect(bkDup.capacity).toMatchObject({ status: 'duplicate', showIncoming: false });

    const bkFull = BH.bhNotebookCaptureVisuals(beekeeperCap, { evidence: 'x'.repeat(1150) }, 'beekeeper');
    expect(bkFull.capacity.status).toBe('full');
    expect(bkFull.capacity.needed).toBeGreaterThan(0);

    const droneNoReserve = BH.bhDroneNotebookCapture({ active: true, runtime: { phase: 'flight', energy: 80, y: 120, distance: 300 } });
    const drVis = BH.bhNotebookCaptureVisuals(droneNoReserve, {}, 'drone');
    expect(drVis.readingBars.energy).toBeNull();
    expect(drVis.readingBars.altitude).toBeNull();

    const droneSetup = BH.bhDroneNotebookCapture({ active: false });
    expect(BH.bhNotebookCaptureVisuals(droneSetup, {}, 'drone').capacity).toMatchObject({ status: 'unavailable', showIncoming: false });

    await mountState({
      ...BH.bhCreateNewColonyState(901, 1),
      day: 8, workers: 24000, honey: 50, syrup: 10, varroaLevel: 15, morale: 75,
      viewMode: 'beekeeper', focusLayout: false, notebookOpen: true,
    });

    const colonyCap = host.querySelector('[data-colony-notebook-capture="true"]');
    expect(colonyCap).toBeTruthy();
    expect(colonyCap.querySelector('[data-capture-reading="health"] svg[data-capture-reading-bar="health"]')).toBeTruthy();
    expect(colonyCap.querySelector('[data-capture-reading="mites"] svg[data-capture-reading-bar="mites"]')).toBeTruthy();
    expect(colonyCap.querySelector('[data-capture-reading="workers"] svg[data-capture-reading-bar]')).toBeNull();
    expect(colonyCap.querySelector('[data-capture-reading="food"] svg[data-capture-reading-bar]')).toBeNull();
    const rail = colonyCap.querySelector('svg[data-capture-capacity-rail="true"]');
    expect(rail).toBeTruthy();
    expect(rail.getAttribute('data-capacity-status')).toBe('added');
    expect(rail.querySelector('[data-capacity-incoming="true"]')).toBeTruthy();
    for (const svg of colonyCap.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }
  });

  it('computes bhDroneConditionVisual and renders semantic warning icons and synchronized condition gauges', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhDroneConditionVisual('ground', { y: 18, vy: -2 })).toEqual({
      id: 'ground', iconKind: 'ground-descent', tone: 'danger', pct: 30, thresholdPct: 50, fillW: 48, thresholdX: 80,
    });
    expect(BH.bhDroneConditionVisual('climb', { speed: 6, stallWarning: true })).toEqual({
      id: 'climb', iconKind: 'slow-climb', tone: 'warning', pct: 25, thresholdPct: 35, fillW: 40, thresholdX: 56,
    });
    expect(BH.bhDroneConditionVisual('energy', { difficulty: 'hard', energy: 20.5 })).toEqual({
      id: 'energy', iconKind: 'low-energy', tone: 'healthy', pct: 25, thresholdPct: 25, fillW: 40, thresholdX: 40,
    });

    await mountState({ viewMode: 'drone', focusLayout: false });

    const launchBtn = host.querySelector('[data-flight-launch="normal"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => { launchBtn.click(); await Promise.resolve(); });

    const ds = window.__testHooks.beehive.droneStateRef.current;
    ds.phase = 'flight';
    ds.y = 18;
    ds.vy = -2;
    ds.speed = 6;
    ds.stallWarning = true;
    ds.energy = 15.75;

    const pauseBtn = host.querySelector('[data-beehive-flight-pause="true"]');
    expect(pauseBtn).toBeTruthy();
    await act(async () => { pauseBtn.click(); await Promise.resolve(); });

    const condSection = host.querySelector('[data-flight-conditions="true"]');
    expect(condSection).toBeTruthy();
    expect(condSection.hidden).toBe(false);
    expect(condSection.querySelector('svg[data-condition-icon="ground-descent"]')).toBeTruthy();
    expect(condSection.querySelector('svg[data-condition-icon="slow-climb"]')).toBeTruthy();
    expect(condSection.querySelector('svg[data-condition-icon="low-energy"]')).toBeTruthy();
    expect(condSection.querySelector('svg[data-condition-gauge="ground"]').getAttribute('data-gauge-pct')).toBe('30');
    expect(condSection.querySelector('svg[data-condition-gauge="climb"]').getAttribute('data-gauge-pct')).toBe('25');
    expect(condSection.querySelector('svg[data-condition-gauge="energy"]').getAttribute('data-gauge-pct')).toBe('15');
    for (const svg of condSection.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-flight-condition-list [data-flight-condition] svg,.bee-flight-condition-list [data-flight-condition] svg *{forced-color-adjust:auto;}');
  });

  it('computes bhDroneHistorySparkline with missing-altitude gap breaks and renders interactive selection cursor in BeeDroneHistoryInspector', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhDroneHistorySparkline([], 0)).toEqual({
      count: 0, selectedIndex: -1, cursorX: 160, barW: 4, points: [], altSegments: [], energyBars: [],
    });

    const log = [
      { turn: 1, action: 'Climb', seconds: 2, altitudeBefore: 20, altitude: 40, energyBefore: 96, energy: 90 },
      { turn: 2, action: 'Glide', seconds: 2, altitudeBefore: 40, altitude: 60, energyBefore: 90, energy: 75 },
      { turn: 3, action: 'Turn', seconds: 2, altitudeBefore: 60, altitude: null, energyBefore: 75, energy: 55 },
      { turn: 4, action: 'Dive', seconds: 2, altitudeBefore: 50, altitude: 30, energyBefore: 55, energy: 40 },
      { turn: 5, action: 'Level', seconds: 2, altitudeBefore: 30, altitude: 50, energyBefore: 40, energy: 30 },
    ];
    const spark = BH.bhDroneHistorySparkline(log, 1);
    expect(spark.count).toBe(5);
    expect(spark.selectedIndex).toBe(1);
    expect(spark.altSegments).toHaveLength(2);
    expect(spark.points).toHaveLength(4);
    expect(spark.points.find((p) => p.index === 1).selected).toBe(true);
    expect(spark.energyBars).toHaveLength(5);
    expect(spark.cursorX).toBe(spark.points.find((p) => p.index === 1).x);

    await mountState({
      viewMode: 'drone',
      focusLayout: false,
      drone: { lastRun: { difficulty: 'normal', scenario: 'standard', routePlan: 'direct', decisionLog: log } },
    });

    const disclosure = host.querySelector('[data-flight-history-disclosure="true"]');
    expect(disclosure).toBeTruthy();
    const summary = disclosure.querySelector('summary');
    await act(async () => { summary.click(); await Promise.resolve(); });

    const sparkSvg = disclosure.querySelector('svg[data-history-sparkline="true"]');
    expect(sparkSvg).toBeTruthy();
    expect(sparkSvg.getAttribute('aria-hidden')).toBe('true');
    expect(sparkSvg.querySelectorAll('text')).toHaveLength(0);
    expect(sparkSvg.querySelectorAll('[data-sparkline-alt-segment]')).toHaveLength(2);
    expect(sparkSvg.querySelectorAll('[data-sparkline-point]')).toHaveLength(4);
    expect(sparkSvg.querySelectorAll('[data-sparkline-energy]')).toHaveLength(5);
    expect(sparkSvg.getAttribute('data-sparkline-selected')).toBe('4');

    const prevBtn = disclosure.querySelector('[data-history-previous="true"]');
    expect(prevBtn).toBeTruthy();
    await act(async () => { prevBtn.click(); await Promise.resolve(); });
    expect(sparkSvg.getAttribute('data-sparkline-selected')).toBe('3');
    expect(sparkSvg.querySelector('[data-sparkline-point="3"]').getAttribute('data-selected')).toBe('true');
  });

  it('adds raycast-safe food-store-activity in 3D Colony Network scene without frame() allocations and respects winter, pause, and reduced motion', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const storeGroup = model.anchor.getObjectByName('food-store-activity');
    expect(storeGroup).toBeTruthy();
    expect(storeGroup.children).toHaveLength(6);
    storeGroup.traverse((o) => {
      expect(model.picks).not.toContain(o);
      expect(o.userData && o.userData.partId).toBeUndefined();
    });
    const partIds = new Set(model.picks.map((p) => p && p.userData && p.userData.partId).filter(Boolean));
    expect(partIds.has('home_hive')).toBe(true);
    expect(partIds.has('rival_hive')).toBe(true);
    expect(partIds.has('patch_a')).toBe(true);

    const structures = [
      { type: 'honey', x: 0.25, y: 0.35, level: 2 },
      { type: 'pollen', x: 0.45, y: 0.55, level: 3 },
      { type: 'guard', x: 0.6, y: 0.5, level: 1 },
    ];
    const geometriesBefore = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geometriesBefore.add(o.geometry); });

    model.frame(1000, { structures, showGamePieces: true, season: 1, paused: false }, false);
    expect(storeGroup.visible).toBe(true);
    expect(storeGroup.children[0].visible).toBe(true);
    expect(storeGroup.children[1].visible).toBe(true);
    expect(storeGroup.children[2].visible).toBe(false);

    const bee0 = storeGroup.children[0].getObjectByName('food-store-bee-0');
    const posAt1000 = bee0.position.clone();

    model.frame(1800, { structures, showGamePieces: true, season: 1, paused: false }, false);
    expect(bee0.position.equals(posAt1000)).toBe(false);

    const geometriesAfter = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geometriesAfter.add(o.geometry); });
    expect(geometriesAfter).toEqual(geometriesBefore);

    // Pause freezes orbit position across advancing timestamps
    model.frame(1000, { structures, showGamePieces: true, season: 1, paused: true }, false);
    const pausedA = bee0.position.clone();
    model.frame(2500, { structures, showGamePieces: true, season: 1, paused: true }, false);
    expect(bee0.position.equals(pausedA)).toBe(true);

    // Reduced motion freezes orbit position across advancing timestamps
    model.frame(1000, { structures, showGamePieces: true, season: 1, paused: false }, true);
    const reducedA = bee0.position.clone();
    model.frame(2500, { structures, showGamePieces: true, season: 1, paused: false }, true);
    expect(bee0.position.equals(reducedA)).toBe(true);

    // Winter or disabled showGamePieces hides food-store-activity
    model.frame(2500, { structures, showGamePieces: true, season: 3, paused: false }, false);
    expect(storeGroup.visible).toBe(false);
    model.frame(2500, { structures, showGamePieces: false, season: 1, paused: false }, false);
    expect(storeGroup.visible).toBe(false);
  });
});

describe('Beehive enhancement pass — phase 25 (candidate28)', () => {
  let cfg;
  let host;
  let root;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhPopulationShareVisual and renders zero-text caste share bars and queen condition scale in Population Guide', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhPopulationShareVisual(24000, 12000, 4000, 82)).toEqual({
      total: 40000,
      shares: { workers: 60, brood: 30, drones: 10 },
      widths: { workers: 115.2, brood: 57.6, drones: 19.2 },
      queenHealth: 82,
      queenMarkerX: 192.96,
      queenBand: 'healthy',
    });
    expect(BH.bhPopulationShareVisual(0, 0, 0, 20)).toEqual({
      total: 0,
      shares: { workers: 0, brood: 0, drones: 0 },
      widths: { workers: 0, brood: 0, drones: 0 },
      queenHealth: 20,
      queenMarkerX: 51.6,
      queenBand: 'danger',
    });

    await mountState({ viewMode: 'beekeeper', focusLayout: false, workers: 24000, brood: 12000, drones: 4000, queenHealth: 82 });

    const guide = host.querySelector('[data-colony-population-guide="true"]');
    expect(guide).toBeTruthy();
    expect(guide.querySelectorAll('button, input, select, a')).toHaveLength(0);
    expect(guide.querySelector('[data-queen-condition-meter] > span')).toBeTruthy();

    expect(guide.querySelector('svg[data-population-share-bar="workers"]').getAttribute('data-share-pct')).toBe('60');
    expect(guide.querySelector('svg[data-population-share-bar="brood"]').getAttribute('data-share-pct')).toBe('30');
    expect(guide.querySelector('svg[data-population-share-bar="drones"]').getAttribute('data-share-pct')).toBe('10');

    const queenScale = guide.querySelector('svg[data-queen-condition-scale="true"]');
    expect(queenScale).toBeTruthy();
    expect(queenScale.getAttribute('data-queen-band')).toBe('healthy');
    for (const svg of guide.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-colony-queen-meter > span { background:Highlight; forced-color-adjust:none; }');
    expect(SRC_TEXT).toContain('.bee-population-share-bar, .bee-population-share-bar *, .bee-queen-condition-scale, .bee-queen-condition-scale * { forced-color-adjust:auto; }');
  });

  it('computes bhMissionBriefVisuals and renders bounded brief bars and inquiry step icons without progressbar roles', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const vis = BH.bhMissionBriefVisuals('beekeeper', [
      ['42.0 lb', 'Combined food'],
      ['12 / 100', 'Mite pressure'],
      ['6 days', 'Inspection age'],
    ], 1, { currentReserve: 30 });
    expect(vis.viewMode).toBe('beekeeper');
    expect(vis.metrics[0]).toMatchObject({ label: 'Combined food', available: true, pct: 70, thresholdX: 100, tone: 'healthy' });
    expect(vis.metrics[1]).toMatchObject({ label: 'Mite pressure', available: true, pct: 12, thresholdX: 41.2, tone: 'healthy' });
    expect(vis.metrics[2]).toMatchObject({ label: 'Inspection age', available: false, fillWidth: 0 });
    expect(vis.steps.map((s) => `${s.id}:${s.active}`)).toEqual(['observe:false', 'decide:true', 'act:false', 'explain:false']);

    await mountState({ viewMode: 'beekeeper', focusLayout: false, missionBriefOpen: true, honey: 36, syrup: 6, varroaLevel: 12 });
    const bkBrief = host.querySelector('[data-beehive-learning-brief="true"]');
    expect(bkBrief).toBeTruthy();
    expect(bkBrief.querySelectorAll('[role="progressbar"], [role="meter"]')).toHaveLength(0);
    expect(bkBrief.querySelectorAll('svg[data-brief-metric-bar]').length).toBeGreaterThanOrEqual(2);
    expect(Array.from(bkBrief.querySelectorAll('svg[data-inquiry-step-icon]')).map((n) => n.getAttribute('data-inquiry-step-icon'))).toEqual([
      'observe', 'decide', 'act', 'explain',
    ]);
    for (const svg of bkBrief.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }

    await mountState({ viewMode: 'drone', focusLayout: false, missionBriefOpen: true, drone: { active: false } });
    const droneBrief = host.querySelector('[data-beehive-learning-brief="true"]');
    expect(droneBrief).toBeTruthy();
    expect(droneBrief.querySelectorAll('[role="progressbar"], [role="meter"]')).toHaveLength(0);
    expect(droneBrief.querySelectorAll('svg[data-inquiry-step-icon]')).toHaveLength(4);
    expect(SRC_TEXT).toContain('.bee-brief-metric-bar, .bee-brief-metric-bar *, .bee-inquiry-step-icon, .bee-inquiry-step-icon * { forced-color-adjust:auto; }');
  });

  it('computes bhLensVerdictVisual and renders shared topic scale rails and Cell Lens hex verdict glyph', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhLensVerdictVisual(false, false, null, null)).toMatchObject({ status: 'unavailable', available: false });
    const sameVis = BH.bhLensVerdictVisual(
      true,
      false,
      { available: true, roleId: 'honey', selected: { u: 0.4, v: 0.5 } },
      { available: true, roleId: 'honey', selected: { u: 0.4, v: 0.5 } }
    );
    expect(sameVis).toMatchObject({ status: 'same', available: true, heldRole: 'honey', currentRole: 'honey' });
    expect(sameVis.heldFill).toBeTruthy();
    expect(sameVis.heldFill).toBe(sameVis.currentFill);

    const changedVis = BH.bhLensVerdictVisual(
      true,
      true,
      { available: true, roleId: 'empty', selected: { u: 0.2, v: 0.3 } },
      { available: true, roleId: 'brood', selected: { u: 0.7, v: 0.6 } }
    );
    expect(changedVis).toMatchObject({ status: 'changed', available: true, heldRole: 'empty', currentRole: 'brood' });

    await mountState({ ...BH.bhCreateNewColonyState(808, 1), viewMode: 'beekeeper', beeView: 'hive', focusLayout: false, workers: 24000, brood: 12000, honey: 45, pollen: 25, queenHealth: 85 });

    const holdBtn = host.querySelector('[data-interior-hold="true"]');
    expect(holdBtn).toBeTruthy();
    expect(holdBtn.disabled).toBe(false);
    await act(async () => { holdBtn.click(); await Promise.resolve(); });

    const readings = host.querySelector('[data-interior-topic-readings]');
    expect(readings).toBeTruthy();
    expect(readings.querySelectorAll('svg[data-topic-reading-bar="held"]').length).toBeGreaterThan(0);
    expect(readings.querySelectorAll('svg[data-topic-reading-bar="current"]').length).toBeGreaterThan(0);

    const lensToggle = host.querySelector('[data-interior-lens-toggle="true"]');
    expect(lensToggle).toBeTruthy();
    await act(async () => { lensToggle.click(); await Promise.resolve(); });

    const firstCell = host.querySelector('[data-interior-cell-position]');
    expect(firstCell).toBeTruthy();
    await act(async () => {
      firstCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const verdictCard = host.querySelector('#beehive-interior-lens-verdict');
    expect(verdictCard).toBeTruthy();
    expect(verdictCard.querySelectorAll('button, input, select, a')).toHaveLength(0);
    const glyph = verdictCard.querySelector('svg[data-lens-verdict-glyph="same"]');
    expect(glyph).toBeTruthy();
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(glyph.querySelectorAll('text')).toHaveLength(0);
    expect(SRC_TEXT).toContain('.bee-lens-verdict-glyph, .bee-lens-verdict-glyph * { forced-color-adjust:auto; }');
  });

  it('computes bhDroneLaunchBudgetVisual and renders synchronized difficulty launch budget bars', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhDroneLaunchBudgetVisual({ timer: 135, energy: 112, maxEnergy: 112 })).toEqual({
      timerPct: 90,
      capPct: 89.6,
      energyPct: 89.6,
      timerWidth: 154.8,
      capacityWidth: 154.11,
      energyWidth: 154.11,
      penalized: false,
    });
    expect(BH.bhDroneLaunchBudgetVisual({ timer: 90, energy: 55, maxEnergy: 75 })).toEqual({
      timerPct: 60,
      capPct: 60,
      energyPct: 44,
      timerWidth: 103.2,
      capacityWidth: 103.2,
      energyWidth: 75.68,
      penalized: true,
    });

    await mountState({ viewMode: 'drone', focusLayout: false, honey: 4, pollen: 4, varroaLevel: 45, drone: { active: false } });
    for (const key of ['easy', 'normal', 'hard']) {
      const svg = host.querySelector(`svg[data-launch-budget-bars="${key}"]`);
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('data-energy-penalized')).toBe('true');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('text')).toHaveLength(0);
    }
    const stressedLaunchBtn = host.querySelector('button[data-flight-launch]');
    expect(stressedLaunchBtn.getAttribute('aria-describedby')).toBeTruthy();

    await mountState({ viewMode: 'drone', focusLayout: false, honey: 80, pollen: 60, varroaLevel: 2, drone: { active: false } });
    for (const key of ['easy', 'normal', 'hard']) {
      const svg = host.querySelector(`svg[data-launch-budget-bars="${key}"]`);
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('data-energy-penalized')).toBe('false');
    }
    expect(SRC_TEXT).toContain('.bee-launch-budget-bars,.bee-launch-budget-bars *{forced-color-adjust:auto;}');
  });

  it('adds zero-allocation 3D drone-launch-hive-pad and climb corridor respecting pause, eco quality, and inspection views', async () => {
    const rafQueue = [];
    const canceledRaf = new Set();
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      const id = rafQueue.length + 1;
      rafQueue.push({ id, cb });
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => { canceledRaf.add(id); }));
    const nextActiveRaf = () => {
      while (rafQueue.length) {
        const item = rafQueue.shift();
        if (!canceledRaf.has(item.id)) return item.cb;
      }
      return null;
    };

    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    let capturedScene = null;
    THREE.WebGLRenderer = function FakeWebGLRenderer() {
      this.domElement = document.createElement('canvas');
      this.shadowMap = { enabled: false, type: 0 };
      this.outputEncoding = 0;
      this.toneMapping = 0;
      this.toneMappingExposure = 1;
      this.capabilities = { getMaxAnisotropy: () => 4 };
      this.renderLists = { dispose: vi.fn() };
      this.setSize = vi.fn();
      this.setPixelRatio = vi.fn();
      this.setClearColor = vi.fn();
      this.getContext = vi.fn(() => ({ getParameter: () => 0 }));
      this.render = vi.fn((scene) => { capturedScene = scene; });
      this.dispose = vi.fn();
    };
    window.THREE = THREE;
    window.AlloPostFXEnabled = false;
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve(THREE));

    await mountState({ viewMode: 'drone', focusLayout: false, drone: { active: false, difficulty: 'easy', pacing: 'live' } });
    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const initCb = nextActiveRaf();
    expect(typeof initCb).toBe('function');
    await act(async () => { initCb(1000); await Promise.resolve(); });
    expect(capturedScene).toBeTruthy();

    const launchPad = capturedScene.getObjectByName('drone-launch-hive-pad');
    const hiveStand = capturedScene.getObjectByName('drone-launch-hive-stand');
    const halo = capturedScene.getObjectByName('drone-launch-entrance-halo');
    const climbCorridor = capturedScene.getObjectByName('drone-launch-climb-corridor');
    const chev0 = capturedScene.getObjectByName('drone-launch-chevron-0');
    const chev1 = capturedScene.getObjectByName('drone-launch-chevron-1');
    const chev2 = capturedScene.getObjectByName('drone-launch-chevron-2');
    expect(launchPad).toBeTruthy();
    expect(hiveStand).toBeTruthy();
    expect(hiveStand.position.toArray()).toEqual([0, 0, 22]);
    expect(halo).toBeTruthy();
    expect(climbCorridor).toBeTruthy();
    expect(chev0).toBeTruthy();
    expect(chev1).toBeTruthy();
    expect(chev2).toBeTruthy();

    const geometriesBefore = new Set();
    launchPad.traverse((o) => { if (o.geometry) geometriesBefore.add(o.geometry); });

    const ds = window.__testHooks.beehive.droneStateRef.current;
    ds.phase = 'flight';
    ds.reachedDca = false;
    ds.z = 0;

    const stepFrame = async (ts) => {
      const cb = nextActiveRaf();
      expect(typeof cb).toBe('function');
      await act(async () => { cb(ts); await Promise.resolve(); });
    };
    const maybeStepFrame = async (ts) => {
      const cb = nextActiveRaf();
      if (cb) await act(async () => { cb(ts); await Promise.resolve(); });
    };

    await stepFrame(1000);
    const scaleA = chev0.scale.x;
    const opacityA = chev0.material.opacity;
    await stepFrame(1450);
    expect(chev0.scale.x).not.toBe(scaleA);
    expect(chev0.material.opacity).not.toBe(opacityA);

    const geometriesAfter = new Set();
    launchPad.traverse((o) => { if (o.geometry) geometriesAfter.add(o.geometry); });
    expect(geometriesAfter).toEqual(geometriesBefore);

    // Pause freezes entrance halo & chevron animation across advancing timestamps
    const pauseBtn = host.querySelector('[data-beehive-flight-pause="true"]');
    expect(pauseBtn).toBeTruthy();
    capturedScene = null;
    await act(async () => {
      pauseBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(ds.paused).toBe(true);
    await stepFrame(2000);
    expect(capturedScene).toBeTruthy();
    const pausedPad = capturedScene.getObjectByName('drone-launch-hive-pad');
    const pausedStand = capturedScene.getObjectByName('drone-launch-hive-stand');
    const pausedHalo = capturedScene.getObjectByName('drone-launch-entrance-halo');
    const pausedCorridor = capturedScene.getObjectByName('drone-launch-climb-corridor');
    const pausedChev0 = capturedScene.getObjectByName('drone-launch-chevron-0');
    expect(pausedHalo.material.opacity).toBe(0.5);
    expect(pausedChev0.scale.x).toBe(1);
    const pausedChevOpacity = pausedChev0.material.opacity;
    await stepFrame(2900);
    expect(pausedHalo.material.opacity).toBe(0.5);
    expect(pausedChev0.scale.x).toBe(1);
    expect(pausedChev0.material.opacity).toBe(pausedChevOpacity);

    // Eco graphics quality sheds the climb corridor while keeping the launch hive stand
    const qualitySelect = host.querySelector('[data-flight-graphics-mode="true"]');
    expect(qualitySelect).toBeTruthy();
    await act(async () => {
      qualitySelect.value = 'eco';
      qualitySelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await maybeStepFrame(3100);
    expect(pausedCorridor.visible).toBe(false);
    expect(pausedStand.visible).toBe(true);

    await act(async () => {
      qualitySelect.value = 'high';
      qualitySelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await maybeStepFrame(3200);
    expect(pausedCorridor.visible).toBe(true);

    // Field inspection view ('shrub') hides launchPad completely
    const shrubBtn = host.querySelector('[data-flight-inspection-view="shrub"]');
    expect(shrubBtn).toBeTruthy();
    expect(shrubBtn.disabled).toBe(false);
    await act(async () => { shrubBtn.click(); await Promise.resolve(); });
    await maybeStepFrame(3300);
    expect(pausedPad.visible).toBe(false);
  });
});

describe('Beehive enhancement pass — phase 26 (candidate29)', () => {
  let cfg;
  let host;
  let root;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhPlayCoachVisuals and renders Play Coach phase emblem and bounded context bars without mutating unrecorded units', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const sample = BH.bhPlayCoachVisuals('beekeeper', 'colony', [
      ['Model day', '15'],
      ['Action points', '2 / 3'],
      ['Model health', '78 / 100'],
      ['Energy left', '12 (units not recorded)'],
      ['Flight energy', '50% of reserve'],
      ['Rival health', '40%'],
      ['Peak altitude', '140 model ft'],
    ]);
    expect(sample.phaseIcon).toBeTruthy();
    expect(sample.readings[0]).toMatchObject({ label: 'Model day', bounded: false, kind: null });
    expect(sample.readings[1]).toMatchObject({ label: 'Action points', bounded: true, kind: 'pips', activePips: 2, tone: 'healthy' });
    expect(sample.readings[2]).toMatchObject({ label: 'Model health', bounded: true, kind: 'bar', pct: 78, tone: 'healthy' });
    expect(sample.readings[3]).toMatchObject({ label: 'Energy left', bounded: false, kind: null });
    expect(sample.readings[4]).toMatchObject({ label: 'Flight energy', bounded: true, kind: 'bar', pct: 50, tone: 'watch' });
    expect(sample.readings[5]).toMatchObject({ label: 'Rival health', bounded: true, kind: 'bar', pct: 40, tone: 'watch' });
    expect(sample.readings[6]).toMatchObject({ label: 'Peak altitude', bounded: false, kind: null });

    await mountState({ ...BH.bhCreateNewColonyState(701, 1), viewMode: 'beekeeper', focusLayout: false, day: 15, actionPoints: 2, workers: 24000, honey: 60, brood: 8000, queenHealth: 85 });
    const coach = host.querySelector('[data-beehive-play-coach="true"]');
    expect(coach).toBeTruthy();
    const phaseIcon = coach.querySelector('svg[data-coach-phase-icon="colony"]');
    expect(phaseIcon).toBeTruthy();
    expect(phaseIcon.getAttribute('aria-hidden')).toBe('true');
    expect(phaseIcon.querySelectorAll('text, title')).toHaveLength(0);

    const apDd = coach.querySelector('[data-coach-reading="Action points"] dd');
    expect(apDd.textContent).toBe('2 / 3');
    expect(apDd.querySelector('svg[data-coach-reading-bar="pips"]')).toBeTruthy();
    expect(coach.querySelector('[data-coach-reading="Model day"] dd svg')).toBeNull();
    expect(coach.querySelector('[data-coach-reading="Model health"] dd svg[data-coach-reading-bar="bar"]')).toBeTruthy();

    await mountState({
      viewMode: 'drone',
      focusLayout: false,
      drone: {
        active: false,
        lastRun: { success: true, maxAlt: 140, energyLeft: 12, energyUnits: 'legacy' },
      },
    });
    const droneCoach = host.querySelector('[data-beehive-play-coach="true"]');
    expect(droneCoach.querySelector('svg[data-coach-phase-icon="review"]')).toBeTruthy();
    const unrecordedDd = droneCoach.querySelector('[data-coach-reading="Energy left"] dd');
    expect(unrecordedDd.textContent).toBe('12 (units not recorded)');
    expect(unrecordedDd.querySelector('svg')).toBeNull();
    for (const svg of droneCoach.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-coach-phase-icon,.bee-coach-reading-bar,.bee-coach-reading-bar * { forced-color-adjust:auto; }');
  });

  it('computes bhPerspectiveCardVisual and renders vector role emblems and live readiness strips in Perspective Switcher', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const bkOk = BH.bhPerspectiveCardVisual('beekeeper', { colonySurvived: true, colonyHealth: 82, activeEvent: false, varroaLevel: 5, honey: 60, currentReserve: 30 });
    expect(bkOk).toMatchObject({ roleId: 'beekeeper', pct: 82, tone: 'healthy' });
    expect(bkOk.emblemPaths.length).toBeGreaterThanOrEqual(3);
    const bkDead = BH.bhPerspectiveCardVisual('beekeeper', { colonySurvived: false, colonyHealth: 0 });
    expect(bkDead).toMatchObject({ roleId: 'beekeeper', pct: 0, tone: 'danger' });
    const qWin = BH.bhPerspectiveCardVisual('queen', { queenResult: 'victory' });
    expect(qWin).toMatchObject({ roleId: 'queen', pct: 100, tone: 'healthy' });
    const dPrev = BH.bhPerspectiveCardVisual('drone', { droneFlightActive: false, droneLastRun: { success: false } });
    expect(dPrev).toMatchObject({ roleId: 'drone', pct: 45, tone: 'watch' });

    await mountState({
      ...BH.bhCreateNewColonyState(702, 1),
      viewMode: 'beekeeper',
      focusLayout: false,
      honey: 65,
      queen: { active: true, paused: true, territory: 64 },
      drone: { active: false, lastRun: { success: true, maxAlt: 120, energyLeft: 60, energyUnits: 'percent-of-difficulty-reserve' } },
    });
    const switcher = host.querySelector('[data-beehive-mode-switcher="true"]');
    expect(switcher).toBeTruthy();
    for (const id of ['beekeeper', 'queen', 'drone']) {
      const btn = switcher.querySelector(`button[data-beehive-mode-tab="${id}"]`);
      expect(btn).toBeTruthy();
      expect(btn.getAttribute('aria-label')).toBeTruthy();
      const emblem = btn.querySelector(`svg[data-perspective-emblem="${id}"]`);
      const meter = btn.querySelector(`svg[data-perspective-meter="${id}"]`);
      expect(emblem).toBeTruthy();
      expect(meter).toBeTruthy();
      expect(emblem.getAttribute('aria-hidden')).toBe('true');
      expect(emblem.getAttribute('focusable')).toBe('false');
      expect(meter.getAttribute('aria-hidden')).toBe('true');
      expect(meter.getAttribute('focusable')).toBe('false');
      expect(emblem.querySelectorAll('text, title')).toHaveLength(0);
      expect(meter.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-perspective-emblem,.bee-perspective-meter,.bee-perspective-meter * { forced-color-adjust:auto; }');
  });

  it('computes bhDroneManeuverChoiceVisual and renders duration and control-channel bars without altering 32x32 choice icons', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const turnVis = BH.bhDroneManeuverChoiceVisual('left', 0.2);
    const descendVis = BH.bhDroneManeuverChoiceVisual('descend', 0.5);
    const coastVis = BH.bhDroneManeuverChoiceVisual('coast', 1);
    const navVis = BH.bhDroneManeuverChoiceVisual('navigate', 2);
    expect(turnVis).toMatchObject({ id: 'left', seconds: 0.2, durationPct: 10, mode: 'turn', thrust: false, vertical: 'none', yaw: 'left' });
    expect(descendVis).toMatchObject({ id: 'descend', seconds: 0.5, durationPct: 25, mode: 'vertical', thrust: false, vertical: 'down', yaw: 'none' });
    expect(coastVis).toMatchObject({ id: 'coast', seconds: 1, durationPct: 50, mode: 'glide', thrust: false, vertical: 'none', yaw: 'none' });
    expect(navVis).toMatchObject({ id: 'navigate', seconds: 2, durationPct: 100, mode: 'assist', thrust: true, vertical: 'assist', yaw: 'assist' });
    expect(turnVis.durationWidth).toBeLessThan(descendVis.durationWidth);
    expect(descendVis.durationWidth).toBeLessThan(coastVis.durationWidth);
    expect(coastVis.durationWidth).toBeLessThan(navVis.durationWidth);

    window.StemLab.ensureThree = vi.fn(() => Promise.reject(new Error('no-gl')));
    await mountState({ viewMode: 'drone', focusLayout: false, drone: { active: false, difficulty: 'easy', pacing: 'steps', graphicsMode: 'eco' } });
    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    expect(launchBtn).toBeTruthy();
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const panel = host.querySelector('[data-flight-decision-panel="true"]');
    expect(panel).toBeTruthy();
    expect(panel.querySelectorAll('svg[data-flight-choice-icon]')).toHaveLength(7);
    const durationBars = panel.querySelectorAll('svg[data-maneuver-duration-bar]');
    expect(durationBars).toHaveLength(7);
    const selectedBar = panel.querySelector('[data-flight-maneuver-ready] svg[data-selected-maneuver-bar]');
    expect(selectedBar).toBeTruthy();
    for (const svg of [...durationBars, selectedBar]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title, a, button')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-maneuver-duration-bar,.bee-maneuver-duration-bar * {forced-color-adjust:auto;}');
  });

  it('computes bhTimingLandmarkVisual and renders horizon pin and signed gap rails on Management Timing Landmark cards', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const firstVis = BH.bhTimingLandmarkVisual({ day: 37, offset: 22, delta: 120 }, 30, 300);
    const largestVis = BH.bhTimingLandmarkVisual({ day: 45, offset: 30, delta: -300 }, 30, -300);
    expect(firstVis).toMatchObject({ day: 37, offset: 22, direction: 'positive' });
    expect(largestVis).toMatchObject({ day: 45, offset: 30, direction: 'negative', gapWidth: 68, gapX: 12, pinX: 152 });
    expect(firstVis.pinX).toBeLessThan(largestVis.pinX);
    expect(firstVis.gapX).toBe(80);

    await mountState({ ...BH.bhCreateNewColonyState(777, 3), viewMode: 'beekeeper', focusLayout: true, day: 15, workers: 24000, honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, show3dHive: false });
    const previewDetails = host.querySelector('[data-management-preview]');
    expect(previewDetails).toBeTruthy();
    await act(async () => {
      previewDetails.open = true;
      previewDetails.dispatchEvent(new Event('toggle'));
      await Promise.resolve();
    });
    const choiceSelect = host.querySelector('[data-management-preview-choice]');
    const horizonSelect = host.querySelector('[data-management-preview-horizon]');
    const metricSelect = host.querySelector('[data-preview-timeline-metric]');
    expect(choiceSelect).toBeTruthy();
    await act(async () => {
      choiceSelect.value = 'requeen';
      choiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      horizonSelect.value = '30';
      horizonSelect.dispatchEvent(new Event('change', { bubbles: true }));
      metricSelect.value = 'workers';
      metricSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    const firstBar = host.querySelector('svg[data-landmark-horizon-bar="first"]');
    const largestBar = host.querySelector('svg[data-landmark-horizon-bar="largest"]');
    expect(firstBar).toBeTruthy();
    expect(largestBar).toBeTruthy();
    for (const svg of [firstBar, largestBar]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    const firstPin = Number(firstBar.querySelector('.bee-landmark-pin').getAttribute('cx'));
    const largestPin = Number(largestBar.querySelector('.bee-landmark-pin').getAttribute('cx'));
    expect(firstPin).toBeLessThanOrEqual(largestPin);
    expect(SRC_TEXT).toContain('.bee-landmark-horizon-bar,.bee-landmark-horizon-bar * { forced-color-adjust:auto; }');
  });

  it('adds raycast-safe, zero-allocation 3D comb waggle dancer and follower bees tracking active brood frame state', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const danceGroup = model.anchor.getObjectByName('comb-waggle-dance');
    const trace = model.anchor.getObjectByName('waggle-figure-eight-trace');
    const scout = model.anchor.getObjectByName('waggle-scout-bee');
    const follower0 = model.anchor.getObjectByName('waggle-follower-0');
    const follower1 = model.anchor.getObjectByName('waggle-follower-1');
    expect(danceGroup).toBeTruthy();
    expect(trace).toBeTruthy();
    expect(scout).toBeTruthy();
    expect(follower0).toBeTruthy();
    expect(follower1).toBeTruthy();

    danceGroup.traverse((o) => {
      expect(model.picks).not.toContain(o);
      expect(o.userData && o.userData.partId).toBeUndefined();
    });

    const geosBefore = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosBefore.add(o.geometry); });

    // Hidden when hive is closed even in summer
    model.frame(1000, { exploded: false, pulled: false, season: 1, traffic: 0.75, pollenLevel: 0.8, smokeActive: false }, false);
    expect(danceGroup.visible).toBe(false);

    // Hidden during winter dearth or smoke even when open
    model.frame(1100, { exploded: true, pulled: false, season: 3, traffic: 0.75, pollenLevel: 0.8, smokeActive: false }, false);
    expect(danceGroup.visible).toBe(false);
    model.frame(1150, { exploded: true, pulled: false, season: 1, traffic: 0.75, pollenLevel: 0.8, smokeActive: true }, false);
    expect(danceGroup.visible).toBe(false);

    // Visible during warm foraging inspection and rides pulled frame 0 vs 3
    model.frame(1200, { exploded: false, pulled: true, frameIndex: 0, season: 1, traffic: 0.75, pollenLevel: 0.8, smokeActive: false }, true);
    expect(danceGroup.visible).toBe(true);
    const zFrame0 = danceGroup.position.z;
    model.frame(1200, { exploded: false, pulled: true, frameIndex: 3, season: 1, traffic: 0.75, pollenLevel: 0.8, smokeActive: false }, true);
    expect(danceGroup.visible).toBe(true);
    expect(danceGroup.position.z).not.toBe(zFrame0);

    // Reduced motion locks scout & follower pose across timestamps
    const redPosX = scout.position.x;
    const redRotY = scout.rotation.y;
    model.frame(2600, { exploded: false, pulled: true, frameIndex: 3, season: 1, traffic: 0.75, pollenLevel: 0.8, smokeActive: false }, true);
    expect(scout.position.x).toBe(redPosX);
    expect(scout.rotation.y).toBe(redRotY);

    // Live motion animates scout along figure-eight without allocating new geometries
    model.frame(1000, { exploded: true, pulled: true, frameIndex: 2, season: 1, traffic: 0.8, pollenLevel: 0.8, smokeActive: false }, false);
    const xA = scout.position.x;
    model.frame(1600, { exploded: true, pulled: true, frameIndex: 2, season: 1, traffic: 0.8, pollenLevel: 0.8, smokeActive: false }, false);
    expect(scout.position.x).not.toBe(xA);

    const geosAfter = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosAfter.add(o.geometry); });
    expect(geosAfter).toEqual(geosBefore);
  });
});

describe('Beehive enhancement pass — phase 27 (candidate30)', () => {
  let cfg;
  let host;
  let root;
  let rafQueue;

  beforeEach(() => {
    resetStemLab();
    rafQueue = [];
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafQueue.push(cb); return rafQueue.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhFlowNavVisuals and renders zero-text inquiry emblems and readiness meters on all 5 learning flow links', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const initial = BH.bhFlowNavVisuals({ viewMode: 'beekeeper', day: 0 });
    expect(initial.steps.map((s) => s.id)).toEqual(['focus', 'play', 'learn', 'explain', 'mastery']);
    expect(initial.byId.play.state).toBe('ready');
    expect(initial.byId.explain.state).toBe('ready');

    const advanced = BH.bhFlowNavVisuals({
      viewMode: 'queen',
      day: 10,
      queen: { active: true, day: 6, result: 'victory' },
      drone: { active: false, lastRun: { success: true } },
      notebook: {
        queen: { prediction: 'Shared patches stay reachable', evidence: 'Measured 2 routes', explanation: 'Competition is resource-mediated' },
        synthesis: 'All three roles share colony constraints',
      },
    });
    expect(advanced.byId.focus.state).toBe('recorded');
    expect(advanced.byId.play.state).toBe('recorded');
    expect(advanced.byId.explain.state).toBe('recorded');
    expect(advanced.byId.mastery.state).toBe('recorded');
    expect(advanced.byId.explain.fillWidth).toBeGreaterThan(initial.byId.explain.fillWidth);

    await mountState({
      ...BH.bhCreateNewColonyState(730, 1),
      viewMode: 'beekeeper',
      day: 8,
      notebook: { beekeeper: { prediction: 'Higher nectar flow', evidence: 'Day 8 stores up' } },
    });
    const nav = host.querySelector('nav[data-beehive-flow-nav="true"]');
    expect(nav).toBeTruthy();
    const icons = nav.querySelectorAll('svg[data-flow-step-icon]');
    const meters = nav.querySelectorAll('svg[data-flow-step-meter]');
    expect(icons).toHaveLength(5);
    expect(meters).toHaveLength(5);
    expect(nav.querySelector('svg[data-flow-step-meter="explain"]').getAttribute('data-flow-state')).toBe('recorded');
    for (const svg of [...icons, ...meters]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-flow-step-icon,.bee-flow-step-icon *,.bee-flow-step-meter,.bee-flow-step-meter * { forced-color-adjust:auto; }');
  });

  it('computes bhDroneTrainingVisual and syncs the 5-step flight-school stepper cleanly without spurious mutations while paused', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const step1 = BH.bhDroneTrainingVisual({ active: true, complete: false, index: 0, total: 5 });
    expect(step1).toMatchObject({ state: 'active', completedCount: 0, activeStep: 1 });
    expect(step1.pips.map((p) => p.state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(step1.rails.map((r) => r.done)).toEqual([false, false, false, false]);

    const step3 = BH.bhDroneTrainingVisual({ active: true, complete: false, index: 2, total: 5 });
    expect(step3).toMatchObject({ state: 'active', completedCount: 2, activeStep: 3 });
    expect(step3.pips.map((p) => p.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(step3.rails.map((r) => r.done)).toEqual([true, true, false, false]);

    const done = BH.bhDroneTrainingVisual({ active: true, complete: true, index: 5, total: 5 });
    expect(done).toMatchObject({ state: 'complete', completedCount: 5, activeStep: 5 });
    expect(done.pips.every((p) => p.state === 'done')).toBe(true);
    expect(done.rails.every((r) => r.done === true)).toBe(true);

    window.StemLab.ensureThree = vi.fn(() => Promise.reject(new Error('no-gl')));
    await mountState({ viewMode: 'drone', focusLayout: true, drone: { active: false, difficulty: 'easy', pacing: 'live', graphicsMode: 'eco' } });
    const launchEasy = host.querySelector('[data-flight-launch="easy"]');
    expect(launchEasy).toBeTruthy();
    await act(async () => {
      launchEasy.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const trainingPanel = host.querySelector('[data-flight-training="true"]');
    expect(trainingPanel).toBeTruthy();
    const stepper = trainingPanel.querySelector('svg[data-flight-training-stepper="true"]');
    expect(stepper).toBeTruthy();
    expect(stepper.getAttribute('aria-hidden')).toBe('true');
    expect(stepper.getAttribute('focusable')).toBe('false');
    expect(stepper.querySelectorAll('text, title')).toHaveLength(0);
    expect(stepper.querySelectorAll('[data-training-rail]')).toHaveLength(4);
    expect(stepper.querySelectorAll('[data-training-pip]')).toHaveLength(5);
    expect(stepper.querySelector('[data-training-pip="1"]').getAttribute('data-pip-state')).toBe('current');

    // No DOM mutations should fire while paused on Step 1 when animation frames tick unchanged state.
    window.__testHooks.beehive.droneStateRef.current.paused = true;
    const t0 = performance.now() + 1000;
    const recordedMutations = [];
    const observer = new MutationObserver((records) => {
      recordedMutations.push(...records);
    });
    observer.observe(trainingPanel, { attributes: true, childList: true, characterData: true, subtree: true });
    await act(async () => {
      const latestRaf = rafQueue[rafQueue.length - 1];
      if (typeof latestRaf === 'function') latestRaf(t0);
      await Promise.resolve();
    });
    expect(recordedMutations).toHaveLength(0);

    // Advancing the flight state to Step 2 updates the stepper attributes via syncDroneInstruments.
    window.__testHooks.beehive.droneStateRef.current.speed = 2.4;
    await act(async () => {
      const latestRaf = rafQueue[rafQueue.length - 1];
      if (typeof latestRaf === 'function') latestRaf(t0 + 500);
      await Promise.resolve();
    });
    observer.disconnect();
    expect(stepper.getAttribute('data-stepper-completed')).toBe('1');
    expect(stepper.querySelector('[data-training-pip="1"]').getAttribute('data-pip-state')).toBe('done');
    expect(stepper.querySelector('[data-training-pip="2"]').getAttribute('data-pip-state')).toBe('current');
    expect(stepper.querySelector('[data-training-rail="0"]').getAttribute('data-rail-done')).toBe('true');
    expect(SRC_TEXT).toContain('.bee-flight-training-stepper,.bee-flight-training-stepper *{forced-color-adjust:auto;}');
  });

  it('computes bhQueenPatchExplorerVisual and renders shared-patch SVG schematic responding to filter, stepper, overlay, and winter state', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const allSummer = BH.bhQueenPatchExplorerVisual('all', 'both', true, false);
    expect(allSummer).toMatchObject({ selectedPatch: 'all', colony: 'both', routesActive: true, activeRouteCount: 12 });
    expect(allSummer.patches).toHaveLength(6);

    const singleHome = BH.bhQueenPatchExplorerVisual('patch_c', 'home', true, false);
    expect(singleHome).toMatchObject({ selectedPatch: 'patch_c', colony: 'home', homeActive: true, neighborActive: false, activeRouteCount: 1 });
    expect(singleHome.patches.find((p) => p.id === 'patch_c').selected).toBe(true);

    const winterOff = BH.bhQueenPatchExplorerVisual('patch_c', 'both', true, true);
    expect(winterOff).toMatchObject({ routesActive: false, homeActive: false, neighborActive: false, activeRouteCount: 0 });

    await mountState({
      viewMode: 'queen',
      focusLayout: true,
      queen: { active: true, paused: true, day: 6, territory: 52, hiveHealth: 88, resources: { nectar: 100, pollen: 100, wax: 100, royalJelly: 30 } },
    });
    const explorer = host.querySelector('[data-rts-patch-explorer]');
    expect(explorer).toBeTruthy();
    const schematic = explorer.querySelector('svg[data-rts-patch-schematic="true"]');
    expect(schematic).toBeTruthy();
    expect(schematic.getAttribute('aria-hidden')).toBe('true');
    expect(schematic.getAttribute('focusable')).toBe('false');
    expect(schematic.querySelectorAll('text, title')).toHaveLength(0);
    expect(schematic.querySelectorAll('[data-patch-node]')).toHaveLength(6);
    expect(schematic.querySelectorAll('[data-schem-nest]')).toHaveLength(2);
    expect(schematic.querySelectorAll('[data-schem-route]')).toHaveLength(12);

    await act(async () => {
      host.querySelector('[data-rts-patch-step="next"]').click();
      await Promise.resolve();
    });
    const steppedSchem = host.querySelector('svg[data-rts-patch-schematic="true"]');
    expect(steppedSchem.getAttribute('data-selected-patch')).toBe('patch_a');
    expect(steppedSchem.querySelector('[data-schem-ring="patch_a"]')).toBeTruthy();
    expect(steppedSchem.querySelectorAll('[data-schem-route]')).toHaveLength(2);

    await act(async () => {
      host.querySelector('[data-route-view="neighbor"]').click();
      await Promise.resolve();
    });
    const neighborSchem = host.querySelector('svg[data-rts-patch-schematic="true"]');
    expect(neighborSchem.getAttribute('data-colony-filter')).toBe('neighbor');
    expect(neighborSchem.querySelectorAll('[data-schem-route]')).toHaveLength(1);
    expect(neighborSchem.querySelector('[data-schem-route="neighbor-patch_a"]')).toBeTruthy();
    expect(SRC_TEXT).toContain('.bee-rts-patch-schematic,.bee-rts-patch-schematic * { forced-color-adjust:auto; }');
  });

  it('computes bhPlanRegistrationVisual and renders zero-text plan integrity segments and stage emblems without altering status text', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const total = BH.BEEHIVE_EXPERIMENT_PLAN_REQUIRED_FIELDS.length;
    const matched = BH.bhPlanRegistrationVisual({ status: 'matched', differences: [], missing: [] }, 'matched', 0, total);
    expect(matched.verdictState).toBe('prospective');
    expect(matched.segments).toHaveLength(total);
    expect(matched.segments.every((s) => s.state === 'matched')).toBe(true);

    const edited = BH.bhPlanRegistrationVisual({ status: 'changed', differences: [{ id: 'predictedDirection' }, { id: 'hypothesis' }], missing: [] }, 'matched', 0, total);
    expect(edited.verdictState).toBe('edited');
    expect(edited.segments.filter((s) => s.state === 'changed')).toHaveLength(2);

    const incomplete = BH.bhPlanRegistrationVisual({ status: 'incomplete', differences: [], missing: [{ id: 'question' }, { id: 'prediction' }, { id: 'hypothesis' }] }, 'checkpoint', 3, total);
    expect(incomplete.verdictState).toBe('incomplete');
    expect(incomplete.segments.filter((s) => s.state === 'missing')).toHaveLength(3);

    const basePlan = {
      schemaVersion: 4,
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: 'Does wildflower forage increase honey?',
      hypothesis: 'More nectar sources raise net stores.',
      changedVariable: 'Plant wildflowers on Day 3',
      prediction: 'Run B honey exceeds Run A at Day 8.',
      registeredPlan: {
        schemaVersion: 1,
        runSerial: 2,
        baselineRunSerial: 1,
        plannedActionId: 'plant_wildflowers',
        predictedMetricId: 'honey',
        predictedDirection: 'higher',
        question: 'Does wildflower forage increase honey?',
        hypothesis: 'More nectar sources raise net stores.',
        changedVariable: 'Plant wildflowers on Day 3',
        prediction: 'Run B honey exceeds Run A at Day 8.',
      },
    };
    const baseline = BH.bhCreateExperimentSnapshot({
      ...BH.bhCreateNewColonyState(2468, 1),
      day: 8,
      honey: 29,
      simulationSeed: 2468,
      randomState: 1357,
      experimentRunSerial: 1,
    });

    await mountState({
      ...BH.bhCreateNewColonyState(2468, 1),
      viewMode: 'beekeeper',
      day: 8,
      simulationSeed: 2468,
      randomState: 9753,
      experimentRunSerial: 2,
      seededFromDay: 0,
      honey: 35,
      experimentBaseline: baseline,
      managementTrail: [{ day: 3, label: 'Plant wildflowers', cost: '1 AP' }],
      notebookOpen: true,
      experimentNotebookOpen: true,
      notebook: { experiment: basePlan },
    });

    const regSection = host.querySelector('[data-experiment-plan-registration="true"]');
    expect(regSection).toBeTruthy();
    expect(regSection.textContent).toContain('Recorded before Run B');
    const bar = regSection.querySelector('svg[data-plan-integrity-bar="true"]');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('data-integrity-verdict')).toBe('prospective');
    expect(bar.querySelectorAll('[data-plan-field-slot]')).toHaveLength(total);
    expect(regSection.querySelectorAll('svg[data-plan-stage-icon]')).toHaveLength(3);
    for (const svg of regSection.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }

    const dirControl = host.querySelector('[data-experiment-prediction-direction="true"]');
    const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    await act(async () => {
      selectSetter.call(dirControl, 'lower');
      dirControl.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('svg[data-plan-integrity-bar="true"]').getAttribute('data-integrity-verdict')).toBe('edited');
    expect(SRC_TEXT).toContain('.bee-plan-integrity-bar,.bee-plan-integrity-bar *,.bee-plan-stage-icon,.bee-plan-stage-icon * { forced-color-adjust:auto; }');
  });

  it('adds raycast-safe, zero-allocation 3D QMP royal retinue court to the Colony Network meadow', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const retinue = model.anchor.getObjectByName('qmp-retinue-court');
    const halo = model.anchor.getObjectByName('qmp-retinue-halo');
    const queenEmblem = model.anchor.getObjectByName('qmp-queen-emblem');
    const queenMark = model.anchor.getObjectByName('qmp-queen-mark');
    expect(retinue).toBeTruthy();
    expect(halo).toBeTruthy();
    expect(queenEmblem).toBeTruthy();
    expect(queenMark).toBeTruthy();

    retinue.traverse((obj) => {
      expect(model.picks).not.toContain(obj);
      expect(obj.userData && obj.userData.partId).toBeUndefined();
    });

    const geosBefore = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosBefore.add(o.geometry); });

    // Hidden when signal domes overlay is off (default ecological scene) and in winter
    model.frame(1000, { showSignals: false, season: 1, qmp: 0.9, share: 0.5 }, true);
    expect(retinue.visible).toBe(false);
    model.frame(1000, { showSignals: true, season: 3, qmp: 0.9, share: 0.5 }, true);
    expect(retinue.visible).toBe(false);

    // Visible with signals enabled in warm season; scales attendants & tightens court radius with QMP
    model.frame(1000, { showSignals: true, season: 1, qmp: 0.35, share: 0.1 }, true);
    expect(retinue.visible).toBe(true);
    const lowCount = [0, 1, 2, 3, 4, 5].filter((i) => retinue.getObjectByName('qmp-attendant-' + i).visible).length;
    expect(lowCount).toBe(2);

    model.frame(1000, { showSignals: true, season: 1, qmp: 1.0, share: 0.9 }, true);
    const highCount = [0, 1, 2, 3, 4, 5].filter((i) => retinue.getObjectByName('qmp-attendant-' + i).visible).length;
    expect(highCount).toBe(6);

    // Reduced motion keeps attendant positions fixed across timestamps; live motion orbits smoothly
    const att0 = retinue.getObjectByName('qmp-attendant-0');
    const staticX = att0.position.x;
    model.frame(2600, { showSignals: true, season: 1, qmp: 1.0, share: 0.9 }, true);
    expect(att0.position.x).toBe(staticX);

    model.frame(1000, { showSignals: true, season: 1, qmp: 1.0, paused: false }, false);
    const liveX = att0.position.x;
    model.frame(1650, { showSignals: true, season: 1, qmp: 1.0, paused: false }, false);
    expect(att0.position.x).not.toBe(liveX);

    const geosAfter = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosAfter.add(o.geometry); });
    expect(geosAfter).toEqual(geosBefore);
  });
});

describe('Beehive enhancement pass — phase 28 (candidate31)', () => {
  let cfg;
  let host;
  let root;

  beforeEach(() => {
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhExperimentProtocolVisual and renders an 8-node zero-text stepper and step status icons in Experiment Protocol', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const starting = BH.bhExperimentProtocolVisual([
      { id: 'plan', complete: false }, { id: 'baseline', complete: false }, { id: 'repeat', complete: false },
      { id: 'registration', complete: false }, { id: 'checkpoint', complete: false }, { id: 'choice', complete: false },
      { id: 'prediction', complete: false }, { id: 'explain', complete: false },
    ]);
    expect(starting).toMatchObject({ state: 'starting', total: 8, completedCount: 0, activeStep: 1 });
    expect(starting.nodes[0].state).toBe('current');
    expect(starting.rails.every((r) => !r.done)).toBe(true);

    const mid = BH.bhExperimentProtocolVisual([
      { id: 'plan', complete: true }, { id: 'baseline', complete: true }, { id: 'repeat', complete: true },
      { id: 'registration', complete: false }, { id: 'checkpoint', complete: false }, { id: 'choice', complete: false },
      { id: 'prediction', complete: false }, { id: 'explain', complete: false },
    ]);
    expect(mid).toMatchObject({ state: 'in-progress', total: 8, completedCount: 3, activeStep: 4 });
    expect(mid.nodes[3].state).toBe('current');
    expect(mid.rails.slice(0, 3).every((r) => r.done)).toBe(true);

    const complete = BH.bhExperimentProtocolVisual(mid.nodes.map((n) => ({ id: n.id, complete: true })));
    expect(complete).toMatchObject({ state: 'complete', total: 8, completedCount: 8, activeStep: 8 });
    expect(complete.nodes.every((n) => n.state === 'complete')).toBe(true);

    const baseline = BH.bhCreateExperimentSnapshot({
      ...BH.bhCreateNewColonyState(3101, 1),
      day: 8,
      honey: 25,
      simulationSeed: 3101,
      experimentRunSerial: 1,
    });
    await mountState({
      ...BH.bhCreateNewColonyState(3101, 1),
      viewMode: 'beekeeper',
      day: 5,
      simulationSeed: 3101,
      experimentRunSerial: 2,
      experimentBaseline: baseline,
      honey: 24,
    });

    const protocol = host.querySelector('[data-experiment-protocol="true"]');
    expect(protocol).toBeTruthy();
    const stepper = protocol.querySelector('svg[data-protocol-stepper="true"]');
    expect(stepper).toBeTruthy();
    expect(stepper.querySelectorAll('[data-protocol-node]')).toHaveLength(8);
    expect(stepper.querySelectorAll('[data-protocol-rail]')).toHaveLength(7);
    const icons = protocol.querySelectorAll('svg[data-protocol-step-icon]');
    expect(icons).toHaveLength(8);
    for (const svg of [stepper, ...icons]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-protocol-stepper,.bee-protocol-stepper *,.bee-protocol-step-icon,.bee-protocol-step-icon * { forced-color-adjust:auto; }');
  });

  it('computes bhHiveReferenceVisual and renders bare comparison timeline and inquiry icons in Hive Interior without wrapper inflation', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const empty = BH.bhHiveReferenceVisual({ available: true, data: { day: 12 } }, null);
    expect(empty).toMatchObject({ state: 'empty', hasHeld: false, currentDay: 12, spanWidth: 0 });
    expect(empty.heldPinX).toBeNull();

    const sameDay = BH.bhHiveReferenceVisual({ available: true, data: { day: 12 } }, { available: true, held: { data: { day: 12 } }, current: { data: { day: 12 } } });
    expect(sameDay).toMatchObject({ state: 'held-same-day', hasHeld: true, elapsedDays: 0, spanWidth: 0 });

    const elapsed = BH.bhHiveReferenceVisual({ available: true, data: { day: 22 } }, { available: true, held: { data: { day: 12 } }, current: { data: { day: 22 } } });
    expect(elapsed).toMatchObject({ state: 'held-elapsed', elapsedDays: 10 });
    expect(elapsed.currentPinX).toBeGreaterThan(elapsed.heldPinX);
    expect(elapsed.spanWidth).toBeGreaterThan(0);

    const unavailable = BH.bhHiveReferenceVisual({ available: true, data: { day: 22 } }, { available: false, held: { data: { day: 12 } } });
    expect(unavailable).toMatchObject({ state: 'unavailable', hasHeld: true });

    window.StemLab.ensureThree = vi.fn(() => Promise.reject(new Error('no-gl')));
    await mountState({
      ...BH.bhCreateNewColonyState(3102, 1),
      viewMode: 'beekeeper',
      day: 12,
      honey: 45,
      show3dHive: false,
    });

    const openBtn = host.querySelector('[data-hive-interior-open]');
    expect(openBtn).toBeTruthy();
    await act(async () => {
      openBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const interior = host.querySelector('[data-hive-interior="true"]');
    expect(interior).toBeTruthy();
    const timeline = interior.querySelector('svg[data-interior-ref-timeline="true"]');
    expect(timeline).toBeTruthy();
    expect(timeline.getAttribute('data-ref-visual-state')).toBe('empty');

    await act(async () => {
      interior.querySelector('[data-interior-hold="true"]').click();
      await Promise.resolve();
    });
    const heldTimeline = interior.querySelector('svg[data-interior-ref-timeline="true"]');
    expect(heldTimeline.getAttribute('data-ref-visual-state')).toBe('held-same-day');
    expect(heldTimeline.querySelector('[data-ref-pin="held"]')).toBeTruthy();
    expect(heldTimeline.querySelector('[data-ref-pin="current"]')).toBeTruthy();

    const inquiry = interior.querySelector('[data-interior-inquiry="true"]');
    expect(inquiry).toBeTruthy();
    expect(inquiry.querySelectorAll('svg[data-interior-inquiry-icon]')).toHaveLength(3);
    expect(Array.from(inquiry.querySelectorAll('li > strong')).map((s) => s.textContent)).toEqual([
      '1 · Predict',
      '2 · Try a choice',
      '3 · Explain',
    ]);
    for (const svg of [heldTimeline, ...inquiry.querySelectorAll('svg')]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
  });

  it('computes bhQueenPlacementVisual and renders the 3x3 comb cell occupancy & ecological zone schematic', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const guardVis = BH.bhQueenPlacementVisual('guard', [{ type: 'brood', x: 0.28, y: 0.50 }]);
    expect(guardVis).toMatchObject({ buildMode: 'guard', recommendedZone: 'front', totalCells: 9, occupiedCount: 1, openCount: 8 });
    expect(guardVis.cells.find((c) => c.id === 'mid-mid').occupied).toBe(true);
    expect(guardVis.cells.find((c) => c.id === 'front-top').recommended).toBe(true);

    const honeyVis = BH.bhQueenPlacementVisual('honey', []);
    expect(honeyVis).toMatchObject({ buildMode: 'honey', recommendedZone: 'arch', occupiedCount: 0, openCount: 9 });

    window.StemLab.ensureThree = vi.fn(() => Promise.reject(new Error('no-gl')));
    await mountState({
      viewMode: 'queen',
      focusLayout: true,
      queen: {
        active: true,
        paused: true,
        day: 4,
        buildMode: 'guard',
        structures: [{ id: 's1', type: 'brood', x: 0.28, y: 0.50, level: 1 }],
        resources: { nectar: 100, pollen: 100, wax: 100, royalJelly: 30 },
      },
    });

    const placement = host.querySelector('[data-beehive-queen-placement="true"]');
    expect(placement).toBeTruthy();
    const schematic = placement.querySelector('svg[data-queen-placement-schematic="true"]');
    expect(schematic).toBeTruthy();
    expect(schematic.getAttribute('data-build-type')).toBe('guard');
    expect(schematic.getAttribute('data-recommended-zone')).toBe('front');
    expect(schematic.getAttribute('data-open-cells')).toBe('8');
    expect(schematic.querySelectorAll('[data-place-cell-node]')).toHaveLength(9);
    expect(schematic.querySelector('[data-place-cell-node="mid-mid"]').getAttribute('data-cell-occupied')).toBe('true');
    expect(schematic.getAttribute('aria-hidden')).toBe('true');
    expect(schematic.getAttribute('focusable')).toBe('false');
    expect(schematic.querySelectorAll('text, title')).toHaveLength(0);
    expect(SRC_TEXT).toContain('.bee-queen-placement-schematic,.bee-queen-placement-schematic * { forced-color-adjust:auto; }');
  });

  it('computes bhDronePreflightVisuals and renders preflight carryover condition meter and scenario/route glyphs', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhDronePreflightVisuals(1, 'clear', 'balanced')).toMatchObject({ band: 'prepared', pct: 100, scenario: 'clear', routePlan: 'balanced' });
    expect(BH.bhDronePreflightVisuals(0.94, 'crosswind', 'boost-first')).toMatchObject({ band: 'watch', pct: 94, scenario: 'crosswind', routePlan: 'boost-first' });
    expect(BH.bhDronePreflightVisuals(0.86, 'rescue', 'thermal-first')).toMatchObject({ band: 'stressed', pct: 86, scenario: 'rescue', routePlan: 'thermal-first' });

    await mountState({
      ...BH.bhCreateNewColonyState(3104, 1),
      viewMode: 'drone',
      varroaLevel: 45,
      drone: { active: false, difficulty: 'easy', pacing: 'steps', graphicsMode: 'eco' },
    });

    const briefing = host.querySelector('#beehive-drone-playfield[data-beehive-stage="drone-briefing"]');
    expect(briefing).toBeTruthy();
    const scenarioGlyphs = briefing.querySelectorAll('svg[data-scenario-glyph]');
    const routeGlyphs = briefing.querySelectorAll('svg[data-route-plan-glyph]');
    const carryoverMeter = briefing.querySelector('svg[data-carryover-condition-meter="true"]');
    expect(scenarioGlyphs).toHaveLength(3);
    expect(routeGlyphs).toHaveLength(3);
    expect(carryoverMeter).toBeTruthy();
    expect(carryoverMeter.getAttribute('data-carryover-band')).toBe('stressed');
    expect(carryoverMeter.querySelectorAll('[data-carryover-tick]')).toHaveLength(3);
    expect(briefing.querySelector('[data-drone-scenario="clear"]').getAttribute('aria-label')).toContain('Clear field');
    expect(briefing.querySelector('[data-drone-route-plan="balanced"]').getAttribute('aria-label')).toContain('Balanced route');
    for (const svg of [...scenarioGlyphs, ...routeGlyphs, carryoverMeter]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
  });

  it('adds raycast-safe, zero-allocation 3D super-honey-ripeners tracking active honey supers in hive3dBuildScene', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const group = model.anchor.getObjectByName('super-honey-ripeners');
    expect(group).toBeTruthy();
    for (let i = 0; i < 3; i++) expect(model.anchor.getObjectByName('super-wax-cap-glint-' + i)).toBeTruthy();
    for (let i = 0; i < 4; i++) expect(model.anchor.getObjectByName('super-ripener-bee-' + i)).toBeTruthy();

    group.traverse((o) => {
      expect(model.picks).not.toContain(o);
      expect(o.userData && o.userData.partId).toBeUndefined();
    });

    const geosBefore = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosBefore.add(o.geometry); });

    // Hidden when hive is closed, in winter, under smoke, or with very low stores
    model.frame(1000, { exploded: false, season: 1, honeyFill: 0.7, traffic: 0.8, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, season: 3, honeyFill: 0.7, traffic: 0.8, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, season: 1, honeyFill: 0.7, traffic: 0.8, smokeActive: true }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, season: 1, honeyFill: 0.02, traffic: 0.8, smokeActive: false }, true);
    expect(group.visible).toBe(false);

    // Visible when exploded in warm active season; rides upward when 2nd super is actively filling
    model.frame(1000, { exploded: true, season: 1, superCount: 1, honeyBoxes: 0.4, honeyFill: 0.65, traffic: 0.8, smokeActive: false }, true);
    expect(group.visible).toBe(true);
    const yOneSuper = group.position.y;
    model.frame(1000, { exploded: true, season: 1, superCount: 2, honeyBoxes: 1.4, honeyFill: 0.65, traffic: 0.8, smokeActive: false }, true);
    expect(group.visible).toBe(true);
    expect(group.position.y).toBeGreaterThan(yOneSuper);

    // Reduced motion holds ripener positions fixed across timestamps; live motion animates smoothly
    const rip0 = group.getObjectByName('super-ripener-bee-0');
    const staticX = rip0.position.x;
    model.frame(2600, { exploded: true, season: 1, superCount: 2, honeyBoxes: 1.4, honeyFill: 0.65, traffic: 0.8, smokeActive: false }, true);
    expect(rip0.position.x).toBe(staticX);

    model.frame(1000, { exploded: true, season: 1, superCount: 2, honeyBoxes: 1.4, honeyFill: 0.65, traffic: 0.8, smokeActive: false }, false);
    const liveX = rip0.position.x;
    model.frame(1800, { exploded: true, season: 1, superCount: 2, honeyBoxes: 1.4, honeyFill: 0.65, traffic: 0.8, smokeActive: false }, false);
    expect(rip0.position.x).not.toBe(liveX);

    const geosAfter = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosAfter.add(o.geometry); });
    expect(geosAfter).toEqual(geosBefore);
  });
});

describe('Beehive enhancement pass — phase 29 (candidate32)', () => {
  let cfg;
  let host;
  let root;
  let rafQueue;

  beforeEach(() => {
    rafQueue = [];
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafQueue.push(cb); return rafQueue.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhApiarySiteVisual and renders Day-0 stock 1.00x baseline ticks and site comparative profile bars', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const meadow = BH.bhApiarySiteVisual('meadow', { forage: 1.0, disease: 1.0 });
    expect(meadow).toMatchObject({ siteId: 'meadow', siteGlyph: 'meadow', specialTag: 'balanced' });
    expect(meadow.bars.map((b) => [b.id, b.pct, b.tone])).toEqual([
      ['forage', 50, 'neutral'],
      ['disease', 50, 'neutral'],
      ['mites', 50, 'neutral'],
    ]);

    const urban = BH.bhApiarySiteVisual('urban', { forage: 0.88, disease: 1.1, varroa: 1.25 });
    expect(urban.bars.map((b) => [b.id, b.tone])).toEqual([
      ['forage', 'adverse'],
      ['disease', 'adverse'],
      ['mites', 'adverse'],
    ]);

    const mountain = BH.bhApiarySiteVisual('mountain', { forage: 0.95, disease: 0.7, varroa: 0.8, shortSeason: 0.6 });
    expect(mountain.specialTag).toBe('short-season');
    expect(mountain.bars.find((b) => b.id === 'disease').tone).toBe('favorable');
    expect(mountain.bars.find((b) => b.id === 'mites').tone).toBe('favorable');

    await mountState({
      ...BH.bhCreateNewColonyState(3201, 0),
      day: 0,
      viewMode: 'beekeeper',
      tutorialDone: true,
      stockPickerOpen: true,
    });

    const stockPicker = host.querySelector('#beehive-stock-picker');
    const stockBars = stockPicker.querySelectorAll('svg.bee-stock-trait-bar');
    expect(stockBars.length).toBeGreaterThanOrEqual(25);
    expect(stockPicker.querySelectorAll('[data-baseline-tick="true"]').length).toBe(stockBars.length);
    for (const svg of stockBars) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }

    const sitePicker = host.querySelector('#beehive-apiary-site-picker');
    const siteSvgs = Array.from(sitePicker.querySelectorAll('svg.bee-site-profile-bars'));
    expect(siteSvgs.map((svg) => svg.getAttribute('data-site-profile-bars'))).toEqual(['meadow', 'forest_edge', 'urban', 'coastal', 'mountain']);
    for (const svg of siteSvgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
      expect(svg.querySelector('[data-site-emblem]')).toBeTruthy();
      expect(svg.querySelectorAll('[data-site-bar]')).toHaveLength(3);
      expect(svg.querySelectorAll('[data-site-baseline-tick="true"]')).toHaveLength(3);
    }
    expect(SRC_TEXT).toContain('.bee-stock-trait-bar,.bee-stock-trait-bar *,.bee-site-profile-bars,.bee-site-profile-bars *');
  });

  it('computes bhQueenTimelineVisuals and renders Colony Network competitor intel meter and forecast urgency rails', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const unscouted = BH.bhQueenTimelineVisuals({ intel: 0 }, 4, 0, 2, 1, 5, true, 1);
    expect(unscouted).toMatchObject({ intelPct: 0, intelKnown: false, intelBand: 'unscouted', confirmTickX: 136, postureKind: 'unknown' });
    expect(unscouted.forecasts.map((f) => [f.id, f.tone])).toEqual([
      ['next-cycle', 'paused'],
      ['raid', 'soon'],
      ['rival-build', 'imminent'],
    ]);

    const winterConfirmed = BH.bhQueenTimelineVisuals({ intel: 92, posture: 'assault' }, 105, 3, 1, 2, 5, false, 2);
    expect(winterConfirmed).toMatchObject({ intelPct: 92, intelBand: 'confirmed', postureKind: 'assault' });
    expect(winterConfirmed.forecasts.map((f) => [f.id, f.tone])).toEqual([
      ['next-cycle', 'live'],
      ['raid', 'truce'],
      ['rival-build', 'census'],
    ]);

    window.StemLab.ensureThree = vi.fn(() => Promise.reject(new Error('no-gl')));
    await mountState({
      viewMode: 'queen',
      focusLayout: false,
      queen: {
        active: true,
        paused: true,
        day: 5,
        resources: { nectar: 100, pollen: 100, wax: 100, royalJelly: 30 },
        rival: { name: 'Redwood Apiary', intel: 0, pressure: 25, strength: 20, posture: 'expand' },
      },
    });

    const timeline = host.querySelector('[data-beehive-rts-timeline="true"]');
    expect(timeline).toBeTruthy();
    let intelSvg = timeline.querySelector('svg[data-rts-intel-meter="true"]');
    expect(intelSvg).toBeTruthy();
    expect(intelSvg.getAttribute('data-intel-band')).toBe('unscouted');
    expect(intelSvg.querySelector('[data-intel-confirm-tick="true"]')).toBeTruthy();
    expect(intelSvg.getAttribute('aria-hidden')).toBe('true');
    expect(intelSvg.getAttribute('focusable')).toBe('false');
    expect(intelSvg.querySelectorAll('text, title')).toHaveLength(0);

    const forecastRails = timeline.querySelectorAll('svg[data-rts-forecast-rail]');
    expect(forecastRails).toHaveLength(3);
    for (const svg of forecastRails) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }

    const scoutBtn = timeline.querySelector('[data-rts-doctrine-scout="true"]');
    expect(scoutBtn).toBeTruthy();
    await act(async () => {
      scoutBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    intelSvg = host.querySelector('[data-beehive-rts-timeline="true"] svg[data-rts-intel-meter="true"]');
    expect(Number(intelSvg.getAttribute('data-intel-pct'))).toBeGreaterThan(0);
    expect(intelSvg.getAttribute('data-intel-band')).not.toBe('unscouted');
  });

  it('computes bhDroneDirectorVisuals and renders and syncs Drone Flight direction guide metric gauges', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const farState = BH.bhDroneDirectorVisuals({ x: 0, y: 45, z: 0, yaw: 0, difficulty: 'normal', timer: 110, energy: 80 });
    expect(farState.range).toMatchObject({ inGate: false, tone: 'approaching' });
    expect(farState.altitude).toMatchObject({ inBand: false, tone: 'low' });
    expect(farState.seconds).toMatchObject({ low: false, tone: 'ok' });

    const inGateState = BH.bhDroneDirectorVisuals({ x: 0, y: 115, z: -600, yaw: 0, difficulty: 'normal', timer: 12, energy: 20 });
    expect(inGateState.range).toMatchObject({ inGate: true, tone: 'in-gate', closurePct: 100 });
    expect(inGateState.altitude).toMatchObject({ inBand: true, tone: 'in-band' });
    expect(inGateState.seconds).toMatchObject({ low: true, tone: 'low' });

    window.StemLab.ensureThree = vi.fn(() => Promise.reject(new Error('no-gl')));
    await mountState({ viewMode: 'drone', focusLayout: true, drone: { active: false, difficulty: 'easy', pacing: 'live', graphicsMode: 'eco' } });
    const launchEasy = host.querySelector('[data-flight-launch="easy"]');
    await act(async () => {
      launchEasy.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const guide = host.querySelector('[data-flight-director="true"]');
    expect(guide).toBeTruthy();
    const gauges = ['range', 'altitude', 'seconds'].map((k) => guide.querySelector(`svg[data-director-metric-gauge="${k}"]`));
    for (const g of gauges) {
      expect(g).toBeTruthy();
      expect(g.getAttribute('aria-hidden')).toBe('true');
      expect(g.getAttribute('focusable')).toBe('false');
      expect(g.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(gauges[0].getAttribute('data-gauge-tone')).toBe('approaching');

    const dState = window.__testHooks.beehive.droneStateRef.current;
    dState.paused = true;
    dState.x = 0;
    dState.z = -600;
    dState.y = 115;
    dState.timer = 12;
    const t0 = performance.now() + 2000;
    await act(async () => {
      const latestRaf = rafQueue[rafQueue.length - 1];
      if (typeof latestRaf === 'function') latestRaf(t0 + 500);
      await Promise.resolve();
    });
    expect(dState.paused).toBe(true);
    expect(guide.querySelector('svg[data-director-metric-gauge="range"]').getAttribute('data-gauge-tone')).toBe('in-gate');
    expect(guide.querySelector('svg[data-director-metric-gauge="altitude"]').getAttribute('data-gauge-tone')).toBe('in-band');
    expect(guide.querySelector('svg[data-director-metric-gauge="seconds"]').getAttribute('data-gauge-tone')).toBe('low');
    expect(SRC_TEXT).toContain('.bee-director-metric-gauge,.bee-director-metric-gauge * {forced-color-adjust:auto;}');
  });

  it('computes bhScienceCardVisual and renders Beekeeper science schematics and habitat/pesticide threshold ticks', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const lowPest = BH.bhScienceCardVisual('waggle', true, { habitat: 25, pesticideExposure: 24 });
    expect(lowPest).toMatchObject({ diagramKind: 'waggle-figure8', active: true, habitatBand: 'low', pesticideBand: 'chronic' });

    const healthyClear = BH.bhScienceCardVisual('honey', false, { habitat: 75, pesticideExposure: 0 });
    expect(healthyClear).toMatchObject({ diagramKind: 'nectar-ripening', active: false, habitatBand: 'healthy', pesticideBand: 'clear' });

    await mountState({
      ...BH.bhCreateNewColonyState(3204, 5),
      day: 5,
      viewMode: 'beekeeper',
      beeView: 'scene',
      showInspect: false,
      tutorialDone: true,
      habitat: 75,
      pesticideExposure: 24,
    });

    const habBar = host.querySelector('svg[data-env-meter="habitat"]');
    const pestBar = host.querySelector('svg[data-env-meter="pesticide"]');
    expect(habBar).toBeTruthy();
    expect(habBar.getAttribute('data-env-band')).toBe('healthy');
    expect(habBar.querySelectorAll('[data-env-tick]')).toHaveLength(2);
    expect(pestBar).toBeTruthy();
    expect(pestBar.getAttribute('data-env-band')).toBe('chronic');
    expect(pestBar.querySelector('[data-env-tick="20"]')).toBeTruthy();
    for (const svg of [habBar, pestBar]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }

    const diagrams = ['waggle', 'castes', 'honey', 'threats'].map((id) => host.querySelector(`svg[data-science-card-diagram="${id}"]`));
    for (const diag of diagrams) {
      expect(diag).toBeTruthy();
      expect(diag.getAttribute('data-card-active')).toBe('false');
      expect(diag.getAttribute('aria-hidden')).toBe('true');
      expect(diag.getAttribute('focusable')).toBe('false');
      expect(diag.querySelectorAll('text, title')).toHaveLength(0);
    }

    await act(async () => {
      host.querySelector('[data-science-card-open="waggle"]').click();
      await Promise.resolve();
    });
    expect(host.querySelector('svg[data-science-card-diagram="waggle"]').getAttribute('data-card-active')).toBe('true');
    expect(host.querySelector('svg[data-science-card-diagram="castes"]').getAttribute('data-card-active')).toBe('false');
  });

  it('adds raycast-safe, zero-allocation 3D alarm-defense-mobilization in queen3dBuildScene', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const group = model.anchor.getObjectByName('alarm-defense-mobilization');
    expect(group).toBeTruthy();
    expect(model.anchor.getObjectByName('alarm-perimeter-ring')).toBeTruthy();
    for (let i = 0; i < 4; i++) expect(model.anchor.getObjectByName('alarm-chevron-' + i)).toBeTruthy();
    for (let i = 0; i < 6; i++) expect(model.anchor.getObjectByName('alarm-sentry-' + i)).toBeTruthy();

    group.traverse((o) => {
      expect(model.picks).not.toContain(o);
      expect(o.userData && o.userData.partId).toBeUndefined();
    });

    const geosBefore = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosBefore.add(o.geometry); });

    // Hidden when signals overlay is off, in winter, or with negligible alarm signal
    model.frame(1000, { showSignals: false, season: 1, alarm: 0.85, share: 0.5 }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { showSignals: true, season: 3, alarm: 0.85, share: 0.5 }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { showSignals: true, season: 1, alarm: 0.02, share: 0.5 }, true);
    expect(group.visible).toBe(false);

    // Visible when signals overlay is enabled in warm seasons with active alarm; independent of flower territory share
    const ring = group.getObjectByName('alarm-perimeter-ring');
    const sentry0 = group.getObjectByName('alarm-sentry-0');
    model.frame(1000, { showSignals: true, season: 1, alarm: 0.85, share: 0.1, paused: false }, true);
    expect(group.visible).toBe(true);
    const scaleLowShare = ring.scale.x;
    const posLowShare = sentry0.position.x;
    model.frame(1000, { showSignals: true, season: 1, alarm: 0.85, share: 0.9, paused: false }, true);
    expect(ring.scale.x).toBeCloseTo(scaleLowShare, 6);
    expect(sentry0.position.x).toBeCloseTo(posLowShare, 6);

    // Reduced motion and paused states freeze sentry motion; live motion advances smoothly
    model.frame(2600, { showSignals: true, season: 1, alarm: 0.85, share: 0.5, paused: false }, true);
    expect(sentry0.position.x).toBeCloseTo(posLowShare, 6);
    model.frame(1000, { showSignals: true, season: 1, alarm: 0.85, share: 0.5, paused: true }, false);
    const pausedX = sentry0.position.x;
    model.frame(2600, { showSignals: true, season: 1, alarm: 0.85, share: 0.5, paused: true }, false);
    expect(sentry0.position.x).toBeCloseTo(pausedX, 6);

    model.frame(1000, { showSignals: true, season: 1, alarm: 0.85, share: 0.5, paused: false }, false);
    const liveX = sentry0.position.x;
    model.frame(1800, { showSignals: true, season: 1, alarm: 0.85, share: 0.5, paused: false }, false);
    expect(sentry0.position.x).not.toBe(liveX);

    const geosAfter = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosAfter.add(o.geometry); });
    expect(geosAfter).toEqual(geosBefore);
  });
});

describe('Beehive enhancement pass — phase 30 (candidate33)', () => {
  let cfg;
  let host;
  let root;
  let rafQueue;

  beforeEach(() => {
    rafQueue = [];
    resetStemLab();
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafQueue.push(cb); return rafQueue.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhQueenFieldObjectiveVisual and renders Colony Network objective emblem, target bars, and toolbar pressure bar', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const explore = BH.bhQueenFieldObjectiveVisual({ id: 'explore', metrics: [{ label: 'Rival intel', value: 65, target: 100 }] }, 0.25);
    expect(explore).toMatchObject({ objectiveId: 'explore', emblemKind: 'compass', raidPct: 25, raidBand: 'calm', raidThresholdX: 52.4, metCount: 0, totalCount: 1 });
    expect(explore.metrics[0].met).toBe(false);
    expect(explore.metrics[0].fillW).toBeLessThan(explore.metrics[0].targetX - 2);

    const defend = BH.bhQueenFieldObjectiveVisual({ id: 'defend', metrics: [{ label: 'Guards', value: 16, target: 16 }, { label: 'Hive health', value: 90, target: 85 }] }, 0.75);
    expect(defend).toMatchObject({ objectiveId: 'defend', emblemKind: 'shield', raidPct: 75, raidBand: 'high', metCount: 2, totalCount: 2 });
    const build = BH.bhQueenFieldObjectiveVisual({ id: 'build', metrics: [] }, 0.45);
    expect(build).toMatchObject({ objectiveId: 'build', emblemKind: 'hex-comb', raidPct: 45, raidBand: 'watch' });

    await mountState({
      ...BH.bhCreateNewColonyState(3301, 0),
      viewMode: 'queen',
      focusLayout: false,
      queenFieldObjective: 'defend',
      queen: {
        active: true,
        paused: true,
        day: 3,
        resources: { nectar: 100, pollen: 100, wax: 100, royalJelly: 30 },
        rival: { name: 'Redwood Apiary', intel: 20, pressure: 68, strength: 20, posture: 'expand' },
      },
    });

    const emblem = host.querySelector('svg.bee-rts-objective-emblem');
    expect(emblem).toBeTruthy();
    expect(emblem.getAttribute('data-objective-emblem')).toBe('shield');
    const targetBars = Array.from(host.querySelectorAll('svg.bee-rts-target-bar'));
    expect(targetBars.length).toBeGreaterThanOrEqual(2);
    const pressureBar = host.querySelector('svg.bee-rts-toolbar-pressure-bar');
    expect(pressureBar).toBeTruthy();
    expect(pressureBar.getAttribute('data-raid-band')).toBe('high');

    for (const svg of [emblem, ...targetBars, pressureBar]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-rts-objective-emblem,.bee-rts-objective-emblem *');
  });

  it('computes bhDroneSnapshotExtrasVisual and renders distance and extras gauges without altering snapshot meter or icon counts', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    expect(BH.bhDroneSnapshotExtrasVisual({})).toMatchObject({
      distanceKnown: false,
      markersKnown: false,
      factsKnown: false,
      conflictsKnown: false,
      conflictTone: 'unknown',
    });

    const known = BH.bhDroneSnapshotExtrasVisual({
      distance: 640,
      routeMarkers: 7,
      routeMarkerGoal: 10,
      facts: 3,
      obstacleHits: 1,
      trafficHits: 2,
    });
    expect(known).toMatchObject({
      distanceKnown: true,
      markersKnown: true,
      markerRatio: 0.7,
      factsKnown: true,
      factsFillW: 72,
      conflictsKnown: true,
      conflictsTotal: 3,
      conflictTone: 'high',
      obstacleFillW: 16,
      trafficFillW: 32,
    });
    expect(known.distanceFillW).toBeGreaterThan(0);
    expect(known.dcaMarkerX).toBeGreaterThan(0);
    expect(BH.bhDroneSnapshotExtrasVisual({ obstacleHits: 0, trafficHits: 0 }).conflictTone).toBe('clean');
    expect(BH.bhDroneSnapshotExtrasVisual({ obstacleHits: 1, trafficHits: 1 }).conflictTone).toBe('watch');

    await mountState({
      ...BH.bhCreateNewColonyState(3302, 0),
      viewMode: 'drone',
      focusLayout: false,
      drone: {
        active: false,
        difficulty: 'normal',
        pacing: 'live',
        lastRun: {
          distance: 640,
          maxAlt: 118,
          energyLeft: 44,
          energyUnits: 'percent-of-difficulty-reserve',
          routeMarkers: 7,
          routeMarkerGoal: 10,
          facts: 3,
          obstacleHits: 1,
          trafficHits: 2,
          score: 420,
          reachedDca: true,
          success: true,
          routePlan: 'balanced',
        },
      },
    });

    const review = host.querySelector('[data-drone-saved-review="true"]');
    expect(review).toBeTruthy();
    const toggle = review.querySelector('[data-drone-saved-review-toggle="true"]');
    await act(async () => { toggle.click(); await Promise.resolve(); });

    const snap = review.querySelector('[data-flight-recorded-snapshot="true"]');
    expect(snap).toBeTruthy();
    expect(snap.querySelectorAll('svg[data-result-energy-meter]')).toHaveLength(1);
    expect(snap.querySelectorAll('svg[data-result-icon]')).toHaveLength(5);

    const distSvg = snap.querySelector('svg.bee-result-distance-svg[data-distance-visual="true"]');
    const extraBars = Array.from(snap.querySelectorAll('svg.bee-result-extra-bar'));
    expect(distSvg).toBeTruthy();
    expect(extraBars.map((s) => s.getAttribute('data-extra-visual'))).toEqual(['markers', 'facts', 'conflicts']);
    for (const svg of [distSvg, ...extraBars]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
  });

  it('computes bhColonyEventVisual and renders diverging summary and preset impact SVGs', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const before = { ...BH.bhCreateNewColonyState(3303, 1, 0), day: 12, honey: 22, varroaLevel: 12, morale: 68 };
    const after = { ...before, day: 13, honey: 14, varroaLevel: 18, morale: 62 };
    const def = {
      id: 'mixed_storm',
      label: 'Mixed Storm',
      emoji: '🌧️',
      desc: 'Heavy rain shifts stores and pest balance.',
      lesson: 'Model settings shift individual inputs simultaneously.',
      weather: true,
      effect: { honey: -6, varroaLevel: 8, workers: 400 },
    };
    const event = BH.bhCaptureColonyEvent(def, before, after, before);
    const vis = BH.bhColonyEventVisual(event);
    expect(vis.impacts.length).toBeGreaterThanOrEqual(2);
    expect(vis.byId.honey).toMatchObject({ tone: 'adverse', direction: 'negative' });
    expect(vis.byId.honey.barX).toBeLessThan(60);
    expect(vis.byId.varroaLevel).toMatchObject({ tone: 'adverse', direction: 'positive' });
    expect(vis.byId.workers).toMatchObject({ tone: 'beneficial', direction: 'positive' });
    expect(vis.byId.workers.barX).toBe(60);

    await mountState({ ...after, viewMode: 'beekeeper', activeEvent: event });
    const settingsBox = host.querySelector('[data-event-settings="true"]');
    expect(settingsBox).toBeTruthy();
    const summarySvg = settingsBox.querySelector('svg.bee-event-comparison-summary');
    const impactSvgs = Array.from(settingsBox.querySelectorAll('svg.bee-event-impact-bar'));
    expect(summarySvg).toBeTruthy();
    expect(impactSvgs.length).toBe(vis.impacts.length);
    for (const svg of [summarySvg, ...impactSvgs]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
  });

  it('computes bhColonyOutlookVisual and renders 4-channel stability strip and per-risk threshold gauges', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const sampleForecast = {
      status: 'critical',
      start: { workers: 14000, honey: 30, varroaLevel: 38, diseaseRisk: 45, pesticideExposure: 25 },
      end: { day: 45, workers: 13500, honey: 12, varroaLevel: 44, diseaseRisk: 60 },
      delta: { workers: -500, honey: -18, varroaLevel: 6, diseaseRisk: 15 },
      risks: [
        { id: 'varroa', level: 'critical', label: 'High varroa pressure', detail: 'High mite load.' },
        { id: 'disease', level: 'critical', label: 'High disease risk', detail: 'High disease risk.' },
        { id: 'pesticide', level: 'watch', label: 'Pesticide poisoning', detail: 'Chronic drift.' },
      ],
    };
    const outVis = BH.bhColonyOutlookVisual(sampleForecast, 25);
    expect(outVis.status).toBe('critical');
    expect(outVis.channels.map((c) => [c.id, c.band])).toEqual([
      ['workers', 'healthy'],
      ['food', 'critical'],
      ['varroa', 'critical'],
      ['disease', 'critical'],
    ]);
    expect(outVis.riskMap.varroa).toMatchObject({ band: 'critical', fillW: +(0.44 * 96).toFixed(2), thresholdX: +(2 + 0.20 * 96).toFixed(2) });
    expect(outVis.riskMap.pesticide.band).toBe('watch');

    await mountState({
      ...BH.bhCreateNewColonyState(3304, 0),
      day: 15,
      viewMode: 'beekeeper',
      workers: 14000,
      honey: 18,
      varroaLevel: 42,
      diseaseRisk: 52,
    });

    const outlook = host.querySelector('[data-beehive-colony-outlook="true"]');
    expect(outlook).toBeTruthy();
    const strip = outlook.querySelector('svg.bee-outlook-stability-strip');
    expect(strip).toBeTruthy();
    expect(strip.querySelectorAll('g[data-channel-id]')).toHaveLength(4);
    const riskGauges = Array.from(outlook.querySelectorAll('svg.bee-outlook-risk-gauge'));
    expect(riskGauges.length).toBeGreaterThanOrEqual(1);
    for (const svg of [strip, ...riskGauges]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-outlook-stability-strip,.bee-outlook-stability-strip *');
  });

  it('adds zero-allocation 3D drone-dca-congregation-swirl in buildThreeWorld & updateThreeWorld respecting pause, eco quality, and inspection views', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const localRaf = [];
    const canceled = new Set();
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      const id = localRaf.length + 1;
      localRaf.push({ id, cb });
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => { canceled.add(id); }));
    const nextRaf = () => {
      while (localRaf.length) {
        const item = localRaf.shift();
        if (!canceled.has(item.id)) return item.cb;
      }
      return null;
    };

    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    let capturedScene = null;
    THREE.WebGLRenderer = function FakeWebGLRenderer() {
      this.domElement = document.createElement('canvas');
      this.shadowMap = { enabled: false, type: 0 };
      this.outputEncoding = 0;
      this.toneMapping = 0;
      this.toneMappingExposure = 1;
      this.capabilities = { getMaxAnisotropy: () => 4 };
      this.renderLists = { dispose: vi.fn() };
      this.setSize = vi.fn();
      this.setPixelRatio = vi.fn();
      this.setClearColor = vi.fn();
      this.getContext = vi.fn(() => ({ getParameter: () => 0 }));
      this.render = vi.fn((scene) => { capturedScene = scene; });
      this.dispose = vi.fn();
    };
    window.THREE = THREE;
    window.AlloPostFXEnabled = false;
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve(THREE));

    await mountState({ viewMode: 'drone', focusLayout: false, drone: { active: false, difficulty: 'easy', pacing: 'live' } });
    const launchBtn = host.querySelector('[data-flight-launch="easy"]');
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const initCb = nextRaf();
    await act(async () => { initCb(1000); await Promise.resolve(); });
    expect(capturedScene).toBeTruthy();

    const swirl = capturedScene.getObjectByName('drone-dca-congregation-swirl');
    const ring0 = capturedScene.getObjectByName('dca-swirl-ring-0');
    const ring1 = capturedScene.getObjectByName('dca-swirl-ring-1');
    const drone0 = capturedScene.getObjectByName('dca-congregation-drone-0');
    const drone5 = capturedScene.getObjectByName('dca-congregation-drone-5');
    expect(swirl).toBeTruthy();
    expect(swirl.position.toArray()).toEqual([0, 0, -BH.DRONE_FLIGHT_PARAMS.dcaDistanceM]);
    expect(ring0).toBeTruthy();
    expect(ring1).toBeTruthy();
    expect(drone0).toBeTruthy();
    expect(drone5).toBeTruthy();

    const geosBefore = new Set();
    swirl.traverse((o) => { if (o.geometry) geosBefore.add(o.geometry); });

    const ds = window.__testHooks.beehive.droneStateRef.current;
    ds.phase = 'flight';
    ds.reachedDca = false;

    const stepFrame = async (ts) => {
      const cb = nextRaf();
      expect(typeof cb).toBe('function');
      await act(async () => { cb(ts); await Promise.resolve(); });
    };
    const maybeStepFrame = async (ts) => {
      const cb = nextRaf();
      if (cb) await act(async () => { cb(ts); await Promise.resolve(); });
    };

    await stepFrame(1000);
    const rotA = ring0.rotation.z;
    const xA = drone0.position.x;
    await stepFrame(1600);
    expect(ring0.rotation.z).not.toBe(rotA);
    expect(drone0.position.x).not.toBe(xA);

    const geosAfter = new Set();
    swirl.traverse((o) => { if (o.geometry) geosAfter.add(o.geometry); });
    expect(geosAfter).toEqual(geosBefore);

    const pauseBtn = host.querySelector('[data-beehive-flight-pause="true"]');
    await act(async () => {
      pauseBtn.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(ds.paused).toBe(true);
    await stepFrame(2000);
    const pausedSwirl = capturedScene.getObjectByName('drone-dca-congregation-swirl');
    const pausedRing0 = capturedScene.getObjectByName('dca-swirl-ring-0');
    const pausedDrone0 = capturedScene.getObjectByName('dca-congregation-drone-0');
    const pausedRot = pausedRing0.rotation.z;
    const pausedX = pausedDrone0.position.x;
    await stepFrame(2900);
    expect(pausedRing0.rotation.z).toBeCloseTo(pausedRot, 6);
    expect(pausedDrone0.position.x).toBeCloseTo(pausedX, 6);

    const qualitySelect = host.querySelector('[data-flight-graphics-mode="true"]');
    await act(async () => {
      qualitySelect.value = 'eco';
      qualitySelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await maybeStepFrame(3100);
    expect(pausedSwirl.visible).toBe(false);

    await act(async () => {
      qualitySelect.value = 'high';
      qualitySelect.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await maybeStepFrame(3200);
    expect(pausedSwirl.visible).toBe(true);

    const shrubBtn = host.querySelector('[data-flight-inspection-view="shrub"]');
    await act(async () => { shrubBtn.click(); await Promise.resolve(); });
    await maybeStepFrame(3300);
    expect(pausedSwirl.visible).toBe(false);
  });
});

describe('Beehive enhancement pass — phase 31 (candidate34)', () => {
  let cfg;
  let host;
  let root;
  let rafQueue;

  beforeEach(() => {
    resetStemLab();
    rafQueue = [];
    window.__testHooks = {};
    window.__RR_TEST_EXPORTS__ = {};
    cfg = loadTool(TOOL, 'beehive');
    const gradient = { addColorStop: vi.fn() };
    const ctxProxy = new Proxy({
      measureText: (t) => ({ width: String(t).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    }, {
      get: (t, p) => (p in t ? t[p] : (t[p] = vi.fn())),
      set: (t, p, v) => { t[p] = v; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => (kind === '2d' ? ctxProxy : null));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { rafQueue.push(cb); return rafQueue.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.__testHooks;
    delete window.__RR_TEST_EXPORTS__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mountState(beehiveOverrides = {}, gradeLevel = '7th Grade') {
    function App() {
      const [data, setData] = React.useState({ beehive: Object.assign({ tutorialDone: true, soundOn: false }, beehiveOverrides) });
      return cfg.render(makeCtx({ toolData: data, setToolData: setData, gradeLevel }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }

  it('computes bhHoneyLabVisuals and renders zero-text stepper, metric bars, and Run A/B comparison bars in Honey Lab', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const runA = BH.bhRunHoneyLab();
    const runB = BH.bhRunHoneyLab('feed_bees');
    const step0 = BH.bhHoneyLabVisuals({ step: 0 }, runA, null, null);
    expect(step0.stepper.completedCount).toBe(0);
    expect(step0.stepper.nodes).toHaveLength(7);
    expect(step0.stepper.nodes[0].state).toBe('current');
    expect(step0.stepper.nodes[1].state).toBe('upcoming');
    expect(step0.stepper.rails).toHaveLength(6);
    expect(step0.stepper.rails.every((r) => r.done === false)).toBe(true);
    expect(step0.pairComparison).toBeNull();

    const scarce = BH.bhHoneyLabVisuals(
      { step: 1 },
      { start: { honey: 35 }, rows: [{ incoming: 0.2, consumed: 0.9, stores: 20 }] },
      null,
      null
    );
    expect(scarce.dailyBars.forage.tone).toBe('scarce');
    expect(scarce.dailyBars.consumed.tone).toBe('deficit');
    expect(scarce.dailyBars.consumed.tickX).toBeGreaterThan(2);
    expect(scarce.dailyBars.stores.tone).toBe('low');

    const honeyPlanInput = {
      step: 3,
      actionId: 'feed_bees',
      expectedDirection: 'higher',
      planReason: 'Supplemental food changes the starting food available, but the dearth continues.',
    };
    const lab = {
      version: 'honey-stores-1',
      active: true,
      initialPrediction: 'lower',
      initialReason: 'The colony may use more food than the foragers bring in.',
      ...honeyPlanInput,
      registeredPlan: BH.bhCreateExperimentPlanRegistration(BH.bhHoneyLabPlan(honeyPlanInput), 2, 1),
    };
    const comparison = BH.bhHoneyLabComparison(lab);
    const step3 = BH.bhHoneyLabVisuals(lab, runA, runB, comparison);
    expect(step3.stepper.completedCount).toBe(3);
    expect(step3.stepper.nodes.slice(0, 3).every((n) => n.state === 'complete')).toBe(true);
    expect(step3.stepper.nodes[3].state).toBe('current');
    expect(step3.stepper.rails.slice(0, 3).every((r) => r.done === true)).toBe(true);
    expect(step3.pairComparison).toBeTruthy();
    expect(step3.pairComparison.delta).toBeGreaterThan(0);
    expect(step3.pairComparison.runBFillW).toBeGreaterThan(step3.pairComparison.runAFillW);
    expect(step3.pairComparison.tone).toBe('higher');

    await mountState({
      ...BH.bhCreateNewColonyState(3401, 0),
      viewMode: 'beekeeper',
      honeyInvestigation: lab,
    });

    const labRoot = host.querySelector('[data-beehive-honey-lab="true"]');
    expect(labRoot).toBeTruthy();
    const stepperSvg = labRoot.querySelector('svg.bhh-stepper-rail[data-honey-stepper="true"]');
    expect(stepperSvg).toBeTruthy();
    expect(stepperSvg.querySelectorAll('g[data-stepper-node]')).toHaveLength(7);
    expect(stepperSvg.querySelectorAll('.bhh-stepper-line')).toHaveLength(6);
    expect(stepperSvg.querySelectorAll('.bhh-stepper-line[data-rail-done="true"]')).toHaveLength(3);

    const metricBars = Array.from(labRoot.querySelectorAll('svg.bhh-metric-bar[data-honey-metric-bar]'));
    expect(metricBars.map((el) => el.getAttribute('data-honey-metric-bar'))).toEqual(['forage', 'consumed', 'stores']);

    const cmpSvg = labRoot.querySelector('svg.bhh-comparison-bars[data-honey-comparison-bars="true"]');
    expect(cmpSvg).toBeTruthy();
    expect(cmpSvg.getAttribute('data-comparison-tone')).toBe('higher');

    for (const svg of [stepperSvg, ...metricBars, cmpSvg]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bhh-stepper-rail,.bhh-stepper-rail *');
  });

  it('computes bhExperimentScheduleVisual and renders zero-text Run B schedule timeline rail without altering row DOM', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const empty = BH.bhExperimentScheduleVisual(null);
    expect(empty).toMatchObject({ available: false, pins: [], progressW: 0, cursorX: 10 });

    const preview = BH.bhExperimentScheduleVisual({
      distinctRuns: false,
      checkpointDay: 8,
      currentDay: 5,
      rows: [{ id: 'r1', day: 2, status: 'preview' }],
    });
    expect(preview).toMatchObject({ available: true, runState: 'preview', progressW: 0, cursorX: 10 });

    const active = BH.bhExperimentScheduleVisual({
      distinctRuns: true,
      checkpointDay: 8,
      currentDay: 4,
      rows: [
        { id: 'r1', day: 2, status: 'matched' },
        { id: 'r2', day: 2, status: 'due' },
        { id: 'r3', day: 4, status: 'planned-exception', plannedCategory: true },
      ],
    });
    expect(active).toMatchObject({
      available: true,
      runState: 'run-b',
      progressW: 100,
      cursorX: 110,
      matchedCount: 1,
      exceptionCount: 1,
      pendingCount: 1,
    });
    expect(active.pins[0].y).toBe(10);
    expect(active.pins[1].y).not.toBe(10);
    expect(active.pins[1].shape).toBe('alert');
    expect(active.pins[2].shape).toBe('diamond');

    const runA = { ...BH.bhCreateNewColonyState(3402, 1), day: 12 };
    BH.bhAppendManagementAction(runA, { day: 1, choiceId: 'feed_bees', label: 'Feed bees', cost: '1 AP' });
    BH.bhAppendManagementAction(runA, { day: 3, choiceId: 'hive_hygiene', label: 'Hive hygiene', cost: '1 AP' });
    BH.bhAppendManagementAction(runA, { day: 5, choiceId: 'add_super', label: 'Add super', cost: '1 AP' });
    const baseline = BH.bhCreateExperimentSnapshot(runA);
    const planObj = {
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: 'Does extra forage increase stores?',
      hypothesis: 'More nectar slows storage draw.',
      changedVariable: 'Add wildflowers on Day 2; keep other choices matched.',
      prediction: 'Compare honey at Day 12.',
    };
    const notebook = { ...planObj, registeredPlan: BH.bhCreateExperimentPlanRegistration(planObj, 2, 1) };
    const current = {
      ...BH.bhCreateNewColonyState(3402, 2),
      viewMode: 'beekeeper',
      day: 3,
      experimentBaseline: baseline,
      notebook: { experiment: notebook },
    };
    BH.bhAppendManagementAction(current, { day: 1, choiceId: 'feed_bees', label: 'Feed bees', cost: '1 AP' });

    await mountState(current);
    const sched = host.querySelector('[data-experiment-action-schedule="true"]');
    expect(sched).toBeTruthy();
    const rail = sched.querySelector('svg.bee-schedule-timeline-rail[data-schedule-timeline-svg="true"]');
    expect(rail).toBeTruthy();
    expect(rail.getAttribute('data-run-state')).toBe('run-b');
    expect(rail.querySelector('[data-schedule-cursor="true"]')).toBeTruthy();
    expect(rail.querySelector('.bee-schedule-checkpoint-tick')).toBeTruthy();
    expect(rail.querySelectorAll('.bee-schedule-pin')).toHaveLength(3);
    expect(rail.getAttribute('aria-hidden')).toBe('true');
    expect(rail.getAttribute('focusable')).toBe('false');
    expect(rail.querySelectorAll('text, title')).toHaveLength(0);
    expect(SRC_TEXT).toContain('.bee-schedule-timeline-rail,.bee-schedule-timeline-rail *');
  });

  it('computes bhQueenDockVisuals and renders vital strip and command glyphs in Colony Network dock without altering previews', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const crit = BH.bhQueenDockVisuals({ qmp: 25, alarm: 72 }, { guards: 5 }, { nectar: 5, pollen: 5, wax: 5 });
    expect(crit.channels).toHaveLength(4);
    expect(crit.channels.map((c) => [c.id, c.band])).toEqual([
      ['qmp', 'critical'],
      ['alarm', 'high'],
      ['guards', 'critical'],
      ['reserves', 'critical'],
    ]);
    expect(crit.glyphByCommand).toEqual({
      scout_rival: 'radar',
      alarm_signal: 'wave-shield',
      raid_rival: 'converge-lance',
    });

    const healthy = BH.bhQueenDockVisuals({ qmp: 85, alarm: 10 }, { guards: 24 }, { nectar: 60, pollen: 50, wax: 40 });
    expect(healthy.channels.map((c) => [c.id, c.band])).toEqual([
      ['qmp', 'healthy'],
      ['alarm', 'calm'],
      ['guards', 'healthy'],
      ['reserves', 'healthy'],
    ]);

    await mountState({
      ...BH.bhCreateNewColonyState(3403, 0),
      viewMode: 'queen',
      queen: {
        active: true,
        paused: true,
        speed: 1,
        day: 4,
        territory: 52,
        hiveHealth: 85,
        pheromones: { qmp: 30, alarm: 70, nasonov: 40 },
        population: { guards: 6, foragers: 40, builders: 20, nurses: 20 },
        resources: { nectar: 80, pollen: 40, wax: 20, royalJelly: 12 },
      },
    });

    const dock = host.querySelector('[data-beehive-battlefield-dock="true"]');
    expect(dock).toBeTruthy();
    const strip = dock.querySelector('svg.bee-dock-vital-strip[data-dock-vital-strip="true"]');
    expect(strip).toBeTruthy();
    expect(strip.querySelectorAll('g[data-dock-channel]')).toHaveLength(4);
    expect(strip.querySelector('.bee-dock-vital-fill[data-dock-channel="qmp"]').getAttribute('data-channel-band')).toBe('critical');
    expect(strip.querySelector('.bee-dock-vital-fill[data-dock-channel="alarm"]').getAttribute('data-channel-band')).toBe('high');

    const cmdButtons = Array.from(dock.querySelectorAll('[data-quick-command]'));
    expect(cmdButtons).toHaveLength(3);
    const glyphs = cmdButtons.map((btn) => btn.querySelector('svg.bee-dock-command-glyph[data-dock-glyph]'));
    expect(glyphs.every(Boolean)).toBe(true);
    expect(glyphs.map((g) => g.getAttribute('data-dock-glyph'))).toEqual(['radar', 'wave-shield', 'converge-lance']);
    expect(cmdButtons[0].querySelector('[data-command-preview="scout_rival"]').textContent).toContain('Reveal rival power');
    expect(cmdButtons[0].getAttribute('aria-label')).toContain('Ready');

    for (const svg of [strip, ...glyphs]) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }
    expect(SRC_TEXT).toContain('.bee-dock-vital-strip,.bee-dock-vital-strip *');
  });

  it('computes bhDroneEnvelopeVisuals and syncs zero-text envelope gauges in live Drone Flight', async () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const goodEnv = BH.bhDroneEnvelopeVisuals({
      difficulty: 'normal',
      energy: 95,
      speed: 5.5,
      y: 80,
      x: 0,
      z: 0,
      yaw: 0,
      birds: [],
    });
    expect(Object.keys(goodEnv.items)).toEqual(['energy', 'speed', 'altitude', 'bearing', 'hazard']);
    for (const key of Object.keys(goodEnv.items)) {
      expect(goodEnv.items[key].tone).toBe('good');
    }
    expect(goodEnv.items.speed.bandW).toBeGreaterThan(0);
    expect(goodEnv.items.altitude.bandW).toBeGreaterThan(0);
    expect(goodEnv.items.bearing.bandW).toBeGreaterThan(0);

    const warnEnv = BH.bhDroneEnvelopeVisuals({
      difficulty: 'normal',
      energy: 15,
      speed: 10.5,
      y: 185,
      x: 0,
      z: 0,
      yaw: 1.5,
      birds: [{ x: 10, y: 185, z: -10 }],
    });
    expect(warnEnv.items.energy.tone).toBe('danger');
    expect(warnEnv.items.speed.tone).toBe('caution');
    expect(warnEnv.items.altitude.tone).toBe('caution');
    expect(warnEnv.items.bearing.tone).toBe('danger');
    expect(warnEnv.items.hazard.tone).toBe('danger');

    await mountState({
      ...BH.bhCreateNewColonyState(3404, 0),
      viewMode: 'drone',
      drone: { active: false, difficulty: 'easy' },
    });

    const launchBtn = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    expect(launchBtn).toBeTruthy();
    await act(async () => {
      launchBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(rafQueue.length).toBeGreaterThan(0);

    const t0 = performance.now() + 200;
    await act(async () => {
      rafQueue[rafQueue.length - 1](t0);
      await Promise.resolve();
    });

    const envelope = host.querySelector('[data-beehive-flight-envelope="true"]');
    expect(envelope).toBeTruthy();
    const gauges = Array.from(envelope.querySelectorAll('svg.bee-envelope-item-gauge[data-envelope-gauge]'));
    expect(gauges).toHaveLength(5);
    for (const svg of gauges) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.querySelectorAll('text, title')).toHaveLength(0);
    }

    const energyGauge = envelope.querySelector('svg[data-envelope-gauge="energy"]');
    const energyFill = energyGauge.querySelector('[data-envelope-fill="true"]');
    const initialFillW = Number(energyFill.getAttribute('width'));
    expect(initialFillW).toBeGreaterThan(0);

    const thrust = host.querySelector('[data-flight-control="ArrowUp"]');
    expect(thrust).toBeTruthy();
    await act(async () => {
      thrust.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
      for (let i = 1; i <= 8; i++) {
        const cb = rafQueue[rafQueue.length - 1];
        if (cb) cb(t0 + i * 120);
      }
      await Promise.resolve();
    });

    expect(envelope.querySelector('svg[data-envelope-gauge="energy"]')).toBe(energyGauge);
    expect(Number(energyFill.getAttribute('width'))).toBeLessThan(initialFillW);

    await act(async () => {
      thrust.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(SRC_TEXT).toContain('.bee-envelope-item-gauge,.bee-envelope-item-gauge *');
  });

  it('adds raycast-safe, zero-allocation 3D brood-nurse-tenders tending open brood frames in hive3dBuildScene', () => {
    const BH = window.__RR_TEST_EXPORTS__.beehive;
    const THREE = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
    const model = BH.hive3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false });

    const group = model.anchor.getObjectByName('brood-nurse-tenders');
    expect(group).toBeTruthy();
    for (let i = 0; i < 4; i++) expect(model.anchor.getObjectByName('brood-jelly-cell-' + i)).toBeTruthy();
    for (let i = 0; i < 4; i++) expect(model.anchor.getObjectByName('nurse-tender-bee-' + i)).toBeTruthy();

    group.traverse((o) => {
      expect(model.picks).not.toContain(o);
      expect(o.userData && o.userData.partId).toBeUndefined();
    });

    const geosBefore = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosBefore.add(o.geometry); });

    // Hidden when closed, wintering, smoked, low brood, low pollen, or at deep outer frame
    model.frame(1000, { exploded: false, pulled: 0, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, pulled: 1, season: 3, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: true }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, pulled: 1, season: 1, broodFill: 0.04, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.02, frameIndex: 2, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 0, smokeActive: false }, true);
    expect(group.visible).toBe(false);
    model.frame(1000, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 5, smokeActive: false }, true);
    expect(group.visible).toBe(false);

    // Visible on central brood frame during warm season with sufficient brood & pollen; tracks pulled frame offset
    model.frame(1000, { exploded: true, pulled: 0, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, true);
    expect(group.visible).toBe(true);
    const zClosedFrame = group.position.z;
    for (let k = 0; k < 6; k++) {
      model.frame(1000 + k * 50, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, true);
    }
    expect(group.position.z).toBeGreaterThan(zClosedFrame);

    // Reduced motion holds nurse bee positions fixed across timestamps; live motion orbits smoothly
    const nurse0 = group.getObjectByName('nurse-tender-bee-0');
    const staticX = nurse0.position.x;
    model.frame(2600, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, true);
    expect(nurse0.position.x).toBe(staticX);

    model.frame(1000, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, false);
    const liveX = nurse0.position.x;
    model.frame(1800, { exploded: true, pulled: 1, season: 1, broodFill: 0.65, pollenLevel: 0.55, frameIndex: 2, smokeActive: false }, false);
    expect(nurse0.position.x).not.toBe(liveX);

    const geosAfter = new Set();
    model.anchor.traverse((o) => { if (o.geometry) geosAfter.add(o.geometry); });
    expect(geosAfter).toEqual(geosBefore);
  });
});
