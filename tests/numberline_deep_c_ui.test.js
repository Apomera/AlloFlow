// Number Line stage C (2026-11-03 evening): learning paths per grade band, band
// tab order, the clickable line-plot grid, skip-count predict-then-check, one
// reveal rule on every tab, whole-sentence i18n (no noun insertion), quest
// labels via getters and the session-only teacher note. NUMBERLINE_DEEP_SRC
// points the suite at another copy (the stage B copy must turn these red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
let root = null, latest = null, xp = [], errors = [], sr = [];

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
  xp = []; errors = []; sr = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  vi.spyOn(console, 'warn').mockImplementation((...a) => { errors.push('WARN ' + a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = ''; vi.restoreAllMocks(); });

async function mount(nl, over) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    latest = state._numberline;
    return window.StemLab._registry.numberline.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (id, amt, why) => xp.push([id, amt, why]),
      announceToSR: (m) => sr.push(m), addToast: () => {},
    }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const txt = () => document.body.textContent.replace(/\s+/g, ' ');
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); }
async function type(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const btn = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
const tabIds = () => [...document.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('numberline-tab-', ''));
const pathIds = () => [...document.querySelectorAll('[data-nl-path-step]')].map((li) => li.getAttribute('data-nl-path-step'));
const pathBtn = (id) => document.querySelector('[data-nl-path-step="' + id + '"] button');
const B23 = { gradeLevel: '2nd Grade' }, B45 = { gradeLevel: '5th Grade' }, B6 = { gradeBand: 'g68', gradeLevel: '6th Grade' };
const ENG = () => window.StemLab._registry.numberline._engineB;
const E = () => window.StemLab._registry.numberline._engine;

describe('learning path ("Start here") per grade band', () => {
  it('grades 2-3: whole numbers, rounding, skip count, ruler, line plot; ticks come from saved progress', async () => {
    await mount({ tab: 'explore', ppSolvedByType: { placeWhole: 2, roundLine: 1 }, nlbSolved: { skip: 3 } }, B23);
    expect(document.querySelector('[data-nl-path]').getAttribute('data-nl-path')).toBe('b23');
    expect(pathIds()).toEqual(['placeWhole', 'roundLine', 'skip', 'measure', 'lineplot']);
    const done = [...document.querySelectorAll('[data-nl-path-step]')].map((li) => li.getAttribute('data-done'));
    expect(done).toEqual(['true', 'false', 'true', 'false', 'false']);
    expect(txt()).toContain('2 of 5 steps done');
    expect(document.querySelector('[data-nl-path-step="roundLine"]').textContent).toContain('1 of 2 done');
    await click(pathBtn('roundLine'));
    expect(latest.tab).toBe('challenges');
    expect(latest.challengeMode).toBe('place');
    expect(latest.pp.item.type).toBe('roundLine');
    await click(pathBtn('skip'));
    expect(latest.tab).toBe('skipcount');
    expect(latest.skipShown).toBe(0);                          // ready to predict hop 1
    await click(pathBtn('measure'));
    expect([latest.tab, latest.msMode]).toEqual(['measure', 'measure']);
    await click(pathBtn('lineplot'));
    expect([latest.tab, latest.msMode]).toEqual(['measure', 'plot']);
  });
  it('grades 4-5: fractions, decimals and line plots; the CER flag and landmark flags tick their steps', async () => {
    await mount({ tab: 'explore', cerDone: true, fdLandmarksFound: { '0': true, '1/2': true, '1/4': true } }, B45);
    expect(pathIds()).toEqual(['landmarks', 'placeFraction', 'cer', 'dzPlace', 'order', 'lineplot']);
    expect(document.querySelector('[data-nl-path-step="landmarks"]').getAttribute('data-done')).toBe('true');
    expect(document.querySelector('[data-nl-path-step="cer"]').getAttribute('data-done')).toBe('true');
    await click(pathBtn('dzPlace'));
    expect([latest.tab, latest.dz.mode]).toEqual(['decimals', 'place']);
    await click(pathBtn('placeFraction'));
    expect(latest.pp.item.type).toBe('placeFraction');
  });
  it('grade 6: integers in context, ordering and decimal zoom', async () => {
    await mount({ tab: 'explore', nlbSolved: { icCompare: 1, icDebt: 1 } }, B6);
    expect(pathIds()).toEqual(['icPlace', 'icCompare', 'hopSum', 'order', 'dzCompare']);
    expect(document.querySelector('[data-nl-path-step="icCompare"]').getAttribute('data-done')).toBe('true');
    await click(pathBtn('icPlace'));
    expect([latest.tab, latest.ic.item.kind]).toEqual(['intctx', 'icPlace']);
    await click(pathBtn('icCompare'));
    expect(['icCompare', 'icDebt']).toContain(latest.ic.item.kind);
    await click(pathBtn('dzCompare'));
    expect([latest.tab, latest.dz.mode]).toEqual(['decimals', 'compare']);
  });
  it('a teacher lock on the practice level picks the path; a Quick-only lock never forces Place it', async () => {
    await mount({ tab: 'explore', teacher: { lockBand: 'b6', lockMode: 'quick' } }, B23);
    expect(pathIds()[0]).toBe('icPlace');
    await click(pathBtn('hopSum'));
    expect(latest.tab).toBe('challenges');
    expect(latest.pp == null).toBe(true);
  });
});

describe('tabs ordered by band, all still reachable', () => {
  it('core activities first for each band; one tablist; arrow keys cross the two rows', async () => {
    const expected = {
      b23: ['challenges', 'skipcount', 'measure', 'explore', 'fracdec', 'magCompare', 'order', 'decimals', 'intctx'],
      b45: ['fracdec', 'magCompare', 'decimals', 'order', 'measure', 'challenges', 'explore', 'skipcount', 'intctx'],
      b6: ['intctx', 'challenges', 'order', 'decimals', 'explore', 'fracdec', 'magCompare', 'measure', 'skipcount'],
    };
    // The K-2 student's shorter bar has its own suite (numberline_k2_more_tabs); their teacher still gets the full order.
    for (const [b, over] of [['b23', { ...B23, isTeacherMode: true }], ['b45', B45], ['b6', B6]]) {
      await mount({ tab: 'explore' }, over);
      expect(tabIds()).toEqual(expected[b]);
      expect(document.querySelectorAll('[role="tablist"]')).toHaveLength(1);
      expect(document.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
      await React.act(async () => root.unmount()); root = null;
    }
    await mount({ tab: 'challenges' }, B6);
    const tabs = () => [...document.querySelectorAll('[role="tab"]')];
    await key(tabs()[3], 'ArrowRight');                     // last core tab -> first "more" tab
    expect(latest.tab).toBe('explore');
    await key(tabs()[4], 'ArrowLeft');
    expect(latest.tab).toBe('decimals');
    await key(document.querySelector('[role="tabpanel"]'), '1');
    expect(latest.tab).toBe('intctx');                        // number keys follow the shown order
    expect(errors).toEqual([]);
  });
  it('the overview panel builds its body only while open, with cards in band order', async () => {
    await mount({ tab: 'explore' }, B6);
    const det = () => document.querySelector('[data-numberline-focus]');
    expect(det().querySelectorAll('svg')).toHaveLength(0);
    await React.act(async () => { det().open = true; det().dispatchEvent(new window.Event('toggle')); });
    expect(det().querySelectorAll('svg').length).toBeGreaterThan(0);
    const cards = [...det().querySelectorAll('button[aria-pressed]')].map((b) => b.textContent);
    expect(cards[0]).toContain('Integers in context');
  });
});

describe('clickable, keyboard-operable line plot grid', () => {
  const item = { id: 'c-lp', kind: 'lineplot', band: 'b45', prec: 8, a: 2, span: 1, cols: 9, counts: [1, 2, 0, 3, 1, 2, 0, 1, 1], data: [2, 2.125, 2.125, 2.375, 2.375, 2.375, 2.5, 2.625, 2.625, 2.875, 3], thing: 'leaf', tries: 0,
    questions: [{ id: 'mode', answer: 2.375, count: 3 }, { id: 'range', answer: 1, max: 3, min: 2 }, { id: 'total', v: 2.375, answer: 7.125, count: 3 }] };
  const cells = () => [...document.querySelectorAll('svg[role="grid"] [role="gridcell"]')];
  it('is an ARIA grid with one roving cell per length; click, Enter, Space and arrows edit the plot', async () => {
    await mount({ tab: 'measure', msMode: 'plot', lp: { item, counts: item.counts.map(() => 0), sel: 0, struck: {}, status: 'open', tries: 0, q: {} } });
    const grid = document.querySelector('svg[role="grid"]');
    expect(grid.querySelectorAll('[role="row"]')).toHaveLength(1);
    expect(cells()).toHaveLength(9);
    expect(cells().filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(grid.getAttribute('aria-describedby')).toContain('nl-lp-desc');
    await React.act(async () => { cells()[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });   // a tap on an empty stack adds an X
    expect(latest.lp.counts[3]).toBe(1);
    expect(latest.lp.sel).toBe(3);
    expect(cells()[3].getAttribute('aria-label')).toBe('2 3/8 inches, 1 X marks');
    await key(cells()[3], 'Enter');
    await key(cells()[3], ' ');
    await key(cells()[3], 'ArrowUp');
    expect(latest.lp.counts[3]).toBe(4);
    await key(cells()[3], 'Delete');
    expect(latest.lp.counts[3]).toBe(3);
    await key(cells()[3], 'ArrowRight');
    await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(latest.lp.sel).toBe(4);
    expect(document.activeElement).toBe(cells()[4]);
    expect(cells()[4].getAttribute('tabindex')).toBe('0');
    expect(document.getElementById('nl-lp-desc').textContent).toContain('3 at 2 3/8');
    expect(errors).toEqual([]);
  });
  it('a pointer tap on the stack itself removes an X', async () => {
    await mount({ tab: 'measure', msMode: 'plot', lp: { item, counts: [0, 0, 0, 3, 0, 0, 0, 0, 0], sel: 3, struck: {}, status: 'open', tries: 0, q: {} } });
    const grid = document.querySelector('svg[role="grid"]');
    Object.defineProperty(grid, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 700, height: 250, right: 700, bottom: 250 }) });
    const tap = (y) => React.act(async () => { cells()[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: 275, clientY: y, detail: 1 })); });
    await tap(170);                                           // on the bottom X (axis at y = 196)
    expect(latest.lp.counts[3]).toBe(2);
    await tap(40);                                            // well above the stack
    expect(latest.lp.counts[3]).toBe(3);
  });
  it('the plot has a hint ladder; a hint lowers the XP from 5 to 2; question hints lower 2 to 1', async () => {
    await mount({ tab: 'measure', msMode: 'plot', lp: { item, counts: item.counts.slice(), sel: 0, struck: {}, status: 'open', tries: 0, q: {} } });
    await click(btn('Hint 1 of 3'));
    expect(txt()).toContain('Start with the first measurement in the table.');
    await click(btn('Check my line plot'));
    expect(xp.filter((x) => x[0] === 'numberline').at(-1)).toEqual(['numberline', 2, 'Line plot']);
    expect(document.querySelector('svg[role="grid"]')).toBeNull();      // built: the plot is a picture again
    await click([...document.querySelectorAll('[data-nl-lp-questions] button')].find((b) => b.textContent === 'Hint 1 of 2'));
    expect(txt()).toContain('Look for the tallest stack of X marks.');
    await type(document.getElementById('nl-lpq-0'), '2 3/8');
    await click([...document.querySelectorAll('[data-nl-lp-questions] button')].find((b) => b.textContent === 'Check my answer'));
    expect(xp.filter((x) => x[0] === 'numberline').at(-1)).toEqual(['numberline', 1, 'Line plot question']);
  });
});

describe('skip count: predict, then check', () => {
  it('names a wrong-direction slip, advances only on a correct prediction, pays once per hop', async () => {
    await mount({ tab: 'skipcount', skipFrom: 0, skipBy: 5, skipCount: 4, skipShown: 1 });
    const labels = [...document.querySelectorAll('[data-skip-activity] svg text')].map((x) => x.textContent);
    expect(labels).not.toContain('20');                       // unreached ticks carry no label
    expect(txt()).toContain('You are on 5. Predict where hop 2 lands.');
    await type(document.getElementById('nl-skip-pred'), '0');
    await click(btn('Check my prediction'));
    expect(document.querySelector('[data-skip-mis]').getAttribute('data-skip-mis')).toBe('skip_direction');
    expect(latest.skipShown).toBe(1);
    await type(document.getElementById('nl-skip-pred'), '10');
    await click(btn('Check my prediction'));
    expect(latest.skipShown).toBe(2);
    expect(xp).toEqual([]);                                    // second try: support, no points
    expect(latest.ppMissed || []).toHaveLength(0);
    await type(document.getElementById('nl-skip-pred'), '15');
    await click(btn('Check my prediction'));
    expect(latest.skipShown).toBe(3);
    expect(xp).toEqual([['numberline', 1, 'Skip count prediction']]);
    expect(latest.nlbSolved.skip).toBe(1);
    expect(document.querySelector('[data-skip-pred-result="correct"]').textContent).toContain('hop 3 lands on 15');
    await click(btn('Previous hop'));
    await type(document.getElementById('nl-skip-pred'), '15');
    await click(btn('Check my prediction'));
    expect(xp).toHaveLength(1);                                // the same hop never pays twice
    expect(latest.nlbSolved.skip).toBe(1);
  });
  it('no farming: hops of 1 never pay, and at most 20 distinct hops pay per session', async () => {
    await mount({ tab: 'skipcount', skipFrom: 0, skipBy: 1, skipCount: 3, skipShown: 0 });
    await type(document.getElementById('nl-skip-pred'), '1');
    await click(btn('Check my prediction'));
    expect(latest.skipShown).toBe(1);
    expect(xp).toEqual([]);
    await React.act(async () => root.unmount()); root = null;
    const full = {}; for (let i = 0; i < 20; i++) full['x|' + i] = true;
    await mount({ tab: 'skipcount', skipFrom: 0, skipBy: 2, skipCount: 3, skipShown: 0, skipPredDone: full });
    await type(document.getElementById('nl-skip-pred'), '2');
    await click(btn('Check my prediction'));
    expect(latest.skipShown).toBe(1);
    expect(xp).toEqual([]);
  });
  it('after two wrong tries the slip is logged and "Show the next hop" reveals it for no credit', async () => {
    await mount({ tab: 'skipcount', skipFrom: 3, skipBy: 4, skipCount: 3, skipShown: 0 });
    expect(btn('Show the next hop')).toBeUndefined();
    await type(document.getElementById('nl-skip-pred'), '4');
    await click(btn('Check my prediction'));
    expect(document.querySelector('[data-skip-mis]').getAttribute('data-skip-mis')).toBe('skip_by_one');
    await type(document.getElementById('nl-skip-pred'), '3');
    await click(btn('Check my prediction'));
    expect(document.querySelector('[data-skip-mis]').getAttribute('data-skip-mis')).toBe('skip_stayed');
    expect(latest.ppMissed[0]).toMatchObject({ type: 'skip', correct: '7', mis: 'skip_stayed' });
    await click(btn('Show the next hop'));
    expect(latest.skipShown).toBe(1);
    expect(document.querySelector('[data-skip-pred-result="revealed"]')).toBeTruthy();
    expect(xp).toEqual([]);
  });
});

describe('one reveal rule on every tab', () => {
  it('decimal compare: after two wrong tries a reveal is offered on demand and earns nothing', async () => {
    const item = { id: 'dc-c', kind: 'dzCompare', band: 'b45', sa: '0.4', sb: '0.375', a: 0.4, b: 0.375, rel: '>', binary: true, tries: 0 };
    await mount({ tab: 'decimals', dz: { mode: 'compare', item, status: 'open', tries: 0, hints: 0 } });
    await click(btn('0.4 is less than 0.375')); await click(btn('Check my answer'));
    expect(btn('Show the answer')).toBeUndefined();
    await click(btn('0.4 is equal to 0.375')); await click(btn('Check my answer'));
    await click(btn('Show the answer'));
    expect(latest.dz.status).toBe('revealed');
    expect(document.querySelector('[data-nl-revealed="dzCompare"]').textContent).toContain('The answer is 0.4 > 0.375.');
    expect(xp).toEqual([]);
  });
  it('a teacher can turn reveals off everywhere, including the new skip-count and compare reveals', async () => {
    const item = { id: 'dc-d', kind: 'dzCompare', band: 'b45', sa: '0.4', sb: '0.375', a: 0.4, b: 0.375, rel: '>', binary: true, tries: 2, missed: true };
    const skipState = { tab: 'skipcount', skipShown: 0, skipPred: { key: '0|2|forward|1', text: '9', tries: 2, hints: 0, fb: { kind: 'wrong', mis: null } } };
    await mount(skipState);
    expect(btn('Show the next hop')).toBeTruthy();                       // offered when reveals are on
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'decimals', teacher: { allowReveal: false }, dz: { mode: 'compare', item, status: 'open', tries: 2, missed: true, hints: 0, fb: { kind: 'wrong', mis: 'longer_is_bigger' } } });
    expect(btn('Show the answer')).toBeUndefined();
    await React.act(async () => root.unmount()); root = null;
    await mount(Object.assign({ teacher: { allowReveal: false } }, skipState));
    expect(btn('Show the next hop')).toBeUndefined();
  });
  it('integer lab: a wrong prediction names the slip without showing the answer; reveal on request after two tries', async () => {
    await mount({ showIntegerLab: true, intLab: { mode: 'hops', a: 3, op: '+', b: -5, pred: 8 } });
    await click(btn('Check my prediction'));
    expect(txt()).toContain('Hopped the wrong way');
    expect(txt()).not.toContain('= −2');
    expect(latest.intLab.checked).toBe(false);
    expect(btn('Show the answer')).toBeUndefined();
    await click(btn('Check my prediction'));
    await click(btn('Show the answer'));
    expect(txt()).toContain('Not quite: you predicted 8, and 3 + (−5) = −2.');
    await React.act(async () => root.unmount()); root = null;
    await mount({ showIntegerLab: true, intLab: { mode: 'abs', ax: -6, absGuess: '5' } });
    await click(btn('Check'));
    expect(txt()).not.toContain('|−6| = 6');
    await click(btn('Check'));
    await click(btn('Show the answer'));
    expect(txt()).toContain('The answer is |−6| = 6');
  });
  it('quick questions use the same hint button; a hint counts as support', async () => {
    await mount({ tab: 'challenges', challengeMode: 'quick', range: { min: 0, max: 20 } });
    await click(btn('Generate Challenge'));
    await click(btn('Hint 1 of 1'));
    expect(latest.challenge.hintShown).toBe(true);
    expect(latest.challengeSupportUsed).toBe(true);
    expect(document.querySelector('ol[aria-label="Hints"]')).toBeTruthy();
  });
});

describe('teacher panel and quest labels', () => {
  it('the teacher panel says plainly that its settings last for this session only', async () => {
    await mount({ tab: 'explore' }, { isTeacherMode: true });
    const note = document.querySelector('[data-numberline-teacher] [data-nl-teacher-session]');
    expect(note.textContent).toBe('These settings last for this session only: they are not saved, so set them again after the page is reloaded.');
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'explore' });
    expect(document.querySelector('[data-nl-teacher-session]')).toBeNull();
  });
  it('quest labels and progress read the translator of the last render', async () => {
    const fr = { 'stem.numberline.quest_solve5': 'Réponds juste à 5 défis', 'stem.numberline.quest_solve5_progress': '{n}/5 justes' };
    await mount({ tab: 'explore' }, { t: (k) => fr[k] || null });
    const hooks = window.StemLab._registry.numberline.questHooks;
    expect(hooks.map((q) => q.id)).toEqual(['solve_5', 'try_4_types', 'streak_5']);
    expect(hooks[0].label).toBe('Réponds juste à 5 défis');
    expect(hooks[0].progress({ score: { correct: 3 } })).toBe('3/5 justes');
    expect(hooks[1].label).toBe('Try 4 different challenge types');      // English fallback
    expect(hooks[2].progress({ bestStreak: 2 })).toBe('best 2/5');
  });
});

describe('whole sentences for gendered languages (no inserted nouns)', () => {
  const keysOf = (fn) => { const ks = []; const t = (k, fb) => { ks.push(k); return fb; }; const out = fn(t); return { ks, out }; };
  it('ruler and line-plot sentences use one key per object, never a {thing} slot', () => {
    const B = ENG();
    for (const thing of ['pencil', 'crayon', 'leaf', 'feather', 'ribbon', 'caterpillar', 'key', 'straw']) {
      const it0 = { kind: 'measure', rd: 8, prec: 4, start: 1, len: 2.25, end: 3.25, target: 2.25, thing };
      const r = keysOf((t) => [B.msPrompt(it0, t), B.msDescribe(it0, t), B.msSteps(it0, t).join(' ')].join(' '));
      expect(r.ks).toContain('stem.numberline.ms_q_' + thing);
      expect(r.ks).toContain('stem.numberline.ms_lies_' + thing);
      expect(r.ks).toContain('stem.numberline.ms_ws_start_' + thing);
      expect(r.ks.some((k) => /\.(ms_q|ms_obj_desc|ms_ws_start|ms_edge_mark|ms_edge_8_many)$/.test(k))).toBe(false);
      expect(r.out).not.toMatch(/\{thing\}|\{things\}/);
      expect(r.out).toContain('The ' + thing + ' starts at the 1-inch mark');
    }
    const lp = B.genLinePlot('b23', E().seeded(5));
    for (const thing of ['leaf', 'pencil', 'ribbon', 'caterpillar', 'feather']) {
      const item = Object.assign({}, lp, { thing });
      const r = keysOf((t) => [B.lpCaptionText(thing, t), B.lpMissText(thing, t)].concat(['gt', 'at', 'range', 'total'].map((id) => B.lpPrompt(item, { id, v: 2 }, t))).join(' | '));
      for (const base of ['lp_caption', 'lp_miss', 'lp_q_gt', 'lp_q_at', 'lp_q_range', 'lp_q_total']) expect(r.ks).toContain('stem.numberline.' + base + '_' + thing);
      expect(r.out).not.toMatch(/\{thing\}|\{things\}/);
    }
  });
  it('decimal-zoom sentences carry the place name inside each key', () => {
    const B = ENG();
    const r = keysOf((t) => [B.dzNowText(0, t), B.dzNowText(1, t), B.dzNowText(2, t), B.dzValueText(2, t), B.dzDescText(1, t),
      B.dzPlaceSteps({ kind: 'dzPlace', places: 3, W: 0, text: '0.347', target: 0.347 }, t).join(' '),
      B.dzCompareSteps({ sa: '0.41', sb: '0.47', a: 0.41, b: 0.47, rel: '<' }, t).join(' ')].join(' '));
    for (const k of ['dz_now_l2', 'dz_valuetext_l2', 'dz_desc_l1', 'dz_ws_zoom_l2', 'dz_ws_land_l2', 'dz_ws_space_l0', 'dz_ws_space_l1', 'dz_cs_first_l1']) expect(r.ks).toContain('stem.numberline.' + k);
    expect(r.ks.some((k) => /\.(dz_pw_|dz_uw_)/.test(k) || /\.(dz_now|dz_valuetext|dz_desc|dz_ws_land|dz_ws_space|dz_ws_zoom|dz_cs_first)$/.test(k))).toBe(false);
    expect(r.out).toContain('0.347 has 7 in the thousandths place, so it is on the tick 0.347.');
    expect(r.out).toContain('The first place that is different is the hundredths place: 1 and 7.');
    expect(B.placeWord).toBeUndefined();
    expect(B.unitWord).toBeUndefined();
  });
  it('marker and arrow descriptions are one sentence per zone and per part of a space', () => {
    const N = E();
    const open = { line: { min: 0, max: 100, open: true } };
    const ks = [];
    const t = (k, fb) => { ks.push(k); return fb; };
    expect(N.describeSpot(open, 50, t, 'marker')).toBe('Your marker is near the middle.');
    expect(N.describeSpot(open, 2, t, 'arrow')).toBe('The arrow is very near the left end.');
    const ticked = { line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } };
    expect(N.describeSpot(ticked, 7.5, t, 'marker')).toBe('Your marker is 2 full spaces right of the labelled tick 5, then about halfway across the next space.');
    expect(ks).toEqual(expect.arrayContaining(['stem.numberline.pp_marker_zone_3', 'stem.numberline.pp_arrow_zone_0', 'stem.numberline.pp_marker_between_1']));
    expect(ks.some((k) => /pp_zone_|pp_part_|pp_marker_zone$|pp_arrow_zone$|pp_marker_between$/.test(k))).toBe(false);
  });
  it('the fraction in words and the context slider name are whole phrases', async () => {
    const seen = [];
    await mount({ tab: 'fracdec', fdValue: 0.75, fdDen: 4 }, { t: (k) => { seen.push(k); return null; } });
    expect(seen).toContain('stem.numberline.fd_w_quarters');
    expect(seen).not.toContain('stem.numberline.fd_words');
    expect(seen.some((k) => /\.unit_(quarters|quarter)$/.test(k))).toBe(false);
    await React.act(async () => root.unmount()); root = null;
    const temp = { min: -20, max: 20, step: 1, labels: [-20, -15, -10, -5, 0, 5, 10, 15, 20], snap: 1, vertical: true };
    await mount({ tab: 'intctx', ic: { item: { id: 'c-ic', kind: 'icPlace', band: 'b6', ctx: 'temp', unit: 'C', line: temp, target: -7, answer: 'position', names: ['Ana', 'Ben'], tries: 0 }, status: 'open', tries: 0 } });
    expect(document.querySelector('svg[role="slider"]').getAttribute('aria-label')).toBe('Your marker on the temperature line (°C)');
  });
});

describe('every tab still mounts cleanly in every band and mode', () => {
  it('no console errors across bands, tabs, dark and teacher modes', async () => {
    for (const over of [B23, B45, B6, Object.assign({ isDark: true }, B6), Object.assign({ isTeacherMode: true }, B23)]) {
      for (const tab of ['explore', 'challenges', 'skipcount', 'fracdec', 'magCompare', 'decimals', 'order', 'measure', 'intctx']) {
        await mount({ tab, skipShown: 0 }, over);
        expect(document.querySelector('[role="tabpanel"]').textContent.length).toBeGreaterThan(80);
        expect(document.querySelector('[data-nl-path]')).toBeTruthy();
        await React.act(async () => root.unmount()); root = null;
      }
    }
    expect(errors).toEqual([]);
  });
});
