import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Review the investigation plan while writing a circuit explanation', () => {
  let api, config, host, root, stores, writes, frames;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const review = (index = 0) => scope(index).querySelector('.circuit-reflection-plan');
  const field = (slot, index = 0) => scope(index).querySelector(slot === 'reflection' ? '.circuit-notebook-reflection' : '.circuit-investigation-plan-input[id$="-' + slot + '"]');
  const edit = (slot, index = 0) => review(index).querySelector('.circuit-reflection-plan-edit[aria-controls$="-' + slot + '"]');
  const back = (index = 0) => scope(index).querySelector('.circuit-plan-return-writing');
  const readingLink = (index = 0) => scope(index).querySelector('.circuit-reflection-review-readings');
  const comparison = (index = 0) => scope(index).querySelector('.circuit-observation-compare');
  const previews = () => [...review().querySelectorAll('.circuit-reflection-plan-text')].map(el => el.textContent);
  const state = (index = 0) => stores[index].data;
  const point = (input, note = '') => api.circuitActiveObservation({ input, probeRed: 'drive', probeBlack: 'base' }, note);
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitNetwork: { reflection: 'Connected work.' }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 4.2 }), view: 'schematic', notebookOpen: true,
    observations: [point(1, 'First note'), point(1.5, 'Second note')], reflection: 'My explanation stays here.',
    investigationQuestion: '  How does input affect lamp current?\nI will keep both resistors fixed.  ',
    investigationPrediction: 'I predict a larger current.\nI will check the saved readings.',
    lessonRecords: { gain: { explanation: 'Guided work.' } }, reference: { version: 1, design: api.circuitActiveDesign({ input: .8 }) },
    undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch
  } });
  function Harness({ index, initial }) {
    const [data, update] = React.useState(initial), [locale, setLocale] = React.useState('');
    stores[index] = { data, update, setLocale };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => locale + fallback }));
  }
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function mount(patch = {}, second) {
    const values = second === undefined ? [patch] : [patch, second];
    await act(async () => root.render(React.createElement(React.Fragment, null, ...values.map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { index, initial: seed(value) })))))); await flush();
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function patch(value) { await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  const button = name => [...scope().querySelectorAll('button')].find(el => el.textContent === name);
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn(); frames = [];
    vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('offers a closed optional review with exact authored text and links to the original fields', async () => {
    await mount(); const before = state(); expect(review().tagName).toBe('DETAILS'); expect(review().open).toBe(false);
    expect(review().querySelector('summary').textContent).toBe('Review my question and prediction');
    expect(previews()).toEqual([before._circuitActive.investigationQuestion, before._circuitActive.investigationPrediction]);
    expect(review().querySelector('textarea,input,[role="status"]')).toBeNull(); expect(back()).toBeNull();
    for (const slot of ['question', 'prediction']) { expect(document.getElementById(edit(slot).getAttribute('aria-controls'))).toBe(field(slot)); expect(edit(slot).type).toBe('button'); }
    expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['question', 'prediction'])('edits the original %s and returns without changing writing, selection or disclosure state', async slot => {
    await mount(); const before = state(), target = field(slot), explanation = field('reflection'); review().open = true; comparison().open = true;
    const selects = [...comparison().querySelectorAll('select')].map(el => el.value);
    target.setSelectionRange(4, 12, 'backward'); target.style.height = '200px'; target.scrollTop = 15;
    explanation.setSelectionRange(2, 9, 'backward'); explanation.style.height = '260px'; explanation.scrollTop = 28;
    await click(edit(slot)); expect(document.activeElement).toBe(target); expect(back()).toBeTruthy(); expect(document.getElementById(back().getAttribute('aria-controls'))).toBe(explanation);
    expect([target.selectionStart, target.selectionEnd, target.selectionDirection, target.style.height, target.scrollTop]).toEqual([4, 12, 'backward', '200px', 15]);
    await click(back()); expect(document.activeElement).toBe(explanation); expect(back()).toBeNull(); expect(review().open).toBe(true); expect(comparison().open).toBe(true);
    expect([explanation.selectionStart, explanation.selectionEnd, explanation.selectionDirection, explanation.style.height, explanation.scrollTop]).toEqual([2, 9, 'backward', '260px', 28]);
    expect([...comparison().querySelectorAll('select')].map(el => el.value)).toEqual(selects); expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it.each([['question', 'investigationQuestion', 0], ['prediction', 'investigationPrediction', 1]])('updates the %s preview through the existing editor only', async (slot, key, index) => {
    await mount(); const before = state(), value = 'My revised ' + slot + '.\nI will use the saved readings.';
    await click(edit(slot)); await write(field(slot), value);
    expect(previews()[index]).toBe(value); expect(state()._circuitActive[key]).toBe(value); expect(writes).toHaveBeenCalledTimes(1);
    expect(state()._circuitActive.observations).toBe(before._circuitActive.observations); expect(state()._circuitActive.reflection).toBe(before._circuitActive.reflection); expect(state()._circuitActive.undo).toEqual(before._circuitActive.undo);
    const other = index === 0 ? 'investigationPrediction' : 'investigationQuestion'; expect(state()._circuitActive[other]).toBe(before._circuitActive[other]); expect(document.activeElement).toBe(field(slot));
  });

  it('uses helpful add actions for empty or whitespace-only plans and allows writing without them', async () => {
    await mount({ investigationQuestion: ' \n ', investigationPrediction: '', observations: [] });
    expect(previews()).toEqual([]); expect(review().querySelectorAll('.circuit-reflection-plan-empty').length).toBe(2);
    expect(edit('question').textContent).toBe('Add question'); expect(edit('prediction').textContent).toBe('Add prediction'); expect(readingLink()).toBeNull();
    await write(field('reflection'), 'I noticed the lamp was off.'); expect(state()._circuitActive.reflection).toBe('I noticed the lamp was off.'); expect(state()._circuitActive.investigationQuestion).toBe(' \n ');
    await click(edit('prediction')); expect(document.activeElement).toBe(field('prediction'));
  });

  it('renders long, markup-like and RTL authored text literally with its original line breaks', async () => {
    const question = '<img src=x onerror="window.bad=true">\n' + 'reading_'.repeat(115), prediction = 'أتوقع زيادة التيار.\nسأقارن القراءات.';
    await mount({ investigationQuestion: question, investigationPrediction: prediction });
    expect(previews()).toEqual([question, prediction]); expect(review().querySelector('img,script')).toBeNull();
    for (const text of review().querySelectorAll('.circuit-reflection-plan-text')) expect(text.dir).toBe('auto'); expect(writes).not.toHaveBeenCalled();
  });

  it('opens the selected saved comparison from the writer and returns through the existing writing action', async () => {
    await mount(); await click(scope().querySelector('.circuit-observation-swap')); const before = state(), selects = [...comparison().querySelectorAll('select')].map(el => el.value); comparison().open = false; review().open = true;
    expect(document.getElementById(readingLink().getAttribute('aria-controls'))).toBe(comparison()); await click(readingLink());
    expect(comparison().open).toBe(true); expect(document.activeElement).toBe(comparison().querySelector(':scope > summary')); expect([...comparison().querySelectorAll('select')].map(el => el.value)).toEqual(selects);
    await click(scope().querySelector('.circuit-comparison-writing-own')); expect(document.activeElement).toBe(field('reflection')); expect(review().open).toBe(true); expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('shows the saved-readings shortcut only while at least two comparable observations exist', async () => {
    await mount(); expect(readingLink()).toBeTruthy(); const observations = state()._circuitActive.observations;
    await patch({ observations: observations.slice(0, 1) }); expect(readingLink()).toBeNull();
    await patch({ observations: [] }); expect(readingLink()).toBeNull(); expect(review()).toBeTruthy();
    await patch({ observations }); expect(readingLink()).toBeTruthy();
  });

  it('refreshes review text after loading and restoring an investigation without replaying focus', async () => {
    await mount(); const original = state()._circuitActive; review().open = true; await click(edit('question')); await click(back());
    const doc = api.circuitActiveInvestigation({ ...original, investigationQuestion: 'Imported question', investigationPrediction: 'Imported prediction', reflection: 'Imported explanation' });
    const input = scope().querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'plan.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); button('Load investigation').focus(); await click(button('Load investigation'));
    expect(previews()).toEqual(['Imported question', 'Imported prediction']); expect(field('reflection').value).toBe('Imported explanation'); expect(document.activeElement).not.toBe(field('reflection')); expect(document.activeElement).not.toBe(field('question'));
    button('Restore previous investigation').focus(); await click(button('Restore previous investigation'));
    expect(previews()).toEqual([original.investigationQuestion, original.investigationPrediction]); expect(field('reflection').value).toBe(original.reflection); expect(document.activeElement).not.toBe(field('reflection'));
  });

  it('keeps the review open and retains current focus across live changes, translated labels and note edits', async () => {
    await mount(); review().open = true; await click(edit('prediction')); await patch({ input: .1, observations: state()._circuitActive.observations.map(o => ({ ...o, note: 'Edited note' })) });
    await act(async () => stores[0].setLocale('Translated '));
    expect(document.activeElement).toBe(field('prediction')); expect(review().open).toBe(true); expect(edit('prediction').textContent).toBe('Translated Edit prediction');
    expect(field('prediction').getAttribute('aria-label')).toBe('Translated My prediction'); expect(previews()[1]).toBe(state()._circuitActive.investigationPrediction); expect(writes).not.toHaveBeenCalled();
  });

  it('preserves enlarged and manually resized explanation fields across repeated plan visits', async () => {
    await mount(); await click(button('Expand writing space')); const original = field('reflection'); original.style.height = '340px';
    for (const slot of ['question', 'prediction', 'question']) { await click(edit(slot)); await click(back()); }
    expect(field('reflection')).toBe(original); expect(original.rows).toBe(12); expect(original.style.height).toBe('340px'); expect(writes).not.toHaveBeenCalled();
  });

  it('keeps plan edits, return navigation and reading shortcuts local to each tool instance', async () => {
    await mount({}, { investigationQuestion: 'Second tool question.' }); const other = state(1);
    for (const slot of ['question', 'prediction']) { expect(field(slot).id).not.toBe(field(slot, 1).id); expect(document.getElementById(edit(slot, 1).getAttribute('aria-controls'))).toBe(field(slot, 1)); }
    await click(edit('question', 1)); expect(document.activeElement).toBe(field('question', 1)); expect(back()).toBeNull(); expect(back(1)).toBeTruthy();
    await click(back(1)); expect(document.activeElement).toBe(field('reflection', 1));
    await click(readingLink(1)); expect(document.activeElement).toBe(comparison(1).querySelector(':scope > summary')); expect(comparison().open).toBe(false); expect(state(1)).toBe(other); expect(writes).not.toHaveBeenCalled();
  });
});
