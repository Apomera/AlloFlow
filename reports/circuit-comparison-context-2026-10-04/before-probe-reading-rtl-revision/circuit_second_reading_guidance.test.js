import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const headings = {
  unchanged: 'Choose one change',
  'one-setting': 'Ready for a second reading',
  'one-setting-probes': 'Check the probe connections',
  'probe-only': 'Probe connections changed',
  'multiple-settings': 'Several settings changed',
  'multiple-settings-probes': 'Settings and probes changed',
  'different-circuits': 'Different circuit types',
  start: 'Record a second reading'
};

describe('Guidance before a second saved reading', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, translations, scrollOriginal;
  const cue = () => host.querySelector('.circuit-notebook-next-reading');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text || el.getAttribute('aria-label') === text);
  const notebook = () => host.querySelector('.circuit-active-notebook');
  const cards = () => [...host.querySelectorAll('.circuit-notebook-observation')];
  const note = index => cards()[index].querySelector('textarea');
  const point = (design, text = '') => api.circuitActiveObservation({ probeRed: 'drive', probeBlack: 'base', ...design }, text);
  const seed = patch => ({ ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', notebookOpen: true, probeRed: 'drive', probeBlack: 'base', observations: [point({ input: 1 }, 'My starting reading.')], investigationQuestion: 'How does input affect lamp current?', investigationPrediction: 'I predict a change.', reflection: '  My own explanation.\nKeep this line.  ', lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep my guided work.' } }, reference: { version: 1, design: api.circuitActiveDesign({ input: .8 }) }, undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  const authored = state => clone({ observations: state.observations, reflection: state.reflection, investigationQuestion: state.investigationQuestion, investigationPrediction: state.investigationPrediction, lessonRecords: state.lessonRecords, reference: state.reference });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(patch) { await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...patch } }))); await flush(); }
  async function write(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush();
  }
  async function exact(label, value) {
    const el = host.querySelector('input[aria-label="' + label + ' exact value"]'); expect(el).toBeTruthy();
    el.focus(); await write(el, String(value));
    await act(async () => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))); await flush(); return el;
  }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep another workspace.' } };
    function Harness() {
      const [toolData, setToolData] = React.useState(initial), [locale, changeLocale] = React.useState('');
      latest = toolData; update = setToolData; setLocale = changeLocale;
      return config.render(makeCtx({ toolData, setToolData: value => { writes(value); setToolData(value); }, t: (key, fallback) => { translations.push([key, fallback]); return locale + fallback; } }));
    }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  function expectCue(kind, prefix = '') {
    const el = cue(); expect(el).toBeTruthy(); expect(el.dataset.readingKind).toBe(kind);
    expect(el.querySelector('strong').textContent).toBe(prefix + headings[kind]);
    const key = kind === 'start' ? 'stem.circuit.evidence_second_reading' : 'stem.circuit.evidence_second_reading_' + kind.replaceAll('-', '_');
    expect(translations.map(row => row[0])).toEqual(expect.arrayContaining([key + '_heading', key + '_help']));
    expect(el.querySelectorAll('button,input,textarea,select,[role="status"],[aria-live]')).toHaveLength(0);
    expect(el.hasAttribute('aria-live')).toBe(false); expect(el.hasAttribute('role')).toBe(false);
    expect(el.textContent).not.toMatch(/\bmA\b|\bµA\b|saturat|collector current|current (?:increases|decreases)/i);
  }
  async function importDocument(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'second-reading.json', size: 4096, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush();
    await click(button('Load investigation'));
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    writes = vi.fn(); translations = []; host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each([0, 2])('shows no second-reading cue when %i observations are saved', async count => {
    await mount({ observations: Array.from({ length: count }, (_, i) => point({ input: 1 + i / 2 }, 'Saved ' + i)) });
    const original = latest; expect(cue()).toBeNull(); expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('uses normalized settings and resolved probes when a sparse legacy point already matches the live circuit', async () => {
    const sparse = { design: { input: '1', supply: '5', project: 'unknown' }, probeRed: 'unknown', probeBlack: 'unknown', note: 'Keep the legacy representation.' };
    await mount({ observations: [sparse], probeRed: 'collector', probeBlack: 'emitter' }); const original = latest;
    expectCue('unchanged'); expect(button('Open saved observation 1')).toBeTruthy(); expect(latest._circuitActive.observations[0]).toBe(sparse);
    expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled();
  });

  it('ignores inactive manual light and divider settings instead of proposing a duplicate reading', async () => {
    await mount({ light: 99, dividerResistance: 47000, observations: [point({ input: 1, light: 1, dividerResistance: 1000 })] });
    const before = clone(latest); expectCue('unchanged'); expect(button('Open saved observation 1')).toBeTruthy();
    expect(latest).toEqual(before); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['light', 'dark'])('ignores the inactive manual input for a %s sensor', async project => {
    await mount({ project, light: 50, input: 4.8, observations: [point({ project, light: 50, input: .1 })] });
    expectCue('unchanged'); expect(button('Open saved observation 1')).toBeTruthy();
    await mutate({ input: .3 }); expectCue('unchanged'); expect(writes).not.toHaveBeenCalled();
  });

  it('becomes ready after a real single-setting edit even when saturated lamp current is unchanged, and Undo returns the cue', async () => {
    await mount({ input: 3.3, observations: [point({ input: 3.3 })] }); const work = authored(latest._circuitActive);
    expectCue('unchanged'); const field = await exact('Input voltage (V)', 5);
    expectCue('one-setting'); expect(latest._circuitActive.input).toBe(5); expect(document.activeElement).toBe(field);
    const savedCurrent = api.solveActiveCircuit(latest._circuitActive.observations[0].design).collectorCurrent;
    expect(savedCurrent).toBeCloseTo(4.8 / 220, 12); expect(api.solveActiveCircuit(latest._circuitActive).collectorCurrent).toBeCloseTo(savedCurrent, 12);
    expect(authored(latest._circuitActive)).toEqual(work); expect(latest._circuitActive.undo.at(-1).input).toBe(3.3);
    await click(button('Undo active edit')); expectCue('unchanged'); expect(latest._circuitActive.input).toBe(3.3); expect(authored(latest._circuitActive)).toEqual(work);
  });

  it('qualifies a one-setting comparison when the ordered probe pair has also been reversed', async () => {
    await mount(); await exact('Input voltage (V)', 1.5); expectCue('one-setting'); const history = clone({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo });
    await click(button('Reverse active probes')); expectCue('one-setting-probes');
    expect(cue().textContent).toMatch(/same red and black connections.*probe-voltage change/);
    expect(latest._circuitActive.probeRed).toBe('base'); expect(latest._circuitActive.probeBlack).toBe('drive');
    expect({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo }).toEqual(history);
    await click(button('Reverse active probes')); expectCue('one-setting');
  });

  it('describes a probe-only change without claiming that the circuit settings changed', async () => {
    await mount(); const design = api.circuitActiveDesign(latest._circuitActive), work = authored(latest._circuitActive);
    await click(button('Reverse active probes')); expectCue('probe-only'); expect(cue().textContent).toContain('Only the probe connections differ');
    expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(design); expect(authored(latest._circuitActive)).toEqual(work); expect(button('Record current readings').disabled).toBe(false);
  });

  it('identifies multiple live electrical changes while allowing an observation of that combination', async () => {
    await mount(); await exact('Input voltage (V)', 1.5); await exact('Supply voltage (V)', 7);
    expectCue('multiple-settings'); expect(cue().textContent).toContain('Record to document this combination'); expect(button('Record current readings').disabled).toBe(false);
    expect(latest._circuitActive.observations[0].design.input).toBe(1); expect(latest._circuitActive.observations[0].design.supply).toBe(5);
  });

  it('keeps the probe warning when several circuit settings and the lead order change together', async () => {
    await mount(); await exact('Input voltage (V)', 1.5); await exact('Supply voltage (V)', 7); await click(button('Reverse active probes'));
    expectCue('multiple-settings-probes'); expect(cue().textContent).toContain('with the original probes'); expect(button('Record current readings').disabled).toBe(false);
  });

  it.each([['manual', 'light'], ['light', 'dark']])('treats %s to %s as different circuits rather than a controlled input change', async (before, after) => {
    await mount({ project: before, observations: [point({ project: before, input: 1, light: 50 })] });
    const control = [...host.querySelectorAll('.circuit-active-projects button')].find(el => el.querySelector('span').textContent === ({ light: 'Light sensor', dark: 'Dark sensor' })[after]);
    await click(control); expectCue('different-circuits'); expect(cue().textContent).toContain('separate circuit observation'); expect(latest._circuitActive.project).toBe(after);
    expect(latest._circuitActive.observations[0].design.project).toBe(before); expect(button('Record current readings').disabled).toBe(false);
  });

  it('uses the generic optional cue for an invalid-shaped legacy saved design without inventing a comparison', async () => {
    const legacy = { design: null, probeRed: 'collector', probeBlack: 'emitter', note: 'Legacy note' };
    await mount({ observations: [legacy] }); expectCue('start'); expect(latest._circuitActive.observations[0]).toBe(legacy); expect(writes).not.toHaveBeenCalled();
  });

  it('updates translated guidance without changing authored notes, expanded writing, selection, history or focus', async () => {
    await mount(); await click(cards()[0].querySelector(':scope > summary')); await write(note(0), 'I recorded this before changing input.');
    await click(host.querySelector('.circuit-reflection-size-toggle')); const field = host.querySelector('.circuit-notebook-reflection'); field.focus(); field.setSelectionRange(2, 13, 'backward');
    const work = authored(latest._circuitActive), history = clone({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo }), writing = field.value;
    writes.mockClear(); translations.length = 0;
    await mutate({ input: 1.5 }); await act(async () => setLocale('Translated: ')); await flush(); expectCue('one-setting', 'Translated: ');
    expect(cue().querySelector('p').textContent).toMatch(/^Translated: /); expect(host.querySelector('.circuit-notebook-reflection')).toBe(field); expect(field.rows).toBe(12); expect(field.value).toBe(writing);
    expect(document.activeElement).toBe(field); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([2, 13, 'backward']);
    expect(authored(latest._circuitActive)).toEqual(work); expect({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo }).toEqual(history);
    expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('opens an already-saved note for an unchanged point, then records and focuses a distinct second point', async () => {
    await mount(); const saved = latest._circuitActive.observations[0]; expectCue('unchanged');
    await click(button('Open saved observation 1')); expect(latest._circuitActive.observations).toEqual([saved]); expect(document.activeElement).toBe(note(0)); expectCue('unchanged');
    await exact('Input voltage (V)', 1.5); expectCue('one-setting'); const work = authored(latest._circuitActive), history = clone({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo });
    await click(button('Record current readings')); expect(latest._circuitActive.observations).toHaveLength(2); expect(latest._circuitActive.observations[0]).toBe(saved); expect(latest._circuitActive.observations[1].design.input).toBe(1.5);
    expect(cue()).toBeNull(); expect(cards()[1].open).toBe(true); expect(document.activeElement).toBe(note(1)); expect(host.querySelector('.circuit-observation-compare')).toBeTruthy();
    expect({ ...authored(latest._circuitActive), observations: work.observations }).toEqual(work); expect({ undo: latest._circuitActive.undo, redo: latest._circuitActive.redo }).toEqual(history);
  });

  it('derives from the surviving first observation after removal and hides again when the original pair is restored', async () => {
    await mount({ input: 1.5, observations: [point({ input: 1 }, 'A'), point({ input: 1.5 }, 'B')] }); expect(cue()).toBeNull();
    await click(cards()[1].querySelector(':scope > summary')); await click(button('Remove observation 2')); expectCue('one-setting'); expect(document.activeElement).toBe(notebook().querySelector(':scope > summary'));
    await click(button('Restore removed observation')); expect(cue()).toBeNull(); expect(latest._circuitActive.observations.map(entry => entry.note)).toEqual(['A', 'B']);
    await click(cards()[0].querySelector(':scope > summary')); await click(button('Remove observation 1')); expectCue('unchanged'); expect(latest._circuitActive.observations[0].note).toBe('B');
  });

  it('recomputes for a one-point JSON import and restores the prior two-point investigation without automatic writing focus', async () => {
    await mount({ observations: [point({ input: 1 }, 'A'), point({ input: 1.5 }, 'B')] }); const original = clone(latest._circuitActive); expect(cue()).toBeNull();
    const doc = api.circuitActiveInvestigation(seed({ input: 5, observations: [point({ input: 3.3 }, 'Imported starting point')], reflection: 'Imported explanation.' }));
    await importDocument(doc); expectCue('one-setting'); expect(latest._circuitActive.observations[0].note).toBe('Imported starting point'); expect(latest._circuitActive.reflection).toBe('Imported explanation.');
    expect(document.activeElement).not.toBe(host.querySelector('.circuit-notebook-reflection'));
    const restore = button('Restore previous investigation'); restore.focus(); await click(restore);
    expect(cue()).toBeNull(); expect(latest._circuitActive.observations).toEqual(original.observations); expect(latest._circuitActive.reflection).toBe(original.reflection); expect(document.activeElement).not.toBe(host.querySelector('.circuit-notebook-reflection'));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
