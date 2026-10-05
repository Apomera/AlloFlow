import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Authored in the task workspace; the parent runs this suite after candidate integration.
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const savedAt = Date.parse('2026-10-03T17:00:00.000Z');
const water = { temperature: 14, salinity: 30, oxygen: 8, pH: 8, ammonia: .04, exchange: 82 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const evidence = (label = 'Original') => ({ claim: label + ' claim.', evidence: label + ' evidence.\nKeep its exact lines.', reasoning: label + ' reasoning.', nextTest: label + ' next test.' });
const importedNote = (patch = {}) => ({ id: 'original-reading', capturedAt: savedAt - 3600000, modelVersion: '2026.09-original', scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 4.1234, b: 5.6794, baselineScenario: scenario(), currentScenario: scenario({ water: { ...water, oxygen: 9.2 } }), ...patch });
const summary = (patch = {}) => ({ endingBiomass: 13, survival: 72, minOxygen: 4.2, peakAmmonia: .37, averageResilience: 48, riskMonths: 6, harvestUnits: 1, operatingEffort: 39, hasCrop: true, species: [], ...patch });
const record = (patch = {}) => ({ id: 'shared-archive', title: 'First original archive', savedAt, kind: 'comparison', modelVersion: '2026.09-original', environmentId: 'longline', organisms: { oyster: 2, kelp: 1, nitrifiers: 1 }, status: 'Watch', carryingPressure: 42, oxygen: 7.4, ammonia: .27, resilience: 63, baselineScenario: scenario(), currentScenario: scenario({ water: { ...water, oxygen: 9.2 } }), baselineSummary: summary(), currentSummary: summary({ minOxygen: 5.1 }), prediction: 'First original prediction.', observation: 'First original archive reflection retains its frozen recorded provenance.', evidence: evidence('First original'), measurements: [importedNote()], ...patch });
const secondRecord = (patch = {}) => record({ title: 'Second original archive', savedAt: savedAt + 1, currentScenario: scenario({ water: { ...water, oxygen: 6.4 } }), currentSummary: summary({ minOxygen: 2.3, endingBiomass: 19 }), prediction: 'Second original prediction.', observation: 'Second original archive reflection must never select the first original.', evidence: evidence('Second original'), measurements: [importedNote({ id: 'second-reading', capturedAt: savedAt - 1800000, b: 2.3456, currentScenario: scenario({ water: { ...water, oxygen: 6.4 } }) })], ...patch });
const parked = () => ({ ...scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, salinity: 1, oxygen: 11 } }), baselineScenario: null, prediction: 'Parked prediction.', observation: 'Parked original reflection.', evidence: evidence('Parked'), measurements: [importedNote({ id: 'parked-reading' })], investigationId: 'flow-response' });
const workspace = (patch = {}) => ({ ...scenario({ water: { ...water, oxygen: 9.2 } }), baselineScenario: scenario(), prediction: 'Current unfinished prediction.', observation: 'Current reflection stays exact across archive actions and backup merges.', evidence: evidence('Current'), measurements: [importedNote({ id: 'current-reading' })], experiments: [record(), secondRecord()], investigationId: '', parkedDraft: null, ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
const freshWorkspace = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 }, water: { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .04, exchange: 82 }, disturbanceId: 'none', prediction: '', observation: '', evidence: { claim: '', evidence: '', reasoning: '', nextTest: '' }, measurements: [], experiments: [], baselineScenario: null, investigationId: '', parkedDraft: null, ...patch });
const findButton = (scope, label) => [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === label);
function deepFreeze(value) { Object.freeze(value); Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); }); return value; }

describe('Aquaculture exact archive actions and backup integrity', () => {
  let host, root, config, helpers;
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
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    const stored = JSON.parse(localStorage.getItem(storageKey)); stored.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(stored.ecosystemWorkspace); localStorage.setItem(storageKey, JSON.stringify(stored));
  }
  async function click(element) { expect(element).toBeTruthy(); expect(element.disabled).not.toBe(true); await act(async () => element.click()); }
  async function change(element, value, selection = null) {
    expect(element).toBeTruthy(); const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value); if (selection) element.setSelectionRange(selection[0], selection[1]); element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
  }
  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;
  const cards = () => [...host.querySelectorAll('.aq-experiment-record')];
  const cardAt = index => cards()[index];
  const canonicalRecords = records => helpers.sanitizeEcosystemWorkspace({ experiments: records }).experiments;
  const merge = (current, imported) => helpers.mergeLearningPortfolio({ ecosystemWorkspace: current }, helpers.buildLearningPortfolio({ ecosystemWorkspace: imported }, [], []), []).ecosystemWorkspace;
  const target = (records, index) => helpers.ecosystemArchiveTarget(records, index);
  const resolve = (records, selected) => helpers.resolveEcosystemArchiveTarget(records, selected);
  const remove = (records, selected) => helpers.removeEcosystemArchiveRecord(records, selected);
  const restore = (records, removed) => helpers.restoreEcosystemArchiveRecord(records, removed);
  const undo = () => findButton(host, 'Undo remove');
  const recovery = () => host.querySelector('.aq-archive-recovery');
  const status = () => host.querySelector('#aq-archive-undo-status');
  const sameDraft = (actual, expected) => {
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'investigationId', 'parkedDraft']) expect(actual[key], key).toEqual(expected[key]);
  };
  const sortedRecords = records => canonicalRecords(records).sort((a, b) => b.savedAt - a.savedAt);
  async function importBackup(payload, { size = 20, error = false, noFile = false } = {}) {
    await click(findButton(host, 'Home'));
    const input = host.querySelector('#aq-portfolio-import'); expect(input).toBeTruthy();
    vi.stubGlobal('FileReader', class { readAsText() { this.result = typeof payload === 'string' ? payload : JSON.stringify(payload); if (error) this.onerror(); else this.onload(); } });
    Object.defineProperty(input, 'files', { configurable: true, value: noFile ? [] : [{ size }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    await click(findButton(host, 'Ecosystem builder'));
  }
  function captureDownload() {
    let blob, name;
    const BaseURL = window.URL;
    const createObjectURL = vi.fn(value => { blob = value; return 'blob:archive-integrity'; });
    vi.stubGlobal('URL', class extends BaseURL { static createObjectURL = createObjectURL; static revokeObjectURL = vi.fn(); });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { name = this.download; });
    return { createObjectURL, name: () => name, read: () => new Promise((yes, no) => { const reader = new FileReader(); reader.onload = () => yes(reader.result); reader.onerror = () => no(reader.error); reader.readAsText(blob); }) };
  }
  function failDeviceWrites() {
    const setItem = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) { if (key === storageKey) throw new DOMException('Device quota exceeded', 'QuotaExceededError'); return setItem.call(this, key, value); });
  }

  it('targets the second same-ID original by detached full canonical JSON without changing frozen inputs', async () => {
    await mount();
    const raw = deepFreeze([record(), secondRecord()]), before = JSON.stringify(raw), canonical = canonicalRecords(raw);
    const selected = target(raw, 1);
    expect(selected).toEqual({ index: 1, id: canonical[1].id, signature: JSON.stringify(canonical[1]) });
    expect(selected.signature).not.toBe(JSON.stringify(canonical[0]));
    const result = resolve(raw, selected);
    expect(result).toMatchObject({ ok: true, state: 'ready', index: 1 }); expect(result.record).toEqual(canonical[1]); expect(result.records).toEqual(canonical);
    expect(result.record).not.toBe(raw[1]); expect(result.record.measurements[0]).not.toBe(raw[1].measurements[0]);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('rejects invalid indices, incomplete targets and stale renamed, replaced or reordered originals without an ID fallback', async () => {
    await mount(); const raw = [record(), secondRecord()], canonical = canonicalRecords(raw), selected = target(raw, 1);
    for (const index of [-1, 2, .5, NaN, Infinity, '1', null, undefined]) expect(target(raw, index), String(index)).toBeNull();
    for (const invalid of [null, {}, { index: 1, id: selected.id }, { ...selected, signature: '' }, { ...selected, id: 'other-id' }, { ...selected, index: '1' }]) expect(resolve(raw, invalid)).toMatchObject({ ok: false, state: 'stale', record: null, index: -1, records: canonical });
    for (const changed of [[raw[1], raw[0]], [raw[0], { ...raw[1], title: 'A later name' }], [raw[0], { ...raw[1], savedAt: savedAt + 2 }], [raw[0], { ...raw[1], evidence: evidence('Later') }], [raw[0]]]) {
      const frozen = deepFreeze(clone(changed)), before = JSON.stringify(frozen);
      expect(resolve(frozen, selected)).toMatchObject({ ok: false, state: 'stale', record: null, index: -1 });
      expect(remove(frozen, selected)).toMatchObject({ ok: false, state: 'stale', records: canonicalRecords(frozen) }); expect(JSON.stringify(frozen)).toBe(before);
    }
  });

  it('splices only the exact indexed original and counts identical remaining siblings in its detached memento', async () => {
    await mount();
    for (const raw of [[record(), secondRecord(), record({ id: 'other' })], [record(), record(), secondRecord()]]) {
      const frozen = deepFreeze(raw), before = JSON.stringify(frozen), originals = canonicalRecords(frozen), result = remove(frozen, target(frozen, 1));
      expect(result).toMatchObject({ ok: true, state: 'removed', index: 1, record: originals[1], records: [originals[0], originals[2]] });
      expect(result.removed).toEqual({ record: originals[1], index: 1, matchingRemaining: raw[0].title === raw[1].title ? 1 : 0 });
      expect(result.removed.record).not.toBe(raw[1]); expect(result.removed.record.evidence).not.toBe(raw[1].evidence); expect(JSON.stringify(frozen)).toBe(before);
    }
  });

  it('restores the removed occurrence among identical and different same-ID siblings at the original or clamped position', async () => {
    await mount(); const raw = [record(), record(), secondRecord()], originals = canonicalRecords(raw), result = remove(raw, target(raw, 1)), memento = deepFreeze(result.removed), before = JSON.stringify(memento);
    const restored = restore(deepFreeze(result.records), memento);
    expect(restored).toMatchObject({ ok: true, state: 'ready', position: 1, limit: 12, record: originals[1], records: originals });
    const renamed = result.records.map((item, index) => index === 0 ? { ...item, title: 'Later renamed sibling' } : item);
    expect(restore(renamed, memento)).toMatchObject({ ok: true, state: 'ready', records: [renamed[0], originals[1], renamed[1]] });
    expect(restore([], { ...memento, index: 99 })).toMatchObject({ ok: true, state: 'ready', position: 0, records: [originals[1]] });
    expect(JSON.stringify(memento)).toBe(before);
  });

  it('keeps a valid memento blocked at twelve originals and rejects malformed recovery without mutation', async () => {
    await mount(); const raw = [record(), secondRecord()], result = remove(raw, target(raw, 1)), memento = deepFreeze(result.removed), full = deepFreeze(Array.from({ length: 12 }, (_, index) => record({ id: 'full-' + index, title: 'Full original ' + index }))), original = JSON.stringify({ full, memento });
    expect(restore(full, memento)).toMatchObject({ ok: false, state: 'full', position: null, limit: 12, records: canonicalRecords(full) });
    for (const invalid of [null, {}, { record: result.removed.record, index: -1, matchingRemaining: 0 }, { ...result.removed, index: .5 }, { ...result.removed, index: '1' }, { ...result.removed, matchingRemaining: -1 }, { ...result.removed, matchingRemaining: .5 }]) expect(restore(result.records, invalid)).toMatchObject({ ok: false, state: 'unavailable', position: null, records: result.records });
    expect(JSON.stringify({ full, memento })).toBe(original);
    expect(restore(full.slice(0, 11), memento)).toMatchObject({ ok: true, state: 'ready', position: 1 });
  });

  it('recognizes an already restored occurrence before capacity while allowing the removal-time duplicate multiplicity', async () => {
    await mount(); const raw = [record(), record()], removed = remove(raw, target(raw, 1));
    expect(restore(removed.records, removed.removed)).toMatchObject({ ok: true, state: 'ready', records: canonicalRecords(raw) });
    const full = canonicalRecords([record(), record(), ...Array.from({ length: 10 }, (_, i) => secondRecord({ id: 'other-' + i }))]);
    expect(restore(full, removed.removed)).toMatchObject({ ok: false, state: 'already-present', position: null, records: full });
    expect(restore([secondRecord()], { ...removed.removed, matchingRemaining: 0 })).toMatchObject({ ok: true, state: 'ready' });
  });

  it('keeps every current duplicate and all incoming occurrences of a previously absent identifier', async () => {
    await mount(); const current = deepFreeze(workspace({ experiments: [record(), record(), secondRecord()] })), incoming = deepFreeze(workspace({ experiments: [record({ id: 'new-id', title: 'Incoming first', savedAt: savedAt + 3 }), secondRecord({ id: 'new-id', title: 'Incoming second', savedAt: savedAt + 2 })] })), before = JSON.stringify({ current, incoming });
    const actual = merge(current, incoming);
    expect(actual.experiments).toEqual(sortedRecords([...current.experiments, ...incoming.experiments])); expect(actual.experiments).toHaveLength(5);
    sameDraft(actual, helpers.sanitizeEcosystemWorkspace(current)); expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('treats __proto__ and constructor as literal archive IDs without losing current or incoming originals', async () => {
    await mount(); const current = workspace({ experiments: [record({ id: '__proto__' }), secondRecord({ id: '__proto__' })] }), incoming = workspace({ experiments: [record({ id: '__proto__', title: 'Must not replace current' }), record({ id: 'constructor', title: 'Constructor first' }), secondRecord({ id: 'constructor', title: 'Constructor second' })] });
    const actual = merge(current, incoming);
    expect(actual.experiments).toHaveLength(4); expect(actual.experiments.filter(item => item.id === '__proto__')).toEqual(sortedRecords(current.experiments));
    expect(actual.experiments.filter(item => item.id === 'constructor')).toHaveLength(2); expect(actual.experiments.some(item => item.title === 'Must not replace current')).toBe(false); expect({}.polluted).toBeUndefined();
  });

  it('preserves existing-ID import policy and twelve duplicate originals across repeated idempotent imports', async () => {
    await mount(); const current = workspace({ experiments: Array.from({ length: 12 }, (_, index) => index % 2 ? secondRecord({ title: 'Original ' + index, savedAt: savedAt + index }) : record({ title: 'Original ' + index, savedAt: savedAt + index })) }), incoming = workspace({ experiments: [secondRecord({ title: 'Incoming replacement', savedAt: savedAt + 100 })] });
    const once = merge(current, incoming), twice = merge(once, incoming);
    expect(once.experiments).toEqual(sortedRecords(current.experiments)); expect(once.experiments).toHaveLength(12); expect(twice).toEqual(once);
    const absentDuplicates = workspace({ experiments: [record({ id: 'new-id' }), secondRecord({ id: 'new-id' })] });
    const initial = merge(freshWorkspace(), absentDuplicates); expect(merge(initial, absentDuplicates)).toEqual(initial);
  });

  it('counts duplicate occurrences toward capacity and rejects a thirteen-record merge without changing either backup', async () => {
    await mount(); const current = deepFreeze(workspace({ experiments: Array.from({ length: 11 }, () => record()) })), incoming = deepFreeze(workspace({ experiments: [record({ id: 'fresh-id' }), secondRecord({ id: 'fresh-id' })] })), before = JSON.stringify({ current, incoming });
    expect(() => merge(current, incoming)).toThrow('experiment-capacity'); expect(JSON.stringify({ current, incoming })).toBe(before);
    const accepted = merge(current, { ...incoming, experiments: [incoming.experiments[0]] }); expect(accepted.experiments).toHaveLength(12); expect(accepted.experiments.filter(item => item.id === 'shared-archive')).toHaveLength(11);
  });

  it('accepts a draft-only backup into absent, empty-object and untouched default workspaces without saved archives', async () => {
    await mount(); const incoming = deepFreeze(workspace({ experiments: [], parkedDraft: parked(), investigationId: 'oxygen-buffer' })), payload = helpers.buildLearningPortfolio({ ecosystemWorkspace: incoming }, [], []), expected = helpers.sanitizeEcosystemWorkspace(incoming);
    for (const current of [undefined, null, {}, freshWorkspace()]) { expect(helpers.ecosystemWorkspaceHasWork(current)).toBe(false); const actual = helpers.mergeLearningPortfolio(current === undefined ? {} : { ecosystemWorkspace: current }, payload, []).ecosystemWorkspace; expect(actual).toEqual(expected); }
    expect(expected.experiments).toEqual([]); expect(expected.measurements).toHaveLength(1); expect(expected.parkedDraft.evidence).toEqual(evidence('Parked'));
  });

  it('guards raw writing including whitespace, every CER field, captures, baseline, question, parked work and saved originals independently', async () => {
    await mount(); const incoming = workspace({ experiments: [] });
    const patches = [
      { observation: '  ' }, { prediction: '  ' },
      ...['claim', 'evidence', 'reasoning', 'nextTest'].map(key => ({ evidence: { ...freshWorkspace().evidence, [key]: '  ' } })),
      { measurements: [importedNote()] }, { baselineScenario: scenario() }, { investigationId: 'oxygen-buffer' }, { parkedDraft: parked() }, { experiments: [record()] }
    ];
    for (const patch of patches) {
      const current = deepFreeze(freshWorkspace(patch)); expect(helpers.ecosystemWorkspaceHasWork(current), JSON.stringify(patch)).toBe(true);
      const merged = merge(current, incoming), expected = helpers.sanitizeEcosystemWorkspace(current);
      sameDraft(merged, expected); expect(merged.experiments).toEqual(expected.experiments);
    }
  });

  it('guards canonical scenario edits and explicit complete zero stock while ignoring input order and unused raw keys', async () => {
    await mount(); const initial = freshWorkspace(), reordered = { ...initial, organisms: { phytoplankton: 1, kelp: 2, mussel: 2, oyster: 2 }, water: { exchange: 82, ammonia: .04, pH: 8, oxygen: 8.8, salinity: 30, temperature: 13 }, ignored: 'Not authored scenario data' };
    expect(helpers.ecosystemWorkspaceHasWork(reordered)).toBe(false);
    for (const current of [freshWorkspace({ organisms: {} }), freshWorkspace({ organisms: { ...initial.organisms, oyster: 3 } }), freshWorkspace({ water: { ...initial.water, oxygen: 7.4 } }), freshWorkspace({ disturbanceId: 'heatwave' }), freshWorkspace({ environmentId: 'raceway' })]) {
      expect(helpers.ecosystemWorkspaceHasWork(current)).toBe(true); sameDraft(merge(current, workspace({ experiments: [] })), helpers.sanitizeEcosystemWorkspace(current));
    }
    expect(helpers.ecosystemWorkspaceHasWork({})).toBe(false); expect(merge(reordered, workspace({ experiments: [] })).prediction).toBe('Current unfinished prediction.');
  });

  it('does not manufacture an incoming ecosystem draft when the backup learning data omits that workspace', async () => {
    await mount(); const payload = { kind: 'aquaculture-learning-portfolio', version: 1, learning: {} };
    for (const current of [{}, { ecosystemWorkspace: freshWorkspace() }, { ecosystemWorkspace: freshWorkspace({ organisms: {} }) }, { ecosystemWorkspace: workspace({ parkedDraft: parked() }) }]) {
      const before = JSON.stringify(current), expected = helpers.sanitizeLearningData(current, []).ecosystemWorkspace;
      // Existing backup policy sorts saved originals by date even when no ecosystem workspace is imported.
      expected.experiments = sortedRecords(expected.experiments);
      expect(helpers.mergeLearningPortfolio(deepFreeze(current), payload, []).ecosystemWorkspace).toEqual(expected); expect(JSON.stringify(current)).toBe(before);
    }
  });

  it('preserves all current draft fields and parked provenance while adding duplicate backup originals', async () => {
    await mount(); const current = deepFreeze(workspace({ parkedDraft: parked(), investigationId: 'oxygen-buffer' })), incoming = deepFreeze(workspace({ prediction: 'Incoming draft must stay separate.', evidence: evidence('Incoming'), experiments: [record({ id: 'incoming-id' }), secondRecord({ id: 'incoming-id' })], parkedDraft: null })), before = JSON.stringify({ current, incoming }), actual = merge(current, incoming);
    sameDraft(actual, helpers.sanitizeEcosystemWorkspace(current)); expect(actual.experiments).toEqual(sortedRecords([...current.experiments, ...incoming.experiments])); expect(JSON.stringify({ current, incoming })).toBe(before);
  });

  it('renames only the selected same-ID card while keeping its input node, focused typing and caret', async () => {
    await mount(); const before = clone(storedWorkspace()), field = cardAt(1).querySelector('input'); field.focus();
    for (const value of ['Second renamed original', 'Second renamed original!', 'Second Xrenamed original!']) {
      await change(field, value, [7, 7]); expect(cardAt(1).querySelector('input')).toBe(field); expect(document.activeElement).toBe(field); expect(field.selectionStart).toBe(7); expect(field.selectionEnd).toBe(7); expect(field.value).toBe(value);
      const expected = clone(before.experiments); expected[1].title = value; expect(storedWorkspace().experiments).toEqual(expected); sameDraft(storedWorkspace(), before);
    }
  });

  it('downloads the selected second original with its exact frozen writing, measurements, model and A/B provenance', async () => {
    await mount(); const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), download = captureDownload(), writes = vi.spyOn(Storage.prototype, 'setItem');
    await click(findButton(cardAt(1), 'Download report'));
    expect(download.createObjectURL).toHaveBeenCalledOnce(); expect(download.name()).toBe('aquaculture-investigation-shared-archive.html');
    const html = await download.read(); expect(html).toBe(helpers.ecosystemExperimentHtml(before.experiments[1]));
    const parsed = new DOMParser().parseFromString(html, 'text/html'); expect(parsed.body.textContent).toContain(before.experiments[1].prediction); expect(parsed.body.textContent).toContain(before.experiments[1].evidence.nextTest); expect(parsed.body.textContent).toContain(before.experiments[1].modelVersion); expect(parsed.body.textContent).not.toContain(before.experiments[0].observation);
    expect(storedWorkspace()).toEqual(before); expect(localStorage.getItem(storageKey)).toBe(durable); expect(writes).not.toHaveBeenCalled();
  });

  it('replays the selected same-ID original and parks the entire newer draft while retaining every archive', async () => {
    await mount(workspace({ investigationId: 'oxygen-buffer' })); const before = clone(storedWorkspace()), chosen = before.experiments[1];
    await click(findButton(cardAt(1), 'Replay experiment')); const after = storedWorkspace();
    expect(helpers.ecosystemChanges(chosen.currentScenario, after)).toEqual([]); expect(after.baselineScenario).toEqual(chosen.baselineScenario); expect(after.prediction).toBe(chosen.prediction); expect(after.measurements).toEqual(chosen.measurements); expect(after.observation).toBe(''); expect(after.evidence).toEqual(freshWorkspace().evidence); expect(after.experiments).toEqual(before.experiments);
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'investigationId']) expect(after.parkedDraft[key], key).toEqual(before[key]);
    await click(findButton(host, 'Return to my draft')); expect(storedWorkspace()).toEqual(before);
  });

  it('branches from the selected same-ID original and restores the exact parked current draft', async () => {
    await mount(workspace({ investigationId: 'flow-response' })); const before = clone(storedWorkspace()), chosen = before.experiments[1];
    await click(findButton(cardAt(1), 'Use saved B as A')); const after = storedWorkspace();
    expect(after.baselineScenario).toEqual(chosen.currentScenario); expect(helpers.ecosystemChanges(chosen.currentScenario, after)).toEqual([]); expect(after.prediction).toBe(''); expect(after.observation).toBe(''); expect(after.evidence).toEqual(freshWorkspace().evidence); expect(after.measurements).toEqual([]); expect(after.experiments).toEqual(before.experiments);
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'measurements', 'investigationId']) expect(after.parkedDraft[key], key).toEqual(before[key]);
    await click(findButton(host, 'Return to my draft')); expect(storedWorkspace()).toEqual(before);
  });

  it('removes only the selected distinct duplicate, restores its ordinal, and describes a later capacity-blocked Undo', async () => {
    await mount(workspace({ parkedDraft: parked(), experiments: [record(), secondRecord(), ...Array.from({ length: 10 }, (_, i) => record({ id: 'unique-' + i, title: 'Unique ' + i }))] })); const before = clone(storedWorkspace());
    await click(findButton(cardAt(1), 'Remove')); expect(storedWorkspace().experiments).toEqual([before.experiments[0], ...before.experiments.slice(2)]); sameDraft(storedWorkspace(), before); expect(document.activeElement).toBe(host.querySelector('#aq-saved-experiments-heading'));
    expect(undo().tagName).toBe('BUTTON'); expect(undo().getAttribute('aria-describedby')).toBe('aq-archive-undo-status'); expect(status().tagName).toBe('P'); expect(status().querySelector('button,input,select,[role="status"]')).toBeNull();
    await click(undo()); expect(storedWorkspace()).toEqual(before); expect(recovery()).toBeNull();
    await click(findButton(cardAt(1), 'Remove')); await click(findButton(host, 'Save snapshot evidence'));
    expect(storedWorkspace().experiments).toHaveLength(12); expect(undo().disabled).toBe(true); expect(status().textContent).toMatch(/12|space|full/i); const full = clone(storedWorkspace()); await act(async () => undo().click()); expect(storedWorkspace()).toEqual(full);
  });

  it('removes and restores one byte-identical original without losing or inventing same-ID sibling occurrences', async () => {
    await mount(workspace({ experiments: [record(), record(), secondRecord()], parkedDraft: parked() })); const before = clone(storedWorkspace());
    await click(findButton(cardAt(1), 'Remove')); expect(cards()).toHaveLength(2); expect(storedWorkspace().experiments).toEqual([before.experiments[0], before.experiments[2]]); expect(undo().disabled).toBe(false); sameDraft(storedWorkspace(), before);
    await change(host.querySelector('#aq-eco-evidence-nextTest'), 'Later next test must survive Undo.'); const later = clone(storedWorkspace());
    await click(undo()); expect(cards()).toHaveLength(3); expect(storedWorkspace().experiments).toEqual(before.experiments); sameDraft(storedWorkspace(), later); expect(recovery()).toBeNull();
  });

  it('preserves ambiguous pair review and provides unique native described card controls with literal unsafe-looking names', async () => {
    const label = '<img src=x onerror=alert(1)> & original';
    await mount(workspace({ experiments: [record({ title: label }), secondRecord(), record({ id: 'constructor', title: 'Unique constructor' }), record({ id: '__proto__', title: 'Unique prototype' })] })); const before = clone(storedWorkspace());
    for (const select of host.querySelectorAll('.aq-saved-comparison select')) { const duplicates = [...select.options].filter(option => option.value === 'shared-archive'); expect(duplicates).toHaveLength(2); for (const option of duplicates) { expect(option.disabled).toBe(true); expect(option.textContent).toContain('duplicate identifier'); } expect([...select.options].filter(option => option.selected).map(option => option.value)[0]).not.toBe('shared-archive'); }
    const ids = [...host.querySelectorAll('.aq-experiment-record [id]')].map(element => element.id); expect(new Set(ids).size).toBe(ids.length);
    for (const [index, card] of cards().entries()) {
      expect(card.dataset.experimentIndex).toBe(String(index)); expect(card.querySelector('input').labels).toHaveLength(1); expect(card.querySelector('h4').id).toBe('aq-record-heading-' + index);
      for (const button of card.querySelectorAll('.aq-record-actions button')) { expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.getAttribute('aria-label')).toContain('experiment ' + (index + 1) + ':'); }
    }
    for (const index of [0, 1]) { const note = host.querySelector('#aq-record-identity-note-' + index); expect(note.tagName).toBe('P'); expect(note.textContent).toMatch(/identifier|original|record/i); }
    expect(cardAt(0).querySelector('h4').textContent).toBe(label); expect(cardAt(0).querySelector('img,script')).toBeNull(); expect(findButton(cardAt(2), 'Replay experiment').disabled).toBe(false); expect(findButton(cardAt(3), 'Download report').disabled).toBe(false); expect(storedWorkspace()).toEqual(before);
  });

  it('keeps archive Undo and measurement recovery through absent, malformed, oversized, unreadable, overflowing and unsaved imports', async () => {
    await mount(workspace({ parkedDraft: parked() })); await click(findButton(cardAt(1), 'Remove')); await click(findButton(host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)'), 'Remove reading'));
    const before = clone(storedWorkspace()), removedKey = host.querySelector('.aq-removed-measurement').dataset.removedKey;
    for (const options of [{ noFile: true }, {}, { size: 1024 * 1024 + 1 }, { error: true }]) {
      await importBackup('not-json', options); expect(storedWorkspace()).toEqual(before); expect(undo().disabled).toBe(false); expect(host.querySelector('.aq-removed-measurement').dataset.removedKey).toBe(removedKey);
    }
    const overflowing = helpers.buildLearningPortfolio({ ecosystemWorkspace: workspace({ experiments: Array.from({ length: 12 }, (_, i) => record({ id: 'import-' + i })) }) }, [], []);
    await importBackup(overflowing); expect(storedWorkspace()).toEqual(before); expect(undo()).toBeTruthy();
    const writes = failDeviceWrites(); await importBackup(helpers.buildLearningPortfolio({ ecosystemWorkspace: before }, [], [])); writes.mockRestore();
    expect(storedWorkspace()).toEqual(before); expect(undo().disabled).toBe(false); expect(host.querySelector('.aq-removed-measurement').dataset.removedKey).toBe(removedKey);
    await click(undo()); expect(storedWorkspace().experiments).toEqual(canonicalRecords([record(), secondRecord()])); sameDraft(storedWorkspace(), before);
  });

  it('clears archive Undo only after a successful import and preserves current work plus every merged original', async () => {
    await mount(workspace({ parkedDraft: parked() })); await click(findButton(cardAt(1), 'Remove')); const before = clone(storedWorkspace()); expect(undo()).toBeTruthy();
    const incoming = workspace({ experiments: [record({ id: 'incoming', title: 'Incoming first' }), secondRecord({ id: 'incoming', title: 'Incoming second' })] });
    await importBackup(helpers.buildLearningPortfolio({ ecosystemWorkspace: incoming }, [], []));
    expect(undo()).toBeUndefined(); expect(recovery()).toBeNull(); sameDraft(storedWorkspace(), before); expect(storedWorkspace().experiments).toEqual(sortedRecords([...before.experiments, ...incoming.experiments]));
    await importBackup(helpers.buildLearningPortfolio({ ecosystemWorkspace: incoming }, [], [])); expect(storedWorkspace().experiments).toHaveLength(3); sameDraft(storedWorkspace(), before);
  });

  it('keeps selected removals, Undo and later writing in the page through device-save failure and retries the exact originals', async () => {
    await mount(workspace({ parkedDraft: parked() })); const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), writes = failDeviceWrites();
    await click(findButton(cardAt(1), 'Remove')); expect(cards()).toHaveLength(1); expect(cardAt(0).querySelector('h4').textContent).toBe(before.experiments[0].title); expect(undo().disabled).toBe(false); expect(localStorage.getItem(storageKey)).toBe(durable); expect(host.querySelector('.aq-storage-recovery')).toBeTruthy();
    await change(host.querySelector('#aq-eco-evidence-reasoning'), 'Later reasoning held in this page.'); await click(undo()); expect(cards()).toHaveLength(2); expect(cardAt(1).querySelector('h4').textContent).toBe(before.experiments[1].title); expect(recovery()).toBeNull(); expect(localStorage.getItem(storageKey)).toBe(durable); expect(host.querySelector('#aq-eco-evidence-reasoning').value).toBe('Later reasoning held in this page.');
    writes.mockRestore(); await click(findButton(host, 'Retry device save')); expect(host.querySelector('.aq-storage-recovery')).toBeNull(); expect(storedWorkspace().experiments).toEqual(before.experiments); expect(storedWorkspace().evidence.reasoning).toBe('Later reasoning held in this page.');
    const expected = clone(before); expected.evidence.reasoning = 'Later reasoning held in this page.'; sameDraft(storedWorkspace(), expected);
  });

  it.each(['rename', 'export', 'replay', 'branch', 'remove'])('rejects a stale %s card target after a stored original changes without altering later work or recovery', async action => {
    await mount(); await click(findButton(host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)'), 'Remove reading')); const removedKey = host.querySelector('.aq-removed-measurement').dataset.removedKey;
    const later = clone(storedWorkspace()); later.experiments[1].title = 'A newer externally saved name'; later.experiments[1].evidence.reasoning = 'Newer frozen original reasoning'; later.prediction = 'A newer prediction from the current state'; later.evidence.nextTest = 'A newer current next test'; later.parkedDraft = helpers.sanitizeEcosystemWorkspace(workspace({ parkedDraft: parked() })).parkedDraft;
    const state = JSON.parse(localStorage.getItem(storageKey)); state.ecosystemWorkspace = later; localStorage.setItem(storageKey, JSON.stringify(state));
    const durable = localStorage.getItem(storageKey), download = captureDownload(), writes = vi.spyOn(Storage.prototype, 'setItem');
    if (action === 'rename') await change(cardAt(1).querySelector('input'), 'Attempted stale rename');
    else await click(findButton(cardAt(1), { export: 'Download report', replay: 'Replay experiment', branch: 'Use saved B as A', remove: 'Remove' }[action]));
    expect(storedWorkspace()).toEqual(later); expect(localStorage.getItem(storageKey)).toBe(durable); expect(writes).not.toHaveBeenCalled(); expect(download.createObjectURL).not.toHaveBeenCalled(); expect(recovery()).toBeNull(); expect(host.querySelector('.aq-removed-measurement').dataset.removedKey).toBe(removedKey);
    expect(cardAt(1).querySelector('h4').textContent).toBe(later.experiments[1].title); expect(cardAt(1).querySelector('input').value).toBe(later.experiments[1].title);
    expect(host.querySelector('.aq-loop-prediction-record').textContent).toContain(later.prediction); expect(host.querySelector('#aq-eco-evidence-nextTest').value).toBe(later.evidence.nextTest);
  });
});
