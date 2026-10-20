import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Lock after reveal (approved 2026-10-19). Once a checker has SHOWN the answer
// for an item, retyping it earns nothing: no XP, no quest, no "Solved". The
// input is disabled or read-only, the student sees "Answer shown. Try the next
// one.", and the lock is saved in tool state so a reload cannot undo it.
// Credit for an item solved before any reveal is unchanged.
//
// MR3_MONEY_SRC points the suite at another copy of the tool
// (mutation check: a copy without the lock must turn these red).

const FILE = process.env.MR3_MONEY_SRC || 'stem_lab/stem_tool_money.js';
const NOTICE = 'Answer shown. Try the next one.';

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(moneyState) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
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
// A save and reload: the state survives as JSON.
const reload = (view, patch) => mount(Object.assign(JSON.parse(JSON.stringify(view.state)), patch || {}));
const xp = (view) => view.awardXP.mock.calls.reduce((sum, call) => sum + call[1], 0);
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const setValue = async (el, value) => {
  expect(el, 'input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); });
};
const byLabel = (label) => document.querySelector('[aria-label="' + label + '"]');
const byText = (text, scope) => [...(scope || document).querySelectorAll('button')].find((b) => b.textContent.trim() === text || b.textContent.includes(text));
const notice = () => [...document.querySelectorAll('[data-money-answer-shown]')].map((el) => el.textContent);
const locked = (el) => !!(el && (el.disabled || el.readOnly));
// Credited means the checker said "correct". (A synthetic input event on a disabled
// field still reaches React and clears the old message; a student cannot do that.)
const solved = (fb) => !!(fb && fb.ok === true);

const quarter = { name: 'Quarter', value: 0.25, id: 'q1' };
const dime = { name: 'Dime', value: 0.1, id: 'd1' };
const shelf = (name, price, extra) => Object.assign({ name, price, qty: 1, pricePer: 'each' }, extra || {});
const cheese = [shelf('🍞 Bread', 2.99), shelf('🧀 Cheddar Cheese', 4.99), shelf('🧈 Butter', 3.99), shelf('🍅 Tomatoes', 1.79, { weight: 1, pricePer: 'lb' })];

describe('a wrong answer that prints the answer locks the item', () => {
  it('coin counting: the total is shown, retyping it pays nothing, and a reload keeps the lock', async () => {
    let view = await mount({ tab: 'coins', currency: 'USD', challengeMode: true, placed: [quarter, dime] });
    const guess = () => byLabel('Your guess of the total in USD');
    await setValue(guess(), '0.30');
    await click(byLabel('Check'));
    expect(view.state.coinGuessFb.msg).toContain('$0.35');
    expect(locked(guess())).toBe(true);
    expect(byLabel('Check').disabled).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await setValue(guess(), '0.35');
    await click(byLabel('Check'));
    expect(solved(view.state.coinGuessFb)).toBe(false);
    view = await reload(view, { coinGuessFb: null, coinGuess: 0.35 });
    expect(byLabel('Check').disabled).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await click(byLabel('Check'));
    expect(solved(view.state.coinGuessFb)).toBe(false);
    expect(xp(view)).toBe(0);
    // The next one: a different board is a new item.
    await click(byLabel('Add coin: Dime ($0.10)'));
    expect(notice()).toEqual([]);
    await setValue(guess(), '0.45');
    await click(byLabel('Check'));
    expect(view.state.coinGuessFb.ok).toBe(true);
    expect(xp(view)).toBe(10);
  });

  it('grocery mental math: the totals are shown, retyping them pays nothing', async () => {
    const view = await mount({ tab: 'store', grade: 'middle', currency: 'USD', challengeMode: true, storeDifficulty: 'standard', cart: [shelf('🍞 Bread', 2.99)] });
    await setValue(byLabel('Guess subtotal'), '3');
    await setValue(byLabel('Grand Total:'), '3');
    await click(byLabel('Check My Math'));
    expect(view.state.cartCheckoutFb.msg).toContain('$2.99');
    expect(locked(byLabel('Guess subtotal'))).toBe(true);
    expect(locked(byLabel('Grand Total:'))).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await setValue(byLabel('Guess subtotal'), '2.99');
    await setValue(byLabel('Grand Total:'), '2.99');
    await click(byLabel('Check My Math'));
    expect(solved(view.state.cartCheckoutFb)).toBe(false);
    expect(document.body.textContent).not.toContain('Continue to Payment');
    expect(xp(view)).toBe(0);
  });

  it('AI word problem: "The answer is" locks it', async () => {
    const view = await mount({ tab: 'word', grade: 'elementary', currency: 'USD', wpProblem: { problem: 'You have $5. You spend $2. How much is left?', answer: 3, hint: 'Subtract.', explanation: '5 - 2 = 3', category: 'change' } });
    await setValue(byLabel('Word problem answer'), '4');
    await click(byLabel('Check'));
    expect(view.state.wpFeedback.msg).toContain('$3.00');
    expect(locked(byLabel('Word problem answer'))).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await setValue(byLabel('Word problem answer'), '3');
    await click(byLabel('Check'));
    expect(solved(view.state.wpFeedback)).toBe(false);
    expect(xp(view)).toBe(0);
  });

  const centsCases = [
    { name: 'unit pricing', state: { upItem: { name: '🍎 Apples', unit: 'lb' }, upA: { qty: 2, price: 4 }, upB: { qty: 4, price: 6 } }, fb: 'upFeedback', shows: '$1.50',
      wrong: async () => { await click(byLabel('Option A')); await click(byLabel('Check My Answer')); },
      retry: async () => { await click(byLabel('Option B')); await click(byLabel('Check My Answer')); },
      input: () => byLabel('Option B') },
    { name: 'estimate the total', state: { estItems: [{ name: '🍎 Apple', price: 1.5, qty: 2 }], estTotal: 3 }, fb: 'estFb', shows: '$3.00',
      wrong: async () => { await setValue(byLabel('Your estimate'), '2'); await click(byLabel('Check estimated total')); },
      retry: async () => { await setValue(byLabel('Your estimate'), '3'); await click(byLabel('Check estimated total')); },
      input: () => byLabel('Your estimate') },
    { name: 'check the change', state: { ccPrice: 3.65, ccPaid: 5, ccProposed: 1.35, ccCorrectAmt: 1.35, ccIsWrong: false }, fb: 'ccFb', shows: '$1.35',
      wrong: async () => { await click(byText('Wrong!')); await click(byLabel('Submit')); },
      retry: async () => { await click(byText('Correct!')); await click(byLabel('Submit')); },
      input: () => byText('Correct!') },
    { name: 'coupon stack', state: { csOriginal: 20, csDiscounts: [{ type: 'pct', val: 10 }], csFinal: 18 }, fb: 'csFb', shows: '$18.00',
      wrong: async () => { await setValue(byLabel('Final price:'), '17'); await click(byLabel('Final price:').parentElement.querySelector('button')); },
      retry: async () => { await setValue(byLabel('Final price:'), '18'); await click(byLabel('Final price:').parentElement.querySelector('button')); },
      input: () => byLabel('Final price:') },
    { name: 'structured word problem', state: { spText: 'You have $2.00. You want to buy something that costs $5.00. How much more do you need?', spAnswers: [{ val: 3, label: 'Amount Needed' }], spUserAnswers: [null] }, fb: 'spFb', shows: '$3.00',
      wrong: async () => { await setValue(byLabel('Amount Needed'), '2'); await click(byLabel('Check My Answers')); },
      retry: async () => { await setValue(byLabel('Amount Needed'), '3'); await click(byLabel('Check My Answers')); },
      input: () => byLabel('Amount Needed') }
  ];
  it.each(centsCases)('Common Cents $name: the shown answer earns nothing on retry', async (c) => {
    const view = await mount(Object.assign({ tab: 'cents', grade: 'middle', currency: 'USD' }, c.state));
    await c.wrong();
    expect(view.state[c.fb].ok).toBe(false);
    expect(view.state[c.fb].msg).toContain(c.shows);
    expect(locked(c.input()), 'input locked').toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await c.retry();
    expect(solved(view.state[c.fb])).toBe(false);
    expect(xp(view)).toBe(0);
  });

  it('finance quiz: a shown answer stays shown when the same question comes back', async () => {
    const view = await mount({ tab: 'finance', finSub: 'quiz', currency: 'USD', fqIdx: 4, fqAnswer: 0 });
    await click(byLabel('Submit Answer'));
    expect(view.state.fqFb.ok).toBe(false);
    expect(notice()).toEqual([NOTICE]);
    vi.spyOn(Math, 'random').mockReturnValue(0.7); // index 4 again, in a new round
    await click(byLabel('Gen Fin Quiz'));
    expect(view.state.fqIdx).toBe(4);
    expect(view.state.fqFb).toBeNull();
    const answerD = byText('D. 12 years');
    expect(answerD.disabled).toBe(true);
    await click(answerD);
    expect(byLabel('Submit Answer')).toBeNull();
    expect(notice()).toEqual([NOTICE]);
    expect(xp(view)).toBe(0);
  });
});

describe('a "show the answer" control locks the item', () => {
  it('making change: Show worked solution; the quest stays open; a reload keeps the lock', async () => {
    let view = await mount({ tab: 'change', currency: 'USD', changePrice: 3.65, changePaid: 10 });
    await click(byText('Show worked solution'));
    const input = () => byLabel('Enter the amount of change due');
    expect(locked(input())).toBe(true);
    expect(byLabel('Check').disabled).toBe(true);
    expect(byText('Check tray').disabled).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await setValue(input(), '6.35');
    await React.act(async () => { input().form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(solved(view.state.changeFeedback)).toBe(false);
    const quest = window.StemLab._registry.moneyMath.questHooks.find((q) => q.id === 'make_change');
    expect(quest.check(view.state)).toBe(false);
    // Reload with the guide state gone: the saved lock still holds.
    view = await reload(view, { changeLearning: null, changeAnswer: '6.35' });
    expect(locked(input())).toBe(true);
    await React.act(async () => { input().form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(solved(view.state.changeFeedback)).toBe(false);
    expect(quest.check(view.state)).toBe(false);
    expect(xp(view)).toBe(0);
    await click(byLabel('Next Problem'));
    expect(locked(input())).toBe(false);
  });

  it('making change: the count-up guide\'s last jump states the change, and stepping back does not unlock', async () => {
    const view = await mount({ tab: 'change', currency: 'USD', changePrice: 3.65, changePaid: 10 });
    await click(byText('Start count-up guide'));
    await click(byText('Next jump'));
    await click(byText('Next jump'));
    expect(notice()).toEqual([]);
    await click(byText('Next jump'));
    expect(document.querySelector('[data-money-count-guide]').textContent).toContain('$6.35');
    expect(notice()).toEqual([NOTICE]);
    await click(byText('Previous jump'));
    expect(locked(byLabel('Enter the amount of change due'))).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    expect(solved(view.state.changeFeedback)).toBe(false);
  });

  it('tips: the percentage model shows the share; a reload without the model key stays locked', async () => {
    let view = await mount({ tab: 'tips', currency: 'USD', tipMode: 'tip', tipBill: 20, tipPct: 15, tipDiners: 2 });
    await click(byText('Show percentage model (supported practice)'));
    expect(locked(byLabel('Tip per person answer'))).toBe(true);
    expect(byLabel('Check').disabled).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    view = await reload(view, { percentLearningKey: null, tipAnswer: 11.5 });
    expect(byLabel('Check').disabled).toBe(true);
    await click(byLabel('Check'));
    expect(solved(view.state.tipFeedback)).toBe(false);
    expect(xp(view)).toBe(0);
    await click(byLabel('Next Problem'));
    expect(locked(byLabel('Tip per person answer'))).toBe(false);
  });

  it('discounts: the percentage model shows the final price', async () => {
    const view = await mount({ tab: 'tips', currency: 'USD', tipMode: 'discount', discOriginal: 20, discPercent: 25, discCoupon: 2 });
    await click(byText('Show percentage model (supported practice)'));
    expect(locked(byLabel('Sale price answer'))).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await setValue(byLabel('Sale price answer'), '13');
    await click(byLabel('Check'));
    expect(solved(view.state.discFeedback)).toBe(false);
  });

  it('currency exchange: Show complete conversion, then choosing the same conversion again stays locked', async () => {
    const view = await mount({ tab: 'exchange', currency: 'USD', grade: 'elementary', exchFrom: 'EUR', exchTo: 'GBP', exchAmount: 92 });
    await click(byText('Show complete conversion'));
    expect(locked(byLabel('Currency exchange answer'))).toBe(true);
    expect(byLabel('Check').disabled).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await click(byText('Use this conversion')); // the setup defaults to the current conversion
    expect(view.state.exchangeLearning).toBeNull();
    expect(locked(byLabel('Currency exchange answer'))).toBe(true);
    await setValue(byLabel('Currency exchange answer'), '79');
    await click(byLabel('Check'));
    expect(solved(view.state.exchFeedback)).toBe(false);
    expect(xp(view)).toBe(0);
    // A different conversion is a new item.
    await setValue(byLabel('Starting amount'), '46');
    await click(byText('Use this conversion'));
    expect(notice()).toEqual([]);
    await setValue(byLabel('Currency exchange answer'), '39.5');
    await click(byLabel('Check'));
    expect(view.state.exchFeedback.ok).toBe(true);
    expect(xp(view)).toBe(5);
  });

  it('currency exchange: working saved at its last step (before the lock existed) stays locked after stepping back', async () => {
    const key = JSON.stringify(['USD', 'elementary', 0, 'EUR', 'GBP', 92]);
    const view = await mount({ tab: 'exchange', currency: 'USD', grade: 'elementary', exchFrom: 'EUR', exchTo: 'GBP', exchAmount: 92, exchangeLearning: { key, step: 3, assisted: true } });
    expect(notice()).toEqual([NOTICE]);
    await click(byText('Previous conversion step'));
    expect(view.state.exchangeLearning.step).toBe(2);
    expect(locked(byLabel('Currency exchange answer'))).toBe(true);
    expect(notice()).toEqual([NOTICE]);
  });

  it('cashier practice: Show complete working prints the total', async () => {
    const receipt = { name: 'Customer', currencyCode: 'USD', items: [{ name: 'Oats', price: 2.4, qty: 2, pricePer: 'each' }, { name: 'Apples', price: 1.99, weight: 0.75, pricePer: 'lb' }], coupon: { type: 'pct', val: 10 }, taxPercent: 8 };
    const view = await mount({ tab: 'store', currency: 'USD', grade: 'elementary', crActive: true, crMode: 'practice', crIntro: false, crCustomer: receipt, crCanvasOn: false, crBotCoachOn: false });
    await click(byText('Show complete working'));
    const input = document.getElementById('cashier-practice-answer');
    expect(locked(input)).toBe(true);
    expect(byText('Check receipt total').disabled).toBe(true);
    expect(notice()).toEqual([NOTICE]);
    await setValue(input, '6.11');
    await React.act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(view.state.crPractice.completed).not.toBe(true);
    expect(xp(view)).toBe(0);
  });
});

describe('answers shown outside the checker', () => {
  it('switching Challenge Mode on after practice mode printed the board total locks that board', async () => {
    const view = await mount({ tab: 'coins', currency: 'USD', challengeMode: false, placed: [quarter] });
    await click(byText('Challenge Mode'));
    expect(view.state.challengeMode).toBe(true);
    await setValue(byLabel('Your guess of the total in USD'), '0.25');
    expect(byLabel('Check').disabled).toBe(true);
    await click(byLabel('Check'));
    expect(notice()).toEqual([NOTICE]);
    expect(xp(view)).toBe(0);
  });

  it('the studio overview does not print the board or cart total in Challenge Mode', async () => {
    await mount({ tab: 'coins', currency: 'USD', challengeMode: true, placed: [quarter], cart: [shelf('🍞 Bread', 2.99)] });
    const overview = document.querySelector('[data-moneymath-focus]').textContent;
    expect(overview).not.toContain('$0.25');
    expect(overview).not.toContain('$2.99');
  });

  it('the recipe success message prints the cart total, so mental math on that cart is locked', async () => {
    const view = await mount({ tab: 'store', grade: 'middle', currency: 'USD', challengeMode: true, storeDifficulty: 'standard', recipeMode: true, activeRecipe: 5, recipeServings: 4, cart: cheese });
    await click(byLabel('Check Recipe Cart'));
    expect(view.state.recipeFb.ok).toBe(true);
    expect(view.state.recipeFb.msg).toContain('$13.76');
    await setValue(byLabel('Guess subtotal'), '13.76');
    await setValue(byLabel('Grand Total:'), '13.76');
    expect(byLabel('Check My Math').disabled).toBe(true);
    await click(byLabel('Check My Math'));
    expect(solved(view.state.cartCheckoutFb)).toBe(false);
    expect(view.awardXP.mock.calls.filter((c) => c[2] === 'grocery mental math')).toEqual([]);
  });
});

describe('credit earned before any reveal is unchanged', () => {
  it('coin counting: a right first guess pays, and nothing locks', async () => {
    const view = await mount({ tab: 'coins', currency: 'USD', challengeMode: true, placed: [quarter, dime] });
    await setValue(byLabel('Your guess of the total in USD'), '0.35');
    await click(byLabel('Check'));
    expect(view.state.coinGuessFb.ok).toBe(true);
    expect(xp(view)).toBe(10);
    expect(notice()).toEqual([]);
  });

  it('making change: solved, then the worked solution opened, stays solved and keeps the quest', async () => {
    const view = await mount({ tab: 'change', currency: 'USD', changePrice: 3.65, changePaid: 10 });
    await setValue(byLabel('Enter the amount of change due'), '6.35');
    await click(byLabel('Check'));
    expect(view.state.changeFeedback.ok).toBe(true);
    expect(xp(view)).toBe(15);
    await click(byText('Show worked solution'));
    expect(view.state.changeFeedback.ok).toBe(true);
    expect(notice()).toEqual([]);
    expect(window.StemLab._registry.moneyMath.questHooks.find((q) => q.id === 'make_change').check(view.state)).toBe(true);
  });
});
