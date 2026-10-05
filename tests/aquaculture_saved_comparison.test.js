import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const savedAt = Date.parse('2026-10-02T12:00:00.000Z');
const modelVersion = '2099.future-recorded-test';
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const evidence = () => ({ claim: 'My original claim.', evidence: 'Original measurements support this tentative claim.', reasoning: 'My original mechanism.', nextTest: 'Change one input next.' });
const species = (id = 'oyster', patch = {}) => ({ id, initialBiomass: 2, endingBiomass: 11, survival: 56, warningMonths: 6, progress: 62.75, ready: false, ...patch });
const summary = (patch = {}) => ({ endingBiomass: 13, survival: 56, minOxygen: 4.1234, peakAmmonia: .37, averageResilience: 41, riskMonths: 6, harvestUnits: 1, operatingEffort: 39, hasCrop: true, species: [species(), species('phytoplankton', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null })], ...patch });
const comparison = (patch = {}) => ({
  id: 'first-original', title: 'First original oyster trial', savedAt, kind: 'comparison', modelVersion,
  environmentId: 'longline', organisms: { oyster: 2, phytoplankton: 1 }, status: 'Watch', carryingPressure: 42, oxygen: 9.7, ammonia: .11, resilience: 87,
  baselineScenario: scenario({ organisms: { oyster: 2, kelp: 1 }, water: { ...water, oxygen: 9 }, disturbanceId: 'none' }),
  currentScenario: scenario(), baselineSummary: summary({ endingBiomass: 99, minOxygen: 13, species: [species('kelp'), species()] }), currentSummary: summary(),
  prediction: 'My original prediction belongs to these saved settings.', observation: 'My original explanation belongs to these frozen results.', evidence: evidence(), measurements: [], ...patch
});
const secondComparison = (patch = {}) => comparison({ id: 'second-original', title: 'Second original oyster trial', savedAt: savedAt - 1000, currentSummary: summary({ endingBiomass: 17, survival: 71, minOxygen: 6.9876, peakAmmonia: .21, averageResilience: 52, riskMonths: 0, harvestUnits: 0, operatingEffort: 27, species: [species('oyster', { endingBiomass: 9, survival: 38, progress: 85 }), species('phytoplankton', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null })] }), ...patch });
const snapshot = (patch = {}) => comparison({ id: 'snapshot-original', title: 'Original direct preview', kind: 'snapshot', baselineScenario: null, baselineSummary: null, currentSummary: null, snapshotFields: ['carryingPressure', 'oxygen', 'ammonia', 'resilience'], ...patch });
const measurement = (patch = {}) => ({ id: 'frozen-reading', capturedAt: savedAt - 5000, modelVersion, scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 3.1234, b: 11.5678, baselineScenario: scenario({ water: { ...water, oxygen: 9 }, disturbanceId: 'none' }), currentScenario: scenario(), ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}
const rowFor = (rows, id) => rows.find(item => item.id === id);
const findButton = (host, label) => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === label);
const parsedHtml = html => new DOMParser().parseFromString(html, 'text/html');
const normalizedText = element => element.textContent.replace(/\s+/g, ' ').trim();

describe('Aquaculture review of two original saved investigations', () => {
  let host, root, helpers;

  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, '', '/'); resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });

  async function mount(workspace = scenario()) {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: workspace }));
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    const seed = JSON.parse(localStorage.getItem(storageKey));
    seed.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(seed.ecosystemWorkspace);
    localStorage.setItem(storageKey, JSON.stringify(seed));
  }

  async function click(element) {
    expect(element).toBeTruthy(); expect(element.disabled).not.toBe(true);
    await act(async () => { element.click(); });
  }

  async function change(element, value) {
    expect(element).toBeTruthy();
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  }

  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;
  const review = () => host.querySelector('.aq-saved-comparison');
  const selection = () => [host.querySelector('#aq-saved-review-first').value, host.querySelector('#aq-saved-review-second').value];
  const cardFor = id => [...host.querySelectorAll('.aq-experiment-record')].find(item => item.dataset.experimentId === id);

  it('compares detached original B annual values under matching recorded rules without recalculating either archive', async () => {
    await mount();
    const first = deepFreeze(comparison()), second = deepFreeze(secondComparison());
    const originals = [JSON.stringify(first), JSON.stringify(second)];
    const pair = helpers.ecosystemSavedComparison(first, second);
    expect(pair).toMatchObject({ valid: true, comparable: true, compositionChanged: false, changes: [] });
    expect(pair.first).not.toBe(first); expect(pair.first.currentScenario.water).not.toBe(first.currentScenario.water);
    expect(pair.second.currentSummary.species).not.toBe(second.currentSummary.species);
    expect(pair.rows).toHaveLength(8);
    expect(rowFor(pair.rows, 'endingBiomass')).toMatchObject({ first: { value: 13, state: 'recorded', source: 'annual' }, second: { value: 17 }, delta: 4, deltaUnit: ' index points' });
    expect(rowFor(pair.rows, 'minOxygen')).toMatchObject({ first: { value: 4.1234 }, second: { value: 6.9876 }, delta: 2.864, unit: ' mg/L' });
    expect(rowFor(pair.rows, 'survival')).toMatchObject({ delta: 15, deltaUnit: ' percentage points' });
    expect(rowFor(pair.rows, 'averageResilience')).toMatchObject({ delta: 11, deltaUnit: ' index points' });
    expect(rowFor(pair.rows, 'operatingEffort').delta).toBe(-12);
    expect(rowFor(pair.rows, 'riskMonths').delta).toBe(-6);
    expect(rowFor(pair.rows, 'harvestUnits').delta).toBe(-1);
    expect(helpers.ecosystemSavedComparison(first, second)).toEqual(pair);
    pair.first.currentScenario.water.oxygen = 2;
    pair.second.currentSummary.species[0].endingBiomass = 0;
    expect([JSON.stringify(first), JSON.stringify(second)]).toEqual(originals);
  });

  it('requires two distinct archive identities and returns no report for an incomplete or self comparison', async () => {
    await mount();
    const first = comparison();
    for (const [a, b] of [[null, first], [first, null], [first, clone(first)], [first, { ...secondComparison(), id: first.id }]]) {
      const pair = helpers.ecosystemSavedComparison(a, b);
      expect(pair).toMatchObject({ valid: false, comparable: false, rows: [], species: [], changes: null });
      expect(pair.messages.join(' ')).toContain('Choose two different saved investigations');
      expect(helpers.ecosystemSavedComparisonHtml(a, b)).toBe('');
    }
  });

  it('keeps original values but withholds every difference for unknown or mismatched recorded model versions', async () => {
    await mount();
    for (const version of [undefined, null, 202609, 'legacy', 'not a version', '2026.09-older-rules']) {
      const pair = helpers.ecosystemSavedComparison(comparison(), secondComparison({ modelVersion: version }));
      expect(pair).toMatchObject({ valid: true, comparable: false });
      expect(rowFor(pair.rows, 'minOxygen')).toMatchObject({ first: { value: 4.1234, state: 'recorded' }, second: { value: 6.9876, state: 'recorded' }, delta: null });
      expect(pair.rows.every(row => row.delta === null)).toBe(true);
      expect(pair.species.every(item => item.metrics.every(row => row.delta === null))).toBe(true);
      expect(pair.messages.join(' ')).toMatch(/model version|model rules/i);
    }
    const older = '2026.09-original-rules';
    expect(helpers.ecosystemSavedComparison(comparison({ modelVersion: older }), secondComparison({ modelVersion: older })).comparable).toBe(true);
  });

  it('requires every own B setting and preserves an explicit missing provenance marker without inventing delta inputs', async () => {
    await mount();
    const incomplete = ['environmentId', 'organisms', 'water', 'disturbanceId'].map(key => { const value = scenario(); delete value[key]; return value; });
    for (const key of Object.keys(water)) { const value = scenario(); delete value.water[key]; incomplete.push(value); }
    incomplete.push(scenario({ environmentId: '__proto__' }), scenario({ disturbanceId: 'constructor' }), scenario({ environmentId: { id: 'longline' } }), scenario({ disturbanceId: { id: 'none' } }), scenario({ water: { ...water, oxygen: NaN } }));
    const inheritedSetting = scenario(); delete inheritedSetting.environmentId;
    incomplete.push(Object.assign(Object.create({ environmentId: 'longline' }), inheritedSetting));
    const inheritedWater = { ...water }; delete inheritedWater.oxygen;
    incomplete.push(scenario({ water: Object.assign(Object.create({ oxygen: 7 }), inheritedWater) }));
    for (const currentScenario of incomplete) {
      const pair = helpers.ecosystemSavedComparison(comparison(), secondComparison({ currentScenario }));
      expect(pair.second.currentScenarioRecorded).toBe(false);
      expect(pair.comparable).toBe(false); expect(pair.changes).toBeNull();
      expect(rowFor(pair.rows, 'minOxygen')).toMatchObject({ second: { value: 6.9876 }, delta: null });
      expect(pair.rows.every(row => row.delta === null)).toBe(true);
      expect(JSON.stringify(pair)).not.toContain('NaN');
    }
    const marked = helpers.ecosystemSavedComparison(comparison(), secondComparison({ currentScenarioRecorded: false }));
    expect(marked.second.currentScenarioRecorded).toBe(false); expect(marked.changes).toBeNull();
    expect(marked.comparable).toBe(false);
    expect(rowFor(marked.rows, 'minOxygen')).toMatchObject({ second: { value: 6.9876 }, delta: null });
    const onlyMissingA = helpers.ecosystemSavedComparison(comparison({ baselineScenario: {} }), secondComparison({ baselineScenario: {} }));
    expect(onlyMissingA.comparable).toBe(true);
    expect(rowFor(onlyMissingA.rows, 'minOxygen').delta).toBe(2.864);
  });

  it('never uses snapshot scalars, original A or captured readings to fill a missing original B annual outcome', async () => {
    await mount();
    const missing = summary(); delete missing.minOxygen; delete missing.peakAmmonia;
    const pair = helpers.ecosystemSavedComparison(comparison({ currentSummary: missing, oxygen: 19, ammonia: 4, measurements: [measurement()] }), secondComparison());
    for (const id of ['minOxygen', 'peakAmmonia']) {
      expect(rowFor(pair.rows, id)).toMatchObject({ first: { value: null, state: 'not-recorded' }, delta: null });
    }
    const absent = helpers.ecosystemSavedComparison(comparison({ currentSummary: null, measurements: [measurement()] }), secondComparison());
    expect(absent.rows.every(row => row.first.value === null && row.first.state === 'not-recorded' && row.delta === null)).toBe(true);
    expect(absent.first.measurements[0].b).toBe(11.5678);
  });

  it('compares only own explicitly recorded snapshot readings and distinguishes recorded zero from unavailable values', async () => {
    await mount();
    const first = snapshot({ oxygen: 0, ammonia: '0', resilience: 'unavailable', carryingPressure: null });
    const second = snapshot({ id: 'second-snapshot', oxygen: '2.1234', ammonia: 0, resilience: 51, carryingPressure: 40, snapshotFields: ['oxygen', 'ammonia'] });
    const pair = helpers.ecosystemSavedComparison(first, second);
    expect(pair).toMatchObject({ valid: true, comparable: true, species: [] });
    expect(rowFor(pair.rows, 'oxygen')).toMatchObject({ first: { value: 0, state: 'recorded', source: 'snapshot' }, second: { value: 2.1234 }, delta: 2.123 });
    expect(rowFor(pair.rows, 'ammonia')).toMatchObject({ first: { value: 0 }, second: { value: 0 }, delta: 0 });
    for (const id of ['resilience', 'carryingPressure']) expect(rowFor(pair.rows, id)).toMatchObject({ first: { value: null, state: 'not-recorded' }, second: { value: null, state: 'not-recorded' }, delta: null });
    const inherited = snapshot(); delete inherited.oxygen;
    const inheritedPair = helpers.ecosystemSavedComparison(Object.assign(Object.create({ oxygen: 8 }), inherited), second);
    expect(rowFor(inheritedPair.rows, 'oxygen').first).toMatchObject({ value: null, state: 'not-recorded' });
    const excluded = helpers.ecosystemSavedComparison(snapshot({ snapshotFields: [] }), second);
    expect(excluded.rows.every(row => row.first.state === 'not-recorded')).toBe(true);
  });

  it('keeps annual minima and snapshot oxygen in separate scoped rows and withholds mixed scope differences', async () => {
    await mount();
    const pair = helpers.ecosystemSavedComparison(comparison(), snapshot({ currentSummary: summary({ minOxygen: 1, species: [species('mussel')] }) }));
    expect(pair).toMatchObject({ valid: true, comparable: false });
    expect(pair.rows).toHaveLength(12);
    expect(rowFor(pair.rows, 'minOxygen')).toMatchObject({ label: 'Annual · Lowest oxygen', first: { value: 4.1234, source: 'annual' }, second: { value: null, state: 'not-recorded', source: 'snapshot' }, delta: null });
    expect(rowFor(pair.rows, 'oxygen')).toMatchObject({ label: 'Snapshot · Snapshot oxygen', first: { value: null, state: 'not-recorded' }, second: { value: 9.7, source: 'snapshot' }, delta: null });
    expect(pair.rows.every(row => row.delta === null)).toBe(true);
    expect(rowFor(pair.species, 'oyster').second).toEqual({ state: 'not-recorded', data: null });
    expect(rowFor(pair.species, 'mussel')).toBeUndefined();
  });

  it('marks aggregate survival inapplicable for support only B stock and honors explicit crop applicability', async () => {
    await mount();
    const noCrop = comparison({ currentScenario: scenario({ organisms: { phytoplankton: 1 } }), currentSummary: summary({ hasCrop: null, survival: 0 }) });
    const supportPair = helpers.ecosystemSavedComparison(noCrop, secondComparison());
    expect(rowFor(supportPair.rows, 'survival')).toMatchObject({ first: { value: 0, state: 'not-applicable', applicable: false }, delta: null });
    const explicit = helpers.ecosystemSavedComparison(comparison({ currentSummary: summary({ hasCrop: false, survival: 99 }) }), secondComparison());
    expect(rowFor(explicit.rows, 'survival').first).toMatchObject({ value: 99, state: 'not-applicable', applicable: false });
    const unknown = helpers.ecosystemSavedComparison(comparison({ currentScenario: {}, currentSummary: summary({ hasCrop: null, survival: 0 }) }), secondComparison());
    expect(rowFor(unknown.rows, 'survival')).toMatchObject({ first: { value: 0, state: 'recorded', applicable: null }, delta: null });
    const inferred = helpers.ecosystemSavedComparison(comparison({ currentSummary: summary({ hasCrop: null }) }), secondComparison({ currentSummary: summary({ hasCrop: null, survival: 71 }) }));
    expect(rowFor(inferred.rows, 'survival')).toMatchObject({ first: { applicable: true }, second: { applicable: true }, delta: 15 });
  });

  it('reports original B composition, environment and disturbance changes with combined response cautions', async () => {
    await mount();
    const first = comparison({ baselineScenario: scenario({ organisms: { oyster: 5 }, disturbanceId: 'none' }) });
    const second = secondComparison({ currentScenario: scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, disturbanceId: 'none', water: { ...water, temperature: 12, salinity: 1, oxygen: 10 } }) });
    const pair = helpers.ecosystemSavedComparison(first, second);
    expect(pair.compositionChanged).toBe(true);
    expect(pair.changes).toEqual(helpers.ecosystemChanges(first.currentScenario, second.currentScenario));
    expect(pair.changes).not.toEqual(helpers.ecosystemChanges(first.baselineScenario, second.currentScenario));
    const context = pair.messages.join(' ');
    expect(context).toMatch(/stocking differs/i); expect(context).toMatch(/environment differs/i);
    expect(context).toMatch(/species weighting|crop composition/i); expect(context).toMatch(/different month/i);
  });

  it('aligns only original B species and preserves recorded zeros, false readiness, absence and missing stock outcomes', async () => {
    await mount();
    const first = comparison({ currentScenario: scenario({ organisms: { oyster: 2, mussel: 1 } }), currentSummary: summary({ species: [species('oyster', { endingBiomass: 0, survival: 0, progress: 0, ready: false })] }) });
    const second = secondComparison({ currentScenario: scenario({ organisms: { oyster: 2, kelp: 1 } }), currentSummary: summary({ species: [species('oyster', { endingBiomass: 0, survival: 0, progress: 0, ready: false }), species('kelp', { endingBiomass: 4 })] }) });
    const pair = helpers.ecosystemSavedComparison(first, second);
    expect(pair.species.map(item => item.id).sort()).toEqual(['oyster', 'mussel', 'kelp'].sort());
    expect(rowFor(pair.species, 'mussel').first).toEqual({ state: 'not-recorded', data: null });
    expect(rowFor(pair.species, 'mussel').second).toEqual({ state: 'not-stocked', data: null });
    expect(rowFor(pair.species, 'kelp').first).toEqual({ state: 'not-stocked', data: null });
    const oyster = rowFor(pair.species, 'oyster');
    expect(oyster.first.data.ready).toBe(false); expect(oyster.second.data.ready).toBe(false);
    for (const id of ['endingBiomass', 'survival', 'progress']) expect(rowFor(oyster.metrics, id)).toMatchObject({ first: { value: 0, state: 'recorded' }, second: { value: 0, state: 'recorded' }, delta: 0 });
    expect(rowFor(oyster.metrics, 'progress').deltaUnit).toBe(' percentage points');
    expect(rowFor(pair.species, 'kelp').metrics.every(row => row.delta === null && row.first.value === null)).toBe(true);
    const onlyOriginalA = helpers.ecosystemSavedComparison(comparison(), secondComparison());
    expect(rowFor(onlyOriginalA.species, 'kelp')).toBeUndefined();
  });

  it('does not infer absent species from incomplete B settings or crop metrics for fixed support species', async () => {
    await mount();
    const first = comparison({ currentScenario: {}, currentSummary: summary({ species: [species('oyster'), species('phytoplankton', { initialBiomass: 42, endingBiomass: 71, survival: 88, progress: 90, warningMonths: 1 })] }) });
    const second = secondComparison({ currentSummary: summary({ species: [species('mussel'), species('phytoplankton', { initialBiomass: 55, endingBiomass: 79, survival: 94, progress: 98, warningMonths: 3 })] }) });
    const pair = helpers.ecosystemSavedComparison(first, second);
    expect(rowFor(pair.species, 'mussel').first).toEqual({ state: 'not-recorded', data: null });
    const support = rowFor(pair.species, 'phytoplankton');
    expect(support.first.data.fixedSupport).toBe(true);
    for (const id of ['initialBiomass', 'endingBiomass', 'survival', 'progress']) {
      const row = rowFor(support.metrics, id);
      expect(row.first.state).toBe('not-applicable'); expect(row.second.state).toBe('not-applicable'); expect(row.delta).toBeNull();
    }
    expect(rowFor(support.metrics, 'warningMonths').first).toMatchObject({ value: 1, state: 'recorded', applicable: true });
    const complete = helpers.ecosystemSavedComparison({ ...first, currentScenario: scenario() }, second);
    expect(rowFor(rowFor(complete.species, 'phytoplankton').metrics, 'warningMonths').delta).toBe(2);
  });

  it('reverses every eligible aggregate and species difference when selection order is reversed', async () => {
    await mount();
    const first = comparison(), second = secondComparison();
    const forward = helpers.ecosystemSavedComparison(first, second), reverse = helpers.ecosystemSavedComparison(second, first);
    for (const row of forward.rows) {
      const reversed = rowFor(reverse.rows, row.id);
      expect(reversed.first).toEqual(row.second); expect(reversed.second).toEqual(row.first);
      expect(reversed.delta).toBe(row.delta === null ? null : row.delta === 0 ? 0 : -row.delta);
    }
    for (const item of forward.species) for (const row of item.metrics) {
      const reversed = rowFor(rowFor(reverse.species, item.id).metrics, row.id);
      expect(reversed.delta).toBe(row.delta === null ? null : row.delta === 0 ? 0 : -row.delta);
    }
  });

  it('exports an inert standalone review with both complete independent originals and their frozen captured notes', async () => {
    await mount();
    const first = deepFreeze(comparison({ title: '<img src="x" onerror="alert(1)"> First original', prediction: '<b>Original first prediction</b>', observation: '<script>alert("original")</script> First interpretation.', evidence: { ...evidence(), claim: '<svg onload="alert(2)">Claim</svg>' }, measurements: [measurement()] }));
    const second = deepFreeze(secondComparison({ title: 'Second & original', prediction: 'Original second prediction.', evidence: { ...evidence(), reasoning: 'Second unique original mechanism.' }, measurements: [measurement({ id: 'second-reading', b: 8.4321 })] }));
    const originals = [JSON.stringify(first), JSON.stringify(second)];
    const html = helpers.ecosystemSavedComparisonHtml(first, second), document = parsedHtml(html);
    expect(html).toMatch(/^<!doctype html>/i); expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('meta[name="viewport"]')).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('script,img,svg,iframe,input,button,a[download]')).toBeNull();
    expect(document.querySelector('[onerror],[onload]')).toBeNull();
    expect(html).toContain('&lt;script&gt;'); expect(html).toContain('&lt;b&gt;Original first prediction&lt;/b&gt;');
    const reports = [...document.querySelectorAll('.aq-saved-review-originals .aq-archive-report')];
    expect(reports).toHaveLength(2);
    for (const [index, record] of [first, second].entries()) {
      const text = normalizedText(reports[index]);
      expect(reports[index].querySelector('h2').textContent).toBe(record.title);
      expect(text).toContain(record.prediction); expect(text).toContain(record.evidence.reasoning);
      expect(text).toContain('Saved A settings'); expect(text).toContain('Saved B settings');
      expect(text).toContain(record.modelVersion); expect(text).toContain('2026-10-02');
      const notes = reports[index].querySelector('.aq-captured-measurements');
      expect(notes).toBeTruthy(); expect(notes.textContent).toContain(String(record.measurements[0].b));
      expect(notes.textContent).toContain(String(record.measurements[0].a));
    }
    const outcomes = [...document.querySelectorAll('.aq-saved-review-report > section')].find(item => item.querySelector('h2')?.textContent === 'Original saved outcomes');
    expect(outcomes.querySelectorAll('.aq-saved-review-result')).toHaveLength(8);
    expect(normalizedText(outcomes)).toContain('2.864 mg/L (Second minus First)');
    expect(normalizedText(outcomes)).toContain('15 percentage points');
    expect([JSON.stringify(first), JSON.stringify(second)]).toEqual(originals);
  });

  it('exports mixed scopes and invalid dates clearly without assigning a snapshot an internal comparison', async () => {
    await mount();
    const html = helpers.ecosystemSavedComparisonHtml(comparison({ savedAt: Number.MAX_VALUE }), snapshot({ savedAt: Number.MAX_VALUE, snapshotFields: ['oxygen'] }));
    const document = parsedHtml(html), text = normalizedText(document.body);
    expect(text).toContain('Different result scopes'); expect(text).toContain('Annual · Lowest oxygen'); expect(text).toContain('Snapshot · Snapshot oxygen');
    expect(text).not.toMatch(/Invalid Date|NaN/);
    const originals = document.querySelectorAll('.aq-saved-review-originals .aq-archive-report');
    expect(originals[1].textContent).toContain('Saved snapshot settings');
    expect(originals[1].textContent).not.toContain('Saved A settings');
    expect(originals[1].textContent).not.toContain('Full A/B settings were not recorded');
    expect(originals[1].textContent).toContain('Not recorded');
  });

  it('offers native ID selectors below Saved experiments and keeps selecting, swapping and opening originals read only', async () => {
    const third = comparison({ id: 'third-original', title: 'Third archived trial', savedAt: savedAt - 2000 });
    await mount({ ...scenario(), prediction: 'Keep the live draft.', observation: 'Keep this unfinished explanation.', evidence: evidence(), experiments: [comparison(), secondComparison(), third] });
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    expect(host.querySelector('#aq-saved-experiments-heading').nextElementSibling).toBe(review());
    expect(selection()).toEqual(['first-original', 'second-original']);
    for (const [id, label] of [['aq-saved-review-first', 'First saved investigation'], ['aq-saved-review-second', 'Second saved investigation']]) {
      const select = host.querySelector('#' + id);
      expect(select.tagName).toBe('SELECT'); expect(select.labels).toHaveLength(1); expect(select.labels[0].textContent).toBe(label);
      expect(select.getAttribute('aria-describedby')).toBe('aq-saved-review-status');
    }
    const metric = review().querySelector('[data-review-metric="minOxygen"]');
    expect([...metric.querySelectorAll('dt')].map(item => item.textContent)).toEqual(['First', 'Second', 'Second minus First']);
    expect([...metric.querySelectorAll('dd')].map(item => item.textContent)).toEqual(['4.1234 mg/L', '6.9876 mg/L', '+2.864 mg/L (Second minus First)']);
    await change(host.querySelector('#aq-saved-review-second'), third.id);
    await click(findButton(review(), 'Swap selected investigations'));
    expect(selection()).toEqual([third.id, 'first-original']);
    for (const [label, id] of [['first', third.id], ['second', 'first-original']]) {
      await click(findButton(review(), 'Review ' + label + ' saved investigation'));
      expect(cardFor(id).querySelector('.aq-saved-inputs').open).toBe(true);
      expect(document.activeElement).toBe(cardFor(id).querySelector('h4'));
    }
    expect(storedWorkspace()).toEqual(before); expect(localStorage.getItem(storageKey)).toBe(durable); expect(writes).not.toHaveBeenCalled();
  });

  it('skips ambiguous duplicate identifiers in defaults and disables duplicates and the opposite selected ID', async () => {
    const duplicate = comparison({ id: 'duplicate', title: 'Duplicate first' });
    await mount({ ...scenario(), experiments: [duplicate, { ...duplicate, title: 'Duplicate second' }, comparison(), secondComparison()] });
    expect(selection()).toEqual(['first-original', 'second-original']);
    for (const select of host.querySelectorAll('.aq-saved-comparison select')) {
      const duplicates = [...select.options].filter(option => option.value === 'duplicate');
      expect(duplicates).toHaveLength(2);
      for (const option of duplicates) { expect(option.disabled).toBe(true); expect(option.textContent).toContain('duplicate identifier'); }
      const opposite = select.id === 'aq-saved-review-first' ? 'second-original' : 'first-original';
      expect([...select.options].find(option => option.value === opposite).disabled).toBe(true);
    }
    await change(host.querySelector('#aq-saved-review-first'), '');
    expect(findButton(review(), 'Swap selected investigations').disabled).toBe(true);
    expect(findButton(review(), 'Download comparison review').disabled).toBe(true);
    expect(host.querySelector('#aq-saved-review-status').textContent).toContain('Choose two different');
    expect(review().querySelector('.aq-saved-review-results')).toBeNull();
  });

  it('updates selector labels after a rename while retaining stable IDs, selection order and every original outcome', async () => {
    await mount({ ...scenario(), experiments: [comparison(), secondComparison()] });
    const before = clone(storedWorkspace()), ids = selection();
    await click(findButton(review(), 'Swap selected investigations'));
    const title = '  Renamed original evidence  ';
    await change(cardFor('first-original').querySelector('.aq-record-name-label input'), title);
    expect(selection()).toEqual(ids.reverse());
    for (const select of review().querySelectorAll('select')) expect([...select.options].find(option => option.value === 'first-original').textContent).toBe(title.trim());
    expect(review().querySelector('.aq-saved-review-identities').textContent).toContain(title.trim());
    const after = storedWorkspace();
    expect(after.experiments[0].title).toBe(title);
    expect({ ...after.experiments[0], title: before.experiments[0].title }).toEqual(before.experiments[0]);
    expect({ ...after, experiments: before.experiments }).toEqual(before);
    expect(rowFor(helpers.ecosystemSavedComparison(...after.experiments).rows, 'minOxygen').delta).toBe(2.864);
  });

  it('leaves a missing selection placeholder after removal and restores its exact ID and heading focus with Undo', async () => {
    const third = comparison({ id: 'third-original', title: 'Keep this alternative', savedAt: savedAt - 2000 });
    await mount({ ...scenario(), prediction: 'Keep the draft prediction.', observation: 'Keep the draft explanation.', evidence: evidence(), experiments: [comparison(), secondComparison(), third] });
    const before = clone(storedWorkspace());
    await click(findButton(cardFor('first-original'), 'Remove'));
    expect(selection()).toEqual(['', 'second-original']);
    expect(document.activeElement).toBe(host.querySelector('#aq-saved-experiments-heading'));
    expect(host.querySelector('#aq-saved-review-status').textContent).toMatch(/unavailable.*replacement.*other selection was kept/i);
    expect(findButton(review(), 'Download comparison review').disabled).toBe(true);
    expect(findButton(review(), 'Swap selected investigations').disabled).toBe(true);
    expect(storedWorkspace().experiments.map(item => item.id)).toEqual(['second-original', third.id]);
    expect({ ...storedWorkspace(), experiments: before.experiments }).toEqual(before);
    await click(findButton(host, 'Undo remove'));
    expect(selection()).toEqual(['first-original', 'second-original']);
    expect(document.activeElement).toBe(host.querySelector('#aq-saved-experiments-heading'));
    expect(storedWorkspace()).toEqual(before);
    expect(findButton(review(), 'Download comparison review').disabled).toBe(false);
  });

  it('keeps comparison review and standalone download available while preserving a full parked notebook', async () => {
    const parked = { ...scenario({ organisms: { kelp: 2 } }), prediction: 'Keep the parked prediction.', observation: 'Keep the parked explanation and its readings.', evidence: evidence(), measurements: [measurement()] };
    await mount({ ...scenario(), parkedDraft: parked, prediction: 'Keep the active prediction.', measurements: [measurement({ id: 'active-reading' })], experiments: [comparison(), secondComparison()] });
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    for (const button of host.querySelectorAll('.aq-record-actions button')) if (/^(Replay experiment|Use saved B as A)$/.test(button.textContent.trim())) expect(button.disabled).toBe(true);
    await click(findButton(review(), 'Swap selected investigations'));
    await click(findButton(review(), 'Review first saved investigation'));
    expect(document.activeElement).toBe(cardFor('second-original').querySelector('h4'));
    let downloadedBlob, downloadName;
    const createObjectURL = vi.fn(blob => { downloadedBlob = blob; return 'blob:comparison-review'; });
    const BaseURL = window.URL;
    vi.stubGlobal('URL', class extends BaseURL { static createObjectURL = createObjectURL; static revokeObjectURL = vi.fn(); });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloadName = this.download; });
    await click(findButton(review(), 'Download comparison review'));
    expect(createObjectURL).toHaveBeenCalledOnce(); expect(downloadName).toBe('aquaculture-saved-comparison-review.html');
    expect(downloadedBlob.type).toBe('text/html;charset=utf-8');
    const html = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsText(downloadedBlob); });
    const originals = parsedHtml(html).querySelectorAll('.aq-saved-review-originals .aq-archive-report');
    expect(originals[0].querySelector('h2').textContent).toBe('Second original oyster trial');
    expect(originals[1].querySelector('h2').textContent).toBe('First original oyster trial');
    expect(host.textContent).toContain('Comparison review downloaded with both original investigations.');
    expect(storedWorkspace()).toEqual(before); expect(localStorage.getItem(storageKey)).toBe(durable); expect(writes).not.toHaveBeenCalled();
  });

  it('allows a fresh branch prediction before changing B, keeps focused typing, then preserves it as original and restores the full prior draft', async () => {
    const archived = comparison();
    const draft = { ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'My prior draft prediction.', observation: 'My prior unfinished notebook explanation.', evidence: evidence(), investigationId: 'oxygen-buffer', measurements: [measurement({ id: 'prior-draft-reading' })], experiments: [archived, secondComparison()] };
    await mount(draft);
    const before = clone(storedWorkspace());
    await click(findButton(cardFor(archived.id), 'Use saved B as A'));
    const branch = storedWorkspace();
    expect(branch.baselineScenario).toEqual(before.experiments[0].currentScenario);
    expect(helpers.ecosystemChanges(branch.baselineScenario, branch)).toEqual([]);
    const field = host.querySelector('#aq-eco-prediction');
    expect(field).toBeTruthy(); expect(field.readOnly).toBe(false);
    expect(field.labels[0].textContent).toContain('Prediction / revised expectation');
    field.focus();
    const prediction = '  If oxygen changes, then I expect a different minimum because stock demand continues.  ';
    for (const value of [prediction.slice(0, 10), prediction.slice(0, 35), prediction]) {
      await change(field, value);
      expect(host.querySelector('#aq-eco-prediction')).toBe(field); expect(document.activeElement).toBe(field);
      expect(field.value).toBe(value); expect(storedWorkspace().prediction).toBe(value);
    }
    await change(host.querySelector('#aq-eco-oxygen'), '8');
    expect(host.querySelector('#aq-eco-prediction')).toBeNull();
    expect(host.querySelector('.aq-loop-prediction-record').textContent).toContain(prediction);
    expect(storedWorkspace().prediction).toBe(prediction);
    expect(storedWorkspace().experiments).toEqual(before.experiments);
    expect(storedWorkspace().parkedDraft.measurements).toEqual(before.measurements);
    expect(findButton(review(), 'Download comparison review').disabled).toBe(false);
    await click(findButton(host, 'Return to my draft'));
    expect(storedWorkspace()).toEqual(before);
    expect(storedWorkspace().experiments[0]).toEqual(before.experiments[0]);
  });
});
