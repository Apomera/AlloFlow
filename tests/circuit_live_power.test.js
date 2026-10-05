import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Connect live circuit readings to lamp power', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const panel = (index = 0) => scope(index).querySelector('.circuit-active-live-readings');
  const guide = (index = 0) => panel(index).querySelector('details');
  const state = (index = 0) => stores[index].data._circuitActive;
  const readings = () => Object.fromEntries([...panel().querySelectorAll('[data-live-reading]')].map(el => [el.dataset.liveReading, el.querySelector('.circuit-live-value').textContent]));
  const factors = () => [...panel().querySelectorAll('[data-power-factor] dd')].map(el => el.textContent);
  const insight = () => panel().querySelector('.circuit-live-power-insight');
  const authored = value => JSON.stringify({ observations: value.observations, reflection: value.reflection, reference: value.reference, lessons: value.lessonRecords, red: value.probeRed, black: value.probeBlack });
  function seed(patch) { return { _circuit: { activeWorkbench: true }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', observations: [api.circuitActiveObservation({ input: .8 }, 'Saved note.')], reflection: 'My explanation.',
    reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'Guided writing.' } },
    probeRed: 'collector', probeBlack: 'emitter', undo: [], redo: [], ...patch
  } }; }
  function Harness({ initial, index, translated }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false) {
    await act(async () => root.render(React.createElement(React.Fragment, null, ...(second === undefined ? [patch] : [patch, second]).map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated }))))));
  }
  async function click(text) { const el = [...scope().querySelectorAll('button')].find(el => el.textContent === text); expect(el).toBeTruthy(); await act(async () => el.click()); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('shows the hand-calculated active readings and lamp power relationship', async () => {
    await mount(); expect(readings()).toEqual({ baseCurrent: '30.0 µA', collectorCurrent: '3.00 mA', collectorVoltage: '4.34V', loadPower: '1.98 mW' });
    expect(factors()).toEqual(['660.00 mV', '3.00 mA', '1.98 mW']); expect(insight().dataset.region).toBe('active');
    expect(insight().textContent).toContain('doubling lamp current would quadruple lamp power'); expect(insight().textContent).toContain('remains in the active region');
    expect(panel().querySelector('[data-live-reading=baseCurrent] .circuit-live-path').textContent).toBe('Input → RB → base');
  });

  it('shows zero power and explains the open lamp path in cutoff', async () => {
    await mount({ input: .3 }); expect(readings()).toEqual({ baseCurrent: '0 A', collectorCurrent: '0 A', collectorVoltage: '5.00V', loadPower: '0 W' });
    expect(factors()).toEqual(['0.00V', '0 A', '0 W']); expect(insight().dataset.region).toBe('cutoff'); expect(insight().textContent).toContain('no electrical power');
  });

  it('shows the saturated lamp power and explains the limit on further base drive', async () => {
    await mount({ input: 3.3 }); expect(readings()).toEqual({ baseCurrent: '260 µA', collectorCurrent: '21.82 mA', collectorVoltage: '200.00 mV', loadPower: '104.73 mW' });
    expect(factors()).toEqual(['4.80V', '21.82 mA', '104.73 mW']); expect(insight().dataset.region).toBe('saturated'); expect(insight().textContent).toContain('More base drive will not increase');
    await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 5 } })));
    expect(readings().baseCurrent).toBe('430 µA'); expect(readings().loadPower).toBe('104.73 mW');
  });

  it.each(['light', 'dark'])('uses the loaded %s sensor solution and identifies the base current path', async project => {
    await mount({ project, light: 50 }); expect(readings()).toEqual({ baseCurrent: '120 µA', collectorCurrent: '12.00 mA', collectorVoltage: '2.36V', loadPower: '31.68 mW' });
    expect(factors()).toEqual(['2.64V', '12.00 mA', '31.68 mW']); expect(panel().querySelector('[data-live-reading=baseCurrent] .circuit-live-path').textContent).toBe('Divider → RB → base');
  });

  it('retains a tiny positive lamp drop and power at the first representable input above cutoff', async () => {
    await mount({ input: .7000000000000001 }); const solved = api.solveActiveCircuit(state()); expect(solved.collectorCurrent).toBeGreaterThan(0); expect(solved.loadVoltage).toBe(0);
    expect(factors()[0]).not.toBe('0.00V'); expect(factors()[1]).not.toBe('0 A'); expect(factors()[2]).not.toBe('0 W'); expect(insight().dataset.region).toBe('active');
    expect(parseFloat(factors()[0])).toBeGreaterThan(0); expect(parseFloat(factors()[2])).toBeGreaterThan(0);
  });

  it('changes the power unit to watts for a higher-power setup', async () => {
    await mount({ supply: 12, input: 5, baseResistance: 1000, loadResistance: 100, beta: 300 });
    expect(readings().loadPower).toBe('1.392 W'); expect(factors()).toEqual(['11.80V', '118.00 mA', '1.392 W']);
  });

  it('updates the calculation after input changes and Undo while preserving the open guide and authored work', async () => {
    await mount(); const detail = guide(), saved = authored(state()); detail.open = true;
    await click('Input 3.3 V'); expect(factors()[2]).toBe('104.73 mW'); expect(insight().dataset.region).toBe('saturated'); expect(authored(state())).toBe(saved);
    await click('Undo active edit'); expect(factors()).toEqual(['660.00 mV', '3.00 mA', '1.98 mW']); expect(guide()).toBe(detail); expect(detail.open).toBe(true); expect(authored(state())).toBe(saved);
    await click('Redo active edit'); expect(factors()[2]).toBe('104.73 mW'); expect(authored(state())).toBe(saved);
  });

  it('keeps reading the guide local without writing data or adding a history step', async () => {
    await mount(); const prior = stores[0].data; expect(guide().open).toBe(false); await act(async () => guide().querySelector('summary').click());
    expect(stores[0].data).toBe(prior); expect(writes).not.toHaveBeenCalled(); expect(state().undo).toEqual([]);
  });

  it('keeps lamp power independent of voltmeter probe order', async () => {
    await mount(); const before = readings(), formula = factors(); await click('Reverse active probes');
    expect(readings()).toEqual(before); expect(factors()).toEqual(formula); expect(scope().querySelector('.circuit-active-meter output').textContent).toBe('-4.34V');
  });

  it('keeps formula descriptions and disclosure state local to each workbench', async () => {
    await mount({}, { input: 0 }); const groups = [panel(0), panel(1)].map(el => el.querySelector('[role=group]')), ids = groups.map(el => el.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(2); ids.forEach((id, index) => expect(panel(index).querySelector('[id="' + id + '"]').textContent).toContain('unrounded model values'));
    guide(0).open = true; expect(guide(1).open).toBe(false); expect(panel(1).querySelector('[data-live-reading=loadPower] strong').textContent).toBe('0 W');
  });

  it('localizes the new text and isolates numeric values from the surrounding text direction', async () => {
    await mount({}, undefined, true); panel().dir = 'rtl'; expect(panel().getAttribute('aria-label')).toBe('Translated Live circuit readings');
    for (const el of panel().querySelectorAll('dt,.circuit-live-path,summary,p')) expect(el.textContent.startsWith('Translated ')).toBe(true);
    for (const el of panel().querySelectorAll('.circuit-live-value bdi,[data-power-factor] dd bdi')) expect(el.dir).toBe('ltr');
    expect(panel().querySelector('.circuit-live-power-equation').dir).toBe('ltr'); expect(readings().loadPower).toBe('1.98 mW');
  });
});
