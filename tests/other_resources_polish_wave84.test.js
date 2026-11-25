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
          } else if (!inForm && (!props || props.type === 'Literal')) {
            untypedNonForm++;
          }
        }
        if (tag === 'input' && n.arguments[1] && n.arguments[1].type === 'ObjectExpression') {
          const isRange = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'type' || p.key.value === 'type') && p.value && p.value.value === 'range');
          if (isRange) {
            const hasVt = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'aria-valuetext' || p.key.value === 'aria-valuetext'));
            if (!hasVt) rangesMissingVt++;
          }
        }
      }
    }
    for (const k of Object.keys(n)) if (k !== 'start' && k !== 'end') walk(n[k], nf);
  };
  walk(ast, false);
  return { src, totalReactBtn, untypedNonForm, dupType, rangesMissingVt };
}

function makeRegistry() {
  const modes = Object.create(null);
  const reg = {
    _modes: modes,
    registerMode(id, def) { modes[id] = def; },
    isRegistered(id) { return Object.prototype.hasOwnProperty.call(modes, id); },
    getMode(id) { return modes[id] || null; },
  };
  window.AlloHavenArcade = reg;
  return reg;
}

const PALETTE = {
  bg: '#0f172a',
  panel: '#1e293b',
  panelAlt: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  textDim: '#cbd5e1',
  textMute: '#94a3b8',
  accent: '#60a5fa',
  onAccent: '#0f172a',
};

const SAMPLE_DECORATIONS = [
  { id: 'd1', name: 'Solar Lamp', emoji: '💡', category: 'science' },
  { id: 'd2', name: 'Fern Pot', emoji: '🌿', category: 'nature' },
  { id: 'd3', name: 'Compass', emoji: '🧭', category: 'tools' },
];
const SAMPLE_GLOSSARY = [
  { term: 'Photosynthesis', def: 'Process plants use to turn sunlight into glucose.' },
  { term: 'Chlorophyll', def: 'Green pigment that absorbs light energy.' },
  { term: 'Stomata', def: 'Tiny pores in leaves for gas exchange.' },
];

function baseCtx(overrides = {}) {
  return {
    React,
    palette: PALETTE,
    tokens: 20,
    minutesPerToken: 5,
    decorations: SAMPLE_DECORATIONS,
    glossaryEntries: SAMPLE_GLOSSARY,
    session: null,
    studentNickname: 'Alex',
    isHost: false,
    onLaunch: vi.fn(),
    onLaunchHosted: vi.fn(),
    onLaunchSelfCheck: vi.fn(),
    onCloseArcade: vi.fn(),
    callGemini: vi.fn(async () => '{}'),
    t: () => '',
    ...overrides,
  };
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

describe('Other Resources Polish — Wave 84 (Arcade Mode Suite)', () => {
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
    delete window.__alloHavenModelUNClassMode;
    delete window.__alloHavenPalaceClassMode;
    vi.restoreAllMocks();
  });

  it('1. arcade_mode_modelun.js: 4-way mirror, 107/107 buttons typed, upgraded WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('arcade_mode_modelun.js');
    const audit = auditModuleAst('arcade_mode_modelun.js');
    expect(audit.totalReactBtn).toBe(107);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('mun-crisis-a11y-css');
    expect(audit.src).toContain('touch-action: manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('mun-crisis-a11y-css')?.remove();
    const reg = makeRegistry();
    loadAlloModule('arcade_mode_modelun.js');
    const mode = reg.getMode('model-un');
    expect(mode).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(mode.render(baseCtx()));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('mun-crisis-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-arcade-mode="model-un"]')).not.toBeNull();
    const launcherBtns = [...mountEl.querySelectorAll('button')];
    expect(launcherBtns.length).toBeGreaterThan(0);
    for (const b of launcherBtns) expect(b.getAttribute('type')).toBe('button');
    expect(await runAxe(mountEl)).toEqual([]);

    // Active solo session phase
    await act(async () => {
      root.render(mode.render(baseCtx({ session: { modeId: 'model-un', startedAt: 101 } })));
      await Promise.resolve();
    });
    const activeBtns = [...mountEl.querySelectorAll('button')];
    expect(activeBtns.length).toBeGreaterThan(0);
    for (const b of activeBtns) expect(b.getAttribute('type')).toBe('button');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('2. arcade_mode_boss_encounter.js: 4-way mirror, 21/21 buttons typed, upgraded WCAG CSS, IME/modifier Enter guard, and 0 axe violations', async () => {
    assertFourWayParity('arcade_mode_boss_encounter.js');
    const audit = auditModuleAst('arcade_mode_boss_encounter.js');
    expect(audit.totalReactBtn).toBe(21);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('ah-arcade-css');
    expect(audit.src).toContain('touch-action: manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('ah-arcade-css')?.remove();
    const reg = makeRegistry();
    loadAlloModule('arcade_mode_boss_encounter.js');
    const mode = reg.getMode('boss-encounter');
    expect(mode).toBeTruthy();

    const callGemini = vi.fn(async () => '{}');
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(mode.render(baseCtx({ session: { modeId: 'boss-encounter', startedAt: 202 }, callGemini })));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('ah-arcade-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-arcade-mode="boss-encounter"]')).not.toBeNull();

    const btns = [...mountEl.querySelectorAll('button')];
    expect(btns.length).toBeGreaterThan(0);
    for (const b of btns) expect(b.getAttribute('type')).toBe('button');

    // Topic input modifier + IME Enter guards must not trigger boss generation
    const topicInput = mountEl.querySelector('input[aria-label="Encounter topic"]');
    expect(topicInput).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      setter.call(topicInput, 'Photosynthesis');
      topicInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      topicInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      topicInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
    });
    expect(callGemini).not.toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('3. arcade_mode_realm_builder.js: 4-way mirror, 30/30 buttons typed, scoped WCAG CSS on both modes, and 0 axe violations', async () => {
    assertFourWayParity('arcade_mode_realm_builder.js');
    const audit = auditModuleAst('arcade_mode_realm_builder.js');
    expect(audit.totalReactBtn).toBe(30);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('ah-realm-builder-a11y-css');
    expect(audit.src).toContain('touch-action: manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('ah-realm-builder-a11y-css')?.remove();
    const reg = makeRegistry();
    loadAlloModule('arcade_mode_boss_encounter.js');
    loadAlloModule('arcade_mode_realm_builder.js');
    const realmMode = reg.getMode('realm-builder');
    const palaceMode = reg.getMode('class-memory-palace');
    expect(realmMode).toBeTruthy();
    expect(palaceMode).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(
        'div',
        null,
        realmMode.render(baseCtx()),
        palaceMode.render(baseCtx({ sessionCode: 'CLS1', isHost: true }))
      ));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('ah-realm-builder-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-arcade-mode="realm-builder"]')).not.toBeNull();
    expect(mountEl.querySelector('[data-arcade-mode="class-memory-palace"]')).not.toBeNull();

    const btns = [...mountEl.querySelectorAll('button')];
    expect(btns.length).toBeGreaterThan(0);
    for (const b of btns) expect(b.getAttribute('type')).toBe('button');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('4. arcade_mode_concept_atlas.js: 4-way mirror, 15/15 buttons typed, scoped WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('arcade_mode_concept_atlas.js');
    const audit = auditModuleAst('arcade_mode_concept_atlas.js');
    expect(audit.totalReactBtn).toBe(15);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('ah-concept-atlas-a11y-css');
    expect(audit.src).toContain('touch-action: manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('ah-concept-atlas-a11y-css')?.remove();
    const reg = makeRegistry();
    loadAlloModule('arcade_mode_boss_encounter.js');
    loadAlloModule('arcade_mode_concept_atlas.js');
    const mode = reg.getMode('concept-atlas');
    expect(mode).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(mode.render(baseCtx({ session: { modeId: 'concept-atlas', startedAt: 404 } })));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('ah-concept-atlas-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-arcade-mode="concept-atlas"]')).not.toBeNull();

    const btns = [...mountEl.querySelectorAll('button')];
    expect(btns.length).toBeGreaterThan(0);
    for (const b of btns) expect(b.getAttribute('type')).toBe('button');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });
});
