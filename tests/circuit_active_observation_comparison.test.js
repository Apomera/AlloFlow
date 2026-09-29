import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, config;
const point = (input, note = '', extra = {}) => api.circuitActiveObservation({ input, ...extra }, note);
const compare = (a, b) => api.circuitActiveObservationComparison(a, b);
const clone = value => JSON.parse(JSON.stringify(value));
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });

describe('Comparing two saved Active operating points', () => {
  it('recomputes both saved circuits and signed physical deltas without consulting the live bench', () => {
    const first = point(1, 'First'), second = point(1.5, 'Second'), originals = JSON.stringify([first, second]);
    const result = compare(first, second);
    expect(result.before.collectorCurrent).toBeCloseTo(.003, 12); expect(result.after.collectorCurrent).toBeCloseTo(.008, 12);
    expect(result.delta.collectorCurrent).toBeCloseTo(.005, 12); expect(result.delta.collectorVoltage).toBeCloseTo(-1.1, 12);
    expect(result.delta.baseCurrent).toBeCloseTo(.00005, 12); expect(result.delta.loadPower).toBeCloseTo(.0121, 12);
    expect(result.controlled).toBe(true); expect(result.kind).toBe('one-setting'); expect(result.changes.map(change => change.key)).toEqual(['input']); expect(JSON.stringify([first, second])).toBe(originals);
  });

  it('reverses every signed delta when the selected order is reversed', () => {
    const a = point(1), b = point(1.5), forward = compare(a, b), reverse = compare(b, a);
    for (const field of ['baseCurrent', 'collectorCurrent', 'collectorVoltage', 'loadPower', 'probeVoltage']) expect(reverse.delta[field]).toBeCloseTo(-forward.delta[field], 12);
    expect(reverse.before.design).toEqual(b.design); expect(reverse.after.design).toEqual(a.design);
  });

  it('ignores note edits and physically inactive settings when describing the change', () => {
    const a = point(1, 'Before', { light: 1, dividerResistance: 1000 }), b = point(1, 'Revised note', { light: 99, dividerResistance: 90000 });
    expect(compare(a, b)).toMatchObject({ kind: 'unchanged', circuitUnchanged: true, unchanged: true, controlled: false });
    expect(compare(point(1, '', { project: 'light' }), point(5, '', { project: 'light' })).changes).toEqual([]);
  });

  it('distinguishes several electrical edits from a controlled single-setting experiment', () => {
    const result = compare(point(1), point(1.5, '', { supply: 7 }));
    expect(result.kind).toBe('multiple-settings'); expect(result.controlled).toBe(false); expect(result.changes.map(change => change.key).sort()).toEqual(['input', 'supply']);
  });

  it.each([['manual', 'light'], ['light', 'dark']])('treats %s → %s as different circuits even if the project is the only changed field', (a, b) => {
    const result = compare(point(1, '', { project: a }), point(1, '', { project: b }));
    expect(result.typeChanged).toBe(true); expect(result.sameProject).toBe(false); expect(result.controlled).toBe(false); expect(result.kind).toBe('different-circuits');
    expect(typeof result.inputBefore).toBe('string'); expect(result.inputBefore.length).toBeGreaterThan(0); expect(result.inputAfter.length).toBeGreaterThan(0);
  });

  it('keeps signed probe readings but withholds a misleading delta for different lead pairs', () => {
    const result = compare(point(1, '', { probeRed: 'drive', probeBlack: 'base' }), point(1, '', { probeRed: 'base', probeBlack: 'drive' }));
    expect(result.probeBefore.voltage).toBeCloseTo(.3, 12); expect(result.probeAfter.voltage).toBeCloseTo(-.3, 12);
    expect(result.probeComparable).toBe(false); expect(result.probeSame).toBe(false); expect(result.delta.probeVoltage).toBeNull(); expect(result.kind).toBe('probe-only'); expect(result.circuitUnchanged).toBe(true);
  });

  it('reports an ordered same-pair probe delta, including negative readings', () => {
    const leads = { probeRed: 'base', probeBlack: 'drive' }, result = compare(point(1, '', leads), point(1.5, '', leads));
    expect(result.probeBefore.voltage).toBeCloseTo(-.3, 12); expect(result.probeAfter.voltage).toBeCloseTo(-.8, 12); expect(result.delta.probeVoltage).toBeCloseTo(-.5, 12); expect(result.probeComparable).toBe(true);
  });

  it('returns no comparison until both valid-shaped saved observations exist', () => {
    for (const invalid of [null, undefined, {}, { design: [] }, { design: null }]) expect(compare(invalid, point(1))).toBeNull();
    expect(compare(point(1), null)).toBeNull();
  });

  it('keeps the existing portable file format and excludes transient comparison/recovery UI state', () => {
    const state = { input: 4.2, observations: [point(1, 'First authored note'), point(1.5, 'Second authored note')], removedObservations: [{ entry: point(2, 'Pending'), index: 0 }], notebookFocusIndex: 1, notebookFocusToken: 9, comparisonFirst: 0, comparisonSecond: 1 };
    const doc = api.circuitActiveInvestigation(state), restored = api.parseCircuitInvestigation(JSON.stringify(doc));
    expect(doc.format).toBe('circuit-investigation-v1'); expect(Object.keys(doc.notebook).sort()).toEqual(['explanation', 'observations', 'prediction', 'question', 'title']);
    expect(restored.observations).toEqual(state.observations); expect(restored.removedObservations).toBeUndefined(); expect(restored.notebookFocusToken).toBeUndefined();
    const report = new DOMParser().parseFromString(api.circuitActiveReport(state), 'text/html');
    expect(report.body.textContent).toContain('First authored note'); expect(report.body.textContent).toContain('Second authored note'); expect(report.body.textContent).not.toContain('Pending'); expect(report.body.textContent).toContain('3.00 mA'); expect(report.body.textContent).toContain('8.00 mA');
  });
});

describe('Saved observation comparison interactions', () => {
  let host, root, latest, update;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  async function mount(observations = [point(1, 'A'), point(1.5, 'B')]) {
    function Harness() { const [toolData, setToolData] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: { input: 4.2, view: 'schematic', notebookOpen: true, observations, reflection: 'Independent notebook explanation.', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Independent lesson.' } } } }); latest = toolData._circuitActive; update = setToolData; return config.render(makeCtx({ toolData, setToolData })); }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const comparePanel = () => host.querySelector('.circuit-observation-compare');
  const result = () => host.querySelector('.circuit-observation-comparison');
  const select = label => host.querySelector('select[aria-label="' + label + '"]');
  async function choose(label, index) { const field = select(label); expect(field).toBeTruthy(); const options = [...field.options].filter(option => option.value !== ''); expect(options[index]).toBeTruthy(); await act(async () => { field.value = options[index].value; field.dispatchEvent(new Event('change', { bubbles: true })); }); }
  const button = name => [...host.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === name || el.textContent === name);
  const callback = (el, event) => el[Object.keys(el).find(key => key.startsWith('__reactProps$'))][event];
  const pickPair = async () => { await choose('First saved observation', 0); await choose('Second saved observation', 1); };

  it('defaults to the first two points and keeps selected evidence independent of live/note edits', async () => {
    await mount(); expect(comparePanel()).toBeTruthy(); expect(result()).toBeTruthy(); const original = clone(latest);
    expect(result().querySelector('[data-saved-point="before"]').textContent).toContain('3.00 mA'); expect(result().querySelector('[data-saved-point="after"]').textContent).toContain('8.00 mA');
    await choose('First saved observation', 1); await choose('Second saved observation', 0); expect(result().querySelector('[data-saved-point="before"]').textContent).toContain('8.00 mA'); expect(result().querySelector('[data-saved-point="after"]').textContent).toContain('3.00 mA');
    await pickPair(); const firstValue = select('First saved observation').value, secondValue = select('Second saved observation').value;
    expect(result().textContent).toContain('3.00 mA'); expect(result().textContent).toContain('8.00 mA'); expect(result().textContent).toContain('Second − first'); expect(latest).toEqual(original);
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: .1 } })));
    const note = host.querySelector('textarea[aria-label="Observation 1 note"]'); await act(async () => callback(note, 'onChange')({ target: { value: 'Revised A' } }));
    expect(select('First saved observation').value).toBe(firstValue); expect(select('Second saved observation').value).toBe(secondValue); expect(result().textContent).toContain('3.00 mA'); expect(result().textContent).toContain('8.00 mA'); expect(latest.input).toBe(.1); expect(latest.reflection).toBe(original.reflection); expect(latest.lessonRecords).toEqual(original.lessonRecords);
  });

  it('clears a removed selected point instead of comparing whichever row shifts into its position', async () => {
    await mount([point(1, 'A'), point(1.5, 'B'), point(2, 'C')]); await pickPair(); const secondValue = select('Second saved observation').value;
    await act(async () => button('Remove observation 1').click());
    expect(select('First saved observation').value).toBe(''); expect(select('Second saved observation').value).toBe(secondValue); expect(result()).toBeNull(); expect(latest.observations.map(o => o.note)).toEqual(['B', 'C']);
  });

  it('clears selected identities after loading replacement entries, even if the readings match', async () => {
    await mount(); await pickPair(); await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, observations: clone(prev._circuitActive.observations) } })));
    expect(select('First saved observation').value).toBe(''); expect(select('Second saved observation').value).toBe(''); expect(result()).toBeNull();
  });

  it('shows different-circuit feedback and signed lead readings without presenting unlike probes as a delta', async () => {
    await mount([point(1, 'Manual', { probeRed: 'base', probeBlack: 'drive' }), point(1, 'Sensor', { project: 'light', probeRed: 'supply', probeBlack: 'emitter' })]); await pickPair();
    expect(result().querySelector('.circuit-observation-comparison-status').textContent).toMatch(/different circuits|circuit type/i); expect(result().textContent).toContain('-300.00 mV'); expect(result().textContent).toMatch(/5\.00\s?V/);
    expect(result().textContent).toMatch(/different.*probe|probe.*different|different.*lead|lead.*different/i);
  });
});
