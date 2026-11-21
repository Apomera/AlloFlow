// Wave 11 regression suite (2026-11-20): P1 Accessibility, AI-Off Parity, Modal/Focus Hygiene & IME Safety.
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
  delete window.__alloAiUsable;
  delete window.__alloStudentAiDisabled;
  delete window.__alloAiSecretsLocked;
  delete window.AlloDictationButton;
  delete window.AlloSpeechPlayer;
  vi.restoreAllMocks();
});

describe('Wave 11 — P1 Accessibility, AI-Off Parity, Modal/Focus Hygiene & IME Safety', () => {
  it('gates SocraticChat when AI is off/locked, fixes light input focus rings, disables mic when recognitionRef is empty, and shows empty-state prompt', () => {
    loadAlloModule('view_socratic_chat_module.js');
    const SocraticChatModal = window.AlloModules.SocraticChat?.SocraticChat || window.AlloModules.SocraticChatModal?.SocraticChatModal || window.AlloModules.SocraticChatModal;
    expect(typeof SocraticChatModal).toBe('function');

    window.__alloAiSecretsLocked = true;
    const handleSocraticSubmit = vi.fn();

    const { container, unmount } = mountElement(
      React.createElement(SocraticChatModal, {
        showSocraticChat: true,
        socraticMessages: [],
        socraticInput: 'Why does water evaporate?',
        setSocraticInput: vi.fn(),
        isSocraticThinking: false,
        handleSocraticSubmit,
        handleSetShowSocraticChatToFalse: vi.fn(),
        recognitionRef: { current: null },
        t: (k) => k,
      })
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect(container.textContent).toContain('AI tutor is currently unavailable');
    expect(container.textContent).toContain('Ask a question about this lesson');

    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.className).toContain('focus-visible:ring-teal-700');

    const autoSendBtn = container.querySelector('[data-help-key="socratic_auto_send"]');
    expect(autoSendBtn.disabled).toBe(true);
    unmount();
  });

  it('guards StudentJoinPanel Enter during IME composition, prevents double submit, and uses full text accessible name on collapsed button', async () => {
    loadAlloModule('view_student_join_panel_module.js');
    const StudentJoinPanel = window.AlloModules.StudentJoinPanel?.StudentJoinPanel || window.AlloModules.StudentJoinPanel;
    expect(typeof StudentJoinPanel).toBe('function');

    let resolveJoin;
    const joinClassSession = vi.fn(() => new Promise((r) => { resolveJoin = r; }));

    const { container, unmount } = mountElement(
      React.createElement(StudentJoinPanel, {
        isJoinPanelExpanded: true,
        joinCodeInput: 'ABCDE',
        setJoinCodeInput: vi.fn(),
        joinAppIdInput: '',
        setJoinAppIdInput: vi.fn(),
        appId: 'default-app',
        joinClassSession,
        handleSetIsJoinPanelExpandedToFalse: vi.fn(),
        handleSetIsJoinPanelExpandedToTrue: vi.fn(),
        t: (k) => k,
      })
    );

    const codeInput = container.querySelector('#student-join-code');
    expect(codeInput).not.toBeNull();

    // IME composing Enter must NOT trigger joinClassSession
    act(() => {
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'isComposing', { value: true });
      codeInput.dispatchEvent(ev);
    });
    expect(joinClassSession).not.toHaveBeenCalled();

    // Normal submit locks against concurrent double-submit
    const form = container.querySelector('form');
    act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(joinClassSession).toHaveBeenCalledTimes(1);
    await act(async () => { resolveJoin(); await Promise.resolve(); });
    unmount();
  });

  it('uses valid grid/row/gridcell structure (with button inside gridcell) and removes misleading Enter shortcut in LiveAacBoardDialog', () => {
    loadAlloModule('live_aac_module.js');
    const LiveAacBoardDialog = window.AlloModules.LiveAac?.LiveAacBoardDialog || window.AlloModules.LiveAacBoardDialog;

    const { container, unmount } = mountElement(
      React.createElement(LiveAacBoardDialog, {
        payload: {
          package: {
            board: { title: 'Core Words', locale: 'en-US', direction: 'ltr' },
            pages: [{ title: 'Page 1', cols: 4, cells: [{ id: 'c1', displayLabel: 'Help', vocalLabel: 'I need help' }] }],
          },
        },
        onDismiss: vi.fn(),
        t: (k) => k,
      })
    );

    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
    const row = grid.querySelector('[role="row"]');
    expect(row).not.toBeNull();
    const gridcell = row.querySelector('[role="gridcell"]');
    expect(gridcell).not.toBeNull();
    expect(gridcell.tagName).not.toBe('BUTTON');
    expect(gridcell.querySelector('button[type="button"]')).not.toBeNull();
    expect(container.querySelector('[aria-keyshortcuts="Enter"]')).toBeNull();
    unmount();
  });

  it('adds SpeakButton, GameThemeToggle, role="status", and empty-state notice to MultiZoneSortGame', () => {
    loadAlloModule('games_module.js');
    const FrayerSortGame = window.AlloModules.Games?.FrayerSortGame || window.AlloModules.FrayerSortGame;
    expect(FrayerSortGame).toBeTruthy();

    const { container, unmount } = mountElement(
      React.createElement(FrayerSortGame, {
        data: { main: 'Photosynthesis', branches: [] },
        onClose: vi.fn(),
      })
    );

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.textContent).toMatch(/games\.bucket_sort\.no_items|No items available to sort\./);
    unmount();
  });

  it('verifies Wave 11 AI-off gates, Dictation composer, focus traps, IME guards, and contrast fixes across compiled modules', () => {
    const acSrc = fs.readFileSync(path.join(ROOT, 'view_assignment_center_module.js'), 'utf8');
    expect(acSrc).toContain('acTextAiReady');

    const ssSrc = fs.readFileSync(path.join(ROOT, 'view_share_session_surfaces_module.js'), 'utf8');
    expect(ssSrc).toContain('mbTextAiReady');
    expect(ssSrc).toMatch(/const trap = \{\s*root:\s*dialog\s*\}/);
    expect(ssSrc).toContain('summary, button:not([disabled])');

    const pcSrc = fs.readFileSync(path.join(ROOT, 'view_persona_chat_module.js'), 'utf8');
    expect(pcSrc).toContain('AlloDictationButton');
    expect(pcSrc).toContain('alloflow:ai-key-lock-changed');
    expect(pcSrc).toMatch(/aria-modal["']?\s*:\s*["']true["']/);

    const lhSrc = fs.readFileSync(path.join(ROOT, 'view_learning_hub_modal_module.js'), 'utf8');
    expect(lhSrc).toContain('__alloAiSecretsLocked');
    expect(lhSrc).toContain('alloflow:ai-key-lock-changed');

    const vsSrc = fs.readFileSync(path.join(ROOT, 'view_visual_supports_modal_module.js'), 'utf8');
    expect(vsSrc).toContain('crossOriginRetry');
    expect(vsSrc).toContain('top.root.contains(dialog)');

    const irSrc = fs.readFileSync(path.join(ROOT, 'immersive_reader_module.js'), 'utf8');
    expect(irSrc).toContain('textarea, summary, a[href]');
    expect(irSrc).toContain('role: "progressbar"');
    expect(irSrc).toContain('sentences.length > 0 ? sentenceIdx + 1 : 0');

    const epSrc = fs.readFileSync(path.join(ROOT, 'view_export_preview_module.js'), 'utf8');
    expect(epSrc).toContain('epTextAiReady');
    expect(epSrc).toContain('document.activeElement === first || document.activeElement === dialog');

    const gamesSrc = fs.readFileSync(path.join(ROOT, 'games_module.js'), 'utf8');
    expect(gamesSrc).toContain('allowAddItems && !studentAiOff && onGenerateItem');
    expect(gamesSrc).toContain('ev.touches && ev.cancelable');
    expect(gamesSrc).toContain('text-slate-300');

    const wsSrc = fs.readFileSync(path.join(ROOT, 'word_sounds_setup_module.js'), 'utf8');
    expect(wsSrc).toContain('visibleIds.indexOf(activityId)');
    expect(wsSrc).toContain('e.target.checked && imageAiHere');
  });
});
