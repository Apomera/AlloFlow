/**
 * Other Resources Accessibility & Polish — Wave 77
 * Covers four studio modules:
 *   1. escape_room_module.js (Escape Room Dialogs & Workspace)
 *   2. applied_challenge_source.jsx -> applied_challenge_module.js (Applied Challenge Studio)
 *   3. poet_tree_module.js (Poet Tree Studio)
 *   4. symbol_studio_module.js (Symbol Studio AAC)
 *
 * Verifies 4-way mirror parity, scoped WCAG 2.2 AA stylesheets (touch-action,
 * :focus-visible, forced-colors, prefers-reduced-motion), explicit button types,
 * slider aria-valuetext, React-safe IME/modifier keyboard guards, zero React
 * console errors, and zero live axe-core accessibility violations.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';
import { setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES_DIR = path.resolve(ROOT, 'desktop/web-app/node_modules');
const MIRRORS = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

const React = require(path.resolve(MODULES_DIR, 'react'));
const { createRoot } = require(path.resolve(MODULES_DIR, 'react-dom/client'));
const UI_STRINGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));

globalThis.React = window.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function translate(key, fallback) {
  const val = String(key || '').split('.').reduce((n, p) => (n && typeof n === 'object' ? n[p] : undefined), UI_STRINGS);
  if (typeof val === 'string') return val;
  return typeof fallback === 'string' ? fallback : key;
}

function sha256File(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relPath))).digest('hex');
}

function assertFourWayMirrorParity(relPath) {
  const rootSha = sha256File(relPath);
  for (const dir of MIRRORS) {
    expect(sha256File(path.join(dir, relPath)), `${dir}/${relPath}`).toBe(rootSha);
  }
}

async function runAxe(container) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      'region': { enabled: false },
      'page-has-heading-one': { enabled: false },
      'landmark-one-main': { enabled: false },
      'landmark-banner-is-top-level': { enabled: false },
      'html-has-lang': { enabled: false },
      'heading-order': { enabled: false },
    },
  });
  return results.violations;
}

function dispatchKey(target, key, opts = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  if (opts.isComposing !== undefined) {
    Object.defineProperty(ev, 'isComposing', { value: opts.isComposing, configurable: true });
  }
  if (opts.keyCode !== undefined) {
    Object.defineProperty(ev, 'keyCode', { value: opts.keyCode, configurable: true });
  }
  target.dispatchEvent(ev);
}

const mounted = [];
const act = (fn) => React.act(async () => { await fn(); });

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  }
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(() => root.unmount());
    host.remove();
  }
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

async function mountComponent(Component, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  await act(() => root.render(React.createElement(Component, props)));
  return host;
}

describe('Wave 77 — Escape Room, Applied Challenge, Poet Tree & Symbol Studio WCAG 2.2 AA', () => {
  it('escape_room_module.js: 4-way mirror, scoped a11y CSS, 100% typed buttons, slider aria-valuetext, IME Escape guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('escape_room_module.js');

    const prevStyle = document.getElementById('escape-room-module-a11y');
    if (prevStyle) prevStyle.remove();
    delete window.__escapeRoomModuleLoaded;
    delete window.__alloHooks;
    window.AlloModules = window.AlloModules || {};
    loadAlloModule('escape_room_module.js');

    const style = document.getElementById('escape-room-module-a11y');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function SettingsHarness() {
      const [state, setState] = React.useState({ showSettings: true, difficulty: 'normal', puzzleCount: 10 });
      return React.createElement(window.AlloModules.EscapeRoomDialogs, {
        escapeRoomState: state,
        setEscapeRoomState: setState,
        handlers: {
          hasSavedEscapeRoom: () => false,
          hasEscapeRoomDraft: () => false,
          updateEscapeRoomSetting: (k, v) => setState((prev) => ({ ...prev, [k]: v })),
        },
        t: translate,
        hasSourceOrAnalysis: true,
      });
    }

    const host = await mountComponent(SettingsHarness, {});
    const dialog = host.querySelector('[data-escape-room-surface][role="dialog"]');
    expect(dialog).not.toBeNull();

    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(4);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    const slider = dialog.querySelector('#escape-room-puzzle-count');
    expect(slider).not.toBeNull();
    expect(slider.getAttribute('aria-valuetext')).toBe('10 / 15');

    // IME / modifier Escape must not close; plain Escape closes
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(dialog, 'Escape'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('applied_challenge_source.jsx -> applied_challenge_module.js: 4-way mirror, scoped a11y CSS, 100% typed buttons, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('applied_challenge_module.js');

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.AppliedChallengeModule;
    loadAlloModule('applied_challenge_module.js');

    const src = fs.readFileSync(path.join(ROOT, 'applied_challenge_source.jsx'), 'utf8');
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');
    expect(src).toContain('prefers-reduced-motion:reduce');
    expect(src).toContain('event.ctrlKey || event.metaKey || event.altKey');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const data = {
      schemaVersion: 1,
      title: 'Water Access Decision',
      instructions: 'Use evidence and revise your reasoning.',
      selectionMode: 'manual',
      family: 'decide',
      agencyMode: 'co-framed',
      scope: 'standard',
      brief: {
        drivingQuestion: 'Which option best balances access and impact?',
        seedDirection: 'Compare at least two defensible options.',
        lockedLessonFacts: ['Gravity moves water downhill.'],
        openQuestions: ['Which sites are feasible?'],
        criteria: ['Use lesson evidence.'],
        constraints: ['Do not invent local findings.'],
        deliverable: 'A recommendation and revision note.',
        factLocked: true,
      },
      supports: {
        frameStarter: 'Option ___ is stronger because ___.',
        coachPrompts: ['What evidence supports the choice?'],
      },
      workspace: {
        workingQuestion: 'Which option best balances access and impact?',
        response: '',
      },
    };

    const host = await mountComponent(window.AlloModules.AppliedChallengeView, {
      generatedContent: { id: 'ac-wave77', type: 'applied-challenge', data },
      handleNoteUpdate: vi.fn(),
      isTeacherMode: false,
      addToast: vi.fn(),
      t: translate,
    });

    const main = host.querySelector('.applied-challenge-root');
    expect(main).not.toBeNull();
    const styleEl = main.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors:active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion:reduce');

    const buttons = Array.from(main.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(4);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    const violations = await runAxe(host);
    expect(violations).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('poet_tree_module.js: 4-way mirror, scoped a11y CSS, 100% typed buttons, rubric slider aria-valuetext, IME tablist guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('poet_tree_module.js');

    const prevStyle = document.getElementById('pt-a11y-css');
    if (prevStyle) prevStyle.remove();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.PoetTree;
    loadAlloModule('poet_tree_module.js');

    const style = document.getElementById('pt-a11y-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = await mountComponent(window.AlloModules.PoetTree, {
      isOpen: true,
      onClose: vi.fn(),
      onCallTTS: async () => null,
      onCallImagen: async () => null,
      addToast: vi.fn(),
      gradeLevel: '7th Grade',
      selectedVoice: 'Kore',
      handleScoreUpdate: vi.fn(),
    });

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(5);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    // Tablist IME guard: composing ArrowRight does not change active tab; plain ArrowRight advances
    const tablist = host.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    const firstActive = tablist.querySelector('[aria-selected="true"]');
    expect(firstActive).not.toBeNull();
    const initialId = firstActive.id;

    await act(() => dispatchKey(firstActive, 'ArrowRight', { isComposing: true, keyCode: 229 }));
    expect(tablist.querySelector('[aria-selected="true"]').id).toBe(initialId);

    await act(() => dispatchKey(firstActive, 'ArrowRight'));
    expect(tablist.querySelector('[aria-selected="true"]').id).not.toBe(initialId);

    // Source verification of self-assessment rubric slider aria-valuetext
    const ptSrc = fs.readFileSync(path.join(ROOT, 'poet_tree_module.js'), 'utf8');
    expect(ptSrc).toContain("'aria-valuetext': val + ' / 5'");

    const violations = await runAxe(host);
    expect(violations).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('symbol_studio_module.js: 4-way mirror, scoped touch-action CSS, IME modal Escape & tablist guards, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('symbol_studio_module.js');

    const prevLayout = document.getElementById('ss-layout-css');
    if (prevLayout) prevLayout.remove();
    const { SymbolStudio } = setupSymbolStudio();

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(SymbolStudio, {
      isOpen: true,
      onClose,
      addToast: vi.fn(),
      t: translate,
    });

    const layoutStyle = document.getElementById('ss-layout-css');
    expect(layoutStyle).not.toBeNull();
    expect(layoutStyle.textContent).toContain('touch-action:manipulation');
    expect(layoutStyle.textContent).toContain(':focus-visible');
    expect(layoutStyle.textContent).toContain('forced-colors:active');
    expect(layoutStyle.textContent).toContain('prefers-reduced-motion:reduce');

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Tablist IME guard
    const firstTab = dialog.querySelector('[role="tab"][aria-selected="true"]');
    expect(firstTab).not.toBeNull();
    const startTabId = firstTab.id;
    await act(() => dispatchKey(firstTab, 'ArrowRight', { isComposing: true, keyCode: 229 }));
    expect(dialog.querySelector('[role="tab"][aria-selected="true"]').id).toBe(startTabId);
    await act(() => dispatchKey(firstTab, 'ArrowRight'));
    expect(dialog.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(startTabId);

    // Modal IME / modifier Escape guard
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
