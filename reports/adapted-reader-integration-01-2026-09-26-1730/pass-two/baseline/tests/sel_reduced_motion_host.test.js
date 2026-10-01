// SEL Hub — reduced motion must not depend on which tool the student opened.
//
// Eleven inline `animation:` declarations live in compassion (floating hearts) and
// growthmindset (growing bars, sparkles). An inline style beats a stylesheet rule,
// so only an `!important` rule stands them down — and the hub's only such rule was
// injected by growthmindset's own render. A student who never opened Growth Mindset
// had no accommodation in any SEL tool.
//
// The host now installs it for every tool, scoped to the tool shells.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDS: req('react-dom/server') };
} catch { R = null; }

describe.skipIf(!R)('SEL Hub · reduced motion is installed by the host', () => {
  beforeAll(() => {
    const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
    const noop = () => {};
    sg('React', R.React); window.React = R.React;
    window.AlloIcons = new Proxy({}, { get: () => () => null });
    window.AlloModules = window.AlloModules || {};
    window.callGemini = null;
    if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    sg('Audio', function () { return { play: () => Promise.resolve() }; });
    const req = createRequire(import.meta.url);
    const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
    load(join(SEL, 'sel_hub_module.js'));
    readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort()
      .forEach((f) => { try { load(join(SEL, f)); } catch { /* tool-local load issue */ } });
  }, 60000);

  function styleEl() { return document.getElementById('sel-hub-reduced-motion'); }

  function ctxFor(id) {
    const noop = () => {};
    const pal = { bg: '#0f172a', bgCard: '#1e293b', text: '#f1f5f9', textMuted: '#94a3b8', border: '#64748b', accent: '#7c3aed', accentText: '#fff' };
    const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
    const base = {
      React: R.React, toolData: {}, update: noop, updateMulti: noop, addToast: noop, awardXP: noop, announceToSR: noop,
      getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }),
      t: (k) => k, theme, isDark: true, isContrast: false, themePalette: pal,
      callGemini: null, callTTS: null, icons: new Proxy({}, { get: () => () => null }),
      gradeLevel: '8th Grade', gradeBand: 'middle', selHubTool: id,
      srOnly: (t) => R.React.createElement('span', null, t),
      a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: {},
    };
    return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  }

  it('is not installed merely by loading the tool scripts', () => {
    // Loading a script must not mutate document.head — the doctrine that moved
    // growthmindset's injection out of module scope in the first place.
    expect(styleEl(), 'the rule was installed at module load, not at render').toBeNull();
  });

  it('rendering ANY tool installs it — not just growthmindset', () => {
    // compassion is the tool with unmitigated inline animations and no rule of its own.
    const Probe = () => window.SelHub.renderTool('compassion', ctxFor('compassion'));
    R.RDS.renderToStaticMarkup(R.React.createElement(Probe));
    const el = styleEl();
    expect(el, 'rendering compassion did not install the reduced-motion rule').toBeTruthy();
    const css = el.textContent;
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    // !important is the whole point: without it an inline `animation:` wins.
    expect(css, 'animation-duration is not !important, so inline animations still run').toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(css).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it('is scoped to the SEL tool shells, not the whole app', () => {
    const css = styleEl().textContent;
    expect(css, 'scoped to the dark tool shell').toContain('[data-sel-tool-shell]');
    expect(css, 'scoped to the standard tool shell').toContain('[data-sel-standard-shell]');
    // A bare universal selector would reach the entire host app.
    expect(/(^|[{,\s])\*\s*(,|\{)/m.test(css.replace(/\[[^\]]+\]\s*\*/g, '')), 'rule uses an unscoped universal selector').toBe(false);
  });

  it('is idempotent across renders', () => {
    for (const id of ['compassion', 'growthmindset', 'zones']) {
      const Probe = () => window.SelHub.renderTool(id, ctxFor(id));
      R.RDS.renderToStaticMarkup(R.React.createElement(Probe));
    }
    expect(document.querySelectorAll('#sel-hub-reduced-motion').length, 'duplicate style elements injected').toBe(1);
  });

  it('the tools carrying inline animations are covered by the shell scope', () => {
    // If a tool ever opts out of both shells, the rule cannot reach its animations.
    for (const name of ['compassion', 'growthmindset']) {
      const src = readFileSync(join(SEL, 'sel_tool_' + name + '.js'), 'utf8');
      expect(/animation:\s*['"]?sel/.test(src), name + ': expected inline animations here').toBe(true);
      expect(/lightBackground:\s*true/.test(src), name + ' opts out of the dark shell; check the scope still reaches it').toBe(false);
    }
  });
});
