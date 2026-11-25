// Nutrition Lab round 4 (2026-11-24): no implied endorsement ("NEDA-aligned"), sourced-or-cut lines in the Eating Disorder
// Awareness media section, and four checked facts (omega-3 footer, PCOS low-GL option, RD training, Maine epinephrine law).
// Fail-first: NUTRITIONLAB_FILE=C:/tmp/sports_labs_1123/nutritionlab/start_r4.js npx vitest run <this file>
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUTRITIONLAB_FILE || 'stem_lab/stem_tool_nutritionlab.js';
const src = fs.readFileSync(FILE, 'utf8');
const has = (s) => src.indexOf(s) >= 0;

let cfg, mounted;
function mount(data) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: Object.assign({}, data) };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); } });
  function Host() { const [, tick] = React.useState(0); bump = () => tick((n) => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root };
  return mounted;
}
const text = (view) => view.container.textContent;
beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool(FILE, 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('no implied endorsement by any organization', () => {
  it('the source never calls the tool "-aligned" with an organization or claims an endorsement', () => {
    expect(/NEDA-aligned/i.test(src), 'NEDA-aligned').toBe(false);
    expect(/[A-Za-z][- ]aligned/.test(src), 'any X-aligned / X aligned').toBe(false);
    expect(/NEDA-aware/.test(src), 'NEDA-aware').toBe(false);
    expect(/\b(endorsed|approved|certified) by\b/i.test(src), 'endorsed/approved/certified by').toBe(false);
    expect(has("'NEDA Educator Toolkit'"), 'NEDA toolkit listed as a standard').toBe(false);
    expect(has("'My NEDA Resource Library'"), 'NEDA-branded library title').toBe(false);
    expect(has("label: 'NEDA Resources'"), 'NEDA-branded tile').toBe(false);
  });
  it('the old keyed strings are retired and the new keys carry English fallbacks', () => {
    for (const k of ['neda_aligned_opt_in_content_warning', 'build_your_own_nutrition_practice_meal', 'spectrum_of_disordered_eating_signs_to',
      'on_tiktok_long_press_a_video_not_inter', 'if_you_ve_been_on_a_platform_for_30_mi', 'registered_dietitian_grad_1000hr_v2', 'the_rdn_credential_v2']) {
      expect(has("'stem.nutritionlab." + k + "'"), k).toBe(false);
    }
    for (const k of ['ed_aware_opt_in_content_warning', 'build_your_own_nutrition_practice_meal_v2', 'spectrum_of_disordered_eating_signs_to_v2',
      'platform_not_interested_v2', 'take_breaks_30_minutes_v2', 'registered_dietitian_grad_practice_v3', 'the_rdn_credential_v3']) {
      expect(new RegExp("'stem\\.nutritionlab\\." + k + "',\\s*'(?:[^'\\\\]|\\\\.){12,}").test(src), k).toBe(true);
    }
  });
  it('the main menu shows the honest wording', () => {
    const view = mount({});
    const t = text(view);
    expect(t.includes('NEDA-aligned'), 'NEDA-aligned on menu').toBe(false);
    expect(t.includes('Eating-disorder-aware · opt-in content warning'), 'ED card subtitle').toBe(true);
    expect(t.includes('neither has reviewed this tool'), 'ED card says no review').toBe(true);
  });
  it('the help library no longer calls its own suggestions NEDA-aligned', () => {
    const view = mount({ view: 'myNutritionKit', nkView: 'nedaResource' });
    const t = text(view);
    expect(t.includes('My Eating Disorder Help Library'), 'title').toBe(true);
    expect(t.includes('Ideas to start with (tap to add)'), 'suggestions heading').toBe(true);
    expect(t.includes('Neither group made or reviewed this kit.'), 'footer').toBe(true);
    expect(t.includes('NEDA-aligned') || t.includes('evidence-aligned'), 'aligned wording').toBe(false);
  });
});

describe('Eating Disorder Awareness media section: sourced or cut', () => {
  const media = () => mount({ view: 'edAwareness', ed_consented: true, ed_section: 'media' });
  it('drops the four unsourced lines', () => {
    for (const s of ['liver damage and cardiac events', 'one of the most well-documented harms', 'After a few days the feed shifts', 'a documented contributor to disordered eating']) {
      expect(has(s), s).toBe(false);
    }
  });
  it('shows the sourced replacements', () => {
    const t = text(media());
    expect(t.includes('supplements do not need FDA approval before they are sold'), 'FDA premarket line').toBe(true);
    expect(t.includes('liver damage linked to green tea extract pills'), 'NIH liver line').toBe(true);
    expect(t.includes('hidden drug ingredients'), 'FDA hidden ingredients').toBe(true);
    expect(t.includes("on NEDA's list of eating disorder warning signs"), 'NEDA warning sign').toBe(true);
    expect(t.includes('TikTok says it will then show you fewer posts like that.'), 'TikTok help line').toBe(true);
    expect(t.includes('The U.S. Surgeon General (2023) reported that comparing yourself with others on social media is linked to feeling bad about your body.'), 'SG line').toBe(true);
  });
  it('each replacement sits next to a source comment with a quote', () => {
    for (const s of ['do not require premarket review or approval by FDA', 'Refuses to eat certain foods, and often eliminates whole food groups',
      "we'll show you fewer posts like that", 'Social comparison driven by social media is associated with body']) {
      expect(has(s), s).toBe(true);
    }
  });
});

describe('item-3 facts', () => {
  it('omega-3 footer keeps only what NIH ODS says', () => {
    expect(has('cardiac rhythm, and inflammation regulation'), 'old footer').toBe(false);
    const view = mount({ view: 'myNutritionKit', nkView: 'omega3' });
    const t = text(view);
    expect(t.includes('DHA is found in high amounts in the brain and in the retina'), 'NIH structure line').toBe(true);
    expect(t.includes('but only a small amount'), 'ALA conversion is limited').toBe(true);
    expect(t.includes('cardiac rhythm'), 'no rhythm claim').toBe(false);
  });
  it('the PCOS low-GL option describes glycemic load, not "protein/fat heavy"', () => {
    const view = mount({ view: 'myNutritionKit', nkView: 'pcos' });
    const opts = [...view.container.querySelectorAll('option')].map((o) => o.textContent);
    expect(opts.some((o) => /protein\/fat heavy/.test(o)), 'old label').toBe(false);
    expect(opts.includes('🟢 Low GL (few carbs, or beans)'), 'new label').toBe(true);
    // the stored value is unchanged, so old logs still find their label
    expect(has("{ value: 'low', label: '🟢 Low GL (few carbs, or beans)' }"), 'value kept').toBe(true);
  });
  it('RD training lines drop the unsourced 1,000-hour figure', () => {
    expect(/1,000 (supervised )?hours|1,000 supervised|1000 supervised/.test(src.replace(/\/\/[^\n]*/g, '')), '1,000 hours in student text').toBe(false);
    const rd = mount({ view: 'myNutritionKit', nkView: 'rdLog' });
    expect(text(rd).includes('a graduate degree, supervised practice in an accredited program, and a national exam'), 'RD log').toBe(true);
    React.act(() => { mounted.root.unmount(); mounted.container.remove(); mounted = null; });
    const careers = mount({ view: 'careerPaths' });
    expect(text(careers).includes('As of 2024, the RDN requires a graduate degree, supervised practice in an accredited program, and passing a national exam.'), 'careers header').toBe(true);
  });
  it('the Maine epinephrine line matches the statute wording and is not a promise for every school', () => {
    expect(has('school nurses can administer epinephrine via standing orders'), 'old line').toBe(false);
    expect(has('may authorize adoption of a collaborative practice agreement'), 'statute quote in comment').toBe(true);
    const view = mount({ view: 'myNutritionKit', nkView: 'allergen' });
    const t = text(view);
    expect(t.includes('Maine law lets a school make an agreement with a doctor so the school nurse can give epinephrine'), 'new line').toBe(true);
    expect(t.includes('Ask your school nurse if your school has one.'), 'not every school').toBe(true);
    expect(t.includes('Epi-Pen'), 'brand name').toBe(false);
  });
});
