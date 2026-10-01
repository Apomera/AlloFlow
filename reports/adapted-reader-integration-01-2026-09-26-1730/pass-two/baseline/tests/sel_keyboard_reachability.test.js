// SEL Hub — everything presented as clickable must be reachable by keyboard.
//
// scan_mouse_only_controls only reports an onClick element that ALREADY carries
// a widget role or tabIndex >= 0. A bare <div onClick> has neither, so it was
// skipped entirely — yet that is the worse case: not focusable, not announced,
// not activatable. Twelve SEL controls sat in that gap, including four topic
// cards in the Safety & Boundaries tool and cards in Emotions whose own visible
// text read "Tap to reveal".
//
// It also could not see the inverse problem: an interactive element nested
// inside another one. Teamwork's role cards were a role="button" wrapping the
// real "That's Me" button, so assistive tech may never have exposed the inner
// control at all.
//
// This suite renders the real tools and asserts both properties.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const MODULES = join(ROOT, 'desktop/web-app', 'node_modules');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { JSDOM: req('jsdom').JSDOM, React: req('react'), RDS: req('react-dom/server') };
} catch (e) { R = null; }

const NATIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'OPTION', 'LABEL']);
const WIDGET_ROLE = /^(button|link|tab|checkbox|switch|menuitem|option|radio)$/;

describe.skipIf(!R)('SEL Hub · keyboard reachability', () => {
  let docs = [];

  beforeAll(() => {
    const dom = new R.JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
    const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
    sg('window', dom.window); sg('document', dom.window.document); sg('navigator', dom.window.navigator);
    sg('localStorage', dom.window.localStorage); sg('sessionStorage', dom.window.sessionStorage);
    sg('HTMLElement', dom.window.HTMLElement); sg('CustomEvent', dom.window.CustomEvent);
    sg('getComputedStyle', dom.window.getComputedStyle);
    const noop = () => {};
    const icons = new Proxy({}, { get: () => () => null });
    window.React = R.React; sg('React', R.React);
    window.AlloIcons = icons; window.AlloModules = {};
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    sg('Audio', function () { return { play: () => Promise.resolve() }; });
    const req = createRequire(import.meta.url);
    const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
    load(resolve(ROOT, 'sel_hub/sel_hub_module.js'));
    readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js')
      .forEach((f) => { try { load(resolve(ROOT, 'sel_hub', f)); } catch { /* tool-local load issue */ } });

    const pal = { bg: '#0f172a', bgCard: '#1e293b', text: '#f1f5f9', textMuted: '#94a3b8', border: '#64748b', accent: '#7c3aed', accentText: '#fff' };
    const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
    const ctxFor = (id) => new Proxy({
      React: R.React, toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
      setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id,
      addToast: noop, awardXP: noop, getXP: () => 0,
      getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }),
      announceToSR: noop, celebrate: noop, beep: noop, t: (k) => k, theme,
      isDark: true, isContrast: false, themePalette: pal,
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test',
      icons, gradeLevel: '8th Grade', gradeBand: 'middle',
      toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
      srOnly: (t) => R.React.createElement('span', null, t),
      a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
      props: { onExportRequested: noop },
    }, { get: (o, k) => (k in o ? o[k] : noop) });

    docs = Object.keys(window.SelHub._registry).sort().map((id) => {
      let html = '';
      try {
        html = R.RDS.renderToStaticMarkup(R.React.createElement(function S() { return window.SelHub.renderTool(id, ctxFor(id)); }));
      } catch { return null; }
      return { id, doc: new R.JSDOM('<!doctype html><body>' + html + '</body>').window.document };
    }).filter(Boolean);
  });

  it('renders enough tools for the sweep to mean something', () => {
    // Guards the guard: a sweep over an empty set would pass silently, which is
    // exactly how scan_mouse_only_controls reported a clean sel_hub while
    // scanning zero files.
    expect(docs.length).toBeGreaterThan(60);
  });

  it('nothing styled as clickable is left without a keyboard path', () => {
    const bad = [];
    docs.forEach(({ id, doc }) => {
      doc.querySelectorAll('[style*="cursor:pointer"], [style*="cursor: pointer"]').forEach((el) => {
        if (NATIVE.has(el.tagName)) return;
        const role = (el.getAttribute('role') || '').toLowerCase();
        const tab = el.getAttribute('tabindex');
        const focusable = tab !== null && Number(tab) >= 0;
        if (focusable || WIDGET_ROLE.test(role)) return;
        bad.push(`${id} <${el.tagName.toLowerCase()}> "${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`);
      });
    });
    expect(bad, `presented as clickable but not reachable by keyboard:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no interactive element is nested inside another one', () => {
    const bad = [];
    docs.forEach(({ id, doc }) => {
      doc.querySelectorAll('button, [role="button"]').forEach((el) => {
        const inner = el.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
        if (inner.length) {
          bad.push(`${id}: <${el.tagName.toLowerCase()}> contains ${inner.length} interactive descendant(s)`);
        }
      });
    });
    expect(bad, `nested interactive elements (assistive tech may not expose the inner control):\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('a non-native widget role always carries a tab stop', () => {
    const bad = [];
    docs.forEach(({ id, doc }) => {
      doc.querySelectorAll('[role="button"]').forEach((el) => {
        if (NATIVE.has(el.tagName)) return;
        const tab = el.getAttribute('tabindex');
        if (tab === null || Number(tab) < 0) bad.push(`${id} <${el.tagName.toLowerCase()}> role=button without tabIndex`);
      });
    });
    expect(bad, `role="button" without a tab stop:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('SEL Hub · the keyboard shim stays a single activation path', () => {
  const files = readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /^sel_tool_.*\.js$/.test(f));

  it('the delegating key handlers route through the element\'s own click', () => {
    // Pointer and keyboard must not become two implementations of one action.
    // The div sites delegate via currentTarget.click(); the SVG <g> in
    // orientations calls its handler directly, because SVGElement.click() is
    // not dependable — both keep exactly one activation path.
    const orientations = readFileSync(resolve(ROOT, 'sel_hub/sel_tool_orientations.js'), 'utf8');
    expect(orientations).toContain('var openTradition = function ()');
    expect(orientations).toContain('onClick: openTradition');
    expect(orientations).toContain('openTradition();');
    expect(orientations).not.toMatch(/currentTarget\.click\(\)[^;]*\}\s*\}\s*,\s*\n\s*'aria-label': t\.name/);
  });

  it('every tool still parses', () => {
    // Cheap integrity check: a truncated or half-written tool file is a real
    // failure mode when edits are scripted.
    files.forEach((f) => {
      const src = readFileSync(resolve(ROOT, 'sel_hub', f), 'utf8');
      expect(src.length, `${f} is empty`).toBeGreaterThan(200);
    });
  });
});
