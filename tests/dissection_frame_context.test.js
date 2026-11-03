import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_CONTEXT_TOOL || 'stem_lab/stem_tool_dissection.js';
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

describe('capture context in the saved frame reader', () => {
  function metadata(lab) { return lab.dialog.querySelector('[data-frame-viewer-metadata]'); }
  function details(lab) { return lab.dialog.querySelector('[data-frame-viewer-details]'); }
  it('opens historical details without replacing them with the current observation', async () => {
    const lab = await mount(), before = proof(lab.state); await lab.click(lab.opener);
    expect(details(lab)).toBeTruthy(); expect(details(lab).open).toBe(false);
    await lab.click(details(lab).querySelector('summary'));
    expect(details(lab).open).toBe(true);
    expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('Original capture note.');
    expect(metadata(lab).querySelector('[data-captured-confidence]').textContent).toContain('2 of 3');
    expect(metadata(lab).textContent).not.toContain('Current note.');
    expect(metadata(lab).querySelector('h4').textContent).toBe('Observation at capture');
    expect(metadata(lab).querySelector('details')).toBeNull();
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('keeps the pane open while Previous and Next show the corresponding saved record', async () => {
    const snapshots = frames.map((f, i) => ({ ...f, selectedOrganName: 'Saved focus ' + i, capturedAt: '2026-10-31T12:30:00Z', capturedObservation: { note: 'Captured record ' + i, confidence: i + 1, inspected: i !== 0 } }));
    const lab = await mount({ visualEvidence: snapshots }), before = proof(lab.state); await lab.click(lab.opener); await lab.click(details(lab).querySelector('summary'));
    await lab.click(lab.button('Next frame'));
    expect(details(lab).open).toBe(true); expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('Captured record 1');
    expect(metadata(lab).textContent).toContain('Focused on Saved focus 1');
    expect(metadata(lab).querySelector('time').dateTime).toBe('2026-10-31T12:30:00.000Z');
    await lab.click(lab.button('Next frame')); expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('Captured record 2');
    await lab.click(lab.button('Previous frame')); expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('Captured record 1');
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it.each([
    { capturedObservation: undefined },
    { capturedObservation: { note: 'Unsafe record', confidence: 4, inspected: true } },
    { specimen: 'rat', capturedObservation: { note: 'Other specimen note', confidence: 2, inspected: true } }
  ])('shows missing historical records explicitly without using live notes: %j', async patch => {
    const lab = await mount({ visualEvidence: [{ ...frame, ...patch }] }); await lab.click(lab.opener);
    expect(metadata(lab).querySelector('[data-evidence-observation-missing]').textContent).toBe('Observation record at capture: Not recorded');
    expect(metadata(lab).querySelector('[data-captured-note]')).toBeNull(); expect(metadata(lab).textContent).not.toContain('Current note.');
  });
  it('distinguishes an uninspected draft, zero confidence, and an empty note', async () => {
    const lab = await mount({ visualEvidence: [{ ...frame, capturedObservation: { note: '  ', confidence: 0, inspected: false } }] }); await lab.click(lab.opener);
    expect(metadata(lab).querySelector('[data-captured-inspection]').textContent).toContain('Not yet inspected at capture');
    expect(metadata(lab).querySelector('[data-captured-confidence]').textContent).toContain('Not recorded');
    expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('No evidence note at capture');
  });
  it('renders long multiline and bidirectional historical text safely', async () => {
    const note = 'ملاحظة محفوظة\n' + 'Long historical evidence '.repeat(60) + '\n<img src=x onerror=alert(1)>';
    const lab = await mount({ visualEvidence: [{ ...frame, capturedObservation: { note, confidence: 1, inspected: true } }] }); await lab.click(lab.opener);
    const node = metadata(lab).querySelector('[data-captured-note]'); expect(node.textContent).toBe(note); expect(node.dir).toBe('auto'); expect(node.querySelector('img')).toBeNull();
  });
  it('keeps capture metadata historical through later live edits and reference changes', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(details(lab).querySelector('summary')); await lab.click(lab.button('Zoom in'));
    await lab.patch({ organNotes: { 'frog|dorsal_skin': 'Later live edit' }, organConfidence: { 'frog|dorsal_skin': 1 }, referenceEvidenceId: 0 });
    expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('Original capture note.'); expect(metadata(lab).querySelector('[data-captured-confidence]').textContent).toContain('2 of 3');
    expect(details(lab).open).toBe(true); expect(lab.dialog.querySelector('img').style.width).toBe('150%');
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe('Later live edit'); expect(lab.state.referenceEvidenceId).toBe(0); expect(lab.awardXP).not.toHaveBeenCalled();
  });
  it('includes the details summary in focus wrapping when the image cannot be displayed', async () => {
    const lab = await mount(); await lab.click(lab.opener); await act(async () => lab.dialog.querySelector('img').dispatchEvent(new Event('error')));
    const summary = details(lab).querySelector('summary'), close = lab.button('Close frame view');
    for (const node of lab.dialog.querySelectorAll('button, summary')) node.getClientRects = () => [{ width: 10, height: 10 }];
    summary.focus(); await act(async () => summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(close);
    await act(async () => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(summary);
  });
  it('retains context even for an undecodable image and starts collapsed on reopening', async () => {
    const lab = await mount(); await lab.click(lab.opener); await lab.click(details(lab).querySelector('summary'));
    await act(async () => lab.dialog.querySelector('img').dispatchEvent(new Event('error')));
    expect(metadata(lab).querySelector('[data-captured-note]').textContent).toBe('Original capture note.');
    await lab.click(lab.button('Close frame view')); await lab.click(lab.opener); expect(details(lab).open).toBe(false);
    expect(lab.state.visualEvidence).toEqual(frames);
  });
});
