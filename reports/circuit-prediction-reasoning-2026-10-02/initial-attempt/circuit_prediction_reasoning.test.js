import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const copy = {
  prediction: { label: 'My prediction reasoning (optional)', name: 'My prediction reasoning (optional)', help: 'Explain why you expect the lamp current to change or stay the same. Writing is optional. After Test, use the saved readings to revise it. Your investigation notebook has its own explanation.', placeholder: 'I predict… because…' },
  explanation: { label: 'My explanation for this experiment', name: 'Transistor experiment explanation', help: 'Use the lamp current and operating regions to explain the change. This response stays with this experiment; your investigation notebook has its own explanation.', placeholder: 'I observed… The readings show…' }
};
const predictionKeys = ['stem.circuit.active_my_prediction_reasoning', 'stem.circuit.active_prediction_reasoning_help', 'stem.circuit.active_prediction_reasoning_placeholder'];
const explanationKeys = ['stem.circuit.active_my_lesson_explanation', 'stem.circuit.transistor_experiment_explanation', 'stem.circuit.active_explanation_help', 'stem.circuit.active_lesson_explanation_placeholder'];
const independent = state => clone({ observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack, view: state.view });

describe('Optional prediction reasoning before a lesson test', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, translations, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const label = () => lab().querySelector('.circuit-lesson-writing-heading label');
  const help = () => document.getElementById(field().getAttribute('aria-describedby').split(/\s+/)[0]);
  const count = () => lab().querySelector('.circuit-lesson-writing-count');
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const seed = patch => ({ ...api.circuitActiveDesign({ input: 4.2, supply: 12, baseResistance: 33000, beta: 240 }), lessonId: 'gain', lessonRecords: { gain: record(null, false, ''), sensor: record('same', true, 'Keep sensor evidence.') }, view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, observations: [api.circuitActiveObservation({ input: .8 }, 'Independent observation')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook explanation.', investigationTitle: 'A custom circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected notes.' } };
    function Harness() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (key, fallback) => { translations.push([key, fallback]); return locale + fallback; }, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'prediction.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  function assertCopy(phase, prefix = '') {
    const expected = copy[phase], el = field(); expect(label().textContent).toBe(prefix + expected.label); expect(label().htmlFor).toBe(el.id); expect(el.getAttribute('aria-label')).toBe(prefix + expected.name); expect(el.placeholder).toBe(prefix + expected.placeholder); expect(help().textContent).toBe(prefix + expected.help);
    expect(el.maxLength).toBe(4000); expect(el.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id))).toEqual([help(), count()]); expect(count().closest('[role="status"],[aria-live]')).toBeNull();
  }
  function assertNoEvidence() {
    expect(lab().querySelector('.circuit-active-lesson-evidence,.circuit-active-lesson-trace,.circuit-active-lesson-current-limit,.circuit-active-explanation-guide,.circuit-lesson-explanation-jump,.circuit-lesson-evidence-return')).toBeNull();
    expect([label().textContent, help().textContent, field().placeholder].join(' ')).not.toMatch(/I observed|operating regions|3\.00|8\.00|mA|saturat/i);
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn(); translations = [];
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('waits for a started record before showing reasoning and never creates a record on mount', async () => {
    await mount({ lessonRecords: {} }); expect(field()).toBeNull(); expect(label()).toBeNull(); expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled(); expect(translations.map(row => row[0])).not.toContain(predictionKeys[0]);
  });

  it.each([
    ['awaiting a choice', record(null, false, 'An early draft.'), 'predict', null],
    ['ready prediction', record('less', false, 'An early draft.'), 'test', null],
    ['invalid explicit choice overrides legacy evidence', record('invalid', true, 'An early draft.'), 'predict', { id: 'gain', choice: 'more', tested: true }],
    ['nonboolean tested flag', record('less', 'true', 'An early draft.'), 'test', null]
  ])('uses normalized untested wording for %s without claiming explanation progress', async (_name, saved, phase, challenge) => {
    await mount({ lessonRecords: { gain: saved }, challenge }); assertCopy('prediction'); assertNoEvidence(); expect(field().value).toBe('An early draft.'); expect(api.circuitActiveLessonJourney(latest._circuitActive, 'gain')).toMatchObject({ phase, explanationSaved: false }); expect(lab().querySelector('.circuit-active-lesson-journey').dataset.journeyPhase).toBe(phase);
    expect(button('Test transistor prediction').disabled).toBe(phase === 'predict'); expect(latest._circuitActive.lessonRecords.gain).toEqual(saved); expect(writes).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([false, true])('normalizes a legacy tested=%s record without rewriting the legacy file shape', async tested => {
    await mount({ lessonId: undefined, lessonRecords: {}, challenge: { id: 'limit', choice: 'more', tested } }); const initial = latest;
    expect(lab().querySelector('select').value).toBe('limit'); assertCopy(tested ? 'explanation' : 'prediction'); expect(field().value).toBe(''); expect(latest).toBe(initial); expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled(); if (!tested) assertNoEvidence();
  });

  it.each(['', 'My initial prediction was wrong.'])('retains every existing tested label, accessible name, help and placeholder with explanation=%j', async explanation => {
    await mount({ lessonRecords: { gain: record('less', true, explanation) } }); assertCopy('explanation'); expect(field().value).toBe(explanation); expect(lab().querySelector('.circuit-active-lesson-evidence')).not.toBeNull(); expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(explanationKeys)); expect(translations.map(row => row[0]).filter(key => predictionKeys.includes(key))).toEqual([]); expect(writes).not.toHaveBeenCalled();
  });

  it('preserves the exact prediction draft and existing field across Test, including a wrong choice and local expansion', async () => {
    await mount(); const protectedValues = independent(latest._circuitActive); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const el = field(), fieldId = el.id, helpId = help().id; el.focus();
    const draft = '  I predict less current because I think the transistor blocks it.\nI want to compare the readings.  '; await write(el, draft); expect(button('Test transistor prediction').disabled).toBe(true); assertNoEvidence();
    await click(button('Decreases')); expect(api.circuitActiveLessonJourney(latest._circuitActive, 'gain')).toMatchObject({ phase: 'test', explanationSaved: false }); translations.length = 0; await click(button('Test transistor prediction'));
    expect(field()).toBe(el); expect(el.id).toBe(fieldId); expect(help().id).toBe(helpId); expect(el.rows).toBe(12); expect(el.value).toBe(draft); assertCopy('explanation'); expect(latest._circuitActive.lessonRecords.gain).toEqual(record('less', true, draft)); expect(independent(latest._circuitActive)).toEqual(protectedValues); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(awards).not.toHaveBeenCalled();
    expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(explanationKeys)); expect(translations.map(row => row[0]).filter(key => predictionKeys.includes(key))).toEqual([]);
  });

  it.each(['', ' \n\t '])('keeps writing optional and enables Test only from a valid choice when draft=%j', async draft => {
    await mount(); await write(field(), draft); const before = latest; expect(button('Test transistor prediction').disabled).toBe(true); await click(button('Test transistor prediction')); expect(latest).toBe(before); assertNoEvidence();
    await click(button('Stays the same')); expect(button('Test transistor prediction').disabled).toBe(false); await click(button('Test transistor prediction')); expect(latest._circuitActive.lessonRecords.gain.tested).toBe(true); expect(field().value).toBe(draft); assertCopy('explanation'); expect(api.circuitActiveLessonJourney(latest._circuitActive, 'gain')).toMatchObject({ phase: 'explain', explanationSaved: false }); expect(awards).not.toHaveBeenCalled();
  });

  it('uses distinct prediction translation keys while locale and live edits preserve writing focus, selection and data', async () => {
    await mount({ lessonRecords: { gain: record('less', false, 'My reasoning before the test.') } }); const initial = latest, el = field(); el.focus(); el.setSelectionRange(3, 11, 'backward');
    expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(predictionKeys)); expect(translations.map(row => row[0]).filter(key => explanationKeys.includes(key))).toEqual([]);
    await act(async () => setLocale('Translated: ')); await flush(); assertCopy('prediction', 'Translated: '); expect(latest).toBe(initial); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([3, 11, 'backward']);
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 0, supply: 3, probeRed: 'emitter', probeBlack: 'collector' } })); expect(field()).toBe(el); assertCopy('prediction', 'Translated: '); expect(document.activeElement).toBe(el); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe('My reasoning before the test.'); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it('retains the existing 4000-character boundary, quiet count and history semantics for prediction drafts', async () => {
    await mount(); const history = clone({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo }), design = api.circuitActiveDesign(latest._circuitActive), protectedValues = independent(latest._circuitActive), el = field(); el.focus();
    const oversized = 'Reason: ' + 'x'.repeat(4005); await write(el, oversized); expect(el.value).toBe(oversized.slice(0, 4000)); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe(oversized.slice(0, 4000)); expect(count().textContent).toBe('4000 / 4000 characters'); assertCopy('prediction'); expect(button('Test transistor prediction').disabled).toBe(true); assertNoEvidence();
    expect({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo }).toEqual(history); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(design); expect(independent(latest._circuitActive)).toEqual(protectedValues); expect(document.activeElement).toBe(el); expect(awards).not.toHaveBeenCalled();
  });

  it('round-trips drafts through lesson switching and JSON without inventing new saved fields or auto navigation', async () => {
    await mount({ lessonRecords: { gain: record('less', false, ' Gain prediction draft. '), sensor: record('same', true, 'Sensor evidence.') } }); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const el = field(), original = api.circuitActiveInvestigation(latest._circuitActive), bench = api.circuitActiveDesign(latest._circuitActive);
    await select('sensor'); assertCopy('explanation'); await select('gain'); assertCopy('prediction'); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe(' Gain prediction draft. '); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(bench);
    const imported = api.circuitActiveInvestigation({ input: 2.7, supply: 9, lessonId: 'limit', lessonRecords: { limit: record('more', false, 'Imported prediction reasoning.') } }); expect(Object.keys(imported.lessonRecords.limit).sort()).toEqual(['choice', 'explanation', 'tested']); expect(api.parseCircuitInvestigation(JSON.stringify(imported)).lessonRecords.limit.explanation).toBe('Imported prediction reasoning.'); Element.prototype.scrollIntoView.mockClear();
    await importDoc(imported); assertCopy('prediction'); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe('Imported prediction reasoning.'); expect(latest._circuitActive.supply).toBe(9); expect(document.activeElement).not.toBe(el); expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-question]')); expect(button('Test transistor prediction').disabled).toBe(false);
    await click(button('Restore previous investigation')); assertCopy('prediction'); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
