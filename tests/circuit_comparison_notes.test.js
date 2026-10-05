import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Review saved notes from a circuit comparison', () => {
  let api, config, host, root, stores, writes, frames, scrollOriginal;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const comparison = (index = 0) => scope(index).querySelector('.circuit-observation-compare');
  const review = (index = 0) => scope(index).querySelector('.circuit-comparison-notes');
  const cards = (index = 0) => [...scope(index).querySelectorAll('.circuit-notebook-observation')];
  const notes = (index = 0) => cards(index).map(card => card.querySelector('.circuit-notebook-note'));
  const edits = (index = 0) => [...scope(index).querySelectorAll('.circuit-comparison-note-edit')];
  const fields = (index = 0) => [...scope(index).querySelectorAll('.circuit-observation-selectors select')];
  const previews = (index = 0) => [...review(index).querySelectorAll('.circuit-comparison-note-text')].map(el => el.textContent);
  const point = (input, note = '') => api.circuitActiveObservation({ input, probeRed: 'drive', probeBlack: 'base' }, note);
  const button = name => [...scope().querySelectorAll('button')].find(el => el.textContent === name);
  const state = (index = 0) => stores[index].data;
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitNetwork: { reflection: 'Keep connected work.' }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 4.2 }), view: 'schematic', notebookOpen: true,
    observations: [point(1, 'First reading: the lamp was dim.\nI kept the resistor fixed.'), point(1.5, 'Second reading: the lamp was brighter.')],
    reflection: 'My explanation stays here.', investigationPrediction: 'More input may increase current.',
    lessonRecords: { gain: { explanation: 'My guided explanation.' } },
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
  async function choose(slot, index) {
    const field = fields()[slot], value = index === null ? '' : [...field.options].filter(option => option.value)[index].value;
    await act(async () => { field.value = value; field.dispatchEvent(new Event('change', { bubbles: true })); }); await flush();
  }
  async function patch(value) { await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); await flush(); }
  async function write(el, value) {
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush();
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    stores = []; writes = vi.fn(); frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('offers a closed native disclosure with exact captured notes and local field links', async () => {
    await mount(); const before = state();
    expect(review().tagName).toBe('DETAILS'); expect(review().open).toBe(false);
    expect(review().querySelector('summary').textContent).toBe('Review saved notes');
    expect(previews()).toEqual(before._circuitActive.observations.map(o => o.note));
    expect([...review().querySelectorAll('h5')].map(el => el.textContent)).toEqual(['First · Observation 1', 'Second · Observation 2']);
    edits().forEach((el, i) => { expect(el.type).toBe('button'); expect(el.textContent).toBe('Edit note'); expect(el.getAttribute('aria-label')).toBe('Edit note for observation ' + (i + 1)); expect(document.getElementById(el.getAttribute('aria-controls'))).toBe(notes()[i]); });
    expect(review().querySelector('textarea,input,[aria-live],[role="status"]')).toBeNull();
    expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it.each([0, 1])('opens only the selected original note %i and preserves its draft, selection and dimensions', async index => {
    await mount(); const before = state(), target = notes()[index];
    target.setSelectionRange(3, 12, 'backward'); target.style.height = '180px'; target.scrollTop = 24;
    comparison().open = true; review().open = true; const selections = fields().map(el => el.value); writes.mockClear();
    await click(edits()[index]);
    expect(document.activeElement).toBe(target); expect(cards()[index].open).toBe(true); expect(cards()[1 - index].open).toBe(false);
    expect(target.value).toBe(before._circuitActive.observations[index].note); expect([target.selectionStart, target.selectionEnd, target.selectionDirection]).toEqual([3, 12, 'backward']);
    expect(target.style.height).toBe('180px'); expect(target.scrollTop).toBe(24); expect(fields().map(el => el.value)).toEqual(selections);
    expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('returns to the local comparison and retains its selected order and open note review', async () => {
    await mount(); await choose(0, 1); await choose(1, 0); comparison().open = true; review().open = true;
    await click(edits()[0]); const before = state(), values = fields().map(el => el.value), back = cards()[1].querySelector('.circuit-note-comparison-return');
    expect(document.getElementById(back.getAttribute('aria-controls'))).toBe(comparison()); comparison().open = false; writes.mockClear();
    await click(back);
    expect(comparison().open).toBe(true); expect(review().open).toBe(true); expect(document.activeElement).toBe(comparison().querySelector(':scope > summary'));
    expect(fields().map(el => el.value)).toEqual(values); expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('updates the selected preview through the original note editor without changing measurements or the explanation', async () => {
    await mount(); const before = state(), first = before._circuitActive.observations[0], other = before._circuitActive.observations[1];
    await click(edits()[0]); await write(notes()[0], 'My revised evidence:\nThe current increased, but other settings were fixed.');
    expect(previews()[0]).toBe(notes()[0].value); expect(previews()[1]).toBe(other.note);
    expect(state()._circuitActive.observations[0].design).toBe(first.design); expect(state()._circuitActive.observations[1]).toBe(other);
    expect(state()._circuitActive.reflection).toBe(before._circuitActive.reflection); expect(state()._circuitActive.undo).toEqual(before._circuitActive.undo); expect(state()._circuitActive.redo).toEqual(before._circuitActive.redo);
    expect(document.activeElement).toBe(notes()[0]);
  });

  it('shows an honest empty-note prompt and renders markup-like authored text literally', async () => {
    const literal = '<img src=x onerror="window.bad=true">\nβ and العربية';
    await mount({ observations: [point(1, '   '), point(1.5, literal)] });
    expect(review().querySelector('.circuit-comparison-note-empty').textContent).toBe('No note yet. Describe what you noticed about this reading.');
    expect(edits()[0].textContent).toBe('Add note'); expect(edits()[0].getAttribute('aria-label')).toBe('Add note for observation 1'); expect(edits()[1].getAttribute('aria-label')).toBe('Edit note for observation 2');
    expect(previews()).toEqual([literal]); expect(review().querySelector('img,script')).toBeNull();
    expect(review().querySelector('.circuit-comparison-note-text').dir).toBe('auto');
  });

  it('tracks the chosen saved order even when several observations share the same settings', async () => {
    await mount({ observations: [point(1, 'First'), point(1, 'Second'), point(1, 'Third')] });
    await choose(0, 2); await choose(1, 0);
    expect(previews()).toEqual(['Third', 'First']); expect(edits().map(el => el.getAttribute('aria-label'))).toEqual(['Edit note for observation 3', 'Edit note for observation 1']);
    await click(edits()[0]); expect(document.activeElement).toBe(notes()[2]); expect(notes()[2].value).toBe('Third');
  });

  it('removes stale note actions for missing or identical selected observations', async () => {
    await mount(); await choose(1, 0); expect(review()).toBeNull(); expect(edits()).toHaveLength(0);
    await choose(1, 1); expect(previews()).toHaveLength(2); await choose(0, null);
    expect(review()).toBeNull(); expect(edits()).toHaveLength(0);
  });

  it('renumbers note targets when an earlier unselected observation is removed', async () => {
    await mount({ observations: [point(.8, 'Earlier'), point(1, 'Selected A'), point(1.5, 'Selected B')] });
    await choose(0, 1); await choose(1, 2); await click(button('Remove observation 1'));
    expect(previews()).toEqual(['Selected A', 'Selected B']); expect(edits().map(el => el.getAttribute('aria-label'))).toEqual(['Edit note for observation 1', 'Edit note for observation 2']);
    const before = state(); writes.mockClear(); await click(edits()[1]);
    expect(document.activeElement).toBe(notes()[1]); expect(notes()[1].value).toBe('Selected B'); expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('clears removed selections and waits for explicit reselection after restoration', async () => {
    await mount({ observations: [point(1, 'A'), point(1.5, 'B'), point(2, 'C')] }); await click(button('Remove observation 1'));
    expect(review()).toBeNull(); await click(button('Restore removed observation')); expect(review()).toBeNull();
    await choose(0, 0); expect(previews()).toEqual(['A', 'B']); await click(edits()[0]); expect(document.activeElement).toBe(notes()[0]);
  });

  it('keeps captured notes and focus stable during live edits and locale changes', async () => {
    await mount(); review().open = true; const before = previews(), target = scope().querySelector('input[aria-label="Input voltage (V) exact value"]'); target.focus();
    await patch({ input: .2, probeRed: 'emitter', probeBlack: 'supply' }); expect(previews()).toEqual(before); expect(document.activeElement).toBe(target);
    await act(async () => stores[0].setLocale('Translated: ')); await flush();
    expect(previews()).toEqual(before); expect(review().open).toBe(true); expect(edits()[0].textContent).toBe('Translated: Edit note'); expect(edits()[0].getAttribute('aria-label')).toBe('Translated: Edit note for observation 1'); expect(document.activeElement).toBe(target);
  });

  it('keeps navigation and new IDs local when two CircuitTools are mounted', async () => {
    await mount({}, { observations: [point(2, 'Other A'), point(2.5, 'Other B')] }); const first = state(), second = state(1);
    const ids = [comparison().id, comparison(1).id, ...notes().map(el => el.id), ...notes(1).map(el => el.id)]; expect(new Set(ids).size).toBe(ids.length);
    await click(edits(1)[1]); expect(document.activeElement).toBe(notes(1)[1]); expect(cards()[1].open).toBe(false);
    await click(cards(1)[1].querySelector('.circuit-note-comparison-return')); expect(document.activeElement).toBe(comparison(1).querySelector(':scope > summary'));
    expect(state()).toBe(first); expect(state(1)).toBe(second); expect(writes).not.toHaveBeenCalled();
  });

  it('adds return controls only when a saved comparison is available', async () => {
    await mount({ observations: [point(1, 'A')] }); expect(comparison()).toBeNull(); expect(scope().querySelector('.circuit-note-comparison-return')).toBeNull();
    await patch({ observations: [...state()._circuitActive.observations, point(1.5, 'B')] });
    expect(comparison()).toBeTruthy(); expect(scope().querySelectorAll('.circuit-note-comparison-return')).toHaveLength(2);
  });
});
