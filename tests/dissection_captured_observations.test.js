import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const file = process.env.DISSECTION_CAPTURE_TOOL || 'stem_lab/stem_tool_dissection.js';
const fixtures = [], note = 'A moist surface.\n位置を確認した。 ملاحظة';
const image = 'data:image/jpeg;base64,eA==';
const frame = (patch = {}) => ({ id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal',
  selectedOrganId: 'dorsal_skin', selectedOrganName: 'Dorsal Skin', capturedObservation: { note, confidence: 2, inspected: true }, ...patch });
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin',
  workspaceMode: 'advanced', toolbarToolsOpen: true, evidenceNotebookOpen: true, _labReportPreviewOpen: true,
  reducedMotion: true, soundEnabled: false, exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': note },
  organConfidence: { 'frog|dorsal_skin': 2 }, visualEvidence: [], verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
async function mount(patch = {}) {
  const config = loadTool(file, 'dissection'), host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, setter;
  function Lab() { const [data, update] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; setter = update;
    return config.render(makeCtx({ toolData: data, setToolData: update, pluginInstanceToken: token, awardXP })); }
  const lab = { host, awardXP, get state() { return state; }, get card() { return host.querySelector('.diss-evidence__item'); },
    get report() { return host.querySelector('#diss-lab-report-preview')?.value || ''; },
    async click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => setter(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async capture() { const canvas = host.querySelector('[data-diss-canvas]'); canvas._captureDissectionEvidence = () => true; canvas._captureFullDissectionEvidence = () => true;
      await lab.click(host.querySelector('[data-evidence-capture]')); },
    async close() { await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); }); return lab;
}
function proof(state) { return structuredClone(Object.fromEntries(['organNotes', 'organConfidence', 'exploredOrgans', 'verifiedIdentifications', 'assessmentEvidence', 'procedureByLayer', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () { return this.matches('[data-diss-canvas]') ? null : {}; });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(image); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear(); });

describe('captured observation provenance', () => {
  it.each([0, 1, 2, 3])('captures the current note, inspection and confidence %s without credit or live-note changes', async confidence => {
    const lab = await mount({ organConfidence: { 'frog|dorsal_skin': confidence } }), before = proof(lab.state); await lab.capture();
    expect(lab.state.visualEvidence).toHaveLength(1); const captured = lab.state.visualEvidence[0];
    expect(captured.capturedObservation).toEqual({ note, confidence, inspected: true }); expect(captured.selectedOrganId).toBe('dorsal_skin');
    expect(lab.card.querySelector('[data-captured-note]').textContent).toBe(note); expect(lab.card.querySelector('[data-captured-confidence]').textContent).toContain(confidence ? confidence + ' of 3' : 'Not recorded');
    expect(proof(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('distinguishes an uninspected saved draft and a frame without a focused structure', async () => {
    const lab = await mount({ exploredOrgans: {} }); await lab.capture(); expect(lab.state.visualEvidence[0].capturedObservation.inspected).toBe(false);
    expect(lab.card.querySelector('[data-captured-inspection]').textContent).toContain('saved draft only');
    await lab.patch({ selectedOrgan: null }); await lab.capture(); expect(lab.state.visualEvidence[1].capturedObservation).toBeNull();
    expect(lab.state.exploredOrgans).toEqual({}); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('keeps the original note and self-rating after later record edits in notebook, comparison and report', async () => {
    const lab = await mount(); await lab.capture();
    await lab.patch({ organNotes: { 'frog|dorsal_skin': 'Later revised note.' }, organConfidence: { 'frog|dorsal_skin': 3 }, exploredOrgans: {} });
    expect(lab.state.visualEvidence[0].capturedObservation).toEqual({ note, confidence: 2, inspected: true });
    expect(lab.card.querySelector('[data-captured-note]').textContent).toBe(note);
    expect(lab.host.querySelector('.diss-split-reference [data-captured-note]').textContent).toBe(note);
    expect(lab.report).toContain('Evidence note at capture: ' + note); expect(lab.report).toContain('Confidence self-rating at capture: 2 of 3');
    expect(lab.report).toContain('Evidence note: Later revised note.'); expect(lab.report).toContain('Later edits to live notes do not change these captured records');
  });

  it('saves and reloads the optional snapshot without replacing current live notes', async () => {
    const lab = await mount(); await lab.capture(); await lab.patch({ organNotes: { 'frog|dorsal_skin': 'Latest live note.' } });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog')); expect(saved.visualEvidence[0].capturedObservation.note).toBe(note);
    const reload = await mount({ _dissLoadedSpec: null, visualEvidence: [], organNotes: {} }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 70)); });
    expect(reload.state.visualEvidence[0].capturedObservation).toEqual({ note, confidence: 2, inspected: true }); expect(reload.state.organNotes['frog|dorsal_skin']).toBe('Latest live note.');
  });

  it('does not backfill legacy frames from current records', async () => {
    const legacy = frame(); delete legacy.capturedObservation;
    const lab = await mount({ visualEvidence: [legacy], referenceEvidenceId: 101, splitComparison: true });
    expect(lab.card.querySelector('[data-evidence-observation-missing]')).toBeTruthy(); expect(lab.card.querySelector('[data-captured-note]')).toBeNull();
    expect(lab.state.visualEvidence[0]).not.toHaveProperty('capturedObservation'); expect(lab.report).toContain('Observation record at capture: Not recorded');
    expect(lab.report).not.toContain('Evidence note at capture: ' + note);
  });

  it.each([{ capturedObservation: undefined }, { capturedObservation: null }])('loads valid legacy/absent optional records: %j', async ({ capturedObservation }) => {
    const storedFrame = frame({ capturedObservation }); if (capturedObservation === undefined) delete storedFrame.capturedObservation;
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ schemaVersion: 21, activeLayer: 'skin', organNotes: { 'frog|dorsal_skin': 'Valid legacy note.' }, visualEvidence: [storedFrame] }));
    const lab = await mount({ _dissLoadedSpec: null }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 70)); });
    expect(lab.host.querySelector('[data-dissection-protected-save]')).toBeNull(); expect(lab.state.visualEvidence).toHaveLength(1);
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe('Valid legacy note.'); expect(lab.card.querySelector('[data-evidence-observation-missing]')).toBeTruthy();
  });

  it('shows an explicit empty capture note while preserving whitespace in storage', async () => {
    const lab = await mount({ organNotes: { 'frog|dorsal_skin': ' \n ' } }); await lab.capture();
    expect(lab.state.visualEvidence[0].capturedObservation.note).toBe(' \n '); expect(lab.card.querySelector('[data-captured-note]').textContent).toBe('No evidence note at capture');
  });

  it('renders captured note markup as text and exports no foreign specimen capture note', async () => {
    const raw = '<img src=x onerror="window.__capturedNoteExecuted=true">\n<script>bad()</script>';
    const lab = await mount({ visualEvidence: [frame({ capturedObservation: { note: raw, confidence: 1, inspected: false } }), frame({ id: 102, specimen: 'pig', capturedObservation: { note: 'FOREIGN_CAPTURE_PRIVATE_NOTE', confidence: 3, inspected: true } })] });
    expect(lab.card.querySelector('[data-captured-note]').textContent).toBe(raw); expect(lab.card.querySelector('[data-captured-note] img')).toBeNull();
    expect(lab.host.querySelectorAll('script')).toHaveLength(0); expect(window.__capturedNoteExecuted).not.toBe(true);
    expect(lab.report).toContain('Evidence note at capture: ' + raw); expect(lab.report).not.toContain('FOREIGN_CAPTURE_PRIVATE_NOTE'); expect(lab.host.textContent).not.toContain('FOREIGN_CAPTURE_PRIVATE_NOTE');
  });

  it.each([true, false])('hides captured notes and refuses capture during %s assessment entry', async practical => {
    const lab = await mount({ visualEvidence: [frame()] }); await lab.patch(practical ? { practicalMode: true, quizMode: true, practicalEndsAt: Date.now() + 300000, practicalTimer: 300, practicalTargetIds: ['dorsal_skin', 'tympanum'] } : { quizMode: true });
    expect(lab.host.querySelector('[data-captured-note]')).toBeNull(); const before = structuredClone(lab.state.visualEvidence);
    const capture = lab.host.querySelector('[data-evidence-capture]'); if (capture) await lab.click(capture); expect(lab.state.visualEvidence).toEqual(before);
  });

  it('preserves all existing snapshots when the notebook is full', async () => {
    const frames = Array.from({ length: 6 }, (_, index) => frame({ id: index })); const lab = await mount({ visualEvidence: frames }); await lab.capture();
    expect(lab.state.visualEvidence).toEqual(frames); expect(lab.state.procedureFeedback.message).toContain('full');
  });

  it.each([{ note: null, confidence: 2, inspected: true }, { note, confidence: '2', inspected: true }, { note, confidence: -1, inspected: true },
    { note, confidence: 4, inspected: true }, { note, confidence: 1.5, inspected: true }, { note, confidence: null, inspected: true },
    { note, confidence: 2, inspected: 1 }, {}, [], 'untyped snapshot'].map(capturedObservation => ({ capturedObservation })))('protects malformed stored capture metadata byte-for-byte: %j', async ({ capturedObservation }) => {
    const raw = JSON.stringify({ schemaVersion: 21, activeLayer: 'skin', organNotes: { 'frog|dorsal_skin': 'Protected original note.' }, visualEvidence: [frame({ capturedObservation })] });
    localStorage.setItem('dissection_progress_frog', raw); const lab = await mount();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); window.dispatchEvent(new Event('pagehide')); });
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw); expect(lab.host.querySelector('[data-dissection-protected-save]')).toBeTruthy();
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe(note); expect(lab.state.visualEvidence).toEqual([]);
  });
});
