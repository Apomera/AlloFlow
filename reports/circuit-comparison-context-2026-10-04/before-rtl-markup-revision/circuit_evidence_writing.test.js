import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, config;
const clone = value => JSON.parse(JSON.stringify(value));
const point = (input, note = '', extra = {}) => api.circuitActiveObservation({ input, ...extra }, note);
const fixture = extra => ({ input: 4.2, probeRed: 'supply', probeBlack: 'base', view: 'schematic', notebookOpen: true, reflection: '  My own explanation.\nKeep this line.  ', investigationTitle: 'Independent investigation', investigationQuestion: 'What changes?', investigationPrediction: 'Current rises.', observations: [point(1, 'First'), point(1.5, 'Second')], lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Guided work stays independent.' } }, reference: { version: 1, design: api.circuitActiveDesign({ input: .8 }) }, undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...extra });
const evidence = (first, second) => api.circuitActiveComparisonEvidence(first, second);
const targetFor = state => ({ first: state.observations[0], second: state.observations[1], observations: state.observations });
const append = (state, target = targetFor(state)) => api.circuitActiveNotebookUpdate(state, 'appendEvidence', target);
const protectedFields = state => clone(Object.fromEntries(Object.entries(state).filter(([key]) => !['reflection', 'notebookOpen', 'reflectionFocusToken', 'investigationNotice'].includes(key))));

beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });

describe('Self-contained saved-comparison evidence', () => {
  it('recomputes both saved measurements and includes settings, units and signed physical changes', () => {
    const a = point(1, 'Private note A'), b = point(1.5, 'Private note B'); a.collectorCurrent = 999;
    const before = JSON.stringify([a, b]), result = evidence(a, b);
    expect(result.kind).toBe('one-setting'); expect(result.text).toContain('3.00 mA'); expect(result.text).toContain('8.00 mA'); expect(result.text).toContain('+5.00 mA');
    expect(result.text).toMatch(/input.*1\s?V/i); expect(result.text).toMatch(/input.*1\.5\s?V/i); expect(result.text).toMatch(/base.*resistance|RB|base resistor/i); expect(result.text).toMatch(/supply|VCC/i); expect(result.text).toMatch(/gain|β/); expect(result.text).toMatch(/active/i);
    expect(result.text).not.toContain('999'); expect(result.text).not.toContain('Private note'); expect(result.prompt.length).toBeGreaterThan(20); expect(JSON.stringify([a, b])).toBe(before);
  });

  it('includes negative same-pair probe readings and a signed voltage change', () => {
    const pair = { probeRed: 'base', probeBlack: 'drive' }, result = evidence(point(1, '', pair), point(1.5, '', pair));
    expect(result.text).toContain('-300.00 mV'); expect(result.text).toContain('-800.00 mV'); expect(result.text).toContain('-500.00 mV'); expect(result.text).toMatch(/base.*drive/);
  });

  it('describes different probe connections individually and omits a misleading voltage delta', () => {
    const result = evidence(point(1, '', { probeRed: 'drive', probeBlack: 'base' }), point(1, '', { probeRed: 'base', probeBlack: 'drive' }));
    expect(result.kind).toBe('probe-only'); expect(result.text).toContain('300.00 mV'); expect(result.text).toContain('-300.00 mV'); expect(result.text).not.toContain('-600.00 mV'); expect(result.text).toMatch(/probe connections differ|unlike pairs|different.*connections/i);
    expect(result.prompt).toMatch(/probe|lead|connection/i);
  });

  it('distinguishes changed circuit types and records each input in its own units', () => {
    const result = evidence(point(1, '', { project: 'manual' }), point(4, '', { project: 'light', light: 20 }));
    expect(result.kind).toBe('different-circuits'); expect(result.text).toMatch(/manual/i); expect(result.text).toMatch(/light sensor/i); expect(result.text).toMatch(/20\s*\/\s*100/); expect(result.prompt).toMatch(/different|one.*setting|caus|separate/i);
  });

  it('keeps saturation evidence honest when more input produces no extra lamp current', () => {
    const result = evidence(point(3.3), point(4.5));
    expect(result.kind).toBe('one-setting'); expect(result.text.match(/21\.82 mA/g)).toHaveLength(2); expect(result.text).toMatch(/saturat/i); expect(result.prompt).toMatch(/current|limit|setting|evidence/i);
  });

  it('rejects a missing point or the very same observation selected twice, while allowing distinct legacy entries', () => {
    const a = point(1, 'First'), b = point(1, 'Second');
    expect(evidence(null, b)).toBeNull(); expect(evidence(a, a)).toBeNull(); expect(evidence(a, {})).toBeNull(); expect(evidence(a, b).kind).toBe('unchanged'); expect(evidence(a, b).text).toContain('3.00 mA');
  });
});

describe('Appending evidence without losing student writing', () => {
  it('appends the exact evidence after untouched writing and preserves circuit, notes, history and lessons', () => {
    const state = fixture(), before = JSON.stringify(state), block = evidence(...state.observations).text, result = append(state);
    expect(result.reflection).toBe(state.reflection + '\n\n' + block); expect(result.notebookOpen).toBe(true); expect(result.reflectionFocusToken).toBeGreaterThan(0);
    expect(protectedFields(result)).toEqual(protectedFields(state)); expect(JSON.stringify(state)).toBe(before);
  });

  it('writes an empty explanation without leading separator and uses the latest authored text', () => {
    const original = fixture({ reflection: '' }), target = targetFor(original), block = evidence(target.first, target.second).text;
    expect(append(original, target).reflection).toBe(block);
    const latest = { ...original, reflection: 'A paragraph typed after the button rendered.\n' };
    expect(append(latest, target).reflection).toBe(latest.reflection + '\n\n' + block);
  });

  it('makes duplicate or batched additions idempotent while requesting explanation focus again', () => {
    const state = fixture(), target = targetFor(state), first = append(state, target), second = append(first, target);
    expect(second.reflection).toBe(first.reflection); expect(second.reflectionFocusToken).toBeGreaterThan(first.reflectionFocusToken); expect(protectedFields(second)).toEqual(protectedFields(state));
  });

  it('accepts exactly4000 characters and rejects overflow without truncating any existing writing', () => {
    const initial = fixture(), block = evidence(...initial.observations).text, prefix = 'x'.repeat(4000 - block.length - 2);
    const full = append({ ...initial, reflection: prefix }); expect(full.reflection).toBe(prefix + '\n\n' + block); expect(full.reflection).toHaveLength(4000);
    const tooLong = { ...initial, reflection: prefix + 'x', reflectionFocusToken: 5 }, result = append(tooLong);
    expect(result.reflection).toBe(tooLong.reflection); expect(result.reflectionFocusToken).toBe(5); expect(result.investigationNotice).toMatch(/4000|4,000|room|long|limit/i); expect(protectedFields(result)).toEqual(protectedFields(tooLong));
  });

  it('reviews an already-included block even if the explanation has no room for another copy', () => {
    const state = fixture(), block = evidence(...state.observations).text; state.reflection = block + '\n' + 'x'.repeat(3999 - block.length); state.reflectionFocusToken = 8;
    const result = append(state); expect(result.reflection).toBe(state.reflection); expect(result.reflection).toHaveLength(4000); expect(result.reflectionFocusToken).toBeGreaterThan(8);
  });

  it('allows a unique note-only clone without confusing it with an imported equivalent design', () => {
    const state = fixture(), target = targetFor(state), changedNote = { ...target.first, note: 'Revised after button render' };
    const updated = { ...state, observations: [changedNote, target.second] }; expect(append(updated, target).reflection).toContain(evidence(target.first, target.second).text);
    const imported = { ...state, observations: clone(state.observations) }, rejected = append(imported, target); expect(rejected.reflection).toBe(state.reflection); expect(rejected.reflectionFocusToken).toBeUndefined();
  });

  it('rejects stale removed selections and ambiguous note-only fallback identities', () => {
    const state = fixture(), target = targetFor(state), removed = { ...state, observations: [target.second] };
    expect(append(removed, target).reflection).toBe(state.reflection);
    const twin = { ...target.first, note: 'Same design reference, distinct old entry' }, rendered = [target.first, twin, target.second];
    const ambiguousNow = { ...state, observations: [{ ...target.first, note: 'Updated A' }, { ...twin, note: 'Updated twin' }, target.second] };
    expect(append(ambiguousNow, target).reflection).toBe(state.reflection);
    const uniqueNow = { ...state, observations: [{ ...target.first, note: 'Updated A' }, target.second] };
    expect(append(uniqueNow, { ...target, observations: rendered }).reflection).toBe(state.reflection);
  });

  it('allows exact distinct legacy targets even with equivalent settings but rejects same-entry actions', () => {
    const a = point(1, 'A'), state = fixture({ observations: [a, { ...a, note: 'B' }] }), block = evidence(...state.observations).text;
    expect(append(state).reflection).toBe(state.reflection + '\n\n' + block);
    const rejected = append(state, { first: state.observations[0], second: state.observations[0], observations: state.observations }); expect(rejected.reflection).toBe(state.reflection); expect(rejected.reflectionFocusToken).toBeUndefined();
  });

  it('round-trips the exact combined explanation through JSON and an escaped HTML report', () => {
    const state = append(fixture({ reflection: '<script>my claim</script>\nβ hypothesis → test' })), doc = api.circuitActiveInvestigation(state), parsed = api.parseCircuitInvestigation(JSON.stringify(doc));
    expect(parsed.reflection).toBe(state.reflection); expect(api.circuitActiveInvestigation(parsed)).toEqual(doc);
    const report = new DOMParser().parseFromString(api.circuitActiveReport(state), 'text/html'); expect(report.querySelector('script')).toBeNull(); expect([...report.querySelectorAll('.preserve')].some(element => element.textContent === state.reflection)).toBe(true);
  });
});

describe('Evidence-writing interaction', () => {
  let host, root, latest, update;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  async function mount(extra = {}) {
    function Harness() { const [toolData, setToolData] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: fixture(extra) }); latest = toolData._circuitActive; update = setToolData; return config.render(makeCtx({ toolData, setToolData })); }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const button = label => [...host.querySelectorAll('button')].find(el => el.textContent === label);
  const writer = () => host.querySelector('.circuit-comparison-writing');
  const reflection = () => host.querySelector('textarea.circuit-notebook-reflection');
  const callback = (el, event = 'onClick') => el[Object.keys(el).find(key => key.startsWith('__reactProps$'))][event];
  async function settle() { await act(async () => new Promise(resolve => requestAnimationFrame(resolve))); }
  async function click(label) { const el = button(label); expect(el).toBeTruthy(); await act(async () => el.click()); await settle(); }
  async function chooseSame() { const a = host.querySelector('select[aria-label="First saved observation"]'), b = host.querySelector('select[aria-label="Second saved observation"]'); await act(async () => { b.value = a.value; b.dispatchEvent(new Event('change', { bubbles: true })); }); }

  it('adds the previewed readings once, focuses the explanation and leaves the live bench and lessons intact', async () => {
    await mount(); const original = protectedFields(latest), text = writer().querySelector('.circuit-comparison-writing-preview').textContent, initial = latest.reflection;
    expect(document.activeElement).not.toBe(reflection()); await click('Add readings to explanation'); expect(latest.reflection).toBe(initial + '\n\n' + text); expect(document.activeElement).toBe(reflection()); expect(protectedFields(latest)).toEqual(original);
    const once = latest.reflection; await click('Review explanation'); expect(latest.reflection).toBe(once); expect(document.activeElement).toBe(reflection());
  });

  it('uses current student writing during a queued double activation and requests focus only on action', async () => {
    await mount(); const add = callback(button('Add readings to explanation')), target = targetFor(latest), block = evidence(target.first, target.second).text;
    const unrelated = host.querySelector('input[aria-label="Input voltage (V) exact value"]'); unrelated.focus();
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 3.7 } }))); expect(document.activeElement).toBe(unrelated);
    await act(async () => { update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, reflection: 'Latest typed paragraph.' } })); add({}); add({}); }); await settle();
    expect(latest.reflection).toBe('Latest typed paragraph.\n\n' + block); expect(document.activeElement).toBe(reflection());
  });

  it('does not steal another input focus when rerendering pre-existing focused-evidence state', async () => {
    await mount({ reflectionFocusToken: 7 }); expect(document.activeElement).not.toBe(reflection());
    const input = host.querySelector('input[aria-label="Input voltage (V) exact value"]'); input.focus();
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, investigationTitle: 'Rerender' } }))); await settle(); expect(document.activeElement).toBe(input);
  });

  it('does not refocus the explanation when importing or restoring an investigation after an append', async () => {
    await mount(); await click('Add readings to explanation'); const savedReflection = latest.reflection; expect(document.activeElement).toBe(reflection());
    const doc = api.circuitActiveInvestigation(fixture({ reflection: 'Imported independent explanation.', investigationTitle: 'Imported investigation' }));
    const input = host.querySelector('input[type="file"][aria-label="Open investigation file"]'); input.focus(); Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'evidence.json', size: 4096, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); button('Load investigation').focus(); await click('Load investigation');
    expect(latest.reflection).toBe('Imported independent explanation.'); expect(document.activeElement).not.toBe(reflection());
    button('Restore previous investigation').focus(); await click('Restore previous investigation'); expect(latest.reflection).toBe(savedReflection); expect(document.activeElement).not.toBe(reflection());
  });

  it('rejects a captured action after replaced imported points and displays no writer for incomplete selection', async () => {
    await mount(); const add = callback(button('Add readings to explanation')), original = latest.reflection;
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, observations: clone(prev._circuitActive.observations) } }))); await act(async () => add({}));
    expect(latest.reflection).toBe(original); expect(latest.reflectionFocusToken).toBeUndefined(); expect(writer()).toBeNull();
  });

  it('disables same-entry insertion and offers a next-reading hint when only one point exists', async () => {
    await mount(); await chooseSame(); expect(button('Add readings to explanation').disabled).toBe(true); const original = latest.reflection; await click('Add readings to explanation'); expect(latest.reflection).toBe(original);
    await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, observations: [prev._circuitActive.observations[0]] } }))); expect(writer()).toBeNull(); expect(host.querySelector('.circuit-notebook-next-reading')).toBeTruthy();
  });

  it('shows overflow feedback without trimming writing or moving focus into the explanation', async () => {
    await mount({ reflection: 'x'.repeat(4000) }); const el = button('Add readings to explanation'); el.focus(); await click('Add readings to explanation');
    expect(latest.reflection).toBe('x'.repeat(4000)); expect(latest.reflectionFocusToken).toBeUndefined(); expect(document.activeElement).toBe(el); expect(host.querySelector('.circuit-notebook-notice').textContent).toMatch(/4000|4,000|room|long|limit/i);
  });
});
