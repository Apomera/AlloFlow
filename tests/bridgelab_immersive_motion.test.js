import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
// Load the numerical model once. Expected guide readings come from recorded
// response intervals, independently of the new guide-budget rendering helper.
const guideEnergySource = readFileSync(resolve('stem_lab/stem_tool_bridgelab.js'), 'utf8');
const guideEnergySandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(guideEnergySource.replace("window.StemLab.registerTool('bridgeLab', {", `
  window.guideEnergyOracle = { bridgeSeismicResponse, bridgeSeismicEnergyInterval };
  window.StemLab.registerTool('bridgeLab', {`), guideEnergySandbox);
const guideEnergyOracle = guideEnergySandbox.window.guideEnergyOracle;
const guideEnergyResponses = new Map();
function guideEnergyResponse(inputs) {
  const key = JSON.stringify(inputs);
  if (!guideEnergyResponses.has(key)) guideEnergyResponses.set(key, guideEnergyOracle.bridgeSeismicResponse(inputs));
  return guideEnergyResponses.get(key);
}
let host, root, state, update, media, hidden, configuration, viewerStatus, viewerListener, lastScene;

function mount(overrides = {}) {
  function Lab() {
    const [value, setValue] = React.useState({ bridgeLab: {
      tab: 'build', bridgeView: '3d', loadMode: 'vehicle', vehiclePos: 0.5,
      introDismissed: true, seismicEnabled: true, ...overrides
    } });
    state = value.bridgeLab;
    update = patch => setValue(previous => ({ ...previous, bridgeLab: { ...previous.bridgeLab, ...patch } }));
    return configuration.render(makeCtx({ toolData: value, setToolData: setValue }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Lab)));
  // Open native disclosures queue a zero-delay toggle event in jsdom.
  act(() => vi.advanceTimersByTime(0));
}
function button(name) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name || node.getAttribute('aria-label') === name);
  expect(found, `button ${name}`).toBeTruthy();
  return found;
}
function click(name) { act(() => button(name).click()); }
function tick(ms) { act(() => vi.advanceTimersByTime(ms)); }
function field(name) {
  const labelled = [...host.querySelectorAll('input,select,textarea')].find(node => node.getAttribute('aria-label') === name);
  const label = [...host.querySelectorAll('label')].find(node => node.textContent.trim().startsWith(name));
  const found = labelled || (label && (document.getElementById(label.htmlFor) || label.querySelector('input,select')));
  expect(found, `field ${name}`).toBeTruthy();
  return found;
}
function patch(value) { act(() => update(value)); }

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const listeners = new Set();
  media = { matches: false, addEventListener: vi.fn((_, fn) => listeners.add(fn)),
    removeEventListener: vi.fn((_, fn) => listeners.delete(fn)),
    change(matches) { this.matches = matches; listeners.forEach(fn => fn()); } };
  vi.stubGlobal('matchMedia', () => media);
  resetStemLab();
  viewerStatus = 'ready';
  viewerListener = null;
  window.StemLab.makeOrbitViewer = () => ({
    attach() {}, push(value) { lastScene = value; }, dispose() {},
    status: () => viewerStatus,
    onStatusChange: listener => { viewerListener = listener; }
  });
  configuration = loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  document.getElementById('allo-live-bridgelab')?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  guideEnergyResponses.clear();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Bridge Lab immersive earthquake interaction', () => {
  function startingEnergyFrame(origin = 'current') {
    return guideEnergyFigure(origin)?.querySelector('[data-guide-shaking-budget]');
  }
  function openStartingEnergy(origin = 'current') {
    const disclosure = guideEnergyFigure(origin).querySelector('[data-guide-shaking-disclosure]');
    expect(disclosure).toBeTruthy();
    expect(disclosure.tagName).toBe('DETAILS');
    const summary = disclosure.querySelector(':scope > summary');
    expect(summary.textContent.trim()).toBe('Where did the starting energy come from?');
    if (!disclosure.open) act(() => { summary.click(); vi.advanceTimersByTime(0); });
    expect(disclosure.open).toBe(true);
    return { disclosure, summary };
  }
  function checkStartingEnergy(referenceInputs, currentInputs, origin = 'current') {
    const frame = startingEnergyFrame(origin);
    expect(frame).toBeTruthy();
    expect(Number(frame.dataset.guideShakingStart)).toBe(0);
    expect(Number(frame.dataset.guideShakingEnd)).toBe(16);
    const expected = [referenceInputs, currentInputs].map((inputs, index) => {
      const interval = guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(inputs), 0, 16);
      const row = { initial: interval.earlier.storedJPerKg, input: interval.inputJPerKg,
        damping: interval.dissipatedJPerKg, stored: interval.later.storedJPerKg, residual: interval.balanceErrorJPerKg };
      const id = index === 0 ? 'a' : 'b';
      const trial = frame.querySelector('[data-guide-shaking-trial="' + id + '"]');
      expect(trial).toBeTruthy();
      for (const [field, value] of Object.entries(row)) {
        const reading = trial.querySelector('[data-guide-shaking-field="' + field + '"]');
        expect(reading, id + ' ' + field).toBeTruthy();
        expect(Number(reading.dataset.guideShakingValue)).toBe(value);
      }
      const starting = guideEnergyFigure(origin).querySelector('[data-guide-energy-trial="' + id + '"] [data-guide-energy-field="initial"]');
      expect(Number(starting.dataset.guideEnergyValue)).toBe(row.stored);
      return row;
    });
    expect(frame.textContent).toContain('J/kg');
    expect(frame.innerHTML).not.toMatch(/NaN|Infinity/);
    return expected;
  }

  function checkShakingVisual(referenceInputs, currentInputs, origin = 'current') {
    const frame = startingEnergyFrame(origin);
    const expected = [referenceInputs, currentInputs].map((inputs, index) => {
      const interval = guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(inputs), 0, 16);
      const amounts = { initial: interval.earlier.storedJPerKg, added: Math.max(0, interval.inputJPerKg),
        stored: interval.later.storedJPerKg, damping: interval.dissipatedJPerKg, returned: Math.max(0, -interval.inputJPerKg) };
      return { id: index === 0 ? 'a' : 'b', amounts,
        available: amounts.initial + amounts.added, accounted: amounts.stored + amounts.damping + amounts.returned };
    });
    const largest = Math.max(...expected.flatMap(row => [row.available, row.accounted]));
    const scale = largest === 0 ? 1 : largest;
    expect(Number(frame.dataset.guideShakingRange)).toBe(scale);
    const legend = frame.querySelector('[data-guide-shaking-legend]');
    expect(legend).toBeTruthy();
    expect(legend.closest('svg,[aria-hidden="true"]')).toBeNull();
    for (const label of ['Stored', 'Net added by ground', 'Damping loss', 'Net removed by ground']) {
      expect(legend.textContent).toContain(label);
    }
    const snapshot = { range: scale, trials: [] };
    for (const row of expected) {
      const trial = frame.querySelector('[data-guide-shaking-trial="' + row.id + '"]');
      const svg = trial.querySelector('svg');
      expect(svg, 'paired energy bar for ' + row.id).toBeTruthy();
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('viewBox')).toBe('0 0 400 48');
      const caption = svg.parentElement.querySelector('figcaption');
      expect(caption).toBeTruthy();
      expect(caption.closest('[aria-hidden="true"]')).toBeNull();
      expect(caption.textContent).toContain('Top: initial stored + net added');
      expect(caption.textContent).toContain('Bottom: stored at 16 s + damping + net removed');
      for (const track of ['available', 'accounted']) {
        const background = svg.querySelector('[data-guide-shaking-track="' + track + '"]');
        expect(background, row.id + ' empty ' + track + ' track').toBeTruthy();
        expect(Number(background.getAttribute('width'))).toBe(400);
        expect(Number(background.getAttribute('x'))).toBe(0);
      }
      const segments = [...svg.querySelectorAll('[data-guide-shaking-bar]')];
      expect(segments).toHaveLength(Object.values(row.amounts).filter(value => value !== 0).length);
      const rendered = [];
      for (const [kind, amount] of Object.entries(row.amounts)) {
        const segment = svg.querySelector('[data-guide-shaking-bar="' + kind + '"]');
        if (amount === 0) {
          expect(segment, row.id + ' exact-zero ' + kind).toBeNull();
          continue;
        }
        expect(segment, row.id + ' ' + kind).toBeTruthy();
        expect(segment.tagName.toLowerCase()).toBe('rect');
        expect(Number(segment.dataset.guideShakingAmount)).toBe(amount);
        const width = Number(segment.getAttribute('width'));
        expect(width).toBe(amount / scale * 400);
        expect(width).toBeGreaterThan(0);
        expect(width).toBeLessThanOrEqual(400);
        const available = kind === 'initial' || kind === 'added';
        const offset = kind === 'added' ? row.amounts.initial : kind === 'damping' ? row.amounts.stored
          : kind === 'returned' ? row.amounts.stored + row.amounts.damping : 0;
        expect(Number(segment.getAttribute('x'))).toBe(offset / scale * 400);
        expect(Number(segment.getAttribute('y'))).toBe(available ? 2 : 32);
        expect(Number(segment.getAttribute('height'))).toBe(14);
        rendered.push({ kind, amount, width, x: segment.getAttribute('x'), y: segment.getAttribute('y') });
      }
      snapshot.trials.push({ id: row.id, rendered });
    }
    expect(Boolean(frame.querySelector('[data-guide-shaking-zero]'))).toBe(largest === 0);
    expect(frame.innerHTML).not.toMatch(/NaN|Infinity/);
    checkStartingEnergy(referenceInputs, currentInputs, origin);
    return { expected, snapshot, scale };
  }

  it('shaking visual: compares measured amounts on one scale and keeps the 0–16 second bars fixed while inspecting later times', () => {
    mount({ seismicGuideOpen: true, seismicGuidePrediction: 'Keep prediction.', seismicIntervalPinS: 12.319 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 15.999 });
    expect(startingEnergyFrame()).toBeFalsy();
    patch({ seismicTime: 16 });
    const disclosure = guideEnergyFigure().querySelector('[data-guide-shaking-disclosure]');
    expect(disclosure.open).toBe(false);
    const { summary } = openStartingEnergy();
    act(() => summary.focus());
    const inputs = { reference: state.seismicGuideBaseline.inputs, current: guideEnergyCurrentInputs() };
    const original = checkShakingVisual(inputs.reference, inputs.current);
    expect(original.expected[0].amounts.added).not.toBe(original.expected[1].amounts.added);
    expect(original.expected[0].amounts.stored).not.toBe(original.expected[1].amounts.stored);
    for (const time of [21.217, 24]) {
      patch({ seismicTime: time });
      expect(checkShakingVisual(inputs.reference, inputs.current).snapshot).toEqual(original.snapshot);
      expect(guideEnergyFigure().querySelector('[data-guide-shaking-disclosure]')).toBe(disclosure);
      expect(disclosure.open).toBe(true);
      expect(document.activeElement).toBe(summary);
    }
    expect(state).toMatchObject({ seismicGuidePrediction: 'Keep prediction.', seismicIntervalPinS: 12.319 });
    expect(state.seismicGuideEvidence).toBeUndefined();
  });

  it('shaking visual: preserves amplitude scaling and arbitrarily small nonzero segments without a minimum display width', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    openStartingEnergy();
    const ordinary = checkShakingVisual(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    patch({ seismicIntensityG: 0.000001 });
    const mixed = checkShakingVisual(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    for (const segment of mixed.snapshot.trials[1].rendered) {
      expect(segment.width).toBeGreaterThan(0);
      expect(segment.width).toBeLessThan(0.001);
    }
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    openStartingEnergy();
    const tiny = checkShakingVisual(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    const squaredRatio = (0.000001 / 0.12) ** 2;
    expect(tiny.scale / ordinary.scale).toBeCloseTo(squaredRatio, 20);
    for (const [index, row] of tiny.expected.entries()) {
      for (const [kind, amount] of Object.entries(row.amounts)) {
        const before = ordinary.expected[index].amounts[kind];
        if (before === 0) expect(amount).toBe(0);
        else expect(amount / before).toBeCloseTo(squaredRatio, 20);
      }
      const ordinarySegments = ordinary.snapshot.trials[index].rendered;
      expect(tiny.snapshot.trials[index].rendered.map(segment => segment.kind)).toEqual(ordinarySegments.map(segment => segment.kind));
      tiny.snapshot.trials[index].rendered.forEach((segment, segmentIndex) => {
        expect(segment.width).toBeCloseTo(ordinarySegments[segmentIndex].width, 9);
      });
    }
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-zero]')).toBeNull();
  });

  it('shaking visual: leaves exact-zero rows empty and shows undamped stored energy without a loss segment', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 24 });
    openStartingEnergy();
    const zero = checkShakingVisual(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(zero.scale).toBe(1);
    expect(zero.snapshot.trials.every(row => row.rendered.length === 0)).toBe(true);
    const baseline = JSON.parse(JSON.stringify(state.seismicGuideBaseline));
    patch({ seismicGuideBaseline: { ...baseline, inputs: { ...baseline.inputs, intensityG: 0.12 } } });
    const oneZero = checkShakingVisual(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(oneZero.snapshot.trials[0].rendered.length).toBeGreaterThan(0);
    expect(oneZero.snapshot.trials[1].rendered).toEqual([]);
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-zero]')).toBeNull();
    patch({ seismicIntensityG: 0.12, seismicDampingRatio: 0 });
    const undamped = checkShakingVisual(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(undamped.expected[1].amounts.damping).toBe(0);
    expect(undamped.expected[1].amounts.stored).toBeGreaterThan(0);
    expect(undamped.expected[1].amounts.added).toBeGreaterThan(0);
    expect(undamped.snapshot.trials[1].rendered.map(segment => segment.kind)).toEqual(['added', 'stored']);
    expect(undamped.snapshot.trials[0].rendered.some(segment => segment.kind === 'damping')).toBe(true);
  });

  it('shaking visual: freezes a saved confounded comparison and rebuilds its bars from the original inputs in a fresh print', () => {
    const writing = { seismicGuidePrediction: 'Keep my prediction.', seismicGuideClaim: 'Keep my claim.',
      seismicGuideReasoning: 'Ground motion changed as well.' };
    mount({ ...writing, seismicGuideOpen: true, seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicFrequencyHz: 0.8, seismicIntensityG: 0.000002, seismicTime: 21.217 });
    click('Record paired evidence');
    const record = JSON.parse(JSON.stringify(state.seismicGuideEvidence));
    openStartingEnergy('recorded');
    const original = checkShakingVisual(record.referenceInputs, record.currentInputs, 'recorded').snapshot;
    expect(host.querySelector('[data-guide-readings="recorded"] [data-guide-comparison-context]').dataset.guideComparisonContext).toBe('confounded');
    patch({ seismicFrequencyHz: 1.1, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 24 });
    expect(checkShakingVisual(record.referenceInputs, record.currentInputs, 'recorded').snapshot).toEqual(original);
    expect(state.seismicGuideEvidence).toEqual(record);
    const savedState = JSON.parse(JSON.stringify(state));
    act(() => root.unmount()); root = null; host.remove();
    const imported = { ...record, shakingVisual: { scaleJPerKg: 999999, trials: [] },
      shakingBudget: { inputJPerKg: 999999, storedJPerKg: 999999 } };
    mount({ ...savedState, tab: 'print', seismicEnabled: false, seismicGuideEvidence: imported });
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(checkShakingVisual(record.referenceInputs, record.currentInputs, 'recorded').snapshot).toEqual(original);
    expect(startingEnergyFrame('recorded').closest('details')).toBeNull();
    expect(report.querySelector('details,summary,button,input,select,textarea')).toBeNull();
    expect(report.textContent).not.toContain('999999');
    expect(state.seismicGuideEvidence).toEqual(imported);
    expect(state).toMatchObject(writing);
  });

  it('starting energy: keeps the optional disclosure open and focused while its 0–16 second values stay fixed', () => {
    mount({ seismicGuideOpen: true, seismicIntervalPinS: 12.319, seismicGuidePrediction: 'Keep my prediction.' });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 15.999 });
    expect(host.querySelector('[data-guide-shaking-disclosure]')).toBeNull();
    patch({ seismicTime: 16 });
    const initialDisclosure = guideEnergyFigure().querySelector('[data-guide-shaking-disclosure]');
    expect(initialDisclosure.open).toBe(false);
    const summary = initialDisclosure.querySelector(':scope > summary');
    act(() => summary.focus());
    expect(document.activeElement).toBe(summary);
    const { disclosure } = openStartingEnergy();
    const original = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    if (original.some(row => row.residual !== 0 && Math.abs(row.residual) < 0.001)) {
      const help = guideEnergyFigure().querySelector('[data-guide-energy-scientific-help]');
      expect(help).toBeTruthy();
      expect(help.textContent).toContain('Scientific notation:');
      expect(help.closest('[hidden],[aria-hidden="true"]')).toBeNull();
      expect(getComputedStyle(help).display).not.toBe('none');
      expect(getComputedStyle(help).visibility).not.toBe('hidden');
      expect(help.closest('details').open).toBe(true);
    }
    const storedNow = () => Number(guideEnergyFigure().querySelector('[data-guide-energy-trial="b"] [data-guide-energy-field="remaining"]').dataset.guideEnergyValue);
    const initialStored = storedNow();
    for (const time of [21.217, 24]) {
      patch({ seismicTime: time });
      expect(guideEnergyFigure().querySelector('[data-guide-shaking-disclosure]')).toBe(disclosure);
      expect(disclosure.open).toBe(true);
      expect(document.activeElement).toBe(summary);
      expect(checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs())).toEqual(original);
      expect(storedNow()).toBeLessThan(initialStored);
    }
    patch({ seismicTime: 7.217 });
    expect(host.querySelector('[data-guide-shaking-budget]')).toBeNull();
    expect(state).toMatchObject({ seismicIntervalPinS: 12.319, seismicGuidePrediction: 'Keep my prediction.' });
    expect(state.seismicGuideEvidence).toBeUndefined();
  });

  it('starting energy: rebuilds saved confounded inputs in a fresh disabled-model print after the live pair changes', () => {
    const writing = { seismicGuidePrediction: 'Keep guide prediction.', seismicGuideClaim: 'Keep my claim.',
      seismicGuideReasoning: 'The original pair changed ground motion too.', seismicObservation: 'Keep notebook writing.' };
    mount({ ...writing, seismicGuideOpen: true, seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicFrequencyHz: 0.8, seismicIntensityG: 0.000002, seismicTime: 21.217 });
    click('Record paired evidence');
    const record = JSON.parse(JSON.stringify(state.seismicGuideEvidence));
    expect(Object.keys(record).sort()).toEqual(['currentInputs', 'referenceInputs', 'timeS', 'version']);
    openStartingEnergy('recorded');
    const original = checkStartingEnergy(record.referenceInputs, record.currentInputs, 'recorded');
    const recordedContext = () => host.querySelector('[data-guide-readings="recorded"] [data-guide-comparison-context]');
    expect(recordedContext().dataset.guideComparisonContext).toBe('confounded');
    expect(startingEnergyFrame('recorded').querySelector('[data-guide-shaking-controlled]')).toBeNull();
    patch({ seismicFrequencyHz: 1.1, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 24 });
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-controlled]')).toBeTruthy();
    expect(checkStartingEnergy(record.referenceInputs, record.currentInputs, 'recorded')).toEqual(original);
    expect(recordedContext().dataset.guideComparisonContext).toBe('confounded');
    expect(state.seismicGuideEvidence).toEqual(record);
    const savedState = JSON.parse(JSON.stringify(state));
    act(() => root.unmount()); root = null; host.remove();
    const restoredRecord = { ...record, shakingBudget: { inputJPerKg: 999999, storedJPerKg: 999999 } };
    mount({ ...savedState, tab: 'print', seismicEnabled: false, seismicGuideEvidence: restoredRecord });
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report).toBeTruthy();
    expect(checkStartingEnergy(record.referenceInputs, record.currentInputs, 'recorded')).toEqual(original);
    expect(startingEnergyFrame('recorded').closest('details')).toBeNull();
    expect(report.querySelector('[data-guide-shaking-disclosure]')).toBeNull();
    expect(report.querySelector('details,summary,button,input,select,textarea')).toBeNull();
    expect(report.textContent).not.toContain('999999');
    expect(recordedContext().dataset.guideComparisonContext).toBe('confounded');
    expect(startingEnergyFrame('recorded').querySelector('[data-guide-shaking-controlled]')).toBeNull();
    expect(state.seismicGuideEvidence).toEqual(restoredRecord);
    expect(state).toMatchObject(writing);
  });

  it('starting energy: retains tiny input work and distinguishes zero shaking from undamped storage', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 24 });
    openStartingEnergy();
    const baseline = JSON.parse(JSON.stringify(state.seismicGuideBaseline));
    const tiny = checkStartingEnergy(baseline.inputs, guideEnergyCurrentInputs());
    for (const row of tiny) {
      expect(row.initial).toBe(0);
      for (const field of ['input', 'damping', 'stored']) {
        expect(row[field]).toBeGreaterThan(0);
        expect(row[field]).toBeLessThan(0.001);
      }
    }
    for (const reading of startingEnergyFrame().querySelectorAll('[data-guide-shaking-field]')) {
      if (Number(reading.dataset.guideShakingValue) === 0) continue;
      const shown = reading.textContent.replace(/−/g, '-').match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      expect(shown).toBeTruthy();
      expect(Number(shown[0])).not.toBe(0);
    }
    patch({ seismicIntensityG: 0 });
    const onlyA = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(onlyA[0].input).toBeGreaterThan(0);
    expect(Object.values(onlyA[1]).every(value => value === 0)).toBe(true);
    patch({ seismicGuideBaseline: { ...baseline, inputs: { ...baseline.inputs, intensityG: 0 } } });
    const zero = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(zero.every(row => Object.values(row).every(value => value === 0))).toBe(true);
    for (const reading of startingEnergyFrame().querySelectorAll('[data-guide-shaking-field]')) {
      expect(reading.textContent.trim()).not.toMatch(/^[+−-]0(?:\.0+)?(?:\s|$)/);
    }
    patch({ seismicGuideBaseline: { ...baseline, inputs: { ...baseline.inputs } }, seismicIntensityG: 0.000001, seismicDampingRatio: 0 });
    const undamped = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(undamped[0].damping).toBeGreaterThan(0);
    expect(undamped[1].damping).toBe(0);
    expect(undamped[1].stored).toBeGreaterThan(0);
    expect(undamped[1].input).toBeGreaterThan(0);
    expect(undamped[1].input - undamped[1].stored).toBeCloseTo(undamped[1].residual, 20);
    const input = startingEnergyFrame().querySelector('[data-guide-shaking-trial="b"] [data-guide-shaking-field="input"]');
    expect(input.textContent.trim()).toMatch(/^\+/);
    expect(state.seismicGuideBaseline.inputs.dampingRatio).toBe(0.05);
  });

  it('starting energy: explains damping as the changed input only for a controlled nonzero pair', () => {
    mount({ seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 16 });
    openStartingEnergy();
    const context = () => host.querySelector('[data-guide-readings="current"] [data-guide-comparison-context]').dataset.guideComparisonContext;
    const controlled = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(context()).toBe('controlled');
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-controlled]')).toBeTruthy();
    expect(controlled[0].input).not.toBe(controlled[1].input);
    expect(controlled[0].stored).not.toBe(controlled[1].stored);
    patch({ seismicDampingRatio: 0.05 });
    const identical = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(identical[0]).toEqual(identical[1]);
    expect(context()).toBe('identical');
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-controlled]')).toBeNull();
    patch({ seismicDampingRatio: 0.2, seismicFrequencyHz: 0.8 });
    checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(context()).toBe('confounded');
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-controlled]')).toBeNull();
    patch({ seismicIntensityG: 0 });
    checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    expect(context()).toBe('zero');
    expect(startingEnergyFrame().querySelector('[data-guide-shaking-controlled]')).toBeNull();
  });

  it('starting energy: keeps guide provenance independent of notebook selection, scene selection and learner writing', () => {
    const records = [
      { version: 'bridge-seismic-v1', name: 'Stiff notebook reference', timeS: 7.217,
        inputs: { archetype: 'stiff', groundFrequencyHz: 0.8, intensityG: 0.2, dampingRatio: 0.1 }, prediction: 'First prediction', observation: 'First explanation' },
      { version: 'bridge-seismic-v1', name: 'Flexible notebook reference', timeS: 12.319,
        inputs: { archetype: 'flexible', groundFrequencyHz: 0.65, intensityG: 0.15, dampingRatio: 0.3 }, prediction: 'Second prediction', observation: 'Second explanation' }
    ];
    const writing = { seismicPrediction: 'Notebook prediction', seismicObservation: 'Notebook explanation',
      seismicScenePrediction: 'Scene prediction', seismicSceneNote: 'Scene explanation',
      seismicGuidePrediction: 'Guide prediction', seismicGuideClaim: 'Guide claim', seismicGuideReasoning: 'Guide reasoning' };
    mount({ ...writing, bridgeView: 'immersive', seismicGuideOpen: true, seismicEnergyInterval: true,
      seismicIntervalPinS: 12.319, seismicTrials: records, seismicReferenceIndex: 0 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    openStartingEnergy();
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'kinetic' } }));
    const original = checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs());
    const assertScope = () => {
      expect(checkStartingEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs())).toEqual(original);
      expect(guideEnergyFigure().querySelector('[data-guide-shaking-disclosure]').open).toBe(true);
      expect(field('Interval evidence quantity').value).toBe('kinetic');
      expect(host.querySelector('[data-claim-window="interval"]').dataset).toMatchObject({ claimMeasureSource: 'manual', claimStart: '12.319' });
      expect(state).toMatchObject({ ...writing, seismicIntervalPinS: 12.319, seismicTime: 21.217 });
      expect(state.seismicTrials).toEqual(records);
      expect(state.seismicGuideEvidence).toBeUndefined();
    };
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    assertScope();
    click('A · reference'); assertScope();
    click('B · current'); assertScope();
    click('Compare saved trial in scene');
    click('A · reference'); assertScope();
    expect(state.seismicSceneSource).toBe('saved');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state.bridgeView).toBe('2d');
    assertScope();
  });

  it('decay time: preserves focused drafts, pauses motion, commits bounded times and keeps saved evidence static', () => {
    const writing = { seismicGuidePrediction: 'Keep prediction.', seismicGuideClaim: 'Keep claim.',
      seismicGuideReasoning: 'Keep reasoning.', seismicObservation: 'Keep notebook writing.', seismicSceneNote: 'Keep scene note.' };
    mount({ ...writing, seismicGuideOpen: true, seismicEnergyInterval: true, seismicIntervalPinS: 12.319 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 20.125 });
    click('Record paired evidence');
    const record = JSON.parse(JSON.stringify(state.seismicGuideEvidence));
    const disclosure = openDecayFractions();
    const summary = disclosure.querySelector(':scope > summary');
    const number = field('Fraction inspection time (s)');
    const range = field('Scrub energy after shaking');
    function typeDraft(value) {
      act(() => { number.value = value; Simulate.change(number); });
    }
    click('Run earthquake');
    expect(state.seismicPlaying).toBe(true);
    act(() => number.focus());
    expect(document.activeElement).toBe(number);
    expect(state).toMatchObject({ seismicPlaying: false, autoDriving: false, seismicTime: 20.125 });
    typeDraft('1');
    expect(state.seismicTime).toBe(20.125);
    expect(number.value).toBe('1');
    patch({ bridgeBankYaw: 18 });
    expect(field('Fraction inspection time (s)')).toBe(number);
    expect(document.activeElement).toBe(number);
    expect(number.value).toBe('1');
    typeDraft('21.217');
    expect(state.seismicTime).toBe(21.217);
    expect(Number(range.value)).toBe(21.217);
    expect(document.activeElement).toBe(number);
    checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(disclosure.querySelector('[data-guide-decay-time-status]').textContent).toContain('21.217 s overall');
    expect(disclosure.querySelector('[data-guide-decay-time-status]').textContent).toContain('5.217 s after shaking ended');
    typeDraft('15');
    expect(state.seismicTime).toBe(21.217);
    act(() => Simulate.keyDown(number, { key: 'Enter' }));
    expect(state.seismicTime).toBe(16);
    expect(number.value).toBe('16.000');
    expect(document.activeElement).toBe(number);
    typeDraft('25');
    expect(state.seismicTime).toBe(16);
    act(() => number.blur());
    expect(state.seismicTime).toBe(24);
    expect(number.value).toBe('24.000');
    act(() => number.focus());
    typeDraft('');
    expect(number.value).toBe('');
    expect(state.seismicTime).toBe(24);
    act(() => Simulate.keyDown(number, { key: 'Enter' }));
    expect(number.value).toBe('24.000');
    expect(state.seismicTime).toBe(24);
    act(() => summary.focus());
    const drive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    expect(drive).toBeTruthy();
    act(() => drive.click());
    expect(state.autoDriving).toBe(true);
    act(() => range.focus());
    expect(document.activeElement).toBe(range);
    expect(state).toMatchObject({ autoDriving: false, seismicPlaying: false, seismicTime: 24 });
    act(() => { range.value = '18.625'; Simulate.change(range); });
    expect(state.seismicTime).toBe(18.625);
    expect(number.value).toBe('18.625');
    expect(document.activeElement).toBe(range);
    checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 18.625);
    expect(disclosure.open).toBe(true);
    expect(guideEnergyFigure('recorded').querySelector('[data-guide-decay-time-controls]')).toBeNull();
    expect(guideEnergyFigure('recorded').querySelector('input')).toBeNull();
    checkDecayFractions(record.referenceInputs, record.currentInputs, record.timeS, 'recorded');
    expect(state.seismicGuideEvidence).toEqual(record);
    expect(state).toMatchObject({ ...writing, seismicIntervalPinS: 12.319 });
    click('Open investigation report');
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report.querySelector('[data-guide-decay-time-controls]')).toBeNull();
    expect(report.querySelector('input,button,select,textarea')).toBeNull();
    checkDecayFractions(record.referenceInputs, record.currentInputs, record.timeS, 'recorded');
    expect(state.seismicGuideEvidence).toEqual(record);
    expect(state).toMatchObject(writing);
  });

  function openDecayFractions(origin = 'current') {
    const disclosure = guideEnergyFigure(origin).querySelector('[data-guide-decay-disclosure]');
    expect(disclosure).toBeTruthy();
    expect(disclosure.tagName).toBe('DETAILS');
    const summary = disclosure.querySelector(':scope > summary');
    expect(summary.textContent.trim()).toBe('Compare the fraction remaining');
    if (!disclosure.open) act(() => { summary.click(); vi.advanceTimersByTime(0); });
    expect(disclosure.open).toBe(true);
    return disclosure;
  }
  function checkDecayFractions(referenceInputs, currentInputs, time, origin = 'current') {
    const frame = guideEnergyFigure(origin).querySelector('[data-guide-decay-fractions]');
    expect(frame).toBeTruthy();
    const end = Math.min(24, time);
    const expected = [referenceInputs, currentInputs].map((inputs, index) => {
      const interval = guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(inputs), 16, end);
      const initial = interval.earlier.storedJPerKg, remaining = interval.later.storedJPerKg;
      return { id: index === 0 ? 'a' : 'b', initial, remaining, fraction: initial > 0 ? remaining / initial : null };
    });
    const scale = Math.max(1, ...expected.filter(row => row.fraction !== null).map(row => row.fraction));
    expect(Number(frame.dataset.guideDecayStart)).toBe(16);
    expect(Number(frame.dataset.guideDecayEnd)).toBe(end);
    expect(Number(frame.dataset.guideDecayRange)).toBe(scale);
    for (const row of expected) {
      const trial = frame.querySelector('[data-guide-decay-trial="' + row.id + '"]');
      expect(trial).toBeTruthy();
      expect(Number(trial.dataset.guideDecayInitial)).toBe(row.initial);
      expect(Number(trial.dataset.guideDecayRemaining)).toBe(row.remaining);
      const amounts = trial.querySelector('[data-guide-decay-amounts]');
      expect(amounts, 'visible numerator and denominator for ' + row.id).toBeTruthy();
      const displayedAmounts = [...amounts.textContent.replace(/−/g, '-').matchAll(/([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*J\/kg/gi)]
        .map(match => Number(match[1]));
      expect(displayedAmounts).toHaveLength(2);
      const [numerator, denominator] = displayedAmounts;
      if (row.fraction === null) {
        expect(denominator).toBe(0);
        expect(numerator).toBe(0);
      } else {
        expect(denominator).toBeGreaterThan(0);
        const displayedQuotient = numerator / denominator;
        if (row.fraction === 0) expect(displayedQuotient).toBe(0);
        else {
          expect(numerator).toBeGreaterThan(0);
          expect(Math.abs(displayedQuotient - row.fraction)).toBeLessThanOrEqual(2e-5 * row.fraction);
        }
      }
      const reading = trial.querySelector('[data-guide-decay-value]');
      const bar = trial.querySelector('[data-guide-decay-bar]');
      if (row.fraction === null) {
        expect(trial.querySelector('[data-guide-decay-undefined]')).toBeTruthy();
        expect(trial.querySelector('[data-guide-decay-fraction]')).toBeNull();
        expect(bar).toBeNull();
      } else {
        expect(reading).toBeTruthy();
        expect(Number(reading.dataset.guideDecayFraction)).toBe(row.fraction);
        expect(trial.querySelector('[data-guide-decay-undefined]')).toBeNull();
        if (row.fraction === 0) expect(bar).toBeNull();
        else {
          expect(bar).toBeTruthy();
          expect(Number(bar.getAttribute('width'))).toBeCloseTo(row.fraction / scale * 400, 10);
        }
      }
    }
    const markers = [...frame.querySelectorAll('[data-guide-decay-reference]')];
    expect(markers).toHaveLength(expected.filter(row => row.fraction !== null).length);
    for (const marker of markers) expect(Number(marker.getAttribute('x1'))).toBeCloseTo(400 / scale, 10);
    expect(frame.innerHTML).not.toMatch(/NaN|Infinity/);
    return { expected, scale };
  }

  it('decay fraction: opens a native optional view and follows each model ratio from 16 seconds through the event end', () => {
    mount({ seismicGuideOpen: true, seismicIntervalPinS: 12.319, seismicGuidePrediction: 'Keep my prediction.' });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 15.999 });
    expect(host.querySelector('[data-guide-decay-disclosure]')).toBeNull();
    patch({ seismicTime: 16 });
    expect(guideEnergyFigure().querySelector('[data-guide-decay-disclosure]').open).toBe(false);
    const disclosure = openDecayFractions();
    const start = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 16);
    expect(start.expected.map(row => row.fraction)).toEqual([1, 1]);
    expect(start.expected[0].initial).not.toBe(start.expected[1].initial);
    for (const time of [21.217, 24]) {
      patch({ seismicTime: time });
      expect(disclosure.open).toBe(true);
      const result = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), time);
      expect(result.expected.every(row => row.fraction > 0 && row.fraction < 1)).toBe(true);
    }
    patch({ seismicTime: 7.217 });
    expect(host.querySelector('[data-guide-decay-fractions]')).toBeNull();
    expect(state).toMatchObject({ seismicIntervalPinS: 12.319, seismicGuidePrediction: 'Keep my prediction.' });
    expect(state.seismicGuideEvidence).toBeUndefined();
  });

  it('decay fraction: preserves amplitude-independent ratios and bar widths for tiny nonzero energy', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    openDecayFractions();
    const ordinary = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    const widths = () => [...guideEnergyFigure().querySelectorAll('[data-guide-decay-bar]')].map(node => Number(node.getAttribute('width')));
    const ordinaryWidths = widths();
    patch({ seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    openDecayFractions();
    const tiny = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    const squaredRatio = (0.000001 / 0.12) ** 2;
    for (const [index, row] of tiny.expected.entries()) {
      expect(row.initial).toBeGreaterThan(0);
      expect(row.remaining).toBeGreaterThan(0);
      expect(row.initial / ordinary.expected[index].initial).toBeCloseTo(squaredRatio, 20);
      expect(row.fraction).toBeCloseTo(ordinary.expected[index].fraction, 13);
    }
    expect(tiny.scale).toBe(ordinary.scale);
    expect(widths()).toHaveLength(ordinaryWidths.length);
    widths().forEach((width, index) => expect(width).toBeCloseTo(ordinaryWidths[index], 9));
    expect(guideEnergyFigure().querySelector('[data-guide-decay-undefined]')).toBeNull();
  });

  it('decay fraction: leaves zero-initial trials undefined instead of presenting zero percent remaining', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 16 });
    openDecayFractions();
    const zeroStart = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 16);
    expect(zeroStart.expected.map(row => row.fraction)).toEqual([null, null]);
    patch({ seismicTime: 21.217 });
    const zero = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(zero.scale).toBe(1);
    expect(guideEnergyFigure().querySelectorAll('[data-guide-decay-undefined]')).toHaveLength(2);
    expect(guideEnergyFigure().querySelectorAll('[data-guide-decay-bar]')).toHaveLength(0);
    patch({ seismicIntensityG: 0.12 });
    const onlyB = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(onlyB.expected[0].fraction).toBeNull();
    expect(onlyB.expected[1].fraction).toBeGreaterThan(0);
    const baseline = JSON.parse(JSON.stringify(state.seismicGuideBaseline));
    patch({ seismicGuideBaseline: { ...baseline, inputs: { ...baseline.inputs, intensityG: 0.12 } }, seismicIntensityG: 0 });
    const onlyA = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(onlyA.expected[0].fraction).toBeGreaterThan(0);
    expect(onlyA.expected[1].fraction).toBeNull();
    expect(guideEnergyFigure().querySelectorAll('[data-guide-decay-undefined]')).toHaveLength(1);
  });

  it('decay fraction: displays the measured undamped ratio without forcing it to exactly one', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicDampingRatio: 0, seismicTime: 24 });
    openDecayFractions();
    const result = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 24);
    const a = result.expected[0], b = result.expected[1];
    expect(state.seismicGuideBaseline.inputs.dampingRatio).toBe(0.05);
    expect(a.fraction).toBeLessThan(b.fraction);
    expect(b.fraction).toBeCloseTo(1, 6);
    expect(b.fraction).not.toBe(1);
    const reading = guideEnergyFigure().querySelector('[data-guide-decay-trial="b"] [data-guide-decay-value]');
    expect(Number(reading.dataset.guideDecayFraction)).toBe(b.remaining / b.initial);
    expect(Number(reading.dataset.guideDecayFraction)).not.toBe(1);
    const interval = guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(guideEnergyCurrentInputs()), 16, 24);
    expect(interval.dissipatedJPerKg).toBe(0);
    expect((1 - b.fraction) * b.initial).toBeCloseTo(interval.balanceErrorJPerKg, 12);
  });

  it('decay fraction: reconstructs a saved confounded pair and exposes its own ratios in a fresh disabled-model print', () => {
    const writing = { seismicGuidePrediction: 'Keep guide prediction.', seismicGuideClaim: 'Keep my claim.',
      seismicGuideReasoning: 'These saved inputs also changed shaking.', seismicObservation: 'Keep notebook evidence.' };
    mount({ ...writing, seismicGuideOpen: true, seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicFrequencyHz: 0.8, seismicIntensityG: 0.000002, seismicTime: 21.217 });
    click('Record paired evidence');
    const record = JSON.parse(JSON.stringify(state.seismicGuideEvidence));
    expect(Object.keys(record).sort()).toEqual(['currentInputs', 'referenceInputs', 'timeS', 'version']);
    openDecayFractions('recorded');
    const saved = checkDecayFractions(record.referenceInputs, record.currentInputs, record.timeS, 'recorded');
    const readings = origin => host.querySelector('[data-guide-readings="' + origin + '"]');
    expect(readings('recorded').querySelector('[data-guide-comparison-context]').dataset.guideComparisonContext).toBe('confounded');
    patch({ seismicFrequencyHz: 1.1, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 24 });
    expect(readings('current').querySelector('[data-guide-comparison-context]').dataset.guideComparisonContext).toBe('controlled');
    expect(checkDecayFractions(record.referenceInputs, record.currentInputs, record.timeS, 'recorded')).toEqual(saved);
    expect(readings('recorded').querySelector('[data-guide-comparison-context]').dataset.guideComparisonContext).toBe('confounded');
    expect(state.seismicGuideEvidence).toEqual(record);
    const savedState = JSON.parse(JSON.stringify(state));
    act(() => root.unmount()); root = null; host.remove();
    const restoredRecord = { ...record, fractions: { remainingFraction: 999999 } };
    mount({ ...savedState, tab: 'print', seismicEnabled: false, seismicGuideEvidence: restoredRecord });
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report).toBeTruthy();
    expect(checkDecayFractions(record.referenceInputs, record.currentInputs, record.timeS, 'recorded')).toEqual(saved);
    const printFractions = guideEnergyFigure('recorded').querySelector('[data-guide-decay-fractions]');
    expect(printFractions.closest('details')).toBeNull();
    expect(report.querySelector('[data-guide-decay-disclosure]')).toBeNull();
    expect(report.querySelector('details,summary,button,input,select,textarea')).toBeNull();
    expect(report.textContent).not.toContain('999999');
    expect(readings('recorded').querySelector('[data-guide-comparison-context]').dataset.guideComparisonContext).toBe('confounded');
    expect(readings('recorded').querySelector('p strong').textContent).toBe('Shared inspection time: 21.217 s');
    expect(state.seismicGuideEvidence).toEqual(restoredRecord);
    expect(state).toMatchObject(writing);
  });

  it('decay fraction: keeps the prepared pair independent of notebook references, manual evidence and scene fallback', () => {
    const records = [
      { version: 'bridge-seismic-v1', name: 'Stiff notebook reference', timeS: 7.217,
        inputs: { archetype: 'stiff', groundFrequencyHz: 0.8, intensityG: 0.2, dampingRatio: 0.1 }, prediction: 'First prediction', observation: 'First explanation' },
      { version: 'bridge-seismic-v1', name: 'Flexible notebook reference', timeS: 12.319,
        inputs: { archetype: 'flexible', groundFrequencyHz: 0.65, intensityG: 0.15, dampingRatio: 0.3 }, prediction: 'Second prediction', observation: 'Second explanation' }
    ];
    const writing = { seismicPrediction: 'Notebook prediction', seismicObservation: 'Notebook explanation',
      seismicSceneNote: 'Scene explanation', seismicGuidePrediction: 'Guide prediction', seismicGuideClaim: 'Guide claim' };
    mount({ ...writing, bridgeView: 'immersive', seismicGuideOpen: true, seismicEnergyInterval: true,
      seismicIntervalPinS: 12.319, seismicTrials: records, seismicReferenceIndex: 0 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    openDecayFractions();
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'kinetic' } }));
    const original = checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    const assertScope = () => {
      expect(checkDecayFractions(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217)).toEqual(original);
      expect(guideEnergyFigure().querySelector('[data-guide-decay-disclosure]').open).toBe(true);
      expect(field('Interval evidence quantity').value).toBe('kinetic');
      expect(host.querySelector('[data-claim-window="interval"]').dataset).toMatchObject({ claimMeasureSource: 'manual', claimStart: '12.319' });
      expect(state).toMatchObject({ ...writing, seismicIntervalPinS: 12.319, seismicTime: 21.217 });
      expect(state.seismicTrials).toEqual(records);
      expect(state.seismicGuideEvidence).toBeUndefined();
    };
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    assertScope();
    click('A · reference'); assertScope();
    click('B · current'); assertScope();
    click('Compare saved trial in scene');
    click('A · reference'); assertScope();
    expect(state.seismicSceneSource).toBe('saved');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state.bridgeView).toBe('2d');
    assertScope();
  });

  function guideEnergyFigure(origin = 'current') {
    return host.querySelector('[data-guide-readings="' + origin + '"] [data-guide-energy-budget]');
  }
  function guideEnergyCurrentInputs() {
    return { archetype: state.seismicArchetype ?? 'balanced', groundFrequencyHz: state.seismicFrequencyHz ?? 1.1,
      intensityG: state.seismicIntensityG ?? 0.12, dampingRatio: state.seismicDampingRatio ?? 0.05 };
  }
  function checkGuideEnergy(referenceInputs, currentInputs, time, origin = 'current') {
    const figure = guideEnergyFigure(origin);
    expect(figure, 'after-shaking budget for ' + origin).toBeTruthy();
    const end = Math.min(24, time);
    const intervals = [referenceInputs, currentInputs].map(inputs =>
      guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(inputs), 16, end));
    const maximum = Math.max(...intervals.flatMap(q => [q.earlier.storedJPerKg, q.later.storedJPerKg + q.dissipatedJPerKg]));
    const range = maximum || 1;
    expect(Number(figure.dataset.guideEnergyStart)).toBe(16);
    expect(Number(figure.dataset.guideEnergyEnd)).toBe(end);
    expect(Number(figure.dataset.guideEnergyRange)).toBe(range);
    const values = intervals.map((q, index) => {
      const id = index === 0 ? 'a' : 'b';
      const trial = figure.querySelector('[data-guide-energy-trial="' + id + '"]');
      expect(trial).toBeTruthy();
      const expected = { initial: q.earlier.storedJPerKg, remaining: q.later.storedJPerKg,
        damping: q.dissipatedJPerKg, residual: q.balanceErrorJPerKg };
      expect(q.inputJPerKg).toBe(0);
      for (const [field, amount] of Object.entries(expected)) {
        const reading = trial.querySelector('[data-guide-energy-field="' + field + '"]');
        expect(reading, id + ' ' + field).toBeTruthy();
        expect(Number(reading.dataset.guideEnergyValue)).toBe(amount);
        if (field === 'residual') continue;
        const bar = trial.querySelector('[data-guide-energy-bar="' + field + '"]');
        if (amount === 0) expect(bar).toBeNull();
        else {
          expect(bar, id + ' ' + field + ' bar').toBeTruthy();
          expect(Number(bar.getAttribute('width'))).toBeCloseTo(amount / range * 400, 10);
        }
      }
      const stored = trial.querySelector('strong[data-guide-value="' + id + '"][data-guide-number]');
      expect(stored, 'preserved stored-energy reading').toBeTruthy();
      expect(Number(stored.dataset.guideNumber)).toBe(expected.remaining);
      return expected;
    });
    expect(figure.querySelector('[data-guide-energy-coincident]') !== null).toBe(end === 16);
    expect(figure.querySelector('[data-guide-energy-zero]') !== null).toBe(maximum === 0);
    expect(figure.textContent).toContain('J/kg');
    expect(figure.innerHTML).not.toMatch(/NaN|Infinity/);
    return { values, range };
  }

  it('guide energy: compares both after-shaking budgets with their own recorded model intervals', () => {
    mount({ seismicGuideOpen: true, seismicArchetype: 'balanced', seismicFrequencyHz: 1.1, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    const result = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(result.values[0].initial).not.toBe(result.values[1].initial);
    for (const row of result.values) {
      expect(row.initial).toBeGreaterThan(0);
      expect(row.remaining).toBeGreaterThan(0);
      expect(row.damping).toBeGreaterThan(0);
      expect(row.initial - row.remaining - row.damping).toBeCloseTo(row.residual, 14);
    }
    expect(host.querySelector('[data-guide-readings="current"] > p strong').textContent).toBe('Shared inspection time: 21.217 s');
    expect(state.seismicGuideEvidence).toBeUndefined();
    expect(state.seismicTrials).toBeUndefined();
  });

  it('guide energy: gates the budget at shaking end without reversing an earlier inspection', () => {
    mount({ seismicGuideOpen: true, seismicEnergyInterval: true, seismicIntervalPinS: 12.319 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 15.999 });
    expect(guideEnergyFigure()).toBeNull();
    expect(host.querySelectorAll('[data-guide-readings="current"] [data-guide-measure="3"] [data-guide-number]')).toHaveLength(2);
    for (const time of [16, 21.217, 24, 99]) {
      patch({ seismicTime: time });
      const { values } = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), time);
      if (time === 16) for (const row of values) {
        expect(row.initial).toBeGreaterThan(0);
        expect(row.remaining).toBe(row.initial);
        expect(row.damping).toBe(0);
        expect(row.residual).toBe(0);
      }
    }
    patch({ seismicTime: 7.217 });
    expect(guideEnergyFigure()).toBeNull();
    expect(host.querySelectorAll('[data-guide-readings="current"] [data-guide-measure="3"] [data-guide-number]')).toHaveLength(2);
    expect(state.seismicIntervalPinS).toBe(12.319);
    expect(state.seismicGuideEvidence).toBeUndefined();
  });

  it('guide energy: preserves tiny proportions on one pair scale and distinguishes one-zero and all-zero budgets', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    const ordinary = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    const widths = () => [...guideEnergyFigure().querySelectorAll('[data-guide-energy-bar]')].map(node => Number(node.getAttribute('width')));
    const ordinaryWidths = widths();
    patch({ seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    const tinyInputs = JSON.parse(JSON.stringify(state.seismicGuideBaseline));
    const tiny = checkGuideEnergy(tinyInputs.inputs, guideEnergyCurrentInputs(), 21.217);
    const squaredRatio = (0.000001 / 0.12) ** 2;
    expect(tiny.range).toBeLessThan(0.001);
    expect(tiny.range / ordinary.range).toBeCloseTo(squaredRatio, 20);
    widths().forEach((width, index) => expect(width).toBeCloseTo(ordinaryWidths[index], 8));
    for (const row of tiny.values) for (const field of ['initial', 'remaining', 'damping']) {
      expect(row[field]).toBeGreaterThan(0);
      expect(row[field]).toBeLessThan(0.001);
    }
    for (const reading of guideEnergyFigure().querySelectorAll('[data-guide-energy-field]')) {
      if (Number(reading.dataset.guideEnergyValue) !== 0) expect(reading.textContent).toMatch(/e-\d/);
    }
    patch({ seismicGuideBaseline: { ...tinyInputs, inputs: { ...tinyInputs.inputs, intensityG: 0 } } });
    const aZero = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(Object.values(aZero.values[0]).every(value => value === 0)).toBe(true);
    expect(aZero.values[1].initial).toBeGreaterThan(0);
    patch({ seismicGuideBaseline: { ...tinyInputs, inputs: { ...tinyInputs.inputs } }, seismicIntensityG: 0 });
    const bZero = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(bZero.values[0].initial).toBeGreaterThan(0);
    expect(Object.values(bZero.values[1]).every(value => value === 0)).toBe(true);
    patch({ seismicGuideBaseline: { ...tinyInputs, inputs: { ...tinyInputs.inputs, intensityG: 0 } } });
    const bothZero = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    expect(bothZero.range).toBe(1);
    expect(guideEnergyFigure().querySelectorAll('[data-guide-energy-bar]')).toHaveLength(0);
  });

  it('guide energy: retains undamped stored energy and reports zero loss without hiding solver residuals', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicDampingRatio: 0, seismicTime: 24 });
    const mixed = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 24);
    expect(state.seismicGuideBaseline.inputs.dampingRatio).toBe(0.05);
    expect(mixed.values[0].damping).toBeGreaterThan(0);
    const undamped = mixed.values[1];
    expect(undamped.damping).toBe(0);
    expect(undamped.initial).toBeGreaterThan(0);
    expect(undamped.remaining).toBeGreaterThan(0);
    expect(Math.abs(undamped.initial - undamped.remaining)).toBeLessThanOrEqual(
      Math.abs(undamped.residual) + Number.EPSILON * Math.max(1, undamped.initial));
    expect(guideEnergyFigure().querySelector('[data-guide-energy-trial="a"] [data-guide-energy-bar="damping"]')).toBeTruthy();
    expect(guideEnergyFigure().querySelector('[data-guide-energy-trial="b"] [data-guide-energy-bar="damping"]')).toBeNull();
    expect(guideEnergyFigure().querySelector('[data-guide-energy-zero]')).toBeNull();
    expect(guideEnergyFigure().querySelectorAll('[data-guide-energy-field="residual"]')).toHaveLength(2);
    click('Record paired evidence');
    const record = state.seismicGuideEvidence;
    expect(record.referenceInputs.dampingRatio).toBe(0.05);
    expect(record.currentInputs.dampingRatio).toBe(0);
    expect(checkGuideEnergy(record.referenceInputs, record.currentInputs, record.timeS, 'recorded')).toEqual(mixed);
    expect(guideEnergyFigure('recorded').querySelector('[data-guide-energy-trial="b"] [data-guide-energy-bar="damping"]')).toBeNull();
  });

  it('guide energy: reconstructs saved pair budgets in a fresh disabled-model print after live settings change', () => {
    const writing = { seismicGuidePrediction: 'Keep my prediction.', seismicGuideClaim: 'Keep my claim.',
      seismicGuideReasoning: 'The saved pair changed shaking too.', seismicObservation: 'Keep notebook writing.' };
    mount({ ...writing, seismicGuideOpen: true, seismicIntensityG: 0.000001 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicFrequencyHz: 0.8, seismicIntensityG: 0.000002, seismicTime: 21.217 });
    click('Record paired evidence');
    const record = JSON.parse(JSON.stringify(state.seismicGuideEvidence));
    expect(Object.keys(record).sort()).toEqual(['currentInputs', 'referenceInputs', 'timeS', 'version']);
    const original = checkGuideEnergy(record.referenceInputs, record.currentInputs, record.timeS, 'recorded');
    const savedText = guideEnergyFigure('recorded').textContent;
    const baseline = JSON.parse(JSON.stringify(state.seismicGuideBaseline));
    patch({ seismicFrequencyHz: 2, seismicIntensityG: 0.12, seismicDampingRatio: 0.4, seismicTime: 7.217,
      seismicGuideBaseline: { ...baseline, inputs: { ...baseline.inputs, archetype: 'stiff', intensityG: 0.15 } } });
    expect(guideEnergyFigure()).toBeNull();
    expect(checkGuideEnergy(record.referenceInputs, record.currentInputs, record.timeS, 'recorded')).toEqual(original);
    expect(guideEnergyFigure('recorded').textContent).toBe(savedText);
    expect(host.querySelector('[data-guide-readings="recorded"] [data-guide-comparison-context]').dataset.guideComparisonContext).toBe('confounded');
    expect(state.seismicGuideEvidence).toEqual(record);
    expect(state).toMatchObject(writing);
    const savedState = JSON.parse(JSON.stringify(state));
    act(() => root.unmount()); root = null; host.remove();
    const restoredRecord = { ...record, budget: { initialJPerKg: 999999, remainingJPerKg: 999999 } };
    mount({ ...savedState, tab: 'print', seismicEnabled: false, seismicGuideEvidence: restoredRecord });
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report).toBeTruthy();
    expect(checkGuideEnergy(record.referenceInputs, record.currentInputs, record.timeS, 'recorded')).toEqual(original);
    expect(guideEnergyFigure('recorded').textContent).toBe(savedText);
    expect(report.textContent).not.toContain('999999');
    expect(report.querySelector('[data-guide-readings="recorded"] > p strong').textContent).toBe('Shared inspection time: 21.217 s');
    expect(report.querySelector('[data-guide-comparison-context]').dataset.guideComparisonContext).toBe('confounded');
    expect(report.querySelector('button,input,select,textarea')).toBeNull();
    expect(state.seismicGuideEvidence).toEqual(restoredRecord);
    expect(state).toMatchObject(writing);
    expect(state.seismicTrials).toBeUndefined();
  });

  it('guide energy: keeps the guide pair independent of notebook choices, pinned intervals and scene fallback', () => {
    const records = [
      { version: 'bridge-seismic-v1', name: 'Stiff notebook A', timeS: 7.217,
        inputs: { archetype: 'stiff', groundFrequencyHz: 0.8, intensityG: 0.2, dampingRatio: 0.1 }, prediction: 'First saved prediction', observation: 'First saved explanation' },
      { version: 'bridge-seismic-v1', name: 'Flexible notebook A', timeS: 12.319,
        inputs: { archetype: 'flexible', groundFrequencyHz: 0.65, intensityG: 0.15, dampingRatio: 0.3 }, prediction: 'Second saved prediction', observation: 'Second saved explanation' }
    ];
    const writing = { seismicPrediction: 'Notebook prediction', seismicObservation: 'Notebook explanation',
      seismicScenePrediction: 'Scene prediction', seismicSceneNote: 'Scene explanation',
      seismicGuidePrediction: 'Guide prediction', seismicGuideClaim: 'Guide claim', seismicGuideReasoning: 'Guide reasoning' };
    mount({ ...writing, bridgeView: 'immersive', span: 42, seismicGuideOpen: true, seismicEnergyInterval: true,
      seismicIntervalPinS: 12.319, seismicTrials: records, seismicReferenceIndex: 0 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 21.217 });
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'kinetic' } }));
    const original = checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217);
    const originalText = guideEnergyFigure().textContent;
    const assertScope = () => {
      expect(checkGuideEnergy(state.seismicGuideBaseline.inputs, guideEnergyCurrentInputs(), 21.217)).toEqual(original);
      expect(guideEnergyFigure().textContent).toBe(originalText);
      expect(field('Interval evidence quantity').value).toBe('kinetic');
      expect(host.querySelector('[data-claim-window="interval"]').dataset.claimMeasureSource).toBe('manual');
      expect(state).toMatchObject({ ...writing, seismicTime: 21.217, seismicIntervalPinS: 12.319, span: 42 });
      expect(state.seismicTrials).toEqual(records);
      expect(state.seismicGuideEvidence).toBeUndefined();
    };
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    assertScope();
    click('A · reference'); assertScope();
    click('B · current'); assertScope();
    click('Compare saved trial in scene');
    click('A · reference'); assertScope();
    expect(state.seismicSceneSource).toBe('saved');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state.bridgeView).toBe('2d');
    assertScope();
  });

  const scenePose = overrides => ({ version: 'bridge-scene-v1', source: 'current', view: 'immersive', observer: 'bank',
    walkPos: 0.63, yaw: 27, pitch: -12, bankYaw: 18, bankPitch: -8, rotY: 46, rotX: 23, zoom: 1.4, ...overrides });
  const sceneTrial = overrides => ({ version: 'bridge-seismic-v1', name: 'My scene',
    inputs: { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 },
    timeS: 7.217, prediction: '', observation: 'Energy moves into the damper.', scene: scenePose(), ...overrides });

  function openRateHistory(origin='scene') { const detail=host.querySelector('[data-rate-history-disclosure="'+origin+'"]');expect(detail).toBeTruthy();act(()=>{detail.open=true;detail.dispatchEvent(new Event('toggle'));vi.advanceTimersByTime(0);});return detail; }
  it('rate history opens on demand, pauses motion and swaps endpoint roles without changing chronological evidence',()=>{
    mount({seismicEnergyInterval:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicSceneNote:'Keep scene note',seismicObservation:'Keep my explanation',bridgeBankYaw:18});expect(host.querySelector('[data-rate-history]')).toBeNull();patch({seismicPlaying:true,autoDriving:true});openRateHistory();
    const frame=()=>host.querySelector('[data-rate-history]'),lines=()=>[...frame().querySelectorAll('[data-rate-line]')].map(n=>n.getAttribute('points')),areas=()=>[...frame().querySelectorAll('[data-rate-area] path:first-child')].map(n=>n.getAttribute('d')),totals=()=>[...frame().querySelectorAll('[data-rate-total]')].map(n=>n.dataset.rateTotalValue),markers=()=>[...frame().querySelectorAll('[data-rate-marker]')].map(n=>n.dataset.rateMarkerValue);
    expect(frame().dataset).toMatchObject({rateHistoryStart:'7.217',rateHistoryEnd:'12.319',rateHistoryTrial:'current'});expect(frame().querySelectorAll('[data-rate-curve]')).toHaveLength(2);expect(state).toMatchObject({seismicPlaying:false,autoDriving:false,seismicTime:7.217,seismicIntervalPinS:12.319,seismicSceneNote:'Keep scene note',seismicObservation:'Keep my explanation',bridgeBankYaw:18});
    expect(frame().querySelector('[data-rate-pattern="input"]').textContent).toContain('positive and negative parts');expect(frame().querySelector('[data-rate-pattern="input"]').closest('[aria-hidden="true"]')).toBeNull();expect(frame().querySelector('[data-rate-view-help]').textContent).not.toContain('A and B');expect(frame().dataset.rateHistoryView).toBe('interval');const detailLines=lines(),detailTotals=totals();click('Full event');expect(frame().dataset.rateHistoryView).toBe('event');expect(totals()).toEqual(detailTotals);expect(lines()).not.toEqual(detailLines);click('Interval detail');expect(frame().dataset.rateHistoryView).toBe('interval');expect(lines()).toEqual(detailLines);const oldLines=lines(),oldAreas=areas(),oldTotals=totals(),oldMarkers=markers();click('Swap moments');expect(lines()).toEqual(oldLines);expect(areas()).toEqual(oldAreas);expect(totals()).toEqual(oldTotals);expect(markers()).toEqual([oldMarkers[1],oldMarkers[0],oldMarkers[3],oldMarkers[2]]);expect(frame().textContent).toContain('W/kg × s = J/kg');expect(frame().querySelector('[data-rate-history-provenance]').textContent).toContain('accumulated model work and loss');
  });
  it('rate history follows scene A/B with a shared range and stays open on current fallback',()=>{
    mount({seismicEnergyInterval:true,seismicGuideOpen:true,seismicSceneNote:'Keep scene draft',seismicIntervalPinS:7.217});click('Prepare 5% / 20% comparison');patch({seismicTime:12.319});openRateHistory();const frame=()=>host.querySelector('[data-rate-history]'),values=()=>[...frame().querySelectorAll('[data-rate-total]')].map(n=>n.dataset.rateTotalValue),current=values(),range=frame().dataset.rateHistoryRange;
    expect(frame().querySelector('[data-rate-view-help]').textContent).toContain('A and B also share');click('A · reference');expect(frame().dataset.rateHistoryTrial).toBe('reference');expect(frame().querySelector('[data-rate-history-caption]').textContent).toContain('A · reference');expect(frame().dataset.rateHistoryRange).toBe(range);expect(values()).not.toEqual(current);
    act(()=>{viewerStatus='failed';viewerListener?.('failed');});expect(frame().dataset.rateHistory).toBe('fallback');expect(frame().dataset.rateHistoryTrial).toBe('current');expect(values()).toEqual(current);expect(host.querySelector('[data-rate-history-disclosure="fallback"]').open).toBe(true);expect(frame().querySelector('[data-rate-history-caption]').textContent).toContain('Current experiment');expect(frame().querySelector('[data-rate-view-help]').textContent).not.toContain('A and B');expect(state).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicSceneSource:'guide',seismicTime:12.319,seismicIntervalPinS:7.217,seismicSceneNote:'Keep scene draft'});
  });
  it('rate history retains tiny values, coincident rates, nonnegative damping and exact zero',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicTime:7.217,seismicIntervalPinS:7.217,seismicIntensityG:0.000001});openRateHistory('fallback');const frame=()=>host.querySelector('[data-rate-history]');expect(frame().querySelector('[data-rate-history-coincident]')).toBeTruthy();expect(frame().querySelector('[data-rate-pattern]')).toBeNull();expect(frame().dataset.rateHistoryView).toBe('event');expect(button('Interval detail').disabled).toBe(true);expect(frame().querySelector('[data-rate-area]')).toBeNull();expect([...frame().querySelectorAll('[data-rate-total]')].every(n=>Number(n.dataset.rateTotalValue)===0)).toBe(true);expect([...frame().querySelectorAll('[data-rate-marker]')].some(n=>Number(n.dataset.rateMarkerValue)!==0)).toBe(true);expect(frame().querySelector('[data-rate-history-scientific-help]')).toBeTruthy();
    patch({seismicIntervalPinS:16,seismicTime:24,seismicDampingRatio:0});expect(frame().querySelector('[data-rate-curve="damping"] [data-rate-area]')).toBeNull();expect(Number(frame().querySelector('[data-rate-total="damping"]').dataset.rateTotalValue)).toBe(0);expect(frame().querySelector('[data-rate-pattern="damping"]').textContent).toContain('stays at zero');patch({seismicIntensityG:0});expect(frame().querySelector('[data-rate-pattern="input"]').textContent).toContain('stays at zero');expect(frame().querySelector('[data-rate-history-zero]')).toBeTruthy();expect(frame().querySelector('[data-rate-history-scale]')).toBeNull();expect(frame().querySelector('[data-rate-history-scientific-help]')).toBeNull();expect(frame().innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('rate history leaves records and printed interval totals independent of its transient disclosure',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicTime:12.319,seismicIntervalPinS:7.217,seismicTrialName:'Rates evidence',seismicObservation:'I can explain the signed area.'});openRateHistory('fallback');const totals=[...host.querySelectorAll('[data-rate-total]')].map(n=>n.dataset.rateTotalValue);click('Save earthquake trial');const record=state.seismicTrials[0];expect(record.investigation).toEqual({version:'bridge-energy-investigation-v1',pinTimeS:7.217});expect(Object.keys(record)).toEqual(['version','name','inputs','timeS','prediction','observation','investigation']);click('Open earthquake evidence report');expect(host.querySelector('[data-rate-history]')).toBeNull();const saved=host.querySelector('[data-seismic-trial] [data-investigation-evidence]');expect(saved.querySelector('[data-evidence-row="input"] td').dataset.evidenceValue).toBe(totals[0]);expect(saved.querySelector('[data-evidence-row="damping"] td').dataset.evidenceValue).toBe(totals[1]);expect(host.querySelector('[data-bridge-print-seismic]').querySelector('details,button,input,textarea,select')).toBeNull();expect(state.seismicObservation).toBe(record.observation);
  });
  it('force motion connects each selected scene trial to displayed velocity and spring/damping contributions',()=>{
    mount({seismicForceLens:true,seismicGuideOpen:true,seismicTime:7.217,seismicSceneNote:'Keep scene note',seismicEnergyInterval:true,seismicIntervalPinS:12.319});click('Prepare 5% / 20% comparison');patch({seismicTime:7.217});
    const block=()=>host.querySelector('[data-force-motion="scene"]'),mechanism=()=>host.querySelector('[data-force-motion="mechanism"]'),power=(node,id)=>Number(node.querySelector('[data-force-motion-contribution="'+id+'"]').dataset.forceMotionPower);
    function check(){const f=lastScene.forceLens;expect(Number(block().querySelector('[data-force-relative-speed]').dataset.forceRelativeSpeed)).toBe(f.velocityMps);expect(power(block(),'spring')).toBe(f.springNPerKg*f.velocityMps);expect(power(block(),'damping')).toBe(-f.dampingNPerKg*f.velocityMps);expect(block().dataset.forceMotionTime).toBe('7.217');expect(mechanism().querySelector('[data-force-motion-caption]').textContent).toContain('Current experiment · 7.217 s');}
    check();const current=power(mechanism(),'spring'),limit=lastScene.forceLens.limitNPerKg;click('A · reference');check();expect(block().querySelector('[data-force-motion-caption]').textContent).toContain('A · reference');expect(lastScene.forceLens.limitNPerKg).toBe(limit);expect(power(mechanism(),'spring')).toBe(current);expect(power(block(),'spring')).not.toBe(current);click('B · current');check();expect(block().dataset.forceMotionTrial).toBe('current');expect(power(block(),'spring')).toBe(current);expect(state).toMatchObject({seismicTime:7.217,seismicSceneNote:'Keep scene note',seismicIntervalPinS:12.319});
  });
  it('force motion distinguishes estimated turning and center moments without erasing tiny response directions',()=>{
    mount({seismicForceLens:true,seismicEnergyOrbit:true,seismicTime:16.01});const block=()=>host.querySelector('[data-force-motion="scene"]');
    click('Next turning point');expect(block().dataset.forceMotionKind).toBe('stationary');expect(block().querySelector('[data-force-motion-direction]').dataset.forceMotionDirection).toBe('0');expect(Math.abs(lastScene.forceLens.springNPerKg)).toBeGreaterThan(0);expect(block().textContent).toContain('displaced spring can still exert force');
    click('Next center crossing');expect(block().dataset.forceMotionKind).toBe('centered');expect(block().querySelector('[data-force-motion-direction]').dataset.forceMotionDirection).not.toBe('0');expect(lastScene.forceLens.dampingPowerWPerKg).toBeGreaterThan(0);expect(block().textContent).toContain('relative motion can continue');
    patch({seismicIntensityG:0.000001,seismicTime:16.01});click('Next turning point');expect(block().dataset.forceMotionKind).toBe('stationary');click('Next center crossing');expect(block().dataset.forceMotionKind).toBe('centered');expect(block().querySelector('[data-force-motion-direction]').dataset.forceMotionDirection).not.toBe('0');expect(block().querySelector('[data-force-motion-scientific-help]')).toBeTruthy();patch({seismicDampingRatio:0});expect(block().querySelector('[data-force-motion-damping]').dataset.forceMotionDamping).toBe('absent');expect(block().querySelector('[data-force-motion-contribution="damping"]').dataset.forceMotionPower).toBe('0');expect(block().textContent).toContain('damper exerts no force');
  });
  it('force motion preserves small signed forces, true chart scales and recalculated evidence in print',()=>{
    mount({seismicForceLens:true,seismicSceneRecording:true,seismicIntensityG:0.000001,seismicTime:7.217});const block=()=>host.querySelector('[data-force-motion="scene"]');
    const lines=()=>[...host.querySelectorAll('[data-force-plot] [data-force-arrow]')].map(group=>[...group.querySelectorAll('line')].map(line=>Number(line.getAttribute('x2')))),small=lines(),limit=lastScene.forceLens.limitNPerKg;
    expect(limit).toBeLessThan(0.001);expect([...host.querySelectorAll('[data-force-reading]')].every(node=>node.textContent.match(/e-\d/))).toBe(true);expect([...host.querySelectorAll('[data-mechanism-force]')].every(node=>node.textContent.match(/e-\d/))).toBe(true);expect(block().querySelector('[data-force-relative-speed]').textContent).toMatch(/e-\d/);const kind=block().dataset.forceMotionKind,direction=block().querySelector('[data-force-motion-direction]').dataset.forceMotionDirection;
    patch({seismicIntensityG:0.12});expect(lastScene.forceLens.limitNPerKg/limit).toBeCloseTo(120000,7);lines().forEach((row,i)=>row.forEach((x,j)=>expect(x).toBeCloseTo(small[i][j],9)));expect(block().dataset.forceMotionKind).toBe(kind);expect(block().querySelector('[data-force-motion-direction]').dataset.forceMotionDirection).toBe(direction);
    patch({seismicIntensityG:0.000001});click('Save scene observation');const record=state.seismicTrials[0],saved=host.querySelector('[data-seismic-scene-forces]').textContent;expect(saved).toMatch(/e-\d/);patch({seismicTrials:[{...record,forces:{springNPerKg:999999}}]});click('Open earthquake evidence report');expect(host.querySelector('[data-bridge-print-seismic] [data-seismic-scene-forces]').textContent).toBe(saved);expect(host.querySelector('[data-bridge-print-seismic]').textContent).not.toContain('999999');
    const zero=sceneTrial({name:'Zero reference',inputs:{archetype:'balanced',groundFrequencyHz:1.1,intensityG:0,dampingRatio:0.05}});
    patch({tab:'build',seismicTrials:[zero],seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'current'});expect(lastScene.forceLens.limitNPerKg).toBe(limit);lines().forEach((row,i)=>row.forEach((x,j)=>expect(x).toBeCloseTo(small[i][j],9)));expect(block().dataset.forceMotionTrial).toBe('current');
    click('A · reference');expect(lastScene.forceLens.limitNPerKg).toBe(limit);expect(lastScene.forceLens.springNPerKg===0).toBe(true);expect(lastScene.forceLens.dampingNPerKg===0).toBe(true);expect(block().dataset.forceMotionKind).toBe('rest');
    click('B · current');expect(lastScene.forceLens.limitNPerKg).toBe(limit);expect(block().dataset.forceMotionKind).toBe(kind);
    const tiny=sceneTrial({name:'Tiny reference',inputs:{archetype:'balanced',groundFrequencyHz:1.1,intensityG:0.000001,dampingRatio:0.05}});patch({seismicTrials:[tiny],seismicIntensityG:0,seismicSceneTrial:'reference'});expect(lastScene.forceLens.limitNPerKg).toBe(limit);expect(block().dataset.forceMotionKind).toBe(kind);lines().forEach((row,i)=>row.forEach((x,j)=>expect(x).toBeCloseTo(small[i][j],9)));
    click('B · current');expect(lastScene.forceLens.limitNPerKg).toBe(limit);expect(block().dataset.forceMotionKind).toBe('rest');
  });
  it('force motion retains investigation state and uses current contributions after graphics loss and zero input',()=>{
    media.change(true);mount({bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicForceLens:true,seismicTime:7.217,seismicTrialName:'Force reference',seismicSceneNote:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'});
    const scene=host.querySelector('[data-force-motion="scene"]'),a=scene.querySelector('[data-force-motion-contribution="damping"]').dataset.forceMotionPower;act(()=>{viewerStatus='failed';viewerListener?.('failed');});const fallback=()=>host.querySelector('[data-force-motion="fallback"]'),mechanism=()=>host.querySelector('[data-force-motion="mechanism"]');expect(fallback().dataset.forceMotionTrial).toBe('current');expect(fallback().querySelector('[data-force-motion-contribution="damping"]').dataset.forceMotionPower).not.toBe(a);expect(fallback().querySelector('[data-force-motion-contribution="damping"]').dataset.forceMotionPower).toBe(mechanism().querySelector('[data-force-motion-contribution="damping"]').dataset.forceMotionPower);
    patch({seismicIntensityG:0});for(const block of [fallback(),mechanism()]){expect(block.dataset.forceMotionKind).toBe('rest');expect(block.querySelector('[data-force-motion-direction]').dataset.forceMotionDirection).toBe('0');expect([...block.querySelectorAll('[data-force-motion-contribution]')].every(n=>Number(n.dataset.forceMotionPower)===0)).toBe(true);expect(block.querySelector('[data-force-motion-scientific-help]')).toBeNull();}expect(state).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',bridgeBankYaw:18,seismicTime:7.217,seismicSceneNote:'Keep explanation',seismicIntervalPinS:12.319});
  });

  // Check the bridge-shaped diagram against the native, unrounded readings.
  // This does not call the rendering frame helper: the expected gap comes from
  // subtracting the two physical positions on their common coordinate axis.
  function checkMotionPositionDiagram() {
    const frame = host.querySelector('[data-motion-frame]');
    const figure = frame.querySelector('[data-motion-position-diagram]');
    const svg = figure.querySelector('[data-motion-position-svg]');
    const range = Number(frame.dataset.motionRangeM);
    const values = Object.fromEntries([...frame.querySelectorAll('[data-motion-reading]')]
      .map(node => [node.dataset.motionReading, Number(node.dataset.motionValueM)]));
    const expectedX = Object.fromEntries(['ground', 'deck'].map(id => [id, 200 + values[id] / range * 160]));
    expect(figure.dataset.motionPositionDiagram).toBe(frame.dataset.motionFrame);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('viewBox')).toBe('0 0 400 104');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg.querySelector('button,input,select,textarea,animate,animateTransform')).toBeNull();
    expect(figure.querySelectorAll('[data-motion-position-glyph]')).toHaveLength(2);
    expect(svg.querySelector('[data-motion-position-glyph]')).toBeNull();
    // The main diagram stretches its coordinate axis to fit the panel. Marker
    // shapes live beside it so a narrow phone cannot turn the circle into an oval.
    expect(svg.parentElement.style.position).toBe('relative');
    expect(svg.parentElement.style.height).toBe('104px');
    expect(svg.parentElement.getAttribute('aria-hidden')).toBe('true');
    expect(figure.querySelector('[data-motion-position-labels]').closest('[aria-hidden="true"]')).toBeNull();
    expect(figure.querySelector('[data-motion-position-scope]').closest('[aria-hidden="true"]')).toBeNull();
    expect(figure.textContent).toContain('Across the bridge · position diagram');
    expect(figure.textContent).toContain('one sway mode');
    expect(figure.textContent).toContain('member deformation');
    expect(figure.textContent).toContain('damage');
    expect(svg.textContent).not.toContain('Across the bridge');
    const rest = svg.querySelector('[data-motion-position-rest]');
    expect(Number(rest.getAttribute('x1'))).toBe(200);
    expect(Number(rest.getAttribute('x2'))).toBe(200);
    for (const id of ['ground', 'deck']) {
      const y = id === 'deck' ? 16 : 56;
      const resting = svg.querySelector('[data-motion-resting-shape="' + id + '"]');
      expect([...['x', 'y', 'width', 'height']].map(name => Number(resting.getAttribute(name)))).toEqual([172, y, 56, 12]);
      const body = svg.querySelector('[data-motion-position-body="' + id + '"]');
      const percent = Number(body.dataset.motionPositionPercent);
      expect(percent).toBeCloseTo(50 + values[id] / range * 40, 12);
      const transform = body.getAttribute('transform').match(/^translate\(([^ ]+) 0\)$/);
      expect(transform).toBeTruthy();
      expect(Number(transform[1])).toBeCloseTo(expectedX[id], 11);
      const slab = body.querySelector('rect');
      expect(['x', 'y', 'width', 'height'].map(name => Number(slab.getAttribute(name)))).toEqual([-28, y, 56, 12]);
      const glyph = figure.querySelector('[data-motion-position-glyph="' + id + '"]');
      expect(glyph.parentElement).toBe(svg.parentElement);
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
      expect(glyph.getAttribute('focusable')).toBe('false');
      expect(glyph.getAttribute('viewBox')).toBe('0 0 16 16');
      expect(glyph.getAttribute('width')).toBe('16');
      expect(glyph.getAttribute('height')).toBe('16');
      expect(glyph.getAttribute('preserveAspectRatio')).not.toBe('none');
      expect(glyph.style.position).toBe('absolute');
      expect(parseFloat(glyph.style.left)).toBeCloseTo(percent, 12);
      expect(glyph.style.left.endsWith('%')).toBe(true);
      expect(glyph.style.top).toBe(id === 'deck' ? '22px' : '62px');
      expect(glyph.style.transform).toBe('translate(-50%,-50%)');
      expect(glyph.style.width).not.toBe('100%');
      expect(glyph.style.height).not.toBe('100%');
      expect(body.querySelector('circle,path,ellipse')).toBeNull();
      if (id === 'ground') {
        const circle = glyph.querySelector('circle');
        expect(['cx', 'cy', 'r'].map(name => Number(circle.getAttribute(name)))).toEqual([8, 8, 6]);
        expect(glyph.querySelector('ellipse,path')).toBeNull();
      } else {
        const diamond = glyph.querySelector('path');
        expect(diamond.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number)).toEqual([8, 2, 6, 6, -6, 6, -6, -6]);
        expect(diamond.getAttribute('d').trim().endsWith('Z')).toBe(true);
        expect(glyph.querySelector('circle,ellipse')).toBeNull();
      }
      const projection = svg.querySelector('[data-motion-position-projection="' + id + '"]');
      expect(Number(projection.getAttribute('x1'))).toBeCloseTo(expectedX[id], 11);
      expect(Number(projection.getAttribute('x2'))).toBeCloseTo(expectedX[id], 11);
      expect(Number(projection.getAttribute('y1'))).toBe(id === 'deck' ? 34 : 74);
      expect(Number(projection.getAttribute('y2'))).toBe(90);
    }
    const gap = svg.querySelector('[data-motion-position-gap]');
    if (values.relative === 0) {
      expect(gap).toBeNull();
    } else {
      expect(gap).toBeTruthy();
      expect(Number(gap.dataset.motionRelativeM)).toBe(values.relative);
      const start = Number(gap.getAttribute('x1')), end = Number(gap.getAttribute('x2'));
      expect(start).toBeCloseTo(expectedX.ground, 11);
      expect(end).toBeCloseTo(expectedX.deck, 11);
      expect(Number(gap.getAttribute('y1'))).toBe(90);
      expect(Number(gap.getAttribute('y2'))).toBe(90);
      expect(Math.abs((end - start) * range / 160 - values.relative))
        .toBeLessThanOrEqual(Math.max(Math.abs(values.relative) * 1e-11, range * 1e-12));
      expect(gap.getAttribute('marker-start')).toBeNull();
      expect(gap.getAttribute('marker-end')).toBeNull();
    }
    return { groundX: expectedX.ground, deckX: expectedX.deck, relativeM: values.relative, rangeM: range,
      gapLength: gap ? Math.abs(Number(gap.getAttribute('x2')) - Number(gap.getAttribute('x1'))) : 0 };
  }

  it('motion position: renders on demand and remains available for deliberate reduced-motion inspection', () => {
    media.change(true);
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18, seismicTime: 7.217,
      seismicSceneNote: 'Keep my interpretation', seismicEnergyInterval: true, seismicIntervalPinS: 12.319 });
    expect(host.querySelector('[data-motion-position-diagram]')).toBeNull();
    expect(host.querySelector('[data-motion-position-svg]')).toBeNull();
    const disclosure = host.querySelector('[data-bridge-motion-guide="scene"]');
    act(() => { disclosure.open = true; disclosure.dispatchEvent(new Event('toggle')); vi.advanceTimersByTime(0); });
    expect(state.seismicMotionGuide).toBe(true);
    expect(host.querySelectorAll('[data-motion-position-diagram]')).toHaveLength(1);
    const original = checkMotionPositionDiagram();
    patch({ bridgeBankYaw: 90, bridgeBankPitch: -30 });
    expect(checkMotionPositionDiagram()).toEqual(original);
    expect(state).toMatchObject({ seismicTime: 7.217, seismicSceneNote: 'Keep my interpretation', seismicIntervalPinS: 12.319 });
    expect(state.seismicPlaying).not.toBe(true);
    patch({ seismicMotionGuide: false });
    expect(host.querySelector('[data-motion-position-diagram]')).toBeNull();
    expect(host.querySelector('[data-motion-position-svg]')).toBeNull();
    patch({ bridgeView: '2d', seismicMotionGuide: true });
    expect(checkMotionPositionDiagram()).toEqual(original);
    click('Step forward 0.5 s');
    checkMotionPositionDiagram();
    expect(host.querySelector('[data-motion-position-diagram]').dataset.motionPositionDiagram).toBe('7.717');
    expect(state.seismicPlaying).not.toBe(true);
    expect(state.seismicSceneNote).toBe('Keep my interpretation');
  });

  it('motion position: exact rest and zero input leave the relative gap empty without changing the reference', () => {
    mount({ seismicMotionGuide: true, seismicTime: 0 });
    const start = checkMotionPositionDiagram();
    expect(start).toMatchObject({ groundX: 200, deckX: 200, relativeM: 0, gapLength: 0 });
    expect(start.rangeM).toBeGreaterThan(0);
    patch({ seismicTime: 7.217 });
    const moving = checkMotionPositionDiagram();
    expect(moving.relativeM).not.toBe(0);
    expect(moving.gapLength).toBeGreaterThan(0);
    expect(moving.rangeM).toBe(start.rangeM);
    patch({ seismicIntensityG: 0, seismicTime: 24 });
    const zero = checkMotionPositionDiagram();
    expect(zero).toMatchObject({ groundX: 200, deckX: 200, relativeM: 0, gapLength: 0 });
    expect([...host.querySelectorAll('[data-motion-reading]')].every(node => node.textContent.endsWith('0.00 cm'))).toBe(true);
    expect(host.querySelector('[data-motion-position-svg]').innerHTML).not.toMatch(/NaN|Infinity/);
    expect(host.querySelector('[data-motion-position-rest]').getAttribute('x1')).toBe('200');
  });

  it('motion coherence keeps tiny signed readings and the normalized rails at the actual event scale',()=>{
    mount({seismicMotionGuide:true,seismicIntensityG:0.000001,seismicTime:7.217,seismicSceneNote:'Keep writing',seismicEnergyInterval:true,seismicIntervalPinS:12.319});
    const frame=()=>host.querySelector('[data-motion-frame]'),positions=()=>[...frame().querySelectorAll('[data-motion-segment]')].map(n=>[Number(n.dataset.motionStartPercent),Number(n.dataset.motionEndPercent)]);
    expect(frame().querySelector('[data-motion-caption]').textContent).toContain('Current experiment · 7.217 s');
    expect(frame().querySelector('[data-motion-scientific-help]').textContent).toContain('2.5e-6 means 0.0000025');
    expect(frame().querySelector('[data-motion-range-caption]').textContent).toMatch(/e-\d/);
    for(const reading of frame().querySelectorAll('[data-motion-reading]')){const value=Number(reading.dataset.motionValueM);expect(reading.querySelector('strong').textContent).toMatch(/e-\d/);expect(reading.querySelector('strong').textContent.startsWith(value<0?'−':'+')).toBe(true);}
    const range=Number(frame().dataset.motionRangeM),small=positions(),smallDiagram=checkMotionPositionDiagram();expect(range).toBeLessThan(0.001);patch({seismicIntensityG:0.12});
    expect(Number(frame().dataset.motionRangeM)/range).toBeCloseTo(120000,7);positions().forEach((pair,i)=>pair.forEach((value,j)=>expect(value).toBeCloseTo(small[i][j],9)));
    const ordinaryDiagram=checkMotionPositionDiagram();expect(ordinaryDiagram.groundX).toBeCloseTo(smallDiagram.groundX,9);expect(ordinaryDiagram.deckX).toBeCloseTo(smallDiagram.deckX,9);expect(ordinaryDiagram.relativeM/smallDiagram.relativeM).toBeCloseTo(120000,7);
    const fixed=frame().dataset.motionRangeM;patch({seismicTime:24});expect(frame().dataset.motionRangeM).toBe(fixed);checkMotionPositionDiagram();expect(state).toMatchObject({seismicSceneNote:'Keep writing',seismicIntervalPinS:12.319});
  });
  it('motion coherence preserves the ground-to-deck gap and sign on a common coordinate axis',()=>{
    mount({seismicMotionGuide:true});const frame=()=>host.querySelector('[data-motion-frame]');let opposing=0,subtractive=0;
    for(const time of [0,1,3.5,7.217,8,8.633,9.083,10,12.319,16,24]){
      patch({seismicTime:time});const range=Number(frame().dataset.motionRangeM),ground=Number(frame().querySelector('[data-motion-reading="ground"]').dataset.motionValueM),deck=Number(frame().querySelector('[data-motion-reading="deck"]').dataset.motionValueM),relative=Number(frame().querySelector('[data-motion-reading="relative"]').dataset.motionValueM);
      const gap=frame().querySelector('[data-motion-segment="relative"]'),start=Number(gap.dataset.motionStartPercent),end=Number(gap.dataset.motionEndPercent);
      expect(start).toBeCloseTo(50+ground/range*40,12);expect(end).toBeCloseTo(50+deck/range*40,12);expect((end-start)*range/40).toBeCloseTo(relative,12);expect(parseFloat(gap.style.width)).toBeCloseTo(Math.abs(end-start),12);
      for(const marker of frame().querySelectorAll('[data-motion-marker]')){const percent=Number(marker.dataset.motionPositionPercent);expect(percent).toBeGreaterThanOrEqual(10-1e-9);expect(percent).toBeLessThanOrEqual(90+1e-9);expect(marker.getAttribute('width')).toBe('16');}
      checkMotionPositionDiagram();if(ground*deck<0)opposing++;if(ground*deck>0&&Math.abs(relative)<Math.max(Math.abs(ground),Math.abs(deck)))subtractive++;
    }
    expect(opposing).toBeGreaterThan(0);expect(subtractive).toBeGreaterThan(0);expect(frame().textContent).toContain('Relative = deck from rest − ground from rest.');expect(frame().textContent).toContain('Circle = ground; diamond = deck.');
  });
  it('motion coherence uses unequal scene A/B scales and returns to current measurements through zero input and graphics fallback',()=>{
    mount({bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicMotionGuide:true,seismicTime:7.217,seismicTrialName:'Large reference',seismicSceneNote:'Keep scene note',seismicEnergyInterval:true,seismicIntervalPinS:12.319});click('Save earthquake trial');const record=state.seismicTrials[0];
    patch({seismicIntensityG:0.000001,seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'current'});const frame=()=>host.querySelector('[data-motion-frame]'),reading=()=>frame().querySelector('[data-motion-reading="deck"]'),range=frame().dataset.motionRangeM,b=reading().dataset.motionValueM;
    const smallPairedDiagram=checkMotionPositionDiagram();expect(smallPairedDiagram.gapLength).toBeGreaterThan(0);expect(smallPairedDiagram.gapLength).toBeLessThan(0.01);
    expect(frame().dataset.motionSource).toBe('saved');expect(frame().querySelector('[data-motion-caption]').textContent).toContain('B · current · 7.217 s');click('A · reference');expect(frame().querySelector('[data-motion-caption]').textContent).toContain('A · reference · 7.217 s');expect(frame().dataset.motionRangeM).toBe(range);expect(reading().dataset.motionValueM).not.toBe(b);const a=reading().dataset.motionValueM,aDiagram=checkMotionPositionDiagram();expect(aDiagram.gapLength).toBeGreaterThan(smallPairedDiagram.gapLength);
    patch({bridgeBankYaw:90});expect(reading().dataset.motionValueM).toBe(a);expect(checkMotionPositionDiagram()).toEqual(aDiagram);expect(state.seismicTime).toBe(7.217);
    act(()=>{viewerStatus='failed';viewerListener?.('failed');});expect(frame().dataset.motionTrial).toBe('current');expect(frame().dataset.motionSource).toBe('current');expect(reading().dataset.motionValueM).toBe(b);expect(Number(frame().dataset.motionRangeM)).toBeLessThan(Number(range));expect(frame().querySelector('[data-motion-caption]').textContent).toContain('Current experiment');const fallbackDiagram=checkMotionPositionDiagram();expect(fallbackDiagram.relativeM).toBe(smallPairedDiagram.relativeM);expect(fallbackDiagram.gapLength).toBeGreaterThan(smallPairedDiagram.gapLength);
    patch({seismicIntensityG:0});expect(frame().dataset.motionMaximumM).toBe('0');expect(frame().querySelector('[data-motion-range-caption]')).toBeNull();expect(frame().querySelector('[data-motion-scientific-help]')).toBeNull();expect(frame().querySelector('[data-motion-zero]').textContent).toContain('stay at rest');expect([...frame().querySelectorAll('[data-motion-marker]')].every(n=>n.dataset.motionPositionPercent==='50')).toBe(true);expect([...frame().querySelectorAll('[data-motion-reading]')].every(n=>n.textContent.endsWith('0.00 cm'))).toBe(true);
    checkMotionPositionDiagram();expect(host.querySelector('[data-motion-position-gap]')).toBeNull();expect(state).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',bridgeBankYaw:90,seismicSceneNote:'Keep scene note',seismicIntervalPinS:12.319,seismicTime:7.217});expect(state.seismicTrials[0]).toEqual(record);
  });

  it('recorded maxima inspect notebook A and current B at exact shared times while preserving the scene and investigation',()=>{
    mount({bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,seismicDampingRatio:0.1,seismicTrialName:'Notebook A',seismicTime:2,seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation',seismicScenePrediction:'Keep scene prediction',seismicSceneNote:'Keep scene note',seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicGuideOpen:true});click('Save earthquake trial');const record=state.seismicTrials[0];click('Prepare 5% / 20% comparison');click('A · reference');click('Compare on timeline');
    const guide=()=>host.querySelector('[data-seismic-recorded-peak-guide]'),frame=()=>host.querySelector('[data-seismic-compare-frame]'),snapshot=()=>({...state,seismicTime:undefined,seismicPlaying:undefined,autoDriving:undefined});const before=snapshot();expect(guide().textContent).toContain('Notebook A');expect(state).toMatchObject({seismicSceneSource:'guide',seismicSceneTrial:'reference'});
    for(const id of ['reference','current']){const peak=guide().querySelector('[data-recorded-peak-trial="'+id+'"]'),time=Number(peak.dataset.recordedPeakTime),magnitude=Number(peak.dataset.recordedPeakMagnitude);expect(time).not.toBe(record.timeS);patch({seismicPlaying:true,autoDriving:true});act(()=>peak.querySelector('button').click());expect(state.seismicTime).toBe(time);expect(state).toMatchObject({seismicPlaying:false,autoDriving:false});expect(snapshot()).toEqual(before);expect(document.activeElement).toBe(host.querySelector('[data-seismic-chart-slider]'));expect(Math.abs(Number(frame().querySelector('[data-seismic-compare-value="'+id+'"]').dataset.comparisonFrameValue))).toBeCloseTo(magnitude,14);expect(host.querySelector('[data-seismic-chart-slider]').getAttribute('aria-valuetext')).toContain(time.toFixed(3)+' s');}expect(state.seismicTrials[0]).toEqual(record);
  });
  it('recorded maxima follow the selected comparison measure and reference while fixed markers survive time inspection',()=>{
    mount({bridgeView:'2d',seismicTrialName:'First reference'});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicTrialName:'Second reference'});click('Save earthquake trial');patch({seismicDampingRatio:0.1});click('Compare on timeline');
    const guide=()=>host.querySelector('[data-seismic-recorded-peak-guide]'),markers=()=>[...host.querySelectorAll('[data-recorded-peak-marker]')].map(n=>[n.dataset.recordedPeakTime,n.dataset.recordedPeakValue,n.innerHTML]);
    for(const measure of ['relative','acceleration','stored']){act(()=>Simulate.change(field('Comparison measure'),{target:{value:measure}}));expect(guide().dataset.seismicRecordedPeakGuide).toBe(measure);expect(markers()).toHaveLength(2);const before=markers();patch({seismicTime:21.217});expect(markers()).toEqual(before);for(const id of ['reference','current']){const peak=guide().querySelector('[data-recorded-peak-trial="'+id+'"]');act(()=>peak.querySelector('button').click());const value=Number(host.querySelector('[data-seismic-compare-value="'+id+'"]').dataset.comparisonFrameValue);expect(Math.abs(value)).toBeCloseTo(Number(peak.dataset.recordedPeakMagnitude),14);expect(Number(host.querySelector('[data-recorded-peak-marker="'+id+'"]').dataset.recordedPeakValue)).toBe(value);}}const oldA=guide().querySelector('[data-recorded-peak-trial="reference"]').dataset.recordedPeakMagnitude,oldB=guide().querySelector('[data-recorded-peak-trial="current"]').dataset.recordedPeakMagnitude;patch({seismicReferenceIndex:1});expect(guide().textContent).toContain('Second reference');expect(guide().querySelector('[data-recorded-peak-trial="reference"]').dataset.recordedPeakMagnitude).not.toBe(oldA);expect(guide().querySelector('[data-recorded-peak-trial="current"]').dataset.recordedPeakMagnitude).toBe(oldB);click('Energy over time');expect(guide()).toBeNull();expect(host.querySelector('[data-recorded-peak-marker]')).toBeNull();
  });
  it('recorded maxima distinguish zero histories from tiny signed readings and use the actual shared chart scale',()=>{
    mount({bridgeView:'2d',seismicIntensityG:0});click('Save earthquake trial');click('Compare on timeline');const guide=()=>host.querySelector('[data-seismic-recorded-peak-guide]');expect([...guide().querySelectorAll('button')].every(n=>n.disabled)).toBe(true);expect(guide().querySelectorAll('[data-recorded-peak-time]')).toHaveLength(0);expect(host.querySelector('[data-recorded-peak-marker]')).toBeNull();expect(guide().querySelectorAll('[data-recorded-peak-zero]')).toHaveLength(2);expect(guide().textContent).not.toMatch(/NaN|Infinity/);
    patch({seismicIntensityG:0.000001});const current=guide().querySelector('[data-recorded-peak-trial="current"]');expect(current.querySelector('button').disabled).toBe(false);expect(guide().querySelector('[data-recorded-peak-trial="reference"] button').disabled).toBe(true);expect(current.textContent).toMatch(/e-\d/);expect(guide().querySelector('[data-recorded-peak-scientific-help]')).toBeTruthy();act(()=>current.querySelector('button').click());expect(host.querySelector('[data-seismic-compare-value="current"]').textContent).toMatch(/e-\d/);expect(host.querySelector('[data-bridge-seismic-timeline]').textContent).toContain('1.00e-6 g');const curve=()=>host.querySelector('[data-seismic-comparison-curves] polyline:last-of-type').getAttribute('points'),small=curve();patch({seismicIntensityG:0.12});expect(curve()).toBe(small);expect(host.querySelector('[data-recorded-peak-marker="current"] path')).toBeTruthy();
  });
  it('recorded maxima preserve exact inspection and notebook provenance through graphics fallback',()=>{
    mount({bridgeView:'immersive',seismicTrialName:'Saved reference',seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:2});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'});click('Compare on timeline');const guide=()=>host.querySelector('[data-seismic-recorded-peak-guide]'),before=guide().textContent;act(()=>guide().querySelector('[data-recorded-peak-shortcut="reference"]').click());const time=state.seismicTime;act(()=>{viewerStatus='failed';viewerListener?.('failed');});expect(state).toMatchObject({bridgeView:'2d',seismicSceneSource:'saved',seismicSceneTrial:'reference',seismicTime:time,seismicIntervalPinS:16});expect(guide().textContent).toBe(before);act(()=>guide().querySelector('[data-recorded-peak-shortcut="current"]').click());expect(state.bridgeView).toBe('2d');expect(state.seismicSceneTrial).toBe('reference');expect(document.activeElement).toBe(host.querySelector('[data-seismic-chart-slider]'));expect(Number(host.querySelector('[data-seismic-compare-frame]').dataset.seismicCompareFrame)).toBe(state.seismicTime);
  });

  it('claim interval follows exact current questions and does not inherit a different scene A window', () => {
    mount({ seismicTime: 7.217, seismicIntervalPinS: 12.319 });
    expect(host.querySelector('[data-claim-interval-select]')).toBeNull();
    patch({ seismicEnergyInterval: true });
    const interval = () => host.querySelector('[data-claim-window="interval"]');
    const select = () => field('Interval evidence quantity');
    expect(select()).toBe(interval().querySelector('[data-claim-interval-select]'));
    expect([...select().options].map(option => option.value)).toEqual(['question', 'input', 'damping', 'stored', 'kinetic', 'elastic']);
    expect(interval().dataset).toMatchObject({ claimIntervalMeasure: 'damping', claimMeasureSource: 'question' });
    expect(interval().querySelector('[data-claim-interval-question]')).toBeNull();
    for (const [label, question, measure] of [
      ['During shaking', 'shaking', 'input'], ['After shaking', 'settling', 'damping'],
      ['Elastic → kinetic', 'exchange', 'kinetic'], ['Ground removes energy', 'returning', 'input']
    ]) {
      click(label);
      expect(select().value).toBe('question');
      expect(interval().dataset).toMatchObject({ claimIntervalMeasure: measure, claimMeasureSource: 'question' });
      expect(interval().querySelector('[data-claim-interval-question]').dataset.claimIntervalQuestion).toBe(question);
      expect(interval().querySelector('[data-claim-interval-scope]').textContent).toContain('Current experiment');
    }
    patch({ seismicArchetype: 'flexible', seismicTrialName: 'A has a different cycle' });
    click('Save earthquake trial');
    patch({ seismicArchetype: 'balanced', seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'reference' });
    click('Elastic → kinetic');
    expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('exchange');
    expect(interval().querySelector('[data-claim-interval-question]')).toBeNull();
    expect(interval().querySelector('[data-claim-interval-scope]').textContent).toContain('B · current');
    expect(interval().querySelector('[data-claim-interval-scope]').textContent).toContain('Custom interval');
    expect(interval().dataset.claimIntervalMeasure).toBe('damping');
    click('B · current');
    click('Elastic → kinetic');
    expect(interval().querySelector('[data-claim-interval-question]').dataset.claimIntervalQuestion).toBe('exchange');
    expect(interval().dataset.claimIntervalMeasure).toBe('kinetic');
    patch({ seismicIntervalPinS: 7.217, seismicTime: 12.319 });
    expect(interval().querySelector('[data-claim-interval-question]')).toBeNull();
    expect(interval().dataset.claimIntervalMeasure).toBe('damping');
  });

  it('claim interval matches all five A/B table quantities across reversed, coincident, tiny and zero intervals', () => {
    mount({ bridgeView: '2d', seismicEnergyInterval: true, seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicTrialName: 'Reference evidence' });
    click('Save earthquake trial');
    patch({ seismicDampingRatio: 0.2 });
    const measures = ['input', 'damping', 'stored', 'kinetic', 'elastic'];
    const interval = () => host.querySelector('[data-claim-window="interval"]');
    function check(measure) {
      act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: measure } }));
      expect(interval().dataset).toMatchObject({ claimIntervalMeasure: measure, claimMeasureSource: 'manual' });
      const table = host.querySelector('[data-investigation-evidence="comparison"]');
      return ['reference', 'current'].map(trial => {
        const cell = interval().querySelector('[data-claim-trial="' + trial + '"]');
        const actual = Number(cell.dataset.claimValue), shown = cell.querySelector('strong').textContent;
        expect(actual).toBe(Number(table.querySelector('[data-evidence-row="' + measure + '"] [data-evidence-trial="' + trial + '"]').dataset.evidenceValue));
        if (measure === 'damping') {
          expect(actual).toBeGreaterThanOrEqual(0);
          expect(shown).not.toMatch(/^[+−-]/);
        } else if (actual !== 0) {
          expect(shown).toMatch(actual < 0 ? /^[−-]/ : /^\+/);
        }
        if (actual !== 0 && Math.abs(actual) < 0.001) expect(shown).toMatch(/e-\d/);
        return actual;
      });
    }
    const original = Object.fromEntries(measures.map(measure => [measure, check(measure)]));
    patch({ seismicTime: 12.319, seismicIntervalPinS: 7.217 });
    for (const measure of measures) expect(check(measure)).toEqual(original[measure]);
    patch({ seismicTime: 7.217 });
    for (const measure of measures) expect(check(measure)).toEqual([0, 0]);
    expect(interval().textContent).toContain('The two moments coincide');
    patch({ seismicTime: 12.319, seismicIntensityG: 0.000001,
      seismicTrials: state.seismicTrials.map(trial => ({ ...trial, inputs: { ...trial.inputs, intensityG: 0.000001 } })) });
    for (const measure of measures) {
      const pair = check(measure);
      expect(pair.every(value => value !== 0 && Math.abs(value) < 0.001)).toBe(true);
    }
    patch({ seismicDampingRatio: 0, seismicIntervalPinS: 16, seismicTime: 24 });
    expect(check('damping')[1]).toBe(0);
    expect(check('input')[1]).toBe(0);
    patch({ seismicIntensityG: 0 });
    for (const measure of measures) expect(check(measure)[1]).toBe(0);
    expect(interval().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('claim interval selection pauses motion and survives notebook, scene and graphics changes without editing evidence', () => {
    const writing = { seismicPrediction: 'Keep notebook prediction', seismicObservation: 'Keep notebook explanation',
      seismicScenePrediction: 'Keep scene prediction', seismicSceneNote: 'Keep scene note', seismicGuidePrediction: 'Keep guide prediction' };
    mount({ ...writing, bridgeView: 'immersive', span: 42, seismicTime: 7.217, seismicIntervalPinS: 12.319,
      seismicEnergyInterval: true, seismicTrialName: 'First reference' });
    click('Save earthquake trial');
    patch({ seismicDampingRatio: 0.2, seismicTrialName: 'Second reference' });
    click('Save earthquake trial');
    patch({ seismicDampingRatio: 0.1, seismicSceneCompare: true, seismicSceneSource: 'saved', seismicSceneTrial: 'current' });
    click('Run earthquake');
    const before = JSON.parse(JSON.stringify(state));
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'stored' } }));
    expect(state).toEqual({ ...before, seismicPlaying: false, autoDriving: false });
    const interval = () => host.querySelector('[data-claim-window="interval"]');
    const value = trial => interval().querySelector('[data-claim-trial="' + trial + '"]').dataset.claimValue;
    const a = value('reference'), b = value('current'), records = JSON.parse(JSON.stringify(state.seismicTrials));
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    expect(value('reference')).not.toBe(a);
    expect(value('current')).toBe(b);
    click('A · reference');
    expect(value('current')).toBe(b);
    click('B · current');
    expect(value('current')).toBe(b);
    patch({ autoDriving: true });
    const driving = JSON.parse(JSON.stringify(state));
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'stored' } }));
    expect(state).toEqual({ ...driving, seismicPlaying: false, autoDriving: false });
    click('A · reference');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state).toMatchObject({ ...writing, bridgeView: '2d', span: 42, seismicDampingRatio: 0.1,
      seismicTime: 7.217, seismicIntervalPinS: 12.319, seismicReferenceIndex: 1, seismicSceneTrial: 'reference' });
    expect(field('Interval evidence quantity').value).toBe('stored');
    expect(interval().dataset).toMatchObject({ claimIntervalMeasure: 'stored', claimMeasureSource: 'manual' });
    expect(value('current')).toBe(b);
    expect(state.seismicTrials).toEqual(records);
  });

  it('claim interval keeps a manual quantity across questions and resumes automatic choice only when requested', () => {
    mount({ bridgeView: '2d', seismicEnergyInterval: true, seismicPrediction: 'My own prediction', seismicObservation: 'My own claim' });
    const interval = () => host.querySelector('[data-claim-window="interval"]');
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'elastic' } }));
    for (const [label, question] of [['During shaking', 'shaking'], ['Ground removes energy', 'returning'], ['After shaking', 'settling'], ['Elastic → kinetic', 'exchange']]) {
      click(label);
      expect(field('Interval evidence quantity').value).toBe('elastic');
      expect(interval().dataset).toMatchObject({ claimIntervalMeasure: 'elastic', claimMeasureSource: 'manual' });
      expect(interval().querySelector('[data-claim-interval-question]').dataset.claimIntervalQuestion).toBe(question);
      expect(interval().querySelector('[data-claim-sentence-frame]').textContent).toContain('elastic energy changed by');
    }
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'question' } }));
    expect(interval().dataset).toMatchObject({ claimIntervalMeasure: 'kinetic', claimMeasureSource: 'question' });
    expect(interval().querySelector('[data-claim-sentence-frame]').textContent).toContain('kinetic energy changed by');
    click('After shaking');
    expect(interval().dataset.claimIntervalMeasure).toBe('damping');
    patch({ seismicTime: 20 });
    expect(interval().querySelector('[data-claim-interval-question]')).toBeNull();
    expect(interval().dataset).toMatchObject({ claimIntervalMeasure: 'damping', claimMeasureSource: 'question' });
    expect(state).toMatchObject({ seismicPrediction: 'My own prediction', seismicObservation: 'My own claim' });
    expect(state.seismicTrials).toBeUndefined();
  });

  it('claim interval prints the local choice while saved records and fresh disabled-model reports remain independent', () => {
    mount({ bridgeView: '2d', seismicEnergyInterval: true, seismicTrialName: 'Exchange evidence',
      seismicPrediction: 'Energy may move into motion.', seismicObservation: 'My saved explanation.' });
    click('Elastic → kinetic');
    click('Save earthquake trial');
    const record = JSON.parse(JSON.stringify(state.seismicTrials[0]));
    expect(Object.keys(record)).toEqual(['version', 'name', 'inputs', 'timeS', 'prediction', 'observation', 'investigation']);
    expect(record.investigation).toEqual({ version: 'bridge-energy-investigation-v1', pinTimeS: state.seismicIntervalPinS });
    const table = host.querySelector('[data-investigation-evidence="comparison"]');
    const expectedKinetic = ['reference', 'current'].map(trial => table.querySelector('[data-evidence-row="kinetic"] [data-evidence-trial="' + trial + '"]').dataset.evidenceValue);
    act(() => Simulate.change(field('Interval evidence quantity'), { target: { value: 'stored' } }));
    const values = () => [...host.querySelector('[data-claim-window="interval"]').querySelectorAll('[data-claim-value]')].map(node => node.dataset.claimValue);
    const selectedValues = values();
    click('Open earthquake evidence report');
    let report = host.querySelector('[data-claim-evidence="print"]');
    expect(report.querySelector('[data-claim-window="interval"]').dataset).toMatchObject({ claimIntervalMeasure: 'stored', claimMeasureSource: 'manual' });
    expect(values()).toEqual(selectedValues);
    expect(report.querySelector('details,button,input,textarea,select')).toBeNull();
    expect(state.seismicTrials[0]).toEqual(record);
    const savedState = JSON.parse(JSON.stringify(state));
    act(() => root.unmount()); root = null; host.remove();
    mount({ ...savedState, tab: 'print', seismicEnabled: false });
    report = host.querySelector('[data-claim-evidence="print"]');
    expect(report.querySelector('[data-claim-window="interval"]').dataset).toMatchObject({ claimIntervalMeasure: 'kinetic', claimMeasureSource: 'question' });
    expect(report.querySelector('[data-claim-interval-question]').dataset.claimIntervalQuestion).toBe('exchange');
    expect(values()).toEqual(expectedKinetic);
    expect(report.querySelector('details,button,input,textarea,select')).toBeNull();
    expect(state.seismicTrials[0]).toEqual(record);
    expect(state).toMatchObject({ seismicPrediction: record.prediction, seismicObservation: record.observation });
  });

  it('claim interval keeps saved damping context and tiny source readings independent of the live comparison and print state', () => {
    const writing = { seismicGuidePrediction: 'Compare the conditions.', seismicGuideClaim: 'My provisional claim.',
      seismicGuideReasoning: 'The original pair changed shaking too.', seismicPrediction: 'Notebook prediction', seismicObservation: 'Notebook explanation' };
    mount({ ...writing, seismicGuideOpen: true, seismicIntensityG: 0.000001, seismicFrequencyHz: 1.1 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicIntensityG: 0.000002, seismicFrequencyHz: 0.8, seismicTime: 7.217 });
    const readings = type => host.querySelector('[data-guide-readings="' + type + '"]');
    const context = type => readings(type).querySelector('[data-guide-comparison-context]').dataset.guideComparisonContext;
    expect(context('current')).toBe('confounded');
    expect(readings('current').querySelector('p strong').textContent).toBe('Shared inspection time: 7.217 s');
    click('Record paired evidence');
    const record = JSON.parse(JSON.stringify(state.seismicGuideEvidence));
    expect(Object.keys(record).sort()).toEqual(['currentInputs', 'referenceInputs', 'timeS', 'version']);
    expect(record).toMatchObject({ version: 'bridge-damping-evidence-v1', timeS: 7.217,
      referenceInputs: { intensityG: 0.000001, groundFrequencyHz: 1.1, dampingRatio: 0.05 },
      currentInputs: { intensityG: 0.000002, groundFrequencyHz: 0.8, dampingRatio: 0.2 } });
    const recordedText = readings('recorded').textContent;
    const numeric = () => [...readings('recorded').querySelectorAll('[data-guide-number]')].map(node => Number(node.dataset.guideNumber));
    const originalNumbers = numeric();
    function expectOriginalEvidence() {
      expect(context('recorded')).toBe('confounded');
      expect(readings('recorded').querySelector('p strong').textContent).toBe('Shared inspection time: 7.217 s');
      expect(readings('recorded').textContent).toBe(recordedText);
      expect(numeric()).toEqual(originalNumbers);
      expect(state.seismicGuideEvidence).toEqual(record);
      expect(state).toMatchObject(writing);
    }
    expectOriginalEvidence();
    expect(originalNumbers).toHaveLength(8);
    expect(originalNumbers.every(value => value !== 0 && Math.abs(value) < 0.001)).toBe(true);
    for (const node of readings('recorded').querySelectorAll('[data-guide-number]')) {
      expect(node.textContent).toMatch(/e-\d/);
      if (Number(node.dataset.guideNumber) < 0) expect(node.textContent).toMatch(/^[AB]: [−-]/);
    }
    expect(recordedText).toContain('1.00e-6 g');
    expect(recordedText).toContain('2.00e-6 g');
    expect(recordedText).toContain('0.80 Hz');
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.217 });
    const controlledBaseline = JSON.parse(JSON.stringify(state.seismicGuideBaseline));
    expect(context('current')).toBe('controlled');
    expect(readings('current').querySelector('p strong').textContent).toBe('Shared inspection time: 7.217 s');
    expectOriginalEvidence();
    patch({ seismicDampingRatio: 0.05 });
    expect(context('current')).toBe('identical');
    expectOriginalEvidence();
    patch({ seismicIntensityG: 0, seismicArchetype: 'stiff' });
    expect(state.seismicGuideBaseline.inputs.intensityG).toBeGreaterThan(0);
    expect(context('current')).toBe('zero');
    const zeroContext = 'This pair cannot isolate damping because one or both trials have no shaking.';
    expect(readings('current').querySelector('[data-guide-comparison-context]').textContent).toBe(zeroContext);
    expectOriginalEvidence();
    patch({ seismicGuideBaseline: { ...controlledBaseline, inputs: { ...controlledBaseline.inputs, intensityG: 0 } } });
    expect(state.seismicGuideBaseline.inputs.intensityG).toBe(0);
    expect(state.seismicIntensityG).toBe(0);
    expect(context('current')).toBe('zero');
    expect(readings('current').querySelector('[data-guide-comparison-context]').textContent).toBe(zeroContext);
    expect([...readings('current').querySelectorAll('[data-guide-number]')].every(node => Number(node.dataset.guideNumber) === 0)).toBe(true);
    expectOriginalEvidence();
    patch({ seismicGuideBaseline: { ...controlledBaseline, inputs: { ...controlledBaseline.inputs } },
      seismicArchetype: controlledBaseline.inputs.archetype, seismicFrequencyHz: controlledBaseline.inputs.groundFrequencyHz,
      seismicIntensityG: controlledBaseline.inputs.intensityG, seismicDampingRatio: 0.2 });
    expect(context('current')).toBe('controlled');
    expectOriginalEvidence();
    const savedState = JSON.parse(JSON.stringify(state));
    act(() => root.unmount()); root = null; host.remove();
    mount({ ...savedState, tab: 'print', seismicEnabled: false });
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report).toBeTruthy();
    expectOriginalEvidence();
    expect(report.querySelector('details,button,input,textarea,select')).toBeNull();
    expect(state.seismicTrials).toBeUndefined();
  });

  it('claim evidence separates event, moment and optional interval without changing notebook writing',()=>{
    mount({bridgeView:'2d',seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'My prediction',seismicObservation:'My explanation'});
    const guide=()=>host.querySelector('[data-claim-evidence]'),value=id=>Number(guide().querySelector('[data-claim-window="'+id+'"] [data-claim-value]').dataset.claimValue);
    expect(host.querySelector('[data-claim-evidence-disclosure]').open).toBe(false);expect(guide().querySelectorAll('[data-claim-window]')).toHaveLength(3);expect(guide().querySelectorAll('[data-claim-trial="reference"]')).toHaveLength(0);expect(guide().querySelector('[data-claim-interval-missing]')).toBeTruthy();expect(guide().querySelector('[data-claim-window="interval"] [data-claim-value]')).toBeNull();expect(guide().querySelector('[data-claim-window="moment"]').dataset).toMatchObject({claimStart:'7.217',claimEnd:'7.217'});
    expect(value('moment')).toBe(Number(host.querySelector('[data-energy-map-amount="stored"]').dataset.energyValue));const event=value('event'),moment=value('moment');patch({seismicTime:16});expect(value('event')).toBe(event);expect(value('moment')).not.toBe(moment);expect(guide().querySelector('[data-claim-window="moment"] [data-claim-window-time]').textContent).toBe('16.000 s');expect(guide().querySelector('button,input,textarea,select,[role="slider"]')).toBeNull();expect(state).toMatchObject({seismicPrediction:'My prediction',seismicObservation:'My explanation',seismicIntervalPinS:12.319});expect(state.seismicTrials).toBeUndefined();
  });
  it('claim evidence uses notebook A and current B at shared moments and chronological interval bounds',()=>{
    mount({bridgeView:'immersive',seismicTrialName:'First notebook reference',seismicTime:7.217});const expectedReferenceMoment=Number(host.querySelector('[data-energy-map-amount="stored"]').dataset.energyValue);patch({seismicTime:2});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicTrialName:'Second notebook reference',seismicTime:5});click('Save earthquake trial');patch({seismicDampingRatio:0.1,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217,seismicGuideOpen:true});click('Prepare 5% / 20% comparison');patch({seismicDampingRatio:0.1,seismicTime:7.217,seismicIntervalPinS:12.319});click('A · reference');
    const guide=()=>host.querySelector('[data-claim-evidence]'),read=(window,trial)=>Number(guide().querySelector('[data-claim-window="'+window+'"] [data-claim-trial="'+trial+'"]').dataset.claimValue),pair=()=>host.querySelector('[data-investigation-evidence="comparison"]');
    expect(state).toMatchObject({seismicSceneSource:'guide',seismicSceneTrial:'reference'});expect(guide().querySelector('[data-claim-reference]').textContent).toContain('First notebook reference');expect(guide().querySelector('[data-claim-window="interval"]').dataset).toMatchObject({claimStart:'7.217',claimEnd:'12.319'});for(const id of ['reference','current'])expect(read('interval',id)).toBe(Number(pair().querySelector('[data-evidence-row="damping"] [data-evidence-trial="'+id+'"]').dataset.evidenceValue));expect(read('moment','current')).toBe(Number(host.querySelector('[data-energy-map-amount="stored"]').dataset.energyValue));
    expect(read('moment','reference')).toBe(expectedReferenceMoment);const a=read('moment','reference'),b=read('moment','current'),loss=read('interval','current');patch({seismicReferenceIndex:1});expect(guide().querySelector('[data-claim-reference]').textContent).toContain('Second notebook reference');expect(read('moment','reference')).not.toBe(a);expect(read('moment','current')).toBe(b);patch({seismicTime:12.319,seismicIntervalPinS:7.217});expect(read('interval','current')).toBe(loss);patch({seismicTime:7.217});expect(guide().textContent).toContain('The two moments coincide');expect(read('interval','reference')).toBe(0);expect(read('interval','current')).toBe(0);
  });
  it('claim evidence retains tiny nonzero readings and distinguishes zero damping and zero input',()=>{
    mount({bridgeView:'2d',seismicTime:24,seismicEnergyInterval:true,seismicIntervalPinS:16,seismicDampingRatio:0,seismicIntensityG:0.000001});const guide=()=>host.querySelector('[data-claim-evidence]'),read=id=>guide().querySelector('[data-claim-window="'+id+'"] [data-claim-value]');expect(Number(read('event').dataset.claimValue)).toBeGreaterThan(0);expect(read('event').textContent).toMatch(/e-\d/);expect(Number(read('moment').dataset.claimValue)).toBeGreaterThan(0);expect(read('interval').textContent).toContain('0.000 J/kg');expect(guide().querySelector('[data-claim-scientific-help]').textContent).toContain('2.5e-6 means 0.0000025');expect(guide().textContent).not.toMatch(/NaN|Infinity/);patch({seismicIntensityG:0});expect([...guide().querySelectorAll('[data-claim-value]')].every(n=>Number(n.dataset.claimValue)===0)).toBe(true);expect(guide().querySelector('[data-claim-scientific-help]')).toBeNull();expect(guide().querySelector('[data-claim-interval-missing]')).toBeNull();
  });
  it('claim evidence prints recalculated current-draft values with the model disabled and keeps saved notes intact',()=>{
    mount({bridgeView:'2d',seismicTrialName:'Print notebook reference',seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24,seismicObservation:'My original saved explanation'});click('Save earthquake trial');const record=state.seismicTrials[0];patch({seismicDampingRatio:0.2,seismicObservation:'My current draft explanation'});const values=[...host.querySelector('[data-claim-evidence]').querySelectorAll('[data-claim-value]')].map(n=>n.dataset.claimValue);
    act(()=>root.unmount());root=null;host.remove();mount({tab:'print',seismicEnabled:false,seismicTrials:[{...record,evidence:{stored:999999}}],seismicDampingRatio:0.2,seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24,seismicObservation:'My current draft explanation'});const guide=host.querySelector('[data-claim-evidence="print"]');expect([...guide.querySelectorAll('[data-claim-value]')].map(n=>n.dataset.claimValue)).toEqual(values);expect(guide.closest('[data-notebook-print-draft]')).toBeTruthy();expect(guide.querySelector('details,button,input,textarea,select')).toBeNull();expect(guide.textContent).not.toContain('999999');expect(host.querySelector('[data-seismic-trial="0"]').textContent).toContain('My original saved explanation');expect(state.seismicObservation).toBe('My current draft explanation');
  });

  it('energy accounting ties the current input to its stored and dissipated energy on one fixed event scale', () => {
    mount({bridgeView:'2d',seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});
    const ledger=()=>host.querySelector('[data-seismic-energy-accounting]'),amount=id=>Number(ledger().querySelector('[data-energy-balance-total="'+id+'"]').dataset.energyValue),mapAmount=id=>Number(host.querySelector('[data-energy-map-amount="'+id+'"]').dataset.energyValue);
    expect(ledger().dataset.seismicEnergyAccounting).toBe('current');expect(ledger().dataset.energyAccountingTime).toBe('7.217');const scale=ledger().dataset.energyBalanceScale;
    expect(amount('input')).toBe(mapAmount('input'));expect(amount('accounted')).toBeCloseTo(mapAmount('stored')+mapAmount('damping'),14);expect(ledger().querySelector('[data-energy-balance-equation]').textContent).toContain('≈');expect(ledger().querySelector('[data-energy-balance-details] summary').textContent).toBe('Why use ≈?');
    const parts=[...ledger().querySelectorAll('[data-energy-balance-row="accounted"] [data-energy-balance-part]')];expect(parts.map(p=>p.dataset.energyBalancePart)).toEqual(['kinetic','elastic','damping']);expect(parts.reduce((sum,p)=>sum+Number(p.dataset.energyValue),0)).toBe(amount('accounted'));expect(parts.reduce((sum,p)=>sum+parseFloat(p.style.width),0)).toBeCloseTo(100,12);expect(Number(ledger().querySelector('[data-energy-balance-residual]').dataset.energyBalanceResidual)).toBeCloseTo(amount('input')-amount('accounted'),14);
    patch({seismicTime:16});const input=amount('input'),stored=mapAmount('stored'),loss=mapAmount('damping');patch({seismicTime:24});expect(ledger().dataset.energyBalanceScale).toBe(scale);expect(amount('input')).toBe(input);expect(mapAmount('stored')).toBeLessThan(stored);expect(mapAmount('damping')).toBeGreaterThan(loss);expect(amount('accounted')).toBeCloseTo(input,7);expect(state).toMatchObject({seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});
  });
  it('energy accounting distinguishes zero input from tiny nonzero energy without hiding its proportions', () => {
    mount({bridgeView:'2d',seismicTime:7.217,seismicIntensityG:0});const ledger=()=>host.querySelector('[data-seismic-energy-accounting]'),map=()=>host.querySelector('[data-seismic-energy-map]');expect(ledger().dataset.energyBalanceMaximum).toBe('0');expect([...ledger().querySelectorAll('[data-energy-balance-bar]')].every(n=>n.style.width==='0%')).toBe(true);expect([...ledger().querySelectorAll('[data-energy-balance-part]')].every(n=>n.style.width==='0%')).toBe(true);expect(map().querySelector('[data-energy-map-scientific-help]')).toBeNull();expect(ledger().textContent).toContain('All bars are empty');expect(map().textContent).not.toMatch(/NaN|Infinity/);
    patch({seismicIntensityG:0.12});const ordinaryWidth=ledger().querySelector('[data-energy-balance-bar="input"]').style.width;expect(map().querySelector('[data-energy-map-scientific-help]')).toBeNull();patch({seismicIntensityG:0.000001});expect(Number(ledger().dataset.energyBalanceMaximum)).toBeGreaterThan(0);expect(Number(ledger().dataset.energyBalanceScale)).toBeLessThan(0.001);expect(parseFloat(ledger().querySelector('[data-energy-balance-bar="input"]').style.width)).toBeCloseTo(parseFloat(ordinaryWidth),10);expect(map().querySelector('[data-energy-map-scientific-help]').textContent).toContain('2.5e-6 means 0.0000025');expect(map().textContent.match(/Scientific notation:/g)).toHaveLength(1);expect(ledger().querySelector('[data-energy-balance-total="input"]').textContent).toMatch(/e-\d/);expect(map().textContent).not.toMatch(/NaN|Infinity/);
  });
  it('energy accounting remains current when scene A is selected and survives graphics fallback', () => {
    mount({bridgeView:'immersive',seismicTime:7.217,seismicEnergyInterval:true,seismicIntervalPinS:12.319});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'current'});const ledger=()=>host.querySelector('[data-seismic-energy-accounting]'),before=ledger().textContent,scale=ledger().dataset.energyBalanceScale;click('A · reference');expect(ledger().textContent).toBe(before);expect(ledger().dataset.energyBalanceScale).toBe(scale);act(()=>{viewerStatus='failed';viewerListener?.('failed');});expect(state).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:7.217,seismicIntervalPinS:12.319});expect(ledger().textContent).toBe(before);expect(ledger().dataset.seismicEnergyAccounting).toBe('current');expect(host.querySelector('[data-energy-map-caption]').textContent).toContain('Current experiment · 7.217 s');
  });

  it('learning route focuses existing notebook tools and preserves the investigation while pausing motion', () => {
    mount({ bridgeView:'2d', seismicTime:7.217, seismicIntervalPinS:12.319, seismicEnergyInterval:true, seismicPrediction:'Notebook prediction', seismicObservation:'Notebook explanation', seismicScenePrediction:'Scene prediction', seismicSceneNote:'Scene note', seismicGuidePrediction:'Guide prediction' });
    const snapshot=()=>({ time:state.seismicTime, pin:state.seismicIntervalPinS, intensity:state.seismicIntensityG, frequency:state.seismicFrequencyHz, damping:state.seismicDampingRatio, mode:state.seismicArchetype, notes:[state.seismicPrediction,state.seismicObservation,state.seismicScenePrediction,state.seismicSceneNote,state.seismicGuidePrediction], records:state.seismicTrials, source:state.seismicSceneSource, selection:state.seismicSceneTrial });
    const before=snapshot();
    for(const [step,target] of [['predict','#seismic-prediction'],['inspect','[data-seismic-chart-slider]'],['compare','[data-seismic-save-trial]'],['explain','#seismic-observation']]) {
      patch({seismicPlaying:true,autoDriving:true});act(()=>host.querySelector('[data-investigation-route-step="'+step+'"]').click());
      expect(document.activeElement).toBe(host.querySelector(target));expect(state).toMatchObject({seismicPlaying:false,autoDriving:false});expect(snapshot()).toEqual(before);
    }
    expect(state.seismicTrials).toBeUndefined();click('Save earthquake trial');const saved=state.seismicTrials[0];patch({seismicDampingRatio:0.2,seismicPlaying:true,autoDriving:true});click('Compare · Go to saved-trial comparison');expect(document.activeElement).toBe(host.querySelector('[data-seismic-trial-comparison]'));expect(state.seismicTrials[0]).toEqual(saved);expect(state).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicDampingRatio:0.2,seismicPlaying:false,autoDriving:false});
  });
  it('learning route is optional and keeps notebook writing separate from the guide and scene', () => {
    mount({seismicEnabled:false});expect(host.querySelector('[data-investigation-route]')).toBeNull();patch({seismicEnabled:true,seismicGuideOpen:true});const route=host.querySelector('[data-investigation-route]');expect(route.querySelectorAll('button')).toHaveLength(4);expect(route.textContent).toContain('Save the current experiment');expect(route.querySelector('[aria-current]')).toBeNull();click('Predict · Go to earthquake prediction');act(()=>Simulate.change(document.activeElement,{target:{value:'One change prediction'}}));expect(state.seismicPrediction).toBe('One change prediction');expect(state.seismicScenePrediction).toBeUndefined();expect(state.seismicGuidePrediction).toBeUndefined();patch({seismicGuideOpen:false});click('Explain · Go to earthquake explanation');expect(document.activeElement.id).toBe('seismic-observation');
  });
  it('energy map uses recorded current evidence at the exact inspected time and preserves small readings', () => {
    mount({bridgeView:'2d',seismicTime:7.217,seismicIntervalPinS:0,seismicEnergyInterval:true,seismicIntensityG:0.000001});const map=host.querySelector('[data-seismic-energy-map]'),draft=host.querySelector('[data-investigation-evidence="draft"]');
    const value=(scope,selector)=>Number(scope.querySelector(selector).dataset.energyValue||scope.querySelector(selector).dataset.evidenceValue);
    expect(map.dataset.seismicEnergyMap).toBe('current');expect(map.dataset.energyMapTime).toBe('7.217');expect(map.querySelector('[data-energy-map-caption]').textContent).toContain('Current experiment · 7.217 s · Shaking phase');
    for(const [amount,row] of [['input','input'],['stored','remaining'],['damping','damping']])expect(value(map,'[data-energy-map-amount="'+amount+'"]')).toBe(value(draft,'[data-evidence-row="'+row+'"] [data-evidence-value]'));
    const kinetic=value(map,'[data-energy-map-detail="kinetic"]'),elastic=value(map,'[data-energy-map-detail="elastic"]');expect(kinetic+elastic).toBeCloseTo(value(map,'[data-energy-map-amount="stored"]'),14);const fractions=[...map.querySelectorAll('[data-energy-fraction]')].map(n=>Number(n.dataset.energyFraction));expect(fractions[0]+fractions[1]).toBeCloseTo(1,14);expect(fractions[0]).toBeCloseTo(kinetic/(kinetic+elastic),14);expect(map.textContent).toMatch(/e-\d/);expect(map.textContent).not.toMatch(/NaN|Infinity/);expect(value(map,'[data-energy-map-rate="input"]')).toBe(Number(host.querySelector('[data-seismic-input-power]').dataset.seismicInputPower));expect(map.textContent).toContain('W/kg');
  });
  it('energy map distinguishes zero transfer, stored vibration and the end of the observation', () => {
    mount({seismicIntensityG:0,seismicTime:24});const map=()=>host.querySelector('[data-seismic-energy-map]');expect([...map().querySelectorAll('[data-energy-value]')].every(n=>Number(n.dataset.energyValue)===0)).toBe(true);expect([...map().querySelectorAll('[data-energy-fraction]')].every(n=>n.dataset.energyFraction==='0')).toBe(true);expect(map().querySelector('[data-energy-map-connector="input"]').dataset.energyDirection).toBe('idle');expect(map().textContent).toContain('No input transfer now');expect(map().textContent).toContain('No damping transfer now');expect(map().textContent).toContain('Observation ends');
    patch({seismicIntensityG:0.12,seismicTime:16});expect(map().textContent).toContain('Free vibration');expect(Number(map().querySelector('[data-energy-map-amount="stored"]').dataset.energyValue)).toBeGreaterThan(0);expect(Number(map().querySelector('[data-energy-map-rate="input"]').dataset.energyValue)).toBe(0);expect(Number(map().querySelector('[data-energy-map-rate="damping"]').dataset.energyValue)).toBeGreaterThan(0);expect(map().textContent).toContain('No input transfer now');expect(map().textContent).toContain('Damping removes energy now');patch({seismicDampingRatio:0});expect(map().textContent).toContain('No damping transfer now');
  });
  it('energy map follows instantaneous current input power independently of a selected scene reference', () => {
    mount({seismicEnergyInterval:true,seismicTime:7.217,seismicArchetype:'balanced',seismicFrequencyHz:1.1,seismicIntensityG:0.12,seismicDampingRatio:0.05});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'current'});const read=()=>host.querySelector('[data-seismic-energy-map]').textContent,before=read();click('A · reference');expect(state.seismicSceneTrial).toBe('reference');expect(read()).toBe(before);const connector=()=>host.querySelector('[data-energy-map-connector="input"]');patch({seismicTime:0.2});expect(Number(connector().querySelector('[data-energy-map-rate]').dataset.energyValue)).toBeGreaterThan(0);expect(connector().dataset.energyDirection).toBe('in');patch({seismicDampingRatio:0.05,seismicTime:7.283333333333333});expect(Number(connector().querySelector('[data-energy-map-rate]').dataset.energyValue)).toBeLessThan(0);expect(connector().dataset.energyDirection).toBe('out');expect(connector().textContent).toContain('Energy returned now');expect(Number(host.querySelector('[data-energy-map-amount="input"]').dataset.energyValue)).toBeGreaterThan(0);patch({seismicIntensityG:0.000001});expect(connector().dataset.energyDirection).toBe('out');expect(connector().querySelector('[data-energy-map-rate]').textContent).toMatch(/-.*e-\d/);expect(host.querySelector('[data-seismic-energy-map]').textContent).toContain('Current experiment');expect(state.seismicSceneTrial).toBe('reference');
  });

  it('paired intervals compare shared exact bounds in 2D and update A and B independently',()=>{
    mount({bridgeView:'2d',seismicTrialName:'Original reference'});click('Save earthquake trial');patch({seismicDampingRatio:0.2,seismicTrialName:'Damped reference'});click('Save earthquake trial');patch({seismicDampingRatio:0.1,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217,seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation'});
    const pair=()=>host.querySelector('[data-seismic-interval-comparison]'),evidence=()=>pair().querySelector('[data-investigation-evidence="comparison"]'),columns=()=>[...evidence().querySelectorAll('[data-evidence-column]')].map(c=>[...evidence().querySelectorAll('[data-evidence-value][data-evidence-trial="'+c.dataset.evidenceColumn+'"]')].map(n=>n.dataset.evidenceValue));
    expect(evidence().dataset).toMatchObject({evidenceStart:'7.217',evidenceEnd:'12.319'});expect(pair().textContent).toContain('Original reference');expect(evidence().querySelector('table').style.fontSize).toBe('12px');const before=columns();expect(before[0]).toHaveLength(7);expect(before[1]).toHaveLength(7);expect(before[0]).not.toEqual(before[1]);patch({seismicReferenceIndex:1});expect(columns()[0]).not.toEqual(before[0]);expect(columns()[1]).toEqual(before[1]);const switched=columns();patch({seismicDampingRatio:0.3});expect(columns()[0]).toEqual(switched[0]);expect(columns()[1]).not.toEqual(switched[1]);expect(state).toMatchObject({bridgeView:'2d',seismicIntervalPinS:12.319,seismicTime:7.217,seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation'});
  });
  it('paired intervals print recalculated A/B evidence before the live model is enabled',()=>{
    mount({bridgeView:'2d',seismicTrialName:'Print reference',seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24});click('Save earthquake trial');const reference=state.seismicTrials[0];patch({seismicDampingRatio:0.2});const live=host.querySelector('[data-investigation-evidence="comparison"]'),values=[...live.querySelectorAll('[data-evidence-value]')].map(n=>n.dataset.evidenceValue);
    act(()=>root.unmount());root=null;host.remove();mount({tab:'print',seismicEnabled:false,seismicTrials:[{...reference,answers:{damping:999999}}],seismicDampingRatio:0.2,seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24});const printed=host.querySelector('[data-seismic-interval-comparison]');expect([...printed.querySelectorAll('[data-evidence-value]')].map(n=>n.dataset.evidenceValue)).toEqual(values);expect(printed.textContent).toContain('Print reference');expect(printed.textContent).not.toContain('999999');expect(printed.querySelector('button,input,textarea,select')).toBeNull();expect(printed.querySelector('[data-investigation-evidence]').dataset).toMatchObject({evidenceStart:'16',evidenceEnd:'24'});patch({seismicEnergyInterval:false});expect(host.querySelector('[data-seismic-interval-comparison]')).toBeNull();
  });
  it('paired intervals survive graphics loss without selecting a different scene and retain finite zero evidence',()=>{
    mount({bridgeView:'immersive',seismicTrialName:'Zero reference',seismicIntensityG:0});click('Save earthquake trial');patch({seismicEnergyInterval:true,seismicTime:24,seismicIntervalPinS:16,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'});const pair=()=>host.querySelector('[data-seismic-interval-comparison]');expect(pair()).toBeTruthy();expect([...pair().querySelectorAll('[data-evidence-value]')].every(n=>Number(n.dataset.evidenceValue)===0)).toBe(true);const before=pair().textContent;act(()=>{viewerStatus='failed';viewerListener?.('failed');});expect(state).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:24,seismicIntervalPinS:16});expect(pair().textContent).toBe(before);expect(pair().textContent).not.toContain('Selected');expect(pair().querySelector('[data-evidence-selected]')).toBeNull();expect(pair().querySelector('[data-evidence-question]').textContent).toContain('B · current');patch({seismicIntensityG:0.000001,seismicFrequencyHz:2});expect(pair().textContent).toContain('The ground motion differs');expect(pair().textContent).toContain('1.00e-6 g');expect(pair().textContent).not.toMatch(/NaN|Infinity/);expect(pair().textContent).toMatch(/e-\d/);
  });
  it('comparison clarity aligns tiny table readings with bars and preserves signed changes through print',()=>{
    mount({seismicIntensityG:0.000001});click('Save earthquake trial');patch({seismicDampingRatio:0.2});const comparison=()=>host.querySelector('[data-seismic-trial-comparison]'),rows=[...comparison().querySelectorAll('[data-seismic-trial-table] tbody tr')];rows.forEach((row,index)=>{const pair=comparison().querySelectorAll('[data-response-pair]')[index],actual=[...row.querySelectorAll('[data-comparison-value]')].map(n=>Number(n.dataset.comparisonValue)),bar=[...pair.querySelectorAll('[data-response-reading]')].map(n=>Number(n.dataset.responseValue));expect(actual).toEqual(bar);const change=row.querySelector('[data-comparison-change]');expect(Number(change.dataset.comparisonChange)).toBe(actual[1]-actual[0]);expect(change.textContent).toMatch(/-.*e-\d/);});expect(comparison().querySelector('[data-comparison-precision-help]')).toBeTruthy();const before=rows.map(row=>row.textContent);click('Open earthquake evidence report');expect([...comparison().querySelectorAll('[data-seismic-trial-table] tbody tr')].map(row=>row.textContent)).toEqual(before);
    patch({tab:'build',seismicIntensityG:0.000001,seismicDampingRatio:0.050000001});const percentages=[...comparison().querySelectorAll('[data-comparison-percent]')];expect(percentages.some(n=>Number(n.dataset.comparisonPercent)!==0 && n.textContent.includes('e-'))).toBe(true);expect(comparison().textContent).not.toMatch(/NaN|Infinity/);
  });
  it('comparison clarity retains keyboard focus when the isolation action disappears',()=>{
    mount();click('Save earthquake trial');patch({seismicArchetype:'stiff',seismicDampingRatio:0.2});const action=button('Isolate damping change');action.focus();expect(document.activeElement).toBe(action);click('Isolate damping change');const comparison=host.querySelector('[data-seismic-trial-comparison]');expect(comparison.querySelector('[data-controlled-comparison]')).toBeNull();expect(document.activeElement).toBe(comparison);expect(comparison.tabIndex).toBe(-1);expect(comparison.textContent).toContain('Changed settings: Damping ratio (%)');
  });
  it('paired comparison bars share a scale per measure and remain stable across inspected times and print',()=>{
    mount({seismicTrialName:'Visual reference'});click('Save earthquake trial');patch({seismicDampingRatio:0.2});const read=()=>[...host.querySelectorAll('[data-response-pair]')].map(pair=>({scale:Number(pair.dataset.responseScale),values:[...pair.querySelectorAll('[data-response-reading]')].map(n=>Number(n.dataset.responseValue)),widths:[...pair.querySelectorAll('[data-response-bar]')].map(n=>parseFloat(n.style.width))})),before=read();expect(before).toHaveLength(4);
    before.forEach(pair=>{expect(pair.scale).toBe(Math.max(...pair.values) || 1);pair.widths.forEach((width,i)=>expect(width).toBeCloseTo(pair.values[i]/pair.scale*100,10));expect(Math.max(...pair.widths)).toBe(100);});patch({seismicTime:21.217});expect(read()).toEqual(before);click('Open earthquake evidence report');expect(read()).toEqual(before);expect(host.querySelector('[data-seismic-comparison-visual]').textContent).toContain('different measures use different scales');expect(host.querySelector('[data-seismic-comparison-visual]').querySelector('button,input,textarea,select')).toBeNull();
  });
  it('paired comparison bars represent true zero and very small results without invalid widths',()=>{
    mount({seismicIntensityG:0});click('Save earthquake trial');const zero=[...host.querySelectorAll('[data-response-bar]')];expect(zero).toHaveLength(8);expect(zero.every(n=>n.style.width==='0%')).toBe(true);patch({seismicIntensityG:1e-10});for(const pair of host.querySelectorAll('[data-response-pair]')){expect(Number(pair.dataset.responseScale)).toBeGreaterThan(0);expect(Math.max(...[...pair.querySelectorAll('[data-response-bar]')].map(n=>parseFloat(n.style.width)))).toBe(100);for(const bar of pair.querySelectorAll('[data-response-bar]'))expect(Number.isFinite(parseFloat(bar.style.width))).toBe(true);}expect(host.querySelector('[data-seismic-comparison-visual]').textContent).not.toMatch(/NaN|Infinity/);expect(host.querySelector('[data-seismic-comparison-visual]').textContent).toMatch(/e-\d/);
  });
  it('controlled comparison isolates damping while preserving inspection, notes and the saved reference',()=>{
    mount({bridgeView:'2d',seismicTrialName:'Reference'});click('Save earthquake trial');const record=state.seismicTrials[0];patch({seismicArchetype:'stiff',seismicFrequencyHz:2.3,seismicIntensityG:0.3,seismicDampingRatio:0.2,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217,seismicPrediction:'Keep prediction',seismicObservation:'Keep observation',seismicScenePrediction:'Keep scene prediction',seismicSceneNote:'Keep scene note',seismicSceneSource:'capture',seismicSceneTrial:'reference',seismicPlaying:true,autoDriving:true});click('Isolate damping change');
    expect(state).toMatchObject({bridgeView:'2d',seismicArchetype:record.inputs.archetype,seismicFrequencyHz:record.inputs.groundFrequencyHz,seismicIntensityG:record.inputs.intensityG,seismicDampingRatio:0.2,seismicTime:7.217,seismicIntervalPinS:12.319,seismicEnergyInterval:true,seismicPlaying:false,autoDriving:false,seismicSceneSource:'saved',seismicSceneTrial:'current',seismicPrediction:'Keep prediction',seismicObservation:'Keep observation',seismicScenePrediction:'Keep scene prediction',seismicSceneNote:'Keep scene note'});expect(state.seismicTrials[0]).toEqual(record);const comparison=host.querySelector('[data-seismic-trial-comparison]');expect(comparison.textContent).toContain('Changed settings: Damping ratio (%)');expect(comparison.querySelector('[data-controlled-comparison]')).toBeNull();click('Open earthquake evidence report');expect(host.querySelector('[data-bridge-print-seismic]').textContent).toContain('Changed settings: Damping ratio (%)');
  });
  it('controlled comparison isolates response mode and disables absent changes without showing actions in print',()=>{
    mount({seismicTrialName:'Reference'});click('Save earthquake trial');const record=state.seismicTrials[0];patch({seismicArchetype:'stiff',seismicFrequencyHz:2.3,seismicIntensityG:0.3});expect(button('Isolate damping change').disabled).toBe(true);expect(button('Isolate response mode change').disabled).toBe(false);click('Isolate response mode change');expect(state).toMatchObject({seismicArchetype:'stiff',seismicFrequencyHz:record.inputs.groundFrequencyHz,seismicIntensityG:record.inputs.intensityG,seismicDampingRatio:record.inputs.dampingRatio});expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Changed settings: Response mode');
    patch({seismicDampingRatio:0.2});expect(host.querySelector('[data-controlled-comparison]')).toBeTruthy();click('Open earthquake evidence report');expect(host.querySelector('[data-bridge-print-seismic] [data-controlled-comparison]')).toBeNull();expect(host.querySelector('[data-bridge-print-seismic]').textContent).toContain('Several settings changed');
  });
  it('saved small readouts retain late-stage energy and signed power through fresh print without trusting answers',()=>{
    mount({seismicSceneRecording:true,seismicDampingRatio:0.2,seismicTime:21.217});click('Save scene observation');const record=state.seismicTrials[0],article=host.querySelector('[data-seismic-trial]'),energy=article.querySelector('[data-seismic-saved-energy]').textContent,power=article.querySelector('[data-seismic-scene-power]').textContent;
    expect(energy).toMatch(/e-\d/);expect(power).toMatch(/-\d\.\d{2}e-\d/);expect(article.querySelector('[data-seismic-scientific-help]').textContent).toContain('2.5e-6 means 0.0000025');
    act(()=>root.unmount());root=null;host.remove();mount({tab:'print',seismicEnabled:false,seismicTrials:[{...record,sample:{kineticJPerKg:999999},power:{storedPowerWPerKg:999999}}]});const print=host.querySelector('[data-seismic-trial]');expect(print.querySelector('[data-seismic-saved-energy]').textContent).toBe(energy);expect(print.querySelector('[data-seismic-scene-power]').textContent).toBe(power);expect(print.textContent).not.toContain('999999');expect(print.querySelector('button,input,textarea,select')).toBeNull();
  });
  it('saved small readouts keep true-zero and ordinary-scale summaries simple',()=>{
    mount({seismicIntensityG:0,seismicSceneRecording:true,seismicTime:24});click('Save scene observation');const zero=host.querySelector('[data-seismic-trial]');expect([...zero.querySelectorAll('[data-seismic-saved-energy] dd')].map(node=>node.textContent)).toEqual(['0.000 J/kg','0.000 J/kg','0.000 J/kg','0.000 J/kg']);expect([...zero.querySelectorAll('[data-seismic-saved-energy] dt')].map(node=>node.textContent)).toEqual(['Kinetic','Elastic','Damping loss since 0 s','Net input work since 0 s']);expect([...zero.querySelectorAll('[data-seismic-scene-power] dd')].map(node=>node.textContent)).toEqual(['0.000 W/kg','0.000 W/kg','0.000 W/kg']);expect([...zero.querySelectorAll('[data-seismic-scene-power] dt')].map(node=>node.textContent)).toEqual(['Ground input power','Damping loss rate','Stored energy change rate']);expect(zero.querySelector('[data-seismic-scientific-help]')).toBeNull();
    patch({seismicIntensityG:0.12,seismicDampingRatio:0.05,seismicTime:7.217});click('Save earthquake trial');const ordinary=host.querySelectorAll('[data-seismic-trial]')[1];expect(ordinary.querySelector('[data-seismic-saved-energy]').textContent).not.toMatch(/e-\d/);expect(ordinary.querySelector('[data-seismic-scientific-help]')).toBeNull();
  });
  it('interval time controls edit exact endpoints, pause motion and swap without changing energy evidence',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicTime:7.217,seismicIntervalPinS:12.319});const values=()=>[...host.querySelectorAll('[data-investigation-evidence="draft"] [data-evidence-value]')].map(n=>n.dataset.evidenceValue),before=values();patch({seismicPlaying:true,autoDriving:true});click('Swap moments');expect(state).toMatchObject({seismicTime:12.319,seismicIntervalPinS:7.217,seismicPlaying:false,autoDriving:false});expect(values()).toEqual(before);expect(field('Inspected time (s)').value).toBe('12.319');expect(field('Pinned time (s)').value).toBe('7.217');
    act(()=>Simulate.change(field('Inspected time (s)'),{target:{value:'5.123'}}));expect(state.seismicTime).toBe(5.123);expect(state.seismicIntervalPinS).toBe(7.217);expect(host.querySelector('[data-interval-window]').dataset).toMatchObject({intervalStart:'5.123',intervalEnd:'7.217'});
    for(const value of ['', 'not-a-time','Infinity']){act(()=>Simulate.change(field('Inspected time (s)'),{target:{value}}));expect(state.seismicTime).toBe(5.123);}
    act(()=>Simulate.change(field('Inspected time (s)'),{target:{value:'30'}}));expect(state.seismicTime).toBe(24);act(()=>Simulate.change(field('Inspected time (s)'),{target:{value:'-2'}}));expect(state.seismicTime).toBe(0);patch({seismicIntervalPinS:0});expect(button('Swap moments').disabled).toBe(true);
  });
  it('interval time controls preserve selected scene and A/B evidence when moments swap',()=>{
    mount({bridgeView:'immersive',bridgeObserver:'bank',seismicEnergyInterval:true,seismicGuideOpen:true});click('Prepare 5% / 20% comparison');click('A · reference');click('After shaking');const evidence=()=>[...host.querySelectorAll('[data-investigation-evidence="scene"] [data-evidence-value]')].map(n=>n.dataset.evidenceValue),before=evidence();const settings={frequency:state.seismicFrequencyHz,damping:state.seismicDampingRatio,intensity:state.seismicIntensityG};click('Swap moments');expect(state).toMatchObject({seismicIntervalPinS:24,seismicTime:16,seismicSceneCompare:true,seismicSceneTrial:'reference',bridgeView:'immersive'});expect(evidence()).toEqual(before);expect({frequency:state.seismicFrequencyHz,damping:state.seismicDampingRatio,intensity:state.seismicIntensityG}).toEqual(settings);expect(host.querySelector('[data-energy-window="settling"]').getAttribute('aria-pressed')).toBe('true');
    act(()=>Simulate.change(field('Inspected time (s)'),{target:{value:'17.137'}}));expect(state.seismicTime).toBe(17.137);expect(state.seismicSceneTrial).toBe('reference');expect(host.querySelector('[data-energy-window="settling"]').getAttribute('aria-pressed')).toBe('false');
  });
  it('current draft reports retain unsaved backwards evidence and writing without creating a trial',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217,seismicPrediction:'<b>Prediction</b>',seismicObservation:'Energy returns to the ground.'});
    const before=[...host.querySelectorAll('[data-investigation-evidence="draft"] [data-evidence-value]')].map(n=>n.dataset.evidenceValue);
    click('Open earthquake evidence report');const draft=host.querySelector('[data-notebook-print-draft]'),evidence=draft.querySelector('[data-investigation-evidence="draft"]');
    expect(evidence.dataset).toMatchObject({evidenceStart:'7.217',evidenceEnd:'12.319'});expect([...evidence.querySelectorAll('[data-evidence-value]')].map(n=>n.dataset.evidenceValue)).toEqual(before);
    expect(draft.textContent).toContain('Inspected time: 7.217 s');expect(draft.textContent).toContain('Current draft evidence');expect(draft.textContent).toContain('<b>Prediction</b>');expect(draft.querySelector('b,input,textarea,select,button')).toBeNull();expect(state.seismicTrials || []).toHaveLength(0);
  });
  it('current draft reports show zero-input evidence without notes and keep saved evidence independent',()=>{
    mount({seismicEnergyInterval:true,seismicIntensityG:0,seismicIntervalPinS:16,seismicTime:24});click('Save earthquake trial');patch({seismicIntensityG:0.12,seismicIntervalPinS:17.137});click('Open earthquake evidence report');
    const draft=host.querySelector('[data-notebook-print-draft] [data-investigation-evidence]'),saved=host.querySelector('[data-seismic-trial] [data-investigation-evidence]');expect(draft.dataset.evidenceStart).toBe('17.137');expect(saved.dataset.evidenceStart).toBe('16');expect([...saved.querySelectorAll('[data-evidence-value]')].every(n=>Number(n.dataset.evidenceValue)===0)).toBe(true);
    patch({seismicTrials:[],seismicIntensityG:0,seismicIntervalPinS:16});const report=host.querySelector('[data-bridge-print-seismic]');expect(report).toBeTruthy();expect(report.querySelector('[data-evidence-question]').dataset.evidenceQuestion).toBe('settling');expect(report.textContent).not.toMatch(/NaN|Infinity/);
    patch({seismicEnergyInterval:false});expect(host.querySelector('[data-bridge-print-seismic]')).toBeNull();
  });
  it('2D notebook investigations save exact pins, pause writing and restore current-experiment evidence',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicTrialName:'2D interval',seismicScenePrediction:'Keep scene draft',seismicSceneNote:'Keep scene note'});click('After shaking');patch({seismicPlaying:true,autoDriving:true});
    act(()=>Simulate.change(field('Earthquake prediction'),{target:{value:'Stored energy should become damping loss.'}}));expect(state).toMatchObject({seismicPlaying:false,autoDriving:false});
    act(()=>Simulate.change(field('Earthquake observation and explanation'),{target:{value:'No input work remains after shaking.'}}));
    const values=()=>[...host.querySelectorAll('[data-investigation-evidence="draft"] [data-evidence-value]')].map(n=>n.dataset.evidenceValue),before=values();expect(before).toHaveLength(7);click('Save earthquake trial');const record=state.seismicTrials[0];
    expect(record.investigation).toEqual({version:'bridge-energy-investigation-v1',pinTimeS:16});expect(record).not.toHaveProperty('scene');expect(record.timeS).toBe(24);expect(record.prediction).toContain('Stored energy');
    patch({seismicEnergyInterval:false,seismicIntervalPinS:9.3,seismicTime:2,seismicDampingRatio:0.4,seismicSceneCompare:true,seismicSceneTrial:'reference',seismicPrediction:'Changed draft',seismicObservation:'Changed observation'});
    click('Restore earthquake trial 1: 2D interval');expect(state).toMatchObject({bridgeView:'2d',seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24,seismicSceneCompare:false,seismicSceneTrial:'current',seismicScenePrediction:'Keep scene draft',seismicSceneNote:'Keep scene note'});expect(values()).toEqual(before);expect(field('Earthquake prediction').value).toBe(record.prediction);expect(field('Earthquake observation and explanation').value).toBe(record.observation);
  });
  it('legacy and damaged notebook inspection metadata resets stale intervals without discarding saved notes',()=>{
    mount({bridgeView:'2d',seismicTime:7.217,seismicTrialName:'Legacy trial',seismicPrediction:'Original prediction',seismicObservation:'Original observation'});click('Save earthquake trial');const record=state.seismicTrials[0];expect(record).not.toHaveProperty('investigation');
    for(const investigation of [undefined,null,{version:'future',pinTimeS:16},...['16',-1,25,NaN,Infinity,null].map(pinTimeS=>({version:'bridge-energy-investigation-v1',pinTimeS}))]){
      patch({seismicTrials:[{...record,investigation}],seismicEnergyInterval:true,seismicIntervalPinS:16});expect(host.querySelector('[data-seismic-trial] [data-investigation-evidence]')).toBeNull();click('Restore earthquake trial 1: Legacy trial');expect(state).toMatchObject({seismicEnergyInterval:false,seismicIntervalPinS:0,seismicTime:7.217});expect(field('Earthquake prediction').value).toBe(record.prediction);expect(field('Earthquake observation and explanation').value).toBe(record.observation);
    }
  });
  it('plain notebook interval reports recompute precise backwards inspection before a live model is enabled',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicTime:7.217,seismicIntervalPinS:12.319});
    const before=[...host.querySelectorAll('[data-investigation-evidence="draft"] [data-evidence-value]')].map(n=>n.dataset.evidenceValue);click('Save earthquake trial');const record=state.seismicTrials[0];
    act(()=>root.unmount());root=null;host.remove();mount({tab:'print',seismicEnabled:false,seismicTrials:[{...record,investigation:{...record.investigation,answers:{input:999999},question:'fake cached question'}}]});
    const article=host.querySelector('[data-bridge-print-seismic] [data-seismic-trial]'),evidence=article.querySelector('[data-investigation-evidence="saved"]');expect(evidence.dataset).toMatchObject({evidenceStart:'7.217',evidenceEnd:'12.319'});expect([...evidence.querySelectorAll('[data-evidence-value]')].map(n=>n.dataset.evidenceValue)).toEqual(before);expect(article.textContent).toContain('Inspected time: 7.217 s');expect(article.textContent).not.toContain('999999');expect(article.textContent).not.toContain('fake cached question');expect(article.querySelector('[data-seismic-scene-context]')).toBeNull();expect(article.querySelector('button,input,textarea,select')).toBeNull();
  });
  it('2D notebook questions retain signed ground-removal evidence and finite zero-shaking intervals',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true});click('Ground removes energy');click('Save earthquake trial');
    let article=host.querySelector('[data-seismic-trial]');expect(article.querySelector('[data-seismic-investigation-question]').dataset.seismicInvestigationQuestion).toBe('returning');expect(article.querySelector('[data-seismic-scene-question]')).toBeNull();const work=article.querySelector('[data-evidence-row="input"] td');expect(Number(work.dataset.evidenceValue)).toBeLessThan(0);expect(work.textContent).toMatch(/^−/);expect(work.textContent).not.toContain('<0.001');
    patch({seismicIntensityG:0,seismicTime:24,seismicIntervalPinS:16});click('Save earthquake trial');article=host.querySelector('[data-seismic-trial="1"]');expect(article.querySelector('[data-seismic-investigation-question]').dataset.seismicInvestigationQuestion).toBe('settling');expect([...article.querySelectorAll('[data-evidence-value]')].every(n=>Number(n.dataset.evidenceValue)===0)).toBe(true);expect(article.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('valid scene display endpoints take precedence over unrelated notebook inspection metadata',()=>{
    const display={version:'bridge-scene-display-v1',motionGuide:false,energyInFrame:false,energyFlow:false,overlay:false,energyInterval:true,intervalPinS:16};
    const record=sceneTrial({timeS:24,scene:scenePose({display}),investigation:{version:'bridge-energy-investigation-v1',pinTimeS:0}});mount({seismicTrials:[record]});
    const evidence=host.querySelector('[data-seismic-trial] [data-investigation-evidence="saved"]');expect(evidence.dataset.evidenceStart).toBe('16');expect(host.querySelector('[data-seismic-scene-question]').dataset.seismicSceneQuestion).toBe('settling');
    patch({seismicTrials:[{...record,scene:{...record.scene,display:{...display,energyInterval:false}}}]});expect(host.querySelector('[data-seismic-trial] [data-investigation-evidence]')).toBeNull();
  });
  it('scene predictions stay separate from notebook drafts and survive saving, revisiting and printing',()=>{
    mount({seismicSceneRecording:true,seismicPrediction:'Notebook prediction',seismicObservation:'Notebook observation',seismicTime:7.217});
    act(()=>Simulate.change(field('Scene prediction'),{target:{value:'More damping should reduce stored energy.'}}));
    act(()=>Simulate.change(field('Scene observation note'),{target:{value:'The damper dissipates the remaining energy.'}}));
    click('Save scene observation');const record=state.seismicTrials[0];
    expect(record).toMatchObject({prediction:'More damping should reduce stored energy.',observation:'The damper dissipates the remaining energy.',timeS:7.217});
    expect(state).toMatchObject({seismicScenePrediction:'',seismicSceneNote:'',seismicPrediction:'Notebook prediction',seismicObservation:'Notebook observation'});
    patch({seismicScenePrediction:'New unsaved prediction',seismicSceneNote:'New unsaved note',seismicTime:20});
    click('Revisit scene observation 1: '+record.name);expect(field('Scene prediction').value).toBe(record.prediction);expect(field('Scene observation note').value).toBe(record.observation);
    click('Open earthquake evidence report');const article=host.querySelector('[data-bridge-print-seismic] [data-seismic-trial]');expect(article.textContent).toContain(record.prediction);expect(article.textContent).toContain(record.observation);
  });
  it('writing a scene prediction pauses motion while preserving notes, physical inputs and guided inspection',()=>{
    mount({seismicSceneRecording:true,seismicEnergyInterval:true,seismicSceneNote:'Keep this note'});click('After shaking');patch({seismicPlaying:true,autoDriving:true});
    const inputs=[state.seismicArchetype,state.seismicFrequencyHz,state.seismicIntensityG,state.seismicDampingRatio];
    act(()=>Simulate.change(field('Scene prediction'),{target:{value:'Stored energy will become damping loss.'}}));
    expect(state).toMatchObject({seismicPlaying:false,autoDriving:false,seismicSceneNote:'Keep this note',seismicIntervalPinS:16,seismicTime:24});
    expect([state.seismicArchetype,state.seismicFrequencyHz,state.seismicIntensityG,state.seismicDampingRatio]).toEqual(inputs);
    expect(host.querySelector('[data-investigation-evidence="scene"] [data-evidence-question]').dataset.evidenceQuestion).toBe('settling');
  });
  it('writing evidence compares A and B over identical times with stable values when selection changes',()=>{
    mount({seismicSceneRecording:true,seismicEnergyInterval:true,seismicGuideOpen:true});click('Prepare 5% / 20% comparison');click('After shaking');
    const evidence=()=>host.querySelector('[data-bridge-scene-recorder] [data-investigation-evidence]');
    const values=id=>[...evidence().querySelectorAll('[data-evidence-trial="'+id+'"]')].map(n=>Number(n.dataset.evidenceValue));
    expect(evidence().dataset).toMatchObject({evidenceStart:'16',evidenceEnd:'24',evidenceSelected:'current'});const a=values('reference'),b=values('current');
    expect(a).toHaveLength(7);expect(b).toHaveLength(7);expect(a).not.toEqual(b);
    for(const column of [a,b]){expect(column[1]).toBe(0);expect(column[2]).toBeGreaterThan(0);expect(column[5]).toBeCloseTo(-column[2],7);expect(column[0]-column[6]).toBeCloseTo(column[2],7);}
    click('A · reference');expect(evidence().dataset.evidenceSelected).toBe('reference');expect(values('reference')).toEqual(a);expect(values('current')).toEqual(b);
    expect([...evidence().querySelectorAll('thead th')].every(n=>n.getAttribute('scope')==='col')).toBe(true);expect([...evidence().querySelectorAll('tbody th')].every(n=>n.getAttribute('scope')==='row')).toBe(true);
  });
  it('writing evidence keeps tiny negative work readable and orders backwards or zero-input inspection',()=>{
    mount({seismicSceneRecording:true,seismicEnergyInterval:true});click('Ground removes energy');
    const evidence=()=>host.querySelector('[data-bridge-scene-recorder] [data-investigation-evidence]');
    const work=evidence().querySelector('[data-evidence-row="input"] td'),value=Number(work.dataset.evidenceValue);expect(value).toBeLessThan(0);expect(work.textContent).toMatch(/^−/);expect(work.textContent).not.toContain('<0.001');
    if(Math.abs(value)<0.001)expect(work.textContent).toContain(Math.abs(value).toExponential(2));
    const before=evidence().textContent,pin=state.seismicIntervalPinS,time=state.seismicTime;patch({seismicIntervalPinS:time,seismicTime:pin});expect(evidence().textContent).toBe(before);
    patch({seismicIntensityG:0,seismicIntervalPinS:16,seismicTime:24});expect([...evidence().querySelectorAll('[data-evidence-value]')].every(n=>Number(n.dataset.evidenceValue)===0)).toBe(true);expect(evidence().innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('saved paired writing evidence is recomputed in a fresh disabled-model report and ignores cached answers',()=>{
    mount({seismicSceneRecording:true,seismicEnergyInterval:true,seismicGuideOpen:true,seismicScenePrediction:'Energy will be dissipated.'});click('Prepare 5% / 20% comparison');click('After shaking');
    const before=[...host.querySelectorAll('[data-bridge-scene-recorder] [data-evidence-value]')].map(n=>n.dataset.evidenceValue);click('Save scene observation');const record=state.seismicTrials[0];
    act(()=>root.unmount());root=null;host.remove();mount({tab:'print',seismicEnabled:false,seismicTrials:[{...record,evidence:{input:999999},prediction:'Energy will be dissipated.'}]});
    const saved=host.querySelector('[data-bridge-print-seismic] [data-investigation-evidence="saved"]');expect([...saved.querySelectorAll('[data-evidence-value]')].map(n=>n.dataset.evidenceValue)).toEqual(before);expect(saved.querySelectorAll('[data-evidence-column]')).toHaveLength(2);expect(saved.textContent).not.toContain('999999');expect(saved.querySelector('button,input,textarea,select')).toBeNull();
    const tampered={...record,scene:{...record.scene,comparison:{...record.scene.comparison,currentInputs:{...record.scene.comparison.currentInputs,intensityG:0.4}}}};
    patch({seismicTrials:[tampered]});const solo=host.querySelector('[data-investigation-evidence="saved"]');expect(solo.querySelectorAll('[data-evidence-column]')).toHaveLength(1);expect(solo.textContent).toContain('Saved experiment');
  });
  it('legacy scene predictions reset stale drafts, bound text and remain escaped in printed reports',()=>{
    mount({seismicSceneRecording:true,seismicScenePrediction:'x'.repeat(2100),seismicTrials:[sceneTrial({prediction:undefined})]});expect(field('Scene prediction').value).toHaveLength(2000);
    click('Revisit scene observation 1: My scene');expect(field('Scene prediction').value).toBe('');
    act(()=>Simulate.change(field('Scene prediction'),{target:{value:'<script>prediction</script>'+'x'.repeat(2100)}}));click('Save scene observation');const record=state.seismicTrials[1];expect(record.prediction).toHaveLength(2000);
    click('Open earthquake evidence report');const report=host.querySelector('[data-bridge-print-seismic]');expect(report.textContent).toContain('<script>prediction</script>');expect(report.querySelector('script')).toBeNull();
  });
  it('guided energy questions inspect exact windows without changing inputs or learner notes',()=>{
    mount({seismicEnergyInterval:true,seismicPlaying:true,autoDriving:true,seismicTime:7.217,seismicObservation:'Keep my observation',seismicSceneNote:'Keep my scene note'});
    const settings=()=>[state.seismicArchetype,state.seismicFrequencyHz,state.seismicIntensityG,state.seismicDampingRatio];const before=settings();
    click('During shaking');expect(state).toMatchObject({seismicIntervalPinS:0,seismicTime:16,seismicPlaying:false,autoDriving:false});
    expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('shaking');expect(button('During shaking').getAttribute('aria-pressed')).toBe('true');
    click('After shaking');expect(state).toMatchObject({seismicIntervalPinS:16,seismicTime:24});expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('settling');
    expect(settings()).toEqual(before);expect(state.seismicObservation).toBe('Keep my observation');expect(state.seismicSceneNote).toBe('Keep my scene note');
    patch({seismicTime:20});expect(host.querySelector('[data-energy-question]')).toBeNull();expect(button('After shaking').getAttribute('aria-pressed')).toBe('false');
  });
  it('guided exchange and ground-removal questions show conserved destinations and signed work',()=>{
    mount({seismicEnergyInterval:true,seismicEnergyOrbit:true});const value=id=>Number(host.querySelector('[data-budget-part="'+id+'"]').dataset.budgetValue);
    click('Elastic → kinetic');expect(state.seismicIntervalPinS).toBeGreaterThanOrEqual(16);expect(state.seismicTime).toBeGreaterThan(state.seismicIntervalPinS);
    expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('exchange');expect(value('added')).toBe(0);expect(value('returned')).toBe(0);expect(value('damping')).toBeGreaterThan(0);
    click('Ground removes energy');expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('returning');expect(value('returned')).toBeGreaterThan(0);expect(value('added')).toBe(0);
    expect(value('initial')).toBeCloseTo(value('remaining')+value('damping')+value('returned'),7);
    const returnedLabel=host.querySelector('[data-budget-legend="returned"]').textContent;
    expect(returnedLabel).toContain('Net removed by ground');expect(returnedLabel).not.toContain('<0.001');
    if(value('returned') < 0.001) expect(returnedLabel).toContain(value('returned').toExponential(2));
    expect(Number(host.querySelector('[data-interval-term="input"]').dataset.intervalValue)).toBeLessThan(0);
    expect(Number(host.querySelector('[data-orbit-pin]').dataset.orbitPin)).toBe(state.seismicIntervalPinS);
  });
  it('guided A/B settling shares the interval and budget scale while preserving the replay geometry',()=>{
    mount({seismicEnergyInterval:true,seismicGuideOpen:true});click('Prepare 5% / 20% comparison');click('After shaking');
    const scale=host.querySelector('[data-interval-budget]').dataset.budgetScale,values=()=>[...host.querySelectorAll('[data-budget-part]')].map(n=>n.dataset.budgetValue),b=values(),signature=lastScene.sig;
    click('A · reference');expect(host.querySelector('[data-interval-budget]').dataset.intervalBudget).toBe('reference');expect(host.querySelector('[data-interval-budget]').dataset.budgetScale).toBe(scale);
    expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('settling');expect(values()).not.toEqual(b);expect(state).toMatchObject({seismicIntervalPinS:16,seismicTime:24,seismicPlaying:false});
    expect(lastScene.sig).toBe(signature);
  });
  it('saved energy questions are derived from endpoints and print correctly even before a live model is enabled',()=>{
    mount({seismicEnergyInterval:true,seismicSceneRecording:true});click('Elastic → kinetic');click('Save scene observation');const record=state.seismicTrials[0];
    expect(host.querySelector('[data-seismic-scene-question]').dataset.seismicSceneQuestion).toBe('exchange');
    patch({seismicTime:0,seismicIntervalPinS:0,seismicDampingRatio:0.4});click('Revisit scene observation 1: '+record.name);expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('exchange');
    act(()=>root.unmount());root=null;host.remove();mount({tab:'print',seismicEnabled:false,seismicTrials:[{...record,energyQuestion:'fake cached answer'}]});
    const report=host.querySelector('[data-bridge-print-seismic]');expect(report.querySelector('[data-seismic-scene-question]').dataset.seismicSceneQuestion).toBe('exchange');
    expect(report.textContent).not.toContain('fake cached answer');expect(report.querySelector('button,input,select,textarea')).toBeNull();
  });
  it('guided zero-input investigations stay finite and available in graphics fallback',()=>{
    mount({seismicEnergyInterval:true,seismicIntensityG:0});expect(button('Elastic → kinetic').disabled).toBe(true);expect(button('Ground removes energy').disabled).toBe(true);
    click('After shaking');expect([...host.querySelectorAll('[data-budget-part]')].every(n=>Number(n.dataset.budgetValue)===0)).toBe(true);
    expect(host.querySelector('[data-interval-budget]').innerHTML).not.toMatch(/NaN|Infinity/);
    act(()=>{viewerStatus='failed';viewerListener('failed');});expect(host.querySelector('[data-bridge-energy-interval="fallback"]')).toBeTruthy();expect(host.querySelector('[data-energy-question]').dataset.energyQuestion).toBe('settling');
  });
  it('energy interval opens paused, pins exact frames and orders backwards inspection',()=>{
    mount({seismicTime:7.217,seismicPlaying:true,autoDriving:true});const details=host.querySelector('[data-bridge-energy-interval]');
    act(()=>{details.open=true;details.dispatchEvent(new Event('toggle'));});
    expect(state.seismicEnergyInterval).toBe(true);expect(state.seismicPlaying).toBe(false);expect(state.autoDriving).toBe(false);
    click('Pin this frame');expect(state.seismicIntervalPinS).toBe(7.217);
    expect(host.querySelector('[data-interval-insight]').textContent).toContain('Move replay time');
    patch({seismicTime:5.319});const window=host.querySelector('[data-interval-window]');
    expect(Number(window.dataset.intervalStart)).toBe(5.319);expect(Number(window.dataset.intervalEnd)).toBe(7.217);
    expect(Number(host.querySelector('[data-interval-term="damping"]').dataset.intervalValue)).toBeGreaterThan(0);
    act(()=>Simulate.change(field('Pinned time (s)'),{target:{value:'16.137'}}));expect(state.seismicIntervalPinS).toBe(16.137);
  });
  it('energy interval shares A/B time and event scale while recalculating the selected response and pin',()=>{
    mount({seismicEnergyInterval:true,seismicEnergyOrbit:true,seismicGuideOpen:true,seismicTime:21.217,seismicIntervalPinS:16});click('Prepare 5% / 20% comparison');patch({seismicTime:21.217});
    const terms=()=>[...host.querySelectorAll('[data-interval-term]')].map(n=>n.dataset.intervalValue);
    const b=terms(),frame=host.querySelector('[data-interval-frame]'),scale=frame.dataset.intervalScale,signature=lastScene.sig;
    expect(host.querySelector('[data-interval-insight]').textContent).toContain('decrease in stored energy');
    expect(Number(host.querySelector('[data-interval-term="input"]').dataset.intervalValue)).toBe(0);
    click('A · reference');expect(terms()).not.toEqual(b);expect(frame.dataset.intervalTrial).toBe('reference');expect(frame.dataset.intervalScale).toBe(scale);
    expect(state.seismicIntervalPinS).toBe(16);expect(state.seismicTime).toBe(21.217);
    expect(host.querySelector('[data-orbit-pin]').dataset.orbitPinTrial).toBe('reference');expect(Number(host.querySelector('[data-orbit-pin]').dataset.orbitPin)).toBe(16);
    patch({seismicTime:20});expect(lastScene.sig).toBe(signature);expect(frame.dataset.intervalScale).toBe(scale);
  });
  it('energy interval observations restore exact endpoints and print recomputed totals',()=>{
    mount({seismicEnergyInterval:true,seismicEnergyOrbit:true,seismicSceneRecording:true,seismicTime:21.217,seismicIntervalPinS:16.137});
    click('Save scene observation');const record=state.seismicTrials[0],text=host.querySelector('[data-seismic-scene-interval]').textContent;
    expect(record.scene.display).toMatchObject({energyInterval:true,intervalPinS:16.137});expect(text).toContain('16.137–21.217 s');
    patch({seismicEnergyInterval:false,seismicIntervalPinS:0,seismicTime:0,seismicDampingRatio:0.4,seismicTrials:[{...record,interval:{inputJPerKg:999999}}]});
    expect(host.querySelector('[data-seismic-scene-interval]').textContent).toBe(text);
    click('Revisit scene observation 1: '+record.name);expect(state).toMatchObject({seismicEnergyInterval:true,seismicIntervalPinS:16.137,seismicTime:21.217,seismicPlaying:false});
    click('Open earthquake evidence report');const report=host.querySelector('[data-bridge-print-seismic]');
    expect(report.querySelector('[data-seismic-scene-interval]').textContent).toBe(text);expect(report.textContent).not.toContain('999999');expect(report.querySelector('button,input,select,textarea')).toBeNull();
  });
  it('energy interval rejects malformed optional saved pins and retains legacy observations',()=>{
    for(const [enabled,pin] of [[undefined,undefined],['true',16],[1,16],[true,'16'],[true,-1],[true,25],[true,null],[true,NaN]]){
      mount({seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTrials:[sceneTrial({scene:scenePose({display:{version:'bridge-scene-display-v1',motionGuide:false,energyInFrame:false,energyFlow:false,overlay:false,energyInterval:enabled,intervalPinS:pin}})})]});
      click('Revisit scene observation 1: My scene');expect(state.seismicEnergyInterval).toBe(false);expect(state.seismicTime).toBe(7.217);expect(host.querySelector('[data-seismic-scene-interval]')).toBeNull();
      act(()=>root.unmount());root=null;host.remove();
    }
  });
  it('legacy scene observations do not inherit an unrelated live energy interval',()=>{
    mount({seismicEnergyInterval:true,seismicIntervalPinS:16.137,seismicTrials:[sceneTrial()]});click('Revisit scene observation 1: My scene');
    expect(state).toMatchObject({seismicEnergyInterval:false,seismicIntervalPinS:0,seismicTime:7.217});expect(host.querySelector('[data-interval-frame]')).toBeNull();
  });
  it('energy interval works in labelled 2D and graphics fallback with the current experiment',()=>{
    mount({bridgeView:'2d',seismicEnergyInterval:true,seismicEnergyOrbit:true,seismicTime:21.217,seismicIntervalPinS:16,seismicDampingRatio:0});
    expect(host.querySelector('[data-bridge-energy-interval="fallback"]')).toBeTruthy();expect(host.querySelector('[data-interval-insight]').textContent).toContain('stays constant');
    click('Pin end of shaking');expect(state.seismicIntervalPinS).toBe(16);expect(host.querySelector('[data-orbit-pin]')).toBeTruthy();
    patch({bridgeView:'3d',seismicDampingRatio:0.2});act(()=>{viewerStatus='failed';viewerListener('failed');});
    expect(state.seismicEnergyInterval).toBe(true);expect(host.querySelector('[data-interval-frame]').dataset.intervalTrial).toBe('current');expect(host.querySelector('[data-interval-insight]').textContent).toContain('damping loss');
  });
  it('energy interval keeps zero-input readouts finite and updates its pin without starting playback',()=>{
    mount({seismicEnergyInterval:true,seismicEnergyOrbit:true,seismicIntensityG:0,seismicTime:17.217,seismicIntervalPinS:16});
    expect(host.querySelector('[data-interval-insight]').textContent).toContain('no energy transfer');
    expect([...host.querySelectorAll('[data-interval-term]')].every(n=>Number(n.dataset.intervalValue)===0)).toBe(true);
    expect(Number(host.querySelector('[data-interval-balance]').dataset.intervalBalance)).toBe(0);
    act(()=>Simulate.change(field('Pinned time (s)'),{target:{value:'99'}}));expect(state.seismicIntervalPinS).toBe(24);expect(state.seismicPlaying).toBe(false);
    expect(host.querySelector('[data-interval-bars]').innerHTML).not.toMatch(/NaN|Infinity/);
  });
  function checkOrbitComposition(inputs, time, trial = 'current', origin = 'scene') {
    const orbit = host.querySelector('[data-bridge-energy-orbit="' + origin + '"]');
    expect(orbit).toBeTruthy();
    const response = guideEnergyResponse(inputs);
    const point = guideEnergyOracle.bridgeSeismicEnergyInterval(response, time, time).earlier;
    const kinetic = point.velocityMps * point.velocityMps / 2;
    const elasticSpeed = 2 * Math.PI * response.naturalFrequencyHz * point.relativeM;
    const elastic = elasticSpeed * elasticSpeed / 2;
    const expected = { kinetic, elastic, stored: kinetic + elastic };
    const numberText = value => value !== 0 && value < 0.001 ? value.toExponential(2) : value.toFixed(3);
    const percentage = id => {
      const other = id === 'kinetic' ? 'elastic' : 'kinetic';
      if (!expected.stored) return '—';
      if (expected[id] === 0) return '0%';
      if (expected[other] === 0) return '100%';
      const fraction = expected[id] / expected.stored;
      return fraction < 0.001 ? '<0.1%' : fraction > 0.999 ? '>99.9%' : (fraction * 100).toFixed(1) + '%';
    };
    const split = orbit.querySelector('[data-orbit-split]');
    expect(split.dataset.orbitSplit).toBe(trial);
    expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitTrial).toBe(trial);
    const total = orbit.querySelector('[data-orbit-energy-total]');
    expect(total.tagName).toBe('STRONG');
    expect(total.textContent).toBe(numberText(expected.stored));
    expect(total.parentElement.textContent).toContain(numberText(expected.stored) + ' J/kg');
    expect(Number(orbit.querySelector('[data-orbit-energy="stored"]').dataset.orbitValue)).toBe(expected.stored);
    const scaleHelp = split.querySelector('[data-orbit-energy-scale-help]');
    expect(Boolean(scaleHelp)).toBe(expected.stored > 0);
    if (scaleHelp) expect(scaleHelp.textContent).toContain('100%');
    expect(Boolean(split.querySelector('[data-orbit-energy-empty]'))).toBe(expected.stored === 0);
    const bar = split.querySelector('[role="img"]');
    expect(bar).toBeTruthy();
    if (!expected.stored) expect(bar.getAttribute('aria-label')).toContain('No stored energy');
    for (const id of ['kinetic', 'elastic']) {
      const row = orbit.querySelector('[data-orbit-energy="' + id + '"]');
      expect(row.closest('dl')).toBeTruthy();
      expect(row.closest('svg,[aria-hidden="true"]')).toBeNull();
      expect(row.querySelector('dt').textContent.toLowerCase()).toBe(id);
      expect(Number(row.dataset.orbitValue)).toBe(expected[id]);
      expect(row.querySelector('strong').textContent).toBe(numberText(expected[id]));
      expect(row.querySelector('strong').closest('dd').textContent).toBe(numberText(expected[id]) + ' J/kg');
      const fraction = expected.stored > 0 ? expected[id] / expected.stored : 0;
      const share = row.querySelector('[data-orbit-energy-share="' + id + '"]');
      expect(share.tagName).toBe('DD');
      expect(share.textContent).toBe(percentage(id));
      if (expected.stored) expect(bar.getAttribute('aria-label')).toContain(percentage(id));
      const part = split.querySelector('[data-orbit-part="' + id + '"]');
      expect(Number(part.dataset.orbitFraction)).toBe(fraction);
      expect(Number.parseFloat(part.style.width)).toBeCloseTo(fraction * 100, 10);
    }
    expect(split.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
    return expected;
  }

  it('orbit composition: labels native energy shares and follows A/B at one inspection time', () => {
    mount({ seismicEnergyOrbit: true, seismicGuideOpen: true, seismicSceneNote: 'Compare the same moment.' });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.217 });
    const currentInputs = guideEnergyCurrentInputs(), before = { ...state };
    const b = checkOrbitComposition(currentInputs, 7.217);
    click('A · reference');
    const a = checkOrbitComposition(state.seismicGuideBaseline.inputs, 7.217, 'reference');
    expect(a.stored).not.toBe(b.stored);
    expect(guideEnergyCurrentInputs()).toEqual(currentInputs);
    expect(state.seismicTime).toBe(7.217);
    expect(state.seismicSceneNote).toBe(before.seismicSceneNote);
    click('B · current');
    expect(checkOrbitComposition(currentInputs, 7.217)).toEqual(b);
  });

  it('orbit composition: preserves tiny nonzero energy and amplitude-independent shares', () => {
    mount({ seismicEnergyOrbit: true, seismicTime: 7.217, seismicIntensityG: 0.12 });
    const ordinary = checkOrbitComposition(guideEnergyCurrentInputs(), 7.217);
    const shares = [...host.querySelectorAll('[data-orbit-energy-share]')].map(node => node.textContent);
    patch({ seismicIntensityG: 1e-7 });
    const tiny = checkOrbitComposition(guideEnergyCurrentInputs(), 7.217);
    expect(tiny.stored).toBeGreaterThan(0);
    expect(tiny.stored).toBeLessThan(0.001);
    expect(tiny.kinetic / tiny.stored).toBeCloseTo(ordinary.kinetic / ordinary.stored, 10);
    expect([...host.querySelectorAll('[data-orbit-energy-share]')].map(node => node.textContent)).toEqual(shares);
    expect(host.querySelector('[data-orbit-energy-total]').textContent).toMatch(/e-\d+/);
  });

  it('orbit composition: distinguishes an empty total from two zero-percent shares in scene and fallback', () => {
    mount({ seismicEnergyOrbit: true, seismicIntensityG: 0, seismicTime: 7.217 });
    expect(checkOrbitComposition(guideEnergyCurrentInputs(), 7.217).stored).toBe(0);
    expect(host.querySelector('[data-orbit-energy-empty]').textContent).toContain('No stored energy');
    expect([...host.querySelectorAll('[data-orbit-energy-share]')].map(node => node.textContent)).toEqual(['—', '—']);
    expect(button('Next turning point').disabled).toBe(true);
    act(() => { viewerStatus = 'failed'; viewerListener('failed'); });
    expect(checkOrbitComposition(guideEnergyCurrentInputs(), 7.217, 'current', 'fallback').stored).toBe(0);
  });

  it('orbit composition: tells tiny cycle shares truthfully while preserving viewpoint, pin, inputs and notes', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicEnergyOrbit: true, seismicTime: 16, seismicIntervalPinS: 2.317,
      seismicSceneNote: 'Keep this observation.', seismicObservation: 'Energy changes form.',
      seismicPrediction: 'At a turn, most energy will be elastic.' });
    const inputs = guideEnergyCurrentInputs();
    const invariant = () => [state.bridgeView, state.bridgeObserver, state.bridgeBankYaw, state.seismicIntervalPinS,
      state.seismicSceneNote, state.seismicObservation, state.seismicPrediction, guideEnergyCurrentInputs()];
    const before = invariant();
    for (const [label, dominant] of [['Next turning point', 'elastic'], ['Next center crossing', 'kinetic']]) {
      const time = Number(button(label).dataset.orbitNextTime);
      click(label);
      expect(state.seismicTime).toBe(time);
      const amounts = checkOrbitComposition(inputs, time);
      expect(amounts[dominant] / amounts.stored).toBeGreaterThan(0.999);
      expect(invariant()).toEqual(before);
      expect(state.seismicPlaying).toBe(false);
      tick(300);
      expect(state.seismicTime).toBe(time);
    }
  });

  function checkCycleTargetPreviews(inputs, trial = 'current') {
    const response = guideEnergyResponse(inputs);
    const controls = host.querySelector('[data-orbit-cycle-controls]');
    expect(controls).toBeTruthy();
    const buttons = [...controls.querySelectorAll('button[data-orbit-step]')];
    expect(buttons).toHaveLength(4);
    return buttons.map(control => {
      const kind = control.dataset.orbitKind, step = control.dataset.orbitStep;
      const preview = control.querySelector('[data-orbit-target-preview]');
      const symbol = control.querySelector('[data-orbit-cycle-symbol]');
      expect(symbol).toBeTruthy();
      expect(symbol.dataset.orbitCycleSymbol).toBe(kind);
      expect(symbol.textContent).toBe(kind === 'turning' ? '○' : '◇');
      expect(symbol.getAttribute('aria-hidden')).toBe('true');
      const descriptionIds = control.getAttribute('aria-describedby').split(/\s+/);
      const timeLabel = control.querySelector('[data-orbit-destination]');
      expect(descriptionIds).toContain(timeLabel.id);
      for (const id of descriptionIds) expect(document.getElementById(id)).toBeTruthy();
      const label = control.getAttribute('aria-label');
      expect(label).toBe((step === 'previous' ? 'Previous' : 'Next') + (kind === 'turning' ? ' turning point' : ' center crossing'));
      if (control.disabled) {
        expect(preview).toBeNull();
        expect(descriptionIds).toEqual([timeLabel.id]);
        return { label, disabled: true };
      }
      const time = Number(step === 'next' ? control.dataset.orbitNextTime : control.dataset.orbitPreviousTime);
      const sample = guideEnergyOracle.bridgeSeismicEnergyInterval(response, time, time).earlier;
      const kinetic = sample.velocityMps * sample.velocityMps / 2;
      const elasticSpeed = 2 * Math.PI * response.naturalFrequencyHz * sample.relativeM;
      const elastic = elasticSpeed * elasticSpeed / 2, stored = kinetic + elastic;
      const dominant = kind === 'turning' ? elastic : kinetic;
      const other = kind === 'turning' ? kinetic : elastic;
      const share = dominant / stored;
      const shareText = dominant === 0 ? '0%' : other === 0 ? '100%'
        : share < 0.001 ? '<0.1%' : share > 0.999 ? '>99.9%' : (100 * share).toFixed(1) + '%';
      expect(stored).toBeGreaterThan(0);
      expect(preview).toBeTruthy();
      expect(preview.dataset.orbitTargetPreview).toBe(kind);
      expect(preview.dataset.orbitTargetTrial).toBe(trial);
      expect(Number(preview.dataset.orbitTargetTime)).toBe(time);
      expect(Number(preview.dataset.orbitTargetStored)).toBe(stored);
      expect(Number(preview.dataset.orbitTargetShare)).toBe(share);
      expect(timeLabel.textContent).toBe(time.toFixed(3) + ' s');
      expect(preview.querySelector('[data-orbit-target-percent]').textContent).toBe(shareText);
      expect(preview.textContent).toContain(kind === 'turning' ? 'Elastic' : 'Kinetic');
      expect(descriptionIds).toContain(preview.id);
      for (const [id, value] of [['kinetic', kinetic], ['elastic', elastic]]) {
        const part = preview.querySelector('[data-orbit-target-part="' + id + '"]');
        expect(part).toBeTruthy();
        expect(part.closest('[aria-hidden="true"]')).toBeTruthy();
        expect(Number(part.dataset.orbitTargetFraction)).toBe(value / stored);
        expect(Number.parseFloat(part.style.width)).toBeCloseTo(100 * value / stored, 10);
      }
      expect(preview.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
      return { label, disabled: false, time, kinetic, elastic, stored, share, shareText };
    });
  }

  function cycleTapTimeline(scope = 'scene') {
    const orbit = host.querySelector('[data-bridge-energy-orbit="' + scope + '"]');
    const timeline = orbit.querySelector('[data-orbit-cycle-timeline]');
    expect(timeline.getAttribute('aria-hidden')).toBe('true');
    expect(timeline.getAttribute('focusable')).toBe('false');
    expect(timeline.getAttribute('tabindex')).toBeNull();
    return timeline;
  }

  function cycleTapTimes(kind, scope = 'scene') {
    return [...cycleTapTimeline(scope).querySelectorAll('[data-orbit-cycle-marker="' + kind + '"]')]
      .map(marker => Number(marker.dataset.orbitCycleTime)).sort((a, b) => a - b);
  }

  function tapCycleLane(kind, requestedTime, scope = 'scene') {
    const timeline = cycleTapTimeline(scope);
    const lane = timeline.querySelector('[data-orbit-cycle-tap="' + kind + '"]');
    expect(lane).toBeTruthy();
    expect(lane.tagName.toLowerCase()).toBe('rect');
    expect(Number(lane.getAttribute('x'))).toBe(12);
    expect(Number(lane.getAttribute('width'))).toBe(236);
    expect(Number(lane.getAttribute('y'))).toBe(kind === 'turning' ? 8 : 76);
    expect(Number(lane.getAttribute('height'))).toBe(68);
    const x = 12 + (requestedTime - 16) / 8 * 236, y = kind === 'turning' ? 42 : 110;
    const inverse = {}, inverseTransform = vi.fn(() => inverse);
    const point = { x: 0, y: 0, matrixTransform: vi.fn(function(matrix) {
      expect(matrix).toBe(inverse);
      return { x: (this.x - 103) / 1.5, y: (this.y - 71) / 0.75 };
    }) };
    timeline.createSVGPoint = vi.fn(() => point);
    timeline.getScreenCTM = vi.fn(() => ({ inverse: inverseTransform }));
    act(() => Simulate.click(lane, { clientX: 103 + x * 1.5, clientY: 71 + y * 0.75 }));
    return { timeline, lane, inverseTransform, point };
  }

  it('cycle tap: transforms pointer coordinates to exact recorded events and pauses without changing learner evidence', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicEnergyOrbit: true, seismicTime: 19.417, seismicIntervalPinS: 12.319,
      seismicSceneNote: 'Keep this turning-point observation.', seismicObservation: 'Energy changes form.',
      seismicPrediction: 'The center crossing has mostly kinetic energy.' });
    for (const kind of ['turning', 'crossing']) {
      const times = cycleTapTimes(kind);
      expect(times.length).toBeGreaterThan(2);
      const target = times[Math.floor(times.length / 2)], near = target + 0.001;
      patch({ seismicPlaying: true });
      const before = { ...state };
      const tapped = tapCycleLane(kind, near);
      expect(tapped.lane.style.cursor).toBe('pointer');
      expect(tapped.timeline.createSVGPoint).toHaveBeenCalledOnce();
      expect(tapped.timeline.getScreenCTM).toHaveBeenCalledOnce();
      expect(tapped.inverseTransform).toHaveBeenCalledOnce();
      expect(tapped.point.matrixTransform).toHaveBeenCalledOnce();
      expect(state).toEqual({ ...before, seismicTime: target, seismicPlaying: false, autoDriving: false });
      checkCycleReadout(kind);
      tick(300);
      expect(state.seismicTime).toBe(target);
    }
    const beforeAxis = { ...state }, timeline = cycleTapTimeline();
    act(() => Simulate.click(timeline, { clientX: 103 + 100 * 1.5, clientY: 71 + 150 * 0.75 }));
    expect(state).toEqual(beforeAxis);
    expect([...host.querySelectorAll('[data-orbit-cycle-controls] button[data-orbit-step]')]).toHaveLength(4);
  });

  it('cycle tap: the same lane position uses the selected A or B response and preserves the comparison', () => {
    mount({ seismicEnergyOrbit: true, seismicGuideOpen: true, seismicSceneNote: 'Compare the two trials.',
      seismicIntervalPinS: 12.319, seismicTime: 19.417 });
    click('Prepare 5% / 20% comparison');
    const requestedTime = 19.417, inspected = [];
    for (const [label, trial] of [['A · reference', 'reference'], ['B · current', 'current']]) {
      click(label);
      const times = cycleTapTimes('turning');
      const target = times.reduce((best, time) => Math.abs(time - requestedTime) < Math.abs(best - requestedTime) ? time : best);
      const before = { ...state };
      tapCycleLane('turning', requestedTime);
      expect(state).toEqual({ ...before, seismicTime: target, seismicPlaying: false, autoDriving: false });
      expect(state.seismicSceneTrial).toBe(trial);
      expect(checkCycleReadout('turning').querySelector('[data-orbit-cycle-scope]').textContent).toBe(label);
      inspected.push(target);
    }
    expect(inspected[0]).not.toBe(inspected[1]);
  });

  it('cycle tap: keeps tiny events interactive, empty lanes inert and fallback inspection on the current trial', () => {
    act(() => media.change(true));
    mount({ seismicEnergyOrbit: true, seismicIntensityG: 1e-9, seismicTime: 19.417,
      seismicSceneNote: 'Keep the tiny-input observation.', seismicIntervalPinS: 12.319 });
    const tinyTime = cycleTapTimes('crossing')[1], tinyBefore = { ...state };
    tapCycleLane('crossing', tinyTime + 0.001);
    expect(state).toEqual({ ...tinyBefore, seismicTime: tinyTime, seismicPlaying: false, autoDriving: false });
    checkCycleReadout('crossing');
    expect(Number(host.querySelector('[data-orbit-energy="stored"]').dataset.orbitValue)).toBeGreaterThan(0);
    patch({ seismicIntensityG: 0 });
    const emptyBefore = { ...state };
    for (const kind of ['turning', 'crossing']) {
      expect(cycleTapTimes(kind)).toEqual([]);
      const empty = tapCycleLane(kind, 19.417);
      expect(empty.lane.style.cursor).not.toBe('pointer');
      expect(empty.timeline.createSVGPoint).not.toHaveBeenCalled();
      expect(state).toEqual(emptyBefore);
    }
    checkCycleReadout(null);
    patch({ bridgeView: '2d', seismicIntensityG: 0.12, seismicTime: 19.417 });
    const fallbackTime = cycleTapTimes('turning', 'fallback')[1], fallbackBefore = { ...state };
    tapCycleLane('turning', fallbackTime + 0.001, 'fallback');
    expect(state).toEqual({ ...fallbackBefore, seismicTime: fallbackTime, seismicPlaying: false, autoDriving: false });
    expect(checkCycleReadout('turning', 'fallback').querySelector('[data-orbit-cycle-scope]').textContent).toBe('Current experiment');
  });

  function checkCycleReadout(kind, scope = 'scene') {
    const orbit = host.querySelector('[data-bridge-energy-orbit="' + scope + '"]');
    const status = orbit.querySelector('[data-orbit-cycle-map-status]');
    const time = status.querySelector('[data-orbit-cycle-time-label]');
    expect(time.textContent).toBe(state.seismicTime.toFixed(3) + ' s');
    expect(time.style.whiteSpace).toBe('nowrap');
    expect(time.style.fontSize).toBe('14px');
    expect(time.closest('svg,[aria-hidden="true"]')).toBeNull();
    expect(time.closest('[aria-live]').getAttribute('aria-live')).toBe('off');
    const badge = status.querySelector('[data-orbit-cycle-current]');
    if (kind) {
      expect(badge.dataset.orbitCycleCurrent).toBe(kind);
      expect(badge.textContent).toContain(kind === 'turning' ? 'Turning point' : 'Center crossing');
      expect(badge.querySelector('[aria-hidden="true"]').textContent).toBe(kind === 'turning' ? '○' : '◇');
      const markers = orbit.querySelectorAll('[data-orbit-cycle-selected="true"]');
      expect(markers).toHaveLength(1);
      expect(markers[0].dataset.orbitCycleMarker).toBe(kind);
    } else expect(badge).toBeNull();
    return status;
  }

  it('cycle readout: identifies exact inspected events while rejecting nearby frames with the same rounded time', () => {
    mount({ seismicEnergyOrbit: true, seismicTime: 19.417, seismicIntervalPinS: 12.319, seismicSceneNote: 'Keep the event explanation.' });
    const before = { ...state }, target = Number(button('Next turning point').dataset.orbitNextTime);
    click('Next turning point');
    expect(state).toEqual({ ...before, seismicTime: target, seismicPlaying: false, autoDriving: false });
    checkCycleReadout('turning');
    const near = target + (Number(target.toFixed(3)) >= target ? 1e-5 : -1e-5);
    expect(near.toFixed(3)).toBe(target.toFixed(3));
    patch({ seismicTime: near }); checkCycleReadout(null);
    click('Next center crossing'); checkCycleReadout('crossing');
    expect(state.seismicIntervalPinS).toBe(before.seismicIntervalPinS);
    expect(state.seismicSceneNote).toBe(before.seismicSceneNote);
  });

  it('cycle readout: follows A and B event identity at the same clock without changing learner evidence', () => {
    mount({ seismicEnergyOrbit: true, seismicGuideOpen: true, seismicSceneNote: 'Keep A evidence.', seismicIntervalPinS: 12.319 });
    click('Prepare 5% / 20% comparison'); click('A · reference'); patch({ seismicTime: 19.417 });
    click('Next turning point');
    expect(checkCycleReadout('turning').querySelector('[data-orbit-cycle-scope]').textContent).toBe('A · reference');
    const before = { ...state };
    click('B · current');
    expect(state).toEqual({ ...before, seismicSceneTrial: 'current' });
    expect(checkCycleReadout(null).querySelector('[data-orbit-cycle-scope]').textContent).toBe('B · current');
  });

  it('cycle readout: retains tiny-event identity, clears zero-input events and supports fallback inspection', () => {
    act(() => media.change(true));
    mount({ seismicEnergyOrbit: true, seismicIntensityG: 1e-9, seismicTime: 19.417, seismicSceneNote: 'Keep the tiny event.' });
    click('Next center crossing'); checkCycleReadout('crossing');
    expect(Number(host.querySelector('[data-orbit-energy="stored"]').dataset.orbitValue)).toBeGreaterThan(0);
    patch({ seismicIntensityG: 0 }); checkCycleReadout(null);
    patch({ seismicTime: 10.123 }); expect(checkCycleReadout(null).textContent).toContain('Before free vibration');
    patch({ bridgeView: '2d', seismicIntensityG: 0.12, seismicTime: 19.417 });
    click('Next turning point');
    expect(checkCycleReadout('turning', 'fallback').querySelector('[data-orbit-cycle-scope]').textContent).toBe('Current experiment');
    expect(state.seismicSceneNote).toBe('Keep the tiny event.');
  });

  it('cycle preview: all four destinations predict the inspected energy while keeping pin, notes and viewpoint', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicEnergyOrbit: true, seismicTime: 20, seismicIntervalPinS: 2.317,
      seismicSceneNote: 'Keep this observation.', seismicObservation: 'Energy changes form.',
      seismicPrediction: 'At a turn, most energy will be elastic.' });
    const inputs = guideEnergyCurrentInputs();
    const invariant = () => [state.bridgeView, state.bridgeObserver, state.bridgeBankYaw, state.seismicIntervalPinS,
      state.seismicSceneNote, state.seismicObservation, state.seismicPrediction, guideEnergyCurrentInputs()];
    const before = invariant();
    const initial = checkCycleTargetPreviews(inputs);
    expect(initial.every(target => !target.disabled)).toBe(true);
    for (const initialTarget of initial) {
      patch({ seismicTime: 20 });
      const target = checkCycleTargetPreviews(inputs).find(item => item.label === initialTarget.label);
      click(target.label);
      expect(state.seismicTime).toBe(target.time);
      const actual = checkOrbitComposition(inputs, target.time);
      for (const id of ['kinetic', 'elastic', 'stored']) expect(actual[id]).toBe(target[id]);
      expect(invariant()).toEqual(before);
      expect(state.seismicPlaying).toBe(false);
      expect(state.autoDriving).toBe(false);
      tick(300);
      expect(state.seismicTime).toBe(target.time);
    }
  });

  it('cycle preview: guide A and B predict their own destinations at the same inspection clock', () => {
    mount({ seismicEnergyOrbit: true, seismicGuideOpen: true, seismicSceneNote: 'Compare A and B.' });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 20 });
    const inputs = guideEnergyCurrentInputs();
    const b = checkCycleTargetPreviews(inputs);
    click('A · reference');
    const a = checkCycleTargetPreviews(state.seismicGuideBaseline.inputs, 'reference');
    expect(a.map(target => target.time)).not.toEqual(b.map(target => target.time));
    expect(a.map(target => target.stored)).not.toEqual(b.map(target => target.stored));
    expect(state.seismicTime).toBe(20);
    expect(guideEnergyCurrentInputs()).toEqual(inputs);
    click('B · current');
    expect(checkCycleTargetPreviews(inputs)).toEqual(b);
    expect(state.seismicTime).toBe(20);
    expect(state.seismicSceneNote).toBe('Compare A and B.');
  });

  it('cycle preview: saved A predictions survive changes to current B and match energy after a jump', () => {
    const inputs = { archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 0.17, dampingRatio: 0.025 };
    const records = [{ version: 'bridge-seismic-v1', name: 'Saved flexible reference', timeS: 12.319,
      inputs, prediction: 'Saved prediction', observation: 'Saved explanation' }];
    mount({ bridgeView: 'immersive', seismicEnergyOrbit: true, seismicTrials: records, seismicReferenceIndex: 0,
      seismicDampingRatio: 0.25, seismicSceneNote: 'Selected A evidence.', seismicIntervalPinS: 1.217 });
    click('Compare saved trial in scene');
    click('A · reference');
    patch({ seismicTime: 20 });
    const a = checkCycleTargetPreviews(inputs, 'reference');
    patch({ seismicIntensityG: 0.07, seismicFrequencyHz: 2.6, seismicDampingRatio: 0.4 });
    expect(checkCycleTargetPreviews(inputs, 'reference')).toEqual(a);
    const target = a.find(item => item.label === 'Next center crossing');
    click(target.label);
    expect(state.seismicTime).toBe(target.time);
    expect(checkOrbitComposition(inputs, target.time, 'reference').stored).toBe(target.stored);
    expect(state.seismicTrials).toEqual(records);
    expect(state.seismicSceneSource).toBe('saved');
    expect(state.seismicSceneNote).toBe('Selected A evidence.');
    expect(state.seismicIntervalPinS).toBe(1.217);
  });

  it('cycle preview: tiny nonzero energies retain accurate shares and manual inspection under reduced motion', () => {
    media.change(true);
    mount({ seismicEnergyOrbit: true, seismicTime: 20, seismicIntensityG: 1e-10 });
    const inputs = guideEnergyCurrentInputs(), targets = checkCycleTargetPreviews(inputs);
    expect(button('Replay scene').disabled).toBe(true);
    for (const target of targets) {
      expect(target.disabled).toBe(false);
      expect(target.stored).toBeGreaterThan(0);
      expect(target.stored).toBeLessThan(1e-12);
      expect(target.share).toBeGreaterThan(0.999);
    }
    const target = targets.find(item => item.label === 'Next turning point');
    click(target.label);
    expect(state.seismicTime).toBe(target.time);
    expect(checkOrbitComposition(inputs, target.time).stored).toBe(target.stored);
    expect(state.seismicPlaying).toBe(false);
  });

  it('cycle preview: unavailable boundary destinations and zero input never imply an energy preview', () => {
    mount({ seismicEnergyOrbit: true, seismicTime: 0 });
    const inputs = guideEnergyCurrentInputs();
    let targets = checkCycleTargetPreviews(inputs);
    expect(targets.filter(target => target.disabled).map(target => target.label)).toEqual(['Previous turning point', 'Previous center crossing']);
    patch({ seismicTime: 24 });
    targets = checkCycleTargetPreviews(inputs);
    expect(targets.filter(target => target.disabled).map(target => target.label)).toEqual(['Next turning point', 'Next center crossing']);
    patch({ seismicIntensityG: 0, seismicTime: 20 });
    targets = checkCycleTargetPreviews(guideEnergyCurrentInputs());
    expect(targets.every(target => target.disabled)).toBe(true);
    expect(host.querySelector('[data-orbit-target-preview]')).toBeNull();
    expect(host.querySelectorAll('[data-orbit-cycle-symbol]')).toHaveLength(4);
  });

  it('recent orbit follows the shared replay clock and the selected comparison trial', () => {
    mount({seismicEnergyOrbit:true,seismicGuideOpen:true});click('Prepare 5% / 20% comparison');patch({seismicTime:7.217});
    const signature=lastScene.sig, plot=host.querySelector('[data-orbit-frame]');
    const current=[...host.querySelectorAll('[data-orbit-recent]')].map(node=>node.getAttribute('points'));
    expect(current).toHaveLength(4);expect(host.querySelector('[data-orbit-direction]').dataset.orbitDirection).toBe('current');
    expect(Number(host.querySelector('[data-orbit-recent]').dataset.orbitRecentEnd)).toBeCloseTo(state.seismicTime,12);
    click('A · reference');expect(state.seismicTime).toBe(7.217);expect(plot.dataset.orbitTrial).toBe('reference');
    expect([...host.querySelectorAll('[data-orbit-recent]')].map(node=>node.getAttribute('points'))).not.toEqual(current);
    expect(host.querySelector('[data-orbit-direction]').dataset.orbitDirection).toBe('reference');
    expect(host.querySelector('[data-orbit-split]').dataset.orbitSplit).toBe('reference');
    patch({seismicTime:7.467});expect(Number(host.querySelector('[data-orbit-recent]').dataset.orbitRecentEnd)).toBeCloseTo(7.467,12);
    expect(lastScene.sig).toBe(signature);expect(state.seismicPlaying).toBe(false);
  });
  it('stored-energy split shows exchange extrema and remains empty for zero shaking', () => {
    mount({seismicEnergyOrbit:true});click('Next turning point');
    const fraction=id=>Number(host.querySelector('[data-orbit-part="'+id+'"]').dataset.orbitFraction);
    expect(fraction('kinetic')).toBeCloseTo(0,10);expect(fraction('elastic')).toBeCloseTo(1,10);
    click('Next center crossing');expect(fraction('kinetic')).toBeCloseTo(1,10);expect(fraction('elastic')).toBeCloseTo(0,10);
    patch({seismicIntensityG:0});expect(fraction('kinetic')).toBe(0);expect(fraction('elastic')).toBe(0);
    expect(host.querySelector('[data-orbit-split]').textContent).toContain('No stored energy');
    expect(host.querySelector('[data-orbit-recent-caption]').textContent).toBe('No recent motion');
    expect(host.querySelector('[data-orbit-direction]')).toBeNull();expect(host.querySelector('[data-orbit-recent]')).toBeNull();
  });
  it('saved observation restoration rebuilds the same trail and energy split from model inputs', () => {
    mount({seismicEnergyOrbit:true,seismicSceneRecording:true,seismicTime:7.217});
    const paths=()=>[...host.querySelectorAll('[data-orbit-recent]')].map(node=>node.getAttribute('points'));
    const fractions=()=>[...host.querySelectorAll('[data-orbit-part]')].map(node=>node.dataset.orbitFraction);
    const expectedPaths=paths(), expectedFractions=fractions();click('Save scene observation');const record=state.seismicTrials[0];
    patch({seismicTime:20,seismicDampingRatio:0.4});expect(paths()).not.toEqual(expectedPaths);
    click('Revisit scene observation 1: '+record.name);expect(paths()).toEqual(expectedPaths);expect(fractions()).toEqual(expectedFractions);
    expect(state.seismicTime).toBe(7.217);expect(state.seismicPlaying).toBe(false);
  });

  it('energy orbit opens paused and keeps the complete history and scale fixed during inspection',()=>{
    mount({seismicTime:7.217});click('Replay scene');tick(100);const time=state.seismicTime,signature=lastScene.sig;
    const orbit=host.querySelector('[data-bridge-energy-orbit="scene"]');
    act(()=>{orbit.open=true;orbit.dispatchEvent(new Event('toggle'));});
    expect(state).toMatchObject({seismicEnergyOrbit:true,seismicPlaying:false,seismicTime:time});
    const path=orbit.querySelector('[data-orbit-free]').getAttribute('points'),range=orbit.querySelector('[data-orbit-frame]').dataset.orbitLimit;
    patch({seismicTime:16});expect(orbit.querySelector('[data-orbit-free]').getAttribute('points')).toBe(path);
    expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitLimit).toBe(range);expect(lastScene.sig).toBe(signature);
    expect(orbit.querySelector('[data-orbit-insight]').textContent).toContain('contracts');
    click('Focus scene');expect(host.querySelector('[data-bridge-compact-orbit]')).toBeTruthy();expect(state.seismicEnergyOrbit).toBe(true);
  });
  it('energy orbit inspects selected-trial free-vibration turning points and center crossings without starting replay',()=>{
    mount({seismicEnergyOrbit:true,seismicForceLens:true,seismicGuideOpen:true,seismicObservation:'Keep my explanation.'});click('Prepare 5% / 20% comparison');patch({seismicTime:7.217});
    const orbit=host.querySelector('[data-bridge-energy-orbit="scene"]'),turn=Number(button('Next turning point').dataset.orbitNextTime);
    click('Next turning point');expect(state.seismicTime).toBe(turn);expect(turn).toBeGreaterThanOrEqual(16);
    expect(Math.abs(lastScene.forceLens.dampingNPerKg)).toBeLessThan(1e-10);expect(Math.abs(Number(orbit.querySelector('[data-orbit-energy="kinetic"]').dataset.orbitValue))).toBeLessThan(1e-20);
    expect(orbit.querySelector('[data-orbit-insight]').dataset.orbitInsight).toBe('turning');
    click('Next center crossing');expect(state.seismicTime).toBeGreaterThan(turn);
    expect(Math.abs(lastScene.forceLens.springNPerKg)).toBeLessThan(1e-10);expect(Number(orbit.querySelector('[data-orbit-energy="kinetic"]').dataset.orbitValue)).toBeGreaterThan(0);
    expect(orbit.querySelector('[data-orbit-insight]').dataset.orbitInsight).toBe('crossing');
    const time=state.seismicTime,range=orbit.querySelector('[data-orbit-frame]').dataset.orbitLimit;
    click('A · reference');expect(state.seismicTime).toBe(time);expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitTrial).toBe('reference');
    expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitLimit).toBe(range);expect(orbit.querySelector('[data-orbit-insight]').dataset.orbitInsight).toBe('response');
    expect(orbit.querySelectorAll('[data-orbit-marker]')).toHaveLength(2);expect(state.seismicObservation).toBe('Keep my explanation.');
    tick(500);expect(state.seismicTime).toBe(time);expect(state.seismicPlaying).toBe(false);
  });
  it('energy orbit supports manual cycle inspection under reduced motion and disables exhausted or zero-input cycles',()=>{
    act(()=>media.change(true));mount({seismicEnergyOrbit:true,seismicTime:16,seismicDampingRatio:0});
    expect(button('Replay scene').disabled).toBe(true);click('Next center crossing');expect(state.seismicTime).toBeGreaterThan(16);
    expect(host.querySelector('[data-orbit-insight]').dataset.orbitInsight).toBe('crossing');
    patch({seismicTime:24});expect(button('Next center crossing').disabled).toBe(true);expect(button('Next turning point').disabled).toBe(true);
    patch({seismicTime:7.217,seismicIntensityG:0});expect(button('Next center crossing').disabled).toBe(true);expect(button('Next turning point').disabled).toBe(true);
    expect(host.querySelector('[data-orbit-insight]').textContent).toContain('No shaking');
    expect([...host.querySelectorAll('[data-orbit-energy]')].every(row=>Number(row.dataset.orbitValue)===0)).toBe(true);
    expect(host.querySelector('[data-orbit-free]').getAttribute('points')).not.toMatch(/NaN|Infinity/);
  });
  it('energy orbit saves and restores its exact cycle frame and prints recalculated energy evidence',()=>{
    mount({seismicEnergyOrbit:true,seismicSceneRecording:true,seismicSceneNote:'At a turn, kinetic energy is zero.'});click('Next turning point');
    const time=state.seismicTime,energies=['kinetic','elastic','stored'].map(id=>host.querySelector('[data-orbit-energy="'+id+'"] strong').textContent).join(' / ');
    click('Save scene observation');const record=state.seismicTrials[0];expect(record.scene.display.energyOrbit).toBe(true);expect(record.timeS).toBe(time);
    patch({seismicEnergyOrbit:false,seismicTime:0,seismicTrials:[{...record,orbit:{storedJPerKg:999999}}]});
    expect(host.querySelector('[data-seismic-scene-orbit]').textContent).toContain(energies);
    click('Revisit scene observation 1: '+record.name);expect(state).toMatchObject({seismicEnergyOrbit:true,seismicTime:time,seismicPlaying:false});
    expect(host.querySelector('[data-orbit-insight]').dataset.orbitInsight).toBe('turning');
    click('Open earthquake evidence report');const report=host.querySelector('[data-bridge-print-seismic]');
    expect(report.querySelector('[data-seismic-scene-orbit]').textContent).toContain(energies);expect(report.textContent).not.toContain('999999');expect(report.querySelector('button,input,select,textarea')).toBeNull();
  });
  it('energy orbit rejects malformed optional flags while preserving usable legacy observations',()=>{
    for(const flag of [undefined,'true',1,null]){
      mount({seismicEnergyOrbit:true,seismicTrials:[sceneTrial({scene:scenePose({display:{version:'bridge-scene-display-v1',motionGuide:false,energyInFrame:false,energyFlow:false,overlay:false,energyOrbit:flag}})})]});
      click('Revisit scene observation 1: My scene');expect(state.seismicEnergyOrbit).toBe(false);expect(state.seismicTime).toBe(7.217);
      expect(host.querySelector('[data-orbit-plot]')).toBeNull();act(()=>root.unmount());root=null;host.remove();
    }
  });
  it('energy orbit retains the preference after graphics loss and uses the current experiment in fallback',()=>{
    mount({seismicEnergyOrbit:true,seismicGuideOpen:true,seismicTime:7.217});click('Prepare 5% / 20% comparison');click('A · reference');patch({seismicTime:16});
    const a=Number(button('Next turning point').dataset.orbitNextTime);
    act(()=>{viewerStatus='failed';viewerListener('failed');});
    const orbit=host.querySelector('[data-bridge-energy-orbit="fallback"]');expect(orbit).toBeTruthy();expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitTrial).toBe('current');
    expect(Number(button('Next turning point').dataset.orbitNextTime)).not.toBe(a);expect(state.seismicEnergyOrbit).toBe(true);
    click('Next turning point');expect(state.seismicTime).toBeGreaterThan(16);expect(state.seismicPlaying).toBe(false);
    act(()=>{viewerStatus='ready';viewerListener('ready');});click('From the riverbank');expect(host.querySelector('[data-bridge-energy-orbit="scene"]')).toBeTruthy();
  });

  it('force lens pauses on opening and follows selected A/B with a fixed scale and static design untouched', () => {
    mount({seismicGuideOpen:true}); click('Prepare 5% / 20% comparison'); patch({seismicTime:7.217});
    const signature=lastScene.sig;
    click('Replay scene'); tick(100); const time=state.seismicTime;
    const lens=host.querySelector('[data-bridge-force-lens="scene"]');
    act(()=>{lens.open=true;lens.dispatchEvent(new Event('toggle'));});
    expect(state).toMatchObject({seismicForceLens:true,seismicPlaying:false,seismicTime:time});
    const f=lastScene.forceLens, limit=f.limitNPerKg;
    expect(f.enabled).toBe(true); expect(f.trial).toBe('current');
    expect(Number(host.querySelector('[data-force-reading="spring"]').dataset.forceValue)).toBe(f.springNPerKg);
    expect(f.netNPerKg).toBeCloseTo(f.springNPerKg+f.dampingNPerKg,12);
    click('A · reference'); expect(lastScene.forceLens.trial).toBe('reference'); expect(lastScene.forceLens.limitNPerKg).toBe(limit);
    expect(lastScene.forceLens.dampingNPerKg).not.toBe(f.dampingNPerKg);
    expect(host.querySelector('[data-force-frame]').dataset.forceTrial).toBe('reference');
    expect(lastScene.sig).toBe(signature); expect(state.seismicTime).toBe(time);
    click('Focus scene'); expect(host.querySelector('[data-bridge-compact-forces]')).toBeTruthy(); expect(lastScene.forceLens.enabled).toBe(true);
  });
  it('force lens retains its display preference in observations and restores the selected frame', () => {
    mount({seismicForceLens:true,seismicSceneRecording:true,seismicTime:7.217}); click('Save scene observation');
    const saved=state.seismicTrials[0], frame=JSON.stringify(lastScene.forceLens);
    expect(saved.scene.display.forceLens).toBe(true);
    patch({seismicForceLens:false,seismicTime:0}); click('Revisit scene observation 1: '+saved.name);
    expect(state).toMatchObject({seismicForceLens:true,seismicTime:7.217,seismicPlaying:false}); expect(JSON.stringify(lastScene.forceLens)).toBe(frame);
  });
  it('force lens prints recalculated saved forces and preserves escaped writing without trusting imported answers', () => {
    mount({seismicForceLens:true,seismicSceneRecording:true,seismicTime:7.217,seismicSceneNote:'<img src=x onerror=bad()> Compare arrows.'});
    click('Save scene observation'); const record=state.seismicTrials[0];
    const frame=lastScene.forceLens, expected=[frame.springNPerKg,frame.dampingNPerKg,frame.netNPerKg].map(v=>v.toFixed(3)).join(' / ');
    patch({seismicForceLens:false,seismicTime:0,seismicTrials:[{...record,forces:{springNPerKg:999999},sample:{netNPerKg:999999}}]});
    expect(host.querySelector('[data-seismic-scene-forces]').textContent).toContain(expected);
    click('Open earthquake evidence report'); const report=host.querySelector('[data-bridge-print-seismic]');
    expect(report.querySelector('[data-seismic-scene-forces]').textContent).toContain(expected);
    expect(report.textContent).not.toContain('999999');expect(report.textContent).toContain(record.observation);
    expect(report.querySelector('button,input,select,textarea,img')).toBeNull();
  });
  it('force lens ignores malformed optional preferences while retaining legacy observations', () => {
    for (const flag of [undefined,'true',1,null]) {
      mount({seismicForceLens:true,seismicTrials:[sceneTrial({scene:scenePose({display:{version:'bridge-scene-display-v1',motionGuide:false,energyInFrame:false,energyFlow:false,overlay:false,forceLens:flag}})})]});
      click('Revisit scene observation 1: My scene'); expect(state.seismicForceLens).toBe(false); expect(state.seismicTime).toBe(7.217);
      act(()=>root.unmount()); root=null; host.remove();
    }
  });
  it('force lens supports reduced motion and zero shaking without spurious values', () => {
    act(()=>media.change(true)); mount({seismicForceLens:true,seismicIntensityG:0,seismicTime:7.217});
    expect(button('Replay scene').disabled).toBe(true);
    const readings=[...host.querySelectorAll('[data-force-reading]')]; expect(readings).toHaveLength(3);
    expect(readings.every(row=>Number(row.dataset.forceValue)===0)).toBe(true);
    expect(lastScene.forceLens.limitNPerKg).toBeGreaterThan(0);
    patch({seismicTime:16}); expect(host.querySelector('[data-force-frame]').dataset.forceFrame).toBe('16');
    expect(state.seismicPlaying).toBeFalsy();
  });
  it('force lens remains available with paused fallback after graphics loss and recovers deliberately', () => {
    mount({seismicForceLens:true,seismicTime:7.217});
    act(()=>{viewerStatus='failed';viewerListener('failed');});
    expect(state.bridgeView).toBe('2d'); expect(host.querySelector('[data-bridge-force-lens="fallback"]')).toBeTruthy();
    expect(host.querySelector('[data-force-frame]').dataset.forceTrial).toBe('current');
    expect(state.seismicTime).toBe(7.217);
    act(()=>{viewerStatus='ready';viewerListener('ready');}); click('3D structure');
    expect(lastScene.forceLens.enabled).toBe(true); expect(host.querySelector('[data-bridge-force-lens="scene"]')).toBeTruthy();
  });

  it('defers graphics failure focus until native fullscreen finishes restoring focus', () => {
    mount({seismicForceLens:true,seismicTime:7.217});
    const stage=host.querySelector('[data-allo-fs-stage]'), viewer=host.querySelector('[aria-describedby="bridge-gl-description"]');
    let fullscreen=stage;
    const previous=Object.getOwnPropertyDescriptor(document,'fullscreenElement'), exit=window.__alloStemFS;
    Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>fullscreen});
    window.__alloStemFS=vi.fn(()=>{fullscreen=null;});
    try {
      act(()=>viewer.focus());
      act(()=>{viewerStatus='failed';viewerListener('failed');});
      expect(window.__alloStemFS).toHaveBeenCalledWith(stage);
      act(()=>document.dispatchEvent(new Event('fullscreenchange')));
      tick(32);
      expect(document.activeElement).toBe(host.querySelector('[data-bridge-elevation]'));
      expect(state).toMatchObject({bridgeView:'2d',seismicPlaying:false,seismicTime:7.217,seismicForceLens:true});
    } finally { if(previous)Object.defineProperty(document,'fullscreenElement',previous);else delete document.fullscreenElement;window.__alloStemFS=exit; }
  });

  it('focuses the scene without resetting replay, paired readings, physical inputs or geometry', () => {
    mount({ bridgeView: 'immersive', seismicGuideOpen: true, seismicObservation: 'Keep my notes.' });
    click('Prepare 5% / 20% comparison'); patch({ seismicTime: 7.217 });
    click('Replay scene'); tick(100);
    const time = state.seismicTime, comparison = JSON.stringify(lastScene.comparison), signature = lastScene.sig;
    click('Focus scene');
    expect(state).toMatchObject({ seismicSceneFocus: true, seismicReadoutCollapsed: true, seismicPlaying: true,
      seismicTime: time, seismicDampingRatio: 0.2, seismicObservation: 'Keep my notes.' });
    expect(button('Leave scene focus').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-bridge-scene-focus]').dataset.bridgeSceneFocus).toBe('true');
    expect(host.querySelector('[data-bridge-scene-drawer]').open).toBe(false);
    expect(host.querySelector('[data-bridge-compact-comparison]').dataset.bridgeCompactComparison).toBe(String(time));
    expect(host.querySelectorAll('[aria-label="Scene replay time (s)"]')).toHaveLength(1);
    expect(host.querySelector('[aria-label="Scene key moments"]')).toBeNull();
    expect(JSON.stringify(lastScene.comparison)).toBe(comparison); expect(lastScene.sig).toBe(signature);
    click('Leave scene focus');
    expect(state).toMatchObject({ seismicSceneFocus: false, seismicReadoutCollapsed: false, seismicPlaying: true, seismicTime: time });
    expect(host.querySelector('[data-bridge-focus-replay]')).toBeNull();
    expect(host.querySelectorAll('[aria-label="Scene key moments"]')).toHaveLength(1);
    expect(host.querySelectorAll('[aria-label="Scene replay time (s)"]')).toHaveLength(1);
  });

  it('pauses on opening focus tools and closes them with Escape while restoring keyboard focus', () => {
    mount({ seismicTime: 7.217 }); click('Focus scene'); click('Replay scene'); tick(100);
    const time = state.seismicTime, drawer = host.querySelector('[data-bridge-scene-drawer]');
    act(() => { drawer.open = true; drawer.dispatchEvent(new Event('toggle')); });
    expect(state).toMatchObject({ seismicReadoutCollapsed: false, seismicPlaying: false, seismicTime: time });
    expect(host.querySelectorAll('[aria-label="Scene key moments"]')).toHaveLength(1);
    const moments = field('Scene key moments');
    act(() => moments.focus());
    act(() => Simulate.keyDown(moments, { key: 'Escape' }));
    expect(state.seismicReadoutCollapsed).toBe(true);
    expect(document.activeElement).toBe(drawer.querySelector('summary'));
    expect(host.querySelector('[aria-label="Scene key moments"]')).toBeNull();
    tick(500); expect(state.seismicTime).toBe(time);
  });

  it('keeps manual focus steps usable under reduced motion with exact boundary clamping', () => {
    act(() => media.change(true));
    mount({ seismicSceneFocus: true, seismicReadoutCollapsed: true, seismicTime: 0, seismicIntensityG: 0 });
    expect(button('Replay scene').disabled).toBe(true);
    expect(button('Step scene backward 0.5 s').disabled).toBe(true);
    click('Step scene forward 0.5 s'); expect(state.seismicTime).toBe(0.5);
    click('Step scene backward 0.5 s'); expect(state.seismicTime).toBe(0);
    patch({ seismicTime: 23.9 }); click('Step scene forward 0.5 s');
    expect(state.seismicTime).toBe(24); expect(button('Step scene forward 0.5 s').disabled).toBe(true);
    act(() => Simulate.change(field('Scene replay time (s)'), { target: { value: '7.25' } }));
    expect(state).toMatchObject({ seismicTime: 7.25, seismicPlaying: false });
    expect(lastScene.quake).toMatchObject({ groundM: 0, deckM: 0 });
    tick(500); expect(state.seismicTime).toBe(7.25);
  });

  it('uses bounded touch walking, pauses motion in place, and preserves camera angles and evidence', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'deck', seismicSceneFocus: true, seismicReadoutCollapsed: true,
      bridgeWalkPos: 0.95, bridgeLookYaw: 32, bridgeLookPitch: -7, seismicTime: 7.217, seismicObservation: 'Keep this moment.' });
    const signature = lastScene.sig;
    click('Replay scene'); tick(100); const time = state.seismicTime;
    click('Walk toward far end');
    expect(state).toMatchObject({ bridgeWalkPos: 0.97, bridgeLookYaw: 32, bridgeLookPitch: -7,
      seismicTime: time, seismicPlaying: false, autoDriving: false, seismicObservation: 'Keep this moment.' });
    expect(button('Walk toward far end').disabled).toBe(true);
    expect(host.querySelector('[data-bridge-walk-position]').textContent).toBe('97%');
    click('Walk toward entrance'); expect(state.bridgeWalkPos).toBe(0.92);
    patch({ bridgeWalkPos: 0.031 }); click('Walk toward entrance');
    expect(state.bridgeWalkPos).toBe(0.03); expect(button('Walk toward entrance').disabled).toBe(true);
    expect(lastScene.sig).toBe(signature);
    tick(500); expect(state.seismicTime).toBe(time);
  });

  it('shows walking only on the deck and retains independent poses when switching observers in focus mode', () => {
    mount({ bridgeView: 'immersive', seismicSceneFocus: true, seismicReadoutCollapsed: true,
      bridgeWalkPos: 0.62, bridgeLookYaw: 27, bridgeLookPitch: -12, bridgeBankYaw: 18, bridgeBankPitch: -8, seismicTime: 7.217 });
    expect(host.querySelector('[data-bridge-walk-controls]')).toBeTruthy();
    click('Switch to riverbank viewpoint');
    expect(host.querySelector('[data-bridge-walk-controls]')).toBeNull();
    expect(lastScene.cameraMode).toBe('bank'); expect(state.seismicSceneFocus).toBe(true);
    click('Switch to deck viewpoint');
    expect(lastScene.cameraMode).toBe('deck');
    expect(state).toMatchObject({ bridgeWalkPos: 0.62, bridgeLookYaw: 27, bridgeLookPitch: -12,
      bridgeBankYaw: 18, bridgeBankPitch: -8, seismicTime: 7.217, seismicPlaying: false });
    expect(host.querySelector('[data-bridge-walk-controls]')).toBeTruthy();
  });

  it('saves focus preference with the full comparison and restores it with the recorder accessible', () => {
    mount({ bridgeView: 'immersive', seismicSceneFocus: true, seismicSceneRecording: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison'); patch({ seismicTime: 7.217, seismicSceneNote: 'Inspect this from the walkway.' });
    click('Save scene observation'); const saved = state.seismicTrials[0];
    expect(saved.scene.display.focusMode).toBe(true);
    const comparison = JSON.stringify(lastScene.comparison);
    patch({ seismicSceneFocus: false, seismicTime: 18, seismicDampingRatio: 0.3, seismicSceneCompare: false, bridgeView: '2d' });
    click('Revisit scene observation 1: ' + saved.name);
    expect(state).toMatchObject({ seismicSceneFocus: true, seismicReadoutCollapsed: false, seismicSceneRecording: true,
      seismicSceneSource: 'capture', seismicSceneNote: 'Inspect this from the walkway.', seismicTime: 7.217, seismicPlaying: false });
    expect(host.querySelector('[data-bridge-scene-drawer]').open).toBe(true);
    expect(field('Scene observation note').value).toBe('Inspect this from the walkway.');
    expect(JSON.stringify(lastScene.comparison)).toBe(comparison);
  });

  it('keeps older display records usable and never enables focus from malformed flags', () => {
    const display = { version: 'bridge-scene-display-v1', motionGuide: true, energyInFrame: true, energyFlow: false, overlay: false };
    const trial = sceneTrial({ scene: scenePose({ display }) });
    mount({ seismicSceneFocus: true, seismicTrials: [trial] });
    click('Revisit scene observation 1: My scene');
    expect(state).toMatchObject({ seismicSceneFocus: false, seismicMotionGuide: true, seismicSceneEnergy: true, seismicEnergyFlow: false });
    for (const flag of ['true', 1, {}, null]) {
      patch({ seismicSceneFocus: true, seismicTrials: [sceneTrial({ scene: scenePose({ display: { ...display, focusMode: flag } }) })] });
      click('Revisit scene observation 1: My scene'); expect(state.seismicSceneFocus).toBe(false);
    }
    patch({ seismicSceneFocus: 'true' });
    expect(host.querySelector('[data-bridge-scene-focus]').dataset.bridgeSceneFocus).toBe('false');
  });

  it('retains focus preference and pauses after graphics loss, then waits for deliberate view recovery', () => {
    mount({ bridgeView: 'immersive', seismicSceneFocus: true, seismicReadoutCollapsed: true, seismicTime: 7.217 });
    act(() => button('Leave scene focus').focus());
    click('Replay scene'); tick(100); const time = state.seismicTime;
    act(() => button('Leave scene focus').focus());
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state).toMatchObject({ bridgeView: '2d', seismicSceneFocus: true, seismicTime: time, seismicPlaying: false });
    expect(document.activeElement).toBe(host.querySelector('[data-bridge-elevation]'));
    expect(host.querySelector('[data-bridge-focus-replay]')).toBeNull();
    act(() => { viewerStatus = 'ready'; viewerListener?.('ready'); });
    expect(state.bridgeView).toBe('2d');
    click('From the riverbank');
    expect(host.querySelector('[data-bridge-focus-replay]')).toBeTruthy();
    expect(state).toMatchObject({ seismicSceneFocus: true, seismicTime: time, seismicPlaying: false });
  });

  it('supports touch exploration without enabling an earthquake or changing the static analysis', () => {
    mount({ bridgeView: 'immersive', seismicEnabled: false });
    const inspector = host.querySelector('[data-bridge-inspector]').textContent, signature = lastScene.sig;
    click('Focus scene'); click('Walk toward far end');
    expect(host.querySelector('[data-bridge-focus-replay]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-drawer]')).toBeNull();
    expect(lastScene.quake.enabled).toBe(false); expect(lastScene.sig).toBe(signature);
    expect(host.querySelector('[data-bridge-inspector]').textContent).toBe(inspector);
  });

  it('shows both model responses at one exact time and flips only the dashed outline when selecting A', () => {
    mount({bridgeView:'immersive',seismicGuideOpen:true,seismicTime:7.217,seismicObservation:'Keep B notes'});
    click('Prepare 5% / 20% comparison'); patch({seismicTime:7.217});
    const motion=lastScene.comparison;
    expect(motion).toMatchObject({enabled:true,outlineTrial:'reference'});
    expect(motion.referenceTrailM).toHaveLength(31); expect(motion.currentTrailM).toHaveLength(31);
    expect(motion.referenceTrailM.at(-1)).toBeCloseTo(motion.referenceM,12);
    expect(motion.currentTrailM.at(-1)).toBeCloseTo(motion.currentM,12);
    const readings=host.querySelector('[data-bridge-overlay-readings]');
    expect(readings.dataset.bridgeOverlayReadings).toBe('7.217');
    expect(readings.textContent).toContain('Solid bridge: B · current');
    const sig=lastScene.sig;
    click('A · reference');
    expect(lastScene.comparison).toMatchObject({...motion,outlineTrial:'current'});
    expect(lastScene.quake.deckM).toBe(motion.referenceM);
    expect(host.querySelector('[data-overlay-legend]').textContent).toBe('Solid bridge: A · reference');
    expect(state).toMatchObject({seismicTime:7.217,seismicDampingRatio:0.2,seismicObservation:'Keep B notes',seismicPlaying:false});
    expect(lastScene.sig).toBe(sig);
    click('Replay scene'); tick(100);
    click('Show both responses');
    expect(lastScene.comparison.enabled).toBe(false); expect(state.seismicPlaying).toBe(true);
    tick(100); click('Show both responses');
    expect(lastScene.comparison.enabled).toBe(true); expect(state.seismicPlaying).toBe(true);
    expect(host.querySelector('[data-bridge-overlay-readings]')).toBeTruthy();
  });

  it('requires matching ground motion for the overlay and retains the display preference through changes', () => {
    mount({seismicGuideOpen:true}); click('Prepare 5% / 20% comparison'); patch({seismicTime:7.217});
    patch({seismicFrequencyHz:1.4});
    expect(button('Show both responses').disabled).toBe(true);
    expect(lastScene.comparison.enabled).toBe(false);
    expect(host.querySelector('[data-bridge-overlay-readings]')).toBeNull();
    expect(state.seismicSceneOverlay).toBe(true);
    patch({seismicFrequencyHz:1.1});
    expect(button('Show both responses').disabled).toBe(false);
    expect(lastScene.comparison.enabled).toBe(true);
    click('End scene comparison');
    expect(lastScene.comparison.enabled).toBe(false);
    expect(host.querySelector('[data-bridge-overlay-readings]')).toBeNull();
  });

  it('keeps zero-input comparisons and reduced-motion inspection finite and reproducible after scrubbing', () => {
    act(() => media.change(true));
    mount({seismicIntensityG:0,seismicGuideOpen:true}); click('Prepare 5% / 20% comparison');
    patch({seismicTime:0.217,seismicFrequencyHz:2.1});
    expect(button('Show both responses').disabled).toBe(false);
    expect(lastScene.comparison.referenceTrailM).toEqual(Array(31).fill(0));
    expect(lastScene.comparison.currentTrailM).toEqual(Array(31).fill(0));
    expect(button('Replay scene').disabled).toBe(true);
    patch({seismicIntensityG:0.12}); click('Prepare 5% / 20% comparison'); patch({seismicTime:7.217});
    const frame=JSON.stringify(lastScene.comparison);
    patch({seismicTime:18}); patch({seismicTime:7.217});
    expect(JSON.stringify(lastScene.comparison)).toBe(frame);
    patch({seismicReadoutCollapsed:true}); expect(lastScene.comparison.enabled).toBe(true);
    expect(host.querySelector('[data-bridge-compact-comparison]').dataset.bridgeCompactComparison).toBe('7.217');
    expect(host.querySelector('[data-compact-response=reference]').textContent).toContain('outline');
    expect(host.querySelector('[data-compact-response=current]').textContent).toContain('solid');
    expect(host.querySelector('[data-bridge-scene-readout] > summary').getAttribute('aria-describedby')).toBe('bridge-scene-compact-comparison');
    expect(state.seismicPlaying).toBe(false);
  });

  it('restores the complete saved bridge, both trials and display settings after the live experiment changes', () => {
    const design={span:40,height:8,nBays:6,materialId:'composite',crossSectionMm2:18000,trussStyle:'pratt',
      loadMode:'vehicle',loadPerJoint:73,vehicleLoad:220,vehiclePos:0.37,lateralBraceEvery:3};
    mount({...design,designName:'Student crossing',designNotes:'Use the bank to observe.',seismicGuideOpen:true,
      seismicMotionGuide:true,seismicEnergyFlow:true,seismicSceneEnergy:true,seismicSceneRecording:true});
    click('Prepare 5% / 20% comparison'); patch({seismicTime:7.217,seismicSceneNote:'A moves farther than B.'}); click('A · reference');
    const motion=JSON.stringify(lastScene.comparison),sig=lastScene.sig;
    click('Save scene observation');
    const record=state.seismicTrials[0];
    expect(record.scene.design).toMatchObject({version:'bridge-scene-design-v1',inputs:design,name:'Student crossing',notes:'Use the bank to observe.'});
    expect(record.scene.comparison).toMatchObject({referenceInputs:{dampingRatio:0.05},currentInputs:{dampingRatio:0.2}});
    record.scene.design.inputs.tab='quiz'; record.scene.design.inputs.seismicPlaying=true;
    patch({span:20,height:3,nBays:4,materialId:'steel',crossSectionMm2:1000,trussStyle:'howe',loadMode:'uniform',
      loadPerJoint:1,vehicleLoad:40,vehiclePos:0.9,lateralBraceEvery:1,designName:'Changed',designNotes:'Changed',
      seismicDampingRatio:0.3,seismicFrequencyHz:2,seismicIntensityG:0.2,seismicTime:18,seismicSceneCompare:false,
      seismicMotionGuide:false,seismicEnergyFlow:false,seismicSceneEnergy:false,seismicSceneOverlay:false});
    click('Revisit scene observation 1: '+record.name);
    expect(state).toMatchObject({...design,tab:'build',designName:'Student crossing',designNotes:'Use the bank to observe.',
      seismicTime:7.217,seismicDampingRatio:0.2,seismicFrequencyHz:1.1,seismicIntensityG:0.12,
      seismicSceneCompare:true,seismicSceneSource:'capture',seismicSceneTrial:'reference',seismicPlaying:false,
      seismicSceneNote:'A moves farther than B.',seismicMotionGuide:true,seismicEnergyFlow:true,seismicSceneEnergy:true,seismicSceneOverlay:true});
    expect(lastScene.sig).toBe(sig); expect(JSON.stringify(lastScene.comparison)).toBe(motion);
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    const card=host.querySelector('[data-seismic-trial="0"]');
    expect(card.querySelector('[data-seismic-scene-design]').textContent).toContain('40 m × 8 m');
    const pairMotion=card.querySelector('[data-seismic-scene-pair-motion]').textContent;
    click('Open earthquake evidence report');
    const report=host.querySelector('[data-bridge-print-seismic]');
    expect(report.querySelector('[data-seismic-scene-pair-motion]').textContent).toBe(pairMotion);
    expect(report.textContent).toContain('Student crossing'); expect(report.textContent).toContain('18000 mm²');
    expect(report.querySelector('button,input,textarea,select')).toBeNull();
  });

  it.each([{span:999},{nBays:3,lateralBraceEvery:4},{materialId:'future-material'}])('keeps valid earthquake evidence while rejecting an invalid optional bridge setup %j', invalid => {
    mount({seismicSceneRecording:true,seismicTime:7.217,span:40}); click('Save scene observation');
    const record=state.seismicTrials[0]; Object.assign(record.scene.design.inputs,invalid);
    patch({span:25,seismicTime:18});
    expect(host.querySelector('[data-seismic-scene-design]')).toBeNull();
    click('Revisit scene observation 1: '+record.name);
    expect(state).toMatchObject({span:25,seismicTime:7.217,seismicPlaying:false});
    expect(state.seismicTrials).toHaveLength(1);
  });

  it('rejects a mismatched or unsupported saved comparison while restoring valid pose and bridge evidence', () => {
    mount({seismicGuideOpen:true,seismicSceneRecording:true,span:40}); click('Prepare 5% / 20% comparison');
    click('A · reference'); patch({seismicTime:7.217}); click('Save scene observation');
    const record=state.seismicTrials[0]; record.scene.comparison.referenceInputs.dampingRatio=0.1;
    patch({span:25,seismicTime:18});
    click('Revisit scene observation 1: '+record.name);
    expect(state).toMatchObject({span:40,seismicDampingRatio:0.05,seismicSceneCompare:false,seismicTime:7.217});
    expect(lastScene.comparison.enabled).toBe(false);
    patch({seismicSceneSource:'capture',seismicSceneCompare:true,seismicSceneCapture:{version:'future-comparison'}});
    expect(lastScene.comparison.enabled).toBe(false);
    expect(host.querySelector('[data-bridge-overlay-readings]')).toBeNull();
  });

  it('records displayed reference A with its exact time and independent note, preserving the working experiment', () => {
    const unsupported={version:'future-model',observation:'Keep me'};
    mount({ bridgeView:'immersive', bridgeObserver:'bank', seismicGuideOpen:true, seismicSceneRecording:true,
      seismicTrials:[unsupported], seismicPrediction:'Prediction for B', seismicObservation:'Explanation for B',
      span:40, bridgeBankYaw:18, bridgeBankPitch:-8 });
    click('Prepare 5% / 20% comparison');
    patch({seismicTime:7.217,seismicSceneNote:'A sways farther; damping carries energy away.'});
    click('A · reference');
    const baseline=state.seismicGuideBaseline;
    click('Save scene observation');
    expect(state.seismicTrials[0]).toEqual(unsupported);
    const record=state.seismicTrials[1];
    expect(record).toMatchObject({version:'bridge-seismic-v1',timeS:7.217,prediction:'',
      observation:'A sways farther; damping carries energy away.',inputs:baseline.inputs,
      scene:{source:'reference',view:'immersive',observer:'bank',bankYaw:18,bankPitch:-8}});
    expect(record.inputs).not.toBe(baseline.inputs);
    expect(state).toMatchObject({seismicDampingRatio:0.2,seismicSceneTrial:'reference',seismicTime:7.217,
      seismicPrediction:'Prediction for B',seismicObservation:'Explanation for B',span:40,seismicSceneNote:'',seismicPlaying:false,autoDriving:false});
    expect(host.querySelector('[data-scene-record-saved]').textContent).toContain('saved');
    expect(document.getElementById('allo-live-bridgelab').textContent).toContain('Scene observation saved');
    click('Replay scene');
    expect(host.querySelector('[data-scene-record-saved]')).toBeNull();
    click('Pause scene replay');
    expect(host.querySelector('[data-scene-record-saved]')).toBeTruthy();
  });

  it('pauses on opening, typing and saving without rounding the recorded frame', () => {
    mount({seismicTime:7.217,seismicSceneRecording:'true'});
    expect(host.querySelector('[data-bridge-scene-recorder]').open).toBe(false);
    click('Replay scene'); tick(100);
    const before=state.seismicTime;
    act(() => {const details=host.querySelector('[data-bridge-scene-recorder]'); details.open=true; details.dispatchEvent(new Event('toggle'));});
    tick(0);
    expect(state.seismicPlaying).toBe(false);
    tick(200); expect(state.seismicTime).toBe(before);
    click('Replay scene'); tick(100);
    const writtenTime=state.seismicTime;
    act(() => Simulate.change(field('Scene observation note'),{target:{value:'The deck lags behind the ground.'}}));
    expect(state.seismicPlaying).toBe(false);
    expect(state.seismicTime).toBe(writtenTime);
    click('Replay scene'); tick(100);
    const savedTime=state.seismicTime;
    click('Save scene observation');
    expect(state.seismicTrials[0].timeS).toBe(savedTime);
    tick(200); expect(state.seismicTime).toBe(savedTime);
    expect(state.seismicTrials[0].observation).toBe('The deck lags behind the ground.');
  });

  it.each([['immersive','bank'],['immersive','deck'],['3d','deck']])('revisits the saved %s / %s pose and focuses the paused scene', (view,observer) => {
    mount({bridgeView:view,bridgeObserver:observer,bridgeWalkPos:0.63,bridgeLookYaw:27,bridgeLookPitch:-12,
      bridgeBankYaw:18,bridgeBankPitch:-8,rot3d:{rotY:46,rotX:23},zoom3d:1.4,seismicTime:7.217,
      seismicSceneRecording:true,seismicSceneNote:'Look at the deck.',seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation'});
    click('Save scene observation');
    const record=state.seismicTrials[0];
    patch({bridgeView:'2d',bridgeObserver:'deck',bridgeWalkPos:0.12,bridgeLookYaw:-3,bridgeLookPitch:2,
      bridgeBankYaw:-10,bridgeBankPitch:3,rot3d:{rotY:5,rotX:6},zoom3d:0.7,seismicTime:18,seismicDampingRatio:0.3,
      seismicSceneCompare:true,seismicSceneTrial:'reference',seismicReadoutCollapsed:true,seismicSceneNote:'Another draft'});
    click('Revisit scene observation 1: '+record.name);
    expect(state).toMatchObject({bridgeView:view,bridgeObserver:observer,bridgeWalkPos:0.63,bridgeLookYaw:27,bridgeLookPitch:-12,
      bridgeBankYaw:18,bridgeBankPitch:-8,rot3d:{rotY:46,rotX:23},zoom3d:1.4,seismicTime:7.217,seismicDampingRatio:0.05,
      seismicSceneCompare:false,seismicSceneTrial:'current',seismicSceneRecording:true,seismicSceneNote:'Look at the deck.',
      seismicReadoutCollapsed:false,seismicPlaying:false,autoDriving:false,seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation'});
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    expect(host.querySelector('[data-scene-record-context]').textContent).toContain('7.217 s');
  });

  it('keeps graphics failure in 2D while restoring a saved bank pose for deliberate recovery', () => {
    const record=sceneTrial();
    mount({seismicTrials:[record]});
    act(() => {viewerStatus='failed'; viewerListener('failed');});
    act(() => media.change(true));
    click('Revisit scene observation 1: My scene');
    expect(state).toMatchObject({bridgeView:'2d',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
      seismicTime:7.217,seismicPlaying:false,seismicSceneNote:record.observation});
    expect(document.activeElement.hasAttribute('data-bridge-elevation')).toBe(true);
    act(() => {viewerStatus='ready'; viewerListener('ready');});
    expect(state.bridgeView).toBe('2d');
    click('From the riverbank');
    expect(state).toMatchObject({bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicPlaying:false});
    expect(button('Replay scene').disabled).toBe(true);
  });

  it.each([{bankYaw:Infinity},{walkPos:0.99},{zoom:'1.4'},{version:'bridge-scene-v2'}])('ignores invalid optional pose %j while keeping a valid earthquake trial', invalid => {
    const record=sceneTrial({scene:scenePose(invalid)});
    mount({bridgeView:'2d',seismicTrials:[record],bridgeBankYaw:5,seismicTime:18});
    expect(host.querySelector('[data-seismic-trial="0"]')).toBeTruthy();
    expect(host.querySelector('[data-seismic-scene-context]')).toBeNull();
    click('Restore earthquake trial 1: My scene');
    expect(state).toMatchObject({bridgeView:'2d',bridgeBankYaw:5,seismicTime:7.217,seismicDampingRatio:0.05,
      seismicObservation:record.observation,seismicPlaying:false});
  });

  it('shares the four-trial limit, preserves unsupported records and permits saving after removal', () => {
    const records=[0,1,2,3].map(i => sceneTrial({name:'Trial '+i}));
    const future={version:'future-model'};
    mount({seismicSceneRecording:true,seismicSceneNote:'Keep this draft',seismicTrials:[future,...records]});
    expect(button('Save scene observation').disabled).toBe(true);
    click('Save scene observation');
    expect(state.seismicTrials).toHaveLength(5);
    expect(state.seismicSceneNote).toBe('Keep this draft');
    click('Remove earthquake trial 2: Trial 1');
    expect(button('Save scene observation').disabled).toBe(false);
    click('Save scene observation');
    expect(state.seismicTrials).toHaveLength(5);
    expect(state.seismicTrials[0]).toEqual(future);
    expect(state.seismicTrials.at(-1).observation).toBe('Keep this draft');
    const name=state.seismicTrials.at(-1).name;
    click('Remove earthquake trial 4: '+name);
    expect(host.querySelector('[data-scene-record-saved]')).toBeNull();
  });

  it('prints escaped observations, source, precise time and recalculated power without interactive controls', () => {
    const record=sceneTrial({scene:scenePose({source:'reference'}),observation:'<img src=x onerror=alert(1)> Ground → deck',
      peaks:{relativeM:999999},sample:{storedPowerWPerKg:999999}});
    mount({seismicTrials:[record]});
    const expected=host.querySelector('[data-seismic-scene-power]').textContent;
    expect(expected).not.toContain('999999');
    click('Open earthquake evidence report');
    const report=host.querySelector('[data-bridge-print-seismic]');
    expect(report.textContent).toContain('Captured from the reference scene · Riverbank viewpoint');
    expect(report.textContent).toContain('Inspected time: 7.217 s');
    expect(report.textContent).toContain(expected);
    expect(report.textContent).toContain(record.observation);
    expect(report.querySelector('img')).toBeNull();
    expect(report.querySelector('button,input,textarea,select')).toBeNull();
  });

  it('bounds separate imported notes and normalizes the saved camera without changing static design', () => {
    mount({seismicSceneRecording:true,seismicSceneNote:'a'.repeat(2100),rot3d:{rotY:766,rotX:999},
      bridgeLookYaw:999,zoom3d:99,span:45,materialId:'aluminum'});
    expect(field('Scene observation note').value).toHaveLength(2000);
    click('Save scene observation');
    expect(state.seismicTrials[0].observation).toHaveLength(2000);
    expect(state.seismicTrials[0].scene).toMatchObject({rotY:46,rotX:78,yaw:180,zoom:3.2});
    expect(state).toMatchObject({span:45,materialId:'aluminum'});
  });

  function checkNativeEnergyFlow(inputs, time, trial = 'current') {
    const point = guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(inputs), time, time).earlier;
    const frame = host.querySelector('[data-flow-frame]');
    expect(frame, 'energy transfer frame').toBeTruthy();
    expect(Number(frame.dataset.flowFrame)).toBe(point.timeS);
    expect(frame.dataset.flowTrial).toBe(trial);
    const diagram = frame.querySelector('[data-flow-diagram]');
    expect(diagram.getAttribute('role')).toBe('group');
    expect(diagram.getAttribute('aria-label')).toContain('W/kg');
    const external = diagram.querySelector('[data-flow-group="external"]');
    const internal = diagram.querySelector('[data-flow-group="internal"]');
    expect([...external.querySelectorAll('[data-flow-path]')].map(row => row.dataset.flowPath)).toEqual(['input', 'damping']);
    expect([...internal.querySelectorAll('[data-flow-path]')].map(row => row.dataset.flowPath)).toEqual(['exchange']);
    expect(internal.textContent.toLowerCase()).toContain('within');
    expect(internal.textContent.toLowerCase()).toContain('stored');
    const expected = {
      input: { value: point.inputPowerWPerKg, from: 'Ground interaction', to: 'Stored' },
      damping: { value: point.dampingPowerWPerKg, from: 'Stored', to: 'Dissipated' },
      exchange: { value: point.elasticPowerWPerKg, from: 'Kinetic', to: 'Elastic' }
    };
    const rates = {};
    for (const [id, item] of Object.entries(expected)) {
      const row = diagram.querySelector('[data-flow-path="' + id + '"]');
      expect(row.tagName).toBe('DIV');
      expect(row.getAttribute('role')).toBe('group');
      expect(Number(row.dataset.flowPower)).toBe(item.value);
      expect(Number(row.dataset.flowDirection)).toBe(item.value > 0 ? 1 : item.value < 0 ? -1 : 0);
      const from = row.querySelector('[data-flow-node="from"]');
      const to = row.querySelector('[data-flow-node="to"]');
      for (const node of [from, to]) expect(node.closest('svg,[aria-hidden="true"]')).toBeNull();
      expect(from.textContent).toBe(item.from);
      expect(to.textContent).toBe(item.to);
      const directed = item.value === 0 ? 'No transfer'
        : item.value > 0 ? item.from + ' → ' + item.to : item.to + ' → ' + item.from;
      expect(row.getAttribute('aria-label')).toContain(directed);
      expect(diagram.getAttribute('aria-label')).toContain(directed);
      const reading = row.querySelector('[data-flow-rate="' + id + '"]');
      expect(Number(reading.dataset.flowRateValue)).toBe(Math.abs(item.value));
      expect(reading.closest('svg,[aria-hidden="true"]')).toBeNull();
      expect(reading.textContent).toContain('W/kg');
      if (item.value !== 0 && Math.abs(item.value) < 0.001) {
        expect(reading.textContent).toMatch(/\d\.\d{2}e[+-]\d+/);
        expect(reading.textContent).not.toContain('<0.001');
      }
      const arrow = row.querySelector('[data-flow-arrow="' + id + '"]');
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
      expect(arrow.getAttribute('focusable')).toBe('false');
      expect(arrow.querySelector('text')).toBeNull();
      rates[id] = item.value;
    }
    const net = frame.querySelector('[data-flow-stored-rate]');
    expect(Number(net.dataset.flowStoredRate)).toBe(point.storedPowerWPerKg);
    expect(point.storedPowerWPerKg).toBeCloseTo(rates.input - rates.damping, 12);
    // Since 10-10 the bar-scale caption prints the experiment's maximum rate too, so a
    // tiny maximum (shown in e-notation) also earns the scientific-notation help.
    const maximum = Number(frame.dataset.flowMaximumWPerKg);
    expect(Number.isFinite(maximum)).toBe(true);
    const small = [...Object.values(rates), point.storedPowerWPerKg, maximum]
      .some(value => value !== 0 && Math.abs(value) < 0.001);
    expect(Boolean(frame.querySelector('[data-flow-scientific-help]'))).toBe(small);
    expect(frame.innerHTML).not.toMatch(/NaN|Infinity/);
    return { rates, net: point.storedPowerWPerKg, description: diagram.getAttribute('aria-label') };
  }

  it('energy transfer native: preserves tiny signed rates, native routes and true zero during deliberate inspection', () => {
    media.change(true);
    const time = 7.283333333333333;
    mount({ bridgeView: 'immersive', seismicEnergyFlow: true, seismicTime: time, seismicIntensityG: 1e-10,
      seismicPlaying: false, seismicObservation: 'Follow small transfers.' });
    const original = checkNativeEnergyFlow(guideEnergyCurrentInputs(), time);
    expect(original.rates.input).toBeLessThan(0);
    expect(original.net).toBeLessThan(0);
    expect(Object.values(original.rates).every(value => value !== 0 && Math.abs(value) < 0.001)).toBe(true);
    expect(host.querySelector('[data-flow-stored-rate]').textContent).toMatch(/decreasing: \d\.\d{2}e[+-]\d+ W\/kg/);
    const signature = lastScene.sig;
    patch({ seismicTime: 0 });
    const rest = checkNativeEnergyFlow(guideEnergyCurrentInputs(), 0);
    expect(Object.values(rest.rates)).toEqual([0, 0, 0]);
    expect(rest.description).toContain('No transfer');
    expect(host.querySelector('[data-flow-stored-rate]').textContent).toBe('Stored energy unchanged: 0.000 W/kg');
    patch({ seismicTime: time, rot3d: { rotX: 22, rotY: 87 }, seismicMotionGuide: true, seismicForceLens: true });
    expect(checkNativeEnergyFlow(guideEnergyCurrentInputs(), time)).toEqual(original);
    patch({ seismicTime: 18, seismicDampingRatio: 0 });
    const free = checkNativeEnergyFlow(guideEnergyCurrentInputs(), 18);
    expect(free.rates.input).toBe(0);
    expect(free.rates.damping).toBe(0);
    expect(free.rates.exchange).not.toBe(0);
    expect(free.net).toBe(0);
    expect(lastScene.sig).toBe(signature);
    expect(state).toMatchObject({ seismicPlaying: false, seismicObservation: 'Follow small transfers.' });
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('energy transfer native: follows unequal saved A/B inputs and keeps current rates in graphics fallback', () => {
    const savedInputs = { archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 0.17, dampingRatio: 0 };
    const records = [{ version: 'bridge-seismic-v1', name: 'Flexible undamped reference', timeS: 12.319,
      inputs: savedInputs, prediction: 'Reference prediction', observation: 'Reference explanation' }];
    const time = 7.217;
    mount({ bridgeView: 'immersive', seismicEnergyFlow: true, seismicTrials: records, seismicReferenceIndex: 0,
      seismicIntensityG: 1e-10, seismicDampingRatio: 0.2, seismicTime: time,
      seismicSceneNote: 'Keep scene evidence.', seismicObservation: 'Keep current evidence.' });
    click('Compare saved trial in scene');
    const current = checkNativeEnergyFlow(guideEnergyCurrentInputs(), time);
    click('A · reference');
    const reference = checkNativeEnergyFlow(savedInputs, time, 'reference');
    expect(reference.rates).not.toEqual(current.rates);
    expect(reference.rates.damping).toBe(0);
    patch({ seismicIntensityG: 0.12, seismicDampingRatio: 0.1 });
    expect(checkNativeEnergyFlow(savedInputs, time, 'reference')).toEqual(reference);
    click('B · current');
    const changed = checkNativeEnergyFlow(guideEnergyCurrentInputs(), time);
    expect(changed.rates).not.toEqual(current.rates);
    click('A · reference');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(host.querySelector('[data-bridge-energy-flow="fallback"]').open).toBe(true);
    const fallback = checkNativeEnergyFlow(guideEnergyCurrentInputs(), time);
    expect(fallback.rates).toEqual(changed.rates);
    expect(fallback.net).toBe(changed.net);
    expect(fallback.description).toMatch(/^Current experiment · 7\.22 s\./);
    expect(state).toMatchObject({ bridgeView: '2d', seismicTime: time, seismicPlaying: false,
      seismicSceneTrial: 'reference', seismicSceneNote: 'Keep scene evidence.', seismicObservation: 'Keep current evidence.' });
    expect(state.seismicTrials).toEqual(records);
  });

  it('opens energy transfer without starting motion and keeps its rates synchronized with replay', () => {
    mount({ seismicTime: 7.217, seismicEnergyFlow: 'true', seismicObservation: 'Keep my energy notes.' });
    expect(host.querySelector('[data-flow-frame]')).toBeNull();
    patch({ seismicEnergyFlow: true });
    const power = id => Number(host.querySelector('[data-flow-path="' + id + '"]').dataset.flowPower);
    const input = Number(host.querySelector('[data-seismic-input-power]').dataset.seismicInputPower);
    expect(power('input')).toBe(input);
    expect(Number(host.querySelector('[data-flow-stored-rate]').dataset.flowStoredRate)).toBeCloseTo(power('input') - power('damping'), 12);
    expect(host.querySelector('[data-flow-frame]').dataset.flowFrame).toBe('7.217');
    const sig=lastScene.sig;
    click('Replay scene');
    tick(100);
    expect(Number(host.querySelector('[data-flow-frame]').dataset.flowFrame)).toBeCloseTo(7.317, 10);
    patch({ seismicEnergyFlow: false });
    tick(100);
    expect(state.seismicPlaying).toBe(true);
    expect(host.querySelector('[data-flow-frame]')).toBeNull();
    expect(lastScene.sig).toBe(sig);
    expect(state.seismicObservation).toBe('Keep my energy notes.');
  });

  it('uses the selected trial for transfer while preserving the shared A/B clock', () => {
    mount({ seismicEnergyFlow: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.217 });
    const rates=() => [...host.querySelectorAll('[data-flow-path]')].map(n => n.dataset.flowPower);
    const b=rates();
    click('A · reference');
    expect(host.querySelector('[data-flow-frame]').dataset.flowTrial).toBe('reference');
    expect(rates()).not.toEqual(b);
    expect(state.seismicTime).toBe(7.217);
    expect(host.querySelector('[data-flow-frame] [data-flow-diagram]').getAttribute('aria-label')).toContain('A · reference');
    click('B · current');
    expect(rates()).toEqual(b);
    expect(state.seismicDampingRatio).toBe(0.2);
  });

  it('shows zero transfer at rest and internal exchange without damping after shaking ends', () => {
    media.change(true);
    mount({ seismicEnergyFlow: true, seismicIntensityG: 0, seismicTime: 18 });
    expect([...host.querySelectorAll('[data-flow-path]')].every(n => n.dataset.flowDirection === '0')).toBe(true);
    expect(host.querySelector('[data-flow-stored-rate]').textContent).toBe('Stored energy unchanged: 0.000 W/kg');
    expect(host.querySelector('[data-flow-frame] [data-flow-diagram]').getAttribute('aria-label')).toContain('No transfer');
    patch({ seismicIntensityG: 0.12, seismicDampingRatio: 0, seismicTime: 18 });
    expect(host.querySelector('[data-flow-path="input"]').dataset.flowDirection).toBe('0');
    expect(host.querySelector('[data-flow-path="damping"]').dataset.flowDirection).toBe('0');
    expect(host.querySelector('[data-flow-path="exchange"]').dataset.flowDirection).not.toBe('0');
    expect(host.querySelector('[data-flow-stored-rate]').dataset.flowStoredRate).toBe('0');
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('retains transfer settings through folded measurements, 2D fallback and graphics recovery', () => {
    mount({ bridgeView: 'immersive', seismicEnergyFlow: true, seismicTime: 7.217 });
    const diagram=() => host.querySelector('[data-flow-frame] [data-flow-diagram]').getAttribute('aria-label');
    const before=diagram();
    patch({ seismicReadoutCollapsed: true });
    expect(host.querySelector('[data-flow-frame]')).toBeNull();
    expect(state.seismicEnergyFlow).toBe(true);
    patch({ seismicReadoutCollapsed: false });
    expect(diagram()).toBe(before);
    viewerStatus='failed'; act(() => viewerListener('failed'));
    expect(host.querySelector('[data-bridge-energy-flow="fallback"]').open).toBe(true);
    expect(diagram()).toBe(before);
    viewerStatus='ready'; act(() => viewerListener('ready'));
    click('On the bridge');
    expect(host.querySelector('[data-bridge-energy-flow="scene"]').open).toBe(true);
    expect(diagram()).toBe(before);
    patch({ seismicEnabled: false });
    expect(host.querySelector('[data-bridge-energy-flow]')).toBeNull();
  });

  it('labels the fallback as the current experiment while a reference scene is selected', () => {
    mount({ seismicEnergyFlow: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    const b=host.querySelector('[data-flow-frame] [data-flow-diagram]').getAttribute('aria-label');
    click('A · reference');
    patch({ bridgeView: '2d' });
    const frame=host.querySelector('[data-flow-frame]');
    expect(frame.dataset.flowTrial).toBe('current');
    expect(frame.textContent).toContain('Current experiment');
    expect(frame.querySelector('[data-flow-diagram]').getAttribute('aria-label').split(' s. ')[1]).toBe(b.split(' s. ')[1]);
    expect(state.seismicTime).toBe(8);
    expect(state.seismicPlaying).toBe(false);
  });

  function momentEnergyForPoint(response, point) {
    const kinetic = point.velocityMps * point.velocityMps / 2;
    const elasticCoordinate = 2 * Math.PI * response.naturalFrequencyHz * point.relativeM;
    const elastic = elasticCoordinate * elasticCoordinate / 2;
    return { kinetic, elastic, stored: kinetic + elastic };
  }
  function momentEnergyMaximum(inputs, id) {
    const response = guideEnergyResponse(inputs);
    const measure = id === 'motion' ? 'relativeM' : 'absoluteAccelerationMps2';
    const point = response.samples.reduce((peak, candidate) =>
      Math.abs(candidate[measure]) > Math.abs(peak[measure]) ? candidate : peak, response.samples[0]);
    return { time: point.timeS, ...momentEnergyForPoint(response, point) };
  }
  function selectEnergyMoment(id) {
    act(() => Simulate.change(field('Scene key moments'), { target: { value: id } }));
  }
  function checkMomentEnergy(inputs, id, trial = 'current') {
    const expected = momentEnergyMaximum(inputs, id);
    const insight = host.querySelector('[data-bridge-moment-insight="' + id + '"]');
    expect(insight).toBeTruthy();
    const preview = insight.querySelector('[data-moment-energy-preview]');
    expect(preview).toBeTruthy();
    expect(preview.dataset.momentEnergyTrial).toBe(trial);
    expect(Number(preview.dataset.momentEnergyTime)).toBe(expected.time);
    expect(state.seismicTime).toBe(expected.time);
    expect(preview.querySelector('h6').textContent).toBe('Share of stored energy now');
    const total = preview.querySelector('[data-moment-energy-total]');
    expect(Number(total.dataset.momentEnergyTotal)).toBe(expected.stored);
    const numberText = value => value !== 0 && Math.abs(value) < 0.001 ? value.toExponential(2) : value.toFixed(3);
    expect(total.textContent).toBe(numberText(expected.stored) + ' J/kg');
    expect(preview.querySelector('[data-moment-energy-bar]').getAttribute('aria-hidden')).toBe('true');
    expect(preview.querySelector('[data-moment-energy-scale-help]').textContent).toBe('Bar = 100% of the stored total now.');
    for (const id of ['kinetic', 'elastic']) {
      const row = preview.querySelector('[data-moment-energy-component="' + id + '"]');
      expect(row.closest('dl')).toBeTruthy();
      expect(row.closest('svg,[aria-hidden="true"]')).toBeNull();
      expect(row.querySelector('dt').textContent.toLowerCase()).toBe(id);
      const amount = expected[id], fraction = expected.stored > 0 ? amount / expected.stored : 0;
      expect(Number(row.dataset.momentEnergyValue)).toBe(amount);
      expect(Number(row.dataset.momentEnergyFraction)).toBe(fraction);
      expect(row.querySelectorAll('dd')[1].textContent).toBe(numberText(amount) + ' J/kg');
      const share = row.querySelector('dd').textContent;
      if (fraction === 0 || fraction === 1) expect(share).toBe((fraction * 100) + '%');
      else if (fraction < 0.001) expect(share).toBe('<0.1%');
      else if (fraction > 0.999) expect(share).toBe('>99.9%');
      else expect(Number.parseFloat(share)).toBeCloseTo(fraction * 100, 1);
      const part = preview.querySelector('[data-moment-energy-part="' + id + '"]');
      expect(parseFloat(part.style.width)).toBeCloseTo(fraction * 100, 10);
    }
    expect(insight.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
    return expected;
  }
  function openMomentEnergy(expected, trial = 'current') {
    const before = { ...state };
    const action = host.querySelector('[data-moment-energy-route="orbit"]');
    expect(action.tagName).toBe('BUTTON');
    expect(action.type).toBe('button');
    expect(action.textContent).toBe('Compare elastic and kinetic energy here');
    expect(action.getAttribute('aria-controls')).toBe('bridge-energy-orbit-scene');
    expect(action.disabled).toBe(false);
    const summary = host.querySelector('[data-bridge-energy-orbit="scene"] > summary');
    summary.scrollIntoView = vi.fn();
    act(() => action.click());
    const orbit = host.querySelector('[data-bridge-energy-orbit="scene"]');
    expect(orbit.open).toBe(true);
    expect(document.activeElement).toBe(orbit.querySelector(':scope > summary'));
    expect(summary.scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest', behavior: 'instant' });
    expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitTrial).toBe(trial);
    for (const id of ['kinetic', 'elastic', 'stored']) {
      expect(Number(orbit.querySelector('[data-orbit-energy="' + id + '"]').dataset.orbitValue)).toBe(expected[id]);
    }
    expect(state).toEqual({ ...before, seismicEnergyOrbit: true, seismicPlaying: false, autoDriving: false });
    tick(300);
    expect(state.seismicTime).toBe(expected.time);
    expect(state.seismicPlaying).toBe(false);
  }

  it.each(['motion', 'acceleration'])('moment energy: compares current %s peak and opens its orbit without moving the pin or notes', id => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicIntervalPinS: 2.317, seismicEnergyInterval: true, seismicSceneNote: 'Keep the peak evidence.',
      seismicPrediction: 'Compare motion and energy.', seismicObservation: 'Keep my explanation.',
      seismicTime: 5, rot3d: { rotX: 22, rotY: 87 } });
    selectEnergyMoment(id);
    const expected = checkMomentEnergy(guideEnergyCurrentInputs(), id);
    expect(expected.stored).toBeGreaterThan(0);
    checkNativeMoment(guideEnergyCurrentInputs(), id);
    openMomentEnergy(expected);
  });

  it('moment energy: follows guide A and clears the old peak when B is selected at the shared clock', () => {
    mount({ seismicGuideOpen: true, seismicSceneNote: 'Keep guide notes.', seismicIntervalPinS: 3.217 });
    click('Prepare 5% / 20% comparison');
    click('A · reference');
    const inputs = state.seismicGuideBaseline.inputs;
    selectEnergyMoment('motion');
    const a = checkMomentEnergy(inputs, 'motion', 'reference');
    openMomentEnergy(a, 'reference');
    click('B · current');
    expect(state.seismicTime).toBe(a.time);
    expect(field('Scene key moments').value).toBe('');
    expect(host.querySelector('[data-moment-energy-preview]')).toBeNull();
    expect(host.querySelector('[data-moment-energy-route="orbit"]')).toBeNull();
    selectEnergyMoment('motion');
    const b = checkMomentEnergy(guideEnergyCurrentInputs(), 'motion');
    expect(b.time).not.toBe(a.time);
    expect(b.stored).not.toBe(a.stored);
    openMomentEnergy(b);
  });

  it('moment energy: retains saved A energy when current B settings change and preserves the notebook', () => {
    const inputs = { archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 0.17, dampingRatio: 0.025 };
    const records = [{ version: 'bridge-seismic-v1', name: 'Saved flexible reference', timeS: 12.319,
      inputs, prediction: 'Saved prediction', observation: 'Saved explanation' }];
    mount({ bridgeView: 'immersive', seismicTrials: records, seismicReferenceIndex: 0,
      seismicDampingRatio: 0.25, seismicSceneNote: 'Selected A evidence.', seismicIntervalPinS: 1.217 });
    click('Compare saved trial in scene');
    click('A · reference');
    selectEnergyMoment('acceleration');
    const expected = checkMomentEnergy(inputs, 'acceleration', 'reference');
    patch({ seismicIntensityG: 0.07, seismicFrequencyHz: 2.6, seismicDampingRatio: 0.4 });
    expect(checkMomentEnergy(inputs, 'acceleration', 'reference')).toEqual(expected);
    openMomentEnergy(expected, 'reference');
    expect(state.seismicTrials).toEqual(records);
    expect(state.seismicSceneSource).toBe('saved');
  });

  it('moment energy: keeps tiny nonzero energies visible and the orbit available under reduced motion', () => {
    media.change(true);
    mount({ seismicIntensityG: 1e-10, seismicIntervalPinS: 4.317 });
    selectEnergyMoment('motion');
    const expected = checkMomentEnergy(guideEnergyCurrentInputs(), 'motion');
    for (const id of ['kinetic', 'elastic', 'stored']) {
      expect(expected[id]).toBeGreaterThan(0);
      expect(expected[id]).toBeLessThan(0.001);
    }
    expect(host.querySelector('[data-moment-energy-total]').textContent).toMatch(/e-\d+ J\/kg$/);
    expect(host.querySelector('[data-moment-scientific-help]').textContent).toContain('still nonzero');
    expect(button('Replay scene').disabled).toBe(true);
    openMomentEnergy(expected);
  });

  it('moment energy: zero shaking offers no false peak comparison and retains the existing settling route', () => {
    mount({ seismicIntensityG: 0, seismicTime: 5, seismicIntervalPinS: 3.217 });
    for (const id of ['motion', 'acceleration']) {
      expect(field('Scene key moments').querySelector('option[value="' + id + '"]').disabled).toBe(true);
      selectEnergyMoment(id);
      expect(state.seismicTime).toBe(5);
      expect(host.querySelector('[data-moment-energy-preview]')).toBeNull();
      expect(host.querySelector('[data-moment-energy-route="orbit"]')).toBeNull();
    }
    selectEnergyMoment('free');
    expect(host.querySelector('[data-moment-energy-route="settling"]')).toBeTruthy();
    expect(host.querySelector('[data-moment-energy-preview]')).toBeNull();
    expect(host.querySelector('[data-moment-reading]').textContent).toBe('0.000 J/kg');
    expect(state.seismicIntervalPinS).toBe(3.217);
  });

  it('moment energy: preserves the chosen explanation when undamped peak times coincide', () => {
    mount({ seismicDampingRatio: 0, seismicSceneNote: 'Compare the explanations.' });
    const inputs = guideEnergyCurrentInputs();
    expect(momentEnergyMaximum(inputs, 'motion').time).toBe(momentEnergyMaximum(inputs, 'acceleration').time);
    selectEnergyMoment('acceleration');
    const acceleration = checkMomentEnergy(inputs, 'acceleration');
    expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('stationary frame');
    openMomentEnergy(acceleration);
    selectEnergyMoment('motion');
    const motion = checkMomentEnergy(inputs, 'motion');
    expect(motion).toEqual(acceleration);
    expect(field('Scene key moments').value).toBe('motion');
    openMomentEnergy(motion);
  });

  it('moment energy: keeps the opened orbit in graphics fallback with current B energy at the same time', () => {
    mount({ seismicGuideOpen: true, seismicIntervalPinS: 2.317, seismicSceneNote: 'Keep A evidence.' });
    click('Prepare 5% / 20% comparison');
    click('A · reference');
    selectEnergyMoment('motion');
    const a = checkMomentEnergy(state.seismicGuideBaseline.inputs, 'motion', 'reference');
    openMomentEnergy(a, 'reference');
    const before = { ...state };
    act(() => { viewerStatus = 'failed'; viewerListener('failed'); });
    const orbit = host.querySelector('[data-bridge-energy-orbit="fallback"]');
    expect(orbit.open).toBe(true);
    expect(orbit.querySelector('[data-orbit-frame]').dataset.orbitTrial).toBe('current');
    const response = guideEnergyResponse(guideEnergyCurrentInputs());
    const point = guideEnergyOracle.bridgeSeismicEnergyInterval(response, a.time, a.time).earlier;
    const expected = momentEnergyForPoint(response, point);
    for (const id of ['kinetic', 'elastic', 'stored']) {
      expect(Number(orbit.querySelector('[data-orbit-energy="' + id + '"]').dataset.orbitValue)).toBe(expected[id]);
    }
    expect(expected.stored).not.toBe(a.stored);
    expect(host.querySelector('[data-moment-energy-preview]')).toBeNull();
    expect(state).toEqual({ ...before, bridgeView: '2d' });
  });


  function checkNativeMoment(inputs, id, trial = 'current') {
    const response = guideEnergyResponse(inputs);
    const time = { start: 0, motion: response.milestones.peakMotionS,
      acceleration: response.milestones.peakAccelerationS, free: response.milestones.freeVibrationS,
      end: response.durationS }[id];
    // Read the independently sampled response, rather than deriving the expected
    // number from scene rendering or the insight's own metadata.
    const point = guideEnergyOracle.bridgeSeismicEnergyInterval(response, time, time).earlier;
    const value = id === 'motion' ? Math.abs(point.relativeM * 100)
      : id === 'acceleration' ? Math.abs(point.absoluteAccelerationMps2) / 9.80665 : point.storedJPerKg;
    const unit = id === 'motion' ? 'cm' : id === 'acceleration' ? 'g' : 'J/kg';
    const quantity = id === 'motion' ? 'relativeMotion' : id === 'acceleration' ? 'absoluteAcceleration' : 'storedEnergy';
    const insight = host.querySelector('[data-bridge-moment-insight="' + id + '"]');
    expect(insight, trial + ' exact ' + id + ' milestone').toBeTruthy();
    expect(Number(insight.dataset.momentTime)).toBe(time);
    expect(state.seismicTime).toBe(time);
    expect(insight.dataset.momentTrial).toBe(trial);
    const reading = insight.querySelector('[data-moment-reading]');
    expect(reading).toBeTruthy();
    expect(reading.tagName).toBe('STRONG');
    expect(reading.closest('svg,[aria-hidden="true"]')).toBeNull();
    expect(Number(reading.dataset.momentValue)).toBe(value);
    expect(reading.dataset.momentUnit).toBe(unit);
    expect(reading.dataset.momentQuantity).toBe(quantity);
    expect(parseFloat(reading.style.fontSize)).toBeGreaterThanOrEqual(12);
    expect(reading.style.overflowWrap).toBe('anywhere');
    const scientific = value !== 0 && Math.abs(value) < 0.001;
    const expectedText = (scientific ? value.toExponential(2) : value.toFixed(3)) + ' ' + unit;
    expect(reading.textContent).toBe(expectedText);
    const help = insight.querySelector('[data-moment-scientific-help]');
    const energyScientific = (id === 'motion' || id === 'acceleration')
      && Object.values(momentEnergyForPoint(response, point)).some(amount => amount !== 0 && Math.abs(amount) < 0.001);
    expect(Boolean(help)).toBe(scientific || energyScientific);
    if (help) {
      expect(help.textContent).toContain('2.5e-6 means 0.0000025');
      expect(help.textContent).toContain('still nonzero');
      expect(help.closest('svg,[aria-hidden="true"]')).toBeNull();
    }
    expect(insight.innerHTML).not.toMatch(/NaN|Infinity/);
    return { time, value, unit, quantity, text: expectedText, scientific };
  }

  it('jumps to exact model peaks from the scene, pauses replay, and preserves viewpoint and writing', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18, seismicTime: 5,
      seismicObservation: 'Compare the two peaks.', seismicMotionGuide: true });
    const sig = lastScene.sig;
    click('Inspect peak motion');
    const peak = state.seismicTime;
    patch({ seismicTime: 3 });
    click('Replay scene');
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(state).toMatchObject({ seismicTime: peak, seismicPlaying: false, autoDriving: false,
      bridgeObserver: 'bank', bridgeBankYaw: 18, seismicObservation: 'Compare the two peaks.' });
    expect(lastScene.sig).toBe(sig);
    expect(Number(host.querySelector('[data-motion-frame]').dataset.motionFrame)).toBe(peak);
    const insight = host.querySelector('[data-bridge-moment-insight="motion"]');
    expect(checkNativeMoment(guideEnergyCurrentInputs(), 'motion').time).toBe(peak);
    expect(field('Scene key moments').getAttribute('aria-describedby')).toBe(insight.id);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'acceleration' } }));
    const accelerationTime = state.seismicTime;
    expect(checkNativeMoment(guideEnergyCurrentInputs(), 'acceleration').time).toBe(accelerationTime);
    expect(host.querySelector('[data-bridge-moment-insight="acceleration"]').textContent).toContain('stationary frame');
    click('Inspect peak acceleration');
    expect(state.seismicTime).toBe(accelerationTime);
  });

  it('uses each A/B trial peak without retiming the shared clock when changing trials', () => {
    mount({ seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    const peakTime = () => Number(field('Scene key moments').querySelector('option[value="motion"]').dataset.momentTime);
    const b = peakTime();
    click('A · reference');
    const a = peakTime();
    expect(a).not.toBe(b);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(state.seismicTime).toBe(a);
    expect(host.querySelector('[data-bridge-moment-insight]').dataset.momentTrial).toBe('reference');
    click('B · current');
    expect(state.seismicTime).toBe(a);
    expect(field('Scene key moments').value).toBe('');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    expect(state.seismicTime).toBe(b);
    expect(state.seismicDampingRatio).toBe(0.2);
    expect(host.querySelector('[data-bridge-moment-insight]').dataset.momentTrial).toBe('current');
    patch({ seismicIntensityG: 0 });
    expect(field('Scene key moments').querySelector('option[value="motion"]').disabled).toBe(true);
    click('A · reference');
    expect(field('Scene key moments').querySelector('option[value="motion"]').disabled).toBe(false);
  });

  it('clears moment explanations after scrubbing and during playback without storing a stale selection', () => {
    mount();
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    const peak = state.seismicTime;
    patch({ seismicTime: peak + 0.001 });
    expect(field('Scene key moments').value).toBe('');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    patch({ seismicTime: peak });
    expect(field('Scene key moments').value).toBe('motion');
    click('Replay scene');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    expect(field('Scene key moments').hasAttribute('aria-describedby')).toBe(false);
    tick(100);
    expect(field('Scene key moments').value).toBe('');
  });

  it('keeps boundary frames usable with zero shaking and reduced motion, without inventing a peak', () => {
    media.change(true);
    mount({ seismicIntensityG: 0, seismicTime: 5 });
    const select = field('Scene key moments');
    for (const id of ['motion', 'acceleration']) {
      expect(select.querySelector('option[value="' + id + '"]').disabled).toBe(true);
      expect(select.querySelector('option[value="' + id + '"]').textContent).toContain('no shaking');
      act(() => Simulate.change(select, { target: { value: id } }));
      expect(state.seismicTime).toBe(5);
    }
    for (const [id, time] of [['free', 16], ['end', 24], ['start', 0]]) {
      act(() => Simulate.change(select, { target: { value: id } }));
      expect(state.seismicTime).toBe(time);
      expect(state.seismicPlaying).toBe(false);
      expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('No ground motion was applied');
      const reading = checkNativeMoment(guideEnergyCurrentInputs(), id);
      expect(reading.value).toBe(0);
      expect(reading.text).toBe('0.000 J/kg');
      expect(reading.scientific).toBe(false);
    }
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('keeps moment navigation available when measurements are folded and rejects invalid commands', () => {
    mount({ bridgeView: 'immersive', seismicReadoutCollapsed: true, seismicTime: 7 });
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'constructor' } }));
    expect(state.seismicTime).toBe(7);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'free' } }));
    expect(state.seismicTime).toBe(16);
    expect(field('Scene key moments').hasAttribute('aria-describedby')).toBe(false);
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    patch({ seismicReadoutCollapsed: false });
    expect(host.querySelector('[data-bridge-moment-insight="free"]').textContent).toContain('Ground motion has ended');
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'end' } }));
    expect(host.querySelector('[data-bridge-moment-insight="end"]').textContent).toContain('does not mean the deck has settled');
  });

  it('keeps the chosen explanation when undamped motion and acceleration share a peak frame', () => {
    mount({ seismicDampingRatio: 0 });
    const options = field('Scene key moments');
    expect(options.querySelector('option[value="motion"]').dataset.momentTime)
      .toBe(options.querySelector('option[value="acceleration"]').dataset.momentTime);
    for (const id of ['acceleration', 'motion', 'acceleration']) {
      act(() => Simulate.change(options, { target: { value: id } }));
      expect(options.value).toBe(id);
      expect(host.querySelector('[data-bridge-moment-insight]').dataset.bridgeMomentInsight).toBe(id);
    }
    act(() => Simulate.change(options, { target: { value: 'end' } }));
    expect(host.querySelector('[data-bridge-moment-insight]').textContent).toContain('does not mean the deck has settled');
  });

  it('distinguishes very small nonzero peak readings from a zero-input experiment', () => {
    mount({ seismicIntensityG: 0.000001 });
    for (const id of ['motion', 'acceleration', 'free', 'end']) {
      act(() => Simulate.change(field('Scene key moments'), { target: { value: id } }));
      const reading = checkNativeMoment(guideEnergyCurrentInputs(), id);
      expect(reading.value).toBeGreaterThan(0);
      expect(reading.value).toBeLessThan(0.001);
      expect(reading.scientific).toBe(true);
      expect(reading.text).toMatch(/e-\d+ (cm|g|J\/kg)$/);
      expect(host.querySelector('[data-bridge-moment-insight]').textContent).not.toContain('No ground motion');
      expect(host.querySelector('[data-moment-reading]').textContent).not.toContain('<');
    }
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'start' } }));
    const start = checkNativeMoment(guideEnergyCurrentInputs(), 'start');
    expect(start.value).toBe(0);
    expect(start.text).toBe('0.000 J/kg');
    expect(start.scientific).toBe(false);
  });

  it('moment precision: uses saved tiny A values and milestones independently of ordinary B while preserving the common clock and evidence', () => {
    const savedInputs = { archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 1e-10, dampingRatio: 0.05 };
    const records = [{ version: 'bridge-seismic-v1', name: 'Tiny reference bridge', timeS: 12.319,
      inputs: savedInputs, prediction: 'Reference prediction', observation: 'Reference explanation' }];
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicTrials: records, seismicReferenceIndex: 0, seismicIntensityG: 0.12,
      seismicDampingRatio: 0.2, seismicTime: 7.217, seismicSceneNote: 'Keep scene evidence.',
      seismicObservation: 'Keep current explanation.' });
    click('Compare saved trial in scene');
    const currentInputs = guideEnergyCurrentInputs();
    const aResponse = guideEnergyResponse(savedInputs), bResponse = guideEnergyResponse(currentInputs);
    expect(aResponse.milestones.peakMotionS).not.toBe(bResponse.milestones.peakMotionS);
    const signature = lastScene.sig;
    click('A · reference');
    expect(state.seismicTime).toBe(7.217);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    const aMotion = checkNativeMoment(savedInputs, 'motion', 'reference');
    expect(aMotion.value).toBeGreaterThan(0);
    expect(aMotion.scientific).toBe(true);
    click('B · current');
    expect(state.seismicTime).toBe(aMotion.time);
    expect(field('Scene key moments').value).toBe('');
    expect(host.querySelector('[data-bridge-moment-insight]')).toBeNull();
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'motion' } }));
    const bMotion = checkNativeMoment(currentInputs, 'motion');
    expect(bMotion.value).toBeGreaterThan(aMotion.value);
    expect(bMotion.scientific).toBe(false);
    click('A · reference');
    expect(state.seismicTime).toBe(bMotion.time);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'acceleration' } }));
    const aAcceleration = checkNativeMoment(savedInputs, 'acceleration', 'reference');
    expect(aAcceleration.scientific).toBe(true);
    act(() => Simulate.change(field('Scene key moments'), { target: { value: 'free' } }));
    const aFree = checkNativeMoment(savedInputs, 'free', 'reference');
    expect(aFree.scientific).toBe(true);
    patch({ seismicIntensityG: 0.07, seismicFrequencyHz: 2.6, seismicDampingRatio: 0.4 });
    expect(checkNativeMoment(savedInputs, 'free', 'reference')).toEqual(aFree);
    click('B · current');
    expect(state.seismicTime).toBe(aFree.time);
    const bFree = checkNativeMoment(guideEnergyCurrentInputs(), 'free');
    expect(bFree.value).toBeGreaterThan(aFree.value);
    expect(state).toMatchObject({ seismicPlaying: false, bridgeObserver: 'bank', bridgeBankYaw: 18,
      seismicSceneNote: 'Keep scene evidence.', seismicObservation: 'Keep current explanation.' });
    expect(lastScene.sig).toBe(signature);
    expect(state.seismicTrials).toEqual(records);
  });

  it('folds scene measurements without resetting the clock, selected trial, or resting rails', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', seismicGuideOpen: true,
      seismicMotionGuide: true, seismicSceneEnergy: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    click('A · reference');
    const readings = host.querySelector('[data-motion-frame]').textContent;
    patch({ seismicReadoutCollapsed: true });
    expect(host.querySelector('[data-bridge-scene-readout]').open).toBe(false);
    expect(host.querySelector('[data-motion-frame]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-energy-frame]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-readout]').textContent).toContain('A · reference · 8.000 s');
    expect(lastScene.motionGuide).toBe(true);
    expect(state.seismicTime).toBe(8);
    click('Switch to deck viewpoint');
    expect(state.seismicReadoutCollapsed).toBe(true);
    expect(state.seismicSceneTrial).toBe('reference');
    patch({ seismicReadoutCollapsed: false });
    expect(host.querySelector('[data-motion-frame]').textContent).toBe(readings);
    expect(host.querySelector('[data-bridge-scene-energy-frame]')).toBeTruthy();
    click('Replay scene');
    patch({ seismicReadoutCollapsed: true });
    tick(200);
    expect(state.seismicTime).toBeGreaterThan(8);
    expect(state.seismicPlaying).toBe(true);
  });

  it('switches deck and riverbank observers at the same time while preserving both viewpoints and notes', () => {
    mount({ bridgeView: 'immersive', bridgeWalkPos: 0.64, bridgeLookYaw: 32, bridgeLookPitch: -7,
      seismicTime: 8, seismicObservation: 'Keep this observation.' });
    click('Run earthquake');
    click('From the riverbank');
    expect(state).toMatchObject({ bridgeView: 'immersive', bridgeObserver: 'bank', seismicTime: 8, seismicPlaying: false,
      bridgeWalkPos: 0.64, bridgeLookYaw: 32, bridgeLookPitch: -7, seismicObservation: 'Keep this observation.' });
    expect(lastScene.cameraMode).toBe('bank');
    expect(host.querySelector('[data-bridge-observer-hint]').textContent).toContain('moves with the ground');
    expect(host.querySelector('#bridge-walk-position')).toBeNull();
    act(() => Simulate.change(field('Look left or right (°)'), { target: { value: '20' } }));
    act(() => Simulate.change(field('Look up or down (°)'), { target: { value: '-12' } }));
    click('Switch to deck viewpoint');
    expect(lastScene.cameraMode).toBe('deck');
    expect(state.bridgeWalkPos).toBe(0.64);
    expect(field('Look left or right (°)').value).toBe('32');
    expect(field('Look up or down (°)').value).toBe('-7');
    click('Switch to riverbank viewpoint');
    expect(lastScene.bankYaw).toBe(20);
    expect(lastScene.bankPitch).toBe(-12);
    expect(state.seismicTime).toBe(8);
    expect(document.activeElement).toBe(host.querySelector('[aria-describedby="bridge-gl-description"]'));
  });

  it('supports bank keyboard controls and presets without changing the saved deck position', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeWalkPos: 0.72 });
    const viewer = host.querySelector('[aria-describedby="bridge-gl-description"]');
    act(() => Simulate.keyDown(viewer, { key: 'ArrowUp' }));
    act(() => Simulate.keyDown(viewer, { key: 'ArrowRight' }));
    expect(state).toMatchObject({ bridgeBankPitch: 5, bridgeBankYaw: 8, bridgeWalkPos: 0.72 });
    act(() => Simulate.keyDown(viewer, { key: 'Home' }));
    expect(state).toMatchObject({ bridgeBankPitch: 0, bridgeBankYaw: 0, bridgeWalkPos: 0.72 });
    click('Look along the bank');
    expect(state.bridgeBankYaw).toBe(90);
    expect(button('Look along the bank').getAttribute('aria-pressed')).toBe('true');
    click('Run earthquake');
    click('Face the bridge');
    expect(state).toMatchObject({ bridgeBankYaw: 0, bridgeBankPitch: 0, seismicPlaying: false });
    click('Look along the bank');
    click('Reset viewpoint');
    expect(state.bridgeBankYaw).toBe(0);
    expect(document.activeElement).toBe(viewer);
  });

  it('keeps bank A/B comparisons at one time with unchanged measurements and no automatic playback', () => {
    media.change(true);
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', seismicGuideOpen: true, seismicMotionGuide: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    const b = lastScene.quake.deckM;
    const sig = lastScene.sig;
    click('A · reference');
    const a = lastScene.quake.deckM;
    expect(a).not.toBe(b);
    expect(lastScene.cameraMode).toBe('bank');
    click('Switch to deck viewpoint');
    expect(lastScene.quake.deckM).toBe(a);
    expect(state.seismicSceneTrial).toBe('reference');
    expect(state.seismicTime).toBe(8);
    click('Switch to riverbank viewpoint');
    expect(lastScene.quake.deckM).toBe(a);
    click('B · current');
    expect(lastScene.quake.deckM).toBe(b);
    expect(lastScene.sig).toBe(sig);
    expect(state.seismicPlaying).toBe(false);
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('normalizes bank settings and retains them through viewer loss and deliberate recovery', () => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 999, bridgeBankPitch: -999 });
    expect(lastScene.bankYaw).toBe(180);
    expect(lastScene.bankPitch).toBe(-60);
    viewerStatus = 'failed';
    act(() => viewerListener('failed'));
    expect(state.bridgeView).toBe('2d');
    expect(button('From the riverbank').disabled).toBe(true);
    expect(host.querySelector('[data-bridge-observer-switch]')).toBeNull();
    viewerStatus = 'ready';
    act(() => viewerListener('ready'));
    expect(state.bridgeView).toBe('2d');
    click('From the riverbank');
    expect(lastScene.cameraMode).toBe('bank');
    expect(lastScene.bankYaw).toBe(180);
    patch({ bridgeObserver: 'invalid' });
    expect(lastScene.cameraMode).toBe('deck');
  });

  it('tracks signed ground and deck motion against rest, preserving time and current inputs', () => {
    mount({ seismicTime: 7.2, seismicMotionGuide: 'true' });
    expect(lastScene.motionGuide).toBe(false);
    expect(host.querySelector('[data-motion-frame]')).toBeNull();
    patch({ seismicMotionGuide: true });
    expect(lastScene.motionGuide).toBe(true);
    const frame = () => host.querySelector('[data-motion-frame]');
    const reading = key => Number(host.querySelector('[data-motion-reading="' + key + '"]').dataset.motionValueM);
    expect(frame().dataset.motionFrame).toBe('7.2');
    expect(reading('ground')).toBe(lastScene.quake.groundM);
    expect(reading('deck')).toBe(lastScene.quake.deckM);
    expect(reading('deck') - reading('ground')).toBeCloseTo(reading('relative'), 10);
    const range = frame().dataset.motionRangeM;
    const sig = lastScene.sig;
    patch({ seismicTime: 24 });
    expect(frame().dataset.motionRangeM).toBe(range);
    expect(frame().dataset.motionFrame).toBe('24');
    expect(lastScene.sig).toBe(sig);
    patch({ seismicMotionGuide: false });
    expect(host.querySelector('[data-motion-frame]')).toBeNull();
    expect(lastScene.motionGuide).toBe(false);
    expect(state.seismicTime).toBe(24);
  });

  it('uses the selected A/B motion and a common full-event range for both scenes', () => {
    mount({ seismicMotionGuide: true, seismicGuideOpen: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 8 });
    const frame = () => host.querySelector('[data-motion-frame]');
    const range = frame().dataset.motionRangeM;
    const b = host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM;
    click('A · reference');
    expect(frame().dataset.motionTrial).toBe('reference');
    expect(frame().dataset.motionRangeM).toBe(range);
    expect(Number(host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM)).toBe(lastScene.quake.deckM);
    expect(host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM).not.toBe(b);
    click('B · current');
    expect(frame().dataset.motionTrial).toBe('current');
    expect(frame().dataset.motionRangeM).toBe(range);
    expect(host.querySelector('[data-motion-reading="deck"]').dataset.motionValueM).toBe(b);
    expect(state.seismicTime).toBe(8);
    expect(state.seismicDampingRatio).toBe(0.2);
  });

  it('keeps a finite, readable motion guide with zero shaking, reduced motion, and a failed viewer', () => {
    media.change(true);
    mount({ seismicMotionGuide: true, seismicIntensityG: 0, seismicTime: 12 });
    expect([...host.querySelectorAll('[data-motion-reading]')].every(node => node.textContent.endsWith('0.00 cm'))).toBe(true);
    expect(Number(host.querySelector('[data-motion-frame]').dataset.motionRangeM)).toBeGreaterThan(0);
    const readings = host.querySelector('[data-motion-frame]').textContent;
    patch({ bridgeView: '2d' });
    expect(host.querySelector('[data-bridge-motion-guide="scene"]')).toBeNull();
    expect(host.querySelector('[data-bridge-motion-guide="fallback"]')).toBeTruthy();
    expect(host.querySelector('[data-motion-frame]').textContent).toContain('Current experiment');
    click('Step forward 0.5 s');
    expect(host.querySelector('[data-motion-frame]').dataset.motionFrame).toBe('12.5');
    expect(state.seismicPlaying).not.toBe(true);
    patch({ bridgeView: 'immersive' });
    viewerStatus = 'failed';
    act(() => viewerListener('failed'));
    expect(host.querySelector('[data-bridge-motion-guide="fallback"]')).toBeTruthy();
    expect(host.querySelectorAll('[data-motion-frame]')).toHaveLength(1);
    patch({ seismicEnabled: false });
    expect(host.querySelector('[data-bridge-motion-guide]')).toBeNull();
  });

  it('prepares a controlled damping pair without overwriting existing trials, notes, or static inputs', () => {
    const trials = [{ version: 'unsupported-future', notes: 'Keep this record.' }];
    mount({ seismicGuideOpen: true, seismicFrequencyHz: 0.8, seismicIntensityG: 0.15, seismicArchetype: 'flexible',
      seismicPrediction: 'Notebook prediction', seismicObservation: 'Notebook evidence', seismicTrials: trials,
      seismicGuidePrediction: 'More damping may reduce motion.', span: 42, seismicTime: 8 });
    click('Run earthquake');
    click('Prepare 5% / 20% comparison');
    expect(state).toMatchObject({ seismicDampingRatio: 0.2, seismicTime: 0, seismicPlaying: false, seismicSceneCompare: true,
      seismicSceneSource: 'guide', seismicSceneTrial: 'current', span: 42, seismicPrediction: 'Notebook prediction',
      seismicObservation: 'Notebook evidence', seismicGuidePrediction: 'More damping may reduce motion.' });
    expect(state.seismicTrials).toEqual(trials);
    expect(state.seismicGuideBaseline.inputs).toEqual({ archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 0.15, dampingRatio: 0.05 });
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Damping is the only input');
    tick(500);
    expect(state.seismicTime).toBe(0);
  });

  it('switches A and B at one time and viewpoint, with paired energy scales and unchanged current inputs', () => {
    mount({ seismicGuideOpen: true, bridgeView: 'immersive', bridgeWalkPos: 0.5, bridgeLookYaw: 90, seismicSceneEnergy: true });
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.2 });
    const b = lastScene.quake.deckM;
    const scale = host.querySelector('[data-bridge-scene-energy-frame]').dataset.energyLimit;
    click('Run earthquake');
    click('A · reference');
    expect(lastScene.quake.deckM).not.toBe(b);
    expect(state).toMatchObject({ seismicTime: 7.2, seismicDampingRatio: 0.2, seismicPlaying: false, bridgeWalkPos: 0.5, bridgeLookYaw: 90 });
    expect(host.querySelector('[data-bridge-scene-readout]').dataset.sceneTrial).toBe('reference');
    expect(host.querySelector('[data-bridge-scene-energy-frame]').dataset.energyLimit).toBe(scale);
    click('B · current');
    expect(lastScene.quake.deckM).toBe(b);
    expect(host.querySelector('[data-bridge-scene-energy-frame]').dataset.energyLimit).toBe(scale);
    click('A · reference');
    act(() => Simulate.change(field('Damping ratio (%)'), { target: { value: '30' } }));
    expect(state.seismicSceneTrial).toBe('current');
    click('End scene comparison');
    expect(state.seismicSceneCompare).toBe(false);
  });

  it('records paired inputs and time, marks earlier settings, and prints recalculated evidence with writing', () => {
    mount({ seismicGuideOpen: true, seismicGuidePrediction: '<script>prediction</script>', seismicGuideClaim: 'B moved less.',
      seismicGuideReasoning: 'I compared stored energy after the shaking ended.' });
    click('Prepare 5% / 20% comparison');
    click('Inspect both at 16 s');
    click('Record paired evidence');
    expect(state.seismicGuideEvidence).toMatchObject({ version: 'bridge-damping-evidence-v1', timeS: 16,
      referenceInputs: { dampingRatio: 0.05 }, currentInputs: { dampingRatio: 0.2 } });
    expect(host.querySelector('[data-guide-evidence]').dataset.guideEvidence).toBe('matching');
    const recorded = host.querySelector('[data-guide-readings="recorded"]').textContent;
    const recordedStored = host.querySelector('[data-guide-readings="recorded"] [data-guide-measure="3"] [data-guide-value="b"]');
    expect(Number(recordedStored.dataset.guideNumber)).toBeGreaterThan(0);
    expect(Number(recordedStored.dataset.guideNumber)).toBeLessThan(0.001);
    expect(recordedStored.textContent).toMatch(/e-\d+ J\/kg/);
    patch({ seismicFrequencyHz: 2, seismicTime: 24, seismicEnabled: false,
      seismicGuideEvidence: { ...state.seismicGuideEvidence, inventedPeak: 999999 } });
    expect(host.querySelector('[data-guide-evidence]').dataset.guideEvidence).toBe('earlier');
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Response mode or ground motion differs');
    expect(host.querySelector('[data-guide-readings="recorded"]').textContent).toBe(recorded);
    click('Open investigation report');
    const report = host.querySelector('[data-bridge-damping-guide="print"]');
    expect(report.querySelector('[data-guide-readings="recorded"]').textContent).toBe(recorded);
    expect(report.textContent).toContain('<script>prediction</script>');
    expect(report.textContent).toContain('I compared stored energy');
    expect(report.textContent).not.toContain('999999');
    expect(report.querySelectorAll('button,input,textarea,script')).toHaveLength(0);
  });

  it('identifies zero input and identical damping without asserting a useful damping result', () => {
    mount({ seismicGuideOpen: true, seismicIntensityG: 0 });
    click('Prepare 5% / 20% comparison');
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('no shaking');
    expect(host.querySelector('[data-guide-readings="current"]').textContent).not.toMatch(/NaN|Infinity/);
    patch({ seismicIntensityG: 0.12 });
    click('Prepare 5% / 20% comparison');
    patch({ seismicDampingRatio: 0.05 });
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Damping is also identical');
  });

  it('ignores invalid restored guide records and falls back to the current scene without starting playback', () => {
    mount({ seismicGuideOpen: true, seismicSceneCompare: true, seismicSceneSource: 'guide', seismicSceneTrial: 'reference', seismicPlaying: true,
      seismicGuideBaseline: { version: 'bridge-damping-v1', inputs: { dampingRatio: 0.05, archetype: 'constructor' } },
      seismicGuideEvidence: { version: 'bridge-damping-evidence-v1', timeS: Infinity, referenceInputs: {}, currentInputs: {} } });
    expect(host.querySelector('[data-guide-evidence]')).toBeNull();
    expect(host.querySelector('[data-bridge-scene-readout]').dataset.sceneTrial).toBe('current');
    expect(host.querySelector('[data-guide-feedback]').textContent).toContain('Prepare the pair');
    expect(state.seismicPlaying).toBe(false);
  });

  it('compares a saved scene using shared time rather than its saved time and warns of different shaking', () => {
    mount({ seismicTime: 8, seismicTrials: [{ version: 'bridge-seismic-v1', name: 'Earlier test', timeS: 1,
      inputs: { archetype: 'stiff', groundFrequencyHz: 0.8, intensityG: 0.2, dampingRatio: 0.1 } }] });
    const b = lastScene.quake.deckM;
    click('Compare saved trial in scene');
    click('A · reference');
    expect(state.seismicTime).toBe(8);
    expect(lastScene.quake.deckM).not.toBe(b);
    expect(host.querySelector('[data-bridge-scene-readout]').textContent).toContain('different ground motion');
    patch({ seismicTrials: [] });
    expect(host.querySelector('[data-bridge-scene-readout]').dataset.sceneTrial).toBe('current');
    expect(lastScene.quake.deckM).toBe(b);
  });

  it.each(['tacoma', 'millennium'])('uses deliberate qualitative steps for the %s mechanism and links to the guide', selectedCase => {
    mount({ tab: 'cases', selectedCase, flutterStep: Infinity, pedestrianStep: -200 });
    const illustration = host.querySelector('[data-bridge-dynamics]');
    expect(illustration.querySelector('[data-dynamics-step]').dataset.dynamicsStep).toBe('0');
    expect(illustration.textContent).toContain('do not predict wind speed, crowd limits');
    expect(illustration.querySelectorAll('input[type="range"],style')).toHaveLength(0);
    const steps = illustration.querySelectorAll('[role="group"] button');
    act(() => steps[2].click());
    expect(illustration.querySelector('[data-dynamics-step]').dataset.dynamicsStep).toBe('2');
    expect(steps[2].getAttribute('aria-pressed')).toBe('true');
    expect(illustration.textContent).not.toMatch(/STRUCTURE FAILING|Critical:|at any wind speed/);
    click('Investigate damping and energy');
    expect(state).toMatchObject({ tab: 'build', seismicEnabled: true, seismicGuideOpen: true, seismicPlaying: false });
  });

  it('selects deliberate viewpoints, pauses motion, preserves evidence, and returns focus to the scene', () => {
    mount({ bridgeView: 'immersive', seismicTime: 8, seismicObservation: 'Keep my evidence.' });
    click('Run earthquake');
    click('River overlook');
    expect(state).toMatchObject({ bridgeWalkPos: 0.5, bridgeLookYaw: 90, bridgeLookPitch: -8,
      seismicTime: 8, seismicPlaying: false, seismicObservation: 'Keep my evidence.' });
    expect(button('River overlook').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    tick(300);
    expect(state.seismicTime).toBe(8);
    click('Look back toward entrance');
    expect(state).toMatchObject({ bridgeWalkPos: 0.85, bridgeLookYaw: 180, bridgeLookPitch: 0 });
    expect(button('River overlook').getAttribute('aria-pressed')).toBe('false');
    expect(button('Look back toward entrance').getAttribute('aria-pressed')).toBe('true');
    const drive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    act(() => drive.click());
    expect(state.autoDriving).toBe(true);
    click('Along the deck');
    expect(state).toMatchObject({ bridgeWalkPos: 0.12, bridgeLookYaw: 0, bridgeLookPitch: 0, autoDriving: false });
    patch({ bridgeLookYaw: 1 });
    expect(button('Along the deck').getAttribute('aria-pressed')).toBe('false');
    act(() => media.change(true));
    click('River overlook');
    expect(state.bridgeLookYaw).toBe(90);
    expect(state.seismicPlaying).toBe(false);
  });

  function checkNativeSceneEnergy(inputs, time, trial = 'current', pairedInputs = null) {
    const response = guideEnergyResponse(inputs);
    const point = guideEnergyOracle.bridgeSeismicEnergyInterval(response, time, time).earlier;
    const eventLimit = value => Math.max(0.001, value.peaks.inputJPerKg,
      value.peaks.storedJPerKg, value.peaks.dissipatedJPerKg) * 1.04;
    const limit = Math.max(eventLimit(response), pairedInputs ? eventLimit(guideEnergyResponse(pairedInputs)) : 0);
    const frame = host.querySelector('[data-bridge-scene-energy-frame]');
    expect(frame, 'native scene energy amounts').toBeTruthy();
    expect(Number(frame.dataset.bridgeSceneEnergyFrame)).toBe(point.timeS);
    expect(Number(frame.dataset.energyLimit)).toBe(limit);
    expect(frame.dataset.energyTrial).toBe(trial);
    expect(frame.getAttribute('aria-live')).toBe('off');
    const caption = frame.querySelector('[data-scene-energy-caption]');
    expect(caption.closest('svg,[aria-hidden="true"]')).toBeNull();
    expect(caption.textContent).toContain(pairedInputs ? trial === 'reference' ? 'A · reference' : 'B · current' : 'Current experiment');
    const shownTime = caption.textContent.match(/(\d+(?:\.\d+)?)\s*s(?:\s|$)/);
    expect(shownTime, 'native caption time').toBeTruthy();
    expect(Number(shownTime[1])).toBeCloseTo(point.timeS, 2);
    const stored = frame.querySelector('[data-scene-energy-group="stored"]');
    const dissipated = frame.querySelector('[data-scene-energy-group="dissipated"]');
    expect(stored.tagName).toBe('SECTION');
    expect(dissipated.tagName).toBe('SECTION');
    expect(stored.getAttribute('role')).toBe('group');
    expect(stored.getAttribute('aria-label')).toContain('Stored now');
    expect(dissipated.getAttribute('role')).toBe('group');
    expect(dissipated.getAttribute('aria-label')).toContain('since 0 s');
    expect([...stored.querySelectorAll('[data-scene-energy-part]')].map(node => node.dataset.sceneEnergyPart)).toEqual(['kinetic', 'elastic']);
    expect([...dissipated.querySelectorAll('[data-scene-energy-part]')].map(node => node.dataset.sceneEnergyPart)).toEqual(['dissipated']);
    const amounts = { kinetic: point.kineticJPerKg, elastic: point.strainJPerKg,
      stored: point.storedJPerKg, dissipated: point.dissipatedJPerKg };
    const widths = {};
    for (const id of ['kinetic', 'elastic', 'dissipated']) {
      const part = frame.querySelector('[data-scene-energy-part="' + id + '"]');
      expect(Number(part.dataset.energyValue)).toBe(amounts[id]);
      expect(part.closest('[aria-hidden="true"]')).toBeTruthy();
      widths[id] = parseFloat(part.style.width);
      if (amounts[id] === 0) expect(widths[id]).toBe(0);
      else {
        expect(widths[id]).toBeGreaterThan(0);
        expect(widths[id] / (amounts[id] / limit * 100)).toBeCloseTo(1, 12);
      }
    }
    for (const id of ['stored', 'dissipated']) {
      const total = frame.querySelector('[data-scene-energy-total="' + id + '"]');
      expect(Number(total.dataset.energyValue)).toBe(amounts[id]);
      expect(total.closest('svg,[aria-hidden="true"]')).toBeNull();
      expect(total.textContent).toContain('J/kg');
      if (amounts[id] === 0) expect(total.textContent).toContain('0.000 J/kg');
      else if (amounts[id] < 0.001) expect(total.textContent).toMatch(/\d\.\d{2}e[+-]\d+ J\/kg/);
    }
    for (const id of ['kinetic', 'elastic']) {
      const reading = frame.querySelector('[data-scene-energy-reading="' + id + '"]');
      expect(Number(reading.dataset.energyValue)).toBe(amounts[id]);
      expect(reading.closest('svg,[aria-hidden="true"]')).toBeNull();
      const label = reading.querySelector('[data-scene-energy-label]');
      expect(label.textContent).toBe(id === 'kinetic' ? 'Kinetic' : 'Elastic');
      expect(label.closest('svg,[aria-hidden="true"]')).toBeNull();
      expect(reading.textContent).toContain('J/kg');
      if (amounts[id] === 0) expect(reading.textContent).toContain('0.000 J/kg');
      else if (amounts[id] < 0.001) expect(reading.textContent).toMatch(/\d\.\d{2}e[+-]\d+ J\/kg/);
    }
    const scale = frame.querySelector('[data-scene-energy-scale]');
    expect(Number(scale.dataset.sceneEnergyScale)).toBe(limit);
    expect(scale.closest('svg,[aria-hidden="true"]')).toBeNull();
    expect(scale.textContent).toContain('0');
    expect(scale.textContent).toContain('J/kg');
    const units = frame.querySelector('[data-scene-energy-units]');
    expect(units.textContent).toContain('J/kg');
    expect(units.textContent).toContain('W/kg');
    expect(units.textContent.toLowerCase()).toContain('second');
    const tiny = Object.values(amounts).some(value => value !== 0 && Math.abs(value) < 0.001);
    expect(Boolean(frame.querySelector('[data-scene-energy-scientific-help]'))).toBe(tiny);
    expect(frame.textContent).not.toContain('<0.001');
    expect(frame.innerHTML).not.toMatch(/NaN|Infinity|undefined/);
    return { amounts, widths, limit };
  }

  it('frame energy native: separates stored and cumulative loss while preserving tiny, zero and undamped readings', () => {
    media.change(true);
    const time = 7.217;
    mount({ bridgeView: 'immersive', seismicSceneEnergy: true, seismicTime: time, seismicIntensityG: 1e-10,
      seismicPlaying: false, seismicObservation: 'Keep my explanation.' });
    const tiny = checkNativeSceneEnergy(guideEnergyCurrentInputs(), time);
    expect(Object.values(tiny.amounts).every(value => value > 0 && value < 0.001)).toBe(true);
    expect(tiny.limit).toBe(0.001 * 1.04);
    expect(host.querySelector('[data-scene-energy-scientific-help]').textContent).toContain('2.5e-6 means 0.0000025');
    const currentPoint = guideEnergyOracle.bridgeSeismicEnergyInterval(guideEnergyResponse(guideEnergyCurrentInputs()), time, time).earlier;
    expect(tiny.amounts.kinetic).not.toBe(currentPoint.velocityMps * currentPoint.velocityMps / 2);
    patch({ seismicTime: 0 });
    const start = checkNativeSceneEnergy(guideEnergyCurrentInputs(), 0);
    expect(Object.values(start.amounts)).toEqual([0, 0, 0, 0]);
    expect(start.widths).toEqual({ kinetic: 0, elastic: 0, dissipated: 0 });
    patch({ seismicIntensityG: 0, seismicTime: 24 });
    expect(Object.values(checkNativeSceneEnergy(guideEnergyCurrentInputs(), 24).amounts)).toEqual([0, 0, 0, 0]);
    patch({ seismicIntensityG: 0.12, seismicDampingRatio: 0, seismicTime: 18.137 });
    const free = checkNativeSceneEnergy(guideEnergyCurrentInputs(), 18.137);
    expect(free.amounts.stored).toBeGreaterThan(0);
    expect(free.amounts.dissipated).toBe(0);
    expect(free.widths.dissipated).toBe(0);
    patch({ seismicDampingRatio: 0.05, seismicTime: 16 });
    const endOfShaking = checkNativeSceneEnergy(guideEnergyCurrentInputs(), 16);
    patch({ seismicTime: 24 });
    const later = checkNativeSceneEnergy(guideEnergyCurrentInputs(), 24);
    expect(later.limit).toBe(endOfShaking.limit);
    expect(later.amounts.stored).toBeLessThan(endOfShaking.amounts.stored);
    expect(later.amounts.dissipated).toBeGreaterThan(endOfShaking.amounts.dissipated);
    expect(state).toMatchObject({ seismicPlaying: false, seismicObservation: 'Keep my explanation.' });
    expect(button('Replay scene').disabled).toBe(true);
  });

  it('frame energy native: follows unequal saved A/B on one scale while fallback retains the current experiment', () => {
    const savedInputs = { archetype: 'flexible', groundFrequencyHz: 0.8, intensityG: 0.17, dampingRatio: 0 };
    const records = [{ version: 'bridge-seismic-v1', name: 'Original undamped bridge', timeS: 12.319,
      inputs: savedInputs, prediction: 'Reference prediction', observation: 'Reference explanation' }];
    const time = 7.217;
    mount({ bridgeView: 'immersive', seismicSceneEnergy: true, seismicTrials: records, seismicReferenceIndex: 0,
      seismicIntensityG: 1e-10, seismicDampingRatio: 0.2, seismicTime: time, seismicPlaying: false,
      seismicSceneNote: 'Keep scene evidence.', seismicObservation: 'Keep current evidence.' });
    click('Compare saved trial in scene');
    const currentInputs = guideEnergyCurrentInputs();
    const current = checkNativeSceneEnergy(currentInputs, time, 'current', savedInputs);
    const currentMapAmounts = () => Object.fromEntries(['stored', 'damping'].map(id => [id,
      Number(host.querySelector('[data-energy-map-amount="' + id + '"]').dataset.energyValue)]));
    const mapBefore = currentMapAmounts();
    expect(mapBefore).toEqual({ stored: current.amounts.stored, damping: current.amounts.dissipated });
    click('A · reference');
    const reference = checkNativeSceneEnergy(savedInputs, time, 'reference', currentInputs);
    expect(reference.amounts).not.toEqual(current.amounts);
    expect(reference.amounts.dissipated).toBe(0);
    expect(reference.limit).toBe(current.limit);
    expect(currentMapAmounts()).toEqual(mapBefore);
    patch({ rot3d: { rotX: 22, rotY: 87 }, bridgeBankYaw: 37, bridgeBankPitch: -12,
      seismicMotionGuide: true, seismicEnergyFlow: true });
    expect(checkNativeSceneEnergy(savedInputs, time, 'reference', currentInputs)).toEqual(reference);
    click('B · current');
    expect(checkNativeSceneEnergy(currentInputs, time, 'current', savedInputs)).toEqual(current);
    click('A · reference');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(host.querySelector('[data-bridge-scene-energy-frame]')).toBeNull();
    expect(host.querySelector('[data-seismic-energy-map]').dataset.seismicEnergyMap).toBe('current');
    expect(host.querySelector('[data-energy-map-caption]').textContent).toContain('Current experiment · 7.217 s');
    expect(currentMapAmounts()).toEqual(mapBefore);
    expect(state).toMatchObject({ bridgeView: '2d', seismicSceneTrial: 'reference', seismicTime: time,
      seismicPlaying: false, seismicSceneEnergy: true, seismicSceneNote: 'Keep scene evidence.',
      seismicObservation: 'Keep current evidence.' });
    act(() => { viewerStatus = 'ready'; viewerListener?.('ready'); });
    expect(state.bridgeView).toBe('2d');
    expect(host.querySelector('[data-bridge-scene-energy-frame]')).toBeNull();
    expect(currentMapAmounts()).toEqual(mapBefore);
    click('From the riverbank');
    expect(checkNativeSceneEnergy(savedInputs, time, 'reference', currentInputs)).toEqual(reference);
    expect(state).toMatchObject({ bridgeView: 'immersive', seismicTime: time, seismicPlaying: false });
    expect(state.seismicTrials).toEqual(records);
  });

  it('uses fixed energy proportions in the scene and updates the shaking phase at 16 seconds', () => {
    mount({ bridgeView: 'immersive', seismicSceneEnergy: true, seismicTime: 7.2 });
    const frame = () => host.querySelector('[data-bridge-scene-energy-frame]');
    const parts = () => [...host.querySelectorAll('[data-scene-energy-part]')];
    const limit = Number(frame().dataset.energyLimit);
    expect(limit).toBeGreaterThan(0);
    expect(host.querySelector('[data-bridge-scene-readout]').getAttribute('aria-live')).toBe('off');
    expect(host.querySelector('[data-bridge-scene-phase]').dataset.bridgeScenePhase).toBe('shaking');
    for (const part of parts()) expect(parseFloat(part.style.width)).toBeCloseTo(Number(part.dataset.energyValue) / limit * 100, 8);
    const dissipated = Number(parts()[2].dataset.energyValue);
    patch({ seismicTime: 16 });
    expect(host.querySelector('[data-bridge-scene-phase]').dataset.bridgeScenePhase).toBe('free');
    expect(frame().dataset.bridgeSceneEnergyFrame).toBe('16');
    expect(Number(frame().dataset.energyLimit)).toBe(limit);
    expect(Number(parts()[2].dataset.energyValue)).toBeGreaterThan(dissipated);
    patch({ seismicTime: 24 });
    expect(Number(frame().dataset.energyLimit)).toBe(limit);
    expect(parts().reduce((total, part) => total + parseFloat(part.style.width), 0)).toBeLessThanOrEqual(100);
    patch({ seismicIntensityG: 0 });
    expect(parts().every(part => part.style.width === '0%')).toBe(true);
    expect(frame().textContent).not.toMatch(/NaN|Infinity|undefined/);
    patch({ seismicSceneEnergy: false });
    expect(frame()).toBeNull();
    expect(host.querySelector('[data-bridge-scene-energy]').open).toBe(false);
  });

  it('runs a complete frequency scan only on request and inspects the selected peak in the scene', () => {
    mount({ seismicScanOpen: true, seismicScanMeasure: 'constructor', seismicTime: 6, seismicFrequencyHz: 2,
      seismicPrediction: 'I predict a peak near the natural frequency.', seismicTrialName: 'Frequency evidence' });
    tick(100);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('idle');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    click('Run earthquake');
    click('Run frequency scan');
    expect(state.seismicPlaying).toBe(false);
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('complete');
    expect(host.querySelector('[data-seismic-scan-curve]').getAttribute('points').split(' ')).toHaveLength(57);
    expect(field('Frequency scan measure').value).toBe('relative');
    click('Select largest response');
    const slider = host.querySelector('[aria-label="Select scanned frequency (Hz)"]');
    const selected = Number(slider.getAttribute('aria-valuenow'));
    expect(selected).toBeGreaterThanOrEqual(1);
    expect(selected).toBeLessThanOrEqual(1.2);
    expect(state).toMatchObject({ seismicTime: 6, seismicFrequencyHz: 2 });
    click('Inspect this frequency');
    expect(state).toMatchObject({ seismicFrequencyHz: selected, seismicPlaying: false,
      seismicPrediction: 'I predict a peak near the natural frequency.' });
    expect(state.seismicTime).toBeGreaterThan(0);
    expect(state.seismicTime).toBeLessThan(24);
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('bridge-gl-description');
    click('Save earthquake trial');
    expect(state.seismicTrials[0].inputs.groundFrequencyHz).toBe(selected);
    expect(host.querySelector('[data-seismic-scan-results]')).not.toBeNull();
    act(() => Simulate.keyDown(slider, { key: 'End', preventDefault() {} }));
    expect(button('Next frequency').disabled).toBe(true);
    act(() => Simulate.keyDown(slider, { key: 'Home', preventDefault() {} }));
    expect(button('Previous frequency').disabled).toBe(true);
    act(() => Simulate.keyDown(slider, { key: 'PageUp', preventDefault() {} }));
    expect(slider.getAttribute('aria-valuenow')).toBe('0.45');
    act(() => Simulate.change(field('Frequency scan measure'), { target: { value: 'acceleration' } }));
    expect(slider.getAttribute('aria-valuetext')).toContain(' g');
    click('Select largest response');
    const accelerationPeak = Number(slider.getAttribute('aria-valuenow'));
    click('Inspect this frequency');
    expect(state.seismicFrequencyHz).toBe(accelerationPeak);
    expect(state.seismicPlaying).toBe(false);
  });

  it('cancels partial scans and discards stale work when the response settings change', () => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    tick(3);
    expect(host.querySelector('progress').value).toBeGreaterThan(0);
    click('Cancel frequency scan');
    expect(document.activeElement).toBe(host.querySelector('[data-bridge-seismic-scan]'));
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('cancelled');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    click('Run frequency scan');
    tick(3);
    patch({ seismicDampingRatio: 0.2 });
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('stale');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    expect(button('Run frequency scan').disabled).toBe(false);
  });

  it('keeps a completed scan across replay and static design changes but hides it for changed physical inputs', () => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    tick(1000);
    const curve = host.querySelector('[data-seismic-scan-curve]').getAttribute('points');
    patch({ seismicTime: 20, seismicFrequencyHz: 2, seismicReplaySpeed: 0.25, span: 44, seismicObservation: 'Keep writing' });
    expect(host.querySelector('[data-seismic-scan-curve]').getAttribute('points')).toBe(curve);
    for (const settings of [{ seismicIntensityG: 0.3 }, { seismicArchetype: 'stiff' }]) {
      patch(settings);
      expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('stale');
      expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
    }
    expect(state.seismicObservation).toBe('Keep writing');
  });

  it.each([{ seismicScanOpen: false }, { tab: 'forces' }, { seismicEnabled: false }])('cancels pending frequency work when leaving its context: %j', change => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    tick(3);
    patch(change);
    tick(1000);
    patch({ seismicScanOpen: true, seismicEnabled: true, tab: 'build' });
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('cancelled');
    expect(host.querySelector('[data-seismic-scan-results]')).toBeNull();
  });

  it('cancels hidden and unmounted scan timers without resuming automatically', () => {
    mount({ seismicScanOpen: true });
    click('Run frequency scan');
    act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    tick(1000);
    act(() => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    expect(host.querySelector('[data-seismic-scan-status]').dataset.seismicScanStatus).toBe('cancelled');
    click('Run frequency scan');
    act(() => root.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports deliberate zero-input investigation in the 2D reduced-motion view', () => {
    mount({ seismicScanOpen: true, seismicIntensityG: 0, bridgeView: '2d' });
    act(() => media.change(true));
    click('Run frequency scan');
    tick(1000);
    expect(host.querySelector('[data-seismic-scan-results]').textContent).toContain('All responses are zero');
    expect(button('Select largest response').disabled).toBe(true);
    expect(host.querySelector('[data-seismic-scan-curve]').getAttribute('points')).not.toMatch(/NaN|Infinity/);
    click('Next frequency');
    click('Inspect this frequency');
    expect(state.seismicTime).toBe(0);
    expect(state.seismicPlaying).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('[data-bridge-elevation]'));
  });

  it('selects any saved reference without changing the current experiment or student notes', () => {
    mount({ seismicTrialName: 'Original', seismicTime: 3 });
    click('Save earthquake trial');
    click('Try 20% damping');
    patch({ seismicTrialName: 'Damped', seismicTime: 12 });
    click('Save earthquake trial');
    patch({ seismicDampingRatio: 0.1, seismicTime: 6, seismicObservation: 'Current writing' });
    click('Run earthquake');
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    expect(state).toMatchObject({ seismicReferenceIndex: 1, seismicDampingRatio: 0.1, seismicTime: 6,
      seismicPlaying: false, seismicObservation: 'Current writing' });
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Reference: Damped');
    click('Compare on timeline');
    expect(document.activeElement).toBe(host.querySelector('[data-seismic-chart-slider]'));
    expect(field('Timeline reference trial').value).toBe('1');
    act(() => Simulate.change(field('Timeline reference trial'), { target: { value: '0' } }));
    expect(field('Earthquake reference trial').value).toBe('0');
    expect(state.seismicTime).toBe(6);
  });

  it('overlays trials at the current time without shifting by the saved inspection time', () => {
    mount({ seismicTime: 1 });
    click('Save earthquake trial');
    click('Try 20% damping');
    patch({ seismicTime: 10 });
    click('Compare on timeline');
    const frame = () => host.querySelector('[data-seismic-compare-frame]');
    const values = () => [...frame().children].map(node => parseFloat(node.textContent.split(': ')[1]));
    expect(frame().getAttribute('data-seismic-compare-frame')).toBe('10');
    expect(Math.abs(values()[0])).toBeGreaterThan(Math.abs(values()[1]) * 2);
    const history = host.querySelector('[data-seismic-comparison-curves] polyline').getAttribute('points');
    patch({ seismicTime: 16 });
    expect(frame().getAttribute('data-seismic-compare-frame')).toBe('16');
    expect(host.querySelector('[data-seismic-comparison-curves] polyline').getAttribute('points')).toBe(history);
    act(() => Simulate.change(field('Comparison measure'), { target: { value: 'stored' } }));
    expect(frame().textContent).toContain('J/kg');
    expect(values().every(value => value >= 0)).toBe(true);
    expect(state.seismicTrials[0].timeS).toBe(1);
  });

  it('retains reference identity when earlier records are removed and recovers when the reference is deleted', () => {
    const unsupported = { version: 'future', notes: 'Preserve me.' };
    mount({ seismicTrials: [unsupported], seismicReferenceIndex: 99, seismicCompareMeasure: 'constructor', seismicTimeline: 'comparison' });
    expect(button('Compare trials').disabled).toBe(true);
    expect(button('Energy over time').getAttribute('aria-pressed')).toBe('true');
    for (const name of ['First', 'Second', 'Third']) {
      patch({ seismicTrialName: name });
      click('Save earthquake trial');
    }
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '2' } }));
    click('Compare on timeline');
    expect(field('Comparison measure').value).toBe('relative');
    click('Remove earthquake trial 1: First');
    expect(state.seismicReferenceIndex).toBe(1);
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Reference: Third');
    click('Remove earthquake trial 2: Third');
    expect(state.seismicReferenceIndex).toBe(0);
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Reference: Second');
    click('Remove earthquake trial 1: Second');
    expect(state.seismicTimeline).toBe('energy');
    expect(button('Compare trials').disabled).toBe(true);
    expect(document.activeElement.id).toBe('bridge-seismic-notebook');
    expect(state.seismicTrials).toEqual([unsupported]);
  });

  it('matches only the reference ground motion and keeps the chosen response and notes', () => {
    mount({ seismicFrequencyHz: 0.65, seismicIntensityG: 0.1, seismicTrialName: 'Ground input' });
    click('Save earthquake trial');
    patch({ seismicFrequencyHz: 2, seismicIntensityG: 0.3, seismicArchetype: 'stiff', seismicDampingRatio: 0.2,
      seismicTime: 9, seismicPrediction: 'Keep this prediction', span: 44 });
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('The ground motion differs');
    click('Run earthquake');
    click('Use reference shaking');
    expect(state).toMatchObject({ seismicFrequencyHz: 0.65, seismicIntensityG: 0.1, seismicArchetype: 'stiff', seismicDampingRatio: 0.2,
      seismicTime: 0, seismicPlaying: false, span: 44, seismicPrediction: 'Keep this prediction' });
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Both trials use the same ground motion');
    expect(host.querySelector('[data-seismic-trial-comparison]').textContent).toContain('Several settings changed');
  });

  it('reports absolute changes without an invalid percentage when the reference has zero input', () => {
    mount({ seismicIntensityG: 0 });
    click('Save earthquake trial');
    const comparison = () => host.querySelector('[data-seismic-trial-comparison]');
    expect(comparison().textContent).toContain('No percentage: reference is near zero.');
    expect(comparison().querySelector('tbody tr').lastElementChild.querySelector('[data-seismic-cell-value]').textContent).toBe('0.000 cm');
    patch({ seismicFrequencyHz: 2 });
    expect(comparison().textContent).toContain('Both trials use the same ground motion.');
    patch({ seismicIntensityG: 0.12 });
    expect(comparison().textContent).toContain('No percentage: reference is near zero.');
    expect(comparison().textContent).not.toMatch(/NaN|Infinity|undefined/);
    const change = comparison().querySelector('tbody tr').lastElementChild;
    expect(parseFloat(change.querySelector('[data-seismic-cell-value]').textContent)).toBeGreaterThan(0);
  });

  it('prints the selected reference and current settings with the same comparison values even when disabled', () => {
    mount({ seismicTrialName: 'First' });
    click('Save earthquake trial');
    click('Try 20% damping');
    patch({ seismicTrialName: '<b>Second</b>' });
    click('Save earthquake trial');
    act(() => Simulate.change(field('Earthquake reference trial'), { target: { value: '1' } }));
    patch({ seismicDampingRatio: 0.1 });
    const table = host.querySelector('[data-seismic-trial-comparison] table').textContent;
    patch({ seismicEnabled: false, tab: 'print' });
    const report = host.querySelector('[data-bridge-print-seismic]');
    expect(report.querySelector('[data-seismic-trial-comparison] table').textContent).toBe(table);
    expect(report.textContent).toContain('Reference: <b>Second</b>');
    expect(report.textContent).toContain('10% damping');
    expect(report.querySelectorAll('button,input,select,textarea,b')).toHaveLength(0);
  });

  it('runs quarter-speed replay without rounding drift and changes speed without changing the response', () => {
    mount();
    const history = host.querySelector('[data-seismic-energy-area="elastic"]').getAttribute('points');
    act(() => Simulate.change(field('Replay speed'), { target: { value: '0.25' } }));
    click('Run earthquake');
    tick(4000);
    expect(state.seismicTime).toBe(1);
    expect(field('Scene replay speed').value).toBe('0.25');
    act(() => Simulate.change(field('Scene replay speed'), { target: { value: '0.5' } }));
    tick(1000);
    expect(state.seismicTime).toBe(1.5);
    expect(state.seismicPlaying).toBe(true);
    expect(host.querySelector('[data-seismic-energy-area="elastic"]').getAttribute('points')).toBe(history);
    patch({ seismicTime: 23.975, seismicReplaySpeed: 0.25 });
    tick(100);
    expect(state.seismicTime).toBe(24);
    expect(state.seismicPlaying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('offers shared replay controls in the scene and pauses both views when scrubbing', () => {
    mount({ bridgeView: 'immersive', seismicTime: 5 });
    click('Replay scene');
    tick(100);
    expect(button('Pause earthquake').getAttribute('aria-pressed')).toBe('true');
    click('Pause scene replay');
    expect(state.seismicTime).toBe(5.1);
    click('Replay scene');
    act(() => Simulate.change(field('Scene replay time (s)'), { target: { value: '12.5' } }));
    expect(state).toMatchObject({ seismicTime: 12.5, seismicPlaying: false, autoDriving: false });
    expect(field('Experiment time (s)').value).toBe('12.5');
    expect(host.querySelector('[data-seismic-time-cursor]').getAttribute('data-seismic-time-cursor')).toBe('12.5');
    act(() => media.change(true));
    expect(button('Replay scene').disabled).toBe(true);
    expect(field('Scene replay time (s)').disabled).toBe(false);
  });

  it('inspects the timeline with keyboard controls and keeps energy and motion at the same time', () => {
    mount({ seismicTime: 3 });
    click('Run earthquake');
    const slider = host.querySelector('[data-seismic-chart-slider]');
    function press(key) { act(() => Simulate.keyDown(slider, { key })); }
    press('PageUp');
    expect(state).toMatchObject({ seismicTime: 4, seismicPlaying: false });
    press('ArrowLeft');
    expect(state.seismicTime).toBe(3.95);
    press('End');
    expect(state.seismicTime).toBe(24);
    press('ArrowRight');
    expect(state.seismicTime).toBe(24);
    expect(slider.getAttribute('aria-valuetext')).toContain('Observation ends');
    click('Motion over time');
    expect(host.querySelector('[data-bridge-seismic-timeline]').getAttribute('data-bridge-seismic-timeline')).toBe('motion');
    expect(state.seismicTime).toBe(24);
    press('Home');
    press('ArrowDown');
    expect(state.seismicTime).toBe(0);
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    expect(host.querySelector('[data-seismic-input-power]').textContent).toContain('No input transfer at this instant.');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('maps pointer scrubbing to bounded model time and stops dragging after capture is released', () => {
    mount();
    const slider = host.querySelector('[data-seismic-chart-slider]');
    let captured = false;
    slider.getBoundingClientRect = () => ({ left: 100, width: 240 });
    slider.setPointerCapture = () => { captured = true; };
    slider.hasPointerCapture = () => captured;
    slider.releasePointerCapture = () => { captured = false; };
    function pointer(type, clientX, extra = {}) { act(() => Simulate[type](slider, { pointerId: 1, button: 0, isPrimary: true, clientX, ...extra })); }
    pointer('pointerDown', 220);
    expect(state.seismicTime).toBe(12);
    expect(document.activeElement).toBe(slider);
    pointer('pointerMove', 400);
    expect(state.seismicTime).toBe(24);
    pointer('pointerUp', 50);
    expect(state.seismicTime).toBe(0);
    pointer('pointerMove', 220);
    pointer('pointerDown', 220, { button: 2 });
    expect(state.seismicTime).toBe(0);
  });

  it('normalizes restored replay options and refreshes history only when physical settings change', () => {
    mount({ seismicReplaySpeed: 'invalid', seismicTimeline: 'invalid', seismicTime: 16 });
    expect(field('Replay speed').value).toBe('1');
    expect(button('Energy over time').getAttribute('aria-pressed')).toBe('true');
    const history = () => host.querySelector('[data-seismic-energy-area="elastic"]').getAttribute('points');
    const initial = history();
    expect(host.querySelector('[data-seismic-input-power]').textContent).toContain('No input transfer at this instant.');
    patch({ seismicTime: 8 });
    expect(history()).toBe(initial);
    click('Try 20% damping');
    expect(history()).not.toBe(initial);
    patch({ seismicIntensityG: 0 });
    expect(host.querySelector('[data-bridge-seismic-timeline]').textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  const modeInspectionCases = ['flexible', 'balanced', 'stiff'].flatMap(mode =>
    ['relative', 'acceleration'].map(measure => [mode, measure]));
  const modeInspectionLabels = {
    flexible: 'Flexible response', balanced: 'Intermediate response', stiff: 'Stiffer response'
  };
  function modeInspectionMaximum(mode, measure) {
    const response = guideEnergyResponse({ archetype: mode, groundFrequencyHz: state.seismicFrequencyHz,
      intensityG: state.seismicIntensityG, dampingRatio: state.seismicDampingRatio });
    const field = measure === 'relative' ? 'relativeM' : 'absoluteAccelerationMps2';
    const factor = measure === 'relative' ? 100 : 1 / 9.80665;
    const point = response.samples.reduce((largest, candidate) =>
      Math.abs(candidate[field]) > Math.abs(largest[field]) ? candidate : largest, response.samples[0]);
    return { point, magnitude: Math.abs(point[field] * factor) };
  }
  function modeInspectionAction(mode, measure) {
    const row = host.querySelector('[data-response-mode="' + mode + '"]');
    expect(row, 'response mode ' + mode).toBeTruthy();
    const action = row.querySelector('[data-mode-peak-inspect="' + measure + '"]');
    expect(action, mode + ' ' + measure + ' recorded maximum action').toBeTruthy();
    expect(action.tagName).toBe('BUTTON');
    expect(action.type).toBe('button');
    expect(action.textContent).toContain('Inspect recorded maximum');
    return action;
  }
  function checkModeInspection(mode, measure) {
    const maximum = modeInspectionMaximum(mode, measure);
    const action = modeInspectionAction(mode, measure);
    expect(action.disabled).toBe(false);
    expect(Number(action.dataset.modePeakTime)).toBe(maximum.point.timeS);
    expect(Number(action.dataset.modePeakMagnitude)).toBe(maximum.magnitude);
    act(() => action.click());
    expect(state).toMatchObject({ seismicArchetype: mode, seismicTime: maximum.point.timeS,
      seismicSceneTrial: 'current', seismicPlaying: false, autoDriving: false });
    const readout = host.querySelector('[data-bridge-seismic-readout]');
    expect(readout.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(readout);
    expect(Number(readout.dataset.currentMoment)).toBe(maximum.point.timeS);
    expect(readout.querySelector('[data-moment-readout-caption]').textContent).toContain(modeInspectionLabels[mode]);
    expect(Number(readout.querySelector('[data-moment-reading="relative"] [data-moment-value]').dataset.momentValue))
      .toBe(maximum.point.relativeM * 100);
    expect(Number(readout.querySelector('[data-moment-reading="acceleration"] [data-moment-value]').dataset.momentValue))
      .toBe(maximum.point.absoluteAccelerationMps2 / 9.80665);
    return maximum;
  }

  it.each(modeInspectionCases)('mode inspection: selects the %s %s recorded maximum and preserves the investigation', (mode, measure) => {
    mount({ bridgeView: 'immersive', bridgeObserver: 'bank', bridgeWalkPos: 0.73, bridgeLookYaw: 91, bridgeLookPitch: -9,
      bridgeBankYaw: 27, bridgeBankPitch: -6, seismicArchetype: 'balanced', seismicFrequencyHz: 1.1,
      seismicIntensityG: 0.14, seismicDampingRatio: 0.08, seismicTime: 7.217, seismicIntervalPinS: 12.319,
      seismicTrialName: 'Keep notebook A', seismicPrediction: 'Keep earthquake prediction', seismicObservation: 'Keep explanation',
      seismicScenePrediction: 'Keep scene prediction', seismicSceneNote: 'Keep scene note', seismicGuideOpen: true,
      seismicGuidePrediction: 'Keep damping prediction', seismicGuideClaim: 'Keep claim', seismicGuideReasoning: 'Keep reasoning' });
    click('Save earthquake trial');
    click('Prepare 5% / 20% comparison');
    patch({ seismicTime: 7.217 });
    click('Record paired evidence');
    patch({ seismicSceneTrial: 'reference', seismicPlaying: true, autoDriving: true });
    const preservedKeys = ['bridgeView', 'bridgeObserver', 'bridgeWalkPos', 'bridgeLookYaw', 'bridgeLookPitch',
      'bridgeBankYaw', 'bridgeBankPitch', 'seismicFrequencyHz', 'seismicIntensityG', 'seismicDampingRatio',
      'seismicIntervalPinS', 'seismicTrialName', 'seismicPrediction', 'seismicObservation', 'seismicScenePrediction',
      'seismicSceneNote', 'seismicGuidePrediction', 'seismicGuideClaim', 'seismicGuideReasoning',
      'seismicTrials', 'seismicGuideBaseline', 'seismicGuideEvidence'];
    const preserved = JSON.parse(JSON.stringify(Object.fromEntries(preservedKeys.map(key => [key, state[key]]))));
    expect(host.querySelectorAll('[data-mode-peak-inspect]')).toHaveLength(6);
    const maximum = checkModeInspection(mode, measure);
    expect(maximum.point.timeS).toBeGreaterThan(0);
    expect(Object.fromEntries(preservedKeys.map(key => [key, state[key]]))).toEqual(preserved);
    tick(100);
    expect(state.seismicTime).toBe(maximum.point.timeS);
    expect(document.activeElement).toBe(host.querySelector('[data-bridge-seismic-readout]'));
  });

  it.each([['2d', false], ['immersive', true]])('mode inspection: keeps all six manual actions usable in %s with reduced motion %s', (view, reduced) => {
    media.change(reduced);
    mount({ bridgeView: view, bridgeObserver: 'deck', seismicArchetype: 'balanced', seismicFrequencyHz: 0.85,
      seismicIntensityG: 0.12, seismicDampingRatio: 0.1, seismicTime: 2 });
    for (const [mode, measure] of modeInspectionCases) {
      const maximum = checkModeInspection(mode, measure);
      expect(state.bridgeView).toBe(view);
      tick(100);
      expect(state.seismicTime).toBe(maximum.point.timeS);
      expect(state.seismicPlaying).toBe(false);
    }
  });

  it('mode inspection: disables zero response and still inspects tiny nonzero recorded motion and acceleration', () => {
    mount({ bridgeView: '2d', seismicArchetype: 'balanced', seismicFrequencyHz: 1.15,
      seismicIntensityG: 0, seismicDampingRatio: 0.2, seismicTime: 7.217, seismicObservation: 'Keep tiny evidence' });
    const unchanged = JSON.parse(JSON.stringify(state));
    for (const [mode, measure] of modeInspectionCases) {
      const action = modeInspectionAction(mode, measure);
      expect(action.disabled).toBe(true);
      expect(modeInspectionMaximum(mode, measure).magnitude).toBe(0);
      act(() => action.click());
      expect(state).toEqual(unchanged);
    }
    patch({ seismicIntensityG: 1e-9 });
    for (const [mode, measure] of modeInspectionCases) {
      const maximum = checkModeInspection(mode, measure);
      expect(maximum.magnitude).toBeGreaterThan(0);
      expect(maximum.magnitude).toBeLessThan(0.001);
      expect(state.seismicIntensityG).toBe(1e-9);
      expect(state.seismicObservation).toBe('Keep tiny evidence');
    }
  });

  it('inspects peak frames without motion and synchronizes the ground/deck diagram in 2D', () => {
    mount({ bridgeView: '2d', seismicTime: 3 });
    click('Inspect peak motion');
    expect(state.seismicPlaying).toBe(false);
    expect(state.seismicTime).toBeGreaterThan(3);
    const diagram = host.querySelector('[data-seismic-diagram]');
    const deck = Number(diagram.querySelector('[data-seismic-deck-x]').getAttribute('data-seismic-deck-x'));
    const ground = Number(diagram.querySelector('[data-seismic-ground-x]').getAttribute('data-seismic-ground-x'));
    expect(Math.abs(deck - ground)).toBeGreaterThan(20);
    click('Inspect peak acceleration');
    expect(state.seismicPlaying).toBe(false);
    click('Inspect end of shaking');
    expect(state.seismicTime).toBe(16);
    expect(host.querySelector('[data-bridge-seismic-readout]').textContent).toContain('Free vibration');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('saves compact earthquake evidence through labelled fields and restores a paused experiment', () => {
    mount({ seismicTime: 7.2, seismicDampingRatio: 0.03 });
    act(() => Simulate.change(field('Earthquake trial name'), { target: { value: 'Resonance trial' } }));
    act(() => Simulate.change(field('Earthquake prediction'), { target: { value: 'The deck will build up motion.' } }));
    act(() => Simulate.change(field('Earthquake observation and explanation'), { target: { value: 'Energy remains when the ground stops.' } }));
    click('Run earthquake');
    click('Save earthquake trial');
    expect(state.seismicPlaying).toBe(false);
    expect(state.seismicTrials).toHaveLength(1);
    const saved = state.seismicTrials[0];
    expect(saved).toMatchObject({ version: 'bridge-seismic-v1', name: 'Resonance trial', timeS: 7.2,
      inputs: { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.03 },
      prediction: 'The deck will build up motion.', observation: 'Energy remains when the ground stops.' });
    expect(saved).not.toHaveProperty('samples');
    expect(saved).not.toHaveProperty('peaks');
    patch({ seismicTime: 1, seismicDampingRatio: 0.3, seismicFrequencyHz: 2, seismicPrediction: 'Changed', bridgeView: '2d' });
    click('Restore earthquake trial 1: Resonance trial');
    expect(state).toMatchObject({ seismicTime: 7.2, seismicDampingRatio: 0.03, seismicFrequencyHz: 1.1,
      seismicPlaying: false, autoDriving: false, bridgeView: '2d', seismicPrediction: saved.prediction });
  });

  it('compares the whole event and identifies when several settings changed', () => {
    mount();
    click('Save earthquake trial');
    click('Try 20% damping');
    const comparison = () => host.querySelector('[data-seismic-trial-comparison]');
    expect(comparison().textContent).toContain('Changed settings: Damping ratio (%)');
    expect(comparison().textContent).not.toContain('Several settings changed');
    const motion = [...comparison().querySelectorAll('tbody tr')][0];
    expect(parseFloat(motion.children[2].querySelector('[data-seismic-cell-value]').textContent)).toBeLessThan(parseFloat(motion.children[1].querySelector('[data-seismic-cell-value]').textContent));
    const before = comparison().textContent;
    patch({ seismicTime: 12 });
    expect(comparison().textContent).toBe(before);
    patch({ seismicIntensityG: 0.2 });
    expect(comparison().textContent).toContain('Several settings changed');
  });

  it('limits displayed trials, preserves unsupported records, and keeps focus when one is removed', () => {
    const future = { version: 'future', notes: 'Keep this imported record.' };
    mount({ seismicTrials: [future] });
    for (let index = 0; index < 4; index++) click('Save earthquake trial');
    expect(button('Save earthquake trial').disabled).toBe(true);
    expect(state.seismicTrials).toHaveLength(5);
    expect(host.querySelectorAll('[data-seismic-trial]')).toHaveLength(4);
    click('Remove earthquake trial 2: Trial 2');
    expect(document.activeElement.id).toBe('bridge-seismic-notebook');
    expect(button('Save earthquake trial').disabled).toBe(false);
    expect(state.seismicTrials[0]).toEqual(future);
  });

  it('prints saved evidence and unsaved writing safely even with the earthquake disabled', () => {
    mount({ seismicTime: 7.2, seismicPrediction: '<script>prediction</script>', seismicObservation: 'Observed decay.' });
    click('Save earthquake trial');
    patch({ seismicEnabled: false, seismicObservation: 'A later unsaved observation.', tab: 'print' });
    const report = host.querySelector('[data-bridge-print-seismic]');
    expect(report.textContent).toContain('<script>prediction</script>');
    expect(report.querySelector('script')).toBeNull();
    expect(report.textContent).toContain('Observed decay.');
    expect(report.textContent).toContain('A later unsaved observation.');
    expect(report.textContent).toContain('Inspected time: 7.200 s');
    expect(report.textContent).toContain('J/kg');
    expect(report.querySelectorAll('button,input,textarea')).toHaveLength(0);
    expect(report.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('rejects corrupt trial inputs and recalculates results instead of trusting imported answers', () => {
    mount({ seismicTrials: [null, { version: 'future' }, {
      version: 'bridge-seismic-v1', inputs: { archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0, dampingRatio: 0.05 },
      name: 'Zero input', timeS: 5, peaks: { relativeM: 999 }
    }] });
    expect(host.querySelectorAll('[data-seismic-trial]')).toHaveLength(1);
    const trial = host.querySelector('[data-seismic-trial]');
    const reading=trial.querySelector('[data-saved-reading="peak-relative"]');expect(reading.querySelector('dt').textContent).toBe('Peak relative motion');expect(reading.querySelector('dd').textContent).toBe('0.000 cm');expect(reading.querySelector('dd').getAttribute('data-saved-reading-value')).toBe('0');
    expect(trial.textContent).not.toContain('999');
    expect(trial.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('enters and leaves the on-bridge view with bounded, labelled viewpoint controls', () => {
    mount({ bridgeWalkPos: 5, bridgeLookYaw: -999, bridgeLookPitch: 99 });
    click('On the bridge');
    expect(state.bridgeView).toBe('immersive');
    expect(button('On the bridge').getAttribute('aria-pressed')).toBe('true');
    expect(Number(field('Position on bridge (%)').value)).toBe(97);
    expect(Number(field('Look left or right (°)').value)).toBe(-180);
    expect(Number(field('Look up or down (°)').value)).toBe(60);
    click('Reset viewpoint');
    expect(state).toMatchObject({ bridgeWalkPos: 0.12, bridgeLookYaw: 0, bridgeLookPitch: 0 });
    click('3D structure');
    expect(state.bridgeView).toBe('3d');
  });

  it('requires an explicit start, pauses in place, and stops at the finite event end', () => {
    mount({ seismicPlaying: true, seismicTime: 5 });
    expect(state.seismicPlaying).toBe(false);
    tick(200);
    expect(state.seismicTime).toBe(5);
    click('Run earthquake');
    tick(200);
    expect(state.seismicTime).toBeCloseTo(5.2);
    click('Pause earthquake');
    const paused = state.seismicTime;
    tick(200);
    expect(state.seismicTime).toBe(paused);
    patch({ seismicTime: 23.9 });
    click('Run earthquake');
    tick(200);
    expect(state.seismicTime).toBe(24);
    expect(state.seismicPlaying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    click('Restart experiment');
    expect(state.seismicTime).toBe(0);
    expect(state.seismicPlaying).toBe(false);
  });

  it('keeps vehicle and earthquake playback mutually exclusive', () => {
    mount();
    const drive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    act(() => drive.click());
    tick(120);
    expect(state.autoDriving).toBe(true);
    click('Run earthquake');
    expect(state.autoDriving).toBe(false);
    expect(state.seismicPlaying).toBe(true);
    const vehiclePosition = state.vehiclePos;
    tick(200);
    expect(state.vehiclePos).toBe(vehiclePosition);
    const startDrive = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Auto-Drive Vehicle'));
    act(() => startDrive.click());
    expect(state.seismicPlaying).toBe(false);
    expect(state.autoDriving).toBe(true);
    const seismicTime = state.seismicTime;
    tick(240);
    expect(state.seismicTime).toBe(seismicTime);
  });

  it('pauses on 2D selection, tab exit, document hiding, and WebGL failure without resuming silently', () => {
    mount();
    click('Run earthquake');
    tick(100);
    click('Labelled 2D view');
    expect(state.seismicPlaying).toBe(false);
    click('3D structure');
    click('Run earthquake');
    patch({ tab: 'forces' });
    expect(state.seismicPlaying).toBe(false);
    patch({ tab: 'build' });
    click('Run earthquake');
    hidden = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(state.seismicPlaying).toBe(false);
    const paused = state.seismicTime;
    hidden = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    tick(100);
    expect(state.seismicTime).toBe(paused);
    click('Run earthquake');
    act(() => { viewerStatus = 'failed'; viewerListener?.('failed'); });
    expect(state).toMatchObject({ seismicPlaying: false, bridgeView: '2d' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('offers deliberate time steps under reduced motion and stops existing motion when the preference changes', () => {
    mount();
    click('Run earthquake');
    tick(100);
    act(() => media.change(true));
    expect(state.seismicPlaying).toBe(false);
    const paused = state.seismicTime;
    click('Step forward 0.5 s');
    expect(state.seismicTime).toBeCloseTo(paused + 0.5);
    tick(1000);
    expect(state.seismicTime).toBeCloseTo(paused + 0.5);
    expect(vi.getTimerCount()).toBe(0);
    patch({ seismicTime: 23.8 });
    click('Step forward 0.5 s');
    expect(state.seismicTime).toBe(24);
  });

  it('keeps the static member analysis and saved crossing evidence unchanged by the earthquake experiment', () => {
    mount({ seismicEnabled: false });
    click('Test all positions');
    const inspectorBefore = host.querySelector('[data-bridge-inspector]').textContent;
    const sweepBefore = state.vehicleSweep;
    patch({ seismicEnabled: true, seismicTime: 8, seismicArchetype: 'flexible', seismicFrequencyHz: 0.65,
      seismicIntensityG: 0.4, seismicDampingRatio: 0.2, bridgeView: 'immersive', bridgeWalkPos: 0.7 });
    expect(host.querySelector('[data-bridge-inspector]').textContent).toBe(inspectorBefore);
    expect(state.vehicleSweep).toBe(sweepBefore);
    expect(host.querySelector('[data-bridge-sweep]').textContent).toContain('Lowest safety factor across the crossing');
    expect(host.querySelector('[data-bridge-sweep]').textContent).not.toContain('The design changed');
    expect(host.querySelector('[data-bridge-energy]').textContent).toContain('J/kg');
    expect(host.querySelector('[data-bridge-seismic]').textContent).toMatch(/separate|does not change|unchanged/i);
  });

  it('renders finite energy and comparison evidence for zero input and malformed restored controls', () => {
    mount({ seismicTime: Infinity, seismicFrequencyHz: 'bad', seismicIntensityG: 0, seismicDampingRatio: -5,
      seismicArchetype: 'unknown' });
    expect(Number(field('Experiment time (s)').value)).toBe(0);
    expect(Number(field('Ground shaking frequency (Hz)').value)).toBe(1.1);
    expect(Number(field('Damping ratio (%)').value)).toBe(0);
    const panel = host.querySelector('[data-bridge-seismic]');
    expect(panel.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(host.querySelectorAll('[data-bridge-seismic-comparison] tbody tr')).toHaveLength(3);
  });

  it('releases quake timers and media listeners on unmount', () => {
    mount();
    click('Run earthquake');
    tick(100);
    expect(state.seismicPlaying).toBe(true);
    act(() => root.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
