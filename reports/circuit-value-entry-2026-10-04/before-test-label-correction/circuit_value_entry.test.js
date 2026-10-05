import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Circuit exact-value entry and recovery', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const field = (label = 'Input voltage (V)', index = 0) => scope(index).querySelector('input[aria-label="' + label + ' exact value"]');
  const group = (label, index = 0) => field(label, index).closest('.circuit-active-range');
  const state = (index = 0) => stores[index].data._circuitActive;
  const active = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: { ...api.circuitActiveDesign({ input: 1 }), view: 'schematic',
    observations: [api.circuitActiveObservation({ input: .8 }, 'My note.')], reflection: 'My explanation.',
    reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: {}, undo: [], redo: [], ...patch } });
  const network = () => ({ _circuit: { networkWorkbench: true }, _circuitNetwork: { analysis: 'dc', selected: 1, duration: .01, components: [
    { id: 1, type: 'voltage', a: 'A', b: '0', value: 5, waveform: { shape: 'pulse', amplitude: 2, frequency: 100, duty: 50, edge: 5, phase: 0 } },
    { id: 2, type: 'resistor', a: 'A', b: '0', value: 1000 }
  ], reflection: 'Network notes.', undo: [], redo: [] } });
  function Harness({ initial, index, translated }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(options = {}) {
    const seeds = options.network ? [network()] : [active(options.patch || {}), ...(options.two ? [active({ input: 2 })] : [])];
    await act(async () => root.render(React.createElement(React.Fragment, null, ...seeds.map((initial, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial, index, translated: options.translated }))))));
  }
  async function type(value, label) { const el = field(label); await act(async () => { el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
  async function key(value, label) { await act(async () => field(label).dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }))); }
  async function blur(label) { await act(async () => field(label).blur()); }
  async function reset(label) { const button = group(label).querySelector('.circuit-control-reset'); expect(button).toBeTruthy(); await act(async () => button.click()); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('distinguishes an unapplied draft from the live value and describes both apply gestures', async () => {
    await mount(); await type('1.5');
    expect(group().dataset.editState).toBe('pending'); expect(group().querySelector('strong').textContent).toBe('1.00 V'); expect(state().input).toBe(1);
    expect(group().textContent).toContain('Typed value not applied yet.'); expect(group().textContent).toContain('Press Enter or leave the field to apply.');
    expect(field().getAttribute('aria-invalid')).toBe('false'); expect(writes).not.toHaveBeenCalled();
    const ids = field().getAttribute('aria-describedby').split(' '); expect(ids).toHaveLength(2); ids.forEach(id => expect(group().querySelector('[id="' + id + '"]')).toBeTruthy());
  });

  it.each(['Enter', 'blur'])('applies a valid decimal once on %s and synchronizes the graph control', async gesture => {
    await mount(); await type('1.537'); if (gesture === 'Enter') await key('Enter'); else await blur();
    expect(state().input).toBe(1.537); expect(state().undo).toHaveLength(1); expect(field('Graph input voltage (V)').value).toBe('1.537');
    expect(group().dataset.editState).toBe('current'); expect(group().querySelector('.circuit-active-input-pending')).toBeNull();
    await blur(); expect(state().undo).toHaveLength(1); expect(writes).toHaveBeenCalledTimes(1);
  });

  it.each(['', '9', '-1'])('keeps the circuit intact for invalid input %j and restores with a focused recovery button', async draft => {
    await mount(); const before = JSON.stringify(state()); await type(draft); await key('Enter');
    expect(group().dataset.editState).toBe('invalid'); expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(group().textContent).toContain('Value not applied. Enter a number from 0 to 5.'); expect(group().textContent).toContain('Current circuit value: 1.00 V');
    const button = group().querySelector('button'); expect(button.getAttribute('aria-controls')).toBe(field().id); expect(button.getAttribute('aria-label')).toBe('Restore current value for Input voltage (V)');
    expect(JSON.stringify(state())).toBe(before); await reset(); expect(field().value).toBe('1'); expect(document.activeElement).toBe(field());
    expect(field().getAttribute('aria-invalid')).toBe('false'); expect(group().dataset.editState).toBe('current'); expect(JSON.stringify(state())).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it('recovers with Escape from a valid draft and from a rejected value', async () => {
    await mount(); await type('1.5'); await key('Escape'); expect(field().value).toBe('1'); expect(state().input).toBe(1);
    await type('8'); await blur(); expect(group().dataset.editState).toBe('invalid'); field().focus(); await key('Escape');
    expect(group().dataset.editState).toBe('current'); expect(field().value).toBe('1'); expect(writes).not.toHaveBeenCalled();
  });

  it('clears a previous error while typing a correction and preserves saved evidence when it applies', async () => {
    await mount(); const notes = state().observations, reference = state().reference; await type('8'); await key('Enter'); await type('1.5');
    expect(group().dataset.editState).toBe('pending'); expect(group().querySelector('.circuit-control-recovery')).toBeNull(); await key('Enter');
    expect(state().observations).toBe(notes); expect(state().reference).toBe(reference); expect(state().reflection).toBe('My explanation.'); expect(state().undo).toHaveLength(1);
  });

  it('synchronizes drafts and validation after a live value is restored externally', async () => {
    await mount(); await type('8'); await key('Enter'); const el = field();
    await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 2 } })));
    expect(field()).toBe(el); expect(el.value).toBe('2'); expect(group().dataset.editState).toBe('current'); expect(document.activeElement).toBe(el);
  });

  it('keeps a draft while unrelated probe settings change', async () => {
    await mount(); await type('1.5'); await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, probeRed: 'base' } })));
    expect(field().value).toBe('1.5'); expect(group().dataset.editState).toBe('pending'); expect(state().input).toBe(1);
  });

  it('uses a slider edit to replace an invalid exact draft and clear its error', async () => {
    await mount(); await type('8'); await key('Enter'); const slider = group().querySelector('input[type=range]');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '2'); slider.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(state().input).toBe(2); expect(field().value).toBe('2'); expect(group().dataset.editState).toBe('current'); expect(state().undo).toHaveLength(1);
  });

  it('does not report equivalent numeric text as a pending change or add history for it', async () => {
    await mount(); await type('1.00'); expect(group().dataset.editState).toBe('current'); await key('Enter'); expect(field().value).toBe('1'); expect(writes).not.toHaveBeenCalled();
  });

  it('gives each workbench local labels, help and error targets', async () => {
    await mount({ two: true }); const ids = [...host.querySelectorAll('.circuit-active-range [id]')].map(el => el.id); expect(new Set(ids).size).toBe(ids.length);
    await type('8'); await key('Enter'); expect(group(undefined, 1).dataset.editState).toBe('current');
    for (const input of host.querySelectorAll('.circuit-active-range input')) for (const id of input.getAttribute('aria-describedby').split(' ')) expect(input.closest('.circuit-active-range').querySelector('[id="' + id + '"]')).toBeTruthy();
    expect(group().querySelector('label').control).toBe(group().querySelector('input[type=range]')); expect(state(1).input).toBe(2);
  });

  it('preserves logarithmic network entry and rejects out-of-range frequencies', async () => {
    await mount({ network: true }); const label = 'Frequency (Hz)'; await type('1e3', label); await key('Enter', label);
    expect(stores[0].data._circuitNetwork.components[0].waveform.frequency).toBe(1000); expect(field(label).value).toBe('1000'); expect(group(label).textContent).toContain('Logarithmic slider');
    const before = JSON.stringify(stores[0].data); await type('100001', label); await key('Enter', label); await reset(label);
    expect(field(label).value).toBe('1000'); expect(JSON.stringify(stores[0].data)).toBe(before);
  });

  it('refreshes a dynamic pulse-edge bound and clears a stale draft when pulse width changes', async () => {
    await mount({ network: true }); const label = 'Rise / fall (% of period)'; await type('30', label); await key('Enter', label); expect(group(label).textContent).toContain('0.01 to 25');
    await act(async () => stores[0].update(prev => ({ ...prev, _circuitNetwork: { ...prev._circuitNetwork, components: prev._circuitNetwork.components.map(p => p.id === 1 ? { ...p, waveform: { ...p.waveform, duty: 20 } } : p) } })));
    expect(field(label).max).toBe('10'); expect(field(label).value).toBe('5'); expect(group(label).dataset.editState).toBe('current'); await type('11', label); await key('Enter', label); expect(group(label).textContent).toContain('0.01 to 10');
  });

  it('accepts a valid negative network source voltage', async () => {
    await mount({ network: true }); const label = 'Source voltage (V)'; await type('-2.5', label); await key('Enter', label);
    expect(stores[0].data._circuitNetwork.components[0].value).toBe(-2.5); expect(group(label).dataset.editState).toBe('current');
  });
});
