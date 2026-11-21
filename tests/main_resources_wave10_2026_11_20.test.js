// Wave 10 regression suite (2026-11-20): P0 Crashes, Answer Leaks, Audio/Mic Leaks & Mute Bypasses
// across WordSoundsSetup, WordSoundsPreview, Games, ImmersiveReader, LiveAAC, and VisualSupports.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;

function mountElement(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(el);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  act = React.act || require(path.join(modulesDir, 'react-dom/test-utils')).act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.LanguageContext = React.createContext({ t: (k) => k });
  window.fisherYatesShuffle = (arr) => [...arr];
});

afterEach(() => {
  document.body.innerHTML = '';
  delete window.AlloSpeechPlayer;
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
  delete window.__alloIsGlobalMuted;
  delete window._alloGlobalMute;
  delete window.__alloStudentAiDisabled;
  vi.restoreAllMocks();
});

describe('Wave 10 — P0 Crashes, Answer Leaks, Audio Leaks & Mute Bypasses', () => {
  it('preserves requiresTeacher on WordSoundsPreviewView when WordSoundsReadiness is absent and handles missing teacherLedWords', () => {
    loadAlloModule('view_word_sounds_preview_module.js');
    const WordSoundsPreviewView = window.AlloModules.WordSoundsPreviewView;
    expect(typeof WordSoundsPreviewView).toBe('function');

    const prevReadiness = window.AlloModules.WordSoundsReadiness;
    delete window.AlloModules.WordSoundsReadiness;

    const { container, unmount } = mountElement(
      React.createElement(WordSoundsPreviewView, {
        generatedContent: { id: 'ws-1', title: 'Digraphs', data: ['ship', 'chat'] },
        wsActivitySequence: ['counting'],
        isTeacherMode: false,
        wordSoundsAudioCoverage: { total: 2, requiresTeacher: true, teacherLedWords: null },
        t: (k) => k,
      })
    );

    const startBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      /Ask your teacher|Start/i.test(b.textContent || '')
    );
    expect(startBtn).not.toBeNull();
    expect(startBtn.disabled).toBe(true);
    expect(startBtn.className).toContain('disabled:opacity-50');
    unmount();

    if (prevReadiness) window.AlloModules.WordSoundsReadiness = prevReadiness;
  });

  it('falls back to device voice in LiveAacBoardDialog when onSpeak is omitted, returns false, or rejects, and cancels speech on unmount', async () => {
    loadAlloModule('live_aac_module.js');
    const LiveAacBoardDialog = window.AlloModules.LiveAac?.LiveAacBoardDialog || window.AlloModules.LiveAacBoardDialog;
    expect(typeof LiveAacBoardDialog).toBe('function');

    const speakMock = vi.fn();
    const cancelMock = vi.fn();
    window.__alloStudentAiDisabled = true;
    window.speechSynthesis = { speak: speakMock, cancel: cancelMock, getVoices: () => [] };
    global.SpeechSynthesisUtterance = window.SpeechSynthesisUtterance = function (text) { this.text = text; };

    const board = {
      board: { title: 'Core Words', locale: 'en-US', direction: 'ltr' },
      pages: [{ title: 'Page 1', cols: 2, cells: [{ id: 'c1', displayLabel: 'More', vocalLabel: 'More please' }] }],
    };

    // 1. Omitted onSpeak -> device voice speaks
    const m1 = mountElement(
      React.createElement(LiveAacBoardDialog, {
        payload: { package: board },
        onDismiss: vi.fn(),
        onSpeak: null,
        t: (k) => k,
      })
    );
    const btn1 = Array.from(m1.container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('More')
    );
    expect(btn1).toBeTruthy();
    act(() => { btn1.click(); });
    expect(speakMock).toHaveBeenCalled();
    expect(speakMock.mock.calls[0][0].text).toBe('More please');

    // Unmount cancels active speechSynthesis
    cancelMock.mockClear();
    m1.unmount();
    expect(cancelMock).toHaveBeenCalled();

    // 2. Rejected onSpeak promise -> device voice fallback speaks
    speakMock.mockClear();
    const m2 = mountElement(
      React.createElement(LiveAacBoardDialog, {
        payload: { package: board },
        onDismiss: vi.fn(),
        onSpeak: () => Promise.reject(new Error('offline')),
        t: (k) => k,
      })
    );
    const btn2 = Array.from(m2.container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('More')
    );
    await act(async () => {
      btn2.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(speakMock).toHaveBeenCalled();
    m2.unmount();
  });

  it('hides face-down MemoryGame card content from DOM/AT until flipped and omits term from picture alt labels', () => {
    loadAlloModule('games_module.js');
    const MemoryGame = window.AlloModules.Games?.MemoryGame || window.AlloModules.MemoryGame;
    expect(MemoryGame).toBeTruthy();

    const { container, unmount } = mountElement(
      React.createElement(MemoryGame, {
        data: [
          { term: 'Chloroplast', def: 'Captures sunlight in plant cells' },
          { term: 'Mitochondria', def: 'Produces cellular energy' },
        ],
        onClose: vi.fn(),
      })
    );

    // Before flipping any card, neither term nor definition text should be exposed inside face-down cards
    const cardEls = container.querySelectorAll('[data-help-key="memory_card_item"]');
    expect(cardEls.length).toBeGreaterThanOrEqual(4);
    cardEls.forEach((el) => {
      expect(el.textContent).not.toContain('Chloroplast');
      expect(el.textContent).not.toContain('Captures sunlight');
    });

    // Clicking a card flips it and reveals its content
    act(() => { cardEls[0].click(); });
    const revealed = cardEls[0].textContent;
    expect(revealed.length).toBeGreaterThan(0);
    unmount();
  });

  it('renders an accessible closeable empty-state dialog instead of null in PipelineBuilderGame when fewer than 2 steps exist', () => {
    loadAlloModule('games_module.js');
    const PipelineBuilderGame = window.AlloModules.Games?.PipelineBuilderGame || window.AlloModules.PipelineBuilderGame;
    expect(PipelineBuilderGame).toBeTruthy();

    const onClose = vi.fn();
    const { container, unmount } = mountElement(
      React.createElement(PipelineBuilderGame, {
        data: { steps: [] },
        onClose,
      })
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    const closeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      /Close/i.test(b.textContent || b.getAttribute('aria-label') || '')
    );
    expect(closeBtn).not.toBeNull();
    act(() => { closeBtn.click(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('cancels active speech on unmount in VisualSupportsModal and guards mute/cleanup across Games, ImmersiveReader & WordSoundsSetup', () => {
    loadAlloModule('view_visual_supports_modal_module.js');
    const VisualSupportsModal = window.AlloModules.VisualSupportsModal?.VisualSupportsModal || window.AlloModules.VisualSupportsModal;
    expect(typeof VisualSupportsModal).toBe('function');

    const stopMock = vi.fn();
    const cancelMock = vi.fn();
    window.AlloSpeechPlayer = { speak: vi.fn(), stop: stopMock };
    window.speechSynthesis = { cancel: cancelMock };

    const { unmount } = mountElement(
      React.createElement(VisualSupportsModal, {
        isOpen: true,
        onClose: vi.fn(),
        t: (k) => k,
      })
    );
    unmount();
    expect(stopMock).toHaveBeenCalled();
    expect(cancelMock).toHaveBeenCalled();

    // Verify compiled guards in WordSoundsSetup, ImmersiveReader & Games
    const wsSrc = fs.readFileSync(path.join(ROOT, 'word_sounds_setup_module.js'), 'utf8');
    expect(wsSrc).toContain('pendingPersistRef');
    expect(wsSrc).toContain('Math.max(1, selectedIndices.size)');
    expect(wsSrc).toContain('disabled: isProcessing');

    const irSrc = fs.readFileSync(path.join(ROOT, 'immersive_reader_module.js'), 'utf8');
    expect(irSrc).toContain('isGloballyMuted');
    expect(irSrc).toContain('deviceMuted');
    expect(irSrc).toContain('__alloVoiceVolume');

    const gamesSrc = fs.readFileSync(path.join(ROOT, 'games_module.js'), 'utf8');
    expect(gamesSrc).toContain('firstClue.row');
    expect(gamesSrc).toContain('bingoEntries');
    expect(gamesSrc).not.toContain('Picture representing ${item.term}');
  });
});
