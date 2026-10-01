import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const ids = ['gain', 'limit', 'sensor'];
const titles = { gain: 'Small input, larger current', limit: 'Find the limit', sensor: 'Make a night light' };
const saved = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
let api, config;
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
const seed = () => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), view: 'schematic', probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep this observation.')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook.', investigationTitle: 'A tuned circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })] });
const protectedWork = state => clone({ design: api.circuitActiveDesign(state), undo: state.undo, redo: state.redo, view: state.view, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack });

describe('Optional lesson explanation guide', () => {
  let host, root, latest, update, setLocale, frames, scrollOriginal, writes, awards;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const guide = () => lab().querySelector('.circuit-active-explanation-guide');
  const summary = () => guide().querySelector('summary');
  const continuation = () => lab().querySelector('.circuit-active-lesson-continuation');
  const nextButton = () => continuation().querySelector('.circuit-continuation-action:not(.circuit-continuation-review-map)');
  const reviewMap = () => continuation().querySelector('.circuit-continuation-review-map');
  const map = () => lab().querySelector('details.circuit-active-lesson-map');
  const retry = () => lab().querySelector('details.circuit-active-lesson-retry');
  const field = () => lab().querySelector('textarea');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  const allSaved = () => ({ gain: saved('less', true, ''), limit: saved('same', true, ' '), sensor: saved('more', true, 'Sensor evidence') });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function toggle(el, open) { await act(async () => { el.open = open; el.dispatchEvent(new Event('toggle')); }); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function mount(active = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: { ...seed(), notebookOpen: true, lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'Keep gain evidence.') }, ...active }, _circuitNetwork: { reflection: 'Keep connected work.' } };
    function Host() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Host))); await flush();
  }
  beforeEach(() => { frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); writes = vi.fn(); awards = vi.fn(); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });


  async function write(text) { const el = field(); await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function importDoc(doc) { const input = host.querySelector('input[aria-label="Open investigation file"]'); Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'guide.json', size: 1024, text: () => Promise.resolve(JSON.stringify(doc)) }] }); await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load); }
  it.each([undefined, saved('less', false, 'Early reasoning'), saved(null, true, 'Invalid tested flag')])('does not disclose explanation prompts before a normalized Test (%j)', async record => {
    await mount({ lessonRecords: record ? { gain: record } : {} }); expect(guide()).toBeNull(); expect(lab().textContent).not.toContain('Build an explanation'); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });
  it.each(ids)('routes the three ordered prompts to %s saved evidence on a separately tuned live bench', async id => {
    await mount({ lessonId: id, lessonRecords: { [id]: saved('less', true, '') } }); const el = guide(); expect(el.tagName).toBe('DETAILS'); expect(el.open).toBe(false); expect(el.dataset.guideLesson).toBe(id); expect(summary().textContent).toBe('Build an explanation');
    expect([...el.querySelectorAll('ol li')].map(n => n.dataset.guideStep)).toEqual(['observe', 'connect', 'reflect']); expect(el.querySelectorAll('.circuit-explanation-guide-prompt')).toHaveLength(3); expect(el.textContent).toMatch(/saved/i); expect(el.textContent).not.toContain('12 V');
    const text = el.textContent.toLowerCase(); if (id === 'gain') { expect(text).toContain('base current'); expect(text).toContain('lamp current'); } if (id === 'limit') { expect(text).toContain('operating regions'); expect(text).toContain('base current'); } if (id === 'sensor') { expect(text).toContain('connected divider'); expect(text).toContain('junction'); }
    expect(el.querySelector('button,input,textarea,select,[role="status"],[aria-live]')).toBeNull(); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });
  it.each(['', 'An explanation to revisit'])('is optional for incorrect predictions and an explanation of %j without grading or gating', async explanation => {
    await mount({ lessonRecords: { gain: saved('less', true, explanation) } }); expect(guide()).not.toBeNull(); expect(continuation()).not.toBeNull(); expect(field().value).toBe(explanation); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(guide().textContent).not.toMatch(/correct explanation|must explain|mastered|grade/i); expect(writes).not.toHaveBeenCalled();
  });
  it('inserts only the optional guide after the existing textarea and before continuation', async () => {
    await mount(); const el = field(); expect(el.nextElementSibling).toBe(guide()); expect(guide().nextElementSibling).toBe(continuation()); expect(lab().querySelectorAll('textarea')).toHaveLength(1); expect(el.getAttribute('aria-label')).toBe('Transistor experiment explanation'); expect(document.getElementById(el.getAttribute('aria-describedby')).textContent).toContain('investigation notebook has its own explanation'); expect(el.maxLength).toBe(4000); expect(el.rows).toBe(3);
  });
  it('native opening and closing preserve exact state, text selection, summary focus and history', async () => {
    await mount(); const before = latest, json = JSON.stringify(latest), el = field(); el.setSelectionRange(2, 9, 'backward'); summary().focus(); await toggle(guide(), true); await toggle(guide(), false); await toggle(guide(), true); expect(guide().open).toBe(true); expect(document.activeElement).toBe(summary()); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 9, 'backward']); expect(latest).toBe(before); expect(JSON.stringify(latest)).toBe(json); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('typing leaves the guide open, keeps the textarea node/caret, and edits only its own explanation', async () => {
    await mount({ lessonRecords: allSaved() }); await toggle(guide(), true); const disclosure = guide(), el = field(), before = protectedWork(latest._circuitActive), other = clone(latest._circuitActive.lessonRecords.sensor); el.focus(); await write('My own evidence, in my own words.'); el.setSelectionRange(3, 14, 'backward'); expect(field()).toBe(el); expect(document.activeElement).toBe(el); expect(guide()).toBe(disclosure); expect(guide().open).toBe(true); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe(el.value); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other); expect(protectedWork(latest._circuitActive)).toEqual(before); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([3,14,'backward']); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('live electrical edits preserve open prompts and do not steal writing focus', async () => {
    await mount(); await toggle(guide(), true); const el = field(), text = guide().textContent, records = clone(latest._circuitActive.lessonRecords); el.focus(); el.setSelectionRange(2,7,'backward'); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 9, input: 0, light: 95 } })); expect(guide().textContent).toBe(text); expect(guide().open).toBe(true); expect(field()).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart,el.selectionEnd,el.selectionDirection]).toEqual([2,7,'backward']); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('baseline and result replay leave the guide and writing saved while Undo restores the edited circuit', async () => {
    await mount(); await toggle(guide(), true); const details = guide(), before = protectedWork(latest._circuitActive), text = details.textContent; await click(button('Load experiment baseline')); expect(guide()).toBe(details); expect(details.open).toBe(true); await click(button('Load this experiment result')); expect(details.textContent).toBe(text); expect(field().value).toBe('Keep gain evidence.'); await click(button('Undo active edit')); await click(button('Undo active edit')); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(before.design); expect(latest._circuitActive.observations).toEqual(before.observations); expect(details.open).toBe(true);
  });
  it('switching tested lessons reuses the open disclosure with the current prompts and saved writing', async () => {
    await mount({ lessonRecords: allSaved() }); await toggle(guide(), true); const details = guide(), before = protectedWork(latest._circuitActive); const texts = []; for (const id of ['sensor','limit','gain']) { await select(id); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(details.dataset.guideLesson).toBe(id); texts.push(details.textContent); expect(field().value).toBe(latest._circuitActive.lessonRecords[id].explanation); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); } expect(new Set(texts).size).toBe(3); expect(protectedWork(latest._circuitActive)).toEqual(before);
  });
  it('translates every visible guide text while preserving native disclosure, writing identity and noncollapsed selection', async () => {
    await mount(); await toggle(guide(), true); const details = guide(), el = field(), before = latest; el.focus(); el.setSelectionRange(2,8,'backward'); await act(async () => setLocale('Translated: ')); await flush(); const walker = document.createTreeWalker(details, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) if (node.textContent.trim()) expect(node.textContent).toMatch(/^Translated: /); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(field()).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart,el.selectionEnd,el.selectionDirection]).toEqual([2,8,'backward']); expect(latest).toBe(before); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('the existing writing jump retains text and selection without opening the guide or writing state', async () => {
    await mount(); const before = latest, el = field(); el.setSelectionRange(2,8,'backward'); await click(lab().querySelector('.circuit-lesson-explanation-jump')); expect(document.activeElement).toBe(el); expect([el.selectionStart,el.selectionEnd,el.selectionDirection]).toEqual([2,8,'backward']); expect(guide().open).toBe(false); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block:'start', behavior:'instant' });
  });
  it('explicit retry removes the guide and a real prediction/Test remounts it closed without losing independent work', async () => {
    await mount({ lessonRecords: allSaved() }); await toggle(guide(), true); const previous = guide(), before = protectedWork(latest._circuitActive); await toggle(retry(), true); await click(retry().querySelector('button')); expect(guide()).toBeNull(); expect(field().value).toBe(''); await click(button('Decreases')); expect(guide()).toBeNull(); await click(button('Test transistor prediction')); expect(guide()).not.toBe(previous); expect(guide().open).toBe(false); expect(field().value).toBe(''); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); for (const key of ['observations','reference','reflection','investigationTitle','probeRed','probeBlack','view']) expect(protectedWork(latest._circuitActive)[key]).toEqual(before[key]); expect(latest._circuitActive.lessonRecords.sensor).toEqual(allSaved().sensor);
  });
  it('next experiment selection hides the guide for the untested target and restores it closed on return', async () => {
    await mount(); await toggle(guide(), true); const before = protectedWork(latest._circuitActive), record = clone(latest._circuitActive.lessonRecords.gain); await click(nextButton()); expect(guide()).toBeNull(); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]')); expect(protectedWork(latest._circuitActive)).toEqual(before); await select('gain'); expect(guide().open).toBe(false); expect(latest._circuitActive.lessonRecords.gain).toEqual(record); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]'));
  });
  it('actual JSON tested-to-tested load and restore update prompts without closing the guide or replaying focus', async () => {
    await mount(); await toggle(guide(), true); const details = guide(), records = clone(latest._circuitActive.lessonRecords); await click(lab().querySelector('.circuit-lesson-explanation-jump')); Element.prototype.scrollIntoView.mockClear(); const doc = api.circuitActiveInvestigation({ input:2.4, lessonId:'sensor', lessonRecords:{sensor:saved('less',true,'Imported sensor explanation')} }); await importDoc(doc); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(details.dataset.guideLesson).toBe('sensor'); expect(field().value).toBe('Imported sensor explanation'); expect(document.activeElement).not.toBe(field()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); await click(button('Restore previous investigation')); expect(guide()).toBe(details); expect(details.open).toBe(true); expect(details.dataset.guideLesson).toBe('gain'); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(document.activeElement).not.toBe(field()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('actual JSON untested load hides guidance; restoring tested work mounts it closed without automatic navigation', async () => {
    await mount(); await toggle(guide(),true); const previous = guide(); await importDoc(api.circuitActiveInvestigation({input:2.4,lessonId:'limit',lessonRecords:{limit:saved('same',false,'Imported prediction')}})); expect(guide()).toBeNull(); expect(field().value).toBe('Imported prediction'); await click(button('Restore previous investigation')); expect(guide()).not.toBe(previous); expect(guide().open).toBe(false); expect(field().value).toBe('Keep gain evidence.'); expect(document.activeElement).not.toBe(field()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
