import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const sessionSource = fs.readFileSync('adventure_session_handlers_source.jsx', 'utf8');
const handlerSource = fs.readFileSync('adventure_handlers_source.jsx', 'utf8');
const appSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const uiSource = fs.readFileSync('adventure_source.jsx', 'utf8');

function loadSessionHandlers() {
  const window = { AlloModules: {} };
  return new Function('window', sessionSource + '\nreturn window.AlloModules.AdventureSessionHandlers;')(window);
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

  it('guards live-session text input and restores the snapshot after a failed typed turn', () => {
    expect(handlerSource).toContain("if (!isTeacherMode && activeSessionCode)");
    expect(handlerSource).toContain("snapshot ? { ...snapshot, isLoading: false, isImageLoading: false }");
  });

  it('persists full mode configuration without embedding image caches', () => {
    expect(appSource).toContain('_adventureConfig: {');
    expect(appSource).toContain('imageCache: []');
    expect(appSource).toContain('portrait: null');
    expect(appSource).toContain('activeAdventureConfig: {');
    expect(appSource).toContain("const shareableSceneImage = typeof adventureState.sceneImage === 'string'");
  });

  it('keeps the dice completion timer stable across parent rerenders', () => {
    expect(uiSource).toContain('const onCompleteRef = useRef(onComplete)');
    expect(uiSource).toContain('setTimeout(() => onCompleteRef.current()');
    expect(uiSource).toContain('}, [reduceMotion, result])');
  });

  it('provides a deterministic Adventure runtime builder and non-writing check mode', () => {
    const builder = fs.readFileSync('_build_adventure_module.js', 'utf8');
    expect(builder).toContain("esbuild.transformSync(componentSource");
    expect(builder).toContain("process.argv.includes('--check')");
    expect(builder).toContain("new Function(outputCode)");
    expect(builder).toContain("fs.writeFileSync(DEPLOY_OUTPUT, outputCode");
  });
});
