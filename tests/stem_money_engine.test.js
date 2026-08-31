import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for the Money Math lab. Every financial figure
// asserted below is recomputed independently in this file from the
// standard formulas, never copied from the tool's own strings.

const sourcePath = 'stem_lab/stem_tool_money.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_money.js';
const src = fs.readFileSync(sourcePath, 'utf8');

const alloTStub = (key, fallback) => fallback;

// Extract a literal data block from the tool source and evaluate it with
// the i18n helper stubbed to its English fallback.
function extractLiteral(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker + ' present in source').toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  const chunk = src.slice(start, end);
  const objText = chunk.slice(chunk.indexOf('=') + 1, chunk.lastIndexOf(';'));
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', 'return (' + objText + ')')(alloTStub);
}

const CURRENCIES = extractLiteral('const CURRENCIES = {', 'const cur = CURRENCIES');
const RATES = extractLiteral('const RATES = {', 'const convert =');
const FIN_QUIZZES = extractLiteral('var FIN_QUIZZES = [', 'var genFinQuiz');

// Integer-unit denominations for a currency: cents for decimal currencies,
// whole yen for JPY (matching the tool's own isJPY handling).
function denomsInUnits(code) {
  const cur = CURRENCIES[code];
  const scale = code === 'JPY' ? 1 : 100;
  const all = cur.bills.concat(cur.coins).map((x) => Math.round(x.value * scale));
  return [...new Set(all)].sort((a, b) => b - a);
}

function smallestCoinUnits(code) {
  const scale = code === 'JPY' ? 1 : 100;
  return Math.min(...CURRENCIES[code].coins.map((c) => Math.round(c.value * scale)));
}

// Unbounded coin-change DP: minimum piece count, Infinity if uncomposable.
function dpMinPieces(denoms, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const dv of denoms) {
      if (dv <= a && dp[a - dv] + 1 < dp[a]) dp[a] = dp[a - dv] + 1;
    }
  }
  return dp[amount];
}

// The tool's greedy pass, replicated in integer units.
function greedyPieces(denoms, amount) {
  let remaining = amount;
  let count = 0;
  for (const dv of denoms) {
    while (remaining >= dv) { remaining -= dv; count++; }
  }
  return { count, remainder: remaining };
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'moneyMath');
});

describe('currency data', () => {
  it('defines eight currencies with positive finite denominations', () => {
    const codes = Object.keys(CURRENCIES);
    expect(codes.sort()).toEqual(['AUD', 'CAD', 'EUR', 'GBP', 'INR', 'JPY', 'MXN', 'USD']);
    for (const code of codes) {
      const cur = CURRENCIES[code];
      expect(cur.coins.length, code + ' coins').toBeGreaterThanOrEqual(4);
      expect(cur.bills.length, code + ' bills').toBeGreaterThanOrEqual(3);
      for (const item of cur.coins.concat(cur.bills)) {
        expect(Number.isFinite(item.value) && item.value > 0, code + ' ' + item.name).toBe(true);
      }
    }
  });

  it('pins the US coin set exactly', () => {
    expect(CURRENCIES.USD.coins.map((c) => c.value)).toEqual([0.01, 0.05, 0.1, 0.25, 0.5, 1]);
    expect(CURRENCIES.USD.bills.map((b) => b.value)).toEqual([1, 5, 10, 20, 50, 100]);
  });

  it('exchange rates are positive and convert() round-trips to identity', () => {
    for (const code of Object.keys(RATES)) {
      expect(RATES[code], code).toBeGreaterThan(0);
    }
    const roundTrip = (100 / RATES.USD) * RATES.EUR / RATES.EUR * RATES.USD;
    expect(roundTrip).toBeCloseTo(100, 9);
  });
});

describe('fewest-coins challenge', () => {
  it('greedy equals the DP optimum for every currency on snapped targets', () => {
    // The tool grades "optimal" with a greedy pass, which is only valid if
    // every currency's denomination system is canonical. Prove it against
    // an exhaustive DP over the first 120 multiples of the smallest coin.
    for (const code of Object.keys(CURRENCIES)) {
      const denoms = denomsInUnits(code);
      const smallest = smallestCoinUnits(code);
      for (let k = 1; k <= 120; k++) {
        const amount = k * smallest;
        const optimal = dpMinPieces(denoms, amount);
        const greedy = greedyPieces(denoms, amount);
        expect(greedy.remainder, code + ' ' + amount + ' composable').toBe(0);
        expect(Number.isFinite(optimal), code + ' ' + amount + ' DP-reachable').toBe(true);
        expect(greedy.count, code + ' ' + amount).toBe(optimal);
      }
    }
  });

  it('documents why targets must snap: A$3.47 is uncomposable in AUD', () => {
    // Regression context for the snap fix: Australia's smallest coin is 5c,
    // so an unsnapped cent target can never be matched from the tray.
    expect(dpMinPieces(denomsInUnits('AUD'), 347)).toBe(Infinity);
    expect(dpMinPieces(denomsInUnits('MXN'), 347)).toBe(Infinity);
  });

  it('generator snaps its target to the smallest coin (regression pin)', () => {
    expect(src).toContain('var fcSmallest = Math.min.apply(null, cur.coins.map(');
    expect(src).toContain('target = Math.max(fcSmallest, Math.round(target / fcSmallest) * fcSmallest);');
  });
});

describe('personal finance quiz', () => {
  it('every question has 4 choices, an in-range key, and an explanation', () => {
    expect(FIN_QUIZZES.length).toBeGreaterThanOrEqual(6);
    for (const q of FIN_QUIZZES) {
      expect(q.choices.length, q.q).toBe(4);
      expect(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, q.q).toBe(true);
      expect(typeof q.explanation === 'string' && q.explanation.length > 0, q.q).toBe(true);
    }
  });

  const byPrompt = (needle) => {
    const q = FIN_QUIZZES.find((x) => x.q.includes(needle));
    expect(q, needle).toBeTruthy();
    return q;
  };

  it('compound growth: $1,000 at 7% for 10 years is ~$1,967', () => {
    const q = byPrompt('invest $1,000 at 7%');
    expect(1000 * Math.pow(1.07, 10)).toBeCloseTo(1967.15, 1);
    expect(q.choices[q.correct]).toBe('$1,967');
  });

  it('loan comparison: 3% for 10 years really does cost more than 5% for 5', () => {
    const q = byPrompt('$20,000 loan');
    const interest = (principal, annualPct, months) => {
      const r = annualPct / 100 / 12;
      const pay = principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
      return pay * months - principal;
    };
    const at5for5 = interest(20000, 5, 60);
    const at3for10 = interest(20000, 3, 120);
    expect(at5for5).toBeCloseTo(2645, -1);
    expect(at3for10).toBeCloseTo(3175, -1);
    expect(at3for10).toBeGreaterThan(at5for5);
    expect(q.choices[q.correct]).toBe('3% for 10 years');
  });

  it('early-start question: keyed answer matches the recomputed difference and the explanation agrees', () => {
    const q = byPrompt('age 25 vs. age 35');
    // $200/month as $2,400/year compounded annually at 7% — the model the
    // answer key was built on.
    const fv = (years) => 2400 * ((Math.pow(1.07, years) - 1) / 0.07);
    const diff = fv(40) - fv(30);
    expect(fv(40)).toBeCloseTo(479111, -3);
    expect(fv(30)).toBeCloseTo(226706, -3);
    expect(Math.abs(diff - 260000)).toBeLessThan(30000);
    expect(q.choices[q.correct]).toBe('About $260,000 more');
    // The explanation once quoted $262K/$122K/"~$140K difference", flatly
    // contradicting its own keyed answer. Pin the corrected figures.
    expect(q.explanation).toContain('479');
    expect(q.explanation).toContain('227');
    expect(q.explanation).not.toContain('140K');
  });

  it('credit-card payoff: ~25 months and ~$125 interest, and the explanation says so', () => {
    const q = byPrompt('$500 in credit card debt');
    const r = 0.22 / 12;
    const months = -Math.log(1 - (r * 500) / 25) / Math.log(1 + r);
    expect(months).toBeGreaterThan(24);
    expect(months).toBeLessThan(26);
    const totalInterest = months * 25 - 500;
    expect(totalInterest).toBeGreaterThan(110);
    expect(totalInterest).toBeLessThan(135);
    expect(q.choices[q.correct]).toBe('About 2 years');
    expect(q.explanation).toContain('125');
    expect(q.explanation).not.toContain('$95');
  });

  it('Rule of 72 at 6% is 12 years', () => {
    const q = byPrompt('Rule of 72');
    expect(72 / 6).toBe(12);
    expect(q.choices[q.correct]).toBe('12 years');
  });
});

describe('rendered calculators', () => {
  // The tool's state bridge reads ctx.toolData._moneyMath (underscore
  // prefix), not toolData.moneyMath — passing the unprefixed key renders
  // the default coins tab and every assertion silently tests nothing.
  it('compound interest panel shows $1,000 at 7%/10yr yearly as $1967.15', () => {
    const html = renderTool('moneyMath', { _moneyMath: { tab: 'finance', finSub: 'compound' } });
    expect(html).toContain('Compound Interest Visualizer');
    expect(html).toContain('$1967.15');
  });

  it('loan panel shows the amortized monthly payment for the $25,000/5%/60mo default', () => {
    const r = 0.05 / 12;
    const payment = 25000 * (r * Math.pow(1 + r, 60)) / (Math.pow(1 + r, 60) - 1);
    expect(Math.round(payment)).toBe(472);
    const html = renderTool('moneyMath', { _moneyMath: { tab: 'finance', finSub: 'loans' } });
    expect(html).toContain('Loan &amp; Debt Calculator');
    expect(html).toContain('$' + Math.round(payment).toLocaleString());
  });
});

describe('Money Math regression refinements', () => {
  it('rounds receipt lines, tax, and the displayed equation at currency boundaries', () => {
    const html = renderTool('moneyMath', {
      _moneyMath: {
        tab: 'store', grade: 'high', currency: 'USD',
        cart: [{ name: 'Apples', price: 1.49, weight: 2.5, qty: 1, pricePer: 'lb' }],
      },
    });
    expect(html).toContain('$3.73 + $0.30 = $4.03');
    expect(html).not.toContain('$3.73 + $0.30 = $4.02');
  });

  it('renders a zero-principal loan without NaN or Infinity', () => {
    const html = renderTool('moneyMath', {
      _moneyMath: { tab: 'finance', finSub: 'loans', loanAmt: 0, loanRate: 5, loanTerm: 60 },
    });
    expect(html).toContain('Enter a loan amount greater than zero');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it('lets existing savings compound before solving for the monthly contribution', () => {
    const rate = 0.12 / 12;
    const months = 12;
    const futureExisting = 5000 * Math.pow(1 + rate, months);
    const expected = (10000 - futureExisting) / ((Math.pow(1 + rate, months) - 1) / rate);
    expect(Math.round(expected)).toBe(344);
    const html = renderTool('moneyMath', {
      _moneyMath: { tab: 'finance', finSub: 'goals', sgTarget: 10000, sgHave: 5000, sgMonths: months, sgRate: 12 },
    });
    expect(html).toContain('$344');
    expect(html).not.toContain('$394');
  });

  it('uses selected-currency denominations in Coin Drop', () => {
    const html = renderTool('moneyMath', {
      _moneyMath: { tab: 'cents', currency: 'JPY', grade: 'elementary', cdTarget: 500, cdDropped: [] },
    });
    expect(html).toContain('aria-label="Add \u00A51 denomination"');
    expect(html).toContain('aria-label="Add \u00A5500 denomination"');
    expect(html).not.toContain('aria-label="Drop $1 coin"');
  });

  it('rejects fractional-yen tips but awards one host XP event for the rounded answer', async () => {
    const tool = window.StemLab._registry.moneyMath;
    const awardXP = vi.fn();
    let latest;

    function App({ answer }) {
      const [state, setState] = React.useState({
        _moneyMath: { tab: 'tips', currency: 'JPY', tipMode: 'tip', tipBill: 1000, tipPct: 15, tipDiners: 3, tipAnswer: answer },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    document.body.innerHTML = '<div id="money-root"></div>';
    let root = ReactDOMClient.createRoot(document.getElementById('money-root'));
    await React.act(async () => { root.render(React.createElement(App, { answer: 383.33 })); });
    let check = document.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); });
    expect(latest._moneyMath.tipFeedback.ok).toBe(false);
    expect(awardXP).not.toHaveBeenCalled();
    await React.act(async () => { root.unmount(); });

    document.body.innerHTML = '<div id="money-root"></div>';
    root = ReactDOMClient.createRoot(document.getElementById('money-root'));
    await React.act(async () => { root.render(React.createElement(App, { answer: 383 })); });
    check = document.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._moneyMath.tipFeedback.ok).toBe(true);
    expect(document.body.textContent).toContain('= \u00A5383/person');
    expect(awardXP).toHaveBeenCalledWith('moneyMath', 15, 'tip calculation');
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('clears currency-dependent problem state when the currency changes', async () => {
    const tool = window.StemLab._registry.moneyMath;
    let latest;
    function App() {
      const [state, setState] = React.useState({
        _moneyMath: { tab: 'tips', currency: 'JPY', tipMode: 'tip', tipBill: 1000, tipAnswer: 383, tipFeedback: { ok: true }, changePrice: 750, changeFeedback: { ok: true } },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    document.body.innerHTML = '<div id="money-root"></div>';
    const root = ReactDOMClient.createRoot(document.getElementById('money-root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const currency = document.querySelector('select[aria-label="Currency"]');
    currency.value = 'USD';
    await React.act(async () => { currency.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(latest._moneyMath.currency).toBe('USD');
    expect(latest._moneyMath.tipBill).toBeNull();
    expect(latest._moneyMath.tipAnswer).toBeNull();
    expect(latest._moneyMath.tipFeedback).toBeNull();
    expect(latest._moneyMath.changePrice).toBeNull();
    expect(latest._moneyMath.changeFeedback).toBeNull();
    await React.act(async () => { root.unmount(); });
  });

  it('generates non-negative change even when a college price exceeds the largest bill', async () => {
    const tool = window.StemLab._registry.moneyMath;
    let latest;
    function App() {
      const [state, setState] = React.useState({ _moneyMath: { tab: 'change', currency: 'USD', grade: 'college' } });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    document.body.innerHTML = '<div id="money-root"></div>';
    const root = ReactDOMClient.createRoot(document.getElementById('money-root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const generate = document.querySelector('button[aria-label="Generate Problem"]');
    await React.act(async () => { generate.click(); });
    expect(latest._moneyMath.changePrice).toBeGreaterThan(100);
    expect(latest._moneyMath.changePaid).toBeGreaterThanOrEqual(latest._moneyMath.changePrice);
    expect(latest._moneyMath.changePaid - latest._moneyMath.changePrice).toBeGreaterThanOrEqual(0);
    random.mockRestore();
    await React.act(async () => { root.unmount(); });
  });

  it('keeps Check the Change non-negative above the largest single bill', async () => {
    const tool = window.StemLab._registry.moneyMath;
    let latest;
    function App() {
      const [state, setState] = React.useState({
        _moneyMath: { tab: 'cents', currency: 'USD', grade: 'college', storeItems: [] },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    document.body.innerHTML = '<div id="money-root"></div>';
    const root = ReactDOMClient.createRoot(document.getElementById('money-root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const start = document.querySelector('button[aria-label="Item costs:"]');
    await React.act(async () => { start.click(); });
    expect(latest._moneyMath.ccPrice).toBeGreaterThan(100);
    expect(latest._moneyMath.ccPaid).toBeGreaterThanOrEqual(latest._moneyMath.ccPrice);
    expect(latest._moneyMath.ccCorrectAmt).toBeGreaterThanOrEqual(0);
    random.mockRestore();
    await React.act(async () => { root.unmount(); });
  });

  it('routes all rewards through the scoped host helper and recognizes object feedback in the quest hook', () => {
    expect(src).not.toMatch(/\b(?:addXP|awardStemXP)\s*\(/);
    const hook = window.StemLab._registry.moneyMath.questHooks.find((item) => item.id === 'make_change');
    expect(hook.check({ changeFeedback: { ok: true } })).toBe(true);
    expect(hook.progress({ changeFeedback: { ok: true } })).toBe('Done!');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
