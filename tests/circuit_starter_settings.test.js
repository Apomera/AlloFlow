import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Deliberate experiment starter settings', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const panel = (index = 0) => scope(index).querySelector('.circuit-active-starter');
  const restore = (index = 0) => panel(index).querySelector('.circuit-starter-restore');
  const status = (index = 0) => panel(index).querySelector('.circuit-starter-status');
  const state = (index = 0) => stores[index].data._circuitActive;
  const projectButton = (project, index = 0) => [...scope(index).querySelectorAll('.circuit-active-projects button')].find(el => el.querySelector('span').textContent === { manual: 'Manual control', light: 'Light sensor', dark: 'Dark sensor' }[project]);
  const button = text => [...scope().querySelectorAll('button')].find(el => el.textContent === text);
  const custom = project => ({ project, input: 1, light: 25, supply: 7, baseResistance: 15000, loadResistance: 330, dividerResistance: 20000, beta: 80 });
  const authored = value => JSON.stringify({ observations: value.observations, reflection: value.reflection, question: value.investigationQuestion, prediction: value.investigationPrediction, reference: value.reference, records: api.circuitActiveLessonRecords(value), red: value.probeRed, black: value.probeBlack, view: value.view });
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitNetwork: { reflection: 'Other workspace.' }, _circuitActive: {
    ...api.circuitActiveDesign(patch), view: 'schematic', probeRed: 'base', probeBlack: 'drive', observations: [api.circuitActiveObservation({ input: .8 }, 'Saved note.')],
    reflection: 'My explanation.', investigationQuestion: 'What changes?', investigationPrediction: 'More current.', reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) },
    lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'Keep this lesson.' } }, challenge: { id: 'limit', choice: 'same', tested: true }, undo: [], redo: [], ...patch
  } });
  function Harness({ initial, index, translated }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false) {
    await act(async () => root.render(React.createElement(React.Fragment, null, ...(second === undefined ? [patch] : [patch, second]).map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated }))))));
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each(['manual', 'light', 'dark'])('keeps a custom %s setup intact when its selected experiment is clicked again', async project => {
    await mount(custom(project)); const before = stores[0].data; expect(projectButton(project).getAttribute('aria-pressed')).toBe('true');
    await click(projectButton(project)); expect(stores[0].data).toBe(before); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['manual', 'light', 'dark'])('restores %s starter values as one reversible edit while preserving authored work', async project => {
    await mount(custom(project)); const before = api.circuitActiveDesign(state()), work = authored(state()), observations = state().observations, reference = state().reference;
    expect(status().textContent).toBe((project === 'manual' ? 5 : 6) + ' values changed from starter');
    await click(restore()); expect(api.circuitActiveDesign(state())).toEqual(api.circuitActiveDesign({ project })); expect(status().textContent).toBe('Using starter values');
    expect(restore().disabled).toBe(true); expect(state().undo).toEqual([before]); expect(state().redo).toEqual([]); expect(authored(state())).toBe(work);
    expect(state().observations).toBe(observations); expect(state().reference).toBe(reference); expect(state().lessonRecords.limit).toEqual({ choice: 'same', tested: true, explanation: '' });
    await click(restore()); expect(writes).toHaveBeenCalledTimes(1);
    await click(button('Undo active edit')); expect(api.circuitActiveDesign(state())).toEqual(before); expect(authored(state())).toBe(work); expect(restore().disabled).toBe(false);
    await click(button('Redo active edit')); expect(api.circuitActiveDesign(state())).toEqual(api.circuitActiveDesign({ project })); expect(authored(state())).toBe(work);
  });

  it.each(['manual', 'light', 'dark'])('ignores view, probes and inactive values when recognizing the %s starter', async project => {
    await mount({ project, ...(project === 'manual' ? { light: 17, dividerResistance: 15000 } : { input: .9 }) });
    expect(status().textContent).toBe('Using starter values'); expect(restore().disabled).toBe(true); expect(writes).not.toHaveBeenCalled();
  });

  it('switches experiments to their starters and lets undo restore the previous custom circuit', async () => {
    await mount(custom('manual')); const before = api.circuitActiveDesign(state()), work = authored(state());
    await click(projectButton('light')); expect(api.circuitActiveDesign(state())).toEqual(api.circuitActiveDesign({ project: 'light' })); expect(status().textContent).toBe('Using starter values');
    expect(state().undo).toEqual([before]); expect(authored(state())).toBe(work); expect(stores[0].data._circuitNetwork.reflection).toBe('Other workspace.');
    await click(button('Undo active edit')); expect(api.circuitActiveDesign(state())).toEqual(before); expect(projectButton('manual').getAttribute('aria-pressed')).toBe('true'); expect(authored(state())).toBe(work);
    await click(button('Redo active edit')); expect(state().project).toBe('light'); expect(authored(state())).toBe(work);
  });

  it('previews fixed manual and sensor defaults without using current custom values', async () => {
    await mount(custom('manual')); const preview = panel().querySelector('details'); preview.open = true;
    const values = () => Object.fromEntries([...panel().querySelectorAll('[data-starter-field]')].map(el => [el.dataset.starterField, el.querySelector('dd').textContent]));
    expect(values()).toEqual({ input: '3.30V', supply: '5.00V', baseResistance: '10 kΩ', loadResistance: '220 Ω', beta: '100' }); expect(writes).not.toHaveBeenCalled();
    await click(projectButton('dark')); expect(values()).toEqual({ light: '50 / 100', supply: '5.00V', baseResistance: '10 kΩ', loadResistance: '220 Ω', beta: '100', dividerResistance: '10 kΩ' });
    expect(panel().querySelector('details')).toBe(preview); expect(preview.open).toBe(true); for (const value of panel().querySelectorAll('dd bdi')) expect(value.dir).toBe('ltr');
  });

  it('updates singular and plural change counts after live edits and undo', async () => {
    await mount({ input: 1 }); expect(status().textContent).toBe('1 value changed from starter');
    await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 7 } })));
    expect(status().textContent).toBe('2 values changed from starter'); await click(restore()); expect(status().textContent).toBe('Using starter values');
    await click(button('Undo active edit')); expect(status().textContent).toBe('2 values changed from starter');
  });

  it('keeps the reset description and state local to each workbench', async () => {
    await mount(custom('manual'), custom('dark')); const other = stores[1].data;
    const ids = [restore(0), restore(1)].map(el => el.getAttribute('aria-describedby')); expect(new Set(ids).size).toBe(2);
    ids.forEach((id, index) => expect(panel(index).querySelector('[id="' + id + '"]')).toBeTruthy());
    await click(restore(0)); expect(stores[1].data).toBe(other); expect(restore(0).disabled).toBe(true); expect(restore(1).disabled).toBe(false);
  });

  it('localizes the added controls, status and preview labels', async () => {
    await mount({ input: 1 }, undefined, true); expect(panel().getAttribute('aria-label')).toBe('Translated Experiment starter settings');
    for (const el of panel().querySelectorAll('.circuit-starter-status,button,p,summary,dt')) expect(el.textContent.startsWith('Translated ')).toBe(true);
    expect(panel().querySelector('dd').textContent).toBe('3.30V');
  });
});
