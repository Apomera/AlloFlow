// Economics Lab, 2026-11-23 round 2: a lighter hero, predict-first in Supply &
// Demand and in the retirement Monte Carlo, tutor XP that cannot be farmed, and
// a break-even prediction that asks again on a fresh launch.
//
// ECON_TEST_SOURCE may point at another copy (e.g. C:/tmp/sports_labs_1123/
// economicslab/start_r2.js) to show which checks fail on the pre-round-2 file.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ECON_TEST_SOURCE || 'stem_lab/stem_tool_economicslab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const TOOL = 'economicsLab';
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let E;
beforeAll(() => {
  resetStemLab();
  E = loadTool(FILE, TOOL)._engine;
});
const reload = () => { resetStemLab(); loadTool(FILE, TOOL); };

function mount(initial, extra) {
  reload();
  const cfg = window.StemLab._registry[TOOL];
  const host = document.createElement('div');
  document.body.appendChild(host);
  const box = { data: initial };
  function App() {
    const [d, setD] = React.useState(initial);
    box.data = d;
    return cfg.render(makeCtx(Object.assign({ toolData: d, setToolData: setD, callGemini: null, awardXP: () => {} }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(App)); });
  const buttons = (scope) => Array.from((scope || host).querySelectorAll('button'));
  const button = (re, scope) => buttons(scope).find((b) => re.test(b.textContent));
  const click = (el) => { expect(el, 'element to click').toBeTruthy(); act(() => { el.click(); }); };
  return { host, box, button, buttons, click, done: () => { act(() => root.unmount()); host.remove(); } };
}

describe('hero: two pills in sight, the rest behind one disclosure', () => {
  it('keeps Quiz Me and My progress visible and folds every other control, without removing any', () => {
    const ui = mount({});
    const hero = ui.host.querySelector('header.eco-hero-deck');
    const toggle = hero.querySelector('[data-economicslab-hero-more-toggle]');
    expect(toggle, 'one labelled disclosure').toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toMatch(/More: badges, glossary, starters, difficulty/);
    const panel = hero.querySelector('#' + toggle.getAttribute('aria-controls'));
    expect(panel.hidden).toBe(true);
    const visible = (el) => !el.closest('[hidden]');
    expect(visible(ui.button(/Quiz Me/, hero))).toBe(true);
    expect(visible(ui.button(/My progress/, hero))).toBe(true);
    // Everything that used to sit in the hero is still there, inside the panel.
    for (const re of [/achievements/, /Glossary \(/, /Demand Surge/, /Price Ceiling/, /Per-Unit Tax/, /Trade Lab/, /Macro Policy/]) {
      const b = ui.button(re, panel);
      expect(b, String(re)).toBeTruthy();
    }
    expect(panel.querySelector('select[aria-label="Difficulty"]')).toBeTruthy();
    expect(panel.textContent).toMatch(/7 topics/);
    expect(panel.textContent).toMatch(/Explored:/);
    ui.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(hero.querySelector('#economicslab-hero-more').hidden).toBe(false);
    expect(hero.getAttribute('data-hero-more')).toBe('open');
    ui.done();
  });

  it('folds the AI tutor button too when AI is on', () => {
    const ui = mount({}, { callGemini: () => Promise.resolve('') });
    const panel = ui.host.querySelector('#economicslab-hero-more');
    expect(panel, 'the disclosure panel').toBeTruthy();
    expect(ui.button(/Ask Tutor/, panel)).toBeTruthy();
    expect(ui.button(/Ask Tutor/, panel).closest('[hidden]')).toBeTruthy();
    ui.done();
  });
});

describe('Supply & Demand: predict the gap before the graph shows it', () => {
  it('builds every round from sdOutcome, with named mistakes and a varying key slot', () => {
    const slots = new Set();
    expect(E.SD_GAP_ROUNDS.length).toBeGreaterThanOrEqual(5);
    for (const r of E.SD_GAP_ROUNDS) {
      const q = E.sdGapRound(r);
      const cap = r.control === 'ceiling';
      const out = E.sdOutcome({ dShift: r.dShift, sShift: r.sShift, ceiling: cap ? r.level : 0, floor: cap ? 0 : r.level });
      const base = E.sdOutcome({ dShift: r.dShift, sShift: r.sShift });
      const c = (v) => Math.max(0, Math.min(100, v));
      const binds = out.regime === r.control;
      const gap = binds ? (cap ? c(out.qd) - c(out.qs) : c(out.qs) - c(out.qd)) : 0;
      expect(q.correct, r.id).toBe(Math.round(gap));
      // Same number the graph label prints ("SHORTAGE ≈ N units").
      expect(q.correct).toBe(Number(Math.max(0, gap).toFixed(0)));
      expect(q.options.length).toBe(4);
      expect(new Set(q.options.map((o) => o.n)).size).toBe(4);
      const key = q.options.findIndex((o) => o.kind === 'key');
      expect(q.options[key].n).toBe(q.correct);
      const price = q.options.find((o) => o.kind === 'price');
      if (price) expect(price.n).toBe(Math.round(Math.abs(r.level - base.pStar)));
      slots.add(key);
    }
    expect(slots.size, 'the key must not always sit in one slot').toBeGreaterThanOrEqual(3);
    // One round has a cap that does not bind: the answer is 0, not a shortage.
    const slack = E.SD_GAP_ROUNDS.map((r) => E.sdGapRound(r)).find((q) => !q.binds);
    expect(slack && slack.correct).toBe(0);
  });

  it('hides the shortage number on the graph summary until the student commits', () => {
    reload();
    const asking = renderTool(TOOL, { sdPriceCeiling: 30 });
    expect(asking).toContain('shortage of about ? units');
    const answered = renderTool(TOOL, { sdPriceCeiling: 30, sdGap: { idx: 0, phase: 'done', id: 'rent_cap_30', pick: 50, kind: 'key' } });
    expect(answered).toContain('shortage of about 50 units');
    // A different market on the graph is not the question: the sandbox keeps its numbers.
    expect(renderTool(TOOL, { sdPriceCeiling: 30, sdDemandShift: 2 })).not.toContain('shortage of about ?');
  });

  it('a wrong pick names the mistake, shows the model’s numbers and pays nothing; a first-try right pick pays once', () => {
    const xp = vi.fn();
    const ui = mount({}, { awardXP: xp });
    const card = () => ui.host.querySelector('[data-economicslab-gap-predict]');
    expect(card().getAttribute('data-economicslab-gap-predict')).toBe('ask');
    expect(ui.box.data.sdPriceCeiling || 0).toBe(0);
    const q0 = E.sdGapRound(E.SD_GAP_ROUNDS[0]);
    ui.click(card().querySelector('[data-gap-kind="price"]'));
    const res = ui.host.querySelector('[data-economicslab-gap-result]');
    expect(res.getAttribute('data-economicslab-gap-result')).toBe('wrong');
    expect(res.textContent).toMatch(/DOLLARS/);
    expect(res.textContent).toContain('buyers want about ' + q0.qd + ' units but sellers offer only about ' + q0.qs + ', so about ' + q0.correct + ' units are short');
    expect(ui.box.data.sdPriceCeiling).toBe(q0.level);
    expect(xp).not.toHaveBeenCalled();
    // Next market: a floor round, loaded with no control yet.
    ui.click(ui.button(/Next market/));
    expect(ui.box.data.sdPriceCeiling).toBe(0);
    expect(ui.box.data.sdPriceFloor).toBe(0);
    ui.click(card().querySelector('[data-gap-kind="key"]'));
    expect(ui.host.querySelector('[data-economicslab-gap-result]').getAttribute('data-economicslab-gap-result')).toBe('right');
    expect(xp).toHaveBeenCalledTimes(1);
    expect(xp.mock.calls[0][0]).toBe('economicsLab');
    expect(xp.mock.calls[0][1]).toBe(10);
    // Back round to market 1 (already tried): a right answer now pays nothing.
    for (let i = 1; i < E.SD_GAP_ROUNDS.length; i++) {
      ui.click(ui.button(/Next market/));
      if (i < E.SD_GAP_ROUNDS.length - 1) ui.click(card().querySelector('[data-gap-kind="none"], [data-gap-kind="all"], [data-gap-kind="half"]'));
    }
    expect(ui.box.data.sdGap.idx).toBe(0);
    const before = xp.mock.calls.length;
    ui.click(card().querySelector('[data-gap-kind="key"]'));
    expect(xp.mock.calls.length).toBe(before);
    ui.done();
  });

  it('points the hero Try line at the prediction, under a new key', () => {
    expect(SRC).toContain("'stem.economicslab.try_supply_demand_v2'");
    expect(SRC).not.toContain("t('stem.economicslab.try_supply_demand', ");
  });
});

describe('retirement Monte Carlo: predict, then see; honest about its assumptions', () => {
  const start = { econTab: 'stockMarket', mcOpen: true, mcMode: 'retire' };
  it('choosing Retiring pays no XP and shows no results before a prediction', () => {
    const xp = vi.fn();
    const ui = mount({ econTab: 'stockMarket', mcOpen: true }, { awardXP: xp });
    ui.click(ui.button(/Retiring/));
    expect(xp).not.toHaveBeenCalled();
    expect(ui.host.querySelector('[data-economicslab-mc-predict]')).toBeTruthy();
    expect(ui.host.querySelector('svg[aria-label^="Fan chart"]')).toBeNull();
    expect(ui.host.textContent).not.toMatch(/of 200 simulated retirements still had money/);
    ui.done();
  });

  it('states the return assumptions it runs on and that results are simulated', () => {
    const ui = mount(start);
    const note = ui.host.querySelector('[data-economicslab-mc-assumptions]').textContent;
    // Assumptions updated 2026-11-23 to US history 1928-2025 (Damodaran annual table): average year
    // stocks 11.9% (SD 19.4), 10-yr bonds 4.8% (SD 7.9), T-bills 3.4%.
    const mean = (60 * 11.9 + 30 * 4.8 + 10 * 3.4) / 100; // the default 60/30/10 mix
    const a = 60 / 100 * 19.4, b = 30 / 100 * 7.9;
    const vol = Math.sqrt(a * a + b * b + 2 * 0.2 * a * b);
    expect(note).toContain('averages about ' + mean.toFixed(1) + '% a year (' + (mean - 0.2).toFixed(1) + '% after the fee)');
    expect(note).toContain('within ' + vol.toFixed(1) + ' percentage points');
    expect(note).toContain('stocks 11.9%, bonds 4.8% and cash 3.4%');
    expect(note).toMatch(/not raised for inflation/);
    expect(note).toMatch(/simulated futures, not a forecast/);
    expect(SRC).not.toContain('every run here has the SAME average return');
    ui.done();
  });

  it('reveals after a pick; right / wrong agrees with the count it shows; pays once per setup', () => {
    for (let pick = 0; pick < 4; pick++) {
      const xp = vi.fn();
      const ui = mount(start, { awardXP: xp });
      ui.click(ui.host.querySelector('[data-mc-band="' + pick + '"]'));
      const m = /(\d+) of 200 simulated retirements still had money after 30 years \((\d+)%\)/.exec(ui.host.textContent);
      expect(m, 'the count is shown after the pick').toBeTruthy();
      const band = E.mcSurvivalBand(Number(m[1]), 200);
      expect(band.pct).toBe(Number(m[2]));
      const res = ui.host.querySelector('[data-economicslab-mc-result]');
      expect(res.getAttribute('data-economicslab-mc-result')).toBe(band.index === pick ? 'right' : 'wrong');
      expect(xp).toHaveBeenCalledTimes(band.index === pick ? 1 : 0);
      expect(ui.box.data.mcRanRetire).toBe(true);
      expect(ui.host.querySelector('svg[aria-label^="Fan chart"]')).toBeTruthy();
      // A re-roll keeps the results; a new spending level asks again.
      ui.click(ui.button(/Re-roll 200 futures/));
      expect(ui.host.querySelector('[data-economicslab-mc-predict]')).toBeNull();
      const spend = ui.host.querySelector('input[aria-label="Yearly spending in retirement"]');
      act(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(spend, '30000'); spend.dispatchEvent(new Event('input', { bubbles: true })); });
      expect(ui.box.data.mcSpend).toBe(30000);
      expect(ui.host.querySelector('[data-economicslab-mc-predict]')).toBeTruthy();
      ui.done();
    }
  });

  it('slider extremes: the verdict still agrees with the count shown', () => {
    const cases = [{ mcSpend: 10000, mcYears: 10, paStocks: 0, paBonds: 0 }, { mcSpend: 40000, mcYears: 40, paStocks: 100, paBonds: 0, mcFee: 1.5 }, { mcSpend: 40000, mcYears: 40, paStocks: 0, paBonds: 100 }];
    for (const c of cases) {
      const ui = mount(Object.assign({}, start, c));
      ui.click(ui.host.querySelector('[data-mc-band="1"]'));
      const m = new RegExp('(\\d+) of 200 simulated retirements still had money after ' + c.mcYears + ' years \\((\\d+)%\\)').exec(ui.host.textContent);
      expect(m, JSON.stringify(c)).toBeTruthy();
      const band = E.mcSurvivalBand(Number(m[1]), 200);
      expect(ui.host.querySelector('[data-economicslab-mc-result]').getAttribute('data-economicslab-mc-result')).toBe(band.index === 1 ? 'right' : 'wrong');
      ui.done();
    }
  });

  it('bands are ordered, cover 0-100% and use the shown rounding', () => {
    expect(E.mcSurvivalBand(99, 200).index).toBe(1); // 49.5% shows as 50%
    expect(E.mcSurvivalBand(98, 200).index).toBe(0);
    expect(E.mcSurvivalBand(179, 200).index).toBe(3); // 89.5% shows as 90%
    expect(E.mcSurvivalBand(200, 200).index).toBe(3);
    expect(E.mcSurvivalBand(0, 200).index).toBe(0);
  });
});

describe('AI tutor: no XP for asking', () => {
  it('asking a question pays nothing', async () => {
    const xp = vi.fn();
    const ui = mount({ showAdvisor: true, advisorInput: 'What is inflation?' }, { awardXP: xp, callGemini: () => Promise.resolve('Inflation is a general rise in prices over time, so each dollar buys less.') });
    await act(async () => { ui.host.querySelector('#econ-advisor-ask').click(); await new Promise((r) => setTimeout(r, 0)); });
    expect(ui.box.data.advisorAnswer).toMatch(/Inflation is a general rise/);
    expect(xp).not.toHaveBeenCalled();
    expect(SRC).not.toContain("addXP(10, 'Asked an economics question')");
    ui.done();
  });

  it('an own-words explanation pays once per session; short or copied ones pay nothing', () => {
    const answer = 'Inflation is a general rise in prices over time, so each dollar buys less. Central banks raise interest rates to slow it down.';
    expect(E.tutorExplainCheck('prices go up', answer, 'What is inflation?').reason).toBe('short');
    expect(E.tutorExplainCheck('Inflation is a general rise in prices over time, so each dollar buys less than before', answer, 'What is inflation?').reason).toBe('copied');
    expect(E.tutorExplainCheck('My cat sleeps on the couch all day long and then she eats a lot of food', answer, 'What is inflation?').reason).toBe('offtopic');
    const mine = 'When things cost more each year, my money buys fewer things, and banks can raise interest rates to cool that inflation.';
    expect(E.tutorExplainCheck(mine, answer, 'What is inflation?').ok).toBe(true);
    const xp = vi.fn();
    const ui = mount({ showAdvisor: true, advisorAnswer: answer, advisorQuestion: 'What is inflation?', advisorExplain: mine }, { awardXP: xp, callGemini: () => Promise.resolve('') });
    const check = () => ui.button(/Check my explanation/);
    ui.click(check());
    expect(xp).toHaveBeenCalledTimes(1);
    expect(xp.mock.calls[0][1]).toBe(5);
    ui.click(check());
    expect(xp).toHaveBeenCalledTimes(1);
    expect(ui.host.textContent).toMatch(/paid once per session/);
    ui.done();
  });
});

describe('business sim: a relaunch asks for break-even again but never pays twice', () => {
  function openLemonade(ui) { ui.click(ui.buttons().find((b) => /Sunny Squeeze Lemonade/.test(b.textContent))); }
  it('asks again after a relaunch of the same business; the second right answer pays nothing', () => {
    const xp = vi.fn();
    const ui = mount({ econTab: 'entrepreneur' }, { awardXP: xp });
    openLemonade(ui);
    const keyBtn = () => {
      const q = E.bizBreakEvenChoices(ui.box.data.enBusiness, {}, {});
      return Array.from(ui.host.querySelector('[data-economicslab-be-predict]').querySelectorAll('button')).find((b) => b.textContent.startsWith(q.correct + ' '));
    };
    ui.click(keyBtn());
    expect(xp).toHaveBeenCalledTimes(1);
    expect(ui.host.querySelector('[data-economicslab-breakeven]').getAttribute('data-economicslab-breakeven')).toBe('shown');
    // Close the business and open the same one again.
    ui.click(ui.button(/Close Business & Start New/));
    openLemonade(ui);
    expect(ui.host.querySelector('[data-economicslab-breakeven]').getAttribute('data-economicslab-breakeven')).toBe('hidden');
    expect(ui.host.querySelector('[data-economicslab-be-predict]')).toBeTruthy();
    ui.click(keyBtn());
    expect(xp).toHaveBeenCalledTimes(1);
    ui.done();
  });
});
