import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));

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
    ['fresh', {}, 'Open guided experiment', 0],
    ['prediction', { lessonId: 'limit', lessonRecords: { limit: { choice: 'more', tested: false, explanation: 'A draft.' } } }, 'Resume prediction', 0],
    ['result', { lessonId: 'sensor', lessonRecords: { gain: { choice: 'less', tested: true, explanation: '' }, sensor: { choice: 'more', tested: true, explanation: 'Sensor evidence.' } } }, 'Review saved result', 2]
  ])('shows the %s entry without automatic focus, scrolling, or tool-data writes', async (phase, state, label, count) => {
    await mount(state);
    expect(entry().dataset.entryPhase).toBe(phase); expect(entry().querySelector('button').textContent).toBe(label);
    expect(entry().querySelector('.circuit-learning-entry-count').textContent).toContain(String(count) + ' of 3');
    expect(entry().querySelector('[role="status"],[aria-live]')).toBeNull();
    expect(host.contains(document.activeElement)).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled();
  });

  it.each([false, true])('explicit entry focuses the saved step repeatedly without changing any work (tested=%s)', async tested => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested, explanation: 'Saved work' } } });
    const snapshot = JSON.stringify(latest), same = latest;
    await click(entry().querySelector('button')); expect(document.activeElement).toBe(target(tested));
    const reflection = host.querySelector('.circuit-notebook-reflection'); reflection.focus();
    await click(entry().querySelector('button')); expect(document.activeElement).toBe(target(tested));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' }); expect(JSON.stringify(latest)).toBe(snapshot); expect(latest).toBe(same); expect(writes).not.toHaveBeenCalled();
  });

  it('opens an unstarted experiment at its question without silently loading its baseline', async () => {
    await mount(); const before = JSON.stringify(latest);
    await click(button('Open guided experiment')); expect(document.activeElement).toBe(target(false));
    expect(JSON.stringify(latest)).toBe(before); expect(latest._circuitActive.input).toBe(2.4); expect(button('Start transistor prediction')).toBeTruthy(); expect(trace()).toBeNull();
  });

  it.each([
    [{ lessonId: 'unrecognized', challenge: { id: 'limit', choice: 'same', tested: true } }, 'gain', 'Open guided experiment', false],
    [{ challenge: { id: 'limit', choice: 'same', tested: true } }, 'limit', 'Review saved result', true],
    [{ lessonId: 'sensor', lessonRecords: { sensor: { choice: null, tested: true, explanation: '' } } }, 'sensor', 'Resume prediction', false]
  ])('keeps fallback, legacy, and invalid-record navigation aligned with the existing lab (%j)', async (state, id, label, tested) => {
    await mount(state); const before = JSON.stringify(latest);
    expect(entry().dataset.lessonId).toBe(id); expect(lab().querySelector('select').value).toBe(id); await click(button(label));
    expect(document.activeElement).toBe(target(tested)); expect(JSON.stringify(latest)).toBe(before);
  });

  it('does not reuse a consumed navigation request on live edits, locale rerenders, or record replacement', async () => {
    await mount(); await click(button('Open guided experiment'));
    const reflection = host.querySelector('.circuit-notebook-reflection'); reflection.focus(); Element.prototype.scrollIntoView.mockClear();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 4, lessonId: 'limit', lessonRecords: { limit: { choice: 'same', tested: true, explanation: 'Loaded evidence' } } } }));
    expect(document.activeElement).toBe(reflection); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    const before = JSON.stringify(latest); await act(async () => setLocale('Translated: ')); await flush();
    expect(document.activeElement).toBe(reflection); expect(JSON.stringify(latest)).toBe(before); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(entry().querySelector('button').textContent).toBe('Translated: Review saved result');
  });

  it('a file load and restore after entry navigation do not jump to the imported or restored lesson', async () => {
    await mount(); await click(button('Open guided experiment'));
    const original = clone(latest._circuitActive), imported = api.circuitActiveInvestigation({ input: 4, lessonId: 'sensor', lessonRecords: { sensor: { choice: 'less', tested: true, explanation: 'Imported evidence' } } });
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'lesson.json', size: 1024, text: () => Promise.resolve(JSON.stringify(imported)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush();
    const load = button('Load investigation'); load.focus(); Element.prototype.scrollIntoView.mockClear(); await click(load);
    expect(latest._circuitActive.lessonId).toBe('sensor'); expect(document.activeElement).not.toBe(target(true)); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await click(button('Restore previous investigation')); expect(latest._circuitActive.lessonRecords).toEqual(original.lessonRecords);
    expect(document.activeElement).not.toBe(target(false)); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('ordinary lesson selection focuses once and does not replay the earlier entry request on explanation edits', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'Gain' }, limit: { choice: 'same', tested: true, explanation: 'Limit' } } });
    await click(button('Review saved result')); await select('limit'); expect(document.activeElement).toBe(target(true));
    const field = lab().querySelector('textarea'); field.focus(); Element.prototype.scrollIntoView.mockClear();
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'Edited explanation'); field.dispatchEvent(new Event('input', { bubbles: true })); }); await flush();
    expect(document.activeElement).toBe(field); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(entry().dataset.lessonId).toBe('limit');
  });

  it('returns through the real workbench switch without automatically replaying navigation or losing work', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep result' } } });
    await click(button('Review saved result')); const active = clone(latest._circuitActive), other = clone(latest._circuitNetwork);
    const buttons = () => [...host.querySelectorAll('.circuit-workspace-switch button')];
    await click(buttons()[1]); Element.prototype.scrollIntoView.mockClear(); await click(buttons()[2]);
    expect(latest._circuitActive).toEqual(active); expect(latest._circuitNetwork).toEqual(other); expect(document.activeElement).not.toBe(target(true)); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('never previews the solved trace before a prediction is tested', async () => {
    await mount(); expect(trace()).toBeNull(); await click(button('Start transistor prediction')); expect(trace()).toBeNull();
    await click(button('Decreases')); expect(trace()).toBeNull(); await click(button('Test transistor prediction'));
    expect(trace()).toBeTruthy(); expect(trace().open).toBe(false); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases');
  });

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
