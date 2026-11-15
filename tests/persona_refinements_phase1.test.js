import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));

const viewChatSource = readFileSync('view_persona_chat_source.jsx', 'utf8');
const chatPropNames = [...new Set([...viewChatSource.matchAll(/var \w+ = props\.(\w+)/g)].map(m => m[1]))];
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, params = {}) => {
  const val = key.split('.').reduce((obj, part) => obj?.[part], strings);
  return typeof val === 'string' ? val.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : undefined;
};

let CharacterColumn;
let PersonaChatView;
let PersonaWorkspaceView;
let HostHandlers;
let PhaseKHelpers;
let ArtifactRuntime;
let root;
let host;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.React = window.React = React;
  window.AlloLanguageContext = React.createContext({ t: translate });
  window.AlloModules = window.AlloModules || {};
  loadAlloModule('persona_ui_module.js');
  loadAlloModule('view_persona_chat_module.js');
  loadAlloModule('view_persona_workspace_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('persona_session_artifact_module.js');

  CharacterColumn = window.AlloModules.CharacterColumn;
  PersonaChatView = window.AlloModules.PersonaChatView;
  PersonaWorkspaceView = window.AlloModules.PersonaWorkspace.PersonaWorkspaceView;
  HostHandlers = window.AlloModules.HostHandlers;
  PhaseKHelpers = window.AlloModules.PhaseKHelpers;
  ArtifactRuntime = window.AlloModules.PersonaSessionArtifact;
});

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  host?.remove();
  host = null;
  delete window.callGeminiImageEdit;
  delete window.__alloAiUsable;
  delete window.__alloStudentAiDisabled;
  delete window.__alloAiSecretsLocked;
  delete window.alloDeviceStorage;
  vi.restoreAllMocks();
});

function createPersonasHarness({
  state: initialState,
  resource,
  callGemini = vi.fn().mockResolvedValue('{}'),
  callImagen = vi.fn().mockResolvedValue(null),
  callGeminiImageEdit = vi.fn().mockResolvedValue(null),
  isPersonaFreeResponse = true,
} = {}) {
  const windowObj = {
    AlloModules: {},
    callGemini,
    callGeminiImageEdit,
    URL,
  };
  const personaCode = readFileSync('personas_source.jsx', 'utf8');
  vm.runInNewContext(personaCode, {
    window: windowObj,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Promise,
    Set,
    Map,
    AbortController,
    URL,
  });

  let state = initialState;
  let generated = resource;
  let history = resource ? [resource] : [];
  let personaInput = '';
  const toasts = [];
  const scoreUpdates = [];
  const liveRef = { current: {} };
  const sync = () => Object.assign(liveRef.current, {
    personaState: state,
    generatedContent: generated,
    history,
    personaInput,
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
  const setPersonaInput = (next) => {
    personaInput = typeof next === 'function' ? next(personaInput) : next;
    sync();
  };
  const noop = vi.fn();

  Object.assign(liveRef.current, {
    personaState: state,
    generatedContent: generated,
    history,
    personaInput,
    inputText: 'Lesson evidence text on early computing.',
    sourceTopic: 'Computing history',
    gradeLevel: '8th Grade',
    personaCustomInstructions: '',
    leveledTextLanguage: 'English',
    selectedLanguages: ['English'],
    currentUiLanguage: 'English',
    isPersonaFreeResponse,
    callGemini,
    callImagen,
    setPersonaState,
    setGeneratedContent,
    setHistory,
    setPersonaInput,
    setIsGeneratingPersona: noop,
    setPersonaReflectionInput: noop,
    setReflectionFeedback: noop,
    setIsPersonaDefining: noop,
    setIsGradingReflection: noop,
    setIsGeneratingReflectionPrompt: noop,
    setPanelTtsPending: noop,
    setShowPersonaHints: noop,
    setPersonaTurnHintsViewed: noop,
    setIsPersonaReflectionOpen: noop,
    setPlayingContentId: noop,
    setPlaybackState: noop,
    setIsPersonaChatOpen: noop,
    setIsProcessing: noop,
    setPersonaAutoRead: noop,
    stopPlayback: noop,
    lastReadPersonaIndexRef: { current: -1 },
    personaDefinitionCache: { current: new Map() },
    addToast: (...args) => toasts.push(args),
    t: translate,
    resilientJsonParse: async (text) => JSON.parse(text),
    handleScoreUpdate: (...args) => scoreUpdates.push(args),
    playSound: noop,
    handleAiSafetyFlag: noop,
    apiKey: 'test-key',
    personaTurnHintsViewed: false,
    showPersonaHintsRef: { current: false },
  });
  sync();

  const api = windowObj.AlloModules.createPersonas({
    liveRef,
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    cleanJson: (text) => text,
    safeJsonParse: JSON.parse,
    fisherYatesShuffle: (items) => items,
    SafetyContentChecker: { check: () => [], aiCheck: vi.fn() },
  });

  return {
    api,
    liveRef,
    toasts,
    scoreUpdates,
    callGeminiImageEdit,
    get state() { return state; },
  };
}

function renderElement(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  return act(async () => { root.render(element); });
}

function buildChatProps(overrides = {}) {
  const people = [
    { name: 'Ada Lovelace', year: '1843', role: 'Mathematician', context: 'Computing', rapport: 45, quests: [{ id: 1, text: 'Ask about Bernoulli numbers', difficulty: 20, isCompleted: false }, { id: 2, text: 'Secret engine note', difficulty: 90, isCompleted: false }] },
    { name: 'Grace Hopper', year: '1952', role: 'Computer scientist', context: 'Compilers', rapport: 60, quests: [{ id: 3, text: 'Ask about debugging', difficulty: 20, isCompleted: true }] },
  ];
  const props = {};
  for (const name of chatPropNames) {
    props[name] = /^(handle|set|generate|stop|on[A-Z])/.test(name)
      ? vi.fn()
      : /Ref$/.test(name)
        ? React.createRef()
        : false;
  }
  Object.assign(props, {
    t: translate,
    appId: 'refinement-app',
    studentNickname: 'learner',
    theme: 'light',
    isTeacherMode: false,
    ErrorBoundary: ({ children }) => children,
    CharacterColumn,
    HarmonyMeter: () => null,
    studentProjectSettings: { allowPersonaFreeResponse: true },
    generatedContent: { id: 'res-1', type: 'persona', data: people },
    personaState: {
      mode: 'single',
      selectedCharacter: people[0],
      selectedCharacters: people,
      chatHistory: [{ role: 'model', text: 'Welcome to the study.', speakerName: 'Ada Lovelace' }],
      suggestions: [{ text: 'First question?' }, { text: 'Second question?' }],
      panelSuggestions: [],
      earnedBadges: [],
      isLoading: false,
    },
    personaInput: '',
    isPersonaFreeResponse: true,
    showPersonaHints: true,
    playbackState: {},
    panelTtsPending: [],
    personaReflectionInput: '',
    formatInteractiveText: (text) => text,
    splitTextToSentences: (text) => [text],
    extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
    ...overrides,
  });
  return props;
}

describe('Persona Interview Mode Phase 1 refinements', () => {
  describe('1. Portrait base64 extraction, quest coercion, and MC initial follow-ups', () => {
    it('skips image editing for https/blob avatars while cleaning whitespace in data URL base64', async () => {
      const httpsEdit = vi.fn();
      const h1 = createPersonasHarness({
        callImagen: vi.fn().mockResolvedValue('https://example.com/avatar.png'),
        callGeminiImageEdit: httpsEdit,
        state: { mode: 'single', selectedCharacter: { name: 'Ada', visualDescription: 'Portrait' }, selectedCharacters: [], avatarUrl: 'https://example.com/avatar.png', chatHistory: [], earnedBadges: [] },
      });
      await expect(h1.api.generateCharacterPortrait('Portrait', 'Oil')).resolves.toBe('https://example.com/avatar.png');
      await h1.api.updatePersonaReaction('smiling warmly');
      expect(httpsEdit).not.toHaveBeenCalled();
      expect(h1.state.isImageLoading).toBeFalsy();

      const blobEdit = vi.fn();
      const h2 = createPersonasHarness({
        callImagen: vi.fn().mockResolvedValue('blob:https://example.com/abc-123'),
        callGeminiImageEdit: blobEdit,
        state: { mode: 'panel', selectedCharacters: [{ name: 'Ada', avatarUrl: 'blob:https://example.com/abc-123' }], chatHistory: [], earnedBadges: [] },
      });
      await expect(h2.api.generateCharacterPortrait('Portrait', 'Oil')).resolves.toBe('blob:https://example.com/abc-123');
      await h2.api.updatePanelCharacterReaction(0, 'nodding');
      expect(blobEdit).not.toHaveBeenCalled();
      expect(h2.state.selectedCharacters[0].isUpdating).toBeFalsy();

      const dataEdit = vi.fn().mockResolvedValue('data:image/png;base64,REFINED');
      const h3 = createPersonasHarness({
        callImagen: vi.fn().mockResolvedValue('data:image/png;base64,QUJD\nREVG'),
        callGeminiImageEdit: dataEdit,
        state: { mode: 'single', selectedCharacter: { name: 'Ada', visualDescription: 'Portrait' }, selectedCharacters: [], avatarUrl: 'data:image/png;base64,QUJD\nREVG', chatHistory: [], earnedBadges: [] },
      });
      await expect(h3.api.generateCharacterPortrait('Portrait', 'Oil')).resolves.toBe('data:image/png;base64,REFINED');
      expect(dataEdit).toHaveBeenCalledWith(expect.any(String), 'QUJDREVG', 400, 0.9);
      await h3.api.updatePersonaReaction('holding notes');
      expect(dataEdit).toHaveBeenLastCalledWith(expect.any(String), 'QUJDREVG', 400, 0.85);
    });

    it('marks numeric single-mode quest IDs complete (including 0 and 1) and emits named unlock toast', async () => {
      const char = {
        name: 'Ada',
        role: 'Mathematician',
        year: '1843',
        rapport: 40,
        accumulatedXP: 0,
        quests: [
          { id: 0, text: 'Zero index secret', difficulty: 10, isCompleted: false },
          { id: 1, text: 'Hidden notebook secret', difficulty: 20, isCompleted: false },
        ],
        suggestedQuestions: [],
      };
      const callGemini = vi.fn()
        .mockResolvedValueOnce(JSON.stringify({ response: 'Look at the first margin note.', rapportChange: 5, completedQuestId: '1' }))
        .mockResolvedValueOnce(JSON.stringify({ questions: ['Follow up?'] }))
        .mockResolvedValueOnce(JSON.stringify({ response: 'And check the zero note too.', rapportChange: 5, completedQuestId: '0' }))
        .mockResolvedValueOnce(JSON.stringify({ questions: ['Another follow up?'] }));

      const h = createPersonasHarness({
        resource: { id: 'res-quests', type: 'persona', data: [char], config: {} },
        state: { mode: 'single', selectedCharacter: char, selectedCharacters: [], chatHistory: [{ role: 'model', text: 'Hello' }], suggestions: [], panelSuggestions: [], earnedBadges: [], isLoading: false },
        callGemini,
      });

      await h.api.handlePersonaChatSubmit('Tell me about your hidden notebook.', true);
      expect(h.state.selectedCharacter.quests.find(q => q.id === 1).isCompleted).toBe(true);
      expect(h.toasts.some(([msg]) => msg.includes('Hidden notebook secret'))).toBe(true);

      await h.api.handlePersonaChatSubmit('What about the zero index note?', true);
      expect(h.state.selectedCharacter.quests.find(q => q.id === 0).isCompleted).toBe(true);
      expect(h.toasts.some(([msg]) => msg.includes('Zero index secret'))).toBe(true);
    });

    it('requests 6 follow-up options when opening directly in Multiple Choice mode with 0 questions', async () => {
      const callGemini = vi.fn().mockResolvedValue(JSON.stringify({ questions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'] }));
      const char = {
        name: 'Ada',
        role: 'Mathematician',
        year: '1843',
        context: 'Computing',
        avatarUrl: 'https://example.com/ada.png',
        quests: [],
        suggestedQuestions: [],
      };
      const h = createPersonasHarness({
        resource: { id: 'res-mc', type: 'persona', data: [char], config: {} },
        state: { mode: 'single', selectedCharacter: null, selectedCharacters: [], chatHistory: [], suggestions: [], panelSuggestions: [], earnedBadges: [], isLoading: false },
        callGemini,
        isPersonaFreeResponse: false,
      });

      await h.api.handleSelectPersona(char);
      expect(callGemini).toHaveBeenCalled();
      expect(callGemini.mock.calls[0][0]).toContain('Generate exactly 6 things the student could say next');
    });
  });

  describe('2. Avatar URL sanitization parity & Panel/Single accessibility labels', () => {
    it('accepts >300KB data:image PNG portraits in PersonaChatView & CharacterColumn while rejecting unsafe schemes', async () => {
      const largeBase64 = 'A'.repeat(399900);
      const largePortrait = `data:image/png;base64,${largeBase64.slice(0, 100)}\n${largeBase64.slice(100)}`;

      await renderElement(
        React.createElement(CharacterColumn, {
          side: 'left',
          character: {
            name: 'Ada Lovelace',
            role: 'Mathematician',
            avatarUrl: largePortrait,
            rapport: 55,
            accumulatedXP: 120,
            quests: [
              { id: '1', text: 'Completed quest item', difficulty: 10, isCompleted: true },
              { id: '2', text: 'Locked quest item', difficulty: 90, isCompleted: false },
            ],
          },
        })
      );

      const img = host.querySelector('img[alt="Ada Lovelace"]');
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe(largePortrait);
      expect(host.querySelector('[role="progressbar"][aria-label="Rapport: Ada Lovelace"]')).not.toBeNull();
      const srTexts = [...host.querySelectorAll('.sr-only')].map(el => el.textContent.trim());
      expect(srTexts.some(txt => txt.startsWith('Completed:'))).toBe(true);
      expect(srTexts.some(txt => txt.startsWith('Locked:'))).toBe(true);

      await act(async () => { root.unmount(); });
      host.remove();

      await renderElement(
        React.createElement('div', null,
          React.createElement(CharacterColumn, {
            side: 'left',
            character: { name: 'BadJS', avatarUrl: 'javascript:alert(1)', quests: [] },
          }),
          React.createElement(CharacterColumn, {
            side: 'right',
            character: { name: 'BadHTTP', avatarUrl: 'http://insecure.example/a.png', quests: [] },
          })
        )
      );
      expect(host.querySelector('img[alt="BadJS"]')).toBeNull();
      expect(host.querySelector('img[alt="BadHTTP"]')).toBeNull();

      await act(async () => { root.unmount(); });
      host.remove();

      const props = buildChatProps();
      props.personaState.selectedCharacter = { ...props.personaState.selectedCharacter, avatarUrl: largePortrait };
      props.personaState.avatarUrl = largePortrait;
      await renderElement(React.createElement(PersonaChatView, props));
      expect(host.querySelectorAll('img[alt="Ada Lovelace"]').length).toBeGreaterThan(0);

      await act(async () => { root.unmount(); });
      host.remove();

      const panelProps = buildChatProps();
      panelProps.personaState.mode = 'panel';
      await renderElement(React.createElement(PersonaChatView, panelProps));
      expect(host.querySelector('details [role="progressbar"][aria-label="Rapport: Ada Lovelace"]')).not.toBeNull();
      const panelSr = [...host.querySelectorAll('details .sr-only')].map(el => el.textContent.trim());
      expect(panelSr.some(txt => txt.startsWith('Locked:'))).toBe(true);
      expect(panelSr.some(txt => txt.startsWith('Completed:'))).toBe(true);
    });
  });

  describe('3. Workspace card selection vs nested Edit button', () => {
    it('selects persona on card click in single mode while keeping nested Edit button independent', async () => {
      const ada = { name: 'Ada', year: '1843', role: 'Mathematician', context: 'Computing' };
      const Icon = () => React.createElement('span', { 'aria-hidden': true });
      const handleSelectPersona = vi.fn();
      const openPersonaTeacherEditor = vi.fn();

      await renderElement(
        React.createElement(PersonaWorkspaceView, {
          ErrorBoundary: ({ children }) => children,
          t: (k) => translate(k) || k,
          isProcessing: false,
          isGeneratingPersona: false,
          History: Icon,
          Sparkles: Icon,
          MessageCircleQuestion: Icon,
          CheckCircle2: Icon,
          Plus: Icon,
          RefreshCw: Icon,
          Users: Icon,
          personaState: { mode: 'single', selectedCharacters: [] },
          setPersonaState: vi.fn(),
          isTeacherMode: true,
          normalizePersonaResumeDays: () => 14,
          clearPersonaResumeSnapshots: vi.fn(),
          addToast: vi.fn(),
          generatedContent: { id: 'res-ws', type: 'persona', data: [ada] },
          extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
          handleTogglePanelSelection: vi.fn(),
          openPersonaTeacherEditor,
          handleSelectPersona,
          handleStartPanelChat: vi.fn(),
          personaTeacherEditor: null,
          setPersonaTeacherEditor: vi.fn(),
          personaTeacherEditorRef: React.createRef(),
          updatePersonaTeacherEditor: vi.fn(),
          getPersonaVoiceOptions: () => [],
          savePersonaTeacherEditor: vi.fn(),
          onBack: vi.fn(),
        })
      );

      const editBtn = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === (translate('common.edit') || 'Edit'));
      expect(editBtn).not.toBeUndefined();
      await act(async () => { editBtn.click(); });
      expect(openPersonaTeacherEditor).toHaveBeenCalledTimes(1);
      expect(handleSelectPersona).not.toHaveBeenCalled();

      const card = host.querySelector('[data-help-key="persona_card"]');
      expect(card).not.toBeNull();
      await act(async () => { card.click(); });
      expect(handleSelectPersona).toHaveBeenCalledWith(ada);
    });
  });

  describe('4. Chat double-submit guard, Hints visibility, Read-Aloud guard & AI-off gating', () => {
    it('guards single-mode MC choices against double-submit and hides Hints toggle in MC mode', async () => {
      window.__alloAiUsable = () => true;
      let resolveSubmit;
      const deferredSubmit = vi.fn(() => new Promise(resolve => { resolveSubmit = resolve; }));
      const mcProps = buildChatProps({
        isPersonaFreeResponse: false,
        handlePersonaChatSubmit: deferredSubmit,
      });

      await renderElement(React.createElement(PersonaChatView, mcProps));
      expect(host.querySelector('[data-help-key="persona_hints_toggle"]')).toBeNull();

      const choiceBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('First question?'));
      expect(choiceBtn).not.toBeUndefined();

      await act(async () => {
        choiceBtn.click();
        choiceBtn.click();
      });
      await act(async () => { await Promise.resolve(); });
      expect(choiceBtn.disabled).toBe(true);
      expect(deferredSubmit).toHaveBeenCalledTimes(1);

      await act(async () => { resolveSubmit(); await Promise.resolve(); });

      await act(async () => { root.render(React.createElement(PersonaChatView, buildChatProps({ isPersonaFreeResponse: true }))); });
      expect(host.querySelector('[data-help-key="persona_hints_toggle"]')).not.toBeNull();
    });

    it('ignores click/Enter/Space from nested interactive buttons inside sentence read-aloud spans', async () => {
      const handleSpeak = vi.fn();
      const props = buildChatProps({
        handleSpeak,
        formatInteractiveText: (text) => React.createElement(
          'span',
          null,
          text,
          React.createElement('button', { type: 'button', 'data-testid': 'nested-vocab' }, 'Vocab')
        ),
      });

      await renderElement(React.createElement(PersonaChatView, props));
      const nestedBtn = host.querySelector('[data-testid="nested-vocab"]');
      const sentenceSpan = nestedBtn.closest('span[role="button"]');
      expect(nestedBtn).not.toBeNull();
      expect(sentenceSpan).not.toBeNull();

      await act(async () => { nestedBtn.click(); });
      await act(async () => { nestedBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
      await act(async () => { nestedBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); });
      expect(handleSpeak).not.toHaveBeenCalled();

      await act(async () => { sentenceSpan.click(); });
      expect(handleSpeak).toHaveBeenCalledTimes(1);

      await act(async () => { sentenceSpan.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
      expect(handleSpeak).toHaveBeenCalledTimes(2);
    });

    it('extracts legacy **English Translation:** in Panel view and strips it in processPersonaTtsQueue', async () => {
      const panelProps = buildChatProps({
        personaState: {
          mode: 'panel',
          selectedCharacter: { name: 'Ada Lovelace' },
          selectedCharacters: [
            { name: 'Ada Lovelace', role: 'Mathematician', quests: [] },
            { name: 'Grace Hopper', role: 'Computer scientist', quests: [] },
          ],
          chatHistory: [{ role: 'model', speakerName: 'Ada Lovelace', text: 'Bonjour tout le monde.\n\n**English Translation:** Hello everyone.' }],
          suggestions: [],
          panelSuggestions: [],
          earnedBadges: [],
          isLoading: false,
        },
      });
      await renderElement(React.createElement(PersonaChatView, panelProps));
      const speakTransBtn = host.querySelector(`button[aria-label="${translate('persona.speak_translation')}"]`);
      expect(speakTransBtn).not.toBeNull();
      const sentenceButtons = [...host.querySelectorAll('span[role="button"]')];
      expect(sentenceButtons.some(el => el.textContent.includes('English Translation'))).toBe(false);
      expect(host.textContent).toContain('Hello everyone.');

      const spoke = [];
      const playbackSessionRef = { current: 1 };
      const autoReadRef = { current: true };
      const handlers = HostHandlers({
        personaTtsQueueRunningRef: { current: false },
        personaAutoReadRef: autoReadRef,
        isPersonaChatOpen: true,
        isGlobalMuted: () => false,
        personaTtsQueueRef: {
          current: [{
            index: 0,
            generation: 1,
            messageKey: 'm0',
            msg: { role: 'model', text: 'Bonjour tout le monde.\n\n**English Translation:** Hello everyone.' },
          }],
        },
        personaTtsQueuedMessageKeysRef: { current: new Set(['m0']) },
        personaTtsQueueGenerationRef: { current: 1 },
        setPanelTtsPending: vi.fn(),
        playbackSessionRef,
        isPlayingRef: { current: false },
        stopPlayback: vi.fn(),
        personaTtsProcessorRef: { current: null },
        warnLog: vi.fn(),
        handleSpeak: vi.fn((text, contentId) => {
          spoke.push(text);
          queueMicrotask(() => {
            window.dispatchEvent(new CustomEvent('alloflow:playback-stopped', {
              detail: { contentId, playbackSessionId: 1, reason: 'ended' },
            }));
          });
        }),
      });
      await handlers.processPersonaTtsQueue();
      expect(spoke).toEqual(['Bonjour tout le monde.']);
    });

    it('skips AI calls in reflection prompt & save when student text AI is disabled and keeps host guards in all 3 shells', async () => {
      const callGemini = vi.fn();
      const setDynamicReflectionQuestion = vi.fn();
      const setIsGeneratingReflectionPrompt = vi.fn();
      const handlers = HostHandlers({
        isTeacherMode: false,
        studentProjectSettings: { allowStudentTextAi: false },
        callGemini,
        personaState: { mode: 'single', selectedCharacter: { name: 'Ada' }, chatHistory: [{ role: 'model', text: 'Hi' }] },
        personaReflectionPromptRequestRef: { current: 0 },
        personaReflectionIdentityRef: { current: 'r1:1' },
        personaReflectionPromptAbortRef: { current: null },
        setIsGeneratingReflectionPrompt,
        setDynamicReflectionQuestion,
        targetStandards: [],
        dokLevel: '2',
        currentUiLanguage: 'English',
        t: translate,
        warnLog: vi.fn(),
        buildSecurePersonaReflectionPrompt: vi.fn(),
      });
      await handlers.handleGenerateReflectionPrompt();
      expect(callGemini).not.toHaveBeenCalled();
      expect(setDynamicReflectionQuestion).toHaveBeenCalledWith(translate('persona.default_reflection_prompt'));

      let savedHistory = [];
      let feedback = null;
      await PhaseKHelpers.handleSaveReflection({
        isTeacherMode: false,
        studentProjectSettings: { allowStudentTextAi: false },
        callGemini,
        personaState: {
          mode: 'single',
          selectedCharacter: { name: 'Ada', context: 'Computing' },
          selectedCharacters: [],
          chatHistory: [{ role: 'model', text: 'Engine notes.' }],
          earnedBadges: [],
        },
        personaReflectionInput: 'I noticed Ada anticipated software beyond pure arithmetic.',
        personaReflectionSubmitRef: { current: false },
        personaReflectionLastSavedKeyRef: { current: null },
        personaReflectionIdentityRef: { current: 'r1:1' },
        personaReflectionContextTokenRef: { current: 1 },
        personaReflectionResourceIdRef: { current: 'r1' },
        personaReflectionGradeAbortRef: { current: null },
        generatedContent: { id: 'r1', config: {} },
        targetStandards: [],
        dokLevel: '2',
        currentUiLanguage: 'English',
        sourceTopic: 'Computing',
        cleanJson: (v) => v,
        setIsGradingReflection: vi.fn(),
        setHistory: vi.fn((u) => { savedHistory = typeof u === 'function' ? u(savedHistory) : u; }),
        handleScoreUpdate: vi.fn(),
        setPersonaState: vi.fn(),
        setReflectionFeedback: vi.fn((v) => { feedback = v; }),
        addToast: vi.fn(),
        playSound: vi.fn(),
        warnLog: vi.fn(),
        t: translate,
      });
      expect(callGemini).not.toHaveBeenCalled();
      expect(feedback.score).toBeNull();
      expect(savedHistory).toHaveLength(1);

      for (const shellPath of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
        const shell = readFileSync(shellPath, 'utf8');
        expect(shell).toContain('isIndependentMode, isParentMode, isTeacherMode,');
        expect(shell).toContain('const personaTextAiOff = (!isTeacherMode && (studentProjectSettings?.allowStudentTextAi === false');
        expect(shell).toContain('!personaState.isGeneratingSuggestions && !personaState.suggestionsError');
        expect(shell).toContain('!personaState.isGeneratingPanelSuggestions && !personaState.panelSuggestionsError');
      }
    });
  });

  describe('5. Owner HTML export BCP-47 lang and RTL support', () => {
    it('emits valid BCP-47 lang tags, RTL direction for Arabic, and logical margins', async () => {
      const buildForLang = async (language) => {
        const built = await ArtifactRuntime.buildPrivateSessionArtifact({
          sessionId: `sess-${language}`,
          resourceId: 'res-html',
          language,
          personaState: {
            mode: 'single',
            selectedCharacter: { id: 'ada', name: 'Ada' },
            chatHistory: [
              { role: 'user', text: 'Hello' },
              { role: 'model', text: 'Welcome' },
            ],
          },
        });
        return ArtifactRuntime.buildOwnerHtmlDocument(built.artifact);
      };

      const en = await buildForLang('English');
      expect(en.html).toContain('<html lang="en">');
      expect(en.html).not.toContain('dir="rtl"');
      expect(en.html).toContain('English');

      const zh = await buildForLang('Simplified Chinese');
      expect(zh.html).toContain('<html lang="zh-CN">');
      expect(zh.html).toContain('Simplified Chinese');

      const ar = await buildForLang('Arabic');
      expect(ar.html).toContain('<html lang="ar" dir="rtl">');
      expect(ar.html).toContain('margin-inline-start:32px');
      expect(ar.html).toContain('margin-inline-end:32px');
      expect(ar.html).toContain('Arabic');
    });
  });
});
