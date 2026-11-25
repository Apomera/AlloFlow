// Renewables Lab accuracy audit (2026-11-24). Pins the sourced numbers that replaced unsourced or wrong ones,
// the computed (model-derived) figures, the quiz "why your pick is off" feedback, and the wind predict-first step.
// Fail-first check: RENEWABLES_FILE=<path to the pre-audit copy> npx vitest run tests/renewables_accuracy_audit_2026_11_24.test.js
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RENEWABLES_FILE ? path.resolve(process.env.RENEWABLES_FILE) : 'stem_lab/stem_tool_renewables.js';
const src = fs.readFileSync(FILE, 'utf8');
const stub = (k, fb) => fb;

function extractArray(marker, name, prelude) {
  const start = src.indexOf(marker);
  expect(start, marker).toBeGreaterThan(-1);
  const end = src.indexOf('];', start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', (prelude || '') + src.slice(start, end + 2) + '\nreturn ' + name + ';')(stub);
}
function fnSource(name) {
  const start = src.indexOf('function ' + name + '(');
  expect(start, name).toBeGreaterThan(-1);
  return src.slice(start, src.indexOf('\n  }\n', start) + 4);
}
function unescape(html) {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function render(state) {
  return unescape(renderTool('renewablesLab', { renewablesLab: state }));
}

describe('comparison table uses sourced values', () => {
  const rows = extractArray('var COMPARE_TABLE = [', 'COMPARE_TABLE');
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  it('lifecycle CO2 = IPCC AR5 Annex III medians (ocean was 8 g, the AR5 median is 17 g)', () => {
    expect(byId.waveTidal.co2).toBe('17 g');
    expect(byId.solarPv.co2).toBe('41–48 g');
    expect(byId.wind.co2).toBe('11–12 g');
    expect(byId.hydro.co2).toBe('24 g');
    expect(byId.geothermal.co2).toBe('38 g');
    expect(byId.solarThermal.co2).toBe('27 g');
    expect(byId.biomass.co2).toBe('230 g');
    expect(byId.nuclear.co2).toBe('12 g');
    expect(byId.gas.co2).toBe('490 g');
    expect(byId.coal.co2).toBe('820 g');
    expect(src).not.toMatch(/IPCC AR6 WG3 Annex III/);
  });

  it('capacity factors are the EIA 2024 US fleet values', () => {
    expect(byId.solarPv.cf).toBe('23%');
    expect(byId.wind.cf).toBe('34%');
    expect(byId.hydro.cf).toBe('35%');
    expect(byId.geothermal.cf).toBe('65%');
    expect(byId.nuclear.cf).toBe('91%');
    expect(byId.coal.cf).toBe('43%');
  });

  it('costs are Lazard 2026 unsubsidized ranges', () => {
    expect(byId.solarPv.lcoe).toBe('$40–98');
    expect(byId.nuclear.lcoe).toBe('$175–255 (new US)');
    expect(byId.gas.lcoe).toBe('$51–129');
    expect(byId.coal.lcoe).toBe('$72–177');
  });
});

describe('numbers the tool shows come from its own model', () => {
  it('AI ground truth hydro line equals P = rho g h Q for Q = 0.1 m3/s, h = 5 m (old text said ~3.5 kW gross)', () => {
    // eslint-disable-next-line no-new-func
    const hydroPowerWatts = new Function(fnSource('hydroPowerWatts') + '\nreturn hydroPowerWatts;')();
    const gt = extractArray('var AI_GROUND_TRUTH = [', 'AI_GROUND_TRUTH', fnSource('hydroPowerWatts') + '\n');
    const kw = Math.round(hydroPowerWatts(5, 0.1, 1) / 100) / 10;
    expect(kw).toBe(4.9);
    expect(gt.join('\n')).toContain('carries about ' + kw + ' kW before losses');
    expect(gt.join('\n')).not.toMatch(/text-to-911/);
    expect(gt.join('\n')).not.toMatch(/30% through 2032/);
  });

  it('EV-battery days of home use are computed from the EIA average home (old text said 4–7 days)', () => {
    const concepts = extractArray('var SMART_GRID_CONCEPTS = [', 'SMART_GRID_CONCEPTS', 'var RN_US_HOME_KWH_YR = 10791;\n');
    const v2g = concepts.find((c) => c.id === 'v2g');
    expect(v2g.why).toContain('about 2–3 days');
    expect(v2g.why).not.toMatch(/4–7 days/);
  });

  it('heat-pump CO2 comparison is computed from ISO-NE and EPA factors', () => {
    const start = src.indexOf('var RN_HP_GRID_G_PER_KWH');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('\n  };\n', src.indexOf('var HEAT_PUMP_FACTS = {')) + 5;
    // eslint-disable-next-line no-new-func
    const hp = new Function(src.slice(start, end) + '\nreturn HEAT_PUMP_FACTS;')();
    const line = hp.maine.join(' ');
    expect(line).toContain('about 254 g of CO₂ per kWh');
    expect(line).toContain('about 100 g per kWh of heat');
    expect(line).toContain('makes about 300 g');
  });

  it('home solar calculator uses current inputs: no expired federal credit, no rebate that does not exist', () => {
    expect(src).toMatch(/var mhRebatePct = \(typeof d\.mhRebatePct === 'number' && isFinite\(d\.mhRebatePct\)\) \? d\.mhRebatePct : 0;/);
    expect(src).toContain('var ELECTRIC_RATE = 0.30;');
    expect(src).toContain('var EFFICIENCY_MAINE_REBATE = 0;');
    expect(src).not.toContain('30% through 2032 under current law');
    expect(src).not.toContain("' − ITC − $800 EM rebate'");
  });
});

describe('removed or corrected claims stay out', () => {
  const gone = [
    'Maine has text-to-911 statewide',
    'BOEM’s 2024 lease area covers 13.7M acres',
    'Visible from Yorkshire',
    '174 turbines, each 8 MW',
    'converts CH₂ into CO₂',
    'wind turbines kill ~500K birds/yr',
    '~95% of hydrogen produced today is "gray"',
    'can hit a COP of 3 even at −15°C',
    'Working in some places (offshore wind in WV port towns)',
    'the grid grew 4× from 1950 to 2000',
    'IRA Justice40 mandates 40%',
    'Pumped hydro is 95% of installed storage globally'
  ];
  it.each(gone)('does not say: %s', (phrase) => {
    expect(src).not.toContain(phrase);
  });
});

describe('quiz feedback explains wrong picks', () => {
  const raw = extractArray('var QUIZ = [', 'QUIZ');

  it('every question has one short reason per wrong choice and none on the right one', () => {
    raw.forEach((q) => {
      expect(Array.isArray(q.miss), q.id).toBe(true);
      expect(q.miss.length, q.id).toBe(q.choices.length);
      q.miss.forEach((m, i) => {
        if (i === q.correct) expect(m, q.id).toBeNull();
        else expect(typeof m === 'string' && m.length > 10, q.id + ' choice ' + i).toBe(true);
      });
    });
  });

  it('the load-time rotation keeps each reason attached to its choice', () => {
    const clone = JSON.parse(JSON.stringify(raw));
    const start = src.indexOf('// The authored bank put 72%');
    const end = src.indexOf('})();', start);
    // eslint-disable-next-line no-new-func
    new Function('QUIZ', src.slice(start, end + 5))(clone);
    raw.forEach((q, qi) => {
      q.choices.forEach((c, i) => {
        const j = clone[qi].choices.indexOf(c);
        expect(clone[qi].miss[j], q.id).toBe(q.miss[i]);
      });
    });
  });
});

describe('rendered views', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, 'renewablesLab');
  });

  it('a wrong quiz answer shows why that pick is off', () => {
    const quiz = extractArray('var QUIZ = [', 'QUIZ');
    const start = src.indexOf('// The authored bank put 72%');
    // eslint-disable-next-line no-new-func
    new Function('QUIZ', src.slice(start, src.indexOf('})();', start) + 5))(quiz);
    const q = quiz[0];
    const wrong = q.correct === 0 ? 1 : 0;
    const html = render({ view: 'quiz', quizState: { idx: 0, score: 0, answered: true, lastChoice: wrong } });
    expect(html).toContain('Why your pick is off:');
    expect(html).toContain(q.miss[wrong]);
    const right = render({ view: 'quiz', quizState: { idx: 0, score: 1, answered: true, lastChoice: q.correct } });
    expect(right).not.toContain('Why your pick is off:');
  });

  it('wind view asks for a prediction before it explains v³', () => {
    const html = render({ view: 'wind' });
    expect(html).toContain('Predict first');
    expect(html).not.toContain('Why wind power scales with v³');
    expect(html).toContain('opens after you make a prediction');
  });

  it('after a prediction the ratio comes from windPowerWatts', () => {
    const html = render({ view: 'wind', windPredict: 4 });
    expect(html).toContain('The model says ×8.0');
    expect(html).toContain('Why wind power scales with v³');
    expect(html).toContain('That counts only one effect');
  });

  it('compare view worked example is computed from the EIA 2024 solar capacity factor', () => {
    const html = render({ view: 'compare' });
    expect(html).toContain('makes about 2.03 GWh in a year');
    expect(html).toContain('you need about 3.9 GW of solar');
    expect(html).not.toContain('1 MW solar farm in Maine generates ~1.7 GWh');
  });
});
