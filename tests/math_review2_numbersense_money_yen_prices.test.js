import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Yen has no cents. The store, the structured word problems, Estimate the
// Total and Unit Pricing used dollar-sized prices and only relabelled them, so
// apples cost ¥1, every Easy-mode item cost ¥100, and "3 apples at ¥3 each"
// was keyed from the hidden 2.57. Prices now come from the tool's own fixed
// classroom rate (1 USD = 149.5 JPY), in whole yen, and every key is computed
// from the numbers the student can see.
//
// MR2_NUMBERSENSE_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MONEY_SRC || 'stem_lab/stem_tool_money.js';
const RATE = 149.5;

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
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const yen = (s) => Number(String(s).replace(/,/g, ''));
const halfUp = (x) => Math.round(Number(x.toPrecision(12)));

describe('grocery store in yen', () => {
  it('shelf prices are the dollar prices at the classroom rate, in whole yen', async () => {
    const usd = (await mount({ tab: 'store', grade: 'elementary', currency: 'USD', storeDifficulty: 'standard' })).state.storeItems;
    const jpy = (await mount({ tab: 'store', grade: 'elementary', currency: 'JPY', storeDifficulty: 'standard' })).state.storeItems;
    expect(jpy.map((i) => i.name)).toEqual(usd.map((i) => i.name));
    expect(jpy.map((i) => i.price)).toEqual(usd.map((i) => Math.round(i.price * RATE)));
    const shown = [...document.querySelectorAll('[aria-label="Grocery products"] button')].map((b) => b.textContent);
    expect(shown.some((t) => /Bananas¥88\b/.test(t)), shown.slice(0, 3).join(' | ')).toBe(true);
    expect(shown.filter((t) => /¥\d(?![\d,])/.test(t))).toEqual([]);
  });

  it('Easy prices round to ¥100 steps instead of all becoming ¥100', async () => {
    await mount({ tab: 'store', grade: 'elementary', currency: 'JPY', storeDifficulty: 'easy' });
    const prices = [...document.querySelectorAll('[aria-label="Grocery products"] span.text-emerald-700')].map((s) => yen(s.textContent.replace('¥', '')));
    expect(prices.length).toBeGreaterThan(20);
    expect(prices.every((p) => p % 100 === 0 && p >= 100)).toBe(true);
    expect(new Set(prices).size).toBeGreaterThan(3);
  });

  it('a saved yen store from before the fix is rebuilt at yen prices', async () => {
    const view = await mount({ tab: 'store', grade: 'elementary', currency: 'JPY', storeDifficulty: 'standard',
      storeItems: [{ name: '🍌 Bananas', price: 0.59, cat: 'Produce', pricePer: 'lb' }] });
    expect(view.state.storeItems.find((i) => /Bananas/.test(i.name)).price).toBe(88);
  });
});

describe('Common Cents in yen: keys come from the numbers shown', () => {
  it('structured word problems', async () => {
    const view = await mount({ tab: 'cents', grade: 'middle', currency: 'JPY' });
    const bad = [];
    const seen = new Set();
    for (let i = 0; i < 80; i++) {
      await click(document.querySelector('button[aria-label="Gen Structured Problem"]'));
      const t = view.state.spText;
      const keys = view.state.spAnswers.map((a) => a.val);
      // Dollar-sized amounts relabelled as yen: "¥3 each", "¥8/hour", "a ¥25 bill".
      const tiny = (...amounts) => { if (amounts.some((a) => a < 30)) bad.push('dollar-sized yen: ' + t); };
      let m, want = null;
      if ((m = /You buy (\d+) .+? at ¥([\d,]+) each and (\d+) .+? at ¥([\d,]+) each/.exec(t))) { seen.add('buy'); tiny(yen(m[2]), yen(m[4])); want = [m[1] * yen(m[2]) + m[3] * yen(m[4])]; }
      else if ((m = /costs ¥([\d,]+)\. It's on sale for (\d+)% off/.exec(t))) { seen.add('sale'); tiny(yen(m[1])); want = [halfUp(yen(m[1]) * (1 - m[2] / 100))]; }
      else if ((m = /You have ¥([\d,]+)\. You want to buy something that costs ¥([\d,]+)/.exec(t))) { seen.add('need'); tiny(yen(m[2])); want = [Math.max(0, yen(m[2]) - yen(m[1]))]; }
      else if ((m = /Dinner costs ¥([\d,]+)\. You want to leave a (\d+)% tip/.exec(t))) { seen.add('tip'); tiny(yen(m[1])); const tip = halfUp(yen(m[1]) * m[2] / 100); want = [tip, yen(m[1]) + tip]; }
      else if ((m = /You earn ¥([\d,]+)\/hour and work (\d+) hours\. After (\d+)% tax/.exec(t))) { seen.add('wage'); tiny(yen(m[1])); const g = yen(m[1]) * m[2]; want = [g, halfUp(g * (1 - m[3] / 100))]; }
      else if ((m = /(\d+) friends split a ¥([\d,]+) bill/.exec(t))) { seen.add('split'); tiny(yen(m[2])); want = [halfUp(yen(m[2]) / m[1])]; }
      else bad.push('unparsed: ' + t);
      if (want && JSON.stringify(want) !== JSON.stringify(keys)) bad.push(t + ' keyed ' + keys + ' want ' + want);
    }
    expect(seen.size).toBe(6);
    expect(bad.slice(0, 4), bad.length + ' bad').toEqual([]);
  });

  it('Estimate the Total: the shown prices add up to the key', async () => {
    const view = await mount({ tab: 'cents', grade: 'middle', currency: 'JPY' });
    const bad = [];
    for (let i = 0; i < 30; i++) {
      await click(document.querySelector('button[aria-label="Gen Estimate Total"]'));
      const items = view.state.estItems;
      const shownSum = items.reduce((s, it) => s + Math.round(it.price) * it.qty, 0);
      if (items.some((it) => !Number.isInteger(it.price) || it.price < 50)) bad.push('price ' + items.map((it) => it.price).join(','));
      if (shownSum !== view.state.estTotal) bad.push('shown ' + shownSum + ' key ' + view.state.estTotal);
    }
    expect(bad.slice(0, 4), bad.length + ' bad').toEqual([]);
  });

  it('Unit Pricing: whole-yen prices', async () => {
    const view = await mount({ tab: 'cents', grade: 'middle', currency: 'JPY' });
    const bad = [];
    for (let i = 0; i < 30; i++) {
      await click(document.querySelector('button[aria-label="Gen Unit Price Problem"]'));
      for (const o of [view.state.upA, view.state.upB]) if (!Number.isInteger(o.price) || o.price < 50) bad.push(JSON.stringify(o));
    }
    expect(bad.slice(0, 4), bad.length + ' bad').toEqual([]);
  });
});

describe('dollar currencies are unchanged', () => {
  it('USD shelf prices keep their cents', async () => {
    const usd = (await mount({ tab: 'store', grade: 'elementary', currency: 'USD', storeDifficulty: 'standard' })).state.storeItems;
    expect(usd.find((i) => /Bananas/.test(i.name)).price).toBe(0.59);
  });
});
