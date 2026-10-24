import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table "Mathlete: 50 correct in one session". sessionCorrect
// lived in saved state and was never reset, so it was an all-time count: a
// learner coming back with 49 earned "50 in one session" on the first answer.
// A session is now one visit: from opening the tool until it closes.
//
// MR2_NUMBERSENSE_MULTTABLE_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MULTTABLE_SRC || 'stem_lab/stem_tool_multtable.js';

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(labToolData) {
  const tool = window.StemLab._registry.multtable;
  const view = { lab: null };
  function App() {
    const [lab, setLab] = React.useState(labToolData);
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(null);
    const [feedback, setFeedback] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    view.lab = lab; view.challenge = challenge;
    return tool.render(makeCtx({
      labToolData: lab, setLabToolData: setLab,
      multTableAnswer: answer, setMultTableAnswer: setAnswer,
      multTableChallenge: challenge, setMultTableChallenge: setChallenge,
      multTableFeedback: feedback, setMultTableFeedback: setFeedback,
      setMultTableHidden: () => {}, setMultTableHover: () => {}, setMultTableRevealed: () => {},
      exploreScore: score, setExploreScore: setScore, exploreDifficulty: 'easy'
    }));
  }
  document.body.innerHTML = '<div id="mt-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('mt-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const setValue = async (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); });
};
async function answerCorrectly(view) {
  await click(document.querySelector('button[aria-label="Quick Quiz"]'));
  const c = view.challenge;
  const right = c.mode === 'div' ? (c.divisor === c.a ? c.b : c.a) : c.a * c.b;
  await setValue(document.getElementById('multtable-input'), right);
  await click(document.querySelector('button[aria-label="Check"]'));
}

describe('"50 correct in one session" counts this visit only', () => {
  it('49 correct saved from an earlier visit do not count toward this one', async () => {
    const view = await mount({ _multExt: { totalCorrect: 49, sessionCorrect: 49, badges: { firstCorrect: true } } });
    await answerCorrectly(view);
    expect(view.lab._multExt.totalCorrect).toBe(50);
    expect(view.lab._multExt.badges.mathlete).toBeFalsy();
  });

  it('50 correct in one visit earns it', async () => {
    const view = await mount({ _multExt: { totalCorrect: 200, sessionCorrect: 120, badges: { firstCorrect: true, centurion: true } } });
    for (let i = 0; i < 49; i++) await answerCorrectly(view);
    expect(view.lab._multExt.badges.mathlete, 'after 49').toBeFalsy();
    await answerCorrectly(view);
    expect(view.lab._multExt.totalCorrect).toBe(250);
    expect(view.lab._multExt.badges.mathlete, 'after 50').toBeTruthy();
  });

  it('closing and reopening the tool starts a new session', async () => {
    let view = await mount({ _multExt: { badges: { firstCorrect: true } } });
    for (let i = 0; i < 30; i++) await answerCorrectly(view);
    const saved = JSON.parse(JSON.stringify(view.lab));
    await React.act(async () => { root.unmount(); }); root = null;
    view = await mount(saved);
    for (let i = 0; i < 25; i++) await answerCorrectly(view);
    expect(view.lab._multExt.totalCorrect).toBe(55);
    expect(view.lab._multExt.badges.mathlete).toBeFalsy();
  });
});
