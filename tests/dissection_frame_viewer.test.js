import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_FRAME_TOOL || 'stem_lab/stem_tool_dissection.js';
const fixtures = [], image = 'data:image/jpeg;base64,eA==';
const frame = { id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', capturedObservation: { note: 'Original capture note.', confidence: 2, inspected: true } };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
  reducedMotion: true, soundEnabled: false, evidenceNotebookOpen: true, selectedOrgan: 'dorsal_skin', visualEvidence: [frame], referenceEvidenceId: 101,
  splitComparison: true, organNotes: { 'frog|dorsal_skin': 'Current note.' }, organConfidence: { 'frog|dorsal_skin': 3 }, exploredOrgans: { 'frog|dorsal_skin': true }, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 };
const methods = new Map(['showModal', 'close'].map(name => [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)]));
const settle = () => new Promise(resolve => setTimeout(resolve, 15)); let config;
async function mount(patch = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, setter, closed = false;
  function Lab() { const [data, update] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; setter = update;
    return config.render(makeCtx({ toolData: data, setToolData: update, pluginInstanceToken: token, awardXP })); }
  const lab = { host, awardXP, get state() { return state; }, get opener() { return host.querySelector('[data-frame-viewer-open]'); }, get dialog() { return host.querySelector('[data-frame-viewer]'); },
    button(text) { return [...lab.dialog.querySelectorAll('button')].find(node => node.textContent === text); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => setter(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async close() { if (closed) return; closed = true; await act(async () => root.unmount()); host.remove(); } };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); }); return lab;
}
function proof(state) { return structuredClone(Object.fromEntries(['visualEvidence', 'referenceEvidenceId', 'splitComparison', 'annotations', 'organNotes', 'organConfidence', 'exploredOrgans', 'verifiedIdentifications', 'assessmentEvidence', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function () { this.open = true; }) });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function () { this.open = false; }) }); config = loadTool(file, 'dissection'); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear(); for (const [name, descriptor] of methods) { if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor); else delete HTMLDialogElement.prototype[name]; } });

describe('saved evidence frame reading view', () => {
  it('opens the exact saved image with frame context and focus without changing recorded work', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    expect(lab.dialog.open).toBe(true); expect(document.activeElement).toBe(lab.button('Close frame view'));
    expect(lab.dialog.getAttribute('aria-label')).toContain('Frame 1: External Anatomy, dorsal view');
    expect(lab.dialog.querySelector('img').getAttribute('src')).toBe(image); expect(lab.dialog.querySelector('img').alt).toContain('frame 1');
    expect(lab.dialog.querySelector('[data-frame-viewer-size]').textContent).toBe('100% of view width'); expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('zooms the display within bounds and restores fit width without changing image bytes or notebook state', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    expect(lab.button('Zoom out').getAttribute('aria-disabled')).toBe('true'); await lab.click(lab.button('Zoom out'));
    for (const value of ['150%', '200%', '300%', '300%']) { await lab.click(lab.button('Zoom in')); expect(lab.dialog.querySelector('img').style.width).toBe(value); }
    expect(lab.button('Zoom in').getAttribute('aria-disabled')).toBe('true'); await lab.click(lab.button('Zoom out')); expect(lab.dialog.querySelector('img').style.width).toBe('200%');
    const viewport = lab.dialog.querySelector('[data-frame-viewer-viewport]'); viewport.scrollTop = 55; viewport.scrollLeft = 20;
    await lab.click(lab.button('Fit width')); expect(lab.dialog.querySelector('img').style.width).toBe('100%'); expect(viewport.scrollTop).toBe(0); expect(viewport.scrollLeft).toBe(0);
    expect(lab.dialog.querySelector('img').src).toBe(image); expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it.each(['button', 'escape', 'cancel', 'close'])('closes via %s and returns focus, reopening at fit width', async method => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Zoom in'));
    if (method === 'button') await lab.click(lab.button('Close frame view'));
    else await act(async () => lab.dialog.dispatchEvent(method === 'escape' ? new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }) : new Event(method, { bubbles: true, cancelable: true })));
    expect(lab.dialog).toBeNull(); expect(document.activeElement).toBe(lab.opener); await lab.click(lab.opener); expect(lab.dialog.querySelector('img').style.width).toBe('100%');
  });
  it('leaves modified Escape to its native shortcut', async () => { const lab = await mount(); await lab.click(lab.opener); await act(async () => lab.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true, cancelable: true }))); expect(lab.dialog).toBeTruthy(); });
  it('keeps the notebook available when the native view cannot open', async () => { HTMLDialogElement.prototype.showModal.mockImplementation(() => { throw Error('Unavailable'); }); const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener); expect(lab.dialog).toBeNull(); expect(lab.host.textContent).toContain('The saved-frame view could not open'); expect(document.activeElement).toBe(lab.opener); expect(proof(lab.state)).toEqual(before); });
  it('shows a recoverable image error without changing or removing the saved frame', async () => { const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener); await act(async () => lab.dialog.querySelector('img').dispatchEvent(new Event('error'))); expect(lab.dialog.querySelector('[data-frame-viewer-error]')).toBeTruthy(); expect(lab.dialog.querySelector('img')).toBeNull(); for (const name of ['Zoom in', 'Zoom out', 'Fit width']) expect(lab.button(name).getAttribute('aria-disabled')).toBe('true'); await lab.click(lab.button('Zoom in')); await lab.click(lab.button('Close frame view')); expect(proof(lab.state)).toEqual(before); await lab.click(lab.opener); expect(lab.dialog.querySelector('img').src).toBe(image); });
  it.each([false, true])('closes on assessment entry and disables reference enlargement (practical=%s)', async practical => { const lab = await mount(); await lab.click(lab.opener); await lab.patch(practical ? { quizMode: true, practicalMode: true, practicalEndsAt: Date.now() + 300000, practicalTimer: 300, practicalTargetIds: ['dorsal_skin', 'tympanum'] } : { quizMode: true }); expect(lab.dialog).toBeNull(); expect(lab.opener.disabled).toBe(true); await lab.click(lab.opener); expect(lab.dialog).toBeNull(); });
  it.each([
    { anatomicalView: 'ventral' }, { activeLayer: 'muscle', revealedLayers: { skin: true } }, { workspaceMode: 'essentials' }, { evidenceNotebookOpen: false },
    { specimen: 'pig', _dissLoadedSpec: 'pig' }, { visualEvidence: [{ ...frame, image: 'data:image/jpeg;base64,eQ==' }] }, { visualEvidence: [] },
  ])('retires the native view when its frame or context changes: %j', async patch => { const lab = await mount(); await lab.click(lab.opener); const dialog = lab.dialog; await lab.patch(patch); expect(lab.dialog).toBeNull(); expect(dialog.open).toBe(false); });
  it('keeps its zoom during routine updates and current live-note edits', async () => { const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Zoom in')); const dialog = lab.dialog; await lab.patch({ timeSpent: 9, selectedOrgan: 'tympanum', organNotes: { 'frog|dorsal_skin': 'Later current note.' }, referenceEvidenceId: null }); expect(lab.dialog).toBe(dialog); expect(dialog.querySelector('img').style.width).toBe('150%'); expect(lab.state.visualEvidence[0].capturedObservation.note).toBe('Original capture note.'); });
  it('keeps independent labs isolated and closes native content on unmount', async () => { const a = await mount(), b = await mount(); await a.click(a.opener); await a.click(a.button('Zoom in')); expect(b.dialog).toBeNull(); await b.click(b.opener); expect(b.dialog.querySelector('img').style.width).toBe('100%'); const dialog = a.dialog; await a.close(); expect(dialog.open).toBe(false); expect(b.dialog.open).toBe(true); });
  it('autosaves the same frames and never persists reading-view controls', async () => { const lab = await mount(); await lab.click(lab.opener); await lab.click(lab.button('Zoom in')); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); }); const saved = JSON.parse(localStorage.getItem('dissection_progress_frog')); expect(saved.visualEvidence).toEqual(lab.state.visualEvidence); expect(Object.keys(saved).filter(key => /viewer|zoom/i.test(key))).toEqual([]); const reloaded = await mount({ _dissLoadedSpec: null, visualEvidence: [] }); await act(async () => { await settle(); }); expect(reloaded.dialog).toBeNull(); expect(reloaded.state.visualEvidence).toEqual(saved.visualEvidence); });
});
