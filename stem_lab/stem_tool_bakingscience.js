// ═══════════════════════════════════════════
// stem_tool_bakingscience.js — Baking Lab v1.0
// 4 sub-tools: Leavening Lab, Emulsion Mixer,
// Recipe Scaler, Oven Timeline
// ═══════════════════════════════════════════

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
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
    { id: 'browning', icon: '\uD83E\uDD69', label: 'Browning Lab', desc: 'Maillard vs. caramelization head-to-head', color: 'orange' }
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
    questHooks: [
      { id: 'leaven_5',  label: 'Run 5 leavening reactions', icon: '\uD83E\uDED0', check: function(d) { var e = d._bakingExt || {}; return (e.leaveningRuns || 0) >= 5; }, progress: function(d) { var e = d._bakingExt || {}; return (e.leaveningRuns || 0) + '/5'; } },
      { id: 'emul_3',    label: 'Stabilize 3 emulsions',     icon: '\uD83E\uDD5A', check: function(d) { var e = d._bakingExt || {}; return (e.emulsionsSolved || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.emulsionsSolved || 0) + '/3'; } },
      { id: 'scale_3',   label: 'Scale 3 different recipes', icon: '\uD83D\uDCCF', check: function(d) { var e = d._bakingExt || {}; return (e.recipesScaled || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.recipesScaled || 0) + '/3'; } },
      { id: 'oven_all',  label: 'Discover every oven event', icon: '\uD83D\uDD25', check: function(d) { var e = d._bakingExt || {}; return (e.ovenEventsFound || []).length >= OVEN_EVENTS.length; }, progress: function(d) { var e = d._bakingExt || {}; return ((e.ovenEventsFound || []).length) + '/' + OVEN_EVENTS.length; } },
      { id: 'diag_5',    label: 'Diagnose 5 bakes correctly', icon: '\uD83D\uDD0D', check: function(d) { var e = d._bakingExt || {}; return (e.diagnosesCorrect || 0) >= 5; }, progress: function(d) { var e = d._bakingExt || {}; return (e.diagnosesCorrect || 0) + '/5'; } },
      { id: 'gluten_3',  label: 'Match 3 gluten targets', icon: '\uD83E\uDDF5', check: function(d) { var e = d._bakingExt || {}; return (e.glutenMatches || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.glutenMatches || 0) + '/3'; } },
      { id: 'brown_3',   label: 'Brown 3 foods to golden perfection', icon: '\uD83E\uDD69', check: function(d) { var e = d._bakingExt || {}; return (e.browningPerfections || 0) >= 3; }, progress: function(d) { var e = d._bakingExt || {}; return (e.browningPerfections || 0) + '/3'; } }
    ],

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var announceToSR = ctx.announceToSR;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
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
        var d = labToolData.bakingScience || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            var cb = Object.assign({}, prev.bakingScience || {});
            cb[key] = val;
            return Object.assign({}, prev, { bakingScience: cb });
          });
        };
        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            var cb = Object.assign({}, prev.bakingScience || {}, obj);
            return Object.assign({}, prev, { bakingScience: cb });
          });
        };

        var ext = d._bakingExt || { leaveningRuns: 0, emulsionsSolved: 0, recipesScaled: 0, ovenEventsFound: [], diagnosesCorrect: 0, diagnosesAttempted: 0, diagStreak: 0, diagBestStreak: 0, glutenMatches: 0, glutenExplorations: 0, badges: [] };
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
            var a = new AC();
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
          gluten:    { label: 'baking.activities.gluten_label',    desc: 'baking.activities.gluten_desc'    }
        };
        var subtoolLabel = function(st) { return tr(subtoolI18n[st.id].label, st.label); };
        var subtoolDesc  = function(st) { return tr(subtoolI18n[st.id].desc,  st.desc ); };

        var renderMenu = function() {
          return h('div', { className: 'p-4 sm:p-6 max-w-5xl mx-auto' },
            h('div', { className: 'mb-6 text-center' },
              h('div', { className: 'text-5xl mb-2' }, '\uD83E\uDD50\uD83D\uDC69\u200D\uD83C\uDF73'),
              h('h2', { className: 'text-2xl sm:text-3xl font-black text-amber-900' }, tr('baking.title', 'Baking Lab')),
              h('p', { className: 'text-sm text-slate-600 mt-1 max-w-xl mx-auto' },
                tr('baking.subtitle', 'Baking is chemistry, physics, and math you can taste. Pick an activity to explore the science behind your favorite bakes.'))
            ),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
              SUBTOOLS.map(function(st) {
                var label = subtoolLabel(st);
                var desc = subtoolDesc(st);
                return h('button', {
                  key: st.id,
                  onClick: function() { upd('subtool', st.id); announceToSR && announceToSR('Opening ' + label); playBeep('click'); },
                  className: 'group text-left rounded-2xl border-2 border-' + st.color + '-200 bg-white hover:border-' + st.color + '-400 hover:shadow-lg p-4 transition-all active:scale-[0.99]',
                  'aria-label': 'Open ' + label + ': ' + desc
                },
                  h('div', { className: 'flex items-center gap-3' },
                    h('div', { className: 'text-4xl group-hover:scale-110 transition-transform' }, st.icon),
                    h('div', null,
                      h('div', { className: 'text-lg font-black text-slate-900' }, label),
                      h('div', { className: 'text-xs text-slate-600 mt-0.5' }, desc)
                    )
                  )
                );
              })
            ),
            h('div', { className: 'mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-amber-700' }, ext.leaveningRuns || 0),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-amber-600' }, tr('baking.stats.reactions', 'Reactions'))
              ),
              h('div', { className: 'rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-yellow-700' }, ext.emulsionsSolved || 0),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-yellow-600' }, tr('baking.stats.emulsions', 'Emulsions'))
              ),
              h('div', { className: 'rounded-xl bg-orange-50 border border-orange-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-orange-700' }, ext.recipesScaled || 0),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-orange-600' }, tr('baking.stats.recipes_scaled', 'Recipes scaled'))
              ),
              h('div', { className: 'rounded-xl bg-rose-50 border border-rose-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-rose-700' }, (ext.ovenEventsFound || []).length + '/' + OVEN_EVENTS.length),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-rose-600' }, tr('baking.stats.oven_events', 'Oven events'))
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SHARED: Back button
        // ═══════════════════════════════════════
        var backBtn = function(color) {
          return h('button', {
            onClick: function() { upd('subtool', 'menu'); playBeep('click'); },
            className: 'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-' + (color || 'slate') + '-200 text-' + (color || 'slate') + '-700 hover:bg-' + (color || 'slate') + '-50 shadow-sm',
            'aria-label': tr('baking.back_aria', 'Back to Baking Lab menu')
          }, ArrowLeft ? h(ArrowLeft, { size: 14 }) : '\u2190', ' ' + tr('baking.back', 'Back'));
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 1: LEAVENING LAB
        // ═══════════════════════════════════════
        var renderLeavening = function() {
          var acidId = d.leavAcid || 'buttermilk';
          var baseId = d.leavBase || 'baking_soda';
          var amount = d.leavAmount != null ? d.leavAmount : 50;
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
            upd('leavRunning', true);
            playBeep('fizz');
            setTimeout(function() {
              upd('leavRunning', false);
              playBeep('bubble');
              updExt({ leaveningRuns: (ext.leaveningRuns || 0) + 1 });
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
                  boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.1)',
                  animation: 'bakingBubbleRise ' + duration + 's ease-out ' + delay + 's forwards'
                }
              }));
            }
          }

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto' },
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', null,
                h('h2', { className: 'text-xl sm:text-2xl font-black text-amber-900 flex items-center gap-2' }, '\uD83E\uDED0 ' + tr('baking.activities.leavening_label', 'Leavening Lab')),
                h('p', { className: 'text-xs text-slate-600' }, tr('baking.leavening.tagline', 'Mix an acid and a base to make bubbles of CO\u2082.'))
              ),
              backBtn('amber')
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4' },
              // Controls
              h('div', { className: 'lg:col-span-2 space-y-4' },
                // Acid selector
                h('div', { className: 'rounded-2xl bg-white border-2 border-amber-200 p-4' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700 mb-2' }, tr('baking.leavening.step_acid', '1. Pick an acid')),
                  h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                    ACIDS.map(function(a) {
                      var active = a.id === acidId;
                      return h('button', {
                        key: a.id,
                        onClick: function() { upd('leavAcid', a.id); playBeep('click'); },
                        className: 'rounded-xl border-2 p-2 text-center text-xs font-bold transition-all ' + (active ? 'bg-amber-500 text-white border-amber-600 shadow' : 'bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-900'),
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
                h('div', { className: 'rounded-2xl bg-white border-2 border-orange-200 p-4' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-700 mb-2' }, tr('baking.leavening.step_base', '2. Pick a base')),
                  h('div', { className: 'grid grid-cols-3 gap-2' },
                    BASES.map(function(b) {
                      var active = b.id === baseId;
                      return h('button', {
                        key: b.id,
                        onClick: function() { upd('leavBase', b.id); playBeep('click'); },
                        className: 'rounded-xl border-2 p-3 text-center text-xs font-bold transition-all ' + (active ? 'bg-orange-500 text-white border-orange-600 shadow' : 'bg-orange-50 border-orange-200 hover:border-orange-400 text-orange-900'),
                        'aria-pressed': active,
                        'aria-label': b.name
                      },
                        h('div', { className: 'text-2xl mb-1', 'aria-hidden': true }, b.emoji),
                        h('div', null, b.name),
                        h('div', { className: 'text-[9px] font-normal mt-0.5 opacity-80' }, b.complete ? tr('baking.leavening.complete_base', 'complete') : tr('baking.leavening.needs_acid', 'needs acid'))
                      );
                    })
                  )
                ),
                // Amount slider
                h('div', { className: 'rounded-2xl bg-white border-2 border-rose-200 p-4' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'leav-amount', className: 'text-xs font-bold uppercase tracking-wider text-rose-700' }, tr('baking.leavening.step_amount', '3. How much? (pinch \u2192 tbsp)')),
                    h('span', { className: 'text-sm font-black text-rose-700 tabular-nums' }, amount + '%')
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
                    onClick: runReaction,
                    disabled: running,
                    className: 'flex-grow px-5 py-3 rounded-full font-black text-sm text-white bg-gradient-to-r from-amber-500 to-rose-500 shadow-lg shadow-rose-200 hover:shadow-rose-300 disabled:opacity-50 transition-all active:scale-95'
                  }, running ? tr('baking.leavening.mix_running', 'Reacting\u2026') : (tr('baking.leavening.mix_btn', 'Mix & React') + ' \uD83E\uDDEA'))
                )
              ),
              // Result panel
              h('div', { className: 'rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-300 p-4 space-y-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-700' }, tr('baking.leavening.rise_label', 'Rise (CO\u2082 gas)')),
                h('div', { className: 'relative h-40 rounded-xl bg-white/80 border border-amber-200 overflow-hidden' },
                  h('div', {
                    style: {
                      position: 'absolute', left: 0, right: 0, bottom: 0,
                      height: yieldPct + '%',
                      background: overLeavened
                        ? 'linear-gradient(to top, #dc2626, #f59e0b, #fef3c7)'
                        : 'linear-gradient(to top, #f59e0b, #fbbf24, #fef3c7)',
                      transition: 'height 0.8s ease-out'
                    }
                  }),
                  // Foamy crown
                  yieldPct > 20 && h('div', {
                    style: {
                      position: 'absolute', left: 0, right: 0,
                      bottom: yieldPct - 4 + '%',
                      height: '6px',
                      background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.95) 3px, transparent 4px), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 4px, transparent 5px), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.95) 3px, transparent 4px)',
                      opacity: 0.9,
                      pointerEvents: 'none'
                    }
                  }),
                  bubbles.length > 0 && h('div', { className: 'absolute inset-0 pointer-events-none' }, bubbles),
                  h('div', { className: 'absolute top-2 right-2 text-3xl font-black text-amber-900 drop-shadow' }, yieldPct + '%')
                ),
                // Bake verdict card
                yieldPct > 0 && h('div', { className: 'rounded-xl bg-white/70 border border-amber-200 p-2.5' },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider ' + (overLeavened ? 'text-red-600' : 'text-amber-700') + ' mb-0.5' }, tr('baking.leavening.verdict_title', 'Bake verdict')),
                  h('div', { className: 'text-xs font-semibold ' + (overLeavened ? 'text-red-800' : 'text-slate-800') }, verdictText)
                ),
                h('div', { className: 'text-xs text-slate-700 leading-relaxed' }, explain),
                h('div', { className: 'text-[11px] text-slate-500 italic' }, acid.notes)
              )
            ),
            // Science explainer
            h('details', { className: 'mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4' },
              h('summary', { className: 'cursor-pointer font-bold text-amber-900 text-sm' }, '\uD83D\uDCD6 ' + tr('baking.leavening.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm text-slate-700 space-y-2' },
                h('p', null, 'Baking soda is sodium bicarbonate (NaHCO\u2083). When it meets an acid, two things happen:'),
                h('ol', { className: 'list-decimal pl-5 space-y-1' },
                  h('li', null, 'The acid donates a proton (H\u207A) to the bicarbonate.'),
                  h('li', null, 'This makes carbonic acid (H\u2082CO\u2083), which instantly falls apart into water and CO\u2082 gas.')
                ),
                h('p', null, h('strong', null, 'Baking powder'), ' already contains an acid (usually cream of tartar or sodium aluminum sulfate), so it works without added acid. Many powders are "double-acting" \u2014 one burst of CO\u2082 when wet, another when heated.'),
                h('p', null, h('strong', null, 'Yeast'), ' is a living fungus. It eats sugars and releases CO\u2082 and alcohol. Slower than chemical leaveners, but it also develops flavor \u2014 that\u2019s why sourdough tastes so different from quick bread.')
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
          var oil = d.emulOil != null ? d.emulOil : 50;
          var water = d.emulWater != null ? d.emulWater : 50;
          var yolk = d.emulYolk != null ? d.emulYolk : 0;

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
              announceToSR && announceToSR('Stable emulsion. Great mix.');
              addToast && addToast('\u2728 ' + tr('baking.emulsion.success_toast', 'Stable! Your ' + goal.label.toLowerCase() + ' holds together.', { name: goal.label.toLowerCase() }), 'success');
            } else {
              playBeep('fail');
              announceToSR && announceToSR('Emulsion broke. Adjust your ratios.');
              addToast && addToast(tr('baking.emulsion.not_quite', 'Not quite \u2014 try adjusting toward the target.'), 'info');
            }
          };

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto' },
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', null,
                h('h2', { className: 'text-xl sm:text-2xl font-black text-yellow-800 flex items-center gap-2' }, '\uD83E\uDD5A ' + tr('baking.activities.emulsion_label', 'Emulsion Mixer')),
                h('p', { className: 'text-xs text-slate-600' }, tr('baking.emulsion.tagline', 'Oil and water don\u2019t mix. Egg yolks help.'))
              ),
              backBtn('yellow')
            ),
            // Goal selector
            h('div', { className: 'mb-4 rounded-2xl bg-white border-2 border-yellow-200 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-yellow-700 mb-2' }, tr('baking.emulsion.choose_goal', 'Choose a goal')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                EMULSION_GOALS.map(function(g) {
                  var active = g.id === goalId;
                  return h('button', {
                    key: g.id,
                    onClick: function() { upd('emulGoal', g.id); playBeep('click'); },
                    className: 'px-3 py-2 rounded-full text-xs font-bold transition-all ' + (active ? 'bg-yellow-500 text-white shadow' : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200')
                  }, g.label);
                })
              )
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Sliders
              h('div', { className: 'rounded-2xl bg-white border-2 border-yellow-200 p-4 space-y-4' },
                [
                  { key: 'oil',   label: tr('baking.emulsion.oil',   'Oil'),       color: 'amber',  emoji: '\uD83E\uDEE2', val: oil,   target: goal.target.oil,   pct: oilPct },
                  { key: 'water', label: tr('baking.emulsion.water', 'Water'),     color: 'sky',    emoji: '\uD83D\uDCA7', val: water, target: goal.target.water, pct: waterPct },
                  { key: 'yolk',  label: tr('baking.emulsion.yolk',  'Egg yolk'),  color: 'yellow', emoji: '\uD83E\uDD5A', val: yolk,  target: goal.target.yolk,  pct: yolkPct }
                ].map(function(s) {
                  return h('div', { key: s.key },
                    h('div', { className: 'flex items-center justify-between mb-1' },
                      h('label', { htmlFor: 'emul-' + s.key, className: 'text-xs font-bold text-slate-700 flex items-center gap-1' },
                        h('span', { 'aria-hidden': true }, s.emoji), s.label
                      ),
                      h('div', { className: 'text-xs tabular-nums' },
                        h('span', { className: 'font-black text-slate-900' }, s.pct + '%'),
                        h('span', { className: 'text-slate-400 ml-2' }, tr('baking.emulsion.target', 'target') + ' ' + s.target + '%')
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
                  onClick: checkMix,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm text-white bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-200 hover:shadow-yellow-300 transition-all active:scale-95'
                }, tr('baking.emulsion.shake_btn', 'Shake & check') + ' \uD83E\uDD64')
              ),
              // Visualization
              h('div', { className: 'rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-yellow-700 mb-2' }, tr('baking.emulsion.your_mix', 'Your mix')),
                h('div', { className: 'relative h-48 rounded-xl bg-white border border-yellow-200 overflow-hidden' },
                  broken ? (
                    // Separated
                    h('div', { className: 'absolute inset-0 flex flex-col' },
                      h('div', { style: { flex: oilPct, background: '#fcd34d' }, className: 'flex items-center justify-center text-[10px] font-bold text-amber-900' }, tr('baking.emulsion.oil_layer', 'Oil layer')),
                      h('div', { style: { flex: waterPct, background: '#bae6fd' }, className: 'flex items-center justify-center text-[10px] font-bold text-sky-900' }, tr('baking.emulsion.water_layer', 'Water layer'))
                    )
                  ) : (
                    // Mixed
                    h('div', {
                      className: 'absolute inset-0',
                      style: {
                        background: 'radial-gradient(circle at 30% 30%, rgba(252,211,77,0.9), rgba(253,224,71,0.8)), radial-gradient(circle at 70% 70%, rgba(186,230,253,0.7), rgba(252,211,77,0.5))'
                      }
                    })
                  ),
                  h('div', { className: 'absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black ' + (stable ? 'bg-emerald-500 text-white' : broken ? 'bg-red-500 text-white' : 'bg-white text-slate-700 border') },
                    stable ? tr('baking.emulsion.stable', 'Stable') : broken ? tr('baking.emulsion.broken', 'Broken') : tr('baking.emulsion.mixing', 'Mixing\u2026')
                  )
                ),
                h('div', { className: 'mt-3 text-xs text-slate-700 leading-relaxed' }, goal.explain)
              )
            ),
            h('details', { className: 'mt-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4' },
              h('summary', { className: 'cursor-pointer font-bold text-yellow-900 text-sm' }, '\uD83D\uDCD6 ' + tr('baking.emulsion.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm text-slate-700 space-y-2' },
                h('p', null, 'Oil is hydrophobic ("water-fearing") and water is hydrophilic. On their own, they separate because oil molecules are nonpolar and water molecules are polar.'),
                h('p', null, h('strong', null, 'Emulsifiers'), ' are molecules with one water-loving end and one oil-loving end \u2014 like soap, but edible. Egg yolks are full of one called ', h('strong', null, 'lecithin'), '. Lecithin coats tiny droplets of oil and keeps them suspended in water.'),
                h('p', null, 'That\u2019s why mayonnaise, hollandaise, and even cake batter hold together: a web of emulsifier-coated droplets.')
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
          var lockedFlourTarget = d.scaleLockFlourGrams != null ? d.scaleLockFlourGrams : baselineFlourGrams;
          var factor;
          if (lockFlour && baselineFlourGrams > 0) {
            factor = lockedFlourTarget / baselineFlourGrams;
          } else {
            factor = d.scaleFactor != null ? d.scaleFactor : 1;
          }
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

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto' },
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', null,
                h('h2', { className: 'text-xl sm:text-2xl font-black text-orange-800 flex items-center gap-2' }, '\uD83D\uDCCF ' + tr('baking.activities.scaler_label', 'Recipe Scaler')),
                h('p', { className: 'text-xs text-slate-600' }, tr('baking.scaler.tagline', 'Scale recipes with ratios \u2014 and see baker\u2019s percentages.'))
              ),
              backBtn('orange')
            ),
            h('div', { className: 'mb-4 rounded-2xl bg-white border-2 border-orange-200 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-700 mb-2' }, tr('baking.scaler.recipe', 'Recipe')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                RECIPE_PRESETS.map(function(r) {
                  var active = r.id === recipeId;
                  return h('button', {
                    key: r.id,
                    onClick: function() { upd('scaleRecipe', r.id); playBeep('click'); },
                    className: 'px-3 py-2 rounded-full text-xs font-bold transition-all ' + (active ? 'bg-orange-500 text-white shadow' : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200')
                  }, r.label);
                })
              )
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4' },
              // Scale controls
              h('div', { className: 'lg:col-span-1 space-y-4' },
                h('div', { className: 'rounded-2xl bg-white border-2 border-orange-200 p-4' },
                  h('label', { className: 'flex items-center gap-2 text-xs font-bold text-orange-700 cursor-pointer mb-2' },
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
                          h('label', { htmlFor: 'scale-flour-grams', className: 'text-xs font-bold uppercase tracking-wider text-orange-700' }, tr('baking.scaler.flour_weight', 'Flour weight')),
                          h('span', { className: 'text-xl font-black text-orange-700 tabular-nums' }, lockedFlourTarget + ' g')
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
                        h('div', { className: 'mt-1 text-[10px] text-slate-500 italic' }, tr('baking.scaler.lock_flour_hint', 'Pick a flour amount and everything else scales by baker\u2019s %.'))
                      )
                    : h('div', null,
                        h('div', { className: 'flex items-center justify-between mb-1' },
                          h('label', { htmlFor: 'scale-factor', className: 'text-xs font-bold uppercase tracking-wider text-orange-700' }, tr('baking.scaler.scale', 'Scale')),
                          h('span', { className: 'text-xl font-black text-orange-700 tabular-nums' }, factor.toFixed(2) + '\u00D7')
                        ),
                        h('input', {
                          id: 'scale-factor',
                          type: 'range',
                          min: 0.25, max: 4, step: 0.25,
                          value: factor,
                          onChange: function(e) { upd('scaleFactor', parseFloat(e.target.value)); },
                          className: 'w-full accent-orange-500'
                        })
                      ),
                  h('div', { className: 'mt-2 text-xs text-slate-500' }, tr('baking.scaler.makes_servings', 'Makes {n} servings', { n: Math.round(recipe.serves * factor) }))
                ),
                h('div', { className: 'rounded-2xl bg-white border-2 border-orange-200 p-4' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-orange-700 mb-2' }, tr('baking.scaler.units', 'Units')),
                  h('div', { className: 'flex gap-1' },
                    ['grams', 'oz', 'cups'].map(function(u) {
                      var active = u === unit;
                      return h('button', {
                        key: u,
                        onClick: function() { upd('scaleUnit', u); },
                        className: 'flex-1 px-2 py-1.5 rounded-full text-xs font-bold ' + (active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100')
                      }, u);
                    })
                  ),
                  unit === 'cups' && h('div', { className: 'mt-2 text-[10px] text-slate-500 italic' }, tr('baking.scaler.cup_warning', 'Cup conversions are approximate \u2014 always weigh for precision.'))
                ),
                // Hydration readout (only meaningful when the recipe has a liquid)
                hydrationPct > 0 && h('div', { className: 'rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 p-4' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1' }, '\uD83D\uDCA7 ', tr('baking.scaler.hydration', 'Hydration')),
                    h('span', { className: 'text-2xl font-black text-sky-700 tabular-nums' }, hydrationPct + '%')
                  ),
                  h('div', { className: 'h-2 rounded-full bg-sky-100 overflow-hidden' },
                    h('div', {
                      className: 'h-full bg-gradient-to-r from-sky-400 to-blue-500',
                      style: { width: Math.min(100, hydrationPct) + '%', transition: 'width 0.4s ease' }
                    })
                  ),
                  h('div', { className: 'mt-1 text-[10px] text-slate-500' }, tr('baking.scaler.hydration_hint', 'Liquid weight \u00f7 flour weight. Higher hydration = more open crumb.'))
                ),
                h('button', {
                  onClick: applyScale,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm text-white bg-gradient-to-r from-orange-500 to-rose-500 shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-95'
                }, tr('baking.scaler.save_btn', 'Save scaled recipe') + ' \uD83D\uDCBE')
              ),
              // Ingredient table
              h('div', { className: 'lg:col-span-2 rounded-2xl bg-white border-2 border-orange-200 overflow-hidden' },
                h('div', { className: 'bg-orange-50 px-4 py-2 border-b border-orange-200 flex items-center justify-between' },
                  h('div', { className: 'text-sm font-black text-orange-900' }, recipe.label),
                  h('div', { className: 'text-xs text-orange-700' }, tr('baking.scaler.flour_anchor', 'Flour = 100% (baker\u2019s %)'))
                ),
                h('table', { className: 'w-full text-sm' },
                  h('thead', { className: 'bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600' },
                    h('tr', null,
                      h('th', { className: 'text-left px-3 py-2' }, tr('baking.scaler.col_ingredient', 'Ingredient')),
                      h('th', { className: 'text-right px-3 py-2' }, tr('baking.scaler.col_amount', 'Amount')),
                      h('th', { className: 'text-right px-3 py-2' }, tr('baking.scaler.col_bakers', 'Baker\u2019s %'))
                    )
                  ),
                  h('tbody', null,
                    recipe.ingredients.map(function(ing, i) {
                      return h('tr', { key: i, className: i % 2 ? 'bg-white' : 'bg-slate-50/40' },
                        h('td', { className: 'px-3 py-2 font-medium text-slate-800' }, ing.name),
                        h('td', { className: 'px-3 py-2 text-right tabular-nums font-bold text-orange-700' }, displayAmount(ing.grams)),
                        h('td', { className: 'px-3 py-2 text-right tabular-nums text-slate-500' }, bakersPct(ing.grams))
                      );
                    })
                  )
                )
              )
            ),
            h('details', { className: 'mt-6 rounded-xl bg-orange-50 border border-orange-200 p-4' },
              h('summary', { className: 'cursor-pointer font-bold text-orange-900 text-sm' }, '\uD83D\uDCD6 ' + tr('baking.scaler.math_title', 'The math')),
              h('div', { className: 'mt-3 text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Baker\u2019s percentages'), ' measure every ingredient relative to the flour. If flour is 100%, water at 65% means 650g water per 1000g flour. Bakers use this so they can scale recipes up or down without recalculating ratios.'),
                h('p', null, h('strong', null, 'Why weight beats volume'), ': a cup of flour can weigh anywhere from 100g to 150g depending on how you scoop it. Grams don\u2019t lie. Professional bakeries always use scales.'),
                h('p', null, 'Doubling a recipe doesn\u2019t always double the bake time. Larger loaves have more insulation \u2014 the outside browns while the center catches up. Expect 10-30% longer for a 2\u00D7 batch.')
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 4: OVEN TIMELINE
        // ═══════════════════════════════════════
        var renderOven = function() {
          var temp = d.ovenTemp != null ? d.ovenTemp : 72; // canonical: °F
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

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto' },
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', null,
                h('h2', { className: 'text-xl sm:text-2xl font-black text-rose-800 flex items-center gap-2' }, '\uD83D\uDD25 ' + tr('baking.activities.oven_label', 'Oven Timeline')),
                h('p', { className: 'text-xs text-slate-600' }, tr('baking.oven.tagline', 'Slide the temperature to see what happens inside the oven.'))
              ),
              h('div', { className: 'flex items-center gap-2' },
                // Unit toggle
                h('div', { className: 'flex items-center gap-0.5 p-0.5 rounded-full bg-white border border-rose-200 shadow-sm', role: 'group', 'aria-label': 'Temperature unit' },
                  ['F', 'C'].map(function(u) {
                    var active = u === unit;
                    return h('button', {
                      key: u,
                      onClick: function() { upd('ovenUnit', u); },
                      className: 'px-2.5 py-0.5 rounded-full text-xs font-black transition-colors ' + (active ? 'bg-rose-600 text-white shadow' : 'text-rose-700 hover:bg-rose-50'),
                      'aria-pressed': active
                    }, '\u00B0' + u);
                  })
                ),
                backBtn('rose')
              )
            ),
            // Oven scene + slider
            h('div', { className: 'rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 border-2 border-rose-300 p-6 mb-4' },
              h('div', { className: 'flex items-center justify-center mb-4' },
                h('div', { className: 'relative w-48 h-32 rounded-xl border-4 border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden', style: { boxShadow: 'inset 0 0 30px rgba(' + (temp > 300 ? '234, 88, 12' : '0,0,0') + ',' + Math.min(0.8, temp / 500) + ')' } },
                  h('div', { className: 'w-20 h-12 rounded-lg shadow-inner transition-all', style: { background: foodColor, boxShadow: '0 0 ' + (temp > 300 ? 20 : 5) + 'px ' + foodColor } })
                )
              ),
              h('div', { className: 'flex items-center justify-between mb-1' },
                h('label', { htmlFor: 'oven-temp', className: 'text-xs font-bold uppercase tracking-wider text-rose-200' }, tr('baking.oven.temperature', 'Temperature')),
                h('span', { className: 'text-3xl font-black text-rose-300 tabular-nums' }, formatTemp(temp))
              ),
              // Slider with bake-zone markers overlaid
              h('div', { className: 'relative' },
                // Zone bands (under slider)
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
                  onChange: function(e) { var nt = parseInt(e.target.value, 10); upd('ovenTemp', nt); recordNewEvents(nt); },
                  className: 'relative w-full accent-rose-500'
                })
              ),
              h('div', { className: 'flex justify-between text-[10px] text-rose-300/70 mt-1' },
                h('span', null, 'Cold'),
                h('span', null, 'Warm'),
                h('span', null, 'Baking'),
                h('span', null, 'Crust'),
                h('span', null, 'Burn')
              ),
              // Zone legend
              h('div', { className: 'mt-3 flex flex-wrap gap-1.5' },
                BAKE_ZONES.map(function(z) {
                  var inZone = temp >= z.from && temp <= Math.max(z.to, z.from + 5);
                  return h('span', {
                    key: z.id,
                    className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ' + (inZone ? 'bg-white text-rose-900 shadow scale-105' : 'bg-white/10 text-rose-200/80'),
                    title: formatTemp(z.from) + (z.to !== z.from ? '\u2013' + formatTemp(z.to) : '')
                  },
                    h('span', { className: 'w-2 h-2 rounded-full', style: { background: z.color } }),
                    z.label
                  );
                })
              )
            ),
            // Current + next event
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4' },
              latest ? h('div', { className: 'rounded-2xl bg-white border-2 border-rose-200 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700 mb-1' }, tr('baking.oven.happening_now', 'Happening now')),
                h('div', { className: 'text-2xl font-black text-slate-900 flex items-center gap-2' },
                  h('span', { 'aria-hidden': true }, latest.emoji), latest.label
                ),
                h('div', { className: 'text-xs text-slate-500 mb-2' }, 'at ' + formatTemp(latest.temp)),
                h('p', { className: 'text-sm text-slate-700' }, latest.body)
              ) : h('div', { className: 'rounded-2xl bg-white border-2 border-slate-200 p-4 text-center' },
                h('div', { className: 'text-4xl mb-2' }, '\u2744\uFE0F'),
                h('div', { className: 'text-sm text-slate-600' }, tr('baking.oven.oven_cold', 'Oven is still cold. Raise the temperature to start reactions.'))
              ),
              nextEvent ? h('div', { className: 'rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-200 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700 mb-1' }, tr('baking.oven.coming_up', 'Coming up at {temp}', { temp: formatTemp(nextEvent.temp) })),
                h('div', { className: 'text-lg font-black text-slate-800 flex items-center gap-2' },
                  h('span', { 'aria-hidden': true }, nextEvent.emoji), nextEvent.label
                ),
                h('div', { className: 'mt-2 text-xs text-slate-600' }, tr('baking.oven.degrees_to_go', '{n} to go', { n: (unit === 'C' ? (fToC(nextEvent.temp) - fToC(temp)) + '\u00B0C' : (nextEvent.temp - temp) + '\u00B0F') }))
              ) : h('div', { className: 'rounded-2xl bg-rose-100 border-2 border-rose-300 p-4 text-center' },
                h('div', { className: 'text-sm font-bold text-rose-900' }, '\uD83C\uDF89 ' + tr('baking.oven.all_milestones', 'You\u2019ve hit every oven milestone!'))
              )
            ),
            // Event list
            h('div', { className: 'rounded-2xl bg-white border-2 border-rose-200 overflow-hidden' },
              h('div', { className: 'bg-rose-50 px-4 py-2 border-b border-rose-200 text-sm font-black text-rose-900' }, tr('baking.oven.all_events', 'All oven events')),
              h('ul', { className: 'divide-y divide-rose-100' },
                OVEN_EVENTS.map(function(e) {
                  var passed = temp >= e.temp;
                  return h('li', { key: e.temp, className: 'px-4 py-3 flex items-start gap-3 ' + (passed ? 'bg-rose-50/50' : 'opacity-60') },
                    h('div', { className: 'text-2xl shrink-0', 'aria-hidden': true }, e.emoji),
                    h('div', { className: 'flex-grow' },
                      h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('strong', { className: passed ? 'text-rose-900' : 'text-slate-500' }, e.label),
                        h('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (passed ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600') }, formatTemp(e.temp))
                      ),
                      h('div', { className: 'text-xs text-slate-600 mt-0.5' }, e.body)
                    )
                  );
                })
              )
            ),
            h('details', { className: 'mt-6 rounded-xl bg-rose-50 border border-rose-200 p-4' },
              h('summary', { className: 'cursor-pointer font-bold text-rose-900 text-sm' }, '\uD83D\uDCD6 ' + tr('baking.oven.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, 'Maillard vs. caramelization'), ': Maillard reactions need protein (amino acids) + sugar + heat \u2014 that\u2019s why bread crust, seared meat, and toasted marshmallows all develop similar brown, complex flavors. Caramelization only needs sugar + heat, and happens a bit hotter.'),
                h('p', null, h('strong', null, 'Oven spring'), ': in the first few minutes, steam from the dough\u2019s water expands violently. This is why sourdough scoring matters \u2014 it gives the steam somewhere to go.'),
                h('p', null, h('strong', null, 'Convection vs. conduction'), ': conventional ovens bake mostly by radiating heat from the walls. Convection ovens move hot air with a fan \u2014 about 25\u00B0F more effective, so recipes say "reduce temp by 25\u00B0F" for convection.')
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
          var idx = d.diagIdx != null ? d.diagIdx : 0;
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
            announceToSR && announceToSR('Scenarios reshuffled.');
          };

          // Map a scenario tag to a colored accent and breadcrumb label
          var tagMeta = {
            leavening: { color: 'amber',  label: 'Leavening' },
            emulsion:  { color: 'yellow', label: 'Emulsion' },
            scaler:    { color: 'orange', label: 'Ratios' },
            oven:      { color: 'rose',   label: 'Oven science' }
          };
          var meta = tagMeta[scenario.tag] || { color: 'pink', label: 'Baking' };

          var attempted = ext.diagnosesAttempted || 0;
          var correct = ext.diagnosesCorrect || 0;
          var accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
          var streak = ext.diagStreak || 0;

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto' },
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', null,
                h('h2', { className: 'text-xl sm:text-2xl font-black text-pink-800 flex items-center gap-2' }, '\uD83D\uDD0D ' + tr('baking.activities.diagnosis_label', 'Bake Diagnosis')),
                h('p', { className: 'text-xs text-slate-600' }, tr('baking.diagnosis.tagline', 'Something went wrong in the bake. Which explanation fits best?'))
              ),
              h('div', { className: 'flex items-center gap-2' },
                h('button', {
                  onClick: reshuffle,
                  className: 'px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 shadow-sm',
                  'aria-label': tr('baking.diagnosis.reshuffle_aria', 'Reshuffle scenarios')
                }, '\uD83D\uDD00 ' + tr('baking.diagnosis.reshuffle', 'Reshuffle')),
                backBtn('pink')
              )
            ),
            // Stats strip
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4' },
              h('div', { className: 'rounded-xl bg-pink-50 border border-pink-200 p-2.5 text-center' },
                h('div', { className: 'text-xl font-black text-pink-700 tabular-nums' }, (idx + 1) + '/' + order.length),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-pink-600' }, tr('baking.diagnosis.scenario', 'Scenario'))
              ),
              h('div', { className: 'rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-center' },
                h('div', { className: 'text-xl font-black text-emerald-700 tabular-nums' }, correct),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-emerald-600' }, tr('baking.diagnosis.correct', 'Correct'))
              ),
              h('div', { className: 'rounded-xl bg-indigo-50 border border-indigo-200 p-2.5 text-center' },
                h('div', { className: 'text-xl font-black text-indigo-700 tabular-nums' }, accuracy + '%'),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-indigo-600' }, tr('baking.diagnosis.accuracy', 'Accuracy'))
              ),
              h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-center' },
                h('div', { className: 'text-xl font-black text-amber-700 tabular-nums flex items-center justify-center gap-1' },
                  streak >= 2 ? '\uD83D\uDD25' : '', streak
                ),
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-amber-600' }, tr('baking.diagnosis.streak', 'Streak'))
              )
            ),
            // Symptom card
            h('div', { className: 'rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-300 p-5 mb-4' },
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-4xl shrink-0', 'aria-hidden': true }, '\uD83E\uDD14'),
                h('div', { className: 'flex-grow' },
                  h('div', { className: 'flex items-center gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[10px] font-bold uppercase tracking-wider text-pink-700' }, tr('baking.diagnosis.symptom', 'Symptom')),
                    h('span', { className: 'text-[10px] font-bold uppercase tracking-wider bg-' + meta.color + '-100 text-' + meta.color + '-700 border border-' + meta.color + '-200 px-2 py-0.5 rounded-full' }, meta.label)
                  ),
                  h('p', { className: 'text-lg font-semibold text-slate-900 leading-snug' }, '\u201C' + scenario.symptom + '\u201D')
                )
              )
            ),
            // Options
            h('div', { className: 'space-y-2 mb-4' },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1' }, tr('baking.diagnosis.pick_cause', 'Pick the most likely cause')),
              scenario.options.map(function(opt) {
                var isSelected = selected === opt.id;
                var isCorrect = opt.correct;
                var showAsRight = revealed && isCorrect;
                var showAsWrong = revealed && isSelected && !isCorrect;
                var cls = 'w-full text-left rounded-xl border-2 p-3 transition-all ';
                if (showAsRight)       cls += 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300';
                else if (showAsWrong)  cls += 'bg-red-50 border-red-400 ring-2 ring-red-300';
                else if (isSelected)   cls += 'bg-pink-100 border-pink-500 ring-2 ring-pink-300';
                else if (revealed)     cls += 'bg-slate-50 border-slate-200 opacity-70';
                else                   cls += 'bg-white border-slate-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer';
                return h('button', {
                  key: opt.id,
                  onClick: function() { pickOption(opt.id); },
                  disabled: revealed,
                  className: cls,
                  'aria-pressed': isSelected,
                  'aria-label': opt.text + (revealed ? (isCorrect ? ' (correct answer)' : (isSelected ? ' (your answer, incorrect)' : '')) : '')
                },
                  h('div', { className: 'flex items-start gap-2' },
                    h('div', { className: 'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 ' +
                      (showAsRight ? 'bg-emerald-500 border-emerald-600 text-white' :
                       showAsWrong ? 'bg-red-500 border-red-600 text-white' :
                       isSelected ? 'bg-pink-500 border-pink-600 text-white' : 'border-slate-300 text-slate-400') },
                      showAsRight ? '\u2713' : showAsWrong ? '\u2717' : isSelected ? '\u2022' : ''
                    ),
                    h('div', { className: 'flex-grow' },
                      h('div', { className: 'text-sm font-semibold text-slate-900' }, opt.text),
                      revealed && (isSelected || isCorrect) && h('div', { className: 'mt-1.5 text-xs ' + (isCorrect ? 'text-emerald-800' : 'text-red-800') + ' leading-relaxed' }, opt.explain)
                    )
                  )
                );
              })
            ),
            // Action buttons
            h('div', { className: 'flex items-center gap-2 justify-end' },
              !revealed && h('button', {
                onClick: submitAnswer,
                disabled: !selected,
                className: 'px-5 py-2.5 rounded-full font-black text-sm text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-200 hover:shadow-pink-300 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95'
              }, tr('baking.diagnosis.check', 'Check answer') + ' \uD83D\uDD0E'),
              revealed && h('button', {
                onClick: nextScenario,
                className: 'px-5 py-2.5 rounded-full font-black text-sm text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-200 hover:shadow-pink-300 transition-all active:scale-95'
              }, tr('baking.diagnosis.next', 'Next scenario') + ' \u2192')
            ),
            // Best-streak note
            ext.diagBestStreak > 0 && h('div', { className: 'mt-4 text-center text-[11px] text-slate-500' },
              tr('baking.diagnosis.best_streak', 'Best streak this session: {n}', { n: ext.diagBestStreak })
            )
          );
        };

        // ═══════════════════════════════════════
        // SUB-TOOL 6: GLUTEN LAB
        // ═══════════════════════════════════════
        var renderGluten = function() {
          var protein   = d.glutenProtein   != null ? d.glutenProtein   : 11;
          var hydration = d.glutenHydration != null ? d.glutenHydration : 65;
          var knead     = d.glutenKnead     != null ? d.glutenKnead     : 5;

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

          // Crosslinks (only for medium+ strength) — short diagonals between neighbor strands
          var crosslinks = [];
          if (strength > 25 && strandCount > 2) {
            var linkCount = Math.round(strength / 10);
            for (var li = 0; li < linkCount; li++) {
              var lsi = Math.floor(Math.random() * (strandCount - 1));
              var lx = 30 + Math.floor(Math.random() * (svgW - 60));
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

          return h('div', { className: 'p-4 sm:p-6 max-w-4xl mx-auto' },
            h('div', { className: 'flex items-center justify-between mb-4 gap-2 flex-wrap' },
              h('div', null,
                h('h2', { className: 'text-xl sm:text-2xl font-black text-teal-800 flex items-center gap-2' }, '\uD83E\uDDF5 ' + tr('baking.activities.gluten_label', 'Gluten Lab')),
                h('p', { className: 'text-xs text-slate-600' }, tr('baking.gluten.tagline', 'Three variables decide how much gluten forms in your dough.'))
              ),
              backBtn('teal')
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Controls column
              h('div', { className: 'space-y-4' },
                // Flour protein
                h('div', { className: 'rounded-2xl bg-white border-2 border-teal-200 p-4' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'glu-protein', className: 'text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1' },
                      '\uD83C\uDF3E ', tr('baking.gluten.protein', 'Flour protein')
                    ),
                    h('span', { className: 'text-sm font-black text-teal-700 tabular-nums' }, protein.toFixed(1) + '%')
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
                        onClick: function() { upd('glutenProtein', fp.protein); },
                        className: 'px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ' + (active ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100')
                      }, fp.label);
                    })
                  )
                ),
                // Hydration
                h('div', { className: 'rounded-2xl bg-white border-2 border-sky-200 p-4' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'glu-hydration', className: 'text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1' },
                      '\uD83D\uDCA7 ', tr('baking.gluten.hydration', 'Hydration')
                    ),
                    h('span', { className: 'text-sm font-black text-sky-700 tabular-nums' }, hydration + '%')
                  ),
                  h('input', {
                    id: 'glu-hydration',
                    type: 'range',
                    min: 30, max: 110, step: 1,
                    value: hydration,
                    onChange: function(e) { upd('glutenHydration', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-sky-500'
                  }),
                  h('div', { className: 'mt-1 flex justify-between text-[10px] text-slate-500' },
                    h('span', null, tr('baking.gluten.hydr_dry', 'Stiff')),
                    h('span', null, tr('baking.gluten.hydr_sweet', 'Sweet spot')),
                    h('span', null, tr('baking.gluten.hydr_wet', 'Batter'))
                  )
                ),
                // Knead time
                h('div', { className: 'rounded-2xl bg-white border-2 border-emerald-200 p-4' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('label', { htmlFor: 'glu-knead', className: 'text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1' },
                      '\uD83D\uDD50 ', tr('baking.gluten.knead', 'Knead time')
                    ),
                    h('span', { className: 'text-sm font-black text-emerald-700 tabular-nums' }, knead + ' min')
                  ),
                  h('input', {
                    id: 'glu-knead',
                    type: 'range',
                    min: 0, max: 20, step: 1,
                    value: knead,
                    onChange: function(e) { upd('glutenKnead', parseInt(e.target.value, 10)); },
                    className: 'w-full accent-emerald-500'
                  }),
                  overworked && h('div', { className: 'mt-1 text-[10px] font-bold text-red-600 flex items-center gap-1' },
                    '\u26A0\uFE0F ', tr('baking.gluten.over_warning', 'Past 15 min risks over-kneading.')
                  )
                ),
                h('button', {
                  onClick: matchTarget,
                  className: 'w-full px-5 py-3 rounded-full font-black text-sm text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all active:scale-95'
                }, tr('baking.gluten.check_btn', 'Check against targets') + ' \uD83C\uDFAF')
              ),
              // Visualization column
              h('div', { className: 'rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300 p-4 space-y-3' },
                h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-teal-700' }, tr('baking.gluten.network', 'Gluten network')),
                  h('div', { className: 'text-3xl font-black text-teal-700 tabular-nums' }, strength)
                ),
                // SVG strand visualization
                h('div', { className: 'rounded-xl bg-white/80 border border-teal-200 p-2' },
                  h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: '150', 'aria-label': 'Gluten strand network, strength ' + strength },
                    strandPaths.map(function(p, i) {
                      return h('path', {
                        key: 'sp' + i,
                        d: p,
                        stroke: strokeColor,
                        strokeWidth: thickness,
                        fill: 'none',
                        strokeLinecap: 'round',
                        opacity: 0.35 + hydrationFactor * 0.55
                      });
                    }),
                    crosslinks.map(function(c, i) {
                      return h('line', {
                        key: 'cl' + i,
                        x1: c.x, y1: c.y1, x2: c.x + 4, y2: c.y2,
                        stroke: strokeColor,
                        strokeWidth: thickness * 0.5,
                        opacity: 0.4
                      });
                    })
                  )
                ),
                // Verdict banner
                h('div', { className: 'rounded-xl border-2 p-3 ' +
                  (verdictTone === 'red' ? 'bg-red-50 border-red-300 text-red-900' :
                   verdictTone === 'slate' ? 'bg-slate-50 border-slate-300 text-slate-800' :
                   verdictTone === 'teal' ? 'bg-teal-50 border-teal-300 text-teal-900' :
                   'bg-emerald-50 border-emerald-300 text-emerald-900')
                },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-70' }, tr('baking.gluten.verdict', 'Best for')),
                  h('div', { className: 'text-sm font-bold' }, verdictLabel)
                ),
                // Factor breakdown mini-bars
                h('div', { className: 'space-y-1.5' },
                  [
                    { label: tr('baking.gluten.protein',   'Flour protein'), val: glutenPotential, color: 'teal' },
                    { label: tr('baking.gluten.hydration', 'Hydration'),     val: hydrationFactor,  color: 'sky' },
                    { label: tr('baking.gluten.knead',     'Knead time'),    val: kneadFactor,      color: 'emerald' }
                  ].map(function(f, i) {
                    return h('div', { key: i, className: 'flex items-center gap-2 text-[11px]' },
                      h('div', { className: 'w-24 font-bold text-slate-700 shrink-0' }, f.label),
                      h('div', { className: 'flex-grow h-1.5 rounded-full bg-slate-200 overflow-hidden' },
                        h('div', { className: 'h-full bg-' + f.color + '-500 transition-all', style: { width: Math.round(f.val * 100) + '%' } })
                      ),
                      h('div', { className: 'w-10 text-right tabular-nums font-bold text-slate-700' }, Math.round(f.val * 100) + '%')
                    );
                  })
                )
              )
            ),
            // Target recipe buttons
            h('div', { className: 'mt-5 rounded-2xl bg-white border-2 border-teal-200 p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-teal-700 mb-2' }, tr('baking.gluten.try_target', 'Try to match a target')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                GLUTEN_TARGETS.map(function(tgt) {
                  var dist = distanceToTarget(tgt);
                  var match = dist <= 4;
                  return h('button', {
                    key: tgt.id,
                    onClick: function() { applyTarget(tgt); },
                    className: 'text-left rounded-xl border-2 p-2.5 transition-all ' + (match ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50'),
                    title: tgt.note
                  },
                    h('div', { className: 'text-sm font-black ' + (match ? 'text-emerald-800' : 'text-slate-800') }, tgt.label),
                    h('div', { className: 'text-[10px] text-slate-500 mt-0.5 leading-snug' }, tgt.note),
                    h('div', { className: 'mt-1 text-[10px] font-bold ' + (match ? 'text-emerald-700' : 'text-slate-500') },
                      match ? ('\u2713 ' + tr('baking.gluten.match', 'Match!')) : (tr('baking.gluten.distance', 'Distance: {n}', { n: dist }))
                    )
                  );
                })
              )
            ),
            // Science disclosure
            h('details', { className: 'mt-6 rounded-xl bg-teal-50 border border-teal-200 p-4' },
              h('summary', { className: 'cursor-pointer font-bold text-teal-900 text-sm' }, '\uD83D\uDCD6 ' + tr('baking.gluten.science_title', 'The science')),
              h('div', { className: 'mt-3 text-sm text-slate-700 space-y-2' },
                h('p', null, h('strong', null, tr('baking.gluten.sci_proteins', 'Two proteins, one network')), ': wheat flour has two proteins \u2014 ', h('em', null, 'glutenin'), ' and ', h('em', null, 'gliadin'), '. When you add water, they link up into long, elastic strands called ', h('strong', null, 'gluten'), '. More protein in the flour = more gluten potential.'),
                h('p', null, h('strong', null, tr('baking.gluten.sci_hydration', 'Water is the switch')), ': without enough water the proteins can\u2019t unfold and meet each other; too much water and they\u2019re diluted into a soup. The sweet spot for most breads is 60\u201375% hydration.'),
                h('p', null, h('strong', null, tr('baking.gluten.sci_knead', 'Kneading aligns the strands')), ': each fold and stretch aligns the proteins into parallel sheets. Early kneading builds rapidly; past about 10\u201315 minutes the network plateaus and eventually tears itself apart (over-kneading).'),
                h('p', null, h('strong', null, tr('baking.gluten.sci_tender', 'Tenderness = less gluten')), ': cakes, cookies, and pie crusts use low-protein flour and minimal mixing. Fat also ', h('em', null, 'shortens'), ' gluten strands \u2014 that\u2019s why butter makes pastry flaky.')
              )
            )
          );
        };

        // ═══════════════════════════════════════
        // ROUTER
        // ═══════════════════════════════════════
        if (subtool === 'leavening') return renderLeavening();
        if (subtool === 'emulsion')  return renderEmulsion();
        if (subtool === 'scaler')    return renderScaler();
        if (subtool === 'oven')      return renderOven();
        if (subtool === 'diagnosis') return renderDiagnosis();
        if (subtool === 'gluten')    return renderGluten();
        return renderMenu();
      })();
    }
  });

  console.log('[StemLab] bakingScience tool registered');
})();
