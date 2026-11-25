/**
 * Other Resources Accessibility & Polish — Wave 79
 * Covers four flagship standalone studio & analytics modules:
 *   1. video_studio_module.js (Video Studio)
 *   2. student_analytics_module.js (Student Analytics / Assessment Center)
 *   3. behavior_lens_module.js (BehaviorLens)
 *   4. allohaven_module.js (AlloHaven)
 *
 * Verifies 4-way mirror parity, scoped WCAG 2.2 AA stylesheets (touch-action,
 * :focus-visible, forced-colors, prefers-reduced-motion), 100% explicit button
 * types, slider aria-valuetext, offscreen canvas aria-hidden, React-safe
 * IME/modifier keyboard guards, zero React console errors, and zero live
 * axe-core accessibility violations.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';
import { baseProps as blBaseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES_DIR = path.resolve(ROOT, 'desktop/web-app/node_modules');
const MIRRORS = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

const React = require(path.resolve(MODULES_DIR, 'react'));
const ReactDOM = require(path.resolve(MODULES_DIR, 'react-dom'));
const { createRoot } = require(path.resolve(MODULES_DIR, 'react-dom/client'));
const acorn = require(path.resolve(MODULES_DIR, 'acorn'));

globalThis.React = window.React = React;
window.ReactDOM = ReactDOM;
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

function auditButtonsAndRangesAst(relPath) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  let totalBtns = 0;
  let untypedBtns = 0;
  let dupTypeBtns = 0;
  let rangeNoValuetext = 0;

  function isCreateEl(node) {
    if (!node || node.type !== 'CallExpression') return false;
    const c = node.callee;
    if (c.type === 'Identifier' && (c.name === 'h' || c.name === 'e')) return true;
    if (
      c.type === 'MemberExpression' && !c.computed &&
      c.object.type === 'Identifier' && c.object.name === 'React' &&
      c.property.type === 'Identifier' && c.property.name === 'createElement'
    ) return true;
    return false;
  }

  function getPropName(prop) {
    if (!prop || prop.type !== 'Property') return null;
    if (prop.key.type === 'Identifier' && !prop.computed) return prop.key.name;
    if (prop.key.type === 'Literal') return String(prop.key.value);
    return null;
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (isCreateEl(node) && node.arguments.length >= 1 && node.arguments[0].type === 'Literal') {
      const tag = node.arguments[0].value;
      const props = node.arguments[1];
      if (tag === 'button') {
        totalBtns++;
        if (!props || (props.type === 'Literal' && props.value === null)) {
          untypedBtns++;
        } else if (props.type === 'ObjectExpression') {
          const types = props.properties.filter(p => getPropName(p) === 'type');
          if (types.length === 0) untypedBtns++;
          if (types.length > 1) dupTypeBtns++;
        }
      }
      if (tag === 'input' && props && props.type === 'ObjectExpression') {
        const typeProp = props.properties.find(p => getPropName(p) === 'type');
        if (typeProp && typeProp.value.type === 'Literal' && typeProp.value.value === 'range') {
          const hasVt = props.properties.some(p => getPropName(p) === 'aria-valuetext');
          if (!hasVt) rangeNoValuetext++;
        }
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'start' || k === 'end' || k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) {
        for (const item of v) walk(item);
      } else if (v && typeof v.type === 'string') {
        walk(v);
      }
    }
  }

  walk(ast);
  return { totalBtns, untypedBtns, dupTypeBtns, rangeNoValuetext };
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
  globalThis.X = window.X = () => null;
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(() => root.unmount());
    host.remove();
  }
  window.__alloFocusTrapStack = [];
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

describe('Other Resources Polish — Wave 79', () => {
  it('polishes video_studio_module.js with touch-action CSS, 100% explicit button types, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('video_studio_module.js');
    const astStats = auditButtonsAndRangesAst('video_studio_module.js');
    expect(astStats.totalBtns).toBe(14);
    expect(astStats.untypedBtns).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined });
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.VideoStudio;
    document.getElementById('vs-a11y-css')?.remove();
    loadAlloModule('video_studio_module.js');

    const styleEl = document.getElementById('vs-a11y-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.VideoStudio, {
      onClose,
      addToast: () => {},
    });

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // IME composing & modified Escape must not close the dialog
    await act(() => dispatchKey(document, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(document, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(document, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(document, 'Escape', { metaKey: true }));
    await act(() => dispatchKey(document, 'Escape', { altKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Bare Escape closes cleanly
    await act(() => dispatchKey(document, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes student_analytics_module.js with forced-colors + touch-action CSS, 100% explicit button types, RTI slider aria-valuetext, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('student_analytics_module.js');
    const astStats = auditButtonsAndRangesAst('student_analytics_module.js');
    expect(astStats.totalBtns).toBe(148);
    expect(astStats.untypedBtns).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    const src = fs.readFileSync(path.join(ROOT, 'student_analytics_module.js'), 'utf8');
    expect(src).toContain('"aria-valuetext": String(rtiThresholds[item.key]) + (item.unit || "")');

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.StudentAnalytics;
    document.getElementById('sa-a11y-css')?.remove();
    loadAlloModule('student_analytics_module.js');

    const styleEl = document.getElementById('sa-a11y-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    await mountComponent(window.AlloModules.StudentAnalytics, {
      isOpen: true,
      onClose,
      theme: 'light',
      t: (k) => k,
      probeHistory: {},
      interventionLogs: {},
      loadProbeBanks: () => Promise.resolve(),
      addToast: () => {},
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // IME composing & modified Escape must not close the panel
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(dialog, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(dialog, 'Escape', { altKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Bare Escape closes cleanly
    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(await runAxe(dialog)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes behavior_lens_module.js with touch-action CSS, 100% explicit button types, slider aria-valuetext, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('behavior_lens_module.js');
    const astStats = auditButtonsAndRangesAst('behavior_lens_module.js');
    expect(astStats.totalBtns).toBe(732);
    expect(astStats.untypedBtns).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    const src = fs.readFileSync(path.join(ROOT, 'behavior_lens_module.js'), 'utf8');
    expect(src).toContain("'aria-valuetext': selfRating + ' / 5'");

    document.getElementById('bl-a11y-css')?.remove();
    setupBehaviorLens();

    const styleEl = document.getElementById('bl-a11y-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    localStorage.setItem('bl_onboarded', 'true');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(
      window.AlloModules.BehaviorLens,
      blBaseProps({ onClose, studentNickname: 'Student A', isTeacherMode: true })
    );

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // IME composing & modified Escape must not close BehaviorLens
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(dialog, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(dialog, 'Escape', { metaKey: true }));
    await act(() => dispatchKey(dialog, 'Escape', { altKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Bare Escape closes cleanly from hub
    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes allohaven_module.js with touch-action CSS, 100% explicit button types, slider aria-valuetext, offscreen canvas aria-hidden, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('allohaven_module.js');
    const astStats = auditButtonsAndRangesAst('allohaven_module.js');
    expect(astStats.totalBtns).toBe(325);
    expect(astStats.untypedBtns).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    const src = fs.readFileSync(path.join(ROOT, 'allohaven_module.js'), 'utf8');
    expect(src).toContain("'aria-valuetext': mpt + ' min'");
    expect(src).toContain("closeBtn.type = 'button';");
    const canvasMatches = [...src.matchAll(/document\.createElement\(['"]canvas['"]\)/g)];
    expect(canvasMatches.length).toBe(2);
    for (const m of canvasMatches) {
      expect(src.slice(m.index, m.index + 160)).toContain("aria-hidden', 'true'");
    }

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.AlloHaven;
    document.getElementById('allohaven-styles')?.remove();
    loadAlloModule('allohaven_module.js');

    const styleEl = document.getElementById('allohaven-styles');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.AlloHaven, {
      isOpen: true,
      onClose,
      addToast: () => {},
    });

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // Welcome dialog ignores composing / modified Escape and dismisses on bare Escape
    const welcome = host.querySelector('.ah-welcome[role="dialog"]');
    expect(welcome).toBeTruthy();
    await act(() => dispatchKey(welcome, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(welcome, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(welcome, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(welcome, 'Escape', { altKey: true }));
    expect(host.querySelector('.ah-welcome[role="dialog"]')).toBeTruthy();

    await act(() => dispatchKey(welcome, 'Escape'));
    expect(host.querySelector('.ah-welcome[role="dialog"]')).toBeNull();

    // Open settings panel if trigger exists and check live slider aria-valuetext
    const settingsBtn = Array.from(host.querySelectorAll('button')).find(
      (b) => /settings/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent)
    );
    if (settingsBtn) {
      await act(() => settingsBtn.click());
      const range = host.querySelector('input[type="range"]');
      if (range) {
        expect(range.getAttribute('aria-valuetext')).toMatch(/^\d+ min$/);
      }
    }

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
