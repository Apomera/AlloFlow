import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const capturedAt = Date.parse('2026-10-02T12:00:00.000Z');
const water = { temperature: 14, salinity: 30, oxygen: 9, pH: 8, ammonia: .04, exchange: 82 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'none', ...patch });
const baseline = () => scenario();
const current = () => scenario({ organisms: { oyster: 3, phytoplankton: 1 }, water: { ...water, oxygen: 5, exchange: 25 }, disturbanceId: 'heatwave' });
const evidence = () => ({ claim: 'Keep my tentative claim.', evidence: 'Keep my original evidence.', reasoning: 'Keep my proposed mechanism.', nextTest: 'Try one input next.' });
const measurement = (patch = {}) => ({ id: 'earlier-reading', capturedAt, modelVersion: '2026.10-stock-feedback', scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 6.1234, b: 4.4321, baselineScenario: baseline(), currentScenario: current(), ...patch });
const savedRecord = () => ({ id: 'frozen-original', title: 'Keep this original investigation', kind: 'comparison', modelVersion: '2099.frozen-test-rules', savedAt: capturedAt, environmentId: 'longline', organisms: { oyster: 3, phytoplankton: 1 }, baselineScenario: baseline(), currentScenario: current(), baselineSummary: { endingBiomass: 22, survival: 76, minOxygen: 6.1234, peakAmmonia: .31, hasCrop: true }, currentSummary: { endingBiomass: 17, survival: 65, minOxygen: 4.4321, peakAmmonia: .53, hasCrop: true }, prediction: 'Keep this archived prediction.', observation: 'Keep this archived explanation.', evidence: evidence(), measurements: [measurement()] });
const workspace = (patch = {}) => ({ ...current(), baselineScenario: baseline(), prediction: 'My original expectation stays with this investigation.', observation: 'My unfinished explanation stays in the live notebook.', evidence: evidence(), investigationId: 'oxygen-buffer', measurements: [measurement()], experiments: [savedRecord()], parkedDraft: null, ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}
const findButton = (host, label) => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === label);
const inputsOnly = value => ({ environmentId: value.environmentId, organisms: clone(value.organisms), water: clone(value.water), disturbanceId: value.disturbanceId });

describe('Aquaculture controlled live comparison and reversible input isolation', () => {
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

  async function mount(value = workspace()) {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: value }));
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
  const isolation = () => host.querySelector('.aq-input-isolation');
  const picker = () => host.querySelector('#aq-isolation-input');

  it('assigns unique stable keys to every changed input without altering existing change labels, values or units', async () => {
    await mount();
    const a = baseline(), b = scenario({ environmentId: 'ras', organisms: { oyster: 3, trout: 2 }, water: { temperature: 12, salinity: 1, oxygen: 5.25, pH: 7.4, ammonia: .25, exchange: 25 }, disturbanceId: 'heatwave' });
    const changes = helpers.ecosystemControlledChanges(a, b);
    const expected = ['environment', 'stock.oyster', 'stock.mussel', 'stock.phytoplankton', 'stock.trout', ...Object.keys(water).map(id => 'water.' + id), 'disturbance'];
    expect(changes.map(item => item.key).sort()).toEqual(expected.sort());
    expect(new Set(changes.map(item => item.key)).size).toBe(changes.length);
    expect(changes.map(({ key, type, id, ...item }) => item)).toEqual(helpers.ecosystemChanges(a, b));
    for (const item of changes) { expect(item.type).toBeTruthy(); expect(item.id).toBeTruthy(); }
    expect(helpers.ecosystemControlledChanges(a, a)).toEqual([]);
  });

  it('creates a pure detached scenario with exactly the chosen original B change for every supported key', async () => {
    await mount();
    const raw = deepFreeze(workspace({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { temperature: 12, salinity: 1, oxygen: 5.25, pH: 7.4, ammonia: .25, exchange: 25 } }));
    const original = JSON.stringify(raw), changes = helpers.ecosystemControlledChanges(raw.baselineScenario, raw);
    for (const change of changes) {
      const preview = helpers.ecosystemIsolationPreview(raw, change.key);
      expect(preview.valid).toBe(true); expect(preview.key).toBe(change.key);
      expect(preview.changes).toEqual(changes); expect(preview.keep).toEqual(change);
      expect(preview.restore).toEqual(changes.filter(item => item.key !== change.key));
      expect(preview.baseline).toEqual(raw.baselineScenario); expect(preview.before).toEqual(inputsOnly(raw));
      expect(helpers.ecosystemControlledChanges(preview.baseline, preview.scenario)).toEqual([change]);
      expect(preview.scenario).not.toBe(raw.baselineScenario); expect(preview.scenario.water).not.toBe(raw.baselineScenario.water);
      expect(preview.before.water).not.toBe(raw.water); expect(preview.baseline.organisms).not.toBe(raw.baselineScenario.organisms);
      for (const key of ['prediction', 'observation', 'evidence', 'measurements', 'experiments', 'parkedDraft', 'baselineScenario', 'investigationId']) expect(preview.scenario).not.toHaveProperty(key);
      expect(helpers.ecosystemIsolationPreview(raw, change.key)).toEqual(preview);
      preview.scenario.water.temperature = 0; preview.before.organisms.oyster = 5; preview.baseline.water.oxygen = 2;
      expect(JSON.stringify(raw)).toBe(original);
    }
  });

  it('retains precise selected water values while restoring environment defaults and every other input to fixed A', async () => {
    await mount();
    const raw = workspace({ environmentId: 'ras', water: { temperature: 12, salinity: 1, oxygen: 5.2517, pH: 7.3, ammonia: .8, exchange: 25 } });
    const preview = helpers.ecosystemIsolationPreview(raw, 'water.oxygen');
    expect(preview.scenario).toEqual({ ...baseline(), water: { ...water, oxygen: 5.2517 } });
    expect(preview.scenario.water.oxygen).toBe(5.2517);
    expect(helpers.ecosystemChanges(preview.baseline, preview.scenario)).toHaveLength(1);
  });

  it('isolates both added and removed stock and removes an absent species key instead of manufacturing a zero stock record', async () => {
    await mount();
    const raw = workspace({ organisms: { oyster: 3, trout: 2, phytoplankton: 1 } });
    const added = helpers.ecosystemIsolationPreview(raw, 'stock.trout');
    expect(added.scenario.organisms).toEqual({ ...baseline().organisms, trout: 2 });
    const removed = helpers.ecosystemIsolationPreview(raw, 'stock.mussel');
    expect(removed.keep).toMatchObject({ before: 1, after: 0 });
    expect(removed.scenario.organisms).toEqual({ oyster: 2, phytoplankton: 1 });
    expect(Object.prototype.hasOwnProperty.call(removed.scenario.organisms, 'mussel')).toBe(false);
    expect(helpers.ecosystemControlledChanges(removed.baseline, removed.scenario).map(item => item.key)).toEqual(['stock.mussel']);
  });

  it('retains one environment or disturbance control while cautioning that one control can bundle modeled effects', async () => {
    await mount();
    const raw = workspace({ environmentId: 'raceway' });
    const environment = helpers.ecosystemIsolationPreview(raw, 'environment');
    expect(environment.scenario).toEqual({ ...baseline(), environmentId: 'raceway' });
    expect(environment.caution).toMatch(/environment|modeled relationships|combined|bundle/i);
    const disturbance = helpers.ecosystemIsolationPreview(raw, 'disturbance');
    expect(disturbance.scenario).toEqual({ ...baseline(), disturbanceId: 'heatwave' });
    expect(disturbance.caution).toMatch(/disturbance|combined|bundle/i);
    expect(environment.scenario.water).toEqual(water);
  });

  it('rejects incomplete A or B, missing baselines, unknown keys and unchanged inputs without creating a scenario', async () => {
    await mount();
    const missingA = baseline(); delete missingA.water.exchange;
    const missingB = workspace(); delete missingB.water.pH;
    const inheritedWater = { ...water }; delete inheritedWater.oxygen;
    const inheritedA = baseline(); inheritedA.water = Object.assign(Object.create({ oxygen: 9 }), inheritedWater);
    const cases = [[workspace({ baselineScenario: null }), 'water.oxygen'], [workspace({ baselineScenario: {} }), 'water.oxygen'], [workspace({ baselineScenario: missingA }), 'water.oxygen'], [missingB, 'water.oxygen'], [workspace({ baselineScenario: inheritedA }), 'water.oxygen'], [workspace({ environmentId: '__proto__' }), 'water.oxygen'], [workspace({ disturbanceId: 'constructor' }), 'water.oxygen'], [workspace(), 'water.pH'], [workspace(), 'water.unknown'], [workspace(), 'stock.constructor'], [workspace(), '__proto__'], [workspace(), null]];
    for (const [raw, key] of cases) {
      const preview = helpers.ecosystemIsolationPreview(raw, key);
      expect(preview.valid).toBe(false); expect(preview.scenario).toBeNull(); expect(preview.reason).toBeTruthy();
    }
  });

  it('allows a valid already focused preview with no inputs to restore and preserves its sole actual change', async () => {
    await mount();
    const raw = workspace({ ...baseline(), water: { ...water, oxygen: 8.999 } });
    const preview = helpers.ecosystemIsolationPreview(raw, 'water.oxygen');
    expect(preview.valid).toBe(true); expect(preview.restore).toEqual([]);
    expect(preview.scenario).toEqual(inputsOnly(raw));
    expect(preview.keep).toMatchObject({ key: 'water.oxygen', before: 9, after: 8.999 });
    expect(helpers.ecosystemIsolationPreview(workspace({ ...baseline() }), 'water.oxygen').valid).toBe(false);
  });

  it('checks Undo against exact B inputs and fixed A while ignoring later writing, captured notes, archives and parked metadata', async () => {
    await mount();
    const raw = workspace(), preview = helpers.ecosystemIsolationPreview(raw, 'water.oxygen');
    const undo = deepFreeze({ before: preview.before, after: preview.scenario, baseline: preview.baseline });
    const active = deepFreeze({ ...raw, ...clone(preview.scenario), prediction: 'Later expectation wording.', observation: 'Later learner explanation.', evidence: { ...evidence(), claim: 'Later claim.' }, measurements: [], experiments: [], parkedDraft: { ...baseline(), observation: 'Later parked draft.' } });
    const originals = [JSON.stringify(undo), JSON.stringify(active)];
    expect(helpers.ecosystemIsolationUndoIsCurrent(undo, active)).toBe(true);
    const changed = { ...clone(active), water: { ...active.water, oxygen: active.water.oxygen + .00001 } };
    expect(helpers.ecosystemIsolationUndoIsCurrent(undo, changed)).toBe(false);
    expect([JSON.stringify(undo), JSON.stringify(active)]).toEqual(originals);
  });

  it('rejects Undo after any changed or incomplete baseline and cannot validate a partial before or after snapshot', async () => {
    await mount();
    const raw = workspace(), preview = helpers.ecosystemIsolationPreview(raw, 'water.oxygen');
    const undo = { before: preview.before, after: preview.scenario, baseline: preview.baseline }, active = { ...raw, ...preview.scenario };
    const variants = [null, { ...baseline(), water: { ...water, exchange: 81 } }, { ...baseline(), organisms: { oyster: 1 } }, { ...baseline(), environmentId: 'ras' }, { ...baseline(), disturbanceId: 'heatwave' }, {}];
    for (const baselineScenario of variants) expect(helpers.ecosystemIsolationUndoIsCurrent(undo, { ...active, baselineScenario })).toBe(false);
    for (const key of ['before', 'after', 'baseline']) {
      expect(helpers.ecosystemIsolationUndoIsCurrent({ ...undo, [key]: {} }, active)).toBe(false);
    }
    expect(helpers.ecosystemIsolationUndoIsCurrent(null, active)).toBe(false);
  });

  it('offers an explicitly labelled native picker and keeps changing the preview or monthly chart read only', async () => {
    await mount();
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    expect(isolation().tagName).toBe('DETAILS'); expect(picker().tagName).toBe('SELECT');
    expect(picker().labels).toHaveLength(1); expect(picker().labels[0].textContent).toBe('Keep this B input');
    const keys = helpers.ecosystemControlledChanges(before.baselineScenario, before).map(item => item.key);
    expect([...picker().options].filter(option => option.value).map(option => option.value).sort()).toEqual(keys.sort());
    await click(isolation().querySelector('summary'));
    await change(picker(), 'water.oxygen');
    expect(picker().value).toBe('water.oxygen');
    await change(host.querySelector('#aq-season-species'), 'oyster');
    await change(host.querySelector('#aq-season-metric'), 'survival');
    await click([...host.querySelectorAll('.aq-season-months button')].find(button => /^Inspect Jul,/.test(button.getAttribute('aria-label'))));
    expect(picker().value).toBe('water.oxygen');
    expect(storedWorkspace()).toEqual(before); expect(localStorage.getItem(storageKey)).toBe(durable); expect(writes).not.toHaveBeenCalled();
  });

  it('applies the chosen single change only on request, keeps fixed A and all learner metadata, and focuses the stable heading', async () => {
    await mount();
    const before = clone(storedWorkspace()), expected = helpers.ecosystemIsolationPreview(before, 'water.oxygen');
    await change(picker(), 'water.oxygen');
    expect(storedWorkspace()).toEqual(before);
    await click(findButton(isolation(), 'Apply focused comparison'));
    const after = storedWorkspace();
    expect(inputsOnly(after)).toEqual(expected.scenario);
    expect(after.baselineScenario).toEqual(before.baselineScenario);
    expect({ ...after, ...inputsOnly(before) }).toEqual(before);
    expect(helpers.ecosystemControlledChanges(after.baselineScenario, after).map(item => item.key)).toEqual(['water.oxygen']);
    const heading = host.querySelector('#aq-isolation-heading');
    expect(heading.tabIndex).toBe(-1); expect(document.activeElement).toBe(heading); expect(isolation().open).toBe(true);
    expect(findButton(isolation(), 'Undo input isolation').disabled).not.toBe(true);
    expect(findButton(isolation(), 'Apply focused comparison').disabled).toBe(true);
    expect(host.querySelector('.aq-loop-prediction-record').textContent).toContain(before.prediction);
    expect(after.measurements).toEqual(before.measurements);
    expect(helpers.ecosystemMeasurementStatus(after.measurements[0], after).current).toBe(false);
    expect(after.experiments).toEqual(before.experiments);
  });

  it('Undo restores only the prior B inputs while retaining explanation, CER and a new capture written after Apply', async () => {
    await mount();
    const before = clone(storedWorkspace());
    await change(picker(), 'water.oxygen'); await click(findButton(isolation(), 'Apply focused comparison'));
    const observation = 'This new interpretation belongs to the learner after previewing a focused comparison.';
    const claim = 'This new claim must survive input-only Undo.';
    await change(host.querySelector('#aq-eco-observation'), observation);
    await change(host.querySelector('#aq-eco-evidence-claim'), claim);
    await change(host.querySelector('#aq-measurement-annual-metric'), 'peakAmmonia');
    await click(findButton(host, 'Record annual result'));
    const written = clone(storedWorkspace());
    expect(written.measurements).toHaveLength(2);
    const fresh = written.measurements.find(note => note.metricId === 'peakAmmonia');
    expect(fresh.currentScenario).toEqual(inputsOnly(written));
    expect(helpers.ecosystemMeasurementStatus(fresh, written).current).toBe(true);
    await click(findButton(isolation(), 'Undo input isolation'));
    const restored = storedWorkspace();
    expect(inputsOnly(restored)).toEqual(inputsOnly(before)); expect(restored.baselineScenario).toEqual(before.baselineScenario);
    expect(restored.observation).toBe(observation); expect(restored.evidence.claim).toBe(claim);
    expect(restored.evidence).toEqual(written.evidence); expect(restored.measurements).toEqual(written.measurements);
    expect(restored.experiments).toEqual(before.experiments); expect(restored.prediction).toBe(before.prediction);
    expect(helpers.ecosystemMeasurementStatus(restored.measurements[0], restored).current).toBe(true);
    expect(helpers.ecosystemMeasurementStatus(fresh, restored).current).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('#aq-isolation-heading'));
    expect(findButton(isolation(), 'Undo input isolation')).toBeUndefined();
  });

  it('keeps an unavailable selection as a replacement placeholder when that input is manually restored to A', async () => {
    await mount();
    await change(picker(), 'water.oxygen');
    await change(host.querySelector('#aq-eco-oxygen'), String(water.oxygen));
    const before = clone(storedWorkspace());
    expect(helpers.ecosystemControlledChanges(before.baselineScenario, before).length).toBeGreaterThanOrEqual(2);
    expect(picker().value).toBe('');
    expect(findButton(isolation(), 'Apply focused comparison').disabled).toBe(true);
    expect([...picker().options].some(option => option.value === 'water.oxygen')).toBe(false);
    await act(async () => { findButton(isolation(), 'Apply focused comparison').click(); });
    expect(storedWorkspace()).toEqual(before);
    await change(picker(), 'water.exchange');
    expect(findButton(isolation(), 'Apply focused comparison').disabled).toBe(false);
  });

  it('invalidates a transient Undo when a B input changes or scenario A is replaced', async () => {
    await mount();
    await change(picker(), 'water.oxygen'); await click(findButton(isolation(), 'Apply focused comparison'));
    await change(host.querySelector('#aq-eco-exchange'), '75');
    let undoButton = findButton(isolation(), 'Undo input isolation');
    expect(!undoButton || undoButton.disabled).toBe(true);
    const edited = clone(storedWorkspace());
    if (undoButton) await act(async () => { undoButton.click(); });
    expect(storedWorkspace()).toEqual(edited);
    await change(picker(), 'water.oxygen'); await click(findButton(isolation(), 'Apply focused comparison'));
    expect(findButton(isolation(), 'Undo input isolation').disabled).not.toBe(true);
    const focused = clone(storedWorkspace());
    await click(findButton(host, 'Replace scenario A'));
    expect(storedWorkspace().baselineScenario).toEqual(inputsOnly(focused));
    undoButton = findButton(host, 'Undo input isolation');
    expect(!undoButton || undoButton.disabled).toBe(true);
    expect({ ...storedWorkspace(), baselineScenario: focused.baselineScenario }).toEqual(focused);
  });

  it('keeps Undo available through monthly inspection and archive rename, preserving the renamed original on restoration', async () => {
    await mount();
    const before = clone(storedWorkspace());
    await change(picker(), 'water.oxygen'); await click(findButton(isolation(), 'Apply focused comparison'));
    await change(host.querySelector('#aq-season-species'), 'oyster');
    await change(host.querySelector('#aq-season-metric'), 'biomass');
    await click([...host.querySelectorAll('.aq-season-months button')].find(button => /^Inspect Oct,/.test(button.getAttribute('aria-label'))));
    const title = '  Later renamed original evidence  ';
    await change(host.querySelector('.aq-record-name-label input'), title);
    const renamed = clone(storedWorkspace());
    expect(findButton(isolation(), 'Undo input isolation').disabled).not.toBe(true);
    await click(findButton(isolation(), 'Undo input isolation'));
    expect(inputsOnly(storedWorkspace())).toEqual(inputsOnly(before));
    expect(storedWorkspace().experiments).toEqual(renamed.experiments);
    expect(storedWorkspace().experiments[0].title).toBe(title);
    expect({ ...storedWorkspace().experiments[0], title: before.experiments[0].title }).toEqual(before.experiments[0]);
    expect(storedWorkspace().measurements).toEqual(before.measurements);
  });

  it('preserves a complete parked notebook through Apply and Undo and restores that notebook when returning to the draft', async () => {
    const parkedScenario = scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { temperature: 12, salinity: 1, oxygen: 11, pH: 7.5, ammonia: .02, exchange: 80 } });
    const parkedA = { ...parkedScenario, water: { ...parkedScenario.water, oxygen: 12 } };
    const parked = { ...parkedScenario, baselineScenario: parkedA, prediction: 'Keep the parked expectation.', observation: 'Keep the parked notebook explanation.', evidence: evidence(), investigationId: 'flow-response', measurements: [measurement({ id: 'parked-reading', baselineScenario: parkedA, currentScenario: parkedScenario })] };
    await mount(workspace({ parkedDraft: parked }));
    const before = clone(storedWorkspace());
    await change(picker(), 'water.oxygen'); await click(findButton(isolation(), 'Apply focused comparison'));
    expect(storedWorkspace().parkedDraft).toEqual(before.parkedDraft);
    expect(storedWorkspace().experiments).toEqual(before.experiments);
    await click(findButton(isolation(), 'Undo input isolation'));
    expect(storedWorkspace()).toEqual(before);
    await change(picker(), 'water.oxygen'); await click(findButton(isolation(), 'Apply focused comparison'));
    await click(findButton(host, 'Return to my draft'));
    const restored = storedWorkspace();
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'investigationId', 'measurements']) expect(restored[key], key).toEqual(before.parkedDraft[key]);
    expect(restored.parkedDraft).toBeNull(); expect(restored.experiments).toEqual(before.experiments);
    const undoButton = findButton(host, 'Undo input isolation');
    expect(!undoButton || undoButton.disabled).toBe(true);
  });
});
