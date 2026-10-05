import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Navigate from saved comparison to independent writing', () => {
  let api, config, host, root, stores, extraRoots, frames, writes, awards, scrollOriginal;
  const clone = value => JSON.parse(JSON.stringify(value));
  const point = (input, note = '', extra = {}) => api.circuitActiveObservation({ input, ...extra }, note);
  const seed = patch => ({
    ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }),
    lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep my guided explanation.' } },
    view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true,
    observations: [point(1, 'First saved note'), point(1.5, 'Second saved note')],
    removedObservations: [{ entry: point(.9, 'Recover this observation'), index: 0 }],
    reference: { version: 1, design: api.circuitActiveDesign({ input: .8 }) },
    reflection: '  My own explanation.\nKeep β and this line.  ',
    investigationTitle: 'My independent investigation', investigationQuestion: 'What changes when I vary one setting?',
    investigationPrediction: 'I predict a difference in current.',
    undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })],
    ...patch
  });
  const initial = patch => ({
    _circuit: { activeWorkbench: true, observations: [{ explanation: 'Keep Simple work.' }] },
    _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected work.' },
    _circuitMixed: { reflection: 'Keep mixed work.' }
  });
  const panel = (scope = host) => scope.querySelector('.circuit-observation-compare');
  const writer = (scope = host) => scope.querySelector('.circuit-comparison-writing');
  const own = (scope = host) => scope.querySelector('button.circuit-comparison-writing-own');
  const field = (scope = host) => scope.querySelector('textarea.circuit-notebook-reflection');
  const actions = (scope = host) => writer(scope).querySelector('.circuit-comparison-writing-actions');
  const button = (name, scope = host) => [...scope.querySelectorAll('button')].find(node => node.textContent === name);
  const selector = (name, scope = host) => scope.querySelector('select[aria-label="' + name + '"]');
  const state = (index = 0) => stores[index].state;
  const selections = (scope = host) => [...scope.querySelectorAll('.circuit-observation-selectors select')].map(node => node.value);
  const selection = el => [el.selectionStart, el.selectionEnd, el.selectionDirection];

  function Harness(props) {
    const [toolData, setToolData] = React.useState(props.initial);
    const [locale, setLocale] = React.useState('');
    stores[props.index] = { state: toolData, update: setToolData, setLocale };
    return config.render(makeCtx({
      toolData, setToolData: value => { writes(value); setToolData(value); },
      t: (_key, fallback) => locale + fallback, awardXP: awards
    }));
  }
  async function flush() {
    for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0)));
  }
  async function mount(patch = {}) {
    await act(async () => root.render(React.createElement(Harness, { initial: initial(patch), index: 0 })));
    await flush();
  }
  async function click(el) {
    expect(el).toBeTruthy();
    await act(async () => el.click());
    await flush();
  }
  async function choose(name, index, scope = host) {
    const el = selector(name, scope), options = [...el.options].filter(option => option.value);
    const value = index === null ? '' : options[index].value;
    await act(async () => { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush();
  }
  async function mutate(fn) {
    await act(async () => stores[0].update(fn));
    await flush();
  }
  async function write(el, value) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', {
      configurable: true, value: [{ name: 'own-writing.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }]
    });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    await flush();
    button('Load investigation').focus();
    await click(button('Load investigation'));
  }
  function clearActionSpies() {
    writes.mockClear(); awards.mockClear(); requestAnimationFrame.mockClear(); Element.prototype.scrollIntoView.mockClear();
  }

  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    stores = []; extraRoots = []; frames = []; writes = vi.fn(); awards = vi.fn();
    vi.stubGlobal('requestAnimationFrame', vi.fn(fn => { frames.push(fn); return frames.length; }));
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    for (const mounted of extraRoots) { await act(async () => mounted.root.unmount()); mounted.host.remove(); }
    await act(async () => root.unmount()); host.remove();
    vi.restoreAllMocks(); vi.unstubAllGlobals();
    if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView;
  });

  it('keeps Add first and uses a native context button to focus its named field immediately without insertion or state writes', async () => {
    await mount();
    const control = own(), target = field(), before = state(), saved = clone(before);
    expect(control).toBeTruthy(); expect(control.tagName).toBe('BUTTON'); expect(control.type).toBe('button');
    expect(control.textContent).toBe('Write my explanation'); expect(control.disabled).toBe(false);
    expect(actions().querySelector('button').textContent).toBe('Add readings to explanation');
    expect(actions().querySelectorAll('button')[1]).toBe(control);
    expect(document.getElementById(control.getAttribute('aria-controls'))).toBe(target);
    expect(control.getAttribute('aria-describedby')).toBe(writer().querySelector('.circuit-comparison-writing-prompt').id);
    expect(control.getAttribute('aria-describedby')).not.toContain(writer().querySelector('[id$="-writing-help"]').id);
    expect(control.closest('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    panel().open = true;
    const statuses = [...host.querySelectorAll('[role="status"]')].map(node => node.textContent);
    const focus = vi.spyOn(target, 'focus'); clearActionSpies(); control.focus();
    await act(async () => {
      control.click();
      expect(document.activeElement).toBe(target);
      expect(focus).toHaveBeenCalledWith();
      expect(writes).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    });
    await flush();
    expect(state()).toBe(before); expect(state()).toEqual(saved);
    expect([...host.querySelectorAll('[role="status"]')].map(node => node.textContent)).toEqual(statuses);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled();
  });

  it('preserves full-length authored writing, backward caret, expanded size, manual resize, saved pair and disclosures across repeated jumps', async () => {
    const prefix = 'β and my own claim.\n', text = prefix + 'x'.repeat(4000 - prefix.length);
    await mount({ reflection: text });
    await click(button('Expand writing space'));
    await choose('First saved observation', 1); await choose('Second saved observation', 0);
    const target = field(), control = own(), before = state(), savedPair = selections(), rows = target.rows;
    const compare = panel(), observation = host.querySelector('.circuit-notebook-observation');
    compare.open = true; observation.open = true; target.style.height = '610px'; target.style.width = '91%';
    target.focus(); target.setSelectionRange(3, 21, 'backward');
    clearActionSpies();
    for (let i = 0; i < 3; i++) {
      control.focus(); await click(control);
      expect(document.activeElement).toBe(target); expect(selection(target)).toEqual([3, 21, 'backward']);
      expect(field()).toBe(target); expect(target.value).toBe(text); expect(target.rows).toBe(rows);
    }
    expect(target.style.height).toBe('610px'); expect(target.style.width).toBe('91%');
    expect(panel()).toBe(compare); expect(compare.open).toBe(true); expect(observation.open).toBe(true);
    expect(selections()).toEqual(savedPair); expect(state()).toBe(before);
    expect(writes).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('hides own-writing navigation for the same saved entry, missing selection, and a single observation without changing saved work', async () => {
    await mount(); const before = state(), compare = panel();
    await choose('Second saved observation', 0);
    expect(own()).toBeNull(); expect(actions().querySelector('button').disabled).toBe(true);
    await choose('Second saved observation', null);
    expect(own()).toBeNull(); expect(writer()).toBeNull(); expect(state()).toBe(before);
    await choose('Second saved observation', 1);
    expect(own()).toBeTruthy(); expect(panel()).toBe(compare); expect(state()).toBe(before);
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, observations: [prev._circuitActive.observations[0]] } }));
    expect(own()).toBeNull(); expect(panel()).toBeNull(); expect(state()._circuitActive.reflection).toBe(before._circuitActive.reflection);
  });

  it('offers navigation for distinct equivalent legacy observations even when they share a design and probe pair', async () => {
    const first = point(1, 'Original note'), second = { ...first, note: 'Distinct historical note' };
    await mount({ observations: [first, second] });
    expect(own()).toBeTruthy(); expect(actions().querySelector('button').disabled).toBe(false);
    const before = state(); clearActionSpies(); await click(own());
    expect(document.activeElement).toBe(field()); expect(state()).toBe(before);
    expect(state()._circuitActive.observations[0]).toBe(first); expect(state()._circuitActive.observations[1]).toBe(second);
    expect(writes).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('retains only the existing Review action when the selected evidence block is already included', async () => {
    const observations = [point(1, 'A'), point(1.5, 'B')];
    const reflection = 'My claim stays authored.\n\n' + api.circuitActiveComparisonEvidence(...observations).text;
    await mount({ observations, reflection });
    expect(own()).toBeNull(); expect(actions().querySelectorAll('button')).toHaveLength(1);
    expect(actions().querySelector('button').textContent).toBe('Review explanation');
    expect(state()._circuitActive.reflection).toBe(reflection);
    expect(document.activeElement).not.toBe(field()); expect(writes).not.toHaveBeenCalled();
  });

  it('does not replay navigation after writing, locale changes, live edits or note revisions and keeps selected saved evidence', async () => {
    await mount(); await click(own());
    const target = field(), control = own(), savedPair = selections();
    await write(target, 'My revised own reasoning.\nNo inserted measurement block.');
    target.setSelectionRange(2, 15, 'backward');
    const input = host.querySelector('input[aria-label="Input voltage (V) exact value"]') || host.querySelector('input[aria-label="Relative light level exact value"]');
    input.focus(); clearActionSpies();
    await act(async () => stores[0].setLocale('Translated: ')); await flush();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, light: 68 } }));
    await mutate(prev => ({
      ...prev, _circuitActive: {
        ...prev._circuitActive,
        observations: prev._circuitActive.observations.map((entry, index) => index ? entry : { ...entry, note: 'Revised saved note only' })
      }
    }));
    expect(document.activeElement).toBe(input); expect(field()).toBe(target); expect(own()).toBe(control);
    expect(control.textContent).toBe('Translated: Write my explanation'); expect(selections()).toEqual(savedPair);
    expect(target.value).toBe('My revised own reasoning.\nNo inserted measurement block.');
    expect(selection(target)).toEqual([2, 15, 'backward']);
    expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('loads and restores actual investigation files after a jump without a stored request, field replacement or automatic refocus', async () => {
    await mount(); await click(button('Expand writing space')); await click(own());
    const target = field(), rows = target.rows, original = api.circuitActiveInvestigation(state()._circuitActive);
    const imported = api.circuitActiveInvestigation(seed({
      project: 'manual', input: 2.7, reflection: 'Imported independent explanation.',
      observations: [point(.7, 'Imported A'), point(2.1, 'Imported B')], removedObservations: []
    }));
    clearActionSpies(); await importDoc(imported);
    expect(field()).toBe(target); expect(target.rows).toBe(rows); expect(target.value).toBe('Imported independent explanation.');
    expect(document.activeElement).not.toBe(target); expect(own()).toBeNull();
    expect(api.circuitActiveInvestigation(state()._circuitActive)).toEqual(imported);
    expect(state()._circuitActive.reflectionFocusToken).toBe(0);
    button('Restore previous investigation').focus(); await click(button('Restore previous investigation'));
    expect(field()).toBe(target); expect(target.rows).toBe(rows); expect(document.activeElement).not.toBe(target);
    expect(api.circuitActiveInvestigation(state()._circuitActive)).toEqual(original);
    expect(state()._circuitActive.reflectionFocusToken).toBe(0);
    expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('targets each mounted tool own explanation by local ref and unique controlled ID without cross-focus or state writes', async () => {
    await mount({ reflection: 'First tool writing.' });
    const secondHost = document.createElement('div'); document.body.appendChild(secondHost);
    const secondRoot = ReactDOMClient.createRoot(secondHost); extraRoots.push({ root: secondRoot, host: secondHost });
    await act(async () => secondRoot.render(React.createElement(Harness, { initial: initial({ reflection: 'Second tool writing.' }), index: 1 })));
    await flush();
    const scopes = [host, secondHost], fields = scopes.map(scope => field(scope)), controls = scopes.map(scope => own(scope));
    const originals = [state(0), state(1)];
    expect(fields[0].id).not.toBe(fields[1].id);
    for (let i = 0; i < 2; i++) {
      expect(document.getElementById(controls[i].getAttribute('aria-controls'))).toBe(fields[i]);
      fields[i].focus(); fields[i].setSelectionRange(2, 8, 'backward');
    }
    clearActionSpies();
    for (const i of [1, 0, 1]) {
      controls[i].focus(); await click(controls[i]);
      expect(document.activeElement).toBe(fields[i]); expect(selection(fields[i])).toEqual([2, 8, 'backward']);
      expect(state(0)).toBe(originals[0]); expect(state(1)).toBe(originals[1]);
    }
    expect(writes).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
