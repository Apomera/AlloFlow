import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Independent hunt of the Multiplication Table engagement build (2026-11-04).
// Each test failed on the hunt's start copy (MULTTABLE_DEEP_SRC points it at another copy).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;
let scrolled = [];

beforeEach(() => {
  resetStemLab(); loadTool(FILE, 'multtable');
  scrolled = [];
  Element.prototype.scrollIntoView = function (opts) { scrolled.push({ el: this, opts }); };
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
const settle = () => act(() => new Promise((r) => setTimeout(r, 90)));
function button(name, scope) {
  return [...(scope || host).querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name) || null;
}
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
const key = (el, k) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
const active = () => document.activeElement;
const ext = (view) => view.lab._multExt || {};
const tool = (over) => Object.assign({ a: 7, b: 8, mode: 'mult', divisor: null, source: 'tool', id: 'open-q' }, over || {});

describe('fact-set radios do not move the learner', () => {
  it('a learner with no saved tab who arrows to the K-2 set stays on Practice, with focus on the radio', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' } });
    host.querySelector('#mt-band-core').focus();
    await key(host.querySelector('#mt-band-core'), 'ArrowLeft');
    expect(ext(view).band).toBe('early');
    expect(host.querySelector('#multtable-tab-practice').getAttribute('aria-selected')).toBe('true');
    expect(active().id).toBe('mt-band-early');
    await key(active(), 'ArrowRight');
    expect(ext(view).band).toBe('core');
    expect(active().id).toBe('mt-band-core');
  });

  it('pressing the set that is already chosen keeps the direction and range the learner picked', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'practice', quizMode: 'div', difficulty: 'hard' } } });
    await click(host.querySelector('#mt-band-core'));
    expect(ext(view)).toMatchObject({ quizMode: 'div', difficulty: 'hard' });
    expect(view.ann.filter((m) => m.startsWith('Fact set:'))).toEqual([]);
  });

  it('a teacher lock: arrows stay on the one set and change nothing', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'practice', quizMode: 'div', difficulty: 'hard', teacher: { lockBand: 'core' } } } });
    host.querySelector('#mt-band-core').focus();
    await key(host.querySelector('#mt-band-core'), 'ArrowRight');
    expect(active().id).toBe('mt-band-core');
    expect(view.ann).toEqual([]);
    expect(ext(view).band).toBeUndefined();
  });
});

describe('a path step launch', () => {
  it('replaces a practice-only question it could not count (a fact picked from the table)', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, challenge: tool({ mode: 'div', divisor: 7, source: 'chosen', id: 'picked' }) });
    await click(host.querySelector('[data-mt-path-next="division"]'));
    await settle();
    expect(view.challenge.source).toBe('tool');
    expect(view.challenge.mode).toBe('div');
    expect(view.challenge.id).not.toBe('picked');
  });

  it('replaces an open fact outside the step\'s set: it could never tick "facts with 2s, 5s and 10s"', async () => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { pathOpen: true, visualExplored: { '2x2': 1, '2x3': 1, '2x4': 1 }, patternsExplored: { doubles: 1, fives: 1, tens: 1 } } }, challenge: tool() });
    await click(host.querySelector('[data-mt-path-step="foundations"]'));
    await settle();
    const c = view.challenge;
    expect(c.id).not.toBe('open-q');
    expect([c.a, c.b].some((n) => n === 2 || n === 5 || n === 10)).toBe(true);
  });

  it('keeps an open fact that does count for the step, with what the learner typed', async () => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { pathOpen: true } }, challenge: tool({ a: 2, b: 5, id: 'keep' }) });
    await click(host.querySelector('[data-mt-path-step="foundations"]'));
    await settle();
    expect(view.challenge.id).toBe('keep');
  });

  it('does not rewrite a running Speed Run\'s direction and range, or replace its question', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { mtTab: 'practice', quizMode: 'mult', difficulty: 'tens' } } });
    await click(button('Speed Run (2min)'));
    const q = view.challenge.id;
    await click(host.querySelector('[data-mt-path-next="division"]'));
    await settle();
    expect(view.challenge.id).toBe(q);
    expect(ext(view)).toMatchObject({ quizMode: 'mult', difficulty: 'tens' });
    expect(view.lab._multTimer.active).toBe(true);
    expect(active().id).toBe('multtable-input');
  });

  it('a finished step in the list does not wipe the results of a finished fluency round', async () => {
    const round = [{ a: 2, b: 3, mode: 'mult' }];
    const flu = { id: 'r1', round, i: 0, results: [{ a: 2, b: 3, mode: 'mult', first: false, ok: true }], tries: 0, phase: 'done', resolved: false, comeBack: [], counted: true };
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { pathOpen: true, fluencyRounds: 1, flu } } });
    await click(host.querySelector('[data-mt-path-step="climb"]'));
    await settle();
    expect(ext(view).flu.id).toBe('r1');
    expect(host.querySelector('[data-mt-flu-done]')).toBeTruthy();
    expect(active().hasAttribute('data-mt-flu-start')).toBe(true);
  });

  it('K-2 arrays step with this fact already built opens the next fact to build, not the same finished one', async () => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { visualA: 2, visualB: 5, visualPred: { key: '2x5', built: true, committed: null }, visualExplored: { '2x5': true } } } });
    await click(host.querySelector('[data-mt-path-next="arrays"]'));
    await settle();
    expect(ext(view).visualA + 'x' + ext(view).visualB).toBe('2x3');
    expect(active().hasAttribute('data-mt-predict-input')).toBe(true);
    expect(host.querySelector('[data-mt-built]')).toBeNull();
  });

  it('the sieve step lands on a control, also once the sieve is finished, and never centres the whole panel', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { pathOpen: true } } });
    await click(host.querySelector('[data-mt-path-step="sieve"]'));
    await settle();
    expect(active().tagName === 'BUTTON' || active().getAttribute('role') === 'gridcell', 'focus on ' + active().outerHTML.slice(0, 80)).toBe(true);
    expect(view.lab._multExt.mtTab).toBe('factors');
    expect(scrolled.filter((s) => s.el.getAttribute && s.el.getAttribute('role') === 'tabpanel')).toEqual([]);
  });
});

describe('focus', () => {
  it('a step during a resolved Speed Run question lands on "Next question", not on the tall panel', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { mtTab: 'practice' } } });
    await click(button('Speed Run (2min)'));
    await settle();
    const c = view.challenge;
    const ans = c.mode === 'div' ? (Number(c.divisor) === c.a ? c.b : c.a) : c.mode === 'missing' ? (Number(c.known) === c.a ? c.b : c.a) : c.mode === 'divmiss' ? (c.form === 'divisor' ? c.divisor : c.a * c.b) : c.a * c.b;
    await typeInto('#multtable-input', ans);
    await click('Check');
    await click(host.querySelector('[data-mt-path-next]'));
    await settle();
    expect(active().hasAttribute('data-mt-next')).toBe(true);
    expect(view.lab._multTimer.active).toBe(true);
  });

  it('a step with nothing to land on shows the top of the panel, not its middle', async () => {
    await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { mtTab: 'practice' }, _multTimer: { drill: { active: true, items: [{ a: 2, b: 3, mode: 'mult' }], cleared: {} } } } });
    await click(host.querySelector('[data-mt-path-next]'));
    await settle();
    const hit = scrolled.at(-1);
    expect(hit.el.getAttribute('role')).toBe('tabpanel');
    expect(hit.opts.block).toBe('start');
  });

  it('the next Speed Run question does not pull back a learner who has moved to another control', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'practice', quizMode: 'mult' } } });
    await click(button('Speed Run (2min)'));
    await settle();
    const c = view.challenge;
    await typeInto('#multtable-input', c.a * c.b);
    await click('Check');
    await settle();
    const pause = button('Pause Speed Run');
    await act(() => pause.focus());
    await act(() => new Promise((r) => setTimeout(r, 1350)));
    expect(view.challenge.id).not.toBe(c.id);
    expect(active()).toBe(pause);
  });

  it('a teacher word-problem lock still wins when a step launches one', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { pathOpen: true, teacher: { wpLock: 'two' } } } });
    await click(host.querySelector('[data-mt-path-step="words"]'));
    await settle();
    expect(view.lab._multExt.wp.item.steps.length).toBe(2);
  });

  it('moving through the tabs does not jump into the answer box of an open question', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'patterns' } }, challenge: tool() });
    const patterns = host.querySelector('#multtable-tab-patterns');
    patterns.focus();
    await key(patterns, 'ArrowLeft');
    await settle();
    expect(active().id).toBe('multtable-tab-practice');
    expect(host.querySelector('#multtable-input')).toBeTruthy();
  });

  it('Speed Run and the Q shortcut still put focus in the answer box', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'practice' } } });
    await click(button('Speed Run (2min)'));
    await settle();
    expect(active().id).toBe('multtable-input');
    await act(() => active().blur());
    const panel = host.querySelector('[role="tabpanel"]');
    panel.focus();
    await key(panel, 'q');
    await settle();
    expect(active().id).toBe('multtable-input');
  });

  it('the prediction box a path step lands on names the question, and so do the other landing controls', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    await click(host.querySelector('[data-mt-path-next="arrays"]'));
    await settle();
    const ids = (active().getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    const said = ids.map((id) => document.getElementById(id).textContent).join(' ');
    expect(said).toContain('2 rows of 5');
  });

  it('coming back to an open word problem, fact or detective question: the control names it', async () => {
    const said = () => (active().getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id).textContent).join(' ');
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { pathOpen: true } } });
    await click(host.querySelector('[data-mt-path-step="words"]'));
    await settle();
    expect(said()).toBe(host.querySelector('[data-mt-wp-text]').textContent);
    await click(host.querySelector('[data-mt-path-step="climb"]'));
    await settle();
    expect(said()).toBe(host.querySelector('[data-mt-flu-q]').textContent);
    await act(() => root.unmount()); root = null; host.remove(); host = null;
    await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { pathOpen: true } } });
    await click(host.querySelector('[data-mt-path-step="primes"]'));
    await settle();
    expect(said()).toBe(host.querySelector('[data-mt-det-question]').textContent);
  });
});

describe('the answer to an open question is not one tab away', () => {
  it('building the open fact in Arrays counts as seeing it: no XP when it is then answered', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { badges: { firstCorrect: true }, mtTab: 'practice', visualA: 7, visualB: 8 } }, challenge: tool() });
    await click(host.querySelector('#multtable-tab-visual'));
    await click('I am not sure: just build it');
    expect(host.querySelector('[data-mt-built]').textContent).toContain('56');
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    expect(view.feedback.correct).toBe(true);
    expect(view.awards).toEqual([]);
  });

  it('building the twin of an open division fact counts too; a different fact does not', async () => {
    let view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { badges: { firstCorrect: true }, mtTab: 'visual', visualA: 8, visualB: 7 } }, challenge: tool({ mode: 'div', divisor: 7 }) });
    await click('I am not sure: just build it');
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 8);
    await click('Check');
    expect(view.awards).toEqual([]);
    await act(() => root.unmount()); root = null; host.remove(); host = null;
    view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { badges: { firstCorrect: true }, mtTab: 'visual', visualA: 2, visualB: 3 } }, challenge: tool() });
    await click('I am not sure: just build it');
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    expect(view.awards.length).toBe(1);
  });

  it('building the open fluency fact counts as seeing it', async () => {
    const flu = { id: 'r1', round: [{ a: 7, b: 8, mode: 'mult' }, { a: 2, b: 3, mode: 'mult' }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] };
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'visual', visualA: 7, visualB: 8, flu } } });
    await click('I am not sure: just build it');
    await click(host.querySelector('#multtable-tab-fluency'));
    await typeInto('#mt-flu-input', 56);
    await click('✔ Check');
    expect(view.awards).toEqual([]);
  });

  it('an array built before the question opened does not show its total until it is built again', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { badges: { firstCorrect: true }, mtTab: 'visual', visualA: 7, visualB: 8, visualPred: { key: '7x8', built: true, committed: null } } }, challenge: tool() });
    expect(host.querySelector('[data-mt-built]')).toBeNull();
    expect(host.querySelector('[data-mt-predict]')).toBeTruthy();
    await click('I am not sure: just build it');
    expect(host.querySelector('[data-mt-built]')).toBeTruthy();
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    expect(view.awards).toEqual([]);
  });

  it('testing the open fact as evidence for a pattern claim counts as seeing it', async () => {
    const view = await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { badges: { firstCorrect: true }, mtTab: 'patterns' } }, challenge: tool() });
    const section = host.querySelector('[data-mt-claims]');
    const inputs = [...section.querySelectorAll('input[type="number"]')];
    if (!inputs.length) {
      const pick = [...section.querySelectorAll('button')][0];
      await click(pick);
    }
    const [fa, fb] = [...section.querySelectorAll('input[type="number"]')];
    await typeInto(fa, 7);
    await typeInto(fb, 8);
    const testBtn = [...section.querySelectorAll('button')].find((b) => /test/i.test(b.textContent));
    await click(testBtn);
    await click(host.querySelector('#multtable-tab-practice'));
    await typeInto('#multtable-input', 56);
    await click('Check');
    expect(view.awards).toEqual([]);
  });

  it('the Patterns table hides the open fact and its twin, and only those', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'patterns' } }, challenge: tool() });
    const cells = [...host.querySelectorAll('[role="region"] td')];
    expect(cells.some((td) => td.textContent === '56')).toBe(false);
    expect(cells.filter((td) => td.textContent === '?').length).toBe(2);
    expect(cells.some((td) => td.textContent === '63')).toBe(true);
  });

  it('with no open question the Patterns table shows every product', async () => {
    await mount({ ctx: { gradeLevel: '4th Grade' }, lab: { _multExt: { mtTab: 'patterns' } } });
    const cells = [...host.querySelectorAll('[role="region"] td')];
    expect(cells.filter((td) => td.textContent === '56').length).toBe(2);
    expect(cells.filter((td) => td.textContent === '?').length).toBe(0);
  });
});

describe('skip-count rows pay nothing and count nothing', () => {
  it('rapid taps leave XP, badges, the path count and the explored list alone', async () => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { visualA: 4, visualB: 5, visualExplored: { '4x5': true }, visualPred: { key: '4x5', built: true, committed: null } } } });
    const before = JSON.stringify({ e: ext(view).visualExplored, b: ext(view).badges });
    const rows = () => [...host.querySelectorAll('[data-mt-skiprow]')];
    for (let i = 0; i < 40; i++) await act(() => rows()[i % 4].click());
    expect(view.awards).toEqual([]);
    expect(JSON.stringify({ e: ext(view).visualExplored, b: ext(view).badges })).toBe(before);
    expect(host.querySelector('[data-mt-path-count]').getAttribute('data-mt-path-count')).toBe('0');
  });
});

describe('nothing shows the total before the build', () => {
  it.each([[1, 1], [2, 5], [7, 8], [12, 12]])('%i x %i: no product in the panel text, aria, data attributes or announcements', async (a, b) => {
    const view = await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { mtTab: 'visual', visualA: a, visualB: b, visualSkipOn: true } } });
    const card = host.querySelector('[data-mt-predict]');
    const product = String(a * b);
    const attrs = [...card.querySelectorAll('*'), card].flatMap((n) => [...n.attributes].filter((at) => !/^(class|style|type|inputmode)$/.test(at.name)).map((at) => at.value));
    const hay = attrs.concat(card.textContent, view.ann).join(' | ');
    if (a * b > 12) expect(new RegExp('\\b' + product + '\\b').test(hay), hay.slice(0, 300)).toBe(false);
    expect(card.querySelectorAll('[data-mt-skip-total]').length).toBe(0);
    expect(card.querySelectorAll('[data-mt-skiprow]').length).toBe(0);
  });

  it('the live array label reads properly for one row and one dot', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: { mtTab: 'visual', visualA: 1, visualB: 1 } } });
    const label = host.querySelector('[data-mt-live-array]').getAttribute('aria-label');
    expect(label).not.toMatch(/\b1 rows\b|\b1 dots\b/);
  });
});

describe('legacy and hostile saved state reaching the new code', () => {
  it.each([
    ['text guess and commit', { visualPred: { key: '2x5', built: true, committed: 'abc', guess: 7 } }],
    ['object guess', { visualPred: { key: '2x5', built: false, guess: { x: 1 } } }],
    ['wrong types', { visualPred: 'x', visualExplored: [1, 2], patternsExplored: 'no', modeCorrect: 7, factScores: 'x', teacher: 'x', band: 'zz', difficulty: 'zz', quizMode: 'zz', mtTab: 'zz' }],
    ['decimal factors', { visualA: 2.5, visualB: 3.5, mtTab: 'visual' }],
    ['progress-only autosave bucket', { badges: { visualLearner: true }, totalCorrect: 3, visualExplored: { '2x5': true }, modeCorrect: { div: 2 } }],
  ])('%s: mounts with whole rows and a whole number of dots', async (_n, saved) => {
    const errs = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => errs.push(a.join(' ')));
    await mount({ ctx: { gradeLevel: '1st Grade' }, lab: { _multExt: Object.assign({ visualA: 2, visualB: 5 }, saved) } });
    expect(errs).toEqual([]);
    const a = host.querySelector('#mt-visual-a');
    if (a) expect(Number.isInteger(Number(a.value))).toBe(true);
    const live = host.querySelector('[data-mt-live-total]');
    if (live) expect(live.textContent).toMatch(/^\d+ × \d+ = \?$/);
  });
});
