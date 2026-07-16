// Adventure journey golden: deterministic choice / free-response / debate turns
// against the SHIPPED handler modules (adventure_handlers_module.js +
// adventure_session_handlers_module.js) in a real Chromium, with a SCRIPTED
// Gemini. This is the spec the blocking `adventure-journey` CI job runs.
//
// Design constraints (2026-07-16 squad session):
// - The scripted Gemini is a FIFO QUEUE, not prompt-shape dispatch — the
//   adventure prompts are under active revision (free-response "end with a
//   challenge" work), and this smoke must not break on prompt rewording.
//   Each journey step makes exactly one callGemini call, so ordering is stable.
// - Assertions target the turn-resolution CONTRACT in handleDiceRollComplete
//   (turn advance, game-over semantics, debate phase/momentum), not UI or
//   prompt internals. The nondeterministic bits (bonus-gold coin flip) are
//   deliberately not asserted.
// - No React needed: the handlers are dependency-injected plain functions;
//   deps are supplied via the same Proxy-stub pattern as
//   tests/adventure_runtime_regressions.test.js, but running on the built
//   module bytes (catches source→module drift the Node tests can't).
import { test, expect } from '@playwright/test';
import * as path from 'path';

const HANDLERS_PATH = path.resolve(__dirname, '../../adventure_handlers_module.js');
const SESSION_PATH = path.resolve(__dirname, '../../adventure_session_handlers_module.js');

const SOURCE_TEXT =
  'The water cycle moves water through evaporation, condensation, and precipitation. ' +
  'Energy from the sun drives evaporation from oceans and lakes.';

// In-page harness: builds the deps object both handler modules expect.
// Missing deps fall back to a no-op function (mirrors the vitest Proxy pattern).
const SETUP = `
  window.__makeAdventureHarness = (cfg) => {
    let state = {
      currentScene: null, sceneImage: null, isLoading: false, isGameOver: false,
      history: [], inventory: [], systemResources: [], imageCache: [], voiceMap: {},
      stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
      energy: 100, xp: 0, xpToNextLevel: 100, level: 1, gold: 0, turnCount: 0,
      climax: { isActive: false, archetype: 'Auto', masteryScore: 0, attempts: 0 },
      debatePhase: 'setup', debateMomentum: 50, debateTopic: null, pendingChoice: null,
      activeXpMultiplier: 1, activeRollModifier: 0, activeGoldBuffTurns: 0, lastKeyItemTurn: 0,
      narrativeLedger: '',
    };
    let pending = null, showDice = false, diceResult = null;
    const toasts = [], geminiCalls = [], imageCalls = [];
    const queue = (cfg.geminiResponses || []).slice();
    const noop = () => {};
    const base = {
      adventureTextInput: '', adventureInputMode: cfg.inputMode || 'choice',
      adventureLanguageMode: 'English', adventureChanceMode: false,
      adventureConsistentCharacters: false, adventureCustomInstructions: '',
      adventureFreeResponseEnabled: !!cfg.freeResponse, adventureDifficulty: 'Normal',
      history: [], inputText: cfg.sourceText, sourceTopic: cfg.topic || 'The Water Cycle',
      gradeLevel: '6th Grade', standardsInput: '', studentInterests: [],
      isIndependentMode: false, isTeacherMode: true, factionResourceMode: 'off',
      enableFactionResources: false, selectedLanguages: [], currentUiLanguage: 'en',
      apiKey: '', appId: 'test-app', activeSessionAppId: null, activeSessionCode: '',
      globalPoints: 0, sessionData: null, user: null,
      isAdventureStoryMode: false, isImmersiveMode: false, isReviewingCharacters: false,
      isShopOpen: false, isSocialStoryMode: false, socialStoryFocus: '',
      debateTopic: cfg.topic || null, aiBotsActive: false, narrativeLedger: '',
      useLowQualityVisuals: true, imageGenerationStyle: 'off', imageAspectRatio: '1:1',
      adventureArtStyle: 'default', adventureCustomArtStyle: '',
      alloBotRef: { current: null }, lastTurnSnapshot: { current: null },
      lastReadTurnRef: { current: 0 }, pdfPreviewRef: { current: null },
      exportPreviewRef: { current: null },
      adventureImageDB: { getImage: async () => null, saveImage: async () => null },
      setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
      setPendingAdventureUpdate: (v) => { pending = v; },
      setShowDice: (v) => { showDice = v; },
      setDiceResult: (v) => { diceResult = v; },
      callGemini: async (prompt) => {
        geminiCalls.push(String(prompt).slice(0, 100));
        if (!queue.length) throw new Error('scripted Gemini queue exhausted');
        return queue.shift();
      },
      callGeminiVision: async () => '{}', callImagen: async () => null,
      callGeminiImageEdit: async () => null,
      addToast: (msg, kind) => { toasts.push(kind + ':' + msg); },
      t: (k) => k, warnLog: noop, debugLog: noop,
      cleanJson: (s) => s,
      safeJsonParse: (s) => { try { return JSON.parse(s); } catch (_) { return null; } },
      resilientJsonParse: async (s) => JSON.parse(s),
      archiveAdventureImage: async () => null,
      SafetyContentChecker: { aiCheck: noop }, handleAiSafetyFlag: noop,
      playAdventureEventSound: noop, playSound: noop, stopPlayback: noop, resetDebate: noop,
      handleScoreUpdate: noop, getAdventureGlossaryTerms: () => '',
      generateAdventureImage: (sceneText) => { imageCalls.push(String(sceneText).slice(0, 60)); },
      generateNarrativeLedger: noop, generatePixelArtItem: async () => null,
      detectClimaxArchetype: async () => 'Auto', flyToElement: noop,
      storageDB: { get: async () => null, set: async () => {}, remove: async () => {} },
      updateDoc: async () => {}, doc: noop, db: {},
      ADVENTURE_GUARDRAIL: '', DEBATE_INVISIBLE_INSTRUCTIONS: '',
      INVISIBLE_NARRATOR_INSTRUCTIONS: '', NARRATIVE_GUARDRAILS: '',
      SYSTEM_INVISIBLE_INSTRUCTIONS: '', SYSTEM_STATE_EXAMPLES: {},
      setAdventureTextInput: noop, setActiveView: noop, setFailedAdventureAction: noop,
      setGeneratedContent: noop, setGenerationStep: noop, setHasSavedAdventure: noop,
      setHistory: noop, setIsResumingAdventure: noop, setShowGlobalLevelUp: noop,
      setShowNewGameSetup: noop, setAdventureEffects: noop, setIsProcessing: noop,
      setError: noop,
    };
    const deps = new Proxy(base, {
      get(target, prop) {
        if (prop === 'adventureState') return state;
        if (prop === 'pendingAdventureUpdate') return pending;
        if (prop in target) return target[prop];
        return noop;
      },
    });
    return {
      deps,
      handlers: window.AlloModules.AdventureHandlers,
      session: window.AlloModules.AdventureSessionHandlers,
      getState: () => state,
      getPending: () => pending,
      getShowDice: () => showDice,
      getDiceResult: () => diceResult,
      resolveDice: () => window.AlloModules.AdventureSessionHandlers.handleDiceRollComplete(deps),
      debug: () => ({ toasts, geminiCalls, imageCalls }),
    };
  };
  // Deterministic turn payload (rollDetails total 14 => success band: xp +50, energy -5).
  window.__turnPayload = (sceneText, options, extra) => JSON.stringify(Object.assign({
    outcomeType: 'strategic_success',
    conceptsUsed: ['Evaporation'],
    climaxResult: null,
    evaluation: 'Solid reasoning about the water cycle.',
    xpAwarded: 20, energyChange: -5, goldAwarded: 0,
    rollDetails: { strategyRating: 8, d20: 14, total: 14, outcomeType: 'strategic_success' },
    inventoryUpdate: null,
    voices: { Narrator: 'Allo' },
    scene: { text: sceneText, options: options },
    soundParams: { atmosphere: 'Calm', element: 'Water' },
  }, extra || {}));
`;

const SIX_OPTIONS = [
  'Follow the droplet up during evaporation',
  'Study the cloud formation',
  'Wait by the lake',
  'Measure the temperature',
  'Dig a channel to the sea',
  'Ask the sun to stop shining',
];

function openingScene(text: string, options: string[]) {
  return JSON.stringify({
    text,
    options,
    voices: { Narrator: 'Allo' },
    soundParams: { atmosphere: 'Calm', element: 'Water' },
  });
}

test.describe('Adventure journeys — shipped modules, scripted Gemini', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
    await page.addScriptTag({ path: HANDLERS_PATH });
    await page.addScriptTag({ path: SESSION_PATH });
    await page.addScriptTag({ content: SETUP });
  });

  test('handler modules register their full API', async ({ page }) => {
    const api = await page.evaluate(() => ({
      handlers: Object.keys((window as any).AlloModules.AdventureHandlers || {}),
      session: Object.keys((window as any).AlloModules.AdventureSessionHandlers || {}),
    }));
    expect(api.handlers).toEqual(expect.arrayContaining([
      'executeStartAdventure', 'handleStartAdventure', 'handleResumeAdventure',
      'handleAdventureTextSubmit', 'handleAdventureChoice',
    ]));
    expect(api.session).toEqual(expect.arrayContaining([
      'handleDiceRollComplete', 'generateAdventureImage', 'generateNarrativeLedger',
    ]));
  });

  test('choice journey: start → pick an option → turn resolves and story advances', async ({ page }) => {
    const out = await page.evaluate(async (fix) => {
      const w = window as any;
      const h = w.__makeAdventureHarness({
        inputMode: 'choice',
        sourceText: fix.sourceText,
        geminiResponses: [
          fix.opening,
          w.__turnPayload('The droplet rises with you into a towering cumulus cloud.', fix.options),
        ],
      });
      await h.handlers.executeStartAdventure(null, h.deps);
      const afterStart = JSON.parse(JSON.stringify({
        sceneText: h.getState().currentScene && h.getState().currentScene.text,
        optionCount: (h.getState().currentScene && h.getState().currentScene.options || []).length,
        turnCount: h.getState().turnCount,
        isGameOver: h.getState().isGameOver,
        isLoading: h.getState().isLoading,
      }));
      await h.handlers.handleAdventureChoice(fix.options[0], h.deps);
      const pendingInfo = {
        showDice: h.getShowDice(),
        diceResult: h.getDiceResult(),
        choiceSource: h.getPending() && h.getPending().choiceSource,
      };
      h.resolveDice();
      await new Promise((r) => setTimeout(r, 50));
      const s = h.getState();
      return {
        afterStart, pendingInfo,
        after: {
          sceneText: s.currentScene && s.currentScene.text,
          turnCount: s.turnCount, isGameOver: s.isGameOver, isLoading: s.isLoading,
          energy: s.energy, xp: s.xp,
          decisions: s.stats.decisions, successes: s.stats.successes,
          concepts: s.stats.conceptsFound,
          historyTypes: s.history.map((e: any) => e.type),
          choiceEntry: (s.history.find((e: any) => e.type === 'choice') || {}).text,
          pendingCleared: h.getPending() === null,
          diceHidden: !h.getShowDice(),
        },
        debug: h.debug(),
      };
    }, { sourceText: SOURCE_TEXT, opening: openingScene('You are a water droplet resting in a mountain lake. The morning sun warms the surface. What do you do?', SIX_OPTIONS), options: SIX_OPTIONS });

    expect(out.afterStart.sceneText, 'debug: ' + JSON.stringify(out.debug)).toContain('water droplet');
    expect(out.afterStart.optionCount).toBe(6);
    expect(out.afterStart.turnCount).toBe(1);
    expect(out.afterStart.isLoading).toBe(false);

    expect(out.pendingInfo.showDice, 'choice must stage a pending update behind the dice overlay').toBe(true);
    expect(out.pendingInfo.diceResult).toBe(14);
    expect(out.pendingInfo.choiceSource).toBe('option');

    expect(out.after.sceneText).toContain('cumulus cloud');
    expect(out.after.turnCount).toBe(2);
    expect(out.after.isGameOver).toBe(false);
    expect(out.after.isLoading).toBe(false);
    expect(out.after.energy, 'success band (total 14) costs 5 energy').toBe(95);
    expect(out.after.xp, 'success band (total 14) awards 50 xp').toBe(50);
    expect(out.after.decisions).toBe(1);
    expect(out.after.successes, 'strategic_success must increment mastery stats').toBe(1);
    expect(out.after.concepts).toContain('Evaporation');
    expect(out.after.historyTypes).toEqual(['scene', 'choice', 'feedback']);
    expect(out.after.choiceEntry).toBe(SIX_OPTIONS[0]);
    expect(out.after.pendingCleared).toBe(true);
    expect(out.after.diceHidden).toBe(true);
  });

  test('free-response journey: typed answer resolves WITHOUT ending the game on an empty option list', async ({ page }) => {
    // Regression guard for the bug Aaron hit live: in free-response mode the AI
    // correctly returns options: [], which the resolver once treated as game over.
    const out = await page.evaluate(async (fix) => {
      const w = window as any;
      const h = w.__makeAdventureHarness({
        inputMode: 'choice', freeResponse: true,
        sourceText: fix.sourceText,
        geminiResponses: [
          fix.opening,
          w.__turnPayload('Your condensation experiment works — the flask clouds over. A new question forms: why does the rate change with temperature?', []),
        ],
      });
      await h.handlers.executeStartAdventure(null, h.deps);
      const startOptions = (h.getState().currentScene.options || []).length;
      await h.handlers.handleAdventureTextSubmit('I cool the flask with ice to condense the vapor.', h.deps);
      const choiceSource = h.getPending() && h.getPending().choiceSource;
      h.resolveDice();
      await new Promise((r) => setTimeout(r, 50));
      const s = h.getState();
      return {
        startOptions, choiceSource,
        sceneText: s.currentScene && s.currentScene.text,
        sceneOptions: s.currentScene && s.currentScene.options,
        turnCount: s.turnCount, isGameOver: s.isGameOver, isLoading: s.isLoading,
        historyChoice: (s.history.find((e: any) => e.type === 'choice') || {}),
        imageCalls: h.debug().imageCalls,
        debug: h.debug(),
      };
    }, { sourceText: SOURCE_TEXT, opening: openingScene('You are a researcher studying condensation. Steam rises from your beaker. What is your next move?', []) });

    expect(out.startOptions, 'free-response opening scene carries no option buttons').toBe(0);
    expect(out.choiceSource).toBe('freetext');
    expect(out.isGameOver, 'empty options must NOT end a free-response adventure — debug: ' + JSON.stringify(out.debug)).toBe(false);
    expect(out.sceneText).toContain('condensation experiment');
    expect(out.sceneOptions).toEqual([]);
    expect(out.turnCount).toBe(2);
    expect(out.isLoading).toBe(false);
    expect(out.historyChoice.text).toBe('I cool the flask with ice to condense the vapor.');
    expect(out.historyChoice.source).toBe('freetext');
    expect(out.imageCalls.length, 'a continuing turn must request the next scene image').toBeGreaterThanOrEqual(1);
  });

  test('choice journey: empty option list still means game over when NOT in free-response mode', async ({ page }) => {
    const out = await page.evaluate(async (fix) => {
      const w = window as any;
      const h = w.__makeAdventureHarness({
        inputMode: 'choice',
        sourceText: fix.sourceText,
        geminiResponses: [
          fix.opening,
          w.__turnPayload('The droplet completes its journey back to the sea. The cycle is complete.', []),
        ],
      });
      await h.handlers.executeStartAdventure(null, h.deps);
      await h.handlers.handleAdventureChoice(fix.options[2], h.deps);
      h.resolveDice();
      await new Promise((r) => setTimeout(r, 50));
      const s = h.getState();
      return { isGameOver: s.isGameOver, turnCount: s.turnCount, debug: h.debug() };
    }, { sourceText: SOURCE_TEXT, opening: openingScene('You are a water droplet. What do you do?', SIX_OPTIONS), options: SIX_OPTIONS });

    expect(out.isGameOver, 'no options in choice mode = story complete — debug: ' + JSON.stringify(out.debug)).toBe(true);
    expect(out.turnCount).toBe(2);
  });

  test('debate journey: setup offers positions, first argument activates the debate and moves momentum', async ({ page }) => {
    const positions = [
      'Defend: dams are essential for water management',
      'Argue: dams damage river ecosystems',
      'Explore: targeted small-scale water projects',
    ];
    const out = await page.evaluate(async (fix) => {
      const w = window as any;
      const h = w.__makeAdventureHarness({
        inputMode: 'debate',
        sourceText: fix.sourceText,
        topic: 'Should rivers be dammed?',
        geminiResponses: [
          fix.opening,
          w.__turnPayload(
            'A fair point on flood control — but consider the salmon runs. How do you answer the ecological cost?',
            fix.positions,
            { debateMomentumChange: 10, resetDebate: false, newTopic: null }
          ),
        ],
      });
      await h.handlers.executeStartAdventure(null, h.deps);
      const afterStart = {
        phase: h.getState().debatePhase,
        momentum: h.getState().debateMomentum,
        optionCount: (h.getState().currentScene.options || []).length,
      };
      await h.handlers.handleAdventureTextSubmit('Dams provide flood control and renewable power for downstream towns.', h.deps);
      h.resolveDice();
      await new Promise((r) => setTimeout(r, 50));
      const s = h.getState();
      return {
        afterStart,
        phase: s.debatePhase, momentum: s.debateMomentum,
        sceneText: s.currentScene && s.currentScene.text,
        isGameOver: s.isGameOver, turnCount: s.turnCount,
        debug: h.debug(),
      };
    }, { sourceText: SOURCE_TEXT, opening: openingScene('Welcome to the debate on river dams. Which position will you defend?', positions), positions });

    expect(out.afterStart.optionCount, 'debate setup must offer the 3 positions').toBe(3);
    expect(out.afterStart.phase).toBe('setup');
    expect(out.afterStart.momentum).toBe(50);

    expect(out.phase, 'first resolved argument must activate the debate — debug: ' + JSON.stringify(out.debug)).toBe('active');
    expect(out.momentum, '+10 momentum from a strong argument').toBe(60);
    expect(out.sceneText).toContain('salmon');
    expect(out.isGameOver).toBe(false);
    expect(out.turnCount).toBe(2);
  });
});
