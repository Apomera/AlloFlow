// Nutrition Lab round 3 (2026-11-24): registered-text drift, predict-first Macro Inquiry on one model, sourced migraine
// triggers, verified NEDA line, cut-first pass on kit body claims.
// Fail-first: NUTRITIONLAB_FILE=C:/tmp/sports_labs_1123/nutritionlab/start_r3.js npx vitest run <this file>
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUTRITIONLAB_FILE || 'stem_lab/stem_tool_nutritionlab.js';
const src = fs.readFileSync(FILE, 'utf8');

let cfg, mounted;
function mount(data) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: Object.assign({}, data) };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); } });
  function Host() { const [, tick] = React.useState(0); bump = () => tick((n) => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab };
  return mounted;
}
const buttons = (view) => [...view.container.querySelectorAll('button')];
beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool(FILE, 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

// Registered ui_strings text wins over a t() fallback, so a key whose fallback differs from its registered text shows stale words.
function registered() {
  const ui = fs.readFileSync('ui_strings.js', 'utf8').split('\n');
  const reg = {};
  const start = ui.findIndex((l) => /^\s*"nutritionlab": \{/.test(l));
  if (start < 0) return reg;
  for (let i = start + 1; i < ui.length; i++) {
    if (/^\s*\},?\s*$/.test(ui[i])) break;
    const m = ui[i].match(/^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/);
    if (m) { try { reg[m[1]] = JSON.parse('"' + m[2] + '"'); } catch (e) { /* skip */ } }
  }
  return reg;
}

describe('registered-text drift', () => {
  it('no registered nutritionlab key is called with a different fallback (the registered text would hide it)', () => {
    const reg = registered();
    expect(Object.keys(reg).length).toBeGreaterThan(100);
    const re = /\(\s*'stem\.nutritionlab\.([A-Za-z0-9_]+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
    const bad = [];
    let m;
    while ((m = re.exec(src))) {
      if (!(m[1] in reg)) continue;
      // eslint-disable-next-line no-eval
      let fb; try { fb = eval("'" + m[2] + "'"); } catch (e) { continue; }
      if (fb !== reg[m[1]]) bad.push(m[1]);
    }
    expect(bad).toEqual([]);
  });
  it('the Macro Inquiry title and card promise a prediction, and the widget delivers one', () => {
    expect(src.includes("'stem.nutritionlab.macro_inquiry_predict_the_energy_state_v2', 'Macro Inquiry — Predict the Energy State'"), "'stem.nutritionlab.macro_inquiry_predict_the_energy_state_v2', 'Macro Inquiry — Predict the Energy State'").toBe(true);
    expect(src.includes("'stem.nutritionlab.predict_energy_state_from_macro_ratios_v2', 'Predict the energy state, then check the model'"), "'stem.nutritionlab.predict_energy_state_from_macro_ratios_v2', 'Predict the energy state, then check the model'").toBe(true);
    expect(/'stem\.nutritionlab\.(predict_energy_state_from_macro_ratios|macro_inquiry_predict_the_energy_state|set_carbohydrate_protein_fat_grams_plu|your_hypothesis_which_macro_most_affec)'/.test(src)).toBe(false);
  });
});

describe('Macro Inquiry model (one function for every number)', () => {
  it('is exported and matches the printed formulas', () => {
    const M = window.StemLab.NutritionMacroModel;
    expect(M && typeof M.model).toBe('function');
    const r = M.model(50, 20, 30, 25);
    const c = 200, p = 80, f = 270, tot = 550;
    expect(r.totalKcal).toBe(tot);
    expect(r.cKcal).toBe(c);
    expect(r.fullness).toBeCloseTo(1.5 * (p / tot * 100) + 0.7 * (f / tot * 100) + 0.3 * (c / tot * 100) + 25, 9);
    expect(r.spike).toBeCloseTo(Math.max(0, Math.min(100, 1.3 * (c / tot * 100) - 1.4 * 25)), 9);
    expect(r.state).toBe('balanced');
    expect(r.carbPct).toBe(36.3);
  });
  it('the printed carb % always sits inside the printed range of the state it is given (every slider setting)', () => {
    const M = window.StemLab.NutritionMacroModel;
    const RANGE = { keto: [0, 10], lowcarb: [10, 30], balanced: [30, 55], highcarb: [55, 75], sugarheavy: [75, 100.0001] };
    let checked = 0;
    for (let c = 0; c <= 300; c += 5) for (let p = 0; p <= 200; p += 5) for (let f = 0; f <= 150; f += 2) {
      if (c + p + f === 0) continue;
      const r = M.model(c, p, f, 0);
      const [lo, hi] = RANGE[r.state];
      if (!(r.carbPct >= lo && r.carbPct < hi)) throw new Error(`c${c} p${p} f${f}: ${r.carbPct}% printed as ${r.state}`);
      const [glo, ghi] = RANGE[r.gramState];
      if (!(r.gramPct >= glo && r.gramPct < ghi)) throw new Error(`grams c${c} p${p} f${f}: ${r.gramPct}% as ${r.gramState}`);
      checked++;
    }
    expect(checked).toBeGreaterThan(180000);
  });
  it('a share exactly on a band edge belongs to the upper band, and just under stays below', () => {
    const M = window.StemLab.NutritionMacroModel;
    expect(M.model(30, 70, 0, 0).state).toBe('balanced'); // exactly 30 %
    expect(M.model(30, 70, 0, 0).carbPct).toBe(30);
    expect(M.stateOf(0.29999)).toBe('lowcarb');
  });
});

describe('Macro Inquiry is predict-first', () => {
  const seed = (extra) => ({ view: 'macroInquiry', macroInquiry: Object.assign({ carbs: 100, protein: 0, fat: 60, fiber: 10 }, extra || {}) });
  it('hides the state, pie, curve and scores until the student commits, and offers 5 picks of at least 44 px', () => {
    const view = mount(seed());
    const box = view.container.querySelector('[data-nl-macro-revealed]');
    expect(box.getAttribute('data-nl-macro-revealed')).toBe('false');
    const txt = view.container.textContent;
    expect(txt).not.toMatch(/% carb \//);
    expect(txt).toContain('Predict first');
    expect(view.container.querySelectorAll('svg path').length).toBe(0);
    const picks = [...view.container.querySelectorAll('[data-nl-macro-pick]')];
    expect(picks.map((b) => b.getAttribute('data-nl-macro-pick'))).toEqual(['keto', 'lowcarb', 'balanced', 'highcarb', 'sugarheavy']);
    for (const b of picks) expect(b.style.minHeight).toBe('44px');
    expect(buttons(view).some((b) => /Log this macro profile/.test(b.textContent))).toBe(false);
    const valueAfter = (label) => [...view.container.querySelectorAll('div')].find((d) => d.textContent === label).nextSibling.textContent;
    expect(valueAfter('Fullness score (made-up model)')).toBe('?');
    expect(valueAfter('Sugar-spike score (made-up model)')).toBe('?');
  });
  it('a grams-based guess gets the grams-vs-calories why, with the model numbers', () => {
    // 100 g carbs, 60 g fat: grams say 62.5 % (High-carb); calories say 400 / 940 = 42.5 % (Balanced).
    const view = mount(seed());
    React.act(() => view.container.querySelector('[data-nl-macro-pick="highcarb"]').click());
    const fb = view.container.querySelector('[data-nl-macro-feedback]');
    expect(fb.getAttribute('data-nl-macro-feedback')).toBe('miss');
    expect(fb.getAttribute('aria-live')).toBe('polite');
    expect(fb.textContent).toContain('Carbs: 100 g × 4 = 400 kcal out of 940 kcal in all = 42.5% of the calories, so the model says Balanced (30% to under 55%).');
    expect(fb.textContent).toContain('You may have used grams: carbs are 100 of 160 g (62.5%).');
    const M = window.StemLab.NutritionMacroModel.model(100, 0, 60, 10);
    const valueAfter = (label) => [...view.container.querySelectorAll('div')].find((d) => d.textContent === label).nextSibling.textContent;
    expect(valueAfter('Fullness score (made-up model)')).toBe(M.fullness.toFixed(0));
    expect(valueAfter('Sugar-spike score (made-up model)')).toBe(M.spike.toFixed(0));
    expect(view.state().macroInquiry.tally).toEqual({ n: 1, hit: 0 });
    expect(buttons(view).some((b) => /Log this macro profile/.test(b.textContent))).toBe(true);
  });
  it('too-low and too-high picks say which way and why; a match says so', () => {
    let view = mount(seed());
    React.act(() => view.container.querySelector('[data-nl-macro-pick="keto"]').click());
    expect(view.container.querySelector('[data-nl-macro-feedback]').textContent).toMatch(/too low/);
    React.act(() => { mounted.root.unmount(); mounted.container.remove(); mounted = null; });
    view = mount(seed());
    React.act(() => view.container.querySelector('[data-nl-macro-pick="sugarheavy"]').click());
    expect(view.container.querySelector('[data-nl-macro-feedback]').textContent).toMatch(/too high/);
    React.act(() => { mounted.root.unmount(); mounted.container.remove(); mounted = null; });
    view = mount(seed());
    React.act(() => view.container.querySelector('[data-nl-macro-pick="balanced"]').click());
    const fb = view.container.querySelector('[data-nl-macro-feedback]');
    expect(fb.getAttribute('data-nl-macro-feedback')).toBe('hit');
    expect(fb.textContent).toMatch(/matched the model: Balanced/);
    expect(view.container.querySelector('[data-nl-macro-tally]').getAttribute('data-nl-macro-tally')).toBe('1/1');
  });
  it('a committed prediction only reveals the settings it was made for', () => {
    const view = mount(seed({ carbs: 105, pred: { pick: 'balanced', c: 100, p: 0, f: 60, fb: 10 } }));
    expect(view.container.querySelector('[data-nl-macro-revealed]').getAttribute('data-nl-macro-revealed')).toBe('false');
    expect(view.container.querySelectorAll('[data-nl-macro-pick]').length).toBe(5);
  });
  it('all-zero sliders cannot be predicted', () => {
    const view = mount(seed({ carbs: 0, protein: 0, fat: 0 }));
    const picks = [...view.container.querySelectorAll('[data-nl-macro-pick]')];
    expect(picks.every((b) => b.disabled)).toBe(true);
    expect(view.container.textContent).toContain('All sliders are at 0 g');
  });
  it('the state text matches the model, not a fiber rule the model does not have', () => {
    expect(src.includes('Carbs >75% with low fiber'), 'Carbs >75% with low fiber').toBe(false);
    expect(src.includes('decades of RCTs'), 'decades of RCTs').toBe(false);
    expect(/'Sugar-heavy'/.test(src)).toBe(false);
  });
});

describe('migraine triggers are sourced and age-appropriate', () => {
  const fn = src.slice(src.indexOf('function PersonalMigraineFoodLog'), src.indexOf('function PersonalMigraineFoodLog') + 6000);
  it('drops alcohol and unsourced items, keeps the NINDS/MedlinePlus ones', () => {
    expect(fn).not.toMatch(/Red wine|Aspartame/);
    for (const t of ['Skipped meals', 'Too much or too little sleep', 'Not drinking enough water', 'Caffeine withdrawal', 'Stress']) expect(fn).toContain("'" + t + "'");
    expect(fn).toContain('Talk with a doctor or school nurse before cutting out any food.');
    expect(fn).not.toContain('6-8 weeks');
  });
});

describe('NEDA line matches what NEDA publishes', () => {
  it('names the toolkits without the unverified "research-backed" claim', () => {
    expect(src.includes('research-backed guidance and free educator toolkits'), 'research-backed guidance and free educator toolkits').toBe(false);
    expect(src.includes('free toolkits for educators, parents, and coaches'), 'free toolkits for educators, parents, and coaches').toBe(true);
  });
});

describe('cut-first pass on kit body claims', () => {
  it.each([
    'Strength training is more effective than cardio alone',
    'restriction worsens PCOS hormonally',
    'carbs boost serotonin',
    'take a break + talk to NEDA',
    'Every claim sourced from',
    'Every tool is evidence-based',
    'AAP supports plant-based diets',
    'Neff studies show',
    'If 3+ are high',
    'Perfectionism is a risk factor for disordered eating',
    'Maine waters are an omega-3 powerhouse',
    'AAP: regular breakfast linked to',
    'insulin resistance next day (Spiegel, Walker)',
    'Stress + poor sleep = often as triggering as food',
    'check ferritin + TSH at MD',
    'Daily intake covers 97% of healthy people',
    'Most adolescent nutrition tools are calorie counters',
    'Each unique plant = a different phytochemical',
    'Intuitive Eating is the evidence-based anti-diet framework',
  ])('cut: %s', (s) => { expect(src.includes(s), s).toBe(false); });
  it('replacements carry their sources', () => {
    expect(src.includes('No one diet and no one type of exercise has been shown to work better than another for PCOS.'), 'No one diet and no one type of exercise has been shown to work better than another for PCOS.').toBe(true);
    expect(src.includes('there is a lack of'), 'there is a lack of').toBe(true);
    expect(src.includes('Teens need 8 to 10 hours a night (CDC)'), 'Teens need 8 to 10 hours a night (CDC)').toBe(true);
    expect(src.includes('Enough for nearly all (97–98%) healthy people.'), 'Enough for nearly all (97–98%) healthy people.').toBe(true);
    expect(src.includes('call the National Alliance for Eating Disorders helpline (1-866-662-1235)'), 'call the National Alliance for Eating Disorders helpline (1-866-662-1235)').toBe(true);
  });
});
