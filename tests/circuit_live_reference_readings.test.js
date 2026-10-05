import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Live circuit reference readings', () => {
  let api, config, host, root, data, update, writes;
  const panel = () => host.querySelector('.circuit-active-reference');
  const cards = () => [...panel().querySelectorAll('.circuit-active-reference-metric')];
  const directions = () => cards().map(card => card.querySelector('[data-change-direction]').textContent);
  const deltas = () => cards().map(card => card.querySelector('.circuit-active-reference-delta bdi').textContent);
  const button = name => [...panel().querySelectorAll('button')].find(el => el.textContent === name);
  const ref = design => ({ version: 1, design: api.circuitActiveDesign(design) });
  const seed = (before, live) => ({ _circuit: { activeWorkbench: true }, _circuitActive: {
    ...api.circuitActiveDesign(live), view: 'schematic', reference: before === null ? null : ref(before),
    observations: [api.circuitActiveObservation({ input: .8 }, 'My reading.')], reflection: 'My explanation.',
    investigationQuestion: 'What changes?', undo: [], redo: []
  } });
  function Harness({ initial, translated = false }) {
    [data, update] = React.useState(initial);
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); },
      t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(before = { input: 1 }, live = { input: 1.5 }, translated = false) {
    await act(async () => root.render(React.createElement(Harness, { initial: seed(before, live), translated })));
  }
  async function patch(value) { await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    writes = vi.fn(); vi.stubGlobal('requestAnimationFrame', () => 1);
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('shows the four physical quantities with explicit reference, live and signed change labels', async () => {
    await mount();
    expect(cards().map(card => card.querySelector('h6').textContent)).toEqual(['Base current', 'Lamp current', 'Transistor voltage', 'Lamp power']);
    expect(directions()).toEqual(['Increased', 'Increased', 'Decreased', 'Increased']);
    expect(deltas()).toEqual(['+50.0 µA', '+5.00 mA', '-1.10V', '+12.10 mW']);
    expect(panel().textContent).toContain('Each change is Live − reference.');
    for (const card of cards()) {
      expect([...card.querySelectorAll('dt')].map(el => el.textContent)).toEqual(['Reference', 'Live', 'Change']);
      expect(card.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(3);
      expect(host.querySelector('[id="' + card.getAttribute('aria-labelledby') + '"]')).toBe(card.querySelector('h6'));
    }
    expect(writes).not.toHaveBeenCalled();
  });

  it('reverses directions when the live setting crosses below the reference', async () => {
    await mount(); const frozen = data._circuitActive.reference; await patch({ input: .8 });
    expect(directions()).toEqual(['Decreased', 'Decreased', 'Increased', 'Decreased']);
    expect(data._circuitActive.reference).toBe(frozen); expect(writes).not.toHaveBeenCalled();
  });

  it('shows numeric zero and no change for matching settings', async () => {
    await mount({ input: 1 }, { input: 1 });
    expect(directions()).toEqual(Array(4).fill('No change'));
    expect(deltas()).toEqual(['0 A', '0 A', '0.00V', '0 W']);
    expect(button('Restore reference settings').disabled).toBe(true);
    expect(panel().querySelector('.circuit-active-reference-insight')).toBeNull();
  });

  it('does not discard a small nonzero change just because displayed readings round alike', async () => {
    await mount({ input: 1 }, { input: 1 + 1e-10 });
    const base = cards()[0];
    expect(base.querySelector('[data-reference-reading=before] dd').textContent).toBe(base.querySelector('[data-reference-reading=after] dd').textContent);
    expect(directions()[0]).toBe('Increased'); expect(deltas()[0]).toContain('µA'); expect(deltas()[0]).not.toBe('0 A');
    expect(panel().textContent).toContain('before rounding');
  });

  it.each([[3.3, 4.5, 'Increased'], [4.5, 3.3, 'Decreased']])('explains saturation when base input moves from %s to %s', async (first, second, direction) => {
    await mount({ input: first }, { input: second });
    expect(directions()).toEqual([direction, 'No change', 'No change', 'No change']);
    expect(panel().querySelector('.circuit-active-reference-insight').textContent).toContain('Both readings are in saturation');
  });

  it.each([
    [{ input: 0 }, { input: .5 }],
    [{ input: 1 }, { input: 1.5 }],
    [{ input: 3.3 }, { input: 4.5, beta: 200 }],
    [{ input: 3.3 }, { project: 'light', light: 100 }]
  ])('does not claim a single saturation cause for unrelated comparisons', async (before, live) => {
    await mount(before, live); expect(panel().querySelector('.circuit-active-reference-insight')).toBeNull();
    expect(cards()).toHaveLength(4);
  });

  it('captures, restores, replaces and clears references while preserving notebook work', async () => {
    await mount(null, { input: 1 }); expect(cards()).toHaveLength(0);
    const observations = data._circuitActive.observations;
    await click(button('Keep current as reference')); const frozen = data._circuitActive.reference;
    expect(directions()).toEqual(Array(4).fill('No change'));
    await patch({ input: 1.5 }); await click(button('Restore reference settings'));
    expect(data._circuitActive.input).toBe(1); expect(data._circuitActive.reference).toBe(frozen);
    expect(data._circuitActive.undo.at(-1).input).toBe(1.5);
    await patch({ input: 2 }); await click(button('Replace reference'));
    expect(data._circuitActive.reference.design.input).toBe(2); expect(directions()).toEqual(Array(4).fill('No change'));
    await click(button('Clear reference')); expect(cards()).toHaveLength(0); expect(data._circuitActive.input).toBe(2);
    expect(data._circuitActive.observations).toBe(observations); expect(data._circuitActive.reflection).toBe('My explanation.');
    expect(data._circuitActive.investigationQuestion).toBe('What changes?');
  });

  it('localizes the added guidance, metric labels, rows and direction text', async () => {
    await mount({ input: 3.3 }, { input: 4.5 }, true);
    for (const el of panel().querySelectorAll('.circuit-active-reference-reading-guide h5, .circuit-active-reference-reading-guide p, .circuit-active-reference-metric h6, dt, .circuit-active-reference-direction, .circuit-active-reference-insight strong, .circuit-active-reference-insight p')) {
      expect(el.textContent.startsWith('Translated ')).toBe(true);
    }
    expect(cards()[0].querySelector('bdi').textContent).toBe('260 µA');
  });
});
