// Nutrition Lab round 2 (2026-11-24): help-line list, teacher/family gating, food safety, Maine calendar, allergens,
// organ energy shares, Macro Inquiry model labels, label-quiz whys, 44 px reference targets, cut claims.
// Fail-first: NUTRITIONLAB_FILE=C:/tmp/sports_labs_1123/nutritionlab/start_r2.js npx vitest run <this file>
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUTRITIONLAB_FILE || 'stem_lab/stem_tool_nutritionlab.js';
const src = fs.readFileSync(FILE, 'utf8');
const T = (key, fallback) => fallback;

function arrayVar(name) {
  const a = src.indexOf('var ' + name + ' = [');
  if (a < 0) throw new Error('missing ' + name);
  const b = src.indexOf('\n  ];', a);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(a, b) + '\n  ];\nreturn ' + name + ';')(T);
}

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

describe('eating disorder and crisis help lines', () => {
  const rows = arrayVar('NUTRITION_KIT_NEDA_RESOURCES');
  it('is a short list of verified lines, not a directory of treatment-center ads', () => {
    expect(rows.length).toBeGreaterThanOrEqual(9);
    expect(rows.length).toBeLessThanOrEqual(15);
    const text = JSON.stringify(rows);
    for (const gone of ['Renfrew', 'Center for Discovery', 'McCallum', 'Veritas', 'Walden', 'Recovery Record', 'Rise Up', 'Eating Disorder Foundation', 'EDReferral', 'NEDA Walks', 'IAEDP']) {
      expect(text.includes(gone), gone).toBe(false);
    }
    for (const r of rows) for (const f of ['name', 'contact', 'when', 'kind', 'notes']) expect(String(r[f] || '').length, r.name + '.' + f).toBeGreaterThan(1);
  });
  it('carries the numbers and hours each operator publishes', () => {
    const find = (re) => rows.find((r) => re.test(r.name));
    expect(find(/National Alliance/).contact).toBe('1-866-662-1235');
    expect(find(/National Alliance/).when).toMatch(/Mon-Fri, 9 am-7 pm ET/);
    expect(find(/988/).contact).toMatch(/988/);
    expect(find(/Crisis Text Line/).contact).toBe('Text HOME to 741741');
    expect(find(/ANAD/).contact).toMatch(/1-888-375-7767/);
    expect(find(/ANAD/).when).toMatch(/9 am-9 pm Central/);
    expect(find(/Trevor/).contact).toMatch(/1-866-488-7386.*START to 678-678/);
    expect(find(/NAMI/).contact).toMatch(/1-800-950-6264.*62640/);
    expect(find(/NAMI/).notes).toMatch(/not a crisis line/);
    expect(find(/SAMHSA/).contact).toBe('1-800-662-4357');
    expect(find(/Maine Crisis Line/).contact).toMatch(/1-888-568-1112/);
    expect(find(/211 Maine/).contact).toMatch(/898-211/);
    expect(find(/Northern Light/).contact).toMatch(/1-800-640-1211/);
    expect(find(/Sweetser/).contact).toMatch(/1-800-434-3000/);
  });
  it('tells students on screen when the list was checked', () => {
    const view = mount({ view: 'myNutritionKit', nkView: 'nedaRef' });
    const note = view.container.querySelector('[data-nl-checked]');
    expect(note && note.textContent).toMatch(/Checked November 2026.*Listings change/);
  });
});

describe('supplement and symptom tables sit behind one "For teachers and families" disclosure', () => {
  it('keeps both tables out of the student grid and reachable from the disclosure', () => {
    const view = mount({ view: 'myNutritionKit', nkView: 'hub' });
    const isRef = (b) => /^(Supplement Reference|Symptom-Nutrient Reference):/.test(b.getAttribute('aria-label') || '');
    const refs = buttons(view).filter(isRef);
    expect(refs.length).toBe(2);
    for (const b of refs) expect(b.closest('details'), b.getAttribute('aria-label')).toBeTruthy();
    const details = refs[0].closest('details');
    expect(details.querySelector('summary').textContent).toMatch(/For teachers and families/);
    React.act(() => refs[0].click());
    expect(view.state().nkView).toBe('supplementRef');
    expect(view.container.querySelector('[data-nl-adult-banner]').textContent).toMatch(/For teachers and families/);
  });
  it('the symptom table carries the same banner', () => {
    const view = mount({ view: 'myNutritionKit', nkView: 'symptomRef' });
    expect(view.container.querySelector('[data-nl-adult-banner]')).toBeTruthy();
  });
});

describe('reference lists have 44 px targets', () => {
  it.each(['supplementRef', 'allergenRef', 'techniqueRef', 'symptomRef', 'cuisineRef', 'safetyRef', 'sportFuelRef', 'foodDB'])('%s rows and close button', (nk) => {
    const view = mount({ view: 'myNutritionKit', nkView: nk });
    const rows = buttons(view).filter((b) => b.style.textAlign === 'left');
    expect(rows.length, nk + ' rows').toBeGreaterThan(3);
    for (const b of rows) expect(b.style.minHeight, b.textContent.slice(0, 30)).toBe('44px');
    React.act(() => rows[0].click());
    const close = buttons(view).find((b) => /close/.test(b.textContent));
    expect(close, nk + ' close').toBeTruthy();
    expect(close.style.minHeight).toBe('44px');
  });
  it('kitchen tool filters', () => {
    const view = mount({ view: 'myNutritionKit', nkView: 'toolRef' });
    const f = buttons(view).filter((b) => ['all', 'Essential', 'Helpful', 'Nice', 'Standard'].includes(b.textContent));
    expect(f.length).toBe(5);
    for (const b of f) expect(b.style.minHeight).toBe('44px');
  });
});

describe('food safety matches USDA FSIS / FoodSafety.gov / CDC', () => {
  const rows = arrayVar('NUTRITION_KIT_FOOD_SAFETY_REF');
  const text = JSON.stringify(rows);
  it('cooking temperatures and the danger zone', () => {
    expect(text).toContain('145°F, then rest 3 minutes');
    expect(text).toContain('Ground meats: 160°F');
    expect(text).toContain('All poultry (including ground): 165°F');
    expect(text).toContain('Fish and shellfish: 145°F');
    expect(text).toContain('Egg dishes: 160°F');
    expect(text).toContain('Leftovers and casseroles: 165°F');
    expect(text).toMatch(/between 40°F and 140°F/);
    expect(text).toMatch(/more than 2 hours, or more than 1 hour if it is above 90°F/);
    expect(text).toMatch(/3 to 4 days/);
  });
  it('drops the claims USDA contradicts', () => {
    expect(text).not.toMatch(/"Use-by" = safety date/);
    expect(text).toMatch(/about quality, not safety.*infant formula/);
    expect(text).not.toMatch(/quality declines after 2-3 months/);
    expect(text).not.toMatch(/Pasteurized eggs safe raw/);
  });
  it('recipe notes never promise more than USDA\'s 3 to 4 days for leftovers', () => {
    const recipes = JSON.stringify(arrayVar('NUTRITION_KIT_RECIPE_SEED'));
    expect(recipes).not.toMatch(/Lasts 5 days/);
    expect(recipes).not.toMatch(/eat one a morning for 2 weeks/);
    expect(recipes).not.toMatch(/~\d+g (protein|fiber)/);
  });
  it('cooking techniques: slow cooker range and the 3-minute rest', () => {
    const tech = arrayVar('NUTRITION_KIT_COOKING_TECH');
    const slow = tech.find((t) => t.name === 'Slow-cooking');
    expect(slow.tempF).toBe('170-280 (USDA)');
    expect(slow.why).toMatch(/thaw meat or poultry before/);
    expect(tech.find((t) => t.name === 'Resting meat').why).toMatch(/3-minute rest after 145°F/);
    expect(JSON.stringify(tech)).not.toMatch(/osmosis|3-10x|seizes\.'/);
  });
});

describe('allergens and Maine calendar', () => {
  it('sulfites, shellfish and sesame are stated the way FDA states them', () => {
    const rows = arrayVar('NUTRITION_KIT_ALLERGEN_REF');
    const by = (n) => rows.find((r) => r.name === n);
    expect(by('Sulfites').schoolNotes).toMatch(/Since 1986 the FDA has not allowed sulfites on fresh fruits and vegetables/);
    expect(JSON.stringify(by('Sulfites'))).not.toMatch(/salad bar prep often contains/i);
    expect(by('Shellfish').schoolNotes).toMatch(/crustacean shellfish.*Mollusks.*not one of the 9 major allergens/);
    expect(by('Sesame').severity).toMatch(/January 1, 2023/);
    expect(JSON.stringify(rows)).not.toMatch(/Benadryl|fertilizers|Caramel color/);
  });
  it('Maine Maple Sunday is the fourth Sunday in March and not a state holiday', () => {
    const cal = arrayVar('NUTRITION_KIT_MAINE_SEASONAL_CALENDAR');
    expect(cal.length).toBe(12);
    expect(cal[2].notes).toMatch(/fourth Sunday in March.*not a state holiday/);
    expect(JSON.stringify(cal)).not.toMatch(/State holiday\./);
    expect(cal[3].notes).toMatch(/boil 15 minutes or steam 10 to 12 minutes/);
  });
});

describe('organ energy shares come from one sourced table', () => {
  // Ko & Jung, Nutrients 2021;13:4556, Table 2 (% of resting energy, men / women).
  const table = { liver: [17, 18], brain: [19, 21], heart: [9, 8], kidneys: [8, 8], muscles: [24, 20] };
  const a = src.indexOf('var BODY_ENERGY_SHARE = {');
  const b = src.indexOf('\n  };', a);
  const other = src.match(/var BODY_ENERGY_OTHER_PCT = (\d+);/);
  // eslint-disable-next-line no-new-func
  const share = new Function(src.slice(a, b) + '\n  };\nreturn BODY_ENERGY_SHARE;')();
  it('each named organ is the rounded mean of the men and women columns; the rest makes 100', () => {
    let sum = 0;
    for (const id of Object.keys(table)) {
      const want = Math.round((table[id][0] + table[id][1]) / 2);
      expect(share[id].pct, id).toBe(want);
      sum += want;
    }
    expect(Number(other[1])).toBe(100 - sum);
  });
  it('the Energy module reads the same numbers instead of its own copy', () => {
    expect(src).toContain('pct: BODY_ENERGY_SHARE.liver.pct');
    expect(src).toContain('pct: BODY_ENERGY_OTHER_PCT');
    expect(src).not.toMatch(/Healthy-adult averages: Wang et al\. \(2010\), Brody/);
  });
});

describe('Macro Inquiry labels its scores as a made-up classroom model', () => {
  it('names the model on screen and shows numbers that follow the formula it prints', () => {
    const view = mount({ view: 'macroInquiry' });
    // Round 3 made the widget predict-first: the scores show only after a prediction is committed.
    const pick = view.container.querySelector('[data-nl-macro-pick="balanced"]');
    if (pick) React.act(() => pick.click());
    const txt = view.container.textContent;
    expect(txt).toContain('Fullness score (made-up model)');
    expect(txt).toContain('Sugar-spike score (made-up model)');
    const note = view.container.querySelector('[data-nl-model-note]');
    expect(note.textContent).toMatch(/not real measurements and not a published index/);
    // Default sliders: 50 g carbs, 20 g protein, 30 g fat, 25 g fiber.
    const c = 50 * 4, p = 20 * 4, f = 30 * 9, tot = c + p + f, fiber = 25;
    const fullness = 1.5 * (p / tot * 100) + 0.7 * (f / tot * 100) + 0.3 * (c / tot * 100) + fiber;
    const spike = Math.max(0, Math.min(100, 1.3 * (c / tot * 100) - 1.4 * fiber));
    const valueAfter = (label) => {
      const el = [...view.container.querySelectorAll('div')].find((d) => d.textContent === label);
      return el.nextSibling.textContent;
    };
    expect(valueAfter('Fullness score (made-up model)')).toBe(fullness.toFixed(0));
    expect(valueAfter('Sugar-spike score (made-up model)')).toBe(spike.toFixed(0));
    expect(txt).not.toMatch(/Satiety index/);
  });
});

describe('Food Label Reader: every wrong answer has its own why', () => {
  it('each question carries one why per wrong choice, kept aligned through the rotation', () => {
    const a = src.indexOf('var LABELS = [');
    const b = src.indexOf('function NutritionFactsPanel', a);
    // eslint-disable-next-line no-new-func
    const labels = new Function('__alloT', src.slice(a, b) + '\nreturn LABELS;')(T);
    let n = 0;
    for (const lab of labels) for (const q of lab.questions) {
      expect(Array.isArray(q.why), q.q).toBe(true);
      expect(q.why.length).toBe(q.choices.length);
      q.why.forEach((w, i) => { if (i === q.answer) expect(w, q.q).toBeNull(); else expect(String(w).length, q.q + ' #' + i).toBeGreaterThan(15); });
      n++;
    }
    expect(n).toBe(12);
  });
  it('picking "70 calories" explains that 70 is the sodium', () => {
    const view = mount({ view: 'labelReader' });
    const wrong = buttons(view).find((btn) => btn.getAttribute('role') === 'radio' && btn.textContent === '70 calories');
    expect(wrong).toBeTruthy();
    React.act(() => wrong.click());
    const why = view.container.querySelector('[data-nl-why]');
    expect(why && why.textContent).toMatch(/70 is the sodium in milligrams/);
  });
});

describe('claims with no source were cut', () => {
  it.each([
    '65% more likely', 'doubles your odds', 'within 39 min', '70% of world adults', '$250B', '200+ diet messages',
    'AHA: <36 g/day teens', 'Hershfield, Stanford', 'ZOE research', 'Crum et al', 'doubles what you remember',
    'cuts attention 10-20%', '8-12 g carb/kg', 'mainefederationoffarmersmarkets', '600+ ', '1 in 8 Mainers',
    'State holiday', 'Benadryl + watch', 'BG <50', '248 personal tools', '44 support resources', 'moderate red wine',
    'NEDA tracks platform responses', 'NEDA, school counselors', 'Call NEDA or', 'up to 50% in young kids',
    'between 1,200 and 1,800', '180 litres', 'Every tool in this kit is evidence-sourced'
  ])('%s', (s) => { expect(src.includes(s)).toBe(false); });
});
