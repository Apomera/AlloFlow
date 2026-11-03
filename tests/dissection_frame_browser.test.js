import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_FRAME_TOOL || 'stem_lab/stem_tool_dissection.js';
const fixtures = [], image = 'data:image/jpeg;base64,eA==';
const frame = { id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', capturedObservation: { note: 'Original capture note.', confidence: 2, inspected: true } };
const frames = [{ ...frame, id: 0, layerName: 'Skin' }, { ...frame, id: 101, image: 'data:image/jpeg;base64,eQ==', layer: 'muscle', layerName: 'Muscle', view: 'ventral' }, { ...frame, id: 202, image: 'data:image/jpeg;base64,eg==', layer: 'organs', layerName: 'Internal organs', view: 'internal' }];
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
  reducedMotion: true, soundEnabled: false, evidenceNotebookOpen: true, selectedOrgan: 'dorsal_skin', visualEvidence: frames, referenceEvidenceId: 202,
  splitComparison: true, organNotes: { 'frog|dorsal_skin': 'Current note.' }, organConfidence: { 'frog|dorsal_skin': 3 }, exploredOrgans: { 'frog|dorsal_skin': true }, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 };
const methods = new Map(['showModal', 'close'].map(name => [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)]));
const settle = () => new Promise(resolve => setTimeout(resolve, 15)); let config;
async function mount(patch = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, setter, closed = false;
  function Lab() { const [data, update] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; setter = update;
    return config.render(makeCtx({ toolData: data, setToolData: update, pluginInstanceToken: token, awardXP })); }
  const lab = { host, awardXP, get state() { return state; }, get openers() { return [...host.querySelectorAll('[data-frame-viewer-open]')]; }, get opener() { return lab.openers[0]; }, get dialog() { return host.querySelector('[data-frame-viewer]'); },
    button(text) { return [...lab.dialog.querySelectorAll('button')].find(node => node.textContent === text); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => setter(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async close() { if (closed) return; closed = true; await act(async () => root.unmount()); host.remove(); } };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); }); return lab;
}
function proof(state) { return structuredClone(Object.fromEntries(['selectedOrgan', 'activeLayer', 'anatomicalView', 'canvasZoom', 'canvasPanX', 'canvasPanY', 'visualEvidence', 'referenceEvidenceId', 'splitComparison', 'annotations', 'organNotes', 'organConfidence', 'exploredOrgans', 'verifiedIdentifications', 'assessmentEvidence', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function () { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function () { this.open = false; }) }); config = loadTool(file, 'dissection'); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear(); for (const [name, descriptor] of methods) { if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor); else delete HTMLDialogElement.prototype[name]; } });

describe('saved frame browsing', () => {
  it('starts from the opener and announces the current frame and total', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.openers[1]);
    expect(lab.dialog.getAttribute('aria-label')).toContain('Frame 2: Muscle, ventral view');
    expect(lab.dialog.querySelector('[data-frame-viewer-position]').textContent).toBe('Frame 2 of 3: Muscle, ventral view');
    expect(lab.dialog.querySelector('img').src).toBe(frames[1].image); expect(document.activeElement).toBe(lab.button('Close frame view'));
    expect(lab.button('Previous frame').getAttribute('aria-disabled')).toBe('false'); expect(lab.button('Next frame').getAttribute('aria-disabled')).toBe('false');
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('browses previous and next without changing the live comparison or any recorded work', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.openers[1]);
    await lab.click(lab.button('Next frame')); expect(lab.dialog.querySelector('img').src).toBe(frames[2].image);
    expect(lab.dialog.querySelector('[data-frame-viewer-position]').textContent).toContain('Frame 3 of 3');
    await lab.click(lab.button('Previous frame')); expect(lab.dialog.querySelector('img').src).toBe(frames[1].image);
    await lab.click(lab.button('Previous frame')); expect(lab.dialog.querySelector('img').src).toBe(frames[0].image);
    expect(lab.state.referenceEvidenceId).toBe(202); expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('keeps boundary controls focusable without wrapping or leaving the selected frame', async () => {
    const lab = await mount(); await lab.click(lab.opener); const previous = lab.button('Previous frame');
    expect(previous.getAttribute('aria-disabled')).toBe('true'); await lab.click(previous); expect(document.activeElement).toBe(previous);
    expect(lab.dialog.querySelector('img').src).toBe(frames[0].image);
    await lab.click(lab.button('Next frame')); await lab.click(lab.button('Next frame')); const next = lab.button('Next frame');
    expect(next.getAttribute('aria-disabled')).toBe('true'); await lab.click(next); expect(document.activeElement).toBe(next); expect(lab.dialog.querySelector('img').src).toBe(frames[2].image);
  });
  it('uses the latest local selection for rapid queued navigation', async () => {
    const lab = await mount(); await lab.click(lab.opener); const next = lab.button('Next frame'); await act(async () => { next.click(); next.click(); next.click(); });
    expect(lab.dialog.querySelector('img').src).toBe(frames[2].image); expect(lab.dialog.querySelector('[data-frame-viewer-position]').textContent).toContain('Frame 3 of 3');
    const previous = lab.button('Previous frame'); await act(async () => { previous.click(); previous.click(); }); expect(lab.dialog.querySelector('img').src).toBe(frames[0].image);
  });
  it('resets zoom and scroll for every new frame, including navigation from fit width', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Zoom in')); await lab.click(lab.button('Zoom in'));
    let viewport = lab.dialog.querySelector('[data-frame-viewer-viewport]'); viewport.scrollTop = 100; viewport.scrollLeft = 50;
    await lab.click(lab.button('Next frame')); expect(lab.dialog.querySelector('img').style.width).toBe('100%');
    viewport = lab.dialog.querySelector('[data-frame-viewer-viewport]'); expect([viewport.scrollTop, viewport.scrollLeft]).toEqual([0, 0]); viewport.scrollTop = 80; viewport.scrollLeft = 20;
    await lab.click(lab.button('Next frame')); expect([viewport.scrollTop, viewport.scrollLeft]).toEqual([0, 0]); expect(lab.dialog.querySelector('img').style.width).toBe('100%');
  });
  it('returns to the original opener and reopens that frame after browsing elsewhere', async () => {
    const lab = await mount(); const origin = lab.openers[1]; await lab.click(origin); await lab.click(lab.button('Next frame'));
    await act(async () => lab.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(lab.dialog).toBeNull(); expect(document.activeElement).toBe(origin); await lab.click(origin);
    expect(lab.dialog.querySelector('img').src).toBe(frames[1].image); expect(lab.dialog.querySelector('img').style.width).toBe('100%');
  });
  it('recovers from a failed image by moving to another frame and ignores the retired image error', async () => {
    const lab = await mount(); await lab.click(lab.opener); const old = lab.dialog.querySelector('img');
    await act(async () => old.dispatchEvent(new Event('error'))); expect(lab.dialog.querySelector('[data-frame-viewer-error]')).toBeTruthy();
    await lab.click(lab.button('Next frame')); expect(lab.dialog.querySelector('[data-frame-viewer-error]')).toBeNull(); expect(lab.dialog.querySelector('img').src).toBe(frames[1].image);
    await act(async () => old.dispatchEvent(new Event('error'))); expect(lab.dialog.querySelector('[data-frame-viewer-error]')).toBeNull();
    expect(lab.dialog.querySelector('img').style.width).toBe('100%'); expect(lab.state.visualEvidence).toEqual(frames);
  });
  it.each([
    { visualEvidence: frames.concat([{ ...frame, id: 303 }]) }, { visualEvidence: [frames[2], frames[1], frames[0]] },
    { visualEvidence: [frames[0], frames[2]] }, { visualEvidence: [frames[0], frames[1]] },
    { visualEvidence: [frames[0], { ...frames[1], image: 'data:image/jpeg;base64,eA==' }, frames[2]] },
    { visualEvidence: [frames[0], frames[1], { ...frames[2], image: 'data:image/jpeg;base64,eQ==' }] },
    { evidenceNotebookOpen: false }, { anatomicalView: 'ventral' }, { workspaceMode: 'essentials' },
  ])('closes when its captured list or context changes: %j', async patch => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Next frame')); const dialog = lab.dialog;
    await lab.patch(structuredClone(patch)); expect(lab.dialog).toBeNull(); expect(dialog.open).toBe(false);
  });
  it.each(['clear', 'remove'])('closes when an external %s confirmation begins and preserves every frame', async action => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Next frame')); const before = structuredClone(lab.state.visualEvidence);
    await lab.click(lab.host.querySelector(action === 'clear' ? '#diss-evidence-clear-all' : '[data-evidence-remove-id="202"]'));
    expect(lab.dialog).toBeNull(); expect(lab.state.visualEvidence).toEqual(before);
  });
  it('retains the current image and zoom on routine updates, then preserves latest live notes/reference when browsing', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Next frame')); await lab.click(lab.button('Zoom in'));
    await lab.patch({ timeSpent: 10, organNotes: { 'frog|dorsal_skin': 'Latest live note.' }, referenceEvidenceId: 0 });
    expect(lab.dialog.querySelector('img').src).toBe(frames[1].image); expect(lab.dialog.querySelector('img').style.width).toBe('150%'); const before = proof(lab.state);
    await lab.click(lab.button('Next frame')); expect(proof(lab.state)).toEqual(before); expect(lab.state.referenceEvidenceId).toBe(0);
  });
  it('omits pagination when only one frame exists', async () => { const lab = await mount({ visualEvidence: [frames[1]], referenceEvidenceId: 101 }); await lab.click(lab.opener); expect(lab.dialog.querySelector('[data-frame-viewer-previous]')).toBeNull(); expect(lab.dialog.querySelector('[data-frame-viewer-next]')).toBeNull(); expect(lab.dialog.querySelector('img').src).toBe(frames[1].image); });
  it('browses every retained legacy frame even above capture capacity', async () => { const many = Array.from({ length: 20 }, (_, index) => ({ ...frame, id: index, layerName: 'Saved layer ' + index })); const lab = await mount({ visualEvidence: many }); await lab.click(lab.openers[19]); expect(lab.dialog.querySelector('[data-frame-viewer-position]').textContent).toContain('Frame 20 of 20'); await lab.click(lab.button('Previous frame')); expect(lab.dialog.querySelector('[data-frame-viewer-position]').textContent).toContain('Frame 19 of 20'); expect(lab.state.visualEvidence).toEqual(many); });
  it('keeps separate labs and their gallery positions independent', async () => { const a = await mount(), b = await mount(); await a.click(a.opener); await a.click(a.button('Next frame')); await b.click(b.opener); expect(a.dialog.querySelector('img').src).toBe(frames[1].image); expect(b.dialog.querySelector('img').src).toBe(frames[0].image); await a.close(); expect(b.dialog.open).toBe(true); });
  it('saves unchanged images/reference and reloads without restoring temporary gallery navigation', async () => { const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Next frame')); await lab.click(lab.button('Next frame')); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); }); const saved = JSON.parse(localStorage.getItem('dissection_progress_frog')); expect(saved.visualEvidence).toEqual(lab.state.visualEvidence); expect(saved.referenceEvidenceId).toBe(202); expect(Object.keys(saved).filter(key => /viewer|frameBrowser|selectedFrame/.test(key))).toEqual([]); const reload = await mount({ _dissLoadedSpec: null, visualEvidence: [] }); await act(async () => { await settle(); }); expect(reload.dialog).toBeNull(); await reload.click(reload.opener); expect(reload.dialog.querySelector('img').src).toBe(frames[0].image); expect(reload.state.referenceEvidenceId).toBe(202); });
});
