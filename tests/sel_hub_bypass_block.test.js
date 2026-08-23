// SEL Hub — a way past the 46 controls that sit before the first tool.
//
// Measured on the rendered catalog: 117 tab stops, and 46 of them come before
// the first tool card — quick actions, four teacher launch plans, the search
// box, eleven need chips, ten category filters, eight pathways, the station
// builder. Every one is a real control, so the fix is not fewer stops, it is a
// documented way past them (WCAG 2.4.1, Bypass Blocks).
//
// A button rather than an anchor: this panel is a modal surface inside an SPA,
// and a #hash target would change the URL under the host app.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { JSDOM: req('jsdom').JSDOM, React: req('react'), RDS: req('react-dom/server') };
} catch { R = null; }

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

describe.skipIf(!R)('SEL Hub · the catalog can be bypassed', () => {
  let doc, stops, cards;

  beforeAll(() => {
    const dom = new R.JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
    const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
    sg('window', dom.window); sg('document', dom.window.document); sg('navigator', dom.window.navigator);
    sg('localStorage', dom.window.localStorage); sg('sessionStorage', dom.window.sessionStorage);
    sg('HTMLElement', dom.window.HTMLElement); sg('CustomEvent', dom.window.CustomEvent);
    sg('getComputedStyle', dom.window.getComputedStyle);
    const noop = () => {};
    const Icon = () => null;
    window.React = R.React; sg('React', R.React);
    window.AlloIcons = new Proxy({}, { get: () => Icon });
    window.AlloModules = {};
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    sg('Audio', function () { return { play: () => Promise.resolve() }; });
    const req = createRequire(import.meta.url);
    const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
    load(resolve(ROOT, 'sel_hub/sel_hub_module.js'));
    readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js')
      .forEach((f) => { try { load(resolve(ROOT, 'sel_hub', f)); } catch { /* tool-local load issue */ } });
    window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
    const html = R.RDS.renderToStaticMarkup(R.React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '8th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon,
      onExportRequested: noop,
    }));
    doc = new R.JSDOM('<!doctype html><body>' + html + '</body>').window.document;
    stops = [...doc.querySelectorAll(FOCUSABLE)].filter((el) => {
      const ti = el.getAttribute('tabindex');
      return !(ti !== null && Number(ti) < 0) && !el.hasAttribute('disabled');
    });
    cards = [...doc.querySelectorAll('[data-sel-tool-card-id]')];
  });

  it('renders a catalog worth bypassing (guards the guard)', () => {
    expect(cards.length).toBeGreaterThan(60);
    expect(stops.length).toBeGreaterThan(80);
  });

  it('offers a skip control near the very top', () => {
    const skip = stops.findIndex((el) => /skip to the tool list/i.test(el.textContent || ''));
    expect(skip, 'no skip control found in the tab order').toBeGreaterThan(-1);
    // It only helps if it comes before the controls it exists to skip.
    expect(
      skip,
      `the skip control is tab stop ${skip + 1}; it must sit among the first few`,
    ).toBeLessThan(6);
  });

  it('the skip control points at a target that can actually take focus', () => {
    const grid = doc.getElementById('sel-tool-grid');
    expect(grid, 'no #sel-tool-grid to receive focus').toBeTruthy();
    // -1 keeps it out of the tab order while still allowing programmatic focus.
    expect(grid.getAttribute('tabindex')).toBe('-1');
    expect(grid.querySelectorAll('[data-sel-tool-card-id]').length).toBeGreaterThan(60);
  });

  it('the skip actually saves the presses it claims to', () => {
    const skip = stops.findIndex((el) => /skip to the tool list/i.test(el.textContent || ''));
    const firstCard = stops.indexOf(cards[0]);
    // Without the skip, reaching the first tool costs every stop before it.
    expect(firstCard, 'the grid should still sit well down the tab order').toBeGreaterThan(20);
    expect(
      firstCard - skip,
      'the skip control should be far above the grid, otherwise it saves nothing',
    ).toBeGreaterThan(20);
  });
});
