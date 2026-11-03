import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_DOWNLOAD_TOOL || 'stem_lab/stem_tool_dissection.js';
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


describe('downloads from the saved-frame reader', () => {
  let links, click;
  const control = lab => lab.dialog.querySelector('[data-frame-viewer-download]');
  const status = lab => lab.dialog.querySelector('[data-frame-viewer-download-status]');
  function handler(node) { const key = Object.keys(node).find(k => k.startsWith('__reactProps$')); expect(key).toBeTruthy(); return node[key].onClick; }
  beforeEach(() => { links = []; click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { links.push({ href: this.getAttribute('href'), filename: this.download }); }); });

  it('requests the opener image and filename without changing saved work or comparison', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.openers[1]);
    expect(control(lab)?.textContent).toBe('Download original image'); expect(status(lab).textContent).toBe('');
    expect(status(lab).getAttribute('aria-live')).toBe('polite'); await lab.click(control(lab));
    expect(links).toEqual([{ href: frames[1].image, filename: 'frog_muscle_101.jpg' }]);
    expect(status(lab).textContent).toBe('Download requested: frog_muscle_101.jpg.');
    expect(document.activeElement).toBe(control(lab)); expect(lab.dialog.open).toBe(true);
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('downloads the currently browsed frame rather than the original opener', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    await lab.click(lab.button('Next frame')); await lab.click(lab.button('Next frame')); await lab.click(control(lab));
    expect(links.at(-1)).toEqual({ href: frames[2].image, filename: 'frog_organs_202.jpg' });
    await lab.click(lab.button('Previous frame')); await lab.click(control(lab));
    expect(links.at(-1)).toEqual({ href: frames[1].image, filename: 'frog_muscle_101.jpg' });
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('uses the latest selection during queued navigation before a render', async () => {
    const lab = await mount(); await lab.click(lab.opener); const next = lab.button('Next frame'), download = control(lab);
    await act(async () => { next.click(); next.click(); download.click(); });
    expect(links).toEqual([{ href: frames[2].image, filename: 'frog_organs_202.jpg' }]);
    expect(status(lab).textContent).toContain('frog_organs_202.jpg'); expect(lab.dialog.querySelector('img').src).toBe(frames[2].image);
  });
  it.each([['png', 'png'], ['jpeg', 'jpg'], ['webp', 'webp']])('retains the original %s bytes, extension and zero identity', async (mime, extension) => {
    const original = { ...frame, id: 0, image: 'data:image/' + mime + ';base64,eA==' };
    const lab = await mount({ visualEvidence: [original], referenceEvidenceId: 0 }); await lab.click(lab.opener); await lab.click(control(lab));
    expect(links).toEqual([{ href: original.image, filename: 'frog_skin_0.' + extension }]);
    expect(lab.state.visualEvidence).toEqual([original]); expect(lab.state.referenceEvidenceId).toBe(0);
  });
  it('reports a failed request and permits retry without closing the reader', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    click.mockImplementationOnce(() => { throw new Error('Synthetic browser download failure'); }); await lab.click(control(lab));
    expect(links).toEqual([]); expect(status(lab).textContent).toContain('Download could not be requested');
    expect(status(lab).textContent).not.toContain('Download requested:'); expect(document.activeElement).toBe(control(lab));
    await lab.click(control(lab)); expect(links).toEqual([{ href: frames[0].image, filename: 'frog_skin_0.jpg' }]);
    expect(status(lab).textContent).toBe('Download requested: frog_skin_0.jpg.'); expect(lab.dialog.open).toBe(true);
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('keeps the original download available after an image decoding error', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    await act(async () => lab.dialog.querySelector('img').dispatchEvent(new Event('error')));
    expect(lab.dialog.querySelector('[data-frame-viewer-error]').textContent).toContain('Download original image');
    expect(control(lab).disabled).toBe(false); await lab.click(control(lab));
    expect(links).toEqual([{ href: frames[0].image, filename: 'frog_skin_0.jpg' }]);
    expect(proof(lab.state)).toEqual(before);
  });
  it('retains feedback through zoom but clears it for a different frame and on reopening', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(control(lab)); const message = status(lab).textContent;
    await lab.click(lab.button('Zoom in')); await lab.click(lab.dialog.querySelector('[data-frame-viewer-details] > summary'));
    expect(status(lab).textContent).toBe(message); expect(lab.dialog.querySelector('img').style.width).toBe('150%');
    await lab.click(lab.button('Next frame')); expect(status(lab).textContent).toBe('');
    await lab.click(control(lab)); await lab.click(lab.button('Close frame view')); await lab.click(lab.opener);
    expect(status(lab).textContent).toBe(''); expect(lab.dialog.querySelector('img').style.width).toBe('100%');
  });
  it.each(['javascript:alert(1)', 'https://example.invalid/private.png', 'data:image/svg+xml;base64,eA=='])('offers no reader download for an unsafe image: %s', async image => {
    const lab = await mount({ visualEvidence: [{ ...frame, image }] });
    expect(lab.openers).toHaveLength(0); expect(lab.host.querySelector('[data-frame-viewer-download]')).toBeNull(); expect(links).toEqual([]);
  });
  it.each([{ quizMode: true }, { practicalMode: true }, { evidenceNotebookOpen: false }, { anatomicalView: 'ventral' }, { evidenceClearPending: true }])('retires a captured download callback when context changes: %j', async patch => {
    const lab = await mount(); await lab.click(lab.opener); const stale = handler(control(lab)); await lab.patch(patch); const before = proof(lab.state);
    await act(async () => stale()); expect(links).toEqual([]); expect(proof(lab.state)).toEqual(before);
  });
  it.each([[frames[1], frames[2]], [frames[2], frames[1], frames[0]]])('retires a callback when its captured frame list changes', async visualEvidence => {
    const lab = await mount(); await lab.click(lab.opener); const stale = handler(control(lab)); await lab.patch({ visualEvidence });
    await act(async () => stale()); expect(links).toEqual([]);
  });
  it('ignores a callback retained after unmount', async () => {
    const lab = await mount(); await lab.click(lab.opener); const stale = handler(control(lab)); await lab.close();
    await act(async () => stale()); expect(links).toEqual([]);
  });
  it('keeps notebook download parity and accurate request feedback', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.host.querySelector('button[aria-label="Download frame 2: Muscle"]'));
    expect(links).toEqual([{ href: frames[1].image, filename: 'frog_muscle_101.jpg' }]);
    expect(lab.state.procedureFeedback?.message).toContain('Download requested: frog_muscle_101.jpg');
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
});
