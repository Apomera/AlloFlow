import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const prefix = 'stem.circuit.prediction_guide_';
const prompts = {
  gain: 'How might changing the input voltage affect the base branch and the lamp path?',
  limit: 'Could anything in the lamp path limit its current as you raise the input voltage?',
  sensor: 'How might less light affect the photoresistor, the connected divider junction, and the lamp path?'
};
const independent = state => clone({ observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack, view: state.view });

describe('Optional prediction guide', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, translations, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const guide = () => lab().querySelector('.circuit-active-prediction-guide');
  const summary = () => guide().querySelector('summary');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const testedGuide = () => lab().querySelector('.circuit-active-explanation-guide');
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const seed = patch => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), lessonId: 'gain', lessonRecords: { gain: record(null, false, 'My prediction draft.'), sensor: record('same', true, 'Keep sensor evidence.') }, view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, observations: [api.circuitActiveObservation({ input: .8 }, 'Independent observation')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'Independent notebook explanation.', investigationTitle: 'A tuned circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  const protectedWork = state => clone({ ...independent(state), design: api.circuitActiveDesign(state), undo: state.undo, redo: state.redo });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function toggle(el, open) { await act(async () => { el.open = open; el.dispatchEvent(new Event('toggle')); }); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected notes.' } };
    function Harness() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (key, fallback) => { translations.push([key, fallback]); return locale + fallback; }, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'prediction-guide.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn(); translations = [];
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('shows no prediction guide for fresh or normalized tested work and creates no record on mount', async () => {
    await mount({ lessonRecords: {} }); expect(guide()).toBeNull(); expect(field()).toBeNull(); expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonRecords: { gain: record('less', true, '') } } }));
    expect(guide()).toBeNull(); expect(testedGuide()).not.toBeNull(); expect(testedGuide().open).toBe(false); expect(testedGuide().querySelector('summary').textContent).toBe('Build an explanation'); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['gain', 'limit', 'sensor'])('offers ordered open questions for %s without revealing a computed result on a tuned bench', async id => {
    await mount({ lessonId: id, lessonRecords: { [id]: record(null, false, '') } }); const el = guide(), before = latest;
    expect(el.tagName).toBe('DETAILS'); expect(el.open).toBe(false); expect(el.dataset.guideLesson).toBe(id); expect(summary().textContent).toBe('Help me make a prediction'); expect([...el.querySelectorAll('ol li')].map(node => node.dataset.guideStep)).toEqual(['plan', 'connect', 'reason']);
    expect([...el.querySelectorAll('.circuit-explanation-guide-prompt')].map(node => node.textContent)).toEqual(['Which setting changes, and which settings stay the same?', prompts[id], 'What change in lamp current do you expect, and why? You may write your reasoning in the field above.']);
    expect(el.textContent).toContain('These prompts are optional.'); expect(el.querySelector('button,input,textarea,select,[role="status"],[aria-live]')).toBeNull(); expect(el.textContent).not.toMatch(/\d+(?:\.\d+)?\s*(?:mA|µA|V)|saturation|the correct prediction|current will increase/i);
    expect(lab().querySelector('.circuit-active-lesson-evidence,.circuit-active-lesson-trace,.circuit-active-lesson-current-limit')).toBeNull(); expect(testedGuide()).toBeNull(); expect(lab().querySelector('.circuit-lesson-writing-count').nextElementSibling).toBe(el); expect(lab().querySelectorAll('textarea')).toHaveLength(1); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('uses normalized explicit and legacy records without rewriting saved data or treating an invalid Test as evidence', async () => {
    await mount({ lessonRecords: { gain: record('invalid', true, 'Early reasoning') }, challenge: { id: 'gain', choice: 'more', tested: true } });
    expect(guide()).not.toBeNull(); expect(button('Test transistor prediction').disabled).toBe(true); expect(testedGuide()).toBeNull(); expect(field().value).toBe('Early reasoning');
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonRecords: { gain: record('less', 'true', 'Still a prediction') } } }));
    expect(guide()).not.toBeNull(); expect(button('Test transistor prediction').disabled).toBe(false); expect(testedGuide()).toBeNull();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonId: undefined, lessonRecords: {}, challenge: { id: 'limit', choice: 'same', tested: false } } }));
    expect(guide().dataset.guideLesson).toBe('limit'); expect(field().value).toBe(''); expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('native opening and closing preserve exact state, draft selection, summary focus and electrical history', async () => {
    await mount(); const before = latest, json = JSON.stringify(latest), el = field(); el.setSelectionRange(2, 9, 'backward'); summary().focus();
    await toggle(guide(), true); await toggle(guide(), false); await toggle(guide(), true);
    expect(guide().open).toBe(true); expect(document.activeElement).toBe(summary()); expect(field()).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 9, 'backward']); expect(latest).toBe(before); expect(JSON.stringify(latest)).toBe(json); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('drafts, chosen predictions and independent live edits retain the open disclosure and existing writing field', async () => {
    await mount(); await toggle(guide(), true); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const details = guide(), el = field(), before = protectedWork(latest._circuitActive), other = clone(latest._circuitActive.lessonRecords.sensor);
    el.focus(); await write(el, 'I think the lamp current will decrease because of the input change.'); el.setSelectionRange(2, 14, 'backward'); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(document.activeElement).toBe(el); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(protectedWork(latest._circuitActive)).toEqual(before);
    await click(button('Decreases')); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(latest._circuitActive.lessonRecords.gain.tested).toBe(false); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other);
    el.focus(); el.setSelectionRange(2, 14, 'backward'); const text = details.textContent; await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 3, input: 0, probeRed: 'emitter', probeBlack: 'collector' } }));
    expect(details.textContent).toBe(text); expect(field()).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 14, 'backward']); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled();
  });

  it('translates every visible guide string with semantic keys without remounting, refocusing or changing saved data', async () => {
    await mount(); await toggle(guide(), true); const details = guide(), el = field(), before = latest; el.focus(); el.setSelectionRange(2, 9, 'backward');
    expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(['title', 'intro', 'plan_heading', 'plan', 'connect_heading', 'gain', 'reason_heading', 'reason'].map(key => prefix + key)));
    await act(async () => setLocale('Translated: ')); await flush(); const walker = document.createTreeWalker(details, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) if (node.textContent.trim()) expect(node.textContent).toMatch(/^Translated: /);
    expect(guide()).toBe(details); expect(details.open).toBe(true); expect(field()).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 9, 'backward']); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('routes an open guide across untested lessons and remounts closed after leaving for an unstarted lesson', async () => {
    await mount({ lessonRecords: { gain: record('less', false, 'Gain draft.'), sensor: record('same', false, 'Sensor draft.') } }); await toggle(guide(), true); const details = guide(), before = protectedWork(latest._circuitActive);
    await select('sensor'); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(details.dataset.guideLesson).toBe('sensor'); expect(details.textContent).toContain(prompts.sensor); expect(field().value).toBe('Sensor draft.'); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]'));
    await select('limit'); expect(guide()).toBeNull(); expect(field()).toBeNull(); await select('gain'); expect(guide()).not.toBe(details); expect(guide().open).toBe(false); expect(field().value).toBe('Gain draft.'); expect(protectedWork(latest._circuitActive)).toEqual(before);
  });

  it('a real wrong-prediction Test swaps guides without losing the draft, while explicit retry remounts prediction help closed', async () => {
    await mount(); await toggle(guide(), true); const previous = guide(), el = field(), before = independent(latest._circuitActive), other = clone(latest._circuitActive.lessonRecords.sensor); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); await click(button('Decreases')); await click(button('Test transistor prediction'));
    expect(guide()).toBeNull(); expect(testedGuide()).not.toBeNull(); expect(testedGuide().open).toBe(false); expect(field()).toBe(el); expect(el.value).toBe('My prediction draft.'); expect(el.rows).toBe(12); expect(latest._circuitActive.lessonRecords.gain).toEqual(record('less', true, 'My prediction draft.')); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]'));
    await toggle(testedGuide(), true); const retry = lab().querySelector('.circuit-active-lesson-retry'); await toggle(retry, true); await click(retry.querySelector('button'));
    expect(guide()).not.toBe(previous); expect(guide().open).toBe(false); expect(testedGuide()).toBeNull(); expect(field()).toBe(el); expect(el.value).toBe(''); expect(el.rows).toBe(12); expect(independent(latest._circuitActive)).toEqual(before); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other); expect(awards).not.toHaveBeenCalled();
  });

  it('blank reasoning and a closed guide never gate a chosen prediction or the existing Test action', async () => {
    await mount({ lessonRecords: { gain: record(null, false, '') } }); expect(guide().open).toBe(false); expect(button('Test transistor prediction').disabled).toBe(true); await click(button('Stays the same')); expect(button('Test transistor prediction').disabled).toBe(false); expect(guide().open).toBe(false);
    await click(button('Test transistor prediction')); expect(latest._circuitActive.lessonRecords.gain).toEqual(record('same', true, '')); expect(guide()).toBeNull(); expect(testedGuide().open).toBe(false); expect(api.circuitActiveLessonJourney(latest._circuitActive, 'gain')).toMatchObject({ phase: 'explain', explanationSaved: false }); expect(awards).not.toHaveBeenCalled();
  });

  it('actual JSON untested load and restore update open prompts without persisted disclosure state or automatic navigation', async () => {
    await mount(); const original = api.circuitActiveInvestigation(latest._circuitActive); await toggle(guide(), true); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const details = guide(), el = field();
    expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); const imported = api.circuitActiveInvestigation({ input: 2.7, supply: 9, lessonId: 'limit', lessonRecords: { limit: record('more', false, 'Imported prediction.') } });
    await importDoc(imported); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(details.dataset.guideLesson).toBe('limit'); expect(details.textContent).toContain(prompts.limit); expect(field()).toBe(el); expect(el.value).toBe('Imported prediction.'); expect(el.rows).toBe(12); expect(document.activeElement).not.toBe(el); expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-question]')); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(imported);
    await click(button('Restore previous investigation')); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(details.dataset.guideLesson).toBe('gain'); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});