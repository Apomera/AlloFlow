import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES_DIR = path.resolve(ROOT, 'desktop/web-app/node_modules');
const React = require(path.resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(path.resolve(MODULES_DIR, 'react-dom/client'));
const { act } = React;
const acorn = require(path.resolve(MODULES_DIR, 'acorn'));
const axe = require(path.resolve(MODULES_DIR, 'axe-core'));

const MIRROR_DIRS = ['.', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFourWayParity(relPath) {
  const rootHash = sha256(path.resolve(ROOT, relPath));
  for (const dir of MIRROR_DIRS.slice(1)) {
    const mirrorPath = path.resolve(ROOT, dir, relPath);
    expect(fs.existsSync(mirrorPath), `${mirrorPath} must exist`).toBe(true);
    expect(sha256(mirrorPath), `${mirrorPath} must match root ${relPath}`).toBe(rootHash);
  }
}

function auditModuleAst(relPath) {
  const src = fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  let totalReactBtn = 0;
  let untypedNonForm = 0;
  let dupType = 0;
  let rangesTotal = 0;
  let rangesMissingVt = 0;
  const walk = (n, inForm) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, inForm)); return; }
    let nf = inForm;
    if (n.type === 'CallExpression' && n.arguments[0] && n.arguments[0].type === 'Literal') {
      const isDom = n.callee.type === 'MemberExpression' && n.callee.object && n.callee.object.name === 'document';
      const cname = n.callee.type === 'Identifier'
        ? n.callee.name
        : (n.callee.type === 'MemberExpression' && n.callee.property ? n.callee.property.name : '');
      const tag = n.arguments[0].value;
      if (!isDom && ['h', 'ce', 'createElement'].includes(cname)) {
        if (tag === 'form') nf = true;
        if (tag === 'button') {
          totalReactBtn++;
          const props = n.arguments[1];
          if (props && props.type === 'ObjectExpression') {
            const types = props.properties.filter((p) => p.type === 'Property' && (
              (p.key.type === 'Identifier' && p.key.name === 'type') ||
              (p.key.type === 'Literal' && p.key.value === 'type')
            ));
            if (types.length > 1) dupType++;
            if (types.length === 0 && !inForm) untypedNonForm++;
          } else if (props && props.type === 'CallExpression' && props.callee && props.callee.property && props.callee.property.name === 'assign') {
            const hasT = props.arguments.some((a) => a && a.type === 'ObjectExpression' && a.properties.some((p) => p.type === 'Property' && (p.key.name === 'type' || p.key.value === 'type')));
            if (!hasT && !inForm) untypedNonForm++;
          } else if (!inForm && (!props || props.type === 'Literal')) {
            untypedNonForm++;
          }
        }
        if (tag === 'input' && n.arguments[1] && n.arguments[1].type === 'ObjectExpression') {
          const isRange = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'type' || p.key.value === 'type') && p.value && p.value.value === 'range');
          if (isRange) {
            rangesTotal++;
            const hasVt = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'aria-valuetext' || p.key.value === 'aria-valuetext'));
            if (!hasVt) rangesMissingVt++;
          }
        }
      }
    }
    for (const k of Object.keys(n)) if (k !== 'start' && k !== 'end') walk(n[k], nf);
  };
  walk(ast, false);
  return { src, totalReactBtn, untypedNonForm, dupType, rangesTotal, rangesMissingVt };
}

async function runAxe(el) {
  const res = await axe.run(el, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  return res.violations;
}

describe('Other Resources Polish — Wave 85 (LumenStudy, WaterWorldsView, ConceptPictionary Arcade, ModuleScopeExtras ErrorBoundary)', () => {
  let mountEl = null;
  let root = null;
  let errorSpy = null;

  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (mountEl) {
      mountEl.remove();
      mountEl = null;
    }
    if (errorSpy) {
      errorSpy.mockRestore();
      errorSpy = null;
    }
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. stem_lab/stem_lumen_study.js: 4-way mirror, 23/23 buttons typed, scoped WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('stem_lab/stem_lumen_study.js');
    const audit = auditModuleAst('stem_lab/stem_lumen_study.js');
    expect(audit.totalReactBtn).toBe(23);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('allo-lumen-study-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-lumen-study-a11y-css')?.remove();
    loadAlloModule('stem_lab/stem_lumen_evidence.js');
    loadAlloModule('stem_lab/stem_lumen_study.js');
    const Study = window.LumenStudy;
    expect(Study).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(Study.render({
        React,
        update: vi.fn(),
        studentNickname: 'Casey',
        sourceText: '# Water Cycle\n\nEvaporation lifts water vapor from oceans into the atmosphere.',
        sourceTitle: 'Water Cycle Notes',
      }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('allo-lumen-study-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-lumen-study="true"]')).not.toBeNull();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('2. stem_lab/water_worlds_view.js: 4-way mirror, 2/2 range sliders with aria-valuetext, canvas IME/modifier guard, WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('stem_lab/water_worlds_view.js');
    const audit = auditModuleAst('stem_lab/water_worlds_view.js');
    expect(audit.totalReactBtn).toBe(12);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.rangesTotal).toBe(2);
    expect(audit.rangesMissingVt).toBe(0);
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('outline-color:Highlight');
    expect(audit.src).toContain('prefers-reduced-motion:reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    document.getElementById('water-worlds-style')?.remove();
    loadAlloModule('stem_lab/water_worlds_kernel.js');
    loadAlloModule('stem_lab/water_worlds_view.js');
    const K = window.WaterWorldsKernel;
    let saved = K.begin(K.initial(), false);
    saved = K.advance(saved, saved.run.forcing.duration + 65);
    saved = { ...saved, running: false };

    let latest = saved;
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(window.WaterWorldsView, {
        React,
        saved,
        onSave: (st) => { latest = st; },
      }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('water-worlds-style');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('outline-color:Highlight');
    expect(styleEl.textContent).toContain('prefers-reduced-motion:reduce');

    const sliders = [...mountEl.querySelectorAll('input[type="range"]')];
    expect(sliders.length).toBeGreaterThanOrEqual(3);
    for (const sl of sliders) {
      const vt = sl.getAttribute('aria-valuetext');
      expect(vt, `slider #${sl.id} must have aria-valuetext`).toBeTruthy();
    }

    // Canvas arrow navigation must ignore Ctrl+ArrowRight and IME keyCode 229, while honoring plain ArrowRight
    const canvas = mountEl.querySelector('canvas');
    expect(canvas).not.toBeNull();
    const initialSelected = latest.selected;
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 229, bubbles: true }));
    });
    expect(latest.selected).toBe(initialSelected);

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(latest.selected).not.toBe(initialSelected);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('3. arcade_mode_concept_pictionary.js: 4-way mirror, 4/4 buttons typed, guarded WCAG CSS, canvas IME guard, and 0 axe violations', async () => {
    assertFourWayParity('arcade_mode_concept_pictionary.js');
    const audit = auditModuleAst('arcade_mode_concept_pictionary.js');
    expect(audit.totalReactBtn).toBe(4);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('arcade-pictionary-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors:active');
    expect(audit.src).toContain('prefers-reduced-motion:reduce');
    expect(audit.src).toContain('e.isComposing||(e.nativeEvent&&e.nativeEvent.isComposing)||e.keyCode===229');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('arcade-pictionary-a11y-css')?.remove();
    const modes = Object.create(null);
    window.AlloHavenArcade = {
      registerMode(id, def) { modes[id] = def; },
      isRegistered(id) { return Object.prototype.hasOwnProperty.call(modes, id); },
    };
    loadAlloModule('arcade_mode_concept_pictionary.js');
    const mode = modes['concept-pictionary'];
    expect(mode).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(mode.render({
        React,
        tokens: 15,
        minutesPerToken: 5,
        glossaryEntries: [{ term: 'Evaporation', def: 'Liquid turning to vapor.' }],
        onLaunch: vi.fn(() => true),
        palette: {},
      }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('arcade-pictionary-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors:active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion:reduce');
    for (const btn of mountEl.querySelectorAll('button')) {
      expect(btn.getAttribute('type')).toBe('button');
    }

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('4. module_scope_extras_module.js: 4-way mirror, ErrorBoundary scoped WCAG CSS, typed button, and 0 axe violations', async () => {
    assertFourWayParity('module_scope_extras_module.js');
    const audit = auditModuleAst('module_scope_extras_module.js');
    expect(audit.totalReactBtn).toBe(1);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('allo-error-boundary-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    document.getElementById('allo-error-boundary-a11y-css')?.remove();
    delete window.AlloModules?.ModuleScopeExtras;
    window.AlloLanguageContext = React.createContext(null);
    loadAlloModule('module_scope_extras_module.js');
    const EB = window.AlloModules.ModuleScopeExtras.ErrorBoundary;
    expect(EB).toBeTruthy();

    function Boom() { throw new Error('Simulated Wave 85 render error'); }
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(EB, null, React.createElement(Boom)));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('allo-error-boundary-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const fallback = mountEl.querySelector('[data-allo-error-boundary="true"]');
    expect(fallback).not.toBeNull();
    const retryBtn = fallback.querySelector('button');
    expect(retryBtn).not.toBeNull();
    expect(retryBtn.getAttribute('type')).toBe('button');

    expect(await runAxe(mountEl)).toEqual([]);
  });
});
