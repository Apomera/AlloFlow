import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// "Solved" belongs to the item that was solved. Removing a coin or a cart item
// already cleared the feedback; ADDING one did not, so the next total showed the
// old "Correct!" message with Check locked as "Solved".
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
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _moneyMath: moneyState });
    view.state = state._moneyMath;
    return tool.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  document.body.innerHTML = '<div id="money-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('money-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const solvedButtons = () => [...document.querySelectorAll('button')].filter((b) => /Solved/.test(b.textContent));

describe('adding to a solved board starts a new item', () => {
  it('coin counting: adding a coin clears "Correct! Total is $0.25"', async () => {
    const view = await mount({ tab: 'coins', currency: 'USD', challengeMode: true,
      placed: [{ name: 'Quarter', value: 0.25, id: 'q1' }], coinGuess: 0.25, coinGuessFb: { ok: true, msg: '✅ Correct! Total is $0.25!' } });
    expect(solvedButtons().length).toBe(1);
    await click(document.querySelector('button[aria-label="Add coin: Dime ($0.10)"]'));
    expect(view.state.placed.length).toBe(2);
    expect(view.state.coinGuessFb).toBeNull();
    expect(solvedButtons().length).toBe(0);
    expect(document.body.textContent).not.toContain('Total is $0.25');
  });

  it('coin counting: adding a bill clears it too', async () => {
    const view = await mount({ tab: 'coins', currency: 'USD', challengeMode: true,
      placed: [{ name: 'Quarter', value: 0.25, id: 'q1' }], coinGuess: 0.25, coinGuessFb: { ok: true, msg: '✅ Correct! Total is $0.25!' } });
    await click(document.querySelector('button[aria-label="Add bill: $1 Bill ($1.00)"]'));
    expect(view.state.coinGuessFb).toBeNull();
  });

  it('grocery mental math: adding an item clears the solved checkout', async () => {
    const view = await mount({ tab: 'store', grade: 'middle', currency: 'USD', challengeMode: true, storeDifficulty: 'standard',
      cart: [{ name: '🍞 Bread', price: 2.99, qty: 1, pricePer: 'each' }],
      cartGuessSubtotal: 2.99, cartGuessTotal: 2.99, cartCheckoutFb: { ok: true, msg: '✅ Perfect! Subtotal: $2.99, Total: $2.99 — +15 XP!' } });
    expect(solvedButtons().length).toBe(1);
    const addBagels = [...document.querySelectorAll('button')].find((b) => /Bagels/.test(b.textContent) && /Add to cart/.test(b.textContent));
    await click(addBagels);
    expect(view.state.cart.length).toBe(2);
    expect(view.state.cartCheckoutFb).toBeNull();
    expect(solvedButtons().length).toBe(0);
    expect(document.body.textContent).not.toContain('Continue to Payment');
  });

  it('grocery: adding a weighed item clears the solved checkout and the solved recipe', async () => {
    const view = await mount({ tab: 'store', grade: 'middle', currency: 'USD', challengeMode: true, storeDifficulty: 'standard',
      cart: [{ name: '🍞 Bread', price: 2.99, qty: 1, pricePer: 'each' }], weightInput: 1,
      cartGuessTotal: 2.99, cartCheckoutFb: { ok: true, msg: 'solved' }, recipeFb: { ok: true, msg: 'All ingredients found' } });
    const weighApples = [...document.querySelectorAll('button')].find((b) => /Apples/.test(b.textContent) && /Enter weight/.test(b.textContent));
    await click(weighApples);
    await click(document.querySelector('button[aria-label="Add to Cart"][class*="w-full"]'));
    expect(view.state.cart.length).toBe(2);
    expect(view.state.cartCheckoutFb).toBeNull();
    expect(view.state.recipeFb).toBeNull();
  });
});
