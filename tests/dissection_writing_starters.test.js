import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_STARTER_TOOL || 'stem_lab/stem_tool_dissection.js';
const fixtures = [], original = 'A moist surface.\n位置を確認した。 ملاحظة';
const methods = new Map(['showModal', 'close'].map(name => [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)]));
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin',
  workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, exploredOrgans: { 'frog|dorsal_skin': true },
  organNotes: { 'frog|dorsal_skin': original, 'frog|tympanum': 'Keep this other record.' }, organConfidence: { 'frog|dorsal_skin': 2 }, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
async function mount(patch = {}) {
  const config = loadTool(file, 'dissection'), host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, update;
  function Lab() { const [data, setter] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; update = setter;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP })); }
  const lab = { host, awardXP, get state() { return state; }, get dialog() { return host.querySelector('[data-note-editor]'); },
    get field() { return lab.dialog?.querySelector('textarea'); }, get undo() { return lab.dialog?.querySelector('[data-note-starter-undo]'); },
    starter(id = 'observation') { return lab.dialog.querySelector('[data-note-starter="' + id + '"]'); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); await act(async () => { await settle(); }); },
    async type(value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(lab.field, value); lab.field.dispatchEvent(new Event('input', { bubbles: true })); }); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => update(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async close() { await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); });
  await lab.click(host.querySelector('[data-note-editor-open]')); lab.dialog.querySelector('details').open = true; return lab;
}
function proof(state) { return structuredClone(Object.fromEntries(['exploredOrgans', 'organConfidence', 'verifiedIdentifications', 'assessmentEvidence', 'procedureByLayer', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function () { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function () { this.open = false; }) }); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear();
  for (const [name, descriptor] of methods) { if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor); else delete HTMLDialogElement.prototype[name]; } });

describe('evidence starters in the larger writing view', () => {
  it.each([['observation', 'I observed '], ['location', 'It is located '], ['reasoning', 'This supports the identification because '], ['reference', 'The reference states ']])('inserts the existing %s prompt and returns a useful caret without credit', async (id, text) => {
    const lab = await mount(), before = proof(lab.state); lab.field.setSelectionRange(0, 0); await lab.click(lab.starter(id));
    expect(lab.field.value).toBe(text + original); expect(lab.state.organNotes['frog|dorsal_skin']).toBe(text + original);
    expect(document.activeElement).toBe(lab.field); expect(lab.field.selectionStart).toBe(text.length); expect(lab.field.selectionEnd).toBe(text.length);
    expect(lab.undo).toBeTruthy(); expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('keeps the selected text and inserts after the selection', async () => {
    const lab = await mount(); lab.field.setSelectionRange(2, 8); await lab.click(lab.starter());
    expect(lab.field.value).toBe(original.slice(0, 8) + 'I observed ' + original.slice(8));
    expect(lab.field.value).toContain(original.slice(2, 8)); expect(lab.field.selectionStart).toBe(8 + 'I observed '.length);
  });

  it.each(['', ' \n ', 'ملاحظة 日本語\n', 'A note'])('undo restores exact note bytes for %j', async note => {
    const lab = await mount({ organNotes: { ...initial.organNotes, 'frog|dorsal_skin': note } }); lab.field.setSelectionRange(note.length, note.length);
    await lab.click(lab.starter()); await lab.click(lab.undo); expect(lab.field.value).toBe(note); expect(lab.undo).toBeNull();
    expect(document.activeElement).toBe(lab.field); expect(lab.field.selectionStart).toBe(note.length); expect(lab.dialog.textContent).toContain('Your earlier note is back');
  });

  it('offers only the most recent insertion for undo', async () => {
    const lab = await mount(); lab.field.setSelectionRange(0, 0); await lab.click(lab.starter()); const first = lab.field.value;
    await lab.click(lab.starter('location')); expect(lab.field.value).not.toBe(first); await lab.click(lab.undo);
    expect(lab.field.value).toBe(first); expect(lab.undo).toBeNull();
  });

  it('retires recovery immediately after typing, even if the note is later changed back', async () => {
    const lab = await mount(); await lab.click(lab.starter()); const after = lab.field.value; await lab.type(after + 'New writing.'); expect(lab.undo).toBeNull();
    await lab.type(after); expect(lab.undo).toBeNull(); expect(lab.field.value).toBe(after);
  });

  it('retires recovery after a newer external note without changing that note', async () => {
    const lab = await mount(); await lab.click(lab.starter()); const inserted = lab.field.value;
    await lab.patch({ organNotes: { ...lab.state.organNotes, 'frog|dorsal_skin': 'Independently revised.' } }); expect(lab.undo).toBeNull(); expect(lab.field.value).toBe('Independently revised.');
    await lab.patch({ organNotes: { ...lab.state.organNotes, 'frog|dorsal_skin': inserted } }); expect(lab.undo).toBeNull();
  });

  it('closing and reopening keeps the note but drops insertion recovery', async () => {
    const lab = await mount(); await lab.click(lab.starter()); const after = lab.field.value; await lab.click(lab.dialog.querySelector('button'));
    await lab.click(lab.host.querySelector('[data-note-editor-open]')); expect(lab.field.value).toBe(after); expect(lab.undo).toBeNull();
  });

  it('text size changes keep an unchanged insertion available', async () => {
    const lab = await mount(); await lab.click(lab.starter());
    await lab.click([...lab.dialog.querySelectorAll('button')].find(button => button.textContent === 'Larger text')); expect(lab.undo).toBeTruthy(); await lab.click(lab.undo); expect(lab.field.value).toBe(original);
  });

  it('preserves a later sibling note while Undo restores only the inserted note', async () => {
    const lab = await mount(); await lab.click(lab.starter());
    await lab.patch({ organNotes: { ...lab.state.organNotes, 'frog|tympanum': 'Later independent observation.' } });
    expect(lab.undo).toBeTruthy(); await lab.click(lab.undo);
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe(original); expect(lab.state.organNotes['frog|tympanum']).toBe('Later independent observation.');
  });

  it('saves insert/undo through the original format and preserves other records', async () => {
    const lab = await mount(); await lab.click(lab.starter()); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    let saved = JSON.parse(localStorage.getItem('dissection_progress_frog')); expect(saved.organNotes['frog|dorsal_skin']).toBe(lab.field.value); expect(saved.organNotes['frog|tympanum']).toBe(initial.organNotes['frog|tympanum']);
    expect(Object.keys(saved).some(key => /starterUndo|writing/i.test(key))).toBe(false);
    await lab.click(lab.undo); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    saved = JSON.parse(localStorage.getItem('dissection_progress_frog')); expect(saved.organNotes['frog|dorsal_skin']).toBe(original);
  });

  it('coalesces duplicate insertion from one pre-commit callback and duplicate undo safely', async () => {
    const lab = await mount(); const insert = lab.starter();
    await act(async () => { insert.click(); insert.click(); }); await act(async () => { await settle(); });
    expect(lab.field.value.split('I observed ').length - 1).toBe(1);
    const undo = lab.undo; await act(async () => { undo.click(); undo.click(); }); await act(async () => { await settle(); }); expect(lab.field.value).toBe(original);
  });
});
