import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Interpret the live transistor voltmeter', () => {
  let api, config, host, root, stores, writes;
  const meter = (index = 0) => host.querySelectorAll('.circuit-active-meter')[index];
  const output = () => meter().querySelector('output');
  const values = () => [...meter().querySelectorAll('.circuit-active-meter-nodes bdi')].map(el => el.textContent);
  const meaning = () => meter().querySelector('.circuit-active-meter-meaning').textContent;
  const state = () => stores[0].data._circuitActive;
  const control = name => host.querySelector('select[aria-label="' + name + '"]');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  const untouched = value => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['probeRed', 'probeBlack'].includes(key))));
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', probeRed: 'collector', probeBlack: 'emitter',
    observations: [api.circuitActiveObservation({ input: .8 }, 'Keep my note.')], reflection: 'Keep my explanation.',
    reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: {},
    undo: [api.circuitActiveDesign({ input: .9 })], redo: [api.circuitActiveDesign({ input: 1.5 })], ...patch
  } });
  function Harness({ initial, index, translate }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translate ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translate = false) {
    await act(async () => root.render(React.createElement(React.Fragment, null, ...(second === undefined ? [patch] : [patch, second]).map((value, index) => React.createElement(Harness, { key: index, index, initial: seed(value), translate })))));
  }
  async function choose(name, value) { await act(async () => { const el = control(name); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
  async function click(text) { const el = button(text); expect(el).toBeTruthy(); await act(async () => el.click()); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('connects the positive voltage reading to both named probe potentials', async () => {
    await mount(); expect(meter().dataset.probePolarity).toBe('positive'); expect(output().textContent).toBe('4.34V');
    expect(values()).toEqual(['4.34V', '0.00V']); expect(meaning()).toContain('higher potential');
    expect(meter().textContent).toContain('C · collector'); expect(meter().textContent).toContain('E · common return');
    expect(meter().textContent).toContain('Red − black'); expect(meter().textContent).toContain('before rounding');
    expect(output().getAttribute('aria-label')).toBe('Active voltmeter reading');
    expect(meter().querySelector('[id="' + output().getAttribute('aria-describedby') + '"]').textContent).toBe(meaning());
    expect(writes).not.toHaveBeenCalled();
  });

  it('reverses the ordered values and sign without altering settings, history or saved work', async () => {
    await mount(); const before = untouched(state()); await click('Reverse active probes');
    expect(meter().dataset.probePolarity).toBe('negative'); expect(output().textContent).toBe('-4.34V'); expect(values()).toEqual(['0.00V', '4.34V']);
    expect(meaning()).toContain('minus sign describes the probe order'); expect(untouched(state())).toBe(before);
    await click('Reverse active probes'); expect(output().textContent).toBe('4.34V'); expect(untouched(state())).toBe(before);
  });

  it('explains same-node zero at a nonzero potential without calling either node ground', async () => {
    await mount({ probeRed: 'supply', probeBlack: 'supply' });
    expect(meter().dataset.probePolarity).toBe('same-node'); expect(output().textContent).toBe('0.00V'); expect(values()).toEqual(['5.00V', '5.00V']);
    expect(meaning()).toContain('voltage is subtracted from itself'); expect(meaning()).toContain('Choose a different node');
  });

  it('distinguishes equal potential on two different nodes from same-node zero', async () => {
    await mount({ input: 0, probeRed: 'supply', probeBlack: 'collector' });
    expect(meter().dataset.probePolarity).toBe('equal-potential'); expect(values()).toEqual(['5.00V', '5.00V']); expect(output().textContent).toBe('0.00V');
    expect(meaning()).toContain('does not mean both nodes are at common return');
    await choose('Black probe', 'supply'); expect(meter().dataset.probePolarity).toBe('same-node');
  });

  it('keeps a tiny nonzero difference distinct from equal potential despite rounded node values', async () => {
    await mount({ input: .70000000001, probeRed: 'drive', probeBlack: 'base' });
    expect(values()[0]).toBe(values()[1]); expect(meter().dataset.probePolarity).toBe('positive'); expect(output().textContent).not.toBe('0.00V');
    await click('Reverse active probes'); expect(meter().dataset.probePolarity).toBe('negative'); expect(output().textContent).toMatch(/^-/);
  });

  it.each(['manual', 'light', 'dark'])('names the input node correctly in the %s circuit', async project => {
    await mount({ project, probeRed: 'drive', probeBlack: 'base' });
    expect(meter().querySelector('.circuit-active-meter-node').textContent).toBe(project === 'manual' ? 'VIN · input' : 'D · divider junction');
    const solved = api.solveActiveCircuit(state()), shown = api.circuitActiveProbe(solved, 'drive', 'base');
    expect(shown.voltage).toBeGreaterThan(0); expect(meter().dataset.probePolarity).toBe('positive'); expect(writes).not.toHaveBeenCalled();
  });

  it('marks only an exact ordered shortcut selected and follows custom menus and the voltage explorer', async () => {
    await mount(); const before = untouched(state()); const selected = () => ['Transistor', 'Base resistor', 'Supply'].filter(name => button(name).getAttribute('aria-pressed') === 'true');
    expect(selected()).toEqual(['Transistor']); await click('Base resistor'); expect(selected()).toEqual(['Base resistor']); expect(output().textContent).toBe('300.00 mV');
    await click('Reverse active probes'); expect(selected()).toEqual([]); expect(output().textContent).toBe('-300.00 mV');
    await click('Supply'); expect(selected()).toEqual(['Supply']); await choose('Black probe', 'base'); expect(selected()).toEqual([]);
    await click('Measure lamp drop'); expect(selected()).toEqual([]); expect(output().textContent).toBe('660.00 mV');
    await click('Measure transistor drop'); expect(selected()).toEqual(['Transistor']); expect(untouched(state())).toBe(before);
  });

  it('updates meaning when circuit changes make two selected nodes equal, keeping the pair and focus', async () => {
    await mount({ probeRed: 'supply', probeBlack: 'collector' }); const field = control('Red probe'); field.focus();
    await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 0 } })));
    expect(meter().dataset.probePolarity).toBe('equal-potential'); expect(document.activeElement).toBe(field);
    expect([state().probeRed, state().probeBlack]).toEqual(['supply', 'collector']);
    await click('3D experiment board'); expect(meter().dataset.probePolarity).toBe('equal-potential');
    await click('NPN schematic'); expect(meter().dataset.probePolarity).toBe('equal-potential');
  });

  it('uses the normalized probe fallback for unsupported stored nodes', async () => {
    await mount({ probeRed: 'missing', probeBlack: null }); expect(output().textContent).toBe('4.34V'); expect(values()).toEqual(['4.34V', '0.00V']);
    expect(meter().dataset.probePolarity).toBe('positive'); expect(writes).not.toHaveBeenCalled();
  });

  it('keeps readout references local to each instance and numeric direction isolated', async () => {
    await mount({}, { probeRed: 'emitter', probeBlack: 'collector' });
    const ids = [...host.querySelectorAll('.circuit-active-meter [id]')].map(el => el.id); expect(new Set(ids).size).toBe(ids.length);
    for (const el of host.querySelectorAll('.circuit-active-meter')) {
      expect(el.querySelector('[id="' + el.getAttribute('aria-labelledby') + '"]')).toBeTruthy();
      expect(el.querySelector('[id="' + el.querySelector('output').getAttribute('aria-describedby') + '"]')).toBeTruthy();
      expect(el.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(3);
    }
    expect(meter(0).dataset.probePolarity).toBe('positive'); expect(meter(1).dataset.probePolarity).toBe('negative');
  });

  it('localizes readout labels and explanations without translating numbers', async () => {
    await mount({}, undefined, true);
    for (const el of meter().querySelectorAll('h4,.circuit-active-meter-order,.circuit-active-meter-polarity,.circuit-active-meter-node,.circuit-active-meter-reference,.circuit-active-meter-meaning')) expect(el.textContent.startsWith('Translated ')).toBe(true);
    expect(output().getAttribute('aria-label')).toBe('Translated Active voltmeter reading'); expect(values()).toEqual(['4.34V', '0.00V']);
  });
});
