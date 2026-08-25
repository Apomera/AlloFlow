// SEL Hub — the Culture Quiz must teach something after every answer.
//
// The quiz ran 30 questions whose only feedback was a toast: "Correct!" or
// "The answer was: X". Every question now carries a one-line `why`, rendered in
// a role="status" panel under the options once the student has answered, so a
// screen reader hears it without focus leaving the options.
//
// Two assertions: the authored bank (every question has a substantive why), and
// the RENDER (the panel appears with the why after an answer and not before).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const SRC = readFileSync(join(SEL, 'sel_tool_cultureexplorer.js'), 'utf8');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDS: req('react-dom/server') };
} catch { R = null; }

// Pull the bank out of the source and EXECUTE it, so the rotation IIFE is
// irrelevant and the assertion sees the objects the tool actually uses.
function bank() {
  const start = SRC.indexOf('var QUIZ_BANKS = {');
  const end = SRC.indexOf('};', start) + 2;
  const fn = new Function(SRC.slice(start, end) + '\nreturn QUIZ_BANKS;');
  return fn();
}

describe('SEL Hub · Culture Quiz explanations', () => {
  it('every question in every band carries a substantive why', () => {
    const banks = bank();
    const bands = Object.keys(banks);
    expect(bands.sort()).toEqual(['elementary', 'high', 'middle']);
    let n = 0;
    for (const band of bands) {
      for (const q of banks[band]) {
        n++;
        expect(typeof q.why, band + ': "' + q.q + '" has no why').toBe('string');
        expect(q.why.length, band + ': why too short for "' + q.q + '"').toBeGreaterThanOrEqual(60);
        // A why that just restates the answer teaches nothing.
        expect(q.why.trim(), band + ': why is only the answer for "' + q.q + '"').not.toBe(q.opts[q.ans]);
      }
    }
    expect(n).toBe(30);
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
        t: (k) => k, theme, isDark: true, isContrast: false, callGemini: null, callTTS: null, callImagen: null,
        icons: new Proxy({}, { get: () => () => null }), gradeLevel: '5th Grade', gradeBand: 'elementary',
        a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: {},
      };
      const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
      const tool = registry.cultureExplorer;
      const Probe = () => tool.render(ctx);
      return R.RDS.renderToStaticMarkup(R.React.createElement(Probe));
    }

    it('shows the why in a status panel after an answer, and not before', () => {
      const q = bank().elementary.slice(0, 2);
      const before = render({ cultureExplorer: { tab: 'quiz', quizActive: true, quizQuestions: q, quizIndex: 0 } });
      expect(before, 'quiz view did not render').toContain('culture-quiz-question');
      expect(before.includes(q[0].why.slice(0, 40)), 'why leaked before the student answered').toBe(false);

      const wrong = (q[0].ans + 1) % q[0].opts.length;
      const after = render({ cultureExplorer: { tab: 'quiz', quizActive: true, quizQuestions: q, quizIndex: 0, quizAnswer: wrong } });
      expect(after, 'no status panel after answering').toMatch(/role="status"[^>]*aria-live="polite"/);
      expect(after, 'why not rendered after a wrong answer').toContain(q[0].why.slice(0, 40));
      expect(after, 'wrong answer did not name the right option').toContain('The answer is ' + q[0].opts[q[0].ans]);

      const right = render({ cultureExplorer: { tab: 'quiz', quizActive: true, quizQuestions: q, quizIndex: 0, quizAnswer: q[0].ans } });
      expect(right, 'why not rendered after a correct answer').toContain(q[0].why.slice(0, 40));
      expect(right).toContain('Correct.');
    });
  });
});
