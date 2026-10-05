import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = 'less', tested = true, explanation = 'My saved explanation.') => ({ choice, tested, explanation });
const lampLimit = 4.8 / 220;
// Independent loaded-divider nodal equation; expected values do not call the product solver.
const sensorCurrent = light => {
  const ldr = 100000 * Math.pow(100, -light / 100);
  const junction = (5 / 10000 + .7 / 10000) / (1 / 10000 + 1 / ldr + 1 / 10000);
  return (junction - .7) / 10000 * 100;
};
const fixtures = [
  { id: 'gain', designs: [{ input: 1 }, { input: 1.5 }], base: [.003, .008], text: [['3.00 mA', '21.82 mA', '3.00 mA'], ['8.00 mA', '21.82 mA', '8.00 mA']], limiting: 'base' },
  { id: 'limit', designs: [{ input: 3.3 }, { input: 5 }], base: [.026, .043], text: [['26.00 mA', '21.82 mA', '21.82 mA'], ['43.00 mA', '21.82 mA', '21.82 mA']], limiting: 'lamp' },
  { id: 'sensor', designs: [{ project: 'dark', light: 80 }, { project: 'dark', light: 20 }], base: [sensorCurrent(80), sensorCurrent(20)], text: [['2.53 mA', '21.82 mA', '2.53 mA'], ['18.32 mA', '21.82 mA', '18.32 mA']], limiting: 'base' }
];
const protectedWork = (api, state) => clone({ design: api.circuitActiveDesign(state), records: api.circuitActiveLessonRecords(state), undo: state.undo, redo: state.redo, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probes: [state.probeRed, state.probeBlack], view: state.view });

describe('What sets saved lesson lamp current', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const panel = () => host.querySelector('.circuit-active-lesson-current-limit');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const cards = () => [...panel().querySelectorAll('[data-current-limit-stage]')];
  const term = (card, key) => card.querySelector('[data-limit-term="' + key + '"]');
  const value = (card, key) => term(card, key).querySelector('strong').textContent;
  const width = (card, key) => parseFloat(term(card, key).querySelector('.circuit-limit-track>span').style.width);
  const actual = card => card.querySelector('.circuit-limit-actual-value').textContent;
  const decision = card => card.querySelector('[data-limiting]').dataset.limiting;
  const snapshot = () => cards().map(card => ({ stage: card.dataset.currentLimitStage, base: value(card, 'base'), lamp: value(card, 'lamp'), actual: actual(card), widths: [width(card, 'base'), width(card, 'lamp')], limiting: decision(card) }));
  const seed = patch => ({ ...api.circuitActiveDesign({ project: 'light', supply: 12, light: 0, input: 0, loadResistance: 1000 }), lessonId: 'gain', lessonRecords: { gain: record(), limit: record('more'), sensor: record('same') }, view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, observations: [api.circuitActiveObservation({ input: .8 }, 'Independent observation')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook explanation.', investigationTitle: 'A custom circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function write(el, text) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected notes.' } };
    function Harness() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: updateValue => { writes(updateValue); setState(updateValue); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'current-limit.json', size: 4096, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  const point = (base, limit, patch = {}) => ({ design: { project: 'manual', input: 1.5, supply: 5, baseResistance: 10000, loadResistance: 220, beta: 100 }, baseCurrent: base / 100, loadLimit: limit, collectorCurrent: Math.min(base, limit), region: base < limit ? 'active' : 'saturated', sensor: false, ...patch });
  async function synthetic(before, after) {
    // Expose only this real local component in memory; calculations and the source file are unchanged.
    const source = readFileSync('stem_lab/stem_tool_circuit.js', 'utf8'), marker = 'function CircuitActiveLessonCurrentLimit(props) {';
    expect(source.split(marker)).toHaveLength(2); resetStemLab(); new Function(source.replace(marker, 'window.StemLab.__currentLimitForTest = CircuitActiveLessonCurrentLimit;\n' + marker))();
    await act(async () => root.render(React.createElement(window.StemLab.__currentLimitForTest, { React, t: (_key, fallback) => fallback, lesson: { id: 'gain' }, before, after })));
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each(fixtures)('explains the fixed $id model terms, limiting term and actual saved current on one four-term scale', async fixture => {
    await mount({ lessonId: fixture.id }); expect(panel().open).toBe(false); expect(panel().querySelector('summary').textContent).toBe('What sets the lamp current?'); expect(panel().previousElementSibling).toBe(lab().querySelector('.circuit-active-lesson-trace'));
    expect(cards().map(card => card.dataset.currentLimitStage)).toEqual(['before', 'after']); const maximum = Math.max(...fixture.base, lampLimit);
    for (const [index, card] of cards().entries()) {
      expect([value(card, 'base'), value(card, 'lamp'), actual(card)]).toEqual(fixture.text[index]); expect(decision(card)).toBe(fixture.limiting);
      expect(width(card, 'base')).toBeCloseTo(fixture.base[index] / maximum * 100, 9); expect(width(card, 'lamp')).toBeCloseTo(lampLimit / maximum * 100, 9);
      const solved = api.solveActiveCircuit(fixture.designs[index]); expect(solved.design.beta * solved.baseCurrent).toBeCloseTo(fixture.base[index], 12); expect(solved.loadLimit).toBeCloseTo(lampLimit, 12); expect(solved.collectorCurrent).toBeCloseTo(Math.min(fixture.base[index], lampLimit), 12);
      for (const key of ['base', 'lamp']) expect(term(card, key).querySelector('.circuit-limit-track').getAttribute('aria-hidden')).toBe('true');
    }
    expect(panel().textContent).toContain('β'); expect(panel().textContent).toContain('0.20'); expect(panel().textContent).toMatch(/rounded/i); expect(panel().querySelector('[role="status"],[aria-live],button,input,textarea')).toBeNull(); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });

  it('represents cutoff with no base-term bar or actual lamp current while the lamp limit remains visible', async () => {
    await synthetic(point(0, .02), point(.01, .02)); expect(snapshot().map(row => row.actual)).toEqual(['0 A', '10.00 mA']); expect(snapshot().map(row => row.widths)).toEqual([[0, 100], [50, 100]]); expect(snapshot().map(row => row.limiting)).toEqual(['base', 'base']);
  });

  it('handles an all-zero comparison with finite empty bars and an exact tie', async () => {
    await synthetic(point(0, 0), point(0, 0)); expect(snapshot().map(row => row.widths)).toEqual([[0, 0], [0, 0]]); expect(snapshot().map(row => [row.base, row.lamp, row.actual, row.limiting])).toEqual([['0 A', '0 A', '0 A', 'both'], ['0 A', '0 A', '0 A', 'both']]); expect(panel().textContent).not.toMatch(/NaN|Infinity/);
  });

  it('keeps very small positive modeled current and exact fractional bar width instead of imposing a visible minimum', async () => {
    await synthetic(point(1e-9, .02), point(2e-9, .02)); expect(snapshot().map(row => row.base)).toEqual(['0.00100 µA', '0.00200 µA']); expect(snapshot().map(row => row.actual)).toEqual(['0.00100 µA', '0.00200 µA']);
    expect(width(cards()[0], 'base')).toBeCloseTo(1e-9 / .02 * 100, 12); expect(width(cards()[1], 'base')).toBeCloseTo(2e-9 / .02 * 100, 12); expect(width(cards()[0], 'base')).toBeGreaterThan(0); expect(snapshot().every(row => row.limiting === 'base')).toBe(true);
  });

  it('labels exact equality as both terms meeting and preserves supplied point data', async () => {
    const before = point(.02, .02), after = point(.01, .01), original = clone({ before, after }); await synthetic(before, after);
    expect(snapshot().map(row => row.limiting)).toEqual(['both', 'both']); expect(snapshot().map(row => row.widths)).toEqual([[100, 100], [50, 50]]); expect({ before, after }).toEqual(original);
  });

  it.each([[-1, 'base'], [1, 'lamp']])('uses unrounded raw terms for a near tie on side %s even when both displayed terms read the same', async (sign, expected) => {
    const base = .02 + sign * 1e-10; await synthetic(point(base, .02), point(base, .02));
    for (const card of cards()) { expect(value(card, 'base')).toBe('20.00 mA'); expect(value(card, 'lamp')).toBe('20.00 mA'); expect(decision(card)).toBe(expected); expect(decision(card)).not.toBe('both'); }
  });

  it('shares a maximum across both terms in both cards and uses each saved gain value', async () => {
    const before = point(.01, .02), after = point(.04, .08, { design: { project: 'manual', input: 2.7, supply: 9, baseResistance: 10000, loadResistance: 110, beta: 200 }, baseCurrent: .0002 }); await synthetic(before, after);
    expect(snapshot().map(row => [row.base, row.lamp, row.actual])).toEqual([['10.00 mA', '20.00 mA', '10.00 mA'], ['40.00 mA', '80.00 mA', '40.00 mA']]); expect(snapshot().map(row => row.widths)).toEqual([[12.5, 25], [50, 100]]);
  });

  it.each([['fresh', {}], ['prediction ready', { gain: record('more', false) }], ['invalid tested record', { gain: record(null, true) }]])('does not expose saved model evidence for %s', async (_name, lessonRecords) => {
    await mount({ lessonRecords }); expect(panel()).toBeNull(); expect(lab().textContent).not.toContain('What sets the lamp current?'); expect(writes).not.toHaveBeenCalled();
  });

  it('native disclosure, writing and locale changes preserve saved state, field selection and existing element identity', async () => {
    await mount(); const initial = latest, summary = panel().querySelector('summary'); summary.focus(); await click(summary); expect(panel().open).toBe(true); expect(document.activeElement).toBe(summary); expect(latest).toBe(initial); expect(writes).not.toHaveBeenCalled();
    await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const node = panel(), textarea = field(), readings = snapshot(); textarea.focus(); await write(textarea, 'The smaller modeled term determines this saved lamp current.'); textarea.setSelectionRange(3, 12, 'backward'); const saved = latest;
    await act(async () => setLocale('Translated: ')); await flush(); expect(latest).toBe(saved); expect(panel()).toBe(node); expect(panel().open).toBe(true); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(document.activeElement).toBe(textarea); expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection]).toEqual([3, 12, 'backward']); expect(snapshot()).toEqual(readings); expect(panel().querySelector('summary').textContent).toBe('Translated: What sets the lamp current?'); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('live edits, reversed probes, replay and Undo do not replace the saved model terms or reset the disclosure', async () => {
    await mount(); await click(panel().querySelector('summary')); const node = panel(), readings = snapshot();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, project: 'dark', light: 0, supply: 3, input: 5, beta: 300, probeRed: 'emitter', probeBlack: 'collector' } })); const original = protectedWork(api, latest._circuitActive);
    expect(snapshot()).toEqual(readings); await click(button('Load experiment baseline')); expect(snapshot()).toEqual(readings); await click(button('Load this experiment result')); expect(snapshot()).toEqual(readings); await click(button('Undo active edit')); await click(button('Undo active edit'));
    expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(original.design); for (const key of ['records', 'observations', 'reference', 'reflection', 'investigationTitle', 'probes', 'view']) expect(protectedWork(api, latest._circuitActive)[key]).toEqual(original[key]); expect(snapshot()).toEqual(readings); expect(panel()).toBe(node); expect(panel().open).toBe(true); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('switches among saved comparisons without loading a circuit or losing wrong predictions and expanded writing', async () => {
    await mount(); await click(panel().querySelector('summary')); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const node = panel(), textarea = field(), saved = protectedWork(api, latest._circuitActive);
    for (const id of ['limit', 'sensor', 'gain']) { await select(id); const expected = fixtures.find(fixture => fixture.id === id); expect(snapshot().map(row => [row.base, row.lamp, row.actual])).toEqual(expected.text); expect(panel()).toBe(node); expect(panel().open).toBe(true); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); }
    expect(protectedWork(api, latest._circuitActive)).toEqual(saved); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases');
  });

  it('JSON import and restore derive comparisons from saved lesson identity without persisting terms or navigating', async () => {
    await mount(); await click(panel().querySelector('summary')); await click(lab().querySelector('.circuit-lesson-writing-size-toggle')); const original = api.circuitActiveInvestigation(latest._circuitActive), node = panel(), textarea = field();
    const doc = api.circuitActiveInvestigation({ project: 'manual', supply: 9, input: 4, lessonId: 'sensor', lessonRecords: { sensor: record('less', true, 'Imported reasoning') } }); expect(Object.keys(doc.lessonRecords.sensor).sort()).toEqual(['choice', 'explanation', 'tested']); await importDoc(doc);
    expect(snapshot().map(row => [row.base, row.lamp, row.actual])).toEqual(fixtures[2].text); expect(panel()).toBe(node); expect(panel().open).toBe(true); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(latest._circuitActive.supply).toBe(9); expect(document.activeElement).not.toBe(textarea); expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-result]'));
    await click(button('Restore previous investigation')); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); expect(snapshot().map(row => [row.base, row.lamp, row.actual])).toEqual(fixtures[0].text); expect(panel()).toBe(node); expect(panel().open).toBe(true); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('Test reveals the disclosure closed, retry removes it, and a new Test does not reopen the previous view', async () => {
    await mount({ lessonRecords: { sensor: record('same') } }); const other = clone(latest._circuitActive.lessonRecords.sensor); await click(button('Start transistor prediction')); await click(button('Decreases')); expect(panel()).toBeNull(); await click(button('Test transistor prediction')); expect(panel().open).toBe(false); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]'));
    await click(panel().querySelector('summary')); const old = panel(), retry = lab().querySelector('.circuit-active-lesson-retry'); await click(retry.querySelector('summary')); await click(retry.querySelector('button')); expect(panel()).toBeNull(); expect(old.isConnected).toBe(false);
    await click(button('Stays the same')); await click(button('Test transistor prediction')); expect(panel()).not.toBe(old); expect(panel().open).toBe(false); expect(snapshot().map(row => [row.base, row.lamp, row.actual])).toEqual(fixtures[0].text); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other); expect(awards).not.toHaveBeenCalled();
  });

  it('keeps disclosure state and saved terms independent in two mounted tool instances', async () => {
    const states = [];
    function Instance({ id, index }) { const [state, setState] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed({ lessonId: id }) }); states[index] = state; return config.render(makeCtx({ toolData: state, setToolData: setState })); }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Instance, { id: 'gain', index: 0 }), React.createElement(Instance, { id: 'limit', index: 1 })))); await flush(); const initial = states.slice(), panels = [...host.querySelectorAll('.circuit-active-lesson-current-limit')];
    await click(panels[0].querySelector('summary')); expect(panels.map(node => node.open)).toEqual([true, false]); expect(states[0]).toBe(initial[0]); expect(states[1]).toBe(initial[1]); expect(panels.map(node => node.querySelector('[data-limit-term="base"] strong').textContent)).toEqual(['3.00 mA', '26.00 mA']);
  });
});
