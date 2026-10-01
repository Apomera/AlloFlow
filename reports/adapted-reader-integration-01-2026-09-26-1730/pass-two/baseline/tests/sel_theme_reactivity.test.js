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
// desktop/web-app/node_modules); the static layer always runs.

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
  // ── dark-base (INVERSE migration): dark = identity, +light/contrast. bg helper = _xxBg. ──
  { id: 'tipp', base: 'dark', bg: '_tpBg' },
  { id: 'maps', base: 'dark', bg: '_mpBg' },
  { id: 'path', base: 'dark', bg: '_paBg' },
  { id: 'sfbt', base: 'dark', bg: '_sfBg' },
  { id: 'dearman', base: 'dark', bg: '_deBg', reg: 'dearMan' },
  { id: 'thoughtrecord', base: 'dark', bg: '_thBg', reg: 'thoughtRecord' },
  { id: 'wheeloflife', base: 'dark', bg: '_wlBg', reg: 'wheelOfLife' },
  { id: 'quietquestions', base: 'dark', bg: '_qqBg', reg: 'quietQuestions' },
  { id: 'crewprotocols', base: 'dark', bg: '_cpBg', reg: 'crewProtocols' },
  { id: 'windowoftolerance', base: 'dark', bg: '_wtBg', reg: 'windowOfTolerance' },
  { id: 'onepageprofile', base: 'dark', bg: '_opBg', reg: 'onePageProfile' },
  { id: 'sleep', base: 'dark', bg: '_sleBg' },
  { id: 'perma', base: 'dark', bg: '_perBg' },
  { id: 'ecomap', base: 'dark', bg: '_ecoBg' },
  { id: 'genogram', base: 'dark', bg: '_genBg' },
  { id: 'landplace', base: 'dark', bg: '_lanBg', reg: 'landPlace' },
  { id: 'bodystory', base: 'dark', bg: '_bodBg', reg: 'bodyStory' },
  { id: 'orientations', base: 'dark', bg: '_oriBg' },
  { id: 'viastrengths', base: 'dark', bg: '_viaBg', reg: 'viaStrengths' },
  { id: 'careercompass', base: 'dark', bg: '_carBg', reg: 'careerCompass' },
  { id: 'traumapsychoed', base: 'dark', bg: '_traBg', reg: 'traumaPsychoed' },
  { id: 'identitysupport', base: 'dark', bg: '_ideBg', reg: 'identitySupport' },
  { id: 'circlesofsupport', base: 'dark', bg: '_cirBg', reg: 'circlesOfSupport' },
  { id: 'safety', base: 'dark', bg: '_safBg' },
  { id: 'sourcesofstrength', base: 'dark', bg: '_souBg', reg: 'sourcesOfStrength' },
  { id: 'substancepsychoed', base: 'dark', bg: '_subBg', reg: 'substancePsychoed' },
  { id: 'sensoryregulation', base: 'dark', bg: '_senBg', reg: 'sensoryRegulation' },
  { id: 'careconstellations', base: 'dark', bg: '_cnsBg', reg: 'careConstellations' },
  { id: 'behavioralactivation', base: 'dark', bg: '_beaBg', reg: 'behavioralActivation' },
  { id: 'healthyrelationships', base: 'dark', bg: '_hreBg', reg: 'healthyRelationships' },
  { id: 'valuescommittedaction', base: 'dark', bg: '_vcaBg', reg: 'valuesCommittedAction' },
  { id: 'motivationalinterviewing', base: 'dark', bg: '_moiBg', reg: 'motivationalInterviewing' },
  { id: 'anxietytoolkit', base: 'dark', bg: '_anxBg', reg: 'anxietyToolkit' },
  { id: 'costbenefit', base: 'dark', bg: '_cobBg', reg: 'costBenefit' },
  { id: 'bigfeelings', base: 'dark', bg: '_bigBg', reg: 'bigFeelings' },
  { id: 'goals', base: 'dark', bg: '_goaBg' },
  { id: 'journal', base: 'dark', bg: '_jouBg' },
  { id: 'social', base: 'dark', bg: '_socBg' },
  { id: 'conflict', base: 'dark', bg: '_cflBg' },
  { id: 'conflicttheater', base: 'dark', bg: '_cftBg' },
  { id: 'decisions', base: 'dark', bg: '_decBg' },
  { id: 'community', base: 'dark', bg: '_comBg' },
  { id: 'perspective', base: 'dark', bg: '_pspBg' },
  { id: 'teamwork', base: 'dark', bg: '_teaBg' },
  { id: 'griefloss', base: 'dark', bg: '_griBg', reg: 'griefLoss' },
  { id: 'stressbucket', base: 'dark', bg: '_sbkBg', reg: 'stressBucket' },
  { id: 'strengths', base: 'dark', bg: '_strBg' },
  { id: 'howl', base: 'dark', bg: '_howBg', reg: 'howlTracker' },
  { id: 'coping', base: 'dark', bg: '_copBg' },
  { id: 'mindfulness', base: 'dark', bg: '_minBg' },
  { id: 'advocacy', base: 'dark', bg: '_advBg' },
  { id: 'disabilityvoices', base: 'dark', bg: '_disBg', reg: 'disabilityVoices' },
  { id: 'zones', base: 'dark', bg: '_zoBg' },                          // inverse on top of its partial P
  // restorativecircle is migrated (static invariant verifies its surfaces are wrapped), but its DEFAULT
  // view renders no themed background, so the default-view diff can't see the flip → renderQuiet.
  { id: 'restorativecircle', base: 'dark', bg: '_rcBg', reg: 'restorativeCircle', renderQuiet: true },
  // emotions already carries a complete-enough ctx.theme P-palette + ST() (pre-existing) — render-only
  // coverage; its light parity is existing-pattern work, not the _xxBg remap.
  { id: 'emotions', partial: true },
];

// dark SURFACE hexes that, in a dark-base tool, MUST be wrapped in _xxBg() (else they stay dark
// in LIGHT mode → a dark island). Checked as raw `background: '#hex'` (the wrapped form is
// `background: _xxBg('#hex')`, and map entries have no `background:` prefix, so neither false-matches).
const DARK_SURFACE_HEXES = ['#0f172a', '#1e293b', '#111827', '#0b1220', '#020617', '#18181b', '#171717', '#0d1117'];

// Tinted light SURFACE hexes that, if present in a migrated tool's render body, MUST be
// wrapped in the tool's _xxC() remap (else they stay light in dark mode → light island or
// light-on-light). #fff/#ffffff are excluded — ambiguous (white-on-color text is constant).
const SURFACE_HEXES = ['#f0fdf4', '#ecfdf5', '#d1fae5', '#dcfce7', '#eff6ff', '#dbeafe', '#e0e7ff', '#fef3c7', '#fffbeb', '#fef9c3', '#fff8f0', '#fef2f2', '#fee2e2', '#faf5ff', '#f5f3ff', '#ede9fe', '#f8fafc', '#f1f5f9', '#fafafa'];

const require = createRequire(import.meta.url);
const MODULES = resolve(process.cwd(), 'desktop/web-app', 'node_modules');
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

      it.skipIf(c.renderQuiet)('light / dark / high-contrast produce three different renders', () => {
        const light = render(rid, {});
        const dark = render(rid, { isDark: true });
        const hc = render(rid, { isContrast: true });
        expect(light, `${c.id}: light vs dark identical → tool ignores ctx.theme`).not.toBe(dark);
        expect(dark, `${c.id}: dark vs high-contrast identical`).not.toBe(hc);
        expect(light).not.toBe(hc);
      });

      it.skipIf(c.renderQuiet)('high-contrast engages the WCAG yellow/black scheme', () => {
        const hc = render(rid, { isContrast: true });
        // #ffff00 (yellow text) is the universal HC marker — present whenever themed text renders.
        // #000000 (black bg) only appears if the tool paints its own surface in the default view
        // (some tools rely on the hub backdrop), so it's not required.
        expect(hc).toContain('#ffff00');
      });
    });
  }
});

// Static source invariant — always runs (no React needed), covers every view.
describe('SEL Hub · migrated tools have no unwrapped tinted-surface literals (ternary-completeness)', () => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const c of CASES) {
    if (c.partial) continue; // own P-palette pattern, not the _xxC/_xxBg remap — render coverage only
    if (c.base === 'dark') {
      it(`${c.id}: dark surfaces in render body route through ${c.bg}() (no dark island in light mode)`, () => {
        const src = readFileSync(resolve(process.cwd(), 'sel_hub', `sel_tool_${c.id}.js`), 'utf8');
        // Check only the RENDER BODY (after the _xxBd helper def). The inverse script is render-body-
        // only by design, so module-level styled helpers (rare) are out of scope — they'd stay dark in
        // light mode (a minor sub-element), flagged for the Canvas pass, not a migration failure.
        const bdName = c.bg.replace(/Bg$/, 'Bd');
        const bdStart = src.indexOf(`${bdName} = function`);
        const body = bdStart >= 0 ? src.slice(src.indexOf(': h); };', bdStart) + 9) : src;
        const leaks = [];
        for (const hex of DARK_SURFACE_HEXES) {
          if (body.includes(`background: '${hex}'`) || body.includes(`backgroundColor: '${hex}'`)) leaks.push(hex);
        }
        expect(leaks, `${c.id}: unwrapped dark backgrounds in render body (must be ${c.bg}('#hex')): ${leaks.join(', ')}`).toEqual([]);
      });
      continue;
    }
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

// WCAG AA contrast invariant — every themed TEXT-on-SURFACE pair the remaps produce (in the
// mode where it's NEW: dark for light-base tools, light for dark-base tools, + high-contrast)
// must meet 4.5:1 (normal text). Pure computation (no React), so it always runs and locks the
// canonical map VALUES — a future edit that picks a low-contrast dark/light shade fails here.
describe('SEL Hub · theme map color pairs meet WCAG AA contrast (≥4.5:1)', () => {
  const _lum = (hex) => {
    const h = hex.replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.substr(i, 2), 16) / 255);
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a, b) => { const L1 = _lum(a), L2 = _lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
  // [text, surface, label] — themed pairs per semantic family.
  const PAIRS = [
    // light-base · DARK mode
    ['#e2e8f0', '#1e293b', 'generic/card'], ['#cbd5e1', '#1e293b', 'secondary/card'], ['#94a3b8', '#1e293b', 'muted/card'],
    ['#e2e8f0', '#0f172a', 'text/page'], ['#6ee7b7', '#0b2e22', 'green/green'], ['#86efac', '#0b2e22', 'green2/green'],
    ['#fca5a5', '#2e1414', 'red/red'], ['#f87171', '#2e1414', 'red2/red'], ['#fde68a', '#2e2410', 'amber/amber'],
    ['#fcd34d', '#2e2410', 'amber2/amber'], ['#93c5fd', '#0e1f3a', 'blue/blue'], ['#c4b5fd', '#2e1b4d', 'purple/purple'],
    // dark-base · LIGHT mode (inverse)
    ['#1e293b', '#f8fafc', 'text/page'], ['#0f172a', '#ffffff', 'text/card'], ['#334155', '#ffffff', 'secondary/card'],
    ['#64748b', '#ffffff', 'muted/card'], ['#065f46', '#f0fdf4', 'green/green'], ['#166534', '#f0fdf4', 'green2/green'],
    ['#991b1b', '#fef2f2', 'red/red'], ['#b91c1c', '#fef2f2', 'red2/red'], ['#b91c1c', '#fee2e2', 'red/red2'],
    ['#92400e', '#fffbeb', 'amber/amber'], ['#78350f', '#fef3c7', 'amber2/amber'], ['#1e3a8a', '#eff6ff', 'blue/blue'],
    ['#075985', '#ecfeff', 'sky/sky'], ['#155e75', '#cffafe', 'cyan/cyan'], ['#0f766e', '#f0fdfa', 'teal/teal'],
    ['#5b21b6', '#faf5ff', 'purple/purple'], ['#9d174d', '#fdf2f8', 'pink/pink'], ['#3730a3', '#eef2ff', 'indigo/indigo'],
    // high-contrast (both directions) + hub palette
    ['#ffff00', '#000000', 'HC yellow/black'], ['#f1f5f9', '#1e293b', 'hub dark text/card'], ['#0f172a', '#f8fafc', 'hub light text/bg'],
  ];
  for (const [text, surf, label] of PAIRS) {
    it(`${text} on ${surf} (${label}) ≥ 4.5:1`, () => {
      const r = ratio(text, surf);
      expect(r, `${text} on ${surf} = ${r.toFixed(2)}:1 (need ≥4.5 for normal text)`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
