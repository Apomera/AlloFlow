import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const ids = ['gain', 'limit', 'sensor'];
const titles = { gain: 'Small input, larger current', limit: 'Find the limit', sensor: 'Make a night light' };
const plans = [
  { id: 'gain', project: 'manual', change: { key: 'input', before: 1, after: 1.5 } },
  { id: 'limit', project: 'manual', change: { key: 'input', before: 3.3, after: 5 } },
  { id: 'sensor', project: 'dark', change: { key: 'light', before: 80, after: 20 } }
];
const saved = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const phaseLabels = { start: 'Not started', predict: 'Prediction needed', test: 'Prediction saved', explain: 'Result saved \u00b7 explanation needed', review: 'Explanation saved' };
const actionLabels = { start: 'Open experiment', predict: 'Resume prediction', test: 'Continue to test', explain: 'Review result and explain', review: 'Review saved experiment' };
let api, config;
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
const seed = () => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), view: 'schematic', probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep this observation.')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook.', investigationTitle: 'A tuned circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })] });
const protectedWork = state => clone({ design: api.circuitActiveDesign(state), undo: state.undo, redo: state.redo, view: state.view, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack });

describe('Lesson continuation and deliberate retry', () => {
  let host, root, latest, update, setLocale, frames, scrollOriginal, writes, awards;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const continuation = () => lab().querySelector('.circuit-active-lesson-continuation');
  const nextButton = () => continuation().querySelector('.circuit-continuation-action:not(.circuit-continuation-review-map):not(.circuit-continuation-plan-investigation)');
  const reviewMap = () => continuation().querySelector('.circuit-continuation-review-map');
  const map = () => lab().querySelector('details.circuit-active-lesson-map');
  const retry = () => lab().querySelector('details.circuit-active-lesson-retry');
  const field = () => lab().querySelector('textarea');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  const allSaved = () => ({ gain: saved('less', true, ''), limit: saved('same', true, ' '), sensor: saved('more', true, 'Sensor evidence') });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function toggle(el, open) { await act(async () => { el.open = open; el.dispatchEvent(new Event('toggle')); }); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function mount(active = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: { ...seed(), notebookOpen: true, lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'Keep gain evidence.') }, ...active }, _circuitNetwork: { reflection: 'Keep connected work.' } };
    function Host() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Host))); await flush();
  }
  beforeEach(() => { frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); writes = vi.fn(); awards = vi.fn(); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each([undefined, saved('less', false, 'An early draft')])('does not show an ending before the selected experiment has been tested (%j)', async record => {
    await mount({ lessonRecords: record ? { gain: record } : {} }); expect(continuation()).toBeNull(); expect(host.contains(document.activeElement)).toBe(false); expect(writes).not.toHaveBeenCalled();
  });
  it('keeps the next setup fixed through live edits and baseline replay without treating an explanation as a gate', async () => {
    await mount(); const text = continuation().textContent; await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 0, light: 90, supply: 9 } })); expect(continuation().textContent).toBe(text);
    await click(button('Load experiment baseline')); expect(continuation().textContent).toBe(text); await click(button('Undo active edit')); expect(continuation().textContent).toBe(text); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe('Keep gain evidence.');
  });
  it.each([saved('less'), saved('less', true, 'Saved result explanation')])('puts retry behind a closed native disclosure for an existing record (%j)', async record => {
    await mount({ lessonRecords: { gain: record } }); expect(retry()).not.toBeNull(); expect(retry().open).toBe(false); expect(retry().querySelector('summary').textContent).toBe('Start this experiment again'); expect(retry().querySelector('button').textContent).toBe('Start transistor prediction'); expect(retry().textContent).toContain('Starting again replaces'); expect(retry().textContent).toContain('Your investigation notebook stays saved.');
  });
  it('opening and closing the retry warning does not reset, load, write, reward, or move focus', async () => {
    await mount(); const before = latest, json = JSON.stringify(latest), summary = retry().querySelector('summary'); summary.focus(); await toggle(retry(), true); await toggle(retry(), false); await toggle(retry(), true);
    expect(document.activeElement).toBe(summary); expect(latest).toBe(before); expect(JSON.stringify(latest)).toBe(json); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('the explicit restart resets only its lesson and keeps the prior live circuit recoverable by electrical Undo', async () => {
    await mount({ lessonRecords: allSaved() }); const prior = api.circuitActiveDesign(latest._circuitActive), independent = protectedWork(latest._circuitActive), other = clone({ limit: latest._circuitActive.lessonRecords.limit, sensor: latest._circuitActive.lessonRecords.sensor }), history = latest._circuitActive.undo.length, details = retry();
    await toggle(details, true); await click(details.querySelector('button')); expect(latest._circuitActive.lessonRecords.gain).toEqual(saved()); expect({ limit: latest._circuitActive.lessonRecords.limit, sensor: latest._circuitActive.lessonRecords.sensor }).toEqual(other); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(api.circuitActiveDesign({ input: 1 })); expect(latest._circuitActive.undo).toHaveLength(history + 1); expect(latest._circuitActive.undo.at(-1)).toEqual(prior); expect(latest._circuitActive.redo).toEqual([]); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]')); expect(retry()).toBe(details); expect(details.open).toBe(true); expect(continuation()).toBeNull();
    const actual = protectedWork(latest._circuitActive); for (const key of ['observations', 'reference', 'reflection', 'investigationTitle', 'probeRed', 'probeBlack', 'view']) expect(actual[key]).toEqual(independent[key]);
    await click(button('Undo active edit')); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(prior); expect(latest._circuitActive.lessonRecords.gain).toEqual(saved()); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other.sensor);
  });
  it('switching saved lessons retains the optional native disclosure without performing a retry', async () => {
    await mount({ lessonRecords: allSaved() }); await toggle(retry(), true); const details = retry(), before = protectedWork(latest._circuitActive), records = clone(latest._circuitActive.lessonRecords);
    await select('sensor'); expect(retry()).toBe(details); expect(details.open).toBe(true); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(protectedWork(latest._circuitActive)).toEqual(before); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]'));
  });
});
