import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = 'less', tested = true, explanation = 'My saved explanation.') => ({ choice, tested, explanation });
// Independent loaded-divider calculation, without calling the product solver.
const sensorCurrent = light => {
  const ldr = 100000 * Math.pow(100, -light / 100);
  const junction = (5 / 10000 + .7 / 10000) / (1 / 10000 + 1 / ldr + 1 / 10000);
  return 100 * (junction - .7) / 10000;
};
const cases = [
  { id: 'gain', values: [.003, .008], text: ['3.00 mA', '8.00 mA'], delta: '+5.00 mA', settings: ['Input: 1.00 V', 'Input: 1.50 V'], region: 'Active region', title: 'Lamp current increased' },
  { id: 'limit', values: [(5 - .2) / 220, (5 - .2) / 220], text: ['21.82 mA', '21.82 mA'], delta: '0 A', settings: ['Input: 3.30 V', 'Input: 5.00 V'], region: 'Saturation', title: 'Lamp current stayed the same' },
  { id: 'sensor', values: [sensorCurrent(80), sensorCurrent(20)], text: ['2.53 mA', '18.32 mA'], delta: '+15.79 mA', settings: ['Relative light: 80 / 100', 'Relative light: 20 / 100'], region: 'Active region', title: 'Lamp current increased' }
];
const independent = state => clone({ observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack, view: state.view });
const contextText = {
  changed: 'Saved experiment evidence. Your live bench has changed since this test.',
  before: 'The experiment baseline is now on your bench. The result below stays saved.',
  after: 'These saved readings match the experiment now on your bench.'
};

describe('Active saved result reading', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const evidence = () => lab().querySelector('.circuit-active-lesson-evidence');
  const heading = () => lab().querySelector('[data-active-lesson-result]');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const cards = () => [...evidence().querySelectorAll('.circuit-active-lesson-reading')];
  const context = () => lab().querySelector('.circuit-lesson-evidence-context .circuit-active-lesson-bench-note');
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const descriptions = element => element.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id));
  const seed = patch => ({ ...api.circuitActiveDesign({ project: 'light', supply: 12, light: 0, input: 0, loadResistance: 1000 }), lessonId: 'gain', lessonRecords: { gain: record(), limit: record('more'), sensor: record('same') }, view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, observations: [api.circuitActiveObservation({ input: .8 }, 'My independent point')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook explanation.', investigationTitle: 'A custom circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
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
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'results.json', size: 4096, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  function snapshot() {
    return { values: cards().map(node => node.querySelector('strong').textContent), widths: cards().map(node => parseFloat(node.querySelector('.circuit-active-lesson-track>span').style.width)), settings: cards().map(node => node.querySelector('small').textContent), regions: cards().map(node => node.querySelector('.circuit-active-lesson-region').textContent), delta: evidence().querySelector('.circuit-active-lesson-delta strong').textContent, title: heading().textContent };
  }
  function assertContext(kind) {
    expect(context().textContent).toBe(contextText[kind]); expect(context().getAttribute('role')).toBe('status');
    expect(lab().querySelectorAll('.circuit-active-lesson-bench-note')).toHaveLength(1);
    expect(lab().querySelector('.circuit-active-lesson-replay .circuit-active-lesson-bench-note')).toBeNull();
    expect(context().compareDocumentPosition(descriptions(heading())[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(context().compareDocumentPosition(cards()[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const icon = context().parentElement.querySelector('svg'); expect(icon).toBeTruthy(); expect(icon.getAttribute('aria-hidden')).toBe('true'); expect(icon.getAttribute('focusable')).toBe('false');
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each(cases)('shows independently calculated $id saved measurements, settings, delta and a true shared scale', async fixture => {
    await mount({ lessonId: fixture.id }); const actual = snapshot();
    expect(actual.values).toEqual(fixture.text); expect(actual.delta).toBe(fixture.delta); expect(actual.settings).toEqual(fixture.settings); expect(actual.regions).toEqual([fixture.region, fixture.region]); expect(actual.title).toBe(fixture.title);
    const maximum = Math.max(...fixture.values); actual.widths.forEach((width, index) => expect(width).toBeCloseTo(fixture.values[index] / maximum * 100, 8));
    const chart = evidence().querySelector('.circuit-active-lesson-chart'), caption = document.getElementById(chart.getAttribute('aria-describedby'));
    expect(caption.textContent).toBe('Both bars use the same scale. Full width = ' + fixture.text[1] + '.'); expect(chart.getAttribute('aria-hidden')).not.toBe('true');
    expect(cards().map(node => node.dataset.stage)).toEqual(['before', 'after']);
    for (const node of cards()) { const setting = node.querySelector('small'), value = node.querySelector('strong'); expect(setting.classList.contains('circuit-lesson-reading-setting')).toBe(true); expect(setting.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(node.querySelector('.circuit-active-lesson-track').getAttribute('aria-hidden')).toBe('true'); }
    for (const [index, value] of [...cards().map(node => node.querySelector('strong')), evidence().querySelector('.circuit-active-lesson-delta strong')].entries()) {
      const expected = index < 2 ? fixture.text[index] : fixture.delta, split = expected.split(' ');
      expect(value.classList.contains('circuit-lesson-result-value')).toBe(true); expect(value.querySelector('.circuit-lesson-result-magnitude').textContent).toBe(split[0]); expect(value.querySelector('.circuit-lesson-result-unit').textContent).toBe(split[1]); expect(value.textContent).toBe(expected);
    }
    expect(evidence().querySelector('.circuit-eyebrow').textContent).toBe('SAVED EXPERIMENT RESULT'); expect(evidence().getAttribute('aria-labelledby')).toBe(heading().id); expect(heading().tabIndex).toBe(-1);
    const described = descriptions(heading()); expect(described).toHaveLength(2); expect(described[0].textContent).toContain('Use these readings to revise your explanation.'); expect(described[1]).toBe(context());
    assertContext('changed'); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });

  it.each([
    ['fresh', {}], ['awaiting prediction', { gain: record(null, false) }], ['ready prediction', { gain: record('less', false) }], ['invalid saved test', { gain: record('invalid', true) }]
  ])('does not expose saved-result content for %s', async (_name, lessonRecords) => {
    await mount({ lessonRecords }); expect(evidence()).toBeNull(); expect(heading()).toBeNull(); expect(context()).toBeNull(); expect(lab().querySelector('.circuit-lesson-result-value')).toBeNull(); expect(lab().querySelector('.circuit-active-lesson-trace')).toBeNull(); expect(writes).not.toHaveBeenCalled();
  });

  it('updates one context through baseline, result and Undo while keeping every saved measurement and explanation intact', async () => {
    await mount(); const before = api.circuitActiveDesign(latest._circuitActive), work = independent(latest._circuitActive), records = clone(latest._circuitActive.lessonRecords), result = snapshot(), node = context();
    assertContext('changed'); await click(button('Load experiment baseline')); assertContext('before'); expect(context()).toBe(node); expect(snapshot()).toEqual(result); expect(latest._circuitActive.undo.at(-1)).toEqual(before);
    expect(button('Load experiment baseline').getAttribute('aria-pressed')).toBe('true'); await click(button('Load this experiment result')); assertContext('after'); expect(snapshot()).toEqual(result);
    await click(button('Undo active edit')); assertContext('before'); await click(button('Undo active edit')); assertContext('changed'); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(before); expect(snapshot()).toEqual(result); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(independent(latest._circuitActive)).toEqual(work); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('live settings and signed probe changes never replace saved readings or steal focus from the expanded writing field', async () => {
    await mount(); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const result = snapshot(), textarea = field(), records = clone(latest._circuitActive.lessonRecords); textarea.focus(); textarea.setSelectionRange(2, 9, 'backward');
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, project: 'dark', supply: 3, input: 5, light: 100, baseResistance: 47000, probeRed: 'emitter', probeBlack: 'collector' } }));
    expect(snapshot()).toEqual(result); assertContext('changed'); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(document.activeElement).toBe(textarea); expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection]).toEqual([2, 9, 'backward']); expect(latest._circuitActive.lessonRecords).toEqual(records);
    await write(textarea, 'I initially expected less current; the saved values support a revision.'); expect(snapshot()).toEqual(result); expect(document.activeElement).toBe(textarea); expect(latest._circuitActive.reflection).toBe('My independent notebook explanation.'); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('switches between independent saved results without loading a circuit or losing the wrong prediction and local writing space', async () => {
    await mount(); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const gain = snapshot(), bench = api.circuitActiveDesign(latest._circuitActive), history = clone(latest._circuitActive.undo), textarea = field(), records = clone(latest._circuitActive.lessonRecords);
    await select('limit'); expect(snapshot().values).toEqual(cases[1].text); expect(snapshot().delta).toBe('0 A'); expect(document.activeElement).toBe(heading());
    await select('gain'); expect(snapshot()).toEqual(gain); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(bench); expect(latest._circuitActive.undo).toEqual(history);
  });

  it('JSON load and restore recompute fixed readings without importing measurements or replaying result navigation', async () => {
    await mount(); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const before = api.circuitActiveInvestigation(latest._circuitActive), result = snapshot(), textarea = field();
    const doc = api.circuitActiveInvestigation({ project: 'manual', input: 4, supply: 9, lessonId: 'sensor', lessonRecords: { sensor: record('less', true, 'Imported reasoning') } });
    expect(Object.keys(doc.lessonRecords.sensor).sort()).toEqual(['choice', 'explanation', 'tested']); await importDoc(doc);
    expect(snapshot().values).toEqual(cases[2].text); expect(snapshot().settings).toEqual(cases[2].settings); assertContext('changed'); expect(latest._circuitActive.supply).toBe(9); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(textarea.value).toBe('Imported reasoning'); expect(document.activeElement).not.toBe(heading()); expect(document.activeElement).not.toBe(textarea);
    await click(button('Restore previous investigation')); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(before); expect(snapshot()).toEqual(result); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('uses physical matching for the context even when inactive settings or probe polarity differ', async () => {
    await mount({ ...api.circuitActiveDesign({ input: 1.5 }), light: 7, dividerResistance: 47000, probeRed: 'emitter', probeBlack: 'collector' }); const state = clone(latest._circuitActive), result = snapshot(); assertContext('after');
    await click(button('Load this experiment result')); assertContext('after'); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(api.circuitActiveDesign(state)); expect(latest._circuitActive.undo).toEqual(state.undo); expect(latest._circuitActive.redo).toEqual(state.redo); expect(snapshot()).toEqual(result);
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...api.circuitActiveDesign({ project: 'dark', light: 20 }), input: 4.7, lessonId: 'sensor' } })); assertContext('after'); expect(snapshot().values).toEqual(cases[2].text);
  });

  it('locale rerenders translate result descriptions in place without changing formatted values, writing selection or saved state', async () => {
    await mount(); const textarea = field(), note = context(), title = heading(), result = snapshot(), before = latest; textarea.focus(); textarea.setSelectionRange(3, 10, 'backward');
    await act(async () => setLocale('Translated: ')); await flush(); expect(latest).toBe(before); expect(field()).toBe(textarea); expect(context()).toBe(note); expect(heading()).toBe(title); expect(document.activeElement).toBe(textarea); expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection]).toEqual([3, 10, 'backward']);
    expect(snapshot().values).toEqual(result.values); expect(snapshot().delta).toBe(result.delta); expect(snapshot().widths).toEqual(result.widths); expect(note.textContent).toBe('Translated: ' + contextText.changed); expect(title.textContent).toBe('Translated: ' + cases[0].title); expect(evidence().querySelector('.circuit-eyebrow').textContent).toBe('Translated: SAVED EXPERIMENT RESULT'); expect(descriptions(title)[1]).toBe(note); expect(descriptions(title)[0].textContent).toContain('Translated: Use these readings'); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it('actual wrong-prediction Test focuses the described saved result once and later evidence rerenders do not navigate', async () => {
    await mount({ lessonRecords: {} }); const independentBefore = independent(latest._circuitActive);
    await click(button('Start transistor prediction')); await click(button('Decreases')); expect(evidence()).toBeNull(); await click(button('Test transistor prediction'));
    expect(document.activeElement).toBe(heading()); expect(descriptions(heading())[1]).toBe(context()); assertContext('after'); expect(snapshot().values).toEqual(cases[0].text); expect(latest._circuitActive.lessonRecords.gain.choice).toBe('less'); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(independent(latest._circuitActive)).toEqual(independentBefore);
    const textarea = field(); textarea.focus(); await write(textarea, 'The evidence changed my expectation.'); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonRecords: clone(prev._circuitActive.lessonRecords) } })); expect(document.activeElement).toBe(textarea); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('multiple mounted tools associate each result with only its own summary, context and scale', async () => {
    function Instance({ id }) { const [state, setState] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed({ lessonId: id }) }); return config.render(makeCtx({ toolData: state, setToolData: setState })); }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Instance, { id: 'gain' }), React.createElement(Instance, { id: 'limit' })))); await flush();
    const labs = [...host.querySelectorAll('.circuit-active-lesson-lab')], associatedIds = [];
    for (const node of labs) { const result = node.querySelector('[data-active-lesson-result]'), chart = node.querySelector('.circuit-active-lesson-chart'); for (const control of [result, chart]) { const ids = control.getAttribute('aria-describedby').split(/\s+/); associatedIds.push(...ids); for (const id of ids) expect(node.contains(document.getElementById(id))).toBe(true); } expect(node.querySelectorAll('.circuit-active-lesson-bench-note')).toHaveLength(1); }
    expect(new Set(associatedIds).size).toBe(associatedIds.length); expect(labs.map(node => node.querySelector('.circuit-active-lesson-reading strong').textContent)).toEqual(['3.00 mA', '21.82 mA']); expect(host.contains(document.activeElement)).toBe(false);
  });
});
