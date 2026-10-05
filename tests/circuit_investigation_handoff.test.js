import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = 'less', tested = true, explanation = '') => ({ choice, tested, explanation });
const allTested = () => ({ gain: record('less', true, ''), limit: record('more', true, ' \n\t '), sensor: record('same', true, '') });

describe('From guided experiments to an independent investigation', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, translations, scrollOriginal, extraRoots;
  const lab = (scope = host) => scope.querySelector('.circuit-active-lesson-lab');
  const continuation = (scope = host) => lab(scope).querySelector('.circuit-active-lesson-continuation');
  const notebook = (scope = host) => scope.querySelector('.circuit-active-notebook');
  const summary = (scope = host) => notebook(scope).querySelector(':scope > summary');
  const field = (scope = host) => lab(scope).querySelector('.circuit-lesson-writing-field');
  const button = (text, scope = host) => [...scope.querySelectorAll('button')].find(node => node.textContent === text);
  const handoff = (scope = host) => button('Plan my own investigation', scope);
  const plan = (scope = host) => button('Open investigation notebook', scope);
  const seed = patch => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), lessonId: 'gain', lessonRecords: allTested(), view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: false, observations: [api.circuitActiveObservation({ input: .8 }, 'Independent saved observation')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook explanation.', investigationTitle: 'A tuned circuit', investigationQuestion: 'What changes when I vary one resistor?', investigationPrediction: 'I expect a different lamp current.', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  const initial = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected notes.' } });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const first = initial(patch);
    function Harness() { const [state, setState] = React.useState(first), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (key, fallback) => { translations.push([key, fallback]); return locale + fallback; }, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'handoff.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  async function openImmediately(action, scope = host) {
    expect(action).toBeTruthy(); const target = summary(scope), focus = vi.spyOn(target, 'focus'); requestAnimationFrame.mockClear(); Element.prototype.scrollIntoView.mockClear();
    await act(async () => {
      action.click();
      expect(document.activeElement).toBe(target); // Before any React effect or queued animation frame can navigate.
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' });
      expect(Element.prototype.scrollIntoView.mock.instances.at(-1).closest('.circuit-active-notebook')).toBe(notebook(scope));
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });
    await flush(); expect(document.activeElement).toBe(target); expect(notebook(scope).open).toBe(true); focus.mockRestore();
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; extraRoots = []; vi.stubGlobal('requestAnimationFrame', vi.fn(fn => { frames.push(fn); return frames.length; })); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn(); translations = [];
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { for (const mounted of extraRoots) { await act(async () => mounted.root.unmount()); mounted.host.remove(); } await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('offers an optional own-investigation handoff after all valid tests including wrong choices and blank explanations, retaining map review', async () => {
    await mount(); const before = latest;
    expect(continuation().dataset.continuationMode).toBe('all-tested'); expect(handoff()).toBeTruthy(); expect(handoff().disabled).toBe(false); expect(button('Review experiment map')).toBeTruthy();
    const steps = [...continuation().querySelectorAll('.circuit-continuation-inquiry-steps li')]; expect(steps).toHaveLength(2); expect(steps.map(step => step.dataset.inquiryStep)).toEqual(['choose', 'compare']); expect(steps[0].textContent).toContain('Choose one setting'); expect(steps[1].textContent).toContain('Compare two readings');
    expect(steps[0].textContent).toContain('Keep the circuit type and the other settings the same.'); expect(steps[1].textContent).toContain('Keep the probe positions the same.'); expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(['choose_heading', 'choose', 'compare_heading', 'compare', 'help', 'action'].map(suffix => 'stem.circuit.continuation_inquiry_' + suffix)));
    expect(continuation().textContent).not.toMatch(/mastered|correct explanation|must explain|completed all/i); expect(continuation().querySelector('[aria-live],[role="status"]')).toBeNull(); expect(notebook().open).toBe(false); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await click(button('Review experiment map')); const map = lab().querySelector('.circuit-active-lesson-map'); expect(map.open).toBe(true); expect(document.activeElement).toBe(map.querySelector('summary')); expect(latest).toBe(before); expect(notebook().open).toBe(false);
  });

  it.each([
    ['missing result', undefined, null, 'start'],
    ['invalid explicit choice overriding legacy completion', record('invalid', true, 'A written draft'), { id: 'sensor', choice: 'more', tested: true }, 'predict'],
    ['nonboolean tested flag', record('less', 'true', ''), null, 'test']
  ])('keeps the first unfinished experiment instead of the handoff for %s', async (_name, sensor, challenge, phase) => {
    const records = allTested(); delete records.sensor; if (sensor) records.sensor = sensor;
    await mount({ lessonRecords: records, challenge }); const before = latest;
    expect(handoff()).toBeUndefined(); expect(continuation().dataset.continuationMode).toBe('next'); expect(continuation().dataset.nextLessonId).toBe('sensor'); expect(api.circuitActiveLessonJourney(latest._circuitActive, 'sensor').phase).toBe(phase); expect(continuation().textContent).not.toContain('Compare two readings'); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('counts valid legacy completion but opening the notebook does not normalize or replace the saved lesson records', async () => {
    const records = allTested(); delete records.sensor; await mount({ lessonRecords: records, challenge: { id: 'sensor', choice: 'more', tested: true } }); const before = latest, json = clone(latest);
    expect(continuation().dataset.continuationMode).toBe('all-tested'); await openImmediately(handoff());
    json._circuitActive.notebookOpen = true; expect(latest).toEqual(json); expect(latest._circuitActive.lessonRecords).toBe(before._circuitActive.lessonRecords); expect(latest._circuitActive.challenge).toBe(before._circuitActive.challenge); expect(Object.hasOwn(latest._circuitActive.lessonRecords, 'sensor')).toBe(false); expect(latest._circuitNetwork).toBe(before._circuitNetwork); expect(awards).not.toHaveBeenCalled();
  });

  it('opens only the notebook and immediately focuses its own summary while retaining both writing spaces, selections and every saved value', async () => {
    await mount({ notebookOpen: true, lessonRecords: { ...allTested(), gain: record('less', true, 'A lesson explanation to keep.') } }); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); await click(notebook().querySelector('.circuit-reflection-size-toggle'));
    const lessonField = field(), reflection = notebook().querySelector('.circuit-notebook-reflection'); lessonField.setSelectionRange(2, 12, 'backward'); reflection.setSelectionRange(3, 14, 'backward');
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, notebookOpen: false } })); const before = clone(latest), documentBefore = api.circuitActiveInvestigation(latest._circuitActive); writes.mockClear();
    await openImmediately(handoff()); before._circuitActive.notebookOpen = true; expect(latest).toEqual(before); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(documentBefore); expect(field()).toBe(lessonField); expect(notebook().querySelector('.circuit-notebook-reflection')).toBe(reflection); expect(lessonField.rows).toBe(12); expect(reflection.rows).toBe(12); expect([lessonField.selectionStart, lessonField.selectionEnd, lessonField.selectionDirection]).toEqual([2, 12, 'backward']); expect([reflection.selectionStart, reflection.selectionEnd, reflection.selectionDirection]).toEqual([3, 14, 'backward']); expect(awards).not.toHaveBeenCalled();
  });

  it('the existing Open investigation notebook action uses the same immediate route, including repeated opens without resetting work', async () => {
    await mount(); const before = clone(latest); await openImmediately(plan()); before._circuitActive.notebookOpen = true; expect(latest).toEqual(before); const opened = latest;
    field().focus(); await openImmediately(handoff()); expect(latest).toBe(opened); expect(latest).toEqual(before); field().focus(); await openImmediately(plan()); expect(latest).toBe(opened); expect(latest).toEqual(before); expect(awards).not.toHaveBeenCalled();
  });

  it('writing, locale changes and independent live edits never replay a previous handoff or reset its translated cue', async () => {
    await mount({ lessonRecords: { ...allTested(), gain: record('less', true, 'Original lesson explanation.') } }); await openImmediately(handoff()); const el = field(); el.focus(); await write(el, 'My revised explanation.'); el.setSelectionRange(2, 10, 'backward'); Element.prototype.scrollIntoView.mockClear(); requestAnimationFrame.mockClear();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 9, input: 2, probeRed: 'emitter', probeBlack: 'collector' } })); const before = latest; await act(async () => setLocale('Translated: ')); await flush();
    expect(button('Translated: Plan my own investigation')).toBeTruthy(); expect(button('Translated: Review experiment map')).toBeTruthy(); const list = continuation().querySelector('ol'); const walker = document.createTreeWalker(list, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) if (node.textContent.trim() && !node.parentElement.closest('[aria-hidden="true"]')) expect(node.textContent).toMatch(/^Translated: /);
    expect(latest).toBe(before); expect(field()).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 10, 'backward']); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('real JSON load and restore recompute completion without replaying notebook navigation or persisting a handoff request', async () => {
    await mount(); await openImmediately(handoff()); const original = api.circuitActiveInvestigation(latest._circuitActive), target = summary();
    const imported = api.circuitActiveInvestigation({ input: 2.7, supply: 9, lessonId: 'limit', lessonRecords: { limit: record('more', true, 'Imported explanation.') }, reflection: 'Imported notebook.' }); Element.prototype.scrollIntoView.mockClear(); requestAnimationFrame.mockClear();
    await importDoc(imported); expect(handoff()).toBeUndefined(); expect(document.activeElement).not.toBe(target); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(imported); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await click(button('Restore previous investigation')); expect(handoff()).toBeTruthy(); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); expect(document.activeElement).not.toBe(summary()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('a continuation rendered without an opener keeps the handoff disabled while map review still works', async () => {
    // Expose the actual local component only in this evaluation, without rewriting product files or state transitions.
    const source = readFileSync('stem_lab/stem_tool_circuit.js', 'utf8'), marker = 'function CircuitActiveLessonContinuation(props) {'; expect(source.split(marker)).toHaveLength(2); resetStemLab(); new Function(source.replace(marker, 'window.StemLab.__continuationForTest = CircuitActiveLessonContinuation;\n' + marker))(); const review = vi.fn();
    await act(async () => root.render(React.createElement(window.StemLab.__continuationForTest, { React, t: (_key, fallback) => fallback, row: null, onReviewMap: review, mapId: 'local-map' })));
    expect(handoff().disabled).toBe(true); await click(handoff()); expect(review).not.toHaveBeenCalled(); await click(button('Review experiment map')); expect(review).toHaveBeenCalledTimes(1); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('two mounted tools focus their own direct notebook summaries despite the unchanged legacy notebook ID', async () => {
    await mount(); const firstState = latest, otherHost = document.createElement('div'); document.body.appendChild(otherHost); const otherRoot = ReactDOMClient.createRoot(otherHost); extraRoots.push({ root: otherRoot, host: otherHost }); let second; const secondInitial = initial({ investigationTitle: 'Second investigation', reflection: 'Second notebook writing.' });
    function SecondTool() { const [state, setState] = React.useState(secondInitial); second = state; return config.render(makeCtx({ toolData: state, setToolData: setState, t: (_key, fallback) => fallback, awardXP: awards })); }
    await act(async () => otherRoot.render(React.createElement(SecondTool))); await flush(); expect(notebook().id).toBe('circuit-active-notebook'); expect(notebook(otherHost).id).toBe(notebook().id); expect(document.getElementById('circuit-active-notebook')).toBe(notebook());
    await openImmediately(handoff(otherHost), otherHost); expect(latest).toBe(firstState); expect(notebook().open).toBe(false); expect(second).toEqual({ ...secondInitial, _circuitActive: { ...secondInitial._circuitActive, notebookOpen: true } }); const secondAfter = second;
    await openImmediately(plan()); expect(document.activeElement).toBe(summary()); expect(second).toBe(secondAfter); await openImmediately(plan(otherHost), otherHost); expect(document.activeElement).toBe(summary(otherHost)); expect(second._circuitActive.reflection).toBe('Second notebook writing.'); expect(awards).not.toHaveBeenCalled();
  });

  it('lesson replay, Undo and selection retain the handoff, while deliberate retry removes it without changing independent notebook work', async () => {
    await mount(); const records = clone(latest._circuitActive.lessonRecords), original = api.circuitActiveDesign(latest._circuitActive), observation = clone(latest._circuitActive.observations), reflection = latest._circuitActive.reflection;
    await click(button('Load experiment baseline')); expect(handoff()).toBeTruthy(); await click(button('Undo active edit')); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(original); expect(latest._circuitActive.lessonRecords).toEqual(records);
    await select('sensor'); expect(handoff()).toBeTruthy(); expect(notebook().open).toBe(false); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]'));
    const retry = lab().querySelector('.circuit-active-lesson-retry'); await act(async () => { retry.open = true; retry.dispatchEvent(new Event('toggle')); }); await click(retry.querySelector('button')); expect(handoff()).toBeUndefined(); expect(latest._circuitActive.lessonRecords.gain).toEqual(records.gain); expect(latest._circuitActive.lessonRecords.limit).toEqual(records.limit); expect(latest._circuitActive.observations).toEqual(observation); expect(latest._circuitActive.reflection).toBe(reflection); expect(notebook().open).toBe(false);
  });
});
