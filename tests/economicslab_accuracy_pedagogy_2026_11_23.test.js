// Economics Lab, 2026-11-23 pass: sourced facts, honest stock market, earned
// XP, misconception feedback and a predict-first break-even.
//
// Every figure kept in the tool was checked against a primary source on
// 2026-11-23 (Treasury Debt to the Penny, BEA via FRED, BLS BED survival
// tables, Fed G.19, IRS Rev. Proc. 2025-32, SSA, GAO, ICI, S&P/Case-Shiller via
// FRED, Damodaran NYU return data). Claims with no findable source were
// removed (Aaron's rule: keep the guidance, drop the number). These tests pin
// both halves so a later content pass cannot quietly bring them back.
//
// ECON_TEST_SOURCE may point at another copy (e.g. the pre-pass start.js) to
// show which checks fail on it.
import { describe, it, expect, beforeAll, vi } from 'vitest';
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
const reload = () => { resetStemLab(); loadTool(FILE, TOOL); };

describe('facts students read are sourced or gone', () => {
  it('drops claims no primary source supports, and stale or wrong figures', () => {
    const gone = [
      'Many millionaires built wealth by keeping housing costs under 25% of income', // no source
      '$5 trillion in market cap evaporated', // no primary source
      'Housing prices crashed 33%', // Case-Shiller national fell ~26%
      'roughly 30% at an annual rate', // BEA: Q2 2020 = -28.0% SAAR
      '$5T+ in relief spending', // GAO: about $4.6 trillion
      'Crypto crashed 70%', // no primary source
      'GDP fell 30%, unemployment reached 25%', // real GDP fell ~26% 1929-33
      'Job loss is the most common financial emergency', // no source
      'about 1–2% of the home’s value a year', // rule of thumb, no source
      'New cars lose about 20% of their value in the first year', // industry claim; now stated as the sim's own number
      'US GDP was about $29 trillion in 2024', // BEA 2025 = $30.9T
      'many active funds ~1%', // ICI gives no such average
      'people pay about as much in premiums as insurance pays out', // backwards: premiums exceed payouts
      'most tightening cycles have ended in recession', // Blinder (2023) disputes it
      'S&P 500 has averaged ~10% annual returns over 100 years', // needs "with dividends, before inflation"
      'recommended by most financial advisors', // no source
      'real stocks fell 37% in 2008', // "real" means inflation-adjusted; it was the nominal total return
      "'5 simulators'" // the lab has 7 topics
    ];
    for (const s of gone) expect(SRC.includes(s), s).toBe(false);
  });

  it('states the checked figures with their source', () => {
    expect(SRC).toContain('US federal debt passed $40 trillion in 2026'); // Treasury: $40.71T on 2026-11-20
    expect(SRC).toContain('Debt to the Penny');
    expect(SRC).toContain('US GDP was about $30.9 trillion in 2025 (BEA)');
    expect(SRC).toContain('the S&P 500 grew about 10% a year on average from 1928 to 2025'); // Damodaran: 10.02% geometric
    expect(SRC).toContain('Relief laws provided about $4.6 trillion (GAO)');
    expect(SRC).toContain('about 28% at an annual rate');
    expect(SRC).toContain('index stock mutual funds charged about 0.05% a year on average (ICI)');
    expect(SRC).toContain('at least 80 to 85 cents of each premium dollar on care'); // ACA medical loss ratio
  });

  it('shows the new debt line where students read it (a new key, so no old registered text wins)', () => {
    reload();
    const html = renderTool(TOOL, { showIndicators: true });
    expect(html).toContain('passed $40 trillion in 2026');
    expect(html).not.toContain('$38 trillion by late 2025');
    expect(SRC).toContain("'stem.economicslab.total_government_borrowing_us_debt_is__v2'");
  });

  it('quotes the sim’s own assumptions, so the text and the model cannot disagree', () => {
    const A = E.PF_ASSETS;
    expect(SRC).toContain('this sim assumes about ' + Math.round(A.Conservative.mean * 100) + '% a year');
    expect(SRC).toContain('this sim assumes about ' + Math.round(A.Balanced.mean * 100) + '% a year on average');
    // The worst Aggressive year the engine can roll: u = 0.
    const worst = E.pfYearReturn('Aggressive', () => 0);
    expect(SRC).toContain('a bad year here can lose about ' + Math.round(-worst * 100) + '%');
    const car = E.LIFE_EVENTS.find((e) => e.id === 'car_purchase');
    const deps = car.choices.filter((c) => c.effect.carBuy).map((c) => Math.round(c.effect.carBuy.dep * 100));
    expect(car.lesson).toContain('a new car loses ' + deps[0] + '% of its value in year one and a used car ' + deps[1] + '%');
  });
});

describe('interactive checks', () => {
  const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  function mount(initial, xp) {
    reload();
    const cfg = window.StemLab._registry[TOOL];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const box = { data: initial };
    function App() {
      const [d, setD] = React.useState(initial);
      box.data = d;
      return cfg.render(makeCtx({ toolData: d, setToolData: setD, callGemini: null, awardXP: xp || (() => {}) }));
    }
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(React.createElement(App)); });
    const button = (re, scope) => Array.from((scope || host).querySelectorAll('button')).find((b) => re.test(b.textContent));
    const click = (el) => { expect(el, 'button to click').toBeTruthy(); act(() => { el.click(); }); };
    return { host, box, button, click, done: () => { act(() => root.unmount()); host.remove(); } };
  }

  it('stock market: says prices are simulated random steps, before and during trading', () => {
    const ui = mount({ econTab: 'stockMarket' });
    expect(ui.host.querySelector('[data-economicslab-random-note]').textContent).toMatch(/random step/);
    ui.click(ui.button(/classic market/));
    expect(ui.host.querySelector('[data-economicslab-random-note]').textContent).toMatch(/simulated/);
    ui.done();
  });

  it('stock market: no XP for churning trades; days earn XP only while invested', () => {
    const xp = vi.fn();
    const ui = mount({ econTab: 'stockMarket' }, xp);
    ui.click(ui.button(/classic market/));
    ui.click(ui.button(/^⏭ Day/));
    expect(xp, 'a day with nothing invested').not.toHaveBeenCalled();
    for (let i = 0; i < 3; i++) { ui.click(ui.button(/^▲ Buy 1/)); ui.click(ui.button(/^▼ Sell 1/)); }
    expect(xp, 'buy-sell churn').not.toHaveBeenCalled();
    ui.click(ui.button(/^▲ Buy 1/));
    ui.click(ui.button(/^⏭ Day/));
    expect(xp).toHaveBeenCalledTimes(1);
    ui.done();
  });

  it('stock market: the holding streak grows while every company is owned and resets on a sale', () => {
    const ui = mount({ econTab: 'stockMarket' });
    ui.click(ui.button(/classic market/));
    ui.click(ui.button(/Buy the index/));
    ui.click(ui.button(/5 days/));
    ui.click(ui.button(/5 days/));
    expect(ui.box.data.smHoldStreak).toBe(10);
    expect(ui.host.textContent).toMatch(/owned every company for 10 trading days in a row/);
    ui.click(ui.button(/^▼ Sell 1/));
    expect(ui.box.data.smHoldStreak).toBe(0);
    ui.done();
  });

  it('achievements reward holding a diversified portfolio, not a lucky balance', () => {
    reload();
    const html = renderTool(TOOL, { showAchievements: true, smHoldStreak: 10 });
    expect(html).toContain('Steady Hand');
    expect(html).toContain('Long View');
    expect(html).not.toContain('Wall Street Wolf');
    expect(html).not.toContain('Portfolio grew 50%+');
  });

  it('challenge deck: a wrong pick explains why THAT option is wrong; the key gets none', () => {
    const ui = mount({ showScenarioChallenge: true, econScenarioIdx: 0, econScenarioAnswer: -1 });
    const opts = () => Array.from(ui.host.querySelectorAll('button')).filter((b) => /^[✅❌ ]*[A-D]\./.test(b.textContent.trim()));
    expect(opts().length).toBe(4);
    const wrong = opts().find((b) => !/Pay off the card/.test(b.textContent));
    const wrongText = wrong.textContent.replace(/^[A-D]\.\s*/, '').trim();
    ui.click(wrong);
    const why = ui.host.querySelector('[data-economicslab-why-not]');
    expect(why, 'why-not panel').toBeTruthy();
    expect(why.textContent).toContain(wrongText);
    ui.done();
    const ui2 = mount({ showScenarioChallenge: true, econScenarioIdx: 0, econScenarioAnswer: -1 });
    ui2.click(Array.from(ui2.host.querySelectorAll('button')).find((b) => /Pay off the card/.test(b.textContent)));
    expect(ui2.host.querySelector('[data-economicslab-why-not]')).toBeNull();
    ui2.done();
  });

  it('every challenge scenario has a why-not line for each wrong option and none for the key', () => {
    for (let idx = 0; idx < 10; idx++) {
      for (let pick = 0; pick < 4; pick++) {
        const ui = mount({ showScenarioChallenge: true, econScenarioIdx: idx, econScenarioAnswer: pick });
        const why = ui.host.querySelector('[data-economicslab-why-not]');
        const right = ui.host.textContent.includes('✅ A.') && pick === 0 || ui.host.textContent.includes('✅ B.') && pick === 1 || ui.host.textContent.includes('✅ C.') && pick === 2 || ui.host.textContent.includes('✅ D.') && pick === 3;
        if (right) expect(why, 'scenario ' + idx + ' key ' + pick).toBeNull();
        else expect(why && why.textContent.length > 40, 'scenario ' + idx + ' wrong pick ' + pick).toBe(true);
        ui.done();
      }
    }
  });

  it('the Demand Surge starter stays inside the demand slider’s range', () => {
    const ui = mount({});
    ui.click(ui.button(/Demand Surge/));
    expect(ui.box.data.sdDemandShift).toBeGreaterThan(0);
    expect(ui.box.data.sdDemandShift).toBeLessThanOrEqual(5);
    ui.done();
  });
});

describe('business sim: predict break-even before it is shown', () => {
  it('builds its choices from bizBreakEven, with the divide-by-price mistake as a distractor', () => {
    const slots = new Set();
    let asked = 0;
    for (const b of E.BIZ_TEMPLATES) {
      const q = E.bizBreakEvenChoices(b, {}, {});
      const be = E.bizBreakEven(b, {}, {});
      // A break-even of 1 sale is not worth a question (tutoring); it is shown at once.
      if (be < 2) { expect(q, b.id).toBeNull(); continue; }
      asked++;
      expect(q, b.id).toBeTruthy();
      expect(q.correct).toBe(be);
      const key = q.options.findIndex((o) => o.kind === 'key');
      expect(q.options[key].n).toBe(be);
      const byPrice = q.options.find((o) => o.kind === 'price');
      if (byPrice) expect(byPrice.n).toBe(Math.ceil(b.dailyFixedCosts / b.suggestedPrice));
      expect(new Set(q.options.map((o) => o.n)).size).toBe(q.options.length);
      // Selling break-even units really covers the day's costs; one fewer does not.
      expect(be * (b.suggestedPrice - b.unitCost)).toBeGreaterThanOrEqual(b.dailyFixedCosts - 1e-9);
      expect((be - 1) * (b.suggestedPrice - b.unitCost)).toBeLessThan(b.dailyFixedCosts);
      slots.add(key);
    }
    expect(asked).toBeGreaterThanOrEqual(6);
    expect(slots.size, 'the key must not always sit in one slot').toBeGreaterThan(1);
  });

  const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
  function mountBiz() {
    reload();
    const cfg = window.StemLab._registry[TOOL];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const box = {};
    function App() {
      const [d, setD] = React.useState({ econTab: 'entrepreneur' });
      box.data = d;
      return cfg.render(makeCtx({ toolData: d, setToolData: setD, callGemini: null }));
    }
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(React.createElement(App)); });
    const click = (el) => { expect(el).toBeTruthy(); act(() => { el.click(); }); };
    click(Array.from(host.querySelectorAll('button')).find((b) => /Sunny Squeeze Lemonade/.test(b.textContent)));
    return { host, box, click, done: () => { act(() => root.unmount()); host.remove(); } };
  }

  it('hides the number, takes a prediction, then explains it with the model’s numbers', () => {
    const ui = mountBiz();
    expect(ui.host.querySelector('[data-economicslab-breakeven]').getAttribute('data-economicslab-breakeven')).toBe('hidden');
    const be = E.bizBreakEven(ui.box.data.enBusiness, {}, {});
    const block = ui.host.querySelector('[data-economicslab-be-predict]');
    const pick = Array.from(block.querySelectorAll('button')).find((b) => b.textContent.startsWith(String(Math.ceil(75 / 2)) + ' '));
    ui.click(pick); // 75 / $2: the divide-by-price mistake
    expect(ui.box.data.enBePred.ok).toBe(false);
    const res = ui.host.querySelector('[data-economicslab-be-result]');
    expect(res.getAttribute('data-economicslab-be-result')).toBe('wrong');
    expect(res.textContent).toMatch(/divides the costs by the PRICE/);
    expect(res.textContent).toContain('rounds up to ' + be);
    expect(ui.host.querySelector('[data-economicslab-breakeven]').textContent).toBe(String(be));
    ui.done();
  });
});
