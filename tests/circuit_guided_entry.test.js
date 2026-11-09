import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));

const entryCases = [
  ['start', 'fresh', {}, 'Open guided experiment', 'Make a prediction, test a change, and explain the readings.', 0, false],
  ['predict', 'prediction', { lessonId: 'gain', lessonRecords: { gain: { choice: null, tested: false, explanation: 'An early draft.' } } }, 'Resume prediction', 'Choose what you expect the lamp current to do, then test the change.', 0, false],
  ['test', 'prediction', { lessonId: 'limit', lessonRecords: { limit: { choice: 'more', tested: false, explanation: 'A draft.' } } }, 'Continue to test', 'Your prediction is saved. Open the experiment to test the planned change.', 0, false],
  ['explain', 'result', { lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: ' \n\t' } } }, 'Review result and explain', 'The test readings are saved. Use them to support or revise your prediction.', 1, true],
  ['review', 'result', { lessonId: 'sensor', lessonRecords: { gain: { choice: 'less', tested: true, explanation: '' }, sensor: { choice: 'more', tested: true, explanation: 'Sensor evidence.' } } }, 'Review saved experiment', 'Your prediction, test readings, and explanation are saved. Review them or revise your explanation.', 2, true]
];


describe('Active guided entry and fixed experiment trace', () => {
  let host, root, config, api, latest, update, setLocale, frames, scrollOriginal, writes, awards;
  const entry = () => host.querySelector('.circuit-active-learning-entry');
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const trace = () => lab().querySelector('.circuit-active-lesson-trace');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  const target = tested => lab().querySelector(tested ? '[data-active-lesson-result]' : '[data-active-lesson-question]');
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  function traceRows() { return [...trace().querySelectorAll('[data-lesson-trace-metric]')].map(row => ({ key: row.dataset.lessonTraceMetric, before: row.querySelector('[data-stage="before"] strong').textContent, after: row.querySelector('[data-stage="after"] strong').textContent })); }
  async function mount(active = {}, initialMode = 'active') {
    const seed = {
      _circuit: { activeWorkbench: initialMode === 'active', pauseMotion: true, view: 'schematic', voltage: 7, components: [{ id: 50, type: 'resistor', value: 470 }], observations: [], undo: [] },
      _circuitActive: { ...api.circuitActiveDesign({ input: 2.4 }), view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, reflection: 'My independent evidence.', investigationTitle: 'Keep my investigation', observations: [api.circuitActiveObservation({ input: 1 }, 'Saved operating point')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...active },
      _circuitMixed: { reflection: 'Keep mixed work' }, _circuitNetwork: { reflection: 'Keep connected work' }
    };
    function Host() { const [state, setState] = React.useState(seed), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Host))); await flush();
  }
  beforeEach(() => {
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); writes = vi.fn(); awards = vi.fn();
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });










  it.each([
    ['gain', [['baseCurrent', '30.0 µA', '80.0 µA'], ['collectorCurrent', '3.00 mA', '8.00 mA'], ['collectorVoltage', '4.34V', '3.24V']]],
    ['limit', [['baseCurrent', '260 µA', '430 µA'], ['collectorCurrent', '21.82 mA', '21.82 mA'], ['collectorVoltage', '200.00 mV', '200.00 mV']]],
    // Independent loaded-divider calculation: Vj=(5/10k + .7/10k)/(1/10k+1/Rldr+1/10k).
    // At light 80 -> 20, Vj=.9530064644978481 -> 2.5319957158373843 V.
    ['sensor', [['baseCurrent', '25.3 µA', '183 µA'], ['collectorCurrent', '2.53 mA', '18.32 mA'], ['collectorVoltage', '4.44V', '969.61 mV'], ['driveVoltage', '953.01 mV', '2.53V']]]
  ])('shows independently calculated %s experiment readings, irrespective of the live circuit', async (id, expected) => {
    await mount({ project: 'light', supply: 12, input: 0, light: 0, loadResistance: 1000, lessonId: id, lessonRecords: { [id]: { choice: 'less', tested: true, explanation: 'Keep this' } } });
    expect(traceRows()).toEqual(expected.map(([key, before, after]) => ({ key, before, after })));
    expect(trace().querySelector('dl').getAttribute('aria-label')).toBe('Saved experiment measurements');
    const before = JSON.stringify(latest); trace().open = true; await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 5, light: 100, supply: 3 } }));
    expect(traceRows()).toEqual(expected.map(([key, before, after]) => ({ key, before, after }))); expect(latest._circuitActive.lessonRecords[id].explanation).toBe('Keep this'); expect(before).not.toBe(JSON.stringify(latest));
  });

  it('returns to the original fixed trace after switching experiments, retaining the wrong prediction and notes', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'I revised my claim.' }, limit: { choice: 'same', tested: true, explanation: 'Limit evidence.' } } });
    const gain = traceRows(), bench = api.circuitActiveDesign(latest._circuitActive), history = clone(latest._circuitActive.undo); await select('limit'); expect(traceRows()).not.toEqual(gain); await select('gain');
    expect(traceRows()).toEqual(gain); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(bench); expect(latest._circuitActive.undo).toEqual(history); expect(lab().querySelector('textarea').value).toBe('I revised my claim.');
    expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(awards).not.toHaveBeenCalled();
  });
});
