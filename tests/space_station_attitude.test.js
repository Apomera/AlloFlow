import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberFn = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
const modelFn = source.slice(source.indexOf('  function issAttitudeConfig('), source.indexOf('  var _issRefOrbit'));
const { run, inspect, times, margin } = new Function(numberFn + modelFn + '\nreturn {run:issAttitudeRun,inspect:issAttitudeInspect,times:issAttitudeTimes,margin:issAttitudeMargin};')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const { act } = React;
const drifting = { cmg: 85, torque: 2.4 };
const unloading = { cmg: 70, torque: 2.4, dump: true, burnMinute: 10 };

describe('space station momentum management physics', () => {
  it('absorbs environmental impulse while holding zero station rotation below capacity', () => {
    const model = run({}), state = inspect(model, 92);
    expect(state.gyro).toBeCloseTo(.28 * 19000 + .35 * 5520, 10);
    expect(state.rate).toBe(0);
    expect(state.angle).toBe(0);
    expect(state.cmgTorque + state.disturbanceTorque).toBe(0);
    expect(model.firstCapacity).toBeNull();
    expect(state.fuelUsed).toBe(0);
  });

  it('integrates actual body acceleration after reaching the gyro limit', () => {
    const model = run(drifting), hit = (19000 - .85 * 19000) / 2.4;
    expect(model.firstCapacity).toBeCloseTo(hit, 10);
    const state = inspect(model, 92), driftSeconds = 5520 - hit;
    expect(state.gyro).toBe(19000);
    expect(state.body).toBeCloseTo(2.4 * driftSeconds, 10);
    expect(state.rate).toBeCloseTo(2.4 * driftSeconds / 80e6, 14);
    expect(state.angle).toBeCloseTo(.5 * 2.4 * driftSeconds ** 2 / 80e6, 13);
    expect(state.bodyTorque).toBe(2.4);
    expect(state.cmgTorque).toBe(0);
    expect(state.spinEnergy).toBeCloseTo(.5 * 80e6 * state.rate ** 2, 12);
  });

  it.each([0, 10, 19.7916666667, 40.234, 78.2, 92])('balances angular momentum and propellant at minute %s', minute => {
    for (const options of [{}, drifting, unloading, { ...unloading, fuel: .1 }, { ...drifting, dump: true, burnMinute: 50 }, { cmg: 100, torque: 4, dump: true, burnMinute: 85, thrust: 1 }]) {
      const model = run(options), state = inspect(model, minute), c = model.config;
      expect(state.gyro + state.body).toBeCloseTo(model.initial + state.disturbanceImpulse + state.thrusterImpulse, 8);
      expect(-state.thrusterImpulse).toBeCloseTo(state.fuelUsed * c.arm * c.isp * c.g0, 8);
      expect(state.fuelUsed + state.fuelLeft).toBeCloseTo(c.fuel, 12);
      expect(state.fuelLeft).toBeGreaterThanOrEqual(0);
      expect(Math.abs(state.gyro)).toBeLessThanOrEqual(c.capacity);
      expect(state.cmgTorque + state.disturbanceTorque + state.thrusterTorque).toBeCloseTo(state.bodyTorque, 12);
    }
  });

  it('uses a finite burn to reach the target and preserves pointing when scheduled early', () => {
    const model = run(unloading), start = inspect(model, model.burnStart / 60), end = inspect(model, model.burnEnd / 60);
    expect(start.burning).toBe(true);
    expect(start.thrusterTorque).toBe(-2 * 5 * 8);
    expect(start.fuelUsed).toBe(0);
    expect(end.burning).toBe(false);
    expect(end.percent).toBeCloseTo(8, 10);
    expect(model.stopReason).toBe('target');
    expect(model.burnSeconds).toBeGreaterThan(100);
    expect(model.peakPercent).toBeLessThan(80);
    expect(inspect(model, 92).angle).toBe(0);
    expect(inspect(model, 92).fuelUsed).toBe(end.fuelUsed);
    expect(inspect(model, 92).percent).toBeGreaterThan(8);
  });

  it('cuts thrust at fuel exhaustion and does not invent an instant unload', () => {
    const model = run({ ...unloading, fuel: .1 });
    expect(model.stopReason).toBe('fuel');
    expect(model.burnSeconds).toBeCloseTo(.1 * 220 * 9.80665 / (2 * 5), 10);
    const end = inspect(model, model.burnEnd / 60);
    expect(end.fuelLeft).toBe(0);
    expect(end.burning).toBe(false);
    expect(end.percent).toBeGreaterThan(8);
    expect(inspect(model, 92).phase).toBe('drifting');
    const empty = run({ ...unloading, fuel: 0 });
    expect(empty.burnStart).toBeNull();
    expect(empty.stopReason).toBe('no-fuel');
    expect(inspect(empty, 92).total).toBe(inspect(run({ ...unloading, dump: false }), 92).total);
    expect(run({ cmg: 0, torque: 0, dump: true, burnMinute: 0 }).stopReason).toBe('not-needed');
  });

  it('stops late drift without erasing the accumulated pointing offset', () => {
    const model = run({ ...drifting, dump: true, burnMinute: 50 });
    const before = inspect(model, 50), end = inspect(model, 92);
    expect(before.rate).toBeGreaterThan(0);
    expect(end.rate).toBe(0);
    expect(end.angle).toBeGreaterThan(before.angle);
    expect(end.angleDeg).toBeGreaterThan(2);
    expect(model.peakPercent).toBe(100);
    const braking = inspect(model, 50.2);
    expect(braking.body).toBeGreaterThan(0);
    expect(braking.gyro).toBe(19000);
    expect(braking.cmgTorque).toBe(0);
    expect(braking.bodyTorque).toBeCloseTo(2.4 - 80, 12);
  });

  it('keeps angle, rotation and momentum continuous at every physical event', () => {
    const model = run({ ...drifting, dump: true, burnMinute: 50 });
    for (const event of model.segments.flatMap(segment => [segment.start, segment.end]).filter(t => t > 0 && t < 5520)) {
      const before = inspect(model, (event - 1e-6) / 60), after = inspect(model, (event + 1e-6) / 60);
      expect(before.angle).toBeCloseTo(after.angle, 8);
      expect(before.rate).toBeCloseTo(after.rate, 8);
      expect(before.total).toBeCloseTo(after.total, 3);
      expect(before.gyro).toBeCloseTo(after.gyro, 3);
    }
    const dt = 1e-4;
    for (const minute of [30, 40, 50.2, 51, 70]) {
      const before = inspect(model, minute - dt), now = inspect(model, minute), after = inspect(model, minute + dt);
      expect((after.angle - before.angle) / (120 * dt)).toBeCloseTo(now.rate, 10);
      expect((after.rate - before.rate) / (120 * dt)).toBeCloseTo(now.bodyTorque / model.config.inertia, 10);
    }
  });

  it('changes the drift with inertia without changing the impulse or fuel budget', () => {
    const light = inspect(run({ ...drifting, inertia: 40 }), 92), heavy = inspect(run({ ...drifting, inertia: 80 }), 92);
    expect(light.rate).toBeCloseTo(2 * heavy.rate, 14);
    expect(light.angle).toBeCloseTo(2 * heavy.angle, 14);
    expect(light.body).toBe(heavy.body);
    expect(light.fuelUsed).toBe(heavy.fuelUsed);
  });

  it('caps an unfinished burn at orbit end and exposes sorted exact plot events', () => {
    const model = run({ cmg: 100, torque: 4, dump: true, burnMinute: 85, thrust: 1 });
    expect(model.stopReason).toBe('orbit-end');
    expect(model.burnEnd).toBe(5520);
    expect(inspect(model, 92).fuelLeft).toBeGreaterThan(0);
    expect(inspect(model, 100).minute).toBe(92);
    const scheduled = run(unloading), plot = times(scheduled);
    expect(plot).toContain(scheduled.burnEnd / 60);
    expect(plot[0]).toBe(0);
    expect(plot.at(-1)).toBe(92);
    expect(plot.every((time,index) => index === 0 || time > plot[index - 1])).toBe(true);
  });

  it('bounds malformed inputs and supports deterministic inspection in either direction', () => {
    for (const value of [NaN, Infinity, 'broken', null, -10000, 10000]) {
      const model = run({ cmg: value, torque: value, inertia: value, burnMinute: value, thrust: value, fuel: value, dump: true });
      for (const minute of [value, 0, 50, 92]) for (const [field, number] of Object.entries(inspect(model, minute))) {
        if (typeof number === 'number') expect(Number.isFinite(number), field).toBe(true);
      }
    }
    const model = run(unloading), snapshot = JSON.stringify(model), end = inspect(model, 92);
    inspect(model, 0); inspect(model, 50); inspect(model, model.burnEnd / 60);
    expect(inspect(model, 92)).toEqual(end);
    expect(JSON.stringify(model)).toBe(snapshot);
  });
});

let cleanups, frames, nextFrame, clock;
function advance(seconds) {
  for (let index = 0; index <= Math.round(seconds * 50); index++) {
    if (index) clock += 20;
    const callbacks = [...frames.values()]; frames.clear();
    act(() => callbacks.forEach(callback => callback(clock)));
  }
}
function mountAttitude(seed = {}) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  let data, setData;
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'operations', opsMode: 'attitude', ...seed } });
    data = toolData.spaceStation; setData = setToolData;
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  act(() => root.render(React.createElement(Harness)));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); });
  return {
    host,
    get data() { return data; },
    get time() { return data.opsOrbitMinute || 0; },
    get playing() { return host.querySelector('[data-iss-playback-toggle="attitude"]').getAttribute('aria-pressed') === 'true'; },
    patch(patch) { act(() => setData(prev => ({ ...prev, spaceStation: { ...prev.spaceStation, ...patch } }))); },
    click(selector) { act(() => host.querySelector(selector).click()); },
    change(id, value) { act(() => Simulate.change(host.querySelector('#' + id), { target: { value: String(value) } })); },
    read(name) { return host.querySelector('[data-attitude-reading="' + name + '"] strong').textContent; },
  };
}

describe('space station interactive pointing lab', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
    cleanups = []; frames = new Map(); nextFrame = 0; clock = 0;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', callback => { const id = ++nextFrame; frames.set(id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => { cleanups.forEach(fn => fn()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('shows precise control values and ties drawn station rotation to the actual model angle', () => {
    const view = mountAttitude();
    expect(view.host.querySelector('#iss-attitude-torque').getAttribute('aria-valuetext')).toBe('0.35 N·m');
    expect(view.host.querySelector('#iss-attitude-fuel').getAttribute('aria-valuetext')).toBe('1.50 kg');
    expect(view.host.querySelector('[data-attitude-event="capacity"]').disabled).toBe(true);
    view.click('[data-attitude-preset="drift"]');
    view.click('[data-attitude-event="capacity"]');
    expect(view.time).toBeCloseTo(run(drifting).firstCapacity / 60, 10);
    expect(view.read('rate')).toBe('0.0000 °/s');
    view.click('[data-attitude-event="end"]');
    const expected = inspect(run(drifting), 92);
    expect(view.read('angle')).toBe(expected.angleDeg.toFixed(2) + '°');
    expect(view.host.querySelector('[data-attitude-station]').getAttribute('transform')).toContain('rotate(' + expected.angleDeg + ')');
    expect(view.host.querySelector('[data-attitude-phase]').getAttribute('data-attitude-phase')).toBe('drifting');
    expect(view.host.querySelector('[data-attitude-outcome]').getAttribute('data-attitude-outcome')).toBe('drifting');
    expect(view.host.querySelector('[data-attitude-gimbal]').getAttribute('transform')).toBe('rotate(0)');
  });

  it('fires only during the planned burn, reaches its target and records finite propellant use', () => {
    const view = mountAttitude();
    view.click('[data-attitude-preset="unload"]');
    view.click('[data-attitude-event="burn-start"]');
    expect(view.time).toBe(10);
    expect(view.host.querySelector('[data-attitude-plumes]')).not.toBeNull();
    expect(view.read('thruster-torque')).toBe('−80.00 N·m');
    expect(view.read('fuel')).toBe('0.000 kg');
    view.click('[data-attitude-event="burn-end"]');
    expect(view.time).toBeCloseTo(run(unloading).burnEnd / 60, 10);
    expect(view.host.querySelector('[data-attitude-plumes]')).toBeNull();
    expect(view.host.querySelector('[data-attitude-load]').textContent).toBe('8.0%');
    expect(view.read('fuel')).toBe(inspect(run(unloading), 92).fuelUsed.toFixed(3) + ' kg');
    view.click('[data-attitude-event="end"]');
    expect(view.host.querySelector('[data-attitude-outcome]').getAttribute('data-attitude-outcome')).toBe('held');
    expect(view.read('angle')).toBe('0.00°');
  });

  it('shows fuel-limited burns and late-burn residual pointing honestly', () => {
    const view = mountAttitude();
    view.click('[data-attitude-preset="unload"]');
    view.change('iss-attitude-fuel', .1);
    expect(view.host.querySelector('[data-attitude-burn-note]').textContent).toContain('propellant runs out');
    view.click('[data-attitude-event="end"]');
    expect(view.read('fuel')).toBe('0.100 kg');
    expect(view.host.querySelector('[data-attitude-outcome]').getAttribute('data-attitude-outcome')).toBe('drifting');
    view.change('iss-attitude-fuel', 0);
    expect(view.host.querySelector('[data-attitude-event="burn-start"]').disabled).toBe(true);
    expect(view.host.querySelector('[data-attitude-burn-note]').textContent).toContain('cannot fire');
    view.patch({ opsCmg: 85, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50, opsAttitudeFuel: 1.5, opsOrbitMinute: 92 });
    expect(view.host.querySelector('[data-attitude-outcome]').getAttribute('data-attitude-outcome')).toBe('offset');
    expect(view.read('rate')).toBe('0.0000 °/s');
    expect(parseFloat(view.read('angle'))).toBeGreaterThan(2);
  });

  it('plays across capacity, preserves time for view controls, and pauses on setup changes', () => {
    const view = mountAttitude({ opsCmg: 85, opsAttitudeTorque: 2.4, opsOrbitMinute: 19.7 });
    view.click('[data-iss-playback-toggle="attitude"]');
    advance(.5);
    expect(view.time).toBeGreaterThan(20);
    expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-attitude-phase]').getAttribute('data-attitude-phase')).toBe('drifting');
    const time = view.time;
    view.click('[data-attitude-part="gyros"]');
    expect(view.time).toBe(time);
    expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-attitude-part-note]').textContent).toContain('constant-speed rotors');
    view.change('iss-attitude-inertia', 100);
    expect(view.time).toBe(0);
    expect(view.playing).toBe(false);
    view.click('[data-attitude-preset="unload"]');
    view.click('[data-attitude-event="burn-start"]');
    view.click('[data-iss-playback-toggle="attitude"]');
    const burnTime = view.time;
    view.click('[data-attitude-reference]');
    expect(view.time).toBe(burnTime);
    expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-attitude-reference-path]')).toBeNull();
    view.click('[data-attitude-burn-toggle]');
    expect(view.time).toBe(0);
    expect(view.playing).toBe(false);
    expect(view.host.querySelector('[data-attitude-event="burn-start"]').disabled).toBe(true);
  });

  it('supports either captured graph, pointer cancellation and keyboard-equivalent seeking', () => {
    const view = mountAttitude();
    for (const id of ['momentum','angle']) {
      const plot = view.host.querySelector('[data-attitude-plot="' + id + '"]');
      vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ left: 20, width: 400 });
      let captured = false;
      plot.setPointerCapture = () => { captured = true; };
      plot.hasPointerCapture = () => captured;
      plot.releasePointerCapture = () => { captured = false; };
      act(() => Simulate.pointerDown(plot, { button: 0, isPrimary: true, pointerId: 1, clientX: 220 }));
      expect(view.time).toBe(46);
      act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 320 }));
      expect(view.time).toBe(69);
      act(() => Simulate.pointerCancel(plot, { pointerId: 1 }));
      act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 420 }));
      expect(view.time).toBe(69);
    }
    view.click('[data-iss-playback-toggle="attitude"]');
    view.change('iss-attitude-time', 69.1);
    expect(view.time).toBe(69.1);
    expect(view.playing).toBe(false);
    expect(view.host.querySelector('#iss-attitude-time').getAttribute('aria-valuetext')).toContain('pointing change');
  });

  it('pauses on an unchanged event seek and never restores autoplay on returning', () => {
    const view = mountAttitude({ opsAttitudeDump: true, opsOrbitMinute: 40, opsAttitudePlaying: true });
    expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="attitude"]');
    view.click('[data-attitude-event="burn-start"]');
    expect(view.time).toBe(40);
    expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="attitude"]');
    advance(.2);
    view.patch({ opsMode: 'integrated' });
    const time = view.time;
    advance(.2);
    expect(view.time).toBe(time);
    view.patch({ opsMode: 'attitude' });
    expect(view.playing).toBe(false);
  });

  it('shares the attitude forecast and orbit peak rule without advancing initial conditions twice', () => {
    const view = mountAttitude({ opsCmg: 70, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 10, opsOrbitMinute: 70 });
    const model = run(unloading);
    expect(view.host.querySelector('[data-flight-rule="attitude"]').textContent).toContain(model.peakPercent.toFixed(0) + '%');
    expect(view.host.querySelector('[data-flight-rule="attitude"]').textContent).toContain('ORBIT PEAK');
    view.patch({ opsMode: 'integrated' });
    expect(view.host.querySelector('#iss-orbit-readout').textContent).toContain('Attitude ' + margin(model, 70).toFixed(0) + '%');
    const simulate = [...view.host.querySelectorAll('button')].find(button => button.textContent.includes('Simulate the next'));
    act(() => simulate.click());
    expect(view.time).toBe(92);
    expect(view.data.opsCmg).toBe(70);
    expect(view.host.querySelector('#iss-orbit-readout').textContent).toContain('Attitude ' + margin(model, 92).toFixed(0) + '%');
    view.patch({ opsMode: 'attitude' });
    expect(view.read('fuel')).toBe(inspect(model, 92).fuelUsed.toFixed(3) + ' kg');
  });
});
