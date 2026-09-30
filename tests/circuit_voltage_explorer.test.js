import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, config;
const clone = value => JSON.parse(JSON.stringify(value));
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });

describe('Physical voltage spans in the transistor lamp loop', () => {
  it.each([
    ['ordinary active circuit', { input: 1 }, 5, .66, 4.34, .003, 'active'],
    ['custom supply and lamp', { input: 1.2, supply: 12, baseResistance: 10000, loadResistance: 1000, beta: 80 }, 12, 4, 8, .004, 'active'],
    ['cutoff with nondefault supply', { input: .6, supply: 7.5 }, 7.5, 0, 7.5, 0, 'cutoff'],
    ['saturation at low supply', { input: 5, supply: 3, baseResistance: 1000, loadResistance: 100, beta: 300 }, 3, 2.8, .2, .028, 'saturated'],
    ['equal light-sensor divider', { project: 'light', light: 50 }, 5, 2.64, 2.36, .012, 'active'],
    ['equal dark-sensor divider', { project: 'dark', light: 50 }, 5, 2.64, 2.36, .012, 'active'],
  ])('matches independently calculated drops for %s', (_label, state, supply, lamp, transistor, current, region) => {
    const result = api.circuitActiveVoltageBudget(state);
    expect(result.supply).toBe(supply); expect(result.emitter).toBe(0); expect(result.collector).toBeCloseTo(transistor, 12); expect(result.collectorCurrent).toBeCloseTo(current, 12); expect(result.region).toBe(region);
    expect(result.segments.map(segment => [segment.id, segment.red, segment.black])).toEqual([['lamp', 'supply', 'collector'], ['transistor', 'collector', 'emitter']]);
    expect(result.segments[0].voltage).toBeCloseTo(lamp, 12); expect(result.segments[1].voltage).toBeCloseTo(transistor, 12);
    expect(result.segments[0].fraction).toBeCloseTo(lamp / supply, 12); expect(result.segments[1].fraction).toBeCloseTo(transistor / supply, 12);
    expect(result.segments.reduce((sum, segment) => sum + segment.voltage, 0)).toBeCloseTo(supply, 12); expect(result.segments.reduce((sum, segment) => sum + segment.fraction, 0)).toBeCloseTo(1, 12);
  });

  it.each([['light', 0, 'cutoff'], ['light', 100, 'saturated'], ['dark', 0, 'active'], ['dark', 100, 'cutoff']])('follows the %s sensor at light=%s into %s', (project, light, region) => {
    const result = api.circuitActiveVoltageBudget({ project, light }); expect(result.region).toBe(region); expect(result.project).toBe(project);
    if (region === 'cutoff') { expect(result.segments[0].fraction).toBe(0); expect(result.segments[1].fraction).toBe(1); expect(result.collectorCurrent).toBe(0); }
    else if (region === 'saturated') { expect(result.segments[1].voltage).toBeCloseTo(.2, 12); expect(result.segments[1].fraction).toBeCloseTo(.04, 12); }
    else {
      // Dark sensor at zero light: Vth=50/11 V, Rth=100000/11 ohms,
      // so IB=(Vth-.7)/(Rth+10000)=42.3/210000 A; the load limit is not reached.
      const current = 100 * 42.3 / 210000, lampVoltage = current * 220, collectorVoltage = 5 - lampVoltage;
      expect(result.collectorCurrent).toBeCloseTo(current, 12); expect(result.collector).toBeCloseTo(collectorVoltage, 12); expect(result.segments[0].voltage).toBeCloseTo(lampVoltage, 12); expect(result.segments[1].voltage).toBeCloseTo(collectorVoltage, 12); expect(result.segments[1].fraction).toBeCloseTo(collectorVoltage / 5, 12);
    }
  });

  it('does not inflate a tiny nonzero voltage span or force a minimum visible fraction', () => {
    const result = api.circuitActiveVoltageBudget({ input: .70000001 });
    expect(result.segments[0].voltage).toBeGreaterThan(0); expect(result.segments[0].fraction).toBeGreaterThan(0); expect(result.segments[0].fraction).toBeLessThan(1e-6);
    expect(result.segments[0].fraction).toBeCloseTo(result.segments[0].voltage / result.supply, 16);
  });

  it('is independent of probe direction and does not mutate saved work or leak it into geometry data', () => {
    const state = { input: 1, probeRed: 'base', probeBlack: 'drive', reflection: 'Keep my writing.', observations: [{ note: 'Keep my point.' }], undo: [{ input: 3 }] }, before = JSON.stringify(state);
    const budget = api.circuitActiveVoltageBudget(state); expect(budget).toEqual(api.circuitActiveVoltageBudget({ input: 1, probeRed: 'drive', probeBlack: 'base' })); expect(JSON.stringify(state)).toBe(before);
    expect(budget.reflection).toBeUndefined(); expect(budget.observations).toBeUndefined(); expect(budget.undo).toBeUndefined();
  });
});

describe('Voltage explorer and writing-space interactions', () => {
  let host, root, latest, update;
  const seed = extra => ({ input: 1, view: 'schematic', notebookOpen: true, probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .9 }, 'Saved before this exploration.')], reflection: 'My evidence-based explanation.\nThe lamp and transistor drops add to the supply.', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep my lesson.' } }, reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, undo: [api.circuitActiveDesign({ input: .8 })], redo: [api.circuitActiveDesign({ input: 3 })], ...extra });
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  async function mount(extra = {}) {
    function Harness() { const [toolData, setToolData] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed(extra) }); latest = toolData._circuitActive; update = setToolData; return config.render(makeCtx({ toolData, setToolData })); }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const explorer = () => host.querySelector('.circuit-voltage-explorer');
  const button = label => [...host.querySelectorAll('button')].find(el => el.textContent === label);
  const click = async label => { const el = button(label); expect(el).toBeTruthy(); await act(async () => el.click()); };
  const measureState = state => clone(Object.fromEntries(Object.entries(state).filter(([key]) => !['probeRed', 'probeBlack'].includes(key))));
  const geometry = () => [...explorer().querySelectorAll('[data-voltage-segment]')].map(el => ({ id: el.dataset.voltageSegment, percent: parseFloat(el.style.height) }));
  const assertGeometry = () => { const budget = api.circuitActiveVoltageBudget(latest); for (const segment of budget.segments) expect(geometry().find(row => row.id === segment.id).percent).toBeCloseTo(segment.fraction * 100, 10); };

  it('keeps proportional geometry hidden from assistive tech and provides named HTML readings instead', async () => {
    await mount(); expect(explorer()).toBeTruthy(); expect(explorer().querySelector('.circuit-voltage-graphic').getAttribute('aria-hidden')).toBe('true');
    expect(explorer().querySelector('.circuit-voltage-graphic').querySelector('button,input,select,[tabindex]')).toBeNull();
    for (const text of ['Supply voltage', 'Lamp drop', 'Transistor drop', 'Collector above common return', 'Lamp current']) expect(explorer().textContent).toContain(text);
    expect(explorer().querySelector('.circuit-voltage-reading[data-voltage-part="lamp"]').textContent).toContain('660.00 mV'); expect(explorer().querySelector('.circuit-voltage-reading[data-voltage-part="transistor"]').textContent).toMatch(/4\.34\s?V/); assertGeometry();
  });

  it('places each ordered measurement pair without changing electrical history, saved work or view', async () => {
    await mount({ view: '3d' }); const saved = measureState(latest);
    await click('Measure lamp drop'); expect([latest.probeRed, latest.probeBlack]).toEqual(['supply', 'collector']); expect(button('Measure lamp drop').getAttribute('aria-pressed')).toBe('true'); expect(button('Measure transistor drop').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('output[aria-label="Active voltmeter reading"]').textContent).toContain('660.00 mV'); expect(measureState(latest)).toEqual(saved);
    await click('Measure transistor drop'); expect([latest.probeRed, latest.probeBlack]).toEqual(['collector', 'emitter']); expect(button('Measure transistor drop').getAttribute('aria-pressed')).toBe('true'); expect(measureState(latest)).toEqual(saved);
  });

  it('does not mark a reversed or custom lead pair selected, even though the physical drops remain positive', async () => {
    await mount(); await click('Measure lamp drop'); await click('Reverse active probes');
    expect([latest.probeRed, latest.probeBlack]).toEqual(['collector', 'supply']); expect(button('Measure lamp drop').getAttribute('aria-pressed')).toBe('false'); expect(button('Measure transistor drop').getAttribute('aria-pressed')).toBe('false'); expect(host.querySelector('output[aria-label="Active voltmeter reading"]').textContent).toContain('-660.00 mV');
    expect(explorer().querySelector('.circuit-voltage-reading[data-voltage-part="lamp"]').textContent).toContain('660.00 mV');
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, probeRed: 'base', probeBlack: 'drive' } })));
    expect(button('Measure lamp drop').getAttribute('aria-pressed')).toBe('false'); expect(button('Measure transistor drop').getAttribute('aria-pressed')).toBe('false'); expect([latest.probeRed, latest.probeBlack]).toEqual(['base', 'drive']); assertGeometry();
  });

  it('updates the bar and accessible readings when the input turns off, without implying zero voltage', async () => {
    await mount(); await click('Input off'); assertGeometry(); expect(geometry()).toEqual([{ id: 'lamp', percent: 0 }, { id: 'transistor', percent: 100 }]);
    expect(explorer().querySelector('.circuit-voltage-reading[data-voltage-part="transistor"]').textContent).toMatch(/5\.00\s?V/); expect(explorer().textContent).toMatch(/voltage.*without current|no lamp current/i); expect(latest.observations[0].note).toBe('Saved before this exploration.');
  });

  it('follows region-explorer actions through cutoff, active operation and saturation', async () => {
    await mount();
    for (const region of ['cutoff', 'active', 'saturated']) { const action = host.querySelector('.circuit-region-card[data-region="' + region + '"] button'); expect(action.disabled).toBe(false); await act(async () => action.click()); expect(api.circuitActiveVoltageBudget(latest).region).toBe(region); assertGeometry(); }
  });

  it('keeps the selected measurement and geometry while changing board views', async () => {
    await mount(); await click('Measure lamp drop'); const before = geometry(), saved = clone(latest.observations), history = clone(latest.undo);
    await click('3D experiment board'); expect(latest.view).toBe('3d'); expect(geometry()).toEqual(before); expect(button('Measure lamp drop').getAttribute('aria-pressed')).toBe('true');
    await click('NPN schematic'); expect(latest.view).toBe('schematic'); expect(geometry()).toEqual(before); expect(latest.observations).toEqual(saved); expect(latest.undo).toEqual(history);
  });

  it('offers six visible writing rows and a quiet character count with a reasoning cue', async () => {
    await mount(); const field = host.querySelector('.circuit-notebook-reflection'), count = host.querySelector('.circuit-reflection-count');
    expect(field.rows).toBeGreaterThanOrEqual(6); expect(field.maxLength).toBe(4000); expect(count.textContent).toContain(String(latest.reflection.length)); expect(count.textContent).toMatch(/4,?000/); expect(count.closest('[aria-live], [role="status"]')).toBeNull(); expect(host.querySelector('.circuit-reflection-cue').textContent.length).toBeGreaterThan(20);
  });

  it('expands and reduces the same textarea while preserving writing, caret direction, focus and all stored state', async () => {
    await mount(); const field = host.querySelector('.circuit-notebook-reflection'), before = JSON.stringify(latest), rows = field.rows, toggle = button('Expand writing space'); field.focus(); field.setSelectionRange(5, 18, 'backward'); toggle.focus();
    expect(toggle.getAttribute('aria-controls')).toBe(field.id); await click('Expand writing space'); expect(host.querySelector('.circuit-notebook-reflection')).toBe(field); expect(field.rows).toBeGreaterThan(rows); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([5, 18, 'backward']); expect(document.activeElement).toBe(toggle); expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(JSON.stringify(latest)).toBe(before);
    await click('Reduce writing space'); expect(host.querySelector('.circuit-notebook-reflection')).toBe(field); expect(field.rows).toBe(rows); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([5, 18, 'backward']); expect(document.activeElement).toBe(toggle); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(JSON.stringify(latest)).toBe(before);
  });

  it('retains expansion across live circuit changes and updates the quiet count without taking focus', async () => {
    await mount(); await click('Expand writing space'); const field = host.querySelector('.circuit-notebook-reflection'), rows = field.rows;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, 'β increases base drive.'); field.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(latest.reflection).toBe('β increases base drive.'); expect(host.querySelector('.circuit-reflection-count').textContent).toContain(String(latest.reflection.length));
    const input = host.querySelector('input[aria-label="Input voltage (V) exact value"]'); input.focus(); await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 2.3 } })));
    expect(document.activeElement).toBe(input); expect(host.querySelector('.circuit-notebook-reflection')).toBe(field); expect(field.rows).toBe(rows); expect(latest.reflection).toBe('β increases base drive.');
  });

  it('makes the explicit size control work after a manual resize without clearing other styles or moving the caret', async () => {
    await mount(); const field = host.querySelector('.circuit-notebook-reflection'), value = field.value, rows = field.rows, toggle = button('Expand writing space'); field.style.height = '500px'; field.style.width = '92%'; field.setSelectionRange(4, 16, 'backward'); toggle.focus();
    await click('Expand writing space'); expect(host.querySelector('.circuit-notebook-reflection')).toBe(field); expect(field.style.height).toBe(''); expect(field.style.width).toBe('92%'); expect(field.rows).toBeGreaterThan(rows); expect(field.value).toBe(value); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 16, 'backward']); expect(document.activeElement).toBe(toggle);
    field.style.height = '700px'; await click('Reduce writing space'); expect(field.style.height).toBe(''); expect(field.style.width).toBe('92%'); expect(field.rows).toBe(rows); expect(field.value).toBe(value); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 16, 'backward']); expect(document.activeElement).toBe(toggle);
  });
});
