import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [], marks = [{ x: .2, y: .3, type: 'dot' }, { x: .3, y: .4, prevX: .2, prevY: .3, type: 'dot' }, { x: .7, y: .5, type: 'dot' }];
const notes = { 'frog|dorsal_skin': 'A saved observation.' };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
  toolbarToolsOpen: true, annotations: marks, organNotes: notes, organConfidence: { 'frog|dorsal_skin': 2 },
  exploredOrgans: { 'frog|dorsal_skin': true }, reducedMotion: true, soundEnabled: false };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
let config;
async function mount(patch = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, update;
  function Lab() {
    const [data, setter] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; update = setter;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  const lab = { host, awardXP, get state() { return state; }, get undo() { return host.querySelector('#diss-annotation-clear-undo'); },
    button(name) { return [...host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === name || button.textContent === name); },
    async click(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => update(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async close() { await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); }); return lab;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function callbackLab() {
  const store = newStore({ dissection: structuredClone(initial) }), token = {};
  return { get state() { return store.toolData.dissection; }, button(name) {
    const tree = config.render(makeCtx({ toolData: store.toolData, pluginInstanceToken: token }, store));
    const node = find(tree, node => node.type === 'button' && (node.props.id === name || node.props['aria-label'] === name));
    expect(node).not.toBeNull(); return node.props.onClick;
  } };
}
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection'); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear(); });

describe('recovering cleared annotation marks', () => {
  it.each(['Clear annotations', 'Clear observation marks'])('restores exact separate strokes after %s and recovers focus', async name => {
    const lab = await mount(name === 'Clear observation marks' ? { workspaceMode: 'essentials', toolbarToolsOpen: false } : {});
    const before = structuredClone(lab.state);
    await lab.click(lab.button(name)); expect(lab.state.annotations).toEqual([]); expect(document.activeElement).toBe(lab.undo);
    expect(lab.host.querySelector('.diss-point-mode')).not.toBeNull();
    await lab.click(lab.undo); expect(lab.state.annotations).toEqual(marks); expect(lab.undo).toBeNull();
    expect(document.activeElement).toBe(lab.host.querySelector('[data-diss-canvas]'));
    for (const key of ['organNotes', 'organConfidence', 'exploredOrgans']) expect(lab.state[key]).toEqual(before[key]);
    expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('retires recovery when the learner draws a new mark', async () => {
    const lab = await mount({ annotateMode: true }); await lab.click(lab.button('Clear annotations'));
    const canvas = lab.host.querySelector('[data-diss-canvas]');
    await act(async () => { canvas.focus(); for (const key of ['Home', 'Enter']) canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
    await act(async () => { await settle(); });
    expect(lab.state.annotations).toHaveLength(1); expect(lab.undo).toBeNull(); expect(lab.state._annotationClearUndo).toBeNull();
  });

  it('consumes recovery only once and rejects it after a newer clear', () => {
    const lab = callbackLab(); lab.button('Clear annotations')(); const oldUndo = lab.button('diss-annotation-clear-undo');
    oldUndo(); const restored = structuredClone(lab.state.annotations); oldUndo(); expect(lab.state.annotations).toEqual(restored);
    lab.button('Clear annotations')(); const freshUndo = lab.button('diss-annotation-clear-undo'), feedback = lab.state.procedureFeedback;
    oldUndo(); expect(lab.state.annotations).toEqual([]); expect(lab.state.procedureFeedback).toEqual(feedback);
    freshUndo(); expect(lab.state.annotations).toEqual(marks);
  });

  it.each([{ specimen: 'pig' }, { activeLayer: 'muscle' }, { anatomicalView: 'ventral' }, { quizMode: true }, { practicalMode: true },
    { annotations: [] }, { annotations: [{ x: .8, y: .8, type: 'dot' }] }])('rejects a stale recovery after changed context: %j', patch => {
    const lab = callbackLab(); lab.button('Clear annotations')(); const undo = lab.button('diss-annotation-clear-undo');
    Object.assign(lab.state, structuredClone(patch)); const before = structuredClone(lab.state);
    undo(); expect(lab.state).toEqual(before);
  });

  it('does not revive recovery after a view roundtrip', async () => {
    const lab = await mount(); await lab.click(lab.button('Clear annotations'));
    await lab.click(lab.host.querySelector('[data-spatial-view="ventral"]'));
    await lab.click(lab.host.querySelector('[data-spatial-view="dorsal"]'));
    expect(lab.state.annotations).toEqual([]); expect(lab.undo).toBeNull(); expect(lab.state._annotationClearUndo).toBeNull();
  });

  it('saves the cleared drawing and keeps the recovery snapshot out of stored progress', async () => {
    const lab = await mount(); await lab.click(lab.button('Clear annotations'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.annotations).toEqual([]); expect(saved).not.toHaveProperty('_annotationClearUndo'); expect(saved.organNotes).toEqual(notes);
    await lab.click(lab.undo); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).annotations).toEqual(marks);
  });
});
