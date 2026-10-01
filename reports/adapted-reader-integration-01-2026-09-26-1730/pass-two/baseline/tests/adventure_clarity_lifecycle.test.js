import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';

function harness(confirm = vi.fn().mockResolvedValue(true), stateOverrides = {}) {
  const fakeWindow = { AlloModules: {}, AlloFlowUX: { confirm } };
  new Function('window', fs.readFileSync('adventure_handlers_source.jsx', 'utf8'))(fakeWindow);
  let state = { currentScene: { text: 'A completed chapter.', options: [] }, history: [{ type: 'choice', text: 'Protect the wetland.' }], isLoading: false,
    isGameOver: true, canStartSequel: true, isImmersiveMode: true, isShopOpen: true, isReviewingCharacters: true,
    sceneImage: 'old.png', sceneImagePreview: 'preview.png', isImageLoading: true, pendingChoice: 'Old choice',
    level: 3, xp: 45, xpToNextLevel: 200, energy: 75, inventory: [], climax: { isActive: true }, ...stateOverrides };
  const initial = structuredClone(state);
  const settings = { history: [], inputText: 'Water evaporates and condenses.', sourceTopic: 'Water cycle', gradeLevel: '6th Grade', selectedLanguages: [], studentInterests: [],
    adventureInputMode: 'choice', adventureLanguageMode: 'English', adventureCustomInstructions: '', adventureTextInput: '',
    adventureDifficulty: 'Normal', adventureArtStyle: 'auto', globalPoints: 10, isTeacherMode: true, isProcessing: false,
    alloBotRef: { current: null }, lastReadTurnRef: { current: 5 },
    t: key => key, setAdventureState: update => { state = typeof update === 'function' ? update(state) : update; },
    setFailedAdventureAction: vi.fn(), setPendingAdventureUpdate: vi.fn(), setShowDice: vi.fn(), setDiceResult: vi.fn(), setAdventureTextInput: vi.fn(),
    setShowNewGameSetup: vi.fn(), setHasSavedAdventure: vi.fn(), stopPlayback: vi.fn(),
    callGemini: vi.fn().mockRejectedValue(new Error('offline')), detectClimaxArchetype: vi.fn().mockResolvedValue('Auto'), getAdventureGlossaryTerms: () => '' };
  const deps = new Proxy(settings, { get(target, key) { if (key === 'adventureState') return state; return key in target ? target[key] : vi.fn(); } });
  return { handlers: fakeWindow.AlloModules.AdventureHandlers, settings, deps, confirm, initial, get state() { return state; } };
}

describe('Adventure clarity lifecycle', () => {
  it('keeps the entire current story when Start over is cancelled', async () => {
    const h = harness(vi.fn().mockResolvedValue(false));
    await h.handlers.handleStartAdventure(h.deps);
    expect(h.state).toEqual(h.initial);
    expect(h.settings.setShowNewGameSetup).not.toHaveBeenCalled();
    expect(h.settings.stopPlayback).not.toHaveBeenCalled();
  });
  it('resets stale completion, media, overlays and pending actions before showing fresh setup', async () => {
    const h = harness();
    await h.handlers.handleStartAdventure(h.deps);
    expect(h.confirm).toHaveBeenCalledOnce();
    expect(h.state).toMatchObject({ currentScene: null, history: [], isGameOver: false, isImmersiveMode: false, canStartSequel: false,
      isShopOpen: false, isReviewingCharacters: false, sceneImage: null, sceneImagePreview: null, pendingChoice: null, climax: { isActive: false } });
    expect(h.settings.setFailedAdventureAction).toHaveBeenCalledWith(null);
    expect(h.settings.setPendingAdventureUpdate).toHaveBeenCalledWith(null);
    expect(h.settings.setShowDice).toHaveBeenCalledWith(false);
    expect(h.settings.setShowNewGameSetup).toHaveBeenCalledWith(true);
  });
  it('does not restart a turn in flight or open duplicate confirmation dialogs', async () => {
    const busy = harness(undefined, { isLoading: true });
    await busy.handlers.handleStartAdventure(busy.deps);
    expect(busy.confirm).not.toHaveBeenCalled();
    expect(busy.state).toEqual(busy.initial);
    let finish;
    const h = harness(vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })));
    const first = h.handlers.handleStartAdventure(h.deps);
    await h.handlers.handleStartAdventure(h.deps);
    expect(h.confirm).toHaveBeenCalledOnce();
    finish(false); await first;
    expect(h.state).toEqual(h.initial);
  });
  it('restores the completed chapter when generating its sequel fails', async () => {
    const h = harness();
    await h.handlers.executeStartAdventure('Continue this chapter.', h.deps);
    expect(h.settings.callGemini).toHaveBeenCalled();
    expect(h.state).toMatchObject({ currentScene: h.initial.currentScene, history: h.initial.history, level: 3, xp: 45,
      isGameOver: true, canStartSequel: true, isLoading: false });
  });
  it('does not begin another opening scene while a launch is in progress', async () => {
    const h = harness(undefined, { isLoading: true });
    await h.handlers.executeStartAdventure(null, h.deps);
    expect(h.settings.callGemini).not.toHaveBeenCalled();
    expect(h.state).toEqual(h.initial);
  });
});

it('serializes rapid launches even when React callers still hold the previous render state', async () => {
  const h = harness();
  let fail;
  h.settings.callGemini = vi.fn().mockImplementation(() => new Promise((resolve, reject) => { fail = reject; }));
  const stale = new Proxy(h.deps, { get(target, key) { return key === 'adventureState' ? h.initial : target[key]; } });
  const first = h.handlers.executeStartAdventure('Continue the chapter.', stale);
  await h.handlers.executeStartAdventure('Continue the chapter.', stale);
  expect(h.settings.callGemini).toHaveBeenCalledOnce();
  fail(new Error('offline')); await first;
  expect(h.state.currentScene).toEqual(h.initial.currentScene);
});

it('does not overwrite a restored chapter with late finale detection', async () => {
  const h = harness();
  let detect;
  h.settings.detectClimaxArchetype = vi.fn().mockImplementation(() => new Promise(resolve => { detect = resolve; }));
  await h.handlers.executeStartAdventure('Continue the chapter.', h.deps);
  detect('Late archetype');
  await Promise.resolve();
  expect(h.state.climax).toEqual(h.initial.climax);
});

it('waits for cast confirmation before requesting any opening scene image', async () => {
  vi.useFakeTimers();
  try {
    const h = harness(undefined, { currentScene: null, history: [], isReviewingCharacters: false });
    h.settings.adventureConsistentCharacters = true;
    h.settings.cleanJson = text => text;
    h.settings.callImagen = vi.fn().mockResolvedValue('setting.png');
    h.settings.generateAdventureImage = vi.fn();
    h.settings.callGemini = vi.fn().mockResolvedValue(JSON.stringify({
      text: 'Ari arrives beside the wetland.', options: ['Explore'],
      characters: [{ name: 'Ari', role: 'Protagonist', appearance: 'Blue jacket' }]
    }));
    await h.handlers.executeStartAdventure(null, h.deps);
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.state.isReviewingCharacters).toBe(true);
    expect(h.state.isImageLoading).toBe(false);
    expect(h.settings.callImagen).not.toHaveBeenCalled();
    expect(h.settings.generateAdventureImage).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});
