import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const moonText = 'The Moon orbits Earth and causes ocean tides.';
const plantText = 'Plant chloroplasts use sunlight to make sugars.';
const source = name => ({ id: name, type: 'analysis', unitId: 'lesson', title: `${name} reading`,
  data: { originalText: name === 'moon' ? moonText : plantText, concepts: [name === 'moon' ? 'Tidal force' : 'Photosynthesis'] },
  instructionalText: { role: 'unspecified', form: 'original', designationSource: 'educator' } });

function harness(overrides = {}) {
  const fakeWindow = { AlloModules: {} };
  new Function('window', fs.readFileSync('instructional_context_module.js', 'utf8'))(fakeWindow);
  new Function('window', fs.readFileSync('generate_dispatcher_source.jsx', 'utf8'))(fakeWindow);
  new Function('window', fs.readFileSync('adventure_handlers_source.jsx', 'utf8'))(fakeWindow);
  let state = { currentScene: null, history: [], isLoading: false, inventory: [], climax: {}, turnCount: 0 };
  const settings = { history: [source('moon'), source('plants')], inputText: 'Unrelated input', activeUnitId: 'lesson',
    selectedReadingSourceId: '', sourceTopic: '', gradeLevel: '6th Grade', studentInterests: [], selectedLanguages: [],
    adventureInputMode: 'choice', adventureLanguageMode: 'English', adventureCustomInstructions: '',
    adventureTextInput: 'Explain the evidence.', adventureArtStyle: 'auto', adventureDifficulty: 'Normal',
    adventureChanceMode: false, adventureConsistentCharacters: false, adventureFreeResponseEnabled: true,
    isTeacherMode: true, activeSessionCode: '', isProcessing: false, globalPoints: 10,
    alloBotRef: { current: null }, lastReadTurnRef: { current: 0 }, lastTurnSnapshot: { current: null },
    cleanJson: text => text, resilientJsonParse: JSON.parse, t: key => key,
    setActiveView: vi.fn(), setGenerationStep: vi.fn(), setAdventureTextInput: vi.fn(),
    flyToElement: vi.fn(), warnLog: vi.fn(), debugLog: vi.fn(), SafetyContentChecker: { aiCheck: vi.fn() },
    setAdventureState: update => { state = typeof update === 'function' ? update(state) : update; },
    callGemini: vi.fn().mockResolvedValue(JSON.stringify({ text: 'A scene.', options: ['Explore'] })),
    detectClimaxArchetype: vi.fn().mockResolvedValue('Auto'), getAdventureGlossaryTerms: vi.fn(() => ''),
    addToast: vi.fn(), setHistory: vi.fn(), setGeneratedContent: vi.fn(), setShowNewGameSetup: vi.fn(),
    stopPlayback: vi.fn(), generateAdventureImage: vi.fn(), archiveAdventureImage: vi.fn(),
    requestGenerationSourceChoice: vi.fn(request => { request.onComplete(undefined); return true; }),
    ...overrides,
  };
  const deps = new Proxy(settings, { get(target, key) { if (key === 'adventureState') return state;
    return key in target ? target[key] : vi.fn(); } });
  settings.getAdventureGenerationDeps = () => ({ ...settings, adventureState: state });
  return { handlers: fakeWindow.AlloModules.AdventureHandlers, settings, deps, get state() { return state; } };
}

describe('Adventure source selection', () => {
  it('opens setup without prompting, then asks for a source at actual generation', async () => {
    const h = harness({ isAdventureStartCurrent: () => true });
    await h.handlers.handleStartAdventure(h.deps);
    expect(h.settings.setShowNewGameSetup).toHaveBeenCalledWith(true);
    expect(h.settings.requestGenerationSourceChoice).not.toHaveBeenCalled();
    await h.handlers.executeStartAdventure(null, h.deps);
    expect(h.settings.requestGenerationSourceChoice).toHaveBeenCalledWith(expect.objectContaining({
      type: 'adventure', choices: [
        expect.objectContaining({ value: 'moon', sourceText: moonText }),
        expect.objectContaining({ value: 'plants', sourceText: plantText }),
      ], onGenerate: expect.any(Function),
    }));
    expect(h.settings.callGemini).not.toHaveBeenCalled();
    expect(h.state.currentScene).toBeNull();
    expect(h.state.isLoading).toBe(false);
  });

  it('uses the confirmed source immediately and saves it for future turns', async () => {
    let request;
    const h = harness({ requestGenerationSourceChoice: vi.fn(value => { request = value; return true; }) });
    const pending = h.handlers.executeStartAdventure(null, h.deps);
    expect(h.settings.callGemini).not.toHaveBeenCalled();
    h.settings.adventureCustomInstructions = 'Explore gently.';
    const result = await request.onGenerate('moon');
    request.onComplete(result);
    await pending;

    expect(h.settings.callGemini).toHaveBeenCalledOnce();
    const prompt = h.settings.callGemini.mock.calls[0][0];
    expect(prompt).toContain(moonText);
    expect(prompt).toContain('Tidal force');
    expect(prompt).toContain('Explore gently.');
    expect(prompt).not.toContain(plantText);
    expect(prompt).not.toContain('Photosynthesis');
    expect(h.state.readingSource).toMatchObject({ inputArtifactId: 'moon', text: moonText, unitId: 'lesson' });
    expect(h.settings.setGeneratedContent).toHaveBeenCalledWith(expect.objectContaining({
      inputArtifactId: 'moon', data: expect.objectContaining({ snapshot: expect.objectContaining({
        readingSource: expect.objectContaining({ inputArtifactId: 'moon', text: moonText }),
      }) }),
    }));
    expect(h.settings.history.every(item => item.instructionalText.role === 'unspecified')).toBe(true);
  });

  it.each(['single', 'selected', 'main', 'input'])('skips the picker for a resolved %s source', async mode => {
    const h = harness();
    if (mode === 'single') h.settings.history.pop();
    if (mode === 'selected') h.settings.selectedReadingSourceId = 'moon';
    if (mode === 'main') h.settings.history[0].instructionalText.role = 'primary';
    if (mode === 'input') { h.settings.history = []; h.settings.inputText = moonText; }
    await h.handlers.executeStartAdventure(null, h.deps);
    expect(h.settings.requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(h.settings.callGemini.mock.calls[0][0]).toContain(moonText);
    expect(h.settings.callGemini.mock.calls[0][0]).not.toContain(plantText);
  });

  it('keeps the chosen source for turns, hints, and sequels after the selection changes', async () => {
    const h = harness({ selectedReadingSourceId: 'moon' });
    await h.handlers.executeStartAdventure(null, h.deps);
    h.settings.selectedReadingSourceId = 'plants';
    h.settings.history.push({ ...source('plants'), id: 'newer-plants' });
    h.settings.callGemini.mockClear();
    h.settings.callGemini.mockRejectedValue(new Error('Stop after inspecting the request'));
    await h.handlers.handleAdventureTextSubmit(null, h.deps);
    expect(h.settings.callGemini.mock.calls[0][0]).toContain(moonText);
    expect(h.settings.callGemini.mock.calls[0][0]).not.toContain(plantText);
    h.settings.callGemini.mockClear();
    await h.handlers.handleAdventureHint(h.deps);
    expect(h.settings.callGemini.mock.calls[0][0]).toContain(moonText);
    expect(h.settings.callGemini.mock.calls[0][0]).not.toContain(plantText);
    h.settings.callGemini.mockClear();
    await h.handlers.executeStartAdventure('Continue this story.', h.deps);
    expect(h.settings.callGemini.mock.calls[0][0]).toContain(moonText);
    expect(h.settings.callGemini.mock.calls[0][0]).not.toContain(plantText);
    expect(h.settings.requestGenerationSourceChoice).not.toHaveBeenCalled();
  });

  it('stops safely if the picker is unavailable or the selected source disappears', async () => {
    const h = harness({ requestGenerationSourceChoice: vi.fn(() => false) });
    await h.handlers.executeStartAdventure(null, h.deps);
    expect(h.settings.callGemini).not.toHaveBeenCalled();
    expect(h.settings.addToast).toHaveBeenCalledWith(expect.stringContaining('Choose a reading'), 'info');
    h.settings.selectedReadingSourceId = 'deleted';
    await h.handlers.executeStartAdventure(null, h.deps);
    expect(h.settings.callGemini).not.toHaveBeenCalled();
  });
});
