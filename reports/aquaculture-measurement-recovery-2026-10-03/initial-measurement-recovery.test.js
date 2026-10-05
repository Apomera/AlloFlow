import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const capturedAt = Date.parse('2026-10-02T12:00:00.000Z');
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, kelp: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const evidence = () => ({ claim: 'Keep my original claim.', evidence: 'Keep my original Evidence writing.', reasoning: 'Keep my original mechanism.', nextTest: 'Keep my next test.' });
const workspace = (patch = {}) => ({ ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'Keep my original prediction.', observation: 'Keep this existing reflection while I restore an original frozen reading.', evidence: evidence(), measurements: [], experiments: [], ...patch });
const importedNote = (patch = {}) => ({ id: 'original-reading', capturedAt, modelVersion: '2026.10-stock-feedback', scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 4.1234, b: 5.6794, baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), currentScenario: scenario(), ...patch });
const archive = (notes = [importedNote()]) => ({ id: 'original-investigation', title: 'Original saved investigation', kind: 'comparison', modelVersion: '2026.09-original', savedAt: capturedAt, baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), currentScenario: scenario(), observation: 'Keep the archived original explanation.', evidence: evidence(), measurements: notes });
const parked = () => ({ ...scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, salinity: 1, oxygen: 11 } }), prediction: 'Keep the parked prediction.', observation: 'Keep the parked explanation.', evidence: evidence(), measurements: [importedNote({ id: 'parked-reading' })] });
const preservedWorkspace = (patch = {}) => workspace({ measurements: [importedNote()], experiments: [archive()], parkedDraft: parked(), ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
const findButton = (scope, label) => [...scope.querySelectorAll('button')].find(element => element.textContent.trim() === label);
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}

describe('Aquaculture removed-reading recovery', () => {
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
    root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
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
  const canonical = note => helpers.sanitizeEcosystemMeasurements([note])[0];
  const removal = (notes, id) => helpers.ecosystemMeasurementRemoval(notes, id);
  const restore = (notes, removed) => helpers.restoreEcosystemMeasurement(notes, removed);
  const liveNotebook = () => host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)');
  const rowFor = id => [...liveNotebook().querySelectorAll('[data-measurement-id]')].find(row => row.dataset.measurementId === id);
  const tray = () => host.querySelector('.aq-measurement-recovery');
  const removedRows = () => [...host.querySelectorAll('.aq-removed-measurement[data-removed-key]')];
  const removedRowFor = note => removedRows().find(row => row.querySelector('.aq-measurement-reading').textContent === reading(note) && row.querySelector('h5').textContent === heading(note));
  const heading = note => helpers.ecosystemMeasurementText(note).split(': ')[0];
  const reading = note => helpers.ecosystemMeasurementText(note).slice(heading(note).length + 2).split('. Model ')[0];
  const recoveryStatus = row => row.querySelector('#aq-recovery-status-' + row.dataset.removedKey);
  const restoreButton = row => findButton(row, 'Restore reading');
  const assertFocused = id => {
    const element = host.querySelector('#' + id); expect(element).toBeTruthy(); expect(document.activeElement).toBe(element);
    for (let parent = element.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') expect(parent.open).toBe(true);
  };
  const assertOtherWork = before => {
    const after = storedWorkspace();
    for (const field of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'experiments', 'parkedDraft', 'investigationId']) expect(after[field], field).toEqual(before[field]);
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  };
  async function removeReading(id) { await click(findButton(rowFor(id), 'Remove reading')); }
  async function captureAnnual(metric = 'minOxygen') { await change(host.querySelector('#aq-measurement-annual-metric'), metric); await click(findButton(host, 'Record annual result')); }
  function stubCaptureIdentity() {
    vi.spyOn(Date, 'now').mockReturnValue(capturedAt); vi.spyOn(Math, 'random').mockReturnValue(.25);
    return 'm-' + capturedAt.toString(36) + '-' + (.25).toString(36).slice(2, 7);
  }
  async function importBackup(payload, { size = 20, error = false, noFile = false } = {}) {
    await click(findButton(host, 'Home'));
    const input = host.querySelector('#aq-portfolio-import'); expect(input).toBeTruthy();
    vi.stubGlobal('FileReader', class {
      readAsText() { this.result = typeof payload === 'string' ? payload : JSON.stringify(payload); if (error) this.onerror(); else this.onload(); }
    });
    Object.defineProperty(input, 'files', { configurable: true, value: noFile ? [] : [{ size }] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(findButton(host, 'Ecosystem builder'));
  }

  it('removes exactly the requested canonical reading with its original index and detached frozen provenance', async () => {
    await mount();
    const raw = deepFreeze([importedNote({ id: 'before', b: 3 }), importedNote(), importedNote({ id: 'after', b: 6 })]), original = JSON.stringify(raw);
    const result = removal(raw, 'original-reading');
    expect(result).toMatchObject({ ok: true, reason: 'removed', removed: { note: canonical(raw[1]), index: 1 } });
    expect(result.measurements).toEqual(helpers.sanitizeEcosystemMeasurements([raw[0], raw[2]]));
    expect(result.removed.note).not.toBe(raw[1]); expect(result.removed.note.currentScenario.water).not.toBe(raw[1].currentScenario.water);
    result.removed.note.currentScenario.water.oxygen = 2; result.measurements[0].baselineScenario.water.oxygen = 2;
    expect(JSON.stringify(raw)).toBe(original);
  });

  it('reports a missing removal without a memento and retains only valid unique canonical notebook rows', async () => {
    await mount();
    const note = importedNote(), raw = deepFreeze([{}, note, { ...clone(note), b: 2 }, importedNote({ id: 'second', b: 6 }), null]), original = JSON.stringify(raw);
    for (const id of ['missing', '', null, undefined]) {
      const result = removal(raw, id);
      expect(result).toEqual({ ok: false, reason: 'missing', measurements: helpers.sanitizeEcosystemMeasurements(raw), removed: null });
    }
    expect(JSON.stringify(raw)).toBe(original);
  });

  it('restores near the original position while preserving the order of all later notebook rows', async () => {
    await mount();
    const notes = [importedNote({ id: 'before', b: 3 }), importedNote({ id: 'after', b: 6 })].map(canonical), note = canonical(importedNote());
    for (const index of [0, 1, 2, 50]) {
      const source = deepFreeze(clone(notes)), memento = deepFreeze({ note: clone(note), index }), result = restore(source, memento), position = Math.min(index, notes.length);
      expect(result).toMatchObject({ ok: true, state: 'ready', note, matchId: '', count: 2, remaining: 6, limit: 8, position });
      expect(result.measurements.map(item => item.id)).toEqual([...notes.slice(0, position).map(item => item.id), note.id, ...notes.slice(position).map(item => item.id)]);
      expect(result.measurements[position]).not.toBe(memento.note); expect(result.note.currentScenario.water).not.toBe(memento.note.currentScenario.water);
      expect(source).toEqual(notes); expect(memento).toEqual({ note, index });
    }
  });

  it('restores original zero values, missing capture date, old model and recorded events without regeneration', async () => {
    await mount();
    const note = canonical(importedNote({ scope: 'month', month: 6, metricId: 'oxygen', capturedAt: 0, modelVersion: '2026.09-original', a: 0, b: 0, aEvent: 'Original A event', bEvent: 'Original B event' })), removed = deepFreeze({ note, index: 0 });
    const result = restore([], removed);
    expect(result).toMatchObject({ ok: true, state: 'ready', measurements: [note], note, count: 0, remaining: 8, position: 0 });
    expect(helpers.ecosystemMeasurementText(result.note)).toContain('Captured date not recorded.');
    expect(result.note.aEvent).toBe('Original A event'); expect(result.note.bEvent).toBe('Original B event'); expect(result.note.modelVersion).toBe('2026.09-original');
    expect(result.note).toEqual(note); expect(result.note).not.toBe(note);
  });

  it('recognizes the identical canonical ID before a full notebook without adding or overwriting anything', async () => {
    await mount();
    const note = canonical(importedNote()), full = deepFreeze([note, ...Array.from({ length: 7 }, (_, index) => canonical(importedNote({ id: 'full-' + index, b: index + .1 })))]), removed = deepFreeze({ note: clone(note), index: 7 });
    const result = restore(full, removed);
    expect(result).toMatchObject({ ok: false, state: 'already-present', measurements: full, note, matchId: note.id, count: 8, remaining: 0, limit: 8, position: null });
    expect(full).toHaveLength(8); expect(result.measurements[0]).not.toBe(full[0]); expect(removed.note).toEqual(note);
  });

  it('keeps a different same-ID reading as a conflict even when another ID exactly matches the removed capture', async () => {
    await mount();
    const note = canonical(importedNote()), removed = deepFreeze({ note, index: 0 });
    for (const patch of [{ b: note.b + .1 }, { capturedAt: note.capturedAt + 1 }, { metricLabel: 'Different original label' }, { currentScenario: scenario({ water: { ...water, oxygen: 3 } }) }]) {
      const current = deepFreeze([canonical({ ...clone(note), ...patch }), canonical({ ...clone(note), id: 'matching-other-id', capturedAt: 0 })]), result = restore(current, removed);
      expect(result).toMatchObject({ ok: false, state: 'conflict', measurements: current, note, matchId: note.id, count: 2, remaining: 6, position: null });
      expect(current[0]).not.toEqual(note); expect(removed.note).toEqual(note);
    }
  });

  it('matches a different ID by exact capture signature ignoring only the ID and date, including at capacity', async () => {
    await mount();
    const note = canonical(importedNote({ scope: 'month', month: 6, metricId: 'stress', speciesId: 'oyster', aEvent: 'Original A event', bEvent: 'Original B event' })), match = canonical({ ...clone(note), id: 'current-match', capturedAt: 0 });
    const full = deepFreeze([match, ...Array.from({ length: 7 }, (_, index) => canonical(importedNote({ id: 'full-' + index, b: index + .1 })))]), result = restore(full, { note, index: 0 });
    expect(result).toMatchObject({ ok: false, state: 'already-present', measurements: full, matchId: match.id, count: 8, remaining: 0, position: null });
    const variants = [{ a: note.a + .1 }, { b: note.b + .1 }, { month: 7 }, { speciesId: 'mussel' }, { modelVersion: '2026.09-other' }, { metricLabel: 'Different recorded label' }, { unit: 'units' }, { deltaUnit: 'delta units' }, { aEvent: 'Other A event' }, { bEvent: 'Other B event' }, { aState: 'not-recorded', a: null }, { bState: 'not-recorded', b: null }, { baselineScenario: scenario({ water: { ...water, oxygen: 10 } }) }, { currentScenario: scenario({ water: { ...water, oxygen: 3 } }) }];
    for (const patch of variants) {
      const different = canonical({ ...clone(match), ...patch }); expect(different).toBeTruthy();
      expect(restore([different], { note, index: 0 }).state, JSON.stringify(patch)).toBe('ready');
    }
  });

  it('keeps a full notebook and its removed memento intact until another removal creates real space', async () => {
    await mount();
    const note = canonical(importedNote()), removed = deepFreeze({ note, index: 1 }), full = deepFreeze(Array.from({ length: 8 }, (_, index) => canonical(importedNote({ id: 'full-' + index, b: index + .1 })))), original = JSON.stringify({ full, removed });
    const blocked = restore(full, removed);
    expect(blocked).toMatchObject({ ok: false, state: 'full', measurements: full, note, matchId: '', count: 8, remaining: 0, limit: 8, position: null });
    const available = removal(full, 'full-3'), restored = restore(available.measurements, removed);
    expect(restored).toMatchObject({ ok: true, state: 'ready', count: 7, remaining: 1, position: 1 });
    expect(restored.measurements).toHaveLength(8); expect(restored.measurements[1]).toEqual(note); expect(JSON.stringify({ full, removed })).toBe(original);
  });

  it('makes invalid removed notes and non-integer or negative positions unavailable without changing valid current rows', async () => {
    await mount();
    const note = canonical(importedNote()), current = deepFreeze([canonical(importedNote({ id: 'current', b: 6 }))]);
    const invalid = [null, {}, { note, index: -1 }, { note, index: .5 }, { note, index: '0' }, { note, index: NaN }, { note, index: Infinity }, { note }, { note: null, index: 0 }, { note: {}, index: 0 }, { note: { ...clone(note), b: NaN }, index: 0 }, { note: { ...clone(note), currentScenario: {} }, index: 0 }];
    for (const removed of invalid) expect(restore(current, removed)).toMatchObject({ ok: false, state: 'unavailable', measurements: current, matchId: '', count: 1, remaining: 7, limit: 8, position: null });
    expect(current).toEqual([canonical(importedNote({ id: 'current', b: 6 }))]);
  });

  it('reveals a closed native session tray with original reading, plain described status and existing removal focus', async () => {
    await mount(preservedWorkspace());
    expect(tray()).toBeNull(); const before = clone(storedWorkspace()), note = before.measurements[0];
    const archived = host.querySelector('.aq-measurement-archive'); expect(archived.querySelector('.aq-measurement-recovery,.aq-removed-measurement')).toBeNull(); expect(findButton(archived, 'Restore reading')).toBeUndefined();
    await removeReading(note.id); assertFocused('aq-measurement-notebook-heading'); assertOtherWork(before);
    expect(storedWorkspace().measurements).toEqual([]); expect(tray().tagName).toBe('DETAILS'); expect(tray().open).toBe(false);
    expect(tray().querySelector('summary').textContent).toBe('Recently removed readings · 1/8 this session'); expect(tray().querySelector('h4').id).toBe('aq-measurement-recovery-heading');
    const row = removedRows()[0], status = recoveryStatus(row), button = restoreButton(row);
    expect(row.querySelector('h5').textContent).toBe(heading(note)); expect(row.querySelector('.aq-measurement-reading').textContent).toBe(reading(note)); expect(row.textContent).toContain(note.modelVersion); expect(row.textContent).toContain(new Date(note.capturedAt).toISOString());
    expect(status.tagName).toBe('P'); expect(status.getAttribute('role')).toBeNull(); expect(status.getAttribute('aria-live')).toBeNull(); expect(status.textContent).toContain('Notebook 0/8'); expect(status.closest('[role="status"],[aria-live]')).toBeNull();
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.disabled).toBe(false); expect(button.getAttribute('aria-label')).toBe('Restore reading: ' + heading(note)); expect(button.getAttribute('aria-describedby').split(/\s+/)).toContain(status.id);
    const writes = vi.spyOn(Storage.prototype, 'setItem'); tray().open = true; expect(writes).not.toHaveBeenCalled(); assertOtherWork(before);
  });

  it('restores only the chosen tray entry at its former index and focuses its new live row after render', async () => {
    const notes = [importedNote({ id: 'first', b: 3 }), importedNote(), importedNote({ id: 'third', b: 6 })];
    await mount(preservedWorkspace({ measurements: notes })); const before = clone(storedWorkspace()), middle = before.measurements[1], first = before.measurements[0];
    await removeReading(middle.id); await removeReading(first.id); expect(removedRows()).toHaveLength(2);
    const keepKey = removedRowFor(first).dataset.removedKey, target = removedRowFor(middle); await click(restoreButton(target));
    expect(storedWorkspace().measurements).toEqual([before.measurements[2], middle]); expect(removedRows()).toHaveLength(1); expect(removedRows()[0].dataset.removedKey).toBe(keepKey); assertOtherWork(before); assertFocused('aq-live-measurement-' + middle.id);
    await click(restoreButton(removedRows()[0])); expect(storedWorkspace().measurements).toEqual([first, before.measurements[2], middle]); expect(tray()).toBeNull(); assertOtherWork(before);
  });

  it('restores frozen provenance after later design and writing edits while preserving every later input and other note', async () => {
    await mount(preservedWorkspace({ measurements: [importedNote({ capturedAt: 0, modelVersion: '2026.09-original' }), importedNote({ id: 'other', b: 6 })] }));
    const removed = clone(storedWorkspace().measurements[0]); await removeReading(removed.id);
    await click(findButton(host, 'Replace scenario A')); await change(host.querySelector('#aq-eco-prediction'), 'Keep this later prediction.'); await change(host.querySelector('#aq-eco-oxygen'), '3'); await change(host.querySelector('#aq-eco-observation'), 'Keep this later reflection, written after removal.');
    for (const key of ['claim', 'evidence', 'reasoning', 'nextTest']) await change(host.querySelector('#aq-eco-evidence-' + key), 'Later ' + key + ' writing.');
    const later = clone(storedWorkspace()); await click(restoreButton(removedRows()[0])); assertOtherWork(later);
    expect(storedWorkspace().measurements).toEqual([removed, later.measurements[0]]); expect(storedWorkspace().measurements[0].capturedAt).toBe(0); expect(storedWorkspace().measurements[0].modelVersion).toBe('2026.09-original'); expect(storedWorkspace().measurements[0].currentScenario.water.oxygen).toBe(7);
  });

  it('deduplicates repeated removal of the exact same canonical capture but keeps distinct same-ID originals with unique keys', async () => {
    await mount(); const id = stubCaptureIdentity(); await captureAnnual(); const original = clone(storedWorkspace().measurements[0]); expect(original.id).toBe(id);
    await removeReading(id); await captureAnnual(); expect(storedWorkspace().measurements).toEqual([original]); expect(restoreButton(removedRows()[0]).disabled).toBe(true);
    await removeReading(id); expect(removedRows()).toHaveLength(1);
    await change(host.querySelector('#aq-eco-oxygen'), '3'); await captureAnnual('peakAmmonia'); const current = clone(storedWorkspace().measurements[0]); expect(current.id).toBe(id); expect(current).not.toEqual(original);
    const conflict = removedRows()[0], status = recoveryStatus(conflict); expect(status.textContent).toContain('different reading uses this identifier'); expect(restoreButton(conflict).disabled).toBe(true);
    const before = clone(storedWorkspace()), writes = vi.spyOn(Storage.prototype, 'setItem'); await click(findButton(conflict, 'Review current reading')); assertFocused('aq-live-measurement-' + id); expect(storedWorkspace()).toEqual(before); expect(writes).not.toHaveBeenCalled(); writes.mockRestore();
    await removeReading(id); expect(removedRows()).toHaveLength(2); expect(new Set(removedRows().map(row => row.dataset.removedKey)).size).toBe(2); expect(new Set(removedRows().map(row => recoveryStatus(row).id)).size).toBe(2); expect(removedRowFor(original)).toBeTruthy(); expect(removedRowFor(current)).toBeTruthy();
  });

  it('offers a native matching-reading review when a new ID has recaptured the same original signature', async () => {
    await mount(); vi.spyOn(Date, 'now').mockReturnValue(capturedAt); let random = .25; vi.spyOn(Math, 'random').mockImplementation(() => random);
    await captureAnnual(); const original = clone(storedWorkspace().measurements[0]); await removeReading(original.id); random = .5; await captureAnnual(); const matching = clone(storedWorkspace().measurements[0]); expect(matching.id).not.toBe(original.id);
    const row = removedRows()[0], status = recoveryStatus(row), restoreControl = restoreButton(row), review = findButton(row, 'Review matching reading');
    expect(restoreControl.disabled).toBe(true); expect(status.textContent).toContain('matching reading is already'); expect(review.tagName).toBe('BUTTON'); expect(review.type).toBe('button'); expect(review.getAttribute('aria-describedby').split(/\s+/)).toContain(status.id);
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), writes = vi.spyOn(Storage.prototype, 'setItem'); await act(async () => restoreControl.click()); await click(review); assertFocused('aq-live-measurement-' + matching.id);
    expect(storedWorkspace()).toEqual(before); expect(localStorage.getItem(storageKey)).toBe(durable); expect(writes).not.toHaveBeenCalled(); expect(removedRows()).toHaveLength(1);
  });

  it('keeps a full-tray original recoverable after a later removal frees notebook space', async () => {
    const notes = Array.from({ length: 8 }, (_, index) => importedNote({ id: 'full-' + index, metricLabel: 'Original source ' + index, b: index + .1 }));
    await mount(workspace({ measurements: notes })); const before = clone(storedWorkspace()), original = before.measurements[0]; await removeReading(original.id); await captureAnnual(); expect(storedWorkspace().measurements).toHaveLength(8);
    const blocked = removedRowFor(original); expect(restoreButton(blocked).disabled).toBe(true); expect(recoveryStatus(blocked).textContent).toContain('Notebook full at 8 readings');
    const full = clone(storedWorkspace()), writes = vi.spyOn(Storage.prototype, 'setItem'); await click(findButton(blocked, 'Review notebook space')); assertFocused('aq-measurement-notebook-heading'); await act(async () => restoreButton(blocked).click()); expect(storedWorkspace()).toEqual(full); expect(writes).not.toHaveBeenCalled(); writes.mockRestore();
    await removeReading('full-1'); const available = clone(storedWorkspace()); expect(restoreButton(removedRowFor(original)).disabled).toBe(false); await click(restoreButton(removedRowFor(original)));
    expect(storedWorkspace().measurements).toEqual([original, ...available.measurements]); expect(storedWorkspace().measurements).toHaveLength(8); expect(removedRows()).toHaveLength(1); expect(removedRowFor(before.measurements[1])).toBeTruthy(); expect(restoreButton(removedRows()[0]).disabled).toBe(true);
  });

  it('bounds recovery to the last eight distinct removed originals while keeping the oldest retained entry restorable', async () => {
    const notes = Array.from({ length: 8 }, (_, index) => importedNote({ id: 'sequence-' + index, metricLabel: 'Original source ' + index, b: index + .1 }));
    await mount(workspace({ measurements: notes })); const before = clone(storedWorkspace());
    for (const note of before.measurements) await removeReading(note.id);
    expect(removedRows()).toHaveLength(8); await captureAnnual(); const newest = clone(storedWorkspace().measurements[0]); await removeReading(newest.id);
    expect(removedRows()).toHaveLength(8); expect(tray().querySelector('summary').textContent).toBe('Recently removed readings · 8/8 this session'); expect(removedRowFor(before.measurements[0])).toBeUndefined();
    const oldestRetained = removedRowFor(before.measurements[1]); expect(oldestRetained).toBeTruthy(); expect(new Set(removedRows().map(row => row.dataset.removedKey)).size).toBe(8);
    await click(restoreButton(oldestRetained)); expect(storedWorkspace().measurements).toEqual([before.measurements[1]]); expect(removedRows()).toHaveLength(7); expect(removedRowFor(newest)).toBeTruthy();
  });

  it('keeps session recovery across water edits, scenario A replacement, presets, builder reset, archive rename and save', async () => {
    await mount(workspace({ measurements: [importedNote()], experiments: [archive()] })); const original = clone(storedWorkspace().measurements[0]); await removeReading(original.id); const key = removedRows()[0].dataset.removedKey;
    const assertRetained = () => { expect(removedRows()).toHaveLength(1); expect(removedRows()[0].dataset.removedKey).toBe(key); expect(removedRowFor(original)).toBeTruthy(); };
    await change(host.querySelector('#aq-eco-oxygen'), '3'); assertRetained(); await click(findButton(host, 'Replace scenario A')); assertRetained();
    await click(findButton(host, 'Finfish RAS + biofilter')); assertRetained(); await click(findButton(host, 'Reset builder')); assertRetained();
    await change(host.querySelector('.aq-record-name-label input'), 'Renamed original archive'); assertRetained();
    await change(host.querySelector('#aq-eco-observation'), 'A later explanation that is long enough to save as a snapshot.'); await click(findButton(host, 'Save snapshot evidence')); assertRetained();
    expect(storedWorkspace().experiments).toHaveLength(2); expect(storedWorkspace().experiments[0].measurements).toEqual([]); expect(storedWorkspace().experiments[1].title).toBe('Renamed original archive');
  });

  it.each(['guided question', 'branch', 'replay', 'return'])('clears only session recovery when a valid %s opens a different notebook', async action => {
    const seed = workspace({ measurements: [importedNote()], experiments: [archive()], ...(action === 'return' ? { parkedDraft: parked() } : {}) });
    await mount(seed); const before = clone(storedWorkspace()); await removeReading(before.measurements[0].id); expect(tray()).toBeTruthy();
    if (action === 'guided question') await click(host.querySelector('.aq-question-card'));
    else await click(findButton(host, action === 'branch' ? 'Use saved B as A' : action === 'replay' ? 'Replay experiment' : 'Return to my draft'));
    expect(tray()).toBeNull(); expect(removedRows()).toHaveLength(0); expect(storedWorkspace().experiments).toEqual(before.experiments);
    if (action === 'return') { expect(storedWorkspace().measurements).toEqual(before.parkedDraft.measurements); expect(storedWorkspace().parkedDraft).toBeNull(); }
    else { expect(storedWorkspace().parkedDraft.measurements).toEqual([]); expect(storedWorkspace().parkedDraft.evidence).toEqual(before.evidence); }
  });

  it('keeps recovery and all work through blocked guided, branch and replay actions and a duplicate capture no-op', async () => {
    await mount(preservedWorkspace({ measurements: [importedNote(), importedNote({ id: 'remaining', b: 6 })] })); await removeReading('original-reading'); const before = clone(storedWorkspace()), key = removedRows()[0].dataset.removedKey;
    const blocked = [...host.querySelectorAll('.aq-question-card'), findButton(host, 'Replay experiment'), findButton(host, 'Use saved B as A')];
    for (const button of blocked) { expect(button.disabled).toBe(true); await act(async () => button.click()); expect(storedWorkspace()).toEqual(before); expect(removedRows()[0].dataset.removedKey).toBe(key); }
    await captureAnnual(); const captured = clone(storedWorkspace()); await captureAnnual(); expect(storedWorkspace()).toEqual(captured); expect(removedRows()[0].dataset.removedKey).toBe(key);
  });

  it('keeps recovery across absent, malformed, oversized, unreadable and unsaved portfolio imports', async () => {
    await mount(preservedWorkspace()); await removeReading('original-reading'); const before = clone(storedWorkspace()), key = removedRows()[0].dataset.removedKey;
    for (const options of [{ noFile: true }, {}, { size: 1024 * 1024 + 1 }, { error: true }]) {
      await importBackup('not-json', options); expect(storedWorkspace()).toEqual(before); expect(removedRows()[0].dataset.removedKey).toBe(key);
    }
    const valid = helpers.buildLearningPortfolio({ ecosystemWorkspace: before }, [], []), originalSetItem = Storage.prototype.setItem;
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) { if (key === storageKey) throw new DOMException('Device quota exceeded', 'QuotaExceededError'); return originalSetItem.call(this, key, value); });
    await importBackup(valid); expect(storedWorkspace()).toEqual(before); expect(removedRows()[0].dataset.removedKey).toBe(key); writes.mockRestore();
  });

  it('clears recovery only after a valid portfolio merge succeeds while preserving current and archived notebooks', async () => {
    await mount(preservedWorkspace({ measurements: [importedNote(), importedNote({ id: 'remaining', b: 6 })] })); await removeReading('original-reading'); const before = clone(storedWorkspace());
    const valid = helpers.buildLearningPortfolio({ ecosystemWorkspace: before }, [], []); await importBackup(valid);
    expect(tray()).toBeNull(); expect(storedWorkspace().measurements).toEqual(before.measurements); expect(storedWorkspace().experiments).toEqual(before.experiments); expect(storedWorkspace().parkedDraft).toEqual(before.parkedDraft);
  });

  it('ends session recovery on reload without persisting trash or changing citations, archives or parked readings', async () => {
    await mount(preservedWorkspace()); const before = clone(storedWorkspace()); await removeReading('original-reading'); const removed = clone(storedWorkspace()); expect(tray()).toBeTruthy(); assertOtherWork(before);
    const portfolio = helpers.buildLearningPortfolio({ ecosystemWorkspace: removed }, [], []); expect(portfolio.learning.ecosystemWorkspace).toEqual(removed);
    expect(Object.keys(removed).sort()).toEqual(Object.keys(before).sort()); expect(removed.measurements).toEqual([]); await remount();
    expect(tray()).toBeNull(); expect(storedWorkspace()).toEqual(removed); expect(host.querySelector('.aq-measurement-archive').textContent).toContain(reading(before.measurements[0]));
  });

  it('keeps both removed and restored readings in the page when device writes fail and saves the same later work on retry', async () => {
    await mount(preservedWorkspace()); const before = clone(storedWorkspace()), note = before.measurements[0], durable = localStorage.getItem(storageKey), originalSetItem = Storage.prototype.setItem; let unavailable = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) { if (key === storageKey && unavailable) throw new DOMException('Device quota exceeded', 'QuotaExceededError'); return originalSetItem.call(this, key, value); });
    await removeReading(note.id); expect(localStorage.getItem(storageKey)).toBe(durable); expect(host.querySelector('.aq-storage-recovery')).toBeTruthy(); expect(rowFor(note.id)).toBeUndefined(); expect(removedRowFor(note)).toBeTruthy();
    await change(host.querySelector('#aq-eco-evidence-evidence'), 'Later evidence held in this page.'); await click(restoreButton(removedRowFor(note)));
    expect(tray()).toBeNull(); expect(rowFor(note.id).querySelector('.aq-measurement-reading').textContent).toBe(reading(note)); expect(host.querySelector('#aq-eco-evidence-evidence').value).toBe('Later evidence held in this page.'); expect(localStorage.getItem(storageKey)).toBe(durable); assertFocused('aq-live-measurement-' + note.id);
    unavailable = false; await click(findButton(host, 'Retry device save')); expect(host.querySelector('.aq-storage-recovery')).toBeNull(); expect(storedWorkspace().measurements).toEqual([note]); expect(storedWorkspace().evidence.evidence).toBe('Later evidence held in this page.');
    for (const field of ['prediction', 'observation', 'experiments', 'parkedDraft']) expect(storedWorkspace()[field], field).toEqual(before[field]); expect(Object.keys(storedWorkspace()).sort()).toEqual(Object.keys(before).sort());
  });
});
