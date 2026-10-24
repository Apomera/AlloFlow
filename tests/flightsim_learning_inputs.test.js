import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, changeSaved;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const checks = () => [...host.querySelectorAll('input[type="checkbox"]')];
const range = label => host.querySelector('input[type="range"][aria-label="' + label + '"]');

async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'preflight', ...seed } });
    latest = data.flightSim;
    changeSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function moveRange(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
async function timers() { await act(async () => vi.advanceTimersByTime(40)); }

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School checklist continuity', () => {
  it('preserves multiple checkbox edits before React commits and restores them after remount', async () => {
    await mount({ keep: 'preserved' });
    const inputs = checks();
    await act(async () => { inputs[0].click(); inputs[1].click(); });
    expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true });
    expect(host.querySelector('progress').value).toBe(2);
    expect(latest.keep).toBe('preserved');
    await mount(structuredClone(latest));
    expect(checks().slice(0, 2).every(input => input.checked)).toBe(true);
  });
  it('applies repeated changes to the same item in order before React commits', async () => {
    await mount(); const input = checks()[0];
    await act(async () => { input.click(); input.click(); });
    expect(latest.preflightChecked).toEqual({});
    expect(host.querySelector('progress').value).toBe(0);
  });
  it('keeps a fresh review empty when a queued checkbox event follows reset', async () => {
    await mount({ preflightChecked: { 'Documents-0': true } });
    const input = checks()[1];
    await act(async () => { button('Start a new checklist review').click(); input.click(); });
    expect(latest.preflightChecked).toEqual({}); expect(latest.preflightOpen).toEqual({});
    expect(checks().every(item => !item.checked)).toBe(true);
  });
  it('preserves independent phase changes and repeated phase toggles before React commits', async () => {
    await mount(); const first = host.querySelector('#skyschool-pf-toggle-0'), second = host.querySelector('#skyschool-pf-toggle-1');
    await act(async () => { first.click(); second.click(); first.click(); });
    expect(latest.preflightOpen).toEqual({ Documents: true, [api.PREFLIGHT_CHECKLIST[1].phase]: false });
    expect(first.getAttribute('aria-expanded')).toBe('true'); expect(second.getAttribute('aria-expanded')).toBe('false');
  });
  it('finds the next unchecked item from live edits rather than the preceding render', async () => {
    await mount(); const inputs = checks(), next = button('Next unchecked ↓');
    next.focus();
    await act(async () => { inputs[0].click(); next.click(); });
    await timers();
    expect(document.activeElement).toBe(checks()[1]);
    expect(latest.preflightChecked).toEqual({ 'Documents-0': true });
  });
  it('cancels a queued checklist jump when a new review starts', async () => {
    await mount({ preflightChecked: { 'Documents-0': true } });
    const next = button('Next unchecked ↓'), reset = button('Start a new checklist review');
    await act(async () => { next.focus(); next.click(); reset.focus(); reset.click(); });
    await timers();
    expect(document.activeElement).toBe(reset); expect(latest.preflightChecked).toEqual({});
  });
  it('does not steal focus from a later learner action or a different activity', async () => {
    await mount(); const next = button('Next unchecked ↓'), other = checks()[3];
    await act(async () => { next.focus(); next.click(); other.focus(); });
    await timers(); expect(document.activeElement).toBe(other);
    await act(async () => { next.focus(); next.click(); changeSaved({ view: 'calculator' }); });
    await timers(); expect(document.activeElement.id).toBe('skyschool-calculator-title');
    expect(latest.view).toBe('calculator');
  });
  it('keeps only supported own boolean phase preferences', () => {
    const phase = api.PREFLIGHT_CHECKLIST[1].phase;
    const saved = Object.assign(Object.create({ Documents: false }), { [phase]: true, [api.PREFLIGHT_CHECKLIST[2].phase]: 'false', retired: true });
    expect(api.normalizeFlightPreflightOpen(saved)).toEqual({ [phase]: true });
    for (const value of [null, 'Exterior', ['Documents'], 1]) expect(api.normalizeFlightPreflightOpen(value)).toEqual({});
    expect(saved.retired).toBe(true);
  });
  it('preserves reviewed items and ignores queued edits after returning to the menu', async () => {
    await mount({ preflightChecked: { 'Documents-0': true }, keep: 'preserved' });
    const oldInput = checks()[1];
    await act(async () => { button('← Menu').click(); oldInput.click(); });
    expect(latest.view).toBe('menu'); expect(latest.preflightChecked).toEqual({ 'Documents-0': true });
    expect(latest.keep).toBe('preserved');
    await act(async () => changeSaved({ view: 'preflight' }));
    expect(host.querySelector('progress').value).toBe(1); expect(checks()[1].checked).toBe(false);
  });
  it('preserves a completed review when an old checkbox event follows trainer launch', async () => {
    const reviewed = Object.fromEntries(api.PREFLIGHT_CHECKLIST.flatMap(phase => phase.items.map((_, idx) => [phase.phase + '-' + idx, true])));
    await mount({ preflightChecked: reviewed, preflightOpen: { Documents: true } });
    const oldInput = checks()[0];
    await act(async () => { button('Start trainer practice').click(); oldInput.click(); });
    expect(latest.view).toBe('flying'); expect(latest.flightChallenge.id).toBe('first_flight');
    expect(latest.preflightChecked).toEqual(reviewed);
  });
});

describe('Sky School force calculator input integrity', () => {
  it('preserves current valid defaults and values for every aircraft preset', () => {
    const defaultSpeeds = [74, 294, 317, 720, 60];
    api.FORCE_CALCULATOR_PRESETS.forEach((preset, index) => {
      expect(api.normalizeFlightCalculatorInputs({ calcPreset: index })).toEqual({ calcPreset: index,
        calcSpeed: defaultSpeeds[index], calcAltitude: 0, calcWingArea: preset.wingArea, calcCl: preset.cl });
      const saved = { calcPreset: index, calcSpeed: 100, calcAltitude: 12500, calcWingArea: 200, calcCl: .75 };
      expect(api.normalizeFlightCalculatorInputs(saved)).toEqual(saved);
    });
  });
  it('bounds finite saved values to the same domains as the controls without mutating the save', () => {
    const saved = { calcPreset: 0, calcSpeed: -100, calcAltitude: Number.MAX_VALUE, calcWingArea: -5, calcCl: 100 };
    expect(api.normalizeFlightCalculatorInputs(saved)).toEqual({ calcPreset: 0, calcSpeed: 0, calcAltitude: 50000, calcWingArea: 5, calcCl: 2 });
    expect(saved.calcSpeed).toBe(-100);
    expect(api.normalizeFlightCalculatorInputs({ calcSpeed: Number.MAX_VALUE, calcWingArea: Number.MAX_VALUE, calcCl: -1 }).calcSpeed).toBe(186);
    expect(api.normalizeFlightCalculatorInputs({ calcWingArea: Number.MAX_VALUE }).calcWingArea).toBe(600);
  });
  it('recovers malformed inputs and preset selectors while supporting a saved numeric preset string', () => {
    const expected = api.normalizeFlightCalculatorInputs({});
    for (const saved of [null, undefined, false, 'bad', ['bad']]) expect(api.normalizeFlightCalculatorInputs(saved)).toEqual(expected);
    for (const calcPreset of ['constructor', -1, 100, 1.5, {}, Infinity]) expect(api.normalizeFlightCalculatorInputs({ calcPreset }).calcPreset).toBe(0);
    expect(api.normalizeFlightCalculatorInputs({ calcPreset: '1' }).calcPreset).toBe(1);
    expect(api.normalizeFlightCalculatorInputs({ calcSpeed: Infinity, calcAltitude: NaN, calcWingArea: '174', calcCl: null })).toEqual(expected);
  });
  it('shows a selected preset and finite outputs for malformed saved ranges', async () => {
    await mount({ view: 'calculator', calcPreset: '1', calcSpeed: Number.MAX_VALUE, calcAltitude: -1, calcWingArea: -1, calcCl: Number.MAX_VALUE });
    expect(button('Boeing 747').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
    expect(range('True airspeed (kts)').valueAsNumber).toBe(735); expect(range('Altitude').valueAsNumber).toBe(0);
    expect(range('Wing area').valueAsNumber).toBe(5); expect(range('Lift coefficient (Cₗ)').valueAsNumber).toBe(2);
    expect(host.textContent).not.toMatch(/Infinity|NaN|undefined/);
  });
  it('preserves batched slider edits, canonicalizes the saved fields, and computes from their displayed values', async () => {
    await mount({ view: 'calculator', calcPreset: 0, calcWingArea: -1, calcCl: '1.5', keep: 'preserved' });
    await act(async () => { moveRange(range('True airspeed (kts)'), 100); moveRange(range('Altitude'), 10000); });
    expect(latest).toMatchObject({ calcPreset: 0, calcSpeed: 100, calcAltitude: 10000, calcWingArea: 5, calcCl: 1.5, keep: 'preserved' });
    const lift = .5 * api.Physics.airDensity(10000) * (100 * 1.6878) ** 2 * 5 * 1.5;
    expect(host.textContent).toContain(Math.round(lift).toLocaleString() + ' lb');
    expect(host.textContent).toContain('L/W = ' + (lift / 2550).toFixed(2));
  });
  it('keeps a newly selected preset when a slider event arrives before React commits', async () => {
    await mount({ view: 'calculator', calcPreset: 0 }); const oldSpeed = range('True airspeed (kts)');
    await act(async () => { button('Boeing 747').click(); moveRange(oldSpeed, 100); });
    expect(latest).toMatchObject({ calcPreset: 1, calcSpeed: 100, calcAltitude: 0, calcWingArea: 5500, calcCl: 1.4 });
    expect(button('Boeing 747').getAttribute('aria-pressed')).toBe('true');
    expect(range('Wing area').valueAsNumber).toBe(5500);
  });
  it('uses the native range steps for saved inputs, readouts, and the lift computation', async () => {
    await mount({ view: 'calculator', calcPreset: 0, calcSpeed: 74.4, calcAltitude: 7310, calcWingArea: 174.4, calcCl: 1.333 });
    for (const [label, expected] of [['True airspeed (kts)', 74], ['Altitude', 7500], ['Wing area', 174], ['Lift coefficient (Cₗ)', 1.35]]) {
      expect(range(label).valueAsNumber, label).toBe(expected);
      expect(range(label).validity.stepMismatch, label).toBe(false);
    }
    expect(host.textContent).toContain('7500 ft MSL'); expect(host.textContent).toContain('1.35 ');
    const lift = .5 * api.Physics.airDensity(7500) * (74 * 1.6878) ** 2 * 174 * 1.35;
    expect(host.textContent).toContain(Math.round(lift).toLocaleString() + ' lb');
    expect(host.textContent).toContain('L/W = ' + (lift / 2550).toFixed(2));
    expect(api.normalizeFlightCalculatorInputs({ calcCl: 1.325 }).calcCl).toBe(1.35);
  });
  it('saves only valid native steps when input events carry off-step values', async () => {
    await mount({ view: 'calculator', calcPreset: 0 });
    await act(async () => { moveRange(range('Altitude'), 7310); moveRange(range('Lift coefficient (Cₗ)'), 1.333); });
    expect(latest).toMatchObject({ calcSpeed: 74, calcAltitude: 7500, calcWingArea: 174, calcCl: 1.35 });
    expect(range('Altitude').validity.stepMismatch).toBe(false);
    expect(range('Lift coefficient (Cₗ)').validity.stepMismatch).toBe(false);
  });
  it('keeps the chosen calculator values when preset and slider events follow Menu', async () => {
    const seed = { view: 'calculator', calcPreset: 1, calcSpeed: 200, calcAltitude: 10000, calcWingArea: 5500, calcCl: 1.4, keep: 'preserved' };
    await mount(seed); const oldSpeed = range('True airspeed (kts)'), oldPreset = button('F-22 Raptor');
    await act(async () => { button('← Menu').click(); oldPreset.click(); moveRange(oldSpeed, 100); });
    expect(latest).toMatchObject({ ...seed, view: 'menu' });
    await act(async () => changeSaved({ view: 'calculator' }));
    expect(range('True airspeed (kts)').valueAsNumber).toBe(200);
    expect(button('Boeing 747').getAttribute('aria-pressed')).toBe('true');
  });
});
