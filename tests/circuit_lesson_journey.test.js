import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
let api, config;
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
const saved = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const expected = (phase, explanationSaved = false) => ({
  id: 'gain', phase, currentStep: ['start', 'predict'].includes(phase) ? 'predict' : phase === 'test' ? 'test' : 'explain', explanationSaved,
  steps: [
    { id: 'predict', status: ['start', 'predict'].includes(phase) ? 'current' : 'saved' },
    { id: 'test', status: ['start', 'predict'].includes(phase) ? 'upcoming' : phase === 'test' ? 'current' : 'saved' },
    { id: 'explain', status: ['explain', 'review'].includes(phase) ? 'current' : 'upcoming' }
  ]
});
const phases = [
  ['start', undefined, false],
  ['predict', saved(), false],
  ['test', saved('less'), false],
  ['explain', saved('less', true, ' \n\t '), false],
  ['review', saved('less', true, ' My evidence remains editable. '), true]
];

describe('Journey stages reflect saved work', () => {
  it.each(phases)('derives %s from the saved record without changing any state', (phase, record, explanationSaved) => {
    const state = { input: 4.8, supply: 12, reflection: 'Independent writing', undo: [{ input: 2 }], ...(record ? { lessonRecords: { gain: record } } : {}) }, before = JSON.stringify(state);
    expect(api.circuitActiveLessonJourney(state, 'gain')).toEqual(expected(phase, explanationSaved)); expect(JSON.stringify(state)).toBe(before);
  });
  it('normalizes legacy records and explicit records, leaving the notebook reflection separate', () => {
    const legacy = { challenge: { id: 'limit', choice: 'same', tested: true }, reflection: 'This notebook text is not a lesson explanation.' };
    expect(api.circuitActiveLessonJourney(legacy, 'limit')).toEqual({ ...expected('explain'), id: 'limit' });
    const explicit = { ...legacy, lessonRecords: { limit: saved(null, false, 'A pre-test draft.') } };
    expect(api.circuitActiveLessonJourney(explicit, 'limit')).toEqual({ ...expected('predict'), id: 'limit' });
  });
  it.each([
    [saved('invalid', true, 'A draft'), 'predict'],
    [saved('more', false, 'I wrote before testing'), 'test'],
    [saved('more', true, '\u00a0\t\n '), 'explain'],
    [{ choice: 'more', tested: 'true', explanation: 'A draft' }, 'test'],
    [{ choice: 'less', tested: true, explanation: null }, 'explain']
  ])('normalizes malformed or premature evidence without claiming explanation progress (%j)', (record, phase) => {
    expect(api.circuitActiveLessonJourney({ lessonRecords: { gain: record } }, 'gain')).toEqual(expected(phase));
  });
  it('uses the explicit lesson ID and falls back to gain for absent or invalid IDs', () => {
    const state = { lessonId: 'sensor', lessonRecords: { sensor: saved('more', true, 'Sensor evidence.') } };
    expect(api.circuitActiveLessonJourney(state, 'sensor')).toEqual({ ...expected('review', true), id: 'sensor' });
    for (const id of [undefined, null, 'unknown', {}, 'toString']) expect(api.circuitActiveLessonJourney(state, id)).toEqual(expected('start'));
  });
  it('keeps Explain current for a wrong prediction, later circuit changes, electrical Undo, and replay', () => {
    let state = api.circuitActiveLessonUpdate({ input: 4.2 }, 'gain', 'start'); state = api.circuitActiveLessonUpdate(state, 'gain', 'predict', 'less'); state = api.circuitActiveLessonUpdate(state, 'gain', 'test');
    for (const current of [state, { ...state, input: 0, supply: 12 }, { ...state, ...state.undo.at(-1) }, api.circuitActiveLessonUpdate(state, 'gain', 'baseline')]) expect(api.circuitActiveLessonJourney(current, 'gain')).toEqual(expected('explain'));
    state = api.circuitActiveLessonUpdate(state, 'gain', 'explain', 'The evidence changed my prediction.'); expect(api.circuitActiveLessonJourney(state, 'gain')).toEqual(expected('review', true));
  });
  it('returns fresh step objects and keeps blanking a saved explanation reversible', () => {
    const state = { lessonRecords: { gain: saved('less', true, 'Saved text') } }, journey = api.circuitActiveLessonJourney(state, 'gain'); journey.steps[0].status = 'upcoming';
    expect(api.circuitActiveLessonJourney(state, 'gain')).toEqual(expected('review', true));
    const blanked = api.circuitActiveLessonUpdate(state, 'gain', 'explain', '   '); expect(api.circuitActiveLessonJourney(blanked, 'gain')).toEqual(expected('explain')); expect(state.lessonRecords.gain.explanation).toBe('Saved text');
  });
});

describe('Visible journey and explanation focus continuity', () => {
  let host, root, latest, update, setLocale, frames, scrollOriginal, writes, awards;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const journey = () => lab().querySelector('.circuit-active-lesson-journey');
  const jump = () => lab().querySelector('.circuit-lesson-explanation-jump');
  const field = () => lab().querySelector('textarea[aria-label="Transistor experiment explanation"]');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function explain(text) { const el = field(); await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function mount(active = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: { ...api.circuitActiveDesign({ input: 4.2, supply: 12, baseResistance: 33000 }), view: 'schematic', notebookOpen: true, reflection: 'Independent notebook text.', observations: [api.circuitActiveObservation({ input: 1 }, 'Saved note')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, probeRed: 'drive', probeBlack: 'base', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...active }, _circuitNetwork: { reflection: 'Keep connected notes.' } };
    function Host() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Host))); await flush();
  }
  beforeEach(() => { frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); writes = vi.fn(); awards = vi.fn(); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each(phases)('renders the %s stage, honest statuses, and one current step without moving focus', async (phase, record, explanationSaved) => {
    await mount(record ? { lessonId: 'gain', lessonRecords: { gain: record } } : {});
    const model = expected(phase, explanationSaved), items = [...journey().querySelectorAll('ol li[data-journey-step]')];
    expect(journey().dataset.journeyPhase).toBe(phase); expect(items.map(el => ({ id: el.dataset.journeyStep, status: el.dataset.stepStatus }))).toEqual(model.steps);
    expect(items.filter(el => el.getAttribute('aria-current') === 'step').map(el => el.dataset.journeyStep)).toEqual([model.currentStep]);
    for (const [index, item] of items.entries()) { expect(item.textContent).toContain({ predict: 'Predict', test: 'Test', explain: 'Explain' }[model.steps[index].id]); expect(item.textContent).toContain(model.steps[index].status === 'saved' ? 'Saved' : model.steps[index].status === 'upcoming' ? 'Ahead' : model.steps[index].id === 'explain' && explanationSaved ? 'Explanation saved' : 'Your turn'); }
    expect(journey().querySelector('[role="status"],[aria-live]')).toBeNull(); expect(host.contains(document.activeElement)).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled();
    expect(!!jump()).toBe(['explain', 'review'].includes(phase)); if (jump()) expect(jump().textContent).toBe(explanationSaved ? 'Review explanation' : 'Write explanation');
  });
  it('updates the stage after a chosen prediction while keeping focus on that choice', async () => {
    await mount(); await click(button('Start transistor prediction')); expect(journey().dataset.journeyPhase).toBe('predict');
    const choice = button('Decreases'); choice.focus(); await click(choice);
    expect(journey().dataset.journeyPhase).toBe('test'); expect(document.activeElement).toBe(choice); expect(lab().querySelector('.circuit-active-lesson-evidence,.circuit-active-lesson-trace')).toBeNull(); expect(jump()).toBeNull();
    await click(button('Test transistor prediction')); expect(journey().dataset.journeyPhase).toBe('explain'); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); expect(document.activeElement).not.toBe(field());
  });
  it('a pre-test draft does not unlock Explain or the explanation shortcut', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', false) } }); const el = field(); el.focus(); await explain('I am drafting before testing.');
    expect(journey().dataset.journeyPhase).toBe('test'); expect(jump()).toBeNull(); expect(document.activeElement).toBe(el);
  });
  it.each(['', 'I used the saved readings to revise my claim.'])('the explanation shortcut only focuses the existing textarea and preserves its selection and all work (%s)', async text => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, text) } });
    const el = field(), before = JSON.stringify(latest), same = latest; el.setSelectionRange(Math.min(2, text.length), Math.min(8, text.length), 'backward'); const selection = [el.selectionStart, el.selectionEnd, el.selectionDirection];
    await click(jump()); expect(document.activeElement).toBe(el); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' }); expect(field()).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual(selection); expect(JSON.stringify(latest)).toBe(before); expect(latest).toBe(same); expect(writes).not.toHaveBeenCalled();
    const notebook = host.querySelector('.circuit-notebook-reflection'); notebook.focus(); await click(jump()); expect(document.activeElement).toBe(el); expect(JSON.stringify(latest)).toBe(before);
  });
  it('typing, clearing, and translating an explanation update cues without remounting or refocusing it', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true) } }); await click(jump()); const el = field();
    await explain('New evidence.'); expect(journey().dataset.journeyPhase).toBe('review'); expect(jump().textContent).toBe('Review explanation'); expect(field()).toBe(el); expect(document.activeElement).toBe(el);
    el.setSelectionRange(2, 5, 'backward'); const before = JSON.stringify(latest); Element.prototype.scrollIntoView.mockClear(); await act(async () => setLocale('Translated: ')); await flush();
    expect(lab().querySelector('textarea')).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 5, 'backward']); expect(JSON.stringify(latest)).toBe(before); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await act(async () => setLocale('')); await flush(); await explain('   '); expect(journey().dataset.journeyPhase).toBe('explain'); expect(document.activeElement).toBe(el); expect(jump().textContent).toBe('Write explanation');
  });
  it('live edits, electrical Undo, and replay keep the saved stage and independent notebook intact', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'I revised my prediction.') } });
    const notebook = clone({ reflection: latest._circuitActive.reflection, observations: latest._circuitActive.observations, reference: latest._circuitActive.reference, probes: [latest._circuitActive.probeRed, latest._circuitActive.probeBlack] });
    const independent = host.querySelector('.circuit-notebook-reflection'); independent.focus(); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 0 } })); expect(document.activeElement).toBe(independent);
    await click(button('Load experiment baseline')); await click(button('Undo active edit')); expect(journey().dataset.journeyPhase).toBe('review'); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe('I revised my prediction.');
    expect({ reflection: latest._circuitActive.reflection, observations: latest._circuitActive.observations, reference: latest._circuitActive.reference, probes: [latest._circuitActive.probeRed, latest._circuitActive.probeBlack] }).toEqual(notebook);
  });
  it('switching lessons restores each stage without replaying a previous explanation-focus request', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'Gain explanation'), sensor: saved('more', false, 'Sensor draft') } }); await click(jump());
    await select('sensor'); expect(journey().dataset.journeyPhase).toBe('test'); expect(jump()).toBeNull(); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]'));
    await select('gain'); expect(journey().dataset.journeyPhase).toBe('review'); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); expect(document.activeElement).not.toBe(field()); expect(field().value).toBe('Gain explanation');
  });
  it('loading and restoring a file after jumping do not focus an imported or restored explanation', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'Original explanation') } }); await click(jump());
    const doc = api.circuitActiveInvestigation({ input: 2.4, lessonId: 'sensor', lessonRecords: { sensor: saved('more', true, 'Imported explanation') } });
    const input = host.querySelector('input[aria-label="Open investigation file"]'); Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'journey.json', size: 1024, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); Element.prototype.scrollIntoView.mockClear(); await click(load);
    expect(latest._circuitActive.lessonId).toBe('sensor'); expect(journey().dataset.journeyPhase).toBe('review'); expect(document.activeElement).not.toBe(field()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await click(button('Restore previous investigation')); expect(latest._circuitActive.lessonId).toBe('gain'); expect(field().value).toBe('Original explanation'); expect(document.activeElement).not.toBe(field()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
