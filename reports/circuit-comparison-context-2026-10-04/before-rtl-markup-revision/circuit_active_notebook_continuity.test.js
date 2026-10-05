import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, config;
const clone = value => JSON.parse(JSON.stringify(value));
const protectedState = state => clone(Object.fromEntries(['lessonRecords', 'reflection', 'investigationTitle', 'investigationQuestion', 'investigationPrediction', 'reference', 'probeRed', 'probeBlack', 'undo', 'redo'].map(key => [key, state[key]])));
const point = (input, note = String(input), extra = {}) => api.circuitActiveObservation({ input, ...extra }, note);
const seed = extra => ({ input: 2.4, probeRed: 'drive', probeBlack: 'base', reflection: 'Keep my explanation.', investigationTitle: 'Independent question', investigationQuestion: 'What controls current?', investigationPrediction: 'More input gives more current.', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep lesson evidence.' } }, reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, undo: [api.circuitActiveDesign({ input: .8 })], redo: [api.circuitActiveDesign({ input: 3 })], observations: [point(1, 'A'), point(1.5, 'B')], ...extra });
const edit = (state, action, target, value) => api.circuitActiveNotebookUpdate(state, action, target, value);

beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
afterEach(() => vi.restoreAllMocks());

describe('Active observation identity and notebook capacity', () => {
  it('canonicalizes default fields, inactive settings and probes without merging different measurements', () => {
    const key = api.circuitActiveObservationKey;
    expect(key(point(1, 'A', { light: 0, dividerResistance: 1000 }))).toBe(key(point(1, 'B', { light: 100, dividerResistance: 90000 })));
    expect(key(point(1, 'A', { project: 'light' }))).toBe(key(point(5, 'B', { project: 'light' })));
    expect(key(point(1, '', { probeRed: 'drive', probeBlack: 'base' }))).not.toBe(key(point(1, '', { probeRed: 'base', probeBlack: 'drive' })));
    expect(key(point(1))).not.toBe(key(point(1.1)));
  });

  it('records latest state once and opens the existing note for a repeated activation', () => {
    const original = seed({ observations: [] }), before = JSON.stringify(original);
    const first = edit(original, 'record');
    const second = edit(first, 'record');
    expect(first.observations).toHaveLength(1); expect(first.observations[0].design.input).toBe(2.4);
    expect(second.observations).toHaveLength(1); expect(second.observations[0]).toBe(first.observations[0]);
    expect(second.notebookOpen).toBe(true); expect(second.notebookFocusIndex).toBe(0); expect(second.notebookFocusToken).toBeGreaterThan(first.notebookFocusToken);
    expect(protectedState(second)).toEqual(protectedState(original)); expect(JSON.stringify(original)).toBe(before);
  });

  it('deduplicates a semantically equivalent point even at capacity, but permits a different probe pair', () => {
    const list = Array.from({ length: 8 }, (_, i) => point(i / 10 + .8, 'Saved ' + i));
    let state = seed({ ...list[0].design, probeRed: list[0].probeRed, probeBlack: list[0].probeBlack, light: 99, dividerResistance: 88000, observations: list });
    state = edit(state, 'record'); expect(state.observations).toHaveLength(8); expect(state.notebookFocusIndex).toBe(0); expect(state.observations).toEqual(list);
    const pair = edit(seed({ observations: [point(2.4, 'Original', { probeRed: 'base', probeBlack: 'drive' })] }), 'record');
    expect(pair.observations).toHaveLength(2); expect(pair.observations[1].probeRed).toBe('drive');
  });

  it('refuses a ninth unique point without evicting any notes or changing circuit history', () => {
    const state = seed({ observations: Array.from({ length: 8 }, (_, i) => point(i / 10 + .8, 'Keep ' + i)) });
    const result = edit(state, 'record'); expect(result.observations).toEqual(state.observations); expect(result.investigationNotice).toMatch(/full/i); expect(protectedState(result)).toEqual(protectedState(state));
  });

  it('edits one legacy duplicate by identity and ignores its stale note/remove callbacks', () => {
    const a = point(1, 'A'), b = point(1, 'B'); let state = seed({ observations: [a, b] });
    state = edit(state, 'note', b, 'Only B'); expect(state.observations.map(o => o.note)).toEqual(['A', 'Only B']);
    const updatedB = state.observations[1]; state = edit(state, 'remove', updatedB);
    expect(state.observations).toEqual([a]); const removed = state;
    expect(edit(state, 'note', updatedB, 'Stale')).toBe(removed); expect(edit(state, 'remove', updatedB)).toBe(removed);
    expect(edit(state, 'revisit', updatedB)).toBe(removed); expect(edit(state, 'reference', updatedB)).toBe(removed);
  });

  it('does not let a stale first-row note or a double remove act on the shifted second row', () => {
    const state = seed(), a = state.observations[0], b = state.observations[1], removed = edit(state, 'remove', a);
    expect(edit(removed, 'note', a, 'Wrong row')).toBe(removed); expect(edit(removed, 'remove', a)).toBe(removed);
    expect(removed.observations).toEqual([b]); expect(removed.removedObservations).toHaveLength(1);
  });

  it('keeps earlier removals recoverable when a full notebook is refilled and another point makes room', () => {
    const list = Array.from({ length: 8 }, (_, i) => point(.8 + i / 10, 'Keep ' + i)); let state = seed({ observations: list });
    state = edit(state, 'remove', list[0]); state = edit(state, 'record');
    expect(state.observations).toHaveLength(8); const pendingA = state.removedObservations[0];
    const blocked = edit(state, 'restore', pendingA); expect(blocked.observations).toHaveLength(8); expect(blocked.removedObservations[0]).toBe(pendingA);
    state = edit(blocked, 'remove', list[1]); expect(state.removedObservations.map(item => item.entry.note)).toEqual(['Keep 0', 'Keep 1']);
    state = edit(state, 'restore', pendingA); expect(state.observations).toContain(list[0]); expect(state.removedObservations.map(item => item.entry.note)).toEqual(['Keep 1']); expect(state.removedObservation).toBe(state.removedObservations[0]);
  });

  it('requires an explicit discard at eight pending removals and discards only the selected note', () => {
    const pending = Array.from({ length: 8 }, (_, i) => ({ entry: point(.7 + i / 10, 'Removed ' + i), index: i }));
    let state = seed({ removedObservations: pending, removedObservation: pending[0] }); const old = state.observations[0];
    state = edit(state, 'remove', old); expect(state.observations).toContain(old); expect(state.removedObservations).toEqual(pending); expect(state.investigationNotice).toMatch(/discard|restore/i);
    state = edit(state, 'discard', pending[3]); expect(state.removedObservations.map(item => item.entry.note)).toEqual(['Removed 0', 'Removed 1', 'Removed 2', 'Removed 4', 'Removed 5', 'Removed 6', 'Removed 7']);
    expect(protectedState(state)).toEqual(protectedState(seed()));
    state = edit(state, 'remove', old); expect(state.observations).not.toContain(old); expect(state.removedObservations).toHaveLength(8);
  });

  it('restores an equivalent historical point with its distinct note and supports legacy pending state', () => {
    const existing = point(1, 'New observation'), historical = point(1, 'Original authored explanation');
    const pending = { entry: historical, index: 0 }; const state = seed({ observations: [existing], removedObservation: pending });
    const restored = edit(state, 'restore', pending); expect(restored.observations).toEqual([historical, existing]); expect(restored.removedObservation).toBeNull(); expect(restored.removedObservations).toEqual([]);
  });

  it('ignores captured recovery actions after a queue shift, even for identical pending entries', () => {
    const a = { entry: point(1, 'Same'), index: 0 }, b = { entry: point(1, 'Same'), index: 0 }; let state = seed({ removedObservations: [a, b] });
    state = edit(state, 'discard', a); expect(edit(state, 'discard', a)).toBe(state); expect(edit(state, 'restore', a)).toBe(state); expect(state.removedObservations).toEqual([b]);
  });

  it('revisits an existing observation from the latest circuit and keeps electrical Undo separate from authored work', () => {
    let state = seed({ input: 4.2 }), entry = state.observations[0], originalDesign = api.circuitActiveDesign(state), notes = clone(state.observations), records = clone(state.lessonRecords);
    state = edit(state, 'revisit', entry); expect(api.circuitActiveDesign(state)).toEqual(entry.design); expect(state.probeRed).toBe(entry.probeRed); expect(state.probeBlack).toBe(entry.probeBlack);
    expect(state.undo.at(-1)).toEqual(originalDesign); expect(state.redo).toEqual([]); expect(state.observations).toEqual(notes); expect(state.lessonRecords).toEqual(records); expect(state.reflection).toBe('Keep my explanation.');
    const size = state.undo.length; state = edit(state, 'revisit', entry); expect(state.undo).toHaveLength(size);
  });

  it('sets a saved point as reference without changing the bench, probes, lessons or history', () => {
    const state = seed(), result = edit(state, 'reference', state.observations[1]);
    expect(result.reference).toEqual({ version: 1, design: state.observations[1].design }); expect(api.circuitActiveDesign(result)).toEqual(api.circuitActiveDesign(state));
    expect({ ...protectedState(result), reference: null }).toEqual({ ...protectedState(state), reference: null });
  });
});

describe('Mounted Active notebook continuity', () => {
  let host, root, latest, update;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  async function mount(extra = {}) {
    function Harness() { const [toolData, setToolData] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed({ notebookOpen: true, view: 'schematic', ...extra }) }); latest = toolData._circuitActive; update = setToolData; return config.render(makeCtx({ toolData, setToolData })); }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const button = label => [...host.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label || el.textContent === label);
  const props = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
  const callback = (label, event = 'onClick') => { const el = typeof label === 'string' ? button(label) : label; expect(el).toBeTruthy(); return props(el)[event]; };
  const settleFocus = async () => act(async () => new Promise(resolve => requestAnimationFrame(resolve)));
  const click = async label => { const el = button(label); expect(el).toBeTruthy(); await act(async () => el.click()); await settleFocus(); };

  it('records the latest circuit once for two queued activations and focuses its new note', async () => {
    await mount({ notebookOpen: false, observations: [] }); const record = callback('Record operating point');
    await act(async () => { update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 1.8 } })); record({}); record({}); });
    expect(latest.observations).toHaveLength(1); expect(latest.observations[0].design.input).toBe(1.8); expect(latest.notebookOpen).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('textarea[aria-label="Observation 1 note"]'));
    expect([...host.querySelectorAll('[role="status"]')].filter(el => el.textContent.trim() === latest.investigationNotice)).toHaveLength(1);
  });

  it('wires note/remove/revisit/reference to captured row identity instead of the shifted index', async () => {
    await mount(); const field = host.querySelector('textarea[aria-label="Observation 1 note"]');
    const removeButton = button('Remove observation 1'), note = callback(field, 'onChange'), remove = callback(removeButton), revisit = callback('Revisit observation 1'), reference = callback('Use observation 1 as reference');
    const bench = api.circuitActiveDesign(latest), initialRef = clone(latest.reference);
    await act(async () => { remove({ currentTarget: removeButton }); remove({ currentTarget: removeButton }); note({ target: { value: 'Wrong row' } }); revisit({}); reference({}); });
    await settleFocus();
    expect(latest.observations.map(o => o.note)).toEqual(['B']); expect(latest.removedObservations).toHaveLength(1); expect(api.circuitActiveDesign(latest)).toEqual(bench); expect(latest.reference).toEqual(initialRef);
    expect(document.activeElement).toBe(host.querySelector('#circuit-active-notebook > summary'));
  });

  it('edits and removes only the second legacy duplicate, then restores its distinct note', async () => {
    await mount({ observations: [point(1, 'A'), point(1, 'B')] }); const note = callback(host.querySelector('textarea[aria-label="Observation 2 note"]'), 'onChange');
    await act(async () => note({ target: { value: 'Only B revised' } })); expect(latest.observations.map(o => o.note)).toEqual(['A', 'Only B revised']);
    await click('Remove observation 2'); expect(latest.observations.map(o => o.note)).toEqual(['A']);
    await click('Restore removed observation'); expect(latest.observations.map(o => o.note)).toEqual(['A', 'Only B revised']); expect(document.activeElement).toBe(host.querySelector('#circuit-active-notebook > summary'));
  });

  it('lets Undo restore the prior live circuit after observation replay without losing authored evidence', async () => {
    await mount({ input: 4.2 }); const saved = clone({ observations: latest.observations, lessonRecords: latest.lessonRecords, reflection: latest.reflection });
    await click('Revisit observation 1'); expect(latest.input).toBe(1); await click('Undo active edit'); expect(latest.input).toBe(4.2);
    expect({ observations: latest.observations, lessonRecords: latest.lessonRecords, reflection: latest.reflection }).toEqual(saved);
  });
});
