// ═══════════════════════════════════════════════════════════════
// stem_tool_kitchenlab.js — Kitchen Lab (Cooking & Food Safety)
// Life-skills + science lab covering food safety, knife technique,
// heat & cooking techniques, the Maillard reaction, real-time
// recipe simulation, and culinary terminology.
//
// Sister tool to NutritionLab (covers macros/micros/diet) and
// BakingScience (covers leavening/gluten/yeast). KitchenLab owns
// stovetop technique, knife work, food safety, and (eventually) a
// gamified competitive cooking sim. Three connected but distinct
// spaces in the food curriculum.
//
// Sources: USDA FSIS safe-temp tables, FDA Food Code 2022,
// ServSafe instructor guide, Modernist Cuisine on Maillard
// chemistry, Harold McGee "On Food and Cooking" (2nd ed.),
// CDC handwashing technique, WHO 12-step handwash protocol.
//
// Phase 1 v0.1: Safety + Knife + Heat fully implemented;
// Maillard / Recipe Sim / Resources stubbed for next ship.
// Eventual scope: ~20K lines including Real-Time Recipe Simulator
// (the headliner) with gamified competition mode.
//
// Registered tool ID: "kitchenLab"
// Category: applied (life skills + culinary science)
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('kitchenLab'))) {

(function() {
  'use strict';

  // ─── Live region for AI / state announcements ───
  (function() {
    if (document.getElementById('allo-live-kl')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-kl';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function klAnnounce(msg) {
    var lr = document.getElementById('allo-live-kl');
    if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
  }

  // ───────────────────────────────────────────────────────────
  // SAFE COOKING TEMPERATURES (USDA FSIS)
  // ───────────────────────────────────────────────────────────
  var SAFE_TEMPS = [
    { food: 'Poultry (whole + ground + parts)', emoji: '🍗', tempF: 165, tempC: 74,
      why: 'Salmonella + Campylobacter live in poultry guts and easily contaminate the meat during processing. 165°F denatures their proteins instantly.',
      pitfall: 'Don\'t trust color. Pink poultry can be perfectly safe at 165°F; brown poultry can still be undercooked. Use a thermometer.' },
    { food: 'Ground meat (beef, pork, lamb)', emoji: '🍔', tempF: 160, tempC: 71,
      why: 'Grinding spreads surface bacteria throughout the meat, so the whole interior must reach a kill temp — unlike steak where the inside is sterile.',
      pitfall: 'Medium-rare ground beef is a real food-safety hazard, not just a preference. The CDC has linked many outbreaks to undercooked burgers.' },
    { food: 'Whole cuts (beef, pork, lamb, veal steaks/roasts)', emoji: '🥩', tempF: 145, tempC: 63,
      why: 'Bacteria live on the SURFACE of intact muscle meat. Searing the surface kills them; the interior is essentially sterile from the live animal.',
      pitfall: 'Plus a 3-minute rest. Carryover cooking continues to raise the internal temp and lets juices redistribute.' },
    { food: 'Fish + shellfish', emoji: '🐟', tempF: 145, tempC: 63,
      why: 'Fish proteins denature at lower temps than meat. Above 145°F the flesh flakes easily with a fork. Parasites (anisakis) die at this temp or with proper freezing.',
      pitfall: 'Sushi-grade raw fish must be flash-frozen at -4°F for 7 days first to kill parasites. "Fresh-caught" raw fish is the dangerous one.' },
    { food: 'Eggs (cooked dish)', emoji: '🍳', tempF: 160, tempC: 71,
      why: 'Salmonella can live inside intact shell eggs (transferred from the hen). 160°F denatures the proteins — yolks fully set.',
      pitfall: 'Runny yolks are below this threshold. Use pasteurized eggs (or eggs from a known clean source) if you want soft-yolk dishes for kids, pregnant, elderly, or immunocompromised people.' },
    { food: 'Leftovers + casseroles', emoji: '🥘', tempF: 165, tempC: 74,
      why: 'Reheating must reach 165°F to kill any bacteria that grew during refrigeration. Lower temps just warm them up — they keep multiplying.',
      pitfall: 'Microwaves create cold spots. Stir halfway through and let stand 1 min so heat equalizes.' },
    { food: 'Hams (raw, not pre-cooked)', emoji: '🍖', tempF: 145, tempC: 63,
      why: 'Same logic as whole cuts. Pre-cooked hams just need to reach 140°F to be palatable.', pitfall: 'Read the label — "cook before eating" vs "fully cooked, heat to serve" are different cooking targets.' }
  ];

  // ───────────────────────────────────────────────────────────
  // BACTERIA GROWTH ZONES (FDA Food Code)
  // ───────────────────────────────────────────────────────────
  // Returns {zone, label, color, growthRate, descr} for a given F temp
  function tempZone(tempF) {
    if (tempF < 32) return { zone: 'frozen', label: 'Frozen', color: '#7dd3fc', rate: 0,
      descr: 'Below 32°F (0°C). Bacteria are dormant — they don\'t die, but they don\'t grow either. Freezing is not a kill step.' };
    if (tempF < 40) return { zone: 'refrig', label: 'Refrigerated (safe)', color: '#38bdf8', rate: 0.05,
      descr: 'Below 40°F (4°C). The fridge zone. Most foodborne bacteria grow very slowly here — safe for short-term storage.' };
    if (tempF < 140) return { zone: 'danger', label: 'DANGER ZONE', color: '#dc2626', rate: 1,
      descr: '40°F–140°F (4°C–60°C). Bacteria can double every 20 minutes. Food should not stay here for more than 2 hours total (1 hour if ambient is over 90°F).' };
    if (tempF < 165) return { zone: 'cooking', label: 'Cooking (most foods)', color: '#f59e0b', rate: -0.5,
      descr: '140°F–165°F (60°C–74°C). Above the danger zone — bacteria die over time. Hold above 140°F for safe service.' };
    if (tempF < 212) return { zone: 'hot', label: 'Safe cook + hold', color: '#dc2626', rate: -1,
      descr: 'Above 165°F (74°C). Kills bacteria on contact. Most cooking happens here.' };
    return { zone: 'boil', label: 'Boiling', color: '#ef4444', rate: -1,
      descr: 'Water boils at 212°F (100°C) at sea level. Boiling kills bacteria instantly but doesn\'t neutralize all toxins — sometimes the bacteria die but the poisons they made survive.' };
  }

  // ───────────────────────────────────────────────────────────
  // KNIFE CUTS — geometry + use cases
  // ───────────────────────────────────────────────────────────
  var KNIFE_CUTS = [
    { id: 'largeDice', name: 'Large Dice (Carré)', sizeIn: '3/4', sizeCm: '2 cm', emoji: '🟧',
      use: 'Stews, roasts, hearty soups — long cooks where chunky pieces hold their shape.',
      why: 'Bigger pieces have less surface area per volume — they cook slower from outside in, keep their integrity in a 2-hour braise.',
      bestFor: 'Potatoes for stew, root vegetables for roasting' },
    { id: 'mediumDice', name: 'Medium Dice (Parmentier)', sizeIn: '1/2', sizeCm: '1.2 cm', emoji: '🟧',
      use: 'Most soups, pan-fried sides, casseroles — the workhorse cut.',
      why: 'Cooks in 8-15 minutes. Standard size for most home recipes that don\'t specify.',
      bestFor: 'Mirepoix base for stocks + sauces, vegetable soups, hash' },
    { id: 'smallDice', name: 'Small Dice (Macédoine)', sizeIn: '1/4', sizeCm: '6 mm', emoji: '🟫',
      use: 'Salsas, relishes, mirepoix for short-cook recipes, garnishes.',
      why: 'Quick to cook (3-5 min). High surface area releases flavor fast — good for sofrito + sweat techniques.',
      bestFor: 'Pico de gallo, fine mirepoix, garnish brunoise base' },
    { id: 'brunoise', name: 'Brunoise', sizeIn: '1/8', sizeCm: '3 mm', emoji: '⬛',
      use: 'Garnishes, fine sauces, professional plating.',
      why: 'Tiny + uniform. Cooks in seconds. Visual elegance for plated dishes — proves knife skill.',
      bestFor: 'Beurre blanc garnish, consommé royale, fine soup garnishes' },
    { id: 'julienne', name: 'Julienne (Allumette)', sizeIn: '1/8 × 1/8 × 2', sizeCm: '3 mm × 3 mm × 5 cm', emoji: '🌾',
      use: 'Stir-fries, slaws, garnishes, salads.',
      why: 'Long matchsticks cook FAST and evenly. Surface area + length = quick cook + visible "strands" on the plate.',
      bestFor: 'Stir-fry vegetables, carrot slaw, garnish on top of mains' },
    { id: 'chiffonade', name: 'Chiffonade', sizeIn: 'ribbons', sizeCm: '2-3 mm ribbons', emoji: '🥬',
      use: 'Leafy herbs + greens — basil, mint, sage, spinach.',
      why: 'Stacking + rolling tightly + slicing thin gives uniform ribbons that look pretty AND release oils without bruising.',
      bestFor: 'Basil over Caprese, mint over lamb, lettuce wraps' },
    { id: 'mince', name: 'Mince', sizeIn: '< 1/16', sizeCm: '< 1.5 mm', emoji: '🧄',
      use: 'Garlic, ginger, shallot, herbs — when you want the flavor to disperse evenly.',
      why: 'No discrete pieces — the ingredient melts into whatever it\'s cooked in. Garlic at this size browns in 30 seconds.',
      bestFor: 'Garlic for any sauté, ginger paste, fine herb prep' },
    { id: 'rough', name: 'Rough Chop', sizeIn: 'varies', sizeCm: 'varies', emoji: '🥕',
      use: 'Stock + broth, when pieces will be strained out anyway.',
      why: 'Don\'t waste knife time on perfection — pieces will be discarded. Just expose surface area for flavor extraction.',
      bestFor: 'Mirepoix for chicken stock, onion + carrot + celery for soup broth' }
  ];

  // ───────────────────────────────────────────────────────────
  // COOKING TECHNIQUES — heat science + what's happening
  // ───────────────────────────────────────────────────────────
  var TECHNIQUES = [
    { id: 'saute', name: 'Sauté', emoji: '🍳', panTempF: 325, fatNeeded: true, mediumDepth: 'film',
      time: 'short (1-10 min)',
      whatHappens: 'High-heat dry cooking in a thin layer of fat. Food browns via Maillard, water inside vaporizes quickly so the surface stays dry and crisp.',
      keyScience: 'Surface temp 280°F+ triggers Maillard browning. Below that you get gray steamed food, not golden sauté.',
      foodExamples: ['Mushrooms', 'Onion + garlic base', 'Quick-cook vegetables', 'Thin protein cutlets'],
      mistake: 'Crowding the pan — when food touches food, water vapor traps in between, temp drops below browning threshold, food steams instead of browns. Cook in batches.',
      visualCue: 'Listen for the sizzle — that\'s water flashing to steam at the surface. Quiet pan = too cold.' },
    { id: 'sear', name: 'Sear', emoji: '🔥', panTempF: 425, fatNeeded: true, mediumDepth: 'film',
      time: 'very short (1-3 min per side)',
      whatHappens: 'Very high heat creates a brown, crispy crust via Maillard while the interior stays mostly raw. Used as a first step before lower-heat finishing.',
      keyScience: 'Maillard accelerates dramatically above 300°F. At 425°F surface temp the reaction completes in 30-60 seconds — that\'s the brown crust.',
      foodExamples: ['Steaks', 'Scallops', 'Chicken breasts before braising', 'Tuna for tataki'],
      mistake: 'Cold pan + cold food. The PAN must reach searing temp BEFORE the food touches it. Drop water in — it should evaporate in 2 seconds, not pool.',
      visualCue: 'Pat the food bone-dry first. Surface water turns to steam, drops surface temp, prevents the crust forming.' },
    { id: 'simmer', name: 'Simmer', emoji: '🥣', panTempF: 190, fatNeeded: false, mediumDepth: 'submerge',
      time: 'medium-long (15 min - 4 hours)',
      whatHappens: 'Hot liquid (180-205°F) gently breaks down tough proteins + collagen into gelatin, melds flavors, reduces sauce.',
      keyScience: 'Collagen begins dissolving above 160°F; at 180°F+ it converts to gelatin (silky mouthfeel). Below 200°F prevents proteins from squeezing out moisture.',
      foodExamples: ['Stocks', 'Stews + braises', 'Soup', 'Tomato sauce reduction'],
      mistake: 'Confusing simmer with boil. Boiling (212°F) makes proteins seize + dry out, breaks emulsions, makes broth cloudy. Simmer = small bubbles around the edge, occasional surface ripple.',
      visualCue: 'A small lazy bubble or two per second, mostly silent. Big rolling bubbles + sound = too hot.' },
    { id: 'boil', name: 'Boil', emoji: '💧', panTempF: 212, fatNeeded: false, mediumDepth: 'submerge',
      time: 'short (5-15 min)',
      whatHappens: 'Water at full 212°F cooks food fast. Used when you want speed + don\'t care about gentleness.',
      keyScience: 'Water can\'t exceed 212°F at sea level (it converts to steam first). At elevation water boils cooler — pasta takes longer in Denver than Boston.',
      foodExamples: ['Pasta', 'Hard-boiled eggs', 'Blanching vegetables before shocking'],
      mistake: 'Salting only at the end. The water needs to be salted DURING the boil so the food absorbs it. Add salt liberally — "salty as the sea" for pasta water.',
      visualCue: 'Full rolling boil — bubbles cover the entire surface, can\'t be stirred away.' },
    { id: 'braise', name: 'Braise', emoji: '🍲', panTempF: 290, fatNeeded: true, mediumDepth: 'partial',
      time: 'long (1.5 - 4 hours)',
      whatHappens: 'Sear first (crust), then partially submerge in liquid + cover + cook low + slow in oven or stovetop. Tough cuts become fork-tender.',
      keyScience: 'Long low heat (290-310°F oven) gives collagen TIME to convert to gelatin. The food stays tender because moisture loss is slow and the converted gelatin holds water.',
      foodExamples: ['Pot roast', 'Short ribs', 'Coq au vin', 'Braised greens', 'Carnitas'],
      mistake: 'Skipping the sear. The sear builds the flavor base — Maillard compounds end up in the braising liquid + sauce.',
      visualCue: 'Liquid covers food halfway. Pot is covered. Tiny bubbles emerging at the surface.' },
    { id: 'roast', name: 'Roast', emoji: '🥖', panTempF: 400, fatNeeded: true, mediumDepth: 'none',
      time: 'medium (20 min - 3 hours)',
      whatHappens: 'Dry oven heat (350-450°F) surrounds food. Surface browns via Maillard while interior cooks slower from outside-in.',
      keyScience: 'Convection currents in the oven move hot air; food browns where the air is hottest (top + bottom of oven). Rotating during cook = even browning.',
      foodExamples: ['Whole chicken', 'Beef roasts', 'Root vegetables', 'Sheet-pan dinners'],
      mistake: 'Skipping the rest. After roasting, juices need 10-20 min to redistribute. Cutting immediately = juice runs out = dry meat.',
      visualCue: 'Surface is deeply browned. Internal temp matches the safe-temp table (use a thermometer).' },
    { id: 'steam', name: 'Steam', emoji: '♨️', panTempF: 212, fatNeeded: false, mediumDepth: 'none',
      time: 'short (3-15 min)',
      whatHappens: 'Food cooks in steam (212°F water vapor) without direct contact with liquid. Preserves color, texture, and vitamins.',
      keyScience: 'Vitamins B + C are water-soluble — boiling leaches them into the water. Steam keeps them in the food.',
      foodExamples: ['Broccoli', 'Dumplings', 'Fish fillets', 'Asparagus', 'Tamales'],
      mistake: 'Letting steamer run dry. Water below the basket boils off — burned pan, ruined food, broken cookware. Check water level.',
      visualCue: 'Steady steam visible escaping the lid. Lid lifted briefly = burst of hot vapor.' },
    { id: 'fry', name: 'Deep Fry', emoji: '🍟', panTempF: 350, fatNeeded: true, mediumDepth: 'submerge',
      time: 'short (2-8 min)',
      whatHappens: 'Food submerged in 325-375°F oil. The high heat rapidly creates a crust while the inside steam-cooks.',
      keyScience: 'Oil temp matters: too low (under 300°F) = food absorbs oil + gets greasy. Too high (over 400°F) = surface burns before inside cooks.',
      foodExamples: ['French fries (double fry)', 'Tempura', 'Fried chicken', 'Doughnuts'],
      mistake: 'Crowding the oil. Cold food drops oil temp fast; below 325°F the food sponges up oil instead of crisping.',
      visualCue: 'Active bubbling around food. When bubbling slows, food is mostly cooked.' }
  ];

  // ───────────────────────────────────────────────────────────
  // KITCHEN ALLERGENS (top 9 per FDA + sesame law 2023)
  // ───────────────────────────────────────────────────────────
  var ALLERGENS_9 = [
    { name: 'Milk', emoji: '🥛', prev: '~1-3% kids', notes: 'Casein + whey proteins. Different from lactose intolerance — milk allergy is immune, lactose intolerance is digestive.', hiddenIn: 'Caramel coloring (some), some breads, processed meats, "natural flavor"' },
    { name: 'Eggs', emoji: '🥚', prev: '~1.5% kids', notes: 'Mostly egg white (ovalbumin + ovomucoid). Many kids outgrow by age 5.', hiddenIn: 'Marshmallow, marzipan, some pasta, foam on coffee drinks, lecithin (sometimes)' },
    { name: 'Peanuts', emoji: '🥜', prev: '~2% kids, 1% adults', notes: 'Legume, not a true nut. Often co-allergic with tree nuts. Severe reactions common.', hiddenIn: 'Asian sauces (satay, pad thai), some chili, baked goods, candy, "natural flavor"' },
    { name: 'Tree Nuts', emoji: '🌰', prev: '~1% population', notes: 'Almonds, cashews, walnuts, pecans, pistachios, etc. Each is its own allergy.', hiddenIn: 'Pesto (pine nuts), marzipan (almond), nut milks, baked goods, BBQ sauce sometimes' },
    { name: 'Fish', emoji: '🐟', prev: '~0.4% kids, 0.5% adults', notes: 'Parvalbumin protein. Salmon-allergic ≠ tuna-allergic always — species-specific possible.', hiddenIn: 'Caesar dressing (anchovies), Worcestershire sauce, some pizza toppings, fish sauce in SE Asian dishes' },
    { name: 'Shellfish', emoji: '🦐', prev: '~2% adults', notes: 'Tropomyosin protein. Most common adult-onset food allergy. Often lifelong.', hiddenIn: 'Glucosamine supplements, some Asian sauces, some carrageenan products, fish sauce' },
    { name: 'Soy', emoji: '🫘', prev: '~0.4% kids', notes: 'Most outgrow. Soy LECITHIN typically tolerated (different protein structure).', hiddenIn: 'Most processed foods, soy sauce (gluten-free versions often soy-based), bread, chocolate' },
    { name: 'Wheat', emoji: '🌾', prev: '~0.4% kids', notes: 'Wheat ALLERGY (immune) differs from celiac disease (autoimmune to gluten) — different mechanism.', hiddenIn: 'Soy sauce (most), beer, some chocolate, processed cold cuts, soup base' },
    { name: 'Sesame', emoji: '🌱', prev: '~0.2% adults (rising)', notes: 'Added to top-9 list in 2023 by FASTER Act. Very low threshold for reactions — even cross-contamination matters.', hiddenIn: 'Hummus + tahini, many burger buns, "spices" + "natural flavor", crackers, energy bars' }
  ];

  // ───────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────
  function defaultState() {
    return {
      activeSection: 'safety',
      // Safety
      safetyTemp: 70,      // Danger-zone slider position (°F)
      handwashStart: null, // Timestamp when started
      handwashStep: 0,
      // Knife
      knifeSelectedCut: 'mediumDice',
      // Heat
      heatTechnique: 'saute',
      heatPanTempF: 350,
      heatTimeMin: 5,
      // Progression
      klXp: 0,
      klAchievements: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.StemLab.registerTool('kitchenLab', {
    icon: '🍳',
    label: 'Kitchen Lab',
    desc: 'Cooking & food safety life skills with culinary science: USDA safe temps + bacteria danger zone, knife cuts (dice / julienne / chiffonade / brunoise), heat techniques (sauté / sear / simmer / braise / roast / fry / steam), the Maillard reaction, top-9 allergens. Real-time recipe simulator + gamified cooking competition coming in v0.2. Sister tool to NutritionLab and BakingScience.',
    color: 'orange',
    category: 'applied',
    questHooks: [
      { id: 'open_safety', label: 'Open Kitchen Safety School', icon: '🛡️',
        check: function(d) { return !!(d && d.klViewedSafety); },
        progress: function(d) { return (d && d.klViewedSafety) ? 'opened' : 'not yet'; } },
      { id: 'open_knife', label: 'Learn at least one knife cut', icon: '🔪',
        check: function(d) { return !!(d && d.klViewedKnife); },
        progress: function(d) { return (d && d.klViewedKnife) ? 'opened' : 'not yet'; } },
      { id: 'open_heat', label: 'Explore a cooking technique', icon: '🔥',
        check: function(d) { return !!(d && d.klViewedHeat); },
        progress: function(d) { return (d && d.klViewedHeat) ? 'opened' : 'not yet'; } },
      { id: 'handwash_complete', label: 'Complete the WHO handwash timer', icon: '🧼',
        check: function(d) { return !!(d && d.klHandwashCompleted); },
        progress: function(d) { return (d && d.klHandwashCompleted) ? 'completed' : 'not yet'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = function(n) { if (ctx.awardXP) ctx.awardXP('kitchenLab', n); };

      var d = labToolData.kitchenLab || defaultState();
      function setKL(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.kitchenLab) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { kitchenLab: next });
        });
      }
      var section = d.activeSection || 'safety';

      function setSection(s) {
        var patch = { activeSection: s };
        patch['klViewed' + s.charAt(0).toUpperCase() + s.slice(1)] = true;
        setKL(patch);
      }

      // ─── Atmospheric backdrop ───
      // Warm hearth palette: amber glow at top center (the "kitchen
      // light"), faint paper-grain texture, terracotta-to-warm-charcoal
      // diagonal as base. Distinct from BehaviorLab (amber) and
      // PrintingPress (sepia) by leaning warmer / more red.
      var klGrainSvg = (function() {
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
            '<filter id="g">' +
              '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="13"/>' +
              '<feColorMatrix values="0 0 0 0 0.7   0 0 0 0 0.4   0 0 0 0 0.2   0 0 0 0.06 0"/>' +
            '</filter>' +
            '<rect width="100%" height="100%" filter="url(#g)"/>' +
          '</svg>';
        return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
      })();
      var rootStyle = {
        background:
          'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(251,146,60,0.18), transparent 70%), ' +
          klGrainSvg + ', ' +
          'linear-gradient(135deg, #1c1410 0%, #3a2418 50%, #1c1410 100%)',
        backgroundRepeat: 'no-repeat, repeat, no-repeat',
        backgroundAttachment: 'fixed, scroll, fixed',
        minHeight: '100vh',
        color: '#f1f5f9'
      };

      // ─── Reusable shells ───
      function panelHeader(title, subtitle) {
        return h('div', { style: { marginBottom: 18 } },
          h('div', { style: { fontSize: 22, fontWeight: 800, color: '#fde68a', letterSpacing: '-0.01em', marginBottom: 4 } }, title),
          subtitle ? h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, maxWidth: 720 } }, subtitle) : null);
      }

      function renderHeader() {
        var TABS = [
          { id: 'safety', label: 'Safety', icon: '🛡️', sub: 'food safety' },
          { id: 'knife', label: 'Knife Lab', icon: '🔪', sub: 'cuts + technique' },
          { id: 'heat', label: 'Heat & Technique', icon: '🔥', sub: '8 cooking methods' },
          { id: 'maillard', label: 'Maillard', icon: '🟫', sub: 'the browning reaction' },
          { id: 'recipe', label: 'Recipe Sim', icon: '🍽️', sub: 'real-time cooking' },
          { id: 'resources', label: 'Resources', icon: '📚', sub: 'glossary + cheat sheets' }
        ];
        var sectionCount = TABS.length;
        var currentTab = TABS.find(function(tab) { return tab.id === section; }) || TABS[0];
        return h('div', { style: { padding: '24px 20px 12px', borderBottom: '1px solid rgba(251,146,60,0.18)' } },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' } },
            // Accent badge
            h('div', { 'aria-hidden': 'true',
              style: { width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(251,146,60,0.18)',
                border: '2px solid rgba(251,146,60,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' } }, '🍳'),
            h('div', { style: { flex: 1, minWidth: 240 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 22, fontWeight: 800, color: '#fde68a', letterSpacing: '-0.01em' } }, 'Kitchen Lab'),
                h('div', { style: { fontSize: 10, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.12)',
                    border: '1px solid rgba(251,146,60,0.3)', padding: '2px 8px', borderRadius: 9999, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  sectionCount + ' sections')),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 } },
                'Cooking life skills + culinary science. Food safety, knife technique, heat methods, Maillard chemistry, recipes, glossary. Built for life skills classrooms + family + consumer science.'))));
      }

      function renderTabs() {
        var TABS = [
          { id: 'safety', label: 'Safety', icon: '🛡️' },
          { id: 'knife', label: 'Knife Lab', icon: '🔪' },
          { id: 'heat', label: 'Heat & Technique', icon: '🔥' },
          { id: 'maillard', label: 'Maillard', icon: '🟫' },
          { id: 'recipe', label: 'Recipe Sim', icon: '🍽️' },
          { id: 'resources', label: 'Resources', icon: '📚' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Kitchen Lab sections',
          style: { display: 'flex', flexWrap: 'wrap', gap: 0, padding: '0 16px',
            borderBottom: '1px solid rgba(251,146,60,0.25)', position: 'relative', zIndex: 1 } },
          TABS.map(function(t) {
            var active = section === t.id;
            return h('button', {
              key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function() { setSection(t.id); awardXP(2); },
              style: {
                padding: '10px 16px',
                background: active ? 'rgba(28,20,16,0.95)' : 'transparent',
                color: active ? '#fde68a' : '#94a3b8',
                border: active ? '1px solid rgba(251,146,60,0.4)' : '1px solid transparent',
                borderBottom: active ? '2px solid #fb923c' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                marginBottom: -1,
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s'
              }
            }, h('span', { 'aria-hidden': 'true' }, t.icon), t.label);
          }));
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 1 — KITCHEN SAFETY SCHOOL
      // ═══════════════════════════════════════════════════════
      function renderSafety() {
        var curTemp = d.safetyTemp || 70;
        var zone = tempZone(curTemp);
        // Bacteria growth visualization: relative population over 2 hours at this temp
        var growthAfter2h = (function() {
          if (zone.rate <= 0) return 1;
          // Bacteria can double every ~20 min in danger zone (rate=1)
          // After 2h = 6 doublings = 64x. Below 70°F slower.
          var optimalDanger = curTemp >= 70 && curTemp <= 110;
          var doublings = optimalDanger ? 6 : 3;
          return Math.pow(2, doublings);
        })();
        return h('div', null,
          panelHeader('🛡️ Kitchen Safety School',
            'The science of NOT making people sick. Bacteria + cross-contamination + safe temps + handwashing + the top-9 allergens — what every cook needs to know before they cook.'),

          // ─── Danger Zone Visualizer ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🌡️ The Danger Zone (FDA Food Code)'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              'Bacteria grow fastest between 40°F and 140°F (4°C–60°C). This is "the danger zone." Food shouldn\'t sit here for more than 2 hours total (1 hour if it\'s over 90°F outside). Drag the slider to see what happens at different temps.'),
            // Temp slider
            h('div', { style: { marginBottom: 14 } },
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 } },
                h('span', null, 'Food temperature'),
                h('span', { style: { color: zone.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, curTemp + '°F (' + Math.round((curTemp - 32) * 5 / 9) + '°C)')),
              h('input', { type: 'range', min: 32, max: 220, step: 1, value: curTemp,
                onChange: function(e) { setKL({ safetyTemp: parseInt(e.target.value, 10) }); },
                'aria-label': 'Food temperature in Fahrenheit',
                style: { width: '100%', accentColor: zone.color } })),
            // Zone callout
            h('div', { style: {
                background: zone.color + '18', border: '1px solid ' + zone.color + '55',
                borderLeft: '4px solid ' + zone.color,
                padding: '14px 16px', borderRadius: 10, marginBottom: 12 } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: zone.color, marginBottom: 6 } }, zone.label),
              h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, zone.descr)),
            // Growth visualization
            zone.zone === 'danger' ? h('div', { style: { background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', padding: 12, borderRadius: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'After 2 hours at this temp'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 } },
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' } }, growthAfter2h + '×'),
                h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.45 } }, 'starting bacterial population')),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
                growthAfter2h >= 64 ? 'At ~optimal-growth temp, a single bacterium can become 64+ by hour 2. If you started with 100, you now have 6,400. If you started with 1,000, you have 64,000.' : 'Below 70°F bacteria grow slower but still doubling. Don\'t leave food on the counter to "cool" — chill it within 2 hours.')) : null
          ),

          // ─── USDA Safe Temps ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🔥 USDA Safe Cooking Temperatures'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              'These are the minimum internal temperatures. A meat thermometer is the only way to know for sure. Color is unreliable — pink chicken at 165°F is safe; brown chicken at 140°F is not.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 } },
              SAFE_TEMPS.map(function(t, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)',
                    borderLeft: '4px solid #fb923c', borderRadius: 10, padding: '12px 14px' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, t.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, t.food),
                      h('div', { style: { fontSize: 11, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                        t.tempF + '°F (' + t.tempC + '°C)'))),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } },
                    h('b', { style: { color: '#e2e8f0' } }, 'Why: '), t.why),
                  h('div', { style: { fontSize: 10, color: '#fb923c', lineHeight: 1.5, background: 'rgba(251,146,60,0.08)', padding: '6px 8px', borderRadius: 6 } },
                    h('b', null, '⚠️ Pitfall: '), t.pitfall));
              }))),

          // ─── WHO Handwash Timer ───
          renderHandwashTimer(),

          // ─── Cross-contamination quick rules ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🚫 Cross-Contamination Rules'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 12 } },
              'Pathogens move from raw meat → hands → cutting board → ready-to-eat food. The fixes are simple but easy to forget mid-cook.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
              [
                { icon: '🪧', rule: 'Separate cutting boards (or wash thoroughly)', detail: 'Red board for raw meat, green for produce. Many home kitchens skip this — it\'s the #1 home-kitchen cross-contamination source.' },
                { icon: '🧼', rule: 'Wash hands AFTER touching raw meat', detail: '20 seconds with soap + hot water. The 20 seconds is what dislodges the bacteria — soap alone doesn\'t.' },
                { icon: '🧊', rule: 'Thaw meat in fridge, never on counter', detail: 'Surface thaws fast → bacteria multiply on the outside while inside is still frozen. Fridge keeps the whole thing under 40°F.' },
                { icon: '📥', rule: 'Marinade-as-sauce: cook it first', detail: 'Marinade that touched raw meat contains those pathogens. Boil it 1 min before using as a finishing sauce, or make extra separately.' },
                { icon: '🧽', rule: 'Replace sponges weekly + microwave wet daily', detail: 'Damp kitchen sponges harbor more bacteria per square cm than the toilet seat. Microwaving wet for 90 seconds sanitizes most of it.' },
                { icon: '🌡️', rule: 'Two-hour rule', detail: 'Cooked food in danger zone (40-140°F) → into fridge within 2 hours (1 hour if room is 90°F+).' }
              ].map(function(r, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid #dc2626', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { style: { fontSize: 20 }, 'aria-hidden': 'true' }, r.icon),
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a' } }, r.rule)),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, r.detail));
              }))),

          // ─── Top 9 Allergens ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '⚠️ The Top 9 Allergens (FDA + FASTER Act)'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              'These 9 cause ~90% of all severe food allergic reactions in the US. Sesame was added in 2023. By law, packaged food must declare these. The "hidden in" column matters most — that\'s where surprises happen.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              ALLERGENS_9.map(function(a, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid #eab308', padding: '12px 14px', borderRadius: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, a.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, a.name),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                        'Prevalence: ' + a.prev))),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, a.notes),
                  h('div', { style: { fontSize: 10, color: '#fbbf24', lineHeight: 1.5, background: 'rgba(234,179,8,0.08)', padding: '6px 8px', borderRadius: 6 } },
                    h('b', null, '🕵️ Hidden in: '), a.hiddenIn));
              })))
        );
      }

      // ─── WHO Handwash 20-second timer ───
      function renderHandwashTimer() {
        var started = d.handwashStart;
        var elapsed = started ? Math.min(20, (Date.now() - started) / 1000) : 0;
        var pct = Math.min(100, (elapsed / 20) * 100);
        return h('div', { style: cardStyle() },
          h('div', { style: subheaderStyle() }, '🧼 20-Second Handwash (CDC + WHO)'),
          h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
            'Soap + 20 seconds + friction = the minimum for hand sanitation in a kitchen. The mechanical action (friction) is what dislodges bacteria — soap loosens them, water rinses them away.'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { onClick: function() {
                if (!started) {
                  setKL({ handwashStart: Date.now() });
                  klAnnounce('Handwash timer started. 20 seconds.');
                  // Auto-complete after 20s
                  setTimeout(function() {
                    var c = (labToolData.kitchenLab) || {};
                    if (c.handwashStart) {
                      setKL({ handwashStart: null, klHandwashCompleted: true });
                      klAnnounce('Handwash complete — 20 seconds reached.');
                      awardXP(5);
                    }
                  }, 20000);
                } else {
                  setKL({ handwashStart: null });
                }
              },
              style: { padding: '10px 18px', background: started ? '#dc2626' : '#16a34a', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
              started ? '⏹ Stop' : '▶ Start 20s timer'),
            h('div', { style: { flex: 1, minWidth: 200 } },
              h('div', { style: { height: 12, background: 'rgba(15,23,42,0.6)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)' } },
                h('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', transition: started ? 'width 1s linear' : 'none' } })),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' } },
                Math.round(elapsed) + ' / 20 sec' + (elapsed >= 20 ? ' ✓ complete' : '')))),
          h('ol', { style: { margin: '4px 0 0 0', padding: 0, listStyle: 'none', counterReset: 'hw-steps' } },
            [
              'Wet hands with running water (warm preferred but not required).',
              'Apply enough soap to cover all surfaces.',
              'Palm to palm in circular motion.',
              'Right palm over back of left hand, fingers interlaced. Switch.',
              'Palm to palm, fingers interlaced.',
              'Backs of fingers to opposing palms (interlocking grip).',
              'Rotate left thumb clasped in right palm. Switch.',
              'Rotate right fingertips in left palm, backwards + forwards. Switch.',
              'Rinse hands thoroughly with running water.',
              'Dry with single-use towel or air dry. Use towel to turn off tap (avoid recontamination).'
            ].map(function(step, i) {
              return h('li', { key: i, style: { display: 'flex', gap: 10, padding: '6px 0', fontSize: 12, color: '#cbd5e1', borderBottom: i < 9 ? '1px solid rgba(100,116,139,0.15)' : 'none' } },
                h('div', { style: { width: 24, height: 24, borderRadius: '50%', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)', color: '#fb923c', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'ui-monospace, Menlo, monospace' } }, i + 1),
                h('div', null, step));
            })));
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 2 — KNIFE LAB
      // ═══════════════════════════════════════════════════════
      function renderKnife() {
        var selectedId = d.knifeSelectedCut || 'mediumDice';
        var selected = KNIFE_CUTS.find(function(c) { return c.id === selectedId; }) || KNIFE_CUTS[1];
        return h('div', null,
          panelHeader('🔪 Knife Lab — The Cuts',
            'Knife cuts are not just for plating. Uniform cuts cook uniformly — and unevenly-cut food has some pieces burned + some raw. Mise en place (everything in its place, pre-cut) is the foundation of every recipe that turns out right.'),

          // ─── Cut picker ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Pick a cut to learn'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
              KNIFE_CUTS.map(function(c) {
                var active = c.id === selectedId;
                return h('button', { key: c.id,
                  onClick: function() { setKL({ knifeSelectedCut: c.id }); awardXP(1); klAnnounce('Selected ' + c.name); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '8px 12px',
                    background: active ? 'rgba(251,146,60,0.25)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#fde68a' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(251,146,60,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true' }, c.emoji), c.name);
              }))),

          // ─── Selected cut details ───
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 20, fontWeight: 800, color: '#fde68a' } }, selected.emoji + ' ' + selected.name),
              h('div', { style: { fontSize: 11, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', background: 'rgba(251,146,60,0.1)', padding: '3px 8px', borderRadius: 6 } },
                selected.sizeIn + '" (' + selected.sizeCm + ')')),
            // Cut visualization
            h('div', { style: { background: 'rgba(15,23,42,0.5)', borderRadius: 10, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 } },
              renderCutSvg(selected)),
            // Details
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } },
              [
                { lbl: '🍽️ Used for', val: selected.use, color: '#fde68a' },
                { lbl: '🔬 The science', val: selected.why, color: '#7dd3fc' },
                { lbl: '⭐ Best examples', val: selected.bestFor, color: '#86efac' }
              ].map(function(b, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.4)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, b.lbl),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, b.val));
              }))),

          // ─── Why uniformity matters ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🎯 Why Uniformity Matters'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
              'When pieces are different sizes, they finish cooking at different times. Small pieces burn while large pieces are still raw. Uniform cuts = uniform cook = no kitchen guessing.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              h('div', { style: { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: 12 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '❌ Uneven cuts'),
                h('div', { style: { fontSize: 11, color: '#fecaca', lineHeight: 1.55 } }, 'Small pieces blacken at 6 min while large pieces are still raw inside at 12 min. You either eat charcoal + crunchy, or you cook so long the small pieces are inedible.')),
              h('div', { style: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 12 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '✅ Uniform cuts'),
                h('div', { style: { fontSize: 11, color: '#bbf7d0', lineHeight: 1.55 } }, 'Every piece reaches doneness at the same moment. You can leave the pan and trust the clock. This is why professional kitchens drill knife skills before anything else.')))),

          // ─── Knife grip + safety ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '✋ The Claw Grip (Finger Safety)'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
              'Curl your guiding fingers INWARD so your knuckles face the blade, not your fingertips. The flat of the blade slides along your knuckles as a guide. If the knife slips, it slides up your knuckle wall — not into your fingertip.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              [
                { rule: 'A sharp knife is safer than a dull one', why: 'A sharp knife cuts where you aim. A dull knife slips off the food and into your hand. Most kitchen knife injuries are from dull knives.' },
                { rule: 'Anchor the cutting board with a damp towel', why: 'A cutting board that slides while you cut is a thumb-loss waiting to happen. Damp towel under the board = friction = stable.' },
                { rule: 'Knife points DOWN when walking', why: 'If you trip, the blade goes into the floor, not your leg. Never carry a knife pointed up or at others.' },
                { rule: 'Never try to catch a falling knife', why: 'Step back, let it fall, sweep up the floor when it lands. Reflex-catching dropped knives is how cooks lose fingers.' },
                { rule: 'Wash knives alone — never in a soapy sink', why: 'Hidden blade under bubbles is the #1 kitchen ER scenario. Wash separately, dry, return to block immediately.' },
                { rule: 'Tuck thumb behind fingers when slicing', why: 'Your thumb is the last finger to curl — it sticks out. Tuck it BEHIND your other fingers so the knife can\'t reach it.' }
              ].map(function(r, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #fb923c', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a', marginBottom: 4 } }, r.rule),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, r.why));
              })))
        );
      }

      // ─── SVG visualization of a knife cut ───
      function renderCutSvg(cut) {
        // Different shapes per cut family
        if (cut.id === 'largeDice') return cubeGrid(3, 28, '#fb923c');
        if (cut.id === 'mediumDice') return cubeGrid(4, 22, '#fb923c');
        if (cut.id === 'smallDice') return cubeGrid(6, 14, '#fb923c');
        if (cut.id === 'brunoise') return cubeGrid(10, 8, '#fb923c');
        if (cut.id === 'julienne') return matchsticks(8, 60, 4, '#fb923c');
        if (cut.id === 'chiffonade') return ribbons(6, '#86efac');
        if (cut.id === 'mince') return cubeGrid(14, 4, '#fb923c');
        return roughChunks(6, '#fb923c');
      }
      function cubeGrid(cols, size, color) {
        var rows = cols;
        var w = cols * size + (cols + 1) * 4;
        var hH = rows * size + (rows + 1) * 4;
        var cells = [];
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            cells.push(h('rect', { key: r + '-' + c, x: 4 + c * (size + 4), y: 4 + r * (size + 4), width: size, height: size, fill: color, rx: 2, opacity: 0.85 }));
          }
        }
        return h('svg', { width: Math.min(w, 280), height: Math.min(hH, 130), viewBox: '0 0 ' + w + ' ' + hH, style: { maxWidth: '100%' } }, cells);
      }
      function matchsticks(count, len, width, color) {
        var w = (width + 4) * count + 4;
        var hH = len + 8;
        var ms = [];
        for (var i = 0; i < count; i++) {
          ms.push(h('rect', { key: i, x: 4 + i * (width + 4), y: 4, width: width, height: len, fill: color, rx: 1, opacity: 0.85 }));
        }
        return h('svg', { width: Math.min(w, 280), height: hH, viewBox: '0 0 ' + w + ' ' + hH, style: { maxWidth: '100%' } }, ms);
      }
      function ribbons(count, color) {
        var ribs = [];
        for (var i = 0; i < count; i++) {
          ribs.push(h('rect', { key: i, x: 4, y: 4 + i * 16, width: 240, height: 4, fill: color, rx: 2, opacity: 0.85 }));
        }
        return h('svg', { width: 260, height: count * 16 + 8, viewBox: '0 0 260 ' + (count * 16 + 8), style: { maxWidth: '100%' } }, ribs);
      }
      function roughChunks(count, color) {
        var chunks = [];
        var positions = [[10, 10, 50, 35], [80, 15, 40, 45], [140, 8, 60, 28], [20, 60, 45, 50], [90, 65, 55, 30], [170, 50, 50, 45]];
        for (var i = 0; i < count && i < positions.length; i++) {
          var p = positions[i];
          chunks.push(h('rect', { key: i, x: p[0], y: p[1], width: p[2], height: p[3], fill: color, rx: 6, opacity: 0.75 + (i % 3) * 0.08 }));
        }
        return h('svg', { width: 240, height: 120, viewBox: '0 0 240 120', style: { maxWidth: '100%' } }, chunks);
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 3 — HEAT & TECHNIQUE
      // ═══════════════════════════════════════════════════════
      function renderHeat() {
        var selId = d.heatTechnique || 'saute';
        var tech = TECHNIQUES.find(function(t) { return t.id === selId; }) || TECHNIQUES[0];
        var panTemp = d.heatPanTempF || tech.panTempF;
        // Visual signal: too cold, just right, too hot
        var diff = panTemp - tech.panTempF;
        var heatVerdict = (function() {
          if (Math.abs(diff) <= 25) return { label: '✅ Perfect for ' + tech.name, color: '#22c55e', note: 'Pan is at the right temp for this technique. Food browns + cooks evenly.' };
          if (diff < -25) return { label: '🥶 Too cold', color: '#38bdf8', note: 'Below threshold — food will steam in its own juices instead of browning. No Maillard. Gray + soggy.' };
          if (diff > 25 && diff <= 75) return { label: '🔥 Hot but tolerable', color: '#fb923c', note: 'Workable for fast cooks but easy to burn. Watch carefully.' };
          return { label: '☠️ Smoking + risky', color: '#dc2626', note: 'Past the smoke point of most cooking oils. Acrolein-forming, bitter flavors, fire risk. Reduce heat or change oil to one with higher smoke point (avocado, refined peanut, ghee).' };
        })();
        return h('div', null,
          panelHeader('🔥 Heat & Technique',
            'Eight cooking methods. Each one is a different relationship between food + heat + water + fat. Picking the right method matters more than picking the right recipe — wrong method ruins good ingredients.'),

          // ─── Technique picker ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, 'Pick a technique'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 } },
              TECHNIQUES.map(function(t) {
                var active = t.id === selId;
                return h('button', { key: t.id,
                  onClick: function() { setKL({ heatTechnique: t.id, heatPanTempF: t.panTempF }); awardXP(1); klAnnounce('Selected ' + t.name); },
                  'aria-pressed': active ? 'true' : 'false',
                  style: { padding: '10px 14px',
                    background: active ? 'rgba(251,146,60,0.25)' : 'rgba(15,23,42,0.5)',
                    color: active ? '#fde68a' : '#cbd5e1',
                    border: '1px solid ' + (active ? 'rgba(251,146,60,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, t.emoji), t.name);
              }))),

          // ─── Pan temp slider + verdict ───
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 18, fontWeight: 800, color: '#fde68a' } }, tech.emoji + ' ' + tech.name),
              h('div', { style: { fontSize: 11, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', background: 'rgba(251,146,60,0.1)', padding: '3px 8px', borderRadius: 6 } },
                'Target: ' + tech.panTempF + '°F')),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } }, tech.whatHappens),
            // Slider
            h('div', { style: { marginBottom: 14 } },
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 } },
                h('span', null, 'Your pan temperature'),
                h('span', { style: { color: heatVerdict.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, panTemp + '°F')),
              h('input', { type: 'range', min: 100, max: 500, step: 5, value: panTemp,
                onChange: function(e) { setKL({ heatPanTempF: parseInt(e.target.value, 10) }); },
                'aria-label': 'Pan temperature in Fahrenheit',
                style: { width: '100%', accentColor: heatVerdict.color } })),
            h('div', { style: { background: heatVerdict.color + '18', border: '1px solid ' + heatVerdict.color + '55', borderLeft: '4px solid ' + heatVerdict.color, padding: '10px 12px', borderRadius: 10 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: heatVerdict.color, marginBottom: 4 } }, heatVerdict.label),
              h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } }, heatVerdict.note))),

          // ─── Technique deep dive ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🔬 Deep Dive: ' + tech.name),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } },
              [
                { lbl: '⚗️ Key science', val: tech.keyScience, color: '#7dd3fc' },
                { lbl: '⏱️ Cook time', val: tech.time, color: '#fde68a' },
                { lbl: '👀 Visual cue', val: tech.visualCue, color: '#86efac' },
                { lbl: '⚠️ Common mistake', val: tech.mistake, color: '#fca5a5' }
              ].map(function(b, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid ' + b.color, padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, b.lbl),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 } }, b.val));
              }))),

          // ─── Food examples for this technique ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🍽️ Foods that ' + tech.name.toLowerCase() + ' well'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              tech.foodExamples.map(function(f, i) {
                return h('div', { key: i, style: { padding: '8px 12px', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, fontSize: 12, color: '#fde68a', fontWeight: 600 } }, f);
              })))
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTIONS 4-6 — STUBS (Phase 1 second half + Phase 2)
      // ═══════════════════════════════════════════════════════
      function comingSoonStub(title, emoji, lede, items) {
        return h('div', null,
          panelHeader(emoji + ' ' + title, lede),
          h('div', { style: cardStyle() },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a', marginBottom: 10 } }, '🚧 Coming in the next ship'),
            h('div', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.65, marginBottom: 12 } },
              'This section is being built. Below is what\'s planned. The architecture pieces are in place — content depth is what\'s in flight.'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 12, lineHeight: 1.8 } },
              items.map(function(it, i) { return h('li', { key: i }, it); }))));
      }

      function renderMaillard() {
        return comingSoonStub('The Maillard Lab', '🟫',
          'A deep dive on the browning reaction — the chemistry behind why seared steak, toasted bread, roasted coffee, and grilled vegetables all taste like more than the sum of their ingredients.',
          [
            'Side-by-side comparison: same steak at 100° / 140° / 180° / 220°C surface temp — see when Maillard starts (~140°C / 280°F)',
            'Caramelization vs Maillard — different reactions, different temps, different chemistry (caramelization is sugar alone; Maillard needs amino acids + reducing sugars)',
            'Amino acid + reducing sugar matchups — why each food browns to a different color/flavor',
            'pH effects — alkaline boost (baking soda on pretzel dough, alkaline noodle water) accelerates Maillard dramatically',
            'Acrylamide warning — the dark side of Maillard (potentially carcinogenic compound that forms in high-temp starch browning above ~250°F)',
            'Why fond (the brown bits stuck to the pan) becomes pan sauce gold via deglazing'
          ]);
      }

      function renderRecipe() {
        return comingSoonStub('Real-Time Recipe Simulator', '🍽️',
          'The headline module. Run a real recipe in real time: juggle multiple pans, manage timers, adjust heat as ingredients call for it, handle interruptions, plate the finished dish. Mistakes have visible consequences. Success unlocks the next recipe.',
          [
            'Starter recipes: scrambled eggs, omelet, stir-fry, pasta + sauce, sheet-pan dinner, soup, roast chicken',
            'Real-time pan visualization — see ingredients change color, bubble, brown, burn',
            'Multi-pan management — toggle between burners, set timers, manage parallel tasks',
            'Mistakes are visible: too hot = burnt + smoke alarm; too cold = gray + soggy; forgot to salt = bland feedback',
            'Achievement system: Knife Master, Maillard Maestro, Safe Cook, Time Magician, Recipe Runner',
            'Difficulty progression: Easy / Medium / Hard recipes unlock as you succeed',
            'Gamified Competition mode (Phase 2) — Chopped-style mystery basket, time-limited rounds, AI judge feedback on technique + safety + presentation'
          ]);
      }

      function renderResources() {
        return comingSoonStub('Resources & Glossary', '📚',
          'Cooking terms, conversion charts, troubleshooting guides, printable cheat sheets, and the references for everything else in Kitchen Lab.',
          [
            'Culinary glossary: mise en place, deglaze, fond, emulsify, reduce, sweat, render, score, julienne, etc.',
            'Conversion charts: weight ↔ volume, cup ↔ ml ↔ grams (with the warning: by weight is ALWAYS more accurate for baking)',
            'Smoke-point chart: which oils for which temps (avocado highest, butter low, EVOO lower than people think)',
            '"Why did my X fail?" troubleshooter — pick a failure mode, see the likely causes + fixes',
            'Substitution chart: what to use if you don\'t have buttermilk / eggs / baking powder',
            'Sources: USDA FSIS, FDA Food Code 2022, ServSafe, Harold McGee On Food and Cooking, Modernist Cuisine'
          ]);
      }

      // ─── Style helpers ───
      function cardStyle() {
        return {
          background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: '16px 18px',
          border: '1px solid rgba(100,116,139,0.25)', marginBottom: 16
        };
      }
      function subheaderStyle() {
        return {
          fontSize: 14, fontWeight: 800, color: '#fde68a', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8
        };
      }

      // ─── Section dispatch ───
      var content;
      if (section === 'knife') content = renderKnife();
      else if (section === 'heat') content = renderHeat();
      else if (section === 'maillard') content = renderMaillard();
      else if (section === 'recipe') content = renderRecipe();
      else if (section === 'resources') content = renderResources();
      else content = renderSafety();

      return h('div', { style: rootStyle, role: 'region', 'aria-label': 'Kitchen Lab' },
        renderHeader(),
        renderTabs(),
        h('div', { style: { padding: 20 } }, content)
      );
    }
  });
})();
}
