import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const experiments = [
  ['gain', 'manual', 'input', 1, 1.5],
  ['limit', 'manual', 'input', 3.3, 5],
  ['sensor', 'dark', 'light', 80, 20]
];
const fixed = { supply: 5, baseResistance: 10000, loadResistance: 220, beta: 100 };
let api, config;
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
const record = (tested = true) => ({ choice: 'less', tested, explanation: 'Keep my experiment explanation.' });
const edit = (state, id, action, value) => api.circuitActiveLessonUpdate(state, id, action, value);
const seed = () => ({ ...api.circuitActiveDesign({ input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), view: 'schematic', probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .8 }, 'Independent observation.')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook.', investigationTitle: 'A custom circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })] });
const independentWork = state => clone({ observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack });

describe('Fixed experiment plan contract', () => {
  it.each(experiments)('describes only the %s settings and the one controlled change', (id, project, key, before, after) => {
    const plan = api.circuitActiveLessonPlan(id);
    expect(plan).toEqual({ id, project, change: { key, before, after }, constants: expect.any(Array), controlled: true });
    expect(Object.fromEntries(plan.constants.map(row => [row.key, row.value]))).toEqual(project === 'manual' ? fixed : { ...fixed, dividerResistance: 10000 });
    expect(plan.constants.map(row => row.key)).not.toContain(key);
    expect(plan.constants.every(row => Object.keys(row).length === 2)).toBe(true);
    expect(JSON.stringify(plan)).not.toMatch(/Current|Voltage|region|brightness|ldr|thevenin|answer/);
  });

  it('uses gain for absent or invalid IDs and returns independently mutable plan values', () => {
    const expected = api.circuitActiveLessonPlan('gain');
    for (const id of [undefined, null, 'unknown', {}, 'toString']) expect(api.circuitActiveLessonPlan(id)).toEqual(expected);
    const changed = api.circuitActiveLessonPlan('gain'); changed.change.after = 900; changed.constants[0].value = 999;
    expect(api.circuitActiveLessonPlan('gain')).toEqual(expected);
  });

  it.each(experiments)('Start and Test load exactly the %s plan while preserving independent work', (id, project, key, before, after) => {
    const original = seed(), originalJSON = JSON.stringify(original), protectedValues = independentWork(original), plan = api.circuitActiveLessonPlan(id);
    let state = edit(original, id, 'start');
    expect(state.project).toBe(project); expect(state[key]).toBe(before);
    for (const row of plan.constants) expect(state[row.key]).toBe(row.value);
    const baseline = api.circuitActiveDesign(state); state = edit(state, id, 'predict', 'less'); state = edit(state, id, 'test');
    const compared = api.circuitActiveComparison({ version: 1, design: baseline }, state);
    expect(compared.controlled).toBe(true); expect(compared.changes.map(row => row.key)).toEqual([key]); expect(state[key]).toBe(after);
    expect(independentWork(state)).toEqual(protectedValues); expect(JSON.stringify(original)).toBe(originalJSON);
  });
});

describe('Replay history follows physical circuit changes', () => {
  it.each([
    ['gain', 'baseline', { input: 1 }, { light: 17, dividerResistance: 33000 }],
    ['gain', 'result', { input: 1.5 }, { light: 91, dividerResistance: 47000 }],
    ['sensor', 'baseline', { project: 'dark', light: 80 }, { input: 4.2 }],
    ['sensor', 'result', { project: 'dark', light: 20 }, { input: .2 }]
  ])('%s %s preserves inactive settings, Undo, and Redo when the physical circuit already matches', (id, action, design, inactive) => {
    const state = { ...seed(), ...api.circuitActiveDesign(design), ...inactive, lessonId: id, lessonRecords: { [id]: record() }, challenge: { id, choice: 'less', tested: true } }, before = JSON.stringify(state);
    const next = edit(state, id, action);
    expect(api.circuitActiveComparison({ version: 1, design: api.circuitActiveDesign(design) }, state).unchanged).toBe(true);
    expect(api.circuitActiveDesign(next)).toEqual(api.circuitActiveDesign(state));
    expect(next.undo).toBe(state.undo); expect(next.redo).toBe(state.redo); expect(independentWork(next)).toEqual(independentWork(state));
    expect(next.lessonRecords).toEqual(state.lessonRecords); expect(JSON.stringify(state)).toBe(before);
    expect(JSON.stringify(edit(next, id, action))).toBe(JSON.stringify(next));
  });

  it('still selects another saved lesson when its replay is an electrical no-op', () => {
    const state = { ...seed(), ...api.circuitActiveDesign({ input: 1.5 }), light: 8, lessonId: 'limit', lessonRecords: { gain: record(), limit: record() }, challenge: { id: 'limit', choice: 'less', tested: true } };
    const next = edit(state, 'gain', 'result');
    expect(next.lessonId).toBe('gain'); expect(next.challenge.id).toBe('gain'); expect(next.light).toBe(8); expect(next.undo).toBe(state.undo); expect(next.redo).toBe(state.redo); expect(next.lessonRecords).toEqual(state.lessonRecords);
  });

  it.each(['gain', 'sensor'])('a real %s replay keeps the latest previous design recoverable', id => {
    const state = { ...seed(), lessonId: id, lessonRecords: { [id]: record() } }, previous = api.circuitActiveDesign(state), count = state.undo.length;
    const next = edit(state, id, 'baseline'), plan = api.circuitActiveLessonPlan(id);
    expect(next.undo).toHaveLength(count + 1); expect(next.undo.at(-1)).toEqual(previous); expect(next.redo).toEqual([]);
    expect(next.project).toBe(plan.project); expect(next[plan.change.key]).toBe(plan.change.before); expect(independentWork(next)).toEqual(independentWork(state));
    expect(next.lessonRecords).toEqual(state.lessonRecords);
  });

  it('keeps explicit Start retry semantics even when the live circuit matches', () => {
    const state = { ...seed(), ...api.circuitActiveDesign({ input: 1 }), light: 17, lessonId: 'gain', lessonRecords: { gain: record(), limit: record() } };
    const next = edit(state, 'gain', 'start');
    expect(next.lessonRecords.gain).toEqual({ choice: null, tested: false, explanation: '' }); expect(next.lessonRecords.limit).toEqual(state.lessonRecords.limit);
    expect(next.light).toBe(50); expect(independentWork(next)).toEqual(independentWork(state));
  });
});

describe('Experiment setup in the learner workflow', () => {
  let host, root, latest, update, setLocale, frames, scrollOriginal, writes;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const plan = () => lab().querySelector('.circuit-active-experiment-plan');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function mount(active = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: { ...seed(), notebookOpen: true, ...active }, _circuitNetwork: { reflection: 'Keep connected work.' } };
    function Host() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback })); }
    await act(async () => root.render(React.createElement(Host))); await flush();
  }
  beforeEach(() => { frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); writes = vi.fn(); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each(experiments)('shows the fixed %s plan on a tuned bench without exposing its outcome', async (id, project, key, before, after) => {
    await mount({ lessonId: id });
    expect(plan().dataset.planId).toBe(id); expect(plan().dataset.planProject).toBe(project);
    expect(plan().querySelector('.circuit-plan-constants')).not.toBeNull(); expect(plan().querySelector('summary').textContent).toBe('Settings held constant');
    expect([...plan().querySelectorAll('.circuit-plan-change .circuit-plan-value-number')].map(el => Number(el.textContent))).toEqual([before, after]);
    const settings = [...plan().querySelectorAll('[data-plan-constant]')].map(el => [el.dataset.planConstant, Number(el.querySelector('.circuit-plan-value-number').textContent), el.querySelector('.circuit-plan-value-unit')?.textContent.trim() || '']);
    expect(settings).toEqual(project === 'manual' ? [['supply', 5, 'V'], ['baseResistance', 10, 'kΩ'], ['loadResistance', 220, 'Ω'], ['beta', 100, '']] : [['supply', 5, 'V'], ['baseResistance', 10, 'kΩ'], ['loadResistance', 220, 'Ω'], ['beta', 100, ''], ['dividerResistance', 10, 'kΩ']]);
    expect(plan().textContent).not.toMatch(/mA|µA|saturat|cutoff|3\.00 mA|8\.00 mA|21\.82/);
    expect(lab().querySelector('.circuit-active-lesson-evidence,.circuit-active-lesson-trace')).toBeNull();
    expect(latest._circuitActive.supply).toBe(12); expect(latest._circuitActive.baseResistance).toBe(33000); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps the plan stable through prediction, a wrong Test, and later live circuit edits', async () => {
    await mount({ lessonId: 'gain' }); const planText = plan().textContent, own = independentWork(latest._circuitActive);
    await click(button('Start transistor prediction')); expect(plan().textContent).toBe(planText); expect(lab().querySelector('.circuit-active-lesson-trace')).toBeNull();
    await click(button('Decreases')); expect(plan().textContent).toBe(planText); expect(lab().querySelector('.circuit-active-lesson-trace')).toBeNull();
    await click(button('Test transistor prediction')); expect(plan().textContent).toBe(planText); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases');
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 12, baseResistance: 47000 } }));
    expect(plan().textContent).toBe(planText); expect(independentWork(latest._circuitActive)).toEqual(own);
  });

  it('places a single live-bench mismatch notice before prediction controls and updates it after an undoable baseline reload', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: record(false) } });
    const note = lab().querySelector('.circuit-active-lesson-bench-note'), choices = lab().querySelector('.circuit-active-lesson-predictions');
    expect(note.textContent).toContain('live bench differs'); expect(note.compareDocumentPosition(choices) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lab().querySelectorAll('.circuit-active-lesson-bench-note')).toHaveLength(1);
    const previous = api.circuitActiveDesign(latest._circuitActive); await click(button('Load experiment baseline'));
    expect(lab().querySelector('.circuit-active-lesson-bench-note').textContent).toContain('baseline is on your bench');
    await click(button('Undo active edit')); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(previous); expect(lab().querySelector('.circuit-active-lesson-bench-note').textContent).toContain('live bench differs');
  });

  it('retains only the existing replay note for tested evidence', async () => {
    await mount({ lessonId: 'sensor', lessonRecords: { sensor: record() } });
    expect(lab().querySelectorAll('.circuit-active-lesson-bench-note')).toHaveLength(1);
    expect(lab().querySelector('.circuit-active-lesson-replay .circuit-active-lesson-bench-note')).not.toBeNull();
    expect(plan().querySelector('[role="status"],[aria-live]')).toBeNull();
  });

  it('native setup disclosure and translations preserve live work and do not redirect focus', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: record(false) } });
    const summary = plan().querySelector('summary'), before = JSON.stringify(latest); summary.focus(); await click(summary);
    expect(plan().querySelector('details').open).toBe(true); expect(document.activeElement).toBe(summary); expect(JSON.stringify(latest)).toBe(before); expect(writes).not.toHaveBeenCalled();
    const input = host.querySelector('textarea.circuit-notebook-reflection'); input.focus(); await act(async () => setLocale('Translated: ')); await flush();
    expect(document.activeElement).toBe(input); expect(JSON.stringify(latest)).toBe(before); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('imported records choose their fixed plan without moving focus or changing imported settings', async () => {
    await mount(); const doc = api.circuitActiveInvestigation({ supply: 9, project: 'light', light: 55, lessonId: 'sensor', lessonRecords: { sensor: record(false) } });
    const input = host.querySelector('input[aria-label="Open investigation file"]'); Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'plan.json', size: 1024, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); await click(button('Load investigation'));
    expect(plan().dataset.planId).toBe('sensor'); expect(plan().dataset.planProject).toBe('dark'); expect(latest._circuitActive.project).toBe('light'); expect(latest._circuitActive.supply).toBe(9);
    expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-question]')); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('a captured replay handler saves the latest tuned circuit, then repeated replay keeps Redo when already matched', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: record(false) } });
    const el = button('Load experiment baseline'), oldReplay = el[Object.keys(el).find(key => key.startsWith('__reactProps$'))].onClick;
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 7, input: 3.7, reflection: 'Latest notebook edit.' } })); const previous = api.circuitActiveDesign(latest._circuitActive);
    await act(async () => oldReplay({ currentTarget: el })); await flush(); expect(latest._circuitActive.undo.at(-1)).toEqual(previous); expect(latest._circuitActive.reflection).toBe('Latest notebook edit.');
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, light: 7, dividerResistance: 47000, redo: [previous] } }));
    const snapshot = clone(latest._circuitActive); await act(async () => oldReplay({ currentTarget: el })); await flush();
    expect(latest._circuitActive.undo).toEqual(snapshot.undo); expect(latest._circuitActive.redo).toEqual(snapshot.redo); expect(latest._circuitActive.light).toBe(7); expect(latest._circuitActive.dividerResistance).toBe(47000);
  });
});
