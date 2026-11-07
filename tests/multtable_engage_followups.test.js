import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Follow-ups from the independent hunt (2026-11-05). Each failing block failed on the
// start copy (MULTTABLE_DEEP_SRC points this file at another copy).

const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, host = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); Element.prototype.scrollIntoView = function () {}; });
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
    const [answer, setAnswer] = React.useState(opts.answer || '');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(opts.feedback || null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    Object.assign(view, { lab, challenge, feedback, answer, score });
    return tool.render(makeCtx({
      gradeLevel: '4th Grade',
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
    }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const act = (fn) => React.act(async () => { await fn(); });
const button = (name) => [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name) || null;
const click = async (name) => { const b = button(name); expect(b, 'button ' + name).toBeTruthy(); await act(() => b.click()); };
const input = () => host.querySelector('#multtable-input');
const CH = () => ({ a: 7, b: 8, mode: 'mult', divisor: null, source: 'tool', id: 's1' });
const running = (paused) => ({ _multExt: { mtTab: 'practice', quizMode: 'mult' }, _multTimer: { active: true, paused, endTime: Date.now() + 90000, score: 3, total: 4, timeLeft: 90, streak: 0, missed: [], adaptiveHistory: [] } });
const enter = async () => { await act(() => { input().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); };

describe('a paused Speed Run takes no answers', () => {
  it('pausing locks the answer box and Check; Enter does nothing; score, total and XP stay put', async () => {
    const view = await mount({ lab: running(false), challenge: CH(), answer: '56' });
    expect(input().disabled, 'open before the pause').toBe(false);
    await click('Pause Speed Run');
    expect(view.lab._multTimer.paused).toBe(true);
    expect(input().disabled, 'answer box locked').toBe(true);
    expect(button('Check').disabled, 'Check locked').toBe(true);
    expect(input().value, 'what the student typed is kept').toBe('56');
    await enter();
    await act(() => button('Check').click());
    expect(view.lab._multTimer.score).toBe(3);
    expect(view.lab._multTimer.total).toBe(4);
    expect(view.awards).toEqual([]);
    expect(view.score.total).toBe(0);
    expect(view.feedback).toBe(null);
  });

  it('a wrong answer pressed while paused does not open the retry path either', async () => {
    const view = await mount({ lab: running(true), challenge: CH(), answer: '50' });
    await enter();
    expect(view.feedback).toBe(null);
    expect(view.lab._multTimer.total).toBe(4);
  });

  it('it says why, on screen and to a screen reader', async () => {
    const view = await mount({ lab: running(false), challenge: CH() });
    await click('Pause Speed Run');
    expect(host.querySelector('[data-mt-paused-note]').textContent).toBe('Speed Run is paused. Choose Resume to keep answering.');
    expect(view.ann[view.ann.length - 1]).toBe('Speed Run is paused. Choose Resume to keep answering.');
  });

  it('the clock does not move while paused, and resume picks up where it stopped', async () => {
    const view = await mount({ lab: running(false), challenge: CH() });
    await click('Pause Speed Run');
    const left = view.lab._multTimer.timeLeft;
    await act(() => new Promise((r) => setTimeout(r, 1300)));
    expect(view.lab._multTimer.timeLeft).toBe(left);
    await click('Resume Speed Run');
    expect(Math.round((view.lab._multTimer.endTime - Date.now()) / 1000)).toBe(left);
  });

  it('after resuming, the same answer is graded once and scores', async () => {
    const view = await mount({ lab: running(true), challenge: CH(), answer: '56' });
    await click('Resume Speed Run');
    expect(input().disabled).toBe(false);
    await enter();
    expect(view.lab._multTimer.score).toBe(4);
    expect(view.lab._multTimer.total).toBe(5);
  });

  it('paused on a finished question, Next does not bring up a new one', async () => {
    const view = await mount({ lab: Object.assign(running(true), { _multInputDisabled: true }), challenge: CH(), feedback: { correct: true, resolved: true, firstTry: true, forKey: 'x' } });
    const next = host.querySelector('[data-mt-next]');
    expect(next.disabled).toBe(true);
    await act(() => next.click());
    expect(view.challenge.id).toBe('s1');
    expect(host.querySelector('[data-mt-paused-note]')).toBeTruthy();
  });

  it('Stop still ends a paused run with the score it had', async () => {
    const view = await mount({ lab: running(true), challenge: CH(), answer: '56' });
    await click('Stop');
    expect(view.lab._multTimer.active).toBe(false);
    expect(view.lab._multTimer.score).toBe(3);
  });

  it('with no run at all, the box is open as before', async () => {
    await mount({ lab: { _multExt: { mtTab: 'practice', quizMode: 'mult' } }, challenge: CH() });
    expect(input().disabled).toBe(false);
    expect(host.querySelector('[data-mt-paused-note]')).toBe(null);
  });
});
