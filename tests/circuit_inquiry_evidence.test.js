import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const part = (value = 100, id = 41) => ({ type: 'resistor', value, id });
const circuit = (voltage = 9, value = 100, id = 41) => ({ mode: 'series', voltage, components: [part(value, id)] });
const trial = (voltage, note = '') => ({ before: circuit(), after: circuit(voltage), prediction: 'Supply changes current.', explanation: note, delta: (voltage - 9) / 100, controlled: true, changes: ['supply: 9 V → ' + voltage + ' V'] });
let api, config, host, root, latest, update;

beforeEach(() => {
  const canvas = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
  resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function mount(seed = {}) {
  function Harness() {
    const [toolData, setToolData] = React.useState({ _circuit: { ...circuit(), pauseMotion: true, prediction: 'The current will halve.', ...seed } });
    latest = toolData._circuit; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData }));
  }
  await act(async () => root.render(React.createElement(Harness)));
}
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent === text);
const panel = () => host.querySelector('.circuit-lab-workflow');
const electrical = state => ({ mode: state.mode, voltage: state.voltage, components: state.components });
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
function dispatchText(field, value) { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); }
async function write(field, value) {
  expect(field).toBeTruthy();
  await act(async () => dispatchText(field, value));
}
async function changedComparison() { await mount(); await click(button('Save baseline')); await click(button('Double resistance')); }
const notebookField = n => host.querySelector('textarea[aria-label="Trial ' + n + ' explanation"]');

describe('Investigation comparison identity', () => {
  it('ignores regenerated IDs, explicit defaults, and unrelated stored fields without mutating inputs', () => {
    const before = { components: [{ type: 'resistor', id: 90 }, { type: 'switch', id: 91 }, { type: 'led', id: 92 }] };
    const after = { ...before, voltage: 12 };
    const explicit = voltage => ({ mode: 'series', voltage, components: [{ type: 'resistor', value: 100, id: 1, note: 'ignored' }, { type: 'switch', value: 100, closed: false, id: 2 }, { type: 'led', value: 100, ledColor: '#ef4444', reversed: false, id: 3 }], cameraYaw: 60 });
    const original = JSON.stringify([before, after]);
    expect(api.circuitInvestigationComparisonKey(before, after)).toBe(api.circuitInvestigationComparisonKey(explicit(9), explicit(12)));
    expect(JSON.stringify([before, after])).toBe(original);
  });

  it.each([
    ['voltage', { voltage: 12 }],
    ['connection', { mode: 'parallel' }],
    ['resistance', { components: [part(200)] }],
    ['part count', { components: [part(), part(100, 42)] }]
  ])('keeps a different %s comparison distinct', (_name, patch) => {
    const base = circuit(), after = { ...base, ...patch };
    expect(api.circuitInvestigationComparisonKey(base, after)).not.toBe(api.circuitInvestigationComparisonKey(base, base));
    expect(api.circuitInvestigationComparisonKey(base, after)).not.toBe(api.circuitInvestigationComparisonKey(after, base));
  });

  it('deduplicates LED colors with the same modeled forward voltage while retaining electrical differences', () => {
    const design = (ledColor, voltage) => ({ mode: 'series', voltage, components: [part(470), { type: 'led', id: 42, ledColor, reversed: false }] });
    const key = color => api.circuitInvestigationComparisonKey(design(color, 9), design(color, 12));
    expect(key('#3b82f6')).toBe(key('#f8fafc')); expect(key('#3b82f6')).not.toBe(key('#ef4444'));
  });
});

describe('Saved investigation evidence', () => {
  it('records one frozen comparison when Record is activated twice before a render', async () => {
    await changedComparison(); const record = button('Record comparison'), history = latest.undo.length;
    await act(async () => { record.click(); record.click(); });
    expect(latest.observations).toHaveLength(1);
    expect(latest.observations[0]).toMatchObject({ before: circuit(), after: circuit(9, 200), prediction: 'The current will halve.' });
    expect(latest.observations[0].delta).toBeCloseTo(-.045, 12);
    expect(latest.undo).toHaveLength(history); expect(button('Record comparison').disabled).toBe(true);
  });

  it('revises a recorded explanation from the main field and exports the revised evidence', async () => {
    await changedComparison(); await click(button('Record comparison'));
    const before = JSON.stringify({ before: latest.observations[0].before, after: latest.observations[0].after, prediction: latest.observations[0].prediction });
    const history = JSON.stringify(latest.undo);
    await write(host.querySelector('#circuit-explanation'), '90 mA became 45 mA because resistance doubled.');
    expect(latest.observations[0].explanation).toBe('90 mA became 45 mA because resistance doubled.');
    expect(notebookField(1).value).toBe(latest.observations[0].explanation);
    expect(JSON.stringify({ before: latest.observations[0].before, after: latest.observations[0].after, prediction: latest.observations[0].prediction })).toBe(before);
    expect(JSON.stringify(latest.undo)).toBe(history);
    let exported;
    vi.stubGlobal('URL', { createObjectURL: blob => { exported = blob; return 'blob:inquiry-test'; }, revokeObjectURL() {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click(button('Download evidence'));
    const text = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(exported); });
    expect(JSON.parse(text).trials[0].explanation).toBe(latest.observations[0].explanation);
  });

  it('edits an older trial independently and keeps both evidence editors in sync for the current comparison', async () => {
    const observations = [trial(10, 'First'), trial(12, 'Second')];
    await mount({ ...circuit(12), experimentBaseline: { circuit: circuit(), prediction: 'Supply changes current.' }, observations });
    await write(notebookField(1), 'Revised first trial');
    expect(latest.observations.map(o => o.explanation)).toEqual(['Revised first trial', 'Second']);
    await write(notebookField(2), 'Revised current trial');
    expect(host.querySelector('#circuit-explanation').value).toBe('Revised current trial');
    expect(latest.observations[0].after.voltage).toBe(10); expect(latest.undo || []).toHaveLength(0);
  });

  it('edits and removes only the second legacy duplicate trial, retaining the first trial and its note', async () => {
    const first = trial(12, 'Legacy note A'), second = { ...trial(12, 'Legacy note B'), before: circuit(9, 100, 1), after: circuit(12, 100, 1) };
    await mount({ ...circuit(12), experimentBaseline: { circuit: circuit(), prediction: '' }, observations: [first, second] });
    await write(notebookField(2), 'Revised legacy note B');
    expect(latest.observations.map(item => item.explanation)).toEqual(['Legacy note A', 'Revised legacy note B']);
    await click(button('Remove trial 2'));
    expect(latest.observations).toEqual([first]); expect(latest.removedObservation.entry.explanation).toBe('Revised legacy note B');
  });

  it('the main explanation editor revises only the displayed first legacy duplicate', async () => {
    const first = trial(12, 'Legacy note A'), second = { ...trial(12, 'Legacy note B'), before: circuit(9, 100, 1), after: circuit(12, 100, 1) };
    await mount({ ...circuit(12), experimentBaseline: { circuit: circuit(), prediction: '' }, observations: [first, second] });
    expect(host.querySelector('#circuit-explanation').value).toBe('Legacy note A');
    await write(host.querySelector('#circuit-explanation'), 'Revised displayed legacy note A');
    expect(latest.observations.map(item => item.explanation)).toEqual(['Revised displayed legacy note A', 'Legacy note B']);
    expect(notebookField(2).value).toBe('Legacy note B');
  });

  it('deduplicates the same electrical comparison after a real file import regenerates component IDs', async () => {
    await changedComparison(); await click(button('Record comparison'));
    const json = JSON.stringify(api.circuitDesignDocument(latest));
    const input = host.querySelector('#circuit-design-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ size: json.length, text: () => Promise.resolve(json) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    await click(button('Load this circuit'));
    expect(latest.components[0].id).toBe(1); expect(latest.observations[0].after.components[0].id).toBe(41);
    expect(button('Record comparison').disabled).toBe(true); expect(latest.observations).toHaveLength(1);
  });

  it('recognizes a legacy saved comparison with no canonical key', async () => {
    const saved = trial(12, 'Existing evidence'); saved.comparisonKey = 'old raw JSON key';
    await mount({ ...circuit(12, 100, 1), experimentBaseline: { circuit: circuit(), prediction: 'Supply changes current.' }, observations: [saved] });
    expect(button('Record comparison').disabled).toBe(true); expect(notebookField(1).value).toBe('Existing evidence');
  });

  it('preserves all eight trials when full and explains how to make room', async () => {
    const observations = Array.from({ length: 8 }, (_, i) => trial(i + 1, 'Evidence ' + i));
    await mount({ ...circuit(10), experimentBaseline: { circuit: circuit(), prediction: '' }, observations });
    expect(button('Record comparison').disabled).toBe(true); expect(panel().textContent).toMatch(/full/i);
    expect(panel().textContent).toMatch(/remove/i); expect(latest.observations).toEqual(observations);
  });

  it('removes and restores a trial at its original position without changing the circuit or electrical history', async () => {
    const observations = [trial(10, 'First'), trial(11, 'Second'), trial(12, 'Third')];
    await mount({ observations }); const original = JSON.stringify(electrical(latest));
    await click(button('Remove trial 2')); expect(latest.observations.map(o => o.explanation)).toEqual(['First', 'Third']);
    await click(button('Restore removed trial')); expect(latest.observations).toEqual(observations);
    expect(JSON.stringify(electrical(latest))).toBe(original); expect(latest.undo || []).toHaveLength(0);
    expect(button('Restore removed trial')?.disabled ?? true).toBe(true);
  });

  it('guards capacity when Record and Restore are activated in the same batch', async () => {
    await mount({ ...circuit(10), experimentBaseline: { circuit: circuit(), prediction: '' }, observations: Array.from({ length: 8 }, (_, i) => trial(i + 1, 'Evidence ' + i)) });
    await click(button('Remove trial 1')); const record = button('Record comparison'), restore = button('Restore removed trial');
    await act(async () => { record.click(); restore.click(); });
    expect(latest.observations).toHaveLength(8); expect(latest.observations.some(o => o.after.voltage === 10)).toBe(true);
    expect(latest.observations.some(o => o.after.voltage === 1)).toBe(false); expect(panel().textContent).toMatch(/full/i);
  });

  it('does not restore a duplicate after the removed comparison has been recorded again', async () => {
    await mount({ ...circuit(12), experimentBaseline: { circuit: circuit(), prediction: 'Supply changes current.' }, observations: [trial(12, 'Original explanation')] });
    await click(button('Remove trial 1')); const record = button('Record comparison'), restore = button('Restore removed trial');
    await act(async () => { record.click(); restore.click(); });
    expect(latest.observations).toHaveLength(1); expect(latest.observations[0].after.voltage).toBe(12);
    expect(panel().textContent).toMatch(/already/i); expect(button('Restore removed trial')).toBeTruthy();
  });

  it('keeps the first removed trial recoverable when making room after the notebook fills again', async () => {
    await mount({ ...circuit(10), experimentBaseline: { circuit: circuit(), prediction: '' }, observations: Array.from({ length: 8 }, (_, i) => trial(i + 1, 'Evidence ' + (i + 1))) });
    await click(button('Remove trial 1')); await click(button('Record comparison'));
    expect(latest.observations).toHaveLength(8); expect(latest.removedObservation.entry.explanation).toBe('Evidence 1');
    await click(button('Remove trial 1'));
    expect(latest.removedObservation.entry.explanation).toBe('Evidence 1');
    await click(button('Restore removed trial'));
    expect(latest.observations).toHaveLength(8); expect(latest.observations[0]).toMatchObject({ after: { voltage: 1 }, explanation: 'Evidence 1' });
    expect(latest.removedObservation.entry.explanation).toBe('Evidence 2');
  });

  it('stops another removal when eight recoverable trials are already waiting', async () => {
    const pending = Array.from({ length: 8 }, (_, i) => ({ entry: trial(i + 1, 'Recovery ' + (i + 1)), index: i }));
    await mount({ observations: [trial(12, 'Keep the active trial')], removedObservations: pending, removedObservation: pending[0] });
    expect(button('Remove trial 1').disabled).toBe(true);
    expect(latest.removedObservations).toEqual(pending); expect(latest.observations[0].explanation).toBe('Keep the active trial');
    expect(panel().textContent).toMatch(/discard/i); expect(latest.undo || []).toHaveLength(0);
  });

  it('discards only the selected recoverable trial and frees a recovery slot without changing circuit history', async () => {
    const pending = Array.from({ length: 8 }, (_, i) => ({ entry: trial(i + 1, 'Recovery ' + (i + 1)), index: i }));
    await mount({ observations: [trial(12, 'Keep the active trial')], removedObservations: pending, removedObservation: pending[0] });
    const original = JSON.stringify(electrical(latest)); await click(button('Discard removed trial 2'));
    expect(latest.removedObservations.map(item => item.entry.explanation)).toEqual(['Recovery 1', 'Recovery 3', 'Recovery 4', 'Recovery 5', 'Recovery 6', 'Recovery 7', 'Recovery 8']);
    expect(latest.removedObservation.entry.explanation).toBe('Recovery 1'); expect(button('Remove trial 1').disabled).toBe(false);
    expect(JSON.stringify(electrical(latest))).toBe(original); expect(latest.observations[0].explanation).toBe('Keep the active trial'); expect(latest.undo || []).toHaveLength(0);
  });

  it.each(['restore', 'discard'])('a stale pending %s callback cannot act on the entry shifted into its old slot', async action => {
    const pending = [{ entry: trial(10, 'Recovery A'), index: 0 }, { entry: trial(11, 'Recovery B'), index: 0 }];
    await mount({ observations: [trial(12, 'Active trial')], removedObservations: pending, removedObservation: pending[0] });
    const element = button(action === 'restore' ? 'Restore removed trial' : 'Discard removed trial');
    const oldClick = element[Object.keys(element).find(key => key.startsWith('__reactProps$'))].onClick;
    await click(button(action === 'restore' ? 'Discard removed trial' : 'Restore removed trial'));
    const observations = JSON.stringify(latest.observations);
    await act(async () => oldClick({ currentTarget: element }));
    expect(latest.removedObservations.map(item => item.entry.explanation)).toEqual(['Recovery B']);
    expect(JSON.stringify(latest.observations)).toBe(observations); expect(latest.undo || []).toHaveLength(0);
  });

  it('a captured Discard callback removes only one of two identical-content recovery objects', async () => {
    const first = { entry: trial(10, 'Same saved text'), index: 0 }, second = JSON.parse(JSON.stringify(first));
    await mount({ observations: [trial(12, 'Active trial')], removedObservations: [first, second], removedObservation: first });
    const element = button('Discard removed trial'), oldClick = element[Object.keys(element).find(key => key.startsWith('__reactProps$'))].onClick;
    await act(async () => { oldClick({ currentTarget: element }); oldClick({ currentTarget: element }); });
    expect(latest.removedObservations).toHaveLength(1); expect(latest.removedObservations[0]).toEqual(second);
    expect(latest.observations[0].explanation).toBe('Active trial'); expect(latest.undo || []).toHaveLength(0);
  });

  it('a stale trial explanation handler cannot edit the trial shifted into its former position', async () => {
    await mount({ observations: [trial(10, 'First'), trial(11, 'Second')] });
    const firstField = notebookField(1), remove = button('Remove trial 1');
    await act(async () => { remove.click(); dispatchText(firstField, 'Stale edit of the removed trial'); });
    expect(latest.observations).toHaveLength(1); expect(latest.observations[0]).toMatchObject({ after: { voltage: 11 }, explanation: 'Second' });
  });

  it('a stale Remove handler activated twice removes only the displayed trial', async () => {
    await mount({ observations: [trial(10, 'First'), trial(11, 'Second'), trial(12, 'Third')] });
    const remove = button('Remove trial 1'); await act(async () => { remove.click(); remove.click(); });
    expect(latest.observations.map(o => o.explanation)).toEqual(['Second', 'Third']);
  });

  it('a captured main explanation handler stays with its displayed comparison after a supply change', async () => {
    await mount({ ...circuit(10), experimentBaseline: { circuit: circuit(), prediction: '' }, observations: [trial(10, 'First'), trial(12, 'Second')] });
    const field = host.querySelector('#circuit-explanation'), supply = host.querySelector('input[type="range"][min="0"][max="24"]');
    expect(field).toBeTruthy(); expect(supply).toBeTruthy();
    // Controlled input events may render synchronously and replace the props on
    // this same DOM node. Capture the original callback to exercise stale work.
    const oldChange = field[Object.keys(field).find(key => key.startsWith('__reactProps$'))].onChange;
    expect(typeof oldChange).toBe('function');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(supply, '12'); supply.dispatchEvent(new Event('input', { bubbles: true }));
      oldChange({ target: { value: 'Revised evidence for the displayed 10 V comparison' } });
    });
    expect(latest.voltage).toBe(12); expect(latest.observations.map(o => o.explanation)).toEqual(['Revised evidence for the displayed 10 V comparison', 'Second']);
    expect(host.querySelector('#circuit-explanation').value).toBe('Second');
  });

  it.each(['1. Share the voltage', '2. Add another path', '3. Control the loop'])('preserves the investigation baseline through %s and Undo', async label => {
    await changedComparison(); await write(host.querySelector('#circuit-explanation'), 'Keep my unfinished explanation.');
    const original = JSON.stringify(electrical(latest)), baseline = JSON.stringify(latest.experimentBaseline);
    await click(button(label)); await click(button('Undo'));
    expect(JSON.stringify(electrical(latest))).toBe(original); expect(JSON.stringify(latest.experimentBaseline)).toBe(baseline);
    expect(latest.explanation).toBe('Keep my unfinished explanation.'); expect(latest.prediction).toBe('The current will halve.');
  });
});
