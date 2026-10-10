import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('Explore all node potentials and assign either probe', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const explorer = (index = 0) => scope(index).querySelector('.circuit-node-explorer');
  const row = (node, index = 0) => explorer(index).querySelector('[data-circuit-node="' + node + '"]');
  const action = (node, lead, index = 0) => row(node, index).querySelector('button[data-lead="' + lead + '"]');
  const state = (index = 0) => stores[index].data._circuitActive;
  const values = (index = 0) => [...explorer(index).querySelectorAll('.circuit-node-explorer-voltage')].map(el => el.textContent);
  const output = (index = 0) => scope(index).querySelector('.circuit-active-meter output');
  const protectedState = value => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['probeRed', 'probeBlack'].includes(key))));
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: { ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', probeRed: 'collector', probeBlack: 'emitter', placeLead: 'black', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep my note.')], reflection: 'My explanation.', reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: {}, undo: [api.circuitActiveDesign({ input: .9 })], redo: [api.circuitActiveDesign({ input: 2 })], ...patch } });
  function Harness({ initial, index, translated }) { const [data, update] = React.useState(initial); stores[index] = { data, update }; return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback })); }
  async function mount(patch = {}, second, translated = false) { await act(async () => root.render(React.createElement(React.Fragment, null, ...(second === undefined ? [patch] : [patch, second]).map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated })))))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => { el.focus(); el.click(); }); }
  async function choose(lead, value) { await act(async () => { const el = scope().querySelector('select[aria-label="' + lead + ' probe"]'); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
  async function patch(value) { await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); }
  const button = text => [...scope().querySelectorAll('button')].find(el => el.textContent === text);
  beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn(); vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('starts collapsed and presents all five manual node potentials without writing circuit state', async () => {
    await mount(); expect(explorer().open).toBe(false); expect(values()).toEqual(['5.00V', '1.00V', '700.00 mV', '4.34V', '0.00V']); expect(row('drive').textContent).toContain('VIN · input'); expect(row('drive').textContent).toContain('Input source, before RB.');
    await click(explorer().querySelector('summary')); expect(explorer().open).toBe(true); expect(writes).not.toHaveBeenCalled(); expect(explorer().textContent).toContain('relative to E · common return');
  });
  it.each(['light', 'dark'])('shows the loaded %s divider potential rather than its unloaded voltage', async project => {
    await mount({ project, light: 50 }); expect(values()).toEqual(['5.00V', '1.90V', '700.00 mV', '2.36V', '0.00V']); expect(row('drive').textContent).toContain('D · divider junction'); expect(row('drive').textContent).toContain('Loaded divider junction, before RB.'); expect(values()).not.toContain('2.50V');
  });
  it('keeps equal-potential nodes distinct at cutoff', async () => { await mount({ input: 0 }); expect(values()).toEqual(['5.00V', '0.00V', '0.00V', '5.00V', '0.00V']); await click(action('supply', 'red')); await click(action('collector', 'black')); expect(output().textContent).toBe('0.00V'); expect(scope().querySelector('.circuit-active-meter').dataset.probePolarity).toBe('equal-potential'); });
  it.each([['red', 'supply', '5.00V'], ['black', 'base', '3.64V']])('places the %s probe explicitly and preserves settings, history, notes and the selected board lead', async (lead, node, voltage) => {
    await mount(); await click(explorer().querySelector('summary')); const before = protectedState(state()), target = action(node, lead); await click(target);
    expect(state()[lead === 'red' ? 'probeRed' : 'probeBlack']).toBe(node); expect(output().textContent).toBe(voltage); expect(protectedState(state())).toBe(before); expect(document.activeElement).toBe(target); expect(explorer().open).toBe(true);
    expect(target.getAttribute('aria-pressed')).toBe('true'); expect(scope().querySelector('select[aria-label="' + (lead === 'red' ? 'Red' : 'Black') + ' probe"]').value).toBe(node);
    expect([...explorer().querySelectorAll('button[data-lead="' + lead + '"][aria-pressed=true]')]).toHaveLength(1);
  });
  it('can place both leads at one node and reflects the same-node zero correctly', async () => { await mount(); await click(action('base', 'red')); await click(action('base', 'black')); expect(action('base', 'red').getAttribute('aria-pressed')).toBe('true'); expect(action('base', 'black').getAttribute('aria-pressed')).toBe('true'); expect(output().textContent).toBe('0.00V'); expect(scope().querySelector('.circuit-active-meter').dataset.probePolarity).toBe('same-node'); });
  it('does not write or disturb redo when a probe is already at the chosen node', async () => { await mount(); const before = stores[0].data; await click(action('collector', 'red')); await click(action('emitter', 'black')); expect(stores[0].data).toBe(before); expect(writes).not.toHaveBeenCalled(); });
  it('follows menu selection and probe reversal while keeping the node potentials fixed', async () => { await mount(); const before = values(); await choose('Red', 'drive'); await choose('Black', 'base'); expect(action('drive', 'red').getAttribute('aria-pressed')).toBe('true'); expect(action('base', 'black').getAttribute('aria-pressed')).toBe('true'); await click(button('Reverse active probes')); expect(action('base', 'red').getAttribute('aria-pressed')).toBe('true'); expect(action('drive', 'black').getAttribute('aria-pressed')).toBe('true'); expect(values()).toEqual(before); expect(output().textContent).toBe('-300.00 mV'); });
  it('follows a diagram placement and retains the existing node face and probe marks', async () => { await mount(); const node = scope().querySelector('.circuit-active-node[aria-label="Place black probe on B · base"]'); await click(node); expect(action('base', 'black').getAttribute('aria-pressed')).toBe('true'); expect(node.querySelector('.circuit-active-node-face').textContent).toBe('B'); expect(node.querySelector('small').textContent).toBe('K'); expect(document.activeElement).toBe(node); });
  it('updates live values without remounting the open explorer or moving focus', async () => { await mount(); await click(explorer().querySelector('summary')); const target = action('base', 'red'); await click(target); const original = explorer(); await patch({ input: 1.5 }); expect(explorer()).toBe(original); expect(explorer().open).toBe(true); expect(document.activeElement).toBe(target); expect(values()).toEqual(['5.00V', '1.50V', '700.00 mV', '3.24V', '0.00V']); });
  it('preserves tiny nonzero meter differences when rounded node potentials look equal', async () => { await mount({ input: .70000000001 }); await click(action('drive', 'red')); await click(action('base', 'black')); expect(values()[1]).toBe(values()[2]); expect(output().textContent).not.toBe('0.00V'); expect(scope().querySelector('.circuit-active-meter').dataset.probePolarity).toBe('positive'); });
  it('records the assigned probe order with an operating point', async () => { await mount(); await click(action('supply', 'red')); await click(action('base', 'black')); await click(button('Record operating point')); const observation = state().observations.at(-1); expect(observation.probeRed).toBe('supply'); expect(observation.probeBlack).toBe('base'); expect(state().observations[0].note).toBe('Keep my note.'); expect(state().reflection).toBe('My explanation.'); });
  it('keeps accessible reading and meter references local to each instance', async () => {
    await mount({}, { input: 2 }); const ids = []; for (let index = 0; index < 2; index++) for (const el of explorer(index).querySelectorAll('button')) { const readingId = el.getAttribute('aria-describedby'); expect(explorer(index).querySelector('[id="' + readingId + '"]')).toBeTruthy(); expect(el.getAttribute('aria-controls')).toBe(scope(index).querySelector('.circuit-active-meter').id); ids.push(readingId); }
    expect(new Set(ids).size).toBe(10); const first = stores[0].data; await click(action('base', 'black', 1)); expect(stores[0].data).toBe(first); expect(output(1).textContent).toBe('1.44V');
  });
  it('localizes names, roles, actions and help while isolating numeric text', async () => { await mount({}, undefined, true); expect(explorer().querySelector('summary').textContent).toBe('Translated Explore node voltages'); expect(row('base').querySelector('h5').textContent).toBe('Translated B · base'); expect(action('base', 'red').getAttribute('aria-label')).toBe('Translated Place Translated Red probe at Translated B · base'); expect(row('base').querySelector('strong bdi').dir).toBe('ltr'); expect(explorer().querySelector('summary bdi').dir).toBe('auto'); });
});
