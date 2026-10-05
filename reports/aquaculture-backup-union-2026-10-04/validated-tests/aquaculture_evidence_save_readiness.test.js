import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const capturedAt = Date.parse('2026-10-02T12:00:00.000Z');
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, kelp: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const blankEvidence = () => ({ claim: '', evidence: '', reasoning: '', nextTest: '' });
const evidence = () => ({ claim: '  Lower oxygen changes the modeled signal.  ', evidence: '  The saved readings show an oxygen difference.  ', reasoning: '  Oxygen demand makes the community sensitive to starting oxygen.  ', nextTest: '  Change only starting oxygen in the next run.  ' });
const workspace = (patch = {}) => ({ ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'Lower starting oxygen should change the modeled oxygen signal.', observation: '', evidence: blankEvidence(), measurements: [], experiments: [], ...patch });
const readyWorkspace = (patch = {}) => workspace({ observation: 'These modeled readings support an explanation of the oxygen response.', ...patch });
const archived = (index = 0) => ({ id: 'original-' + index, title: 'Original evidence ' + index, kind: 'snapshot', savedAt: capturedAt - index, modelVersion: '2026.09-original-evidence', currentScenario: scenario(), observation: 'This original evidence record must not be rewritten.', evidence: { claim: 'Original claim.', evidence: 'Original evidence.', reasoning: 'Original reasoning.', nextTest: '' }, status: 'Watch', oxygen: 5.25 });
const clone = value => JSON.parse(JSON.stringify(value));
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}
const findButton = (host, label) => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === label);
const reasonKeys = readiness => readiness.reasons.map(reason => reason.key);
const parsedHtml = html => new DOMParser().parseFromString(html, 'text/html');

describe('Aquaculture evidence save readiness', () => {
  let host, root, config, helpers;

  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, '', '/'); resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    helpers = window.AquacultureLearningHelpers;
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks();
  });

  async function mount(seed = workspace()) {
    if (root) { await act(async () => root.unmount()); root = null; resetStemLab(); config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab'); }
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: seed }));
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    const stored = JSON.parse(localStorage.getItem(storageKey));
    stored.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(stored.ecosystemWorkspace);
    localStorage.setItem(storageKey, JSON.stringify(stored));
  }

  async function remount() {
    await act(async () => root.unmount()); root = null; resetStemLab();
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
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
  const readinessCard = () => host.querySelector('.aq-save-readiness');
  const annual = (source = workspace(), id = 'current-reading') => helpers.ecosystemMeasurement(source, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, capturedAt, id);
  const assertFocus = id => { const target = host.querySelector('#' + id); expect(target).toBeTruthy(); expect(document.activeElement).toBe(target); for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') expect(parent.open).toBe(true); };

  it('uses the sanitized trimmed reflection boundary and preserves freeform writing even with incomplete CER', async () => {
    await mount();
    for (const length of [0, 19, 20]) {
      const result = helpers.ecosystemSaveReadiness(workspace({ observation: ' \n' + 'x'.repeat(length) + '\n ', evidence: { claim: 'Only a claim.', evidence: '', reasoning: '', nextTest: '' } }));
      expect(result.writing.observationLength).toBe(length);
      expect(result.writing.reflectionReady).toBe(length >= 20);
      expect(result.writing.structuredReady).toBe(false);
      expect(result.writing.ready).toBe(length >= 20);
      expect(result.snapshot.ready).toBe(length >= 20);
      expect(result.comparison.ready).toBe(length >= 20);
    }
    const bounded = helpers.ecosystemSaveReadiness(workspace({ observation: 'x'.repeat(900) }));
    expect(bounded.writing.observationLength).toBe(600);
    expect(() => helpers.ecosystemSaveReadiness(null)).not.toThrow();
  });

  it('requires nonblank Claim, Evidence and Reasoning with a combined twenty characters, excluding Next test', async () => {
    await mount();
    const twenty = { claim: '  ccccccc  ', evidence: '\neeeeeee\n', reasoning: ' rrrrrr ', nextTest: '' };
    const ready = helpers.ecosystemSaveReadiness(workspace({ evidence: twenty }));
    expect(ready.writing).toMatchObject({ ready: true, reflectionReady: false, structuredReady: true, observationLength: 0, structuredLength: 20, missingFields: [] });
    expect(ready.snapshot.ready).toBe(true); expect(ready.comparison.ready).toBe(true);
    const variants = [
      { ...twenty, reasoning: 'rrrrr', nextTest: 'N'.repeat(500) },
      { claim: 'A complete and long claim.', evidence: '  ', reasoning: 'A complete and long mechanism.', nextTest: 'N'.repeat(500) },
      { claim: '', evidence: '', reasoning: '', nextTest: 'N'.repeat(500) }
    ];
    for (const variant of variants) {
      const result = helpers.ecosystemSaveReadiness(workspace({ evidence: variant }));
      expect(result.writing.structuredReady).toBe(false); expect(result.writing.ready).toBe(false);
      expect(reasonKeys(result.snapshot)).toContain('writing'); expect(reasonKeys(result.comparison)).toContain('writing');
    }
    const missing = helpers.ecosystemSaveReadiness(workspace()).writing.missingFields;
    expect(missing).toEqual([
      { key: 'claim', label: 'Claim', target: 'aq-eco-evidence-claim' },
      { key: 'evidence', label: 'Evidence', target: 'aq-eco-evidence-evidence' },
      { key: 'reasoning', label: 'Reasoning', target: 'aq-eco-evidence-reasoning' }
    ]);
  });

  it('keeps snapshot stock, comparison baseline and unchanged settings as distinct actionable reasons', async () => {
    await mount();
    const empty = helpers.ecosystemSaveReadiness(workspace({ organisms: {}, baselineScenario: null }));
    expect(empty.snapshot.ready).toBe(false); expect(empty.comparison.ready).toBe(false);
    expect(empty.snapshot.reasons).toEqual(expect.arrayContaining([{ key: 'stock', text: expect.any(String), target: 'aq-eco-organisms-heading' }, { key: 'writing', text: expect.any(String), target: 'aq-eco-observation' }]));
    expect(empty.comparison.reasons).toContainEqual({ key: 'baseline', text: expect.any(String), target: 'aq-eco-time-heading' });
    const unchanged = helpers.ecosystemSaveReadiness(readyWorkspace({ baselineScenario: scenario() }));
    expect(unchanged.snapshot.ready).toBe(true); expect(unchanged.comparison.ready).toBe(false);
    expect(unchanged.comparison.reasons).toContainEqual({ key: 'unchanged', text: expect.any(String), target: 'aq-eco-oxygen' });
    const withoutA = helpers.ecosystemSaveReadiness(readyWorkspace({ baselineScenario: null }));
    expect(withoutA.snapshot.ready).toBe(true); expect(reasonKeys(withoutA.comparison)).toContain('baseline');
    expect(reasonKeys(withoutA.comparison)).not.toContain('stock');
  });

  it('rejects incomplete, inherited and explicitly unrecorded A provenance instead of filling its missing inputs', async () => {
    await mount();
    const complete = scenario({ water: { ...water, oxygen: 9 } });
    const incomplete = ['environmentId', 'organisms', 'disturbanceId'].map(key => { const partial = clone(complete); delete partial[key]; return partial; });
    for (const key of Object.keys(water)) { const partial = clone(complete); delete partial.water[key]; incomplete.push(partial); }
    incomplete.push({ ...complete, water: { ...water, oxygen: NaN } });
    incomplete.push(Object.assign(Object.create({ environmentId: complete.environmentId }), { organisms: { ...complete.organisms }, water: { ...complete.water }, disturbanceId: complete.disturbanceId }));
    const inheritedWater = { ...complete.water }; delete inheritedWater.oxygen;
    incomplete.push({ ...complete, water: Object.assign(Object.create({ oxygen: 9 }), inheritedWater) });
    for (const partial of incomplete) {
      const result = helpers.ecosystemSaveReadiness(readyWorkspace({ baselineScenario: partial }));
      expect(result.snapshot.ready).toBe(true); expect(result.comparison.ready).toBe(false);
      expect(reasonKeys(result.comparison)).toContain('baseline');
    }
    const marked = readyWorkspace({ baselineScenario: complete, baselineScenarioRecorded: false });
    expect(reasonKeys(helpers.ecosystemSaveReadiness(marked).comparison)).toContain('baseline');
    expect(helpers.sanitizeEcosystemWorkspace(marked).baselineScenario).toBeNull();
    expect(helpers.ecosystemSaveReadiness(readyWorkspace({ baselineScenario: complete })).comparison.ready).toBe(true);
  });

  it('recognizes precise input changes and deliberately empty B without using wording as a scenario change', async () => {
    await mount();
    const same = scenario();
    const precise = readyWorkspace({ baselineScenario: same, water: { ...water, ammonia: water.ammonia + .0000001 } });
    expect(helpers.ecosystemSaveReadiness(precise).comparison.ready).toBe(true);
    const emptyB = helpers.ecosystemSaveReadiness(readyWorkspace({ organisms: {} }));
    expect(emptyB.snapshot.ready).toBe(false); expect(emptyB.comparison.ready).toBe(true);
    expect(reasonKeys(emptyB.comparison)).not.toContain('stock');
    const wording = helpers.ecosystemSaveReadiness(readyWorkspace({ baselineScenario: same, prediction: 'A completely different prediction.', evidence: evidence(), investigationId: 'oxygen-buffer' }));
    expect(wording.comparison.ready).toBe(false); expect(reasonKeys(wording.comparison)).toContain('unchanged');
  });

  it('caps both save paths at twelve records and derives detached readiness without mutating frozen learner work', async () => {
    await mount();
    const eleven = readyWorkspace({ evidence: evidence(), measurements: [annual()], experiments: Array.from({ length: 11 }, (_, index) => archived(index)) });
    expect(helpers.ecosystemSaveReadiness(eleven).snapshot.ready).toBe(true);
    expect(helpers.ecosystemSaveReadiness(eleven).comparison.ready).toBe(true);
    const source = deepFreeze({ ...eleven, experiments: [...eleven.experiments, archived(11)] });
    const original = JSON.stringify(source), result = helpers.ecosystemSaveReadiness(source);
    for (const save of [result.snapshot, result.comparison]) {
      expect(save.ready).toBe(false);
      expect(save.reasons).toContainEqual({ key: 'capacity', text: expect.any(String), target: 'aq-saved-experiments-heading' });
    }
    result.snapshot.reasons[0].text = 'Caller modified its own result.';
    result.writing.missingFields.push({ key: 'invented', label: 'Invented', target: 'invented' });
    expect(JSON.stringify(source)).toBe(original);
    const next = helpers.ecosystemSaveReadiness(source);
    expect(next.snapshot.reasons[0].text).not.toBe('Caller modified its own result.');
    expect(next.writing.missingFields.some(field => field.key === 'invented')).toBe(false);
  });

  it('counts current, earlier A, earlier B and earlier model captures in disjoint groups without blocking save', async () => {
    await mount();
    const current = annual(workspace(), 'current'), earlierA = annual(workspace({ baselineScenario: scenario({ water: { ...water, oxygen: 10 } }) }), 'earlier-a');
    const earlierB = annual(workspace({ water: { ...water, oxygen: 6 } }), 'earlier-b');
    const earlierModel = { ...clone(earlierB), id: 'earlier-model', modelVersion: '2026.09-frozen-reading' };
    const source = deepFreeze(readyWorkspace({ measurements: [current, earlierA, earlierB, earlierModel, { id: 'invalid-reading' }] })), original = JSON.stringify(source);
    const result = helpers.ecosystemSaveReadiness(source);
    expect(result.captures).toEqual({ total: 4, current: 1, earlierSettings: 2, earlierModel: 1, unavailable: 0 });
    expect(result.captures.current + result.captures.earlierSettings + result.captures.earlierModel + result.captures.unavailable).toBe(result.captures.total);
    expect(result.snapshot.ready).toBe(true); expect(result.comparison.ready).toBe(true);
    expect(JSON.stringify(source)).toBe(original);
    const partial = readyWorkspace({ measurements: [current] }); delete partial.water.oxygen;
    expect(helpers.ecosystemSaveReadiness(partial).captures).toEqual({ total: 1, current: 0, earlierSettings: 0, earlierModel: 0, unavailable: 1 });
  });

  it('updates both save buttons at reflection zero, nineteen and twenty, with distinct described readiness reasons', async () => {
    await mount();
    const snapshot = findButton(host, 'Save snapshot evidence'), comparison = findButton(host, 'Save A/B comparison');
    expect(readinessCard()).toBeTruthy();
    expect(readinessCard().getAttribute('aria-labelledby')).toBe('aq-save-readiness-heading');
    for (const [button, id] of [[snapshot, 'aq-eco-snapshot-readiness'], [comparison, 'aq-eco-comparison-readiness']]) {
      const ids = button.getAttribute('aria-describedby').split(/\s+/);
      expect(ids).toContain(id); expect(ids).toContain('aq-eco-save-status');
      for (const reference of ids) expect(host.querySelector('#' + reference)).toBeTruthy();
      expect(host.querySelector('#' + id).textContent.trim()).toBeTruthy();
    }
    expect(snapshot.disabled).toBe(true); expect(comparison.disabled).toBe(true);
    await change(host.querySelector('#aq-eco-observation'), ' ' + 'x'.repeat(19) + ' ');
    expect(snapshot.disabled).toBe(true); expect(comparison.disabled).toBe(true);
    await change(host.querySelector('#aq-eco-observation'), ' ' + 'x'.repeat(20) + ' ');
    expect(snapshot.disabled).toBe(false); expect(comparison.disabled).toBe(false);
    await change(host.querySelector('#aq-eco-evidence-claim'), 'An incomplete claim can accompany the freeform reflection.');
    expect(snapshot.disabled).toBe(false); expect(comparison.disabled).toBe(false);
    await change(host.querySelector('#aq-eco-observation'), '');
    expect(snapshot.disabled).toBe(true); expect(comparison.disabled).toBe(true);
  });

  it('offers native writing navigation, focuses the first missing CER field and opens its disclosure', async () => {
    await mount(workspace({ evidence: { ...blankEvidence(), nextTest: 'N'.repeat(500) } }));
    const reflection = findButton(readinessCard(), 'Write a reflection');
    expect(reflection.tagName).toBe('BUTTON'); expect(reflection.type).toBe('button');
    await click(reflection); assertFocus('aq-eco-observation');
    for (const [key, value, target] of [['claim', 'ccccccc', 'aq-eco-evidence-evidence'], ['evidence', 'eeeeeee', 'aq-eco-evidence-reasoning'], ['reasoning', 'rrrrrr', 'aq-eco-evidence-claim']]) {
      const edit = findButton(readinessCard(), 'Edit structured explanation');
      expect(edit.tagName).toBe('BUTTON'); expect(edit.type).toBe('button');
      if (key === 'claim') { await click(edit); assertFocus('aq-eco-evidence-claim'); }
      await change(host.querySelector('#aq-eco-evidence-' + key), value);
      host.querySelector('.aq-structured-evidence').open = false;
      await click(findButton(readinessCard(), 'Edit structured explanation')); assertFocus(target);
    }
    expect(findButton(host, 'Save snapshot evidence').disabled).toBe(false);
    expect(findButton(host, 'Save A/B comparison').disabled).toBe(false);
    expect(host.querySelector('#aq-eco-observation').value).toBe('');
    await change(host.querySelector('#aq-eco-evidence-reasoning'), 'rrrrr');
    expect(findButton(host, 'Save snapshot evidence').disabled).toBe(true);
    expect(findButton(host, 'Save A/B comparison').disabled).toBe(true);
  });

  it('focuses stock, baseline, changed input and saved records from the corresponding prerequisite buttons', async () => {
    const cases = [
      { seed: readyWorkspace({ organisms: {} }), label: 'Choose organisms', target: 'aq-eco-organisms-heading' },
      { seed: readyWorkspace({ baselineScenario: null }), label: 'Set up scenario A', target: 'aq-eco-time-heading' },
      { seed: readyWorkspace({ baselineScenario: scenario() }), label: 'Change starting oxygen', target: 'aq-eco-oxygen' },
      { seed: readyWorkspace({ experiments: Array.from({ length: 12 }, (_, index) => archived(index)) }), label: 'Review saved investigations', target: 'aq-saved-experiments-heading' }
    ];
    for (const item of cases) {
      await mount(item.seed);
      const before = clone(storedWorkspace()), action = findButton(readinessCard(), item.label);
      expect(action.tagName).toBe('BUTTON'); expect(action.type).toBe('button');
      await click(action); assertFocus(item.target);
      expect(storedWorkspace()).toEqual(before);
      if (item.label === 'Review saved investigations') {
        expect(findButton(host, 'Save snapshot evidence').disabled).toBe(true);
        expect(findButton(host, 'Save A/B comparison').disabled).toBe(true);
        await act(async () => { findButton(host, 'Save A/B comparison').click(); });
        expect(storedWorkspace()).toEqual(before);
      }
    }
  });

  it('saves structured-only snapshot evidence exactly, clears committed writing and preserves captures and original records', async () => {
    const note = annual(workspace()), seed = workspace({ baselineScenario: null, evidence: evidence(), measurements: [note], experiments: [archived()] });
    await mount(seed);
    const before = clone(storedWorkspace()), model = helpers.calculateEcosystem(before);
    await click(findButton(host, 'Save snapshot evidence'));
    const after = storedWorkspace(), record = clone(after.experiments[0]);
    expect(record.kind).toBe('snapshot'); expect(record.observation).toBe(''); expect(record.evidence).toEqual(before.evidence);
    expect(record.measurements).toEqual(before.measurements); expect(after.measurements).toEqual(before.measurements);
    expect(after.experiments.slice(1)).toEqual(before.experiments);
    expect(record.modelVersion).toBe('2026.10-stock-feedback'); expect(record.modelVersion).toBe(helpers.ecosystemModelVersion);
    expect(record.currentScenarioRecorded).toBe(true); expect(record.statusRecorded).toBe(true); expect(record.status).toBe(model.status);
    expect([...record.snapshotFields].sort()).toEqual(['ammonia', 'carryingPressure', 'oxygen', 'resilience']);
    for (const key of record.snapshotFields) expect(record[key]).toBe(model[key]);
    expect(record.currentScenario).toEqual(scenario());
    expect(after.observation).toBe(''); expect(after.evidence).toEqual(blankEvidence());
    assertFocus('aq-saved-experiments-heading');
    const report = parsedHtml(helpers.ecosystemExperimentHtml(record));
    for (const text of Object.values(before.evidence)) expect(report.body.textContent).toContain(text.trim());
    expect(report.body.textContent).toContain(record.modelVersion); expect(report.body.textContent).toContain(record.oxygen + ' mg/L');
    await remount(); expect(storedWorkspace().experiments[0]).toEqual(record); expect(storedWorkspace().measurements).toEqual(before.measurements);
  });

  it('round-trips structured-only comparison evidence, exact A/B results, metadata and frozen measurements', async () => {
    const notes = [annual(workspace())];
    await mount(workspace({ evidence: evidence(), measurements: notes, experiments: [archived()] }));
    const before = clone(storedWorkspace()), aRun = helpers.simulateEcosystemYear(before.baselineScenario), bRun = helpers.simulateEcosystemYear(before);
    await click(findButton(host, 'Save A/B comparison'));
    const after = storedWorkspace(), record = clone(after.experiments[0]);
    expect(record).toMatchObject({ kind: 'comparison', observation: '', evidence: before.evidence, measurements: before.measurements, baselineScenario: before.baselineScenario, currentScenario: scenario(), baselineScenarioRecorded: true, currentScenarioRecorded: true, modelVersion: '2026.10-stock-feedback', prediction: before.prediction });
    expect(record.baselineSummary).toEqual(aRun.summary); expect(record.currentSummary).toEqual(bRun.summary);
    expect(Number.isFinite(record.savedAt)).toBe(true); expect(record.savedAt).toBeGreaterThan(0);
    expect(after.evidence).toEqual(blankEvidence()); expect(after.observation).toBe(''); expect(after.measurements).toEqual(before.measurements);
    expect(after.experiments.slice(1)).toEqual(before.experiments); assertFocus('aq-saved-experiments-heading');
    const portfolio = helpers.buildLearningPortfolio({ ecosystemWorkspace: after }, [], []);
    const merged = helpers.mergeLearningPortfolio({}, clone(portfolio), []);
    expect(merged.ecosystemWorkspace.experiments).toEqual(after.experiments);
    const report = parsedHtml(helpers.ecosystemExperimentHtml(record));
    for (const text of Object.values(before.evidence)) expect(report.body.textContent).toContain(text.trim());
    expect(report.body.textContent).toContain(aRun.summary.minOxygen + ' mg/L'); expect(report.body.textContent).toContain(bRun.summary.minOxygen + ' mg/L');
    await remount(); expect(storedWorkspace().experiments[0]).toEqual(record); expect(storedWorkspace().evidence).toEqual(blankEvidence());
  });

  it('previews mixed capture freshness accessibly and saves earlier readings without changing their values or writing', async () => {
    const notes = [annual(workspace(), 'current'), annual(workspace({ baselineScenario: scenario({ water: { ...water, oxygen: 10 } }) }), 'earlier-a'), annual(workspace({ water: { ...water, oxygen: 6 } }), 'earlier-b')];
    notes.push({ ...clone(notes[2]), id: 'earlier-model', modelVersion: '2026.09-frozen-reading', a: 4.1234, b: 5.6789 });
    await mount(workspace({ evidence: evidence(), measurements: notes }));
    const before = clone(storedWorkspace()), summary = host.querySelector('#aq-eco-capture-summary');
    expect(summary).toBeTruthy();
    for (const text of ['Matches current settings: 1', 'Earlier settings: 2', 'Earlier model: 1', 'Settings unavailable: 0']) expect(summary.textContent).toContain(text);
    for (const label of ['Save snapshot evidence', 'Save A/B comparison']) {
      const save = findButton(host, label); expect(save.disabled).toBe(false);
      expect(save.getAttribute('aria-describedby').split(/\s+/)).toContain(summary.id);
    }
    const notebook = host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)'); notebook.open = false;
    const review = findButton(readinessCard(), 'Review captured readings');
    expect(review.tagName).toBe('BUTTON'); expect(review.type).toBe('button');
    await click(review); assertFocus('aq-measurement-notebook-heading'); expect(notebook.open).toBe(true);
    expect(storedWorkspace()).toEqual(before);
    await click(findButton(host, 'Save A/B comparison'));
    expect(storedWorkspace().experiments[0].measurements).toEqual(before.measurements);
    expect(storedWorkspace().experiments[0].evidence).toEqual(before.evidence);
    expect(storedWorkspace().measurements).toEqual(before.measurements);
  });

  it('saves an intentionally empty B comparison while snapshot saving still requires an organism', async () => {
    await mount(workspace({ organisms: {}, evidence: evidence() }));
    expect(findButton(host, 'Save snapshot evidence').disabled).toBe(true);
    expect(findButton(host, 'Save A/B comparison').disabled).toBe(false);
    const before = clone(storedWorkspace()), run = helpers.simulateEcosystemYear(before);
    await click(findButton(host, 'Save A/B comparison'));
    const record = storedWorkspace().experiments[0];
    expect(record.currentScenario.organisms).toEqual({}); expect(record.baselineScenario).toEqual(before.baselineScenario);
    expect(record.currentSummary).toEqual(run.summary); expect(record.currentSummary.hasCrop).toBe(false);
    expect(record.evidence).toEqual(before.evidence); expect(record.observation).toBe('');
    expect(record.baselineScenarioRecorded).toBe(true); expect(record.currentScenarioRecorded).toBe(true);
  });

  it('keeps complete structured writing and captures on device failure and commits that same evidence after retry', async () => {
    await mount(workspace({ evidence: evidence(), measurements: [annual()], experiments: [archived()] }));
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), originalSetItem = Storage.prototype.setItem;
    let unavailable = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === storageKey && unavailable) throw new DOMException('Device quota exceeded', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    });
    await click(findButton(host, 'Save A/B comparison'));
    expect(localStorage.getItem(storageKey)).toBe(durable); expect(host.querySelector('.aq-storage-recovery')).toBeTruthy();
    for (const [key, text] of Object.entries(before.evidence)) expect(host.querySelector('#aq-eco-evidence-' + key).value).toBe(text);
    expect(host.querySelector('#aq-eco-observation').value).toBe(''); expect(storedWorkspace()).toEqual(before);
    unavailable = false; await click(findButton(host, 'Retry device save')); await click(findButton(host, 'Save A/B comparison'));
    const after = storedWorkspace();
    expect(after.experiments[0].evidence).toEqual(before.evidence); expect(after.experiments[0].measurements).toEqual(before.measurements);
    expect(after.experiments.slice(1)).toEqual(before.experiments); expect(after.evidence).toEqual(blankEvidence());
  });
});
