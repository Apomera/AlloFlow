import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberFn = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
const modelFn = source.slice(source.indexOf('  function issPowerState('), source.indexOf('  var _issRefOrbit'));
const { run, inspect, power, margin } = new Function(numberFn + modelFn + '\nreturn { run: issThermalRun, inspect: issThermalInspect, power: issPowerState, margin: issThermalMargin };')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act, Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const restricted = { radiator: 30, cooling: 40, power: { load: 100.1 } };
const strong = { radiator: 100, cooling: 100, cabinStart: 20, power: { load: 79.2 } };

describe('space station coupled thermal physics', () => {
  it.each([0, 12.345, 47, 57, 82.81, 92])('conserves heat in both stores and the whole system at minute %s', minute => {
    for (const options of [{}, restricted, strong, { power: { generation: 0, battery: 5 } }, { power: { generation: 50, battery: 0 } }]) {
      const state = inspect(run(options), minute);
      expect(state.generatedKWh - state.transferredKWh).toBeCloseTo(state.cabinStoredKWh, 9);
      expect(state.transferredKWh + state.absorbedKWh - state.radiatedKWh).toBeCloseTo(state.radiatorStoredKWh, 9);
      expect(state.generatedKWh + state.absorbedKWh - state.radiatedKWh).toBeCloseTo(state.storedKWh, 9);
    }
  });

  it('follows heat capacity, signed conduction and radiation in absolute kelvin', () => {
    const model = run({ radiator: 100, cooling: 100 });
    const state = inspect(model, 0), dt = 1e-5;
    expect(state.transferKW).toBeCloseTo(4 * (22 - 4), 12);
    expect(state.emittedKW).toBeCloseTo(.85 * 5.670374419e-8 * 320 * (277.15 ** 4 - 3 ** 4) / 1000, 10);
    expect(state.cabinRate).toBeCloseTo((.72 * 92.4 + .7 - 72) / 24000 * 60, 12);
    for (const minute of [10, 33.7, 58, 90]) {
      const now = inspect(model, minute), before = inspect(model, minute - dt), after = inspect(model, minute + dt);
      expect((after.cabin - before.cabin) / (2 * dt)).toBeCloseTo(now.cabinRate, 7);
      expect((after.radiator - before.radiator) / (2 * dt)).toBeCloseTo(now.radiatorRate, 7);
      expect(now.radiatorRate / 60 * 6000).toBeCloseTo(now.transferKW + now.absorbedKW - now.emittedKW, 10);
    }
  });

  it('keeps temperatures continuous at eclipse while the environmental heat flux changes', () => {
    const model = run({});
    const before = inspect(model, 57 - 1e-8), after = inspect(model, 57 + 1e-8);
    expect(before.lit).toBe(true);
    expect(after.lit).toBe(false);
    expect(before.cabin).toBeCloseTo(after.cabin, 7);
    expect(before.radiator).toBeCloseTo(after.radiator, 7);
    expect(before.absorbedKW - after.absorbedKW).toBeCloseTo(320 * .82 * .025, 10);
    expect(before.emittedKW).toBeCloseTo(after.emittedKW, 7);
    expect(before.heatKW).toBe(after.heatKW);
    expect(after.emittedKW).toBeGreaterThan(0);
  });

  it('stops powered equipment and the pump at an empty battery while crew heat remains', () => {
    const options = { crew: 7, power: { generation: 0, battery: 5, load: 100 } };
    const model = run(options), empty = power(options.power, 92).emptyMinute;
    const before = inspect(model, empty - 1e-8), after = inspect(model, empty + 1e-8);
    expect(before.pumpPowered).toBe(true);
    expect(after.pumpPowered).toBe(false);
    expect(after.heatKW).toBeCloseTo(.7, 12);
    expect(after.transferKW).toBe(0);
    expect(after.cabinRate).toBeCloseTo(.7 / 24000 * 60, 12);
    expect(before.cabin).toBeCloseTo(after.cabin, 7);
    expect(before.radiator).toBeCloseTo(after.radiator, 7);
    expect(after.radiatorRate).toBeLessThan(0);
    // Integrated equipment heat cannot exceed the electrical energy delivered.
    expect(inspect(model, 92).generatedKWh).toBeCloseTo(.72 * power(options.power, 92).servedKWh + .7 * 92 / 60, 9);
  });

  it('finds both hot and cold comfort boundaries inside an integration step', () => {
    const normal = run({});
    expect(normal.firstLimitMinute).toBeNull();
    expect(normal.minCabin).toBeGreaterThan(18);
    expect(normal.maxCabin).toBeLessThan(27);
    for (const [options, limit, direction] of [[restricted, 27, 1], [strong, 18, -1]]) {
      const model = run(options), time = model.firstLimitMinute;
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(92);
      expect(inspect(model, time).cabin).toBeCloseTo(limit, 8);
      expect((inspect(model, time - .01).cabin - limit) * direction).toBeLessThan(0);
      expect((inspect(model, time + .01).cabin - limit) * direction).toBeGreaterThan(0);
    }
    expect(run({ cabinStart: 16 }).firstLimitMinute).toBe(0);
    expect(run({ cabinStart: 30 }).firstLimitMinute).toBe(0);
  });

  it('converges when integration steps shrink from ten seconds to one second', () => {
    for (const options of [restricted, strong, { power: { generation: 50, battery: 4 } }]) {
      const coarse = run(options), fine = run({ ...options, stepSeconds: 1 });
      for (const minute of [1.23, 35.7, 57, 91.31, 92]) {
        const a = inspect(coarse, minute), b = inspect(fine, minute);
        expect(a.cabin).toBeCloseTo(b.cabin, 7);
        expect(a.radiator).toBeCloseTo(b.radiator, 7);
        expect(a.radiatedKWh).toBeCloseTo(b.radiatedKWh, 7);
      }
      if (coarse.firstLimitMinute !== null) expect(coarse.firstLimitMinute).toBeCloseTo(fine.firstLimitMinute, 6);
    }
  });

  it('replays and rewinds deterministically without changing a cached run', () => {
    const model = run(restricted), snapshot = JSON.stringify(model);
    const end = inspect(model, 92);
    inspect(model, 20.001); inspect(model, 0); inspect(run(strong), 92);
    expect(inspect(run(restricted), 92)).toEqual(end);
    expect(JSON.stringify(model)).toBe(snapshot);
    expect(inspect(model, 0).cabin).toBe(22);
    expect(inspect(model, 0).storedKWh).toBe(0);
  });

  it('bounds invalid restored setup and inspection values to finite states', () => {
    for (const value of [NaN, Infinity, 'broken', null, -1000, 1000]) {
      const model = run({ radiator: value, cooling: value, cabinStart: value, crew: value, stepSeconds: value, power: { generation: value, battery: value, load: value, eclipse: value } });
      for (const minute of [value, 0, 57, 92]) {
        for (const [field, number] of Object.entries(inspect(model, minute))) if (typeof number === 'number') expect(Number.isFinite(number), field).toBe(true);
      }
      expect(model.config.area).toBeGreaterThanOrEqual(96);
      expect(model.config.area).toBeLessThanOrEqual(320);
      expect(model.config.cabinStart).toBeGreaterThanOrEqual(16);
      expect(model.config.cabinStart).toBeLessThanOrEqual(30);
    }
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
function mountThermal(seed = {}) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  let data, setData;
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'operations', opsMode: 'thermal', ...seed } });
    data = toolData.spaceStation; setData = setToolData;
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  act(() => root.render(React.createElement(Harness)));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); });
  return {
    host,
    get time() { return data.opsOrbitMinute || 0; },
    get playing() { return host.querySelector('[data-iss-playback-toggle="thermal"]').getAttribute('aria-pressed') === 'true'; },
    patch(patch) { act(() => setData(prev => ({ ...prev, spaceStation: { ...prev.spaceStation, ...patch } }))); },
    click(selector) { act(() => host.querySelector(selector).click()); },
    change(id, value) { act(() => Simulate.change(host.querySelector('#' + id), { target: { value: String(value) } })); },
    read(name) { return host.querySelector('[data-thermal-reading="' + name + '"] strong').textContent; },
  };
}

describe('space station interactive thermal lab', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
    cleanups = []; frames = new Map(); nextFrame = 0; clock = 0;
    vi.stubGlobal('requestAnimationFrame', callback => { const id = ++nextFrame; frames.set(id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => { cleanups.forEach(fn => fn()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('updates the scene, temperatures and heat ledger at exact orbit events', () => {
    const view = mountThermal();
    expect(view.read('cabin')).toBe('22.00 °C');
    expect(view.read('radiator')).toBe('4.00 °C');
    expect(view.host.querySelector('[data-thermal-event="limit"]').disabled).toBe(true);
    view.click('[data-thermal-event="eclipse"]');
    const expected = inspect(run({}), 57);
    expect(view.time).toBe(57);
    expect(view.host.querySelector('[data-thermal-phase]').getAttribute('data-thermal-phase')).toBe('eclipse');
    expect(view.read('cabin')).toBe(expected.cabin.toFixed(2) + ' °C');
    expect(view.read('radiator')).toBe(expected.radiator.toFixed(2) + ' °C');
    expect(view.read('absorbed')).toBe(expected.absorbedKW.toFixed(1) + ' kW');
    view.click('[data-thermal-event="end"]');
    expect(view.read('radiated-energy')).toBe(inspect(run({}), 92).radiatedKWh.toFixed(1) + ' kWh');
    expect(view.host.querySelector('[data-thermal-outcome]').getAttribute('data-thermal-outcome')).toBe('comfortable');
  });

  it('exposes overheating and overcooling with exact comfort-boundary inspection', () => {
    const view = mountThermal();
    for (const [preset, options, limit] of [['restricted', restricted, 27], ['strong', strong, 18]]) {
      view.click('[data-thermal-preset="' + preset + '"]');
      expect(view.time).toBe(0);
      expect(view.host.querySelector('[data-thermal-outcome]').getAttribute('data-thermal-outcome')).toBe('outside');
      expect(view.host.querySelector('[data-flight-rule="thermal"]').getAttribute('aria-label')).toContain('Attention');
      view.click('[data-thermal-event="limit"]');
      expect(view.time).toBeCloseTo(run(options).firstLimitMinute, 8);
      expect(view.read('cabin')).toBe(limit.toFixed(2) + ' °C');
      view.click('[data-thermal-event="end"]');
      expect(view.read('cabin')).toBe(inspect(run(options), 92).cabin.toFixed(2) + ' °C');
    }
    view.click('[data-thermal-preset="balanced"]');
    expect(view.read('cabin')).toBe('22.00 °C');
    expect(view.host.querySelector('[data-flight-rule="thermal"]').getAttribute('aria-label')).toContain('Go');
  });

  it('plays continuously through eclipse and preserves playback for focus and comparison changes', () => {
    const view = mountThermal({ opsOrbitMinute: 56.5 });
    const startTemperature = parseFloat(view.read('cabin'));
    const flow = () => view.host.querySelector('[data-thermal-hot-flow]').getAttribute('stroke-dashoffset');
    const beforeFlow = flow();
    view.click('[data-iss-playback-toggle="thermal"]');
    advance(1);
    expect(view.time).toBeGreaterThan(57);
    expect(view.playing).toBe(true);
    expect(flow()).not.toBe(beforeFlow);
    expect(Math.abs(parseFloat(view.read('cabin')) - startTemperature)).toBeLessThan(.1);
    const time = view.time;
    view.click('[data-thermal-part="radiator"]');
    expect(view.time).toBe(time);
    expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-thermal-part-note]').textContent).toContain('fourth-power');
    view.click('[data-thermal-reference]');
    expect(view.time).toBe(time);
    expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-thermal-reference-path]')).toBeNull();
    view.click('[data-iss-playback-toggle="thermal"]');
    const pausedFlow = flow();
    advance(.4);
    expect(view.time).toBe(time);
    expect(flow()).toBe(pausedFlow);
  });

  it('resets and pauses after a setup change, including the starting temperature', () => {
    const view = mountThermal();
    for (const [id, value] of [['iss-thermal-rad', 60], ['iss-thermal-flow', 50], ['iss-thermal-research', 80], ['iss-thermal-start', 19.5]]) {
      view.click('[data-thermal-event="eclipse"]');
      view.click('[data-iss-playback-toggle="thermal"]');
      view.change(id, value);
      expect(view.time).toBe(0);
      expect(view.playing).toBe(false);
      advance(.2);
      expect(view.time).toBe(0);
    }
    expect(view.read('cabin')).toBe('19.50 °C');
    expect(view.read('generated-energy')).toBe('0.0 kWh');
  });

  it('supports captured pointer inspection, cancellation and precise slider seeking', () => {
    const view = mountThermal();
    const plot = view.host.querySelector('[data-thermal-plot]');
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ left: 20, width: 400 });
    let captured = false;
    plot.setPointerCapture = () => { captured = true; };
    plot.hasPointerCapture = () => captured;
    plot.releasePointerCapture = () => { captured = false; };
    act(() => Simulate.pointerDown(plot, { button: 2, isPrimary: true, pointerId: 1, clientX: 220 }));
    act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 220 }));
    expect(view.time).toBe(0);
    act(() => Simulate.pointerDown(plot, { button: 0, isPrimary: true, pointerId: 1, clientX: 220 }));
    expect(view.time).toBe(46);
    act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 320 }));
    expect(view.time).toBe(69);
    act(() => Simulate.pointerCancel(plot, { pointerId: 1 }));
    act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 420 }));
    expect(view.time).toBe(69);
    view.click('[data-iss-playback-toggle="thermal"]');
    view.change('iss-thermal-time', 69.1);
    expect(view.time).toBe(69.1);
    expect(view.playing).toBe(false);
    expect(view.host.querySelector('#iss-thermal-time').getAttribute('aria-valuetext')).toContain(inspect(run({}), 69.1).cabin.toFixed(2));
  });

  it('pauses when an event selects the current time and never restores active playback', () => {
    const view = mountThermal({ opsOrbitMinute: 57, opsThermalPlaying: true });
    expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="thermal"]');
    view.click('[data-thermal-event="eclipse"]');
    expect(view.time).toBe(57);
    expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="thermal"]');
    advance(.2);
    view.patch({ opsMode: 'integrated' });
    const time = view.time;
    advance(.3);
    expect(view.time).toBe(time);
    view.patch({ opsMode: 'thermal' });
    expect(view.playing).toBe(false);
  });

  it('uses the same actual cabin temperature in the lab, flight rule and integrated forecast', () => {
    const view = mountThermal({ opsRadiator: 30, opsCooling: 40, opsResearch: 95, opsOrbitMinute: 70 });
    const expected = inspect(run(restricted), 70), model = run(restricted);
    expect(view.read('cabin')).toBe(expected.cabin.toFixed(2) + ' °C');
    const rule = view.host.querySelector('[data-flight-rule="thermal"]').textContent;
    expect(rule).toContain(model.minCabin.toFixed(1) + '–' + model.maxCabin.toFixed(1));
    expect(rule).toContain('ORBIT RANGE');
    view.patch({ opsMode: 'integrated' });
    expect(view.host.querySelector('#iss-orbit-readout').textContent).toContain('Thermal ' + margin(expected.cabin).toFixed(0) + '%');
  });
});
