import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Lane I1: reef moments in the tool. A small card over the dive when a living-reef
// interaction happens nearby (worded with the dive's direction cues, naming a
// species only once the student has identified it), polite and rate-limited
// announcements, a "Reef moments seen" collection kept in tool data, and the
// moments of each dive in the dive log. Driven against a stub engine that
// reports snap.moments the way Reef3DExplore does.
vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(TOOL, 'utf8');
const NEAR = [
  { uid: 'o1', speciesId: 'clownfish', distanceM: 2, inView: true, bearingDeg: 0, riseM: 0.2 },
  { uid: 'o2', speciesId: 'brain_coral', distanceM: 3, inView: true, bearingDeg: 40, riseM: -1 }
];
const B0 = { reefContacts: 0, sandContacts: 0, calmS: 0, diveS: 0, maxDepthM: 6.5, state: 'swim', lastReef: null };
// One of each kind, as the dive reports them.
const M = {
  cleaning: { kind: 'cleaning', speciesId: 'peacock_grouper', uids: ['c1', 'w1', 'w2'], speciesIds: ['peacock_grouper', 'cleaner_wrasse', 'cleaner_wrasse'], distanceM: 3.2, bearingDeg: -70, riseM: 0.3, inView: true },
  manta_cleaning: { kind: 'manta_cleaning', speciesId: 'reef_manta', uids: ['m1', 'w1'], speciesIds: ['reef_manta', 'cleaner_wrasse'], distanceM: 6.4, bearingDeg: 10, riseM: 2.1, inView: true },
  grazing: { kind: 'grazing', speciesId: 'parrotfish', uids: ['p1'], speciesIds: ['parrotfish'], distanceM: 4.1, bearingDeg: 100, riseM: -2, inView: false },
  turtle_breath: { kind: 'turtle_breath', speciesId: 'hawksbill_turtle', uids: ['t1'], speciesIds: ['hawksbill_turtle'], distanceM: 8.6, bearingDeg: 170, riseM: 3, inView: false, phase: 'up' },
  cots_scar: { kind: 'cots_scar', speciesId: 'crown_of_thorns', uids: ['s1', 'h1'], speciesIds: ['crown_of_thorns', 'table_coral'], distanceM: 5, bearingDeg: -20, riseM: -1.6, inView: true },
  anemonefish_hide: { kind: 'anemonefish_hide', speciesId: 'clownfish', uids: ['f1', 'f2', 'a1'], speciesIds: ['clownfish', 'clownfish', 'magnificent_anemone'], distanceM: 1.2, bearingDeg: 30, riseM: -0.5, inView: true },
  cloud_shelter: { kind: 'cloud_shelter', speciesId: 'anthias', uids: ['k1'], speciesIds: ['anthias'], distanceM: 0.4, bearingDeg: 60, riseM: 0.4, inView: true, scenery: true }
};
const GROUP = { kind: 'grazing', speciesId: 'bumphead_parrotfish', uids: ['b1'], speciesIds: ['bumphead_parrotfish'], distanceM: 7, bearingDeg: -120, riseM: -1, inView: true, group: true };
const KINDS = Object.keys(M);
// Words that would give away a species (beyond the plain nouns the cards use).
const GIVEAWAY = ['parrotfish', 'manta', 'grouper', 'wrasse', 'clownfish', 'anemonefish', 'anemone', 'anthias', 'goldie', 'chromis', 'crown', 'thorns', 'hawksbill', 'green turtle', 'bumphead', 'table coral'];
const mounted = [];
let engines, X, TX, now;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = []; now = 1.7e12;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      let state = { ready: true, paused: false, view: 'third', light: false, diver: { depthM: 7, headingDeg: 90 }, focused: null, nearby: NEAR.map((n) => ({ ...n })), buoyancy: { ...B0 }, moments: [] };
      const controller = {
        canvas, options, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(), setLight: vi.fn(),
        getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        moments(list) { controller.emit({ moments: list.map((m) => ({ ...m })) }); },
        focus: vi.fn((uid) => { const found = state.nearby.find((n) => n.uid === uid); if (found) controller.emit({ focused: found }); }),
        swimTo: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(),
        setView: vi.fn((view) => controller.emit({ view })), setPaused: vi.fn((paused) => controller.emit({ paused }))
      };
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((k, f) => f);
});

afterEach(async () => {
  vi.useRealTimers();
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'explore', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (m) => announcements.push(m), ...extra });
  }
  const item = { host, root, announcements, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const buttons = (el, label) => [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === label);
async function click(node) { await act(async () => { node.click(); await Promise.resolve(); }); }
async function startDive(t) { await click(buttons(t.host, 'Start the dive')[0]); return engines[engines.length - 1]; }
const card = (t) => t.host.querySelector('[data-reef-moment]');
const said = (t) => t.announcements.filter((m) => /^Reef moment/.test(m));
const shortName = (id) => TX[id].name.replace(/\s*\([^)]*\)\s*$/, '');
async function show(engine, list) { await act(async () => engine.moments(list)); }
async function wait(ms) { now += ms; await act(async () => { vi.advanceTimersByTime(ms); }); }
function namesOf(ids) {
  const out = [];
  for (const id of ids) {
    const meta = X.SPECIES_META.find((m) => m.id === id);
    out.push(TX[id].name, shortName(id));
    if (meta && meta.scientific) out.push(meta.scientific);
  }
  return out;
}

describe('reef moment card', () => {
  it('shows each kind with its direction and distance, never naming a species not yet identified', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    expect(card(t), 'nothing before a moment').toBeNull();
    const titles = new Set();
    for (const kind of KINDS) {
      await show(engine, [M[kind]]);
      const c = card(t);
      expect(c, kind).toBeTruthy();
      expect(c.getAttribute('data-reef-moment')).toBe(kind);
      const text = c.textContent, low = text.toLowerCase();
      expect(text).toContain('Reef moment');
      for (const name of namesOf(M[kind].speciesIds)) expect(text.includes(name), kind + ' names ' + name).toBe(false);
      for (const word of GIVEAWAY) expect(low.includes(word), kind + ' gives away "' + word + '"').toBe(false);
      titles.add(c.querySelector('.crm-title').textContent);
      // The dive's own direction words and the rounded distance.
      expect(c.querySelector('.crm-where').textContent).toBe(Math.max(1, Math.round(M[kind].distanceM)) + ' m ' + {
        cleaning: 'to your left', manta_cleaning: 'ahead and above you', grazing: 'to your right and below you', turtle_breath: 'behind and above you',
        cots_scar: 'ahead and below you', anemonefish_hide: 'ahead', cloud_shelter: 'to your right' }[kind]);
      expect(c.querySelector('svg.crg-arrow').getAttribute('data-bearing')).toBe(String(M[kind].bearingDeg));
    }
    expect(titles.size, 'every kind has its own title').toBe(KINDS.length);
    // The plain nouns stand in for the animals.
    await show(engine, [M.cleaning]);
    expect(card(t).querySelector('.crm-body').textContent).toBe('Right now, a fish is holding still with its fins spread while a cleaner picks at its skin.');
    await show(engine, [M.manta_cleaning]);
    expect(card(t).querySelector('.crm-body').textContent).toBe('Right now, a large ray is circling slowly over the station while a cleaner picks at it.');
    await show(engine, [GROUP]);
    expect(card(t).querySelector('.crm-body').textContent).toBe('Right now, a group of big fish is feeding together. Look for the little puffs where they bite.');
    await show(engine, [M.cots_scar]);
    expect(card(t).querySelector('.crm-body').textContent).toBe('Look at a starfish and the bright white patch beside it: coral it has already eaten.');
    expect(t.announcements.some((m) => namesOf(['peacock_grouper', 'cleaner_wrasse', 'reef_manta', 'parrotfish', 'bumphead_parrotfish', 'crown_of_thorns', 'clownfish', 'anthias', 'hawksbill_turtle']).some((n) => m.includes(n))), 'announcements name nothing either').toBe(false);
  });

  it('names a species once it is in the species log, and adds its watch note', async () => {
    const log = {};
    for (const id of ['peacock_grouper', 'cleaner_wrasse', 'reef_manta', 'parrotfish', 'bumphead_parrotfish', 'hawksbill_turtle', 'crown_of_thorns', 'clownfish', 'anthias']) log[id] = { firstSeen: 1, site: 'healthy' };
    const t = await mountTool({ speciesLog: log });
    const engine = await startDive(t);
    const body = async (m) => { await show(engine, [m]); return card(t).querySelector('.crm-body').textContent; };
    expect(await body(M.cleaning)).toBe('Right now, a Peacock grouper is holding still with its fins spread while a Bluestreak cleaner wrasse picks at its skin.');
    expect(await body(M.manta_cleaning)).toBe('Right now, a Reef manta ray is circling slowly over the station while a cleaner picks at it.');
    expect(card(t).querySelector('[data-watch-note]').textContent).toContain('Mantas visit cleaning stations too');
    expect(await body(M.grazing)).toBe('Right now, a Bleeker\'s parrotfish is biting the rock. Look for the little puff each bite leaves.');
    expect(card(t).querySelector('[data-watch-note]').textContent).toContain('parrotfish grind dead coral and rock into sand');
    expect(await body(GROUP)).toBe('Right now, a group of Bumphead parrotfish is feeding together. Look for the little puffs where they bite.');
    expect(await body(M.turtle_breath)).toBe('Right now, a Hawksbill turtle is swimming up to the surface to breathe air.');
    expect(await body({ ...M.turtle_breath, phase: 'breathing' })).toBe('Right now, a Hawksbill turtle is taking a few breaths at the surface.');
    expect(await body({ ...M.turtle_breath, phase: 'down' })).toBe('Right now, a Hawksbill turtle is gliding back down after its breaths.');
    expect(await body(M.cots_scar)).toBe('Look at a Crown-of-thorns starfish and the bright white patch beside it: coral it has already eaten.');
    expect(await body(M.anemonefish_hide)).toBe('You came close, so a Clown anemonefish ducked down into the stinging tentacles, where predators cannot follow.');
    expect(await body(M.cloud_shelter)).toBe('Nearby, a cloud of small fish (Sea goldie) is dropping down into the coral for shelter. Watch it rise again when the disturbance has passed.');
    // Only the cleaner identified: the client stays "a fish".
    const t2 = await mountTool({ speciesLog: { cleaner_wrasse: { firstSeen: 1 } } });
    const e2 = await startDive(t2);
    await show(e2, [M.cleaning]);
    expect(card(t2).querySelector('.crm-body').textContent).toBe('Right now, a fish is holding still with its fins spread while a Bluestreak cleaner wrasse picks at its skin.');
  });

  it('reuses watch notes only where they name nothing unidentified', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    const note = async (m) => { await show(engine, [m]); const n = card(t).querySelector('[data-watch-note]'); return n ? n.textContent : null; };
    expect(await note(M.cleaning)).toContain('Watch the cleaning station: fish come by, hold still with their fins spread');
    expect(await note(M.turtle_breath)).toContain('Sea turtles breathe air');
    expect(await note(M.manta_cleaning), 'the manta note names mantas').toBeNull();
    expect(await note(M.grazing), 'the grazing note names parrotfish').toBeNull();
    expect(await note(M.cots_scar)).toBeNull();
  });

  it('Swim to and Look act on the main animal; a scenery cloud has no Swim to', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await show(engine, [M.cleaning]);
    const c = card(t);
    const swim = c.querySelector('[data-moment-swim]'), look = c.querySelector('[data-moment-look]');
    expect(swim.tagName).toBe('BUTTON');
    expect(swim.getAttribute('aria-label')).toBe('Swim to the reef moment: A cleaning station is busy');
    expect(look.getAttribute('aria-label')).toBe('Look at the reef moment: A cleaning station is busy');
    await click(swim);
    expect(engine.swimTo).toHaveBeenCalledWith('c1');
    await click(card(t).querySelector('[data-moment-look]'));
    expect(engine.focus).toHaveBeenCalledWith('c1');
    await show(engine, [M.cloud_shelter]);
    expect(card(t).querySelector('[data-moment-swim]'), 'the cloud is all around the diver').toBeNull();
    await click(card(t).querySelector('[data-moment-look]'));
    expect(engine.focus).toHaveBeenLastCalledWith('k1');
    await show(engine, [{ ...M.cloud_shelter, uids: [], speciesIds: [] }]);
    expect(card(t).querySelector('[data-moment-look]'), 'no school to look at').toBeNull();
    expect(card(t).querySelector('[data-moment-hide]')).toBeTruthy();
  });

  it('Hide puts the moment away until a different one comes, and returns focus to the view', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await show(engine, [M.cleaning]);
    await click(card(t).querySelector('[data-moment-hide]'));
    expect(card(t)).toBeNull();
    expect(document.activeElement && document.activeElement.tagName).toBe('CANVAS');
    await show(engine, [{ ...M.cleaning, distanceM: 2 }]);
    expect(card(t), 'the same moment stays hidden').toBeNull();
    await show(engine, [{ ...M.cleaning, distanceM: 2 }, M.turtle_breath]);
    expect(card(t).getAttribute('data-reef-moment')).toBe('turtle_breath');
  });

  it('stays on its moment while the keyboard is on it, and hands focus back to the view when it goes', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await show(engine, [M.cleaning]);
    await act(async () => { card(t).querySelector('[data-moment-look]').focus(); });
    now += 7000;
    await show(engine, [M.cleaning, M.turtle_breath]);
    expect(card(t).getAttribute('data-reef-moment'), 'no switch under the keyboard').toBe('cleaning');
    await show(engine, [M.turtle_breath]);
    expect(card(t).getAttribute('data-reef-moment')).toBe('turtle_breath');
    expect(document.activeElement.closest('[data-reef-moment]'), 'the same card, still focused').toBeTruthy();
    await show(engine, []);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(card(t)).toBeNull();
    expect(document.activeElement.tagName, 'back to the dive view').toBe('CANVAS');
    // Without the keyboard on it, a moment of a kind not seen yet takes over after a few seconds.
    await show(engine, [M.cots_scar]);
    now += 7000;
    await show(engine, [M.cots_scar, M.grazing]);
    expect(card(t).getAttribute('data-reef-moment')).toBe('grazing');
  });

  it('sits over the bottom corner of the view, after the canvas and before the controls, with no motion when reduced', async () => {
    const t = await mountTool({}, { reduceMotion: true });
    const engine = await startDive(t);
    await show(engine, [M.grazing]);
    const c = card(t), anchor = c.parentElement, canvas = t.host.querySelector('canvas'), controls = t.host.querySelector('.cr-dive-controls');
    expect(anchor.className).toBe('crm-anchor');
    expect(canvas.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(anchor.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING, 'the controls come after the card, untouched').toBeTruthy();
    expect(controls.contains(c)).toBe(false);
    const css = anchor.querySelector('style').textContent;
    expect(css).toContain('.crm-anchor{position:relative;height:0');
    expect(css).toMatch(/\.crm-card\{position:absolute;left:10px;bottom:10px;width:min\(370px,calc\(100% - 20px\)\)/);
    expect(css).toMatch(/@media \(max-width:640px\)\{[^}]*\.crm-card\{left:6px;right:6px;bottom:6px;width:auto/);
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\[data-coralreef-root\] \.crm-anim\{animation:none/);
    // On a phone the buttons share the direction row and the watch note waits.
    expect(css).toMatch(/@media \(max-width:640px\)\{.*\.crm-acts\{grid-column:2;grid-row:1.*\.crm-detail\{display:none\}.*\.crm-hide-text\{display:none\}/);
    expect(c.querySelector('[data-moment-hide] .crm-hide-x')).toBeTruthy();
    expect(c.className).not.toContain('crm-anim');
    const t2 = await mountTool();
    const e2 = await startDive(t2);
    await show(e2, [M.grazing]);
    expect(card(t2).className).toContain('crm-anim');
    expect(card(t2).getAttribute('role')).toBe('group');
    expect(card(t2).getAttribute('aria-live'), 'announcements go through the polite announcer, not a live card').toBeNull();
  });
});

describe('reef moment announcements', () => {
  it('announces once per kind every 20 seconds', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await show(engine, [M.cleaning]);
    expect(said(t)).toEqual(['Reef moment, 3 m to your left: A cleaning station is busy. Right now, a fish is holding still with its fins spread while a cleaner picks at its skin.']);
    now += 5000;
    await show(engine, []);
    await show(engine, [{ ...M.cleaning, uids: ['c2', 'w1'] }]);
    expect(said(t), 'a second cleaning moment 5 s later stays quiet').toHaveLength(1);
    expect(card(t).getAttribute('data-reef-moment'), 'but the card still shows').toBe('cleaning');
    now += 1000;
    await show(engine, [M.cots_scar]);
    expect(said(t), 'another kind is news').toHaveLength(2);
    now += 15000;
    await show(engine, []);
    await show(engine, [{ ...M.cleaning, uids: ['c3', 'w1'] }]);
    expect(said(t), '21 s after the first cleaning').toHaveLength(3);
    // The same moment changing its direction or phase is not news.
    now += 30000;
    await show(engine, [M.turtle_breath]);
    await show(engine, [{ ...M.turtle_breath, phase: 'breathing', bearingDeg: 120 }]);
    expect(said(t)).toHaveLength(4);
    expect(said(t)[3]).toBe('Reef moment, 9 m behind and above you: A turtle comes up to breathe. Right now, a turtle is swimming up to the surface to breathe air.');
  });

  it('never announces while the student is identifying an organism', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await act(async () => engine.focus('o1'));
    expect(t.host.querySelector('[data-id-state="new"]'), 'mid-identification').toBeTruthy();
    await show(engine, [M.turtle_breath]);
    expect(card(t), 'the card still shows').toBeTruthy();
    expect(said(t)).toEqual([]);
    const choices = t.host.querySelector('[role="group"][aria-label="Identify it"]');
    await click(buttons(choices, TX.clownfish.name)[0]);
    expect(t.data.coralReef.speciesLog.clownfish).toBeTruthy();
    await show(engine, [M.turtle_breath, M.grazing]);
    await show(engine, [M.grazing]);
    expect(said(t), 'after the answer, the next moment is announced').toHaveLength(1);
    expect(said(t)[0]).toContain('Grazing on the rock');
  });
});

describe('reef moments seen', () => {
  it('counts a moment once its card has stayed up for two seconds, keeps it in tool data, and shows the collection', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const t = await mountTool();
    const col = () => t.host.querySelector('[data-moment-log]');
    expect(col(), 'the collection is there before the first dive').toBeTruthy();
    expect(col().textContent).toContain('0 of 7 seen');
    expect(col().querySelectorAll('[data-moment]')).toHaveLength(7);
    expect([...col().querySelectorAll('[data-seen="false"]')].every((li) => li.textContent.includes('Not seen yet'))).toBe(true);
    const engine = await startDive(t);
    await show(engine, [M.cots_scar]);
    await wait(1000);
    await show(engine, []);
    await wait(3000);
    expect((t.data.coralReef.momentLog || {}).cots_scar, 'a moment gone within two seconds was not seen').toBeUndefined();
    await show(engine, [M.cleaning]);
    await wait(1900);
    expect((t.data.coralReef.momentLog || {}).cleaning).toBeUndefined();
    await wait(200);
    expect(t.data.coralReef.momentLog.cleaning).toEqual({ firstSeen: now, site: 'healthy' });
    const tile = col().querySelector('[data-moment="cleaning"]');
    expect(tile.getAttribute('data-seen')).toBe('true');
    expect(tile.textContent).toBe('A cleaning station is busySeen');
    expect(col().textContent).toContain('1 of 7 seen');
    // Looking at a moment counts at once.
    await show(engine, [M.turtle_breath]);
    await click(card(t).querySelector('[data-moment-look]'));
    expect(t.data.coralReef.momentLog.turtle_breath).toBeTruthy();
    // Kept: a new visit to the lab shows the same collection.
    const saved = t.data.coralReef;
    const t2 = await mountTool({ ...saved });
    const c2 = t2.host.querySelector('[data-moment-log]');
    expect(c2.textContent).toContain('2 of 7 seen');
    expect(c2.querySelector('[data-moment="turtle_breath"]').getAttribute('data-seen')).toBe('true');
    expect(c2.querySelector('[data-moment="grazing"]').getAttribute('data-seen')).toBe('false');
    // First-seen time does not change on a second sighting.
    const first = t.data.coralReef.momentLog.cleaning.firstSeen;
    await show(engine, [{ ...M.cleaning, uids: ['c9', 'w1'] }]);
    await wait(2500);
    expect(t.data.coralReef.momentLog.cleaning.firstSeen).toBe(first);
  });

  it('lists the moments seen on this dive in the dive log, and in the last-dive card later', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const t = await mountTool({ momentLog: { grazing: { firstSeen: 5, site: 'damaged' } } });
    const engine = await startDive(t);
    now += 1000;
    await show(engine, [M.cleaning]); await wait(2100);
    await show(engine, [M.cleaning, M.grazing]); await wait(6100);
    await show(engine, [M.grazing]); await wait(2100);
    await show(engine, []);
    now += 1000;
    await click(buttons(t.host, 'End the dive')[0]);
    const log = t.host.querySelector('[data-dive-log="this"]');
    expect(log).toBeTruthy();
    const list = log.querySelector('[data-dive-moments]');
    expect(list, 'the dive log lists its moments').toBeTruthy();
    expect(list.querySelector('h4').textContent).toBe('Reef moments on this dive');
    expect([...list.querySelectorAll('[data-dive-moment]')].map((li) => li.getAttribute('data-dive-moment'))).toEqual(['cleaning', 'grazing']);
    expect(list.textContent).toContain('A cleaning station is busy');
    expect(list.textContent).toContain('Grazing on the rock');
    // The collection keeps the first sighting of grazing from an earlier dive.
    expect(t.data.coralReef.momentLog.grazing).toEqual({ firstSeen: 5, site: 'damaged' });
    // Later, the last-dive card shows the same moments.
    const saved = t.data.coralReef;
    const t2 = await mountTool({ ...saved });
    const past = t2.host.querySelector('[data-dive-log="past"]');
    expect(past).toBeTruthy();
    expect([...past.querySelectorAll('[data-dive-moment]')].map((li) => li.getAttribute('data-dive-moment'))).toEqual(['cleaning', 'grazing']);
    // A dive with no moments says so, and does not borrow the last dive's.
    now += 60000;
    await click(buttons(t.host, 'Dive again')[0]);
    now += 30000;
    await click(buttons(t.host, 'End the dive')[0]);
    const again = t.host.querySelector('[data-dive-log="this"] [data-dive-moments]');
    expect(again.getAttribute('data-dive-moments')).toBe('0');
    expect(again.textContent).toContain('None this time.');
  });
});

describe('reef moments: accessibility and text', () => {
  it.each(['light', 'dark', 'contrast'])('the card, collection and dive list are axe-clean in the %s theme', async (theme) => {
    const t = await mountTool({}, { theme });
    const engine = await startDive(t);
    await show(engine, [M.cleaning]);
    await click(card(t).querySelector('[data-moment-look]'));
    let result = await runIsolatedAxe(t.host.innerHTML);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | '))).toEqual([]);
    now += 40000;
    await click(buttons(t.host, 'End the dive')[0]);
    expect(t.host.querySelector('[data-dive-moments]')).toBeTruthy();
    result = await runIsolatedAxe(t.host.innerHTML);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | '))).toEqual([]);
  });

  it('every new string is a literal translated key with no dashes, and the kinds have their own shapes', () => {
    const re = /__alloT\('stem\.coralreef\.(rm_[a-z_]+|sr_moment)', '((?:[^'\\]|\\.)*)'\)/g;
    const keys = new Map();
    for (const m of SRC.matchAll(re)) keys.set(m[1], m[2]);
    expect(keys.size).toBeGreaterThanOrEqual(40);
    for (const [k, v] of keys) expect(/[\u2013\u2014]/.test(v), k).toBe(false);
    // No translated text is glued together outside a template.
    const block = SRC.slice(SRC.indexOf('var MOMENT_KINDS'), SRC.indexOf('function ExploreSection('));
    expect(/__alloT\([^)]*\)\s*\+/.test(block)).toBe(false);
    const icons = SRC.slice(SRC.indexOf('var MOMENT_ICONS'), SRC.indexOf('var LANE_CSS_I1'));
    const paths = [...icons.matchAll(/: '([^']+)'/g)].map((m) => m[1]);
    expect(new Set(paths).size).toBe(7);
  });
});
