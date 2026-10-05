import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Authored in the task workspace; only the parent executes this suite.
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const savedAt = Date.parse('2026-10-04T15:00:00.000Z');
const water = { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const evidence = (label = 'Original') => ({ claim: label + ' claim.', evidence: label + ' evidence.\nKeep its exact lines.', reasoning: label + ' reasoning.', nextTest: label + ' next test.' });
const note = (patch = {}) => ({ id: 'original-reading', capturedAt: savedAt - 3600000, modelVersion: '2026.09-original', scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 4.1234, b: 5.6794, baselineScenario: scenario(), currentScenario: scenario({ water: { ...water, oxygen: 9.2 } }), ...patch });
const summary = (patch = {}) => ({ endingBiomass: 13, survival: 72, minOxygen: 4.2, peakAmmonia: .37, averageResilience: 48, riskMonths: 6, harvestUnits: 1, operatingEffort: 39, hasCrop: true, species: [], ...patch });
const record = (patch = {}) => ({ id: 'shared-archive', title: 'Original archive A', savedAt, kind: 'comparison', modelVersion: '2026.09-original', environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, status: 'Watch', carryingPressure: 42, oxygen: 7.4, ammonia: .27, resilience: 63, baselineScenario: scenario(), currentScenario: scenario({ water: { ...water, oxygen: 9.2 } }), baselineSummary: summary(), currentSummary: summary({ minOxygen: 5.1 }), prediction: 'Original prediction.', observation: 'Original frozen archive reflection remains unchanged by imports.', evidence: evidence(), measurements: [note()], ...patch });
const otherRecord = (patch = {}) => record({ title: 'Different original archive B', savedAt: savedAt + 1, prediction: 'Different original prediction.', evidence: evidence('Different'), currentScenario: scenario({ water: { ...water, oxygen: 6.4 } }), currentSummary: summary({ minOxygen: 2.3, endingBiomass: 19 }), measurements: [note({ id: 'different-reading', b: 2.3456 })], ...patch });
const parked = () => ({ ...scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, salinity: 1, oxygen: 11 } }), baselineScenario: null, prediction: 'Parked prediction.', observation: 'Parked original reflection.', evidence: evidence('Parked'), measurements: [note({ id: 'parked-reading' })], investigationId: 'flow-response' });
const workspace = (patch = {}) => ({ ...scenario({ water: { ...water, oxygen: 9.2 } }), baselineScenario: scenario(), prediction: 'Current unfinished prediction.', observation: 'Current reflection stays exact while importing saved originals.', evidence: evidence('Current'), measurements: [note({ id: 'current-reading' })], experiments: [record(), otherRecord()], investigationId: '', parkedDraft: null, ...patch });
const freshWorkspace = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 }, water: { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'none', prediction: '', observation: '', evidence: { claim: '', evidence: '', reasoning: '', nextTest: '' }, measurements: [], experiments: [], baselineScenario: null, investigationId: '', parkedDraft: null, ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
const findButton = (scope, text) => [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === text);
function deepFreeze(value) { Object.freeze(value); Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); }); return value; }

describe('Aquaculture complete-original backup union', () => {
  let host, root, config, helpers, lastAttemptStorage;
  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, '', '/'); resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
  });
  afterEach(() => { if (root) act(() => root.unmount()); root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  async function mount(seed = workspace()) {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: seed }));
    root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(() => config.render(makeCtx({ React })))));
    helpers = window.AquacultureLearningHelpers;
    const stored = JSON.parse(localStorage.getItem(storageKey)); stored.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(stored.ecosystemWorkspace); localStorage.setItem(storageKey, JSON.stringify(stored));
  }
  async function click(element) { expect(element).toBeTruthy(); expect(element.disabled).not.toBe(true); await act(async () => element.click()); }
  const canonical = records => helpers.sanitizeEcosystemWorkspace({ experiments: records }).experiments;
  const sorted = records => canonical(records).sort((a, b) => b.savedAt - a.savedAt);
  const union = (current, incoming) => helpers.ecosystemArchiveMerge(current, incoming);
  const payload = incoming => ({ kind: 'aquaculture-learning-portfolio', version: 1, learning: { ecosystemWorkspace: incoming } });
  const plan = (current, incoming) => helpers.planLearningPortfolioImport({ ecosystemWorkspace: current }, payload(incoming), []);
  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;
  const cards = () => [...host.querySelectorAll('.aq-experiment-record')];
  const undo = () => findButton(host, 'Undo remove');
  const removedRow = () => host.querySelector('.aq-removed-measurement');
  const sameDraft = (actual, expected) => {
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'investigationId', 'parkedDraft']) expect(actual[key], key).toEqual(expected[key]);
  };
  async function importBackup(incomingPayload, { noFile = false } = {}) {
    await click(findButton(host, 'Home'));
    const input = host.querySelector('#aq-portfolio-import'); expect(input).toBeTruthy();
    vi.stubGlobal('FileReader', class { readAsText() { this.result = JSON.stringify(incomingPayload); this.onload(); } });
    Object.defineProperty(input, 'files', { configurable: true, value: noFile ? [] : [{ size: 20 }] });
    // Navigation persists lastTopic separately. Compare storage around the import itself.
    const beforeImportStorage = localStorage.getItem(storageKey);
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    lastAttemptStorage = { before: beforeImportStorage, after: localStorage.getItem(storageKey) };
    const paragraph = host.querySelector('[data-testid="aq-learning-import-summary"]');
    const result = paragraph ? { text: paragraph.textContent, tag: paragraph.tagName, role: paragraph.getAttribute('role'), live: paragraph.getAttribute('aria-live'), liveParent: paragraph.closest('[role="status"],[aria-live]') } : null;
    await click(findButton(host, 'Ecosystem builder'));
    return result;
  }
  async function removeArchiveAndReading() {
    await click(findButton(cards()[1], 'Remove'));
    await click(findButton(host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)'), 'Remove reading'));
    expect(undo()).toBeTruthy(); expect(removedRow()).toBeTruthy();
    return { before: clone(storedWorkspace()), key: removedRow().dataset.removedKey };
  }
  function failDeviceWrites() {
    const originalSetItem = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) { if (key === storageKey) throw new DOMException('Device quota exceeded', 'QuotaExceededError'); return originalSetItem.call(this, key, value); });
  }

  it('retains a different incoming same-ID original with its complete frozen provenance and current original unchanged', async () => {
    await mount(); const current = deepFreeze(canonical([record()])), incoming = deepFreeze(canonical([otherRecord()])), before = JSON.stringify({ current, incoming });
    const result = union(current, incoming);
    expect(result).toMatchObject({ added: 1, alreadyPresent: 0, variantAdded: 1, before: 1, total: 2, limit: 12 }); expect(result.experiments).toEqual(sorted([...current, ...incoming]));
    expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('distinguishes changed title, date, model, writing, measured values and recorded results instead of deduplicating by ID', async () => {
    await mount(); const current = canonical([record()]), incoming = canonical([
      record({ title: 'Renamed original' }), record({ savedAt: savedAt + 2 }), record({ modelVersion: '2026.08-original' }),
      record({ prediction: 'A different original prediction.' }), record({ observation: 'A different original frozen reflection.' }),
      record({ evidence: { ...evidence(), nextTest: 'A different original next test.' } }), record({ measurements: [note({ b: 6.1234 })] }),
      record({ currentSummary: summary({ minOxygen: 2.1 }) })
    ]);
    const result = union(deepFreeze(current), deepFreeze(incoming));
    expect(result).toMatchObject({ added: 8, alreadyPresent: 0, variantAdded: 8, before: 1, total: 9 }); expect(result.experiments).toEqual(sorted([...current, ...incoming]));
  });

  it('keeps two current identical occurrences when a backup contains only one matching copy', async () => {
    await mount(); const current = canonical([record(), record()]), incoming = canonical([record()]), result = union(deepFreeze(current), deepFreeze(incoming));
    expect(result).toMatchObject({ added: 0, alreadyPresent: 1, variantAdded: 0, before: 2, total: 2, limit: 12 }); expect(result.experiments).toEqual(current);
  });

  it('adds only the excess identical occurrences when a backup has three copies and the current archive has one', async () => {
    await mount(); const result = union(canonical([record()]), canonical([record(), record(), record()]));
    expect(result).toMatchObject({ added: 2, alreadyPresent: 1, variantAdded: 0, before: 1, total: 3 }); expect(result.experiments).toEqual(canonical([record(), record(), record()]));
  });

  it('uses maximum multiplicity for each distinct original and makes repeated mixed same-ID imports idempotent', async () => {
    await mount(); const current = canonical([record(), record()]), incoming = canonical([record(), record(), record(), otherRecord(), otherRecord()]), once = union(current, incoming), twice = union(once.experiments, incoming);
    expect(once).toMatchObject({ added: 3, alreadyPresent: 2, variantAdded: 3, before: 2, total: 5 }); expect(once.experiments).toEqual(sorted([record(), record(), record(), otherRecord(), otherRecord()]));
    expect(twice).toMatchObject({ added: 0, alreadyPresent: 5, variantAdded: 0, before: 5, total: 5 }); expect(twice.experiments).toEqual(once.experiments);
  });

  it('retains otherwise identical originals with different identifiers without changing either identifier', async () => {
    await mount(); const current = canonical([record()]), incoming = canonical([record({ id: 'another-original-id' })]), result = union(current, incoming);
    expect(result).toMatchObject({ added: 1, alreadyPresent: 0, variantAdded: 0, before: 1, total: 2 }); expect(result.experiments.map(item => item.id)).toEqual(['shared-archive', 'another-original-id']); expect(result.experiments).toEqual([...current, ...incoming]);
  });

  it('retains literal __proto__, constructor and toString IDs, including a different original with a shared prototype-like ID', async () => {
    await mount(); const current = canonical([record({ id: '__proto__' })]), incoming = canonical([otherRecord({ id: '__proto__' }), record({ id: 'constructor' }), record({ id: 'toString' })]), result = union(current, incoming);
    expect(result).toMatchObject({ added: 3, alreadyPresent: 0, variantAdded: 1, before: 1, total: 4 }); expect(result.experiments).toEqual(sorted([...current, ...incoming])); expect({}.polluted).toBeUndefined();
  });

  it('matches canonically identical records despite raw property order and ignored raw metadata', async () => {
    await mount(); const raw = record(), reordered = { measurements: clone(raw.measurements), evidence: { nextTest: raw.evidence.nextTest, reasoning: raw.evidence.reasoning, evidence: raw.evidence.evidence, claim: raw.evidence.claim }, ...raw, organisms: { nitrifiers: 1, kelp: 1, oyster: 2 }, ignoredImportMetadata: 'Not part of the saved original' };
    const current = canonical([raw]), incoming = canonical([reordered]); expect(incoming).toEqual(current);
    expect(union(deepFreeze(current), deepFreeze(incoming))).toMatchObject({ added: 0, alreadyPresent: 1, variantAdded: 0, total: 1, experiments: current });
  });

  it('keeps the current-then-incoming order for different originals with equal saved dates', async () => {
    await mount(); const current = canonical([record(), record({ id: 'current-unique', title: 'Current unique' })]), incoming = canonical([otherRecord({ savedAt }), record({ id: 'incoming-unique', title: 'Incoming unique' })]), result = union(current, incoming);
    expect(result).toMatchObject({ added: 2, alreadyPresent: 0, variantAdded: 1, before: 2, total: 4 }); expect(result.experiments).toEqual([...current, ...incoming]);
  });

  it('accepts an exact-copy backup at the full twelve-record limit without evicting or multiplying any original', async () => {
    await mount(); const current = deepFreeze(canonical(Array.from({ length: 12 }, (_, index) => record({ id: 'original-' + index, savedAt: savedAt + index })))), before = JSON.stringify(current), result = union(current, deepFreeze(clone(current)));
    expect(result).toMatchObject({ added: 0, alreadyPresent: 12, variantAdded: 0, before: 12, total: 12, limit: 12 }); expect(result.experiments).toEqual(sorted(current)); expect(JSON.stringify(current)).toBe(before);
  });

  it('rejects a thirteenth different same-ID original without changing either input archive', async () => {
    await mount(); const current = deepFreeze(canonical(Array.from({ length: 12 }, (_, index) => record({ title: 'Original ' + index, savedAt: savedAt + index })))), incoming = deepFreeze(canonical([otherRecord({ title: 'Thirteenth original' })])), before = JSON.stringify({ current, incoming });
    expect(() => union(current, incoming)).toThrow('experiment-capacity'); expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('counts maximum multiplicity before the capacity check rather than rejecting the concatenated copy count', async () => {
    await mount(); const current = canonical(Array.from({ length: 11 }, () => record())), incoming = canonical(Array.from({ length: 12 }, () => record())), result = union(current, incoming);
    expect(result).toMatchObject({ added: 1, alreadyPresent: 11, variantAdded: 0, before: 11, total: 12 }); expect(result.experiments).toEqual(incoming);
  });

  it('rejects thirteen raw incoming copies before sanitization could silently truncate the backup', async () => {
    await mount(); const current = deepFreeze(freshWorkspace()), incoming = deepFreeze(payload(workspace({ experiments: Array.from({ length: 13 }, () => record()) }))), before = JSON.stringify({ current, incoming });
    expect(() => helpers.planLearningPortfolioImport({ ecosystemWorkspace: current }, incoming, [])).toThrow('experiment-capacity'); expect(() => helpers.mergeLearningPortfolio({ ecosystemWorkspace: current }, incoming, [])).toThrow('experiment-capacity'); expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('rejects an over-cap raw current archive instead of truncating its originals during an otherwise identical import', async () => {
    await mount(); const current = deepFreeze(workspace({ experiments: Array.from({ length: 13 }, (_, index) => record({ title: 'Stored original ' + index })) })), incoming = deepFreeze(payload(workspace({ experiments: [record({ title: 'Stored original 0' })] }))), before = JSON.stringify({ current, incoming });
    expect(() => helpers.planLearningPortfolioImport({ ecosystemWorkspace: current }, incoming, [])).toThrow('experiment-capacity'); expect(() => helpers.mergeLearningPortfolio({ ecosystemWorkspace: current }, incoming, [])).toThrow('experiment-capacity'); expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('reports exact occurrence counts without adding import metadata to the merged state or changing the active and parked drafts', async () => {
    await mount(); const current = deepFreeze(workspace({ experiments: [record()], parkedDraft: parked(), investigationId: 'oxygen-buffer' })), incoming = deepFreeze(workspace({ experiments: [record(), otherRecord(), otherRecord()], prediction: 'Incoming prediction must not overwrite the current draft.' })), before = JSON.stringify({ current, incoming }), result = plan(current, incoming);
    expect(result.archive).toEqual({ added: 2, alreadyPresent: 1, variantAdded: 2, before: 1, total: 3, limit: 12 }); expect(result.draftRestored).toBe(false); expect(result.state.ecosystemWorkspace.experiments).toEqual(sorted([record(), otherRecord(), otherRecord()])); sameDraft(result.state.ecosystemWorkspace, helpers.sanitizeEcosystemWorkspace(current));
    expect(helpers.mergeLearningPortfolio({ ecosystemWorkspace: current }, payload(incoming), [])).toEqual(result.state); expect(result.state).not.toHaveProperty('archive'); expect(result.state).not.toHaveProperty('draftRestored'); expect(Object.keys(result.state.ecosystemWorkspace).sort()).toEqual(Object.keys(helpers.sanitizeEcosystemWorkspace(current)).sort()); expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('reports an actual draft-only restoration into absent, empty-object and untouched default workspaces', async () => {
    await mount(); const incoming = deepFreeze(workspace({ experiments: [], parkedDraft: parked(), investigationId: 'oxygen-buffer' })), expected = helpers.sanitizeEcosystemWorkspace(incoming);
    for (const current of [undefined, null, {}, freshWorkspace()]) {
      const result = helpers.planLearningPortfolioImport(current === undefined ? {} : { ecosystemWorkspace: current }, payload(incoming), []);
      expect(result.draftRestored).toBe(true); expect(result.archive).toEqual({ added: 0, alreadyPresent: 0, variantAdded: 0, before: 0, total: 0, limit: 12 }); expect(result.state.ecosystemWorkspace).toEqual(expected);
    }
  });

  it('reports that meaningful current work is kept and never reports restoring a missing incoming workspace', async () => {
    await mount(); const incoming = workspace({ experiments: [] }), patches = [
      { observation: '  ' }, { prediction: '  ' }, ...['claim', 'evidence', 'reasoning', 'nextTest'].map(key => ({ evidence: { ...freshWorkspace().evidence, [key]: '  ' } })),
      { measurements: [note()] }, { baselineScenario: scenario() }, { parkedDraft: parked() }, { investigationId: 'oxygen-buffer' }, { organisms: {} }, { water: { ...freshWorkspace().water, oxygen: 6.4 } }
    ];
    for (const patch of patches) { const current = deepFreeze(freshWorkspace(patch)), result = plan(current, incoming); expect(result.draftRestored, JSON.stringify(patch)).toBe(false); sameDraft(result.state.ecosystemWorkspace, helpers.sanitizeEcosystemWorkspace(current)); }
    const current = workspace({ parkedDraft: parked() }), result = helpers.planLearningPortfolioImport({ ecosystemWorkspace: current }, { kind: 'aquaculture-learning-portfolio', version: 1, learning: {} }, []);
    expect(result.draftRestored).toBe(false); sameDraft(result.state.ecosystemWorkspace, helpers.sanitizeEcosystemWorkspace(current)); expect(result.state.ecosystemWorkspace.experiments).toEqual(sorted(current.experiments));
  });

  it('shows successful saved import counts, clears both recovery controls, and keeps repeat imports and picker cancellation idempotent', async () => {
    await mount(); const { before } = await removeArchiveAndReading(), incoming = payload(workspace({ experiments: [record(), otherRecord(), otherRecord()] }));
    const first = await importBackup(incoming);
    expect(first).toMatchObject({ tag: 'P', role: null, live: null, liveParent: null, text: 'Saved investigations: 2 added; 1 exact copy already present. 3 of 12 records. 2 added originals share an ID with a different saved investigation. Current investigation draft kept.' });
    expect(undo()).toBeUndefined(); expect(removedRow()).toBeNull(); sameDraft(storedWorkspace(), before); expect(storedWorkspace().experiments).toEqual(sorted([record(), otherRecord(), otherRecord()]));
    const second = await importBackup(incoming);
    expect(second.text).toBe('Saved investigations: 0 added; 3 exact copies already present. 3 of 12 records. Current investigation draft kept.'); expect(storedWorkspace().experiments).toHaveLength(3); sameDraft(storedWorkspace(), before);
    const cancelled = await importBackup(incoming, { noFile: true }); expect(cancelled.text).toBe(second.text); expect(storedWorkspace().experiments).toHaveLength(3);
  });

  it('clears the prior summary before rejecting a raw thirteen-record backup while preserving both recovery controls and current work', async () => {
    await mount(); const backup = clone(storedWorkspace()); expect(await importBackup(payload(backup))).toBeTruthy();
    // Successful import uses the existing saved-date order; Undo restores the subsequent removed occurrence.
    const initial = clone(storedWorkspace()), { before, key } = await removeArchiveAndReading();
    const result = await importBackup(payload(workspace({ experiments: Array.from({ length: 13 }, () => record()) })));
    expect(result).toBeNull(); expect(storedWorkspace()).toEqual(before); expect(lastAttemptStorage.after).toBe(lastAttemptStorage.before); expect(undo().disabled).toBe(false); expect(removedRow().dataset.removedKey).toBe(key);
    await click(undo()); expect(storedWorkspace().experiments).toEqual(initial.experiments); sameDraft(storedWorkspace(), before); expect(removedRow().dataset.removedKey).toBe(key);
  });

  it('does not show success counts or import originals when device saving fails and retains exact archive and reading recovery', async () => {
    await mount(); const initial = clone(storedWorkspace()), { before, key } = await removeArchiveAndReading(), writes = failDeviceWrites();
    const result = await importBackup(payload(workspace({ experiments: [record(), otherRecord(), otherRecord()] })));
    expect(result).toBeNull(); expect(storedWorkspace()).toEqual(before); expect(lastAttemptStorage.after).toBe(lastAttemptStorage.before); expect(undo().disabled).toBe(false); expect(removedRow().dataset.removedKey).toBe(key); expect(cards()).toHaveLength(1);
    writes.mockRestore(); await click(undo()); expect(storedWorkspace().experiments).toEqual(initial.experiments); sameDraft(storedWorkspace(), before); expect(removedRow().dataset.removedKey).toBe(key);
  });
});
