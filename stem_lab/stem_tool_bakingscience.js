// ═══════════════════════════════════════════
// stem_tool_bakingscience.js — Baking Lab v1.0
// 4 sub-tools: Leavening Lab, Emulsion Mixer,
// Recipe Scaler, Oven Timeline
// ═══════════════════════════════════════════

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Scoped GPU-composited culinary motion choreography (zero per-frame DOM thrashing) ──
  (function() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('allo-baking-motion-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-baking-motion-css';
    st.textContent = [
      '@keyframes bakingBubbleRise { 0% { transform: translateY(0) scale(0.72); opacity: 0; } 20% { opacity: 0.92; } 85% { opacity: 0.78; } 100% { transform: translateY(-128px) scale(1.1); opacity: 0; } }',
      '@keyframes bkCo2Float { 0%, 100% { transform: translateY(0px) scale(1); opacity: 0.86; } 50% { transform: translateY(-4px) scale(1.06); opacity: 1; } }',
      '@keyframes bkMicroBubbleAscend { 0% { transform: translateY(10px) scale(0.65); opacity: 0; } 22% { opacity: 0.85; } 82% { opacity: 0.58; } 100% { transform: translateY(-28px) scale(1.08); opacity: 0; } }',
      '@keyframes bkConvectionFlow { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }',
      '@keyframes bkSteamDrift { 0% { transform: translateY(3px); opacity: 0.24; } 50% { transform: translateY(-3.5px); opacity: 0.9; } 100% { transform: translateY(-9px); opacity: 0.14; } }',
      '@keyframes bkOvenGlowPulse { 0%, 100% { opacity: 0.72; } 50% { opacity: 1; } }',
      '@keyframes bkCrustSheenSweep { 0% { transform: translateX(-46px); opacity: 0; } 30% { opacity: 0.52; } 70% { opacity: 0.44; } 100% { transform: translateX(62px); opacity: 0; } }',
      '@keyframes bkGlutenTensile { from { stroke-dashoffset: 48; } to { stroke-dashoffset: 0; } }',
      '@keyframes bkCrosslinkPulse { 0%, 100% { opacity: 0.18; transform: scale(0.95); } 50% { opacity: 0.52; transform: scale(1.16); } }',
      '@keyframes bkBeaconPulse { 0%, 100% { opacity: 0.24; transform: scale(0.9); } 50% { opacity: 0.62; transform: scale(1.25); } }',
      '@keyframes bkDropletFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-2.4px); } }',
      '@keyframes bkLecithinDash { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }',
      '@keyframes bkKineticTrace { from { stroke-dashoffset: 36; } to { stroke-dashoffset: 0; } }',
      '@keyframes bkBarSheen { 0%, 100% { opacity: 0.26; } 50% { opacity: 0.54; } }',
      '@keyframes bkGelWave { 0%, 100% { transform: translateX(-8px); opacity: 0.22; } 50% { transform: translateX(8px); opacity: 0.48; } }',
      '[data-baking-theme] .bk-co2-float { transform-box: fill-box; transform-origin: center; animation: bkCo2Float 3.4s ease-in-out infinite; }',
      '[data-baking-theme] .bk-micro-bubble { transform-box: fill-box; transform-origin: center; animation: bkMicroBubbleAscend 2.9s ease-out infinite; }',
      '[data-baking-theme] .bk-convection { animation: bkConvectionFlow 3.2s linear infinite; }',
      '[data-baking-theme] .bk-steam-drift { transform-box: fill-box; transform-origin: center; animation: bkSteamDrift 2.8s ease-in-out infinite; }',
      '[data-baking-theme] .bk-oven-glow { animation: bkOvenGlowPulse 3.6s ease-in-out infinite; }',
      '[data-baking-theme] .bk-crust-sheen { transform-box: fill-box; transform-origin: center; animation: bkCrustSheenSweep 4.4s ease-in-out infinite; }',
      '[data-baking-theme] .bk-gluten-tensile { animation: bkGlutenTensile 3.4s linear infinite; }',
      '[data-baking-theme] .bk-crosslink-pulse { transform-box: fill-box; transform-origin: center; animation: bkCrosslinkPulse 2.8s ease-in-out infinite; }',
      '[data-baking-theme] .bk-beacon { transform-box: fill-box; transform-origin: center; animation: bkBeaconPulse 2.4s ease-in-out infinite; }',
      '[data-baking-theme] .bk-droplet-float { transform-box: fill-box; transform-origin: center; animation: bkDropletFloat 3.6s ease-in-out infinite; }',
      '[data-baking-theme] .bk-lecithin-dash { animation: bkLecithinDash 4.2s linear infinite; }',
      '[data-baking-theme] .bk-kinetic-trace { animation: bkKineticTrace 2.8s linear infinite; }',
      '[data-baking-theme] .bk-bar-sheen { animation: bkBarSheen 3.2s ease-in-out infinite; }',
      '[data-baking-theme] .bk-gel-wave { transform-box: fill-box; transform-origin: center; animation: bkGelWave 3.8s ease-in-out infinite; }',
      '[data-baking-theme] .bk-skillet-sheen { position: relative; overflow: hidden; }',
      '[data-baking-theme] .bk-skillet-sheen::after { content: ""; position: absolute; inset: -10%; background: linear-gradient(112deg, transparent 32%, rgba(254,243,199,0.52) 50%, transparent 68%); transform: translateX(-110%); animation: bkCrustSheenSweep 3.8s ease-in-out infinite; pointer-events: none; }',
      '@media (prefers-reduced-motion: reduce) { [data-baking-theme] .bk-co2-float, [data-baking-theme] .bk-micro-bubble, [data-baking-theme] .bk-convection, [data-baking-theme] .bk-steam-drift, [data-baking-theme] .bk-oven-glow, [data-baking-theme] .bk-crust-sheen, [data-baking-theme] .bk-gluten-tensile, [data-baking-theme] .bk-crosslink-pulse, [data-baking-theme] .bk-beacon, [data-baking-theme] .bk-droplet-float, [data-baking-theme] .bk-lecithin-dash, [data-baking-theme] .bk-kinetic-trace, [data-baking-theme] .bk-bar-sheen, [data-baking-theme] .bk-gel-wave, [data-baking-theme] .bk-skillet-sheen::after { animation: none !important; transition: none !important; } [data-baking-theme] .bk-crust-sheen, [data-baking-theme] .bk-skillet-sheen::after { opacity: 0 !important; } }',
      '.theme-contrast [data-baking-theme] .bk-co2-float, .theme-contrast [data-baking-theme] .bk-micro-bubble, .theme-contrast [data-baking-theme] .bk-convection, .theme-contrast [data-baking-theme] .bk-steam-drift, .theme-contrast [data-baking-theme] .bk-oven-glow, .theme-contrast [data-baking-theme] .bk-crust-sheen, .theme-contrast [data-baking-theme] .bk-gluten-tensile, .theme-contrast [data-baking-theme] .bk-crosslink-pulse, .theme-contrast [data-baking-theme] .bk-beacon, .theme-contrast [data-baking-theme] .bk-droplet-float, .theme-contrast [data-baking-theme] .bk-lecithin-dash, .theme-contrast [data-baking-theme] .bk-kinetic-trace, .theme-contrast [data-baking-theme] .bk-bar-sheen, .theme-contrast [data-baking-theme] .bk-gel-wave, .theme-contrast [data-baking-theme] .bk-skillet-sheen::after, [data-baking-theme="contrast"] .bk-co2-float, [data-baking-theme="contrast"] .bk-micro-bubble, [data-baking-theme="contrast"] .bk-convection, [data-baking-theme="contrast"] .bk-steam-drift, [data-baking-theme="contrast"] .bk-oven-glow, [data-baking-theme="contrast"] .bk-crust-sheen, [data-baking-theme="contrast"] .bk-gluten-tensile, [data-baking-theme="contrast"] .bk-crosslink-pulse, [data-baking-theme="contrast"] .bk-beacon, [data-baking-theme="contrast"] .bk-droplet-float, [data-baking-theme="contrast"] .bk-lecithin-dash, [data-baking-theme="contrast"] .bk-kinetic-trace, [data-baking-theme="contrast"] .bk-bar-sheen, [data-baking-theme="contrast"] .bk-gel-wave, [data-baking-theme="contrast"] .bk-skillet-sheen::after { animation: none !important; }',
      '.theme-contrast [data-baking-theme] .bk-motion-deco, [data-baking-theme="contrast"] .bk-motion-deco, .theme-contrast [data-baking-theme] .bk-skillet-sheen::after, [data-baking-theme="contrast"] .bk-skillet-sheen::after { opacity: 0 !important; display: none !important; }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.getElementById('allo-live-baking')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-baking';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  if (typeof window === 'undefined') return;
  var _leavTimer = null;

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };

  // ── Sub-tools menu ──
  var SUBTOOLS = [
    { id: 'leavening', icon: '\uD83E\uDED0', label: 'Leavening Lab', desc: 'Mix acids and bases to make bread rise', color: 'amber' },
    { id: 'emulsion', icon: '\uD83E\uDD5A', label: 'Emulsion Mixer', desc: 'Combine oil and water the right way', color: 'yellow' },
    { id: 'scaler', icon: '\uD83D\uDCCF', label: 'Recipe Scaler', desc: 'Baker\u2019s percentages and unit math', color: 'orange' },
    { id: 'oven', icon: '\uD83D\uDD25', label: 'Oven Timeline', desc: 'What happens at each temperature', color: 'rose' },
    { id: 'diagnosis', icon: '\uD83D\uDD0D', label: 'Bake Diagnosis', desc: 'Figure out why a bake went wrong', color: 'pink' },
    { id: 'gluten', icon: '\uD83E\uDDF5', label: 'Gluten Lab', desc: 'See how flour, water, and kneading build the network', color: 'teal' },
    { id: 'browning', icon: '\uD83E\uDD69', label: 'Browning Lab', desc: 'Maillard vs. caramelization head-to-head', color: 'orange' },
    { id: 'caramelHunt', icon: '\uD83C\uDF6F', label: 'Caramel Discovery', desc: 'Discover sugar caramelization stages via open inquiry', color: 'amber' }
  ];

  // ── Browning Lab data ──
  // protein is approx amino-acid reducing-sugar partners; sugars is free/formed sugar content.
  // Both 0-1 relative scale tuned for gameplay.
  var BROWN_FOODS = [
    { id: 'chicken',   label: 'Chicken skin',   emoji: '\uD83C\uDF57', protein: 0.8, sugars: 0.1, rawColor: '#fde4c2', doneColor: '#a0522d', charColor: '#3a1a0a',
      note: 'Protein-rich, low sugar \u2014 Maillard dominates.' },
    { id: 'bread',     label: 'Bread crust',    emoji: '\uD83E\uDD56', protein: 0.5, sugars: 0.3, rawColor: '#f4d8a4', doneColor: '#c68e42', charColor: '#4a240e',
      note: 'Some protein + some sugars \u2014 classic Maillard with a hint of caramel.' },
    { id: 'onion',     label: 'Caramelized onion', emoji: '\uD83E\uDDC5', protein: 0.3, sugars: 0.7, rawColor: '#f9ebc3', doneColor: '#a8551d', charColor: '#4a1a08',
      note: 'Onions release LOTS of natural sugar as they cook \u2014 both reactions team up.' },
    { id: 'sugar',     label: 'Sugar syrup',    emoji: '\uD83C\uDF6F', protein: 0.0, sugars: 1.0, rawColor: '#fef9e7', doneColor: '#b9720d', charColor: '#4a1e04',
      note: 'Pure sugars \u2014 caramelization only, no Maillard at all.' },
    { id: 'tomato',    label: 'Roasted tomato', emoji: '\uD83C\uDF45', protein: 0.2, sugars: 0.5, rawColor: '#f16b5c', doneColor: '#8a2a1a', charColor: '#3a120a',
      note: 'Mostly sugars with a touch of protein \u2014 caramelization-forward.' },
    { id: 'marshmallow', label: 'Marshmallow', emoji: '\uD83C\uDF62', protein: 0.1, sugars: 0.95, rawColor: '#fdfdfd', doneColor: '#c08a48', charColor: '#3e1a08',
      note: 'Sugar + gelatin. The surface dries quickly and caramelizes fast over a flame.' }
  ];
  // Flavor descriptors keyed by dominant reaction
  var MAILLARD_FLAVORS = ['nutty', 'roasted', 'savory', 'umami', 'meaty', 'toasted', 'complex', 'deep'];
  var CARAMEL_FLAVORS  = ['sweet', 'buttery', 'caramel', 'candy-like', 'honey', 'amber', 'syrupy', 'rich'];

  // ── Gluten Lab data ──
  var FLOUR_PRESETS = [
    { id: 'cake',        label: 'Cake flour',     protein: 8.0 },
    { id: 'pastry',      label: 'Pastry flour',   protein: 9.0 },
    { id: 'ap',          label: 'All-purpose',    protein: 11.0 },
    { id: 'bread',       label: 'Bread flour',    protein: 13.0 },
    { id: 'high_gluten', label: 'High-gluten',    protein: 14.5 }
  ];
  // Realistic target recipes for the Gluten Lab "match" button
  var GLUTEN_TARGETS = [
    { id: 'pie',     label: 'Pie crust',           protein: 9,    hydration: 45, knead: 0,  note: 'Barely touched. Cold fat = flakes.' },
    { id: 'pancake', label: 'Pancakes',            protein: 11,   hydration: 100, knead: 1,  note: 'Lumpy is fine. Don\u2019t develop gluten.' },
    { id: 'cake',    label: 'Layer cake',          protein: 8,    hydration: 60, knead: 2,  note: 'Tender crumb — low protein, gentle mix.' },
    { id: 'bread',   label: 'Artisan bread',       protein: 13,   hydration: 70, knead: 8,  note: 'Strong network for oven-spring and chew.' },
    { id: 'pizza',   label: 'Pizza dough',         protein: 13,   hydration: 65, knead: 10, note: 'Elastic enough to stretch without tearing.' },
    { id: 'noodle',  label: 'Hand-pulled noodle',  protein: 14.5, hydration: 50, knead: 14, note: 'Long knead + high protein = pull-without-break.' }
  ];

  // ── Bake Diagnosis scenarios ──
  // Each scenario has a symptom, 4 possible causes (1 correct), and an explanation per option.
  // `tag` tracks which activity's concepts apply, for teaching connections.
  var DIAGNOSIS_SCENARIOS = [
    {
      id: 'flat_cookies',
      symptom: 'My cookies spread way too thin and flat.',
      tag: 'oven',
      options: [
        { id: 'warm_butter',    text: 'The butter was too soft or partially melted', correct: true,
          explain: 'Right! Butter needs to be cool enough to hold structure. Soft butter spreads before the flour has time to set.' },
        { id: 'too_much_flour', text: 'Too much flour', correct: false,
          explain: 'Extra flour would make cookies thicker and drier, not flatter.' },
        { id: 'old_baking_soda', text: 'The baking soda was expired', correct: false,
          explain: 'Old leavener makes cookies flat AND dense. Warm butter is the more common cause of spread.' },
        { id: 'wrong_pan',      text: 'Wrong pan material', correct: false,
          explain: 'Dark pans brown faster, but they don\u2019t cause dramatic spreading on their own.' }
      ]
    },
    {
      id: 'bread_no_rise',
      symptom: 'I mixed bread dough but it barely rose after 2 hours.',
      tag: 'leavening',
      options: [
        { id: 'hot_water',  text: 'The water was too hot and killed the yeast', correct: true,
          explain: 'Yes! Yeast dies above about 140\u00B0F. Warm (not hot) water \u2014 around 100-110\u00B0F \u2014 keeps it alive and active.' },
        { id: 'too_salty',  text: 'Too much salt', correct: false,
          explain: 'Salt does slow yeast, but rarely stops rise completely unless you really overdid it.' },
        { id: 'wrong_flour', text: 'Used cake flour instead of bread flour', correct: false,
          explain: 'Low-protein flour gives weaker dough, but yeast still makes it rise.' },
        { id: 'cold_kitchen', text: 'The kitchen was too cold', correct: false,
          explain: 'Cold slows yeast but wouldn\u2019t halt it. Dead yeast is the likelier culprit here.' }
      ]
    },
    {
      id: 'dense_cake',
      symptom: 'My cake came out dense, rubbery, and chewy.',
      tag: 'scaler',
      options: [
        { id: 'overmixed', text: 'Over-mixed the batter \u2014 gluten developed', correct: true,
          explain: 'Exactly. Stirring flour and liquid too long builds gluten strands. Great for bread, terrible for cake.' },
        { id: 'too_hot_oven', text: 'Oven was too hot', correct: false,
          explain: 'A too-hot oven browns the top too fast but doesn\u2019t usually make cake rubbery throughout.' },
        { id: 'wrong_pan', text: 'Used the wrong size pan', correct: false,
          explain: 'Small pan means tall dense cake, but texture would still be cakey \u2014 rubbery points to gluten.' },
        { id: 'expired_powder', text: 'Baking powder expired', correct: false,
          explain: 'Old leavener makes cake dense, but not rubbery. Rubbery = gluten.' }
      ]
    },
    {
      id: 'custard_curdled',
      symptom: 'My custard split into watery liquid with lumps of scrambled egg.',
      tag: 'oven',
      options: [
        { id: 'too_hot', text: 'Heated the eggs too fast above 180\u00B0F', correct: true,
          explain: 'Correct. Egg proteins start setting around 160\u00B0F and curdle above ~180\u00B0F. Low, slow heat keeps custard smooth.' },
        { id: 'not_enough_sugar', text: 'Not enough sugar', correct: false,
          explain: 'Sugar helps delay protein set slightly, but temperature is the dominant factor.' },
        { id: 'old_milk', text: 'The milk was old', correct: false,
          explain: 'Old milk affects flavor, not the physics of egg denaturation.' },
        { id: 'wrong_pan', text: 'Wrong pan size', correct: false,
          explain: 'Unrelated. Pan size influences cook time, not the curdling mechanism.' }
      ]
    },
    {
      id: 'mayo_broke',
      symptom: 'I tried to make mayonnaise but it split into oil and watery stuff.',
      tag: 'emulsion',
      options: [
        { id: 'oil_too_fast', text: 'Added the oil too fast for the yolks to emulsify', correct: true,
          explain: 'Exactly. Lecithin in the yolk can only coat oil one tiny droplet at a time. A steady slow drizzle is the rule.' },
        { id: 'cold_yolks', text: 'Yolks straight from the fridge', correct: false,
          explain: 'Room-temp yolks help, but speed is the usual offender. Cold yolks alone rarely break a mayo.' },
        { id: 'wrong_vinegar', text: 'Used the wrong vinegar', correct: false,
          explain: 'Vinegar type changes flavor, not emulsion stability.' },
        { id: 'salt', text: 'Added salt too early', correct: false,
          explain: 'Salt timing is a flavor question, not a structure one.' }
      ]
    },
    {
      id: 'tough_pancakes',
      symptom: 'My pancakes are tough and chewy instead of fluffy.',
      tag: 'scaler',
      options: [
        { id: 'overmixed', text: 'Whisked the batter until perfectly smooth', correct: true,
          explain: 'Yes \u2014 pancake batter should have lumps! Whisking smooth develops gluten and makes them tough. Mix just until combined.' },
        { id: 'too_much_milk', text: 'Too much milk', correct: false,
          explain: 'More liquid makes thinner pancakes, not tougher ones.' },
        { id: 'pan_too_cold', text: 'Cold pan', correct: false,
          explain: 'Cold pan gives pale pancakes, but not tough ones.' },
        { id: 'no_sugar', text: 'Forgot the sugar', correct: false,
          explain: 'Sugar affects flavor and browning, not toughness.' }
      ]
    },
    {
      id: 'huge_holes',
      symptom: 'My sourdough has a few gigantic holes instead of an even crumb.',
      tag: 'leavening',
      options: [
        { id: 'overproofed', text: 'Over-proofed \u2014 fermented too long', correct: true,
          explain: 'Right. When dough over-ferments, weaker gluten pockets balloon into huge holes while the rest stays tight.' },
        { id: 'wrong_flour', text: 'Wrong kind of flour', correct: false,
          explain: 'Flour type shifts crumb, but "a few giant holes" usually points to over-proofing.' },
        { id: 'too_much_salt', text: 'Too much salt', correct: false,
          explain: 'Salt slows fermentation \u2014 more salt would give a tighter crumb, not huge holes.' },
        { id: 'oven_too_cold', text: 'Oven too cold', correct: false,
          explain: 'Cold oven means pale, dense loaf. Giant holes are a proof issue.' }
      ]
    },
    {
      id: 'cake_peak',
      symptom: 'My cake rose into a pointed peak in the middle with cracks.',
      tag: 'oven',
      options: [
        { id: 'too_hot', text: 'Oven was too hot for the batter', correct: true,
          explain: 'Yes. The top set into a crust before the middle finished rising, so steam forced through the center.' },
        { id: 'too_much_liquid', text: 'Too much liquid', correct: false,
          explain: 'Too much liquid gives a wet, sunken cake \u2014 not a peak.' },
        { id: 'wrong_leavener', text: 'Used baking soda instead of powder', correct: false,
          explain: 'Wrong leavener affects rise amount, but peaks are a heat-gradient problem.' },
        { id: 'wrong_pan_material', text: 'Dark metal pan', correct: false,
          explain: 'Dark pans can contribute, but the main driver is oven temp being too high.' }
      ]
    },
    {
      id: 'caramel_burned',
      symptom: 'My caramel turned black and smelled burnt instead of amber.',
      tag: 'oven',
      options: [
        { id: 'heat_too_high', text: 'Heat was too high and passed 400\u00B0F before I pulled it', correct: true,
          explain: 'Correct. Caramelization peaks around 340\u00B0F; past 400\u00B0F sugar pyrolyzes into bitter compounds.' },
        { id: 'stirred_too_much', text: 'Stirred too much', correct: false,
          explain: 'Stirring can cause crystallization, but burn comes from heat/time.' },
        { id: 'wrong_sugar', text: 'Used brown sugar instead of white', correct: false,
          explain: 'Brown sugar caramelizes at a similar point \u2014 it just starts darker.' },
        { id: 'pan_too_small', text: 'Pan too small', correct: false,
          explain: 'Small pan means deeper sugar layer, but the core issue is temperature.' }
      ]
    },
    {
      id: 'cakey_brownies',
      symptom: 'My brownies came out cakey and airy instead of fudgy and dense.',
      tag: 'scaler',
      options: [
        { id: 'too_much_leavener', text: 'Added baking powder or too much air to the eggs', correct: true,
          explain: 'Right. Fudgy brownies rely on a high fat-to-flour ratio and barely any lift. Extra leavener or whipped eggs create cakey brownies.' },
        { id: 'too_much_butter', text: 'Too much butter', correct: false,
          explain: 'Extra fat would make them fudgier, not cakier.' },
        { id: 'underbaked', text: 'Underbaked', correct: false,
          explain: 'Underbaked brownies are gooey, not cakey.' },
        { id: 'wrong_chocolate', text: 'Used milk chocolate', correct: false,
          explain: 'Chocolate type changes flavor/sweetness, not rise and crumb structure.' }
      ]
    },
    {
      id: 'souffle_collapsed',
      symptom: 'My soufflé rose beautifully then collapsed the moment I opened the oven.',
      tag: 'oven',
      options: [
        { id: 'opened_too_early', text: 'Opened the oven before the structure set', correct: true,
          explain: 'Yes. A soufflé needs egg proteins to fully denature (around 160\u00B0F+ throughout). Cold air + a jolt makes it deflate.' },
        { id: 'under_whipped', text: 'Whites under-whipped', correct: false,
          explain: 'Under-whipping would give a flat soufflé from the start \u2014 not a late collapse.' },
        { id: 'too_hot', text: 'Oven was too hot', correct: false,
          explain: 'Hot ovens can cause over-browning but a soufflé that rose well and then fell is usually an opening/draft problem.' },
        { id: 'wrong_dish', text: 'Wrong ramekin size', correct: false,
          explain: 'Dish size affects height, not collapse timing.' }
      ]
    },
    {
      id: 'cookies_puffy',
      symptom: 'My cookies came out puffy, pale, and under-spread.',
      tag: 'oven',
      options: [
        { id: 'butter_too_cold', text: 'Butter was too cold / used melted butter then chilled', correct: true,
          explain: 'Correct. Cold, firm butter holds its shape in the oven, so cookies stay puffy instead of spreading.' },
        { id: 'not_enough_sugar', text: 'Not enough sugar', correct: false,
          explain: 'Low sugar means less spread, but also less browning \u2014 butter temp is the usual first suspect.' },
        { id: 'expired_powder', text: 'Baking powder expired', correct: false,
          explain: 'That would usually make cookies flat, not puffy.' },
        { id: 'too_much_egg', text: 'Too much egg', correct: false,
          explain: 'Extra egg gives a cakier cookie, not a noticeably puffier one.' }
      ]
    }
  ];

  // Every authored scenario listed its correct diagnosis FIRST and the panel
  // renders authored order — "always pick the first option" won the whole
  // game. Grading uses the `correct` flag, so a deterministic rotation
  // (stable across renders) is safe with no index remapping.
  (function () {
    DIAGNOSIS_SCENARIOS.forEach(function (scenario, i) {
      var len = scenario.options.length;
      var shift = (i * 7 + 3) % len;
      if (shift) scenario.options = scenario.options.slice(shift).concat(scenario.options.slice(0, shift));
    });
  })();

  // ═══════════════════════════════════════════
  // SCIENCE DATA
  // ═══════════════════════════════════════════

  // Leavening ingredients. `acidStrength` is a unitless scale 0-10 for gameplay.
  // `pairsWith` indicates whether an acid needs a base (or a complete base that includes its own acid).
  var ACIDS = [
    { id: 'buttermilk', name: 'Buttermilk', emoji: '\uD83E\uDD5B', strength: 3, notes: 'Mild tang. Adds moisture and flavor.' },
    { id: 'lemon',      name: 'Lemon juice', emoji: '\uD83C\uDF4B', strength: 7, notes: 'Citric acid. Bright flavor.' },
    { id: 'vinegar',    name: 'Vinegar', emoji: '\uD83E\uDED9', strength: 8, notes: 'Acetic acid. Use sparingly.' },
    { id: 'yogurt',     name: 'Yogurt', emoji: '\uD83C\uDF66', strength: 4, notes: 'Lactic acid. Rich texture.' },
    { id: 'cocoa',      name: 'Natural cocoa', emoji: '\uD83C\uDF6B', strength: 2, notes: 'Mildly acidic.' },
    { id: 'molasses',   name: 'Molasses', emoji: '\uD83C\uDFFA', strength: 3, notes: 'Acidic + sweet.' },
    { id: 'cream_tartar', name: 'Cream of tartar', emoji: '\uD83E\uDDC2', strength: 9, notes: 'Very acidic powder.' },
    { id: 'none_acid',  name: '\u2014 no acid \u2014', emoji: '\uD83D\uDEAB', strength: 0, notes: 'No acid added.' }
  ];
  var BASES = [
    { id: 'baking_soda',   name: 'Baking soda', emoji: '\u2B1C', complete: false, strength: 10, notes: 'Needs an acid to make CO\u2082.' },
    { id: 'baking_powder', name: 'Baking powder', emoji: '\uD83E\uDD82', complete: true,  strength: 6,  notes: 'Has acid built in. Works alone.' },
    { id: 'yeast',         name: 'Yeast', emoji: '\uD83E\uDDEB', complete: true,  strength: 7,  notes: 'Living organism. Makes CO\u2082 slowly.' }
  ];

  // Emulsion scenarios
  var EMULSION_GOALS = [
    { id: 'vinaigrette', label: 'Salad vinaigrette', target: { oil: 75, water: 22, yolk: 3 }, tolerance: 12, explain: 'Classic 3:1 oil-to-vinegar with a pinch of mustard. Mustard has natural emulsifier.' },
    { id: 'mayo',        label: 'Mayonnaise',       target: { oil: 80, water: 6,  yolk: 14 }, tolerance: 10, explain: 'Mostly oil, lots of yolk. Lecithin in yolk coats tiny oil droplets.' },
    { id: 'hollandaise', label: 'Hollandaise',      target: { oil: 60, water: 15, yolk: 25 }, tolerance: 10, explain: 'Warm butter into yolks slowly. Heat helps yolk proteins hold everything together.' },
    { id: 'cake_batter', label: 'Cake batter',      target: { oil: 35, water: 45, yolk: 20 }, tolerance: 12, explain: 'A cake batter is an emulsion too! Eggs help fat and liquid blend into a smooth mix.' }
  ];

  // Recipe presets. Amounts in grams (flour is the baker\u2019s-percentage anchor = 100%).
  var RECIPE_PRESETS = [
    { id: 'pancakes', label: 'Buttermilk pancakes', serves: 4,
      ingredients: [
        { name: 'Flour',       grams: 240, role: 'flour' },
        { name: 'Buttermilk',  grams: 240, role: 'liquid' },
        { name: 'Egg',         grams: 50,  role: 'egg' },
        { name: 'Sugar',       grams: 15,  role: 'sugar' },
        { name: 'Baking soda', grams: 4,   role: 'leavener' },
        { name: 'Salt',        grams: 4,   role: 'salt' },
        { name: 'Butter',      grams: 30,  role: 'fat' }
      ]
    },
    { id: 'brownies', label: 'Fudge brownies', serves: 9,
      ingredients: [
        { name: 'Flour',       grams: 100, role: 'flour' },
        { name: 'Cocoa',       grams: 50,  role: 'flavor' },
        { name: 'Sugar',       grams: 200, role: 'sugar' },
        { name: 'Butter',      grams: 115, role: 'fat' },
        { name: 'Egg',         grams: 100, role: 'egg' },
        { name: 'Vanilla',     grams: 5,   role: 'flavor' },
        { name: 'Salt',        grams: 2,   role: 'salt' }
      ]
    },
    { id: 'sourdough', label: 'Simple sourdough', serves: 1,
      ingredients: [
        { name: 'Bread flour', grams: 500, role: 'flour' },
        { name: 'Water',       grams: 375, role: 'liquid' },
        { name: 'Sourdough starter', grams: 100, role: 'leavener' },
        { name: 'Salt',        grams: 10,  role: 'salt' }
      ]
    },
    { id: 'cookies', label: 'Chocolate chip cookies', serves: 24,
      ingredients: [
        { name: 'Flour',       grams: 280, role: 'flour' },
        { name: 'Butter',      grams: 225, role: 'fat' },
        { name: 'Brown sugar', grams: 150, role: 'sugar' },
        { name: 'White sugar', grams: 100, role: 'sugar' },
        { name: 'Egg',         grams: 100, role: 'egg' },
        { name: 'Baking soda', grams: 4,   role: 'leavener' },
        { name: 'Salt',        grams: 4,   role: 'salt' },
        { name: 'Chocolate chips', grams: 200, role: 'flavor' }
      ]
    }
  ];

  // Oven timeline events. Temperatures in °F.
  var OVEN_EVENTS = [
    { temp: 90,  label: 'Butter melts',          emoji: '\uD83E\uDDC8', body: 'Solid fat becomes liquid, releasing trapped air. Lower-melt fats = softer cookies.' },
    { temp: 140, label: 'Yeast dies',            emoji: '\uD83E\uDDEB', body: 'Yeast can\u2019t survive here. Any remaining rise comes from steam and CO\u2082 already trapped.' },
    { temp: 160, label: 'Egg proteins set',      emoji: '\uD83E\uDD5A', body: 'Albumen denatures and forms a network. This is what makes custards thicken and cakes hold shape.' },
    { temp: 180, label: 'Starch gelatinizes',    emoji: '\uD83C\uDF3E', body: 'Flour starches absorb water and swell. The batter turns from a liquid into a sponge.' },
    { temp: 212, label: 'Water boils (steam)',   emoji: '\uD83D\uDCA8', body: 'Steam puffs doughs up \u2014 huge source of oven-spring in bread and pastry.' },
    { temp: 285, label: 'Sugar dissolves fully', emoji: '\uD83C\uDF6C', body: 'Any remaining sugar crystals melt into the mix. Edges start to firm up.' },
    { temp: 310, label: 'Maillard browning',     emoji: '\uD83E\uDD69', body: 'Sugars and amino acids meet on the surface. This is where golden crust + rich flavor come from.' },
    { temp: 340, label: 'Caramelization',        emoji: '\uD83C\uDF6F', body: 'Pure sugars break down into hundreds of new flavor molecules. Darker, deeper, sweeter.' },
    { temp: 400, label: 'Burn zone',             emoji: '\u26A0\uFE0F', body: 'Proteins and sugars pyrolyze \u2014 bitter, acrid flavors. Pull the tray before you hit this.' }
  ];

  // ═══════════════════════════════════════════
  // REGISTER TOOL
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('bakingScience', {
    icon: '\uD83E\uDD50', label: 'Baking Lab',
    desc: 'Explore the chemistry, ratios, and heat science that make baking work',
    color: 'amber', category: 'science',
    gradeRange: '4-10',
    questHooks: [
      { id: 'bk_explain_browning', label: 'Explain what controls browning, in your own words', icon: '💡',
        check: function (d) { var iq = (d && d.caramelHunt) || {}; return !!iq.understood && typeof iq.explanation === 'string' && iq.explanation.trim().length >= 40; },
        progress: function (d) { var iq = (d && d.caramelHunt) || {}; return iq.understood ? (((iq.explanation || '').trim().length >= 40) ? 'Explained' : 'Say more') : 'Open the Browning Lab inquiry'; } },
      { id: 'leaven_5',  label: 'Run 5 leavening reactions', icon: '\uD83E\uDED0', check: function(d) { var e = d._bakingExt || {}; return (e.leaveningRuns || 0) >= 5; }, progress: function(d) { var e = d._bakingExt || {}; return (e.leaveningRuns || 0) + '/5'; } },
      { id: 'emul_3',    label: 'Stabilize 3 emulsions',     icon: '\uD83E\uDD5A', check: function(d) { var e = d._bakingExt || {}; return (e.emulsionsSolved || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.emulsionsSolved || 0) + '/3'; } },
      { id: 'scale_3',   label: 'Scale 3 different recipes', icon: '\uD83D\uDCCF', check: function(d) { var e = d._bakingExt || {}; return (e.recipesScaled || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.recipesScaled || 0) + '/3'; } },
      { id: 'oven_all',  label: 'Discover every oven event', icon: '\uD83D\uDD25', check: function(d) { var e = d._bakingExt || {}; return (e.ovenEventsFound || []).length >= OVEN_EVENTS.length; }, progress: function(d) { var e = d._bakingExt || {}; return ((e.ovenEventsFound || []).length) + '/' + OVEN_EVENTS.length; } },
      { id: 'diag_5',    label: 'Diagnose 5 bakes correctly', icon: '\uD83D\uDD0D', check: function(d) { var e = d._bakingExt || {}; return (e.diagnosesCorrect || 0) >= 5; }, progress: function(d) { var e = d._bakingExt || {}; return (e.diagnosesCorrect || 0) + '/5'; } },
      { id: 'gluten_3',  label: 'Match 3 gluten targets', icon: '\uD83E\uDDF5', check: function(d) { var e = d._bakingExt || {}; return (e.glutenMatches || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.glutenMatches || 0) + '/3'; } },
      { id: 'brown_3',   label: 'Brown 3 foods to golden perfection', icon: '\uD83E\uDD69', check: function(d) { var e = d._bakingExt || {}; return (e.browningPerfections || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.browningPerfections || 0) + '/3'; } }
    ],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var themeSurface = isContrast ? '#000000' : (isDark ? '#0f172a' : '#fffdf8');
      var themeCard = isContrast ? '#000000' : (isDark ? '#1e293b' : '#ffffff');
      var themeSubtle = isContrast ? '#0a0a0a' : (isDark ? '#172033' : '#fffbeb');
      var themeInk = isContrast ? '#ffff00' : (isDark ? '#f8fafc' : '#1e1b18');
      var themeMuted = isContrast ? '#fde047' : (isDark ? '#cbd5e1' : '#57534e');
      var themeBorder = isContrast ? '#ffff00' : (isDark ? '#334155' : '#fed7aa');
      var themeAccent = isContrast ? '#00ff00' : (isDark ? '#f59e0b' : '#b45309');
      var cardSurfaceStyle = { background: themeCard, color: themeInk, borderColor: themeBorder };
      var rootCardStyle = { background: themeSurface, color: themeInk, borderRadius: 16 };
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var announceToSR = ctx.announceToSR;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var _aiUsable = ctx.aiAvailable !== false && typeof ctx.callGemini === 'function' && !ctx.callGemini._alloQrBlocked && !(typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true));
      var callGemini = _aiUsable ? ctx.callGemini : null;
      var band = getGradeBand(ctx);
      // i18n helper: {var} tokens are substituted; falls back to English if key is missing.
      var t = function(key, vars) {
          var raw = (ctx.t && ctx.t(key)) || '';
          if (!raw || raw === key) return '';
          if (!vars) return raw;
          return raw.replace(/\{(\w+)\}/g, function(m, k) { return vars[k] != null ? vars[k] : m; });
      };
      var tr = function(key, fallback, vars) {
          var v = t(key, vars);
          return v || fallback;
      };

      return (function() {
        var d = (labToolData && labToolData.bakingScience) || {};

        var upd = function(key, val) {
          if (typeof setLabToolData !== 'function') return;
          setLabToolData(function(prev) {
            var base = (prev && typeof prev === 'object') ? prev : {};
            var cb = Object.assign({}, base.bakingScience || {});
            cb[key] = val;
            return Object.assign({}, base, { bakingScience: cb });
          });
        };
        var updMulti = function(obj) {
          if (typeof setLabToolData !== 'function') return;
          setLabToolData(function(prev) {
            var base = (prev && typeof prev === 'object') ? prev : {};
            var cb = Object.assign({}, base.bakingScience || {}, obj);
            return Object.assign({}, base, { bakingScience: cb });
          });
        };

        var ext = d._bakingExt || { leaveningRuns: 0, emulsionsSolved: 0, recipesScaled: 0, ovenEventsFound: [], diagnosesCorrect: 0, diagnosesAttempted: 0, diagStreak: 0, diagBestStreak: 0, glutenMatches: 0, glutenExplorations: 0, browningPerfections: 0, browningAttempts: 0, badges: [] };
        var updExt = function(obj) {
          var merged = Object.assign({}, ext, obj);
          upd('_bakingExt', merged);
          ext = merged;
        };

        var subtool = d.subtool || 'menu';

        // ─── SOUND EFFECTS (small, optional) ───
        var playBeep = function(type) {
          try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            var a = window.__alloBakingAudioCtx;
            if (!a || a.state === 'closed') {
              a = new AC();
              window.__alloBakingAudioCtx = a;
            } else if (a.state === 'suspended' && typeof a.resume === 'function') {
              a.resume().catch(function() {});
            }
            var o = a.createOscillator();
            var g = a.createGain();
            o.connect(g); g.connect(a.destination);
            var freqs = { bubble:[660,0.15], fizz:[880,0.2], success:[988,0.25], fail:[180,0.2], click:[520,0.06], pour:[440,0.1] };
            var f = freqs[type] || [440, 0.1];
            o.frequency.value = f[0];
            g.gain.value = 0.1;
            o.type = type === 'fail' ? 'sawtooth' : 'sine';
            o.start();
            g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + f[1]);
            o.stop(a.currentTime + f[1] + 0.01);
          } catch(e) {}
        };

        // ═══════════════════════════════════════
        // MENU SCREEN
        // ═══════════════════════════════════════
        // Map subtool ids to i18n keys for their menu labels/descriptions
        var subtoolI18n = {
          leavening: { label: 'baking.activities.leavening_label', desc: 'baking.activities.leavening_desc' },
          emulsion:  { label: 'baking.activities.emulsion_label',  desc: 'baking.activities.emulsion_desc'  },
          scaler:    { label: 'baking.activities.scaler_label',    desc: 'baking.activities.scaler_desc'    },
          oven:      { label: 'baking.activities.oven_label',      desc: 'baking.activities.oven_desc'      },
          diagnosis: { label: 'baking.activities.diagnosis_label', desc: 'baking.activities.diagnosis_desc' },
          gluten:    { label: 'baking.activities.gluten_label',    desc: 'baking.activities.gluten_desc'    },
          browning:  { label: 'baking.activities.browning_label',  desc: 'baking.activities.browning_desc'  },
          caramelHunt: { label: 'baking.activities.caramel_label', desc: 'baking.activities.caramel_desc' }
        };
        var subtoolLabel = function(st) { return tr((subtoolI18n[st.id] || {}).label, st.label); };
        var subtoolDesc  = function(st) { return tr((subtoolI18n[st.id] || {}).desc,  st.desc ); };

        // Shared quick-switch workbench bar for hopping between sub-tools without losing flow
        var renderSubtoolNav = function(activeId) {
          var selectSubtoolTab = function(nextIdx) {
            var next = SUBTOOLS[nextIdx];
            if (!next) return;
            var nextLabel = subtoolLabel(next);
            upd('subtool', next.id);
            announceToSR && announceToSR('Switched to ' + nextLabel);
            playBeep('click');
            if (typeof document !== 'undefined') {
              setTimeout(function() {
                var el = document.getElementById('baking-tab-' + next.id);
                if (el && typeof el.focus === 'function') el.focus();
              }, 0);
            }
          };
          return h('div', {
            className: 'mb-4 flex items-center gap-1.5 flex-wrap pb-3 border-b',
            style: { borderColor: themeBorder },
            role: 'tablist',
            'aria-label': tr('baking.nav_aria', 'Baking Lab stations')
          },
            SUBTOOLS.map(function(st, i) {
              var active = st.id === activeId;
              var label = subtoolLabel(st);
              return h('button', {
                key: st.id,
                id: 'baking-tab-' + st.id,
                type: 'button',
                role: 'tab',
                tabIndex: active ? 0 : -1,
                'aria-selected': active,
                'aria-controls': 'baking-panel-' + st.id,
                onClick: function() { upd('subtool', st.id); announceToSR && announceToSR('Switched to ' + label); playBeep('click'); },
                onKeyDown: function(e) {
                  var k = e.key;
                  if (k === 'ArrowRight' || k === 'ArrowDown') {
                    e.preventDefault();
                    selectSubtoolTab((i + 1) % SUBTOOLS.length);
                  } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
                    e.preventDefault();
                    selectSubtoolTab((i - 1 + SUBTOOLS.length) % SUBTOOLS.length);
                  } else if (k === 'Home') {
                    e.preventDefault();
                    selectSubtoolTab(0);
                  } else if (k === 'End') {
                    e.preventDefault();
                    selectSubtoolTab(SUBTOOLS.length - 1);
                  }
                },
                className: 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border',
                style: active
                  ? {
                      background: isContrast ? '#000000' : (isDark ? '#b45309' : '#9a3412'),
                      color: isContrast ? '#00ff00' : '#ffffff',
                      borderColor: isContrast ? '#ffff00' : (isDark ? '#fbbf24' : '#9a3412'),
                      boxShadow: isContrast ? 'none' : '0 2px 6px rgba(154,52,18,0.22)'
                    }
                  : {
                      background: themeCard,
                      color: themeInk,
                      borderColor: themeBorder
                    }
              },
                h('span', { 'aria-hidden': true }, st.icon),
                h('span', null, label),
                h('span', {
                  className: 'text-[0.625rem] opacity-75 font-mono',
                  'aria-hidden': true
                }, String(i + 1))
              );
            })
          );
        };

        var renderMenu = function() {
          var bakeRoutes = ['leavening', 'emulsion', 'scaler', 'browning'].map(function(id) {
            return SUBTOOLS.find(function(st) { return st.id === id; });
          }).filter(Boolean);
          var totalBenchActions = (ext.leaveningRuns || 0) + (ext.emulsionsSolved || 0) + (ext.recipesScaled || 0) + (ext.ovenEventsFound || []).length + (ext.diagnosesCorrect || 0) + (ext.glutenMatches || 0) + (ext.browningPerfections || 0);
          var masteryPct = Math.min(100, Math.round((totalBenchActions / 18) * 100));
          return h('div', { className: 'p-4 sm:p-6 max-w-5xl mx-auto', style: rootCardStyle, 'data-baking-tool': 'true' },
            // Bespoke Culinary Chemistry Hero Workbench Header
            h('section', {
              'data-baking-kitchen-bench': 'true',
              className: 'mb-6 rounded-2xl border p-5 shadow-lg',
              style: isContrast
                ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00', borderWidth: '2px' }
                : { background: 'linear-gradient(135deg, #431407 0%, #7c2d12 48%, #1c1917 100%)', color: '#fffbeb', borderColor: '#b45309' }
            },
              h('div', { className: 'grid gap-4 lg:grid-cols-[1.35fr_0.65fr] items-center' },
                h('div', { style: { minWidth: 0 } },
                  h('div', { className: 'flex items-center gap-2 flex-wrap mb-2' },
                    h('span', {
                      className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-black uppercase tracking-wider border',
                      style: isContrast
                        ? { background: '#000000', color: '#00ff00', borderColor: '#00ff00' }
                        : { background: 'rgba(251,191,36,0.18)', color: '#fde68a', borderColor: 'rgba(251,191,36,0.45)' }
                    }, '\uD83E\uDD50 ' + tr('baking.subject_badge', 'Food Science \u00B7 Culinary Lab')),
                    h('span', {
                      className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold border',
                      style: isContrast
                        ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                        : { background: 'rgba(255,255,255,0.1)', color: '#fef3c7', borderColor: 'rgba(255,255,255,0.2)' }
                    }, tr('baking.stations_pill', '{n} Interactive Stations', { n: SUBTOOLS.length })),
                    h('span', {
                      className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold tabular-nums border',
                      style: isContrast
                        ? { background: '#000000', color: '#00ff00', borderColor: '#00ff00' }
                        : { background: 'rgba(16,185,129,0.2)', color: '#a7f3d0', borderColor: 'rgba(52,211,153,0.4)' }
                    }, tr('baking.mastery_pill', 'Lab Mastery {p}%', { p: masteryPct }))
                  ),
                  h('h2', { className: 'text-2xl sm:text-3xl font-black leading-tight', style: { color: isContrast ? '#ffff00' : '#ffffff' } },
                    tr('baking.title', 'Baking Lab') + ' \u2014 ' + tr('baking.kitchen_bench_title', 'Start with a visible reaction')
                  ),
                  h('p', { className: 'mt-1.5 mb-4 text-xs sm:text-sm leading-relaxed max-w-2xl', style: { color: isContrast ? '#fde047' : '#fef3c7' } },
                    tr('baking.subtitle', 'Baking is chemistry, physics, and math you can taste. Pick a hands-on bench station below to investigate CO\u2082 rise, emulsions, baker\u2019s percentages, gluten networks, and thermal browning.')
                  ),
                  h('div', { className: 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4' },
                    bakeRoutes.map(function(st) {
                      var label = subtoolLabel(st);
                      return h('button', {
                        key: st.id,
                        type: 'button',
                        onClick: function() { upd('subtool', st.id); announceToSR && announceToSR('Opening ' + label); playBeep('click'); },
                        className: 'min-h-[78px] rounded-xl border p-3 text-left transition cursor-pointer active:scale-[0.99]',
                        style: isContrast
                          ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                          : { background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(253,230,138,0.28)' }
                      },
                        h('div', { className: 'text-lg mb-0.5', 'aria-hidden': true }, st.icon),
                        h('div', { className: 'text-xs font-black' }, label),
                        h('div', { className: 'mt-0.5 text-[0.6875rem] leading-snug', style: { color: isContrast ? '#fde047' : '#fde68a' } }, subtoolDesc(st))
                      );
                    })
                  )
                ),
                // Bespoke Culinary Chemistry SVG Workbench Schematic + Telemetry
                h('div', { className: 'space-y-2.5', style: { minWidth: 0 } },
                  h('div', {
                    className: 'rounded-xl border p-2',
                    style: isContrast
                      ? { background: '#000000', borderColor: '#ffff00' }
                      : { background: 'rgba(12,10,9,0.55)', borderColor: 'rgba(251,191,36,0.35)' }
                  },
                    h('svg', {
                      viewBox: '0 0 280 116',
                      width: '100%',
                      role: 'img',
                      'aria-label': tr('baking.hero_svg_aria', 'Culinary chemistry diagram showing rising dough crumb, CO2 bubbles, and thermal browning curve')
                    },
                      h('defs', null,
                        h('radialGradient', { id: 'bkHeroOvenGlow', cx: '34%', cy: '36%', r: '58%' },
                          h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#f59e0b', stopOpacity: isContrast ? 0 : 0.34 }),
                          h('stop', { offset: '60%', stopColor: isContrast ? '#000000' : '#ea580c', stopOpacity: isContrast ? 0 : 0.1 }),
                          h('stop', { offset: '100%', stopColor: '#1c1917', stopOpacity: 0 })
                        ),
                        h('linearGradient', { id: 'bkLoafCrust', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: isContrast ? '#ffff00' : '#f59e0b' }),
                          h('stop', { offset: '48%', stopColor: isContrast ? '#ffff00' : '#b45309' }),
                          h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#451a03' })
                        ),
                        h('radialGradient', { id: 'bkCrumbGrad', cx: '50%', cy: '38%', r: '62%' },
                          h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#fffbeb' }),
                          h('stop', { offset: '65%', stopColor: isContrast ? '#000000' : '#fde68a' }),
                          h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#f59e0b' })
                        ),
                        h('radialGradient', { id: 'bkAlveoli', cx: '34%', cy: '30%', r: '70%' },
                          h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.72 }),
                          h('stop', { offset: '55%', stopColor: '#d97706', stopOpacity: 0.36 }),
                          h('stop', { offset: '100%', stopColor: '#92400e', stopOpacity: 0.55 })
                        ),
                        !isContrast && h('linearGradient', { id: 'bkHeroSheen', x1: '0', y1: '0', x2: '1', y2: '0' },
                          h('stop', { offset: '0%', stopColor: '#fef3c7', stopOpacity: 0 }),
                          h('stop', { offset: '50%', stopColor: '#fef3c7', stopOpacity: 0.55 }),
                          h('stop', { offset: '100%', stopColor: '#fef3c7', stopOpacity: 0 })
                        ),
                        !isContrast && h('clipPath', { id: 'bkHeroLoafClip' },
                          h('path', { d: 'M 30 90 C 30 44, 152 44, 152 90 Z' })
                        )
                      ),
                      // Oven chamber backdrop + warm radiative glow
                      h('rect', { x: 8, y: 8, width: 264, height: 100, rx: 10, fill: isContrast ? '#000000' : '#1c1917', stroke: isContrast ? '#ffff00' : '#78350f', strokeWidth: 1.5 }),
                      !isContrast && h('rect', { x: 9, y: 9, width: 262, height: 98, rx: 9, fill: 'url(#bkHeroOvenGlow)', className: 'bk-oven-glow bk-motion-deco' }),
                      // Subtle animated convection streamlines inside oven chamber
                      !isContrast && h('g', { fill: 'none', stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.32, className: 'bk-convection bk-motion-deco' },
                        h('path', { d: 'M 22 48 Q 36 22, 92 20 Q 148 22, 162 48' }),
                        h('path', { d: 'M 26 66 Q 32 34, 92 30 Q 152 34, 158 66' })
                      ),
                      // Baking deck shelf + loaf contact shadow
                      h('line', { x1: 20, y1: 92, x2: 164, y2: 92, stroke: isContrast ? '#ffff00' : '#a8a29e', strokeWidth: 3, strokeLinecap: 'round' }),
                      !isContrast && h('ellipse', { cx: 91, cy: 91, rx: 64, ry: 3.5, fill: 'rgba(0,0,0,0.45)' }),
                      // Artisan loaf dome & shaded crumb cutaway + golden Maillard crust sheen
                      h('path', { d: 'M 30 90 C 30 44, 152 44, 152 90 Z', fill: 'url(#bkLoafCrust)', stroke: isContrast ? '#ffff00' : '#f59e0b', strokeWidth: 1.5 }),
                      !isContrast && h('g', { clipPath: 'url(#bkHeroLoafClip)', className: 'bk-motion-deco' },
                        h('rect', { x: 46, y: 42, width: 32, height: 50, fill: 'url(#bkHeroSheen)', className: 'bk-crust-sheen' })
                      ),
                      !isContrast && h('path', { d: 'M 48 56 Q 91 46, 134 56', fill: 'none', stroke: '#fef3c7', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.45 }),
                      h('path', { d: 'M 40 88 C 42 56, 140 56, 142 88 Z', fill: 'url(#bkCrumbGrad)', stroke: isContrast ? '#00ff00' : '#d97706', strokeWidth: 1 }),
                      // Glossy CO2 alveoli bubbles inside crumb (buoyant gentle breath)
                      [{ cx: 64, cy: 76, r: 5 }, { cx: 82, cy: 68, r: 6.5 }, { cx: 102, cy: 74, r: 5.5 }, { cx: 120, cy: 78, r: 4 }, { cx: 92, cy: 81, r: 3.5 }].map(function(al, ai) {
                        return h('g', { key: 'al' + ai, className: isContrast ? undefined : 'bk-co2-float', style: isContrast ? undefined : { animationDelay: (ai * 0.48) + 's' } },
                          h('circle', { cx: al.cx, cy: al.cy, r: al.r, fill: isContrast ? '#000000' : 'url(#bkAlveoli)', stroke: isContrast ? '#ffff00' : '#b45309', strokeWidth: 0.6, opacity: isContrast ? 1 : 0.9 }),
                          !isContrast && h('circle', { cx: al.cx - al.r * 0.28, cy: al.cy - al.r * 0.28, r: Math.max(0.9, al.r * 0.24), fill: '#ffffff', opacity: 0.72 })
                        );
                      }),
                      // Rising steam / CO2 wisps
                      h('path', { d: 'M 64 40 Q 60 30, 66 22', fill: 'none', stroke: isContrast ? '#00ff00' : '#fde68a', strokeWidth: 1.6, strokeLinecap: 'round', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0s' } }),
                      h('path', { d: 'M 92 36 Q 88 26, 94 18', fill: 'none', stroke: isContrast ? '#00ff00' : '#fbbf24', strokeWidth: 1.8, strokeLinecap: 'round', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0.65s' } }),
                      h('path', { d: 'M 118 40 Q 114 30, 120 22', fill: 'none', stroke: isContrast ? '#00ff00' : '#fde68a', strokeWidth: 1.6, strokeLinecap: 'round', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '1.25s' } }),
                      // Right telemetry card inside SVG with calibrated pulsing reaction-zone beacons
                      h('rect', { x: 174, y: 18, width: 88, height: 80, rx: 8, fill: isContrast ? '#000000' : '#292524', stroke: isContrast ? '#00ff00' : '#57534e', strokeWidth: 1 }),
                      h('text', { x: 218, y: 34, textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: isContrast ? '#ffff00' : '#fde68a' }, 'LAB REACTIONS'),
                      !isContrast && h('circle', { cx: 181, cy: 48, r: 4.5, fill: '#fbbf24', opacity: 0.3, className: 'bk-beacon bk-motion-deco', style: { animationDelay: '0s' } }),
                      h('circle', { cx: 181, cy: 48, r: 2.3, fill: isContrast ? '#00ff00' : '#fbbf24' }),
                      h('text', { x: 187, y: 51, fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#00ff00' : '#fbbf24' }, 'CO\u2082  212\u00B0F'),
                      !isContrast && h('circle', { cx: 181, cy: 63, r: 4.5, fill: '#fb923c', opacity: 0.3, className: 'bk-beacon bk-motion-deco', style: { animationDelay: '0.7s' } }),
                      h('circle', { cx: 181, cy: 63, r: 2.3, fill: isContrast ? '#ffff00' : '#fb923c' }),
                      h('text', { x: 187, y: 66, fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#ffff00' : '#fb923c' }, 'Maillard 285\u00B0F'),
                      !isContrast && h('circle', { cx: 181, cy: 78, r: 4.5, fill: '#f87171', opacity: 0.3, className: 'bk-beacon bk-motion-deco', style: { animationDelay: '1.4s' } }),
                      h('circle', { cx: 181, cy: 78, r: 2.3, fill: isContrast ? '#00ff00' : '#f87171' }),
                      h('text', { x: 187, y: 81, fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#00ff00' : '#f87171' }, 'Caramel 320\u00B0F'),
                      h('rect', { x: 182, y: 88, width: 72, height: 4, rx: 2, fill: isContrast ? '#333333' : '#44403c' }),
                      h('rect', { x: 182, y: 88, width: Math.max(4, Math.round(72 * (masteryPct / 100))), height: 4, rx: 2, fill: isContrast ? '#00ff00' : '#34d399' })
                    )
                  ),
                  h('div', { className: 'grid grid-cols-2 gap-2' },
                    [
                      { label: tr('baking.stats.reactions', 'Reactions'), value: ext.leaveningRuns || 0 },
                      { label: tr('baking.stats.emulsions', 'Emulsions'), value: ext.emulsionsSolved || 0 },
                      { label: tr('baking.stats.recipes_scaled', 'Recipes scaled'), value: ext.recipesScaled || 0 },
                      { label: tr('baking.stats.brownings', 'Perfect bakes'), value: ext.browningPerfections || 0 }
                    ].map(function(card) {
                      return h('div', {
                        key: card.label,
                        className: 'rounded-xl border p-2.5 text-center',
                        style: isContrast
                          ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                          : { background: 'rgba(12,10,9,0.45)', borderColor: 'rgba(255,255,255,0.14)', color: '#fef3c7' }
                      },
                        h('div', { className: 'text-xl font-black tabular-nums', style: { color: isContrast ? '#00ff00' : '#fde68a' } }, card.value),
                        h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wide', style: { color: isContrast ? '#ffff00' : '#fed7aa' } }, card.label)
                      );
                    })
                  )
                )
              )
            ),
            // Station Catalog Grid
            h('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-3' },
              h('h3', { className: 'text-sm font-black uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#7c2d12') } },
                tr('baking.all_stations_heading', 'All Lab Stations')
              ),
              h('span', { className: 'text-xs font-medium', style: { color: themeMuted } },
                tr('baking.shortcuts_hint', 'Tip: Press keys 1\u20138 to jump directly to any station, or M for menu.')
              )
            ),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' },
              SUBTOOLS.map(function(st, idx) {
                var label = subtoolLabel(st);
                var desc = subtoolDesc(st);
                return h('button', {
                  key: st.id,
                  type: 'button',
                  onClick: function() { upd('subtool', st.id); announceToSR && announceToSR('Opening ' + label); playBeep('click'); },
                  className: 'group text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.99] hover:shadow-md cursor-pointer',
                  style: {
                    background: themeCard,
                    color: themeInk,
                    borderColor: isContrast ? '#ffff00' : (isDark ? '#475569' : '#fed7aa')
                  },
                  'aria-label': 'Open ' + label + ': ' + desc
                },
                  h('div', { className: 'flex items-start gap-3' },
                    h('div', {
                      className: 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border group-hover:scale-105 transition-transform',
                      style: {
                        background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#fff7ed'),
                        borderColor: isContrast ? '#00ff00' : (isDark ? '#475569' : '#fdba74')
                      },
                      'aria-hidden': true
                    }, st.icon),
                    h('div', { className: 'flex-1', style: { minWidth: 0 } },
                      h('div', { className: 'flex items-center justify-between gap-2' },
                        h('div', { className: 'text-base font-black', style: { color: themeInk } }, label),
                        h('span', {
                          className: 'text-[0.6875rem] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0',
                          style: {
                            background: isContrast ? '#000000' : (isDark ? '#334155' : '#ffedd5'),
                            color: isContrast ? '#00ff00' : (isDark ? '#fde68a' : '#9a3412'),
                            borderColor: isContrast ? '#00ff00' : (isDark ? '#475569' : '#fdba74')
                          },
                          'aria-hidden': true
                        }, '#' + (idx + 1))
                      ),
                      h('div', { className: 'text-xs mt-1 leading-relaxed', style: { color: themeMuted } }, desc)
                    )
                  )
                );
              })
            ),
            // Full Lab Progress Strip
            h('div', { className: 'mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2' },
              [
                { val: ext.leaveningRuns || 0, label: tr('baking.stats.reactions', 'Reactions'), accent: '#b45309', darkAccent: '#fbbf24' },
                { val: ext.emulsionsSolved || 0, label: tr('baking.stats.emulsions', 'Emulsions'), accent: '#a16207', darkAccent: '#fde047' },
                { val: ext.recipesScaled || 0, label: tr('baking.stats.recipes_scaled', 'Recipes scaled'), accent: '#c2410c', darkAccent: '#fb923c' },
                { val: (ext.ovenEventsFound || []).length + '/' + OVEN_EVENTS.length, label: tr('baking.stats.oven_events', 'Oven events'), accent: '#be123c', darkAccent: '#fb7185' },
                { val: ext.diagnosesCorrect || 0, label: tr('baking.stats.diagnoses', 'Diagnoses'), accent: '#be185d', darkAccent: '#f472b6' },
                { val: ext.glutenMatches || 0, label: tr('baking.stats.gluten_matches', 'Gluten matches'), accent: '#0f766e', darkAccent: '#2dd4bf' },
                { val: ext.browningPerfections || 0, label: tr('baking.stats.brownings', 'Perfect bakes'), accent: '#c2410c', darkAccent: '#fdba74' }
              ].map(function(stat) {
                return h('div', {
                  key: stat.label,
                  className: 'rounded-xl border p-3 text-center',
                  style: {
                    background: themeCard,
                    borderColor: themeBorder
                  }
                },
                  h('div', {
                    className: 'text-xl font-black tabular-nums',
                    style: { color: isContrast ? '#00ff00' : (isDark ? stat.darkAccent : stat.accent) }
                  }, stat.val),
                  h('div', {
                    className: 'text-[0.6875rem] font-bold uppercase tracking-wide mt-0.5',
                    style: { color: themeMuted }
                  }, stat.label)
                );
              })
            )
          );
        };

        // ═══════════════════════════════════════
        // SHARED: Back button
        // ═══════════════════════════════════════
        var backBtn = function(color) {
          return h('button', {
            type: 'button',
            onClick: function() { upd('subtool', 'menu'); playBeep('click'); },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm cursor-pointer transition-colors',
            style: isContrast
              ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00' }
              : (isDark
                ? { background: '#1e293b', color: '#fde68a', borderColor: '#475569' }
                : { background: '#ffffff', color: '#7c2d12', borderColor: '#fdba74' }),
            'aria-label': tr('baking.back_aria', 'Back to Baking Lab menu')
          }, ArrowLeft ? h(ArrowLeft, { size: 14 }) : '\u2190', ' ' + tr('baking.back', 'Back'));
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 1: LEAVENING LAB
        // ═══════════════════════════════════════
        var renderLeavening = function() {
          var acidId = d.leavAcid || 'buttermilk';
          var baseId = d.leavBase || 'baking_soda';
          var amount = (typeof d.leavAmount === 'number' && isFinite(d.leavAmount)) ? d.leavAmount : 50;
          var acid = ACIDS.filter(function(a) { return a.id === acidId; })[0] || ACIDS[0];
          var base = BASES.filter(function(b) { return b.id === baseId; })[0] || BASES[0];

          // Compute expected CO2 yield (0-100).
          var yieldScore;
          if (base.complete) {
            yieldScore = base.strength + (acid.strength > 0 ? 1 : 0);
          } else {
            yieldScore = (base.strength * acid.strength) / 10;
          }
          yieldScore = yieldScore * (amount / 50);
          yieldScore = Math.max(0, Math.min(12, yieldScore));
          var yieldPct = Math.round((Math.min(10, yieldScore) / 10) * 100);
          var overLeavened = yieldScore > 10.5; // visual flag for too-much leavener

          var running = !!d.leavRunning;

          var explain;
          if (base.id === 'baking_soda' && acid.strength === 0) {
            explain = tr('baking.leavening.explain_soda_no_acid', 'Baking soda needs an acid. With no acid, it just tastes metallic and the dough won\u2019t rise much.');
          } else if (base.id === 'baking_soda') {
            explain = tr('baking.leavening.explain_soda', 'Baking soda (NaHCO\u2083) + ' + acid.name.toLowerCase() + ' \u2192 carbon dioxide gas (CO\u2082). The bubbles get trapped in the dough and make it rise.', { acid: acid.name.toLowerCase() });
          } else if (base.id === 'baking_powder') {
            explain = tr('baking.leavening.explain_powder', 'Baking powder already contains an acid (cream of tartar). Just add water and heat to activate it \u2014 no extra acid needed.');
          } else {
            explain = tr('baking.leavening.explain_yeast', 'Yeast is alive. It eats sugars and breathes out CO\u2082. Slow but powerful \u2014 this is how real bread rises.');
          }

          // Bake verdict — translate % rise to an analogy
          var verdictText;
          if (overLeavened)       verdictText = tr('baking.leavening.verdict_over',   'Over-leavened \u2014 will collapse as it cools.');
          else if (yieldPct < 10) verdictText = tr('baking.leavening.verdict_flat',   'Flat and dense \u2014 more like a cracker than a cake.');
          else if (yieldPct < 35) verdictText = tr('baking.leavening.verdict_low',    'Slight rise. Think biscuit or thick pancake.');
          else if (yieldPct < 65) verdictText = tr('baking.leavening.verdict_medium', 'Soft and tender. Good for muffins or banana bread.');
          else if (yieldPct < 90) verdictText = tr('baking.leavening.verdict_high',   'Fluffy and airy. Classic cake or quick-bread territory.');
          else                    verdictText = tr('baking.leavening.verdict_peak',   'Maximum lift! Think souffl\u00e9 or tall layer cake.');

          var runReaction = function() {
            if (running) return;
            upd('leavRunning', true);
            playBeep('fizz');
            if (_leavTimer) { clearTimeout(_leavTimer); _leavTimer = null; }
            _leavTimer = setTimeout(function() {
              _leavTimer = null;
              if (typeof setLabToolData === 'function') {
                setLabToolData(function(prev) {
                  var base = (prev && typeof prev === 'object') ? prev : {};
                  var cb = Object.assign({}, base.bakingScience || {});
                  var curExt = Object.assign({}, cb._bakingExt || ext);
                  curExt.leaveningRuns = (Number(curExt.leaveningRuns) || 0) + 1;
                  cb.leavRunning = false;
                  cb._bakingExt = curExt;
                  return Object.assign({}, base, { bakingScience: cb });
                });
              }
              playBeep('bubble');
              awardXP && awardXP(10, 'Mixed a leavening reaction');
              announceToSR && announceToSR('Reaction complete. ' + yieldPct + ' percent rise. ' + verdictText);
            }, 1600);
          };

          // Build a richer bubble animation (only during running)
          var bubbles = [];
          if (running && yieldPct > 5) {
            var bubbleCount = Math.min(14, Math.max(4, Math.round(yieldPct / 8)));
            for (var bi = 0; bi < bubbleCount; bi++) {
              var size = 8 + Math.random() * 22;
              var leftPct = 10 + Math.random() * 80;
              var delay = Math.random() * 0.8;
              var duration = 0.9 + Math.random() * 0.8;
              bubbles.push(h('span', {
                key: 'b' + bi,
                'aria-hidden': true,
                style: {
                  position: 'absolute',
                  left: leftPct + '%',
                  bottom: '0',
                  width: size + 'px',
                  height: size + 'px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.35) 40%, rgba(253,224,71,0.45) 70%, rgba(245,158,11,0.2))',
                  boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.1), 0 0 8px rgba(253,224,71,0.4)',
                  animation: 'bakingBubbleRise ' + duration + 's ease-out ' + delay + 's forwards'
                }
              }));
            }
          }

          var LEAV_PRESETS = [
            { id: 'biscuit', label: tr('baking.leavening.preset_biscuit', 'Buttermilk Biscuit'), acid: 'buttermilk', base: 'baking_soda', amount: 55 },
            { id: 'cake',    label: tr('baking.leavening.preset_cake', 'Double-Acting Cake'),    acid: 'none',       base: 'baking_powder', amount: 50 },
            { id: 'bread',   label: tr('baking.leavening.preset_bread', 'Artisan Bread'),        acid: 'none',       base: 'yeast', amount: 65 },
            { id: 'flat',    label: tr('baking.leavening.preset_noacid', 'No-Acid Soda Test'),   acid: 'none',       base: 'baking_soda', amount: 60 }
          ];
          var reactionFormula = base.id === 'baking_soda'
            ? (acid.strength > 0 ? 'NaHCO\u2083 + H\u207A \u2192 CO\u2082\u2191 + H\u2082O' : 'NaHCO\u2083 + (no acid) \u2192 minimal CO\u2082')
            : (base.id === 'baking_powder' ? 'NaHCO\u2083 + H\u2082O + \u0394 \u2192 2\u00D7 CO\u2082\u2191' : 'C\u2086H\u2081\u2082O\u2086 \u2192 2 CO\u2082\u2191 + 2 C\u2082H\u2085OH');

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('leavening'),
            h('div', { className: 'flex items-center justify-between mb-3 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#78350f') } }, '\uD83E\uDED0 ' + tr('baking.activities.leavening_label', 'Leavening Lab')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.leavening.tagline', 'Mix an acid and a base to make bubbles of CO\u2082.'))
              ),
              backBtn('amber')
            ),
            // Quick experiment presets
            h('div', { className: 'mb-4 flex items-center gap-1.5 flex-wrap' },
              h('span', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider mr-1', style: { color: themeMuted } }, tr('baking.quick_presets', 'Try a mix:')),
              LEAV_PRESETS.map(function(p) {
                var isMatch = acidId === p.acid && baseId === p.base && Math.abs(amount - p.amount) <= 5;
                return h('button', {
                  key: p.id,
                  type: 'button',
                  onClick: function() { updMulti({ leavAcid: p.acid, leavBase: p.base, leavAmount: p.amount }); playBeep('click'); },
                  className: 'px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer',
                  style: isMatch
                    ? { background: isContrast ? '#000000' : '#b45309', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#b45309' }
                    : { background: themeCard, color: themeInk, borderColor: themeBorder }
                }, p.label);
              })
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4' },
              // Controls
              h('div', { className: 'lg:col-span-2 space-y-4', style: { minWidth: 0 } },
                // Acid selector
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fbbf24' : '#b45309') } }, tr('baking.leavening.step_acid', '1. Pick an acid')),
                  h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                    ACIDS.map(function(a) {
                      var active = a.id === acidId;
                      return h('button', {
                        key: a.id,
                        type: 'button',
                        onClick: function() { upd('leavAcid', a.id); playBeep('click'); },
                        className: 'rounded-xl border-2 p-2 text-center text-xs font-bold transition-all cursor-pointer',
                        style: active
                          ? { background: isContrast ? '#000000' : '#b45309', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#92400e' }
                          : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                        'aria-pressed': active,
                        'aria-label': a.name
                      },
                        h('div', { className: 'text-2xl mb-1', 'aria-hidden': true }, a.emoji),
                        a.name
                      );
                    })
                  )
                ),
                // Base selector
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fb923c' : '#c2410c') } }, tr('baking.leavening.step_base', '2. Pick a base')),
                  h('div', { className: 'grid grid-cols-3 gap-2' },
                    BASES.map(function(b) {
                      var active = b.id === baseId;
                      return h('button', {
                        key: b.id,
                        type: 'button',
                        onClick: function() { upd('leavBase', b.id); playBeep('click'); },
                        className: 'rounded-xl border-2 p-3 text-center text-xs font-bold transition-all cursor-pointer',
                        style: active
                          ? { background: isContrast ? '#000000' : '#c2410c', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#9a3412' }
                          : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                        'aria-pressed': active,
                        'aria-label': b.name
                      },
                        h('div', { className: 'text-2xl mb-1', 'aria-hidden': true }, b.emoji),
                        h('div', null, b.name),
                        h('div', { className: 'text-[0.625rem] font-normal mt-0.5 opacity-85' }, b.complete ? tr('baking.leavening.complete_base', 'complete') : tr('baking.leavening.needs_acid', 'needs acid'))
                      );
                    })
                  )
                ),
                // Amount slider
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'leav-amount', className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#be123c') } }, tr('baking.leavening.step_amount', '3. How much? (pinch \u2192 tbsp)')),
                    h('span', { className: 'text-sm font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#fda4af' : '#be123c') } }, amount + '%')
                  ),
                  h('input', {
                    id: 'leav-amount',
                    type: 'range',
                    min: 10, max: 100, step: 5,
                    value: amount,
                    onChange: function(e) { upd('leavAmount', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-rose-500'
                  })
                ),
                h('div', { className: 'flex gap-2' },
                  h('button', {
                    type: 'button',
                    onClick: runReaction,
                    disabled: running,
                    className: 'flex-grow px-5 py-3 rounded-full font-black text-sm shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer',
                    style: isContrast
                      ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                      : { background: 'linear-gradient(90deg, #b45309, #e11d48)', color: '#ffffff' }
                  }, running ? tr('baking.leavening.mix_running', 'Reacting\u2026') : (tr('baking.leavening.mix_btn', 'Mix & React') + ' \uD83E\uDDEA'))
                )
              ),
              // Result panel with Graduated Reaction Beaker SVG
              h('div', {
                className: 'rounded-2xl border-2 p-4 space-y-3',
                style: isContrast
                  ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                  : (isDark
                    ? { background: '#172033', borderColor: '#b45309', color: '#f8fafc' }
                    : { background: 'linear-gradient(145deg, #fffbeb 0%, #fff1f2 100%)', borderColor: '#f59e0b', color: '#1e1b18' })
              },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#b45309') } }, tr('baking.leavening.rise_label', 'Rise (CO\u2082 gas)')),
                  h('span', {
                    className: 'text-xs font-black tabular-nums px-2 py-0.5 rounded-full',
                    style: overLeavened
                      ? { background: isContrast ? '#ffff00' : '#dc2626', color: isContrast ? '#000000' : '#ffffff' }
                      : { background: isContrast ? '#00ff00' : '#b45309', color: isContrast ? '#000000' : '#ffffff' }
                  }, yieldPct + '% CO\u2082')
                ),
                // Graduated Beaker & Dough Rise SVG Stage
                (function() {
                  var fillH = Math.max(8, Math.round((yieldPct / 100) * 116));
                  var topY = 140 - fillH;
                  var bubbleSeeds = [
                    { cx: 58, dy: 16, r: 4.5 }, { cx: 88, dy: 34, r: 6 }, { cx: 118, dy: 22, r: 5 },
                    { cx: 146, dy: 42, r: 4 }, { cx: 74, dy: 56, r: 5.5 }, { cx: 106, dy: 64, r: 6.5 },
                    { cx: 136, dy: 72, r: 4.5 }, { cx: 92, dy: 88, r: 5 }, { cx: 124, dy: 96, r: 4 }
                  ];
                  var visibleBubbles = Math.round((yieldPct / 100) * bubbleSeeds.length);
                  return h('div', {
                    className: 'relative rounded-xl border overflow-hidden p-1.5',
                    style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff'), borderColor: themeBorder }
                  },
                    h('svg', {
                      viewBox: '0 0 210 156',
                      width: '100%',
                      role: 'img',
                      'aria-label': tr('baking.leavening.beaker_aria', 'Graduated beaker showing {p} percent dough rise from carbon dioxide gas', { p: yieldPct })
                    },
                      h('defs', null,
                        h('linearGradient', { id: 'bkDoughFill', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: isContrast ? '#00ff00' : (overLeavened ? '#fdba74' : '#fef3c7') }),
                          h('stop', { offset: '45%', stopColor: isContrast ? '#00ff00' : (overLeavened ? '#fb923c' : '#fcd34d') }),
                          h('stop', { offset: '100%', stopColor: isContrast ? '#ffff00' : (overLeavened ? '#dc2626' : '#d97706') })
                        ),
                        h('radialGradient', { id: 'bkBubbleGloss', cx: '32%', cy: '28%', r: '70%' },
                          h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.95 }),
                          h('stop', { offset: '62%', stopColor: '#fef3c7', stopOpacity: 0.65 }),
                          h('stop', { offset: '100%', stopColor: '#d97706', stopOpacity: 0.35 })
                        ),
                        h('linearGradient', { id: 'bkGlassSheen', x1: '0', y1: '0', x2: '1', y2: '0' },
                          h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: isDark ? 0.16 : 0.36 }),
                          h('stop', { offset: '18%', stopColor: '#ffffff', stopOpacity: 0 }),
                          h('stop', { offset: '86%', stopColor: '#0f172a', stopOpacity: 0 }),
                          h('stop', { offset: '100%', stopColor: '#0f172a', stopOpacity: 0.12 })
                        ),
                        !isContrast && h('clipPath', { id: 'bkBeakerDoughClip' },
                          h('rect', { x: 41, y: Math.max(12, topY - 12), width: 128, height: 146 - Math.max(12, topY - 12), rx: 4 })
                        )
                      ),
                      !isContrast && h('ellipse', { cx: 105, cy: 151, rx: 66, ry: 3.5, fill: 'rgba(15,23,42,0.16)' }),
                      // Borosilicate beaker cavity
                      h('path', { d: 'M 38 16 L 38 140 Q 38 148 46 148 L 164 148 Q 172 148 172 140 L 172 16', fill: isContrast ? '#000000' : (isDark ? '#1e293b' : '#fffbeb'), stroke: 'none' }),
                      // Translucent batter/dough fill
                      h('rect', { x: 41, y: topY, width: 128, height: 146 - topY, rx: 4, fill: 'url(#bkDoughFill)' }),
                      // Foamy dome crown + warm top breathing highlight
                      yieldPct > 15 && h('path', {
                        d: 'M 41 ' + topY + ' Q 105 ' + Math.max(12, topY - (overLeavened ? 4 : 14)) + ', 169 ' + topY,
                        fill: isContrast ? '#00ff00' : (overLeavened ? '#fca5a5' : '#fef3c7'),
                        stroke: isContrast ? '#ffff00' : '#d97706',
                        strokeWidth: 1.5
                      }),
                      !isContrast && yieldPct > 15 && h('path', {
                        d: 'M 54 ' + topY + ' Q 105 ' + Math.max(15, topY - (overLeavened ? 2 : 10)) + ', 156 ' + topY,
                        fill: 'none',
                        stroke: '#ffffff',
                        strokeWidth: 1.6,
                        strokeLinecap: 'round',
                        className: 'bk-bar-sheen bk-motion-deco'
                      }),
                      // Rising CO2 leavening micro-bubbles ascending through the dough column
                      !isContrast && yieldPct > 8 && h('g', { clipPath: 'url(#bkBeakerDoughClip)', className: 'bk-motion-deco' },
                        [
                          { cx: 56, cy: 138, r: 2.1, d: '0s', dur: '2.4s' },
                          { cx: 78, cy: 132, r: 1.8, d: '0.55s', dur: '2.8s' },
                          { cx: 102, cy: 136, r: 2.4, d: '1.1s', dur: '2.2s' },
                          { cx: 126, cy: 134, r: 1.9, d: '0.3s', dur: '2.6s' },
                          { cx: 148, cy: 139, r: 2.2, d: '0.9s', dur: '3.0s' },
                          { cx: 90, cy: 120, r: 1.7, d: '1.5s', dur: '2.5s' }
                        ].slice(0, Math.max(2, Math.round((yieldPct / 100) * 6))).map(function(mb, mbi) {
                          return h('circle', {
                            key: 'mb' + mbi,
                            cx: mb.cx,
                            cy: Math.max(topY + 12, mb.cy),
                            r: mb.r,
                            fill: '#ffffff',
                            stroke: '#f59e0b',
                            strokeWidth: 0.5,
                            className: 'bk-micro-bubble',
                            style: { animationDelay: mb.d, animationDuration: mb.dur }
                          });
                        })
                      ),
                      // Glossy rising CO2 bubbles trapped inside dough
                      bubbleSeeds.slice(0, visibleBubbles).map(function(b, bi) {
                        var by = 142 - Math.min(fillH - 8, b.dy);
                        if (by < topY + 4) return null;
                        return h('g', { key: 'sb' + bi, className: isContrast ? undefined : 'bk-co2-float', style: isContrast ? undefined : { animationDelay: (bi * 0.36) + 's' } },
                          h('circle', {
                            cx: b.cx, cy: by, r: b.r,
                            fill: isContrast ? '#000000' : 'url(#bkBubbleGloss)',
                            stroke: isContrast ? '#ffff00' : '#b45309',
                            strokeWidth: 0.9
                          }),
                          !isContrast && h('circle', { cx: b.cx - b.r * 0.3, cy: by - b.r * 0.3, r: Math.max(1, b.r * 0.28), fill: '#ffffff', opacity: 0.9 })
                        );
                      }),
                      // Cylindrical glass specular reflection + borosilicate flared lip
                      !isContrast && h('rect', { x: 40, y: 16, width: 130, height: 131, rx: 6, fill: 'url(#bkGlassSheen)' }),
                      !isContrast && h('line', { x1: 47, y1: 22, x2: 47, y2: 140, stroke: '#ffffff', strokeWidth: 2.5, strokeLinecap: 'round', opacity: 0.42 }),
                      h('path', { d: 'M 33 14 L 38 17 L 38 140 Q 38 148 46 148 L 164 148 Q 172 148 172 140 L 172 17 L 177 14', fill: 'none', stroke: isContrast ? '#ffff00' : (isDark ? '#94a3b8' : '#78716c'), strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      // Graduated mL ticks
                      [25, 50, 75, 100].map(function(pct) {
                        var ty = 140 - Math.round((pct / 100) * 116);
                        return h('g', { key: 'gt' + pct },
                          h('line', { x1: 38, y1: ty, x2: 49, y2: ty, stroke: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#57534e'), strokeWidth: 1.5 }),
                          h('text', { x: 33, y: ty + 3, textAnchor: 'end', fontSize: 9, fontWeight: 700, fill: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#57534e') }, pct + '%')
                        );
                      }),
                      // Status readout top-right inside beaker frame
                      h('text', { x: 180, y: 30, fontSize: 9, fontWeight: 800, fill: isContrast ? '#00ff00' : (overLeavened ? '#dc2626' : (isDark ? '#fde68a' : '#9a3412')) }, overLeavened ? 'COLLAPSE' : 'LIFT'),
                      h('text', { x: 180, y: 44, fontSize: 12, fontWeight: 900, fill: isContrast ? '#ffff00' : (isDark ? '#f8fafc' : '#1e1b18') }, yieldPct + '%')
                    ),
                    bubbles.length > 0 && h('div', { className: 'absolute inset-0 pointer-events-none' }, bubbles)
                  );
                })(),
                // Chemical equation pill
                h('div', {
                  className: 'rounded-lg border px-2.5 py-1.5 text-center font-mono text-[0.6875rem] font-bold',
                  style: { background: themeCard, borderColor: themeBorder, color: isContrast ? '#00ff00' : (isDark ? '#fde68a' : '#9a3412') }
                }, reactionFormula),
                // Bake verdict card
                yieldPct > 0 && h('div', {
                  className: 'rounded-xl border p-2.5',
                  style: { background: themeCard, borderColor: overLeavened ? '#dc2626' : themeBorder }
                },
                  h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider mb-0.5', style: { color: overLeavened ? (isContrast ? '#ffff00' : '#dc2626') : (isContrast ? '#00ff00' : (isDark ? '#fbbf24' : '#b45309')) } }, tr('baking.leavening.verdict_title', 'Bake verdict')),
                  h('div', { className: 'text-xs font-semibold', style: { color: themeInk } }, verdictText)
                ),
                h('div', { className: 'text-xs leading-relaxed', style: { color: themeInk } }, explain),
                h('div', { className: 'text-[0.6875rem] italic', style: { color: themeMuted } }, acid.notes)
              )
            ),
            // Science explainer
            h('details', { className: 'mt-6 rounded-xl border p-4', style: { background: themeSubtle, borderColor: themeBorder } },
              h('summary', { className: 'cursor-pointer font-bold text-sm', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#78350f') } }, '\uD83D\uDCD6 ' + tr('baking.leavening.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm space-y-2', style: { color: themeInk } },
                h('p', null, __alloT('stem.bakingscience.baking_soda_is_sodium_bicarbonate_nahc', 'Baking soda is sodium bicarbonate (NaHCO\u2083). When it meets an acid, two things happen:')),
                h('ol', { className: 'list-decimal pl-5 space-y-1' },
                  h('li', null, __alloT('stem.bakingscience.the_acid_donates_a_proton_h_to_the_bic', 'The acid donates a proton (H\u207A) to the bicarbonate.')),
                  h('li', null, __alloT('stem.bakingscience.this_makes_carbonic_acid_h_co_which_in', 'This makes carbonic acid (H\u2082CO\u2083), which instantly falls apart into water and CO\u2082 gas.'))
                ),
                h('p', null, h('strong', null, __alloT('stem.bakingscience.baking_powder', 'Baking powder')), __alloT('stem.bakingscience.already_contains_an_acid_usually_cream', ' already contains an acid (usually cream of tartar or sodium aluminum sulfate), so it works without added acid. Many powders are "double-acting" \u2014 one burst of CO\u2082 when wet, another when heated.')),
                h('p', null, h('strong', null, __alloT('stem.bakingscience.yeast', 'Yeast')), __alloT('stem.bakingscience.is_a_living_fungus_it_eats_sugars_and_', ' is a living fungus. It eats sugars and releases CO\u2082 and alcohol. Slower than chemical leaveners, but it also develops flavor \u2014 that\u2019s why sourdough tastes so different from quick bread.'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 2: EMULSION MIXER
        // ═══════════════════════════════════════
        var renderEmulsion = function() {
          var goalId = d.emulGoal || 'vinaigrette';
          var goal = EMULSION_GOALS.filter(function(g) { return g.id === goalId; })[0] || EMULSION_GOALS[0];
          var oil = (typeof d.emulOil === 'number' && isFinite(d.emulOil)) ? d.emulOil : 50;
          var water = (typeof d.emulWater === 'number' && isFinite(d.emulWater)) ? d.emulWater : 50;
          var yolk = (typeof d.emulYolk === 'number' && isFinite(d.emulYolk)) ? d.emulYolk : 0;

          // Normalize to 100 for display consistency.
          var total = oil + water + yolk;
          var oilPct = total > 0 ? Math.round((oil / total) * 100) : 0;
          var waterPct = total > 0 ? Math.round((water / total) * 100) : 0;
          var yolkPct = Math.max(0, 100 - oilPct - waterPct);

          // How close to the goal?
          var distance = Math.sqrt(
            Math.pow(oilPct - goal.target.oil, 2) +
            Math.pow(waterPct - goal.target.water, 2) +
            Math.pow(yolkPct - goal.target.yolk, 2)
          );
          var stable = distance <= goal.tolerance;
          var broken = oilPct > 50 && yolkPct < 2; // lots of oil, no emulsifier

          var setSlider = function(key, val) {
            var nv = parseInt(val, 10);
            upd('emul' + key.charAt(0).toUpperCase() + key.slice(1), nv);
          };

          var checkMix = function() {
            if (stable) {
              playBeep('success');
              updExt({ emulsionsSolved: (ext.emulsionsSolved || 0) + 1 });
              awardXP && awardXP(15, 'Stabilized an emulsion');
              celebrate && celebrate();
              announceToSR && announceToSR(__alloT('stem.bakingscience.sr_stable_emulsion_great_mix', 'Stable emulsion. Great mix.'));
              addToast && addToast('\u2728 ' + tr('baking.emulsion.success_toast', 'Stable! Your ' + goal.label.toLowerCase() + ' holds together.', { name: goal.label.toLowerCase() }), 'success');
            } else {
              playBeep('fail');
              announceToSR && announceToSR(__alloT('stem.bakingscience.sr_emulsion_broke_adjust_your_ratios', 'Emulsion broke. Adjust your ratios.'));
              addToast && addToast(tr('baking.emulsion.not_quite', 'Not quite \u2014 try adjusting toward the target.'), 'info');
            }
          };

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('emulsion'),
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde047' : '#854d0e') } }, '\uD83E\uDD5A ' + tr('baking.activities.emulsion_label', 'Emulsion Mixer')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.emulsion.tagline', 'Oil and water don\u2019t mix. Egg yolks help.'))
              ),
              backBtn('yellow')
            ),
            // Goal selector
            h('div', { className: 'mb-4 rounded-2xl border-2 p-3', style: cardSurfaceStyle },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde047' : '#a16207') } }, tr('baking.emulsion.choose_goal', 'Choose a goal')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                EMULSION_GOALS.map(function(g) {
                  var active = g.id === goalId;
                  return h('button', {
                    key: g.id,
                    type: 'button',
                    onClick: function() { upd('emulGoal', g.id); playBeep('click'); },
                    className: 'px-3 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer',
                    style: active
                      ? { background: isContrast ? '#000000' : '#854d0e', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#854d0e' }
                      : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                    'aria-pressed': active
                  }, g.label);
                })
              )
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Sliders
              h('div', { className: 'rounded-2xl border-2 p-4 space-y-4', style: cardSurfaceStyle },
                [
                  { key: 'oil',   label: tr('baking.emulsion.oil',   'Oil'),       color: 'amber',  emoji: '\uD83E\uDEE2', val: oil,   target: goal.target.oil,   pct: oilPct },
                  { key: 'water', label: tr('baking.emulsion.water', 'Water'),     color: 'sky',    emoji: '\uD83D\uDCA7', val: water, target: goal.target.water, pct: waterPct },
                  { key: 'yolk',  label: tr('baking.emulsion.yolk',  'Egg yolk'),  color: 'yellow', emoji: '\uD83E\uDD5A', val: yolk,  target: goal.target.yolk,  pct: yolkPct }
                ].map(function(s) {
                  var diff = Math.abs(s.pct - s.target);
                  return h('div', { key: s.key },
                    h('div', { className: 'flex items-center justify-between mb-1 gap-2 flex-wrap' },
                      h('label', { htmlFor: 'emul-' + s.key, className: 'text-xs font-bold flex items-center gap-1', style: { color: themeInk } },
                        h('span', { 'aria-hidden': true }, s.emoji), s.label
                      ),
                      h('div', { className: 'text-xs tabular-nums flex items-center gap-2' },
                        h('span', { className: 'font-black', style: { color: themeInk } }, s.pct + '%'),
                        h('span', {
                          className: 'px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold',
                          style: diff <= 8
                            ? { background: isContrast ? '#00ff00' : (isDark ? '#065f46' : '#dcfce7'), color: isContrast ? '#000000' : (isDark ? '#a7f3d0' : '#166534') }
                            : { background: themeSubtle, color: themeMuted }
                        }, tr('baking.emulsion.target', 'target') + ' ' + s.target + '%')
                      )
                    ),
                    h('input', {
                      id: 'emul-' + s.key,
                      type: 'range',
                      min: 0, max: 100, step: 1,
                      value: s.val,
                      onChange: function(e) { setSlider(s.key, e.target.value); },
                      className: 'w-full accent-' + s.color + '-500'
                    })
                  );
                }),
                h('button', {
                  type: 'button',
                  onClick: checkMix,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer',
                  style: isContrast
                    ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                    : { background: 'linear-gradient(90deg, #a16207, #b45309)', color: '#ffffff' }
                }, tr('baking.emulsion.shake_btn', 'Shake & check') + ' \uD83E\uDD64')
              ),
              // Microscopic Emulsion SVG Visualization
              h('div', {
                className: 'rounded-2xl border-2 p-4 space-y-3',
                style: isContrast
                  ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                  : (isDark
                    ? { background: '#172033', borderColor: '#a16207', color: '#f8fafc' }
                    : { background: 'linear-gradient(145deg, #fefce8 0%, #fffbeb 100%)', borderColor: '#eab308', color: '#1e1b18' })
              },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde047' : '#a16207') } }, tr('baking.emulsion.your_mix', 'Microscopic view')),
                  h('span', {
                    className: 'px-2.5 py-0.5 rounded-full text-xs font-black',
                    style: stable
                      ? { background: isContrast ? '#00ff00' : '#047857', color: isContrast ? '#000000' : '#ffffff' }
                      : broken
                        ? { background: isContrast ? '#ffff00' : '#dc2626', color: isContrast ? '#000000' : '#ffffff' }
                        : { background: themeCard, color: themeInk, border: '1px solid ' + themeBorder }
                  }, stable ? tr('baking.emulsion.stable', 'Stable') : broken ? tr('baking.emulsion.broken', 'Broken') : tr('baking.emulsion.mixing', 'Mixing\u2026'))
                ),
                (function() {
                  var oilH = Math.max(20, Math.min(120, Math.round((oilPct / 100) * 140)));
                  var droplets = [
                    { cx: 60, cy: 48, r: 12 }, { cx: 118, cy: 42, r: 10 }, { cx: 180, cy: 52, r: 13 },
                    { cx: 238, cy: 46, r: 9 }, { cx: 88, cy: 96, r: 14 }, { cx: 150, cy: 92, r: 11 },
                    { cx: 214, cy: 98, r: 12 }, { cx: 52, cy: 122, r: 8 }, { cx: 186, cy: 124, r: 9 }
                  ];
                  var count = Math.max(2, Math.min(droplets.length, Math.round((oilPct / 100) * droplets.length) + 1));
                  var hasLecithin = yolkPct >= 3;
                  return h('div', {
                    className: 'rounded-xl border overflow-hidden',
                    style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff'), borderColor: themeBorder }
                  },
                    h('svg', {
                      viewBox: '0 0 290 156',
                      width: '100%',
                      role: 'img',
                      'aria-label': broken
                        ? tr('baking.emulsion.svg_broken_aria', 'Separated oil and water layers with no emulsifier')
                        : tr('baking.emulsion.svg_mixed_aria', 'Emulsion view showing {oil} percent oil droplets suspended in water with {yolk} percent egg yolk lecithin', { oil: oilPct, yolk: yolkPct })
                    },
                      !isContrast && h('defs', null,
                        h('radialGradient', { id: 'bkOilDrop', cx: '32%', cy: '28%', r: '72%' },
                          h('stop', { offset: '0%', stopColor: '#fef08a' }),
                          h('stop', { offset: '45%', stopColor: '#f59e0b' }),
                          h('stop', { offset: '100%', stopColor: '#b45309' })
                        ),
                        h('linearGradient', { id: 'bkOilLayer', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: '#fde047' }),
                          h('stop', { offset: '100%', stopColor: '#f59e0b' })
                        ),
                        h('linearGradient', { id: 'bkWaterLayer', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: '#bae6fd' }),
                          h('stop', { offset: '100%', stopColor: '#38bdf8' })
                        ),
                        h('radialGradient', { id: 'bkEmulField', cx: '50%', cy: '45%', r: '62%' },
                          h('stop', { offset: '0%', stopColor: stable ? '#fefce8' : '#f0f9ff' }),
                          h('stop', { offset: '100%', stopColor: stable ? '#fde68a' : '#bae6fd' })
                        )
                      ),
                      broken ? h('g', null,
                        h('rect', { x: 8, y: 8, width: 274, height: oilH, rx: 6, fill: isContrast ? '#ffff00' : 'url(#bkOilLayer)' }),
                        h('rect', { x: 8, y: 8 + oilH, width: 274, height: 140 - oilH, rx: 6, fill: isContrast ? '#000000' : 'url(#bkWaterLayer)', stroke: isContrast ? '#00ff00' : '#0284c7', strokeWidth: 1 }),
                        !isContrast && h('line', { x1: 12, y1: 10 + oilH, x2: 278, y2: 10 + oilH, stroke: '#ffffff', strokeWidth: 2, opacity: 0.45, className: 'bk-bar-sheen bk-motion-deco' }),
                        h('line', { x1: 8, y1: 8 + oilH, x2: 282, y2: 8 + oilH, stroke: isContrast ? '#00ff00' : '#b45309', strokeWidth: 2, strokeDasharray: '6 4', className: isContrast ? undefined : 'bk-convection' }),
                        h('text', { x: 145, y: Math.max(24, 8 + oilH / 2 + 4), textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#000000' }, tr('baking.emulsion.oil_layer', 'Oil layer') + ' (' + oilPct + '%)'),
                        h('text', { x: 145, y: Math.min(140, 8 + oilH + (140 - oilH) / 2 + 4), textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: isContrast ? '#00ff00' : '#0c4a6e' }, tr('baking.emulsion.water_layer', 'Water layer') + ' (' + waterPct + '%)')
                      ) : h('g', null,
                        // Continuous aqueous phase with microscopic field gradient
                        h('rect', { x: 8, y: 8, width: 274, height: 140, rx: 8, fill: isContrast ? '#000000' : 'url(#bkEmulField)', stroke: isContrast ? '#ffff00' : '#ca8a04', strokeWidth: 1.5 }),
                        // Glossy 3D oil droplets + lecithin amphiphilic coats
                        droplets.slice(0, count).map(function(dr, di) {
                          var rr = Math.max(6, Math.round(dr.r * (stable ? 0.85 : 1.1)));
                          return h('g', { key: 'dr' + di, className: isContrast ? undefined : 'bk-droplet-float', style: isContrast ? undefined : { animationDelay: (di * 0.42) + 's' } },
                            !isContrast && hasLecithin && h('circle', { cx: dr.cx, cy: dr.cy, r: rr + 6, fill: '#10b981', opacity: 0.16, className: 'bk-beacon bk-motion-deco', style: { animationDelay: (di * 0.35) + 's' } }),
                            h('circle', {
                              cx: dr.cx, cy: dr.cy, r: rr,
                              fill: isContrast ? '#ffff00' : 'url(#bkOilDrop)',
                              stroke: isContrast ? '#000000' : '#92400e',
                              strokeWidth: 0.8
                            }),
                            !isContrast && h('ellipse', { cx: dr.cx - rr * 0.28, cy: dr.cy - rr * 0.3, rx: rr * 0.3, ry: rr * 0.17, fill: '#ffffff', opacity: 0.72, transform: 'rotate(-26 ' + (dr.cx - rr * 0.28) + ' ' + (dr.cy - rr * 0.3) + ')' }),
                            hasLecithin && h('circle', {
                              cx: dr.cx, cy: dr.cy, r: rr + 3.5,
                              fill: 'none',
                              stroke: isContrast ? '#00ff00' : '#047857',
                              strokeWidth: 2,
                              strokeDasharray: '3 2',
                              className: isContrast ? undefined : 'bk-lecithin-dash'
                            })
                          );
                        }),
                        // Compact legend bar at bottom of viewport
                        h('rect', { x: 14, y: 126, width: 262, height: 18, rx: 5, fill: isContrast ? '#000000' : 'rgba(15,23,42,0.82)', stroke: isContrast ? '#ffff00' : 'none' }),
                        h('circle', { cx: 26, cy: 135, r: 4, fill: isContrast ? '#ffff00' : '#f59e0b' }),
                        h('text', { x: 34, y: 138, fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#ffff00' : '#ffffff' }, 'Oil ' + oilPct + '%'),
                        h('circle', { cx: 108, cy: 135, r: 4, fill: isContrast ? '#00ff00' : '#34d399' }),
                        h('text', { x: 116, y: 138, fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#00ff00' : '#ffffff' }, 'Lecithin coat ' + yolkPct + '%'),
                        h('text', { x: 268, y: 138, textAnchor: 'end', fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#ffff00' : '#bae6fd' }, 'H\u2082O ' + waterPct + '%')
                      )
                    )
                  );
                })(),
                h('div', { className: 'text-xs leading-relaxed', style: { color: themeInk } }, goal.explain)
              )
            ),
            h('details', { className: 'mt-6 rounded-xl border p-4', style: { background: themeSubtle, borderColor: themeBorder } },
              h('summary', { className: 'cursor-pointer font-bold text-sm', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde047' : '#713f12') } }, '\uD83D\uDCD6 ' + tr('baking.emulsion.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm space-y-2', style: { color: themeInk } },
                h('p', null, __alloT('stem.bakingscience.oil_is_hydrophobic_water_fearing_and_w', 'Oil is hydrophobic ("water-fearing") and water is hydrophilic. On their own, they separate because oil molecules are nonpolar and water molecules are polar.')),
                h('p', null, h('strong', null, __alloT('stem.bakingscience.emulsifiers', 'Emulsifiers')), __alloT('stem.bakingscience.are_molecules_with_one_water_loving_en', ' are molecules with one water-loving end and one oil-loving end \u2014 like soap, but edible. Egg yolks are full of one called '), h('strong', null, 'lecithin'), __alloT('stem.bakingscience.lecithin_coats_tiny_droplets_of_oil_an', '. Lecithin coats tiny droplets of oil and keeps them suspended in water.')),
                h('p', null, __alloT('stem.bakingscience.that_s_why_mayonnaise_hollandaise_and_', 'That\u2019s why mayonnaise, hollandaise, and even cake batter hold together: a web of emulsifier-coated droplets.'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 3: RECIPE SCALER
        // ═══════════════════════════════════════
        var renderScaler = function() {
          var recipeId = d.scaleRecipe || 'pancakes';
          var recipe = RECIPE_PRESETS.filter(function(r) { return r.id === recipeId; })[0] || RECIPE_PRESETS[0];
          var unit = d.scaleUnit || 'grams';
          var lockFlour = !!d.scaleLockFlour;

          var flour = recipe.ingredients.filter(function(i) { return i.role === 'flour'; })[0];
          var baselineFlourGrams = flour ? flour.grams : 0;

          // Factor is derived from either the slider (free mode) or from the flour-weight target (lock mode).
          var lockedFlourTarget = (typeof d.scaleLockFlourGrams === 'number' && isFinite(d.scaleLockFlourGrams) && d.scaleLockFlourGrams > 0) ? d.scaleLockFlourGrams : baselineFlourGrams;
          var factor;
          if (lockFlour && baselineFlourGrams > 0) {
            factor = lockedFlourTarget / baselineFlourGrams;
          } else {
            factor = (typeof d.scaleFactor === 'number' && isFinite(d.scaleFactor)) ? d.scaleFactor : 1;
          }
          if (!isFinite(factor)) factor = 1;
          factor = Math.max(0.1, Math.min(10, factor));

          // Compute hydration (liquid / flour) — uses grams, ignores factor since it cancels.
          var totalLiquid = recipe.ingredients.reduce(function(sum, ing) {
            if (ing.role === 'liquid') return sum + ing.grams;
            return sum;
          }, 0);
          var hydrationPct = baselineFlourGrams > 0 ? Math.round((totalLiquid / baselineFlourGrams) * 100) : 0;

          var displayAmount = function(grams) {
            var scaled = grams * factor;
            if (unit === 'grams') return scaled.toFixed(scaled < 10 ? 1 : 0) + ' g';
            if (unit === 'oz') return (scaled / 28.35).toFixed(2) + ' oz';
            if (unit === 'cups') {
              return (scaled / 150).toFixed(2) + ' cup (approx)';
            }
            return scaled.toFixed(0);
          };

          var bakersPct = function(grams) {
            if (!baselineFlourGrams) return '\u2014';
            return ((grams / baselineFlourGrams) * 100).toFixed(0) + '%';
          };

          var applyScale = function() {
            playBeep('success');
            updExt({ recipesScaled: (ext.recipesScaled || 0) + 1 });
            awardXP && awardXP(8, 'Scaled a recipe');
            announceToSR && announceToSR('Recipe scaled by ' + factor.toFixed(2) + 'x.');
            addToast && addToast(tr('baking.scaler.scaled_toast', 'Recipe scaled to {n} servings.', { n: Math.round(recipe.serves * factor) }), 'success');
          };

          var totalGrams = recipe.ingredients.reduce(function(sum, ing) { return sum + ing.grams; }, 0) || 1;
          var roleColors = {
            flour:  isContrast ? '#ffff00' : '#d97706',
            liquid: isContrast ? '#00ff00' : '#0284c7',
            fat:    isContrast ? '#fde047' : '#f59e0b',
            sugar:  isContrast ? '#86efac' : '#e11d48',
            other:  isContrast ? '#ffffff' : '#64748b'
          };
          var roleBuckets = [
            { id: 'flour',  label: tr('baking.scaler.role_flour', 'Flour'),   grams: 0 },
            { id: 'liquid', label: tr('baking.scaler.role_liquid', 'Liquid'), grams: 0 },
            { id: 'fat',    label: tr('baking.scaler.role_fat', 'Fat/Egg'),   grams: 0 },
            { id: 'sugar',  label: tr('baking.scaler.role_sugar', 'Sugar'),   grams: 0 },
            { id: 'other',  label: tr('baking.scaler.role_other', 'Other'),   grams: 0 }
          ];
          recipe.ingredients.forEach(function(ing) {
            var r = ing.role || 'other';
            var bucket = roleBuckets.find(function(b) { return b.id === r; }) || roleBuckets[4];
            bucket.grams += ing.grams;
          });
          var activeBuckets = roleBuckets.filter(function(b) { return b.grams > 0; });

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('scaler'),
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#9a3412') } }, '\uD83D\uDCCF ' + tr('baking.activities.scaler_label', 'Recipe Scaler')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.scaler.tagline', 'Scale recipes with ratios \u2014 and see baker\u2019s percentages.'))
              ),
              backBtn('orange')
            ),
            h('div', { className: 'mb-4 rounded-2xl border-2 p-3', style: cardSurfaceStyle },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } }, tr('baking.scaler.recipe', 'Recipe')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                RECIPE_PRESETS.map(function(r) {
                  var active = r.id === recipeId;
                  return h('button', {
                    key: r.id,
                    type: 'button',
                    onClick: function() { upd('scaleRecipe', r.id); playBeep('click'); },
                    className: 'px-3 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer',
                    style: active
                      ? { background: isContrast ? '#000000' : '#c2410c', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#c2410c' }
                      : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                    'aria-pressed': active
                  }, r.label);
                })
              )
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4' },
              // Scale controls
              h('div', { className: 'lg:col-span-1 space-y-4', style: { minWidth: 0 } },
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('label', { className: 'flex items-center gap-2 text-xs font-bold cursor-pointer mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } },
                    h('input', {
                      type: 'checkbox',
                      checked: lockFlour,
                      onChange: function(e) {
                        var v = e.target.checked;
                        if (v) {
                          // Seed the lock target from current factor so there's no jump
                          updMulti({ scaleLockFlour: true, scaleLockFlourGrams: Math.round(baselineFlourGrams * factor) });
                        } else {
                          upd('scaleLockFlour', false);
                        }
                      },
                      className: 'accent-orange-500'
                    }),
                    tr('baking.scaler.lock_flour', 'Lock flour weight')
                  ),
                  lockFlour
                    ? h('div', null,
                        h('div', { className: 'flex items-center justify-between mb-1' },
                          h('label', { htmlFor: 'scale-flour-grams', className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } }, tr('baking.scaler.flour_weight', 'Flour weight')),
                          h('span', { className: 'text-xl font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#fdba74' : '#c2410c') } }, lockedFlourTarget + ' g')
                        ),
                        h('input', {
                          id: 'scale-flour-grams',
                          type: 'range',
                          min: Math.max(50, Math.round(baselineFlourGrams * 0.25)),
                          max: Math.round(baselineFlourGrams * 4),
                          step: 10,
                          value: lockedFlourTarget,
                          onChange: function(e) { upd('scaleLockFlourGrams', parseInt(e.target.value, 10)); },
                          className: 'w-full accent-orange-500'
                        }),
                        h('div', { className: 'mt-1 text-[0.6875rem] italic', style: { color: themeMuted } }, tr('baking.scaler.lock_flour_hint', 'Pick a flour amount and everything else scales by baker\u2019s %.'))
                      )
                    : h('div', null,
                        h('div', { className: 'flex items-center justify-between mb-1' },
                          h('label', { htmlFor: 'scale-factor', className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } }, tr('baking.scaler.scale', 'Scale')),
                          h('span', { className: 'text-xl font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#fdba74' : '#c2410c') } }, factor.toFixed(2) + '\u00D7')
                        ),
                        h('input', {
                          id: 'scale-factor',
                          type: 'range',
                          min: 0.25, max: 4, step: 0.25,
                          value: factor,
                          onChange: function(e) { upd('scaleFactor', parseFloat(e.target.value)); },
                          className: 'w-full accent-orange-500'
                        }),
                        h('div', { className: 'mt-2 flex gap-1 flex-wrap' },
                          [0.5, 1, 2, 3].map(function(mult) {
                            var active = Math.abs(factor - mult) < 0.01;
                            return h('button', {
                              key: mult,
                              type: 'button',
                              onClick: function() { upd('scaleFactor', mult); playBeep('click'); },
                              className: 'px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border cursor-pointer',
                              style: active
                                ? { background: isContrast ? '#000000' : '#c2410c', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#c2410c' }
                                : { background: themeSubtle, color: themeInk, borderColor: themeBorder }
                            }, mult + '\u00D7');
                          })
                        )
                      ),
                  h('div', { className: 'mt-2 text-xs', style: { color: themeMuted } }, tr('baking.scaler.makes_servings', 'Makes {n} servings', { n: Math.round(recipe.serves * factor) }))
                ),
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } }, tr('baking.scaler.units', 'Units')),
                  h('div', { className: 'flex gap-1' },
                    ['grams', 'oz', 'cups'].map(function(u) {
                      var active = u === unit;
                      return h('button', {
                        key: u,
                        type: 'button',
                        onClick: function() { upd('scaleUnit', u); },
                        className: 'flex-1 px-2 py-1.5 rounded-full text-xs font-bold border cursor-pointer',
                        style: active
                          ? { background: isContrast ? '#000000' : '#c2410c', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#c2410c' }
                          : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                        'aria-pressed': active
                      }, u);
                    })
                  ),
                  unit === 'cups' && h('div', { className: 'mt-2 text-[0.6875rem] italic', style: { color: themeMuted } }, tr('baking.scaler.cup_warning', 'Cup conversions are approximate \u2014 always weigh for precision.'))
                ),
                // Hydration readout (only meaningful when the recipe has a liquid)
                hydrationPct > 0 && h('div', {
                  className: 'rounded-2xl border-2 p-4',
                  style: isContrast
                    ? { background: '#000000', borderColor: '#00ff00', color: '#ffff00' }
                    : (isDark
                      ? { background: '#0c2238', borderColor: '#0284c7', color: '#e0f2fe' }
                      : { background: 'linear-gradient(145deg, #f0f9ff 0%, #eff6ff 100%)', borderColor: '#7dd3fc', color: '#0c4a6e' })
                },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider flex items-center gap-1', style: { color: isContrast ? '#00ff00' : (isDark ? '#7dd3fc' : '#0369a1') } }, '\uD83D\uDCA7 ', tr('baking.scaler.hydration', 'Hydration')),
                    h('span', { className: 'text-2xl font-black tabular-nums', style: { color: isContrast ? '#ffff00' : (isDark ? '#38bdf8' : '#0369a1') } }, hydrationPct + '%')
                  ),
                  h('div', { className: 'h-2 rounded-full overflow-hidden', style: { background: isContrast ? '#333333' : (isDark ? '#1e3a5f' : '#e0f2fe') } },
                    h('div', {
                      className: 'h-full',
                      style: { width: Math.min(100, hydrationPct) + '%', background: isContrast ? '#00ff00' : '#0284c7', transition: 'width 0.4s ease' }
                    })
                  ),
                  h('div', { className: 'mt-1 text-[0.6875rem]', style: { color: themeMuted } }, tr('baking.scaler.hydration_hint', 'Liquid weight \u00f7 flour weight. Higher hydration = more open crumb.'))
                ),
                h('button', {
                  type: 'button',
                  onClick: applyScale,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer',
                  style: isContrast
                    ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                    : { background: 'linear-gradient(90deg, #c2410c, #e11d48)', color: '#ffffff' }
                }, tr('baking.scaler.save_btn', 'Save scaled recipe') + ' \uD83D\uDCBE')
              ),
              // Ingredient Composition Visual + Table
              h('div', { className: 'lg:col-span-2 space-y-3', style: { minWidth: 0 } },
                // Baker's Percentage Visual Composition SVG
                (function() {
                  var xCursor = 10;
                  var barW = 300;
                  return h('div', { className: 'rounded-2xl border-2 p-3', style: cardSurfaceStyle },
                    h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
                      h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#9a3412') } }, tr('baking.scaler.composition', 'Dough / Batter Mass Breakdown')),
                      h('span', { className: 'text-xs font-mono font-bold tabular-nums', style: { color: themeMuted } }, tr('baking.scaler.total_weight', 'Total: {g} g', { g: Math.round(totalGrams * factor) }))
                    ),
                    h('svg', {
                      viewBox: '0 0 320 42',
                      width: '100%',
                      role: 'img',
                      'aria-label': tr('baking.scaler.bar_aria', 'Proportional mass chart of recipe ingredients totaling {g} grams', { g: Math.round(totalGrams * factor) })
                    },
                      !isContrast && h('defs', null,
                        h('linearGradient', { id: 'bkMassSheen', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.42 }),
                          h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })
                        )
                      ),
                      !isContrast && h('rect', { x: 9, y: 5, width: 302, height: 20, rx: 4.5, fill: isDark ? '#0f172a' : '#f1f5f9' }),
                      activeBuckets.map(function(b) {
                        var w = Math.max(4, Math.round((b.grams / totalGrams) * barW));
                        var segW = Math.min(w, 310 - xCursor);
                        var seg = h('g', { key: b.id },
                          h('rect', {
                            x: xCursor, y: 6, width: segW, height: 18, rx: 3.5,
                            fill: roleColors[b.id] || '#64748b',
                            stroke: isContrast ? '#000000' : themeCard,
                            strokeWidth: 1.5
                          }),
                          !isContrast && segW > 6 && h('rect', { x: xCursor + 1.5, y: 7, width: Math.max(0, segW - 3), height: 6.5, rx: 2, fill: 'url(#bkMassSheen)', className: 'bk-bar-sheen bk-motion-deco' })
                        );
                        xCursor += w;
                        return seg;
                      }),
                      !isContrast && hydrationPct > 0 && h('g', { className: 'bk-motion-deco' },
                        h('circle', { cx: 302, cy: 34, r: 5, fill: '#0284c7', opacity: 0.28, className: 'bk-beacon' }),
                        h('circle', { cx: 302, cy: 34, r: 2.3, fill: '#0284c7' })
                      ),
                      h('text', { x: 10, y: 37, fontSize: 9, fontWeight: 700, fill: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#57534e') }, 'Flour 100% anchor \u00B7 ratios stay invariant at ' + factor.toFixed(2) + '\u00D7')
                    ),
                    h('div', { className: 'mt-1.5 flex items-center gap-3 flex-wrap text-[0.6875rem] font-bold' },
                      activeBuckets.map(function(b) {
                        var pctMass = Math.round((b.grams / totalGrams) * 100);
                        return h('span', { key: b.id, className: 'inline-flex items-center gap-1', style: { color: themeInk } },
                          h('span', { className: 'inline-block w-2.5 h-2.5 rounded-sm', style: { background: roleColors[b.id] } }),
                          b.label + ' ' + pctMass + '%'
                        );
                      })
                    )
                  );
                })(),
                h('div', { className: 'rounded-2xl border-2 overflow-hidden', style: cardSurfaceStyle },
                  h('div', {
                    className: 'px-4 py-2 border-b flex items-center justify-between gap-2 flex-wrap',
                    style: { background: themeSubtle, borderColor: themeBorder }
                  },
                    h('div', { className: 'text-sm font-black', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#7c2d12') } }, recipe.label),
                    h('div', { className: 'text-xs font-semibold', style: { color: themeMuted } }, tr('baking.scaler.flour_anchor', 'Flour = 100% (baker\u2019s %)'))
                  ),
                  h('table', { className: 'w-full text-sm' },
                    h('thead', {
                      className: 'text-[0.6875rem] uppercase tracking-wider',
                      style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc'), color: themeMuted }
                    },
                      h('tr', null,
                        h('th', { scope: 'col', className: 'text-left px-3 py-2' }, tr('baking.scaler.col_ingredient', 'Ingredient')),
                        h('th', { scope: 'col', className: 'text-right px-3 py-2' }, tr('baking.scaler.col_amount', 'Amount')),
                        h('th', { scope: 'col', className: 'text-right px-3 py-2' }, tr('baking.scaler.col_bakers', 'Baker\u2019s %'))
                      )
                    ),
                    h('tbody', null,
                      recipe.ingredients.map(function(ing, i) {
                        return h('tr', {
                          key: i,
                          style: {
                            background: i % 2 ? themeCard : themeSubtle,
                            borderTop: '1px solid ' + themeBorder
                          }
                        },
                          h('td', { className: 'px-3 py-2 font-medium', style: { color: themeInk } }, ing.name),
                          h('td', { className: 'px-3 py-2 text-right tabular-nums font-bold', style: { color: isContrast ? '#00ff00' : (isDark ? '#fdba74' : '#c2410c') } }, displayAmount(ing.grams)),
                          h('td', { className: 'px-3 py-2 text-right tabular-nums', style: { color: themeMuted } }, bakersPct(ing.grams))
                        );
                      })
                    )
                  )
                )
              )
            ),
            h('details', { className: 'mt-6 rounded-xl border p-4', style: { background: themeSubtle, borderColor: themeBorder } },
              h('summary', { className: 'cursor-pointer font-bold text-sm', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#7c2d12') } }, '\uD83D\uDCD6 ' + tr('baking.scaler.math_title', 'The math')),
              h('div', { className: 'mt-3 text-sm space-y-2', style: { color: themeInk } },
                h('p', null, h('strong', null, __alloT('stem.bakingscience.baker_s_percentages', 'Baker\u2019s percentages')), __alloT('stem.bakingscience.measure_every_ingredient_relative_to_t', ' measure every ingredient relative to the flour. If flour is 100%, water at 65% means 650g water per 1000g flour. Bakers use this so they can scale recipes up or down without recalculating ratios.')),
                h('p', null, h('strong', null, __alloT('stem.bakingscience.why_weight_beats_volume', 'Why weight beats volume')), __alloT('stem.bakingscience.a_cup_of_flour_can_weigh_anywhere_from', ': a cup of flour can weigh anywhere from 100g to 150g depending on how you scoop it. Grams don\u2019t lie. Professional bakeries always use scales.')),
                h('p', null, __alloT('stem.bakingscience.doubling_a_recipe_doesn_t_always_doubl', 'Doubling a recipe doesn\u2019t always double the bake time. Larger loaves have more insulation \u2014 the outside browns while the center catches up. Expect 10-30% longer for a 2\u00D7 batch.'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 4: OVEN TIMELINE
        // ═══════════════════════════════════════
        var renderOven = function() {
          var temp = (typeof d.ovenTemp === 'number' && isFinite(d.ovenTemp)) ? d.ovenTemp : 72; // canonical: °F
          var unit = d.ovenUnit || 'F';
          var fToC = function(f) { return Math.round((f - 32) * 5 / 9); };
          var formatTemp = function(f) {
            if (unit === 'C') return fToC(f) + '\u00B0C';
            return f + '\u00B0F';
          };

          // Bake zones in °F (canonical)
          var BAKE_ZONES = [
            { id: 'meringue', label: tr('baking.oven.zone_meringue', 'Meringue'), from: 200, to: 225, color: '#f5d0fe' },
            { id: 'proof',    label: tr('baking.oven.zone_proof',    'Proof dough'), from: 80,  to: 100, color: '#fde68a' },
            { id: 'custard',  label: tr('baking.oven.zone_custard',  'Custard'), from: 300, to: 325, color: '#fed7aa' },
            { id: 'cookies',  label: tr('baking.oven.zone_cookies',  'Cookies'), from: 350, to: 375, color: '#fcd34d' },
            { id: 'cake',     label: tr('baking.oven.zone_cake',     'Cake'),    from: 325, to: 375, color: '#fdba74' },
            { id: 'bread',    label: tr('baking.oven.zone_bread',    'Bread'),   from: 375, to: 450, color: '#fb923c' },
            { id: 'pizza',    label: tr('baking.oven.zone_pizza',    'Pizza'),   from: 450, to: 450, color: '#f97316' }
          ];

          // Find the latest event at or below current temp.
          var reached = OVEN_EVENTS.filter(function(e) { return e.temp <= temp; });
          var nextEvent = OVEN_EVENTS.filter(function(e) { return e.temp > temp; })[0];
          var latest = reached[reached.length - 1];

          // Record any newly discovered events when temp changes.
          var recordNewEvents = function(newTemp) {
            var newlyReached = OVEN_EVENTS.filter(function(e) { return e.temp <= newTemp; });
            var found = (ext.ovenEventsFound || []).slice();
            var added = 0;
            newlyReached.forEach(function(e) {
              if (found.indexOf(e.temp) === -1) { found.push(e.temp); added++; }
            });
            if (added > 0) {
              updExt({ ovenEventsFound: found });
              awardXP && awardXP(5 * added, 'Discovered an oven event');
              playBeep('success');
            }
          };

          // Helper to position on 32-450°F scale
          var pctOnScale = function(fahr) { return Math.max(0, Math.min(100, ((fahr - 32) / (450 - 32)) * 100)); };

          // Food color based on temp
          var foodColor;
          if (temp < 100)       foodColor = '#fef3c7'; // raw dough
          else if (temp < 200)  foodColor = '#fde68a';
          else if (temp < 280)  foodColor = '#fcd34d';
          else if (temp < 330)  foodColor = '#d97706';
          else if (temp < 400)  foodColor = '#92400e';
          else                  foodColor = '#451a03'; // burnt

          var coilGlow = Math.max(0.15, Math.min(1, (temp - 100) / 320));
          var domeRise = Math.min(18, Math.max(0, Math.round((temp - 80) / 14)));
          var hasSteam = temp >= 212 && temp < 410;
          var hasSmoke = temp >= 400;

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('oven'),
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#9f1239') } }, '\uD83D\uDD25 ' + tr('baking.activities.oven_label', 'Oven Timeline')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.oven.tagline', 'Slide the temperature to see what happens inside the oven.'))
              ),
              h('div', { className: 'flex items-center gap-2' },
                // Unit toggle
                h('div', {
                  className: 'flex items-center gap-0.5 p-0.5 rounded-full border shadow-sm',
                  style: { background: themeCard, borderColor: themeBorder },
                  role: 'group',
                  'aria-label': __alloT('stem.bakingscience.temperature_unit', 'Temperature unit')
                },
                  ['F', 'C'].map(function(u) {
                    var active = u === unit;
                    return h('button', {
                      key: u,
                      type: 'button',
                      onClick: function() { upd('ovenUnit', u); },
                      className: 'px-2.5 py-0.5 rounded-full text-xs font-black transition-colors cursor-pointer',
                      style: active
                        ? { background: isContrast ? '#000000' : '#e11d48', color: isContrast ? '#00ff00' : '#ffffff' }
                        : { background: 'transparent', color: themeInk },
                      'aria-pressed': active
                    }, '\u00B0' + u);
                  })
                ),
                backBtn('rose')
              )
            ),
            // Artisan Deck Oven SVG Scene + Interactive Slider
            h('div', {
              className: 'rounded-2xl border-2 p-5 mb-4',
              style: isContrast
                ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                : { background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderColor: '#fb7185', color: '#ffffff' }
            },
              h('div', { className: 'mb-4 max-w-md mx-auto' },
                h('svg', {
                  viewBox: '0 0 320 132',
                  width: '100%',
                  role: 'img',
                  'aria-label': tr('baking.oven.svg_aria', 'Deck oven interior at {temp} showing heating elements and loaf browning state', { temp: formatTemp(temp) })
                },
                  !isContrast && h('defs', null,
                    h('radialGradient', { id: 'bkOvenRadGlow', cx: '50%', cy: '18%', r: '68%' },
                      h('stop', { offset: '0%', stopColor: temp >= 280 ? '#f97316' : '#fbbf24', stopOpacity: (coilGlow * 0.45).toFixed(2) }),
                      h('stop', { offset: '60%', stopColor: '#ea580c', stopOpacity: (coilGlow * 0.14).toFixed(2) }),
                      h('stop', { offset: '100%', stopColor: '#090d16', stopOpacity: 0 })
                    ),
                    h('linearGradient', { id: 'bkOvenTray', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#f1f5f9' }),
                      h('stop', { offset: '100%', stopColor: '#64748b' })
                    ),
                    h('radialGradient', { id: 'bkLoafHighlight', cx: '42%', cy: '28%', r: '66%' },
                      h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.34 }),
                      h('stop', { offset: '55%', stopColor: '#ffffff', stopOpacity: 0 }),
                      h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: 0.28 })
                    ),
                    h('linearGradient', { id: 'bkOvenCrustSheen', x1: '0', y1: '0', x2: '1', y2: '0' },
                      h('stop', { offset: '0%', stopColor: '#fef3c7', stopOpacity: 0 }),
                      h('stop', { offset: '50%', stopColor: '#fde68a', stopOpacity: 0.52 }),
                      h('stop', { offset: '100%', stopColor: '#fef3c7', stopOpacity: 0 })
                    ),
                    h('clipPath', { id: 'bkOvenLoafClip' },
                      h('path', { d: 'M 102 95 C 102 ' + (68 - domeRise) + ', 218 ' + (68 - domeRise) + ', 218 95 Z' })
                    )
                  ),
                  h('rect', { x: 10, y: 8, width: 300, height: 116, rx: 12, fill: isContrast ? '#000000' : '#090d16', stroke: isContrast ? '#ffff00' : '#475569', strokeWidth: 3 }),
                  // Warm golden-orange oven cavity radiative glow
                  !isContrast && h('rect', { x: 12, y: 10, width: 296, height: 112, rx: 10, fill: 'url(#bkOvenRadGlow)', className: temp >= 140 ? 'bk-oven-glow bk-motion-deco' : undefined }),
                  // Subtle animated convection airflow streamlines at baking temperatures
                  !isContrast && temp >= 200 && h('g', { fill: 'none', stroke: '#fb923c', strokeWidth: 1.1, strokeDasharray: '4 4', opacity: Math.min(0.45, coilGlow * 0.45), className: 'bk-convection bk-motion-deco' },
                    h('path', { d: 'M 38 78 Q 48 38, 160 36 Q 268 38, 282 78' }),
                    h('path', { d: 'M 54 90 Q 68 50, 160 46 Q 252 50, 266 90' })
                  ),
                  // Top radiant heating element + glowing thermal halo
                  !isContrast && temp >= 240 && h('path', {
                    d: 'M 36 22 Q 70 28, 104 22 T 172 22 T 240 22 T 284 22',
                    fill: 'none',
                    stroke: '#f97316',
                    strokeWidth: 10,
                    strokeLinecap: 'round',
                    opacity: coilGlow * 0.3,
                    className: 'bk-oven-glow bk-motion-deco'
                  }),
                  h('path', {
                    d: 'M 36 22 Q 70 28, 104 22 T 172 22 T 240 22 T 284 22',
                    fill: 'none',
                    stroke: isContrast ? (temp >= 280 ? '#00ff00' : '#ffff00') : (temp >= 280 ? '#f97316' : '#64748b'),
                    strokeWidth: 4,
                    strokeLinecap: 'round',
                    opacity: isContrast ? 1 : coilGlow
                  }),
                  !isContrast && temp >= 320 && h('path', {
                    d: 'M 36 22 Q 70 28, 104 22 T 172 22 T 240 22 T 284 22',
                    fill: 'none',
                    stroke: '#fef08a',
                    strokeWidth: 1.4,
                    strokeLinecap: 'round',
                    opacity: coilGlow * 0.75,
                    className: 'bk-bar-sheen bk-motion-deco'
                  }),
                  // Oven rack
                  h('line', { x1: 28, y1: 102, x2: 292, y2: 102, stroke: isContrast ? '#ffff00' : '#94a3b8', strokeWidth: 3 }),
                  // Metallic baking tray + shadow
                  h('rect', { x: 86, y: 95, width: 148, height: 7, rx: 2, fill: isContrast ? '#ffff00' : 'url(#bkOvenTray)' }),
                  // Rising & browning dough dome with 3D crust shading + starch-gelatinization / Maillard sheen
                  h('path', {
                    d: 'M 102 95 C 102 ' + (68 - domeRise) + ', 218 ' + (68 - domeRise) + ', 218 95 Z',
                    fill: isContrast ? '#000000' : foodColor,
                    stroke: isContrast ? '#00ff00' : '#78350f',
                    strokeWidth: 2
                  }),
                  !isContrast && h('path', {
                    d: 'M 102 95 C 102 ' + (68 - domeRise) + ', 218 ' + (68 - domeRise) + ', 218 95 Z',
                    fill: 'url(#bkLoafHighlight)'
                  }),
                  // Starch gelatinization internal hydration shimmer wave (180F - 309F)
                  !isContrast && temp >= 180 && temp < 310 && h('g', { clipPath: 'url(#bkOvenLoafClip)', className: 'bk-motion-deco' },
                    h('path', {
                      d: 'M 108 ' + (88 - Math.round(domeRise * 0.2)) + ' Q 134 ' + (82 - Math.round(domeRise * 0.25)) + ', 160 ' + (88 - Math.round(domeRise * 0.2)) + ' T 212 ' + (88 - Math.round(domeRise * 0.2)),
                      fill: 'none', stroke: '#fef9c3', strokeWidth: 2.2, strokeLinecap: 'round', className: 'bk-gel-wave'
                    })
                  ),
                  // Golden Maillard / Caramelization specular crust sheen sweep (285F - 399F)
                  !isContrast && temp >= 285 && temp < 400 && h('g', { clipPath: 'url(#bkOvenLoafClip)', className: 'bk-motion-deco' },
                    h('rect', { x: 132, y: Math.max(40, 62 - domeRise), width: 34, height: 55, fill: 'url(#bkOvenCrustSheen)', className: 'bk-crust-sheen' })
                  ),
                  // Score mark on loaf
                  h('path', {
                    d: 'M 140 ' + (78 - Math.round(domeRise * 0.6)) + ' Q 160 ' + (70 - Math.round(domeRise * 0.6)) + ', 180 ' + (78 - Math.round(domeRise * 0.6)),
                    fill: 'none',
                    stroke: isContrast ? '#ffff00' : '#fef3c7',
                    strokeWidth: 2,
                    strokeLinecap: 'round'
                  }),
                  // Steam or smoke wisps (animated buoyant drift)
                  hasSteam && h('g', { stroke: isContrast ? '#00ff00' : '#e0f2fe', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', opacity: 0.85 },
                    h('path', { d: 'M 130 56 Q 124 44, 132 34', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0s' } }),
                    h('path', { d: 'M 160 52 Q 154 40, 162 30', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0.6s' } }),
                    h('path', { d: 'M 190 56 Q 184 44, 192 34', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '1.2s' } })
                  ),
                  hasSmoke && h('g', { stroke: isContrast ? '#ffff00' : '#fca5a5', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' },
                    h('path', { d: 'M 136 52 Q 128 38, 140 28', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0s' } }),
                    h('path', { d: 'M 166 48 Q 158 34, 170 26', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0.5s' } }),
                    h('path', { d: 'M 194 54 Q 186 40, 198 30', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '1.0s' } })
                  ),
                  // Thermometer readout pill inside oven glass
                  h('rect', { x: 228, y: 34, width: 68, height: 26, rx: 6, fill: isContrast ? '#000000' : 'rgba(15,23,42,0.88)', stroke: isContrast ? '#00ff00' : '#fb7185', strokeWidth: 1.2 }),
                  h('text', { x: 262, y: 51, textAnchor: 'middle', fontSize: 12, fontWeight: 900, fill: isContrast ? '#00ff00' : '#fda4af' }, formatTemp(temp))
                )
              ),
              h('div', { className: 'flex items-center justify-between mb-1' },
                h('label', { htmlFor: 'oven-temp', className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : '#fecdd3' } }, tr('baking.oven.temperature', 'Temperature')),
                h('span', { className: 'text-2xl font-black tabular-nums', style: { color: isContrast ? '#00ff00' : '#fda4af' } }, formatTemp(temp))
              ),
              // Slider with bake-zone markers overlaid
              h('div', { className: 'relative' },
                h('div', { className: 'absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 pointer-events-none', style: { opacity: 0.45 } },
                  BAKE_ZONES.map(function(z) {
                    var left = pctOnScale(z.from);
                    var width = Math.max(1.5, pctOnScale(z.to) - left);
                    return h('div', {
                      key: z.id,
                      title: z.label + ' ' + formatTemp(z.from) + (z.to !== z.from ? '\u2013' + formatTemp(z.to) : ''),
                      style: {
                        position: 'absolute', left: left + '%', width: width + '%', top: 0, bottom: 0,
                        background: z.color, borderRadius: '3px'
                      }
                    });
                  })
                ),
                h('input', {
                  id: 'oven-temp',
                  type: 'range',
                  min: 32, max: 450, step: 1,
                  value: temp,
                  'aria-label': __alloT('stem.bakingscience.oven_temperature', 'Oven temperature'),
                  onChange: function(e) { var nt = parseInt(e.target.value, 10); upd('ovenTemp', nt); recordNewEvents(nt); },
                  className: 'relative w-full accent-rose-500'
                })
              ),
              h('div', { className: 'flex justify-between text-[0.6875rem] mt-1', style: { color: isContrast ? '#ffff00' : '#fecdd3' } },
                h('span', null, __alloT('stem.bakingscience.cold', 'Cold')),
                h('span', null, __alloT('stem.bakingscience.warm', 'Warm')),
                h('span', null, __alloT('stem.bakingscience.baking', 'Baking')),
                h('span', null, __alloT('stem.bakingscience.crust', 'Crust')),
                h('span', null, __alloT('stem.bakingscience.burn', 'Burn'))
              ),
              // Clickable Zone quick-jump presets
              h('div', { className: 'mt-3 flex flex-wrap gap-1.5' },
                BAKE_ZONES.map(function(z) {
                  var inZone = temp >= z.from && temp <= Math.max(z.to, z.from + 5);
                  return h('button', {
                    key: z.id,
                    type: 'button',
                    onClick: function() { upd('ovenTemp', z.from); recordNewEvents(z.from); playBeep('click'); },
                    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6875rem] font-bold transition-all border cursor-pointer',
                    style: inZone
                      ? { background: isContrast ? '#000000' : '#ffffff', color: isContrast ? '#00ff00' : '#881337', borderColor: isContrast ? '#ffff00' : '#ffffff' }
                      : { background: isContrast ? '#000000' : 'rgba(255,255,255,0.12)', color: isContrast ? '#ffff00' : '#ffe4e6', borderColor: isContrast ? '#ffff00' : 'rgba(255,255,255,0.22)' },
                    title: formatTemp(z.from) + (z.to !== z.from ? '\u2013' + formatTemp(z.to) : '')
                  },
                    h('span', { className: 'w-2 h-2 rounded-full', style: { background: isContrast ? (inZone ? '#000000' : '#00ff00') : z.color } }),
                    z.label
                  );
                })
              ),
              // Reaction-temperature scale inside dark oven instrument panel for crisp high-contrast visibility
              (function() {
                var lo = 32, hi = 450, W = 320, H = 64, x0 = 14, x1 = 306, yBar = 30, hBar = 10;
                var sx = function(f) { return x0 + (Math.max(lo, Math.min(hi, f)) - lo) / (hi - lo) * (x1 - x0); };
                var marks = [{ f: 212, label: __alloT('stem.bakingscience.steam', 'Steam') }, { f: 310, label: __alloT('stem.bakingscience.maillard', 'Maillard') }, { f: 340, label: __alloT('stem.bakingscience.caramel', 'Caramel') }, { f: 400, label: __alloT('stem.bakingscience.burn_2', 'Burn') }];
                return h('div', {
                  className: 'mt-4 rounded-xl border p-2',
                  style: { background: isContrast ? '#000000' : 'rgba(9,13,22,0.75)', borderColor: isContrast ? '#ffff00' : 'rgba(251,113,133,0.35)' }
                },
                  h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Reaction temperature scale. Current oven temperature ' + formatTemp(temp) + '. Thresholds: steam at ' + formatTemp(212) + ', Maillard browning at ' + formatTemp(310) + ', caramelization at ' + formatTemp(340) + ', burn at ' + formatTemp(400) + '.' },
                    h('defs', null,
                      h('linearGradient', { id: 'bakeTempGrad', x1: '0', y1: '0', x2: '1', y2: '0' },
                        h('stop', { offset: '0%', stopColor: '#38bdf8' }),
                        h('stop', { offset: '45%', stopColor: '#fbbf24' }),
                        h('stop', { offset: '78%', stopColor: '#f97316' }),
                        h('stop', { offset: '100%', stopColor: '#dc2626' }))),
                    h('rect', { x: x0, y: yBar, width: x1 - x0, height: hBar, rx: 5, fill: 'url(#bakeTempGrad)' }),
                    !isContrast && h('rect', { x: x0 + 2, y: yBar + 1.5, width: x1 - x0 - 4, height: 3, rx: 1.5, fill: '#ffffff', opacity: 0.32, className: 'bk-bar-sheen bk-motion-deco' }),
                    marks.map(function(m, mi) {
                      var reachedM = temp >= m.f;
                      return h('g', { key: m.f },
                        !isContrast && reachedM && h('circle', { cx: sx(m.f), cy: yBar + hBar / 2, r: 6.5, fill: '#fbbf24', opacity: 0.28, className: 'bk-beacon bk-motion-deco', style: { animationDelay: (mi * 0.45) + 's' } }),
                        h('line', { x1: sx(m.f), y1: yBar - 3, x2: sx(m.f), y2: yBar + hBar + 3, stroke: '#ffffff', strokeWidth: 1.5, opacity: 0.92 }),
                        h('circle', { cx: sx(m.f), cy: yBar + hBar / 2, r: 2.3, fill: reachedM ? (isContrast ? '#00ff00' : '#fef08a') : '#ffffff', stroke: '#0f172a', strokeWidth: 0.7 }),
                        h('text', { x: sx(m.f), y: yBar - 7, textAnchor: 'middle', fontSize: 8.5, fill: isContrast ? '#ffff00' : (reachedM ? '#fde047' : '#fef3c7'), fontWeight: 700 }, m.label));
                    }),
                    !isContrast && h('circle', { cx: sx(temp), cy: yBar + hBar + 6, r: 7, fill: '#fb7185', opacity: 0.28, className: 'bk-beacon bk-motion-deco' }),
                    h('polygon', { points: (sx(temp) - 4.5) + ',' + (yBar + hBar + 3) + ' ' + (sx(temp) + 4.5) + ',' + (yBar + hBar + 3) + ' ' + sx(temp) + ',' + (yBar + hBar + 10), fill: isContrast ? '#00ff00' : '#ffffff' }),
                    h('text', { x: Math.max(x0 + 18, Math.min(x1 - 18, sx(temp))), y: H - 2, textAnchor: 'middle', fontSize: 9.5, fill: isContrast ? '#00ff00' : '#ffffff', fontWeight: 800 }, formatTemp(temp))
                  )
                );
              })()
            ),
            // Current + next event
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4' },
              latest ? h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1', style: { color: isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#be123c') } }, tr('baking.oven.happening_now', 'Happening now')),
                h('div', { className: 'text-xl font-black flex items-center gap-2', style: { color: themeInk } },
                  h('span', { 'aria-hidden': true }, latest.emoji), latest.label
                ),
                h('div', { className: 'text-xs mb-2', style: { color: themeMuted } }, 'at ' + formatTemp(latest.temp)),
                h('p', { className: 'text-sm', style: { color: themeInk } }, latest.body)
              ) : h('div', { className: 'rounded-2xl border-2 p-4 text-center', style: cardSurfaceStyle },
                h('div', { className: 'text-4xl mb-2' }, '\u2744\uFE0F'),
                h('div', { className: 'text-sm', style: { color: themeMuted } }, tr('baking.oven.oven_cold', 'Oven is still cold. Raise the temperature to start reactions.'))
              ),
              nextEvent ? h('div', { className: 'rounded-2xl border-2 p-4', style: { background: themeSubtle, borderColor: themeBorder, color: themeInk } },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1', style: { color: isContrast ? '#00ff00' : (isDark ? '#fda4af' : '#be123c') } }, tr('baking.oven.coming_up', 'Coming up at {temp}', { temp: formatTemp(nextEvent.temp) })),
                h('div', { className: 'text-lg font-black flex items-center gap-2', style: { color: themeInk } },
                  h('span', { 'aria-hidden': true }, nextEvent.emoji), nextEvent.label
                ),
                h('div', { className: 'mt-2 text-xs', style: { color: themeMuted } }, tr('baking.oven.degrees_to_go', '{n} to go', { n: (unit === 'C' ? (fToC(nextEvent.temp) - fToC(temp)) + '\u00B0C' : (nextEvent.temp - temp) + '\u00B0F') }))
              ) : h('div', { className: 'rounded-2xl border-2 p-4 text-center', style: { background: themeSubtle, borderColor: isContrast ? '#00ff00' : '#fb7185', color: themeInk } },
                h('div', { className: 'text-sm font-bold', style: { color: isContrast ? '#00ff00' : (isDark ? '#fda4af' : '#881337') } }, '\uD83C\uDF89 ' + tr('baking.oven.all_milestones', 'You\u2019ve hit every oven milestone!'))
              )
            ),
            // Event list
            h('div', { className: 'rounded-2xl border-2 overflow-hidden', style: cardSurfaceStyle },
              h('div', {
                className: 'px-4 py-2 border-b text-sm font-black',
                style: { background: themeSubtle, borderColor: themeBorder, color: isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#881337') }
              }, tr('baking.oven.all_events', 'All oven events')),
              h('ul', null,
                OVEN_EVENTS.map(function(e) {
                  var passed = temp >= e.temp;
                  return h('li', {
                    key: e.temp,
                    className: 'px-4 py-3 flex items-start gap-3',
                    style: {
                      background: passed ? themeSubtle : themeCard,
                      borderTop: '1px solid ' + themeBorder,
                      opacity: passed ? 1 : 0.72
                    }
                  },
                    h('div', { className: 'text-2xl shrink-0', 'aria-hidden': true }, e.emoji),
                    h('div', { className: 'flex-grow', style: { minWidth: 0 } },
                      h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('strong', { style: { color: passed ? themeInk : themeMuted } }, e.label),
                        h('span', {
                          className: 'text-[0.6875rem] font-bold px-2 py-0.5 rounded-full',
                          style: passed
                            ? { background: isContrast ? '#00ff00' : '#e11d48', color: isContrast ? '#000000' : '#ffffff' }
                            : { background: isContrast ? '#000000' : (isDark ? '#334155' : '#e2e8f0'), color: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#334155'), border: isContrast ? '1px solid #ffff00' : 'none' }
                        }, formatTemp(e.temp))
                      ),
                      h('div', { className: 'text-xs mt-0.5', style: { color: themeMuted } }, e.body)
                    )
                  );
                })
              )
            ),
            h('details', { className: 'mt-6 rounded-xl border p-4', style: { background: themeSubtle, borderColor: themeBorder } },
              h('summary', { className: 'cursor-pointer font-bold text-sm', style: { color: isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#881337') } }, '\uD83D\uDCD6 ' + tr('baking.oven.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm space-y-2', style: { color: themeInk } },
                h('p', null, h('strong', null, __alloT('stem.bakingscience.maillard_vs_caramelization', 'Maillard vs. caramelization')), __alloT('stem.bakingscience.maillard_reactions_need_protein_amino_', ': Maillard reactions need protein (amino acids) + sugar + heat \u2014 that\u2019s why bread crust, seared meat, and toasted marshmallows all develop similar brown, complex flavors. Caramelization only needs sugar + heat, and happens a bit hotter.')),
                h('p', null, h('strong', null, __alloT('stem.bakingscience.oven_spring', 'Oven spring')), __alloT('stem.bakingscience.in_the_first_few_minutes_steam_from_th', ': in the first few minutes, steam from the dough\u2019s water expands violently. This is why sourdough scoring matters \u2014 it gives the steam somewhere to go.')),
                h('p', null, h('strong', null, __alloT('stem.bakingscience.convection_vs_conduction', 'Convection vs. conduction')), __alloT('stem.bakingscience.conventional_ovens_bake_mostly_by_radi', ': conventional ovens bake mostly by radiating heat from the walls. Convection ovens move hot air with a fan \u2014 about 25\u00B0F more effective, so recipes say "reduce temp by 25\u00B0F" for convection.'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 5: BAKE DIAGNOSIS
        // ═══════════════════════════════════════
        var renderDiagnosis = function() {
          // Random per-session ordering. Seeded in state so it survives re-renders.
          var order = d.diagOrder;
          if (!order || !order.length || order.length !== DIAGNOSIS_SCENARIOS.length) {
            order = DIAGNOSIS_SCENARIOS.map(function(_, i) { return i; });
            for (var i = order.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
            }
            upd('diagOrder', order);
          }
          var idx = (Number.isInteger(d.diagIdx) && d.diagIdx >= 0) ? d.diagIdx : 0;
          if (idx >= order.length) idx = 0;
          var scenario = DIAGNOSIS_SCENARIOS[order[idx]];
          var selected = d.diagSelected || null;
          var revealed = !!d.diagRevealed;

          var correctOption = scenario.options.filter(function(o) { return o.correct; })[0];

          var pickOption = function(optId) {
            if (revealed) return;
            upd('diagSelected', optId);
          };

          var submitAnswer = function() {
            if (!selected || revealed) return;
            var chosen = scenario.options.filter(function(o) { return o.id === selected; })[0];
            var isCorrect = chosen && chosen.correct;
            upd('diagRevealed', true);
            var attempted = (ext.diagnosesAttempted || 0) + 1;
            if (isCorrect) {
              var correct = (ext.diagnosesCorrect || 0) + 1;
              var streak = (ext.diagStreak || 0) + 1;
              var best = Math.max(ext.diagBestStreak || 0, streak);
              updExt({ diagnosesAttempted: attempted, diagnosesCorrect: correct, diagStreak: streak, diagBestStreak: best });
              awardXP && awardXP(15 + (streak >= 3 ? 5 : 0), 'Diagnosed a bake');
              playBeep('success');
              announceToSR && announceToSR('Correct! ' + chosen.explain);
              if (streak > 0 && streak % 3 === 0) celebrate && celebrate();
            } else {
              updExt({ diagnosesAttempted: attempted, diagStreak: 0 });
              playBeep('fail');
              announceToSR && announceToSR('Not quite. ' + (correctOption ? correctOption.explain : ''));
            }
          };

          var nextScenario = function() {
            var nextIdx = (idx + 1) % order.length;
            updMulti({ diagIdx: nextIdx, diagSelected: null, diagRevealed: false });
          };

          var reshuffle = function() {
            var newOrder = order.slice();
            for (var i = newOrder.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var tmp = newOrder[i]; newOrder[i] = newOrder[j]; newOrder[j] = tmp;
            }
            updMulti({ diagOrder: newOrder, diagIdx: 0, diagSelected: null, diagRevealed: false });
            announceToSR && announceToSR(__alloT('stem.bakingscience.sr_scenarios_reshuffled', 'Scenarios reshuffled.'));
          };

          // Map a scenario tag to a colored accent and breadcrumb label
          var tagMeta = {
            leavening: { color: 'amber',  label: __alloT('stem.bakingscience.leavening', 'Leavening') },
            emulsion:  { color: 'yellow', label: __alloT('stem.bakingscience.emulsion', 'Emulsion') },
            scaler:    { color: 'orange', label: __alloT('stem.bakingscience.ratios', 'Ratios') },
            oven:      { color: 'rose',   label: __alloT('stem.bakingscience.oven_science', 'Oven science') }
          };
          var meta = tagMeta[scenario.tag] || { color: 'pink', label: __alloT('stem.bakingscience.baking_2', 'Baking') };

          var attempted = ext.diagnosesAttempted || 0;
          var correct = ext.diagnosesCorrect || 0;
          var accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
          var streak = ext.diagStreak || 0;

          var renderSymptomSvg = function(tag) {
            var bg = isContrast ? '#000000' : (isDark ? '#0f172a' : '#fff1f2');
            var stroke = isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#be185d');
            var accent = isContrast ? '#00ff00' : '#f59e0b';
            return h('svg', {
              viewBox: '0 0 88 72',
              width: 88,
              height: 72,
              className: 'shrink-0 rounded-xl border',
              style: { background: bg, borderColor: stroke },
              role: 'img',
              'aria-label': meta.label + ' bake diagram'
            },
              !isContrast && h('defs', null,
                h('radialGradient', { id: 'bkDiagGloss', cx: '35%', cy: '28%', r: '70%' },
                  h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.45 }),
                  h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: 0.16 })
                )
              ),
              tag === 'leavening' && h('g', null,
                !isContrast && h('ellipse', { cx: 44, cy: 64, rx: 32, ry: 2.5, fill: 'rgba(15,23,42,0.16)' }),
                h('rect', { x: 14, y: 44, width: 60, height: 18, rx: 4, fill: isContrast ? '#000000' : '#fde68a', stroke: stroke, strokeWidth: 2 }),
                !isContrast && h('rect', { x: 15, y: 45, width: 58, height: 16, rx: 3, fill: 'url(#bkDiagGloss)' }),
                h('path', { d: 'M 14 46 Q 44 56, 74 46', fill: 'none', stroke: accent, strokeWidth: 2.5 }),
                h('path', { d: 'M 32 34 L 32 22 M 44 36 L 44 18 M 56 34 L 56 22', stroke: stroke, strokeWidth: 2, strokeDasharray: '3 2', strokeLinecap: 'round' })
              ),
              tag === 'emulsion' && h('g', null,
                h('rect', { x: 18, y: 12, width: 52, height: 22, rx: 4, fill: isContrast ? '#ffff00' : '#fcd34d' }),
                h('rect', { x: 18, y: 36, width: 52, height: 24, rx: 4, fill: isContrast ? '#000000' : '#bae6fd', stroke: accent, strokeWidth: 1.5 }),
                !isContrast && h('line', { x1: 22, y1: 15, x2: 66, y2: 15, stroke: '#ffffff', strokeWidth: 1.8, opacity: 0.55 }),
                h('line', { x1: 14, y1: 35, x2: 74, y2: 35, stroke: stroke, strokeWidth: 2, strokeDasharray: '4 3' })
              ),
              tag === 'scaler' && h('g', null,
                h('line', { x1: 44, y1: 14, x2: 44, y2: 58, stroke: stroke, strokeWidth: 2.5, strokeLinecap: 'round' }),
                h('line', { x1: 32, y1: 58, x2: 56, y2: 58, stroke: stroke, strokeWidth: 3, strokeLinecap: 'round' }),
                h('line', { x1: 16, y1: 28, x2: 72, y2: 20, stroke: accent, strokeWidth: 3, strokeLinecap: 'round' }),
                h('circle', { cx: 22, cy: 40, r: 9, fill: isContrast ? '#000000' : '#fdba74', stroke: stroke, strokeWidth: 1.5 }),
                h('circle', { cx: 66, cy: 32, r: 6, fill: isContrast ? '#000000' : '#fde68a', stroke: stroke, strokeWidth: 1.5 }),
                !isContrast && h('circle', { cx: 19, cy: 37, r: 2.2, fill: '#ffffff', opacity: 0.65 }),
                !isContrast && h('circle', { cx: 64, cy: 30, r: 1.6, fill: '#ffffff', opacity: 0.65 })
              ),
              tag !== 'leavening' && tag !== 'emulsion' && tag !== 'scaler' && h('g', null,
                h('rect', { x: 14, y: 16, width: 60, height: 42, rx: 6, fill: isContrast ? '#000000' : '#1e293b', stroke: stroke, strokeWidth: 2 }),
                h('path', { d: 'M 22 48 C 22 28, 66 28, 66 48 Z', fill: isContrast ? '#ffff00' : '#92400e', stroke: accent, strokeWidth: 1.5 }),
                !isContrast && h('path', { d: 'M 22 48 C 22 28, 66 28, 66 48 Z', fill: 'url(#bkDiagGloss)' }),
                h('path', { d: 'M 32 24 Q 36 18, 40 24 T 48 24 T 56 24', fill: 'none', stroke: accent, strokeWidth: 2 })
              )
            );
          };

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('diagnosis'),
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#f472b6' : '#9d174d') } }, '\uD83D\uDD0D ' + tr('baking.activities.diagnosis_label', 'Bake Diagnosis')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.diagnosis.tagline', 'Something went wrong in the bake. Which explanation fits best?'))
              ),
              h('div', { className: 'flex items-center gap-2' },
                h('button', {
                  type: 'button',
                  onClick: reshuffle,
                  className: 'px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm cursor-pointer',
                  style: { background: themeCard, color: isContrast ? '#ffff00' : (isDark ? '#f472b6' : '#be185d'), borderColor: isContrast ? '#ffff00' : '#db2777' },
                  'aria-label': tr('baking.diagnosis.reshuffle_aria', 'Reshuffle scenarios')
                }, '\uD83D\uDD00 ' + tr('baking.diagnosis.reshuffle', 'Reshuffle')),
                backBtn('pink')
              )
            ),
            // Stats strip
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4' },
              [
                { val: (idx + 1) + '/' + order.length, label: tr('baking.diagnosis.scenario', 'Scenario'), accent: '#be185d', darkAccent: '#f472b6' },
                { val: correct, label: tr('baking.diagnosis.correct', 'Correct'), accent: '#047857', darkAccent: '#34d399' },
                { val: accuracy + '%', label: tr('baking.diagnosis.accuracy', 'Accuracy'), accent: '#4338ca', darkAccent: '#818cf8' },
                { val: (streak >= 2 ? '\uD83D\uDD25 ' : '') + streak, label: tr('baking.diagnosis.streak', 'Streak'), accent: '#b45309', darkAccent: '#fbbf24' }
              ].map(function(st) {
                return h('div', { key: st.label, className: 'rounded-xl border p-2.5 text-center', style: cardSurfaceStyle },
                  h('div', { className: 'text-xl font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? st.darkAccent : st.accent) } }, st.val),
                  h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider', style: { color: themeMuted } }, st.label)
                );
              })
            ),
            // Symptom card with custom bake diagnostic SVG
            h('div', {
              className: 'rounded-2xl border-2 p-5 mb-4',
              style: isContrast
                ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                : (isDark
                  ? { background: '#172033', borderColor: '#db2777', color: '#f8fafc' }
                  : { background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f2 100%)', borderColor: '#f472b6', color: '#1e1b18' })
            },
              h('div', { className: 'flex items-start gap-4 flex-wrap sm:flex-nowrap' },
                renderSymptomSvg(scenario.tag),
                h('div', { className: 'flex-grow', style: { minWidth: 0 } },
                  h('div', { className: 'flex items-center gap-2 mb-1.5 flex-wrap' },
                    h('span', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider', style: { color: isContrast ? '#00ff00' : (isDark ? '#f472b6' : '#be185d') } }, tr('baking.diagnosis.symptom', 'Symptom')),
                    h('span', {
                      className: 'text-[0.6875rem] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
                      style: { background: themeCard, color: themeInk, borderColor: themeBorder }
                    }, meta.label)
                  ),
                  h('p', { className: 'text-base sm:text-lg font-semibold leading-snug', style: { color: themeInk } }, '\u201C' + scenario.symptom + '\u201D')
                )
              )
            ),
            // Options
            h('div', { className: 'space-y-2 mb-4' },
              h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider mb-1', style: { color: themeMuted } }, tr('baking.diagnosis.pick_cause', 'Pick the most likely cause')),
              scenario.options.map(function(opt) {
                var isSelected = selected === opt.id;
                var isCorrect = opt.correct;
                var showAsRight = revealed && isCorrect;
                var showAsWrong = revealed && isSelected && !isCorrect;
                var optStyle = {
                  background: themeCard,
                  borderColor: themeBorder,
                  color: themeInk,
                  opacity: revealed && !isSelected && !isCorrect ? 0.72 : 1
                };
                if (showAsRight) {
                  optStyle.background = isContrast ? '#000000' : (isDark ? '#064e3b' : '#ecfdf5');
                  optStyle.borderColor = isContrast ? '#00ff00' : '#10b981';
                } else if (showAsWrong) {
                  optStyle.background = isContrast ? '#000000' : (isDark ? '#450a0a' : '#fef2f2');
                  optStyle.borderColor = isContrast ? '#ffff00' : '#ef4444';
                } else if (isSelected) {
                  optStyle.background = isContrast ? '#000000' : (isDark ? '#500724' : '#fce7f3');
                  optStyle.borderColor = isContrast ? '#00ff00' : '#ec4899';
                }
                return h('button', {
                  key: opt.id,
                  type: 'button',
                  onClick: function() { pickOption(opt.id); },
                  disabled: revealed,
                  className: 'w-full text-left rounded-xl border-2 p-3 transition-all cursor-pointer',
                  style: optStyle,
                  'aria-pressed': isSelected,
                  'aria-label': opt.text + (revealed ? (isCorrect ? ' (correct answer)' : (isSelected ? ' (your answer, incorrect)' : '')) : '')
                },
                  h('div', { className: 'flex items-start gap-2.5' },
                    h('div', {
                      className: 'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0',
                      style: showAsRight
                        ? { background: isContrast ? '#00ff00' : '#047857', borderColor: isContrast ? '#00ff00' : '#065f46', color: isContrast ? '#000000' : '#ffffff' }
                        : showAsWrong
                          ? { background: isContrast ? '#ffff00' : '#dc2626', borderColor: isContrast ? '#ffff00' : '#b91c1c', color: isContrast ? '#000000' : '#ffffff' }
                          : isSelected
                            ? { background: isContrast ? '#00ff00' : '#be185d', borderColor: isContrast ? '#00ff00' : '#9d174d', color: isContrast ? '#000000' : '#ffffff' }
                            : { background: 'transparent', borderColor: themeBorder, color: themeMuted }
                    },
                      showAsRight ? '\u2713' : showAsWrong ? '\u2717' : isSelected ? '\u2022' : ''
                    ),
                    h('div', { className: 'flex-grow', style: { minWidth: 0 } },
                      h('div', { className: 'text-sm font-semibold', style: { color: themeInk } }, opt.text),
                      revealed && (isSelected || isCorrect) && h('div', {
                        className: 'mt-1.5 text-xs leading-relaxed',
                        style: { color: isCorrect ? (isContrast ? '#00ff00' : (isDark ? '#a7f3d0' : '#065f46')) : (isContrast ? '#ffff00' : (isDark ? '#fecaca' : '#991b1b')) }
                      }, opt.explain)
                    )
                  )
                );
              })
            ),
            // Action buttons
            h('div', { className: 'flex items-center gap-2 justify-end' },
              !revealed && h('button', {
                type: 'button',
                onClick: submitAnswer,
                disabled: !selected,
                className: 'px-5 py-2.5 rounded-full font-black text-sm shadow-md disabled:opacity-40 transition-all active:scale-95 cursor-pointer',
                style: isContrast
                  ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                  : { background: 'linear-gradient(90deg, #db2777, #e11d48)', color: '#ffffff' }
              }, tr('baking.diagnosis.check', 'Check answer') + ' \uD83D\uDD0E'),
              revealed && h('button', {
                type: 'button',
                onClick: nextScenario,
                className: 'px-5 py-2.5 rounded-full font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer',
                style: isContrast
                  ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                  : { background: 'linear-gradient(90deg, #db2777, #e11d48)', color: '#ffffff' }
              }, tr('baking.diagnosis.next', 'Next scenario') + ' \u2192')
            ),
            // Best-streak note
            ext.diagBestStreak > 0 && h('div', { className: 'mt-4 text-center text-[0.6875rem]', style: { color: themeMuted } },
              tr('baking.diagnosis.best_streak', 'Best streak this session: {n}', { n: ext.diagBestStreak })
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 6: GLUTEN LAB
        // ═══════════════════════════════════════
        var renderGluten = function() {
          var protein   = (typeof d.glutenProtein === 'number' && isFinite(d.glutenProtein)) ? d.glutenProtein : 11;
          var hydration = (typeof d.glutenHydration === 'number' && isFinite(d.glutenHydration)) ? d.glutenHydration : 65;
          var knead     = (typeof d.glutenKnead === 'number' && isFinite(d.glutenKnead)) ? d.glutenKnead : 5;

          // Factor model (each 0-1); final strength = product * 100.
          // protein → gluten potential
          var glutenPotential = Math.max(0, Math.min(1, (protein - 6) / 9.5));
          // hydration → sweet spot 55-75%, drops at extremes
          var hydrationFactor;
          if (hydration < 50)      hydrationFactor = Math.max(0, (hydration - 30) / 20 * 0.8 + 0.1);
          else if (hydration <= 75) hydrationFactor = 1.0;
          else                      hydrationFactor = Math.max(0.5, 1.0 - (hydration - 75) / 50);
          // knead → rises fast, plateaus ~10-15 min, declines past 15 (over-kneaded)
          var kneadFactor;
          if (knead <= 10)      kneadFactor = 0.1 + (knead / 10) * 0.9;
          else if (knead <= 15) kneadFactor = 1.0;
          else                  kneadFactor = Math.max(0.3, 1.0 - (knead - 15) / 10);

          var strength = Math.round(glutenPotential * hydrationFactor * kneadFactor * 100);
          var overworked = knead > 15 && glutenPotential > 0.45;

          // Pedagogical verdict + best-use suggestion
          var verdictLabel, verdictTone;
          if (overworked && strength > 45) { verdictLabel = tr('baking.gluten.verdict_overworked', 'Over-kneaded \u2014 may turn tough'); verdictTone = 'red'; }
          else if (strength < 15) { verdictLabel = tr('baking.gluten.verdict_none',   'Barely any gluten \u2014 great for pie crust or pastry'); verdictTone = 'slate'; }
          else if (strength < 35) { verdictLabel = tr('baking.gluten.verdict_weak',   'Tender and soft \u2014 think cake or muffins'); verdictTone = 'teal'; }
          else if (strength < 60) { verdictLabel = tr('baking.gluten.verdict_medium', 'Some chew \u2014 enriched breads, pasta'); verdictTone = 'teal'; }
          else if (strength < 85) { verdictLabel = tr('baking.gluten.verdict_strong', 'Strong and elastic \u2014 artisan bread, pizza'); verdictTone = 'emerald'; }
          else                    { verdictLabel = tr('baking.gluten.verdict_peak',   'Maximum gluten \u2014 hand-pulled noodles, bagels'); verdictTone = 'emerald'; }

          // Build SVG strand network: count scales with protein; thickness with hydration; wave amplitude inverse to knead.
          var strandCount = Math.max(3, Math.round(3 + glutenPotential * 7));
          var thickness = 1 + hydrationFactor * 2.5;
          var amp = Math.max(0, (1 - kneadFactor) * 14);
          var strokeColor;
          if (overworked) strokeColor = '#dc2626';
          else if (strength < 20) strokeColor = '#94a3b8';
          else if (strength < 55) strokeColor = '#14b8a6';
          else strokeColor = '#059669';

          var svgW = 320, svgH = 150;
          var strandPaths = [];
          for (var si = 0; si < strandCount; si++) {
            var y = 15 + (si + 0.5) * ((svgH - 30) / strandCount);
            var phase = si * 0.7;
            var seg = 'M 10 ' + y.toFixed(1);
            for (var sx = 30; sx <= svgW - 10; sx += 20) {
              var offY = Math.sin((sx * 0.08) + phase) * amp;
              seg += ' Q ' + (sx - 10).toFixed(1) + ' ' + (y + Math.cos((sx * 0.08) + phase) * amp).toFixed(1) + ', ' + sx + ' ' + (y + offY).toFixed(1);
            }
            strandPaths.push(seg);
          }

          // Deterministic disulfide crosslinks so SVG doesn't jitter on unrelated re-renders
          var crosslinks = [];
          if (strength > 25 && strandCount > 2) {
            var linkCount = Math.round(strength / 9);
            for (var li = 0; li < linkCount; li++) {
              var lsi = (li * 3 + strandCount) % (strandCount - 1);
              var lx = 26 + ((li * 47 + Math.round(protein * 11)) % (svgW - 52));
              var y1 = 15 + (lsi + 0.5) * ((svgH - 30) / strandCount);
              var y2 = 15 + (lsi + 1.5) * ((svgH - 30) / strandCount);
              crosslinks.push({ x: lx, y1: y1, y2: y2 });
            }
          }

          // Distance to each preset target (for "how close am I?" readout on match buttons)
          var distanceToTarget = function(target) {
            var dp = Math.abs(protein - target.protein);
            var dh = Math.abs(hydration - target.hydration) / 10; // hydration is 0-100, scale so 10% ~= 1 protein unit
            var dk = Math.abs(knead - target.knead) / 2;
            return Math.round(dp + dh + dk);
          };

          var applyTarget = function(tgt) {
            updMulti({ glutenProtein: tgt.protein, glutenHydration: tgt.hydration, glutenKnead: tgt.knead });
            upd('glutenLastTarget', tgt.id);
            playBeep('click');
            announceToSR && announceToSR('Loaded ' + tgt.label + ' preset.');
          };

          var matchTarget = function() {
            // Award "match" if strength is within 10 of any target's expected strength using the same formula.
            var bestMatch = null;
            var bestDist = Infinity;
            GLUTEN_TARGETS.forEach(function(tgt) {
              var dist = distanceToTarget(tgt);
              if (dist < bestDist) { bestDist = dist; bestMatch = tgt; }
            });
            if (bestMatch && bestDist <= 4) {
              updExt({ glutenMatches: (ext.glutenMatches || 0) + 1, glutenExplorations: (ext.glutenExplorations || 0) + 1 });
              awardXP && awardXP(15, 'Matched a gluten target');
              celebrate && celebrate();
              playBeep('success');
              addToast && addToast('\u2728 ' + tr('baking.gluten.match_toast', 'You matched {label}!', { label: bestMatch.label }), 'success');
            } else {
              updExt({ glutenExplorations: (ext.glutenExplorations || 0) + 1 });
              awardXP && awardXP(3, 'Explored a gluten combination');
              playBeep('click');
              addToast && addToast(tr('baking.gluten.no_match_toast', 'Close to {label}, but not a match yet.', { label: bestMatch ? bestMatch.label : '' }), 'info');
            }
          };

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('gluten'),
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#2dd4bf' : '#115e59') } }, '\uD83E\uDDF5 ' + tr('baking.activities.gluten_label', 'Gluten Lab')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.gluten.tagline', 'Three variables decide how much gluten forms in your dough.'))
              ),
              backBtn('teal')
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Controls column
              h('div', { className: 'space-y-4', style: { minWidth: 0 } },
                // Flour protein
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'glu-protein', className: 'text-xs font-bold uppercase tracking-wider flex items-center gap-1', style: { color: isContrast ? '#ffff00' : (isDark ? '#2dd4bf' : '#0f766e') } },
                      '\uD83C\uDF3E ', tr('baking.gluten.protein', 'Flour protein')
                    ),
                    h('span', { className: 'text-sm font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#2dd4bf' : '#0f766e') } }, protein.toFixed(1) + '%')
                  ),
                  h('input', {
                    id: 'glu-protein',
                    type: 'range',
                    min: 7, max: 15, step: 0.5,
                    value: protein,
                    onChange: function(e) { upd('glutenProtein', parseFloat(e.target.value)); },
                    className: 'w-full accent-teal-500'
                  }),
                  // Flour preset chips
                  h('div', { className: 'mt-2 flex flex-wrap gap-1' },
                    FLOUR_PRESETS.map(function(fp) {
                      var active = Math.abs(fp.protein - protein) < 0.3;
                      return h('button', {
                        key: fp.id,
                        type: 'button',
                        onClick: function() { upd('glutenProtein', fp.protein); },
                        className: 'px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold transition-colors border cursor-pointer',
                        style: active
                          ? { background: isContrast ? '#000000' : '#0f766e', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#0f766e' }
                          : { background: themeSubtle, color: themeInk, borderColor: themeBorder }
                      }, fp.label);
                    })
                  )
                ),
                // Hydration
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'glu-hydration', className: 'text-xs font-bold uppercase tracking-wider flex items-center gap-1', style: { color: isContrast ? '#ffff00' : (isDark ? '#38bdf8' : '#0369a1') } },
                      '\uD83D\uDCA7 ', tr('baking.gluten.hydration', 'Hydration')
                    ),
                    h('span', { className: 'text-sm font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#38bdf8' : '#0369a1') } }, hydration + '%')
                  ),
                  h('input', {
                    id: 'glu-hydration',
                    type: 'range',
                    min: 30, max: 110, step: 1,
                    value: hydration,
                    onChange: function(e) { upd('glutenHydration', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-sky-500'
                  }),
                  h('div', { className: 'mt-1 flex justify-between text-[0.6875rem]', style: { color: themeMuted } },
                    h('span', null, tr('baking.gluten.hydr_dry', 'Stiff')),
                    h('span', null, tr('baking.gluten.hydr_sweet', 'Sweet spot')),
                    h('span', null, tr('baking.gluten.hydr_wet', 'Batter'))
                  )
                ),
                // Knead time
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'glu-knead', className: 'text-xs font-bold uppercase tracking-wider flex items-center gap-1', style: { color: isContrast ? '#ffff00' : (isDark ? '#34d399' : '#047857') } },
                      '\uD83D\uDD50 ', tr('baking.gluten.knead', 'Knead time')
                    ),
                    h('span', { className: 'text-sm font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#34d399' : '#047857') } }, knead + ' min')
                  ),
                  h('input', {
                    id: 'glu-knead',
                    type: 'range',
                    min: 0, max: 20, step: 1,
                    value: knead,
                    onChange: function(e) { upd('glutenKnead', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-emerald-500'
                  }),
                  overworked && h('div', { className: 'mt-1 text-[0.6875rem] font-bold flex items-center gap-1', style: { color: isContrast ? '#ffff00' : '#dc2626' } },
                    '\u26A0\uFE0F ', tr('baking.gluten.over_warning', 'Past 15 min risks over-kneading.')
                  )
                ),
                h('button', {
                  type: 'button',
                  onClick: matchTarget,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer',
                  style: isContrast
                    ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                    : { background: 'linear-gradient(90deg, #0f766e, #047857)', color: '#ffffff' }
                }, tr('baking.gluten.check_btn', 'Check against targets') + ' \uD83C\uDFAF')
              ),
              // Visualization column
              h('div', {
                className: 'rounded-2xl border-2 p-4 space-y-3',
                style: isContrast
                  ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                  : (isDark
                    ? { background: '#172033', borderColor: '#0f766e', color: '#f8fafc' }
                    : { background: 'linear-gradient(145deg, #f0fdfa 0%, #ecfdf5 100%)', borderColor: '#2dd4bf', color: '#1e1b18' })
              },
                h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#2dd4bf' : '#0f766e') } }, tr('baking.gluten.network', 'Gluten network')),
                  h('div', { className: 'text-3xl font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#2dd4bf' : '#0f766e') } }, strength + '/100')
                ),
                // SVG strand visualization with microscopic frame & disulfide crosslink nodes
                h('div', {
                  className: 'rounded-xl border p-2',
                  style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff'), borderColor: themeBorder }
                },
                  h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: '150', role: 'img', 'aria-label': 'Gluten strand network, strength ' + strength + ' out of 100' },
                    !isContrast && h('defs', null,
                      h('radialGradient', { id: 'bkGlutenField', cx: '50%', cy: '48%', r: '62%' },
                        h('stop', { offset: '0%', stopColor: isDark ? '#134e4a' : '#f0fdfa', stopOpacity: isDark ? 0.25 : 0.75 }),
                        h('stop', { offset: '100%', stopColor: isDark ? '#0f172a' : '#e2e8f0', stopOpacity: 0.2 })
                      )
                    ),
                    !isContrast && h('rect', { x: 2, y: 2, width: svgW - 4, height: svgH - 4, rx: 8, fill: 'url(#bkGlutenField)' }),
                    // Elastic gluten-network strands with layered 3D depth shadow & animated tensile filament sheen
                    strandPaths.map(function(p, i) {
                      var col = isContrast ? (overworked ? '#ffff00' : '#00ff00') : strokeColor;
                      var op = isContrast ? 1 : (0.45 + hydrationFactor * 0.5);
                      var tensileDur = Math.max(1.8, 4.4 - (strength / 42)).toFixed(2) + 's';
                      return h('g', { key: 'sp' + i },
                        !isContrast && h('path', { d: p, stroke: '#0f172a', strokeWidth: thickness + 2, fill: 'none', strokeLinecap: 'round', opacity: 0.1, transform: 'translate(0, 2.2)' }),
                        h('path', { d: p, stroke: col, strokeWidth: thickness, fill: 'none', strokeLinecap: 'round', opacity: op }),
                        !isContrast && thickness >= 2 && h('path', { d: p, stroke: '#ffffff', strokeWidth: Math.max(0.8, thickness * 0.28), fill: 'none', strokeLinecap: 'round', opacity: 0.42, transform: 'translate(0, -0.8)' }),
                        !isContrast && strength >= 18 && h('path', {
                          d: p,
                          stroke: overworked ? '#fecaca' : '#ccfbf1',
                          strokeWidth: Math.max(0.9, thickness * 0.36),
                          fill: 'none',
                          strokeLinecap: 'round',
                          strokeDasharray: '10 38',
                          opacity: Math.min(0.75, 0.28 + strength / 160),
                          className: 'bk-gluten-tensile bk-motion-deco',
                          style: { animationDuration: tensileDur, animationDelay: (i * 0.24) + 's' }
                        })
                      );
                    }),
                    // Glowing disulfide (S-S) crosslinks with pulsing specular junction nodes
                    crosslinks.map(function(c, i) {
                      var col = isContrast ? '#ffff00' : strokeColor;
                      return h('g', { key: 'cl' + i },
                        !isContrast && h('line', { x1: c.x, y1: c.y1, x2: c.x + 5, y2: c.y2, stroke: col, strokeWidth: Math.max(3.5, thickness * 1.4), opacity: 0.22, strokeLinecap: 'round', className: 'bk-crosslink-pulse bk-motion-deco', style: { animationDelay: (i * 0.28) + 's' } }),
                        h('line', {
                          x1: c.x, y1: c.y1, x2: c.x + 5, y2: c.y2,
                          stroke: col,
                          strokeWidth: Math.max(1.3, thickness * 0.58),
                          strokeLinecap: 'round',
                          opacity: isContrast ? 1 : 0.78
                        }),
                        !isContrast && h('circle', { cx: c.x, cy: c.y1, r: 4.8, fill: col, opacity: 0.22, className: 'bk-beacon bk-motion-deco', style: { animationDelay: (i * 0.32) + 's' } }),
                        h('circle', { cx: c.x, cy: c.y1, r: 2.6, fill: col, stroke: '#ffffff', strokeWidth: 0.6 }),
                        h('circle', { cx: c.x + 5, cy: c.y2, r: 2.6, fill: col, stroke: '#ffffff', strokeWidth: 0.6 })
                      );
                    }),
                    !isContrast && h('g', { className: 'bk-motion-deco' },
                      h('circle', { cx: svgW - 14, cy: 141, r: 4.5, fill: '#0ea5e9', opacity: 0.28, className: 'bk-beacon' }),
                      h('circle', { cx: svgW - 14, cy: 141, r: 2.1, fill: '#0ea5e9' })
                    ),
                    h('text', { x: 10, y: 144, fontSize: 8.5, fontWeight: 700, fill: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#475569') },
                      strandCount + ' protein strands \u00B7 ' + crosslinks.length + ' disulfide crosslinks'
                    )
                  )
                ),
                // Verdict banner
                h('div', {
                  className: 'rounded-xl border-2 p-3',
                  style: {
                    background: themeCard,
                    borderColor: verdictTone === 'red' ? '#dc2626' : (isContrast ? '#00ff00' : '#14b8a6'),
                    color: themeInk
                  }
                },
                  h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider mb-0.5', style: { color: themeMuted } }, tr('baking.gluten.verdict', 'Best for')),
                  h('div', { className: 'text-sm font-bold', style: { color: themeInk } }, verdictLabel)
                ),
                // Factor breakdown mini-bars
                h('div', { className: 'space-y-1.5' },
                  [
                    { label: tr('baking.gluten.protein',   'Flour protein'), val: glutenPotential, fill: isContrast ? '#00ff00' : '#14b8a6' },
                    { label: tr('baking.gluten.hydration', 'Hydration'),     val: hydrationFactor,  fill: isContrast ? '#ffff00' : '#0ea5e9' },
                    { label: tr('baking.gluten.knead',     'Knead time'),    val: kneadFactor,      fill: isContrast ? '#00ff00' : '#10b981' }
                  ].map(function(f, i) {
                    return h('div', { key: i, className: 'flex items-center gap-2 text-[0.6875rem]' },
                      h('div', { className: 'w-24 font-bold shrink-0', style: { color: themeInk } }, f.label),
                      h('div', { className: 'flex-grow h-2 rounded-full overflow-hidden', style: { background: isContrast ? '#333333' : (isDark ? '#334155' : '#e2e8f0') } },
                        h('div', { className: 'h-full transition-all', style: { width: Math.round(f.val * 100) + '%', background: f.fill } })
                      ),
                      h('div', { className: 'w-10 text-right tabular-nums font-bold', style: { color: themeInk } }, Math.round(f.val * 100) + '%')
                    );
                  })
                )
              )
            ),
            // Target recipe buttons
            h('div', { className: 'mt-5 rounded-2xl border-2 p-3', style: cardSurfaceStyle },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#2dd4bf' : '#0f766e') } }, tr('baking.gluten.try_target', 'Try to match a target')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                GLUTEN_TARGETS.map(function(tgt) {
                  var dist = distanceToTarget(tgt);
                  var match = dist <= 4;
                  return h('button', {
                    key: tgt.id,
                    type: 'button',
                    onClick: function() { applyTarget(tgt); },
                    className: 'text-left rounded-xl border-2 p-2.5 transition-all cursor-pointer',
                    style: match
                      ? { background: isContrast ? '#000000' : (isDark ? '#064e3b' : '#ecfdf5'), borderColor: isContrast ? '#00ff00' : '#10b981', color: themeInk }
                      : { background: themeSubtle, borderColor: themeBorder, color: themeInk },
                    title: tgt.note
                  },
                    h('div', { className: 'text-sm font-black', style: { color: match ? (isContrast ? '#00ff00' : (isDark ? '#a7f3d0' : '#065f46')) : themeInk } }, tgt.label),
                    h('div', { className: 'text-[0.6875rem] mt-0.5 leading-snug', style: { color: themeMuted } }, __alloT('stem.bakingscience.' + (tgt.id) + '_note', tgt.note)),
                    h('div', { className: 'mt-1 text-[0.6875rem] font-bold', style: { color: match ? (isContrast ? '#00ff00' : (isDark ? '#34d399' : '#047857')) : themeMuted } },
                      match ? ('\u2713 ' + tr('baking.gluten.match', 'Match!')) : (tr('baking.gluten.distance', 'Distance: {n}', { n: dist }))
                    )
                  );
                })
              )
            ),
            // Science disclosure
            h('details', { className: 'mt-6 rounded-xl border p-4', style: { background: themeSubtle, borderColor: themeBorder } },
              h('summary', { className: 'cursor-pointer font-bold text-sm', style: { color: isContrast ? '#ffff00' : (isDark ? '#2dd4bf' : '#115e59') } }, '\uD83D\uDCD6 ' + tr('baking.gluten.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm space-y-2', style: { color: themeInk } },
                h('p', null, h('strong', null, tr('baking.gluten.sci_proteins', 'Two proteins, one network')), __alloT('stem.bakingscience.wheat_flour_has_two_proteins', ': wheat flour has two proteins \u2014 '), h('em', null, 'glutenin'), ' and ', h('em', null, 'gliadin'), __alloT('stem.bakingscience.when_you_add_water_they_link_up_into_l', '. When you add water, they link up into long, elastic strands called '), h('strong', null, 'gluten'), __alloT('stem.bakingscience.more_protein_in_the_flour_more_gluten_', '. More protein in the flour = more gluten potential.')),
                h('p', null, h('strong', null, tr('baking.gluten.sci_hydration', 'Water is the switch')), __alloT('stem.bakingscience.without_enough_water_the_proteins_can_', ': without enough water the proteins can\u2019t unfold and meet each other; too much water and they\u2019re diluted into a soup. The sweet spot for most breads is 60\u201375% hydration.')),
                h('p', null, h('strong', null, tr('baking.gluten.sci_knead', 'Kneading aligns the strands')), __alloT('stem.bakingscience.each_fold_and_stretch_aligns_the_prote', ': each fold and stretch aligns the proteins into parallel sheets. Early kneading builds rapidly; past about 10\u201315 minutes the network plateaus and eventually tears itself apart (over-kneading).')),
                h('p', null, h('strong', null, tr('baking.gluten.sci_tender', 'Tenderness = less gluten')), __alloT('stem.bakingscience.cakes_cookies_and_pie_crusts_use_low_p', ': cakes, cookies, and pie crusts use low-protein flour and minimal mixing. Fat also '), h('em', null, 'shortens'), __alloT('stem.bakingscience.gluten_strands_that_s_why_butter_makes', ' gluten strands \u2014 that\u2019s why butter makes pastry flaky.'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 7: BROWNING LAB
        // ═══════════════════════════════════════
        var renderBrowning = function() {
          var foodId = d.brownFood || 'chicken';
          var food = BROWN_FOODS.filter(function(f) { return f.id === foodId; })[0] || BROWN_FOODS[0];
          var temp = (typeof d.brownTemp === 'number' && isFinite(d.brownTemp)) ? d.brownTemp : 350;
          var minutes = (typeof d.brownTime === 'number' && isFinite(d.brownTime)) ? d.brownTime : 5;
          var dry = !!d.brownDry;

          // Browning physics (simplified):
          // - wet surface at <212F: no browning at all (water evaporating)
          // - Maillard activation above ~285F, scales to ~380F
          // - Caramelization activation above ~320F, scales to ~390F
          // - past 410F, pyrolysis/burn overtakes flavor
          var maillardRate = 0, caramelRate = 0, burnRate = 0;
          if (temp < 212 && !dry) {
            maillardRate = 0; caramelRate = 0;
          } else {
            if (temp >= 285) maillardRate = Math.min(1, (temp - 285) / 95) * food.protein;
            if (temp >= 320) caramelRate  = Math.min(1, (temp - 320) / 70) * food.sugars;
            if (!dry && temp < 250) { maillardRate *= 0.3; caramelRate *= 0.3; }
            if (temp >= 400) burnRate = Math.min(1, (temp - 400) / 50);
          }

          // Progression over time (0-1)
          var mProgress = Math.min(1, maillardRate * (minutes / 12));
          var cProgress = Math.min(1, caramelRate  * (minutes / 12));
          var burnProgress = Math.min(1, burnRate  * (minutes / 6));
          var totalBrown = Math.max(mProgress, cProgress);
          var colorProgress = Math.min(1, totalBrown + burnProgress * 0.5);
          var isBurnt = burnProgress > 0.4;

          // Dominant reaction
          var totalRate = maillardRate + caramelRate;
          var maillardShare = totalRate > 0 ? maillardRate / totalRate : 0;
          var caramelShare  = totalRate > 0 ? caramelRate  / totalRate : 0;

          // Color interpolation: raw -> done -> char
          var mixColors = function(c1, c2, t) {
            var p = function(c) { return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; };
            var a = p(c1), b = p(c2);
            var r = Math.round(a[0] + (b[0]-a[0]) * t);
            var g = Math.round(a[1] + (b[1]-a[1]) * t);
            var bl = Math.round(a[2] + (b[2]-a[2]) * t);
            return 'rgb(' + r + ',' + g + ',' + bl + ')';
          };
          var foodColor;
          if (isBurnt) foodColor = mixColors(food.doneColor, food.charColor, Math.min(1, (burnProgress - 0.4) / 0.6));
          else         foodColor = mixColors(food.rawColor, food.doneColor, colorProgress);

          // Verdict
          var verdict, verdictTone;
          if (temp < 212 && !dry) { verdict = tr('baking.browning.verdict_wet', 'Surface too wet \u2014 water has to evaporate before browning starts.'); verdictTone = 'slate'; }
          else if (totalBrown < 0.1) { verdict = tr('baking.browning.verdict_raw', 'No browning yet. Crank up the temperature or give it more time.'); verdictTone = 'slate'; }
          else if (totalBrown < 0.35) { verdict = tr('baking.browning.verdict_light', 'Lightly colored. Pale golden \u2014 needs a bit more time or heat.'); verdictTone = 'amber'; }
          else if (totalBrown >= 0.5 && totalBrown <= 0.85 && !isBurnt) { verdict = tr('baking.browning.verdict_perfect', 'Golden perfection! Rich color, complex flavor.'); verdictTone = 'emerald'; }
          else if (totalBrown > 0.85 && !isBurnt) { verdict = tr('baking.browning.verdict_deep', 'Deep color \u2014 almost too far. Pull it now.'); verdictTone = 'amber'; }
          else if (isBurnt) { verdict = tr('baking.browning.verdict_burnt', 'Burnt \u2014 bitter, acrid compounds have formed.'); verdictTone = 'red'; }
          else { verdict = tr('baking.browning.verdict_ok', 'Coming along nicely.'); verdictTone = 'amber'; }

          // Flavor words: sample from the dominant pool plus one from the minority
          var flavors = [];
          if (maillardShare > 0.15 && totalBrown > 0.15) {
            var mCount = Math.max(1, Math.round(maillardShare * (isBurnt ? 2 : 4)));
            for (var mi = 0; mi < mCount; mi++) flavors.push(MAILLARD_FLAVORS[(mi + Math.floor(totalBrown * 7)) % MAILLARD_FLAVORS.length]);
          }
          if (caramelShare > 0.15 && totalBrown > 0.15) {
            var cCount = Math.max(1, Math.round(caramelShare * (isBurnt ? 2 : 4)));
            for (var ci = 0; ci < cCount; ci++) flavors.push(CARAMEL_FLAVORS[(ci + Math.floor(totalBrown * 5)) % CARAMEL_FLAVORS.length]);
          }
          if (isBurnt) flavors = ['bitter', 'acrid', 'burnt'];
          // Dedupe
          flavors = flavors.filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 5);

          var cook = function() {
            var perfect = totalBrown >= 0.5 && totalBrown <= 0.85 && !isBurnt && temp > 212;
            var attempts = (ext.browningAttempts || 0) + 1;
            if (perfect) {
              var perf = (ext.browningPerfections || 0) + 1;
              updExt({ browningAttempts: attempts, browningPerfections: perf });
              awardXP && awardXP(15, 'Browned to perfection');
              celebrate && celebrate();
              playBeep('success');
              addToast && addToast('\u2728 ' + tr('baking.browning.perfect_toast', 'Golden! You nailed {label}.', { label: food.label }), 'success');
            } else if (isBurnt) {
              updExt({ browningAttempts: attempts });
              playBeep('fail');
              addToast && addToast(tr('baking.browning.burnt_toast', 'Burnt. Lower the temperature or pull sooner.'), 'info');
            } else {
              updExt({ browningAttempts: attempts });
              playBeep('click');
              addToast && addToast(tr('baking.browning.more_toast', 'Not quite golden yet \u2014 adjust and cook again.'), 'info');
            }
            announceToSR && announceToSR(verdict);
          };

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('browning'),
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#9a3412') } }, '\uD83E\uDD69 ' + tr('baking.activities.browning_label', 'Browning Lab')),
                h('p', { className: 'text-xs', style: { color: themeMuted } }, tr('baking.browning.tagline', 'Maillard reactions vs. caramelization. Different foods brown in different ways.'))
              ),
              backBtn('orange')
            ),
            // Food picker
            h('div', { className: 'mb-4 rounded-2xl border-2 p-3', style: cardSurfaceStyle },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } }, tr('baking.browning.pick_food', 'Pick a food')),
              h('div', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-2' },
                BROWN_FOODS.map(function(f) {
                  var active = f.id === foodId;
                  return h('button', {
                    key: f.id,
                    type: 'button',
                    onClick: function() { upd('brownFood', f.id); playBeep('click'); },
                    className: 'rounded-xl border-2 p-2 text-center text-xs font-bold transition-all cursor-pointer',
                    style: active
                      ? { background: isContrast ? '#000000' : '#c2410c', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#9a3412' }
                      : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                    'aria-pressed': active,
                    'aria-label': f.label
                  },
                    h('div', { className: 'text-2xl mb-1', 'aria-hidden': true }, f.emoji),
                    f.label
                  );
                })
              )
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Controls
              h('div', { className: 'space-y-4', style: { minWidth: 0 } },
                // Temp
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'br-temp', className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#c2410c') } }, '\uD83C\uDF21\uFE0F ' + tr('baking.browning.temp', 'Temperature')),
                    h('span', { className: 'text-sm font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#fdba74' : '#c2410c') } }, temp + '\u00B0F')
                  ),
                  h('input', {
                    id: 'br-temp',
                    type: 'range',
                    min: 150, max: 450, step: 5,
                    value: temp,
                    onChange: function(e) { upd('brownTemp', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-orange-500'
                  }),
                  h('div', { className: 'mt-1 flex justify-between text-[0.6875rem]', style: { color: themeMuted } },
                    h('span', null, '150\u00B0F'),
                    h('span', null, __alloT('stem.bakingscience.285_m', '285 M')),
                    h('span', null, __alloT('stem.bakingscience.320_c', '320 C')),
                    h('span', null, __alloT('stem.bakingscience.400_burn', '400+ burn'))
                  )
                ),
                // Time
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'br-time', className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#b45309') } }, '\uD83D\uDD50 ' + tr('baking.browning.time', 'Time')),
                    h('span', { className: 'text-sm font-black tabular-nums', style: { color: isContrast ? '#00ff00' : (isDark ? '#fde68a' : '#b45309') } }, minutes + ' min')
                  ),
                  h('input', {
                    id: 'br-time',
                    type: 'range',
                    min: 0, max: 20, step: 1,
                    value: minutes,
                    onChange: function(e) { upd('brownTime', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-amber-500'
                  })
                ),
                // Moisture
                h('div', { className: 'rounded-2xl border-2 p-4', style: cardSurfaceStyle },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#38bdf8' : '#0369a1') } }, '\uD83D\uDCA7 ' + tr('baking.browning.moisture', 'Surface')),
                  h('div', { className: 'flex gap-1' },
                    [
                      { id: false, label: tr('baking.browning.wet', 'Wet') },
                      { id: true,  label: tr('baking.browning.dry', 'Dry (patted)') }
                    ].map(function(opt) {
                      var active = dry === opt.id;
                      return h('button', {
                        key: String(opt.id),
                        type: 'button',
                        onClick: function() { upd('brownDry', opt.id); playBeep('click'); },
                        className: 'flex-1 px-2 py-1.5 rounded-full text-xs font-bold transition-colors border cursor-pointer',
                        style: active
                          ? { background: isContrast ? '#000000' : '#0369a1', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#0369a1' }
                          : { background: themeSubtle, color: themeInk, borderColor: themeBorder },
                        'aria-pressed': active
                      }, opt.label);
                    })
                  ),
                  h('div', { className: 'mt-2 text-[0.6875rem] italic', style: { color: themeMuted } }, tr('baking.browning.moisture_hint', 'Wet surfaces can\u2019t exceed 212\u00B0F \u2014 water has to evaporate first.'))
                ),
                h('button', {
                  type: 'button',
                  onClick: cook,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer',
                  style: isContrast
                    ? { background: '#000000', color: '#00ff00', border: '2px solid #ffff00' }
                    : { background: 'linear-gradient(90deg, #c2410c, #b45309)', color: '#ffffff' }
                }, tr('baking.browning.cook_btn', 'Cook it') + ' \uD83D\uDD25')
              ),
              // Result + Thermal Reaction Curve SVG
              h('div', {
                className: 'rounded-2xl border-2 p-4 space-y-3',
                style: isContrast
                  ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
                  : (isDark
                    ? { background: '#172033', borderColor: '#c2410c', color: '#f8fafc' }
                    : { background: 'linear-gradient(145deg, #fff7ed 0%, #fffbeb 100%)', borderColor: '#fb923c', color: '#1e1b18' })
              },
                // Skillet Food Visual
                h('div', {
                  className: 'flex items-center justify-center h-28 rounded-xl border',
                  style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff'), borderColor: themeBorder }
                },
                  h('div', {
                    className: 'w-20 h-20 rounded-full shadow-inner flex items-center justify-center text-3xl transition-all border-2' + (!isContrast && totalBrown >= 0.35 && !isBurnt ? ' bk-skillet-sheen' : ''),
                    style: {
                      background: foodColor,
                      borderColor: isContrast ? '#ffff00' : '#9a3412',
                      boxShadow: isBurnt ? '0 0 20px rgba(60,20,8,0.5)' : (totalBrown > 0.5 ? '0 0 16px ' + foodColor.replace('rgb(', 'rgba(').replace(')', ',0.45)') : '')
                    },
                    'aria-label': food.label + ', ' + Math.round(colorProgress * 100) + ' percent browned'
                  },
                    h('span', { 'aria-hidden': true, style: { opacity: isBurnt ? 0.35 : 0.7 } }, food.emoji)
                  )
                ),
                // Live Thermal Reaction Kinetics Curve SVG (Maillard vs Caramelization vs Burn)
                (function() {
                  var xAt = function(tF) { return 24 + ((Math.max(150, Math.min(450, tF)) - 150) / 300) * 260; };
                  var yBase = 76;
                  var yTop = 18;
                  var mPeakY = yBase - Math.round(food.protein * (yBase - yTop));
                  var cPeakY = yBase - Math.round(food.sugars * (yBase - yTop));
                  var curX = xAt(temp);
                  return h('div', {
                    className: 'rounded-xl border p-1.5',
                    style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff'), borderColor: themeBorder }
                  },
                    h('svg', {
                      viewBox: '0 0 300 96',
                      width: '100%',
                      role: 'img',
                      'aria-label': tr('baking.browning.curve_aria', 'Reaction kinetics curve for {food} at {temp} degrees Fahrenheit', { food: food.label, temp: temp })
                    },
                      !isContrast && h('defs', null,
                        h('linearGradient', { id: 'bkMaillardFill', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: '#dc2626', stopOpacity: 0.24 }),
                          h('stop', { offset: '100%', stopColor: '#dc2626', stopOpacity: 0.01 })
                        ),
                        h('linearGradient', { id: 'bkCaramelFill', x1: '0', y1: '0', x2: '0', y2: '1' },
                          h('stop', { offset: '0%', stopColor: '#f59e0b', stopOpacity: 0.24 }),
                          h('stop', { offset: '100%', stopColor: '#f59e0b', stopOpacity: 0.01 })
                        )
                      ),
                      // Calibrated axis frame
                      h('line', { x1: 24, y1: yBase, x2: 284, y2: yBase, stroke: isContrast ? '#ffff00' : (isDark ? '#64748b' : '#94a3b8'), strokeWidth: 1.2 }),
                      h('line', { x1: 24, y1: 12, x2: 24, y2: yBase, stroke: isContrast ? '#ffff00' : (isDark ? '#475569' : '#cbd5e1'), strokeWidth: 1 }),
                      // Wet cap dashed line at 212F
                      !dry && h('g', null,
                        h('line', { x1: xAt(212), y1: 12, x2: xAt(212), y2: yBase, stroke: isContrast ? '#00ff00' : '#0284c7', strokeWidth: 1.4, strokeDasharray: '3 2' }),
                        h('text', { x: xAt(212) + 3, y: 20, fontSize: 8, fontWeight: 700, fill: isContrast ? '#00ff00' : (isDark ? '#38bdf8' : '#0369a1') }, '212\u00B0F wet cap')
                      ),
                      // Maillard area & luminous curve (285F+)
                      !isContrast && h('path', {
                        d: 'M ' + xAt(285) + ' ' + yBase + ' Q ' + xAt(340) + ' ' + mPeakY + ', ' + xAt(420) + ' ' + mPeakY + ' L ' + xAt(450) + ' ' + (mPeakY + 8) + ' L ' + xAt(450) + ' ' + yBase + ' Z',
                        fill: 'url(#bkMaillardFill)'
                      }),
                      !isContrast && h('path', {
                        d: 'M ' + xAt(285) + ' ' + yBase + ' Q ' + xAt(340) + ' ' + mPeakY + ', ' + xAt(420) + ' ' + mPeakY + ' L ' + xAt(450) + ' ' + (mPeakY + 8),
                        fill: 'none', stroke: '#ef4444', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.16
                      }),
                      h('path', {
                        d: 'M ' + xAt(285) + ' ' + yBase + ' Q ' + xAt(340) + ' ' + mPeakY + ', ' + xAt(420) + ' ' + mPeakY + ' L ' + xAt(450) + ' ' + (mPeakY + 8),
                        fill: 'none',
                        stroke: isContrast ? '#00ff00' : '#dc2626',
                        strokeWidth: 2.3,
                        strokeLinecap: 'round'
                      }),
                      !isContrast && temp >= 285 && food.protein > 0 && h('path', {
                        d: 'M ' + xAt(285) + ' ' + yBase + ' Q ' + xAt(340) + ' ' + mPeakY + ', ' + xAt(420) + ' ' + mPeakY + ' L ' + xAt(450) + ' ' + (mPeakY + 8),
                        fill: 'none', stroke: '#fecaca', strokeWidth: 1.5, strokeLinecap: 'round', strokeDasharray: '8 28', opacity: 0.78, className: 'bk-kinetic-trace bk-motion-deco'
                      }),
                      // Caramelization area & luminous curve (320F+)
                      !isContrast && h('path', {
                        d: 'M ' + xAt(320) + ' ' + yBase + ' Q ' + xAt(365) + ' ' + cPeakY + ', ' + xAt(430) + ' ' + cPeakY + ' L ' + xAt(450) + ' ' + (cPeakY + 6) + ' L ' + xAt(450) + ' ' + yBase + ' Z',
                        fill: 'url(#bkCaramelFill)'
                      }),
                      !isContrast && h('path', {
                        d: 'M ' + xAt(320) + ' ' + yBase + ' Q ' + xAt(365) + ' ' + cPeakY + ', ' + xAt(430) + ' ' + cPeakY + ' L ' + xAt(450) + ' ' + (cPeakY + 6),
                        fill: 'none', stroke: '#f59e0b', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.18
                      }),
                      h('path', {
                        d: 'M ' + xAt(320) + ' ' + yBase + ' Q ' + xAt(365) + ' ' + cPeakY + ', ' + xAt(430) + ' ' + cPeakY + ' L ' + xAt(450) + ' ' + (cPeakY + 6),
                        fill: 'none',
                        stroke: isContrast ? '#ffff00' : '#d97706',
                        strokeWidth: 2.3,
                        strokeLinecap: 'round'
                      }),
                      !isContrast && temp >= 320 && food.sugars > 0 && h('path', {
                        d: 'M ' + xAt(320) + ' ' + yBase + ' Q ' + xAt(365) + ' ' + cPeakY + ', ' + xAt(430) + ' ' + cPeakY + ' L ' + xAt(450) + ' ' + (cPeakY + 6),
                        fill: 'none', stroke: '#fef08a', strokeWidth: 1.5, strokeLinecap: 'round', strokeDasharray: '8 28', opacity: 0.82, className: 'bk-kinetic-trace bk-motion-deco', style: { animationDelay: '0.6s' }
                      }),
                      // Burn / pyrolysis zone (400F+)
                      h('rect', { x: xAt(400), y: 12, width: xAt(450) - xAt(400), height: yBase - 12, fill: isContrast ? '#ffff00' : '#dc2626', opacity: isContrast ? 0.18 : 0.1, className: (!isContrast && temp >= 400) ? 'bk-oven-glow bk-motion-deco' : undefined }),
                      // Live temp cursor & concentric luminous pulsing beacon
                      h('line', { x1: curX, y1: 10, x2: curX, y2: yBase, stroke: isContrast ? '#ffff00' : (isDark ? '#f8fafc' : '#0f172a'), strokeWidth: 1.8, strokeDasharray: '2 2' }),
                      !isContrast && h('circle', { cx: curX, cy: yBase - Math.round(totalBrown * (yBase - yTop)), r: 7.5, fill: '#ea580c', opacity: 0.28, className: 'bk-beacon bk-motion-deco' }),
                      h('circle', { cx: curX, cy: yBase - Math.round(totalBrown * (yBase - yTop)), r: 4.2, fill: isContrast ? '#00ff00' : '#ea580c', stroke: '#ffffff', strokeWidth: 1.3 }),
                      !isContrast && h('circle', { cx: curX - 1.1, cy: yBase - Math.round(totalBrown * (yBase - yTop)) - 1.1, r: 1.1, fill: '#ffffff', opacity: 0.85 }),
                      // X-axis ticks
                      [150, 285, 320, 400, 450].map(function(tk) {
                        return h('text', { key: tk, x: xAt(tk), y: 90, textAnchor: 'middle', fontSize: 8, fontWeight: 700, fill: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#475569') }, tk + '\u00B0');
                      })
                    )
                  );
                })(),
                // Reaction share
                h('div', { className: 'space-y-1.5' },
                  h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider', style: { color: themeMuted } }, tr('baking.browning.reactions', 'Active reactions')),
                  h('div', { className: 'flex items-center gap-2 text-[0.6875rem]' },
                    h('div', { className: 'w-24 font-bold shrink-0', style: { color: isContrast ? '#00ff00' : (isDark ? '#f87171' : '#b91c1c') } }, tr('baking.browning.maillard', 'Maillard')),
                    h('div', { className: 'flex-grow h-2 rounded-full overflow-hidden', style: { background: isContrast ? '#333333' : (isDark ? '#334155' : '#e2e8f0') } },
                      h('div', { className: 'h-full transition-all', style: { width: Math.round(mProgress * 100) + '%', background: isContrast ? '#00ff00' : '#dc2626' } })
                    ),
                    h('div', { className: 'w-10 text-right tabular-nums font-bold', style: { color: themeInk } }, Math.round(mProgress * 100) + '%')
                  ),
                  h('div', { className: 'flex items-center gap-2 text-[0.6875rem]' },
                    h('div', { className: 'w-24 font-bold shrink-0', style: { color: isContrast ? '#ffff00' : (isDark ? '#fbbf24' : '#b45309') } }, tr('baking.browning.caramel', 'Caramelization')),
                    h('div', { className: 'flex-grow h-2 rounded-full overflow-hidden', style: { background: isContrast ? '#333333' : (isDark ? '#334155' : '#e2e8f0') } },
                      h('div', { className: 'h-full transition-all', style: { width: Math.round(cProgress * 100) + '%', background: isContrast ? '#ffff00' : '#d97706' } })
                    ),
                    h('div', { className: 'w-10 text-right tabular-nums font-bold', style: { color: themeInk } }, Math.round(cProgress * 100) + '%')
                  ),
                  burnProgress > 0 && h('div', { className: 'flex items-center gap-2 text-[0.6875rem]' },
                    h('div', { className: 'w-24 font-bold shrink-0', style: { color: isContrast ? '#ffff00' : (isDark ? '#fca5a5' : '#7f1d1d') } }, tr('baking.browning.burn', 'Burn / pyrolysis')),
                    h('div', { className: 'flex-grow h-2 rounded-full overflow-hidden', style: { background: isContrast ? '#333333' : (isDark ? '#334155' : '#e2e8f0') } },
                      h('div', { className: 'h-full transition-all', style: { width: Math.round(burnProgress * 100) + '%', background: isContrast ? '#ffff00' : '#991b1b' } })
                    ),
                    h('div', { className: 'w-10 text-right tabular-nums font-bold', style: { color: themeInk } }, Math.round(burnProgress * 100) + '%')
                  )
                ),
                // Flavor words
                flavors.length > 0 && h('div', null,
                  h('div', { className: 'text-[0.6875rem] font-bold uppercase tracking-wider mb-1', style: { color: themeMuted } }, tr('baking.browning.flavors', 'Flavor notes')),
                  h('div', { className: 'flex flex-wrap gap-1' },
                    flavors.map(function(fv, i) {
                      return h('span', {
                        key: i,
                        className: 'inline-block px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border',
                        style: isBurnt
                          ? { background: isContrast ? '#000000' : (isDark ? '#450a0a' : '#fee2e2'), color: isContrast ? '#ffff00' : (isDark ? '#fecaca' : '#991b1b'), borderColor: isContrast ? '#ffff00' : '#fca5a5' }
                          : { background: themeCard, color: isContrast ? '#00ff00' : (isDark ? '#fdba74' : '#9a3412'), borderColor: themeBorder }
                      }, fv);
                    })
                  )
                ),
                // Verdict
                h('div', {
                  className: 'rounded-xl border-2 p-3',
                  style: {
                    background: themeCard,
                    borderColor: verdictTone === 'red' ? '#dc2626' : (verdictTone === 'emerald' ? '#10b981' : themeBorder),
                    color: themeInk
                  }
                },
                  h('div', { className: 'text-sm font-bold', style: { color: themeInk } }, verdict)
                ),
                // Per-food note
                h('div', { className: 'text-[0.6875rem] italic', style: { color: themeMuted } }, food.note)
              )
            ),
            // Science
            h('details', { className: 'mt-6 rounded-xl border p-4', style: { background: themeSubtle, borderColor: themeBorder } },
              h('summary', { className: 'cursor-pointer font-bold text-sm', style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#7c2d12') } }, '\uD83D\uDCD6 ' + tr('baking.browning.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm space-y-2', style: { color: themeInk } },
                h('p', null, h('strong', null, tr('baking.browning.sci_maillard_title', 'Maillard reaction')), __alloT('stem.bakingscience.named_for_louis_camille_maillard_1912_', ': named for Louis-Camille Maillard (1912). Amino acids from proteins react with '), h('em', null, __alloT('stem.bakingscience.reducing_sugars', 'reducing sugars')), __alloT('stem.bakingscience.at_285_f_to_create_hundreds_of_new_fla', ' at ~285\u00B0F+ to create hundreds of new flavor and aroma compounds. Seared steak, toasted bread, roasted coffee, and browned butter all owe their flavor to Maillard.')),
                h('p', null, h('strong', null, tr('baking.browning.sci_caramel_title', 'Caramelization')), __alloT('stem.bakingscience.pure_sugars_melting_and_breaking_apart', ': pure sugars melting and breaking apart around 320\u00B0F+. No protein needed. Gives the pure sweet-amber character of caramel sauce, cr\u00E8me br\u00FBl\u00E9e tops, and roasted vegetables with high natural sugar.')),
                h('p', null, h('strong', null, tr('baking.browning.sci_water', 'The water rule')), __alloT('stem.bakingscience.neither_reaction_happens_below_212_f_b', ': neither reaction happens below 212\u00B0F because water caps the surface temperature. This is why patting chicken skin dry before searing is the difference between rubbery and crispy.')),
                h('p', null, h('strong', null, tr('baking.browning.sci_past_400', 'Past the sweet spot')), __alloT('stem.bakingscience.above_400_f_carbon_carbon_bonds_break_', ': above ~400\u00B0F, carbon-carbon bonds break into bitter, acrid pyrolysis products. You can smell it before you see it \u2014 burnt toast, scorched garlic, blackened coffee.'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // ROUTER
        // ═══════════════════════════════════════
        var _BK_SUBTOOL_IDS = SUBTOOLS.map(function (s) { return s.id; });
        function onBakeKey(e) {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          var tgt = e.target || {};
          var tn = (tgt.tagName || '').toUpperCase();
          if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
          var k = e.key;
          if (k >= '1' && k <= '9') {
            var idx = parseInt(k, 10) - 1;
            if (_BK_SUBTOOL_IDS[idx]) {
              e.preventDefault();
              upd('subtool', _BK_SUBTOOL_IDS[idx]);
              if (typeof announceToSR === 'function') announceToSR('Switched to ' + SUBTOOLS[idx].label + '.');
            }
          } else if (k === 'm' || k === 'M' || k === 'Escape') {
            if (subtool !== 'menu') {
              e.preventDefault();
              upd('subtool', 'menu');
              if (typeof announceToSR === 'function') announceToSR(__alloT('stem.bakingscience.sr_returned_to_menu', 'Returned to menu.'));
            }
          }
        }

        function makeAiPanel() {
          // Hidden when ctx hands no usable callGemini (AI off / blocked for students).
          if (typeof callGemini !== 'function') return null;
          var aiLevel = d.aiLevel || 'grade5';
          // Saved state is INPUT: `||` is a NULL guard, not a TYPE guard.
          var aiText = typeof d.aiExplain === 'string' ? d.aiExplain : '';
          var aiLoading = !!d.aiLoading;
          var aiError = typeof d.aiError === 'string' ? d.aiError : '';
          var LEVELS = [
            { id: 'plain', label: __alloT('stem.bakingscience.plain', 'Plain'), hint: __alloT('stem.bakingscience.using_simple_everyday_words_and_short_', 'using simple everyday words and short sentences') },
            { id: 'grade5', label: __alloT('stem.bakingscience.grade_5', 'Grade 5'), hint: __alloT('stem.bakingscience.for_a_5th_grade_student_brief_and_frie', 'for a 5th grade student, brief and friendly') },
            { id: 'hs', label: __alloT('stem.bakingscience.high_school', 'High School'), hint: __alloT('stem.bakingscience.for_a_high_school_chemistry_student_ac', 'for a high school chemistry student, accurate but accessible') }
          ];
          var curSub = SUBTOOLS.find(function (s) { return s.id === subtool; });
          function explain() {
            if (typeof callGemini !== 'function') { upd('aiError', 'AI tutor not available.'); return; }
            // Request-ID guard: prevents stale activity explanations from
            // overwriting newer context if student switches subtool /
            // reading level mid-fetch.
            window.__bakingAiReqId = (window.__bakingAiReqId || 0) + 1;
            var thisReqId = window.__bakingAiReqId;
            upd('aiLoading', true); upd('aiError', ''); upd('aiExplain', '');
            var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
            var prompt = 'Explain the science of this baking activity ' + lv.hint + '. '
              + 'Activity: ' + (curSub ? curSub.label + ' — ' + curSub.desc : 'Baking Lab menu') + '. '
              + 'In 3 short sentences: (1) What chemistry or physics is at play here? (2) What will the student observe? (3) One real-world kitchen tip this connects to. '
              + 'No markdown, no bullets, no headings. Plain prose.';
            callGemini(prompt, false, false, 0.5).then(function (resp) {
              if (thisReqId !== window.__bakingAiReqId) return;
              var rawResp = typeof resp === 'string' ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
              upd('aiExplain', String(rawResp).trim());
              upd('aiLoading', false);
              if (typeof announceToSR === 'function') announceToSR(__alloT('stem.bakingscience.sr_explanation_ready', 'Explanation ready.'));
            }).catch(function () {
              if (thisReqId !== window.__bakingAiReqId) return;
              upd('aiLoading', false);
              upd('aiError', 'Could not reach AI tutor. Try again in a moment.');
            });
          }
          return h('div', {
            className: 'p-3 rounded-xl border-2 mt-4',
            style: isContrast
              ? { background: '#000000', borderColor: '#ffff00', color: '#ffff00' }
              : (isDark
                ? { background: '#1e1b4b', borderColor: '#6d28d9', color: '#f5f3ff' }
                : { background: '#faf5ff', borderColor: '#e9d5ff', color: '#1e1b4b' }),
            role: 'region', 'aria-label': __alloT('stem.bakingscience.ai_baking_tutor', 'AI baking tutor')
          },
            h('div', { className: 'flex items-center flex-wrap gap-2 mb-1.5' },
              h('span', { className: 'text-sm font-bold', style: { color: isContrast ? '#ffff00' : (isDark ? '#ddd6fe' : '#6d28d9') } }, __alloT('stem.bakingscience.explain_at_my_level', '\u2728 Explain at my level')),
              h('div', { className: 'ml-auto flex gap-1', role: 'group', 'aria-label': __alloT('stem.bakingscience.reading_level', 'Reading level') },
                LEVELS.map(function (L) {
                  var active = aiLevel === L.id;
                  return h('button', {
                    key: L.id,
                    type: 'button',
                    onClick: function () { upd('aiLevel', L.id); },
                    'aria-label': 'Reading level: ' + L.label + (active ? ' (selected)' : ''),
                    'aria-pressed': active,
                    className: 'px-2 py-0.5 rounded text-[0.6875rem] font-bold border cursor-pointer',
                    style: active
                      ? { background: isContrast ? '#000000' : '#7c3aed', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#7c3aed' }
                      : { background: themeCard, color: isContrast ? '#ffff00' : (isDark ? '#ddd6fe' : '#6d28d9'), borderColor: isContrast ? '#ffff00' : '#7c3aed' }
                  }, L.label);
                })
              ),
              h('button', {
                type: 'button',
                onClick: explain,
                disabled: aiLoading,
                'aria-busy': aiLoading,
                'aria-label': 'Generate AI explanation at ' + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + ' level',
                className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold disabled:opacity-50 cursor-pointer',
                style: isContrast
                  ? { background: '#000000', color: '#00ff00', border: '1px solid #ffff00' }
                  : { background: '#7c3aed', color: '#ffffff' }
              }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
            ),
            aiError && h('p', { className: 'text-[0.6875rem]', style: { color: isContrast ? '#ffff00' : (isDark ? '#fda4af' : '#be123c') }, role: 'alert' }, aiError),
            aiText && h('p', { className: 'text-xs leading-relaxed rounded-lg p-2 border', style: { background: themeCard, color: themeInk, borderColor: themeBorder } }, aiText),
            !aiText && !aiLoading && !aiError && h('p', { className: 'text-[0.6875rem] italic', style: { color: themeMuted } }, __alloT('stem.bakingscience.click_explain_for_an_ai_breakdown_of_t', 'Click \u201CExplain\u201D for an AI breakdown of the current activity at your chosen reading level.'))
          );
        }

        function wrapWithA11y(child) {
          var content = subtool && subtool !== 'menu'
            ? h('div', {
                role: 'tabpanel',
                id: 'baking-panel-' + subtool,
                'aria-labelledby': 'baking-tab-' + subtool
              }, child)
            : child;
          return h('div', {
            className: 'outline-none focus:ring-4 focus:ring-amber-400 focus:ring-inset rounded-lg',
            'data-baking-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light'),
            style: { background: themeSurface, color: themeInk, border: '1px solid ' + themeBorder },
            role: 'region',
            'aria-label': 'Baking Lab. Keyboard shortcuts: 1 through ' + _BK_SUBTOOL_IDS.length + ' pick an activity, M or Escape returns to menu.',
            tabIndex: 0,
            onKeyDown: onBakeKey
          }, content, makeAiPanel());
        }

        // === H7b'' inquiry widget: caramel discovery ===
        function renderCaramelHunt() {
          var iq = d.caramelHunt || { temp: 330, time: 6, moisture: 'dry', hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('caramelHunt', Object.assign({}, iq, patch)); }
          // Sucrose caramelization begins ~320°F / 160°C — NOT 230°F. Below ~320°F sugar just
          // melts and stays raw. Stages: ~320-335 = light amber; ~335-360 = amber→mahogany;
          // >~365 = pyrolysis/burnt. (Matches this tool's own Browning Lab 320°F floor + kitchenLab.)
          // Time and dry heat accelerate browning.
          var moistureMult = iq.moisture === 'dry' ? 1.25 : 0.85;
          var thermalScore = Math.max(0, iq.temp - 320) * 0.018 * Math.sqrt(iq.time) * moistureMult;
          var stage = thermalScore < 0.3 ? 'raw' : (thermalScore < 1.0 ? 'light' : (thermalScore < 1.7 ? 'perfect' : 'burnt'));
          var stageMeta = {
            raw:     { label: __alloT('stem.bakingscience.raw_sugar', '⚪ Raw sugar'),      color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#78350f'), bg: isContrast ? '#000000' : (isDark ? '#1e293b' : '#fef3c7'), border: isContrast ? '#ffff00' : '#d97706', panFill: '#f8fafc', desc: __alloT('stem.bakingscience.below_caramelization_threshold_or_not_', 'Below caramelization threshold or not heated long enough.') },
            light:   { label: __alloT('stem.bakingscience.light_amber', '🟡 Light amber'),    color: isContrast ? '#00ff00' : (isDark ? '#fbbf24' : '#92400e'), bg: isContrast ? '#000000' : (isDark ? '#292013' : '#fef3c7'), border: isContrast ? '#00ff00' : '#f59e0b', panFill: '#fcd34d', desc: __alloT('stem.bakingscience.beginning_caramelization_color_and_fla', 'Beginning caramelization. Color and flavor still subtle.') },
            perfect: { label: __alloT('stem.bakingscience.perfect_caramel', '🟠 Perfect caramel'), color: isContrast ? '#00ff00' : (isDark ? '#fdba74' : '#7c2d12'), bg: isContrast ? '#000000' : (isDark ? '#3b1908' : '#ffedd5'), border: isContrast ? '#00ff00' : '#ea580c', panFill: '#b45309', desc: __alloT('stem.bakingscience.rich_amber_mahogany_full_caramel_flavo', 'Rich amber-mahogany, full caramel flavor compounds present.') },
            burnt:   { label: __alloT('stem.bakingscience.burnt_sugar', '⚫ Burnt sugar'),    color: isContrast ? '#ffff00' : (isDark ? '#fecaca' : '#18181b'), bg: isContrast ? '#000000' : (isDark ? '#27272a' : '#fef2f2'), border: isContrast ? '#ffff00' : '#52525b', panFill: '#27272a', desc: __alloT('stem.bakingscience.pyrolysis_dominates_bitter_acrid_sugar', 'Pyrolysis dominates — bitter, acrid; sugar molecules broken to char.') }
          }[stage];
          function logObs() {
            var obs = { t: iq.temp, m: iq.time, w: iq.moisture, stage: stage };
            setIQ({ log: (iq.log || []).concat([obs]).slice(-8) });
          }
          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto', style: rootCardStyle },
            renderSubtoolNav('caramelHunt'),
            h('div', { className: 'flex items-center justify-between mb-3 gap-2 flex-wrap' },
              h('div', { style: { minWidth: 0 } },
                h('h2', { className: 'text-xl sm:text-2xl font-black flex items-center gap-2', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#92400e') } }, __alloT('stem.bakingscience.caramel_discovery', '🍯 Caramel discovery')),
                h('p', { className: 'text-xs leading-relaxed mt-0.5', style: { color: themeMuted } },
                  'You are heating sugar. Adjust temperature, time, and moisture. The pan will show you one of four discrete stages (raw / light / perfect / burnt). There is no right answer and no reveal. Sweep the sliders. Log observations. Type what you discover.')
              ),
              backBtn('amber')
            ),
            // Discrete 4-stage Copper Saucepan SVG + Prominent Stage Marker
            h('div', { className: 'mb-4 p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center gap-4', style: { background: stageMeta.bg, borderColor: stageMeta.border } },
              h('svg', {
                viewBox: '0 0 140 84',
                width: 140,
                height: 84,
                className: 'shrink-0',
                role: 'img',
                'aria-label': 'Saucepan discrete stage: ' + stage
              },
                !isContrast && h('defs', null,
                  h('radialGradient', { id: 'bkCopperPan', cx: '36%', cy: '32%', r: '72%' },
                    h('stop', { offset: '0%', stopColor: '#fb923c' }),
                    h('stop', { offset: '55%', stopColor: '#b45309' }),
                    h('stop', { offset: '100%', stopColor: '#451a03' })
                  ),
                  h('radialGradient', { id: 'bkBurnerGlow', cx: '50%', cy: '50%', r: '50%' },
                    h('stop', { offset: '0%', stopColor: '#f97316', stopOpacity: Math.min(0.45, Math.max(0.08, (iq.temp - 200) / 360)).toFixed(2) }),
                    h('stop', { offset: '100%', stopColor: '#f97316', stopOpacity: 0 })
                  )
                ),
                // Warm burner heat halo under copper saucepan
                !isContrast && h('ellipse', { cx: 60, cy: 66, rx: 50, ry: 12, fill: 'url(#bkBurnerGlow)', className: 'bk-oven-glow bk-motion-deco' }),
                // Copper saucepan handle with metallic sheen
                h('line', { x1: 102, y1: 42, x2: 132, y2: 34, stroke: isContrast ? '#ffff00' : '#9a3412', strokeWidth: 6.5, strokeLinecap: 'round' }),
                !isContrast && h('line', { x1: 104, y1: 40.5, x2: 130, y2: 33, stroke: '#fed7aa', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.72 }),
                // Sculpted copper saucepan body
                h('ellipse', { cx: 60, cy: 48, rx: 46, ry: 22, fill: isContrast ? '#000000' : 'url(#bkCopperPan)', stroke: isContrast ? '#ffff00' : '#f59e0b', strokeWidth: 2.4 }),
                // Discrete 4-band sugar surface inside pan
                h('ellipse', { cx: 60, cy: 46, rx: 38, ry: 16, fill: isContrast ? (stage === 'raw' ? '#000000' : (stage === 'burnt' ? '#333333' : '#ffff00')) : stageMeta.panFill, stroke: isContrast ? '#00ff00' : '#78350f', strokeWidth: 1.5 }),
                !isContrast && stage !== 'burnt' && h('ellipse', { cx: 48, cy: 40, rx: 14, ry: 4.5, fill: '#ffffff', opacity: stage === 'raw' ? 0.35 : 0.28, className: (stage === 'light' || stage === 'perfect') ? 'bk-bar-sheen bk-motion-deco' : undefined }),
                // Discrete visual cues per stage (strictly 4 states)
                stage === 'raw' && h('g', { fill: isContrast ? '#ffff00' : '#cbd5e1' },
                  h('circle', { cx: 48, cy: 44, r: 2.2 }), h('circle', { cx: 60, cy: 48, r: 2.2 }), h('circle', { cx: 72, cy: 43, r: 2.2 }), h('circle', { cx: 56, cy: 41, r: 2 })
                ),
                stage === 'light' && h('path', { d: 'M 42 46 Q 60 52, 78 46', fill: 'none', stroke: isContrast ? '#000000' : '#fffbeb', strokeWidth: 2, opacity: 0.85, className: isContrast ? undefined : 'bk-bar-sheen' }),
                stage === 'perfect' && h('path', { d: 'M 40 45 Q 60 37, 80 45', fill: 'none', stroke: isContrast ? '#000000' : '#fef3c7', strokeWidth: 2.5, strokeLinecap: 'round', className: isContrast ? undefined : 'bk-bar-sheen' }),
                stage === 'burnt' && h('g', { stroke: isContrast ? '#ffff00' : '#94a3b8', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' },
                  h('path', { d: 'M 46 32 Q 42 20, 48 12', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0s' } }),
                  h('path', { d: 'M 62 30 Q 58 18, 64 10', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '0.55s' } }),
                  h('path', { d: 'M 76 32 Q 72 20, 78 12', className: isContrast ? undefined : 'bk-steam-drift', style: isContrast ? undefined : { animationDelay: '1.1s' } })
                )
              ),
              h('div', { className: 'text-center sm:text-left flex-1', style: { minWidth: 0 } },
                h('div', { className: 'text-lg font-black mb-1', style: { color: stageMeta.color } }, stageMeta.label),
                h('div', { className: 'text-xs leading-relaxed', style: { color: themeInk } }, stageMeta.desc)
              )
            ),
            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 rounded-xl border', style: cardSurfaceStyle },
              h('div', null,
                h('label', { htmlFor: 'ch-temp', className: 'block text-xs font-bold mb-1', style: { color: themeInk } },
                  'Temperature: ', h('span', { className: 'font-mono', style: { color: isContrast ? '#00ff00' : (isDark ? '#fbbf24' : '#b45309') } }, iq.temp + ' °F')),
                h('input', { id: 'ch-temp', type: 'range', min: 200, max: 400, step: 5, value: iq.temp,
                  onChange: function(e) { setIQ({ temp: parseInt(e.target.value, 10) }); },
                  className: 'w-full', 'aria-label': __alloT('stem.bakingscience.temperature', 'Temperature') })),
              h('div', null,
                h('label', { htmlFor: 'ch-time', className: 'block text-xs font-bold mb-1', style: { color: themeInk } },
                  'Time: ', h('span', { className: 'font-mono', style: { color: isContrast ? '#00ff00' : (isDark ? '#fbbf24' : '#b45309') } }, iq.time + ' min')),
                h('input', { id: 'ch-time', type: 'range', min: 0, max: 15, step: 1, value: iq.time,
                  onChange: function(e) { setIQ({ time: parseInt(e.target.value, 10) }); },
                  className: 'w-full', 'aria-label': __alloT('stem.bakingscience.time', 'Time') })),
              h('div', null,
                h('div', { className: 'text-xs font-bold mb-1', style: { color: themeInk } }, 'Moisture:'),
                h('div', { className: 'flex gap-1' },
                  ['dry', 'wet'].map(function(m) {
                    var active = iq.moisture === m;
                    return h('button', { key: m,
                      type: 'button',
                      onClick: function() { setIQ({ moisture: m }); },
                      'aria-pressed': active,
                      'aria-label': m === 'dry' ? __alloT('stem.bakingscience.moisture_dry', 'Dry moisture') : __alloT('stem.bakingscience.moisture_wet', 'Wet moisture'),
                      className: 'px-3 py-1 rounded text-xs font-bold border transition-colors cursor-pointer',
                      style: active
                        ? { background: isContrast ? '#000000' : '#b45309', color: isContrast ? '#00ff00' : '#ffffff', borderColor: isContrast ? '#ffff00' : '#92400e' }
                        : { background: themeSubtle, color: themeInk, borderColor: themeBorder } }, m);
                  })))
            ),
            // Log + reset
            h('div', { className: 'flex gap-2 items-center mb-3 flex-wrap' },
              h('button', {
                type: 'button',
                onClick: logObs,
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer',
                style: { background: themeSubtle, color: themeInk, borderColor: themeBorder }
              }, __alloT('stem.bakingscience.log_observation', '📋 Log observation')),
              h('button', {
                type: 'button',
                onClick: function() { setIQ({ temp: 280, time: 6, moisture: 'dry', log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer',
                style: { background: themeCard, color: themeMuted, borderColor: themeBorder }
              }, __alloT('stem.bakingscience.reset', '↺ Reset')),
              (iq.log || []).length > 0 && h('span', { className: 'text-xs italic', style: { color: themeMuted } }, (iq.log || []).length + ' logged')
            ),
            (iq.log || []).length > 0 && h('div', { className: 'mb-3 overflow-x-auto rounded-xl border', style: { borderColor: themeBorder } },
              h('table', { className: 'text-xs w-full border-collapse' },
                h('thead', null, h('tr', { style: { background: themeSubtle, color: themeInk } },
                  ['temp °F', 'time min', 'moisture', 'stage'].map(function(c, i) {
                    return h('th', { key: 'h' + i, scope: 'col', className: 'px-2.5 py-1.5 border text-left', style: { borderColor: themeBorder } }, c);
                  }))),
                h('tbody', null, iq.log.map(function(o, idx) {
                  return h('tr', { key: 'lr' + idx, style: { background: idx % 2 ? themeCard : themeSubtle, color: themeInk } },
                    h('td', { className: 'px-2.5 py-1.5 border font-mono', style: { borderColor: themeBorder } }, o.t),
                    h('td', { className: 'px-2.5 py-1.5 border font-mono', style: { borderColor: themeBorder } }, o.m),
                    h('td', { className: 'px-2.5 py-1.5 border', style: { borderColor: themeBorder } }, o.w),
                    h('td', { className: 'px-2.5 py-1.5 border font-bold', style: { borderColor: themeBorder } }, o.stage));
                })))
            ),
            // Free-text hypothesis
            h('div', { className: 'mb-3' },
              h('label', { htmlFor: 'ch-hypo', className: 'block text-xs font-bold mb-1', style: { color: themeInk } }, __alloT('stem.bakingscience.your_hypothesis_free_text_no_right_ans', 'Your hypothesis (free text — no right answer):')),
              h('textarea', { id: 'ch-hypo', value: iq.hypothesis || '',
                onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                placeholder: __alloT('stem.bakingscience.which_slider_matters_most_for_hitting_', 'Which slider matters most for hitting perfect caramel? Does moisture have a big effect or a small one?'),
                className: 'w-full text-xs border rounded-lg p-2 font-mono leading-snug',
                style: { background: themeCard, color: themeInk, borderColor: themeBorder },
                rows: 3 })
            ),
            // Opt-in open questions
            h('div', { className: 'mb-3' },
              !iq.stuckRevealed && h('button', {
                type: 'button',
                onClick: function() { setIQ({ stuckRevealed: true }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer',
                style: { background: themeSubtle, color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#92400e'), borderColor: themeBorder }
              }, __alloT('stem.bakingscience.i_m_stuck_show_me_questions_to_think_a', '🤔 I\'m stuck — show me questions to think about (no answers)')),
              iq.stuckRevealed && h('div', { className: 'p-3 rounded-xl border text-xs leading-relaxed', style: { background: themeSubtle, borderColor: themeBorder, color: themeInk } },
                h('div', { className: 'font-bold mb-1', style: { color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#78350f') } }, __alloT('stem.bakingscience.open_prompts_investigate_by_manipulati', 'Open prompts — investigate by manipulating:')),
                h('ul', { className: 'list-disc pl-5 space-y-1' },
                  h('li', null, __alloT('stem.bakingscience.hold_two_sliders_steady_move_the_third', 'Hold two sliders steady. Move the third. Watch what happens.')),
                  h('li', null, __alloT('stem.bakingscience.log_observations_from_each_of_the_four', 'Log observations from each of the four stages. What patterns appear in the table?')),
                  h('li', null, __alloT('stem.bakingscience.find_two_different_settings_that_both_', 'Find two different settings that both produce the same stage. What do they share?')),
                  h('li', null, __alloT('stem.bakingscience.notice_where_a_small_change_flips_the_', 'Notice where a small change flips the stage versus where larger changes do nothing.')),
                  h('li', null, __alloT('stem.bakingscience.real_caramel_chefs_talk_about_controll', 'Real caramel chefs talk about "controlling the rate of Maillard." Investigate why moisture matters.'))),
                h('div', { className: 'text-[0.6875rem] italic mt-2', style: { color: themeMuted } }, __alloT('stem.bakingscience.no_answers_no_specific_values_investig', 'No answers, no specific values. Investigate.')))
            ),
            // Self-mark
            h('div', {
              className: 'p-3 rounded-xl border',
              style: isContrast
                ? { background: '#000000', borderColor: '#00ff00', color: '#ffff00' }
                : (isDark
                  ? { background: '#062c22', borderColor: '#10b981', color: '#ecfdf5' }
                  : { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#064e3b' })
            },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('input', { type: 'checkbox', id: 'ch-und', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                h('label', { htmlFor: 'ch-und', className: 'text-xs font-bold cursor-pointer', style: { color: isContrast ? '#00ff00' : (isDark ? '#a7f3d0' : '#065f46') } },
                  __alloT('stem.bakingscience.i_think_i_understand_the_trade_offs_le', 'I think I understand the trade-offs — let me explain them in my own words'))),
              iq.understood && h('textarea', { value: iq.explanation || '',
                onChange: function(e) { setIQ({ explanation: e.target.value }); },
                placeholder: __alloT('stem.bakingscience.explain_in_your_own_words_how_do_tempe', 'Explain in your own words: how do temperature, time, and moisture interact? What makes perfect caramel hard?'),
                className: 'w-full text-xs border rounded-lg p-2 font-mono leading-snug',
                style: { background: themeCard, color: themeInk, borderColor: isContrast ? '#00ff00' : '#34d399' },
                rows: 4,
                'aria-label': __alloT('stem.bakingscience.explanation_input', 'Baking science explanation') }),
              iq.understood && (iq.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[0.6875rem] italic', style: { color: isContrast ? '#00ff00' : (isDark ? '#a7f3d0' : '#047857') } },
                __alloT('stem.bakingscience.saved_notice_nobody_checked_your_answe', '✓ Saved. Notice — nobody checked your answer. That is what learner-driven inquiry looks like.'))
            ),
            h('div', { className: 'mt-3 p-2.5 rounded-lg border text-[0.6875rem] italic', style: { background: themeSubtle, borderColor: themeBorder, color: themeMuted } },
              __alloT('stem.bakingscience.design_note_no_caramel_quality_score_n', 'Design note: no caramel-quality score, no reveal button. Stage is shown as a discrete 4-band marker, not a continuous gradient — by design, to discourage optimization-gaming behavior.'))
          );
        }

        if (subtool === 'leavening') return wrapWithA11y(renderLeavening());
        if (subtool === 'emulsion')  return wrapWithA11y(renderEmulsion());
        if (subtool === 'scaler')    return wrapWithA11y(renderScaler());
        if (subtool === 'oven')      return wrapWithA11y(renderOven());
        if (subtool === 'diagnosis') return wrapWithA11y(renderDiagnosis());
        if (subtool === 'gluten')    return wrapWithA11y(renderGluten());
        if (subtool === 'browning')  return wrapWithA11y(renderBrowning());
        if (subtool === 'caramelHunt') return wrapWithA11y(renderCaramelHunt());
        return wrapWithA11y(renderMenu());
      })();
    }
  });

  console.log('[StemLab] bakingScience tool registered');
})();
