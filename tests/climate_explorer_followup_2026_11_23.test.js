// Climate Explorer, 2026-11-23 follow-up ("make everything as accurate as possible").
// 1. Habit tracker: every per-unit kg is worked out from a sourced factor with the assumption stated
//    (EPA Hub 2025 Tables 1/9/10, EIA, Poore & Nemecek 2018 via OWID, DOE 10 CFR 430.32, IEA, Apple,
//    Levi Strauss). Habits with no primary source keep their slider but are not counted (no number).
// 2. Units: the 4-question total mixes CO2 (travel, power) with CO2e (food, trash), so it says CO2e.
// 3. Data Diver, Scenario Tester and Justice Explorer come from one evidence answer each, not clicks.
// CLIMATE_TOOL_FILE=C:/tmp/sports_labs_1123/climateExplorer/start_r4.js runs these on the earlier copy (they fail there).
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.CLIMATE_TOOL_FILE || 'stem_lab/stem_tool_climateExplorer.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
const render = (state = {}) => renderTool('climateExplorer', { climateExplorer: state }, {});
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function newStore(initial) {
  const store = { toolData: initial };
  store.set = (u) => { store.toolData = typeof u === 'function' ? u(store.toolData) : u; };
  return store;
}
function tree(store) {
  const tool = window.StemLab._registry.climateExplorer;
  return tool.render({
    React: window.React, toolData: store.toolData, setToolData: store.set, setStemLabTool() {},
    t: (k, fb) => (fb == null ? k : fb), icons: new Proxy({}, { get: () => () => null }),
    awardXP() {}, addToast() {}, announceToSR() {}, gradeLevel: '6th Grade'
  });
}
function find(node, pred) {
  let found = null;
  (function walk(n) {
    if (found || n == null || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props && pred(n.props)) { found = n; return; }
    if (n.props) walk(n.props.children);
  })(node);
  return found;
}
function click(store, id) {
  const btn = find(tree(store), (p) => p.id === id);
  if (!btn) throw new Error('no element #' + id);
  btn.props.onClick({ preventDefault() {}, currentTarget: {} });
}
const ce = (store) => store.toolData.climateExplorer;
// Round 6: the habits with no reliable number moved into their own disclosure ('uncounted').
const ALL_OPEN = { transport: true, food: true, energy: true, digital: true, shopping: true, waste: true, uncounted: true };
function impact(freq, id) {
  const html = render({ tab: 'carbon', granularExpanded: ALL_OPEN, granularFreq: freq });
  const m = html.match(new RegExp('id="ce-carbon-habit-impact-' + id + '"[^>]*>([\\s\\S]*?)</div></div>'));
  return m ? text(m[1]).trim() : null;
}

beforeEach(() => { resetStemLab(); loadTool(TOOL, 'climateExplorer'); });

describe('habit tracker kg are worked out from sourced factors', () => {
  const r1 = (x) => Math.round(x * 10) / 10;
  const MI = 25 / 1.609344, GRID = 0.81 * 0.45359237, THERM = 5.306;
  const yearly = (kg, perWeek = 1) => Math.round(kg * perWeek * 52).toLocaleString('en-US') + ' kg/yr';
  it.each([
    ['car_solo', 'EPA 400 g CO2 per mile, 25 km', r1(0.4 * MI)],
    ['bus', 'EPA Hub 2025: bus 0.066 kg per passenger-mile', r1(0.066 * MI)],
    ['train', 'EPA Hub 2025: transit rail 0.093 kg per passenger-mile', r1(0.093 * MI)],
    ['ev', '30 kWh per 100 miles at EIA 0.81 lb/kWh', r1(0.3 * MI * GRID)],
    ['beef', 'Poore & Nemecek 99.48 kg/kg, 100 g', r1(9.948)],
    ['lamb', '39.72 kg/kg, 100 g', r1(3.972)],
    ['chicken', 'poultry 9.87 kg/kg, 100 g', r1(0.987)],
    ['vegetarian', 'eggs 4.67 kg/kg, 100 g', r1(0.467)],
    ['vegan', 'tofu 3.16 kg/kg, 100 g', r1(0.316)],
    ['foodwaste', 'a third of a day of the 2,060 kg/yr medium-meat diet', r1(2060 / 365 / 3)],
    ['heat_gas', '0.3 therm at 53.06 kg/mmBtu', r1(0.3 * THERM)],
    ['heat_pump', 'same 30,000 Btu at COP 3', r1(30000 / 3412.14 / 3 * GRID)],
    ['ac', '36,000 Btu/h at SEER2 13.4', r1(36000 / 13.4 / 1000 * GRID)],
    ['shower', '25 gal warmed 60 F by gas', r1(25 * 8.34 * 60 / 1e5 * THERM)],
    ['dryer', 'DOE CEF 3.73 lb/kWh on an 8.45 lb load', r1(8.45 / 3.73 * GRID)],
    ['dishwasher', 'DOE 307 kWh/yr over 215 cycles', r1(307 / 215 * GRID)],
    ['landfill', 'WARM 0.58 t per short ton, 15 lb bag', r1(15 / 2000 * 580)],
    ['recycle', 'WARM 0.09 t per short ton, 15 lb bag', r1(15 / 2000 * 90)]
  ])('%s: %s', (id, _why, perUnit) => {
    const f = {}; f[id] = 1;
    expect(impact(f, id)).toContain(yearly(perUnit));
  });
  it('flights are round trips at EPA medium and long haul factors (CO2 only)', () => {
    const short = Math.round(2 * 1500 / 1.609344 * 0.129 / 10) * 10, long = Math.round(2 * 8000 / 1.609344 * 0.163 / 10) * 10;
    expect([short, long]).toEqual([240, 1620]);
    expect(impact({ flight_short: 1 }, 'flight_short')).toContain(short + ' kg/yr');
    expect(impact({ flight_long: 1 }, 'flight_long')).toContain(long.toLocaleString('en-US') + ' kg/yr');
    const html = text(render({ tab: 'carbon', granularExpanded: ALL_OPEN }));
    expect(html).toContain('Round-trip flight (8,000 km each way)');
    expect(html).toContain('One long round trip: about 1,620 kg of CO₂ (EPA: 163 g per passenger-mile). That is 70% of the 2.3 t yearly 1.5°C share.');
    expect(html).toContain('about 3 times as much as the CO₂ alone (Lee et al., 2021)');
  });
  it('makers’ own reports for phone, laptop and jeans', () => {
    expect(impact({ smartphone: 1 }, 'smartphone')).toContain('56 kg/yr');
    expect(impact({ laptop: 1 }, 'laptop')).toContain('120 kg/yr');
    expect(impact({ jeans: 1 }, 'jeans')).toContain('33 kg/yr');
  });
  it('habits with no primary source are tracked but not counted, and show no number', () => {
    const none = ['stream_4k', 'gaming', 'videocall', 'pc_work', 'ai_video', 'ai_voice', 'ai_code', 'tshirt', 'online_order', 'fastfashion', 'bottled_water'];
    const freq = {}; none.forEach((id) => { freq[id] = 3; });
    none.forEach((id) => expect(impact(freq, id)).toBe('Not counted: no reliable number found yet'));
    const html = text(render({ tab: 'carbon', granularExpanded: ALL_OPEN, granularFreq: freq }));
    expect(html).toContain('0.00 t CO₂e/yr');
    expect(html).toContain('11 habits have no reliable number yet, so they are tracked but not counted.');
  });
  it('recycling and compost are small positive amounts, not negative', () => {
    expect(SRC).not.toContain('Negative! Recycling avoids emissions.');
    expect(impact({ compost: 1 }, 'compost')).toContain(yearly(r1(15 / 2000 * 110)));
    const html = text(render({ tab: 'carbon', granularExpanded: ALL_OPEN }));
    expect(html).toContain('Sending a bag to recycling instead of the landfill cuts about 3.7 kg.');
  });
  it('never suggests fewer recycling or compost bags as a cut (that trash would go to the landfill)', () => {
    expect(impact({ recycle: 7, compost: 7 }, 'recycle')).not.toContain('if cut 1');
    expect(impact({ recycle: 7, compost: 7 }, 'compost')).not.toContain('if cut 1');
    const html = text(render({ tab: 'carbon', granularExpanded: ALL_OPEN, granularFreq: { recycle: 7, compost: 7 } }));
    expect(html).not.toMatch(/Cut recycling|Cut composting/);
    expect(render({ tab: 'carbon', granularExpanded: ALL_OPEN, granularFreq: { recycle: 7, compost: 7 } })).not.toContain('ce-carbon-pledge-toggle-recycle');
  });
  it('old unsourced claims are gone; methane uses IPCC AR6', () => {
    for (const s of ['Aviation has 2-3× warming impact', 'One long-haul round-trip = ~3 tons', '60 kg CO₂e per kg of beef', 'Moderate — 7 kg CO₂e/kg.',
      'Food waste = 8% of global emissions.', 'Camera-off reduces by ~95%.', 'Rough estimate: few public measurements', 'Denmark gets 55% of electricity',
      'Saves up to 1,200 kg', 'Solar capacity doubles every 2-3 years', "'- Global average: **4.5 t** per person'"]) expect(SRC).not.toContain(s);
    expect(SRC).not.toMatch(/Landfills produce methane \(28/);
    expect(SRC).not.toMatch(/methane \(28\\u00D7 more potent/);
    const html = text(render({ tab: 'carbon', granularExpanded: ALL_OPEN }));
    expect(html).toContain('over 100 years it warms about 27 times as much as the same mass of CO₂ (IPCC, 2021)');
  });
  it('the meatless-meal action uses the tracker values', () => {
    // (beef 9.9 - vegetarian 0.5) x 52
    expect(Math.round((9.9 - 0.5) * 52)).toBe(489);
    expect(SRC).toContain("Math.round((GRANULAR_ITEMS.food[0].kg - GRANULAR_ITEMS.food[6].kg) * 52)");
  });
});

describe('the 4-question footprint is labeled CO2e', () => {
  const answered = { tab: 'carbon', ccTransport: 2, ccFood: 1, ccEnergy: 1, ccWaste: 1, ccPrediction: { pick: 'energy', sig: '2,1,1,1' } };
  it('total, scale total, donut label and benchmark note', () => {
    const html = text(render(answered));
    expect(html).toContain('Estimated total: 4,470 kg CO₂e per year.');
    expect(html).toContain('thousand metric tons CO₂e/yr');
    expect(html).toContain('Your answers are counted in CO₂e');
    expect(html).not.toMatch(/kg CO₂ per year/);
    expect(SRC).toMatch(/c\.fillText\('kg CO\\u2082e\/yr', cx, cy \+ 12\)/);
    expect(SRC).toContain("' kilograms CO2e per year (CO2 plus other greenhouse gases counted as CO2). '");
  });
});

describe('Data Diver: explain how the scale totals grow', () => {
  const answered = { tab: 'carbon', ccTransport: 2, ccFood: 1, ccEnergy: 1, ccWaste: 1, ccPrediction: { pick: 'energy', sig: '2,1,1,1' } };
  it('trying all 3 views earns nothing', () => {
    const store = newStore({ climateExplorer: Object.assign({}, answered) });
    click(store, 'ce-carbon-scale-city'); click(store, 'ce-carbon-scale-country'); click(store, 'ce-carbon-scale-school');
    expect(ce(store).scalesViewed).toEqual({ city: true, country: true, school: true });
    expect((ce(store).badges || {}).dataDiver).toBeUndefined();
  });
  it('a wrong ratio says why; the right one (330,000,000 / 100,000 = 3,300) earns the badge', () => {
    const store = newStore({ climateExplorer: Object.assign({}, answered) });
    const opts = find(tree(store), (p) => p.id === 'ce-carbon-scale-check').props.children[2].props.children.map((b) => b.props.id);
    expect(opts).toEqual(['ce-carbon-scale-check-opt-330', 'ce-carbon-scale-check-opt-33', 'ce-carbon-scale-check-opt-33000', 'ce-carbon-scale-check-opt-3300']);
    click(store, 'ce-carbon-scale-check-opt-330');
    expect((ce(store).badges || {}).dataDiver).toBeUndefined();
    expect(text(render(ce(store)))).toContain('Not quite: 330 is 10 times too small.');
    click(store, 'ce-carbon-scale-check-opt-3300');
    expect(ce(store).badges.dataDiver).toBeGreaterThan(0);
    expect(text(render(ce(store)))).toContain('330,000,000 ÷ 100,000 = 3,300');
    // The ratio matches the two displayed totals.
    const city = text(render(Object.assign({}, answered, { ccScale: 'city' }))).match(/([\d.,]+) thousand metric tons CO₂e/)[1];
    const country = text(render(Object.assign({}, answered, { ccScale: 'country' }))).match(/([\d.,]+) thousand metric tons CO₂e/)[1];
    expect(Math.round(Number(country.replace(/,/g, '')) / Number(city))).toBe(3300);
  });
});

describe('Scenario Tester: predict which mix stays Reliable, then test all 4', () => {
  const tryAll = (store) => [0, 1, 2, 3].forEach((i) => click(store, 'ce-renewables-preset-' + i));
  it('testing all 4 without a prediction earns nothing', () => {
    const store = newStore({ climateExplorer: { tab: 'renewables' } });
    tryAll(store);
    expect((ce(store).badges || {}).scenarioTester).toBeUndefined();
    expect(text(render(ce(store)))).toContain('You tried all 4 starting mixes. Which ONE was Reliable');
  });
  it('the only Reliable preset comes from the reliability model; predict then test earns it', () => {
    const store = newStore({ climateExplorer: { tab: 'renewables' } });
    click(store, 'ce-renewables-check-opt-0');
    let html = text(render(ce(store)));
    // 100% Solar: 100 x 0.15 = 15, no storage. Wind-Powered Future: 43.5 + min(70, 49.5) x 0.85 = 85.6 -> 86.
    expect(html).toContain('Not this one. 100% Solar City scores 15 of 100 for firm power (0 storage points).');
    expect(html).toContain('The Reliable one: Wind-Powered Future scores 86 of 100 for firm power (55 storage points).');
    expect(find(tree(store), (p) => p.id === 'ce-renewables-check-opt-2')).toBeNull(); // a prediction is locked
    expect((ce(store).badges || {}).scenarioTester).toBeUndefined();
    tryAll(store);
    expect(ce(store).badges.scenarioTester).toBeGreaterThan(0);
  });
  it('after trying all 4 first, only the right answer earns it', () => {
    const store = newStore({ climateExplorer: { tab: 'renewables', scenariosTried: { 0: true, 1: true, 2: true, 3: true } } });
    click(store, 'ce-renewables-check-opt-1');
    expect((ce(store).badges || {}).scenarioTester).toBeUndefined();
    expect(text(render(ce(store)))).toContain('Balanced Green Mix scores 71 of 100');
    click(store, 'ce-renewables-check-opt-2');
    expect(ce(store).badges.scenarioTester).toBeGreaterThan(0);
  });
});

describe('Justice Explorer: use the emissions evidence', () => {
  it('opening region cards earns nothing', () => {
    expect(SRC).not.toMatch(/Object\.keys\(nv\)\.length >= 5\) earnBadge\('justiceExplorer'\)/);
  });
  it('a wrong group gets the numbers; the smallest share (Pacific, 0.03%) earns the badge', () => {
    const store = newStore({ climateExplorer: { tab: 'justice' } });
    const opts = find(tree(store), (p) => p.id === 'ce-justice-check').props.children[2].props.children.map((b) => b.props.id);
    expect(opts).toEqual(['ce-justice-check-opt-bangladesh', 'ce-justice-check-opt-pacific', 'ce-justice-check-opt-seasia']);
    click(store, 'ce-justice-check-opt-bangladesh');
    expect(text(render(ce(store)))).toContain('Bangladesh & South Asia make about 0.3% of the world’s CO₂, about 10 times the Pacific Island Nations share of 0.03%.');
    expect((ce(store).badges || {}).justiceExplorer).toBeUndefined();
    click(store, 'ce-justice-check-opt-pacific');
    expect(ce(store).badges.justiceExplorer).toBeGreaterThan(0);
    expect(text(render(ce(store)))).toContain('Pacific Island Nations make about 0.03% of the world’s CO₂ but face extreme risk.');
  });
});

describe('badges earned the old way are kept', () => {
  it('saved Data Diver, Scenario Tester and Justice Explorer still show as earned', () => {
    const html = text(render({ tab: 'carbon', badgesOpen: true, badges: { dataDiver: 1795000000000, scenarioTester: 1795000000000, justiceExplorer: 1795000000000 } }));
    for (const name of ['Data Diver', 'Scenario Tester', 'Justice Explorer']) expect(html).toMatch(new RegExp(name + '[\\s\\S]{0,200}Earned'));
  });
});
