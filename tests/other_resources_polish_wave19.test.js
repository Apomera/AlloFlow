import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let FocusReaderOverlay;
let ImmersiveToolbar;
let PerspectiveCrawlOverlay;
let KaraokeReaderOverlay;
let PersonaChatView;
let BridgeSendModal;
let BridgeMessageModal;
let SubmissionInbox;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setFieldValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  loadAlloModule('immersive_reader_module.js');
  loadAlloModule('view_persona_chat_module.js');
  loadAlloModule('view_gemini_bridge_module.js');
  loadAlloModule('view_submission_inbox_module.js');

  FocusReaderOverlay = window.AlloModules.FocusReaderOverlay;
  ImmersiveToolbar = window.AlloModules.ImmersiveToolbar;
  PerspectiveCrawlOverlay = window.AlloModules.PerspectiveCrawlOverlay;
  KaraokeReaderOverlay = window.AlloModules.KaraokeReaderOverlay;
  PersonaChatView = window.AlloModules.PersonaChatView;
  BridgeSendModal = window.AlloModules.BridgeSendModal;
  BridgeMessageModal = window.AlloModules.BridgeMessageModal;
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(async () => { root.unmount(); });
    host.remove();
  }
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  delete window.__alloAiUsable;
  delete window.alloDeviceStorage;
  delete window.alloCopyText;
  document.body.style.overflow = '';
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave 19 polish — ImmersiveReader, PersonaChat, FamilyBridge, SubmissionInbox', () => {
  it('ImmersiveReader overlays and toolbar provide aria-valuetext, non-color state cues, safe fallbacks, touch steppers, and pass axe', async () => {
    // 1. FocusReaderOverlay
    const focusHost = mountEl(React.createElement(FocusReaderOverlay, {
      text: 'Photosynthesis converts sunlight into chemical energy. Plants release oxygen.',
      isOpen: true,
      onClose: () => {},
    }));
    const focusDialog = focusHost.querySelector('[role="dialog"]');
    expect(focusDialog).toBeTruthy();

    const wordsSlider = focusDialog.querySelector('input[aria-label="Words per chunk"]');
    const speedSlider = focusDialog.querySelector('input[aria-label="Words per minute"]');
    expect(wordsSlider.getAttribute('aria-valuetext')).toBe('1 word (RSVP)');
    expect(speedSlider.getAttribute('aria-valuetext')).toBe('300 words per minute');

    const punctState = focusDialog.querySelector('[data-focus-punct-state]');
    expect(punctState?.textContent).toBe('On');
    const punctBtn = punctState.closest('button');
    act(() => { punctBtn.click(); });
    expect(focusDialog.querySelector('[data-focus-punct-state]')?.textContent).toBe('Off');
    expect(focusDialog.querySelector('[data-focus-reader-status]')?.textContent).toContain('Punctuation pauses off');

    const focusColorsGroup = focusDialog.querySelector('[role="group"][aria-label="Focus letter color"]');
    expect(focusColorsGroup).toBeTruthy();

    // Bottom Play + Next + Restart controls
    const nextBtn = Array.from(focusDialog.querySelectorAll('button')).find((b) => b.textContent.includes('Next'));
    const playBtn = Array.from(focusDialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Play');
    expect(playBtn).toBeTruthy();
    expect(playBtn.className).toContain('min-h-11');
    act(() => { nextBtn.click(); });
    const restartBtn = Array.from(focusDialog.querySelectorAll('button')).find((b) => b.textContent.includes('Restart'));
    expect(restartBtn).toBeTruthy();
    expect(focusDialog.querySelector('[role="progressbar"]').getAttribute('aria-valuetext')).toContain('Chunk 2 of');
    await runAxe(focusDialog);

    // 2. ImmersiveToolbar (with t returning literal keys — verifies safeT English fallbacks!)
    const tbHost = mountEl(React.createElement(ImmersiveToolbar, {
      settings: { textSize: 20, bgColor: '#fdfbf7', fontColor: '#1e293b', wideText: false, lineFocus: false },
      setSettings: () => {},
      onClose: () => {},
      playbackRate: 1,
      setPlaybackRate: () => {},
      lineHeight: 1.5,
      setLineHeight: () => {},
      letterSpacing: 0,
      setLetterSpacing: () => {},
      isChunkReaderActive: true,
      onToggleChunkReader: () => {},
      chunkReaderIdx: 0,
      setChunkReaderIdx: () => {},
      chunkReaderAutoPlay: false,
      setChunkReaderAutoPlay: () => {},
      chunkReaderSpeed: 3000,
      setChunkReaderSpeed: () => {},
      totalSentences: 3,
    }));
    expect(tbHost.textContent).toContain('Wide Text');
    expect(tbHost.textContent).toContain('Line Focus');
    expect(tbHost.textContent).not.toContain('immersive.wide_text');
    expect(tbHost.querySelector('input[aria-label="Chunk speed"]')?.getAttribute('aria-valuetext')).toBe('3.0 seconds per sentence');
    await runAxe(tbHost);

    // 3. PerspectiveCrawlOverlay
    const crawlHost = mountEl(React.createElement(PerspectiveCrawlOverlay, {
      text: 'First paragraph.\n\nSecond paragraph.',
      isOpen: true,
      onClose: () => {},
    }));
    const crawlDialog = crawlHost.querySelector('[role="dialog"]');
    expect(crawlDialog.querySelector('[data-crawl-ambient-state]')?.textContent).toBe('Off');
    expect(crawlDialog.querySelector('input[aria-label="Crawl speed"]')?.getAttribute('aria-valuetext')).toContain('pixels per second');
    expect(crawlDialog.querySelector('select[aria-label="Color palette"]')).toBeTruthy();
    expect(crawlDialog.querySelector('[role="progressbar"]')?.getAttribute('aria-valuetext')).toContain('% complete');
    await runAxe(crawlDialog);

    // 4. KaraokeReaderOverlay
    const karaokeHost = mountEl(React.createElement(KaraokeReaderOverlay, {
      sentenceList: ['First sentence.', 'Second sentence.', 'Third sentence.'],
      isOpen: true,
      onClose: () => {},
      getAudioUrl: null,
      captureOn: false,
    }));
    const karaokeDialog = karaokeHost.querySelector('[role="dialog"]');
    const nextSentenceBtn = karaokeDialog.querySelector('button[aria-label="Next sentence"]');
    const prevSentenceBtn = karaokeDialog.querySelector('button[aria-label="Previous sentence"]');
    expect(nextSentenceBtn).toBeTruthy();
    expect(prevSentenceBtn.disabled).toBe(true);
    act(() => { nextSentenceBtn.click(); });
    expect(karaokeDialog.querySelector('[role="progressbar"]')?.getAttribute('aria-valuetext')).toContain('Sentence 2 of 3');
    expect(karaokeDialog.querySelector('button[aria-label="Previous sentence"]').disabled).toBe(false);
    await runAxe(karaokeDialog);
  });

  it('PersonaChatView provides live composer count, progressive Clear draft, 44px controls with fallbacks, reflection h3, and passes axe', async () => {
    window.__alloAiUsable = () => true;
    window.alloDeviceStorage = { ready: async () => {}, get: async () => null, set: async () => {}, remove: async () => {} };
    const people = [
      { name: 'Ada Lovelace', year: '1843', role: 'Mathematician', context: 'Computing', quests: [] },
      { name: 'Grace Hopper', year: '1952', role: 'Computer Scientist', context: 'Compilers', quests: [] },
    ];
    const greeting = { role: 'model', text: 'Welcome to our conversation.', speakerName: 'Ada Lovelace' };

    const PassthroughErrorBoundary = ({ children }) => children;
    const NullComponent = () => null;
    const onSetInput = vi.fn();
    function PersonaHarness({ mode = 'single', reflection = false }) {
      const [input, setInput] = React.useState('What inspired your work?');
      const [reflInput, setReflInput] = React.useState('I learned about algorithms.');
      const [autoRead, setAutoRead] = React.useState(false);
      return React.createElement(PersonaChatView, {
        t: () => undefined,
        appId: 'w19-persona',
        studentNickname: 'Learner',
        theme: 'light',
        isTeacherMode: false,
        ErrorBoundary: PassthroughErrorBoundary,
        CharacterColumn: NullComponent,
        HarmonyMeter: NullComponent,
        studentProjectSettings: { allowPersonaFreeResponse: true },
        generatedContent: { id: 'w19-p', type: 'persona', data: people },
        personaState: { mode, selectedCharacter: people[0], selectedCharacters: people, chatHistory: [greeting], suggestions: [], panelSuggestions: [], earnedBadges: [], isLoading: false, xp: 120 },
        personaInput: input,
        setPersonaInput: (v) => { onSetInput(v); setInput(v); },
        isPersonaFreeResponse: true,
        setIsPersonaFreeResponse: () => {},
        showPersonaHints: true,
        setShowPersonaHints: () => {},
        personaAutoRead: autoRead,
        setPersonaAutoRead: setAutoRead,
        personaAutoSend: false,
        handleTogglePersonaAutoSend: () => {},
        handleToggleShowPersonaHints: () => {},
        handleClosePersonaChat: () => {},
        handlePersonaChatSubmit: () => {},
        handlePanelChatSubmit: () => {},
        handleSetIsPersonaReflectionOpenToFalse: () => {},
        stopPlayback: () => {},
        playbackState: {},
        panelTtsPending: [],
        personaReflectionInput: reflInput,
        setPersonaReflectionInput: setReflInput,
        isPersonaReflectionOpen: reflection,
        reflectionFeedback: null,
        formatInteractiveText: (text) => text,
        splitTextToSentences: (text) => [text],
        extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
        personaScrollRef: React.createRef(),
        setPersonaState: () => {},
      });
    }

    // 1. Single mode
    const singleHost = mountEl(React.createElement(PersonaHarness, { mode: 'single' }));
    const dialog = singleHost.querySelector('[role="dialog"]');
    expect(dialog.querySelector('[data-persona-composer-count]')?.textContent).toBe('24 / 2000');
    const clearBtn = dialog.querySelector('[data-persona-clear-draft]');
    expect(clearBtn).toBeTruthy();
    expect(clearBtn.className).toContain('min-h-11');
    act(() => { clearBtn.click(); });
    expect(onSetInput).toHaveBeenCalledWith('');
    expect(dialog.querySelector('[data-persona-composer-count]')?.textContent).toBe('0 / 2000');
    expect(dialog.querySelector('[data-persona-clear-draft]')).toBeNull();
    const bars = Array.from(dialog.querySelectorAll('[role="progressbar"]'));
    expect(bars.some((b) => (b.getAttribute('aria-valuetext') || '').includes('%'))).toBe(true);
    expect(bars.some((b) => (b.getAttribute('aria-valuetext') || '').includes('of 300 XP'))).toBe(true);
    await runAxe(dialog);

    // 2. Reflection modal (h3 heading, no h4 level skip, counter fallback)
    const reflHost = mountEl(React.createElement(PersonaHarness, { mode: 'single', reflection: true }));
    const reflDialog = reflHost.querySelector('[data-persona-reflection-dialog]');
    expect(reflDialog.querySelector('h3')).toBeTruthy();
    expect(reflDialog.querySelector('h4')).toBeNull();
    expect(reflDialog.querySelector('#persona-reflection-count')?.textContent).toBe('27 / 4000');
    await runAxe(reflDialog);
  });

  it('FamilyBridge Send and Receive modals provide 44px targets, fallbacks, copy status, reaction confirmation, and pass axe', async () => {
    window.alloCopyText = vi.fn(async () => true);

    // 1. BridgeSendModal
    const sendHost = mountEl(React.createElement(BridgeSendModal, {
      bridgeSendOpen: true,
      setBridgeSendOpen: () => {},
      isTeacherMode: true,
      bridgeHistory: [],
      bridgeHistoryOpen: false,
      setBridgeHistoryOpen: () => {},
      bridgeFullscreen: false,
      setBridgeFullscreen: () => {},
      bridgeChatOpen: false,
      setBridgeChatOpen: () => {},
      bridgeChatMessages: [],
      setBridgeChatMessages: () => {},
      bridgeOverrideGroups: false,
      setBridgeOverrideGroups: () => {},
      bridgeSending: false,
      setBridgeSending: () => {},
      bridgeAutoPlay: false,
      setBridgeAutoPlay: () => {},
      bridgeF2FListening: null,
      setBridgeF2FListening: () => {},
      bridgeF2FTranslating: false,
      setBridgeF2FTranslating: () => {},
      bridgeF2FCustomLangA: '',
      setBridgeF2FCustomLangA: () => {},
      bridgeF2FCustomLangB: '',
      setBridgeF2FCustomLangB: () => {},
      bridgeGenPhrases: null,
      setBridgeGenPhrases: () => {},
      bridgeGenLoading: false,
      setBridgeGenLoading: () => {},
      bridgePhraseCat: 'general',
      setBridgePhraseCat: () => {},
      activeSessionCode: '',
      theme: 'light',
      leveledTextLanguage: 'Spanish',
      gradeLevel: '5th Grade',
      rosterKey: {},
      generatedContent: null,
      addToast: () => {},
      t: (k) => k,
    }));
    const sendDialog = sendHost.querySelector('[role="dialog"]');
    expect(sendDialog.getAttribute('aria-label')).toBe('Bridge Mode send panel');
    expect(sendDialog.querySelector('button[aria-label="Full screen"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(sendDialog.querySelector('button[aria-label="Vocabulary template"]')?.style.minHeight).toBe('44px');
    expect(sendDialog.querySelector('#bridge-target-selector')?.getAttribute('aria-label')).toBe('Target group');
    await runAxe(sendDialog);

    // 2. BridgeMessageModal
    const msgHost = mountEl(React.createElement(BridgeMessageModal, {
      activeSessionAppId: 'app-1',
      activeSessionCode: 'CLASS1',
      addToast: () => {},
      bridgeActiveLanguage: 'en',
      bridgeKaraokeIndex: 0,
      bridgeMessage: {
        english: 'Plants use sunlight to make food.',
        translated: 'Las plantas usan luz solar para hacer comida.',
        language: 'Spanish',
        languageName: 'Spanish',
        terms: [{ word: 'Photosynthesis', definition: 'Making food from sunlight' }],
      },
      bridgeProjectionMode: false,
      bridgeTermsSaved: [],
      bridgeTtsPlaying: true,
      callTTS: vi.fn(async () => null),
      db: {},
      doc: () => ({}),
      handleAudio: vi.fn(async () => {}),
      handleQuickAddGlossary: vi.fn(async () => true),
      isTeacherMode: false,
      selectedVoice: 'Kore',
      sessionData: { bridgeReactions: { u1: { emoji: '👍' } } },
      setBridgeActiveLanguage: () => {},
      setBridgeKaraokeIndex: () => {},
      setBridgeMessage: () => {},
      setBridgeProjectionMode: () => {},
      setBridgeTermsSaved: () => {},
      setBridgeTtsPlaying: () => {},
      t: (k) => k,
      theme: 'light',
      ttsSpeed: 1,
      updateDoc: vi.fn(async () => {}),
      user: { uid: 'u1' },
      warnLog: () => {},
    }));
    const msgDialog = msgHost.querySelector('[role="dialog"]');
    expect(msgDialog.getAttribute('aria-label')).toBe('Bridge message');
    expect(msgDialog.querySelector('[role="progressbar"]')?.getAttribute('aria-valuetext')).toContain('Word 1 of');

    // Non-color-only ✓ on selected reaction
    const selectedReaction = msgDialog.querySelector('button[aria-pressed="true"]');
    expect(selectedReaction?.textContent).toContain('Got it! ✓');

    // Copy button shows inline Copied! + polite status
    const copyBtn = msgDialog.querySelector('[data-help-key="bridge_message_copy_btn"]');
    expect(copyBtn.style.minHeight).toBe('44px');
    await act(async () => {
      copyBtn.click();
      await Promise.resolve();
    });
    expect(copyBtn.textContent).toContain('Copied!');
    expect(msgDialog.querySelector('[data-bridge-copy-status]')?.getAttribute('role')).toBe('status');
    await runAxe(msgDialog);
  });

  it('SubmissionInbox upgrades 44px controls, scoped focus-visible/reduced-motion CSS, queue filter count, empty-state Reset, Escape search clear, and passes axe', async () => {
    const onClose = vi.fn();
    const host = mountEl(React.createElement(SubmissionInbox, {
      isOpen: true,
      onClose,
      rosterKey: { classId: 'c1', students: { 'Blue Fox': {} } },
      t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
      addToast: () => {},
      onOpenAlloSheet: () => {},
    }));

    const dialog = host.querySelector('[data-si-dialog="true"]');
    expect(dialog).toBeTruthy();
    expect(dialog.querySelector('style')?.textContent).toContain('prefers-reduced-motion:reduce');
    expect(dialog.querySelector('style')?.textContent).toContain(':focus-visible');

    const closeBtn = dialog.querySelector('button[aria-label="Close"]');
    expect(closeBtn.style.minHeight).toBe('44px');
    expect(closeBtn.style.minWidth).toBe('44px');

    // Import 2 JSON submissions
    const sub1 = JSON.stringify({
      kind: 'alloflow-student-submission',
      schemaVersion: 3,
      nickname: 'Blue Fox',
      classId: 'c1',
      docTitle: 'Photosynthesis Lab',
      timestamp: '2026-10-01T12:00:00.000Z',
      responses: { q1: 'Sunlight powers photosynthesis.' },
    });
    const sub2 = JSON.stringify({
      kind: 'alloflow-student-submission',
      schemaVersion: 3,
      nickname: 'Quiet Star',
      classId: 'c1',
      docTitle: 'Ecology Notes',
      timestamp: '2026-10-01T12:05:00.000Z',
      responses: { q1: 'Producers make energy.' },
    });
    const f1 = new File([sub1], 'fox.json', { type: 'application/json' });
    const f2 = new File([sub2], 'star.json', { type: 'application/json' });
    Object.defineProperty(f1, 'text', { value: () => Promise.resolve(sub1) });
    Object.defineProperty(f2, 'text', { value: () => Promise.resolve(sub2) });
    const fileInput = dialog.querySelector('input[aria-label="Submission files"]');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [f1, f2] });
    await act(async () => {
      fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 25));
    });

    const search = dialog.querySelector('[data-si-queue-search="true"]');
    expect(search).toBeTruthy();
    expect(search.style.minHeight).toBe('44px');

    // Filter to 1 match
    setFieldValue(search, 'Blue Fox');
    expect(dialog.querySelector('[data-si-queue-filter-count]')?.textContent).toBe('Showing 1 of 2 submissions');

    // Filter to 0 matches -> empty state with Reset filters button
    setFieldValue(search, 'NoSuchLearner');
    expect(dialog.textContent).toContain('No submissions match the current filter.');
    const resetBtn = dialog.querySelector('[data-si-queue-reset-filters="true"]');
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.style.minHeight).toBe('44px');

    // Escape in search box clears search without closing modal
    act(() => {
      search.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(search.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    await runAxe(dialog);
  });
});
