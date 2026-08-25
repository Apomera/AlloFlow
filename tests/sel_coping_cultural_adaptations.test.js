// SEL Hub — coping's culturally-responsive practice guidance must reach the screen.
//
// Every CULTURAL_ADAPTATIONS entry carries adaptations: [{traditional, adaptation,
// why}] — 165 rows across 33 contexts. The Learn > Cultural renderer read every
// sibling field (context, shortDesc, whyItMatters, considerations, helpfulResources)
// and never touched this one, so the section showed the background reading and
// withheld the actionable part: what to do differently, and why.
//
// This renders the real tool in that section and asserts the rows appear. An
// authored-only check would have passed for as long as the bug existed.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const SRC = readFileSync(join(SEL, 'sel_tool_coping.js'), 'utf8');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDS: req('react-dom/server') };
} catch { R = null; }

// Execute the authored array so the assertions see the real objects.
function adaptationsData() {
  const start = SRC.indexOf('var CULTURAL_ADAPTATIONS = [');
  expect(start, 'CULTURAL_ADAPTATIONS not found').toBeGreaterThan(-1);
  const end = SRC.indexOf('\n  ];', start) + '\n  ];'.length;
  return new Function(SRC.slice(start, end) + '\nreturn CULTURAL_ADAPTATIONS;')();
}

describe('SEL Hub · coping cultural adaptations', () => {
  it('every context authors practice adaptations with a reason', () => {
    const data = adaptationsData();
    expect(data.length, 'expected the full contexts list').toBeGreaterThanOrEqual(30);
    const missing = data.filter((c) => !Array.isArray(c.adaptations) || !c.adaptations.length).map((c) => c.id);
    expect(missing, 'contexts with no adaptations authored').toEqual([]);
    let rows = 0;
    for (const c of data) {
      for (const a of c.adaptations) {
        rows++;
        expect(typeof a.traditional, c.id + ': adaptation row has no `traditional`').toBe('string');
        expect(typeof a.adaptation, c.id + ': adaptation row has no `adaptation`').toBe('string');
        expect(typeof a.why, c.id + ': adaptation row has no `why` — the reason is the teaching').toBe('string');
      }
    }
    expect(rows).toBeGreaterThanOrEqual(150);
  });

  describe.skipIf(!R)('render', () => {
    let registry;
    beforeAll(() => {
      const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
      const noop = () => {};
      sg('React', R.React); window.React = R.React;
      window.AlloIcons = new Proxy({}, { get: () => () => null });
      window.callGemini = null;
      if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
      sg('Audio', function () { return { play: () => Promise.resolve() }; });
      window.SelHub = {
        _registry: {},
        registerTool(id, config) { this._registry[id] = config; },
        isRegistered(id) { return !!this._registry[id]; },
        getRegisteredTools() { return Object.values(this._registry); },
        renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
        safeRehearseCheck: () => ({ action: 'continue' }),
        assessSafety: () => Promise.resolve({ tier: 0 }),
      };
      new Function(SRC)();
      registry = window.SelHub._registry;
    });

    function render(toolData) {
      const noop = () => {};
      const palette = new Proxy({}, { get: () => '#888888' });
      const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette }, { get: (o, p) => (p in o ? o[p] : '#888888') });
      const base = {
        React: R.React, toolData, update: noop, updateMulti: noop, addToast: noop, awardXP: noop, announceToSR: noop,
        t: (k) => k, theme, isDark: true, isContrast: false, callGemini: null, callTTS: null,
        icons: new Proxy({}, { get: () => () => null }), gradeLevel: '8th Grade', gradeBand: 'middle',
        a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: {},
      };
      const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
      const Probe = () => registry.coping.render(ctx);
      return R.RDS.renderToStaticMarkup(R.React.createElement(Probe));
    }

    it('renders the adaptation rows in Learn > Cultural', () => {
      const html = render({ coping: { activeTab: 'learn', learnSection: 'cultural' } });
      const data = adaptationsData();
      const first = data[0];

      expect(html, 'cultural section did not render').toContain(first.context);
      expect(html, 'no disclosure for the adaptation rows').toContain('Practice adaptations');
      expect(html, 'the "instead of" column is missing').toContain('Instead of:');
      expect(html, 'the "try" column is missing').toContain('Try:');
      expect(html, 'the reason is missing — that is the teaching').toContain('Why:');

      // The real authored text, not just the labels.
      const row = first.adaptations[0];
      expect(html, 'authored adaptation text not rendered').toContain(row.adaptation.slice(0, 40));
      expect(html, 'authored reason not rendered').toContain(row.why.slice(0, 40));

      // Calibration: a different Learn section must NOT show them, or the
      // assertion above would pass on a renderer that ignores the section.
      const other = render({ coping: { activeTab: 'learn', learnSection: 'dbt' } });
      expect(other.includes('Practice adaptations'), 'adaptations leak into other Learn sections').toBe(false);
    });

    it('the rows are inside a keyboard-operable native disclosure', () => {
      const html = render({ coping: { activeTab: 'learn', learnSection: 'cultural' } });
      // <details>/<summary> is operable by keyboard with no JS; a div toggle is not.
      const idx = html.indexOf('Practice adaptations');
      const before = html.slice(Math.max(0, idx - 400), idx);
      expect(before, 'adaptations disclosure is not a native <details>/<summary>').toMatch(/<details[^>]*>\s*<summary/);
    });
  });
});
