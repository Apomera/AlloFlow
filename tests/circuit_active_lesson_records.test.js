import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, config;
const clone = value => JSON.parse(JSON.stringify(value));
const evidenceFields = state => clone({ reference: state.reference, observations: state.observations, investigationTitle: state.investigationTitle, investigationQuestion: state.investigationQuestion, investigationPrediction: state.investigationPrediction, reflection: state.reflection, probeRed: state.probeRed, probeBlack: state.probeBlack });
const seed = () => ({ input: 2.4, probeRed: 'drive', probeBlack: 'base', reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, observations: [api.circuitActiveObservation({ input: 1 }, 'Keep this operating point.')], investigationTitle: 'My independent question', investigationQuestion: 'What controls the lamp?', investigationPrediction: 'My own prediction', reflection: 'My notebook explanation.' });
const edit = (state, id, action, value) => api.circuitActiveLessonUpdate(state, id, action, value);
const records = state => api.circuitActiveLessonRecords(state);

beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
afterEach(() => vi.restoreAllMocks());

describe('Durable Active lesson records', () => {
  it('recovers legacy prediction progress independently of a later live-circuit edit', () => {
    const state = { input: 4, lessonId: 'gain', challenge: { id: 'gain', choice: 'less', tested: true }, reflection: 'Independent notebook note' }, before = JSON.stringify(state);
    expect(records(state).gain).toMatchObject({ choice: 'less', tested: true });
    expect(JSON.stringify(state)).toBe(before);
    const selected = edit(state, 'limit', 'select');
    expect(api.circuitActiveDesign(selected)).toEqual(api.circuitActiveDesign(state));
    expect(records(selected).gain).toMatchObject({ choice: 'less', tested: true });
    expect(selected.reflection).toBe(state.reflection);
  });

  it('keeps an explicit saved record authoritative over a legacy current challenge', () => {
    const state = { lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Original prediction and evidence.' } }, challenge: { id: 'gain', choice: 'more', tested: true } };
    expect(records(state).gain).toEqual(state.lessonRecords.gain);
    const result = records(state); result.gain.explanation = 'Mutated copy';
    expect(state.lessonRecords.gain.explanation).toBe('Original prediction and evidence.');
  });

  it('updates one lesson atomically and keeps independent notebook, reference, probes, and input objects intact', () => {
    const initial = seed(), untouched = JSON.stringify(initial), protectedValues = evidenceFields(initial);
    let state = edit(initial, 'gain', 'start');
    expect(state.input).toBe(1); expect(state.undo).toHaveLength(1);
    state = edit(state, 'gain', 'predict', 'less');
    expect(records(state).gain).toMatchObject({ choice: 'less', tested: false }); expect(state.undo).toHaveLength(1);
    state = edit(state, 'gain', 'test');
    expect(state.input).toBe(1.5); expect(state.undo).toHaveLength(2); expect(records(state).gain).toMatchObject({ choice: 'less', tested: true });
    state = edit(state, 'gain', 'explain', '3 mA increased to 8 mA; I revise my prediction.');
    expect(records(state).gain.explanation).toBe('3 mA increased to 8 mA; I revise my prediction.');
    expect(evidenceFields(state)).toEqual(protectedValues); expect(JSON.stringify(initial)).toBe(untouched);
    expect(state.undo.every(snapshot => Object.keys(snapshot).every(key => Object.hasOwn(api.circuitActiveDesign({}), key)))).toBe(true);
  });

  it('retains every lesson while switching and revisiting without loading over an edited circuit', () => {
    let state = seed();
    for (const [id, choice] of [['gain', 'less'], ['limit', 'same'], ['sensor', 'more']]) {
      state = edit(state, id, 'start'); state = edit(state, id, 'predict', choice); state = edit(state, id, 'test'); state = edit(state, id, 'explain', id + ' evidence');
    }
    const saved = clone(records(state)); state = { ...state, input: 4.2, light: 45, reflection: 'Still my independent note' };
    const bench = api.circuitActiveDesign(state), history = clone(state.undo);
    for (const id of ['gain', 'limit', 'sensor']) {
      state = edit(state, id, 'select');
      expect(api.circuitActiveDesign(state)).toEqual(bench); expect(state.undo).toEqual(history); expect(records(state)).toEqual(saved);
    }
  });

  it('requires a valid prediction and makes repeated tests idempotent', () => {
    let state = edit(seed(), 'gain', 'start');
    const before = JSON.stringify(state); expect(JSON.stringify(edit(state, 'gain', 'test'))).toBe(before);
    expect(JSON.stringify(edit(state, 'gain', 'predict', 'unknown'))).toBe(before);
    state = edit(state, 'gain', 'predict', 'more'); state = edit(state, 'gain', 'test');
    const tested = JSON.stringify(state); expect(JSON.stringify(edit(state, 'gain', 'test'))).toBe(tested);
    expect(JSON.stringify(edit(state, 'gain', 'predict', 'less'))).toBe(tested);
  });

  it('replays baseline and result as electrical edits without changing saved evidence', () => {
    let state = edit(seed(), 'gain', 'start'); state = edit(state, 'gain', 'predict', 'more'); state = edit(state, 'gain', 'test'); state = edit(state, 'gain', 'explain', 'Saved explanation');
    const saved = clone(records(state)), protectedValues = evidenceFields(state), count = state.undo.length;
    state = edit(state, 'gain', 'baseline'); expect(state.input).toBe(1); expect(state.undo).toHaveLength(count + 1);
    state = edit(state, 'gain', 'baseline'); expect(state.undo).toHaveLength(count + 1);
    state = edit(state, 'gain', 'result'); expect(state.input).toBe(1.5); expect(state.undo).toHaveLength(count + 2);
    state = edit(state, 'gain', 'result'); expect(state.undo).toHaveLength(count + 2);
    expect(records(state)).toEqual(saved); expect(evidenceFields(state)).toEqual(protectedValues);
  });

  it('an explicit retry resets only the selected lesson', () => {
    let state = seed();
    for (const id of ['gain', 'limit']) { state = edit(state, id, 'start'); state = edit(state, id, 'predict', 'more'); state = edit(state, id, 'test'); state = edit(state, id, 'explain', id + ' explanation'); }
    const limit = clone(records(state).limit); state = edit(state, 'gain', 'start');
    expect(records(state).gain).toEqual({ choice: null, tested: false, explanation: '' }); expect(records(state).limit).toEqual(limit);
  });
});

describe('Active lesson investigation files and reports', () => {
  function completed() {
    let state = seed();
    for (const [id, choice] of [['gain', 'less'], ['limit', 'same'], ['sensor', 'more']]) { state = edit(state, id, 'start'); state = edit(state, id, 'predict', choice); state = edit(state, id, 'test'); state = edit(state, id, 'explain', id + ' preserved explanation'); }
    return { ...state, input: 4, light: 50 };
  }

  it('round-trips all three records even when the current circuit differs from their modeled results', () => {
    const state = completed(), doc = api.circuitActiveInvestigation(state), restored = api.parseCircuitInvestigation(JSON.stringify(doc));
    expect(doc.format).toBe('circuit-investigation-v1'); expect(doc.lessonRecords).toEqual(records(state));
    expect(records(restored)).toEqual(records(state)); expect(api.circuitActiveDesign(restored)).toEqual(api.circuitActiveDesign(state));
    expect(evidenceFields(restored)).toEqual(evidenceFields(state)); expect(api.circuitActiveInvestigation(restored)).toEqual(doc);
  });

  it('continues to accept v1 files without the optional lessonRecords field', () => {
    const doc = api.circuitActiveInvestigation({ input: 1.5, lessonId: 'gain', challenge: { id: 'gain', choice: 'less', tested: true } });
    delete doc.lessonRecords;
    const restored = api.parseCircuitInvestigation(JSON.stringify(doc));
    expect(restored.challenge).toEqual({ id: 'gain', choice: 'less', tested: true }); expect(records(restored).gain).toMatchObject({ choice: 'less', tested: true });
  });

  it.each([
    ['unknown lesson', { other: { choice: 'more', tested: true, explanation: '' } }],
    ['invalid choice', { gain: { choice: 'up', tested: false, explanation: '' } }],
    ['tested without prediction', { gain: { choice: null, tested: true, explanation: '' } }],
    ['nonboolean progress', { gain: { choice: 'more', tested: 'true', explanation: '' } }],
    ['nontext explanation', { gain: { choice: 'more', tested: true, explanation: null } }],
    ['array collection', []]
  ])('rejects %s in imported lesson records', (_name, lessonRecords) => {
    const doc = api.circuitActiveInvestigation({}); doc.lessonRecords = lessonRecords;
    expect(() => api.parseCircuitInvestigation(JSON.stringify(doc))).toThrow();
  });

  it('reports every saved prediction with recomputed model evidence and escaped explanation text', () => {
    let state = completed(); state = edit(state, 'gain', 'explain', '<script>unsafe()</script> My initial prediction was wrong.');
    const doc = new DOMParser().parseFromString(api.circuitActiveReport(state), 'text/html');
    expect(doc.body.textContent).toContain('3.00 mA'); expect(doc.body.textContent).toContain('8.00 mA');
    expect(doc.body.textContent).toContain('limit preserved explanation'); expect(doc.body.textContent).toContain('sensor preserved explanation');
    expect(doc.body.textContent).toContain('<script>unsafe()</script> My initial prediction was wrong.'); expect(doc.querySelector('script')).toBeNull();
  });
});

describe('Active lesson interactions', () => {
  let host, root, latest, update, awards;
  beforeEach(() => {
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); awards = vi.fn();
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  async function mount(patch = {}) {
    const initial = { ...seed(), ...patch };
    function Harness() {
      const [toolData, setToolData] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: { ...initial, view: 'schematic' } });
      latest = toolData._circuitActive; update = setToolData;
      return config.render(makeCtx({ toolData, setToolData, awardXP: awards }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const panel = () => host.querySelector('.circuit-active-predict');
  const button = text => [...host.querySelectorAll('button')].find(element => element.textContent === text);
  async function click(text) { const element = button(text); expect(element).toBeTruthy(); await act(async () => element.click()); }
  async function select(id) { const field = panel().querySelector('select'); await act(async () => { field.value = id; field.dispatchEvent(new Event('change', { bubbles: true })); }); }
  async function explain(value) {
    const field = panel().querySelector('textarea[aria-label="Transistor experiment explanation"]'); expect(field).toBeTruthy();
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); });
  }
  async function readInvestigation(content) {
    const input = host.querySelector('input[type="file"][aria-label="Open investigation file"]'); expect(input).toBeTruthy();
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'investigation.json', size: 2048, text: () => Promise.resolve(content) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  }
  const importedFixture = title => api.circuitActiveInvestigation({ input: 1.5, investigationTitle: title, lessonId: 'gain', lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'Imported evidence.' } } });
  const callback = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))].onClick;

  it('keeps a wrong prediction and explanation after another lesson and free circuit edits', async () => {
    await mount(); const protectedValues = evidenceFields(latest);
    await click('Start transistor prediction'); await click('Decreases'); await click('Test transistor prediction'); await explain('The input raised lamp current from 3 to 8 mA.');
    await select('limit');
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 4.2 } })));
    const bench = api.circuitActiveDesign(latest), history = clone(latest.undo); await select('gain');
    expect(api.circuitActiveDesign(latest)).toEqual(bench); expect(latest.undo).toEqual(history);
    expect(records(latest).gain).toEqual({ choice: 'less', tested: true, explanation: 'The input raised lamp current from 3 to 8 mA.' });
    expect(panel().textContent).toContain('3.00 mA'); expect(panel().textContent).toContain('8.00 mA');
    expect(panel().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases');
    expect(evidenceFields(latest)).toEqual(protectedValues); expect(awards).not.toHaveBeenCalled();
  });

  it('performs one electrical change for a double Test activation and preserves evidence through Undo and replay', async () => {
    await mount(); await click('Start transistor prediction'); await click('Increases');
    const test = button('Test transistor prediction'), count = latest.undo.length;
    await act(async () => { test.click(); test.click(); });
    expect(latest.input).toBe(1.5); expect(latest.undo).toHaveLength(count + 1); expect(records(latest).gain.tested).toBe(true);
    await explain('This evidence stays saved.'); const saved = clone(records(latest));
    await click('Undo active edit'); expect(latest.input).toBe(1); expect(records(latest)).toEqual(saved);
    await click('Load this experiment result'); expect(latest.input).toBe(1.5); expect(records(latest)).toEqual(saved);
    await click('Load experiment baseline'); expect(latest.input).toBe(1); expect(records(latest)).toEqual(saved);
    expect(latest.reflection).toBe('My notebook explanation.'); expect(awards).not.toHaveBeenCalled();
  });

  it('loading a preview twice keeps the original recoverable investigation and its lesson records', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep my original lesson.' } } });
    const original = clone(latest);
    await readInvestigation(JSON.stringify(importedFixture('Imported investigation')));
    const load = button('Load investigation'); expect(load).toBeTruthy(); const oldLoad = callback(load);
    await act(async () => { oldLoad({ currentTarget: load }); oldLoad({ currentTarget: load }); });
    expect(latest.investigationTitle).toBe('Imported investigation');
    expect(latest.previousInvestigation).toEqual(original);
    expect(records(latest.previousInvestigation).gain.explanation).toBe('Keep my original lesson.');
    await click('Restore previous investigation');
    expect(latest.investigationTitle).toBe(original.investigationTitle); expect(records(latest)).toEqual(records(original));
    expect(latest.observations).toEqual(original.observations); expect(latest.reflection).toBe(original.reflection);
  });

  it('ignores a captured Load callback after another file read starts or its preview is dismissed', async () => {
    await mount(); const original = JSON.stringify(latest);
    await readInvestigation(JSON.stringify(importedFixture('First preview')));
    const first = button('Load investigation'), oldFirst = callback(first);
    let finishRead; const pending = new Promise(resolve => { finishRead = resolve; });
    await readInvestigation(pending);
    await act(async () => oldFirst({ currentTarget: first }));
    expect(JSON.stringify(latest)).toBe(original);
    await act(async () => finishRead(JSON.stringify(importedFixture('Second preview'))));
    const second = button('Load investigation'); expect(second).toBeTruthy(); const oldSecond = callback(second);
    await click('Dismiss investigation preview');
    await act(async () => oldSecond({ currentTarget: second }));
    expect(JSON.stringify(latest)).toBe(original); expect(button('Load investigation')).toBeUndefined();
  });
});
