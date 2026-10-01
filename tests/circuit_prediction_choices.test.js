import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const choices = [['more', 'Increases'], ['same', 'Stays the same'], ['less', 'Decreases']];
const saved = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const protectedWork = (api, state) => clone({ design: api.circuitActiveDesign(state), undo: state.undo, redo: state.redo, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probes: [state.probeRed, state.probeBlack], view: state.view });

// The buttons use their visible text as their accessible name; decorative SVGs must not add a name.
const exposedText = element => { const copy = element.cloneNode(true); copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove()); return copy.textContent.trim(); };
const descriptions = element => (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => { const node = document.getElementById(id); expect(node).toBeTruthy(); return node; });

describe('Active experiment prediction choices', () => {
  let host, root, config, api, latest, update, setLocale, writes, awards, frames, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const fieldset = () => lab().querySelector('.circuit-active-lesson-predictions');
  const cards = () => [...fieldset().querySelectorAll('button')];
  const choice = id => cards()[choices.findIndex(row => row[0] === id)];
  const check = element => element.querySelector('.circuit-prediction-selected');
  const testButton = () => [...lab().querySelectorAll('button')].find(node => exposedText(node) === 'Test transistor prediction');
  const field = () => lab().querySelector('textarea');
  const button = text => [...host.querySelectorAll('button')].find(node => exposedText(node) === text);
  const seed = extra => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), lessonId: 'gain', lessonRecords: { gain: saved(null, false, 'My draft before testing.'), sensor: saved('less', true, 'Keep sensor evidence.') }, view: 'schematic', notebookOpen: true, probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep my observation.')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'Independent notebook writing.', investigationTitle: 'My investigation', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...extra });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function mount(extra = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(extra), _circuitNetwork: { reflection: 'Keep connected work.' } };
    function Harness() {
      const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale;
      return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards }));
    }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'choices.json', size: 2048, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  function assertSelection(id) {
    expect(cards().filter(node => node.getAttribute('aria-pressed') === 'true')).toEqual(id ? [choice(id)] : []);
    // All decorative checks stay mounted; CSS exposes only the pressed card's check.
    // Browser coverage verifies the used visibility while this verifies the controlling semantics.
    for (const node of cards()) {
      expect(check(node).getAttribute('aria-hidden')).toBe('true');
      expect(check(node).querySelector('svg').getAttribute('aria-hidden')).toBe('true');
      expect(check(node).querySelector('svg').getAttribute('focusable')).toBe('false');
    }
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('makes only the fresh Start primary and keeps retry deliberate while preserving the existing undoable start action', async () => {
    await mount({ lessonRecords: { sensor: saved('less', true, 'Keep sensor evidence.') } });
    const start = lab().querySelector('.circuit-active-lesson-start button'), before = protectedWork(api, latest._circuitActive);
    expect(start.textContent).toBe('Start transistor prediction'); expect(start.classList.contains('circuit-active-lesson-primary')).toBe(true); expect(fieldset()).toBeNull();
    expect(writes).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false); await click(start);
    expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(api.circuitActiveDesign({ input: 1 })); expect(latest._circuitActive.undo.at(-1)).toEqual(before.design);
    expect(latest._circuitActive.lessonRecords.gain).toEqual(saved()); expect(latest._circuitActive.lessonRecords.sensor.explanation).toBe('Keep sensor evidence.');
    expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]')); expect(fieldset()).not.toBeNull();
    const retry = lab().querySelector('.circuit-active-lesson-retry'); expect(retry.open).toBe(false); expect(retry.querySelector('button').classList.contains('circuit-active-lesson-primary')).toBe(false);
    for (const key of ['observations', 'reference', 'reflection', 'investigationTitle', 'probes', 'view']) expect(protectedWork(api, latest._circuitActive)[key]).toEqual(before[key]);
  });

  it('keeps three equally available choices with exact text names, a shared comparison cue, and hidden noninteractive diagrams', async () => {
    await mount(); expect(fieldset().querySelector('legend').textContent).toBe('Predict the lamp current'); expect(fieldset().textContent).toContain('Compared with the starting circuit');
    expect(cards().map(exposedText)).toEqual(choices.map(row => row[1])); expect(cards().map(node => node.textContent)).toEqual(choices.map(row => row[1]));
    for (const node of cards()) {
      expect(node.type).toBe('button'); expect(node.disabled).toBe(false); expect(node.getAttribute('aria-label')).toBeNull(); expect(node.getAttribute('aria-labelledby')).toBeNull(); expect(node.getAttribute('aria-pressed')).toBe('false');
      expect(descriptions(node).map(help => help.textContent).join(' ')).toBe('Compared with the starting circuit.');
      const diagram = node.querySelector('svg'); expect(diagram).toBeTruthy(); expect(diagram.getAttribute('aria-hidden')).toBe('true'); expect(diagram.getAttribute('focusable')).toBe('false'); expect(diagram.querySelector('title,desc,a,input,button,[tabindex]')).toBeNull();
    }
    assertSelection(null); expect(lab().querySelector('.circuit-active-lesson-evidence')).toBeNull(); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled();
  });

  it.each([null, 'invalid'])('keeps Test disabled with a real associated explanation when normalized choice is %s', async selected => {
    await mount({ lessonRecords: { gain: saved(selected, false, 'Early notes') } }); const control = testButton(), before = latest;
    expect(control.disabled).toBe(true); expect(descriptions(control).map(node => node.textContent).join(' ')).toBe('Choose a prediction to enable Test.');
    assertSelection(null); await click(control); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(lab().querySelector('.circuit-active-lesson-evidence')).toBeNull(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(choices)('allows %s (%s), marks only that choice, and waits for an explicit Test before saving the result', async (id, label) => {
    await mount(); const before = protectedWork(api, latest._circuitActive), records = clone(api.circuitActiveLessonRecords(latest._circuitActive)), allCards = cards(), selected = choice(id), control = testButton(), help = descriptions(control)[0]; selected.focus();
    await click(selected); expect(cards()).toEqual(allCards); expect(document.activeElement).toBe(selected); expect(cards().map(exposedText)).toEqual(choices.map(row => row[1])); assertSelection(id);
    expect(testButton()).toBe(control); expect(control.disabled).toBe(false); expect(descriptions(control)[0]).toBe(help); expect(help.textContent).toBe('Test runs the stated change from the experiment baseline.');
    records.gain.choice = id; expect(api.circuitActiveLessonRecords(latest._circuitActive)).toEqual(records); expect(protectedWork(api, latest._circuitActive)).toEqual(before); expect(latest._circuitActive.lessonRecords.gain.tested).toBe(false); expect(lab().querySelector('.circuit-active-lesson-evidence')).toBeNull(); expect(awards).not.toHaveBeenCalled();
    await click(control); expect(latest._circuitActive.lessonRecords.gain).toEqual({ ...records.gain, tested: true }); expect(fieldset()).toBeNull(); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain(label); expect(lab().querySelector('.circuit-active-lesson-evidence')).not.toBeNull(); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); expect(awards).not.toHaveBeenCalled();
    for (const key of ['observations', 'reference', 'reflection', 'investigationTitle', 'probes', 'view']) expect(protectedWork(api, latest._circuitActive)[key]).toEqual(before[key]);
  });

  it('changing a prediction replaces the selected marker without testing, changing the circuit, or adding electrical history', async () => {
    await mount(); const before = protectedWork(api, latest._circuitActive), allCards = cards();
    for (const [id] of choices) { choice(id).focus(); await click(choice(id)); assertSelection(id); expect(cards()).toEqual(allCards); expect(protectedWork(api, latest._circuitActive)).toEqual(before); expect(latest._circuitActive.lessonRecords.gain.tested).toBe(false); expect(document.activeElement).toBe(choice(id)); }
    expect(latest._circuitActive.lessonRecords.gain.explanation).toBe('My draft before testing.'); expect(awards).not.toHaveBeenCalled();
  });

  it('locale and independent circuit edits retain card nodes, selected focus, descriptions and saved choice without navigation', async () => {
    await mount({ lessonRecords: { gain: saved('less', false, 'My reasoning') } }); const allCards = cards(), control = testButton(), selected = choice('less'); selected.focus(); const before = latest, count = writes.mock.calls.length;
    await act(async () => setLocale('Translated: ')); await flush();
    expect(cards()).toEqual(allCards); expect(cards().map(exposedText)).toEqual(choices.map(row => 'Translated: ' + row[1])); expect(document.activeElement).toBe(selected); assertSelection('less');
    expect(fieldset().textContent).toContain('Translated: Compared with the starting circuit'); for (const node of cards()) expect(descriptions(node)[0].textContent).toBe('Translated: Compared with the starting circuit.'); expect(descriptions(control)[0].textContent).toBe('Translated: Test runs the stated change from the experiment baseline.'); expect(latest).toBe(before); expect(writes).toHaveBeenCalledTimes(count);
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 2.6, light: 80 } })); expect(cards()).toEqual(allCards); expect(document.activeElement).toBe(selected); expect(latest._circuitActive.lessonRecords.gain.choice).toBe('less'); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('an imported ready prediction is selected and testable without running Test or taking focus', async () => {
    await mount(); const doc = api.circuitActiveInvestigation({ input: 2.7, lessonId: 'limit', lessonRecords: { limit: saved('more', false, 'Imported prediction reasoning.') } });
    await importDoc(doc); expect(lab().querySelector('select').value).toBe('limit'); assertSelection('more'); expect(testButton().disabled).toBe(false); expect(descriptions(testButton())[0].textContent).toBe('Test runs the stated change from the experiment baseline.'); expect(latest._circuitActive.input).toBe(2.7); expect(latest._circuitActive.lessonRecords.limit.tested).toBe(false); expect(field().value).toBe('Imported prediction reasoning.'); expect(cards()).not.toContain(document.activeElement); expect(lab().querySelector('.circuit-active-lesson-evidence')).toBeNull(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('a legacy untested choice stays ready without normalizing persisted data on mount', async () => {
    await mount({ lessonId: 'limit', lessonRecords: {}, challenge: { id: 'limit', choice: 'same', tested: false } }); const before = latest;
    assertSelection('same'); expect(testButton().disabled).toBe(false); expect(latest).toBe(before); expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });

  it('an invalid explicit choice overrides a ready legacy choice without offering a false selected marker', async () => {
    await mount({ lessonRecords: { gain: saved('invalid', true, 'My draft') }, challenge: { id: 'gain', choice: 'more', tested: false } });
    assertSelection(null); expect(testButton().disabled).toBe(true); expect(lab().querySelector('.circuit-active-lesson-evidence')).toBeNull(); expect(latest._circuitActive.lessonRecords.gain.choice).toBe('invalid'); expect(writes).not.toHaveBeenCalled();
  });

  it('tested records show the saved prediction instead of editable cards or a second Test', async () => {
    await mount({ lessonRecords: { gain: saved('less', true, 'I revised my reasoning.') } });
    expect(fieldset()).toBeNull(); expect(testButton()).toBeUndefined(); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(field().value).toBe('I revised my reasoning.'); expect(lab().querySelector('.circuit-active-lesson-evidence')).not.toBeNull(); expect(writes).not.toHaveBeenCalled();
  });

  it('lesson switching preserves independent selections and the expanded writing field while keeping the live bench untouched', async () => {
    await mount({ lessonRecords: { gain: saved('less', false, 'Gain draft'), limit: saved('same', false, 'Limit draft') } }); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const before = protectedWork(api, latest._circuitActive), records = clone(latest._circuitActive.lessonRecords), writing = field();
    await select('limit'); assertSelection('same'); expect(field()).toBe(writing); expect(field().rows).toBe(12); expect(field().value).toBe('Limit draft'); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]'));
    await select('gain'); assertSelection('less'); expect(field()).toBe(writing); expect(field().rows).toBe(12); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(protectedWork(api, latest._circuitActive)).toEqual(before);
  });

  it('separate mounted lessons have unique Test descriptions and independent selections', async () => {
    const snapshots = [];
    function Instance({ index }) {
      const [state, setState] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed({ lessonRecords: { gain: saved() } }) }); snapshots[index] = state;
      return React.createElement('div', { 'data-instance': index }, config.render(makeCtx({ toolData: state, setToolData: setState })));
    }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Instance, { index: 0 }), React.createElement(Instance, { index: 1 })))); await flush();
    const labs = [...host.querySelectorAll('.circuit-active-lesson-lab')], controls = labs.map(node => [...node.querySelectorAll('button')].find(button => exposedText(button) === 'Test transistor prediction'));
    expect(new Set(controls.map(node => node.getAttribute('aria-describedby'))).size).toBe(2); const helpers = controls.map(node => descriptions(node)[0]); expect(helpers[0]).not.toBe(helpers[1]);
    const second = snapshots[1]; await click(labs[0].querySelector('.circuit-active-lesson-predictions button')); expect(controls.map(node => node.disabled)).toEqual([false, true]); expect(snapshots[0]._circuitActive.lessonRecords.gain.choice).toBe('more'); expect(snapshots[1]).toBe(second); expect(helpers[1].textContent).toBe('Choose a prediction to enable Test.');
  });

  it('explicit retry restores an unselected choice set and guidance without erasing other lesson evidence', async () => {
    await mount({ lessonRecords: { gain: saved('less', true, 'Saved gain reasoning'), sensor: saved('more', true, 'Saved sensor reasoning') } }); const other = clone(latest._circuitActive.lessonRecords.sensor), own = latest._circuitActive.reflection;
    const retry = lab().querySelector('.circuit-active-lesson-retry'); await act(async () => { retry.open = true; }); await click(retry.querySelector('button'));
    assertSelection(null); expect(testButton().disabled).toBe(true); expect(descriptions(testButton())[0].textContent).toBe('Choose a prediction to enable Test.'); expect(field().value).toBe(''); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other); expect(latest._circuitActive.reflection).toBe(own); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]')); expect(awards).not.toHaveBeenCalled();
  });
});
