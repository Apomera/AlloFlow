// Nutrition Lab accuracy audit (2026-11-24). Pins the corrected, sourced facts so they cannot drift back.
// Fail-first check: NUTRITIONLAB_FILE=C:/tmp/sports_labs_1123/nutritionlab/start.js npx vitest run <this file>
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = process.env.NUTRITIONLAB_FILE || 'stem_lab/stem_tool_nutritionlab.js';
const src = fs.readFileSync(FILE, 'utf8');
const T = (key, fallback) => fallback;

function slice(startTok, endTok) {
  const a = src.indexOf(startTok);
  if (a < 0) throw new Error('missing ' + startTok);
  const b = src.indexOf(endTok, a);
  if (b < 0) throw new Error('missing end ' + endTok);
  return src.slice(a, b);
}
function arrayVar(name) {
  const a = src.indexOf('var ' + name + ' = [');
  if (a < 0) throw new Error('missing ' + name);
  const b = src.indexOf('\n  ];', a);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(a, b) + '\n  ];\nreturn ' + name + ';')(T);
}

describe('crisis and helpline contacts are current', () => {
  it('never shows the closed NEDA helpline number or the NEDA text keyword', () => {
    expect(src.includes('931-2237')).toBe(false);
    expect(/text "?NEDA"? to 741741/i.test(src)).toBe(false);
    expect(src.includes('myneda.org')).toBe(false);
  });
  it('shows the National Alliance for Eating Disorders helpline and 24/7 options', () => {
    expect(src.includes('1-866-662-1235'), '1-866-662-1235').toBe(true);
    expect(src.includes('HOME to 741741'), 'HOME to 741741').toBe(true);
    expect(src.match(/1-866-662-1235/g).length).toBeGreaterThanOrEqual(10);
  });
  it('drops resource rows a search could not confirm exist', () => {
    for (const s of ['Akari', 'meedc.org', 'edge.byu.edu', 'Trillium Mental Health', 'Memorial Day Hunger', 'Athletes Against Anorexia', 'King Middle School']) {
      expect(src.includes(s), s).toBe(false);
    }
  });
});

describe('Micronutrient Atlas uses NIH ODS teen values', () => {
  const atlas = new Function(slice('var VITAMINS = [', 'var R_NL =') + '\nreturn { VITAMINS, MINERALS, EFAS };')();
  const byId = {};
  for (const n of [...atlas.VITAMINS, ...atlas.MINERALS, ...atlas.EFAS]) byId[n.id] = n;
  it('lists all 13 vitamins plus choline marked as not a vitamin', () => {
    const vit = atlas.VITAMINS.filter((v) => v.id !== 'choline');
    expect(vit.map((v) => v.id).sort()).toEqual(['b1', 'b12', 'b2', 'b3', 'b5', 'b6', 'b7', 'b9', 'vitA', 'vitC', 'vitD', 'vitE', 'vitK'].sort());
    expect(byId.choline.name).toMatch(/not a vitamin/);
  });
  it('gives the ODS RDA/AI for ages 14-18 (boys/girls) where they differ', () => {
    expect(byId.iron.rda).toContain('Ages 14–18: 11 mg (boys), 15 mg (girls)');
    expect(byId.potassium.rda).toContain('Ages 14–18: 3,000 mg (boys), 2,300 mg (girls)');
    expect(byId.magnesium.rda).toContain('Ages 14–18: 410 mg (boys), 360 mg (girls)');
    expect(byId.zinc.rda).toContain('Ages 14–18: 11 mg (boys), 9 mg (girls)');
    expect(byId.vitC.rda).toContain('Ages 14–18: 75 mg (boys), 65 mg (girls)');
    expect(byId.vitA.rda).toContain('Ages 14–18: 900 mcg (boys), 700 mcg (girls)');
    expect(byId.calcium.rda).toContain('1,300 mg a day for ages 9–18');
    expect(byId.vitD.rda).toContain('600 IU (15 mcg)');
    expect(byId.b5.rda).toContain('Ages 14 and up: 5 mg');
    expect(byId.sodium.rda).toContain('under 2,300 mg a day for ages 14 and up');
  });
  it('every Atlas intake line is age-banded (no adult-only ranges)', () => {
    for (const n of Object.values(byId)) expect(n.rda, n.id).toMatch(/[Aa]ges? (9|1|14)|9–18|ages 9/);
  });
  it('removes the unsourced claims that were there before', () => {
    expect(byId.iron.deficiency).not.toMatch(/ADHD/);
    expect(byId.vitD.deficiency).not.toMatch(/WIDESPREAD/);
    expect(byId.magnesium.deficiency).not.toMatch(/anxiety/);
    expect(byId.omega3.rda).not.toMatch(/250–500 mg/);
  });
  it('states the vitamin D winter gap the Boston study measured (Nov–Feb), not Oct–Mar for Maine', () => {
    expect(/Maine[^.]{0,80}(Oct–Mar|Oct-Mar|October through March)/.test(src)).toBe(false);
    expect(byId.vitD.function).toMatch(/November through February/);
  });
});

describe('food composition matches USDA FoodData Central (SR Legacy)', () => {
  const FOODS = arrayVar('FOODS');
  const KIT = arrayVar('NUTRITION_KIT_FOOD_DB');
  const f = (id) => FOODS.find((x) => x.id === id);
  const k = (id) => KIT.find((x) => x.id === id);
  it('Macronutrient Lab salmon is 3 oz farmed Atlantic, not per-100 g values', () => {
    expect(f('salmon')).toMatchObject({ kcal: 175, p: 19, f: 10.5 });
    expect(k('salmon-cooked')).toMatchObject({ kcal: 175, p: 19 });
  });
  it('serving weights match the numbers (sweet potato 114 g, whole-wheat slice 32 g)', () => {
    expect(f('sweetPot').serving).toContain('114 g');
    expect(f('wholeBread').serving).toContain('32 g');
  });
  it('fixes the larger vitamin/mineral errors', () => {
    expect(k('spinach-raw').vitA).toBe(141);
    expect(k('sweet-potato').vitA).toBe(1096);
    expect(k('kale-cooked').ca).toBe(177);
    expect(k('pickle').na).toBe(283);
    expect(k('hummus').kcal).toBe(147);
    expect(k('cucumber').name).toContain('1 whole, 8 in');
  });
  it('kit rows stay Atwater-consistent', () => {
    for (const e of KIT) {
      const at = 4 * e.c + 4 * e.p + 9 * e.f;
      expect(Math.abs(e.kcal - at), e.id).toBeLessThanOrEqual(12 + 0.25 * at);
    }
  });
});

describe('supplement and symptom references give no dosing advice to students', () => {
  const SUPP = arrayVar('NUTRITION_KIT_SUPPLEMENT_REF');
  const s = (name) => SUPP.find((x) => x.name.startsWith(name));
  it('uses ages 14-18 Upper Limits from NIH ODS', () => {
    expect(s('Vitamin C').upperLimit).toContain('1,800 mg');
    expect(s('Zinc').upperLimit).toContain('34 mg');
    expect(s('Iodine').upperLimit).toContain('900 mcg');
    expect(s('Folate').upperLimit).toContain('800 mcg');
    expect(s('Choline').upperLimit).toContain('3,000 mg');
    expect(s('Calcium').upperLimit).toContain('3,000 mg');
    expect(s('Vitamin D').upperLimit).toContain('4,000 IU');
  });
  it('shows no supplement dose ranges for non-nutrient products', () => {
    for (const name of ['Creatine', 'Melatonin', 'Ashwagandha', 'L-theanine', 'NAC', 'Coenzyme Q10', 'Turmeric']) {
      expect(s(name).dose, name).toMatch(/Not recommended for teens unless a doctor/);
    }
    expect(JSON.stringify(SUPP)).not.toMatch(/Safe for healthy teens|KSM-66|Suntheanine|blood-brain/);
  });
  it('symptom table sends students to a doctor instead of to supplements', () => {
    const SYM = arrayVar('NUTRITION_KIT_SYMPTOM_NUTRIENT');
    const text = JSON.stringify(SYM);
    expect(text).not.toMatch(/glycinate|Consider vit D|Cranberry|eat by 7pm|Cap caffeine by 2pm/i);
  });
  it('sports fuel reference has no unsourced calories-per-hour or creatine advice', () => {
    expect(/kcalPerHour/.test(src)).toBe(false);
    expect(/Creatine supplementation common/.test(src)).toBe(false);
  });
});

describe('label %DV values follow FDA Daily Values and 21 CFR 101.9 rounding', () => {
  const labels = new Function('__alloT', slice('var LABELS = [', '\n      // The authored labels') + '\nreturn LABELS;')(T);
  const DV = { 'Total Fat': [78, 'macro'], 'Saturated Fat': [20, 'macro'], Cholesterol: [300, 'macro'], Sodium: [2300, 'macro'], 'Total Carbs': [275, 'macro'], 'Dietary Fiber': [28, 'macro'], 'Vitamin D': [20, 'micro'], Calcium: [1300, 'micro'], Iron: [18, 'micro'], Potassium: [4700, 'micro'], 'Vitamin B12': [2.4, 'micro'] };
  function expected(label, amount) {
    const [dv, kind] = DV[label];
    const pct = amount / dv * 100;
    if (kind === 'macro') return Math.round(pct);
    if (pct < 2) return 0;
    if (pct <= 10) return Math.round(pct / 2) * 2;
    if (pct <= 50) return Math.round(pct / 5) * 5;
    return Math.round(pct / 10) * 10;
  }
  it('every printed %DV matches the recomputed value', () => {
    let checked = 0;
    for (const lab of labels) {
      for (const panel of lab.dualOther ? [lab, lab.dualOther] : [lab]) {
        for (const row of [...panel.rows, ...(panel.micros || [])]) {
          if (!row.dv || !DV[row.label]) continue;
          const amount = parseFloat(row.val);
          expect(parseInt(row.dv, 10), lab.id + ' ' + row.label).toBe(expected(row.label, amount));
          checked++;
        }
        const added = panel.rows.find((r) => /Added Sugars/.test(r.label));
        if (added && added.dv) { expect(parseInt(added.dv, 10)).toBe(Math.round(panel.nutrients.addedSugars / 50 * 100)); checked++; }
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});

describe('other corrected facts', () => {
  it('ATP and activity numbers come from sources (250 g body ATP; Compendium METs)', () => {
    expect(/~50 ?g of ATP/.test(src)).toBe(false);
    expect(src.includes('about 250 g of ATP'), 'about 250 g of ATP').toBe(true);
    expect(/activity: 'Run \(6 mph\)',\s+met: 9\.3/.test(src)).toBe(true);
    expect(/kcalPerMin/.test(src)).toBe(false);
  });
  it('water targets use the ages 14-18 AI, not adult values', () => {
    expect(/~2700 for teen girls|~2700 mL teen girls/.test(src)).toBe(false);
    expect(src.includes('ages 14–18: about 1,800 girls / 2,600 boys'), 'ages 14–18: about 1,800 girls / 2,600 boys').toBe(true);
  });
  it('removes clinical claims that contradict their sources', () => {
    expect(src.includes('AGA and gastroenterology guidelines recommend monitoring B12'), 'AGA and gastroenterology guidelines recommend monitoring B12').toBe(false);
    expect(src.includes('certain B12 deficiency by 2–4 years'), 'certain B12 deficiency by 2–4 years').toBe(false);
    expect(src.includes('common Mediterranean/paleo range'), 'common Mediterranean/paleo range').toBe(false);
    expect(src.includes('size of a tennis court for absorption'), 'size of a tennis court for absorption').toBe(false);
    expect(/caffeine\\?'s half-life is roughly 5-7 hours in teens/.test(src)).toBe(false);
    expect(/Husson University \(DPD pathway\)/.test(src)).toBe(false);
    expect(/1200 hours of supervised practice/.test(src)).toBe(false);
  });
  it('every changed student-facing string keeps an English fallback on a new key', () => {
    for (const key of ['no_food_is_bad_no_body_type_is_right_t_v2', 'helpline_hours_and_24_7_v2', 'iron_energy_and_focus_v2', /* round 3 reworded it again */ 'carbs_10_30_below_dga_range_v3','in_2021_maine_second_state_v2', /* round 4 cut the unsourced 1,000-hour figure */ 'the_rdn_credential_v3','body_holds_250g_atp_v2']) {
      expect(new RegExp("__alloT\\('stem\\.nutritionlab\\." + key + "', '[^']").test(src), key).toBe(true);
    }
  });
});
