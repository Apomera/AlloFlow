// Calculus stage B (2026-11-03): the new student and teacher flows driven through the real UI in jsdom:
// improper integrals, the e^2x warning, Euler's method, series, applied missions and AP free response.
// CALCULUS_DEEP_FILE points the suite at another copy of the tool (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, errors = [], C = null;
const MARK = '⟦T⟧';

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
  loadTool(FILE, 'calculus');
  C = window.__CalculusCore;
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
});

async function mount(init, extra) {
  const out = { latest: null, xp: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {} }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
async function unmount() { if (root) await React.act(async () => root.unmount()); root = null; }
const btn = (text, scope) => [...(scope || container).querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const radio = (labelText, scope) => [...(scope || container).querySelectorAll('label')].find((l) => (l.textContent || '').includes(labelText)).querySelector('input[type="radio"]');
// Exact label match for mission options: "x² + y² = 10" is a substring of "x² + y² = 100".
const radioExact = (labelText) => [...container.querySelectorAll('label')].find((l) => (l.textContent || '').trim() === labelText).querySelector('input[type="radio"]');
const text = () => container.textContent;
function seedFor(pred, gen) { for (let s = 1; s < 5000; s++) if (pred(gen(s))) return s; throw new Error('no seed'); }

describe('improper integrals in the Integral tab', () => {
  it('ln x on [0, 1]: predict first, the table appears after, and the value −1 is evaluated', async () => {
    const m = await mount({ tab: 'integral' });
    const panel = () => container.querySelector('[data-calc-improper]');
    expect(panel().getAttribute('data-calc-improper')).toBe('converges');
    expect(panel().querySelector('[data-calc-imp-table]'), 'no table before the attempt').toBeNull();
    expect(panel().textContent).not.toMatch(/equals −1|−1\.0000/);
    await click(radio('Converges, to the value:', panel()));
    await type(panel().querySelector('input[aria-label="Predicted value of the integral"]'), '-1');
    await click(btn('Commit my prediction', panel()));
    expect(panel().querySelector('[data-calc-imp-table]')).toBeTruthy();
    expect(panel().textContent).toContain('So the integral converges: it equals −1.');
    expect(m.xp.length).toBe(1);
    expect(Object.keys(m.latest.missionXP).some((k) => k.startsWith('imp:'))).toBe(true);
  });

  it('1/x on [1, ∞): "f → 0 so it converges" is named, a second try, then the honest divergence', async () => {
    const m = await mount({ tab: 'integral', impText: '1/x', impA: '1', impB: 'inf' });
    const panel = () => container.querySelector('[data-calc-improper]');
    expect(panel().getAttribute('data-calc-improper')).toBe('diverges');
    await click(radio('Converges, to the value:', panel()));
    await type(panel().querySelector('input[aria-label="Predicted value of the integral"]'), '0');
    await click(btn('Commit my prediction', panel()));
    expect(panel().textContent).toContain('f → 0 is not enough');
    expect(panel().querySelector('[data-calc-imp-table]'), 'second try before any reveal').toBeNull();
    await click(btn('Commit my prediction', panel()));
    // Stage C: two tries, then the answer is offered, not forced.
    expect(panel().querySelector('[data-calc-imp-table]')).toBeNull();
    await click(btn('Show the answer (no credit)', panel()));
    expect(panel().querySelector('[data-calc-imp-table]')).toBeTruthy();
    expect(panel().textContent).toContain('So the integral diverges');
    expect(m.xp.length, 'no credit after a reveal').toBe(0);
    expect(m.latest.calcMissed.at(-1)).toMatchObject({ mode: 'improper', mis: 'terms_to_zero_integral' });
  });

  it('1/x on [−1, 1]: answering 0 names the cancelling-infinities misconception; teacher no-reveal hides the tables', async () => {
    await mount({ tab: 'integral', impText: '1/x', impA: '-1', impB: '1', teacherNoReveal: true });
    const panel = () => container.querySelector('[data-calc-improper]');
    for (let i = 0; i < 2; i++) {
      await click(radio('Converges, to the value:', panel()));
      await type(panel().querySelector('input[aria-label="Predicted value of the integral"]'), '0');
      await click(btn('Commit my prediction', panel()));
      expect(panel().textContent).toContain('∞ − ∞ is not 0');
    }
    expect(panel().querySelector('[data-calc-imp-table]')).toBeNull();
    expect(panel().textContent).toContain('ask your teacher');
  });

  it('the panel is a disclosure: open in BC or when the integral above is improper, closed otherwise', async () => {
    for (const [st, open] of [[{ calcBand: 'pre' }, false], [{ calcBand: 'bc' }, true], [{ calcBand: 'ab', fnMode: 'typed', fnText: '1/x', xMin: 0, xMax: 2 }, true], [{ calcBand: 'ab', impText: 'ln(x)' }, true]]) {
      await mount(Object.assign({ tab: 'integral' }, st));
      expect(container.querySelector('details[data-calc-improper]').open, JSON.stringify(st)).toBe(open);
      expect(container.querySelector('details[data-calc-improper] > summary').textContent).toContain('Improper integrals');
      await unmount();
    }
  });

  it('the improper integral above can be handed to the explorer, and presets change the problem', async () => {
    const m = await mount({ tab: 'integral', fnMode: 'typed', fnText: '1/x^2', xMin: 0, xMax: 2 });
    await click(btn('Study the integral above as an improper integral'));
    expect(m.latest.impText).toBe('1/x^2');
    expect(container.querySelector('[data-calc-improper]').getAttribute('data-calc-improper')).toBe('diverges');
    await click([...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Use the integral of 1/(1 + x^2) from −∞ to ∞'));
    expect(container.querySelector('[data-calc-improper]').getAttribute('data-calc-improper')).toBe('converges');
    expect(errors).toEqual([]);
  });
});

describe('the e^2x ambiguity in the function box', () => {
  it('warns, explains the reading and offers e^(2x)', async () => {
    const m = await mount({ tab: 'integral', fnMode: 'typed', fnText: 'e^2x' });
    const note = container.querySelector('[data-calc-ambiguity]');
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('e^2·x');
    await click(btn('Use e^(2x)', note));
    expect(m.latest.fnText).toBe('e^(2x)');
    expect(container.querySelector('[data-calc-ambiguity]')).toBeNull();
  });
});

describe("Euler's method on the slope field", () => {
  it('step table first, error hidden; quarter is named; half is right and the error table appears', async () => {
    const m = await mount({ tab: 'visualize', vizView: 'slope', vizOde: 0, vizSlopeX: 0, vizSlopeY: 1 });
    const panel = () => container.querySelector('[data-calc-euler]');
    expect(panel().getAttribute('data-calc-euler')).toBe('half');
    expect(panel().querySelector('[data-calc-euler-steps]').getAttribute('data-calc-euler-steps')).toBe('5');
    await click(btn('0.25', panel()));
    expect(m.latest.eulerH).toBe(0.25);
    expect(panel().querySelector('[data-calc-euler-steps]').getAttribute('data-calc-euler-steps')).toBe('9');
    expect(panel().textContent).not.toContain('Exact y');
    await click(radio('It drops to about a quarter', panel()));
    await click(btn('Commit my prediction', panel()));
    expect(panel().textContent).toContain('Euler’s method is first order');
    expect(panel().querySelector('[data-calc-euler-revealed]')).toBeNull();
    await click(radio('It is about halved', panel()));
    await click(btn('Commit my prediction', panel()));
    expect(panel().querySelector('[data-calc-euler-revealed]')).toBeTruthy();
    expect(panel().textContent).toContain('Exact y');
    expect(panel().textContent).toContain('BELOW the true value');
    expect(m.xp.length).toBe(1);
    await click(btn('Draw the Euler path on the field', panel()));
    expect(m.latest.eulerOn).toBe(true);
    expect(m.latest.vizUserInteracted.ode).toBe(true);
    // The canvas path has a text equivalent: h = 0.25 from (0, 1) reaches 1.25^8 at x = 2.
    const desc = container.querySelector('#calc-viz-desc').textContent;
    expect(desc).toContain('Euler’s method with h = 0.25');
    expect(desc).toContain('y ≈ ' + (1.25 ** 8).toFixed(2));
    expect(desc).toContain('dashed orange curve');
  });

  it('the equation with no formula says so and uses a reference', async () => {
    await mount({ tab: 'visualize', vizView: 'slope', vizOde: 4, vizSlopeX: -1, vizSlopeY: 0.5 });
    expect(container.querySelector('[data-calc-euler]').textContent).toContain('no solution formula in elementary functions');
    expect(errors).toEqual([]);
  });
});

describe('Series tab', () => {
  it('harmonic practice: "terms → 0 means converges" is named; the tables wait for the commit', async () => {
    const seed = seedFor((s) => s.fam === 'p' && s.a === 1, (s) => C.genSeries(C.seeded(s), 'bc'));
    const m = await mount({ tab: 'series', serMode: 'practice', serSeed: seed, serBand: 'bc', calcBand: 'bc' });
    expect(text()).toContain('Σ 1/n (n from 1');
    expect(container.querySelector('[data-calc-series-tables]')).toBeNull();
    await click(radio('Converges'));
    await click(radio('The ratio test'));
    await click(btn('Commit my prediction'));
    expect(text()).toContain('Terms going to 0 is needed, but it is not enough');
    expect(container.querySelector('[data-calc-series-tables]')).toBeNull();
    await click(radio('Diverges'));
    await click(radio('Neither: it needs another test'));
    await click(btn('Commit my prediction'));
    expect(container.querySelector('[data-calc-series-tables]')).toBeTruthy();
    expect(m.xp.length).toBe(1);
  });

  it('explorer: the harmonic spotlight asks first, then shows partial sums creeping past every bound', async () => {
    const m = await mount({ tab: 'series', serMode: 'explore', serPick: 0, serN: 1000000 });
    expect(container.querySelector('[data-calc-series-partials]')).toBeNull();
    await click(radio('They level off'));
    await click(btn('Commit my prediction'));
    expect(text()).toContain('Terms going to 0 is needed');
    const table = container.querySelector('[data-calc-series-partials]');
    expect(table.textContent).toContain('14.392727');
    expect(m.latest.calcMissed.at(-1).mis).toBe('terms_zero_converges');
    await click(btn('Σ n!/10^n'));
    expect(container.querySelector('[data-calc-series-partials]').textContent).toContain('too large to show');
    expect(errors).toEqual([]);
  });
});

describe('Rates and optimization missions', () => {
  it('ladder: wrong model and missing chain rule are named, then the mission completes for 5 XP once', async () => {
    const m = await mount({ tab: 'apply' });
    await click(btn('The sliding ladder'));
    const mis = C.genMission('ladder', C.seeded(m.latest.misSeed));
    const choose = async (id) => { const o = mis.steps[m.latest.misIdx].options.find((x) => x.id === id); await click(radioExact(o.text)); await click(btn('Check this step')); };
    await choose('early');
    expect(text()).toContain('Differentiate first, then substitute');
    await choose('ok');
    await choose('nochain');
    expect(text()).toContain('chain rule applies');
    await choose('ok');
    const numIn = () => container.querySelector('input[aria-labelledby="calc-ms-step"]');
    await type(numIn(), String(mis.p.b));
    await click(btn('Check this step'));
    await type(numIn(), String(-mis.steps[3].answer));
    await click(btn('Check this step'));
    expect(text()).toContain('The top slides DOWN the wall');
    await type(numIn(), `-${mis.p.a * mis.p.k}/${mis.p.b}`);
    await click(btn('Check this step'));
    expect(container.querySelector('[data-calc-mission-done]')).toBeTruthy();
    expect(m.xp).toEqual([['calculus', 5, 'Completed an applied mission']]);
    // A second mission with one revealed step: it completes, but earns nothing.
    await click(btn('Another mission like this'));
    const mis2 = C.genMission('ladder', C.seeded(m.latest.misSeed));
    const choose2 = async (id) => { const o = mis2.steps[m.latest.misIdx].options.find((x) => x.id === id); await click(radioExact(o.text)); await click(btn('Check this step')); };
    await choose2('sum');
    await choose2('nosq');
    expect(text()).not.toContain('Shown (no credit)');
    await click(btn('Show the answer (no credit)'));
    expect(text()).toContain('Shown (no credit)');
    await choose2('ok');
    await type(numIn(), String(mis2.p.b));
    await click(btn('Check this step'));
    await type(numIn(), String(mis2.steps[3].answer));
    await click(btn('Check this step'));
    expect(container.querySelector('[data-calc-mission-done]').textContent).toContain('Shown to you: 1');
    expect(m.xp.length, 'no XP for a mission with a revealed step').toBe(1);
  });

  it('box: the typed model is checked by value and "cut once" is named; a revealed step earns no XP', async () => {
    const m = await mount({ tab: 'apply', misKind: 'box' });
    await click(btn('The open box'));
    const mis = C.genMission('box', C.seeded(m.latest.misSeed)), { a, b } = mis.p;
    const inp = () => container.querySelector('input[aria-labelledby="calc-ms-step"]');
    await type(inp(), `x(${a} - x)(${b} - x)`);
    await click(btn('Check this step'));
    expect(text()).toContain('each side loses 2x');
    await type(inp(), `x(${a} - x)(${b} - x)`);
    await click(btn('Check this step'));
    await click(btn('Show the answer (no credit)'));
    expect(text()).toContain('Shown (no credit)');
    expect(m.latest.misResults[0]).toMatchObject({ ok: false, revealed: true, mis: 'cut_once' });
    expect(m.latest.misIdx).toBe(1);
    expect(errors).toEqual([]);
  });
});

describe('AP free response', () => {
  it('particle motion: each part checked, the rubric counts first attempts', async () => {
    const m = await mount({ tab: 'frq' });
    await click(btn('Particle motion'));
    const q = C.genFRQ('particle', C.seeded(m.latest.frqSeed));
    const part = (id) => container.querySelector('[data-calc-frq-part="' + id + '"]');
    const answer = async (id, value) => { await type(part(id).querySelector('input[type="text"]'), value); await click(btn('Check this part', part(id))); };
    const P = (id) => q.parts.find((x) => x.id === id);
    await answer('a', String(P('a').answer));
    await answer('b1', q.p.p + ', ' + q.p.q);
    // Stage C: b2 is written in the student's words, then its elements are marked from lists.
    const area = part('b2').querySelector('textarea');
    await React.act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, 'It turns where v is zero.'); area.dispatchEvent(new Event('input', { bubbles: true })); });
    await click(radio('v(t) = 0 at t =', part('b2')));
    await click(radio('v(t) > 0 for 0', part('b2')));
    await click(radio('So the particle changes direction', part('b2')));
    await click(btn('Check this part', part('b2')));
    expect(part('b2').textContent).toContain('the rate must CHANGE SIGN');
    await click(radio('v(t) changes sign', part('b2')));
    await click(btn('Check this part', part('b2')));
    await answer('c', String(P('c').answer));
    await answer('d', String(P('c').answer));
    expect(part('d').textContent).toContain('That is the displacement');
    await answer('d', String(P('d').answer));
    expect(container.querySelector('[data-calc-frq-score]').getAttribute('data-calc-frq-score')).toBe('3/6');
    expect(m.xp.length).toBe(1);
    expect(text()).toContain('After feedback: 6 out of 6');
  });
});

describe('stage B mounts cleanly, names every control and translates every sentence', () => {
  const states = [
    { tab: 'series' }, { tab: 'series', serMode: 'explore', serPick: 3 }, { tab: 'series', serMode: 'explore', serPick: 0, serHarmDone: true, serHarmPred: 'grows' },
    { tab: 'series', serMode: 'practice', serSeed: 77, serBand: 'bc', serTries: 2, serCommitted: true, serLast: { conv: 'conv', test: 'ratio' } },
    { tab: 'apply' }, { tab: 'apply', misKind: 'cone', misSeed: 9, misIdx: 2 }, { tab: 'apply', misKind: 'box', misSeed: 9, misIdx: 6, misResults: [{ ok: true, tries: 1 }, { ok: true, tries: 1 }, { ok: true, tries: 1 }, { ok: true, tries: 2 }, { ok: true, tries: 1 }, { ok: false, revealed: true, mis: 'critical_not_max' }] },
    { tab: 'frq' }, { tab: 'frq', frqKind: 'analysis', frqSeed: 5 }, { tab: 'frq', frqKind: 'accum', frqSeed: 5, frqRubricOpen: { a: true } }, { tab: 'frq', frqKind: 'series', frqSeed: 5, calcBand: 'bc' },
    { tab: 'integral', impText: '1/x', impA: '-1', impB: '1', impKey: '1/x|-1|1', impTries: 2, impCommitted: true, impLast: { kind: 'div' } },
    { tab: 'integral', impText: 'sqrt(x)', impA: '-1', impB: '1' }, { tab: 'integral', fnMode: 'typed', fnText: 'e^2x' },
    { tab: 'visualize', vizView: 'slope', vizOde: 3, eulerKey: '3|0|0.5', vizSlopeY: 0.5, eulerDone: true, eulerTries: 1, eulerLast: 'half', eulerOn: true },
    { tab: 'visualize', vizView: 'slope', vizOde: 1, vizSlopeX: -1, vizSlopeY: 1, eulerKey: '1|-1|1', eulerTries: 1, eulerLast: 'quarter', eulerPick: 'quarter', eulerHintRung: 2 },
    { tab: 'series', serMode: 'practice', serSeed: 77, serBand: 'bc', serHintRung: 3 }, { tab: 'series', serMode: 'explore', serPick: 0 },
    { tab: 'apply', misKind: 'ladder', misSeed: 9, misHintRung: 2 }, { tab: 'apply', misKind: 'box', misSeed: 9, misIdx: 0, misInput: 'x(10-2x)^2', misTries: 1, misFeedback: { idx: 0, ok: false, mis: 'cut_once' } },
    { tab: 'frq', frqKind: 'particle', frqSeed: 5, frqTries: { a: 1 }, frqFeedback: { a: { ok: false, mis: 'velocity_not_accel', fin: false } }, frqRubricOpen: { d: true } },
    { tab: 'integral', impText: 'ln(x)', impA: '0', impB: '1', impKey: 'ln(x)|0|1', impTries: 1, impLast: { kind: 'div' }, impPred: { kind: 'conv', value: '' }, impHintRung: 3 }
  ];
  function unnamed() {
    return [...container.querySelectorAll('button, input, select, textarea')].filter((el) => {
      if (el.type === 'hidden') return false;
      if ((el.getAttribute('aria-label') || '').trim() || (el.textContent || '').trim()) return false;
      if (el.id && container.querySelector('label[for="' + el.id + '"]')) return false;
      return !el.closest('label') && !el.getAttribute('aria-labelledby');
    }).map((el) => el.outerHTML.slice(0, 120));
  }
  it('every state mounts with no console error, no NaN, and named controls', async () => {
    for (const st of states) {
      for (const band of ['pre', 'ab', 'bc']) {
        await mount(Object.assign({ calcBand: band }, st), { isTeacherMode: true });
        expect(errors, JSON.stringify(st)).toEqual([]);
        const bad = /\bNaN\b|undefined\b(?! here)|Infinity/.exec(text());
        expect(bad ? text().slice(Math.max(0, bad.index - 100), bad.index + 30) : '', JSON.stringify(st)).toBe('');
        expect(unnamed(), JSON.stringify(st)).toEqual([]);
        await unmount();
      }
    }
  });

  it('with a marker translator, the only unmarked text left is math notation', async () => {
    const MATH_WORDS = /\b(sin|cos|tan|sqrt|ln|log|exp|abs|floor|sign|asin|acos|atan|sec|csc|cot|lim|dx|dt|dy|du|df|dh|ft|in|cm|max|min|n\/a)\b/g;
    const all = [];
    for (const st of states) {
      function App() {
        const [state, setState] = React.useState({ calculus: Object.assign({}, st) });
        return window.StemLab._registry.calculus.render(makeCtx({ toolData: state, setToolData: setState, t: (k, fb) => MARK + fb, isTeacherMode: true }));
      }
      root = ReactDOMClient.createRoot(container);
      await React.act(async () => root.render(React.createElement(App)));
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode, s = node.nodeValue.trim();
        if (!s || s.includes(MARK) || node.parentElement.closest('style')) continue;
        if (s.replace(MATH_WORDS, '').match(/[A-Za-z]{3,}/g)) all.push((st.tab) + ': ' + s.slice(0, 60));
      }
      for (const el of container.querySelectorAll('[aria-label],[placeholder],[title]')) for (const attr of ['aria-label', 'placeholder', 'title']) {
        const v = (el.getAttribute(attr) || '').trim();
        if (v && !v.includes(MARK) && v.replace(MATH_WORDS, '').match(/[A-Za-z]{3,}/g)) all.push(st.tab + ' ' + attr + ': ' + v.slice(0, 60));
      }
      await unmount();
    }
    expect([...new Set(all)]).toEqual([]);
  });

  it('the teacher panel counts the new work, and old saves (3 equations, unknown kinds) still load', async () => {
    await mount({ tab: 'challenge', missionXP: { 'imp:ln(x)|0|1': true, 'ser:5': true, 'mis:box:3': true, 'frq:particle:9': true, 'eul:0|0|1': true } }, { isTeacherMode: true });
    const panel = container.querySelector('[data-calculus-teacher]').textContent;
    for (const label of ['Improper integrals decided1', 'Euler predictions right1', 'Series classified1', 'Rate and optimization missions completed (no reveals)1', 'Free-response questions completed1']) expect(panel).toContain(label);
    await unmount();
    await mount({ tab: 'apply', misKind: 'rocket', misSeed: 'x', misResults: 'bad', misIdx: 99 });
    await unmount();
    await mount({ tab: 'frq', frqKind: 'series', frqSeed: 3, frqResults: null, frqInputs: 7 });
    await unmount();
    await mount({ tab: 'visualize', vizView: 'slope', vizOde: 2, eulerH: 7 });
    expect(errors).toEqual([]);
  });
});
