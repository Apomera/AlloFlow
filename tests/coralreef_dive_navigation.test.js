import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Exercise the learner's controls against the companion contract. Geometry and
// swimming are covered separately by the real-engine suites.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let engines, surveyEngines, mountReady;
const nearby = () => [
  { uid: 'fish-1', speciesId: 'clownfish', distanceM: 3.4, bearingDeg: 30, riseM: 0.4, inView: true },
  { uid: 'coral-1', speciesId: 'brain_coral', distanceM: 7, bearingDeg: -100, riseM: -1.8, inView: false }
];
const button = (host, label) => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const navigation = t => t.host.querySelector('[data-dive-navigation]');
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function emit(ctl, patch) { await act(async () => ctl.emit(patch)); }

beforeEach(() => {
  resetStemLab(); engines = []; surveyEngines = []; mountReady = true;
  window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: mountReady, paused: false, view: 'third', quality: options.quality || 'high',
      diver: { x: 2, y: -8, z: 4, depthM: 8, headingDeg: 90 }, focused: null, navigation: null, nearby: nearby() };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setInput: vi.fn(),
      lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(), lookAtFocused: vi.fn(() => true),
      getState: () => state,
      emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      setView: vi.fn(view => ctl.emit({ view })), setPaused: vi.fn(paused => ctl.emit({ paused })),
      setMagnification: vi.fn(magnification => { ctl.emit({ magnification }); return true; }),
      focusPrevious: vi.fn(), focusNext: vi.fn(), swimTo: vi.fn(),
      cancelSwim: vi.fn(() => ctl.emit({ navigation: null })),
      clearFocus: vi.fn(() => ctl.emit({ focused: null })),
      focus: vi.fn(uid => ctl.emit({ focused: state.nearby.find(item => item.uid === uid) || null })) };
    engines.push(ctl); options.onState(state); return ctl;
  } };
  window.Reef3DHabitat = { version: '1.0.0', create: () => ({}) };
  window.Reef3D = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: true, cameraMode: 'diver', paused: false, pointIndex: 0 };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), lookCamera: vi.fn(),
      zoomCamera: vi.fn(), resetCamera: vi.fn(), getState: () => state,
      emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      goToPoint: vi.fn(pointIndex => ctl.emit({ pointIndex })),
      setCameraMode: vi.fn(cameraMode => ctl.emit({ cameraMode })),
      setPaused: vi.fn(paused => ctl.emit({ paused })) };
    surveyEngines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await act(async () => t.root.unmount()); t.host.remove(); }
  for (const name of ['Reef3DExplore', 'Reef3DSpecies', 'Reef3DHabitat', 'Reef3D', 'THREE', '__RR_TEST_EXPORTS__']) delete window[name];
  vi.restoreAllMocks();
});

async function mountTool(seed = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  let data;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore', ...seed } });
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: message => announcements.push(message) });
  }
  const t = { host, root, announcements, get data() { return data; } }; mounted.push(t);
  await act(async () => root.render(React.createElement(Shell)));
  return t;
}
async function start(t) { await click(button(t.host, 'Start the dive')); return engines[engines.length - 1]; }
function detailSelect(t) {
  return [...t.host.querySelectorAll('select')].find(node => {
    const labels = [...(node.labels || [])].map(label => label.textContent).join(' ');
    return (labels + ' ' + node.getAttribute('aria-label')).includes('Dive detail');
  });
}

describe('dive detail choice', () => {
  it.each([['low', 'Smoother'], ['high', 'Detailed']])('saves %s detail and sends it to the next dive', async (value, label) => {
    const t = await mountTool(), select = detailSelect(t);
    expect(select).toBeTruthy(); expect(select.value).toBe('auto');
    expect([...select.options].map(option => [option.value, option.textContent])).toEqual([
      ['auto', 'Automatic'], ['low', 'Smoother'], ['high', 'Detailed']
    ]);
    await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(t.data.coralReef.diveQuality).toBe(value);
    const ctl = await start(t); expect(ctl.options.quality).toBe(value);
    expect(select.selectedOptions[0].textContent).toBe(label);
  });

  it('restores a saved choice and falls back to automatic for invalid saved data', async () => {
    const saved = await mountTool({ diveQuality: 'low' }); expect(detailSelect(saved).value).toBe('low');
    const invalid = await mountTool({ diveQuality: 'broken' }); expect(detailSelect(invalid).value).toBe('auto');
    const ctl = await start(invalid); expect(['auto', undefined]).toContain(ctl.options.quality);
  });

  it('can retry a failed dive at smoother detail without clearing the species log', async () => {
    const t = await mountTool({ diveQuality: 'high', speciesLog: { clownfish: { site: 'healthy' } } }), first = await start(t);
    await act(async () => first.options.onError(new Error('graphics context lost')));
    expect(first.dispose).toHaveBeenCalledTimes(1);
    const select = detailSelect(t); expect(select).toBeTruthy();
    await act(async () => { select.value = 'low'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(engines).toHaveLength(1);
    await click(button(t.host, 'Try the 3D view again'));
    expect(engines).toHaveLength(2); expect(engines[1].options.quality).toBe('low');
    expect(t.data.coralReef.speciesLog.clownfish).toEqual({ site: 'healthy' });
  });
});

describe('dive navigation', () => {
  it('appears only when ready and provides selection controls without revealing an unidentified name', async () => {
    mountReady = false;
    const t = await mountTool(); expect(navigation(t)).toBeNull();
    const ctl = await start(t); expect(navigation(t)).toBeNull();
    await emit(ctl, { ready: true });
    const nav = navigation(t); expect(nav).toBeTruthy();
    expect(nav.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(button(nav, 'Swim to selected').disabled).toBe(true);
    expect(button(nav, 'Clear selection').disabled).toBe(true);
    await click(button(nav, 'Previous organism')); expect(ctl.focusPrevious).toHaveBeenCalledTimes(1);
    await click(button(nav, 'Next organism')); expect(ctl.focusNext).toHaveBeenCalledTimes(1);
    await emit(ctl, { focused: nearby()[0] });
    expect(nav.textContent).not.toMatch(/clownfish/i);
    expect(button(nav, 'Swim to selected').disabled).toBe(false);
    await click(button(nav, 'Swim to selected')); expect(ctl.swimTo).toHaveBeenLastCalledWith('fish-1');
    await click(button(nav, 'Clear selection')); expect(ctl.clearFocus).toHaveBeenCalledTimes(1);
    expect(button(nav, 'Swim to selected').disabled).toBe(true);
  });

  it('explains why swimming is unavailable while paused and preserves selection for resuming', async () => {
    const t = await mountTool(), ctl = await start(t);
    await emit(ctl, { focused: nearby()[0], paused: true });
    const nav = navigation(t), swim = button(nav, 'Swim to selected');
    expect(swim.disabled).toBe(true);
    expect(nav.textContent).toMatch(/resume|paused/i);
    if (swim.getAttribute('aria-describedby')) expect(document.getElementById(swim.getAttribute('aria-describedby')).textContent).toMatch(/resume|paused/i);
    await click(swim); expect(ctl.swimTo).not.toHaveBeenCalled();
    await emit(ctl, { paused: false }); await click(button(nav, 'Swim to selected'));
    expect(ctl.swimTo).toHaveBeenLastCalledWith('fish-1');
  });

  it.each([false, true])('stops an automatic swim while paused=%s without clearing selection or changing pause', async paused => {
    const t = await mountTool(), ctl = await start(t), nav = navigation(t);
    const status = nav.querySelector('[role="status"]'), stop = button(nav, 'Stop swimming');
    expect(status).toBeTruthy(); expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true'); expect(status.textContent).toBe('');
    expect(stop.disabled).toBe(true);
    await emit(ctl, { focused: nearby()[0], navigation: { uid: 'fish-1' }, paused });
    expect(stop.disabled).toBe(false); expect(nav.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toMatch(paused ? /on hold.*paused/i : /Swimming to an organism/);
    const message = status.textContent;
    await emit(ctl, { diver: { depthM: 9, headingDeg: 120 }, focused: { ...nearby()[0], distanceM: 2 } });
    expect(nav.querySelector('[role="status"]')).toBe(status); expect(status.textContent).toBe(message);
    await click(stop);
    expect(ctl.cancelSwim).toHaveBeenCalledTimes(1); expect(ctl.clearFocus).not.toHaveBeenCalled();
    expect(ctl.setPaused).not.toHaveBeenCalled(); expect(ctl.getState().paused).toBe(paused);
    expect(ctl.getState().focused.uid).toBe('fish-1'); expect(ctl.getState().navigation).toBeNull();
    expect(stop.disabled).toBe(true); expect(status.textContent).toBe('');
  });

  it('keeps radar geometry finite for malformed or partial companion coordinates', async () => {
    const t = await mountTool(), ctl = await start(t);
    const bad = { uid: 'fish-1', speciesId: 'clownfish', distanceM: NaN, bearingDeg: Infinity, riseM: NaN, inView: true };
    await emit(ctl, { diver: { x: NaN, z: Infinity, depthM: 8, headingDeg: NaN }, nearby: [bad, { ...nearby()[1], bearingDeg: undefined }], focused: bad });
    const nav = navigation(t); expect(nav).toBeTruthy();
    expect(nav.outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('places ahead, right, behind and left cues relative to the diver without rotating twice', async () => {
    const t = await mountTool(), ctl = await start(t);
    const cues = [0, 90, 180, -90].map((bearingDeg, i) => ({ ...nearby()[0], uid: 'cue-' + i, bearingDeg, distanceM: 4 }));
    await emit(ctl, { nearby: cues, diver: { depthM: 8, headingDeg: 90 } });
    const coords = () => [...navigation(t).querySelectorAll('svg > g')].map(group => {
      const dot = group.querySelector('circle:last-child'); return { x: +dot.getAttribute('cx'), y: +dot.getAttribute('cy') };
    });
    const positions = coords(); expect(positions).toHaveLength(4);
    expect(positions[0].x).toBeCloseTo(74); expect(positions[0].y).toBeLessThan(74);
    expect(positions[1].x).toBeGreaterThan(74); expect(positions[1].y).toBeCloseTo(74);
    expect(positions[2].x).toBeCloseTo(74); expect(positions[2].y).toBeGreaterThan(74);
    expect(positions[3].x).toBeLessThan(74); expect(positions[3].y).toBeCloseTo(74);
    await emit(ctl, { nearby: cues.map(cue => ({ ...cue, bearingDeg: cue.bearingDeg - 90 })), diver: { depthM: 8, headingDeg: 180 } });
    expect(coords()[0].x).toBeLessThan(74); expect(coords()[0].y).toBeCloseTo(74);
  });

  it('aims at a selected organism without swimming or changing pause and disables aiming during travel', async () => {
    const t = await mountTool(), ctl = await start(t), nav = navigation(t);
    const aim = button(nav, 'Aim camera at selection'); expect(aim).toBeTruthy(); expect(aim.disabled).toBe(true);
    await emit(ctl, { focused: nearby()[0], paused: true }); expect(aim.disabled).toBe(false);
    aim.focus(); await click(aim); expect(ctl.lookAtFocused).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(aim); expect(ctl.swimTo).not.toHaveBeenCalled(); expect(ctl.setPaused).not.toHaveBeenCalled();
    await emit(ctl, { navigation: { uid: 'fish-1' } }); expect(aim.disabled).toBe(true);
    await click(aim); expect(ctl.lookAtFocused).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected distant organism on the radar even when it is outside the nearby list', async () => {
    const t = await mountTool(), ctl = await start(t);
    await emit(ctl, { focused: { ...nearby()[0], uid: 'far-organism', distanceM: 55, bearingDeg: 125 } });
    const nav = navigation(t), dots = [...nav.querySelectorAll('svg > g')];
    expect(dots).toHaveLength(3);
    const selected = dots.find(group => group.querySelectorAll('circle').length === 2); expect(selected).toBeTruthy();
    expect(nav.textContent).toContain('55 m away'); expect(nav.outerHTML).not.toMatch(/NaN|Infinity/);
    await click(button(nav, 'Aim camera at selection')); expect(ctl.lookAtFocused).toHaveBeenCalledTimes(1);
  });

  it('announces distant selections neutrally while preserving nearby organism ordinals', async () => {
    const t = await mountTool(), ctl = await start(t);
    await emit(ctl, { focused: { ...nearby()[0], uid: 'distant-with-direction', distanceM: 55 } });
    expect(t.announcements.at(-1)).toMatch(/^Selected organism, 55 meters away, .+\.$/);
    expect(t.announcements.at(-1)).not.toContain('organism 1');
    await emit(ctl, { focused: { ...nearby()[0], uid: 'distant-without-direction', distanceM: 32, bearingDeg: undefined } });
    expect(t.announcements.at(-1)).toBe('Selected organism, 32 meters away.');
    await emit(ctl, { focused: nearby()[1] });
    expect(t.announcements.at(-1)).toMatch(/^Looking at organism 2, 7 meters away, .+\.$/);
    await emit(ctl, { focused: { ...nearby()[0], bearingDeg: undefined } });
    expect(t.announcements.at(-1)).toBe('Looking at organism 1, 3 meters away.');
  });

  it('does not offer active actions that an older companion cannot perform', async () => {
    const t = await mountTool(), ctl = await start(t);
    for (const key of ['focusPrevious', 'focusNext', 'swimTo', 'clearFocus', 'cancelSwim', 'lookAtFocused']) delete ctl[key];
    await emit(ctl, { focused: nearby()[0], navigation: { uid: 'fish-1' } });
    const nav = navigation(t); expect(nav).toBeTruthy();
    for (const label of ['Previous organism', 'Next organism', 'Swim to selected', 'Clear selection', 'Stop swimming', 'Aim camera at selection']) {
      const node = button(nav, label); if (node) expect(node.disabled || node.getAttribute('aria-disabled') === 'true', label).toBe(true);
    }
  });

  it('expands the same live canvas without rebuilding the reef or clearing its focus', async () => {
    const t = await mountTool(), ctl = await start(t);
    await emit(ctl, { focused: nearby()[0] });
    const canvas = ctl.canvas, expand = button(t.host, 'Expand view'), before = canvas.className;
    expect(expand).toBeTruthy(); expect(expand.getAttribute('aria-pressed')).toBe('false');
    expand.focus(); await click(expand);
    expect(expand.getAttribute('aria-pressed')).toBe('true');
    expect(canvas.className).not.toBe(before); expect(canvas.className).toMatch(/expanded/);
    expect(t.host.contains(canvas)).toBe(true); expect(engines).toHaveLength(1); expect(ctl.dispose).not.toHaveBeenCalled();
    expect(ctl.getState().focused.uid).toBe('fish-1'); expect(document.activeElement).toBe(expand);
    await click(expand); expect(expand.getAttribute('aria-pressed')).toBe('false'); expect(canvas.className).toBe(before);
  });

  it.each(['Next organism', 'Expand view'])('restores title focus when a graphics failure removes the focused %s control', async label => {
    const t = await mountTool(), ctl = await start(t), control = button(t.host, label);
    const title = t.host.querySelector('#cr-dive-title');
    expect(control).toBeTruthy(); control.focus(); expect(document.activeElement).toBe(control);
    await act(async () => ctl.options.onError(new Error('graphics context lost')));
    expect(document.activeElement).toBe(title); expect(title.isConnected).toBe(true);
    expect(control.isConnected).toBe(false); expect(ctl.dispose).toHaveBeenCalledTimes(1);
    expect(t.host.querySelector('[role="alert"]').textContent).toContain('3D dive could not start');
  });
});

describe('observation lens controls', () => {
  const lens = t => navigation(t).querySelector('[data-dive-lens] select');
  async function choose(t, value) {
    const select = lens(t);
    await act(async () => { select.focus(); select.value = String(value); select.dispatchEvent(new Event('change', { bubbles: true })); });
  }

  it('offers a labelled lens with clear help and a wide-view default', async () => {
    const t = await mountTool(), ctl = await start(t), select = lens(t);
    expect(select.value).toBe('1');
    expect(select.labels[0].textContent).toBe('Observation lens');
    expect([...select.options].map(option => [option.value, option.textContent])).toEqual([['1', '1× · Wide view'], ['2', '2×'], ['4', '4×'], ['8', '8×']]);
    expect(document.getElementById(select.getAttribute('aria-describedby')).textContent).toMatch(/Approach a small animal.*aim.*Reef surfaces can still hide it/);
    expect(ctl.setMagnification).not.toHaveBeenCalled();
    expect((await runIsolatedAxe(navigation(t).outerHTML)).violations.map(v => v.id)).toEqual([]);
  }, 60000);

  it.each(['third', 'first'])('magnifies while paused in %s view without moving, identifying, or remounting', async view => {
    const t = await mountTool({ speciesLog: { brain_coral: { site: 'healthy' } }, speciesFieldNotes: { clownfish: 'My note' } }), ctl = await start(t);
    await emit(ctl, { paused: true, view, focused: nearby()[0] });
    const before = JSON.stringify(t.data), diver = ctl.getState().diver, selected = ctl.getState().focused;
    t.announcements.length = 0;
    for (const factor of [2, 4, 8, 1]) {
      await choose(t, factor);
      expect(ctl.setMagnification).toHaveBeenLastCalledWith(factor);
      expect(lens(t).value).toBe(String(factor)); expect(document.activeElement).toBe(lens(t));
    }
    expect(ctl.getState().paused).toBe(true); expect(ctl.getState().view).toBe(view);
    expect(ctl.getState().diver).toBe(diver); expect(ctl.getState().focused).toBe(selected);
    expect(ctl.swimTo).not.toHaveBeenCalled(); expect(ctl.lookAtFocused).not.toHaveBeenCalled(); expect(ctl.setPaused).not.toHaveBeenCalled();
    expect(JSON.stringify(t.data)).toBe(before); expect(engines).toHaveLength(1);
    expect(t.announcements.at(-1)).toBe('Observation lens returned to wide view. Your diver has not moved.');
    expect(navigation(t).textContent).not.toMatch(/clownfish/i);
  });

  it('keeps wide view available during an automatic swim and rejects magnifying that swim', async () => {
    const t = await mountTool(), ctl = await start(t);
    await emit(ctl, { navigation: { uid: 'fish-1' }, magnification: 4 });
    expect([...lens(t).options].map(option => option.disabled)).toEqual([false, true, true, true]);
    expect(document.getElementById(lens(t).getAttribute('aria-describedby')).textContent).toMatch(/Stop the automatic swim/);
    await choose(t, 8); expect(ctl.setMagnification).not.toHaveBeenCalled();
    await choose(t, 1); expect(ctl.setMagnification).toHaveBeenLastCalledWith(1);
    expect(ctl.cancelSwim).not.toHaveBeenCalled(); expect(ctl.getState().navigation.uid).toBe('fish-1');
  });

  it('reflects engine resets and does not announce a rejected lens request', async () => {
    const t = await mountTool(), ctl = await start(t);
    await choose(t, 8); expect(lens(t).value).toBe('8');
    await emit(ctl, { magnification: 1 }); expect(lens(t).value).toBe('1');
    ctl.setMagnification.mockImplementation(() => false); t.announcements.length = 0;
    await choose(t, 4); expect(lens(t).value).toBe('1'); expect(t.announcements).toEqual([]);
    await emit(ctl, { magnification: Infinity }); expect(lens(t).value).toBe('1');
    delete ctl.setMagnification; await emit(ctl, { magnification: 1 });
    expect(lens(t)).toBeNull();
  });

  it('starts a new site with wide view while preserving the learner records', async () => {
    const t = await mountTool({ speciesLog: { clownfish: { site: 'healthy' } } }), ctl = await start(t);
    await choose(t, 8);
    await click(t.host.querySelector('[data-site="heatwave"]'));
    expect(engines).toHaveLength(2); expect(ctl.dispose).toHaveBeenCalledTimes(1);
    expect(lens(t).value).toBe('1'); expect(engines[1].setMagnification).not.toHaveBeenCalled();
    expect(t.data.coralReef.speciesLog.clownfish.site).toBe('healthy');
  });
});

describe('survey camera overview', () => {
  it('switches between diver and whole-transect views without moving the survey point or remounting', async () => {
    const t = await mountTool({ section: 'survey', surveyView: '3d', pointIndex: 3 }), ctl = surveyEngines[0];
    expect(ctl).toBeTruthy();
    const overview = button(t.host, 'Whole transect'), diver = button(t.host, 'Diver view');
    expect(diver.getAttribute('aria-pressed')).toBe('true'); expect(overview.getAttribute('aria-pressed')).toBe('false');
    const pointCalls = ctl.goToPoint.mock.calls.length;
    await click(overview); expect(ctl.setCameraMode.mock.calls.at(-1)[0]).toBe('overview');
    expect(overview.getAttribute('aria-pressed')).toBe('true'); expect(diver.getAttribute('aria-pressed')).toBe('false');
    expect(t.data.coralReef.pointIndex).toBe(3); expect(ctl.goToPoint).toHaveBeenCalledTimes(pointCalls);
    await click(diver); expect(ctl.setCameraMode.mock.calls.at(-1)[0]).toBe('diver');
    expect(surveyEngines).toHaveLength(1); expect(ctl.dispose).not.toHaveBeenCalled();
  });
});
