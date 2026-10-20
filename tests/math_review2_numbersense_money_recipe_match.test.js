import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Recipe shopping matches WHOLE items. The old substring test counted
// "Peanut Butter" as the recipe's "Butter", so a cart without butter passed.
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
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
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
async function checkRecipe(moneyState) {
  const view = await mount(moneyState);
  await React.act(async () => { document.querySelector('button[aria-label="Check Recipe Cart"]').click(); });
  return view.state.recipeFb;
}
const item = (name, price) => ({ name, price, qty: 1, pricePer: 'each' });
const recipeState = (r, cart) => ({ tab: 'store', grade: 'college', currency: 'USD', storeDifficulty: 'standard', recipeMode: true, activeRecipe: r, recipeServings: 4, cart });
// Shopping-list rows as the tool renders them: [ticked, "qty unit item"].
const shoppingList = (html) => [...html.matchAll(/<span class="text-base">(⬜|✅)<\/span><span class="[^"]*">([^<]+)<\/span>/g)].map((m) => [m[1] === '✅', m[2]]);
const GRILLED_CHEESE = 5; // Bread, Cheddar Cheese, Butter, Tomatoes

describe('recipe ingredients match whole store items', () => {
  it('Peanut Butter is not Butter', async () => {
    const fb = await checkRecipe(Object.assign(recipeState(GRILLED_CHEESE,
      [item('🍞 Bread', 2.99), item('🧀 Cheddar Cheese', 4.99), item('🥜 Peanut Butter', 3.75), item('🍅 Tomatoes', 1.79)]), { grade: 'middle' }));
    expect(fb.ok).toBe(false);
    expect(fb.msg).toContain('Butter');
  });

  it('the shopping list does not tick Butter for Peanut Butter', () => {
    const rows = shoppingList(renderTool('moneyMath', { _moneyMath: recipeState(GRILLED_CHEESE, [item('🥜 Peanut Butter', 3.75)]) }));
    expect(rows).toContainEqual([false, '1 stick Butter']);
  });

  it('every recipe passes with its own ingredients, and no other store item stands in for a missing one', async () => {
    const store = (await mount({ tab: 'store', grade: 'college', currency: 'USD', storeDifficulty: 'standard' })).state.storeItems;
    expect(store.length).toBeGreaterThan(40);
    const plain = (n) => n.replace(/^\S+\s/, '');
    const recipes = [];
    for (let r = 0; r < 100; r++) {
      const rows = shoppingList(renderTool('moneyMath', { _moneyMath: recipeState(r, []) }));
      if (!rows.length) break;
      recipes.push(rows.map(([, text]) => text.replace(/^[\d.]+ \S+ /, '')));
    }
    expect(recipes.length).toBeGreaterThan(20);
    const wrong = [];
    const tested = new Set();
    for (let r = 0; r < recipes.length; r++) {
      const own = store.filter((s) => recipes[r].includes(plain(s.name)));
      expect(own.length, 'recipe ' + r + ' ingredients on the shelf: ' + recipes[r].join(', ')).toBe(recipes[r].length);
      if (!(await checkRecipe(recipeState(r, own.map((s) => item(s.name, s.price))))).ok) wrong.push('recipe ' + r + ' rejected its own ingredients');
      for (const missing of own) {
        if (tested.has(missing.name)) continue;
        tested.add(missing.name);
        // Everything on the shelf except the missing ingredient.
        const cart = store.filter((s) => s !== missing).map((s) => item(s.name, s.price));
        if ((await checkRecipe(recipeState(r, cart))).ok) wrong.push('recipe ' + r + ' passed without ' + plain(missing.name));
      }
    }
    expect(tested.size).toBeGreaterThan(25);
    expect(wrong).toEqual([]);
  });
});
