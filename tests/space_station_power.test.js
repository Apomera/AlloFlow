import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberFn = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
const modelFn = source.slice(source.indexOf('  function issPowerState('), source.indexOf('  var _issRefOrbit'));
const power = new Function(numberFn + modelFn + '\nreturn issPowerState;')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act, Simulate } = require(resolve(modules, 'react-dom/test-utils'));

describe('space station finite-capacity power model', () => {
  it('rejects sunlight when full and starts discharging immediately at eclipse', () => {
    const settings = { battery: 100, generation: 160, load: 90 };
    const full = power(settings, 56.99), entry = power(settings, 57), end = power(settings, 92);
    expect(full.storedKWh).toBe(210);
    expect(full.chargeKW).toBe(0);
    expect(full.curtailedKW).toBe(70);
    expect(entry.solarKW).toBe(0);
    expect(entry.dischargeKW).toBe(90);
    expect(entry.storedRateKW).toBeCloseTo(-90 / .95, 12);
    expect(end.storedKWh).toBeCloseTo(210 - 90 * 35 / 60 / .95, 12);
    expect(end.curtailedKWh).toBeCloseTo(70 * 57 / 60, 12);
    expect(end.lossKWh).toBeCloseTo(90 * 35 / 60 * (1 / .95 - 1), 12);
  });

  it('charges only the surplus and accounts for round-trip losses', () => {
    const s = { battery: 0, generation: 100, load: 50, capacity: 210 };
    const entry = power(s, 57), end = power(s, 92);
    expect(entry.storedKWh).toBeCloseTo(50 * 57 / 60 * .95, 12);
    expect(end.storedKWh).toBeCloseTo(entry.storedKWh - 50 * 35 / 60 / .95, 12);
    expect(end.lossKWh).toBeCloseTo(50 * 57 / 60 * .05 + 50 * 35 / 60 * (1 / .95 - 1), 12);
    expect(end.unservedKWh).toBe(0);
  });

  it.each([
    { generation: 0, load: 100, battery: 20 },
    { generation: 60, load: 100, battery: 15 },
    { generation: 160, load: 100, battery: 0, capacity: 20 },
  ])('stops discharge at the exact empty event and records unmet demand: %j', settings => {
    const end = power(settings, 92), empty = power(settings, end.emptyMinute);
    expect(end.emptyMinute).toBeGreaterThan(0);
    expect(empty.storedKWh).toBeCloseTo(0, 10);
    expect(empty.dischargeKW).toBe(0);
    expect(empty.unservedKW).toBeGreaterThan(0);
    expect(end.percent).toBe(0);
    expect(end.unservedKWh).toBeGreaterThan(0);
    expect(end.servedKWh + end.unservedKWh).toBeCloseTo(end.requestedKWh, 10);
  });

  it('keeps a nominal steady orbit above reserve without imaginary storage beyond full', () => {
    const first = power({}, 92), next = power({ battery: first.percent }, 92);
    expect(first.fullMinute).toBeLessThan(57);
    expect(first.percent).toBeLessThan(76);
    expect(first.minimumPercent).toBeGreaterThan(25);
    expect(first.unservedKWh).toBe(0);
    expect(first.curtailedKWh).toBeGreaterThan(0);
    expect(next.percent).toBeCloseTo(first.percent, 11);
    expect(next.minimumPercent).toBeGreaterThan(25);
    expect(next.unservedKWh).toBe(0);
  });

  it.each([0, 10, 57, 80, 92])('balances all energy stores and flows at minute %s across varied setups', minute => {
    for (const generation of [0, 80, 160, 320]) for (const battery of [0, 15, 76, 100]) for (const eclipse of [20, 35, 45]) {
      const state = power({ generation, battery, eclipse }, minute);
      expect(state.startKWh + state.generatedKWh).toBeCloseTo(state.storedKWh + state.servedKWh + state.lossKWh + state.curtailedKWh, 9);
      expect(state.servedKWh + state.unservedKWh).toBeCloseTo(state.requestedKWh, 9);
      expect(state.storedKWh).toBeGreaterThanOrEqual(0);
      expect(state.storedKWh).toBeLessThanOrEqual(state.capacity + 1e-10);
      expect(state.solarKW + state.dischargeKW + state.unservedKW).toBeCloseTo(state.loadKW + state.chargeKW + state.curtailedKW, 10);
    }
  });

  it('matches the derivative of stored energy to instantaneous battery power', () => {
    for (const battery of [10, 76, 100]) for (const minute of [1, 30, 56, 58, 75, 91]) {
      const dt = 1e-5;
      const state = power({ battery }, minute);
      expect((power({ battery }, minute + dt).storedKWh - power({ battery }, minute - dt).storedKWh) / (2 * dt) * 60).toBeCloseTo(state.storedRateKW, 6);
    }
  });

  it('keeps stored energy continuous across full, eclipse, and empty boundaries', () => {
    for (const settings of [{}, { generation: 60, load: 100, battery: 15 }]) {
      const end = power(settings, 92);
      for (const minute of [end.fullMinute, end.sunlightMinutes, end.emptyMinute].filter(value => value !== null)) {
        expect(power(settings, minute - 1e-8).storedKWh).toBeCloseTo(power(settings, minute + 1e-8).storedKWh, 6);
      }
    }
  });

  it('compares lossless storage with the same capacity and no invented current', () => {
    const ideal = power({ chargeEfficiency: 1, dischargeEfficiency: 1 }, 92);
    expect(ideal.lossKWh).toBe(0);
    expect(ideal.percent).toBeGreaterThan(power({}, 92).percent);
    const balanced = power({ generation: 0, load: 0, battery: 0 }, 92);
    for (const field of ['chargeKW','dischargeKW','unservedKW','lossKW','storedRateKW']) expect(balanced[field]).toBe(0);
    expect(balanced.emptyMinute).toBeNull();
  });

  it('bounds malformed restored settings and exposes the true minimum reserve', () => {
    for (const value of [Infinity, NaN, 'broken', null]) {
      const result = power({ generation: value, load: value, battery: value, capacity: value, eclipse: value }, value);
      for (const [key, number] of Object.entries(result)) if (typeof number === 'number') expect(Number.isFinite(number), key).toBe(true);
    }
    expect(power({ battery: -100 }, 0).percent).toBe(0);
    expect(power({ battery: 200 }, 0).percent).toBe(100);
    expect(power({}, 1000).minute).toBe(92);
    expect(power({ battery: 20, load: 70 }, 92).minimumPercent).toBe(20);
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
function mountPower(seed = {}) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  cleanups.push(() => {
    try {
      // jsdom 29 retains sheets removed with a subtree. Detaching each style
      // first prevents thousands of rules accumulating across mounted trials.
      host.querySelectorAll('style').forEach(style => style.remove());
      act(() => root.unmount());
    } finally {
      host.remove();
    }
  });
  let data, setData;
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'operations', opsMode: 'power', ...seed } });
    data = toolData.spaceStation; setData = setToolData;
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  // Match the main station harness: jsdom/css-tree formats unused validation
  // error stacks while parsing this tool's large stylesheet. Skip stack
  // capture only during the initial render and restore it even if render fails.
  const stackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 0;
  try { act(() => root.render(React.createElement(Harness))); }
  finally { Error.stackTraceLimit = stackTraceLimit; }
  return {
    host,
    get data() { return data; },
    get time() { return data.opsOrbitMinute || 0; },
    get playing() { return host.querySelector('[data-iss-playback-toggle="power"]').getAttribute('aria-pressed') === 'true'; },
    patch(patch) { act(() => setData(prev => ({ ...prev, spaceStation: { ...prev.spaceStation, ...patch } }))); },
    click(selector) { act(() => host.querySelector(selector).click()); },
    change(id, value) { act(() => Simulate.change(host.querySelector('#' + id), { target: { value: String(value) } })); },
    read(name) { return host.querySelector('[data-power-reading="' + name + '"]').textContent; },
  };
}
describe('space station interactive power lab', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
    cleanups = []; frames = new Map(); nextFrame = 0; clock = 0;
    vi.stubGlobal('requestAnimationFrame', callback => { const id = ++nextFrame; frames.set(id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => {
    try { cleanups.forEach(fn => fn()); }
    finally { vi.restoreAllMocks(); vi.unstubAllGlobals(); }
  });

  it('updates scene, flows and storage at exact eclipse/full events', () => {
    const view = mountPower();
    expect(view.host.querySelector('[data-power-phase]').getAttribute('data-power-phase')).toBe('sunlight');
    view.click('[data-power-event="full"]');
    expect(view.time).toBeCloseTo(power({}, 92).fullMinute, 10);
    expect(view.read('stored')).toContain('210.0 kWh');
    expect(view.host.querySelector('[data-power-storage-fill]').style.width).toBe('100%');
    expect(view.read('battery-flow')).toContain('0.0 kW');
    view.click('[data-power-event="eclipse"]');
    expect(view.time).toBe(57);
    expect(view.host.querySelector('[data-power-phase]').getAttribute('data-power-phase')).toBe('eclipse');
    expect(view.read('solar')).toContain('0.0 kW');
    expect(view.read('battery-flow')).toContain('Out of the battery');
    expect(view.read('battery-flow')).toContain('92.4 kW');
    view.click('[data-power-event="end"]');
    expect(view.read('stored')).toContain(power({}, 92).storedKWh.toFixed(1));
    expect(view.host.querySelector('[data-power-scene-reserve]').textContent).toBe(power({}, 92).percent.toFixed(1) + '%');
  });

  it('plays continuously through eclipse, pauses on setup changes, and preserves time on comparison changes', () => {
    const view = mountPower({ opsOrbitMinute: 56.5 });
    view.click('[data-iss-playback-toggle="power"]');
    advance(1);
    expect(view.time).toBeGreaterThan(57);
    expect(view.playing).toBe(true);
    const time = view.time;
    view.click('[data-power-reference]');
    expect(view.time).toBe(time);
    expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-power-reference-path]')).toBeNull();
    view.change('iss-power-angle', 45);
    expect(view.time).toBe(0);
    expect(view.playing).toBe(false);
    expect(view.host.querySelector('[data-power-arrays]').getAttribute('data-power-arrays')).toBe('45');
    advance(1);
    expect(view.time).toBe(0);
  });

  it('warns about an empty battery without continuing to supply imaginary power', () => {
    const view = mountPower();
    view.click('[data-power-preset="low"]');
    expect(view.time).toBe(0);
    expect(view.host.querySelector('[data-power-outcome]').getAttribute('data-power-outcome')).toBe('shortfall');
    view.click('[data-power-event="empty"]');
    expect(view.read('stored')).toContain('0.0 kWh');
    expect(view.read('load')).toContain('cannot be supplied');
    view.click('[data-power-event="end"]');
    expect(view.read('unserved')).not.toContain('0.0 kWh');
    expect(view.read('battery-flow')).toContain('0.0 kW');
    view.click('[data-power-preset="balanced"]');
    expect(view.time).toBe(0);
    expect(view.host.querySelector('[data-power-outcome]').getAttribute('data-power-outcome')).toBe('supplied');
  });

  it('shares battery results between the power lab and the integrated forecast', () => {
    const view = mountPower({ opsBattery: 100, opsOrbitMinute: 92 });
    const expected = power({ battery: 100 }, 92);
    expect(view.read('stored')).toContain(expected.storedKWh.toFixed(1));
    expect(view.host.querySelector('[data-flight-rule="power"]').textContent).toContain(expected.percent.toFixed(0) + '%');
    view.patch({ opsMode: 'integrated' });
    expect(view.host.querySelector('#iss-orbit-readout').textContent).toContain('Battery ' + expected.percent.toFixed(0) + '%');
    expect(view.host.querySelector('[data-iss-orbit-forecast] svg').getAttribute('aria-label')).toContain('battery is ' + expected.percent.toFixed(0));
  });

  async function openReservePlanner(view, kind = 'reserve') {
    const details = view.host.querySelector('[data-power-' + kind + '-plan]');
    await act(async () => {
      const toggled = new Promise(resolve => details.addEventListener('toggle', resolve, { once: true }));
      details.querySelector('summary').click();
      await toggled;
    });
    return details;
  }

  it('opens the research budget from a failed alignment forecast and applies only the selected workload', async () => {
    const view = mountPower({ opsCrew: 7, opsResearch: 100, opsEclipse: 45, opsBattery: 35, opsArrayAngle: 90 });
    view.click('[data-ops-lab-record]');
    view.patch({ opsOrbitMinute: 41, opsPrediction: 'Keep the eclipse and array angle fixed.' });
    view.click('[data-iss-playback-toggle="power"]');
    const before = JSON.parse(JSON.stringify(view.data));
    const alignment = await openReservePlanner(view, 'alignment');
    const research = view.host.querySelector('[data-power-research-plan]');
    expect(research.open).toBe(false);
    expect(alignment.querySelector('[data-alignment-apply]')).toBeNull();
    await act(async () => {
      const opened = new Promise(resolve => research.addEventListener('toggle', resolve, { once: true }));
      alignment.querySelector('button').click();
      await opened;
    });
    expect(document.activeElement).toBe(research.querySelector('summary'));
    expect(view.playing).toBe(true);
    expect(view.data).toEqual(before);
    expect(research.querySelector('[data-research-recommended]').dataset.research).toBe('55');
    expect(research.querySelector('[data-research-higher]').dataset.research).toBe('60');
    expect(research.querySelector('[data-research-recommended]').textContent).toContain('> 25.0%');
    view.click('[data-research-apply]');
    advance(.1);
    expect(document.activeElement.id).toBe('iss-research-result-title');
    expect(view.data.opsResearch).toBe(55);
    expect(view.time).toBe(0);
    expect(view.playing).toBe(false);
    for (const field of ['opsCrew', 'opsArrayAngle', 'opsBattery', 'opsEclipse', 'opsTrials', 'opsPrediction']) {
      expect(view.data[field]).toEqual(before[field]);
    }
    expect(research.querySelector('[role="status"]').textContent).toContain('55% research');
    expect(research.querySelector('[data-research-apply]').disabled).toBe(true);
    expect(alignment.querySelector('[data-alignment-recommended]')).toBeTruthy();
    view.change('iss-power-battery', 26);
    expect(research.querySelector('[role="status"]')).toBeNull();
    expect(research.querySelector('[data-research-apply]')).toBeNull();
    expect(research.textContent).toContain('79.2 kW');
    view.change('iss-power-battery', 24);
    expect(research.textContent).toContain('below 25% at minute zero');
    expect(alignment.querySelector('button')).toBeNull();
  });

  it('preserves fractional working research and allows a recommendation of zero', async () => {
    const view = mountPower({ opsCrew: 7, opsResearch: 55.001, opsArrayAngle: 90, opsEclipse: 45, opsBattery: 35 });
    const details = await openReservePlanner(view, 'research');
    expect(details.querySelector('[data-research-current]').textContent).toContain('> 55.00%');
    expect(view.data.opsResearch).toBe(55.001);
    view.patch({ opsCrew: 6, opsBattery: 25 });
    expect(details.querySelector('[data-research-recommended]').dataset.research).toBe('0');
    view.click('[data-research-apply]');
    expect(view.data.opsResearch).toBe(0);
    view.patch({ opsCrew: 7, opsBattery: 45 });
    expect(details.querySelector('[data-research-recommended]').dataset.research).toBe('100');
    expect(details.querySelector('[data-research-higher]')).toBeNull();
  });

  it('previews adjacent array angles and applies one without changing the charge or notebook', async () => {
    const view = mountPower({ opsCrew: 11, opsResearch: 100, opsArrayAngle: 7.999, opsEclipse: 45, opsBattery: 100 });
    view.click('[data-ops-lab-record]');
    view.patch({ opsOrbitMinute: 18.5, opsPrediction: 'Does 7° protect the reserve?', opsLoadedTrial: view.data.opsTrials[0].id });
    view.click('[data-iss-playback-toggle="power"]');
    const before = JSON.parse(JSON.stringify(view.data));
    const details = await openReservePlanner(view, 'alignment');
    expect(view.host.querySelector('[data-power-reserve-plan]').open).toBe(false);
    expect(view.data).toEqual(before);
    expect(view.playing).toBe(true);
    expect(details.querySelector('[data-alignment-current]').textContent).toMatch(/< 8\.00°/);
    expect(details.querySelector('[data-alignment-lower]').textContent).toContain('< 25.0%');
    expect(details.querySelector('[data-alignment-recommended]').dataset.angle).toBe('8');
    const chargePanel = await openReservePlanner(view);
    const chargeForecast = () => Number(chargePanel.querySelector('[data-reserve-current]').dataset.minPercent);
    const beforeMinimum = chargeForecast();
    view.click('[data-alignment-apply]');
    expect(view.data.opsArrayAngle).toBe(8);
    expect(view.data.opsBattery).toBe(100);
    expect(view.data.opsOrbitMinute).toBe(0);
    expect(view.playing).toBe(false);
    expect(view.data.opsLoadedTrial).toBeNull();
    expect(view.data.opsPrediction).toBe(before.opsPrediction);
    expect(view.data.opsTrials).toEqual(before.opsTrials);
    expect(chargePanel.open).toBe(true);
    expect(chargeForecast()).toBeGreaterThan(beforeMinimum);
    const expectedChanges = new Set(['opsArrayAngle', 'opsOrbitMinute', 'opsScenario', 'opsInspection', 'opsLoadedTrial']);
    for (const token of ['opsPowerSeekToken', 'opsIntegratedSeekToken', 'opsAirSeekToken', 'opsThermalSeekToken', 'opsAttitudeSeekToken']) {
      expect(view.data[token]).toBe(!before[token]);
      expectedChanges.add(token);
    }
    for (const key of new Set([...Object.keys(before), ...Object.keys(view.data)])) {
      if (!expectedChanges.has(key)) expect(view.data[key]).toEqual(before[key]);
    }
    advance(.1);
    expect(document.activeElement.id).toBe('iss-alignment-result-title');
    expect(details.open).toBe(true);
    expect(details.querySelector('[data-alignment-apply-status]').textContent).toContain('8°');
    expect(details.querySelector('[data-alignment-apply]').disabled).toBe(true);
    const recommendedCharge = Number(chargePanel.querySelector('[data-reserve-recommended]').dataset.startPercent);
    view.click('[data-reserve-apply]');
    expect(view.data.opsBattery).toBe(recommendedCharge);
    expect(details.querySelector('[data-alignment-apply-status]')).toBeNull();
    view.change('iss-power-battery', 24);
    expect(details.querySelector('[data-alignment-apply-status]')).toBeNull();
    expect(details.querySelector('[data-alignment-apply]')).toBeNull();
    expect(details.querySelector('[data-alignment-maximum]').dataset.angle).toBe('90');
    expect(details.textContent).toContain('below 25% at minute zero');
    view.change('iss-power-battery', 25);
    expect(details.querySelector('[data-alignment-apply]')).toBeNull();
    expect(Number(details.querySelector('[data-alignment-maximum]').dataset.minPercent)).toBeLessThan(25);
    expect(details.textContent).toContain('higher starting charge or less research demand');
    expect(details.textContent).not.toContain('below 25% at minute zero');
    view.change('iss-power-battery', 100);
    view.change('iss-power-load', 0);
    expect(details.querySelector('[data-alignment-recommended]').dataset.angle).toBe('0');
    expect(details.querySelector('[data-alignment-lower]')).toBeNull();
    view.click('[data-alignment-apply]');
    expect(view.data.opsArrayAngle).toBe(0);
  });

  it('applies the reserve planner’s lowest passing start and pauses the working orbit while preserving recorded evidence', async () => {
    const view = mountPower({ opsCrew: 7, opsResearch: 60, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 12,
      opsWaterDay: 13, opsPressureMinute: 4.5, opsDebrisTime: 42, opsPrediction: 'Prediction for the recorded trial.' });
    view.click('[data-ops-lab-record]');
    const saved = JSON.parse(JSON.stringify(view.data.opsTrials));
    saved[0].reflection = 'Earlier evidence about the low starting reserve.';
    view.patch({ opsTrials: saved, opsPrediction: 'Keep my next-trial draft.', opsOrbitMinute: 63.75,
      opsLoadedTrial: saved[0].id, opsInspection: { source: 'rule', id: 'power', minute: 0, setup: JSON.stringify(saved[0].setup) } });
    const details = view.host.querySelector('[data-power-reserve-plan]');
    expect(details.tagName).toBe('DETAILS');
    expect(details.open).toBe(false);
    await openReservePlanner(view);
    expect(details.open).toBe(true);
    expect(details.querySelector('[data-reserve-state="feasible"]')).toBeTruthy();
    const current = details.querySelector('[data-reserve-current]');
    const recommended = details.querySelector('[data-reserve-recommended]');
    const lower = details.querySelector('[data-reserve-lower]');
    expect(Number(current.dataset.startPercent)).toBe(12);
    expect(Number(current.dataset.minPercent)).toBeLessThan(25);
    const selectedStart = Number(recommended.dataset.startPercent);
    expect(Number.isInteger(selectedStart)).toBe(true);
    expect(Number(recommended.dataset.minPercent)).toBeGreaterThanOrEqual(25);
    expect(Number(lower.dataset.startPercent)).toBe(selectedStart - 1);
    expect(Number(lower.dataset.minPercent)).toBeLessThan(25);
    expect(details.querySelector('[data-reserve-apply]').disabled).toBe(false);
    view.click('[data-iss-playback-toggle="power"]');
    expect(view.playing).toBe(true);
    const before = JSON.parse(JSON.stringify(view.data));
    view.click('[data-reserve-apply]');
    expect(view.data.opsBattery).toBe(selectedStart);
    expect(view.data.opsScenario).toBe('custom');
    expect(view.time).toBe(0);
    expect(view.playing).toBe(false);
    expect(view.data.opsInspection).toBeNull();
    expect(view.data.opsLoadedTrial).toBeNull();
    for (const key of Object.keys(saved[0].setup).filter(key => key !== 'opsBattery')) expect(view.data[key]).toBe(before[key]);
    for (const key of ['opsIntegratedSeekToken', 'opsPowerSeekToken', 'opsAirSeekToken', 'opsThermalSeekToken', 'opsAttitudeSeekToken']) {
      expect(view.data[key]).toBe(!before[key]);
    }
    for (const key of ['opsTrials', 'opsPrediction', 'opsTrialSelected', 'opsTrialCompare', 'opsWaterDay', 'opsPressureMinute', 'opsDebrisTime']) {
      expect(view.data[key]).toEqual(before[key]);
    }
    expect(details.querySelector('[data-reserve-apply]').disabled).toBe(true);
    expect(details.querySelector('[data-reserve-apply-status]').getAttribute('role')).toBe('status');
    expect(details.querySelector('[data-reserve-apply-status]').textContent).toContain(selectedStart + '%');
    advance(.3);
    expect(view.time).toBe(0);
  });

  it('recomputes the reserve planner after load, array and eclipse changes and guards the guided trial setup', async () => {
    const view = mountPower({ opsCrew: 11, opsResearch: 100, opsArrayAngle: 0, opsEclipse: 45, opsBattery: 100 });
    const details = await openReservePlanner(view);
    expect(details.querySelector('[data-reserve-state="unreachable"]')).toBeTruthy();
    expect(Number(details.querySelector('[data-reserve-full]').dataset.startPercent)).toBe(100);
    expect(Number(details.querySelector('[data-reserve-full]').dataset.minPercent)).toBeLessThan(25);
    expect(details.querySelector('[data-reserve-apply]')).toBeNull();
    const recommendation = () => Number(details.querySelector('[data-reserve-recommended]').dataset.startPercent);
    view.change('iss-power-load', 0);
    expect(details.querySelector('[data-reserve-state="feasible"]')).toBeTruthy();
    expect(details.querySelector('[data-reserve-full]')).toBeNull();
    const darkStart = recommendation();
    view.change('iss-power-angle', 90);
    const collectingStart = recommendation();
    expect(collectingStart).toBeLessThan(darkStart);
    view.change('iss-power-eclipse', 20);
    expect(recommendation()).toBeLessThan(collectingStart);
    expect(view.data.opsBattery).toBe(100);
    view.click('[data-eclipse-guide-start]');
    expect(view.host.querySelector('[data-eclipse-guide]').dataset.step).toBe('baseline');
    expect(details.querySelector('[data-reserve-apply]').disabled).toBe(true);
    view.change('iss-eclipse-guide-prediction', 'Longer eclipse will drain more stored energy.');
    view.click('[data-eclipse-guide-record-a]');
    expect(view.host.querySelector('[data-eclipse-guide]').dataset.step).toBe('change');
    expect(details.querySelector('[data-reserve-apply]').disabled).toBe(true);
    view.click('[data-eclipse-guide-change]');
    expect(view.host.querySelector('[data-eclipse-guide]').dataset.step).toBe('comparison');
    expect(details.querySelector('[data-reserve-apply]').disabled).toBe(true);
    const guideSetup = JSON.parse(JSON.stringify(view.data));
    view.click('[data-reserve-apply]');
    expect(view.data).toEqual(guideSetup);
    view.click('[data-eclipse-guide-exit]');
    expect(details.querySelector('[data-reserve-apply]').disabled).toBe(false);
  });

  it('supports captured pointer inspection, cancellation, and precise keyboard-equivalent seeking', () => {
    const view = mountPower();
    const plot = view.host.querySelector('[data-power-plot]');
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ left: 20, width: 400 });
    let captured = false;
    plot.setPointerCapture = () => { captured = true; };
    plot.hasPointerCapture = () => captured;
    plot.releasePointerCapture = () => { captured = false; };
    act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 220 }));
    expect(view.time).toBe(0);
    act(() => Simulate.pointerDown(plot, { button: 0, isPrimary: true, pointerId: 1, clientX: 220 }));
    expect(view.time).toBe(46);
    act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 320 }));
    expect(view.time).toBe(69);
    act(() => Simulate.pointerCancel(plot, { pointerId: 1 }));
    act(() => Simulate.pointerMove(plot, { pointerId: 1, clientX: 420 }));
    expect(view.time).toBe(69);
    view.click('[data-iss-playback-toggle="power"]');
    view.change('iss-power-time', 69.1);
    expect(view.time).toBe(69.1);
    expect(view.playing).toBe(false);
    expect(view.host.querySelector('#iss-power-time').getAttribute('aria-valuetext')).toContain('eclipse');
  });

  it('pauses even when an inspection selects the same timestamp as playback', () => {
    const view = mountPower({ opsOrbitMinute: 57 });
    view.click('[data-iss-playback-toggle="power"]');
    expect(view.playing).toBe(true);
    view.click('[data-power-event="eclipse"]');
    expect(view.time).toBe(57);
    expect(view.playing).toBe(false);
  });

  it('does not restore playback and stops the clock when leaving the power view', () => {
    const view = mountPower({ opsOrbitMinute: 20, opsPowerPlaying: true });
    expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="power"]');
    advance(.5);
    view.patch({ opsMode: 'integrated' });
    const time = view.time;
    advance(1);
    expect(view.time).toBe(time);
    view.patch({ opsMode: 'power' });
    expect(view.playing).toBe(false);
  });
});
