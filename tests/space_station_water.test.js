import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberFn = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
const modelFn = source.slice(source.indexOf('  function issWaterConfig('), source.indexOf('  var _issRefOrbit'));
const { run, inspect } = new Function(numberFn + modelFn + '\nreturn {run:issWaterRun,inspect:issWaterInspect};')();
const outage = { cleanStart: 80, wasteStart: 10, outage: true };
const bridge = { ...outage, delivery: true };
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const { act } = React;

describe('space station finite water inventories', () => {
  it.each([0, 4.25, 10, 12, 16, 30])('conserves inventory and accounts separately for demand on day %s', day => {
    for (const setup of [{}, outage, bridge, { throughput: 0 }, { cleanStart: 0, wasteStart: 0 }, { cleanStart: 300, wasteStart: 100, delivery: true }]) {
      const model = run(setup), v = inspect(model, day);
      expect(v.initial + v.accepted).toBeCloseTo(v.clean + v.waste + v.loss + v.overflow, 8);
      expect(v.served + v.unmet).toBeCloseTo(model.config.crew * 3.8 * day, 8);
      expect(v.processed).toBeCloseTo(v.recovered + v.loss, 8);
      expect(v.clean).toBeCloseTo(model.config.cleanStart + v.accepted + v.recovered - v.served, 8);
      expect(v.waste).toBeCloseTo(model.config.wasteStart + v.served - v.processed - v.overflow, 8);
    }
  });

  it('matches linear use and the exact empty-tank time with treatment disabled', () => {
    const model = run({ cleanStart: 100, wasteStart: 0, throughput: 0, crew: 5 });
    expect(model.firstEmpty).toBeCloseTo(100 / 19, 10);
    expect(model.firstShortfall).toBeCloseTo(100 / 19, 10);
    expect(inspect(model, 2).clean).toBe(62);
    expect(inspect(model, 2).waste).toBe(38);
    expect(model.end.clean).toBe(0);
    expect(model.end.waste).toBe(100);
    expect(model.end.served).toBe(100);
    expect(model.end.unmet).toBe(470);
    expect(model.end.loss).toBe(0);
    expect(model.end.overflow).toBe(0);
  });

  it('cannot create water from empty stores and recovers only from available wastewater', () => {
    const empty = run({ cleanStart: 0, wasteStart: 0 });
    expect(empty.end.clean + empty.end.waste + empty.end.recovered).toBe(0);
    expect(empty.end.unmet).toBeCloseTo(798, 10);
    const wasteOnly = inspect(run({ cleanStart: 0, wasteStart: 25, throughput: 15 }), 1);
    expect(wasteOnly.clean).toBe(0);
    expect(wasteOnly.served).toBeCloseTo(14.7, 10);
    expect(wasteOnly.waste).toBeCloseTo(24.7, 10);
    expect(wasteOnly.loss).toBeCloseTo(.3, 10);
    expect(wasteOnly.unmet).toBeCloseTo(11.9, 10);
  });

  it('limits treatment by both throughput and available incoming wastewater', () => {
    const low = run({ cleanStart: 20, wasteStart: 25, throughput: 15 });
    expect(low.firstEmpty).toBeCloseTo(20 / (26.6 - 14.7), 10);
    expect(low.end.unmet).toBeCloseTo(337, 9);
    const drained = inspect(run({ wasteStart: 0, throughput: 60 }), 1);
    expect(drained.waste).toBe(0);
    expect(drained.processRate).toBeCloseTo(26.6, 10);
    expect(drained.returnRate).toBeCloseTo(26.6 * .98, 10);
    expect(drained.clean).toBeCloseTo(120 - .02 * 26.6, 10);
  });

  it('keeps inventories continuous at outage and repair, while flow changes immediately', () => {
    const model = run(outage);
    for (const day of [10, 16]) {
      const before = inspect(model, day - 1e-8), at = inspect(model, day);
      expect(before.clean).toBeCloseTo(at.clean, 5);
      expect(before.waste).toBeCloseTo(at.waste, 5);
      expect(before.loss).toBeCloseTo(at.loss, 5);
      expect(before.offline).not.toBe(at.offline);
    }
    expect(inspect(model, 10).processRate).toBe(0);
    expect(inspect(model, 16).processRate).toBe(36);
    expect(inspect(model, 16).unmet).toBeGreaterThan(75);
    expect(inspect(model, 30).unmet).toBeCloseTo(inspect(model, 16).unmet, 9);
    expect(model.end.clean).toBeGreaterThan(70);
    expect(model.firstShortfall).toBeGreaterThan(13);
    expect(model.firstShortfall).toBeLessThan(14);
  });

  it('distinguishes before and after unloading and rejects cargo beyond tank capacity', () => {
    const model = run({ cleanStart: 290, wasteStart: 0, throughput: 0, delivery: true, deliveryDay: 1, deliveryLitres: 100 });
    const before = inspect(model, 1, 'before'), after = inspect(model, 1);
    expect(before.clean).toBeCloseTo(263.4, 10);
    expect(before.accepted).toBe(0);
    expect(after.clean).toBe(300);
    expect(after.accepted).toBeCloseTo(36.6, 10);
    expect(after.rejected).toBeCloseTo(63.4, 10);
    expect(after.waste).toBe(before.waste);
    expect(after.loss).toBe(before.loss);
    expect(after.unmet).toBe(before.unmet);
    expect(after.accepted + after.rejected).toBe(100);
    expect(model.points.filter(point => point.day === 1).map(point => point.clean)).toEqual([before.clean, 300]);
  });

  it('throttles treatment at full clean storage without crediting rejected cargo', () => {
    const model = run({ cleanStart: 300, wasteStart: 100, delivery: true });
    expect(inspect(model, 0).processRate).toBeCloseTo(26.6 / .98, 10);
    expect(model.deliveryEvent.accepted).toBe(0);
    expect(model.deliveryEvent.rejected).toBe(100);
    expect(model.end.clean).toBe(300);
    expect(model.end.accepted).toBe(0);
    expect(model.end.overflow).toBe(0);
    expect(model.end.loss).toBeCloseTo(30 * 26.6 / .98 * .02, 9);
  });

  it('shows why bridging crew supply can still exceed wastewater capacity', () => {
    const noDelivery = run(outage), withDelivery = run(bridge);
    expect(noDelivery.end.unmet).toBeGreaterThan(75);
    expect(withDelivery.end.unmet).toBe(0);
    expect(withDelivery.end.overflow).toBeCloseTo(59.6, 9);
    expect(withDelivery.firstOverflow).toBeCloseTo(10 + 100 / 26.6, 10);
    expect(withDelivery.end.accepted).toBe(100);
    expect(inspect(noDelivery, 11)).toEqual(inspect(withDelivery, 11));
  });

  it('bounds stores across varied schedules, including simultaneous and tiny-inventory events', () => {
    let seed = 832;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
    const setups = [{ cleanStart: 1e-7, wasteStart: 0, throughput: 60 }, { ...bridge, outageStart: 12, deliveryDay: 12 }, { ...bridge, outageStart: 6, outageDays: 6, deliveryDay: 12 }, { ...outage, outageStart: 29, outageDays: 15 }];
    for (let i = 0; i < 200; i++) setups.push({ crew: 3 + 8 * random(), recovery: 70 + 29 * random(), cleanStart: 300 * random(), wasteStart: 100 * random(), throughput: 60 * random(), outage: true, outageStart: 29 * random(), outageDays: 1 + 14 * random(), delivery: true, deliveryDay: 1 + 28 * random(), deliveryLitres: 300 * random() });
    for (const setup of setups) {
      const model = run(setup);
      expect(model.end.day).toBe(30);
      for (const day of [0, 30 * random(), 30, ...model.points.map(point => point.day)]) {
        const v = inspect(model, day);
        expect(v.clean).toBeGreaterThanOrEqual(-1e-7); expect(v.clean).toBeLessThanOrEqual(300 + 1e-7);
        expect(v.waste).toBeGreaterThanOrEqual(-1e-7); expect(v.waste).toBeLessThanOrEqual(100 + 1e-7);
        expect(v.initial + v.accepted - v.clean - v.waste - v.loss - v.overflow).toBeCloseTo(0, 6);
        expect(v.served + v.unmet).toBeCloseTo(v.demand * day, 7);
      }
    }
  });

  it('sanitizes persisted values and supports deterministic backward inspection', () => {
    for (const value of [NaN, Infinity, null, 'broken', -1e6, 1e6]) {
      const model = run({ crew: value, recovery: value, cleanStart: value, wasteStart: value, throughput: value, outage: true, outageStart: value, outageDays: value, delivery: true, deliveryDay: value, deliveryLitres: value });
      for (const day of [value, 0, 12, 30]) for (const [field, number] of Object.entries(inspect(model, day))) {
        if (typeof number === 'number') expect(Number.isFinite(number), field).toBe(true);
      }
    }
    const model = run(bridge), snapshot = JSON.stringify(model), end = inspect(model, 30);
    inspect(model, 0); inspect(model, 12, 'before'); inspect(model, 12); inspect(model, 15);
    expect(inspect(model, 30)).toEqual(end); expect(JSON.stringify(model)).toBe(snapshot);
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
function mountWater(seed = {}) {
  const cfg = window.StemLab._registry.spaceStation, host = document.createElement('div');
  document.body.appendChild(host); const root = createRoot(host); let data, setData;
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'operations', opsMode: 'eclss', opsEclssLab: 'water', ...seed } });
    data = toolData.spaceStation; setData = setToolData;
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  act(() => root.render(React.createElement(Harness)));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, get time() { return data.opsWaterDay || 0; }, get data() { return data; },
    get playing() { return host.querySelector('[data-iss-playback-toggle="water"]').getAttribute('aria-pressed') === 'true'; },
    patch(patch) { act(() => setData(prev => ({ ...prev, spaceStation: { ...prev.spaceStation, ...patch } }))); },
    click(selector) { act(() => host.querySelector(selector).click()); },
    change(id, value) { act(() => Simulate.change(host.querySelector('#' + id), { target: { value: String(value) } })); },
    read(name) { return host.querySelector('[data-water-reading="' + name + '"] strong').textContent; },
  };
}

describe('space station interactive water lab', () => {
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

  it('shows live tank reserves and preserves the earlier shortage after repair', () => {
    const view = mountWater(); expect(view.read('clean')).toBe('120.0 L');
    view.click('[data-water-preset="outage"]'); view.click('[data-water-event="empty"]');
    expect(view.time).toBeCloseTo(run(outage).firstEmpty, 9); expect(view.read('clean')).toBe('0.0 L');
    expect(view.host.querySelector('[data-water-phase]').getAttribute('data-water-phase')).toBe('shortfall');
    const rotor = view.host.querySelector('[data-water-rotor]').getAttribute('transform');
    view.change('iss-water-time', 15); expect(view.host.querySelector('[data-water-rotor]').getAttribute('transform')).toBe(rotor);
    expect(view.host.querySelector('[data-water-flow="return"]')).toBeNull();
    view.click('[data-water-event="end"]'); expect(parseFloat(view.read('clean'))).toBeGreaterThan(75);
    expect(view.read('unmet')).toBe('75.1 L');
    expect(view.host.querySelector('[data-water-outcome]').getAttribute('data-water-outcome')).toBe('shortfall');
    expect(view.host.querySelector('[data-water-outcome]').textContent).toContain('do not erase earlier unmet demand');
  });

  it('inspects the delivery jump on both sides and keeps receipt and inventory in agreement', () => {
    const view = mountWater(); view.click('[data-water-preset="bridge"]'); view.click('[data-water-event="before"]');
    expect(view.time).toBe(12); expect(view.read('accepted')).toBe('0.0 L');
    const before = parseFloat(view.read('clean'));
    view.click('[data-water-event="after"]'); expect(parseFloat(view.read('clean'))).toBeCloseTo(before + 100, 8);
    expect(view.read('accepted')).toBe('100.0 L'); expect(view.time).toBe(12);
    view.click('[data-water-event="end"]'); expect(view.read('unmet')).toBe('0.0 L');
    expect(view.read('overflow')).toBe('59.6 L');
    expect(view.host.querySelector('[data-water-outcome]').getAttribute('data-water-outcome')).toBe('overflow');
  });

  it('retains playback for visual controls and restarts paused for every setup control', () => {
    const view = mountWater(); view.click('[data-water-preset="bridge"]');
    view.click('[data-iss-playback-toggle="water"]'); advance(.4); const day = view.time;
    expect(day).toBeGreaterThan(0); view.click('[data-water-part="processor"]'); view.click('[data-water-reference]');
    expect(view.time).toBe(day); expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-water-reference-path]')).toBeNull();
    expect(view.host.querySelector('[data-water-part-note]').textContent).toContain('without instantly clearing');
    for (const [id, value] of [['iss-water-clean',50],['iss-water-waste',40],['iss-water-throughput',20],['iss-water-recovery',95],['iss-water-crew',9],['iss-water-outage-start',7],['iss-water-outage-days',4],['iss-water-delivery-day',10],['iss-water-delivery-litres',150]]) {
      view.click('[data-water-event="end"]'); view.change(id,value);
      expect(view.time).toBe(0); expect(view.playing).toBe(false);
    }
    view.click('[data-water-outage-toggle]'); expect(view.host.querySelector('#iss-water-outage-start').closest('fieldset').disabled).toBe(true);
    view.click('[data-water-delivery-toggle]'); expect(view.host.querySelector('#iss-water-delivery-day').closest('fieldset').disabled).toBe(true);
    expect(view.host.querySelector('[data-water-event="before"]').disabled).toBe(true);
    expect(view.host.querySelector('[data-water-reference]').disabled).toBe(true);
  });

  it('supports graph capture, cancellation and keyboard-compatible slider inspection', () => {
    const view = mountWater(), plot = view.host.querySelector('[data-water-plot]');
    vi.spyOn(plot,'getBoundingClientRect').mockReturnValue({left:20,width:400});
    let captured=false; plot.setPointerCapture=()=>{captured=true;}; plot.hasPointerCapture=()=>captured; plot.releasePointerCapture=()=>{captured=false;};
    act(()=>Simulate.pointerDown(plot,{button:0,isPrimary:true,pointerId:1,clientX:220})); expect(view.time).toBe(15);
    act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:320})); expect(view.time).toBe(22.5);
    act(()=>Simulate.pointerCancel(plot,{pointerId:1}));
    act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:420})); expect(view.time).toBe(22.5);
    view.click('[data-iss-playback-toggle="water"]'); view.change('iss-water-time',22.6);
    expect(view.time).toBe(22.6); expect(view.playing).toBe(false);
    expect(view.host.querySelector('#iss-water-time').getAttribute('aria-valuetext')).toContain('clean water');
  });

  it('starts paused, pauses for same-time delivery inspection, and cancels when switching labs', () => {
    const view = mountWater({opsWaterDay:12,opsWaterDelivery:true,opsWaterPlaying:true});
    expect(view.playing).toBe(false); view.click('[data-iss-playback-toggle="water"]'); view.click('[data-water-event="before"]');
    expect(view.time).toBe(12); expect(view.playing).toBe(false); expect(view.read('accepted')).toBe('0.0 L');
    view.click('[data-iss-playback-toggle="water"]'); advance(.2);
    expect(view.read('accepted')).toBe('100.0 L');
    view.click('[data-eclss-lab="air"]'); const day=view.time; advance(.2); expect(view.time).toBe(day);
    expect(view.host.querySelector('[data-iss-air-lab]')).not.toBeNull();
    view.click('[data-open-water-lab]'); expect(view.playing).toBe(false);
    view.click('[data-iss-scenario="nominal"]'); view.patch({opsMode:'eclss',opsEclssLab:'water'});
    expect(view.time).toBe(0); expect(view.read('clean')).toBe('120.0 L'); expect(view.data.opsWaterDelivery).toBe(false);
  });

  it('routes the two life-support flight rules to their corresponding experiment', () => {
    const view = mountWater();
    const rules = [...view.host.querySelectorAll('[data-flight-rule="eclss"]')];
    act(()=>rules.find(node=>node.textContent.includes('Cabin CO₂')).click());
    expect(view.host.querySelector('[data-iss-air-lab]')).not.toBeNull();
    act(()=>rules.find(node=>node.textContent.includes('Water loop')).click());
    expect(view.host.querySelector('[data-iss-water-lab]')).not.toBeNull();
  });
});
