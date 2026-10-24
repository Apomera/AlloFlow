import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Money Math pays each solved item once. awardMoneyXPOnce remembered only the
// LAST key per activity, so alternating two answers paid on every click:
// recipe at 4 servings, 5, 4, 5 ... = 25 XP x 10 clicks = 250 XP.
//
// MR2_NUMBERSENSE_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MONEY_SRC || 'stem_lab/stem_tool_money.js';

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(moneyState) {
  const tool = window.StemLab._registry.moneyMath;
  const awardXP = vi.fn();
  const view = { state: null, awardXP };
  function App() {
    const [state, setState] = React.useState({ _moneyMath: moneyState });
    view.state = state._moneyMath;
    return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
  }
  document.body.innerHTML = '<div id="money-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('money-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const setValue = async (el, value) => {
  expect(el, 'input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); });
};
const paid = (view, reason) => view.awardXP.mock.calls.filter((c) => c[2] === reason).reduce((s, c) => s + c[1], 0);

describe('alternating answers cannot re-earn XP', () => {
  it('recipe shopping: 10 checks alternating 4 and 5 servings pay twice, not ten times', async () => {
    // Grilled Cheese: Bread, Cheddar Cheese, Butter, Tomatoes.
    const view = await mount({
      tab: 'store', grade: 'middle', currency: 'USD', recipeMode: true, activeRecipe: 5, recipeServings: 4,
      cart: [
        { name: '🍞 Bread', price: 2.99, qty: 1, pricePer: 'each' },
        { name: '🧀 Cheddar Cheese', price: 4.99, qty: 1, pricePer: 'each' },
        { name: '🧈 Butter', price: 3.99, qty: 1, pricePer: 'each' },
        { name: '🍅 Tomatoes', price: 1.79, qty: 1, weight: 1, pricePer: 'lb' }
      ]
    });
    for (let i = 0; i < 10; i++) {
      await setValue(document.querySelector('input[aria-label="Number of servings"]'), i % 2 ? 5 : 4);
      expect(view.state.recipeServings).toBe(i % 2 ? 5 : 4);
      await click(document.querySelector('button[aria-label="Check Recipe Cart"]'));
      expect(view.state.recipeFb && view.state.recipeFb.ok, 'check ' + i).toBe(true);
    }
    expect(paid(view, 'recipe shopping')).toBe(50);
  });

  it('coin counting: the set A, then B, then A again pays for A once', async () => {
    const view = await mount({ tab: 'coins', currency: 'USD', challengeMode: true, placed: [] });
    const addQuarter = () => document.querySelector('button[aria-label="Add coin: Quarter ($0.25)"]');
    const addDime = () => document.querySelector('button[aria-label="Add coin: Dime ($0.10)"]');
    const guess = async (value) => {
      await setValue(document.querySelector('input[aria-label="Your guess of the total in USD"]'), value);
      await click(document.querySelector('button[aria-label="Check"]'));
      expect(view.state.coinGuessFb && view.state.coinGuessFb.ok, 'guess ' + value).toBe(true);
    };
    await click(addQuarter());
    await guess('0.25');                                       // A = [quarter]
    await click(addDime());
    await guess('0.35');                                       // B = [quarter, dime]
    await click(document.querySelector('button[aria-label="Remove Dime"]'));
    await guess('0.25');                                       // A again
    await click(addDime());
    await guess('0.35');                                       // B again
    expect(paid(view, 'coin counting challenge')).toBe(20);
  });

  it('the credited items survive a save and reload', async () => {
    const base = { tab: 'tips', currency: 'USD', tipMode: 'tip', tipBill: 20, tipPct: 15, tipDiners: 2, tipAnswer: 11.5 };
    let view = await mount(base);
    await click(document.querySelector('button[aria-label="Check"]'));
    expect(view.state.tipFeedback.ok).toBe(true);
    expect(paid(view, 'tip calculation')).toBe(15);
    const saved = JSON.parse(JSON.stringify(view.state));
    await React.act(async () => { root.unmount(); }); root = null;
    // Another tip item was solved after this one, so "last key" no longer guards it.
    saved.moneyAwardKeys = Object.assign({}, saved.moneyAwardKeys, { 'tip-calculation': JSON.stringify([0, JSON.stringify(['USD', 30, 20, 3])]) });
    saved.tipFeedback = null; saved.percentLearningKey = null;
    view = await mount(saved);
    await click(document.querySelector('button[aria-label="Check"]'));
    expect(view.state.tipFeedback.ok).toBe(true);
    expect(paid(view, 'tip calculation')).toBe(0);
  });
});
