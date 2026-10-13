import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberFn = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
const modelFn = source.slice(source.indexOf('  function issPowerState('), source.indexOf('  var _issRefOrbit'));
const { run, inspect, power } = new Function(numberFn + modelFn + '\nreturn {run:issAirRun,inspect:issAirInspect,power:issPowerState};')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const { act } = React;
const recovery = { flow: 3, restore: true, restoreMinute: 45 };

describe('space station two-volume air physics', () => {
  it.each([0, 13.75, 45, 50.2, 57, 92])('conserves total and individual-zone CO₂ at minute %s', minute => {
    for (const options of [{}, { flow: 0, scrub: 0 }, { flow: 3 }, recovery, { ...recovery, activity: 3 }, { power: { generation: 0, battery: 5 } }]) {
      const model = run(options), v = inspect(model, minute), c = model.config;
      expect(v.initialGrams + v.exhaledGrams - v.removedGrams).toBeCloseTo(v.localGrams + v.cabinGrams, 8);
      const localInitial = c.startPpm * c.gramsPerPpmM3 * c.localVolume;
      const cabinInitial = c.startPpm * c.gramsPerPpmM3 * c.cabinVolume;
      expect(localInitial + .7 * c.activity * minute - v.transferredGrams).toBeCloseTo(v.localGrams, 8);
      expect(cabinInitial + .7 * (c.crew - 1) * minute + v.transferredGrams - v.removedGrams).toBeCloseTo(v.cabinGrams, 8);
    }
  });

  it('reduces to separate linear source accumulation with no exchange or removal', () => {
    const model = run({ flow: 0, scrub: 0, activity: 3, startPpm: 0 });
    for (const minute of [0, 15.5, 92]) {
      const v = inspect(model, minute);
      expect(v.localGrams).toBeCloseTo(42 / 60 * 3 * minute, 9);
      expect(v.cabinGrams).toBeCloseTo(42 / 60 * 6 * minute, 9);
      expect(v.removedGrams).toBe(0);
      expect(v.transferredGrams).toBe(0);
      const localMoles = v.localGrams / 44.01;
      const totalMoles = 101325 * 12 / (8.314462618 * 295.15);
      expect(v.localPpm).toBeCloseTo(localMoles / totalMoles * 1e6, 9);
    }
  });

  it('mixes without destroying CO₂ and uses volume weighting for the average', () => {
    const isolated = inspect(run({ flow: 0, scrub: 0 }), 92);
    const mixed = inspect(run({ flow: 180, scrub: 0 }), 92);
    expect(mixed.localPpm).toBeLessThan(isolated.localPpm);
    expect(mixed.cabinPpm).toBeGreaterThan(isolated.cabinPpm);
    expect(mixed.localGrams + mixed.cabinGrams).toBeCloseTo(isolated.localGrams + isolated.cabinGrams, 8);
    expect(mixed.averagePpm).toBeCloseTo((mixed.localPpm * 12 + mixed.cabinPpm * 388) / 400, 10);
    expect(mixed.averagePpm).not.toBeCloseTo((mixed.localPpm + mixed.cabinPpm) / 2, 1);
  });

  it('reveals a local pocket that a cabin sensor and average both miss', () => {
    const v = inspect(run({ flow: 3 }), 92);
    expect(v.localPpm).toBeGreaterThan(5000);
    expect(v.cabinPpm).toBeLessThan(2700);
    expect(v.averagePpm).toBeLessThan(2700);
    expect(v.removalRate).toBeGreaterThan(0);
    expect(inspect(run({ flow: 3, scrub: 100 }), 92).localPpm).toBeGreaterThan(4900);
    expect(inspect(run({ flow: 90 }), 92).localPpm).toBeLessThan(3000);
  });

  it('matches the exchange/removal differential equations and numerical derivatives', () => {
    const model = run(recovery), epsilon = 1e-4;
    for (const minute of [12.3, 44, 45.1, 78]) {
      const now = inspect(model, minute), before = inspect(model, minute - epsilon), after = inspect(model, minute + epsilon);
      expect(now.transferRate).toBeCloseTo(now.flow / 60 * (now.localGrams / 12 - now.cabinGrams / 388), 12);
      expect(now.removalRate).toBeCloseTo(70 * .88 / 60 * now.cabinGrams / 388, 12);
      expect((after.localPpm - before.localPpm) / (2 * epsilon)).toBeCloseTo(now.localRate, 3);
      expect((after.cabinPpm - before.cabinPpm) / (2 * epsilon)).toBeCloseTo(now.cabinRate, 5);
    }
  });

  it('keeps concentrations continuous when restored airflow changes their rates', () => {
    const model = run(recovery), before = inspect(model, 45 - 1e-8), at = inspect(model, 45), later = inspect(model, 50);
    expect(before.flow).toBe(3);
    expect(at.flow).toBe(90);
    expect(before.localPpm).toBeCloseTo(at.localPpm, 5);
    expect(before.cabinPpm).toBeCloseTo(at.cabinPpm, 6);
    expect(before.removedGrams).toBeCloseTo(at.removedGrams, 6);
    expect(before.localRate).toBeGreaterThan(0);
    expect(at.localRate).toBeLessThan(0);
    expect(later.localPpm).toBeLessThan(at.localPpm);
    expect(later.cabinPpm).toBeGreaterThan(at.cabinPpm);
    expect(at.circulatedM3).toBeCloseTo(3 * 45 / 60, 10);
    expect(later.circulatedM3).toBeCloseTo(3 * 45 / 60 + 90 * 5 / 60, 10);
    expect(model.peakMinute).toBe(45);
    expect(model.peakPpm).toBeCloseTo(at.localPpm, 8);
    expect(model.firstLimitMinute).toBeNull();
    const late = run({ ...recovery, restoreMinute: 60 });
    expect(late.peakPpm).toBeGreaterThan(4000);
    expect(inspect(late, 92).localPpm).toBeLessThan(3000);
  });

  it('resolves comparison-line crossings and includes exact recovery boundaries', () => {
    const model = run({ flow: 3 }), t = model.firstLimitMinute;
    expect(t).toBeGreaterThan(48);
    expect(t).toBeLessThan(49);
    expect(inspect(model, t).localPpm).toBeCloseTo(4000, 6);
    expect(inspect(model, t - .01).localPpm).toBeLessThan(4000);
    expect(inspect(model, t + .01).localPpm).toBeGreaterThan(4000);
    expect(run({ startPpm: 4500 }).firstLimitMinute).toBe(0);
    expect(run({ flow: 120, restore: true }).restoreMinute).toBeNull();
    expect(run({ ...recovery, restoreMinute: 37.3 }).samples.some(v => v.minute === 37.3)).toBe(true);
  });

  it('stops fans and scrubbing at total power loss while respiration continues', () => {
    const settings = { generation: 0, load: 100, battery: 5 };
    const model = run({ ...recovery, restoreMinute: 1, power: settings }), empty = power(settings, 92).emptyMinute;
    const before = inspect(model, empty - 1e-8), after = inspect(model, empty + 1e-8);
    expect(before.flow).toBe(90);
    expect(after.flow).toBe(0);
    expect(after.removalRate).toBe(0);
    expect(after.sourceRate).toBeCloseTo(4.9, 12);
    expect(before.localPpm).toBeCloseTo(after.localPpm, 5);
    expect(inspect(model, 92).removedGrams).toBeCloseTo(after.removedGrams, 8);
    expect(inspect(model, 92).circulatedM3).toBeCloseTo(after.circulatedM3, 8);
    const powerless = inspect(run({ power: { generation: 0, battery: 0 } }), 92);
    expect(powerless.removedGrams).toBe(0);
    expect(powerless.transferredGrams).toBe(0);
  });

  it('converges under smaller integration steps and never extracts negative gas', () => {
    for (const options of [{ flow: 180, scrub: 100, startPpm: 0 }, { ...recovery, restoreMinute: 33.2, activity: 3 }, { flow: 0, scrub: 100, startPpm: 8000 }]) {
      const model = run(options), fine = run({ ...options, stepSeconds: .5 });
      for (const t of [12.3, 33.2, 33.25, 45, 92]) {
        const a = inspect(model, t), b = inspect(fine, t);
        expect(a.localPpm).toBeCloseTo(b.localPpm, 3);
        expect(a.cabinPpm).toBeCloseTo(b.cabinPpm, 5);
        expect(a.removedGrams).toBeGreaterThanOrEqual(0);
        expect(a.localGrams).toBeGreaterThanOrEqual(0);
        expect(a.cabinGrams).toBeGreaterThanOrEqual(0);
        expect(a.removedGrams).toBeLessThanOrEqual(a.initialGrams + a.exhaledGrams + 1e-8);
      }
    }
  });

  it('bounds persisted values and makes backward inspection deterministic', () => {
    for (const value of [NaN, Infinity, 'broken', null, -10000, 10000]) {
      const model = run({ crew: value, flow: value, scrub: value, activity: value, startPpm: value, restore: true, restoreMinute: value });
      for (const t of [value, 0, 45, 92]) for (const [field, number] of Object.entries(inspect(model, t))) {
        if (typeof number === 'number') expect(Number.isFinite(number), field).toBe(true);
      }
    }
    const model = run(recovery), snapshot = JSON.stringify(model), end = inspect(model, 92);
    inspect(model, 0); inspect(model, 45); inspect(model, 10);
    expect(inspect(model, 92)).toEqual(end);
    expect(JSON.stringify(model)).toBe(snapshot);
  });
});

let cleanups, frames, nextFrame, clock;
function advance(seconds) {
  for (let i = 0; i <= Math.round(seconds * 50); i++) {
    if (i) clock += 20;
    const callbacks = [...frames.values()]; frames.clear();
    act(() => callbacks.forEach(callback => callback(clock)));
  }
}
function mountAir(seed = {}) {
  const cfg = window.StemLab._registry.spaceStation, host = document.createElement('div');
  document.body.appendChild(host); const root = createRoot(host); let data, setData;
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'operations', opsMode: 'eclss', ...seed } });
    data = toolData.spaceStation; setData = setToolData;
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  act(() => root.render(React.createElement(Harness)));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, get time() { return data.opsOrbitMinute || 0; }, get data() { return data; },
    get playing() { return host.querySelector('[data-iss-playback-toggle="air"]').getAttribute('aria-pressed') === 'true'; },
    patch(patch) { act(() => setData(prev => ({ ...prev, spaceStation: { ...prev.spaceStation, ...patch } }))); },
    click(selector) { act(() => host.querySelector(selector).click()); },
    change(id, value) { act(() => Simulate.change(host.querySelector('#' + id), { target: { value: String(value) } })); },
    read(name) { return host.querySelector('[data-air-reading="' + name + '"] strong').textContent; },
  };
}

describe('space station interactive cabin air lab', () => {
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

  it('shows separate live sensors and the orbit peak in the shared flight rule', () => {
    const view = mountAir(); view.click('[data-air-preset="pocket"]');
    expect(view.read('local')).toBe('2600 ppm');
    const rule = [...view.host.querySelectorAll('[data-flight-rule="eclss"]')].find(el => el.textContent.includes('Cabin CO₂'));
    expect(rule.textContent).toContain('5042 ppm');
    expect(rule.textContent).toContain('ORBIT PEAK');
    view.click('[data-air-event="limit"]');
    expect(view.time).toBeCloseTo(run({ flow: 3 }).firstLimitMinute, 7);
    expect(view.read('local')).toBe('4000 ppm');
    view.click('[data-air-event="end"]');
    expect(view.read('local')).toBe('5042 ppm');
    expect(view.read('cabin')).toBe('2539 ppm');
    expect(view.host.querySelector('[data-air-outcome]').getAttribute('data-air-outcome')).toBe('crossed');
  });

  it('restores the flow continuously and preserves the mass ledger', () => {
    const view = mountAir(); view.click('[data-air-preset="restore"]');
    view.click('[data-air-event="restore"]');
    expect(view.time).toBe(45);
    expect(view.read('flow')).toBe('90 m³/h');
    expect(view.read('local')).toBe('3914 ppm');
    expect(view.host.querySelector('[data-air-phase]').getAttribute('data-air-phase')).toBe('restored');
    view.click('[data-air-event="after"]');
    expect(view.time).toBe(50);
    expect(parseFloat(view.read('local'))).toBeLessThan(3914);
    const expected = inspect(run(recovery), 50);
    expect(view.read('removed')).toBe(expected.removedGrams.toFixed(1) + ' g');
    view.change('iss-air-restore-time', 60); view.click('[data-air-event="end"]');
    expect(parseFloat(view.read('local'))).toBeLessThan(3000);
    expect(view.host.querySelector('[data-air-outcome]').getAttribute('data-air-outcome')).toBe('crossed');
    expect(view.host.querySelector('[data-air-outcome]').textContent).toContain('does not erase the earlier peak');
  });

  it('preserves playback for reference/focus controls and pauses for every setup change', () => {
    const view = mountAir(); view.click('[data-air-preset="restore"]');
    view.click('[data-iss-playback-toggle="air"]'); advance(.4);
    expect(view.time).toBeGreaterThan(0); const time = view.time;
    view.click('[data-air-part="fan"]'); view.click('[data-air-reference]');
    expect(view.time).toBe(time); expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-air-reference-path]')).toBeNull();
    expect(view.host.querySelector('[data-air-part-note]').textContent).toContain('does not remove');
    for (const [id,value] of [['iss-air-flow',8],['iss-air-activity',2.25],['iss-air-start',3000],['iss-eclss-scrub',50],['iss-eclss-crew',9],['iss-air-restore-time',35]]) {
      view.click('[data-air-event="end"]'); view.change(id,value);
      expect(view.time).toBe(0); expect(view.playing).toBe(false);
    }
    expect(view.host.querySelector('#iss-air-activity').getAttribute('aria-valuetext')).toBe('2.25 × baseline');
    view.click('[data-air-restore-toggle]');
    expect(view.host.querySelector('#iss-air-restore-time').disabled || view.host.querySelector('#iss-air-restore-time').closest('fieldset').disabled).toBe(true);
    expect(view.host.querySelector('[data-air-event="restore"]').disabled).toBe(true);
  });

  it('supports captured graph inspection, cancellation and time-slider seeking', () => {
    const view = mountAir(), plot = view.host.querySelector('[data-air-plot]');
    vi.spyOn(plot,'getBoundingClientRect').mockReturnValue({left:20,width:400});
    let captured=false;
    plot.setPointerCapture=()=>{captured=true;}; plot.hasPointerCapture=()=>captured; plot.releasePointerCapture=()=>{captured=false;};
    act(()=>Simulate.pointerDown(plot,{button:0,isPrimary:true,pointerId:1,clientX:220})); expect(view.time).toBe(46);
    act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:320})); expect(view.time).toBe(69);
    act(()=>Simulate.pointerCancel(plot,{pointerId:1}));
    act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:420})); expect(view.time).toBe(69);
    view.click('[data-iss-playback-toggle="air"]'); view.change('iss-air-time',69.1);
    expect(view.time).toBe(69.1); expect(view.playing).toBe(false);
    expect(view.host.querySelector('#iss-air-time').getAttribute('aria-valuetext')).toContain('crew-zone CO₂');
  });

  it('never restores autoplay and pauses on an exact current-event seek or leaving the lab', () => {
    const view = mountAir({ opsAirFlow:3,opsAirRestore:true,opsAirRestoreMinute:45,opsOrbitMinute:45,opsAirPlaying:true });
    expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="air"]'); view.click('[data-air-event="restore"]');
    expect(view.time).toBe(45); expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="air"]'); advance(.2);
    view.patch({opsMode:'integrated'}); const time=view.time; advance(.2); expect(view.time).toBe(time);
    view.patch({opsMode:'eclss'}); expect(view.playing).toBe(false);
  });

  it('displays zero powered flow honestly and resets experiment fields with mission presets', () => {
    const view = mountAir({opsBattery:0,opsArrayAngle:0,opsAirRestore:true,opsAirStart:8000,opsAirFlow:0});
    expect(view.read('flow')).toBe('0 m³/h'); expect(view.read('removal')).toBe('0.0 g/h');
    expect(view.host.querySelector('[data-air-flow-markers]')).toBeNull();
    const stoppedFan = view.host.querySelector('[data-air-fan]').getAttribute('transform');
    view.click('[data-air-event="end"]');
    expect(view.host.querySelector('[data-air-fan]').getAttribute('transform')).toBe(stoppedFan);
    expect(view.host.querySelector('[data-air-scrubber]').getAttribute('data-air-scrubber')).toBe('off');
    view.click('[data-iss-scenario="nominal"]');
    expect(view.data.opsAirFlow).toBe(90); expect(view.data.opsAirStart).toBe(2600); expect(view.data.opsAirRestore).toBe(false);
    view.patch({opsMode:'eclss'}); expect(view.read('local')).toBe('2600 ppm');
    expect(view.host.textContent).toContain('5 / 5 FLIGHT RULES GO');
    view.click('[data-iss-scenario="fault"]'); expect(view.host.textContent).toContain('5 FLIGHT RULES TO CHECK');
  });
});
