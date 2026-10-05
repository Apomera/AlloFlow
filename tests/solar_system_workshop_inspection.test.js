import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const TAU = 2 * Math.PI;
const AU_KM = 1.496e8;
const MU_KM = 6.674e-11 * 1.989e30 / 1e9;
const METRICS = [
  'phase', 'angle', 'distance', 'speed', 'potential', 'kinetic', 'total', 'energy-sum',
  'period', 'perihelion', 'aphelion', 'peri-speed', 'aph-speed', 'escape-speed',
];
const PRESETS = [
  ['Circular Earth', 1, 0], ['Eccentric Earth', 1, 0.3], ['Hot Jupiter', 0.05, 0.05],
  ['Halley-like', 17.8, 0.96], ['Habitable Mars', 1.2, 0],
];
const BODIES = [
  ['mercury', 'Mercury', 0.387, 0.20564], ['venus', 'Venus', 0.723, 0.00678],
  ['earth', 'Earth', 1, 0.01671], ['mars', 'Mars', 1.524, 0.09339],
  ['jupiter', 'Jupiter', 5.203, 0.04839], ['saturn', 'Saturn', 9.537, 0.05386],
  ['uranus', 'Uranus', 19.19, 0.04726], ['neptune', 'Neptune', 30.07, 0.00859],
  ['pluto', 'Pluto', 39.48, 0.2488], ['ceres', 'Ceres', 2.769, 0.0758],
  ['haumea', 'Haumea', 43.13, 0.1912], ['eris', 'Eris', 67.67, 0.4407],
];

// Capture and invoke real native-control callbacks. SSR does not mount the
// canvas, so browser tests own geometry, layout and repeated canvas repaint.
function renderWorkshop(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false,
    orreryMode: true, orr_tab: 4, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        (typeof props.onClick === 'function' || typeof props.onChange === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-ws-callback': id }, ...children);
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
    return [...document.querySelectorAll('#orrery-workshop-inspection button')].find((control) =>
      (control.getAttribute('aria-label') || control.textContent)
        .replace(/\s+/g, ' ').trim().replace(/^[↺↻]\s*/, '') === name);
  }
  function invoke(control, eventName, value) {
    expect(control, 'The production Workshop control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.wsCallback)?.[eventName];
    expect(handler).toBeTypeOf('function');
    handler({ target: value === undefined ? control : { value: String(value) }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get inspection() { return document.getElementById('orrery-workshop-inspection'); },
    get eccentricity() { return document.getElementById('orrery-workshop-eccentricity'); },
    get semiMajor() { return document.getElementById('orrery-workshop-semi-major'); },
    get phase() { return document.getElementById('orrery-workshop-phase'); },
    get bodyGroup() { return document.querySelector('[role="group"][aria-label="Orbit Workshop body selection"]'); },
    button,
    click(control) { invoke(control, 'onClick'); },
    change(control, value) { invoke(control, 'onChange', value); },
  };
}

function metric(name) {
  const node = document.querySelector(`#orrery-workshop-inspection dd[data-ws-metric="${name}"]`);
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

function close(actual, expected) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2e-8 * Math.max(1, Math.abs(expected)));
}

// The oracle bisects Kepler's equation and measures the Cartesian position
// from the Sun. It does not assume the production radius/angle calculation.
function orbitReadings(a, e, phase) {
  const mean = phase * TAU;
  let lower = 0, upper = TAU;
  for (let i = 0; i < 90; i++) {
    const middle = (lower + upper) / 2;
    if (middle - e * Math.sin(middle) < mean) lower = middle;
    else upper = middle;
  }
  const E = phase === 0 ? 0 : phase === 1 ? TAU : (lower + upper) / 2;
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const distance = Math.hypot(x, y);
  let angle = Math.atan2(y, x);
  if (angle < 0) angle += TAU;
  if (phase === 0) angle = 0;
  if (phase === 1) angle = TAU;
  const speed = Math.sqrt(MU_KM * (2 / (distance * AU_KM) - 1 / (a * AU_KM)));
  const perihelion = a * (1 - e), aphelion = a * (1 + e);
  const speedAt = (radius) => Math.sqrt(MU_KM * (2 / (radius * AU_KM) - 1 / (a * AU_KM)));
  const potential = -1 / distance;
  // Convert specific kinetic energy back to GM/AU units independently.
  const kinetic = speed * speed / (2 * MU_KM / AU_KM);
  return {
    phase, angle: angle * 180 / Math.PI, distance, speed, potential, kinetic,
    total: -1 / (2 * a), 'energy-sum': potential + kinetic,
    period: Math.sqrt(a * a * a), perihelion, aphelion,
    'peri-speed': speedAt(perihelion), 'aph-speed': speedAt(aphelion),
    'escape-speed': Math.sqrt(2 * MU_KM / (perihelion * AU_KM)),
  };
}

function expectOrbit(a, e, phase) {
  const values = readings(), expected = orbitReadings(a, e, phase);
  for (const name of METRICS) close(values[name], expected[name]);
  expect(values.potential).toBeLessThan(0);
  expect(values.kinetic).toBeGreaterThan(0);
  expect(values.total).toBeLessThan(0);
  close(values.potential + values.kinetic, values.total);
  close(values['energy-sum'], values.total);
  expect(values['peri-speed']).toBeLessThan(values['escape-speed']);
  close(values['peri-speed'] / values['escape-speed'], Math.sqrt((1 + e) / 2));
  return values;
}

// Integrate residence time through the radial-time CDF: the outbound and
// inbound portions have equal duration in a bound Kepler ellipse.
function bandFraction(a, e) {
  if (e === 0) return a >= 0.75 && a <= 1.7 ? 1 : 0;
  function fractionBelow(radius) {
    if (radius <= a * (1 - e)) return 0;
    if (radius >= a * (1 + e)) return 1;
    const E = Math.acos((1 - radius / a) / e);
    return (E - e * Math.sin(E)) / Math.PI;
  }
  return fractionBelow(1.7) - fractionBelow(0.75);
}

function bandReading() {
  const note = document.getElementById('orrery-workshop-band-note');
  const value = document.querySelector('#orrery-workshop-inspection [data-ws-band-fraction][data-value]');
  expect(note).not.toBeNull();
  expect(value).not.toBeNull();
  const fraction = Number(value.getAttribute('data-value'));
  expect(Number.isFinite(fraction)).toBe(true);
  expect(fraction).toBeGreaterThanOrEqual(0);
  expect(fraction).toBeLessThanOrEqual(1);
  return { state: note.getAttribute('data-ws-band-state'), fraction, text: note.textContent };
}

function otherWork(state) {
  const { orr_wsb, orr_wse, orr_wsa, orr_wsphase, orr_wscompare, orr_wshz, ...rest } = state;
  return structuredClone(rest);
}

describe('Solar System Orbit Workshop position and energy inspection', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('offers named manual inspection, compatible canvas descriptions and finite semantic readings', () => {
    const env = renderWorkshop();
    expect(env.inspection?.tagName).toBe('SECTION');
    for (const [control, name, min, max, step] of [
      [env.eccentricity, 'Eccentricity', '0', '0.99', '0.00001'],
      [env.semiMajor, 'Semi-major', '0.05', '80', '0.001'],
      [env.phase, 'Orbit time (% of period)', '0', '100', '0.1'],
    ]) {
      expect(control?.type).toBe('range');
      expect(control.min).toBe(min);
      expect(control.max).toBe(max);
      expect(control.step).toBe(step);
      expect(control.disabled).toBe(false);
      expect([...control.labels].map((label) => label.textContent).join(' ')).toContain(name);
    }
    expect(env.eccentricity.getAttribute('aria-describedby')).toBe('orrery-workshop-controls-help');
    expect(env.semiMajor.getAttribute('aria-describedby')).toBe('orrery-workshop-controls-help');
    expect(document.getElementById('orrery-workshop-controls-help')?.getAttribute('role')).toBe('note');
    expect(document.getElementById('orrery-workshop-energy-note')?.getAttribute('role')).toBe('note');
    const canvases = [...env.inspection.querySelectorAll('canvas')];
    expect(canvases).toHaveLength(2);
    const preview = canvases.find((canvas) => canvas.getAttribute('aria-label').startsWith('Orbit Workshop preview for Earth'));
    const energy = canvases.find((canvas) => canvas.getAttribute('aria-label').startsWith('Orbit Workshop energy diagram for Earth'));
    expect(preview?.getAttribute('aria-describedby')).toBe('orrery-workshop-evidence');
    expect(energy?.getAttribute('aria-describedby')).toBe('orrery-workshop-energy-note');
    for (const canvas of canvases) {
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.hasAttribute('tabindex')).toBe(false);
    }
    const evidence = document.getElementById('orrery-workshop-evidence');
    expect(evidence?.getAttribute('role')).toBe('status');
    expect(evidence?.getAttribute('aria-live')).toBe('polite');
    expect(evidence?.getAttribute('aria-atomic')).toBe('true');
    expect(document.getElementById('orrery-workshop-energy-note')?.textContent).toMatch(/true anomaly/);
    expect(document.getElementById('orrery-workshop-energy-note')?.textContent).toMatch(/equal angle steps are not equal time/);
    expect(env.button('Play orbit')).toBeUndefined();
    expect(env.button('Show reference orbit')?.getAttribute('aria-pressed')).toBe('false');
    expect(env.button('Show distance band')?.getAttribute('aria-pressed')).toBe('true');
    expectOrbit(1, 0.01671, 0);
  });

  it.each([
    [1, 0.01671], [1, 0.3], [17.8, 0.96], [0.05, 0.99],
  ])('independently verifies position, speed and conserved energy at a=%s AU, e=%s', (a, e) => {
    const env = renderWorkshop({ orr_wsa: a, orr_wse: e });
    for (const phase of [0.0001, 0.25, 0.5, 0.875, 1]) {
      env.change(env.phase, phase * 100);
      expectOrbit(a, e, phase);
    }
    env.change(env.phase, 0);
    expectOrbit(a, e, 0);
    expect(metric('peri-speed')).toBeGreaterThan(0);
    expect(metric('escape-speed')).toBeGreaterThan(0);
  });

  it('keeps circle radius, speed and energies constant while elapsed time and angle advance', () => {
    const env = renderWorkshop({ orr_wsa: 1.2, orr_wse: 0 });
    const initial = expectOrbit(1.2, 0, 0);
    for (const phase of [0.25, 0.5, 0.75, 1]) {
      env.change(env.phase, phase * 100);
      expectOrbit(1.2, 0, phase);
      for (const key of ['distance', 'speed', 'potential', 'kinetic', 'total']) close(metric(key), initial[key]);
      close(metric('angle'), phase * 360);
    }
  });

  it('retains 0% and 100% as distinct times at the same physical perihelion', () => {
    const env = renderWorkshop({ orr_wsa: 2, orr_wse: 0.8, orr_wsphase: 0.37 });
    env.change(env.phase, 0);
    const start = readings();
    env.change(env.phase, 100);
    expect(env.state.orr_wsphase).toBe(1);
    expect(Number(env.phase.value)).toBe(100);
    expect(metric('phase')).toBe(1);
    expect(metric('angle')).toBe(360);
    for (const key of ['distance', 'speed', 'potential', 'kinetic', 'total']) close(metric(key), start[key]);
    expectOrbit(2, 0.8, 1);
  });

  it('uses elapsed quarter periods rather than equal angular steps for native anchors', () => {
    const env = renderWorkshop({ orr_wsa: 1, orr_wse: 0.6, orr_wsphase: 0.13 });
    for (const [name, phase] of [
      ['Perihelion (0%)', 0], ['Quarter period (25%)', 0.25],
      ['Aphelion (50%)', 0.5], ['Three-quarter period (75%)', 0.75],
    ]) {
      env.click(env.button(name));
      expect(env.state.orr_wsphase).toBe(phase);
      expectOrbit(1, 0.6, phase);
      if (phase === 0.25 || phase === 0.75) expect(metric('angle')).not.toBeCloseTo(phase * 360, 3);
    }
  });

  it('applies Kepler and energy scaling when orbit size changes at a held shape and epoch', () => {
    const env = renderWorkshop({ orr_wsa: 1, orr_wse: 0.6, orr_wsphase: 0.375 });
    const initial = expectOrbit(1, 0.6, 0.375);
    env.change(env.semiMajor, 4);
    expect(env.state.orr_wsa).toBe(4);
    expect(env.state.orr_wse).toBe(0.6);
    expect(env.state.orr_wsphase).toBe(0.375);
    expectOrbit(4, 0.6, 0.375);
    close(metric('distance'), initial.distance * 4);
    close(metric('period'), initial.period * 8);
    close(metric('speed'), initial.speed / 2);
    for (const name of ['potential', 'kinetic', 'total']) close(metric(name), initial[name] / 4);
  });

  it('retains every legacy preset without changing the body or inspection settings', () => {
    const env = renderWorkshop({ orr_wsb: 'neptune', orr_wsphase: 0.325, orr_wscompare: true, orr_wshz: false });
    for (const [name, a, e] of PRESETS) {
      env.click(env.button(name));
      expect(env.state.orr_wsa).toBe(a);
      expect(env.state.orr_wse).toBe(e);
      expect(env.state.orr_wsb).toBe('neptune');
      expect(env.state.orr_wsphase).toBe(0.325);
      expect(env.state.orr_wscompare).toBe(true);
      expect(env.state.orr_wshz).toBe(false);
      close(Number(env.semiMajor.value), a);
      close(Number(env.eccentricity.value), e);
      expectOrbit(a, e, 0.325);
    }
  });

  it('retains all twelve body choices and resets custom values without resetting the inspection', () => {
    const env = renderWorkshop({ orr_wsb: 'earth', orr_wse: 0.8, orr_wsa: 2, orr_wsphase: 0.325, orr_wscompare: true, orr_wshz: false });
    expect(env.bodyGroup?.querySelectorAll('button')).toHaveLength(BODIES.length);
    for (const [id, name, a, e] of BODIES) {
      const control = [...env.bodyGroup.querySelectorAll('button')].find((button) => button.textContent.trim().endsWith(name));
      env.click(control);
      expect(env.state.orr_wsb).toBe(id);
      expect(env.state.orr_wse).toBeUndefined();
      expect(env.state.orr_wsa).toBeUndefined();
      expect(env.state.orr_wsphase).toBe(0.325);
      expect(env.state.orr_wscompare).toBe(true);
      expect(env.state.orr_wshz).toBe(false);
      expect([...env.bodyGroup.querySelectorAll('button[aria-pressed="true"]')]).toHaveLength(1);
      expect(env.bodyGroup.querySelector('button[aria-pressed="true"]')?.textContent).toContain(name);
      expectOrbit(a, e, 0.325);
    }
    env.change(env.eccentricity, 0.2);
    env.change(env.semiMajor, 3);
    env.click(env.button('Reset to real values'));
    expect(env.state.orr_wsb).toBe('eris');
    expect(env.state.orr_wse).toBeUndefined();
    expect(env.state.orr_wsa).toBeUndefined();
    expect(env.state.orr_wsphase).toBe(0.325);
    expect(env.state.orr_wscompare).toBe(true);
    expect(env.state.orr_wshz).toBe(false);
    expectOrbit(67.67, 0.4407, 0.325);
  });

  it('toggles reference geometry and the band without changing scientific readings', () => {
    const env = renderWorkshop({ orr_wsa: 1.5, orr_wse: 0.7, orr_wsphase: 0.37 });
    const initial = readings(), band = bandReading(), retained = otherWork(env.state);
    env.click(env.button('Show reference orbit'));
    expect(env.state.orr_wscompare).toBe(true);
    expect(env.button('Show reference orbit')?.getAttribute('aria-pressed')).toBe('true');
    expect(readings()).toEqual(initial);
    env.click(env.button('Show distance band'));
    expect(env.state.orr_wshz).toBe(false);
    expect(env.button('Show distance band')?.getAttribute('aria-pressed')).toBe('false');
    expect(readings()).toEqual(initial);
    expect(bandReading().fraction).toBe(band.fraction);
    expect(otherWork(env.state)).toEqual(retained);
    env.click(env.button('Show reference orbit'));
    env.click(env.button('Show distance band'));
    expect(env.state.orr_wscompare).toBe(false);
    expect(env.state.orr_wshz).toBe(true);
    expect(readings()).toEqual(initial);
  });

  it.each([[1, 0.3], [1.5, 0.2], [1.5, 0.7]])('measures actual residence time for a crossing orbit a=%s, e=%s', (a, e) => {
    const env = renderWorkshop({ orr_wsa: a, orr_wse: e, orr_wsphase: 0 });
    const first = bandReading();
    expect(first.state).toBe('intersects');
    close(first.fraction, bandFraction(a, e));
    expect(first.fraction).toBeGreaterThan(0);
    expect(first.fraction).toBeLessThan(1);
    env.change(env.phase, 75);
    close(bandReading().fraction, first.fraction);
    expect(bandReading().state).toBe('intersects');
  });

  it('distinguishes containment, disjoint paths and boundary contact without a habitability claim', () => {
    for (const [a, e, state, fraction] of [
      [1, 0, 'within', 1], [1.2, 0.1, 'within', 1],
      [0.5, 0.2, 'outside', 0], [3, 0.1, 'outside', 0],
      [0.75, 0, 'within', 1], [1.7, 0, 'within', 1],
      [0.5, 0.5, 'intersects', 0], [2, 0.15, 'intersects', 0],
    ]) {
      renderWorkshop({ orr_wsa: a, orr_wse: e });
      const band = bandReading();
      expect(band.state, `Band relationship for a=${a}, e=${e}`).toBe(state);
      close(band.fraction, fraction);
      expect(band.text).not.toMatch(/this orbit passes through the habitable zone|this orbit does not remain in the habitable zone/i);
    }
  });

  it('normalizes partial and malformed restored values for display without rewriting the save', () => {
    const cases = [
      [{ orr_wse: null, orr_wsa: null, orr_wsphase: null, orr_wscompare: null, orr_wshz: null }, 1, 0.01671, 0, false, true],
      [{ orr_wse: '0.2', orr_wsa: '2', orr_wsphase: '0.3', orr_wscompare: 'true', orr_wshz: 'false' }, 1, 0.01671, 0, false, true],
      [{ orr_wsb: 'mars', orr_wse: NaN, orr_wsa: Infinity, orr_wsphase: Infinity }, 1.524, 0.09339, 0, false, true],
      [{ orr_wse: -2, orr_wsa: -3, orr_wsphase: -4, orr_wscompare: false, orr_wshz: false }, 0.05, 0, 0, false, false],
      [{ orr_wse: 2, orr_wsa: 120, orr_wsphase: 4, orr_wscompare: true, orr_wshz: true }, 80, 0.99, 1, true, true],
      [{ orr_wsb: 'missing-world', orr_wse: undefined, orr_wsa: undefined }, 1, 0.01671, 0, false, true],
    ];
    for (const [saved, a, e, phase, compare, band] of cases) {
      const env = renderWorkshop(saved);
      for (const [key, value] of Object.entries(saved)) expect(env.state[key]).toEqual(value);
      expectOrbit(a, e, phase);
      close(Number(env.eccentricity.value), e);
      close(Number(env.semiMajor.value), a);
      close(Number(env.phase.value), phase * 100);
      expect(env.button('Show reference orbit')?.getAttribute('aria-pressed')).toBe(String(compare));
      expect(env.button('Show distance band')?.getAttribute('aria-pressed')).toBe(String(band));
      expect(env.inspection.textContent).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('changes only Workshop fields and leaves shared time, evidence and other lessons untouched', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderWorkshop({
      orr_wsb: 'earth', orr_wsa: 1, orr_wse: 0.3, orr_wsphase: 0.37,
      orr_sel: 'mars', orr_compare: 'earth', orr_time: 12.75, orr_paused: false,
      orr_follow: true, orr_zoom: 'inner', orr_view_reset: 2,
      orr_k1e: 0.5, orr_k1phase: 0.25, orr_k1playing: true, orr_k1axes: false,
      orr_k2e: 0.6, orr_k2s: 9, orr_k2phase: 0.2, orr_k2playing: false, orr_k3hover: 'halley',
      orr_snapshots: { mars: { a: { bodyId: 'mars', time: 0, distance: 1.4, speed: 26 } } },
      orr_mission_idx: 2, orr_mission_progress: { speed_zone: { started: true, correct: true } },
      keplerInquiry: { a: 2, e: 0.4, mass: 1, baseline: { a: 2, e: 0.2, mass: 1 },
        hypothesis: 'Hold orbit size.', explanation: 'Period follows orbit size.', log: [{ a: '2.00', p: '2.83' }] },
      journalEntries: [{ observation: 'Retain my saved experiment.' }], missionLog: [{ text: 'Earlier orbit evidence.' }],
    }, { awardXP, tryAward });
    const retained = otherWork(env.state);
    const actions = [
      () => env.change(env.eccentricity, 0.99), () => env.change(env.semiMajor, 0.05),
      () => env.change(env.phase, 32.5), () => env.click(env.button('Show reference orbit')),
      () => env.click(env.button('Show distance band')), () => env.click(env.button('Halley-like')),
      () => env.click(env.button('Aphelion (50%)')), () => env.click(env.button('Reset to real values')),
      () => env.click([...env.bodyGroup.querySelectorAll('button')].find((button) => button.textContent.trim().endsWith('Mars'))),
    ];
    for (const action of actions) { action(); expect(otherWork(env.state)).toEqual(retained); }
    expect(awardXP).not.toHaveBeenCalled();
    expect(tryAward).not.toHaveBeenCalled();
  });
});
