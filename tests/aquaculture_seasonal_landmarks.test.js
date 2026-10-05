import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const modelVersion = '2026.10-stock-feedback';
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, kelp: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const writing = () => ({ claim: 'Keep my explanation of the original model result.', evidence: 'Keep the readings I already chose.', reasoning: 'Keep my explanation of the mechanism.', nextTest: 'Keep my planned next test.' });
const workspace = (patch = {}) => ({ ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'Lower oxygen should change the modeled signal.', observation: 'This existing explanation belongs to the learner and must remain unchanged.', evidence: writing(), measurements: [], experiments: [], ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
const findButton = (host, label) => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === label);
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}
function run(values, { metricId = 'oxygen', speciesId = 'system', version = modelVersion } = {}) {
  return { modelVersion: version, timeline: months.map((month, index) => ({ month, hasCrop: true, oxygen: 8, ammonia: .2, temperature: 16, resilience: 60, effort: 40, carryingPressure: 30, biomass: 5, survival: 90, [metricId]: speciesId === 'system' ? values[index] : 999, species: speciesId === 'system' ? [] : [{ id: speciesId, [metricId]: values[index] }] })) };
}

describe('Aquaculture seasonal landmarks', () => {
  let host, root, config, helpers;

  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, '', '/'); resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks();
  });

  async function mount(seed = workspace()) {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: seed }));
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    const stored = JSON.parse(localStorage.getItem(storageKey));
    stored.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(stored.ecosystemWorkspace);
    localStorage.setItem(storageKey, JSON.stringify(stored));
  }

  async function click(element) {
    expect(element).toBeTruthy(); expect(element.disabled).not.toBe(true);
    await act(async () => { element.click(); });
  }

  async function change(element, value) {
    expect(element).toBeTruthy();
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  }

  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;
  const landmarks = (a, b, metricId = 'oxygen', speciesId = 'system') => helpers.ecosystemSeasonalLandmarks(a, b, { metricId, speciesId });
  const landmarkPanel = () => host.querySelector('.aq-season-landmarks');
  const card = kind => landmarkPanel().querySelector('[data-landmark="' + kind + '"]');
  const currentLandmarks = (metricId, speciesId = 'system') => { const source = storedWorkspace(); return landmarks(source.baselineScenario ? helpers.simulateEcosystemYear(source.baselineScenario) : null, helpers.simulateEcosystemYear(source), metricId, speciesId); };
  const assertMonth = index => {
    const heading = host.querySelector('#aq-season-month-heading');
    expect(heading.textContent).toMatch(new RegExp('^' + months[index] + ' \\u00b7'));
    expect(heading.tabIndex).toBe(-1); expect(document.activeElement).toBe(heading);
    const selected = host.querySelector('.aq-season-months button[aria-pressed="true"]');
    expect(selected.getAttribute('aria-label')).toMatch(new RegExp('^Inspect ' + months[index] + ','));
  };

  it('finds B extrema including recorded zero without replacing them with A values', async () => {
    await mount();
    const b = run(Array.from({ length: 12 }, (_, index) => index)), a = run(Array(12).fill(50));
    const result = landmarks(a, b);
    expect(result).toMatchObject({ state: 'ready', validMonths: 12, metric: { id: 'oxygen', speciesId: 'system', unit: ' mg/L' }, low: { value: 0, months: [0] }, high: { value: 11, months: [11] } });
    expect(result.comparison.state).toBe('ready'); expect(result.comparison.validMonths).toBe(12);
    expect(result.comparison.magnitude).toBe(50); expect(result.comparison.months).toEqual([{ month: 0, a: 50, b: 0, delta: -50 }]);
  });

  it('keeps exact extrema and every exact tied month instead of rounding away a three-decimal biomass distinction', async () => {
    await mount();
    const b = run([1.003, 1.004, 1.003, 3.006, 3.006, 3.005, 2, 2, 2, 2, 2, 2], { metricId: 'biomass', speciesId: 'oyster' });
    const result = landmarks(null, b, 'biomass', 'oyster');
    expect(result.low).toEqual({ value: 1.003, months: [0, 2] });
    expect(result.high).toEqual({ value: 3.006, months: [3, 4] });
    expect(result.validMonths).toBe(12);
  });

  it('keeps both signed largest gaps when their absolute differences tie at displayed precision', async () => {
    await mount();
    const a = run(Array(12).fill(5)), b = run([7.004, 2.996, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    const result = landmarks(a, b);
    expect(result.comparison).toEqual({ state: 'ready', validMonths: 12, magnitude: 2, months: [{ month: 0, a: 5, b: 7.004, delta: 2 }, { month: 1, a: 5, b: 2.996, delta: -2 }] });
    expect(result.metric.deltaUnit).toBe(' mg/L');
  });

  it('reports all paired zero gaps as a match at displayed precision rather than a largest-gap action', async () => {
    await mount();
    const a = run(Array(12).fill(5)), b = run(Array.from({ length: 12 }, (_, index) => index % 2 ? 4.999 : 5.001));
    const result = landmarks(a, b);
    expect(result.comparison.state).toBe('match'); expect(result.comparison.magnitude).toBe(0);
    expect(result.comparison.validMonths).toBe(12); expect(result.comparison.months.map(item => item.month)).toEqual(months.map((_, index) => index));
    for (const item of result.comparison.months) expect(item.delta === 0).toBe(true);
  });

  it('finds low and high B with no A and describes the comparison as no baseline', async () => {
    await mount();
    const result = landmarks(null, run(Array.from({ length: 12 }, (_, index) => index)));
    expect(result.state).toBe('ready'); expect(result.validMonths).toBe(12);
    expect(result.low).toEqual({ value: 0, months: [0] }); expect(result.high).toEqual({ value: 11, months: [11] });
    expect(result.comparison).toEqual({ state: 'no-baseline', validMonths: 0, magnitude: null, months: [] });
  });

  it('refuses gaps across different or missing model versions while retaining B extrema', async () => {
    await mount();
    const b = run(Array(12).fill(7));
    for (const a of [run(Array(12).fill(5), { version: '2026.09-old-model' }), { timeline: run(Array(12).fill(5)).timeline }]) {
      const result = landmarks(a, b);
      expect(result.state).toBe('ready'); expect(result.low.value).toBe(7);
      expect(result.comparison).toEqual({ state: 'model-mismatch', validMonths: 0, magnitude: null, months: [] });
    }
    const missingBVersion = { timeline: clone(b.timeline) };
    expect(landmarks(run(Array(12).fill(5)), missingBVersion).comparison.state).toBe('model-mismatch');
    expect(landmarks(run(Array(12).fill(5), { version: '2026.09-old-model' }), run(Array(12).fill(7), { version: '2026.09-old-model' })).comparison.state).toBe('ready');
  });

  it('accepts finite numbers only, retains zero and omits null, strings, booleans and nonfinite values', async () => {
    await mount();
    const result = landmarks(null, run([0, '2', null, NaN, Infinity, -Infinity, undefined, false, 2, 4, 6, 7]));
    expect(result.state).toBe('ready'); expect(result.validMonths).toBe(5);
    expect(result.low).toEqual({ value: 0, months: [0] }); expect(result.high).toEqual({ value: 7, months: [11] });
    const unavailable = landmarks(run(Array(12).fill(5)), run(Array(12).fill(NaN)));
    expect(unavailable).toMatchObject({ state: 'unavailable', validMonths: 0, low: null, high: null });
    expect(unavailable.comparison).toEqual({ state: 'unavailable', validMonths: 0, magnitude: null, months: [] });
  });

  it('omits unknown, duplicate and missing named month slots without shifting their original indices', async () => {
    await mount();
    const b = run(Array.from({ length: 12 }, (_, index) => index));
    b.timeline[0] = { ...b.timeline[0], month: 'January', oxygen: -100 };
    b.timeline[2] = { ...b.timeline[2], month: 'Feb', oxygen: 100 };
    b.timeline[4] = undefined;
    const result = landmarks(null, b);
    expect(result.validMonths).toBe(9); expect(result.low).toEqual({ value: 1, months: [1] }); expect(result.high).toEqual({ value: 11, months: [11] });
    expect(result.low.months).not.toContain(0); expect(result.high.months).not.toContain(2);
  });

  it('requires a canonical twelve-slot timeline instead of accepting a truncated or extra-month run', async () => {
    await mount();
    const complete = run(Array(12).fill(5));
    for (const timeline of [complete.timeline.slice(0, 11), [...complete.timeline, { month: 'Jan', oxygen: 9 }], null, {}]) {
      const result = landmarks(null, { modelVersion, timeline });
      expect(result).toMatchObject({ state: 'unavailable', validMonths: 0, low: null, high: null });
    }
    const result = landmarks({ modelVersion, timeline: complete.timeline.slice(0, 11) }, complete);
    expect(result.state).toBe('ready'); expect(result.comparison.state).toBe('unavailable');
  });

  it('uses only mutually valid canonical months for gaps and exposes no comparison when their valid sets do not overlap', async () => {
    await mount();
    const a = run(Array.from({ length: 12 }, (_, index) => index % 2 ? null : 5));
    const b = run(Array.from({ length: 12 }, (_, index) => index % 2 ? 8 : null));
    const result = landmarks(a, b);
    expect(result.validMonths).toBe(6); expect(result.comparison).toEqual({ state: 'unavailable', validMonths: 0, magnitude: null, months: [] });
    b.timeline[10].oxygen = 9;
    const overlap = landmarks(a, b);
    expect(overlap.validMonths).toBe(7); expect(overlap.comparison).toEqual({ state: 'ready', validMonths: 1, magnitude: 4, months: [{ month: 10, a: 5, b: 9, delta: 4 }] });
  });

  it('reads the selected organism instead of whole-system biomass and leaves absent organism months unavailable', async () => {
    await mount();
    const b = run(Array.from({ length: 12 }, (_, index) => index), { metricId: 'biomass', speciesId: 'oyster' });
    b.timeline[1].species = [{ id: 'mussel', biomass: -100 }]; b.timeline[11].species = [];
    const result = landmarks(null, b, 'biomass', 'oyster');
    expect(result.metric).toMatchObject({ id: 'biomass', speciesId: 'oyster' }); expect(result.validMonths).toBe(10);
    expect(result.low).toEqual({ value: 0, months: [0] }); expect(result.high).toEqual({ value: 10, months: [10] });
    expect(result.high.value).not.toBe(999);
  });

  it('uses whole-system values for shared water metrics even while following a known organism', async () => {
    await mount();
    const b = run(Array.from({ length: 12 }, (_, index) => index));
    b.timeline.forEach(item => { item.species = [{ id: 'kelp', oxygen: 999 }]; });
    const result = landmarks(null, b, 'oxygen', 'kelp');
    expect(result.metric).toMatchObject({ id: 'oxygen', speciesId: 'system', shared: true });
    expect(result.low).toEqual({ value: 0, months: [0] }); expect(result.high).toEqual({ value: 11, months: [11] });
  });

  it('keeps fixed-support crop metrics inapplicable while allowing reference-band stress', async () => {
    await mount();
    for (const metricId of ['biomass', 'survival', 'progress']) {
      const result = landmarks(null, run(Array(12).fill(0), { metricId, speciesId: 'phytoplankton' }), metricId, 'phytoplankton');
      expect(result).toMatchObject({ state: 'not-applicable', validMonths: 0, low: null, high: null });
    }
    const stress = landmarks(null, run(Array.from({ length: 12 }, (_, index) => index), { metricId: 'stress', speciesId: 'phytoplankton' }), 'stress', 'phytoplankton');
    expect(stress.state).toBe('ready'); expect(stress.metric).toMatchObject({ id: 'stress', speciesId: 'phytoplankton', deltaUnit: ' index points' });
    expect(stress.low.value).toBe(0); expect(stress.high.value).toBe(11);
  });

  it('does not turn no-crop system survival into a recorded zero or a comparable gap', async () => {
    await mount();
    const a = run(Array(12).fill(90), { metricId: 'survival' }), b = run(Array(12).fill(0), { metricId: 'survival' });
    b.timeline.forEach(item => { item.hasCrop = false; });
    const result = landmarks(a, b, 'survival');
    expect(result).toMatchObject({ state: 'unavailable', validMonths: 0, low: null, high: null });
    expect(result.comparison.magnitude).toBeNull(); expect(result.comparison.months).toEqual([]);
    b.timeline[6].hasCrop = true; b.timeline[6].survival = 72;
    const mixed = landmarks(a, b, 'survival');
    expect(mixed.validMonths).toBe(1); expect(mixed.low).toEqual({ value: 72, months: [6] });
    expect(mixed.metric.deltaUnit).toBe(' percentage points');
    expect(mixed.comparison).toEqual({ state: 'ready', validMonths: 1, magnitude: 18, months: [{ month: 6, a: 90, b: 72, delta: -18 }] });
  });

  it('rejects unsupported selections and derives detached results from frozen original outputs without reading summaries', async () => {
    await mount();
    const a = run(Array(12).fill(5)), b = run(Array(12).fill(7));
    Object.defineProperty(a, 'summary', { get() { throw new Error('Landmarks must not use an annual summary or rerun.'); } });
    Object.defineProperty(b, 'summary', { get() { throw new Error('Landmarks must use the supplied monthly values.'); } });
    deepFreeze(a); deepFreeze(b);
    const originalA = JSON.stringify(a), originalB = JSON.stringify(b), result = landmarks(a, b);
    expect(result.state).toBe('ready'); expect(result.comparison.magnitude).toBe(2);
    result.low.months.push(99); result.comparison.months[0].a = 999;
    expect(JSON.stringify(a)).toBe(originalA); expect(JSON.stringify(b)).toBe(originalB);
    expect(landmarks(a, b).low.months).toEqual(months.map((_, index) => index));
    for (const selection of [{ metricId: 'invented', speciesId: 'system' }, { metricId: 'biomass', speciesId: 'invented' }, { metricId: 'stress', speciesId: 'system' }]) {
      const unavailable = helpers.ecosystemSeasonalLandmarks(a, b, selection);
      expect(unavailable).toMatchObject({ state: 'not-applicable', validMonths: 0, low: null, high: null });
    }
    expect(() => landmarks(null, null)).not.toThrow();
  });

  it('provides native low/high actions that focus the selected month and preserve every learner evidence field', async () => {
    const originalRecord = { id: 'original-landmark-evidence', kind: 'snapshot', modelVersion: '2026.09-original', savedAt: Date.parse('2026-10-02T12:00:00.000Z'), currentScenario: scenario(), status: 'Watch', oxygen: 5.25, observation: 'This earlier saved record must remain unchanged.', evidence: writing() };
    await mount(workspace({ experiments: [originalRecord] }));
    await change(host.querySelector('#aq-season-metric'), 'oxygen');
    const before = clone(storedWorkspace()), expected = currentLandmarks('oxygen'), panel = landmarkPanel();
    expect(panel.tagName).toBe('DETAILS'); expect(panel.querySelector('summary').textContent).toBe('Find low, high and largest A/B gap');
    panel.open = true;
    for (const [kind, label] of [['low', 'Inspect lowest B value'], ['high', 'Inspect highest B value']]) {
      expect(card(kind).textContent).toContain(String(expected[kind].value));
      for (const index of expected[kind].months) expect(card(kind).textContent).toContain(months[index]);
      const button = findButton(card(kind), label);
      expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.tabIndex).toBe(0);
      expect(button.getAttribute('aria-controls')).toBe('aq-season-inspection');
      const descriptions = button.getAttribute('aria-describedby').split(/\s+/);
      expect(descriptions).toContain('aq-season-landmarks-context');
      for (const id of descriptions) expect(host.querySelector('#' + id)?.textContent.trim()).toBeTruthy();
      button.focus(); expect(document.activeElement).toBe(button);
      await click(button); assertMonth(expected[kind].months[0]);
      expect(storedWorkspace()).toEqual(before);
    }
  });

  it('captures the landmark month for the selected species and uses shared system oxygen for a followed organism', async () => {
    await mount();
    await change(host.querySelector('#aq-season-species'), 'kelp'); await change(host.querySelector('#aq-season-metric'), 'biomass');
    let before = clone(storedWorkspace()), expected = currentLandmarks('biomass', 'kelp'), month = expected.high.months[0];
    landmarkPanel().open = true; await click(findButton(card('high'), 'Inspect highest B value')); assertMonth(month);
    expect(storedWorkspace()).toEqual(before);
    await click(findButton(host, 'Record inspected result'));
    const source = helpers.simulateEcosystemYear(before).timeline[month], note = storedWorkspace().measurements[0];
    expect(note).toMatchObject({ scope: 'month', month, metricId: 'biomass', speciesId: 'kelp', bState: 'recorded', b: source.species.find(item => item.id === 'kelp').biomass });
    expect(note.b).not.toBe(source.biomass);
    for (const field of ['observation', 'prediction', 'evidence', 'experiments', 'baselineScenario']) expect(storedWorkspace()[field], field).toEqual(before[field]);
    await change(host.querySelector('#aq-season-metric'), 'oxygen');
    before = clone(storedWorkspace()); expected = currentLandmarks('oxygen', 'kelp'); month = expected.comparison.months[0].month;
    await click(findButton(card('gap'), 'Inspect largest A/B gap')); assertMonth(month); expect(storedWorkspace()).toEqual(before);
    await click(findButton(host, 'Record inspected result'));
    const notes = storedWorkspace().measurements, shared = notes.find(item => item.metricId === 'oxygen');
    expect(shared).toMatchObject({ scope: 'month', month, metricId: 'oxygen', speciesId: 'system', a: helpers.simulateEcosystemYear(before.baselineScenario).timeline[month].oxygen, b: helpers.simulateEcosystemYear(before).timeline[month].oxygen });
    expect(notes.find(item => item.id === note.id)).toEqual(note);
    for (const field of ['observation', 'prediction', 'evidence', 'experiments']) expect(storedWorkspace()[field], field).toEqual(before[field]);
  });

  it('shows low and high B without a baseline and omits the unavailable gap action', async () => {
    await mount(workspace({ baselineScenario: null }));
    await change(host.querySelector('#aq-season-metric'), 'oxygen');
    landmarkPanel().open = true;
    expect(findButton(card('low'), 'Inspect lowest B value')).toBeTruthy(); expect(findButton(card('high'), 'Inspect highest B value')).toBeTruthy();
    expect(findButton(landmarkPanel(), 'Inspect largest A/B gap')).toBeUndefined();
    expect(card('gap').textContent).toMatch(/(?:save|scenario|baseline).*A|no baseline/i);
    const before = clone(storedWorkspace()), expected = currentLandmarks('oxygen');
    await click(findButton(card('low'), 'Inspect lowest B value')); assertMonth(expected.low.months[0]);
    expect(storedWorkspace()).toEqual(before);
  });

  it('labels identical A/B values as matching at displayed precision and exposes no meaningless gap navigation', async () => {
    await mount(workspace({ baselineScenario: scenario() }));
    await change(host.querySelector('#aq-season-metric'), 'oxygen');
    const before = clone(storedWorkspace()), expected = currentLandmarks('oxygen');
    expect(expected.comparison.state).toBe('match'); expect(expected.comparison.validMonths).toBe(12);
    landmarkPanel().open = true;
    expect(card('gap').textContent).toMatch(/match.*displayed(?: difference)? precision/i);
    expect(findButton(landmarkPanel(), 'Inspect largest A/B gap')).toBeUndefined();
    expect(findButton(card('low'), 'Inspect lowest B value')).toBeTruthy(); expect(findButton(card('high'), 'Inspect highest B value')).toBeTruthy();
    expect(storedWorkspace()).toEqual(before);
  });

  it('refreshes landmarks after a water edit while retaining the previously captured reading and all writing', async () => {
    await mount();
    await change(host.querySelector('#aq-season-metric'), 'oxygen'); landmarkPanel().open = true;
    const original = currentLandmarks('oxygen'), oldText = card('low').textContent;
    await click(findButton(card('low'), 'Inspect lowest B value')); await click(findButton(host, 'Record inspected result'));
    const before = clone(storedWorkspace()), frozen = clone(before.measurements);
    await change(host.querySelector('#aq-eco-oxygen'), '8');
    const changed = storedWorkspace(), expected = currentLandmarks('oxygen');
    expect(changed.water.oxygen).toBe(8); expect(changed.measurements).toEqual(frozen);
    expect(expected.low.value).not.toBe(original.low.value); expect(card('low').textContent).not.toBe(oldText);
    expect(card('low').textContent).toContain(String(expected.low.value));
    for (const field of ['prediction', 'observation', 'evidence', 'experiments', 'baselineScenario']) expect(changed[field], field).toEqual(before[field]);
    await click(findButton(card('low'), 'Inspect lowest B value')); assertMonth(expected.low.months[0]);
    expect(storedWorkspace()).toEqual(changed); expect(storedWorkspace().measurements).toEqual(frozen);
  });
});
