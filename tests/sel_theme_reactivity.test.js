// Golden — SEL Hub tools FOLLOW the host theme (ctx.theme reactivity coverage).
//
// The hub builds ctx.theme (light/dark/high-contrast) and re-invokes each tool's
// render(ctx) on the theme toggle, but most tools historically hardcoded a fixed
// palette and ignored it. As tools are migrated to a per-tool _xxC('#hex') remap
// (light path = identity → zero light-mode change; dark/high-contrast remap), add
// them to CASES below: each renders the REAL tool via renderToStaticMarkup under all
// three ctx.theme states and asserts a known light surface FLIPS to its dark variant
// (and the light surface is gone in dark / high-contrast) — so a future edit can't
// silently re-pin a migrated tool to one theme.
//
// Skips gracefully where React/jsdom aren't installed (CI lanes without
// prismflow-deploy/node_modules), mirroring dev-tools/check_sel_render.cjs.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

// Tinted light SURFACE hexes that, if present in a migrated tool's render body, MUST be
// wrapped in the tool's _xxC() remap (else they stay light in dark mode → light island or
// light-on-light). The exact-string migration missed these inside ternaries/concats; this
// static invariant catches that whole class (any view, no render needed). #fff/#ffffff are
// excluded — they're ambiguous (white-on-color text is legitimately constant).
const SURFACE_HEXES = ['#f0fdf4', '#eff6ff', '#fef3c7', '#fffbeb', '#faf5ff', '#f5f3ff', '#fef2f2', '#fee2e2', '#ede9fe', '#f8fafc', '#fff8f0', '#d1fae5', '#ecfdf5'];

const require = createRequire(import.meta.url);
const MODULES = resolve(process.cwd(), 'prismflow-deploy', 'node_modules');
let React, RDS, depsOk = true;
try {
  React = require(resolve(MODULES, 'react'));
  RDS = require(resolve(MODULES, 'react-dom', 'server'));
} catch { depsOk = false; }

// id → a (light surface, its dark variant) pair that must appear/disappear on the flip.
const CASES = [
  { id: 'growthmindset',  helper: '_gmC', light: '#f0fdf4', dark: '#0b2e22' },
  { id: 'friendship',     helper: '_frC', light: '#fffbeb', dark: '#2e2410' },
  { id: 'compassion',     helper: '_coC', light: '#faf5ff', dark: '#2e1b4d' },
  // default tab is plain #fff cards (no tinted surface) → match the property-qualified form
  { id: 'voicedetective', helper: '_vdC', light: 'background:#fff', dark: 'background:#1e293b' },
];

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
    callGemini: null, onSafetyFlag: noop, icons: iconsProxy,
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
  // Load every sel_hub plugin (except the React hub module + _build helpers) so each
  // tool's own globals exist before render — same load set as check_sel_render.cjs.
  const dir = resolve(process.cwd(), 'sel_hub');
  for (const f of readdirSync(dir).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js' && !/^_build/.test(f)).sort()) {
    // eslint-disable-next-line no-new-func
    try { new Function(readFileSync(join(dir, f), 'utf8'))(); } catch { /* a tool that won't load is just absent from CASES coverage */ }
  }
  render = (id, themeOverride) => RDS.renderToStaticMarkup(
    React.createElement(function SelThemeSmoke() { return window.SelHub.renderTool(id, makeCtx(themeOverride)); })
  );
});

describe.skipIf(!depsOk)('SEL Hub · tools follow host ctx.theme (theme-reactivity coverage)', () => {
  for (const c of CASES) {
    describe(c.id, () => {
      it('registers and renders in all three themes', () => {
        expect(typeof window.SelHub._registry[c.id]?.render).toBe('function');
        expect(render(c.id, {}).length).toBeGreaterThan(500);
      });

      it('LIGHT shows its light surface; DARK flips it to the dark variant (reactivity)', () => {
        const light = render(c.id, {});
        const dark = render(c.id, { isDark: true });
        expect(light, `${c.id}: light surface ${c.light} should render on a light host`).toContain(c.light);
        expect(dark, `${c.id}: dark variant ${c.dark} should render on a dark host`).toContain(c.dark);
        expect(dark, `${c.id}: light surface ${c.light} must NOT survive in dark mode`).not.toContain(c.light);
      });

      it('HIGH-CONTRAST flips surfaces to black (light surface gone)', () => {
        const hc = render(c.id, { isContrast: true });
        expect(hc).toContain('#000000');
        expect(hc).not.toContain(c.light);
      });
    });
  }
});

// Static source invariant — catches the ternary/concat class the render test (default-view
// only) can't see. Runs WITHOUT React (no skip), so it guards every migrated tool's full
// source, every view. A bare tinted-surface literal not wrapped in the tool's _xxC() = a
// dark-mode light island / light-on-light regression.
describe('SEL Hub · migrated tools have no unwrapped tinted-surface literals (ternary-completeness)', () => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const c of CASES) {
    it(`${c.id}: every tinted surface in the render body routes through ${c.helper}()`, () => {
      const src = readFileSync(resolve(process.cwd(), 'sel_hub', `sel_tool_${c.id}.js`), 'utf8');
      // render body = everything after the _xxC helper definition (skips the maps + module data)
      const mark = ': hex); };';
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
