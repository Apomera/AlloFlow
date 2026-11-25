/**
 * Other Resources Accessibility & Polish — Wave 76
 * Covers standalone top-level React UI modules:
 *   1. mind_map_module.js (Throughline / Learning Web: Unit Path)
 *   2. catalog_module.js (Community Catalog & PD Hub)
 *   3. report_writer_module.js (Report Writer)
 *   4. word_sounds_module.js (Word Sounds)
 *
 * Verifies 4-way mirror parity, scoped WCAG 2.2 AA stylesheets (touch-action,
 * :focus-visible, forced-colors, prefers-reduced-motion), explicit button types,
 * descriptive slider aria-valuetext, offscreen canvas aria-hidden hygiene,
 * React-safe IME/modifier keyboard guards, zero React console errors, and zero
 * live axe-core accessibility violations.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';
import { sampleUnit, sampleHistory, sampleUnits, seedStorage, clearStorage } from './helpers/throughline_harness.js';
import { installReportWriterWorkspaceFixture } from './helpers/report_writer_workspace_fixture.js';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

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
  installCanvasStub();
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
  clearStorage();
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

describe('Wave 76 — Standalone top-level UI modules polish & WCAG 2.2 AA', () => {
  it('mind_map_module.js (Throughline): 4-way mirror, scoped a11y CSS, typed modal buttons, IME Escape guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('mind_map_module.js');

    const prevStyle = document.getElementById('allo-mindmap-a11y-css');
    if (prevStyle) prevStyle.remove();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.Throughline;
    delete window.AlloModules.MindMap;
    loadAlloModule('mind_map_module.js');

    const style = document.getElementById('allo-mindmap-a11y-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    seedStorage(sampleUnit());
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.Throughline, {
      isOpen: true,
      onClose,
      addToast: vi.fn(),
      studentNickname: '',
      t: (k) => k,
      history: sampleHistory(),
      units: sampleUnits(),
      onOpenLesson: vi.fn(),
    });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Open the Outline panel and verify all buttons inside it carry explicit type="button"
    const outlineBtn = Array.from(host.querySelectorAll('button')).find((b) => /outline/i.test(b.textContent || ''));
    expect(outlineBtn).toBeTruthy();
    await act(() => outlineBtn.click());
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => /print/i.test(b.textContent || ''));
    expect(printBtn).toBeTruthy();
    expect(printBtn.getAttribute('type')).toBe('button');

    // IME and modifier Escape must NOT close the dialog; plain Escape must close it
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('catalog_module.js (CommunityCatalog): 4-way mirror, scoped a11y CSS, 100% typed buttons, IME guards, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('catalog_module.js');

    const prevStyle = document.getElementById('allo-catalog-a11y-css');
    if (prevStyle) prevStyle.remove();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.CommunityCatalog;
    loadAlloModule('pd_core_module.js');
    loadAlloModule('catalog_module.js');

    const style = document.getElementById('allo-catalog-a11y-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('[data-allo-catalog]');
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    try {
      const host = await mountComponent(window.AlloModules.CommunityCatalog, {
        isOpen: true,
        onClose,
        addToast: vi.fn(),
      });

      const dialog = host.querySelector('[data-allo-catalog][role="dialog"]');
      expect(dialog).not.toBeNull();

      // Every rendered button has explicit type="button"
      const buttons = Array.from(dialog.querySelectorAll('button'));
      expect(buttons.length).toBeGreaterThan(3);
      for (const b of buttons) {
        expect(b.getAttribute('type')).toBe('button');
      }

      // Tablist IME guard: composing ArrowRight must not switch tabs; plain ArrowRight switches to Submit
      const browseTab = dialog.querySelector('#pd-tab-browse');
      const submitTab = dialog.querySelector('#pd-tab-submit');
      expect(browseTab.getAttribute('aria-selected')).toBe('true');
      await act(() => dispatchKey(browseTab, 'ArrowRight', { isComposing: true, keyCode: 229 }));
      expect(browseTab.getAttribute('aria-selected')).toBe('true');
      await act(() => dispatchKey(browseTab, 'ArrowRight'));
      expect(submitTab.getAttribute('aria-selected')).toBe('true');

      // Dialog IME Escape guard
      await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
      expect(onClose).not.toHaveBeenCalled();

      const violations = await runAxe(host);
      expect(violations).toEqual([]);

      await act(() => dispatchKey(dialog, 'Escape'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('report_writer_module.js (ReportWriter): 4-way mirror, enhanced a11y CSS, 100% typed buttons, slider aria-valuetext, IME guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('report_writer_module.js');

    const prevStyle = document.getElementById('rw-a11y-css');
    if (prevStyle) prevStyle.remove();
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.ReportWriter;
    installReportWriterWorkspaceFixture(React);
    loadAlloModule('identifier_redaction_module.js');
    loadAlloModule('report_writer_module.js');

    const style = document.getElementById('rw-a11y-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.ReportWriter, {
      onClose,
      callGemini: vi.fn(async () => '{}'),
      addToast: vi.fn(),
      t: (k) => k,
      studentNickname: 'Student A',
      behaviorLensData: null,
      longitudinalData: null,
      dashboardData: [],
    });

    const dialog = host.querySelector('#rw-dialog-surface');
    expect(dialog).not.toBeNull();

    // Every rendered button has explicit type="button"
    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(8);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
    }

    // Source verification that the generation-passes slider carries localized aria-valuetext
    const rwSrc = fs.readFileSync(path.join(ROOT, 'report_writer_module.js'), 'utf8');
    expect(rwSrc).toContain("'aria-valuetext': reportGenPasses === 1");

    // IME / modifier Escape must not close; plain Escape invokes close
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    const violations = await runAxe(host);
    expect(violations).toEqual([]);

    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('word_sounds_module.js (WordSoundsModal): 4-way mirror, scoped a11y CSS (no .fixed.inset-0), typed buttons, slider valuetext, canvas aria-hidden, IME guard, 0 axe/console errors', async () => {
    assertFourWayMirrorParity('word_sounds_module.js');

    const prevStyle = document.getElementById('ws-a11y-css');
    if (prevStyle) prevStyle.remove();
    const { WordSoundsModal } = setupWordSounds();
    if (!document.getElementById('ws-a11y-css')) {
      delete window.AlloModules.WordSoundsModal;
      loadAlloModule('word_sounds_module.js');
    }

    const style = document.getElementById('ws-a11y-css');
    expect(style).not.toBeNull();
    expect(style.textContent).toContain('touch-action: manipulation');
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('forced-colors: active');
    expect(style.textContent).toContain('prefers-reduced-motion: reduce');
    expect(style.textContent).not.toContain('.fixed.inset-0');

    const wsSrc = fs.readFileSync(path.join(ROOT, 'word_sounds_module.js'), 'utf8');
    expect(wsSrc).toContain('"data-present-speed": "true", "aria-valuetext": tr("word_sounds.present_speed_value"');
    expect(wsSrc).toContain('_cv.setAttribute("aria-hidden", "true")');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(WordSoundsModal, {
      ...studentProps('blending', []),
      onClose,
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Every rendered button has explicit type="button"
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
});
