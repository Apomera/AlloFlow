import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = 'less', tested = true, explanation = 'My saved explanation.') => ({ choice, tested, explanation });
const fixtures = [
  { id: 'gain', rows: [
    ['baseCurrent', '30.0 µA', '80.0 µA', '+50.0 µA'],
    ['collectorCurrent', '3.00 mA', '8.00 mA', '+5.00 mA'],
    ['collectorVoltage', '4.34V', '3.24V', '-1.10V']
  ], prompt: 'How does the change in base current explain the lamp-current change, and where does the lamp’s energy come from?' },
  { id: 'limit', rows: [
    ['baseCurrent', '260 µA', '430 µA', '+170 µA'],
    ['collectorCurrent', '21.82 mA', '21.82 mA', '0 A'],
    ['collectorVoltage', '200.00 mV', '200.00 mV', '0.00V']
  ], prompt: 'Base current rises while lamp current stays the same. What sets the lamp-current limit in these two readings?' },
  // Independently solved loaded divider: Vj=(5/10k+.7/10k)/(1/10k+1/Rldr+1/10k).
  // Vj=.9530064644978481 ->2.5319957158373843; IB=(Vj-.7)/10k, IC=100*IB, VCE=5-220*IC.
  { id: 'sensor', rows: [
    ['baseCurrent', '25.3 µA', '183 µA', '+158 µA'],
    ['collectorCurrent', '2.53 mA', '18.32 mA', '+15.79 mA'],
    ['collectorVoltage', '4.44V', '969.61 mV', '-3.47V'],
    ['driveVoltage', '953.01 mV', '2.53V', '+1.58V']
  ], prompt: 'How does the connected divider junction voltage help explain the changes in base current and lamp current?' }
];
const protectedWork = (api, state) => clone({ design: api.circuitActiveDesign(state), records: api.circuitActiveLessonRecords(state), undo: state.undo, redo: state.redo, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probes: [state.probeRed, state.probeBlack], view: state.view });

describe('Changes in the saved experiment trace', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const trace = () => host.querySelector('.circuit-active-lesson-trace');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const rows = () => [...trace().querySelectorAll('[data-lesson-trace-metric]')].map(row => [row.dataset.lessonTraceMetric, ...['before', 'after', 'change'].map(stage => row.querySelector('[data-stage="' + stage + '"] strong').textContent)]);
  const seed = patch => ({ ...api.circuitActiveDesign({ project: 'light', supply: 12, light: 0, input: 0, loadResistance: 1000 }), lessonId: 'gain', lessonRecords: { gain: record(), limit: record('more'), sensor: record('same') }, view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, observations: [api.circuitActiveObservation({ input: .8 }, 'Independent observation')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook explanation.', investigationTitle: 'A custom circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected notes.' } };
    function Harness() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'trace.json', size: 4096, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  async function synthetic(before, after) {
    // Expose the real local component only in this evaluation; no rewritten calculations or product file changes.
    const source = readFileSync('stem_lab/stem_tool_circuit.js', 'utf8'), marker = 'function CircuitActiveLessonTrace(props) {';
    expect(source.split(marker)).toHaveLength(2); resetStemLab();
    new Function(source.replace(marker, 'window.StemLab.__traceForTest = CircuitActiveLessonTrace;\n' + marker))();
    const Trace = window.StemLab.__traceForTest;
    await act(async () => root.render(React.createElement(Trace, { React, t: (_key, fallback) => fallback, lesson: { id: before.sensor ? 'sensor' : 'gain' }, before, after })));
  }
  function assertNumericText() {
    for (const value of trace().querySelectorAll('dd strong')) {
      const parts = value.textContent.match(/^([+-]?\d+(?:\.\d+)?)(\s*)([µm]?[AV])$/); expect(parts).toBeTruthy();
      expect(value.classList.contains('circuit-trace-reading-value')).toBe(true);
      const spans = value.querySelectorAll('span'); expect(spans).toHaveLength(2); expect(spans[0].classList.contains('circuit-trace-reading-magnitude')).toBe(true); expect(spans[1].classList.contains('circuit-trace-reading-unit')).toBe(true); expect(spans[0].textContent).toBe(parts[1]); expect(spans[1].textContent).toBe(parts[3]);
      expect(value.textContent).toBe(parts[1] + parts[2] + parts[3]); expect(value.querySelector('[aria-hidden="true"]')).toBeNull();
    }
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each(fixtures)('shows independent $id before/after/change values without altering the prompt or reading names', async fixture => {
    await mount({ lessonId: fixture.id }); expect(trace().open).toBe(false); expect(trace().querySelector('summary').textContent).toBe('Trace the change'); expect(rows()).toEqual(fixture.rows); assertNumericText();
    const titles = [...trace().querySelectorAll('dt')].map(node => node.textContent);
    expect(titles).toEqual(['Base current', 'Lamp current', 'Collector–emitter voltage', ...(fixture.id === 'sensor' ? ['Connected divider junction voltage'] : [])]);
    for (const row of trace().querySelectorAll('[data-lesson-trace-metric]')) expect([...row.querySelectorAll('dd')].map(node => node.dataset.stage)).toEqual(['before', 'after', 'change']);
    expect(trace().querySelector('dl').getAttribute('aria-label')).toBe('Saved experiment measurements'); expect(trace().querySelector('.circuit-lesson-trace-question').textContent).toBe(fixture.prompt);
    expect(trace().textContent).toContain('Displayed values are rounded.'); expect(trace().querySelector('.circuit-lesson-trace-context').textContent).toContain('Change = After − Before, using the unrounded readings.'); expect(trace().querySelector('[role="status"],[aria-live]')).toBeNull(); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });

  it('subtracts unrounded inputs even when displayed endpoints conceal or distort the actual change', async () => {
    const before = { baseCurrent: .00003004, collectorCurrent: .0030049, collectorVoltage: 4.344 }, after = { baseCurrent: .00003005, collectorCurrent: .0030051, collectorVoltage: 4.346 }, original = clone({ before, after });
    await synthetic(before, after);
    expect(rows()).toEqual([['baseCurrent', '30.0 µA', '30.0 µA', '+0.0100 µA'], ['collectorCurrent', '3.00 mA', '3.01 mA', '+0.200 µA'], ['collectorVoltage', '4.34V', '4.35V', '+2.00 mV']]);
    assertNumericText(); expect({ before, after }).toEqual(original);
  });

  it('uses the original row formatter for negative differences and both current and voltage zero', async () => {
    await synthetic({ sensor: true, baseCurrent: .00008, collectorCurrent: .003, collectorVoltage: .2, driveVoltage: .5 }, { sensor: true, baseCurrent: .00003, collectorCurrent: .003, collectorVoltage: .2, driveVoltage: .498 });
    expect(rows()).toEqual([['baseCurrent', '80.0 µA', '30.0 µA', '-50.0 µA'], ['collectorCurrent', '3.00 mA', '3.00 mA', '0 A'], ['collectorVoltage', '200.00 mV', '200.00 mV', '0.00V'], ['driveVoltage', '500.00 mV', '498.00 mV', '-2.00 mV']]); assertNumericText();
    expect([...trace().querySelectorAll('[data-stage="change"] strong')].map(node => node.textContent).some(text => text.startsWith('+0 ') || text.startsWith('-0 '))).toBe(false);
  });

  it.each([['fresh', {}], ['prediction ready', { gain: record('more', false) }], ['invalid tested record', { gain: record(null, true) }]])('does not preview a change trace for %s', async (_label, lessonRecords) => {
    await mount({ lessonRecords }); expect(trace()).toBeNull(); expect(lab().querySelector('[data-stage="change"]')).toBeNull(); expect(writes).not.toHaveBeenCalled();
  });

  it('native disclosure toggles do not write, grade, navigate, or change the original prediction', async () => {
    await mount(); const initial = latest, saved = protectedWork(api, latest._circuitActive), summary = trace().querySelector('summary'); summary.focus();
    await click(summary); expect(trace().open).toBe(true); expect(document.activeElement).toBe(summary); expect(rows()).toEqual(fixtures[0].rows);
    await click(summary); expect(trace().open).toBe(false); expect(document.activeElement).toBe(summary); expect(latest).toBe(initial); expect(protectedWork(api, latest._circuitActive)).toEqual(saved); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('live edits, reversed probes, baseline/result replay and Undo preserve the open saved trace', async () => {
    await mount(); await click(trace().querySelector('summary')); const node = trace(), readings = rows();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, project: 'dark', light: 0, supply: 3, input: 5, probeRed: 'emitter', probeBlack: 'collector' } }));
    const original = protectedWork(api, latest._circuitActive); expect(rows()).toEqual(readings);
    await click(button('Load experiment baseline')); expect(rows()).toEqual(readings); await click(button('Load this experiment result')); expect(rows()).toEqual(readings); await click(button('Undo active edit')); await click(button('Undo active edit'));
    expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(original.design); for (const key of ['records', 'observations', 'reference', 'reflection', 'investigationTitle', 'probes', 'view']) expect(protectedWork(api, latest._circuitActive)[key]).toEqual(original[key]);
    expect(rows()).toEqual(readings); expect(trace()).toBe(node); expect(trace().open).toBe(true); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('switches the trace to each saved experiment and back without loading a circuit or losing local writing space', async () => {
    await mount(); await click(trace().querySelector('summary')); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const saved = protectedWork(api, latest._circuitActive), node = trace(), textarea = field();
    for (const id of ['sensor', 'limit', 'gain']) { await select(id); expect(rows()).toEqual(fixtures.find(item => item.id === id).rows); expect(trace()).toBe(node); expect(trace().open).toBe(true); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); }
    expect(protectedWork(api, latest._circuitActive)).toEqual(saved); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases');
  });

  it('JSON load and restore use saved lesson identity while keeping trace disclosure and writing size local', async () => {
    await mount(); await click(trace().querySelector('summary')); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const original = api.circuitActiveInvestigation(latest._circuitActive), node = trace(), textarea = field();
    const imported = api.circuitActiveInvestigation({ project: 'manual', supply: 9, input: 4, lessonId: 'sensor', lessonRecords: { sensor: record('less', true, 'Imported reasoning') } });
    expect(Object.keys(imported.lessonRecords.sensor).sort()).toEqual(['choice', 'explanation', 'tested']); await importDoc(imported); expect(rows()).toEqual(fixtures[2].rows); expect(trace()).toBe(node); expect(trace().open).toBe(true); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(document.activeElement).not.toBe(textarea); expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-result]')); expect(latest._circuitActive.supply).toBe(9);
    await click(button('Restore previous investigation')); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); expect(rows()).toEqual(fixtures[0].rows); expect(trace()).toBe(node); expect(trace().open).toBe(true); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('writing and translations preserve field selection, trace nodes and exact numeric strings without automatic focus', async () => {
    await mount(); await click(trace().querySelector('summary')); const node = trace(), values = [...node.querySelectorAll('strong')], textarea = field(); textarea.focus(); await write(textarea, 'My revised explanation cites the saved changes.'); textarea.setSelectionRange(3, 12, 'backward'); const saved = latest;
    await act(async () => setLocale('Translated: ')); await flush(); expect(latest).toBe(saved); expect(field()).toBe(textarea); expect(document.activeElement).toBe(textarea); expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection]).toEqual([3, 12, 'backward']); expect(trace()).toBe(node); expect(trace().open).toBe(true); expect([...node.querySelectorAll('strong')]).toEqual(values); expect(rows()).toEqual(fixtures[0].rows);
    expect(node.querySelector('summary').textContent).toBe('Translated: Trace the change'); expect(node.querySelector('[data-stage="change"]>span').textContent).toContain('Translated: '); expect(node.querySelector('.circuit-lesson-trace-context').textContent).toContain('Translated: '); expect(node.querySelector('.circuit-lesson-trace-question').textContent).toBe('Translated: ' + fixtures[0].prompt); expect(latest._circuitActive.reflection).toBe('My independent notebook explanation.'); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('actual wrong-prediction Test reveals a closed trace and focuses only the result heading', async () => {
    await mount({ lessonRecords: {} }); await click(button('Start transistor prediction')); await click(button('Decreases')); expect(trace()).toBeNull(); await click(button('Test transistor prediction'));
    expect(trace().open).toBe(false); expect(rows()).toEqual(fixtures[0].rows); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); expect(latest._circuitActive.lessonRecords.gain.choice).toBe('less'); expect(awards).not.toHaveBeenCalled();
    field().focus(); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonRecords: clone(prev._circuitActive.lessonRecords) } })); expect(document.activeElement).toBe(field()); expect(trace().open).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('retry removes the old trace and a new Test remounts it closed without discarding other saved work', async () => {
    await mount(); await click(trace().querySelector('summary')); const oldTrace = trace(), other = clone(latest._circuitActive.lessonRecords.sensor), note = latest._circuitActive.reflection;
    const retry = lab().querySelector('.circuit-active-lesson-retry'); await click(retry.querySelector('summary')); await click(retry.querySelector('button')); expect(trace()).toBeNull(); expect(oldTrace.isConnected).toBe(false);
    await click(button('Stays the same')); await click(button('Test transistor prediction')); expect(trace()).not.toBe(oldTrace); expect(trace().open).toBe(false); expect(rows()).toEqual(fixtures[0].rows); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other); expect(latest._circuitActive.reflection).toBe(note);
  });

  it('separate mounted tools have independent native trace disclosure and lesson-specific changes', async () => {
    const states = [];
    function Instance({ id, index }) { const [state, setState] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed({ lessonId: id }) }); states[index] = state; return config.render(makeCtx({ toolData: state, setToolData: setState })); }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Instance, { id: 'gain', index: 0 }), React.createElement(Instance, { id: 'sensor', index: 1 })))); await flush(); const initial = states.slice(), traces = [...host.querySelectorAll('.circuit-active-lesson-trace')];
    await click(traces[0].querySelector('summary')); expect(traces.map(node => node.open)).toEqual([true, false]); expect(states).toEqual(initial); expect(states[0]).toBe(initial[0]); expect(states[1]).toBe(initial[1]); expect(traces.map(node => node.querySelector('[data-lesson-trace-metric="baseCurrent"] [data-stage="change"] strong').textContent)).toEqual(['+50.0 µA', '+158 µA']); expect(document.activeElement).not.toBe(traces[1].querySelector('summary'));
  });
});
