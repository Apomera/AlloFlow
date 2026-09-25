// SEL Hub · in high contrast, no text sits yellow on a bright inline background.
//
// Found 2026-09-24 by an axe sweep of every Crew station tool in the high-contrast theme: one failure in
// EVERY tool, the hub header's XP badge ("✨ 0 XP"), 1.27:1. The app's high-contrast CSS forces text
// yellow on every div/span/p/li/label/heading with !important, which beats the badge's inline black
// text, but not its inline background (the hub accent, #00ff00 in this theme). Buttons are repainted
// black by their own high-contrast rule; plain elements are not.
// The gate mounts the real hub with the theme on and checks every plain element with an inline
// background against the forced yellow. SEL_HUB_MODULE_PATH points it at a copy (mutation runs).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');
const styles = readFileSync(resolve(ROOT, 'app_styles_source.jsx'), 'utf8');
const FORCED = '#ffff00';
const FORCED_TAGS = ['DIV', 'SPAN', 'P', 'LI', 'LABEL', 'H1', 'H2', 'H3', 'H4'];

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);

function parseColor(s) {
  s = String(s || '').trim();
  let m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
  m = s.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; }
  return null;
}
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const overBlack = (c) => ({ r: c.r * c.a, g: c.g * c.a, b: c.b * c.a, a: 1 });

let themeRoot;
function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  }
  window.__alloEnsureSelPluginLoaded = () => true;
  window.__alloGetSelPluginState = () => null;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
  // The hub reads the theme from the page (document.querySelector('.theme-contrast')).
  themeRoot = document.createElement('div'); themeRoot.className = 'theme-contrast'; document.body.appendChild(themeRoot);
}

function mountHub() {
  const noop = () => {};
  const Icon = () => null;
  const container = document.createElement('div');
  themeRoot.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }));
  });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe.skipIf(!R)('SEL Hub in the high-contrast theme', () => {
  beforeAll(setup);
  afterAll(() => themeRoot && themeRoot.remove());

  it('the app CSS still forces yellow text on plain elements (what this gate assumes)', () => {
    expect(styles).toMatch(/\.theme-contrast h1, \.theme-contrast h2, [^{]*\.theme-contrast div[^{]*\{[^}]*color:\s*#ffff00 !important/);
  });

  it('every plain element with an inline background keeps forced yellow text readable (4.5:1)', () => {
    const h = mountHub();
    const hub = h.container.querySelector('[role="dialog"][aria-label="SEL Hub"]');
    expect(hub, 'hub did not render').toBeTruthy();
    const checked = [];
    const bad = [];
    for (const el of hub.querySelectorAll('*')) {
      if (!FORCED_TAGS.includes(el.tagName) || !el.textContent.trim()) continue;
      const bg = parseColor(el.style.backgroundColor || el.style.background);
      if (!bg || bg.a === 0) continue;
      const r = ratio(parseColor(FORCED), overBlack(bg));
      checked.push(el);
      if (r < 4.5) bad.push(el.tagName + ' "' + el.textContent.trim().slice(0, 30) + '" on ' + (el.style.backgroundColor || el.style.background) + ': ' + r.toFixed(2));
    }
    expect(checked.some((el) => /XP/.test(el.textContent)), 'the XP badge was not among the checked elements').toBe(true);
    expect(bad).toEqual([]);
    h.unmount();
  });
});
