import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const sessionSource = fs.readFileSync('adventure_session_handlers_source.jsx', 'utf8');
const handlerSource = fs.readFileSync('adventure_handlers_source.jsx', 'utf8');
const miscSource = fs.readFileSync('misc_handlers_source.jsx', 'utf8');
const uiSource = fs.readFileSync('adventure_source.jsx', 'utf8');

function loadSessionHandlers() {
  const window = { AlloModules: {} };
  return new Function('window', sessionSource + '\nreturn window.AlloModules.AdventureSessionHandlers;')(window);
}

function loadAdventureHandlers() {
  const window = { AlloModules: {} };
  return new Function('window', handlerSource + '\nreturn window.AlloModules.AdventureHandlers;')(window);
}

function loadMiscHandlers() {
  const window = { AlloModules: {} };
  return new Function('window', miscSource + '\nreturn window.AlloModules.MiscHandlers;')(window);
}

function resolveTurn({ freeResponse = false, inputMode = 'choice', sceneOptions = [], terminal = false } = {}) {
  const { handleDiceRollComplete } = loadSessionHandlers();
  let state = {
    currentScene: { text: 'Previous scene', options: ['Continue'] },
    pendingChoice: 'My answer',
    history: [],
    stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
    energy: 100,
    xp: 0,
    xpToNextLevel: 100,
    level: 1,
    gold: 0,
    inventory: [],
    systemResources: [],
    imageCache: [],
    climax: { isActive: false, masteryScore: 0, attempts: 0 },
    debatePhase: 'setup',
    debateMomentum: 50,
    turnCount: 1,
    activeXpMultiplier: 1,
    activeRollModifier: 0,
    activeGoldBuffTurns: 0,
    lastKeyItemTurn: 0,
  };
  const generateAdventureImage = vi.fn();
  const baseDeps = {
    adventureState: state,
    pendingAdventureUpdate: {
      scene: { text: 'Next scene', options: sceneOptions },
      evaluation: 'Good thinking.',
      feedback: 'Good thinking.',
      xpAwarded: 0,
      xpChange: 0,
      energyChange: 0,
      goldAwarded: 0,
      inventoryUpdate: null,
      isTerminalTurn: terminal,
    },
    adventureChanceMode: false,
    adventureDifficulty: 'Normal',
    adventureInputMode: inputMode,
    adventureFreeResponseEnabled: freeResponse,
    adventureConsistentCharacters: false,
    isAdventureStoryMode: false,
    isSocialStoryMode: false,
    generateAdventureImage,
    generateNarrativeLedger: vi.fn(),
    setAdventureState: (update) => {
      state = typeof update === 'function' ? update(state) : update;
    },
    setPendingAdventureUpdate: vi.fn(),
    setShowDice: vi.fn(),
    setAdventureEffects: vi.fn(),
    playAdventureEventSound: vi.fn(),
    playSound: vi.fn(),
    handleScoreUpdate: vi.fn(),
    addToast: vi.fn(),
    t: (key) => key,
    warnLog: vi.fn(),
    alloBotRef: { current: null },
  };
  const deps = new Proxy(baseDeps, {
    get(target, property) {
      return property in target ? target[property] : vi.fn();
    },
  });

  handleDiceRollComplete(deps);
  return { state, generateAdventureImage };
}

describe('Adventure Mode runtime regressions', () => {
  it('keeps free-response adventures active when the AI correctly returns no options', () => {
    vi.useFakeTimers();
    const { state, generateAdventureImage } = resolveTurn({ freeResponse: true, sceneOptions: [] });
    vi.runAllTimers();
    expect(state.isGameOver).toBe(false);
    expect(state.currentScene.text).toBe('Next scene');
    expect(generateAdventureImage).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('still treats an empty option list as game over in choice mode', () => {
    const { state } = resolveTurn({ freeResponse: false, sceneOptions: [] });
    expect(state.isGameOver).toBe(true);
  });

  it('moves debate mode out of setup after the first resolved turn', () => {
    const { state } = resolveTurn({ inputMode: 'debate', sceneOptions: ['Respond'] });
    expect(state.debatePhase).toBe('active');
  });

  it('marks explicitly terminal free-response turns as complete', () => {
    const { state } = resolveTurn({ freeResponse: true, sceneOptions: [], terminal: true });
    expect(state.isGameOver).toBe(true);
  });

  it('uses the stored pending choice in climax history and never references an undefined choice', () => {
    expect(sessionSource).toContain("const resolvedChoice = prev.pendingChoice || data.pendingChoice || ''");
    expect(sessionSource).not.toContain("{ type: 'choice', text: choice,");
  });

  it('blocks student free-text turns in a teacher-controlled live session', async () => {
    const { handleAdventureTextSubmit } = loadAdventureHandlers();
    const addToast = vi.fn();
    const callGemini = vi.fn();
    const setAdventureState = vi.fn();
    const deps = new Proxy({
      adventureState: { isLoading: false },
      adventureTextInput: 'I explain my reasoning.',
      isTeacherMode: false,
      activeSessionCode: 'CLASS-42',
      addToast,
      callGemini,
      setAdventureState,
      t: (key) => key,
    }, { get: (target, property) => property in target ? target[property] : vi.fn() });

    await handleAdventureTextSubmit(null, deps);

    expect(addToast).toHaveBeenCalledWith('adventure.status_messages.teacher_control', 'info');
    expect(callGemini).not.toHaveBeenCalled();
    expect(setAdventureState).not.toHaveBeenCalled();
  });

  it('restores the pre-turn snapshot when a free-text request fails', async () => {
    const { handleAdventureTextSubmit } = loadAdventureHandlers();
    const originalState = {
      currentScene: { text: 'The bridge is unstable.', options: [] },
      history: [], inventory: [], climax: { isActive: false },
      energy: 90, xp: 10, level: 1, xpToNextLevel: 100, gold: 0,
      turnCount: 2, lastKeyItemTurn: 0, isLoading: false, sceneImage: null,
    };
    let state = structuredClone(originalState);
    const failedAction = vi.fn();
    const deps = new Proxy({
      adventureState: state,
      adventureTextInput: 'Stabilize it with a triangular brace.',
      adventureInputMode: 'choice', adventureLanguageMode: 'English',
      adventureDifficulty: 'Normal', adventureChanceMode: false,
      adventureFreeResponseEnabled: true, adventureConsistentCharacters: false,
      history: [], inputText: 'Engineering source text', selectedLanguages: [],
      studentInterests: [], isTeacherMode: true, activeSessionCode: '',
      lastTurnSnapshot: { current: null },
      SafetyContentChecker: { aiCheck: vi.fn() },
      archiveAdventureImage: vi.fn(), stopPlayback: vi.fn(),
      getAdventureGlossaryTerms: vi.fn(() => []),
      callGemini: vi.fn(async () => { throw new Error('offline'); }),
      setAdventureState: (update) => { state = typeof update === 'function' ? update(state) : update; },
      setFailedAdventureAction: failedAction,
      setAdventureTextInput: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(),
      t: (key) => key,
    }, { get: (target, property) => property in target ? target[property] : vi.fn() });

    await handleAdventureTextSubmit(null, deps);

    expect(failedAction).toHaveBeenCalledWith({ type: 'text', payload: 'Stabilize it with a triangular brace.' });
    expect(state.currentScene).toEqual(originalState.currentScene);
    expect(state.history).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isImageLoading).toBe(false);
  });

  it('turns an unrecoverable malformed AI reply into a playable fallback turn', async () => {
    const { handleAdventureTextSubmit } = loadAdventureHandlers();
    let state = {
      currentScene: { text: 'A data storm surrounds the ship.', options: [] },
      history: [], inventory: [], climax: { isActive: false },
      energy: 100, xp: 0, level: 1, xpToNextLevel: 100, gold: 0,
      turnCount: 1, lastKeyItemTurn: 0, isLoading: false, sceneImage: null,
    };
    let pendingUpdate;
    const addToast = vi.fn();
    const deps = new Proxy({
      adventureState: state,
      adventureTextInput: 'Scan the storm.',
      adventureInputMode: 'choice', adventureLanguageMode: 'English',
      adventureDifficulty: 'Normal', adventureChanceMode: false,
      adventureFreeResponseEnabled: true, adventureConsistentCharacters: false,
      history: [], inputText: 'Neuroscience source text', selectedLanguages: [],
      studentInterests: [], isTeacherMode: true, activeSessionCode: '',
      lastTurnSnapshot: { current: null },
      SafetyContentChecker: { aiCheck: vi.fn() },
      archiveAdventureImage: vi.fn(), stopPlayback: vi.fn(),
      getAdventureGlossaryTerms: vi.fn(() => []),
      callGemini: vi.fn(async () => 'not-json-at-all'),
      resilientJsonParse: vi.fn(async () => { throw new SyntaxError('bad json'); }),
      setAdventureState: (update) => { state = typeof update === 'function' ? update(state) : update; },
      setPendingAdventureUpdate: (update) => { pendingUpdate = update; },
      setAdventureTextInput: vi.fn(), setDiceResult: vi.fn(), setShowDice: vi.fn(),
      setFailedAdventureAction: vi.fn(), addToast, warnLog: vi.fn(),
      t: (key) => key,
    }, { get: (target, property) => property in target ? target[property] : vi.fn() });

    await handleAdventureTextSubmit(null, deps);

    expect(pendingUpdate.scene.text).toContain('data stream error');
    expect(pendingUpdate.scene.options).toHaveLength(4);
    expect(pendingUpdate.choiceSource).toBe('freetext');
    expect(addToast).toHaveBeenCalledWith('toasts.auto_repair_fallback', 'warning');
  });

  it('restores the saved Adventure state and every persisted mode setting', async () => {
    const { handleResumeAdventure } = loadAdventureHandlers();
    const savedRecord = {
      level: 4, xp: 35, energy: 72, gold: 18, turnCount: 7,
      currentScene: { text: 'A restored scene', options: [] },
      history: [{ type: 'scene', text: 'Earlier scene' }],
      characters: [{ name: 'Nova', portrait: null }],
      imageCache: ['must-not-return'], sceneImage: 'must-not-return',
      _adventureConfig: {
        difficulty: 'Hard', inputMode: 'debate', languageMode: 'Spanish',
        chanceMode: true, freeResponse: true, consistentCharacters: true,
        storyMode: true, socialStoryMode: true, socialStoryFocus: 'Taking turns',
        artStyle: 'storybook', customArtStyle: 'paper collage', lowQualityVisuals: true,
        enableFactionResources: true, factionResourceMode: 'detailed',
      },
    };
    let restoredState;
    const setters = Object.fromEntries([
      'setAdventureDifficulty', 'setAdventureInputMode', 'setAdventureLanguageMode',
      'setAdventureChanceMode', 'setAdventureFreeResponseEnabled', 'setAdventureConsistentCharacters',
      'setIsAdventureStoryMode', 'setIsSocialStoryMode', 'setSocialStoryFocus',
      'setAdventureArtStyle', 'setAdventureCustomArtStyle', 'setUseLowQualityVisuals',
      'setEnableFactionResources', 'setFactionResourceMode',
    ].map((name) => [name, vi.fn()]));
    const deps = new Proxy({
      ...setters,
      storageDB: { get: vi.fn(async () => savedRecord) },
      adventureImageDB: { getImage: vi.fn(async () => 'blob:restored-scene') },
      setAdventureState: (value) => { restoredState = value; },
      setIsResumingAdventure: vi.fn(), setHasSavedAdventure: vi.fn(),
      setActiveView: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(), t: (key) => key,
    }, { get: (target, property) => property in target ? target[property] : vi.fn() });

    await handleResumeAdventure(deps);

    expect(setters.setAdventureDifficulty).toHaveBeenCalledWith('Hard');
    expect(setters.setAdventureInputMode).toHaveBeenCalledWith('debate');
    expect(setters.setAdventureLanguageMode).toHaveBeenCalledWith('Spanish');
    expect(setters.setAdventureFreeResponseEnabled).toHaveBeenCalledWith(true);
    expect(setters.setIsSocialStoryMode).toHaveBeenCalledWith(true);
    expect(setters.setAdventureCustomArtStyle).toHaveBeenCalledWith('paper collage');
    expect(setters.setFactionResourceMode).toHaveBeenCalledWith('detailed');
    expect(restoredState.sceneImage).toBe('blob:restored-scene');
    expect(restoredState.imageCache).toEqual([]);
    expect(restoredState.isImageLoading).toBe(false);
    expect(restoredState.level).toBe(4);
  });

  it('hydrates Adventure configuration and progress from a student project file', async () => {
    const { handleLoadProject } = loadMiscHandlers();
    const originalFileReader = globalThis.FileReader;
    let finishRead;
    const readComplete = new Promise((resolve) => { finishRead = resolve; });
    globalThis.FileReader = class FakeFileReader {
      readAsText(file) {
        Promise.resolve(this.onload({ target: { result: file.contents } })).finally(finishRead);
      }
    };
    const project = {
      mode: 'student', history: [],
      settings: {
        allowFreeResponse: true,
        adventurePermissions: { allowModeSwitch: true, lockAllSettings: false },
        defaultAdventureConfig: {
          difficulty: 'Story', mode: 'debate', language: 'French', instructions: 'Use evidence.',
          chanceMode: true, freeResponse: true, consistentCharacters: true,
          storyMode: true, socialStoryMode: true, socialStoryFocus: 'Perspective taking',
          artStyle: 'custom', customArtStyle: 'cut paper', lowQualityVisuals: true,
          enableFactionResources: true, factionResourceMode: 'simple',
        },
      },
      adventureSnapshot: {
        xp: 45, gold: 12, energy: 81, level: 2, xpToNextLevel: 150,
        inventory: [], narrativeLedger: 'Remember the bridge.', stats: {},
        currentScene: { text: 'Project scene', options: [] }, history: [], turnCount: 5,
        climax: { isActive: false, masteryScore: 24 }, debateMomentum: 64,
      },
    };
    let restoredState = {};
    const setters = Object.fromEntries([
      'setAdventureDifficulty', 'setAdventureInputMode', 'setAdventureLanguageMode',
      'setAdventureCustomInstructions', 'setAdventureChanceMode', 'setAdventureFreeResponseEnabled',
      'setAdventureConsistentCharacters', 'setIsAdventureStoryMode', 'setIsSocialStoryMode',
      'setSocialStoryFocus', 'setAdventureArtStyle', 'setAdventureCustomArtStyle',
      'setUseLowQualityVisuals', 'setEnableFactionResources', 'setFactionResourceMode',
    ].map((name) => [name, vi.fn()]));
    const deps = new Proxy({
      ...setters,
      setAdventureState: (update) => { restoredState = typeof update === 'function' ? update(restoredState) : update; },
      setHasSavedAdventure: vi.fn(), setStudentProjectSettings: vi.fn(),
      setHistory: vi.fn(), hydrateHistory: (items) => items,
      projectFileInputRef: { current: { value: 'project.json' } },
      addToast: vi.fn(), warnLog: vi.fn(), t: (key) => key,
    }, { get: (target, property) => property in target ? target[property] : vi.fn() });

    try {
      handleLoadProject({ target: { files: [{ contents: JSON.stringify(project) }] } }, deps);
      await readComplete;
    } finally {
      globalThis.FileReader = originalFileReader;
    }

    expect(setters.setAdventureInputMode).toHaveBeenCalledWith('debate');
    expect(setters.setAdventureCustomInstructions).toHaveBeenCalledWith('Use evidence.');
    expect(setters.setSocialStoryFocus).toHaveBeenCalledWith('Perspective taking');
    expect(setters.setAdventureArtStyle).toHaveBeenCalledWith('custom');
    expect(restoredState.currentScene.text).toBe('Project scene');
    expect(restoredState.turnCount).toBe(5);
    expect(restoredState.debateMomentum).toBe(64);
    expect(restoredState.isGameOver).toBe(false);
  });

  it('keeps the dice completion timer stable across parent rerenders', () => {
    expect(uiSource).toContain('const onCompleteRef = useRef(onComplete)');
    expect(uiSource).toContain('setTimeout(() => onCompleteRef.current()');
    expect(uiSource).toContain('}, [reduceMotion, result])');
  });

  it('executes the deterministic Adventure build check without rewriting outputs', () => {
    const files = ['adventure_module.js', 'desktop/web-app/public/adventure_module.js'];
    const before = files.map((file) => fs.statSync(file).mtimeMs);
    const result = spawnSync(process.execPath, ['_build_adventure_module.js', '--check'], { encoding: 'utf8' });
    const after = files.map((file) => fs.statSync(file).mtimeMs);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Generated outputs are current');
    expect(after).toEqual(before);
  });
});
