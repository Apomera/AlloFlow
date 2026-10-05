import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Explore the direction of a saved circuit comparison', () => {
  let api, config, host, root, stores, writes, frames;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const panel = (index = 0) => scope(index).querySelector('.circuit-observation-compare');
  const swap = (index = 0) => scope(index).querySelector('.circuit-observation-swap');
  const status = (index = 0) => scope(index).querySelector('.circuit-observation-order-announcement');
  const fields = (index = 0) => [...scope(index).querySelectorAll('.circuit-observation-selectors select')];
  const values = (index = 0) => fields(index).map(el => el.value);
  const directions = (index = 0) => [...scope(index).querySelectorAll('.circuit-observation-delta-direction')].map(el => el.textContent);
  const numbers = () => [...panel().querySelectorAll('.circuit-observation-delta dd bdi')].map(el => el.textContent);
  const noteCards = () => [...panel().querySelectorAll('.circuit-comparison-note-card')].map(el => el.querySelector('p').textContent);
  const preview = () => panel().querySelector('.circuit-comparison-writing-preview').textContent;
  const state = (index = 0) => stores[index].data;
  const point = (input, note = '', extra = {}) => api.circuitActiveObservation({ input, probeRed: 'drive', probeBlack: 'base', ...extra }, note);
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitNetwork: { reflection: 'Connected work.' }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 4.2 }), view: 'schematic', notebookOpen: true,
    observations: [point(1, 'First note'), point(1.5, 'Second note')], reflection: 'My explanation.',
    investigationPrediction: 'More input may increase current.', lessonRecords: { gain: { explanation: 'Guided work.' } },
    reference: { version: 1, design: api.circuitActiveDesign({ input: .8 }) },
    undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch
  } });
  function Harness({ index, initial }) {
    const [data, update] = React.useState(initial), [locale, setLocale] = React.useState('');
    stores[index] = { data, update, setLocale };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => locale + fallback }));
  }
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function mount(patch = {}, second) {
    const patches = second === undefined ? [patch] : [patch, second];
    await act(async () => root.render(React.createElement(React.Fragment, null, ...patches.map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { index, initial: seed(value) })))))); await flush();
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function choose(slot, index) {
    const field = fields()[slot], value = index === null ? '' : [...field.options].filter(option => option.value)[index].value;
    await act(async () => { field.value = value; field.dispatchEvent(new Event('change', { bubbles: true })); }); await flush();
  }
  async function patch(value) { await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); await flush(); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    stores = []; writes = vi.fn(); frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('swaps both selections and all displayed evidence without writing tool state or moving focus', async () => {
    await mount(); const before = state(), originalValues = values(), originalPreview = preview();
    panel().open = true; const review = panel().querySelector('.circuit-comparison-notes'); review.open = true;
    const originalButton = swap(); originalButton.focus();
    expect(status().textContent).toBe(''); expect(originalButton.type).toBe('button');
    expect(document.getElementById(originalButton.getAttribute('aria-describedby')).textContent).toContain('direction');
    expect(originalButton.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    await click(originalButton);
    expect(values()).toEqual(originalValues.toReversed()); expect(noteCards()).toEqual(['Second note', 'First note']);
    expect(numbers()).toEqual(['-50.0 µA', '-5.00 mA', '+1.10V', '-12.10 mW', '-500.00 mV']);
    expect(directions()).toEqual(['Decreased', 'Decreased', 'Increased', 'Decreased', 'Decreased']);
    expect(preview()).toBe(api.circuitActiveComparisonEvidence(...before._circuitActive.observations.toReversed()).text); expect(preview()).not.toBe(originalPreview);
    expect(status().textContent).toBe('Order swapped. First: Observation 2. Second: Observation 1.'); expect(status().getAttribute('aria-atomic')).toBe('true');
    expect(panel().open).toBe(true); expect(review.open).toBe(true); expect(document.activeElement).toBe(originalButton);
    expect(state()).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('restores the original evidence after a second swap and preserves draft selection and size', async () => {
    await mount(); const original = { values: values(), preview: preview(), numbers: numbers(), directions: directions(), notes: noteCards() };
    const reflection = scope().querySelector('.circuit-notebook-reflection');
    expect(reflection).toBeTruthy(); reflection.setSelectionRange(2, 8, 'backward'); reflection.style.height = '220px'; reflection.scrollTop = 12;
    await click(swap()); await click(swap());
    expect({ values: values(), preview: preview(), numbers: numbers(), directions: directions(), notes: noteCards() }).toEqual(original);
    expect([reflection.selectionStart, reflection.selectionEnd, reflection.selectionDirection, reflection.style.height, reflection.scrollTop]).toEqual([2, 8, 'backward', '220px', 12]);
    expect(status().textContent).toBe('Order swapped. First: Observation 1. Second: Observation 2.'); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['same', 'missing'])('disables swapping for %s selections and clears the previous announcement', async kind => {
    await mount(); await click(swap()); await choose(1, kind === 'same' ? 1 : null);
    expect(swap().disabled).toBe(true); expect(status().textContent).toBe(''); const before = values(); await click(swap()); expect(values()).toEqual(before);
    expect(writes).not.toHaveBeenCalled();
  });

  it('clears removed selections after swapping and requires an explicit new choice', async () => {
    const points = [point(1, 'A'), point(1.5, 'B'), point(2, 'C')]; await mount({ observations: points }); await click(swap()); const second = values()[1];
    await patch({ observations: [points[0], points[2]] });
    expect(values()).toEqual(['', second]); expect(swap().disabled).toBe(true); expect(status().textContent).toBe(''); expect(directions()).toEqual([]);
    await patch({ observations: points }); expect(swap().disabled).toBe(true); expect(values()[0]).toBe('');
    await choose(0, 1); expect(swap().disabled).toBe(false); expect(noteCards()).toEqual(['B', 'A']);
  });

  it('retains the selected identities when an earlier unselected observation is removed', async () => {
    const points = [point(.8, 'Earlier'), point(1, 'A'), point(1.5, 'B')]; await mount({ observations: points }); await choose(0, 1); await choose(1, 2); await click(swap()); const before = values();
    await patch({ observations: points.slice(1) });
    expect(values()).toEqual(before); expect(noteCards()).toEqual(['B', 'A']); expect(status().textContent).toBe('Order swapped. First: Observation 2. Second: Observation 1.');
    await click(swap()); expect(noteCards()).toEqual(['A', 'B']); expect(writes).not.toHaveBeenCalled();
  });

  it('does not swap to equivalent replacement observations after an import', async () => {
    await mount(); await click(swap()); await patch({ observations: JSON.parse(JSON.stringify(state()._circuitActive.observations)) });
    expect(values()).toEqual(['', '']); expect(swap().disabled).toBe(true); expect(status().textContent).toBe(''); expect(directions()).toEqual([]);
  });

  it('allows distinct equal readings to swap their notes and labels every exact zero as no change', async () => {
    await mount({ observations: [point(1, 'A'), point(1, 'B')] }); expect(swap().disabled).toBe(false);
    expect(directions()).toEqual(Array(5).fill('No change')); await click(swap()); expect(noteCards()).toEqual(['B', 'A']); expect(directions()).toEqual(Array(5).fill('No change'));
    expect(numbers()).toEqual(['0 A', '0 A', '0.00V', '0 W', '0.00V']);
  });

  it('distinguishes increased drive from unchanged lamp current at saturation', async () => {
    await mount({ observations: [point(3.3), point(4.5)] });
    expect(directions()).toEqual(['Increased', 'No change', 'No change', 'No change', 'Increased']);
    await click(swap()); expect(directions()).toEqual(['Decreased', 'No change', 'No change', 'No change', 'Decreased']);
  });

  it('interprets a negative probe voltage as a signed value rather than its magnitude', async () => {
    const leads = { probeRed: 'base', probeBlack: 'drive' }; await mount({ observations: [point(1, '', leads), point(1.5, '', leads)] });
    expect(directions().at(-1)).toBe('Decreased'); expect(numbers().at(-1)).toBe('-500.00 mV');
    await click(swap()); expect(directions().at(-1)).toBe('Increased'); expect(numbers().at(-1)).toBe('+500.00 mV');
  });

  it('keeps unlike probe pairs separate when the order is reversed', async () => {
    await mount({ observations: [point(1), point(1, '', { probeRed: 'base', probeBlack: 'drive' })] }); await click(swap());
    const probe = panel().querySelector('.circuit-observation-probe-comparison');
    expect(probe.querySelector('.circuit-observation-delta')).toBeNull(); expect([...probe.querySelectorAll('dd bdi')].map(el => el.textContent)).toEqual(['-300.00 mV', '300.00 mV']);
    expect(probe.textContent).toContain('different connections'); expect(directions()).toEqual(Array(4).fill('No change'));
  });

  it('uses unrounded changes when the first and second readings display the same number', async () => {
    await mount({ observations: [point(1), point(1.0000001)] });
    const metric = [...panel().querySelectorAll('.circuit-observation-metric')].find(el => el.querySelector('h5').textContent === 'Lamp current');
    expect([...metric.querySelectorAll('dd bdi')].slice(0, 2).map(el => el.textContent)).toEqual(['3.00 mA', '3.00 mA']);
    expect(metric.querySelector('.circuit-observation-delta-direction').textContent).toBe('Increased'); expect(panel().textContent).toContain('before rounding');
    await click(swap()); expect(metric.querySelector('.circuit-observation-delta-direction').textContent).toBe('Decreased');
  });

  it('preserves previously written evidence and only appends the reversed evidence when requested', async () => {
    await mount(); const original = state()._circuitActive, forward = preview(); await patch({ reflection: 'My claim.\n\n' + forward }); await click(swap());
    const reverse = preview(); expect(state()._circuitActive.reflection).toBe('My claim.\n\n' + forward); expect(writes).not.toHaveBeenCalled();
    const add = [...panel().querySelectorAll('button')].find(el => el.textContent === 'Add readings to explanation'); await click(add);
    expect(state()._circuitActive.reflection).toBe('My claim.\n\n' + forward + '\n\n' + reverse); expect(state()._circuitActive.observations).toBe(original.observations); expect(state()._circuitActive.undo).toEqual(original.undo);
    await click(swap()); expect([...panel().querySelectorAll('button')].some(el => el.textContent === 'Review explanation')).toBe(true);
  });

  it('keeps live edits and translated labels independent of the local comparison order', async () => {
    await mount(); await click(swap()); const before = values(); await patch({ input: .1 }); await act(async () => stores[0].setLocale('Translated '));
    expect(values()).toEqual(before); expect(numbers()[1]).toBe('-5.00 mA'); expect(swap().textContent).toBe('Translated Swap order');
    expect(directions()[1]).toBe('Translated Decreased'); expect(status().textContent).toBe('Translated Order swapped. First: Translated Observation 2. Second: Translated Observation 1.');
    expect(writes).not.toHaveBeenCalled();
  });

  it('scopes order, announcements and descriptions to each of two CircuitTools', async () => {
    await mount({}, {}); const otherValues = values(1), otherState = state(1); await click(swap());
    expect(values(1)).toEqual(otherValues); expect(status(1).textContent).toBe(''); expect(state(1)).toBe(otherState);
    expect(swap().getAttribute('aria-describedby')).not.toBe(swap(1).getAttribute('aria-describedby'));
    expect(scope(0).contains(document.getElementById(swap().getAttribute('aria-describedby')))).toBe(true);
    expect(scope(1).contains(document.getElementById(swap(1).getAttribute('aria-describedby')))).toBe(true);
    expect(directions()[1]).toBe('Decreased'); expect(directions(1)[1]).toBe('Increased');
  });
});
