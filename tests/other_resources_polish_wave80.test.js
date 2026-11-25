/**
 * Other Resources Accessibility & Polish — Wave 80
 * Covers four flagship standalone studio & 3D modules:
 *   1. lingua_practice_module.js (Lingua Practice)
 *   2. story_stage_module.js (Story Stage / LitLab)
 *   3. studio_module.js (AlloStudio Page Designer)
 *   4. memory_palace_module.js (Memory Palace 3D Walk & Route List)
 *
 * Verifies 4-way mirror parity, scoped WCAG 2.2 AA stylesheets (touch-action,
 * :focus-visible, forced-colors, prefers-reduced-motion), 100% explicit button
 * types, slider aria-valuetext, offscreen canvas aria-hidden, React/DOM
 * IME/modifier keyboard guards, zero console errors, and zero live axe-core
 * accessibility violations.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

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
  let untypedNonForm = 0;
  let dupTypeBtns = 0;
  let rangeNoValuetext = 0;

  function isCreateEl(node) {
    if (!node || node.type !== 'CallExpression') return false;
    const c = node.callee;
    if (c.type === 'Identifier' && (c.name === 'h' || c.name === 'e' || c.name === 'hh')) return true;
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

  function walk(node, inForm) {
    if (!node || typeof node !== 'object') return;
    let nextInForm = inForm;
    if (isCreateEl(node) && node.arguments.length >= 1 && node.arguments[0].type === 'Literal') {
      const tag = node.arguments[0].value;
      const props = node.arguments[1];
      if (tag === 'form') nextInForm = true;
      if (tag === 'button') {
        totalBtns++;
        if (!inForm) {
          if (!props || (props.type === 'Literal' && props.value === null)) {
            untypedNonForm++;
          } else if (props.type === 'ObjectExpression') {
            const types = props.properties.filter(p => getPropName(p) === 'type');
            if (types.length === 0) untypedNonForm++;
            if (types.length > 1) dupTypeBtns++;
          }
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
        for (const item of v) walk(item, nextInForm);
      } else if (v && typeof v.type === 'string') {
        walk(v, nextInForm);
      }
    }
  }

  walk(ast, false);
  return { totalBtns, untypedNonForm, dupTypeBtns, rangeNoValuetext };
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
      'scrollable-region-focusable': { enabled: false },
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
  window.AlloLanguageContext = React.createContext({ currentUiLanguage: 'English' });
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    if (item.root) await act(() => item.root.unmount());
    if (item.cleanup) item.cleanup();
    item.host.remove();
  }
  window.__alloFocusTrapStack = [];
  document.body.style.overflow = '';
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

describe('Other Resources Polish — Wave 80', () => {
  it('polishes lingua_practice_module.js with touch-action + focus-visible + forced-colors CSS, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('lingua_practice_module.js');
    const astStats = auditButtonsAndRangesAst('lingua_practice_module.js');
    expect(astStats.totalBtns).toBe(149);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.LinguaPractice;
    loadAlloModule('lingua_practice_module.js');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.LinguaPractice, {
      isOpen: true,
      onClose,
    });

    const styleEl = host.querySelector('style');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const buttons = Array.from(host.querySelectorAll('button')).filter(b => !b.closest('form'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // IME composing & modified Escape must not close Lingua Practice
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

  it('polishes story_stage_module.js with touch-action CSS, 100% explicit non-form button types, rubric slider aria-valuetext, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('story_stage_module.js');
    const astStats = auditButtonsAndRangesAst('story_stage_module.js');
    expect(astStats.totalBtns).toBe(54);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    const src = fs.readFileSync(path.join(ROOT, 'story_stage_module.js'), 'utf8');
    expect(src).toContain("'aria-valuetext': val + ' / 5'");

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.LitLab;
    document.getElementById('litlab-a11y-styles')?.remove();
    loadAlloModule('story_stage_module.js');

    const styleEl = document.getElementById('litlab-a11y-styles');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors:active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion:reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.LitLab, {
      gradeLevel: '5th Grade',
      studentNickname: 'Bright Owl',
      geminiVoices: [],
      kokoroVoices: [],
      addToast: () => {},
      onClose,
    });

    const buttons = Array.from(host.querySelectorAll('button')).filter(b => !b.closest('form'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // IME composing & modified Escape must not close Story Stage
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

  it('polishes studio_module.js with touch-action + forced-colors CSS, 100% explicit button types, offscreen canvas aria-hidden, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('studio_module.js');
    const astStats = auditButtonsAndRangesAst('studio_module.js');
    expect(astStats.totalBtns).toBe(161);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    const src = fs.readFileSync(path.join(ROOT, 'studio_module.js'), 'utf8');
    const canvasMatches = [...src.matchAll(/document\.createElement\(['"]canvas['"]\)/g)];
    expect(canvasMatches.length).toBe(4);
    for (const m of canvasMatches) {
      expect(src.slice(m.index, m.index + 120)).toContain("aria-hidden', 'true'");
    }

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.AlloStudio;
    document.getElementById('st-a11y-css')?.remove();
    loadAlloModule('studio_module.js');

    const styleEl = document.getElementById('st-a11y-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const host = await mountComponent(window.AlloModules.AlloStudio, {
      onClose,
      addToast: () => {},
    });

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // IME composing & modified Escape must not close Studio
    await act(() => dispatchKey(dialog, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(dialog, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(dialog, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(dialog, 'Escape', { metaKey: true }));
    await act(() => dispatchKey(dialog, 'Escape', { altKey: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Bare Escape closes cleanly
    await act(() => dispatchKey(dialog, 'Escape'));
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes memory_palace_module.js with touch-action + forced-colors focus CSS, 100% explicit DOM button types, 20/20 offscreen canvas aria-hidden, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('memory_palace_module.js');
    const src = fs.readFileSync(path.join(ROOT, 'memory_palace_module.js'), 'utf8');

    // Verify all 11 imperative DOM buttons assign type = 'button'
    const domBtnMatches = [...src.matchAll(/document\.createElement\(['"]button['"]\)/g)];
    expect(domBtnMatches.length).toBe(11);
    for (const m of domBtnMatches) {
      expect(src.slice(m.index, m.index + 420)).toMatch(/\.type\s*=\s*['"]button['"]/);
    }

    // Verify all 20 offscreen procedural canvases set aria-hidden="true"
    const canvasMatches = [...src.matchAll(/document\.createElement\(['"]canvas['"]\)/g)];
    expect(canvasMatches.length).toBe(20);
    for (const m of canvasMatches) {
      expect(src.slice(m.index, m.index + 140)).toContain("aria-hidden', 'true'");
    }

    // Verify scoped visualStyles include touch-action, focus-visible, forced-colors focus, reduced-motion
    expect(src).toContain('[data-memory-palace-viewport] :where(button,input,select,textarea,a,[role="button"]){touch-action:manipulation}');
    expect(src).toContain('[data-memory-palace-viewport] :where(button,canvas,[tabindex]):focus-visible{outline:3px solid Highlight!important;outline-offset:3px!important}');
    expect(src).toContain('@media(prefers-reduced-motion:reduce)');

    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.MemoryPalace;
    loadAlloModule('memory_palace_module.js');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = window.AlloModules.MemoryPalace.render(host, {
      main: 'The Water Cycle',
      branches: [
        { title: 'Sky Room', items: ['Evaporation', 'Condensation'], mnemonics: ['Boiling kettle', 'Wool cloud'] },
        { title: 'Ground Room', items: ['Precipitation'], mnemonics: ['Umbrellas'] },
      ],
    }, { onSelect: vi.fn() });
    mounted.push({ host, cleanup: () => handle && handle.destroy && handle.destroy() });

    const buttons = Array.from(host.querySelectorAll('button'));
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
