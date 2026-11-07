import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Approved 2026-11-05: on the Arrays tab, before a build, grades 3 and up get an empty frame in place of
// dots they could count; K-2 keep the dots. Explainers never quote an open question.
// Each block failed on the start copy (MULTTABLE_DEEP_SRC points the suite at another copy).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

beforeEach(() => {
  resetStemLab(); loadTool(FILE, 'multtable');
  Element.prototype.scrollIntoView = function () {};
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  delete Element.prototype.scrollIntoView;
  window._multTableMuted = false;
  vi.restoreAllMocks();
});

async function mount(opts = {}) {
  const tool = window.StemLab._registry.multtable;
  const view = { awards: [], ann: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    Object.assign(view, { lab, challenge, feedback, setLab, setChallenge });
    return tool.render(makeCtx(Object.assign({
      labToolData: lab, setLabToolData: setLab,
      multTableAnswer: answer, setMultTableAnswer: setAnswer,
      multTableChallenge: challenge, setMultTableChallenge: setChallenge,
      multTableFeedback: feedback, setMultTableFeedback: setFeedback,
      multTableHidden: hidden, setMultTableHidden: setHidden,
      multTableHover: null, setMultTableHover: () => {},
      multTableRevealed: revealed, setMultTableRevealed: setRevealed,
      exploreScore: score, setExploreScore: setScore,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.ann.push(String(m)),
      addToast: () => {},
    }, opts.ctx || {})));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const act = (fn) => React.act(async () => { await fn(); });
const button = (name, scope) => [...(scope || host).querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name) || null;
async function click(name, scope) {
  const b = typeof name === 'string' ? button(name, scope) : name;
  expect(b, 'button ' + name).toBeTruthy();
  expect(b.disabled, 'button ' + name + ' disabled').toBe(false);
  await act(() => b.click());
}
async function typeInto(selector, value) {
  const input = typeof selector === 'string' ? host.querySelector(selector) : selector;
  expect(input, 'input ' + selector).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function slide(id, value) {
  const input = host.querySelector('#' + id);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
}
const dots = () => host.querySelector('[role="tabpanel"]').querySelectorAll('.allo-mt-dot').length;
const frame = () => host.querySelector('[data-mt-frame]');
const tool = (over) => Object.assign({ a: 7, b: 8, mode: 'mult', divisor: null, source: 'tool', id: 'open-q' }, over || {});
const visual = (a, b, more) => ({ _multExt: Object.assign({ mtTab: 'visual', visualA: a, visualB: b }, more || {}) });
// Everything on a node that a person or a screen reader can reach.
function reach(node, ann) {
  const attrs = [...node.querySelectorAll('*'), node].flatMap((n) => [...n.attributes].filter((at) => !/^(class|style|type|inputmode|viewBox|d|cx|cy|r|x|y|x1|x2|y1|y2|width|height|fill|stroke|stroke-width|stroke-dasharray|fill-opacity|min|max)$/i.test(at.name)).map((at) => at.value));
  return attrs.concat(node.textContent, ann || []).join(' | ');
}

describe('grades 3 and up get an empty frame; K-2 keep the dots', () => {
  it.each([
    ['Kindergarten', {}], ['K', {}], ['k', {}], ['K-2', {}], ['Pre-K', {}], ['PreK', {}], ['1st Grade', {}], ['2nd Grade', {}], ['Grade 2', {}], ['grade 1', {}], ['1', {}], ['first grade', {}], ['Second Grade', {}], ['K-1', {}], ['1-2', {}],
    ['', { gradeBand: 'k2' }], [undefined, { gradeBand: 'k2' }],
  ])('%s: dots', async (gradeLevel, more) => {
    await mount({ ctx: Object.assign({ gradeLevel }, more), lab: visual(3, 5) });
    expect(dots()).toBe(15);
    expect(frame()).toBeNull();
    expect(host.querySelector('[data-mt-live-array]')).toBeTruthy();
  });

  it.each([
    ['3rd Grade', {}], ['4th Grade', {}], ['5th Grade', {}], ['8th Grade', {}], ['12th Grade', {}], ['9-12', {}], ['3-5', {}], ['6-8', {}], ['Grade 3', {}], ['grade 10', {}], ['3', {}], ['third grade', {}], ['College', {}], ['Graduate Level', {}], ['Adult', {}],
    ['', { gradeBand: 'g35' }], [undefined, { gradeBand: 'g68' }], ['K-12', {}], ['K-5', {}], ['1-5', {}], ['', {}], [undefined, {}], [null, {}], ['mixed', {}], ['Grade', {}], ['21', {}], [7, {}], [{}, {}],
  ])('%s: empty frame, no dots', async (gradeLevel, more) => {
    await mount({ ctx: Object.assign({ gradeLevel }, more), lab: visual(3, 5) });
    expect(dots()).toBe(0);
    expect(frame()).toBeTruthy();
    expect(host.querySelector('[data-mt-live-total]').textContent).toBe('3 × 5 = ?');
  });

  it('the grade wins over a host band that disagrees', async () => {
    await mount({ ctx: { gradeLevel: 'K', gradeBand: 'g68' }, lab: visual(3, 5) });
    expect(dots()).toBe(15);
    await act(() => root.unmount()); root = null; host.remove();
    await mount({ ctx: { gradeLevel: '4th Grade', gradeBand: 'k2' }, lab: visual(3, 5) });
    expect(dots()).toBe(0);
  });

  it('a K form of the grade also opens the K-2 fact set', async () => {
    await mount({ ctx: { gradeLevel: 'K', gradeBand: 'g68' }, lab: { _multExt: { mtTab: 'visual' } } });
    expect(host.querySelector('[data-mt-vis-chips]').getAttribute('data-mt-vis-chips')).toBe('band');
    expect(host.querySelector('#mt-visual-a').value).toBe('2');
  });

  it('a student in grade 3+ does not get the dots back by choosing the K-2 fact set', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(3, 5, { band: 'early' }) });
    expect(dots()).toBe(0);
    expect(frame()).toBeTruthy();
  });

  it('a teacher lock on the K-2 set brings the dots back for a student in grade 3+', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(3, 5, { teacher: { lockBand: 'early' } }) });
    expect(dots()).toBe(15);
    expect(frame()).toBeNull();
  });

  it('a K-2 student who chooses a harder set keeps the dots', async () => {
    await mount({ ctx: { gradeLevel: '2nd Grade' }, lab: visual(3, 5, { band: 'core' }) });
    expect(dots()).toBe(15);
  });

  it('the build still shows the dots, at every grade, and the row buttons work', async () => {
    await mount({ ctx: { gradeLevel: '5th Grade' }, lab: visual(3, 5) });
    await click('I am not sure: just build it');
    expect(dots()).toBe(15);
    expect(frame()).toBeNull();
    expect(host.querySelectorAll('[data-mt-skiprow]').length).toBe(3);
  });

  it('moving a slider after a build goes back to the frame, not to dots', async () => {
    await mount({ ctx: { gradeLevel: '5th Grade' }, lab: visual(3, 5) });
    await click('I am not sure: just build it');
    await slide('mt-visual-b', 2);
    expect(dots()).toBe(0);
    expect(frame()).toBeTruthy();
    expect(host.querySelector('[data-mt-live-total]').textContent).toBe('3 × 2 = ?');
  });

  it('building the open fact from the frame still counts as seeing it', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8, { badges: { firstCorrect: true } }), challenge: tool() });
    expect(frame()).toBeTruthy();
    await click('I am not sure: just build it');
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    expect(view.awards).toEqual([]);
  });

  it('the frame on its own pays nothing and marks nothing as seen', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8, { badges: { firstCorrect: true } }), challenge: tool() });
    await click(button('5 + 2 rows'));
    expect(view.awards).toEqual([]);
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    expect(view.awards.length).toBe(1);
  });
});

describe('the frame is something to do, and not a way to count', () => {
  it('it shows the rows and the row size, in words a reader can see', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8) });
    const text = host.querySelector('[data-mt-predict]').textContent;
    expect(text).toContain('7 rows');
    expect(text).toContain('8 in each row');
    expect(text).toContain('The dots appear when you build it.');
    expect(text).toContain('Split the rows into facts you know, then add the parts.');
  });

  it('one row reads properly and has no split to make', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(1, 1) });
    const text = host.querySelector('[data-mt-predict]').textContent;
    expect(text).toContain('1 row');
    expect(text).not.toMatch(/\b1 rows\b/);
    expect(host.querySelectorAll('[data-mt-frame-split] button').length).toBe(0);
    expect(text).not.toContain('Split the rows');
  });

  it('a split tints the two parts, says what they are, and never says a total', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8) });
    const five = button('5 + 2 rows');
    expect(five.getAttribute('aria-pressed')).toBe('false');
    await click(five);
    const pressed = host.querySelector('[data-mt-frame-split] button[aria-pressed="true"]');
    expect(pressed.textContent).toContain('5 + 2 rows');
    expect(frame().getAttribute('data-mt-frame-parts')).toBe('5,2');
    expect(host.querySelector('[data-mt-frame-said]').textContent).toContain('Split into 5 + 2 rows, with 8 in each row.');
    expect(view.ann.join(' ')).toContain('Split into 5 + 2 rows');
    expect(document.activeElement === pressed || document.activeElement === document.body).toBe(true);
  });

  it('pressing the same split again removes it', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8) });
    await click(button('5 + 2 rows'));
    await click(host.querySelector('[data-mt-frame-split] button[aria-pressed="true"]'));
    expect(host.querySelectorAll('[data-mt-frame-split] button[aria-pressed="true"]').length).toBe(0);
    expect(frame().getAttribute('data-mt-frame-parts')).toBe('');
    expect(view.ann[view.ann.length - 1]).toBe('Split removed.');
  });

  it('a split belongs to one fact: a new fact starts unsplit', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8) });
    await click(button('5 + 2 rows'));
    await slide('mt-visual-a', 6);
    expect(frame().getAttribute('data-mt-frame-parts')).toBe('');
    expect(button('5 + 1 rows')).toBeTruthy();
  });

  it('the split is never saved', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(7, 8) });
    await click(button('5 + 2 rows'));
    expect(JSON.stringify(view.lab)).not.toMatch(/split/i);
  });

  it('split buttons are real targets: pressed state, a group name, and 44 px', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(12, 3) });
    const group = host.querySelector('[data-mt-frame-split]');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Choose a row split');
    const labels = [...group.querySelectorAll('button')].map((b) => b.textContent.trim());
    expect(labels).toEqual(['10 + 2 rows', '5 + 7 rows', '6 + 6 rows', '1 + 11 rows']);
    for (const b of group.querySelectorAll('button')) {
      expect(b.getAttribute('type')).toBe('button');
      expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
  });

  it.each([[2, 2], [1, 12], [12, 1], [12, 12], [2, 5]])('%i x %i: every option adds up to the rows', async (a, b) => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: visual(a, b) });
    for (const btn of host.querySelectorAll('[data-mt-frame-split] button')) {
      const [, p, q] = btn.textContent.match(/(\d+) \+ (\d+)/);
      expect(Number(p) + Number(q)).toBe(a);
      expect(Number(p)).toBeGreaterThan(0);
      expect(Number(q)).toBeGreaterThan(0);
    }
  });

  it.each([[7, 8], [6, 9], [12, 12], [11, 12], [9, 9], [3, 7], [4, 6]])('%i x %i: no total in any text, label, data attribute or announcement, and nothing countable', async (a, b) => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: visual(a, b, { visualSkipOn: true }) });
    const card = host.querySelector('[data-mt-predict]');
    const product = new RegExp('(^|[^\\d])' + a * b + '([^\\d]|$)');
    expect(product.test(reach(card, view.ann)), reach(card, view.ann).slice(0, 400)).toBe(false);
    const split = host.querySelector('[data-mt-frame-split] button');
    if (split) await click(split);
    expect(product.test(reach(host.querySelector('[data-mt-predict]'), view.ann))).toBe(false);
    // One mark per row and per column, and no shape per dot.
    const svg = frame().querySelector('svg');
    expect(svg.querySelectorAll('circle').length).toBe(0);
    expect(svg.querySelectorAll('[data-mt-tick="row"]').length).toBe(a);
    expect(svg.querySelectorAll('[data-mt-tick="col"]').length).toBe(b);
    expect(svg.querySelectorAll('line, rect, path').length).toBeLessThanOrEqual(a + b + 4);
    expect(host.querySelectorAll('[data-mt-skip-total]').length).toBe(0);
  });

  it('the frame keeps the question for a screen reader', async () => {
    await mount({ ctx: { gradeLevel: '5th Grade' }, lab: visual(7, 8) });
    const el = frame();
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Rows: 7. Dots in each row: 8. How many dots in all?');
    expect(el.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('hostile saved factors still draw a whole frame', async () => {
    const errs = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => errs.push(a.join(' ')));
    for (const [a, b] of [[2.5, 3.5], ['x', {}], [999, -4], [null, null]]) {
      await mount({ ctx: { gradeLevel: '5th Grade' }, lab: visual(a, b) });
      expect(frame()).toBeTruthy();
      expect(frame().querySelectorAll('[data-mt-tick="row"]').length).toBeGreaterThan(0);
      await act(() => root.unmount()); root = null; host.remove();
    }
    root = null; host = null;
    expect(errs).toEqual([]);
  });
});

describe('no explainer gives away an open question', () => {
  const openPatterns = (challenge, more) => mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: Object.assign({ mtTab: 'patterns' }, more || {}) }, challenge });
  const explain = async (id) => {
    await click(host.querySelector('[data-mt-pattern="' + id + '"]'));
    return host.querySelector('[data-mt-pattern-explain]').textContent;
  };
  const whyPatterns = () => [...host.querySelectorAll('details')].find((d) => d.textContent.includes('Why patterns beat')).textContent;

  it('with 7 x 8 open, neither 7 x 8 text quotes 56; both still teach the split, on another fact', async () => {
    await openPatterns(tool());
    const text = await explain('distributive');
    expect(text).not.toMatch(/\b56\b/);
    expect(text).not.toContain('7×8');
    expect(text).toContain('7×6 = (5+2)×6 = 5×6 + 2×6 = 30 + 12 = 42');
    expect(whyPatterns()).not.toMatch(/\b56\b/);
    expect(whyPatterns()).toContain('7×6 = 5×6 + 2×6 = 30 + 12 = 42');
    expect(host.querySelector('[role="tabpanel"]').textContent).not.toMatch(/\b56\b/);
  });

  it.each([
    ['the twin', tool({ a: 8, b: 7 })],
    ['division', tool({ mode: 'div', divisor: 7 })],
    ['missing factor', tool({ mode: 'missing', known: 7 })],
  ])('%s of 7 x 8 hides it too', async (_n, ch) => {
    await openPatterns(ch);
    expect(await explain('distributive')).not.toMatch(/\b56\b/);
    expect(whyPatterns()).not.toMatch(/\b56\b/);
  });

  it('the same fact open in a fluency round hides it too', async () => {
    const flu = { id: 'r1', round: [{ a: 7, b: 8, mode: 'mult' }, { a: 2, b: 3, mode: 'mult' }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] };
    await openPatterns(null, { flu });
    expect(await explain('distributive')).not.toMatch(/\b56\b/);
    expect(whyPatterns()).not.toMatch(/\b56\b/);
  });

  it('a part of the worked split is covered too: 5 x 8 and 2 x 8 are also facts', async () => {
    await openPatterns(tool({ a: 5, b: 8 }));
    expect(await explain('distributive')).not.toMatch(/\b40\b/);
    expect(whyPatterns()).not.toMatch(/\b40\b/);
    await act(() => root.unmount()); root = null; host.remove();
    await openPatterns(tool({ a: 2, b: 8 }));
    expect(await explain('distributive')).not.toMatch(/\b16\b/);
  });

  it('with 7 x 8 AND 7 x 6 open, the example moves on again', async () => {
    const flu = { id: 'r1', round: [{ a: 7, b: 6, mode: 'mult' }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] };
    await openPatterns(tool(), { flu });
    const text = await explain('distributive');
    expect(text).not.toMatch(/\b56\b|\b42\b/);
    expect(text).toContain('7×4 = (5+2)×4');
  });

  it('with nothing open, or another fact open, the text stays as it was', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'patterns' } } });
    expect(await explain('distributive')).toContain('Forgot 7×8? Split: 7×8 = (5+2)×8 = 5×8 + 2×8 = 40 + 16 = 56.');
    expect(whyPatterns()).toContain('Forget 7×8? 7×8 = 5×8 + 2×8 = 40 + 16 = 56.');
    await act(() => root.unmount()); root = null; host.remove();
    await openPatterns(tool({ a: 3, b: 4 }));
    expect(await explain('distributive')).toContain('= 56.');
  });

  it('once the question is answered, the usual text comes back', async () => {
    await openPatterns(tool());
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    await click(host.querySelector('#multtable-tab-patterns'));
    expect(await explain('distributive')).toContain('= 56.');
  });

  it.each([
    ['fives', [5, 3], /\b15\b/],
    ['nines', [9, 7], /\b63\b/],
    ['nines', [3, 9], /\b27\b/],
    ['squares', [7, 7], /\b49\b/],
    ['doubles', [7, 2], /\b14\b/],
    ['tens', [7, 10], /\b70\b/],
    ['elevens', [11, 7], /\b77\b/],
    ['elevens', [11, 12], /\b132\b/],
  ])('%s with %j open: the worked example is held back, with a reason', async (id, [a, b], answer) => {
    await openPatterns(tool({ a, b }));
    const text = await explain(id);
    expect(text).not.toMatch(answer);
    expect(text).toContain('stays hidden until you answer');
  });

  it.each(['fives', 'nines', 'squares', 'doubles', 'tens', 'elevens'])('%s with an unrelated fact open: the text stays', async (id) => {
    await openPatterns(tool({ a: 3, b: 4 }));
    expect(await explain(id)).not.toContain('stays hidden until you answer');
  });
});
