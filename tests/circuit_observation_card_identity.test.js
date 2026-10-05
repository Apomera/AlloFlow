import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Saved observation cards follow their own readings', () => {
  let api, config, host, root, store, writes, frames;
  const cards = () => [...host.querySelectorAll('.circuit-notebook-observation')];
  const note = card => card.querySelector('.circuit-notebook-note');
  const state = () => store.data._circuitActive;
  const point = (input, text, extra = {}) => api.circuitActiveObservation({ input, probeRed: 'drive', probeBlack: 'base', ...extra }, text);
  const button = label => [...host.querySelectorAll('button')].find(el => el.textContent === label);
  const selected = () => [...host.querySelectorAll('.circuit-observation-selectors select')].map(el => el.value);
  function Harness({ initial }) {
    const [data, update] = React.useState(initial), [locale, setLocale] = React.useState(''); store = { data, update, setLocale };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => locale + fallback }));
  }
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitNetwork: { reflection: 'Connected work.' }, _circuitActive: {
      ...api.circuitActiveDesign({ input: 4.2 }), view: 'schematic', notebookOpen: true,
      observations: [point(1, 'A: dim lamp'), point(1.5, 'B: brighter lamp'), point(2, 'C: another reading')],
      reflection: 'My own explanation.', investigationQuestion: 'How does input affect current?', investigationPrediction: 'More input may increase current.',
      lessonRecords: { gain: { explanation: 'Guided work.' } }, undo: [api.circuitActiveDesign({ input: .8 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch
    } };
    await act(async () => root.render(React.createElement(Harness, { initial }))); await flush();
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function patch(value) { await act(async () => store.update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  const markedState = new WeakMap();
  function mark(card) { card.open = true; const field = note(card); field.setSelectionRange(3, 10, 'backward'); field.style.height = '190px'; field.scrollTop = 24; markedState.set(field, [field.selectionStart, field.selectionEnd, field.selectionDirection, field.style.height, field.scrollTop]); return field; }
  function retained(card, field) { expect(card.open).toBe(true); expect(note(card)).toBe(field); expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.style.height, field.scrollTop]).toEqual(markedState.get(field)); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; writes = vi.fn(); frames = [];
    vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('keeps the open panel, note selection and manual size with a reading after an earlier removal', async () => {
    await mount(); const [a, b, c] = cards(), field = mark(b), before = state();
    await click(button('Remove observation 1'));
    expect(cards()).toEqual([b, c]); expect(a.isConnected).toBe(false); retained(b, field); expect(c.open).toBe(false); expect(field.value).toBe('B: brighter lamp');
    expect(field.getAttribute('aria-label')).toBe('Observation 1 note'); expect(state().observations).toEqual(before.observations.slice(1)); expect(state().reflection).toBe(before.reflection); expect(state().undo).toEqual(before.undo);
    expect(document.activeElement).toBe(host.querySelector('.circuit-active-notebook > summary'));
  });

  it('keeps surviving cards in place when an earlier removed reading is restored', async () => {
    await mount(); await click(button('Remove observation 1')); const [b, c] = cards(), field = mark(b);
    await click(button('Restore removed observation'));
    expect(cards()[1]).toBe(b); expect(cards()[2]).toBe(c); retained(b, field); expect(cards()[0].open).toBe(false); expect(c.open).toBe(false); expect(field.getAttribute('aria-label')).toBe('Observation 2 note');
    expect(state().observations.map(o => o.note)).toEqual(['A: dim lamp', 'B: brighter lamp', 'C: another reading']);
  });

  it('follows retained readings when their order changes', async () => {
    await mount(); const original = state().observations, [a, b, c] = cards(), field = mark(b); field.focus();
    await patch({ observations: [original[2], original[0], original[1]] });
    expect(cards()).toEqual([c, a, b]); retained(b, field); expect(document.activeElement).toBe(field); expect(field.getAttribute('aria-label')).toBe('Observation 3 note'); expect(writes).not.toHaveBeenCalled();
  });

  it('retains the card while its note is edited through the existing state handler', async () => {
    await mount(); const b = cards()[1], field = mark(b), design = state().observations[1].design;
    field.focus(); await write(field, 'B: revised observation');
    expect(cards()[1]).toBe(b); expect(note(b)).toBe(field); expect(b.open).toBe(true); expect(field.style.height).toBe('190px'); expect(document.activeElement).toBe(field); expect(state().observations[1].design).toBe(design);
    expect(state().observations.map(o => o.note)).toEqual(['A: dim lamp', 'B: revised observation', 'C: another reading']); expect(writes).toHaveBeenCalledTimes(1);
  });

  it('preserves existing open notes when recording focuses a new observation', async () => {
    await mount(); const original = cards(), field = mark(original[1]); await click(button('Record current readings'));
    expect(cards().slice(0, 3)).toEqual(original); retained(original[1], field); expect(cards()[3].open).toBe(true); expect(document.activeElement).toBe(note(cards()[3])); expect(state().observations).toHaveLength(4);
  });

  it('distinguishes separate historical observations with equal settings and equal note text', async () => {
    await mount({ observations: [point(1, 'Same note'), point(1, 'Same note'), point(1, 'Same note')] }); const [a, b, c] = cards(), field = mark(b);
    await click(button('Remove observation 1')); expect(cards()).toEqual([b, c]); retained(b, field); expect(a.isConnected).toBe(false); expect(c.open).toBe(false);
  });

  it('distinguishes shared design references when the captured probe connections differ', async () => {
    const a = point(1, 'Forward leads'), b = { ...a, note: 'Reverse leads', probeRed: 'base', probeBlack: 'drive' };
    await mount({ observations: [a, b, point(2, 'Separate')] }); const [first, second, third] = cards(), field = mark(second);
    await click(button('Remove observation 1')); expect(cards()).toEqual([second, third]); retained(second, field); expect(first.isConnected).toBe(false); expect(note(second).value).toBe('Reverse leads');
  });

  it('resets ambiguous shared-design occurrences rather than handing one occurrence another open editor', async () => {
    const a = point(1, 'Ambiguous A'), b = { ...a, note: 'Ambiguous B' }, c = point(2, 'Known C');
    await mount({ observations: [a, b, c] }); const [first, second, third] = cards(), field = mark(third); mark(first);
    await click(button('Remove observation 1'));
    expect(cards()[0]).not.toBe(first); expect(cards()[0]).not.toBe(second); expect(cards()[0].open).toBe(false); expect(note(cards()[0]).value).toBe('Ambiguous B'); expect(cards()[1]).toBe(third); retained(third, field);
  });

  it('starts replacement imported observations with their own closed editors even when values match', async () => {
    await mount(); const original = cards(); mark(original[1]); const replacements = JSON.parse(JSON.stringify(state().observations));
    await patch({ observations: replacements });
    cards().forEach((card, index) => { expect(card).not.toBe(original[index]); expect(card.open).toBe(false); expect(note(card).style.height).toBe(''); expect(note(card).value).toBe(replacements[index].note); });
    expect(selected()).toEqual(['', '']);
  });

  it('resets ambiguous editors and selections when recovery adds another shared-design occurrence', async () => {
    const a = point(1, 'Historical A'), b = { ...a, note: 'Historical B' }, c = point(2, 'Separate reading C');
    await mount({ observations: [a, b, c] }); await click(button('Remove observation 1'));
    const [oldB, originalC] = cards(), field = mark(originalC); mark(oldB);
    const fields = [...host.querySelectorAll('.circuit-observation-selectors select')];
    for (let i = 0; i < 2; i++) await act(async () => { fields[i].value = fields[i].options[i + 1].value; fields[i].dispatchEvent(new Event('change', { bubbles: true })); });
    await flush(); const selectedC = selected()[1]; await click(button('Restore removed observation'));
    expect(cards()[0]).not.toBe(oldB); expect(cards()[1]).not.toBe(oldB); expect(cards()[0].open).toBe(false); expect(cards()[1].open).toBe(false); expect(cards()[2]).toBe(originalC); retained(originalC, field);
    expect(selected()).toEqual(['', selectedC]); expect(state().observations.map(o => o.note)).toEqual(['Historical A', 'Historical B', 'Separate reading C']);
  });

  it('renumbers comparison-to-note links while still opening the same surviving card', async () => {
    await mount(); const selects = [...host.querySelectorAll('.circuit-observation-selectors select')];
    for (let i = 0; i < 2; i++) await act(async () => { selects[i].value = selects[i].options[i + 2].value; selects[i].dispatchEvent(new Event('change', { bubbles: true })); });
    await flush(); const pair = selected(), [, b, c] = cards(); await click(button('Remove observation 1'));
    expect(selected()).toEqual(pair); expect(cards()).toEqual([b, c]); const edit = host.querySelector('.circuit-comparison-note-edit'); await click(edit);
    expect(document.activeElement).toBe(note(b)); expect(document.getElementById(edit.getAttribute('aria-controls'))).toBe(note(b)); expect(edit.getAttribute('aria-label')).toBe('Edit note for observation 1'); expect(c.open).toBe(false);
  });

  it('retains card state through live edits and translated labels without writing new persistent identifiers', async () => {
    await mount(); const original = cards(), field = mark(original[1]); field.focus(); const entries = state().observations;
    await patch({ input: .1 }); await act(async () => store.setLocale('Translated '));
    expect(cards()).toEqual(original); retained(original[1], field); expect(document.activeElement).toBe(field); expect(state().observations).toBe(entries); expect(writes).not.toHaveBeenCalled();
    for (const entry of api.circuitActiveInvestigation(state()).notebook.observations) expect(Object.keys(entry).sort()).toEqual(['design', 'note', 'probeBlack', 'probeRed']);
  });

  it('creates a new editor for a restored removed reading while preserving the still-saved note', async () => {
    await mount(); const [a, b, c] = cards(); mark(a); const field = mark(b);
    await click(button('Remove observation 1')); await click(button('Restore removed observation'));
    expect(cards()[0]).not.toBe(a); expect(cards()[0].open).toBe(false); expect(note(cards()[0]).style.height).toBe(''); expect(cards()[1]).toBe(b); expect(cards()[2]).toBe(c); retained(b, field);
  });
});
