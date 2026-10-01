import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('adventure_session_handlers_source.jsx', 'utf8');

function harness(overrides = {}) {
  const window = { AlloModules: {} };
  new Function('window', source)(window);
  let state = { turnCount: 1, currentScene: { text: 'The forest path.', options: ['Explore'] },
    characters: [], characterAppearance: 'A student in a blue jacket', imageCache: [], ...overrides };
  const deps = { adventureState: state, adventureConsistentCharacters: false, adventureArtStyle: 'storybook',
    setAdventureState: update => { state = typeof update === 'function' ? update(state) : update; },
    getAdventureState: () => state,
    callImagen: vi.fn().mockResolvedValue('data:image/png;base64,BASE'),
    callGeminiImageEdit: vi.fn().mockResolvedValue('data:image/png;base64,FINAL'),
    adventureImageDB: { storeImage: vi.fn().mockResolvedValue() }, warnLog: vi.fn(), debugLog: vi.fn() };
  const api = window.AlloModules.AdventureSessionHandlers;
  return { api, deps, get state() { return state; }, generate: (text = 'The forest path.', turn = 1) => api.generateAdventureImage(text, turn, deps) };
}

afterEach(() => vi.useRealTimers());

describe('Adventure scene image lifecycle', () => {
  it('shares one pipeline for repeated requests and reuses the completed result', async () => {
    const h = harness();
    await Promise.all([h.generate(), h.generate()]);
    await h.generate();
    expect(h.deps.callImagen).toHaveBeenCalledOnce();
    expect(h.deps.callGeminiImageEdit).toHaveBeenCalledOnce();
    expect(h.deps.adventureImageDB.storeImage).toHaveBeenCalledOnce();
    expect(h.state.imageCache).toHaveLength(1);
  });

  it('stops a canceled request before polishing and cannot overwrite a new episode at the same turn', async () => {
    const h = harness();
    let finishOld;
    h.deps.callImagen.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const old = h.generate();
    await vi.waitFor(() => expect(finishOld).toBeTypeOf('function'));
    h.api.cancelAdventureSceneImage(h.deps.setAdventureState);
    h.deps.setAdventureState(prev => ({ ...prev, currentScene: { text: 'The mountain path.' }, sceneImage: null }));
    await h.generate('The mountain path.');
    finishOld('data:image/png;base64,STALE');
    await old;
    expect(h.deps.callImagen).toHaveBeenCalledTimes(2);
    expect(h.deps.callGeminiImageEdit).toHaveBeenCalledOnce();
    expect(h.state.sceneImage).toBe('data:image/png;base64,FINAL');
    expect(h.deps.adventureImageDB.storeImage).toHaveBeenCalledOnce();
  });

  it('ignores an obsolete scene even when its turn number matches', async () => {
    const h = harness();
    let finish;
    h.deps.callImagen.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.generate();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    h.deps.setAdventureState(prev => ({ ...prev, currentScene: { text: 'A different scene.' }, sceneImage: 'new.png' }));
    finish('data:image/png;base64,STALE');
    await pending;
    expect(h.state.sceneImage).toBe('new.png');
    expect(h.deps.callGeminiImageEdit).not.toHaveBeenCalled();
    expect(h.deps.adventureImageDB.storeImage).not.toHaveBeenCalled();
  });

  it('allows a fresh attempt after the provider returns no image or throws', async () => {
    const h = harness();
    h.deps.callImagen.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    await h.generate();
    await h.generate();
    await h.generate();
    expect(h.deps.callImagen).toHaveBeenCalledTimes(3);
    expect(h.state.sceneImage).toBe('data:image/png;base64,FINAL');
    expect(h.state.isImageLoading).toBe(false);
  });

  it('stores the final image only once when React replays state updaters', async () => {
    const h = harness();
    const setState = h.deps.setAdventureState;
    h.deps.setAdventureState = update => {
      if (typeof update === 'function') update(h.state);
      setState(update);
    };
    await h.generate();
    expect(h.deps.adventureImageDB.storeImage).toHaveBeenCalledOnce();
    expect(h.state.imageCache).toHaveLength(1);
  });

  it('keeps a successfully generated image when saving it fails', async () => {
    const h = harness();
    h.deps.adventureImageDB.storeImage.mockRejectedValueOnce(new Error('storage full'));
    await h.generate();
    expect(h.state.sceneImage).toBe('data:image/png;base64,FINAL');
    expect(h.state.isImageLoading).toBe(false);
    expect(h.deps.warnLog).toHaveBeenCalled();
  });

  it('skips the automatic cleanup edit when faster visuals are selected', async () => {
    const h = harness();
    h.deps.useLowQualityVisuals = true;
    await h.generate();
    expect(h.deps.callImagen).toHaveBeenCalledOnce();
    expect(h.deps.callGeminiImageEdit).not.toHaveBeenCalled();
    expect(h.state.sceneImage).toBe('data:image/png;base64,BASE');
  });
});
