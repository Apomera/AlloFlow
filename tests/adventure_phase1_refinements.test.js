import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[char]));

let React;
let originalBlob;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  global.React = window.React = React;
  originalBlob = globalThis.Blob;
  loadAlloModule('adventure_session_handlers_module.js');
  loadAlloModule('adventure_handlers_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('export_module.js');
});

afterEach(() => {
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeDepsProxy(base) {
  return new Proxy(base, {
    get(target, prop) {
      return prop in target ? target[prop] : vi.fn();
    },
  });
}

describe('Adventure Phase 1 Refinements', () => {
  describe('AdventureSessionHandlers', () => {
    it('advances across multiple levels in a single turn without leaving excess XP', () => {
      vi.useFakeTimers();
      const { handleDiceRollComplete } = window.AlloModules.AdventureSessionHandlers;
      let state = {
        currentScene: { text: 'The citadel gates open.', options: ['Enter'] },
        pendingChoice: 'Unlock the seal',
        history: [],
        stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
        energy: 80,
        xp: 95,
        xpToNextLevel: 100,
        level: 1,
        gold: 10,
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
        rollResult: { total: 15 },
      };
      const setAdventureEffects = vi.fn();
      const playAdventureEventSound = vi.fn();
      const addToast = vi.fn();
      const deps = makeDepsProxy({
        adventureState: state,
        pendingAdventureUpdate: {
          scene: { text: 'Inside the courtyard.', options: ['Proceed'] },
          evaluation: 'Masterful.',
          feedback: 'Masterful.',
          xpAwarded: 200,
          xpChange: 200,
          energyChange: 0,
          goldAwarded: 0,
          inventoryUpdate: null,
        },
        adventureChanceMode: false,
        adventureDifficulty: 'Normal',
        adventureInputMode: 'choice',
        adventureFreeResponseEnabled: false,
        adventureConsistentCharacters: false,
        isAdventureStoryMode: false,
        isSocialStoryMode: false,
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        setAdventureEffects,
        playAdventureEventSound,
        addToast,
        t: (k) => k,
        alloBotRef: { current: null },
      });

      handleDiceRollComplete(deps);
      vi.runAllTimers();

      expect(state.level).toBe(3);
      expect(state.xp).toBe(45);
      expect(state.xpToNextLevel).toBe(225);
      expect(state.xp).toBeLessThan(state.xpToNextLevel);
      expect(setAdventureEffects).toHaveBeenCalledWith(expect.objectContaining({ levelUp: 3 }));
      expect(playAdventureEventSound).toHaveBeenCalledWith('critical_success');
      expect(addToast).toHaveBeenCalledWith('toasts.level_up', 'success');
    });

    it('uses scaled Chance Mode SFX thresholds and appends (+X Luck) notes to Chance roll logs', () => {
      vi.useFakeTimers();
      const { handleDiceRollComplete } = window.AlloModules.AdventureSessionHandlers;

      const runChanceRoll = (total, luckBonus) => {
        let state = {
          currentScene: { text: 'Scene', options: ['Act'] },
          pendingChoice: 'Act',
          history: [],
          stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
          energy: 80, xp: 0, xpToNextLevel: 100, level: 1, gold: 0,
          inventory: [], systemResources: [], imageCache: [],
          climax: { isActive: false, masteryScore: 0, attempts: 0 },
          turnCount: 1,
        };
        const playAdventureEventSound = vi.fn();
        handleDiceRollComplete(makeDepsProxy({
          adventureState: state,
          pendingAdventureUpdate: {
            scene: { text: 'Next', options: ['Go'] },
            evaluation: 'Outcome',
            feedback: 'Outcome',
            xpAwarded: 5,
            rollDetails: {
              d20: 15,
              strategyRating: total - 15 - luckBonus,
              rollModifier: luckBonus,
              total,
            },
          },
          adventureChanceMode: true,
          adventureDifficulty: 'Normal',
          adventureInputMode: 'choice',
          setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
          playAdventureEventSound,
          t: (k) => k,
          alloBotRef: { current: null },
        }));
        vi.runAllTimers();
        return { state, playAdventureEventSound };
      };

      const partial = runChanceRoll(19, 4);
      expect(partial.playAdventureEventSound).not.toHaveBeenCalledWith('critical_success');
      expect(partial.playAdventureEventSound).not.toHaveBeenCalledWith('success');
      expect(partial.state.history.some((e) => e.type === 'feedback' && e.text.includes('(+4 Luck)'))).toBe(true);

      const success = runChanceRoll(24, 2);
      expect(success.playAdventureEventSound).toHaveBeenCalledWith('success');
      expect(success.playAdventureEventSound).not.toHaveBeenCalledWith('critical_success');

      const crit = runChanceRoll(29, 0);
      expect(crit.playAdventureEventSound).toHaveBeenCalledWith('critical_success');
      expect(crit.state.history.some((e) => e.type === 'feedback' && e.text.includes('Luck'))).toBe(false);
    });

    it('handles climax failure depletion, continuing failure image generation, and preserves systemResources & voiceMap', () => {
      vi.useFakeTimers();
      const { handleDiceRollComplete } = window.AlloModules.AdventureSessionHandlers;
      const runClimaxFailure = (startEnergy, options) => {
        let state = {
          currentScene: { text: 'Climax challenge', options: ['Strike'] },
          pendingChoice: 'Defend',
          history: [],
          stats: { successes: 1, failures: 0, decisions: 5, conceptsFound: [] },
          energy: startEnergy, xp: 20, xpToNextLevel: 100, level: 2, gold: 50,
          inventory: [],
          systemResources: [{ name: 'Shields', quantity: 70, unit: '%' }],
          voiceMap: { Mentor: 'Kore' },
          imageCache: [],
          climax: { isActive: true, masteryScore: 15, attempts: 1 },
          turnCount: 6,
          activeRollModifier: 5,
          activeXpMultiplier: 2,
          activeGoldBuffTurns: 2,
        };
        const generateAdventureImage = vi.fn();
        const addToast = vi.fn();
        handleDiceRollComplete(makeDepsProxy({
          adventureState: state,
          pendingAdventureUpdate: {
            masteryScore: 0,
            scene: { text: 'The shield buckles.', options },
            feedback: 'Your defense slips.',
          },
          adventureChanceMode: false,
          adventureDifficulty: 'Normal',
          adventureInputMode: 'system',
          adventureFreeResponseEnabled: false,
          generateAdventureImage,
          addToast,
          setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
          t: (k) => k,
          alloBotRef: { current: null },
        }));
        vi.runAllTimers();
        return { state, generateAdventureImage, addToast };
      };

      const depleted = runClimaxFailure(15, ['Recover']);
      expect(depleted.state.energy).toBe(0);
      expect(depleted.state.isGameOver).toBe(true);
      expect(depleted.addToast).toHaveBeenCalledWith('adventure.energy_depleted', 'error');
      expect(depleted.generateAdventureImage).not.toHaveBeenCalled();
      expect(depleted.addToast).not.toHaveBeenCalledWith('adventure.toasts.log_updated', 'info');
      expect(depleted.state.systemResources).toEqual([{ name: 'Shields', quantity: 70, unit: '%' }]);
      expect(depleted.state.voiceMap).toEqual({ Mentor: 'Kore' });

      const continuing = runClimaxFailure(80, ['Regroup']);
      expect(continuing.state.energy).toBe(60);
      expect(continuing.state.isGameOver).toBe(false);
      expect(continuing.generateAdventureImage).toHaveBeenCalledOnce();
      expect(continuing.state.activeRollModifier).toBe(0);
      expect(continuing.state.activeXpMultiplier).toBe(1);
      expect(continuing.state.activeGoldBuffTurns).toBe(1);
    });

    it('keeps generateNarrativeLedger non-blocking and cancels stale writes when cancelAdventureSceneImage runs', async () => {
      const { generateNarrativeLedger, cancelAdventureSceneImage } = window.AlloModules.AdventureSessionHandlers;
      let resolveGemini;
      const callGemini = vi.fn(() => new Promise((r) => { resolveGemini = r; }));
      const setIsProcessing = vi.fn();
      const setGenerationStep = vi.fn();
      const warnLog = vi.fn();
      let state = { turnCount: 3, narrativeLedger: 'Existing ledger', currentScene: { text: 'A' }, history: [{ type: 'scene', text: 'A' }] };
      const deps = makeDepsProxy({
        get adventureState() { return state; },
        callGemini,
        warnLog,
        setIsProcessing,
        setGenerationStep,
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        t: (k) => k,
      });

      const pending = generateNarrativeLedger([{ type: 'scene', text: 'Old' }], deps);
      expect(setIsProcessing).not.toHaveBeenCalled();
      expect(setGenerationStep).not.toHaveBeenCalled();

      cancelAdventureSceneImage(deps.setAdventureState);
      resolveGemini('Stale summary that must not land');
      await pending;

      expect(state.narrativeLedger).toBe('Existing ledger');
    });
  });

  describe('AdventureHandlers', () => {
    it('prevents concurrent overlapping submissions and drops stale run epochs across restart/resume', async () => {
      const { handleAdventureTextSubmit, handleAdventureChoice, handleResumeAdventure } = window.AlloModules.AdventureHandlers;
      let resolveTurnGemini;
      const callGemini = vi.fn(() => new Promise((r) => { resolveTurnGemini = r; }));
      let state = {
        currentScene: { text: 'Fork in the path', options: ['Left', 'Right'] },
        history: [{ type: 'scene', text: 'Fork in the path' }],
        inventory: [],
        climax: { isActive: false, masteryScore: 0, attempts: 0 },
        energy: 90, xp: 10, xpToNextLevel: 100, level: 1, gold: 0,
        turnCount: 2, isLoading: false, isGameOver: false,
      };
      const setPendingAdventureUpdate = vi.fn();
      const setShowDice = vi.fn();
      const deps = makeDepsProxy({
        get adventureState() { return state; },
        adventureTextInput: 'Inspect the tracks carefully.',
        adventureInputMode: 'choice',
        adventureLanguageMode: 'English',
        adventureDifficulty: 'Normal',
        adventureFreeResponseEnabled: true,
        isTeacherMode: true,
        activeSessionCode: '',
        lastTurnSnapshot: { current: null },
        SafetyContentChecker: { aiCheck: vi.fn() },
        archiveAdventureImage: vi.fn(async () => null),
        getAdventureGlossaryTerms: vi.fn(() => []),
        callGemini,
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        setPendingAdventureUpdate,
        setShowDice,
        t: (k) => k,
      });

      const firstPromise = handleAdventureTextSubmit(null, deps);
      const overlapPromise = handleAdventureChoice('Left', deps);
      await overlapPromise;
      expect(callGemini).toHaveBeenCalledTimes(1);

      deps.storageDB = {
        get: vi.fn(async () => ({
          level: 5, xp: 40, energy: 85, gold: 30, turnCount: 9,
          currentScene: { text: 'Resumed sanctuary', options: ['Rest'] },
          history: [{ type: 'scene', text: 'Resumed sanctuary' }],
          _adventureConfig: { difficulty: 'Normal' },
        })),
      };
      deps.adventureImageDB = { getImage: vi.fn(async () => null) };
      deps.lastReadTurnRef = { current: 0 };
      await handleResumeAdventure(deps);

      resolveTurnGemini(JSON.stringify({
        scene: { text: 'Stale response', options: ['X'] },
        feedback: 'Stale',
        evaluation: 'Stale',
      }));
      await firstPromise;

      expect(state.turnCount).toBe(9);
      expect(setPendingAdventureUpdate).not.toHaveBeenCalled();
      expect(setShowDice).not.toHaveBeenCalled();
    });

    it('enforces student adventurePermissions on handleResumeAdventure while restoring protagonistAge & customInstructions', async () => {
      const { handleResumeAdventure } = window.AlloModules.AdventureHandlers;
      const setters = Object.fromEntries([
        'setAdventureDifficulty', 'setAdventureInputMode', 'setAdventureLanguageMode',
        'setAdventureChanceMode', 'setAdventureFreeResponseEnabled', 'setAdventureTypingPaceEnabled',
        'setAdventureFluencyEnabled', 'setAdventureConsistentCharacters',
        'setAdventureProtagonistAge', 'setAdventureCustomInstructions',
        'setIsAdventureStoryMode', 'setIsSocialStoryMode', 'setSocialStoryFocus',
        'setAdventureArtStyle', 'setAdventureCustomArtStyle', 'setUseLowQualityVisuals',
        'setEnableFactionResources', 'setFactionResourceMode',
      ].map((k) => [k, vi.fn()]));
      const lastReadTurnRef = { current: 0 };
      const deps = makeDepsProxy({
        ...setters,
        isTeacherMode: false,
        lastReadTurnRef,
        lastTurnSnapshot: { current: { stale: true } },
        studentProjectSettings: {
          allowFreeResponse: false,
          adventurePermissions: {
            lockAllSettings: false,
            allowModeSwitch: false,
            allowDifficultySwitch: false,
            allowLanguageSwitch: false,
            allowVisualsToggle: false,
            allowCustomInstructions: true,
          },
        },
        storageDB: {
          get: vi.fn(async () => ({
            level: 2, xp: 10, energy: 70, gold: 5, turnCount: 4,
            currentScene: { text: 'Saved scene', options: ['Go'] },
            history: [{ type: 'scene', text: 'Saved scene' }],
            _adventureConfig: {
              difficulty: 'Hardcore',
              inputMode: 'debate',
              languageMode: 'Spanish',
              freeResponse: true,
              lowQualityVisuals: true,
              protagonistAge: 'teen',
              customInstructions: 'Focus on causal verbs',
            },
          })),
        },
        adventureImageDB: { getImage: vi.fn(async () => null) },
        setAdventureState: vi.fn(),
        t: (k) => k,
      });

      await handleResumeAdventure(deps);

      expect(setters.setAdventureDifficulty).not.toHaveBeenCalled();
      expect(setters.setAdventureInputMode).not.toHaveBeenCalled();
      expect(setters.setAdventureLanguageMode).not.toHaveBeenCalled();
      expect(setters.setUseLowQualityVisuals).not.toHaveBeenCalled();
      expect(setters.setAdventureFreeResponseEnabled).toHaveBeenCalledWith(false);
      expect(setters.setAdventureProtagonistAge).toHaveBeenCalledWith('teen');
      expect(setters.setAdventureCustomInstructions).toHaveBeenCalledWith('Focus on causal verbs');
      expect(lastReadTurnRef.current).toBe(4);
      expect(deps.lastTurnSnapshot.current).toBeNull();
    });
  });

  describe('HostHandlers', () => {
    it('rehydrates guest history images from IndexedDB using imageTurn fallback when imageId is non-numeric', async () => {
      const getImage = vi.fn(async (key) => (key === 4 ? 'data:image/png;base64,guest-scene-4' : null));
      let state = { gold: 50, inventory: [], currentScene: { options: [] } };
      const deps = makeDepsProxy({
        user: null,
        adventureImageDB: { getImage },
        get adventureState() { return state; },
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        t: (k) => k,
      });
      const handlers = window.AlloModules.HostHandlers(deps);

      const hydrated = await handlers.rehydrateHistoryWithImages(
        [{ type: 'scene', text: 'Turn 4', imageId: 'firestore_doc_id_xyz', imageTurn: 4, image: null }],
        []
      );

      expect(getImage).toHaveBeenCalledWith(4);
      expect(hydrated[0].image).toBe('data:image/png;base64,guest-scene-4');
    });

    it('unwraps object/string options cleanly in handleBroadcastOptions and skips blank entries', async () => {
      const callTTS = vi.fn(async (txt) => `audio://${txt}`);
      let state = {
        turnCount: 2,
        currentScene: { text: 'Harbor', options: [] },
        voiceMap: { Narrator: 'Leda' },
      };
      const deps = makeDepsProxy({
        editingOptionsBuffer: [{ action: 'Build raft', audio: 'stale' }, 'Swim across', { action: '   ' }],
        callTTS,
        get adventureState() { return state; },
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        t: (k) => k,
      });
      const handlers = window.AlloModules.HostHandlers(deps);

      await handlers.handleBroadcastOptions();

      expect(callTTS).toHaveBeenCalledTimes(2);
      expect(callTTS).toHaveBeenCalledWith('Build raft', 'Leda');
      expect(callTTS).toHaveBeenCalledWith('Swim across', 'Leda');
      expect(state.currentScene.options).toEqual([
        { action: 'Build raft', audio: 'audio://Build raft' },
        { action: 'Swim across', audio: 'audio://Swim across' },
      ]);
    });

    it('prevents negative gold races in handleShopPurchase and clears snapshot on rewind in handleUseItem', async () => {
      let state = {
        gold: 15,
        energy: 50,
        turnCount: 3,
        isLoading: false,
        inventory: [{ id: 0, name: 'Chrono Feather', effectType: 'hint' }],
      };
      const lastTurnSnapshot = {
        current: {
          gold: 25,
          energy: 90,
          turnCount: 2,
          inventory: [{ id: 0, name: 'Chrono Feather', effectType: 'hint' }],
        },
      };
      const lastReadTurnRef = { current: 3 };
      const deps = makeDepsProxy({
        lastTurnSnapshot,
        lastReadTurnRef,
        alloBotRef: { current: null },
        get adventureState() { return state; },
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        t: (k) => k,
      });
      const handlers = window.AlloModules.HostHandlers(deps);

      // Simulate stale read where gold looks high enough in closure but prev.gold is only 15
      state.gold = 30;
      const item = { id: 'potion', name: 'Potion', description: '+20 energy', cost: 20, effectType: 'energy', effectValue: 20, icon: '🧪' };
      handlers.handleShopPurchase(item);
      handlers.handleShopPurchase(item);
      expect(state.gold).toBe(10);
      expect(state.inventory.filter((i) => i.id !== 0)).toHaveLength(1);

      await handlers.handleUseItem({ id: 0, name: 'Chrono Feather', effectType: 'hint' });
      expect(state.turnCount).toBe(2);
      expect(lastTurnSnapshot.current).toBeNull();
      expect(lastReadTurnRef.current).toBe(2);
    });
  });

  describe('ExportBuilder Storybook popup fallback', () => {
    it('downloads HTML and shows info toast instead of failing when popup window is blocked', async () => {
      const blobs = new Map();
      const downloads = [];
      let serial = 0;
      class CaptureBlob {
        constructor(parts, options = {}) {
          this.content = parts.map(String).join('');
          this.type = options.type || '';
        }
      }
      globalThis.Blob = CaptureBlob;
      window.Blob = CaptureBlob;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
        const url = `blob:sb-${++serial}`;
        blobs.set(url, blob);
        return url;
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        downloads.push({ filename: this.download, blob: blobs.get(this.href) });
      });
      vi.spyOn(window, 'open').mockReturnValue(null);

      const live = {
        adventureState: {
          title: 'River Crossing',
          history: [{ type: 'scene', text: 'The current rushes forward.' }],
          currentScene: null,
          imageCache: {},
          level: 2,
        },
        sourceTopic: 'Rivers',
        selectedVoice: 'Kore',
        voiceSpeed: 1,
        currentUiLanguage: 'English',
        setShowStorybookExportModal: vi.fn(),
        setIsProcessing: vi.fn(),
        rehydrateHistoryWithImages: async (h) => h,
        parseMarkdownToHTML: (v) => `<p>${escapeXml(v)}</p>`,
        addToast: vi.fn(),
        t: (k) => k,
      };

      const api = window.AlloModules.createExport({
        liveRef: { current: live },
        warnLog: vi.fn(),
        debugLog: vi.fn(),
        escapeXml,
        generateUUID: () => '12345678-1234-1234-1234-123456789abc',
      });

      const ok = await api.handleExportStorybook({ includeImages: false });
      expect(ok).toBe(true);
      expect(downloads.some((d) => d.filename === 'river_crossing_storybook.html')).toBe(true);
      expect(live.addToast).toHaveBeenCalledWith(expect.any(String), 'info');
      expect(live.addToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
    });
  });
});
