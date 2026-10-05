import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Preview and continue operating-region exploration', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const explorer = (index = 0) => scope(index).querySelector('.circuit-active-regions');
  const card = (id, index = 0) => explorer(index).querySelector('[data-region="' + id + '"].circuit-region-card');
  const tuning = (index = 0) => scope(index).querySelector('.circuit-active-component-tuning');
  const heading = (index = 0) => explorer(index).querySelector('h4');
  const state = (index = 0) => stores[index].data._circuitActive;
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: { ...api.circuitActiveDesign({ input: 1 }), view: 'schematic',
    probeRed: 'base', probeBlack: 'drive', observations: [api.circuitActiveObservation({ input: .8 }, 'My note.')], reflection: 'My explanation.',
    reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: {}, undo: [], redo: [], ...patch } });
  function Harness({ initial, index, translated }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false) {
    await act(async () => root.render(React.createElement(React.Fragment, null, ...(second === undefined ? [patch] : [patch, second]).map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated }))))));
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
  async function exact(label, value) {
    const field = scope().querySelector('input[aria-label="' + label + ' exact value"]');
    await act(async () => { field.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, String(value)); field.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each(['manual', 'light', 'dark'])('previews every available %s example and applies its calculated input without altering other settings', async project => {
    await mount({ project }); const before = api.circuitActiveDesign(state()), map = api.circuitActiveRegions(state()), saved = state().observations;
    expect(explorer().textContent).toContain('Example values are rounded');
    expect(explorer().querySelectorAll('.circuit-region-balance strong bdi[dir="ltr"]')).toHaveLength(3);
    for (const value of explorer().querySelectorAll('.circuit-region-boundaries dd')) if (value.textContent.startsWith('≈')) expect(value.querySelector('bdi').dir).toBe('ltr');
    for (const region of map.regions.filter(region => region.available)) {
      const target = card(region.id), example = target.querySelector('.circuit-region-example'), button = target.querySelector('button');
      expect(example.textContent).toContain(project === 'manual' ? 'Example input' : 'Example light level');
      expect(example.querySelector('bdi').textContent).toBe('≈ ' + Number(region.example.toPrecision(6)) + (project === 'manual' ? ' V' : ' / 100'));
      expect(button.getAttribute('aria-describedby')).toBe(example.id); expect(example.querySelector('bdi').dir).toBe('ltr');
      await click(button); expect(state()[map.key]).toBe(region.example); expect(api.solveActiveCircuit(state()).region).toBe(region.id);
      expect(explorer().querySelectorAll('.circuit-region-current')).toHaveLength(1); expect(card(region.id).textContent).toContain('Current region');
      expect(api.circuitActiveDesign(state())).toEqual({ ...before, [map.key]: region.example }); expect(state().observations).toBe(saved);
    }
  });

  it('applies the full-precision example even when an active interval is narrower than a plot sample', async () => {
    await mount({ supply: 3, baseResistance: 1000, loadResistance: 2000, beta: 300 });
    const active = api.circuitActiveRegions(state()).regions.find(region => region.id === 'active'); expect(active.example).not.toBe(Number(active.example.toPrecision(6)));
    await click(card('active').querySelector('button')); expect(state().input).toBe(active.example); expect(api.solveActiveCircuit(state()).region).toBe('active');
  });

  it('previews and reaches a region available only at the upper endpoint', async () => {
    await mount({ supply: 10.2, baseResistance: 4300, loadResistance: 100, beta: 100 });
    expect(card('saturated').querySelector('.circuit-region-example').textContent).toContain('≈ 5 V');
    await click(card('saturated').querySelector('button')); expect(state().input).toBe(5); expect(api.solveActiveCircuit(state()).region).toBe('saturated');
  });

  it('opens and focuses component tuning from an unavailable region without writing any tool state', async () => {
    await mount({ baseResistance: 100000, beta: 20, loadResistance: 100 }); const before = stores[0].data, action = card('saturated').querySelector('.circuit-region-tune');
    expect(card('saturated').querySelector('button').disabled).toBe(true); expect(card('saturated').querySelector('.circuit-region-example')).toBeNull();
    expect(tuning().open).toBe(false); expect(action.getAttribute('aria-controls')).toBe(tuning().id);
    expect(action.getAttribute('aria-label')).toBe('Adjust components to explore saturation');
    await click(action); expect(tuning().open).toBe(true); expect(document.activeElement).toBe(tuning().querySelector('summary')); expect(stores[0].data).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('returns to the same region heading while retaining open component settings and saved work', async () => {
    await mount({ baseResistance: 100000, beta: 20, loadResistance: 100 }); await click(card('saturated').querySelector('.circuit-region-tune'));
    const before = JSON.stringify(state()), target = heading(), action = tuning().querySelector('.circuit-region-return button');
    expect(action.getAttribute('aria-controls')).toBe(target.id); await click(action);
    expect(document.activeElement).toBe(target); expect(target.tabIndex).toBe(-1); expect(tuning().open).toBe(true); expect(JSON.stringify(state())).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('recalculates availability after one component edit and returns to an actionable region', async () => {
    await mount({ baseResistance: 100000, beta: 20, loadResistance: 100 }); const notes = state().observations, reference = state().reference;
    await click(card('saturated').querySelector('.circuit-region-tune')); await exact('Base resistance (Ω)', 1000);
    expect(card('saturated').querySelector('button').disabled).toBe(false); expect(card('saturated').querySelector('.circuit-region-tune')).toBeNull(); expect(state().undo).toHaveLength(1);
    await click(tuning().querySelector('.circuit-region-return button')); expect(document.activeElement).toBe(heading());
    await click(card('saturated').querySelector('button')); expect(api.solveActiveCircuit(state()).region).toBe('saturated'); expect(state().undo).toHaveLength(2);
    expect(state().observations).toBe(notes); expect(state().reference).toBe(reference); expect(state().reflection).toBe('My explanation.'); expect(state().probeRed).toBe('base');
  });

  it('connects each unavailable region to its own reason in multiple workbenches', async () => {
    const allSaturated = { project: 'light', supply: 3, baseResistance: 1000, loadResistance: 2000, beta: 300, dividerResistance: 100000 };
    await mount(allSaturated, allSaturated); const ids = [...host.querySelectorAll('.circuit-active-regions [id],.circuit-active-component-tuning[id]')].map(el => el.id); expect(new Set(ids).size).toBe(ids.length);
    for (let index = 0; index < 2; index++) for (const id of ['cutoff', 'active']) {
      const target = card(id, index), reason = target.querySelector('.circuit-region-unavailable');
      expect(target.querySelector('button').getAttribute('aria-describedby')).toBe(reason.id); expect(target.querySelector('.circuit-region-tune').getAttribute('aria-describedby')).toBe(reason.id);
    }
    await click(card('cutoff', 1).querySelector('.circuit-region-tune')); expect(tuning(1).open).toBe(true); expect(tuning(0).open).toBe(false); expect(document.activeElement).toBe(tuning(1).querySelector('summary'));
    await click(tuning(1).querySelector('.circuit-region-return button')); expect(document.activeElement).toBe(heading(1)); expect(writes).not.toHaveBeenCalled();
  });

  it('keeps the component disclosure and focus target stable as circuit settings change', async () => {
    await mount({ baseResistance: 100000, beta: 20, loadResistance: 100 }); await click(card('saturated').querySelector('.circuit-region-tune')); const disclosure = tuning(), target = heading();
    await exact('Base resistance (Ω)', 1000); expect(tuning()).toBe(disclosure); expect(heading()).toBe(target); expect(disclosure.open).toBe(true);
  });

  it('routes the new explanatory text and navigation labels through translations', async () => {
    await mount({ baseResistance: 100000, beta: 20, loadResistance: 100 }, undefined, true);
    expect(explorer().textContent).toContain('Translated Example values are rounded'); expect(explorer().querySelector('.circuit-region-current').textContent).toBe('Translated Current region');
    expect(card('active').querySelector('.circuit-region-example').textContent).toContain('Translated Example input');
    expect(card('saturated').querySelector('.circuit-region-tune').textContent).toBe('Translated Adjust components');
    expect(tuning().querySelector('.circuit-region-return button').textContent).toBe('Translated Explore operating regions');
  });
});
