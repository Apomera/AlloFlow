// Economics Lab: offline engines, corrected models, and the no-AI path.
//
// Three layers, all against the SHIPPED tool (ECON_TEST_SOURCE may point at a
// scratch copy for mutation testing; the tree file is never edited by tests):
//   1. the pure engines the UI runs (ECON_ENGINE, exposed as cfg._engine)
//   2. SSR renders of saved states, including hostile and legacy ones
//   3. real click-throughs with callGemini === null, which is what the host
//      gives QR-joined students and what dead-ended three tabs before.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ECON_TEST_SOURCE || 'stem_lab/stem_tool_economicslab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const TOOL = 'economicsLab';

let E;
beforeAll(() => {
  resetStemLab();
  E = loadTool(FILE, TOOL)._engine;
});

afterEach(() => { vi.restoreAllMocks(); });

const reload = () => { resetStemLab(); loadTool(FILE, TOOL); };
const render = (state) => { reload(); return renderTool(TOOL, state || {}); };

// ── 1. Engines ─────────────────────────────────────────────────────────────

describe('personal finance engine', () => {
  it('uses marginal brackets: a raise never lowers take-home pay', () => {
    let prev = -Infinity;
    for (let s = 0; s <= 700000; s += 250) {
      const takeHome = s - E.pfTax(s).total;
      expect(takeHome).toBeGreaterThanOrEqual(prev);
      prev = takeHome;
    }
  });

  it('pays the salary: a quiet year adds take-home pay and subtracts every bill', () => {
    const r = E.lifeYear({}, {}, () => 0.5);
    const L = r.ledger;
    expect(L.takeHome).toBe(35000 - E.pfTax(35000).total);
    expect(L.net).toBe(L.takeHome - L.housing - L.living - L.other);
    expect(L.net).toBeGreaterThan(0);
    expect(r.state.cash).toBe(2000 + L.net);
    // The monthly budget card shows the same money, one month at a time.
    expect(Math.round(E.pfBudget({}).leftover * 12)).toBe(L.net);
  });

  it('puts a shortfall on the credit card instead of leaving cash negative', () => {
    const r = E.lifeYear({ housing: 'owning', cash: 0 }, {}, () => 0.5);
    expect(r.state.cash).toBe(0);
    expect(r.ledger.shortfall).toBeGreaterThan(0);
    expect(r.state.card).toBe(r.ledger.shortfall);
  });

  it('charges cards more than loans, and sends extra payments to the card first', () => {
    const r = E.lifeYear({ debt: 5000, card: 5000, cash: 20000, extraDebtPay: 100 }, {}, () => 0.5);
    expect(r.ledger.cardInterest).toBe(1100);
    expect(r.ledger.loanInterest).toBe(350);
    // Card: 5000 + 1100 - payment; loan gets only its minimum.
    expect(5000 - r.state.card).toBeGreaterThan(5000 - r.state.debt);
  });

  it('never rewards carrying debt with a better credit score', () => {
    let free = {}, owing = { debt: 2000 }, carding = { card: 2000 };
    for (let y = 0; y < 15; y++) {
      free = Object.assign({}, free, E.lifeYear(free, {}, () => 0.5).state);
      owing = Object.assign({}, owing, E.lifeYear(owing, {}, () => 0.5).state);
      carding = Object.assign({}, carding, E.lifeYear(carding, {}, () => 0.5).state);
    }
    expect(owing.credit).toBeLessThanOrEqual(free.credit);
    expect(carding.credit).toBeLessThanOrEqual(free.credit);
    // A big card balance (high utilization) costs points even with on-time payments.
    const heavy = E.lifeYear({ card: 12000, cash: 50000 }, {}, () => 0.5);
    expect(heavy.ledger.creditMove).toBeLessThan(E.lifeYear({ cash: 50000 }, {}, () => 0.5).ledger.creditMove);
  });

  it('makes risk real: returns vary, and speculation averages LESS than stocks', () => {
    const spread = (type) => [0.02, 0.98].map((u) => E.pfYearReturn(type, () => u));
    const [aLo, aHi] = spread('Aggressive'), [cLo, cHi] = spread('Conservative');
    expect(aHi - aLo).toBeGreaterThan(cHi - cLo);
    expect(aLo).toBeLessThan(0);
    const mean = (type) => { let t = 0; for (let i = 0; i < 1000; i++) t += E.pfYearReturn(type, () => (i + 0.5) / 1000); return t / 1000; };
    expect(mean('Aggressive')).toBeCloseTo(0.10, 2);
    expect(mean('Speculative')).toBeLessThan(mean('Aggressive'));
  });

  it('crashes stock-heavy portfolios harder, and the rebound rewards holding', () => {
    const crash = { marketCrash: true };
    const agg = E.lifeYear({ invested: 20000, investType: 'Aggressive' }, crash, () => 0.5);
    const bonds = E.lifeYear({ invested: 20000, investType: 'Conservative' }, crash, () => 0.5);
    expect(agg.ledger.crashLoss).toBeGreaterThan(bonds.ledger.crashLoss);
    const holdNext = E.lifeYear(Object.assign({ investType: 'Aggressive' }, agg.state), {}, () => 0.5);
    const sold = E.lifeYear({ invested: 20000, investType: 'Aggressive' }, { marketCrash: true, sellAll: true }, () => 0.5);
    const soldNext = E.lifeYear(Object.assign({ investType: 'Aggressive' }, sold.state), {}, () => 0.5);
    expect(holdNext.ledger.returnRate).toBeGreaterThan(0.2);
    expect(soldNext.ledger.growth).toBe(0);
    expect(sold.state.invested).toBe(0);
  });

  it('prices insurance honestly: premiums roughly match expected claims, and it caps ruinous bills', () => {
    const surgery = E.LIFE_EVENTS.find((x) => x.id === 'surgery');
    const wrist = E.LIFE_EVENTS.find((x) => x.id === 'broken_wrist');
    const saved = (ev) => { const e = ev.choices[0].effect; return (e.loan || 0) - (e.loanIfInsured || 0) + ((-(e.cash || 0)) - (-(e.cashIfInsured || 0))); };
    // Each built-in event comes up about 1 year in LIFE_EVENTS.length.
    const expectedSavedPerYear = (saved(surgery) + saved(wrist)) / E.LIFE_EVENTS.length;
    const premium = E.PF_INSURANCE_MONTHLY * 12;
    expect(expectedSavedPerYear / premium).toBeGreaterThan(0.6);
    expect(expectedSavedPerYear / premium).toBeLessThan(1.4);
    expect(saved(surgery)).toBeGreaterThan(premium * 10);
  });

  it('needs a down payment to buy a home and charges selling costs to leave', () => {
    expect(E.pfSwitchHousing({ cash: 5000 }, 'owning').ok).toBe(false);
    const buy = E.pfSwitchHousing({ cash: 30000 }, 'owning');
    expect(buy.patch).toEqual({ housing: 'owning', cash: 10000, equity: 20000 });
    const sell = E.pfSwitchHousing({ housing: 'owning', cash: 0, equity: 50000 }, 'renting');
    expect(sell.patch.cash).toBe(47000);
    expect(E.pfBudget({ housing: 'constructor' }).housing).toBe(1000);
  });

  it('keeps compounding money already invested after contributions stop', () => {
    const r = E.lifeYear({ invested: 10000, investPct: 0, investType: 'Balanced' }, {}, () => 0.5);
    expect(r.ledger.growth).toBe(700);
    expect(r.state.invested).toBe(10700);
  });

  it('shows why minimum payments are slow and extra payments are fast', () => {
    const yearsToZero = (extra) => {
      let s = { debt: 10000, extraDebtPay: extra, cash: 50000 }, y = 0;
      while (s.debt > 0 && y < 60) { s = Object.assign({}, s, E.lifeYear(s, {}, () => 0.5).state); y++; }
      return y;
    };
    expect(yearsToZero(0)).toBeGreaterThan(10);
    expect(yearsToZero(200)).toBeLessThan(6);
  });

  it('charges insured players the deductible, not the full bill', () => {
    const ev = E.LIFE_EVENTS.find((x) => x.id === 'broken_wrist');
    const payNow = ev.choices[0].effect;
    const uninsured = E.lifeYear({}, payNow, () => 0.5).ledger.eventCash;
    const insured = E.lifeYear({ insurance: true }, payNow, () => 0.5).ledger.eventCash;
    expect(uninsured).toBe(-3800);
    expect(insured).toBe(-750);
  });

  it('only uses effect keys the engine understands, in every built-in event', () => {
    const KNOWN = new Set(['cash', 'cashIfInsured', 'debt', 'loan', 'loanIfInsured', 'card', 'salary', 'salaryPct', 'salaryNext', 'unpaidMonths', 'happiness', 'credit', 'insurance', 'career', 'invested', 'marketCrash', 'sellAll', 'windfallToDebt', 'housing', 'food', 'transport', 'fun', 'matchPct', 'gamble', 'carBuy', 'carSell']);
    expect(E.LIFE_EVENTS.length).toBeGreaterThanOrEqual(20);
    for (const ev of E.LIFE_EVENTS) {
      expect(ev.choices.length, ev.id).toBeGreaterThanOrEqual(2);
      expect(typeof ev.lesson, ev.id).toBe('string');
      for (const c of ev.choices) for (const k of Object.keys(c.effect)) expect(KNOWN.has(k), ev.id + '.' + k).toBe(true);
    }
  });

  it('always finds an age-appropriate built-in event', () => {
    for (let age = 16; age <= 95; age++) {
      const ev = E.pickLifeEvent({ age }, [], () => 0.3);
      expect(ev && ev.choices.length).toBeGreaterThan(0);
    }
  });

  it('clamps AI event effects to the ranges the prompt promised', () => {
    const out = E.sanitizeAiLifeEffect({ cash: 1e9, debt: -1e9, salary: 'lots', happiness: 99, credit: -400, evil: 1 });
    expect(out).toEqual({ cash: 10000, card: -20000, happiness: 20, credit: -50 });
  });
});

describe('supply and demand engine', () => {
  it('treats a positive supply shift as an INCREASE (price falls, quantity rises)', () => {
    const base = E.sdOutcome({});
    const more = E.sdOutcome({ sShift: 3 });
    expect(more.pStar).toBeLessThan(base.pStar);
    expect(more.qStar).toBeGreaterThan(base.qStar);
    // The canvas and every readout use the same intercept as the engine.
    expect(SRC).toContain('var sdSupInt = 10 - sdSupplyShift * 5;');
  });

  it('measures welfare exactly: no deadweight loss in a free market, and the pieces always add up', () => {
    const free = E.sdOutcome({});
    expect(free.cs).toBeCloseTo(1000, 6);
    expect(free.ps).toBeCloseTo(1000, 6);
    expect(free.dwl).toBeCloseTo(0, 6);
    const tax = E.sdOutcome({ tax: 20 });
    expect(tax.dwl).toBeCloseTo(0.5 * 20 * (tax.qStar - tax.q), 6);
    expect(tax.gov).toBeCloseTo(20 * tax.q, 6);
    for (const p of [{ ceiling: 30 }, { floor: 70 }, { tax: 10, dSlope: 1.4, sSlope: 0.4 }, { ceiling: 40, dShift: 2 }, { floor: 60, sShift: -2 }]) {
      const o = E.sdOutcome(p);
      expect(o.dwl, JSON.stringify(p)).toBeGreaterThan(1);
      expect(o.cs + o.ps + o.gov + o.dwl).toBeCloseTo(o.tsStar, 6);
    }
  });

  it('keys every Market Detective case from the graph the student will see', () => {
    for (const c of E.SD_CASES) {
      const pred = E.sdPredict(c.ds, c.ss);
      const a = E.sdOutcome({}), z = E.sdOutcome({ dShift: c.ds, sShift: c.ss });
      const dir = (v) => (Math.abs(v) < 1e-9 ? 'same' : v > 0 ? 'up' : 'down');
      if (pred.p !== 'unclear') expect(pred.p, c.id + ' price').toBe(dir(z.pStar - a.pStar));
      if (pred.q !== 'unclear') expect(pred.q, c.id + ' quantity').toBe(dir(z.qStar - a.qStar));
      // Two-shift cases have exactly one honest "can't tell"; one-shift cases none.
      const unclear = [pred.p, pred.q].filter((x) => x === 'unclear').length;
      expect(unclear, c.id).toBe(c.ds && c.ss ? 1 : 0);
      expect(z.qStar, c.id).toBeLessThanOrEqual(100);
      expect(z.pStar, c.id).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the scenario generator away from the Detective answer key', () => {
    const detective = new Set(E.SD_CASES.map((c) => c.headline));
    expect(E.SD_SCENARIOS.length).toBeGreaterThanOrEqual(6);
    for (const sc of E.SD_SCENARIOS) {
      expect(detective.has(sc.explanation)).toBe(false);
      const o = E.sdOutcome({ dShift: sc.dShift, sShift: sc.sShift, dSlope: sc.dSlope, sSlope: sc.sSlope, tax: sc.tax, ceiling: sc.ceiling, floor: sc.floor, ext: sc.ext });
      if (sc.ext) {
        // A market failure: no policy yet, and society loses anyway.
        expect(o.socialDwl, sc.title + ' should cost society').toBeGreaterThan(1);
      } else if (sc.monopoly) {
        const m = E.sdOutcome({ dShift: sc.dShift, sShift: sc.sShift, dSlope: sc.dSlope, sSlope: sc.sSlope, tax: sc.tax, ceiling: sc.ceiling, floor: sc.floor, monopoly: true });
        expect(m.dwl, sc.title + ' should lose surplus to market power').toBeGreaterThan(1);
      } else {
        expect((sc.floor || 0) + (sc.ceiling || 0) + (sc.tax || 0), sc.title).toBeGreaterThan(0);
        expect(o.dwl, sc.title + ' should bind').toBeGreaterThan(1);
      }
    }
    expect(E.SD_SCENARIOS.some((sc) => sc.ext > 0)).toBe(true);
    expect(E.SD_SCENARIOS.some((sc) => sc.ext < 0)).toBe(true);
    expect(SRC).not.toContain('E.SD_CASES[Math.floor(Math.random()');
  });

  it('does not reward always answering the same way', () => {
    const curves = { demand: 0, supply: 0, both: 0 }, dirs = { up: 0, down: 0 };
    for (const c of E.SD_CASES) {
      curves[E.sdPredict(c.ds, c.ss).curve]++;
      if (c.ds) dirs[c.ds > 0 ? 'up' : 'down']++;
      if (c.ss) dirs[c.ss > 0 ? 'up' : 'down']++;
    }
    expect(Math.abs(curves.demand - curves.supply)).toBeLessThanOrEqual(2);
    expect(curves.both).toBeGreaterThanOrEqual(4);
    expect(dirs.up).toBe(dirs.down);
  });
});

describe('business engine', () => {
  it('earns revenue as customers × price and never serves past capacity', () => {
    const rng = E.seeded(11);
    for (const tpl of E.BIZ_TEMPLATES) {
      for (let day = 1; day <= 30; day++) {
        const r = E.bizDay(tpl, { price: tpl.suggestedPrice * 1.1, staff: 1, marketing: 20 }, { rep: 70, day }, rng);
        expect(r.revenue).toBeCloseTo(r.customers * r.price, 1);
        expect(r.customers).toBeLessThanOrEqual(r.capacity);
        expect(r.customers + r.turnedAway).toBe(r.demand);
        expect(r.costs).toBeCloseTo(r.fixed + r.variable + r.staffCost + r.marketing, 1);
      }
    }
  });

  it('makes price a real experiment: a profitable middle, losses at the extremes', () => {
    for (const tpl of E.BIZ_TEMPLATES) {
      const at = (p) => E.bizExpected(tpl, {}, { rep: 50 }, p).profit;
      expect(at(tpl.suggestedPrice), tpl.id).toBeGreaterThan(0);
      expect(at(tpl.unitCost), tpl.id).toBeLessThan(0);
      expect(at(tpl.suggestedPrice * 2.5), tpl.id).toBeLessThan(at(tpl.suggestedPrice));
      // Fewer customers at higher prices (the demand curve slopes down).
      expect(E.bizExpected(tpl, {}, {}, tpl.suggestedPrice * 1.3).demand).toBeLessThan(E.bizExpected(tpl, {}, {}, tpl.suggestedPrice).demand);
    }
  });

  it('lets reputation settle where value and service put it, instead of climbing forever', () => {
    const tpl = E.BIZ_TEMPLATES.find((x) => x.id === 'tutoring');
    let rep = 50;
    for (let day = 1; day <= 120; day++) rep += E.bizDay(tpl, { price: tpl.suggestedPrice }, { rep, day }, E.seeded(day)).repDelta;
    expect(rep).toBeGreaterThan(60);
    expect(rep).toBeLessThan(80);
    // A shock fades back toward that level.
    let shocked = 20;
    for (let day = 1; day <= 60; day++) shocked += E.bizDay(tpl, { price: tpl.suggestedPrice }, { rep: shocked, day }, E.seeded(day)).repDelta;
    expect(Math.abs(shocked - rep)).toBeLessThan(5);
  });

  it('taxes business profit, not sales, and makes risky choices actually risky', () => {
    expect(E.bizEffectCash({ taxRecent: 0.15 }, 100, 1000).cash).toBe(-150);
    expect(E.bizEffectCash({ taxRecent: 0.15 }, 100, -500).cash).toBe(0);
    const win = E.bizEffectCash({ risk: { p: 0.6, win: 2, lose: -1 } }, 100, 0, () => 0.1);
    const lose = E.bizEffectCash({ risk: { p: 0.6, win: 2, lose: -1 } }, 100, 0, () => 0.9);
    expect([win.cash, lose.cash]).toEqual([200, -100]);
  });

  it('only uses event effect keys the business sim applies', () => {
    const KNOWN = new Set(['cash', 'cashX', 'reputation', 'quality', 'employees', 'unitCostPct', 'fixedPct', 'demandPct', 'risk', 'taxRecent']);
    for (const ev of E.BIZ_EVENTS) for (const c of ev.choices) for (const k of Object.keys(c.effect)) expect(KNOWN.has(k), ev.id + '.' + k).toBe(true);
  });
});

describe('stock engine', () => {
  it('moves prices locally, keeps them positive, and caps history', () => {
    let cos = E.classicMarket();
    const rng = E.seeded(5);
    for (let d = 0; d < 400; d++) cos = E.stockDay(cos, E.stockNewsPick(cos, rng), rng).companies;
    for (const c of cos) {
      expect(c.price).toBeGreaterThanOrEqual(1);
      expect(c.history.length).toBeLessThanOrEqual(30);
    }
  });

  it('names a real company in company-specific news and balances good and bad news', () => {
    const cos = E.classicMarket();
    const names = cos.map((c) => c.name);
    const rng = E.seeded(9);
    for (let i = 0; i < 200; i++) {
      const n = E.stockNewsPick(cos, rng);
      if (n && n.ticker) expect(names.some((nm) => n.headline.indexOf(nm) !== -1)).toBe(true);
      if (n) expect(n.headline).not.toContain('{name}');
    }
    // No sector gets a systematic push from the news deck.
    for (const sector of ['Energy', 'Technology', 'Healthcare', 'Consumer Staples', 'Financials']) {
      const sum = E.STOCK_NEWS.reduce((s, n) => s + E.sectorMove(n.sectors, sector), 0);
      expect(Math.abs(sum), sector).toBeLessThanOrEqual(0.01);
    }
  });
});

describe('macro missions', () => {
  // Replay the tool's OWN one-year step (as economicslab_model_integrity does),
  // with the noise pinned mid-range and the mission's scripted shocks.
  function macroStep() {
    const open = SRC.indexOf('var advanceYear = function () {');
    expect(open).toBeGreaterThan(-1);
    const body = SRC.slice(open, SRC.indexOf('unempNew = Math.round', open));
    const grab = (name) => new RegExp('var ' + name + ' = ([^;]+);').exec(body)[1];
    const strip = (x, k) => x.split(' + (shock ? shock.' + k + ' : 0)').join(' + SH.' + k).split('(mJitter() - 0.5)').join('0');
    // eslint-disable-next-line no-new-func
    return new Function('s', 'p', 'SH', `
      var mClamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
      var mSpend = p.spend, mTax = p.tax, mRate = p.rate, mNeutral = 3;
      var macroGDP = s.gdp, macroInflation = s.inf, macroUnemployment = s.unemp;
      var demandImpulse = ${grab('demandImpulse')};
      var gdpNew = ${strip(grab('gdpNew'), 'gdp')};
      var infNew = ${strip(grab('infNew'), 'inf')};
      var unempNew = ${strip(grab('unempNew'), 'unemp')};
      return { gdp: Math.round(gdpNew * 10) / 10, inf: Math.round(infNew * 10) / 10, unemp: Math.round(unempNew * 10) / 10 };`);
  }
  const OIL = { gdp: -1.2, inf: 2.0, unemp: 0.6 }, NONE = { gdp: 0, inf: 0, unemp: 0 };
  function play(id, policies) {
    const m = E.missionById(id), step = macroStep();
    let s = { gdp: m.start.gdp, inf: m.start.inf, unemp: m.start.unemp };
    const results = [];
    for (let y = 1; y <= m.years; y++) {
      const p = policies[Math.min(y - 1, policies.length - 1)];
      s = step(s, p, m.shocks && m.shocks[y] === 'oil' ? OIL : NONE);
      results.push(s);
      const ev = E.evaluateMission(m, results);
      if (ev.status !== 'active') return ev.status;
    }
    return E.evaluateMission(m, results).status;
  }
  const P = (rate, spend = 0, tax = 0) => ({ rate, spend, tax });

  it('judges policy by the REAL interest rate', () => {
    const step = macroStep();
    // Same 5% rate: loose when inflation is 13%, tight when inflation is 1%.
    const hot = step({ gdp: 2, inf: 13, unemp: 4 }, P(5), NONE);
    const cool = step({ gdp: 2, inf: 1, unemp: 4 }, P(5), NONE);
    expect(hot.gdp).toBeGreaterThan(2);
    expect(cool.gdp).toBeLessThan(2);
    // Neutral policy at the natural rate stays put: 2% growth, 2% inflation, 4% unemployment.
    const calm = step({ gdp: 2, inf: 2, unemp: 4 }, P(3), NONE);
    expect(calm).toEqual({ gdp: 2, inf: 2, unemp: 4 });
  });

  it('uses the oil shock the scripted missions name', () => {
    expect(SRC).toContain("mShockId === 'oil' ? MACRO_SHOCKS[0] : null");
    expect(SRC).toMatch(/var MACRO_SHOCKS = \[\s*\{ name: t\('stem\.economicslab\.shock_oil'/);
  });

  it('states each mission\'s starting numbers the way the mission sets them', () => {
    let checked = 0;
    for (const m of E.MACRO_MISSIONS) {
      const found = new RegExp("mission_" + m.id + "_brief_\\d+', '((?:[^'\\\\]|\\\\.)*)'").exec(SRC);
      expect(found, m.id + ' brief').toBeTruthy();
      const brief = found[1];
      const rate = /rates? (?:are|of) (?:about )?([\d.]+)%/i.exec(brief);
      if (rate) { expect(Number(rate[1]), m.id + ' rate').toBe(m.start.rate); checked++; }
      if (/rates are (?:already |still )?near zero/.test(brief)) { expect(m.start.rate, m.id + ' near zero').toBeLessThanOrEqual(0.5); checked++; }
      const inf = /Inflation is (\d+(?:\.\d+)?)%/.exec(brief);
      if (inf) { expect(Number(inf[1]), m.id + ' inflation').toBe(m.start.inf); checked++; }
      const un = /unemployment is (\d+(?:\.\d+)?)%/.exec(brief);
      if (un) { expect(Number(un[1]), m.id + ' unemployment').toBe(m.start.unemp); checked++; }
    }
    expect(checked).toBeGreaterThanOrEqual(7);
  });

  it('fails every mission when you do nothing', () => {
    for (const m of E.MACRO_MISSIONS) expect(play(m.id, [P(m.start.rate)]), m.id).toBe('lost');
  });

  it('can be won with a measured policy', () => {
    expect(play('volcker', [P(16), P(16), P(10)])).toBe('won');
    expect(play('recovery', [P(0, 2)])).toBe('won');
    expect(play('cooldown', [P(8)])).toBe('won');
    expect(play('oilshock', [P(4)])).toBe('won');
    expect(play('softlanding', [P(3.5)])).toBe('won');
  });

  it('has a natural rate: stimulus buys a temporary boom and lasting inflation, not faster growth forever', () => {
    const step = macroStep();
    const run = (s, pol, years) => { for (let i = 0; i < years; i++) s = step(s, typeof pol === 'function' ? pol(s) : pol, NONE); return s; };
    const start = { gdp: 2, inf: 2, unemp: 4 };
    // Spending +1 with the real rate held at neutral (rate = inflation + 1).
    const oneYear = run(start, (s) => P(s.inf + 1, 1), 1);
    const longRun = run(start, (s) => P(s.inf + 1, 1), 25);
    expect(oneYear.gdp).toBeGreaterThan(2.5);
    expect(Math.abs(longRun.gdp - 2)).toBeLessThanOrEqual(0.1);
    expect(longRun.inf).toBeGreaterThan(3);
    // Unemployment far above the natural rate drifts back down with neutral policy.
    const slump = run({ gdp: 2, inf: 2, unemp: 9.5 }, (s) => P(s.inf + 1), 10);
    expect(slump.unemp).toBeLessThan(8);
    expect(slump.unemp).toBeGreaterThan(4);
    // Pinning the rate at 0 does not buy lasting growth: inflation keeps climbing.
    const y4 = run(start, P(0), 4), y12 = run(start, P(0), 12);
    expect(y12.inf).toBeGreaterThan(y4.inf + 2);
    expect(Math.abs(y12.gdp - 2)).toBeLessThanOrEqual(0.1);
  });

  it('keeps Policy Inquiry consistent with the National Economy model and labels states honestly', () => {
    const iq = (lever) => {
      const html = render({ econTab: 'inquiry', policyIQ: Object.assign({ taxCut: 0, govSpend: 0, rateChange: 0, tariff: 0 }, lever) });
      const num = (label) => Number(new RegExp(label + '</div><div[^>]*>([+-]?[\\d.]+)').exec(html)[1]);
      const state = /rounded-full text-\[0\.625rem\] font-bold mb-2"[^>]*>([^<]+)</.exec(html)[1];
      return { gdp: num('ΔGDP'), inf: num('ΔInflation'), state };
    };
    // Same first-year response as advanceYear from a 2/2/4 steady state.
    const step = macroStep(), calm = { gdp: 2, inf: 2, unemp: 4 };
    const spend = step(calm, P(3, 1), NONE), hike = step(calm, P(4), NONE);
    expect(iq({ govSpend: 1 }).gdp).toBeCloseTo(spend.gdp - 2, 1);
    expect(iq({ rateChange: 1 }).gdp).toBeCloseTo(hike.gdp - 2, 1);
    expect(iq({ rateChange: 1 }).inf).toBeCloseTo(hike.inf - 2, 1);
    // A big tariff is stagflation, not "recession"; a big spending boom is not "mild".
    expect(iq({ tariff: 10 }).state).toBe('Stagflation');
    expect(iq({ tariff: 25 }).state).toBe('Stagflation');
    expect(iq({ tariff: 25 }).inf).toBeLessThan(4);
    expect(iq({ govSpend: 5 }).state).toBe('Overheating');
    expect(iq({ rateChange: 1 }).state).toBe('Slowdown');
    expect(iq({}).state).toBe('Mild / mixed');
  });

  it('punishes overdoing it', () => {
    expect(play('volcker', [P(18)])).toBe('lost');
    expect(play('cooldown', [P(12)])).toBe('lost');
    expect(play('recovery', [P(0, 3, -3)])).toBe('lost');
    expect(play('oilshock', [P(8)])).toBe('lost');
    expect(play('oilshock', [P(2)])).toBe('lost');
    // Easing before inflation is beaten fails too.
    expect(play('cooldown', [P(8), P(5)])).toBe('lost');
  });
});

// ── 2. Renders ─────────────────────────────────────────────────────────────

describe('renders without AI', () => {
  it('offers every sim a built-in path when callGemini is null', () => {
    const pf = render({ econTab: 'personalFinance' });
    expect(pf).toContain('Built-in decks (AI off)');
    expect(pf).toMatch(/<button[^>]*>✨ Next Year/);
    expect(render({ econTab: 'stockMarket' })).toContain('Open the classic market');
    const biz = render({ econTab: 'entrepreneur' });
    for (const tpl of E.BIZ_TEMPLATES) expect(biz).toContain(tpl.businessName.replace(/&/g, '&amp;'));
    expect(render({ showQuiz: true })).toContain('Open the Challenge deck');
  });

  it('ignores a loading flag saved by an older version', () => {
    const stale = render({ econTab: 'personalFinance', pfLoading: true });
    expect(stale).not.toMatch(/<button[^>]*disabled=""[^>]*>⏳/);
    expect(stale).toContain('Next Year');
  });

  it('reads saved zeros as zeros, not as the defaults', () => {
    expect(render({ econTab: 'personalFinance', pfCash: 0 })).toContain('Net Worth: $0');
    expect(render({ econTab: 'macro', macroGDP: 0 })).toContain('GDP 0.0%');
    const sm = render({
      econTab: 'stockMarket', smCash: 0, smDay: 2, smPortfolio: { AAA: 100 }, smBaseline: { AAA: 100 },
      smCompanies: [{ name: 'Alpha', ticker: 'AAA', price: 100, history: [100, 100], sector: 'Tech', color: '#3b82f6' }]
    });
    expect(sm).toContain('Total: $10000.00');
  });

  it('explains a two-shift case honestly instead of stating both one-shift results', () => {
    const html = render({ sdDemandShift: 3, sdSupplyShift: 2 });
    expect(html).toContain('could go either way');
    expect(html).not.toContain('This raises both equilibrium price AND quantity');
  });

  it('scores surplus and deadweight loss on the S&D tab', () => {
    const free = render({});
    expect(free).toContain('data-economicslab-welfare="true"');
    expect(free).toMatch(/data-welfare-tile="dwl"[^]*?\$0</);
    const ceiling = render({ sdPriceCeiling: 30 });
    expect(ceiling).toMatch(/data-welfare-tile="dwl"[^]*?\$500</);
    expect(ceiling).toContain('Deadweight loss $500');
  });

  it('counts achievements against the real list and shows the locked ones', () => {
    const html = render({ showAchievements: true });
    const total = (html.match(/data-econ-ach="/g) || []).length;
    expect(total).toBeGreaterThanOrEqual(29);
    expect(html).toContain('0/' + total + ' achievements');
    expect(html).toContain('data-earned="false"');
  });

  it('survives hostile saved state on every tab', () => {
    const junk = ['abc', 9999, -1, {}, [], null, 0, true];
    const keys = ['pfCash', 'pfSalary', 'pfHistory', 'pfLastYear', 'lifeEvent', 'pfGoal', 'pfFood', 'smCompanies', 'smPortfolio', 'smCost', 'smNewsEvent', 'enBusiness', 'enBizHistory', 'enBizEvent', 'enBizPrice', 'sdDet', 'sdScenario', 'macroMission', 'macroHistory', 'macroReport', 'quizQuestion', 'advisorAnswer', 'econGlossary', 'sdExt', 'sdTax', 'sdShowRevenue', 'macroChart', 'macroMissionWins', 'progressNote', 'econAchEarned', 'quizScore', 'quizTotal', 'tradeScenId', 'tradeSeed', 'tradeHA0', 'tradeHB0', 'tradeHA1', 'tradeHB1', 'tradeFrom', 'tradePrice', 'tradeQty', 'tradePred', 'tradeWins', 'tradePredStats', 'policyIQ', 'pwGame', 'pwStats', 'sdMonopoly', 'macroAutopilot', 'ccBal', 'ccApr', 'ccPay', 'ccGuess', 'ccPick', 'ccGuessFor', 'ccWon'];
    for (const tab of ['supplyDemand', 'trade', 'personalFinance', 'stockMarket', 'entrepreneur', 'macro', 'inquiry']) {
      for (const v of junk) {
        const state = { econTab: tab, showAchievements: true, showQuiz: true, showAdvisor: true, showGlossary: true, showProgress: true, progressShowText: true };
        for (const k of keys) state[k] = v;
        expect(() => render(state), tab + ' ' + JSON.stringify(v)).not.toThrow();
      }
    }
  });
});

describe('market failure lab and revenue view', () => {
  it('overproduces a polluting good, and a tax equal to the harm fixes it', () => {
    const free = E.sdOutcome({ ext: 20 });
    expect(free.q).toBeCloseTo(50, 6);
    expect(free.qSoc).toBeCloseTo(37.5, 6);
    expect(free.socialDwl).toBeCloseTo(125, 6);
    expect(free.atSocial).toBe(false);
    const pigou = E.sdOutcome({ ext: 20, tax: 20 });
    expect(pigou.q).toBeCloseTo(37.5, 6);
    expect(pigou.socialDwl).toBeCloseTo(0, 6);
    expect(pigou.atSocial).toBe(true);
    // Half the tax gets part of the way; double the tax overshoots.
    expect(E.sdOutcome({ ext: 20, tax: 10 }).socialDwl).toBeCloseTo(31.25, 6);
    expect(E.sdOutcome({ ext: 20, tax: 40 }).socialDwl).toBeCloseTo(125, 6);
  });

  it('underproduces a good with outside benefits; a matching subsidy fixes it and costs the government', () => {
    const free = E.sdOutcome({ ext: -16 });
    expect(free.qSoc).toBeCloseTo(60, 6);
    expect(free.socialDwl).toBeCloseTo(80, 6);
    const sub = E.sdOutcome({ ext: -16, tax: -16 });
    expect(sub.regime).toBe('subsidy');
    expect(sub.q).toBeCloseTo(60, 6);
    expect(sub.socialDwl).toBeCloseTo(0, 6);
    expect(sub.gov).toBeCloseTo(-16 * 60, 6);
    expect(sub.pp - sub.pc).toBeCloseTo(16, 6);
  });

  it('charges a deadweight loss for a subsidy nobody needed', () => {
    const s = E.sdOutcome({ tax: -10 });
    expect(s.q).toBeGreaterThan(s.qStar);
    expect(s.dwl).toBeCloseTo(31.25, 6);
    expect(s.socialDwl).toBeCloseTo(31.25, 6);
  });

  it('erases the social loss with the Pigouvian tax for every externality and slope, and the books add up', () => {
    for (const dSlope of [0.3, 0.8, 1.5]) for (const sSlope of [0.3, 1.5]) for (let X = -20; X <= 30; X += 5) {
      const label = [dSlope, sSlope, X].join('/');
      const o = E.sdOutcome({ ext: X, tax: X, dSlope, sSlope });
      expect(o.socialDwl, label).toBeLessThan(1e-6);
      expect(o.socialTotal, label).toBeCloseTo(o.cs + o.ps + o.gov + o.external, 6);
      expect(o.socialTotal, label).toBeCloseTo(o.socialBest, 6);
      if (X !== 0) expect(E.sdOutcome({ ext: X, dSlope, sSlope }).socialDwl, label).toBeGreaterThan(0);
    }
  });

  it('does not call a small externality fixed when nothing was done', () => {
    const o = E.sdOutcome({ ext: 1 });
    // Under a dollar of loss, which is why a dollar tolerance said "Fixed!".
    expect(o.socialDwl).toBeLessThan(1);
    expect(o.atSocial).toBe(false);
    expect(render({ sdExt: 1 })).not.toContain('Fixed! Social deadweight loss is $0.');
    expect(render({ sdExt: 1, sdTax: 1 })).toContain('Fixed! Social deadweight loss is $0.');
  });

  it('awards Market Fixer only for a tax or subsidy that reaches the social optimum', () => {
    const earned = (state) => {
      const m = render(Object.assign({ showAchievements: true }, state)).match(/data-econ-ach="market_fixer" data-earned="(\w+)"/);
      return m && m[1];
    };
    expect(earned({ sdExt: 20, sdTax: 20 })).toBe('true');
    expect(earned({ sdExt: -15, sdTax: -15 })).toBe('true');
    expect(earned({ sdExt: 20, sdTax: 19 })).toBe('false');
    expect(earned({ sdExt: 1 })).toBe('false');
    expect(earned({ sdTax: 5 })).toBe('false');
  });

  it('reads elasticity and the $1 price test the same way', () => {
    const panel = (state) => { const html = render(state); const i = html.indexOf('data-economicslab-revenue'); return html.slice(i, i + 2500); };
    // Default: P = 50, Q = 50, |Ed| = 50 / (0.8 * 50) = 1.25.
    const elastic = panel({});
    expect(elastic).toContain('Demand elasticity here is 1.25');
    expect(elastic).toContain('ELASTIC, so raising the price loses revenue.');
    expect(elastic).toContain('FALL to');
    // Steep demand, flat supply: P = 23.33, Q = 44.44, |Ed| = 0.35.
    const inelastic = panel({ sdDemSlope: 1.5, sdSupSlope: 0.3 });
    expect(inelastic).toContain('Demand elasticity here is 0.35');
    expect(inelastic).toContain('INELASTIC, so raising the price gains revenue.');
    expect(inelastic).toContain('RISE to');
  });
});

describe('S&D text agrees with the model when policies combine', () => {
  const summary = (state) => { const html = render(state); const i = html.indexOf('data-economicslab-canvas-summary'); return html.slice(i, i + 3000); };
  const panel = (state, attr) => { const html = render(state); const i = html.indexOf(attr); return html.slice(i, i + 2500); };

  it('makes the elasticity scenarios show what their lessons say', () => {
    const byTitle = (t) => E.SD_SCENARIOS.find((s) => s.title === t);
    const run = (sc) => {
      const base = E.sdOutcome({ dShift: sc.dShift, sShift: sc.sShift, dSlope: sc.dSlope, sSlope: sc.sSlope });
      const taxed = E.sdOutcome({ dShift: sc.dShift, sShift: sc.sShift, dSlope: sc.dSlope, sSlope: sc.sSlope, tax: sc.tax });
      return { fall: 1 - taxed.q / base.q, buyerShare: (taxed.pc - base.pStar) / sc.tax, elas: base.pStar / (base.md * base.qStar) };
    };
    const cig = run(byTitle('A cigarette tax')), boat = run(byTitle('A luxury boat tax'));
    expect(cig.elas).toBeLessThan(1);
    expect(boat.elas).toBeGreaterThan(1);
    expect(cig.buyerShare).toBeGreaterThan(0.5);
    expect(boat.buyerShare).toBeLessThan(0.5);
    // The whole point of the pair: quantity falls by a smaller share when demand is inelastic.
    expect(cig.fall).toBeLessThan(boat.fall - 0.05);
  });

  it('keeps the graph labels from piling on top of each other on a phone-width canvas', () => {
    reload();
    const draw = window.StemLab._registry[TOOL]._drawSD;
    const boxes = [];
    const ctx = new Proxy({}, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return (s) => ({ width: String(s).length * (parseFloat(/(\d+)px/.exec(target.font || '20px')[1]) * 0.55) });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (prop === 'fillText') return (text, x, y) => {
          const fs = parseFloat(/(\d+)px/.exec(target.font || '20px')[1]), w = String(text).length * fs * 0.55;
          const l = target.textAlign === 'center' ? x - w / 2 : x;
          boxes.push({ text: String(text), l, r: l + w, t: y - fs, b: y + fs * 0.3 });
        };
        return () => {};
      },
      set(target, prop, v) { target[prop] = v; return true; },
      deleteProperty(target, prop) { delete target[prop]; return true; }
    });
    // A busy graph at phone width: tax, pollution, revenue view.
    draw(ctx, 700, 500, { dShift: 0, sShift: 0, dSlope: 0.8, sSlope: 0.8, tax: 10, ext: 20, showRev: true });
    const labels = boxes.filter((b) => !/^\d+$/.test(b.text) && b.text !== 'Price ($)' && b.text !== 'Quantity');
    expect(labels.length).toBeGreaterThan(5);
    const clash = [];
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], c = labels[j];
      if (a.l < c.r && a.r > c.l && a.t < c.b && a.b > c.t) clash.push(a.text + ' / ' + c.text);
    }
    expect(clash).toEqual([]);
    for (const b of labels) expect(b.r, b.text).toBeLessThanOrEqual(700);
  });

  it('explains a subsidy as a subsidy', () => {
    const html = render({ sdTax: -20 });
    expect(html).toContain('The subsidy splits the market the other way');
    expect(html).not.toContain('The tax splits the market');
  });

  it('reports shortages and surpluses only where sdOutcome says a control binds', () => {
    // A $20 subsidy already pushes the buyer price to $40, so a $45 ceiling does not bind.
    expect(E.sdOutcome({ tax: -20, ceiling: 45 }).regime).toBe('subsidy');
    expect(summary({ sdTax: -20, sdPriceCeiling: 45 })).not.toContain('Binding price ceiling');
    // A $20 tax lifts the buyer price to $60, so a $45 ceiling binds: Qd 56.25, Qs 18.75.
    const tc = summary({ sdTax: 20, sdPriceCeiling: 45 });
    expect(tc).toContain('shortage of about 38 units');
    expect(tc).toContain('cuts trades to about 19 units');
    // ...and a $55 floor sits below that $60, so it does not bind.
    expect(summary({ sdTax: 20, sdPriceFloor: 55 })).not.toContain('Binding price floor');
    // Ceiling and floor together: the model applies the ceiling only.
    const both = summary({ sdPriceCeiling: 30, sdPriceFloor: 70 });
    expect(both).toContain('Binding price ceiling');
    expect(both).not.toContain('Binding price floor');
  });

  it('reads elasticity on the demand curve and admits when a ceiling breaks the $1 test', () => {
    const ceil = panel({ sdPriceCeiling: 30 }, 'data-economicslab-revenue');
    expect(ceil).toContain('Demand elasticity here is 0.50');
    expect(ceil).toContain('INELASTIC');
    expect(ceil).toContain('The ceiling is binding');
    expect(ceil).not.toContain('If the price rose $1');
    const tax = panel({ sdTax: 20 }, 'data-economicslab-revenue');
    expect(tax).toContain('Buyers spend $60 × 37.5 = $2,250; sellers get $40 × 37.5 = $1,500 (the rest is tax).');
    const sub = panel({ sdTax: -20 }, 'data-economicslab-revenue');
    expect(sub).toContain('sellers get $60 × 62.5 = $3,750 (the government pays the difference).');
  });

  it('does not call a Pigouvian tax a deadweight loss', () => {
    const html = render({ sdExt: 20, sdTax: 20 });
    expect(html).toContain('the tax can SHRINK the loss to society');
    expect(html).not.toContain('Some trades both sides wanted stop happening');
    expect(render({ sdTax: 20 })).toContain('Some trades both sides wanted stop happening');
    expect(render({ sdTax: 20, sdPriceCeiling: 45 })).toContain('A price control is also binding');
  });

  it('gives Pigouvian credit only to a tax or subsidy, not to a price control', () => {
    const earned = (state) => render(Object.assign({ showAchievements: true }, state)).match(/data-econ-ach="market_fixer" data-earned="(\w+)"/)[1];
    // $5 tax + $45 ceiling happens to land on S* = 37.5, but the ceiling did the work.
    expect(E.sdOutcome({ ext: 20, tax: 5, ceiling: 45 }).atSocial).toBe(true);
    expect(earned({ sdExt: 20, sdTax: 5, sdPriceCeiling: 45 })).toBe('false');
    const ceilingOnly = render({ sdExt: 20, sdPriceCeiling: 40 });
    expect(ceilingOnly).toContain('a price control got it there, not a Pigouvian tax');
    expect(ceilingOnly).toContain('but a price control did it');
    expect(ceilingOnly).not.toContain('Fixed! Social deadweight loss is $0.');
  });
});

describe('market power (one seller)', () => {
  it('produces where MR = MC and prices off the demand curve, for any curves', () => {
    for (const dSlope of [0.3, 0.8, 1.5]) for (const sSlope of [0.3, 0.8, 1.5]) for (const dShift of [-3, 0, 3]) {
      const label = [dSlope, sSlope, dShift].join('/');
      const m = E.sdOutcome({ dSlope, sSlope, dShift, monopoly: true });
      const c = E.sdOutcome({ dSlope, sSlope, dShift });
      const mr = m.ad - 2 * m.md * m.q, mc = m.as + m.ms * m.q;
      expect(mr, label).toBeCloseTo(mc, 9);
      expect(m.pc, label).toBeCloseTo(m.ad - m.md * m.q, 9);
      expect(m.regime).toBe('monopoly');
      // Less output, a higher price, more profit, less for buyers, and a deadweight loss.
      expect(m.q, label).toBeLessThan(c.q);
      expect(m.pc, label).toBeGreaterThan(c.pc);
      expect(m.ps, label).toBeGreaterThan(c.ps);
      expect(m.cs, label).toBeLessThan(c.cs);
      expect(m.dwl, label).toBeCloseTo((c.q - m.q) * (m.pc - mc) / 2, 6);
    }
    const base = E.sdOutcome({ monopoly: true });
    expect(base.q).toBeCloseTo(100 / 3, 6);
    expect(base.pc).toBeCloseTo(190 / 3, 6);
  });

  it('does not teach the competitive Pigouvian rule to a polluting monopolist', () => {
    // A monopolist that pollutes $20/unit still makes LESS than is best (33 vs 37.5),
    // so a $20 tax makes society worse off (Buchanan, 1969).
    const none = E.sdOutcome({ monopoly: true, ext: 20 }), full = E.sdOutcome({ monopoly: true, ext: 20, tax: 20 });
    expect(none.q).toBeLessThan(none.qSoc);
    expect(full.socialDwl).toBeGreaterThan(none.socialDwl);
    const html = render({ sdMonopoly: true, sdExt: 20 });
    expect(html).toContain('Here the market makes LESS than is best for society');
    const taxed = render({ sdMonopoly: true, sdExt: 20, sdTax: 20 });
    expect(taxed).toContain('a tax equal to the harm overshoots');
    expect(taxed).not.toContain('the tax can SHRINK the loss');
    // A subsidy that happens to zero the loss is not called Pigouvian, and earns no Market Fixer.
    const sub = render({ sdMonopoly: true, sdExt: 20, sdTax: -10, showAchievements: true });
    expect(E.sdOutcome({ monopoly: true, ext: 20, tax: -10 }).atSocial).toBe(true);
    expect(sub).not.toContain('Economists call this a Pigouvian tax');
    expect(sub).toContain('assumes many sellers');
    expect(sub.match(/data-econ-ach="market_fixer" data-earned="(\w+)"/)[1]).toBe('false');
  });

  it('splits a tax on a monopolist from its own price, and tells the subsidy story right', () => {
    // Monopoly price $63.33 → $66.67 with a $10 tax: buyers bear 1/3.
    const monoTax = render({ sdMonopoly: true, sdTax: 10 });
    expect(monoTax).toContain('With one seller, buyers bear ~33% of it');
    expect(monoTax).not.toContain('undefined');
    expect(render({ sdMonopoly: true, sdTax: -10 })).toContain('a subsidy can SHRINK the monopoly’s deadweight loss');
    // A floor on a monopolist leaves nothing unsold, and both sides lose.
    const floor = render({ sdMonopoly: true, sdPriceFloor: 70 });
    expect(floor).not.toContain('Binding price floor');
    expect(floor).toContain('A floor above the monopoly price');
    // Under a cap between the competitive and monopoly prices, buyers (not sellers) limit sales.
    const cap = render({ sdMonopoly: true, sdPriceCeiling: 55 });
    expect(cap).toContain('If the price rose $1');
    expect(cap).not.toContain('sellers (not buyers) limit');
  });

  it('lets a price ceiling raise a monopolist’s output, all the way to the competitive amount', () => {
    const m = E.sdOutcome({ monopoly: true });
    const cap55 = E.sdOutcome({ monopoly: true, ceiling: 55 });
    const cap50 = E.sdOutcome({ monopoly: true, ceiling: 50 });
    const cap40 = E.sdOutcome({ monopoly: true, ceiling: 40 });
    expect(cap55.q).toBeGreaterThan(m.q);
    expect(cap55.dwl).toBeLessThan(m.dwl);
    expect(cap50.q).toBeCloseTo(50, 9);
    expect(cap50.dwl).toBeCloseTo(0, 9);
    expect(cap50.atCompetitive).toBe(true);
    // Below the competitive price the cap bites into supply: a shortage, and less output again.
    expect(cap40.q).toBeLessThan(50);
    expect(cap40.qd - cap40.qs).toBeGreaterThan(0);
    // The same $55 cap does not bind at all in a competitive market.
    expect(E.sdOutcome({ ceiling: 55 }).regime).toBe('free');
  });

  it('explains the monopoly, draws MR, and awards Trustbuster only for the right ceiling', () => {
    const html = render({ sdMonopoly: true });
    expect(html).toContain('A single seller produces where marginal revenue equals marginal cost: Q 33.3 at $63');
    expect(html).toContain('Challenge: set a price ceiling that makes the monopolist sell the competitive amount, 50 units');
    const earned = (state) => render(Object.assign({ showAchievements: true }, state)).match(/data-econ-ach="trustbuster" data-earned="(\w+)"/)[1];
    expect(earned({ sdMonopoly: true, sdPriceCeiling: 50 })).toBe('true');
    expect(earned({ sdMonopoly: true, sdPriceCeiling: 55 })).toBe('false');
    expect(earned({ sdMonopoly: true })).toBe('false');
    expect(earned({ sdPriceCeiling: 50 })).toBe('false');
    expect(render({ sdMonopoly: true, sdPriceCeiling: 50 })).toContain('Your price ceiling makes the monopolist sell the competitive amount');
    // The graph shows the MR curve, the monopoly point, and MC in place of S.
    reload();
    const texts = [];
    const ctx = new Proxy({}, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return (s) => ({ width: String(s).length * 10 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (prop === 'fillText') return (t) => texts.push(String(t));
        return () => {};
      },
      set(target, prop, v) { target[prop] = v; return true; },
      deleteProperty(target, prop) { delete target[prop]; return true; }
    });
    window.StemLab._registry[TOOL]._drawSD(ctx, 1800, 500, { dShift: 0, sShift: 0, dSlope: 0.8, sSlope: 0.8, monopoly: true });
    expect(texts).toContain('MR');
    expect(texts).toContain('MC');
    expect(texts).toContain('M: one seller charges $63');
    expect(texts).toContain('MR = MC at Q 33');
    expect(texts).toContain('E (if competitive)');
    texts.length = 0;
    window.StemLab._registry[TOOL]._drawSD(ctx, 1800, 500, { dShift: 0, sShift: 0, dSlope: 0.8, sSlope: 0.8, monopoly: true, tax: -10 });
    // 90 / 2.4 = 37.4999... in floating point, so it prints 37.
    expect(texts).toContain('Subsidy $10: trades rise 33 → 37');
    expect(texts).toContain('MR = MC − subsidy at Q 37');
    // The ceiling challenge is winnable on curves whose competitive price is not a whole dollar.
    const odd = E.sdOutcome({ monopoly: true, dSlope: 0.5, sSlope: 0.6, ceiling: 54 });
    expect(odd.atCompetitive).toBe(true);
  });
});

describe('credit card payoff race', () => {
  it('matches the loan formula for fixed payments and flags payments that never catch up', () => {
    const r = 0.22 / 12;
    for (const pay of [75, 100, 150, 200, 300, 500]) {
      const f = E.cardPayoff({ balance: 3000, apr: 22, rule: 'fixed', payment: pay });
      // Months to repay B at payment P: n = -ln(1 - rB/P) / ln(1 + r), rounded up.
      expect(f.months, 'payment ' + pay).toBe(Math.ceil(-Math.log(1 - r * 3000 / pay) / Math.log(1 + r) - 1e-9));
      expect(f.paid - f.interest).toBeCloseTo(3000, 6);
      expect(f.path[f.path.length - 1]).toBe(0);
    }
    // Bigger payments: sooner and cheaper, every time.
    const plans = [100, 150, 200, 300].map((p) => E.cardPayoff({ balance: 3000, apr: 22, rule: 'fixed', payment: p }));
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].months).toBeLessThan(plans[i - 1].months);
      expect(plans[i].interest).toBeLessThan(plans[i - 1].interest);
    }
    // $50 does not cover the $55 of monthly interest on $3,000 at 22%.
    expect(E.cardPayoff({ balance: 3000, apr: 22, rule: 'fixed', payment: 50 }).never).toBe(true);
  });

  it('shows the minimum-payment trap: about 15 years and more interest than the debt', () => {
    const m = E.cardPayoff({ balance: 3000, apr: 22, rule: 'minimum' });
    expect(m.months).toBe(180);
    expect(m.interest).toBeGreaterThan(3000);
    expect(m.firstPayment).toBeCloseTo(3000 * 0.22 / 12 + 30, 6);
    // The minimum never drops below $25 until the last payment.
    expect(E.cardMinPayment(500, 0.22 / 12)).toBe(25);
    expect(E.cardMinPayment(10, 0.22 / 12)).toBeCloseTo(10 * (1 + 0.22 / 12), 9);
  });
});

describe('price war (repeated prisoner’s dilemma)', () => {
  it('pays like a prisoner’s dilemma: cutting wins any single day, holding together wins over time', () => {
    const p = E.PRICE_WAR.pay, T = p.LH[0], R = p.HH[0], P = p.LL[0], S = p.HL[0];
    expect(T).toBeGreaterThan(R);
    expect(R).toBeGreaterThan(P);
    expect(P).toBeGreaterThan(S);
    expect(2 * R).toBeGreaterThan(T + S);
    // Symmetric table: the rival's side mirrors yours.
    expect([p.HL[1], p.LH[1], p.HH[1], p.LL[1]]).toEqual([T, S, R, P]);
  });

  it('gives each hidden rival the behaviour its description promises', () => {
    const run = (rival, moves, seed) => moves.reduce((h, m) => E.pwPlay({ rival, seed, history: h }, m), []);
    const mirror = run('mirror', ['H', 'L', 'H', 'L', 'L']);
    expect(mirror.map((r) => r.rival).join('')).toBe('HHLHL');
    const grudge = run('grudge', ['H', 'H', 'L', 'H', 'H']);
    expect(grudge.map((r) => r.rival).join('')).toBe('HHHLL');
    expect(run('cutthroat', ['H', 'H', 'H']).every((r) => r.rival === 'L')).toBe(true);
    expect(run('friendly', ['L', 'L', 'L']).every((r) => r.rival === 'H')).toBe(true);
    // The coin is random but repeatable for the same game, and not stuck on one side.
    const coinA = run('coin', Array(10).fill('H'), 42).map((r) => r.rival).join('');
    expect(run('coin', Array(10).fill('H'), 42).map((r) => r.rival).join('')).toBe(coinA);
    expect(coinA).toMatch(/H/);
    expect(coinA).toMatch(/L/);
    let same = 0, pairs = 0; const seqs = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      const seq = run('coin', Array(10).fill('H'), seed).map((r) => r.rival).join('');
      seqs.add(seq);
      for (let i = 1; i < 10; i++) { pairs++; if (seq[i] === seq[i - 1]) same++; }
    }
    expect(same / pairs).toBeGreaterThan(0.4);
    expect(same / pairs).toBeLessThan(0.6);
    expect(seqs.size).toBeGreaterThan(200);
    // Totals come from the moves, not from numbers a saved file claims.
    expect(E.pwTotals([{ you: 'H', rival: 'H', youEarn: 1e9, rivalEarn: -50 }])).toEqual({ you: 60, rival: 60 });
    // Payoffs follow the table, and the best plan depends on the rival.
    expect(E.pwTotals(run('mirror', Array(10).fill('H'))).you).toBe(600);
    expect(E.pwTotals(run('mirror', Array(10).fill('L'))).you).toBe(90 + 9 * 30);
    expect(E.pwTotals(run('cutthroat', Array(10).fill('L'))).you).toBe(300);
    expect(E.pwTotals(run('cutthroat', Array(10).fill('H'))).you).toBe(100);
  });
});

describe('dark mode', () => {
  it('gives every coloured text and pale panel class the tool uses a dark-mode colour', () => {
    // In the host's dark theme the tool sits in a .theme-dark wrapper with dark
    // --allo-stem-* colours; the tool's own stylesheet must darken pale panels and
    // lighten coloured text, or dark shades land on dark panels (54 such cases once).
    const cssStart = SRC.indexOf("'.economicslab-tool-shell{");
    const cssEnd = SRC.indexOf("].join('')", cssStart);
    expect(cssStart).toBeGreaterThan(-1);
    const css = SRC.slice(cssStart, cssEnd);
    const code = SRC.slice(0, cssStart) + SRC.slice(cssEnd);
    const used = (re) => Array.from(new Set(code.match(re) || []));
    const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const panelOk = (c) => new RegExp('\\.economicslab-tool-shell \\.' + esc(c) + '[,{]').test(css);
    const textOk = (c) => new RegExp('\\.theme-dark \\.economicslab-tool-shell \\.' + esc(c) + '[,{]').test(css);
    // Slate text follows the --eco-text variables, so it is excluded here.
    expect(used(/\bbg-[a-z]+-(?:50|100|200)\b/g).filter((c) => !panelOk(c))).toEqual([]);
    expect(used(/\btext-(?!slate-)[a-z]+-(?:500|600|700|800|900|950)\b/g).filter((c) => !textOk(c))).toEqual([]);
  });

  it('colours the welfare tile labels for the theme they are shown in', () => {
    const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
    const labelColour = (dark) => {
      reload();
      const cfg = window.StemLab._registry[TOOL];
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = ReactDOMClient.createRoot(host);
      act(() => { root.render(cfg.render(makeCtx({ toolData: {}, setToolData: () => {}, callGemini: null, isDark: dark, theme: dark ? 'dark' : 'light' }))); });
      const c = host.querySelector('[data-welfare-tile="cs"] div').style.color;
      act(() => root.unmount()); host.remove();
      return c;
    };
    // Tiles sit on the tool surface, which is dark in dark mode: light ink there, dark ink in light mode.
    expect(labelColour(true)).toBe('rgb(147, 197, 253)');
    expect(labelColour(false)).toBe('rgb(29, 78, 216)');
  });
});

describe('reference shelf content', () => {
  it('gives the Challenge deck no answer-length cue', () => {
    const open = SRC.indexOf('var ECON_SCENARIOS = [');
    expect(open).toBeGreaterThan(-1);
    const block = SRC.slice(open, SRC.indexOf('];', open) + 1).replace('var ECON_SCENARIOS = ', '');
    // eslint-disable-next-line no-new-func
    const deck = new Function('t', 'return ' + block)((k, f) => f);
    expect(deck.length).toBeGreaterThanOrEqual(10);
    // Rank of the key's length among its options (1 = longest, ties share the top rank).
    const ranks = deck.map((q) => 1 + q.options.filter((o) => o.length > q.options[q.correct].length).length);
    for (const r of [1, 2, 3, 4]) {
      const share = ranks.filter((x) => x === r).length / deck.length;
      expect(share, 'length rank ' + r + ' (' + ranks.join(',') + ')').toBeLessThanOrEqual(0.4);
    }
  });

  it('keeps the chosen concept open when the category filter changes', () => {
    const all = render({ showConceptLib: true, econConceptId: 'gdp' });
    const macro = render({ showConceptLib: true, econConceptId: 'gdp', econConceptFilter: 'macro' });
    // The open card's header is the button: aria-expanded="true", named by its own text.
    const openCard = (html) => /role="button" tabindex="0" aria-expanded="true"[^>]*>(?:<[^>]+>)*[^<]*<\/span><span[^>]*>([^<]+)</.exec(html);
    expect(openCard(all)[1]).toBe('GDP');
    expect(openCard(macro)[1]).toBe('GDP');
  });

  it('splits take-home pay, not gross pay, in the budget rules', () => {
    const takeHome = Math.round(E.pfBudget({}).takeHome);
    const html = render({ showBudgetRules: true });
    expect(html).toContain('Applied to your take-home pay of $' + takeHome.toLocaleString() + '/mo');
    expect(html).toContain('$' + Math.round(takeHome * 0.5).toLocaleString() + '/mo');
  });

  it('counts the Detective cases the quiz note promises at each difficulty', () => {
    for (const [lvl, n] of [['easy', 1], ['medium', 2], ['hard', 3]]) {
      const count = E.SD_CASES.filter((c) => c.level <= n).length;
      expect(render({ showQuiz: true, econDifficulty: lvl })).toContain('has ' + count + ' more at this difficulty');
    }
  });
});

// These tests search every slider setting; give them room when the machine is busy.
describe('Trade Lab: comparative advantage', { timeout: 60000 }, () => {
  const sc = (id) => E.tradeScenario(id);
  // Every deal a student can reach with the sliders (whole hours, 0.05 price steps, whole units).
  function deals(s, fn) {
    const c = E.tradeCompare(s), H = s.hours, max = Math.max(4, Math.ceil(c.hi * 1.5));
    for (let h1 = 0; h1 <= H; h1++) for (let h2 = 0; h2 <= H; h2++) for (const from of ['a', 'b'])
      for (let k = 0; 0.1 + k * 0.05 <= max + 1e-9; k++) for (let q = 1; q <= 60; q += 1) {
        const price = Math.round((0.1 + k * 0.05) * 100) / 100;
        if (fn(E.tradeOutcome(s, { hoursA1: h1, hoursB1: h2, xFrom: from, price, qty: q }), { h1, h2, from, price, q }) === false) return;
      }
  }

  it('decides comparative advantage by opportunity cost, not by who is faster', () => {
    const both = E.tradeCompare(sc('better_at_both'));
    expect([both.absX, both.absY]).toEqual(['a', 'a']);
    expect(both.xMaker).toBe('a');
    expect(both.ocYb).toBeLessThan(both.ocYa);
    const countries = E.tradeCompare(sc('countries'));
    expect([countries.absX, countries.absY]).toEqual(['b', 'b']);
    expect(countries.xMaker).toBe('a');
    expect(countries.ocXa).toBeCloseTo(1 / 3, 9);
    expect(countries.ocXb).toBeCloseTo(0.5, 9);
  });

  it('lets both sides gain only when the low-cost producer sells at a price between the two costs', () => {
    for (const id of ['island', 'better_at_both', 'countries']) {
      const s = sc(id), c = E.tradeCompare(s);
      let wins = 0, bad = 0;
      deals(s, (o, p) => {
        if (!o.bothGain) return;
        wins++;
        if (!(p.price > c.lo && p.price < c.hi) || p.from !== c.xMaker || !o.priceOk) bad++;
        // Gaining means ending up OUTSIDE your own frontier.
        if (!o.beyondA || !o.beyondB) bad++;
      });
      expect(bad, id).toBe(0);
      expect(wins, id + ' has a winning deal').toBeGreaterThan(0);
    }
  });

  it('shows why full specialization is not always enough', () => {
    const island = E.tradeOutcome(sc('island'), { hoursA1: 8, hoursB1: 0, xFrom: 'a', price: 1, qty: 14 });
    expect(island.worldBefore).toEqual({ x: 32, y: 28 });
    expect(island.worldPlan).toEqual({ x: 48, y: 32 });
    expect(island.bothGain).toBe(true);
    expect(island.A2).toEqual({ x: 34, y: 14 });
    expect(island.B2).toEqual({ x: 14, y: 18 });
    // Mei is so productive that if she only bakes, the world runs short of shirts.
    let fullWins = 0;
    deals(sc('better_at_both'), (o, p) => { if (p.h1 === 8 && p.h2 === 0 && o.bothGain) fullWins++; });
    expect(fullWins).toBe(0);
    expect(E.tradeOutcome(sc('better_at_both'), { hoursA1: 6, hoursB1: 0, xFrom: 'a', price: 2, qty: 6 }).bothGain).toBe(true);
  });

  it('never ships goods nobody made', () => {
    const o = E.tradeOutcome(sc('island'), { hoursA1: 8, hoursB1: 0, xFrom: 'a', price: 1, qty: 500 });
    expect(o.qty).toBe(32); // Ben has only 32 coconuts to pay with
    expect(o.B2.y).toBe(0);
    const none = E.tradeOutcome(sc('island'), { hoursA1: 0, hoursB1: 0, xFrom: 'a', price: 1, qty: 10 });
    expect(none.qty).toBe(0);
  });

  it('makes random pairs that differ enough to trade and can always be won', () => {
    // Small seeds once gave every pair the same first rate (the generator's first draw is near 0).
    const firstRates = new Set(); for (let seed = 1; seed <= 40; seed++) firstRates.add(E.tradeRandom(seed).a.x);
    expect(firstRates.size).toBeGreaterThanOrEqual(5);
    for (let seed = 1; seed <= 12; seed++) {
      const s = E.tradeRandom(seed), c = E.tradeCompare(s);
      expect(c.hi / c.lo, 'seed ' + seed).toBeGreaterThanOrEqual(1.5);
      expect(s.a.name).not.toBe(s.b.name);
      let won = false;
      deals(s, (o, p) => { if (p.from === c.xMaker && o.bothGain) { won = true; return false; } });
      expect(won, 'seed ' + seed).toBe(true);
    }
  });

  it('draws the traded bundle outside the PPF, where the engine says it is', () => {
    const html = render({ econTab: 'trade', tradeHA1: 8, tradeHB1: 0, tradeFrom: 'a', tradePrice: 1, tradeQty: 14 });
    expect(html).toContain('data-economicslab-trade-visual="true"');
    expect(html).not.toContain('<canvas');
    expect((html.match(/data-trade-chart="/g) || []).length).toBe(2);
    expect(html).toContain('Both are better off: gains from trade.');
    const chartA = html.slice(html.indexOf('data-trade-chart="a"'), html.indexOf('data-trade-chart="b"'));
    const ppf = chartA.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#38bdf8"/);
    expect(ppf).toBeTruthy();
    const [x1, y1, x2, y2] = ppf.slice(1).map(Number);
    const pt = chartA.match(/data-trade-point="a2" data-x="([\d.]+)" data-y="([\d.]+)" data-cx="([\d.]+)" data-cy="([\d.]+)"/);
    expect(pt).toBeTruthy();
    expect([Number(pt[1]), Number(pt[2])]).toEqual([34, 14]);
    const cx = Number(pt[3]), cy = Number(pt[4]);
    const lineY = y1 + (cx - x1) / (x2 - x1) * (y2 - y1);
    expect(cy).toBeLessThan(lineY - 1); // above the frontier on screen
    const alone = chartA.match(/data-trade-point="a0" data-x="([\d.]+)" data-y="([\d.]+)" data-cx="([\d.]+)" data-cy="([\d.]+)"/);
    expect(Number(alone[4])).toBeCloseTo(y1 + (Number(alone[3]) - x1) / (x2 - x1) * (y2 - y1), 1); // on it
  });
});

// ── 3. Click-throughs with no AI ────────────────────────────────────────────

describe('click-throughs with callGemini === null', () => {
  const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  function mount(initial) {
    reload();
    const cfg = window.StemLab._registry[TOOL];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const box = { data: initial };
    function App() {
      const [d, setD] = React.useState(initial);
      box.data = d;
      return cfg.render(makeCtx({ toolData: d, setToolData: setD, callGemini: null }));
    }
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(React.createElement(App)); });
    const button = (re) => Array.from(host.querySelectorAll('button')).find((b) => re.test(b.textContent));
    const click = (el) => { expect(el, 'button to click').toBeTruthy(); act(() => { el.click(); }); };
    return { host, box, button, click, done: () => { act(() => root.unmount()); host.remove(); } };
  }

  it('plays a Life Sim year from the built-in deck', () => {
    const ui = mount({ econTab: 'personalFinance' });
    ui.click(ui.button(/Next Year/));
    const choice = ui.host.querySelector('[data-economicslab-life-event] button');
    ui.click(choice);
    expect(ui.box.data.pfAge).toBe(23);
    expect(ui.box.data.pfLastYear.takeHome).toBeGreaterThan(0);
    expect(ui.box.data.pfHistory.length).toBe(1);
    expect(typeof ui.box.data.pfCash).toBe('number');
    ui.done();
  });

  it('opens the classic market, buys the index and tracks cost basis', () => {
    const ui = mount({ econTab: 'stockMarket' });
    ui.click(ui.button(/classic market/));
    expect(ui.box.data.smCompanies.length).toBe(5);
    ui.click(ui.button(/Buy the index/));
    const d = ui.box.data;
    const spent = Object.values(d.smCost).reduce((s, v) => s + v, 0);
    expect(Object.keys(d.smPortfolio).length).toBe(5);
    expect(d.smCash + spent).toBeCloseTo(10000, 2);
    ui.click(ui.button(/5 days/));
    expect(ui.box.data.smDay).toBe(5);
    ui.done();
  });

  it('launches a business and runs a day on the local demand model', () => {
    const ui = mount({ econTab: 'entrepreneur' });
    ui.click(ui.button(/Sunny Squeeze Lemonade/));
    expect(ui.box.data.enBusiness.id).toBe('lemonade');
    ui.click(ui.button(/Open for Business/));
    const day = ui.box.data.enBizHistory[0];
    expect(day.revenue).toBeCloseTo(day.customers * day.price, 1);
    expect(ui.box.data.enBizDay).toBe(2);
    ui.done();
  });

  it('checks a Market Detective prediction and moves the graph', () => {
    const ui = mount({});
    const det = ui.host.querySelector('[data-economicslab-detective]');
    const inGroup = (name, re) => Array.from(det.querySelectorAll('[role="group"][aria-label="' + name + '"] button')).find((b) => re.test(b.textContent));
    ui.click(Array.from(det.querySelectorAll('button')).find((b) => b.textContent === 'Demand'));
    ui.click(inGroup('Demand direction', /Increases/));
    ui.click(inGroup('Price', /Rises/));
    ui.click(inGroup('Quantity', /Rises/));
    ui.click(ui.button(/Check my prediction/));
    expect(ui.box.data.sdDemandShift).toBe(E.SD_CASES[0].ds);
    expect(ui.box.data.sdDet.correct).toBe(1);
    ui.done();
  });

  it('applies a monopoly scenario from the built-in generator deck', () => {
    const i = E.SD_SCENARIOS.findIndex((sc) => sc.title === 'A town’s only cable company');
    expect(i).toBeGreaterThan(-1);
    vi.spyOn(Math, 'random').mockReturnValue((i + 0.5) / E.SD_SCENARIOS.length);
    const ui = mount({});
    ui.click(ui.button(/Generate Random Scenario/));
    ui.click(ui.button(/Apply Scenario to Graph/));
    expect(ui.box.data.sdMonopoly).toBe(true);
    expect(ui.host.querySelector('[data-economicslab-monopoly-toggle]').getAttribute('aria-pressed')).toBe('true');
    ui.done();
  });

  it('clears the market-failure settings for a Detective case and restores them after', () => {
    const ui = mount({ sdExt: 20, sdShowRevenue: true, sdTax: 5, sdMonopoly: true });
    const det = ui.host.querySelector('[data-economicslab-detective]');
    const inGroup = (name, re) => Array.from(det.querySelectorAll('[role="group"][aria-label="' + name + '"] button')).find((b) => re.test(b.textContent));
    ui.click(Array.from(det.querySelectorAll('button')).find((b) => b.textContent === 'Demand'));
    ui.click(inGroup('Demand direction', /Increases/));
    ui.click(inGroup('Price', /Rises/));
    ui.click(inGroup('Quantity', /Rises/));
    ui.click(ui.button(/Check my prediction/));
    expect([ui.box.data.sdExt, ui.box.data.sdShowRevenue, ui.box.data.sdTax, ui.box.data.sdMonopoly]).toEqual([0, false, 0, false]);
    ui.click(ui.button(/Next case/));
    expect([ui.box.data.sdExt, ui.box.data.sdShowRevenue, ui.box.data.sdTax, ui.box.data.sdMonopoly]).toEqual([20, true, 5, true]);
    ui.done();
    // A saved graph can only restore graph settings.
    const ui2 = mount({ sdDet: { checked: true, idx: 0, caseId: E.SD_CASES.find((c) => c.level <= 2).id, prevGraph: { sdDemandShift: 2, tradeWins: ['forged'], econAchEarned: ['phd'] } } });
    ui2.click(ui2.button(/Next case/));
    expect(ui2.box.data.sdDemandShift).toBe(2);
    expect(ui2.box.data.tradeWins).toBeUndefined();
    expect(ui2.box.data.econAchEarned === undefined || !ui2.box.data.econAchEarned.includes('phd')).toBe(true);
    ui2.done();
  });

  it('wins the Volcker mission by holding rates above inflation, then easing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ui = mount({ econTab: 'macro' });
    ui.click(ui.button(/Break the Great Inflation/));
    act(() => { ui.box.data; });
    // Set the policy rate through state, as the slider does.
    const setRate = (r) => {
      const slider = ui.host.querySelector('input[aria-label="Policy interest rate, percent"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      act(() => { setter.call(slider, String(r)); slider.dispatchEvent(new window.Event('input', { bubbles: true })); });
    };
    setRate(16);
    ui.click(ui.button(/Advance One Year/));
    ui.click(ui.button(/Advance One Year/));
    setRate(10);
    ui.click(ui.button(/Advance One Year/));
    expect(ui.box.data.macroMission.results.length).toBe(3);
    expect(ui.box.data.macroMissionWins).toEqual(['volcker']);
    ui.done();
  });

  // A 2D context that records every call, so the chart can be checked by
  // where it actually puts things.
  function recordCanvas() {
    const calls = [];
    const ctx = new Proxy({}, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return (s) => ({ width: String(s).length * 8 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} });
        return (...args) => { calls.push({ fn: prop, args, fill: target.fillStyle, stroke: target.strokeStyle }); };
      },
      set(target, prop, v) { target[prop] = v; return true; }
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(window.HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(450);
    return {
      calls,
      // Everything drawn after the chart's background box.
      chart: () => {
        let start = -1;
        calls.forEach((c, i) => { if (c.fn === 'fillRect' && c.fill === '#1e293b') start = i; });
        return calls.slice(start + 1);
      }
    };
  }
  const flush = () => new Promise((r) => setTimeout(r, 30));

  it('plots GDP, inflation and unemployment on ONE shared axis, from the mission start', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const rec = recordCanvas();
    const ui = mount({ econTab: 'macro' });
    ui.click(ui.button(/Break the Great Inflation/));
    ui.click(ui.button(/Advance One Year/));
    await flush();
    const h = ui.box.data.macroHistory[0];
    const drawn = rec.chart();
    const dots = drawn.filter((c) => c.fn === 'arc' && c.args[2] === 5);
    // start + 1 year, for each of the three series, in order.
    expect(dots.length).toBe(6);
    const values = [1.0, h.gdp, 13.0, h.inflation, 7.0, h.unemployment];
    // One axis: y is the same straight-line function of the value for every dot.
    const a = (dots[2].args[1] - dots[0].args[1]) / (values[2] - values[0]);
    const b = dots[0].args[1] - a * values[0];
    expect(a).toBeLessThan(0);
    dots.forEach((dt, i) => expect(dt.args[1], 'dot ' + i).toBeCloseTo(a * values[i] + b, 6));
    // Start is on the left, year one to its right.
    expect(dots[0].args[0]).toBeLessThan(dots[1].args[0]);
    // Goal and limit lines, labelled, at their own heights on that axis.
    const label = (re) => drawn.find((c) => c.fn === 'fillText' && re.test(c.args[0]));
    expect(label(/^goal: inflation ≤ 4%$/).args[2] + 8).toBeCloseTo(a * 4 + b, 6);
    expect(label(/^limit: unemployment ≤ 10.5%$/).args[2] + 8).toBeCloseTo(a * 10.5 + b, 6);
    expect(label(/^0%$/)).toBeTruthy();
    ui.done();
  });

  it('switches to a Phillips curve: one dot per year at (unemployment, inflation)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const rec = recordCanvas();
    const ui = mount({ econTab: 'macro' });
    ui.click(ui.button(/Break the Great Inflation/));
    // Tight money: inflation falls while unemployment rises, the trade-off
    // this view exists to show (and what makes swapped axes detectable).
    const slider = ui.host.querySelector('input[aria-label="Policy interest rate, percent"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(slider, '16'); slider.dispatchEvent(new window.Event('input', { bubbles: true })); });
    ui.click(ui.button(/Advance One Year/));
    ui.click(ui.button(/Advance One Year/));
    ui.click(ui.button(/Phillips curve/));
    expect(ui.box.data.macroChart).toBe('phillips');
    expect(ui.button(/Phillips curve/).getAttribute('aria-pressed')).toBe('true');
    expect(ui.host.textContent).toContain('Showing the Phillips curve view');
    await flush();
    const drawn = rec.chart();
    expect(drawn.some((c) => c.fn === 'fillText' && /^Phillips curve view/.test(c.args[0]))).toBe(true);
    const dots = drawn.filter((c) => c.fn === 'arc' && (c.args[2] === 5 || c.args[2] === 8));
    const pts = [{ un: 7.0, inf: 13.0 }].concat(ui.box.data.macroHistory.map((y) => ({ un: y.unemployment, inf: y.inflation })));
    expect(dots.length).toBe(pts.length);
    expect(dots[dots.length - 1].args[2]).toBe(8);
    expect(pts.some((p) => pts.some((q) => (p.un - q.un) * (p.inf - q.inf) < 0)), 'data has a trade-off pair').toBe(true);
    // x follows unemployment and y follows inflation (up = higher), for every pair.
    for (let i = 0; i < pts.length; i++) for (let j = 0; j < pts.length; j++) {
      if (pts[i].un < pts[j].un - 1e-9) expect(dots[i].args[0]).toBeLessThan(dots[j].args[0]);
      if (pts[i].inf < pts[j].inf - 1e-9) expect(dots[i].args[1]).toBeGreaterThan(dots[j].args[1]);
    }
    ui.done();
  });

  it('shows the Taylor rule in free play, hides it in missions, and its autopilot steadies the economy', () => {
    // 1% + 5 + 0.5 x 3 + 0.5 x 2 x (4 - 3) = 8.5
    expect(render({ econTab: 'macro', macroInflation: 5, macroUnemployment: 3 })).toContain('Taylor rule suggests 8.50%');
    // A deep slump would call for a negative rate: the rule stops at zero.
    expect(render({ econTab: 'macro', macroInflation: 0.5, macroUnemployment: 9.5 })).toContain('Taylor rule suggests 0.00%');
    const hot = render({ econTab: 'macro', macroInflation: 15, macroUnemployment: 2 });
    expect(hot).toContain('Taylor rule suggests 20.00%');
    expect(hot).toContain('rounded to the nearest 0.25%');
    const years = (auto) => Array.from({ length: 10 }, (_, i) => ({ year: 2025 + i, gdp: 2.5, inflation: 2, unemployment: 4, interest: 3, auto }));
    const vet = (auto) => render({ econTab: 'macro', showAchievements: true, macroHistory: years(auto), macroGDP: 2.5, macroInflation: 2, macroUnemployment: 4 }).match(/data-econ-ach="veteran" data-earned="(\w+)"/)[1];
    expect(vet(undefined)).toBe('true');
    expect(vet(true)).toBe('false');
    const mission = render({ econTab: 'macro', macroMission: { id: 'volcker', results: [] } });
    expect(mission).toContain('off during missions');
    expect(mission).not.toContain('Taylor rule suggests');
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ui = mount({ econTab: 'macro', macroGDP: 1, macroInflation: 13, macroUnemployment: 7, macroInterest: 11 });
    ui.click(ui.host.querySelector('[data-economicslab-autopilot]'));
    expect(ui.box.data.macroAutopilot).toBe(true);
    const first = ui.host.querySelector('[data-economicslab-taylor] .font-bold').textContent;
    ui.click(ui.button(/Advance One Year/));
    // The rate it used is the one it showed, and the year report says so.
    expect(first).toContain(ui.box.data.macroInterest.toFixed(2) + '%');
    expect(ui.box.data.macroReport.lines.join(' ')).toContain('Autopilot followed the Taylor rule');
    for (let y = 0; y < 14; y++) ui.click(ui.button(/Advance One Year/));
    expect(Math.abs(ui.box.data.macroInflation - 2)).toBeLessThanOrEqual(0.4);
    expect(Math.abs(ui.box.data.macroUnemployment - 4)).toBeLessThanOrEqual(0.4);
    ui.done();
  });

  it('credits a goal to the policy, not to luck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const year = (rate) => {
      const ui = mount({ econTab: 'macro' });
      ui.click(ui.button(/Cool inflation/));
      const slider = ui.host.querySelector('input[aria-label="Policy interest rate, percent"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      act(() => { setter.call(slider, String(rate)); slider.dispatchEvent(new window.Event('input', { bubbles: true })); });
      ui.click(ui.button(/Advance One Year/));
      const lines = ui.box.data.macroReport.lines.join('\n');
      const fell = ui.box.data.macroInflation < 3.2;
      ui.done();
      return { lines, fell };
    };
    // Holding 5.25% against 3.2% inflation is a tight real rate: inflation falls and that is the policy's doing.
    const hold = year(5.25);
    expect(hold.fell).toBe(true);
    expect(hold.lines).toMatch(/🎯 Goal check/);
    // Cutting to 3.25% loosens policy; inflation still drifts down, but that is not the student's win.
    const cut = year(3.25);
    expect(cut.fell).toBe(true);
    expect(cut.lines).toContain('not because of you');
    expect(cut.lines).not.toMatch(/🎯 Goal check/);
  });

  it('plays a 10-day price war, grades the guess on what the moves could show, and moves focus', async () => {
    const flushFocus = () => new Promise((r) => setTimeout(r, 90));
    const ui = mount({ econTab: 'entrepreneur', pwGame: { rival: 'mirror', seed: 5, history: [], guess: null } });
    const box = () => ui.host.querySelector('[data-economicslab-pricewar]');
    // Every header cell of the payoff table has a name (the corner one only for screen readers).
    expect(Array.from(box().querySelectorAll('th')).every((th) => th.textContent.trim().length > 0)).toBe(true);
    for (let day = 1; day <= 9; day++) ui.click(box().querySelector('[data-pw-move="H"]'));
    // Cut on the last day: Mirror only copies you the NEXT day, so it cannot punish this.
    ui.click(box().querySelector('[data-pw-move="L"]'));
    expect(ui.box.data.pwGame.history.length).toBe(10);
    expect(box().querySelector('[data-pw-move]')).toBe(null);
    expect(box().querySelector('[data-pw-totals]').textContent).toContain('You $630 · them $550');
    await flushFocus();
    expect(document.activeElement && document.activeElement.getAttribute('data-pw-guess')).toBeTruthy();
    // Holding every day, Mirror, Grudge and Friendly all look the same: any of them counts,
    // but only as a lucky match, not a read.
    ui.click(box().querySelector('[data-pw-guess="friendly"]'));
    expect(ui.box.data.pwStats).toEqual({ games: 1, right: 1, sharp: 0, best: 630 });
    expect(box().querySelector('[data-pw-lookalikes]').textContent).toContain('Mirror, Grudge, Friendly');
    expect(box().querySelector('[data-pw-reveal]').textContent).toContain('It was Mirror');
    expect(box().querySelector('[data-pw-reveal]').textContent).toContain('cartel');
    await flushFocus();
    expect(document.activeElement && document.activeElement.getAttribute('data-pw-reveal')).toBe('true');
    ui.click(ui.button(/achievements/));
    expect(ui.host.querySelector('[data-econ-ach="strategist"]').getAttribute('data-earned')).toBe('false');
    ui.done();
    // Test the rival: one cut on day 2. Only Grudge keeps cutting after you go back to holding.
    const ui2 = mount({ econTab: 'entrepreneur', pwGame: { rival: 'grudge', seed: 5, history: [], guess: null } });
    const box2 = () => ui2.host.querySelector('[data-economicslab-pricewar]');
    ['H', 'L', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'].forEach((m) => ui2.click(box2().querySelector('[data-pw-move="' + m + '"]')));
    expect(E.pwConsistent(ui2.box.data.pwGame.history)).toEqual(['grudge']);
    ui2.click(box2().querySelector('[data-pw-guess="mirror"]'));
    expect(ui2.box.data.pwStats.right).toBe(0);
    ui2.click(box2().querySelector('[data-pw-start]'));
    expect(E.PW_RIVALS.map((r) => r.id)).toContain(ui2.box.data.pwGame.rival);
    expect(ui2.box.data.pwGame.history).toEqual([]);
    ui2.done();
    const ui3 = mount({ econTab: 'entrepreneur', pwGame: { rival: 'grudge', seed: 5, history: [], guess: null } });
    const box3 = () => ui3.host.querySelector('[data-economicslab-pricewar]');
    ['H', 'L', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'].forEach((m) => ui3.click(box3().querySelector('[data-pw-move="' + m + '"]')));
    ui3.click(box3().querySelector('[data-pw-guess="grudge"]'));
    expect(ui3.box.data.pwStats).toEqual({ games: 1, right: 1, sharp: 1, best: 230 });
    ui3.click(ui3.button(/achievements/));
    expect(ui3.host.querySelector('[data-econ-ach="strategist"]').getAttribute('data-earned')).toBe('true');
    ui3.done();
  });

  it('runs the card payoff race: predict, reveal, then beat the 2-year challenge', () => {
    const ui = mount({ econTab: 'personalFinance' });
    const race = () => ui.host.querySelector('[data-economicslab-cardrace]');
    expect(race().querySelector('[data-cc-results]')).toBe(null);
    ui.click(Array.from(race().querySelectorAll('[data-cc-predict] button')).find((b) => b.textContent === 'Under 2 years'));
    ui.click(race().querySelector('[data-cc-check]'));
    const results = race().querySelector('[data-cc-results]');
    expect(results.textContent).toContain('Longer than you guessed. Minimum payments take 15 years');
    // The fixed payment starts at the card's own first minimum ($55 interest + $30 = $85).
    expect(race().querySelector('input[aria-label="Your fixed monthly payment, dollars"]').getAttribute('min')).toBe('85');
    expect(race().querySelector('[data-cc-live]').textContent).toContain('$150 a month: 2 years 2 months, $771 interest');
    expect(race().querySelector('[data-cc-live]').getAttribute('aria-live')).toBe('polite');
    expect(race().querySelector('[data-cc-lane="fixed"]').textContent).toContain('2 years 2 months');
    expect(race().querySelector('[data-cc-challenge]').textContent).toContain('Challenge');
    // Raise the payment until the card is gone within 2 years.
    const slider = race().querySelector('input[aria-label="Your fixed monthly payment, dollars"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(slider, '160'); slider.dispatchEvent(new window.Event('input', { bubbles: true })); });
    expect(ui.box.data.ccPay).toBe(160);
    // At 22%, $3,000 needs about $156/month for 24 months.
    expect(race().querySelector('[data-cc-challenge]').textContent).toContain('Paying about $156 a month');
    ui.click(race().querySelector('[data-cc-claim]'));
    expect(ui.box.data.ccWon).toBe(true);
    ui.click(ui.button(/achievements/));
    expect(ui.host.querySelector('[data-econ-ach="debt_race"]').getAttribute('data-earned')).toBe('true');
    ui.done();
  });

  it('keeps keyboard focus in the tool when the pressed control disappears', async () => {
    const wait = () => new Promise((r) => setTimeout(r, 30));
    const ui = mount({ econTab: 'personalFinance' });
    // Next Year is replaced by the year's event: focus must land on a control, not <body>.
    const next = ui.button(/Next Year/);
    act(() => { next.focus(); });
    ui.click(next);
    await wait();
    expect(document.activeElement).not.toBe(document.body);
    expect(ui.host.contains(document.activeElement)).toBe(true);
    // Answering the event removes the choices too.
    const choice = ui.host.querySelector('[data-economicslab-life-event] button');
    act(() => { choice.focus(); });
    ui.click(choice);
    await wait();
    expect(ui.host.contains(document.activeElement)).toBe(true);
    // Closing a panel sends focus back to the button that opened it.
    const opener = ui.host.querySelector('[data-economicslab-progress-button]');
    act(() => { opener.focus(); });
    ui.click(opener);
    const close = ui.host.querySelector('[aria-label="Close progress"]');
    act(() => { close.focus(); });
    ui.click(close);
    await wait();
    expect(document.activeElement).toBe(ui.host.querySelector('[data-economicslab-progress-button]'));
    ui.done();
  });

  it('puts the tab’s controls inside its tab panel', () => {
    const ui = mount({ econTab: 'personalFinance' });
    const panels = ui.host.querySelectorAll('[role="tabpanel"]');
    expect(panels.length).toBe(1);
    const panel = panels[0];
    const tab = ui.host.querySelector('#economicslab-tab-personalFinance');
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(panel.contains(ui.button(/Next Year/))).toBe(true);
    expect(panel.contains(ui.host.querySelector('[data-economicslab-cardrace]'))).toBe(true);
    ui.done();
  });

  it('names every reference toggle and opens timeline events from the keyboard', () => {
    const html = render({ showEconTimeline: true, showBudgetRules: true });
    expect(html).toContain('aria-label="Hide the economic timeline"');
    expect(html).toContain('aria-label="Hide the budget rules"');
    // No "Hide" button is left without a name saying which panel it hides.
    expect(html).not.toMatch(/<button(?![^>]*aria-label)[^>]*>Hide<\/button>/);
    const ui = mount({ showEconTimeline: true });
    const ev = ui.host.querySelector('[role="region"][aria-label="Economic timeline"] [role="button"]');
    expect(ev.getAttribute('tabindex')).toBe('0');
    expect(ev.getAttribute('aria-expanded')).toBe('false');
    act(() => { ev.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(ui.host.querySelector('[role="region"][aria-label="Economic timeline"] [role="button"]').getAttribute('aria-expanded')).toBe('true');
    ui.done();
  });

  it('grades the 2-year boundary right and keeps the challenge for real balances', () => {
    // $500 at 16%: the minimum plan takes exactly 24 months, which is "2 to 5 years".
    expect(E.cardPayoff({ balance: 500, apr: 16, rule: 'minimum' }).months).toBe(24);
    const edge = render({ econTab: 'personalFinance', ccBal: 500, ccApr: 16, ccGuess: 'b', ccGuessFor: '500@16' });
    expect(edge).toContain('✅ Right. Minimum payments take 2 years');
    // A small card clears in 2 years easily: no claim, and it says why.
    const small = render({ econTab: 'personalFinance', ccBal: 1000, ccApr: 20, ccPay: 60, ccGuess: 'a', ccGuessFor: '1000@20' });
    expect(small).toContain('Try it with a balance of $2,000 or more');
    expect(small).not.toContain('data-cc-claim');
    // Moving a slider after predicting keeps the results (no right/wrong for the new setting).
    const moved = render({ econTab: 'personalFinance', ccBal: 4000, ccApr: 22, ccGuess: 'd', ccGuessFor: '3000@22' });
    expect(moved).toContain('data-cc-results');
    expect(moved).not.toContain('Right.');
  });

  it('runs a Trade Lab round: predict, check, specialize, trade, seal', () => {
    const ui = mount({ econTab: 'trade' });
    const lab = () => ui.host.querySelector('[data-economicslab-trade]');
    const spec = () => lab().querySelector('[data-trade-specialize]');
    expect(spec().disabled).toBe(true);
    // A wrong prediction is scored as wrong and still reveals the costs.
    ui.click(Array.from(lab().querySelectorAll('[aria-label="Your prediction"] button')).find((b) => b.textContent === 'Ben'));
    ui.click(lab().querySelector('[data-trade-check]'));
    expect(ui.box.data.tradePredStats).toEqual({ tried: 1, right: 0 });
    expect(lab().querySelector('[data-trade-reveal]').textContent).toContain('Ana gives up less to make fish');
    ui.click(spec());
    expect([ui.box.data.tradeHA1, ui.box.data.tradeHB1, ui.box.data.tradeFrom]).toEqual([8, 0, 'a']);
    expect(lab().querySelector('[data-trade-world]').textContent).toContain('32 → 48 (+16)');
    const qty = lab().querySelector('input[aria-label="fish shipped"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(qty, '14'); qty.dispatchEvent(new window.Event('input', { bubbles: true })); });
    expect(ui.box.data.tradeQty).toBe(14);
    expect(lab().querySelector('[data-trade-live]').textContent).toBe('Ana: better off. Ben: better off.');
    expect(lab().querySelector('[data-trade-live]').getAttribute('aria-live')).toBe('polite');
    ui.click(lab().querySelector('[data-trade-seal]'));
    expect(ui.box.data.tradeWins).toEqual(['island']);
    ui.click(ui.button(/achievements/));
    expect(ui.host.querySelector('[data-econ-ach="gains_from_trade"]').getAttribute('data-earned')).toBe('true');
    // A new scenario starts fresh: prediction hidden again, plan reset.
    ui.click(ui.button(/Better at both/));
    expect(lab().querySelector('[data-trade-reveal]')).toBe(null);
    expect(ui.box.data.tradeHA1).toBe(null);
    ui.done();
  });

  it('sums up every sim in My progress and copies that same report', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      const ui = mount({
        macroMissionWins: ['volcker'], sdDet: { correct: 3, tried: 5, best: 2, solved: ['a', 'b', 'c'] },
        econScenarioScore: 4, econScenarioTotal: 6, econBestStreak: 3, quizScore: 2, quizTotal: 3
      });
      ui.click(ui.button(/My progress/));
      const panel = ui.host.querySelector('[data-economicslab-progress]');
      expect(panel).toBeTruthy();
      const text = panel.textContent;
      expect(text).toContain('3 cases solved perfectly, best streak 2');
      expect(text).toContain('4/6 correct, best streak 3');
      expect(text).toContain('2/3 correct');
      expect(text).toContain('missions won 1/' + E.MACRO_MISSIONS.length + ' (Break the Great Inflation (1980))');
      expect(text).toMatch(/Life Sim\s*not started yet/);
      const note = panel.querySelector('#econ-progress-note');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      act(() => { setter.call(note, 'A pollution tax can help.'); note.dispatchEvent(new window.Event('input', { bubbles: true })); });
      ui.click(ui.button(/Copy report/));
      await flush();
      expect(writeText).toHaveBeenCalledTimes(1);
      const report = writeText.mock.calls[0][0];
      expect(report).toContain('Market Detective: 3 cases solved perfectly, best streak 2');
      expect(report).toContain('Scenario challenge: 4/6 correct');
      expect(report).toMatch(/Achievements: 1\/\d+ \(Mission Accomplished\)/);
      expect(report).toContain('What I learned: A pollution tax can help.');
      expect(report.split('\n').length).toBeGreaterThanOrEqual(13);
      ui.done();
    } finally {
      delete window.navigator.clipboard;
    }
  });
});
