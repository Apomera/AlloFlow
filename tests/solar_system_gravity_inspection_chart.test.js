import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const EARTH_G = 9.80665;
const WORLD_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function translate(key, fallback) {
  return WORLD_NAMES.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Retain the actual production lab and its callbacks. Exclude the unrelated
// WebGL explorer, other mini-labs and styles from jsdom serialization.
function gravityTestTree(tree) {
  let lab = null;
  function visit(node) {
    if (lab) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-gravity-lab') { lab = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return lab;
}

function renderGravity(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showGravityLab: true, selectedPlanet: 'Mars', viewTab: 'overview', paused: true,
    gravMass: 70, gravHeight: 10, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, renderWrites;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange'].some((key) => typeof props[key] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-gravity-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    renderWrites = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); store.dirty = false;
      const ctx = makeCtx({ t: translate, React: callbackReact }, store), setToolData = ctx.setToolData;
      ctx.setToolData = (updater) => { renderWrites++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => gravityTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
    expect(document.getElementById('solar-gravity-lab')).not.toBeNull();
  }
  const lab = () => document.getElementById('solar-gravity-lab');
  function button(name, scope = lab()) {
    return [...scope.querySelectorAll('button')].find((node) => {
      const label = node.getAttribute('aria-label') || node.textContent.trim();
      return name instanceof RegExp ? name.test(label) : label === name;
    });
  }
  function props(control) {
    expect(control, 'The actual production control must render').toBeTruthy();
    const value = callbacks.get(control.dataset.gravityTestCallback);
    expect(value).toBeTruthy(); return value;
  }
  function dispatch(control, key = 'onClick', value) {
    expect(control.disabled).not.toBe(true);
    const fn = props(control)[key]; expect(fn).toBeTypeOf('function');
    fn({ target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} });
    render();
  }
  function run(prediction = 'Earth') {
    const group = lab().querySelector('[aria-label="Gravity drop prediction"]');
    dispatch(button(prediction, group));
    dispatch(button(/Run synchronized vacuum drop/));
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get renderWrites() { return renderWrites; },
    get lab() { return lab(); },
    get chart() { return lab().querySelector('[data-gravity-distance-chart]'); },
    get cursor() { return lab().querySelector('[data-gravity-time-cursor]'); },
    get inspector() { return lab().querySelector('[data-gravity-time-inspector]'); },
    get runButton() { return button(/Run synchronized vacuum drop/); },
    get resetButton() { return button('Try another prediction'); },
    get saveButton() { return button(/Save comparison to journal|Gravity evidence saved/); },
    curve(which) { return lab().querySelector(`[data-gravity-curve="${which}"]`); },
    shaft(which) { return lab().querySelector(`[data-gravity-shaft="${which}"]`); },
    checkpoint(which) { dispatch(lab().querySelector(`[data-gravity-checkpoint="${which}"]`)); },
    time(percent) { dispatch(lab().querySelector('#solar-gravity-inspect-time'), 'onChange', String(percent)); },
    click(control) { dispatch(control); },
    change(control, value) { dispatch(control, 'onChange', value); },
    button, props, run, render,
  };
}

function pathPoints(path) {
  expect(path).not.toBeNull();
  const d = path.getAttribute('d');
  expect(d).toMatch(/^M/i);
  // The production curve is a sampled polyline in normalized chart coordinates.
  const numbers = d.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);
  expect(numbers.length % 2).toBe(0);
  const result = [];
  for (let index = 0; index < numbers.length; index += 2) result.push({ x: numbers[index], y: numbers[index + 1] });
  expect(result.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  return result;
}

function pointAt(points, x) {
  const point = points.reduce((closest, next) => Math.abs(next.x - x) < Math.abs(closest.x - x) ? next : closest);
  expect(point.x).toBeCloseTo(x, 2);
  return point;
}

function expectDistance(env, which, distance) {
  expect(Number(env.shaft(which).getAttribute('data-gravity-inspected-distance'))).toBeCloseTo(distance, 8);
}

function withoutResetFields(state) {
  const { gravityPrediction, gravityDropNonce, gravityInspection, gravityEvidenceSavedFor, ...rest } = state;
  return rest;
}

describe('Solar System gravity inspection chart and repeatable experiments', () => {
  beforeEach(() => {
    resetStemLab(); loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    // Do not run challenge-award timers: the lab's direct events are under test.
    vi.stubGlobal('setTimeout', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('keeps results hidden and explicitly positions both objects at release before running', () => {
    const env = renderGravity();
    expect(env.chart).toBeNull(); expect(env.inspector).toBeNull(); expect(env.cursor).toBeNull();
    expect([...env.lab.querySelectorAll('[data-gravity-scale-value]')].map(node => Number(node.textContent))).toEqual([0, 5, 10]);
    expect(env.lab.querySelector('[data-gravity-stage-clock]').textContent).toBe('Ready at the same height');
    expect(env.lab.querySelectorAll('[data-gravity-sample-time]')).toHaveLength(0);
    expect(env.runButton.disabled).toBe(true); expect(env.resetButton).toBeUndefined();
    for (const which of ['earth', 'target']) {
      const shaft = env.shaft(which), ball = shaft.querySelector('.solar-drop-ball');
      expect(ball.style.top).toBe('12px'); expect(ball.style.animationName).toBe('none');
      expect(shaft.querySelector('[role="img"]').getAttribute('aria-label')).toContain('Result hidden until the model runs.');
    }
    expect(env.state.journalEntries).toEqual([]); expect(env.renderWrites).toBe(0);
  });

  it('links the Mars inspector to quadratic common-scale curves and the elapsed-time cursor', () => {
    const env = renderGravity(); env.run();
    expect(env.chart).not.toBeNull(); expect(env.cursor).toBeNull();
    expect(env.lab.querySelector('[data-gravity-stage-clock]').textContent).toBe('Shared clock · scaled replay');
    const target = pathPoints(env.curve('target')), earth = pathPoints(env.curve('earth'));
    expect(target.length).toBeGreaterThanOrEqual(81); expect(earth.length).toBeGreaterThanOrEqual(81);
    expect(target[0]).toEqual({ x: 0, y: 200 }); expect(target.at(-1)).toEqual({ x: 480, y: 0 });
    expect(earth[0]).toEqual({ x: 0, y: 200 }); expect(earth.at(-1)).toEqual({ x: 480, y: 0 });
    expect(pointAt(target, 120).y).toBeCloseTo(187.5, 2);
    expect(pointAt(target, 240).y).toBeCloseTo(150, 2);
    env.checkpoint('half');
    expectDistance(env, 'target', 2.5); expectDistance(env, 'earth', 2.5 / 0.38);
    expect(Number(env.cursor.getAttribute('x1'))).toBeCloseTo(240, 6);
    expect(Number(env.cursor.getAttribute('x2'))).toBeCloseTo(240, 6);
    expect(env.lab.querySelector('[data-gravity-reading="target"]').textContent).toContain('2.50 m');
    expect(parseFloat(env.shaft('target').querySelector('.solar-drop-ball').style.top)).toBeCloseTo(45.5, 6);
    env.time(25);
    expectDistance(env, 'target', 0.625); expectDistance(env, 'earth', 0.625 / 0.38);
    expect(Number(env.cursor.getAttribute('x1'))).toBeCloseTo(120, 6);
  });

  it('includes the exact Jupiter arrival and keeps the faster curve capped at the endpoint', () => {
    const env = renderGravity({ selectedPlanet: 'Jupiter', gravHeight: 1 }); env.run('Jupiter');
    const target = pathPoints(env.curve('target')), earth = pathPoints(env.curve('earth'));
    const arrivalX = 480 / Math.sqrt(2.53);
    expect(pointAt(target, arrivalX).y).toBeCloseTo(0, 6);
    for (const point of target.filter((point) => point.x >= arrivalX)) expect(point.y).toBeCloseTo(0, 6);
    for (const points of [target, earth]) {
      expect(points.every((point) => point.x >= 0 && point.x <= 480 && point.y >= 0 && point.y <= 200)).toBe(true);
    }
    env.checkpoint('first');
    expectDistance(env, 'target', 1); expectDistance(env, 'earth', 1 / 2.53);
    expect(Number(env.cursor.getAttribute('x1'))).toBeCloseTo(arrivalX, 2);
    env.checkpoint('end');
    expectDistance(env, 'target', 1); expectDistance(env, 'earth', 1);
    expect(Number(env.cursor.getAttribute('x1'))).toBeCloseTo(480, 6);
  });

  it('rejects malformed restored predictions without revealing or repairing persisted evidence', () => {
    for (const choice of ['EARTH', 'invalid', 1, ['earth'], { choice: 'earth' }, new String('earth')]) {
      const record = { target: 'Mars', choice };
      const env = renderGravity({ gravityPrediction: record, gravityDropNonce: 4,
        gravityInspection: { target: 'Mars', height: 10, nonce: 4, time: 1 }, gravityEvidenceSavedFor: 'Mars' });
      expect(env.chart).toBeNull(); expect(env.inspector).toBeNull(); expect(env.cursor).toBeNull();
      expect(env.runButton.disabled).toBe(true); expect(env.state.gravityPrediction).toBe(record);
      const before = { ...env.state };
      // A stale event callback must guard invalid predictions as well as the UI.
      env.props(env.runButton).onClick();
      expect(env.state).toEqual(before); expect(env.renderWrites).toBe(0);
    }
  });

  it('reopens saving after replay without changing the previously saved inspected observation', () => {
    const prior = { planet: 'Venus', observation: 'Earlier evidence remains unchanged.' };
    const env = renderGravity({ journalEntries: [prior] }); env.run(); env.checkpoint('half');
    env.click(env.saveButton);
    expect(env.saveButton.disabled).toBe(true); expect(env.state.gravityEvidenceSavedFor).toBe('Mars');
    const saved = env.state.journalEntries.at(-1), serialized = JSON.stringify(env.state.journalEntries);
    expect(saved.observation).toContain('At elapsed time 1.16 s');
    expect(saved.observation).toContain('has fallen 2.50 m');
    const nonce = env.state.gravityDropNonce;
    env.click(env.runButton);
    expect(env.state.gravityDropNonce).toBe(nonce + 1);
    expect(env.state.gravityInspection).toBeNull(); expect(env.state.gravityEvidenceSavedFor).toBeNull();
    expect(env.lab.querySelectorAll('[data-gravity-sample-time]')).toHaveLength(0);
    expect(env.lab.querySelector('[data-gravity-measurement-stage]').dataset.motionState).toBe('replay');
    expect(env.saveButton.disabled).toBe(false); expect(env.chart).not.toBeNull(); expect(env.cursor).toBeNull();
    expect(env.state.journalEntries.at(-1)).toBe(saved);
    expect(JSON.stringify(env.state.journalEntries)).toBe(serialized);
  });

  it('resets only the prediction and current run while retaining settings, journal and other learning', () => {
    const prior = { planet: 'Mars', observation: 'Keep the first experiment.' };
    const env = renderGravity({ gravMass: '125', gravHeight: 25, gravCalcUsed: true,
      gravityPrediction: { target: 'Mars', choice: 'earth' }, gravityDropNonce: 7,
      gravityInspection: { target: 'Mars', height: 25, nonce: 7, time: 1 }, gravityEvidenceSavedFor: 'Mars',
      journalEntries: [prior], compareReasoningDrafts: { 'Earth:Jupiter': 'Keep my explanation.' },
      seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' },
      moonPrediction: { phase: 90, node: 30, choice: 'none' }, orr_snapshots: { earth: { a: { time: 0.25 } } } });
    const before = withoutResetFields(env.state);
    expect(env.cursor).not.toBeNull(); env.click(env.resetButton);
    expect(env.state.gravityPrediction).toBeNull(); expect(env.state.gravityDropNonce).toBe(0);
    expect(env.state.gravityInspection).toBeNull(); expect(env.state.gravityEvidenceSavedFor).toBeNull();
    expect(withoutResetFields(env.state)).toEqual(before);
    for (const key of Object.keys(before)) expect(env.state[key]).toBe(before[key]);
    expect(env.chart).toBeNull(); expect(env.cursor).toBeNull(); expect(env.runButton.disabled).toBe(true);
    expect(env.resetButton).toBeUndefined();
    for (const which of ['earth', 'target']) expect(env.shaft(which).querySelector('.solar-drop-ball').style.top).toBe('12px');
    env.run('Same time');
    expect(env.state.gravityPrediction).toEqual({ target: 'Mars', choice: 'same' });
    expect(env.chart).not.toBeNull(); expect(env.state.journalEntries).toBe(before.journalEntries);
  });

  it('changes weight force without changing either fall curve or inspected position when mass changes', () => {
    const env = renderGravity(); env.run(); env.checkpoint('half'); env.click(env.saveButton);
    const paths = ['earth', 'target'].map((which) => env.curve(which).getAttribute('d'));
    const time = env.state.gravityInspection.time, entry = env.state.journalEntries.at(-1);
    env.change(env.lab.querySelector('input[type="number"]'), '5');
    expect(env.lab.querySelector('[data-gravity-earth-force]').textContent).toBe('49 N');
    expect(env.lab.querySelector('[data-gravity-target-force]').textContent).toBe('19 N');
    expect(env.state.gravityInspection.time).toBe(time);
    expectDistance(env, 'target', 2.5); expectDistance(env, 'earth', 2.5 / 0.38);
    expect(['earth', 'target'].map((which) => env.curve(which).getAttribute('d'))).toEqual(paths);
    expect(env.state.gravityEvidenceSavedFor).toBeNull(); expect(env.saveButton.disabled).toBe(false);
    expect(env.state.journalEntries.at(-1)).toBe(entry);
  });

  it('hides stale charts on a height change and computes fresh evidence after running again', () => {
    const env = renderGravity(); env.run(); env.checkpoint('half'); env.click(env.saveButton);
    const entries = env.state.journalEntries;
    env.change(env.lab.querySelector('input[aria-label="Vacuum drop height in meters"]'), '20');
    expect(env.chart).toBeNull(); expect(env.inspector).toBeNull(); expect(env.cursor).toBeNull();
    expect(env.state.gravityDropNonce).toBe(0); expect(env.state.gravityEvidenceSavedFor).toBeNull();
    expect(env.runButton.disabled).toBe(false); env.click(env.runButton); env.checkpoint('half');
    expectDistance(env, 'target', 5); expectDistance(env, 'earth', 5 / 0.38);
    expect(env.state.gravityInspection.time).toBeCloseTo(Math.sqrt(40 / (EARTH_G * 0.38)) / 2, 10);
    expect(Number(env.cursor.getAttribute('x1'))).toBeCloseTo(240, 6);
    expect(env.state.journalEntries).toBe(entries);
  });

  it('does not attach a cursor or frozen position to an inspection from another run', () => {
    const valid = { target: 'Mars', height: 10, nonce: 4, time: 1 };
    for (const patch of [{ target: 'Jupiter' }, { height: 20 }, { nonce: 3 }, { time: '1' }]) {
      const inspection = { ...valid, ...patch };
      const env = renderGravity({ gravityPrediction: { target: 'Mars', choice: 'earth' },
        gravityDropNonce: 4, gravityInspection: inspection });
      expect(env.chart).not.toBeNull(); expect(env.cursor).toBeNull();
      expect(env.lab.querySelectorAll('[data-gravity-sample-time]')).toHaveLength(0);
      for (const which of ['earth', 'target']) expect(env.shaft(which).hasAttribute('data-gravity-inspected-distance')).toBe(false);
      expect(env.state.gravityInspection).toBe(inspection); expect(env.renderWrites).toBe(0);
    }
  });

  it.each([
    ['Mars', 0.38, 10, 'Earth'],
    ['Jupiter', 2.53, 1, 'Jupiter'],
    ['Pluto', 0.06, 100, 'Earth'],
  ])('measures %s on a shared ruler with earlier positions on the same clock', (world, ratio, height, prediction) => {
    const env = renderGravity({ selectedPlanet: world, gravHeight: height });
    env.run(prediction); env.checkpoint('half');
    const elapsed = Math.max(Math.sqrt(2 * height / EARTH_G), Math.sqrt(2 * height / (EARTH_G * ratio))) / 2;
    expect(env.state.gravityInspection.time).toBeCloseTo(elapsed, 10);
    expect(env.lab.querySelector('[data-gravity-stage-clock]').textContent).toBe(`Inspecting · ${elapsed.toFixed(2)} s`);
    expect([...env.lab.querySelectorAll('[data-gravity-scale-value]')].map(node => [Number(node.textContent), parseFloat(node.style.top)])).toEqual([[0, 21], [height / 2, 88], [height, 155]]);
    for (const [which, g] of [['earth', EARTH_G], ['target', EARTH_G * ratio]]) {
      const shaft = env.shaft(which), samples = [...shaft.querySelectorAll('[data-gravity-sample-time]')];
      expect(samples).toHaveLength(4);
      samples.forEach((sample, index) => {
        const time = elapsed * index / 4, distance = Math.min(height, g * time ** 2 / 2);
        expect(Number(sample.dataset.gravitySampleTime)).toBeCloseTo(time, 10);
        expect(Number(sample.dataset.gravitySampleDistance)).toBeCloseTo(distance, 10);
        expect(parseFloat(sample.style.top)).toBeCloseTo(21 + distance / height * 134, 8);
        expect(sample.getAttribute('aria-hidden')).toBe('true');
      });
      const fallen = Math.min(height, g * elapsed ** 2 / 2);
      expect(shaft.querySelector('[data-gravity-position]').textContent).toContain(`${fallen.toFixed(2)} m fallen`);
      expect(parseFloat(shaft.querySelector('.solar-gravity-fallen-line').style.height)).toBeCloseTo(fallen / height * 134, 8);
      expect(shaft.style.getPropertyValue('--drop-color')).toBe(which === 'earth' ? 'var(--sg-earth)' : 'var(--sg-target)');
      expect(shaft.querySelector('[role="img"]').getAttribute('aria-describedby')).toBe('solar-gravity-trail-note');
    }
    expect(env.lab.querySelector('#solar-gravity-trail-note').textContent).toContain(`${(elapsed / 4).toFixed(3)} s`);
    expect(env.lab.querySelector('#solar-gravity-trail-note').textContent).toContain('motion beyond it is not modeled');
    expect(env.renderWrites).toBe(0);
  });

  it('distinguishes release, flight and endpoint without inventing motion after arrival', () => {
    const env = renderGravity({ selectedPlanet: 'Jupiter', gravHeight: 1 });
    env.run('Jupiter'); env.checkpoint('start');
    expect(env.lab.querySelectorAll('[data-gravity-sample-time]')).toHaveLength(0);
    for (const which of ['earth', 'target']) expect(env.shaft(which).querySelector('[data-gravity-position]').textContent).toContain('At release');
    env.checkpoint('first');
    expect(env.shaft('earth').querySelector('[data-gravity-position]').textContent).toContain('Still falling');
    expect(env.shaft('target').querySelector('[data-gravity-position]').textContent).toContain('Endpoint reached');
    expect(env.shaft('target').querySelector('.solar-gravity-endpoint').textContent).toBe('reference cloud level');
    env.checkpoint('end');
    for (const which of ['earth', 'target']) {
      expect(env.shaft(which).querySelector('[data-gravity-position]').textContent).toBe('1.00 m fallenEndpoint reached');
      for (const stamp of env.shaft(which).querySelectorAll('[data-gravity-sample-distance]')) expect(Number(stamp.dataset.gravitySampleDistance)).toBeLessThanOrEqual(1);
    }
    env.change(env.lab.querySelector('input[aria-label="Vacuum drop height in meters"]'), '100');
    expect(env.lab.querySelector('[data-gravity-measurement-stage]').dataset.motionState).toBe('setup');
    expect(env.lab.querySelectorAll('[data-gravity-sample-time]')).toHaveLength(0);
    expect([...env.lab.querySelectorAll('[data-gravity-scale-value]')].map(node => Number(node.textContent))).toEqual([0, 50, 100]);
  });
});
