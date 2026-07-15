import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const personaSource = fs.readFileSync('personas_source.jsx', 'utf8');

function createHarness({ personaState, resource, callGemini, callGeminiImageEdit, isPersonaFreeResponse = true }) {
  const safety = { aiCheck: vi.fn() };
  const scoreUpdates = [];
  const toasts = [];
  const historyStart = [{ ...resource }];
  let state = personaState;
  let generated = { ...resource };
  let history = historyStart;
  let isOpen = true;

  const windowObject = {
    AlloModules: {},
    callGemini,
    callGeminiImageEdit,
  };
  vm.runInNewContext(personaSource, {
    window: windowObject,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Promise,
  });

  const liveRef = { current: {} };
  const sync = () => Object.assign(liveRef.current, {
    personaState: state,
    generatedContent: generated,
    history,
  });
  const setPersonaState = (next) => {
    state = typeof next === 'function' ? next(state) : next;
    sync();
  };
  const setGeneratedContent = (next) => {
    generated = typeof next === 'function' ? next(generated) : next;
    sync();
  };
  const setHistory = (next) => {
    history = typeof next === 'function' ? next(history) : next;
    sync();
  };

  Object.assign(liveRef.current, {
    personaState: state,
    personaInput: '',
    generatedContent: generated,
    history,
    sourceTopic: 'Civil rights',
    gradeLevel: '8th Grade',
    leveledTextLanguage: 'Spanish',
    selectedLanguages: ['Spanish'],
    currentUiLanguage: 'French',
    personaTurnHintsViewed: false,
    isPersonaFreeResponse,
    apiKey: 'test-key',
    showPersonaHintsRef: { current: false },
    setPersonaState,
    setPersonaInput: vi.fn(),
    setGeneratedContent,
    setHistory,
    setIsPersonaChatOpen: (next) => { isOpen = next; },
    setIsProcessing: vi.fn(),
    setPersonaReflectionInput: vi.fn(),
    setReflectionFeedback: vi.fn(),
    setIsPersonaDefining: vi.fn(),
    setIsGradingReflection: vi.fn(),
    setIsGeneratingReflectionPrompt: vi.fn(),
    setPanelTtsPending: vi.fn(),
    setShowPersonaHints: vi.fn(),
    setPersonaTurnHintsViewed: vi.fn(),
    setIsPersonaReflectionOpen: vi.fn(),
    setPlayingContentId: vi.fn(),
    setPlaybackState: vi.fn(),
    setPersonaAutoRead: vi.fn(),
    stopPlayback: vi.fn(),
    lastReadPersonaIndexRef: { current: -1 },
    personaDefinitionCache: { current: new Map() },
    alloBotRef: { current: null },
    addToast: (...args) => toasts.push(args),
    t: (key) => key,
    handleScoreUpdate: (...args) => scoreUpdates.push(args),
    playSound: vi.fn(),
    handleAiSafetyFlag: vi.fn(),
    callImagen: vi.fn(),
    resilientJsonParse: async (text) => JSON.parse(text),
  });
  sync();

  const api = windowObject.AlloModules.createPersonas({
    liveRef,
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    cleanJson: (text) => text,
    safeJsonParse: JSON.parse,
    fisherYatesShuffle: (items) => items,
    SafetyContentChecker: safety,
  });

  return {
    api,
    safety,
    scoreUpdates,
    toasts,
    get state() { return state; },
    get generated() { return generated; },
    get history() { return history; },
    get isOpen() { return isOpen; },
  };
}

describe('Persona interview state integrity', () => {
  it('preserves the completed turn and resource metadata when a portrait edit resolves late', async () => {
    let resolveImage;
    const imagePromise = new Promise((resolve) => { resolveImage = resolve; });
    const candidate = {
      name: 'Ada',
      role: 'Mathematician',
      year: '1843',
      avatarUrl: 'data:image/png;base64,AAAA',
      rapport: 10,
      accumulatedXP: 0,
      quests: [{ id: 'q1', text: 'Ask about the engine', difficulty: 10, isCompleted: false }],
      suggestedQuestions: [],
    };
    const resource = {
      id: 'persona-resource-1',
      type: 'persona',
      title: 'Interview Mode Options',
      meta: 'Interview Candidates',
      timestamp: 'kept',
      config: { lessonId: 'lesson-7' },
      data: [{ ...candidate }],
    };
    const harness = createHarness({
      personaState: {
        mode: 'single',
        selectedCharacter: { ...candidate },
        selectedCharacters: [],
        chatHistory: [{ role: 'model', text: 'Hola' }],
        avatarUrl: candidate.avatarUrl,
        suggestions: [],
        panelSuggestions: [],
        isLoading: false,
        harmonyScore: 10,
        earnedBadges: [],
      },
      resource,
      callGemini: vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          response: 'Respuesta',
          translation: 'Answer',
          visualReaction: 'smiling',
          rapportChange: 5,
          completedQuestId: 'q1',
        }))
        .mockResolvedValueOnce('[]'),
      callGeminiImageEdit: vi.fn(() => imagePromise),
      isPersonaFreeResponse: false,
    });

    await harness.api.handlePersonaChatSubmit('Pregunta');
    expect(harness.generated.data[0].chatHistory).toHaveLength(3);
    expect(harness.generated.data[0].rapport).toBe(15);
    expect(harness.generated.data[0].quests[0].isCompleted).toBe(true);
    expect(harness.generated.data[0].accumulatedXP).toBe(60);

    resolveImage('data:image/png;base64,BBBB');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const saved = harness.generated.data[0];
    expect(saved.chatHistory).toHaveLength(3);
    expect(saved.rapport).toBe(15);
    expect(saved.quests[0].isCompleted).toBe(true);
    expect(saved.accumulatedXP).toBe(60);
    expect(saved.avatarUrl).toBe('data:image/png;base64,BBBB');
    expect(harness.generated.title).toBe(resource.title);
    expect(harness.generated.meta).toBe(resource.meta);
    expect(harness.generated.config).toEqual(resource.config);
    expect(harness.history[0].title).toBe(resource.title);
    expect(harness.safety.aiCheck).toHaveBeenCalledWith('Pregunta', 'persona', 'test-key', expect.any(Function));
  });

  it('safety-checks panel input, bounds model deltas, and persists both panelists on close', async () => {
    const charA = {
      name: 'A',
      role: 'Leader',
      greeting: 'Saludos',
      rapport: 30,
      accumulatedXP: 0,
      quests: [{ id: 'qa', difficulty: 60, isCompleted: false }],
    };
    const charB = {
      name: 'B',
      role: 'Writer',
      greeting: 'Bienvenidos',
      rapport: 30,
      accumulatedXP: 0,
      quests: [],
    };
    const resource = {
      id: 'persona-panel-1',
      type: 'persona',
      title: 'Interview Mode Options',
      meta: 'Interview Candidates',
      timestamp: 'kept',
      config: { source: 'lesson' },
      data: [{ ...charA }, { ...charB }],
    };
    const harness = createHarness({
      personaState: {
        mode: 'panel',
        selectedCharacter: { ...charA },
        selectedCharacters: [{ ...charA }, { ...charB }],
        chatHistory: [
          { role: 'model', speakerName: 'A', text: 'Saludos' },
          { role: 'model', speakerName: 'B', text: 'Bienvenidos' },
        ],
        avatarUrl: null,
        suggestions: [],
        panelSuggestions: [],
        isLoading: false,
        harmonyScore: 10,
        earnedBadges: [],
      },
      resource,
      callGemini: vi.fn().mockResolvedValue(JSON.stringify({
        dialogue: [
          { speaker: 'A', text: 'Respuesta A', translation: 'Answer A' },
          { speaker: 'B', text: 'Respuesta B', translation: 'Answer B' },
        ],
        updates: {
          charA: { rapportChange: 999, completedQuestId: 'qa' },
          charB: { rapportChange: -999, completedQuestId: null },
          harmony: { scoreChange: 999, reason: 'model drift' },
        },
      })),
      callGeminiImageEdit: vi.fn(),
      isPersonaFreeResponse: true,
    });

    await harness.api.handlePanelChatSubmit('Compare sus ideas');
    expect(harness.safety.aiCheck).toHaveBeenCalledWith('Compare sus ideas', 'persona-panel', 'test-key', expect.any(Function));
    expect(harness.state.selectedCharacters[0].rapport).toBe(50);
    expect(harness.state.selectedCharacters[1].rapport).toBe(10);
    expect(harness.state.harmonyScore).toBe(30);
    expect(harness.state.selectedCharacters[0].quests[0].isCompleted).toBe(false);
    expect(harness.state.selectedCharacters[0].accumulatedXP).toBe(90);
    expect(harness.state.selectedCharacters[1].accumulatedXP).toBe(50);
    expect(harness.state.chatHistory.at(-1).translation).toBe('Answer B');

    harness.api.handleClosePersonaChat();
    const savedA = harness.generated.data.find((item) => item.name === 'A');
    const savedB = harness.generated.data.find((item) => item.name === 'B');
    expect(savedA.rapport).toBe(50);
    expect(savedB.rapport).toBe(10);
    expect(savedA.accumulatedXP).toBe(90);
    expect(savedB.accumulatedXP).toBe(50);
    expect(savedA.panelHarmonyScore).toBe(30);
    expect(savedA.panelPartner).toBe('B');
    expect(savedB.panelPartner).toBe('A');
    expect(savedA.chatHistory).toHaveLength(5);
    expect(harness.generated.title).toBe(resource.title);
    expect(harness.isOpen).toBe(false);
  });
});

describe('Persona persistence contracts', () => {
  it('uses project-safe resource types and scoped, size-capped resume snapshots', () => {
    const viewSource = fs.readFileSync('view_persona_chat_source.jsx', 'utf8');
    const reflectionSource = fs.readFileSync('phase_k_helpers_source.jsx', 'utf8');
    expect(personaSource).toContain("type: 'persona-transcript'");
    expect(reflectionSource).toContain("type: 'persona-reflection'");
    expect(viewSource).toContain("resourceId: _personaSnapshotResourceId");
    expect(viewSource).toContain('var _personaSnapshotEnabled = Boolean(_personaSnapshotResourceId && _personaSnapshotStudentId)');
    expect(viewSource).not.toContain("studentNickname || 'anonymous'");
    expect(viewSource).toContain("copy.avatarUrl.length >= 300000");
    expect(viewSource).toContain("delete copy.chatHistory");
    expect(viewSource).toContain("_handleCloseAndClearSnapshot");
    expect(viewSource).not.toContain("ds.remove('persona_sessions', 'active')");
  });
});