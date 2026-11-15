import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[char]));

let React;
let createRoot;
let act;
let originalBlob;
let root;
let host;

const tFallback = () => '';

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  ({ act } = React);
  global.React = window.React = React;
  originalBlob = globalThis.Blob;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: tFallback });
  window.__alloHooks = { useFocusTrap: () => {} };
  loadAlloModule('adventure_session_handlers_module.js');
  loadAlloModule('adventure_handlers_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('adventure_module.js');
  loadAlloModule('view_adventure_module.js');
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('misc_handlers_module.js');
  loadAlloModule('view_storybook_export_modal_module.js');
  loadAlloModule('view_student_save_adventure_module.js');
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('export_module.js');
});

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
  }
  host?.remove();
  root = null;
  host = null;
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  delete window.getGlobalAudioContext;
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

function makeBaseAdventureState(overrides = {}) {
  return {
    lessonKey: 'lesson-a',
    currentScene: { text: 'The harbor stirs.', options: ['Inspect pier'], voices: {} },
    pendingChoice: 'Check tide gauge',
    history: [],
    stats: { successes: 1, failures: 0, partials: 0, decisions: 1, conceptsFound: ['Tides'] },
    energy: 100,
    xp: 20,
    xpToNextLevel: 150,
    level: 2,
    gold: 50,
    inventory: [{ id: 1, name: 'Herb', icon: '🌿', effectType: 'energy', effectValue: 20 }],
    systemResources: [],
    imageCache: [],
    climax: { isActive: false, masteryScore: 0, attempts: 0 },
    debatePhase: 'setup',
    debateMomentum: 50,
    turnCount: 2,
    activeXpMultiplier: 1,
    activeXpBoostTurns: 0,
    activeRollModifier: 0,
    activeGoldBuffTurns: 0,
    lastKeyItemTurn: 0,
    rollResult: { total: 14 },
    ...overrides,
  };
}

describe('Adventure Phase 2 Refinements', () => {
  describe('AdventureSessionHandlers', () => {
    it('removes only one matching stacked inventory item and toasts Lost item', () => {
      vi.useFakeTimers();
      const { handleDiceRollComplete } = window.AlloModules.AdventureSessionHandlers;
      let state = makeBaseAdventureState({
        inventory: [
          { id: 1, name: 'Herb', effectType: 'energy', effectValue: 20 },
          { id: 2, name: 'Herb', effectType: 'energy', effectValue: 20 },
          { id: 3, name: 'Compass', effectType: 'key_item' },
        ],
      });
      const addToast = vi.fn();
      const deps = makeDepsProxy({
        adventureState: state,
        pendingAdventureUpdate: {
          scene: { text: 'You cross the footbridge.', options: ['Continue'] },
          evaluation: 'Partial progress.',
          feedback: 'A herb was consumed.',
          xpAwarded: 15,
          xpChange: 15,
          energyChange: 0,
          goldAwarded: 0,
          inventoryUpdate: { remove: 'Herb' },
        },
        adventureChanceMode: false,
        adventureDifficulty: 'Normal',
        adventureInputMode: 'choice',
        adventureFreeResponseEnabled: false,
        adventureConsistentCharacters: false,
        isAdventureStoryMode: false,
        isSocialStoryMode: false,
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        addToast,
        t: (k) => k,
        alloBotRef: { current: null },
      });

      handleDiceRollComplete(deps);
      vi.runAllTimers();
      expect(state.inventory.filter((i) => i.name === 'Herb')).toHaveLength(1);
      expect(state.inventory).toHaveLength(2);
      expect(addToast).toHaveBeenCalledWith('Lost: Herb', 'error');
    });

    it('ignores late inventory pixel-art updates after lessonKey changes', async () => {
      vi.useFakeTimers();
      const { handleDiceRollComplete } = window.AlloModules.AdventureSessionHandlers;
      let resolveArt;
      const artPromise = new Promise((res) => { resolveArt = res; });
      let state = makeBaseAdventureState({ lessonKey: 'lesson-a', inventory: [] });
      const deps = makeDepsProxy({
        adventureState: state,
        pendingAdventureUpdate: {
          scene: { text: 'You find an astrolabe.', options: ['Use'] },
          evaluation: 'Sharp eye.',
          feedback: 'Found item.',
          xpAwarded: 10,
          xpChange: 10,
          energyChange: 0,
          goldAwarded: 0,
          inventoryUpdate: { add: [{ name: 'Astrolabe', effectType: 'key_item' }] },
        },
        adventureChanceMode: false,
        adventureDifficulty: 'Normal',
        adventureInputMode: 'choice',
        adventureFreeResponseEnabled: false,
        adventureConsistentCharacters: false,
        isAdventureStoryMode: false,
        isSocialStoryMode: false,
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        generatePixelArtItem: () => artPromise,
        t: (k) => k,
        alloBotRef: { current: null },
      });

      handleDiceRollComplete(deps);
      vi.runAllTimers();
      const addedId = state.inventory[0].id;
      state = { ...state, lessonKey: 'lesson-b', inventory: [{ id: addedId, name: 'Different Lesson Item', image: null }] };
      await act(async () => {
        resolveArt('data:image/png;base64,ABC');
        await artPromise;
      });
      expect(state.inventory[0].name).toBe('Different Lesson Item');
      expect(state.inventory[0].image).toBeNull();
    });

    it('preserves player progression/inventory and scales Hard climax failure penalty', () => {
      vi.useFakeTimers();
      const { handleDiceRollComplete } = window.AlloModules.AdventureSessionHandlers;
      let state = makeBaseAdventureState({
        energy: 100,
        level: 4,
        xp: 75,
        climax: { isActive: true, archetype: 'Catastrophe', masteryScore: 15, attempts: 2 },
        inventory: [{ id: 9, name: 'Seawall Key', effectType: 'key_item' }],
      });
      const deps = makeDepsProxy({
        adventureState: state,
        pendingAdventureUpdate: {
          scene: { text: 'The surge overwhelms the gate.', options: ['Regroup'] },
          evaluation: 'Setback.',
          feedback: 'Dam breached.',
          masteryScore: 0,
          outcomeType: 'failure',
          xpAwarded: 0,
          xpChange: 0,
          energyChange: 0,
          goldAwarded: 0,
        },
        adventureChanceMode: false,
        adventureDifficulty: 'Hard',
        adventureInputMode: 'choice',
        adventureFreeResponseEnabled: false,
        adventureConsistentCharacters: false,
        isAdventureStoryMode: false,
        isSocialStoryMode: false,
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        t: (k) => k,
        alloBotRef: { current: null },
      });

      handleDiceRollComplete(deps);
      vi.runAllTimers();
      expect(state.energy).toBe(70);
      expect(state.level).toBe(4);
      expect(state.inventory).toHaveLength(1);
      expect(state.inventory[0].name).toBe('Seawall Key');
    });
  });

  describe('AdventureHandlers', () => {
    it('restores activeRollModifier on handleResumeAdventure and defaults invalid values to 0', async () => {
      const { handleResumeAdventure } = window.AlloModules.AdventureHandlers;
      let state = makeBaseAdventureState({ currentScene: null, turnCount: 0 });
      const runResume = async (savedRollMod) => {
        const deps = makeDepsProxy({
          adventureState: state,
          history: [],
          inputText: '',
          isTeacherMode: true,
          storageDB: {
            get: vi.fn().mockResolvedValue({
              currentScene: { text: 'Saved scene', options: ['Next'] },
              turnCount: 3,
              level: 2,
              xp: 50,
              energy: 80,
              gold: 40,
              activeRollModifier: savedRollMod,
            }),
          },
          adventureImageDB: { getImage: vi.fn().mockResolvedValue(null) },
          lastTurnSnapshot: { current: null },
          lastReadTurnRef: { current: 0 },
          setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
          t: (k) => k,
        });
        await handleResumeAdventure(deps);
      };

      await runResume(4);
      expect(state.activeRollModifier).toBe(4);
      state = makeBaseAdventureState({ currentScene: null, turnCount: 0 });
      await runResume('bad');
      expect(state.activeRollModifier).toBe(0);
    });

    it('blocks submit, choice, and guiding hand when showDice or pendingAdventureUpdate is active', async () => {
      const { handleAdventureTextSubmit, handleAdventureChoice, handleGuidingHand } = window.AlloModules.AdventureHandlers;
      const callGemini = vi.fn();
      const setAdventureState = vi.fn();
      const depsDice = makeDepsProxy({
        adventureState: makeBaseAdventureState({ isLoading: false }),
        adventureTextInput: 'Check salinity',
        isTeacherMode: true,
        showDice: true,
        pendingAdventureUpdate: null,
        callGemini,
        setAdventureState,
        t: (k) => k,
      });
      await handleAdventureTextSubmit(null, depsDice);
      await handleAdventureChoice('Inspect pier', depsDice);
      const ghDice = await handleGuidingHand({ id: 7, name: 'Guide', effectType: 'story_assist' }, depsDice);
      expect(ghDice).toBe(false);
      expect(callGemini).not.toHaveBeenCalled();
      expect(setAdventureState).not.toHaveBeenCalled();

      const depsPending = makeDepsProxy({
        adventureState: makeBaseAdventureState({ isLoading: false }),
        adventureTextInput: 'Check salinity',
        isTeacherMode: true,
        showDice: false,
        pendingAdventureUpdate: { scene: { text: 'Pending' } },
        callGemini,
        setAdventureState,
        t: (k) => k,
      });
      await handleAdventureTextSubmit(null, depsPending);
      await handleAdventureChoice('Inspect pier', depsPending);
      const ghPending = await handleGuidingHand({ id: 7, name: 'Guide', effectType: 'story_assist' }, depsPending);
      expect(ghPending).toBe(false);
      expect(callGemini).not.toHaveBeenCalled();
    });
  });

  describe('HostHandlers', () => {
    it('guards handleBroadcastOptions missing currentScene and reuses unchanged option audio with language hint', async () => {
      const emptyHandlers = window.AlloModules.HostHandlers(makeDepsProxy({
        adventureState: { currentScene: null },
        addToast: vi.fn(),
        t: (k) => k,
      }));
      await emptyHandlers.handleBroadcastOptions();

      let state = makeBaseAdventureState({
        currentScene: {
          text: 'Scene',
          options: [{ action: 'Unchanged option', audio: 'data:audio/mp3;base64,OLD' }],
        },
        voiceMap: { Narrator: 'Kore' },
      });
      const callTTS = vi.fn().mockResolvedValue('data:audio/mp3;base64,NEW');
      const handlers = window.AlloModules.HostHandlers(makeDepsProxy({
        get adventureState() { return state; },
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        editingOptionsBuffer: ['Unchanged option', 'Nueva opcion'],
        adventureLanguageMode: 'Spanish',
        selectedVoice: 'Kore',
        callTTS,
        activeSessionCode: null,
        t: (k) => k,
      }));

      await handlers.handleBroadcastOptions();
      expect(callTTS).toHaveBeenCalledTimes(1);
      expect(callTTS).toHaveBeenCalledWith('Nueva opcion', 'Kore', 1, { language: 'Spanish' });
      expect(state.currentScene.options[0].audio).toBe('data:audio/mp3;base64,OLD');
      expect(state.currentScene.options[1].audio).toBe('data:audio/mp3;base64,NEW');
    });

    it('guards handleUseItem full energy, duplicate XP boost, non-chance modifier, and rewind cleanup', async () => {
      let state = makeBaseAdventureState({
        energy: 100,
        activeXpMultiplier: 2,
        inventory: [
          { id: 1, name: 'Ration', effectType: 'energy', effectValue: 20 },
          { id: 2, name: 'Journal', effectType: 'xp_boost', effectValue: 2 },
          { id: 3, name: 'Charm', effectType: 'modifier', effectValue: 5 },
          { id: 4, name: 'Feather', effectType: 'hint' },
        ],
      });
      const setPendingAdventureUpdate = vi.fn();
      const setShowDice = vi.fn();
      const setFailedAdventureAction = vi.fn();
      const handlers = window.AlloModules.HostHandlers(makeDepsProxy({
        get adventureState() { return state; },
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        adventureChanceMode: false,
        pendingAdventureUpdate: null,
        showDice: false,
        setPendingAdventureUpdate,
        setShowDice,
        setFailedAdventureAction,
        lastTurnSnapshot: { current: { ...state, turnCount: 1, imagePolishStage: 'polishing', loadingStage: 'wait' } },
        lastReadTurnRef: { current: 2 },
        alloBotRef: { current: null },
        t: (k) => k,
      }));

      await handlers.handleUseItem(state.inventory[0]);
      await handlers.handleUseItem(state.inventory[1]);
      await handlers.handleUseItem(state.inventory[2]);
      expect(state.inventory).toHaveLength(4);

      await handlers.handleUseItem(state.inventory[3]);
      expect(setPendingAdventureUpdate).toHaveBeenCalledWith(null);
      expect(setShowDice).toHaveBeenCalledWith(false);
      expect(setFailedAdventureAction).toHaveBeenCalledWith(null);
      expect(state.turnCount).toBe(1);
      expect(state.loadingStage).toBeNull();
      expect(state.imagePolishStage).toBeNull();
    });

    it('clears transient UI flags and resets turnCount to 0 on crash recovery without snapshot', () => {
      let state = makeBaseAdventureState({ turnCount: 5, loadingStage: 'working', imagePolishStage: 'polishing' });
      const setPendingAdventureUpdate = vi.fn();
      const setShowDice = vi.fn();
      const setFailedAdventureAction = vi.fn();
      const handlers = window.AlloModules.HostHandlers(makeDepsProxy({
        get adventureState() { return state; },
        setAdventureState: (u) => { state = typeof u === 'function' ? u(state) : u; },
        lastTurnSnapshot: { current: null },
        setPendingAdventureUpdate,
        setShowDice,
        setFailedAdventureAction,
        t: (k) => k,
      }));

      handlers.handleAdventureCrashRecovery();
      expect(setPendingAdventureUpdate).toHaveBeenCalledWith(null);
      expect(setShowDice).toHaveBeenCalledWith(false);
      expect(setFailedAdventureAction).toHaveBeenCalledWith(null);
      expect(state.turnCount).toBe(0);
      expect(state.currentScene).toBeNull();
      expect(state.loadingStage).toBeNull();
      expect(state.imagePolishStage).toBeNull();
    });
  });

  describe('AdventureModule UI & Audio', () => {
    it('MissionReportCard shows cumulative XP across levels and dedupes concepts', async () => {
      const { MissionReportCard } = window.AlloModules;
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root.render(React.createElement(MissionReportCard, {
          adventureState: {
            level: 3,
            xp: 40,
            climax: { masteryScore: 92 },
            stats: { successes: 4, failures: 0, partials: 1, decisions: 5, conceptsFound: ['Osmosis', 'Osmosis', ' Membrane '] },
          },
          onClose: vi.fn(),
          onExport: vi.fn(),
          onContinue: vi.fn(),
          onNewGame: vi.fn(),
        }));
      });
      expect(host.textContent).toContain('290');
      expect(host.textContent.match(/Osmosis/g)).toHaveLength(1);
    });

    it('AdventureShop enforces disabled rules and shifts focus to close button when disabled on purchase', async () => {
      const { AdventureShop } = window.AlloModules;
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      let gold = 50;
      const rerender = async () => {
        await act(async () => {
          root.render(React.createElement(AdventureShop, {
            gold,
            energy: 100,
            inventory: [{ id: 'ration', name: 'Emergency Ration' }],
            chanceMode: false,
            activeXpBoost: 2,
            onClose: vi.fn(),
            onPurchase: (item) => { gold -= item.cost; },
          }));
        });
      };
      await rerender();
      const buttons = Array.from(host.querySelectorAll('button'));
      expect(buttons.some((b) => b.disabled && /Chance mode off/i.test(b.textContent))).toBe(true);
      expect(buttons.some((b) => b.disabled && /Energy full/i.test(b.textContent))).toBe(true);
      expect(buttons.some((b) => b.disabled && /Boost active/i.test(b.textContent))).toBe(true);
      const detectorBtn = buttons.find((b) => !b.disabled && !b.getAttribute('aria-label'));
      expect(detectorBtn).toBeTruthy();
      await act(async () => {
        detectorBtn.focus();
        detectorBtn.click();
      });
      await rerender();
      const closeBtn = host.querySelector('button[aria-label]');
      expect(document.activeElement).toBe(closeBtn);
    });

    it('DiceOverlay fires onComplete once and disables transition under reduced motion', async () => {
      vi.useFakeTimers();
      window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true }));
      const { DiceOverlay } = window.AlloModules;
      const onComplete = vi.fn();
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root.render(React.createElement(DiceOverlay, {
          result: 18,
          onComplete,
        }));
      });
      expect(host.innerHTML).toContain('transition: none');
      const skipBtn = Array.from(host.querySelectorAll('button')).find((b) => /Skip|Continue/i.test(b.textContent || ''));
      if (skipBtn) {
        await act(async () => { skipBtn.click(); });
      }
      await act(async () => { vi.runAllTimers(); });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('AdventureOffline & AdventureEpisodeSettings', () => {
    it('strips unsafe sceneImage protocols, warns on self loops, and resets Player path when story changes', async () => {
      const Offline = window.AlloModules.AdventureOffline;
      const normalized = Offline.normalize({
        title: 'Bay Walk',
        start: 's1',
        scenes: [
          { id: 's1', text: 'Intro', sceneImage: 'javascript:alert(1)', choices: [{ label: 'Loop', to: 's1' }, { label: 'End', to: 's2' }] },
          { id: 's2', text: 'Done', sceneImage: 'https://example.org/bay.png', ending: true, choices: [] },
        ],
      });
      expect(normalized.scenes[0].sceneImage).toBeUndefined();
      expect(normalized.scenes[1].sceneImage).toBe('https://example.org/bay.png');
      const report = Offline.validate(normalized);
      expect(report.warnings.some((w) => w.code === 'self_loop')).toBe(true);

      const storyA = { version: 1, title: 'Story A', start: 'a1', scenes: [{ id: 'a1', text: 'Alpha scene', choices: [{ label: 'Go A2', to: 'a2' }] }, { id: 'a2', text: 'Alpha two', ending: true, choices: [] }] };
      const storyB = { version: 1, title: 'Story B', start: 'b1', scenes: [{ id: 'b1', text: 'Beta scene', ending: true, choices: [] }] };
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root.render(React.createElement(Offline.Player, { story: storyA, t: tFallback }));
      });
      const choiceBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Go A2'));
      await act(async () => { choiceBtn.click(); });
      expect(host.textContent).toContain('Alpha two');
      await act(async () => {
        root.render(React.createElement(Offline.Player, { story: storyB, t: tFallback }));
      });
      expect(host.textContent).toContain('Beta scene');
    });

    it('allows clearing and typing fractional system resource quantities before clamping on blur', async () => {
      const { AdventureSetupFields } = window.AlloModules;
      let advState = makeBaseAdventureState({
        systemResources: [{ name: 'Budget', icon: '💧', quantity: 50, unit: '%', type: 'strategic' }],
      });
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      const renderSettings = async () => {
        await act(async () => {
          root.render(React.createElement(AdventureSetupFields, {
            isTeacherMode: true,
            adventureInputMode: 'system',
            enableFactionResources: true,
            factionResourceMode: 'manual',
            adventureState: advState,
            setAdventureState: (u) => { advState = typeof u === 'function' ? u(advState) : u; },
            t: tFallback,
          }));
        });
      };
      await renderSettings();
      const qtyInput = host.querySelector('input[type="number"][id$="-resource-0-quantity"]');
      expect(qtyInput).toBeTruthy();
      const setNativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      await act(async () => {
        qtyInput.focus();
        setNativeValue.call(qtyInput, '');
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(qtyInput.value).toBe('');
      await act(async () => {
        setNativeValue.call(qtyInput, '150');
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => {
        qtyInput.blur();
      });
      expect(advState.systemResources[0].quantity).toBeLessThanOrEqual(100);
    });
  });

  describe('Modal focus & view_adventure_source contracts', () => {
    it('StorybookExportModal moves focus to Stop export on busy and keeps narration checkbox first', async () => {
      const { StorybookExportModal } = window.AlloModules.StorybookExportModal;
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root.render(React.createElement(StorybookExportModal, {
          handleExportStorybook: () => new Promise(() => {}),
          handleSetShowStorybookExportModalToFalse: vi.fn(),
          isProcessing: false,
          setShowStorybookExportModal: vi.fn(),
          t: (k) => k,
        }));
      });
      const dialog = host.querySelector('[role="dialog"]');
      const firstInteractive = dialog.querySelector('input, button');
      expect(firstInteractive.id).toBe('storybook-include-narration');
      const textOnlyBtn = dialog.querySelector('[data-help-key="export_storybook_text"]');
      expect(textOnlyBtn).toBeTruthy();
      await act(async () => {
        textOnlyBtn.click();
      });
      expect(document.activeElement.textContent).toContain('Stop export');
    });

    it('view_adventure_source enforces Phase 2 prose tables, nested click guard, P2P card, sequel gating, and fluency props', () => {
      const viewSrc = readFileSync('view_adventure_source.jsx', 'utf8');
      expect(viewSrc.match(/const isTable = para\.trim\(\)\.startsWith\('\|'\) \|\| para\.includes\('\\n\|'\);/g)).toHaveLength(2);
      expect(viewSrc.match(/e\.target !== e\.currentTarget && e\.target\?\.closest\?\.\('button, a, \[role="button"\]'\)/g)).toHaveLength(4);
      expect(viewSrc).toContain('openAdventureActionVote');
      expect(viewSrc).toContain('adventureState.canStartSequel && (isTeacherMode || !activeSessionCode) && !soloStudentAiOff');
      expect(viewSrc).toContain('theme={theme}');
      const avSrc = viewSrc.slice(viewSrc.indexOf('function AdventureView'));
      expect((avSrc.match(/role="progressbar"/g) || []).length).toBe(5);
    });
  });

  describe('PhaseKHelpers, MiscHandlers, ExportBuilder, and AlloFlowANTI wiring', () => {
    it('MiscHandlers.handleRestoreView restores snapshot buffs/cast and clears loading stages', () => {
      const { handleRestoreView } = window.AlloModules.MiscHandlers;
      let restoredState = null;
      const item = {
        type: 'adventure',
        id: 'adv-1',
        data: {
          snapshot: {
            currentScene: { text: 'Restored scene', options: [] },
            level: 3,
            xp: 45,
            energy: 90,
            gold: 30,
            turnCount: 4,
            characters: [{ id: 'c1', name: 'Nora' }],
            isCastConfirmed: true,
            protagonistAge: '11-13',
            activeRollModifier: 5,
            activeXpMultiplier: 2,
            activeXpBoostTurns: 3,
            activeGoldBuffTurns: 2,
            isGameOver: true,
          },
        },
      };
      const setAdventureState = (updater) => {
        restoredState = updater(makeBaseAdventureState({ loadingStage: 'Loading...', imagePolishStage: 'Polishing...' }));
      };
      handleRestoreView(item, { suppressLiveFollow: true }, makeDepsProxy({
        setAdventureState,
        t: (k) => k,
      }));
      expect(restoredState.activeRollModifier).toBe(5);
      expect(restoredState.activeXpMultiplier).toBe(2);
      expect(restoredState.activeGoldBuffTurns).toBe(2);
      expect(restoredState.characters[0].name).toBe('Nora');
      expect(restoredState.loadingStage).toBeNull();
      expect(restoredState.imagePolishStage).toBeNull();
    });

    it('ExportBuilder exports clean Storybook HTML with deduped final scene, negative XP stripped, safe alt, and reader toolbar', async () => {
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
        const url = `blob:p2-${++serial}`;
        blobs.set(url, blob);
        return url;
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        downloads.push({ filename: this.download, blob: blobs.get(this.href) });
      });
      vi.spyOn(window, 'open').mockReturnValue(null);

      const finalSceneText = 'At dawn the lighthouse lantern ignites.';
      const live = {
        adventureState: {
          title: 'Harbor Signal',
          history: [
            { type: 'scene', title: 'Dockside', text: 'Waves pound the rocks.', image: 'data:image/png;base64,iVBORw0KGgo=' },
            { type: 'feedback', text: '**Bold catch!** (-10 XP, energy -5)' },
            { type: 'scene', title: 'Beacon', text: finalSceneText },
          ],
          currentScene: { title: 'Beacon', text: finalSceneText },
          imageCache: { 'img-1': 'data:image/png;base64,iVBORw0KGgo=' },
          level: 2,
        },
        sourceTopic: 'Harbors',
        selectedVoice: 'Kore',
        voiceSpeed: 1,
        currentUiLanguage: 'English',
        setShowStorybookExportModal: vi.fn(),
        setIsProcessing: vi.fn(),
        rehydrateHistoryWithImages: async (h) => h,
        parseMarkdownToHTML: (v) => `<p>${v.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`,
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

      const ok = await api.handleExportStorybook({ includeImages: true });
      expect(ok).toBe(true);
      const html = downloads.find((d) => d.filename.endsWith('.html')).blob.content;
      expect(html).not.toContain('-10 XP');
      expect(html.match(/At dawn the lighthouse lantern ignites\./g)).toHaveLength(1);
      expect(html).toContain('<strong>Bold catch!</strong>');
      expect(html).toContain('alt="');
      expect(html).toContain('illustration"');
      expect(html).toContain('Play all');
      expect(html).toContain('@media (max-width: 640px)');
    });

    it('AlloFlowANTI wires showcase response into immersive choices and preserves adventure poll preset on close', () => {
      const hostSrc = readFileSync('AlloFlowANTI.txt', 'utf8');
      expect(hostSrc).toContain("onUsePeerShowcaseResponse: livePollPreset && livePollPreset.source === 'adventure-free-response'");
      expect(hostSrc).toContain('setAdventureTextInput(action);');
      expect(hostSrc).toContain('setImmersiveShowChoices(true);');
      expect(hostSrc).toContain("prev && prev.source === 'adventure-free-response'");
    });
  });
});
