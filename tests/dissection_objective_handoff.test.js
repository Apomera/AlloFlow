import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 30));

async function mountLab(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), pluginInstanceToken = {};
  let state;
  const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin',
    anatomicalView: 'dorsal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {},
    assessmentEvidence: {}, procedureByLayer: {}, revealedLayers: {}, ...patch };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData, awardXP, pluginInstanceToken }));
  }
  const fixture = { host, awardXP, get state() { return state; },
    action(index) { return host.querySelector('[data-objective-action="' + index + '"]'); },
    async click(index) {
      const button = this.action(index); expect(button).not.toBeNull();
      button.closest('details').open = true; button.focus();
      await act(async () => { button.click(); }); await act(async () => { await settle(); });
    },
    async close() { await act(async () => { root.unmount(); }); host.remove(); }
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return fixture;
}

function evidence(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence',
    'verifiedIdentifications', 'assessmentEvidence', 'revealedLayers', 'procedureByLayer']
    .map(key => [key, state[key]])));
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  for (const f of fixtures.splice(0).reverse()) await f.close();
  await settle(); localStorage.clear(); vi.restoreAllMocks();
});

describe('objective evidence handoffs', () => {
  it('takes an unobserved available target to the directory without granting observation credit', async () => {
    const f = await mountLab({ flashcardMode: true, toolbarStudyOpen: true });
    const before = evidence(f.state);
    expect(f.action(1).textContent).toBe('Find Dorsal Skin');
    await f.click(1);
    expect(f.state.organSearch).toBe('Dorsal Skin');
    expect(f.state.flashcardMode).toBe(false);
    expect(f.state.toolbarStudyOpen).toBe(false);
    expect(document.activeElement.id).toBe('diss-organ-search');
    expect(evidence(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('directs a locked target to the furthest available layer without revealing it', async () => {
    const f = await mountLab({ revealedLayers: { skin: true } });
    const before = evidence(f.state);
    expect(f.action(0).dataset.objectivePhase).toBe('prepare');
    expect(f.action(0).textContent).toBe('Prepare to reach Heart (3-chamber)');
    await f.click(0);
    expect(f.state.activeLayer).toBe('muscle');
    expect(f.state.procedureFeedback.message).toContain('locked Organs layer');
    expect(document.activeElement.id).toBe('diss-canvas');
    expect(evidence(f.state)).toEqual(before);
  });

  it.each([
    [{}, { 'frog|heart': 2 }, 'Write evidence note', 'diss-note-heart'],
    [{ 'frog|heart': 'I observed its position between the lungs.' }, {}, 'Choose confidence', 'diss-confidence-heart-1'],
  ])('opens only the missing record field across available layers', async (organNotes, organConfidence, label, target) => {
    const f = await mountLab({ revealedLayers: { skin: true, muscle: true },
      exploredOrgans: { 'frog|heart': true }, organNotes, organConfidence });
    const before = evidence(f.state);
    expect(f.action(0).dataset.objectivePhase).toBe('record');
    expect(f.action(0).textContent).toContain(label);
    await f.click(0);
    expect(f.state.activeLayer).toBe('organs');
    expect(f.state.selectedOrgan).toBe('heart');
    expect(document.activeElement.id).toBe(target);
    expect(evidence(f.state)).toEqual(before);
  });

  it('starts a focused Guided check for the exact missing understanding target', async () => {
    const f = await mountLab({ specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye',
      exploredOrgans: { 'sheepEye|optic_nerve': true },
      organNotes: { 'sheepEye|optic_nerve': 'A bundle leaves the rear of the eye.' },
      organConfidence: { 'sheepEye|optic_nerve': 2 } });
    const before = evidence(f.state);
    expect(f.action(3).dataset.objectivePhase).toBe('verify');
    await f.click(3);
    expect(f.state.guidedMode).toBe(true);
    expect(f.state.guidedTargetIds).toEqual(['optic_nerve']);
    expect(f.state.guidedObservationPending).toBeNull();
    expect(document.activeElement.id).toBe('diss-canvas');
    expect(evidence(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('preserves a specific Guided target when its field still requires exposure', async () => {
    const f = await mountLab({ revealedLayers: { skin: true, muscle: true },
      exploredOrgans: { 'frog|heart': true }, organNotes: { 'frog|heart': 'Heart at the anterior midline.' },
      organConfidence: { 'frog|heart': 2 } });
    const before = evidence(f.state);
    await f.click(0);
    expect(f.state.activeLayer).toBe('organs');
    expect(f.state.guidedTargetIds).toEqual(['heart']);
    expect(f.state.guidedMode).toBe(true);
    expect(f.host.querySelector('#diss-next-action-title').textContent).toContain('visible');
    expect(evidence(f.state)).toEqual(before);
  });

  it('removes the action once all three forms of evidence demonstrate an objective', async () => {
    const f = await mountLab({ exploredOrgans: { 'frog|heart': true },
      organNotes: { 'frog|heart': 'Heart at the anterior midline.' }, organConfidence: { 'frog|heart': 2 },
      assessmentEvidence: { 'frog|heart': { correct: true, at: 100 } } });
    expect(f.action(0)).toBeNull();
    expect(f.host.querySelector('.diss-objective-item').dataset.objectiveStatus).toBe('demonstrated');
  });

  it.each([{ quizMode: true }, { practicalMode: true, quizMode: true, practicalEndsAt: Date.now() + 60000 },
    { _incisionAnim: { active: true } }])('keeps active assessments and layer transitions protected', async patch => {
    const f = await mountLab(patch), before = evidence(f.state);
    expect(f.action(1).disabled).toBe(true);
    await f.click(1);
    expect(f.state.activeLayer).toBe('skin');
    expect(f.state.organSearch || '').toBe('');
    expect(evidence(f.state)).toEqual(before);
  });
});
