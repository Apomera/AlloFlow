// Golden — SEL Hub tools FOLLOW the host theme (ctx.theme reactivity coverage).
//
// The hub builds ctx.theme (light/dark/high-contrast) and re-invokes each tool's
// render(ctx) on the theme toggle, but most tools historically hardcoded a fixed
// palette and ignored it. Migrated tools use a per-tool _xxC('#hex') remap (light
// path = identity → zero light-mode change; dark/high-contrast remap). As each is
// migrated, add {id, helper} to CASES.
//
// Two layers of evidence per tool:
//   (1) RENDER — the real tool rendered under light/dark/high-contrast ctx.theme must
//       produce THREE DIFFERENT outputs (it reads the theme), and high-contrast must
//       engage the WCAG yellow/black scheme.
//   (2) STATIC source invariant — no tinted-surface hex may appear UNWRAPPED (not
//       inside _xxC(...)) in the render body. Runs without React, covers every view
//       (not just the default tab), and catches the ternary/concat class the render
//       test can't see. This is the strong guarantee that surfaces actually flip.
//
// Skips the render layer where React/jsdom aren't installed (CI lanes without
// prismflow-deploy/node_modules); the static layer always runs.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const CASES = [
  { id: 'growthmindset',  helper: '_gmC' },
  { id: 'friendship',     helper: '_frC' },
  { id: 'compassion',     helper: '_coC' },
  { id: 'voicedetective', helper: '_vdC' },
  { id: 'peersupport',    helper: '_peC' },
  { id: 'transitions',    helper: '_trC' },
  { id: 'sociallab',      helper: '_slC' },
  { id: 'execfunction',   helper: '_efC' },
  { id: 'digitalwellbeing', helper: '_dwC', reg: 'digitalWellbeing' }, // registers camelCase
  { id: 'upstander',      helper: '_upC' },
  { id: 'crisiscompanion', helper: '_ccC' },
];

// Tinted light SURFACE hexes that, if present in a migrated tool's render body, MUST be
// wrapped in the tool's _xxC() remap (else they stay light in dark mode → light island or
// light-on-light). #fff/#ffffff are excluded — ambiguous (white-on-color text is constant).
const SURFACE_HEXES = ['#f0fdf4', '#ecfdf5', '#d1fae5', '#dcfce7', '#eff6ff', '#dbeafe', '#e0e7ff', '#fef3c7', '#fffbeb', '#fef9c3', '#fff8f0', '#fef2f2', '#fee2e2', '#faf5ff', '#f5f3ff', '#ede9fe', '#f8fafc', '#f1f5f9', '#fafafa'];

const require = createRequire(import.meta.url);
const MODULES = resolve(process.cwd(), 'prismflow-deploy', 'node_modules');
let React, RDS, depsOk = true;
try {
  React = require(resolve(MODULES, 'react'));
  RDS = require(resolve(MODULES, 'react-dom', 'server'));
} catch { depsOk = false; }

const noop = () => {};
const stubComp = () => null;
const iconsProxy = new Proxy({}, { get: () => stubComp });
const palProxy = new Proxy({}, { get: () => '#888888' });

function makeCtx(themeOverride) {
  const themeBase = Object.assign({ isDark: false, isContrast: false, reduceMotion: false, palette: palProxy }, themeOverride || {});
  const theme = new Proxy(themeBase, { get: (o, p) => (p in o ? o[p] : '#888888') });
  const base = {
    React, toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, addToast: noop, awardXP: noop, getXP: () => 0,
    announceToSR: noop, celebrate: noop, beep: noop, t: (k) => k,
    theme, isDark: themeBase.isDark, isContrast: themeBase.isContrast,
    callGemini: null, callTTS: null, onSafetyFlag: noop, icons: iconsProxy,
    gradeLevel: '5th Grade', gradeBand: 'middle',
    srOnly: (txt) => React.createElement('span', null, txt),
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }), props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

let render;
beforeAll(() => {
  if (!depsOk) return;
  window.React = React;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  if (!window.SelHub) {
    window.SelHub = {
      _registry: {}, _order: [],
      registerTool: function (id, c) { if (!this._registry[id]) this._order.push(id); this._registry[id] = c; },
      renderTool: function (id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
    };
  }
  const dir = resolve(process.cwd(), 'sel_hub');
  for (const f of readdirSync(dir).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js' && !/^_build/.test(f)).sort()) {
    // eslint-disable-next-line no-new-func
    try { new Function(readFileSync(join(dir, f), 'utf8'))(); } catch { /* a tool that won't load is just absent from coverage */ }
  }
  render = (id, themeOverride) => RDS.renderToStaticMarkup(
    React.createElement(function SelThemeSmoke() { return window.SelHub.renderTool(id, makeCtx(themeOverride)); })
  );
});

describe.skipIf(!depsOk)('SEL Hub · tools render differently per ctx.theme (reactivity)', () => {
  for (const c of CASES) {
    const rid = c.reg || c.id; // registry id (camelCase for some) vs c.id (filename stem)
    describe(c.id, () => {
      it('registers and renders', () => {
        expect(typeof window.SelHub._registry[rid]?.render).toBe('function');
        expect(render(rid, {}).length).toBeGreaterThan(500);
      });

      it('light / dark / high-contrast produce three different renders', () => {
        const light = render(rid, {});
        const dark = render(rid, { isDark: true });
        const hc = render(rid, { isContrast: true });
        expect(light, `${c.id}: light vs dark identical → tool ignores ctx.theme`).not.toBe(dark);
        expect(dark, `${c.id}: dark vs high-contrast identical`).not.toBe(hc);
        expect(light).not.toBe(hc);
      });

      it('high-contrast engages the WCAG yellow/black scheme', () => {
        const hc = render(rid, { isContrast: true });
        expect(hc).toContain('#000000');
        expect(hc).toContain('#ffff00');
      });
    });
  }
});

// Static source invariant — always runs (no React needed), covers every view.
describe('SEL Hub · migrated tools have no unwrapped tinted-surface literals (ternary-completeness)', () => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const c of CASES) {
    it(`${c.id}: every tinted surface in the render body routes through ${c.helper}()`, () => {
      const src = readFileSync(resolve(process.cwd(), 'sel_hub', `sel_tool_${c.id}.js`), 'utf8');
      const mark = ': hex); };'; // end of the _xxC = function(hex){...} helper definition
      const body = src.slice(src.indexOf(mark) + mark.length);
      const leaks = [];
      for (const hex of SURFACE_HEXES) {
        const re = new RegExp(`(?<!${esc(c.helper)}\\()'${esc(hex)}'`, 'g');
        const m = body.match(re);
        if (m) leaks.push(`${hex} ×${m.length}`);
      }
      expect(leaks, `${c.id}: unwrapped tinted surfaces (must be ${c.helper}('#hex')): ${leaks.join(', ')}`).toEqual([]);
    });
  }
});
