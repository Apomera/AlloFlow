// ═══════════════════════════════════════════
// stem_tool_nutritionlab.js — NutritionLab: Nutrition Science
// Adolescent-safe nutrition science tool. Frame: PHYSIOLOGY-FIRST ("what your
// body uses food for") rather than weight-loss. Built from a school-psych lens
// for ages ~12-18. No calorie counting as score, no good/bad food binary, no
// thin-ideal imagery, no diet evangelism. Sources cited inline: USDA FoodData
// Central for nutrient values; NIH ODS Fact Sheets for deficiency consequences;
// Harvard T.H. Chan, AAP, NEDA for context. Eating-disorder content (when it
// ships in Phase 4) gates behind explicit content warning.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('nutritionLab'))) {

(function() {
  'use strict';

  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  var _prefersReducedMotion = (function() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // Print stylesheet
  (function() {
    if (document.getElementById('nutritionlab-print-css')) return;
    var st = document.createElement('style');
    st.id = 'nutritionlab-print-css';
    st.textContent = [
      '@media print {',
      '  .nutritionlab-no-print { display: none !important; }',
      '  details.nutritionlab-teacher-notes { display: block !important; }',
      '  details.nutritionlab-teacher-notes > summary { list-style: none; cursor: default; }',
      '  details.nutritionlab-teacher-notes[open] > *,',
      '  details.nutritionlab-teacher-notes > * { display: block !important; }',
      '  body { background: white !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // Visual flair CSS — emerald/teal theme, gated by global motion-reduce
  (function() {
    if (document.getElementById('nutritionlab-flair-css')) return;
    var st = document.createElement('style');
    st.id = 'nutritionlab-flair-css';
    st.textContent = [
      '@keyframes nutritionlab-stripe {',
      '  0%   { background-position: 0 0; }',
      '  100% { background-position: 24px 0; }',
      '}',
      '@keyframes nutritionlab-pulse-ring {',
      '  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }',
      '  50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }',
      '}',
      '@keyframes nutritionlab-leaf-sway {',
      '  0%, 100% { transform: rotate(-6deg); }',
      '  50%      { transform: rotate(6deg); }',
      '}',
      '.nutritionlab-stripe-anim {',
      '  background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 16px);',
      '  background-size: 24px 24px;',
      '  animation: nutritionlab-stripe 0.9s linear infinite;',
      '}',
      '.nutritionlab-pulse-ring { animation: nutritionlab-pulse-ring 1.6s ease-out infinite; }',
      '.nutritionlab-leaf-sway { animation: nutritionlab-leaf-sway 3.2s ease-in-out infinite; transform-origin: bottom center; display: inline-block; }',
      '.nutritionlab-card-lift { transition: transform 200ms ease, box-shadow 200ms ease; }',
      '.nutritionlab-card-lift:hover { transform: translateY(-3px); }',
      '.nutritionlab-card-lift:focus-visible { transform: translateY(-3px); }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // Live region (WCAG 4.1.3)
  (function() {
    if (document.getElementById('allo-live-nutritionlab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-nutritionlab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(lr);
  })();
  var announce = function(msg) {
    try { var lr = document.getElementById('allo-live-nutritionlab'); if (lr) lr.textContent = msg; } catch (_) {}
  };

  // localStorage helpers
  function lsGet(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
  function lsSet(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ─────────────────────────────────────────────────────
  // DATA — USDA FoodData Central typical-serving values + NIH ODS sources
  // ─────────────────────────────────────────────────────
  // Each food has: id, name, emoji, category, serving (human label), grams,
  // and nutrient totals per serving. Categories drive the "physiology
  // benefit" readout in Macronutrient Lab. `tags` array names the key
  // micronutrients each food brings — used to roll up benefit messages.
  var FOODS = [
    { id: 'apple',      name: 'Apple',                emoji: '🍎', cat: 'fruit',     serving: '1 medium (182 g)', kcal: 95,  c: 25, p: 0.5, f: 0.3, fib: 4.4, tags: ['vitC','fiber'] },
    { id: 'banana',     name: 'Banana',               emoji: '🍌', cat: 'fruit',     serving: '1 medium (118 g)', kcal: 105, c: 27, p: 1.3, f: 0.4, fib: 3.1, tags: ['potassium','b6'] },
    { id: 'broccoli',   name: 'Broccoli (cooked)',    emoji: '🥦', cat: 'vegetable', serving: '1 cup (156 g)',    kcal: 55,  c: 11, p: 4,   f: 0.6, fib: 5,   tags: ['vitC','vitK','folate','fiber'] },
    { id: 'spinach',    name: 'Spinach (raw)',        emoji: '🥬', cat: 'vegetable', serving: '1 cup (30 g)',     kcal: 7,   c: 1,  p: 0.9, f: 0.1, fib: 0.7, tags: ['vitK','folate','iron'] },
    { id: 'sweetPot',   name: 'Sweet potato (baked)', emoji: '🍠', cat: 'vegetable', serving: '1 medium (130 g)', kcal: 105, c: 24, p: 2,   f: 0.1, fib: 4,   tags: ['vitA','potassium','fiber'] },
    { id: 'chicken',    name: 'Chicken breast',       emoji: '🍗', cat: 'protein',   serving: '3 oz (85 g) cooked', kcal: 140, c: 0, p: 26, f: 3,   fib: 0,   tags: ['protein','b6','niacin'] },
    { id: 'salmon',     name: 'Salmon',               emoji: '🐟', cat: 'protein',   serving: '3 oz (85 g) cooked', kcal: 205, c: 0, p: 22, f: 13,  fib: 0,   tags: ['protein','omega3','vitD','b12'] },
    { id: 'egg',        name: 'Egg',                  emoji: '🥚', cat: 'protein',   serving: '1 large (50 g)',     kcal: 70,  c: 0.6, p: 6, f: 5, fib: 0,   tags: ['protein','choline','b12','vitD'] },
    { id: 'yogurt',     name: 'Greek yogurt (plain)', emoji: '🥣', cat: 'protein',   serving: '6 oz (170 g)',     kcal: 100, c: 8,  p: 17,  f: 0.7, fib: 0,   tags: ['protein','calcium','b12'] },
    { id: 'lentils',    name: 'Lentils (cooked)',     emoji: '🫘', cat: 'legume',    serving: '1/2 cup (99 g)',   kcal: 115, c: 20, p: 9,   f: 0.4, fib: 7.8, tags: ['protein','folate','iron','fiber'] },
    { id: 'blackBeans', name: 'Black beans (cooked)', emoji: '🫘', cat: 'legume',    serving: '1/2 cup (86 g)',   kcal: 115, c: 20, p: 8,   f: 0.5, fib: 7.5, tags: ['protein','folate','magnesium','fiber'] },
    { id: 'rice',       name: 'Brown rice (cooked)',  emoji: '🍚', cat: 'grain',     serving: '1 cup (195 g)',    kcal: 215, c: 45, p: 5,   f: 1.8, fib: 3.5, tags: ['manganese','b-complex','fiber'] },
    { id: 'oats',       name: 'Oats (dry)',           emoji: '🌾', cat: 'grain',     serving: '1/2 cup (40 g)',   kcal: 150, c: 27, p: 5,   f: 3,   fib: 4,   tags: ['betaGlucan','manganese','fiber'] },
    { id: 'wholeBread', name: 'Whole-wheat bread',    emoji: '🍞', cat: 'grain',     serving: '1 slice (28 g)',   kcal: 80,  c: 14, p: 4,   f: 1,   fib: 2,   tags: ['fiber','b-complex'] },
    { id: 'almonds',    name: 'Almonds',              emoji: '🥜', cat: 'fat',       serving: '1 oz (28 g, ~23)', kcal: 165, c: 6,  p: 6,   f: 14,  fib: 4,   tags: ['vitE','magnesium','fiber'] }
  ];

  var FOOD_BY_ID = {};
  FOODS.forEach(function(f) { FOOD_BY_ID[f.id] = f; });

  // ─────────────────────────────────────────────────────
  // VITAMINS — 13 entries, NIH ODS Fact Sheets + USDA sources
  // ─────────────────────────────────────────────────────
  var VITAMINS = [
    { id: 'vitA',  name: 'Vitamin A',     emoji: '👁️', soluble: 'fat',  function: 'Vision (especially low-light), immune function, skin and lining of organs, healthy growth.', sources: 'Sweet potato, carrots, leafy greens, eggs, liver, fortified dairy.', deficiency: 'Night blindness, dry skin, weakened immunity. Common globally in regions with limited diet variety; rare in the US.', rda: '700–900 mcg/day (adults)', cite: 'NIH ODS' },
    { id: 'vitC',  name: 'Vitamin C',     emoji: '🍊', soluble: 'water', function: 'Builds collagen for skin / blood vessels / wound healing, antioxidant, helps your body absorb iron from plant foods.', sources: 'Citrus, bell peppers, strawberries, broccoli, kiwi, tomatoes.', deficiency: 'Bruising, slow wound healing; severe deficiency causes scurvy (rare in modern US).', rda: '75–90 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'vitD',  name: 'Vitamin D',     emoji: '☀️', soluble: 'fat',  function: 'Helps absorb calcium for bones and teeth, supports immune function, may support mood. Your skin makes vitamin D from sunlight — but at Maine\'s latitude, the sun is too low Oct–Mar to make any.', sources: 'Fatty fish (salmon, sardines, mackerel), egg yolks, fortified milk, fortified plant milks. Sunshine spring through fall.', deficiency: 'Bone weakness (rickets in kids, osteomalacia in adults), increased risk of stress fractures. WIDESPREAD in Maine winters — many Mainers benefit from a supplement under a doctor\'s guidance.', rda: '600–800 IU/day (adults); higher under medical supervision', cite: 'NIH ODS · Maine winter latitude noted in clinical literature' },
    { id: 'vitE',  name: 'Vitamin E',     emoji: '🥜', soluble: 'fat',  function: 'Antioxidant — protects cells from damage. Helps the immune system.', sources: 'Almonds, sunflower seeds, leafy greens, vegetable oils.', deficiency: 'Rare in the US; can cause nerve and muscle problems in severe cases.', rda: '15 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'vitK',  name: 'Vitamin K',     emoji: '🥬', soluble: 'fat',  function: 'Blood clotting, bone health.', sources: 'Leafy greens (spinach, kale, collards), broccoli, soybean oil.', deficiency: 'Rare in healthy adults. Newborns receive a vitamin K injection at birth to prevent bleeding.', rda: '90–120 mcg/day (adults)', cite: 'NIH ODS' },
    { id: 'b1',    name: 'B1 — Thiamin',  emoji: '⚡', soluble: 'water', function: 'Helps cells convert food into energy, supports nerve function.', sources: 'Pork, whole grains, beans, fortified cereals.', deficiency: 'Beriberi (rare in modern US). Mild deficiency: fatigue, irritability.', rda: '1.1–1.2 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'b2',    name: 'B2 — Riboflavin', emoji: '🌟', soluble: 'water', function: 'Energy metabolism, helps eyes and skin stay healthy.', sources: 'Dairy, eggs, lean meat, leafy greens, fortified grains.', deficiency: 'Cracked lips, sore throat (rare in US).', rda: '1.1–1.3 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'b3',    name: 'B3 — Niacin',   emoji: '🔋', soluble: 'water', function: 'Energy metabolism, DNA repair, supports skin and digestive system.', sources: 'Poultry, fish, peanuts, fortified grains.', deficiency: 'Severe deficiency causes pellagra (very rare). Mild: fatigue.', rda: '14–16 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'b6',    name: 'B6 — Pyridoxine', emoji: '🧠', soluble: 'water', function: 'Amino acid metabolism, brain development, immune function. Helps make neurotransmitters (mood-relevant).', sources: 'Poultry, fish, potatoes, bananas, fortified cereals.', deficiency: 'Anemia, depression-like symptoms (rare in well-fed populations).', rda: '1.3–1.7 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'b9',    name: 'B9 — Folate',   emoji: '🧬', soluble: 'water', function: 'DNA synthesis, red blood cell formation, fetal neural-tube development. Critical in pregnancy.', sources: 'Leafy greens, lentils, asparagus, fortified grains.', deficiency: 'Anemia. In pregnancy: neural-tube birth defects. US grain fortification has greatly reduced this.', rda: '400 mcg/day adults; 600 mcg in pregnancy', cite: 'NIH ODS · CDC' },
    { id: 'b12',   name: 'B12 — Cobalamin', emoji: '🩸', soluble: 'water', function: 'Nerve function, red blood cell formation, DNA synthesis.', sources: 'ANIMAL PRODUCTS ONLY — meat, fish, eggs, dairy. Fortified plant milks and nutritional yeast for vegans.', deficiency: 'Anemia, nerve damage, dementia-like symptoms. RELEVANT FOR VEGANS / VEGETARIANS — supplement is standard practice.', rda: '2.4 mcg/day (adults)', cite: 'NIH ODS · NIH MedlinePlus' },
    { id: 'b7',    name: 'B7 — Biotin',   emoji: '🥚', soluble: 'water', function: 'Fatty acid metabolism, supports hair / skin / nails.', sources: 'Eggs, nuts, sweet potato, salmon. Made by gut bacteria too.', deficiency: 'Very rare. Hair thinning, rash.', rda: '30 mcg/day (adults; AI)', cite: 'NIH ODS' },
    { id: 'choline', name: 'Choline',     emoji: '🥚', soluble: 'water', function: 'Brain development, liver function, cell membrane structure. Critical in pregnancy.', sources: 'Eggs (yolks), beef, fish, soybeans, peanuts.', deficiency: 'Fatty liver, muscle damage. Many Americans don\'t hit the recommended intake.', rda: '425–550 mg/day (adults; AI)', cite: 'NIH ODS' }
  ];

  // ─────────────────────────────────────────────────────
  // MINERALS — 15 entries, NIH ODS sources
  // ─────────────────────────────────────────────────────
  var MINERALS = [
    { id: 'calcium',    name: 'Calcium',    emoji: '🦴', kind: 'macro', function: 'Builds bones and teeth, muscle contraction, nerve signaling, blood clotting.', sources: 'Dairy, fortified plant milks, leafy greens, sardines (with bones), tofu set with calcium sulfate.', deficiency: 'Osteoporosis (later in life), increased fracture risk. Adolescent years are PEAK bone-building years — intake during teens shapes lifelong bone density.', rda: '1300 mg/day teens (highest of any age group)', cite: 'NIH ODS' },
    { id: 'iron',       name: 'Iron',       emoji: '🩸', kind: 'trace', function: 'Hemoglobin (carries oxygen in blood), brain function, immune system.', sources: 'Red meat, lentils, spinach, beans, fortified cereals. Pair plant-iron foods with vitamin C (citrus, peppers) to boost absorption.', deficiency: 'Iron-deficiency anemia: fatigue, brain fog, pale skin, weakness. HIGH-RISK GROUPS: menstruating teens (especially girls), athletes, vegetarians. AAP notes iron deficiency can present with ADHD-like symptoms in adolescents.', rda: '8 mg/day boys, 15 mg/day girls (15+); 18 mg/day for menstruating adults', cite: 'NIH ODS · AAP' },
    { id: 'magnesium',  name: 'Magnesium',  emoji: '🌿', kind: 'macro', function: 'Muscle and nerve function, energy production, blood sugar regulation, sleep.', sources: 'Dark chocolate, almonds, spinach, avocado, black beans.', deficiency: 'Common in US (most adults under-consume). Mild: muscle cramps, fatigue, anxiety-like symptoms.', rda: '310–420 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'phosphorus', name: 'Phosphorus', emoji: '🦴', kind: 'macro', function: 'Bone and tooth structure, ATP (your cellular energy currency), DNA.', sources: 'Dairy, meat, fish, nuts, beans.', deficiency: 'Rare in healthy people. Weakness, bone pain in severe cases.', rda: '1250 mg/day teens', cite: 'NIH ODS' },
    { id: 'potassium',  name: 'Potassium',  emoji: '🍌', kind: 'macro', function: 'Heart rhythm, muscle contraction, blood pressure regulation, fluid balance.', sources: 'Banana, potato, sweet potato, beans, leafy greens, orange juice.', deficiency: 'Most Americans don\'t hit recommended intake. Severe deficiency: weakness, irregular heartbeat.', rda: '2300–3400 mg/day (adults; AI)', cite: 'NIH ODS' },
    { id: 'sodium',     name: 'Sodium',     emoji: '🧂', kind: 'macro', function: 'Nerve signaling, fluid balance.', sources: 'Table salt, processed foods, restaurant foods, bread, soups.', deficiency: 'Very rare in modern diet. Most Americans get TOO MUCH sodium (linked to high blood pressure). Average US intake is 50–80% over recommended limits.', rda: 'Limit to <2300 mg/day; 1500 mg ideal', cite: 'NIH ODS · CDC' },
    { id: 'chloride',   name: 'Chloride',   emoji: '🧂', kind: 'macro', function: 'Fluid balance, makes stomach acid for digestion.', sources: 'Table salt (sodium chloride), seaweed, tomatoes, olives.', deficiency: 'Rare; comes alongside sodium in most foods.', rda: '2300 mg/day (adults; AI)', cite: 'NIH ODS' },
    { id: 'zinc',       name: 'Zinc',       emoji: '🛡️', kind: 'trace', function: 'Immune function, wound healing, growth, taste and smell.', sources: 'Oysters, beef, pumpkin seeds, lentils, fortified cereals.', deficiency: 'Impaired immunity, slow wound healing, growth delays in kids.', rda: '8–11 mg/day (adults)', cite: 'NIH ODS' },
    { id: 'iodine',     name: 'Iodine',     emoji: '🦋', kind: 'trace', function: 'Makes thyroid hormones, which regulate metabolism, growth, and brain development.', sources: 'Iodized salt, fish, shellfish, dairy, seaweed.', deficiency: 'Goiter (enlarged thyroid), hypothyroidism, cognitive impairment in pregnancy. Iodized salt programs largely eliminated this in the US.', rda: '150 mcg/day (adults)', cite: 'NIH ODS' },
    { id: 'selenium',   name: 'Selenium',   emoji: '🌰', kind: 'trace', function: 'Antioxidant, thyroid hormone production, immune function.', sources: 'Brazil nuts (very rich — 1–2 nuts covers daily need), fish, eggs, brown rice.', deficiency: 'Weakened immunity. Deficiency exists in some areas of China where soil is selenium-poor; rare in US.', rda: '55 mcg/day (adults)', cite: 'NIH ODS' },
    { id: 'copper',     name: 'Copper',     emoji: '🧡', kind: 'trace', function: 'Helps body use iron, supports connective tissue, nerve cells, immune function.', sources: 'Shellfish, nuts, seeds, dark chocolate, organ meats.', deficiency: 'Anemia, weakened bones. Rare.', rda: '900 mcg/day (adults)', cite: 'NIH ODS' },
    { id: 'manganese',  name: 'Manganese',  emoji: '🌾', kind: 'trace', function: 'Bone formation, blood sugar regulation, energy metabolism.', sources: 'Whole grains, nuts, leafy greens, tea.', deficiency: 'Very rare in humans.', rda: '1.8–2.3 mg/day (adults; AI)', cite: 'NIH ODS' },
    { id: 'chromium',   name: 'Chromium',   emoji: '🌽', kind: 'trace', function: 'Helps insulin work properly to regulate blood sugar.', sources: 'Whole grains, broccoli, grape juice, meats.', deficiency: 'Impaired blood-sugar regulation (rare).', rda: '25–35 mcg/day (adults; AI)', cite: 'NIH ODS' },
    { id: 'molybdenum', name: 'Molybdenum', emoji: '🌱', kind: 'trace', function: 'Helps enzymes break down toxic byproducts of metabolism.', sources: 'Legumes, whole grains, nuts.', deficiency: 'Extremely rare.', rda: '45 mcg/day (adults)', cite: 'NIH ODS' },
    { id: 'fluoride',   name: 'Fluoride',   emoji: '🦷', kind: 'trace', function: 'Strengthens teeth and bones, prevents cavities.', sources: 'Fluoridated tap water, tea, fish (bones), toothpaste (topical).', deficiency: 'Increased risk of dental cavities. CDC ranks community water fluoridation as one of the top 10 public health achievements of the 20th century.', rda: '3–4 mg/day (adults; AI)', cite: 'NIH ODS · CDC' }
  ];

  // ─────────────────────────────────────────────────────
  // ESSENTIAL FATTY ACIDS — omega-3 (Maine fisheries angle), omega-6
  // ─────────────────────────────────────────────────────
  var EFAS = [
    { id: 'omega3', name: 'Omega-3 (EPA/DHA)', emoji: '🐟', function: 'Brain structure (DHA is a major component of brain tissue), heart rhythm, anti-inflammatory effects. Harvard research links higher omega-3 intake to lower depression risk and better cardiovascular outcomes.', sources: 'Fatty fish: salmon, mackerel, sardines, herring (Maine fisheries are a powerhouse). Walnuts and flax provide ALA, a precursor your body partially converts.', deficiency: 'No formal "deficiency disease," but most Americans fall short of recommended intake. Linked to higher inflammation and some mood/cardiovascular concerns.', rda: 'AHA: 250–500 mg combined EPA + DHA per day for healthy adults; 2 fatty-fish meals per week.', cite: 'AHA · Harvard T.H. Chan School of Public Health' },
    { id: 'omega6', name: 'Omega-6 (Linoleic acid)', emoji: '🌻', function: 'Cell membrane structure, immune signaling, healthy skin.', sources: 'Vegetable oils (sunflower, corn, soybean), nuts, seeds, poultry. Most Americans get plenty — often more than needed.', deficiency: 'Very rare in US diet. Excess (relative to omega-3) may contribute to inflammation per some research.', rda: 'AI 12–17 g/day (adults)', cite: 'NIH ODS' }
  ];

  window.StemLab.registerTool('nutritionLab', {
    name: 'NutritionLab — Nutrition Science',
    icon: '🥗',
    desc: 'Adolescent-safe nutrition science: macronutrients, micronutrients, food labels, metabolism, digestion, common myths, food + mental health, eating-disorder awareness, Maine food reality, and registered-dietitian career pathways. Frame is physiology-first ("what your body uses food for"), not weight-loss. Sources cited inline: USDA FoodData Central, NIH ODS, Harvard T.H. Chan, AAP, NEDA.',
    render: function(ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      var d = (ctx.toolData && ctx.toolData['nutritionLab']) || {};
      var upd = function(key, val) { ctx.update('nutritionLab', key, val); };
      var addToast = ctx.addToast || function(msg) { console.log('[NutritionLab]', msg); };

      var _hydratedRef = useRef(false);
      if (!_hydratedRef.current) {
        _hydratedRef.current = true;
        var savedBadges = lsGet('nutritionLab.badges.v1', null);
        if (savedBadges && d.nlBadges === undefined) upd('nlBadges', savedBadges);
      }

      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];

      var BADGE_IDS = ['macroLab','microAtlas','labelReader','energyBalance','digestion','myths','foodMood','edAwareness','maineReality','careerPaths'];
      var goto = function(v) {
        setView(v);
        upd('view', v);
        if (BADGE_IDS.indexOf(v) !== -1) {
          var prev = d.nlBadges || {};
          if (!prev[v]) {
            var next = Object.assign({}, prev);
            next[v] = true;
            upd('nlBadges', next);
            lsSet('nutritionLab.badges.v1', next);
            announce('Module explored: ' + v);
          }
        }
      };

      // ─────────────────────────────────────────────────────
      // SHARED COMPONENTS
      // ─────────────────────────────────────────────────────

      function BackBar(props) {
        return h('div', { className: 'flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 shadow' },
          h('button', {
            onClick: function() { setView('menu'); upd('view', 'menu'); },
            'aria-label': 'Back to NutritionLab menu',
            className: 'px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-bold text-sm transition-colors'
          }, '← Menu'),
          h('span', { className: 'text-3xl' }, props.icon),
          h('h1', { className: 'text-xl font-black flex-1' }, props.title)
        );
      }

      function StatCard(props) {
        return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
          h('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-slate-700' }, props.label),
          h('div', { className: 'text-2xl font-black ' + (props.color || 'text-emerald-700') }, props.value),
          props.unit && h('div', { className: 'text-[10px] text-slate-700' }, props.unit)
        );
      }

      function TeacherNotes(props) {
        return h('details', { className: 'nutritionlab-teacher-notes bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
          h('summary', {
            className: 'cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 select-none flex items-center justify-between gap-3',
            'aria-label': 'Teacher Notes — discussion questions, standards alignment, and extension activities'
          },
            h('span', null, '🍎 Teacher Notes — click to expand'),
            h('span', {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Print this module page (includes Teacher Notes)',
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              className: 'nutritionlab-no-print text-xs font-semibold normal-case px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-800'
            }, '🖨️ Print')
          ),
          h('div', { className: 'mt-3 space-y-3 text-sm' },
            props.standards && props.standards.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'NGSS / CTE Standards'),
              h('div', { className: 'text-slate-700' },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, className: 'inline-block mr-2 mb-1 px-2 py-0.5 bg-white border border-amber-300 rounded text-xs font-mono' }, s);
                })
              )
            ),
            props.questions && props.questions.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Discussion Questions'),
              h('ol', { className: 'list-decimal list-inside space-y-1 text-slate-700' },
                props.questions.map(function(q, i) { return h('li', { key: i }, q); })
              )
            ),
            props.misconceptions && props.misconceptions.length > 0 && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Watch for these misconceptions'),
              h('ul', { className: 'space-y-1 text-slate-700' },
                props.misconceptions.map(function(m, i) {
                  return h('li', { key: i, className: 'flex items-start gap-1.5' },
                    h('span', { className: 'text-amber-600 font-bold' }, '⚠'),
                    h('span', null, m)
                  );
                })
              )
            ),
            props.extension && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Extension Activity'),
              h('div', { className: 'text-slate-700 italic' }, props.extension)
            ),
            props.sources && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Sources cited'),
              h('div', { className: 'text-xs text-slate-700' }, props.sources)
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAIN MENU
      // ─────────────────────────────────────────────────────
      function MainMenu() {
        var bigCards = [
          {
            id: 'macroLab', title: 'Macronutrient Lab', icon: '🍽️',
            subtitle: 'Build a plate, see what your body uses it for',
            desc: 'Click foods to add them to a plate. Watch the carbs, protein, fat, and fiber totals update from real USDA values. Get a physiology readout: which body systems each meal supports — muscle repair, brain fuel, oxygen delivery, gut health. No calorie targets, no good/bad food labels.',
            bullets: ['15 real foods with USDA values', 'Live macro totals + fiber', 'Physiology benefit readout', 'Keyboard accessible — no drag-drop required'],
            color: 'from-emerald-500 to-teal-700',
            ring: 'ring-emerald-500/40',
            ready: true
          },
          {
            id: 'microAtlas', title: 'Micronutrient Atlas', icon: '🌈',
            subtitle: '13 vitamins, 15 minerals, omega-3',
            desc: 'Click any nutrient to see what it does, where to find it, and what happens when you don\'t get enough. Maine-relevant: vitamin D (winter sun problem), omega-3 (Maine fisheries), iron (high-need group is teens). Every entry sourced from NIH ODS Fact Sheets.',
            bullets: ['13 essential vitamins', '15 essential minerals', 'Omega-3 EFA breakdown', 'NIH ODS sourced inline'],
            color: 'from-lime-500 to-emerald-600',
            ring: 'ring-lime-500/40',
            ready: true
          },
          {
            id: 'labelReader', title: 'Food Label Reader', icon: '🏷️',
            subtitle: 'Decode a Nutrition Facts panel like a pro',
            desc: 'Real-style Nutrition Facts panels from common foods. Decode serving-size traps, % Daily Value, added sugars, sodium. Progressive challenges from a simple granola bar up to a multi-serving frozen meal that lies about its real serving count.',
            bullets: ['4–5 progressive challenges', 'Serving-size deception drills', '% DV, added sugars, sodium', 'FDA label spec aligned'],
            color: 'from-cyan-500 to-blue-600',
            ring: 'ring-cyan-500/40',
            ready: true
          }
        ];
        var miniCards = [
          {
            id: 'energyBalance', title: 'Energy & Metabolism', icon: '⚡',
            subtitle: 'ATP, mitochondria, and your brain',
            desc: 'Where your body\'s energy actually comes from. ATP cycle, why brains use ~20% of daily energy, what BMR / TDEE actually mean. Framed as physiology, not weight management.',
            color: 'from-amber-500 to-orange-600',
            ring: 'ring-amber-500/40',
            ready: true
          },
          {
            id: 'digestion', title: 'Digestion Walkthrough', icon: '🍽️',
            subtitle: 'Mouth → stomach → intestines',
            desc: 'Where each macronutrient is broken down. Hormones (insulin, glucagon, leptin, ghrelin) and what they actually do.',
            color: 'from-rose-500 to-pink-600',
            ring: 'ring-rose-500/40',
            ready: true
          },
          {
            id: 'myths', title: 'Common Nutrition Myths', icon: '🔍',
            subtitle: '8–10 myths debunked with citations',
            desc: 'Detoxes, "superfoods," gluten-free for non-celiac, vitamin megadosing, fat-free craze, organic = healthier. NIH and Harvard sourced.',
            color: 'from-violet-500 to-purple-700',
            ring: 'ring-violet-500/40',
            ready: true
          },
          {
            id: 'foodMood', title: 'Food & Mental Health', icon: '🧠',
            subtitle: 'Real research, careful framing',
            desc: 'Omega-3 + depression, iron + ADHD-style fatigue, sugar crashes, caffeine + adolescent anxiety, gut-brain axis. Contributing factors, not cures.',
            color: 'from-indigo-500 to-blue-700',
            ring: 'ring-indigo-500/40',
            ready: true
          },
          {
            id: 'edAwareness', title: 'Eating Disorder Awareness', icon: '💚',
            subtitle: 'NEDA-aligned · opt-in content warning',
            desc: 'Spectrum of disordered eating, signs to watch for, online content red flags + algorithm-awareness, how to support a friend, what to do if it\'s you, recovery paths. NEDA + Surgeon General sourced. Gated by content warning.',
            color: 'from-teal-500 to-emerald-700',
            ring: 'ring-teal-500/40',
            ready: true
          },
          {
            id: 'maineReality', title: 'Maine Food Reality', icon: '🌲',
            subtitle: 'Winter, fisheries, food deserts',
            desc: 'Maine winters and vitamin D, Maine fisheries (omega-3 powerhouse), Aroostook + Washington food deserts, school meals + SNAP basics, Good Shepherd Food Bank.',
            color: 'from-stone-500 to-stone-700',
            ring: 'ring-stone-500/40',
            ready: true
          },
          {
            id: 'careerPaths', title: 'Career Pathways', icon: '🎓',
            subtitle: 'RDN, public health, food science',
            desc: 'Registered Dietitian (Master\'s + 1200hr internship), public health nutritionist, food scientist, sports nutritionist, school nutrition director. UMaine + Husson programs.',
            color: 'from-blue-600 to-indigo-700',
            ring: 'ring-blue-600/40',
            ready: true
          }
        ];

        var badges = d.nlBadges || {};
        var visitedCount = BADGE_IDS.filter(function(id) { return badges[id]; }).length;
        var totalCount = BADGE_IDS.length;
        var allDone = visitedCount === totalCount;

        var renderCard = function(c, isBig) {
          var visited = !!badges[c.id];
          var notReady = !c.ready;
          return h('button', {
            key: c.id,
            onClick: function() {
              if (notReady) {
                addToast('Coming soon — this module ships in a later phase.');
                return;
              }
              goto(c.id);
            },
            'aria-label': c.title + (visited ? ' (explored)' : '') + (notReady ? ' — coming soon' : ''),
            'aria-disabled': notReady ? 'true' : 'false',
            className: 'relative text-left bg-white rounded-2xl shadow-lg border-2 ' +
              (visited ? 'border-emerald-600' : 'border-slate-200') +
              ' overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring +
              (notReady ? ' opacity-70 cursor-not-allowed' : ' nutritionlab-card-lift hover:shadow-2xl hover:border-slate-400')
          },
            visited && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-emerald-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md nutritionlab-pulse-ring'
            }, '✓'),
            notReady && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md'
            }, 'Soon'),
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('span', { className: isBig ? 'text-5xl' : 'text-4xl' }, c.icon),
                h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, isBig ? 'Core' : 'Lab')
              ),
              h('h2', { className: isBig ? 'text-2xl font-black' : 'text-xl font-black' }, c.title),
              h('p', { className: 'text-sm opacity-90 font-medium' }, c.subtitle)
            ),
            h('div', { className: 'p-5' },
              h('p', { className: 'text-sm text-slate-700 leading-relaxed ' + (isBig ? 'mb-3' : '') }, c.desc),
              isBig && c.bullets && h('ul', { className: 'space-y-1' },
                c.bullets.map(function(b, i) {
                  return h('li', { key: i, className: 'text-xs text-slate-700 flex items-start gap-1.5' },
                    h('span', { className: 'text-emerald-600 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'text-center mb-6' },
            h('div', { className: 'text-6xl mb-3' },
              h('span', { className: 'nutritionlab-leaf-sway inline-block', 'aria-hidden': true }, '🥗')),
            h('h1', { className: 'text-4xl font-black text-slate-800 mb-2' }, 'NutritionLab'),
            h('p', { className: 'text-lg text-slate-700 max-w-2xl mx-auto' },
              'Nutrition science from a physiology-first lens. What your body uses food for, why micronutrients matter, how to read a label, and the careers built on this knowledge. No calorie targets, no good/bad food binaries — just real biology.')
          ),
          // Framing banner — sets tone immediately, especially for adolescent users
          h('div', { className: 'mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300' },
            h('div', { className: 'flex items-start gap-3' },
              h('span', { className: 'text-2xl', 'aria-hidden': true }, '💚'),
              h('div', null,
                h('div', { className: 'font-bold text-emerald-900 mb-1' }, 'A note on how this tool talks about food'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'No food is "bad." No body type is "right." This tool covers nutrition science the way a registered dietitian or doctor would — focused on what nutrients do for your body and brain, not what to avoid. If you or a friend are struggling with eating, the NEDA helpline is ',
                  h('strong', { className: 'font-mono text-emerald-900' }, '1-800-931-2237'),
                  ' (text "NEDA" to 741741).')
              )
            )
          ),
          h('div', {
            'aria-live': 'polite',
            className: 'mb-6 p-4 rounded-2xl border-2 ' + (allDone ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200') + ' flex items-center justify-between gap-4'
          },
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-3xl' }, allDone ? '🏆' : '🌱'),
              h('div', null,
                h('div', { className: 'font-bold text-slate-800' },
                  allDone ? 'All modules explored — full nutrition path complete!' : ('Progress: ' + visitedCount + ' of ' + totalCount + ' modules explored')
                ),
                h('div', { className: 'text-xs text-slate-700' },
                  allDone ? 'Revisit any module to deepen your understanding.' : 'Open each card below to learn its specialty.')
              )
            ),
            h('div', { className: 'flex-shrink-0 w-32 h-3 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
              h('div', {
                className: 'h-full nutritionlab-stripe-anim ' + (allDone ? 'bg-emerald-500' : 'bg-emerald-400') + ' transition-all',
                style: { width: Math.round((visitedCount / totalCount) * 100) + '%' }
              })
            )
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 px-1' }, 'Core Simulators'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' },
            bigCards.map(function(c) { return renderCard(c, true); })
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 px-1' }, 'Quick Labs'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
            miniCards.map(function(c) { return renderCard(c, false); })
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-700 italic' },
            'All 10 modules live — physiology-first nutrition science from a school-psych lens. Explore in any order.')
        );
      }

      // ─────────────────────────────────────────────────────
      // INTERACTIVE VISUAL HELPERS — Donut chart, daily-intake bars, food compare
      // ─────────────────────────────────────────────────────
      // PHYSIOLOGY-FIRST visuals, NEVER framed as goals. All numbers are
      // informational: "what the meal contributed", not "what you should eat".

      // Macro donut: carbs/protein/fat as percent of meal energy.
      function MacroDonut(props) {
        var c_g = props.c || 0, p_g = props.p || 0, f_g = props.f || 0;
        var c_kcal = c_g * 4, p_kcal = p_g * 4, f_kcal = f_g * 9;
        var total = c_kcal + p_kcal + f_kcal;
        if (total <= 0) return h('div', { className: 'text-sm italic text-slate-700 text-center py-6' },
          'Add foods to see how your meal\'s energy is split between carbs, protein, and fat.');
        var W = 220, H = 220;
        var cx = W / 2, cy = H / 2, rOuter = 90, rInner = 60;
        function arcPath(startFrac, endFrac) {
          if (endFrac - startFrac >= 0.999) {
            // Full circle — render as two half-circles to avoid degenerate path
            return 'M ' + (cx - rOuter) + ',' + cy +
                   ' A ' + rOuter + ',' + rOuter + ' 0 1 1 ' + (cx + rOuter) + ',' + cy +
                   ' A ' + rOuter + ',' + rOuter + ' 0 1 1 ' + (cx - rOuter) + ',' + cy +
                   ' L ' + (cx - rInner) + ',' + cy +
                   ' A ' + rInner + ',' + rInner + ' 0 1 0 ' + (cx + rInner) + ',' + cy +
                   ' A ' + rInner + ',' + rInner + ' 0 1 0 ' + (cx - rInner) + ',' + cy + ' Z';
          }
          var a0 = startFrac * 2 * Math.PI - Math.PI / 2;
          var a1 = endFrac * 2 * Math.PI - Math.PI / 2;
          var x0o = cx + rOuter * Math.cos(a0), y0o = cy + rOuter * Math.sin(a0);
          var x1o = cx + rOuter * Math.cos(a1), y1o = cy + rOuter * Math.sin(a1);
          var x0i = cx + rInner * Math.cos(a0), y0i = cy + rInner * Math.sin(a0);
          var x1i = cx + rInner * Math.cos(a1), y1i = cy + rInner * Math.sin(a1);
          var largeArc = (endFrac - startFrac) > 0.5 ? 1 : 0;
          return 'M ' + x0o + ',' + y0o +
                 ' A ' + rOuter + ',' + rOuter + ' 0 ' + largeArc + ' 1 ' + x1o + ',' + y1o +
                 ' L ' + x1i + ',' + y1i +
                 ' A ' + rInner + ',' + rInner + ' 0 ' + largeArc + ' 0 ' + x0i + ',' + y0i + ' Z';
        }
        var slices = [
          { kcal: c_kcal, color: '#d97706', label: 'Carbs',   g: c_g, kcalPerG: 4 },
          { kcal: p_kcal, color: '#be123c', label: 'Protein', g: p_g, kcalPerG: 4 },
          { kcal: f_kcal, color: '#a16207', label: 'Fat',     g: f_g, kcalPerG: 9 }
        ];
        var cum = 0;
        var paths = [];
        slices.forEach(function(s, i) {
          if (s.kcal <= 0) return;
          var startF = cum / total, endF = (cum + s.kcal) / total;
          paths.push(h('path', { key: i, d: arcPath(startF, endF), fill: s.color }));
          cum += s.kcal;
        });
        var pctRow = function(s, i) {
          var pct = total > 0 ? (s.kcal / total * 100) : 0;
          return h('div', { key: i, className: 'flex items-center gap-2 text-xs' },
            h('span', { 'aria-hidden': true, style: { display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: s.color } }),
            h('span', { className: 'text-slate-800 font-semibold' }, s.label, ': '),
            h('span', { className: 'font-mono text-slate-800' }, s.g.toFixed(0) + ' g'),
            h('span', { className: 'text-slate-700' }, ' (' + s.kcal.toFixed(0) + ' kcal · ' + pct.toFixed(0) + '%)')
          );
        };
        return h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
          h('div', { className: 'flex flex-col md:flex-row items-center gap-5' },
            h('svg', {
              width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
              role: 'img',
              'aria-label': 'Energy split for this meal: carbs ' + c_kcal.toFixed(0) + ' kcal, protein ' + p_kcal.toFixed(0) + ' kcal, fat ' + f_kcal.toFixed(0) + ' kcal. Total ' + total.toFixed(0) + ' kcal.'
            },
              paths,
              h('text', { x: cx, y: cy - 4, textAnchor: 'middle', fontSize: 22, fontWeight: 800, fill: '#1e293b' }, total.toFixed(0)),
              h('text', { x: cx, y: cy + 16, textAnchor: 'middle', fontSize: 11, fill: '#475569' }, 'kcal in plate')
            ),
            h('div', { className: 'flex-1 space-y-2' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'Energy split'),
              slices.map(pctRow),
              h('p', { className: 'text-[11px] text-slate-700 italic mt-3 leading-relaxed' },
                'Each gram of carb or protein gives ~4 kcal; each gram of fat gives ~9 kcal. The split varies normally across meals — there\'s no single "right" ratio.')
            )
          )
        );
      }

      // Daily-intake bars: how this meal compares to typical adolescent
      // daily targets. Framing: this is INFORMATIONAL, not a goal-per-meal.
      // Targets from NIH/USDA Dietary Reference Intakes for ages 14-18.
      function DailyIntakeBars(props) {
        var t = props.totals || {};
        // Adolescent (14-18) DRI references — used as informational anchors only.
        var REFS = [
          { label: 'Carbs',   value: t.c || 0,   target: 130, unit: 'g', note: 'RDA min for adolescents — minimum to fuel the brain.' },
          { label: 'Protein', value: t.p || 0,   target: 52,  unit: 'g', note: 'Roughly 0.85 g/kg body weight; varies widely with body size.' },
          { label: 'Fat',     value: t.f || 0,   target: 70,  unit: 'g', note: '25–35% of daily energy. Dietary fat is essential, not optional.' },
          { label: 'Fiber',   value: t.fib || 0, target: 28,  unit: 'g', note: 'Most US teens get only ~half this. Fiber feeds gut microbes.' }
        ];
        if ((t.c || 0) + (t.p || 0) + (t.f || 0) + (t.fib || 0) <= 0) return null;
        var W = 480, H = 200;
        var pad = { l: 80, r: 12, t: 14, b: 28 };
        var maxLabelTarget = REFS.reduce(function(m, r) { return Math.max(m, r.target * 1.4); }, 0);
        var barH = (H - pad.t - pad.b) / REFS.length - 4;
        return h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
          h('div', { className: 'flex items-baseline justify-between mb-2 gap-2 flex-wrap' },
            h('div', { className: 'text-sm font-black text-slate-800' }, 'How this plate stacks against a typical day'),
            h('div', { className: 'text-[11px] text-slate-700 italic' }, 'Informational only — not a goal per meal.')
          ),
          h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Bar chart comparing this meal\'s nutrients to typical adolescent daily reference intakes.' },
            // Background grid: 25%/50%/75%/100% of the typical daily target
            REFS.map(function(r, i) {
              var y = pad.t + i * (barH + 4) + barH / 2;
              var targetX = pad.l + (r.target / maxLabelTarget) * (W - pad.l - pad.r);
              var valueX = pad.l + Math.min(r.value, maxLabelTarget) / maxLabelTarget * (W - pad.l - pad.r);
              var pctOfDay = r.target > 0 ? (r.value / r.target * 100) : 0;
              return h('g', { key: i },
                // Label
                h('text', { x: pad.l - 8, y: y + 4, textAnchor: 'end', fontSize: 12, fontWeight: 700, fill: '#1e293b' }, r.label),
                // Daily target band (faded, behind the value bar)
                h('rect', { x: pad.l, y: y - barH / 2, width: targetX - pad.l, height: barH, fill: '#cbd5e1', opacity: 0.45, rx: 4 }),
                // Tick at exactly the target
                h('line', { x1: targetX, y1: y - barH / 2 - 2, x2: targetX, y2: y + barH / 2 + 2, stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '3 3' }),
                h('text', { x: targetX, y: y - barH / 2 - 4, textAnchor: 'middle', fontSize: 9, fill: '#334155', fontWeight: 700 }, '~' + r.target + r.unit + ' / day'),
                // Actual value bar
                h('rect', { x: pad.l, y: y - barH / 2 + 2, width: Math.max(2, valueX - pad.l), height: barH - 4, fill: r.label === 'Fiber' ? '#15803d' : (r.label === 'Protein' ? '#9f1239' : (r.label === 'Fat' ? '#a16207' : '#b45309')), rx: 3 }),
                // Value annotation
                h('text', { x: Math.max(valueX, pad.l + 30), y: y + 4, fontSize: 11, fontWeight: 700, fill: '#fff', textAnchor: 'end', dx: -4 },
                  r.value.toFixed(0) + r.unit
                ),
                h('text', { x: W - pad.r, y: y + 4, textAnchor: 'end', fontSize: 10, fill: '#64748b', fontFamily: 'monospace' },
                  pctOfDay.toFixed(0) + '% of typical daily reference'
                )
              );
            })
          ),
          h('details', { className: 'mt-2' },
            h('summary', { className: 'text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900' }, 'What these reference values mean'),
            h('div', { className: 'mt-2 text-xs text-slate-700 leading-relaxed space-y-1' },
              REFS.map(function(r, i) { return h('div', { key: i }, h('strong', { className: 'text-slate-800' }, r.label + ' (~' + r.target + r.unit + '/day): '), r.note); }),
              h('p', { className: 'italic mt-2' },
                'Reference Intakes from NIH / USDA for ages 14–18. Real needs vary by body size, sex, and activity. This is a science-literacy reference, not a meal target.'
              )
            )
          )
        );
      }

      // Food-comparison side-by-side. Two pickers; bar chart per nutrient.
      function FoodComparePanel() {
        var pickA = useState(d.fc_a || 'salmon');
        var pickB = useState(d.fc_b || 'chicken');
        var fA_id = pickA[0], setA = pickA[1];
        var fB_id = pickB[0], setB = pickB[1];
        useEffect(function() { upd('fc_a', fA_id); }, [fA_id]);
        useEffect(function() { upd('fc_b', fB_id); }, [fB_id]);
        var fA = FOOD_BY_ID[fA_id], fB = FOOD_BY_ID[fB_id];
        if (!fA || !fB) return null;
        var ROWS = [
          { key: 'kcal', label: 'Energy', unit: 'kcal' },
          { key: 'c',    label: 'Carbs',  unit: 'g' },
          { key: 'p',    label: 'Protein', unit: 'g' },
          { key: 'f',    label: 'Fat',    unit: 'g' },
          { key: 'fib',  label: 'Fiber',  unit: 'g' }
        ];
        var maxes = {};
        ROWS.forEach(function(r) { maxes[r.key] = Math.max(fA[r.key] || 0, fB[r.key] || 0, 1); });
        var W = 480, H = 240;
        var pad = { l: 70, r: 60, t: 18, b: 18 };
        var barH = (H - pad.t - pad.b) / ROWS.length - 6;
        return h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
          h('div', { className: 'flex items-center justify-between mb-3 gap-2 flex-wrap' },
            h('div', { className: 'text-sm font-black text-slate-800' }, '⚖️ Compare two foods side-by-side'),
            h('div', { className: 'text-[11px] text-slate-700 italic' }, 'No good/bad — just what each one brings.')
          ),
          h('div', { className: 'grid grid-cols-2 gap-3 mb-4' },
            h('label', { className: 'text-xs font-bold text-slate-700' },
              h('span', { style: { color: '#0d9488' } }, '◆ Food A'),
              h('select', {
                value: fA_id, onChange: function(e) { setA(e.target.value); },
                className: 'mt-1 block w-full rounded-lg border-2 border-slate-300 p-2 text-sm font-semibold focus:outline-none focus:ring-2 ring-emerald-500',
                'aria-label': 'Food A'
              },
                FOODS.map(function(f) { return h('option', { key: f.id, value: f.id }, f.emoji + ' ' + f.name); })
              )
            ),
            h('label', { className: 'text-xs font-bold text-slate-700' },
              h('span', { style: { color: '#9f1239' } }, '◇ Food B'),
              h('select', {
                value: fB_id, onChange: function(e) { setB(e.target.value); },
                className: 'mt-1 block w-full rounded-lg border-2 border-slate-300 p-2 text-sm font-semibold focus:outline-none focus:ring-2 ring-rose-500',
                'aria-label': 'Food B'
              },
                FOODS.map(function(f) { return h('option', { key: f.id, value: f.id }, f.emoji + ' ' + f.name); })
              )
            )
          ),
          h('div', { className: 'text-[11px] font-mono text-slate-700 mb-2' },
            fA.name + ' — ' + fA.serving + '   vs   ' + fB.name + ' — ' + fB.serving
          ),
          h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
            'aria-label': 'Side-by-side comparison of ' + fA.name + ' and ' + fB.name + ' across energy, carbs, protein, fat, and fiber.' },
            ROWS.map(function(r, i) {
              var yMid = pad.t + i * (barH + 6) + barH / 2;
              var aVal = fA[r.key] || 0, bVal = fB[r.key] || 0;
              var maxV = maxes[r.key];
              var barRange = (W - pad.l - pad.r) / 2 - 6;
              var aW = (aVal / maxV) * barRange;
              var bW = (bVal / maxV) * barRange;
              var midX = (W) / 2;
              return h('g', { key: r.key },
                h('text', { x: midX, y: yMid + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#334155' }, r.label),
                // Food A bar (left, growing toward left)
                h('rect', { x: midX - 36 - aW, y: yMid - barH / 2 + 4, width: Math.max(2, aW), height: barH - 8, fill: '#0d9488', rx: 3 }),
                h('text', { x: midX - 38 - aW - 4, y: yMid + 4, textAnchor: 'end', fontSize: 11, fill: '#0d9488', fontWeight: 700, fontFamily: 'monospace' }, aVal + r.unit),
                // Food B bar (right, growing toward right)
                h('rect', { x: midX + 36, y: yMid - barH / 2 + 4, width: Math.max(2, bW), height: barH - 8, fill: '#9f1239', rx: 3 }),
                h('text', { x: midX + 38 + bW + 4, y: yMid + 4, fontSize: 11, fill: '#9f1239', fontWeight: 700, fontFamily: 'monospace' }, bVal + r.unit)
              );
            })
          ),
          h('div', { className: 'mt-3 text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3' },
            h('strong', { className: 'text-slate-800' }, 'Reading the chart: '),
            'Each row shows one nutrient. Longer bar = more of that nutrient per typical serving. Two foods can both be excellent for different reasons — there are no winners or losers here, just different physiological roles.'
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 1: MACRONUTRIENT LAB
      // ─────────────────────────────────────────────────────
      // Click-to-add plate composer. PHYSIOLOGY-FIRST framing: feedback always
      // describes what the body USES the food for, never whether the meal is
      // "enough" or "too much." Calorie totals are shown as informational
      // context (not a goal), per the design constraint to avoid calorie-
      // counting fixation in adolescents.
      function MacronutrientLab() {
        var plate_state = useState(d.ml_plate || []);
        var plate = plate_state[0], setPlate = plate_state[1];
        var category_state = useState('all');
        var category = category_state[0], setCategory = category_state[1];

        useEffect(function() { upd('ml_plate', plate); }, [plate]);

        function addFood(id) {
          var next = plate.concat([id]);
          setPlate(next);
          announce('Added ' + FOOD_BY_ID[id].name + ' to your plate. Plate now has ' + next.length + ' items.');
        }
        function removeAt(idx) {
          var next = plate.slice(0, idx).concat(plate.slice(idx + 1));
          setPlate(next);
          announce('Removed item from plate. Plate now has ' + next.length + ' items.');
        }
        function clearPlate() {
          setPlate([]);
          announce('Plate cleared.');
        }

        // Totals
        var totals = plate.reduce(function(acc, id) {
          var f = FOOD_BY_ID[id];
          if (!f) return acc;
          acc.kcal += f.kcal; acc.c += f.c; acc.p += f.p; acc.f += f.f; acc.fib += f.fib;
          return acc;
        }, { kcal: 0, c: 0, p: 0, f: 0, fib: 0 });

        // Tag rollup → physiology benefits. Each benefit is a factual
        // physiological description — never a value judgment about the meal.
        var tagSet = {};
        plate.forEach(function(id) {
          var f = FOOD_BY_ID[id];
          if (!f) return;
          (f.tags || []).forEach(function(t) { tagSet[t] = (tagSet[t] || 0) + 1; });
        });
        var benefits = [];
        if (totals.p >= 15) benefits.push({ icon: '💪', text: 'Includes protein — your body uses these amino acids to build muscle, make enzymes, and repair tissue.' });
        if (tagSet.omega3) benefits.push({ icon: '🐟', text: 'Includes omega-3s (EPA/DHA) — Harvard research links these to brain health and lower inflammation. AHA recommends 2 fatty-fish meals per week.' });
        if (tagSet.iron) benefits.push({ icon: '🩸', text: 'Includes iron — supports hemoglobin (oxygen transport in blood) and steady energy. Especially important for menstruating teens.' });
        if (tagSet.vitC) benefits.push({ icon: '🍊', text: 'Includes vitamin C — supports immune function, builds collagen, and helps your body absorb iron from plant foods.' });
        if (tagSet.calcium) benefits.push({ icon: '🦴', text: 'Includes calcium — supports bones, muscle contraction, and nerve signaling. Adolescent years are peak bone-building years.' });
        if (tagSet.vitD) benefits.push({ icon: '☀️', text: 'Includes vitamin D — supports calcium absorption, bones, and immune function. Especially valuable in Maine winters.' });
        if (tagSet.folate) benefits.push({ icon: '🧬', text: 'Includes folate (B9) — supports DNA synthesis and red blood cell formation.' });
        if (tagSet.b12) benefits.push({ icon: '🧠', text: 'Includes B12 — supports nerve function and red blood cells. B12 only comes from animal foods (or fortified products) — vegans need a supplement.' });
        if (tagSet.potassium) benefits.push({ icon: '❤️', text: 'Includes potassium — supports heart rhythm, muscle contraction, and healthy blood pressure.' });
        if (tagSet.magnesium) benefits.push({ icon: '🌿', text: 'Includes magnesium — most US adults under-consume; supports muscle / nerve function and energy production.' });
        if (totals.fib >= 7) benefits.push({ icon: '🌾', text: 'Includes plenty of fiber — feeds gut bacteria, slows blood-sugar spikes, supports steady energy.' });
        if (tagSet.choline) benefits.push({ icon: '🥚', text: 'Includes choline — many Americans under-consume; supports brain development and liver function.' });

        // Category filter for food picker
        var categories = [
          { id: 'all',       label: 'All foods', emoji: '🍽️' },
          { id: 'fruit',     label: 'Fruit',     emoji: '🍎' },
          { id: 'vegetable', label: 'Vegetables', emoji: '🥦' },
          { id: 'protein',   label: 'Protein',   emoji: '🍗' },
          { id: 'legume',    label: 'Legumes',   emoji: '🫘' },
          { id: 'grain',     label: 'Grains',    emoji: '🌾' },
          { id: 'fat',       label: 'Nuts/Fats', emoji: '🥜' }
        ];
        var visibleFoods = category === 'all' ? FOODS : FOODS.filter(function(f) { return f.cat === category; });

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🍽️', title: 'Macronutrient Lab' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-emerald-900 mb-2' }, 'Build a plate. See what your body uses it for.'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'Click any food below to add it to your plate. Watch the macronutrient totals update from real USDA values. The benefit readout shows which body systems your meal supports — muscle, brain, blood, bones, gut. There is no calorie target. There is no "right" plate. Different bodies need different things, and your needs change throughout the day.')
            ),
            // Category filter
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Filter by category'),
              h('div', { 'role': 'radiogroup', 'aria-label': 'Food category', className: 'flex flex-wrap gap-2' },
                categories.map(function(cc) {
                  var sel = (category === cc.id);
                  return h('button', {
                    key: cc.id,
                    onClick: function() { setCategory(cc.id); announce('Showing ' + cc.label); },
                    role: 'radio',
                    'aria-checked': sel ? 'true' : 'false',
                    className: 'px-3 py-2 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                      (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500')
                  }, h('span', { className: 'mr-1', 'aria-hidden': true }, cc.emoji), cc.label);
                })
              )
            ),
            // Food picker grid
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Tap a food to add it to your plate'),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2' },
                visibleFoods.map(function(f) {
                  return h('button', {
                    key: f.id,
                    onClick: function() { addFood(f.id); },
                    'aria-label': 'Add ' + f.name + ' to plate. Per ' + f.serving + ': ' + f.kcal + ' kilocalories, ' + f.c + ' carbs, ' + f.p + ' protein, ' + f.f + ' fat, ' + f.fib + ' fiber.',
                    className: 'p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition focus:outline-none focus:ring-2 ring-emerald-500/40 nutritionlab-card-lift text-left'
                  },
                    h('div', { className: 'text-3xl mb-1', 'aria-hidden': true }, f.emoji),
                    h('div', { className: 'text-sm font-bold text-slate-800' }, f.name),
                    h('div', { className: 'text-[10px] text-slate-700 mt-0.5' }, f.serving),
                    h('div', { className: 'text-[10px] font-mono text-slate-700 mt-1' },
                      'C ' + f.c + 'g · P ' + f.p + 'g · F ' + f.f + 'g')
                  );
                })
              )
            ),
            // My plate panel
            h('div', { className: 'bg-white rounded-2xl shadow border-2 border-emerald-400 p-5' },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('h2', { className: 'text-base font-black text-slate-800' },
                  '🍽️ Your Plate · ' + plate.length + ' item' + (plate.length === 1 ? '' : 's')),
                plate.length > 0 && h('button', {
                  onClick: clearPlate,
                  className: 'px-3 py-1 rounded bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 transition focus:outline-none focus:ring-2 ring-slate-400'
                }, 'Clear plate')
              ),
              plate.length === 0
                ? h('p', { className: 'text-sm text-slate-700 italic' }, 'Your plate is empty. Add foods above to begin.')
                : h('div', { className: 'space-y-2' },
                    plate.map(function(id, idx) {
                      var f = FOOD_BY_ID[id];
                      return h('div', { key: idx, className: 'flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200' },
                        h('span', { className: 'text-2xl', 'aria-hidden': true }, f.emoji),
                        h('div', { className: 'flex-1' },
                          h('div', { className: 'text-sm font-bold text-slate-800' }, f.name),
                          h('div', { className: 'text-[11px] font-mono text-slate-700' },
                            'C ' + f.c + 'g · P ' + f.p + 'g · F ' + f.f + 'g · fib ' + f.fib + 'g · ' + f.kcal + ' kcal')
                        ),
                        h('button', {
                          onClick: function() { removeAt(idx); },
                          'aria-label': 'Remove ' + f.name,
                          className: 'px-2 py-1 rounded text-xs font-bold bg-rose-100 text-rose-900 hover:bg-rose-200 transition focus:outline-none focus:ring-2 ring-rose-400'
                        }, '✕ Remove')
                      );
                    })
                  )
            ),
            // Totals
            h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3' },
              h(StatCard, { label: 'Carbs',   value: totals.c.toFixed(0)   + 'g', color: 'text-amber-700' }),
              h(StatCard, { label: 'Protein', value: totals.p.toFixed(0)   + 'g', color: 'text-rose-700' }),
              h(StatCard, { label: 'Fat',     value: totals.f.toFixed(0)   + 'g', color: 'text-yellow-700' }),
              h(StatCard, { label: 'Fiber',   value: totals.fib.toFixed(0) + 'g', color: 'text-emerald-700' }),
              h(StatCard, { label: 'Energy',  value: totals.kcal.toFixed(0), unit: 'kcal (informational)', color: 'text-slate-700' })
            ),
            // Visual: macro donut showing carbs/protein/fat split by energy
            h(MacroDonut, { c: totals.c, p: totals.p, f: totals.f }),
            // Visual: daily-intake reference bars (informational only)
            plate.length > 0 && h(DailyIntakeBars, { totals: totals }),
            // Interactive: side-by-side food comparison
            h(FoodComparePanel),
            // Physiology benefit readout
            plate.length > 0 && h('div', {
              'aria-live': 'polite',
              className: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl p-5'
            },
              h('h2', { className: 'text-base font-black text-emerald-900 mb-3' }, 'What your body uses this meal for'),
              benefits.length === 0
                ? h('p', { className: 'text-sm text-slate-800 italic' }, 'Add a few more items to see what nutrients this meal contributes.')
                : h('ul', { className: 'space-y-2' },
                    benefits.map(function(b, i) {
                      return h('li', { key: i, className: 'flex items-start gap-3 p-2 bg-white rounded-lg border border-emerald-200' },
                        h('span', { className: 'text-2xl flex-shrink-0', 'aria-hidden': true }, b.icon),
                        h('span', { className: 'text-sm text-slate-800 leading-relaxed' }, b.text)
                      );
                    })
                  )
            ),
            h(TeacherNotes, {
              standards: ['HS-LS1-7 (Energy in life processes)', 'HS-LS1-3 (Homeostasis)', 'CTE Family & Consumer Sciences', 'USDA MyPlate'],
              questions: [
                'Pick three foods from the list. For each, what is the dominant macronutrient and what does your body do with it?',
                'Why does the lab show "energy in kcal" as informational rather than as a goal? What problems can arise when adolescents fixate on calorie numbers?',
                'A student is vegan. Which two nutrients in this lab require the most planning for them, and what foods can supply them?'
              ],
              misconceptions: [
                '"Carbs are bad" — carbohydrates are your brain\'s preferred fuel. Whole-grain and fruit carbs come bundled with fiber, vitamins, and minerals.',
                '"Fat makes you fat" — dietary fat is essential for cell membranes, hormone production, and absorbing fat-soluble vitamins (A, D, E, K). Type and total intake matter, not "fat = bad."',
                '"Protein shakes are necessary for teens to build muscle" — most adolescents easily meet their protein needs from food. Real food is cheaper and brings other nutrients with it.'
              ],
              extension: 'Use a food-tracking app or USDA FoodData Central (fdc.nal.usda.gov) to log YESTERDAY\'S meals. Compare the macronutrient totals to today\'s lab. Note: this is for SCIENCE LITERACY — recognizing what your body got — not for restriction or judgment.',
              sources: 'Nutrient values from USDA FoodData Central (fdc.nal.usda.gov). Physiology framing from NIH ODS Fact Sheets, Harvard T.H. Chan School of Public Health, and AAP guidance.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 2: MICRONUTRIENT ATLAS
      // ─────────────────────────────────────────────────────
      // Tab strip across categories. Click any nutrient card to expand its
      // detail block. All entries cite NIH ODS Fact Sheets directly. Maine-
      // specific notes flagged inline (vitamin D, omega-3, iron in teens).
      function MicronutrientAtlas() {
        var tab_state = useState(d.ma_tab || 'vitamins');
        var tab = tab_state[0], setTab = tab_state[1];
        var picked_state = useState(null);
        var picked = picked_state[0], setPicked = picked_state[1];

        useEffect(function() { upd('ma_tab', tab); }, [tab]);
        useEffect(function() { setPicked(null); }, [tab]);

        var tabs = [
          { id: 'vitamins', label: 'Vitamins (13)', data: VITAMINS },
          { id: 'minerals', label: 'Minerals (15)', data: MINERALS },
          { id: 'efas',     label: 'Essential Fatty Acids', data: EFAS }
        ];
        var current = tabs.filter(function(t) { return t.id === tab; })[0] || tabs[0];

        function detailPanel(item) {
          if (!item) return null;
          return h('div', {
            className: 'bg-white rounded-2xl shadow border-2 border-emerald-400 p-5 space-y-3',
            'aria-live': 'polite'
          },
            h('div', { className: 'flex items-start gap-3 pb-2 border-b border-slate-200' },
              h('span', { className: 'text-4xl' }, item.emoji),
              h('div', null,
                h('h3', { className: 'text-2xl font-black text-slate-800' }, item.name),
                item.soluble && h('div', { className: 'text-xs text-slate-700' }, item.soluble === 'fat' ? '🥑 Fat-soluble — stored in body fat' : '💧 Water-soluble — excess excreted in urine'),
                item.kind && h('div', { className: 'text-xs text-slate-700' }, item.kind === 'macro' ? '🪨 Macromineral — needed in larger amounts' : '🔬 Trace mineral — needed in tiny amounts')
              )
            ),
            h('div', { className: 'p-3 bg-emerald-50 rounded-lg border border-emerald-200' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1' }, 'What it does'),
              h('div', { className: 'text-sm text-slate-800' }, item.function)
            ),
            h('div', { className: 'p-3 bg-amber-50 rounded-lg border border-amber-200' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, 'Where to find it'),
              h('div', { className: 'text-sm text-slate-800' }, item.sources)
            ),
            h('div', { className: 'p-3 bg-rose-50 rounded-lg border border-rose-200' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-900 mb-1' }, 'When you don\'t get enough'),
              h('div', { className: 'text-sm text-slate-800' }, item.deficiency)
            ),
            h('div', { className: 'p-3 bg-blue-50 rounded-lg border border-blue-200' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, 'Recommended intake'),
              h('div', { className: 'text-sm font-mono text-slate-800' }, item.rda)
            ),
            h('div', { className: 'text-[11px] text-slate-700 italic font-mono' },
              'Source: ' + item.cite)
          );
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🌈', title: 'Micronutrient Atlas' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-emerald-900 mb-2' }, '13 vitamins, 15 minerals, and the essential fatty acids'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'These are the nutrients your body needs in small amounts but cannot make on its own. Click any card to see what it does, where to find it, and what happens when you don\'t get enough. Sources cited inline from NIH Office of Dietary Supplements.')
            ),
            // Tab strip
            h('div', { 'role': 'tablist', 'aria-label': 'Nutrient categories', className: 'flex flex-wrap gap-2' },
              tabs.map(function(t) {
                var sel = (tab === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setTab(t.id); announce(t.label + ' selected'); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500')
                }, t.label);
              })
            ),
            // Card grid
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3' },
              current.data.map(function(item) {
                var sel = picked && picked.id === item.id;
                return h('button', {
                  key: item.id,
                  onClick: function() { setPicked(sel ? null : item); announce(sel ? 'Closed ' + item.name : 'Showing details for ' + item.name); },
                  'aria-pressed': sel ? 'true' : 'false',
                  'aria-label': item.name + (sel ? ' (selected)' : '') + ' — click to see function, sources, and deficiency info',
                  className: 'p-3 rounded-xl border-2 text-left transition focus:outline-none focus:ring-2 ring-emerald-500/40 nutritionlab-card-lift ' +
                    (sel ? 'bg-emerald-100 border-emerald-600 shadow-lg' : 'bg-white border-slate-300 hover:border-emerald-500')
                },
                  h('div', { className: 'text-3xl mb-1', 'aria-hidden': true }, item.emoji),
                  h('div', { className: 'text-sm font-bold text-slate-800' }, item.name),
                  h('div', { className: 'text-[10px] text-slate-700 mt-1 line-clamp-2' },
                    item.function.length > 70 ? item.function.substring(0, 67) + '…' : item.function)
                );
              })
            ),
            // Detail panel
            picked && detailPanel(picked),
            // No selection prompt
            !picked && h('div', { className: 'bg-slate-100 rounded-2xl border border-slate-300 p-5 text-center' },
              h('div', { className: 'text-3xl mb-2', 'aria-hidden': true }, '👆'),
              h('p', { className: 'text-sm text-slate-700' },
                'Click any nutrient above to see its function, food sources, and what happens when you don\'t get enough.')
            ),
            h(TeacherNotes, {
              standards: ['HS-LS1-3 (Homeostasis)', 'HS-LS1-7 (Cellular processes)', 'CTE Family & Consumer Sciences', 'USDA Dietary Guidelines'],
              questions: [
                'Why does Maine\'s latitude (~45°N) make vitamin D deficiency common in winter even for people who eat well?',
                'Iron is one of the few nutrients where DAILY needs differ between teen boys and teen girls. Why?',
                'B12 only comes from animal foods (or fortified products). What are the implications for someone choosing a vegan diet?',
                'Most Americans get TOO MUCH sodium and TOO LITTLE potassium. What does that imbalance do to blood pressure regulation, and which foods would shift the ratio?'
              ],
              misconceptions: [
                '"If a little is good, more is better" — fat-soluble vitamins (A, D, E, K) are stored in your body and CAN reach toxic levels from megadosing. Water-soluble vitamins are mostly excreted, but B6 megadoses cause nerve damage. Don\'t out-supplement food.',
                '"Multivitamins replace eating well" — research shows multivitamins do not lower disease risk in well-fed populations. Whole foods bring fiber, phytochemicals, and unmeasured cofactors that pills don\'t.',
                '"Salt is poison / never eat salt" — sodium is essential. The issue is that most processed foods are sodium-loaded, so the AVERAGE intake is too high. Cooking from whole foods naturally lowers sodium without going to zero.'
              ],
              extension: 'Pick one nutrient from this atlas that you suspect you might be low on (be honest with yourself — fatigue, frequent colds, etc. — but don\'t self-diagnose). Look it up on the NIH Office of Dietary Supplements (ods.od.nih.gov) Fact Sheet. Find the section "Am I getting enough?" and read it. Note: if anything genuinely concerns you, talk to your doctor — never pursue a supplement based on a self-suspected deficiency.',
              sources: 'Function, sources, deficiency, and intake values from NIH Office of Dietary Supplements (ods.od.nih.gov) Fact Sheets. Maine-specific notes from clinical literature on northern-latitude vitamin D status. AAP guidance on iron and adolescent fatigue.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 3: FOOD LABEL READER
      // ─────────────────────────────────────────────────────
      // Four progressive Nutrition Facts panels rendered in FDA-spec layout.
      // Each label has 3-4 decode questions covering: serving-size deception
      // (the most common manufacturer trick), % Daily Value interpretation,
      // added vs total sugars (post-2016 FDA distinction), sodium load. Per-
      // answer feedback cites the relevant FDA label rule.
      var LABELS = [
        {
          id: 'granola',
          name: 'Granola Bar',
          difficulty: 'Beginner',
          context: 'A single-serving granola bar — the simplest case. Read the label and answer.',
          servings: 1,
          servingSize: '1 bar (24 g)',
          calories: 90,
          rows: [
            { label: 'Total Fat',      val: '2 g',  dv: '3%',  bold: true },
            { label: 'Saturated Fat',  val: '1 g',  dv: '5%',  indent: true },
            { label: 'Trans Fat',      val: '0 g',           indent: true },
            { label: 'Cholesterol',    val: '0 mg', dv: '0%', bold: true },
            { label: 'Sodium',         val: '70 mg', dv: '3%', bold: true },
            { label: 'Total Carbs',    val: '18 g', dv: '7%', bold: true },
            { label: 'Dietary Fiber',  val: '1 g',  dv: '4%', indent: true },
            { label: 'Total Sugars',   val: '7 g',           indent: true },
            { label: 'Includes 6 g Added Sugars', val: '',  dv: '12%', indent: true, indentMore: true },
            { label: 'Protein',        val: '1 g',           bold: true }
          ],
          micros: [
            { label: 'Vitamin D', val: '0 mcg', dv: '0%' },
            { label: 'Calcium',   val: '6 mg',  dv: '0%' },
            { label: 'Iron',      val: '0.7 mg', dv: '4%' },
            { label: 'Potassium', val: '50 mg', dv: '1%' }
          ],
          questions: [
            {
              q: 'How many calories does ONE bar contain?',
              choices: ['90 calories', '180 calories', '24 calories', '70 calories'],
              answer: 0,
              explain: 'The Calories line shows 90 per serving, and the label says servings per container = 1. So one bar = 90 cal.'
            },
            {
              q: 'The bar lists 7 g total sugars. How much of that is ADDED sugar?',
              choices: ['1 g', '6 g (almost all)', '0 g', '7 g'],
              answer: 1,
              explain: 'Since the FDA 2016 label update, "Includes Xg Added Sugars" is broken out below total sugars. Here, 6 g of the 7 g is added — only 1 g is naturally occurring (probably from raisins or oats).'
            },
            {
              q: 'The label shows 12% Daily Value for added sugars. What does that mean?',
              choices: [
                'Eating 12 bars hits your daily limit',
                'Roughly an eighth of your day\'s "added sugar budget" is in this one bar',
                'The bar contains 12 g of sugar',
                '12% of the bar is sugar by weight'
              ],
              answer: 1,
              explain: '%DV measures how much one serving contributes toward a daily target. AHA recommends limiting added sugars to <50 g/day for adults; 12% × 50 g = 6 g, which matches. Just over 8 bars hits the daily limit.'
            }
          ]
        },
        {
          id: 'chips',
          name: 'Potato Chips (small bag)',
          difficulty: 'Common deception',
          context: 'A standard "small" bag of chips at a gas station. Read carefully — most people eat the whole bag in one sitting.',
          servings: 2,
          servingSize: 'About 28 chips (28 g)',
          calories: 150,
          rows: [
            { label: 'Total Fat',      val: '10 g',  dv: '13%', bold: true },
            { label: 'Saturated Fat',  val: '1.5 g', dv: '8%',  indent: true },
            { label: 'Trans Fat',      val: '0 g',            indent: true },
            { label: 'Cholesterol',    val: '0 mg',  dv: '0%',  bold: true },
            { label: 'Sodium',         val: '170 mg', dv: '7%', bold: true },
            { label: 'Total Carbs',    val: '15 g',  dv: '5%',  bold: true },
            { label: 'Dietary Fiber',  val: '1 g',   dv: '4%',  indent: true },
            { label: 'Total Sugars',   val: '0 g',            indent: true },
            { label: 'Includes 0 g Added Sugars', val: '', dv: '0%', indent: true, indentMore: true },
            { label: 'Protein',        val: '2 g',           bold: true }
          ],
          micros: [
            { label: 'Vitamin D', val: '0 mcg', dv: '0%' },
            { label: 'Calcium',   val: '0 mg',  dv: '0%' },
            { label: 'Iron',      val: '0.4 mg', dv: '2%' },
            { label: 'Potassium', val: '350 mg', dv: '7%' }
          ],
          questions: [
            {
              q: 'If you eat the WHOLE BAG (which most people do), how many calories?',
              choices: ['150', '300', '75', '450'],
              answer: 1,
              explain: 'Servings per container says 2. So whole bag = 2 × 150 = 300 calories. The 150 advertised on the front is HALF the bag.'
            },
            {
              q: 'What is your real sodium intake from the whole bag?',
              choices: ['170 mg (7% DV)', '85 mg (3% DV)', '340 mg (15% DV)', '500 mg (22% DV)'],
              answer: 2,
              explain: '170 mg per serving × 2 servings = 340 mg. That\'s about 15% of the FDA 2300 mg/day cap. Eating two bags hits a third of your day\'s sodium ceiling.'
            },
            {
              q: 'What is the manufacturer trick at work here?',
              choices: [
                'They lied about calories',
                'They split a single-portion bag into 2 "servings" so calories and sodium look smaller per serving',
                'The bag really is meant to be split between 2 people',
                'The label was misprinted'
              ],
              answer: 1,
              explain: 'The "serving size" on packaged food is set by the FDA, but manufacturers can choose how many "servings" their package contains. Splitting a single-portion bag into 2 makes per-serving numbers look smaller. The FDA tightened serving-size rules in 2016 to fix the worst cases, but small bags still slip through.'
            }
          ]
        },
        {
          id: 'frozen',
          name: 'Frozen "Family" Lasagna',
          difficulty: 'Multi-serving deception',
          context: 'A frozen meal in a tray that looks like 1-2 dinners. Label says "3 servings per container." Most people split the box for 1 or 2 people.',
          servings: 3,
          servingSize: '1 cup (213 g)',
          calories: 240,
          rows: [
            { label: 'Total Fat',      val: '11 g',  dv: '14%', bold: true },
            { label: 'Saturated Fat',  val: '4 g',   dv: '20%', indent: true },
            { label: 'Trans Fat',      val: '0 g',            indent: true },
            { label: 'Cholesterol',    val: '30 mg', dv: '10%', bold: true },
            { label: 'Sodium',         val: '720 mg', dv: '31%', bold: true },
            { label: 'Total Carbs',    val: '24 g',  dv: '9%',  bold: true },
            { label: 'Dietary Fiber',  val: '2 g',   dv: '7%',  indent: true },
            { label: 'Total Sugars',   val: '4 g',            indent: true },
            { label: 'Includes 0 g Added Sugars', val: '', dv: '0%', indent: true, indentMore: true },
            { label: 'Protein',        val: '12 g',           bold: true }
          ],
          micros: [
            { label: 'Vitamin D', val: '0 mcg', dv: '0%' },
            { label: 'Calcium',   val: '180 mg', dv: '15%' },
            { label: 'Iron',      val: '1.5 mg', dv: '8%' },
            { label: 'Potassium', val: '350 mg', dv: '7%' }
          ],
          questions: [
            {
              q: 'You eat HALF the box (a normal solo dinner). What\'s your real intake?',
              choices: [
                '240 cal, 720 mg sodium',
                '120 cal, 360 mg sodium',
                '360 cal, 1080 mg sodium',
                '720 cal, 2160 mg sodium'
              ],
              answer: 2,
              explain: 'Half the box = 1.5 servings. So 1.5 × 240 cal = 360 cal, 1.5 × 720 mg sodium = 1080 mg. That single dinner is nearly half a day\'s sodium limit.'
            },
            {
              q: '720 mg sodium per serving = 31% DV. What does that mean for someone who eats the whole box?',
              choices: [
                'They consume 31% of daily sodium',
                'They consume about 93% of daily sodium in one meal',
                'They consume more sodium than is healthy in a day',
                'Both 2 and 3 are correct'
              ],
              answer: 3,
              explain: '3 servings × 31% = 93% of daily sodium in one meal. The DV cap is 2300 mg, but the AHA recommends staying under 1500 mg for cardiovascular health. Frozen meals are sodium-dense by design — sodium preserves and flavors.'
            },
            {
              q: 'Why would the manufacturer label "3 servings" instead of 1 or 2?',
              choices: [
                'It\'s genuinely meant to feed 3 people',
                'Smaller per-serving numbers (calories, sodium, fat) on the front of pack make the food look healthier',
                'FDA requires that labeling',
                'Fewer servings would be more accurate but use more ink'
              ],
              answer: 1,
              explain: 'Front-of-pack marketing prominently displays "240 calories!" — much friendlier than "720 calories per box." Multi-serving labeling is not always wrong (some boxes really are 3-portion), but in cases like this it serves marketing more than realism.'
            }
          ]
        },
        {
          id: 'yogurt',
          name: 'Plain vs Vanilla Greek Yogurt',
          difficulty: 'Added vs Total Sugars',
          context: 'A "plain" Greek yogurt (left column below) compared to a "vanilla" flavored version of the same brand (right column). Find the difference.',
          servings: 1,
          servingSize: '1 container (170 g)',
          calories: 100,
          dual: true,
          dualOther: {
            calories: 150,
            rows: [
              { label: 'Total Fat',      val: '0 g',           bold: true },
              { label: 'Total Carbs',    val: '24 g', dv: '9%', bold: true },
              { label: 'Total Sugars',   val: '20 g',          indent: true },
              { label: 'Includes 14 g Added Sugars', val: '', dv: '28%', indent: true, indentMore: true },
              { label: 'Protein',        val: '12 g',          bold: true }
            ]
          },
          rows: [
            { label: 'Total Fat',      val: '0 g',           bold: true },
            { label: 'Total Carbs',    val: '8 g',  dv: '3%', bold: true },
            { label: 'Total Sugars',   val: '6 g',           indent: true },
            { label: 'Includes 0 g Added Sugars', val: '', dv: '0%', indent: true, indentMore: true },
            { label: 'Protein',        val: '17 g',          bold: true }
          ],
          micros: [
            { label: 'Calcium',   val: '180 mg', dv: '15%' },
            { label: 'Vitamin B12', val: '1.4 mcg', dv: '60%' }
          ],
          questions: [
            {
              q: 'The plain yogurt shows 6 g total sugars but 0 g added sugars. Where do those 6 g come from?',
              choices: [
                'A labeling error',
                'Lactose, the natural sugar in milk',
                'Hidden added sugar that the manufacturer didn\'t disclose',
                'Sugar substitutes'
              ],
              answer: 1,
              explain: 'Lactose is the naturally occurring sugar in milk. The FDA distinguishes "total sugars" (everything sweet, including lactose, fructose in fruit, etc.) from "added sugars" (sugar the manufacturer mixed in). Plain yogurt contains lactose; that 6 g is real sugar but it\'s naturally part of the food.'
            },
            {
              q: 'The vanilla version has 20 g total sugars and 14 g added sugars. How much added sugar are you eating in vanilla vs plain?',
              choices: [
                'Same — sugar is sugar',
                '14 g more in vanilla — about 3.5 teaspoons of added sugar',
                '8 g more in vanilla',
                'Less in vanilla because it tastes sweeter'
              ],
              answer: 1,
              explain: 'Vanilla = 14 g added; plain = 0 g added. Difference = 14 g, about 3.5 teaspoons. That\'s 28% of your daily added-sugar limit, in a single small yogurt cup.'
            },
            {
              q: 'Why would a manufacturer add 14 g of sugar to yogurt that already has natural lactose?',
              choices: [
                'Lactose tastes bitter',
                'Plain yogurt is genuinely tart, and added sugar makes flavored versions appeal to more shoppers',
                'It\'s required for food safety',
                'Sugar makes yogurt last longer'
              ],
              answer: 1,
              explain: 'Plain Greek yogurt is genuinely tart — lactose is much less sweet than sucrose. Added sugars (cane sugar, honey, fruit-juice concentrate) make flavored yogurt taste like dessert. You can sweeten plain yogurt at home with fruit and get better control of how much sugar ends up in your bowl.'
            }
          ]
        }
      ];

      function NutritionFactsPanel(props) {
        // FDA-spec-style Nutrition Facts panel — high-contrast monochrome
        // for legibility, mirrors the layout the FDA mandates on packaged food.
        var lab = props.label;
        var rows = props.rows || lab.rows;
        return h('div', {
          className: 'bg-white border-4 border-black rounded-md p-3 max-w-sm font-mono',
          role: 'img',
          'aria-label': 'Nutrition Facts panel for ' + lab.name + (props.suffix ? ' (' + props.suffix + ')' : '')
        },
          h('div', { className: 'text-3xl font-black text-black border-b-8 border-black pb-1 mb-1' }, 'Nutrition Facts'),
          h('div', { className: 'text-xs text-black' }, lab.servings + ' serving' + (lab.servings === 1 ? '' : 's') + ' per container'),
          h('div', { className: 'flex justify-between text-sm font-bold text-black border-b-4 border-black pb-1 mb-1' },
            h('span', null, 'Serving size'),
            h('span', null, lab.servingSize)
          ),
          h('div', { className: 'flex justify-between items-end mb-1' },
            h('div', null,
              h('div', { className: 'text-[10px] font-bold text-black' }, 'Amount per serving'),
              h('div', { className: 'text-2xl font-black text-black' }, 'Calories')
            ),
            h('div', { className: 'text-3xl font-black text-black' }, props.calories || lab.calories)
          ),
          h('div', { className: 'border-t-4 border-black pt-1 text-right text-[10px] font-bold text-black' }, '% Daily Value*'),
          h('div', null,
            rows.map(function(r, i) {
              var pad = r.indentMore ? 'pl-8' : r.indent ? 'pl-4' : '';
              return h('div', {
                key: i,
                className: 'flex justify-between text-xs border-b border-black ' + pad + (r.bold ? ' font-bold' : '')
              },
                h('span', { className: 'text-black' }, r.label + (r.val ? ' ' + r.val : '')),
                h('span', { className: 'text-black font-bold' }, r.dv || '')
              );
            })
          ),
          h('div', { className: 'border-t-4 border-black mt-1 pt-1' },
            (lab.micros || []).map(function(m, i) {
              return h('div', { key: i, className: 'flex justify-between text-xs text-black' },
                h('span', null, m.label + ' ' + m.val),
                h('span', { className: 'font-bold' }, m.dv || '')
              );
            })
          ),
          h('div', { className: 'mt-2 text-[9px] leading-tight text-black' },
            '* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.')
        );
      }

      function FoodLabelReader() {
        var labelIdx_state = useState(d.lr_idx != null ? d.lr_idx : 0);
        var labelIdx = labelIdx_state[0], setLabelIdx = labelIdx_state[1];
        var answers_state = useState({});
        var answers = answers_state[0], setAnswers = answers_state[1];

        useEffect(function() { upd('lr_idx', labelIdx); }, [labelIdx]);

        var lab = LABELS[labelIdx];

        function answer(qi, ci) {
          var key = labelIdx + '_' + qi;
          var next = Object.assign({}, answers);
          next[key] = ci;
          setAnswers(next);
          var correct = lab.questions[qi].answer === ci;
          announce(correct ? 'Correct' : 'Not quite — see explanation');
        }

        var allAnswered = lab.questions.every(function(q, qi) {
          var key = labelIdx + '_' + qi;
          return answers[key] != null && answers[key] === q.answer;
        });

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🏷️', title: 'Food Label Reader' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-cyan-50 border-2 border-cyan-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-cyan-900 mb-2' }, 'Read a Nutrition Facts panel like a registered dietitian'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'The Nutrition Facts panel is required by the FDA on every packaged food. It tells the truth — but the manufacturer chooses how to slice that truth. Common tricks: dividing one bag into "2 servings" so per-serving numbers look smaller, putting "0 g trans fat" on something that\'s 49% saturated fat, calling something "fat-free" while it\'s loaded with added sugar. Once you can read these labels, you can\'t un-read them.')
            ),
            // Challenge selector
            h('div', { className: 'flex flex-wrap gap-2' },
              LABELS.map(function(L, i) {
                var sel = (labelIdx === i);
                return h('button', {
                  key: L.id,
                  onClick: function() { setLabelIdx(i); announce('Loaded ' + L.name); },
                  'aria-pressed': sel ? 'true' : 'false',
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500')
                }, 'Challenge ' + (i + 1) + ' · ' + L.difficulty);
              })
            ),
            // Label + questions side by side on wide screens
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-5' },
              // LEFT: the label (or two labels if dual)
              h('div', { className: 'space-y-3' },
                h('div', null,
                  h('div', { className: 'inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-900 mb-2' }, lab.difficulty),
                  h('h2', { className: 'text-xl font-black text-slate-800' }, lab.name),
                  h('p', { className: 'text-sm text-slate-700 italic mt-1' }, lab.context)
                ),
                lab.dual
                  ? h('div', { className: 'space-y-3' },
                      h('div', null,
                        h('div', { className: 'text-xs font-bold uppercase text-slate-700 mb-1' }, 'Plain version'),
                        h(NutritionFactsPanel, { label: lab, rows: lab.rows, calories: lab.calories, suffix: 'plain' })
                      ),
                      h('div', null,
                        h('div', { className: 'text-xs font-bold uppercase text-slate-700 mb-1' }, 'Vanilla flavored version'),
                        h(NutritionFactsPanel, { label: lab, rows: lab.dualOther.rows, calories: lab.dualOther.calories, suffix: 'vanilla flavored' })
                      )
                    )
                  : h(NutritionFactsPanel, { label: lab })
              ),
              // RIGHT: questions
              h('div', { className: 'space-y-3' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700' }, 'Decode this label'),
                lab.questions.map(function(q, qi) {
                  var key = labelIdx + '_' + qi;
                  var picked = answers[key];
                  return h('div', { key: qi, className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
                    h('div', { className: 'text-sm font-bold text-slate-800 mb-2' }, (qi + 1) + '. ' + q.q),
                    h('div', { 'role': 'radiogroup', 'aria-label': q.q, className: 'space-y-2' },
                      q.choices.map(function(ch, ci) {
                        var sel = (picked === ci);
                        var revealCorrect = picked != null && q.answer === ci;
                        var revealWrong = picked === ci && picked !== q.answer;
                        var btnClass = 'w-full text-left p-2 rounded-lg border-2 text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ';
                        if (revealCorrect) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold';
                        else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                        else if (sel) btnClass += 'bg-emerald-50 border-emerald-300 text-emerald-900';
                        else btnClass += 'bg-white border-slate-300 hover:border-emerald-400 text-slate-800';
                        return h('button', {
                          key: ci,
                          onClick: function() { answer(qi, ci); },
                          role: 'radio',
                          'aria-checked': sel ? 'true' : 'false',
                          className: btnClass
                        }, ch);
                      })
                    ),
                    picked != null && h('div', { className: 'mt-2 p-2 rounded text-xs ' +
                      (q.answer === picked ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'),
                      'aria-live': 'polite'
                    },
                      h('span', { className: 'font-bold' }, q.answer === picked ? '✓ ' : '⚠ '),
                      q.explain
                    )
                  );
                }),
                allAnswered && h('div', { className: 'p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900' },
                  h('div', { className: 'font-black text-lg' }, '✓ Challenge complete'),
                  h('p', { className: 'text-sm' }, 'You decoded this label correctly. Move to the next challenge.')
                )
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Family & Consumer Sciences 4.1', 'FDA Nutrition Facts Label Final Rule (2016)', 'NGSS HS-LS1-7'],
              questions: [
                'The 2016 FDA label update added "Includes Xg Added Sugars" as a mandatory line. Why did the FDA think this distinction was worth requiring?',
                'A "100% natural" claim on a granola bar tells you what about the sugar content?',
                'Compare three brands of "fruit yogurt" at the grocery store. Find the one with the LEAST added sugar. What is the gap between the highest and lowest?'
              ],
              misconceptions: [
                '"Calorie content tells you if a food is healthy" — calorie density is one piece of context. A 100-cal apple and a 100-cal candy bar contain wildly different nutrients, fiber, and effects on blood sugar.',
                '"% Daily Value uses YOUR calorie needs" — % DV uses a 2000-cal/day reference. Your actual needs vary by age, sex, growth stage, and activity. % DV is a comparison tool, not a personal target.',
                '"Sugar is sugar" — the FDA distinguishes total vs added sugars because added sugars (sucrose, HFCS) come without the fiber, vitamins, and water that naturally-occurring sugars (in fruit, milk) come bundled with.'
              ],
              extension: 'Find one packaged food in your kitchen. Identify the serving size and servings per container. Calculate what you actually eat (typical portion) and convert the per-serving values to your real intake. Compare to what the front of the package advertises.',
              sources: 'FDA Nutrition Facts Label Final Rule (2016 update); FDA \"How to Understand and Use the Nutrition Facts Label\" (fda.gov); USDA Dietary Guidelines for Americans 2020-2025.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 4: ENERGY BALANCE & METABOLISM
      // ─────────────────────────────────────────────────────
      // Three tabs: ATP & Mitochondria, Three Energy Systems, Where Energy
      // Goes. CRITICAL: this is the module most at-risk for accidentally
      // promoting calorie-counting fixation. We frame BMR/TDEE as descriptive
      // physiology ("here\'s what your body is doing") not prescriptive
      // targets ("here\'s your daily budget"). Wide ranges noted for every
      // number; biological variation explicitly normalized.
      function EnergyMetabolismLab() {
        var tab_state = useState(d.em_tab || 'atp');
        var tab = tab_state[0], setTab = tab_state[1];
        useEffect(function() { upd('em_tab', tab); }, [tab]);

        var tabs = [
          { id: 'atp',          label: '1. ATP & Mitochondria' },
          { id: 'systems',      label: '2. Three Energy Systems' },
          { id: 'distribution', label: '3. Where Energy Goes' }
        ];

        // Resting energy distribution (approximate, healthy adult average)
        // Source: Brody, Nutritional Biochemistry (1999); Wang et al., 2010
        var ENERGY_DIST = [
          { organ: 'Liver',           pct: 21, color: 'bg-rose-500',    note: 'Constantly processing nutrients, detoxifying, making proteins.' },
          { organ: 'Skeletal muscle', pct: 22, color: 'bg-orange-500',  note: 'Even at rest, muscles maintain tone and run baseline metabolism.' },
          { organ: 'Brain',           pct: 20, color: 'bg-violet-500',  note: 'Neurons fire constantly. Brain uses ~20% of resting energy despite being ~2% of body weight.' },
          { organ: 'Heart',           pct: 9,  color: 'bg-red-600',     note: 'Beats ~100,000 times/day, never stops.' },
          { organ: 'Kidneys',         pct: 8,  color: 'bg-amber-500',   note: 'Filter your entire blood volume ~60 times/day.' },
          { organ: 'Other tissues',   pct: 20, color: 'bg-slate-500',   note: 'Skin, gut, immune cells, fat tissue, nervous system.' }
        ];

        var ACTIVITY_KCAL = [
          { activity: 'Sleep',         kcalPerMin: 1.0,  desc: 'Slightly below BMR. Brain and organs are still busy.' },
          { activity: 'Sit / read',    kcalPerMin: 1.2,  desc: 'BMR baseline plus a tiny bit for posture.' },
          { activity: 'Walk (3 mph)',  kcalPerMin: 4.0,  desc: 'Most accessible activity for nearly any body.' },
          { activity: 'Bike (light)',  kcalPerMin: 6.0,  desc: 'Joint-friendly, sustained exercise.' },
          { activity: 'Run (6 mph)',   kcalPerMin: 10,   desc: 'Aerobic system in full use; oxidative + glycolysis.' },
          { activity: 'Swim laps',     kcalPerMin: 9,    desc: 'Whole-body, low-impact, high-energy.' },
          { activity: 'Sprint (max)',  kcalPerMin: 20,   desc: 'Phosphocreatine + anaerobic glycolysis. Cannot sustain.' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '⚡', title: 'Energy & Metabolism' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-amber-900 mb-2' }, 'How your body actually makes and uses energy'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'This module covers the BIOLOGY of energy — molecules, cells, organ systems. Numbers like "BMR" and "kcal/min" are descriptive (this is what your body is doing), not prescriptive (this is your daily target). Different bodies need different amounts. Growth, illness, sleep quality, weather, and life stage all change the numbers. None of this is a goal to hit.')
            ),
            // Tab strip
            h('div', { 'role': 'tablist', 'aria-label': 'Energy metabolism sections', className: 'flex flex-wrap gap-2' },
              tabs.map(function(t) {
                var sel = (tab === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setTab(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-amber-600 text-white border-amber-700 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-amber-500')
                }, t.label);
              })
            ),
            tab === 'atp' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h2', { className: 'text-xl font-black text-slate-800 mb-3' }, 'ATP — your cellular energy currency'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  'Every cell in your body runs on a tiny molecule called ATP (adenosine triphosphate). When ATP gives up one phosphate group, it becomes ADP and releases energy your cells use to do work — contract muscles, fire neurons, build proteins, push molecules across membranes.'),
                // ATP cycle visualization
                h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-3' },
                  h('div', { className: 'flex items-center justify-around flex-wrap gap-3' },
                    h('div', { className: 'text-center' },
                      h('div', { className: 'text-5xl mb-1', 'aria-hidden': true }, '⚡'),
                      h('div', { className: 'font-mono font-bold text-slate-800' }, 'ATP'),
                      h('div', { className: 'text-[10px] text-slate-700' }, 'charged')
                    ),
                    h('div', { className: 'flex flex-col items-center' },
                      h('span', { className: 'text-2xl', 'aria-hidden': true }, '→'),
                      h('span', { className: 'text-[10px] text-slate-700 font-mono mt-1' }, 'releases energy')
                    ),
                    h('div', { className: 'text-center' },
                      h('div', { className: 'text-5xl mb-1', 'aria-hidden': true }, '🔋'),
                      h('div', { className: 'font-mono font-bold text-slate-800' }, 'ADP + Pi'),
                      h('div', { className: 'text-[10px] text-slate-700' }, 'discharged')
                    ),
                    h('div', { className: 'flex flex-col items-center' },
                      h('span', { className: 'text-2xl', 'aria-hidden': true }, '↩'),
                      h('span', { className: 'text-[10px] text-slate-700 font-mono mt-1' }, 'recharged in mitochondria')
                    )
                  )
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Your body holds only ~50 g of ATP at any moment, but recycles it constantly: each ATP molecule cycles ATP → ADP → ATP about 1,000+ times per day. Total ATP turnover roughly equals your body weight per day. The recycling happens in tiny organelles called mitochondria, which use oxygen and food (glucose, fatty acids) to charge ADP back into ATP.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-2' }, 'Mitochondria — the cellular powerhouses'),
                h('div', { className: 'space-y-3 text-sm text-slate-800' },
                  h('p', null, 'Mitochondria are tiny organelles inside almost every cell of your body. They take glucose (from carbs) or fatty acids (from fats), combine them with oxygen, and release CO₂ + water — capturing the energy in ATP along the way.'),
                  h('div', { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg font-mono text-xs' },
                    'Glucose + 6 O₂ → 6 CO₂ + 6 H₂O + ~30-32 ATP',
                    h('br'),
                    h('span', { className: 'text-slate-700' }, '(this is cellular respiration — the chemistry that powers you right now)')
                  ),
                  h('p', null,
                    'Cells with high energy demand have ',
                    h('strong', null, 'lots of mitochondria'),
                    ': heart muscle (~5,000 per cell), liver, brain. Endurance training increases mitochondrial density in your muscles — that\'s a big part of why trained athletes can sustain effort longer.')
                )
              )
            ),
            tab === 'systems' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h2', { className: 'text-xl font-black text-slate-800 mb-3' }, 'Three energy systems run side by side'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Your body has three different ways to make ATP. They\'re all running constantly, but the dominant system depends on how hard and how long you\'re working.')
              ),
              h('div', { className: 'space-y-3' },
                [
                  {
                    name: 'Phosphocreatine (PCr)',
                    duration: '0–10 seconds',
                    fuel: 'Stored creatine phosphate',
                    oxygen: 'No oxygen needed',
                    yield: 'Tiny — but instant',
                    example: 'A 100m sprint. Lifting a heavy single rep. Jumping for a rebound. Your muscles burn through PCr stores in 6–10 seconds.',
                    color: 'border-rose-400 bg-rose-50',
                    icon: '🚀'
                  },
                  {
                    name: 'Anaerobic glycolysis',
                    duration: '10 seconds – 2 minutes',
                    fuel: 'Glucose / glycogen, no oxygen',
                    oxygen: 'No oxygen needed',
                    yield: 'Fast but limited (~2 ATP per glucose)',
                    example: 'An 800m run. A 400m freestyle swim. The "burn" you feel after a hard set comes from this system — lactate accumulating.',
                    color: 'border-amber-400 bg-amber-50',
                    icon: '🔥'
                  },
                  {
                    name: 'Oxidative (aerobic)',
                    duration: '2 minutes onward',
                    fuel: 'Glucose AND fat, with oxygen',
                    oxygen: 'Requires oxygen',
                    yield: 'High (~30+ ATP per glucose; ~100+ per fatty acid)',
                    example: 'Walking, jogging, cycling, cleaning your room, sleeping, just sitting and reading this. Anything you can sustain for more than a couple minutes.',
                    color: 'border-emerald-400 bg-emerald-50',
                    icon: '🏃'
                  }
                ].map(function(sys, i) {
                  return h('div', { key: i, className: 'p-4 rounded-xl border-2 ' + sys.color },
                    h('div', { className: 'flex items-start gap-3' },
                      h('span', { className: 'text-3xl', 'aria-hidden': true }, sys.icon),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'font-black text-slate-800 mb-1' }, sys.name),
                        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs text-slate-800 mb-2' },
                          h('div', null, h('strong', null, 'Duration: '), sys.duration),
                          h('div', null, h('strong', null, 'Fuel: '), sys.fuel),
                          h('div', null, h('strong', null, 'Oxygen: '), sys.oxygen),
                          h('div', null, h('strong', null, 'ATP yield: '), sys.yield)
                        ),
                        h('div', { className: 'text-sm text-slate-800 italic' }, sys.example)
                      )
                    )
                  );
                })
              ),
              h('div', { className: 'p-3 bg-slate-100 rounded text-sm text-slate-800' },
                h('span', { className: 'font-bold' }, 'All three systems run all the time. '),
                'They overlap. A 1500m race shifts from PCr → anaerobic → aerobic across the four minutes. Endurance training boosts the oxidative system; sprint training boosts the anaerobic. Both adapt with practice.')
            ),
            tab === 'distribution' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h2', { className: 'text-xl font-black text-slate-800 mb-3' }, 'Where your energy actually goes'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  'Even when you\'re resting, your body uses energy. The minimum to keep your heart beating, brain firing, lungs breathing, kidneys filtering, and core temperature stable is called Basal Metabolic Rate (BMR). Most adolescents have a BMR somewhere between 1,200 and 1,800 kcal/day — the wide range is normal biological variation.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'Resting energy distribution by organ'),
                h('div', { className: 'space-y-2' },
                  ENERGY_DIST.map(function(d, i) {
                    return h('div', { key: i },
                      h('div', { className: 'flex items-center justify-between text-sm mb-1' },
                        h('span', { className: 'font-bold text-slate-800' }, d.organ),
                        h('span', { className: 'font-mono text-slate-700' }, d.pct + '%')
                      ),
                      h('div', { className: 'h-3 bg-slate-200 rounded-full overflow-hidden mb-1', 'aria-hidden': true },
                        h('div', { className: 'h-full ' + d.color + ' transition-all', style: { width: d.pct + '%' } })
                      ),
                      h('div', { className: 'text-xs text-slate-700' }, d.note)
                    );
                  })
                ),
                h('div', { className: 'mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-slate-800 italic' },
                  'These percentages describe a healthy adult at rest. Children and adolescents typically have a brain that uses an even larger share (up to 50% in young kids) because of growth and learning.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'Activity adds energy use on top of BMR'),
                h('p', { className: 'text-sm text-slate-800 mb-3' },
                  'These are descriptive averages — actual energy use varies with body size, fitness, and how hard you\'re going.'),
                h('div', { className: 'space-y-2' },
                  ACTIVITY_KCAL.map(function(a, i) {
                    var maxBar = 100;
                    var barW = clamp((a.kcalPerMin / 20) * maxBar, 5, maxBar);
                    return h('div', { key: i, className: 'p-2 bg-slate-50 rounded border border-slate-200' },
                      h('div', { className: 'flex items-center justify-between text-sm mb-1' },
                        h('span', { className: 'font-bold text-slate-800' }, a.activity),
                        h('span', { className: 'font-mono text-slate-700' }, '~' + a.kcalPerMin + ' kcal/min')
                      ),
                      h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
                        h('div', { className: 'h-full bg-emerald-500', style: { width: barW + '%' } })
                      ),
                      h('div', { className: 'text-xs text-slate-700 mt-1' }, a.desc)
                    );
                  })
                )
              ),
              h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4' },
                h('div', { className: 'flex items-start gap-3' },
                  h('span', { className: 'text-2xl', 'aria-hidden': true }, '💡'),
                  h('div', null,
                    h('div', { className: 'font-bold text-emerald-900 mb-1' }, 'Important framing'),
                    h('p', { className: 'text-sm text-slate-800' },
                      'Your body needs at least your BMR worth of energy to keep its essential systems working. Eating well below BMR for an extended time forces the body to slow metabolism, break down muscle, weaken immunity, and impair concentration. The goal isn\'t to "minimize calories" — it\'s to give your body what it needs to do its job. If anything in this module triggers worry about how much you\'re eating, please talk with a trusted adult, your doctor, or NEDA (1-800-931-2237).')
                  )
                )
              )
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS1-7 (Cellular respiration)', 'NGSS HS-LS1-3 (Homeostasis)', 'CTE Family & Consumer Sciences'],
              questions: [
                'Why do mitochondria-rich tissues (heart, liver, brain) use a disproportionate share of resting energy compared to their body-weight share?',
                'A sprinter and a marathon runner train very differently. Which energy systems is each one optimizing? What changes happen at the cellular level?',
                'BMR varies widely between bodies. Name 3 factors that legitimately change BMR (e.g., body mass, age, sex, illness, pregnancy, growth) and explain why they matter biologically.'
              ],
              misconceptions: [
                '"Faster metabolism is better" — metabolism is a biological process, not a virtue. Different bodies have different rates, all serving their owners. Trying to "boost" metabolism via supplements, restriction, or extreme exercise often backfires.',
                '"Calories in, calories out" — this is approximately true at the level of physics, but bodies are not bomb calorimeters. Hormones, sleep, stress, gut microbiome, and food type all influence what happens to the energy.',
                '"You should eat to your TDEE exactly" — TDEE estimates are population averages with wide error bars. Hunger, energy levels, and growth are better daily signals than a calculator.'
              ],
              extension: 'Track ONE day of activity (not food). Note how many minutes you spent walking, sitting, sleeping, and any structured exercise. Use the kcal/min table to estimate the activity portion of your day. Then notice: this is descriptive — what does it tell you about how your body partitioned its work today?',
              sources: 'ATP and mitochondria from Lehninger Principles of Biochemistry. Energy-system breakdown adapted from ACSM Guidelines for Exercise Testing. Resting energy distribution from Brody, Nutritional Biochemistry (1999) and Wang et al., American Journal of Clinical Nutrition (2010).'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 5: DIGESTION WALKTHROUGH
      // ─────────────────────────────────────────────────────
      // Five-stage tour from mouth to elimination. For each stage: organ
      // visual, mechanical action, chemical action (enzymes), per-macro fate
      // (carbs / protein / fat / fiber), key hormones, time spent. Designed
      // as a clickable horizontal tour with prev/next + jump-to-stage.
      var DIGESTION_STAGES = [
        {
          id: 'mouth',
          icon: '👄',
          name: 'Mouth',
          time: '~30 seconds (chewing)',
          pH: '6.5–7 (slightly acidic)',
          mechanical: 'Teeth break food into smaller pieces; tongue mixes it with saliva to form a moist bolus that can be swallowed.',
          chemical: 'Salivary amylase begins breaking down starches into shorter sugars. Lingual lipase makes a small start on fats.',
          macros: {
            carb: 'Salivary amylase begins breaking starch chains. Notice how a saltine cracker turns sweet if you hold it on your tongue — that\'s amylase at work.',
            protein: 'No protein digestion happens here.',
            fat: 'Minimal — lingual lipase contributes a tiny bit; most fat digestion waits for the small intestine.',
            fiber: 'Mechanically broken up by chewing but not digested.'
          },
          hormones: [
            { name: 'Ghrelin', role: 'The "hunger hormone." Levels typically peak BEFORE you eat (telling you to eat) and drop after.' }
          ],
          color: 'from-rose-400 to-pink-500'
        },
        {
          id: 'stomach',
          icon: '🫃',
          name: 'Stomach',
          time: '2–4 hours (varies by meal)',
          pH: '1.5–3 (very acidic)',
          mechanical: 'Strong muscular contractions churn food into a soupy mixture called chyme.',
          chemical: 'Hydrochloric acid (HCl) creates an acidic environment that activates pepsin, the enzyme that begins protein digestion. Intrinsic factor (made here) is required for B12 absorption later.',
          macros: {
            carb: 'Salivary amylase is inactivated by stomach acid. Carb digestion mostly pauses until the small intestine.',
            protein: 'Pepsin breaks down protein chains into shorter peptides. This is where serious protein digestion begins.',
            fat: 'Some emulsification from churning; chemical digestion waits for the small intestine.',
            fiber: 'Just sits in the chyme. Slows stomach emptying — which is part of why high-fiber meals keep you full longer.'
          },
          hormones: [
            { name: 'Gastrin', role: 'Triggers HCl release. Stomach distension and dietary protein both stimulate gastrin.' },
            { name: 'Ghrelin', role: 'Drops as food fills the stomach.' }
          ],
          color: 'from-amber-400 to-orange-500'
        },
        {
          id: 'smallIntestine',
          icon: '🌀',
          name: 'Small Intestine',
          time: '3–5 hours',
          pH: '6–7 (neutralized by pancreatic bicarbonate)',
          mechanical: 'Wave-like peristalsis moves food through 20+ feet of intestinal tube. Villi and microvilli give a surface area roughly the size of a tennis court for absorption.',
          chemical: 'Bile from the gallbladder emulsifies fats. Pancreatic enzymes (amylase, lipase, trypsin, chymotrypsin) finish digesting carbs, fats, and proteins. THIS IS WHERE MOST NUTRIENT ABSORPTION HAPPENS.',
          macros: {
            carb: 'Pancreatic amylase finishes the job. Sugars are absorbed across the intestinal wall and enter the bloodstream, raising blood glucose.',
            protein: 'Pancreatic proteases (trypsin, chymotrypsin) break peptides into individual amino acids, which are absorbed into the bloodstream.',
            fat: 'Bile (made by liver, stored in gallbladder) emulsifies fat into tiny droplets. Pancreatic lipase breaks them into fatty acids and monoglycerides. These are absorbed via the lymphatic system, then enter the bloodstream.',
            fiber: 'Still not digested. Continues to the large intestine.'
          },
          hormones: [
            { name: 'CCK (Cholecystokinin)', role: 'Triggers gallbladder to release bile and pancreas to release enzymes. Also signals fullness to the brain.' },
            { name: 'Secretin', role: 'Tells pancreas to release bicarbonate, neutralizing stomach acid as chyme arrives.' },
            { name: 'GLP-1', role: 'Stimulates insulin release from the pancreas, which helps cells absorb the glucose now arriving in blood.' },
            { name: 'Insulin', role: 'Released by pancreas in response to rising blood glucose. Tells cells to absorb glucose and tells liver to store excess as glycogen.' }
          ],
          color: 'from-emerald-500 to-teal-600'
        },
        {
          id: 'largeIntestine',
          icon: '🦠',
          name: 'Large Intestine (Colon)',
          time: '12–48 hours',
          pH: '5.5–7 (varies by section)',
          mechanical: 'Slower peristalsis. Water and electrolytes are reabsorbed, gradually solidifying waste.',
          chemical: 'Trillions of gut bacteria ferment fiber, producing short-chain fatty acids (especially butyrate) that nourish colon cells and influence inflammation systemically.',
          macros: {
            carb: 'Most carbs already absorbed. Indigestible carbs (fiber) reach gut bacteria here.',
            protein: 'Most protein already absorbed; small amounts continue fermentation.',
            fat: 'Most fat already absorbed.',
            fiber: 'THIS IS WHERE FIBER PAYS OFF. Gut bacteria ferment soluble fiber into short-chain fatty acids — fuel for colon cells, anti-inflammatory effects, blood sugar regulation. Insoluble fiber bulks up stool.'
          },
          hormones: [
            { name: 'PYY (Peptide YY)', role: 'Released by intestinal cells in response to food. Signals fullness to the brain — a key reason high-fiber, high-protein meals feel filling longer.' },
            { name: 'Leptin', role: 'Released by fat tissue (not gut), but interacts with the gut-brain axis. Signals long-term energy stores to the brain.' }
          ],
          color: 'from-indigo-500 to-violet-700'
        },
        {
          id: 'end',
          icon: '🏁',
          name: 'Brain Integration',
          time: 'Total: 24–72 hours mouth-to-elimination',
          pH: 'N/A',
          mechanical: 'Solid waste is eliminated; nothing more is absorbed.',
          chemical: 'The brain integrates signals from the entire digestive tract — ghrelin, leptin, insulin, PYY, GLP-1 — to track hunger and satiety over hours and days.',
          macros: {
            carb: 'Glucose has been used for immediate energy or stored as glycogen (liver / muscle).',
            protein: 'Amino acids have been used to build tissue, enzymes, hormones, antibodies — or converted to energy.',
            fat: 'Fat has been used for energy, stored, or used to build cell membranes and signal molecules.',
            fiber: 'Fermentation byproducts have nourished colon cells; remaining bulk has been eliminated.'
          },
          hormones: [
            { name: 'Insulin / Glucagon balance', role: 'Long after the meal, insulin (storage signal) and glucagon (release signal) coordinate stable blood sugar between meals.' },
            { name: 'Leptin', role: 'Continues to communicate energy stores to the brain over hours and days.' }
          ],
          color: 'from-slate-500 to-slate-700'
        }
      ];

      function DigestionWalkthrough() {
        var stageIdx_state = useState(d.dg_stage != null ? d.dg_stage : 0);
        var stageIdx = stageIdx_state[0], setStageIdx = stageIdx_state[1];
        useEffect(function() { upd('dg_stage', stageIdx); }, [stageIdx]);

        var stage = DIGESTION_STAGES[stageIdx];

        function next() {
          if (stageIdx < DIGESTION_STAGES.length - 1) {
            setStageIdx(stageIdx + 1);
            announce('Now at ' + DIGESTION_STAGES[stageIdx + 1].name);
          }
        }
        function prev() {
          if (stageIdx > 0) {
            setStageIdx(stageIdx - 1);
            announce('Now at ' + DIGESTION_STAGES[stageIdx - 1].name);
          }
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🍽️', title: 'Digestion Walkthrough' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-rose-900 mb-2' }, 'Follow your food through your body'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'Digestion is mechanical (chewing, churning, peristalsis) AND chemical (enzymes breaking molecules apart). Different parts of the journey handle different macronutrients. Hormones coordinate the whole process — from "I\'m hungry" to "I\'m full" — across hours and days.')
            ),
            // Progress strip
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { 'role': 'tablist', 'aria-label': 'Digestion stages', className: 'flex flex-wrap gap-2' },
                DIGESTION_STAGES.map(function(s, i) {
                  var sel = (stageIdx === i);
                  return h('button', {
                    key: s.id,
                    role: 'tab',
                    'aria-selected': sel ? 'true' : 'false',
                    onClick: function() { setStageIdx(i); announce('Jumped to ' + s.name); },
                    className: 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                      (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500')
                  },
                    h('span', { className: 'text-xl', 'aria-hidden': true }, s.icon),
                    h('span', null, (i + 1) + '. ' + s.name)
                  );
                })
              )
            ),
            // Stage hero
            h('div', { className: 'bg-gradient-to-br ' + stage.color + ' text-white rounded-2xl p-6 shadow-lg' },
              h('div', { className: 'flex items-center gap-4 mb-2' },
                h('span', { className: 'text-6xl' }, stage.icon),
                h('div', null,
                  h('div', { className: 'text-xs uppercase tracking-widest opacity-80 font-bold' }, 'Stage ' + (stageIdx + 1) + ' of ' + DIGESTION_STAGES.length),
                  h('h2', { className: 'text-3xl font-black' }, stage.name)
                )
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 text-sm' },
                h('div', null,
                  h('span', { className: 'opacity-80 text-xs uppercase tracking-wider font-bold' }, 'Time spent: '),
                  h('span', null, stage.time)
                ),
                h('div', null,
                  h('span', { className: 'opacity-80 text-xs uppercase tracking-wider font-bold' }, 'pH: '),
                  h('span', { className: 'font-mono' }, stage.pH)
                )
              )
            ),
            // Mechanical + chemical
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-2' }, '🔨 Mechanical action'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, stage.mechanical)
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-2' }, '⚗️ Chemical action'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, stage.chemical)
              )
            ),
            // What happens to each macro
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
              h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-3' }, 'What happens to each macronutrient at this stage'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                [
                  { key: 'carb',    label: 'Carbohydrates', emoji: '🌾', color: 'bg-amber-50 border-amber-300' },
                  { key: 'protein', label: 'Protein',       emoji: '💪', color: 'bg-rose-50 border-rose-300' },
                  { key: 'fat',     label: 'Fat',           emoji: '🥑', color: 'bg-yellow-50 border-yellow-300' },
                  { key: 'fiber',   label: 'Fiber',         emoji: '🌿', color: 'bg-emerald-50 border-emerald-300' }
                ].map(function(m) {
                  return h('div', { key: m.key, className: 'p-3 rounded-lg border-2 ' + m.color },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-xl', 'aria-hidden': true }, m.emoji),
                      h('span', { className: 'font-bold text-slate-800' }, m.label)
                    ),
                    h('p', { className: 'text-sm text-slate-800' }, stage.macros[m.key])
                  );
                })
              )
            ),
            // Hormones
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
              h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-3' }, '🧪 Key hormones at this stage'),
              h('ul', { className: 'space-y-2' },
                stage.hormones.map(function(hm, i) {
                  return h('li', { key: i, className: 'p-2 bg-slate-50 rounded border border-slate-200' },
                    h('span', { className: 'font-bold text-slate-800 mr-2' }, hm.name + ':'),
                    h('span', { className: 'text-sm text-slate-800' }, hm.role)
                  );
                })
              )
            ),
            // Nav buttons
            h('div', { className: 'flex justify-between items-center' },
              h('button', {
                onClick: prev,
                'aria-disabled': stageIdx === 0 ? 'true' : 'false',
                className: 'px-4 py-2 rounded-xl font-bold text-sm transition focus:outline-none focus:ring-4 ring-emerald-500/40 ' +
                  (stageIdx === 0 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700')
              }, '← Previous stage'),
              h('div', { className: 'text-xs font-mono text-slate-700' },
                'Stage ' + (stageIdx + 1) + ' / ' + DIGESTION_STAGES.length),
              h('button', {
                onClick: next,
                'aria-disabled': stageIdx === DIGESTION_STAGES.length - 1 ? 'true' : 'false',
                className: 'px-4 py-2 rounded-xl font-bold text-sm transition focus:outline-none focus:ring-4 ring-emerald-500/40 ' +
                  (stageIdx === DIGESTION_STAGES.length - 1 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700')
              }, 'Next stage →')
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS1-3 (Homeostasis)', 'NGSS HS-LS1-7 (Cellular processes)', 'CTE Family & Consumer Sciences'],
              questions: [
                'A high-fiber meal stays in the stomach longer than a low-fiber meal. Why does this affect how full you feel?',
                'Lactose intolerance comes from low production of lactase, an enzyme in the small intestine. Predict what happens when someone with lactose intolerance drinks milk.',
                'A medication that BLOCKS gastric acid (proton pump inhibitor) is sometimes prescribed for acid reflux. What might be a long-term concern about reducing stomach acidity? (Hint: B12.)'
              ],
              misconceptions: [
                '"Digestion happens in the stomach" — most NUTRIENT ABSORPTION happens in the small intestine, not the stomach. The stomach mixes and starts protein digestion; the small intestine does the bulk of the chemical work and absorption.',
                '"Fiber is just for pooping" — soluble fiber is fermented by gut bacteria into short-chain fatty acids that have systemic anti-inflammatory effects, regulate blood sugar, and feed your colon cells. It does much more than bulk up stool.',
                '"Insulin is a diabetes hormone" — insulin is a normal, healthy hormone everyone makes. It signals cells to absorb glucose after a meal. Type 1 diabetes is when the body cannot make insulin; Type 2 is when cells stop responding well to it.'
              ],
              extension: 'Pick one digestive enzyme from this module (amylase, pepsin, lipase, trypsin, lactase). Look up where it\'s made, what it breaks down, and what conditions involve too little or too much of it. Write a paragraph.',
              sources: 'Stage timing and enzyme info from Marieb & Hoehn, Human Anatomy & Physiology. Hormone signaling from Murray\'s Harper\'s Illustrated Biochemistry. Gut microbiome / SCFA effects from Sonnenburg & Bäckhed, Nature 2016 review.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 6: COMMON NUTRITION MYTHS
      // ─────────────────────────────────────────────────────
      // Quiz-style myth-busting. 10 myths spanning the most-Googled bad
      // nutrition advice. Each myth: present statement, ask for the truth,
      // reveal evidence-based explanation with NIH/Harvard/CDC citations.
      // CRITICAL: never replace one myth with another. Where research is
      // mixed, say so explicitly.
      var MYTHS = [
        {
          id: 'detox',
          claim: '"Detox cleanses" flush toxins out of your body and improve your health.',
          choices: [
            'True — your body needs help eliminating toxins.',
            'Partially true — they help if you have liver problems.',
            'False — your liver and kidneys already do this; "detox" products don\'t add anything science can measure.',
            'Depends on the brand.'
          ],
          answer: 2,
          explain: 'Your liver, kidneys, lungs, skin, and gut already detoxify constantly — that\'s their job. The American Liver Foundation, Harvard T.H. Chan, and NCCIH (NIH) all note that "detox" products lack rigorous evidence and that the kidneys and liver clear waste effectively in healthy people. Some "cleanses" can be HARMFUL (extreme calorie restriction, electrolyte imbalance, dangerous laxative use).',
          cite: 'Harvard T.H. Chan · NCCIH (NIH National Center for Complementary and Integrative Health) · American Liver Foundation'
        },
        {
          id: 'superfood',
          claim: '"Superfoods" like açaí, kale, or quinoa are essential for health.',
          choices: [
            'True — they have unique health properties no other food has.',
            'False — "superfood" has no FDA definition; nutrient-dense foods exist but no single food is essential.',
            'True only for the açaí berry.',
            'True if you eat enough of them.'
          ],
          answer: 1,
          explain: '"Superfood" is a marketing term, not a scientific or regulatory category. Nutrient-dense foods absolutely exist (leafy greens, berries, fish, beans, nuts), but no single food is essential — your body can build a healthy diet from many combinations. Açaí, goji, or quinoa are nutrient-dense, but a Maine wild blueberry, a Brunswick apple, or homegrown lentils contribute the same kinds of nutrients without the marketing markup.',
          cite: 'Harvard T.H. Chan · USDA Dietary Guidelines'
        },
        {
          id: 'gluten',
          claim: 'Eating gluten-free is healthier for everyone.',
          choices: [
            'True — gluten causes inflammation in everyone.',
            'False — only people with celiac disease (~1%) or non-celiac gluten sensitivity (~6%) benefit. Many gluten-free products are LESS fortified and HIGHER in sugar/fat.',
            'True for athletes.',
            'True if you have headaches.'
          ],
          answer: 1,
          explain: 'Celiac disease is a real autoimmune condition that affects ~1% of the population — for those people, eating gluten causes intestinal damage and they MUST avoid it. Non-celiac gluten sensitivity is also real for some. For everyone else, research shows no benefit to gluten avoidance. Wheat-based foods are often fortified with iron and folate; gluten-free substitutes often aren\'t. Gluten-free baked goods are also typically higher in sugar and fat to compensate for texture.',
          cite: 'NIDDK (NIH National Institute of Diabetes and Digestive and Kidney Diseases) · Mayo Clinic · Harvard T.H. Chan'
        },
        {
          id: 'fat',
          claim: 'Eating fat makes you fat.',
          choices: [
            'True — dietary fat directly becomes body fat.',
            'False — dietary fat is essential. Total energy balance, food quality, and overall pattern matter more than fat content.',
            'True only for saturated fat.',
            'True after age 30.'
          ],
          answer: 1,
          explain: 'Dietary fat is essential — your body uses it for cell membranes, hormone production, and absorbing fat-soluble vitamins (A, D, E, K). The 1980s "fat-free" craze led food makers to replace fat with refined carbs and sugar, which arguably worsened health outcomes. Healthy diets in research (Mediterranean, DASH) include 25-35% calories from fat. Quality matters more than total: olive oil, nuts, avocado, fish — all "fatty" foods, all linked to good health outcomes.',
          cite: 'Harvard T.H. Chan · NIH Health Information · USDA Dietary Guidelines'
        },
        {
          id: 'sugar',
          claim: '"Sugar is sugar" — there\'s no difference between sugar in fruit and added sugar.',
          choices: [
            'True — your body breaks both down identically.',
            'Mostly false — naturally occurring sugar in fruit comes bundled with fiber, water, vitamins, and slows absorption. Added sugars are concentrated and lack this context.',
            'True for blood-sugar effects.',
            'False — fruit sugar is even worse.'
          ],
          answer: 1,
          explain: 'At the molecule level, sucrose is sucrose. But CONTEXT matters enormously. An apple has sugar PLUS 4 g fiber, water, vitamin C, and polyphenols — all of which slow absorption and reduce blood-sugar spikes. A soda has the same amount of sugar with none of that. Research consistently links added sugars (not whole fruit) to higher disease risk. The FDA acknowledges this distinction by mandating the "Includes Xg Added Sugars" line on Nutrition Facts panels.',
          cite: 'FDA · Harvard T.H. Chan · AHA (American Heart Association) · NIH'
        },
        {
          id: 'megadose',
          claim: 'Taking large doses of vitamins can cure diseases or boost performance.',
          choices: [
            'True — more is better for water-soluble vitamins.',
            'False — fat-soluble vitamins (A, D, E, K) accumulate to toxic levels; B6 megadosing causes nerve damage. Most vitamin claims about megadosing aren\'t supported.',
            'True if prescribed by a doctor.',
            'Only true for vitamin C.'
          ],
          answer: 1,
          explain: 'Vitamins are essential at recommended levels but can be HARMFUL in megadoses. Vitamin A toxicity causes liver damage and birth defects. Vitamin D excess raises blood calcium dangerously. Vitamin B6 megadosing causes peripheral neuropathy (sometimes irreversible). Even vitamin C, often considered "safe," can cause GI upset and kidney stones at very high doses. Therapeutic megadoses exist for specific medical conditions, but require medical supervision — they aren\'t over-the-counter strategies for "boosting" health.',
          cite: 'NIH ODS (Office of Dietary Supplements) Fact Sheets · NCCIH'
        },
        {
          id: 'organic',
          claim: 'Organic food is more nutritious than conventionally grown food.',
          choices: [
            'True — organic always has more vitamins.',
            'False — multi-decade studies show no MEANINGFUL nutrient difference. Organic regulates pesticides and farming methods, not nutrient density.',
            'True only for vegetables.',
            'True for organic chicken.'
          ],
          answer: 1,
          explain: 'A 2012 Stanford meta-analysis of 200+ studies found no significant nutrient differences between organic and conventional produce. The 2014 British Journal of Nutrition meta-analysis found small differences in some antioxidants. Organic IS regulated for pesticide use, soil practices, and animal welfare — those are valid reasons to choose organic if you can afford it. But "more nutritious" isn\'t supported by the evidence base.',
          cite: 'Smith-Spangler et al., Annals of Internal Medicine 2012 (Stanford meta-analysis) · USDA · British Journal of Nutrition 2014'
        },
        {
          id: 'water',
          claim: 'Everyone needs exactly 8 glasses of water per day.',
          choices: [
            'True — this is a strict medical guideline.',
            'False — total fluid (food + drinks) varies by climate, activity, body size. Thirst is a reasonable guide for healthy people; clear/light-yellow urine confirms.',
            'True only for adults.',
            'True only for athletes.'
          ],
          answer: 1,
          explain: 'The "8 glasses" rule has no clear scientific origin and isn\'t a Mayo Clinic or NIH guideline. The Institute of Medicine\'s reference values are ~3.7 L/day for men and ~2.7 L/day for women — but ~20% of that comes from food (especially fruits and veggies), and the rest from any beverage (not just water). Hot weather, exercise, illness, and pregnancy raise needs. Healthy people can rely on thirst and the color of their urine (pale yellow = adequate; dark = drink more).',
          cite: 'Institute of Medicine · Mayo Clinic · NIH'
        },
        {
          id: 'carbs',
          claim: 'Carbs are bad and should be minimized for everyone.',
          choices: [
            'True — carbs cause weight gain.',
            'False — carbohydrates are your brain\'s preferred fuel; whole-grain and fruit carbs are tied to lower disease risk in research.',
            'True only for "white" carbs.',
            'True after age 30.'
          ],
          answer: 1,
          explain: 'Glucose (from carbs) is your brain\'s preferred fuel — about 120 g/day for the adult brain alone. Fiber is technically a carbohydrate, and high-fiber diets are linked to lower rates of heart disease, diabetes, colorectal cancer, and all-cause mortality (multiple long-term studies). The QUALITY matters: whole grains, fruits, beans, vegetables = good evidence base; refined sugar + ultra-processed flour = different evidence base. "Carbs are bad" lumps all of these together inaccurately.',
          cite: 'Harvard T.H. Chan · USDA Dietary Guidelines · NIH'
        },
        {
          id: 'breakfast',
          claim: 'Eating breakfast every morning is essential for health.',
          choices: [
            'True — it\'s the most important meal of the day.',
            'False — research is genuinely mixed. What matters is overall daily nutrition; meal timing flexibility is fine for healthy adults.',
            'True only for kids.',
            'True only if you want to lose weight.'
          ],
          answer: 1,
          explain: 'The "breakfast is most important" framing came partly from cereal-industry marketing in the early 20th century. Research on breakfast eating IS mixed: kids in school benefit from morning food (multiple studies); adults show variable results. What\'s consistent: total daily nutrition matters more than meal timing for most healthy people. If breakfast helps you fuel your morning, eat it. If you\'re not hungry until 10 AM, that\'s also fine. Eating disorders sometimes manifest as RIGID rules about breakfast — flexibility is itself a sign of a healthy relationship with food.',
          cite: 'Harvard T.H. Chan · BMJ meta-analysis 2019 · CDC'
        }
      ];

      function NutritionMythsLab() {
        var idx_state = useState(d.my_idx != null ? d.my_idx : 0);
        var idx = idx_state[0], setIdx = idx_state[1];
        var picks_state = useState({});
        var picks = picks_state[0], setPicks = picks_state[1];
        useEffect(function() { upd('my_idx', idx); }, [idx]);

        var myth = MYTHS[idx];
        var picked = picks[idx];

        function pick(ci) {
          if (picks[idx] != null) return;
          var next = Object.assign({}, picks);
          next[idx] = ci;
          setPicks(next);
          var correct = MYTHS[idx].answer === ci;
          announce(correct ? 'Correct' : 'Not quite — see explanation');
        }
        function nextMyth() {
          if (idx + 1 < MYTHS.length) setIdx(idx + 1);
        }
        function prevMyth() {
          if (idx > 0) setIdx(idx - 1);
        }

        var answeredCount = Object.keys(picks).length;
        var correctCount = Object.keys(picks).filter(function(k) {
          return picks[k] === MYTHS[parseInt(k, 10)].answer;
        }).length;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🔍', title: 'Common Nutrition Myths' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
            h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-violet-900 mb-2' }, 'The most-Googled bad nutrition advice'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'These ten claims show up constantly in social media, advertising, and well-meaning advice from family. We picked them because each is a documented misconception with a clear evidence base. Where research is genuinely mixed, we say so explicitly. Sources cited inline (NIH, Harvard, CDC, FDA, AHA).')
            ),
            // Progress
            h('div', { className: 'flex items-center justify-between text-sm font-bold text-slate-700' },
              h('div', null, 'Myth ' + (idx + 1) + ' of ' + MYTHS.length),
              h('div', null, 'Score: ' + correctCount + ' / ' + answeredCount + ' answered')
            ),
            // Myth card
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
              h('div', { className: 'p-3 bg-slate-100 border-l-4 border-violet-500 rounded' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-violet-700 mb-1' }, 'The claim'),
                h('p', { className: 'text-base text-slate-800 italic' }, myth.claim)
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'What\'s the truth?'),
                h('div', { 'role': 'radiogroup', 'aria-label': myth.claim, className: 'space-y-2' },
                  myth.choices.map(function(ch, ci) {
                    var sel = (picked === ci);
                    var revealCorrect = picked != null && myth.answer === ci;
                    var revealWrong = picked === ci && picked !== myth.answer;
                    var btnClass = 'w-full text-left p-3 rounded-lg border-2 text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ';
                    if (revealCorrect) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold';
                    else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                    else if (sel) btnClass += 'bg-violet-100 border-violet-500 text-violet-900';
                    else btnClass += 'bg-white border-slate-300 hover:border-violet-400 text-slate-800';
                    return h('button', {
                      key: ci,
                      onClick: function() { pick(ci); },
                      role: 'radio',
                      'aria-checked': sel ? 'true' : 'false',
                      'aria-disabled': picked != null ? 'true' : 'false',
                      className: btnClass
                    }, ch);
                  })
                )
              ),
              picked != null && h('div', {
                className: 'p-4 rounded-xl border-2 ' +
                  (myth.answer === picked ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'),
                'aria-live': 'polite'
              },
                h('div', { className: 'font-bold mb-2 ' + (myth.answer === picked ? 'text-emerald-900' : 'text-amber-900') },
                  myth.answer === picked ? '✓ Correct' : '⚠ Not quite — here\'s what the evidence says'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' }, myth.explain),
                h('div', { className: 'text-[11px] font-mono text-slate-700 italic' }, 'Sources: ' + myth.cite)
              )
            ),
            // Nav
            h('div', { className: 'flex justify-between items-center' },
              h('button', {
                onClick: prevMyth,
                'aria-disabled': idx === 0 ? 'true' : 'false',
                className: 'px-4 py-2 rounded-xl font-bold text-sm transition focus:outline-none focus:ring-4 ring-violet-500/40 ' +
                  (idx === 0 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700')
              }, '← Previous'),
              picked != null && idx + 1 < MYTHS.length && h('button', {
                onClick: nextMyth,
                className: 'px-5 py-2 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition focus:outline-none focus:ring-4 ring-emerald-500/40'
              }, 'Next myth →'),
              picked != null && idx + 1 >= MYTHS.length && h('div', { className: 'px-3 py-2 rounded bg-emerald-100 text-emerald-900 font-bold text-sm' },
                '🎉 You\'ve seen all ' + MYTHS.length + ' myths!')
            ),
            h(TeacherNotes, {
              standards: ['CTE Family & Consumer Sciences', 'NGSS Nature of Science', 'Information Literacy'],
              questions: [
                'Why do nutrition myths persist even after research disproves them? What about online platforms accelerates the spread?',
                'Of these ten myths, which one have you (or someone you know) believed? What changed your view, or what would?',
                'Pick one nutrition claim you\'ve seen on social media. Look up whether NIH, Harvard, or the CDC backs it. Report the comparison.'
              ],
              misconceptions: [
                '"All scientists agree on nutrition" — they don\'t, and saying they do is itself misinformation. Nutrition science has well-established consensus on some things (smoking is bad, fiber is good, ultra-processed food at scale is harmful) and genuine open questions on others (optimal saturated fat intake, fasting protocols, individual variation).',
                '"If a celebrity recommends it, it works" — celebrities are paid spokespeople. Evidence comes from research, not endorsements.',
                '"Personal experience > research" — anecdote is weak evidence because it lacks controls. Both can be true: your individual response to a food may be real AND not generalizable.'
              ],
              extension: 'Find one nutrition claim being made on TikTok, Instagram, or YouTube right now. Use the framework from this module to evaluate it: who\'s saying it, what\'s their credential, what evidence do they cite, what does NIH or Harvard T.H. Chan say? Write a one-paragraph evaluation.',
              sources: 'Citations vary by myth and are listed inline above. Primary references: NIH Office of Dietary Supplements, Harvard T.H. Chan School of Public Health, CDC, FDA, USDA Dietary Guidelines, American Heart Association.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 7: FOOD & MENTAL HEALTH
      // ─────────────────────────────────────────────────────
      // Research-grounded connections between nutrition and mental health.
      // CRITICAL FRAMING: every claim is bracketed as a CONTRIBUTING FACTOR,
      // not a cure or replacement for medical / therapeutic care. Every
      // section ends with the same reminder. Sources: Harvard T.H. Chan,
      // NIH NIMH, AAP, NEDA. We do NOT cite influencers or wellness blogs.
      var FOOD_MOOD = [
        {
          id: 'omega3',
          title: 'Omega-3 fatty acids and depression',
          icon: '🐟',
          claim: 'Higher omega-3 (EPA + DHA) intake is associated with lower rates of depression in observational studies. Some clinical trials show omega-3 supplementation as an ADJUNCT (alongside therapy and medication) helps treatment-resistant depression.',
          mechanism: 'DHA is a major structural component of brain cell membranes. EPA may have anti-inflammatory effects; some depression involves inflammation. Both reduce omega-6/omega-3 ratio imbalance common in standard Western diets.',
          food: 'Fatty fish: salmon, mackerel, sardines, herring, anchovies. The American Heart Association recommends 2 fatty-fish meals per week. ALA (in walnuts, flax, chia) is partially converted in your body, but conversion rate is low; whole-fish sources are more reliable.',
          caution: 'Omega-3s are an ADJUNCT, not a treatment. They are not a substitute for therapy or prescribed medication. If you are struggling with depression, please reach out to a doctor, therapist, school counselor, or call/text 988 (Suicide & Crisis Lifeline).',
          cite: 'Harvard T.H. Chan · Cochrane Review on Omega-3 and Depression · AHA'
        },
        {
          id: 'iron',
          title: 'Iron and ADHD-style fatigue',
          icon: '🩸',
          claim: 'AAP notes iron deficiency in adolescents can present with fatigue, brain fog, and attention symptoms similar to ADHD. Some studies suggest treating iron deficiency in adolescents with low ferritin can improve attention and energy.',
          mechanism: 'Iron is required for hemoglobin (oxygen transport) and for several brain neurotransmitter pathways. Low iron means tissues — including brain — get less oxygen and fewer neurotransmitter precursors.',
          food: 'Heme iron (best absorbed): red meat, poultry, fish. Non-heme iron: lentils, beans, spinach, fortified cereals. Pair plant-iron foods with vitamin C (citrus, peppers, broccoli) to roughly DOUBLE absorption.',
          caution: 'Self-supplementing iron is NOT recommended. Iron levels should be checked by a doctor (ferritin blood test) before supplementation; iron overload can damage the liver. If a teen has fatigue + brain fog, ask a doctor to check iron status — especially for menstruating teens.',
          cite: 'AAP (American Academy of Pediatrics) · NIH ODS · Cochrane Review on Iron in Adolescents'
        },
        {
          id: 'sugar',
          title: 'Blood sugar swings and mood',
          icon: '📉',
          claim: 'Big swings in blood sugar (a sugar-heavy snack on an empty stomach, then a crash 1-2 hours later) can trigger irritability, fatigue, and difficulty concentrating. This is most pronounced in adolescents and during periods of stress.',
          mechanism: 'A large pulse of simple sugar triggers a large insulin response, which can drive blood sugar BELOW baseline (reactive hypoglycemia). Brain depends on steady glucose; rapid drops feel like brain fog, irritability, or shakiness.',
          food: 'Pair simple sugars with protein, fat, or fiber to slow absorption: an apple with peanut butter (vs apple alone), oatmeal with nuts (vs sugary cereal), yogurt with berries (vs candy). Whole-food meals smooth the curve.',
          caution: 'Persistent severe hypoglycemia or extreme reactivity to sugar is NOT normal. If you experience shakiness, sweating, or fainting after meals, talk to a doctor — this can indicate diabetes, prediabetes, or other conditions worth investigating.',
          cite: 'Harvard T.H. Chan · NIDDK (NIH) · Mayo Clinic'
        },
        {
          id: 'caffeine',
          title: 'Caffeine and adolescent anxiety',
          icon: '☕',
          claim: 'Adolescents process caffeine more slowly than adults — caffeine\'s half-life is roughly 5-7 hours in teens (vs 5 hours in adults), but baseline anxiety sensitivity is higher. Energy drinks combine high caffeine with high sugar AND other stimulants. AAP advises against energy drinks for anyone under 18.',
          mechanism: 'Caffeine blocks adenosine receptors (creating wakefulness) but also stimulates adrenaline release. In sensitive individuals (more common in adolescence), this can trigger or worsen anxiety symptoms — racing heart, jitteriness, rumination, sleep disruption.',
          food: 'Most major sources: coffee (~95 mg/cup), black tea (~50 mg/cup), green tea (~30 mg/cup), soda (~35 mg/can), energy drinks (~80-300+ mg/can), chocolate (small amounts). AAP guidance: NO caffeine for kids under 12; very limited for teens.',
          caution: 'If you have anxiety, panic attacks, or sleep problems, reducing caffeine is one of the easiest things to try. Cut gradually to avoid withdrawal headaches. Talk to a doctor or therapist if anxiety persists — caffeine reduction is supportive, not a substitute for proper care.',
          cite: 'AAP · NIH NIMH · Mayo Clinic'
        },
        {
          id: 'gutBrain',
          title: 'The gut-brain axis',
          icon: '🦠',
          claim: 'Your gut and brain are connected via the vagus nerve, immune signaling, and microbiome metabolites. About 90% of your body\'s serotonin (a mood-relevant neurotransmitter) is made in the gut. Research increasingly links gut microbiome composition to mood, anxiety, and stress response — though much of this is still being studied.',
          mechanism: 'Gut bacteria ferment fiber into short-chain fatty acids (especially butyrate), which influence brain function via inflammation pathways. Microbiome composition is shaped by diet (especially fiber), antibiotics, stress, and genetics.',
          food: 'Fiber-rich foods feed beneficial gut bacteria: lentils, beans, oats, fruits, vegetables, whole grains. Fermented foods (yogurt, kefir, sauerkraut, kimchi) contain live bacteria that may help diversify the gut microbiome.',
          caution: 'The gut-brain axis is real and increasingly well-studied, BUT specific probiotic supplements are NOT regulated by the FDA the way medications are. The evidence base is still developing. Eat fiber and fermented foods for general health; treat specific probiotic claims with skepticism.',
          cite: 'Harvard T.H. Chan · NIH · Sonnenburg & Bäckhed, Nature 2016 · BMJ Gut journal'
        },
        {
          id: 'vitD',
          title: 'Vitamin D and mood (especially in Maine)',
          icon: '☀️',
          claim: 'Some research links low vitamin D to higher rates of depression, particularly seasonal patterns (Seasonal Affective Disorder, SAD). Maine\'s northern latitude means many residents have low vitamin D from October through March — sunlight is too low-angled for skin to make vitamin D from UVB.',
          mechanism: 'Vitamin D receptors are present throughout the brain. Vitamin D may regulate serotonin synthesis. Causation is debated — low D may CONTRIBUTE to mood symptoms or simply CORRELATE with general health and outdoor activity.',
          food: 'Fatty fish (salmon, sardines), egg yolks, fortified milk and plant milks, fortified cereals. Sunshine (UVB) — but at Maine latitude, only May through September provides enough UV angle.',
          caution: 'If you live in Maine and feel low through winter, ask a doctor to check vitamin D (a simple blood test). MANY Mainers benefit from a winter supplement — but dose should be guided by blood level, not guessed. Vitamin D toxicity is real at megadoses.',
          cite: 'NIH ODS · Maine clinical literature on northern latitude vitamin D · NIMH on SAD'
        },
        {
          id: 'hydration',
          title: 'Hydration and concentration',
          icon: '💧',
          claim: 'Even mild dehydration (1-2% body weight in fluid loss) measurably impairs attention, short-term memory, and mood in studies. This is especially relevant during exercise, hot weather, illness, or busy days when you forget to drink.',
          mechanism: 'Brain is ~75% water. Fluid loss reduces blood volume, alters electrolyte balance, and stresses the system. Adolescents have higher relative water turnover than adults.',
          food: 'Plain water is sufficient for most needs. Fruits and vegetables contribute meaningful water (a watermelon slice is ~92% water). Sports drinks are useful only for sustained hard exercise (>60 min) — for everyday use, water is better.',
          caution: 'If you feel persistently fatigued, dizzy, or unable to concentrate even with adequate water, see a doctor. Hydration is supportive — it\'s not a treatment for clinical attention or mood disorders.',
          cite: 'Institute of Medicine · NIH · Mayo Clinic'
        }
      ];

      function FoodMoodLab() {
        var picked_state = useState(null);
        var picked = picked_state[0], setPicked = picked_state[1];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🧠', title: 'Food & Mental Health' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            // CRITICAL FRAMING BANNER — visible at top
            h('div', { className: 'bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-indigo-900 mb-2' }, 'How food affects mood, attention, and mental health'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                'There are real, well-studied connections between nutrition and mental health. This module covers seven of them — each as a CONTRIBUTING FACTOR, not a cure. Diet alone does not treat depression, anxiety, or ADHD. But poor nutrition can make any of those harder to manage, and addressing nutrition is part of comprehensive care.'),
              h('div', { className: 'p-3 bg-white border border-indigo-300 rounded text-sm text-slate-800' },
                h('strong', { className: 'text-indigo-900' }, '⚠ Important: '),
                'If you are struggling with mental health, please reach out to a doctor, therapist, school counselor, or trusted adult. Crisis support is available 24/7: ',
                h('strong', { className: 'font-mono' }, '988'),
                ' (Suicide & Crisis Lifeline) · ',
                h('strong', { className: 'font-mono' }, 'Text HOME to 741741'),
                ' (Crisis Text Line). This module is education, not treatment.')
            ),
            // Topic grid
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              FOOD_MOOD.map(function(item) {
                var sel = picked && picked.id === item.id;
                return h('button', {
                  key: item.id,
                  onClick: function() { setPicked(sel ? null : item); announce(sel ? 'Closed ' + item.title : 'Showing ' + item.title); },
                  'aria-pressed': sel ? 'true' : 'false',
                  className: 'text-left p-4 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-emerald-500/40 nutritionlab-card-lift ' +
                    (sel ? 'bg-indigo-100 border-indigo-600 shadow-lg' : 'bg-white border-slate-300 hover:border-indigo-500')
                },
                  h('div', { className: 'flex items-start gap-3' },
                    h('span', { className: 'text-3xl flex-shrink-0', 'aria-hidden': true }, item.icon),
                    h('div', null,
                      h('div', { className: 'font-black text-slate-800 text-sm mb-1' }, item.title),
                      h('div', { className: 'text-xs text-slate-700' },
                        sel ? 'Click to collapse' : 'Click to learn more')
                    )
                  )
                );
              })
            ),
            // Detail panel
            picked && h('div', { className: 'bg-white rounded-2xl shadow border-2 border-indigo-400 p-5 space-y-3', 'aria-live': 'polite' },
              h('div', { className: 'flex items-center gap-3 pb-3 border-b border-slate-200' },
                h('span', { className: 'text-4xl' }, picked.icon),
                h('h3', { className: 'text-2xl font-black text-slate-800' }, picked.title)
              ),
              h('div', { className: 'p-3 bg-blue-50 rounded-lg border border-blue-200' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, '📚 What the research says'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, picked.claim)
              ),
              h('div', { className: 'p-3 bg-violet-50 rounded-lg border border-violet-200' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-violet-900 mb-1' }, '🔬 Mechanism (how it works)'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, picked.mechanism)
              ),
              h('div', { className: 'p-3 bg-emerald-50 rounded-lg border border-emerald-200' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1' }, '🥗 Food sources'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, picked.food)
              ),
              h('div', { className: 'p-3 bg-amber-50 rounded-lg border-2 border-amber-400' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, '⚠ Important caution'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, picked.caution)
              ),
              h('div', { className: 'text-[11px] font-mono text-slate-700 italic' }, 'Sources: ' + picked.cite)
            ),
            !picked && h('div', { className: 'bg-slate-100 rounded-2xl border border-slate-300 p-5 text-center' },
              h('div', { className: 'text-3xl mb-2', 'aria-hidden': true }, '👆'),
              h('p', { className: 'text-sm text-slate-700' },
                'Click any topic above to see what research says, the proposed mechanism, food sources, and important cautions.')
            ),
            // Closing reminder
            h('div', { className: 'bg-rose-50 border-2 border-rose-400 rounded-2xl p-5' },
              h('div', { className: 'flex items-start gap-3' },
                h('span', { className: 'text-3xl', 'aria-hidden': true }, '💚'),
                h('div', null,
                  h('h3', { className: 'text-base font-black text-rose-900 mb-1' }, 'A reminder before you leave this module'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                    'These connections are real but partial. Mental-health symptoms have many contributors — genetics, sleep, exercise, social support, life events, brain chemistry — and nutrition is one piece. If something here applies to you or someone you love, the next step is talking with a professional, not a diet change. School counselor, family doctor, NAMI helpline (1-800-950-6264), or crisis line 988 are all good places to start.')
                )
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Family & Consumer Sciences', 'NGSS HS-LS1-3 (Homeostasis)', 'Maine Health Education Standards · Mental Health'],
              questions: [
                'Why is "diet alone treats depression" a dangerous claim, even when research shows real diet-mood connections?',
                'A friend tells you they read online that "going gluten-free cured their anxiety." How would you talk with them about this without dismissing their experience?',
                'AAP advises NO caffeine for kids under 12 and very limited intake for teens. What does this say about how the AAP weighs evidence vs popular practice?'
              ],
              misconceptions: [
                '"You can\'t address mental health through food at all" — this is also wrong. Iron deficiency, vitamin D deficiency, blood-sugar swings, and dehydration can all worsen mental-health symptoms. Nutrition is part of comprehensive care.',
                '"If a nutrition change works for someone, it works for everyone" — individual variation is huge. Anecdotes are weak evidence.',
                '"Supplements are the answer" — most supplements are not regulated by the FDA the way medications are. Whole-food sources have a much better track record.'
              ],
              extension: 'Pick one of the seven topics in this module. Look up two MORE recent research papers on it (Google Scholar, PubMed, or Harvard T.H. Chan website). Note: do the new papers strengthen or complicate what you read here? Write a short evaluation.',
              sources: 'Harvard T.H. Chan School of Public Health (Department of Nutrition) · NIH NIMH (National Institute of Mental Health) · NIH ODS · AAP · NAMI · Cochrane Reviews. Maine vitamin D context from clinical literature on northern latitude.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 8: EATING DISORDER AWARENESS (CONTENT-WARNING GATED)
      // ─────────────────────────────────────────────────────
      // SAFETY GUARDRAILS (audited line by line):
      //   ✓ Mandatory content-warning gate at entry — must click to confirm
      //   ✓ Zero specific weight, calorie, BMI, or measurement numbers
      //   ✓ Zero descriptions of restrictive behaviors that could be mimicked
      //   ✓ Zero "before/after," "ideal weight," or thin-ideal language
      //   ✓ Zero shame-based recovery framing ("you should just eat")
      //   ✓ Zero pro-restriction coded terms / emojis named (would function as
      //     a search vocabulary for vulnerable users — instead, frame: trust
      //     the signal that content feels like glorifying being sick)
      //   ✓ Body diversity normalized
      //   ✓ NEDA helpline visible at top AND bottom of every screen
      //   ✓ Maine-specific resources (Maine 211, Maine Behavioral Healthcare)
      //   ✓ "Most people recover with support" framing throughout
      //   ✓ Spectrum framing — disordered eating is a continuum, not binary
      //   ✓ Online content red flags section: algorithm-awareness + concrete
      //     platform-tool guidance (TikTok / IG / YouTube "Not interested",
      //     reporting flow), NOT a vocabulary list of pro-ana terms
      //   ✓ Built from a school-psych voice (Aaron's lens)
      function EDAwareness() {
        var consented_state = useState(false);
        var consented = consented_state[0], setConsented = consented_state[1];
        var section_state = useState('overview');
        var section = section_state[0], setSection = section_state[1];

        // Resource bar — always visible at top of any content screen
        function ResourceBar() {
          return h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-sm' },
            h('div', { className: 'flex items-start gap-2' },
              h('span', { className: 'text-xl flex-shrink-0', 'aria-hidden': true }, '💚'),
              h('div', null,
                h('strong', { className: 'text-emerald-900' }, 'Help is available right now: '),
                h('span', { className: 'text-slate-800' },
                  'NEDA helpline ',
                  h('strong', { className: 'font-mono text-emerald-900' }, '1-800-931-2237'),
                  ' · text ',
                  h('strong', { className: 'font-mono text-emerald-900' }, 'NEDA'),
                  ' to ',
                  h('strong', { className: 'font-mono text-emerald-900' }, '741741'),
                  ' · 988 Crisis Lifeline · Maine 211 · or talk with a trusted adult.')
              )
            )
          );
        }

        if (!consented) {
          // CONTENT WARNING GATE
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '💚', title: 'Eating Disorder Awareness' }),
            h('div', { className: 'p-6 max-w-2xl mx-auto' },
              h('div', { className: 'bg-white rounded-2xl shadow border-2 border-amber-400 p-6 space-y-4' },
                h('div', { className: 'flex items-start gap-3 pb-3 border-b border-slate-200' },
                  h('span', { className: 'text-4xl', 'aria-hidden': true }, '⚠️'),
                  h('h2', { className: 'text-2xl font-black text-amber-900' }, 'Content note before you continue')
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'This module discusses eating disorders, which are serious mental-health conditions. It covers:'),
                h('ul', { className: 'list-disc list-inside space-y-1 text-sm text-slate-800 ml-2' },
                  h('li', null, 'The spectrum of disordered eating'),
                  h('li', null, 'Signs to watch for in yourself or a friend'),
                  h('li', null, 'How to support someone who is struggling'),
                  h('li', null, 'How and when to talk with an adult'),
                  h('li', null, 'Resources, including helplines that can help right now')
                ),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'What this module does NOT include: '),
                  'specific weights, calorie numbers, BMI numbers, descriptions of restrictive behaviors, "before/after" framing, or any content that could function as a how-to. The information is intentionally general — focused on awareness, support, and recovery.'),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-amber-900' }, 'If reading about eating concerns is hard for you right now, '),
                  'please consider:',
                  h('ul', { className: 'list-disc list-inside mt-1 ml-2 space-y-1' },
                    h('li', null, 'Talking with a trusted adult before continuing'),
                    h('li', null, 'Skipping this module and exploring others in NutritionLab'),
                    h('li', null, 'Calling NEDA right now: ', h('strong', { className: 'font-mono' }, '1-800-931-2237'), ' (Mon-Thu 11am-9pm, Fri 11am-5pm ET)'),
                    h('li', null, 'Texting ', h('strong', { className: 'font-mono' }, 'NEDA'), ' to ', h('strong', { className: 'font-mono' }, '741741'), ' for 24/7 crisis support')
                  )
                ),
                h('div', { className: 'flex flex-col sm:flex-row gap-3 pt-2' },
                  h('button', {
                    onClick: function() { setConsented(true); announce('Continuing to Eating Disorder Awareness module'); },
                    className: 'flex-1 px-5 py-3 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition focus:outline-none focus:ring-4 ring-emerald-500/40'
                  }, '✓ I understand — continue'),
                  h('button', {
                    onClick: function() { setView('menu'); upd('view', 'menu'); },
                    className: 'flex-1 px-5 py-3 rounded-xl bg-slate-200 text-slate-800 font-black hover:bg-slate-300 transition focus:outline-none focus:ring-4 ring-slate-500/40'
                  }, '← Take me back to the menu')
                )
              )
            )
          );
        }

        // Content sections
        var sections = [
          { id: 'overview',  label: '1. What disordered eating is' },
          { id: 'signs',     label: '2. Signs to watch for' },
          { id: 'media',     label: '3. Online content red flags' },
          { id: 'support',   label: '4. Supporting a friend' },
          { id: 'self',      label: '5. If it\'s YOU' },
          { id: 'recovery',  label: '6. Recovery is real' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '💚', title: 'Eating Disorder Awareness' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
            ResourceBar(),
            // Section nav
            h('div', { 'role': 'tablist', 'aria-label': 'Module sections', className: 'flex flex-wrap gap-2' },
              sections.map(function(s) {
                var sel = (section === s.id);
                return h('button', {
                  key: s.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setSection(s.id); announce(s.label); },
                  className: 'px-3 py-2 rounded-xl border-2 font-bold text-xs transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500')
                }, s.label);
              })
            ),
            section === 'overview' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Disordered eating is on a spectrum'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Most people\'s relationship with food has bumps. There\'s a difference between an OCCASIONAL hard day with food (which is part of being human) and a PATTERN that interferes with your life or your health.'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Eating disorders are real medical conditions, not choices and not phases. Like depression or anxiety, they involve brain chemistry, genetics, life experiences, and culture. They are also TREATABLE — most people who get support recover.'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Eating disorders affect people of every body size, gender, race, age, and background. The stereotype of "thin teenage girl" causes real harm — boys, athletes, kids of color, larger-bodied kids, and adults all struggle and are often missed by the people around them.'),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'Key idea: '),
                  'Concern is justified when someone\'s thinking about food, body, or exercise starts taking up so much mental space that it interferes with school, friendships, hobbies, or health. The frequency, intensity, and disruption matter more than any specific behavior in isolation.')
              )
            ),
            section === 'signs' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Signs that someone may be struggling'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'These are GENERAL patterns the National Eating Disorders Association (NEDA) names as warning signs. None of these alone proves an eating disorder; the concerning pattern is a CLUSTER of changes happening together over time.'),
                h('div', { className: 'space-y-2' },
                  [
                    { icon: '💭', text: 'Strong, frequent preoccupation with food, body, weight, or "good vs bad" foods' },
                    { icon: '😟', text: 'Withdrawing from social activities that involve food (lunch, parties, family meals)' },
                    { icon: '🌀', text: 'Significant mood changes connected to eating (extreme guilt, shame, or anxiety after meals)' },
                    { icon: '⏳', text: 'Rigid rituals around food, exercise, or daily structure that disrupt normal life' },
                    { icon: '🩹', text: 'Frequent comments about feeling "too big," "too small," or wanting to change body shape' },
                    { icon: '😴', text: 'Fatigue, dizziness, brain fog, hair changes, sleep problems, or feeling cold often' },
                    { icon: '👀', text: 'Noticing peers / influencers / family making comments that reinforce harmful patterns' }
                  ].map(function(s, i) {
                    return h('div', { key: i, className: 'flex items-start gap-3 p-2 bg-slate-50 rounded border border-slate-200' },
                      h('span', { className: 'text-2xl flex-shrink-0', 'aria-hidden': true }, s.icon),
                      h('span', { className: 'text-sm text-slate-800' }, s.text)
                    );
                  })
                ),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-amber-900' }, 'Important: '),
                  'Body changes alone are NOT a reliable sign. People in every body size can have eating disorders. The behavior, thinking patterns, and disruption to life matter more than appearance.')
              )
            ),
            section === 'media' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Online content red flags'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'A LOT of what shapes how people think about food and bodies today comes from social media — TikTok, Instagram, YouTube, Snapchat. Some of this content is helpful (registered dietitians, intuitive eating coaches, body-diverse fitness creators). A lot of it is not. The 2023 Surgeon General Advisory on Social Media and Youth Mental Health flagged content that promotes disordered eating as a documented driver of body-image concerns and eating disorders in adolescents. Recognizing the patterns is itself protective.'),
                h('div', { className: 'p-3 bg-violet-50 border border-violet-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-violet-900' }, 'How algorithms feed this: '),
                  'Recommendation algorithms (the "For You" page, IG Reels, YouTube\'s "Up Next") track what you watch and feed you more of it. A single search for "weight loss" or lingering on a body-comparison reel can cascade into an increasingly extreme feed. The algorithm doesn\'t know what\'s good for you — it knows what holds your attention. Strong feelings (especially anxiety, comparison, or self-criticism) hold attention well, which is why harmful content surfaces.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, '🚩 Patterns to watch for in food / body content'),
                h('div', { className: 'space-y-2' },
                  [
                    { icon: '🍽️', t: '"What I eat in a day" videos showing tiny / extreme intake', d: 'Especially when posed as aspirational. Real intake varies day-to-day and across bodies; a single curated day is not a template.' },
                    { icon: '🔢', t: 'On-screen calorie counts or "calorie debt" framing', d: 'Calorie content is a real piece of nutrition science, but using it as a moral scoreboard ("I\'ve earned this") trains numerical fixation.' },
                    { icon: '⚖️', t: 'Before / after body transformation reels', d: 'These compress months or years of weight changes (often unsustainable or unhealthy) into 15 seconds. They imply a one-way "improvement" frame that flattens body diversity.' },
                    { icon: '🚫', t: '"Foods I would never eat" or "fear food" content', d: 'Builds a good-vs-bad food binary that has no nutritional basis and is a documented contributor to disordered eating.' },
                    { icon: '👀', t: 'Body checking — measuring, mirror angles, comparing parts', d: 'Repeatedly examining body parts is a clinical sign of eating disorder thinking. Content that normalizes this trains the same habits in viewers.' },
                    { icon: '✨', t: '"Clean eating" / "earning" food / detox / cleanse / reset language', d: 'Wellness aesthetic packaging on what is functionally restrictive eating. The implicit logic is that some foods make you "dirty" and need to be undone — this is not how nutrition works.' },
                    { icon: '🏃', t: 'Fitness creators selling extreme restriction as "discipline"', d: 'Genuine fitness coaching exists. Content that ties food restriction to identity ("I\'m the kind of person who can resist") often crosses a line.' },
                    { icon: '💊', t: 'Detox teas, appetite suppressants, fat burners, weight-loss pills', d: 'These are diet products marketed as wellness. FDA does not approve most for safety or efficacy. Some have caused real harm including liver damage and cardiac events.' },
                    { icon: '🤐', t: 'Coded language and emojis that signal pro-restriction communities', d: 'These exist and are designed to evade platform moderation. We won\'t list specific terms here (it would function as a search list). If you encounter content that feels like it\'s glorifying being sick, trust that signal — block, mute, and report.' }
                  ].map(function(rf, i) {
                    return h('div', { key: i, className: 'flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200' },
                      h('span', { className: 'text-2xl flex-shrink-0', 'aria-hidden': true }, rf.icon),
                      h('div', null,
                        h('div', { className: 'font-bold text-slate-800 text-sm mb-1' }, rf.t),
                        h('p', { className: 'text-sm text-slate-800' }, rf.d)
                      )
                    );
                  })
                )
              ),
              h('div', { className: 'bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5' },
                h('h3', { className: 'text-base font-black text-emerald-900 mb-2' }, '✓ What you can do — your feed is yours to shape'),
                h('ul', { className: 'space-y-2 text-sm text-slate-800' },
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-emerald-700 font-bold flex-shrink-0' }, '1.'),
                    h('span', null,
                      h('strong', null, 'Use platform tools. '),
                      'On TikTok, long-press a video → "Not interested." On Instagram, three-dot menu → "Not interested." On YouTube, three-dot menu → "Don\'t recommend channel." Each tap retrains the algorithm. After a few days the feed shifts.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-emerald-700 font-bold flex-shrink-0' }, '2.'),
                    h('span', null,
                      h('strong', null, 'Block, mute, and unfollow without guilt. '),
                      'You don\'t owe anyone your attention. Removing harmful accounts is a self-care move, not rudeness.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-emerald-700 font-bold flex-shrink-0' }, '3.'),
                    h('span', null,
                      h('strong', null, 'Curate actively in the other direction. '),
                      'Follow creators with bodies of varied sizes who DO NOT center food/weight conversations. Athletes, scientists, comedians, gardeners, artists. The algorithm starts feeding you more of who you watch.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-emerald-700 font-bold flex-shrink-0' }, '4.'),
                    h('span', null,
                      h('strong', null, 'Report content that promotes eating disorders. '),
                      'Every major platform has a category for this. Reporting is anonymous; the creator doesn\'t see you reported them. NEDA tracks platform responses and pushes for stronger moderation.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-emerald-700 font-bold flex-shrink-0' }, '5.'),
                    h('span', null,
                      h('strong', null, 'Take breaks when you notice the spiral. '),
                      'If you\'ve been on a platform for 30 minutes and feel worse about yourself than when you started, close it. Body comparison is one of the most well-documented harms of social media.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-emerald-700 font-bold flex-shrink-0' }, '6.'),
                    h('span', null,
                      h('strong', null, 'Talk about what you see. '),
                      'Naming a pattern out loud, with a friend or trusted adult, is one of the fastest ways to recognize it for what it is. "That video felt weird, did you see it?" is enough to start.')
                  )
                )
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
                h('h3', { className: 'text-base font-black text-blue-900 mb-1' }, 'A note about "wellness" specifically'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'A lot of harmful food content today is packaged as "wellness," "biohacking," "lifestyle," or "high-performance habits." The aesthetic is calm, white-marble, soft-lit, and professional-looking. The substance — extreme restriction, "earning" food, treating bodies as projects — is the same diet culture older generations were sold. Looking polished doesn\'t make content true. The same red flags above apply.')
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-4' },
                h('h3', { className: 'text-base font-black text-amber-900 mb-1' }, 'Where to learn more about media literacy'),
                h('ul', { className: 'list-disc list-inside text-sm text-slate-800 space-y-1' },
                  h('li', null,
                    h('strong', null, 'Common Sense Media '),
                    '(commonsensemedia.org) — independent reviews of platforms, apps, and content from a kid/family lens'),
                  h('li', null,
                    h('strong', null, 'NEDA Social Media + Body Image '),
                    '(nationaleatingdisorders.org) — research-backed guidance and free educator toolkits'),
                  h('li', null,
                    h('strong', null, 'U.S. Surgeon General\'s 2023 Advisory on Social Media and Youth Mental Health '),
                    '(hhs.gov/surgeongeneral) — official report on documented harms and what platforms / families / schools can do'),
                  h('li', null,
                    h('strong', null, 'Your school counselor or school psychologist '),
                    'can help you think through your own social media use without judgment.')
                )
              )
            ),
            section === 'support' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'How to support a friend'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'You are not their therapist, and that\'s OK. What matters most is that you remain a caring presence and connect them with professional help.'),
                h('div', { className: 'p-3 bg-emerald-50 border border-emerald-300 rounded' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2' }, '✓ Things that help'),
                  h('ul', { className: 'list-disc list-inside space-y-1 text-sm text-slate-800' },
                    h('li', null, 'LISTEN without trying to fix or convince'),
                    h('li', null, 'Talk about who they ARE — interests, humor, projects — not what they look like'),
                    h('li', null, 'Tell them you care about them, full stop'),
                    h('li', null, 'Encourage them to talk with a trusted adult: parent, school counselor, doctor, or older sibling'),
                    h('li', null, 'Offer to sit with them while they call a helpline or set up an appointment'),
                    h('li', null, 'Keep including them in social plans, even if they say no the first time')
                  )
                ),
                h('div', { className: 'p-3 bg-rose-50 border border-rose-300 rounded' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-900 mb-2' }, '× Things that don\'t help (even if well-intentioned)'),
                  h('ul', { className: 'list-disc list-inside space-y-1 text-sm text-slate-800' },
                    h('li', null, 'Commenting on their body, weight, or appearance — positive OR negative'),
                    h('li', null, 'Trying to argue them into eating, or making meals into a battle'),
                    h('li', null, 'Telling them "just eat" or "just stop" — eating disorders aren\'t a choice'),
                    h('li', null, 'Comparing their struggle to someone who has it "worse"'),
                    h('li', null, 'Keeping a serious concern secret because you promised — safety overrides secrecy')
                  )
                ),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'When to tell an adult: '),
                  'If a friend\'s health or safety is at risk — they\'ve mentioned hurting themselves, are passing out, can\'t function in daily life, or you\'re seriously worried — tell a trusted adult right away. Telling someone who can help is not a betrayal; it\'s the most loyal thing a friend can do. NEDA, school counselors, and parents are all good places to start.')
              )
            ),
            section === 'self' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'If you\'re the one struggling'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'First: nothing you are experiencing makes you "broken" or "weak." Eating disorders are medical conditions that affect millions of people. They are TREATABLE. Most people who get support do recover.'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'You don\'t have to wait for things to get worse to ask for help. You don\'t have to "earn" support by being sick enough. You just have to reach out.'),
                h('div', { className: 'p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2' }, 'Where to start, in order of urgency'),
                  h('ol', { className: 'list-decimal list-inside space-y-2 text-sm text-slate-800' },
                    h('li', null,
                      h('strong', null, 'If you\'re in crisis right now '),
                      '(thinking about hurting yourself, can\'t keep food down, feeling unsafe): call ',
                      h('span', { className: 'font-mono font-bold' }, '988'),
                      ' or text ',
                      h('span', { className: 'font-mono font-bold' }, 'HOME'),
                      ' to ',
                      h('span', { className: 'font-mono font-bold' }, '741741'),
                      '.'
                    ),
                    h('li', null,
                      h('strong', null, 'For ED-specific support 24/7: '),
                      'NEDA helpline ',
                      h('span', { className: 'font-mono font-bold' }, '1-800-931-2237'),
                      ' (Mon-Fri business hours) or text ',
                      h('span', { className: 'font-mono font-bold' }, 'NEDA'),
                      ' to ',
                      h('span', { className: 'font-mono font-bold' }, '741741'),
                      ' (24/7 crisis text). Free, confidential, trained.'
                    ),
                    h('li', null,
                      h('strong', null, 'In school: '),
                      'school counselor or school psychologist. They are bound to follow up appropriately and can connect you to outside care.'
                    ),
                    h('li', null,
                      h('strong', null, 'A trusted adult: '),
                      'parent, older sibling, coach, teacher, family friend, family doctor. You don\'t need a script — "I\'ve been having a hard time and could use some help" is enough.'
                    ),
                    h('li', null,
                      h('strong', null, 'Maine-specific: '),
                      'Maine 211 (call 211) connects to local mental-health services. Maine Behavioral Healthcare has crisis services statewide. NAMI Maine: ',
                      h('span', { className: 'font-mono' }, 'namimaine.org'),
                      '.'
                    )
                  )
                ),
                h('div', { className: 'p-3 bg-violet-50 border border-violet-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-violet-900' }, 'On the helpline: '),
                  'You don\'t need to know what to say. They\'re trained to start the conversation. You can call back. You can hang up. You can\'t do it wrong.')
              )
            ),
            section === 'recovery' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Recovery is real'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Most people with eating disorders recover, especially when they get support EARLIER rather than later. Recovery isn\'t linear — it has hard days, setbacks, and slow improvement — but the trajectory is real and well-documented.'),
                h('div', { className: 'space-y-3' },
                  [
                    { icon: '🌱', t: 'Earlier is better', d: 'Treatment in the first year of an eating disorder has higher success rates than treatment after years of illness. Reaching out fast is genuinely helpful.' },
                    { icon: '🤝', t: 'Treatment is multi-pronged', d: 'Most evidence-based ED treatment combines medical care (a doctor monitoring health), nutrition support (a registered dietitian), and therapy (often family-based for younger people, individual or group for adults). No single piece does it alone.' },
                    { icon: '🛤️', t: 'Recovery is not "going back to who you were"', d: 'Most people who recover talk about becoming a more grounded version of themselves — clearer about what they value, more comfortable with their bodies, more capable of being with hard feelings. The work changes you.' },
                    { icon: '🧘', t: 'Stigma is the enemy of recovery', d: 'Shame keeps people from asking for help. Talking honestly — to a friend, an adult, a professional — is the bridge out. You are not weak for struggling. You are not selfish for asking. The asking IS the courage.' }
                  ].map(function(item, i) {
                    return h('div', { key: i, className: 'flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200' },
                      h('span', { className: 'text-3xl flex-shrink-0', 'aria-hidden': true }, item.icon),
                      h('div', null,
                        h('div', { className: 'font-bold text-emerald-900 mb-1' }, item.t),
                        h('p', { className: 'text-sm text-slate-800' }, item.d)
                      )
                    );
                  })
                ),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded text-sm text-slate-800 text-center font-bold' },
                  'You — or someone you love — can come through this.')
              )
            ),
            // Bottom resource bar — always visible at exit
            ResourceBar(),
            h(TeacherNotes, {
              standards: ['Maine Health Education Standards · Mental Health', 'NEDA Educator Toolkit', 'CTE Family & Consumer Sciences', 'U.S. Surgeon General Advisory on Social Media and Youth Mental Health (2023)', 'Media Literacy / ISTE Digital Citizen'],
              questions: [
                'Eating disorders affect people of every body size, gender, race, age, and background. Why does the "thin teenage girl" stereotype cause real harm?',
                'What\'s the difference between an occasional hard day around food (part of being human) and a pattern that warrants concern?',
                'How does a recommendation algorithm shape what food / body content a user sees? What does that imply about the difference between "what\'s on my feed" and "what\'s true"?',
                'A friend swears you to secrecy about a behavior that worries you. What would you do, and why?',
                'A creator with millions of followers posts a "what I eat in a day" video that looks impressive. What questions would you want a viewer to ask before treating it as a model?'
              ],
              misconceptions: [
                '"Eating disorders are about vanity / wanting to look a certain way" — eating disorders are mental-health conditions involving brain chemistry, genetics, life experience, and culture. Appearance is sometimes a surface, but never the whole story.',
                '"You can tell if someone has an ED by looking at them" — body size is not a reliable indicator. People at every size develop eating disorders; many go unnoticed because they don\'t match the stereotype.',
                '"Recovery means going back to normal eating" — most people in recovery describe a deeper change in their relationship with food, body, and themselves. It\'s not a return; it\'s a transformation.',
                '"Wellness content is healthier than diet content" — a lot of harmful messaging is now packaged as wellness, biohacking, or lifestyle. Aesthetics don\'t determine truth; the same red flags apply.',
                '"The algorithm just gives me what I want" — recommendation algorithms are optimized for engagement (watch time, reactions), not for your well-being. They surface content that holds your attention, which often means content that triggers strong feelings.'
              ],
              extension: 'Audit your own social media feed for one week. Note how often you encounter content that fits the red flags from this module. After the week: use platform tools (Not Interested, mute, unfollow, report) to actively shift the feed. Track what changes.',
              sources: 'NEDA (National Eating Disorders Association · nationaleatingdisorders.org). NIMH Eating Disorders information. AAP guidance on adolescent eating disorders. U.S. Surgeon General\'s 2023 Advisory on Social Media and Youth Mental Health (hhs.gov/surgeongeneral). Common Sense Media (commonsensemedia.org). NAMI Maine. Maine 211. Crisis Text Line. 988 Suicide & Crisis Lifeline.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 9: MAINE FOOD REALITY
      // ─────────────────────────────────────────────────────
      // Maine-specific food and nutrition context. Covers latitude vitamin-D
      // problem, world-class fisheries, real food-access challenges in
      // Aroostook + Washington counties, the 2022 Maine free school meals
      // law, SNAP basics, food-bank network, Wabanaki food sovereignty,
      // climate impact on Maine agriculture and fisheries. Sources: Maine
      // CDC, USDA Economic Research Service, Maine DOE School Nutrition,
      // Good Shepherd Food Bank, Maine.gov, Wabanaki tribal sources.
      function MaineFoodReality() {
        var tab_state = useState(d.mr_tab || 'seasons');
        var tab = tab_state[0], setTab = tab_state[1];
        useEffect(function() { upd('mr_tab', tab); }, [tab]);

        var tabs = [
          { id: 'seasons',  label: 'Seasons + vitamin D' },
          { id: 'fisheries', label: 'Fisheries + omega-3' },
          { id: 'access',   label: 'Food access' },
          { id: 'school',   label: 'School meals + SNAP' },
          { id: 'local',    label: 'Local food + Wabanaki' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🌲', title: 'Maine Food Reality' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-stone-100 border-2 border-stone-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-stone-900 mb-2' }, 'Nutrition science as it actually plays out in Maine'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'Maine\'s geography, climate, history, and economy all shape what food looks like here. Long winters and northern latitude make vitamin D a documented public-health issue. World-class cold-water fisheries make Maine an omega-3 powerhouse. Rural distances and seasonal employment create real food-access challenges. Maine became the second state in the country to permanently fund free school meals for all kids. This module names the realities students live inside.')
            ),
            h('div', { 'role': 'tablist', 'aria-label': 'Maine Food Reality sections', className: 'flex flex-wrap gap-2' },
              tabs.map(function(t) {
                var sel = (tab === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setTab(t.id); announce(t.label); },
                  className: 'px-3 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-stone-700 text-white border-stone-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-stone-500')
                }, t.label);
              })
            ),
            tab === 'seasons' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Maine winters are a vitamin D problem'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Maine sits at roughly 43-47°N latitude. From October through March, the sun angle is too low for human skin to make vitamin D from sunlight, no matter how much time you spend outside. Most Mainers are vitamin D insufficient through winter. The Maine CDC has flagged this as a documented public-health issue.'),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-amber-900' }, 'Why this matters: '),
                  'Vitamin D supports calcium absorption (bones), immune function, and possibly mood (some research links low D to seasonal affective disorder). Adolescents are in peak bone-building years — adequate D matters more than usual.'),
                h('div', { className: 'p-3 bg-emerald-50 border border-emerald-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-emerald-900' }, 'What works in Maine: '),
                  'Fatty fish (salmon, sardines, herring), egg yolks, fortified milk and plant milks, fortified cereals. Many Mainers benefit from a winter vitamin D supplement — but dose should be guided by a blood test (ask your doctor for a 25-hydroxy vitamin D test). Don\'t guess.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-2' },
                h('h3', { className: 'text-base font-black text-slate-800' }, 'Local growing season is short'),
                h('p', { className: 'text-sm text-slate-800' },
                  'Maine\'s frost-free growing season runs roughly mid-May to early October — about 130 days statewide, shorter in Aroostook. Outside that window, fresh local produce is limited. Frozen local berries, canned tomatoes, root vegetables (potatoes, carrots, beets, parsnips, winter squash), and apples in cold storage are real Maine winter staples. Frozen vegetables retain nearly all their nutrients and are typically cheaper than out-of-season fresh.')
              )
            ),
            tab === 'fisheries' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Maine is an omega-3 powerhouse'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Maine\'s cold North Atlantic waters support some of the richest fatty-fish populations in the world. Cold water means more omega-3 (EPA + DHA) per gram of fish — these fats serve as antifreeze in cold-water species. Maine fisheries land roughly $700M+ in seafood per year (DMR, varies year to year), making it Maine\'s most economically significant agricultural sector after wild blueberries.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'Maine\'s key fatty fish'),
                h('div', { className: 'space-y-2' },
                  [
                    { fish: 'Atlantic salmon (farmed)', omega3: '~2.3 g per 3oz serving', note: 'Cooke Aquaculture in eastern Maine. Higher omega-3 than wild salmon due to feed.' },
                    { fish: 'Atlantic herring', omega3: '~2.0 g per 3oz', note: 'Maine\'s most abundant pelagic fish. Often canned as sardines.' },
                    { fish: 'Atlantic mackerel', omega3: '~1.8 g per 3oz', note: 'Strong-flavored oily fish; underused in American kitchens.' },
                    { fish: 'Atlantic sardines (canned)', omega3: '~1.5 g per 3oz', note: 'Tiny fish = lower mercury. Canned sardines are cheap and shelf-stable.' },
                    { fish: 'Maine bluefin tuna (sport / commercial)', omega3: '~1.3 g per 3oz', note: 'High mercury for adolescents — limit to occasional.' },
                    { fish: 'Lobster', omega3: '~0.2 g per 3oz', note: 'Iconic but lower omega-3 than fatty fish. Excellent protein, low fat.' }
                  ].map(function(f, i) {
                    return h('div', { key: i, className: 'p-2 bg-slate-50 rounded border border-slate-200' },
                      h('div', { className: 'flex items-center justify-between flex-wrap gap-1' },
                        h('span', { className: 'font-bold text-slate-800' }, f.fish),
                        h('span', { className: 'font-mono text-xs text-emerald-700' }, f.omega3)
                      ),
                      h('div', { className: 'text-xs text-slate-700 mt-1' }, f.note)
                    );
                  })
                ),
                h('div', { className: 'mt-3 p-3 bg-blue-50 border border-blue-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'AHA recommendation: '),
                  '2 fatty-fish meals per week (about 8 oz total). For Mainers, this is achievable with mostly local seafood — and canned sardines or herring keep it affordable.')
              )
            ),
            tab === 'access' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Food access in Maine is uneven'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'The USDA tracks "food deserts" — areas where residents have limited access to affordable, nutritious food. In Maine, the most affected areas are Aroostook County (the largest county east of the Mississippi by area, with the lowest population density), Washington County (down east), and pockets of inland rural Penobscot, Piscataquis, and Somerset counties. Lewiston and parts of Portland also have urban food-access challenges.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-2' }, 'What "food access" actually means'),
                h('ul', { className: 'space-y-2 text-sm text-slate-800' },
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-stone-700 font-bold flex-shrink-0' }, '◆'),
                    h('span', null,
                      h('strong', null, 'Distance: '),
                      'In rural Maine, the nearest grocery store with fresh produce can be 30+ minutes away. Without a car, that\'s functionally inaccessible.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-stone-700 font-bold flex-shrink-0' }, '◆'),
                    h('span', null,
                      h('strong', null, 'Cost: '),
                      'Fresh fruits, vegetables, and lean proteins cost more per calorie than ultra-processed pantry food. For families on tight budgets, the calorie math pushes toward the latter.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-stone-700 font-bold flex-shrink-0' }, '◆'),
                    h('span', null,
                      h('strong', null, 'Time: '),
                      'Cooking from scratch takes time. Working two jobs, single parenting, or shift work all compress the time available for food prep.')
                  ),
                  h('li', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-stone-700 font-bold flex-shrink-0' }, '◆'),
                    h('span', null,
                      h('strong', null, 'Knowledge: '),
                      'How to cook beans, how to use frozen vegetables, what to do with cheap cuts of meat — these are learned skills, often passed down through families. When food culture is disrupted, the skills can fade.')
                  )
                )
              ),
              h('div', { className: 'p-3 bg-emerald-50 border-2 border-emerald-300 rounded text-sm text-slate-800' },
                h('strong', { className: 'text-emerald-900' }, 'Important framing: '),
                'Food access is a SYSTEMIC issue, not an individual moral failing. People making food choices in food deserts are not "lazy" or "uninformed" — they\'re solving an optimization problem with constraints most middle-class shoppers don\'t face. Public-health nutrition focuses on changing the system (more grocery stores, better school meals, SNAP-eligibility expansions, school food gardens) rather than blaming individuals.')
            ),
            tab === 'school' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'School meals — Maine led the country'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'In 2022, Maine became the second state in the U.S. (after California) to permanently fund free school breakfast and lunch for ALL public-school students, regardless of family income. The law (LD 1679, signed by Governor Mills) eliminated the means-tested application process and the social stigma that came with it. Other states have since followed.'),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'Why universal free meals matter: '),
                  'Research shows kids who eat breakfast at school perform better academically, have fewer behavioral incidents, and have better attendance. Removing the application step means kids who qualify but were embarrassed to apply now eat. Maine\'s law also expanded local-food sourcing into school cafeterias.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h3', { className: 'text-base font-black text-slate-800' }, 'SNAP — the federal food-assistance program'),
                h('p', { className: 'text-sm text-slate-800' },
                  'SNAP (Supplemental Nutrition Assistance Program, formerly food stamps) provides monthly food benefits to eligible low-income families. In Maine, ~13% of residents receive SNAP at any given time (USDA). Benefits are loaded onto an EBT card and used at most grocery stores, farmers markets, and some online retailers.'),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-sm text-slate-800' },
                  h('strong', { className: 'text-amber-900' }, 'Common misconception: '),
                  'SNAP is not a flat amount per family. The benefit is calculated based on income, household size, expenses, and other factors. Average benefit is roughly $6 per person per day in Maine — meaningful, but tight. SNAP can be used for groceries (including seeds and food-producing plants) but not for prepared hot food, alcohol, or non-food items.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h3', { className: 'text-base font-black text-slate-800' }, 'Good Shepherd Food Bank + Maine food-pantry network'),
                h('p', { className: 'text-sm text-slate-800' },
                  'Good Shepherd Food Bank (Auburn) is Maine\'s largest hunger-relief organization, distributing food through ~600 pantries and meal programs statewide. Other Maine food resources: Wayside Food Programs (Portland), Preble Street, Locker Project (school-based pantries), and a strong network of regional food hubs.'),
                h('div', { className: 'p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-slate-800' },
                  h('strong', { className: 'text-emerald-900' }, 'Maine 211: '),
                  'Dial 211 (or visit 211maine.org) for connections to food pantries, SNAP application help, school meal info, and other services. Free, confidential, available 24/7.')
              )
            ),
            tab === 'local' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Maine\'s local food economy'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Maine has more farms per capita than most states and a vibrant local food economy: farmers markets in nearly every town, CSA (community-supported agriculture) shares from spring through fall, regional food hubs, an active aquaculture industry, and signature crops like wild blueberries (Maine produces about 99% of U.S. wild blueberries, mostly from Washington and Hancock counties).')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-2' }, 'Wabanaki food sovereignty'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                  'The Wabanaki Confederacy (Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq) have stewarded land in present-day Maine for thousands of years. Traditional Wabanaki food systems include moose, deer, salmon, eels, wild rice, fiddleheads, sweet grass, blueberries, corn, beans, and squash (the Three Sisters companion-planting system).'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                  'Food sovereignty — the right of communities to control their own food systems — is an active issue for Maine\'s tribes. Recent decades have seen Wabanaki-led restoration of native crops, traditional fishing rights, and food-system education programs.'),
                h('div', { className: 'p-2 bg-blue-50 border border-blue-200 rounded text-xs text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'Resources: '),
                  'Wabanaki Public Health & Wellness (wabanakiphw.org), Penobscot Nation Department of Natural Resources, Passamaquoddy Tribe at Pleasant Point, Indian Township.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-2' }, 'Climate change is reshaping Maine food'),
                h('p', { className: 'text-sm text-slate-800' },
                  'The Gulf of Maine is warming faster than 99% of the world\'s ocean (Gulf of Maine Research Institute). Lobster populations are shifting north into Canadian waters; cod stocks remain depressed. On land, the growing season is lengthening (by ~15 days since 1900) but with more extreme weather. New crops (peaches, kiwi, longer-season corn) are now possible; some traditional crops face new challenges.')
              )
            ),
            h(TeacherNotes, {
              standards: ['Maine Learning Results · Health Education + Social Studies', 'CTE Family & Consumer Sciences', 'NGSS HS-LS2-7 (Human impact on ecosystems)'],
              questions: [
                'Why does Maine\'s latitude make vitamin D a public-health issue rather than just a personal one?',
                'Maine became the 2nd state to permanently fund free school meals for all kids. What problem was that policy designed to solve, beyond just hunger?',
                'Food deserts persist even in a country that produces enormous amounts of food. What does that imply about the difference between food production and food ACCESS?',
                'How might Wabanaki food sovereignty efforts inform broader thinking about local food systems in Maine?'
              ],
              misconceptions: [
                '"People in food deserts could eat better if they tried" — food access is a systemic issue. Distance, cost, time, and infrastructure constrain choices most shoppers don\'t recognize.',
                '"All Maine seafood is healthy in unlimited amounts" — bluefin tuna and large predator fish accumulate mercury. Smaller, shorter-lived species (sardines, herring) are lower-mercury and more sustainable.',
                '"Frozen vegetables are nutritionally inferior" — frozen produce is flash-frozen at peak ripeness and often retains MORE nutrients than fresh produce that traveled cross-country. In Maine winters, frozen is excellent.'
              ],
              extension: 'Map your nearest 3 grocery stores, your nearest farmers market (in season), your nearest food pantry, and the nearest WIC office. Then consider: how would your access change if you didn\'t have a car? If you had to walk?',
              sources: 'Maine CDC · USDA Economic Research Service · Maine DOE School Nutrition · Good Shepherd Food Bank · Maine 211 · Gulf of Maine Research Institute · Maine Department of Marine Resources · Wabanaki Public Health & Wellness · Maine Department of Agriculture, Conservation and Forestry.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 10: CAREER PATHWAYS
      // ─────────────────────────────────────────────────────
      // Honest career landscape for nutrition professionals: RDN ladder
      // (Master's required as of 2024 + 1200 hr internship + national exam),
      // alternative paths (public health nutritionist, food scientist,
      // sports nutritionist, school nutrition director, certified nutrition
      // coach), Maine programs (UMaine HHD, Husson DPD), honest pay bands,
      // distinction between RDN (regulated, credentialed) and "nutritionist"
      // (unregulated in many states, anyone can use the term).
      function CareerPathwaysNutrition() {
        var view_state = useState(d.cp_view || 'overview');
        var view = view_state[0], setLocalView = view_state[1];
        useEffect(function() { upd('cp_view', view); }, [view]);

        var tabs = [
          { id: 'overview', label: '1. Why Nutrition' },
          { id: 'ladder',   label: '2. RDN Ladder' },
          { id: 'roles',    label: '3. Career Types' },
          { id: 'maine',    label: '4. Maine Programs' }
        ];

        var CAREER_LADDER = [
          {
            tier: 1, name: 'Bachelor\'s degree',
            time: '4 years',
            what: 'Undergraduate degree from an ACEND-accredited Didactic Program in Dietetics (DPD) — typically a B.S. in Nutrition, Food Science, or related. Coursework: organic chemistry, biochemistry, anatomy & physiology, microbiology, medical nutrition therapy, food science, community nutrition.',
            pay: 'No professional pay yet — student stage',
            how: 'Apply to ACEND-accredited DPD program. Maine: UMaine Orono (Human Nutrition + Foods, B.S.), Husson University (DPD pathway).'
          },
          {
            tier: 2, name: 'Supervised Practice (Dietetic Internship)',
            time: '~10-12 months',
            what: '1200 hours of supervised practice in clinical, community, and food-service settings. Highly competitive — fewer slots than applicants. Many internships are now combined Master\'s programs (since the 2024 RDN exam requirement change).',
            pay: 'Often unpaid or low stipend; some are paid through hospital systems',
            how: 'Apply through D&D Digital matching service (similar to medical-residency match). Acceptance rate ~50% nationally. Plan B options if not matched.'
          },
          {
            tier: 3, name: 'Master\'s degree (NEW 2024 requirement)',
            time: '~2 years (often combined with internship)',
            what: 'As of January 2024, the RDN exam REQUIRES a Master\'s degree (in addition to the bachelor\'s + internship). This is a major change from pre-2024 requirements. Most programs now combine Master\'s coursework with the internship.',
            pay: 'Student stage — but combined programs often include some stipend or paid work',
            how: 'Apply to ACEND-accredited Coordinated Program (CP) or graduate program. Husson has a combined Master\'s + DI option in development.'
          },
          {
            tier: 4, name: 'CDR Registration Examination',
            time: 'Take after completing internship + Master\'s',
            what: 'National exam administered by the Commission on Dietetic Registration. Pass rate ~70% first attempt. Multi-section, computer-based, ~3 hours.',
            pay: '~$200 exam fee. After passing: RDN credential = job-ready',
            how: 'Apply through CDR. Study materials: CDR study guides, JeanInman, Pocket Prep RD app.'
          },
          {
            tier: 5, name: 'Entry-level RDN',
            time: 'First job after credentialing',
            what: 'Hospital clinical RDN, community nutrition educator, WIC nutritionist, school nutrition director, long-term-care facility RDN. State licensure may also be required (Maine DOES require license to practice as RDN — check Maine Office of Professional and Occupational Regulation).',
            pay: '$50-65K typical entry; varies by setting (hospital > community in most cases)',
            how: 'Job boards, professional networks (Maine Academy of Nutrition and Dietetics), hospital career sites.'
          },
          {
            tier: 6, name: 'Specialized / Senior RDN',
            time: '5+ years experience',
            what: 'Specialized practice: pediatric, oncology, kidney disease, sports nutrition, eating disorders, diabetes education (CDCES credential), bariatric, food allergy. Some go into private practice; others move into academia, food industry R&D, public health policy.',
            pay: '$70-95K typical mid-career; private practice and food industry can exceed $100K with experience',
            how: 'Specialty certifications (e.g., CSP for pediatric, CSO for oncology, CDCES for diabetes), professional networking, often a Master\'s thesis in the area.'
          }
        ];

        var ROLES = [
          { name: 'Clinical RDN', icon: '🏥', desc: 'Hospital, ICU, dialysis, long-term care. Diagnose nutrition needs, design tube-feeding regimens, work alongside MDs and nurses.', pay: '$55-90K' },
          { name: 'Community Nutritionist', icon: '🏘️', desc: 'WIC programs, community health centers, public housing nutrition education, SNAP-Ed. Direct patient education + community programming.', pay: '$45-65K' },
          { name: 'Public Health Nutritionist', icon: '📊', desc: 'State / federal health departments, USDA, CDC. Population-level nutrition policy, school food standards, food labeling.', pay: '$60-95K' },
          { name: 'School Nutrition Director', icon: '🍎', desc: 'Manage K-12 school food service programs. Menu planning, USDA compliance, local-food procurement, budget management.', pay: '$50-80K' },
          { name: 'Sports / Performance RDN', icon: '🏃', desc: 'Athletic departments, professional sports teams, fitness centers. Performance nutrition, hydration, recovery, eating disorder awareness in athletes.', pay: '$55-100K+ in pro sports' },
          { name: 'Food Industry / R&D', icon: '🔬', desc: 'Food companies (Kraft, General Mills, Maine-based companies like Stonewall Kitchen). Product formulation, nutrition labeling, marketing review.', pay: '$70-120K typical' },
          { name: 'Pediatric RDN', icon: '👶', desc: 'Children\'s hospitals, pediatric clinics, feeding-disorder programs. Specialized in growth, allergy, NICU nutrition, eating disorders.', pay: '$60-90K' },
          { name: 'Eating Disorder RDN', icon: '💚', desc: 'Specialized clinics, residential treatment centers, outpatient practices. Often paired with therapist; works under medical team. Highly specialized training.', pay: '$60-90K' },
          { name: 'Private Practice / Counseling', icon: '💼', desc: 'Self-employed or small group. Build client base over time. Telehealth options. Insurance billing varies by state.', pay: 'Wide range; $30-150K+ depending on practice size' }
        ];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🎓', title: 'Career Pathways' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg' },
              h('div', { className: 'flex items-start gap-4' },
                h('span', { className: 'text-5xl' }, '🥗'),
                h('div', null,
                  h('h2', { className: 'text-2xl font-black mb-1' }, 'Nutrition careers — clear and honest'),
                  h('p', { className: 'text-sm opacity-95 leading-relaxed' },
                    'The Registered Dietitian Nutritionist (RDN) credential is the gold standard. As of 2024, RDN requires a Master\'s degree, an accredited supervised-practice internship (1200 hours), and passing a national exam. There are also paths in public health, food science, sports, and school nutrition that don\'t require RDN but offer related careers. This module is honest about timelines, pay, and the recent 2024 Master\'s change.')
                )
              )
            ),
            h('div', { 'role': 'tablist', 'aria-label': 'Career Pathway sections', className: 'flex flex-wrap gap-2' },
              tabs.map(function(t) {
                var sel = (view === t.id);
                return h('button', {
                  key: t.id,
                  role: 'tab',
                  'aria-selected': sel ? 'true' : 'false',
                  onClick: function() { setLocalView(t.id); announce(t.label); },
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                    (sel ? 'bg-blue-700 text-white border-blue-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-blue-500')
                }, t.label);
              })
            ),
            view === 'overview' && h('div', { className: 'space-y-4' },
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                [
                  { stat: '$55-95K', label: 'typical RDN pay', sub: 'wide range by setting + region', color: 'text-emerald-700' },
                  { stat: '~7 yrs', label: 'school + supervised practice', sub: 'undergrad + grad + internship', color: 'text-blue-700' },
                  { stat: '2024', label: 'Master\'s now required', sub: 'major change for the RDN credential', color: 'text-amber-700' }
                ].map(function(s, i) {
                  return h('div', { key: i, className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 text-center' },
                    h('div', { className: 'text-3xl font-black ' + s.color }, s.stat),
                    h('div', { className: 'text-sm font-bold text-slate-800 mt-1' }, s.label),
                    h('div', { className: 'text-xs text-slate-700 mt-1' }, s.sub)
                  );
                })
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-400 rounded-2xl p-5' },
                h('h3', { className: 'text-base font-black text-amber-900 mb-2' }, '⚠ "Nutritionist" vs "Registered Dietitian Nutritionist"'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                  'In many states (and online), anyone can call themselves a "nutritionist." The term is unregulated. There are real certified nutrition professionals (CNS — Certified Nutrition Specialist), but there are also Instagram "nutritionists" with no formal training selling supplements and meal plans.'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  h('strong', { className: 'text-amber-900' }, 'Registered Dietitian Nutritionist (RDN) is regulated. '),
                  'Earning the credential requires accredited education, supervised practice, a national exam, continuing education, and (in Maine) state licensure. RDN = regulated profession. "Nutritionist" alone = often not. When choosing whose food advice to trust, the credential matters.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'Why this career path?'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-800' },
                  h('div', { className: 'p-3 bg-emerald-50 rounded-lg border border-emerald-200' },
                    h('div', { className: 'font-bold text-emerald-800 mb-1' }, '✓ The good'),
                    h('ul', { className: 'space-y-1 list-disc list-inside' },
                      h('li', null, 'Real, evidence-based way to help people'),
                      h('li', null, 'Stable demand — every hospital and school needs nutrition staff'),
                      h('li', null, 'Diverse settings: clinical, community, public health, industry'),
                      h('li', null, 'Path to private practice + flexibility over time'),
                      h('li', null, 'Maine has a tight, supportive professional community')
                    )
                  ),
                  h('div', { className: 'p-3 bg-amber-50 rounded-lg border border-amber-200' },
                    h('div', { className: 'font-bold text-amber-900 mb-1' }, '⚠ The hard parts'),
                    h('ul', { className: 'space-y-1 list-disc list-inside' },
                      h('li', null, '7+ year path with a Master\'s requirement'),
                      h('li', null, 'Internship match is competitive (~50% match rate)'),
                      h('li', null, 'Entry pay ($50-65K) is modest for the education investment'),
                      h('li', null, 'Insurance coverage of nutrition counseling is uneven'),
                      h('li', null, 'Working with eating disorders requires emotional sustainability')
                    )
                  )
                )
              )
            ),
            view === 'ladder' && h('div', { className: 'space-y-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, 'RDN credential ladder — 2024 requirements'),
              CAREER_LADDER.map(function(c) {
                return h('div', { key: c.tier, className: 'bg-white rounded-2xl shadow border border-slate-300 p-4 flex items-start gap-4' },
                  h('div', { className: 'flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shadow' },
                    'T' + c.tier),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-1' },
                      h('div', { className: 'text-lg font-black text-slate-800' }, c.name),
                      h('div', { className: 'text-sm font-bold text-emerald-700' }, c.pay)
                    ),
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-slate-700 font-bold mb-1' }, c.time),
                    h('div', { className: 'text-sm text-slate-800 mb-2' }, c.what),
                    h('div', { className: 'text-xs text-slate-700' },
                      h('span', { className: 'font-bold text-slate-800' }, 'How to get there: '), c.how)
                  )
                );
              })
            ),
            view === 'roles' && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              ROLES.map(function(r, i) {
                return h('div', { key: i, className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                  h('div', { className: 'flex items-start gap-3 mb-2' },
                    h('span', { className: 'text-3xl flex-shrink-0', 'aria-hidden': true }, r.icon),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center justify-between flex-wrap gap-1' },
                        h('div', { className: 'font-black text-slate-800' }, r.name),
                        h('div', { className: 'font-mono text-xs text-emerald-700 font-bold' }, r.pay)
                      )
                    )
                  ),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, r.desc)
                );
              })
            ),
            view === 'maine' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-3' },
                h('h2', { className: 'text-xl font-black text-slate-800' }, 'Maine education programs'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  'Maine has a small but solid set of nutrition programs. The two main pathways are at UMaine (Orono) and Husson (Bangor).'),
                h('div', { className: 'space-y-3' },
                  [
                    { name: 'University of Maine — Human Nutrition + Foods', loc: 'Orono', what: 'B.S. Human Nutrition, ACEND-accredited DPD pathway. Strong agricultural-school context. Internships often through northeast hospital systems.', site: 'umaine.edu/foodsciencehumannutrition' },
                    { name: 'Husson University — Dietetics', loc: 'Bangor', what: 'B.S. + integrated DPD pathway. Smaller program, hands-on faculty. Combined Master\'s pathway expanding for the new 2024 RDN requirement.', site: 'husson.edu' },
                    { name: 'University of Southern Maine — Public Health', loc: 'Portland', what: 'Not RDN-track, but B.S. and M.P.H. options for those interested in public-health nutrition (food policy, community programming, epidemiology).', site: 'usm.maine.edu' },
                    { name: 'University of New England — Health Sciences', loc: 'Biddeford / Portland', what: 'M.S. Applied Nutrition (online program) — popular for working professionals adding the Master\'s required for the 2024 RDN exam.', site: 'online.une.edu' }
                  ].map(function(p, i) {
                    return h('div', { key: i, className: 'p-3 bg-slate-50 rounded-lg border border-slate-200' },
                      h('div', { className: 'flex items-center justify-between flex-wrap gap-1 mb-1' },
                        h('div', { className: 'font-bold text-slate-800' }, p.name),
                        h('div', { className: 'text-xs text-slate-700 font-mono' }, '📍 ' + p.loc)
                      ),
                      h('p', { className: 'text-sm text-slate-800 mb-1' }, p.what),
                      h('div', { className: 'text-[11px] text-blue-700 font-mono' }, p.site)
                    );
                  })
                )
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-4' },
                h('h3', { className: 'text-base font-black text-blue-900 mb-2' }, 'Other places to look'),
                h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                  h('li', null,
                    h('strong', null, 'Maine Academy of Nutrition and Dietetics '),
                    '(eatrightmaine.org) — state professional organization. Job board, mentorship, networking events.'),
                  h('li', null,
                    h('strong', null, 'Commission on Dietetic Registration '),
                    '(cdrnet.org) — official credentialing body. Practice exam information.'),
                  h('li', null,
                    h('strong', null, 'ACEND '),
                    '(eatrightpro.org/acend) — accreditation council. Lists every accredited DPD and DI program nationwide.'),
                  h('li', null,
                    h('strong', null, 'CareerCenter Maine '),
                    '(mainecareercenter.gov) — entry-level openings, often through WIC, hospitals, and school food programs.')
                )
              )
            ),
            h(TeacherNotes, {
              standards: ['CTE Health Sciences Pathway', 'Maine Career & Workforce Readiness', 'ACEND DPD Standards'],
              questions: [
                'The 2024 Master\'s requirement added a year (or more) to the RDN path. What\'s the argument for raising the bar? What\'s the argument that it deepens the inequity of who can become an RDN?',
                'Why is the term "nutritionist" unregulated in many states? What harms can come from that?',
                'A student wants to help people with eating disorders. What educational and credentialing path would you suggest, and what\'s the timeline?',
                'How might Maine\'s aging population, rural access challenges, and recent universal-school-meals law shape demand for nutrition professionals here over the next decade?'
              ],
              misconceptions: [
                '"You can just call yourself a nutritionist after watching some YouTube videos" — this is technically legal in many states, but it\'s not a regulated profession. The RDN credential is the regulated, evidence-based path.',
                '"All RDNs work in hospitals" — clinical RDN is the largest single setting but far from the only one. Public health, school food, sports, food industry, and private practice are all robust paths.',
                '"You have to love kale to be an RDN" — RDNs work with people of every dietary preference, religion, culture, and clinical condition. The job is meeting people where they are, not converting them to a specific diet.'
              ],
              extension: 'Look up one Maine RDN on LinkedIn or the Maine Academy of Nutrition and Dietetics website. Note: their educational path, current role, years of experience, any specialty certifications. Then write what stands out about that path.',
              sources: 'Commission on Dietetic Registration (cdrnet.org) · ACEND (eatrightpro.org/acend) · Maine Academy of Nutrition and Dietetics · UMaine Orono · Husson University · University of Southern Maine · University of New England · USDA · BLS Occupational Outlook Handbook for Dietitians and Nutritionists.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // STUB MODULES (none remaining; ComingSoon retained for safety)
      // ─────────────────────────────────────────────────────
      function ComingSoon(props) {
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: props.icon, title: props.title }),
          h('div', { className: 'p-6 max-w-3xl mx-auto' },
            h('div', { className: 'bg-white rounded-2xl shadow border-2 border-slate-300 p-8 text-center' },
              h('div', { className: 'text-6xl mb-4' }, '🌱'),
              h('h2', { className: 'text-2xl font-black text-slate-800 mb-2' }, 'Coming Soon'),
              h('p', { className: 'text-slate-700 leading-relaxed' }, props.desc),
              h('p', { className: 'text-xs text-slate-700 mt-4 italic' }, 'Ships in a future NutritionLab phase.')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // VIEW DISPATCH
      // ─────────────────────────────────────────────────────
      if (view === 'macroLab') return h(MacronutrientLab);
      if (view === 'microAtlas') return h(MicronutrientAtlas);
      if (view === 'labelReader') return h(FoodLabelReader);
      if (view === 'energyBalance') return h(EnergyMetabolismLab);
      if (view === 'digestion') return h(DigestionWalkthrough);
      if (view === 'myths') return h(NutritionMythsLab);
      if (view === 'foodMood') return h(FoodMoodLab);
      if (view === 'edAwareness') return h(EDAwareness);
      if (view === 'maineReality') return h(MaineFoodReality);
      if (view === 'careerPaths') return h(CareerPathwaysNutrition);
      return h(MainMenu);
    }
  });

})();

}
