import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Continue from a voltage drop to its meter reading and back', () => {
  let api, config, host, root, stores, writes, pending;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const meter = (index = 0) => scope(index).querySelector('.circuit-active-meter');
  const heading = (index = 0) => meter(index).querySelector('h4');
  const output = (index = 0) => meter(index).querySelector('output');
  const explorer = (index = 0) => scope(index).querySelector('.circuit-voltage-explorer');
  const action = (part, index = 0) => explorer(index).querySelector('.circuit-voltage-reading[data-voltage-part="' + part + '"] button');
  const back = (index = 0) => meter(index).querySelector('.circuit-meter-return button');
  const state = (index = 0) => stores[index].data._circuitActive;
  const saved = value => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['probeRed', 'probeBlack'].includes(key))));
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', probeRed: 'base', probeBlack: 'drive',
    observations: [api.circuitActiveObservation({ input: .8 }, 'My saved note.')], reflection: 'My explanation.', investigationQuestion: 'Where does the voltage go?', investigationPrediction: 'The two drops add up.',
    reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'My lesson.' } },
    undo: [api.circuitActiveDesign({ input: .9 })], redo: [api.circuitActiveDesign({ input: 2 })], ...patch
  } });
  function Harness({ initial, index, translated, deferred }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); if (deferred) pending[index].push(value); else update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false, deferred = false) {
    const values = second === undefined ? [patch] : [patch, second]; pending = values.map(() => []);
    await act(async () => root.render(React.createElement(React.Fragment, null, ...values.map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated, deferred }))))));
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => { el.focus(); el.click(); }); }
  const button = text => [...scope().querySelectorAll('button')].find(el => el.textContent === text);
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('offers a named meter destination and explains where the measurement buttons lead', async () => {
    await mount(); expect(back()).toBeNull(); expect(heading().tabIndex).toBe(-1);
    for (const part of ['lamp', 'transistor']) {
      expect(action(part).getAttribute('aria-controls')).toBe(meter().id);
      const id = action(part).getAttribute('aria-describedby'); expect(explorer().querySelector('[id="' + id + '"]').textContent).toBe('Measure a drop to bring its voltmeter reading into view.');
    }
    expect(writes).not.toHaveBeenCalled();
  });

  it.each([['lamp', 'supply', 'collector', '660.00 mV'], ['transistor', 'collector', 'emitter', '4.34V']])('focuses the updated %s measurement and preserves settings, history and saved work', async (part, red, black, voltage) => {
    await mount(); const before = saved(state()), seen = []; heading().scrollIntoView = vi.fn(); heading().addEventListener('focus', () => seen.push(output().textContent));
    await click(action(part)); expect([state().probeRed, state().probeBlack]).toEqual([red, black]); expect(output().textContent).toBe(voltage); expect(seen).toEqual([voltage]);
    expect(document.activeElement).toBe(heading()); expect(heading().scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' }); expect(saved(state())).toBe(before);
    expect(back().textContent).toBe('Back to ' + part + ' drop'); expect(back().getAttribute('aria-controls')).toBe(action(part).id); expect(action(part).getAttribute('aria-pressed')).toBe('true');
    const descriptions = heading().getAttribute('aria-describedby').split(' ').map(id => meter().querySelector('[id="' + id + '"]').textContent); expect(descriptions).toEqual(['Red − black', voltage]);
  });

  it.each(['lamp', 'transistor'])('returns to the exact %s control without another data write', async part => {
    await mount(); const target = action(part); target.scrollIntoView = vi.fn(); await click(target); const before = stores[0].data, count = writes.mock.calls.length;
    await click(back()); expect(document.activeElement).toBe(target); expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    expect(back()).toBeNull(); expect(stores[0].data).toBe(before); expect(writes).toHaveBeenCalledTimes(count); expect(target.getAttribute('aria-pressed')).toBe('true');
  });

  it.each([['lamp', 'supply', 'collector'], ['transistor', 'collector', 'emitter']])('reopens the already selected %s result on every request', async (part, probeRed, probeBlack) => {
    await mount({ probeRed, probeBlack }); const history = JSON.stringify({ undo: state().undo, redo: state().redo });
    for (let i = 0; i < 2; i++) { await click(action(part)); expect(document.activeElement).toBe(heading()); await click(back()); expect(document.activeElement).toBe(action(part)); }
    expect(JSON.stringify({ undo: state().undo, redo: state().redo })).toBe(history);
  });

  it('keeps focus on ordinary probe controls after the explicit measurement has completed', async () => {
    await mount(); await click(action('lamp')); heading().scrollIntoView = vi.fn(); const reverse = button('Reverse active probes'); await click(reverse);
    expect(document.activeElement).toBe(reverse); expect(output().textContent).toBe('-660.00 mV'); expect(heading().scrollIntoView).not.toHaveBeenCalled(); expect(action('lamp').getAttribute('aria-pressed')).toBe('false');
    await click(back()); expect(document.activeElement).toBe(action('lamp')); expect(output().textContent).toBe('-660.00 mV');
  });

  it('updates a live result without pulling focus away from an input or recording navigation in circuit data', async () => {
    await mount(); const keys = Object.keys(state()).sort(); await click(action('lamp')); heading().scrollIntoView = vi.fn();
    const field = scope().querySelector('input[aria-label="Input voltage (V) exact value"]'); field.focus();
    await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 1.5 } })));
    expect(output().textContent).toBe('1.76V'); expect(document.activeElement).toBe(field); expect(heading().scrollIntoView).not.toHaveBeenCalled(); expect(Object.keys(state()).sort()).toEqual(keys);
    await click(back()); expect(document.activeElement).toBe(action('lamp'));
  });

  it('keeps the return destination available after an experiment switch', async () => {
    await mount(); await click(action('transistor')); const target = action('transistor');
    await click([...scope().querySelectorAll('.circuit-active-projects button')].find(el => el.querySelector('span').textContent === 'Dark sensor'));
    expect(output().textContent).toBe('2.36V'); expect(action('transistor')).toBe(target); await click(back()); expect(document.activeElement).toBe(target); expect(state().observations[0].note).toBe('My saved note.');
  });

  it('returns to the most recently requested drop', async () => {
    await mount(); await click(action('lamp')); await click(action('transistor')); expect(back().textContent).toBe('Back to transistor drop');
    await click(back()); expect(document.activeElement).toBe(action('transistor'));
  });

  it('isolates targets, descriptions, return state and writes between workbenches', async () => {
    await mount({}, { input: 1.5 }); const first = stores[0].data, ids = [];
    for (let index = 0; index < 2; index++) { ids.push(meter(index).id, explorer(index).id, action('lamp', index).id, action('transistor', index).id, heading(index).id, output(index).id); expect(action('lamp', index).getAttribute('aria-controls')).toBe(meter(index).id); }
    expect(new Set(ids).size).toBe(ids.length); await click(action('lamp', 1)); expect(document.activeElement).toBe(heading(1)); expect(output(1).textContent).toBe('1.76V'); expect(back(0)).toBeNull(); expect(stores[0].data).toBe(first);
    await click(back(1)); expect(document.activeElement).toBe(action('lamp', 1)); expect(stores[0].data).toBe(first);
  });

  it('waits for deferred probe updates before focusing or describing the result', async () => {
    await mount({}, undefined, false, true); const seen = []; heading().addEventListener('focus', () => seen.push(output().textContent)); await click(action('lamp'));
    expect(document.activeElement).toBe(action('lamp')); expect(output().textContent).toBe('-300.00 mV'); expect(seen).toEqual([]);
    await act(async () => stores[0].update(pending[0].shift())); expect(output().textContent).toBe('660.00 mV'); expect(document.activeElement).toBe(heading()); expect(seen).toEqual(['660.00 mV']);
  });

  it('cancels a pending focus request when returning before a deferred update arrives', async () => {
    await mount({}, undefined, false, true); await click(action('lamp')); await click(back()); expect(document.activeElement).toBe(action('lamp'));
    await act(async () => stores[0].update(pending[0].shift())); expect(document.activeElement).toBe(action('lamp')); expect(output().textContent).toBe('660.00 mV'); expect(back()).toBeNull();
  });

  it('localizes the measurement help and return control', async () => {
    await mount({}, undefined, true); await click(action('lamp')); expect(explorer().querySelector('.circuit-voltage-measure-help').textContent).toBe('Translated Measure a drop to bring its voltmeter reading into view.');
    expect(back().textContent).toBe('Translated Back to lamp drop'); expect(meter().querySelector('.circuit-meter-return p').textContent).toBe('Translated Continue comparing the voltage drops.');
    expect(back().querySelector('bdi').dir).toBe('auto'); await click(back()); expect(document.activeElement).toBe(action('lamp'));
  });
});
