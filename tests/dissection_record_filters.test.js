import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [], settle = () => new Promise(resolve => setTimeout(resolve, 20));
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
  exploredOrgans: Object.fromEntries(['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating', 'heart'].map(id => ['frog|' + id, true])),
  organNotes: { 'frog|dorsal_skin': '', 'frog|ventral_skin': ' \n ', 'frog|tympanum': 'A thin membrane.', 'frog|nictitating': 'A clear cover.', 'frog|liver': 'Uninspected draft.' },
  organConfidence: { 'frog|ventral_skin': 2, 'frog|nictitating': 1, 'frog|heart': 'invalid' },
  verifiedIdentifications: { 'frog|dorsal_skin': { status: 'verified' } }, quizScore: 1, quizTotal: 2,
};
async function mount(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, update;
  function Lab() {
    const [data, setter] = React.useState({ dissection: { ...structuredClone(initial), ...patch } }); state = data.dissection; update = setter;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  const lab = { host, awardXP, get state() { return state; },
    get ids() { return [...host.querySelectorAll('[data-observation-entry]')].map(node => node.dataset.observationEntry); },
    filter(id) { return host.querySelector('[data-observation-filter="' + id + '"]'); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); await act(async () => { await settle(); }); },
    async patch(values) { await act(async () => update(data => ({ dissection: { ...data.dissection, ...values } }))); await act(async () => { await settle(); }); },
    async close() { await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); });
  const panel = host.querySelector('[data-observation-review]'); if (panel) panel.open = true; return lab;
}
function evidence(state) { return structuredClone(Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'assessmentEvidence', 'procedureByLayer', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const lab of fixtures.splice(0).reverse()) await lab.close(); vi.restoreAllMocks(); localStorage.clear(); });

describe('observation review by missing record field', () => {
  it('separates missing notes and missing confidence from low confidence and identification checks', async () => {
    const lab = await mount(), before = evidence(lab.state);
    expect(lab.filter('missing-note').textContent).toBe('Missing notes (3)'); expect(lab.filter('missing-confidence').textContent).toBe('Missing confidence (3)');
    await lab.click(lab.filter('missing-note')); expect(lab.ids).toEqual(['dorsal_skin', 'ventral_skin', 'heart']);
    await lab.click(lab.filter('missing-confidence')); expect(lab.ids).toEqual(['dorsal_skin', 'tympanum', 'heart']);
    await lab.click(lab.filter('uncertain')); expect(lab.ids).toEqual(['nictitating']);
    expect(evidence(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    ['missing-note', 'Write evidence note', 'diss-note-dorsal_skin'],
    ['missing-confidence', 'Choose confidence', 'diss-confidence-dorsal_skin-1'],
  ])('hands both-missing records directly to the %s field', async (filter, label, target) => {
    const lab = await mount({ _observationReviewFilter: filter }), before = evidence(lab.state);
    const button = lab.host.querySelector('[data-observation-edit="dorsal_skin"]'); expect(button.textContent).toBe(label + ': Dorsal Skin');
    await lab.click(button); expect(document.activeElement.id).toBe(target); expect(lab.state.selectedOrgan).toBe('dorsal_skin');
    expect(evidence(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('uses search-aware field counts and exports only matching inspected records', async () => {
    const lab = await mount({ _observationReviewFilter: 'missing-confidence', _observationReviewSearch: 'thin' });
    expect(lab.ids).toEqual(['tympanum']); expect(lab.filter('missing-note').textContent).toBe('Missing notes (0)');
    expect(lab.filter('missing-confidence').textContent).toBe('Missing confidence (1)');
    const summary = lab.host.querySelector('#diss-observation-summary').value;
    expect(summary).toContain('Scope: Missing confidence · 1 of 5'); expect(summary).toContain('Tympanic Membrane'); expect(summary).not.toContain('Uninspected draft');
    await lab.patch({ _observationReviewSearch: 'skin', _observationReviewFilter: 'missing-note' });
    expect(lab.ids).toEqual(['dorsal_skin', 'ventral_skin']); expect(lab.filter('missing-note').textContent).toBe('Missing notes (2)');
    expect(lab.filter('missing-confidence').textContent).toBe('Missing confidence (2)');
  });

  it('updates both field backlogs when an actual confidence action finishes only that field', async () => {
    const lab = await mount({ _observationReviewFilter: 'missing-confidence' }); await lab.click(lab.host.querySelector('[data-observation-edit="dorsal_skin"]'));
    await lab.click(lab.host.querySelector('#diss-confidence-dorsal_skin-2'));
    expect(lab.state.organConfidence['frog|dorsal_skin']).toBe(2); expect(lab.state.organNotes['frog|dorsal_skin']).toBe('');
    expect(lab.ids).toEqual(['tympanum', 'heart']); expect(lab.filter('missing-confidence').textContent).toBe('Missing confidence (2)');
    await lab.click(lab.filter('missing-note')); expect(lab.ids).toContain('dorsal_skin'); expect(lab.filter('missing-note').textContent).toBe('Missing notes (3)');
    expect(lab.state.verifiedIdentifications).toEqual(initial.verifiedIdentifications); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('removes a completed note from its backlog while preserving missing confidence', async () => {
    const lab = await mount({ _observationReviewFilter: 'missing-note' });
    await lab.patch({ organNotes: { ...lab.state.organNotes, 'frog|dorsal_skin': 'Observed pigment on the back.' } });
    expect(lab.ids).toEqual(['ventral_skin', 'heart']); expect(lab.filter('missing-note').textContent).toBe('Missing notes (2)');
    await lab.click(lab.filter('missing-confidence')); expect(lab.ids).toContain('dorsal_skin');
    expect(lab.host.querySelector('[data-observation-edit="dorsal_skin"]').textContent).toBe('Choose confidence: Dorsal Skin');
  });

  it.each(['missing-note', 'missing-confidence'])('keeps locked records readable in %s without unlocking or navigating', async filter => {
    const lab = await mount({ _observationReviewFilter: filter }), before = evidence(lab.state);
    const heart = lab.host.querySelector('[data-observation-entry="heart"]'); expect(heart).toBeTruthy();
    expect(heart.querySelector('[data-observation-edit]')).toBeNull(); expect(heart.querySelector('[data-observation-locked]')).toBeTruthy();
    expect(lab.state.activeLayer).toBe('skin'); expect(evidence(lab.state)).toEqual(before);
  });

  it('blocks direct field handoffs during a reveal without hiding the backlog', async () => {
    const lab = await mount({ _observationReviewFilter: 'missing-confidence', _incisionAnim: { active: true, startedAt: Date.now() } });
    const before = evidence(lab.state), button = lab.host.querySelector('[data-observation-edit="dorsal_skin"]');
    expect(button.disabled).toBe(true); await lab.click(button); expect(evidence(lab.state)).toEqual(before); expect(lab.state.selectedOrgan).not.toBe('dorsal_skin');
  });

  it.each([0, -1, 4, 'invalid', null])('treats unsupported confidence %j as missing without rewriting it', async confidence => {
    const lab = await mount({ _observationReviewFilter: 'missing-confidence', organConfidence: { ...initial.organConfidence, 'frog|dorsal_skin': confidence } });
    expect(lab.ids).toContain('dorsal_skin'); expect(lab.state.organConfidence['frog|dorsal_skin']).toBe(confidence);
  });

  it('shows an empty matching backlog without changing the selected field filter', async () => {
    const lab = await mount({ _observationReviewFilter: 'missing-note', _observationReviewSearch: 'no such structure' });
    expect(lab.ids).toEqual([]); expect(lab.host.querySelector('[data-observation-review-empty]')).toBeTruthy();
    expect(lab.filter('missing-note').getAttribute('aria-pressed')).toBe('true');
    expect(lab.host.querySelector('[data-observation-review-count]').textContent).toBe('0 of 5 inspected structures shown.');
    expect(lab.host.querySelector('#diss-observation-summary')).toBeNull();
  });

  it('saves the original record format without persisting the temporary field filter', async () => {
    const lab = await mount({ _observationReviewFilter: 'missing-confidence' }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved).not.toHaveProperty('_observationReviewFilter'); expect(saved.organNotes).toEqual(initial.organNotes);
    expect(saved.organConfidence['frog|ventral_skin']).toBe(2); expect(saved.verifiedIdentifications).toEqual(initial.verifiedIdentifications);
  });
});
