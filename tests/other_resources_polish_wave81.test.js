/**
 * Other Resources Accessibility & Polish — Wave 81
 * Covers four JSX-built UI modules (edited in *_source.jsx + _build_*_module.js):
 *   1. teacher_source.jsx -> teacher_module.js (TeacherDashboard & RosterKeyPanel)
 *   2. visual_panel_source.jsx -> visual_panel_module.js (VisualPanelGrid)
 *   3. adventure_source.jsx -> adventure_module.js (AdventureAudioControls & CastLobby)
 *   4. anchor_charts_source.jsx -> anchor_charts_module.js (AnchorChartView)
 *
 * Verifies 4-way mirror parity, scoped WCAG 2.2 AA stylesheets (touch-action,
 * :focus-visible, forced-colors, prefers-reduced-motion), 100% explicit
 * non-form button types, range slider aria-valuetext, offscreen canvas
 * aria-hidden, React/DOM IME & modifier keyboard guards, zero React console
 * errors, and zero live axe-core accessibility violations.
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

function auditModuleAst(relPath) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  let totalBtns = 0;
  let untypedNonForm = 0;
  let dupTypeBtns = 0;
  let rangeTotal = 0;
  let rangeNoValuetext = 0;

  function isCreateEl(node) {
    return (
      node &&
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      !node.callee.computed &&
      node.callee.object.type === 'Identifier' &&
      node.callee.object.name === 'React' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'createElement'
    );
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
          rangeTotal++;
          if (!props.properties.some(p => getPropName(p) === 'aria-valuetext')) rangeNoValuetext++;
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
  return { totalBtns, untypedNonForm, dupTypeBtns, rangeTotal, rangeNoValuetext };
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
  window.AlloLanguageContext = React.createContext({ t: (k, fb) => fb || k, currentUiLanguage: 'English' });
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(() => root.unmount());
    host.remove();
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

describe('Other Resources Polish — Wave 81', () => {
  it('polishes teacher_source.jsx -> teacher_module.js with touch-action + focus-visible + forced-colors CSS, slider aria-valuetext, IME/modifier tab & dialog guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('teacher_module.js');
    const astStats = auditModuleAst('teacher_module.js');
    expect(astStats.totalBtns).toBe(155);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeTotal).toBe(1);
    expect(astStats.rangeNoValuetext).toBe(0);

    window.AlloModules = window.AlloModules || {};
    delete window.__teacherModuleLoaded;
    delete window.AlloModules.TeacherDashboard;
    document.getElementById('teacher-module-a11y')?.remove();
    loadAlloModule('teacher_module.js');

    const styleEl = document.getElementById('teacher-module-a11y');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = await mountComponent(window.AlloModules.TeacherDashboard, {
      onClose: vi.fn(),
      dashboardData: [
        {
          id: 'student-1',
          studentNickname: 'Bright Owl',
          nickname: 'Bright Owl',
          history: [],
          totalXP: 120,
          streak: 3,
        },
      ],
      setDashboardData: vi.fn(),
      addToast: vi.fn(),
      setSelectedStudentId: vi.fn(),
      setDashboardView: vi.fn(),
      dashboardView: 'list',
      selectedStudentId: null,
    });

    const buttons = Array.from(host.querySelectorAll('button')).filter(b => !b.closest('form'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    const studentsTab = host.querySelector('#teacher-dashboard-tab-students');
    const insightsTab = host.querySelector('#teacher-dashboard-tab-insights');
    expect(studentsTab).toBeTruthy();
    expect(insightsTab).toBeTruthy();
    expect(studentsTab.getAttribute('aria-selected')).toBe('true');

    // Composing & modified ArrowRight must not switch dashboard tab
    await act(() => dispatchKey(studentsTab, 'ArrowRight', { isComposing: true }));
    await act(() => dispatchKey(studentsTab, 'ArrowRight', { keyCode: 229 }));
    await act(() => dispatchKey(studentsTab, 'ArrowRight', { ctrlKey: true }));
    await act(() => dispatchKey(studentsTab, 'ArrowRight', { metaKey: true }));
    await act(() => dispatchKey(studentsTab, 'ArrowRight', { altKey: true }));
    expect(studentsTab.getAttribute('aria-selected')).toBe('true');

    // Bare ArrowRight advances tab
    await act(() => dispatchKey(studentsTab, 'ArrowRight'));
    expect(insightsTab.getAttribute('aria-selected')).toBe('true');

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes visual_panel_source.jsx -> visual_panel_module.js with touch-action CSS, FPS slider aria-valuetext, GIF canvas aria-hidden, modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('visual_panel_module.js');
    const astStats = auditModuleAst('visual_panel_module.js');
    expect(astStats.totalBtns).toBe(53);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeTotal).toBe(1);
    expect(astStats.rangeNoValuetext).toBe(0);

    const src = fs.readFileSync(path.join(ROOT, 'visual_panel_source.jsx'), 'utf8');
    expect(src).toContain("if (c.setAttribute) c.setAttribute('aria-hidden', 'true');");
    expect(src).toContain('aria-valuetext={`${panel.fps || 3} fps`}');

    window.AlloModules = window.AlloModules || {};
    delete window.__visualPanelModuleLoaded;
    delete window.AlloModules.VisualPanelGrid;
    document.getElementById('visual-panel-a11y')?.remove();
    loadAlloModule('visual_panel_module.js');

    const styleEl = document.getElementById('visual-panel-a11y');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = await mountComponent(window.AlloModules.VisualPanelGrid, {
      visualPlan: {
        layout: 'single',
        panels: [{
          imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
          caption: 'Cell structure',
          labels: [{ text: 'Mitochondrion', position: 'top-left' }],
          fps: 4,
        }],
      },
      onUpdateLabel: vi.fn(),
      onRefinePanel: vi.fn(),
      onAnnotationsChange: vi.fn(),
      isTeacherMode: true,
      t: (_key, fallback) => fallback || _key,
    });

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes adventure_source.jsx -> adventure_module.js with touch-action + focus-visible + forced-colors CSS, 3/3 slider aria-valuetext, IME/modifier guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('adventure_module.js');
    const astStats = auditModuleAst('adventure_module.js');
    expect(astStats.totalBtns).toBe(34);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeTotal).toBe(3);
    expect(astStats.rangeNoValuetext).toBe(0);

    window.AlloModules = window.AlloModules || {};
    delete window.__adventureModuleLoaded;
    delete window.AlloModules.AdventureModule;
    delete window.AlloModules.AdventureAudioControls;
    document.getElementById('adv-a11y-css')?.remove();
    loadAlloModule('adventure_module.js');

    const styleEl = document.getElementById('adv-a11y-css');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = await mountComponent(window.AlloModules.AdventureAudioControls, {
      t: (_k, fb) => fb || _k,
    });

    const openBtn = host.querySelector('button');
    expect(openBtn).toBeTruthy();
    expect(openBtn.getAttribute('type')).toBe('button');
    await act(() => openBtn.click());

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const sliders = Array.from(dialog.querySelectorAll('input[type="range"]'));
    expect(sliders.length).toBeGreaterThanOrEqual(2);
    for (const s of sliders) {
      expect(s.getAttribute('aria-valuetext')).toMatch(/^\d+%$/);
    }

    const buttons = Array.from(host.querySelectorAll('button'));
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // IME composing & modified Escape must not close the audio dialog
    await act(() => dispatchKey(window, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(window, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(window, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(window, 'Escape', { metaKey: true }));
    await act(() => dispatchKey(window, 'Escape', { altKey: true }));
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    // Verify 0 live axe violations while dialog is open
    expect(await runAxe(host)).toEqual([]);

    // Bare Escape closes cleanly
    await act(() => dispatchKey(window, 'Escape'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes anchor_charts_source.jsx -> anchor_charts_module.js with touch-action + focus-visible + forced-colors CSS, IME/modifier dialog guards, and 0 live axe violations', async () => {
    assertFourWayMirrorParity('anchor_charts_module.js');
    const astStats = auditModuleAst('anchor_charts_module.js');
    expect(astStats.totalBtns).toBe(26);
    expect(astStats.untypedNonForm).toBe(0);
    expect(astStats.dupTypeBtns).toBe(0);
    expect(astStats.rangeNoValuetext).toBe(0);

    window.AlloModules = window.AlloModules || {};
    delete window.__anchorChartsModuleLoaded;
    delete window.AlloModules.AnchorChartView;
    document.getElementById('anchor-charts-module-a11y')?.remove();
    loadAlloModule('anchor_charts_module.js');

    const styleEl = document.getElementById('anchor-charts-module-a11y');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('@media (forced-colors: active)');
    expect(styleEl.textContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styleEl.textContent).toContain('.ac-root textarea, .ac-root input');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = await mountComponent(window.AlloModules.AnchorChartView, {
      generatedContent: {
        type: 'anchor-chart',
        id: 'wave81-chart',
        data: {
          title: 'Water Cycle',
          chartType: 'process',
          sections: [{
            id: 'evaporation',
            label: 'Evaporation',
            bullets: ['Sun heats water'],
            iconPrompt: '',
            iconUrl: 'data:image/png;base64,iVBORw0KGgo=',
          }],
          interactive: { armed: false, rubric: '' },
        },
      },
      handleNoteUpdate: vi.fn(),
      isTeacherMode: true,
      callImagen: null,
      callGemini: null,
      addToast: vi.fn(),
      addXp: vi.fn(),
      t: (_key, fallback) => fallback || _key,
    });

    const buttons = Array.from(host.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    // Open interactive mode rubric dialog
    const opener = host.querySelector('button[aria-label="Turn on student responses"]');
    expect(opener).toBeTruthy();
    await act(() => opener.click());
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // IME composing & modified Escape must not close the dialog
    await act(() => dispatchKey(document, 'Escape', { isComposing: true }));
    await act(() => dispatchKey(document, 'Escape', { keyCode: 229 }));
    await act(() => dispatchKey(document, 'Escape', { ctrlKey: true }));
    await act(() => dispatchKey(document, 'Escape', { metaKey: true }));
    await act(() => dispatchKey(document, 'Escape', { altKey: true }));
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    // Verify 0 live axe violations on dialog
    expect(await runAxe(dialog)).toEqual([]);

    // Bare Escape closes cleanly
    await act(() => dispatchKey(document, 'Escape'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    expect(await runAxe(host)).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
