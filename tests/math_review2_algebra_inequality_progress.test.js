// Math review 2 (algebra lane): Inequality Grapher progress counters. The All Levels
// badge ("Solve quizzes in Easy, Medium & Hard") was earned by clicking the three tier
// buttons, and the Tests counter (Test Master: "Test 10 different values") went up on
// every keystroke in the test box. MATH_REVIEW2_INEQUALITY points the suite at another
// copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW2_INEQUALITY || 'stem_lab/stem_tool_inequality.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'inequality'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { vi.restoreAllMocks(); if (root) await React.act(() => root.unmount()); root = null; });

async function mount(inequality) {
  const view = { state: null, toasts: [] };
  function App() {
    const [state, setState] = React.useState({ inequality });
    view.state = state;
    return window.StemLab._registry.inequality.render(makeCtx({ toolData: state, setToolData: setState, addToast: (m) => view.toasts.push(m), awardXP: vi.fn(), announceToSR: vi.fn() }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return view;
}
const buttons = () => [...document.querySelectorAll('button')];
async function clickText(re) {
  const b = buttons().find((x) => re.test(x.textContent));
  expect(b, String(re)).toBeTruthy();
  await React.act(() => b.click());
}
const pretty = (s) => s.replace(/>=/g, '≥').replace(/<=/g, '≤');
async function answerQuiz(view, correct) {
  const q = view.state.inequality.quiz;
  expect(q && !q.answered).toBe(true);
  const pick = correct ? q.a : q.opts.find((o) => o !== q.a);
  // Presets share labels such as "x ≤ 5", so look inside the quiz card only.
  const card = [...document.querySelectorAll('p')].find((p) => p.textContent === q.q).parentElement;
  const b = [...card.querySelectorAll('button')].find((x) => x.textContent === pretty(pick));
  expect(b, pick).toBeTruthy();
  await React.act(() => b.click());
}
async function startTierQuiz(tier) {
  await clickText(new RegExp(tier + '$'));
  await clickText(/Challenge Mode|Next Challenge/);
}

describe('All Levels badge', () => {
  // A correct answer queues the next question after 1.5 s; hold it so a late timer
  // cannot swap in a question from the previous level mid-test.
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
  afterEach(() => { vi.useRealTimers(); });

  it('is not earned by clicking the Easy, Medium and Hard buttons', async () => {
    const view = await mount({});
    for (const tier of ['Easy', 'Medium', 'Hard']) await clickText(new RegExp(tier + '$'));
    expect(!!(view.state.inequality.badges || {}).allTiers).toBe(false);
    expect(view.toasts.some((m) => /All Levels/.test(m))).toBe(false);
  });

  it('is earned by solving a quiz in each of the three levels', async () => {
    const view = await mount({});
    await startTierQuiz('Easy');
    await answerQuiz(view, true);
    await startTierQuiz('Medium');
    await answerQuiz(view, true);
    await startTierQuiz('Hard');
    await answerQuiz(view, false); // a wrong Hard answer does not count
    expect(!!(view.state.inequality.badges || {}).allTiers).toBe(false);
    await startTierQuiz('Hard');
    await answerQuiz(view, true);
    expect(!!view.state.inequality.badges.allTiers).toBe(true);
  });
});

describe('Tests counter', () => {
  const box = () => document.querySelector('input[aria-label="Test a value against the inequality"]');
  async function type(text) {
    const el = box();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    for (let i = 1; i <= text.length; i++) {
      await React.act(() => { setter.call(el, text.slice(0, i)); el.dispatchEvent(new Event('input', { bubbles: true })); });
    }
  }
  const enter = () => React.act(() => box().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  const blur = () => React.act(() => box().dispatchEvent(new FocusEvent('focusout', { bubbles: true })));

  it('counts a value once it is tested, not each keystroke', async () => {
    const view = await mount({ expr: 'x > 3' });
    await type('-2.5');
    expect(view.state.inequality.testCount || 0).toBe(0);
    await enter();
    expect(view.state.inequality.testCount).toBe(1);
    await enter();
    await blur();
    expect(view.state.inequality.testCount).toBe(1);
    await type('10');
    await blur();
    expect(view.state.inequality.testCount).toBe(2);
  });

  it('Test Master needs ten different tests, not ten keystrokes', async () => {
    const view = await mount({ expr: 'x > 3' });
    await type('1234567890');
    await enter();
    expect(!!(view.state.inequality.badges || {}).testMaster).toBe(false);
    for (let v = 0; v < 9; v++) { await type(String(v)); await enter(); }
    expect(view.state.inequality.testCount).toBe(10);
    expect(!!view.state.inequality.badges.testMaster).toBe(true);
  });
});
