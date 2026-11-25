// Nutrition Lab round 5 (2026-11-24): unsourced attributions sourced or cut, careers claims checked against BLS,
// the help library matches the round-2 help list (no Recovery Record) with 44 px suggestion buttons, and every kit
// count is derived from the real lists (no "127", no "200+", no "evidence-based tools").
// Fail-first: NUTRITIONLAB_FILE=C:/tmp/sports_labs_1123/nutritionlab/start_r5.js npx vitest run <this file>
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUTRITIONLAB_FILE || 'stem_lab/stem_tool_nutritionlab.js';
const src = fs.readFileSync(FILE, 'utf8');
const has = (s) => src.indexOf(s) >= 0;
const code = src.replace(/^\s*\/\/[^\n]*$/gm, '');

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
function unmount() { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } }
const text = (view) => view.container.textContent;
beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool(FILE, 'nutritionLab'); });
afterEach(() => { unmount(); document.body.innerHTML = ''; });

// The real list lengths, read from the file under test.
function slice(startMarker, endMarker) {
  const s = src.indexOf(startMarker);
  const e = src.indexOf(endMarker, s);
  return s >= 0 && e > s ? src.slice(s, e) : '';
}
const tileSrc = slice('var allTools = [', '\n    ];');
const TOOL_COUNT = (tileSrc.match(/\{ id: '/g) || []).length;
const catSrc = slice("    var categories = [\n      { id: 'all'", '\n    ];');
const CATEGORY_COUNT = (catSrc.match(/\{ id: '/g) || []).length - 1;
// eslint-disable-next-line no-new-func
const FOOD_COUNT = new Function(slice('var NUTRITION_KIT_FOOD_DB = [', '\n  ];') + '\n  ];\nreturn NUTRITION_KIT_FOOD_DB.length;')();
// eslint-disable-next-line no-new-func
const MAP_COUNT = new Function(slice('var BODY_NUTRIENT_MAP = {', '\n  };') + '\n  };\nreturn Object.keys(BODY_NUTRIENT_MAP).length;')();

describe('unsourced attributions are sourced or cut', () => {
  it('the four named claims are gone from student text', () => {
    for (const s of ['NEDA: chronic diet-culture exposure correlates', 'Project HEAL, NEDA, Lock & Le Grange FBT',
      'is a clinical sign of eating disorder thinking', 'trains the same habits in viewers', 'Every major platform lets you report',
      'Self-compassion (Neff) speeds recovery', 'the most important thing is to eat your next regular meal']) {
      expect(code.includes(s), s).toBe(false);
    }
  });
  it('each replacement sits next to a source comment with an exact quote', () => {
    for (const s of ['The best thing you can do after a binge eating episode is get straight back on track with regular eating',
      'Self-compassion simply involves doing a U-turn', 'Dieting and unhealthful weight-control behaviors predict',
      'The majority (92%) of the patients in Study 1 checked their bodies', 'Under the video, tap More',
      'Report an inappropriate post on']) {
      expect(has(s), s).toBe(true);
    }
  });
  it('the Recovery Meal Log shows the sourced footer', () => {
    const t = text(mount({ view: 'myNutritionKit', nkView: 'edRecovery' }));
    expect(t.includes('Centre for Clinical Interventions'), 'CCI named').toBe(true);
    expect(t.includes('If you have a care team, follow their plan first.'), 'care team first').toBe(true);
    expect(t.includes('Project HEAL, NEDA'), 'old attribution').toBe(false);
  });
  it('the Diet Culture Log footer cites the Project EAT study, not NEDA', () => {
    const t = text(mount({ view: 'myNutritionKit', nkView: 'dietCulture' }));
    expect(t.includes('a 5-year study of 2,516 teens (Project EAT, 2006)'), 'Project EAT').toBe(true);
    expect(t.includes('NEDA: chronic'), 'old NEDA line').toBe(false);
  });
  it('the media section shows the sourced body-checking line and the narrowed report line', () => {
    const t = text(mount({ view: 'edAwareness', ed_consented: true, ed_section: 'media' }));
    expect(t.includes('In one study, 92% of patients with an eating disorder did it.'), 'body checking').toBe(true);
    expect(t.includes('TikTok, Instagram and YouTube all let you report a post.'), 'report line').toBe(true);
    expect(t.includes('clinical sign'), 'old body-checking line').toBe(false);
  });
  it('the changed report line has a new key (the old _v2 key is retired)', () => {
    expect(has("'stem.nutritionlab.every_major_platform_has_a_category_fo_v2'"), 'old key').toBe(false);
    expect(/'stem\.nutritionlab\.report_post_three_apps_v3',\s*'TikTok, Instagram and YouTube/.test(src), 'new key').toBe(true);
  });
});

describe('careers and RD log claims', () => {
  it('no unsourced pay range, demand claim or insurance claim remains', () => {
    for (const s of ['$55-95K', "'stem.nutritionlab.typical_rdn_pay'", "'stem.nutritionlab.stable_demand_every_hospital_and_schoo'",
      'Insurance often covers visits', 'insurance-billable', 'every hospital and school needs nutrition staff']) {
      expect(code.includes(s), s).toBe(false);
    }
  });
  it('every pay figure comes from one BLS edition, with the source quoted', () => {
    expect(has('"The median annual wage for dietitians and nutritionists was $76,400 in'), 'BLS quote').toBe(true);
    expect(code.includes('$73,850') || code.includes('about $101,000'), 'mixed BLS editions').toBe(false);
    expect(has("'stem.nutritionlab.median_dietitian_pay_v2', 'median dietitian pay (May 2025)'"), 'new stat key').toBe(true);
    expect(has("'stem.nutritionlab.job_growth_bls_v2', 'Growing field:"), 'new demand key').toBe(true);
  });
  it('the careers overview shows the BLS median and projected growth', () => {
    const t = text(mount({ view: 'careerPaths' }));
    expect(t.includes('$76,400'), 'median stat').toBe(true);
    expect(t.includes('median dietitian pay (May 2025)'), 'stat label').toBe(true);
    expect(t.includes('grow 8% from 2025 to 2035'), 'growth').toBe(true);
    expect(t.includes('$55-95K'), 'old range').toBe(false);
  });
  it('the RD ladder pay lines match the overview stat', () => {
    const t = text(mount({ view: 'careerPaths', cp_view: 'ladder' }));
    expect(t.includes('median pay for dietitians was $76,400 in May 2025'), 'tier 5').toBe(true);
    expect(t.includes('more than $103,720 in May 2025'), 'tier 6').toBe(true);
  });
  it('the RD log keeps the Maine employers (now sourced) and drops the insurance claim', () => {
    expect(has('Our registered dietitian nutritionists offer one-on-one nutrition counseling'), 'MaineHealth quote').toBe(true);
    expect(has('our registered dietitian provides personalized nutrition support'), 'Northern Light quote').toBe(true);
    expect(has('You must have diabetes or kidney disease'), 'Medicare quote').toBe(true);
    const t = text(mount({ view: 'myNutritionKit', nkView: 'rdLog' }));
    expect(t.includes('Ask your family\'s health plan whether it covers dietitian visits.'), 'ask your plan').toBe(true);
    expect(t.includes('MaineHealth and Northern Light Health both have registered dietitians'), 'Maine line').toBe(true);
    expect(t.includes('Medicare, for example, covers it for diabetes and kidney disease.'), 'MNT footer').toBe(true);
    expect(t.includes('Insurance often covers'), 'old claim').toBe(false);
  });
});

describe('help library suggestions', () => {
  it('match the round-2 help list (no Recovery Record) and are 44 px buttons', () => {
    expect(code.includes('Recovery Record'), 'Recovery Record anywhere in student text').toBe(false);
    const view = mount({ view: 'myNutritionKit', nkView: 'nedaResource' });
    const heading = [...view.container.querySelectorAll('strong')].find((s) => s.textContent.includes('Ideas to start with'));
    expect(!!heading, 'suggestions heading').toBe(true);
    const buttons = [...heading.parentElement.querySelectorAll('button')];
    expect(buttons.length >= 6, 'suggestion count').toBe(true);
    for (const b of buttons) {
      expect(b.style.minHeight, b.textContent).toBe('44px');
      expect(b.getAttribute('type'), b.textContent).toBe('button');
    }
  });
});

describe('kit counts come from the real lists', () => {
  it('reads sensible list lengths from the source', () => {
    expect(TOOL_COUNT > 200 && CATEGORY_COUNT === 12 && FOOD_COUNT > 100 && MAP_COUNT > 30).toBe(true);
  });
  it('no hard-coded kit count or "evidence-based tools" claim remains', () => {
    for (const s of ["'127 personal, evidence-based tools'", "'stem.nutritionlab.127_personal_evidence_based_tools'", '200+ tools', '200+ personal tools',
      '200+ tool kit', "'127 Personal Kit Tools'", "'119+ USDA Foods'", "'35 Nutrients · 12 Body Regions'", '12 body regions × 35 nutrients',
      "'60+ USDA-sourced foods'", 'Personal evidence-based nutrition tools']) {
      expect(code.includes(s), s).toBe(false);
    }
  });
  it('the main menu card and telemetry strip show the derived counts', () => {
    const t = text(mount({}));
    expect(t.includes(TOOL_COUNT + ' personal tools'), 'card subtitle').toBe(true);
    expect(t.includes(TOOL_COUNT + ' tools across ' + CATEGORY_COUNT + ' categories'), 'card bullet').toBe(true);
    expect(t.includes(TOOL_COUNT + ' Personal Kit Tools'), 'telemetry kit').toBe(true);
    expect(t.includes(FOOD_COUNT + ' USDA Foods'), 'telemetry foods').toBe(true);
    expect(t.includes(MAP_COUNT + ' Nutrients · 12 Body Regions'), 'telemetry nutrients').toBe(true);
    expect(t.includes('evidence-based tools') || t.includes('127 '), 'old wording').toBe(false);
  });
  it('the kit hub header and tile count agree, with no "evidence-based" claim', () => {
    const t = text(mount({ view: 'myNutritionKit' }));
    expect(t.includes('Personal nutrition tools'), 'header').toBe(true);
    expect(t.includes(TOOL_COUNT + ' tools to build YOUR personal nutrition practice'), 'hub count').toBe(true);
    expect(t.includes('Personal evidence-based'), 'old header').toBe(false);
    expect(t.includes(FOOD_COUNT + ' USDA-sourced foods'), 'food DB tile').toBe(true);
  });
  it('compendium, certificate, closing page, onboarding and final card all use the same count', () => {
    const views = { compendium: TOOL_COUNT + ' personal tools across ' + CATEGORY_COUNT + ' categories', seal: TOOL_COUNT + ' tools · ' + CATEGORY_COUNT + ' categories',
      endKit: 'This kit had ' + TOOL_COUNT + ' personal tools', onboard: 'How to use this ' + TOOL_COUNT + '-tool kit', finalCard: 'This kit has ' + TOOL_COUNT + ' tools.' };
    for (const [nkView, expected] of Object.entries(views)) {
      const t = text(mount({ view: 'myNutritionKit', nkView }));
      expect(t.includes(expected), nkView + ': ' + expected).toBe(true);
      expect(t.includes('200+'), nkView + ' 200+').toBe(false);
      unmount();
    }
  });
  it('the compendium category list is the hub category list', () => {
    const t = text(mount({ view: 'myNutritionKit', nkView: 'compendium' }));
    expect(t.includes('Food Log · Goals · Body Listening · Cooking · Culture · School · Sport · Medical · Mental Health · Reflection · Maine · System'), 'labels').toBe(true);
  });
});
