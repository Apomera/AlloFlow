import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const TAU = 2 * Math.PI;
const METRICS = ['phase', 'focus-one', 'focus-two', 'focal-sum', 'semi-minor', 'focus-offset', 'perihelion', 'aphelion'];
const PRESETS = [
  ['Circle (0)', 0], ['Venus (0.007)', 0.007], ['Earth (0.017)', 0.017],
  ['Mars (0.093)', 0.093], ['Mercury (0.206)', 0.206], ['Pluto (0.249)', 0.249], ['Halley (0.967)', 0.967],
];

// Capture real element handlers and exercise production callbacks without
// mounting the animation loop. Live pause continuity is covered in browsers.
function renderInspection(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false,
    orreryMode: true, orr_tab: 1, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        (typeof props.onClick === 'function' || typeof props.onChange === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-k1-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => config.render(ctx)));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function button(name) {
    return [...document.querySelectorAll('#orrery-k1-inspection button')].find((control) =>
      (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim() === name);
  }
  function invoke(control, eventName, value) {
    expect(control, 'The production Kepler I control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.k1Callback)?.[eventName];
    expect(handler).toBeTypeOf('function');
    handler({ target: value === undefined ? control : { value: String(value) }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get inspection() { return document.getElementById('orrery-k1-inspection'); },
    get phase() { return document.getElementById('orrery-k1-phase'); },
    get eccentricity() { return document.getElementById('orrery-k1-eccentricity'); },
    button,
    click(control) { invoke(control, 'onClick'); },
    change(control, value) { invoke(control, 'onChange', value); },
  };
}

function metric(name) {
  const node = document.querySelector(`#orrery-k1-inspection dd[data-k1-metric="${name}"]`);
  expect(node, `${name} must have a semantic numeric readout`).not.toBeNull();
  const raw = node.getAttribute('data-value');
  expect(raw).not.toBeNull();
  expect(raw.trim()).not.toBe('');
  const value = Number(raw);
  expect(Number.isFinite(value), `${name} must be finite`).toBe(true);
  return value;
}

function readings() {
  return Object.fromEntries(METRICS.map((name) => [name, metric(name)]));
}

// Independent bisection and Cartesian distances verify the ellipse theorem,
// rather than assuming the production distance formulas already hold.
function focalReadings(e, phase) {
  const mean = phase * TAU;
  let lower = 0, upper = TAU;
  for (let i = 0; i < 90; i++) {
    const middle = (lower + upper) / 2;
    if (middle - e * Math.sin(middle) < mean) lower = middle;
    else upper = middle;
  }
  const E = phase === 0 ? 0 : phase === 1 ? TAU : (lower + upper) / 2;
  const b = Math.sqrt(1 - e * e), x = Math.cos(E), y = -b * Math.sin(E);
  return { r1: Math.hypot(x - e, y), r2: Math.hypot(x + e, y), b };
}

function expectProof(e, phase) {
  const expected = focalReadings(e, phase), values = readings();
  expect(values.phase).toBeCloseTo(phase, 10);
  expect(values['focus-one']).toBeCloseTo(expected.r1, 8);
  expect(values['focus-two']).toBeCloseTo(expected.r2, 8);
  expect(values['focus-one'] + values['focus-two']).toBeCloseTo(2, 8);
  expect(values['focal-sum']).toBeCloseTo(expected.r1 + expected.r2, 8);
  expect(values['semi-minor']).toBeCloseTo(expected.b, 10);
  expect(values['focus-offset']).toBeCloseTo(e, 10);
  expect(values.perihelion).toBeCloseTo(1 - e, 10);
  expect(values.aphelion).toBeCloseTo(1 + e, 10);
}

function otherWork(state) {
  const { orr_k1e, orr_k1phase, orr_k1playing, orr_k1axes, ...rest } = state;
  return structuredClone(rest);
}

function motionPreference(reduced) {
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  })));
}

describe('Solar System Kepler I focal-proof inspection', () => {
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

  it('starts paused with named native controls, a nonfocusable image and compatible ellipse evidence', () => {
    const env = renderInspection();
    expect(env.inspection?.getAttribute('aria-labelledby')).toBe('orrery-k1-title');
    expect(document.getElementById('orrery-k1-title')?.textContent.trim()).toBeTruthy();
    expect(env.eccentricity?.type).toBe('range');
    expect(env.eccentricity.min).toBe('0');
    expect(env.eccentricity.max).toBe('0.98');
    expect(env.eccentricity.step).toBe('0.001');
    expect([...env.eccentricity.labels].map((label) => label.textContent).join(' ')).toContain('Eccentricity');
    expect(env.phase?.type).toBe('range');
    expect(env.phase.min).toBe('0');
    expect(env.phase.max).toBe('100');
    expect(env.phase.step).toBe('0.1');
    expect([...env.phase.labels].map((label) => label.textContent).join(' ')).toContain('Orbit time (% of period)');
    expect(env.button('Play orbit')?.disabled).toBe(false);
    expect(env.button('Pause orbit')).toBeUndefined();
    expect(env.button('Show axes and center')?.getAttribute('aria-pressed')).toBe('true');
    const canvas = env.inspection.querySelector('canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toMatch(/^Kepler I orbit visualization/);
    expect(canvas?.getAttribute('aria-describedby')).toBe('orrery-k1-evidence');
    expect(canvas?.hasAttribute('tabindex')).toBe(false);
    const evidence = document.getElementById('orrery-k1-evidence');
    expect(evidence?.getAttribute('role')).toBe('status');
    expect(evidence?.getAttribute('aria-live')).toBe('polite');
    expect(evidence?.getAttribute('aria-atomic')).toBe('true');
    expect(evidence?.textContent).toContain('Perihelion = 0.500a');
    expect(evidence?.textContent).toContain('aphelion = 1.500a');
    expect(evidence?.textContent).toContain('b/a = 0.866');
    expect(evidence?.textContent).toMatch(/center.to.focus/i);
    expect(evidence?.textContent).not.toContain('Sun-to-focus');
    expectProof(0.5, 0);
  });

  it.each([0.007, 0.017, 0.206, 0.967, 0.98])('independently verifies the focal-distance theorem around the ellipse at e=%s', (e) => {
    const env = renderInspection({ orr_k1e: e, orr_k1phase: 0, orr_k1playing: false });
    for (const phase of [0.001, 0.123, 0.5, 0.873, 1]) {
      env.change(env.phase, phase * 100);
      expectProof(e, phase);
    }
    expect(document.getElementById('orrery-k1-evidence')?.textContent)
      .not.toMatch(/e\s*=\s*0\.007\s*\(circular\)/i);
  });

  it('explains coincident circle foci and keeps both distances equal to a at every position', () => {
    const env = renderInspection({ orr_k1e: 0.5, orr_k1phase: 0.37 });
    env.click(env.button('Circle (0)'));
    expect(env.state.orr_k1e).toBe(0);
    expect(document.getElementById('orrery-k1-evidence')?.textContent).toMatch(/circular|circle/i);
    expect(document.getElementById('orrery-k1-model-note')?.textContent).toMatch(/coincid/i);
    const focusTwo = document.querySelector('dd[data-k1-metric="focus-two"]');
    expect(focusTwo?.parentElement?.querySelector('dt')?.textContent).toMatch(/coincident focus/i);
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      env.change(env.phase, phase * 100);
      expectProof(0, phase);
      expect(metric('focus-one')).toBeCloseTo(1, 10);
      expect(metric('focus-two')).toBeCloseTo(1, 10);
      expect(metric('focus-offset')).toBe(0);
    }
  });

  it('retains distinct zero and hundred-percent times at the same physical perihelion', () => {
    const env = renderInspection({ orr_k1e: 0.98, orr_k1phase: 0.37 });
    env.change(env.phase, 0);
    const beginning = readings();
    env.change(env.phase, 100);
    expect(env.state.orr_k1phase).toBe(1);
    expect(Number(env.phase.value)).toBe(100);
    expect(metric('phase')).toBe(1);
    expect(metric('focus-one')).toBeCloseTo(beginning['focus-one'], 10);
    expect(metric('focus-two')).toBeCloseTo(beginning['focus-two'], 10);
    expectProof(0.98, 1);
  });

  it('places minor-axis anchors using elapsed orbit time rather than quarter-period assumptions', () => {
    const e = 0.6;
    const env = renderInspection({ orr_k1e: e, orr_k1phase: 0, orr_k1playing: false });
    env.click(env.button('Top of minor axis'));
    const top = (Math.PI / 2 - e) / TAU;
    expect(env.state.orr_k1phase).toBeCloseTo(top, 10);
    expect(metric('phase')).not.toBeCloseTo(0.25, 5);
    expect(metric('focus-one')).toBeCloseTo(1, 8);
    expect(metric('focus-two')).toBeCloseTo(1, 8);
    env.click(env.button('Bottom of minor axis'));
    const bottom = (3 * Math.PI / 2 + e) / TAU;
    expect(env.state.orr_k1phase).toBeCloseTo(bottom, 10);
    expectProof(e, bottom);
    env.click(env.button('Perihelion (0%)'));
    expectProof(e, 0);
    env.click(env.button('Aphelion (50%)'));
    expectProof(e, 0.5);
  });

  it('offers four semantic reference rows that inspect the same physical anchors', () => {
    const e = 0.5;
    const env = renderInspection({ orr_k1e: e, orr_k1phase: 0 });
    const table = document.getElementById('orrery-k1-reference-table');
    expect(table?.querySelector('caption')?.textContent.trim()).toBe('Four reference positions on one ellipse');
    expect(table?.querySelectorAll('th[scope="col"]')).toHaveLength(5);
    const expected = [
      ['perihelion', 'Inspect Perihelion', 0],
      ['top', 'Inspect Top minor-axis vertex', (Math.PI / 2 - e) / TAU],
      ['aphelion', 'Inspect Aphelion', 0.5],
      ['bottom', 'Inspect Bottom minor-axis vertex', (3 * Math.PI / 2 + e) / TAU],
    ];
    expect([...table.querySelectorAll('tbody tr[data-k1-position]')].map((row) => row.dataset.k1Position))
      .toEqual(expected.map(([id]) => id));
    for (const [id, name, phase] of expected) {
      const row = document.querySelector(`#orrery-k1-reference-table tr[data-k1-position="${id}"]`);
      expect(row?.querySelector('th[scope="row"]')).not.toBeNull();
      const cells = [...row.querySelectorAll('td')];
      expect(cells).toHaveLength(4);
      const focal = focalReadings(e, phase);
      expect(parseFloat(cells[0].textContent)).toBeCloseTo(phase * 100, 1);
      expect(parseFloat(cells[1].textContent)).toBeCloseTo(focal.r1, 2);
      expect(parseFloat(cells[2].textContent)).toBeCloseTo(focal.r2, 2);
      expect(parseFloat(cells[3].textContent)).toBeCloseTo(2, 2);
      env.click(env.button(name));
      expect(env.state.orr_k1phase).toBeCloseTo(phase, 10);
      expectProof(e, phase);
    }
  });

  it('retains all seven shape presets with consistent native slider and scientific readings', () => {
    const env = renderInspection({ orr_k1phase: 0.31 });
    for (const [name, e] of PRESETS) {
      expect(env.button(name)).toBeTruthy();
      env.click(env.button(name));
      expect(env.state.orr_k1e).toBe(e);
      expect(Number(env.eccentricity.value)).toBe(e);
      expect(env.button(name)?.getAttribute('aria-pressed')).toBe('true');
      expectProof(e, env.state.orr_k1phase ?? 0.31);
    }
  });

  it('toggles axes and center without changing the orbit or focal measurements', () => {
    const env = renderInspection({ orr_k1e: 0.206, orr_k1phase: 0.37 });
    const before = readings(), retained = otherWork(env.state);
    expect(env.button('Show axes and center')?.getAttribute('aria-pressed')).toBe('true');
    env.click(env.button('Show axes and center'));
    expect(env.state.orr_k1axes).toBe(false);
    expect(env.button('Show axes and center')?.getAttribute('aria-pressed')).toBe('false');
    expect(readings()).toEqual(before);
    expect(otherWork(env.state)).toEqual(retained);
    env.click(env.button('Show axes and center'));
    expect(env.state.orr_k1axes).toBe(true);
    expect(readings()).toEqual(before);
  });

  it('requires explicit playback and hides stale paused measurements until the learner pauses', () => {
    const env = renderInspection({ orr_k1phase: 0.37, orr_k1playing: 'true', orr_time: 12.75 });
    const retained = otherWork(env.state);
    expect(env.button('Play orbit')?.disabled).toBe(false);
    expect(metric('phase')).toBe(0.37);
    env.click(env.button('Play orbit'));
    expect(env.state.orr_k1playing).toBe(true);
    expect(env.phase.disabled).toBe(true);
    expect(env.inspection.querySelectorAll('dd[data-k1-metric]')).toHaveLength(0);
    expect(env.button('Pause orbit')?.disabled).toBe(false);
    env.click(env.button('Pause orbit'));
    expect(env.state.orr_k1playing).toBe(false);
    expect(env.phase.disabled).toBe(false);
    expect(env.inspection.querySelectorAll('dd[data-k1-metric]')).toHaveLength(METRICS.length);
    readings();
    expect(otherWork(env.state)).toEqual(retained);
    env.click(env.button('Play orbit'));
    env.click(env.button('Inspect Top minor-axis vertex'));
    expect(env.state.orr_k1playing).toBe(false);
    expectProof(0.5, (Math.PI / 2 - 0.5) / TAU);
  });

  it('freezes restored playback for reduced motion while preserving usable inspection and raw saves', () => {
    motionPreference(true);
    const env = renderInspection({ orr_k1playing: true, orr_k1phase: 0.37, orr_k1e: 0.967 });
    expect(env.state.orr_k1playing).toBe(true);
    expect(env.button('Play orbit')?.disabled).toBe(true);
    expect(env.button('Pause orbit')).toBeUndefined();
    expect(env.phase.disabled).toBe(false);
    expectProof(0.967, 0.37);
    env.change(env.phase, 50);
    expect(env.state.orr_k1playing).toBe(false);
    expectProof(0.967, 0.5);
  });

  it('changes only four K1 fields while preserving the Orrery clock and other saved learning without awards', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderInspection({
      orr_k1e: 0.5, orr_k1phase: 0.37, orr_k1playing: false,
      orr_sel: 'mars', orr_compare: 'earth', orr_time: 12.75, orr_paused: false,
      orr_follow: true, orr_zoom: 'inner', orr_k2e: 0.6, orr_k2s: 9, orr_k2phase: 0.2, orr_k3hover: 'halley',
      orr_snapshots: { mars: { a: { bodyId: 'mars', time: 0, distance: 1.4, speed: 26 } } },
      orr_mission_idx: 2, orr_mission_progress: { earth: { started: true, correct: true } },
      keplerInquiry: { a: 2, e: 0.4, mass: 1, baseline: { a: 2, e: 0.2, mass: 1 },
        hypothesis: 'Orbit size stays fixed.', explanation: 'The sum stays constant.', log: [{ a: '2.00', p: '2.83' }] },
      journalEntries: [{ observation: 'Retain my saved experiment.' }], missionLog: [{ text: 'Earlier orbit evidence.' }],
    }, { awardXP, tryAward });
    const before = otherWork(env.state);
    const actions = [
      () => env.change(env.eccentricity, 0.98), () => env.change(env.phase, 73),
      () => env.click(env.button('Show axes and center')), () => env.click(env.button('Earth (0.017)')),
      () => env.click(env.button('Bottom of minor axis')), () => env.click(env.button('Play orbit')),
      () => env.click(env.button('Pause orbit')), () => env.click(env.button('Aphelion (50%)')),
    ];
    for (const act of actions) { act(); expect(otherWork(env.state)).toEqual(before); }
    expect(awardXP).not.toHaveBeenCalled();
    expect(tryAward).not.toHaveBeenCalled();
  });

  it('normalizes malformed saved values for display without rewriting saved records', () => {
    const cases = [
      [{ orr_k1e: '0.2', orr_k1phase: '0.3', orr_k1playing: 'true', orr_k1axes: 'false' }, 0.5, 0, true],
      [{ orr_k1e: NaN, orr_k1phase: Infinity, orr_k1axes: null }, 0.5, 0, true],
      [{ orr_k1e: -2, orr_k1phase: -3, orr_k1axes: false }, 0, 0, false],
      [{ orr_k1e: 3, orr_k1phase: 4, orr_k1axes: true }, 0.98, 1, true],
    ];
    for (const [saved, e, phase, axes] of cases) {
      const env = renderInspection(saved);
      for (const [key, value] of Object.entries(saved)) expect(env.state[key]).toEqual(value);
      expectProof(e, phase);
      expect(Number(env.eccentricity.value)).toBe(e);
      expect(Number(env.phase.value)).toBe(phase * 100);
      expect(env.button('Show axes and center')?.getAttribute('aria-pressed')).toBe(String(axes));
      expect(env.inspection.textContent).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
