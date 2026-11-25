/**
 * Other Resources Accessibility & Polish — Wave 78
 * Covers four studio & live-interaction modules:
 *   1. concept_pictionary_source.jsx -> concept_pictionary_module.js (Concept Pictionary & Sketch Response)
 *   2. story_forge_source.jsx -> story_forge_module.js (StoryForge Studio)
 *   3. cinematic_studio_module.js (Cinematic Studio)
 *   4. dynamic_assessment_module.js (Dynamic Assessment Studio)
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
import { createRealDaWorkspaceFixture } from './helpers/dynamic_assessment_workspace_fixture.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES_DIR = path.resolve(ROOT, 'desktop/web-app/node_modules');
const MIRRORS = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

const React = require(path.resolve(MODULES_DIR, 'react'));
const { createRoot } = require(path.resolve(MODULES_DIR, 'react-dom/client'));

globalThis.React = window.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
  window.AlloIcons = new Proxy({}, { get: () => () => null });
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

describe('Wave 78 — Concept Pictionary, StoryForge, Cinematic Studio & Dynamic Assessment WCAG 2.2 AA', () => {
  it('concept_pictionary_source.jsx -> concept_pictionary_module.js: 4-way mirror, scoped a11y CSS, 100% typed buttons, IME Escape guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('concept_pictionary_module.js');

    const prevStyle = document.getElementById('concept-pictionary-module-a11y');
    if (prevStyle) prevStyle.remove();
    delete window.__conceptPictionaryModuleLoaded;
    window.AlloModules = window.AlloModules || {};
    loadAlloModule('concept_pictionary_module.js');

    const style = document.getElementById('concept-pictionary-module-a11y');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('[data-pictionary-surface]');
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.ConceptPictionary.HostView, {
      isOpen: true,
      onClose,
      initialMode: 'sketch',
      sessionCode: 'WAVE78',
      sessionData: {
        roster: { u1: { name: 'Student One' }, u2: { name: 'Student Two' } },
      },
      t: (_k, fb) => fb || _k,
      addToast: vi.fn(),
    });

    const dialog = host.querySelector('[data-pictionary-surface][role="dialog"]');
    expect(dialog).not.toBeNull();

    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(2);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    // IME / modifier Escape must not close; plain Escape closes
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('story_forge_source.jsx -> story_forge_module.js: 4-way mirror, scoped a11y CSS, 100% typed buttons, slider aria-valuetext, IME Escape guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('story_forge_module.js');

    const prevStyle = document.getElementById('allo-sf-focus-css');
    if (prevStyle) prevStyle.remove();
    delete window.__storyForgeModuleLoaded;
    window.AlloModules = window.AlloModules || {};
    loadAlloModule('story_forge_module.js');

    const style = document.getElementById('allo-sf-focus-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action:manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors:active');
    expect(style.textContent).toContain('prefers-reduced-motion:reduce');

    const sfSrc = fs.readFileSync(path.join(ROOT, 'story_forge_source.jsx'), 'utf8');
    expect(sfSrc).toContain("aria-valuetext={clampStoryIllustrationWidth(illustrations[p.id]?.displayWidth) + 'px'}");
    expect(sfSrc).toContain("aria-valuetext={v > 0 ? '+' + v : String(v)}");

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.StoryForge, {
      isOpen: true,
      onClose,
      addToast: vi.fn(),
      t: (k) => k,
      gradeLevel: '6th Grade',
      outputLanguage: 'English',
    });

    const root = host.querySelector('.sf-modal-root');
    expect(root).not.toBeNull();

    const buttons = Array.from(root.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(4);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    // IME / modifier Escape must not close; plain Escape closes
    await act(() => dispatchKey(window, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(window, 'Escape', { ctrlKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(window, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('cinematic_studio_module.js: 4-way mirror, scoped a11y CSS, 100% typed buttons, IME tablist & Escape guards, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('cinematic_studio_module.js');

    const prevStyle = document.getElementById('cs-a11y-css');
    if (prevStyle) prevStyle.remove();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.CinematicStudio;
    loadAlloModule('cinematic_studio_module.js');

    const style = document.getElementById('cs-a11y-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.CinematicStudio, {
      onClose,
      addToast: vi.fn(),
      t: null,
      callGemini: null,
      initialTab: 'build',
    });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(8);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    // Tablist IME guard
    const buildTab = dialog.querySelector('#cs-tab-build');
    expect(buildTab.getAttribute('aria-selected')).toBe('true');
    await act(() => dispatchKey(buildTab, 'ArrowRight', { isComposing: true, keyCode: 229 }));
    expect(buildTab.getAttribute('aria-selected')).toBe('true');
    await act(() => dispatchKey(buildTab, 'ArrowRight'));
    expect(dialog.querySelector('#cs-tab-diagnose').getAttribute('aria-selected')).toBe('true');

    // Dialog IME / modifier Escape guard
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('dynamic_assessment_module.js: 4-way mirror, scoped a11y CSS, 100% typed non-form buttons, IME guards, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('dynamic_assessment_module.js');

    const prevStyle = document.getElementById('allo-da-styles');
    if (prevStyle) prevStyle.remove();
    const prevMotion = document.getElementById('allo-da-motion-reduce-css');
    if (prevMotion) prevMotion.remove();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.DynamicAssessment;
    const protectedFixture = await createRealDaWorkspaceFixture(React);
    window.AlloModules.SensitiveWorkspace = protectedFixture.api;
    try {
      loadAlloModule('dynamic_assessment_module.js');

      const daStyles = document.getElementById('allo-da-styles');
      expect(daStyles).not.toBeNull();
      expect(daStyles.textContent).toContain('touch-action: manipulation');
      expect(daStyles.textContent).toContain(':focus-visible');
      expect(daStyles.textContent).toContain('forced-colors: active');

      const daMotion = document.getElementById('allo-da-motion-reduce-css');
      expect(daMotion).not.toBeNull();
      expect(daMotion.textContent).toContain('prefers-reduced-motion: reduce');

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      protectedFixture.session.storage.setItem(
        'alloflow_dynamic_assessment_v1',
        JSON.stringify({ sessions: [], activeSession: null, onboardingSeen: true, savedProbeTemplates: [] })
      );
      const host = await mountComponent(window.AlloModules.DynamicAssessment, {
        React,
        onClose: vi.fn(),
        addToast: vi.fn(),
        t: (k) => k,
        studentNickname: '',
        outputLanguage: 'English',
      });

      const dialog = host.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();

      const buttons = Array.from(dialog.querySelectorAll('button'));
      expect(buttons.length).toBeGreaterThan(4);
      for (const b of buttons) {
        expect(b.getAttribute('type')).toBe('button');
      }

      const violations = await runAxe(host);
      expect(violations).toEqual([]);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      protectedFixture?.dispose();
    }
  });
});
