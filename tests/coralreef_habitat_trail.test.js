import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let engines, available, mountReady;
const target = (speciesId, distanceM = 12) => ({ uid: 'target-' + speciesId, speciesId, distanceM, bearingDeg: 30, riseM: -0.5, inView: false });
const button = (host, label) => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const trail = t => t.host.querySelector('[data-habitat-trail]');
const stopTitle = t => [...trail(t).querySelectorAll('h3,h4,h5,p,strong')].find(node => /^Stop \d+ of \d+:/.test(node.textContent));
const records = t => JSON.stringify({ speciesLog: t.data.coralReef.speciesLog, momentLog: t.data.coralReef.momentLog, notes: t.data.coralReef.speciesFieldNotes, practice: t.data.coralReef.speciesPractice });
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function emit(ctl, patch) { await act(async () => ctl.emit(patch)); }

beforeEach(() => {
  resetStemLab(); engines = []; mountReady = true;
  available = { staghorn_coral: target('staghorn_coral'), sea_cucumber: target('sea_cucumber'), sea_fan: target('sea_fan') };
  window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: mountReady, paused: false, view: 'third', quality: 'low', navigation: null,
      diver: { x: 2, y: -8, z: 4, depthM: 8, headingDeg: 90 }, focused: null, nearby: [], moments: [] };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setInput: vi.fn(),
      lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(), lookAtFocused: vi.fn(() => true),
      getState: () => state, emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      findSpecies: vi.fn(id => available[id] || null),
      focus: vi.fn(uid => { const found = Object.values(available).find(item => item && item.uid === uid); if (!found) return false; ctl.emit({ focused: found }); return true; }),
      setView: vi.fn(view => ctl.emit({ view })), setPaused: vi.fn(paused => ctl.emit({ paused })),
      focusPrevious: vi.fn(), focusNext: vi.fn(), swimTo: vi.fn(), cancelSwim: vi.fn(), clearFocus: vi.fn() };
    engines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await act(async () => t.root.unmount()); t.host.remove(); }
  for (const name of ['Reef3DExplore', 'Reef3DSpecies', 'THREE', '__RR_TEST_EXPORTS__']) delete window[name];
  vi.restoreAllMocks();
});
async function mountTool() {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  let data;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore', speciesLog: { clownfish: { site: 'healthy' } }, speciesFieldNotes: { clownfish: 'Keep my observation' } } });
    data = toolData; return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data; } }; mounted.push(t);
  await act(async () => root.render(React.createElement(Shell))); return t;
}
async function ready() { const t = await mountTool(); await click(button(t.host, 'Start the dive')); return Object.assign(t, { ctl: engines[0] }); }
async function begin(t) { trail(t).open = true; await click(button(trail(t), 'Start habitat trail')); }
async function chooseRoute(t, value) {
  const select = trail(t).querySelector('select');
  await act(async () => { select.focus(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
  return select;
}

describe('optional habitat exploration trail', () => {
  it('stays collapsed and does no population lookup until explicitly started', async () => {
    mountReady = false; const t = await ready(); expect(trail(t)).toBeNull();
    await emit(t.ctl, { ready: true });
    const details = trail(t); expect(details.tagName).toBe('DETAILS'); expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent).toBe('Explore reef habitats');
    expect(t.ctl.findSpecies).not.toHaveBeenCalled();
    details.open = true; await emit(t.ctl, { diver: { depthM: 9, headingDeg: 120 } });
    expect(t.ctl.findSpecies).not.toHaveBeenCalled();
  });

  it('locates a real coral anchor without naming it, swimming, unpausing or awarding discovery', async () => {
    const t = await ready(); await emit(t.ctl, { paused: true }); const before = records(t);
    await begin(t);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 3: Coral garden');
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-staghorn_coral');
    expect(t.ctl.lookAtFocused).toHaveBeenCalledTimes(1);
    expect(t.ctl.swimTo).not.toHaveBeenCalled(); expect(t.ctl.setPaused).not.toHaveBeenCalled();
    expect(t.ctl.getState().paused).toBe(true); expect(records(t)).toBe(before);
    expect(trail(t).textContent).not.toMatch(/staghorn coral|sea cucumber|sea fan/i);
    expect(document.activeElement).toBe(button(trail(t), 'Locate stop'));
  });

  it('changes stops only through explicit next and previous actions', async () => {
    const t = await ready(); await begin(t); const before = records(t);
    await click(button(trail(t), 'Next stop'));
    expect(stopTitle(t).textContent).toBe('Stop 2 of 3: Sandy bottom'); expect(t.ctl.focus).toHaveBeenLastCalledWith('target-sea_cucumber');
    await click(button(trail(t), 'Next stop'));
    expect(stopTitle(t).textContent).toBe('Stop 3 of 3: Reef slope'); expect(t.ctl.focus).toHaveBeenLastCalledWith('target-sea_fan');
    await click(button(trail(t), 'Previous stop'));
    expect(stopTitle(t).textContent).toBe('Stop 2 of 3: Sandy bottom'); expect(t.ctl.focus).toHaveBeenLastCalledWith('target-sea_cucumber');
    expect(t.ctl.swimTo).not.toHaveBeenCalled(); expect(t.ctl.setPaused).not.toHaveBeenCalled(); expect(records(t)).toBe(before);
  });

  it('skips unavailable habitats and rejects malformed lookup results before choosing valid fallbacks', async () => {
    available = { staghorn_coral: { ...target('staghorn_coral'), speciesId: 'brain_coral' }, brain_coral: target('brain_coral'),
      spotted_garden_eel: { ...target('spotted_garden_eel'), uid: '' }, sea_cucumber: { ...target('sea_cucumber'), distanceM: NaN },
      sea_fan: { ...target('sea_fan'), distanceM: Infinity }, barrel_sponge: target('barrel_sponge') };
    const t = await ready(); await begin(t);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 2: Coral garden'); expect(t.ctl.focus).toHaveBeenLastCalledWith('target-brain_coral');
    await click(button(trail(t), 'Next stop'));
    expect(stopTitle(t).textContent).toBe('Stop 2 of 2: Reef slope'); expect(t.ctl.focus).toHaveBeenLastCalledWith('target-barrel_sponge');
    expect(trail(t).outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('rechecks availability and does not advance when a target can no longer be found', async () => {
    const t = await ready(); await begin(t); const calls = t.ctl.findSpecies.mock.calls.length;
    delete available.sea_cucumber;
    await click(button(trail(t), 'Next stop'));
    expect(t.ctl.findSpecies.mock.calls.length).toBeGreaterThan(calls);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 3: Coral garden'); expect(t.ctl.focus).toHaveBeenCalledTimes(1);
    available.sea_cucumber = target('sea_cucumber', 6);
    await click(button(trail(t), 'Next stop')); expect(stopTitle(t).textContent).toBe('Stop 2 of 3: Sandy bottom');
  });

  it('does not repeat lookups or advance after telemetry, focus changes, or automatic-swim arrival', async () => {
    const t = await ready(); await begin(t); const calls = t.ctl.findSpecies.mock.calls.length, focusCalls = t.ctl.focus.mock.calls.length;
    for (let index = 0; index < 4; index++) await emit(t.ctl, { diver: { depthM: 8 + index, headingDeg: 100 + index }, nearby: [target('sea_fan', 3)], navigation: index === 0 ? { uid: 'target-sea_fan' } : null, focused: target('sea_fan', 3) });
    expect(t.ctl.findSpecies).toHaveBeenCalledTimes(calls); expect(t.ctl.focus).toHaveBeenCalledTimes(focusCalls);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 3: Coral garden');
    await click(button(trail(t), 'Locate stop'));
    expect(t.ctl.findSpecies.mock.calls.length).toBeGreaterThan(calls); expect(t.ctl.focus).toHaveBeenLastCalledWith('target-staghorn_coral');
  });

  it('does not aim the camera during an existing automatic swim', async () => {
    const t = await ready(); await emit(t.ctl, { navigation: { uid: 'another-organism' } }); await begin(t);
    expect(t.ctl.focus).toHaveBeenCalled(); expect(t.ctl.lookAtFocused).not.toHaveBeenCalled();
    expect(t.ctl.cancelSwim).not.toHaveBeenCalled(); expect(t.ctl.swimTo).not.toHaveBeenCalled();
  });

  it('closes locally, restores Start focus and preserves the selected organism, pause and learner records', async () => {
    const t = await ready(); await begin(t); await click(button(trail(t), 'Next stop')); await emit(t.ctl, { paused: true });
    const before = records(t), focused = t.ctl.getState().focused;
    await click(button(trail(t), 'Close trail'));
    expect(stopTitle(t)).toBeUndefined(); expect(document.activeElement).toBe(button(trail(t), 'Start habitat trail'));
    expect(t.ctl.getState().focused).toBe(focused); expect(t.ctl.getState().paused).toBe(true);
    expect(t.ctl.clearFocus).not.toHaveBeenCalled(); expect(t.ctl.cancelSwim).not.toHaveBeenCalled(); expect(records(t)).toBe(before);
    await begin(t); expect(stopTitle(t).textContent).toBe('Stop 1 of 3: Coral garden');
  });

  it('resets when the dive site creates a new controller', async () => {
    const t = await ready(); await begin(t); await click(button(trail(t), 'Next stop'));
    await click(t.host.querySelector('[data-site="heatwave"]'));
    expect(engines).toHaveLength(2); expect(t.ctl.dispose).toHaveBeenCalledTimes(1);
    expect(stopTitle(t)).toBeUndefined(); expect(button(trail(t), 'Start habitat trail')).toBeTruthy();
    expect(engines[1].findSpecies).not.toHaveBeenCalled();
  });

  it('keeps the expanded active habitat trail and navigator axe-clean', async () => {
    const t = await ready(); await begin(t);
    // Audit only these added controls, preserving their local label/help targets.
    // The isolated helper excludes color contrast because jsdom has no layout.
    const navigation = t.host.querySelector('[data-dive-navigation]');
    navigation.querySelector('details').open = true;
    await emit(t.ctl, { paused: true, navigation: { uid: 'target-staghorn_coral' } });
    expect(trail(t).open).toBe(true); expect(stopTitle(t)).toBeTruthy();
    const result = await runIsolatedAxe(navigation.outerHTML + trail(t).outerHTML);
    expect(result.violations.map(violation => violation.id + ': ' + violation.nodes.map(node => node.target.join(' ')).join(' | '))).toEqual([]);
  }, 60000);

  it('offers distinct trails without looking up species until Start is used', async () => {
    const t = await ready(); trail(t).open = true;
    const select = await chooseRoute(t, 'small');
    expect([...select.options].map(option => option.textContent)).toEqual(['Reef habitats', 'Small reef life', 'Open-water swimmers']);
    expect(select.labels[0].textContent).toBe('Choose a trail');
    expect(document.getElementById(select.getAttribute('aria-describedby')).textContent).toMatch(/tiny neighbours/);
    await chooseRoute(t, 'swimmers');
    expect(document.getElementById(select.getAttribute('aria-describedby')).textContent).toMatch(/current position/);
    expect(t.ctl.findSpecies).not.toHaveBeenCalled();
    expect(t.ctl.focus).not.toHaveBeenCalled();
  });

  it('uses the small-life trail to reveal actual nearby habitats without naming the animals', async () => {
    available = { porcelain_anemone_crab: target('porcelain_anemone_crab'), varicose_phyllidia: target('varicose_phyllidia'), orange_cup_coral: target('orange_cup_coral') };
    const t = await ready(); const before = records(t);
    await chooseRoute(t, 'small'); await begin(t);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 3: Among the tentacles');
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-porcelain_anemone_crab');
    await click(button(trail(t), 'Next stop'));
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-varicose_phyllidia');
    await click(button(trail(t), 'Next stop'));
    expect(stopTitle(t).textContent).toBe('Stop 3 of 3: Life on the reef');
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-orange_cup_coral');
    expect(trail(t).textContent).not.toMatch(/porcelain|phyllidia|orange cup/);
    expect(t.ctl.swimTo).not.toHaveBeenCalled(); expect(records(t)).toBe(before);
  });

  it('relocates a moving swimmer using its live position and retains available alternatives', async () => {
    available = { reef_manta: target('reef_manta'), broadclub_cuttlefish: target('broadclub_cuttlefish'), longfin_bannerfish: target('longfin_bannerfish') };
    const t = await ready(); await emit(t.ctl, { paused: true });
    await chooseRoute(t, 'swimmers'); await begin(t);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 3: Broad-winged swimmers');
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-reef_manta');
    available.reef_manta = { ...target('reef_manta', 4), uid: 'closer-manta' };
    await click(button(trail(t), 'Locate stop'));
    expect(t.ctl.focus).toHaveBeenLastCalledWith('closer-manta');
    expect(trail(t).querySelector('[role="status"]').textContent).toMatch(/about 4 m away/);
    await click(button(trail(t), 'Next stop'));
    expect(stopTitle(t).textContent).toBe('Stop 2 of 3: Rippling fins');
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-broadclub_cuttlefish');
    expect(t.ctl.getState().paused).toBe(true); expect(t.ctl.setPaused).not.toHaveBeenCalled();
  });

  it('does not promise an anemone habitat from a clownfish that may have no host', async () => {
    available = { clownfish: target('clownfish'), white_spotted_hermit_crab: target('white_spotted_hermit_crab') };
    const t = await ready(); await chooseRoute(t, 'small'); await begin(t);
    expect(stopTitle(t).textContent).toBe('Stop 1 of 1: Small life near the bottom');
    expect(t.ctl.focus).toHaveBeenLastCalledWith('target-white_spotted_hermit_crab');
    expect(trail(t).querySelector('[data-habitat-trail-stop="anemone"]')).toBeNull();
  });

  it('switches routes locally without taking focus or changing an existing swim, selection, or records', async () => {
    const t = await ready(); await begin(t);
    await emit(t.ctl, { paused: true, navigation: { uid: 'target-staghorn_coral' } });
    const before = records(t), state = t.ctl.getState(), calls = t.ctl.findSpecies.mock.calls.length;
    const select = await chooseRoute(t, 'swimmers');
    expect(document.activeElement).toBe(select); expect(stopTitle(t)).toBeUndefined();
    expect(t.ctl.findSpecies).toHaveBeenCalledTimes(calls);
    expect(t.ctl.getState()).toBe(state); expect(records(t)).toBe(before);
    expect(t.ctl.cancelSwim).not.toHaveBeenCalled(); expect(t.ctl.clearFocus).not.toHaveBeenCalled();
    await begin(t);
    expect(stopTitle(t)).toBeUndefined();
    expect(trail(t).querySelector('[role="status"]').textContent).toMatch(/No habitat trail stops are available/);
    expect(t.ctl.getState()).toBe(state);
  });

  it('keeps the small-life route accessible and resets the route on a new dive site', async () => {
    available.porcelain_anemone_crab = target('porcelain_anemone_crab');
    const t = await ready(); await chooseRoute(t, 'small'); await begin(t);
    const result = await runIsolatedAxe(trail(t).outerHTML);
    expect(result.violations.map(violation => violation.id)).toEqual([]);
    await click(t.host.querySelector('[data-site="heatwave"]'));
    expect(trail(t).querySelector('select').value).toBe('habitats');
    expect(stopTitle(t)).toBeUndefined(); expect(engines[1].findSpecies).not.toHaveBeenCalled();
  }, 60000);
});
