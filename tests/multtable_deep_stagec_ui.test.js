import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage C (2026-11-03), mounted and clicked: the "Start
// here" path, band tab order, one teacher panel for every tab, the same hint
// ladder and on-demand reveal in every tab, translated quest labels, and the
// rhythm's AudioContext lifecycle. MULTTABLE_DEEP_SRC points it at another copy.

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  delete window.AudioContext;
  window._multTableMuted = false;
  vi.restoreAllMocks();
  vi.useRealTimers();
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
    const [ctxExtra, setCtxExtra] = React.useState(opts.ctx || {});
    Object.assign(view, { lab, challenge, feedback, setLab, setChallenge, setCtxExtra });
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
    }, ctxExtra)));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
async function unmount() { await React.act(async () => { root.unmount(); }); root = null; host.remove(); host = null; }
const act = (fn) => React.act(async () => { await fn(); });
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
const text = (sel) => (host.querySelector(sel) || { textContent: '' }).textContent;
const tabIds = () => [...host.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('multtable-tab-', ''));
const selectedTab = () => host.querySelector('[role="tab"][aria-selected="true"]').id.replace('multtable-tab-', '');
const steps = () => [...host.querySelectorAll('[data-mt-path-step]')];
const awardsFor = (view, reason) => view.awards.filter((a) => a[0] === 'multtable' && a[2] === reason);

describe('"Start here" path and band tab order', () => {
  it('K-2 opens on Arrays, with arrays and the 2s, 5s and 10s first', async () => {
    await mount({ ctx: { gradeLevel: '1st Grade' } });
    expect(host.querySelector('[data-mt-path]').getAttribute('data-mt-path')).toBe('early');
    expect(tabIds()).toEqual(['visual', 'practice', 'patterns', 'fluency', 'words', 'factors']);
    expect(selectedTab()).toBe('visual');
    // Compact by default: one "next step" button; the full list opens on request.
    expect(steps()).toHaveLength(0);
    expect(text('[data-mt-path-next="arrays"]')).toBe('Next, step 1: Build 3 facts as arrays (0 of 3)');
    await click('Show all steps');
    expect(steps().map((s) => s.getAttribute('data-mt-path-step'))).toEqual(['arrays', 'skipPatterns', 'foundations', 'climb']);
    expect(steps()[0].textContent).toContain('Build 3 facts as arrays');
    expect(steps()[0].getAttribute('aria-current')).toBe('step');
    expect(text('[data-mt-path]')).toContain('0 of 4 steps done');
  });

  it('grades 3-4 get strategies, all facts, word problems and the climb; grade 5 gets division, missing numbers and primes', async () => {
    const open = { _multExt: { pathOpen: true } };
    await mount({ ctx: { gradeLevel: '3rd Grade' }, lab: open });
    expect(tabIds().slice(0, 4)).toEqual(['practice', 'patterns', 'words', 'fluency']);
    expect(steps().map((s) => s.getAttribute('data-mt-path-step'))).toEqual(['strategies', 'allFacts', 'words', 'climb']);
    await unmount();
    await mount({ ctx: { gradeLevel: '5th Grade' }, lab: open });
    expect(tabIds().slice(0, 2)).toEqual(['practice', 'factors']);
    expect(steps().map((s) => s.getAttribute('data-mt-path-step'))).toEqual(['division', 'missing', 'primes', 'sieve']);
  });

  it('a step opens its tab with the right direction and fact set, and its tick comes from real answers', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' } });
    await click(host.querySelector('[data-mt-path-next="division"]'));
    expect(view.lab._multExt).toMatchObject({ mtTab: 'practice', quizMode: 'div', difficulty: 'hard' });
    expect(view.ann.at(-1)).toContain('Step 1: Answer 10 division facts.');
    await click('Quick Quiz');
    const c = view.challenge;
    expect(c.mode).toBe('div');
    await typeInto('#multtable-input', c.divisor === c.a ? c.b : c.a); await click('Check');
    expect(view.lab._multExt.modeCorrect).toEqual({ div: 1 });
    expect(text('[data-mt-path-next]')).toContain('(1 of 10)');
    await click('Show all steps');
    expect(steps()[0].textContent).toContain('1 of 10 so far.');
  });

  it('facts picked from the table or drilled after a review do not tick the path', async () => {
    for (const source of ['chosen', 'drill']) {
      const view = await mount({ challenge: { a: 6, b: 7, mode: 'div', divisor: 6, source, id: 'p-' + source } });
      await typeInto('#multtable-input', 7); await click('Check');
      expect(view.feedback, source).toMatchObject({ correct: true, resolved: true });
      expect(((view.lab._multExt || {}).modeCorrect || {}), source).toEqual({});
      await unmount();
    }
    const view = await mount({ challenge: { a: 6, b: 7, mode: 'div', divisor: 6, source: 'tool', id: 'p-tool' } });
    await typeInto('#multtable-input', 7); await click('Check');
    expect(view.lab._multExt.modeCorrect).toEqual({ div: 1 });
  });

  it('a teacher direction lock is kept when a step opens Practice', async () => {
    const view = await mount({ ctx: { gradeLevel: '5th Grade' }, lab: { _multExt: { pathOpen: true, teacher: { lockMode: 'mult' } } } });
    await click(steps()[1]);
    expect(view.lab._multExt.quizMode).toBeUndefined();
    expect(host.querySelector('#multtable-tab-practice').getAttribute('aria-selected')).toBe('true');
  });

  it('the steps can be hidden by the learner and turned off by the teacher', async () => {
    const view = await mount();
    await click('Show all steps');
    expect(steps()).toHaveLength(4);
    expect(view.lab._multExt.pathOpen).toBe(true);
    await click('Hide the steps');
    expect(steps()).toHaveLength(0);
    expect(view.lab._multExt.pathOpen).toBe(false);
    await unmount();
    const teacher = await mount({ ctx: { isTeacherMode: true } });
    await click(host.querySelector('[data-mt-teacher] [role="group"][aria-label=\'"Start here" steps\'] button:nth-of-type(2)'));
    const saved = teacher.lab;
    await unmount();
    await mount({ lab: saved });
    expect(host.querySelector('[data-mt-path]')).toBeNull();
  });
});

describe('one teacher panel for every tab', () => {
  it('shows once on each tab for teachers and never for learners', async () => {
    const view = await mount({ ctx: { isTeacherMode: true } });
    for (const tab of ['practice', 'visual', 'patterns', 'factors', 'words', 'fluency']) {
      await act(() => view.setLab((p) => ({ ...p, _multExt: { ...(p._multExt || {}), mtTab: tab } })));
      expect(host.querySelectorAll('[data-mt-teacher]'), tab).toHaveLength(1);
      expect(host.querySelector('[role="tabpanel"] [data-mt-teacher]'), tab).toBeNull();
    }
    await unmount();
    await mount({ lab: { _multExt: { mtTab: 'fluency' } } });
    expect(host.querySelector('[data-mt-teacher]')).toBeNull();
  });
});

describe('the same hint ladder and on-demand reveal in every tab', () => {
  const fluLab = (extra) => ({ _multExt: { mtTab: 'fluency', ...(extra || {}), flu: { round: [{ a: 7, b: 8, mode: 'mult' }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] } } });

  it('fluency: no reveal button after one try, rung 2 and "Show me" after two, a third try still allowed', async () => {
    const view = await mount({ lab: fluLab() });
    await typeInto('#mt-flu-input', 15); await click('✔ Check');
    expect(host.querySelector('[data-mt-flu-feedback] [data-mt-hint-ladder="1"]')).toBeTruthy();
    expect(button('Show me the answer')).toBeNull();
    await typeInto('#mt-flu-input', 63); await click('✔ Check');
    expect(host.querySelector('[data-mt-flu-feedback] [data-mt-hint-ladder="2"] [data-mt-hint-picture]')).toBeTruthy();
    expect(text('[data-mt-flu-feedback]')).toContain('Try 3 of 3.');
    expect(button('Show me the answer')).toBeTruthy();
    await typeInto('#mt-flu-input', 56); await click('✔ Check');
    expect(view.lab._multExt.flu).toMatchObject({ resolved: true, ok: true, firstTry: false });
    expect(awardsFor(view, 'multiplication fact, second try')).toHaveLength(1);
  });

  it('fluency follows the teacher\'s settings: two tries, and no "Show me" button', async () => {
    const view = await mount({ lab: fluLab({ teacher: { tries: 2, showAnswer: false } }) });
    await typeInto('#mt-flu-input', 15); await click('✔ Check');
    await typeInto('#mt-flu-input', 63); await click('✔ Check');
    expect(view.lab._multExt.flu).toMatchObject({ resolved: true, ok: false });
    await unmount();
    await mount({ lab: fluLab({ teacher: { showAnswer: false } }) });
    await typeInto('#mt-flu-input', 15); await click('✔ Check');
    await typeInto('#mt-flu-input', 63); await click('✔ Check');
    expect(button('Show me the answer')).toBeNull();
  });

  const share = { type: 'groups_share', a: 4, b: 6, p: 24, vals: { p: 24, a: 4 }, steps: [{ l: 24, op: 'div', r: 4, v: 6 }], ops: ['div'], answer: 6, variant: 1, id: 'w', options: [['mul'], ['div'], ['add'], ['sub']] };
  const wpLab = () => ({ _multExt: { mtTab: 'words', wp: { item: share, phase: 'op', opTries: 0, opWrong: [], step: 0, ansTries: 0, solved: [] } } });

  it('word problems: the answer step uses the ladder, and "Show me the answer" earns nothing', async () => {
    const view = await mount({ lab: wpLab() });
    await click('Divide (÷)');
    await typeInto('[data-mt-wp-input]', 24); await click('✔ Check');
    expect(host.querySelector('[data-mt-wp-feedback] [data-mt-hint-ladder="1"]')).toBeTruthy();
    expect(text('[data-mt-wp-feedback]')).toContain('Not yet. You said 24.');
    expect(button('Show me the answer')).toBeNull();
    await typeInto('[data-mt-wp-input]', 5); await click('✔ Check');
    expect(host.querySelector('[data-mt-wp-feedback] [data-mt-wp-picture="hint"]')).toBeTruthy();
    await click('Show me the answer');
    expect(text('[data-mt-wp-done]')).toContain('Here is the answer.');
    expect(awardsFor(view, 'word problem')).toHaveLength(0);
    expect(view.lab._multExt.wordSolved).toBeUndefined();
  });

  it('word problems: an operation found only on the third pick earns nothing', async () => {
    const view = await mount({ lab: wpLab() });
    await click('Add (+)'); await click('Subtract (−)'); await click('Divide (÷)');
    await typeInto('[data-mt-wp-input]', 6); await click('✔ Check');
    expect(text('[data-mt-wp-done]')).toContain('The answer is 6.');
    expect(awardsFor(view, 'word problem')).toHaveLength(0);
  });

  it('fact family: a second wrong check keeps the family open with "Show me the family"', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'visual' } } });
    await click('Give me a fact family');
    const tick = async (id) => act(() => host.querySelector(`[data-mt-fam-card="${id}"]`).click());
    for (const id of ['m1', 'x1']) await tick(id);
    await click('Check my family');
    expect(button('Show me the family')).toBeNull();
    await click('Check my family');
    expect(host.querySelector('[data-mt-family]').getAttribute('data-mt-family')).toBe('open');
    expect(host.querySelector('[data-mt-fam-feedback] [data-mt-hint-ladder="2"]')).toBeTruthy();
    await click('Show me the family');
    expect(host.querySelector('[data-mt-family]').getAttribute('data-mt-family')).toBe('done');
    expect(host.querySelector('[data-mt-family]').textContent).toContain('not a member');
    expect(awardsFor(view, 'fact family')).toHaveLength(0);
  });
});

describe('quest labels follow the current language', () => {
  it('reads the last render\'s translator', async () => {
    const tool = window.StemLab._registry.multtable;
    expect(tool.questHooks.map((q) => q.id)).toEqual(['answer_10', 'squares_5', 'speedrun_10']);
    expect(tool.questHooks[0].label).toBe('Answer 10 facts correctly');
    const es = { 'stem.multtable.quest_answer_10': 'Responde 10 datos', 'stem.multtable.quest_answer_10_progress': '{k}/10 correctas ($&)' };
    await mount({ ctx: { t: (k, fb) => es[k] || fb } });
    expect(tool.questHooks[0].label).toBe('Responde 10 datos');
    expect(tool.questHooks[0].progress({ totalCorrect: 4 })).toBe('4/10 correctas ($&)');
    expect(tool.questHooks[1].label).toBe('Answer 5 square facts (n × n)');
    expect(tool.questHooks[1].progress({ squaresAnswered: { 2: true, 3: true } })).toBe('2/5 squares');
    expect(tool.questHooks[2].check({ score: 10 })).toBe(true);
  });
});

describe('rhythm audio lifecycle', () => {
  function fakeAudio(log, initial) {
    return class FakeAudioContext {
      constructor() { this.state = initial || 'suspended'; this.currentTime = 0; this.destination = {}; log.contexts.push(this); }
      resume() { log.resumes++; this.state = 'running'; return Promise.resolve(); }
      suspend() { this.state = 'suspended'; return Promise.resolve(); }
      close() { log.closes++; this.state = 'closed'; return Promise.resolve(); }
      createOscillator() {
        const o = { frequency: {}, type: '', connected: false, stopped: false, connect() { o.connected = true; }, disconnect() { o.connected = false; }, start() {}, stop(t1) { if (t1 === undefined) o.stopped = true; } };
        log.oscillators.push(o); return o;
      }
      createGain() { const g = { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connected: false, connect() { g.connected = true; }, disconnect() { g.connected = false; } }; log.gains.push(g); return g; }
    };
  }
  const fluLab = { _multExt: { mtTab: 'fluency', flu: { round: [{ a: 3, b: 4, mode: 'mult' }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [] } } };

  it('resumes a suspended context on the click, and stops and closes its own context on unmount', async () => {
    const log = { contexts: [], oscillators: [], gains: [], resumes: 0, closes: 0 };
    window.AudioContext = fakeAudio(log, 'suspended');
    await mount({ lab: fluLab });
    await click('🥁 Hear the skip-count rhythm');
    expect(log.contexts).toHaveLength(1);
    expect(log.resumes).toBeGreaterThanOrEqual(1);
    expect(log.contexts[0].state).toBe('running');
    expect(log.oscillators.filter((o) => o.connected)).toHaveLength(3);
    await unmount();
    expect(log.closes).toBe(1);
    expect(log.contexts[0].state).toBe('closed');
    expect(log.oscillators.every((o) => o.stopped && !o.connected)).toBe(true);
    expect(log.gains.slice(-3).every((g) => !g.connected)).toBe(true);
  });

  it('a later visit makes a fresh context instead of reusing the closed one', async () => {
    const log = { contexts: [], oscillators: [], gains: [], resumes: 0, closes: 0 };
    window.AudioContext = fakeAudio(log, 'running');
    await mount({ lab: fluLab });
    await click('🥁 Hear the skip-count rhythm');
    await unmount();
    await mount({ lab: fluLab });
    await click('🥁 Hear the skip-count rhythm');
    expect(log.contexts).toHaveLength(2);
    expect(log.contexts[1].state).toBe('running');
  });

  it('the host\'s shared context is used, not closed, but our beats still stop on unmount', async () => {
    const log = { contexts: [], oscillators: [], gains: [], resumes: 0, closes: 0 };
    const Shared = fakeAudio(log, 'running');
    const shared = new Shared();
    window.StemLab.audioContext = () => shared;
    window.AudioContext = function () { throw new Error('the tool must not make its own context when the host shares one'); };
    await mount({ lab: fluLab });
    await click('🥁 Hear the skip-count rhythm');
    await unmount();
    expect(log.closes).toBe(0);
    expect(shared.state).toBe('running');
    expect(log.oscillators.length).toBe(3);
    expect(log.oscillators.every((o) => o.stopped && !o.connected)).toBe(true);
  });

  it('muting stops a rhythm that is playing', async () => {
    const log = { contexts: [], oscillators: [], gains: [], resumes: 0, closes: 0 };
    window.AudioContext = fakeAudio(log, 'running');
    await mount({ lab: fluLab });
    await click('🥁 Hear the skip-count rhythm');
    expect(log.oscillators.some((o) => o.stopped)).toBe(false);
    await click('Mute sound effects');
    expect(log.oscillators.every((o) => o.stopped)).toBe(true);
  });
});

describe('every tab, band and theme mounts cleanly', () => {
  it('logs no console errors or warnings', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warns = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const gradeLevel of ['1st Grade', '4th Grade', '7th Grade']) {
      for (const theme of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
        for (const tab of ['practice', 'visual', 'patterns', 'factors', 'words', 'fluency']) {
          await mount({ lab: { _multExt: { mtTab: tab } }, ctx: { gradeLevel, ...theme } });
          expect(host.querySelector('[data-multtable-root]'), tab).toBeTruthy();
          await unmount();
        }
      }
    }
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    expect(warns.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  }, 60000);
});

describe('the memoised 12 × 12 table stays current', () => {
  it('masks answers while a question is open and relabels on a language change', async () => {
    const view = await mount({ lab: { _multExt: { mtTab: 'practice' } } });
    const cell = (r, c) => host.querySelector(`[data-mt-grid="table"] [data-r="${r}"][data-c="${c}"]`);
    expect(cell(7, 8).textContent).toBe('56');
    await act(() => view.setChallenge({ a: 7, b: 8, mode: 'mult', source: 'tool', id: 'm1' }));
    expect(cell(7, 8).textContent).toBe('?');
    await typeInto('#multtable-input', 56); await click('Check');
    expect(cell(7, 8).textContent).toBe('56');
    await act(() => view.setCtxExtra({ t: (k, fb) => (k === 'stem.multtable.cell' ? '{r} por {c} es {p}.' : fb) }));
    expect(cell(3, 4).getAttribute('aria-label')).toBe('3 por 4 es 12.');
    await act(() => cell(3, 4).click());
    expect(host.querySelector('[data-mt-selected]').textContent).toContain('3 × 4 = 12');
    expect(cell(3, 4).getAttribute('aria-selected')).toBe('true');
  });
});
