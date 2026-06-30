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

const require = createRequire(import.meta.url);
const MODULES = resolve(process.cwd(), 'prismflow-deploy', 'node_modules');
let React, RDS, depsOk = true;
try {
  React = require(resolve(MODULES, 'react'));
  RDS = require(resolve(MODULES, 'react-dom', 'server'));
} catch { depsOk = false; }

// id → a (light surface, its dark variant) pair that must appear/disappear on the flip.
const CASES = [
  { id: 'growthmindset', light: '#f0fdf4', dark: '#0b2e22' },
  { id: 'friendship',    light: '#fffbeb', dark: '#2e2410' },
  { id: 'compassion',    light: '#faf5ff', dark: '#2e1b4d' },
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
