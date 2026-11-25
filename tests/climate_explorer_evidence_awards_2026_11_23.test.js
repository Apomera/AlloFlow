// Climate Explorer, 2026-11-23 decisions pass.
// 1. Awards come from evidence, not clicks: Full Explorer = a prediction in all 3 predict-first activities
//    (was: visit 6 tabs); Action Planner = a saved plan whose savings come from the carbon calculator
//    (was: open a panel); Solution Scholar = Drawdown Sleuth finished with 6+ of 8 (was: open 8 cards).
//    No XP for opening Justice region cards, solution cards or scale views. Badges already saved stay.
// 2. The quick calculator's transport, energy and waste kg are worked out from EPA / EIA factors with
//    the assumptions on screen (they were round teaching numbers: 300 / 1200 / 2000 / 4000 / 1000 ...).
// CLIMATE_TOOL_FILE=C:/tmp/sports_labs_1123/climateExplorer/start_r3.js runs these on the earlier copy.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.CLIMATE_TOOL_FILE || 'stem_lab/stem_tool_climateExplorer.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
const render = (state = {}, ctx = {}) => renderTool('climateExplorer', { climateExplorer: state }, ctx);
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function newStore(initial) {
  const store = { toolData: initial };
  store.set = (u) => { store.toolData = typeof u === 'function' ? u(store.toolData) : u; };
  return store;
}
function tree(store, extra = {}) {
  const tool = window.StemLab._registry.climateExplorer;
  return tool.render({
    React: window.React, toolData: store.toolData, setToolData: store.set, setStemLabTool() {},
    t: (k, fb) => (fb == null ? k : fb), icons: new Proxy({}, { get: () => () => null }),
    awardXP: extra.awardXP || (() => {}), addToast() {}, announceToSR() {}, gradeLevel: '6th Grade'
  });
}
function findById(node, id) {
  let found = null;
  (function walk(n) {
    if (found || n == null || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props && n.props.id === id) { found = n; return; }
    if (n.props) walk(n.props.children);
  })(node);
  return found;
}
function click(store, id, extra) {
  const btn = findById(tree(store, extra), id);
  if (!btn) throw new Error('no element #' + id);
  btn.props.onClick({ preventDefault() {} });
}
const ce = (store) => store.toolData.climateExplorer;

beforeEach(() => { resetStemLab(); loadTool(TOOL, 'climateExplorer'); });

describe('quick calculator values are worked out from sourced factors', () => {
  const kgOf = (cat, i) => {
    const html = render({ tab: 'carbon' });
    const m = html.match(new RegExp('id="ce-carbon-choice-' + cat + '-' + i + '"[\\s\\S]*?(\\d[\\d,]*) kg/yr'));
    return m ? Number(m[1].replace(/,/g, '')) : null;
  };
  it('transport: 5 miles each way x 180 days; EPA car 400 g/mile, bus 66 g per rider-mile; carpool of 3', () => {
    const miles = 2 * 5 * 180;
    expect([0, 1, 2, 3].map((i) => kgOf('transport', i))).toEqual([0, Math.round(miles * 0.066 / 10) * 10, Math.round(miles * 0.4 / 10) * 10, Math.round(miles * 0.4 / 3 / 10) * 10]);
    expect([0, 1, 2, 3].map((i) => kgOf('transport', i))).toEqual([0, 120, 720, 240]);
  });
  it('home power: 10,791 kWh a home (EIA) shared by 3; grid 0.81 lb/kWh, coal 2.31 lb/kWh (EIA 2023)', () => {
    const kwh = 10791 / 3, lb = 0.45359237;
    expect([0, 1, 2].map((i) => kgOf('energy', i))).toEqual([0, Math.round(kwh * 0.81 * lb / 10) * 10, Math.round(kwh * 2.31 * lb / 10) * 10]);
    expect([0, 1, 2].map((i) => kgOf('energy', i))).toEqual([0, 1320, 3770]);
  });
  it('trash: 4.9 lb a person a day (EPA 2018); landfill 0.58, recycle 0.09, compost 0.11 t per short ton (EPA Hub 2025)', () => {
    const tons = 4.9 * 365 / 2000 * 1000;
    expect([0, 1, 2].map((i) => kgOf('waste', i))).toEqual([Math.round(tons * 0.78 / 3 / 10) * 10, Math.round(tons * 1.25 / 3 / 10) * 10, Math.round(tons * 0.58 / 10) * 10]);
    expect([0, 1, 2].map((i) => kgOf('waste', i))).toEqual([230, 370, 520]);
  });
  it('food stays on Scarborough et al. 2014, and the assumptions are on screen', () => {
    expect([0, 1, 2].map((i) => kgOf('food', i))).toEqual([1390, 2060, 2620]);
    const html = text(render({ tab: 'carbon' }));
    expect(html).toContain('How these numbers are worked out');
    expect(html).toContain('a 5-mile trip each way on 180 school days (1,800 miles a year)');
    expect(html).toContain('classroom assumptions, not measurements');
    expect(SRC).not.toContain("'US grid: ~0.4 kg CO\\u2082 per kWh.'");
    expect(SRC).not.toContain('cuts per-person emissions by 50-75%');
  });
});

describe('Full Explorer comes from three predictions, not six tab visits', () => {
  it('opening tabs earns nothing', () => {
    expect(SRC).not.toMatch(/if \(Object\.keys\(nv\)\.length >= 6\) earnBadge\('allTabs'\)/);
    expect(SRC).toContain("'Make a prediction in all 3 predict-first activities: carbon, Keeling Curve and tipping points'");
  });
  it('the third committed prediction earns it; two do not', () => {
    const store = newStore({ climateExplorer: { tab: 'tipping', ccPrediction: { pick: 'food', sig: '2,1,1,1' }, kcPredict: { val: 427, locked: true } } });
    expect((ce(store).badges || {}).allTabs).toBeUndefined();
    click(store, 'ce-tip-predict-3');
    expect(Number.isInteger(ce(store).tpPredict)).toBe(true);
    expect(ce(store).badges.allTabs).toBeGreaterThan(0);
    const two = newStore({ climateExplorer: { tab: 'tipping', kcPredict: { val: 427, locked: true } } });
    click(two, 'ce-tip-predict-3');
    expect((ce(two).badges || {}).allTabs).toBeUndefined();
  });
  it('keeps a Full Explorer badge earned the old way', () => {
    const html = text(render({ tab: 'carbon', badges: { allTabs: 1795000000000 }, badgesOpen: true }));
    expect(html).toMatch(/Full Explorer[\s\S]{0,200}Earned/);
  });
});

describe('Action Planner comes from a plan built on the calculator numbers', () => {
  const answered = { tab: 'carbon', ccTransport: 2, ccFood: 1, ccEnergy: 1, ccWaste: 1, ccPrediction: { pick: 'energy', sig: '2,1,1,1' } };
  it('What Can I Do? no longer earns it', () => {
    expect(SRC).not.toMatch(/if\(!ssShowActions\)earnBadge\('actionPlanner'\)/);
  });
  it('each row and the plan total are the calculator savings; saving the plan earns the badge', () => {
    const store = newStore({ climateExplorer: Object.assign({}, answered) });
    let html = text(render(ce(store)));
    expect(html).toContain('Build your action plan');
    expect(html).toContain('How I get to school: switch to Walk / Bike, save 720 kg');
    expect(html).toContain('What powers my home: switch to Solar / Wind, save 1,320 kg');
    expect(html).toContain('No changes picked yet.');
    click(store, 'ce-carbon-plan-transport');
    click(store, 'ce-carbon-plan-energy');
    html = text(render(ce(store)));
    // 720 + 2060 + 1320 + 370 = 4,470 now; the plan saves 720 + 1,320 = 2,040
    expect(html).toContain('This plan saves 2,040 kg a year: from 4,470 to 2,430 kg.');
    expect((ce(store).badges || {}).actionPlanner).toBeUndefined();
    const award = [];
    click(store, 'ce-carbon-plan-save', { awardXP: (...a) => award.push(a) });
    expect(ce(store).ccPlan).toMatchObject({ cats: ['energy', 'transport'], save: 2040, after: 2430, sig: '2,1,1,1' });
    expect(ce(store).badges.actionPlanner).toBeGreaterThan(0);
    expect(award.map((a) => a.slice(0, 2))).toEqual([['climateExplorer', 15]]);
    expect(text(render(ce(store)))).toContain('Saved plan: 2,040 kg a year less, 2,430 kg in all.');
  });
  it('an empty plan cannot be saved', () => {
    const store = newStore({ climateExplorer: Object.assign({}, answered) });
    const btn = findById(tree(store), 'ce-carbon-plan-save');
    expect(btn.props.disabled).toBe(true);
    btn.props.onClick();
    expect(ce(store).ccPlan).toBeUndefined();
  });
});

describe('no XP for opening things', () => {
  it('Justice region cards, solution cards and scale views give no XP', () => {
    expect(SRC).not.toMatch(/upd\('regionsViewed', nv\);\s*awardXP\(5\);/);
    expect(SRC).not.toMatch(/if\(!nsv\[s\.id\]\)awardXP\(5\);/);
    expect(SRC).not.toContain("awardXPOnce('scale-' + s, 5)");
    expect(SRC).toContain("if (correct) awardXPOnce('ds-round-' + r.id, 5);");
    expect(SRC).toContain("'Finish all 8 Drawdown Sleuth rounds with 6 or more right'");
  });
});
