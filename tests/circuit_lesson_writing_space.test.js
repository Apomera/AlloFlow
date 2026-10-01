import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (tested = true, explanation = 'Keep my lesson explanation.') => ({ choice: 'less', tested, explanation });
let api, config;
beforeEach(() => {
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
  api = window.StemLab;
});

const seed = () => ({
  ...api.circuitActiveDesign({ project: 'dark', input: 4.2, light: 37, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }),
  lessonId: 'gain', lessonRecords: { gain: record(), sensor: record(true, 'Keep the sensor explanation.') },
  view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true,
  observations: [api.circuitActiveObservation({ input: .8 }, 'Keep this saved observation.')],
  reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) },
  reflection: 'Keep my independent notebook explanation.', investigationTitle: 'My investigation',
  undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })]
});

describe('Lesson writing space', () => {
  let host, root, latest, update, setLocale, writes, awards, frames, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const size = () => lab().querySelector('.circuit-lesson-writing-size-toggle');
  const count = () => lab().querySelector('.circuit-lesson-writing-count');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  const initialState = active => ({ _circuit: { activeWorkbench: true }, _circuitActive: { ...seed(), ...active }, _circuitNetwork: { reflection: 'Keep connected work.' } });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) {
    const el = lab().querySelector('select');
    await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush();
  }
  async function write(el, text) {
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'writing.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    await flush();
    const load = button('Load investigation'); load.focus(); await click(load);
  }
  async function mount(active = {}) {
    const initial = initialState(active);
    function Harness() {
      const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState('');
      latest = state; update = setState; setLocale = changeLocale;
      return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards }));
    }
    await act(async () => root.render(React.createElement(Harness)));
    await flush();
  }
  beforeEach(() => {
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    writes = vi.fn(); awards = vi.fn();
  });
  afterEach(async () => {
    await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView;
  });

  it('waits for a started lesson before offering writing controls and does not create a lesson record', async () => {
    await mount({ lessonRecords: {} });
    expect(field()).toBeNull(); expect(size()).toBeNull(); expect(count()).toBeNull();
    expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled();
  });

  it.each([false, true])('provides six rows and correctly associated quiet controls for tested=%s', async tested => {
    await mount({ lessonRecords: { gain: record(tested) } });
    const el = field(), heading = lab().querySelector('.circuit-lesson-writing-heading');
    expect(el.rows).toBe(6); expect(el.maxLength).toBe(4000); expect(el.value).toBe(record().explanation);
    expect(heading.querySelector('label').htmlFor).toBe(el.id); expect(heading.querySelector('label').textContent).toBe('My explanation for this experiment');
    expect(heading.querySelector('button')).toBe(size()); expect(size().type).toBe('button');
    expect(size().textContent).toBe('Expand writing space'); expect(size().getAttribute('aria-expanded')).toBe('false'); expect(size().getAttribute('aria-controls')).toBe(el.id);
    const described = el.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id));
    expect(described).toHaveLength(2); expect(described[0].textContent).toContain('your investigation notebook has its own explanation'); expect(described[1]).toBe(count());
    expect(count().textContent).toBe(record().explanation.length + ' / 4000 characters'); expect(count().closest('[aria-live],[role="status"]')).toBeNull();
    expect(writes).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false);
  });

  it.each([false, true])('expands and reduces the existing field without any saved-state or selection changes for tested=%s', async tested => {
    await mount({ lessonRecords: { gain: record(tested) } });
    const before = latest, serialized = JSON.stringify(latest), el = field(), toggle = size(), value = el.value;
    el.focus(); el.setSelectionRange(3, 14, 'backward'); toggle.focus();
    for (const [rows, expanded, label] of [[12, 'true', 'Reduce writing space'], [6, 'false', 'Expand writing space']]) {
      await click(toggle); expect(field()).toBe(el); expect(size()).toBe(toggle); expect(el.rows).toBe(rows); expect(el.value).toBe(value);
      expect(toggle.getAttribute('aria-expanded')).toBe(expanded); expect(toggle.textContent).toBe(label); expect(document.activeElement).toBe(toggle);
      expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([3, 14, 'backward']); expect(latest).toBe(before); expect(JSON.stringify(latest)).toBe(serialized);
    }
    expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('clears only a manual height override on explicit resizing and retains other styles and caret state', async () => {
    await mount(); const el = field(), toggle = size(), before = latest;
    el.style.height = '500px'; el.style.width = '92%'; el.style.color = 'rgb(1, 2, 3)'; el.setSelectionRange(4, 11, 'backward'); toggle.focus();
    await click(toggle); expect(el.rows).toBe(12); expect(el.style.height).toBe(''); expect(el.style.width).toBe('92%'); expect(el.style.color).toBe('rgb(1, 2, 3)');
    el.style.height = '700px'; await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 2.8 } })); expect(el.style.height).toBe('700px');
    const afterEdit = latest; await click(toggle); expect(el.rows).toBe(6); expect(el.style.height).toBe(''); expect(el.style.width).toBe('92%'); expect(el.style.color).toBe('rgb(1, 2, 3)');
    expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([4, 11, 'backward']); expect(document.activeElement).toBe(toggle); expect(latest).toBe(afterEdit);
    expect(latest._circuitActive.lessonRecords).toBe(before._circuitActive.lessonRecords); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('updates the quiet count for exact 4000-character writing without truncating valid text or changing other work', async () => {
    await mount(); await click(size()); const el = field(), before = clone(latest), text = 'A'.repeat(3999) + '\u03b2'; el.focus();
    await write(el, text); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe(text); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe(text); expect(count().textContent).toBe('4000 / 4000 characters');
    before._circuitActive.lessonRecords.gain.explanation = text; before._circuitActive.challenge = { id: 'gain', choice: 'less', tested: true };
    expect(latest).toEqual(before); expect(document.activeElement).toBe(el); expect(count().closest('[aria-live],[role="status"]')).toBeNull(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('loads long saved writing with its exact count and exports unchanged data before and after local expansion', async () => {
    await mount(); const text = 'Saved evidence.\n'.repeat(200), doc = api.circuitActiveInvestigation({ input: 2.4, lessonId: 'sensor', lessonRecords: { sensor: record(true, text) } });
    await importDoc(doc); const el = field(), before = api.circuitActiveInvestigation(latest._circuitActive);
    expect(el.value).toBe(text); expect(count().textContent).toBe(text.length + ' / 4000 characters'); expect(el.rows).toBe(6);
    await click(size()); expect(el.rows).toBe(12); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(before);
    expect(JSON.stringify(before)).not.toMatch(/explanationSize|writingSize|writingRows|aria-expanded/); expect(before.lessonRecords.sensor.explanation).toBe(text);
  });

  it('locale rerenders translate the size action and counter without changing the expanded field, selection, state or focus', async () => {
    await mount(); await click(size()); const el = field(), before = latest, toggle = size(); el.focus(); el.setSelectionRange(2, 9, 'backward');
    await act(async () => setLocale('Translated: ')); await flush();
    expect(field()).toBe(el); expect(size()).toBe(toggle); expect(el.rows).toBe(12); expect(toggle.textContent).toBe('Translated: Reduce writing space'); expect(count().textContent).toBe('Translated: ' + el.value.length + ' / 4000 characters');
    expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 9, 'backward']); expect(latest).toBe(before); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('electrical edits preserve local expansion and focused writing without altering records or adding resize history', async () => {
    await mount(); await click(size()); const el = field(), records = latest._circuitActive.lessonRecords, undo = latest._circuitActive.undo; el.focus(); el.setSelectionRange(2, 9, 'backward');
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, input: 2.4, supply: 9 } }));
    expect(field()).toBe(el); expect(el.rows).toBe(12); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 9, 'backward']);
    expect(latest._circuitActive.lessonRecords).toBe(records); expect(latest._circuitActive.undo).toBe(undo); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('notebook writing and its own size control remain independent of the expanded lesson field', async () => {
    await mount(); await click(size()); const el = field(), toggle = size(), records = latest._circuitActive.lessonRecords, notebook = host.querySelector('.circuit-notebook-reflection');
    const notebookToggle = host.querySelector('.circuit-reflection-size-toggle'); expect(notebook.rows).toBe(6); await click(notebookToggle); expect(notebook.rows).toBe(12); expect(el.rows).toBe(12);
    notebook.focus(); await write(notebook, 'A separate notebook explanation.');
    expect(latest._circuitActive.lessonRecords).toEqual(records); expect(field()).toBe(el); expect(el.value).toBe(record().explanation); expect(count().textContent).toBe(el.value.length + ' / 4000 characters'); expect(el.rows).toBe(12); expect(document.activeElement).toBe(notebook);
    await click(toggle); expect(el.rows).toBe(6); expect(notebook.rows).toBe(12); expect(latest._circuitActive.reflection).toBe('A separate notebook explanation.');
  });

  it('lesson selection retains the local writing size while showing each record and count without resetting saved work', async () => {
    await mount({ lessonRecords: { gain: record(), limit: record(false, 'An untested draft'), sensor: record(true, 'Sensor evidence') } });
    await click(size()); const el = field(), records = clone(latest._circuitActive.lessonRecords), design = api.circuitActiveDesign(latest._circuitActive);
    for (const id of ['limit', 'sensor', 'gain']) {
      await select(id); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe(records[id].explanation); expect(count().textContent).toBe(records[id].explanation.length + ' / 4000 characters');
      expect(document.activeElement).toBe(lab().querySelector(records[id].tested ? '[data-active-lesson-result]' : '[data-active-lesson-question]'));
    }
    expect(latest._circuitActive.lessonRecords).toEqual(records); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(design);
  });

  it('selecting a new lesson hides writing, and starting it restores the same local size with an empty count', async () => {
    await mount(); await click(size()); await select('limit'); expect(field()).toBeNull(); expect(count()).toBeNull(); expect(size()).toBeNull();
    await click(button('Start transistor prediction')); expect(field().rows).toBe(12); expect(field().value).toBe(''); expect(count().textContent).toBe('0 / 4000 characters'); expect(size().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]')); expect(latest._circuitActive.lessonRecords.gain.explanation).toBe(record().explanation);
  });

  it('explicit retry resets the selected explanation but retains local size and independent saved writing', async () => {
    await mount(); await click(size()); const el = field(), before = latest._circuitActive, retry = lab().querySelector('.circuit-active-lesson-retry');
    await act(async () => { retry.open = true; }); await click(retry.querySelector('button'));
    expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe(''); expect(count().textContent).toBe('0 / 4000 characters'); expect(latest._circuitActive.lessonRecords.gain).toEqual({ choice: null, tested: false, explanation: '' });
    expect(latest._circuitActive.lessonRecords.sensor).toEqual(before.lessonRecords.sensor); expect(latest._circuitActive.reflection).toBe(before.reflection); expect(latest._circuitActive.observations).toEqual(before.observations); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]'));
  });

  it('JSON load and restore retain local expansion and update exact counts without replaying writing focus', async () => {
    await mount(); await click(size()); const el = field(), before = api.circuitActiveInvestigation(latest._circuitActive);
    await click(lab().querySelector('.circuit-lesson-explanation-jump')); Element.prototype.scrollIntoView.mockClear();
    await importDoc(api.circuitActiveInvestigation({ input: 2.4, lessonId: 'sensor', lessonRecords: { sensor: record(true, 'Imported explanation') } }));
    expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe('Imported explanation'); expect(count().textContent).toBe('20 / 4000 characters'); expect(document.activeElement).not.toBe(el); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await click(button('Restore previous investigation')); expect(field()).toBe(el); expect(el.rows).toBe(12); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(before); expect(count().textContent).toBe(el.value.length + ' / 4000 characters'); expect(document.activeElement).not.toBe(el); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('remounting the workbench resets only local writing size and retains the saved explanation', async () => {
    await mount(); await click(size()); const el = field(), active = latest._circuitActive;
    await mutate(prev => ({ ...prev, _circuit: { ...prev._circuit, activeWorkbench: false } })); expect(host.querySelector('.circuit-lesson-writing-field')).toBeNull();
    await mutate(prev => ({ ...prev, _circuit: { ...prev._circuit, activeWorkbench: true } }));
    expect(field()).not.toBe(el); expect(field().rows).toBe(6); expect(size().getAttribute('aria-expanded')).toBe('false'); expect(latest._circuitActive).toBe(active); expect(field().value).toBe(record().explanation); expect(host.contains(document.activeElement)).toBe(false);
  });

  it('two mounted lessons have distinct field/count associations and independent local expansion', async () => {
    const snapshots = [];
    function Instance({ index }) {
      const [state, setState] = React.useState(() => initialState({ lessonId: index ? 'sensor' : 'gain' })); snapshots[index] = state;
      return React.createElement('div', { 'data-instance': index }, config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); } })));
    }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Instance, { index: 0 }), React.createElement(Instance, { index: 1 })))); await flush();
    const labs = [...host.querySelectorAll('.circuit-active-lesson-lab')], fields = labs.map(n => n.querySelector('.circuit-lesson-writing-field')), counters = labs.map(n => n.querySelector('.circuit-lesson-writing-count')), buttons = labs.map(n => n.querySelector('.circuit-lesson-writing-size-toggle'));
    expect(new Set([...fields, ...counters].map(n => n.id)).size).toBe(4);
    fields.forEach((el, i) => { expect(buttons[i].getAttribute('aria-controls')).toBe(el.id); expect(labs[i].querySelector('.circuit-lesson-writing-heading label').htmlFor).toBe(el.id); expect(el.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id))).toContain(counters[i]); });
    const before = [...snapshots]; await click(buttons[0]); expect(fields.map(n => n.rows)).toEqual([12, 6]); expect(snapshots).toEqual(before); expect(snapshots[0]).toBe(before[0]); expect(snapshots[1]).toBe(before[1]); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['', 'An explanation to review.'])('the existing writing jump still focuses the expanded field and scrolls instantly for %j', async explanation => {
    await mount({ lessonRecords: { gain: record(true, explanation) } }); await click(size());
    const el = field(), before = latest, jump = lab().querySelector('.circuit-lesson-explanation-jump'); expect(jump.textContent).toBe(explanation ? 'Review explanation' : 'Write explanation');
    const start = explanation ? 3 : 0, end = explanation ? 12 : 0; el.setSelectionRange(start, end, 'backward'); jump.focus(); await click(jump);
    expect(field()).toBe(el); expect(el.rows).toBe(12); expect(el.value).toBe(explanation); expect([el.selectionStart, el.selectionEnd]).toEqual([start, end]); if (explanation) expect(el.selectionDirection).toBe('backward');
    expect(document.activeElement).toBe(el); expect(latest).toBe(before); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' });
  });
});
