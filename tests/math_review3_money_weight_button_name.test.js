import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The weight popup's "+" button raises the weight by a quarter pound, but a
// screen reader announced it as "Add to Cart", the same name as the button that
// really adds the item. It now has its own translatable name.
//
// MR3_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR3_MONEY_SRC || 'stem_lab/stem_tool_money.js';

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function openWeightPopup(t) {
  const tool = window.StemLab._registry.moneyMath;
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _moneyMath: { tab: 'store', grade: 'middle', currency: 'USD', storeDifficulty: 'standard' } });
    view.state = state._moneyMath;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, t ? { t } : {})));
  }
  document.body.innerHTML = '<div id="money-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('money-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  const apples = [...document.querySelectorAll('[aria-label="Grocery products"] button')].find((b) => /Apples/.test(b.textContent) && /Enter weight/.test(b.textContent));
  expect(apples, 'Apples weigh button').toBeTruthy();
  await React.act(async () => { apples.click(); });
  const popup = document.querySelector('input[aria-label="Item weight in pounds"]').closest('div.absolute');
  return { view, popup };
}

describe('weight popup buttons have honest names', () => {
  it('"+" is "Increase item weight", and only the real add button is "Add to Cart"', async () => {
    const { view, popup } = await openWeightPopup();
    const plus = [...popup.querySelectorAll('button')].find((b) => b.textContent === '+');
    expect(plus.getAttribute('aria-label')).toBe('Increase item weight');
    const adds = [...popup.querySelectorAll('button[aria-label="Add to Cart"]')];
    expect(adds).toHaveLength(1);
    expect(adds[0].textContent).toContain('Add to Cart');
    await React.act(async () => { plus.click(); });
    expect(view.state.weightInput).toBe(1.25);
    expect(view.state.cart || []).toEqual([]);
  });

  it('the name comes from the language pack', async () => {
    const t = (key, fallback) => (key === 'stem.money.increase_item_weight' ? 'Aumentar el peso' : fallback);
    const { popup } = await openWeightPopup(t);
    const plus = [...popup.querySelectorAll('button')].find((b) => b.textContent === '+');
    expect(plus.getAttribute('aria-label')).toBe('Aumentar el peso');
  });
});
