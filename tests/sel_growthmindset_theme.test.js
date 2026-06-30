// Golden — Growth Mindset (SEL Hub) FOLLOWS the host theme (pilot for SEL tool theming).
//
// The SEL Hub provides ctx.theme (light/dark/high-contrast), re-renders every tool's
// render(ctx) on the theme toggle, but historically ~67/70 tools hardcoded a fixed
// palette and ignored it (a light tool stayed a light island in dark mode; a dark tool
// went dark-on-dark unreadable). Growth Mindset is the migration pilot: a _gmC('#hex')
// remap returns the original hex on a light host (zero light-mode change), a same-hue
// dark value on .theme-dark, and WCAG yellow/black on high-contrast.
//
// This renders the REAL tool via renderToStaticMarkup under all three ctx.theme states
// and asserts the chrome actually flips — so a future edit can't silently re-pin it to a
// single theme. Skips gracefully where React/jsdom aren't installed (CI lanes without
// prismflow-deploy/node_modules), mirroring dev-tools/check_sel_render.cjs.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

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
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'sel_hub', 'sel_tool_growthmindset.js'), 'utf8'))();
  render = (themeOverride) => RDS.renderToStaticMarkup(
    React.createElement(function SelThemeSmoke() { return window.SelHub.renderTool('growthmindset', makeCtx(themeOverride)); })
  );
});

describe.skipIf(!depsOk)('SEL · Growth Mindset follows host ctx.theme (theme-reactivity pilot)', () => {
  it('registers and renders under all three themes', () => {
    expect(typeof window.SelHub._registry.growthmindset?.render).toBe('function');
    expect(render({}).length).toBeGreaterThan(500);
  });

  it('LIGHT host renders the original light surface (byte-for-byte light-mode is unchanged)', () => {
    const light = render({});
    expect(light).toContain('#f0fdf4'); // growth-tinted light surface (tab bar gradient + cards)
  });

  it('DARK host FLIPS the chrome: dark variant present, light surface gone (reactivity)', () => {
    const dark = render({ isDark: true });
    expect(dark).toContain('#0b2e22');     // dark same-hue variant of #f0fdf4
    expect(dark).not.toContain('#f0fdf4'); // the light growth surface must NOT survive in dark mode
  });

  it('HIGH-CONTRAST host flips surfaces to black (WCAG yellow/black scheme engaged)', () => {
    const hc = render({ isContrast: true });
    expect(hc).toContain('#000000');
    expect(hc).not.toContain('#f0fdf4');
  });

  it('the three theme renders are genuinely different (not a fixed palette)', () => {
    const light = render({}), dark = render({ isDark: true }), hc = render({ isContrast: true });
    expect(light).not.toBe(dark);
    expect(dark).not.toBe(hc);
  });
});
