import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const TAU = 2 * Math.PI;
const METRICS = [
  'phase', 'distance', 'speed', 'transverse-speed', 'angular-momentum',
  'interval-angle', 'interval-area', 'interval-time',
];

// Exercise actual production handlers without mounting the animation loop.
function renderInspection(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 2,
    missionLog: [],
    journalEntries: [],
    ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        (typeof props.onClick === 'function' || typeof props.onChange === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-k2-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => config.render(ctx)),
      );
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function button(name) {
    return [...document.querySelectorAll('#orrery-k2-inspection button')].find((control) => {
      const label = (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim();
      return label === name;
    });
  }
  function invoke(control, eventName, value) {
    expect(control, 'The production Kepler II control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.k2Callback)?.[eventName];
    expect(handler, 'The rendered control must retain its production callback').toBeTypeOf('function');
    handler({ target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get inspection() { return document.getElementById('orrery-k2-inspection'); },
    get phase() { return document.getElementById('orrery-k2-phase'); },
    get interval() { return document.getElementById('orrery-k2-interval'); },
    button,
    click(control) { invoke(control, 'onClick'); },
    change(control, value) { invoke(control, 'onChange', String(value)); },
  };
}

function metric(name) {
  const node = document.querySelector(`#orrery-k2-inspection dd[data-k2-metric="${name}"]`);
  expect(node, `The ${name} must have a semantic numeric readout`).not.toBeNull();
  const raw = node.getAttribute('data-value');
  expect(raw, `${name} must expose its unrounded value`).not.toBeNull();
  expect(raw.trim()).not.toBe('');
  const value = Number(raw);
  expect(Number.isFinite(value), `${name} must be finite`).toBe(true);
  return value;
}

function readings() {
  return Object.fromEntries(METRICS.map((name) => [name, metric(name)]));
}

// Bisection is independent of the production Newton solver. It also handles
// the two distinct time endpoints at the same physical perihelion position.
function orbitalReadings(e, phase) {
  const mean = TAU * phase;
  let lower = 0, upper = TAU;
  for (let i = 0; i < 90; i++) {
    const middle = (lower + upper) / 2;
    if (middle - e * Math.sin(middle) < mean) lower = middle;
    else upper = middle;
  }
  const anomaly = phase === 0 ? 0 : phase === 1 ? TAU : (lower + upper) / 2;
  const distance = 1 - e * Math.cos(anomaly);
  const momentum = Math.sqrt(1 - e * e);
  let angle = Math.atan2(momentum * Math.sin(anomaly), Math.cos(anomaly) - e);
  if (angle < 0) angle += TAU;
  if (phase === 1) angle = TAU;
  return {
    distance,
    speed: Math.sqrt(2 / distance - 1),
    transverse: momentum / distance,
    momentum,
    angle,
  };
}

function intervalReadings(e, n, index) {
  const start = orbitalReadings(e, index / n);
  const end = orbitalReadings(e, (index + 1) / n);
  return {
    angle: (end.angle - start.angle) * 180 / Math.PI,
    area: Math.PI * Math.sqrt(1 - e * e) / n,
    time: 1 / n,
    midpoint: orbitalReadings(e, (index + 0.5) / n),
  };
}

function selectedInterval(env) {
  const index = Number(env.interval.value);
  const row = document.querySelector(`#orrery-k2-interval-table tr[data-k2-interval="${index}"]`);
  expect(row, 'The selected interval must be represented in the evidence table').not.toBeNull();
  expect(env.button(`Inspect interval ${index + 1}`)?.getAttribute('aria-pressed')).toBe('true');
  const pressed = [...document.querySelectorAll('#orrery-k2-interval-table button[aria-pressed="true"]')];
  expect(pressed).toHaveLength(1);
  return index;
}

function inspectionSave(state) {
  return structuredClone({
    e: state.orr_k2e, n: state.orr_k2s,
    phase: state.orr_k2phase, playing: state.orr_k2playing,
  });
}

function otherWork(state) {
  const { orr_k2e, orr_k2s, orr_k2phase, orr_k2playing, ...rest } = state;
  return structuredClone(rest);
}

function motionPreference(reduced) {
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return true; },
  })));
}

describe('Solar System Kepler II equal-time inspection', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    motionPreference(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('starts paused with named native time controls and finite normalized evidence', () => {
    const env = renderInspection();
    const titleIds = (env.inspection?.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    expect(titleIds.length).toBeGreaterThan(0);
    expect(titleIds.every((id) => document.getElementById(id)?.textContent.trim())).toBe(true);
    expect(env.phase?.type).toBe('range');
    expect([...env.phase.labels].map((label) => label.textContent.trim()).join(' ')).toContain('Orbit time (% of period)');
    expect(env.phase.min).toBe('0');
    expect(env.phase.max).toBe('100');
    expect(env.phase.step).toBe('0.1');
    expect(Number(env.phase.value)).toBe(0);
    expect(env.interval?.tagName).toBe('SELECT');
    expect([...env.interval.labels].map((label) => label.textContent.trim()).join(' ')).toContain('Inspect equal-time interval');
    expect([...env.interval.options].map((option) => option.value)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(env.button('Play orbit')?.disabled).toBe(false);
    expect(env.button('Pause orbit')).toBeUndefined();
    expect(selectedInterval(env)).toBe(0);
    const values = readings();
    expect(values.phase).toBe(0);
    expect(values.distance).toBeCloseTo(0.4, 10);
    expect(values.speed).toBeCloseTo(2, 10);
    expect(values['angular-momentum']).toBeCloseTo(0.8, 10);
    expect(values['interval-time']).toBeCloseTo(1 / 6, 10);
    const canvas = env.inspection.querySelector('canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toContain('Kepler II equal-area visualization');
    expect(canvas?.hasAttribute('tabindex')).toBe(false);
  });

  it('uses the circular reference to show equal speeds, angles and areas through the full orbit', () => {
    const env = renderInspection({ orr_k2e: 0.6, orr_k2s: 6, orr_k2phase: 0.23, orr_k2playing: false });
    env.click(env.button('Circle reference (e = 0)'));
    expect(env.state.orr_k2e).toBe(0);
    for (let index = 0; index < 6; index++) {
      env.change(env.interval, index);
      const values = readings();
      expect(values.phase).toBeCloseTo((index + 0.5) / 6, 10);
      for (const key of ['distance', 'speed', 'transverse-speed', 'angular-momentum']) {
        expect(values[key]).toBeCloseTo(1, 10);
      }
      expect(values['interval-angle']).toBeCloseTo(60, 8);
      expect(values['interval-area']).toBeCloseTo(Math.PI / 6, 10);
      expect(values['interval-time']).toBeCloseTo(1 / 6, 10);
    }
  });

  it.each([0.2, 0.6, 0.95])('independently verifies current and selected-sector measurements at e=%s', (e) => {
    const phase = 0.1234, n = 9;
    const env = renderInspection({ orr_k2e: e, orr_k2s: n, orr_k2phase: phase });
    const current = orbitalReadings(e, phase);
    const index = Math.floor(phase * n);
    const sector = intervalReadings(e, n, index);
    expect(selectedInterval(env)).toBe(index);
    const values = readings();
    expect(values.phase).toBeCloseTo(phase, 10);
    expect(values.distance).toBeCloseTo(current.distance, 8);
    expect(values.speed).toBeCloseTo(current.speed, 8);
    expect(values['transverse-speed']).toBeCloseTo(current.transverse, 8);
    expect(values['angular-momentum']).toBeCloseTo(current.momentum, 10);
    expect(values.distance * values['transverse-speed']).toBeCloseTo(current.momentum, 8);
    expect(values.distance * values.speed).not.toBeCloseTo(current.momentum, 5);
    expect(values['interval-angle']).toBeCloseTo(sector.angle, 7);
    expect(values['interval-area']).toBeCloseTo(sector.area, 10);
    expect(values['interval-time']).toBeCloseTo(sector.time, 10);
  });

  it('distinguishes the beginning and end of the period while matching both physical perihelion endpoints', () => {
    const env = renderInspection({ orr_k2e: 0.95, orr_k2s: 6, orr_k2phase: 0.3, orr_k2playing: false });
    env.click(env.button('Perihelion (0%)'));
    expect(metric('phase')).toBe(0);
    expect(selectedInterval(env)).toBe(0);
    const peri = readings();
    expect(peri.distance).toBeCloseTo(0.05, 10);
    expect(peri.speed).toBeCloseTo(Math.sqrt(39), 8);
    env.click(env.button('Aphelion (50%)'));
    expect(metric('phase')).toBe(0.5);
    expect(metric('distance')).toBeCloseTo(1.95, 10);
    expect(metric('speed')).toBeCloseTo(1 / Math.sqrt(39), 8);
    expect(peri.speed / metric('speed')).toBeCloseTo(39, 8);
    env.change(env.phase, 100);
    expect(env.state.orr_k2phase).toBe(1);
    expect(Number(env.phase.value)).toBe(100);
    expect(metric('phase')).toBe(1);
    expect(selectedInterval(env)).toBe(5);
    expect(metric('distance')).toBeCloseTo(peri.distance, 10);
    expect(metric('speed')).toBeCloseTo(peri.speed, 8);
  });

  it('selects interval midpoints from the native picker and table after pausing time inspection', () => {
    const env = renderInspection({ orr_k2e: 0.6, orr_k2s: 6, orr_k2phase: 0, orr_k2playing: true });
    expect(env.phase.disabled).toBe(true);
    expect(env.interval.disabled).toBe(true);
    expect(env.inspection.querySelectorAll('dd[data-k2-metric]')).toHaveLength(0);
    env.click(env.button('Pause orbit'));
    env.change(env.interval, 2);
    expect(env.state.orr_k2phase).toBeCloseTo(2.5 / 6, 10);
    expect(env.state.orr_k2playing).toBe(false);
    expect(selectedInterval(env)).toBe(2);
    env.click(env.button('Inspect interval 5'));
    expect(env.state.orr_k2phase).toBeCloseTo(4.5 / 6, 10);
    expect(selectedInterval(env)).toBe(4);
    env.click(env.button('Play orbit'));
    expect(env.state.orr_k2playing).toBe(true);
    expect(env.phase.disabled).toBe(true);
    expect(env.interval.disabled).toBe(true);
    env.click(env.button('Pause orbit'));
    env.change(env.phase, 70);
    expect(env.state.orr_k2phase).toBe(0.7);
    expect(env.state.orr_k2playing).toBe(false);
    expect(metric('phase')).toBe(0.7);
    expect(selectedInterval(env)).toBe(4);
  });

  it('steps to adjacent equal-time midpoints and wraps safely across the period boundary', () => {
    const env = renderInspection({ orr_k2s: 6, orr_k2phase: 0, orr_k2playing: false });
    env.click(env.button('Next equal-time interval'));
    expect(env.state.orr_k2phase).toBeCloseTo(1.5 / 6, 10);
    expect(selectedInterval(env)).toBe(1);
    env.click(env.button('Previous equal-time interval'));
    expect(env.state.orr_k2phase).toBeCloseTo(0.5 / 6, 10);
    expect(selectedInterval(env)).toBe(0);
    env.click(env.button('Previous equal-time interval'));
    expect(env.state.orr_k2phase).toBeCloseTo(5.5 / 6, 10);
    expect(selectedInterval(env)).toBe(5);
    env.click(env.button('Next equal-time interval'));
    expect(env.state.orr_k2phase).toBeCloseTo(0.5 / 6, 10);
    expect(selectedInterval(env)).toBe(0);
    expect(env.state.orr_k2playing).toBe(false);
  });

  it('provides an equal-time table whose areas total the orbit and whose nonuniform angles total 360 degrees', () => {
    const e = 0.6, n = 6;
    const env = renderInspection({ orr_k2e: e, orr_k2s: n, orr_k2phase: 0 });
    const table = document.getElementById('orrery-k2-interval-table');
    expect(table?.querySelector('caption')?.textContent.trim()).toBeTruthy();
    expect(table?.querySelectorAll('th[scope="col"]')).toHaveLength(6);
    const rows = [...table.querySelectorAll('tbody tr[data-k2-interval]')];
    expect(rows).toHaveLength(n);
    let areaPercent = 0, sweptAngle = 0;
    for (const [index, row] of rows.entries()) {
      expect(Number(row.dataset.k2Interval)).toBe(index);
      expect(row.querySelector('th[scope="row"]')).not.toBeNull();
      const cells = [...row.querySelectorAll('td')];
      expect(cells).toHaveLength(5);
      const windows = cells[0].textContent.match(/\d+(?:\.\d+)?/g).map(Number);
      expect(windows[0]).toBeCloseTo(index * 100 / n, 1);
      expect(windows[1]).toBeCloseTo((index + 1) * 100 / n, 1);
      const expected = intervalReadings(e, n, index);
      const displayedArea = parseFloat(cells[1].textContent);
      const displayedAngle = parseFloat(cells[2].textContent);
      expect(displayedArea).toBeCloseTo(100 / n, 1);
      expect(displayedAngle).toBeCloseTo(expected.angle, 1);
      expect(parseFloat(cells[3].textContent)).toBeCloseTo(expected.midpoint.distance, 1);
      expect(parseFloat(cells[4].textContent)).toBeCloseTo(expected.midpoint.speed, 1);
      areaPercent += displayedArea;
      sweptAngle += displayedAngle;
    }
    expect(areaPercent).toBeCloseTo(100, 0);
    expect(sweptAngle).toBeCloseTo(360, 0);
    const periSector = intervalReadings(e, n, 0);
    const aphSector = intervalReadings(e, n, 2);
    expect(periSector.area).toBe(aphSector.area);
    expect(periSector.angle).toBeGreaterThan(aphSector.angle);
    env.click(env.button('Inspect interval 3'));
    expect(selectedInterval(env)).toBe(2);
    expect(metric('interval-angle')).toBeCloseTo(aphSector.angle, 7);
  });

  it('requires explicit playback and keeps direct inspection usable with reduced motion', () => {
    const env = renderInspection({
      orr_k2phase: 0.25, orr_k2playing: 'true', orr_time: 12.75,
      journalEntries: [{ observation: 'Saved evidence.' }],
    });
    const before = otherWork(env.state);
    expect(env.button('Play orbit')?.disabled).toBe(false);
    expect(env.state.orr_k2playing).toBe('true');
    expect(metric('phase')).toBe(0.25);
    env.click(env.button('Play orbit'));
    expect(env.state.orr_k2playing).toBe(true);
    expect(env.button('Pause orbit')?.disabled).toBe(false);
    expect(env.phase.disabled).toBe(true);
    expect(env.interval.disabled).toBe(true);
    expect(env.inspection.querySelectorAll('dd[data-k2-metric]')).toHaveLength(0);
    expect(otherWork(env.state)).toEqual(before);
    env.click(env.button('Pause orbit'));
    expect(env.state.orr_k2playing).toBe(false);
    expect(env.phase.disabled).toBe(false);
    expect(env.interval.disabled).toBe(false);
    expect(env.inspection.querySelectorAll('dd[data-k2-metric]')).toHaveLength(METRICS.length);
    readings();
    expect(otherWork(env.state)).toEqual(before);
    // SSR remounts refs and never advances a frame. Browser coverage checks
    // continuity of the live phase captured by Pause orbit.
    motionPreference(true);
    const reduced = renderInspection({ orr_k2phase: 0.25, orr_k2playing: true });
    expect(reduced.state.orr_k2playing).toBe(true);
    expect(reduced.button('Play orbit')?.disabled).toBe(true);
    expect(reduced.button('Pause orbit')).toBeUndefined();
    expect(reduced.phase.disabled).toBe(false);
    expect(metric('phase')).toBe(0.25);
    reduced.change(reduced.phase, 50);
    expect(reduced.state.orr_k2phase).toBe(0.5);
    expect(reduced.state.orr_k2playing).toBe(false);
    expect(selectedInterval(reduced)).toBe(3);
  });

  it('preserves saved experiments and the full Orrery clock while inspecting without awards', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderInspection({
      orr_k2e: 0.6, orr_k2s: 6, orr_k2phase: 0, orr_k2playing: false,
      orr_sel: 'mars', orr_compare: 'earth', orr_time: 12.75, orr_paused: false,
      orr_follow: true, orr_zoom: 'inner', orr_k1e: 0.249, orr_k3hover: 'halley',
      orr_snapshots: { mars: { a: { bodyId: 'mars', t: 0, r: 1.4, v: 26 } } },
      orr_mission_idx: 2, orr_mission_progress: { earth: { started: true, correct: true } },
      keplerInquiry: {
        a: 2, e: 0.4, mass: 1, testVariable: 'e', baseline: { a: 2, e: 0.2, mass: 1 },
        hypothesis: 'Changing shape keeps period fixed.', understood: true,
        explanation: 'The orbit size and central mass remained fixed.', log: [{ a: '2.00', p: '2.83' }],
      },
      journalEntries: [{ planet: 'Mars', observation: 'Saved evidence from another investigation.' }],
      missionLog: [{ text: 'Earlier orbit observation.' }],
    }, { awardXP, tryAward });
    const before = otherWork(env.state);
    const actions = [
      () => env.change(env.phase, 37),
      () => env.change(env.interval, 4),
      () => env.click(env.button('Previous equal-time interval')),
      () => env.click(env.button('Aphelion (50%)')),
      () => env.click(env.button('Circle reference (e = 0)')),
      () => env.change(document.getElementById('orrery-k2-eccentricity'), 0.95),
      () => env.change(document.getElementById('orrery-k2-sectors'), 12),
      () => env.click(env.button('Play orbit')),
      () => env.click(env.button('Pause orbit')),
    ];
    for (const act of actions) {
      act();
      expect(otherWork(env.state)).toEqual(before);
    }
    expect(awardXP).not.toHaveBeenCalled();
    expect(tryAward).not.toHaveBeenCalled();
    expect(env.state.orr_k2e).toBe(0.95);
    expect(env.state.orr_k2s).toBe(12);
    expect(metric('distance')).toBeCloseTo(orbitalReadings(0.95, env.state.orr_k2phase).distance, 8);
    expect(metric('interval-time')).toBeCloseTo(1 / 12, 10);
  });

  it('normalizes malformed or out-of-range saves for display without silently rewriting them', () => {
    const cases = [
      { saved: { orr_k2e: '0.5', orr_k2s: {}, orr_k2phase: '0.4', orr_k2playing: 'true' }, e: 0.6, n: 6, phase: 0 },
      { saved: { orr_k2e: NaN, orr_k2s: Infinity, orr_k2phase: NaN }, e: 0.6, n: 6, phase: 0 },
      { saved: { orr_k2e: -2, orr_k2s: -9, orr_k2phase: -1 }, e: 0, n: 3, phase: 0 },
      { saved: { orr_k2e: 3, orr_k2s: 99, orr_k2phase: 4 }, e: 0.95, n: 12, phase: 1 },
    ];
    for (const entry of cases) {
      const env = renderInspection(entry.saved);
      expect(inspectionSave(env.state)).toEqual(inspectionSave(entry.saved));
      const expected = orbitalReadings(entry.e, entry.phase);
      expect(metric('phase')).toBe(entry.phase);
      expect(metric('distance')).toBeCloseTo(expected.distance, 8);
      expect(metric('speed')).toBeCloseTo(expected.speed, 8);
      expect(metric('angular-momentum')).toBeCloseTo(expected.momentum, 10);
      expect([...env.interval.options]).toHaveLength(entry.n);
      expect(metric('interval-time')).toBeCloseTo(1 / entry.n, 10);
      expect(env.inspection.textContent).not.toMatch(/NaN|Infinity|undefined/);
      expect(env.button('Play orbit')?.disabled).toBe(false);
    }
  });
});
