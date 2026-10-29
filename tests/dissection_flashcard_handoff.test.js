import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
const practice = { scope: 'frog|skin', index: 1, complete: false, revealed: true,
  reviewIds: ['tympanum', 'dorsal_skin'], ratings: { tympanum: 'again', dorsal_skin: 'recalled' },
  drafts: { dorsal_skin: 'My recall draft: a permeable protective surface.', tympanum: 'A membrane involved in hearing.' } };

async function mountLab(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), pluginInstanceToken = {}, awardXP = vi.fn();
  let state, setState;
  const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', visualRealism: 'accessible', reducedMotion: true, soundEnabled: false,
    flashcardMode: true, toolbarStudyOpen: true, _flashcardPractice: structuredClone(practice),
    exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Observed dark mottling on the dorsal surface.' },
    organConfidence: { 'frog|dorsal_skin': 2 }, verifiedIdentifications: {}, assessmentEvidence: {},
    revealedLayers: { skin: true }, procedureByLayer: {}, ...patch };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; setState = setToolData;
    return config.render(makeCtx({ toolData, setToolData, pluginInstanceToken, awardXP }));
  }
  const f = { host, awardXP, get state() { return state; },
    async click(selector) {
      const button = typeof selector === 'string' ? host.querySelector(selector) : selector;
      expect(button).toBeTruthy(); button.focus();
      await act(async () => { button.click(); }); await act(async () => { await settle(); });
    },
    async patch(patch) { await act(async () => { setState(current => ({ ...current, dissection: { ...current.dissection, ...patch } })); }); await act(async () => { await settle(); }); },
    async close() { await act(async () => { root.unmount(); }); host.remove(); }
  };
  fixtures.push(f);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return f;
}
function evidence(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications',
    'assessmentEvidence', 'revealedLayers', 'procedureByLayer'].map(key => [key, state[key]])));
}
async function editText(field, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const f of fixtures.splice(0).reverse()) await f.close(); await settle(); localStorage.clear(); vi.restoreAllMocks(); });

describe('flashcard specimen and evidence handoffs', { timeout: 30000 }, () => {
  it('pauses at the exact card, finds its directory entry, and resumes the focused round unchanged', async () => {
    const f = await mountLab(), before = evidence(f.state);
    expect(f.host.querySelector('[data-flashcard-id]').dataset.flashcardId).toBe('dorsal_skin');
    await f.click('[data-flashcard-handoff="find"]');
    expect(f.state.flashcardMode).toBe(false); expect(f.state.organSearch).toBe('Dorsal Skin');
    expect(document.activeElement.id).toBe('diss-organ-search');
    expect(f.host.querySelector('[data-flashcard-resume]').textContent).toContain('Flashcards paused · Dorsal Skin');
    expect(f.state._flashcardReturn.practice).toEqual(practice);
    expect(evidence(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    await f.click('[data-flashcard-resume-action]');
    expect(f.state._flashcardReturn).toBeNull(); expect(f.state._flashcardPractice).toEqual(practice);
    expect(f.host.querySelector('#diss-flashcard-draft').value).toBe(practice.drafts.dorsal_skin);
    expect(f.host.querySelector('[data-flashcard-counter]').textContent).toBe('2 / 2');
    expect(f.host.querySelector('#diss-flashcard-answer').hidden).toBe(false);
    expect(document.activeElement.id).toBe('diss-flashcard-prompt');
    expect(evidence(f.state)).toEqual(before);
  });

  it('reviews and edits real observations separately from the retained recall draft', async () => {
    const f = await mountLab(), before = evidence(f.state);
    await f.click('[data-flashcard-handoff="record"]');
    expect(document.activeElement.id).toBe('diss-note-dorsal_skin');
    const note = f.host.querySelector('#diss-note-dorsal_skin');
    expect(note.value).toBe(before.organNotes['frog|dorsal_skin']);
    expect(note.value).not.toBe(practice.drafts.dorsal_skin);
    await editText(note, 'Observed mottling and a moist-looking surface beside the midline.');
    expect(f.state.organNotes['frog|dorsal_skin']).toContain('beside the midline');
    await f.click('[data-flashcard-resume-action]');
    expect(f.state._flashcardPractice).toEqual(practice);
    expect(f.state.organNotes['frog|dorsal_skin']).toContain('beside the midline');
    expect(f.state.exploredOrgans).toEqual(before.exploredOrgans);
    expect(f.state.verifiedIdentifications).toEqual(before.verifiedIdentifications);
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('offers only navigation for uninspected structures and never credits the handoff', async () => {
    const f = await mountLab({ exploredOrgans: {}, organNotes: {}, organConfidence: {} }), before = evidence(f.state);
    expect(f.host.querySelector('[data-flashcard-handoff="record"]')).toBeNull();
    await f.click('[data-flashcard-handoff="find"]');
    expect(evidence(f.state)).toEqual(before); expect(f.state.selectedOrgan).toBeNull();
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['_incisionAnim', '_layerTransition', '_layerBrowseTransition'])('guards a handoff and resume during %s', async key => {
    const f = await mountLab({ [key]: { active: true } });
    const before = evidence(f.state);
    expect(f.host.querySelector('[data-flashcard-handoff="find"]').disabled).toBe(true);
    await f.click('[data-flashcard-handoff="find"]');
    expect(f.state.flashcardMode).toBe(true); expect(f.state._flashcardReturn).toBeUndefined();
    await f.patch({ [key]: null }); await f.click('[data-flashcard-handoff="find"]');
    await f.patch({ [key]: { active: true } });
    expect(f.host.querySelector('[data-flashcard-resume-action]').disabled).toBe(true);
    await f.click('[data-flashcard-resume-action]');
    expect(f.state.flashcardMode).toBe(false); expect(evidence(f.state)).toEqual(before);
  });

  it.each([{ quizMode: true }, { quizMode: true, practicalMode: true, practicalEndsAt: Date.now() + 120000 }])('hides pause controls and flashcard references throughout assessment', async patch => {
    const f = await mountLab(); await f.click('[data-flashcard-handoff="find"]');
    const retained = structuredClone(f.state._flashcardReturn);
    await f.patch(patch);
    expect(f.host.querySelector('[data-flashcard-resume]')).toBeNull();
    expect(f.host.querySelector('[data-dissection-flashcards]')).toBeNull();
    expect(f.state._flashcardReturn).toEqual(retained);
  });

  it('clears a pause on layer changes and never restores it after a layer roundtrip', async () => {
    const f = await mountLab(); await f.click('[data-flashcard-handoff="find"]');
    await f.click([...f.host.querySelectorAll('.diss-layer-button')].find(button => button.textContent.includes('Muscle')));
    expect(f.state.activeLayer).toBe('muscle'); expect(f.state._flashcardReturn).toBeNull();
    await f.click([...f.host.querySelectorAll('.diss-layer-button')].find(button => button.textContent.includes('Skin')));
    expect(f.state.activeLayer).toBe('skin'); expect(f.host.querySelector('[data-flashcard-resume]')).toBeNull();
    expect(f.state._flashcardPractice).toBeNull();
  });

  it('keeps a pause for a locked layer and canceled reset, but clears it for a confirmed reset', async () => {
    const f = await mountLab({ revealedLayers: {} }); await f.click('[data-flashcard-handoff="find"]');
    const retained = structuredClone(f.state._flashcardReturn);
    const muscle = [...f.host.querySelectorAll('.diss-layer-button')].find(button => button.textContent.includes('Muscle'));
    expect(muscle.disabled).toBe(true); await f.click(muscle);
    expect(f.state._flashcardReturn).toEqual(retained);
    await f.click('[aria-label="Lab tool options"]');
    await f.click('#diss-reset-specimen'); await f.click('#diss-reset-cancel');
    expect(f.state._flashcardReturn).toEqual(retained);
    await f.click('#diss-reset-specimen'); await f.click('#diss-reset-confirm');
    expect(f.state._flashcardReturn).toBeNull(); expect(f.host.querySelector('[data-flashcard-resume]')).toBeNull();
  });

  it('clears a pause when changing specimens, including a return to the original specimen', async () => {
    const f = await mountLab(); await f.click('[data-flashcard-handoff="find"]');
    await f.click('#diss-specimen-tab-pig');
    expect(f.state.specimen).toBe('pig'); expect(f.state._flashcardReturn).toBeNull();
    await f.click('#diss-specimen-tab-frog');
    expect(f.state.specimen).toBe('frog'); expect(f.host.querySelector('[data-flashcard-resume]')).toBeNull();
  });

  it('retains the paused round when protected storage blocks a specimen change', async () => {
    const f = await mountLab(); await f.click('[data-flashcard-handoff="find"]');
    const retained = structuredClone(f.state._flashcardReturn);
    localStorage.setItem('dissection_progress_frog', '{protected invalid record');
    await f.click('#diss-specimen-tab-pig');
    expect(f.state.specimen).toBe('frog'); expect(f.state._flashcardReturn).toEqual(retained);
    expect(f.host.querySelector('[data-flashcard-resume]')).not.toBeNull();
    expect(localStorage.getItem('dissection_progress_frog')).toBe('{protected invalid record');
  });

  it('ends explicitly without changing evidence and starts a fresh deck without the old draft', async () => {
    const f = await mountLab(), before = evidence(f.state);
    await f.click('[data-flashcard-handoff="find"]'); await f.click('[data-flashcard-end]');
    expect(f.state._flashcardPractice).toBeNull(); expect(f.state._flashcardReturn).toBeNull();
    expect(document.activeElement.id).toBe('diss-canvas'); expect(evidence(f.state)).toEqual(before);
    await f.click('#diss-route-study'); await f.click('[aria-label="Flashcard"]');
    expect(f.state._flashcardReturn).toBeNull(); expect(f.host.querySelector('#diss-flashcard-draft').value).toBe('');
    expect(f.host.querySelector('[data-flashcard-counter]').textContent).toBe('1 / 4');
  });
});
