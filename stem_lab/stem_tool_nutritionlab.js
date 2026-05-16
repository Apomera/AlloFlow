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

  // ══════════════════════════════════════════════════════════════════
  // ═══ MY NUTRITION KIT — personal evidence-based nutrition tools ═══
  // ══════════════════════════════════════════════════════════════════
  // 120+ module-scope React components for student-built nutrition habits.
  // Frame: PHYSIOLOGY-FIRST, NEVER calorie-counting or restriction.
  // Data persists via ctx.update (parent tool state). All client-side.
  // NEDA helpline (1-800-931-2237 / text NEDA to 741741) visible in any tool
  // that touches body image, restriction, or eating-disorder territory.
  // Sources cited inline per component: USDA, NIH ODS, AAP, Harvard T.H. Chan,
  // NEDA, NATA, ACSM, AHA, AHA Pediatrics, MyPlate.gov.
  // ══════════════════════════════════════════════════════════════════

  var R_NL = (typeof window !== 'undefined' && window.React) ? window.React : null;
  var nlH = R_NL ? R_NL.createElement : null;

  // Date helpers
  function nl_today() {
    var d = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function nl_daysAgo(iso) {
    if (!iso) return '';
    try {
      var then = new Date(iso); var now = new Date();
      var days = Math.floor((now - then) / 86400000);
      if (days === 0) return 'today';
      if (days === 1) return 'yesterday';
      if (days < 7) return days + 'd ago';
      if (days < 30) return Math.floor(days / 7) + 'w ago';
      if (days < 365) return Math.floor(days / 30) + 'mo ago';
      return Math.floor(days / 365) + 'y ago';
    } catch (e) { return ''; }
  }
  function nl_relDate(iso) { return nl_daysAgo(iso); }
  function nl_id() { return 'nl_' + Date.now() + '_' + Math.floor(Math.random() * 1000); }

  // Shared visual helpers — emerald/teal theme matches NutritionLab tool
  function nlCard(props, children) {
    var p = props || {};
    return nlH('div', { style: Object.assign({
      padding: 14, borderRadius: 12, background: '#fff',
      border: '1px solid #d1d5db', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      marginBottom: 10
    }, p.style || {}) }, children);
  }
  function nlBtn(props, label) {
    var p = props || {};
    var variant = p.variant || 'primary';
    var palette = {
      primary:   { bg: '#059669', color: '#fff',   border: '#047857' },
      secondary: { bg: '#fff',     color: '#0f766e', border: '#0d9488' },
      ghost:     { bg: '#f1f5f9',  color: '#334155', border: '#cbd5e1' },
      danger:    { bg: '#fee2e2',  color: '#991b1b', border: '#fecaca' },
      success:   { bg: '#dcfce7',  color: '#166534', border: '#86efac' },
      warning:   { bg: '#fef3c7',  color: '#78350f', border: '#fcd34d' }
    };
    var c = palette[variant] || palette.primary;
    return nlH('button', Object.assign({
      onClick: p.onClick,
      'aria-label': p['aria-label'] || label,
      style: Object.assign({
        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
        border: '1px solid ' + c.border, background: c.bg, color: c.color,
        cursor: 'pointer'
      }, p.style || {})
    }, p), label);
  }
  function nlInput(props) {
    var p = props || {};
    return nlH('input', Object.assign({
      type: p.type || 'text',
      value: p.value || '',
      onChange: p.onChange,
      placeholder: p.placeholder || '',
      'aria-label': p['aria-label'] || p.placeholder,
      style: Object.assign({
        width: '100%', padding: '8px 10px', borderRadius: 8,
        border: '1px solid #cbd5e1', fontSize: 13, color: '#0f172a',
        background: '#fff'
      }, p.style || {})
    }, p));
  }
  function nlTextarea(props) {
    var p = props || {};
    return nlH('textarea', {
      value: p.value || '',
      onChange: p.onChange,
      placeholder: p.placeholder || '',
      rows: p.rows || 3,
      'aria-label': p['aria-label'] || p.placeholder,
      style: Object.assign({
        width: '100%', padding: '8px 10px', borderRadius: 8,
        border: '1px solid #cbd5e1', fontSize: 13, color: '#0f172a',
        background: '#fff', resize: 'vertical', fontFamily: 'inherit'
      }, p.style || {})
    });
  }
  function nlSelect(props, options) {
    var p = props || {};
    return nlH('select', {
      value: p.value || '',
      onChange: p.onChange,
      'aria-label': p['aria-label'] || 'Select',
      style: Object.assign({
        padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
        fontSize: 13, color: '#0f172a', background: '#fff', cursor: 'pointer'
      }, p.style || {})
    }, (options || []).map(function(o) {
      return nlH('option', { key: o.value, value: o.value }, o.label);
    }));
  }
  function nlSection(title, subtitle, accent) {
    var c = accent || '#059669';
    return nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid ' + c + '30' } },
      nlH('div', { 'aria-hidden': 'true', style: {
        width: 4, height: 28, borderRadius: 4, background: c
      } }),
      nlH('div', { style: { flex: 1 } },
        nlH('div', { style: { fontSize: 15, fontWeight: 900, color: c } }, title),
        subtitle ? nlH('div', { style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, subtitle) : null
      )
    );
  }
  function nlEmpty(message) {
    return nlH('div', { style: {
      padding: 18, borderRadius: 10, background: '#f8fafc',
      border: '1px dashed #cbd5e1', textAlign: 'center',
      color: '#64748b', fontSize: 12, fontStyle: 'italic'
    } }, message);
  }
  function nlEvidenceFooter(text) {
    return nlH('div', { style: { marginTop: 14, padding: 10, borderRadius: 8, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.20)', fontSize: 11, color: '#0f172a', lineHeight: 1.6 } },
      nlH('strong', { style: { color: '#047857' } }, '🎓 Evidence base: '),
      text
    );
  }
  function nlBodyNote() {
    return nlH('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)', fontSize: 11, color: '#0f172a', lineHeight: 1.55, marginBottom: 12 } },
      nlH('strong', { style: { color: '#0f766e' } }, '💚 Body note: '),
      'This tool is about awareness, not control. No calorie targets, no good/bad food labels. If logging feels like restriction or you find yourself counting obsessively, take a break and talk with a trusted adult or NEDA at 1-800-931-2237.'
    );
  }
  function nlNEDABanner() {
    return nlH('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.30)', fontSize: 11, color: '#0f172a', lineHeight: 1.6, marginBottom: 12 } },
      nlH('strong', { style: { color: '#0f766e' } }, '💚 NEDA Helpline: '),
      'If you or a friend struggle with eating, body image, or restriction: call ',
      nlH('strong', null, '1-800-931-2237'),
      ' or text ',
      nlH('strong', null, 'NEDA'), ' to ', nlH('strong', null, '741741'),
      '. Free, confidential, no waiting.'
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 1: FOOD LOGGING / AWARENESS (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 1) PersonalMealLog — log meals (physiology + how meal made you feel)
  function PersonalMealLog(props) {
    if (!R_NL) return null;
    var data = props.data || { meals: [] };
    var setData = props.setData;
    var meals = data.meals || [];
    var fs = R_NL.useState({ name: '', when: 'breakfast', items: '', energy: 5, mood: 'neutral', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ meals: [n].concat(meals) });
      setForm({ name: '', when: 'breakfast', items: '', energy: 5, mood: 'neutral', notes: '' });
    }
    function remove(id) { setData({ meals: meals.filter(function(m) { return m.id !== id; }) }); }
    var when_opts = [
      { value: 'breakfast', label: '🌅 Breakfast' },
      { value: 'lunch', label: '🌞 Lunch' },
      { value: 'dinner', label: '🌇 Dinner' },
      { value: 'snack', label: '🍎 Snack' }
    ];
    var mood_opts = [
      { value: 'energized', label: '⚡ Energized' },
      { value: 'satisfied', label: '😌 Satisfied' },
      { value: 'neutral', label: '😐 Neutral' },
      { value: 'sluggish', label: '😴 Sluggish' },
      { value: 'still hungry', label: '😋 Still hungry' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Meal Log', 'Physiology-first awareness, never calorie-counting', '#059669'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Meal name (e.g., "Tuesday lunch")' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlSelect({ value: form.when, onChange: function(e) { setForm(Object.assign({}, form, { when: e.target.value })); } }, when_opts),
            nlSelect({ value: form.mood, onChange: function(e) { setForm(Object.assign({}, form, { mood: e.target.value })); } }, mood_opts)
          ),
          nlTextarea({ value: form.items, onChange: function(e) { setForm(Object.assign({}, form, { items: e.target.value })); }, placeholder: 'What did you eat? (just list — no judgment)', rows: 2 }),
          nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            nlH('span', { style: { fontSize: 12, color: '#475569', fontWeight: 700 } }, 'Energy after: '),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.energy, onChange: function(e) { setForm(Object.assign({}, form, { energy: parseInt(e.target.value) })); }, style: { flex: 1 } }),
            nlH('strong', { style: { color: '#059669', fontFamily: 'ui-monospace, Menlo, monospace' } }, form.energy + '/10')
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (optional)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log meal')
        )
      ),
      meals.length === 0
        ? nlEmpty('No meals logged yet. Logging builds awareness of what fuels you — not what to avoid.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            meals.slice(0, 30).map(function(m) {
              var moodColor = m.mood === 'energized' ? '#059669' : m.mood === 'sluggish' ? '#dc2626' : '#64748b';
              return nlH('div', { key: m.id, style: { padding: 10, borderRadius: 8, background: '#f8fafc', borderLeft: '3px solid #059669' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a' } }, m.name),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 8 } }, nl_relDate(m.date)),
                    nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#475569', marginBottom: 2 } }, (when_opts.find(function(o) { return o.value === m.when; }) || { label: m.when }).label),
                m.items ? nlH('div', { style: { fontSize: 11, color: '#334155', marginBottom: 4 } }, m.items) : null,
                nlH('div', { style: { display: 'flex', gap: 12, fontSize: 10 } },
                  nlH('span', { style: { color: moodColor, fontWeight: 700 } }, 'Mood: ' + m.mood),
                  nlH('span', { style: { color: '#475569', fontWeight: 700 } }, 'Energy: ' + m.energy + '/10')
                ),
                m.notes ? nlH('div', { style: { fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 4 } }, '💭 ' + m.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Intuitive Eating (Tribole & Resch, 2020) — meal awareness without restriction supports food-mood awareness and interoceptive trust over time.')
    );
  }

  // 2) PersonalHydrationTracker — daily fluid intake
  function PersonalHydrationTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], targetMl: 2500 };
    var setData = props.setData;
    var entries = data.entries || [];
    var targetMl = data.targetMl || 2500;
    var fs = R_NL.useState({ ml: 250, source: 'water' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.ml || form.ml <= 0) return;
      var e = { id: nl_id(), date: nl_today(), time: new Date().toISOString(), ml: form.ml, source: form.source };
      setData({ entries: [e].concat(entries), targetMl: targetMl });
      setForm({ ml: 250, source: 'water' });
    }
    function remove(id) { setData({ entries: entries.filter(function(x) { return x.id !== id; }), targetMl: targetMl }); }
    function setTarget(v) { setData({ entries: entries, targetMl: v }); }
    var today = nl_today();
    var todayEntries = entries.filter(function(x) { return x.date === today; });
    var todayMl = todayEntries.reduce(function(sum, x) { return sum + x.ml; }, 0);
    var pct = Math.min(100, Math.round(todayMl / targetMl * 100));
    var source_opts = [
      { value: 'water', label: '💧 Water' },
      { value: 'milk', label: '🥛 Milk' },
      { value: 'juice', label: '🧃 Juice' },
      { value: 'tea', label: '🍵 Tea' },
      { value: 'sports', label: '🥤 Sports drink' },
      { value: 'other', label: '🥤 Other' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Hydration Tracker', 'Daily fluid intake — body function, not body shape', '#0ea5e9'),
      nlCard({ style: { background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)', border: '1px solid #0284c7' } },
        nlH('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
          nlH('strong', { style: { fontSize: 16, color: '#075985' } }, 'Today: ' + todayMl + ' / ' + targetMl + ' mL'),
          nlH('span', { style: { fontSize: 12, color: '#0369a1', fontWeight: 700 } }, pct + '%')
        ),
        nlH('div', { style: { width: '100%', height: 14, borderRadius: 7, background: '#fff', border: '1px solid #bae6fd', overflow: 'hidden' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #38bdf8, #0284c7)', transition: 'width 0.3s' } })
        ),
        nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#0c4a6e' } },
          nlH('span', null, 'Daily target:'),
          nlH('input', { type: 'number', value: targetMl, onChange: function(e) { setTarget(parseInt(e.target.value) || 2500); }, style: { width: 80, padding: '3px 6px', borderRadius: 4, border: '1px solid #bae6fd', fontSize: 11 } }),
          nlH('span', null, 'mL (NAM AI: ~2700 for teen girls, ~3700 for teen boys)')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 } },
            nlH('input', { type: 'number', value: form.ml, onChange: function(e) { setForm(Object.assign({}, form, { ml: parseInt(e.target.value) || 0 })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlSelect({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); } }, source_opts)
          ),
          nlH('div', { style: { display: 'flex', gap: 4 } },
            [250, 500, 750, 1000].map(function(q) {
              return nlH('button', { key: q, onClick: function() { setForm(Object.assign({}, form, { ml: q })); }, style: { flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', background: form.ml === q ? '#dbeafe' : '#fff', color: '#0c4a6e', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, q + 'mL');
            })
          ),
          nlBtn({ onClick: add, variant: 'primary' }, '+ Log ' + form.ml + ' mL')
        )
      ),
      todayEntries.length > 0
        ? nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            nlH('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 8, marginBottom: 4 } }, "Today's entries"),
            todayEntries.map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 6, background: '#f0f9ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                nlH('span', { style: { fontSize: 12, color: '#0c4a6e' } }, (source_opts.find(function(o) { return o.value === e.source; }) || { label: e.source }).label + ' · ' + e.ml + ' mL'),
                nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
              );
            })
          )
        : nlEmpty('No fluid logged today. Tap a quick-amount button above to start.'),
      nlEvidenceFooter('NAM/IOM Adequate Intake values (Dietary Reference Intakes for Water). ACSM hydration position stand. Hydration as body function — never as appetite suppressant.')
    );
  }

  // 3) PersonalSnackLog — log snacks (separate from meals)
  function PersonalSnackLog(props) {
    if (!R_NL) return null;
    var data = props.data || { snacks: [] };
    var setData = props.setData;
    var snacks = data.snacks || [];
    var fs = R_NL.useState({ name: '', why: 'hungry', satisfied: true, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id(), date: nl_today(), time: new Date().toISOString() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ snacks: [n].concat(snacks) });
      setForm({ name: '', why: 'hungry', satisfied: true, notes: '' });
    }
    function remove(id) { setData({ snacks: snacks.filter(function(s) { return s.id !== id; }) }); }
    var why_opts = [
      { value: 'hungry', label: '🍴 Physically hungry' },
      { value: 'low-energy', label: '⚡ Energy low' },
      { value: 'pre-activity', label: '🏃 Pre-activity fuel' },
      { value: 'post-activity', label: '💪 Post-workout' },
      { value: 'social', label: '🤝 Social/shared' },
      { value: 'craving', label: '😋 Craving (no judgment)' },
      { value: 'bored', label: '🥱 Bored (worth noticing)' },
      { value: 'emotional', label: '💭 Emotional (worth noticing)' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Snack Log', 'Snacking is fuel, not failure', '#10b981'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'What was the snack? (no judgment)' }),
          nlSelect({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); } }, why_opts),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' } },
            nlH('input', { type: 'checkbox', checked: form.satisfied, onChange: function(e) { setForm(Object.assign({}, form, { satisfied: e.target.checked })); } }),
            nlH('span', null, 'Did it satisfy what I needed?')
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (optional)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log snack')
        )
      ),
      snacks.length === 0
        ? nlEmpty('No snacks logged. Snacks are normal fuel — especially for growing teens whose meal-to-meal energy needs are high.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            snacks.slice(0, 30).map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 8, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #10b981' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a' } }, s.name + (s.satisfied ? ' ✓' : '')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(s.date)),
                    nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#15803d' } }, (why_opts.find(function(o) { return o.value === s.why; }) || { label: s.why }).label),
                s.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + s.notes) : null
              );
            })
          ),
      nlEvidenceFooter('AAP guidance: snacking 2-3x daily is normal for adolescents whose growth + activity demand frequent fueling. Awareness of WHY (hunger/energy/emotion) is more useful than restriction.')
    );
  }

  // 4) PersonalSchoolLunchLog — track school lunches
  function PersonalSchoolLunchLog(props) {
    if (!R_NL) return null;
    var data = props.data || { lunches: [] };
    var setData = props.setData;
    var lunches = data.lunches || [];
    var fs = R_NL.useState({ source: 'school', menu: '', ate: 'most', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.menu.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ lunches: [n].concat(lunches) });
      setForm({ source: 'school', menu: '', ate: 'most', notes: '' });
    }
    function remove(id) { setData({ lunches: lunches.filter(function(l) { return l.id !== id; }) }); }
    var source_opts = [
      { value: 'school', label: '🏫 School cafeteria' },
      { value: 'packed', label: '🥪 Packed from home' },
      { value: 'bought-out', label: '🛍️ Bought (off campus)' },
      { value: 'skipped', label: '⏭️ Skipped' }
    ];
    var ate_opts = [
      { value: 'all', label: '🍽️ All' },
      { value: 'most', label: '🍴 Most' },
      { value: 'some', label: '🥄 Some' },
      { value: 'little', label: '🤏 Very little' },
      { value: 'none', label: '🚫 None' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My School Lunch Log', 'Track lunch source, what you ate, how it landed', '#0ea5e9'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlSelect({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); } }, source_opts),
          form.source !== 'skipped' ? nlInput({ value: form.menu, onChange: function(e) { setForm(Object.assign({}, form, { menu: e.target.value })); }, placeholder: 'What was on the menu?' }) : nlInput({ value: form.menu, onChange: function(e) { setForm(Object.assign({}, form, { menu: e.target.value })); }, placeholder: 'Why skipped? (optional)' }),
          form.source !== 'skipped' ? nlSelect({ value: form.ate, onChange: function(e) { setForm(Object.assign({}, form, { ate: e.target.value })); } }, ate_opts) : null,
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (rating, mood after, etc.)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log lunch')
        )
      ),
      lunches.length === 0
        ? nlEmpty('No lunches logged. Tracking helps you notice: pack vs buy patterns, what lands well, when you skip.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            lunches.slice(0, 30).map(function(l) {
              var bg = l.source === 'skipped' ? '#fef3c7' : '#f0f9ff';
              var bc = l.source === 'skipped' ? '#fcd34d' : '#bae6fd';
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: bg, borderLeft: '3px solid ' + (l.source === 'skipped' ? '#d97706' : '#0284c7') } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#0f172a' } }, (source_opts.find(function(o) { return o.value === l.source; }) || { label: l.source }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.menu ? nlH('div', { style: { fontSize: 11, color: '#334155', marginTop: 2 } }, l.menu) : null,
                l.source !== 'skipped' ? nlH('div', { style: { fontSize: 10, color: '#0c4a6e', marginTop: 2 } }, 'Ate: ' + (ate_opts.find(function(o) { return o.value === l.ate; }) || { label: l.ate }).label) : null,
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('USDA National School Lunch Program meets ⅓ of daily nutrition needs. Free/reduced eligibility = ~30M US students. Tracking helps you see your own patterns + advocate for menu improvements.')
    );
  }

  // 5) PersonalProteinIntake — teens often under-consume
  function PersonalProteinIntake(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], dailyTarget: 56 };
    var setData = props.setData;
    var entries = data.entries || [];
    var dailyTarget = data.dailyTarget || 56;
    var fs = R_NL.useState({ source: '', grams: 0 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim() || !form.grams) return;
      var e = { id: nl_id(), date: nl_today(), time: new Date().toISOString(), source: form.source, grams: form.grams };
      setData({ entries: [e].concat(entries), dailyTarget: dailyTarget });
      setForm({ source: '', grams: 0 });
    }
    function remove(id) { setData({ entries: entries.filter(function(x) { return x.id !== id; }), dailyTarget: dailyTarget }); }
    var today = nl_today();
    var todayG = entries.filter(function(x) { return x.date === today; }).reduce(function(sum, x) { return sum + (x.grams || 0); }, 0);
    var pct = Math.min(100, Math.round(todayG / dailyTarget * 100));
    var quick = [
      { name: 'Egg (1 large)', g: 6 },
      { name: 'Greek yogurt (6oz)', g: 17 },
      { name: 'Chicken (3oz)', g: 26 },
      { name: 'Beans (½ cup)', g: 8 },
      { name: 'Peanut butter (2T)', g: 7 },
      { name: 'Milk (1 cup)', g: 8 },
      { name: 'Salmon (3oz)', g: 22 },
      { name: 'Tofu (½ cup)', g: 10 }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Protein Tracker', 'Building blocks for growth, muscle repair, and immune function', '#be123c'),
      nlBodyNote(),
      nlCard({ style: { background: '#fef2f2', border: '1px solid #fecaca' } },
        nlH('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
          nlH('strong', { style: { fontSize: 16, color: '#9f1239' } }, 'Today: ' + todayG + ' / ' + dailyTarget + ' g'),
          nlH('span', { style: { fontSize: 12, color: '#be123c', fontWeight: 700 } }, pct + '%')
        ),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', overflow: 'hidden', border: '1px solid #fecaca' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #f43f5e, #be123c)' } })
        ),
        nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#9f1239' } },
          nlH('span', null, 'Daily target:'),
          nlH('input', { type: 'number', value: dailyTarget, onChange: function(e) { setData({ entries: entries, dailyTarget: parseInt(e.target.value) || 56 }); }, style: { width: 60, padding: '3px 6px', borderRadius: 4, border: '1px solid #fecaca', fontSize: 11 } }),
          nlH('span', null, 'g (RDA ~0.85 g/kg — teens: ~46g girls, ~52g boys; athletes: 1.2-1.7 g/kg)')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 } },
            nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Protein source' }),
            nlH('input', { type: 'number', value: form.grams, onChange: function(e) { setForm(Object.assign({}, form, { grams: parseInt(e.target.value) || 0 })); }, placeholder: 'g', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            quick.map(function(q) {
              return nlH('button', { key: q.name, onClick: function() { setForm({ source: q.name, grams: q.g }); }, style: { padding: '5px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#9f1239', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, q.name + ' (' + q.g + 'g)');
            })
          ),
          nlBtn({ onClick: add }, '+ Log protein')
        )
      ),
      entries.filter(function(x) { return x.date === today; }).length > 0 && nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 } },
        nlH('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Today'),
        entries.filter(function(x) { return x.date === today; }).map(function(e) {
          return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 6, background: '#fef2f2', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            nlH('span', { style: { color: '#9f1239' } }, e.source + ' — ' + e.grams + 'g'),
            nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
          );
        })
      ),
      nlEvidenceFooter('USDA/AAP: adolescent protein RDA 0.85 g/kg body weight, with athletes 1.2-1.7 g/kg (ISSN position). Protein is muscle/bone repair, immune function, and enzyme building — not "diet food" — and is best spread across all meals.')
    );
  }

  // 6) PersonalFiberLog — fiber awareness
  function PersonalFiberLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], dailyTarget: 28 };
    var setData = props.setData;
    var entries = data.entries || [];
    var dailyTarget = data.dailyTarget || 28;
    var fs = R_NL.useState({ source: '', grams: 0 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim() || !form.grams) return;
      var e = { id: nl_id(), date: nl_today(), source: form.source, grams: form.grams };
      setData({ entries: [e].concat(entries), dailyTarget: dailyTarget });
      setForm({ source: '', grams: 0 });
    }
    function remove(id) { setData({ entries: entries.filter(function(x) { return x.id !== id; }), dailyTarget: dailyTarget }); }
    var today = nl_today();
    var todayG = entries.filter(function(x) { return x.date === today; }).reduce(function(sum, x) { return sum + (x.grams || 0); }, 0);
    var pct = Math.min(100, Math.round(todayG / dailyTarget * 100));
    var quick = [
      { name: 'Apple', g: 4.4 }, { name: 'Banana', g: 3.1 }, { name: 'Raspberries (1 cup)', g: 8 },
      { name: 'Pear (with skin)', g: 5.5 }, { name: 'Broccoli (1 cup)', g: 5 },
      { name: 'Black beans (½ c)', g: 7.5 }, { name: 'Lentils (½ c)', g: 7.8 },
      { name: 'Oats (½ c dry)', g: 4 }, { name: 'Almonds (1 oz)', g: 4 },
      { name: 'Chia seeds (1T)', g: 4 }, { name: 'Sweet potato', g: 4 }, { name: 'Whole-wheat bread', g: 2 }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Fiber Tracker', 'Most Americans get half their recommended fiber', '#a16207'),
      nlBodyNote(),
      nlCard({ style: { background: '#fef3c7', border: '1px solid #fcd34d' } },
        nlH('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
          nlH('strong', { style: { fontSize: 16, color: '#78350f' } }, 'Today: ' + todayG.toFixed(1) + ' / ' + dailyTarget + ' g'),
          nlH('span', { style: { fontSize: 12, color: '#a16207', fontWeight: 700 } }, pct + '%')
        ),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', border: '1px solid #fcd34d', overflow: 'hidden' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #fbbf24, #a16207)' } })
        ),
        nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#78350f' } },
          nlH('span', null, 'Target:'),
          nlH('input', { type: 'number', value: dailyTarget, onChange: function(e) { setData({ entries: entries, dailyTarget: parseInt(e.target.value) || 28 }); }, style: { width: 60, padding: '3px 6px', borderRadius: 4, border: '1px solid #fcd34d', fontSize: 11 } }),
          nlH('span', null, 'g (DGA: 25g women, 38g men; 14g per 1000 kcal)')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 } },
            nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Fiber source' }),
            nlH('input', { type: 'number', step: '0.1', value: form.grams, onChange: function(e) { setForm(Object.assign({}, form, { grams: parseFloat(e.target.value) || 0 })); }, placeholder: 'g', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            quick.map(function(q) {
              return nlH('button', { key: q.name, onClick: function() { setForm({ source: q.name, grams: q.g }); }, style: { padding: '5px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fff', color: '#78350f', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, q.name + ' (' + q.g + 'g)');
            })
          ),
          nlBtn({ onClick: add }, '+ Log fiber source')
        )
      ),
      entries.filter(function(x) { return x.date === today; }).length > 0 && nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 } },
        nlH('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Today'),
        entries.filter(function(x) { return x.date === today; }).map(function(e) {
          return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 6, background: '#fef3c7', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            nlH('span', { style: { color: '#78350f' } }, e.source + ' — ' + e.grams + 'g'),
            nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
          );
        })
      ),
      nlEvidenceFooter('Dietary Guidelines for Americans + Harvard T.H. Chan: fiber feeds gut microbiome, slows glucose absorption, supports satiety. Only ~5% of Americans hit the daily target. Variety matters more than total — different plants feed different gut bacteria.')
    );
  }

  // 7) PersonalFruitVeggieDay — produce variety per week
  function PersonalFruitVeggieDay(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ name: '', kind: 'fruit', color: 'red', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ name: '', kind: 'fruit', color: 'red', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var kind_opts = [
      { value: 'fruit', label: '🍎 Fruit' },
      { value: 'vegetable', label: '🥬 Vegetable' }
    ];
    var color_opts = [
      { value: 'red', label: '🔴 Red' },
      { value: 'orange', label: '🟠 Orange/Yellow' },
      { value: 'green', label: '🟢 Green' },
      { value: 'blue', label: '🔵 Blue/Purple' },
      { value: 'white', label: '⚪ White/Brown' }
    ];
    // 7-day rainbow check
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekLogs = logs.filter(function(l) { return new Date(l.date) >= weekAgo; });
    var colorsThisWeek = {};
    weekLogs.forEach(function(l) { colorsThisWeek[l.color] = (colorsThisWeek[l.color] || 0) + 1; });
    var rainbowCount = Object.keys(colorsThisWeek).length;
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Eat-the-Rainbow Tracker', 'Variety > quantity — different plant colors = different phytonutrients', '#84cc16'),
      nlBodyNote(),
      nlCard({ style: { background: '#f7fee7', border: '1px solid #bef264' } },
        nlH('strong', { style: { fontSize: 14, color: '#3f6212' } }, '7-day rainbow check: ' + rainbowCount + '/5 colors'),
        nlH('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          color_opts.map(function(c) {
            var got = !!colorsThisWeek[c.value];
            return nlH('div', { key: c.value, style: { flex: 1, padding: 8, borderRadius: 8, background: got ? '#fff' : '#f1f5f9', border: '2px solid ' + (got ? '#84cc16' : '#cbd5e1'), textAlign: 'center', fontSize: 11, color: got ? '#365314' : '#94a3b8', fontWeight: 700 } },
              nlH('div', { style: { fontSize: 16 } }, c.label.split(' ')[0]),
              nlH('div', null, got ? (colorsThisWeek[c.value] + '×') : '—')
            );
          })
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Fruit/veggie name' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlSelect({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); } }, kind_opts),
            nlSelect({ value: form.color, onChange: function(e) { setForm(Object.assign({}, form, { color: e.target.value })); } }, color_opts)
          ),
          nlBtn({ onClick: add }, '+ Log produce')
        )
      ),
      logs.length === 0
        ? nlEmpty('No produce logged yet. The goal is VARIETY (rainbow), not total count — different colors deliver different phytonutrients.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#f7fee7', borderLeft: '3px solid #84cc16', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                nlH('div', null,
                  nlH('strong', { style: { fontSize: 12, color: '#0f172a' } }, l.name),
                  nlH('span', { style: { fontSize: 10, color: '#475569', marginLeft: 8 } }, (color_opts.find(function(o) { return o.value === l.color; }) || { label: l.color }).label),
                  nlH('span', { style: { fontSize: 10, color: '#64748b', marginLeft: 8 } }, nl_relDate(l.date))
                ),
                nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
              );
            })
          ),
      nlEvidenceFooter('Harvard T.H. Chan + WHO: 5+ servings/day produce linked to lower CVD/stroke risk. Color diversity matters because different phytochemicals (lycopene-red, beta-carotene-orange, anthocyanins-blue) protect different body systems.')
    );
  }

  // 8) PersonalCalciumLog — adolescent bone-building
  function PersonalCalciumLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], dailyTarget: 1300 };
    var setData = props.setData;
    var entries = data.entries || [];
    var dailyTarget = data.dailyTarget || 1300;
    var fs = R_NL.useState({ source: '', mg: 0 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim() || !form.mg) return;
      var e = { id: nl_id(), date: nl_today(), source: form.source, mg: form.mg };
      setData({ entries: [e].concat(entries), dailyTarget: dailyTarget });
      setForm({ source: '', mg: 0 });
    }
    function remove(id) { setData({ entries: entries.filter(function(x) { return x.id !== id; }), dailyTarget: dailyTarget }); }
    var today = nl_today();
    var todayMg = entries.filter(function(x) { return x.date === today; }).reduce(function(sum, x) { return sum + (x.mg || 0); }, 0);
    var pct = Math.min(100, Math.round(todayMg / dailyTarget * 100));
    var quick = [
      { name: 'Milk (8 oz)', mg: 300 }, { name: 'Yogurt (6 oz)', mg: 250 }, { name: 'Cheddar (1 oz)', mg: 200 },
      { name: 'Tofu firm (½ c)', mg: 250 }, { name: 'Almonds (1 oz)', mg: 75 }, { name: 'Sardines (3 oz w/bones)', mg: 325 },
      { name: 'Kale (1 c cooked)', mg: 95 }, { name: 'Fortified plant milk (1 c)', mg: 300 }, { name: 'Fortified OJ (8 oz)', mg: 350 }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Calcium Tracker', 'Adolescence = peak bone-building. Now matters for life.', '#94a3b8'),
      nlBodyNote(),
      nlCard({ style: { background: '#f8fafc', border: '1px solid #cbd5e1' } },
        nlH('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
          nlH('strong', { style: { fontSize: 16, color: '#334155' } }, 'Today: ' + todayMg + ' / ' + dailyTarget + ' mg'),
          nlH('span', { style: { fontSize: 12, color: '#475569', fontWeight: 700 } }, pct + '%')
        ),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', border: '1px solid #cbd5e1', overflow: 'hidden' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #94a3b8, #475569)' } })
        ),
        nlH('div', { style: { fontSize: 11, color: '#475569', marginTop: 8 } }, 'NIH ODS RDA for ages 9-18: 1300 mg/day (the highest of any age group)')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 } },
            nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Calcium source' }),
            nlH('input', { type: 'number', value: form.mg, onChange: function(e) { setForm(Object.assign({}, form, { mg: parseInt(e.target.value) || 0 })); }, placeholder: 'mg', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            quick.map(function(q) {
              return nlH('button', { key: q.name, onClick: function() { setForm({ source: q.name, mg: q.mg }); }, style: { padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, q.name + ' (' + q.mg + ')');
            })
          ),
          nlBtn({ onClick: add }, '+ Log calcium')
        )
      ),
      entries.filter(function(x) { return x.date === today; }).length > 0 && nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 } },
        nlH('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Today'),
        entries.filter(function(x) { return x.date === today; }).map(function(e) {
          return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 6, background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            nlH('span', { style: { color: '#334155' } }, e.source + ' — ' + e.mg + 'mg'),
            nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
          );
        })
      ),
      nlEvidenceFooter('NIH ODS + AAP: 90% of adult bone mass is built by age 18. Calcium intake during adolescence directly shapes peak bone mineral density and lifelong fracture/osteoporosis risk. Pair with vitamin D for absorption.')
    );
  }

  // 9) PersonalIronLog — for menstruating teens
  function PersonalIronLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], dailyTarget: 15, menstruating: false };
    var setData = props.setData;
    var entries = data.entries || [];
    var dailyTarget = data.dailyTarget || 15;
    var menstruating = !!data.menstruating;
    var fs = R_NL.useState({ source: '', mg: 0, withVitC: false });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim() || !form.mg) return;
      var e = { id: nl_id(), date: nl_today(), source: form.source, mg: form.mg, withVitC: form.withVitC };
      setData({ entries: [e].concat(entries), dailyTarget: dailyTarget, menstruating: menstruating });
      setForm({ source: '', mg: 0, withVitC: false });
    }
    function remove(id) { setData({ entries: entries.filter(function(x) { return x.id !== id; }), dailyTarget: dailyTarget, menstruating: menstruating }); }
    var today = nl_today();
    var todayMg = entries.filter(function(x) { return x.date === today; }).reduce(function(sum, x) { return sum + (x.mg || 0); }, 0);
    var pct = Math.min(100, Math.round(todayMg / dailyTarget * 100));
    var quick = [
      { name: 'Beef (3 oz)', mg: 2.5, heme: true }, { name: 'Chicken thigh', mg: 1.2, heme: true },
      { name: 'Spinach (1 c cooked)', mg: 6.4, heme: false }, { name: 'Lentils (½ c)', mg: 3.3, heme: false },
      { name: 'Black beans (½ c)', mg: 1.8, heme: false }, { name: 'Tofu (½ c)', mg: 3.4, heme: false },
      { name: 'Fortified cereal (1 c)', mg: 18, heme: false }, { name: 'Pumpkin seeds (1 oz)', mg: 2.5, heme: false }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Iron Tracker', 'Oxygen delivery, brain function, energy', '#7c2d12'),
      nlBodyNote(),
      nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: 12, fontSize: 12, color: '#78350f', fontWeight: 700 } },
        nlH('input', { type: 'checkbox', checked: menstruating, onChange: function(e) { setData({ entries: entries, dailyTarget: e.target.checked ? 15 : 11, menstruating: e.target.checked }); } }),
        nlH('span', null, 'I menstruate (adjusts target to 15mg/day vs 11mg)')
      ),
      nlCard({ style: { background: '#fef2f2', border: '1px solid #fecaca' } },
        nlH('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
          nlH('strong', { style: { fontSize: 16, color: '#7c2d12' } }, 'Today: ' + todayMg.toFixed(1) + ' / ' + dailyTarget + ' mg'),
          nlH('span', { style: { fontSize: 12, color: '#9a3412', fontWeight: 700 } }, pct + '%')
        ),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', border: '1px solid #fecaca', overflow: 'hidden' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #f87171, #7c2d12)' } })
        ),
        nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 8 } }, 'NIH ODS RDA: 11mg/day teen boys; 15mg/day teen girls (after menstruation begins). Up to 18mg/day for menstruating adults. Vegetarians need ~1.8× more (non-heme is less bioavailable).')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 } },
            nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Iron source' }),
            nlH('input', { type: 'number', step: '0.1', value: form.mg, onChange: function(e) { setForm(Object.assign({}, form, { mg: parseFloat(e.target.value) || 0 })); }, placeholder: 'mg', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' } },
            nlH('input', { type: 'checkbox', checked: form.withVitC, onChange: function(e) { setForm(Object.assign({}, form, { withVitC: e.target.checked })); } }),
            nlH('span', null, 'Eaten with vitamin C (citrus, peppers, etc.)? Boosts absorption.')
          ),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            quick.map(function(q) {
              return nlH('button', { key: q.name, onClick: function() { setForm({ source: q.name, mg: q.mg, withVitC: form.withVitC }); }, style: { padding: '5px 8px', borderRadius: 6, border: '1px solid ' + (q.heme ? '#fca5a5' : '#cbd5e1'), background: '#fff', color: q.heme ? '#7c2d12' : '#475569', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, q.name + ' (' + q.mg + ')' + (q.heme ? ' 🩸' : ''));
            })
          ),
          nlBtn({ onClick: add }, '+ Log iron source')
        )
      ),
      entries.filter(function(x) { return x.date === today; }).length > 0 && nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 } },
        nlH('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Today'),
        entries.filter(function(x) { return x.date === today; }).map(function(e) {
          return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 6, background: '#fef2f2', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            nlH('span', { style: { color: '#7c2d12' } }, e.source + ' — ' + e.mg + 'mg' + (e.withVitC ? ' (with vit C ✓)' : '')),
            nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
          );
        })
      ),
      nlEvidenceFooter('NIH ODS + AAP: iron deficiency is the #1 nutrient deficiency in the US. High-risk groups: menstruating teens, vegetarians, athletes. Iron-deficiency anemia presents with fatigue, attention problems (can mimic ADHD), and exercise intolerance.')
    );
  }

  // 10) PersonalOmega3Log — Maine fisheries angle
  function PersonalOmega3Log(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], weeklyTarget: 2 };
    var setData = props.setData;
    var entries = data.entries || [];
    var weeklyTarget = data.weeklyTarget || 2;
    var fs = R_NL.useState({ source: '', amount: '', servingType: 'fish' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim()) return;
      var e = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { e[k] = form[k]; });
      setData({ entries: [e].concat(entries), weeklyTarget: weeklyTarget });
      setForm({ source: '', amount: '', servingType: 'fish' });
    }
    function remove(id) { setData({ entries: entries.filter(function(x) { return x.id !== id; }), weeklyTarget: weeklyTarget }); }
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekFishMeals = entries.filter(function(e) { return new Date(e.date) >= weekAgo && e.servingType === 'fish'; }).length;
    var pct = Math.min(100, Math.round(weekFishMeals / weeklyTarget * 100));
    var serv_opts = [
      { value: 'fish', label: '🐟 Fatty fish meal' },
      { value: 'walnut', label: '🌰 Walnuts/flax (ALA)' },
      { value: 'supplement', label: '💊 Fish oil/algae supplement' },
      { value: 'fortified', label: '🥚 Omega-3 enriched (eggs, etc.)' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Omega-3 Tracker', 'Brain structure, heart rhythm, mood — Maine waters are an omega-3 powerhouse', '#0e7490'),
      nlBodyNote(),
      nlCard({ style: { background: '#ecfeff', border: '1px solid #67e8f9' } },
        nlH('strong', { style: { fontSize: 14, color: '#155e75' } }, 'This week: ' + weekFishMeals + ' / ' + weeklyTarget + ' fatty-fish meals'),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', overflow: 'hidden', marginTop: 6 } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #22d3ee, #0e7490)' } })
        ),
        nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 8 } }, 'AHA: 2 servings/week fatty fish (salmon, mackerel, sardines, herring). Vegan/no-fish: walnuts/flax/algae oil (~250-500 mg EPA+DHA/day).')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Omega-3 source (e.g., "Salmon dinner")' }),
          nlSelect({ value: form.servingType, onChange: function(e) { setForm(Object.assign({}, form, { servingType: e.target.value })); } }, serv_opts),
          nlInput({ value: form.amount, onChange: function(e) { setForm(Object.assign({}, form, { amount: e.target.value })); }, placeholder: 'Amount/portion (optional)' }),
          nlBtn({ onClick: add }, '+ Log omega-3 source')
        )
      ),
      entries.length === 0
        ? nlEmpty('No omega-3 logged yet. Maine fisheries (Atlantic salmon, mackerel, sardines) are a regional advantage.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 20).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#ecfeff', borderLeft: '3px solid #0e7490' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#155e75' } }, e.source),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#155e75' } }, (serv_opts.find(function(o) { return o.value === e.servingType; }) || { label: e.servingType }).label),
                e.amount ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, e.amount) : null
              );
            })
          ),
      nlEvidenceFooter('AHA + Harvard T.H. Chan: EPA + DHA (the long-chain omega-3s in fatty fish) support brain DHA, cardiac rhythm, and inflammation regulation. ALA (walnut/flax) is partially converted to EPA/DHA in the body. Maine fisheries are a sustainable, regional source.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 2: GOALS / HABITS (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 11) PersonalNutritionGoal — set SMART goals (Locke + Latham)
  function PersonalNutritionGoal(props) {
    if (!R_NL) return null;
    var data = props.data || { goals: [] };
    var setData = props.setData;
    var goals = data.goals || [];
    var fs = R_NL.useState({ goal: '', why: '', specific: '', measurable: '', deadline: '', status: 'active' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.goal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ goals: [n].concat(goals) });
      setForm({ goal: '', why: '', specific: '', measurable: '', deadline: '', status: 'active' });
    }
    function remove(id) { setData({ goals: goals.filter(function(g) { return g.id !== id; }) }); }
    function toggle(id) {
      setData({ goals: goals.map(function(g) { return g.id === id ? Object.assign({}, g, { status: g.status === 'done' ? 'active' : 'done' }) : g; }) });
    }
    var stat_color = { active: '#0ea5e9', done: '#059669', paused: '#a16207' };
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nutrition Goals', 'SMART goals built on Locke + Latham research', '#059669'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.goal, onChange: function(e) { setForm(Object.assign({}, form, { goal: e.target.value })); }, placeholder: 'Goal (e.g., "Eat fruit at breakfast 5x/week")' }),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Why this matters to ME' }),
          nlInput({ value: form.specific, onChange: function(e) { setForm(Object.assign({}, form, { specific: e.target.value })); }, placeholder: 'Specific action (what exactly)' }),
          nlInput({ value: form.measurable, onChange: function(e) { setForm(Object.assign({}, form, { measurable: e.target.value })); }, placeholder: 'How will I measure progress?' }),
          nlInput({ type: 'date', value: form.deadline, onChange: function(e) { setForm(Object.assign({}, form, { deadline: e.target.value })); } }),
          nlBtn({ onClick: add }, '+ Add SMART goal')
        )
      ),
      goals.length === 0
        ? nlEmpty('No goals yet. Goals work best when they are specific, your own, and reasonably challenging.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            goals.map(function(g) {
              return nlH('div', { key: g.id, style: { padding: 10, borderRadius: 8, background: g.status === 'done' ? '#dcfce7' : '#f0fdfa', borderLeft: '4px solid ' + stat_color[g.status] } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a', textDecoration: g.status === 'done' ? 'line-through' : 'none' } }, g.goal),
                  nlH('div', null,
                    nlH('button', { onClick: function() { toggle(g.id); }, style: { background: 'transparent', border: 'none', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 4 } }, g.status === 'done' ? '↺ Reopen' : '✓ Done'),
                    nlH('button', { onClick: function() { remove(g.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                g.why ? nlH('div', { style: { fontSize: 11, color: '#475569', fontStyle: 'italic', marginBottom: 2 } }, '💚 Why: ' + g.why) : null,
                g.specific ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, '🎯 What: ' + g.specific) : null,
                g.measurable ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, '📏 Measure: ' + g.measurable) : null,
                g.deadline ? nlH('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2 } }, '📅 By: ' + g.deadline) : null
              );
            })
          ),
      nlEvidenceFooter('Locke & Latham (2002) — specific + challenging goals outperform vague or easy ones. Self-determined goals (linked to YOUR why) sustain motivation longer than externally imposed ones (Deci & Ryan, SDT).')
    );
  }

  // 12) PersonalIfThenPlan — implementation intentions (Gollwitzer)
  function PersonalIfThenPlan(props) {
    if (!R_NL) return null;
    var data = props.data || { plans: [] };
    var setData = props.setData;
    var plans = data.plans || [];
    var fs = R_NL.useState({ trigger: '', action: '', context: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.trigger.trim() || !form.action.trim()) return;
      var n = { id: nl_id(), date: nl_today(), trigger: form.trigger, action: form.action, context: form.context };
      setData({ plans: [n].concat(plans) });
      setForm({ trigger: '', action: '', context: '' });
    }
    function remove(id) { setData({ plans: plans.filter(function(p) { return p.id !== id; }) }); }
    var examples = [
      { t: 'I sit down at lunch', a: "I'll fill ½ my tray with veggies first" },
      { t: 'I get home from school hungry', a: "I'll cut up an apple before I open any other food" },
      { t: 'My friends grab fast food', a: "I'll add a side of fruit/water" },
      { t: 'I feel emotional and want comfort', a: "I'll text someone I trust first, then decide what I want to eat" }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My If-Then Plans', 'Pre-decide behavior — Gollwitzer implementation intentions', '#0ea5e9'),
      nlBodyNote(),
      nlCard({ style: { background: '#e0f2fe', border: '1px solid #38bdf8' } },
        nlH('strong', { style: { fontSize: 12, color: '#075985', display: 'block', marginBottom: 6 } }, 'How if-then plans work'),
        nlH('div', { style: { fontSize: 12, color: '#075985', lineHeight: 1.6 } },
          'Decisions in the moment are exhausting. Pre-decide what you\'ll do when a specific trigger happens, and your brain auto-routes the behavior. Research shows if-then plans double goal-achievement rates.'
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.trigger, onChange: function(e) { setForm(Object.assign({}, form, { trigger: e.target.value })); }, placeholder: 'IF (situation/trigger)...' }),
          nlInput({ value: form.action, onChange: function(e) { setForm(Object.assign({}, form, { action: e.target.value })); }, placeholder: 'THEN I will...' }),
          nlInput({ value: form.context, onChange: function(e) { setForm(Object.assign({}, form, { context: e.target.value })); }, placeholder: 'Context/notes (optional)' }),
          nlBtn({ onClick: add }, '+ Add if-then plan')
        )
      ),
      nlCard({ style: { background: '#f0f9ff', border: '1px dashed #93c5fd' } },
        nlH('strong', { style: { fontSize: 11, color: '#075985', display: 'block', marginBottom: 6 } }, '💡 Examples (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          examples.map(function(ex, i) {
            return nlH('button', { key: i, onClick: function() { setForm({ trigger: ex.t, action: ex.a, context: '' }); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #bae6fd', background: '#fff', fontSize: 11, color: '#075985', cursor: 'pointer' } },
              nlH('strong', null, 'IF '), ex.t, nlH('strong', null, ' THEN '), ex.a
            );
          })
        )
      ),
      plans.length === 0
        ? nlEmpty('No if-then plans yet. Try one of the examples above to begin.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            plans.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#f0f9ff', borderLeft: '3px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('div', { style: { fontSize: 12, color: '#0f172a' } },
                    nlH('strong', { style: { color: '#0369a1' } }, 'IF '), p.trigger,
                    nlH('strong', { style: { color: '#0369a1' } }, ' THEN '), p.action
                  ),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                p.context ? nlH('div', { style: { fontSize: 10, color: '#475569', fontStyle: 'italic', marginTop: 4 } }, p.context) : null
              );
            })
          ),
      nlEvidenceFooter('Gollwitzer (1999): implementation intentions ("if X then Y" plans) double the rate at which behavioral goals are achieved compared to goal intentions alone. Works because it transfers behavior control from conscious deliberation to environmental cue.')
    );
  }

  // 13) PersonalHabitTracker — Lally 66-day average
  function PersonalHabitTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { habits: [] };
    var setData = props.setData;
    var habits = data.habits || [];
    var fs = R_NL.useState({ habit: '', target: 'daily' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.habit.trim()) return;
      var n = { id: nl_id(), date: nl_today(), habit: form.habit, target: form.target, log: {} };
      setData({ habits: [n].concat(habits) });
      setForm({ habit: '', target: 'daily' });
    }
    function remove(id) { setData({ habits: habits.filter(function(h) { return h.id !== id; }) }); }
    function check(id, day) {
      setData({ habits: habits.map(function(h) {
        if (h.id !== id) return h;
        var newLog = Object.assign({}, h.log || {});
        newLog[day] = !newLog[day];
        return Object.assign({}, h, { log: newLog });
      }) });
    }
    function streak(h) {
      var log = h.log || {};
      var cur = 0;
      for (var i = 0; i < 30; i++) {
        var d = new Date(); d.setDate(d.getDate() - i);
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        var iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        if (log[iso]) cur++; else break;
      }
      return cur;
    }
    var target_opts = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekdays', label: 'Weekdays' },
      { value: 'weekly', label: 'Weekly' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nutrition Habit Tracker', 'Habits form via repetition — Lally average 66 days', '#7c3aed'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.habit, onChange: function(e) { setForm(Object.assign({}, form, { habit: e.target.value })); }, placeholder: 'New habit (e.g., "1 glass of water with breakfast")' }),
          nlSelect({ value: form.target, onChange: function(e) { setForm(Object.assign({}, form, { target: e.target.value })); } }, target_opts),
          nlBtn({ onClick: add }, '+ Start habit')
        )
      ),
      habits.length === 0
        ? nlEmpty('No habits being tracked. Start with one small habit — micro is better than ambitious.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            habits.map(function(h) {
              var days = [];
              for (var i = 6; i >= 0; i--) {
                var d = new Date(); d.setDate(d.getDate() - i);
                var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                var iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
                days.push({ iso: iso, label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], done: !!(h.log || {})[iso] });
              }
              var s = streak(h);
              return nlH('div', { key: h.id, style: { padding: 10, borderRadius: 8, background: '#faf5ff', borderLeft: '4px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a' } }, h.habit),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 11, color: '#7c3aed', fontWeight: 700, marginRight: 6 } }, s > 0 ? '🔥 ' + s : '—'),
                    nlH('button', { onClick: function() { remove(h.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { display: 'flex', gap: 4, justifyContent: 'space-between' } },
                  days.map(function(d) {
                    return nlH('button', { key: d.iso, onClick: function() { check(h.id, d.iso); }, 'aria-label': d.iso + (d.done ? ' done' : ' incomplete'), style: { flex: 1, padding: 6, borderRadius: 6, border: '1px solid ' + (d.done ? '#7c3aed' : '#cbd5e1'), background: d.done ? '#7c3aed' : '#fff', color: d.done ? '#fff' : '#64748b', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                      d.label,
                      nlH('div', { style: { fontSize: 12 } }, d.done ? '✓' : '○')
                    );
                  })
                )
              );
            })
          ),
      nlEvidenceFooter('Lally et al. (2010): habit formation averages 66 days (range 18-254). Skipping a day does NOT reset; consistency over time matters more than streak perfection.')
    );
  }

  // 14) PersonalMicroHabit — Fogg tiny habits
  function PersonalMicroHabit(props) {
    if (!R_NL) return null;
    var data = props.data || { micros: [] };
    var setData = props.setData;
    var micros = data.micros || [];
    var fs = R_NL.useState({ anchor: '', behavior: '', celebration: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.behavior.trim() || !form.anchor.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ micros: [n].concat(micros) });
      setForm({ anchor: '', behavior: '', celebration: '' });
    }
    function remove(id) { setData({ micros: micros.filter(function(m) { return m.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Tiny Habits', 'Fogg Behavior Model: micro behavior + anchor + celebration', '#ec4899'),
      nlBodyNote(),
      nlCard({ style: { background: '#fdf2f8', border: '1px solid #f9a8d4' } },
        nlH('strong', { style: { fontSize: 12, color: '#9f1239', display: 'block', marginBottom: 6 } }, 'Tiny Habit recipe (Fogg)'),
        nlH('div', { style: { fontSize: 12, color: '#9f1239', lineHeight: 1.7 } },
          nlH('div', null, '1️⃣ ANCHOR: something you already do every day'),
          nlH('div', null, '2️⃣ BEHAVIOR: tiny version of the new habit (30 sec or less)'),
          nlH('div', null, '3️⃣ CELEBRATION: feel good immediately (creates a positive emotion to wire it in)')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.anchor, onChange: function(e) { setForm(Object.assign({}, form, { anchor: e.target.value })); }, placeholder: 'After I [anchor — e.g., "brush my teeth"]...' }),
          nlInput({ value: form.behavior, onChange: function(e) { setForm(Object.assign({}, form, { behavior: e.target.value })); }, placeholder: 'I will [tiny — e.g., "drink ½ glass of water"]' }),
          nlInput({ value: form.celebration, onChange: function(e) { setForm(Object.assign({}, form, { celebration: e.target.value })); }, placeholder: 'Then I will [celebrate — fist pump, "yes!", smile]' }),
          nlBtn({ onClick: add }, '+ Add tiny habit')
        )
      ),
      micros.length === 0
        ? nlEmpty('No tiny habits yet. Smaller is better. Goal: make the behavior so small you cannot fail.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            micros.map(function(m) {
              return nlH('div', { key: m.id, style: { padding: 10, borderRadius: 8, background: '#fdf2f8', borderLeft: '3px solid #ec4899' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a' } }, '🌱 Tiny habit recipe'),
                  nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#0f172a', marginBottom: 2 } }, nlH('strong', { style: { color: '#9f1239' } }, '1. AFTER '), m.anchor),
                nlH('div', { style: { fontSize: 11, color: '#0f172a', marginBottom: 2 } }, nlH('strong', { style: { color: '#9f1239' } }, '2. I WILL '), m.behavior),
                m.celebration ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, nlH('strong', { style: { color: '#9f1239' } }, '3. THEN '), m.celebration) : null
              );
            })
          ),
      nlEvidenceFooter('BJ Fogg, Tiny Habits (2019): tiny + frequent beats big + occasional. Anchor + behavior pairs into existing routines; celebration consolidates the habit via positive affect (Bandura, self-efficacy).')
    );
  }

  // 15) PersonalGoalLadder — break big goals into steps
  function PersonalGoalLadder(props) {
    if (!R_NL) return null;
    var data = props.data || { ladders: [] };
    var setData = props.setData;
    var ladders = data.ladders || [];
    var fs = R_NL.useState({ bigGoal: '', steps: ['','',''] });
    var form = fs[0]; var setForm = fs[1];
    function setStep(i, v) {
      var s = form.steps.slice(); s[i] = v;
      setForm(Object.assign({}, form, { steps: s }));
    }
    function addStepField() { setForm(Object.assign({}, form, { steps: form.steps.concat(['']) })); }
    function add() {
      if (!form.bigGoal.trim()) return;
      var n = { id: nl_id(), date: nl_today(), bigGoal: form.bigGoal, steps: form.steps.filter(function(s) { return s.trim(); }).map(function(s) { return { text: s, done: false }; }) };
      setData({ ladders: [n].concat(ladders) });
      setForm({ bigGoal: '', steps: ['','',''] });
    }
    function remove(id) { setData({ ladders: ladders.filter(function(l) { return l.id !== id; }) }); }
    function toggleStep(lid, sidx) {
      setData({ ladders: ladders.map(function(l) {
        if (l.id !== lid) return l;
        var ns = l.steps.slice(); ns[sidx] = Object.assign({}, ns[sidx], { done: !ns[sidx].done });
        return Object.assign({}, l, { steps: ns });
      }) });
    }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Goal Ladders', 'Break big nutrition goals into climbable steps', '#0d9488'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.bigGoal, onChange: function(e) { setForm(Object.assign({}, form, { bigGoal: e.target.value })); }, placeholder: 'Big goal (e.g., "Cook a meal from scratch each week")' }),
          form.steps.map(function(s, i) {
            return nlInput({ key: 'st' + i, value: s, onChange: function(e) { setStep(i, e.target.value); }, placeholder: 'Step ' + (i + 1) + ' (small + specific)' });
          }),
          nlBtn({ onClick: addStepField, variant: 'ghost' }, '+ Add step'),
          nlBtn({ onClick: add }, '+ Save ladder')
        )
      ),
      ladders.length === 0
        ? nlEmpty('No ladders yet. Climbing a ladder = stepping, one rung at a time. Don\'t skip rungs.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            ladders.map(function(l) {
              var done = (l.steps || []).filter(function(s) { return s.done; }).length;
              return nlH('div', { key: l.id, style: { padding: 10, borderRadius: 8, background: '#f0fdfa', borderLeft: '4px solid #0d9488' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a' } }, '🪜 ' + l.bigGoal),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 11, color: '#0d9488', fontWeight: 700, marginRight: 6 } }, done + '/' + (l.steps || []).length),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                  (l.steps || []).map(function(s, i) {
                    return nlH('label', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: 4, borderRadius: 4, cursor: 'pointer' } },
                      nlH('input', { type: 'checkbox', checked: s.done, onChange: function() { toggleStep(l.id, i); } }),
                      nlH('span', { style: { fontSize: 12, color: s.done ? '#94a3b8' : '#0f172a', textDecoration: s.done ? 'line-through' : 'none' } }, (i + 1) + '. ' + s.text)
                    );
                  })
                )
              );
            })
          ),
      nlEvidenceFooter('Bandura (self-efficacy theory): mastery experiences with progressively challenging subgoals build belief in personal capability faster than chasing one big distant target.')
    );
  }

  // 16) PersonalWeeklyIntention — weekly nutrition intention
  function PersonalWeeklyIntention(props) {
    if (!R_NL) return null;
    var data = props.data || { weeks: [] };
    var setData = props.setData;
    var weeks = data.weeks || [];
    var fs = R_NL.useState({ intention: '', actions: '', reward: '', reflection: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.intention.trim()) return;
      var n = { id: nl_id(), weekOf: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ weeks: [n].concat(weeks) });
      setForm({ intention: '', actions: '', reward: '', reflection: '' });
    }
    function remove(id) { setData({ weeks: weeks.filter(function(w) { return w.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Weekly Intention', 'Pick ONE thing per week. Less is more.', '#10b981'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.intention, onChange: function(e) { setForm(Object.assign({}, form, { intention: e.target.value })); }, placeholder: 'This week, my nutrition intention is...' }),
          nlTextarea({ value: form.actions, onChange: function(e) { setForm(Object.assign({}, form, { actions: e.target.value })); }, placeholder: 'Specific actions I\'ll take', rows: 2 }),
          nlInput({ value: form.reward, onChange: function(e) { setForm(Object.assign({}, form, { reward: e.target.value })); }, placeholder: 'How I\'ll mark following through (non-food reward)' }),
          nlBtn({ onClick: add }, '+ Save this week\'s intention')
        )
      ),
      weeks.length === 0
        ? nlEmpty('No weekly intentions yet. Pick ONE thing — that\'s the point.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            weeks.map(function(w) {
              return nlH('div', { key: w.id, style: { padding: 10, borderRadius: 8, background: '#ecfdf5', borderLeft: '4px solid #10b981' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#065f46' } }, '✨ ' + w.intention),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, 'wk of ' + w.weekOf),
                    nlH('button', { onClick: function() { remove(w.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                w.actions ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginBottom: 2 } }, '🎯 ' + w.actions) : null,
                w.reward ? nlH('div', { style: { fontSize: 11, color: '#065f46' } }, '🎉 ' + w.reward) : null
              );
            })
          ),
      nlEvidenceFooter('Hayes & ACT — values-based intentions (what matters to me this week) outperform external goals (what I should do) over time. One intention well-held beats five forgotten.')
    );
  }

  // 17) PersonalEnergyForGoal — connect nutrition to your goals
  function PersonalEnergyForGoal(props) {
    if (!R_NL) return null;
    var data = props.data || { connections: [] };
    var setData = props.setData;
    var connections = data.connections || [];
    var fs = R_NL.useState({ goal: '', need: '', foods: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.goal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ connections: [n].concat(connections) });
      setForm({ goal: '', need: '', foods: '' });
    }
    function remove(id) { setData({ connections: connections.filter(function(c) { return c.id !== id; }) }); }
    var examples = [
      { g: 'Run a 5K', n: 'Steady carb + electrolytes', f: 'Oatmeal, banana, water + pinch of salt' },
      { g: 'Crush my SAT', n: 'Brain glucose + omega-3 + iron', f: 'Whole-grain breakfast, salmon week of, no skipping' },
      { g: 'Get through musical hell-week', n: 'Frequent fueling, hydration', f: 'Pack snacks, refill water bottle 2× backstage' },
      { g: 'Build muscle for football', n: 'Protein every meal + post-workout', f: 'Chicken/eggs/yogurt rotation, peanut butter post-practice' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Fuel-for-Goals Map', 'What you want to do shapes what your body needs', '#f59e0b'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.goal, onChange: function(e) { setForm(Object.assign({}, form, { goal: e.target.value })); }, placeholder: 'My goal' }),
          nlInput({ value: form.need, onChange: function(e) { setForm(Object.assign({}, form, { need: e.target.value })); }, placeholder: 'What my body needs to do this' }),
          nlInput({ value: form.foods, onChange: function(e) { setForm(Object.assign({}, form, { foods: e.target.value })); }, placeholder: 'Foods that supply that' }),
          nlBtn({ onClick: add }, '+ Map goal to fuel')
        )
      ),
      nlCard({ style: { background: '#fef3c7', border: '1px dashed #fcd34d' } },
        nlH('strong', { style: { fontSize: 11, color: '#78350f', display: 'block', marginBottom: 6 } }, '💡 Examples (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          examples.map(function(ex, i) {
            return nlH('button', { key: i, onClick: function() { setForm({ goal: ex.g, need: ex.n, foods: ex.f }); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #fcd34d', background: '#fff', fontSize: 11, color: '#78350f', cursor: 'pointer' } },
              nlH('strong', null, ex.g + ': '), ex.n
            );
          })
        )
      ),
      connections.length === 0
        ? nlEmpty('Tap an example or build your own. The map gets clearer when "fuel" is in service of YOUR goals, not abstract health.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            connections.map(function(c) {
              return nlH('div', { key: c.id, style: { padding: 10, borderRadius: 8, background: '#fef3c7', borderLeft: '4px solid #f59e0b' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#78350f' } }, '🎯 ' + c.goal),
                  nlH('button', { onClick: function() { remove(c.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                c.need ? nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 2 } }, '⚙ Body needs: ' + c.need) : null,
                c.foods ? nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 2 } }, '🍴 Foods: ' + c.foods) : null
              );
            })
          ),
      nlEvidenceFooter('Self-Determination Theory (Deci & Ryan): autonomous motivation — choosing what matters to you and how to support it — sustains long-term change far better than externally imposed nutrition rules.')
    );
  }

  // 18) PersonalRoutineBuilder — meal-routine designer
  function PersonalRoutineBuilder(props) {
    if (!R_NL) return null;
    var data = props.data || { routines: { weekday: [], weekend: [] } };
    var setData = props.setData;
    var routines = data.routines || { weekday: [], weekend: [] };
    var ts = R_NL.useState('weekday'); var tab = ts[0]; var setTab = ts[1];
    var fs = R_NL.useState({ time: '07:00', meal: '', plan: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      var updated = Object.assign({}, routines);
      updated[tab] = [n].concat(updated[tab] || []).sort(function(a, b) { return a.time.localeCompare(b.time); });
      setData({ routines: updated });
      setForm({ time: '07:00', meal: '', plan: '' });
    }
    function remove(id) {
      var updated = Object.assign({}, routines);
      updated[tab] = (updated[tab] || []).filter(function(r) { return r.id !== id; });
      setData({ routines: updated });
    }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Meal Routine', 'A loose schedule beats no schedule — your body likes patterns', '#84cc16'),
      nlBodyNote(),
      nlH('div', { style: { display: 'flex', gap: 6, marginBottom: 10 } },
        ['weekday','weekend'].map(function(t) {
          return nlH('button', { key: t, onClick: function() { setTab(t); }, style: { flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', background: tab === t ? '#84cc16' : '#fff', color: tab === t ? '#fff' : '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, t === 'weekday' ? '📚 Weekday' : '🌳 Weekend');
        })
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 } },
            nlH('input', { type: 'time', value: form.time, onChange: function(e) { setForm(Object.assign({}, form, { time: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal/snack name' })
          ),
          nlInput({ value: form.plan, onChange: function(e) { setForm(Object.assign({}, form, { plan: e.target.value })); }, placeholder: 'What I usually eat (rough — not rigid)' }),
          nlBtn({ onClick: add }, '+ Add to ' + tab + ' routine')
        )
      ),
      (routines[tab] || []).length === 0
        ? nlEmpty('No ' + tab + ' routine items yet. Start with breakfast.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            (routines[tab] || []).map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '3px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '🕒 ' + r.time + ' — ' + r.meal),
                  nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                r.plan ? nlH('div', { style: { fontSize: 11, color: '#3f6212' } }, '🍴 ' + r.plan) : null
              );
            })
          ),
      nlEvidenceFooter('Circadian rhythm research: regular meal timing supports glucose regulation, sleep, mood, and athletic performance. Looseness > rigidity — eat earlier on early-start days, later on lazy days.')
    );
  }

  // 19) PersonalChallenge30Day — opt-in nutrition challenges
  function PersonalChallenge30Day(props) {
    if (!R_NL) return null;
    var data = props.data || { challenges: [] };
    var setData = props.setData;
    var challenges = data.challenges || [];
    var fs = R_NL.useState({ challenge: '', startDate: nl_today(), log: {} });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.challenge.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ challenges: [n].concat(challenges) });
      setForm({ challenge: '', startDate: nl_today(), log: {} });
    }
    function remove(id) { setData({ challenges: challenges.filter(function(c) { return c.id !== id; }) }); }
    function toggleDay(cid, dayIso) {
      setData({ challenges: challenges.map(function(c) {
        if (c.id !== cid) return c;
        var newLog = Object.assign({}, c.log || {});
        newLog[dayIso] = !newLog[dayIso];
        return Object.assign({}, c, { log: newLog });
      }) });
    }
    var presets = [
      'Drink a glass of water before each meal for 30 days',
      'Eat a piece of fruit at breakfast for 30 days',
      'Pack a homemade lunch 3x/week for 30 days',
      'Eat protein at every meal for 30 days',
      'Try 1 new vegetable per week for 30 days',
      'No phone during dinner for 30 days (eat mindfully)'
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My 30-Day Challenges', 'Opt-in challenges for testing habits — never punishment', '#06b6d4'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.challenge, onChange: function(e) { setForm(Object.assign({}, form, { challenge: e.target.value })); }, placeholder: 'Challenge name' }),
          nlH('input', { type: 'date', value: form.startDate, onChange: function(e) { setForm(Object.assign({}, form, { startDate: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
          nlBtn({ onClick: add }, '+ Start challenge')
        )
      ),
      nlCard({ style: { background: '#ecfeff', border: '1px dashed #67e8f9' } },
        nlH('strong', { style: { fontSize: 11, color: '#155e75', display: 'block', marginBottom: 6 } }, '💡 Suggestion bank (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          presets.map(function(p, i) {
            return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { challenge: p })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #67e8f9', background: '#fff', fontSize: 11, color: '#155e75', cursor: 'pointer' } }, p);
          })
        )
      ),
      challenges.length === 0
        ? nlEmpty('No active challenges. Challenges are tests, not requirements — pick one only if it sparks curiosity.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            challenges.map(function(c) {
              var startMs = new Date(c.startDate).getTime();
              var daysCompleted = Object.keys(c.log || {}).filter(function(d) { return (c.log || {})[d]; }).length;
              var pct = Math.round(daysCompleted / 30 * 100);
              var days = [];
              for (var i = 0; i < 30; i++) {
                var d = new Date(startMs + i * 86400000);
                var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                var iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
                days.push({ iso: iso, n: i + 1, done: !!(c.log || {})[iso] });
              }
              return nlH('div', { key: c.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #06b6d4' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#0e7490' } }, '⚡ ' + c.challenge),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 11, color: '#0e7490', fontWeight: 700, marginRight: 6 } }, daysCompleted + '/30 (' + pct + '%)'),
                    nlH('button', { onClick: function() { remove(c.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 3 } },
                  days.map(function(d) {
                    return nlH('button', { key: d.iso, onClick: function() { toggleDay(c.id, d.iso); }, 'aria-label': 'Day ' + d.n + (d.done ? ' done' : ''), style: { aspectRatio: '1/1', padding: 0, borderRadius: 3, border: '1px solid ' + (d.done ? '#06b6d4' : '#cbd5e1'), background: d.done ? '#06b6d4' : '#fff', color: d.done ? '#fff' : '#94a3b8', fontSize: 9, fontWeight: 700, cursor: 'pointer' } }, d.n);
                  })
                )
              );
            })
          ),
      nlEvidenceFooter('Behavioral activation research: time-bound challenges with concrete outcomes generate enough novelty + accountability to test whether a behavior actually fits your life. Missing days does NOT reset — perfection isn\'t the point.')
    );
  }

  // 20) PersonalConsistencyTracker — track consistency, not perfection
  function PersonalConsistencyTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ aim: '', followed: 'yes', context: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.aim.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ aim: '', followed: 'yes', context: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var followed_opts = [
      { value: 'yes', label: '✓ Yes' },
      { value: 'mostly', label: '🟡 Mostly' },
      { value: 'partial', label: '🟠 Partial' },
      { value: 'no', label: '✗ No (and that\'s ok)' }
    ];
    var thirty = entries.slice(0, 30);
    var yesCount = thirty.filter(function(e) { return e.followed === 'yes' || e.followed === 'mostly'; }).length;
    var consistency = thirty.length > 0 ? Math.round(yesCount / thirty.length * 100) : 0;
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Consistency Tracker', 'Show up, even imperfectly — that\'s the win', '#0d9488'),
      nlBodyNote(),
      nlCard({ style: { background: '#f0fdfa', border: '1px solid #5eead4' } },
        nlH('strong', { style: { fontSize: 14, color: '#0f766e' } }, 'Last 30 days: ' + consistency + '% consistency'),
        nlH('div', { style: { width: '100%', height: 10, borderRadius: 5, background: '#fff', overflow: 'hidden', marginTop: 6 } },
          nlH('div', { style: { width: consistency + '%', height: '100%', background: 'linear-gradient(90deg, #14b8a6, #0d9488)' } })
        ),
        nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 6 } }, 'Not 100% is healthy. Perfectionism is a risk factor for disordered eating.')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.aim, onChange: function(e) { setForm(Object.assign({}, form, { aim: e.target.value })); }, placeholder: 'What I was aiming for today' }),
          nlSelect({ value: form.followed, onChange: function(e) { setForm(Object.assign({}, form, { followed: e.target.value })); } }, followed_opts),
          nlInput({ value: form.context, onChange: function(e) { setForm(Object.assign({}, form, { context: e.target.value })); }, placeholder: 'Context (no judgment — just notes)' }),
          nlBtn({ onClick: add }, '+ Log today')
        )
      ),
      entries.length === 0
        ? nlEmpty('Log daily. The "not 100%" days are data, not failure.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              var colors = { yes: '#dcfce7', mostly: '#fef9c3', partial: '#fed7aa', no: '#f3f4f6' };
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: colors[e.followed] || '#f8fafc' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('div', { style: { fontSize: 12, color: '#0f172a' } }, nlH('strong', null, e.aim), nlH('span', { style: { marginLeft: 8, fontSize: 11, color: '#475569' } }, (followed_opts.find(function(o) { return o.value === e.followed; }) || { label: '' }).label)),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.context ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, e.context) : null
              );
            })
          ),
      nlEvidenceFooter('Habits research (Lally, Duhigg): 80% consistency >> 100% then burnout. Self-compassion research (Neff): being kind to yourself after a "miss" predicts faster return to the habit than self-criticism.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 3: BODY LISTENING / MINDFUL EATING (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 21) PersonalHungerLog — hunger scale tracking
  function PersonalHungerLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ when: 'pre-meal', hunger: 5, location: '', cue: 'stomach', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today(), time: new Date().toISOString() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ when: 'pre-meal', hunger: 5, location: '', cue: 'stomach', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var scale = [
      { n: 1, label: 'Painfully empty' }, { n: 2, label: 'Very hungry' },
      { n: 3, label: 'Hungry' }, { n: 4, label: 'A little hungry' },
      { n: 5, label: 'Neutral' }, { n: 6, label: 'Slightly satisfied' },
      { n: 7, label: 'Satisfied' }, { n: 8, label: 'Comfortably full' },
      { n: 9, label: 'Stuffed' }, { n: 10, label: 'Painfully full' }
    ];
    var when_opts = [
      { value: 'pre-meal', label: '⏰ Before eating' },
      { value: 'mid-meal', label: '🍴 Middle of eating' },
      { value: 'post-meal', label: '✅ After eating' },
      { value: 'standalone', label: '🤔 Random check-in' }
    ];
    var cue_opts = [
      { value: 'stomach', label: '🍽️ Stomach (growling, empty)' },
      { value: 'energy', label: '⚡ Energy low' },
      { value: 'concentration', label: '🧠 Hard to think/focus' },
      { value: 'mood', label: '😤 Mood (irritable, "hangry")' },
      { value: 'mouth', label: '👅 Mouth (taste/craving)' },
      { value: 'clock', label: '🕒 Clock said so' },
      { value: 'social', label: '🤝 Social cue (others eating)' },
      { value: 'emotional', label: '💭 Emotional' }
    ];
    var sliderColor = function(h) {
      if (h <= 3) return '#dc2626';
      if (h <= 5) return '#f59e0b';
      if (h <= 7) return '#10b981';
      return '#0ea5e9';
    };
    var color = sliderColor(form.hunger);
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Hunger Log', 'Read your body — interoceptive awareness builds with practice', '#ec4899'),
      nlBodyNote(),
      nlCard({ style: { background: '#fdf2f8', border: '1px solid #fbcfe8' } },
        nlH('strong', { style: { fontSize: 12, color: '#9f1239', display: 'block', marginBottom: 6 } }, 'Hunger/fullness scale (1-10)'),
        nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, marginBottom: 6 } },
          scale.map(function(s) {
            return nlH('div', { key: s.n, style: { padding: 4, borderRadius: 3, background: s.n === form.hunger ? color : '#fff', color: s.n === form.hunger ? '#fff' : '#475569', fontSize: 9, textAlign: 'center', fontWeight: 700 } }, s.n);
          })
        ),
        nlH('div', { style: { fontSize: 11, color: color, fontWeight: 800, textAlign: 'center' } }, form.hunger + ': ' + (scale.find(function(s) { return s.n === form.hunger; }) || { label: '' }).label)
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlSelect({ value: form.when, onChange: function(e) { setForm(Object.assign({}, form, { when: e.target.value })); } }, when_opts),
          nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            nlH('span', { style: { fontSize: 12, color: '#475569', fontWeight: 700 } }, 'Hunger:'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.hunger, onChange: function(e) { setForm(Object.assign({}, form, { hunger: parseInt(e.target.value) })); }, style: { flex: 1 } }),
            nlH('strong', { style: { color: color } }, form.hunger + '/10')
          ),
          nlSelect({ value: form.cue, onChange: function(e) { setForm(Object.assign({}, form, { cue: e.target.value })); } }, cue_opts),
          nlInput({ value: form.location, onChange: function(e) { setForm(Object.assign({}, form, { location: e.target.value })); }, placeholder: 'Where am I? (optional)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'What does my body feel like? (optional)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log hunger check')
        )
      ),
      logs.length === 0
        ? nlEmpty('No hunger check-ins. Body cues get clearer with practice — start with 1-2 daily.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              var c = sliderColor(l.hunger);
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fdf2f8', borderLeft: '4px solid ' + c } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('div', { style: { fontSize: 12, color: '#0f172a' } },
                    nlH('strong', { style: { color: c } }, l.hunger + '/10'),
                    ' · ', (when_opts.find(function(o) { return o.value === l.when; }) || { label: l.when }).label
                  ),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#9f1239', marginTop: 2 } }, 'Cue: ' + (cue_opts.find(function(o) { return o.value === l.cue; }) || { label: l.cue }).label),
                l.location ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, '📍 ' + l.location) : null,
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Tribole & Resch (Intuitive Eating, 2020): the hunger-fullness scale is a tool for rebuilding interoceptive awareness — the ability to read internal body signals. Most adolescents have it disrupted by years of external food rules.')
    );
  }

  // 22) PersonalFullnessLog — fullness scale (paired with hunger)
  function PersonalFullnessLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ meal: '', fullness: 7, eatingSpeed: 'normal', satisfaction: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today(), time: new Date().toISOString() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ meal: '', fullness: 7, eatingSpeed: 'normal', satisfaction: 5, notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var speed_opts = [
      { value: 'rushed', label: '⚡ Rushed' },
      { value: 'normal', label: '🚶 Normal pace' },
      { value: 'slow', label: '🐢 Slow / paced' }
    ];
    var fullnessLabel = function(f) {
      if (f <= 3) return 'Still hungry';
      if (f <= 5) return 'Less hungry';
      if (f === 6 || f === 7) return 'Satisfied';
      if (f === 8) return 'Comfortably full';
      return 'Overfull';
    };
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Fullness Log', 'Where did I stop? How did it land?', '#a855f7'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal/snack name' }),
          nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fdf4ff', border: '1px solid #e9d5ff' } },
            nlH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b21a8', fontWeight: 700, marginBottom: 4 } },
              nlH('span', null, 'Fullness when I stopped:'),
              nlH('span', null, form.fullness + '/10 — ' + fullnessLabel(form.fullness))
            ),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.fullness, onChange: function(e) { setForm(Object.assign({}, form, { fullness: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlSelect({ value: form.eatingSpeed, onChange: function(e) { setForm(Object.assign({}, form, { eatingSpeed: e.target.value })); } }, speed_opts),
          nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fdf4ff', border: '1px solid #e9d5ff' } },
            nlH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b21a8', fontWeight: 700, marginBottom: 4 } },
              nlH('span', null, 'Did this meal satisfy me?'),
              nlH('span', null, form.satisfaction + '/10')
            ),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.satisfaction, onChange: function(e) { setForm(Object.assign({}, form, { satisfaction: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'What did I want that I got/didn\'t get? (optional)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log fullness check')
        )
      ),
      logs.length === 0
        ? nlEmpty('Stopping at full + satisfied is a skill. Logging post-meal builds that skill.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fdf4ff', borderLeft: '3px solid #a855f7' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#6b21a8' } }, l.meal),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { display: 'flex', gap: 12, fontSize: 10, color: '#6b21a8', marginTop: 4 } },
                  nlH('span', null, 'Full: ' + l.fullness + '/10 (' + fullnessLabel(l.fullness) + ')'),
                  nlH('span', null, 'Satisfied: ' + l.satisfaction + '/10')
                ),
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Mindful eating research (Kristeller): satisfaction (taste, comfort, fullness, emotional ease) is a richer signal than fullness alone. Eating without satisfaction often drives later cravings or restriction-binge cycles.')
    );
  }

  // 23) PersonalCravingsJournal — explore cravings without judgment
  function PersonalCravingsJournal(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ craving: '', intensity: 5, time: '', emotion: '', acted: 'yes', satisfied: 'yes', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.craving.trim()) return;
      var n = { id: nl_id(), date: nl_today(), entryTime: new Date().toISOString() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ craving: '', intensity: 5, time: '', emotion: '', acted: 'yes', satisfied: 'yes', notes: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var acted_opts = [
      { value: 'yes', label: '✓ Ate it' },
      { value: 'modified', label: '🌿 Modified version' },
      { value: 'waited', label: '⏳ Waited (still craved)' },
      { value: 'no', label: '✗ Didn\'t eat' }
    ];
    var sat_opts = [
      { value: 'yes', label: '😌 Yes, it satisfied' },
      { value: 'partial', label: '🟡 Partly' },
      { value: 'no', label: '😞 No, still wanted more' },
      { value: 'na', label: '— N/A' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Cravings Journal', 'Curiosity over judgment — cravings are information', '#f97316'),
      nlBodyNote(),
      nlCard({ style: { background: '#fff7ed', border: '1px solid #fdba74' } },
        nlH('strong', { style: { fontSize: 12, color: '#9a3412', display: 'block', marginBottom: 4 } }, 'Why log cravings?'),
        nlH('div', { style: { fontSize: 11, color: '#7c2d12', lineHeight: 1.6 } },
          'Cravings tell you something — sometimes hunger, sometimes mood, sometimes habit, sometimes social cues, sometimes restriction backlash. Patterns become visible only when you log them without trying to fix them.'
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.craving, onChange: function(e) { setForm(Object.assign({}, form, { craving: e.target.value })); }, placeholder: 'What I craved' }),
          nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            nlH('span', { style: { fontSize: 12, color: '#9a3412', fontWeight: 700 } }, 'Intensity:'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.intensity, onChange: function(e) { setForm(Object.assign({}, form, { intensity: parseInt(e.target.value) })); }, style: { flex: 1 } }),
            nlH('strong', { style: { color: '#9a3412' } }, form.intensity + '/10')
          ),
          nlInput({ value: form.time, onChange: function(e) { setForm(Object.assign({}, form, { time: e.target.value })); }, placeholder: 'Time of day (optional)' }),
          nlInput({ value: form.emotion, onChange: function(e) { setForm(Object.assign({}, form, { emotion: e.target.value })); }, placeholder: 'What I was feeling (optional)' }),
          nlSelect({ value: form.acted, onChange: function(e) { setForm(Object.assign({}, form, { acted: e.target.value })); } }, acted_opts),
          nlSelect({ value: form.satisfied, onChange: function(e) { setForm(Object.assign({}, form, { satisfied: e.target.value })); } }, sat_opts),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'What I noticed', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log craving')
        )
      ),
      entries.length === 0
        ? nlEmpty('Log cravings without judgment. Patterns reveal themselves over weeks of data.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#fff7ed', borderLeft: '3px solid #f97316' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7c2d12' } }, '🌟 ' + e.craving + ' (' + e.intensity + '/10)'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.emotion ? nlH('div', { style: { fontSize: 10, color: '#7c2d12', marginTop: 2 } }, '💭 ' + e.emotion + (e.time ? ' · ' + e.time : '')) : null,
                nlH('div', { style: { fontSize: 10, color: '#9a3412', marginTop: 2 } }, 'Action: ' + (acted_opts.find(function(o) { return o.value === e.acted; }) || { label: e.acted }).label + ' · Satisfied: ' + (sat_opts.find(function(o) { return o.value === e.satisfied; }) || { label: e.satisfied }).label),
                e.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, '📝 ' + e.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Restriction-rebound research: forbidden foods become more desirable; permission paradoxically reduces preoccupation. Linehan (DBT urge surfing): cravings are time-limited waves — observing without judgment reduces their power.')
    );
  }

  // 24) PersonalEmotionEatingLog — emotional eating awareness
  function PersonalEmotionEatingLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ emotion: '', whatHelped: 'food', food: '', alternative: '', regret: 3 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.emotion.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ emotion: '', whatHelped: 'food', food: '', alternative: '', regret: 3 });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var emotion_chips = [
      'Stressed', 'Anxious', 'Sad', 'Angry', 'Bored', 'Lonely', 'Tired',
      'Overwhelmed', 'Happy', 'Celebrating', 'Frustrated', 'Empty'
    ];
    var helped_opts = [
      { value: 'food', label: '🍽️ Food' },
      { value: 'distraction', label: '📱 Distraction' },
      { value: 'movement', label: '🏃 Movement' },
      { value: 'connection', label: '🤝 Talking to someone' },
      { value: 'rest', label: '💤 Rest' },
      { value: 'nothing', label: '😶 Nothing really helped' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Emotion + Eating Log', 'Notice the link — without making it a problem', '#dc2626'),
      nlBodyNote(),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fee2e2', border: '1px solid #fecaca', marginBottom: 12, fontSize: 11, color: '#7f1d1d', lineHeight: 1.55 } },
        nlH('strong', null, 'Heads-up: '),
        'Emotional eating is normal and human. The goal here is awareness, not elimination. If you find food is the ONLY tool for managing feelings, that\'s a signal to add other tools — not to restrict eating.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.emotion, onChange: function(e) { setForm(Object.assign({}, form, { emotion: e.target.value })); }, placeholder: 'What emotion was I feeling?' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            emotion_chips.map(function(em) {
              return nlH('button', { key: em, onClick: function() { setForm(Object.assign({}, form, { emotion: em })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #fecaca', background: form.emotion === em ? '#fee2e2' : '#fff', fontSize: 10, color: '#7f1d1d', fontWeight: 700, cursor: 'pointer' } }, em);
            })
          ),
          nlSelect({ value: form.whatHelped, onChange: function(e) { setForm(Object.assign({}, form, { whatHelped: e.target.value })); } }, helped_opts),
          form.whatHelped === 'food' ? nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'What I ate' }) : null,
          nlInput({ value: form.alternative, onChange: function(e) { setForm(Object.assign({}, form, { alternative: e.target.value })); }, placeholder: 'What else might have helped (optional)' }),
          nlH('div', { style: { padding: 8, borderRadius: 6, background: '#fef2f2' } },
            nlH('div', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700, marginBottom: 4 } }, 'How I felt about it after: ' + form.regret + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.regret, onChange: function(e) { setForm(Object.assign({}, form, { regret: parseInt(e.target.value) })); }, style: { width: '100%' } }),
            nlH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7f1d1d' } },
              nlH('span', null, '1 = peaceful'),
              nlH('span', null, '10 = strongly self-critical')
            )
          ),
          nlBtn({ onClick: add }, '+ Log emotion + eating')
        )
      ),
      entries.length === 0
        ? nlEmpty('No entries yet. Logging emotion + food builds the awareness that everyone eats emotionally sometimes.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#fef2f2', borderLeft: '3px solid #dc2626' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7f1d1d' } }, '💭 ' + e.emotion),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#7f1d1d', marginTop: 2 } }, 'Helped: ' + (helped_opts.find(function(o) { return o.value === e.whatHelped; }) || { label: e.whatHelped }).label + (e.food ? ' (' + e.food + ')' : '')),
                e.alternative ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, '💡 Alt: ' + e.alternative) : null,
                nlH('div', { style: { fontSize: 10, color: '#9a3412', marginTop: 2 } }, 'Felt-after: ' + e.regret + '/10')
              );
            })
          ),
      nlEvidenceFooter('Emotional eating is not pathology by itself (Macht 2008). It becomes a concern only when it\'s the dominant coping tool. Building a "coping menu" with food as one option (not all options) is the evidence-based path.')
    );
  }

  // 25) PersonalMindfulEatingPractice — guided meal exercise
  function PersonalMindfulEatingPractice(props) {
    if (!R_NL) return null;
    var data = props.data || { sessions: [] };
    var setData = props.setData;
    var sessions = data.sessions || [];
    var ss = R_NL.useState({ active: false, step: 0, food: '' });
    var session = ss[0]; var setSession = ss[1];
    var rs = R_NL.useState({ noticed: '', taste: '', enjoyed: 5 });
    var reflect = rs[0]; var setReflect = rs[1];
    var steps = [
      { icon: '👀', title: 'Look', prompt: 'Look at your food. Notice colors, textures, shape. As if you\'d never seen this food before.' },
      { icon: '👃', title: 'Smell', prompt: 'Bring the food close. What does it smell like? Sweet, savory, sour, salty?' },
      { icon: '🤲', title: 'Touch', prompt: 'Notice the texture in your hand or on the fork. Cool? Warm? Crunchy? Soft?' },
      { icon: '👅', title: 'First bite', prompt: 'Take a small first bite. Don\'t chew immediately. Let it sit. What flavor comes first?' },
      { icon: '😌', title: 'Slow chew', prompt: 'Chew slowly. 15-20 times if you can. Notice how the flavor changes.' },
      { icon: '🤔', title: 'Check-in', prompt: 'Pause. How does your body feel? Still hungry? Satisfied? What\'s the urge to continue?' }
    ];
    function start() { setSession({ active: true, step: 0, food: session.food }); setReflect({ noticed: '', taste: '', enjoyed: 5 }); }
    function next() {
      if (session.step < steps.length - 1) setSession(Object.assign({}, session, { step: session.step + 1 }));
      else finish();
    }
    function finish() {
      var n = { id: nl_id(), date: nl_today(), food: session.food };
      Object.keys(reflect).forEach(function(k) { n[k] = reflect[k]; });
      setData({ sessions: [n].concat(sessions) });
      setSession({ active: false, step: 0, food: '' });
      setReflect({ noticed: '', taste: '', enjoyed: 5 });
    }
    function cancel() { setSession({ active: false, step: 0, food: '' }); }
    if (session.active) {
      var s = steps[session.step];
      return nlH('div', { style: { padding: 14 } },
        nlSection('🌿 Mindful Eating — In Session', 'Step ' + (session.step + 1) + ' of ' + steps.length, '#14b8a6'),
        nlCard({ style: { background: '#f0fdfa', border: '2px solid #14b8a6', padding: 20 } },
          nlH('div', { style: { fontSize: 48, textAlign: 'center', marginBottom: 12 } }, s.icon),
          nlH('h3', { style: { fontSize: 18, fontWeight: 900, color: '#0f766e', margin: 0, marginBottom: 8, textAlign: 'center' } }, s.title),
          nlH('p', { style: { fontSize: 14, color: '#0f172a', lineHeight: 1.6, margin: 0, textAlign: 'center' } }, s.prompt)
        ),
        session.step === steps.length - 1 ? nlCard(null,
          nlH('strong', { style: { fontSize: 13, color: '#0f766e', display: 'block', marginBottom: 8 } }, 'Quick reflection'),
          nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            nlInput({ value: reflect.noticed, onChange: function(e) { setReflect(Object.assign({}, reflect, { noticed: e.target.value })); }, placeholder: 'What I noticed about my body' }),
            nlInput({ value: reflect.taste, onChange: function(e) { setReflect(Object.assign({}, reflect, { taste: e.target.value })); }, placeholder: 'Flavors that stood out' }),
            nlH('div', { style: { fontSize: 11, color: '#475569' } }, 'How much did I enjoy this practice? ' + reflect.enjoyed + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: reflect.enjoyed, onChange: function(e) { setReflect(Object.assign({}, reflect, { enjoyed: parseInt(e.target.value) })); } })
          )
        ) : null,
        nlH('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
          nlBtn({ onClick: cancel, variant: 'ghost', style: { flex: 1 } }, 'End early'),
          nlBtn({ onClick: next, variant: 'primary', style: { flex: 2 } }, session.step === steps.length - 1 ? 'Finish + save' : 'Next →')
        )
      );
    }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Mindful Eating Practice', '6-step guided mini-session — pair with a snack or first bite', '#14b8a6'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('strong', { style: { fontSize: 13, color: '#0f766e' } }, 'Start a mindful eating practice'),
          nlInput({ value: session.food, onChange: function(e) { setSession(Object.assign({}, session, { food: e.target.value })); }, placeholder: 'What are you about to eat?' }),
          nlBtn({ onClick: start, variant: 'primary' }, '🌿 Begin 6-step practice (~5 min)')
        )
      ),
      sessions.length > 0 && nlH('div', { style: { marginTop: 12 } },
        nlH('strong', { style: { fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Past sessions'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 } },
          sessions.slice(0, 10).map(function(s) {
            return nlH('div', { key: s.id, style: { padding: 8, borderRadius: 8, background: '#f0fdfa', borderLeft: '3px solid #14b8a6' } },
              nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                nlH('strong', { style: { fontSize: 12, color: '#0f766e' } }, '🌿 ' + (s.food || 'mindful practice')),
                nlH('span', { style: { fontSize: 10, color: '#64748b' } }, nl_relDate(s.date))
              ),
              s.noticed ? nlH('div', { style: { fontSize: 10, color: '#0f172a', marginTop: 2 } }, '🧘 ' + s.noticed) : null,
              s.taste ? nlH('div', { style: { fontSize: 10, color: '#0f766e', marginTop: 2 } }, '👅 ' + s.taste) : null,
              nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, 'Enjoyed: ' + s.enjoyed + '/10')
            );
          })
        )
      ),
      nlEvidenceFooter('Kristeller & Wolever (MB-EAT): mindful-eating intervention reduces binge episodes and emotional eating, increases satisfaction with smaller portions. Slow, sensory engagement reconnects you with internal cues.')
    );
  }

  // 26) PersonalSatisfactionScale — meal satisfaction rating
  function PersonalSatisfactionScale(props) {
    if (!R_NL) return null;
    var data = props.data || { ratings: [] };
    var setData = props.setData;
    var ratings = data.ratings || [];
    var fs = R_NL.useState({ meal: '', taste: 5, texture: 5, temperature: 5, ease: 5, fullness: 5, joy: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      n.total = form.taste + form.texture + form.temperature + form.ease + form.fullness + form.joy;
      setData({ ratings: [n].concat(ratings) });
      setForm({ meal: '', taste: 5, texture: 5, temperature: 5, ease: 5, fullness: 5, joy: 5, notes: '' });
    }
    function remove(id) { setData({ ratings: ratings.filter(function(r) { return r.id !== id; }) }); }
    var dims = [
      { key: 'taste', label: '👅 Taste' },
      { key: 'texture', label: '✋ Texture' },
      { key: 'temperature', label: '🌡 Temperature' },
      { key: 'ease', label: '⚡ How easily I ate it (no rush?)' },
      { key: 'fullness', label: '🍽️ Comfortable fullness' },
      { key: 'joy', label: '😌 Joy/connection' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Satisfaction Scale', '6 dimensions — far richer than "did I eat enough"', '#84cc16'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal' }),
          dims.map(function(d) {
            return nlH('div', { key: d.key, style: { padding: 6, borderRadius: 6, background: '#f7fee7' } },
              nlH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#3f6212', fontWeight: 700, marginBottom: 4 } },
                nlH('span', null, d.label),
                nlH('span', null, form[d.key] + '/10')
              ),
              nlH('input', { type: 'range', min: 1, max: 10, value: form[d.key], onChange: function(e) {
                var newForm = Object.assign({}, form); newForm[d.key] = parseInt(e.target.value);
                setForm(newForm);
              }, style: { width: '100%' } })
            );
          }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Rate this meal')
        )
      ),
      ratings.length === 0
        ? nlEmpty('No ratings yet. Each meal is data about what truly satisfies you.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            ratings.slice(0, 20).map(function(r) {
              var avg = (r.total / 6).toFixed(1);
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '⭐ ' + r.meal + ' — avg ' + avg + '/10'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(r.date)),
                    nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, color: '#3f6212' } },
                  dims.map(function(d) {
                    return nlH('span', { key: d.key }, d.label.split(' ')[0] + ' ' + r[d.key]);
                  })
                ),
                r.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, r.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Intuitive Eating (Tribole & Resch) "satisfaction principle": pleasure is core, not optional. The 6 dimensions widen attention beyond fullness alone — what truly satisfies you guides what you want more of.')
    );
  }

  // 27) PersonalBodyCheckIn — how does your body feel?
  function PersonalBodyCheckIn(props) {
    if (!R_NL) return null;
    var data = props.data || { checkins: [] };
    var setData = props.setData;
    var checkins = data.checkins || [];
    var fs = R_NL.useState({ energy: 5, mood: 5, hunger: 5, focus: 5, anxiety: 3, gi: 'ok', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today(), time: new Date().toISOString() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ checkins: [n].concat(checkins) });
      setForm({ energy: 5, mood: 5, hunger: 5, focus: 5, anxiety: 3, gi: 'ok', notes: '' });
    }
    function remove(id) { setData({ checkins: checkins.filter(function(c) { return c.id !== id; }) }); }
    var sliders = [
      { key: 'energy', label: '⚡ Energy', color: '#f59e0b' },
      { key: 'mood', label: '😊 Mood', color: '#10b981' },
      { key: 'hunger', label: '🍽 Hunger', color: '#ec4899' },
      { key: 'focus', label: '🧠 Focus', color: '#3b82f6' },
      { key: 'anxiety', label: '⚠ Anxiety/stress', color: '#dc2626' }
    ];
    var gi_opts = [
      { value: 'great', label: '😄 Great' },
      { value: 'ok', label: '🙂 OK' },
      { value: 'off', label: '😐 Off' },
      { value: 'bad', label: '😞 Bloated/painful' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Body Check-In', 'Quick read of how my body feels right now', '#06b6d4'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          sliders.map(function(s) {
            return nlH('div', { key: s.key },
              nlH('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: s.color, fontWeight: 700, marginBottom: 2 } },
                nlH('span', null, s.label),
                nlH('span', null, form[s.key] + '/10')
              ),
              nlH('input', { type: 'range', min: 1, max: 10, value: form[s.key], onChange: function(e) {
                var newForm = Object.assign({}, form); newForm[s.key] = parseInt(e.target.value);
                setForm(newForm);
              }, style: { width: '100%' } })
            );
          }),
          nlH('div', { style: { marginTop: 4 } },
            nlH('div', { style: { fontSize: 11, color: '#06b6d4', fontWeight: 700, marginBottom: 4 } }, '🦠 Digestion'),
            nlSelect({ value: form.gi, onChange: function(e) { setForm(Object.assign({}, form, { gi: e.target.value })); } }, gi_opts)
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Other sensations (optional)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save check-in')
        )
      ),
      checkins.length === 0
        ? nlEmpty('No body check-ins. Quick 30-second checks build awareness over time.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            checkins.slice(0, 20).map(function(c) {
              return nlH('div', { key: c.id, style: { padding: 8, borderRadius: 8, background: '#ecfeff', borderLeft: '3px solid #06b6d4' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('div', { style: { fontSize: 12, color: '#0e7490' } },
                    nlH('strong', null, 'E ' + c.energy + ' · M ' + c.mood + ' · H ' + c.hunger + ' · F ' + c.focus + ' · A ' + c.anxiety)
                  ),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(c.date)),
                    nlH('button', { onClick: function() { remove(c.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#0e7490', marginTop: 2 } }, 'GI: ' + (gi_opts.find(function(o) { return o.value === c.gi; }) || { label: c.gi }).label),
                c.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, c.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Interoception research (Khalsa et al.): the ability to perceive internal body signals is a learnable skill. Body check-ins build this capacity — especially valuable for adolescents and neurodivergent learners with disrupted interoceptive awareness.')
    );
  }

  // 28) PersonalDigestionLog — track GI symptoms
  function PersonalDigestionLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ symptom: '', severity: 3, possibleTrigger: '', timing: 'after-meal', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.symptom.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ symptom: '', severity: 3, possibleTrigger: '', timing: 'after-meal', notes: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var symptom_chips = ['Bloating', 'Gas', 'Cramping', 'Heartburn', 'Nausea', 'Diarrhea', 'Constipation', 'Stomach pain', 'Reflux', 'Fullness too long'];
    var timing_opts = [
      { value: 'before-meal', label: 'Before eating' },
      { value: 'during-meal', label: 'While eating' },
      { value: 'after-meal', label: 'After eating' },
      { value: 'overnight', label: 'Overnight/morning' },
      { value: 'random', label: 'Random' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Digestion Log', 'Track GI signals to spot patterns', '#a3e635'),
      nlBodyNote(),
      nlH('div', { style: { padding: 8, borderRadius: 6, background: '#f0fdf4', border: '1px solid #86efac', marginBottom: 12, fontSize: 11, color: '#166534' } },
        nlH('strong', null, '⚕ Note: '),
        'For ongoing GI symptoms (>2 weeks), see a doctor — could be allergy, intolerance, IBS, celiac, IBD, or stress-related. Self-tracking + medical advice work together.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.symptom, onChange: function(e) { setForm(Object.assign({}, form, { symptom: e.target.value })); }, placeholder: 'Symptom' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            symptom_chips.map(function(c) {
              return nlH('button', { key: c, onClick: function() { setForm(Object.assign({}, form, { symptom: c })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #86efac', background: form.symptom === c ? '#dcfce7' : '#fff', fontSize: 10, color: '#166534', fontWeight: 700, cursor: 'pointer' } }, c);
            })
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4 } }, 'Severity: ' + form.severity + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.severity, onChange: function(e) { setForm(Object.assign({}, form, { severity: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlSelect({ value: form.timing, onChange: function(e) { setForm(Object.assign({}, form, { timing: e.target.value })); } }, timing_opts),
          nlInput({ value: form.possibleTrigger, onChange: function(e) { setForm(Object.assign({}, form, { possibleTrigger: e.target.value })); }, placeholder: 'Possible trigger (food, stress, lack of sleep, etc.)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log digestion entry')
        )
      ),
      entries.length === 0
        ? nlEmpty('No entries. Logging helps spot patterns — share with doctor if symptoms persist.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#166534' } }, '🦠 ' + e.symptom + ' (' + e.severity + '/10)'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#166534', marginTop: 2 } }, 'Timing: ' + (timing_opts.find(function(o) { return o.value === e.timing; }) || { label: e.timing }).label),
                e.possibleTrigger ? nlH('div', { style: { fontSize: 10, color: '#166534', marginTop: 2 } }, '⚠ Trigger: ' + e.possibleTrigger) : null,
                e.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, e.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Symptom logs are diagnostic gold for GI specialists. Brings 2-3 weeks of data to your doctor visit — they\'ll appreciate it. Stress, sleep, and meal pacing affect GI as much as specific foods.')
    );
  }

  // 29) PersonalEnergyLevelLog — energy after meals
  function PersonalEnergyLevelLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ meal: '', preEnergy: 5, postEnergy: 5, hoursLater: 1, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ meal: '', preEnergy: 5, postEnergy: 5, hoursLater: 1, notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Energy-After-Meals Log', 'Track which meals leave you energized vs sluggish', '#fbbf24'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#92400e', fontWeight: 700, marginBottom: 4 } }, 'Energy BEFORE: ' + form.preEnergy + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.preEnergy, onChange: function(e) { setForm(Object.assign({}, form, { preEnergy: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#92400e', fontWeight: 700, marginBottom: 4 } }, 'Energy AFTER: ' + form.postEnergy + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.postEnergy, onChange: function(e) { setForm(Object.assign({}, form, { postEnergy: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#92400e', fontWeight: 700, marginBottom: 4 } }, 'Measured ' + form.hoursLater + ' hour(s) after eating'),
            nlH('input', { type: 'range', min: 0.5, max: 4, step: 0.5, value: form.hoursLater, onChange: function(e) { setForm(Object.assign({}, form, { hoursLater: parseFloat(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (any context)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log energy change')
        )
      ),
      logs.length === 0
        ? nlEmpty('No energy logs. Tracking pre/post energy reveals which meals fuel you best for what activities.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 20).map(function(l) {
              var delta = l.postEnergy - l.preEnergy;
              var dColor = delta > 0 ? '#10b981' : delta < 0 ? '#dc2626' : '#64748b';
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fef3c7', borderLeft: '3px solid #fbbf24' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#78350f' } }, '⚡ ' + l.meal),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 2 } }, l.preEnergy + ' → ' + l.postEnergy + ' (' + (delta >= 0 ? '+' : '') + delta + ') at ' + l.hoursLater + 'hr'),
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Postprandial energy and glycemic response vary individually (Personalized Nutrition research, Zeevi et al. 2015). Mixed meals with fiber + protein + fat generally sustain energy better than refined carbs alone — but YOUR body is the data.')
    );
  }

  // 30) PersonalMoodAfterMeal — mood-food connection
  function PersonalMoodAfterMeal(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ meal: '', preMood: 5, postMood: 5, dominantEmotion: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ meal: '', preMood: 5, postMood: 5, dominantEmotion: '', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var em_chips = ['calm', 'energized', 'satisfied', 'happy', 'neutral', 'guilty', 'anxious', 'meh', 'irritable'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Mood-After-Meal Log', 'Notice the link between food and mood', '#a855f7'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#6b21a8', fontWeight: 700, marginBottom: 4 } }, 'Mood BEFORE: ' + form.preMood + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.preMood, onChange: function(e) { setForm(Object.assign({}, form, { preMood: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#6b21a8', fontWeight: 700, marginBottom: 4 } }, 'Mood AFTER: ' + form.postMood + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.postMood, onChange: function(e) { setForm(Object.assign({}, form, { postMood: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.dominantEmotion, onChange: function(e) { setForm(Object.assign({}, form, { dominantEmotion: e.target.value })); }, placeholder: 'Dominant emotion after' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            em_chips.map(function(e) {
              return nlH('button', { key: e, onClick: function() { setForm(Object.assign({}, form, { dominantEmotion: e })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #e9d5ff', background: form.dominantEmotion === e ? '#f3e8ff' : '#fff', fontSize: 10, color: '#6b21a8', fontWeight: 700, cursor: 'pointer' } }, e);
            })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log mood + meal')
        )
      ),
      logs.length === 0
        ? nlEmpty('No mood-meal logs. Over weeks, patterns emerge — guilt around foods often signals diet-culture conditioning, not the food itself.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 20).map(function(l) {
              var delta = l.postMood - l.preMood;
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fdf4ff', borderLeft: '3px solid #a855f7' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#6b21a8' } }, '💭 ' + l.meal),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, 'Mood ' + l.preMood + ' → ' + l.postMood + (delta !== 0 ? ' (' + (delta > 0 ? '+' : '') + delta + ')' : '') + (l.dominantEmotion ? ' · ' + l.dominantEmotion : '')),
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Food-mood research (Harvard T.H. Chan): patterns matter more than single meals. Persistent mood-drops after eating may signal blood-sugar volatility, food sensitivity, or — most commonly — diet-culture guilt (worth examining).')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 4: COOKING / SKILLS (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 31) PersonalRecipeBox — save go-to recipes
  function PersonalRecipeBox(props) {
    if (!R_NL) return null;
    var data = props.data || { recipes: [] };
    var setData = props.setData;
    var recipes = data.recipes || [];
    var fs = R_NL.useState({ name: '', cuisine: '', time: '30', servings: 2, ingredients: '', steps: '', tags: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    var vs = R_NL.useState(null); var view = vs[0]; var setView = vs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ recipes: [n].concat(recipes) });
      setForm({ name: '', cuisine: '', time: '30', servings: 2, ingredients: '', steps: '', tags: '', notes: '' });
    }
    function remove(id) { setData({ recipes: recipes.filter(function(r) { return r.id !== id; }) }); }
    if (view) {
      var r = recipes.find(function(x) { return x.id === view; });
      if (!r) { setView(null); return null; }
      return nlH('div', { style: { padding: 14 } },
        nlBtn({ onClick: function() { setView(null); }, variant: 'ghost' }, '← Back to recipe box'),
        nlH('h2', { style: { fontSize: 22, fontWeight: 900, color: '#0f766e', marginTop: 12 } }, '🍳 ' + r.name),
        nlH('div', { style: { fontSize: 11, color: '#64748b', marginBottom: 14 } }, (r.cuisine ? r.cuisine + ' · ' : '') + r.time + ' min · serves ' + r.servings),
        nlCard(null,
          nlH('strong', { style: { fontSize: 13, color: '#0f766e' } }, '🛒 Ingredients'),
          nlH('div', { style: { fontSize: 12, color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: 6 } }, r.ingredients || '—')
        ),
        nlCard(null,
          nlH('strong', { style: { fontSize: 13, color: '#0f766e' } }, '👨‍🍳 Steps'),
          nlH('div', { style: { fontSize: 12, color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: 6 } }, r.steps || '—')
        ),
        r.notes ? nlCard(null,
          nlH('strong', { style: { fontSize: 13, color: '#0f766e' } }, '📝 Notes'),
          nlH('div', { style: { fontSize: 12, color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: 6 } }, r.notes)
        ) : null
      );
    }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Recipe Box', 'Save the meals you actually make', '#0d9488'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Recipe name' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 8 } },
            nlInput({ value: form.cuisine, onChange: function(e) { setForm(Object.assign({}, form, { cuisine: e.target.value })); }, placeholder: 'Cuisine' }),
            nlH('input', { type: 'number', value: form.time, onChange: function(e) { setForm(Object.assign({}, form, { time: e.target.value })); }, placeholder: 'min', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlH('input', { type: 'number', value: form.servings, onChange: function(e) { setForm(Object.assign({}, form, { servings: parseInt(e.target.value) || 1 })); }, placeholder: 'serves', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlTextarea({ value: form.ingredients, onChange: function(e) { setForm(Object.assign({}, form, { ingredients: e.target.value })); }, placeholder: 'Ingredients (one per line)', rows: 4 }),
          nlTextarea({ value: form.steps, onChange: function(e) { setForm(Object.assign({}, form, { steps: e.target.value })); }, placeholder: 'Steps (one per line)', rows: 4 }),
          nlInput({ value: form.tags, onChange: function(e) { setForm(Object.assign({}, form, { tags: e.target.value })); }, placeholder: 'Tags (comma-separated: quick, vegetarian, dorm-friendly)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (variations, family who likes it, story)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save recipe')
        )
      ),
      recipes.length === 0
        ? nlEmpty('Your recipe box is empty. Start with one — the simplest meal you actually make.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            recipes.map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#f0fdfa', borderLeft: '4px solid #0d9488', cursor: 'pointer' }, onClick: function() { setView(r.id); } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f766e' } }, '🍳 ' + r.name),
                  nlH('button', { onClick: function(e) { e.stopPropagation(); remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#0d9488', marginTop: 2 } }, (r.cuisine ? r.cuisine + ' · ' : '') + r.time + ' min · serves ' + r.servings + (r.tags ? ' · ' + r.tags : ''))
              );
            })
          ),
      nlEvidenceFooter('Cooking literacy research (Cooking Matters, Share Our Strength): teens who cook regularly eat more vegetables, more home-cooked meals lifelong, and report higher food self-efficacy.')
    );
  }

  // 32) PersonalCookingSkills — track skills learned
  function PersonalCookingSkills(props) {
    if (!R_NL) return null;
    var data = props.data || { skills: [] };
    var setData = props.setData;
    var skills = data.skills || [];
    var fs = R_NL.useState({ skill: '', confidence: 3, learnedFrom: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.skill.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ skills: [n].concat(skills) });
      setForm({ skill: '', confidence: 3, learnedFrom: '', notes: '' });
    }
    function bumpConfidence(id, delta) {
      setData({ skills: skills.map(function(s) {
        if (s.id !== id) return s;
        return Object.assign({}, s, { confidence: Math.max(1, Math.min(10, (s.confidence || 3) + delta)) });
      }) });
    }
    function remove(id) { setData({ skills: skills.filter(function(s) { return s.id !== id; }) }); }
    var skill_examples = [
      'Boiling pasta', 'Cracking + cooking an egg', 'Making a sandwich',
      'Sautéing vegetables', 'Basic knife skills', 'Following a recipe end-to-end',
      'Roasting a sheet-pan dinner', 'Making rice (stovetop or rice cooker)',
      'Quesadilla', 'Stir-fry', 'Pancakes', 'Salad with dressing',
      'Roasted chicken', 'Soup from scratch', 'Bread/biscuits', 'Tofu basics'
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Cooking Skills Tracker', 'Build skills one at a time', '#65a30d'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.skill, onChange: function(e) { setForm(Object.assign({}, form, { skill: e.target.value })); }, placeholder: 'Skill (e.g., "Boiling pasta")' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            skill_examples.map(function(s) {
              return nlH('button', { key: s, onClick: function() { setForm(Object.assign({}, form, { skill: s })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #bef264', background: form.skill === s ? '#d9f99d' : '#fff', fontSize: 10, color: '#3f6212', fontWeight: 700, cursor: 'pointer' } }, s);
            })
          ),
          nlInput({ value: form.learnedFrom, onChange: function(e) { setForm(Object.assign({}, form, { learnedFrom: e.target.value })); }, placeholder: 'Who/what taught me? (optional)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#3f6212', fontWeight: 700, marginBottom: 4 } }, 'Confidence: ' + form.confidence + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.confidence, onChange: function(e) { setForm(Object.assign({}, form, { confidence: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (tips, mistakes I made)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Add skill')
        )
      ),
      skills.length === 0
        ? nlEmpty('No skills tracked. Start with what you already know — "I can boil water" counts.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            skills.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #65a30d' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '🔪 ' + s.skill),
                  nlH('div', null,
                    nlH('button', { onClick: function() { bumpConfidence(s.id, -1); }, style: { background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', marginRight: 2 } }, '−'),
                    nlH('span', { style: { fontSize: 11, color: '#3f6212', fontWeight: 700, margin: '0 6px' } }, s.confidence + '/10'),
                    nlH('button', { onClick: function() { bumpConfidence(s.id, 1); }, style: { background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', marginRight: 6 } }, '+'),
                    nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                s.learnedFrom ? nlH('div', { style: { fontSize: 11, color: '#3f6212' } }, '👨‍🏫 ' + s.learnedFrom) : null,
                s.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, s.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Self-efficacy research (Bandura): mastery experiences build confidence faster than instruction. Track skills + bump confidence each time you practice — visible progress fuels motivation.')
    );
  }

  // 33) PersonalShoppingList — build grocery list
  function PersonalShoppingList(props) {
    if (!R_NL) return null;
    var data = props.data || { lists: [] };
    var setData = props.setData;
    var lists = data.lists || [];
    var fs = R_NL.useState({ listName: '', items: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.listName.trim()) return;
      var items = form.items.split('\n').filter(function(s) { return s.trim(); }).map(function(s) { return { text: s, done: false }; });
      var n = { id: nl_id(), date: nl_today(), name: form.listName, items: items };
      setData({ lists: [n].concat(lists) });
      setForm({ listName: '', items: '' });
    }
    function remove(id) { setData({ lists: lists.filter(function(l) { return l.id !== id; }) }); }
    function toggle(lid, iidx) {
      setData({ lists: lists.map(function(l) {
        if (l.id !== lid) return l;
        var its = l.items.slice(); its[iidx] = Object.assign({}, its[iidx], { done: !its[iidx].done });
        return Object.assign({}, l, { items: its });
      }) });
    }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Shopping Lists', 'Stay organized + skip impulse buys', '#0ea5e9'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.listName, onChange: function(e) { setForm(Object.assign({}, form, { listName: e.target.value })); }, placeholder: 'List name (e.g., "Weekend groceries")' }),
          nlTextarea({ value: form.items, onChange: function(e) { setForm(Object.assign({}, form, { items: e.target.value })); }, placeholder: 'One item per line', rows: 5 }),
          nlBtn({ onClick: add }, '+ Save list')
        )
      ),
      lists.length === 0
        ? nlEmpty('No lists yet. Lists save money and brain energy at the store.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            lists.map(function(l) {
              var done = l.items.filter(function(i) { return i.done; }).length;
              return nlH('div', { key: l.id, style: { padding: 10, borderRadius: 8, background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#075985' } }, '🛒 ' + l.name + ' (' + done + '/' + l.items.length + ')'),
                  nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                  l.items.map(function(it, idx) {
                    return nlH('label', { key: idx, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 4, fontSize: 12, color: it.done ? '#94a3b8' : '#075985', textDecoration: it.done ? 'line-through' : 'none', cursor: 'pointer' } },
                      nlH('input', { type: 'checkbox', checked: it.done, onChange: function() { toggle(l.id, idx); } }),
                      nlH('span', null, it.text)
                    );
                  })
                )
              );
            })
          ),
      nlEvidenceFooter('Behavioral economics: shopping with a list reduces impulse purchases ~40% and food waste ~25% (USDA EatRight). Lists also lower decision fatigue at the store.')
    );
  }

  // 34) PersonalMealPrepPlanner — weekly prep schedule
  function PersonalMealPrepPlanner(props) {
    if (!R_NL) return null;
    var data = props.data || { plans: [] };
    var setData = props.setData;
    var plans = data.plans || [];
    var fs = R_NL.useState({ weekOf: nl_today(), prepDay: 'sunday', prepTime: '60', monThu: '', tuFri: '', weMo: '', snacks: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ plans: [n].concat(plans) });
      setForm({ weekOf: nl_today(), prepDay: 'sunday', prepTime: '60', monThu: '', tuFri: '', weMo: '', snacks: '' });
    }
    function remove(id) { setData({ plans: plans.filter(function(p) { return p.id !== id; }) }); }
    var day_opts = ['sunday','saturday','friday','monday'].map(function(d) { return { value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }; });
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Meal-Prep Planner', 'Weekly prep saves daily decisions', '#16a34a'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('input', { type: 'date', value: form.weekOf, onChange: function(e) { setForm(Object.assign({}, form, { weekOf: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlSelect({ value: form.prepDay, onChange: function(e) { setForm(Object.assign({}, form, { prepDay: e.target.value })); } }, day_opts)
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4 } }, 'Prep time budget: ' + form.prepTime + ' min'),
            nlH('input', { type: 'range', min: 15, max: 180, step: 15, value: form.prepTime, onChange: function(e) { setForm(Object.assign({}, form, { prepTime: e.target.value })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.monThu, onChange: function(e) { setForm(Object.assign({}, form, { monThu: e.target.value })); }, placeholder: 'Mon/Thu meals (lunch + dinner)' }),
          nlInput({ value: form.tuFri, onChange: function(e) { setForm(Object.assign({}, form, { tuFri: e.target.value })); }, placeholder: 'Tue/Fri meals' }),
          nlInput({ value: form.weMo, onChange: function(e) { setForm(Object.assign({}, form, { weMo: e.target.value })); }, placeholder: 'Wed meal' }),
          nlInput({ value: form.snacks, onChange: function(e) { setForm(Object.assign({}, form, { snacks: e.target.value })); }, placeholder: 'Snacks to prep' }),
          nlBtn({ onClick: add }, '+ Save prep plan')
        )
      ),
      plans.length === 0
        ? nlEmpty('No prep plans. Sunday-prep saves Mon-Wed brain energy.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            plans.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#f0fdf4', borderLeft: '4px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#166534' } }, '📅 Week of ' + p.weekOf),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#15803d', marginBottom: 6 } }, 'Prep ' + p.prepDay + ' (' + p.prepTime + ' min)'),
                p.monThu ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, '🍴 Mon/Thu: ' + p.monThu) : null,
                p.tuFri ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, '🍴 Tue/Fri: ' + p.tuFri) : null,
                p.weMo ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, '🍴 Wed: ' + p.weMo) : null,
                p.snacks ? nlH('div', { style: { fontSize: 11, color: '#0f172a' } }, '🍪 Snacks: ' + p.snacks) : null
              );
            })
          ),
      nlEvidenceFooter('Behavioral nutrition research: families who meal-prep eat more home-cooked meals + more vegetables + spend less on takeout. Plan is a draft, not a vow — leftovers and substitutions are expected.')
    );
  }

  // 35) PersonalSubstitutionList — alternative ingredients
  function PersonalSubstitutionList(props) {
    if (!R_NL) return null;
    var data = props.data || { subs: [] };
    var setData = props.setData;
    var subs = data.subs || [];
    var fs = R_NL.useState({ ingredient: '', substitute: '', reason: 'allergy', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.ingredient.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ subs: [n].concat(subs) });
      setForm({ ingredient: '', substitute: '', reason: 'allergy', notes: '' });
    }
    function remove(id) { setData({ subs: subs.filter(function(s) { return s.id !== id; }) }); }
    var reason_opts = [
      { value: 'allergy', label: '🚨 Allergy' },
      { value: 'intolerance', label: '😣 Intolerance' },
      { value: 'taste', label: '😋 Taste preference' },
      { value: 'cost', label: '💰 Cost' },
      { value: 'available', label: '🛒 Couldn\'t find it' },
      { value: 'religious', label: '🙏 Religious/ethical' },
      { value: 'health', label: '⚕ Health-related' }
    ];
    var common_subs = [
      { i: 'Buttermilk', s: 'Milk + 1 tsp lemon juice', r: 'available' },
      { i: 'Egg (vegan)', s: '1T ground flax + 3T water', r: 'religious' },
      { i: 'Honey (vegan)', s: 'Maple syrup', r: 'religious' },
      { i: 'Cow\'s milk (lactose)', s: 'Oat/almond/soy milk', r: 'intolerance' },
      { i: 'Wheat flour (celiac)', s: 'Almond/oat/rice flour blend', r: 'allergy' },
      { i: 'Soy sauce (gluten)', s: 'Tamari or coconut aminos', r: 'allergy' },
      { i: 'Peanut butter (allergy)', s: 'Sunflower butter (sunbutter)', r: 'allergy' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Substitution List', 'Swap library — allergies, taste, what\'s in the pantry', '#ea580c'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.ingredient, onChange: function(e) { setForm(Object.assign({}, form, { ingredient: e.target.value })); }, placeholder: 'Original ingredient' }),
          nlInput({ value: form.substitute, onChange: function(e) { setForm(Object.assign({}, form, { substitute: e.target.value })); }, placeholder: 'Substitute' }),
          nlSelect({ value: form.reason, onChange: function(e) { setForm(Object.assign({}, form, { reason: e.target.value })); } }, reason_opts),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (ratio, taste, when it works)' }),
          nlBtn({ onClick: add }, '+ Add substitution')
        )
      ),
      nlCard({ style: { background: '#ffedd5', border: '1px dashed #fdba74' } },
        nlH('strong', { style: { fontSize: 11, color: '#9a3412', display: 'block', marginBottom: 6 } }, '💡 Common subs (tap to add)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          common_subs.map(function(c, i) {
            return nlH('button', { key: i, onClick: function() { setForm({ ingredient: c.i, substitute: c.s, reason: c.r, notes: '' }); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #fdba74', background: '#fff', fontSize: 11, color: '#7c2d12', cursor: 'pointer' } },
              nlH('strong', null, c.i), ' → ', c.s
            );
          })
        )
      ),
      subs.length === 0
        ? nlEmpty('No subs saved. Save the ones you find useful.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            subs.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#fff7ed', borderLeft: '3px solid #ea580c' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7c2d12' } }, s.ingredient + ' → ' + s.substitute),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 10, color: '#9a3412', marginTop: 2 } }, (reason_opts.find(function(o) { return o.value === s.reason; }) || { label: s.reason }).label),
                s.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, s.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Cookery science: most substitutions work — texture and moisture matter most. A subs library makes home cooking accessible regardless of allergies, budget, or pantry state.')
    );
  }

  // 36) PersonalKitchenInventory — what's in your kitchen
  function PersonalKitchenInventory(props) {
    if (!R_NL) return null;
    var data = props.data || { items: [] };
    var setData = props.setData;
    var items = data.items || [];
    var fs = R_NL.useState({ name: '', location: 'pantry', expiry: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ items: [n].concat(items) });
      setForm({ name: '', location: 'pantry', expiry: '' });
    }
    function remove(id) { setData({ items: items.filter(function(i) { return i.id !== id; }) }); }
    var loc_opts = [
      { value: 'pantry', label: '📦 Pantry' },
      { value: 'fridge', label: '❄ Fridge' },
      { value: 'freezer', label: '🧊 Freezer' },
      { value: 'counter', label: '🍎 Counter' }
    ];
    var byLoc = {};
    items.forEach(function(i) { byLoc[i.location] = (byLoc[i.location] || []).concat(i); });
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Kitchen Inventory', 'What you have = what you can make', '#65a30d'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Item name' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlSelect({ value: form.location, onChange: function(e) { setForm(Object.assign({}, form, { location: e.target.value })); } }, loc_opts),
            nlH('input', { type: 'date', value: form.expiry, onChange: function(e) { setForm(Object.assign({}, form, { expiry: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlBtn({ onClick: add }, '+ Add item')
        )
      ),
      items.length === 0
        ? nlEmpty('Empty inventory. Track at least the staples — knowing what you have prevents waste.')
        : loc_opts.filter(function(lo) { return (byLoc[lo.value] || []).length > 0; }).map(function(lo) {
            return nlH('div', { key: lo.value, style: { marginBottom: 10 } },
              nlH('strong', { style: { fontSize: 12, color: '#3f6212' } }, lo.label),
              nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 } },
                (byLoc[lo.value] || []).map(function(it) {
                  var expSoon = it.expiry && (new Date(it.expiry).getTime() - Date.now()) < 86400000 * 5;
                  return nlH('div', { key: it.id, style: { padding: '5px 8px', borderRadius: 6, background: expSoon ? '#fef3c7' : '#fff', border: '1px solid ' + (expSoon ? '#fcd34d' : '#cbd5e1'), fontSize: 11, color: '#3f6212', display: 'flex', alignItems: 'center', gap: 6 } },
                    nlH('span', null, it.name + (it.expiry ? ' (' + it.expiry + (expSoon ? ' ⚠' : '') + ')' : '')),
                    nlH('button', { onClick: function() { remove(it.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 10, cursor: 'pointer' } }, '✕')
                  );
                })
              )
            );
          }),
      nlEvidenceFooter('USDA food-waste data: ~30-40% of US food supply is wasted, much at the home level due to inventory unawareness. Tracking what\'s on hand → less waste + lower grocery bills.')
    );
  }

  // 37) PersonalBudgetTracker — food budget awareness
  function PersonalBudgetTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [], weeklyBudget: 50 };
    var setData = props.setData;
    var entries = data.entries || [];
    var weeklyBudget = data.weeklyBudget || 50;
    var fs = R_NL.useState({ amount: 0, category: 'groceries', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.amount) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries), weeklyBudget: weeklyBudget });
      setForm({ amount: 0, category: 'groceries', notes: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }), weeklyBudget: weeklyBudget }); }
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekSpend = entries.filter(function(e) { return new Date(e.date) >= weekAgo; }).reduce(function(sum, e) { return sum + (e.amount || 0); }, 0);
    var pct = Math.min(100, Math.round(weekSpend / weeklyBudget * 100));
    var cat_opts = [
      { value: 'groceries', label: '🛒 Groceries' },
      { value: 'cafeteria', label: '🏫 Cafeteria' },
      { value: 'takeout', label: '🥡 Takeout' },
      { value: 'dineout', label: '🍽 Restaurant' },
      { value: 'snacks', label: '🍫 Snacks/drinks' },
      { value: 'coffee', label: '☕ Coffee/drinks' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Budget Tracker', 'Awareness of where the money goes', '#0891b2'),
      nlCard({ style: { background: '#ecfeff', border: '1px solid #67e8f9' } },
        nlH('strong', { style: { fontSize: 14, color: '#0e7490' } }, 'This week: $' + weekSpend.toFixed(2) + ' / $' + weeklyBudget.toFixed(2)),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', overflow: 'hidden', marginTop: 6, border: '1px solid #67e8f9' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #22d3ee, #0891b2)' } })
        ),
        nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#155e75' } },
          nlH('span', null, 'Weekly budget: $'),
          nlH('input', { type: 'number', value: weeklyBudget, onChange: function(e) { setData({ entries: entries, weeklyBudget: parseFloat(e.target.value) || 50 }); }, style: { width: 70, padding: '3px 6px', borderRadius: 4, border: '1px solid #67e8f9', fontSize: 11 } })
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 } },
            nlH('input', { type: 'number', step: '0.01', value: form.amount, onChange: function(e) { setForm(Object.assign({}, form, { amount: parseFloat(e.target.value) || 0 })); }, placeholder: '$', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlSelect({ value: form.category, onChange: function(e) { setForm(Object.assign({}, form, { category: e.target.value })); } }, cat_opts)
          ),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add }, '+ Log spend')
        )
      ),
      entries.length === 0
        ? nlEmpty('No spend logged. Coffee + snacks add up fast — tracking shows where.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 6, background: '#ecfeff', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
                nlH('div', { style: { color: '#155e75' } },
                  nlH('strong', null, '$' + e.amount.toFixed(2)),
                  ' · ', (cat_opts.find(function(o) { return o.value === e.category; }) || { label: e.category }).label,
                  e.notes ? ' · ' + e.notes : '',
                  nlH('span', { style: { fontSize: 10, color: '#64748b', marginLeft: 8 } }, nl_relDate(e.date))
                ),
                nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
              );
            })
          ),
      nlEvidenceFooter('USDA Food Plans: an adolescent on the Thrifty Plan spends ~$60/wk; Low-Cost ~$80/wk. SNAP benefits + school meals fill gaps. Awareness ≠ deprivation — it\'s knowing where to shift.')
    );
  }

  // 38) PersonalFavorFoodList — favorite affordable foods
  function PersonalFavorFoodList(props) {
    if (!R_NL) return null;
    var data = props.data || { foods: [] };
    var setData = props.setData;
    var foods = data.foods || [];
    var fs = R_NL.useState({ name: '', cost: 'cheap', why: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ foods: [n].concat(foods) });
      setForm({ name: '', cost: 'cheap', why: '' });
    }
    function remove(id) { setData({ foods: foods.filter(function(f) { return f.id !== id; }) }); }
    var cost_opts = [
      { value: 'cheap', label: '💰 Cheap' },
      { value: 'mid', label: '💰💰 Mid' },
      { value: 'splurge', label: '💰💰💰 Splurge' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Favorite Affordable Foods', 'The foods you love that don\'t wreck the budget', '#16a34a'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Food/meal name' }),
          nlSelect({ value: form.cost, onChange: function(e) { setForm(Object.assign({}, form, { cost: e.target.value })); } }, cost_opts),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Why I love it' }),
          nlBtn({ onClick: add }, '+ Add favorite')
        )
      ),
      foods.length === 0
        ? nlEmpty('No favorites yet. Add ones you genuinely enjoy — that\'s the list to come back to.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            foods.map(function(f) {
              return nlH('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#166534' } }, '⭐ ' + f.name + ' · ' + (cost_opts.find(function(o) { return o.value === f.cost; }) || { label: '' }).label),
                  nlH('button', { onClick: function() { remove(f.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                f.why ? nlH('div', { style: { fontSize: 11, color: '#15803d', fontStyle: 'italic', marginTop: 2 } }, '💚 ' + f.why) : null
              );
            })
          ),
      nlEvidenceFooter('Food joy + affordability are not opposites. The MyPlate "Smart Shopping" guidance prioritizes seasonal produce + dry beans/lentils + frozen vegetables + store-brand staples — and meals can still feel like meals.')
    );
  }

  // 39) PersonalCookTimer — cooking timer + steps
  function PersonalCookTimer(props) {
    if (!R_NL) return null;
    var data = props.data || { sessions: [] };
    var setData = props.setData;
    var sessions = data.sessions || [];
    var fs = R_NL.useState({ recipe: '', steps: ['',''] });
    var form = fs[0]; var setForm = fs[1];
    function setStep(i, v) { var ns = form.steps.slice(); ns[i] = v; setForm(Object.assign({}, form, { steps: ns })); }
    function addStepField() { setForm(Object.assign({}, form, { steps: form.steps.concat(['']) })); }
    function save() {
      if (!form.recipe.trim()) return;
      var n = { id: nl_id(), date: nl_today(), recipe: form.recipe, steps: form.steps.filter(function(s) { return s.trim(); }) };
      setData({ sessions: [n].concat(sessions) });
      setForm({ recipe: '', steps: ['',''] });
    }
    function remove(id) { setData({ sessions: sessions.filter(function(s) { return s.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Cook Timer Sessions', 'Save step-by-step timelines for repeat recipes', '#ea580c'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.recipe, onChange: function(e) { setForm(Object.assign({}, form, { recipe: e.target.value })); }, placeholder: 'Recipe name' }),
          form.steps.map(function(s, i) {
            return nlInput({ key: 'st' + i, value: s, onChange: function(e) { setStep(i, e.target.value); }, placeholder: 'Step ' + (i + 1) + ' (e.g., "10 min — preheat oven 400")' });
          }),
          nlBtn({ onClick: addStepField, variant: 'ghost' }, '+ Add step'),
          nlBtn({ onClick: save }, '+ Save cook timeline')
        )
      ),
      sessions.length === 0
        ? nlEmpty('No timelines saved. Build one for any recipe you make often.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            sessions.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#fff7ed', borderLeft: '4px solid #ea580c' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#7c2d12' } }, '⏱ ' + s.recipe),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('ol', { style: { paddingLeft: 18, margin: 0, fontSize: 11, color: '#7c2d12' } },
                  s.steps.map(function(st, i) { return nlH('li', { key: i }, st); })
                )
              );
            })
          ),
      nlEvidenceFooter('Cooking confidence research: written/saved step timelines reduce decision fatigue and let beginners track multiple items at once — a key skill for moving past "simple" recipes.')
    );
  }

  // 40) PersonalRecipeBuilder — modify recipes for tastes
  function PersonalRecipeBuilder(props) {
    if (!R_NL) return null;
    var data = props.data || { mods: [] };
    var setData = props.setData;
    var mods = data.mods || [];
    var fs = R_NL.useState({ original: '', changes: '', verdict: 'kept', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.original.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ mods: [n].concat(mods) });
      setForm({ original: '', changes: '', verdict: 'kept', notes: '' });
    }
    function remove(id) { setData({ mods: mods.filter(function(m) { return m.id !== id; }) }); }
    var verdict_opts = [
      { value: 'kept', label: '✓ Keeping the change' },
      { value: 'reverting', label: '↩ Going back to original' },
      { value: 'iterate', label: '🔬 Iterating more' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Recipe Modifications', 'Make recipes yours — track what you changed and why', '#7c3aed'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.original, onChange: function(e) { setForm(Object.assign({}, form, { original: e.target.value })); }, placeholder: 'Original recipe' }),
          nlTextarea({ value: form.changes, onChange: function(e) { setForm(Object.assign({}, form, { changes: e.target.value })); }, placeholder: 'What I changed (and why)', rows: 3 }),
          nlSelect({ value: form.verdict, onChange: function(e) { setForm(Object.assign({}, form, { verdict: e.target.value })); } }, verdict_opts),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'How it turned out', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save modification')
        )
      ),
      mods.length === 0
        ? nlEmpty('No mods logged. Cooking is a science of "test → tweak → test."')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            mods.map(function(m) {
              return nlH('div', { key: m.id, style: { padding: 10, borderRadius: 8, background: '#faf5ff', borderLeft: '3px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#6b21a8' } }, '🔬 ' + m.original),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(m.date)),
                    nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 4 } }, '⚙ ' + m.changes),
                nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, (verdict_opts.find(function(o) { return o.value === m.verdict; }) || { label: m.verdict }).label),
                m.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, m.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Recipe modification = personal cooking expertise. Tracking your changes makes you the documentary author of your own kitchen — a skill that compounds over years.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 5: CULTURAL / IDENTITY (8 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 41) PersonalCulturalFoods — celebrate cultural foods
  function PersonalCulturalFoods(props) {
    if (!R_NL) return null;
    var data = props.data || { foods: [] };
    var setData = props.setData;
    var foods = data.foods || [];
    var fs = R_NL.useState({ food: '', culture: '', occasion: '', whoMakes: '', meaning: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ foods: [n].concat(foods) });
      setForm({ food: '', culture: '', occasion: '', whoMakes: '', meaning: '' });
    }
    function remove(id) { setData({ foods: foods.filter(function(f) { return f.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Cultural Foods', 'Foods that connect you to family, culture, identity', '#c026d3'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Food/dish name' }),
          nlInput({ value: form.culture, onChange: function(e) { setForm(Object.assign({}, form, { culture: e.target.value })); }, placeholder: 'Culture / region' }),
          nlInput({ value: form.occasion, onChange: function(e) { setForm(Object.assign({}, form, { occasion: e.target.value })); }, placeholder: 'When eaten (holiday, weekly, etc.)' }),
          nlInput({ value: form.whoMakes, onChange: function(e) { setForm(Object.assign({}, form, { whoMakes: e.target.value })); }, placeholder: 'Who in your family makes it' }),
          nlTextarea({ value: form.meaning, onChange: function(e) { setForm(Object.assign({}, form, { meaning: e.target.value })); }, placeholder: 'What it means to you', rows: 3 }),
          nlBtn({ onClick: add }, '+ Add cultural food')
        )
      ),
      foods.length === 0
        ? nlEmpty('No cultural foods yet. These are the foods that connect you to where you come from.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            foods.map(function(f) {
              return nlH('div', { key: f.id, style: { padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, #fdf4ff, #fae8ff)', borderLeft: '4px solid #c026d3' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 14, color: '#86198f' } }, '🌍 ' + f.food + (f.culture ? ' · ' + f.culture : '')),
                  nlH('button', { onClick: function() { remove(f.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                f.occasion ? nlH('div', { style: { fontSize: 11, color: '#86198f', marginTop: 4 } }, '📅 ' + f.occasion) : null,
                f.whoMakes ? nlH('div', { style: { fontSize: 11, color: '#86198f', marginTop: 2 } }, '👨‍👩‍👧 ' + f.whoMakes) : null,
                f.meaning ? nlH('div', { style: { fontSize: 11, color: '#86198f', marginTop: 4, fontStyle: 'italic' } }, '💜 ' + f.meaning) : null
              );
            })
          ),
      nlEvidenceFooter('Cultural food research (Counihan, Mintz): food is identity, memory, and belonging — not just nutrition. Documenting cultural foods is one way of preserving them across generations.')
    );
  }

  // 42) PersonalFamilyRecipes — preserve family recipes
  function PersonalFamilyRecipes(props) {
    if (!R_NL) return null;
    var data = props.data || { recipes: [] };
    var setData = props.setData;
    var recipes = data.recipes || [];
    var fs = R_NL.useState({ name: '', source: '', ingredients: '', method: '', story: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ recipes: [n].concat(recipes) });
      setForm({ name: '', source: '', ingredients: '', method: '', story: '' });
    }
    function remove(id) { setData({ recipes: recipes.filter(function(r) { return r.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Family Recipes', 'Capture the recipes that risk being lost', '#a16207'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: 12, fontSize: 11, color: '#78350f', lineHeight: 1.55 } },
        nlH('strong', null, '⏳ A note: '),
        'Family recipes often live only in one person\'s head. Writing them down — exactly as told, with their stories — is preservation work that matters.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Recipe name' }),
          nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Whose recipe? (Grandma, Dad, etc.)' }),
          nlTextarea({ value: form.ingredients, onChange: function(e) { setForm(Object.assign({}, form, { ingredients: e.target.value })); }, placeholder: 'Ingredients (with their measurements — even "handful")', rows: 4 }),
          nlTextarea({ value: form.method, onChange: function(e) { setForm(Object.assign({}, form, { method: e.target.value })); }, placeholder: 'Method (in their words if possible)', rows: 4 }),
          nlTextarea({ value: form.story, onChange: function(e) { setForm(Object.assign({}, form, { story: e.target.value })); }, placeholder: 'Story — when/why/the memory attached', rows: 3 }),
          nlBtn({ onClick: add }, '+ Save family recipe')
        )
      ),
      recipes.length === 0
        ? nlEmpty('No family recipes saved yet. Even one is precious — start with the one you can already taste from memory.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            recipes.map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 12, borderRadius: 10, background: '#fef3c7', borderLeft: '5px solid #a16207' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 14, color: '#78350f' } }, '📜 ' + r.name + (r.source ? ' (' + r.source + ')' : '')),
                  nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                r.ingredients ? nlH('div', { style: { fontSize: 11, color: '#78350f', whiteSpace: 'pre-wrap', marginTop: 4 } }, nlH('strong', null, '🛒 Ingredients: '), r.ingredients) : null,
                r.method ? nlH('div', { style: { fontSize: 11, color: '#78350f', whiteSpace: 'pre-wrap', marginTop: 4 } }, nlH('strong', null, '👩‍🍳 Method: '), r.method) : null,
                r.story ? nlH('div', { style: { fontSize: 11, color: '#78350f', whiteSpace: 'pre-wrap', marginTop: 6, fontStyle: 'italic' } }, '📖 ' + r.story) : null
              );
            })
          ),
      nlEvidenceFooter('Oral history preservation: family food traditions are intangible cultural heritage (UNESCO framework). Writing them down with their stories preserves not just the recipe but the relationship.')
    );
  }

  // 43) PersonalNDFoodSafety — neurodivergent food sensitivities
  function PersonalNDFoodSafety(props) {
    if (!R_NL) return null;
    var data = props.data || { profile: { safeFoods: '', textures: '', sensitivities: '', notes: '' }, entries: [] };
    var setData = props.setData;
    var profile = data.profile || {};
    var entries = data.entries || [];
    var ps = R_NL.useState(profile);
    var pform = ps[0]; var setPform = ps[1];
    var fs = R_NL.useState({ food: '', verdict: 'safe', sensoryNote: '' });
    var form = fs[0]; var setForm = fs[1];
    function saveProfile() { setData({ profile: pform, entries: entries }); }
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ profile: pform, entries: [n].concat(entries) });
      setForm({ food: '', verdict: 'safe', sensoryNote: '' });
    }
    function remove(id) { setData({ profile: pform, entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var verdict_opts = [
      { value: 'safe', label: '🟢 Safe / preferred' },
      { value: 'cautious', label: '🟡 Cautious — situational' },
      { value: 'avoid', label: '🔴 Avoid — sensory or distress' },
      { value: 'trying', label: '🌱 Trying / building tolerance' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Neurodivergent Food Profile', 'ARFID-aware, sensory-aware. No "just try it."', '#0ea5e9'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#e0f2fe', border: '1px solid #38bdf8', marginBottom: 12, fontSize: 11, color: '#075985', lineHeight: 1.55 } },
        nlH('strong', null, '💙 A note: '),
        'Food sensitivities in autistic + ADHD students are real, body-based, and not "picky." This tool documents YOUR profile — useful for school accommodations, sleepovers, restaurants, and parents who need it.'
      ),
      nlCard(null,
        nlH('strong', { style: { fontSize: 13, color: '#075985' } }, 'My profile'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 } },
          nlTextarea({ value: pform.safeFoods, onChange: function(e) { setPform(Object.assign({}, pform, { safeFoods: e.target.value })); }, placeholder: 'My safe foods (any time, any place)', rows: 2 }),
          nlTextarea({ value: pform.textures, onChange: function(e) { setPform(Object.assign({}, pform, { textures: e.target.value })); }, placeholder: 'Textures I do/don\'t like', rows: 2 }),
          nlTextarea({ value: pform.sensitivities, onChange: function(e) { setPform(Object.assign({}, pform, { sensitivities: e.target.value })); }, placeholder: 'Sensitivities (smell, temperature, etc.)', rows: 2 }),
          nlTextarea({ value: pform.notes, onChange: function(e) { setPform(Object.assign({}, pform, { notes: e.target.value })); }, placeholder: 'Notes for adults supporting me', rows: 2 }),
          nlBtn({ onClick: saveProfile }, '✓ Save profile')
        )
      ),
      nlCard(null,
        nlH('strong', { style: { fontSize: 13, color: '#075985' } }, 'Per-food log'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Food' }),
          nlSelect({ value: form.verdict, onChange: function(e) { setForm(Object.assign({}, form, { verdict: e.target.value })); } }, verdict_opts),
          nlInput({ value: form.sensoryNote, onChange: function(e) { setForm(Object.assign({}, form, { sensoryNote: e.target.value })); }, placeholder: 'Sensory note (why)' }),
          nlBtn({ onClick: add }, '+ Add food entry')
        )
      ),
      entries.length === 0
        ? nlEmpty('No food entries. Build your own database over time — most useful for accommodations conversations.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              var colors = { safe: '#dcfce7', cautious: '#fef9c3', avoid: '#fee2e2', trying: '#dbeafe' };
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: colors[e.verdict] || '#f1f5f9', display: 'flex', justifyContent: 'space-between' } },
                nlH('div', { style: { fontSize: 12, color: '#0f172a' } },
                  nlH('strong', null, e.food), ' · ',
                  (verdict_opts.find(function(o) { return o.value === e.verdict; }) || { label: e.verdict }).label,
                  e.sensoryNote ? nlH('span', { style: { color: '#475569', fontStyle: 'italic', marginLeft: 6 } }, ' — ' + e.sensoryNote) : null
                ),
                nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
              );
            })
          ),
      nlEvidenceFooter('AAP + Spectrum Research: ARFID (Avoidant/Restrictive Food Intake Disorder) and sensory-based food preferences are common in autistic + ADHD students. They are not pickiness; they are body-real. Documentation supports accommodations + reduces pressure-feeding cycles.')
    );
  }

  // 44) PersonalEatingValues — what nutrition means to YOU
  function PersonalEatingValues(props) {
    if (!R_NL) return null;
    var data = props.data || { values: [] };
    var setData = props.setData;
    var values = data.values || [];
    var fs = R_NL.useState({ value: '', why: '', actions: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.value.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ values: [n].concat(values) });
      setForm({ value: '', why: '', actions: '' });
    }
    function remove(id) { setData({ values: values.filter(function(v) { return v.id !== id; }) }); }
    var value_chips = [
      'Eat with family', 'Honor cultural foods', 'Support my body', 'Reduce harm to animals',
      'Lower environmental impact', 'Stay within my budget', 'Eat without anxiety',
      'Cook more from scratch', 'Try new foods', 'Listen to my body', 'Respect Sabbath/holiday traditions',
      'Avoid waste'
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Eating Values', 'What matters to ME about food', '#84cc16'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.value, onChange: function(e) { setForm(Object.assign({}, form, { value: e.target.value })); }, placeholder: 'A value of mine around food' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            value_chips.map(function(c) {
              return nlH('button', { key: c, onClick: function() { setForm(Object.assign({}, form, { value: c })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #bef264', background: form.value === c ? '#d9f99d' : '#fff', fontSize: 10, color: '#3f6212', fontWeight: 700, cursor: 'pointer' } }, c);
            })
          ),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Why this matters' }),
          nlInput({ value: form.actions, onChange: function(e) { setForm(Object.assign({}, form, { actions: e.target.value })); }, placeholder: 'How I live this' }),
          nlBtn({ onClick: add }, '+ Save value')
        )
      ),
      values.length === 0
        ? nlEmpty('No values mapped yet. Knowing what you value about food gives compass instead of rules.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            values.map(function(v) {
              return nlH('div', { key: v.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '🧭 ' + v.value),
                  nlH('button', { onClick: function() { remove(v.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                v.why ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 4 } }, '💚 ' + v.why) : null,
                v.actions ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '🎯 ' + v.actions) : null
              );
            })
          ),
      nlEvidenceFooter('Acceptance and Commitment Therapy (Hayes): values-based action is more sustainable than rule-following. Naming what you value about food turns nutrition from "should" into "want to."')
    );
  }

  // 45) PersonalFoodTraditions — meals tied to identity
  function PersonalFoodTraditions(props) {
    if (!R_NL) return null;
    var data = props.data || { traditions: [] };
    var setData = props.setData;
    var traditions = data.traditions || [];
    var fs = R_NL.useState({ tradition: '', when: '', who: '', memory: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.tradition.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ traditions: [n].concat(traditions) });
      setForm({ tradition: '', when: '', who: '', memory: '' });
    }
    function remove(id) { setData({ traditions: traditions.filter(function(t) { return t.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Traditions', 'Rituals around eating that mean something to you', '#ec4899'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.tradition, onChange: function(e) { setForm(Object.assign({}, form, { tradition: e.target.value })); }, placeholder: 'Tradition (e.g., "Sunday pancakes")' }),
          nlInput({ value: form.when, onChange: function(e) { setForm(Object.assign({}, form, { when: e.target.value })); }, placeholder: 'When' }),
          nlInput({ value: form.who, onChange: function(e) { setForm(Object.assign({}, form, { who: e.target.value })); }, placeholder: 'Who is part of this tradition' }),
          nlTextarea({ value: form.memory, onChange: function(e) { setForm(Object.assign({}, form, { memory: e.target.value })); }, placeholder: 'A favorite memory', rows: 3 }),
          nlBtn({ onClick: add }, '+ Save tradition')
        )
      ),
      traditions.length === 0
        ? nlEmpty('No traditions logged. The small repeated ones matter most.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            traditions.map(function(t) {
              return nlH('div', { key: t.id, style: { padding: 12, borderRadius: 10, background: '#fdf2f8', borderLeft: '4px solid #ec4899' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#9f1239' } }, '💖 ' + t.tradition),
                  nlH('button', { onClick: function() { remove(t.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                t.when ? nlH('div', { style: { fontSize: 11, color: '#9f1239', marginTop: 4 } }, '📅 ' + t.when) : null,
                t.who ? nlH('div', { style: { fontSize: 11, color: '#9f1239' } }, '👨‍👩‍👧 ' + t.who) : null,
                t.memory ? nlH('div', { style: { fontSize: 11, color: '#9f1239', marginTop: 4, fontStyle: 'italic' } }, '🎀 ' + t.memory) : null
              );
            })
          ),
      nlEvidenceFooter('Family-meal research (Fiese et al.): repeated food rituals correlate with adolescent emotional regulation, academic outcomes, and lifelong eating patterns. Tradition isn\'t old-fashioned — it\'s protective.')
    );
  }

  // 46) PersonalSafeFoods — ND/sensory safe foods list
  function PersonalSafeFoods(props) {
    if (!R_NL) return null;
    var data = props.data || { foods: [] };
    var setData = props.setData;
    var foods = data.foods || [];
    var fs = R_NL.useState({ food: '', context: 'anytime', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ foods: [n].concat(foods) });
      setForm({ food: '', context: 'anytime', notes: '' });
    }
    function remove(id) { setData({ foods: foods.filter(function(f) { return f.id !== id; }) }); }
    var ctx_opts = [
      { value: 'anytime', label: '🌟 Anytime safe' },
      { value: 'low-spoon', label: '🔋 Low-spoon days' },
      { value: 'overwhelm', label: '🌊 Sensory overwhelm' },
      { value: 'sick', label: '🤒 Sick days' },
      { value: 'travel', label: '✈ Travel' },
      { value: 'pre-class', label: '📚 Pre-class easy' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Safe Foods', 'A list to come back to — no apology needed', '#10b981'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', marginBottom: 12, fontSize: 11, color: '#065f46', lineHeight: 1.55 } },
        nlH('strong', null, '💚 Safe foods are NOT failure foods. '),
        'Repeating a familiar meal is a survival skill, especially on low-spoon days, sensory-heavy days, or transitions. Honor what your body trusts.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Safe food' }),
          nlSelect({ value: form.context, onChange: function(e) { setForm(Object.assign({}, form, { context: e.target.value })); } }, ctx_opts),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (texture, where to find, how to prepare)' }),
          nlBtn({ onClick: add }, '+ Add safe food')
        )
      ),
      foods.length === 0
        ? nlEmpty('No safe foods listed. Add 3-5 — the foods your body trusts on any day.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            foods.map(function(f) {
              return nlH('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: '#ecfdf5', borderLeft: '3px solid #10b981' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#065f46' } }, '💚 ' + f.food),
                  nlH('button', { onClick: function() { remove(f.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2 } }, (ctx_opts.find(function(o) { return o.value === f.context; }) || { label: f.context }).label),
                f.notes ? nlH('div', { style: { fontSize: 10, color: '#065f46', marginTop: 2, fontStyle: 'italic' } }, f.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Autistic + ARFID-informed practice (PEACE pathway, MEED guidelines): repetition of safe foods is regulation, not avoidance. Pathologizing safe foods often worsens distress; honoring them creates baseline stability for cautious expansion.')
    );
  }

  // 47) PersonalAdventureFoods — gently try new foods
  function PersonalAdventureFoods(props) {
    if (!R_NL) return null;
    var data = props.data || { tries: [] };
    var setData = props.setData;
    var tries = data.tries || [];
    var fs = R_NL.useState({ food: '', tasted: 'lookedat', verdict: 'tbd', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ tries: [n].concat(tries) });
      setForm({ food: '', tasted: 'lookedat', verdict: 'tbd', notes: '' });
    }
    function remove(id) { setData({ tries: tries.filter(function(t) { return t.id !== id; }) }); }
    var tasted_opts = [
      { value: 'lookedat', label: '👀 Just looked at it' },
      { value: 'smelled', label: '👃 Smelled it' },
      { value: 'tongue', label: '👅 Touched to tongue' },
      { value: 'onebite', label: '🍴 One bite' },
      { value: 'serving', label: '🍽 Full serving' },
      { value: 'repeat', label: '🔁 Have it again' }
    ];
    var verdict_opts = [
      { value: 'tbd', label: '⏳ TBD' },
      { value: 'liked', label: '😋 Liked it' },
      { value: 'meh', label: '😐 Meh' },
      { value: 'no', label: '😣 Not for me' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Adventures', 'Try new foods at YOUR pace — looking at it counts', '#a855f7'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#faf5ff', border: '1px solid #d8b4fe', marginBottom: 12, fontSize: 11, color: '#6b21a8', lineHeight: 1.55 } },
        nlH('strong', null, '🌱 Tiny steps count. '),
        'Sensory exposure builds tolerance gradually. Looking → smelling → touching → tasting → eating is a real progression. No pressure, no reward; observation only.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Food I tried' }),
          nlSelect({ value: form.tasted, onChange: function(e) { setForm(Object.assign({}, form, { tasted: e.target.value })); } }, tasted_opts),
          nlSelect({ value: form.verdict, onChange: function(e) { setForm(Object.assign({}, form, { verdict: e.target.value })); } }, verdict_opts),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'What I noticed' }),
          nlBtn({ onClick: add }, '+ Log adventure')
        )
      ),
      tries.length === 0
        ? nlEmpty('No adventures logged. Tiny exposures, your pace.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            tries.slice(0, 30).map(function(t) {
              return nlH('div', { key: t.id, style: { padding: 8, borderRadius: 8, background: '#faf5ff', borderLeft: '3px solid #a855f7' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#6b21a8' } }, '🌱 ' + t.food),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(t.date)),
                    nlH('button', { onClick: function() { remove(t.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#6b21a8', marginTop: 2 } }, (tasted_opts.find(function(o) { return o.value === t.tasted; }) || { label: t.tasted }).label + ' · ' + (verdict_opts.find(function(o) { return o.value === t.verdict; }) || { label: t.verdict }).label),
                t.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, t.notes) : null
              );
            })
          ),
      nlEvidenceFooter('SOS Feeding (Toomey) + AAP: exposure-based food learning happens in steps from sensory awareness to consumption. Each step is progress; coercion regresses. The progression you do at your own pace is the progression that lasts.')
    );
  }

  // 48) PersonalFoodCulturalMap — foods from different cultures
  function PersonalFoodCulturalMap(props) {
    if (!R_NL) return null;
    var data = props.data || { explored: [] };
    var setData = props.setData;
    var explored = data.explored || [];
    var fs = R_NL.useState({ culture: '', food: '', context: '', verdict: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.culture.trim() || !form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ explored: [n].concat(explored) });
      setForm({ culture: '', food: '', context: '', verdict: '' });
    }
    function remove(id) { setData({ explored: explored.filter(function(e) { return e.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Culture Map', 'Foods I\'ve explored from cultures around the world', '#0891b2'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#ecfeff', border: '1px solid #67e8f9', marginBottom: 12, fontSize: 11, color: '#155e75', lineHeight: 1.55 } },
        nlH('strong', null, '🌍 Trying cultural foods respectfully: '),
        'go to the source — restaurant owned by people from that culture, recipe from someone who grew up eating it, story attached. Avoid "fusion" appropriation that strips meaning.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.culture, onChange: function(e) { setForm(Object.assign({}, form, { culture: e.target.value })); }, placeholder: 'Culture / country / region' }),
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Food' }),
          nlInput({ value: form.context, onChange: function(e) { setForm(Object.assign({}, form, { context: e.target.value })); }, placeholder: 'Where I tried it / who introduced me' }),
          nlTextarea({ value: form.verdict, onChange: function(e) { setForm(Object.assign({}, form, { verdict: e.target.value })); }, placeholder: 'What I noticed about taste, story, history', rows: 2 }),
          nlBtn({ onClick: add }, '+ Add cultural food experience')
        )
      ),
      explored.length === 0
        ? nlEmpty('No cultural foods explored yet. Start with one — it builds humility + curiosity.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            explored.map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #0891b2' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#155e75' } }, '🌎 ' + e.food + (e.culture ? ' (' + e.culture + ')' : '')),
                  nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                e.context ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 4 } }, '📍 ' + e.context) : null,
                e.verdict ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + e.verdict) : null
              );
            })
          ),
      nlEvidenceFooter('Food + globalization scholarship (Counihan, Wilk): the foods we eat carry the histories of trade, migration, colonialism, agriculture. Tasting + learning the story = cultural literacy.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 6: SCHOOL-SPECIFIC (8 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 49) PersonalSchoolMealPlan — pack/buy decisions
  function PersonalSchoolMealPlan(props) {
    if (!R_NL) return null;
    var data = props.data || { weeks: [] };
    var setData = props.setData;
    var weeks = data.weeks || [];
    var fs = R_NL.useState({ weekOf: nl_today(), monday: 'pack', tuesday: 'pack', wednesday: 'buy', thursday: 'pack', friday: 'pack', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ weeks: [n].concat(weeks) });
      setForm({ weekOf: nl_today(), monday: 'pack', tuesday: 'pack', wednesday: 'buy', thursday: 'pack', friday: 'pack', notes: '' });
    }
    function remove(id) { setData({ weeks: weeks.filter(function(w) { return w.id !== id; }) }); }
    var decision_opts = [
      { value: 'pack', label: '🥪 Pack' },
      { value: 'buy', label: '🏫 Buy' },
      { value: 'mixed', label: '🔀 Mix' },
      { value: 'skip', label: '⏭ Skip' }
    ];
    var days = ['monday','tuesday','wednesday','thursday','friday'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My School Meal Plan', 'Pack vs buy — decided ahead of time', '#0ea5e9'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('input', { type: 'date', value: form.weekOf, onChange: function(e) { setForm(Object.assign({}, form, { weekOf: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
          days.map(function(d) {
            return nlH('div', { key: d, style: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 } },
              nlH('label', { style: { fontSize: 12, color: '#075985', fontWeight: 700, alignSelf: 'center' } }, d.charAt(0).toUpperCase() + d.slice(1)),
              nlSelect({ value: form[d], onChange: function(e) {
                var nf = Object.assign({}, form); nf[d] = e.target.value;
                setForm(nf);
              } }, decision_opts)
            );
          }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (cafeteria menu, what I\'m packing)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save week plan')
        )
      ),
      weeks.length === 0
        ? nlEmpty('No plans yet. Sunday-night planning prevents morning chaos.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            weeks.map(function(w) {
              return nlH('div', { key: w.id, style: { padding: 10, borderRadius: 8, background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#075985' } }, '📅 Week of ' + w.weekOf),
                  nlH('button', { onClick: function() { remove(w.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, fontSize: 10, textAlign: 'center' } },
                  days.map(function(d) {
                    return nlH('div', { key: d, style: { padding: 6, borderRadius: 6, background: '#fff', border: '1px solid #bae6fd' } },
                      nlH('div', { style: { fontWeight: 700, color: '#075985', fontSize: 9, textTransform: 'uppercase' } }, d.slice(0, 3)),
                      nlH('div', { style: { fontSize: 14, marginTop: 2 } }, (decision_opts.find(function(o) { return o.value === w[d]; }) || { label: '' }).label.split(' ')[0])
                    );
                  })
                ),
                w.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 6, fontStyle: 'italic' } }, w.notes) : null
              );
            })
          ),
      nlEvidenceFooter('USDA School Meal Program meets ⅓ daily nutrient needs at reduced/free price. Mix of pack + buy often works best — packing what cafeteria does poorly, buying what they do well.')
    );
  }

  // 50) PersonalLunchSwap — track swaps with friends
  function PersonalLunchSwap(props) {
    if (!R_NL) return null;
    var data = props.data || { swaps: [] };
    var setData = props.setData;
    var swaps = data.swaps || [];
    var fs = R_NL.useState({ friend: '', whatTheyHad: '', whatIHad: '', verdict: '', cultural: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.friend.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ swaps: [n].concat(swaps) });
      setForm({ friend: '', whatTheyHad: '', whatIHad: '', verdict: '', cultural: '' });
    }
    function remove(id) { setData({ swaps: swaps.filter(function(s) { return s.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Lunch Swaps', 'Sharing food with friends is cultural exchange', '#f97316'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.friend, onChange: function(e) { setForm(Object.assign({}, form, { friend: e.target.value })); }, placeholder: 'Friend' }),
          nlInput({ value: form.whatTheyHad, onChange: function(e) { setForm(Object.assign({}, form, { whatTheyHad: e.target.value })); }, placeholder: 'What they had' }),
          nlInput({ value: form.whatIHad, onChange: function(e) { setForm(Object.assign({}, form, { whatIHad: e.target.value })); }, placeholder: 'What I had' }),
          nlInput({ value: form.verdict, onChange: function(e) { setForm(Object.assign({}, form, { verdict: e.target.value })); }, placeholder: 'What I tasted/learned' }),
          nlInput({ value: form.cultural, onChange: function(e) { setForm(Object.assign({}, form, { cultural: e.target.value })); }, placeholder: 'Cultural background (if shared)' }),
          nlBtn({ onClick: add }, '+ Log swap')
        )
      ),
      swaps.length === 0
        ? nlEmpty('No swaps yet. Lunch-table swaps are some of the most casual cultural exchange around.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            swaps.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#fff7ed', borderLeft: '4px solid #f97316' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#7c2d12' } }, '🔄 with ' + s.friend),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(s.date)),
                    nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 4 } }, '🍱 They: ' + s.whatTheyHad + ' · I: ' + s.whatIHad),
                s.verdict ? nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 2, fontStyle: 'italic' } }, '👅 ' + s.verdict) : null,
                s.cultural ? nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 2 } }, '🌍 ' + s.cultural) : null
              );
            })
          ),
      nlEvidenceFooter('Lunchroom dynamics research: food-sharing builds peer connection and food literacy. Both are protective against disordered eating + isolation.')
    );
  }

  // 51) PersonalCafeteriaScan — what's offered today
  function PersonalCafeteriaScan(props) {
    if (!R_NL) return null;
    var data = props.data || { scans: [] };
    var setData = props.setData;
    var scans = data.scans || [];
    var fs = R_NL.useState({ items: '', chose: '', missedOpportunity: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.items.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ scans: [n].concat(scans) });
      setForm({ items: '', chose: '', missedOpportunity: '', notes: '' });
    }
    function remove(id) { setData({ scans: scans.filter(function(s) { return s.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Cafeteria Scan', 'Track what\'s offered + what you actually choose', '#06b6d4'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlTextarea({ value: form.items, onChange: function(e) { setForm(Object.assign({}, form, { items: e.target.value })); }, placeholder: "What's offered today (entire menu)", rows: 3 }),
          nlInput({ value: form.chose, onChange: function(e) { setForm(Object.assign({}, form, { chose: e.target.value })); }, placeholder: 'What I chose' }),
          nlInput({ value: form.missedOpportunity, onChange: function(e) { setForm(Object.assign({}, form, { missedOpportunity: e.target.value })); }, placeholder: 'What looked good I skipped (optional)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log scan')
        )
      ),
      scans.length === 0
        ? nlEmpty('No scans logged. Useful for finding patterns ("I always default to pizza" etc.)')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            scans.slice(0, 20).map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 8, borderRadius: 8, background: '#ecfeff', borderLeft: '3px solid #06b6d4' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#155e75' } }, '🏫 ' + s.chose),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(s.date)),
                    nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2, whiteSpace: 'pre-wrap' } }, '📋 Menu: ' + s.items),
                s.missedOpportunity ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, '👀 Skipped: ' + s.missedOpportunity) : null,
                s.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, s.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Choice-architecture research (Thaler + Sunstein): default choices ("first thing I see") dominate. Cafeteria scanning before choosing increases vegetable/fruit selection.')
    );
  }

  // 52) PersonalSchoolBreakfast — make breakfast a habit
  function PersonalSchoolBreakfast(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ ate: 'yes', what: '', source: 'home', whyNot: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ ate: 'yes', what: '', source: 'home', whyNot: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var source_opts = [
      { value: 'home', label: '🏠 Home' },
      { value: 'school', label: '🏫 School breakfast' },
      { value: 'buy', label: '🛍 Bought out' },
      { value: 'pickup', label: '🚗 Grabbed on the way' }
    ];
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekLogs = logs.filter(function(l) { return new Date(l.date) >= weekAgo; });
    var ateCount = weekLogs.filter(function(l) { return l.ate === 'yes'; }).length;
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Breakfast Tracker', 'Brain fuel for morning learning', '#facc15'),
      nlBodyNote(),
      nlCard({ style: { background: '#fefce8', border: '1px solid #fde047' } },
        nlH('strong', { style: { fontSize: 14, color: '#854d0e' } }, 'Last 7 days: ate breakfast ' + ateCount + '/' + weekLogs.length + ' tracked days'),
        nlH('div', { style: { fontSize: 11, color: '#854d0e', marginTop: 4 } }, 'AAP: regular breakfast linked to better attention, mood, and academic performance — especially in adolescents.')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'flex', gap: 6 } },
            ['yes','no'].map(function(v) {
              return nlH('button', { key: v, onClick: function() { setForm(Object.assign({}, form, { ate: v })); }, style: { flex: 1, padding: 8, borderRadius: 6, border: '1px solid #fde047', background: form.ate === v ? '#fef9c3' : '#fff', color: '#854d0e', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, v === 'yes' ? '✓ Ate breakfast' : '✗ Skipped');
            })
          ),
          form.ate === 'yes' ? nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            nlInput({ value: form.what, onChange: function(e) { setForm(Object.assign({}, form, { what: e.target.value })); }, placeholder: 'What I ate' }),
            nlSelect({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); } }, source_opts)
          ) : nlInput({ value: form.whyNot, onChange: function(e) { setForm(Object.assign({}, form, { whyNot: e.target.value })); }, placeholder: 'Why? (rushed, not hungry, no food, etc.)' }),
          nlBtn({ onClick: add }, '+ Log today')
        )
      ),
      logs.length === 0
        ? nlEmpty('No breakfast logs yet. Track for a week and see the morning pattern.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              var color = l.ate === 'yes' ? '#facc15' : '#dc2626';
              var bg = l.ate === 'yes' ? '#fefce8' : '#fef2f2';
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: bg, borderLeft: '3px solid ' + color } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: l.ate === 'yes' ? '#854d0e' : '#7f1d1d' } }, l.ate === 'yes' ? '☀ ' + l.what : '⏭ Skipped'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.ate === 'yes' ? nlH('div', { style: { fontSize: 10, color: '#854d0e', marginTop: 2 } }, (source_opts.find(function(o) { return o.value === l.source; }) || { label: l.source }).label) : (l.whyNot ? nlH('div', { style: { fontSize: 10, color: '#7f1d1d', marginTop: 2, fontStyle: 'italic' } }, l.whyNot) : null)
              );
            })
          ),
      nlEvidenceFooter('USDA + AAP: school breakfast program (BIC, "Breakfast in the Classroom") increases participation 40-80% over traditional cafeteria-only. Adolescent breakfast skippers report lower attention, higher mood volatility, more afternoon crashes.')
    );
  }

  // 53) PersonalLockerSnack — emergency snacks
  function PersonalLockerSnack(props) {
    if (!R_NL) return null;
    var data = props.data || { snacks: [] };
    var setData = props.setData;
    var snacks = data.snacks || [];
    var fs = R_NL.useState({ snack: '', purpose: 'energy', expiry: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.snack.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ snacks: [n].concat(snacks) });
      setForm({ snack: '', purpose: 'energy', expiry: '' });
    }
    function remove(id) { setData({ snacks: snacks.filter(function(s) { return s.id !== id; }) }); }
    var purpose_opts = [
      { value: 'energy', label: '⚡ Quick energy' },
      { value: 'protein', label: '💪 Protein boost' },
      { value: 'hunger', label: '🍴 Hold over hunger' },
      { value: 'bgsugar', label: '🩸 Blood sugar (medical)' },
      { value: 'comfort', label: '💜 Comfort' }
    ];
    var ideas = [
      { name: 'Granola bar', why: 'shelf stable, mixed macros' },
      { name: 'Trail mix (1 oz)', why: 'protein + fiber + fat' },
      { name: 'Apple', why: 'fiber + slow energy' },
      { name: 'Beef jerky', why: 'protein punch' },
      { name: 'Nut butter packet', why: 'fat + protein, no fridge' },
      { name: 'Crackers', why: 'quick + bland' },
      { name: 'Glucose tablet', why: 'medical (diabetes)' },
      { name: 'Cheese stick', why: 'protein (if fridge avail)' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Locker Snack Stash', 'Emergency fuel for when class runs late', '#fb923c'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.snack, onChange: function(e) { setForm(Object.assign({}, form, { snack: e.target.value })); }, placeholder: 'Snack' }),
          nlSelect({ value: form.purpose, onChange: function(e) { setForm(Object.assign({}, form, { purpose: e.target.value })); } }, purpose_opts),
          nlH('input', { type: 'date', value: form.expiry, onChange: function(e) { setForm(Object.assign({}, form, { expiry: e.target.value })); }, placeholder: 'Expiry', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
          nlBtn({ onClick: add }, '+ Add stash item')
        )
      ),
      nlCard({ style: { background: '#fff7ed', border: '1px dashed #fdba74' } },
        nlH('strong', { style: { fontSize: 11, color: '#9a3412', display: 'block', marginBottom: 6 } }, '💡 Stash ideas (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          ideas.map(function(i) {
            return nlH('button', { key: i.name, onClick: function() { setForm(Object.assign({}, form, { snack: i.name })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #fdba74', background: '#fff', fontSize: 11, color: '#7c2d12', cursor: 'pointer' } },
              nlH('strong', null, i.name), ' — ', i.why
            );
          })
        )
      ),
      snacks.length === 0
        ? nlEmpty('Stash is empty. Even 2-3 shelf-stable snacks save you on long days.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            snacks.map(function(s) {
              var expSoon = s.expiry && (new Date(s.expiry).getTime() - Date.now()) < 86400000 * 14;
              return nlH('div', { key: s.id, style: { padding: 8, borderRadius: 6, background: expSoon ? '#fef3c7' : '#fff7ed', display: 'flex', justifyContent: 'space-between' } },
                nlH('div', { style: { fontSize: 12, color: '#7c2d12' } },
                  nlH('strong', null, s.snack), ' — ',
                  (purpose_opts.find(function(o) { return o.value === s.purpose; }) || { label: s.purpose }).label,
                  s.expiry ? nlH('span', { style: { marginLeft: 6, fontSize: 10 } }, '(exp ' + s.expiry + (expSoon ? ' ⚠' : '') + ')') : null
                ),
                nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
              );
            })
          ),
      nlEvidenceFooter('Hypoglycemia + adolescent attention research: bridging snacks (every 3-4 hrs) prevent glucose dips that hit attention + mood hardest. For T1D students with diabetes, emergency glucose is medically required — not optional.')
    );
  }

  // 54) PersonalAfterSchoolFuel — sports/club fuel
  function PersonalAfterSchoolFuel(props) {
    if (!R_NL) return null;
    var data = props.data || { plans: [] };
    var setData = props.setData;
    var plans = data.plans || [];
    var fs = R_NL.useState({ activity: '', preFuel: '', timing: '30', duringFuel: '', postFuel: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.activity.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ plans: [n].concat(plans) });
      setForm({ activity: '', preFuel: '', timing: '30', duringFuel: '', postFuel: '', notes: '' });
    }
    function remove(id) { setData({ plans: plans.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My After-School Fuel Plan', 'Pre / during / post — designed for your activity', '#8b5cf6'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.activity, onChange: function(e) { setForm(Object.assign({}, form, { activity: e.target.value })); }, placeholder: 'Activity (sport, club, marching band)' }),
          nlInput({ value: form.preFuel, onChange: function(e) { setForm(Object.assign({}, form, { preFuel: e.target.value })); }, placeholder: 'Pre-fuel (what + when)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#6b21a8', fontWeight: 700, marginBottom: 4 } }, 'Eat pre-fuel ' + form.timing + ' min before'),
            nlH('input', { type: 'range', min: 15, max: 180, step: 15, value: form.timing, onChange: function(e) { setForm(Object.assign({}, form, { timing: e.target.value })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.duringFuel, onChange: function(e) { setForm(Object.assign({}, form, { duringFuel: e.target.value })); }, placeholder: 'During (water + carbs if >60 min)' }),
          nlInput({ value: form.postFuel, onChange: function(e) { setForm(Object.assign({}, form, { postFuel: e.target.value })); }, placeholder: 'Recovery (within 30-60 min after)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save fuel plan')
        )
      ),
      plans.length === 0
        ? nlEmpty('No fuel plans. Each activity benefits from a designed plan.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            plans.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#faf5ff', borderLeft: '4px solid #8b5cf6' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#6b21a8' } }, '🏃 ' + p.activity),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                p.preFuel ? nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, '⏰ ' + p.timing + ' min before: ' + p.preFuel) : null,
                p.duringFuel ? nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, '⚡ During: ' + p.duringFuel) : null,
                p.postFuel ? nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, '🔧 Recovery: ' + p.postFuel) : null,
                p.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, p.notes) : null
              );
            })
          ),
      nlEvidenceFooter('ACSM + IOC consensus statements: athletes who plan pre/during/post fueling perform 5-15% better and recover faster. Adolescent under-fueling (esp. female athletes — RED-S) is a top sports medicine concern.')
    );
  }

  // 55) PersonalTestDayFuel — test/exam day fuel
  function PersonalTestDayFuel(props) {
    if (!R_NL) return null;
    var data = props.data || { plans: [] };
    var setData = props.setData;
    var plans = data.plans || [];
    var fs = R_NL.useState({ testName: '', breakfast: '', duringSnack: '', postReward: '', sleepGoal: '8', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.testName.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ plans: [n].concat(plans) });
      setForm({ testName: '', breakfast: '', duringSnack: '', postReward: '', sleepGoal: '8', notes: '' });
    }
    function remove(id) { setData({ plans: plans.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Test-Day Fuel Plan', 'Brain runs on glucose + sleep — not last-minute cramming + caffeine', '#dc2626'),
      nlCard({ style: { background: '#fef2f2', border: '1px solid #fecaca' } },
        nlH('strong', { style: { fontSize: 12, color: '#7f1d1d', display: 'block', marginBottom: 6 } }, 'Test-day basics (NIH cognitive neuroscience)'),
        nlH('ul', { style: { fontSize: 11, color: '#7f1d1d', lineHeight: 1.6, paddingLeft: 18, margin: 0 } },
          nlH('li', null, 'Sleep > caffeine. 8+ hrs the night before > any energy drink.'),
          nlH('li', null, 'Eat a real breakfast 60-90 min before the test. Carbs + protein + a little fat.'),
          nlH('li', null, 'Hydrate — dehydration cuts attention 10-20% (Adan 2012).'),
          nlH('li', null, 'Avoid sugar-only spikes; they crash 60-90 min later (mid-test).'),
          nlH('li', null, 'A bridging snack at 90+ min into a long test = sustained attention.')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.testName, onChange: function(e) { setForm(Object.assign({}, form, { testName: e.target.value })); }, placeholder: 'Test/exam name' }),
          nlInput({ value: form.breakfast, onChange: function(e) { setForm(Object.assign({}, form, { breakfast: e.target.value })); }, placeholder: 'Day-of breakfast' }),
          nlInput({ value: form.duringSnack, onChange: function(e) { setForm(Object.assign({}, form, { duringSnack: e.target.value })); }, placeholder: 'Mid-test snack (if allowed)' }),
          nlInput({ value: form.postReward, onChange: function(e) { setForm(Object.assign({}, form, { postReward: e.target.value })); }, placeholder: 'Post-test (non-food celebration ok!)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700, marginBottom: 4 } }, 'Sleep goal: ' + form.sleepGoal + 'hrs the night before'),
            nlH('input', { type: 'range', min: 6, max: 10, step: 0.5, value: form.sleepGoal, onChange: function(e) { setForm(Object.assign({}, form, { sleepGoal: e.target.value })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (anxiety strategies, what worked before)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save test-day plan')
        )
      ),
      plans.length === 0
        ? nlEmpty('No test plans. Even a quick plan beats winging it at 7am.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            plans.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#fef2f2', borderLeft: '4px solid #dc2626' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 13, color: '#7f1d1d' } }, '📝 ' + p.testName),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                p.breakfast ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d' } }, '☀ Breakfast: ' + p.breakfast) : null,
                p.duringSnack ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d' } }, '🍫 Mid-test: ' + p.duringSnack) : null,
                p.postReward ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d' } }, '🎉 After: ' + p.postReward) : null,
                nlH('div', { style: { fontSize: 11, color: '#7f1d1d' } }, '💤 Sleep goal: ' + p.sleepGoal + 'hrs'),
                p.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, p.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Cognitive performance research (Walker, Why We Sleep; Adan 2012 dehydration & cognition): test-day performance is shaped 24-48 hrs before the test, not the morning of. Sleep > breakfast > caffeine in that order of priority.')
    );
  }

  // 56) PersonalLongDayPack — packing for long school days
  function PersonalLongDayPack(props) {
    if (!R_NL) return null;
    var data = props.data || { packs: [] };
    var setData = props.setData;
    var packs = data.packs || [];
    var fs = R_NL.useState({ event: '', breakfastTime: '07:00', lastMealTime: '20:00', items: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.event.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ packs: [n].concat(packs) });
      setForm({ event: '', breakfastTime: '07:00', lastMealTime: '20:00', items: '' });
    }
    function remove(id) { setData({ packs: packs.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Long-Day Pack', 'Field trips, performances, away games', '#0891b2'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.event, onChange: function(e) { setForm(Object.assign({}, form, { event: e.target.value })); }, placeholder: 'Event' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#155e75', fontWeight: 700 } }, 'Breakfast time'),
              nlH('input', { type: 'time', value: form.breakfastTime, onChange: function(e) { setForm(Object.assign({}, form, { breakfastTime: e.target.value })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#155e75', fontWeight: 700 } }, 'Last meal'),
              nlH('input', { type: 'time', value: form.lastMealTime, onChange: function(e) { setForm(Object.assign({}, form, { lastMealTime: e.target.value })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            )
          ),
          nlTextarea({ value: form.items, onChange: function(e) { setForm(Object.assign({}, form, { items: e.target.value })); }, placeholder: 'Items I\'m packing (1 per line)', rows: 5 }),
          nlBtn({ onClick: add }, '+ Save long-day pack')
        )
      ),
      packs.length === 0
        ? nlEmpty('No packs yet. Mid-event hunger is preventable, and avoiding it = better mood + focus.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            packs.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #0891b2' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#155e75' } }, '🎒 ' + p.event),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2 } }, '🕒 ' + p.breakfastTime + ' → ' + p.lastMealTime),
                nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 4, whiteSpace: 'pre-wrap' } }, '🥡 ' + p.items)
              );
            })
          ),
      nlEvidenceFooter('Sports nutrition + youth performance literature: bridging snacks every 2-3 hours during long events maintain glucose and prevent the late-event "hit the wall." Hydration is co-equal — bring water + snacks.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 7: ATHLETIC / SPORTS NUTRITION (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 57) PersonalSportFuelLog — pre/during/post training
  function PersonalSportFuelLog(props) {
    if (!R_NL) return null;
    var data = props.data || { sessions: [] };
    var setData = props.setData;
    var sessions = data.sessions || [];
    var fs = R_NL.useState({ activity: '', duration: 60, intensity: 'moderate', pre: '', during: '', post: '', felt: 5 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.activity.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ sessions: [n].concat(sessions) });
      setForm({ activity: '', duration: 60, intensity: 'moderate', pre: '', during: '', post: '', felt: 5 });
    }
    function remove(id) { setData({ sessions: sessions.filter(function(s) { return s.id !== id; }) }); }
    var int_opts = [
      { value: 'easy', label: '🚶 Easy' },
      { value: 'moderate', label: '🏃 Moderate' },
      { value: 'hard', label: '💨 Hard' },
      { value: 'race', label: '🏆 Race/game' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Sport Fuel Log', 'Track fueling around training to learn what works', '#dc2626'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.activity, onChange: function(e) { setForm(Object.assign({}, form, { activity: e.target.value })); }, placeholder: 'Activity / sport' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 } },
            nlH('input', { type: 'number', value: form.duration, onChange: function(e) { setForm(Object.assign({}, form, { duration: parseInt(e.target.value) || 0 })); }, placeholder: 'min', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlSelect({ value: form.intensity, onChange: function(e) { setForm(Object.assign({}, form, { intensity: e.target.value })); } }, int_opts)
          ),
          nlInput({ value: form.pre, onChange: function(e) { setForm(Object.assign({}, form, { pre: e.target.value })); }, placeholder: 'Pre-fuel' }),
          nlInput({ value: form.during, onChange: function(e) { setForm(Object.assign({}, form, { during: e.target.value })); }, placeholder: 'During (if >60 min)' }),
          nlInput({ value: form.post, onChange: function(e) { setForm(Object.assign({}, form, { post: e.target.value })); }, placeholder: 'Post (within 30-60 min)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700, marginBottom: 4 } }, 'How I felt during: ' + form.felt + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.felt, onChange: function(e) { setForm(Object.assign({}, form, { felt: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlBtn({ onClick: add }, '+ Log session')
        )
      ),
      sessions.length === 0
        ? nlEmpty('No sessions logged. Pattern emerges after ~10 logged sessions.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            sessions.slice(0, 30).map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 8, borderRadius: 8, background: '#fef2f2', borderLeft: '3px solid #dc2626' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7f1d1d' } }, '🏃 ' + s.activity + ' · ' + s.duration + ' min · ' + (int_opts.find(function(o) { return o.value === s.intensity; }) || { label: '' }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(s.date)),
                    nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                s.pre ? nlH('div', { style: { fontSize: 10, color: '#7f1d1d', marginTop: 2 } }, '⏰ Pre: ' + s.pre) : null,
                s.during ? nlH('div', { style: { fontSize: 10, color: '#7f1d1d' } }, '⚡ During: ' + s.during) : null,
                s.post ? nlH('div', { style: { fontSize: 10, color: '#7f1d1d' } }, '🔧 Post: ' + s.post) : null,
                nlH('div', { style: { fontSize: 10, color: '#7f1d1d', fontWeight: 700, marginTop: 2 } }, 'Felt: ' + s.felt + '/10')
              );
            })
          ),
      nlEvidenceFooter('Sports nutrition (ISSN/ACSM): individual fueling response varies. Log + experiment = your personal protocol. Common patterns: too little pre = bonk, too much = GI distress, no recovery = compounded fatigue.')
    );
  }

  // 58) PersonalSweatRateLog — fluid loss tracking
  function PersonalSweatRateLog(props) {
    if (!R_NL) return null;
    var data = props.data || { tests: [] };
    var setData = props.setData;
    var tests = data.tests || [];
    var fs = R_NL.useState({ activity: '', conditions: '', preMassKg: '', postMassKg: '', fluidIntakeMl: 0, durationMin: 60 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var pre = parseFloat(form.preMassKg); var post = parseFloat(form.postMassKg);
      if (isNaN(pre) || isNaN(post) || form.durationMin <= 0) return;
      var lossKg = pre - post;
      var rateMlHr = Math.round(((lossKg * 1000) + form.fluidIntakeMl) / (form.durationMin / 60));
      var n = { id: nl_id(), date: nl_today(), activity: form.activity, conditions: form.conditions, lossKg: lossKg.toFixed(2), rateMlHr: rateMlHr, fluidIntakeMl: form.fluidIntakeMl, durationMin: form.durationMin };
      setData({ tests: [n].concat(tests) });
      setForm({ activity: '', conditions: '', preMassKg: '', postMassKg: '', fluidIntakeMl: 0, durationMin: 60 });
    }
    function remove(id) { setData({ tests: tests.filter(function(t) { return t.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Sweat Rate Tests', 'Personalized fluid replacement (NATA standard)', '#0284c7'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#dbeafe', border: '1px solid #93c5fd', marginBottom: 12, fontSize: 11, color: '#1e40af', lineHeight: 1.55 } },
        nlH('strong', null, '🔬 How to test: '),
        '1) Weigh yourself nude before practice. 2) Weigh again after. 3) Track fluids you drank during. 4) The calculator does the rest.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.activity, onChange: function(e) { setForm(Object.assign({}, form, { activity: e.target.value })); }, placeholder: 'Activity' }),
          nlInput({ value: form.conditions, onChange: function(e) { setForm(Object.assign({}, form, { conditions: e.target.value })); }, placeholder: 'Conditions (hot, humid, indoor)' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Pre-mass (kg)'),
              nlH('input', { type: 'number', step: '0.1', value: form.preMassKg, onChange: function(e) { setForm(Object.assign({}, form, { preMassKg: e.target.value })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Post-mass (kg)'),
              nlH('input', { type: 'number', step: '0.1', value: form.postMassKg, onChange: function(e) { setForm(Object.assign({}, form, { postMassKg: e.target.value })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            )
          ),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Fluid drunk (mL)'),
              nlH('input', { type: 'number', value: form.fluidIntakeMl, onChange: function(e) { setForm(Object.assign({}, form, { fluidIntakeMl: parseInt(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Duration (min)'),
              nlH('input', { type: 'number', value: form.durationMin, onChange: function(e) { setForm(Object.assign({}, form, { durationMin: parseInt(e.target.value) || 60 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            )
          ),
          nlBtn({ onClick: add }, '+ Calculate + save')
        )
      ),
      tests.length === 0
        ? nlEmpty('No sweat tests. Worth doing 3-4 over a season to learn your personal sweat rate.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            tests.map(function(t) {
              return nlH('div', { key: t.id, style: { padding: 10, borderRadius: 8, background: '#dbeafe', borderLeft: '4px solid #0284c7' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#1e40af' } }, '💧 ' + t.activity + ' — ' + t.rateMlHr + ' mL/hr'),
                  nlH('button', { onClick: function() { remove(t.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 2 } }, 'Loss: ' + t.lossKg + ' kg over ' + t.durationMin + ' min · drank ' + t.fluidIntakeMl + ' mL'),
                t.conditions ? nlH('div', { style: { fontSize: 10, color: '#1e40af' } }, '🌡 ' + t.conditions) : null,
                nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 2 } }, '💡 Replace ' + Math.round(t.rateMlHr * 1.25) + ' mL per hour of similar exercise')
              );
            })
          ),
      nlEvidenceFooter('NATA position statement on hydration: ~1.25× body-mass loss replacement post-exercise (e.g., 1 kg lost = 1250 mL). Sweat rate varies 2-4× between individuals — generic "8 cups" advice underfuels heavy sweaters.')
    );
  }

  // 59) PersonalRecoveryMeal — post-workout recovery
  function PersonalRecoveryMeal(props) {
    if (!R_NL) return null;
    var data = props.data || { meals: [] };
    var setData = props.setData;
    var meals = data.meals || [];
    var fs = R_NL.useState({ workout: '', meal: '', minutesAfter: '30', felt: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.workout.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ meals: [n].concat(meals) });
      setForm({ workout: '', meal: '', minutesAfter: '30', felt: 5, notes: '' });
    }
    function remove(id) { setData({ meals: meals.filter(function(m) { return m.id !== id; }) }); }
    var ideas = [
      'Chocolate milk + apple', 'PB sandwich + milk', 'Yogurt + granola + berries',
      'Tuna + crackers', 'Rice + chicken + veggies', 'Smoothie (banana + protein powder + milk)',
      'Eggs + toast + fruit', 'Pasta + meat sauce'
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Recovery Meals', 'Post-workout = 20g protein + carbs within 30-60 min', '#16a34a'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.workout, onChange: function(e) { setForm(Object.assign({}, form, { workout: e.target.value })); }, placeholder: 'What I did' }),
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Recovery meal' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            ideas.map(function(i) {
              return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { meal: i })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #86efac', background: form.meal === i ? '#dcfce7' : '#fff', fontSize: 10, color: '#166534', fontWeight: 700, cursor: 'pointer' } }, i);
            })
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4 } }, 'Eaten ' + form.minutesAfter + ' min after workout'),
            nlH('input', { type: 'range', min: 0, max: 180, step: 15, value: form.minutesAfter, onChange: function(e) { setForm(Object.assign({}, form, { minutesAfter: e.target.value })); }, style: { width: '100%' } })
          ),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4 } }, 'How I felt next day: ' + form.felt + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.felt, onChange: function(e) { setForm(Object.assign({}, form, { felt: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (soreness, energy next-day, sleep)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log recovery meal')
        )
      ),
      meals.length === 0
        ? nlEmpty('No recovery meals logged. Recovery fueling shows up in tomorrow\'s training.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            meals.slice(0, 30).map(function(m) {
              return nlH('div', { key: m.id, style: { padding: 8, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#166534' } }, '🔧 ' + m.workout),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(m.date)),
                    nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2 } }, '🍽 ' + m.meal + ' (' + m.minutesAfter + ' min after)'),
                nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2 } }, 'Next-day feel: ' + m.felt + '/10'),
                m.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, m.notes) : null
              );
            })
          ),
      nlEvidenceFooter('IOC consensus: recovery window 30-60 min post-exercise prioritizes 20-25g protein + 1g carb/kg body mass for glycogen + protein synthesis. Chocolate milk research (Pritchett et al.) is gold standard for affordability + completeness.')
    );
  }

  // 60) PersonalGameDayPlan — game-day fuel
  function PersonalGameDayPlan(props) {
    if (!R_NL) return null;
    var data = props.data || { plans: [] };
    var setData = props.setData;
    var plans = data.plans || [];
    var fs = R_NL.useState({ event: '', gameTime: '15:00', breakfast: '', preGame: '', bench: '', halftime: '', post: '', superstition: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.event.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ plans: [n].concat(plans) });
      setForm({ event: '', gameTime: '15:00', breakfast: '', preGame: '', bench: '', halftime: '', post: '', superstition: '' });
    }
    function remove(id) { setData({ plans: plans.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Game-Day Plan', 'Race/game-day routine that works for YOU', '#ea580c'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.event, onChange: function(e) { setForm(Object.assign({}, form, { event: e.target.value })); }, placeholder: 'Event / opponent' }),
          nlH('input', { type: 'time', value: form.gameTime, onChange: function(e) { setForm(Object.assign({}, form, { gameTime: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
          nlInput({ value: form.breakfast, onChange: function(e) { setForm(Object.assign({}, form, { breakfast: e.target.value })); }, placeholder: 'Day-of breakfast (familiar foods only)' }),
          nlInput({ value: form.preGame, onChange: function(e) { setForm(Object.assign({}, form, { preGame: e.target.value })); }, placeholder: 'Pre-game (2-3 hrs before)' }),
          nlInput({ value: form.bench, onChange: function(e) { setForm(Object.assign({}, form, { bench: e.target.value })); }, placeholder: 'Bench/sideline (water + small carbs)' }),
          nlInput({ value: form.halftime, onChange: function(e) { setForm(Object.assign({}, form, { halftime: e.target.value })); }, placeholder: 'Halftime fuel' }),
          nlInput({ value: form.post, onChange: function(e) { setForm(Object.assign({}, form, { post: e.target.value })); }, placeholder: 'Post-game recovery' }),
          nlInput({ value: form.superstition, onChange: function(e) { setForm(Object.assign({}, form, { superstition: e.target.value })); }, placeholder: 'Personal ritual (lucky food, music — totally ok)' }),
          nlBtn({ onClick: add }, '+ Save game-day plan')
        )
      ),
      plans.length === 0
        ? nlEmpty('No game plans. Routine reduces game-day anxiety.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            plans.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 12, borderRadius: 10, background: '#fff7ed', borderLeft: '5px solid #ea580c' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 14, color: '#7c2d12' } }, '🏆 ' + p.event + ' · ' + p.gameTime),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                p.breakfast ? nlH('div', { style: { fontSize: 11, color: '#7c2d12' } }, '☀ Breakfast: ' + p.breakfast) : null,
                p.preGame ? nlH('div', { style: { fontSize: 11, color: '#7c2d12' } }, '⏰ Pre-game: ' + p.preGame) : null,
                p.bench ? nlH('div', { style: { fontSize: 11, color: '#7c2d12' } }, '🪑 Bench: ' + p.bench) : null,
                p.halftime ? nlH('div', { style: { fontSize: 11, color: '#7c2d12' } }, '⏸ Halftime: ' + p.halftime) : null,
                p.post ? nlH('div', { style: { fontSize: 11, color: '#7c2d12' } }, '🔧 Post: ' + p.post) : null,
                p.superstition ? nlH('div', { style: { fontSize: 11, color: '#7c2d12', fontStyle: 'italic' } }, '✨ ' + p.superstition) : null
              );
            })
          ),
      nlEvidenceFooter('Sports psych + nutrition: routine + familiar foods on game day. NEVER try a new food on game day. Rituals (lucky pre-game meal, music, etc.) reduce performance anxiety — biology + psychology both matter.')
    );
  }

  // 61) PersonalLongRunFuel — endurance fueling
  function PersonalLongRunFuel(props) {
    if (!R_NL) return null;
    var data = props.data || { runs: [] };
    var setData = props.setData;
    var runs = data.runs || [];
    var fs = R_NL.useState({ distance: '', preFuel: '', duringFuel: '', cramping: false, glycogenWall: false, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.distance.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ runs: [n].concat(runs) });
      setForm({ distance: '', preFuel: '', duringFuel: '', cramping: false, glycogenWall: false, notes: '' });
    }
    function remove(id) { setData({ runs: runs.filter(function(r) { return r.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Endurance Fuel Log', 'Long runs/rides need carbs every 30-45 min after 60 min', '#a855f7'),
      nlCard({ style: { background: '#faf5ff', border: '1px solid #d8b4fe' } },
        nlH('strong', { style: { fontSize: 12, color: '#6b21a8', display: 'block', marginBottom: 6 } }, 'Endurance fueling reference (ACSM)'),
        nlH('ul', { style: { fontSize: 11, color: '#6b21a8', lineHeight: 1.6, paddingLeft: 18, margin: 0 } },
          nlH('li', null, '<60 min: water is enough'),
          nlH('li', null, '60-90 min: 30g carbs/hr (e.g., 1 gel, banana, sports drink)'),
          nlH('li', null, '90-150 min: 60g carbs/hr (gel + sports drink)'),
          nlH('li', null, '>150 min: 90g carbs/hr (multiple sources to use both glucose + fructose transporters)'),
          nlH('li', null, 'Sodium: 300-700 mg/L of sports drink in heat')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.distance, onChange: function(e) { setForm(Object.assign({}, form, { distance: e.target.value })); }, placeholder: 'Distance/duration' }),
          nlInput({ value: form.preFuel, onChange: function(e) { setForm(Object.assign({}, form, { preFuel: e.target.value })); }, placeholder: 'Pre-fuel' }),
          nlTextarea({ value: form.duringFuel, onChange: function(e) { setForm(Object.assign({}, form, { duringFuel: e.target.value })); }, placeholder: 'During fuel (what + when)', rows: 2 }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b21a8' } },
            nlH('input', { type: 'checkbox', checked: form.cramping, onChange: function(e) { setForm(Object.assign({}, form, { cramping: e.target.checked })); } }),
            nlH('span', null, 'Got cramps? (likely sodium or hydration)')
          ),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b21a8' } },
            nlH('input', { type: 'checkbox', checked: form.glycogenWall, onChange: function(e) { setForm(Object.assign({}, form, { glycogenWall: e.target.checked })); } }),
            nlH('span', null, 'Hit "the wall"? (likely under-fueled carbs)')
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log long run')
        )
      ),
      runs.length === 0
        ? nlEmpty('No long runs logged. Each one teaches your gut a little more.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            runs.slice(0, 20).map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 8, borderRadius: 8, background: '#faf5ff', borderLeft: '3px solid #a855f7' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#6b21a8' } }, '🏃 ' + r.distance),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(r.date)),
                    nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                r.preFuel ? nlH('div', { style: { fontSize: 10, color: '#6b21a8', marginTop: 2 } }, 'Pre: ' + r.preFuel) : null,
                r.duringFuel ? nlH('div', { style: { fontSize: 10, color: '#6b21a8' } }, 'During: ' + r.duringFuel) : null,
                (r.cramping || r.glycogenWall) ? nlH('div', { style: { fontSize: 10, color: '#dc2626', marginTop: 2 } }, (r.cramping ? '⚠ Cramps ' : '') + (r.glycogenWall ? '⚠ Wall' : '')) : null,
                r.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, r.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Endurance fueling research (Burke et al, Jeukendrup): the gut is trainable. Practice fueling on training runs, not race day. Multi-source carbs (glucose + fructose) outperform single source at high rates.')
    );
  }

  // 62) PersonalElectrolyteTracker — sodium/potassium for athletes
  function PersonalElectrolyteTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ source: '', sodium: 0, potassium: 0, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ source: '', sodium: 0, potassium: 0, notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var ref = [
      { name: 'Gatorade (20 oz)', na: 270, k: 75 },
      { name: 'Liquid IV stick', na: 500, k: 380 },
      { name: 'Pickle (1 spear)', na: 700, k: 30 },
      { name: 'Banana', na: 1, k: 422 },
      { name: 'Pretzels (1 oz)', na: 350, k: 50 },
      { name: 'Salted nut bar', na: 200, k: 100 },
      { name: 'Coconut water (8 oz)', na: 60, k: 600 }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Electrolyte Log', 'For athletes in heat, long sweat sessions, or salty sweat', '#10b981'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Source' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#065f46', fontWeight: 700 } }, 'Sodium (mg)'),
              nlH('input', { type: 'number', value: form.sodium, onChange: function(e) { setForm(Object.assign({}, form, { sodium: parseInt(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#065f46', fontWeight: 700 } }, 'Potassium (mg)'),
              nlH('input', { type: 'number', value: form.potassium, onChange: function(e) { setForm(Object.assign({}, form, { potassium: parseInt(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            )
          ),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            ref.map(function(r) {
              return nlH('button', { key: r.name, onClick: function() { setForm({ source: r.name, sodium: r.na, potassium: r.k, notes: '' }); }, style: { padding: '5px 8px', borderRadius: 6, border: '1px solid #6ee7b7', background: '#fff', color: '#065f46', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, r.name + ' (Na' + r.na + '/K' + r.k + ')');
            })
          ),
          nlBtn({ onClick: add }, '+ Log electrolyte source')
        )
      ),
      logs.length === 0
        ? nlEmpty('No electrolyte logs. Most needed for sweat sessions >60 min in heat, or for salty sweaters.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 6, background: '#ecfdf5', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
                nlH('span', { style: { color: '#065f46' } }, l.source + ' · Na ' + l.sodium + 'mg · K ' + l.potassium + 'mg'),
                nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
              );
            })
          ),
      nlEvidenceFooter('NATA, IOC: sodium replacement matters most for long, hot, salty-sweat sessions. "Salt stain" on shirts after exercise = candidate for extra sodium. Hyponatremia (over-watering without sodium) is a real risk in long endurance events.')
    );
  }

  // 63) PersonalGlycogen — carb-loading awareness
  function PersonalGlycogen(props) {
    if (!R_NL) return null;
    var data = props.data || { events: [] };
    var setData = props.setData;
    var events = data.events || [];
    var fs = R_NL.useState({ event: '', daysOut: 3, carbsPerKg: '6', plan: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.event.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ events: [n].concat(events) });
      setForm({ event: '', daysOut: 3, carbsPerKg: '6', plan: '', notes: '' });
    }
    function remove(id) { setData({ events: events.filter(function(e) { return e.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Carb-Loading Plan', 'Pre-race glycogen prep (>90-min events)', '#f59e0b'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fffbeb', border: '1px solid #fcd34d', marginBottom: 12, fontSize: 11, color: '#78350f', lineHeight: 1.55 } },
        nlH('strong', null, '🔬 Modern carb-load (Bergstrom updated): '),
        '2-3 days before event, 8-12 g carb/kg body weight while tapering training. Older 7-day depletion-load protocols are outdated.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.event, onChange: function(e) { setForm(Object.assign({}, form, { event: e.target.value })); }, placeholder: 'Event' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#78350f', fontWeight: 700, marginBottom: 4 } }, 'Days out: ' + form.daysOut),
            nlH('input', { type: 'range', min: 1, max: 7, value: form.daysOut, onChange: function(e) { setForm(Object.assign({}, form, { daysOut: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.carbsPerKg, onChange: function(e) { setForm(Object.assign({}, form, { carbsPerKg: e.target.value })); }, placeholder: 'Target g carb/kg body (6-12)' }),
          nlTextarea({ value: form.plan, onChange: function(e) { setForm(Object.assign({}, form, { plan: e.target.value })); }, placeholder: 'Plan (meals/snacks for the loading window)', rows: 4 }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save carb-load plan')
        )
      ),
      events.length === 0
        ? nlEmpty('No carb-load plans. Only needed for events >90 min — most school sports do not.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            events.map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 10, borderRadius: 8, background: '#fffbeb', borderLeft: '4px solid #f59e0b' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#78350f' } }, '🏆 ' + e.event + ' (' + e.daysOut + ' days out)'),
                  nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 2 } }, 'Target: ' + e.carbsPerKg + ' g/kg body weight'),
                e.plan ? nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 4, whiteSpace: 'pre-wrap' } }, '📋 ' + e.plan) : null,
                e.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, e.notes) : null
              );
            })
          ),
      nlEvidenceFooter('IOC + Burke 2017: modern carb-load (8-12 g/kg, 36-48 hrs pre-event, with training taper) is more practical and effective than 1980s "depletion-then-load" protocols. Only beneficial for events lasting >90 min at sustained intensity.')
    );
  }

  // 64) PersonalRestDayNutrition — rest-day fuel
  function PersonalRestDayNutrition(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ ate: '', felt: 5, mistake: '', win: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ ate: '', felt: 5, mistake: '', win: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Rest-Day Nutrition Log', 'Rest days still need fuel — recovery happens between sessions', '#0d9488'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#f0fdfa', border: '1px solid #5eead4', marginBottom: 12, fontSize: 11, color: '#0f766e', lineHeight: 1.55 } },
        nlH('strong', null, '⚠ Common mistake: '),
        'restricting on rest days. The body USES rest days to repair from training. Eating noticeably less on rest days slows recovery and trains a destructive pattern (under-fueling).'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlTextarea({ value: form.ate, onChange: function(e) { setForm(Object.assign({}, form, { ate: e.target.value })); }, placeholder: 'What I ate today', rows: 3 }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#0f766e', fontWeight: 700, marginBottom: 4 } }, 'How recovered I felt next training: ' + form.felt + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.felt, onChange: function(e) { setForm(Object.assign({}, form, { felt: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.mistake, onChange: function(e) { setForm(Object.assign({}, form, { mistake: e.target.value })); }, placeholder: 'Mistake to learn from (optional)' }),
          nlInput({ value: form.win, onChange: function(e) { setForm(Object.assign({}, form, { win: e.target.value })); }, placeholder: 'Win to repeat (optional)' }),
          nlBtn({ onClick: add }, '+ Log rest day')
        )
      ),
      logs.length === 0
        ? nlEmpty('No rest-day logs. Compare rest-day fuel to next-training feel — pattern emerges.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#f0fdfa', borderLeft: '3px solid #0d9488' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#0f766e' } }, '🛌 Rest day · felt ' + l.felt + '/10 next session'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.ate ? nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 2, whiteSpace: 'pre-wrap' } }, '🍴 ' + l.ate) : null,
                l.mistake ? nlH('div', { style: { fontSize: 10, color: '#dc2626', marginTop: 2 } }, '⚠ Mistake: ' + l.mistake) : null,
                l.win ? nlH('div', { style: { fontSize: 10, color: '#15803d', marginTop: 2 } }, '✓ Win: ' + l.win) : null
              );
            })
          ),
      nlEvidenceFooter('RED-S literature (Mountjoy et al., IOC): chronic under-fueling — even at "athlete-appropriate" caloric estimates — causes hormonal disruption, bone loss, fatigue, and performance decline. Most under-fueling happens on rest days.')
    );
  }

  // 65) PersonalSeasonNutrition — in-season/off-season
  function PersonalSeasonNutrition(props) {
    if (!R_NL) return null;
    var data = props.data || { seasons: [] };
    var setData = props.setData;
    var seasons = data.seasons || [];
    var fs = R_NL.useState({ season: 'in-season', sport: '', focus: '', meals: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.sport.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ seasons: [n].concat(seasons) });
      setForm({ season: 'in-season', sport: '', focus: '', meals: '', notes: '' });
    }
    function remove(id) { setData({ seasons: seasons.filter(function(s) { return s.id !== id; }) }); }
    var season_opts = [
      { value: 'in-season', label: '🏆 In-season' },
      { value: 'off-season', label: '🌱 Off-season' },
      { value: 'pre-season', label: '⚡ Pre-season' },
      { value: 'post-season', label: '🌙 Post-season' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Seasonal Nutrition', 'Fuel needs shift across the training year', '#3b82f6'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.sport, onChange: function(e) { setForm(Object.assign({}, form, { sport: e.target.value })); }, placeholder: 'Sport' }),
          nlSelect({ value: form.season, onChange: function(e) { setForm(Object.assign({}, form, { season: e.target.value })); } }, season_opts),
          nlInput({ value: form.focus, onChange: function(e) { setForm(Object.assign({}, form, { focus: e.target.value })); }, placeholder: 'Focus (more carbs / muscle gain / lean strength / maintenance)' }),
          nlTextarea({ value: form.meals, onChange: function(e) { setForm(Object.assign({}, form, { meals: e.target.value })); }, placeholder: 'Typical meals this season', rows: 4 }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save season plan')
        )
      ),
      seasons.length === 0
        ? nlEmpty('No seasonal plans yet. In-season usually = more carbs; off-season = strength + variety.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            seasons.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#dbeafe', borderLeft: '4px solid #3b82f6' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#1e40af' } }, '📅 ' + s.sport + ' — ' + (season_opts.find(function(o) { return o.value === s.season; }) || { label: '' }).label),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                s.focus ? nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 2 } }, '🎯 ' + s.focus) : null,
                s.meals ? nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 4, whiteSpace: 'pre-wrap' } }, '🍴 ' + s.meals) : null,
                s.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, s.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Periodized nutrition (Stellingwerff): athletes have different needs in different training phases. In-season: higher carbs, fuel performance. Off-season: variety, recovery, strength. Don\'t under-fuel any phase.')
    );
  }

  // 66) PersonalCoachConvo — questions to ask coach
  function PersonalCoachConvo(props) {
    if (!R_NL) return null;
    var data = props.data || { questions: [] };
    var setData = props.setData;
    var questions = data.questions || [];
    var fs = R_NL.useState({ topic: '', question: '', priority: 'medium' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.question.trim()) return;
      var n = { id: nl_id(), date: nl_today(), status: 'unasked' };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ questions: [n].concat(questions) });
      setForm({ topic: '', question: '', priority: 'medium' });
    }
    function remove(id) { setData({ questions: questions.filter(function(q) { return q.id !== id; }) }); }
    function markAsked(id, ans) {
      setData({ questions: questions.map(function(q) { return q.id === id ? Object.assign({}, q, { status: 'asked', answer: ans }) : q; }) });
    }
    var examples = [
      'What should I eat 1 hour before practice?',
      'Why am I cramping in the 4th quarter?',
      'How much water should I drink during your hottest practice?',
      'I\'m not gaining muscle even though I lift. Is it nutrition or programming?',
      'I get a stitch when I run after lunch. What should I eat instead?',
      'I\'m vegetarian — is there anything I need to be careful about?',
      'My weight dropped this season. Should I see the trainer?',
      'What\'s your take on protein supplements for high-schoolers?'
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Coach Q&A', 'Save questions to ask your coach or athletic trainer', '#dc2626'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.topic, onChange: function(e) { setForm(Object.assign({}, form, { topic: e.target.value })); }, placeholder: 'Topic' }),
          nlTextarea({ value: form.question, onChange: function(e) { setForm(Object.assign({}, form, { question: e.target.value })); }, placeholder: 'My question', rows: 2 }),
          nlSelect({ value: form.priority, onChange: function(e) { setForm(Object.assign({}, form, { priority: e.target.value })); } }, [
            { value: 'high', label: '🔴 High priority' },
            { value: 'medium', label: '🟡 Medium' },
            { value: 'low', label: '🟢 Low / when convenient' }
          ]),
          nlBtn({ onClick: add }, '+ Save question')
        )
      ),
      nlCard({ style: { background: '#fef2f2', border: '1px dashed #fecaca' } },
        nlH('strong', { style: { fontSize: 11, color: '#7f1d1d', display: 'block', marginBottom: 6 } }, '💡 Example questions (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          examples.map(function(e, i) {
            return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { question: e })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fff', fontSize: 11, color: '#7f1d1d', cursor: 'pointer' } }, e);
          })
        )
      ),
      questions.length === 0
        ? nlEmpty('No questions saved. Coaches expect questions — coaches who don\'t welcome them are red flags.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            questions.map(function(q) {
              var pcolor = q.priority === 'high' ? '#dc2626' : q.priority === 'medium' ? '#f59e0b' : '#10b981';
              return nlH('div', { key: q.id, style: { padding: 10, borderRadius: 8, background: q.status === 'asked' ? '#dcfce7' : '#fef2f2', borderLeft: '4px solid ' + pcolor } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  nlH('strong', { style: { fontSize: 12, color: q.status === 'asked' ? '#166534' : '#7f1d1d' } }, (q.status === 'asked' ? '✓ ' : '⌛ ') + (q.topic ? '[' + q.topic + '] ' : '') + q.question),
                  nlH('button', { onClick: function() { remove(q.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                q.status === 'asked' && q.answer ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 4, fontStyle: 'italic' } }, '💬 ' + q.answer) : nlBtn({ onClick: function() { var ans = prompt('Coach said:'); if (ans) markAsked(q.id, ans); }, variant: 'secondary' }, 'Mark asked + record answer')
              );
            })
          ),
      nlEvidenceFooter('Coach + athlete communication research: athletes who advocate (ask questions, raise concerns) report better team experiences, lower injury rates, and stronger relationships. Coaches want engaged athletes.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 8: ALLERGIES / CONDITIONS (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 67) PersonalAllergenTracker — allergens to avoid
  function PersonalAllergenTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { allergens: [] };
    var setData = props.setData;
    var allergens = data.allergens || [];
    var fs = R_NL.useState({ allergen: '', severity: 'mild', reactionType: '', epipen: false, doctor: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.allergen.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ allergens: [n].concat(allergens) });
      setForm({ allergen: '', severity: 'mild', reactionType: '', epipen: false, doctor: '', notes: '' });
    }
    function remove(id) { setData({ allergens: allergens.filter(function(a) { return a.id !== id; }) }); }
    var sev_opts = [
      { value: 'mild', label: '🟢 Mild (discomfort)' },
      { value: 'moderate', label: '🟡 Moderate (hives, GI)' },
      { value: 'severe', label: '🟠 Severe (swelling, breathing)' },
      { value: 'anaphylaxis', label: '🔴 Anaphylaxis risk' }
    ];
    var top9 = ['Milk', 'Eggs', 'Peanut', 'Tree nuts', 'Soy', 'Wheat', 'Fish', 'Shellfish', 'Sesame'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Allergen Tracker', 'Critical info — share with school, friends, restaurants', '#dc2626'),
      nlH('div', { style: { padding: 12, borderRadius: 8, background: '#fee2e2', border: '2px solid #fca5a5', marginBottom: 12, fontSize: 11, color: '#7f1d1d', lineHeight: 1.55 } },
        nlH('strong', null, '⚠️ Allergy safety: '),
        'If you have severe allergies, this tool is for documentation only. Always carry emergency meds (Epi-Pen) if prescribed. Share allergen card with cafeteria + school nurse + bus driver. In Maine, school nurses can administer epinephrine via standing orders.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.allergen, onChange: function(e) { setForm(Object.assign({}, form, { allergen: e.target.value })); }, placeholder: 'Allergen' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            top9.map(function(a) {
              return nlH('button', { key: a, onClick: function() { setForm(Object.assign({}, form, { allergen: a })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #fca5a5', background: form.allergen === a ? '#fee2e2' : '#fff', fontSize: 10, color: '#7f1d1d', fontWeight: 700, cursor: 'pointer' } }, a);
            })
          ),
          nlSelect({ value: form.severity, onChange: function(e) { setForm(Object.assign({}, form, { severity: e.target.value })); } }, sev_opts),
          nlInput({ value: form.reactionType, onChange: function(e) { setForm(Object.assign({}, form, { reactionType: e.target.value })); }, placeholder: 'My typical reaction' }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7f1d1d' } },
            nlH('input', { type: 'checkbox', checked: form.epipen, onChange: function(e) { setForm(Object.assign({}, form, { epipen: e.target.checked })); } }),
            nlH('strong', null, 'EpiPen prescribed for this allergen')
          ),
          nlInput({ value: form.doctor, onChange: function(e) { setForm(Object.assign({}, form, { doctor: e.target.value })); }, placeholder: 'Allergist (name/contact)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Hidden sources, cross-contact concerns, safe brands', rows: 3 }),
          nlBtn({ onClick: add, variant: 'danger' }, '+ Add allergen')
        )
      ),
      allergens.length === 0
        ? nlEmpty('No allergens logged. If you have none — leave empty. If you do — document them all.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            allergens.map(function(a) {
              var sevc = { mild: '#10b981', moderate: '#f59e0b', severe: '#ea580c', anaphylaxis: '#dc2626' };
              return nlH('div', { key: a.id, style: { padding: 12, borderRadius: 10, background: '#fff', borderLeft: '5px solid ' + (sevc[a.severity] || '#94a3b8') } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 14, color: '#0f172a' } }, '⚠ ' + a.allergen + (a.epipen ? ' 💉' : '')),
                  nlH('button', { onClick: function() { remove(a.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 12, color: sevc[a.severity], fontWeight: 700, marginTop: 2 } }, (sev_opts.find(function(o) { return o.value === a.severity; }) || { label: '' }).label),
                a.reactionType ? nlH('div', { style: { fontSize: 11, color: '#475569', marginTop: 4 } }, '🤒 Reaction: ' + a.reactionType) : null,
                a.doctor ? nlH('div', { style: { fontSize: 11, color: '#475569', marginTop: 2 } }, '🩺 Allergist: ' + a.doctor) : null,
                a.notes ? nlH('div', { style: { fontSize: 11, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, '📝 ' + a.notes) : null
              );
            })
          ),
      nlEvidenceFooter('FALCPA (Food Allergen Labeling and Consumer Protection Act): top 9 allergens must be labeled. FARE + AAP: school 504/IHP plans are legal accommodations for severe food allergies — request one if needed.')
    );
  }

  // 68) PersonalReactionLog — track allergy/intolerance reactions
  function PersonalReactionLog(props) {
    if (!R_NL) return null;
    var data = props.data || { reactions: [] };
    var setData = props.setData;
    var reactions = data.reactions || [];
    var fs = R_NL.useState({ food: '', minutes: 30, symptoms: '', severity: 5, treatment: '', erVisit: false });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ reactions: [n].concat(reactions) });
      setForm({ food: '', minutes: 30, symptoms: '', severity: 5, treatment: '', erVisit: false });
    }
    function remove(id) { setData({ reactions: reactions.filter(function(r) { return r.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Reaction Log', 'Document each reaction — invaluable for allergist visits', '#ea580c'),
      nlCard({ style: { background: '#fed7aa', border: '1px solid #fdba74' } },
        nlH('strong', { style: { fontSize: 12, color: '#7c2d12' } }, '🚨 If reaction is severe: '),
        nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 4 } }, 'Use EpiPen + call 911. Do not wait. Document the event AFTER it\'s resolved.')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Suspected food' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#7c2d12', fontWeight: 700, marginBottom: 4 } }, 'Reaction started ' + form.minutes + ' min after eating'),
            nlH('input', { type: 'range', min: 1, max: 240, step: 5, value: form.minutes, onChange: function(e) { setForm(Object.assign({}, form, { minutes: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.symptoms, onChange: function(e) { setForm(Object.assign({}, form, { symptoms: e.target.value })); }, placeholder: 'Symptoms (hives, GI, breathing, swelling, etc.)', rows: 3 }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#7c2d12', fontWeight: 700, marginBottom: 4 } }, 'Severity: ' + form.severity + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.severity, onChange: function(e) { setForm(Object.assign({}, form, { severity: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.treatment, onChange: function(e) { setForm(Object.assign({}, form, { treatment: e.target.value })); }, placeholder: 'Treatment (Benadryl, EpiPen, none)' }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7c2d12' } },
            nlH('input', { type: 'checkbox', checked: form.erVisit, onChange: function(e) { setForm(Object.assign({}, form, { erVisit: e.target.checked })); } }),
            nlH('span', null, 'Required ER visit')
          ),
          nlBtn({ onClick: add, variant: 'danger' }, '+ Log reaction')
        )
      ),
      reactions.length === 0
        ? nlEmpty('No reactions logged. Share log with allergist or PCP — it speeds diagnosis.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            reactions.slice(0, 30).map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#fed7aa', borderLeft: '4px solid #ea580c' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7c2d12' } }, '⚠ ' + r.food + ' · sev ' + r.severity + '/10' + (r.erVisit ? ' 🚑' : '')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(r.date)),
                    nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 2 } }, '⏱ ' + r.minutes + ' min after eating'),
                r.symptoms ? nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 2 } }, '🤒 ' + r.symptoms) : null,
                r.treatment ? nlH('div', { style: { fontSize: 11, color: '#7c2d12', marginTop: 2 } }, '💊 ' + r.treatment) : null
              );
            })
          ),
      nlEvidenceFooter('FARE + AAAAI: documented reactions accelerate allergy diagnosis. Track timing precisely — onset patterns distinguish IgE allergy (minutes), non-IgE (hours-days), and intolerance (variable).')
    );
  }

  // 69) PersonalMedFoodInteractions — meds + food interactions
  function PersonalMedFoodInteractions(props) {
    if (!R_NL) return null;
    var data = props.data || { meds: [] };
    var setData = props.setData;
    var meds = data.meds || [];
    var fs = R_NL.useState({ medication: '', interaction: '', timing: '', source: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.medication.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ meds: [n].concat(meds) });
      setForm({ medication: '', interaction: '', timing: '', source: '' });
    }
    function remove(id) { setData({ meds: meds.filter(function(m) { return m.id !== id; }) }); }
    var common = [
      { med: 'Stimulant ADHD meds (e.g., Adderall, Vyvanse)', i: 'Reduce appetite. Eat breakfast BEFORE first dose; add protein-dense evening meal when med wears off.' },
      { med: 'SSRIs (sertraline, fluoxetine)', i: 'May cause GI upset early; take with food to ease.' },
      { med: 'Iron supplements', i: 'Take with vitamin C (juice) for absorption. Avoid with calcium/dairy or coffee within 2 hrs.' },
      { med: 'Levothyroxine (thyroid)', i: 'Empty stomach, 30-60 min before food. Calcium/iron supplements blunt absorption.' },
      { med: 'Birth control pills', i: 'Generally no food interactions; some antibiotics reduce effectiveness.' },
      { med: 'Warfarin (blood thinner)', i: 'Keep vitamin K intake (greens) CONSISTENT week to week — sudden changes shift dosing.' },
      { med: 'Grapefruit + statins', i: 'Grapefruit blocks CYP3A4 enzyme — can dangerously raise statin levels.' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Med-Food Interactions', 'Document interactions for safe meal planning', '#7c3aed'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#ede9fe', border: '1px solid #c4b5fd', marginBottom: 12, fontSize: 11, color: '#5b21b6', lineHeight: 1.55 } },
        nlH('strong', null, '⚕ Always confirm with pharmacist or prescriber. '),
        'This tool is a personal note — not a substitute for medical advice. Some interactions are dangerous; some are convenience-only.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.medication, onChange: function(e) { setForm(Object.assign({}, form, { medication: e.target.value })); }, placeholder: 'Medication' }),
          nlTextarea({ value: form.interaction, onChange: function(e) { setForm(Object.assign({}, form, { interaction: e.target.value })); }, placeholder: 'Food interaction note', rows: 3 }),
          nlInput({ value: form.timing, onChange: function(e) { setForm(Object.assign({}, form, { timing: e.target.value })); }, placeholder: 'Timing rule (e.g., 30 min before food)' }),
          nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Source (pharmacist, MD, drug label)' }),
          nlBtn({ onClick: add }, '+ Add interaction note')
        )
      ),
      nlCard({ style: { background: '#faf5ff', border: '1px dashed #d8b4fe' } },
        nlH('strong', { style: { fontSize: 11, color: '#5b21b6', display: 'block', marginBottom: 6 } }, '💡 Common interactions (tap to use as template)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          common.map(function(c, i) {
            return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { medication: c.med, interaction: c.i })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #d8b4fe', background: '#fff', fontSize: 11, color: '#5b21b6', cursor: 'pointer' } },
              nlH('strong', null, c.med), nlH('br', null), c.i
            );
          })
        )
      ),
      meds.length === 0
        ? nlEmpty('No interactions logged. Ask your pharmacist for a "medication review" — they\'ll list food interactions for free.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            meds.map(function(m) {
              return nlH('div', { key: m.id, style: { padding: 10, borderRadius: 8, background: '#ede9fe', borderLeft: '4px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#5b21b6' } }, '💊 ' + m.medication),
                  nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                m.interaction ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 4 } }, m.interaction) : null,
                m.timing ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, '⏰ ' + m.timing) : null,
                m.source ? nlH('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2, fontStyle: 'italic' } }, 'Source: ' + m.source) : null
              );
            })
          ),
      nlEvidenceFooter('FDA Drug-Food Interactions: many interactions are well-documented and stable. Pharmacist consultations are free at most chain pharmacies — use them. Bring all your meds + supplements to the conversation.')
    );
  }

  // 70) PersonalCeliacTracker — gluten tracking
  function PersonalCeliacTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ food: '', situation: 'restaurant', glutenStatus: 'gf', symptoms: '', severity: 0 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ food: '', situation: 'restaurant', glutenStatus: 'gf', symptoms: '', severity: 0 });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var sit_opts = [
      { value: 'home', label: '🏠 Home' },
      { value: 'restaurant', label: '🍽 Restaurant' },
      { value: 'school', label: '🏫 School' },
      { value: 'friend', label: '👥 Friend\'s house' },
      { value: 'travel', label: '✈ Travel' }
    ];
    var gluten_opts = [
      { value: 'gf', label: '✓ Certified GF' },
      { value: 'gfclaim', label: '🟡 GF labeled (uncertain prep)' },
      { value: 'crosscontam', label: '⚠ Cross-contam risk' },
      { value: 'gluten', label: '✗ Contained gluten (unknowing)' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Celiac/Gluten Log', 'Track exposures + symptoms — useful for GI specialist', '#ca8a04'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fef9c3', border: '1px solid #fde047', marginBottom: 12, fontSize: 11, color: '#713f12', lineHeight: 1.55 } },
        nlH('strong', null, '💛 Note: '),
        'Celiac disease ≠ gluten sensitivity ≠ wheat allergy. Each requires different management. Get a CONFIRMED diagnosis (celiac panel BEFORE going gluten-free) before adopting GF.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Food eaten' }),
          nlSelect({ value: form.situation, onChange: function(e) { setForm(Object.assign({}, form, { situation: e.target.value })); } }, sit_opts),
          nlSelect({ value: form.glutenStatus, onChange: function(e) { setForm(Object.assign({}, form, { glutenStatus: e.target.value })); } }, gluten_opts),
          nlInput({ value: form.symptoms, onChange: function(e) { setForm(Object.assign({}, form, { symptoms: e.target.value })); }, placeholder: 'Symptoms (if any)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#713f12', fontWeight: 700, marginBottom: 4 } }, 'Severity: ' + form.severity + '/10'),
            nlH('input', { type: 'range', min: 0, max: 10, value: form.severity, onChange: function(e) { setForm(Object.assign({}, form, { severity: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlBtn({ onClick: add }, '+ Log entry')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs. Pattern of cross-contam vs intentional exposure becomes clear over time.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fef9c3', borderLeft: '3px solid #ca8a04' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#713f12' } }, '🌾 ' + l.food),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#713f12', marginTop: 2 } }, (sit_opts.find(function(o) { return o.value === l.situation; }) || { label: '' }).label + ' · ' + (gluten_opts.find(function(o) { return o.value === l.glutenStatus; }) || { label: '' }).label),
                l.symptoms ? nlH('div', { style: { fontSize: 11, color: '#713f12', marginTop: 2 } }, '🤒 ' + l.symptoms + (l.severity > 0 ? ' (sev ' + l.severity + ')' : '')) : null
              );
            })
          ),
      nlEvidenceFooter('Beyond Celiac + Celiac Disease Foundation: micro-exposures (cross-contamination) can damage celiac villi without obvious symptoms. School 504 plans + restaurant disclosure cards are essential tools.')
    );
  }

  // 71) PersonalLactoseTracker — dairy tracking
  function PersonalLactoseTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ food: '', lactaid: false, symptoms: '', severity: 0 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ food: '', lactaid: false, symptoms: '', severity: 0 });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Lactose Log', 'Track tolerance + replacement calcium sources', '#0ea5e9'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#e0f2fe', border: '1px solid #38bdf8', marginBottom: 12, fontSize: 11, color: '#075985', lineHeight: 1.55 } },
        nlH('strong', null, '💙 Lactose intolerance facts: '),
        '70% of world adults are lactose intolerant — that\'s normal mammalian biology, not a disease. Most people tolerate small amounts; hard cheese + yogurt have minimal lactose. Get calcium from leafy greens, fortified plant milks, sardines (with bones), tofu.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Dairy food' }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#075985' } },
            nlH('input', { type: 'checkbox', checked: form.lactaid, onChange: function(e) { setForm(Object.assign({}, form, { lactaid: e.target.checked })); } }),
            nlH('span', null, 'Took Lactaid pill (lactase enzyme)')
          ),
          nlInput({ value: form.symptoms, onChange: function(e) { setForm(Object.assign({}, form, { symptoms: e.target.value })); }, placeholder: 'Symptoms (gas, bloat, cramps)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#075985', fontWeight: 700, marginBottom: 4 } }, 'Severity: ' + form.severity + '/10'),
            nlH('input', { type: 'range', min: 0, max: 10, value: form.severity, onChange: function(e) { setForm(Object.assign({}, form, { severity: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlBtn({ onClick: add }, '+ Log dairy entry')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs. Pattern of tolerable vs intolerable dairy emerges.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#e0f2fe', borderLeft: '3px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#075985' } }, '🥛 ' + l.food + (l.lactaid ? ' 💊' : '')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.symptoms ? nlH('div', { style: { fontSize: 11, color: '#075985', marginTop: 2 } }, '🤒 ' + l.symptoms + ' (sev ' + l.severity + ')') : null
              );
            })
          ),
      nlEvidenceFooter('NIH NIDDK: most people with lactose intolerance can tolerate 12g lactose/day (~1 cup milk) split across the day. Lactaid (lactase enzyme) lets you eat dairy without symptoms. No need to give up cheese — hard cheese has <1g/oz.')
    );
  }

  // 72) PersonalIBSFoodLog — IBS triggers
  function PersonalIBSFoodLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ meal: '', fodmap: 'unknown', stress: 5, sleep: 7, symptoms: '', timing: 'within-2hr' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ meal: '', fodmap: 'unknown', stress: 5, sleep: 7, symptoms: '', timing: 'within-2hr' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var fod_opts = [
      { value: 'unknown', label: '❓ FODMAP unknown' },
      { value: 'high', label: '🔴 High FODMAP' },
      { value: 'low', label: '🟢 Low FODMAP' },
      { value: 'mod', label: '🟡 Moderate' }
    ];
    var timing_opts = [
      { value: 'within-1hr', label: 'Within 1 hr' },
      { value: 'within-2hr', label: '1-2 hr later' },
      { value: 'within-6hr', label: '2-6 hr later' },
      { value: 'overnight', label: 'Overnight/next AM' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My IBS Food + Trigger Log', 'Food + stress + sleep all shape IBS — log them together', '#16a34a'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', marginBottom: 12, fontSize: 11, color: '#166534', lineHeight: 1.55 } },
        nlH('strong', null, '🌿 IBS reality: '),
        'Triggers vary by person. Common offenders (high-FODMAP foods): onion, garlic, wheat, dairy, beans, certain fruits. Stress + poor sleep = often as triggering as food. Working with a dietitian on a structured low-FODMAP trial (4-6 wks) is the evidence-based approach.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal' }),
          nlSelect({ value: form.fodmap, onChange: function(e) { setForm(Object.assign({}, form, { fodmap: e.target.value })); } }, fod_opts),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#166534', fontWeight: 700 } }, 'Stress today: ' + form.stress + '/10'),
              nlH('input', { type: 'range', min: 1, max: 10, value: form.stress, onChange: function(e) { setForm(Object.assign({}, form, { stress: parseInt(e.target.value) })); }, style: { width: '100%' } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#166534', fontWeight: 700 } }, 'Sleep: ' + form.sleep + ' hrs'),
              nlH('input', { type: 'range', min: 3, max: 12, step: 0.5, value: form.sleep, onChange: function(e) { setForm(Object.assign({}, form, { sleep: parseFloat(e.target.value) })); }, style: { width: '100%' } })
            )
          ),
          nlInput({ value: form.symptoms, onChange: function(e) { setForm(Object.assign({}, form, { symptoms: e.target.value })); }, placeholder: 'Symptoms (bloating, cramping, urgency, etc.)' }),
          nlSelect({ value: form.timing, onChange: function(e) { setForm(Object.assign({}, form, { timing: e.target.value })); } }, timing_opts),
          nlBtn({ onClick: add }, '+ Log IBS entry')
        )
      ),
      logs.length === 0
        ? nlEmpty('No IBS entries. Patterns become visible after ~2 weeks of consistent logging.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#166534' } }, '🦠 ' + l.meal),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#166534', marginTop: 2 } }, (fod_opts.find(function(o) { return o.value === l.fodmap; }) || { label: '' }).label + ' · stress ' + l.stress + ' · sleep ' + l.sleep + 'hr'),
                l.symptoms ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2 } }, '🤒 ' + l.symptoms + ' (' + (timing_opts.find(function(o) { return o.value === l.timing; }) || { label: l.timing }).label + ')') : null
              );
            })
          ),
      nlEvidenceFooter('Monash University (originator of low-FODMAP diet) + AGA: structured FODMAP elimination + reintroduction with a dietitian is gold standard. DIY elimination diets risk over-restriction. Brain-gut axis means stress management is equally important.')
    );
  }

  // 73) PersonalDiabetesLog — for T1D students
  function PersonalDiabetesLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ meal: '', carbs: 0, preBG: 0, postBG: 0, insulinUnits: 0, exercise: false, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ meal: '', carbs: 0, preBG: 0, postBG: 0, insulinUnits: 0, exercise: false, notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My T1D Meal Log', 'For Type 1 diabetic students: meal + insulin + BG response', '#7c3aed'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#ede9fe', border: '1px solid #c4b5fd', marginBottom: 12, fontSize: 11, color: '#5b21b6', lineHeight: 1.55 } },
        nlH('strong', null, '💜 For T1D students: '),
        'This is a documentation tool, not a clinical replacement. Always work with your endocrinologist + diabetes care team. Schools must provide accommodations under IDEA and 504 — request a Diabetes Medical Management Plan.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#5b21b6', fontWeight: 700 } }, 'Carbs (g)'),
              nlH('input', { type: 'number', value: form.carbs, onChange: function(e) { setForm(Object.assign({}, form, { carbs: parseInt(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#5b21b6', fontWeight: 700 } }, 'Pre BG'),
              nlH('input', { type: 'number', value: form.preBG, onChange: function(e) { setForm(Object.assign({}, form, { preBG: parseInt(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#5b21b6', fontWeight: 700 } }, 'Post BG'),
              nlH('input', { type: 'number', value: form.postBG, onChange: function(e) { setForm(Object.assign({}, form, { postBG: parseInt(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
            )
          ),
          nlH('div', null,
            nlH('label', { style: { fontSize: 11, color: '#5b21b6', fontWeight: 700 } }, 'Insulin (units)'),
            nlH('input', { type: 'number', step: '0.5', value: form.insulinUnits, onChange: function(e) { setForm(Object.assign({}, form, { insulinUnits: parseFloat(e.target.value) || 0 })); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5b21b6' } },
            nlH('input', { type: 'checkbox', checked: form.exercise, onChange: function(e) { setForm(Object.assign({}, form, { exercise: e.target.checked })); } }),
            nlH('span', null, 'Exercise around this meal')
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (extended bolus, fat affecting absorption, etc.)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log T1D meal')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs. Sharing with endo helps tune basal/bolus ratios and ICR.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#ede9fe', borderLeft: '3px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#5b21b6' } }, '🩸 ' + l.meal + ' · ' + l.carbs + 'g carbs · ' + l.insulinUnits + 'u'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, 'BG: ' + l.preBG + ' → ' + l.postBG + (l.exercise ? ' 🏃' : '')),
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('ADA + JDRF: meal logging accelerates pump-setting optimization. Share patterns with your CDE/endo at quarterly visits. Schools must provide nursing support + accommodations under federal disability law.')
    );
  }

  // 74) PersonalMigraineFoodLog — migraine triggers
  function PersonalMigraineFoodLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ migraine: false, foods24h: '', sleep: 7, stress: 5, hormones: 'na', weather: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ migraine: false, foods24h: '', sleep: 7, stress: 5, hormones: 'na', weather: '', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var horm_opts = [
      { value: 'na', label: 'N/A' },
      { value: 'menstrual', label: 'Menstrual' },
      { value: 'ovulation', label: 'Ovulation' },
      { value: 'pms', label: 'PMS' }
    ];
    var common_triggers = ['Aged cheese', 'Red wine', 'Chocolate', 'Citrus', 'Cured meats (nitrates)', 'MSG', 'Aspartame', 'Caffeine (or withdrawal)', 'Skipping meals'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Migraine Trigger Log', 'Food + sleep + hormones + weather — log them all for pattern', '#7c2d12'),
      nlCard({ style: { background: '#fef2f2', border: '1px solid #fecaca' } },
        nlH('strong', { style: { fontSize: 12, color: '#7f1d1d' } }, '💡 Common food triggers (individual!): '),
        nlH('div', { style: { fontSize: 11, color: '#7f1d1d', marginTop: 4 } }, common_triggers.join(' · '))
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#7f1d1d', fontWeight: 800 } },
            nlH('input', { type: 'checkbox', checked: form.migraine, onChange: function(e) { setForm(Object.assign({}, form, { migraine: e.target.checked })); } }),
            nlH('span', null, '🤕 Migraine today')
          ),
          nlTextarea({ value: form.foods24h, onChange: function(e) { setForm(Object.assign({}, form, { foods24h: e.target.value })); }, placeholder: 'Foods in last 24 hours', rows: 3 }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700 } }, 'Sleep last night: ' + form.sleep + ' hrs'),
              nlH('input', { type: 'range', min: 3, max: 12, step: 0.5, value: form.sleep, onChange: function(e) { setForm(Object.assign({}, form, { sleep: parseFloat(e.target.value) })); }, style: { width: '100%' } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700 } }, 'Stress: ' + form.stress + '/10'),
              nlH('input', { type: 'range', min: 1, max: 10, value: form.stress, onChange: function(e) { setForm(Object.assign({}, form, { stress: parseInt(e.target.value) })); }, style: { width: '100%' } })
            )
          ),
          nlSelect({ value: form.hormones, onChange: function(e) { setForm(Object.assign({}, form, { hormones: e.target.value })); } }, horm_opts),
          nlInput({ value: form.weather, onChange: function(e) { setForm(Object.assign({}, form, { weather: e.target.value })); }, placeholder: 'Weather (pressure changes are common triggers)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log day')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs. Migraine triggers are highly individual; 6-8 weeks of data reveals YOURS.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: l.migraine ? '#fee2e2' : '#f0fdf4', borderLeft: '3px solid ' + (l.migraine ? '#dc2626' : '#16a34a') } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: l.migraine ? '#7f1d1d' : '#166534' } }, l.migraine ? '🤕 Migraine day' : '✓ No migraine'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, 'Sleep ' + l.sleep + 'hr · Stress ' + l.stress + (l.hormones !== 'na' ? ' · ' + l.hormones : '') + (l.weather ? ' · ' + l.weather : '')),
                l.foods24h ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, '🍴 ' + l.foods24h) : null
              );
            })
          ),
      nlEvidenceFooter('AMF + AAN: migraine trigger logs are the diagnostic gold standard for trigger identification. Bring 8 weeks of logs to a headache specialist. Stress + sleep are often more powerful triggers than any single food.')
    );
  }

  // 75) PersonalPCOSLog — PCOS-relevant nutrition tracking
  function PersonalPCOSLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ meal: '', glycemicLoad: 'low', protein: 0, fiber: 0, movement: 'rest', energy: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.meal.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ meal: '', glycemicLoad: 'low', protein: 0, fiber: 0, movement: 'rest', energy: 5, notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var gl_opts = [
      { value: 'low', label: '🟢 Low GL (protein/fat heavy)' },
      { value: 'mod', label: '🟡 Moderate (mixed)' },
      { value: 'high', label: '🔴 High GL (refined carbs)' }
    ];
    var mv_opts = [
      { value: 'rest', label: '🛌 Rest' },
      { value: 'walk', label: '🚶 Walking' },
      { value: 'strength', label: '💪 Strength' },
      { value: 'cardio', label: '🏃 Cardio' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My PCOS Nutrition Log', 'PCOS-aware tracking — insulin sensitivity + inflammation', '#be185d'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fdf2f8', border: '1px solid #f9a8d4', marginBottom: 12, fontSize: 11, color: '#9f1239', lineHeight: 1.55 } },
        nlH('strong', null, '🌸 PCOS evidence-based nutrition: '),
        'Moderating refined carbs + adding protein/fiber/healthy fat supports insulin sensitivity. Strength training is more effective than cardio alone. This is NOT a "weight-loss diet" — restriction worsens PCOS hormonally. Work with an RD specializing in PCOS.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.meal, onChange: function(e) { setForm(Object.assign({}, form, { meal: e.target.value })); }, placeholder: 'Meal' }),
          nlSelect({ value: form.glycemicLoad, onChange: function(e) { setForm(Object.assign({}, form, { glycemicLoad: e.target.value })); } }, gl_opts),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#9f1239', fontWeight: 700 } }, 'Protein (g): ' + form.protein),
              nlH('input', { type: 'range', min: 0, max: 60, value: form.protein, onChange: function(e) { setForm(Object.assign({}, form, { protein: parseInt(e.target.value) })); }, style: { width: '100%' } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#9f1239', fontWeight: 700 } }, 'Fiber (g): ' + form.fiber),
              nlH('input', { type: 'range', min: 0, max: 20, value: form.fiber, onChange: function(e) { setForm(Object.assign({}, form, { fiber: parseInt(e.target.value) })); }, style: { width: '100%' } })
            )
          ),
          nlSelect({ value: form.movement, onChange: function(e) { setForm(Object.assign({}, form, { movement: e.target.value })); } }, mv_opts),
          nlH('div', null,
            nlH('label', { style: { fontSize: 11, color: '#9f1239', fontWeight: 700 } }, 'Energy after: ' + form.energy + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.energy, onChange: function(e) { setForm(Object.assign({}, form, { energy: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (cycle phase, mood, cravings)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log PCOS meal')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs. Tracking glycemic load + protein + movement helps you see what supports YOUR insulin sensitivity.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fdf2f8', borderLeft: '3px solid #be185d' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#9f1239' } }, '🌸 ' + l.meal + ' · ' + (gl_opts.find(function(o) { return o.value === l.glycemicLoad; }) || { label: '' }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#9f1239', marginTop: 2 } }, 'P ' + l.protein + 'g · Fib ' + l.fiber + 'g · ' + (mv_opts.find(function(o) { return o.value === l.movement; }) || { label: '' }).label + ' · E ' + l.energy + '/10'),
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Cochrane reviews + ASRM: balanced macros + strength training improve PCOS insulin sensitivity. Anti-restriction approach (HAES + intuitive eating + PCOS) avoids the metabolic backlash of chronic dieting.')
    );
  }

  // 76) PersonalMedicalNotes — store medical/dietary instructions
  function PersonalMedicalNotes(props) {
    if (!R_NL) return null;
    var data = props.data || { notes: [] };
    var setData = props.setData;
    var notes = data.notes || [];
    var fs = R_NL.useState({ provider: '', date: nl_today(), topic: '', instructions: '', followup: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.topic.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ notes: [n].concat(notes) });
      setForm({ provider: '', date: nl_today(), topic: '', instructions: '', followup: '' });
    }
    function remove(id) { setData({ notes: notes.filter(function(n) { return n.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Medical Notes', 'Save medical/RD/specialist instructions in one place', '#0891b2'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.provider, onChange: function(e) { setForm(Object.assign({}, form, { provider: e.target.value })); }, placeholder: 'Provider (Dr/RD/RN name + role)' }),
          nlH('input', { type: 'date', value: form.date, onChange: function(e) { setForm(Object.assign({}, form, { date: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
          nlInput({ value: form.topic, onChange: function(e) { setForm(Object.assign({}, form, { topic: e.target.value })); }, placeholder: 'Topic' }),
          nlTextarea({ value: form.instructions, onChange: function(e) { setForm(Object.assign({}, form, { instructions: e.target.value })); }, placeholder: 'Instructions (in their words)', rows: 5 }),
          nlInput({ value: form.followup, onChange: function(e) { setForm(Object.assign({}, form, { followup: e.target.value })); }, placeholder: 'Follow-up (next visit, labs, etc.)' }),
          nlBtn({ onClick: add }, '+ Save note')
        )
      ),
      notes.length === 0
        ? nlEmpty('No notes saved. After every visit, write down what was said — memory fades fast.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            notes.map(function(n) {
              return nlH('div', { key: n.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #0891b2' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#155e75' } }, '🩺 ' + n.topic + ' — ' + n.provider),
                  nlH('button', { onClick: function() { remove(n.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2 } }, '📅 ' + n.date),
                n.instructions ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 6, whiteSpace: 'pre-wrap' } }, n.instructions) : null,
                n.followup ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 6, fontStyle: 'italic' } }, '⏭ ' + n.followup) : null
              );
            })
          ),
      nlEvidenceFooter('Health-literacy research: 40-80% of medical info is forgotten immediately after visits. Writing instructions in the patient\'s own words while still in the room improves adherence by 2-3x.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 9: MENTAL HEALTH × FOOD (10 tools, NEDA-aligned) ═══
  // ══════════════════════════════════════════════════════════════════

  // 77) PersonalNourishVsRestrict — restriction awareness
  function PersonalNourishVsRestrict(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ choice: '', leaningTo: 'nourish', why: '', whatIDid: '', felt: 5 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.choice.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ choice: '', leaningTo: 'nourish', why: '', whatIDid: '', felt: 5 });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var lean_opts = [
      { value: 'nourish', label: '💚 Nourish (more)' },
      { value: 'middle', label: '⚖ Middle ground' },
      { value: 'restrict', label: '⚠ Restrict (less)' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nourish vs Restrict Awareness', 'Notice the pull. No shame, just awareness.', '#0d9488'),
      nlNEDABanner(),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#f0fdfa', border: '1px solid #5eead4', marginBottom: 12, fontSize: 11, color: '#0f766e', lineHeight: 1.55 } },
        nlH('strong', null, '💚 What this is: '),
        'In any food decision, there\'s a "nourish" voice and (often) a "restrict" voice. Noticing which one\'s talking is the first step to choosing your real values over diet-culture rules.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.choice, onChange: function(e) { setForm(Object.assign({}, form, { choice: e.target.value })); }, placeholder: 'Food choice I was making' }),
          nlSelect({ value: form.leaningTo, onChange: function(e) { setForm(Object.assign({}, form, { leaningTo: e.target.value })); } }, lean_opts),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'What the pull was (what the voice said)' }),
          nlInput({ value: form.whatIDid, onChange: function(e) { setForm(Object.assign({}, form, { whatIDid: e.target.value })); }, placeholder: 'What I actually did' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#0f766e', fontWeight: 700, marginBottom: 4 } }, 'How I felt with my choice: ' + form.felt + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.felt, onChange: function(e) { setForm(Object.assign({}, form, { felt: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlBtn({ onClick: add }, '+ Log awareness')
        )
      ),
      entries.length === 0
        ? nlEmpty('Awareness > rules. Logging "I noticed I wanted to restrict but chose to nourish" is the practice.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#f0fdfa', borderLeft: '3px solid #0d9488' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#0f766e' } }, e.choice + ' · ' + (lean_opts.find(function(o) { return o.value === e.leaningTo; }) || { label: '' }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.why ? nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 2 } }, '💭 ' + e.why) : null,
                e.whatIDid ? nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 2 } }, '✓ Did: ' + e.whatIDid) : null,
                nlH('div', { style: { fontSize: 10, color: '#0f766e', marginTop: 2, fontWeight: 700 } }, 'Felt ' + e.felt + '/10')
              );
            })
          ),
      nlEvidenceFooter('Anti-diet research (Bacon, Aphramor — HAES; Tribole & Resch — Intuitive Eating): chronic restriction predicts weight cycling + eating disorder onset. Awareness of restrictive vs nourishing voices is the practice that interrupts the cycle.')
    );
  }

  // 78) PersonalFoodAnxietyLog — log food anxiety
  function PersonalFoodAnxietyLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ situation: '', anxiety: 5, thoughts: '', coped: '', outcome: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.situation.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ situation: '', anxiety: 5, thoughts: '', coped: '', outcome: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Anxiety Log', 'Capture the moments — anxiety + thoughts + coping', '#7c3aed'),
      nlNEDABanner(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.situation, onChange: function(e) { setForm(Object.assign({}, form, { situation: e.target.value })); }, placeholder: 'Situation (food, setting, people)' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#5b21b6', fontWeight: 700, marginBottom: 4 } }, 'Anxiety level: ' + form.anxiety + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.anxiety, onChange: function(e) { setForm(Object.assign({}, form, { anxiety: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.thoughts, onChange: function(e) { setForm(Object.assign({}, form, { thoughts: e.target.value })); }, placeholder: 'Thoughts running through (try to capture exact words)', rows: 3 }),
          nlInput({ value: form.coped, onChange: function(e) { setForm(Object.assign({}, form, { coped: e.target.value })); }, placeholder: 'How I coped' }),
          nlInput({ value: form.outcome, onChange: function(e) { setForm(Object.assign({}, form, { outcome: e.target.value })); }, placeholder: 'What happened (did anxiety pass?)' }),
          nlBtn({ onClick: add }, '+ Log anxiety')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs yet. Naming food anxiety reduces its grip — Pennebaker writing research.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#faf5ff', borderLeft: '3px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#5b21b6' } }, '😰 ' + l.situation + ' (' + l.anxiety + '/10)'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.thoughts ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + l.thoughts) : null,
                l.coped ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, '🛠 Coped: ' + l.coped) : null,
                l.outcome ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, '✓ Outcome: ' + l.outcome) : null
              );
            })
          ),
      nlEvidenceFooter('CBT for food anxiety (Fairburn — CBT-E): naming the anxious thought reduces its power. Behavioral exposure (eating the food anyway, observing anxiety passes) extinguishes the conditioned response over time.')
    );
  }

  // 79) PersonalEDRecoveryMeal — meals after disordered eating moments
  function PersonalEDRecoveryMeal(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ momentDescription: '', recoveryMeal: '', whoSupported: '', selfCompassion: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.momentDescription.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ momentDescription: '', recoveryMeal: '', whoSupported: '', selfCompassion: 5, notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Recovery Meal Log', 'After a hard ED moment — eating + self-compassion', '#10b981'),
      nlNEDABanner(),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', marginBottom: 12, fontSize: 11, color: '#065f46', lineHeight: 1.55 } },
        nlH('strong', null, '💚 If you\'re in ED recovery: '),
        'You are not alone. Recovery is non-linear. After a hard moment (binge, restriction, purge urge), the most important thing is to eat your next regular meal. This log helps you mark that act of self-care.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlTextarea({ value: form.momentDescription, onChange: function(e) { setForm(Object.assign({}, form, { momentDescription: e.target.value })); }, placeholder: 'What happened (you can be brief — even one word)', rows: 2 }),
          nlInput({ value: form.recoveryMeal, onChange: function(e) { setForm(Object.assign({}, form, { recoveryMeal: e.target.value })); }, placeholder: 'My next meal (anything counts)' }),
          nlInput({ value: form.whoSupported, onChange: function(e) { setForm(Object.assign({}, form, { whoSupported: e.target.value })); }, placeholder: 'Who supported me (or "myself")' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#065f46', fontWeight: 700, marginBottom: 4 } }, 'Self-compassion I offered myself: ' + form.selfCompassion + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.selfCompassion, onChange: function(e) { setForm(Object.assign({}, form, { selfCompassion: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (only if helpful)', rows: 2 }),
          nlBtn({ onClick: add, variant: 'success' }, '✓ Log recovery meal')
        )
      ),
      logs.length === 0
        ? nlEmpty('No entries. The act of logging the NEXT meal after a hard moment is itself recovery.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 10, borderRadius: 8, background: '#ecfdf5', borderLeft: '4px solid #10b981' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#065f46' } }, '🌱 Recovery meal logged'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2 } }, '💭 ' + l.momentDescription),
                l.recoveryMeal ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2 } }, '🍴 Next meal: ' + l.recoveryMeal) : null,
                l.whoSupported ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2 } }, '🤝 ' + l.whoSupported) : null,
                nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2 } }, '💚 Self-compassion: ' + l.selfCompassion + '/10')
              );
            })
          ),
      nlEvidenceFooter('Eating disorder recovery (Project HEAL, NEDA, Lock & Le Grange FBT): eating the next regular meal is the most important action after any ED-related event. Self-compassion (Neff) speeds recovery vs self-criticism.')
    );
  }

  // 80) PersonalSelfCompassionFood — Neff self-compassion practice
  function PersonalSelfCompassionFood(props) {
    if (!R_NL) return null;
    var data = props.data || { practices: [] };
    var setData = props.setData;
    var practices = data.practices || [];
    var fs = R_NL.useState({ trigger: '', selfCritical: '', selfCompassionate: '', whatChanged: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.trigger.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ practices: [n].concat(practices) });
      setForm({ trigger: '', selfCritical: '', selfCompassionate: '', whatChanged: '' });
    }
    function remove(id) { setData({ practices: practices.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Self-Compassion Practice', 'Neff: kindness + common humanity + mindfulness', '#ec4899'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fdf2f8', border: '1px solid #fbcfe8', marginBottom: 12, fontSize: 11, color: '#9f1239', lineHeight: 1.55 } },
        nlH('strong', null, '💖 Self-compassion (Kristin Neff) has 3 parts: '),
        nlH('div', { style: { marginTop: 4 } }, '1) Self-kindness vs self-criticism · 2) Common humanity (others struggle too) · 3) Mindfulness (notice the pain without exaggeration)')
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.trigger, onChange: function(e) { setForm(Object.assign({}, form, { trigger: e.target.value })); }, placeholder: 'What triggered self-criticism around food' }),
          nlTextarea({ value: form.selfCritical, onChange: function(e) { setForm(Object.assign({}, form, { selfCritical: e.target.value })); }, placeholder: 'The self-critical voice (write exactly)', rows: 2 }),
          nlTextarea({ value: form.selfCompassionate, onChange: function(e) { setForm(Object.assign({}, form, { selfCompassionate: e.target.value })); }, placeholder: 'What I\'d say to a friend in the same situation', rows: 2 }),
          nlInput({ value: form.whatChanged, onChange: function(e) { setForm(Object.assign({}, form, { whatChanged: e.target.value })); }, placeholder: 'What shifted (even a little)' }),
          nlBtn({ onClick: add }, '+ Log practice')
        )
      ),
      practices.length === 0
        ? nlEmpty('No practices yet. Self-compassion is a skill — Neff studies show it can be learned in 8 weeks.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            practices.slice(0, 30).map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#fdf2f8', borderLeft: '4px solid #ec4899' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#9f1239' } }, '🌷 ' + p.trigger),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(p.date)),
                    nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                p.selfCritical ? nlH('div', { style: { fontSize: 11, color: '#dc2626', marginTop: 2, fontStyle: 'italic' } }, '😤 Critic: ' + p.selfCritical) : null,
                p.selfCompassionate ? nlH('div', { style: { fontSize: 11, color: '#9f1239', marginTop: 2, fontStyle: 'italic' } }, '💖 Friend would say: ' + p.selfCompassionate) : null,
                p.whatChanged ? nlH('div', { style: { fontSize: 11, color: '#9f1239', marginTop: 2 } }, '✨ Shifted: ' + p.whatChanged) : null
              );
            })
          ),
      nlEvidenceFooter('Kristin Neff (self-compassion research): self-compassion predicts greater resilience, lower depression/anxiety, better health behaviors over time than self-esteem. Practice writes new pathways.')
    );
  }

  // 81) PersonalDietCultureLog — track diet culture exposure
  function PersonalDietCultureLog(props) {
    if (!R_NL) return null;
    var data = props.data || { exposures: [] };
    var setData = props.setData;
    var exposures = data.exposures || [];
    var fs = R_NL.useState({ source: '', message: '', impact: 5, response: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ exposures: [n].concat(exposures) });
      setForm({ source: '', message: '', impact: 5, response: '' });
    }
    function remove(id) { setData({ exposures: exposures.filter(function(e) { return e.id !== id; }) }); }
    var source_chips = ['TikTok', 'Instagram', 'YouTube', 'Friend', 'Family', 'TV/movie', 'Magazine', 'Coach', 'Doctor', 'School'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Diet Culture Log', 'Notice the messages — name them, neutralize them', '#dc2626'),
      nlNEDABanner(),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5', marginBottom: 12, fontSize: 11, color: '#7f1d1d', lineHeight: 1.55 } },
        nlH('strong', null, '🚨 Diet culture sounds like: '),
        '"Earn your food." "Cheat days." "Clean eating." "Get your body back." "What I eat in a day." "Almond mom." "Hot girl walk." Every one is a sales pitch from a $250B industry.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Source' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            source_chips.map(function(c) {
              return nlH('button', { key: c, onClick: function() { setForm(Object.assign({}, form, { source: c })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #fca5a5', background: form.source === c ? '#fee2e2' : '#fff', fontSize: 10, color: '#7f1d1d', fontWeight: 700, cursor: 'pointer' } }, c);
            })
          ),
          nlTextarea({ value: form.message, onChange: function(e) { setForm(Object.assign({}, form, { message: e.target.value })); }, placeholder: 'The diet-culture message I heard/saw', rows: 2 }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700, marginBottom: 4 } }, 'Impact on me: ' + form.impact + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.impact, onChange: function(e) { setForm(Object.assign({}, form, { impact: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlInput({ value: form.response, onChange: function(e) { setForm(Object.assign({}, form, { response: e.target.value })); }, placeholder: 'How I responded (or wish I had)' }),
          nlBtn({ onClick: add, variant: 'danger' }, '+ Log exposure')
        )
      ),
      exposures.length === 0
        ? nlEmpty('No logs yet. The average adolescent sees 200+ diet messages/day on social media. Logging them makes them visible.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            exposures.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#fee2e2', borderLeft: '3px solid #dc2626' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7f1d1d' } }, '⚠ ' + e.source + ' · impact ' + e.impact + '/10'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.message ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d', marginTop: 2, fontStyle: 'italic' } }, '"' + e.message + '"') : null,
                e.response ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d', marginTop: 2 } }, '↪ ' + e.response) : null
              );
            })
          ),
      nlEvidenceFooter('Christy Harrison (Anti-Diet, 2019); Sonya Renee Taylor (The Body Is Not An Apology); NEDA: chronic diet-culture exposure correlates with body dissatisfaction, ED onset, and disordered eating across all body sizes.')
    );
  }

  // 82) PersonalSocialMediaFoodCheck — algorithm awareness
  function PersonalSocialMediaFoodCheck(props) {
    if (!R_NL) return null;
    var data = props.data || { audits: [] };
    var setData = props.setData;
    var audits = data.audits || [];
    var fs = R_NL.useState({ platform: 'tiktok', topAccounts: '', vibe: 'healthy', actions: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ audits: [n].concat(audits) });
      setForm({ platform: 'tiktok', topAccounts: '', vibe: 'healthy', actions: '' });
    }
    function remove(id) { setData({ audits: audits.filter(function(a) { return a.id !== id; }) }); }
    var plat_opts = [
      { value: 'tiktok', label: 'TikTok' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'pinterest', label: 'Pinterest' },
      { value: 'snap', label: 'Snapchat' },
      { value: 'reddit', label: 'Reddit' }
    ];
    var vibe_opts = [
      { value: 'healthy', label: '🟢 Healthy — food joy, no diet talk' },
      { value: 'mixed', label: '🟡 Mixed — some red flags' },
      { value: 'toxic', label: '🔴 Toxic — diet culture / "what I eat in a day"' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Social Media Food Audit', 'What is your algorithm feeding YOU?', '#ec4899'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fdf2f8', border: '1px solid #fbcfe8', marginBottom: 12, fontSize: 11, color: '#9f1239', lineHeight: 1.55 } },
        nlH('strong', null, '🤖 The algorithm: '),
        'TikTok pushes ED content to teen accounts within 39 min of joining (Center for Countering Digital Hate, 2022). Audit + unfollow + report = real action.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlSelect({ value: form.platform, onChange: function(e) { setForm(Object.assign({}, form, { platform: e.target.value })); } }, plat_opts),
          nlTextarea({ value: form.topAccounts, onChange: function(e) { setForm(Object.assign({}, form, { topAccounts: e.target.value })); }, placeholder: 'Top food/body accounts I see', rows: 3 }),
          nlSelect({ value: form.vibe, onChange: function(e) { setForm(Object.assign({}, form, { vibe: e.target.value })); } }, vibe_opts),
          nlTextarea({ value: form.actions, onChange: function(e) { setForm(Object.assign({}, form, { actions: e.target.value })); }, placeholder: 'Actions I\'m taking (unfollow, mute, "not interested")', rows: 2 }),
          nlBtn({ onClick: add }, '+ Save audit')
        )
      ),
      audits.length === 0
        ? nlEmpty('Audit every couple weeks. Algorithms drift.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            audits.map(function(a) {
              var bg = a.vibe === 'healthy' ? '#dcfce7' : a.vibe === 'mixed' ? '#fef9c3' : '#fee2e2';
              return nlH('div', { key: a.id, style: { padding: 10, borderRadius: 8, background: bg } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f172a' } }, '📱 ' + a.platform + ' · ' + (vibe_opts.find(function(o) { return o.value === a.vibe; }) || { label: '' }).label),
                  nlH('button', { onClick: function() { remove(a.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                a.topAccounts ? nlH('div', { style: { fontSize: 11, color: '#0f172a', marginTop: 4, whiteSpace: 'pre-wrap' } }, '👀 ' + a.topAccounts) : null,
                a.actions ? nlH('div', { style: { fontSize: 11, color: '#0f172a', marginTop: 4 } }, '⚡ ' + a.actions) : null
              );
            })
          ),
      nlEvidenceFooter('Surgeon General Advisory (2023): social media is a contributing factor in youth mental health crisis. CCDH research: TikTok pushes ED content to vulnerable teens. Curating your feed is mental-health action.')
    );
  }

  // 83) PersonalNEDAResources — NEDA resources tracker
  function PersonalNEDAResources(props) {
    if (!R_NL) return null;
    var data = props.data || { saved: [] };
    var setData = props.setData;
    var saved = data.saved || [];
    var fs = R_NL.useState({ resource: '', kind: 'reading', why: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.resource.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ saved: [n].concat(saved) });
      setForm({ resource: '', kind: 'reading', why: '' });
    }
    function remove(id) { setData({ saved: saved.filter(function(s) { return s.id !== id; }) }); }
    var kind_opts = [
      { value: 'reading', label: '📚 Reading' },
      { value: 'video', label: '🎥 Video' },
      { value: 'podcast', label: '🎙 Podcast' },
      { value: 'support', label: '🤝 Support group' },
      { value: 'helpline', label: '📞 Helpline' },
      { value: 'app', label: '📱 App' }
    ];
    var defaults = [
      { name: 'NEDA Helpline 1-800-931-2237', kind: 'helpline' },
      { name: 'Crisis Text Line — text NEDA to 741741', kind: 'helpline' },
      { name: 'Intuitive Eating by Tribole & Resch', kind: 'reading' },
      { name: 'Anti-Diet by Christy Harrison', kind: 'reading' },
      { name: 'Maintenance Phase podcast', kind: 'podcast' },
      { name: 'Food Psych Podcast', kind: 'podcast' },
      { name: 'Recovery Record app', kind: 'app' },
      { name: 'F.E.A.S.T. (parent support)', kind: 'support' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My NEDA Resource Library', 'Save what helps you — keep within reach', '#10b981'),
      nlNEDABanner(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.resource, onChange: function(e) { setForm(Object.assign({}, form, { resource: e.target.value })); }, placeholder: 'Resource' }),
          nlSelect({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); } }, kind_opts),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Why this helps me' }),
          nlBtn({ onClick: add, variant: 'success' }, '+ Save resource')
        )
      ),
      nlCard({ style: { background: '#ecfdf5', border: '1px dashed #6ee7b7' } },
        nlH('strong', { style: { fontSize: 11, color: '#065f46', display: 'block', marginBottom: 6 } }, '💡 Suggested NEDA-aligned resources (tap to add)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          defaults.map(function(d) {
            return nlH('button', { key: d.name, onClick: function() { setForm(Object.assign({}, form, { resource: d.name, kind: d.kind })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #6ee7b7', background: '#fff', fontSize: 11, color: '#065f46', cursor: 'pointer' } }, d.name);
          })
        )
      ),
      saved.length === 0
        ? nlEmpty('No resources saved. Save the ones that ACTUALLY help — not the ones that just sound helpful.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            saved.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#ecfdf5', borderLeft: '4px solid #10b981' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#065f46' } }, '💚 ' + s.resource),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2 } }, (kind_opts.find(function(o) { return o.value === s.kind; }) || { label: s.kind }).label),
                s.why ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 2, fontStyle: 'italic' } }, '💡 ' + s.why) : null
              );
            })
          ),
      nlEvidenceFooter('NEDA (myneda.org): free educational content, support groups, treatment locator. Project HEAL: free treatment scholarships + insurance navigation. Both are evidence-aligned + free.')
    );
  }

  // 84) PersonalSafetyContact — ED safety contacts
  function PersonalSafetyContact(props) {
    if (!R_NL) return null;
    var data = props.data || { contacts: [] };
    var setData = props.setData;
    var contacts = data.contacts || [];
    var fs = R_NL.useState({ name: '', relation: '', when: '', how: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ contacts: [n].concat(contacts) });
      setForm({ name: '', relation: '', when: '', how: '', notes: '' });
    }
    function remove(id) { setData({ contacts: contacts.filter(function(c) { return c.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Safety Contacts', 'Who to call when food/body thoughts get loud', '#dc2626'),
      nlNEDABanner(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Name' }),
          nlInput({ value: form.relation, onChange: function(e) { setForm(Object.assign({}, form, { relation: e.target.value })); }, placeholder: 'Relationship (mom, school counselor, friend, etc.)' }),
          nlInput({ value: form.when, onChange: function(e) { setForm(Object.assign({}, form, { when: e.target.value })); }, placeholder: 'When to reach out to them (which kind of moment)' }),
          nlInput({ value: form.how, onChange: function(e) { setForm(Object.assign({}, form, { how: e.target.value })); }, placeholder: 'How (phone, text, in person)' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (what they know about this, what helps)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Add safety contact')
        )
      ),
      contacts.length === 0
        ? nlEmpty('No contacts yet. Aim for 3 people in different roles (peer + adult + professional).')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            contacts.map(function(c) {
              return nlH('div', { key: c.id, style: { padding: 10, borderRadius: 8, background: '#fef2f2', borderLeft: '4px solid #dc2626' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#7f1d1d' } }, '☎ ' + c.name + (c.relation ? ' (' + c.relation + ')' : '')),
                  nlH('button', { onClick: function() { remove(c.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                c.when ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d', marginTop: 4 } }, '⏰ ' + c.when) : null,
                c.how ? nlH('div', { style: { fontSize: 11, color: '#7f1d1d', marginTop: 2 } }, '📞 ' + c.how) : null,
                c.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, c.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Social-support research (Cohen, House): strong social ties predict better mental health outcomes across nearly every condition. ED recovery specifically benefits from having multiple support people in different roles.')
    );
  }

  // 85) PersonalBodyImageJournal — body image awareness
  function PersonalBodyImageJournal(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ trigger: '', thought: '', reframe: '', kind: '', mood: 5 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ trigger: '', thought: '', reframe: '', kind: '', mood: 5 });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Body Image Journal', 'Notice thoughts, reframe with kindness', '#ec4899'),
      nlNEDABanner(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.trigger, onChange: function(e) { setForm(Object.assign({}, form, { trigger: e.target.value })); }, placeholder: 'What triggered a body thought' }),
          nlTextarea({ value: form.thought, onChange: function(e) { setForm(Object.assign({}, form, { thought: e.target.value })); }, placeholder: 'The thought (exact)', rows: 2 }),
          nlTextarea({ value: form.reframe, onChange: function(e) { setForm(Object.assign({}, form, { reframe: e.target.value })); }, placeholder: 'A kinder, truer thought', rows: 2 }),
          nlInput({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); }, placeholder: 'One kind thing my body did today' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#9f1239', fontWeight: 700, marginBottom: 4 } }, 'Mood after: ' + form.mood + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.mood, onChange: function(e) { setForm(Object.assign({}, form, { mood: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlBtn({ onClick: add }, '+ Log entry')
        )
      ),
      entries.length === 0
        ? nlEmpty('No entries. Cognitive reframing + body appreciation are both evidence-based.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#fdf2f8', borderLeft: '3px solid #ec4899' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#9f1239' } }, '🌷 ' + (e.trigger || 'Body thought entry')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.thought ? nlH('div', { style: { fontSize: 11, color: '#dc2626', marginTop: 2 } }, '😤 ' + e.thought) : null,
                e.reframe ? nlH('div', { style: { fontSize: 11, color: '#9f1239', marginTop: 2 } }, '🌸 ' + e.reframe) : null,
                e.kind ? nlH('div', { style: { fontSize: 11, color: '#10b981', marginTop: 2 } }, '💚 Body did: ' + e.kind) : null,
                nlH('div', { style: { fontSize: 10, color: '#9f1239', marginTop: 2 } }, 'Mood: ' + e.mood + '/10')
              );
            })
          ),
      nlEvidenceFooter('Body image research (Tylka): body appreciation (gratitude for what the body DOES) more strongly predicts wellbeing than body satisfaction (how it looks). Reframing is teachable and lasting.')
    );
  }

  // 86) PersonalRefusalScripts — refusal scripts (diet talk)
  function PersonalRefusalScripts(props) {
    if (!R_NL) return null;
    var data = props.data || { scripts: [] };
    var setData = props.setData;
    var scripts = data.scripts || [];
    var fs = R_NL.useState({ situation: '', personSays: '', myScript: '', context: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.situation.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ scripts: [n].concat(scripts) });
      setForm({ situation: '', personSays: '', myScript: '', context: '' });
    }
    function remove(id) { setData({ scripts: scripts.filter(function(s) { return s.id !== id; }) }); }
    var examples = [
      { p: '"You\'re going to eat all that?"', s: '"Yep — I\'m hungry. Pass the rolls?"' },
      { p: '"Carbs make you bloated"', s: '"They\'re my brain food. Let\'s talk about something else."' },
      { p: '"I shouldn\'t but..." (food guilt)', s: '"There\'s no should about it — you\'re eating."' },
      { p: '"I need to work this off"', s: '"Your body works for free. Want to take a walk together because it\'s nice out?"' },
      { p: 'Auntie comments on my body', s: '"Thanks for noticing me. How\'s your garden?"' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Refusal Scripts', 'Pre-written responses to diet-talk + body comments', '#7c3aed'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.situation, onChange: function(e) { setForm(Object.assign({}, form, { situation: e.target.value })); }, placeholder: 'Situation' }),
          nlInput({ value: form.personSays, onChange: function(e) { setForm(Object.assign({}, form, { personSays: e.target.value })); }, placeholder: 'What they say' }),
          nlTextarea({ value: form.myScript, onChange: function(e) { setForm(Object.assign({}, form, { myScript: e.target.value })); }, placeholder: 'My script', rows: 2 }),
          nlInput({ value: form.context, onChange: function(e) { setForm(Object.assign({}, form, { context: e.target.value })); }, placeholder: 'Context (who, when this comes up)' }),
          nlBtn({ onClick: add }, '+ Save script')
        )
      ),
      nlCard({ style: { background: '#faf5ff', border: '1px dashed #d8b4fe' } },
        nlH('strong', { style: { fontSize: 11, color: '#5b21b6', display: 'block', marginBottom: 6 } }, '💡 Example scripts (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          examples.map(function(ex, i) {
            return nlH('button', { key: i, onClick: function() { setForm({ situation: '', personSays: ex.p, myScript: ex.s, context: '' }); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #d8b4fe', background: '#fff', fontSize: 11, color: '#5b21b6', cursor: 'pointer' } },
              nlH('strong', null, 'They: '), ex.p, nlH('br', null), nlH('strong', null, 'You: '), ex.s
            );
          })
        )
      ),
      scripts.length === 0
        ? nlEmpty('No scripts yet. Practicing once makes them auto-available in the moment.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            scripts.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#faf5ff', borderLeft: '4px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#5b21b6' } }, '🗣 ' + (s.situation || 'Script')),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                s.personSays ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 4 } }, '👤 They: ' + s.personSays) : null,
                s.myScript ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, '💪 Me: ' + s.myScript) : null,
                s.context ? nlH('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2, fontStyle: 'italic' } }, s.context) : null
              );
            })
          ),
      nlEvidenceFooter('Assertiveness training research (Alberti & Emmons): pre-rehearsed scripts dramatically increase the likelihood of speaking up in pressured moments. Body sovereignty starts with the mouth.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 10: REFLECTION / WELLNESS (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 87) PersonalFoodRelationship — values clarification
  function PersonalFoodRelationship(props) {
    if (!R_NL) return null;
    var data = props.data || { reflections: [] };
    var setData = props.setData;
    var reflections = data.reflections || [];
    var fs = R_NL.useState({ today: '', whatChanged: '', wantsToShift: '', proud: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ reflections: [n].concat(reflections) });
      setForm({ today: '', whatChanged: '', wantsToShift: '', proud: '' });
    }
    function remove(id) { setData({ reflections: reflections.filter(function(r) { return r.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Relationship with Food', 'Periodic reflection — where am I?', '#10b981'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlTextarea({ value: form.today, onChange: function(e) { setForm(Object.assign({}, form, { today: e.target.value })); }, placeholder: 'My relationship with food right now', rows: 3 }),
          nlTextarea({ value: form.whatChanged, onChange: function(e) { setForm(Object.assign({}, form, { whatChanged: e.target.value })); }, placeholder: 'What has shifted in the last month/year', rows: 2 }),
          nlTextarea({ value: form.wantsToShift, onChange: function(e) { setForm(Object.assign({}, form, { wantsToShift: e.target.value })); }, placeholder: 'What I want to shift', rows: 2 }),
          nlInput({ value: form.proud, onChange: function(e) { setForm(Object.assign({}, form, { proud: e.target.value })); }, placeholder: "Something I'm proud of (no matter how small)" }),
          nlBtn({ onClick: add }, '+ Save reflection')
        )
      ),
      reflections.length === 0
        ? nlEmpty('No reflections yet. Even monthly reflection reveals growth.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            reflections.map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#ecfdf5', borderLeft: '4px solid #10b981' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#065f46' } }, '💚 Reflection'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(r.date)),
                    nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                r.today ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 4, whiteSpace: 'pre-wrap' } }, '🌱 ' + r.today) : null,
                r.whatChanged ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 4, whiteSpace: 'pre-wrap' } }, '🔄 Shifted: ' + r.whatChanged) : null,
                r.wantsToShift ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 4, whiteSpace: 'pre-wrap' } }, '🌟 Want to shift: ' + r.wantsToShift) : null,
                r.proud ? nlH('div', { style: { fontSize: 11, color: '#065f46', marginTop: 4, fontWeight: 700 } }, '🎉 Proud: ' + r.proud) : null
              );
            })
          ),
      nlEvidenceFooter('Identity-based change research (Clear, Atomic Habits): "I am someone who…" framings outperform behavior tracking alone for long-term change.')
    );
  }

  // 88) PersonalFoodGratitude — gratitude for food
  function PersonalFoodGratitude(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ food: '', whoMade: '', whoElse: '', appreciation: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ food: '', whoMade: '', whoElse: '', appreciation: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Gratitude Journal', 'Where this food came from — humans, animals, land, water', '#84cc16'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Food I\'m grateful for' }),
          nlInput({ value: form.whoMade, onChange: function(e) { setForm(Object.assign({}, form, { whoMade: e.target.value })); }, placeholder: 'Who made/prepared it' }),
          nlInput({ value: form.whoElse, onChange: function(e) { setForm(Object.assign({}, form, { whoElse: e.target.value })); }, placeholder: 'Who else made it possible (farmer, grocer, driver)' }),
          nlTextarea({ value: form.appreciation, onChange: function(e) { setForm(Object.assign({}, form, { appreciation: e.target.value })); }, placeholder: 'What I appreciate', rows: 3 }),
          nlBtn({ onClick: add }, '+ Log gratitude')
        )
      ),
      entries.length === 0
        ? nlEmpty('No gratitude entries. Food gratitude is unique — every meal traces back to thousands of hands.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '🙏 ' + e.food),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.whoMade ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '👨‍🍳 ' + e.whoMade) : null,
                e.whoElse ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '🚜 ' + e.whoElse) : null,
                e.appreciation ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 4, fontStyle: 'italic' } }, '💚 ' + e.appreciation) : null
              );
            })
          ),
      nlEvidenceFooter('Gratitude practice research (Emmons): regular gratitude journaling correlates with increased wellbeing, sleep quality, and relationship satisfaction. Food gratitude builds appreciation for the human/ecological systems behind every meal.')
    );
  }

  // 89) PersonalEatingStoryline — your food story
  function PersonalEatingStoryline(props) {
    if (!R_NL) return null;
    var data = props.data || { chapters: [] };
    var setData = props.setData;
    var chapters = data.chapters || [];
    var fs = R_NL.useState({ ageOrPeriod: '', story: '', insight: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.story.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ chapters: [n].concat(chapters) });
      setForm({ ageOrPeriod: '', story: '', insight: '' });
    }
    function remove(id) { setData({ chapters: chapters.filter(function(c) { return c.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Eating Storyline', 'Trace the arc of your relationship with food', '#0d9488'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.ageOrPeriod, onChange: function(e) { setForm(Object.assign({}, form, { ageOrPeriod: e.target.value })); }, placeholder: 'Age or period (e.g., "Elementary school" or "Age 8")' }),
          nlTextarea({ value: form.story, onChange: function(e) { setForm(Object.assign({}, form, { story: e.target.value })); }, placeholder: 'A story from that time around food', rows: 5 }),
          nlTextarea({ value: form.insight, onChange: function(e) { setForm(Object.assign({}, form, { insight: e.target.value })); }, placeholder: 'What I see now looking back', rows: 2 }),
          nlBtn({ onClick: add }, '+ Add chapter')
        )
      ),
      chapters.length === 0
        ? nlEmpty('No chapters yet. Your eating story shapes today; writing it down makes it visible.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            chapters.map(function(c) {
              return nlH('div', { key: c.id, style: { padding: 12, borderRadius: 10, background: '#f0fdfa', borderLeft: '5px solid #0d9488' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 14, color: '#0f766e' } }, '📖 ' + c.ageOrPeriod),
                  nlH('button', { onClick: function() { remove(c.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 4, whiteSpace: 'pre-wrap' } }, c.story),
                c.insight ? nlH('div', { style: { fontSize: 11, color: '#0d9488', marginTop: 8, fontStyle: 'italic', borderTop: '1px solid #5eead4', paddingTop: 8 } }, '💡 ' + c.insight) : null
              );
            })
          ),
      nlEvidenceFooter('Narrative therapy (White & Epston): rewriting your food story externalizes problematic narratives ("I am bad with food" → "diet culture taught me X"). Story-work supports identity reconstruction.')
    );
  }

  // 90) PersonalFutureFoodSelf — future-self imagining
  function PersonalFutureFoodSelf(props) {
    if (!R_NL) return null;
    var data = props.data || { visions: [] };
    var setData = props.setData;
    var visions = data.visions || [];
    var fs = R_NL.useState({ years: '5', vision: '', habits: '', identity: '', oneStep: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.vision.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ visions: [n].concat(visions) });
      setForm({ years: '5', vision: '', habits: '', identity: '', oneStep: '' });
    }
    function remove(id) { setData({ visions: visions.filter(function(v) { return v.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Future Food Self', 'Hershfield: vivid future self drives present choices', '#3b82f6'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#eff6ff', border: '1px solid #93c5fd', marginBottom: 12, fontSize: 11, color: '#1e40af', lineHeight: 1.55 } },
        nlH('strong', null, '🔮 Imagining your future self: '),
        'Research (Hershfield, Stanford) shows people make healthier choices today when they vividly imagine their future self. Be specific — relationships, joy, body trust, the meals you cook.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.years, onChange: function(e) { setForm(Object.assign({}, form, { years: e.target.value })); }, placeholder: 'Years from now' }),
          nlTextarea({ value: form.vision, onChange: function(e) { setForm(Object.assign({}, form, { vision: e.target.value })); }, placeholder: 'Vivid scene of my future relationship with food', rows: 4 }),
          nlTextarea({ value: form.habits, onChange: function(e) { setForm(Object.assign({}, form, { habits: e.target.value })); }, placeholder: 'Habits future-me has', rows: 2 }),
          nlInput({ value: form.identity, onChange: function(e) { setForm(Object.assign({}, form, { identity: e.target.value })); }, placeholder: 'Identity ("I am someone who...")' }),
          nlInput({ value: form.oneStep, onChange: function(e) { setForm(Object.assign({}, form, { oneStep: e.target.value })); }, placeholder: 'One small step I can take this week' }),
          nlBtn({ onClick: add }, '+ Save vision')
        )
      ),
      visions.length === 0
        ? nlEmpty('No visions yet. Specific + sensory > abstract.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            visions.map(function(v) {
              return nlH('div', { key: v.id, style: { padding: 12, borderRadius: 10, background: '#eff6ff', borderLeft: '5px solid #3b82f6' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 14, color: '#1e40af' } }, '🔮 Me in ' + v.years + ' years'),
                  nlH('button', { onClick: function() { remove(v.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                v.vision ? nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 4, whiteSpace: 'pre-wrap' } }, v.vision) : null,
                v.habits ? nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 4 } }, '🔁 Habits: ' + v.habits) : null,
                v.identity ? nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 2, fontWeight: 700 } }, '🌟 ' + v.identity) : null,
                v.oneStep ? nlH('div', { style: { fontSize: 11, color: '#1e40af', marginTop: 2, fontStyle: 'italic' } }, '👣 This week: ' + v.oneStep) : null
              );
            })
          ),
      nlEvidenceFooter('Hershfield (future-self research, Stanford): people who feel connected to their future self save more, exercise more, and eat better. Specificity matters: vague "be healthier" doesn\'t move behavior; specific scenes do.')
    );
  }

  // 91) PersonalRoleModelEater — who eats in ways you admire
  function PersonalRoleModelEater(props) {
    if (!R_NL) return null;
    var data = props.data || { models: [] };
    var setData = props.setData;
    var models = data.models || [];
    var fs = R_NL.useState({ name: '', whoAreThey: '', whatTheyDo: '', whatYouAdmire: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ models: [n].concat(models) });
      setForm({ name: '', whoAreThey: '', whatTheyDo: '', whatYouAdmire: '' });
    }
    function remove(id) { setData({ models: models.filter(function(m) { return m.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food Role Models', 'People (real or famous) who eat in ways you respect', '#84cc16'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Name' }),
          nlInput({ value: form.whoAreThey, onChange: function(e) { setForm(Object.assign({}, form, { whoAreThey: e.target.value })); }, placeholder: 'Who they are' }),
          nlInput({ value: form.whatTheyDo, onChange: function(e) { setForm(Object.assign({}, form, { whatTheyDo: e.target.value })); }, placeholder: 'What they do with food' }),
          nlTextarea({ value: form.whatYouAdmire, onChange: function(e) { setForm(Object.assign({}, form, { whatYouAdmire: e.target.value })); }, placeholder: 'What you admire', rows: 3 }),
          nlBtn({ onClick: add }, '+ Add role model')
        )
      ),
      models.length === 0
        ? nlEmpty('No role models yet. Anyone — grandma, chef, athlete, classmate.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            models.map(function(m) {
              return nlH('div', { key: m.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '⭐ ' + m.name),
                  nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                m.whoAreThey ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '👤 ' + m.whoAreThey) : null,
                m.whatTheyDo ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '🍽 ' + m.whatTheyDo) : null,
                m.whatYouAdmire ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 4, fontStyle: 'italic' } }, '💚 ' + m.whatYouAdmire) : null
              );
            })
          ),
      nlEvidenceFooter('Social learning theory (Bandura): we learn behavior by watching role models we identify with. Choosing food-positive role models who DON\'T model diet culture changes what feels possible.')
    );
  }

  // 92) PersonalFoodQuotes — quotes about food/body
  function PersonalFoodQuotes(props) {
    if (!R_NL) return null;
    var data = props.data || { quotes: [] };
    var setData = props.setData;
    var quotes = data.quotes || [];
    var fs = R_NL.useState({ quote: '', who: '', why: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.quote.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ quotes: [n].concat(quotes) });
      setForm({ quote: '', who: '', why: '' });
    }
    function remove(id) { setData({ quotes: quotes.filter(function(q) { return q.id !== id; }) }); }
    var starter = [
      { q: '"The body is not an apology."', a: 'Sonya Renee Taylor' },
      { q: '"Food is symbolic of love when words are inadequate."', a: 'Alan Wolfelt' },
      { q: '"Tell me what you eat, and I will tell you what you are."', a: 'Brillat-Savarin' },
      { q: '"All happiness depends on a leisurely breakfast."', a: 'John Gunther' },
      { q: '"To eat is a necessity, but to eat intelligently is an art."', a: 'La Rochefoucauld' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Food + Body Quote Collection', 'Words that ground you', '#a16207'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlTextarea({ value: form.quote, onChange: function(e) { setForm(Object.assign({}, form, { quote: e.target.value })); }, placeholder: 'Quote', rows: 3 }),
          nlInput({ value: form.who, onChange: function(e) { setForm(Object.assign({}, form, { who: e.target.value })); }, placeholder: 'Who said it' }),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Why this lands for me' }),
          nlBtn({ onClick: add }, '+ Save quote')
        )
      ),
      nlCard({ style: { background: '#fef3c7', border: '1px dashed #fcd34d' } },
        nlH('strong', { style: { fontSize: 11, color: '#78350f', display: 'block', marginBottom: 6 } }, '💡 Starter quotes (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          starter.map(function(s, i) {
            return nlH('button', { key: i, onClick: function() { setForm({ quote: s.q, who: s.a, why: '' }); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #fcd34d', background: '#fff', fontSize: 11, color: '#78350f', cursor: 'pointer' } },
              s.q, nlH('div', { style: { fontSize: 10, color: '#a16207', marginTop: 2 } }, '— ' + s.a)
            );
          })
        )
      ),
      quotes.length === 0
        ? nlEmpty('No quotes saved. Start with one — it can re-ground you on hard days.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            quotes.map(function(q) {
              return nlH('div', { key: q.id, style: { padding: 10, borderRadius: 8, background: '#fef3c7', borderLeft: '4px solid #a16207' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('div', { style: { fontSize: 12, color: '#78350f', fontStyle: 'italic' } }, q.quote),
                  nlH('button', { onClick: function() { remove(q.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                q.who ? nlH('div', { style: { fontSize: 10, color: '#a16207', marginTop: 2 } }, '— ' + q.who) : null,
                q.why ? nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 4 } }, '💭 ' + q.why) : null
              );
            })
          ),
      nlEvidenceFooter('Memorable phrasing (Heath brothers, Made to Stick): a sticky phrase travels with you and resurfaces in the moment when you need it. Personally meaningful quotes function as anchors.')
    );
  }

  // 93) PersonalNutritionDecisionLog — decision log
  function PersonalNutritionDecisionLog(props) {
    if (!R_NL) return null;
    var data = props.data || { decisions: [] };
    var setData = props.setData;
    var decisions = data.decisions || [];
    var fs = R_NL.useState({ decision: '', options: '', chose: '', reasoning: '', outcome: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.decision.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ decisions: [n].concat(decisions) });
      setForm({ decision: '', options: '', chose: '', reasoning: '', outcome: '' });
    }
    function remove(id) { setData({ decisions: decisions.filter(function(d) { return d.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nutrition Decision Log', 'For bigger food decisions — vegetarianism, supplements, dietary changes', '#0891b2'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.decision, onChange: function(e) { setForm(Object.assign({}, form, { decision: e.target.value })); }, placeholder: 'Decision' }),
          nlTextarea({ value: form.options, onChange: function(e) { setForm(Object.assign({}, form, { options: e.target.value })); }, placeholder: 'Options I considered', rows: 2 }),
          nlInput({ value: form.chose, onChange: function(e) { setForm(Object.assign({}, form, { chose: e.target.value })); }, placeholder: 'What I chose' }),
          nlTextarea({ value: form.reasoning, onChange: function(e) { setForm(Object.assign({}, form, { reasoning: e.target.value })); }, placeholder: 'Why', rows: 3 }),
          nlInput({ value: form.outcome, onChange: function(e) { setForm(Object.assign({}, form, { outcome: e.target.value })); }, placeholder: 'Outcome (revisit later)' }),
          nlBtn({ onClick: add }, '+ Log decision')
        )
      ),
      decisions.length === 0
        ? nlEmpty('No decisions logged. Tracking reasoning helps you learn how YOU make food decisions.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            decisions.map(function(d) {
              return nlH('div', { key: d.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #0891b2' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#155e75' } }, '🧭 ' + d.decision),
                  nlH('button', { onClick: function() { remove(d.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                d.chose ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 4 } }, '✓ ' + d.chose) : null,
                d.reasoning ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2, fontStyle: 'italic' } }, '💭 ' + d.reasoning) : null,
                d.outcome ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2 } }, '📊 ' + d.outcome) : null
              );
            })
          ),
      nlEvidenceFooter('Decision-quality research (Kahneman): tracking your reasoning + outcomes helps you separate good decisions from good outcomes. Useful for ongoing nutrition choices like vegetarianism, food allergies, supplement use.')
    );
  }

  // 94) PersonalCelebrationFoods — joy & food
  function PersonalCelebrationFoods(props) {
    if (!R_NL) return null;
    var data = props.data || { foods: [] };
    var setData = props.setData;
    var foods = data.foods || [];
    var fs = R_NL.useState({ food: '', occasion: '', memory: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.food.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ foods: [n].concat(foods) });
      setForm({ food: '', occasion: '', memory: '' });
    }
    function remove(id) { setData({ foods: foods.filter(function(f) { return f.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Celebration Foods', 'Foods of pure joy — no nutrition critique allowed', '#ec4899'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.food, onChange: function(e) { setForm(Object.assign({}, form, { food: e.target.value })); }, placeholder: 'Celebration food' }),
          nlInput({ value: form.occasion, onChange: function(e) { setForm(Object.assign({}, form, { occasion: e.target.value })); }, placeholder: 'Occasion' }),
          nlTextarea({ value: form.memory, onChange: function(e) { setForm(Object.assign({}, form, { memory: e.target.value })); }, placeholder: 'A memory', rows: 3 }),
          nlBtn({ onClick: add }, '+ Add celebration food')
        )
      ),
      foods.length === 0
        ? nlEmpty('No celebration foods. These foods are 100% allowed to bring joy without explanation.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            foods.map(function(f) {
              return nlH('div', { key: f.id, style: { padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, #fdf2f8, #fae8ff)', borderLeft: '5px solid #ec4899' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 14, color: '#9f1239' } }, '🎉 ' + f.food + (f.occasion ? ' (' + f.occasion + ')' : '')),
                  nlH('button', { onClick: function() { remove(f.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                f.memory ? nlH('div', { style: { fontSize: 11, color: '#9f1239', marginTop: 4, fontStyle: 'italic' } }, '💖 ' + f.memory) : null
              );
            })
          ),
      nlEvidenceFooter('Pleasure principle (Intuitive Eating): food joy is a core nutritional value, not a nutritional sin. Birthday cake, holiday foods, comfort food on bad days — all part of a full life.')
    );
  }

  // 95) PersonalSundayPrep — Sunday meal-prep ritual
  function PersonalSundayPrep(props) {
    if (!R_NL) return null;
    var data = props.data || { rituals: [] };
    var setData = props.setData;
    var rituals = data.rituals || [];
    var fs = R_NL.useState({ weekOf: nl_today(), checked: { shop: false, cook: false, portion: false, write: false }, week: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function toggleChecked(k) {
      var c = Object.assign({}, form.checked); c[k] = !c[k];
      setForm(Object.assign({}, form, { checked: c }));
    }
    function add() {
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ rituals: [n].concat(rituals) });
      setForm({ weekOf: nl_today(), checked: { shop: false, cook: false, portion: false, write: false }, week: '', notes: '' });
    }
    function remove(id) { setData({ rituals: rituals.filter(function(r) { return r.id !== id; }) }); }
    var items = [
      { key: 'shop', label: '🛒 Groceries' },
      { key: 'cook', label: '👨‍🍳 Batch-cook' },
      { key: 'portion', label: '🥡 Portion + store' },
      { key: 'write', label: '✍ Write week plan' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Sunday Prep Ritual', 'A repeating ritual makes weekly self-care invisible', '#16a34a'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('input', { type: 'date', value: form.weekOf, onChange: function(e) { setForm(Object.assign({}, form, { weekOf: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 } },
            items.map(function(i) {
              var checked = !!form.checked[i.key];
              return nlH('button', { key: i.key, onClick: function() { toggleChecked(i.key); }, style: { padding: 8, borderRadius: 8, border: '2px solid ' + (checked ? '#16a34a' : '#cbd5e1'), background: checked ? '#dcfce7' : '#fff', color: '#166534', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                (checked ? '✓ ' : '○ ') + i.label
              );
            })
          ),
          nlTextarea({ value: form.week, onChange: function(e) { setForm(Object.assign({}, form, { week: e.target.value })); }, placeholder: "This week's meal plan", rows: 4 }),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add, variant: 'success' }, '+ Save Sunday ritual')
        )
      ),
      rituals.length === 0
        ? nlEmpty('No rituals yet. Sunday prep — even just one of the four items — pays back all week.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            rituals.map(function(r) {
              var doneCount = items.filter(function(i) { return r.checked && r.checked[i.key]; }).length;
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#f0fdf4', borderLeft: '4px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#166534' } }, '☀ Week of ' + r.weekOf + ' (' + doneCount + '/4 done)'),
                  nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                r.week ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 4, whiteSpace: 'pre-wrap' } }, '📋 ' + r.week) : null,
                r.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, fontStyle: 'italic' } }, r.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Habit ritual research (Wood, Good Habits Bad Habits): repeating Sunday prep over weeks turns it into automatic behavior. Pairing with reward (good podcast while shopping, etc.) speeds the habit loop.')
    );
  }

  // 96) PersonalFriendshipFood — friendships built around food
  function PersonalFriendshipFood(props) {
    if (!R_NL) return null;
    var data = props.data || { friendships: [] };
    var setData = props.setData;
    var friendships = data.friendships || [];
    var fs = R_NL.useState({ friend: '', activity: '', frequency: 'weekly', what: '', why: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.friend.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ friendships: [n].concat(friendships) });
      setForm({ friend: '', activity: '', frequency: 'weekly', what: '', why: '' });
    }
    function remove(id) { setData({ friendships: friendships.filter(function(f) { return f.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Friendship Foods', 'Track the people you eat with', '#0ea5e9'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.friend, onChange: function(e) { setForm(Object.assign({}, form, { friend: e.target.value })); }, placeholder: 'Friend' }),
          nlInput({ value: form.activity, onChange: function(e) { setForm(Object.assign({}, form, { activity: e.target.value })); }, placeholder: 'Our food activity (cooking together, lunch table, coffee dates)' }),
          nlSelect({ value: form.frequency, onChange: function(e) { setForm(Object.assign({}, form, { frequency: e.target.value })); } }, [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'occasionally', label: 'Occasionally' }
          ]),
          nlInput({ value: form.what, onChange: function(e) { setForm(Object.assign({}, form, { what: e.target.value })); }, placeholder: 'What we usually do/eat' }),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Why this matters' }),
          nlBtn({ onClick: add }, '+ Add friendship food')
        )
      ),
      friendships.length === 0
        ? nlEmpty('No friendship foods listed. Eating together is one of the oldest forms of friendship.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            friendships.map(function(f) {
              return nlH('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#075985' } }, '🤝 ' + f.friend + ' · ' + f.activity),
                  nlH('button', { onClick: function() { remove(f.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                f.what ? nlH('div', { style: { fontSize: 11, color: '#075985', marginTop: 2 } }, '🍴 ' + f.what + ' · ' + f.frequency) : null,
                f.why ? nlH('div', { style: { fontSize: 11, color: '#075985', marginTop: 2, fontStyle: 'italic' } }, '💚 ' + f.why) : null
              );
            })
          ),
      nlEvidenceFooter('Commensality research (Fischler): people who eat regularly with others report higher wellbeing, lower disordered eating, and stronger social ties. Eating alone constantly is a risk factor.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 11: MAINE-SPECIFIC (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 97) PersonalLocalProduceLog — Maine local produce
  function PersonalLocalProduceLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ produce: '', source: 'farmers-market', farm: '', when: 'in-season', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.produce.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ produce: '', source: 'farmers-market', farm: '', when: 'in-season', notes: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var src_opts = [
      { value: 'farmers-market', label: '🛍 Farmers market' },
      { value: 'csa', label: '📦 CSA share' },
      { value: 'farm-stand', label: '🚜 Farm stand' },
      { value: 'home-garden', label: '🌱 Home garden' },
      { value: 'foraged', label: '🍄 Foraged' },
      { value: 'school-grown', label: '🏫 School garden' }
    ];
    var when_opts = [
      { value: 'in-season', label: '🟢 In season' },
      { value: 'preserved', label: '🥫 Preserved' },
      { value: 'shoulder', label: '🟡 Shoulder season' }
    ];
    var maine_produce = ['Wild blueberries', 'Apples', 'Maple syrup', 'Lobster', 'Atlantic salmon', 'Sweet corn', 'Maine potatoes', 'Carrots', 'Squash (winter)', 'Cabbage', 'Kale', 'Tomatoes', 'Strawberries', 'Rhubarb', 'Fiddleheads', 'Maple sap'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Maine Produce Log', 'Eat with the seasons — Maine\'s growing year', '#16a34a'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.produce, onChange: function(e) { setForm(Object.assign({}, form, { produce: e.target.value })); }, placeholder: 'Produce' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            maine_produce.map(function(p) {
              return nlH('button', { key: p, onClick: function() { setForm(Object.assign({}, form, { produce: p })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #86efac', background: form.produce === p ? '#dcfce7' : '#fff', fontSize: 10, color: '#166534', fontWeight: 700, cursor: 'pointer' } }, p);
            })
          ),
          nlSelect({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); } }, src_opts),
          nlInput({ value: form.farm, onChange: function(e) { setForm(Object.assign({}, form, { farm: e.target.value })); }, placeholder: 'Farm name (if known)' }),
          nlSelect({ value: form.when, onChange: function(e) { setForm(Object.assign({}, form, { when: e.target.value })); } }, when_opts),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add }, '+ Log local produce')
        )
      ),
      entries.length === 0
        ? nlEmpty('No local produce yet. Maine\'s growing season runs roughly mid-June through October — eat it now.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#166534' } }, '🌽 ' + e.produce + (e.farm ? ' (' + e.farm + ')' : '')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#166534', marginTop: 2 } }, (src_opts.find(function(o) { return o.value === e.source; }) || { label: e.source }).label + ' · ' + (when_opts.find(function(o) { return o.value === e.when; }) || { label: e.when }).label),
                e.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, e.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Maine Farm to School Network + MOFGA: eating Maine-grown supports local farms (~$2 multiplier for the local economy per $1 spent) AND tends to be picked riper, so often more nutrient-dense.')
    );
  }

  // 98) PersonalFarmersMarketLog — farmers market visits
  function PersonalFarmersMarketLog(props) {
    if (!R_NL) return null;
    var data = props.data || { visits: [] };
    var setData = props.setData;
    var visits = data.visits || [];
    var fs = R_NL.useState({ market: '', purchases: '', spent: '', favoriteThing: '', metFarmer: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.market.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ visits: [n].concat(visits) });
      setForm({ market: '', purchases: '', spent: '', favoriteThing: '', metFarmer: '' });
    }
    function remove(id) { setData({ visits: visits.filter(function(v) { return v.id !== id; }) }); }
    var maine_markets = ['Portland (Saturday)', 'Brunswick (Tuesday/Friday)', 'Bangor (Sunday)', 'Belfast (Friday)', 'Camden (Saturday)', 'Damariscotta (Friday)'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Farmers Market Log', 'Visits + farmer relationships build food literacy', '#65a30d'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.market, onChange: function(e) { setForm(Object.assign({}, form, { market: e.target.value })); }, placeholder: 'Market' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            maine_markets.map(function(m) {
              return nlH('button', { key: m, onClick: function() { setForm(Object.assign({}, form, { market: m })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #bef264', background: form.market === m ? '#d9f99d' : '#fff', fontSize: 10, color: '#3f6212', fontWeight: 700, cursor: 'pointer' } }, m);
            })
          ),
          nlTextarea({ value: form.purchases, onChange: function(e) { setForm(Object.assign({}, form, { purchases: e.target.value })); }, placeholder: 'What I bought', rows: 3 }),
          nlInput({ value: form.spent, onChange: function(e) { setForm(Object.assign({}, form, { spent: e.target.value })); }, placeholder: 'Total spent' }),
          nlInput({ value: form.favoriteThing, onChange: function(e) { setForm(Object.assign({}, form, { favoriteThing: e.target.value })); }, placeholder: 'Best thing I bought' }),
          nlInput({ value: form.metFarmer, onChange: function(e) { setForm(Object.assign({}, form, { metFarmer: e.target.value })); }, placeholder: 'Farmer I met / talked to' }),
          nlBtn({ onClick: add }, '+ Log visit')
        )
      ),
      visits.length === 0
        ? nlEmpty('No visits logged. Maine has 100+ farmers markets — find your local at mainefederationoffarmersmarkets.com')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            visits.slice(0, 30).map(function(v) {
              return nlH('div', { key: v.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #65a30d' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '🛍 ' + v.market),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(v.date)),
                    nlH('button', { onClick: function() { remove(v.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                v.purchases ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2, whiteSpace: 'pre-wrap' } }, '🛒 ' + v.purchases) : null,
                v.spent ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '💰 ' + v.spent) : null,
                v.favoriteThing ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '⭐ ' + v.favoriteThing) : null,
                v.metFarmer ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '🤝 ' + v.metFarmer) : null
              );
            })
          ),
      nlEvidenceFooter('Maine SNAP at farmers markets: Maine Harvest Bucks doubles SNAP-EBT for local fresh produce. Maine MOFGA + MFFM advocate for food access at every market.')
    );
  }

  // 99) PersonalSeafoodTracker — Maine fisheries
  function PersonalSeafoodTracker(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ seafood: '', source: 'maine', sustainability: 'unknown', preparation: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.seafood.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ seafood: '', source: 'maine', sustainability: 'unknown', preparation: '', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var src_opts = [
      { value: 'maine', label: '🐟 Maine-caught' },
      { value: 'us', label: '🇺🇸 US-caught (other state)' },
      { value: 'imported', label: '🌎 Imported' },
      { value: 'unknown', label: '❓ Unknown' }
    ];
    var sust_opts = [
      { value: 'green', label: '🟢 MSC/SeafoodWatch best' },
      { value: 'yellow', label: '🟡 Good alternative' },
      { value: 'red', label: '🔴 Avoid (overfished)' },
      { value: 'unknown', label: '❓ Unknown' }
    ];
    var maine_seafood = ['Lobster', 'Atlantic salmon', 'Cod', 'Haddock', 'Scallops', 'Mussels', 'Oysters', 'Clams', 'Pollock', 'Hake', 'Mackerel', 'Herring'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Seafood Log', 'Track your omega-3 intake + sustainability', '#0e7490'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.seafood, onChange: function(e) { setForm(Object.assign({}, form, { seafood: e.target.value })); }, placeholder: 'Seafood' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            maine_seafood.map(function(s) {
              return nlH('button', { key: s, onClick: function() { setForm(Object.assign({}, form, { seafood: s })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #67e8f9', background: form.seafood === s ? '#cffafe' : '#fff', fontSize: 10, color: '#155e75', fontWeight: 700, cursor: 'pointer' } }, s);
            })
          ),
          nlSelect({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); } }, src_opts),
          nlSelect({ value: form.sustainability, onChange: function(e) { setForm(Object.assign({}, form, { sustainability: e.target.value })); } }, sust_opts),
          nlInput({ value: form.preparation, onChange: function(e) { setForm(Object.assign({}, form, { preparation: e.target.value })); }, placeholder: 'Preparation' }),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add }, '+ Log seafood')
        )
      ),
      logs.length === 0
        ? nlEmpty('No seafood logged. Maine\'s seafood industry is a major omega-3 + protein source. Check Maine Coast Fishermen\'s Assoc. for community-supported fisheries.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#ecfeff', borderLeft: '3px solid #0e7490' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#155e75' } }, '🐟 ' + l.seafood),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#155e75', marginTop: 2 } }, (src_opts.find(function(o) { return o.value === l.source; }) || { label: l.source }).label + ' · ' + (sust_opts.find(function(o) { return o.value === l.sustainability; }) || { label: '' }).label),
                l.preparation ? nlH('div', { style: { fontSize: 10, color: '#155e75', marginTop: 2 } }, '👨‍🍳 ' + l.preparation) : null
              );
            })
          ),
      nlEvidenceFooter('NOAA Fisheries + Monterey Bay Aquarium SeafoodWatch: Maine sustainably manages most fisheries. Cod is currently overfished; haddock + scallops + lobster (caught with rope ropes) are sustainable choices.')
    );
  }

  // 100) PersonalGardenLog — your garden produce
  function PersonalGardenLog(props) {
    if (!R_NL) return null;
    var data = props.data || { harvests: [] };
    var setData = props.setData;
    var harvests = data.harvests || [];
    var fs = R_NL.useState({ crop: '', amount: '', quality: 'good', usedFor: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.crop.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ harvests: [n].concat(harvests) });
      setForm({ crop: '', amount: '', quality: 'good', usedFor: '', notes: '' });
    }
    function remove(id) { setData({ harvests: harvests.filter(function(h) { return h.id !== id; }) }); }
    var q_opts = [
      { value: 'great', label: '⭐ Great' },
      { value: 'good', label: '🟢 Good' },
      { value: 'ok', label: '🟡 OK' },
      { value: 'rough', label: '🟠 Rough (bugs/disease)' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Garden Log', 'Track what you grow — calorie + life-skill investment', '#65a30d'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.crop, onChange: function(e) { setForm(Object.assign({}, form, { crop: e.target.value })); }, placeholder: 'Crop' }),
          nlInput({ value: form.amount, onChange: function(e) { setForm(Object.assign({}, form, { amount: e.target.value })); }, placeholder: 'Amount (cups, pounds, count)' }),
          nlSelect({ value: form.quality, onChange: function(e) { setForm(Object.assign({}, form, { quality: e.target.value })); } }, q_opts),
          nlInput({ value: form.usedFor, onChange: function(e) { setForm(Object.assign({}, form, { usedFor: e.target.value })); }, placeholder: 'Used for' }),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add, variant: 'success' }, '+ Log harvest')
        )
      ),
      harvests.length === 0
        ? nlEmpty('No harvests logged. Even one tomato plant on a windowsill counts.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            harvests.slice(0, 30).map(function(h) {
              return nlH('div', { key: h.id, style: { padding: 8, borderRadius: 8, background: '#f7fee7', borderLeft: '3px solid #65a30d' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#3f6212' } }, '🌱 ' + h.crop + ' · ' + h.amount + ' · ' + (q_opts.find(function(o) { return o.value === h.quality; }) || { label: '' }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(h.date)),
                    nlH('button', { onClick: function() { remove(h.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                h.usedFor ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 2 } }, '🍽 ' + h.usedFor) : null,
                h.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, h.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Garden literacy research: students who grow food eat more vegetables (Heim et al.), report more food appreciation, and have higher willingness to try new produce. UMaine Extension has free Maine-specific gardening resources.')
    );
  }

  // 101) PersonalForagingLog — wild Maine foods
  function PersonalForagingLog(props) {
    if (!R_NL) return null;
    var data = props.data || { entries: [] };
    var setData = props.setData;
    var entries = data.entries || [];
    var fs = R_NL.useState({ found: '', location: '', amount: '', verified: false, used: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.found.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ entries: [n].concat(entries) });
      setForm({ found: '', location: '', amount: '', verified: false, used: '' });
    }
    function remove(id) { setData({ entries: entries.filter(function(e) { return e.id !== id; }) }); }
    var maine_wild = ['Fiddleheads (spring)', 'Wild blueberries (summer)', 'Apples (fall)', 'Wild leeks/ramps', 'Wild mushrooms (advanced)', 'Chicken-of-the-woods (mushroom)', 'Beach pea', 'Cattail', 'Dandelion greens', 'Wood sorrel'];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Foraging Log', 'Wild Maine foods — never eat anything unverified', '#65a30d'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fef3c7', border: '2px solid #fcd34d', marginBottom: 12, fontSize: 11, color: '#78350f', lineHeight: 1.55 } },
        nlH('strong', null, '⚠️ Foraging safety: '),
        'NEVER eat wild food unless 100% identified by an expert or experienced forager. Many mushrooms are deadly. Many plants have toxic look-alikes. Take a Maine foraging class first (MOFGA offers them).'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.found, onChange: function(e) { setForm(Object.assign({}, form, { found: e.target.value })); }, placeholder: 'What I found' }),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            maine_wild.map(function(w) {
              return nlH('button', { key: w, onClick: function() { setForm(Object.assign({}, form, { found: w })); }, style: { padding: '4px 8px', borderRadius: 4, border: '1px solid #bef264', background: form.found === w ? '#d9f99d' : '#fff', fontSize: 10, color: '#3f6212', fontWeight: 700, cursor: 'pointer' } }, w);
            })
          ),
          nlInput({ value: form.location, onChange: function(e) { setForm(Object.assign({}, form, { location: e.target.value })); }, placeholder: 'Location (be vague for sustainability)' }),
          nlInput({ value: form.amount, onChange: function(e) { setForm(Object.assign({}, form, { amount: e.target.value })); }, placeholder: 'Amount harvested' }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3f6212', fontWeight: 700 } },
            nlH('input', { type: 'checkbox', checked: form.verified, onChange: function(e) { setForm(Object.assign({}, form, { verified: e.target.checked })); } }),
            nlH('span', null, '✓ ID verified by expert')
          ),
          nlInput({ value: form.used, onChange: function(e) { setForm(Object.assign({}, form, { used: e.target.value })); }, placeholder: 'How I used it' }),
          nlBtn({ onClick: add, variant: 'warning' }, '+ Log foraging trip')
        )
      ),
      entries.length === 0
        ? nlEmpty('No foraging yet. Start with fiddleheads (spring) or wild blueberries (August) — both easy IDs.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            entries.slice(0, 30).map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 8, borderRadius: 8, background: '#f7fee7', borderLeft: '3px solid #65a30d' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#3f6212' } }, '🍄 ' + e.found + (e.verified ? ' ✓' : ' ⚠')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(e.date)),
                    nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                e.location ? nlH('div', { style: { fontSize: 10, color: '#3f6212', marginTop: 2 } }, '📍 ' + e.location + ' · ' + e.amount) : null,
                e.used ? nlH('div', { style: { fontSize: 10, color: '#3f6212', marginTop: 2 } }, '🍴 ' + e.used) : null
              );
            })
          ),
      nlEvidenceFooter('Maine foraging: state forests permit modest personal foraging. NEVER take more than 1/3 of any patch. MOFGA + Wild Mushrooms of Maine (book) + Maine Forager guides are evidence-based.')
    );
  }

  // 102) PersonalMaineSeasonFood — eat with Maine seasons
  function PersonalMaineSeasonFood(props) {
    if (!R_NL) return null;
    var data = props.data || { plans: [] };
    var setData = props.setData;
    var plans = data.plans || [];
    var fs = R_NL.useState({ season: 'spring', proteins: '', vegetables: '', fruits: '', traditional: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ plans: [n].concat(plans) });
      setForm({ season: 'spring', proteins: '', vegetables: '', fruits: '', traditional: '' });
    }
    function remove(id) { setData({ plans: plans.filter(function(p) { return p.id !== id; }) }); }
    var s_opts = [
      { value: 'spring', label: '🌷 Spring (Apr-Jun)' },
      { value: 'summer', label: '☀ Summer (Jul-Aug)' },
      { value: 'fall', label: '🍁 Fall (Sep-Nov)' },
      { value: 'winter', label: '❄ Winter (Dec-Mar)' }
    ];
    var hints = {
      spring: 'Fiddleheads · maple syrup · wild leeks · greenhouse greens · rhubarb',
      summer: 'Blueberries · sweet corn · tomatoes · zucchini · strawberries · all greens',
      fall: 'Apples · pumpkins · winter squash · cabbage · potatoes · cranberries',
      winter: 'Stored squash · potatoes · sauerkraut · maple · seafood · root veggies'
    };
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Maine Seasonal Food Plan', 'Eat by Maine seasons — fresh + cheaper + better', '#16a34a'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlSelect({ value: form.season, onChange: function(e) { setForm(Object.assign({}, form, { season: e.target.value })); } }, s_opts),
          nlH('div', { style: { padding: 8, borderRadius: 6, background: '#f0fdf4', fontSize: 11, color: '#166534' } },
            nlH('strong', null, '🌱 Maine '), form.season + ': ', hints[form.season]
          ),
          nlInput({ value: form.proteins, onChange: function(e) { setForm(Object.assign({}, form, { proteins: e.target.value })); }, placeholder: 'Proteins I\'ll lean on' }),
          nlInput({ value: form.vegetables, onChange: function(e) { setForm(Object.assign({}, form, { vegetables: e.target.value })); }, placeholder: 'Vegetables I\'ll eat more of' }),
          nlInput({ value: form.fruits, onChange: function(e) { setForm(Object.assign({}, form, { fruits: e.target.value })); }, placeholder: 'Fruits' }),
          nlTextarea({ value: form.traditional, onChange: function(e) { setForm(Object.assign({}, form, { traditional: e.target.value })); }, placeholder: 'Maine traditional meals for this season', rows: 3 }),
          nlBtn({ onClick: add }, '+ Save seasonal plan')
        )
      ),
      plans.length === 0
        ? nlEmpty('No seasonal plans. Maine has 4 distinct food seasons — each tastes different.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            plans.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#f0fdf4', borderLeft: '4px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#166534' } }, (s_opts.find(function(o) { return o.value === p.season; }) || { label: p.season }).label),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                p.proteins ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2 } }, '🥩 ' + p.proteins) : null,
                p.vegetables ? nlH('div', { style: { fontSize: 11, color: '#166534' } }, '🥬 ' + p.vegetables) : null,
                p.fruits ? nlH('div', { style: { fontSize: 11, color: '#166534' } }, '🍎 ' + p.fruits) : null,
                p.traditional ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2, fontStyle: 'italic' } }, '🎯 ' + p.traditional) : null
              );
            })
          ),
      nlEvidenceFooter('USDA Seasonal Food Guide for Maine + UMaine Extension: eating in season aligns with peak nutrient content + lower cost. Preserving (freezing/canning) bridges winter when fresh local is limited.')
    );
  }

  // 103) PersonalSchoolFoodFeedback — feedback to cafeteria
  function PersonalSchoolFoodFeedback(props) {
    if (!R_NL) return null;
    var data = props.data || { feedback: [] };
    var setData = props.setData;
    var feedback = data.feedback || [];
    var fs = R_NL.useState({ menuItem: '', kind: 'compliment', specific: '', delivered: false });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.menuItem.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ feedback: [n].concat(feedback) });
      setForm({ menuItem: '', kind: 'compliment', specific: '', delivered: false });
    }
    function remove(id) { setData({ feedback: feedback.filter(function(f) { return f.id !== id; }) }); }
    var k_opts = [
      { value: 'compliment', label: '👍 Compliment' },
      { value: 'request', label: '💡 Request' },
      { value: 'concern', label: '⚠ Concern' },
      { value: 'cultural', label: '🌍 Cultural representation' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My School Food Feedback', 'Your voice matters — cafeteria managers want input', '#0ea5e9'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#e0f2fe', border: '1px solid #38bdf8', marginBottom: 12, fontSize: 11, color: '#075985', lineHeight: 1.55 } },
        nlH('strong', null, '🏫 How to deliver: '),
        'Write a clear, specific note. Give to your cafeteria manager directly OR through student council. Most school nutrition departments invite student feedback — they just rarely get it.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.menuItem, onChange: function(e) { setForm(Object.assign({}, form, { menuItem: e.target.value })); }, placeholder: 'Menu item / topic' }),
          nlSelect({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); } }, k_opts),
          nlTextarea({ value: form.specific, onChange: function(e) { setForm(Object.assign({}, form, { specific: e.target.value })); }, placeholder: 'Specific feedback (concrete > general)', rows: 4 }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#075985' } },
            nlH('input', { type: 'checkbox', checked: form.delivered, onChange: function(e) { setForm(Object.assign({}, form, { delivered: e.target.checked })); } }),
            nlH('span', null, 'Delivered to cafeteria/admin')
          ),
          nlBtn({ onClick: add }, '+ Log feedback')
        )
      ),
      feedback.length === 0
        ? nlEmpty('No feedback yet. Even 1 thoughtful note moves the menu.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            feedback.map(function(f) {
              return nlH('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: '#e0f2fe', borderLeft: '4px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#075985' } }, (f.delivered ? '✓ ' : '✏ ') + (k_opts.find(function(o) { return o.value === f.kind; }) || { label: f.kind }).label + ': ' + f.menuItem),
                  nlH('button', { onClick: function() { remove(f.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                f.specific ? nlH('div', { style: { fontSize: 11, color: '#075985', marginTop: 4, whiteSpace: 'pre-wrap' } }, f.specific) : null
              );
            })
          ),
      nlEvidenceFooter('USDA + School Nutrition Association: student voice (especially around cultural foods + dietary needs) reshapes menus. Maine has a Student Voice in School Nutrition policy framework.')
    );
  }

  // 104) PersonalLobsterRoll — Maine fun log
  function PersonalLobsterRoll(props) {
    if (!R_NL) return null;
    var data = props.data || { rolls: [] };
    var setData = props.setData;
    var rolls = data.rolls || [];
    var fs = R_NL.useState({ place: '', style: 'maine', price: '', rating: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.place.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ rolls: [n].concat(rolls) });
      setForm({ place: '', style: 'maine', price: '', rating: 5, notes: '' });
    }
    function remove(id) { setData({ rolls: rolls.filter(function(r) { return r.id !== id; }) }); }
    var style_opts = [
      { value: 'maine', label: '🦞 Maine (cold, mayo)' },
      { value: 'connecticut', label: '🧈 Connecticut (warm, butter)' },
      { value: 'mixed', label: '🤔 Mixed' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Lobster Roll Log', 'A very serious Maine taxonomy', '#dc2626'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.place, onChange: function(e) { setForm(Object.assign({}, form, { place: e.target.value })); }, placeholder: 'Place' }),
          nlSelect({ value: form.style, onChange: function(e) { setForm(Object.assign({}, form, { style: e.target.value })); } }, style_opts),
          nlInput({ value: form.price, onChange: function(e) { setForm(Object.assign({}, form, { price: e.target.value })); }, placeholder: 'Price' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#7f1d1d', fontWeight: 700, marginBottom: 4 } }, 'Rating: ' + form.rating + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.rating, onChange: function(e) { setForm(Object.assign({}, form, { rating: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes (bun toast level, butter ratio, claw vs knuckle)', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log roll')
        )
      ),
      rolls.length === 0
        ? nlEmpty('No rolls logged. Maine lobster is part of food + cultural literacy here.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            rolls.slice(0, 30).map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 8, borderRadius: 8, background: '#fef2f2', borderLeft: '3px solid #dc2626' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#7f1d1d' } }, '🦞 ' + r.place + ' · ' + r.rating + '/10'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(r.date)),
                    nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#7f1d1d', marginTop: 2 } }, (style_opts.find(function(o) { return o.value === r.style; }) || { label: '' }).label + (r.price ? ' · ' + r.price : '')),
                r.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, r.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Maine lobster fishery is one of the most sustainably managed in the world (MSC certified). Lobster: high-protein, low-fat, source of zinc + B12. A great Maine food story.')
    );
  }

  // 105) PersonalMapleSyrupSeason — seasonal food fun
  function PersonalMapleSyrupSeason(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ activity: 'tapping', producer: '', grade: 'B', amount: '', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.activity.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ activity: 'tapping', producer: '', grade: 'B', amount: '', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var act_opts = [
      { value: 'tapping', label: '🪣 Tapping trees' },
      { value: 'boiling', label: '🔥 Boiling sap' },
      { value: 'tasting', label: '👅 Tasting' },
      { value: 'buying', label: '🛒 Buying' },
      { value: 'cooking', label: '👨‍🍳 Cooking with' }
    ];
    var grade_opts = ['A Golden', 'A Amber', 'A Dark', 'A Very Dark', 'B'].map(function(g) { return { value: g, label: 'Grade ' + g }; });
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Maple Season Log', 'Maine\'s maple syrup season is late winter/early spring', '#a16207'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlSelect({ value: form.activity, onChange: function(e) { setForm(Object.assign({}, form, { activity: e.target.value })); } }, act_opts),
          nlInput({ value: form.producer, onChange: function(e) { setForm(Object.assign({}, form, { producer: e.target.value })); }, placeholder: 'Producer / farm' }),
          nlSelect({ value: form.grade, onChange: function(e) { setForm(Object.assign({}, form, { grade: e.target.value })); } }, grade_opts),
          nlInput({ value: form.amount, onChange: function(e) { setForm(Object.assign({}, form, { amount: e.target.value })); }, placeholder: 'Amount' }),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log activity')
        )
      ),
      logs.length === 0
        ? nlEmpty('No maple log yet. Maine Maple Sunday (4th Sunday of March) is the public opening.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 20).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#fef3c7', borderLeft: '3px solid #a16207' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#78350f' } }, '🍁 ' + (act_opts.find(function(o) { return o.value === l.activity; }) || { label: '' }).label + (l.producer ? ' · ' + l.producer : '')),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#78350f', marginTop: 2 } }, 'Grade ' + l.grade + (l.amount ? ' · ' + l.amount : '')),
                l.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, l.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Maine Maple Producers Association: ME is the 3rd-largest US maple producer. Sap-to-syrup ratio is ~40:1 — gallons of sap per gallon of syrup. Wonderful cultural + nutrition science overlap (sucrose, mineral content).')
    );
  }

  // 106) PersonalMaineRestaurantLog — Maine restaurant log
  function PersonalMaineRestaurantLog(props) {
    if (!R_NL) return null;
    var data = props.data || { visits: [] };
    var setData = props.setData;
    var visits = data.visits || [];
    var fs = R_NL.useState({ restaurant: '', town: '', ordered: '', rating: 5, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.restaurant.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ visits: [n].concat(visits) });
      setForm({ restaurant: '', town: '', ordered: '', rating: 5, notes: '' });
    }
    function remove(id) { setData({ visits: visits.filter(function(v) { return v.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Maine Restaurant Log', 'Track local restaurants — support + discover', '#7c3aed'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.restaurant, onChange: function(e) { setForm(Object.assign({}, form, { restaurant: e.target.value })); }, placeholder: 'Restaurant' }),
          nlInput({ value: form.town, onChange: function(e) { setForm(Object.assign({}, form, { town: e.target.value })); }, placeholder: 'Town' }),
          nlInput({ value: form.ordered, onChange: function(e) { setForm(Object.assign({}, form, { ordered: e.target.value })); }, placeholder: 'What I ordered' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#5b21b6', fontWeight: 700, marginBottom: 4 } }, 'Rating: ' + form.rating + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.rating, onChange: function(e) { setForm(Object.assign({}, form, { rating: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add }, '+ Log restaurant')
        )
      ),
      visits.length === 0
        ? nlEmpty('No restaurants logged. Eating local = local economy.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            visits.slice(0, 30).map(function(v) {
              return nlH('div', { key: v.id, style: { padding: 8, borderRadius: 8, background: '#faf5ff', borderLeft: '3px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#5b21b6' } }, '🍴 ' + v.restaurant + (v.town ? ' · ' + v.town : '') + ' · ' + v.rating + '/10'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(v.date)),
                    nlH('button', { onClick: function() { remove(v.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                v.ordered ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, '🍽 ' + v.ordered) : null,
                v.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, v.notes) : null
              );
            })
          ),
      nlEvidenceFooter('Maine Restaurant Association + Local First: independent restaurants recirculate ~3x more revenue locally than chains. Eating out is also food + cultural literacy + a social experience.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 12: SPECIALIZED / ADVANCED (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 107) PersonalSupplementLog — supplement tracking
  function PersonalSupplementLog(props) {
    if (!R_NL) return null;
    var data = props.data || { supplements: [] };
    var setData = props.setData;
    var supplements = data.supplements || [];
    var fs = R_NL.useState({ supplement: '', dose: '', frequency: 'daily', reason: '', prescribed: false, notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.supplement.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ supplements: [n].concat(supplements) });
      setForm({ supplement: '', dose: '', frequency: 'daily', reason: '', prescribed: false, notes: '' });
    }
    function remove(id) { setData({ supplements: supplements.filter(function(s) { return s.id !== id; }) }); }
    var freq_opts = [
      { value: 'daily', label: 'Daily' },
      { value: 'multiple', label: 'Multiple/day' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'asneeded', label: 'As needed' }
    ];
    var common = [
      { name: 'Vitamin D3', reason: 'Maine winter sun gap', dose: '1000-2000 IU' },
      { name: 'Multivitamin', reason: 'Nutritional insurance', dose: '1 tablet' },
      { name: 'Omega-3 fish oil', reason: 'EPA+DHA from fish gap', dose: '500-1000 mg' },
      { name: 'Iron', reason: 'Iron deficiency (test first!)', dose: 'Per MD' },
      { name: 'B12', reason: 'Vegan/vegetarian', dose: '500-1000 mcg' },
      { name: 'Calcium', reason: 'Bone building if dairy-low', dose: '500-1000 mg' },
      { name: 'Magnesium glycinate', reason: 'Sleep, muscle cramps', dose: '200-400 mg' },
      { name: 'Probiotic', reason: 'Gut health', dose: 'Per label' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Supplement Log', 'Document what you take + WHY', '#0891b2'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#ecfeff', border: '1px solid #67e8f9', marginBottom: 12, fontSize: 11, color: '#155e75', lineHeight: 1.55 } },
        nlH('strong', null, '⚕ Important: '),
        'Supplements can interact with medications and have toxicity limits. Check with pharmacist/doctor BEFORE starting. NIH ODS Fact Sheets are the evidence base.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.supplement, onChange: function(e) { setForm(Object.assign({}, form, { supplement: e.target.value })); }, placeholder: 'Supplement' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlInput({ value: form.dose, onChange: function(e) { setForm(Object.assign({}, form, { dose: e.target.value })); }, placeholder: 'Dose' }),
            nlSelect({ value: form.frequency, onChange: function(e) { setForm(Object.assign({}, form, { frequency: e.target.value })); } }, freq_opts)
          ),
          nlInput({ value: form.reason, onChange: function(e) { setForm(Object.assign({}, form, { reason: e.target.value })); }, placeholder: 'Why I take it (the WHY matters)' }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#155e75' } },
            nlH('input', { type: 'checkbox', checked: form.prescribed, onChange: function(e) { setForm(Object.assign({}, form, { prescribed: e.target.checked })); } }),
            nlH('span', null, 'Prescribed by doctor')
          ),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add }, '+ Log supplement')
        )
      ),
      nlCard({ style: { background: '#f0f9ff', border: '1px dashed #93c5fd' } },
        nlH('strong', { style: { fontSize: 11, color: '#075985', display: 'block', marginBottom: 6 } }, '💡 Common adolescent supplements (tap to template)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          common.map(function(c) {
            return nlH('button', { key: c.name, onClick: function() { setForm(Object.assign({}, form, { supplement: c.name, reason: c.reason, dose: c.dose })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #93c5fd', background: '#fff', fontSize: 11, color: '#075985', cursor: 'pointer' } },
              nlH('strong', null, c.name), ' (' + c.dose + ') — ', c.reason
            );
          })
        )
      ),
      supplements.length === 0
        ? nlEmpty('No supplements logged. If you take any, write them down — especially for medical visits + sharing with parents.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            supplements.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #0891b2' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#155e75' } }, '💊 ' + s.supplement + (s.prescribed ? ' 🩺' : '')),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2 } }, s.dose + ' · ' + s.frequency),
                s.reason ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2 } }, '💡 ' + s.reason) : null,
                s.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, s.notes) : null
              );
            })
          ),
      nlEvidenceFooter('NIH Office of Dietary Supplements: most adolescents don\'t need supplements if diet is varied. Real needs: vegan B12, Maine-winter vit D, iron deficiency anemia, prescribed micronutrients. Beware "gummy vitamin" mega-doses.')
    );
  }

  // 108) PersonalCaffeineLog — adolescent caffeine awareness
  function PersonalCaffeineLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [], dailyLimit: 100 };
    var setData = props.setData;
    var logs = data.logs || [];
    var dailyLimit = data.dailyLimit || 100;
    var fs = R_NL.useState({ source: '', mg: 0, time: '08:00', reason: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.source.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs), dailyLimit: dailyLimit });
      setForm({ source: '', mg: 0, time: '08:00', reason: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }), dailyLimit: dailyLimit }); }
    var today = nl_today();
    var todayMg = logs.filter(function(l) { return l.date === today; }).reduce(function(sum, l) { return sum + (l.mg || 0); }, 0);
    var pct = Math.min(100, Math.round(todayMg / dailyLimit * 100));
    var sources = [
      { name: 'Coffee (8 oz)', mg: 95 }, { name: 'Espresso shot', mg: 64 },
      { name: 'Cold brew (12 oz)', mg: 200 }, { name: 'Black tea (8 oz)', mg: 47 },
      { name: 'Green tea (8 oz)', mg: 28 }, { name: 'Coke (12 oz)', mg: 34 },
      { name: 'Mountain Dew (12 oz)', mg: 54 }, { name: 'Red Bull (8.4 oz)', mg: 80 },
      { name: 'Monster (16 oz)', mg: 160 }, { name: 'Bang (16 oz)', mg: 300 },
      { name: 'Celsius (12 oz)', mg: 200 }, { name: 'Dark chocolate (1 oz)', mg: 12 }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Caffeine Tracker', 'AAP: teens should cap at 100mg/day', '#7c2d12'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: 12, fontSize: 11, color: '#78350f', lineHeight: 1.55 } },
        nlH('strong', null, '⚠ Energy drinks ≠ regular soda: '),
        '300-400mg caffeine in a single can is common. AAP recommends ZERO energy drinks for adolescents. Multiple teen ER visits + cardiac events per year from energy-drink overuse.'
      ),
      nlCard({ style: { background: '#fee2e2', border: '1px solid #fca5a5' } },
        nlH('strong', { style: { fontSize: 14, color: '#7f1d1d' } }, 'Today: ' + todayMg + ' / ' + dailyLimit + ' mg'),
        nlH('div', { style: { width: '100%', height: 12, borderRadius: 6, background: '#fff', overflow: 'hidden', marginTop: 6, border: '1px solid #fca5a5' } },
          nlH('div', { style: { width: pct + '%', height: '100%', background: pct > 100 ? '#dc2626' : 'linear-gradient(90deg, #f59e0b, #dc2626)' } })
        ),
        nlH('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#7f1d1d' } },
          nlH('span', null, 'Daily limit:'),
          nlH('input', { type: 'number', value: dailyLimit, onChange: function(e) { setData({ logs: logs, dailyLimit: parseInt(e.target.value) || 100 }); }, style: { width: 60, padding: '3px 6px', borderRadius: 4, border: '1px solid #fca5a5', fontSize: 11 } }),
          nlH('span', null, 'mg (AAP: 100mg teens, 0 under 12, 0 energy drinks ever)')
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 8 } },
            nlInput({ value: form.source, onChange: function(e) { setForm(Object.assign({}, form, { source: e.target.value })); }, placeholder: 'Source' }),
            nlH('input', { type: 'number', value: form.mg, onChange: function(e) { setForm(Object.assign({}, form, { mg: parseInt(e.target.value) || 0 })); }, placeholder: 'mg', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlH('input', { type: 'time', value: form.time, onChange: function(e) { setForm(Object.assign({}, form, { time: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            sources.map(function(s) {
              return nlH('button', { key: s.name, onClick: function() { setForm(Object.assign({}, form, { source: s.name, mg: s.mg })); }, style: { padding: '5px 8px', borderRadius: 6, border: '1px solid ' + (s.mg > 150 ? '#fca5a5' : '#fcd34d'), background: '#fff', color: s.mg > 150 ? '#7f1d1d' : '#78350f', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, s.name + ' (' + s.mg + ')');
            })
          ),
          nlInput({ value: form.reason, onChange: function(e) { setForm(Object.assign({}, form, { reason: e.target.value })); }, placeholder: 'Reason (tiredness, study, social, taste)' }),
          nlBtn({ onClick: add, variant: 'danger' }, '+ Log caffeine')
        )
      ),
      logs.filter(function(l) { return l.date === today; }).length > 0 && nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 } },
        nlH('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Today'),
        logs.filter(function(l) { return l.date === today; }).map(function(l) {
          return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 6, background: '#fee2e2', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            nlH('span', { style: { color: '#7f1d1d' } }, l.source + ' · ' + l.mg + 'mg · ' + l.time),
            nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
          );
        })
      ),
      nlEvidenceFooter('AAP + FDA: teens under 18 should cap caffeine at 100mg/day. NO energy drinks recommended for any age <18. Late-day caffeine (after 2pm) disrupts adolescent sleep, which compounds tiredness next day → more caffeine = vicious cycle.')
    );
  }

  // 109) PersonalNightSnackLog — night snacking awareness
  function PersonalNightSnackLog(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ time: '22:00', what: '', why: 'hungry', priorMeal: 'dinner', notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.what.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ time: '22:00', what: '', why: 'hungry', priorMeal: 'dinner', notes: '' });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var why_opts = [
      { value: 'hungry', label: '🍴 Truly hungry' },
      { value: 'undereaten', label: '⚠ Undereaten earlier' },
      { value: 'screen', label: '📱 Screen-prompted' },
      { value: 'stress', label: '😰 Stress/anxiety' },
      { value: 'bored', label: '🥱 Bored' },
      { value: 'habit', label: '🔁 Just habit' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Late-Night Snack Awareness', 'Notice the pattern — late snacks often signal earlier under-eating', '#7c3aed'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#faf5ff', border: '1px solid #c4b5fd', marginBottom: 12, fontSize: 11, color: '#5b21b6', lineHeight: 1.55 } },
        nlH('strong', null, '💡 If late-night hunger is constant: '),
        'check earlier meals. Persistent night hunger usually = under-eating at lunch/dinner, not "bad habits."'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 } },
            nlH('input', { type: 'time', value: form.time, onChange: function(e) { setForm(Object.assign({}, form, { time: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlInput({ value: form.what, onChange: function(e) { setForm(Object.assign({}, form, { what: e.target.value })); }, placeholder: 'What I ate' })
          ),
          nlSelect({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); } }, why_opts),
          nlInput({ value: form.priorMeal, onChange: function(e) { setForm(Object.assign({}, form, { priorMeal: e.target.value })); }, placeholder: 'What/when was my last full meal' }),
          nlInput({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes' }),
          nlBtn({ onClick: add }, '+ Log late snack')
        )
      ),
      logs.length === 0
        ? nlEmpty('No late snacks logged. Awareness > restriction.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#faf5ff', borderLeft: '3px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#5b21b6' } }, '🌙 ' + l.time + ' · ' + l.what),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 10, color: '#5b21b6', marginTop: 2 } }, (why_opts.find(function(o) { return o.value === l.why; }) || { label: l.why }).label + (l.priorMeal ? ' · Last full meal: ' + l.priorMeal : ''))
              );
            })
          ),
      nlEvidenceFooter('Eating rhythm research: front-loading calories (more at breakfast/lunch) supports glucose stability, attention, and sleep. Persistent late-night hunger = restriction-rebound, not "willpower" issue.')
    );
  }

  // 110) PersonalCookingClass — track cooking-class learning
  function PersonalCookingClass(props) {
    if (!R_NL) return null;
    var data = props.data || { sessions: [] };
    var setData = props.setData;
    var sessions = data.sessions || [];
    var fs = R_NL.useState({ class: '', teacher: '', dishes: '', skills: '', wantToRepeat: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.class.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ sessions: [n].concat(sessions) });
      setForm({ class: '', teacher: '', dishes: '', skills: '', wantToRepeat: '' });
    }
    function remove(id) { setData({ sessions: sessions.filter(function(s) { return s.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Cooking Class Notes', 'Family + Consumer Sciences, after-school programs, online', '#a855f7'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.class, onChange: function(e) { setForm(Object.assign({}, form, { class: e.target.value })); }, placeholder: 'Class/session' }),
          nlInput({ value: form.teacher, onChange: function(e) { setForm(Object.assign({}, form, { teacher: e.target.value })); }, placeholder: 'Teacher / source' }),
          nlTextarea({ value: form.dishes, onChange: function(e) { setForm(Object.assign({}, form, { dishes: e.target.value })); }, placeholder: 'Dishes we made', rows: 2 }),
          nlTextarea({ value: form.skills, onChange: function(e) { setForm(Object.assign({}, form, { skills: e.target.value })); }, placeholder: 'Skills I learned', rows: 2 }),
          nlInput({ value: form.wantToRepeat, onChange: function(e) { setForm(Object.assign({}, form, { wantToRepeat: e.target.value })); }, placeholder: 'What I want to make at home' }),
          nlBtn({ onClick: add }, '+ Log class')
        )
      ),
      sessions.length === 0
        ? nlEmpty('No classes logged. Many Maine schools + community centers offer free cooking classes for teens.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            sessions.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#faf5ff', borderLeft: '4px solid #a855f7' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#6b21a8' } }, '👨‍🍳 ' + s.class + (s.teacher ? ' · ' + s.teacher : '')),
                  nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                s.dishes ? nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, '🍽 ' + s.dishes) : null,
                s.skills ? nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, '✨ ' + s.skills) : null,
                s.wantToRepeat ? nlH('div', { style: { fontSize: 11, color: '#6b21a8', marginTop: 2 } }, '🎯 ' + s.wantToRepeat) : null
              );
            })
          ),
      nlEvidenceFooter('FCS (Family + Consumer Sciences) research: structured cooking education increases home-cooked meal frequency, vegetable intake, and food self-efficacy across adolescence. Many Maine schools have FCS classes — sign up.')
    );
  }

  // 111) PersonalNutritionResearchLog — research projects
  function PersonalNutritionResearchLog(props) {
    if (!R_NL) return null;
    var data = props.data || { projects: [] };
    var setData = props.setData;
    var projects = data.projects || [];
    var fs = R_NL.useState({ topic: '', class: '', sources: '', myConclusion: '', citations: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.topic.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ projects: [n].concat(projects) });
      setForm({ topic: '', class: '', sources: '', myConclusion: '', citations: '' });
    }
    function remove(id) { setData({ projects: projects.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nutrition Research', 'Save research papers + projects + findings', '#0891b2'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.topic, onChange: function(e) { setForm(Object.assign({}, form, { topic: e.target.value })); }, placeholder: 'Topic' }),
          nlInput({ value: form.class, onChange: function(e) { setForm(Object.assign({}, form, { class: e.target.value })); }, placeholder: 'Class / context' }),
          nlTextarea({ value: form.sources, onChange: function(e) { setForm(Object.assign({}, form, { sources: e.target.value })); }, placeholder: 'Main sources used', rows: 3 }),
          nlTextarea({ value: form.myConclusion, onChange: function(e) { setForm(Object.assign({}, form, { myConclusion: e.target.value })); }, placeholder: 'My conclusion', rows: 3 }),
          nlTextarea({ value: form.citations, onChange: function(e) { setForm(Object.assign({}, form, { citations: e.target.value })); }, placeholder: 'Citations (full)', rows: 3 }),
          nlBtn({ onClick: add }, '+ Save research')
        )
      ),
      projects.length === 0
        ? nlEmpty('No research saved. Useful for science papers, club projects, AP Bio reports.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            projects.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: '#ecfeff', borderLeft: '4px solid #0891b2' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#155e75' } }, '🔬 ' + p.topic),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                p.class ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 2 } }, '🏫 ' + p.class) : null,
                p.sources ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 4, whiteSpace: 'pre-wrap' } }, '📚 Sources: ' + p.sources) : null,
                p.myConclusion ? nlH('div', { style: { fontSize: 11, color: '#155e75', marginTop: 4 } }, '💡 ' + p.myConclusion) : null,
                p.citations ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 4, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace' } }, p.citations) : null
              );
            })
          ),
      nlEvidenceFooter('Nutrition science is moving fast. Trustworthy sources: NIH, USDA, AAP, AHA, Harvard T.H. Chan, Cochrane reviews. Untrustworthy: random Instagram health coaches, "what I eat in a day" videos, anything selling a product.')
    );
  }

  // 112) PersonalRecipeMacros — calculate recipe macros
  function PersonalRecipeMacros(props) {
    if (!R_NL) return null;
    var data = props.data || { recipes: [] };
    var setData = props.setData;
    var recipes = data.recipes || [];
    var fs = R_NL.useState({ name: '', servings: 2, totalC: 0, totalP: 0, totalF: 0, totalFib: 0, totalKcal: 0 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.name.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      n.perServing = {
        c: (form.totalC / form.servings).toFixed(1),
        p: (form.totalP / form.servings).toFixed(1),
        f: (form.totalF / form.servings).toFixed(1),
        fib: (form.totalFib / form.servings).toFixed(1),
        kcal: Math.round(form.totalKcal / form.servings)
      };
      setData({ recipes: [n].concat(recipes) });
      setForm({ name: '', servings: 2, totalC: 0, totalP: 0, totalF: 0, totalFib: 0, totalKcal: 0 });
    }
    function remove(id) { setData({ recipes: recipes.filter(function(r) { return r.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Recipe Macro Calculator', 'For curious cooks — sum the recipe, see per-serving', '#84cc16'),
      nlBodyNote(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.name, onChange: function(e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'Recipe name' }),
          nlH('div', null,
            nlH('div', { style: { fontSize: 11, color: '#3f6212', fontWeight: 700, marginBottom: 4 } }, 'Servings: ' + form.servings),
            nlH('input', { type: 'range', min: 1, max: 12, value: form.servings, onChange: function(e) { setForm(Object.assign({}, form, { servings: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            ['totalC','totalP','totalF','totalFib','totalKcal'].map(function(key) {
              var labels = { totalC: 'Total carbs (g)', totalP: 'Total protein (g)', totalF: 'Total fat (g)', totalFib: 'Total fiber (g)', totalKcal: 'Total kcal' };
              return nlH('div', { key: key },
                nlH('label', { style: { fontSize: 11, color: '#3f6212', fontWeight: 700 } }, labels[key]),
                nlH('input', { type: 'number', value: form[key], onChange: function(e) { var nf = Object.assign({}, form); nf[key] = parseFloat(e.target.value) || 0; setForm(nf); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
              );
            })
          ),
          form.servings > 0 && form.totalKcal > 0 ? nlH('div', { style: { padding: 8, borderRadius: 6, background: '#f7fee7', fontSize: 12, color: '#3f6212' } },
            nlH('strong', null, 'Per serving: '),
            'C ' + (form.totalC / form.servings).toFixed(1) + 'g · P ' + (form.totalP / form.servings).toFixed(1) + 'g · F ' + (form.totalF / form.servings).toFixed(1) + 'g · Fib ' + (form.totalFib / form.servings).toFixed(1) + 'g · ' + Math.round(form.totalKcal / form.servings) + ' kcal'
          ) : null,
          nlBtn({ onClick: add }, '+ Save calculated recipe')
        )
      ),
      recipes.length === 0
        ? nlEmpty('No recipes calculated. Helpful for understanding portion-vs-recipe math; not for restriction.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            recipes.map(function(r) {
              return nlH('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: '#f7fee7', borderLeft: '4px solid #84cc16' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '🧮 ' + r.name + ' (' + r.servings + ' servings)'),
                  nlH('button', { onClick: function() { remove(r.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 4 } }, 'Per serving: C ' + r.perServing.c + 'g · P ' + r.perServing.p + 'g · F ' + r.perServing.f + 'g · Fib ' + r.perServing.fib + 'g · ' + r.perServing.kcal + ' kcal')
              );
            })
          ),
      nlEvidenceFooter('Calorie counting at the meal level can fuel disordered eating. Use this tool as a learning aid (curiosity, school project) — not a daily tracker.')
    );
  }

  // 113) PersonalRDLog — work-with-an-RD log
  function PersonalRDLog(props) {
    if (!R_NL) return null;
    var data = props.data || { sessions: [] };
    var setData = props.setData;
    var sessions = data.sessions || [];
    var fs = R_NL.useState({ rdName: '', kind: 'in-person', goals: '', plan: '', followup: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.rdName.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ sessions: [n].concat(sessions) });
      setForm({ rdName: '', kind: 'in-person', goals: '', plan: '', followup: '' });
    }
    function remove(id) { setData({ sessions: sessions.filter(function(s) { return s.id !== id; }) }); }
    var k_opts = [
      { value: 'in-person', label: '👥 In-person' },
      { value: 'telehealth', label: '💻 Telehealth' },
      { value: 'phone', label: '☎ Phone' },
      { value: 'school', label: '🏫 At school' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Registered Dietitian Log', 'Sessions with an RD — track plan + progress', '#16a34a'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#f0fdf4', border: '1px solid #6ee7b7', marginBottom: 12, fontSize: 11, color: '#065f46', lineHeight: 1.55 } },
        nlH('strong', null, '💚 Why an RD?: '),
        'Registered Dietitians are the only credential with required clinical training (Master\'s + 1200hr internship + national exam). Insurance often covers visits for ED, diabetes, allergies. Maine RDs at MaineHealth + EMHS systems.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.rdName, onChange: function(e) { setForm(Object.assign({}, form, { rdName: e.target.value })); }, placeholder: 'RD name + role' }),
          nlSelect({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); } }, k_opts),
          nlTextarea({ value: form.goals, onChange: function(e) { setForm(Object.assign({}, form, { goals: e.target.value })); }, placeholder: 'Goals discussed', rows: 3 }),
          nlTextarea({ value: form.plan, onChange: function(e) { setForm(Object.assign({}, form, { plan: e.target.value })); }, placeholder: 'Plan (what to do between sessions)', rows: 3 }),
          nlInput({ value: form.followup, onChange: function(e) { setForm(Object.assign({}, form, { followup: e.target.value })); }, placeholder: 'Follow-up scheduled' }),
          nlBtn({ onClick: add, variant: 'success' }, '+ Log session')
        )
      ),
      sessions.length === 0
        ? nlEmpty('No RD sessions logged. Maine resources: Akari Care + EMHS + MaineHealth dietitians.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            sessions.map(function(s) {
              return nlH('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: '#f0fdf4', borderLeft: '4px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#166534' } }, '🥗 ' + s.rdName + ' · ' + (k_opts.find(function(o) { return o.value === s.kind; }) || { label: '' }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(s.date)),
                    nlH('button', { onClick: function() { remove(s.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                s.goals ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 4 } }, '🎯 ' + s.goals) : null,
                s.plan ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2, whiteSpace: 'pre-wrap' } }, '📋 ' + s.plan) : null,
                s.followup ? nlH('div', { style: { fontSize: 11, color: '#166534', marginTop: 2 } }, '📅 ' + s.followup) : null
              );
            })
          ),
      nlEvidenceFooter('Academy of Nutrition and Dietetics: RD MNT (Medical Nutrition Therapy) is evidence-based + insurance-billable. Common conditions: ED, T1D, celiac, IBS, kidney disease, sports nutrition.')
    );
  }

  // 114) PersonalReadinessCheck — readiness assessment
  function PersonalReadinessCheck(props) {
    if (!R_NL) return null;
    var data = props.data || { checks: [] };
    var setData = props.setData;
    var checks = data.checks || [];
    var fs = R_NL.useState({ change: '', importance: 5, confidence: 5, readiness: 5, barriers: '', firstStep: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.change.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ checks: [n].concat(checks) });
      setForm({ change: '', importance: 5, confidence: 5, readiness: 5, barriers: '', firstStep: '' });
    }
    function remove(id) { setData({ checks: checks.filter(function(c) { return c.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Readiness Check', 'MI scales — for any nutrition change you\'re considering', '#0d9488'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#f0fdfa', border: '1px solid #5eead4', marginBottom: 12, fontSize: 11, color: '#0f766e', lineHeight: 1.55 } },
        nlH('strong', null, '🧭 Motivational Interviewing rulers: '),
        'Importance × Confidence × Readiness. If any score is <5, the change won\'t stick yet. Address the lowest first.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.change, onChange: function(e) { setForm(Object.assign({}, form, { change: e.target.value })); }, placeholder: 'Change I\'m considering' }),
          ['importance','confidence','readiness'].map(function(key) {
            var labels = { importance: 'How important?', confidence: 'How confident I can do it?', readiness: 'How ready am I?' };
            return nlH('div', { key: key },
              nlH('div', { style: { fontSize: 11, color: '#0f766e', fontWeight: 700, marginBottom: 4 } }, labels[key] + ': ' + form[key] + '/10'),
              nlH('input', { type: 'range', min: 1, max: 10, value: form[key], onChange: function(e) { var nf = Object.assign({}, form); nf[key] = parseInt(e.target.value); setForm(nf); }, style: { width: '100%' } })
            );
          }),
          nlInput({ value: form.barriers, onChange: function(e) { setForm(Object.assign({}, form, { barriers: e.target.value })); }, placeholder: 'What\'s in the way' }),
          nlInput({ value: form.firstStep, onChange: function(e) { setForm(Object.assign({}, form, { firstStep: e.target.value })); }, placeholder: 'One first step I can take' }),
          nlBtn({ onClick: add }, '+ Save readiness check')
        )
      ),
      checks.length === 0
        ? nlEmpty('No readiness checks yet. Useful before launching any new nutrition habit.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            checks.map(function(c) {
              return nlH('div', { key: c.id, style: { padding: 10, borderRadius: 8, background: '#f0fdfa', borderLeft: '4px solid #0d9488' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#0f766e' } }, '⚖ ' + c.change),
                  nlH('button', { onClick: function() { remove(c.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 2, fontWeight: 700 } }, 'Imp ' + c.importance + ' · Conf ' + c.confidence + ' · Ready ' + c.readiness),
                c.barriers ? nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 2 } }, '⚠ ' + c.barriers) : null,
                c.firstStep ? nlH('div', { style: { fontSize: 11, color: '#0f766e', marginTop: 2 } }, '👣 ' + c.firstStep) : null
              );
            })
          ),
      nlEvidenceFooter('Motivational Interviewing (Miller & Rollnick): readiness rulers diagnose where to intervene. Pushing change before readiness is real causes resistance + relapse.')
    );
  }

  // 115) PersonalRecoveryWin — celebrate small wins
  function PersonalRecoveryWin(props) {
    if (!R_NL) return null;
    var data = props.data || { wins: [] };
    var setData = props.setData;
    var wins = data.wins || [];
    var fs = R_NL.useState({ win: '', sizedAs: 'medium', whatItMeant: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.win.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ wins: [n].concat(wins) });
      setForm({ win: '', sizedAs: 'medium', whatItMeant: '' });
    }
    function remove(id) { setData({ wins: wins.filter(function(w) { return w.id !== id; }) }); }
    var s_opts = [
      { value: 'tiny', label: '✨ Tiny (counts)' },
      { value: 'small', label: '🌱 Small' },
      { value: 'medium', label: '🌟 Medium' },
      { value: 'big', label: '🏆 Big' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Wins Log', 'Every nutrition win counts — small wins build momentum', '#fbbf24'),
      nlNEDABanner(),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.win, onChange: function(e) { setForm(Object.assign({}, form, { win: e.target.value })); }, placeholder: 'My win' }),
          nlSelect({ value: form.sizedAs, onChange: function(e) { setForm(Object.assign({}, form, { sizedAs: e.target.value })); } }, s_opts),
          nlTextarea({ value: form.whatItMeant, onChange: function(e) { setForm(Object.assign({}, form, { whatItMeant: e.target.value })); }, placeholder: 'What it meant to me', rows: 3 }),
          nlBtn({ onClick: add, variant: 'warning' }, '+ Celebrate win')
        )
      ),
      wins.length === 0
        ? nlEmpty('No wins logged. Tiny wins count: "I ate breakfast." "I asked for what I needed." "I rested."')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            wins.slice(0, 50).map(function(w) {
              return nlH('div', { key: w.id, style: { padding: 10, borderRadius: 8, background: '#fef3c7', borderLeft: '4px solid #fbbf24' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#78350f' } }, '🏆 ' + w.win),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(w.date)),
                    nlH('button', { onClick: function() { remove(w.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 2 } }, (s_opts.find(function(o) { return o.value === w.sizedAs; }) || { label: '' }).label),
                w.whatItMeant ? nlH('div', { style: { fontSize: 11, color: '#78350f', marginTop: 2, fontStyle: 'italic' } }, '💛 ' + w.whatItMeant) : null
              );
            })
          ),
      nlEvidenceFooter('Behavioral activation + positive psychology: documenting wins amplifies motivation. The dopamine spike from celebration consolidates the behavior more than rewards do.')
    );
  }

  // 116) PersonalNutritionKitExport — data export
  function PersonalNutritionKitExport(props) {
    if (!R_NL) return null;
    var allData = props.allData || {};
    var ks = R_NL.useState(false); var showJson = ks[0]; var setShowJson = ks[1];
    var jsonStr = JSON.stringify(allData, null, 2);
    function copy() {
      try { navigator.clipboard.writeText(jsonStr); } catch (e) {}
    }
    function downloadCsv() {
      var lines = ['Tool,Date,Summary'];
      Object.keys(allData).forEach(function(key) {
        var d = allData[key];
        if (d && Array.isArray(d.entries)) lines.push(key + ',' + d.entries.length + ' entries,total');
        if (d && Array.isArray(d.logs)) lines.push(key + ',' + d.logs.length + ' logs,total');
      });
      var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'nutrition-kit-summary.csv'; a.click();
    }
    return nlH('div', { style: { padding: 14 } },
      nlSection('Export My Nutrition Kit', 'Download or share your data', '#0891b2'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlBtn({ onClick: copy, variant: 'primary' }, '📋 Copy all data to clipboard (JSON)'),
          nlBtn({ onClick: downloadCsv, variant: 'secondary' }, '⬇ Download CSV summary'),
          nlBtn({ onClick: function() { setShowJson(!showJson); }, variant: 'ghost' }, showJson ? 'Hide preview' : 'Show JSON preview'),
          showJson ? nlH('pre', { style: { maxHeight: 300, overflow: 'auto', padding: 10, background: '#1e293b', color: '#e2e8f0', borderRadius: 8, fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'pre-wrap' } }, jsonStr) : null
        )
      ),
      nlEvidenceFooter('All data lives in your browser — never sent anywhere. Export is for YOU: bring to RD/MD visits, share with parent, save off-device.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ WAVE 13: HOLISTIC / WELLNESS INTEGRATION (10 tools) ═══
  // ══════════════════════════════════════════════════════════════════

  // 117) PersonalSleepNutritionLink — sleep + nutrition tracker
  function PersonalSleepNutritionLink(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ sleepHrs: 8, sleepQuality: 5, latestMeal: '', lastCaffeine: '', screenBeforeBed: false, energyNextDay: 5 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ sleepHrs: 8, sleepQuality: 5, latestMeal: '', lastCaffeine: '', screenBeforeBed: false, energyNextDay: 5 });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Sleep + Nutrition Link', 'They affect each other — log both together', '#3b82f6'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#dbeafe', border: '1px solid #93c5fd', marginBottom: 12, fontSize: 11, color: '#1e40af', lineHeight: 1.55 } },
        nlH('strong', null, '💙 The connection: '),
        'Poor sleep → cravings + impulsivity + insulin resistance next day (Spiegel, Walker). Late meals + caffeine + screens disrupt sleep. Tracking both shows YOUR pattern.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Hours slept: ' + form.sleepHrs),
              nlH('input', { type: 'range', min: 3, max: 12, step: 0.5, value: form.sleepHrs, onChange: function(e) { setForm(Object.assign({}, form, { sleepHrs: parseFloat(e.target.value) })); }, style: { width: '100%' } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Quality: ' + form.sleepQuality + '/10'),
              nlH('input', { type: 'range', min: 1, max: 10, value: form.sleepQuality, onChange: function(e) { setForm(Object.assign({}, form, { sleepQuality: parseInt(e.target.value) })); }, style: { width: '100%' } })
            )
          ),
          nlInput({ value: form.latestMeal, onChange: function(e) { setForm(Object.assign({}, form, { latestMeal: e.target.value })); }, placeholder: 'Latest meal time + what' }),
          nlInput({ value: form.lastCaffeine, onChange: function(e) { setForm(Object.assign({}, form, { lastCaffeine: e.target.value })); }, placeholder: 'Last caffeine time' }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1e40af' } },
            nlH('input', { type: 'checkbox', checked: form.screenBeforeBed, onChange: function(e) { setForm(Object.assign({}, form, { screenBeforeBed: e.target.checked })); } }),
            nlH('span', null, 'Phone/screen within 30 min of bedtime')
          ),
          nlH('div', null,
            nlH('label', { style: { fontSize: 11, color: '#1e40af', fontWeight: 700 } }, 'Energy next day: ' + form.energyNextDay + '/10'),
            nlH('input', { type: 'range', min: 1, max: 10, value: form.energyNextDay, onChange: function(e) { setForm(Object.assign({}, form, { energyNextDay: parseInt(e.target.value) })); }, style: { width: '100%' } })
          ),
          nlBtn({ onClick: add }, '+ Log sleep + nutrition')
        )
      ),
      logs.length === 0
        ? nlEmpty('Log for 2 weeks to see the pattern. Sleep + meals are a system.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#dbeafe', borderLeft: '3px solid #3b82f6' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#1e40af' } }, '🛌 ' + l.sleepHrs + 'hr · Q ' + l.sleepQuality + '/10 → Energy ' + l.energyNextDay + '/10'),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.latestMeal ? nlH('div', { style: { fontSize: 10, color: '#1e40af', marginTop: 2 } }, '🍴 ' + l.latestMeal) : null,
                l.lastCaffeine ? nlH('div', { style: { fontSize: 10, color: '#1e40af' } }, '☕ ' + l.lastCaffeine) : null,
                l.screenBeforeBed ? nlH('div', { style: { fontSize: 10, color: '#dc2626' } }, '📱 Screen before bed') : null
              );
            })
          ),
      nlEvidenceFooter('Walker (Why We Sleep): adolescents need 8-10 hrs sleep. Sleep < 7 hrs = next-day insulin resistance + carb cravings (~300 extra kcal). Caffeine after 2pm blocks adenosine and delays sleep onset 60-90 min.')
    );
  }

  // 118) PersonalMovementNutritionLink — movement + nutrition link
  function PersonalMovementNutritionLink(props) {
    if (!R_NL) return null;
    var data = props.data || { logs: [] };
    var setData = props.setData;
    var logs = data.logs || [];
    var fs = R_NL.useState({ movementMin: 30, kind: 'walk', preFood: '', postFood: '', felt: 5, mood: 5 });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ logs: [n].concat(logs) });
      setForm({ movementMin: 30, kind: 'walk', preFood: '', postFood: '', felt: 5, mood: 5 });
    }
    function remove(id) { setData({ logs: logs.filter(function(l) { return l.id !== id; }) }); }
    var k_opts = [
      { value: 'walk', label: '🚶 Walking' },
      { value: 'run', label: '🏃 Running' },
      { value: 'bike', label: '🚴 Cycling' },
      { value: 'lift', label: '🏋 Lifting' },
      { value: 'sport', label: '⚽ Sport' },
      { value: 'dance', label: '💃 Dance/movement' },
      { value: 'yoga', label: '🧘 Yoga/stretch' },
      { value: 'rest', label: '🛌 Rest day' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Movement + Nutrition Link', 'How movement and food shape each other — joyfully', '#16a34a'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', marginBottom: 12, fontSize: 11, color: '#166534', lineHeight: 1.55 } },
        nlH('strong', null, '💚 Important framing: '),
        'Movement is for what your body can DO — not to "earn" food, "burn off" food, or punish. Eat to support movement; movement to feel good in your body.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 } },
            nlH('input', { type: 'number', value: form.movementMin, onChange: function(e) { setForm(Object.assign({}, form, { movementMin: parseInt(e.target.value) || 0 })); }, placeholder: 'min', style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlSelect({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); } }, k_opts)
          ),
          nlInput({ value: form.preFood, onChange: function(e) { setForm(Object.assign({}, form, { preFood: e.target.value })); }, placeholder: 'Pre-movement food' }),
          nlInput({ value: form.postFood, onChange: function(e) { setForm(Object.assign({}, form, { postFood: e.target.value })); }, placeholder: 'Post-movement food' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#166534', fontWeight: 700 } }, 'How it felt: ' + form.felt + '/10'),
              nlH('input', { type: 'range', min: 1, max: 10, value: form.felt, onChange: function(e) { setForm(Object.assign({}, form, { felt: parseInt(e.target.value) })); }, style: { width: '100%' } })
            ),
            nlH('div', null,
              nlH('label', { style: { fontSize: 11, color: '#166534', fontWeight: 700 } }, 'Mood: ' + form.mood + '/10'),
              nlH('input', { type: 'range', min: 1, max: 10, value: form.mood, onChange: function(e) { setForm(Object.assign({}, form, { mood: parseInt(e.target.value) })); }, style: { width: '100%' } })
            )
          ),
          nlBtn({ onClick: add }, '+ Log movement + food')
        )
      ),
      logs.length === 0
        ? nlEmpty('No logs yet. Movement is medicine for the mind too — not just the body.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            logs.slice(0, 30).map(function(l) {
              return nlH('div', { key: l.id, style: { padding: 8, borderRadius: 8, background: '#f0fdf4', borderLeft: '3px solid #16a34a' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: '#166534' } }, '🏃 ' + l.movementMin + ' min · ' + (k_opts.find(function(o) { return o.value === l.kind; }) || { label: '' }).label),
                  nlH('div', null,
                    nlH('span', { style: { fontSize: 10, color: '#64748b', marginRight: 6 } }, nl_relDate(l.date)),
                    nlH('button', { onClick: function() { remove(l.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                l.preFood ? nlH('div', { style: { fontSize: 10, color: '#166534', marginTop: 2 } }, '⏰ Pre: ' + l.preFood) : null,
                l.postFood ? nlH('div', { style: { fontSize: 10, color: '#166534' } }, '🔧 Post: ' + l.postFood) : null,
                nlH('div', { style: { fontSize: 10, color: '#166534', marginTop: 2 } }, 'Felt ' + l.felt + ' · Mood ' + l.mood)
              );
            })
          ),
      nlEvidenceFooter('HAES + movement research (Bacon): movement that feels good is sustained; movement as punishment is abandoned. Mood lift from exercise is reliable + dose-responsive (Babyak et al, depression research).')
    );
  }

  // 119) PersonalParentMessage — parent communication
  function PersonalParentMessage(props) {
    if (!R_NL) return null;
    var data = props.data || { messages: [] };
    var setData = props.setData;
    var messages = data.messages || [];
    var fs = R_NL.useState({ topic: '', whatToSay: '', tone: 'matter-of-fact', boundary: '', context: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.topic.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ messages: [n].concat(messages) });
      setForm({ topic: '', whatToSay: '', tone: 'matter-of-fact', boundary: '', context: '' });
    }
    function remove(id) { setData({ messages: messages.filter(function(m) { return m.id !== id; }) }); }
    var t_opts = [
      { value: 'matter-of-fact', label: '😐 Matter-of-fact' },
      { value: 'vulnerable', label: '💔 Vulnerable' },
      { value: 'firm', label: '✊ Firm' },
      { value: 'asking', label: '🙏 Asking' }
    ];
    var examples = [
      { t: 'Need food for after-school sports', s: 'Hey, I\'m starving after practice. Can we add granola bars + apples to the grocery list?' },
      { t: 'Asking for less diet talk at dinner', s: 'It\'s really hard for me when food gets discussed as good/bad at dinner. Can we just eat?' },
      { t: 'Cultural foods at school', s: 'I miss eating [food] for lunch. Can you help me pack it sometimes? I don\'t want to lose it.' },
      { t: 'Allergies / food rules respect', s: 'Please trust me when I say [food] doesn\'t feel right. I\'m not being picky — my body reacts.' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Parent Conversation Drafts', 'Hard food/body conversations — pre-write your part', '#7c3aed'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.topic, onChange: function(e) { setForm(Object.assign({}, form, { topic: e.target.value })); }, placeholder: 'Topic' }),
          nlTextarea({ value: form.whatToSay, onChange: function(e) { setForm(Object.assign({}, form, { whatToSay: e.target.value })); }, placeholder: 'What I want to say (in my words)', rows: 4 }),
          nlSelect({ value: form.tone, onChange: function(e) { setForm(Object.assign({}, form, { tone: e.target.value })); } }, t_opts),
          nlInput({ value: form.boundary, onChange: function(e) { setForm(Object.assign({}, form, { boundary: e.target.value })); }, placeholder: 'Boundary I\'m setting (if any)' }),
          nlInput({ value: form.context, onChange: function(e) { setForm(Object.assign({}, form, { context: e.target.value })); }, placeholder: 'When/where I\'ll say it' }),
          nlBtn({ onClick: add }, '+ Save draft')
        )
      ),
      nlCard({ style: { background: '#faf5ff', border: '1px dashed #d8b4fe' } },
        nlH('strong', { style: { fontSize: 11, color: '#5b21b6', display: 'block', marginBottom: 6 } }, '💡 Example conversations (tap to start)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          examples.map(function(ex, i) {
            return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { topic: ex.t, whatToSay: ex.s })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #d8b4fe', background: '#fff', fontSize: 11, color: '#5b21b6', cursor: 'pointer' } },
              nlH('strong', null, ex.t), nlH('br', null), ex.s
            );
          })
        )
      ),
      messages.length === 0
        ? nlEmpty('No drafts saved. Practicing once = it\'s available in the moment.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            messages.map(function(m) {
              return nlH('div', { key: m.id, style: { padding: 10, borderRadius: 8, background: '#faf5ff', borderLeft: '4px solid #7c3aed' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#5b21b6' } }, '💬 ' + m.topic),
                  nlH('button', { onClick: function() { remove(m.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                m.whatToSay ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 4, whiteSpace: 'pre-wrap', fontStyle: 'italic' } }, '"' + m.whatToSay + '"') : null,
                nlH('div', { style: { fontSize: 10, color: '#5b21b6', marginTop: 4 } }, '🎭 ' + (t_opts.find(function(o) { return o.value === m.tone; }) || { label: '' }).label),
                m.boundary ? nlH('div', { style: { fontSize: 11, color: '#5b21b6', marginTop: 2 } }, '🛡 ' + m.boundary) : null,
                m.context ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, '📍 ' + m.context) : null
              );
            })
          ),
      nlEvidenceFooter('Adolescent-parent communication research (Steinberg): adolescents who script important conversations report higher self-efficacy + better outcomes. Parents often respond better when adolescents come with a clear ask.')
    );
  }

  // 120) PersonalTeacherEmail — teacher communication
  function PersonalTeacherEmail(props) {
    if (!R_NL) return null;
    var data = props.data || { emails: [] };
    var setData = props.setData;
    var emails = data.emails || [];
    var fs = R_NL.useState({ teacher: '', subject: '', body: '', sent: false });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.teacher.trim() || !form.subject.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ emails: [n].concat(emails) });
      setForm({ teacher: '', subject: '', body: '', sent: false });
    }
    function remove(id) { setData({ emails: emails.filter(function(e) { return e.id !== id; }) }); }
    var templates = [
      { sub: 'Field trip food request', body: 'Hi [teacher],\n\nI have [allergy/condition] and want to ensure the field trip food is safe for me. Can we discuss what will be served and whether I should pack my own?\n\nThanks,\n[name]' },
      { sub: 'Class snack policy', body: 'Hi [teacher],\n\nI noticed [class snack] doesn\'t work for my [allergy/dietary need]. Would it be possible to have a class discussion about snack inclusivity, or could I bring my own?\n\nThank you,\n[name]' },
      { sub: 'Cafeteria accommodation', body: 'Hi [teacher],\n\nI\'m having trouble finding food at the cafeteria that fits my needs ([reason]). Could we talk about how I can pack/buy something that works?\n\nThanks,\n[name]' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Teacher Email Drafts', 'For accommodations, requests, concerns', '#0ea5e9'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.teacher, onChange: function(e) { setForm(Object.assign({}, form, { teacher: e.target.value })); }, placeholder: 'Teacher' }),
          nlInput({ value: form.subject, onChange: function(e) { setForm(Object.assign({}, form, { subject: e.target.value })); }, placeholder: 'Subject line' }),
          nlTextarea({ value: form.body, onChange: function(e) { setForm(Object.assign({}, form, { body: e.target.value })); }, placeholder: 'Email body', rows: 8 }),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#075985' } },
            nlH('input', { type: 'checkbox', checked: form.sent, onChange: function(e) { setForm(Object.assign({}, form, { sent: e.target.checked })); } }),
            nlH('span', null, 'Already sent')
          ),
          nlBtn({ onClick: add }, '+ Save email draft')
        )
      ),
      nlCard({ style: { background: '#f0f9ff', border: '1px dashed #93c5fd' } },
        nlH('strong', { style: { fontSize: 11, color: '#075985', display: 'block', marginBottom: 6 } }, '💡 Email templates (tap to use)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          templates.map(function(t, i) {
            return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { subject: t.sub, body: t.body })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #93c5fd', background: '#fff', fontSize: 11, color: '#075985', cursor: 'pointer' } },
              nlH('strong', null, t.sub)
            );
          })
        )
      ),
      emails.length === 0
        ? nlEmpty('No drafts. Teachers respond well to clear, specific, polite requests.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            emails.map(function(e) {
              return nlH('div', { key: e.id, style: { padding: 10, borderRadius: 8, background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 13, color: '#075985' } }, (e.sent ? '✓ ' : '✏ ') + e.subject + ' (to ' + e.teacher + ')'),
                  nlH('button', { onClick: function() { remove(e.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                e.body ? nlH('pre', { style: { fontSize: 11, color: '#075985', marginTop: 4, whiteSpace: 'pre-wrap', fontFamily: 'inherit' } }, e.body) : null
              );
            })
          ),
      nlEvidenceFooter('Self-advocacy research: students who email teachers proactively about accommodations report higher educational outcomes + stronger self-efficacy. Email is asynchronous = lower-pressure than face-to-face.')
    );
  }

  // 121) Personal504Plan — 504 plan tracker
  function Personal504Plan(props) {
    if (!R_NL) return null;
    var data = props.data || { items: [] };
    var setData = props.setData;
    var items = data.items || [];
    var fs = R_NL.useState({ accommodation: '', granted: false, who: '', dateRequested: nl_today(), notes: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.accommodation.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ items: [n].concat(items) });
      setForm({ accommodation: '', granted: false, who: '', dateRequested: nl_today(), notes: '' });
    }
    function remove(id) { setData({ items: items.filter(function(i) { return i.id !== id; }) }); }
    function toggleGranted(id) {
      setData({ items: items.map(function(i) { return i.id === id ? Object.assign({}, i, { granted: !i.granted }) : i; }) });
    }
    var common_acc = [
      'Access to snacks during class for blood sugar',
      'Permission to carry water bottle',
      'Use of bathroom without asking (IBS/Crohn\'s)',
      'Modified gym uniform (medical reason)',
      'Cafeteria allergen safe-zone seating',
      'EpiPen self-carry permission',
      'Late arrival accommodation (med-related sleep)',
      'Alternative cafeteria food (celiac, allergy)',
      'Permission to leave class to manage glucose (T1D)',
      'Quiet location for medication or insulin'
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My 504/IEP Nutrition Accommodations', 'Federal protections for food-related needs', '#dc2626'),
      nlH('div', { style: { padding: 10, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 12, fontSize: 11, color: '#7f1d1d', lineHeight: 1.55 } },
        nlH('strong', null, '⚖ Your legal rights: '),
        'Under Section 504 + IDEA, schools must provide accommodations for documented disabilities (including food allergies, T1D, ARFID, IBD, celiac, etc.). 504 plans are written + binding.'
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.accommodation, onChange: function(e) { setForm(Object.assign({}, form, { accommodation: e.target.value })); }, placeholder: 'Accommodation' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlInput({ value: form.who, onChange: function(e) { setForm(Object.assign({}, form, { who: e.target.value })); }, placeholder: 'Who I asked' }),
            nlH('input', { type: 'date', value: form.dateRequested, onChange: function(e) { setForm(Object.assign({}, form, { dateRequested: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } })
          ),
          nlH('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7f1d1d', fontWeight: 700 } },
            nlH('input', { type: 'checkbox', checked: form.granted, onChange: function(e) { setForm(Object.assign({}, form, { granted: e.target.checked })); } }),
            nlH('span', null, '✓ Granted / in writing')
          ),
          nlTextarea({ value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); }, placeholder: 'Notes', rows: 2 }),
          nlBtn({ onClick: add, variant: 'danger' }, '+ Track accommodation')
        )
      ),
      nlCard({ style: { background: '#fee2e2', border: '1px dashed #fca5a5' } },
        nlH('strong', { style: { fontSize: 11, color: '#7f1d1d', display: 'block', marginBottom: 6 } }, '💡 Common food/nutrition accommodations (tap to track)'),
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          common_acc.map(function(a, i) {
            return nlH('button', { key: i, onClick: function() { setForm(Object.assign({}, form, { accommodation: a })); }, style: { textAlign: 'left', padding: 6, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', fontSize: 11, color: '#7f1d1d', cursor: 'pointer' } }, a);
          })
        )
      ),
      items.length === 0
        ? nlEmpty('No accommodations tracked. If you have a documented condition, request a 504 meeting.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            items.map(function(i) {
              return nlH('div', { key: i.id, style: { padding: 10, borderRadius: 8, background: i.granted ? '#dcfce7' : '#fef2f2', borderLeft: '4px solid ' + (i.granted ? '#16a34a' : '#dc2626') } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 12, color: i.granted ? '#166534' : '#7f1d1d' } }, (i.granted ? '✓ ' : '⌛ ') + i.accommodation),
                  nlH('div', null,
                    nlH('button', { onClick: function() { toggleGranted(i.id); }, style: { background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', marginRight: 4 } }, i.granted ? 'Mark pending' : 'Mark granted'),
                    nlH('button', { onClick: function() { remove(i.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                  )
                ),
                i.who ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, '👤 ' + i.who + ' · 📅 ' + i.dateRequested) : null,
                i.notes ? nlH('div', { style: { fontSize: 10, color: '#475569', marginTop: 2, fontStyle: 'italic' } }, i.notes) : null
              );
            })
          ),
      nlEvidenceFooter('FARE + ADA + JDRF + Beyond Celiac: 504 plans are powerful legal tools for any documented food-related condition. Maine schools are obligated under federal law to provide reasonable accommodations + cannot retaliate for requests.')
    );
  }

  // 122) PersonalMedicalEmergencyCard — emergency info card
  function PersonalMedicalEmergencyCard(props) {
    if (!R_NL) return null;
    var data = props.data || { card: {} };
    var setData = props.setData;
    var card = data.card || {};
    var fs = R_NL.useState(card);
    var form = fs[0]; var setForm = fs[1];
    function save() { setData({ card: form }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Medical Emergency Card', 'Print + carry — paramedics need to know', '#dc2626'),
      nlCard({ style: { background: '#fee2e2', border: '2px solid #ef4444' } },
        nlH('strong', { style: { fontSize: 14, color: '#7f1d1d', display: 'block', marginBottom: 6 } }, '⚠ Print this card + put in wallet/backpack'),
        nlH('div', { style: { fontSize: 11, color: '#7f1d1d', lineHeight: 1.6 } },
          'In a food emergency (allergic reaction, blood sugar crash, choking), seconds matter. Carry this info.'
        )
      ),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.fullName || '', onChange: function(e) { setForm(Object.assign({}, form, { fullName: e.target.value })); }, placeholder: 'Full name' }),
          nlInput({ value: form.dob || '', onChange: function(e) { setForm(Object.assign({}, form, { dob: e.target.value })); }, placeholder: 'DOB' }),
          nlTextarea({ value: form.allergens || '', onChange: function(e) { setForm(Object.assign({}, form, { allergens: e.target.value })); }, placeholder: 'Allergies (and severity)', rows: 3 }),
          nlTextarea({ value: form.conditions || '', onChange: function(e) { setForm(Object.assign({}, form, { conditions: e.target.value })); }, placeholder: 'Medical conditions (T1D, asthma, etc.)', rows: 3 }),
          nlTextarea({ value: form.medications || '', onChange: function(e) { setForm(Object.assign({}, form, { medications: e.target.value })); }, placeholder: 'Medications (incl. dosages)', rows: 3 }),
          nlInput({ value: form.emergency1 || '', onChange: function(e) { setForm(Object.assign({}, form, { emergency1: e.target.value })); }, placeholder: 'Emergency contact 1 (name + phone + relationship)' }),
          nlInput({ value: form.emergency2 || '', onChange: function(e) { setForm(Object.assign({}, form, { emergency2: e.target.value })); }, placeholder: 'Emergency contact 2' }),
          nlInput({ value: form.doctor || '', onChange: function(e) { setForm(Object.assign({}, form, { doctor: e.target.value })); }, placeholder: 'Primary doctor + phone' }),
          nlInput({ value: form.insurance || '', onChange: function(e) { setForm(Object.assign({}, form, { insurance: e.target.value })); }, placeholder: 'Insurance company + member ID' }),
          nlInput({ value: form.bloodType || '', onChange: function(e) { setForm(Object.assign({}, form, { bloodType: e.target.value })); }, placeholder: 'Blood type (if known)' }),
          nlBtn({ onClick: save, variant: 'danger' }, '✓ Save emergency card'),
          nlBtn({ onClick: function() { try { window.print(); } catch (e) {} }, variant: 'primary' }, '🖨 Print card')
        )
      ),
      nlEvidenceFooter('FARE + AAP: medical emergency cards save lives in food anaphylaxis, T1D severe hypo, asthma attacks. Carry in wallet + backpack + lunchbox. School nurse should have a copy too.')
    );
  }

  // 123) PersonalNutritionVision — vision board
  function PersonalNutritionVision(props) {
    if (!R_NL) return null;
    var data = props.data || { items: [] };
    var setData = props.setData;
    var items = data.items || [];
    var fs = R_NL.useState({ kind: 'feeling', description: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.description.trim()) return;
      var n = { id: nl_id(), date: nl_today() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ items: [n].concat(items) });
      setForm({ kind: 'feeling', description: '' });
    }
    function remove(id) { setData({ items: items.filter(function(i) { return i.id !== id; }) }); }
    var k_opts = [
      { value: 'feeling', label: '💚 Feeling I want' },
      { value: 'meal', label: '🍽 Meal I want to make/eat' },
      { value: 'skill', label: '✨ Skill I want' },
      { value: 'relationship', label: '🤝 Relationship I want with food' },
      { value: 'identity', label: '🌟 Who I want to be around food' }
    ];
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nutrition Vision Board', 'Words/phrases that capture what you want', '#a855f7'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlSelect({ value: form.kind, onChange: function(e) { setForm(Object.assign({}, form, { kind: e.target.value })); } }, k_opts),
          nlTextarea({ value: form.description, onChange: function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }, placeholder: 'Describe', rows: 3 }),
          nlBtn({ onClick: add }, '+ Add vision item')
        )
      ),
      items.length === 0
        ? nlEmpty('No vision items yet. Start with: "I want to feel _____ when I eat."')
        : nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 } },
            items.map(function(i) {
              var c = { feeling: '#10b981', meal: '#f59e0b', skill: '#3b82f6', relationship: '#ec4899', identity: '#a855f7' }[i.kind] || '#64748b';
              return nlH('div', { key: i.id, style: { padding: 12, borderRadius: 10, background: c + '15', borderLeft: '4px solid ' + c } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between' } },
                  nlH('strong', { style: { fontSize: 11, color: c } }, (k_opts.find(function(o) { return o.value === i.kind; }) || { label: '' }).label),
                  nlH('button', { onClick: function() { remove(i.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 13, color: '#0f172a', marginTop: 4, lineHeight: 1.5 } }, i.description)
              );
            })
          ),
      nlEvidenceFooter('Vision research (Lally + Gardner): visualizing identity-based outcomes shapes daily choices more reliably than rules. Update quarterly to keep alignment.')
    );
  }

  // 124) PersonalNutritionPledge — personal pledge
  function PersonalNutritionPledge(props) {
    if (!R_NL) return null;
    var data = props.data || { pledges: [] };
    var setData = props.setData;
    var pledges = data.pledges || [];
    var fs = R_NL.useState({ pledge: '', why: '', startDate: nl_today(), through: '' });
    var form = fs[0]; var setForm = fs[1];
    function add() {
      if (!form.pledge.trim()) return;
      var n = { id: nl_id() };
      Object.keys(form).forEach(function(k) { n[k] = form[k]; });
      setData({ pledges: [n].concat(pledges) });
      setForm({ pledge: '', why: '', startDate: nl_today(), through: '' });
    }
    function remove(id) { setData({ pledges: pledges.filter(function(p) { return p.id !== id; }) }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Nutrition Pledge', 'Commitments to yourself, signed', '#84cc16'),
      nlCard(null,
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlTextarea({ value: form.pledge, onChange: function(e) { setForm(Object.assign({}, form, { pledge: e.target.value })); }, placeholder: 'I pledge to...', rows: 3 }),
          nlInput({ value: form.why, onChange: function(e) { setForm(Object.assign({}, form, { why: e.target.value })); }, placeholder: 'Because' }),
          nlH('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            nlH('input', { type: 'date', value: form.startDate, onChange: function(e) { setForm(Object.assign({}, form, { startDate: e.target.value })); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 } }),
            nlInput({ value: form.through, onChange: function(e) { setForm(Object.assign({}, form, { through: e.target.value })); }, placeholder: 'Through (date or "ongoing")' })
          ),
          nlBtn({ onClick: add, variant: 'success' }, '✍ Make pledge')
        )
      ),
      pledges.length === 0
        ? nlEmpty('No pledges yet. A pledge is a contract with yourself — make one only when you mean it.')
        : nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            pledges.map(function(p) {
              return nlH('div', { key: p.id, style: { padding: 14, borderRadius: 10, background: 'linear-gradient(135deg, #f7fee7, #ecfdf5)', borderLeft: '5px solid #84cc16', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } },
                nlH('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                  nlH('strong', { style: { fontSize: 13, color: '#3f6212' } }, '✍ My Pledge'),
                  nlH('button', { onClick: function() { remove(p.id); }, style: { background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '✕')
                ),
                nlH('div', { style: { fontSize: 13, color: '#0f172a', lineHeight: 1.6, fontStyle: 'italic', whiteSpace: 'pre-wrap' } }, '"' + p.pledge + '"'),
                p.why ? nlH('div', { style: { fontSize: 11, color: '#3f6212', marginTop: 6 } }, '💚 Because: ' + p.why) : null,
                nlH('div', { style: { fontSize: 10, color: '#3f6212', marginTop: 6 } }, '📅 ' + p.startDate + (p.through ? ' through ' + p.through : ''))
              );
            })
          ),
      nlEvidenceFooter('Commitment device research (Ariely, Soman): public or written commitments increase follow-through. Pledges work because they make breaking the commitment feel like breaking your word to yourself.')
    );
  }

  // 125) PersonalChefIdentity — playful chef identity
  function PersonalChefIdentity(props) {
    if (!R_NL) return null;
    var data = props.data || { profile: {} };
    var setData = props.setData;
    var profile = data.profile || {};
    var ps = R_NL.useState(profile);
    var form = ps[0]; var setForm = ps[1];
    function save() { setData({ profile: form }); }
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Chef Identity', 'Your cooking persona (just for fun)', '#f59e0b'),
      nlCard({ style: { background: 'linear-gradient(135deg, #fef3c7, #fffbeb)' } },
        nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          nlInput({ value: form.chefName || '', onChange: function(e) { setForm(Object.assign({}, form, { chefName: e.target.value })); }, placeholder: 'My chef name (real or invented)' }),
          nlInput({ value: form.signature || '', onChange: function(e) { setForm(Object.assign({}, form, { signature: e.target.value })); }, placeholder: 'My signature dish' }),
          nlInput({ value: form.style || '', onChange: function(e) { setForm(Object.assign({}, form, { style: e.target.value })); }, placeholder: 'My cooking style (3 adjectives)' }),
          nlInput({ value: form.inspiration || '', onChange: function(e) { setForm(Object.assign({}, form, { inspiration: e.target.value })); }, placeholder: 'Who inspires me' }),
          nlTextarea({ value: form.story || '', onChange: function(e) { setForm(Object.assign({}, form, { story: e.target.value })); }, placeholder: 'My cooking origin story', rows: 3 }),
          nlInput({ value: form.dreamMeal || '', onChange: function(e) { setForm(Object.assign({}, form, { dreamMeal: e.target.value })); }, placeholder: 'Dream meal to make someday' }),
          nlBtn({ onClick: save, variant: 'warning' }, '✓ Save chef profile')
        )
      ),
      profile.chefName ? nlCard({ style: { background: '#fffbeb', border: '2px solid #fcd34d' } },
        nlH('h2', { style: { fontSize: 18, fontWeight: 900, color: '#78350f', marginBottom: 8 } }, '👨‍🍳 ' + (profile.chefName || 'Chef')),
        profile.signature ? nlH('div', { style: { fontSize: 12, color: '#78350f', marginBottom: 4 } }, '⭐ Signature: ' + profile.signature) : null,
        profile.style ? nlH('div', { style: { fontSize: 12, color: '#78350f', marginBottom: 4 } }, '🎨 Style: ' + profile.style) : null,
        profile.inspiration ? nlH('div', { style: { fontSize: 12, color: '#78350f', marginBottom: 4 } }, '💡 Inspired by: ' + profile.inspiration) : null,
        profile.story ? nlH('div', { style: { fontSize: 12, color: '#78350f', marginBottom: 4, fontStyle: 'italic' } }, '📖 ' + profile.story) : null,
        profile.dreamMeal ? nlH('div', { style: { fontSize: 12, color: '#78350f' } }, '🌟 Dream meal: ' + profile.dreamMeal) : null
      ) : null,
      nlEvidenceFooter('Identity-based behavior change (Clear): the most lasting changes happen when you adopt the identity ("I am someone who cooks") rather than just the behavior. Even a playful chef identity strengthens cooking confidence.')
    );
  }

  // 126) PersonalKitOverview — overview dashboard
  function PersonalKitOverview(props) {
    if (!R_NL) return null;
    var data = props.data || {};
    var counts = {};
    Object.keys(data).forEach(function(k) {
      var d = data[k];
      if (d && typeof d === 'object') {
        if (Array.isArray(d.entries)) counts[k] = d.entries.length;
        else if (Array.isArray(d.logs)) counts[k] = d.logs.length;
        else if (Array.isArray(d.meals)) counts[k] = d.meals.length;
        else if (Array.isArray(d.goals)) counts[k] = d.goals.length;
        else if (Array.isArray(d.items)) counts[k] = d.items.length;
      }
    });
    var activeCount = Object.keys(counts).filter(function(k) { return counts[k] > 0; }).length;
    return nlH('div', { style: { padding: 14 } },
      nlSection('My Kit Overview', 'Stats across your nutrition tools', '#06b6d4'),
      nlCard({ style: { background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)' } },
        nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } },
          nlH('div', { style: { padding: 14, borderRadius: 10, background: '#fff', textAlign: 'center' } },
            nlH('div', { style: { fontSize: 36, fontWeight: 900, color: '#0e7490' } }, activeCount),
            nlH('div', { style: { fontSize: 12, color: '#0e7490', marginTop: 4 } }, 'active tools')
          ),
          nlH('div', { style: { padding: 14, borderRadius: 10, background: '#fff', textAlign: 'center' } },
            nlH('div', { style: { fontSize: 36, fontWeight: 900, color: '#0e7490' } }, Object.values(counts).reduce(function(a, b) { return a + b; }, 0)),
            nlH('div', { style: { fontSize: 12, color: '#0e7490', marginTop: 4 } }, 'total entries')
          )
        )
      ),
      activeCount > 0 ? nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 } },
        nlH('strong', { style: { fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Your active tools'),
        Object.keys(counts).filter(function(k) { return counts[k] > 0; }).sort(function(a, b) { return counts[b] - counts[a]; }).map(function(k) {
          return nlH('div', { key: k, style: { padding: 8, borderRadius: 6, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            nlH('span', { style: { color: '#0e7490' } }, k),
            nlH('strong', { style: { color: '#0e7490', fontFamily: 'ui-monospace, Menlo, monospace' } }, counts[k] + ' entries')
          );
        })
      ) : nlEmpty('Start with any tool — your overview will grow as you use them.'),
      nlEvidenceFooter('Self-monitoring research (Burke, Carels): visible progress increases sustained engagement. Your overview is your dashboard.')
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ═══ MY NUTRITION KIT HUB + MASTER ROUTER ═══
  // ══════════════════════════════════════════════════════════════════

  function MyNutritionKitHub(props) {
    if (!R_NL) return null;
    var d = props.d || {};
    var navigate = props.navigate;
    var ss = R_NL.useState(''); var search = ss[0]; var setSearch = ss[1];
    var cs = R_NL.useState('all'); var category = cs[0]; var setCategory = cs[1];
    var categories = [
      { id: 'all', label: 'All', color: '#0d9488' },
      { id: 'food-log', label: 'Food Log', color: '#059669' },
      { id: 'goals', label: 'Goals', color: '#0ea5e9' },
      { id: 'body', label: 'Body Listening', color: '#ec4899' },
      { id: 'cooking', label: 'Cooking', color: '#65a30d' },
      { id: 'culture', label: 'Culture', color: '#c026d3' },
      { id: 'school', label: 'School', color: '#0ea5e9' },
      { id: 'sport', label: 'Sport', color: '#dc2626' },
      { id: 'medical', label: 'Medical', color: '#7c3aed' },
      { id: 'mental', label: 'Mental Health', color: '#10b981' },
      { id: 'reflect', label: 'Reflection', color: '#84cc16' },
      { id: 'maine', label: 'Maine', color: '#16a34a' },
      { id: 'system', label: 'System', color: '#06b6d4' }
    ];
    var allTools = [
      { id: 'mealLog', icon: '🍽', label: 'Meal Log', desc: 'Physiology-first meal awareness', cat: 'food-log' },
      { id: 'hydration', icon: '💧', label: 'Hydration Tracker', desc: 'Daily fluid intake', cat: 'food-log' },
      { id: 'snackLog', icon: '🍎', label: 'Snack Log', desc: 'Snacks + why', cat: 'food-log' },
      { id: 'schoolLunch', icon: '🥪', label: 'School Lunch Log', desc: 'Pack vs buy patterns', cat: 'food-log' },
      { id: 'protein', icon: '💪', label: 'Protein Tracker', desc: 'For growth + activity', cat: 'food-log' },
      { id: 'fiber', icon: '🌾', label: 'Fiber Tracker', desc: 'Gut + satiety', cat: 'food-log' },
      { id: 'produce', icon: '🌈', label: 'Eat-the-Rainbow', desc: '7-day variety check', cat: 'food-log' },
      { id: 'calcium', icon: '🦴', label: 'Calcium Tracker', desc: 'Bone-building years', cat: 'food-log' },
      { id: 'iron', icon: '🩸', label: 'Iron Tracker', desc: 'For menstruating + athletes', cat: 'food-log' },
      { id: 'omega3', icon: '🐟', label: 'Omega-3 Tracker', desc: 'Maine fisheries angle', cat: 'food-log' },
      { id: 'goal', icon: '🎯', label: 'SMART Goals', desc: 'Locke + Latham', cat: 'goals' },
      { id: 'ifThen', icon: '🌀', label: 'If-Then Plans', desc: 'Gollwitzer intentions', cat: 'goals' },
      { id: 'habit', icon: '🔥', label: 'Habit Tracker', desc: 'Lally 66-day arc', cat: 'goals' },
      { id: 'micro', icon: '🌱', label: 'Tiny Habits', desc: 'Fogg model', cat: 'goals' },
      { id: 'ladder', icon: '🪜', label: 'Goal Ladders', desc: 'Step-by-step', cat: 'goals' },
      { id: 'weekly', icon: '✨', label: 'Weekly Intention', desc: 'ONE thing per week', cat: 'goals' },
      { id: 'fuelGoal', icon: '⚡', label: 'Fuel-for-Goals', desc: 'Map nutrition to goals', cat: 'goals' },
      { id: 'routine', icon: '📅', label: 'Meal Routine', desc: 'Weekday/weekend', cat: 'goals' },
      { id: 'challenge30', icon: '🏁', label: '30-Day Challenge', desc: 'Opt-in tests', cat: 'goals' },
      { id: 'consistency', icon: '📊', label: 'Consistency Tracker', desc: 'Not perfection', cat: 'goals' },
      { id: 'hunger', icon: '⚖', label: 'Hunger Log', desc: 'Interoception practice', cat: 'body' },
      { id: 'fullness', icon: '🍽', label: 'Fullness Log', desc: 'Stop point awareness', cat: 'body' },
      { id: 'craving', icon: '🌟', label: 'Cravings Journal', desc: 'No-judgment exploration', cat: 'body' },
      { id: 'emoEat', icon: '💭', label: 'Emotion + Eating Log', desc: 'Awareness, not elimination', cat: 'body' },
      { id: 'mindfulMeal', icon: '🌿', label: 'Mindful Eating Practice', desc: '6-step session', cat: 'body' },
      { id: 'satisfaction', icon: '⭐', label: 'Satisfaction Scale', desc: '6-dimension rating', cat: 'body' },
      { id: 'bodyCheckin', icon: '🫀', label: 'Body Check-In', desc: '30-sec multi-system check', cat: 'body' },
      { id: 'digestion', icon: '🦠', label: 'Digestion Log', desc: 'GI symptoms + triggers', cat: 'body' },
      { id: 'energyMeal', icon: '⚡', label: 'Energy-After-Meals', desc: 'Pre/post energy delta', cat: 'body' },
      { id: 'moodMeal', icon: '💜', label: 'Mood-After-Meal', desc: 'Food-mood link', cat: 'body' },
      { id: 'recipeBox', icon: '📔', label: 'Recipe Box', desc: 'Your go-to recipes', cat: 'cooking' },
      { id: 'cookSkills', icon: '🔪', label: 'Cooking Skills', desc: 'Skill progression', cat: 'cooking' },
      { id: 'shopping', icon: '🛒', label: 'Shopping Lists', desc: 'Organized + saves money', cat: 'cooking' },
      { id: 'mealPrep', icon: '📦', label: 'Meal-Prep Planner', desc: 'Sunday prep schedule', cat: 'cooking' },
      { id: 'subs', icon: '↔', label: 'Substitution List', desc: 'Allergies + pantry', cat: 'cooking' },
      { id: 'inventory', icon: '📦', label: 'Kitchen Inventory', desc: 'What you have', cat: 'cooking' },
      { id: 'budget', icon: '💰', label: 'Food Budget Tracker', desc: 'Spend awareness', cat: 'cooking' },
      { id: 'favorAfford', icon: '⭐', label: 'Favorite Affordable Foods', desc: 'Joy + budget', cat: 'cooking' },
      { id: 'cookTimer', icon: '⏱', label: 'Cook Timer', desc: 'Step-by-step timelines', cat: 'cooking' },
      { id: 'recipeMod', icon: '🔬', label: 'Recipe Modifications', desc: 'Make it yours', cat: 'cooking' },
      { id: 'culturalFood', icon: '🌍', label: 'Cultural Foods', desc: 'Identity + heritage', cat: 'culture' },
      { id: 'familyRecipe', icon: '📜', label: 'Family Recipes', desc: 'Preserve what risks loss', cat: 'culture' },
      { id: 'ndFood', icon: '🧠', label: 'ND Food Profile', desc: 'Sensory + ARFID-aware', cat: 'culture' },
      { id: 'eatingValues', icon: '🧭', label: 'Eating Values', desc: 'What matters to me', cat: 'culture' },
      { id: 'tradition', icon: '💖', label: 'Food Traditions', desc: 'Rituals + memory', cat: 'culture' },
      { id: 'safeFood', icon: '💚', label: 'Safe Foods', desc: 'No-apology repeat list', cat: 'culture' },
      { id: 'adventure', icon: '🌱', label: 'Food Adventures', desc: 'New foods at YOUR pace', cat: 'culture' },
      { id: 'cultureMap', icon: '🌎', label: 'Cultural Map', desc: 'Foods I\'ve explored', cat: 'culture' },
      { id: 'schoolMealPlan', icon: '📋', label: 'School Meal Plan', desc: 'Mon-Fri pack vs buy', cat: 'school' },
      { id: 'lunchSwap', icon: '🔄', label: 'Lunch Swaps', desc: 'Friend food exchanges', cat: 'school' },
      { id: 'cafeteriaScan', icon: '🔎', label: 'Cafeteria Scan', desc: 'Choice awareness', cat: 'school' },
      { id: 'breakfast', icon: '☀', label: 'Breakfast Tracker', desc: 'Morning brain fuel', cat: 'school' },
      { id: 'locker', icon: '🎒', label: 'Locker Snack Stash', desc: 'Emergency fuel', cat: 'school' },
      { id: 'afterSchool', icon: '🏃', label: 'After-School Fuel', desc: 'Pre/during/post', cat: 'school' },
      { id: 'testDay', icon: '📝', label: 'Test-Day Fuel', desc: 'Cognitive performance', cat: 'school' },
      { id: 'longDay', icon: '🎒', label: 'Long-Day Pack', desc: 'Field trips + performances', cat: 'school' },
      { id: 'sportFuel', icon: '🏋', label: 'Sport Fuel Log', desc: 'Track + tune', cat: 'sport' },
      { id: 'sweatRate', icon: '💧', label: 'Sweat Rate Tests', desc: 'Personal hydration', cat: 'sport' },
      { id: 'recoveryMeal', icon: '🔧', label: 'Recovery Meals', desc: '30-60 min post', cat: 'sport' },
      { id: 'gameDay', icon: '🏆', label: 'Game-Day Plan', desc: 'Race-day routine', cat: 'sport' },
      { id: 'longRun', icon: '🏃', label: 'Endurance Fuel', desc: 'Long sessions', cat: 'sport' },
      { id: 'electrolytes', icon: '🧂', label: 'Electrolyte Log', desc: 'Sodium + potassium', cat: 'sport' },
      { id: 'glycogen', icon: '⚡', label: 'Carb-Loading', desc: 'Pre-race prep', cat: 'sport' },
      { id: 'restDay', icon: '🛌', label: 'Rest-Day Nutrition', desc: 'Recovery fueling', cat: 'sport' },
      { id: 'season', icon: '📅', label: 'Seasonal Nutrition', desc: 'In-season vs off', cat: 'sport' },
      { id: 'coachQ', icon: '☎', label: 'Coach Q&A', desc: 'Questions to ask', cat: 'sport' },
      { id: 'allergen', icon: '⚠', label: 'Allergen Tracker', desc: 'Document allergies', cat: 'medical' },
      { id: 'reaction', icon: '🚨', label: 'Reaction Log', desc: 'For allergist visits', cat: 'medical' },
      { id: 'medFood', icon: '💊', label: 'Med-Food Interactions', desc: 'Document interactions', cat: 'medical' },
      { id: 'celiac', icon: '🌾', label: 'Celiac/Gluten Log', desc: 'Track exposures', cat: 'medical' },
      { id: 'lactose', icon: '🥛', label: 'Lactose Log', desc: 'Tolerance tracking', cat: 'medical' },
      { id: 'ibs', icon: '🦠', label: 'IBS Log', desc: 'FODMAP + stress + sleep', cat: 'medical' },
      { id: 'diabetes', icon: '🩸', label: 'T1D Meal Log', desc: 'Carbs + insulin + BG', cat: 'medical' },
      { id: 'migraine', icon: '🤕', label: 'Migraine Log', desc: 'Trigger pattern', cat: 'medical' },
      { id: 'pcos', icon: '🌸', label: 'PCOS Log', desc: 'Insulin + protein + movement', cat: 'medical' },
      { id: 'medNote', icon: '🩺', label: 'Medical Notes', desc: 'Save MD/RD instructions', cat: 'medical' },
      { id: 'nourishRestrict', icon: '⚖', label: 'Nourish vs Restrict', desc: 'Voice awareness', cat: 'mental' },
      { id: 'foodAnxiety', icon: '😰', label: 'Food Anxiety Log', desc: 'CBT-style tracking', cat: 'mental' },
      { id: 'edRecovery', icon: '🌱', label: 'Recovery Meal Log', desc: 'After hard moments', cat: 'mental' },
      { id: 'selfCompass', icon: '💖', label: 'Self-Compassion', desc: 'Neff practice', cat: 'mental' },
      { id: 'dietCulture', icon: '🚨', label: 'Diet Culture Log', desc: 'Notice + name', cat: 'mental' },
      { id: 'socialAudit', icon: '📱', label: 'Social Media Audit', desc: 'Algorithm check', cat: 'mental' },
      { id: 'nedaResource', icon: '💚', label: 'NEDA Resources', desc: 'Library of what helps', cat: 'mental' },
      { id: 'safetyContact', icon: '☎', label: 'Safety Contacts', desc: 'Who to call', cat: 'mental' },
      { id: 'bodyImage', icon: '🌷', label: 'Body Image Journal', desc: 'Reframing practice', cat: 'mental' },
      { id: 'refusal', icon: '🗣', label: 'Refusal Scripts', desc: 'Diet-talk responses', cat: 'mental' },
      { id: 'relationship', icon: '💚', label: 'Food Relationship', desc: 'Periodic reflection', cat: 'reflect' },
      { id: 'gratitude', icon: '🙏', label: 'Food Gratitude', desc: 'Who made it possible', cat: 'reflect' },
      { id: 'storyline', icon: '📖', label: 'Eating Storyline', desc: 'Your food story arc', cat: 'reflect' },
      { id: 'futureSelf', icon: '🔮', label: 'Future Food Self', desc: 'Hershfield visioning', cat: 'reflect' },
      { id: 'roleModel', icon: '⭐', label: 'Food Role Models', desc: 'People you admire', cat: 'reflect' },
      { id: 'quotes', icon: '📜', label: 'Food Quote Collection', desc: 'Words that ground you', cat: 'reflect' },
      { id: 'decisionLog', icon: '🧭', label: 'Decision Log', desc: 'Track reasoning', cat: 'reflect' },
      { id: 'celebrationFood', icon: '🎉', label: 'Celebration Foods', desc: 'Pure joy', cat: 'reflect' },
      { id: 'sundayPrep', icon: '☀', label: 'Sunday Prep Ritual', desc: 'Weekly self-care', cat: 'reflect' },
      { id: 'friendship', icon: '🤝', label: 'Friendship Foods', desc: 'Who you eat with', cat: 'reflect' },
      { id: 'localProduce', icon: '🌽', label: 'Local Produce Log', desc: 'Maine-grown', cat: 'maine' },
      { id: 'farmersMarket', icon: '🛍', label: 'Farmers Market', desc: 'Visit log', cat: 'maine' },
      { id: 'seafood', icon: '🐟', label: 'Seafood Log', desc: 'Maine fisheries', cat: 'maine' },
      { id: 'garden', icon: '🌱', label: 'Garden Log', desc: 'What you grow', cat: 'maine' },
      { id: 'foraging', icon: '🍄', label: 'Foraging Log', desc: 'Wild Maine foods', cat: 'maine' },
      { id: 'maineSeason', icon: '📅', label: 'Maine Seasons Plan', desc: 'Eat by season', cat: 'maine' },
      { id: 'cafeteriaFeedback', icon: '🏫', label: 'School Food Feedback', desc: 'Voice to admin', cat: 'maine' },
      { id: 'lobsterRoll', icon: '🦞', label: 'Lobster Roll Log', desc: 'Maine taxonomy', cat: 'maine' },
      { id: 'maple', icon: '🍁', label: 'Maple Season Log', desc: 'Tap to syrup', cat: 'maine' },
      { id: 'restaurant', icon: '🍴', label: 'Maine Restaurants', desc: 'Local spots', cat: 'maine' },
      { id: 'supplement', icon: '💊', label: 'Supplement Log', desc: 'Document what + why', cat: 'medical' },
      { id: 'caffeine', icon: '☕', label: 'Caffeine Tracker', desc: 'AAP teen limit', cat: 'medical' },
      { id: 'nightSnack', icon: '🌙', label: 'Late-Night Snack Awareness', desc: 'Pattern recognition', cat: 'body' },
      { id: 'cookClass', icon: '👨‍🍳', label: 'Cooking Class Notes', desc: 'What you learned', cat: 'cooking' },
      { id: 'research', icon: '🔬', label: 'Nutrition Research Log', desc: 'School projects', cat: 'reflect' },
      { id: 'recipeMacros', icon: '🧮', label: 'Recipe Macro Calculator', desc: 'For curiosity', cat: 'cooking' },
      { id: 'rdLog', icon: '🥗', label: 'RD Session Log', desc: 'Dietitian visits', cat: 'medical' },
      { id: 'readiness', icon: '⚖', label: 'Readiness Check', desc: 'MI rulers', cat: 'reflect' },
      { id: 'wins', icon: '🏆', label: 'Wins Log', desc: 'Celebrate small + big', cat: 'mental' },
      { id: 'export', icon: '📤', label: 'Export My Kit', desc: 'Download or share', cat: 'system' },
      { id: 'sleepNutrition', icon: '🛌', label: 'Sleep + Nutrition Link', desc: 'They affect each other', cat: 'body' },
      { id: 'movementNutrition', icon: '🏃', label: 'Movement + Nutrition Link', desc: 'Joyful integration', cat: 'sport' },
      { id: 'parentMsg', icon: '💬', label: 'Parent Conversation Drafts', desc: 'Pre-write your part', cat: 'mental' },
      { id: 'teacherEmail', icon: '✉', label: 'Teacher Email Drafts', desc: 'For accommodations', cat: 'school' },
      { id: 'plan504', icon: '⚖', label: '504/IEP Accommodations', desc: 'Track + advocate', cat: 'medical' },
      { id: 'emergencyCard', icon: '🚨', label: 'Medical Emergency Card', desc: 'Print + carry', cat: 'medical' },
      { id: 'vision', icon: '🎨', label: 'Nutrition Vision Board', desc: 'What you want', cat: 'reflect' },
      { id: 'pledge', icon: '✍', label: 'Nutrition Pledge', desc: 'Commit + sign', cat: 'reflect' },
      { id: 'chefId', icon: '👨‍🍳', label: 'Chef Identity', desc: 'Your cooking persona', cat: 'culture' },
      { id: 'overview', icon: '📊', label: 'Kit Overview', desc: 'Stats dashboard', cat: 'system' }
    ];
    var visible = allTools.filter(function(t) {
      var matchSearch = !search || (t.label + ' ' + t.desc).toLowerCase().indexOf(search.toLowerCase()) >= 0;
      var matchCat = category === 'all' || t.cat === category;
      return matchSearch && matchCat;
    });
    return nlH('div', { style: { padding: 14 } },
      nlH('div', { style: { padding: '20px', borderRadius: 14, marginBottom: 16, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', boxShadow: '0 4px 14px rgba(13,148,136,0.25)' } },
        nlH('div', { style: { fontSize: 11, color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4 } }, '🥗 My Nutrition Kit'),
        nlH('div', { style: { fontSize: 22, fontWeight: 900, marginBottom: 6 } }, 'Personal evidence-based nutrition tools'),
        nlH('div', { style: { fontSize: 13, lineHeight: 1.55, opacity: 0.95 } },
          allTools.length + ' tools to build YOUR personal nutrition practice. Physiology-first, NEDA-aligned, Maine-relevant. All data stays in your browser.'
        )
      ),
      nlH('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
        nlInput({ value: search, onChange: function(e) { setSearch(e.target.value); }, placeholder: '🔍 Search tools...' }),
        nlH('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
          categories.map(function(c) {
            return nlH('button', { key: c.id, onClick: function() { setCategory(c.id); }, style: { padding: '5px 10px', borderRadius: 6, border: '1px solid ' + c.color, background: category === c.id ? c.color : '#fff', color: category === c.id ? '#fff' : c.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, c.label);
          })
        )
      ),
      nlH('div', { style: { fontSize: 11, color: '#64748b', marginBottom: 8 } }, visible.length + ' tool' + (visible.length === 1 ? '' : 's') + ' shown'),
      nlH('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
        visible.map(function(t) {
          var cobj = categories.find(function(c) { return c.id === t.cat; }) || categories[0];
          return nlH('button', { key: t.id,
            onClick: function() { navigate(t.id); },
            'aria-label': t.label + ': ' + t.desc,
            style: { display: 'block', textAlign: 'left', padding: 12, borderRadius: 10, background: cobj.color + '12', border: '1px solid ' + cobj.color + '40', borderLeft: '4px solid ' + cobj.color, cursor: 'pointer' }
          },
            nlH('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
              nlH('div', { style: { fontSize: 22 } }, t.icon),
              nlH('div', { style: { flex: 1 } },
                nlH('div', { style: { fontSize: 12, fontWeight: 800, color: cobj.color, marginBottom: 2 } }, t.label),
                nlH('div', { style: { fontSize: 10, color: '#475569', lineHeight: 1.4 } }, t.desc)
              )
            )
          );
        })
      )
    );
  }

  // Master router that switches between the hub and individual tools
  function MyNutritionKit(props) {
    if (!R_NL) return null;
    var d = props.d || {}; var upd = props.upd;
    var vs = R_NL.useState('hub'); var view = vs[0]; var setView = vs[1];
    function bind(key, defaultVal) {
      return { data: d[key] || defaultVal, setData: function(nd) { upd(key, nd); } };
    }
    if (view === 'hub') return nlH(MyNutritionKitHub, { d: d, navigate: function(v) { setView(v); } });
    var backBar = nlH('button', { onClick: function() { setView('hub'); },
      style: { padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 8, marginLeft: 14 }
    }, '← My Nutrition Kit');
    var Comp, p;
    // Mapping each view id to its component
    var map = {
      mealLog: [PersonalMealLog, 'kit_meal', { meals: [] }],
      hydration: [PersonalHydrationTracker, 'kit_hydration', { entries: [], targetMl: 2500 }],
      snackLog: [PersonalSnackLog, 'kit_snack', { snacks: [] }],
      schoolLunch: [PersonalSchoolLunchLog, 'kit_lunch', { lunches: [] }],
      protein: [PersonalProteinIntake, 'kit_protein', { entries: [], dailyTarget: 56 }],
      fiber: [PersonalFiberLog, 'kit_fiber', { entries: [], dailyTarget: 28 }],
      produce: [PersonalFruitVeggieDay, 'kit_produce', { logs: [] }],
      calcium: [PersonalCalciumLog, 'kit_calcium', { entries: [], dailyTarget: 1300 }],
      iron: [PersonalIronLog, 'kit_iron', { entries: [], dailyTarget: 15 }],
      omega3: [PersonalOmega3Log, 'kit_omega3', { entries: [], weeklyTarget: 2 }],
      goal: [PersonalNutritionGoal, 'kit_goal', { goals: [] }],
      ifThen: [PersonalIfThenPlan, 'kit_ifThen', { plans: [] }],
      habit: [PersonalHabitTracker, 'kit_habit', { habits: [] }],
      micro: [PersonalMicroHabit, 'kit_micro', { micros: [] }],
      ladder: [PersonalGoalLadder, 'kit_ladder', { ladders: [] }],
      weekly: [PersonalWeeklyIntention, 'kit_weekly', { weeks: [] }],
      fuelGoal: [PersonalEnergyForGoal, 'kit_fuelGoal', { connections: [] }],
      routine: [PersonalRoutineBuilder, 'kit_routine', { routines: { weekday: [], weekend: [] } }],
      challenge30: [PersonalChallenge30Day, 'kit_challenge', { challenges: [] }],
      consistency: [PersonalConsistencyTracker, 'kit_consistency', { entries: [] }],
      hunger: [PersonalHungerLog, 'kit_hunger', { logs: [] }],
      fullness: [PersonalFullnessLog, 'kit_fullness', { logs: [] }],
      craving: [PersonalCravingsJournal, 'kit_craving', { entries: [] }],
      emoEat: [PersonalEmotionEatingLog, 'kit_emoEat', { entries: [] }],
      mindfulMeal: [PersonalMindfulEatingPractice, 'kit_mindful', { sessions: [] }],
      satisfaction: [PersonalSatisfactionScale, 'kit_satisfaction', { ratings: [] }],
      bodyCheckin: [PersonalBodyCheckIn, 'kit_bodyCheck', { checkins: [] }],
      digestion: [PersonalDigestionLog, 'kit_digestion', { entries: [] }],
      energyMeal: [PersonalEnergyLevelLog, 'kit_energyMeal', { logs: [] }],
      moodMeal: [PersonalMoodAfterMeal, 'kit_moodMeal', { logs: [] }],
      recipeBox: [PersonalRecipeBox, 'kit_recipeBox', { recipes: [] }],
      cookSkills: [PersonalCookingSkills, 'kit_cookSkills', { skills: [] }],
      shopping: [PersonalShoppingList, 'kit_shopping', { lists: [] }],
      mealPrep: [PersonalMealPrepPlanner, 'kit_mealPrep', { plans: [] }],
      subs: [PersonalSubstitutionList, 'kit_subs', { subs: [] }],
      inventory: [PersonalKitchenInventory, 'kit_inventory', { items: [] }],
      budget: [PersonalBudgetTracker, 'kit_budget', { entries: [], weeklyBudget: 50 }],
      favorAfford: [PersonalFavorFoodList, 'kit_favor', { foods: [] }],
      cookTimer: [PersonalCookTimer, 'kit_cookTimer', { sessions: [] }],
      recipeMod: [PersonalRecipeBuilder, 'kit_recipeMod', { mods: [] }],
      culturalFood: [PersonalCulturalFoods, 'kit_cultural', { foods: [] }],
      familyRecipe: [PersonalFamilyRecipes, 'kit_family', { recipes: [] }],
      ndFood: [PersonalNDFoodSafety, 'kit_nd', { profile: {}, entries: [] }],
      eatingValues: [PersonalEatingValues, 'kit_values', { values: [] }],
      tradition: [PersonalFoodTraditions, 'kit_tradition', { traditions: [] }],
      safeFood: [PersonalSafeFoods, 'kit_safe', { foods: [] }],
      adventure: [PersonalAdventureFoods, 'kit_adventure', { tries: [] }],
      cultureMap: [PersonalFoodCulturalMap, 'kit_cultureMap', { explored: [] }],
      schoolMealPlan: [PersonalSchoolMealPlan, 'kit_schoolMealPlan', { weeks: [] }],
      lunchSwap: [PersonalLunchSwap, 'kit_lunchSwap', { swaps: [] }],
      cafeteriaScan: [PersonalCafeteriaScan, 'kit_cafeteriaScan', { scans: [] }],
      breakfast: [PersonalSchoolBreakfast, 'kit_breakfast', { logs: [] }],
      locker: [PersonalLockerSnack, 'kit_locker', { snacks: [] }],
      afterSchool: [PersonalAfterSchoolFuel, 'kit_afterSchool', { plans: [] }],
      testDay: [PersonalTestDayFuel, 'kit_testDay', { plans: [] }],
      longDay: [PersonalLongDayPack, 'kit_longDay', { packs: [] }],
      sportFuel: [PersonalSportFuelLog, 'kit_sportFuel', { sessions: [] }],
      sweatRate: [PersonalSweatRateLog, 'kit_sweatRate', { tests: [] }],
      recoveryMeal: [PersonalRecoveryMeal, 'kit_recoveryMeal', { meals: [] }],
      gameDay: [PersonalGameDayPlan, 'kit_gameDay', { plans: [] }],
      longRun: [PersonalLongRunFuel, 'kit_longRun', { runs: [] }],
      electrolytes: [PersonalElectrolyteTracker, 'kit_electrolyte', { logs: [] }],
      glycogen: [PersonalGlycogen, 'kit_glycogen', { events: [] }],
      restDay: [PersonalRestDayNutrition, 'kit_restDay', { logs: [] }],
      season: [PersonalSeasonNutrition, 'kit_season', { seasons: [] }],
      coachQ: [PersonalCoachConvo, 'kit_coachQ', { questions: [] }],
      allergen: [PersonalAllergenTracker, 'kit_allergen', { allergens: [] }],
      reaction: [PersonalReactionLog, 'kit_reaction', { reactions: [] }],
      medFood: [PersonalMedFoodInteractions, 'kit_medFood', { meds: [] }],
      celiac: [PersonalCeliacTracker, 'kit_celiac', { logs: [] }],
      lactose: [PersonalLactoseTracker, 'kit_lactose', { logs: [] }],
      ibs: [PersonalIBSFoodLog, 'kit_ibs', { logs: [] }],
      diabetes: [PersonalDiabetesLog, 'kit_diabetes', { logs: [] }],
      migraine: [PersonalMigraineFoodLog, 'kit_migraine', { logs: [] }],
      pcos: [PersonalPCOSLog, 'kit_pcos', { logs: [] }],
      medNote: [PersonalMedicalNotes, 'kit_medNote', { notes: [] }],
      nourishRestrict: [PersonalNourishVsRestrict, 'kit_nourishRestrict', { entries: [] }],
      foodAnxiety: [PersonalFoodAnxietyLog, 'kit_foodAnxiety', { logs: [] }],
      edRecovery: [PersonalEDRecoveryMeal, 'kit_edRecovery', { logs: [] }],
      selfCompass: [PersonalSelfCompassionFood, 'kit_selfCompass', { practices: [] }],
      dietCulture: [PersonalDietCultureLog, 'kit_dietCulture', { exposures: [] }],
      socialAudit: [PersonalSocialMediaFoodCheck, 'kit_socialAudit', { audits: [] }],
      nedaResource: [PersonalNEDAResources, 'kit_nedaResource', { saved: [] }],
      safetyContact: [PersonalSafetyContact, 'kit_safetyContact', { contacts: [] }],
      bodyImage: [PersonalBodyImageJournal, 'kit_bodyImage', { entries: [] }],
      refusal: [PersonalRefusalScripts, 'kit_refusal', { scripts: [] }],
      relationship: [PersonalFoodRelationship, 'kit_relationship', { reflections: [] }],
      gratitude: [PersonalFoodGratitude, 'kit_gratitude', { entries: [] }],
      storyline: [PersonalEatingStoryline, 'kit_storyline', { chapters: [] }],
      futureSelf: [PersonalFutureFoodSelf, 'kit_futureSelf', { visions: [] }],
      roleModel: [PersonalRoleModelEater, 'kit_roleModel', { models: [] }],
      quotes: [PersonalFoodQuotes, 'kit_quotes', { quotes: [] }],
      decisionLog: [PersonalNutritionDecisionLog, 'kit_decision', { decisions: [] }],
      celebrationFood: [PersonalCelebrationFoods, 'kit_celebrationFood', { foods: [] }],
      sundayPrep: [PersonalSundayPrep, 'kit_sundayPrep', { rituals: [] }],
      friendship: [PersonalFriendshipFood, 'kit_friendship', { friendships: [] }],
      localProduce: [PersonalLocalProduceLog, 'kit_localProduce', { entries: [] }],
      farmersMarket: [PersonalFarmersMarketLog, 'kit_farmersMarket', { visits: [] }],
      seafood: [PersonalSeafoodTracker, 'kit_seafood', { logs: [] }],
      garden: [PersonalGardenLog, 'kit_garden', { harvests: [] }],
      foraging: [PersonalForagingLog, 'kit_foraging', { entries: [] }],
      maineSeason: [PersonalMaineSeasonFood, 'kit_maineSeason', { plans: [] }],
      cafeteriaFeedback: [PersonalSchoolFoodFeedback, 'kit_cafeteriaFeedback', { feedback: [] }],
      lobsterRoll: [PersonalLobsterRoll, 'kit_lobsterRoll', { rolls: [] }],
      maple: [PersonalMapleSyrupSeason, 'kit_maple', { logs: [] }],
      restaurant: [PersonalMaineRestaurantLog, 'kit_restaurant', { visits: [] }],
      supplement: [PersonalSupplementLog, 'kit_supplement', { supplements: [] }],
      caffeine: [PersonalCaffeineLog, 'kit_caffeine', { logs: [], dailyLimit: 100 }],
      nightSnack: [PersonalNightSnackLog, 'kit_nightSnack', { logs: [] }],
      cookClass: [PersonalCookingClass, 'kit_cookClass', { sessions: [] }],
      research: [PersonalNutritionResearchLog, 'kit_research', { projects: [] }],
      recipeMacros: [PersonalRecipeMacros, 'kit_recipeMacros', { recipes: [] }],
      rdLog: [PersonalRDLog, 'kit_rdLog', { sessions: [] }],
      readiness: [PersonalReadinessCheck, 'kit_readiness', { checks: [] }],
      wins: [PersonalRecoveryWin, 'kit_wins', { wins: [] }],
      sleepNutrition: [PersonalSleepNutritionLink, 'kit_sleepNutrition', { logs: [] }],
      movementNutrition: [PersonalMovementNutritionLink, 'kit_movementNutrition', { logs: [] }],
      parentMsg: [PersonalParentMessage, 'kit_parentMsg', { messages: [] }],
      teacherEmail: [PersonalTeacherEmail, 'kit_teacherEmail', { emails: [] }],
      plan504: [Personal504Plan, 'kit_plan504', { items: [] }],
      emergencyCard: [PersonalMedicalEmergencyCard, 'kit_emergencyCard', { card: {} }],
      vision: [PersonalNutritionVision, 'kit_vision', { items: [] }],
      pledge: [PersonalNutritionPledge, 'kit_pledge', { pledges: [] }],
      chefId: [PersonalChefIdentity, 'kit_chefId', { profile: {} }],
      overview: [PersonalKitOverview, '__overview', d]
    };
    var entry = map[view];
    if (entry) {
      Comp = entry[0];
      if (view === 'export') p = { allData: d };
      else if (view === 'overview') p = { data: d };
      else p = bind(entry[1], entry[2]);
    } else if (view === 'export') {
      Comp = PersonalNutritionKitExport; p = { allData: d };
    } else {
      return nlH(MyNutritionKitHub, { d: d, navigate: function(v) { setView(v); } });
    }
    return nlH('div', null, backBar, nlH(Comp, p));
  }

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

      // ── Persisted-state helper ──
      // Sub-components defined inside this render function get a fresh
      // function reference on every parent re-render → React unmounts and
      // remounts them. Their useState + useEffect→upd persistence pattern
      // would fire upd on every mount, triggering ctx.update → parent
      // re-render → remount → mount-fire → infinite loop. This helper
      // folds the pair into one call and skips the mount-fire via a
      // first-render ref guard. Same fix used in WeldLab.
      function usePersistedState(key, defaultValue) {
        var s = useState(d[key] != null ? d[key] : defaultValue);
        var firstRef = useRef(true);
        useEffect(function () {
          if (firstRef.current) { firstRef.current = false; return; }
          upd(key, s[0]);
        }, [s[0]]);
        return s;
      }

      var _hydratedRef = useRef(false);
      if (!_hydratedRef.current) {
        _hydratedRef.current = true;
        var savedBadges = lsGet('nutritionLab.badges.v1', null);
        if (savedBadges && d.nlBadges === undefined) upd('nlBadges', savedBadges);
      }

      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];

      var BADGE_IDS = ['myNutritionKit','macroLab','microAtlas','labelReader','energyBalance','digestion','myths','foodMood','edAwareness','maineReality','careerPaths','maineDay','deficiencyDetective','hydrationLab'];
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
            id: 'myNutritionKit', title: 'My Nutrition Kit', icon: '🥗',
            subtitle: '127 personal, evidence-based tools',
            desc: 'Build your own nutrition practice: meal logs, hydration, goals, body-listening, cooking, cultural foods, sports fuel, mental-health x food, NEDA-aligned recovery support, Maine seasonal eating, and more. Physiology-first, never restriction. All data stays in your browser.',
            bullets: ['127 personal tools across 13 categories', 'NEDA-aligned content + safety contacts', 'Maine-specific (fisheries, farmers markets, seasons)', 'Privacy-first — no server sync'],
            color: 'from-emerald-600 to-teal-700',
            ring: 'ring-emerald-500/40',
            ready: true
          },
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
          },
          {
            id: 'maineDay', title: 'Build a Maine Day', icon: '🌲',
            subtitle: 'Pick 4 meals → see what your day adds up to',
            desc: 'Pick one food for breakfast, lunch, dinner, and snack from a Maine-realistic short list (Maine wild blueberries, Atlantic salmon, lobster roll, fortified cereal, etc.). Watch six nutrient bars (protein, fiber, vitamin D, omega-3, iron, calcium) update against approximate adolescent DRIs. Final summary names deficits + strengths and ties them to Maine context (winter vit D, fisheries omega-3, adolescent iron).',
            color: 'from-stone-500 to-emerald-700',
            ring: 'ring-stone-500/40',
            ready: true
          },
          {
            id: 'deficiencyDetective', title: 'Deficiency Detective', icon: '🕵️',
            subtitle: '10 vignettes — name the missing nutrient',
            desc: '10 clinical vignettes; identify which of 6 nutrients (vitamin D, iron, B12, folate, calcium, iodine) is most likely missing. Vignettes target the canonical real-world deficiency cases: Maine winter runner with stress fractures, menstruating teen with ADHD-like inattention, strict vegan with neuropathy, preconception folate, lactose-intolerant teen with low bone density, PPI-induced B12 deficiency.',
            color: 'from-rose-500 to-pink-700',
            ring: 'ring-rose-500/40',
            ready: true
          },
          {
            id: 'hydrationLab', title: 'Hydration Lab', icon: '💧',
            subtitle: 'Water, your body, and the science of staying hydrated',
            desc: 'Daily-needs calculator (NAM Adequate Intake by age/sex), self-check quiz with the 8-point urine-color scale (ACSM/Armstrong), beverage comparison (water vs sports drink vs soda — sodium, sugar, hydration efficacy), and a sweat-rate calculator for student athletes (NATA standard). Physiology-first framing: hydration as body function, never appetite suppression.',
            color: 'from-sky-500 to-cyan-700',
            ring: 'ring-sky-500/40',
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
        var pickA = usePersistedState('fc_a', 'salmon');
        var pickB = usePersistedState('fc_b', 'chicken');
        var fA_id = pickA[0], setA = pickA[1];
        var fB_id = pickB[0], setB = pickB[1];
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
        var plate_state = usePersistedState('ml_plate', []);
        var plate = plate_state[0], setPlate = plate_state[1];
        var category_state = usePersistedState('ml_category', 'all');
        var category = category_state[0], setCategory = category_state[1];

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
        var tab_state = usePersistedState('ma_tab', 'vitamins');
        var tab = tab_state[0], setTab = tab_state[1];
        var picked_state = usePersistedState('ma_picked', null);
        var picked = picked_state[0], setPicked = picked_state[1];

        // Clear picked card when user actively switches tabs, but NOT on every (re)mount.
        // MicronutrientAtlas is defined inside the parent so every parent re-render
        // remounts this subtree; without this guard, picking a card flashes its detail
        // and immediately wipes it because the mount-time effect fires.
        var firstTabRunRef = useRef(true);
        useEffect(function() {
          if (firstTabRunRef.current) { firstTabRunRef.current = false; return; }
          setPicked(null);
        }, [tab]);

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
            // High-priority deficiency callout — surfaces the 5 nutrients adolescents
            // in the US (and Maine specifically) most commonly under-consume. Each card
            // shows a 3-stage cascade: Nutrient → Body function → What it looks like.
            // Lifts the BirdLab Climate Pressure 4-card grid pattern.
            (function() {
              var PRIORITIES = [
                { id: 'vitD',     emoji: '☀️', name: 'Vitamin D',  why: 'WIDESPREAD in Maine winters', function_: 'Calcium absorption + immunity + mood', symptom: 'Bone weakness, low mood, frequent illness', stripe: '#f59e0b' },
                { id: 'iron',     emoji: '🩸', name: 'Iron',       why: 'Menstruating teens at high risk',     function_: 'Hemoglobin carries oxygen + brain fuel', symptom: 'Fatigue, brain fog, ADHD-like attention drop', stripe: '#dc2626' },
                { id: 'mag',      emoji: '🌿', name: 'Magnesium',  why: 'Most US adults under-consume',      function_: 'Muscle + nerve + sleep + blood sugar', symptom: 'Cramps, fatigue, anxiety-like symptoms', stripe: '#16a34a' },
                { id: 'b12',      emoji: '🥛', name: 'Vitamin B12', why: 'Vegans / vegetarians at risk',       function_: 'Nerves + red blood cells + DNA',          symptom: 'Anemia, nerve damage, dementia-like symptoms', stripe: '#7c3aed' },
                { id: 'calcium',  emoji: '🦴', name: 'Calcium',    why: 'Teens build PEAK bone density now', function_: 'Bones + teeth + nerve signaling',         symptom: 'Higher fracture risk, lifelong bone deficit', stripe: '#0ea5e9' }
              ];
              return h('div', { className: 'rounded-2xl overflow-hidden border-2 border-rose-300 shadow bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50' },
                h('div', { className: 'px-5 py-3 border-b-2 border-rose-200', style: { background: 'rgba(254, 226, 226, 0.5)' } },
                  h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    h('span', { 'aria-hidden': 'true', className: 'text-2xl' }, '🚨'),
                    h('h3', { className: 'text-base font-black text-rose-900' }, 'Watch these in Maine'),
                    h('span', { className: 'text-xs italic text-slate-700' }, '— nutrients adolescents most often under-consume')
                  )
                ),
                h('div', { className: 'p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' },
                  PRIORITIES.map(function(n) {
                    return h('button', {
                      key: n.id,
                      onClick: function() {
                        var match = (VITAMINS.concat(MINERALS)).filter(function(x) { return x.id === n.id; })[0];
                        if (match) {
                          var t = MINERALS.indexOf(match) >= 0 ? 'minerals' : 'vitamins';
                          setTab(t);
                          setTimeout(function() { setPicked(match); }, 60);
                          announce('Opening ' + match.name);
                        }
                      },
                      'aria-label': n.name + ' — ' + n.why + '. Click to see full nutrient card.',
                      className: 'text-left p-3 rounded-xl border-2 bg-white hover:shadow-lg transition focus:outline-none focus:ring-2 ring-rose-500/40 relative overflow-hidden',
                      style: { borderColor: n.stripe + '88', paddingLeft: 18 }
                    },
                      h('span', { 'aria-hidden': 'true',
                        style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: n.stripe, borderRadius: '11px 0 0 11px' }
                      }),
                      h('div', { className: 'flex items-baseline gap-2 mb-2 flex-wrap' },
                        h('span', { 'aria-hidden': 'true', className: 'text-2xl' }, n.emoji),
                        h('div', { className: 'flex-1 min-w-0' },
                          h('div', { className: 'text-[10px] font-bold uppercase tracking-wider', style: { color: n.stripe } }, n.why),
                          h('div', { className: 'text-base font-black text-slate-800', style: { lineHeight: 1.15 } }, n.name)
                        )
                      ),
                      // Cascade: Function → Symptom
                      h('div', { className: 'flex items-stretch gap-1.5' },
                        h('div', { className: 'flex-1 p-1.5 rounded text-[10px] leading-snug', style: { background: '#ecfdf5', color: '#064e3b', border: '1px solid #a7f3d0' } },
                          h('div', { className: 'text-[8px] font-bold uppercase tracking-wider opacity-70 mb-0.5' }, 'Function'),
                          n.function_
                        ),
                        h('span', { 'aria-hidden': 'true', className: 'self-center text-slate-400 font-bold' }, '→'),
                        h('div', { className: 'flex-1 p-1.5 rounded text-[10px] leading-snug', style: { background: '#fef2f2', color: '#7f1d1d', border: '1px solid #fecaca' } },
                          h('div', { className: 'text-[8px] font-bold uppercase tracking-wider opacity-70 mb-0.5' }, 'Without it'),
                          n.symptom
                        )
                      )
                    );
                  })
                )
              );
            })(),
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
        var labelIdx_state = usePersistedState('lr_idx', 0);
        var labelIdx = labelIdx_state[0], setLabelIdx = labelIdx_state[1];
        // ⚠ Was useState({}) — picks vanished on parent re-render → "buttons
        // not working" report. Swapped to usePersistedState so the answers
        // map survives any ctx.update() that reaches the parent.
        var answers_state = usePersistedState('lr_answers', {});
        var answers = answers_state[0], setAnswers = answers_state[1];

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
            // Per-challenge completion + accuracy across all challenges (lifts the BirdLab pattern).
            // A challenge is 'complete' when every question is answered AND every answer is correct.
            // Accuracy = total correct picks / total picks across the whole flow.
            (function() { /* hoisted compute below */ })(),
            // Challenge selector
            h('div', { className: 'flex flex-wrap gap-2' },
              LABELS.map(function(L, i) {
                var sel = (labelIdx === i);
                var done = L.questions.every(function(q, qi) {
                  var key = i + '_' + qi;
                  return answers[key] != null && answers[key] === q.answer;
                });
                return h('button', {
                  key: L.id,
                  onClick: function() { setLabelIdx(i); announce('Loaded ' + L.name); },
                  'aria-pressed': sel ? 'true' : 'false',
                  'aria-label': 'Challenge ' + (i + 1) + ' (' + L.difficulty + ')' + (done ? ' — completed' : ''),
                  className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 relative ' +
                    (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : (done ? 'bg-emerald-50 text-emerald-900 border-emerald-400' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500'))
                },
                  done && !sel && h('span', { 'aria-hidden': 'true', style: { position: 'absolute', top: -6, right: -6, background: '#16a34a', color: '#ffffff', fontSize: 10, fontWeight: 900, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' } }, '✓'),
                  'Challenge ' + (i + 1) + ' · ' + L.difficulty
                );
              })
            ),
            // Progress strip — visible "X of 5 complete" plus 5 dots
            (function() {
              var doneCount = LABELS.reduce(function(acc, L, i) {
                var done = L.questions.every(function(q, qi) {
                  var key = i + '_' + qi;
                  return answers[key] != null && answers[key] === q.answer;
                });
                return acc + (done ? 1 : 0);
              }, 0);
              return h('div', { className: 'flex items-center gap-3 text-xs text-slate-700 flex-wrap', 'aria-live': 'polite' },
                h('div', { className: 'flex items-center gap-1' },
                  LABELS.map(function(L, i) {
                    var done = L.questions.every(function(q, qi) {
                      var key = i + '_' + qi;
                      return answers[key] != null && answers[key] === q.answer;
                    });
                    return h('span', { key: L.id, 'aria-hidden': 'true',
                      style: {
                        display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                        background: done ? '#16a34a' : '#e2e8f0',
                        border: '1.5px solid ' + (done ? '#15803d' : '#94a3b8')
                      }
                    });
                  })
                ),
                h('span', { className: 'font-bold' }, doneCount + ' of ' + LABELS.length + ' challenges complete')
              );
            })(),
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
            // ── End-of-flow completion hero ──
            // Only renders after all 5 challenges are complete. Aggregates accuracy
            // across the entire flow (correct picks / picks made), tier-coaches the
            // student, and awards a 'Nutrition Facts Decoder' visual badge.
            (function() {
              var allDone = LABELS.every(function(L, i) {
                return L.questions.every(function(q, qi) {
                  var key = i + '_' + qi;
                  return answers[key] != null && answers[key] === q.answer;
                });
              });
              if (!allDone) return null;
              // Compute total picks vs total correct across all challenges
              var totalQs = LABELS.reduce(function(a, L) { return a + L.questions.length; }, 0);
              var totalCorrect = 0, totalPicks = 0;
              LABELS.forEach(function(L, i) {
                L.questions.forEach(function(q, qi) {
                  var key = i + '_' + qi;
                  if (answers[key] != null) {
                    totalPicks += 1;
                    if (answers[key] === q.answer) totalCorrect += 1;
                  }
                });
              });
              var pct = totalPicks > 0 ? Math.round((totalCorrect / totalPicks) * 100) : 0;
              // Tier — based on first-attempt-needed estimate (totalPicks vs totalQs)
              var efficiency = totalPicks > 0 ? totalQs / totalPicks : 1;
              var tier = (totalPicks === totalQs) ? 'mastery'
                         : efficiency >= 0.7 ? 'strong'
                         : 'learning';
              var tierColor = tier === 'mastery' ? '#fbbf24' : tier === 'strong' ? '#16a34a' : '#0ea5e9';
              var tierIcon = tier === 'mastery' ? '🏆' : tier === 'strong' ? '🎯' : '📚';
              var tierTitle = tier === 'mastery' ? 'Nutrition Facts Decoder — first try!'
                              : tier === 'strong' ? 'Solid label literacy'
                              : 'You decoded all 5 — keep going';
              var tierMsg = tier === 'mastery'
                            ? 'You answered every question correctly on the first attempt across all 5 challenges. You can now read a Nutrition Facts panel like a registered dietitian.'
                            : tier === 'strong'
                              ? 'You finished all 5 challenges with strong accuracy. The labels you saw cover every common deception (serving-size split, added vs total sugars, multi-serving frozen meals).'
                              : 'You finished all 5 challenges — some took multiple tries, which is exactly how learning works. Read the explanations again for the questions where you needed retries.';
              var rad = 36, circ = 2 * Math.PI * rad;
              var dashOff = circ - (pct / 100) * circ;
              return h('div', { className: 'rounded-2xl overflow-hidden shadow-lg border-2', style: { borderColor: tierColor }, 'aria-live': 'polite' },
                h('div', { className: 'p-5 flex items-center gap-5 flex-wrap', style: { background: 'linear-gradient(135deg, ' + tierColor + '22, #ffffff)' } },
                  // Score donut
                  h('div', { className: 'relative flex-shrink-0', style: { width: 96, height: 96 } },
                    h('svg', { viewBox: '0 0 100 100', width: 96, height: 96,
                      'aria-label': 'Accuracy: ' + totalCorrect + ' of ' + totalPicks + ' picks correct'
                    },
                      h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                      h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                        strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                    ),
                    h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                      h('div', { style: { fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                      h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-700' }, totalCorrect + ' / ' + totalPicks)
                    )
                  ),
                  // Tier headline
                  h('div', { className: 'flex-1 min-w-[220px]' },
                    h('div', { className: 'text-3xl mb-1', 'aria-hidden': 'true' }, tierIcon),
                    h('h3', { className: 'text-xl font-black', style: { color: tierColor, lineHeight: 1.15 } }, tierTitle),
                    h('p', { className: 'text-sm text-slate-800 leading-snug mt-1' }, tierMsg)
                  ),
                  // Badge medallion
                  h('div', { 'aria-hidden': 'true', className: 'flex-shrink-0 hidden md:flex',
                    style: { width: 84, height: 84, borderRadius: '50%', background: tierColor, color: '#ffffff', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: '0 4px 14px ' + tierColor + '44, inset 0 1px 0 rgba(255,255,255,0.25)', border: '4px solid #ffffff' }
                  },
                    h('div', { style: { fontSize: 26, lineHeight: 1 } }, '🏷'),
                    h('div', { style: { fontSize: 9, fontWeight: 900, letterSpacing: '0.04em', textAlign: 'center', textTransform: 'uppercase', marginTop: 4 } }, 'Decoder')
                  )
                ),
                // Per-challenge checklist
                h('div', { className: 'p-4 bg-white border-t border-emerald-200' },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2' }, '✓ All five challenges decoded'),
                  h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                    LABELS.map(function(L) {
                      return h('li', { key: L.id, className: 'flex items-center gap-2' },
                        h('span', { 'aria-hidden': 'true', className: 'text-emerald-700 font-black' }, '✓'),
                        h('span', { className: 'font-bold' }, L.name),
                        h('span', { className: 'text-xs text-slate-700 italic' }, '— ' + L.difficulty)
                      );
                    })
                  )
                )
              );
            })(),
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
        var tab_state = usePersistedState('em_tab', 'atp');
        var tab = tab_state[0], setTab = tab_state[1];

        var tabs = [
          { id: 'atp',          label: '1. ATP & Mitochondria' },
          { id: 'systems',      label: '2. Three Energy Systems' },
          { id: 'distribution', label: '3. Where Energy Goes' }
        ];
        // Topic-accent hero metadata — keys off tab id so each section feels distinct.
        var TAB_META = {
          atp:          { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)',  icon: '⚡', title: 'ATP — your cellular energy currency', hint: 'Every cell holds ~50g of ATP and recycles it ~1,000× per day.' },
          systems:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',   icon: '🔥', title: 'Three energy systems run side by side', hint: 'PCr · glycolysis · oxidative — each peaks at a different duration.' },
          distribution: { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)',  icon: '🧠', title: 'Where your energy actually goes at rest', hint: 'Brain ≈ 20% of resting energy at only ~2% of body weight.' }
        };

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
            // Topic-accent hero band (swaps with the active tab)
            (function() {
              var meta = TAB_META[tab] || TAB_META.atp;
              return h('div', {
                style: {
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
                }
              },
                h('div', { style: { fontSize: 32, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                h('div', { style: { flex: 1, minWidth: 220 } },
                  h('h3', { style: { color: meta.accent, fontSize: 17, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  h('p', { style: { margin: '4px 0 0', color: '#475569', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),
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
        var stageIdx_state = usePersistedState('dg_stage', 0);
        var stageIdx = stageIdx_state[0], setStageIdx = stageIdx_state[1];

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
        var idx_state = usePersistedState('my_idx', 0);
        var idx = idx_state[0], setIdx = idx_state[1];
        var picks_state = usePersistedState('my_picks', {});
        var picks = picks_state[0], setPicks = picks_state[1];

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
        var picked_state = usePersistedState('fm_picked', null);
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
        var consented_state = usePersistedState('ed_consented', false);
        var consented = consented_state[0], setConsented = consented_state[1];
        var section_state = usePersistedState('ed_section', 'overview');
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
        var tab_state = usePersistedState('mr_tab', 'seasons');
        var tab = tab_state[0], setTab = tab_state[1];

        var tabs = [
          { id: 'seasons',  label: 'Seasons + vitamin D' },
          { id: 'fisheries', label: 'Fisheries + omega-3' },
          { id: 'access',   label: 'Food access' },
          { id: 'school',   label: 'School meals + SNAP' },
          { id: 'local',    label: 'Local food + Wabanaki' }
        ];
        var TAB_META = {
          seasons:   { accent: '#0284c7', soft: 'rgba(2,132,199,0.10)',  icon: '☀️',  title: 'Maine winters are a vitamin D problem', hint: 'At 43–47°N, Oct–Mar sun is too low for skin to make D — no matter how long you’re outside.' },
          fisheries: { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '🐟',   title: 'Cold-water fisheries → omega-3 powerhouse', hint: 'Maine lobster, herring, and farm-raised salmon are world-class EPA/DHA sources.' },
          access:    { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '🚗',   title: 'Rural distance + seasonal employment = real food-access issues', hint: 'Aroostook and Washington counties have documented food deserts and long drive times.' },
          school:    { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '🍱',   title: 'Free school meals + SNAP basics', hint: 'Maine is the second state to permanently fund free meals for all K-12 kids (2022).' },
          local:     { accent: '#a16207', soft: 'rgba(161,98,7,0.10)',   icon: '🌾',   title: 'Local food systems + Wabanaki food sovereignty', hint: 'CSAs, farmers markets, and tribal food-sovereignty efforts shape what’s actually on Maine plates.' }
        };

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
            // Topic-accent hero band per tab
            (function() {
              var meta = TAB_META[tab] || TAB_META.seasons;
              return h('div', {
                style: {
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
                }
              },
                h('div', { style: { fontSize: 32, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                h('div', { style: { flex: 1, minWidth: 220 } },
                  h('h3', { style: { color: meta.accent, fontSize: 17, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  h('p', { style: { margin: '4px 0 0', color: '#475569', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),
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
        var view_state = usePersistedState('cp_view', 'overview');
        var view = view_state[0], setLocalView = view_state[1];

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
      // ─────────────────────────────────────────────────────
      // BUILD A MAINE DAY (net-new mini-game)
      // Pick one food per meal (breakfast/lunch/dinner/snack) from a Maine-
      // realistic short list. Live nutrient totals against approximate
      // adolescent DRIs. Final summary names deficits + standout strengths
      // and ties them back to Maine context (vit D winters, omega-3 fisheries).
      // Pedagogical frame: NOT prescriptive ("hit these targets"). Descriptive
      // ("here is what a balanced Maine day actually looks like").
      // ─────────────────────────────────────────────────────
      function MaineDayBuilder() {
        // Approximate values per serving from USDA FoodData Central.
        // Nutrients tracked: protein(g), fiber(g), vitD(mcg), omega3(g),
        // iron(mg), calcium(mg). Adolescent DRIs (avg teen): protein 50g,
        // fiber 28g, vitD 15mcg, omega3 1.3g, iron 12mg, calcium 1300mg.
        var DRI = { protein: 50, fiber: 28, vitD: 15, omega3: 1.3, iron: 12, calcium: 1300 };
        var FOODS = [
          // Breakfast
          { id: 'bOatBlue', meal: 'breakfast', icon: '🫐', name: 'Maine wild blueberries on oatmeal', protein: 7, fiber: 5, vitD: 0.5, omega3: 0.4, iron: 2.5, calcium: 105, note: 'Maine wild blueberries pack 33% more antioxidants than cultivated.' },
          { id: 'bEggs',    meal: 'breakfast', icon: '🍳', name: 'Two eggs, any style',                protein: 12, fiber: 0, vitD: 2.0, omega3: 0.1, iron: 1.8, calcium: 50, note: 'Eggs are one of the few natural vitamin-D foods.' },
          { id: 'bYogurt',  meal: 'breakfast', icon: '🍯', name: 'Greek yogurt with honey',            protein: 17, fiber: 0, vitD: 1.5, omega3: 0,   iron: 0.1, calcium: 230, note: 'Calcium standout.' },
          { id: 'bToast',   meal: 'breakfast', icon: '🍞', name: 'Whole-grain toast with butter',      protein: 4, fiber: 3, vitD: 0.2, omega3: 0.05, iron: 1.4, calcium: 35, note: 'Quick carbs + fiber, low everything else.' },
          { id: 'bCereal',  meal: 'breakfast', icon: '🥣', name: 'Fortified cereal with milk',         protein: 8, fiber: 3, vitD: 3.5, omega3: 0.05, iron: 9.0, calcium: 320, note: 'Fortified iron + vit D + calcium — nutrient-dense for the price.' },
          // Lunch
          { id: 'lLobster', meal: 'lunch',     icon: '🦞', name: 'Lobster roll (Maine summer)',         protein: 22, fiber: 1, vitD: 0,   omega3: 0.2, iron: 0.8, calcium: 90, note: 'Maine lobster — protein-dense; vit D negligible.' },
          { id: 'lTuna',    meal: 'lunch',     icon: '🐟', name: 'Tuna sandwich (canned light)',        protein: 24, fiber: 2, vitD: 1.0, omega3: 0.5, iron: 2.2, calcium: 70, note: 'Canned light tuna — solid omega-3, low mercury.' },
          { id: 'lTurkey',  meal: 'lunch',     icon: '🥪', name: 'Turkey sandwich on whole wheat',     protein: 22, fiber: 4, vitD: 0.2, omega3: 0.1, iron: 2.5, calcium: 180, note: 'Balanced protein + fiber.' },
          { id: 'lSalad',   meal: 'lunch',     icon: '🥗', name: 'Mixed greens with chickpeas & feta', protein: 14, fiber: 8, vitD: 0,   omega3: 0.2, iron: 4.0, calcium: 220, note: 'Iron + fiber standout. Add citrus for iron absorption.' },
          { id: 'lPizza',   meal: 'lunch',     icon: '🍕', name: 'Cheese pizza (school slice)',        protein: 12, fiber: 2, vitD: 0.3, omega3: 0,   iron: 2.0, calcium: 220, note: 'Calcium from cheese; modest fiber/iron.' },
          // Dinner
          { id: 'dSalmon',  meal: 'dinner',    icon: '🍣', name: 'Baked Atlantic salmon, rice, greens', protein: 32, fiber: 4, vitD: 14.0, omega3: 1.8, iron: 1.5, calcium: 85, note: 'Maine fisheries powerhouse — vit D + omega-3 in one plate.' },
          { id: 'dPasta',   meal: 'dinner',    icon: '🍝', name: 'Spaghetti with marinara',             protein: 12, fiber: 5, vitD: 0,   omega3: 0.2, iron: 3.0, calcium: 60, note: 'Carb-forward; modest iron from sauce + pasta.' },
          { id: 'dChicken', meal: 'dinner',    icon: '🍗', name: 'Roasted chicken, sweet potato, peas', protein: 30, fiber: 7, vitD: 0.5, omega3: 0.1, iron: 2.5, calcium: 80, note: 'Balanced protein + complex carbs + fiber.' },
          { id: 'dChili',   meal: 'dinner',    icon: '🌶️', name: 'Beef chili with beans',                protein: 26, fiber: 11, vitD: 0.3, omega3: 0.1, iron: 5.5, calcium: 110, note: 'Iron + fiber standout. Beef + beans together stack well.' },
          { id: 'dTacos',   meal: 'dinner',    icon: '🌮', name: 'Black bean tacos with cheese',        protein: 18, fiber: 12, vitD: 0.2, omega3: 0.1, iron: 4.0, calcium: 230, note: 'Plant-based protein + huge fiber + calcium from cheese.' },
          // Snack
          { id: 'sApple',   meal: 'snack',     icon: '🍎', name: 'Apple',                                protein: 0.5, fiber: 4, vitD: 0,   omega3: 0,   iron: 0.2, calcium: 11, note: 'Fiber-only standout; minimal everything else.' },
          { id: 'sCheese',  meal: 'snack',     icon: '🧀', name: 'Cheese stick',                         protein: 7, fiber: 0, vitD: 0.4, omega3: 0,   iron: 0.1, calcium: 200, note: 'Calcium-dense, protein-dense.' },
          { id: 'sTrail',   meal: 'snack',     icon: '🥜', name: 'Trail mix (almonds + cranberries)',   protein: 6, fiber: 4, vitD: 0,   omega3: 0.1, iron: 1.5, calcium: 80, note: 'Healthy fats, fiber, plant iron.' },
          { id: 'sHummus',  meal: 'snack',     icon: '🥕', name: 'Carrot sticks with hummus',           protein: 5, fiber: 6, vitD: 0,   omega3: 0.1, iron: 1.5, calcium: 60, note: 'Plant fiber + protein.' },
          { id: 'sIceCream', meal: 'snack',    icon: '🍦', name: 'Maine maple ice cream',                protein: 4, fiber: 0, vitD: 0.5, omega3: 0,   iron: 0.1, calcium: 130, note: 'Treat — calcium present, low everything else.' }
        ];

        var picks = d.bmd_picks || {};
        var done = !!d.bmd_done;
        function setPicks(meal, foodId) {
          var next = Object.assign({}, picks); next[meal] = foodId;
          upd('bmd_picks', next);
        }
        function reset() {
          upd('bmd_picks', {});
          upd('bmd_done', false);
        }

        // Live nutrient totals
        var totals = { protein: 0, fiber: 0, vitD: 0, omega3: 0, iron: 0, calcium: 0 };
        ['breakfast','lunch','dinner','snack'].forEach(function(m) {
          if (!picks[m]) return;
          var f = FOODS.filter(function(x) { return x.id === picks[m]; })[0];
          if (!f) return;
          ['protein','fiber','vitD','omega3','iron','calcium'].forEach(function(k) { totals[k] += f[k] || 0; });
        });
        var pickedCount = ['breakfast','lunch','dinner','snack'].filter(function(m) { return !!picks[m]; }).length;

        function nutBar(key, label, unit, decimals) {
          var val = totals[key];
          var pct = Math.min(100, Math.round((val / DRI[key]) * 100));
          var color, status;
          if (pct >= 80) { color = '#16a34a'; status = 'Strong'; }
          else if (pct >= 50) { color = '#f59e0b'; status = 'Building'; }
          else { color = '#ef4444'; status = 'Low'; }
          var d = decimals == null ? 1 : decimals;
          return h('div', { key: key, className: 'mb-2' },
            h('div', { className: 'flex justify-between text-xs mb-1' },
              h('span', { className: 'text-slate-700 font-bold' }, label),
              h('span', { style: { color: color, fontWeight: 700 } }, val.toFixed(d) + unit + ' / ' + DRI[key] + unit + '  (' + pct + '% — ' + status + ')')
            ),
            h('div', { className: 'w-full bg-slate-200 rounded-full h-2 overflow-hidden' },
              h('div', { style: { width: pct + '%', height: '100%', background: color, transition: 'width 0.3s' }, role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 })
            )
          );
        }

        // ── Summary screen ──
        if (done) {
          var deficits = [];
          var strengths = [];
          [
            { k: 'protein',  l: 'protein' },
            { k: 'fiber',    l: 'fiber' },
            { k: 'vitD',     l: 'vitamin D' },
            { k: 'omega3',   l: 'omega-3' },
            { k: 'iron',     l: 'iron' },
            { k: 'calcium',  l: 'calcium' }
          ].forEach(function(n) {
            var pct = Math.round((totals[n.k] / DRI[n.k]) * 100);
            if (pct >= 80) strengths.push({ label: n.l, pct: pct });
            else if (pct < 50) deficits.push({ label: n.l, pct: pct });
          });
          var maineHighlight =
            totals.vitD < 7 ? 'Your day is low in vitamin D — common for Mainers in winter (latitude 43–47°N). Real-world fix: fortified milk/cereal, eggs, fatty fish, or a winter supplement (talk to a doctor).'
            : totals.omega3 < 0.5 ? 'Your day is low in omega-3 — Maine has world-class fisheries (salmon, herring, sardines) that make this easy to fix.'
            : totals.iron < 6 ? 'Your day is low in iron — adolescents (especially menstruating teens) have high iron needs. Pair plant iron with vitamin C for absorption.'
            : 'Your day looks pretty balanced. Maine context — winter vitamin D and adolescent iron — both look covered.';

          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🌲', title: 'Build a Maine Day — summary' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-emerald-900 mb-2' }, 'Your day, in numbers'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Six nutrients tracked against approximate adolescent DRIs. The point is not to hit 100% on every bar — it is to see what a real day actually adds up to and what tends to be over- or under-represented.')
              ),
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'Nutrient totals'),
                nutBar('protein', 'Protein', 'g'),
                nutBar('fiber', 'Fiber', 'g'),
                nutBar('vitD', 'Vitamin D', 'mcg', 1),
                nutBar('omega3', 'Omega-3', 'g', 2),
                nutBar('iron', 'Iron', 'mg', 1),
                nutBar('calcium', 'Calcium', 'mg', 0)
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-4' },
                h('h3', { className: 'text-sm font-black text-amber-900 mb-2' }, '🌲 Maine context'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, maineHighlight)
              ),
              strengths.length > 0 && h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-4' },
                h('h3', { className: 'text-sm font-black text-emerald-900 mb-2' }, '✅ Standout strengths'),
                h('ul', { className: 'list-disc list-inside text-xs text-slate-800 space-y-0.5' },
                  strengths.map(function(s, si) { return h('li', { key: si }, s.label + ' at ' + s.pct + '% of DRI'); })
                )
              ),
              deficits.length > 0 && h('div', { className: 'bg-rose-50 border border-rose-300 rounded-xl p-4' },
                h('h3', { className: 'text-sm font-black text-rose-900 mb-2' }, '⚠️ Below 50% of DRI'),
                h('ul', { className: 'list-disc list-inside text-xs text-slate-800 space-y-0.5' },
                  deficits.map(function(s, si) { return h('li', { key: si }, s.label + ' at ' + s.pct + '%'); })
                ),
                h('p', { className: 'text-xs text-slate-700 italic mt-2' }, 'Reminder: this is one day. Nutrient needs balance over a week, not within a day. Persistent deficits across multiple days are what matter.')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-300 p-4' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-2' }, 'What you ate today'),
                ['breakfast','lunch','dinner','snack'].map(function(m) {
                  var f = FOODS.filter(function(x) { return x.id === picks[m]; })[0];
                  if (!f) return null;
                  return h('div', { key: m, className: 'flex items-center gap-3 py-1' },
                    h('span', { className: 'text-2xl' }, f.icon),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'text-xs font-bold uppercase text-slate-500' }, m),
                      h('div', { className: 'text-sm font-bold text-slate-800' }, f.name),
                      h('div', { className: 'text-xs text-slate-600 italic' }, f.note)
                    )
                  );
                })
              ),
              h('button', {
                onClick: reset,
                className: 'w-full px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 focus:outline-none focus:ring-2 ring-emerald-400'
              }, '🔄 Build another day')
            )
          );
        }

        // ── Builder screen ──
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🌲', title: 'Build a Maine Day' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
            h('div', { className: 'bg-stone-100 border-2 border-stone-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-stone-900 mb-2' }, 'What does a balanced Maine day actually look like?'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'Pick one food for each meal from a Maine-realistic short list. Watch the six nutrient bars update as you go. The bars are tied to approximate adolescent DRIs — but the point is not to "win" by hitting 100% on each one. It is to see what a real day adds up to and what tends to be over- or under-represented.')
            ),
            // Live totals (sticky-ish at top of meal pickers)
            h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
              h('div', { className: 'flex justify-between items-baseline mb-2' },
                h('h3', { className: 'text-sm font-black text-slate-800' }, 'Live nutrient totals'),
                h('span', { className: 'text-xs text-slate-500' }, pickedCount + ' of 4 meals chosen')
              ),
              nutBar('protein', 'Protein', 'g'),
              nutBar('fiber', 'Fiber', 'g'),
              nutBar('vitD', 'Vitamin D', 'mcg', 1),
              nutBar('omega3', 'Omega-3', 'g', 2),
              nutBar('iron', 'Iron', 'mg', 1),
              nutBar('calcium', 'Calcium', 'mg', 0)
            ),
            // 4 meal pickers
            ['breakfast','lunch','dinner','snack'].map(function(meal) {
              var foods = FOODS.filter(function(f) { return f.meal === meal; });
              var pickedId = picks[meal];
              var mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
              var mealIcon = meal === 'breakfast' ? '🥣' : meal === 'lunch' ? '🥪' : meal === 'dinner' ? '🍽️' : '🍿';
              return h('section', { key: meal, className: 'bg-white rounded-2xl shadow border border-slate-300 p-4' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3 flex items-center gap-2' },
                  h('span', null, mealIcon),
                  h('span', null, mealLabel),
                  pickedId && h('span', { className: 'ml-auto text-xs font-normal text-emerald-700' }, '✓ chosen')
                ),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                  foods.map(function(f) {
                    var sel = pickedId === f.id;
                    return h('button', {
                      key: f.id,
                      onClick: function() { setPicks(meal, f.id); announce(f.name + ' chosen for ' + mealLabel); },
                      'aria-pressed': sel ? 'true' : 'false',
                      className: 'text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                        (sel ? 'bg-emerald-100 border-emerald-500 shadow' : 'bg-white border-slate-300 hover:border-emerald-400')
                    },
                      h('div', { className: 'flex items-start gap-2' },
                        h('span', { className: 'text-2xl flex-shrink-0' }, f.icon),
                        h('div', { className: 'flex-1' },
                          h('div', { className: 'text-sm font-bold text-slate-800' }, f.name),
                          h('div', { className: 'text-xs text-slate-600 italic mt-0.5' }, f.note)
                        )
                      )
                    );
                  })
                )
              );
            }),
            // See-my-day button
            h('button', {
              onClick: function() {
                if (pickedCount < 4) { if (addToast) addToast('Pick one food for every meal first.', 'info'); return; }
                upd('bmd_done', true);
              },
              disabled: pickedCount < 4,
              className: 'w-full px-5 py-3 rounded-xl font-bold focus:outline-none focus:ring-2 ring-emerald-400 ' +
                (pickedCount >= 4 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed')
            }, pickedCount >= 4 ? '📊 See my day' : 'Pick ' + (4 - pickedCount) + ' more meal' + (4 - pickedCount === 1 ? '' : 's'))
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // DEFICIENCY DETECTIVE (net-new mini-game)
      // 10 clinical vignettes; player picks the most likely missing nutrient
      // from 6 options. Targets the canonical real-world deficiency patterns
      // students will encounter in school nursing, sports medicine, and
      // pediatric clinical practice.
      // ─────────────────────────────────────────────────────
      function DeficiencyDetective() {
        var NUTRIENTS = [
          { id: 'vitD',    label: 'Vitamin D', color: '#f59e0b', icon: '☀️',
            def: 'Skin makes it from sunlight; few foods (fatty fish, fortified milk). At Maine\'s latitude, sun is too low Oct–Mar. Bone health + immune.' },
          { id: 'iron',    label: 'Iron',      color: '#dc2626', icon: '🩸',
            def: 'Carries oxygen via hemoglobin. Plant iron (lentils, spinach) absorbs poorly without vitamin C. Menstruating teens + endurance athletes high-risk.' },
          { id: 'b12',     label: 'B12',       color: '#a855f7', icon: '🧬',
            def: 'Animal products only (meat, fish, eggs, dairy) + fortified plant milks. Vegans + PPI-users + older adults at risk. Nerve + RBC formation.' },
          { id: 'folate',  label: 'Folate',    color: '#16a34a', icon: '🥬',
            def: 'Leafy greens, lentils, fortified grains. Critical preconception + early pregnancy for neural-tube development. Often supplemented as folic acid.' },
          { id: 'calcium', label: 'Calcium',   color: '#0ea5e9', icon: '🦴',
            def: 'Dairy, fortified plant milks, leafy greens. Adolescence = peak bone-building years; teen intake shapes lifelong bone density. Lactose-intolerance is risk.' },
          { id: 'iodine',  label: 'Iodine',    color: '#7c3aed', icon: '🦋',
            def: 'Iodized salt, seafood, dairy. Thyroid hormone production. US iodized-salt program nearly eliminated this; still common in low-iodine soil regions.' }
        ];
        var V = [
          { id: 1, scenario: '17-year-old in Maine, runs cross-country. Recurring stress fractures since November. Spends most of the day indoors at school; rarely drinks fortified dairy and takes no supplement.', correct: 'vitD',
            why: 'Maine winter latitude (43–47°N): sun is too low Oct–Mar to make vitamin D in skin. Indoor adolescent + low dietary D + stress fractures = canonical D deficiency. Maine CDC has flagged this as a documented public-health concern.' },
          { id: 2, scenario: '14-year-old girl, started menstruating 6 months ago. Persistent fatigue, brain fog, and "ADHD-like" inattention in class. Vegetarian diet (no red meat). Pale conjunctivae on exam.', correct: 'iron',
            why: 'Menstruating teen + plant-only iron source + fatigue + cognitive symptoms = classic iron-deficiency anemia. AAP notes iron deficiency can present with ADHD-like inattention before frank anemia. Pair plant iron with vitamin C for absorption.' },
          { id: 3, scenario: '21-year-old, strict vegan for 3 years. Tingling and numbness in feet for 6 months; mild memory issues. Does not take a B12 supplement; relies on "B12 in nutritional yeast" but eats it inconsistently.', correct: 'b12',
            why: 'B12 is exclusively in animal products (meat, fish, eggs, dairy) + fortified foods. Vegan without consistent fortified-food or supplement intake = certain B12 deficiency by 2–4 years. Tingling + memory = subacute combined degeneration of spinal cord. Standard recommendation: B12 supplement for ALL vegans.' },
          { id: 4, scenario: '28-year-old, just learned she is 8 weeks pregnant — was not taking prenatal vitamins beforehand. Family history includes a relative born with spina bifida. Asks what supplement to start now and whether she should have started earlier.', correct: 'folate',
            why: 'Folate for neural-tube defect prevention works MOST in the first 28 days of pregnancy — often before someone knows they are pregnant. CDC recommends 400 mcg folic acid daily for ALL women of reproductive age, not just those trying to conceive. The U.S. grain-fortification program has reduced (but not eliminated) NTDs.' },
          { id: 5, scenario: '13-year-old girl, lactose intolerant since age 8. Drinks unfortified almond milk only. Sustained a stress fracture during cross-country. DEXA scan shows low bone density for age.', correct: 'calcium',
            why: 'Lactose intolerance + unfortified plant milk = chronic low calcium intake during PEAK bone-building years (ages 9–18). Adolescent calcium RDA is 1300 mg/day — the highest of any age group. Lifelong bone density is largely set by 20. Switching to FORTIFIED plant milk (check label for 30% DV calcium) is the easy fix.' },
          { id: 6, scenario: '35-year-old recent immigrant from a low-iodine soil region in central Asia. No iodized salt at home for years. Visible neck swelling (goiter); cold-intolerant; sluggish; recent weight gain; family history of thyroid disease.', correct: 'iodine',
            why: 'Goiter + hypothyroid signs + low-iodine soil region (no iodized salt) = iodine deficiency causing thyroid enlargement and hypothyroidism. The U.S. iodized-salt program (1924) nearly eliminated this domestically, but it remains common in many parts of the world. First-line treatment: thyroid evaluation + iodized salt + possibly levothyroxine.' },
          { id: 7, scenario: '68-year-old on omeprazole (a PPI) daily for 5 years for GERD. Recent CBC shows macrocytic anemia (high MCV); reports tingling in hands; not vegetarian, eats normal mixed diet.', correct: 'b12',
            why: 'Long-term PPI use blocks gastric acid production — and gastric acid is required to release B12 from food protein. Even with adequate dietary B12, absorption fails. Macrocytic anemia + neuropathy + PPI = textbook PPI-induced B12 deficiency. AGA and gastroenterology guidelines recommend monitoring B12 in long-term PPI users.' },
          { id: 8, scenario: '19-year-old male training for his first marathon. Persistent fatigue despite "iron-rich" diet. Hemoglobin is normal but ferritin (iron stores) is 12 ng/mL (very low). Not vegetarian.', correct: 'iron',
            why: 'Endurance athletes lose iron through foot-strike hemolysis (RBCs damaged by repeated impact), GI micro-bleeding, and sweat. Ferritin can be very low BEFORE hemoglobin drops — "non-anemic iron deficiency" is real and causes fatigue + reduced performance. Ferritin <30 ng/mL is now the threshold for treatment in athletes (vs <12 in general).' },
          { id: 9, scenario: '6-month-old, exclusively breastfed, born in November in northern New England. Mother is not taking a vitamin D supplement, and the infant has never received one. Pediatric exam notes early bowing of the legs.', correct: 'vitD',
            why: 'Breast milk has very low vitamin D regardless of maternal intake. AAP recommends 400 IU vitamin D supplement for ALL exclusively breastfed infants from birth onward. Bowing legs = nutritional rickets, which is increasing again in the US after decades of decline. Easy prevention; sad to miss.' },
          { id: 10, scenario: '65-year-old postmenopausal woman; recent vertebral compression fracture from a minor fall. DEXA shows osteoporosis. Reports lifelong "low dairy" diet and no calcium supplementation.', correct: 'calcium',
            why: 'Postmenopausal women lose ~1–2% bone density per year for the first 5–10 years after menopause. A lifetime of low calcium intake compounds this. Treatment includes calcium + vitamin D, weight-bearing exercise, and often pharmacotherapy (bisphosphonates). Adolescent calcium intake (vignette #5) prevents this 50 years later.' }
        ];

        var ddIdx = d.ddIdx == null ? -1 : d.ddIdx;
        var ddSeed = d.ddSeed || 1;
        var ddAns = !!d.ddAns;
        var ddPick = d.ddPick;
        var ddScore = d.ddScore || 0;
        var ddRounds = d.ddRounds || 0;
        var ddStreak = d.ddStreak || 0;
        var ddBest = d.ddBest || 0;
        var ddShown = d.ddShown || [];

        function startDd() {
          var pool = [];
          for (var i = 0; i < V.length; i++) if (ddShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); ddShown = []; }
          var seedNext = ((ddSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('ddSeed', seedNext);
          upd('ddIdx', pick);
          upd('ddAns', false);
          upd('ddPick', null);
          upd('ddShown', ddShown.concat([pick]));
        }
        function pickDd(nutId) {
          if (ddAns) return;
          var v = V[ddIdx];
          var correct = nutId === v.correct;
          var newScore = ddScore + (correct ? 1 : 0);
          var newStreak = correct ? (ddStreak + 1) : 0;
          var newBest = Math.max(ddBest, newStreak);
          upd('ddAns', true);
          upd('ddPick', nutId);
          upd('ddScore', newScore);
          upd('ddRounds', ddRounds + 1);
          upd('ddStreak', newStreak);
          upd('ddBest', newBest);
        }

        if (ddIdx < 0) {
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🕵️', title: 'Deficiency Detective' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'bg-rose-50 border-2 border-rose-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-rose-900 mb-2' }, '10 clinical vignettes — name the missing nutrient'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                  'For each scenario, identify which of 6 common nutrients is most likely deficient. Coaching after each pick names what makes this nutrient more likely than the others (and what would have to be different to make a different answer right).'),
                h('div', { className: 'p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-slate-800 leading-relaxed' },
                  h('strong', { className: 'text-amber-900' }, '⚠️ This is not a diagnostic tool. '),
                  'Real deficiencies require lab tests, not vignettes. The game teaches pattern recognition for screening; treatment + diagnosis stay with a clinician.')
              ),
              h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-widest text-rose-700 mb-2' }, 'The six nutrients'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                  NUTRIENTS.map(function(n) {
                    return h('div', { key: n.id, style: { padding: '8px 10px', borderRadius: 8, background: n.color + '15', border: '1px solid ' + n.color + '55' } },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, n.icon),
                        h('span', { style: { color: n.color, fontWeight: 800, fontSize: 12 } }, n.label)
                      ),
                      h('div', { className: 'text-xs text-slate-700 leading-relaxed' }, n.def)
                    );
                  })
                )
              ),
              h('button', {
                onClick: startDd,
                className: 'w-full px-5 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 focus:outline-none focus:ring-2 ring-rose-400'
              }, '🕵️ Start — vignette 1 of 10')
            )
          );
        }

        var v = V[ddIdx];
        var pickedCorrect = ddAns && ddPick === v.correct;
        var pct = ddRounds > 0 ? Math.round((ddScore / ddRounds) * 100) : 0;
        var allDone = ddShown.length >= V.length && ddAns;
        var correctNut = NUTRIENTS.filter(function(n) { return n.id === v.correct; })[0];
        var pickedNut = ddPick ? NUTRIENTS.filter(function(n) { return n.id === ddPick; })[0] : null;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🕵️', title: 'Deficiency Detective' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
            // Score header
            h('div', { className: 'flex flex-wrap gap-3 items-center text-xs text-slate-700' },
              h('span', null, 'Vignette ', h('strong', { className: 'text-slate-900' }, ddShown.length)),
              h('span', null, 'Score ', h('strong', { className: 'text-emerald-700' }, ddScore + ' / ' + ddRounds)),
              ddRounds > 0 && h('span', null, 'Accuracy ', h('strong', { className: 'text-cyan-700' }, pct + '%')),
              h('span', null, 'Streak ', h('strong', { className: 'text-amber-700' }, ddStreak)),
              h('span', null, 'Best ', h('strong', { className: 'text-fuchsia-700' }, ddBest))
            ),
            // The vignette
            h('section', { className: 'p-5 rounded-2xl bg-rose-50 border-2 border-rose-300' },
              h('div', { className: 'text-xs font-bold uppercase tracking-widest text-rose-700 mb-2' }, 'Vignette ' + ddShown.length + ' of ' + V.length),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, v.scenario)
            ),
            // 6 nutrient picker buttons
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2', role: 'radiogroup', 'aria-label': 'Pick the most likely missing nutrient' },
              NUTRIENTS.map(function(n) {
                var picked = ddAns && ddPick === n.id;
                var isRight = ddAns && n.id === v.correct;
                var bg, border, color;
                if (ddAns) {
                  if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                  else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                  else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
                } else {
                  bg = n.color + '12'; border = n.color + '60'; color = '#1e293b';
                }
                return h('button', {
                  key: n.id, role: 'radio',
                  'aria-checked': picked ? 'true' : 'false',
                  'aria-label': n.label,
                  disabled: ddAns,
                  onClick: function() { pickDd(n.id); },
                  style: { padding: '12px 14px', borderRadius: 12, background: bg, color: color, border: '2px solid ' + border, cursor: ddAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 70, transition: 'all 0.15s' }
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, n.icon),
                    h('span', { style: { color: ddAns ? color : n.color, fontSize: 13, fontWeight: 800 } }, n.label)
                  ),
                  h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: ddAns ? color : '#475569' } }, n.def)
                );
              })
            ),
            // Feedback
            ddAns && h('section', {
              className: 'p-4 rounded-2xl',
              style: {
                background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
                border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
              }
            },
              h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
                pickedCorrect
                  ? '✅ Correct — ' + correctNut.label
                  : '❌ The nutrient is ' + correctNut.label + (pickedNut ? ' (you picked ' + pickedNut.label + ')' : '')
              ),
              h('p', { className: 'text-xs text-slate-800 leading-relaxed mb-3' }, v.why),
              allDone
                ? h('div', { className: 'p-3 rounded-lg bg-rose-100 border border-rose-300' },
                    h('div', { className: 'text-sm font-black text-rose-900 mb-1' }, '🏆 All 10 vignettes complete'),
                    h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                      'Final: ', h('strong', null, ddScore + ' / ' + V.length + ' (' + Math.round((ddScore / V.length) * 100) + '%)'),
                      ddScore === V.length ? ' — every deficiency correctly identified. The clinical pattern reflexes are in place.' :
                      ddScore >= 8 ? ' — strong pattern recognition. The most-confused pair is usually B12 vs folate (both cause macrocytic anemia, but B12 has neuro signs and folate doesn\'t — and folate alone can MASK the B12 anemia while neuropathy progresses).' :
                      ddScore >= 6 ? ' — solid baseline. Reflexes worth building: vegan = always B12 supp, menstruating teen = check ferritin, postmenopausal = calcium + DEXA, Maine winter = vit D for everyone.' :
                      ' — these patterns take practice. The vignettes are designed to mimic the screening cues real clinicians use; re-read the rationales on misses, then retake.'
                    ),
                    h('button', {
                      onClick: function() { upd('ddIdx', -1); upd('ddShown', []); upd('ddScore', 0); upd('ddRounds', 0); upd('ddStreak', 0); },
                      className: 'mt-3 px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700'
                    }, '🔄 Restart')
                  )
                : h('button', {
                    onClick: startDd,
                    className: 'px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 focus:outline-none focus:ring-2 ring-rose-400'
                  }, '➡️ Next vignette')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // HYDRATION LAB
      // Water, your body, and the science of staying hydrated.
      // PHYSIOLOGY-FIRST framing throughout: water is a body input,
      // never an appetite suppressant. NEDA-aware copy: no language
      // that frames hydration as a substitute for eating.
      // ─────────────────────────────────────────────────────

      // NAM/IOM Adequate Intake (AI) for total water by age + sex.
      // "Total water" includes fluid AND food moisture (about 20% of
      // intake comes from food, so the fluid-only target is ~80% of
      // the AI). Numbers reproduced from IOM (2005) Dietary Reference
      // Intakes: Water, Potassium, Sodium, Chloride, and Sulfate, the
      // canonical source still cited by the AAP and NIH.
      var WATER_AI_TOTAL_L = {
        // age band → { male, female } total water L/day
        '4-8':   { male: 1.7, female: 1.7 },
        '9-13':  { male: 2.4, female: 2.1 },
        '14-18': { male: 3.3, female: 2.3 },
        '19+':   { male: 3.7, female: 2.7 }
      };

      // Activity adder (NATA position statement on fluid replacement,
      // 2017): roughly 400-800 mL/hr of moderate exercise; up to
      // ~1.5 L/hr in heat. We use conservative midpoints.
      var ACTIVITY_ADD_ML = {
        sedentary:  0,
        light:      300,
        moderate:   600,
        vigorous:  1000
      };

      // Urine color reference (Armstrong 8-point scale; ACSM-cited).
      // Each entry: hex swatch, status word, what-it-means line.
      var URINE_COLORS = [
        { hex: '#fcfdf2', n: 1, label: 'Very pale',     status: 'Hydrated',           note: 'Often clear or nearly so. Fine if you have not been pushing fluids; overdrinking water has its own risks.' },
        { hex: '#fafad9', n: 2, label: 'Pale yellow',   status: 'Hydrated',           note: 'The classic "well-hydrated" target color most clinicians teach.' },
        { hex: '#f3edaa', n: 3, label: 'Light yellow',  status: 'Hydrated',           note: 'Still in the green zone. Body has enough water for routine function.' },
        { hex: '#e6db5c', n: 4, label: 'Yellow',        status: 'Borderline',         note: 'Drink water in the next hour. Not an emergency, but you are trending toward thirsty.' },
        { hex: '#d3b73c', n: 5, label: 'Dark yellow',   status: 'Mildly dehydrated',  note: 'About 1-2% body-weight fluid deficit. Attention, mood, short-term memory measurably drop here. Drink now.' },
        { hex: '#b08c2a', n: 6, label: 'Amber',         status: 'Dehydrated',         note: 'Definitely behind. Sip water steadily over the next 1-2 hours. Avoid soda or caffeine right now.' },
        { hex: '#8b6420', n: 7, label: 'Brown-amber',   status: 'Very dehydrated',    note: 'If this is post-exercise or after illness, rehydrate with water + a salty snack or oral rehydration solution.' },
        { hex: '#6b4015', n: 8, label: 'Dark brown',    status: 'Severely dehydrated', note: 'Or possibly a sign of something else (medication, liver, blood in urine). If you cannot rehydrate or it persists, see a clinician.' }
      ];

      // Beverage comparison data (per 8 oz / ~240 mL serving).
      // Sources: USDA FoodData Central; AAP Clinical Report on
      // sports + energy drinks for kids (Pediatrics 2011, reaffirmed
      // 2018); NATA position statement on fluid replacement.
      var BEVERAGES = [
        {
          id: 'water', name: 'Water', icon: '💧',
          sodium: 0, sugar: 0, caffeine: 0, kcal: 0,
          efficacy: 'Best baseline hydrator for sub-1-hour activity. Replenishes fluid without adding sugar or sodium your body did not lose.',
          when: 'The default. Carry a bottle. Refill at school fountains.',
          source: 'NATA 2017 fluid replacement position'
        },
        {
          id: 'sports', name: 'Sports drink (typical)', icon: '🏃',
          sodium: 110, sugar: 14, caffeine: 0, kcal: 50,
          efficacy: 'Replaces sodium lost in sweat AND adds quick-burning sugar. Useful for endurance over 60-90 minutes or for athletes practicing in heat.',
          when: 'Long practices in heat, two-a-days, athletic events. Not a default thirst-quencher for routine school days.',
          source: 'AAP 2011 Clinical Report; NATA 2017'
        },
        {
          id: 'soda', name: 'Soda (cola)', icon: '🥤',
          sodium: 35, sugar: 26, caffeine: 30, kcal: 100,
          efficacy: 'Provides fluid but the sugar and caffeine produce a small diuretic effect. Net hydration is positive but lower per ounce than water or a sports drink.',
          when: 'Occasional. Not a hydration tool. The 26 g of sugar per cup is well above the daily added-sugar guideline for adolescents.',
          source: 'USDA FoodData Central; AAP added-sugar guidance'
        },
        {
          id: 'milk', name: 'Milk (1%)', icon: '🥛',
          sodium: 100, sugar: 13, caffeine: 0, kcal: 100,
          efficacy: 'Some of the best post-exercise rehydration in studies. Fluid plus electrolytes plus protein support recovery, and the natural sugar (lactose) is part of the food, not added sugar.',
          when: 'Post-practice recovery, breakfast, snack. Plant milks vary; check the label for added sugar.',
          source: 'McGregor 2008 / Shirreffs 2007 (post-exercise rehydration trials)'
        }
      ];

      function HydrationLab() {
        var tab_state = usePersistedState('hl_tab', 'needs');
        var tab = tab_state[0], setTab = tab_state[1];

        // Daily-needs inputs
        var ageBand_state = usePersistedState('hl_ageBand', '14-18');
        var ageBand = ageBand_state[0], setAgeBand = ageBand_state[1];
        var sex_state = usePersistedState('hl_sex', 'female');
        var sex = sex_state[0], setSex = sex_state[1];
        var activity_state = usePersistedState('hl_activity', 'moderate');
        var activity = activity_state[0], setActivity = activity_state[1];

        // Urine-color quiz (status check)
        var urineIdx_state = usePersistedState('hl_urineIdx', null);
        var urineIdx = urineIdx_state[0], setUrineIdx = urineIdx_state[1];

        // Sweat-rate inputs (for student athletes)
        var sweatBefore_state = usePersistedState('hl_sweatBefore', '');
        var sweatBefore = sweatBefore_state[0], setSweatBefore = sweatBefore_state[1];
        var sweatAfter_state = usePersistedState('hl_sweatAfter', '');
        var sweatAfter = sweatAfter_state[0], setSweatAfter = sweatAfter_state[1];
        var sweatFluid_state = usePersistedState('hl_sweatFluid', '');
        var sweatFluid = sweatFluid_state[0], setSweatFluid = sweatFluid_state[1];
        var sweatMins_state = usePersistedState('hl_sweatMins', '');
        var sweatMins = sweatMins_state[0], setSweatMins = sweatMins_state[1];

        // ── Calculations ──
        var aiTotal = (WATER_AI_TOTAL_L[ageBand] || WATER_AI_TOTAL_L['14-18'])[sex] || 2.3;
        // ~80% of AI is fluid intake (rest comes from food).
        var fluidBaseMl = Math.round(aiTotal * 1000 * 0.8);
        var activityAdd = ACTIVITY_ADD_ML[activity] || 0;
        var dailyTargetMl = fluidBaseMl + activityAdd;
        var dailyTargetCups = (dailyTargetMl / 240).toFixed(1); // 8 oz cup = ~240 mL

        // Sweat-rate output: kg lost = fluid lost (1 kg ≈ 1 L). Rate
        // per hour = (kg lost + L drunk) / hours. NATA recommends
        // replacing 100-150% of fluid lost in the 2-6 hours after.
        var sBefore = parseFloat(sweatBefore);
        var sAfter = parseFloat(sweatAfter);
        var sFluid = parseFloat(sweatFluid);
        var sMins = parseFloat(sweatMins);
        var sweatLossKg = (!isNaN(sBefore) && !isNaN(sAfter)) ? Math.max(0, sBefore - sAfter) : NaN;
        var sweatRateMlHr = (!isNaN(sweatLossKg) && !isNaN(sFluid) && !isNaN(sMins) && sMins > 0)
          ? Math.round(((sweatLossKg * 1000) + sFluid) / (sMins / 60))
          : NaN;
        var sweatReplaceTarget = !isNaN(sweatLossKg) ? Math.round(sweatLossKg * 1000 * 1.25) : NaN;

        var TABS = [
          { id: 'needs',     label: 'Daily Needs',       icon: '🎯' },
          { id: 'status',    label: 'Status Check',      icon: '🪞' },
          { id: 'beverages', label: 'Beverage Compare',  icon: '🥤' },
          { id: 'sweat',     label: 'Sweat Rate',        icon: '🏃' }
        ];

        function tabBtn(t) {
          var sel = (tab === t.id);
          return h('button', {
            key: t.id,
            onClick: function() { setTab(t.id); },
            role: 'tab', 'aria-selected': sel ? 'true' : 'false',
            className: 'flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors focus:outline-none focus:ring-2 ring-sky-500 ' +
              (sel ? 'bg-sky-700 text-white shadow' : 'bg-white text-slate-800 hover:bg-sky-50 border border-slate-300')
          }, t.icon + ' ' + t.label);
        }

        // Hydration fill-bar — shows daily target as a vertical bottle fill.
        function FillBar(props) {
          var ml = props.ml || 0;
          var maxMl = props.max || 4000;
          var pct = Math.min(100, Math.round((ml / maxMl) * 100));
          var bottleH = 200, bottleW = 80;
          return h('div', { className: 'flex items-center gap-4' },
            h('svg', { width: bottleW, height: bottleH, viewBox: '0 0 ' + bottleW + ' ' + bottleH,
              role: 'img', 'aria-label': 'Daily fluid target shown as a bottle ' + pct + ' percent full.' },
              // Bottle outline
              h('rect', { x: 14, y: 22, width: bottleW - 28, height: bottleH - 30, rx: 8, fill: 'none', stroke: '#0c4a6e', strokeWidth: 2 }),
              // Bottle neck
              h('rect', { x: 28, y: 8, width: 24, height: 16, fill: '#0c4a6e' }),
              // Water fill (animated height via dasharray-free approach)
              h('rect', {
                x: 16, y: bottleH - 10 - ((bottleH - 34) * pct / 100),
                width: bottleW - 32, height: ((bottleH - 34) * pct / 100),
                fill: '#38bdf8', opacity: 0.85
              }),
              // Percent label
              h('text', { x: bottleW / 2, y: bottleH / 2, textAnchor: 'middle', fontSize: 16, fontWeight: 800, fill: '#0c4a6e' }, pct + '%')
            ),
            h('div', { className: 'flex-1 text-sm text-slate-800' }, props.children)
          );
        }

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '💧', title: 'Hydration Lab' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            // Intro
            h('div', { className: 'bg-sky-50 border-2 border-sky-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-sky-900 mb-2' }, 'Hydration is body function, not body shape.'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'Roughly 60% of your body weight is water. Every cell uses it. The brain runs about 75% water and the first thing that drops with mild dehydration (1-2% body-weight fluid loss) is attention, short-term memory, and mood. This lab covers four things: how much fluid you actually need, how to read your own body for status, which drinks help and which do not, and how to handle hydration as a student athlete. Hydration is never a substitute for eating. If you find yourself using water to feel full or skip meals, talk to a trusted adult and call NEDA at 1-800-931-2237.')
            ),
            // Tabs
            h('div', { role: 'tablist', 'aria-label': 'Hydration Lab sections', className: 'flex flex-wrap gap-2' },
              TABS.map(tabBtn)
            ),

            // ──────────── Tab: Daily Needs ────────────
            tab === 'needs' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
                h('h3', { className: 'text-lg font-black text-slate-800' }, 'How much fluid do I need today?'),
                h('p', { className: 'text-xs text-slate-700' },
                  'Tell us your age band, sex assigned at birth (the reference values are biological, not gender), and how active you are. The result is a fluid-intake estimate, not a daily quota you must hit. Body size, climate, illness, and pregnancy all shift this. Listen to thirst.'),

                // Age + Sex inputs
                h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Age band'),
                    h('select', {
                      value: ageBand,
                      onChange: function(e) { setAgeBand(e.target.value); },
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    },
                      h('option', { value: '4-8' }, 'Ages 4-8'),
                      h('option', { value: '9-13' }, 'Ages 9-13'),
                      h('option', { value: '14-18' }, 'Ages 14-18'),
                      h('option', { value: '19+' }, 'Ages 19+')
                    )
                  ),
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Reference (sex assigned at birth)'),
                    h('select', {
                      value: sex,
                      onChange: function(e) { setSex(e.target.value); },
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    },
                      h('option', { value: 'female' }, 'Female reference'),
                      h('option', { value: 'male' }, 'Male reference')
                    )
                  ),
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Activity level today'),
                    h('select', {
                      value: activity,
                      onChange: function(e) { setActivity(e.target.value); },
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    },
                      h('option', { value: 'sedentary' }, 'Mostly sitting'),
                      h('option', { value: 'light' }, 'Light (walking, easy PE)'),
                      h('option', { value: 'moderate' }, 'Moderate (1 hr practice)'),
                      h('option', { value: 'vigorous' }, 'Vigorous (long practice / heat)')
                    )
                  )
                ),

                // Result
                h(FillBar, { ml: dailyTargetMl, max: 4500 },
                  h('div', { className: 'space-y-2' },
                    h('div', { className: 'text-2xl font-black text-sky-900' }, dailyTargetMl + ' mL'),
                    h('div', { className: 'text-sm text-slate-800' }, 'About ' + dailyTargetCups + ' cups (8 oz each) of fluid today.'),
                    h('div', { className: 'text-xs text-slate-700 italic' },
                      'Baseline ' + fluidBaseMl + ' mL from NAM/IOM Adequate Intake (about 80% of total water; rest comes from food).' +
                      (activityAdd > 0 ? ' Plus +' + activityAdd + ' mL for ' + activity + ' activity (NATA).' : ''))
                  )
                ),

                h('p', { className: 'text-[11px] text-slate-700 italic mt-2 leading-relaxed' },
                  'Sources: Institute of Medicine (2005) Dietary Reference Intakes for Water, still cited by AAP and NIH ODS. Activity adder from NATA 2017 Position Statement on Fluid Replacement.')
              )
            ),

            // ──────────── Tab: Status Check ────────────
            tab === 'status' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
                h('h3', { className: 'text-lg font-black text-slate-800' }, 'The 8-point urine-color check'),
                h('p', { className: 'text-xs text-slate-700' },
                  'Look at your urine the next time you use the bathroom. Pick the color closest to what you saw. The Armstrong 8-point scale is widely used in athletic training and clinical hydration assessment.'),

                // Color swatches
                h('div', { role: 'radiogroup', 'aria-label': 'Urine color', className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                  URINE_COLORS.map(function(c, i) {
                    var sel = (urineIdx === i);
                    return h('button', {
                      key: 'uc-' + i,
                      onClick: function() { setUrineIdx(i); },
                      role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                      'aria-label': c.label + ' — ' + c.status,
                      className: 'rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 ring-sky-500 ' +
                        (sel ? 'border-sky-600 ring-2 ring-sky-300 shadow-lg' : 'border-slate-300 hover:border-sky-400')
                    },
                      h('div', { style: { width: '100%', height: 36, background: c.hex, borderRadius: 6, border: '1px solid #cbd5e1' }, 'aria-hidden': 'true' }),
                      h('div', { className: 'text-[11px] font-bold mt-1 text-slate-800' }, c.n + '. ' + c.label),
                      h('div', { className: 'text-[10px] text-slate-700' }, c.status)
                    );
                  })
                ),

                urineIdx != null && h('div', {
                  className: 'rounded-xl border-2 p-4 ' +
                    (urineIdx <= 2 ? 'bg-emerald-50 border-emerald-300' :
                     urineIdx <= 4 ? 'bg-amber-50 border-amber-300' :
                     'bg-rose-50 border-rose-300')
                },
                  h('div', { className: 'text-sm font-black mb-1' }, URINE_COLORS[urineIdx].label + ' — ' + URINE_COLORS[urineIdx].status),
                  h('div', { className: 'text-xs text-slate-800 leading-relaxed' }, URINE_COLORS[urineIdx].note)
                )
              ),

              // Body-signal checklist (companion to the color check)
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-2' }, 'Other body signals worth tracking'),
                h('ul', { className: 'space-y-1.5 text-sm text-slate-800 list-disc list-inside' },
                  h('li', null, 'Thirst is a useful late signal, not an early one — by the time you feel thirsty you are usually already at 1-2% deficit.'),
                  h('li', null, 'Lightheaded standing up, heart pounding at rest, headache without other cause: classic mild-moderate dehydration in clinical guides.'),
                  h('li', null, 'Foggy attention, slower math, irritability: documented in studies as effects of mild dehydration in adolescents.'),
                  h('li', null, 'Dry lips and dry mouth are real signals — but skin "tenting" (slow snap-back) only shows up at moderate-to-severe dehydration.'),
                  h('li', null, 'Persistent dark urine despite drinking water? See a clinician — could be liver, medication, or blood-related.')
                ),
                h('p', { className: 'text-[11px] italic text-slate-700 mt-2' },
                  'If you find yourself using water to feel "full" or override hunger, that is a body-cue mismatch worth talking about with a trusted adult. NEDA helpline: 1-800-931-2237.')
              )
            ),

            // ──────────── Tab: Beverage Compare ────────────
            tab === 'beverages' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5' },
                h('h3', { className: 'text-lg font-black text-slate-800 mb-2' }, 'What is in 8 oz of...'),
                h('p', { className: 'text-xs text-slate-700 mb-4' },
                  'Sodium and added sugar matter for hydration efficacy AND for daily nutrient targets. AAP guidance: added sugar under 25 g/day for ages 2-18; sodium under ~2,300 mg/day for adolescents.'),

                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                  BEVERAGES.map(function(b) {
                    return h('div', { key: b.id, className: 'bg-slate-50 rounded-xl border-2 border-slate-300 p-4 space-y-2' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, b.icon),
                        h('div', { className: 'text-base font-black text-slate-800' }, b.name)
                      ),
                      h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                        h('div', { className: 'rounded-lg bg-white p-2 border border-slate-300' },
                          h('div', { className: 'text-[9px] uppercase font-bold text-slate-700' }, 'Sodium'),
                          h('div', { className: 'text-sm font-black text-slate-800' }, b.sodium + ' mg')
                        ),
                        h('div', { className: 'rounded-lg bg-white p-2 border border-slate-300' },
                          h('div', { className: 'text-[9px] uppercase font-bold text-slate-700' }, 'Sugar'),
                          h('div', { className: 'text-sm font-black ' + (b.sugar >= 14 ? 'text-rose-700' : 'text-slate-800') }, b.sugar + ' g')
                        ),
                        h('div', { className: 'rounded-lg bg-white p-2 border border-slate-300' },
                          h('div', { className: 'text-[9px] uppercase font-bold text-slate-700' }, 'Caffeine'),
                          h('div', { className: 'text-sm font-black text-slate-800' }, b.caffeine + ' mg')
                        )
                      ),
                      h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                        h('span', { className: 'font-bold' }, 'Hydration: '), b.efficacy
                      ),
                      h('div', { className: 'text-xs text-slate-800 leading-relaxed' },
                        h('span', { className: 'font-bold' }, 'When it fits: '), b.when
                      ),
                      h('div', { className: 'text-[10px] italic text-slate-700' }, 'Source: ' + b.source)
                    );
                  })
                )
              ),

              h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-4' },
                h('h4', { className: 'text-sm font-black text-amber-900 mb-1' }, 'A note on energy drinks'),
                h('p', { className: 'text-xs text-slate-800 leading-relaxed' },
                  'AAP says outright that energy drinks (Monster, Red Bull, etc.) "should not be consumed by children or adolescents." High caffeine doses, heart-rhythm effects, and added stimulants are the reason. They are not in this comparison because they should not be on this list.')
              )
            ),

            // ──────────── Tab: Sweat Rate ────────────
            tab === 'sweat' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl shadow border border-slate-300 p-5 space-y-4' },
                h('h3', { className: 'text-lg font-black text-slate-800' }, 'How fast do you sweat? (NATA standard)'),
                h('p', { className: 'text-xs text-slate-700' },
                  'For student athletes. Weigh yourself before practice, weigh yourself after, log the fluid you drank during, and the duration. The math: 1 kg of weight lost = 1 L of sweat. NATA recommends replacing 100-150% of fluid lost over the next 2-6 hours.'),

                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Weight before (kg)'),
                    h('input', {
                      type: 'number', step: '0.1', min: '0', value: sweatBefore,
                      onChange: function(e) { setSweatBefore(e.target.value); },
                      placeholder: 'e.g. 65.0',
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    })
                  ),
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Weight after (kg)'),
                    h('input', {
                      type: 'number', step: '0.1', min: '0', value: sweatAfter,
                      onChange: function(e) { setSweatAfter(e.target.value); },
                      placeholder: 'e.g. 64.2',
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    })
                  ),
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Fluid drunk during (mL)'),
                    h('input', {
                      type: 'number', step: '50', min: '0', value: sweatFluid,
                      onChange: function(e) { setSweatFluid(e.target.value); },
                      placeholder: 'e.g. 500',
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    })
                  ),
                  h('label', { className: 'block' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, 'Duration (minutes)'),
                    h('input', {
                      type: 'number', step: '5', min: '0', value: sweatMins,
                      onChange: function(e) { setSweatMins(e.target.value); },
                      placeholder: 'e.g. 90',
                      className: 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 ring-sky-500'
                    })
                  )
                ),

                !isNaN(sweatRateMlHr) && h('div', { className: 'rounded-xl border-2 border-sky-300 bg-sky-50 p-4 space-y-2' },
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                    h(StatCard, { label: 'Fluid lost', value: (sweatLossKg * 1000).toFixed(0) + ' mL', color: 'text-sky-800' }),
                    h(StatCard, { label: 'Sweat rate', value: sweatRateMlHr + ' mL/hr', color: 'text-sky-800' }),
                    h(StatCard, { label: 'Replace target', value: sweatReplaceTarget + ' mL', color: 'text-emerald-700' })
                  ),
                  h('p', { className: 'text-xs text-slate-800 leading-relaxed' },
                    sweatRateMlHr < 600 ? 'Lower-end sweat rate — typical for cool weather or moderate effort.' :
                    sweatRateMlHr < 1200 ? 'Moderate sweat rate — typical practice intensity. Sip steadily during, replace fully after.' :
                    'High sweat rate — common in heat or vigorous training. Plan electrolytes (sports drink or salty snack) plus water. NATA flags rates above 2 L/hr as a heat-illness risk if not replaced.'
                  ),
                  h('p', { className: 'text-[11px] italic text-slate-700' },
                    'Replace target uses NATA\'s 125% recommendation (midpoint of the 100-150% guideline) to account for ongoing post-exercise sweat and urine loss.')
                ),

                h('p', { className: 'text-[11px] text-slate-700 italic mt-2 leading-relaxed' },
                  'Sources: NATA 2017 Position Statement on Fluid Replacement; ACSM Position Stand on Exercise and Fluid Replacement (2007).')
              )
            ),

            // Teacher Notes
            h(TeacherNotes, {
              standards: ['NGSS HS-LS1-3 (homeostasis)', 'CTE Health Science / Sports Med fluid balance', 'NATA Athletic Training Education Competencies'],
              discussion: [
                'How is the AAP recommendation against energy drinks different from a recommendation against sports drinks? Why?',
                'A football lineman in August Maine practice and a cross-country runner in October look very different on the sweat-rate calculator. Walk through how each should adjust.',
                'Why is "drink to thirst" enough advice for most school days but not enough for a two-a-day practice in heat?',
                'What signals besides urine color tell you (or your friend) that hydration is off?',
                'When does a hydration habit start crossing into something that should be talked about with a counselor or family member?'
              ],
              extensions: [
                'Have students log their own sweat rate after a real practice or PE class and bring the numbers in.',
                'Compare the cost-per-mL of water vs sports drink vs flavored seltzer. Which is the better day-to-day choice?',
                'Cross-reference with the Maine Day Builder: which Maine foods contribute meaningfully to your fluid baseline?',
                'Read the AAP 2011 sports/energy drink Clinical Report (open access on Pediatrics) and identify the three claims you found most surprising.'
              ]
            })
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
      if (view === 'maineDay') return h(MaineDayBuilder);
      if (view === 'deficiencyDetective') return h(DeficiencyDetective);
      if (view === 'hydrationLab') return h(HydrationLab);
      if (view === 'myNutritionKit') {
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🥗', title: 'My Nutrition Kit' }),
          h('div', { className: 'max-w-6xl mx-auto' },
            h(MyNutritionKit, { d: d, upd: function(key, val) { upd(key, val); } })
          )
        );
      }
      return h(MainMenu);
    }
  });

})();

}
