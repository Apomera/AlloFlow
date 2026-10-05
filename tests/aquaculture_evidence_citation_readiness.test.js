import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const capturedAt = Date.parse('2026-10-02T12:00:00.000Z');
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, kelp: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const evidence = (text = 'My original Evidence writing.') => ({ claim: 'Keep my original claim.', evidence: text, reasoning: 'Keep my original mechanism.', nextTest: 'Keep my next test.' });
const workspace = (patch = {}) => ({ ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'Keep my original prediction.', observation: 'Keep this existing reflection while I review a possible citation.', evidence: evidence(), measurements: [], experiments: [], ...patch });
const importedNote = (patch = {}) => ({ id: 'original-reading', capturedAt, modelVersion: '2026.10-stock-feedback', scope: 'annual', month: null, speciesId: 'system', metricId: 'minOxygen', aState: 'recorded', bState: 'recorded', a: 4.1234, b: 5.6794, baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), currentScenario: scenario(), ...patch });
const archive = (notes = [importedNote()]) => ({ id: 'original-investigation', title: 'Original saved investigation', kind: 'comparison', modelVersion: '2026.09-original', savedAt: capturedAt, baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), currentScenario: scenario(), observation: 'Keep the archived original explanation.', evidence: evidence(), measurements: notes });
const parked = () => ({ ...scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, salinity: 1, oxygen: 11 } }), prediction: 'Keep the parked prediction.', observation: 'Keep the parked explanation.', evidence: evidence(), measurements: [importedNote({ id: 'parked-reading' })] });
const preservedWorkspace = (patch = {}) => workspace({ measurements: [importedNote()], experiments: [archive()], parkedDraft: parked(), ...patch });
const clone = value => JSON.parse(JSON.stringify(value));
const findButton = (host, label) => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === label);
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}

describe('Aquaculture Evidence citation readiness', () => {
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
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  }

  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;
  const annual = (source = workspace(), id = 'test-reading') => helpers.ecosystemMeasurement(source, { scope: 'annual', metricId: 'minOxygen', speciesId: 'system' }, capturedAt, id);
  const citationReadiness = (writing, note = importedNote(), source = workspace()) => helpers.ecosystemEvidenceCitationReadiness(writing, note, source);
  const liveNotebook = () => host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)');
  const rowFor = id => [...liveNotebook().querySelectorAll('[data-measurement-id]')].find(row => row.dataset.measurementId === id);
  const panelFor = id => rowFor(id).querySelector('.aq-evidence-citation-readiness');
  const assertState = (id, state) => expect(panelFor(id).getAttribute('data-citation-state')).toBe(state);
  const assertFocusEvidence = () => { const field = host.querySelector('#aq-eco-evidence-evidence'); expect(document.activeElement).toBe(field); for (let parent = field.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') expect(parent.open).toBe(true); };
  const assertOtherWork = before => { const after = storedWorkspace(); for (const field of ['prediction', 'observation', 'measurements', 'experiments', 'parkedDraft', 'baselineScenario']) expect(after[field], field).toEqual(before[field]); for (const field of ['claim', 'reasoning', 'nextTest']) expect(after.evidence[field], field).toBe(before.evidence[field]); };

  it('wraps the existing append result exactly and previews the complete dated citation for empty Evidence', async () => {
    await mount();
    const note = annual(), writing = evidence(''), expected = helpers.appendEcosystemMeasurementEvidence(writing, note, workspace()), result = citationReadiness(writing, note);
    for (const key of ['ok', 'reason', 'evidence', 'citation']) expect(result[key], key).toEqual(expected[key]);
    expect(result).toMatchObject({ state: 'ready', canAppend: true, currentLength: 0, limit: 500, remaining: 500, addedLength: expected.citation.length, proposedLength: expected.citation.length, overflow: 0, readingText: helpers.ecosystemMeasurementText(note), noteId: note.id });
    expect(result.citation).toContain(note.modelVersion); expect(result.citation).toContain('2026-10-02T12:00:00.000Z');
    expect(writing).toEqual(evidence('')); expect(result.evidence.evidence).toBe(result.citation);
  });

  it('accepts a complete citation that fills Evidence exactly to five hundred characters including its newline', async () => {
    await mount();
    const note = annual(), citation = citationReadiness(evidence(''), note).citation, original = 'X'.repeat(500 - citation.length - 1), writing = evidence(original);
    const result = citationReadiness(writing, note);
    expect(result).toMatchObject({ ok: true, reason: 'added', state: 'ready', canAppend: true, currentLength: original.length, remaining: 500 - original.length, addedLength: citation.length + 1, proposedLength: 500, overflow: 0 });
    expect(result.evidence.evidence).toBe(original + '\n' + citation); expect(result.evidence.evidence).toHaveLength(500);
    expect(writing.evidence).toBe(original);
  });

  it('reports a one-character overflow at five hundred and one without truncating the citation or existing writing', async () => {
    await mount();
    const note = annual(), citation = citationReadiness(evidence(''), note).citation, original = 'X'.repeat(500 - citation.length), writing = evidence(original);
    const result = citationReadiness(writing, note);
    expect(result).toMatchObject({ ok: false, reason: 'full', state: 'full', canAppend: false, currentLength: original.length, proposedLength: 501, overflow: 1, citation });
    expect(result.evidence).toEqual(writing); expect(writing.evidence).toBe(original);
  });

  it('counts and preserves original whitespace and line breaks instead of trimming the learner Evidence', async () => {
    await mount();
    const original = '  First observation.\n\nSecond observation.  \n', writing = evidence(original), result = citationReadiness(writing);
    expect(result.currentLength).toBe(original.length); expect(result.addedLength).toBe(result.citation.length + 1);
    expect(result.proposedLength).toBe(original.length + result.citation.length + 1);
    expect(result.evidence.evidence).toBe(original + '\n' + result.citation); expect(writing.evidence).toBe(original);
    const spaces = citationReadiness(evidence('   '));
    expect(spaces.currentLength).toBe(3); expect(spaces.evidence.evidence).toBe('   \n' + spaces.citation);
  });

  it('reports raw length and zero remaining space for oversized imported writing while preserving the old sanitizer contract', async () => {
    await mount();
    const writing = evidence('X'.repeat(650)), note = annual(), expected = helpers.appendEcosystemMeasurementEvidence(writing, note, workspace()), result = citationReadiness(writing, note);
    expect(result).toMatchObject({ state: 'full', currentLength: 650, remaining: 0, proposedLength: 650 + result.citation.length + 1, overflow: 151 + result.citation.length });
    expect(result.evidence).toEqual(expected.evidence); expect(result.evidence.evidence).toHaveLength(500); expect(writing.evidence).toHaveLength(650);
  });

  it('recognizes an existing core reading before fullness even after the context adds an Earlier settings prefix', async () => {
    await mount();
    const note = annual(), originalText = helpers.ecosystemMeasurementText(note), writing = evidence(originalText.padEnd(500, ' '));
    const result = citationReadiness(writing, note, workspace({ water: { ...water, oxygen: 3 } }));
    expect(result).toMatchObject({ ok: false, reason: 'duplicate', state: 'already-added', canAppend: false, currentLength: 500, remaining: 0 });
    expect(result.citation).toBe('Earlier settings — ' + originalText); expect(result.readingText).toBe(originalText);
    expect(result.proposedLength).toBe(500 + result.citation.length + 1); expect(result.overflow).toBe(result.citation.length + 1); expect(result.evidence).toEqual(writing);
  });

  it('previews current, earlier settings and earlier model citations without replacing their frozen reading text', async () => {
    await mount();
    const note = annual(), current = citationReadiness(evidence(''), note), earlierSettings = citationReadiness(evidence(''), note, workspace({ water: { ...water, oxygen: 3 } }));
    expect(current.citation).toBe(current.readingText); expect(earlierSettings.citation).toBe('Earlier settings — ' + current.readingText);
    const old = { ...clone(note), modelVersion: '2026.09-frozen-reading' }, earlierModel = citationReadiness(evidence(''), old, workspace({ water: { ...water, oxygen: 3 } }));
    expect(earlierModel.citation).toBe('Earlier model — ' + helpers.ecosystemMeasurementText(old));
    expect(earlierModel.citation).not.toContain('Earlier settings — ');
    for (const result of [current, earlierSettings, earlierModel]) expect(result.state).toBe('ready');
  });

  it('retains a missing original capture date explicitly without inventing the current date', async () => {
    await mount();
    const note = { ...annual(), capturedAt: 0 }, result = citationReadiness(evidence(''), note);
    expect(result.state).toBe('ready'); expect(result.citation).toContain('Captured date not recorded.');
    expect(result.readingText).toBe(helpers.ecosystemMeasurementText(note)); expect(note.capturedAt).toBe(0);
  });

  it('keeps invalid measurements unavailable with zero added characters and the existing sanitized evidence', async () => {
    await mount();
    const note = annual(), writing = evidence('Keep this writing unchanged.');
    for (const invalid of [null, {}, { ...note, b: NaN }, { ...note, metricId: 'invented' }, { ...note, currentScenario: {} }]) {
      const result = citationReadiness(writing, invalid);
      expect(result).toMatchObject({ ok: false, reason: 'invalid', state: 'unavailable', canAppend: false, citation: '', readingText: '', noteId: '', currentLength: writing.evidence.length, addedLength: 0, proposedLength: writing.evidence.length, overflow: 0, evidence: writing });
    }
  });

  it('keeps no-baseline and A-only readings explicit instead of fabricating a missing comparison number', async () => {
    await mount();
    const withoutA = workspace({ baselineScenario: null }), note = annual(withoutA), noA = citationReadiness(evidence(''), note, withoutA);
    expect(noA.state).toBe('ready'); expect(noA.readingText).toContain('no A captured'); expect(noA.readingText).not.toContain('B minus A');
    const source = workspace({ organisms: { mussel: 1 } }), aOnly = helpers.ecosystemMeasurement(source, { scope: 'month', month: 6, metricId: 'biomass', speciesId: 'oyster' }, capturedAt, 'a-only');
    const result = citationReadiness(evidence(''), aOnly, source);
    expect(result.state).toBe('ready'); expect(result.readingText).toContain('not stocked'); expect(result.readingText).not.toContain('B minus A'); expect(aOnly.b).toBeNull();
  });

  it('derives a detached result from frozen writing and provenance while preserving every non-Evidence field', async () => {
    await mount();
    const writing = deepFreeze(evidence('  Existing frozen evidence.  ')), note = deepFreeze(importedNote()), source = deepFreeze(workspace()), original = JSON.stringify({ writing, note, source });
    const result = citationReadiness(writing, note, source);
    expect(result.state).toBe('ready');
    for (const key of ['claim', 'reasoning', 'nextTest']) expect(result.evidence[key]).toBe(writing[key]);
    result.evidence.claim = 'Caller modified its result.'; result.evidence.evidence = 'Caller modified its result.';
    expect(JSON.stringify({ writing, note, source })).toBe(original);
    expect(citationReadiness(writing, note, source).evidence.claim).toBe(writing.claim);
  });

  it('matches the full dated reading text rather than similar numbers and ignores id-only changes in that text', async () => {
    await mount();
    const note = annual(), writing = evidence(helpers.ecosystemMeasurementText(note));
    expect(citationReadiness(writing, { ...clone(note), id: 'different-id' }).state).toBe('already-added');
    for (const changed of [{ ...clone(note), capturedAt: note.capturedAt + 1 }, { ...clone(note), metricLabel: 'A different recorded source label' }, { ...clone(note), modelVersion: '2026.09-different' }]) {
      const result = citationReadiness(writing, changed);
      expect(result.state).toBe('ready'); expect(result.readingText).not.toBe(helpers.ecosystemMeasurementText(note));
    }
  });

  it('shows an exact native citation preview and described ready status without writing proposed text to the device', async () => {
    await mount(preservedWorkspace()); liveNotebook().open = true;
    const before = clone(storedWorkspace()), note = before.measurements[0], expected = citationReadiness(before.evidence, note, before), row = rowFor(note.id), panel = panelFor(note.id);
    assertState(note.id, 'ready');
    const status = row.querySelector('#aq-citation-status-' + note.id); expect(status.getAttribute('role')).toBeNull(); expect(status.getAttribute('aria-live')).toBeNull(); expect(status.textContent.trim()).toBeTruthy();
    expect(status.textContent).toContain('Evidence ' + expected.currentLength + '/500'); expect(status.textContent).toContain(expected.proposedLength + '/500'); expect(status.textContent).toContain('Adds ' + expected.addedLength + ' characters');
    const preview = row.querySelector('.aq-evidence-citation-preview'); expect(preview.tagName).toBe('DETAILS'); expect(preview.querySelector('summary').textContent).toBe('Preview complete citation');
    const writes = vi.spyOn(Storage.prototype, 'setItem'); preview.open = true;
    expect(preview.textContent).toContain(expected.citation); expect(panel.textContent).toMatch(/preview.*(?:until|only)|only.*(?:add|writing)/i);
    const add = findButton(row, 'Add reading to Evidence'); expect(add.disabled).toBe(false); expect(add.getAttribute('aria-describedby').split(/\s+/)).toContain(status.id);
    expect(add.getAttribute('aria-label')).toMatch(/^Add reading to Evidence:/);
    expect(add.closest('[role="status"],[aria-live]')).toBeNull(); expect(status.closest('[role="status"],[aria-live]')).toBeNull();
    expect(writes).not.toHaveBeenCalled(); expect(storedWorkspace()).toEqual(before);
  });

  it('appends precisely the previewed complete citation and preserves claim, reasoning, reflection, original and parked evidence', async () => {
    await mount(preservedWorkspace()); liveNotebook().open = true;
    const before = clone(storedWorkspace()), note = before.measurements[0], expected = citationReadiness(before.evidence, note, before);
    await click(findButton(rowFor(note.id), 'Add reading to Evidence'));
    expect(storedWorkspace().evidence.evidence).toBe(before.evidence.evidence + '\n' + expected.citation); assertOtherWork(before); assertFocusEvidence();
    assertState(note.id, 'already-added'); expect(findButton(panelFor(note.id), 'Review Evidence writing')).toBeTruthy();
  });

  it('offers native Evidence editing for a full field and guards Add without any device write or lost evidence', async () => {
    await mount(preservedWorkspace({ evidence: evidence('X'.repeat(500)) })); liveNotebook().open = true;
    const before = clone(storedWorkspace()), note = before.measurements[0], durable = localStorage.getItem(storageKey); assertState(note.id, 'full');
    const expected = citationReadiness(before.evidence, note, before), status = rowFor(note.id).querySelector('#aq-citation-status-' + note.id);
    expect(status.textContent).toContain(expected.addedLength + ' more characters'); expect(status.textContent).toContain('0 are available'); expect(status.textContent).toContain(expected.overflow + ' over the limit');
    const edit = findButton(panelFor(note.id), 'Edit Evidence writing'); expect(edit.tagName).toBe('BUTTON'); expect(edit.type).toBe('button'); expect(edit.tabIndex).toBe(0);
    const writes = vi.spyOn(Storage.prototype, 'setItem'); edit.focus(); expect(document.activeElement).toBe(edit);
    await click(edit); assertFocusEvidence(); expect(storedWorkspace()).toEqual(before);
    const add = findButton(rowFor(note.id), 'Add reading to Evidence'); expect(add.disabled).toBe(false); await click(add);
    expect(host.textContent).toContain('The complete citation does not fit the 500-character Evidence field.');
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBe(durable); expect(storedWorkspace()).toEqual(before);
  });

  it('reviews already added Evidence through a native focusable action and guards a duplicate Add without rewriting any work', async () => {
    await mount(preservedWorkspace()); liveNotebook().open = true;
    const id = storedWorkspace().measurements[0].id; await click(findButton(rowFor(id), 'Add reading to Evidence'));
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), writes = vi.spyOn(Storage.prototype, 'setItem'); assertState(id, 'already-added');
    host.querySelector('.aq-structured-evidence').open = false;
    const review = findButton(panelFor(id), 'Review Evidence writing'); expect(review.tagName).toBe('BUTTON'); expect(review.type).toBe('button'); expect(review.tabIndex).toBe(0);
    review.focus(); expect(document.activeElement).toBe(review); await click(review); assertFocusEvidence();
    await click(findButton(rowFor(id), 'Add reading to Evidence'));
    expect(host.textContent).toContain('That reading is already in your Evidence writing.');
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBe(durable); expect(storedWorkspace()).toEqual(before);
  });

  it('refreshes readiness as the live Evidence field changes and appends an exact fit without preview-generated writing', async () => {
    await mount(preservedWorkspace()); liveNotebook().open = true;
    const before = clone(storedWorkspace()), note = before.measurements[0], citation = citationReadiness(evidence(''), note, before).citation;
    await change(host.querySelector('#aq-eco-evidence-evidence'), 'X'.repeat(500)); assertState(note.id, 'full');
    expect(storedWorkspace().evidence.evidence).toBe('X'.repeat(500)); assertOtherWork(before);
    const exactFit = 'X'.repeat(500 - citation.length - 1);
    await change(host.querySelector('#aq-eco-evidence-evidence'), exactFit); assertState(note.id, 'ready');
    expect(storedWorkspace().evidence.evidence).toBe(exactFit); expect(rowFor(note.id).querySelector('.aq-evidence-citation-preview').textContent).toContain(citation);
    await click(findButton(rowFor(note.id), 'Add reading to Evidence'));
    expect(storedWorkspace().evidence.evidence).toBe(exactFit + '\n' + citation); expect(storedWorkspace().evidence.evidence).toHaveLength(500); assertOtherWork(before);
  });

  it('refreshes the earlier-settings candidate after a model input edit while retaining the already added core citation', async () => {
    await mount(preservedWorkspace()); liveNotebook().open = true;
    const id = storedWorkspace().measurements[0].id; await click(findButton(rowFor(id), 'Add reading to Evidence'));
    const before = clone(storedWorkspace()), frozen = clone(before.measurements);
    await change(host.querySelector('#aq-eco-oxygen'), '3');
    const changed = storedWorkspace(), expected = citationReadiness(changed.evidence, changed.measurements[0], changed);
    expect(changed.water.oxygen).toBe(3); expect(expected.citation).toMatch(/^Earlier settings — /); assertState(id, 'already-added');
    expect(rowFor(id).querySelector('.aq-evidence-citation-preview').textContent).toContain(expected.citation);
    expect(changed.evidence).toEqual(before.evidence); expect(changed.measurements).toEqual(frozen); assertOtherWork(before);
  });

  it('renders imported citation HTML as plain text and preserves an earlier-model source without executable markup', async () => {
    const maliciousLabel = '<img src="x" onerror="alert(1)"> Oxygen';
    const note = importedNote({ metricLabel: maliciousLabel, unit: '<b>mg/L</b>', deltaUnit: '<b>mg/L</b>', modelVersion: '2026.09-frozen-reading' });
    await mount(preservedWorkspace({ measurements: [note] })); liveNotebook().open = true;
    const before = clone(storedWorkspace()), expected = citationReadiness(before.evidence, before.measurements[0], before), preview = rowFor(note.id).querySelector('.aq-evidence-citation-preview');
    expect(expected.citation).toMatch(/^Earlier model — /); expect(preview.textContent).toContain(expected.citation); expect(preview.textContent).toContain(maliciousLabel); expect(preview.textContent).toContain('<b>mg/L</b>');
    expect(preview.querySelector('img,script,svg,b')).toBeNull(); expect(host.querySelector('img[src="x"]')).toBeNull();
    expect(storedWorkspace()).toEqual(before); expect(before.measurements[0].modelVersion).toBe(note.modelVersion);
  });

  it('adds citation controls and unique status IDs only to live rows even when archived rows retain the same measurement IDs', async () => {
    const notes = [importedNote(), importedNote({ id: 'second-reading', metricLabel: 'Second original oxygen source' })];
    await mount(preservedWorkspace({ measurements: notes, experiments: [archive(notes)] }));
    const before = clone(storedWorkspace()), archived = host.querySelector('.aq-measurement-archive');
    expect(archived).toBeTruthy(); expect(archived.querySelectorAll('.aq-evidence-citation-readiness,.aq-evidence-citation-preview,[id^="aq-citation-status-"]')).toHaveLength(0);
    expect(findButton(archived, 'Add reading to Evidence')).toBeUndefined(); expect(findButton(archived, 'Edit Evidence writing')).toBeUndefined(); expect(findButton(archived, 'Review Evidence writing')).toBeUndefined();
    const statuses = [...liveNotebook().querySelectorAll('[id^="aq-citation-status-"]')]; expect(statuses).toHaveLength(2); expect(new Set(statuses.map(status => status.id)).size).toBe(2);
    for (const note of before.measurements) {
      const statusId = 'aq-citation-status-' + note.id; expect(host.querySelectorAll('#' + statusId)).toHaveLength(1);
      const add = findButton(rowFor(note.id), 'Add reading to Evidence'); expect(add.getAttribute('aria-describedby').split(/\s+/)).toContain(statusId); assertState(note.id, 'ready');
      const status = rowFor(note.id).querySelector('#' + statusId); expect(status.closest('[role="status"],[aria-live]')).toBeNull(); expect(add.closest('[role="status"],[aria-live]')).toBeNull();
    }
    expect(storedWorkspace()).toEqual(before);
  });
});
