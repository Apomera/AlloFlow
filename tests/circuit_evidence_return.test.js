import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const record = (choice = 'less', tested = true, explanation = 'My saved explanation.') => ({ choice, tested, explanation });

describe('Return from lesson writing to saved readings', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, awards, scrollOriginal;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const heading = () => lab().querySelector('[data-active-lesson-result]');
  const field = () => lab().querySelector('.circuit-lesson-writing-field');
  const actions = () => lab().querySelector('.circuit-lesson-writing-actions');
  const size = () => lab().querySelector('.circuit-lesson-writing-size-toggle');
  const back = () => lab().querySelector('.circuit-lesson-evidence-return');
  const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
  const seed = patch => ({ ...api.circuitActiveDesign({ project: 'light', supply: 12, light: 0, input: 0, loadResistance: 1000 }), lessonId: 'gain', lessonRecords: { gain: record(), limit: record('more'), sensor: record('same') }, view: 'schematic', probeRed: 'drive', probeBlack: 'base', notebookOpen: true, observations: [api.circuitActiveObservation({ input: .8 }, 'Independent observation')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook explanation.', investigationTitle: 'A custom circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true, observations: [{ explanation: 'Keep Simple notes.' }] }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected notes.' }, _circuitMixed: { reflection: 'Keep mixed notes.' } };
    function Harness() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  async function importDoc(doc) {
    const input = host.querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'evidence.json', size: 4096, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); const load = button('Load investigation'); load.focus(); await click(load);
  }
  function assertOwnTarget(control = back(), scope = lab()) {
    const target = scope.querySelector('[data-active-lesson-result]'); expect(document.getElementById(control.getAttribute('aria-controls'))).toBe(target);
    const described = target.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id)); expect(described).toHaveLength(2);
    expect(described.every(node => scope.contains(node))).toBe(true); expect(described[0].textContent).toMatch(/prediction|readings/); expect(described[1]).toBe(scope.querySelector('.circuit-lesson-evidence-context .circuit-active-lesson-bench-note'));
    return target;
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); writes = vi.fn(); awards = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it.each([
    ['fresh lesson', { lessonRecords: {} }],
    ['no prediction', { lessonRecords: { gain: record(null, false) } }],
    ['ready but untested', { lessonRecords: { gain: record('less', false) } }],
    ['invalid tested record', { lessonRecords: { gain: record('invalid', true) } }],
    ['explicit invalid record before a legacy test', { lessonRecords: { gain: record(null, true) }, challenge: { id: 'gain', choice: 'more', tested: true } }]
  ])('offers no evidence-return action for %s', async (_name, patch) => {
    await mount(patch); expect(back()).toBeNull(); expect(heading()).toBeNull(); if (actions()) expect([...actions().querySelectorAll('button')]).toEqual([size()]);
    expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(host.contains(document.activeElement)).toBe(false); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['', 'My saved reasoning'])('places the existing working size control first and the tested-only return second with explanation=%j', async explanation => {
    await mount({ lessonRecords: { gain: record('less', true, explanation) } }); const initial = latest, textarea = field(), control = back();
    expect([...actions().querySelectorAll('button')]).toEqual([size(), control]); expect(control.type).toBe('button'); expect(control.disabled).toBe(false); expect(control.textContent).toBe('Review saved readings'); expect(control.getAttribute('aria-label')).toBeNull(); assertOwnTarget();
    const icon = control.querySelector('svg'); expect(icon).toBeTruthy(); expect(icon.getAttribute('aria-hidden')).toBe('true'); expect(icon.getAttribute('focusable')).toBe('false'); expect(icon.querySelector('title,desc,a,[tabindex]')).toBeNull();
    expect(lab().querySelector('.circuit-lesson-writing-heading label').htmlFor).toBe(textarea.id); expect(size().getAttribute('aria-controls')).toBe(textarea.id); expect(textarea.rows).toBe(6); expect(textarea.maxLength).toBe(4000);
    textarea.style.height = '500px'; size().focus(); await click(size()); expect(textarea.rows).toBe(12); expect(textarea.style.height).toBe(''); expect(document.activeElement).toBe(size()); expect(field()).toBe(textarea); expect(back()).toBe(control); expect(textarea.value).toBe(explanation); expect(latest).toBe(initial); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('targets the normalized legacy selected result without migrating or writing that old record', async () => {
    await mount({ lessonId: undefined, lessonRecords: {}, challenge: { id: 'limit', choice: 'more', tested: true } }); const initial = latest;
    expect(lab().querySelector('select').value).toBe('limit'); expect(heading().textContent).toBe('Lamp current stayed the same'); assertOwnTarget(); await click(back()); expect(document.activeElement).toBe(heading()); expect(latest).toBe(initial); expect(latest._circuitActive.lessonRecords).toEqual({}); expect(writes).not.toHaveBeenCalled();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonId: 'unknown', lessonRecords: { gain: record() } } })); expect(lab().querySelector('select').value).toBe('gain'); assertOwnTarget();
  });

  it.each(['', 'The readings changed my first prediction.'])('repeated returns and the writing jump preserve all work, field identity and selection for explanation=%j', async explanation => {
    await mount({ lessonRecords: { gain: record('less', true, explanation), sensor: record('same') } }); await click(size()); await click(lab().querySelector('.circuit-active-lesson-trace summary'));
    const textarea = field(), target = heading(), initial = latest, serialized = JSON.stringify(latest), control = back(), focus = vi.spyOn(target, 'focus');
    textarea.focus(); textarea.setSelectionRange(explanation ? 2 : 0, explanation ? 12 : 0, 'backward'); const selection = [textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection];
    for (let i = 0; i < 3; i++) { control.focus(); await click(control); expect(document.activeElement).toBe(target); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true }); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' }); expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(target); assertOwnTarget(); }
    expect(focus).toHaveBeenCalledTimes(3); const jump = lab().querySelector('.circuit-lesson-explanation-jump'); expect(jump.textContent).toBe(explanation ? 'Review explanation' : 'Write explanation'); jump.focus(); await click(jump);
    expect(document.activeElement).toBe(textarea); expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(textarea); expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'start', behavior: 'instant' }); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(textarea.value).toBe(explanation); expect([textarea.selectionStart, textarea.selectionEnd]).toEqual(selection.slice(0, 2)); if (explanation) expect(textarea.selectionDirection).toBe(selection[2]);
    expect(latest).toBe(initial); expect(JSON.stringify(latest)).toBe(serialized); expect(lab().querySelector('.circuit-active-lesson-trace').open).toBe(true); expect(lab().querySelector('.circuit-active-lesson-saved-prediction').textContent).toContain('Decreases'); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled();
  });

  it('locale, live circuit and probe edits retain the return control without replaying a previous focus request', async () => {
    await mount(); const control = back(); await click(control); Element.prototype.scrollIntoView.mockClear(); const textarea = field(); textarea.focus(); await write(textarea, 'I am still explaining the saved evidence.'); textarea.setSelectionRange(3, 10, 'backward'); const count = writes.mock.calls.length;
    await act(async () => setLocale('Translated: ')); await flush(); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 3, project: 'dark', light: 20, probeRed: 'emitter', probeBlack: 'collector' } }));
    expect(back()).toBe(control); expect(control.textContent).toBe('Translated: Review saved readings'); expect(document.activeElement).toBe(textarea); expect([textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection]).toEqual([3, 10, 'backward']); expect(writes).toHaveBeenCalledTimes(count); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); assertOwnTarget();
    const state = latest; await click(control); expect(document.activeElement).toBe(heading()); expect(latest).toBe(state); expect(heading().textContent).toContain('Lamp current increased');
  });

  it('replay, Undo and lesson selection update the destination without causing delayed navigation or losing expanded writing', async () => {
    await mount(); await click(size()); const textarea = field(), records = clone(latest._circuitActive.lessonRecords), original = api.circuitActiveDesign(latest._circuitActive);
    await click(back()); Element.prototype.scrollIntoView.mockClear(); textarea.focus(); await click(button('Load experiment baseline')); expect(document.activeElement).toBe(textarea); await click(button('Load this experiment result')); expect(document.activeElement).toBe(textarea); await click(button('Undo active edit')); await click(button('Undo active edit')); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(original); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await select('sensor'); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(latest._circuitActive.lessonRecords).toEqual(records); const state = latest; assertOwnTarget(); await click(back()); expect(document.activeElement).toBe(heading()); expect(latest).toBe(state); expect(lab().querySelector('.circuit-active-lesson-reading small').textContent).toBe('Relative light: 80 / 100');
    textarea.focus(); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, lessonRecords: clone(prev._circuitActive.lessonRecords) } })); expect(document.activeElement).toBe(textarea);
  });

  it('JSON load and restore keep the action linked to the current saved result without automatic navigation', async () => {
    await mount(); await click(size()); await click(back()); Element.prototype.scrollIntoView.mockClear(); const original = api.circuitActiveInvestigation(latest._circuitActive), textarea = field(), control = back();
    await importDoc(api.circuitActiveInvestigation({ project: 'manual', input: 4, supply: 9, lessonId: 'sensor', lessonRecords: { sensor: record('less', true, 'Imported reasoning') } }));
    expect(back()).toBe(control); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); expect(textarea.value).toBe('Imported reasoning'); assertOwnTarget(); expect(document.activeElement).not.toBe(heading()); expect(document.activeElement).not.toBe(textarea); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    const restored = button('Restore previous investigation'); restored.focus(); await click(restored); expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(original); expect(field()).toBe(textarea); expect(textarea.rows).toBe(12); assertOwnTarget(); expect(document.activeElement).not.toBe(heading()); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    const state = latest; await click(back()); expect(document.activeElement).toBe(heading()); expect(latest).toBe(state);
  });

  it('retry removes the return action until another explicit Test and preserves other saved explanations', async () => {
    await mount(); const oldControl = back(), other = clone(latest._circuitActive.lessonRecords.sensor), note = latest._circuitActive.reflection; await click(oldControl);
    const retry = lab().querySelector('.circuit-active-lesson-retry'); await click(retry.querySelector('summary')); await click(retry.querySelector('button')); expect(back()).toBeNull(); expect(oldControl.isConnected).toBe(false); expect(actions().querySelectorAll('button')).toHaveLength(1);
    await click(button('Stays the same')); expect(back()).toBeNull(); await click(button('Test transistor prediction')); expect(back()).not.toBe(oldControl); assertOwnTarget(); expect(latest._circuitActive.lessonRecords.sensor).toEqual(other); expect(latest._circuitActive.reflection).toBe(note); const state = latest; await click(back()); expect(document.activeElement).toBe(heading()); expect(latest).toBe(state);
  });

  it('each mounted tool returns to its own heading and preserves both stores', async () => {
    const states = [];
    function Instance({ id, index }) { const [state, setState] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: seed({ lessonId: id }) }); states[index] = state; return config.render(makeCtx({ toolData: state, setToolData: setState })); }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Instance, { id: 'gain', index: 0 }), React.createElement(Instance, { id: 'limit', index: 1 })))); await flush(); const initial = states.slice(), labs = [...host.querySelectorAll('.circuit-active-lesson-lab')], controls = labs.map(node => node.querySelector('.circuit-lesson-evidence-return'));
    expect(new Set(controls.map(control => control.getAttribute('aria-controls'))).size).toBe(2);
    for (const index of [1, 0, 1]) { const target = assertOwnTarget(controls[index], labs[index]); await click(controls[index]); expect(document.activeElement).toBe(target); expect(Element.prototype.scrollIntoView.mock.instances.at(-1)).toBe(target); expect(states[0]).toBe(initial[0]); expect(states[1]).toBe(initial[1]); }
  });
});
