import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const capturedAt = Date.parse('2026-10-02T12:00:00.000Z');
const water = { temperature: 16, salinity: 30, oxygen: 7, pH: 8, ammonia: .3, exchange: 45 };
const annualMetrics = ['endingBiomass', 'survival', 'minOxygen', 'peakAmmonia', 'averageResilience', 'riskMonths', 'harvestUnits', 'operatingEffort'];
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2, mussel: 1, kelp: 1, phytoplankton: 1 }, water: { ...water }, disturbanceId: 'heatwave', ...patch });
const evidence = () => ({ claim: 'Keep this original learner claim.', evidence: 'Keep this chosen evidence.', reasoning: 'Keep this explanation of the mechanism.', nextTest: 'Keep this planned next test.' });
const workspace = (patch = {}) => ({ ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), prediction: 'Lower starting oxygen should change the modeled signal.', observation: 'Keep this existing explanation while I inspect a new reading.', evidence: evidence(), measurements: [], experiments: [], ...patch });
const importedNote = (id, metricId = 'minOxygen') => ({ id, capturedAt, modelVersion: '2026.10-stock-feedback', scope: 'annual', month: null, speciesId: 'system', metricId, aState: 'recorded', bState: 'recorded', a: 0, b: 0, baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), currentScenario: scenario() });
const fullNotes = () => annualMetrics.map(metricId => importedNote('imported-' + metricId, metricId));
const archive = () => ({ id: 'original-investigation', title: 'Original saved investigation', kind: 'comparison', modelVersion: '2026.09-original', savedAt: capturedAt, baselineScenario: scenario({ water: { ...water, oxygen: 9 } }), currentScenario: scenario(), observation: 'Keep this archived original explanation.', evidence: evidence(), measurements: [importedNote('archived-reading')] });
const parked = () => ({ ...scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, salinity: 1, oxygen: 11 } }), prediction: 'Keep the parked prediction.', observation: 'Keep the parked explanation and readings.', evidence: evidence(), measurements: [importedNote('parked-reading')] });
const clone = value => JSON.parse(JSON.stringify(value));
const findButton = (host, label) => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === label);
function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}

describe('Aquaculture capture readiness', () => {
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
  const annual = (source = workspace(), metricId = 'minOxygen', id = 'annual-preview') => helpers.ecosystemMeasurement(source, { scope: 'annual', metricId, speciesId: 'system' }, capturedAt, id);
  const monthly = (source = workspace(), metricId = 'oxygen', speciesId = 'system', month = 6, id = 'month-preview') => helpers.ecosystemMeasurement(source, { scope: 'month', metricId, speciesId, month }, capturedAt, id);
  const readiness = (preview, notes = []) => helpers.ecosystemCaptureReadiness(preview, notes);
  const annualPanel = () => host.querySelector('.aq-measurement-capture .aq-capture-readiness');
  const monthPanel = () => host.querySelector('#aq-season-inspection .aq-capture-readiness');
  const assertPanel = (panel, state) => { expect(panel).toBeTruthy(); expect(panel.getAttribute('data-capture-state')).toBe(state); };
  const liveNotebook = () => host.querySelector('.aq-measurement-notebook:not(.aq-measurement-archive)');
  const assertFocus = id => { const target = host.querySelector('#' + id); expect(target).toBeTruthy(); expect(document.activeElement).toBe(target); for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') expect(parent.open).toBe(true); };
  const assertWritingKept = before => { const after = storedWorkspace(); for (const field of ['prediction', 'observation', 'evidence', 'experiments', 'parkedDraft']) expect(after[field], field).toEqual(before[field]); };

  it('returns a canonical available annual preview with exact heading, reading and notebook capacity', async () => {
    await mount();
    const note = annual(), result = readiness({ ...note, unknownMetadata: 'ignored' });
    expect(result).toMatchObject({ state: 'ready', available: true, canRecord: true, count: 0, limit: 8, remaining: 8, duplicateId: '' });
    expect(result.preview).toEqual(helpers.sanitizeEcosystemMeasurements([note])[0]);
    expect(result.heading).toContain('Annual model'); expect(result.heading).toContain(note.metricLabel);
    expect(result.reading).toContain(String(note.a) + ' mg/L'); expect(result.reading).toContain(String(note.b) + ' mg/L');
    expect(result.reading).toContain('B minus A'); expect(result.preview).not.toHaveProperty('unknownMetadata');
  });

  it('prioritizes an unavailable or malformed preview even when the bounded notebook is full', async () => {
    await mount();
    const valid = annual();
    for (const preview of [null, undefined, {}, { ...valid, b: NaN }, { ...valid, metricId: 'invented' }, { ...valid, currentScenario: {} }]) {
      const result = readiness(preview, fullNotes());
      expect(result).toMatchObject({ state: 'unavailable', available: false, canRecord: false, count: 8, limit: 8, remaining: 0, preview: null, duplicateId: '' });
      expect(typeof result.heading).toBe('string'); expect(typeof result.reading).toBe('string');
    }
  });

  it('recognizes a canonical duplicate despite a new id/date, different input key order and ignored raw fields', async () => {
    await mount();
    const note = annual(), { id, capturedAt: date, ...fields } = note;
    const reversed = Object.fromEntries(Object.entries(fields).reverse());
    const result = readiness({ ...reversed, id: 'capture-preview', capturedAt: 1, scope: 'annual', month: 9, speciesId: 'kelp', ignored: true }, [{ ...note, id: 'original-capture', capturedAt: date + 100 }]);
    expect(result).toMatchObject({ state: 'captured', available: true, canRecord: false, count: 1, remaining: 7, duplicateId: 'original-capture' });
    expect(result.preview).toMatchObject({ id: 'capture-preview', capturedAt: 1, month: null, speciesId: 'system' });
  });

  it('returns the first matching capture before a full-notebook state and keeps its original id', async () => {
    await mount();
    const note = annual(), notes = Array.from({ length: 8 }, (_, index) => ({ ...clone(note), id: 'matching-' + index, capturedAt: capturedAt + index }));
    const result = readiness({ ...clone(note), id: 'new-preview', capturedAt: 1 }, notes);
    expect(result).toMatchObject({ state: 'captured', count: 8, remaining: 0, available: true, canRecord: false, duplicateId: 'matching-0' });
    expect(notes.map(item => item.id)).toEqual(Array.from({ length: 8 }, (_, index) => 'matching-' + index));
  });

  it('reports a full notebook for a new monthly reading while keeping its numeric preview available', async () => {
    await mount();
    const note = monthly(), result = readiness(note, fullNotes());
    expect(result).toMatchObject({ state: 'full', count: 8, limit: 8, remaining: 0, available: true, canRecord: false, duplicateId: '' });
    expect(result.preview).toEqual(note); expect(result.heading).toContain('Jul model'); expect(result.reading).toContain('mg/L');
  });

  it('counts only valid bounded notes and ignores a matching ninth imported row beyond the eight retained readings', async () => {
    await mount();
    const note = monthly(), notes = fullNotes(), malformed = [{ id: 'bad' }, { ...notes[0], id: 'bad id' }];
    const result = readiness(note, [...notes, note]);
    expect(result).toMatchObject({ state: 'full', count: 8, remaining: 0, duplicateId: '' });
    const bounded = readiness(note, [notes[0], clone(notes[0]), ...malformed]);
    expect(bounded).toMatchObject({ state: 'ready', count: 1, remaining: 7 });
    expect(readiness(note, null)).toMatchObject({ state: 'ready', count: 0, remaining: 8 });
  });

  it('distinguishes month, species and metric while canonicalizing shared measurements to the system', async () => {
    await mount();
    const note = monthly(workspace(), 'biomass', 'oyster', 6);
    expect(readiness(note, [{ ...clone(note), id: 'same-reading' }]).state).toBe('captured');
    for (const preview of [monthly(workspace(), 'biomass', 'oyster', 7), monthly(workspace(), 'biomass', 'kelp', 6), monthly(workspace(), 'survival', 'oyster', 6)]) expect(readiness(preview, [note]).state).toBe('ready');
    const shared = monthly();
    expect(readiness({ ...shared, speciesId: 'kelp' }, [shared])).toMatchObject({ state: 'captured', preview: { speciesId: 'system' } });
    const aOnly = monthly(workspace({ organisms: { mussel: 1 } }), 'biomass', 'oyster', 6);
    expect(readiness(aOnly)).toMatchObject({ state: 'ready', available: true, canRecord: true, preview: { aState: 'recorded', bState: 'not-stocked', b: null } });
  });

  it('does not falsely match identical numbers captured under an earlier model or earlier A/B settings', async () => {
    await mount();
    const note = monthly();
    const originals = [
      { ...clone(note), id: 'older-model', modelVersion: '2026.09-original' },
      { ...clone(note), id: 'older-a', baselineScenario: scenario({ water: { ...water, oxygen: 10 } }) },
      { ...clone(note), id: 'older-b', currentScenario: scenario({ water: { ...water, oxygen: 6 } }) }
    ];
    for (const original of originals) {
      const result = readiness(note, [original]);
      expect(result).toMatchObject({ state: 'ready', count: 1, duplicateId: '' });
      expect(original.a).toBe(note.a); expect(original.b).toBe(note.b);
    }
  });

  it('distinguishes a reading with no captured A from the same B numbers after a complete A is added', async () => {
    await mount();
    const withoutA = workspace({ baselineScenario: null }), note = annual(withoutA), preview = annual(workspace({ baselineScenario: scenario() }));
    expect(note.b).toBe(preview.b); expect(note.aState).toBe('no-baseline'); expect(preview.aState).toBe('recorded');
    expect(readiness(preview, [note])).toMatchObject({ state: 'ready', count: 1, duplicateId: '' });
    expect(readiness(note, [{ ...clone(note), id: 'original-no-a' }])).toMatchObject({ state: 'captured', duplicateId: 'original-no-a' });
  });

  it('includes canonical labels, units, events and recorded-side states in the exact capture signature', async () => {
    await mount();
    const note = monthly();
    const variants = [
      { ...clone(note), metricLabel: 'A previously recorded custom label' }, { ...clone(note), unit: ' old units' }, { ...clone(note), deltaUnit: ' old delta units' },
      { ...clone(note), aEvent: 'Earlier A event' }, { ...clone(note), bEvent: 'Earlier B event' },
      { ...clone(note), a: note.a + .001 }, { ...clone(note), b: note.b + .001 },
      { ...clone(note), aState: 'not-stocked', a: null }
    ];
    for (const [index, original] of variants.entries()) expect(readiness(note, [{ ...original, id: 'different-' + index }])).toMatchObject({ state: 'ready', count: 1, duplicateId: '' });
  });

  it('keeps exact frozen values and three-decimal signed reading deltas in a detached pure result', async () => {
    await mount();
    const note = deepFreeze({ ...annual(), a: 4.1234, b: 5.6794 }), notes = deepFreeze([{ ...clone(note), id: 'frozen-original' }]);
    const original = JSON.stringify({ note, notes }), result = readiness(note, notes);
    expect(result).toMatchObject({ state: 'captured', duplicateId: 'frozen-original' });
    expect(result.reading).toContain('4.1234 mg/L'); expect(result.reading).toContain('5.6794 mg/L'); expect(result.reading).toContain('+1.556 mg/L');
    result.preview.currentScenario.water.oxygen = 14; result.preview.baselineScenario.water.oxygen = 2;
    expect(JSON.stringify({ note, notes })).toBe(original);
    const zero = readiness({ ...annual(), a: 0, b: 0 });
    expect(zero.state).toBe('ready'); expect(zero.reading).toContain('0 mg/L');
    expect(zero.preview.a).toBe(0); expect(zero.preview.b).toBe(0);
  });

  it('describes the selected annual preview accessibly without changing writing or creating a capture', async () => {
    await mount(workspace({ experiments: [archive()], parkedDraft: parked() }));
    const before = clone(storedWorkspace());
    await change(host.querySelector('#aq-measurement-annual-metric'), 'peakAmmonia');
    const expected = readiness(annual(before, 'peakAmmonia'));
    assertPanel(annualPanel(), 'ready'); expect(annualPanel().textContent).toContain(expected.heading); expect(annualPanel().textContent).toContain(expected.reading);
    const record = findButton(host, 'Record annual result'); expect(record.disabled).toBe(false);
    const ids = record.getAttribute('aria-describedby').split(/\s+/);
    expect(ids.some(id => id.startsWith('aq-annual-capture-readiness'))).toBe(true);
    for (const id of ids) expect(host.querySelector('#' + id)?.textContent.trim()).toBeTruthy();
    expect(storedWorkspace()).toEqual(before);
  });

  it('reviews the matching annual capture through a native button, opens its live notebook and focuses the row heading', async () => {
    await mount(workspace({ experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await click(findButton(host, 'Record annual result'));
    const before = clone(storedWorkspace()), note = before.measurements[0], notebook = liveNotebook();
    assertPanel(annualPanel(), 'captured'); expect(findButton(host, 'Record annual result').disabled).toBe(false);
    notebook.open = false;
    const review = findButton(annualPanel(), 'Review matching capture');
    expect(review.tagName).toBe('BUTTON'); expect(review.type).toBe('button'); expect(review.tabIndex).toBe(0);
    const writes = vi.spyOn(Storage.prototype, 'setItem'); review.focus(); expect(document.activeElement).toBe(review);
    await click(review); assertFocus('aq-live-measurement-' + note.id); expect(notebook.open).toBe(true);
    const heading = host.querySelector('#aq-live-measurement-' + note.id); expect(heading.tagName).toBe('H4'); expect(heading.tabIndex).toBe(-1);
    expect(host.querySelectorAll('#aq-live-measurement-' + note.id)).toHaveLength(1);
    expect(writes).not.toHaveBeenCalled(); expect(storedWorkspace()).toEqual(before);
  });

  it('keeps duplicate Record enabled and preserves the exact notebook and all work without a device write', async () => {
    await mount(workspace({ experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await click(findButton(host, 'Record annual result'));
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), writes = vi.spyOn(Storage.prototype, 'setItem');
    await click(findButton(host, 'Record annual result'));
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBe(durable); expect(storedWorkspace()).toEqual(before);
    expect(host.textContent).toContain('That reading and its settings are already in the notebook.'); assertPanel(annualPanel(), 'captured');
  });

  it('shows full annual and monthly previews, keeps Record guards enabled and reviews notebook space without overwriting work', async () => {
    await mount(workspace({ measurements: fullNotes(), experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await change(host.querySelector('#aq-season-metric'), 'oxygen');
    const before = clone(storedWorkspace()), durable = localStorage.getItem(storageKey), writes = vi.spyOn(Storage.prototype, 'setItem');
    for (const [panel, label] of [[annualPanel(), 'Record annual result'], [monthPanel(), 'Record inspected result']]) {
      assertPanel(panel, 'full'); expect(panel.textContent).toMatch(/8\s*(?:\/|of)\s*8|full/i);
      expect(findButton(host, label).disabled).toBe(false);
      liveNotebook().open = false; await click(findButton(panel, 'Review notebook space')); assertFocus('aq-measurement-notebook-heading');
      await click(findButton(host, label));
      expect(host.textContent).toContain('Measurement notebook is full at 8 readings');
      expect(storedWorkspace()).toEqual(before);
    }
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(storageKey)).toBe(durable);
  });

  it('shows an existing matching capture ahead of the full state after the eighth reading is recorded', async () => {
    await mount(workspace({ measurements: fullNotes().filter(note => note.metricId !== 'minOxygen'), experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); assertPanel(annualPanel(), 'ready');
    const before = clone(storedWorkspace()); await click(findButton(host, 'Record annual result'));
    const after = storedWorkspace(), note = after.measurements[7];
    expect(after.measurements).toHaveLength(8); expect(after.measurements.slice(0, 7)).toEqual(before.measurements); assertWritingKept(before);
    assertPanel(annualPanel(), 'captured'); expect(findButton(annualPanel(), 'Review matching capture')).toBeTruthy();
    expect(findButton(annualPanel(), 'Review notebook space')).toBeUndefined(); expect(findButton(host, 'Record annual result').disabled).toBe(false);
    await click(findButton(annualPanel(), 'Review matching capture')); assertFocus('aq-live-measurement-' + note.id);
  });

  it('refreshes monthly capture status for selected month, species and metric and records exactly the inspected source', async () => {
    await mount(workspace({ experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-season-species'), 'kelp'); await change(host.querySelector('#aq-season-metric'), 'biomass');
    await click([...host.querySelectorAll('.aq-season-months button')].find(button => /^Inspect Jul,/.test(button.getAttribute('aria-label'))));
    const before = clone(storedWorkspace()), expected = readiness(monthly(before, 'biomass', 'kelp', 6));
    assertPanel(monthPanel(), 'ready'); expect(monthPanel().textContent).toContain(expected.heading); expect(monthPanel().textContent).toContain(expected.reading);
    const record = findButton(host, 'Record inspected result'), ids = record.getAttribute('aria-describedby').split(/\s+/);
    expect(ids.some(id => id.startsWith('aq-month-capture-readiness'))).toBe(true);
    for (const id of ids) expect(host.querySelector('#' + id)?.textContent.trim()).toBeTruthy();
    await click(record);
    const note = storedWorkspace().measurements[0];
    expect(note).toMatchObject({ scope: 'month', month: 6, speciesId: 'kelp', metricId: 'biomass', b: helpers.simulateEcosystemYear(before).timeline[6].species.find(item => item.id === 'kelp').biomass });
    assertPanel(monthPanel(), 'captured'); assertWritingKept(before);
    liveNotebook().open = false; await click(findButton(monthPanel(), 'Review matching capture')); assertFocus('aq-live-measurement-' + note.id);
    await click([...host.querySelectorAll('.aq-season-months button')].find(button => /^Inspect Aug,/.test(button.getAttribute('aria-label')))); assertPanel(monthPanel(), 'ready');
    await change(host.querySelector('#aq-season-metric'), 'oxygen'); assertPanel(monthPanel(), 'ready');
    const shared = readiness(monthly(storedWorkspace(), 'oxygen', 'kelp', 7));
    expect(monthPanel().textContent).toContain(shared.heading); expect(shared.preview.speciesId).toBe('system');
    expect(storedWorkspace().measurements).toEqual([note]); assertWritingKept(before);
  });

  it('refreshes a previously captured no-A annual reading after A is saved without changing the frozen note or writing', async () => {
    await mount(workspace({ baselineScenario: null, experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await click(findButton(host, 'Record annual result'));
    const before = clone(storedWorkspace()), note = before.measurements[0];
    expect(note.aState).toBe('no-baseline'); assertPanel(annualPanel(), 'captured');
    await click(findButton(host, 'Save current as scenario A'));
    assertPanel(annualPanel(), 'ready'); expect(storedWorkspace().measurements).toEqual([note]); assertWritingKept(before);
    expect(storedWorkspace().baselineScenario).toEqual(scenario());
    expect(annualPanel().textContent).toContain(readiness(annual(storedWorkspace())).reading);
  });

  it('disables unavailable annual and monthly survival without creating a capture and refreshes when an applicable metric is chosen', async () => {
    await mount(workspace({ organisms: { phytoplankton: 1 }, baselineScenario: null, measurements: [importedNote('earlier-reading')], experiments: [archive()], parkedDraft: parked() }));
    const before = clone(storedWorkspace());
    await change(host.querySelector('#aq-measurement-annual-metric'), 'survival'); await change(host.querySelector('#aq-season-metric'), 'survival');
    assertPanel(annualPanel(), 'unavailable'); assertPanel(monthPanel(), 'unavailable');
    expect(findButton(host, 'Record annual result').disabled).toBe(true); expect(findButton(host, 'Record inspected result').disabled).toBe(true);
    expect(findButton(annualPanel(), 'Review matching capture')).toBeUndefined(); expect(findButton(monthPanel(), 'Review matching capture')).toBeUndefined();
    await act(async () => { findButton(host, 'Record annual result').click(); findButton(host, 'Record inspected result').click(); });
    expect(storedWorkspace()).toEqual(before);
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await change(host.querySelector('#aq-season-metric'), 'oxygen');
    assertPanel(annualPanel(), 'ready'); assertPanel(monthPanel(), 'ready');
    expect(findButton(host, 'Record annual result').disabled).toBe(false); expect(findButton(host, 'Record inspected result').disabled).toBe(false);
    expect(storedWorkspace()).toEqual(before);
  });

  it('updates both full previews when a reading is removed and appends a new capture without changing saved or parked evidence', async () => {
    await mount(workspace({ measurements: fullNotes(), experiments: [archive()], parkedDraft: parked() }));
    await change(host.querySelector('#aq-measurement-annual-metric'), 'minOxygen'); await change(host.querySelector('#aq-season-metric'), 'oxygen');
    const before = clone(storedWorkspace()); assertPanel(annualPanel(), 'full'); assertPanel(monthPanel(), 'full');
    await click(findButton(annualPanel(), 'Review notebook space')); assertFocus('aq-measurement-notebook-heading');
    await click(findButton(liveNotebook(), 'Remove reading'));
    expect(storedWorkspace().measurements).toEqual(before.measurements.slice(1)); assertWritingKept(before);
    assertPanel(annualPanel(), 'ready'); assertPanel(monthPanel(), 'ready');
    await click(findButton(host, 'Record annual result'));
    expect(storedWorkspace().measurements).toHaveLength(8); expect(storedWorkspace().measurements.slice(0, 7)).toEqual(before.measurements.slice(1));
    assertPanel(annualPanel(), 'captured'); assertPanel(monthPanel(), 'full'); assertWritingKept(before);
  });
});
