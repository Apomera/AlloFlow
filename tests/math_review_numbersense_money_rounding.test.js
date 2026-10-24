import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// Money Math rounds every half-cent UP, in the checker, the worked-support
// model and the receipt alike. Expected cents are computed here in integer
// arithmetic: round_half_up(cents * percent / 100).
//
// MR_NUMBERSENSE_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR_NUMBERSENSE_MONEY_SRC || 'stem_lab/stem_tool_money.js';
const src = fs.readFileSync(FILE, 'utf8');
const cut = (a, b) => sliceBetween(src, a, b, { file: FILE });

// eslint-disable-next-line no-new-func
const roundCurrency = new Function(cut('const currencyFractionDigits = (code) =>', 'const currencyUnits') + '\nreturn roundCurrency;')();
// eslint-disable-next-line no-new-func
const moneyPercentModel = new Function(cut('function moneyPercentModel(mode, original, percent, extra, scale) {', 'function moneyBudgetModel') + '\nreturn moneyPercentModel;')();

const halfUp = (num, den) => Math.floor((2 * num + den) / (2 * den)); // for num >= 0

describe('half-cent rounding', () => {
  it('roundCurrency rounds every exact half-cent up', () => {
    // $6.42 x 25% = $1.605 was rounded to $1.60; $4.015 to $4.01.
    expect(roundCurrency(6.42 * 0.25, 'USD')).toBe(1.61);
    expect(roundCurrency(8.03 / 2, 'USD')).toBe(4.02);
    expect(roundCurrency(5.02 * 0.75, 'USD')).toBe(3.77);
    expect(roundCurrency(1.79 * 2.5, 'USD')).toBe(4.48);
    const bad = [];
    for (let cents = 1; cents <= 20000; cents++) {
      for (const pct of [5, 10, 15, 18, 20, 25, 30, 35, 40, 50, 75]) {
        const got = Math.round(roundCurrency((cents / 100) * (pct / 100), 'USD') * 100);
        if (got !== halfUp(cents * pct, 100)) bad.push((cents / 100) + ' x ' + pct + '% -> ' + got);
      }
    }
    expect(bad.slice(0, 5), bad.length + ' misrounded').toEqual([]);
  });

  it('whole-yen amounts still round to whole yen', () => {
    expect(roundCurrency(1234.5, 'JPY')).toBe(1235);
    expect(roundCurrency(1234.49, 'JPY')).toBe(1234);
  });

  it('the worked-support percentage model matches the same rounding', () => {
    const bad = [];
    for (let cents = 1; cents <= 20000; cents += 7) {
      for (const pct of [10, 15, 18, 20, 25, 30, 40, 50]) {
        const tip = moneyPercentModel('tip', cents / 100, pct, 2, 100);
        const disc = moneyPercentModel('discount', cents / 100, pct, 0, 100);
        if (tip.part !== halfUp(cents * pct, 100)) bad.push('tip ' + cents + 'c ' + pct + '%: ' + tip.part);
        if (disc.afterPercent !== halfUp(cents * (100 - pct), 100)) bad.push('discount ' + cents + 'c ' + pct + '%: ' + disc.afterPercent);
      }
    }
    expect(bad.slice(0, 5), bad.length + ' model mismatches').toEqual([]);
  });
});

describe('structured word problems', () => {
  // eslint-disable-next-line no-new-func
  const STRUCT = new Function('__alloT', 'roundCurrency', 'currency',
    cut('var STRUCT_PROBLEMS = [', 'var genStructuredProblem') + '\nreturn STRUCT_PROBLEMS;'
  )((k, fb) => fb, roundCurrency, 'USD');
  const cents = (v) => Math.round(v * 100);

  it('answer keys round half-cents up exactly once', () => {
    const bad = [];
    for (let i = 0; i < 4000; i++) {
      const p = STRUCT[i % STRUCT.length];
      const v = p.gen();
      const got = p.compute(v).map((a) => cents(roundCurrency(a.val, 'USD')));
      let want;
      if ('q1' in v) want = [v.q1 * cents(v.p1) + v.q2 * cents(v.p2)];
      else if ('original' in v) want = [halfUp(cents(v.original) * (100 - v.pct), 100)];
      else if ('have' in v) want = [Math.max(0, cents(v.want) - cents(v.have))];
      else if ('tipPct' in v) { const tip = halfUp(cents(v.bill) * v.tipPct, 100); want = [tip, cents(v.bill) + tip]; }
      else if ('hourly' in v) { const gross = v.hourly * v.hours * 100; want = [gross, halfUp(gross * (100 - v.taxPct), 100)]; }
      else want = [halfUp(cents(v.bill), v.friends)];
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(p.template.slice(0, 30) + ' ' + JSON.stringify(v) + ' got ' + got + ' want ' + want);
    }
    expect(bad.slice(0, 4), bad.length + ' wrong keys').toEqual([]);
  });

  it('only money amounts carry a currency symbol ("3 apples", "20% off", not "$3.00 apples", "$20.00% off")', () => {
    const fmt = (v) => '$' + roundCurrency(v, 'USD').toFixed(2);
    let text = null;
    // eslint-disable-next-line no-new-func
    const gen = new Function('STRUCT_PROBLEMS', 'beginMoneyRound', 'fmt', 'roundCurrency', 'currency', 'upd',
      cut('var genStructuredProblem = function () {', '// ── Coin Drop minigame') + '\nreturn genStructuredProblem;'
    )(STRUCT, () => {}, fmt, roundCurrency, 'USD', (k, val) => { if (k === 'spText') text = val; });
    const moneyFields = ['p1', 'p2', 'original', 'have', 'want', 'bill', 'hourly'];
    const seen = new Set();
    const bad = [];
    for (let i = 0; i < 300; i++) {
      gen();
      const template = STRUCT.find((p) => {
        const re = new RegExp('^' + p.template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+?') + '$');
        return re.test(text);
      });
      expect(template, text).toBeTruthy();
      seen.add(template.template);
      const expected = (template.template.match(/\{(\w+)\}/g) || []).filter((m) => moneyFields.includes(m.slice(1, -1))).length;
      const dollars = (text.match(/\$/g) || []).length;
      if (dollars !== expected || /\{\w+\}/.test(text)) bad.push(text);
    }
    expect(seen.size).toBe(STRUCT.length);
    expect(bad.slice(0, 4)).toEqual([]);
  });
});

describe('checkers and receipts in the real tool', () => {
  let root = null;
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });
  afterEach(async () => {
    if (root) { await React.act(async () => { root.unmount(); }); root = null; }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  async function check(moneyState, label) {
    const tool = window.StemLab._registry.moneyMath;
    let latest;
    function App() {
      const [state, setState] = React.useState({ _moneyMath: moneyState });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    document.body.innerHTML = '<div id="money-root"></div>';
    root = ReactDOMClient.createRoot(document.getElementById('money-root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const button = document.querySelector('button[aria-label="Check"]');
    expect(button, label).toBeTruthy();
    await React.act(async () => { button.click(); });
    return latest._moneyMath;
  }

  it('tip: $6.42 + 25% split 2 ways is $4.02 per person', async () => {
    // Tip $1.605 -> $1.61, total $8.03, / 2 = $4.015 -> $4.02. The checker keyed $4.01.
    const base = { tab: 'tips', currency: 'USD', tipMode: 'tip', tipBill: 6.42, tipPct: 25, tipDiners: 2 };
    expect((await check(Object.assign({ tipAnswer: 4.02 }, base), 'tip check')).tipFeedback.ok).toBe(true);
    await React.act(async () => { root.unmount(); }); root = null;
    expect((await check(Object.assign({ tipAnswer: 4.01 }, base), 'tip check')).tipFeedback.ok).toBe(false);
  });

  it('discount: $5.02 at 25% off is $3.77', async () => {
    const state = await check({ tab: 'tips', currency: 'USD', tipMode: 'discount', discOriginal: 5.02, discPercent: 25, discCoupon: 0, discAnswer: 3.77 }, 'discount check');
    expect(state.discFeedback.ok).toBe(true);
  });

  it('store receipt: 2.5 lb at $1.79/lb is $4.48', () => {
    const html = renderTool('moneyMath', { _moneyMath: { tab: 'store', grade: 'high', currency: 'USD', cart: [{ name: 'Tomatoes', price: 1.79, weight: 2.5, qty: 1, pricePer: 'lb' }] } });
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const ctxOf = (k) => { const i = text.indexOf(k); return i < 0 ? '' : text.slice(Math.max(0, i - 160), i + 30); };
    expect(text.includes('$4.48'), 'receipt line').toBe(true);
    expect(ctxOf('$4.47'), 'context').toBe('');
  });
});
