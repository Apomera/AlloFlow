// Economics Lab — the numbers and the model a student is taught from.
//
// Audited 2026-09-21 against published figures and standard macro. Everything
// held, which is worth PINNING rather than just noting: these are the constants
// a well-meaning tuning pass breaks silently, and the tool states several of
// them to the learner in prose as well as using them in its simulation.
//
// The checks that matter are the RELATIONSHIPS, not the coefficients. A model
// whose rate hikes raise inflation would teach the opposite of the truth while
// every individual number still looked defensible.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_economicslab.js', 'utf8');

// Pull the one-year step out of advanceYear so the model can be driven
// directly, rather than restating its arithmetic here where it would rot.
function macroStep() {
  const open = SRC.indexOf('var advanceYear = function () {');
  expect(open, 'advanceYear not found — did the macro sim change shape?').toBeGreaterThan(-1);
  const body = SRC.slice(open, SRC.indexOf('unempNew = Math.round', open));

  const grab = (name) => {
    const m = new RegExp('var ' + name + ' = ([^;]+);').exec(body);
    expect(m, name + ' not found in advanceYear').toBeTruthy();
    return m[1];
  };

  // Shock and noise are deliberately excluded: they are random, and the
  // relationships under test are about the DETERMINISTIC policy response.
  const demand = grab('demandImpulse');
  const gdp = grab('gdpNew').replace(/\s*\+\s*\(shock \? shock\.gdp : 0\)/, '')
    .replace(/\s*\+\s*\(Math\.random\(\) - 0\.5\) \* [\d.]+/, '');
  const inf = grab('infNew').replace(/\s*\+\s*\(shock \? shock\.inf : 0\)/, '')
    .replace(/\s*\+\s*\(Math\.random\(\) - 0\.5\) \* [\d.]+/, '');
  const unemp = grab('unempNew').replace(/\s*\+\s*\(shock \? shock\.unemp : 0\)/, '');

  // eslint-disable-next-line no-new-func
  return new Function('s', 'p', `
    var mClamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
    var mSpend = p.spend, mTax = p.tax, mRate = p.rate, mNeutral = p.neutral;
    var macroGDP = s.gdp, macroInflation = s.inf, macroUnemployment = s.unemp;
    var demandImpulse = ${demand};
    var gdpNew = ${gdp};
    var infNew = ${inf};
    var unempNew = ${unemp};
    return { gdp: gdpNew, inf: infNew, unemp: unempNew };
  `);
}

const BASE = { gdp: 2.2, inf: 2.5, unemp: 4.5 };
const NEUTRAL = 3;

function run(policy, years = 12) {
  const step = macroStep();
  let s = { ...BASE };
  for (let i = 0; i < years; i++) {
    s = step(s, { spend: 0, tax: 0, rate: NEUTRAL, neutral: NEUTRAL, ...policy });
  }
  return s;
}

describe('the macro model teaches the right direction', () => {
  const nothing = () => run({});

  it('stimulus raises output and inflation and lowers unemployment', () => {
    const base = nothing();
    const stim = run({ spend: 2 });
    expect(stim.gdp).toBeGreaterThan(base.gdp);
    expect(stim.inf).toBeGreaterThan(base.inf);
    expect(stim.unemp).toBeLessThan(base.unemp);
  });

  it('austerity and tax rises lower output', () => {
    const base = nothing();
    expect(run({ spend: -2 }).gdp).toBeLessThan(base.gdp);
    expect(run({ tax: 2 }).gdp).toBeLessThan(base.gdp);
  });

  it('rate hikes cool the economy and rate cuts heat it', () => {
    const base = nothing();
    const hike = run({ rate: NEUTRAL + 3 });
    const cut = run({ rate: NEUTRAL - 3 });
    expect(hike.gdp).toBeLessThan(base.gdp);
    expect(hike.inf).toBeLessThan(base.inf);
    expect(cut.inf).toBeGreaterThan(base.inf);
  });

  it('settles somewhere a real economy could be when left alone', () => {
    // A model that drifts to 9% inflation with no policy at all would teach
    // that the default state of an economy is a crisis.
    const s = nothing();
    expect(s.gdp).toBeGreaterThan(0);
    expect(s.gdp).toBeLessThan(5);
    expect(s.inf).toBeGreaterThan(0);
    expect(s.inf).toBeLessThan(6);
    expect(s.unemp).toBeGreaterThan(2);
    expect(s.unemp).toBeLessThan(10);
  });

  it('keeps Okun\'s coefficient inside the published range', () => {
    // unemployment moves -k per point of GDP above trend. Published estimates
    // run 0.3-0.5 for the US; outside that the sim teaches a false sensitivity.
    const m = /macroUnemployment - ([\d.]+) \* \(gdpNew - ([\d.]+)\)/.exec(SRC);
    expect(m, 'the Okun term was not found').toBeTruthy();
    const k = Number(m[1]);
    const trend = Number(m[2]);
    expect(k).toBeGreaterThanOrEqual(0.3);
    expect(k).toBeLessThanOrEqual(0.5);
    // Trend growth the sim measures against: US real trend is ~1.8-2.2%.
    expect(trend).toBeGreaterThanOrEqual(1.5);
    expect(trend).toBeLessThanOrEqual(2.5);
  });
});

describe('the figures the tool states to a learner', () => {
  it('computes its own compound-interest example correctly', () => {
    // '$1,000 at 7% for 30 years = $7,612'
    const m = /\$1,000 at (\d+)% for (\d+) years = \$([\d,]+)/.exec(SRC);
    expect(m, 'the compound interest line was not found').toBeTruthy();
    const got = 1000 * Math.pow(1 + Number(m[1]) / 100, Number(m[2]));
    expect(Math.round(got)).toBe(Number(m[3].replace(/,/g, '')));
  });

  it('gives a balanced portfolio that adds up to 100%', () => {
    const m = /(\d+)% stocks, (\d+)% bonds, (\d+)% cash/.exec(SRC);
    expect(m, 'the balanced-mix line was not found').toBeTruthy();
    expect(Number(m[1]) + Number(m[2]) + Number(m[3])).toBe(100);
  });

  it('states the Fisher relation the same way it computes it', () => {
    // The learner is told "real rate = nominal - inflation". The code must not
    // quietly do something else.
    expect(SRC).toContain('var mRealRate = mRate - macroInflation;');
    // The prose uses a Unicode MINUS (U+2212), not a hyphen, so match on the
    // words either side rather than the sign.
    expect(SRC).toMatch(/Real rate = nominal/);
    expect(SRC).toMatch(/inflation = /);
  });

  it('gets the comparative-advantage question right', () => {
    // A can make 100 cars OR 50 computers; B can make 80 OR 80. Opportunity
    // cost of one computer: A = 2 cars, B = 1 car, so B has the advantage in
    // computers. This is the question students are most often taught wrongly.
    const m = /Country A can make (\d+) cars OR (\d+) computers[\s\S]{0,400}?correct: (\d+)/.exec(SRC);
    expect(m, 'the comparative advantage item was not found').toBeTruthy();
    const aCars = Number(m[1]);
    const aComputers = Number(m[2]);
    const bm = /Country B can make (\d+) cars OR (\d+) computers/.exec(SRC);
    expect(bm).toBeTruthy();
    const costA = aCars / aComputers;
    const costB = Number(bm[1]) / Number(bm[2]);
    // options are ['Country A', 'Country B', ...]; index 1 means Country B.
    const expected = costB < costA ? 1 : 0;
    expect(Number(m[3])).toBe(expected);
  });

  it('marks paying down 22% APR debt as the best guaranteed return', () => {
    // No listed investment in this tool returns anywhere near 22%, so the
    // graded answer has to be the debt. If a future edit lowered the APR below
    // the stock return, the "correct" answer would stop being correct.
    const m = /\$([\d,]+) in credit card debt at (\d+)% APR[\s\S]{0,300}?correct: (\d+)/.exec(SRC);
    expect(m, 'the tax-refund item was not found').toBeTruthy();
    const apr = Number(m[2]);
    const stock = /Stocks: ~(\d+)% return/.exec(SRC);
    expect(stock).toBeTruthy();
    expect(apr, 'the APR no longer beats the stated stock return').toBeGreaterThan(Number(stock[1]));
    // options are ['Invest in stocks', 'Pay off credit card debt', ...]
    expect(Number(m[3])).toBe(1);
  });
});
