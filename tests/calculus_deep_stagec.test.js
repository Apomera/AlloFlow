// Calculus stage C (2026-11-03): the band learning path and tab order, one reveal rule on every
// tab (two tries, then "Show the answer", no credit), the Integral tab's exact value routed
// through the improper-integral analysis, written FRQ justifications checked by their marked
// elements, translated quest labels, and one hint-ladder look. Driven through the real UI in jsdom
// and the math core. CALCULUS_DEEP_FILE points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, errors = [], C = null;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
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
  expect(el, 'field to type in').toBeTruthy();
  await React.act(async () => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const radio = (labelText, scope) => { const l = [...(scope || container).querySelectorAll('label')].find((x) => (x.textContent || '').includes(labelText)); expect(l, 'radio ' + labelText).toBeTruthy(); return l.querySelector('input[type="radio"]'); };
const text = () => container.textContent;
const tabIds = () => [...container.querySelectorAll('[role="tab"]')].map((t) => t.id.replace('calculus-tab-', ''));
const ALL_TABS = ['challenge', 'derivHunt', 'derivative', 'discover', 'integral', 'limits', 'visualize', 'series', 'apply', 'frq'];

describe('learning path and tab order by level', () => {
  const PATHS = { pre: ['limit', 'avgrate', 'slope', 'area'], ab: ['deriv', 'anti', 'ftc', 'optim', 'frq'], bc: ['anti', 'improper', 'euler', 'series', 'frqser'] };
  const CORE = { pre: ['limits', 'derivative', 'challenge', 'integral'], ab: ['derivative', 'integral', 'discover', 'apply', 'frq'], bc: ['integral', 'series', 'visualize', 'frq', 'derivative'] };

  it('each level has its own 4-5 step path, and its core tabs come first while every tab stays reachable', async () => {
    for (const band of ['pre', 'ab', 'bc']) {
      await mount({ calcBand: band });
      const path = container.querySelector('[data-calc-path]');
      expect(path.getAttribute('data-calc-path')).toBe(band);
      // Engagement pass 2026-11-04: the list is folded behind a one-line Next; open it to read every step.
      expect(path.querySelector('[data-calc-path-next]').getAttribute('data-calc-path-next')).toBe(PATHS[band][0]);
      await click(btn('Show the path', path));
      expect([...path.querySelectorAll('[data-calc-path-step]')].map((li) => li.getAttribute('data-calc-path-step'))).toEqual(PATHS[band]);
      const ids = tabIds();
      expect(ids.slice(0, CORE[band].length), band).toEqual(CORE[band]);
      expect([...ids].sort()).toEqual([...ALL_TABS].sort());
      expect(text()).toContain('More activities');
      await unmount();
    }
  });

  it('ticks come from the saved progress keys, and Go opens the activity', async () => {
    const m = await mount({ calcBand: 'pre', missionXP: { 'lim:99': true }, calcSolved: { avgrate: 2 }, methodsUsed: { left: true } });
    await click(btn('Show the path'));
    const step = (id) => container.querySelector('[data-calc-path-step="' + id + '"]');
    expect(['limit', 'avgrate', 'slope', 'area'].map((id) => step(id).getAttribute('data-done'))).toEqual(['true', 'true', 'false', 'false']);
    expect(container.querySelector('[data-calc-path-done]').getAttribute('data-calc-path-done')).toBe('2/4');
    await click(btn('Go', step('slope')));
    expect(m.latest.tab).toBe('challenge');
    expect(m.latest.calcChallengeMode).toBe('deriv');
    expect(btn('You are here', step('slope'))).toBeTruthy();
    await unmount();
    const m2 = await mount({ calcBand: 'bc', missionXP: { 'eul:0|0|1': true, 'ser:harmonic': true, 'frq:series:4': true } });
    await click(btn('Show the path'));
    const st2 = (id) => container.querySelector('[data-calc-path-step="' + id + '"]').getAttribute('data-done');
    expect(st2('euler')).toBe('true');
    expect(st2('series'), 'the harmonic spotlight alone is not a classified series').toBe('false');
    expect(st2('frqser')).toBe('true');
    await click(btn('Go', container.querySelector('[data-calc-path-step="euler"]')));
    expect(m2.latest).toMatchObject({ tab: 'visualize', vizView: 'slope' });
  });

  it('the path folds away (open until every step is done), and arrow keys walk the reordered tabs', async () => {
    await mount({ calcBand: 'ab', missionXP: { 'dfx:x²': true, 'anti:x²': true, m2: true, 'mis:box:1': true, 'frq:accum:3': true } });
    expect(container.querySelector('#calc-path-list'), 'all done: folded').toBeNull();
    await click(btn('Show the path'));
    expect(container.querySelectorAll('[data-calc-path-step][data-done="true"]').length).toBe(5);
    await unmount();
    const m = await mount({ calcBand: 'pre', tab: 'limits' });
    const first = container.querySelector('#calculus-tab-limits');
    await React.act(async () => { first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(m.latest.tab).toBe('derivative');
    await React.act(async () => { document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    expect(m.latest.tab).toBe(tabIds().at(-1));
  });

  it('quest labels are getters that use the last render’s language', async () => {
    const hooks = window.StemLab._registry.calculus.questHooks;
    expect(hooks.map((q) => q.id)).toEqual(['explore_integral', 'try_all_methods', 'predict_correctly']);
    expect(Object.getOwnPropertyDescriptor(hooks[0], 'label').get).toBeTypeOf('function');
    await mount({}, { t: (k, fb) => '«' + fb });
    for (const q of hooks) expect(q.label.startsWith('«'), q.id).toBe(true);
    expect(hooks[1].progress({ methodsUsed: { left: 1, right: 1 } })).toBe('«2/4 methods');
  });
});

describe('one reveal rule: two tries, then the answer is offered, never forced; a reveal earns nothing', () => {
  it('limits: after two misses the tables wait for "Show the answer"; no XP; teacher no-reveal offers none', async () => {
    const m = await mount({ tab: 'limits', limitMode: 'explore', fnMode: 'typed', fnText: '(x^2 - 4)/(x - 2)', limitA: 2 });
    for (let i = 0; i < 2; i++) {
      await click([...container.querySelectorAll('input[name="calc-lim-pred"]')][i === 0 ? 3 : 1]);
      await click(btn('Commit my prediction'));
    }
    expect(container.querySelector('[data-calc-limits] table')).toBeNull();
    expect(container.querySelector('[data-calc-reveal-offer="offer"]')).toBeTruthy();
    expect(btn('Commit my prediction'), 'no third try').toBeUndefined();
    await click(btn('Show the answer (no credit)'));
    expect(container.querySelectorAll('[data-calc-limits] table').length).toBe(2);
    expect(m.xp).toEqual([]);
    await unmount();
    await mount({ tab: 'limits', limitMode: 'explore', fnMode: 'typed', fnText: '(x^2 - 4)/(x - 2)', limitA: 2, teacherNoReveal: true, limitTries: 2, limitLastPred: { kind: 'dne' } });
    expect(container.querySelector('[data-calc-reveal-offer="teacher"]')).toBeTruthy();
    expect(btn('Show the answer')).toBeUndefined();
    expect(container.querySelector('[data-calc-limits] table')).toBeNull();
  });

  it('series, Euler and graph match follow the same rule', async () => {
    const seed = (() => { for (let s = 1; s < 5000; s++) { const x = C.genSeries(C.seeded(s), 'bc'); if (x.fam === 'p' && x.a === 1) return s; } })();
    const m = await mount({ tab: 'series', calcBand: 'bc', serMode: 'practice', serSeed: seed, serBand: 'bc' });
    for (let i = 0; i < 2; i++) { await click(radio('Converges')); await click(radio('The ratio test')); if (i === 0) await click(btn('Commit my prediction')); }
    // The tried pair stays selectable: a different test on the second try.
    await click(radio('The nth-term'));
    await click(btn('Commit my prediction'));
    expect(container.querySelector('[data-calc-series-tables]')).toBeNull();
    await click(btn('Show the answer (no credit)'));
    expect(container.querySelector('[data-calc-series-tables]')).toBeTruthy();
    expect(m.xp).toEqual([]);
    await unmount();

    const e = await mount({ tab: 'visualize', vizView: 'slope', vizOde: 0, vizSlopeX: 0, vizSlopeY: 1 });
    const panel = () => container.querySelector('[data-calc-euler]');
    await click(radio('It drops to about a quarter', panel()));
    await click(btn('Commit my prediction', panel()));
    await click(radio('It stays about the same', panel()));
    await click(btn('Commit my prediction', panel()));
    expect(panel().querySelector('[data-calc-euler-revealed]')).toBeNull();
    await click(btn('Show the answer (no credit)', panel()));
    expect(panel().querySelector('[data-calc-euler-revealed]')).toBeTruthy();
    expect(e.xp).toEqual([]);
    await unmount();

    const g = C.genMatch(C.seeded(424242), 'ab', 'deriv'), wrong = g.opts.filter((o) => o.mis);
    await mount({ tab: 'derivative', calcBand: 'ab', matchKind: 'deriv', matchQuiz: { seed: 424242, band: 'ab', kind: 'deriv', tried: [], picked: null, answered: false } });
    for (const w of wrong.slice(0, 2)) { await click(btn('Graph ' + w.id)); await click(btn('Commit my choice')); }
    expect(text()).not.toContain('✓');
    await click(btn('Show the answer (no credit)'));
    expect(btn('Graph ' + g.answer).textContent).toContain('✓');
  });

  it('the Integral over/under question and the AP free-response number parts follow it too', async () => {
    const m = await mount({ tab: 'integral', mode: 'left', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 4 });
    const ou = (label) => [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label);
    await click(ou('OVERestimate'));
    await click(ou('Exact estimate'));
    expect(m.latest.overUnderChecked).toBeFalsy();
    expect(container.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain('hidden until you answer');
    expect(ou('UNDERestimate'), 'no third try').toBeUndefined();
    await click(btn('Show the answer (no credit)'));
    expect(m.latest.overUnderChecked).toBe(true);
    expect(text()).toContain('Not quite:');
    await unmount();

    const f = await mount({ tab: 'frq', frqKind: 'particle', frqSeed: 5 });
    const q = C.genFRQ('particle', C.seeded(5)), part = (id) => container.querySelector('[data-calc-frq-part="' + id + '"]');
    for (let i = 0; i < 2; i++) { await type(part('c').querySelector('input[type="text"]'), String(q.parts.find((x) => x.id === 'd').answer)); await click(btn('Check this part', part('c'))); }
    expect(part('c').textContent).not.toContain('Answer:');
    expect(f.latest.frqResults.c, 'not scored until the reveal').toBeUndefined();
    await click(btn('Show the answer (no credit)', part('c')));
    expect(part('c').textContent).toContain('Answer:');
    expect(f.latest.frqResults.c).toMatchObject({ ok: false, revealed: true });
    expect(f.latest.calcMissed.at(-1)).toMatchObject({ mode: 'frq', mis: 'distance_vs_displacement' });
  });

  it('every tab’s hint ladder has the same look', async () => {
    const states = [
      { tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', calcQuiz: { mode: 'deriv', a: 2, b: 1, c: 3, x0: 1, answer: 5, band: 'ab', answered: false, attempts: 0, tried: [], opts: [{ id: '5', value: 5 }, { id: '6', value: 6, mis: 'height_not_slope' }] } },
      { tab: 'limits', limitMode: 'practice', limitSeed: 5 },
      { tab: 'integral', impText: 'ln(x)' },
      { tab: 'series', serMode: 'practice', serSeed: 5 },
      { tab: 'apply', misKind: 'ladder', misSeed: 9 },
      { tab: 'derivative', matchQuiz: { seed: 424242, band: 'ab', kind: 'deriv', tried: [], answered: false } },
      { tab: 'visualize', vizView: 'slope', vizSlopeY: 1 }
    ];
    for (const st of states) {
      await mount(st);
      const ladders = [...container.querySelectorAll('[data-calc-hints]')];
      expect(ladders.length, st.tab).toBeGreaterThan(0);
      for (const l of ladders) {
        expect(l.className, st.tab).toContain('border-amber-400');
        expect(btn('Hint 1 of', l), st.tab).toBeTruthy();
      }
      await unmount();
    }
  });
});

describe('Integral tab: the exact value is routed through the improper-integral analysis', () => {
  const at = (fnText, xMin, xMax, mode) => mount({ tab: 'integral', fnMode: 'typed', fnText, xMin, xMax, mode: mode || 'midpoint', n: 20 });
  const note = () => container.querySelector('[data-calc-exact-kind]');
  const label = () => container.querySelector('svg[role="img"]').getAttribute('aria-label');

  it('∫₋₁¹ ln|x| and ∫₋₁⁸ x^(−1/3) are labelled improper (convergent), with their values', async () => {
    await at('ln|x|', -1, 1);
    expect(note().getAttribute('data-calc-exact-kind')).toBe('converges');
    expect(note().textContent).toContain('Improper (convergent)');
    expect(note().textContent).toContain('equals -2.0000');
    expect(label()).toContain('the integral is improper; it converges to -2.0000');
    expect(text()).toContain('Improper (convergent)-2.0000');
    await unmount();
    await at('x^(-1/3)', -1, 8);
    expect(note().getAttribute('data-calc-exact-kind')).toBe('converges');
    expect(note().textContent).toContain('near x = 0');
    expect(note().textContent).toContain('equals 4.5000');
    expect(label()).toContain('converges to 4.5000');
  });

  it('divergent, undefined and ordinary integrals are each said honestly', async () => {
    await at('1/x', -1, 1);
    expect(note().getAttribute('data-calc-exact-kind')).toBe('diverges');
    expect(note().textContent).toContain('∞ − ∞ has no value');
    expect(note().textContent).toContain('the integral is improper');
    await unmount();
    await at('1/x^2', 0, 2);
    expect(note().getAttribute('data-calc-exact-kind')).toBe('diverges');
    expect(note().textContent).toContain('grows without bound');
    await unmount();
    await at('sqrt(x)', -1, 1);
    expect(note().getAttribute('data-calc-exact-kind')).toBe('domain');
    await unmount();
    await at('x^2', 0, 3, 'simpson');
    expect(note()).toBeNull();
    // Engagement pass 2026-11-04: the exact value waits for the over/under question on every method.
    expect(label()).toContain('hidden until you answer');
    await click(btn('Show the exact value without answering'));
    expect(label()).toContain('exact integral 9.0000');
    expect(container.querySelector('[data-signed-area]')).toBeTruthy();
  });

  it('the over/under question and signed-area panel are for ordinary integrals only; the improper panel opens', async () => {
    await at('ln|x|', -1, 1, 'left');
    expect([...container.querySelectorAll('button')].some((b) => b.getAttribute('aria-label') === 'OVERestimate')).toBe(false);
    expect(container.querySelector('[data-signed-area]')).toBeNull();
    expect(container.querySelector('details[data-calc-improper]').open).toBe(true);
    expect(btn('Study the integral above as an improper integral')).toBeTruthy();
    expect(errors).toEqual([]);
  });
});

describe('AP free response: written justifications, checked by their marked elements', () => {
  it('every FRQ type has a justification part; the model choices satisfy the rubric and are TRUE for the problem', () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const kind of ['particle', 'analysis', 'accum', 'series']) {
        const q = C.genFRQ(kind, C.seeded(seed)), J = q.parts.filter((p) => p.type === 'justify');
        expect(J.length, kind).toBeGreaterThanOrEqual(1);
        for (const pt of J) {
          const picks = C.justifyModel(pt);
          expect(Object.keys(picks).sort()).toEqual(pt.slots.map((s) => s.id).sort());
          expect(C.gradeStep(pt, { text: 'my words', picks }).ok, kind + ' ' + seed).toBe(true);
        }
        const P = q.p;
        if (kind === 'particle') {
          const v = (t) => (t - P.p) * (t - P.q);
          expect(v(0) > 0 && v((P.p + P.q) / 2) < 0 && v((P.q + P.T) / 2) > 0, 'sign pattern + − +').toBe(true);
        }
        if (kind === 'analysis') {
          const f = C.compile(P.fText.replace(/−/g, '-')).f, h = 1e-4;
          const fpp = (f(P.p + h) - 2 * f(P.p) + f(P.p - h)) / (h * h);
          expect(fpp, 'f″(p) < 0, so the Second Derivative Test option is true').toBeLessThan(0);
          let best = -Infinity; for (let x = P.lo; x <= P.hi + 1e-9; x += 0.01) best = Math.max(best, f(x));
          expect(best, '"absolute maximum only at x = p" is false').toBeGreaterThanOrEqual(f(P.p) - 1e-9);
        }
        if (kind === 'accum') {
          const g = (x) => P.k * (P.r * x - x * x / 2);
          expect(P.gr).toBeCloseTo(g(P.r), 12);
          expect(P.gX).toBeCloseTo(g(P.X), 12);
          expect(P.gr > 0 && P.gr > P.gX, 'g(r) is the largest candidate').toBe(true);
        }
        if (kind === 'series') {
          for (const n of [1, 2, 7]) expect(Math.pow(P.b, n) / (n * Math.pow(P.b, n))).toBeCloseTo(1 / n, 12);
        }
      }
    }
  });

  it('the grader needs words AND every list; a wrong element names its misconception; a mismatched test is named', () => {
    const a = C.genFRQ('analysis', C.seeded(5)).parts.find((p) => p.id === 'b2');
    expect(C.gradeStep(a, { text: '  ', picks: { test: 'fdt', cond: 'fp_pm', concl: 'relmax' } })).toMatchObject({ ok: false, parse: true, need: 'text' });
    expect(C.gradeStep(a, { text: 'x', picks: { test: 'fdt' } })).toMatchObject({ parse: true, need: 'slots' });
    expect(C.gradeStep(a, { text: 'x', picks: { test: 'fdt', cond: 'fp_pm', concl: 'relmax' } }).ok).toBe(true);
    expect(C.gradeStep(a, { text: 'x', picks: { test: 'sdt', cond: 'fpp_neg', concl: 'relmax' } }).ok).toBe(true);
    const mm = C.gradeStep(a, { text: 'x', picks: { test: 'fdt', cond: 'fpp_neg', concl: 'relmax' } });
    expect(mm).toMatchObject({ ok: false, mis: 'test_condition_mismatch', elements: { test: true, cond: false, concl: true } });
    expect(C.gradeStep(a, { text: 'x', picks: { test: 'evt', cond: 'fp_pm', concl: 'relmax' } }).mis).toBe('evt_not_relative');
    expect(C.gradeStep(a, { text: 'x', picks: { test: 'fdt', cond: 'fp_pm', concl: 'absmax' } }).mis).toBe('relative_not_absolute');
    // Keyword-free: the words are never read. The same words with other marks get other grades.
    const words = 'First Derivative Test: f′ changes from positive to negative, so a relative maximum.';
    expect(C.gradeStep(a, { text: words, picks: { test: 'mvt', cond: 'fp_zero', concl: 'relmin' } }).ok).toBe(false);
    const g = C.genFRQ('accum', C.seeded(3)).parts.find((p) => p.id === 'c2');
    expect(C.gradeStep(g, { text: 'x', picks: { test: 'cand', cond: 'sign', hyp: 'cont' } }).mis).toBe('test_condition_mismatch');
    expect(C.gradeStep(g, { text: 'x', picks: { test: 'cand', cond: 'cmp', hyp: 'g0' } }).mis).toBe('hyp_not_condition');
    const s = C.genFRQ('series', C.seeded(3)).parts.find((p) => p.id === 'b2');
    expect(C.gradeStep(s, { text: 'x', picks: { series: 'harm', test: 'nth', concl: 'div' } }).mis).toBe('terms_zero_converges');
    expect(C.gradeStep(s, { text: 'x', picks: { series: 'harm', test: 'integ', concl: 'div' } }).ok).toBe(true);
  });

  it('in the UI: write, mark, get per-element feedback and a second try; the words are kept, the model shown on reveal', async () => {
    const m = await mount({ tab: 'frq', frqKind: 'analysis', frqSeed: 5 });
    const part = () => container.querySelector('[data-calc-frq-part="b2"]');
    expect(btn('Check this part', part()).disabled, 'nothing written yet').toBe(true);
    await type(part().querySelector('textarea'), 'The derivative is zero there and the curve bends down.');
    await click(radio('I use the First Derivative Test.', part()));
    await click([...part().querySelectorAll('label')].find((l) => /f″\(.*\) < 0/.test(l.textContent)).querySelector('input'));
    await click(radio('So f has a relative maximum', part()));
    await click(btn('Check this part', part()));
    expect(part().textContent).toContain('That condition belongs to a different test');
    expect(part().querySelector('[data-calc-justify-elements]').getAttribute('data-calc-justify-elements')).toBe('2/3');
    expect(part().textContent).toContain('Not met: States the condition of that test');
    await click(radio('I use the Mean Value Theorem.', part()));
    await click(btn('Check this part', part()));
    expect(m.latest.frqResults.b2).toBeUndefined();
    await click(btn('Show the answer (no credit)', part()));
    expect(part().textContent).toContain('A full-credit justification:');
    expect(part().textContent).toContain('Your own words: The derivative is zero there and the curve bends down.');
    expect(m.latest.frqResults.b2).toMatchObject({ ok: false, revealed: true });
    expect(m.xp).toEqual([]);
  });

  it('a right first justification scores its point; the BC series question has 6 points with the new part', async () => {
    const q = C.genFRQ('particle', C.seeded(8));
    const m = await mount({ tab: 'frq', frqKind: 'particle', frqSeed: 8 });
    const part = () => container.querySelector('[data-calc-frq-part="b2"]');
    await type(part().querySelector('textarea'), 'v changes sign at both times, so it turns.');
    await click(radio('v(t) changes sign', part()));
    await click(radio('v(t) > 0 for 0', part()));
    await click(radio('So the particle changes direction', part()));
    await click(btn('Check this part', part()));
    expect(m.latest.frqResults.b2).toMatchObject({ ok: true, firstTry: true });
    expect(part().textContent).toContain('✅ v(t) changes sign at t = ' + q.p.p);
    expect(C.frqScore(C.genFRQ('series', C.seeded(2)), {}).total).toBe(6);
    expect(errors).toEqual([]);
  });

  it('older saves still load: a string in the justification input, and a b2 result from the choice version', async () => {
    await mount({ tab: 'frq', frqKind: 'particle', frqSeed: 5, frqInputs: { b2: 'zero' }, frqTries: { b2: 1 }, frqFeedback: { b2: { ok: false, mis: 'zero_not_enough', fin: false, tried: 'zero' } } });
    expect(container.querySelector('[data-calc-frq-part="b2"] textarea').value).toBe('');
    await unmount();
    await mount({ tab: 'frq', frqKind: 'analysis', frqSeed: 5, frqResults: { b2: { ok: true, firstTry: true } } });
    expect(container.querySelector('[data-calc-frq-part="b2"]').textContent).toContain('✅');
    expect(errors).toEqual([]);
  });
});

describe('stage C mounts cleanly in every band, with named controls and no stray numbers', () => {
  const states = [
    {}, { tab: 'frq', frqKind: 'accum', frqSeed: 4 }, { tab: 'frq', frqKind: 'series', frqSeed: 4, frqTries: { b2: 2 }, frqFeedback: { b2: { ok: false, used: true, mis: 'not_alternating', elements: { series: true, test: false, concl: true } } } },
    { tab: 'integral', fnMode: 'typed', fnText: 'ln|x|', xMin: -1, xMax: 1 }, { tab: 'integral', fnMode: 'typed', fnText: 'tan(x)', xMin: 0, xMax: 2 },
    { tab: 'challenge', calcChallengeMode: 'deriv', calcQuiz: { mode: 'deriv', a: 2, b: 1, c: 3, x0: 1, answer: 5, band: 'ab', answered: true, attempts: 2, tried: ['6', '8'], mis: 'constant_derivative', opts: [{ id: '5', value: 5 }, { id: '6', value: 6 }, { id: '8', value: 8 }] } }
  ];
  it('no console error, no NaN/undefined, every control named', async () => {
    for (const st of states) for (const band of ['pre', 'ab', 'bc']) for (const teacher of [false, true]) {
      await mount(Object.assign({ calcBand: band }, st), { isTeacherMode: teacher });
      expect(errors, JSON.stringify(st)).toEqual([]);
      expect(/\bNaN\b|undefined\b(?! here)|Infinity|\[object/.test(text()), JSON.stringify(st) + band).toBe(false);
      const unnamed = [...container.querySelectorAll('button, input, select, textarea')].filter((el) => !((el.getAttribute('aria-label') || '').trim() || (el.textContent || '').trim() || (el.id && container.querySelector('label[for="' + el.id + '"]')) || el.closest('label') || el.getAttribute('aria-labelledby')));
      expect(unnamed.map((el) => el.outerHTML.slice(0, 100)), JSON.stringify(st)).toEqual([]);
      await unmount();
    }
  });
});
