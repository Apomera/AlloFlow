import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, current, patchState, awardXP;
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true,
  exploredOrgans: { 'frog|dorsal_skin': true, 'frog|tympanum': true, 'frog|nictitating': true, 'frog|heart': true },
  organNotes: { 'frog|dorsal_skin': 'A moist surface.', 'frog|heart': 'Between the lungs.' },
  organConfidence: { 'frog|dorsal_skin': 3, 'frog|tympanum': 1 },
  verifiedIdentifications: { 'frog|tympanum': { status: 'verified' } },
  assessmentEvidence: { 'frog|nictitating': { correct: true }, 'frog|dorsal_skin': { correct: false } },
  revealedLayers: {},
};
const evidence = () => structuredClone(Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'assessmentEvidence', 'revealedLayers'].map(key => [key, current[key]])));
async function mount(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const token = {};
  function Lab() {
    const [data, setter] = React.useState({ dissection: { ...initial, ...patch } });
    current = data.dissection;
    patchState = value => setter(prev => ({ dissection: { ...prev.dissection, ...value } }));
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Lab)));
  await act(async () => { await settle(); });
  const panel = host.querySelector('[data-observation-review]'); if (panel) panel.open = true;
}
async function click(selector) { await act(async () => host.querySelector(selector).click()); await act(async () => { await settle(); }); }
async function finishDorsalCheck() {
  await click('[data-observation-check="dorsal_skin"]');
  await act(async () => patchState({ guidedObservationPending: 'dorsal_skin' }));
  const answer = [...host.querySelectorAll('[data-guided-observation] button')].find(button => /pigmented surface/i.test(button.textContent));
  expect(answer).toBeDefined();
  await act(async () => answer.click());
  await act(async () => { await settle(); });
}
beforeEach(() => { localStorage.clear(); resetStemLab(); awardXP = vi.fn(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = null; vi.restoreAllMocks(); localStorage.clear(); });

describe('observation understanding review', () => {
  it('separates confidence, documentation, and checked identifications with provenance', async () => {
    await mount();
    const entry = id => host.querySelector('[data-observation-entry="' + id + '"]');
    expect(entry('dorsal_skin').textContent).toContain('Confidence 3 of 3');
    expect(entry('dorsal_skin').querySelector('[data-observation-verification]').textContent).toBe('Identification needs a check');
    expect(entry('tympanum').textContent).toContain('Identification checked: Guided investigation');
    expect(entry('nictitating').textContent).toContain('Identification checked: first-attempt assessment');
    expect(entry('tympanum').querySelector('[data-observation-check]')).toBeNull();
    expect(entry('dorsal_skin').querySelector('[data-observation-check]')).not.toBeNull();
  });
  it('filters unchecked and checked observations independently of missing notes and confidence', async () => {
    await mount(); const before = evidence();
    await click('[data-observation-filter="unverified"]');
    expect([...host.querySelectorAll('[data-observation-entry]')].map(node => node.dataset.observationEntry)).toEqual(['dorsal_skin', 'heart']);
    expect(host.querySelector('#diss-observation-summary').value).toContain('Scope: Needs a check · 2 of 4');
    expect(host.querySelector('#diss-observation-summary').value).toContain('Identification needs a check');
    await click('[data-observation-filter="verified"]');
    expect([...host.querySelectorAll('[data-observation-entry]')].map(node => node.dataset.observationEntry)).toEqual(['tympanum', 'nictitating']);
    expect(host.querySelector('#diss-observation-summary').value).toContain('Identification checked: Guided investigation');
    expect(evidence()).toEqual(before); expect(awardXP).not.toHaveBeenCalled();
  });
  it('applies search to verification filter counts and refreshes them after a real check', async () => {
    await mount({ _observationReviewSearch: 'moist', _observationReviewFilter: 'unverified' });
    expect(host.querySelector('[data-observation-filter="unverified"]').textContent).toBe('Needs a check (1)');
    expect(host.querySelector('[data-observation-filter="verified"]').textContent).toBe('Checked identifications (0)');
    await act(async () => patchState({ verifiedIdentifications: { ...current.verifiedIdentifications, 'frog|dorsal_skin': { status: 'verified' } } }));
    expect(host.querySelector('[data-observation-review-empty]')).not.toBeNull();
    expect(host.querySelector('[data-observation-filter="verified"]').textContent).toBe('Checked identifications (1)');
  });
  it('starts only the requested cross-layer Guided check without changing evidence or awarding credit', async () => {
    await mount({ revealedLayers: { skin: true, muscle: true }, _observationReviewFilter: 'unverified' });
    const before = evidence();
    await click('[data-observation-check="heart"]');
    expect(current.activeLayer).toBe('organs'); expect(current.guidedMode).toBe(true);
    expect(current.guidedTargetIds).toEqual(['heart']); expect(current.guidedStep).toBe(0);
    expect(document.activeElement.id).toBe('diss-canvas');
    expect(evidence()).toEqual(before); expect(awardXP).not.toHaveBeenCalled();
  });
  it('keeps locked evidence readable and blocks checks during a technique transition', async () => {
    await mount({ _incisionAnim: { active: true, startedAt: Date.now() } });
    expect(host.querySelector('[data-observation-entry="heart"] [data-observation-check]')).toBeNull();
    expect(host.querySelector('[data-observation-entry="heart"] [data-observation-locked]')).not.toBeNull();
    const before = evidence();
    expect(host.querySelector('[data-observation-check="dorsal_skin"]').disabled).toBe(true);
    await click('[data-observation-check="dorsal_skin"]');
    expect(current.guidedMode).not.toBe(true); expect(evidence()).toEqual(before);
  });
  it.each([false, true])('credits a focused check without granting whole-investigation completion (prior completion %s)', async priorCompletion => {
    await mount({ guidedComplete: priorCompletion });
    await click('[data-observation-check="dorsal_skin"]');
    expect(current._guidedCheckOnly).toBe(true);
    await act(async () => patchState({ guidedObservationPending: 'dorsal_skin' }));
    const correct = [...host.querySelectorAll('[data-guided-observation] button')].find(button => /pigmented surface/i.test(button.textContent));
    expect(correct).toBeDefined();
    await act(async () => correct.click());
    expect(current.verifiedIdentifications['frog|dorsal_skin'].status).toBe('verified');
    expect(current.guidedComplete).toBe(priorCompletion);
    expect(current.guidedMode).toBe(false); expect(current._guidedCheckOnly).toBe(false);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('dissection', 2, expect.stringContaining('Verified Dorsal Skin'));
  });
  it('does not render verification cues or actions during assessment', async () => {
    await mount({ quizMode: true });
    expect(host.querySelector('[data-observation-review]')).toBeNull();
    expect(host.querySelector('[data-observation-check]')).toBeNull();
  });

  it('announces successful verification and focuses a result that guides unfinished records', async () => {
    await mount({ organNotes: {}, organConfidence: {} });
    await finishDorsalCheck();
    const result = host.querySelector('[data-observation-check-result="dorsal_skin"]');
    expect(result).not.toBeNull();
    expect(document.activeElement.id).toBe('diss-check-result-title');
    expect(current.procedureFeedback.message).toContain('identification verified');
    expect(current.procedureFeedback.message).not.toContain('step has not advanced');
    expect(result.querySelector('[data-check-result-record-status]').textContent).toContain('Note and confidence needed');
    expect(result.querySelector('[data-check-result-remaining]').textContent).toContain('locked layers');
    const edit = [...result.querySelectorAll('button')].find(button => button.textContent.includes('Open observation record'));
    await act(async () => edit.click()); await act(async () => { await settle(); });
    expect(document.activeElement.id).toBe('diss-note-dorsal_skin');
    await act(async () => patchState({ organNotes: { 'frog|dorsal_skin': 'A new observation.' }, organConfidence: { 'frog|dorsal_skin': 2 } }));
    expect(host.querySelector('[data-check-result-record-status]').textContent).toContain('Note and confidence recorded');
  });

  it('continues to the next available unchecked observation without changing existing evidence', async () => {
    await mount({ verifiedIdentifications: {}, _observationReviewFilter: 'unverified', _observationReviewSearch: 'moist' });
    await finishDorsalCheck();
    expect(host.querySelector('[data-check-result-next]').textContent).toContain('Tympanic Membrane');
    const before = evidence(); awardXP.mockClear();
    await click('[data-check-result-next]');
    expect(current.guidedTargetIds).toEqual(['tympanum']);
    expect(current._guidedCheckResult).toBeNull();
    expect(evidence()).toEqual(before); expect(awardXP).not.toHaveBeenCalled();
  });

  it('returns to the unchanged review filter and offers an honest end-of-review message', async () => {
    await mount({ exploredOrgans: { 'frog|dorsal_skin': true }, _observationReviewFilter: 'unverified', _observationReviewSearch: 'moist' });
    await finishDorsalCheck();
    expect(host.querySelector('[data-check-result-remaining]').textContent).toContain('currently inspected');
    expect(host.querySelector('[data-check-result-remaining]').textContent).toContain('Other structures and learning objectives may still need work');
    expect(host.querySelector('[data-check-result-next]')).toBeNull();
    const back = [...host.querySelectorAll('.diss-check-result button')].find(button => button.textContent === 'Back to observation review');
    await act(async () => back.click()); await act(async () => { await settle(); });
    expect(document.activeElement.id).toBe('diss-observation-review-title');
    expect(current._observationReviewFilter).toBe('unverified'); expect(current._observationReviewSearch).toBe('moist');
    expect(host.querySelector('[data-observation-review-empty]')).not.toBeNull();
    const dismiss = [...host.querySelectorAll('.diss-check-result button')].find(button => button.textContent === 'Dismiss check summary');
    await act(async () => dismiss.click()); await act(async () => { await settle(); });
    expect(host.querySelector('[data-observation-check-result]')).toBeNull();
    expect(document.activeElement.id).toBe('diss-canvas');
  });

  it('does not show another specimen’s check result', async () => {
    await mount({ _guidedCheckResult: { specimen: 'pig', organId: 'tympanum' } });
    expect(host.querySelector('[data-observation-check-result]')).toBeNull();
  });
});
