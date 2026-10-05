import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const capturedAt = Date.parse('2026-10-02T12:00:00.000Z');
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, kelp: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const comparison = (patch = {}) => ({ ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'Lower starting oxygen should change the oxygen signal.', observation: 'I will compare these model readings with the original prediction and explain the mechanism.', evidence: { claim: 'My original claim.', evidence: 'My own earlier evidence.', reasoning: 'My original reasoning.', nextTest: 'Change one input next.' }, ...patch });
const blankEvidence = () => ({ claim: '', evidence: '', reasoning: '', nextTest: '' });
const clone = value => JSON.parse(JSON.stringify(value));
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}
const findButton = (host, label) => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === label);

describe('Aquaculture frozen measurement notebook', () => {
  let host, root, helpers;

  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, '', '/'); resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks();
  });

  async function mount(workspace = comparison()) {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: workspace }));
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    const seed = JSON.parse(localStorage.getItem(storageKey));
    seed.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(seed.ecosystemWorkspace);
    localStorage.setItem(storageKey, JSON.stringify(seed));
  }

  async function remount() {
    await act(async () => root.unmount()); root = null; resetStemLab();
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(() => config.render(makeCtx({ React })))));
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
  const annual = (workspace, metricId = 'minOxygen', id = 'measurement-annual') => helpers.ecosystemMeasurement(workspace, { scope: 'annual', metricId, speciesId: 'system' }, capturedAt, id);
  const monthly = (workspace, metricId = 'biomass', speciesId = 'oyster', month = 6, id = 'measurement-month') => helpers.ecosystemMeasurement(workspace, { scope: 'month', metricId, speciesId, month }, capturedAt, id);

  it('captures all annual outcomes exactly and detaches original A/B settings from a pure source', async () => {
    await mount();
    const workspace = deepFreeze(comparison()), original = JSON.stringify(workspace);
    const a = helpers.simulateEcosystemYear(workspace.baselineScenario), b = helpers.simulateEcosystemYear(workspace);
    for (const metricId of ['endingBiomass', 'survival', 'minOxygen', 'peakAmmonia', 'averageResilience', 'riskMonths', 'harvestUnits', 'operatingEffort']) {
      const note = annual(workspace, metricId, 'annual-' + metricId);
      expect(note).toMatchObject({ id: 'annual-' + metricId, capturedAt, modelVersion: helpers.ecosystemModelVersion, scope: 'annual', speciesId: 'system', metricId, aState: 'recorded', bState: 'recorded', a: a.summary[metricId], b: b.summary[metricId] });
      expect(note.baselineScenario).toEqual(workspace.baselineScenario);
      expect(note.currentScenario.water).toEqual(workspace.water);
      expect(note.currentScenario.water).not.toBe(workspace.water);
      expect(note.baselineScenario.water).not.toBe(workspace.baselineScenario.water);
    }
    expect(JSON.stringify(workspace)).toBe(original);
    const mutable = comparison(), note = annual(mutable), before = clone(note);
    mutable.water.oxygen = 3; mutable.organisms.oyster = 5; mutable.baselineScenario.water.oxygen = 4;
    expect(note).toEqual(before);
  });

  it('captures the selected month and species without replacing a shared water reading with species data', async () => {
    await mount();
    const workspace = comparison(), a = helpers.simulateEcosystemYear(workspace.baselineScenario), b = helpers.simulateEcosystemYear(workspace);
    const note = monthly(workspace);
    expect(note).toMatchObject({ scope: 'month', month: 6, speciesId: 'oyster', metricId: 'biomass', aState: 'recorded', bState: 'recorded' });
    expect(note.a).toBe(a.timeline[6].species.find(item => item.id === 'oyster').biomass);
    expect(note.b).toBe(b.timeline[6].species.find(item => item.id === 'oyster').biomass);
    expect(note.b).not.toBe(b.timeline[6].biomass);
    for (const metricId of ['survival', 'stress', 'progress']) {
      const speciesNote = monthly(workspace, metricId);
      expect(speciesNote.a).toBe(a.timeline[6].species.find(item => item.id === 'oyster')[metricId]);
      expect(speciesNote.b).toBe(b.timeline[6].species.find(item => item.id === 'oyster')[metricId]);
    }
    const shared = monthly(workspace, 'oxygen', 'kelp');
    expect(shared.speciesId).toBe('system');
    expect(shared.a).toBe(a.timeline[6].oxygen);
    expect(shared.b).toBe(b.timeline[6].oxygen);
    expect(helpers.ecosystemMeasurementText(shared)).toContain('mg/L');
    for (const metricId of ['temperature', 'carryingPressure', 'resilience', 'effort']) {
      const systemNote = monthly(workspace, metricId, 'kelp');
      expect(systemNote.speciesId).toBe('system');
      expect(systemNote.a).toBe(a.timeline[6][metricId]);
      expect(systemNote.b).toBe(b.timeline[6][metricId]);
      if (metricId === 'carryingPressure') expect(helpers.ecosystemMeasurementText(systemNote)).toMatch(/index points \(B minus A\)/);
    }
    const annualShared = helpers.ecosystemMeasurement(workspace, { scope: 'annual', metricId: 'endingBiomass', speciesId: 'oyster' }, capturedAt, 'annual-shared');
    expect(annualShared.speciesId).toBe('system');
    expect(annualShared.b).toBe(b.summary.endingBiomass);
  });

  it('distinguishes no baseline, absent species and inapplicable crop survival from recorded zero', async () => {
    await mount();
    const withoutA = annual(scenario());
    expect(withoutA.aState).toBe('no-baseline'); expect(withoutA.a).toBeNull(); expect(withoutA.baselineScenario).toBeNull();
    const absentB = monthly(comparison({ organisms: { mussel: 1 } }));
    expect(absentB.aState).toBe('recorded'); expect(absentB.bState).toBe('not-stocked'); expect(absentB.b).toBeNull();
    expect(helpers.ecosystemMeasurementText(absentB)).toMatch(/not stocked/i);
    const supportOnly = scenario({ organisms: { phytoplankton: 1 } });
    expect(annual(supportOnly, 'survival')).toBeNull();
    const oneCropSide = annual({ ...supportOnly, baselineScenario: scenario() }, 'survival');
    expect(oneCropSide.aState).toBe('recorded'); expect(oneCropSide.bState).toBe('not-applicable'); expect(oneCropSide.b).toBeNull();
    for (const metricId of ['biomass', 'survival', 'progress']) expect(monthly(comparison(), metricId, 'phytoplankton')).toBeNull();
    const supportStress = monthly(comparison(), 'stress', 'phytoplankton');
    expect(Number.isFinite(supportStress.b)).toBe(true);
    expect(helpers.ecosystemMeasurementText(supportStress)).toContain('Reference-band stress');
    const note = annual(comparison(), 'minOxygen'), zero = { ...note, a: 0, b: 0 };
    const clean = helpers.sanitizeEcosystemMeasurements([zero]);
    expect(clean).toHaveLength(1); expect(clean[0].a).toBe(0); expect(clean[0].b).toBe(0);
    expect(helpers.ecosystemMeasurementText(clean[0])).toContain('0 mg/L');
  });

  it('bounds imported readings and rejects missing numbers, unsupported metrics and incomplete provenance', async () => {
    await mount();
    const note = annual(comparison()), month = monthly(comparison());
    const missingValue = { ...note }; delete missingValue.b;
    const malformed = [missingValue, { ...note, a: NaN }, { ...note, b: Infinity }, { ...note, currentScenario: {} }, { ...note, baselineScenario: {} }, { ...note, metricId: 'inventedMetric' }, { ...month, speciesId: 'inventedSpecies' }, { ...month, month: 12 }];
    for (const candidate of malformed) expect(helpers.sanitizeEcosystemMeasurements([candidate])).toEqual([]);
    const notes = Array.from({ length: 9 }, (_, index) => ({ ...clone(note), id: 'bounded-' + index, capturedAt: capturedAt + index }));
    expect(helpers.sanitizeEcosystemMeasurements(notes).map(item => item.id)).toEqual(notes.slice(0, 8).map(item => item.id));
    const original = JSON.stringify(notes);
    helpers.sanitizeEcosystemMeasurements(deepFreeze(notes));
    expect(JSON.stringify(notes)).toBe(original);
    expect(helpers.sanitizeEcosystemWorkspace(scenario()).measurements).toEqual([]);
    const missingBaseline = comparison({ baselineScenario: {} });
    const imported = helpers.sanitizeEcosystemWorkspace({ ...missingBaseline, parkedDraft: { ...scenario(), baselineScenario: {} } });
    expect(imported.baselineScenario).toBeNull(); expect(imported.parkedDraft.baselineScenario).toBeNull();
    const captured = annual(missingBaseline);
    expect(captured.aState).toBe('no-baseline'); expect(captured.a).toBeNull(); expect(captured.baselineScenario).toBeNull();
    expect(captured.bState).toBe('recorded'); expect(Number.isFinite(captured.b)).toBe(true);
  });

  it('updates freshness for relevant A/B settings and model rules while keeping the recorded values frozen', async () => {
    await mount();
    const workspace = comparison(), note = deepFreeze(annual(workspace)), original = JSON.stringify(note);
    expect(helpers.ecosystemMeasurementStatus(note, workspace).current).toBe(true);
    const variants = [
      { ...workspace, environmentId: 'raceway' }, { ...workspace, organisms: { ...workspace.organisms, oyster: 3 } }, { ...workspace, disturbanceId: 'none' },
      ...Object.keys(water).map(key => ({ ...workspace, water: { ...workspace.water, [key]: workspace.water[key] + (key === 'ammonia' ? .1 : 1) } })),
      { ...workspace, baselineScenario: null },
      { ...workspace, baselineScenario: { ...workspace.baselineScenario, water: { ...workspace.baselineScenario.water, oxygen: 8 } } },
      { ...workspace, baselineScenario: { ...workspace.baselineScenario, organisms: { ...workspace.baselineScenario.organisms, oyster: 3 } } },
      { ...workspace, baselineScenario: { ...workspace.baselineScenario, environmentId: 'raceway' } },
      { ...workspace, baselineScenario: { ...workspace.baselineScenario, disturbanceId: 'none' } }
    ];
    for (const changed of variants) {
      const status = helpers.ecosystemMeasurementStatus(note, changed);
      expect(status.current).toBe(false); expect(status.label).toBeTruthy();
    }
    expect(helpers.ecosystemMeasurementStatus(note, workspace, 'different-model').current).toBe(false);
    expect(helpers.ecosystemMeasurementStatus(note, { ...workspace, observation: 'New explanation.', prediction: 'New wording.', evidence: { ...workspace.evidence, claim: 'New claim.' } }).current).toBe(true);
    expect(helpers.ecosystemMeasurementStatus(note, clone(workspace)).current).toBe(true);
    expect(JSON.stringify(note)).toBe(original);
  });

  it('appends one factual dated citation to Evidence without overwriting other CER fields', async () => {
    await mount();
    const workspace = comparison(), note = deepFreeze(annual(workspace)), evidence = deepFreeze({ ...workspace.evidence }), original = JSON.stringify(evidence);
    const citation = helpers.ecosystemMeasurementText(note);
    expect(citation).toContain(note.modelVersion); expect(citation).toContain('mg/L');
    expect(citation).toMatch(/2026-10-02|10\/2\/2026|Oct(?:ober)?\D+2/);
    expect(citation).toContain(String(note.a)); expect(citation).toContain(String(note.b));
    const appended = helpers.appendEcosystemMeasurementEvidence(evidence, note, workspace);
    expect(appended.ok).toBe(true); expect(appended.citation).toBe(citation);
    expect(appended.evidence.evidence).toContain(evidence.evidence); expect(appended.evidence.evidence).toContain(citation);
    for (const field of ['claim', 'reasoning', 'nextTest']) expect(appended.evidence[field]).toBe(evidence[field]);
    expect(JSON.stringify(evidence)).toBe(original);
    expect(helpers.appendEcosystemMeasurementEvidence(appended.evidence, note, workspace)).toMatchObject({ ok: false, evidence: appended.evidence });
    const full = { ...workspace.evidence, evidence: 'X'.repeat(500) };
    expect(helpers.appendEcosystemMeasurementEvidence(full, note, workspace)).toMatchObject({ ok: false, evidence: full });
    const exactFit = { ...workspace.evidence, evidence: 'X'.repeat(500 - citation.length - 1) };
    const fitted = helpers.appendEcosystemMeasurementEvidence(exactFit, note, workspace);
    expect(fitted.ok).toBe(true); expect(fitted.evidence.evidence).toHaveLength(500); expect(fitted.evidence.evidence.endsWith(citation)).toBe(true);
    const overflow = { ...exactFit, evidence: exactFit.evidence + 'X' };
    expect(helpers.appendEcosystemMeasurementEvidence(overflow, note, workspace)).toMatchObject({ ok: false, evidence: overflow });
    const stale = helpers.appendEcosystemMeasurementEvidence(evidence, note, { ...workspace, water: { ...water, oxygen: 3 } });
    expect(stale.ok).toBe(true); expect(stale.citation).toMatch(/^Earlier settings/);
    expect(stale.evidence.evidence).toContain(stale.citation);
    expect(stale.citation).toContain(citation);
    const earlierModel = helpers.appendEcosystemMeasurementEvidence(evidence, { ...note, modelVersion: '2026.09-frozen-reading' }, workspace);
    expect(earlierModel.ok).toBe(true); expect(earlierModel.citation).toMatch(/^Earlier model/);
  });

  it('records the chosen annual outcome accessibly and opens the notebook without changing the learner explanation', async () => {
    await mount();
    const before = clone(storedWorkspace()), expected = helpers.simulateEcosystemYear(before);
    await change(host.querySelector('#aq-measurement-annual-metric'), 'peakAmmonia');
    await click(findButton(host, 'Record annual result'));
    const saved = storedWorkspace();
    expect(saved.measurements).toHaveLength(1);
    expect(saved.measurements[0]).toMatchObject({ scope: 'annual', metricId: 'peakAmmonia', b: expected.summary.peakAmmonia });
    const notebook = host.querySelector('.aq-measurement-notebook');
    expect(notebook.open).toBe(true); expect(notebook.textContent).toMatch(/1\s*\/\s*8/);
    expect(notebook.querySelector('button[aria-label]')).toBeTruthy();
    expect(saved.evidence).toEqual(before.evidence); expect(saved.observation).toBe(before.observation);
  });

  it('records the inspected species metric and month rather than the initial default selection', async () => {
    await mount();
    await change(host.querySelector('#aq-season-species'), 'kelp');
    await change(host.querySelector('#aq-season-metric'), 'biomass');
    await click([...host.querySelectorAll('.aq-season-months button')].find(button => /^Inspect Jul,/.test(button.getAttribute('aria-label'))));
    const expected = helpers.simulateEcosystemYear(storedWorkspace()).timeline[6].species.find(item => item.id === 'kelp').biomass;
    await click(findButton(host, 'Record inspected result'));
    expect(storedWorkspace().measurements[0]).toMatchObject({ scope: 'month', month: 6, speciesId: 'kelp', metricId: 'biomass', b: expected });
  });

  it('guards duplicate and full captures without replacing eight readings, and removal keeps all CER writing', async () => {
    await mount();
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen');
    await click(findButton(host, 'Record annual result'));
    const first = clone(storedWorkspace().measurements[0]);
    await click(findButton(host.querySelector('.aq-measurement-notebook'), 'Add reading to Evidence'));
    const writing = clone(storedWorkspace());
    await click(findButton(host, 'Record annual result'));
    expect(storedWorkspace().measurements).toEqual([first]);
    expect(host.textContent).toContain('already in the notebook');
    for (const metricId of ['endingBiomass', 'survival', 'peakAmmonia', 'averageResilience', 'riskMonths', 'harvestUnits', 'operatingEffort']) {
      await change(host.querySelector('#aq-measurement-annual-metric'), metricId);
      await click(findButton(host, 'Record annual result'));
    }
    const full = clone(storedWorkspace());
    expect(full.measurements).toHaveLength(8);
    expect(new Set(full.measurements.map(note => note.metricId)).size).toBe(8);
    expect(new Set(full.measurements.map(note => note.id)).size).toBe(8);
    expect(full.measurements[0]).toEqual(first);
    await change(host.querySelector('#aq-season-species'), 'system');
    await change(host.querySelector('#aq-season-metric'), 'oxygen');
    await click(findButton(host, 'Record inspected result'));
    expect(storedWorkspace()).toEqual(full);
    expect(host.textContent).toContain('Measurement notebook is full at 8 readings');
    const notebook = host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)');
    const row = [...notebook.querySelectorAll('[data-measurement-id]')].find(element => element.dataset.measurementId === first.id);
    await click(findButton(row, 'Remove reading'));
    expect(storedWorkspace().measurements).toEqual(full.measurements.slice(1));
    for (const field of ['evidence', 'observation', 'prediction']) expect(storedWorkspace()[field], field).toEqual(writing[field]);
    expect(storedWorkspace().evidence.evidence).toContain(helpers.ecosystemMeasurementText(first));
  });

  it('disables the visible guided picker while preserving a complete parked notebook and the active draft', async () => {
    const parkedScenario = scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { temperature: 12, salinity: 1, oxygen: 10, pH: 7.5, ammonia: .02, exchange: 80 }, disturbanceId: 'none' });
    const parkedA = { ...parkedScenario, water: { ...parkedScenario.water, oxygen: 11 } };
    const note = { id: 'parked-reading', capturedAt, modelVersion: '2026.10-stock-feedback', scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 5.5, b: 4.5, baselineScenario: parkedA, currentScenario: parkedScenario };
    const parked = { ...parkedScenario, baselineScenario: parkedA, prediction: 'Keep this parked prediction.', observation: 'Keep this parked explanation and its frozen measurements.', evidence: { claim: 'Parked claim.', evidence: 'Parked evidence.', reasoning: 'Parked reasoning.', nextTest: 'Parked next test.' }, investigationId: 'flow-response', measurements: [note] };
    await mount({ ...scenario(), baselineScenario: null, parkedDraft: parked, prediction: 'Keep the active prediction.', observation: 'Keep the active explanation while the older notebook is parked.', evidence: { claim: 'Active claim.', evidence: 'Active evidence.', reasoning: 'Active reasoning.', nextTest: 'Active next test.' }, measurements: [note] });
    const before = clone(storedWorkspace());
    const picker = host.querySelector('.aq-investigation-picker');
    expect(picker).toBeTruthy();
    const cards = [...picker.querySelectorAll('.aq-question-card')];
    expect(cards.length).toBeGreaterThan(0);
    const hint = picker.querySelector('#aq-question-draft-hint');
    expect(hint.textContent).toContain('Return to your draft');
    for (const card of cards) {
      expect(card.disabled).toBe(true); expect(card.getAttribute('aria-describedby')).toBe(hint.id);
      await act(async () => { card.click(); });
      expect(storedWorkspace()).toEqual(before);
    }
    await click(findButton(host, 'Return to my draft'));
    const restored = storedWorkspace();
    for (const field of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'investigationId', 'measurements']) expect(restored[field], field).toEqual(before.parkedDraft[field]);
    expect(restored.parkedDraft).toBeNull();
  });

  it('uses a current reading in Evidence, opens CER and focuses its Evidence field', async () => {
    await mount();
    const before = clone(storedWorkspace().evidence);
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen');
    await click(findButton(host, 'Record annual result'));
    const note = storedWorkspace().measurements[0];
    await click(findButton(host.querySelector('.aq-measurement-notebook'), 'Add reading to Evidence'));
    const evidence = storedWorkspace().evidence;
    expect(evidence.evidence).toContain(helpers.ecosystemMeasurementText(note));
    for (const field of ['claim', 'reasoning', 'nextTest']) expect(evidence[field]).toBe(before[field]);
    const field = host.querySelector('#aq-eco-evidence-evidence');
    expect(document.activeElement).toBe(field); expect(field.closest('details').open).toBe(true);
    expect(storedWorkspace().measurements).toEqual([note]);
  });

  it('keeps frozen notebook readings through presets and builder reset instead of replacing them with current values', async () => {
    await mount();
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await click(findButton(host, 'Record annual result'));
    const notes = clone(storedWorkspace().measurements);
    await click(findButton(host, 'Finfish RAS + biofilter'));
    expect(storedWorkspace().environmentId).toBe('ras'); expect(storedWorkspace().measurements).toEqual(notes);
    expect(helpers.ecosystemMeasurementStatus(notes[0], storedWorkspace()).current).toBe(false);
    await click(findButton(host, 'Reset builder'));
    expect(storedWorkspace().measurements).toEqual(notes);
    await remount(); expect(storedWorkspace().measurements).toEqual(notes);
  });

  it('keeps saved readings frozen and retained in the notebook, and treats a new capture as unsaved evidence', async () => {
    await mount(comparison({ evidence: blankEvidence() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen');
    await click(findButton(host, 'Record annual result'));
    const originalNotes = clone(storedWorkspace().measurements);
    await click(findButton(host, 'Save A/B comparison'));
    const record = clone(storedWorkspace().experiments[0]);
    expect(record.measurements).toEqual(originalNotes); expect(storedWorkspace().measurements).toEqual(originalNotes);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Evidence saved');
    await change(host.querySelector('#aq-measurement-annual-metric'), 'peakAmmonia');
    await click(findButton(host, 'Record annual result'));
    expect(storedWorkspace().measurements).toHaveLength(2);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Compare & explain');
    expect(storedWorkspace().experiments[0]).toEqual(record);
    await click(findButton(host.querySelector('.aq-measurement-notebook'), 'Remove reading'));
    expect(storedWorkspace().experiments[0]).toEqual(record);
  });

  it.each(['replay', 'branch'])('keeps the archived notebook and parks/restores a complete newer draft through %s and reload', async action => {
    await mount(comparison({ evidence: blankEvidence() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await click(findButton(host, 'Record annual result'));
    await click(findButton(host, 'Save A/B comparison'));
    const record = clone(storedWorkspace().experiments[0]);
    await change(host.querySelector('#aq-measurement-annual-metric'), 'peakAmmonia'); await click(findButton(host, 'Record annual result'));
    await change(host.querySelector('#aq-eco-observation'), 'This later unfinished explanation belongs to the notebook I am parking.');
    const draft = clone(storedWorkspace());
    await click(findButton(host, action === 'replay' ? 'Replay experiment' : 'Use saved B as A'));
    const active = storedWorkspace();
    expect(active.measurements).toEqual(action === 'replay' ? record.measurements : []);
    expect(active.parkedDraft.measurements).toEqual(draft.measurements);
    expect(active.parkedDraft.observation).toBe(draft.observation);
    expect(active.experiments).toEqual(draft.experiments);
    for (const question of host.querySelectorAll('.aq-question-card')) {
      expect(question.disabled).toBe(true);
      await act(async () => { question.click(); });
      expect(storedWorkspace()).toEqual(active);
    }
    await remount(); await click(findButton(host, 'Return to my draft'));
    expect(storedWorkspace()).toEqual(draft);
    expect(storedWorkspace().experiments[0]).toEqual(record);
  });

  it('round-trips workspace, archived and parked measurements without recalculating their frozen values', async () => {
    await mount();
    const note = annual(comparison()), historical = { ...note, modelVersion: '2026.09-frozen-reading', a: 4.1234, b: 5.6789 };
    const record = { id: 'measurement-archive', kind: 'comparison', modelVersion: historical.modelVersion, title: 'Original recorded measurements', savedAt: capturedAt, baselineScenario: historical.baselineScenario, currentScenario: historical.currentScenario, measurements: [historical], observation: 'These numbers belong to the original recorded model outputs.' };
    const workspace = helpers.sanitizeEcosystemWorkspace({ ...comparison(), measurements: [historical], parkedDraft: { ...scenario(), measurements: [historical], evidence: blankEvidence() }, experiments: [record] });
    const portfolio = helpers.buildLearningPortfolio({ ecosystemWorkspace: workspace }, [], []);
    const merged = helpers.mergeLearningPortfolio({}, clone(portfolio), []);
    expect(merged.ecosystemWorkspace.measurements).toEqual(workspace.measurements);
    expect(merged.ecosystemWorkspace.parkedDraft.measurements).toEqual(workspace.parkedDraft.measurements);
    expect(merged.ecosystemWorkspace.experiments[0].measurements).toEqual(workspace.experiments[0].measurements);
    const html = helpers.ecosystemExperimentHtml(workspace.experiments[0]), document = new DOMParser().parseFromString(html, 'text/html'), text = document.body.textContent;
    expect(text).toContain(historical.modelVersion); expect(text).toContain('4.1234'); expect(text).toContain('5.6789'); expect(text).toContain('mg/L');
    const measurements = document.querySelector('.aq-captured-measurements');
    expect(measurements.textContent).toContain('Matches saved investigation settings');
    expect(measurements.textContent).not.toContain('Captured with an earlier model');
    const changedArchive = { ...workspace.experiments[0], currentScenario: { ...workspace.experiments[0].currentScenario, water: { ...water, oxygen: 3 } } };
    const changedReport = new DOMParser().parseFromString(helpers.ecosystemExperimentHtml(changedArchive), 'text/html').querySelector('.aq-captured-measurements').textContent;
    expect(changedReport).toContain('Frozen from earlier settings');
    expect(changedReport).toContain('Starting oxygen'); expect(changedReport).toContain('7'); expect(changedReport).toContain('3'); expect(changedReport).toContain('mg/L');
    expect(helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [{ id: 'legacy', kind: 'snapshot' }] }).experiments[0].measurements).toEqual([]);
  });

  it('retains an in-session reading and pending draft when device writes fail, then saves the same reading on retry', async () => {
    await mount();
    const durable = localStorage.getItem(storageKey), originalSetItem = Storage.prototype.setItem;
    let unavailable = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === storageKey && unavailable) throw new DOMException('Device quota exceeded', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    });
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen');
    await click(findButton(host, 'Record annual result'));
    expect(localStorage.getItem(storageKey)).toBe(durable);
    expect(host.querySelector('.aq-storage-recovery')).toBeTruthy();
    expect(host.querySelector('.aq-measurement-notebook').textContent).toMatch(/1\s*\/\s*8/);
    await click(findButton(host, 'Save A/B comparison'));
    expect(storedWorkspace().experiments).toEqual([]);
    expect(host.querySelector('#aq-eco-observation').value).toContain('compare these model readings');
    expect(host.querySelector('.aq-measurement-notebook').textContent).toMatch(/1\s*\/\s*8/);
    unavailable = false;
    await click(findButton(host, 'Retry device save'));
    expect(host.querySelector('.aq-storage-recovery')).toBeNull(); expect(storedWorkspace().measurements).toHaveLength(1);
    const notes = clone(storedWorkspace().measurements);
    await click(findButton(host, 'Save A/B comparison'));
    expect(storedWorkspace().experiments[0].measurements).toEqual(notes); expect(storedWorkspace().measurements).toEqual(notes);
  });
});
