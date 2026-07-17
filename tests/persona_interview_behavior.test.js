import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const personaSource = fs.readFileSync('personas_source.jsx', 'utf8');

function createHarness({ personaState, resource, callGemini, callGeminiImageEdit, isPersonaFreeResponse = true }) {
  const safety = { aiCheck: vi.fn(), check: vi.fn(() => []) };
  const safetyFlagHandler = vi.fn();
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
    handleAiSafetyFlag: safetyFlagHandler,
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
    safetyFlagHandler,
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
        suggestions: ['Pregunta'],
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

    await harness.api.handlePersonaChatSubmit('Pregunta', true);
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

  it('invalidates a late reply when a different interview opens', async () => {
    let resolveReply;
    const pendingReply = new Promise((resolve) => { resolveReply = resolve; });
    const ada = { name: 'Ada', role: 'Mathematician', greeting: 'Hello', avatarUrl: 'data:image/png;base64,AAAA', rapport: 10, quests: [] };
    const grace = { name: 'Grace', role: 'Computer scientist', greeting: 'Welcome', avatarUrl: 'data:image/png;base64,BBBB', rapport: 20, quests: [] };
    const resource = { id: 'persona-race', type: 'persona', data: [ada, grace] };
    const harness = createHarness({
      personaState: { mode: 'single', options: [ada, grace], selectedCharacter: ada, selectedCharacters: [], chatHistory: [{ role: 'model', text: 'Hello' }], avatarUrl: ada.avatarUrl, suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] },
      resource,
      callGemini: vi.fn(() => pendingReply),
      callGeminiImageEdit: vi.fn(),
    });

    const oldRequest = harness.api.handlePersonaChatSubmit('Old question');
    harness.api.handleClosePersonaChat();
    await harness.api.handleSelectPersona(grace);
    resolveReply(JSON.stringify({ response: 'Late Ada answer', rapportChange: 20 }));
    await oldRequest;

    expect(harness.state.selectedCharacter.name).toBe('Grace');
    expect(harness.state.chatHistory).toEqual([{ role: 'model', text: 'Welcome' }]);
    expect(harness.state.selectedCharacter.rapport).toBe(20);
    expect(harness.scoreUpdates).toHaveLength(0);
  });

  it('enforces multiple-choice mode inside the submit handler', async () => {
    const character = { name: 'Ada', role: 'Mathematician', greeting: 'Hello', avatarUrl: 'data:image/png;base64,AAAA', rapport: 10, quests: [] };
    const gemini = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({ response: 'Answer', rapportChange: 0 }))
      .mockResolvedValueOnce('[]');
    const harness = createHarness({
      personaState: { mode: 'single', selectedCharacter: character, selectedCharacters: [], chatHistory: [{ role: 'model', text: 'Hello' }], avatarUrl: character.avatarUrl, suggestions: ['Allowed question'], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] },
      resource: { id: 'persona-mc', type: 'persona', data: [character] },
      callGemini: gemini,
      callGeminiImageEdit: vi.fn(),
      isPersonaFreeResponse: false,
    });

    await harness.api.handlePersonaChatSubmit('Injected arbitrary text');
    expect(gemini).not.toHaveBeenCalled();
    expect(harness.safety.aiCheck).not.toHaveBeenCalled();
    expect(harness.toasts.at(-1)).toEqual(['persona.panel_choose_response', 'warning']);

    await harness.api.handlePersonaChatSubmit('Allowed question', true);
    expect(gemini).toHaveBeenCalled();
    expect(harness.safety.aiCheck).toHaveBeenCalledWith('Allowed question', 'persona', 'test-key', expect.any(Function));
  });

  it('preserves panel choices until core accepts one, then clears them with the claimed turn', async () => {
    let resolveReply;
    const pendingReply = new Promise((resolve) => { resolveReply = resolve; });
    const charA = { name: 'A', role: 'Leader', greeting: 'Hello', rapport: 20, quests: [] };
    const charB = { name: 'B', role: 'Writer', greeting: 'Welcome', rapport: 20, quests: [] };
    const panelSuggestions = [
      { text: 'Support A', tier: 'supportive' },
      { text: 'Support B', tier: 'supportive' },
      { text: 'Challenge A', tier: 'challenging' },
      { text: 'Challenge B', tier: 'challenging' },
      { text: 'Compare both', tier: 'neutral' },
      { text: 'Find evidence', tier: 'neutral' },
    ];
    const gemini = vi.fn().mockImplementationOnce(() => pendingReply).mockResolvedValueOnce('[]');
    const harness = createHarness({
      personaState: {
        mode: 'panel', selectedCharacter: charA, selectedCharacters: [charA, charB],
        chatHistory: [{ role: 'model', speakerName: 'A', text: 'Hello' }],
        avatarUrl: null, suggestions: [], panelSuggestions, isLoading: false,
        harmonyScore: 10, earnedBadges: [],
      },
      resource: { id: 'persona-panel-mc', type: 'persona', data: [charA, charB] },
      callGemini: gemini,
      callGeminiImageEdit: vi.fn(),
      isPersonaFreeResponse: false,
    });

    await harness.api.handlePanelChatSubmit('Injected arbitrary text');
    expect(gemini).not.toHaveBeenCalled();
    expect(harness.state.panelSuggestions).toEqual(panelSuggestions);
    expect(harness.state.isLoading).toBe(false);

    const acceptedTurn = harness.api.handlePanelChatSubmit('Compare both', true);
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(harness.state.panelSuggestions).toEqual([]);
    expect(harness.state.isLoading).toBe(true);
    expect(harness.state.chatHistory.at(-1)).toEqual({ role: 'user', text: 'Compare both' });

    resolveReply(JSON.stringify({
      dialogue: [
        { speaker: 'A', text: 'A response' },
        { speaker: 'B', text: 'B response' },
      ],
      updates: {
        charA: { rapportChange: 0 },
        charB: { rapportChange: 0 },
        harmony: { scoreChange: 0 },
      },
    }));
    await acceptedTurn;
    expect(harness.state.isLoading).toBe(false);
  });

  it('safety-checks panel input, bounds model deltas, sanitizes dialogue, and persists both panelists on close', async () => {
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
          { speaker: 'Unknown', text: 'Injected speaker' },
          { speaker: 'B', text: '   ' },
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
    expect(harness.state.chatHistory.some((message) => message.speakerName === 'Unknown')).toBe(false);

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

  it('deduplicates rapid duplicate submissions before React state catches up', async () => {
    let resolveReply;
    const pendingReply = new Promise((resolve) => { resolveReply = resolve; });
    const character = { name: 'Ada', role: 'Mathematician', avatarUrl: null, rapport: 10, quests: [] };
    const gemini = vi.fn().mockImplementationOnce(() => pendingReply).mockResolvedValueOnce('[]');
    const harness = createHarness({
      personaState: { mode: 'single', selectedCharacter: character, selectedCharacters: [], chatHistory: [], avatarUrl: null, suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] },
      resource: { id: 'persona-dedupe', type: 'persona', data: [character] },
      callGemini: gemini,
      callGeminiImageEdit: vi.fn(),
    });

    const first = harness.api.handlePersonaChatSubmit('One question');
    const duplicate = harness.api.handlePersonaChatSubmit('One question');
    expect(gemini).toHaveBeenCalledTimes(1);
    resolveReply(JSON.stringify({ response: 'One answer', rapportChange: 0 }));
    await Promise.all([first, duplicate]);
    expect(harness.state.chatHistory.filter(message => message.role === 'user')).toHaveLength(1);
  });

  it('keeps only the newest portrait reaction when image edits resolve out of order', async () => {
    let resolveFirst;
    let resolveSecond;
    const character = { name: 'Ada', role: 'Mathematician', avatarUrl: 'data:image/png;base64,AAAA', rapport: 10, quests: [] };
    const imageEdit = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));
    const harness = createHarness({
      personaState: { mode: 'single', selectedCharacter: character, selectedCharacters: [], chatHistory: [], avatarUrl: character.avatarUrl, suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] },
      resource: { id: 'persona-reactions', type: 'persona', data: [character] },
      callGemini: vi.fn(),
      callGeminiImageEdit: imageEdit,
    });

    const first = harness.api.updatePersonaReaction('first expression');
    const second = harness.api.updatePersonaReaction('newest expression');
    resolveSecond('data:image/png;base64,SECOND');
    await second;
    resolveFirst('data:image/png;base64,FIRST');
    await first;
    expect(harness.state.avatarUrl).toBe('data:image/png;base64,SECOND');
    expect(harness.generated.data[0].avatarUrl).toBe('data:image/png;base64,SECOND');
  });

  it('records synchronous local safety flags before the async safety check', async () => {
    const character = { name: 'Ada', role: 'Mathematician', avatarUrl: null, rapport: 10, quests: [] };
    const harness = createHarness({
      personaState: { mode: 'single', selectedCharacter: character, selectedCharacters: [], chatHistory: [], avatarUrl: null, suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 10, earnedBadges: [] },
      resource: { id: 'persona-safety', type: 'persona', data: [character] },
      callGemini: vi.fn().mockResolvedValueOnce(JSON.stringify({ response: 'Safe reply', rapportChange: 0 })).mockResolvedValueOnce('[]'),
      callGeminiImageEdit: vi.fn(),
    });
    harness.safety.check.mockReturnValue([{ type: 'critical', reason: 'local match' }]);
    await harness.api.handlePersonaChatSubmit('critical phrase');
    expect(harness.safetyFlagHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'critical', source: 'persona' }));
    expect(harness.safety.aiCheck).toHaveBeenCalled();
  });
});

describe('Persona persistence contracts', () => {
  it('uses project-safe resource types and scoped, size-capped resume snapshots', () => {
    const viewSource = fs.readFileSync('view_persona_chat_source.jsx', 'utf8');
    const reflectionSource = fs.readFileSync('phase_k_helpers_source.jsx', 'utf8');
    const appSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    const uiStrings = fs.readFileSync('ui_strings.js', 'utf8');
    expect(personaSource).toContain("type: 'persona-transcript'");
    expect(reflectionSource).toContain("type: 'persona-reflection'");
    expect(viewSource).toContain("resourceId: _personaSnapshotResourceId");
    expect(viewSource).toContain('var _personaSnapshotEnabled = Boolean(_personaSnapshotResourceId && _personaSnapshotStudentId && _personaRetentionDays > 0)');
    expect(viewSource).toContain('_hashPersonaScope');
    expect(viewSource).toContain("localStorage.getItem('allo_persona_resume_days')");
    expect(viewSource).toContain("chatHistory: (st.chatHistory || []).slice(-80)");
    expect(viewSource).not.toContain("studentNickname || 'anonymous'");
    expect(viewSource).toContain("typeof authoritativeCharacter.avatarUrl === 'string' && authoritativeCharacter.avatarUrl.length < 300000");
    expect(viewSource).toContain("serializedSnapshot.length > 750000");
    expect(viewSource).toContain("_handleCloseAndClearSnapshot");
    expect(viewSource).toContain("ds.remove('persona_sessions', 'active')");
    const editorStart = appSource.indexOf('const [personaTeacherEditor, setPersonaTeacherEditor] = useState(null)');
    const editorEnd = appSource.indexOf('const [showLedger, setShowLedger]', editorStart);
    const editorContract = appSource.slice(editorStart, editorEnd);
    expect(editorStart).toBeGreaterThanOrEqual(0);
    expect(editorContract).toContain('useFocusTrap(personaTeacherEditorRef, Boolean(personaTeacherEditor)');
    expect(editorContract).toContain('const openPersonaTeacherEditor =');
    expect(editorContract).toContain('const savePersonaTeacherEditor =');
    expect(editorContract).toContain("guardrailsSource: 'teacher'");
    expect(editorContract).toContain('Math.max(0, Math.min(100, Math.round(parsedDifficulty)))');
    expect(editorContract).toContain('isCompleted: existing.isCompleted === true');
    expect(editorContract).toContain('setGeneratedContent(nextResource)');
    expect(editorContract).toContain('setHistory(prev => prev.map(item => item.id === generatedContent.id ? nextResource : item))');
    expect(appSource).toContain('isTeacherMode && personaTeacherEditor && (');
    expect(appSource).toContain('onClick={savePersonaTeacherEditor}');
    expect(appSource).toContain("clearNamespace('persona_sessions')");
    expect(appSource).toContain("t('persona.resume_retention')");
    expect(uiStrings).toContain('\"simulation_disclaimer\"');
    expect(uiStrings).toContain('\"ai_feedback\"');
  });
});
