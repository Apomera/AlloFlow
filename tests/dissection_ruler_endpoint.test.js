import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [], start = { x: .2, y: .3 }, end = { x: .4, y: .5 };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'essentials',
  rulerStart: start, rulerEnd: end, rulerMode: false, annotateMode: false, annotations: [{ x: .7, y: .8, type: 'dot' }],
  organNotes: { 'frog|dorsal_skin': 'An observation stays separate from the model ruler.' }, organConfidence: { 'frog|dorsal_skin': 2 },
  exploredOrgans: { 'frog|dorsal_skin': true }, reducedMotion: true, soundEnabled: false };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
let config;
async function mount(patch = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state;
  function Lab() {
    const [data, setter] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  const lab = { host, awardXP, get state() { return state; }, get edit() { return host.querySelector('[data-diss-measurement-end-edit]'); },
    get canvas() { return host.querySelector('[data-diss-canvas]'); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); await act(async () => { await settle(); }); },
    async keys(...keys) { await act(async () => { lab.canvas.focus(); for (const key of keys) lab.canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); await act(async () => { await settle(); }); },
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
  return { get state() { return store.toolData.dissection; }, callback(attr) {
    const tree = config.render(makeCtx({ toolData: store.toolData, pluginInstanceToken: token }, store));
    const node = find(tree, node => node.type === 'button' && node.props[attr]); expect(node).not.toBeNull(); return node.props.onClick;
  } };
}
function evidence(state) { return structuredClone(Object.fromEntries(['annotations', 'organNotes', 'organConfidence', 'exploredOrgans', 'verifiedIdentifications', 'procedureByLayer', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection'); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear(); });

describe('adjusting the model ruler end point', () => {
  it('keeps the complete measurement while choosing a replacement in Essentials', async () => {
    const lab = await mount(), before = evidence(lab.state);
    expect(lab.edit.textContent).toBe('Adjust end point'); await lab.click(lab.edit);
    expect(lab.state.rulerStart).toEqual(start); expect(lab.state.rulerEnd).toEqual(end);
    expect(lab.state.rulerMode).toBe(true); expect(lab.edit.getAttribute('aria-pressed')).toBe('true');
    expect(lab.host.querySelector('[data-diss-point-status]').textContent).toContain('Current approximate model distance: 2.3 cm');
    expect(document.activeElement).toBe(lab.canvas); expect(evidence(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('cancels without changing either endpoint and preserves the cancel control focus', async () => {
    const lab = await mount(); await lab.click(lab.edit); await lab.click(lab.edit);
    expect(lab.state.rulerStart).toEqual(start); expect(lab.state.rulerEnd).toEqual(end); expect(lab.state._rulerEndpointEdit).toBeNull();
    expect(lab.edit.textContent).toBe('Adjust end point'); expect(document.activeElement).toBe(lab.edit);
    expect(lab.state.procedureFeedback.message).toContain('original measurement was kept');
  });

  it('replaces only the end with a keyboard anchor, then permits a normal new measurement', async () => {
    const lab = await mount(), before = evidence(lab.state); await lab.click(lab.edit); await lab.keys('Home'); await lab.keys('Enter');
    expect(lab.state.rulerStart).toEqual(start); expect(lab.state.rulerEnd).not.toEqual(end);
    const replaced = { ...lab.state.rulerEnd }; expect(lab.state._rulerEndpointEdit).toBeNull(); expect(lab.edit.getAttribute('aria-pressed')).toBe('false');
    expect(lab.state.procedureFeedback.message).toContain('The start point was kept'); expect(evidence(lab.state)).toEqual(before);
    await lab.keys('End'); await lab.keys('Enter'); expect(lab.state.rulerStart).not.toEqual(start); expect(lab.state.rulerStart).not.toEqual(replaced); expect(lab.state.rulerEnd).toBeNull();
  });

  it('does not restart the measurement when the same pending replacement is submitted twice in one batch', async () => {
    const lab = await mount(); await lab.click(lab.edit); await lab.keys('Home'); await lab.keys('Enter', 'Enter');
    expect(lab.state.rulerStart).toEqual(start); expect(lab.state.rulerEnd).toBeTruthy(); expect(lab.state.rulerEnd).not.toEqual(end);
    expect(lab.state.procedureFeedback.message).toContain('End point changed');
  });

  it('retains marks and switches out of annotation mode when adjustment starts', async () => {
    const lab = await mount({ annotateMode: true, _annotationBreakScope: 'frog|skin|dorsal' }); const marks = structuredClone(lab.state.annotations);
    await lab.click(lab.edit); expect(lab.state.annotateMode).toBe(false); expect(lab.state.rulerMode).toBe(true); expect(lab.state._annotationBreakScope).toBeNull();
    await lab.keys('Home', 'Enter'); expect(lab.state.annotations).toEqual(marks); expect(lab.state.rulerStart).toEqual(start);
  });

  it('retires adjustment on Return to instruments while keeping the old measurement', async () => {
    const lab = await mount(); await lab.click(lab.edit); await lab.click(lab.host.querySelector('[data-diss-point-exit]'));
    expect(lab.state._rulerEndpointEdit).toBeNull(); expect(lab.state.rulerMode).toBe(false);
    expect(lab.state.rulerStart).toEqual(start); expect(lab.state.rulerEnd).toEqual(end); expect(lab.edit.getAttribute('aria-pressed')).toBe('false');
  });

  it('clears a pending adjustment when starting a new measurement', async () => {
    const lab = await mount(); await lab.click(lab.edit); await lab.click(lab.host.querySelector('[data-diss-measurement-clear]'));
    expect(lab.state._rulerEndpointEdit).toBeNull(); expect(lab.state.rulerStart).toBeNull(); expect(lab.state.rulerEnd).toBeNull(); expect(lab.edit).toBeNull();
    await lab.keys('Home', 'Enter'); expect(lab.state.rulerStart).toBeTruthy(); expect(lab.state.rulerEnd).toBeNull();
  });

  it('does not revive adjustment after a view roundtrip or layer change', async () => {
    const lab = await mount({ workspaceMode: 'advanced', revealedLayers: { skin: true } }); await lab.click(lab.edit);
    await lab.click(lab.host.querySelector('[data-spatial-view="ventral"]')); await lab.click(lab.host.querySelector('[data-spatial-view="dorsal"]'));
    expect(lab.state._rulerEndpointEdit).toBeNull(); expect(lab.edit.getAttribute('aria-pressed')).toBe('false'); await lab.click(lab.edit);
    const layer = [...lab.host.querySelectorAll('[data-dissection-layer-stepper] button')].find(button => button.getAttribute('aria-label')?.startsWith('Layer 2:'));
    await lab.click(layer); expect(lab.state.activeLayer).toBe('muscle'); expect(lab.state._rulerEndpointEdit).toBeNull();
  });

  it('does not let repeated arm/cancel callbacks invert a newer choice', () => {
    const lab = callbackLab(), arm = lab.callback('data-diss-measurement-end-edit'); arm(); const first = lab.state._rulerEndpointEdit; arm(); expect(lab.state._rulerEndpointEdit).toBe(first);
    const cancel = lab.callback('data-diss-measurement-end-edit'); cancel(); cancel(); expect(lab.state._rulerEndpointEdit).toBeNull();
    lab.callback('data-diss-measurement-end-edit')(); const next = lab.state._rulerEndpointEdit; cancel(); expect(lab.state._rulerEndpointEdit).toBe(next);
  });

  it.each([{ specimen: 'pig' }, { activeLayer: 'muscle' }, { anatomicalView: 'ventral' }, { quizMode: true }, { practicalMode: true },
    { rulerStart: { ...start } }, { rulerEnd: { x: .8, y: .9 } }, { rulerEnd: null }])('rejects stale adjustment and clear actions after %j', patch => {
    const lab = callbackLab(), edit = lab.callback('data-diss-measurement-end-edit'), clear = lab.callback('data-diss-measurement-clear');
    Object.assign(lab.state, structuredClone(patch)); const before = structuredClone(lab.state); edit(); clear(); expect(lab.state).toEqual(before);
  });

  it('keeps a pending adjustment out of saved progress', async () => {
    const lab = await mount(); await lab.click(lab.edit); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved).not.toHaveProperty('_rulerEndpointEdit'); expect(saved.organNotes).toEqual(initial.organNotes); expect(saved.annotations).toEqual(initial.annotations);
  });

  it('offers adjustment only for a completed measurement', async () => {
    const lab = await mount({ rulerEnd: null, rulerMode: true }); expect(lab.edit).toBeNull();
  });
});
