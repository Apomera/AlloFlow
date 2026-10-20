import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Recipes in translated languages. Shelf names are translated, but recipe
// ingredients were English strings matched against the cart's NAMES, so a
// translated pack could never complete a recipe. Every store item now has a
// stable id; the cart carries it and recipes match by id. Carts saved before
// ids existed are mapped once on load, by the English (or current) name.
// Recipe quantities are not checked (an open decision), so these tests do not
// test them either.
//
// MR3_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR3_MONEY_SRC || 'stem_lab/stem_tool_money.js';

// A stand-in Spanish pack for the Grilled Cheese shelf items and their neighbours.
const SPANISH = {
  'stem.money.bread': '🍞 Pan',
  'stem.money.cheddar_cheese': '🧀 Queso cheddar',
  'stem.money.butter': '🧈 Mantequilla',
  'stem.money.peanut_butter': '🥜 Mantequilla de maní',
  'stem.money.tomatoes': '🍅 Tomates',
  'stem.money.apples': '🍎 Manzanas'
};
const spanish = (key, fallback) => SPANISH[key] || fallback;
const GRILLED_CHEESE = 5; // Bread, Cheddar Cheese, Butter, Tomatoes

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(moneyState, t) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  const tool = window.StemLab._registry.moneyMath;
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _moneyMath: moneyState });
    view.state = state._moneyMath;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, t ? { t } : {})));
  }
  document.body.innerHTML = '<div id="money-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('money-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const shelfButton = (name) => [...document.querySelectorAll('[aria-label="Grocery products"] button')].find((b) => b.textContent.includes(name) && !b.textContent.includes(name + ' de'));
const checkRecipe = async (view) => { await click(document.querySelector('button[aria-label="Check Recipe Cart"]')); return view.state.recipeFb; };
// Shopping-list rows as the tool renders them: a tick span, then "qty unit Name".
const shoppingList = () => [...document.querySelectorAll('span[class="text-base"]')].map((s) => s.nextElementSibling && s.nextElementSibling.textContent).filter(Boolean);
const recipeState = (cart, extra) => Object.assign({ tab: 'store', grade: 'middle', currency: 'USD', storeDifficulty: 'standard', recipeMode: true, activeRecipe: GRILLED_CHEESE, recipeServings: 4, cart: cart || [] }, extra || {});
const line = (name, price, extra) => Object.assign({ name, price, qty: 1, pricePer: 'each' }, extra || {});

describe('recipes in a translated pack', () => {
  it('shopping from translated shelves completes the recipe', async () => {
    const view = await mount(recipeState([]), spanish);
    await click(shelfButton('Pan'));
    await click(shelfButton('Queso cheddar'));
    await click(shelfButton('Mantequilla'));
    await click(shelfButton('Tomates')); // sold by weight: opens the weight popup
    await click(document.querySelector('button[aria-label="Add to Cart"][class*="w-full"]'));
    expect(view.state.cart.map((c) => c.id)).toEqual(['bread', 'cheddar_cheese', 'butter', 'tomatoes']);
    expect(view.state.cart.map((c) => c.name)).toEqual(['🍞 Pan', '🧀 Queso cheddar', '🧈 Mantequilla', '🍅 Tomates']);
    const fb = await checkRecipe(view);
    expect(fb.ok, fb.msg).toBe(true);
  });

  it('the shopping list and the missing list use the shelf names of the pack', async () => {
    const view = await mount(recipeState([]), spanish);
    expect(shoppingList()).toEqual(['1 loaf Pan', '1 pkg Queso cheddar', '1 stick Mantequilla', '0.5 lb Tomates']);
    const fb = await checkRecipe(view);
    expect(fb.ok).toBe(false);
    expect(fb.msg).toContain('Pan, Queso cheddar, Mantequilla, Tomates');
  });

  it('peanut butter is still not butter in another language', async () => {
    const view = await mount(recipeState([]), spanish);
    for (const name of ['Pan', 'Queso cheddar', 'Mantequilla de maní']) {
      const b = [...document.querySelectorAll('[aria-label="Grocery products"] button')].find((x) => x.textContent.includes(name));
      await click(b);
    }
    await click(shelfButton('Tomates'));
    await click(document.querySelector('button[aria-label="Add to Cart"][class*="w-full"]'));
    const fb = await checkRecipe(view);
    expect(fb.ok).toBe(false);
    expect(fb.msg).toContain('Mantequilla');
    expect(fb.msg).not.toContain('de maní');
  });
});

describe('carts and stores saved before ids', () => {
  it('an English cart with no ids still completes the recipe under a translated pack', async () => {
    const view = await mount(recipeState([line('🍞 Bread', 2.99), line('🧀 Cheddar Cheese', 4.99), line('🧈 Butter', 3.99), line('🍅 Tomatoes', 1.79, { weight: 1, pricePer: 'lb' })]), spanish);
    const fb = await checkRecipe(view);
    expect(fb.ok, fb.msg).toBe(true);
  });

  it('a cart saved in the current language with no ids completes the recipe', async () => {
    const view = await mount(recipeState([line('🍞 Pan', 2.99), line('🧀 Queso cheddar', 4.99), line('🧈 Mantequilla', 3.99), line('🍅 Tomates', 1.79, { weight: 1, pricePer: 'lb' })]), spanish);
    const fb = await checkRecipe(view);
    expect(fb.ok, fb.msg).toBe(true);
  });

  it('old cart lines get their id once loaded, and adding the same item again adds to that line', async () => {
    const view = await mount(recipeState([line('🍞 Bread', 2.99)]));
    await click(shelfButton('Bread'));
    expect(view.state.cart).toHaveLength(1);
    expect(view.state.cart[0]).toMatchObject({ id: 'bread', qty: 2 });
  });

  it('a saved store without ids gives its items ids, and the cart carries them', async () => {
    const view = await mount(recipeState([], { storeItems: [{ name: '🧈 Butter', price: 3.99, cat: 'Dairy', pricePer: 'each' }], storeItemsCurrency: 'USD' }));
    await click(shelfButton('Butter'));
    expect(view.state.cart).toEqual([expect.objectContaining({ id: 'butter', name: '🧈 Butter' })]);
  });

  it('every recipe ingredient is a store item id', async () => {
    const view = await mount({ tab: 'store', grade: 'college', currency: 'USD', storeDifficulty: 'standard' });
    const ids = new Set(view.state.storeItems.map((s) => s.id));
    expect(ids.size).toBe(view.state.storeItems.length);
    expect(ids.size).toBeGreaterThan(40);
    let recipes = 0;
    for (let r = 0; r < 100; r++) {
      await mount(recipeState([], { grade: 'college', activeRecipe: r }));
      const rows = shoppingList();
      if (!rows.length) break;
      recipes++;
      // Rows read "qty unit Name": the name is a store item's shelf name.
      const names = view.state.storeItems.map((s) => s.name.replace(/^\S+\s/, ''));
      for (const row of rows) expect(names.some((n) => row.endsWith(' ' + n)), 'recipe ' + r + ': ' + row).toBe(true);
    }
    expect(recipes).toBeGreaterThan(20);
  });
});
