import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_NOTE_TOOL || 'stem_lab/stem_tool_dissection.js';
const fixtures = [], original = 'Observed a moist surface.\n位置を確認した。 ملاحظة';
const dialogMethods = new Map(['showModal', 'close'].map(name => [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)]));
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin',
  workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, exploredOrgans: { 'frog|dorsal_skin': true },
  organNotes: { 'frog|dorsal_skin': original, 'frog|tympanum': 'Other saved record.' }, organConfidence: { 'frog|dorsal_skin': 2 },
  quizScore: 1, quizTotal: 2, verifiedIdentifications: {} };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
let config;
async function mount(patch = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, setter;
  function Lab() {
    const [data, update] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; setter = update;
    return config.render(makeCtx({ toolData: data, setToolData: update, pluginInstanceToken: token, awardXP }));
  }
  const lab = { host, awardXP, get state() { return state; }, get opener() { return host.querySelector('[data-note-editor-open]'); },
    get dialog() { return host.querySelector('[data-note-editor]'); }, get field() { return lab.dialog?.querySelector('textarea'); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); await act(async () => { await settle(); }); },
    async type(value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(lab.field, value); lab.field.dispatchEvent(new Event('input', { bubbles: true })); }); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => setter(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async close() { await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); }); return lab;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const item of node) { const result = find(item, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function callbacks() {
  const store = newStore({ dissection: structuredClone(initial) }), token = {};
  return { get state() { return store.toolData.dissection; }, edit() {
    const tree = config.render(makeCtx({ toolData: store.toolData, pluginInstanceToken: token }, store));
    return find(tree, node => node.type === 'textarea' && node.props.id === 'diss-note-dorsal_skin').props.onChange;
  } };
}
function proof(state) { return structuredClone(Object.fromEntries(['exploredOrgans', 'organConfidence', 'verifiedIdentifications', 'assessmentEvidence', 'procedureByLayer', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => {
  localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function () { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function () { this.open = false; }) });
  config = loadTool(file, 'dissection');
});
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear();
  for (const [name, descriptor] of dialogMethods) { if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor); else delete HTMLDialogElement.prototype[name]; } });

describe('larger evidence-note writing view', () => {
  it('opens the same multilingual note, focuses the editor and leaves evidence unchanged', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    expect(lab.dialog.open).toBe(true); expect(lab.field.value).toBe(original); expect(lab.field.dir).toBe('auto'); expect(document.activeElement).toBe(lab.field);
    expect(lab.dialog.getAttribute('aria-label')).toContain('Dorsal Skin'); expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('updates the original field and autosaves while the writing view is still open', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener); await lab.type(original + '\nA new observation.');
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe(original + '\nA new observation.');
    expect(lab.host.querySelector('#diss-note-dorsal_skin').value).toBe(lab.field.value);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.organNotes['frog|dorsal_skin']).toBe(lab.field.value); expect(lab.dialog).toBeTruthy();
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('retains edits and returns focus to the opener on close and plain Escape', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.type('Revised note');
    await lab.click(lab.dialog.querySelector('button')); expect(lab.dialog).toBeNull(); expect(document.activeElement).toBe(lab.opener);
    await lab.click(lab.opener); expect(lab.field.value).toBe('Revised note');
    await act(async () => lab.field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(lab.dialog).toBeNull(); expect(document.activeElement).toBe(lab.opener); expect(lab.state.organNotes['frog|dorsal_skin']).toBe('Revised note');
  });

  it('changes text size without changing the note or its credit', async () => {
    const lab = await mount(), before = structuredClone(lab.state.organNotes); await lab.click(lab.opener);
    const large = [...lab.dialog.querySelectorAll('button')].find(button => button.textContent === 'Larger text');
    await lab.click(large); expect(large.getAttribute('aria-pressed')).toBe('true'); expect(lab.field.dataset.largeText).toBe('true');
    await lab.click(large); expect(lab.field.dataset.largeText).toBe('false'); expect(lab.state.organNotes).toEqual(before);
  });

  it('keeps the original note available when native dialog opening fails', async () => {
    HTMLDialogElement.prototype.showModal.mockImplementation(() => { throw new Error('Unavailable'); });
    const lab = await mount(); await lab.click(lab.opener); expect(lab.dialog).toBeNull();
    expect(lab.host.textContent).toContain('The writing view could not open'); expect(lab.state.organNotes['frog|dorsal_skin']).toBe(original);
    expect(document.activeElement).toBe(lab.opener);
  });

  it('follows a newer same-record update without a detached private draft', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.patch({ organNotes: { ...lab.state.organNotes, 'frog|dorsal_skin': 'Latest external edit.' } });
    expect(lab.field.value).toBe('Latest external edit.'); await lab.type('Latest external edit. Continued.');
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe('Latest external edit. Continued.');
  });

  it('shows a storage failure inside the dialog while keeping the current note editable', async () => {
    const lab = await mount(); await lab.click(lab.opener);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    await lab.type('Unsaved work stays available.'); await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)); });
    expect(lab.dialog.querySelector('[data-note-editor-save-state]').dataset.state).toBe('error');
    expect(lab.dialog.textContent).toContain('not saved'); expect(lab.field.value).toBe('Unsaved work stays available.');
  });

  it('leaves composing and modified Escape events to the note field', async () => {
    const lab = await mount(); await lab.click(lab.opener);
    for (const flags of [{ isComposing: true }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }]) {
      await act(async () => lab.field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...flags })));
      expect(lab.dialog).toBeTruthy(); expect(lab.field.value).toBe(original);
    }
  });

  it.each([{ selectedOrgan: 'tympanum' }, { anatomicalView: 'ventral' }, { activeLayer: 'muscle' }, { quizMode: true }, { practicalMode: true },
    { _incisionAnim: { active: true, startedAt: 1 } }])('closes the writing view on context or availability changes: %j', async patch => {
    const lab = await mount(); await lab.click(lab.opener); await lab.patch(patch); expect(lab.dialog).toBeNull();
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe(original);
  });

  it('preserves independently edited sibling notes when an older callback updates this note', () => {
    const lab = callbacks(), edit = lab.edit(); Object.assign(lab.state, { organNotes: { ...lab.state.organNotes, 'frog|tympanum': 'New sibling note.' } });
    edit({ target: { value: 'Edited original record.' } }); expect(lab.state.organNotes).toEqual({ 'frog|dorsal_skin': 'Edited original record.', 'frog|tympanum': 'New sibling note.' });
  });

  it.each([{ specimen: 'pig' }, { activeLayer: 'muscle' }, { anatomicalView: 'ventral' }, { selectedOrgan: 'tympanum' }, { quizMode: true }, { practicalMode: true },
    { organNotes: { 'frog|dorsal_skin': 'Newer note.' } }, { _incisionAnim: { active: true } }])('refuses detached input for a changed context: %j', patch => {
    const lab = callbacks(), edit = lab.edit(); Object.assign(lab.state, structuredClone(patch)); const before = structuredClone(lab.state);
    edit({ target: { value: 'Obsolete edit.' } }); expect(lab.state).toEqual(before);
  });
});
