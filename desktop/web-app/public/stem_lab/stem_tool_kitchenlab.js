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
  // ─── Temperature units ───
  // The whole tool is authored in °F (USDA tables, recipe text, judge notes).
  // A student who thinks in °C flips one switch in the header; from then on
  // every string the tool renders passes through localizeTemps(), which
  // rewrites "165°F", "330-380°F" and the dual "250°F (120°C)" forms. Numeric
  // readouts that are built without a unit (trace axes) use fmtT().
  var _klUnits = 'F';
  function fToC(f) { return Math.round((f - 32) * 5 / 9); }
  function fmtT(f) { return _klUnits === 'C' ? fToC(f) + '°C' : Math.round(f) + '°F'; }
  function localizeTemps(str) {
    if (typeof str !== 'string' || str.indexOf('°F') === -1) return str;
    return str
      // "100–140°F (38–60°C)" and "250°F (120°C)": keep the °C the author already gave
      .replace(/(-?\d{1,3})([-–])(-?\d{1,3})°F \((-?\d{1,3})[-–](-?\d{1,3})°C\)/g, '$4$2$5°C')
      .replace(/(-?\d{1,3}(?:\.\d)?)°F \((-?\d{1,3}(?:\.\d)?)°C\)/g, '$2°C')
      // ranges "330-380°F", then singles "165°F"
      .replace(/(-?\d{1,3})([-–])(-?\d{1,3})°F/g, function(_, a, dash, b) { return fToC(+a) + dash + fToC(+b) + '°C'; })
      .replace(/(-?\d{1,3}(?:\.\d)?)°F/g, function(_, a) { return fToC(+a) + '°C'; });
  }
  function klAnnounce(msg) {
    var lr = document.getElementById('allo-live-kl');
    if (_klUnits === 'C') msg = localizeTemps(msg);
    if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
  }
  // The one cook clock: sim seconds → m:ss
  function klClock(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  // ───────────────────────────────────────────────────────────
  // SAFE COOKING TEMPERATURES (USDA FSIS)
  // ───────────────────────────────────────────────────────────
  var SAFE_TEMPS = [
    { food: 'Poultry (whole + ground + parts)', emoji: '🍗', tempF: 165, tempC: 74,
      why: 'Salmonella + Campylobacter live in poultry guts and easily contaminate the meat during processing. 165°F denatures their proteins instantly.',
      pitfall: 'Don\'t trust color. Pink poultry can be perfectly safe at 165°F; brown poultry can still be undercooked. Use a thermometer.' },
    { food: 'Ground meat (beef, pork, lamb)', emoji: '🍔', tempF: 160, tempC: 71,
      why: 'Grinding spreads surface bacteria throughout the meat, so the whole interior must reach a kill temp — so intact cuts and ground meat have different minimum-temperature recommendations.',
      pitfall: 'Medium-rare ground beef is a real food-safety hazard, not just a preference. The CDC has linked many outbreaks to undercooked burgers.' },
    { food: 'Whole cuts (beef, pork, lamb, veal steaks/roasts)', emoji: '🥩', tempF: 145, tempC: 63,
      why: 'Bacteria live on the SURFACE of intact muscle meat. Searing the surface kills them; do not assume the interior is sterile; follow the temperature and rest guidance.',
      pitfall: 'Plus a 3-minute rest. Carryover cooking continues to raise the internal temp and lets juices redistribute.' },
    { food: 'Fish + shellfish', emoji: '🐟', tempF: 145, tempC: 63,
      why: 'Fish proteins denature at lower temps than meat. Above 145°F the flesh flakes easily with a fork. Parasites (anisakis) die at this temp or with proper freezing.',
      pitfall: 'Sushi-grade raw fish must be flash-frozen at -4°F for 7 days first to kill parasites. "Fresh-caught" raw fish is the dangerous one.' },
    { food: 'Eggs (cooked dish)', emoji: '🍳', tempF: 160, tempC: 71,
      why: 'Salmonella can live inside intact shell eggs (transferred from the hen). 160°F denatures the proteins — yolks fully set.',
      pitfall: 'Runny yolks are below this threshold. Use pasteurized eggs (not merely eggs from a familiar source) if you want soft-yolk dishes for kids, pregnant, elderly, or immunocompromised people.' },
    { food: 'Leftovers + casseroles', emoji: '🥘', tempF: 165, tempC: 74,
      why: 'Reheating must reach 165°F to kill any bacteria that grew during refrigeration. Lower temps just warm them up — they keep multiplying.',
      pitfall: 'Microwaves create cold spots. Stir halfway through and let stand 1 min so heat equalizes.' },
    { food: 'Hams (raw, not pre-cooked)', emoji: '🍖', tempF: 145, tempC: 63,
      why: 'Same logic as whole cuts. Reheat cooked hams packaged in USDA-inspected plants to 140°F; reheat other cooked hams to 165°F.', pitfall: 'Read the label — "cook before eating" vs "fully cooked, heat to serve" are different cooking targets.' }
  ];

  // ───────────────────────────────────────────────────────────
  // BACTERIA GROWTH ZONES (FDA Food Code)
  // ───────────────────────────────────────────────────────────
  // Returns {zone, label, color, growthRate, descr} for a given F temp
  function tempZone(tempF) {
    if (tempF < 32) return { zone: 'frozen', label: 'Frozen', color: '#7dd3fc', rate: 0,
      descr: 'Below 32°F (0°C). Bacteria are dormant — they don\'t die, but they don\'t grow either. Freezing is not a kill step.' };
    if (tempF <= 40) return { zone: 'refrig', label: 'Refrigerated (safe)', color: '#38bdf8', rate: 0.05,
      descr: 'Below 40°F (4°C). The fridge zone. Most foodborne bacteria grow very slowly here — safe for short-term storage.' };
    if (tempF < 140) return { zone: 'danger', label: 'DANGER ZONE', color: '#dc2626', ink: '#f87171', rate: 1,
      descr: '40°F–140°F (4°C–60°C). Bacteria can double every 20 minutes. Food should not stay here for more than 2 hours total (1 hour if ambient is over 90°F).' };
    if (tempF < 165) return { zone: 'cooking', label: 'Cooking (most foods)', color: '#f59e0b', rate: -0.5,
      descr: '140°F–165°F (60°C–74°C). Above the danger zone — bacteria die over time. Hold above 140°F for safe service.' };
    if (tempF < 212) return { zone: 'hot', label: 'Safe cook + hold', color: '#16a34a', rate: -1,
      descr: 'Above 165°F (74°C). Kills bacteria on contact. Most cooking happens here.' };
    return { zone: 'boil', label: 'Boiling', color: '#15803d', ink: '#4ade80', rate: -1,
      descr: 'Water boils at 212°F (100°C) at sea level. Boiling kills bacteria instantly but doesn\'t neutralize all toxins — sometimes the bacteria die but the poisons they made survive.' };
  }

  // Generation (doubling) time in minutes for common foodborne bacteria at a
  // food temperature: none at or below 40°F or at 140°F+, ~20 min in the
  // 80-110°F sweet spot, slowing toward both edges of the danger zone. An
  // illustrative curve shaped to FDA Food Code guidance, not a lab model.
  function doublingMinutes(tempF) {
    if (tempF <= 40 || tempF >= 140) return Infinity;
    if (tempF < 80) return 20 + (80 - tempF) * (80 - tempF) / 8;
    if (tempF <= 110) return 20;
    return 20 + (tempF - 110) * (tempF - 110) / 6;
  }
  // Hours on the counter at a temperature → doublings, multiplier, and where
  // the USDA consumer limit falls (2 hours; 1 hour when the room is over 90°F).
  function dangerClock(tempF, hours) {
    var dm = doublingMinutes(tempF);
    var doublings = dm === Infinity ? 0 : hours * 60 / dm;
    var inZone = tempF > 40 && tempF < 140;
    var limitHours = tempF > 90 ? 1 : 2;
    return { doublingMinutes: dm, doublings: doublings, multiplier: Math.pow(2, doublings), inZone: inZone, limitHours: limitHours, overLimit: inZone && hours > limitHours };
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
      mistake: 'Preheat the pan appropriately for its material and follow the cookware instructions. Do not splash water into hot oil to test the temperature.',
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
  // MAILLARD ZONES — surface temp → browning visual + chemistry
  // ───────────────────────────────────────────────────────────
  // The Maillard reaction kicks in around 280°F (140°C) for most
  // amino-acid + reducing-sugar combos. Below that, food just
  // dehydrates. Above ~400°F you start losing volatile aromatics
  // to combustion, and above ~480°F starches form acrylamide.
  var MAILLARD_ZONES = [
    { maxF: 250, label: 'No browning (just heating)', color: '#f3e9d2', textColor: '#78716c',
      visual: 'Pale + still pink (meat) or beige (bread). Surface water is evaporating; reaction hasn\'t started.',
      science: 'Below ~250°F (120°C), water is still abundant at the surface. The Maillard reaction needs the surface to dry out so amino acids + reducing sugars can react directly — water dilutes them and absorbs the heat.' },
    { maxF: 285, label: 'Maillard threshold', color: '#dcc18b', textColor: '#92400e',
      visual: 'First hint of golden color. Faint sweet aroma starts. Looks "cooked" but not "seared."',
      science: '250-285°F (120-140°C). The reaction has begun. Amino acids in the food are starting to react with reducing sugars (glucose, fructose, lactose), producing the first wave of brown pigment compounds (melanoidins) + dozens of volatile flavor molecules.' },
    { maxF: 325, label: 'Active Maillard — golden brown', color: '#c08a3c', ink: '#c08a3c', textColor: '#451a03',
      visual: 'Clear golden-brown surface. Aromas are rich + nutty. This is the "perfect cook" zone for most things.',
      science: '285-325°F (140-163°C). Reaction at full speed. The brown color comes from melanoidins; the smell from hundreds of volatile compounds (pyrazines, furans, thiophenes) — these don\'t exist in raw food at all.' },
    { maxF: 375, label: 'Deep Maillard — mahogany', color: '#7c4a1f', ink: '#cd8f55', textColor: '#fef3c7',
      visual: 'Deep brown crust, intense aromas — almost roasted-coffee territory. The reaction has produced thousands of compounds.',
      science: '325-375°F (163-190°C). Heavy reaction. Color compounds darken to brown-black. Some compounds start to bitter (pyrazines + carbonyls in higher concentration). Most "seared" outcomes happen here.' },
    { maxF: 425, label: 'Bitter + charred', color: '#3f2419', ink: '#d2a679', textColor: '#fbbf24',
      visual: 'Charred, bitter, often acrid smell. Volatile aromatics are burning off; bitter degradation products dominate.',
      science: '375-425°F (190-218°C). Past the flavor peak. You\'re burning off the good volatiles + concentrating bitter degradation products. Smoke = vaporized oil + burned proteins.' },
    { maxF: 600, label: '☠️ Acrylamide + acrolein zone', color: '#1c1410', ink: '#fca5a5', textColor: '#fca5a5',
      visual: 'Black, smoking, often on fire. Inedible. Carcinogenic compounds (acrylamide) form from starch + amino acid asparagine.',
      science: 'Above 425°F (220°C). Starchy foods form acrylamide (probable human carcinogen per IARC). Oils break down to acrolein (toxic + bitter). This is why french fries should be deep golden, not dark brown — the FDA recommends "go for gold."' }
  ];

  // Browning examples — common foods + their Maillard story
  var BROWNING_EXAMPLES = [
    { food: 'Seared steak', emoji: '🥩', surfaceF: '350-450°F',
      story: 'The crust is pure Maillard — beef\'s amino acids + the bit of glucose in the meat. Below 300°F you get gray boiled-beef; above 400°F you get crust within 60 seconds.' },
    { food: 'Toasted bread', emoji: '🍞', surfaceF: '300-375°F',
      story: 'The toaster\'s coils heat bread\'s surface above 300°F. Starches hydrolyze into reducing sugars, which then Maillard with bread\'s proteins. That\'s the brown crust + the warm toasty smell.' },
    { food: 'Roasted coffee', emoji: '☕', surfaceF: '385-475°F',
      story: 'Coffee bean roast levels are literally Maillard temperatures. Light roast (~410°F) stops at golden Maillard; dark roast (~470°F) pushes into bitter-charred territory. The smell change is the reaction running.' },
    { food: 'Browned butter', emoji: '🧈', surfaceF: '250-350°F',
      story: 'Milk solids in butter (proteins + lactose) Maillard once water boils off. The nutty smell is the same compound (2-methylbutanal) you find in seared steak.' },
    { food: 'Caramelized onions', emoji: '🧅', surfaceF: '250-300°F',
      story: 'Confusingly named — these are mostly Maillard, NOT caramelization. Onions have amino acids + sugars. True caramelization needs nearly pure sugar + higher temps (320°F+).' },
    { food: 'Pretzel crust', emoji: '🥨', surfaceF: '350-425°F',
      story: 'Pretzels get dipped in alkaline solution (lye or baked baking soda) before baking. Alkalinity ACCELERATES Maillard dramatically — that\'s why pretzels brown faster + darker than bread of the same dough.' }
  ];

  // Caramelization vs Maillard — common confusion
  var CARAM_VS_MAILLARD = [
    { aspect: 'What\'s reacting', caram: 'Sugar molecules alone (sucrose, fructose, glucose)', mai: 'Amino acids + reducing sugars together' },
    { aspect: 'Temperature start', caram: '~320°F (160°C) for sucrose', mai: '~280°F (140°C)' },
    { aspect: 'Foods', caram: 'Crème brûlée crust, hard candy, caramel sauce', mai: 'Almost everything else: steak, bread crust, roasted coffee, "caramelized" onions' },
    { aspect: 'Color', caram: 'Amber → red-brown', mai: 'Light gold → mahogany → black' },
    { aspect: 'Flavor', caram: 'Sweet, buttery, slightly bitter when dark', mai: 'Savory, meaty, nutty, complex (1000+ compounds)' },
    { aspect: 'pH effect', caram: 'Acid slows it; alkaline pushes toward Maillard pathways', mai: 'Alkaline (baking soda) dramatically accelerates it' }
  ];

  // pH effects on browning
  var PH_EFFECTS = [
    { ph: 'Acidic (vinegar, lemon, wine)', effect: 'SLOWS Maillard. That\'s why brining + acid marinades produce paler crusts.', use: 'When you want browning, dry the surface + skip the acid until plating.' },
    { ph: 'Neutral (plain water)', effect: 'Maillard runs at its baseline rate. Pure water means slow start (water has to evaporate first).', use: 'Standard cooking — most recipes assume neutral.' },
    { ph: 'Alkaline (baking soda)', effect: 'DRAMATICALLY accelerates Maillard. A pinch of baking soda on diced onions makes them brown in 5 minutes instead of 30.', use: 'Hack: ¼ tsp baking soda per pound of onions before browning. Same trick on chicken skin for darker crust.' },
    { ph: 'Very alkaline (lye / baked baking soda)', effect: 'Maximum Maillard. Pretzel dipping, ramen alkaline water, century-egg curing.', use: 'Industrial / traditional applications. Baked baking soda (350°F for 1 hour) becomes safer-to-handle but still very alkaline.' }
  ];

  // ───────────────────────────────────────────────────────────
  // GLOSSARY — common culinary terms
  // ───────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'Mise en place', pron: 'meez ahn plahs', defn: 'French for "everything in its place." All ingredients pre-measured, pre-cut, pre-prepared before heat goes on. The foundation of every recipe that turns out right — once cooking starts, you don\'t have time to chop the onion.', tag: 'prep' },
    { term: 'Deglaze', defn: 'Add liquid (wine, stock, water) to a hot pan after sautéing/searing, to dissolve the browned fond. The result is the base for a pan sauce.', tag: 'technique' },
    { term: 'Fond', pron: 'fohn', defn: 'The brown bits stuck to the pan after searing. Almost pure concentrated Maillard product — savory flavor gold. Deglaze + scrape to capture it.', tag: 'science' },
    { term: 'Emulsify', defn: 'Mix two liquids that don\'t normally combine (oil + water) into a stable suspension. Mayo, vinaigrette, hollandaise, and pan sauces all rely on emulsification. Egg yolk + mustard are common emulsifiers — they have molecules with both oil-loving + water-loving ends.', tag: 'science' },
    { term: 'Reduce', defn: 'Simmer a liquid uncovered so water evaporates, concentrating flavor + thickening texture. A sauce reduced "by half" has lost 50% of its original volume.', tag: 'technique' },
    { term: 'Sweat', defn: 'Cook aromatics (onion, garlic, celery) low + slow in fat WITHOUT browning. Goal is to release flavors gently, soften texture, build a base. Different from sauté (which wants browning).', tag: 'technique' },
    { term: 'Render', defn: 'Slowly cook fatty cuts so the solid fat melts into liquid + the protein crisps. Bacon cooked from cold pan renders perfectly. Schmaltz (chicken fat) + lardons are rendered.', tag: 'technique' },
    { term: 'Score', defn: 'Cut shallow lines into the surface of meat or dough — usually a diamond pattern. Helps fat render, lets flavors penetrate, controls expansion (bread).', tag: 'technique' },
    { term: 'Blanch', defn: 'Briefly cook in boiling water, then shock in ice water to stop cooking. Sets bright color in vegetables, loosens skins (tomatoes, peaches), partial-cooks for later finishing.', tag: 'technique' },
    { term: 'Shock', defn: 'Plunge just-cooked food into ice water to stop cooking instantly. Locks vegetable color + texture. Paired with blanching.', tag: 'technique' },
    { term: 'Temper', defn: 'Slowly raise the temperature of a delicate ingredient before combining with hot. Tempering eggs into hot stock prevents scrambled-egg soup. Tempering chocolate stabilizes its crystal structure for snap + shine.', tag: 'science' },
    { term: 'Sear', defn: 'Briefly cook food at very high heat to brown the surface. Goal is crust + Maillard flavor, not internal doneness. Usually followed by another technique (oven, braise).', tag: 'technique' },
    { term: 'Braise', defn: 'Sear, then partially submerge in liquid + cover + cook low + slow. Tough cuts become fork-tender as collagen converts to gelatin over hours.', tag: 'technique' },
    { term: 'Confit', pron: 'kohn-fee', defn: 'Slow-cook in fat at low temp (180-200°F) for hours. Originally a preservation method — fat seals the meat against air. Duck confit is the classic; garlic confit is the easy entry point.', tag: 'technique' },
    { term: 'Sous vide', pron: 'soo veed', defn: 'Cook food in a vacuum-sealed bag in a precisely temperature-controlled water bath. Lets you cook a steak to exactly 130°F internally with no overcooked margin. Then sear for crust.', tag: 'technique' },
    { term: 'Mirepoix', pron: 'meer-pwah', defn: 'French aromatic base: 2 parts onion + 1 part carrot + 1 part celery, all diced. The starting flavor foundation for stocks, soups, stews, sauces.', tag: 'prep' },
    { term: 'Sofrito', defn: 'Spanish + Latin American aromatic base, varies regionally. Usually includes onion + garlic + bell pepper + tomato cooked slowly in oil. Equivalent role to mirepoix.', tag: 'prep' },
    { term: 'Roux', pron: 'roo', defn: 'Flour + fat cooked together to thicken sauces. White roux (briefly cooked) thickens béchamel; blond + brown rouxes have more cooking → less thickening power but more flavor (gumbo uses very dark roux).', tag: 'technique' },
    { term: 'Slurry', defn: 'Cornstarch or arrowroot mixed with cold water, added to hot liquid to thicken. Faster than roux but produces a glossier, less stable thickening.', tag: 'technique' },
    { term: 'Maillard reaction', pron: 'my-yar', defn: 'The chemistry of browning. Amino acids + reducing sugars react at ~280°F+ to produce brown pigments + complex flavors. Different from caramelization (sugar alone).', tag: 'science' },
    { term: 'Caramelization', defn: 'Sugar alone breaking down at high heat (~320°F+ for sucrose). Sweet + slightly bitter. Crème brûlée + caramel are pure caramelization.', tag: 'science' },
    { term: 'Brine', defn: 'Salt water solution that meat sits in before cooking. Salt diffuses into muscle, breaks down protein structure → meat holds more moisture during cooking. 1 hour per pound is typical.', tag: 'technique' },
    { term: 'Cure', defn: 'Preserve food with salt + sometimes sugar + nitrites. Cured meats (bacon, ham, prosciutto) are salt-extracted then often smoked or aged.', tag: 'technique' },
    { term: 'Render', defn: 'Slowly melt solid fat into liquid by gentle heat. See entry above.', tag: 'technique' },
    { term: 'Truss', defn: 'Tie meat (often poultry) into a compact shape with kitchen twine before roasting. Keeps everything cooking at the same rate + improves presentation.', tag: 'technique' },
    { term: 'Reduce by half', defn: 'Cook a liquid until its volume is 50% of original — common sauce instruction. Test by marking the pan side, or measure volume before + after.', tag: 'technique' },
    { term: 'Au sec', pron: 'oh sek', defn: 'French for "to dry" — reduce a liquid until almost no liquid remains. Used for intense flavor concentration before adding the next ingredient.', tag: 'technique' },
    { term: 'Beurre monté', pron: 'burr mon-tay', defn: 'A stable emulsion of butter + a little water. Lets butter stay melted without breaking. Used for finishing sauces + poaching delicate foods.', tag: 'technique' },
    { term: 'Pan sauce', defn: 'Sauce built directly in the pan after searing — deglaze the fond + reduce + finish with butter. The classic 5-minute restaurant move.', tag: 'technique' },
    { term: 'Resting (meat)', defn: 'Letting cooked meat sit 5-20 min before cutting. Lets the muscle fibers relax + juices redistribute. Cutting hot = juice runs out = dry meat.', tag: 'science' },
    { term: 'Carryover cooking', defn: 'Internal temp continues rising after meat leaves heat — usually 5-10°F. Pull a steak at 125°F if you want it medium-rare (130-135°F final).', tag: 'science' },
    { term: 'Bloom', defn: 'Sprinkle gelatin on cold liquid + let it absorb for 5 min before heating. Prevents lumps. Also applies to spices in hot oil (releasing essential oils).', tag: 'technique' },
    { term: 'Acid bright', defn: 'A squeeze of lemon, splash of vinegar, or drop of wine at the end of cooking. Acid sharpens flavor perception; without it, rich dishes taste muddy. The "missing ingredient" most cooks discover late.', tag: 'principle' },
    { term: 'Layer salt', defn: 'Salt at multiple stages of cooking, not just at the end. Aromatics, then vegetables, then protein, then final taste. Each layer seasons that ingredient specifically + builds depth.', tag: 'principle' },
    { term: 'Steakhouse rule', defn: 'Take meat out of the fridge 30-60 min before cooking. Cold meat\'s outside overcooks before the inside warms. Room-temp meat cooks evenly.', tag: 'principle' }
  ];

  // ───────────────────────────────────────────────────────────
  // SMOKE POINTS — oils ranked by smoke point
  // ───────────────────────────────────────────────────────────
  // The smoke point is the temp at which an oil starts visibly
  // smoking — it's also where the oil starts breaking down into
  // acrolein (bitter + toxic) and free fatty acids. Cooking above
  // smoke point = bitter flavor + unhealthful compounds + fire risk.
  var SMOKE_POINTS = [
    { oil: 'Refined avocado oil', smokeF: 520, smokeC: 271, use: 'Highest-heat searing, frying, wok stir-fry', flavor: 'Neutral', notes: 'The highest commonly available smoke point. Workhorse for high-heat cooking.' },
    { oil: 'Refined peanut oil', smokeF: 450, smokeC: 232, use: 'Deep frying, stir-fry, searing', flavor: 'Neutral to faintly nutty', notes: 'Classic deep-fry oil. Avoid if peanut-allergic guests.' },
    { oil: 'Ghee (clarified butter)', smokeF: 485, smokeC: 252, use: 'Sautéing, frying, finishing', flavor: 'Rich, nutty, buttery', notes: 'Milk solids removed = no burning at high temps. Indian + South Asian cooking staple.' },
    { oil: 'Light olive oil (refined)', smokeF: 465, smokeC: 240, use: 'High-heat sauté, frying', flavor: 'Mostly neutral', notes: 'Refined = filtered + processed = higher smoke point than EVOO but less flavor + fewer polyphenols.' },
    { oil: 'Refined canola/sunflower', smokeF: 400, smokeC: 204, use: 'General cooking, baking, frying', flavor: 'Neutral', notes: 'Cheap workhorse oils. Less optimal fatty-acid profile than olive or avocado.' },
    { oil: 'Vegetable oil (soybean)', smokeF: 400, smokeC: 204, use: 'General cooking, baking', flavor: 'Neutral', notes: 'Often a blend; check label.' },
    { oil: 'Refined coconut oil', smokeF: 400, smokeC: 204, use: 'Sautéing, baking', flavor: 'Neutral (refined)', notes: 'Higher in saturated fat. Solid at room temp. Refined = neutral; virgin = coconut flavor.' },
    { oil: 'Virgin coconut oil', smokeF: 350, smokeC: 177, use: 'Medium-heat cooking, baking', flavor: 'Distinct coconut', notes: 'Lower smoke point than refined. Use for flavor.' },
    { oil: 'Extra virgin olive oil', smokeF: 375, smokeC: 191, use: 'Sauté, low-medium roasting, finishing', flavor: 'Fruity, peppery, varies by source', notes: 'Quality EVOO actually has a HIGHER smoke point than the common 320°F myth — but flavor degrades above 400°F regardless.' },
    { oil: 'Butter (unclarified)', smokeF: 302, smokeC: 150, use: 'Low-heat sauté, finishing, baking', flavor: 'Rich, dairy', notes: 'Milk solids burn around 302°F. For higher-heat butter cooking, use ghee or clarify it yourself.' },
    { oil: 'Sesame oil (toasted)', smokeF: 350, smokeC: 177, use: 'Finishing, low-heat aromatics', flavor: 'Strong toasted-nut', notes: 'Add at end of cooking. High heat destroys the flavor.' },
    { oil: 'Flaxseed oil', smokeF: 225, smokeC: 107, use: 'Cold use ONLY — dressings, drizzles', flavor: 'Grassy, mild', notes: 'Never cook with this. Heat destroys the omega-3s + creates off-flavors fast.' }
  ];

  // ───────────────────────────────────────────────────────────
  // CONVERSIONS — common kitchen math
  // ───────────────────────────────────────────────────────────
  var CONVERSIONS = [
    { from: '1 cup', to: '16 tbsp / 48 tsp / ~240 ml / ~237 g (water)', notes: 'Cup volumes vary slightly by country (US: 240ml, UK: 250ml). Recipe assumes US unless stated.' },
    { from: '1 tablespoon (tbsp)', to: '3 teaspoons (tsp) / ~15 ml', notes: 'The most reliable kitchen-math anchor.' },
    { from: '1 stick of butter (US)', to: '1/2 cup / 8 tbsp / 113 g / 4 oz', notes: 'European butter blocks are 200-250g; convert by weight when possible.' },
    { from: '1 lb', to: '454 g / 16 oz', notes: 'A pound of feathers + a pound of bricks weigh the same — the saying still works.' },
    { from: '1 oz (weight)', to: '28.35 g', notes: 'Different from fluid oz (1 fl oz = 30 ml). Recipes ambiguous about which → check the unit.' },
    { from: '1 fl oz (volume)', to: '~30 ml / 2 tbsp', notes: 'Bartender + recipe shared unit. NOT the same as weight oz for most things.' },
    { from: '350°F oven', to: '175°C / Gas mark 4', notes: 'The "default" baking temp for most things. UK gas marks: 1=275°F, 2=300°F, 3=325°F, 4=350°F, 5=375°F, 6=400°F, 7=425°F, 8=450°F, 9=475°F.' },
    { from: '1 cup flour (AP)', to: '125 g (BY WEIGHT) / ~130 g packed', notes: 'Volume measurements vary 20% based on how you scoop. Baking recipes that work use weight.' },
    { from: '1 cup sugar (granulated)', to: '200 g', notes: 'Brown sugar packed: 220g. Powdered: 120g. By weight is the only consistent way.' },
    { from: '1 large egg', to: '~50 g / 3 tbsp liquid (~30g white + ~20g yolk)', notes: 'Recipe scaling: 1 large egg ≈ 4 tbsp liquid equivalent. Useful when scaling up/down.' },
    { from: '1 clove garlic', to: '~1 tsp minced / ~5 g', notes: 'Varies wildly with garlic size. Recipes assuming "medium" cloves mean roughly 5g.' }
  ];

  // ───────────────────────────────────────────────────────────
  // SUBSTITUTIONS — emergency swaps
  // ───────────────────────────────────────────────────────────
  var SUBSTITUTIONS = [
    { missing: 'Buttermilk (1 cup)', sub: '1 cup milk + 1 tbsp lemon juice or vinegar; rest 5 min',
      why: 'Acid curdles the milk casein, mimicking buttermilk\'s tang + tenderizing acid.' },
    { missing: 'Self-rising flour (1 cup)', sub: '1 cup AP flour + 1½ tsp baking powder + ¼ tsp salt',
      why: 'Self-rising = pre-mixed AP + leavener. Same ratio in your bowl works identically.' },
    { missing: 'Baking powder (1 tsp)', sub: '¼ tsp baking soda + ½ tsp cream of tartar (+ pinch cornstarch)',
      why: 'Baking powder is baking soda + dry acid. Cream of tartar is the typical acid.' },
    { missing: '1 egg', sub: '¼ cup unsweetened applesauce, OR 3 tbsp aquafaba (chickpea liquid), OR 1 tbsp ground flax + 3 tbsp water (rest 5 min)',
      why: 'For binding only — applesauce works in baked goods. For lift/structure (soufflés, meringues), there\'s no real swap.' },
    { missing: 'Heavy cream (1 cup) — for cooking, NOT whipping', sub: '¾ cup milk + ¼ cup melted butter',
      why: 'Reconstructs fat content. Won\'t whip into peaks, but adds richness to sauces.' },
    { missing: 'Sour cream', sub: 'Equal parts plain Greek yogurt',
      why: 'Same tang + thickness. Greek yogurt is slightly more acidic — adjust salt slightly.' },
    { missing: 'Wine for deglazing', sub: 'Equal parts broth + 1 tsp lemon juice or vinegar',
      why: 'You\'re after acidity + flavor liquid. Acid replaces wine\'s acid; broth brings flavor.' },
    { missing: 'Brown sugar (1 cup)', sub: '1 cup white sugar + 1 tbsp molasses',
      why: 'Brown sugar IS white sugar + molasses, sold pre-mixed. Mix your own.' },
    { missing: 'Cornstarch (1 tbsp, as thickener)', sub: '2 tbsp AP flour, OR 1 tbsp arrowroot, OR 1 tbsp potato starch',
      why: 'All starches thicken via gelatinization. Flour needs longer cook to lose its raw taste; arrowroot is glossier; potato starch most neutral.' },
    { missing: 'Yeast (1 packet)', sub: 'There\'s no quick swap. Sourdough starter works but needs hours. Baking powder works for soda-bread style — different result.',
      why: 'Yeast does fermentation (CO2 + flavor compounds over hours). Chemical leaveners do CO2 only.' },
    { missing: 'Lemon juice (1 tbsp)', sub: '1 tbsp white wine vinegar or apple cider vinegar (slightly less = more neutral)',
      why: 'Both acids; vinegar slightly sharper. Don\'t swap in baking where color matters (lemon = clear, vinegar = clear; same).' },
    { missing: 'Fresh herbs (1 tbsp)', sub: '1 tsp dried (rule of thumb 3:1 fresh:dried for hardy herbs; 2:1 for delicate)',
      why: 'Dried herbs are more concentrated by volume; lower amount needed. Add dried early (needs heat to bloom); add fresh late.' }
  ];

  // ───────────────────────────────────────────────────────────
  // TROUBLESHOOTING — "Why did my X fail?"
  // ───────────────────────────────────────────────────────────
  var TROUBLESHOOTING = [
    { problem: 'My steak/chicken is gray, not browned', causes: [
      'Pan wasn\'t hot enough (need 350-450°F for sear)',
      'Surface was wet (water blocks Maillard — pat dry first)',
      'Pan was crowded (steam from neighbors prevents browning — cook in batches)',
      'You moved the food too soon (let it set 2-3 min before flipping for crust to form)'
    ] },
    { problem: 'My pasta water keeps boiling over', causes: [
      'Pot too full (water needs ~6 inches of headroom for big rolling boil)',
      'Heat too high — once at boil, drop to medium-high; you don\'t need full blast',
      'Add a small amount of oil OR a wooden spoon across the top — both break surface tension',
      'Modern fix: just don\'t fill the pot more than half full'
    ] },
    { problem: 'My sauce broke / split / curdled', causes: [
      'Boiled an emulsion (mayo, hollandaise, beurre blanc) — too hot breaks the emulsion',
      'Added cold dairy to hot pan too fast — temper it first',
      'Acid hit hot dairy without temper — curdles instantly',
      'Rescue: in a clean bowl with a tbsp warm water, slowly whisk broken sauce back in'
    ] },
    { problem: 'My rice is mushy or gummy', causes: [
      'Too much water (typical: 1:1.5 ratio for white rice; check rice type)',
      'Stirred during cooking (releases starch → gummy)',
      'Didn\'t rinse before cooking (extra surface starch makes it sticky)',
      'Wrong rice for the job (jasmine + basmati for fluffy; arborio + sushi for sticky)'
    ] },
    { problem: 'My eggs are rubbery / overcooked', causes: [
      'Heat too high (eggs scramble best on low-medium with constant motion)',
      'Cooked too far — eggs continue cooking off heat from residual warmth',
      'No fat in the pan to insulate (butter/oil prevents direct egg-on-hot-metal contact)',
      'Rule: pull eggs off heat when they look slightly underdone — carryover finishes them'
    ] },
    { problem: 'My vegetables are limp + lifeless after steaming/sautéing', causes: [
      'Overcooked — most green vegetables go from bright to gray in 60 seconds',
      'Cooked from cold (need to hit a hot pan to flash + retain color)',
      'No shock after blanching (immediate ice bath stops the cook + sets color)',
      'Pile too thick on sheet pan = steaming, not roasting → moisture trapped'
    ] },
    { problem: 'My roast/turkey/chicken is dry', causes: [
      'Overcooked (use a thermometer; chicken at 165°F is done — not 180°F)',
      'No rest after pulling from heat (5-20 min rest lets juices redistribute)',
      'No brine on lean meat (chicken breast + turkey breast really benefit from brining)',
      'Cut against the grain helps perceived moisture — across the muscle fibers, not along them'
    ] },
    { problem: 'My pan sauce is watery + thin', causes: [
      'Didn\'t reduce far enough (keep reducing until coats the back of a spoon)',
      'No fat to emulsify (finish with cold butter swirled in off heat = silky body)',
      'No thickener (a touch of cornstarch slurry, or flour added to fat early)',
      'Diluted by adding too much liquid at once — reduce in stages'
    ] }
  ];

  // ───────────────────────────────────────────────────────────
  // RECIPES — the Real-Time Recipe Simulator data
  // ───────────────────────────────────────────────────────────
  // Each recipe describes its ingredients + a sequence of steps,
  // plus a judge() function that scores the finished dish based on
  // what actually happened (pan temp history, timing, ingredient
  // order). The runtime engine in renderRecipe drives state through
  // these steps in real time.
  //
  // Step types:
  //   completeWhen: 'panInRange'      — auto-advance when target panTempF reached
  //                 'itemAdded'        — auto-advance when ingredient added
  //                 'userClick'        — student clicks "Continue" when ready
  //                 'heatRemoved'      — auto-advance when burner turned to 0
  //
  // Difficulty progression: scrambledEggs (easy) → omelet / stirFry (med)
  // → pasta + saucePan (med) → roastChicken (hard). v0.3 ships only
  // scrambledEggs. v0.4 adds 3-4 more.
  var RECIPES = {
    scrambledEggs: {
      id: 'scrambledEggs',
      name: 'Scrambled Eggs',
      icon: '🍳',
      difficulty: 'easy',
      targetTimeMin: 5,
      description: 'The foundation. Master eggs and you can make breakfast for life.',
      teaches: ['Protein denaturation', 'Low + slow technique', 'Carryover cooking', 'Salt timing'],
      // Thin + constantly stirred: heats fast, cannot pass boiling, sets ~145°F, dries above ~175°F.
      doneness: { foodK: 0.014, foodMaxF: 212, setF: 145, overF: 175, browningFrom: 'eggs', browningScale: [0.12, 0.3, 0.5, 0.8], stir: { label: 'Stir + fold', icon: '🥄', grace: 15 } },
      ingredients: [
        { id: 'butter',     name: 'Butter (1 tbsp)',     icon: '🧈', addAtStep: 1 },
        { id: 'eggs',       name: 'Whisked eggs (3)',    icon: '🥚', addAtStep: 2 },
        { id: 'saltPepper', name: 'Salt + pepper',       icon: '🧂', addAtStep: 5 }
      ],
      steps: [
        { id: 's0', title: 'Heat pan to LOW',
          instruction: 'Turn the burner to 2-3 out of 10. Let the pan reach about 250°F (120°C). Should take ~30-60 seconds.',
          target: { panTempF: { min: 220, max: 290 } },
          completeWhen: 'panInRange',
          teach: 'Eggs are mostly protein + water. High heat seizes proteins tight = rubbery + dry. Low heat = slow denaturation = silky curds. Most home cooks crank the heat — that\'s why their eggs come out gray and tough.' },
        { id: 's1', title: 'Add butter',
          instruction: 'Drop a tablespoon of butter into the pan. Wait for it to foam, then settle.',
          target: { itemAdded: 'butter' },
          completeWhen: 'itemAdded',
          teach: 'When butter foam subsides, the water has cooked off + the pan is at proper temp. The milk solids add flavor (and at higher heat, they\'d Maillard).' },
        { id: 's2', title: 'Whisk + add eggs',
          instruction: 'Pour the whisked eggs into the pan. They should sizzle GENTLY at the edges, not aggressively.',
          target: { itemAdded: 'eggs' },
          completeWhen: 'itemAdded',
          teach: 'Whisking incorporates air + breaks the yolks evenly through the whites. Aggressive sizzle = pan too hot = rubbery outcome.' },
        { id: 's3', title: 'Stir constantly, low + slow',
          instruction: 'Push + fold the eggs with a spatula every 5-10 seconds. Keep the heat LOW. About 60-90 seconds total — when you can JUST see soft curds forming, you\'re close.',
          target: { activeTimeSec: { min: 45, max: 150 }, panTempF: { max: 330 } },
          completeWhen: 'userClick',
          teach: 'Constant motion stops any one patch from over-cooking. Soft, glossy curds = perfect. Hard, dry curds = went too long or too hot.' },
        { id: 's4', title: 'Pull OFF heat',
          instruction: 'Turn the burner to 0 (or pull the pan off). The eggs should still look slightly underdone + glossy.',
          target: { burnerLevel: 0 },
          completeWhen: 'heatRemoved',
          teach: 'Carryover cooking continues for 30-60 seconds off heat. If you wait until they look "done," they\'ll be overcooked by the time you plate. Pull early.' },
        { id: 's5', title: 'Season + serve',
          instruction: 'Sprinkle salt + pepper. Stir once. Plate immediately.',
          target: { itemAdded: 'saltPepper' },
          completeWhen: 'itemAdded',
          teach: 'Salt at the END for scrambled eggs. Salt added early pulls water out of the proteins via osmosis — watery + tough eggs. Late salt just seasons.' }
      ],
      judge: function(state) {
        // Reads the integrated doneness state (state.doneness) so every note
        // describes the same dish: surface browning, interior set, dryness.
        var notes = [];
        var score = 100;
        var maxT = state.maxPanTempF || 0;
        var t = state.activeTimeSec || 0;
        var dn = state.doneness || {};
        var browning = dn.browning || 0, peakF = dn.foodPeakF || 40, overSec = dn.secAboveOverF || 0;
        var isSet = !!dn.set;
        var addT = state.itemAddTimes || {};
        var setAfterSec = dn.setAt && addT.eggs ? Math.max(0, Math.round((dn.setAt - addT.eggs) / 1000)) : Math.round(t);
        // 1) Surface: browning integrates pan heat over the time food was in the pan
        if (browning >= 0.5) { score -= 35; notes.push({ neg: true, label: '🔥 Way too hot', detail: 'Pan peaked at ' + Math.round(maxT) + '°F with eggs in it long enough to brown the surface. Browned scrambled eggs = hard, rubbery curds.' }); }
        else if (browning >= 0.3) { score -= 20; notes.push({ neg: true, label: '🌡️ A bit hot', detail: 'Pan reached ' + Math.round(maxT) + '°F; the curds picked up colour and turned firm + slightly dry. Keep it under ~320°F next time.' }); }
        else if (maxT >= 340) { score -= 10; notes.push({ neg: true, label: '🌡️ Running hot', detail: 'Pan reached ' + Math.round(maxT) + '°F — hotter than eggs want. You moved fast enough to avoid colour, but at that heat the window is seconds. Aim for 240-290°F.' }); }
        else if (maxT >= 240) { notes.push({ neg: false, label: '✓ Pan temp', detail: 'Peak ' + Math.round(maxT) + '°F, no browning — the silky-curd zone.' }); }
        else if (isSet) { score -= 10; notes.push({ neg: true, label: '🐢 Pan on the cool side', detail: 'Pan peaked at ' + Math.round(maxT) + '°F. The eggs did set, but slowly — aim for 240-290°F so they cook in 60-90 seconds.' }); }
        else { score -= 25; notes.push({ neg: true, label: '🥶 Too cold', detail: 'Pan never got hot enough (' + Math.round(maxT) + '°F max) and the eggs never set.' }); }
        // 2) Interior: curds set from ~145°F; they dry out with time spent above ~175°F
        if (!isSet && browning >= 0.3) { score -= 25; notes.push({ neg: true, label: '⏱️ Pulled early', detail: 'Only ' + Math.round(t) + 's in the pan: the surface browned before the inside (' + Math.round(peakF) + '°F) could set. Lower heat, more time.' }); }
        else if (!isSet && peakF < 130) { score -= 30; notes.push({ neg: true, label: '⏱️ Way too fast', detail: 'Pulled after ' + Math.round(t) + 's with the eggs at ' + Math.round(peakF) + '°F inside. Curds set from about 145°F — these are still runny, and runny scrambled eggs are not safe to serve.' }); }
        else if (!isSet) { score -= 10; notes.push({ neg: true, label: '⏱️ A bit fast', detail: Math.round(t) + 's in the pan, ' + Math.round(peakF) + '°F inside — barely set, slightly wet. Give them another 15-20 seconds of stirring.' }); }
        else if (overSec >= 90) { score -= 15; notes.push({ neg: true, label: '⏱️ Overcooked', detail: 'The eggs spent ' + Math.round(overSec) + 's above 175°F after setting. Dry + crumbly.' }); }
        else if (overSec >= 45) { score -= 5; notes.push({ neg: true, label: '⏱️ Slightly dry', detail: 'Set well, then stayed on ' + Math.round(overSec) + 's past the point of drying. Pull a little earlier.' }); }
        else { notes.push({ neg: false, label: '✓ Timing', detail: 'Set after about ' + setAfterSec + 's and pulled while still soft — well-paced.' }); }
        // 3) Salt timing: salt before eggs pulls water out of the proteins
        if (addT.saltPepper && addT.eggs && addT.saltPepper < addT.eggs) {
          score -= 15;
          notes.push({ neg: true, label: '🧂 Salt timing', detail: 'Salt was added BEFORE the eggs. Salt pulls water out of egg proteins — watery, tough curds.' });
        } else if (addT.saltPepper) {
          notes.push({ neg: false, label: '✓ Salt timing', detail: 'Salt added at the end. Eggs stay tender + properly seasoned.' });
        }
        // 4) Technique: eggs left alone in a hot pan set unevenly
        var unattendedSec = dn.unattendedSec || 0;
        if (unattendedSec > 20) { score -= 10; notes.push({ neg: true, label: '⚠️ Left alone', detail: 'The eggs sat unstirred in a hot pan for ' + Math.round(unattendedSec) + 's in total. Patches on the bottom overcooked while the top stayed wet — keep them moving every 5-10 seconds.' }); }
        else if ((dn.stirCount || 0) >= 3) { notes.push({ neg: false, label: '✓ Kept moving', detail: 'Stirred ' + dn.stirCount + ' times — no patch got the chance to overcook.' }); }
        // 5) Carryover only counts if the eggs finished setting off the heat and never browned
        if (state.heatRemovedAt && isSet && browning < 0.3 && dn.setAt && dn.setAt >= state.heatRemovedAt - 5000) {
          notes.push({ neg: false, label: '✓ Carryover', detail: 'Pulled off heat with the eggs still glossy — carryover finished setting them.' });
        }
        // Runny eggs (never near setting) are not a passing dish, whatever else
        // went right (same shape as the poultry recipes' under-temperature cap).
        var isRaw = !isSet && peakF < 130;
        if (isRaw) score = Math.min(score, 55);
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = isRaw ? '🥚 Still raw in the middle. Give them more time on low heat.' :
                      score >= 90 ? '🌟 Restaurant-quality! These eggs would impress a chef.' :
                      score >= 80 ? '👨‍🍳 Solid scrambled eggs. Family approved.' :
                      score >= 70 ? '🍳 Edible. Not bad for a learning run.' :
                      score >= 60 ? '😬 Technically scrambled eggs. Technically.' :
                      '🚨 Kitchen fire risk. Try again.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      }
    },

    // ─────────────────────────────────────────────────────
    // FRENCH OMELET (medium) — same eggs, harder finish
    // ─────────────────────────────────────────────────────
    omelet: {
      id: 'omelet',
      name: 'French Omelet',
      icon: '🥚',
      difficulty: 'medium',
      targetTimeMin: 3,
      description: 'Same eggs, faster + hotter. The classic French test: no browning, rolled finish, baby-soft interior.',
      teaches: ['Heat control under pressure', 'Speed = different chemistry', 'Roll technique', 'Pan as a tool'],
      doneness: { foodK: 0.014, foodMaxF: 212, setF: 145, overF: 175, browningFrom: 'eggs', browningScale: [0.4, 0.9, 1.4, 2.5], stir: { label: 'Shake + scrape', icon: '🍳', grace: 10 } },
      ingredients: [
        { id: 'butter',     name: 'Butter (1 tbsp)',     icon: '🧈', addAtStep: 1 },
        { id: 'eggs',       name: 'Whisked eggs (2-3)',  icon: '🥚', addAtStep: 2 },
        { id: 'roll',       name: 'Roll + plate',        icon: '🌯', addAtStep: 4 }
      ],
      steps: [
        { id: 's0', title: 'Heat pan to MEDIUM-HIGH',
          instruction: 'Crank to 6-7 out of 10. Aim for ~340-380°F. The omelet wants speed, not gentleness.',
          target: { panTempF: { min: 320, max: 400 } }, completeWhen: 'panInRange',
          teach: 'Scrambled eggs want low + slow — they\'re custard. Omelets want fast + hot — they\'re crepes made of egg. The whole cook is under 90 seconds.' },
        { id: 's1', title: 'Add butter, swirl',
          instruction: 'Drop butter, swirl until foaming subsides. Should take 5-10 seconds — the pan is hot.',
          target: { itemAdded: 'butter' }, completeWhen: 'itemAdded',
          teach: 'At medium-high heat, butter foams and clears fast. If butter browns immediately = pan too hot, restart.' },
        { id: 's2', title: 'Pour eggs, swirl + stir vigorously',
          instruction: 'Pour eggs in. Immediately start tilting + shaking the pan, scraping with a spatula. Goal: small, fast curds that build a flat sheet.',
          target: { itemAdded: 'eggs' }, completeWhen: 'itemAdded',
          teach: 'The French move: pan stays moving, spatula stays moving, 20-30 seconds of intense agitation. You\'re making thousands of tiny curds that fuse into a smooth sheet.' },
        { id: 's3', title: 'Stop stirring — let bottom set',
          instruction: 'When the curds are mostly set but the top still looks WET + glossy, stop stirring. Let the bottom set for 10-15 seconds.',
          target: { activeTimeSec: { min: 20, max: 70 }, panTempF: { max: 410 } }, completeWhen: 'userClick',
          teach: 'The bottom needs to set into a thin "skin" that can hold the roll. Top stays glossy + barely set = the silky interior the French call "baveuse" (drooly).' },
        { id: 's4', title: 'Roll + plate',
          instruction: 'Tilt pan toward you. Use spatula to fold the far third over the middle. Slide onto plate, using the pan edge to fold the near third under as it lands. Done.',
          target: { itemAdded: 'roll' }, completeWhen: 'itemAdded',
          teach: 'The roll is the test. A good French omelet looks like a small football — smooth, pale yellow, no brown spots, soft inside. This is the Escoffier classic.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0;
        var t = state.activeTimeSec || 0;
        var dn = state.doneness || {};
        var browning = dn.browning || 0, peakF = dn.foodPeakF || 40, overSec = dn.secAboveOverF || 0, isSet = !!dn.set;
        // Omelet wants HIGH heat but NOT browning: judged on integrated surface
        // browning (heat × time in the pan), so a hot pan used briefly stays pale.
        if (browning >= 1.4) { score -= 35; notes.push({ neg: true, label: '🔥 Browned + tough', detail: 'Pan peaked at ' + Math.round(maxT) + '°F and the sheet browned. Real French omelets are PALE yellow — this one has brown spots + a tough skin.' }); }
        else if (browning >= 0.9) { score -= 15; notes.push({ neg: true, label: '🌡️ Some browning', detail: 'Peak ' + Math.round(maxT) + '°F for a little too long. Slight golden tinge — Julia Child would frown, but it\'s edible.' }); }
        else if (maxT >= 320) { notes.push({ neg: false, label: '✓ Pan temp', detail: 'Peak ' + Math.round(maxT) + '°F, no browning — proper omelet zone.' }); }
        else { score -= 25; notes.push({ neg: true, label: '🥶 Not hot enough', detail: 'Pan never got to omelet temp (' + Math.round(maxT) + '°F). Slow cook = scrambled eggs, not omelet.' }); }
        // Interior: set from ~145°F; rubbery after ~50 s above 175°F
        if (!isSet) { score -= 15; notes.push({ neg: true, label: '⏱️ Too fast', detail: 'Off the heat after ' + Math.round(t) + 's at ' + Math.round(peakF) + '°F inside — the interior would still be liquid.' }); }
        else if (overSec >= 50) { score -= 20; notes.push({ neg: true, label: '⏱️ Too slow', detail: Math.round(t) + 's in the pan, ' + Math.round(overSec) + 's of it past the drying point. The omelet should be DONE in 60-75s — this one is overcooked + rubbery.' }); }
        else { notes.push({ neg: false, label: '✓ Speed', detail: Math.round(t) + 's — properly fast, set through, still soft inside. The French omelet rewards speed.' }); }
        // Rolled?
        if ((state.itemAddTimes || {}).roll) {
          notes.push({ neg: false, label: '✓ Rolled', detail: 'You committed to the roll. That\'s the test.' });
        } else {
          score -= 10;
          notes.push({ neg: true, label: '⚠️ Not rolled', detail: 'Skipping the roll = scrambled eggs on a plate. The roll is what makes it an omelet.' });
        }
        // A liquid centre (never near setting) is a raw omelet, not baveuse: cap below passing
        var isRaw = !isSet && peakF < 130;
        if (isRaw) score = Math.min(score, 55);
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = isRaw ? '🥚 Liquid centre — that is a raw omelet, not baveuse. A few more seconds on the heat.' :
                      score >= 90 ? '🇫🇷 Worthy of Le Bernardin\'s line. Bravo.' :
                      score >= 80 ? '👨‍🍳 Solid omelet. The neighbors would be impressed.' :
                      score >= 70 ? '🥚 Recognizable as an omelet. Mostly.' :
                      score >= 60 ? '😬 Closer to scrambled eggs that got hugged.' :
                      '🚨 Julia Child would have notes.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var panTemp = state.panTemp, items = state.itemsInPan, t = state.activeTime;
        var panColor = panTemp >= 400 ? '#7c2d12' : panTemp >= 320 ? '#a3461a' : '#57534e';
        var hasButter = items.indexOf('butter') !== -1;
        var hasEggs = items.indexOf('eggs') !== -1;
        var rolled = items.indexOf('roll') !== -1;
        // Omelet colour follows integrated browning (the judge's thresholds): pale → golden → brown
        var browning = state.browning || 0;
        var omColor = browning >= 1.4 ? '#92400e' : browning >= 0.9 ? '#fbbf24' : '#fef9c3';
        return h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-hidden': 'true' },
          panTemp >= 300 ? h('ellipse', { cx: 140, cy: 95, rx: 110, ry: 55, fill: 'rgba(251,146,60,' + Math.min(0.6, (panTemp - 300) / 300) + ')', opacity: 0.6 }) : null,
          h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 30, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
          h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 25, fill: '#1c1410' }),
          hasButter && !hasEggs ? h('ellipse', { cx: 140, cy: 95, rx: 60, ry: 16, fill: '#fde68a', opacity: 0.5 }) : null,
          hasEggs && !rolled ? h('g', null,
            h('ellipse', { cx: 140, cy: 95, rx: 80, ry: 22, fill: omColor, opacity: 0.97 }),
            // Flat sheet — no curd bumps
            t > 15 ? h('ellipse', { cx: 140, cy: 95, rx: 80, ry: 22, fill: omColor, stroke: 'rgba(0,0,0,0.1)', strokeWidth: 0.5 }) : null
          ) : null,
          // Rolled omelet — football shape
          rolled ? h('g', null,
            h('ellipse', { cx: 140, cy: 95, rx: 50, ry: 14, fill: omColor, stroke: 'rgba(180,140,80,0.6)', strokeWidth: 1 }),
            // Roll seam
            h('path', { d: 'M 100 95 Q 140 100 180 95', stroke: 'rgba(140,100,40,0.5)', strokeWidth: 1, fill: 'none' })
          ) : null,
          h('rect', { x: 232, y: 90, width: 40, height: 14, fill: '#1c1410', rx: 3 }),
          h('circle', { cx: 140, cy: 130, r: 70, fill: 'none', stroke: panTemp >= 220 ? '#fb923c' : '#52525b', strokeWidth: 2, opacity: 0.4, strokeDasharray: '4 6' })
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // VEGETABLE STIR-FRY (medium) — high heat, order matters
    // ─────────────────────────────────────────────────────
    stirFry: {
      id: 'stirFry',
      name: 'Vegetable Stir-Fry',
      icon: '🥦',
      difficulty: 'medium',
      targetTimeMin: 6,
      description: 'Wok hei — the breath of the wok. Very high heat, prep first, ingredients in strict order: aromatics → hard veg → soft veg → sauce.',
      teaches: ['Heat-as-tool (wok hei)', 'Mise en place', 'Ingredient ordering by cook time', 'Quick saucing'],
      // Small pieces, constantly tossed; browning counts from the aromatics, not the oil
      doneness: { foodK: 0.006, foodMaxF: 212, browningFrom: 'aromatics', browningScale: [2, 8, 20, 30], fat: { item: 'oil', default: 'Refined avocado oil' }, stir: { label: 'Toss', icon: '🥢', grace: 12 }, moisture: { initial: 8, evap: 1.2 } },
      // The Heat tab's 'common mistake', as a choice: one crowded batch traps steam
      options: [{ id: 'load', label: 'Pan load', default: 'batches', choices: [
        { id: 'batches', label: 'Two batches · room to breathe', note: 'Each piece touches hot metal; water flashes off as fast as it comes out.' },
        { id: 'crowded', label: 'Everything at once · crowded', moisture: 40, evapFactor: 0.45, note: 'Water pools between the pieces and traps steam. The pan drops below browning temperature and the vegetables boil in their own juice before anything colours.' } ] }],
      ingredients: [
        { id: 'oil',       name: 'Oil (high smoke point)', icon: '🛢️', addAtStep: 0 },
        { id: 'aromatics', name: 'Garlic + ginger',        icon: '🧄', addAtStep: 1 },
        { id: 'hardVeg',   name: 'Broccoli + carrots',     icon: '🥕', addAtStep: 2 },
        { id: 'softVeg',   name: 'Bell pepper + snap peas', icon: '🫑', addAtStep: 3 },
        { id: 'sauce',     name: 'Soy sauce + sesame oil', icon: '🥢', addAtStep: 4 }
      ],
      steps: [
        { id: 's0', title: 'CRANK heat to MAX + add oil',
          instruction: 'Turn burner to 9-10. Get the pan/wok to ~430-475°F before adding oil. Drop oil in — should shimmer + ripple instantly.',
          target: { panTempF: { min: 410, max: 500 }, itemAdded: 'oil' }, completeWhen: 'itemAdded',
          teach: 'Wok hei means "breath of the wok" — that smoky depth Chinese stir-fries have. It needs VERY hot oil. Use avocado, peanut, or grapeseed — any oil with smoke point above 450°F. NOT olive oil.' },
        { id: 's1', title: 'Add aromatics — 30 seconds MAX',
          instruction: 'Drop garlic + ginger into the screaming-hot oil. Stir constantly. They should hiss + go fragrant in 10 seconds. Pull out or move on FAST.',
          target: { itemAdded: 'aromatics' }, completeWhen: 'itemAdded',
          teach: 'Garlic burns from gold to black in seconds at this heat. Burned garlic = bitter + ruined dish. You have ~30 seconds before the next ingredient must hit the pan.' },
        { id: 's2', title: 'Add hard vegetables (broccoli, carrots)',
          instruction: 'In they go. Toss + stir for ~90 seconds — they cook longer than softer veg. Keep the pan moving.',
          target: { itemAdded: 'hardVeg' }, completeWhen: 'itemAdded',
          teach: 'Order = cook time. Broccoli + carrots have dense cell walls — they need more time. Soft veg added first would turn to mush before the hard ones are done.' },
        { id: 's3', title: 'Add soft vegetables',
          instruction: 'Bell pepper, snap peas — anything that cooks in 30-60s. Toss + stir another minute. Vegetables should be bright-colored + just-tender.',
          target: { itemAdded: 'softVeg' }, completeWhen: 'itemAdded',
          teach: 'Soft veg join the party late. The goal: every vegetable finishes at the same moment, no mush, vibrant color.' },
        { id: 's4', title: 'Add sauce + toss',
          instruction: 'Pour soy sauce + sesame oil around the EDGE of the pan (not on top of veg) — it caramelizes on the hot metal for flavor depth. Toss to coat. 15-20 seconds. Done.',
          target: { itemAdded: 'sauce' }, completeWhen: 'itemAdded',
          teach: 'Pouring sauce on hot metal at the pan edge = instant Maillard + caramelization of the sauce sugars. That\'s another layer of "wok hei" flavor — the smoke + char layer Chinese cooks chase.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0;
        var t = state.activeTimeSec || 0;
        var order = state.ingredientOrder || [];
        var addT = state.itemAddTimes || {};
        var addPan = state.itemAddPanF || {};
        var dn = state.doneness || {};
        var browning = dn.browning || 0;
        var endMs = state.heatRemovedAt || state.lastTickAt || 0;
        // 1) Heat when the vegetables hit the pan — that is what wok hei needs.
        //    A peak reached after they went in does not count.
        var vegPanF = addPan.hardVeg != null ? addPan.hardVeg : maxT;
        if (vegPanF >= 430) { notes.push({ neg: false, label: '🔥 Proper heat', detail: 'Pan was ' + Math.round(vegPanF) + '°F when the vegetables hit it. Real wok-hei temperature.' }); }
        else if (vegPanF >= 380) { score -= 10; notes.push({ neg: true, label: '🌡️ Hot but not screaming', detail: 'Pan was ' + Math.round(vegPanF) + '°F when the vegetables went in. Workable, but not the smoky wok-hei depth — preheat to 430°F+ before the first ingredient.' }); }
        else { score -= 25; notes.push({ neg: true, label: '🥶 Pan not hot enough', detail: 'Pan was only ' + Math.round(vegPanF) + '°F when the vegetables went in. They release water faster than it can flash off — soggy, steam-fried vegetables.' }); }
        // 1b) Steam: a crowded wok boils the vegetables before anything can colour
        if ((dn.steamSec || 0) > 45) { score -= 15; notes.push({ neg: true, label: '💧 Steamed before it browned', detail: 'The surface stayed wet for ' + Math.round(dn.steamSec) + 's — water pooled between the pieces and the pan boiled instead of frying. Cook in batches so each piece touches hot metal.' }); }
        else if (dn.steamSec != null && addPan.hardVeg != null) { notes.push({ neg: false, label: '✓ Room to breathe', detail: 'Water flashed off as fast as it came out — the pan stayed a frying pan.' }); }
        // 2) Aromatics: garlic goes gold → black in seconds at wok heat. Judged on
        //    the time they spent alone in the hot pan before the hard veg arrived.
        if (addT.aromatics && addT.hardVeg && addT.hardVeg > addT.aromatics) {
          var aloneSec = (addT.hardVeg - addT.aromatics) / 1000;
          var aromPanF = addPan.aromatics != null ? addPan.aromatics : maxT;
          if (aloneSec > 45 && aromPanF >= 400) { score -= 15; notes.push({ neg: true, label: '🧄 Burnt aromatics', detail: 'Garlic + ginger sat alone in a ' + Math.round(aromPanF) + '°F pan for ' + Math.round(aloneSec) + 's. Past ~30s at that heat they go black and bitter, and the whole dish tastes of it.' }); }
          else { notes.push({ neg: false, label: '✓ Aromatics', detail: 'Garlic + ginger had ' + Math.round(aloneSec) + 's alone in the pan — fragrant, not burnt.' }); }
        }
        // 3) Ingredient order
        var expectedOrder = ['oil', 'aromatics', 'hardVeg', 'softVeg', 'sauce'];
        var orderCorrect = expectedOrder.every(function(id, i) { return order[i] === id; });
        if (orderCorrect) {
          notes.push({ neg: false, label: '✓ Ingredient order', detail: 'You followed the proper sequence. Each ingredient hit the pan at its right moment.' });
        } else {
          score -= 25;
          var firstWrong = expectedOrder.findIndex(function(id, i) { return order[i] !== id; });
          notes.push({ neg: true, label: '⚠️ Out of order', detail: 'Order matters in stir-fry. Expected: oil → aromatics → hard veg → soft veg → sauce. First mismatch at position ' + (firstWrong + 1) + '.' });
        }
        // 4) Vegetable texture: time the hard veg spent in the pan; char from integrated browning
        if (addT.hardVeg && endMs > addT.hardVeg) {
          var vegSec = (endMs - addT.hardVeg) / 1000;
          if (browning >= 30) { score -= 15; notes.push({ neg: true, label: '🔥 Charred', detail: Math.round(vegSec) + 's at full wok heat with nothing pulling the pan back — the vegetables went past char into burnt + bitter.' }); }
          else if (vegSec < 75) { score -= 10; notes.push({ neg: true, label: '⏱️ Undercooked', detail: 'Hard vegetables had only ' + Math.round(vegSec) + 's in the pan. Broccoli + carrots need ~90s at wok heat before the soft veg join.' }); }
          else if (vegSec > 300) { score -= 10; notes.push({ neg: true, label: '⏱️ Overcooked', detail: 'Hard vegetables were in for ' + Math.round(vegSec) + 's — mushy + faded. Aim to plate 3-4 minutes after they go in.' }); }
          else { notes.push({ neg: false, label: '✓ Timing', detail: 'Hard vegetables had ' + Math.round(vegSec) + 's, soft ones joined late — bright + just-tender.' }); }
        } else if (t < 180) { score -= 5; notes.push({ neg: true, label: '⏱️ Slightly rushed', detail: 'Total cook ' + Math.round(t) + 's. Stir-fry IS fast but veg need at least 3-4 min total.' }); }
        // 4b) Oil: the stir-fry's own warning — NOT olive oil at wok heat
        if (dn.oil && (dn.smokeSec || 0) > 8) { score -= 10; notes.push({ neg: true, label: '🌫️ Oil past its smoke point', detail: dn.oil.oil + ' smokes at ' + dn.oil.smokeF + '°F; the wok sat above that for ' + Math.round(dn.smokeSec) + 's with it in. Acrid smoke, bitter taste, and the fat is breaking down — use a high-smoke-point oil at this heat.' }); }
        else if (dn.oil && maxT >= 400) { notes.push({ neg: false, label: '✓ Oil matched the heat', detail: dn.oil.oil + ' (smoke point ' + dn.oil.smokeF + '°F) stayed clear at a ' + Math.round(maxT) + '°F peak.' }); }
        // 5) Tossing: at wok heat anything that sits still scorches
        if ((dn.unattendedSec || 0) > 30) { score -= 10; notes.push({ neg: true, label: '⚠️ Not tossed enough', detail: 'The pan sat still for ' + Math.round(dn.unattendedSec) + 's in total at wok heat. Pieces on the bottom scorched while the rest steamed — keep everything moving.' }); }
        else if ((dn.stirCount || 0) >= 3) { notes.push({ neg: false, label: '✓ Kept it moving', detail: 'Tossed ' + dn.stirCount + ' times — even heat on every piece.' }); }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = score >= 90 ? '🥢 Wok hei achieved. The kind of stir-fry that smells like a great Chinese restaurant.' :
                      score >= 80 ? '🍳 Good stir-fry. Crunchy, flavorful, balanced.' :
                      score >= 70 ? '🥦 Stir-fried adjacent. Bit pale.' :
                      score >= 60 ? '😬 Vegetable medley with extra steps.' :
                      '🚨 Sad veggies. Maybe order takeout.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var panTemp = state.panTemp, items = state.itemsInPan;
        var hasOil = items.indexOf('oil') !== -1;
        var hasAr = items.indexOf('aromatics') !== -1;
        var hasHard = items.indexOf('hardVeg') !== -1;
        var hasSoft = items.indexOf('softVeg') !== -1;
        var hasSauce = items.indexOf('sauce') !== -1;
        var panColor = panTemp >= 450 ? '#1c1410' : panTemp >= 350 ? '#3a2418' : '#57534e';
        // Colour follows the judge's state: aromatics go black once they have
        // sat alone too long in a hot wok; vegetables char from integrated browning.
        var browning = state.browning || 0;
        var addSim = state.itemAddSimSec || {};
        var aromAlone = hasAr && !hasHard && addSim.aromatics != null ? (state.simElapsed || 0) - addSim.aromatics : 0;
        var aromBurnt = hasAr && ((aromAlone > 45 && panTemp >= 400) || browning >= 30);
        var aromColor = aromBurnt ? '#1c1410' : browning >= 6 ? '#b45309' : '#fef3c7';
        var charred = browning >= 30;
        var vegStroke = charred ? '#1c1410' : browning >= 8 ? 'rgba(60,30,10,0.7)' : 'none';
        var vegAlpha = charred ? 0.55 : 1;
        return h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-hidden': 'true' },
          // Wok glow / flame at high heat
          panTemp >= 400 ? h('ellipse', { cx: 140, cy: 95, rx: 115, ry: 60, fill: 'rgba(251,146,60,0.7)' }) : null,
          // Wok shape (deeper than pan)
          h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 35, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
          h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 30, fill: '#1c1410' }),
          // Oil sheen
          hasOil ? h('ellipse', { cx: 140, cy: 95, rx: 70, ry: 18, fill: 'rgba(255,220,120,0.4)' }) : null,
          // Aromatics (small bright dots)
          // Stuck-on patch when the wok sits unattended
          state.unattended ? h('ellipse', { cx: 140, cy: 97, rx: 40, ry: 9, fill: 'rgba(28,20,16,0.85)', stroke: '#7c2d12', strokeWidth: 1 }) : null,
          hasAr ? h('g', null,
            h('circle', { cx: 110, cy: 92, r: 3, fill: aromColor }),
            h('circle', { cx: 130, cy: 96, r: 2.5, fill: aromColor }),
            h('circle', { cx: 150, cy: 91, r: 3, fill: aromColor }),
            h('circle', { cx: 170, cy: 95, r: 2.5, fill: aromColor })
          ) : null,
          // Hard veg (orange + green chunks); char edges darken with browning
          hasHard ? h('g', { opacity: vegAlpha, stroke: vegStroke, strokeWidth: 1 },
            h('rect', { x: 100, y: 88, width: 12, height: 8, fill: '#22c55e', rx: 2 }),
            h('rect', { x: 120, y: 90, width: 10, height: 7, fill: '#f97316', rx: 2 }),
            h('rect', { x: 142, y: 88, width: 12, height: 8, fill: '#22c55e', rx: 2 }),
            h('rect', { x: 162, y: 91, width: 11, height: 7, fill: '#f97316', rx: 2 }),
            h('rect', { x: 178, y: 88, width: 10, height: 8, fill: '#22c55e', rx: 2 })
          ) : null,
          // Soft veg (peppers + peas)
          hasSoft ? h('g', { opacity: vegAlpha, stroke: vegStroke, strokeWidth: 1 },
            h('rect', { x: 92, y: 98, width: 9, height: 6, fill: '#ef4444', rx: 1 }),
            h('rect', { x: 132, y: 100, width: 8, height: 6, fill: '#eab308', rx: 1 }),
            h('rect', { x: 156, y: 98, width: 9, height: 6, fill: '#ef4444', rx: 1 }),
            h('rect', { x: 182, y: 100, width: 8, height: 6, fill: '#84cc16', rx: 1 })
          ) : null,
          // Sauce sheen
          hasSauce ? h('ellipse', { cx: 140, cy: 100, rx: 80, ry: 12, fill: 'rgba(120,53,15,0.5)' }) : null,
          // Wok hei smoke: real heat with food in it, char, or the oil past its smoke point
          (panTemp > 420 && (hasHard || hasAr)) || charred || state.oilSmoking ? h('g', null,
            h('path', { d: 'M 110 75 Q 105 60 115 45 Q 125 30 115 15', stroke: 'rgba(180,180,180,0.6)', strokeWidth: 2.5, fill: 'none' }),
            h('path', { d: 'M 140 73 Q 138 55 148 40 Q 158 28 152 12', stroke: 'rgba(180,180,180,0.6)', strokeWidth: 2.5, fill: 'none' }),
            h('path', { d: 'M 170 75 Q 165 58 175 42 Q 185 28 175 14', stroke: 'rgba(180,180,180,0.6)', strokeWidth: 2.5, fill: 'none' })
          ) : null,
          // Wok handle (longer than skillet)
          h('rect', { x: 232, y: 92, width: 45, height: 10, fill: '#1c1410', rx: 2 }),
          // Burner
          h('circle', { cx: 140, cy: 135, r: 75, fill: 'none', stroke: panTemp >= 350 ? '#dc2626' : '#52525b', strokeWidth: 2.5, opacity: 0.5, strokeDasharray: '4 6' })
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // PAN-SEARED CHICKEN (medium) — Maillard + carryover
    // ─────────────────────────────────────────────────────
    panSeared: {
      id: 'panSeared',
      name: 'Pan-Seared Chicken',
      icon: '🍗',
      difficulty: 'medium',
      targetTimeMin: 10,
      description: 'The classic. Build a Maillard crust on high heat, finish through, rest before cutting. Tracks INTERNAL temp — verify at least 165°F before removing from heat, then rest.',
      teaches: ['Maillard at scale', 'Internal vs surface temp', 'Carryover cooking', 'Thermometer use', 'Rest discipline'],
      // A 1-inch breast: 40 → 165°F takes ~11 min across a 420°F sear + medium finish
      doneness: { foodK: 0.0007, foodMaxF: 212, setF: 165, overF: 175, browningFrom: 'chicken', browningScale: [1, 4, 9, 24], fat: { item: 'oil', default: 'Refined avocado oil' }, stir: { label: 'Poke / move the chicken', icon: '👆', disturbs: true }, moisture: { initial: 6, evap: 1.2 } },
      options: [{ id: 'dry', label: 'Before it goes in', default: 'patted', choices: [
        { id: 'patted', label: 'Patted dry', note: 'Paper towel, both sides. The surface can start browning almost at once.' },
        { id: 'wet', label: 'Straight from the pack', moisture: 45, note: 'Surface water has to boil off first — the pan hisses and spits, the chicken steams grey, and the crust starts late.' } ] }],
      ingredients: [
        { id: 'oil',     name: 'Oil (avocado or refined)', icon: '🛢️', addAtStep: 0 },
        { id: 'chicken', name: 'Seasoned chicken breast',  icon: '🍗', addAtStep: 1 }
      ],
      steps: [
        { id: 's0', title: 'Heat pan + add oil',
          instruction: 'Crank burner to 7-8. Wait until pan reaches ~420°F. Add a tablespoon of high-smoke-point oil — should shimmer instantly.',
          target: { panTempF: { min: 400, max: 470 }, itemAdded: 'oil' }, completeWhen: 'itemAdded',
          teach: 'Chicken skin + a thoroughly heated pan = the only way to get golden-brown crust without grey rubber underneath. Cold pan = stuck + steamed.' },
        { id: 's1', title: 'Lay chicken in — DO NOT MOVE',
          instruction: 'Pat chicken DRY first. Lay it in the pan (skin/presentation side down). Don\'t poke it. Don\'t shake it. Don\'t flip it. 4-5 minutes.',
          target: { itemAdded: 'chicken' }, completeWhen: 'itemAdded',
          teach: 'Maillard takes time + contact. Every time you move the chicken, you interrupt the reaction. Set it down, walk away, trust the process.' },
        { id: 's2', title: 'Flip when crust forms',
          instruction: 'Lift a corner — if it sticks, give it 30 more seconds. If it releases easily + looks deep golden, flip. Now 4-5 more minutes on side 2.',
          target: { activeTimeSec: { min: 180, max: 600 } }, completeWhen: 'userClick', actionLabel: '🔄 Flip the chicken',
          teach: 'The chicken tells you when it\'s ready to flip — protein releases from the pan once a proper crust has formed. If you fight it, you lose the crust.' },
        { id: 's3', title: 'Lower heat — cook through to 165°F internal',
          instruction: 'Drop burner to 4. Let internal temp climb to at least 165°F (use a meat thermometer — you can\'t guess this). About 3-5 more minutes.',
          target: { foodInternalF: { min: 165, max: 175 }, panTempF: { min: 250, max: 380 } },
          completeWhen: 'internalTempReached',
          teach: 'High heat for crust → medium heat to finish. If you stay on high, the outside burns before the inside hits safe temp. The thermometer is non-negotiable.' },
        { id: 's4', title: 'Pull off heat — REST',
          instruction: 'Take pan off heat. Move chicken to a plate, tent loosely with foil. Let rest 5-10 min. Verify at least 165°F before removing from heat; do not rely on a predicted carryover rise.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'Carryover is real physics — the outside of the chicken is hotter than the center when you removed it. That heat continues to migrate inward. Cutting now = juice everywhere. Resting = juice stays in the meat.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0;
        var foodT = state.foodInternalF || 40;
        var addPan = state.itemAddPanF || {};
        var dn = state.doneness || {};
        var browning = dn.browning || 0;
        var inPanF = addPan.chicken != null ? addPan.chicken : maxT;
        // 1) Crust: integrated surface browning while the chicken was in the pan.
        //    Reads the pan temp at the moment it went in — a peak reached later does not sear.
        if (browning >= 24) { score -= 15; notes.push({ neg: true, label: '🔥 Crust burnt', detail: 'Far more surface heat than a crust needs (pan peaked ' + Math.round(maxT) + '°F and stayed there). Black, acrid crust before the inside was done — drop to medium once the crust has set.' }); }
        else if (browning >= 9) { notes.push({ neg: false, label: '✓ Deep golden crust', detail: 'Pan was ' + Math.round(inPanF) + '°F when the chicken went in' + ((dn.stirCount || 0) >= 2 ? ' — the crust re-formed once you stopped moving it.' : ' and it stayed put — proper Maillard crust.') }); }
        else if (browning >= 4) { score -= 15; notes.push({ neg: true, label: '🌡️ Light crust', detail: 'Pan was ' + Math.round(inPanF) + '°F when the chicken went in; the crust only reached light gold. Preheat to 400°F+ and let it sear undisturbed.' }); }
        else { score -= 30; notes.push({ neg: true, label: '🥶 No crust', detail: 'Pan was ' + Math.round(inPanF) + '°F when the chicken went in — it stuck and steamed instead of searing. Grey + grim. You need 400°F+ before the chicken touches the pan.' }); }
        // 1a) Surface water: a wet breast steams grey before it can sear
        if ((dn.steamSec || 0) > 30) { score -= 10; notes.push({ neg: true, label: '💧 Wet surface', detail: 'The chicken went in wet: ' + Math.round(dn.steamSec) + 's of hissing and spitting while the surface water boiled off, and the crust could only start after that. Pat it dry first.' }); }
        // 1b) Patience: every poke breaks pan contact and resets part of the crust
        if ((dn.stirCount || 0) >= 2) { score -= 10; notes.push({ neg: true, label: '⚠️ Moved during the sear', detail: 'Poked or moved the chicken ' + dn.stirCount + ' times. Each move broke pan contact and gave back crust that had formed — set it down and trust the process.' }); }
        else if (addPan.chicken != null) { notes.push({ neg: false, label: '✓ Left it alone', detail: 'You let the chicken sit. Maillard needs uninterrupted contact, and you gave it that.' }); }
        // 1c) Oil: a sear needs an oil that can take 400°F+
        if (dn.oil && (dn.smokeSec || 0) > 8) { score -= 10; notes.push({ neg: true, label: '🌫️ Oil past its smoke point', detail: dn.oil.oil + ' smokes at ' + dn.oil.smokeF + '°F; the pan sat above that for ' + Math.round(dn.smokeSec) + 's with it in. Acrid smoke and a bitter crust — sear in a higher-smoke-point oil.' }); }
        else if (dn.oil && maxT >= 400) { notes.push({ neg: false, label: '✓ Oil matched the heat', detail: dn.oil.oil + ' (smoke point ' + dn.oil.smokeF + '°F) stayed clear at a ' + Math.round(maxT) + '°F peak.' }); }
        // 2) Interior: the SAFETY check, read from the simulated internal temp
        if (foodT < 165) { score = Math.min(score, 49); notes.push({ neg: true, label: 'FOOD SAFETY: undercooked', detail: 'Internal ' + Math.round(foodT) + '°F. Verify at least 165°F before removing poultry from heat. Do not serve or assume carryover will make it safe.' }); }
        else if (foodT < 175) { notes.push({ neg: false, label: '✓ Internal temp', detail: 'Internal ' + Math.round(foodT) + '°F — the measured internal temperature meets the 165°F minimum.' }); }
        else { score -= 15; notes.push({ neg: true, label: '🍂 Overcooked', detail: 'Internal ' + Math.round(foodT) + '°F, ' + Math.round(dn.secAboveOverF || 0) + 's of it above 175°F. Dry chicken. Next time, check earlier and remove once the thermometer verifies 165°F.' }); }
        // 3) Rest
        if (state.heatRemovedAt) {
          notes.push({ neg: false, label: '✓ Carryover discipline', detail: 'You pulled it off heat. Most cooks keep cooking past done — you didn\'t.' });
        }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = score >= 90 ? '🍗 Restaurant-quality pan-seared chicken. Crust like glass, juicy inside.' :
                      score >= 80 ? '👨‍🍳 Solid chicken. Dinner is served.' :
                      score >= 70 ? '🍗 Edible, mostly. Some dry spots.' :
                      score >= 60 ? '😬 Either tough or food-safety borderline.' :
                      '🚨 Don\'t serve this. Order pizza.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var panTemp = state.panTemp, items = state.itemsInPan, t = state.activeTime, foodT = state.foodTemp;
        var hasOil = items.indexOf('oil') !== -1;
        var hasChicken = items.indexOf('chicken') !== -1;
        var panColor = panTemp >= 400 ? '#7c2d12' : panTemp >= 320 ? '#a3461a' : '#57534e';
        // Crust colour follows integrated browning — the same value the judge reads
        // (≥ 24 burnt, ≥ 9 deep crust, ≥ 4 light crust). Poking resets part of it.
        var browning = state.browning || 0;
        var crustColor = state.rawColor || '#fde68a';    // raw: pale chicken, or red for a steak
        if (hasChicken) {
          if (browning >= 24) crustColor = '#1c1410';      // burnt
          else if (browning >= 9) crustColor = '#92400e';  // deep mahogany
          else if (browning >= 4) crustColor = '#c2410c';  // golden brown
          else if (browning >= 1) crustColor = '#d97706';  // light brown
        }
        return h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-hidden': 'true' },
          panTemp >= 300 ? h('ellipse', { cx: 140, cy: 95, rx: 110, ry: 55, fill: 'rgba(251,146,60,' + Math.min(0.6, (panTemp - 300) / 300) + ')' }) : null,
          h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 30, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
          h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 25, fill: '#1c1410' }),
          // Oil sheen
          hasOil && !hasChicken ? h('ellipse', { cx: 140, cy: 95, rx: 65, ry: 16, fill: 'rgba(255,220,120,0.4)' }) : null,
          // Chicken breast — irregular oval shape
          hasChicken ? h('g', null,
            h('path', { d: 'M 95 85 Q 90 95 100 105 Q 110 110 140 110 Q 175 109 185 100 Q 188 88 175 82 Q 145 75 110 78 Q 100 80 95 85 Z',
              fill: crustColor, stroke: 'rgba(120,53,15,0.7)', strokeWidth: 1 }),
            // Sear marks once a crust has started
            browning >= 2 ? h('g', null,
              h('path', { d: 'M 105 92 L 175 90', stroke: 'rgba(60,30,10,0.5)', strokeWidth: 1.5 }),
              h('path', { d: 'M 110 100 L 170 102', stroke: 'rgba(60,30,10,0.5)', strokeWidth: 1.5 })
            ) : null,
            // Juice pooling if rest started
            state.itemsInPan.length > 0 && panTemp < 200 ? h('ellipse', { cx: 140, cy: 105, rx: 50, ry: 8, fill: 'rgba(180,90,40,0.4)' }) : null,
            // Smoke if burning, or the oil is past its smoke point
            (browning >= 20 && panTemp > 440) || state.oilSmoking ? h('g', null,
              h('path', { d: 'M 120 70 Q 115 50 125 35', stroke: 'rgba(40,40,40,0.7)', strokeWidth: 3, fill: 'none' }),
              h('path', { d: 'M 160 72 Q 165 55 155 40', stroke: 'rgba(40,40,40,0.7)', strokeWidth: 3, fill: 'none' })
            ) : null,
            // Internal temp readout
            h('rect', { x: 92, y: 138, width: 96, height: 22, rx: 6, fill: 'rgba(0,0,0,0.75)' }),
            h('text', { x: 140, y: 153, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: foodT >= (state.safeF || 165) ? '#86efac' : foodT >= (state.safeF || 165) - 10 ? '#fbbf24' : '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' },
              'Internal: ' + Math.round(foodT) + '°F')
          ) : null,
          h('rect', { x: 232, y: 90, width: 40, height: 14, fill: '#1c1410', rx: 3 }),
          h('circle', { cx: 140, cy: 130, r: 70, fill: 'none', stroke: panTemp >= 220 ? '#fb923c' : '#52525b', strokeWidth: 2, opacity: 0.4, strokeDasharray: '4 6' })
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // SHEET-PAN ROASTED VEGETABLES (medium) — oven mode
    // ─────────────────────────────────────────────────────
    // First oven-mode recipe. Simulates ~25 min of cook time in
    // ~2 min real-time via simSpeedMultiplier=12.
    sheetPan: {
      id: 'sheetPan',
      name: 'Sheet-Pan Roasted Vegetables',
      icon: '🥘',
      difficulty: 'medium',
      cookingMode: 'oven',
      simSpeedMultiplier: 12,
      targetTimeMin: 30,
      description: 'Sheet-pan roasted veg: the easiest hot meal that still gets crispy + caramelized. Tests preheat discipline + single-layer pan capacity + doneness check.',
      teaches: ['Oven preheat patience', 'Convection + Maillard at scale', 'Don\'t crowd the pan', 'Mid-cook flip discipline'],
      doneness: { foodK: 0.003, foodMaxF: 212, browningFrom: 'veg', browningScale: [4, 12, 20, 32] },
      ingredients: [
        { id: 'oil',    name: 'Oil + salt toss',  icon: '🛢️', addAtStep: 1 },
        { id: 'veg',    name: 'Mixed vegetables', icon: '🥕', addAtStep: 2 },
        { id: 'flip',   name: 'Flip at halfway',  icon: '🔄', addAtStep: 3 }
      ],
      steps: [
        { id: 's0', title: 'Preheat oven to 400°F',
          instruction: 'Set the oven dial to 7 (about 400°F). Wait for the cavity to actually reach temp — ovens lie about preheat. Watch the real temperature climb.',
          target: { panTempF: { min: 380, max: 420 } }, completeWhen: 'panInRange',
          teach: 'Most home ovens say "preheated" 5-10 minutes before they actually are. Putting food in a cold oven means it steams in its own moisture before crisping. Patient preheat = crispy edges.' },
        { id: 's1', title: 'Toss veg with oil + salt',
          instruction: 'Drizzle 2 tbsp oil over vegetables in a bowl. Sprinkle with salt. Toss until every piece is coated.',
          target: { itemAdded: 'oil' }, completeWhen: 'itemAdded',
          teach: 'Oil does two jobs: it transfers heat to the vegetable surface AND it carries flavor (and salt). No oil = no Maillard = pale, sad veg.' },
        { id: 's2', title: 'Spread on sheet pan in single layer',
          instruction: 'Spread vegetables in a SINGLE LAYER on the pan. Pieces should not touch each other. If they\'re crowded, use two pans.',
          target: { itemAdded: 'veg' }, completeWhen: 'itemAdded',
          teach: 'Crowded pan = vegetables release water that hits other vegetables = steam trap = pale gray mush. Single layer = each piece gets direct hot air = Maillard browning.' },
        { id: 's3', title: 'Roast until halfway, flip',
          instruction: 'Place pan in oven. After ~15 sim-min, flip the vegetables with a spatula. Don\'t skip this step.',
          target: { activeTimeSec: { min: 600, max: 1200 } }, completeWhen: 'userClick',
          teach: 'The side touching the pan browns first. Flipping at halfway gets both sides golden. Skip the flip and one side burns while the other stays pale.' },
        { id: 's4', title: 'Add the "flip" marker (simulates flipping)',
          instruction: 'Click to flip the vegetables. They\'re committed to the second half now.',
          target: { itemAdded: 'flip' }, completeWhen: 'itemAdded',
          teach: 'Real-world flip is with a spatula scraping under each piece. Pieces should release easily if they\'ve browned. If they stick = not browned enough yet, give it 2 more minutes before flipping.' },
        { id: 's5', title: 'Finish roasting, pull when done',
          instruction: 'Let cook another ~15 sim-min. Pull when edges are deeply golden + a fork goes through easily. Then turn oven OFF.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'Oven veg is done when edges are dark golden + interior is fork-tender. Pull too early = raw inside; pull too late = charred + bitter.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0;
        var t = state.activeTimeSec || 0;
        var addPan = state.itemAddPanF || {};
        var dn = state.doneness || {};
        var browning = dn.browning || 0;
        var inOvenF = addPan.veg != null ? addPan.veg : maxT;
        // 1) Preheat discipline: oven temp when the tray went in
        if (inOvenF >= 380) { notes.push({ neg: false, label: '✓ Preheat', detail: 'Oven was ' + Math.round(inOvenF) + '°F when the tray went in — the vegetables started crisping straight away.' }); }
        else { score -= 15; notes.push({ neg: true, label: '🥶 No real preheat', detail: 'Oven was only ' + Math.round(inOvenF) + '°F when the tray went in. The vegetables steamed in their own moisture before they could crisp.' }); }
        // 2) Surface: integrated browning over the whole roast
        if (browning >= 32) { score -= 15; notes.push({ neg: true, label: '🔥 Charred edges', detail: 'Too much oven heat for too long (peak ' + Math.round(maxT) + '°F). Edges went past caramelised into black + bitter.' }); }
        else if (browning >= 12) { notes.push({ neg: false, label: '✓ Golden edges', detail: 'Deep golden, caramelised edges — the roasting zone did its work.' }); }
        else { score -= 20; notes.push({ neg: true, label: '🥶 Pale', detail: 'Not enough oven heat over time to brown (peak ' + Math.round(maxT) + '°F, ' + Math.round(t / 60) + ' min). Pale, soft, no caramelised edges.' }); }
        // 3) Interior: time in the oven
        if (t < 900) { score -= 15; notes.push({ neg: true, label: '⏱️ Hard inside', detail: Math.round(t / 60) + ' min in the oven — a fork would not go through. Roasted veg needs 20-30 min at 400°F.' }); }
        else if (t > 2400) { score -= 10; notes.push({ neg: true, label: '⏱️ Shrunken', detail: Math.round(t / 60) + ' min — past tender into dried-out + leathery.' }); }
        else { notes.push({ neg: false, label: '✓ Fork-tender', detail: Math.round(t / 60) + ' min — tender inside, edges set.' }); }
        // Did you flip?
        if ((state.itemAddTimes || {}).flip) {
          notes.push({ neg: false, label: '✓ Halfway flip', detail: 'You flipped. Both sides browned evenly.' });
        } else {
          score -= 15;
          notes.push({ neg: true, label: '⚠️ No flip', detail: 'Skipped the flip — bottom side is dark, top is pale + uncrisped.' });
        }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = score >= 90 ? '🌟 Restaurant-roasted veg. Caramelized edges, tender inside.' :
                      score >= 80 ? '👨‍🍳 Good roast. Healthy + tasty.' :
                      score >= 70 ? '🥕 Mostly cooked. Some pieces better than others.' :
                      score >= 60 ? '😬 Edible but flat. Pale roasted veg is sad.' :
                      '🚨 Steam-veg meets oven. Not it.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var ovenTemp = state.panTemp;
        var items = state.itemsInPan;
        var t = state.activeTime;
        var hasOil = items.indexOf('oil') !== -1;
        var hasVeg = items.indexOf('veg') !== -1;
        var flipped = items.indexOf('flip') !== -1;
        // Veg colour follows integrated browning — the judge's own thresholds
        // (pale < 12, golden, charred ≥ 32)
        var browning = state.browning || 0;
        var vegColor = browning >= 32 ? '#7c2d12' :
                       browning >= 20 ? '#c2410c' :
                       browning >= 12 ? '#ea580c' : '#fb923c';
        return h('svg', { width: 280, height: 200, viewBox: '0 0 280 200', 'aria-hidden': 'true' },
          // Oven cavity (rectangle with rounded corners)
          h('rect', { x: 30, y: 20, width: 220, height: 160, fill: '#1c1410', stroke: '#3f2419', strokeWidth: 3, rx: 12 }),
          // Heating elements (top + bottom glowing bars when oven is hot)
          ovenTemp >= 200 ? h('g', null,
            h('line', { x1: 50, y1: 32, x2: 230, y2: 32,
              stroke: ovenTemp >= 400 ? '#fb923c' : '#a16207', strokeWidth: 3, opacity: 0.8, strokeDasharray: '4 2' }),
            h('line', { x1: 50, y1: 168, x2: 230, y2: 168,
              stroke: ovenTemp >= 400 ? '#fb923c' : '#a16207', strokeWidth: 3, opacity: 0.8, strokeDasharray: '4 2' })
          ) : null,
          // Glow inside oven when hot
          ovenTemp >= 350 ? h('rect', { x: 35, y: 25, width: 210, height: 150, fill: 'rgba(251,146,60,' + Math.min(0.25, (ovenTemp - 300) / 600) + ')', rx: 10 }) : null,
          // Sheet pan with veg
          hasVeg ? h('g', null,
            // Sheet pan (perspective shape)
            h('rect', { x: 60, y: 90, width: 160, height: 60, fill: '#3f3f46', stroke: '#1c1410', strokeWidth: 1.5, rx: 4 }),
            h('rect', { x: 64, y: 94, width: 152, height: 52, fill: '#1f1f24', rx: 3 }),
            // Veg pieces (different shapes for variety)
            h('rect', { x: 72,  y: 100, width: 12, height: 12, fill: vegColor, rx: 2 }),
            h('rect', { x: 90,  y: 102, width: 14, height: 10, fill: vegColor, rx: 2, opacity: 0.95 }),
            h('rect', { x: 110, y: 99,  width: 13, height: 13, fill: vegColor, rx: 2 }),
            h('rect', { x: 128, y: 101, width: 12, height: 11, fill: vegColor, rx: 2, opacity: 0.92 }),
            h('rect', { x: 146, y: 100, width: 14, height: 12, fill: vegColor, rx: 2 }),
            h('rect', { x: 166, y: 102, width: 13, height: 10, fill: vegColor, rx: 2, opacity: 0.94 }),
            h('rect', { x: 184, y: 99,  width: 12, height: 13, fill: vegColor, rx: 2 }),
            h('rect', { x: 200, y: 101, width: 13, height: 11, fill: vegColor, rx: 2 }),
            // Row 2
            h('rect', { x: 80,  y: 125, width: 13, height: 11, fill: vegColor, rx: 2 }),
            h('rect', { x: 100, y: 124, width: 12, height: 13, fill: vegColor, rx: 2, opacity: 0.93 }),
            h('rect', { x: 120, y: 126, width: 14, height: 11, fill: vegColor, rx: 2 }),
            h('rect', { x: 140, y: 124, width: 13, height: 12, fill: vegColor, rx: 2 }),
            h('rect', { x: 160, y: 125, width: 12, height: 11, fill: vegColor, rx: 2, opacity: 0.96 }),
            h('rect', { x: 178, y: 124, width: 13, height: 13, fill: vegColor, rx: 2 }),
            h('rect', { x: 196, y: 126, width: 12, height: 11, fill: vegColor, rx: 2 }),
            // Flip indicator
            flipped ? h('text', { x: 140, y: 162, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: '#86efac' }, '↻ flipped') : null
          ) : null,
          // Oven door + window outline
          h('rect', { x: 60, y: 165, width: 160, height: 14, fill: '#3f2419', rx: 2 }),
          h('rect', { x: 90, y: 168, width: 100, height: 6, fill: '#86efac', opacity: 0.3, rx: 2 }),
          // Temp readout
          h('rect', { x: 90, y: 184, width: 100, height: 14, rx: 4, fill: 'rgba(0,0,0,0.75)' }),
          h('text', { x: 140, y: 194, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', fill: ovenTemp >= 400 ? '#fb923c' : '#fde68a' },
            'Cavity: ' + Math.round(ovenTemp) + '°F')
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // WHOLE ROAST CHICKEN (hard) — oven mode, two-stage temp,
    // internal-temp tracking, mandatory rest
    // ─────────────────────────────────────────────────────
    roastChicken: {
      id: 'roastChicken',
      name: 'Whole Roast Chicken',
      icon: '🍗',
      difficulty: 'hard',
      cookingMode: 'oven',
      simSpeedMultiplier: 12,
      targetTimeMin: 75,
      description: 'The classic family dinner. Two-stage temperature (sear → finish), internal-temp tracking, mandatory rest. Tests everything.',
      teaches: ['Two-stage temp strategy', 'Internal temp ≠ oven temp', 'Patience + thermometer', 'Carryover discipline'],
      // A ~4 lb bird: thigh reaches 165°F after ~75 sim-min of a 425 → 350°F roast
      doneness: { foodK: 0.00012, foodMaxF: 212, setF: 165, overF: 185, browningFrom: 'chicken', browningScale: [5, 14, 30, 110] },
      ingredients: [
        { id: 'seasoning', name: 'Seasoning + truss', icon: '🧂', addAtStep: 1 },
        { id: 'chicken',   name: 'Place chicken in oven', icon: '🍗', addAtStep: 2 }
      ],
      steps: [
        { id: 's0', title: 'Preheat oven HIGH — 425°F',
          instruction: 'Set the oven dial to 8 (about 425°F). Wait for the cavity to reach temp. We start hot for the skin, drop heat later.',
          target: { panTempF: { min: 410, max: 460 } }, completeWhen: 'panInRange',
          teach: 'High initial heat drives Maillard reactions in the skin — that\'s how you get crackly golden chicken skin. If you started low + slow, skin would render fat but stay flabby + pale.' },
        { id: 's1', title: 'Season the chicken + truss',
          instruction: 'Pat chicken DRY (water = no crispy skin). Rub salt + oil + pepper all over. Tie legs together with kitchen twine.',
          target: { itemAdded: 'seasoning' }, completeWhen: 'itemAdded',
          teach: 'Dry skin = crispy skin (water blocks Maillard). Trussing tucks the legs in so they cook at the same rate as the breast — without it, legs are done way before breast.' },
        { id: 's2', title: 'Place breast-up in oven',
          instruction: 'Chicken on a rack over a sheet pan (or in a roasting pan). Breast facing UP. Slide into oven.',
          target: { itemAdded: 'chicken' }, completeWhen: 'itemAdded',
          teach: 'Breast-up exposes the bigger muscle to direct radiant heat. Some cooks flip halfway through — purist option. For v1, breast-up the whole time is fine.' },
        { id: 's3', title: 'After 15 sim-min, drop oven to 350°F',
          instruction: 'After the initial high-heat phase (about 15 sim-min in), turn the oven dial DOWN to 5-6 (about 350°F). Continue roasting.',
          target: { activeTimeSec: { min: 600, max: 1500 }, panTempF: { min: 330, max: 400 } }, completeWhen: 'userClick',
          teach: 'The two-stage technique: high heat for crust + skin, then drop to medium to finish cooking without burning. A 425°F oven from start to finish would crisp the outside before the inside cooks through.' },
        { id: 's4', title: 'Cook until internal temp hits 165°F',
          instruction: 'Continue at 350°F. Watch the internal temp — pull at 165°F. Use a meat thermometer in the thickest part of the thigh.',
          target: { foodInternalF: { min: 165, max: 185 } }, completeWhen: 'internalTempReached',
          teach: 'Chicken is SAFE at 165°F internal (USDA). Going much higher = dry meat. The thermometer is non-negotiable — visual doneness checks are notoriously wrong on whole birds.' },
        { id: 's5', title: 'Pull out + REST 15 sim-min',
          instruction: 'Take chicken out of oven (turn off). Tent loosely with foil. Resting is MANDATORY — internal temp keeps climbing 5-10°F via carryover.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'Cutting a hot chicken = juice runs onto cutting board, chicken is dry. Rest = juice redistributes through the meat. The 10-15 minutes is not optional. Use it to make a pan sauce from the drippings.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0;
        var foodT = state.foodInternalF || 40;
        var addPan = state.itemAddPanF || {};
        var dn = state.doneness || {};
        var browning = dn.browning || 0;
        var inOvenF = addPan.chicken != null ? addPan.chicken : maxT;
        // 1) Skin: needs the high-heat phase AND enough time — integrated browning
        if (browning >= 110) { score -= 15; notes.push({ neg: true, label: '🔥 Skin burnt', detail: 'Oven peaked ' + Math.round(maxT) + '°F and never came down. The skin went black before the thigh reached temperature.' }); }
        else if (browning >= 30 && maxT >= 400) { notes.push({ neg: false, label: '✓ Crackly skin', detail: 'Oven was ' + Math.round(inOvenF) + '°F when the bird went in, peaked ' + Math.round(maxT) + '°F — the high-heat phase rendered and browned the skin.' }); }
        else if (browning >= 14) { score -= 10; notes.push({ neg: true, label: '🌡️ Lightly golden skin', detail: 'Skin coloured a little but never got the 410°F+ blast (peak ' + Math.round(maxT) + '°F) — chewy rather than crackly.' }); }
        else { score -= 25; notes.push({ neg: true, label: '🥶 Pale, flabby skin', detail: 'Oven peaked at ' + Math.round(maxT) + '°F. Without a high-heat phase the fat renders but the skin never crisps.' }); }
        // 2) Interior: the food-safety + doneness check, read from the simulated thigh temp
        if (foodT < 165) { score = Math.min(score, 49); notes.push({ neg: true, label: '☣️ FOOD SAFETY: undercooked', detail: 'Internal ' + Math.round(foodT) + '°F. USDA requires 165°F for poultry. This bird is salmonella risk — do not serve.' }); }
        else if (foodT < 168) { notes.push({ neg: false, label: '✓ Internal temp', detail: 'Internal ' + Math.round(foodT) + '°F — safely cooked with carryover bringing it higher during rest.' }); }
        else if (foodT < 185) { score -= 10; notes.push({ neg: true, label: '🍂 Slightly overdone', detail: 'Internal ' + Math.round(foodT) + '°F — past the sweet spot. Pull at 165°F next time, the carryover does the rest.' }); }
        else { score -= 20; notes.push({ neg: true, label: '🪵 Dry bird', detail: 'Internal ' + Math.round(foodT) + '°F, ' + Math.round((dn.secAboveOverF || 0) / 60) + ' min of it above 185°F. Very overcooked — dry + stringy.' }); }
        // 3) Rest discipline
        if (state.heatRemovedAt) {
          notes.push({ neg: false, label: '✓ Resting', detail: 'You pulled the bird off heat. Resting lets carryover finish the cook + juice redistribute.' });
        }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = score >= 90 ? '🍗 Picture-perfect roast chicken. Crispy skin, juicy meat, family-dinner gold.' :
                      score >= 80 ? '👨‍🍳 Solid roast bird. Sunday-dinner ready.' :
                      score >= 70 ? '🍗 Edible chicken. Some dry spots.' :
                      score >= 60 ? '😬 Either dry, undercooked, or both.' :
                      '🚨 Don\'t serve this to people you love.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var ovenTemp = state.panTemp;
        var items = state.itemsInPan;
        var t = state.activeTime;
        var foodT = state.foodTemp;
        var hasChicken = items.indexOf('chicken') !== -1;
        // Skin color shifts with time × temp
        var skinColor = '#fde68a';
        if (hasChicken) {
          // Skin colour follows integrated browning (judge: pale < 14, lightly golden, crackly ≥ 30, burnt ≥ 110)
          var browning = state.browning || 0;
          if (browning >= 110) skinColor = '#1c1410';      // burnt
          else if (browning >= 30) skinColor = '#92400e';  // deep mahogany, crackly
          else if (browning >= 14) skinColor = '#c2410c';  // golden brown
          else if (browning >= 5) skinColor = '#d97706';   // light brown
        }
        return h('svg', { width: 280, height: 220, viewBox: '0 0 280 220', 'aria-hidden': 'true' },
          // Oven cavity
          h('rect', { x: 30, y: 20, width: 220, height: 180, fill: '#1c1410', stroke: '#3f2419', strokeWidth: 3, rx: 12 }),
          // Heating elements
          ovenTemp >= 200 ? h('g', null,
            h('line', { x1: 50, y1: 32, x2: 230, y2: 32, stroke: ovenTemp >= 400 ? '#fb923c' : '#a16207', strokeWidth: 3, opacity: 0.8, strokeDasharray: '4 2' }),
            h('line', { x1: 50, y1: 188, x2: 230, y2: 188, stroke: ovenTemp >= 400 ? '#fb923c' : '#a16207', strokeWidth: 3, opacity: 0.8, strokeDasharray: '4 2' })
          ) : null,
          // Hot glow
          ovenTemp >= 350 ? h('rect', { x: 35, y: 25, width: 210, height: 170, fill: 'rgba(251,146,60,' + Math.min(0.3, (ovenTemp - 300) / 500) + ')', rx: 10 }) : null,
          // Roasting pan
          hasChicken ? h('g', null,
            h('rect', { x: 70, y: 130, width: 140, height: 50, fill: '#3f3f46', stroke: '#1c1410', strokeWidth: 1.5, rx: 4 }),
            // Wire rack
            h('line', { x1: 78, y1: 132, x2: 202, y2: 132, stroke: '#71717a', strokeWidth: 1 }),
            h('line', { x1: 78, y1: 137, x2: 202, y2: 137, stroke: '#71717a', strokeWidth: 1 }),
            // The chicken — pear-shaped body, drumsticks tucked
            h('ellipse', { cx: 140, cy: 100, rx: 50, ry: 30, fill: skinColor, stroke: 'rgba(120,53,15,0.6)', strokeWidth: 1.5 }),
            h('ellipse', { cx: 140, cy: 88, rx: 38, ry: 18, fill: skinColor, stroke: 'rgba(120,53,15,0.4)', strokeWidth: 1, opacity: 0.95 }),
            // Drumsticks
            h('ellipse', { cx: 105, cy: 122, rx: 10, ry: 14, fill: skinColor, stroke: 'rgba(120,53,15,0.6)', strokeWidth: 1, transform: 'rotate(-25 105 122)' }),
            h('ellipse', { cx: 175, cy: 122, rx: 10, ry: 14, fill: skinColor, stroke: 'rgba(120,53,15,0.6)', strokeWidth: 1, transform: 'rotate(25 175 122)' }),
            // Truss line (subtle)
            h('line', { x1: 105, y1: 122, x2: 175, y2: 122, stroke: 'rgba(120,80,40,0.5)', strokeWidth: 1, strokeDasharray: '2 2' }),
            // Texture / skin highlights when golden
            (state.browning || 0) >= 14 ? h('ellipse', { cx: 130, cy: 92, rx: 12, ry: 5, fill: 'rgba(255,235,180,0.3)' }) : null,
            (state.browning || 0) >= 30 ? h('g', null,
              h('path', { d: 'M 105 80 Q 115 75 130 78', stroke: 'rgba(120,53,15,0.4)', strokeWidth: 1, fill: 'none' }),
              h('path', { d: 'M 150 76 Q 165 73 178 78', stroke: 'rgba(120,53,15,0.4)', strokeWidth: 1, fill: 'none' })
            ) : null,
            // Smoke if burning
            (state.browning || 0) >= 110 || (ovenTemp > 470 && (state.browning || 0) >= 60) ? h('g', null,
              h('path', { d: 'M 120 60 Q 115 45 125 30', stroke: 'rgba(40,40,40,0.6)', strokeWidth: 2.5, fill: 'none' }),
              h('path', { d: 'M 160 62 Q 165 47 155 32', stroke: 'rgba(40,40,40,0.6)', strokeWidth: 2.5, fill: 'none' })
            ) : null
          ) : null,
          // Oven door + viewing window
          h('rect', { x: 60, y: 188, width: 160, height: 10, fill: '#3f2419', rx: 2 }),
          // Internal temp + oven temp readouts
          h('rect', { x: 60, y: 202, width: 100, height: 14, rx: 4, fill: 'rgba(0,0,0,0.75)' }),
          h('text', { x: 110, y: 212, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', fill: ovenTemp >= 400 ? '#fb923c' : '#fde68a' },
            'Oven: ' + Math.round(ovenTemp) + '°F'),
          hasChicken ? h('g', null,
            h('rect', { x: 165, y: 202, width: 100, height: 14, rx: 4, fill: 'rgba(0,0,0,0.75)' }),
            h('text', { x: 215, y: 212, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace',
              fill: foodT >= 165 ? '#86efac' : foodT >= 150 ? '#fbbf24' : '#fca5a5' },
              'Bird: ' + Math.round(foodT) + '°F')
          ) : null
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // PASTA + PAN SAUCE (medium) — multi-pot orchestration
    // ─────────────────────────────────────────────────────
    // The pot heats/boils/cooks pasta as a sidecar state machine
    // (potState) while the student builds sauce in the primary pan.
    // Tests parallel timing: pot needs ~3min to boil + 9min to cook
    // pasta; the sauce must be ready when the pasta drains.
    pastaSauce: {
      id: 'pastaSauce',
      name: 'Pasta + Pan Sauce',
      icon: '🍝',
      difficulty: 'medium',
      multiPot: true,
      simSpeedMultiplier: 4,
      targetTimeMin: 20,
      description: 'Two vessels, one dinner. Pot heats water + cooks pasta on its own timer. You build the sauce in the pan — both must finish together.',
      teaches: ['Parallel timing', 'Mise en place under pressure', 'Pasta water as ingredient', 'Sauce + pasta marriage'],
      doneness: { foodK: 0.004, foodMaxF: 212, browningFrom: 'garlic', browningScale: [0.5, 1.8, 4, 8], fat: { item: 'oil', default: 'Extra virgin olive oil' }, stir: { label: 'Stir the sauce', icon: '🥄', grace: 120 } },
      ingredients: [
        { id: 'oil',      name: 'Olive oil',           icon: '🛢️', addAtStep: 1 },
        { id: 'garlic',   name: 'Minced garlic',       icon: '🧄', addAtStep: 2 },
        { id: 'tomatoes', name: 'Crushed tomatoes',    icon: '🍅', addAtStep: 3 },
        { id: 'pasta',    name: 'Drained pasta + water', icon: '🍝', addAtStep: 5 }
      ],
      steps: [
        { id: 's0', title: 'Start the pasta water FIRST',
          instruction: 'Before anything else: fill the pot with water, salt it heavily, set it to boil. Water takes ~3 min to reach 212°F — use that time for the sauce.',
          target: { potState: 'heating' }, completeWhen: 'potStateReached',
          teach: 'Pasta water is the longest-lead-time ingredient. Start it first or everything ends late. Salt the water "like the sea" — pasta absorbs it during the cook.' },
        { id: 's1', title: 'Heat sauce pan to medium-low, add olive oil',
          instruction: 'While the pot heats, set the pan to 3-4 (~280°F). Drizzle olive oil. We\'re building a gentle sauce, not searing.',
          target: { panTempF: { min: 240, max: 320 }, itemAdded: 'oil' }, completeWhen: 'itemAdded',
          teach: 'Sauce wants medium-low — too hot and garlic burns instantly + the oil starts smoking. Olive oil flavor degrades above 375°F, so stay below.' },
        { id: 's2', title: 'Add minced garlic — fragrant, NOT brown',
          instruction: 'Drop minced garlic into warm oil. Stir constantly. 30-45 seconds — JUST fragrant. The moment it browns, it turns bitter.',
          target: { itemAdded: 'garlic' }, completeWhen: 'itemAdded',
          teach: 'Garlic in cold oil + slow heat = mellow + sweet. Garlic in hot oil = brown + bitter in 10 seconds. The window is narrow; that\'s why low heat matters.' },
        { id: 's3', title: 'Pour in tomatoes, simmer',
          instruction: 'Add crushed tomatoes. Stir. Bring to a low simmer (small bubbles, not a rolling boil). Reduce slightly while you wait for pasta.',
          target: { itemAdded: 'tomatoes' }, completeWhen: 'itemAdded',
          teach: 'Adding tomatoes drops the pan temp fast — that\'s fine, simmer is low anyway. As water evaporates from the sauce, flavors concentrate.' },
        { id: 's4', title: 'Drop pasta when pot is BOILING',
          instruction: 'Wait for the pot to fully boil before dropping pasta. Boiling = bubbles cover the entire surface, can\'t be stirred away.',
          target: { potState: 'pasta-in' }, completeWhen: 'potStateReached',
          teach: 'Pasta in not-quite-boiling water turns gummy + sticks. Real rolling boil = pasta separates + cooks evenly. Use the "Drop pasta" button only when pot status = boiling.' },
        { id: 's5', title: 'Drain pasta (RESERVE the water) + add to sauce',
          instruction: 'When pasta is done (~9 min), use "Drain (save water)" — the starchy pasta water is liquid gold for the sauce. Then add drained pasta to the pan.',
          target: { itemAdded: 'pasta' }, completeWhen: 'itemAdded',
          teach: 'Pasta water is full of starch dissolved from the pasta surface. A splash in the sauce thickens it + helps the sauce CLING to the pasta. Throwing the water away is a rookie move.' },
        { id: 's6', title: 'Toss in pan 30s, off heat, plate',
          instruction: 'Toss pasta in sauce 30 seconds, off heat, plate. The brief toss lets pasta absorb sauce + the starch in pasta water emulsifies oil into a glossy coat.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'The final toss is where pasta + sauce become ONE dish, not "pasta with sauce on top." Pasta water + olive oil + tomatoes emulsify into a silky coating.' }
      ],
      judge: function(state, fullState) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0;
        var addT = state.itemAddTimes || {};
        var addPan = state.itemAddPanF || {};
        var dn = state.doneness || {};
        var browning = dn.browning || 0;
        var simSpeed = 4; // this recipe's simSpeedMultiplier: pot timestamps are real ms
        // 1) Sauce surface: scorch from integrated browning while garlic/tomatoes were in
        if (browning >= 4) { score -= 25; notes.push({ neg: true, label: '🔥 Scorched sauce', detail: 'Pan peaked ' + Math.round(maxT) + '°F with the sauce in it. Tomato sugars + olive oil scorched — bitter, sour, no saving it.' }); }
        else if (browning >= 1.8) { score -= 10; notes.push({ neg: true, label: '🌡️ Bit hot for sauce', detail: 'Peak ' + Math.round(maxT) + '°F — the sauce caught on the pan edges. Some bitterness.' }); }
        else if (maxT >= 240) { notes.push({ neg: false, label: '✓ Sauce temp', detail: 'Peak ' + Math.round(maxT) + '°F, a gentle simmer — flavours melded without scorching.' }); }
        else { score -= 10; notes.push({ neg: true, label: '🥶 Sauce barely cooked', detail: 'Peak ' + Math.round(maxT) + '°F. Flavors didn\'t meld + raw tomato taste survives.' }); }
        // 1b) Oil: olive oil is right for a sauce, wrong for a hot pan
        if (dn.oil && (dn.smokeSec || 0) > 8) { score -= 10; notes.push({ neg: true, label: '🌫️ Oil past its smoke point', detail: dn.oil.oil + ' smokes at ' + dn.oil.smokeF + '°F; the pan sat above that for ' + Math.round(dn.smokeSec) + 's. The sauce tastes of acrid smoke — hold a sauce pan well under the oil\'s smoke point.' }); }
        // 2) Garlic: pan temp the moment it went in
        if (addT.garlic) {
          var garlicF = addPan.garlic != null ? addPan.garlic : maxT;
          if (garlicF >= 350) { score -= 15; notes.push({ neg: true, label: '🧄 Garlic browned on contact', detail: 'Pan was ' + Math.round(garlicF) + '°F when the garlic went in. At that heat it browns in seconds and turns bitter — ~280°F oil is the target.' }); }
          else { notes.push({ neg: false, label: '✓ Garlic mellow', detail: 'Garlic went into ' + Math.round(garlicF) + '°F oil — fragrant and sweet, not brown.' }); }
        }
        // 3) Pasta water reservation
        if (fullState && fullState.potWaterReserved) {
          notes.push({ neg: false, label: '✓ Pasta water saved', detail: 'You reserved the starchy pasta water. That\'s how you get the glossy emulsion.' });
        } else {
          score -= 20;
          notes.push({ neg: true, label: '💧 Lost the gold', detail: 'You drained the pasta water without saving it. Sauce will be thinner + less cohesive.' });
        }
        // 4) Did pasta go into real boiling water?
        if (fullState && fullState.potPastaInAt && fullState.potStartedAt) {
          var heatedSec = ((fullState.potPastaInAt - fullState.potStartedAt) / 1000) * simSpeed;
          if (heatedSec < 180) {
            score -= 15;
            notes.push({ neg: true, label: '⚠️ Pasta in cold water', detail: 'Pasta dropped before water fully boiled. Gummy + sticky outcome.' });
          } else {
            notes.push({ neg: false, label: '✓ Boiling water', detail: 'Patient — waited for full boil before dropping pasta.' });
          }
        }
        // 4b) Stirring: a sauce left alone catches on the bottom
        if ((dn.unattendedSec || 0) > 180) { score -= 10; notes.push({ neg: true, label: '⚠️ Caught on the bottom', detail: 'The sauce went ' + Math.round((dn.unattendedSec || 0) / 60) + ' min in total without a stir. Tomato sugars stuck and darkened on the pan floor.' }); }
        // 5) Pasta texture: how long it cooked before you drained it (al dente ≈ 9 sim-min)
        if (fullState && fullState.potDrainedAt && fullState.potPastaInAt) {
          var cookSimSec = ((fullState.potDrainedAt - fullState.potPastaInAt) / 1000) * simSpeed;
          if (cookSimSec < 480) { score -= 10; notes.push({ neg: true, label: '🍝 Pasta underdone', detail: 'Drained after ' + Math.round(cookSimSec / 60) + ' min — chalky centre. Al dente needs ~9 min at a rolling boil.' }); }
          else if (cookSimSec > 720) { score -= 10; notes.push({ neg: true, label: '🍝 Pasta overcooked', detail: Math.round(cookSimSec / 60) + ' min in the water — soft and gummy, past al dente.' }); }
          else { notes.push({ neg: false, label: '✓ Al dente', detail: Math.round(cookSimSec / 60) + ' min — tender with a slight bite.' }); }
        }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = score >= 90 ? '🍝 Restaurant pasta. Silky sauce, perfectly clinging.' :
                      score >= 80 ? '👨‍🍳 Solid pasta. Family-dinner approved.' :
                      score >= 70 ? '🍝 Recognizable pasta. Some shortcomings.' :
                      score >= 60 ? '😬 Sauce on noodles, technically.' :
                      '🚨 Order from the Italian place.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var panTemp = state.panTemp;
        var items = state.itemsInPan;
        var hasOil = items.indexOf('oil') !== -1;
        var hasGarlic = items.indexOf('garlic') !== -1;
        var hasTomatoes = items.indexOf('tomatoes') !== -1;
        var hasPasta = items.indexOf('pasta') !== -1;
        // Sauce darkens toward scorched as browning accumulates (judge: bit hot ≥ 1.8, scorched ≥ 4);
        // garlic goes brown if it met a pan over 350°F
        var browning = state.browning || 0;
        var garlicHot = (state.itemAddPanF || {}).garlic >= 350 || browning >= 1.8;
        var sauceColor = hasTomatoes ? (browning >= 4 ? '#7f1d1d' : browning >= 1.8 ? '#b91c1c' : '#dc2626') : hasGarlic ? (garlicHot ? '#d97706' : '#fde68a') : hasOil ? '#fef9c3' : '#1c1410';
        var panColor = panTemp >= 350 ? '#a3461a' : panTemp >= 240 ? '#78350f' : '#57534e';
        return h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-hidden': 'true' },
          panTemp >= 280 ? h('ellipse', { cx: 140, cy: 95, rx: 100, ry: 50, fill: 'rgba(251,146,60,0.4)' }) : null,
          h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 30, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
          h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 25, fill: '#1c1410' }),
          // Sauce contents
          hasOil ? h('ellipse', { cx: 140, cy: 95, rx: 80, ry: 22, fill: sauceColor, opacity: 0.9 }) : null,
          // Garlic bits
          hasGarlic && !hasTomatoes ? h('g', null,
            h('circle', { cx: 115, cy: 92, r: 2, fill: garlicHot ? '#7c2d12' : '#fef9c3' }),
            h('circle', { cx: 140, cy: 96, r: 2, fill: garlicHot ? '#7c2d12' : '#fef9c3' }),
            h('circle', { cx: 165, cy: 92, r: 2, fill: garlicHot ? '#7c2d12' : '#fef9c3' })
          ) : null,
          // Caught on the bottom when the sauce sits unattended
          hasTomatoes && state.unattended ? h('ellipse', { cx: 140, cy: 100, rx: 45, ry: 8, fill: 'rgba(28,20,16,0.8)', stroke: '#7c2d12', strokeWidth: 1 }) : null,
          // Olive oil past its smoke point
          state.oilSmoking ? h('g', null,
            h('path', { d: 'M 120 70 Q 115 50 125 35', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' }),
            h('path', { d: 'M 160 72 Q 165 52 155 37', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' })) : null,
          // Pasta visible if added
          hasPasta ? h('g', null,
            h('path', { d: 'M 100 95 Q 140 88 180 95', stroke: '#fef3c7', strokeWidth: 3, fill: 'none' }),
            h('path', { d: 'M 100 100 Q 140 93 180 100', stroke: '#fef3c7', strokeWidth: 3, fill: 'none' }),
            h('path', { d: 'M 110 90 Q 140 84 170 90', stroke: '#fde68a', strokeWidth: 2, fill: 'none' })
          ) : null,
          // Simmer bubbles when tomatoes added
          hasTomatoes && panTemp > 240 ? h('g', null,
            h('circle', { cx: 110, cy: 92, r: 2.5, fill: 'rgba(252,165,165,0.6)' }),
            h('circle', { cx: 140, cy: 95, r: 2, fill: 'rgba(252,165,165,0.6)' }),
            h('circle', { cx: 175, cy: 91, r: 2.5, fill: 'rgba(252,165,165,0.6)' })
          ) : null,
          h('rect', { x: 232, y: 90, width: 40, height: 14, fill: '#1c1410', rx: 3 }),
          h('circle', { cx: 140, cy: 130, r: 70, fill: 'none', stroke: panTemp >= 220 ? '#fb923c' : '#52525b', strokeWidth: 2, opacity: 0.4, strokeDasharray: '4 6' })
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // PANCAKES (easy) — one flip, judged per side
    // ─────────────────────────────────────────────────────
    pancakes: {
      id: 'pancakes',
      name: 'Pancakes',
      icon: '🥞',
      difficulty: 'easy',
      targetTimeMin: 5,
      description: 'One pancake, one flip. The whole skill is reading the surface: bubbles and dry edges say flip, and the colour of the first side tells you whether the pan was right.',
      teaches: ['Reading surface cues (bubbles, dry edges)', 'Flip timing', 'Medium-heat discipline', 'Two sides, one pan temperature'],
      // Thin batter: sets ~195°F inside, dries past 209°F. Browning is judged per side (see step s3 record: 'flip').
      doneness: { foodK: 0.006, foodMaxF: 212, setF: 195, overF: 209, browningFrom: 'batter', browningScale: [0.15, 0.35, 0.8, 1.5], fat: { item: 'oil', default: 'Refined canola/sunflower' } },
      ingredients: [
        { id: 'oil',    name: 'Oil or butter for the pan', icon: '🧈', addAtStep: 1 },
        { id: 'batter', name: 'Batter (¼ cup)',            icon: '🥣', addAtStep: 2 }
      ],
      steps: [
        { id: 's0', title: 'Heat the pan to MEDIUM',
          instruction: 'Burner to 5-6. Aim for 330-380°F. A drop of water should dance and skitter, not sit and boil.',
          target: { panTempF: { min: 330, max: 380 } }, completeWhen: 'panInRange',
          teach: 'Too cool and the pancake dries out before it browns; too hot and the outside browns before the inside sets. Medium is the whole game.' },
        { id: 's1', title: 'Grease the pan lightly',
          instruction: 'A thin film of oil — or butter if you like the flavour, but butter smokes above 302°F, so wipe out the excess.',
          target: { itemAdded: 'oil' }, completeWhen: 'itemAdded',
          teach: 'Fat carries heat into the batter evenly and stops it sticking. Too much pools and fries the edges lacy.' },
        { id: 's2', title: 'Pour the batter',
          instruction: 'A quarter cup, poured from the centre so it spreads into a round. Do not touch it.',
          target: { itemAdded: 'batter' }, completeWhen: 'itemAdded',
          teach: 'Batter is starch + protein + leavening. Heat sets the starch (about 195°F inside); the bubbles you will see are the leavening working.' },
        { id: 's3', title: 'Watch: bubbles + dry edges → FLIP',
          instruction: 'Wait for bubbles across the surface and edges that look dry and matte. Then one confident flip. About 60-90 seconds.',
          target: { activeTimeSec: { min: 45, max: 150 } }, completeWhen: 'userClick', record: 'flip', recordIcon: '🔄', actionLabel: '🔄 Flip the pancake',
          teach: 'The bubbles are steam and carbon dioxide escaping — they only reach the top once the bottom has set. Flip before them and the batter runs; long after and the first side is dark.' },
        { id: 's4', title: 'Cook side 2 until the centre sets',
          instruction: 'Side 2 takes about half the time. The centre is done at about 195°F: springy, not wet.',
          target: { foodInternalF: { min: 195, max: 212 } }, completeWhen: 'internalTempReached',
          teach: 'Side 2 is shorter because the pancake is already hot through. Press gently: it should spring back.' },
        { id: 's5', title: 'Off the heat, onto the plate',
          instruction: 'Turn the burner off and plate it. Two golden sides, set through.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'For a stack, keep the pan at the same setting between pancakes — the second is usually the best, because the pan is properly even by then.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var dn = state.doneness || {}; var marks = state.marks || {}; var maxT = state.maxPanTempF || 0;
        var scale = RECIPES.pancakes.doneness.browningScale;
        var browning = dn.browning || 0;
        var side1 = marks.flip ? marks.flip.browning : null;
        var side2 = side1 != null ? Math.max(0, browning - side1) : browning;
        var peakF = Math.round(dn.foodPeakF || 40); var isSet = !!dn.set;
        // 1) First side = flip timing. Browning recorded at the moment of the flip.
        if (side1 == null) { score -= 20; notes.push({ neg: true, label: '🔄 Never flipped', detail: 'The pancake finished on one side: that side ' + browningLabel(browning, scale).label + ', the other raw batter.' }); }
        else if (side1 < scale[0]) { score -= 10; notes.push({ neg: true, label: '🔄 Flipped too early', detail: 'First side barely coloured (browning ' + side1.toFixed(2) + ') — the bubbles had not reached the top yet, and the batter ran when you turned it.' }); }
        else if (side1 > scale[2]) { score -= 15; notes.push({ neg: true, label: '🔄 Flipped late', detail: 'First side went dark (browning ' + side1.toFixed(2) + '). The bubbles had come and gone — flip when they cover the surface and the edges look dry.' }); }
        else { notes.push({ neg: false, label: '✓ Flipped on cue', detail: 'First side golden (browning ' + side1.toFixed(2) + ') — you turned it when the surface said so.' }); }
        // 2) Second side
        if (side1 != null) {
          if (side2 < scale[0] / 2) { score -= 5; notes.push({ neg: true, label: '🌡️ Pale second side', detail: 'Side 2 hardly coloured (' + side2.toFixed(2) + '). Fine to eat; for a matched pair give it another 20-30 seconds.' }); }
          else if (side2 > scale[2]) { score -= 10; notes.push({ neg: true, label: '🌡️ Dark second side', detail: 'Side 2 went too far (' + side2.toFixed(2) + '). It needs about half the time of side 1.' }); }
          else { notes.push({ neg: false, label: '✓ Matched sides', detail: 'Two golden sides (' + side1.toFixed(2) + ' / ' + side2.toFixed(2) + ').' }); }
        }
        // 3) Interior
        if (!isSet) { score = Math.min(score, 55); notes.push({ neg: true, label: '🥣 Raw in the middle', detail: 'Centre peaked at ' + peakF + '°F; the starch sets at about 195°F. Lower the heat a notch and give side 2 longer.' }); }
        else if ((dn.secAboveOverF || 0) > 60) { score -= 10; notes.push({ neg: true, label: '🍂 Dry', detail: 'Set, then ' + Math.round(dn.secAboveOverF) + 's past 209°F — a dry, tough pancake.' }); }
        else { notes.push({ neg: false, label: '✓ Set through', detail: 'Centre reached ' + peakF + '°F — springy, not wet.' }); }
        // 4) Pan heat, named as the cause only when a side was off
        if (maxT >= 410 && (side1 > scale[2] || side2 > scale[2])) { score -= 5; notes.push({ neg: true, label: '🔥 Pan too hot', detail: 'Pan peaked ' + Math.round(maxT) + '°F — that is why the outside outran the inside. Medium is 330-380°F.' }); }
        else if (maxT < 300 && side1 != null && side1 < scale[0]) { score -= 5; notes.push({ neg: true, label: '🥶 Pan too cool', detail: 'Pan peaked ' + Math.round(maxT) + '°F — no colour is possible under ~300°F; the pancake dries before it browns.' }); }
        // 5) Oil
        if (dn.oil && (dn.smokeSec || 0) > 8) { score -= 10; notes.push({ neg: true, label: '🌫️ Fat past its smoke point', detail: dn.oil.oil + ' smokes at ' + dn.oil.smokeF + '°F; the pan sat above that for ' + Math.round(dn.smokeSec) + 's. Acrid — use oil, or clarified butter, on a medium pan.' }); }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = !isSet ? '🥣 Raw batter inside. A pancake is done by temperature, not by colour.' :
                      score >= 90 ? '🥞 Diner-perfect. Golden both sides, springy centre.' :
                      score >= 80 ? '👨‍🍳 Good pancake. The stack starts here.' :
                      score >= 70 ? '🥞 Edible pancake. One side has a story.' :
                      score >= 60 ? '😬 Pancake-shaped. Read the bubbles next time.' :
                      '🚨 The dog would eat it. Nobody else.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        var panTemp = state.panTemp, items = state.itemsInPan || [], foodT = state.foodTemp || 40;
        var hasFat = items.indexOf('oil') !== -1, hasBatter = items.indexOf('batter') !== -1;
        var browning = state.browning || 0; var flip = state.marks && state.marks.flip;
        var scale = [0.15, 0.35, 0.8, 1.5];
        var side1 = flip ? flip.browning : browning, side2 = flip ? Math.max(0, browning - side1) : 0;
        // After the flip the browned first side faces up; the side on the pan shows at the rim
        var topColor = flip ? browningLabel(side1, scale).color : (foodT >= 150 ? '#fde68a' : '#fef3c7');
        var rimColor = browningLabel(flip ? side2 : side1, scale).color;
        var bubbles = hasBatter && !flip && foodT >= 130;
        var dryEdge = hasBatter && !flip && foodT >= 150;
        var panColor = panTemp >= 400 ? '#7c2d12' : panTemp >= 320 ? '#a3461a' : panTemp >= 220 ? '#78350f' : '#57534e';
        var bubbleSpots = [[112, 92], [128, 88], [146, 94], [162, 89], [175, 95], [138, 99], [155, 100]];
        return h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-hidden': 'true' },
          panTemp >= 300 ? h('ellipse', { cx: 140, cy: 95, rx: 110, ry: 55, fill: 'rgba(251,146,60,' + Math.min(0.6, (panTemp - 300) / 300) + ')', opacity: 0.6 }) : null,
          h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 30, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
          h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 25, fill: '#1c1410' }),
          hasFat && !hasBatter ? h('ellipse', { cx: 140, cy: 95, rx: 60, ry: 15, fill: 'rgba(255,220,120,0.4)' }) : null,
          hasBatter ? h('g', null,
            h('ellipse', { cx: 140, cy: 95, rx: 66, ry: 17, fill: topColor, stroke: rimColor, strokeWidth: 3.5 }),
            dryEdge ? h('ellipse', { cx: 140, cy: 95, rx: 60, ry: 14, fill: 'none', stroke: 'rgba(120,80,30,0.45)', strokeWidth: 1, strokeDasharray: '3 3' }) : null,
            bubbles ? h('g', null, bubbleSpots.map(function(p, i) {
              return h('circle', { key: i, cx: p[0], cy: p[1], r: foodT >= 150 ? 2.6 : 1.8, fill: 'rgba(255,255,255,0.55)', stroke: 'rgba(120,80,30,0.5)', strokeWidth: 0.6 });
            })) : null,
            flip ? h('text', { x: 140, y: 99, textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: 'rgba(60,30,10,0.7)' }, 'flipped') : null,
            panTemp > 212 && foodT < 205 ? h('g', { style: { filter: 'blur(0.7px)' } },
              h('path', { d: 'M 115 75 Q 118 67 115 58', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' }),
              h('path', { d: 'M 165 75 Q 168 67 165 58', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' })) : null,
            browning >= scale[3] || state.oilSmoking ? h('g', null,
              h('path', { d: 'M 130 70 Q 135 50 125 35 Q 115 25 120 10', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' }),
              h('path', { d: 'M 160 72 Q 155 55 165 40 Q 175 28 168 12', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' })) : null
          ) : null,
          h('rect', { x: 232, y: 90, width: 40, height: 14, fill: '#1c1410', rx: 3 }),
          h('circle', { cx: 140, cy: 130, r: 70, fill: 'none', stroke: panTemp >= 220 ? '#fb923c' : '#52525b', strokeWidth: 2, opacity: 0.4, strokeDasharray: '4 6' })
        );
      }
    },

    // ─────────────────────────────────────────────────────
    // PAN-SEARED STEAK (medium) — a doneness target you choose, and the USDA floor
    // ─────────────────────────────────────────────────────
    steak: {
      id: 'steak',
      name: 'Pan-Seared Steak',
      icon: '🥩',
      difficulty: 'medium',
      targetTimeMin: 9,
      description: 'A 1-inch steak: screaming-hot pan, a real crust, and a thermometer decision. You choose the doneness target; the judge holds you to it, and to the USDA floor.',
      teaches: ['Doneness bands by temperature', 'USDA 145°F + rest for whole cuts', 'Sear = contact + heat + patience', 'Carryover on a thick cut'],
      doneness: { foodK: 0.0007, foodMaxF: 212, setF: 145, overF: 160, browningFrom: 'steak', browningScale: [1, 4, 9, 24], fat: { item: 'oil', default: 'Refined avocado oil' }, stir: { label: 'Poke / move the steak', icon: '👆', disturbs: true }, moisture: { initial: 6, evap: 1.2 } },
      // Choices made before the steak goes in; the judge reads them from state.options.
      options: [
        { id: 'dry', label: 'Before it goes in', default: 'patted', choices: [
          { id: 'patted', label: 'Patted dry', note: 'Paper towel, both sides, then salt. The crust can start almost at once.' },
          { id: 'wet', label: 'Straight from the pack', moisture: 45, note: 'Surface water boils off first — loud spatter, grey steamed surface, crust starts late.' } ] },
        { id: 'target', label: 'Doneness target', default: 'medium',
          choices: [
            { id: 'medium',     label: 'Medium · 145°F',      value: 145, note: 'The USDA consumer minimum for whole cuts, plus a 3-minute rest.' },
            { id: 'mediumWell', label: 'Medium-well · 150°F', value: 150, note: 'A little firmer, still a blush of pink at the centre.' },
            { id: 'well',       label: 'Well done · 160°F',   value: 160, note: 'No pink. The same number as the ground-beef minimum.' }
          ],
          footnote: 'Rare (125°F) and medium-rare (135°F) sit below the USDA consumer guidance, so this recipe does not offer them. The Free Cook sandbox describes those bands.' }
      ],
      ingredients: [
        { id: 'oil',   name: 'Oil (high smoke point)',   icon: '🛢️', addAtStep: 0 },
        { id: 'steak', name: 'Seasoned 1-inch steak',   icon: '🥩', addAtStep: 1 }
      ],
      steps: [
        { id: 's0', title: 'Get the pan HOT + add oil',
          instruction: 'Crank burner to 8-9. Wait for 430°F+. Add a tablespoon of high-smoke-point oil — it should shimmer and just begin to ripple.',
          target: { panTempF: { min: 420, max: 500 }, itemAdded: 'oil' }, completeWhen: 'itemAdded',
          teach: 'A crust is Maillard at speed: it needs a surface well above 300°F and a dry steak. Below 400°F the steak sweats and turns grey.' },
        { id: 's1', title: 'Pat DRY, season, lay it in — then do not touch it',
          instruction: 'Pat the steak dry. Salt both sides. Lay it away from you and leave it alone: 3-4 minutes.',
          target: { itemAdded: 'steak' }, completeWhen: 'itemAdded',
          teach: 'Surface water has to boil off before browning can start. Moving the steak breaks the contact the crust needs.' },
        { id: 's2', title: 'Flip when it releases',
          instruction: 'Lift a corner — if it sticks, wait 20 seconds. When it releases with a deep brown crust, flip. Then 3-4 minutes on side 2.',
          target: { activeTimeSec: { min: 150, max: 330 } }, completeWhen: 'userClick', actionLabel: '🔄 Flip the steak',
          teach: 'The steak lets go of the pan when the crust has formed. Fight it and you leave the crust behind.' },
        { id: 's3', title: 'Read the thermometer — pull 5°F before your target, burner OFF',
          instruction: 'Probe the thickest part from the side. Pull the steak about 5°F before your target; carryover during the rest finishes it. Turn the burner off as you pull it.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'Doneness is a temperature, not a colour or a clock. The USDA minimum for a whole cut is 145°F plus a 3-minute rest.' },
        { id: 's4', title: 'Rest 3 minutes, then slice',
          instruction: 'Onto a board, tented loosely. Three minutes. The internal temperature keeps climbing a few degrees while the juices settle. Then slice across the grain.',
          target: {}, completeWhen: 'userClick', actionLabel: '🔪 Slice + serve',
          teach: 'The rest is part of the cook: it is when carryover finishes the centre and the juices stop running out.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var maxT = state.maxPanTempF || 0; var dn = state.doneness || {}; var addPan = state.itemAddPanF || {};
        var browning = dn.browning || 0; var peakF = Math.round(dn.foodPeakF || 40);
        var opt = optionValue(RECIPES.steak, state.options, 'target'); var target = opt.value;
        var inPanF = addPan.steak != null ? addPan.steak : maxT;
        // 1) Crust: integrated browning while the steak was in the pan
        if (browning >= 24) { score -= 15; notes.push({ neg: true, label: '🔥 Crust burnt', detail: 'Far more surface heat than a crust needs (pan peaked ' + Math.round(maxT) + '°F and stayed there). Black, acrid crust.' }); }
        else if (browning >= 9) { notes.push({ neg: false, label: '✓ Deep crust', detail: 'Pan was ' + Math.round(inPanF) + '°F when the steak went in' + ((dn.stirCount || 0) >= 2 ? ' — the crust re-formed once you stopped moving it.' : ' and it stayed put — steakhouse crust.') }); }
        else if (browning >= 4) { score -= 15; notes.push({ neg: true, label: '🌡️ Light crust', detail: 'Pan was ' + Math.round(inPanF) + '°F when the steak went in; the crust only reached light gold. Hotter, drier, longer on side 1.' }); }
        else { score -= 30; notes.push({ neg: true, label: '🥶 No crust', detail: 'Pan was ' + Math.round(inPanF) + '°F when the steak went in — it sweated and turned grey instead of searing. 430°F+ before the steak touches the pan.' }); }
        // 1a) Surface water
        if ((dn.steamSec || 0) > 30) { score -= 10; notes.push({ neg: true, label: '💧 Wet surface', detail: 'The steak went in wet: ' + Math.round(dn.steamSec) + 's of spatter while the surface water boiled off before the crust could start. Pat it dry, then salt.' }); }
        // 1b) Patience
        if ((dn.stirCount || 0) >= 2) { score -= 10; notes.push({ neg: true, label: '⚠️ Moved during the sear', detail: 'Poked or moved the steak ' + dn.stirCount + ' times. Each move broke pan contact and gave back crust that had formed.' }); }
        else if (addPan.steak != null) { notes.push({ neg: false, label: '✓ Left it alone', detail: 'Uninterrupted contact — the crust had what it needed.' }); }
        // 1c) Oil
        if (dn.oil && (dn.smokeSec || 0) > 8) { score -= 10; notes.push({ neg: true, label: '🌫️ Oil past its smoke point', detail: dn.oil.oil + ' smokes at ' + dn.oil.smokeF + '°F; the pan sat above that for ' + Math.round(dn.smokeSec) + 's with it in. Acrid smoke and a bitter crust.' }); }
        else if (dn.oil && maxT >= 400) { notes.push({ neg: false, label: '✓ Oil matched the heat', detail: dn.oil.oil + ' (smoke point ' + dn.oil.smokeF + '°F) stayed clear at a ' + Math.round(maxT) + '°F peak.' }); }
        // 2) Doneness against the target you chose, with the USDA floor underneath
        if (peakF < 145) { score = Math.min(score, 49); notes.push({ neg: true, label: '☣️ FOOD SAFETY: under 145°F', detail: 'Peak internal ' + peakF + '°F. The USDA consumer minimum for a whole cut is 145°F plus a 3-minute rest. Below that is a restaurant choice, not guidance for a home kitchen — and not this recipe.' }); }
        else if (peakF < target - 3) { score -= 10; notes.push({ neg: true, label: '🌡️ Under your target', detail: 'You chose ' + opt.label + '; the steak peaked at ' + peakF + '°F. Safe, but shy of the band you wanted — another 30-60 seconds.' }); }
        else if (peakF <= target + 7) { notes.push({ neg: false, label: '✓ On target: ' + opt.label.split(' · ')[0], detail: 'Peak internal ' + peakF + '°F for a ' + target + '°F target, carryover included. That is the thermometer doing its job.' }); }
        else if (peakF <= target + 15) { score -= 10; notes.push({ neg: true, label: '🍂 Past your target', detail: 'Peak ' + peakF + '°F against a ' + target + '°F target. Pull 5°F earlier next time; the rest finishes it.' }); }
        else { score -= 20; notes.push({ neg: true, label: '🪵 Well past your target', detail: 'Peak ' + peakF + '°F, ' + (peakF - target) + '°F over. Dry and grey through — the thermometer was there to prevent exactly this.' }); }
        // 3) Rest
        if (state.heatRemovedAt) { notes.push({ neg: false, label: '✓ Rested', detail: 'Off the heat before slicing — the juices stay in the meat.' }); }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = peakF < 145 ? '🚨 Below the USDA minimum for a whole cut. Not this one.' :
                      score >= 90 ? '🥩 Steakhouse. Crust like bark, exactly the centre you asked for.' :
                      score >= 80 ? '👨‍🍳 Very good steak. One thing to tune.' :
                      score >= 70 ? '🥩 Decent steak. The thermometer has notes.' :
                      score >= 60 ? '😬 Steak-adjacent.' :
                      '🚨 A waste of a good cut.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      },
      renderVisual: function(h, state) {
        // The sear visual, with beef colours and the whole-cut safety floor
        return RECIPES.panSeared.renderVisual(h, Object.assign({}, state, { safeF: 145, rawColor: '#b91c1c',
          itemsInPan: (state.itemsInPan || []).map(function(id) { return id === 'steak' ? 'chicken' : id; }) }));
      }
    },

    // ─────────────────────────────────────────────────────
    // CARAMELISED ONIONS (medium) — patience as a technique, 6× sim
    // ─────────────────────────────────────────────────────
    caramelisedOnions: {
      id: 'caramelisedOnions',
      name: 'Caramelised Onions',
      icon: '🧅',
      difficulty: 'medium',
      simSpeedMultiplier: 6,
      targetTimeMin: 35,
      description: 'Patience as a technique. Thirty-plus minutes on medium-low turn sharp onion into sweet jam; rush it and you get burnt edges around raw centres.',
      teaches: ['Low heat over long time', 'Water must leave before colour comes', 'Deglazing lifts the fond', 'Caramelisation and Maillard both at work'],
      // setF/overF both 195: secAboveOverF is the time the onions spent soft (≥195°F), the softness clock.
      doneness: { foodK: 0.004, foodMaxF: 212, setF: 195, overF: 195, browningFrom: 'onion', browningScale: [1.2, 3.5, 10, 18], fat: { item: 'fat', default: 'Extra virgin olive oil' }, stir: { label: 'Stir', icon: '🥄', grace: 240 }, moisture: { initial: 60, evap: 0.9 } },
      visual: 'pieces',
      pieceColors: ['#f5ecd7', '#dca957', '#a5601f', '#4a2a10'],
      ingredients: [
        { id: 'fat',   name: 'Olive oil or butter',        icon: '🫒', addAtStep: 1 },
        { id: 'onion', name: 'Sliced onions (3, thin)',    icon: '🧅', addAtStep: 2 },
        { id: 'water', name: 'Splash of water (deglaze)', icon: '💧', addAtStep: 4, cools: 40 }
      ],
      steps: [
        { id: 's0', title: 'Heat the pan to MEDIUM-LOW',
          instruction: 'Burner to 3-4. About 280-320°F. This is not a sear.',
          target: { panTempF: { min: 270, max: 330 } }, completeWhen: 'panInRange',
          teach: 'Onions are mostly water and sugar. Low heat lets the water leave slowly and the sugars brown without charring. High heat chars the edges while the centres are still raw.' },
        { id: 's1', title: 'Add the fat',
          instruction: 'Two tablespoons of olive oil, or butter if you hold the dial at 3 — butter smokes above 302°F.',
          target: { itemAdded: 'fat' }, completeWhen: 'itemAdded',
          teach: 'Fat spreads the heat and carries the onions\' flavour compounds. Which fat is a smoke-point decision as much as a flavour one.' },
        { id: 's2', title: 'Add the onions — a big pile',
          instruction: 'All of them. The pile will look absurd. It steams first, shrinks by two-thirds, and only then starts to colour.',
          target: { itemAdded: 'onion' }, completeWhen: 'itemAdded',
          teach: 'For the first ten minutes nothing browns: the water is leaving. Colour is impossible until it has gone.' },
        { id: 's3', title: 'Cook low + slow — stir every few minutes',
          instruction: 'Stir when the caption asks. Deep gold and jammy usually takes 25-35 minutes. If they colour fast and unevenly, the heat is too high.',
          target: { activeTimeSec: { min: 1500, max: 2700 } }, completeWhen: 'userClick', actionLabel: '✓ They look done — move on',
          teach: 'Two reactions overlap here: caramelisation (sugar alone, from ~320°F) and Maillard (sugar + amino acids). Both want time. Neither wants a rush.' },
        { id: 's4', title: 'Deglaze with a splash of water',
          instruction: 'A tablespoon or two of water into the pan. Scrape the brown film (the fond) back into the onions.',
          target: { itemAdded: 'water' }, completeWhen: 'itemAdded',
          teach: 'The fond is caramelised sugar stuck to the pan — flavour you would otherwise leave behind. Water lifts it, and cools the pan a little.' },
        { id: 's5', title: 'Off the heat',
          instruction: 'Turn the burner off. Taste: sweet, soft, no sharpness.',
          target: { burnerLevel: 0 }, completeWhen: 'heatRemoved',
          teach: 'They keep for a week. Onto burgers, into soup, under cheese on toast.' }
      ],
      judge: function(state) {
        var notes = []; var score = 100;
        var dn = state.doneness || {}; var maxT = state.maxPanTempF || 0; var t = state.activeTimeSec || 0; var addT = state.itemAddTimes || {};
        var browning = dn.browning || 0; var softSec = dn.secAboveOverF || 0;
        var scale = RECIPES.caramelisedOnions.doneness.browningScale;
        // 1) Colour
        if (browning >= scale[3]) { score -= 25; notes.push({ neg: true, label: '🔥 Burnt', detail: 'Browning ' + browning.toFixed(1) + ' — past caramel into bitter char. Pan peaked ' + Math.round(maxT) + '°F.' }); }
        else if (browning >= scale[2]) { score -= 5; notes.push({ neg: true, label: '🟤 Deep, edging bitter', detail: 'Browning ' + browning.toFixed(1) + '. Very dark; a notch lower on the dial keeps it sweet.' }); }
        else if (browning >= scale[1]) { notes.push({ neg: false, label: '✓ Golden + jammy', detail: 'Browning ' + browning.toFixed(1) + ' after ' + Math.round(t / 60) + ' minutes — the colour of sweetness.' }); }
        else if (browning >= scale[0]) { score -= 10; notes.push({ neg: true, label: '🟡 Only just coloured', detail: 'Browning ' + browning.toFixed(1) + ' — sweet-ish, still sharp. Another ten minutes.' }); }
        else { score -= 20; notes.push({ neg: true, label: '🥶 Not caramelised', detail: 'Browning ' + browning.toFixed(1) + ' after ' + Math.round(t / 60) + ' minutes with a ' + Math.round(maxT) + '°F peak. The water left but colour never came — a touch more heat, or more time.' }); }
        // 2) Softness: time spent at or above 195°F
        if (softSec >= 900) { notes.push({ neg: false, label: '✓ Soft through', detail: Math.round(softSec / 60) + ' minutes soft and hot — no bite left, all sweetness.' }); }
        else if (softSec >= 300) { score -= 10; notes.push({ neg: true, label: '🧅 Still some bite', detail: 'Only ' + Math.round(softSec / 60) + ' minutes soft and hot. Give them longer before you look for colour.' }); }
        else { score -= 15; notes.push({ neg: true, label: '🧅 Firm centres', detail: Math.round(softSec / 60) + ' minutes soft and hot is not enough — the centres are still crunchy and sharp.' }); }
        // 3) Heat as the cause, when colour outran softness
        if (maxT >= 400 && browning >= scale[2]) { score -= 10; notes.push({ neg: true, label: '🔥 Too hot for this job', detail: 'Pan peaked ' + Math.round(maxT) + '°F. Edges charred before the centres could soften — this dish is 280-320°F.' }); }
        // 4) Stirring
        if ((dn.unattendedSec || 0) > 300) { score -= 10; notes.push({ neg: true, label: '⚠️ Stuck + scorched', detail: Math.round((dn.unattendedSec || 0) / 60) + ' minutes in total without a stir — sugars caught on the pan floor and went bitter.' }); }
        else if ((dn.stirCount || 0) >= 4) { notes.push({ neg: false, label: '✓ Stirred through', detail: dn.stirCount + ' stirs over the cook — even colour, nothing caught.' }); }
        // 5) Deglaze
        if (addT.water) { notes.push({ neg: false, label: '✓ Fond lifted', detail: 'The water pulled the caramel off the pan and back into the onions.' }); }
        else { score -= 5; notes.push({ neg: true, label: '💧 Fond left in the pan', detail: 'The brown film on the pan was flavour. A splash of water would have lifted it.' }); }
        // 6) Oil
        if (dn.oil && (dn.smokeSec || 0) > 8) { score -= 10; notes.push({ neg: true, label: '🌫️ Fat past its smoke point', detail: dn.oil.oil + ' smokes at ' + dn.oil.smokeF + '°F; the pan sat above that for ' + Math.round(dn.smokeSec) + 's. Bitter, acrid — for this heat, olive oil or clarified butter.' }); }
        score = Math.max(0, Math.min(100, score));
        var grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        var verdict = score >= 90 ? '🧅 Onion jam. Sweet, soft, deep — the patience shows.' :
                      score >= 80 ? '👨‍🍳 Good caramelised onions. Nearly there.' :
                      score >= 70 ? '🧅 Cooked onions with ambitions.' :
                      score >= 60 ? '😬 Fried onions, technically.' :
                      '🚨 Either raw or burnt. Possibly both.';
        return { score: score, grade: grade, verdict: verdict, notes: notes };
      }
    },

    // ─────────────────────────────────────────────────────
    // FREE COOK (sandbox) — no steps, no grade. The student picks a pan,
    // an oil and a food, cooks it their way, and reads what happened in the
    // same terms the graded recipes use. Doneness config comes from the food
    // (see SANDBOX_FOODS + recipeDoneness).
    // ─────────────────────────────────────────────────────
    freeCook: {
      id: 'freeCook',
      name: 'Free Cook',
      icon: '🧪',
      difficulty: 'sandbox',
      sandbox: true,
      targetTimeMin: 10,
      description: 'No steps, no grade. Pick a pan, an oil and a food, cook it your way, and read what happened.',
      teaches: ['Reading the pan', 'Cause and effect', 'Your own experiments'],
      ingredients: [],   // filled from the chosen food — see recipeIngredients()
      steps: [
        { id: 's0', title: 'Cook it your way',
          instruction: 'There are no steps here. Heat the pan, add the fat and the food when you choose, stir it or leave it, pull it when you think it is right. Then press Finish to read what you made.',
          target: {}, completeWhen: 'userClick',
          teach: 'Everything the graded recipes score is on screen: pan temperature, food internal temperature, surface colour, the sound of the pan and the trace. Change one thing at a time and watch what moves.' }
      ],
      judge: function(state, fullState) {
        var food = sandboxFood(fullState && fullState.sandboxFood);
        var fd = food.doneness;
        var dn = state.doneness || {};
        var addPan = state.itemAddPanF || {};
        var maxT = Math.round(state.maxPanTempF || 0);
        var metF = addPan[food.id] != null ? addPan[food.id] : maxT;
        var browning = dn.browning || 0, peakF = Math.round(dn.foodPeakF || 40), overSec = Math.round(dn.secAboveOverF || 0);
        var bl = browningLabel(browning, fd.browningScale);
        var notes = [];
        var inPan = addPan[food.id] != null;
        if (!inPan) {
          notes.push({ neutral: true, label: '🧺 Nothing cooked', detail: 'The ' + food.name.toLowerCase() + ' never went into the pan. Pan peaked at ' + maxT + '°F.' });
        } else {
          notes.push({ neg: bl.idx >= 4, neutral: bl.idx < 4, label: '🎨 Surface: ' + bl.label,
            detail: 'Browning ' + browning.toFixed(2) + ' on a scale where ' + fd.browningScale[1] + ' is golden and ' + fd.browningScale[3] + ' is burnt. The ' + food.name.toLowerCase() + ' met a ' + Math.round(metF) + '°F pan; it peaked at ' + maxT + '°F.' });
          var interior = peakF < fd.setF ? 'not set — reached ' + peakF + '°F, sets from ' + fd.setF + '°F'
            : food.wet ? 'cooked through at ' + peakF + '°F' + (overSec > 0 ? '; its water boiled off (' + overSec + 's at the boil), which is when browning starts' : '')
            : overSec > 0 ? 'set, then ' + overSec + 's past ' + fd.overF + '°F (drying out)'
            : 'set at ' + peakF + '°F, never past ' + fd.overF + '°F';
          var interiorBad = (!food.wet && overSec > 60) || (food.safeF && peakF < food.safeF);
          notes.push({ neg: !!interiorBad, neutral: !interiorBad, label: '🌡️ Interior: ' + interior.split(' — ')[0].split(',')[0].split(';')[0],
            detail: 'Internal temperature ' + interior + '. Time in the pan ' + klClock(state.activeTimeSec || 0) + '.' + (food.safeF ? (peakF >= food.safeF ? ' Verified at or above the USDA ' + food.safeF + '°F minimum.' : ' Below the USDA ' + food.safeF + '°F minimum — not safe to serve.') : '') });
          if (fd.stir && fd.stir.disturbs) {
            notes.push({ neutral: true, label: '👆 Attention: moved ' + (dn.stirCount || 0) + '×', detail: (dn.stirCount || 0) >= 2 ? 'Each move broke pan contact and gave back some crust.' : 'Left to sear — the crust had uninterrupted contact.' });
          } else if (fd.stir) {
            notes.push({ neg: (dn.unattendedSec || 0) > 30, neutral: (dn.unattendedSec || 0) <= 30, label: '🥄 Attention: ' + (dn.stirCount || 0) + ' stirs, ' + Math.round(dn.unattendedSec || 0) + 's unattended',
              detail: (dn.unattendedSec || 0) > 30 ? 'Unattended food browns 1.7× faster and catches on the bottom.' : 'The pan was kept moving; browning stayed even.' });
          }
          if (fd.moisture) {
            notes.push({ neutral: true, label: '💧 Surface water: ' + ((dn.steamSec || 0) > 5 ? Math.round(dn.steamSec) + 's steaming' : 'gone almost at once'),
              detail: (dn.steamSec || 0) > 5 ? 'The surface stayed wet for ' + Math.round(dn.steamSec) + 's; browning was held to a trickle until it dried.' + ((dn.moistureAtEnd || 0) > 10 ? ' It was still wet at the end.' : '') : 'Little surface water to boil off, so browning could start straight away.' });
          }
          if (dn.oil) {
            notes.push({ neg: (dn.smokeSec || 0) > 8, neutral: (dn.smokeSec || 0) <= 8, label: '🛢️ Oil: ' + dn.oil.oil,
              detail: 'Smoke point ' + dn.oil.smokeF + '°F. ' + ((dn.smokeSec || 0) > 8 ? 'The pan sat above it for ' + Math.round(dn.smokeSec) + 's with the oil in — acrid smoke and broken-down fat.' : 'It stayed below its smoke point the whole cook.') });
          }
        }
        notes.push({ neutral: true, label: '🍳 Pan: ' + panMaterial(state.panMaterial).name, detail: panMaterial(state.panMaterial).note });
        return { score: null, grade: null, sandbox: true, verdict: 'Reference for ' + food.name.toLowerCase() + ': ' + food.guide, notes: notes };
      }
    }
  };

  // Foods the Free Cook sandbox offers. Each carries the doneness config a
  // graded recipe would, plus the reference line the readout quotes.
  var SANDBOX_FOODS = [
    { id: 'eggs', name: 'Whisked eggs', icon: '🥚', fatItem: 'butter', fatName: 'Butter (1 tbsp)', fatIcon: '🧈', visual: 'eggs',
      doneness: { foodK: 0.014, foodMaxF: 212, setF: 145, overF: 175, browningFrom: 'eggs', browningScale: [0.12, 0.3, 0.5, 0.8], stir: { label: 'Stir + fold', icon: '🥄', grace: 15 } },
      guide: 'set from about 145°F, dry past 175°F; any colour is too much for a soft scramble.' },
    { id: 'chicken', name: 'Chicken breast', icon: '🍗', fatItem: 'oil', fatName: 'Oil', fatIcon: '🛢️', visual: 'sear', safeF: 165,
      doneness: { foodK: 0.0007, foodMaxF: 212, setF: 165, overF: 175, browningFrom: 'chicken', browningScale: [1, 4, 9, 24], fat: { item: 'oil', default: 'Refined avocado oil' }, stir: { label: 'Poke / move the chicken', icon: '👆', disturbs: true }, moisture: { initial: 6, evap: 1.2 } },
      guide: 'safe at a measured 165°F, dry past 175°F; a deep crust needs a 400°F+ pan and patience.' },
    { id: 'steak', name: 'Steak (1 in.)', icon: '🥩', fatItem: 'oil', fatName: 'Oil', fatIcon: '🛢️', visual: 'sear', safeF: 145,
      doneness: { foodK: 0.0006, foodMaxF: 212, setF: 145, overF: 160, browningFrom: 'steak', browningScale: [1, 4, 9, 24], fat: { item: 'oil', default: 'Refined avocado oil' }, stir: { label: 'Poke / move the steak', icon: '👆', disturbs: true }, moisture: { initial: 6, evap: 1.2 } },
      guide: 'USDA minimum 145°F for a whole cut plus a 3-minute rest; 125°F rare, 135°F medium-rare, 145°F medium, 160°F well-done. Crust needs a very hot, dry pan.' },
    { id: 'mushrooms', name: 'Sliced mushrooms', icon: '🍄', fatItem: 'oil', fatName: 'Oil', fatIcon: '🛢️', visual: 'pieces', wet: true, pieceColors: ['#e7d8c3', '#b8864e', '#7a4a1e', '#3b2412'],
      doneness: { foodK: 0.01, foodMaxF: 212, setF: 160, overF: 205, browningFrom: 'mushrooms', browningScale: [0.7, 2.0, 5, 10], fat: { item: 'oil', default: 'Refined avocado oil' }, stir: { label: 'Toss', icon: '🥢', grace: 20 }, moisture: { initial: 30, evap: 1.2 } },
      guide: 'mostly water — they steam until the surface dries, then brown fast. Space and heat matter more than time.' },
    { id: 'onion', name: 'Sliced onion', icon: '🧅', fatItem: 'oil', fatName: 'Olive oil or butter', fatIcon: '🫒', visual: 'pieces', wet: true, pieceColors: ['#f5ecd7', '#dca957', '#a5601f', '#4a2a10'],
      doneness: { foodK: 0.01, foodMaxF: 212, setF: 150, overF: 205, browningFrom: 'onion', browningScale: [1.2, 3.5, 10, 18], fat: { item: 'oil', default: 'Extra virgin olive oil' }, stir: { label: 'Stir', icon: '🥄', grace: 40 }, moisture: { initial: 45, evap: 0.9 } },
      guide: 'sweetness comes from time at medium heat; high heat gives burnt edges before the centres soften.' }
  ];
  function sandboxFood(id) {
    return SANDBOX_FOODS.find(function(f) { return f.id === id; }) || SANDBOX_FOODS[0];
  }
  // A recipe's doneness config; the sandbox takes it from the chosen food.
  function recipeDoneness(rec, state) {
    if (rec && rec.sandbox) return sandboxFood(state && state.sandboxFood).doneness;
    return (rec && rec.doneness) || {};
  }
  // A recipe's ingredient tray; the sandbox builds it from the chosen food.
  function recipeIngredients(rec, state) {
    if (rec && rec.sandbox) {
      var f = sandboxFood(state && state.sandboxFood);
      return [{ id: f.fatItem, name: f.fatName, icon: f.fatIcon }, { id: f.id, name: f.name, icon: f.icon }];
    }
    return (rec && rec.ingredients) || [];
  }
  // The oil in play for a recipe with a fat choice, from SMOKE_POINTS.
  function oilFor(rec, state) {
    var fat = recipeDoneness(rec, state).fat;
    if (!fat) return null;
    var name = (state && state.recipeOil) || fat.default;
    return SMOKE_POINTS.find(function(o) { return o.oil === name; }) || SMOKE_POINTS.find(function(o) { return o.oil === fat.default; }) || null;
  }
  // Instant micro-cook for the Heat & Technique tab: `seconds` in a pan held
  // at panF, stirred every 10 s, in the food's default fat. Same physics as the
  // recipe tick (advanceDoneness), run in one go so the slider gives an answer.
  var HEAT_MICRO_SEC = { saute: 300, sear: 180, simmer: 300, boil: 300, braise: 600, roast: 600, steam: 300, fry: 180 };
  var HEAT_DEFAULT_FOOD = { saute: 'mushrooms', sear: 'steak', simmer: 'onion', boil: 'onion', braise: 'chicken', roast: 'chicken', steam: 'mushrooms', fry: 'chicken' };
  function microCook(food, panF, seconds) {
    var rec = { doneness: food.doneness };
    var fatItem = (food.doneness.fat && food.doneness.fat.item) || food.fatItem;
    var s = { recipeItemsInPan: [fatItem, food.id], recipeBurnerLevel: 5, recipeFoodInternalF: 40, recipeFoodPeakF: 40, recipeBrowning: 0,
      recipeSecAboveOverF: 0, recipeFoodSetAt: null, recipeUnattendedSec: 0, recipeSmokeSec: 0, recipeSimElapsedSec: 0, recipeLastStirSimSec: 0, recipeSteamSec: 0 };
    s.recipeMoisture = initialMoisture(rec, s);   // the food brings its surface water
    var dt = 0.5, t = 0, now = 0;
    while (t < seconds - 1e-9) {
      Object.assign(s, advanceDoneness(s, rec, panF, dt, now));
      t += dt; now += 500; s.recipeSimElapsedSec = t;
      if (Math.round(t * 2) % 20 === 0) s.recipeLastStirSimSec = t;
    }
    var oil = oilFor(rec, s);
    return { panF: panF, seconds: seconds, browning: s.recipeBrowning, label: browningLabel(s.recipeBrowning, food.doneness.browningScale),
      foodEndF: s.recipeFoodInternalF, set: !!s.recipeFoodSetAt, smokeSec: s.recipeSmokeSec, oil: oil, steamSec: s.recipeSteamSec,
      sizzle: klSizzleLevel(panF, true, s.recipeFoodInternalF, s.recipeMoisture) };
  }
  // The chosen value of a recipe option (rec.options), or its default.
  function optionValue(rec, options, id) {
    var opt = (rec && rec.options || []).find(function(o) { return o.id === id; });
    if (!opt) return null;
    var chosen = (options || {})[id] || opt.default;
    return opt.choices.find(function(c) { return c.id === chosen; }) || opt.choices.find(function(c) { return c.id === opt.default; }) || opt.choices[0];
  }
  // Surface moisture. rec.doneness.moisture = { initial, evap } is the water on
  // the main ingredient's surface when it goes in; an option choice can carry
  // its own `moisture` (straight from the pack) and `evapFactor` (a crowded pan
  // traps steam). This is the Recipe Kitchen's model brought across: water
  // must leave before colour can come.
  function moistureChoice(rec, options) {
    var found = null;
    (rec && rec.options || []).forEach(function(opt) {
      var c = optionValue(rec, options, opt.id);
      if (c && (c.moisture != null || c.evapFactor != null)) found = c;
    });
    return found;
  }
  function initialMoisture(rec, state) {
    var dn = recipeDoneness(rec, state);
    if (!dn.moisture) return 0;
    var c = moistureChoice(rec, state && state.recipeOptions);
    return c && c.moisture != null ? c.moisture : dn.moisture.initial;
  }
  function evapFactor(rec, state) {
    var c = moistureChoice(rec, state && state.recipeOptions);
    return c && c.evapFactor != null ? c.evapFactor : 1;
  }
  // Word + swatch for a browning value on a dish's own scale
  // [first colour, golden, deep brown, burnt].
  function browningLabel(browning, scale) {
    scale = scale || [1, 4, 9, 24];
    var idx = browning < scale[0] ? 0 : browning < scale[1] ? 1 : browning < scale[2] ? 2 : browning < scale[3] ? 3 : 4;
    return { idx: idx,
      label: ['pale', 'first colour', 'golden', 'deep brown', 'burnt'][idx],
      color: ['#fef3c7', '#fbbf24', '#d97706', '#92400e', '#1c1410'][idx] };
  }

  // ───────────────────────────────────────────────────────────
  // RECIPE CATALOG (for the picker — includes locked future recipes)
  // ───────────────────────────────────────────────────────────
  var RECIPE_CATALOG = [
    { id: 'scrambledEggs', name: 'Scrambled Eggs',       icon: '🍳', difficulty: 'easy',   unlocked: true,  blurb: 'Master the basics: low heat, constant motion, carryover.' },
    { id: 'omelet',        name: 'French Omelet',        icon: '🥚', difficulty: 'medium', unlocked: true,  blurb: 'Same eggs, faster + hotter. Smooth pale finish, soft inside, classic roll.' },
    { id: 'pancakes',      name: 'Pancakes',             icon: '🥞', difficulty: 'easy',   unlocked: true,  blurb: 'One pancake, one flip. Read the bubbles and the dry edges; the first side tells you if the pan was right.' },
    { id: 'stirFry',       name: 'Vegetable Stir-Fry',   icon: '🥦', difficulty: 'medium', unlocked: true,  blurb: 'Wok hei — very high heat, ingredient ordering, fast hands. The most heat you\'ve used yet.' },
    { id: 'panSeared',     name: 'Pan-Seared Chicken',   icon: '🍗', difficulty: 'medium', unlocked: true,  blurb: 'Maillard mastery + internal temp + carryover. Uses a meat thermometer for the first time.' },
    { id: 'steak',         name: 'Pan-Seared Steak',     icon: '🥩', difficulty: 'medium', unlocked: true,  blurb: 'Pick your doneness target, build a crust, let the thermometer decide. USDA 145°F floor, 3-minute rest.' },
    { id: 'sheetPan',      name: 'Sheet-Pan Roasted Veg', icon: '🥘', difficulty: 'medium', unlocked: true,  blurb: 'Your first oven recipe. Preheat discipline, don\'t crowd the pan, the halfway flip.' },
    { id: 'roastChicken',  name: 'Whole Roast Chicken',  icon: '🍗', difficulty: 'hard',   unlocked: true,  blurb: 'The classic family dinner. Two-stage temperature, internal temp, mandatory rest.' },
    { id: 'pastaSauce',    name: 'Pasta + Pan Sauce',    icon: '🍝', difficulty: 'medium', unlocked: true,  blurb: 'Multi-pot challenge. Pot boils + cooks pasta on its own timer while you build the sauce. Pasta water is the secret weapon.' },
    { id: 'caramelisedOnions', name: 'Caramelised Onions', icon: '🧅', difficulty: 'medium', unlocked: true, blurb: 'Thirty-five minutes on medium-low (6× sim). Water leaves, then colour comes. Deglaze at the end.' }
  ];

  // ───────────────────────────────────────────────────────────
  // COMPETITION MODE — Chopped-style challenges
  // ───────────────────────────────────────────────────────────
  // Each constraint has a check() that takes the final cook state
  // and returns { passed: bool, bonus: number, penalty: number,
  // resultText: string }. The competition judge sums these with
  // the base recipe score.
  var COMPETITION_CONSTRAINTS = [
    {
      id: 'speedDemon',
      label: '⚡ Speed Demon',
      description: 'Finish the recipe in 60% of normal time.',
      bonus: 25, penalty: -20,
      timeLimitFrac: 0.6,
      check: function(state, rec) {
        var elapsed = state.elapsedSec || 0;
        var limit = rec.targetTimeMin * 60 * 0.6;
        var passed = elapsed <= limit;
        return { passed: passed, value: Math.round(elapsed),
          resultText: passed
            ? 'Finished in ' + Math.round(elapsed) + 's (limit ' + Math.round(limit) + 's). +25 bonus.'
            : 'Took ' + Math.round(elapsed) + 's, limit was ' + Math.round(limit) + 's. -20 penalty.' };
      }
    },
    {
      id: 'coldHandsHotPan',
      label: '🔥 Cold Hands, Hot Pan',
      description: 'Pan must hit at least 400°F at some point during the cook.',
      bonus: 15, penalty: -15,
      check: function(state) {
        var passed = (state.maxPanTempF || 0) >= 400;
        return { passed: passed, value: Math.round(state.maxPanTempF || 0),
          resultText: passed
            ? 'Pan peaked at ' + Math.round(state.maxPanTempF) + '°F. Maillard mastery. +15 bonus.'
            : 'Pan only reached ' + Math.round(state.maxPanTempF || 0) + '°F — needed 400°F. -15 penalty.' };
      }
    },
    {
      id: 'noBurn',
      label: '🛡️ Restraint Master',
      description: 'Pan must NEVER exceed 380°F. Stay disciplined.',
      bonus: 20, penalty: -10,
      check: function(state) {
        var passed = (state.maxPanTempF || 0) <= 380;
        return { passed: passed, value: Math.round(state.maxPanTempF || 0),
          resultText: passed
            ? 'Max pan temp ' + Math.round(state.maxPanTempF) + '°F — held the line. +20 bonus.'
            : 'Pan hit ' + Math.round(state.maxPanTempF) + '°F at peak (cap 380°F). -10 penalty.' };
      }
    },
    {
      id: 'minimalist',
      label: '🥢 Minimalist',
      description: 'Use only 2 burner-level changes total. No fiddling.',
      bonus: 20, penalty: -10,
      check: function(state) {
        var changes = state.burnerChanges || 0;
        var passed = changes <= 2;
        return { passed: passed, value: changes,
          resultText: passed
            ? Math.round(changes) + ' burner adjustments. Disciplined hands. +20 bonus.'
            : Math.round(changes) + ' burner adjustments — limit was 2. Tinkering hurts you. -10 penalty.' };
      }
    },
    {
      id: 'gradeA',
      label: '🌟 Restaurant Standard',
      description: 'Base recipe score must be at least 85 — no shortcuts.',
      bonus: 30, penalty: -25,
      check: function(state) {
        var baseScore = state.baseScore || 0;
        var passed = baseScore >= 85;
        return { passed: passed, value: baseScore,
          resultText: passed
            ? 'Base score ' + baseScore + ' — restaurant-ready. +30 bonus.'
            : 'Base score ' + baseScore + ', needed 85+. -25 penalty.' };
      }
    },
    {
      id: 'efficient',
      label: '🌱 Heat Efficient',
      description: 'Average burner level must be 5 or lower. Energy conservation.',
      bonus: 15, penalty: -10,
      check: function(state) {
        var avg = state.avgBurnerLevel || 0;
        var passed = avg <= 5;
        return { passed: passed, value: avg.toFixed(1),
          resultText: passed
            ? 'Average burner ' + avg.toFixed(1) + '/10 — low + slow. +15 bonus.'
            : 'Average burner ' + avg.toFixed(1) + '/10 (max 5). Cranked too high. -10 penalty.' };
      }
    },
    {
      id: 'oneShot',
      label: '🎯 One Shot',
      description: 'Don\'t abandon mid-cook. Complete the recipe on the first attempt.',
      bonus: 10, penalty: -30,
      check: function() { return { passed: true, value: 1, resultText: 'You stayed in the kitchen. +10 bonus.' }; }
    },
    {
      id: 'misePlace',
      label: '🗂️ Mise en Place',
      description: 'All ingredients added in the first 50% of cook time. No last-minute scrambling.',
      bonus: 20, penalty: -10,
      check: function(state, rec) {
        var elapsed = state.elapsedSec || 0;
        var halfMark = (rec.targetTimeMin * 60 * 0.5) / (rec.simSpeedMultiplier || 1);
        var addTimes = Object.values(state.itemAddTimes || {});
        var startedAt = state.startedAt || (Date.now() - elapsed * 1000);
        var lateAdds = addTimes.filter(function(t) { return (t - startedAt) / 1000 > halfMark; });
        var passed = lateAdds.length === 0 && addTimes.length > 0;
        return { passed: passed, value: lateAdds.length,
          resultText: passed
            ? 'Every ingredient prepped + added in the first half. Pro move. +20 bonus.'
            : lateAdds.length + ' ingredient(s) added past the halfway mark. -10 penalty.' };
      }
    },
    {
      id: 'twoStepHeat',
      label: '🌡️ Two-Step Heat',
      description: 'Start the burner ≥6, then transition to ≤5 at some point. The classic "high sear → low finish" move.',
      bonus: 18, penalty: -10,
      check: function(state) {
        var passed = !!state.twoStepHeatAchieved;
        return { passed: passed, value: passed ? 1 : 0,
          resultText: passed
            ? 'Started hot, dropped to finish. Pro technique. +18 bonus.'
            : 'No high → low transition. -10 penalty.' };
      }
    },
    {
      id: 'noSweat',
      label: '🥵 No Sweat',
      description: 'Pan never dips below 200°F once food is in. Maintain working heat.',
      bonus: 15, penalty: -8,
      check: function(state) {
        var passed = !state.coldDipAfterFood;
        return { passed: passed, value: passed ? 0 : 1,
          resultText: passed
            ? 'Pan held its heat — never dropped below 200°F with food in. +15 bonus.'
            : 'Pan dropped below 200°F with food in (lost momentum). -8 penalty.' };
      }
    }
  ];

  // Pick 2 random constraints — one easier, one harder
  // Constraints that read the doneness state (Tier 2+): surface water, smoke,
  // stir cadence, thermometer discipline.
  COMPETITION_CONSTRAINTS.push(
    {
      id: 'drySurface',
      label: '💧 Dry Surface',
      description: 'No more than 20 seconds of steaming: pat it dry, do not crowd the pan.',
      bonus: 15, penalty: -10,
      check: function(state) {
        var s = (state.doneness && state.doneness.steamSec) || 0; var passed = s <= 20;
        return { passed: passed, value: Math.round(s), resultText: passed ? 'Surface steamed for ' + Math.round(s) + 's — dry enough to brown from the start. +15 bonus.' : Math.round(s) + 's of steaming before browning could begin. -10 penalty.' };
      }
    },
    {
      id: 'clearAir',
      label: '🌫️ Clear Air',
      description: 'The fat never passes its smoke point (recipes with an oil choice).',
      bonus: 10, penalty: -15,
      check: function(state) {
        var dn = state.doneness || {}; if (!dn.oil) return { passed: true, value: 0, resultText: 'No oil in this recipe — automatic pass.' };
        var s = dn.smokeSec || 0; var passed = s <= 2;
        return { passed: passed, value: Math.round(s), resultText: passed ? dn.oil.oil + ' stayed under its ' + dn.oil.smokeF + '°F smoke point. +10 bonus.' : dn.oil.oil + ' smoked for ' + Math.round(s) + 's. -15 penalty.' };
      }
    },
    {
      id: 'attentive',
      label: '🥄 Attentive Cook',
      description: 'Never more than 15 seconds unattended in a hot pan (recipes that need stirring).',
      bonus: 15, penalty: -10,
      check: function(state, rec) {
        var dn = state.doneness || {}; var stir = rec && rec.doneness && rec.doneness.stir;
        if (!stir || stir.disturbs) return { passed: true, value: 0, resultText: 'This recipe is not stirred — automatic pass.' };
        var u = dn.unattendedSec || 0; var passed = u <= 15;
        return { passed: passed, value: Math.round(u), resultText: passed ? 'Only ' + Math.round(u) + 's unattended. +15 bonus.' : Math.round(u) + 's unattended in total. -10 penalty.' };
      }
    },
    {
      id: 'thermometerTruth',
      label: '🌡️ Thermometer Truth',
      description: 'Pull the food within 8°F above its set point (recipes with an internal target).',
      bonus: 20, penalty: -10,
      check: function(state, rec) {
        var dn = state.doneness || {}; var setF = rec && rec.doneness && rec.doneness.setF;
        if (!setF || !(rec.doneness.foodK < 0.005)) return { passed: true, value: 0, resultText: 'No thermometer target in this recipe — automatic pass.' };
        var peak = Math.round(dn.foodPeakF || 40); var passed = peak >= setF && peak <= setF + 8;
        return { passed: passed, value: peak, resultText: passed ? 'Peak ' + peak + '°F against a ' + setF + '°F set point — pulled on the number. +20 bonus.' : 'Peak ' + peak + '°F against a ' + setF + '°F set point. -10 penalty.' };
      }
    }
  );
  function rollCompetitionConstraints() {
    var pool = COMPETITION_CONSTRAINTS.slice();
    // Shuffle
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, 2);
  }

  // ───────────────────────────────────────────────────────────
  // ACHIEVEMENTS — unlockable badges (the picker counts ACHIEVEMENTS.length)
  // ───────────────────────────────────────────────────────────
  // Each has check(state, ctx) returning true if conditions met.
  // ctx provides: { recipe, judgement, compResult, isCompetition, isTournament, tournamentResult }
  // Achievements unlock on the results screen after a successful judge run.
  var ACHIEVEMENTS = [
    { id: 'firstCook', name: 'First Cook', icon: '🍳', tier: 'bronze',
      description: 'Complete any recipe.',
      check: function(s, c) { return !!c.judgement; } },
    { id: 'aGrade', name: 'A-Grade Student', icon: '🌟', tier: 'silver',
      description: 'Score an A grade on any recipe.',
      check: function(s, c) { return c.judgement && c.judgement.grade === 'A'; } },
    { id: 'masterChef', name: 'Master Chef', icon: '👨‍🍳', tier: 'gold',
      description: 'Score an A on every recipe in the list.',
      check: function(s, c) { var ids = s.aGradedRecipeIds || []; return RECIPE_CATALOG.filter(function(r) { return r.unlocked; }).every(function(r) { return ids.indexOf(r.id) !== -1; }); } },
    { id: 'competitionDebut', name: 'Competition Debut', icon: '🎲', tier: 'bronze',
      description: 'Complete one competition.',
      check: function(s, c) { return c.isCompetition; } },
    { id: 'highRoller', name: 'High Roller', icon: '🔥', tier: 'silver',
      description: 'Score 130+ in a single competition.',
      check: function(s, c) { return c.compResult && c.compResult.finalScore >= 130; } },
    { id: 'perfectScore', name: 'Perfect Score', icon: '💯', tier: 'gold',
      description: 'Score 150 (max) in a single competition.',
      check: function(s, c) { return c.compResult && c.compResult.finalScore >= 150; } },
    { id: 'tournamentDebut', name: 'Tournament Debut', icon: '🏅', tier: 'silver',
      description: 'Complete a 3-round tournament.',
      check: function(s, c) { return c.isTournament; } },
    { id: 'tournamentGold', name: 'Tournament Gold', icon: '🥇', tier: 'gold',
      description: 'Earn a Gold medal (400+ points) in a tournament.',
      check: function(s, c) { return c.tournamentResult && c.tournamentResult.total >= 400; } },
    { id: 'maillardMaster', name: 'Maillard Master', icon: '🥩', tier: 'silver',
      description: 'Score A on Pan-Seared Chicken.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'panSeared' && c.judgement.grade === 'A'; } },
    { id: 'wokHei', name: 'Wok Hei', icon: '🥦', tier: 'silver',
      description: 'Pan reaches 450°F+ during a Stir-Fry.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'stirFry' && (s.recipeMaxPanTempF || 0) >= 450; } },
    { id: 'carryoverKing', name: 'Carryover King', icon: '🍗', tier: 'silver',
      description: 'Pan-seared chicken: A grade with the thermometer at 165-168°F — verified safe, not a degree wasted.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'panSeared' && c.judgement.grade === 'A' && (s.recipeFoodInternalF || 0) >= 165 && (s.recipeFoodInternalF || 0) < 169; } },
    { id: 'patientCook', name: 'Patient Cook', icon: '⏳', tier: 'bronze',
      description: 'Fully preheat the oven before adding food (sheet-pan).',
      check: function(s, c) { return c.recipe && c.recipe.id === 'sheetPan' && (s.recipeMaxPanTempF || 0) >= 400; } },
    { id: 'pastaWaterSaved', name: 'Pasta Water Saved', icon: '💧', tier: 'silver',
      description: 'Reserve pasta water in Pasta + Pan Sauce.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'pastaSauce' && s.potWaterReserved; } },
    { id: 'speedDemonBadge', name: 'Speed Demon', icon: '⚡', tier: 'silver',
      description: 'Pass the Speed Demon constraint in competition.',
      check: function(s, c) { return c.compResult && (c.compResult.constraints || []).some(function(x) { return x.id === 'speedDemon' && x.passed; }); } },
    { id: 'noBurnBadge', name: 'Iron Discipline', icon: '🛡️', tier: 'silver',
      description: 'Pass the Restraint Master constraint (no temp above 380°F).',
      check: function(s, c) { return c.compResult && (c.compResult.constraints || []).some(function(x) { return x.id === 'noBurn' && x.passed; }); } },
    { id: 'oneShotBadge', name: 'One Shot', icon: '🎯', tier: 'bronze',
      description: 'Complete a competition without abandoning.',
      check: function(s, c) { return c.isCompetition && c.judgement; } },
    { id: 'tournamentVeteran', name: 'Tournament Veteran', icon: '📚', tier: 'gold',
      description: 'Complete 5 tournaments.',
      check: function(s, c) { return (s.tournamentsCompleted || 0) >= 5; } },
    { id: 'aiCritiqued', name: 'Open to Feedback', icon: '👂', tier: 'bronze',
      description: 'View an AI Chef\'s Notes critique.',
      check: function(s, c) { return !!s.aiCritique; } },
    { id: 'renaissanceCook', name: 'Renaissance Cook', icon: '🌍', tier: 'silver',
      description: 'Try every unlocked recipe at least once.',
      check: function(s, c) { var ids = s.recipeCompletedIds || []; return RECIPE_CATALOG.filter(function(r) { return r.unlocked; }).every(function(r) { return ids.indexOf(r.id) !== -1; }); } },
    { id: 'misePlaceBadge', name: 'Mise en Place', icon: '🗂️', tier: 'silver',
      description: 'Pass the Mise en Place constraint (all ingredients early).',
      check: function(s, c) { return c.compResult && (c.compResult.constraints || []).some(function(x) { return x.id === 'misePlace' && x.passed; }); } },
    // ── the doneness-state mechanics ──
    { id: 'patItDry', name: 'Pat It Dry', icon: '🧻', tier: 'bronze',
      description: 'Sear chicken or steak with under 10 seconds of steaming.',
      check: function(s, c) { return c.recipe && (c.recipe.id === 'panSeared' || c.recipe.id === 'steak') && (s.recipeSteamSec || 0) < 10 && (s.recipeItemAddPanF || {})[c.recipe.doneness.browningFrom] != null; } },
    { id: 'roomToBreathe', name: 'Room to Breathe', icon: '🥦', tier: 'silver',
      description: 'A-grade stir-fry cooked in batches — no steaming.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'stirFry' && c.judgement.grade === 'A' && (s.recipeSteamSec || 0) <= 20; } },
    { id: 'readsTheBubbles', name: 'Reads the Bubbles', icon: '🥞', tier: 'bronze',
      description: 'Flip a pancake on cue — first side golden.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'pancakes' && (c.judgement.notes || []).some(function(n) { return n.label.indexOf('Flipped on cue') !== -1; }); } },
    { id: 'thermometerNotClock', name: 'Thermometer, Not a Clock', icon: '🥩', tier: 'silver',
      description: 'Land a steak on the doneness target you chose.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'steak' && (c.judgement.notes || []).some(function(n) { return n.label.indexOf('On target') !== -1; }); } },
    { id: 'onionJam', name: 'Onion Jam', icon: '🧅', tier: 'gold',
      description: 'A-grade caramelised onions — thirty-five minutes of patience.',
      check: function(s, c) { return c.recipe && c.recipe.id === 'caramelisedOnions' && c.judgement.grade === 'A'; } },
    { id: 'clearAirBadge', name: 'Clear Air', icon: '🌬️', tier: 'bronze',
      description: 'Take a pan past 450°F with the oil never past its smoke point.',
      check: function(s, c) { return c.recipe && c.recipe.doneness && c.recipe.doneness.fat && (s.recipeMaxPanTempF || 0) >= 450 && (s.recipeSmokeSec || 0) === 0; } }
  ];

  // ───────────────────────────────────────────────────────────
  // RECIPE ENGINE HELPERS
  // ───────────────────────────────────────────────────────────
  // Newton-cooling thermal model for the pan. Burner level 0-10 sets
  // target temp; pan approaches target at rate k. Off-heat (level 0)
  // pan approaches ambient (70°F) at slower rate.
  function burnerTargetTemp(level) {
    if (level <= 0) return 70;
    // Linear: level 1 → 220°F, level 10 → 500°F. Every stovetop recipe's
    // stated dial ("2-3" eggs, "6-7" omelet, "7-8 then 4" chicken, "9-10"
    // stir-fry, "3-4" sauce) lands inside its own step target on this line.
    // The previous curve (70 + 43·level + 150·min(1, level/3)) reached 349°F
    // at dial 3 and 650°F at 10, so a student following the recipe text
    // overshot the step cap and was penalised for it.
    return 220 + (level - 1) * (280 / 9);
  }
  function ovenTargetTemp(setting) {
    if (setting <= 0) return 70;
    // Linear: dial 1 → 175°F, dial 10 → 525°F (real oven range)
    return 175 + (setting - 1) * (525 - 175) / 9;
  }
  // Recipes can opt into 'oven' cooking mode for a different thermal model:
  // slower ramp (k_up=0.015), oven dial maps to absolute temperatures
  // (175-525°F), and a sim-speed multiplier compresses 60-min cooks into
  // a few real minutes of play. Default is stovetop ('pan').
  // Three pans a home cook meets. k_up/k_down are the Newton constants for the
  // stovetop model (stainless keeps the values the sim always had); foodDropF is
  // how far the pan temperature falls when cold food lands in it — the thermal
  // mass that makes cast iron hold a sear and thin non-stick sag.
  var PAN_MATERIALS = [
    { id: 'nonstick',  name: 'Non-stick aluminium', icon: '🍳', k_up: 0.10,  k_down: 0.03,  foodDropF: 60,
      note: 'Light and quick to respond: heats fast, cools fast, forgiving for eggs. Sags when cold food lands; the coating is not for the highest heat.' },
    { id: 'stainless', name: 'Clad stainless',      icon: '🥘', k_up: 0.08,  k_down: 0.025, foodDropF: 40,
      note: 'Even heat, takes a sear, needs a real preheat so food does not stick. The all-rounder.' },
    { id: 'castIron',  name: 'Cast iron',           icon: '⚫', k_up: 0.045, k_down: 0.012, foodDropF: 15,
      note: 'Heavy: slow to heat, slow to cool. Holds its temperature when cold food lands, so a sear does not stall. Overshoots if you turn it down late.' }
  ];
  function panMaterial(id) {
    return PAN_MATERIALS.find(function(m) { return m.id === id; }) || PAN_MATERIALS[1];
  }
  function getRecipeThermal(rec, materialId) {
    if (rec && rec.cookingMode === 'oven') {
      return {
        mode: 'oven',
        targetTempFn: ovenTargetTemp,
        k_up: 0.015,
        k_down: 0.01,
        controlLabel: 'Oven temperature dial',
        controlSubLabel: function(level) {
          if (level === 0) return 'OFF';
          return Math.round(ovenTargetTemp(level)) + '°F';
        }
      };
    }
    var mat = panMaterial(materialId);
    return {
      mode: 'pan',
      material: mat.id,
      targetTempFn: burnerTargetTemp,
      k_up: mat.k_up,
      k_down: mat.k_down,
      controlLabel: 'Burner setting',
      controlSubLabel: function(level) { return level + ' / 10'; }
    };
  }
  function tickPanTemp(currentF, level, dtSec, thermal) {
    thermal = thermal || getRecipeThermal(null);
    var target = thermal.targetTempFn(level);
    var k = level > 0 ? thermal.k_up : thermal.k_down;
    return currentF + (target - currentF) * (1 - Math.exp(-k * dtSec));
  }
  // Pure per-tick food + doneness update. Reads only the state fields it
  // names, so a whole cook can be driven through it in a test without React.
  //
  // Food internal temp rises toward the pan temp at rec.doneness.foodK
  // (default 0.008; eggs 0.014; a chicken breast 0.0007; a whole bird 0.00012
  // — the old single 0.008 put a breast at 343°F after a 3-minute sear, so
  // both poultry recipes always judged "overcooked"). Off heat with food in
  // the pan: 30 s of carryover at the same rate, then drift toward ambient.
  // Water-bound foods cannot pass boiling (foodMaxF 212).
  //
  // Browning integrates surface heat exposure: rate doubles every 40°F above
  // the ~280°F Maillard threshold (1.0 ≈ 75 s at 400°F, negligible at 250°F),
  // and only once rec.doneness.browningFrom is in the pan (oil alone does not
  // brown). Judges read the accumulated value against their own thresholds.
  function advanceDoneness(prior, rec, newTemp, dtSec, now) {
    var dn = recipeDoneness(rec, prior);
    var items = prior.recipeItemsInPan || [];
    var hasFood = items.length > 0;
    var foodKOn = dn.foodK || 0.008;
    var curFood = prior.recipeFoodInternalF || 40;
    var newFood = curFood;
    if (hasFood) {
      var foodK = (prior.recipeBurnerLevel || 0) > 0 ? foodKOn :
        (prior.recipeHeatRemovedAt && (now - prior.recipeHeatRemovedAt) < 30000 ? foodKOn : -0.001);
      newFood = curFood + (newTemp - curFood) * (1 - Math.exp(-Math.abs(foodK) * dtSec)) * Math.sign(foodK || 1);
      newFood = Math.max(40, Math.min(dn.foodMaxF || 550, newFood));
    }
    // Stirring. rec.doneness.stir = { label, grace } marks a dish that has to be
    // kept moving: time in a hot pan past the grace period since the last stir
    // (or the last ingredient added) is unattended, and unattended food browns
    // 1.7× faster — the Recipe Kitchen's constant. A dish with stir.disturbs
    // (a searing chicken breast) is the inverse: moving it is the mistake, and
    // stirPan() handles that by resetting part of the crust instead.
    var simNow = (prior.recipeSimElapsedSec || 0) + dtSec;
    var stir = dn.stir;
    var needsWatching = hasFood && (!dn.browningFrom || items.indexOf(dn.browningFrom) !== -1); // butter alone needs no stirring
    var unattended = false;
    if (stir && !stir.disturbs && needsWatching && newTemp > 250) {
      var lastStir = prior.recipeLastStirSimSec != null ? prior.recipeLastStirSimSec : simNow;
      unattended = (simNow - lastStir) > (stir.grace || 15);
    }
    // Surface water boils off once the pan is above 212°F (faster the hotter the
    // pan, slower in a crowded pan); while the surface is wet the food steams
    // and browning is held to a trickle. dn.moisture opts a recipe in.
    var moisture = prior.recipeMoisture || 0;
    var wet = false, steaming = false;
    if (dn.moisture && hasFood && (!dn.browningFrom || items.indexOf(dn.browningFrom) !== -1)) {
      if (moisture > 0 && newTemp > 212) {
        moisture = Math.max(0, moisture - Math.max(0, (newTemp - 212) / 600) * (dn.moisture.evap || 1.2) * evapFactor(rec, prior) * dtSec);
      }
      wet = moisture > 10;
      steaming = wet && newTemp > 212;
    }
    var moistureMult = !dn.moisture ? 1 : wet ? 0.15 : moisture > 3 ? 0.6 : 1;
    var browningActive = hasFood && newTemp > 280 && (!dn.browningFrom || items.indexOf(dn.browningFrom) !== -1);
    var browningRate = browningActive ? Math.pow(2, (newTemp - 280) / 40) / 600 * (unattended ? 1.7 : 1) * moistureMult : 0;
    var setF = dn.setF || 145, overF = dn.overF || 175;
    // Oil past its smoke point: the fat is in the pan and the pan is hotter
    // than the chosen oil can take (SMOKE_POINTS). Counted in sim-seconds.
    var oil = oilFor(rec, prior);
    var smoking = !!(oil && dn.fat && items.indexOf(dn.fat.item) !== -1 && newTemp > oil.smokeF);
    return {
      recipeFoodInternalF: newFood,
      recipeFoodPeakF: Math.max(prior.recipeFoodPeakF || 40, newFood),
      recipeBrowning: (prior.recipeBrowning || 0) + browningRate * dtSec,
      recipeSecAboveOverF: (prior.recipeSecAboveOverF || 0) + (hasFood && newFood >= overF ? dtSec : 0),
      recipeFoodSetAt: prior.recipeFoodSetAt || (hasFood && newFood >= setF ? now : null),
      recipeUnattendedSec: (prior.recipeUnattendedSec || 0) + (unattended ? dtSec : 0),
      recipeSmokeSec: (prior.recipeSmokeSec || 0) + (smoking ? dtSec : 0),
      recipeMoisture: moisture,
      recipeSteamSec: (prior.recipeSteamSec || 0) + (steaming ? dtSec : 0)
    };
  }

  // ─── Sizzle cue ───
  // What the pan sounds like, from pan temperature and the water still in the
  // food: below boiling nothing sizzles (the food steams), and once the food's
  // surface water is nearly gone the pan goes quiet. The caption is always
  // shown as text under the burner; the sound itself is Web Audio noise shaped
  // by the same numbers, off by default (a classroom of laptops should not all
  // hiss) and switched on by the student.
  function klSizzleLevel(panF, hasFood, foodF, moisture) {
    if (hasFood && moisture > 10 && panF > 212) return { level: 0.95, tier: 'spatter', caption: 'loud spatter — surface water flashing off in the fat; it quietens as the surface dries' };
    if (!hasFood) {
      if (panF >= 350) return { level: 0.04, tier: 'dry', caption: 'hot, dry pan — a faint hiss' };
      return { level: 0, tier: 'quiet', caption: panF >= 200 ? 'quiet pan' : 'cold pan' };
    }
    if (panF < 212) return { level: 0, tier: 'quiet', caption: 'no sizzle — pan is below boiling, the food is steaming, not frying' };
    var moisture = foodF >= 205 ? 0.25 : 1;
    var level = Math.min(1, (panF - 212) / 220) * moisture;
    var tier = panF >= 420 ? 'spatter' : panF >= 330 ? 'steady' : 'gentle';
    var caption = tier === 'spatter' ? 'aggressive spatter — the pan is very hot' : tier === 'steady' ? 'steady sizzle' : 'gentle sizzle';
    if (moisture < 1) caption = 'sizzle fading — the surface water is nearly gone';
    return { level: level, tier: tier, caption: caption };
  }
  var _klAudio = null;
  function klAudioEnsure() {
    if (_klAudio) return _klAudio;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      var ctx = new AC();
      var len = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var srcNode = ctx.createBufferSource(); srcNode.buffer = buf; srcNode.loop = true;
      var filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 3200; filt.Q.value = 0.7;
      var gain = ctx.createGain(); gain.gain.value = 0;
      srcNode.connect(filt); filt.connect(gain); gain.connect(ctx.destination); srcNode.start();
      _klAudio = { ctx: ctx, filter: filt, gain: gain };
    } catch (e) { _klAudio = null; }
    return _klAudio;
  }
  function klAudioSet(level, tier, enabled) {
    if (!enabled) {
      if (_klAudio) _klAudio.gain.gain.setTargetAtTime(0, _klAudio.ctx.currentTime, 0.1);
      return;
    }
    var a = klAudioEnsure(); if (!a) return;
    if (a.ctx.state === 'suspended') { try { a.ctx.resume().catch(function() {}); } catch (e) { /* no gesture yet */ } }
    var t = a.ctx.currentTime;
    a.gain.gain.setTargetAtTime(level * 0.12, t, 0.15);
    a.filter.frequency.setTargetAtTime(tier === 'spatter' ? 5200 : tier === 'steady' ? 3800 : 2600, t, 0.2);
    a.filter.Q.setTargetAtTime(tier === 'spatter' ? 0.4 : 0.8, t, 0.2);
  }

  // Module-scope interval handle for the live cooking tick. Only one
  // active recipe simulation at a time, so a single handle is fine.
  var _recipeTickHandle = null;
  var _handwashTickHandle = null;
  var _handwashCompleteHandle = null;
  var _klConfirmReturnEl = null;
  var _klSuggesterReturnEl = null;
  // Hidden-tab guard for the live cook. Background tabs throttle or suspend
  // timers; without this a student who switched tabs came back to food that
  // "cooked" the whole absence in one tick. The render assigns the current
  // pauseRecipe closure here; the listener is registered once per page.
  var _klPauseHook = null;
  if (typeof document !== 'undefined' && !window.__klVisibilityGuard) {
    window.__klVisibilityGuard = true;
    document.addEventListener('visibilitychange', function() {
      if (document.hidden && typeof _klPauseHook === 'function') _klPauseHook();
    });
  }

  // ───────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────
  function defaultState() {
    return {
      activeSection: 'start',
      // Safety
      safetyTemp: 70,      // Danger-zone slider position (°F)
      handwashStart: null, // Timestamp when started or resumed
      handwashElapsedSec: 0,
      handwashPaused: false,
      handwashTickAt: null,
      handwashStep: 0,
      // Knife
      knifeSelectedCut: 'mediumDice',
      // Heat
      heatTechnique: 'saute',
      heatPanTempF: 350,
      heatTimeMin: 5,
      // Maillard
      maillardSurfaceF: 300,  // Surface temp slider
      // Resources sub-view
      resourcesSub: 'glossary',  // glossary | smoke | conversions | troubleshoot | subs
      glossaryFilter: '',        // search filter
      // Recipe Simulator state
      recipeActiveId: null,                // which recipe is currently being cooked
      recipePhase: 'idle',                 // 'idle' | 'cooking' | 'done'
      recipeStartedAt: null,               // ms timestamp
      recipePausedAt: null,                // ms timestamp while the simulation is paused
      recipeCurrentStep: 0,                // index into recipe.steps
      recipeStepStartedAt: null,
      recipePanTempF: 70,                  // simulated pan temp (ambient start)
      recipeBurnerLevel: 0,                // 0-10
      recipeMaxPanTempF: 70,               // peak pan temp seen this run
      recipeFoodInternalF: 40,             // simulated internal food temp (fridge start)
      recipeItemsInPan: [],                // array of ingredient ids
      recipeIngredientOrder: [],           // order ingredients were added (for ordering checks)
      recipeItemAddTimes: {}, recipeItemAddPanF: {}, recipeItemAddSimSec: {}, recipeHeatRemovedSimSec: null, recipeLastStirSimSec: null, recipeStirCount: 0, recipeUnattendedSec: 0, recipeTraceStepSec: 1, recipeOil: null, recipeSmokeSec: 0, recipeOptions: {}, recipeMarks: {}, recipeMoisture: 0, recipeSteamSec: 0,              // { itemId: ms }
      recipeActiveTimeSec: 0,              // seconds with food in pan
      recipeHeatRemovedAt: null,           // when burner went to 0 with food in pan
      recipeLastTickAt: null,              // ms
      recipeJudgement: null,               // set when phase = 'done'
      // Doneness state, integrated every tick while food is in the pan. The
      // judges read these instead of scoring peak temp and elapsed time as
      // independent rules, so the notes cannot contradict each other.
      recipeBrowning: 0,                   // surface browning, Σ 2^((pan−280)/40)/600 · dt
      recipeFoodPeakF: 40,                 // highest food internal temp this run
      recipeFoodSetAt: null,               // ms when food internal first reached rec.doneness.setF
      recipeSecAboveOverF: 0,              // sim-seconds food internal spent above rec.doneness.overF
      recipeSimElapsedSec: 0,              // the one cook clock: Σ dt in sim seconds
      recipeCompletedIds: [],              // which recipes have been beaten (for unlocks)
      // Multi-pot sidecar (pasta pot for pasta+sauce recipe)
      // State machine: cold → heating → boiling → pasta-in → pasta-done → drained
      // Pot has its own thermal ramp + pasta-cook timer, independent of the
      // primary pan. Only used by recipes that opt in (multiPot: true).
      potState: 'cold',
      potStartedAt: null,                  // when pot was turned on
      potPastaInAt: null,                  // when pasta was dropped
      potPastaDoneAt: null,                // when pasta finished cooking
      potDrainedAt: null,                  // when pasta was drained
      potWaterReserved: false,             // did the student save pasta water?
      // Competition mode
      competitionActive: false,            // is the current run a competition?
      competitionConstraints: [],          // array of constraint definitions for this run
      competitionDeadline: null,           // ms timestamp for hard time limit
      competitionStartedAt: null,
      competitionBurnerChanges: 0,         // count of unique burner level transitions
      competitionBurnerLevelSum: 0,        // sum for averaging
      competitionBurnerLevelTicks: 0,      // tick count for averaging
      competitionBests: {},                // { recipeId: highScore }
      competitionLastResult: null,         // { recipeId, score, baseScore, bonusTotal, isNewBest }
      // Tournament mode (3-round bracket)
      tournamentActive: false,
      tournamentRound: 0,                  // 0-indexed (0/1/2)
      tournamentRecipes: [],               // [recipeId, recipeId, recipeId]
      tournamentConstraintIds: [],         // [[id1], [id1,id2], [id1,id2,id3]]
      tournamentScores: [],                // [r1Score, r2Score, r3Score]
      tournamentBestTotal: 0,              // best-ever tournament total
      tournamentLastTotal: null,           // last completed tournament total
      tournamentsCompleted: 0,             // count of completed tournaments
      // Tracking for new constraints
      twoStepHeatAchieved: false,          // burner went ≥6 then ≤5
      coldDipAfterFood: false,             // pan dropped below 200°F with food in
      hadHighBurner: false,                // ever set burner ≥6 this run
      // Achievements
      klUnlockedAchievements: [],          // list of unlocked achievement IDs
      klNewAchievements: [],               // newly unlocked this run (for results banner)
      aGradedRecipeIds: [],                // recipes ever A-graded
      // AI judge (Gemini-powered personalized critique)
      aiCritique: null,
      aiCritiqueLoading: false,
      aiCritiqueRequestedFor: null,        // recipeRunStartedAt — so we don't re-request
      // AI Recipe Suggester
      suggesterOpen: false,
      suggesterInput: '',                  // free-text constraints (e.g., "no eggs, 30 min")
      suggesterLoading: false,
      suggesterResult: null,               // { recipeId, reasoning } | null
      suggesterError: null,
      pendingConfirmation: null,           // 'recipe' | 'tournament' | null
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
    desc: 'Cooking & food safety life skills with culinary science: USDA safe temps + bacteria danger zone, knife cuts (dice / julienne / chiffonade / brunoise), heat techniques (sauté / sear / simmer / braise / roast / fry / steam), the Maillard reaction, top-9 allergens. Includes real-time recipes and a 3D skills studio with action evidence and explanations. Sister tool to NutritionLab and BakingScience.',
    color: 'orange',
    category: 'applied',
    // Pure engine pieces for tests/kitchenlab_recipe_engine.test.js; the host never reads this.
    engine: { burnerTargetTemp: burnerTargetTemp, ovenTargetTemp: ovenTargetTemp, tickPanTemp: tickPanTemp, advanceDoneness: advanceDoneness, getRecipeThermal: getRecipeThermal, klSizzleLevel: klSizzleLevel, PAN_MATERIALS: PAN_MATERIALS, panMaterial: panMaterial, SMOKE_POINTS: SMOKE_POINTS, SANDBOX_FOODS: SANDBOX_FOODS, sandboxFood: sandboxFood, recipeDoneness: recipeDoneness, recipeIngredients: recipeIngredients, oilFor: oilFor, browningLabel: browningLabel, optionValue: optionValue, localizeTemps: localizeTemps, fToC: fToC, microCook: microCook, dangerClock: dangerClock, doublingMinutes: doublingMinutes, COMPETITION_CONSTRAINTS: COMPETITION_CONSTRAINTS, initialMoisture: initialMoisture, evapFactor: evapFactor, HEAT_MICRO_SEC: HEAT_MICRO_SEC, HEAT_DEFAULT_FOOD: HEAT_DEFAULT_FOOD, TECHNIQUES: TECHNIQUES, ACHIEVEMENTS: ACHIEVEMENTS, RECIPES: RECIPES, RECIPE_CATALOG: RECIPE_CATALOG, defaultState: defaultState },
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
        progress: function(d) { return (d && d.klHandwashCompleted) ? 'completed' : 'not yet'; } },
      { id: 'open_maillard', label: 'Explore the Maillard reaction', icon: '🟫',
        check: function(d) { return !!(d && d.klViewedMaillard); },
        progress: function(d) { return (d && d.klViewedMaillard) ? 'opened' : 'not yet'; } },
      { id: 'open_resources', label: 'Browse the kitchen resources', icon: '📚',
        check: function(d) { return !!(d && d.klViewedResources); },
        progress: function(d) { return (d && d.klViewedResources) ? 'opened' : 'not yet'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = function(n) { if (ctx.awardXP) ctx.awardXP('kitchenLab', n); };

      var d = labToolData.kitchenLab || defaultState();
      // °C mode: one element factory converts every temperature the student
      // reads — string children plus aria-label/title — so judge notes, step
      // text, captions and visuals all agree without touching each site.
      var units = d.klUnits === 'C' ? 'C' : 'F';
      _klUnits = units;
      if (units === 'C') {
        h = function() {
          var args = Array.prototype.slice.call(arguments);
          var props = args[1];
          if (props && typeof props === 'object') {
            var patched = null;
            if (typeof props['aria-label'] === 'string' && props['aria-label'].indexOf('°F') !== -1) { patched = patched || Object.assign({}, props); patched['aria-label'] = localizeTemps(props['aria-label']); }
            if (typeof props.title === 'string' && props.title.indexOf('°F') !== -1) { patched = patched || Object.assign({}, props); patched.title = localizeTemps(props.title); }
            if (patched) args[1] = patched;
          }
          for (var ai = 2; ai < args.length; ai++) if (typeof args[ai] === 'string') args[ai] = localizeTemps(args[ai]);
          return React.createElement.apply(React, args);
        };
      }
      function toggleUnits() {
        var next = units === 'C' ? 'F' : 'C';
        setKL({ klUnits: next });
        klAnnounce(next === 'C' ? __alloT('stem.kitchenlab.sr_units_c', 'Temperatures now shown in Celsius.') : __alloT('stem.kitchenlab.sr_units_f', 'Temperatures now shown in Fahrenheit.'));
      }
      function setKL(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.kitchenLab) || defaultState();
          // Allow patch to be a function (prior → patch) for live-tick updates
          // that need access to the latest state without race conditions.
          var nextPatch = typeof patch === 'function' ? patch(prior) : patch;
          var next = Object.assign({}, prior, nextPatch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { kitchenLab: next });
        });
      }

      function trapDialogFocus(e, dialogId, onEscape) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onEscape();
          return;
        }
        if (e.key !== 'Tab' || typeof document === 'undefined') return;
        var dialog = document.getElementById(dialogId);
        if (!dialog) return;
        var focusable = dialog.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }

      function stopHandwashTimers() {
        if (_handwashTickHandle) { clearInterval(_handwashTickHandle); _handwashTickHandle = null; }
        if (_handwashCompleteHandle) { clearTimeout(_handwashCompleteHandle); _handwashCompleteHandle = null; }
      }
      function completeHandwashTimer() {
        stopHandwashTimers();
        setKL(function(prior) {
          if (!prior.handwashStart) return {};
          return { handwashStart: null, handwashElapsedSec: 20, handwashPaused: false,
            handwashTickAt: Date.now(), klHandwashCompleted: true };
        });
        klAnnounce(__alloT('stem.kitchenlab.sr_handwash_complete_20_seconds_reached', 'Handwash complete — 20 seconds reached.'));
        awardXP(5);
      }
      function scheduleHandwashTimers(remainingSec) {
        stopHandwashTimers();
        _handwashTickHandle = setInterval(function() {
          setKL({ handwashTickAt: Date.now() });
        }, 500);
        _handwashCompleteHandle = setTimeout(completeHandwashTimer, Math.max(0, remainingSec) * 1000);
      }
      function startOrResumeHandwashTimer() {
        var elapsed = Math.min(20, Math.max(0, d.handwashElapsedSec || 0));
        if (elapsed >= 20) elapsed = 0;
        var remaining = 20 - elapsed;
        setKL({ handwashStart: Date.now(), handwashElapsedSec: elapsed, handwashPaused: false, handwashTickAt: Date.now() });
        scheduleHandwashTimers(remaining);
        klAnnounce((elapsed > 0 ? 'Handwash timer resumed. ' : 'Handwash timer started. ') + Math.ceil(remaining) + ' seconds remaining.');
      }
      function pauseHandwashTimer() {
        var elapsed = Math.min(20, Math.max(0, (d.handwashElapsedSec || 0) + (d.handwashStart ? (Date.now() - d.handwashStart) / 1000 : 0)));
        stopHandwashTimers();
        setKL({ handwashStart: null, handwashElapsedSec: elapsed, handwashPaused: true, handwashTickAt: Date.now() });
        klAnnounce('Handwash timer paused with ' + Math.ceil(20 - elapsed) + ' seconds remaining.');
      }
      function resetHandwashTimer() {
        stopHandwashTimers();
        setKL({ handwashStart: null, handwashElapsedSec: 0, handwashPaused: false, handwashTickAt: Date.now() });
        klAnnounce(__alloT('stem.kitchenlab.sr_handwash_timer_reset', 'Handwash timer reset.'));
      }
      // `view` is what renders; `section` is the tab it belongs to (the 3D
      // Recipe Kitchen is a sub-view of the Recipe Sim tab).
      var view = d.activeSection || 'start';
      var section = view === 'recipeKitchen' ? 'recipe' : view;

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
          '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" aria-hidden="true">' +
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
          'linear-gradient(135deg, #1c1410 0%, #251a13 50%, #1c1410 100%)',
        backgroundRepeat: 'no-repeat, repeat, no-repeat',
        backgroundAttachment: 'fixed, scroll, fixed',
        minHeight: '100vh',
        color: 'var(--allo-stem-text, #f1f5f9)'
      };

      // ─── Reusable shells ───
      function panelHeader(title, subtitle) {
        return h('div', { style: { marginBottom: 18 } },
          h('div', { style: { fontSize: 22, fontWeight: 800, color: '#fde68a', letterSpacing: '-0.01em', marginBottom: 4 } }, title),
          subtitle ? h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, maxWidth: 720 } }, subtitle) : null);
      }

      function renderHeader() {
        var TABS = [
          { id: 'start', label: __alloT('stem.kitchenlab.start_here', 'Start here'), icon: '🏡' },
          { id: 'studio', label: __alloT('stem.kitchenlab.skills_studio', '3D Skills Studio'), icon: '🧑‍🍳' },
          { id: 'safety', label: __alloT('stem.kitchenlab.safety', 'Safety'), icon: '🛡️', sub: 'food safety' },
          { id: 'knife', label: __alloT('stem.kitchenlab.knife_lab', 'Knife Lab'), icon: '🔪', sub: 'cuts + technique' },
          { id: 'heat', label: __alloT('stem.kitchenlab.heat_technique', 'Heat & Technique'), icon: '🔥', sub: '8 cooking methods' },
          { id: 'maillard', label: __alloT('stem.kitchenlab.maillard', 'Maillard'), icon: '🟫', sub: 'the browning reaction' },
          { id: 'recipe', label: __alloT('stem.kitchenlab.recipe_sim', 'Recipe Sim'), icon: '🍽️', sub: 'real-time cooking' },
          { id: 'resources', label: __alloT('stem.kitchenlab.resources', 'Resources'), icon: '📚', sub: 'glossary + cheat sheets' }
        ];
        var sectionCount = TABS.length + 1;
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
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 22, fontWeight: 800, color: 'var(--allo-stem-text, #fde68a)', letterSpacing: '-0.01em' } }, __alloT('stem.kitchenlab.kitchen_lab', 'Kitchen Lab')),
                h('div', { style: { fontSize: 10, fontWeight: 700, color: '#fdba74', background: 'rgba(251,146,60,0.12)',
                    border: '1px solid rgba(251,146,60,0.3)', padding: '2px 8px', borderRadius: 9999, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  sectionCount + ' sections'),
                // Units switch: the one control that changes every temperature on the page
                h('button', { type: 'button', 'data-kl-units': units, 'aria-pressed': units === 'C' ? 'true' : 'false', onClick: toggleUnits,
                    'aria-label': units === 'C' ? __alloT('stem.kitchenlab.a11y_units_showing_c', 'Temperatures in Celsius. Switch to Fahrenheit') : __alloT('stem.kitchenlab.a11y_units_showing_f', 'Temperatures in Fahrenheit. Switch to Celsius'),
                    style: { marginLeft: 'auto', padding: '4px 10px', fontSize: 11, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', color: '#fde68a',
                      background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 9999, cursor: 'pointer', minHeight: 28 } },
                  h('span', { style: { opacity: units === 'F' ? 1 : 0.45 } }, '°F'), h('span', { 'aria-hidden': 'true', style: { opacity: 0.5, margin: '0 4px' } }, '/'), h('span', { style: { opacity: units === 'C' ? 1 : 0.45 } }, '°C'))),
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 4, lineHeight: 1.5 } },
                __alloT('stem.kitchenlab.cooking_life_skills_culinary_science_f', 'Cooking life skills + culinary science. Food safety, knife technique, heat methods, Maillard chemistry, recipes, glossary. Built for life skills classrooms + family + consumer science.')))));
      }

      function renderTabs() {
        var TABS = [
          { id: 'start', label: __alloT('stem.kitchenlab.start_here', 'Start here'), icon: '🏡' },
          { id: 'studio', label: __alloT('stem.kitchenlab.skills_studio', '3D Skills Studio'), icon: '🧑‍🍳' },
          { id: 'safety', label: __alloT('stem.kitchenlab.safety_2', 'Safety'), icon: '🛡️' },
          { id: 'knife', label: __alloT('stem.kitchenlab.knife_lab_2', 'Knife Lab'), icon: '🔪' },
          { id: 'heat', label: __alloT('stem.kitchenlab.heat_technique_2', 'Heat & Technique'), icon: '🔥' },
          { id: 'maillard', label: __alloT('stem.kitchenlab.maillard_2', 'Maillard'), icon: '🟫' },
          { id: 'recipe', label: __alloT('stem.kitchenlab.recipe_sim_2', 'Recipe Sim'), icon: '🍽️' },
          { id: 'resources', label: __alloT('stem.kitchenlab.resources_2', 'Resources'), icon: '📚' },
          { id: 'maillardHunt', label: __alloT('stem.kitchenlab.browning_lab', 'Browning Lab'), icon: '🔬' }
        ];
        return h('div', { role: 'tablist', 'aria-label': __alloT('stem.kitchenlab.kitchen_lab_sections', 'Kitchen Lab sections'),
          style: { display: 'flex', flexWrap: 'wrap', gap: 0, padding: '0 16px',
            borderBottom: '1px solid rgba(251,146,60,0.25)', position: 'relative', zIndex: 1 } },
          TABS.map(function(t, tabIndex) {
            var active = section === t.id;
            return h('button', {
              key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              id: 'stem-kitchen-tab-' + t.id,
              'aria-controls': 'stem-kitchen-panel-' + t.id,
              tabIndex: active ? 0 : -1,
              onKeyDown: function(e) {
                var nextIndex = -1;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (tabIndex + 1) % TABS.length;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (tabIndex + TABS.length - 1) % TABS.length;
                else if (e.key === 'Home') nextIndex = 0;
                else if (e.key === 'End') nextIndex = TABS.length - 1;
                if (nextIndex < 0) return;
                e.preventDefault();
                var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
                var nextTab = tabs[nextIndex];
                if (nextTab) { nextTab.focus(); nextTab.click(); }
              },
              onClick: function() { setSection(t.id); },
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
        // Danger-zone clock: hours on the counter at this temperature
        var hoursOut = d.safetyHours != null ? d.safetyHours : 2;
        var clock = dangerClock(curTemp, hoursOut);
        var fmtMult = function(m) { return m >= 1000 ? Math.round(m).toLocaleString() + '×' : m >= 10 ? Math.round(m) + '×' : m.toFixed(1) + '×'; };
        return h('div', null,
          panelHeader('🛡️ Kitchen Safety School',
            'The science of NOT making people sick. Bacteria + cross-contamination + safe temps + handwashing + the top-9 allergens — what every cook needs to know before they cook.'),

          // ─── Danger Zone Visualizer ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.the_danger_zone_fda_food_code', '🌡️ The Danger Zone (FDA Food Code)')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.bacteria_grow_fastest_between_40_f_and', 'Bacteria grow fastest between 40°F and 140°F (4°C–60°C). This is "the danger zone." Food shouldn\'t sit here for more than 2 hours total (1 hour if it\'s over 90°F outside). Drag the slider to see what happens at different temps.')),
            // Temp slider
            h('div', { style: { marginBottom: 14 } },
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 6, fontWeight: 700 } },
                h('span', null, __alloT('stem.kitchenlab.food_temperature', 'Food temperature')),
                h('span', { style: { color: zone.ink || zone.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, curTemp + '°F (' + Math.round((curTemp - 32) * 5 / 9) + '°C)')),
              h('input', { type: 'range', min: 32, max: 220, step: 1, value: curTemp,
                onChange: function(e) { setKL({ safetyTemp: parseInt(e.target.value, 10) }); },
                'aria-label': units === 'C' ? __alloT('stem.kitchenlab.food_temperature_in_celsius', 'Food temperature in Celsius') : __alloT('stem.kitchenlab.food_temperature_in_fahrenheit', 'Food temperature in Fahrenheit'),
                style: { width: '100%', accentColor: zone.color } })),
            // Zone callout
            h('div', { style: {
                background: zone.color + '18', border: '1px solid ' + zone.color + '55',
                borderLeft: '4px solid ' + zone.color,
                padding: '14px 16px', borderRadius: 10, marginBottom: 12 } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: zone.ink || zone.color, marginBottom: 6 } }, zone.label),
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, zone.descr)),
            // Danger-zone clock — hours on the counter at this temperature
            h('div', { 'data-kl-danger-clock': clock.inZone ? (clock.overLimit ? 'over' : 'within') : 'none', style: { background: clock.inZone ? (clock.overLimit ? 'rgba(220,38,38,0.10)' : 'rgba(251,191,36,0.08)') : 'rgba(56,189,248,0.08)',
                border: '1px solid ' + (clock.inZone ? (clock.overLimit ? 'rgba(220,38,38,0.35)' : 'rgba(251,191,36,0.35)') : 'rgba(56,189,248,0.3)'), padding: 12, borderRadius: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: clock.inZone ? (clock.overLimit ? '#fca5a5' : '#fde68a') : '#7dd3fc', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.danger_zone_clock', '⏱️ Danger-zone clock')),
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 6, fontWeight: 700 } },
                h('span', null, __alloT('stem.kitchenlab.hours_on_the_counter', 'Hours the food sits at this temperature')),
                h('span', { style: { color: '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace' } }, hoursOut.toFixed(2).replace(/\.?0+$/, '') + ' h')),
              h('input', { type: 'range', min: 0, max: 8, step: 0.25, value: hoursOut,
                onChange: function(e) { setKL({ safetyHours: parseFloat(e.target.value) }); },
                'aria-label': __alloT('stem.kitchenlab.hours_on_the_counter_a11y', 'Hours the food sits at this temperature'),
                style: { width: '100%', accentColor: clock.overLimit ? '#dc2626' : '#fbbf24', marginBottom: 10 } }),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 } },
                h('div', null,
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.kitchenlab.doubling_time_here', 'Doubling time here')),
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace' } }, clock.doublingMinutes === Infinity ? '—' : Math.round(clock.doublingMinutes) + ' min'),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, clock.doublingMinutes === Infinity ? (curTemp <= 40 ? 'no growth — cold enough' : 'no growth — hot enough to kill') : clock.doublingMinutes <= 20 ? 'the fastest bacteria get' : 'slower than the 80-110°F sweet spot')),
                h('div', null,
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.kitchenlab.population_after', 'Population after ') + hoursOut.toFixed(2).replace(/\.?0+$/, '') + ' h'),
                  h('div', { 'data-kl-danger-mult': Math.round(clock.multiplier), style: { fontSize: 22, fontWeight: 900, color: clock.overLimit ? '#fca5a5' : '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace' } }, fmtMult(clock.multiplier)),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, clock.doublings > 0 ? Math.round(clock.doublings * 10) / 10 + ' doublings · 1,000 bacteria → ' + Math.round(1000 * clock.multiplier).toLocaleString() : 'start = finish')),
                h('div', null,
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.kitchenlab.usda_limit', 'USDA limit at this room temperature')),
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: clock.inZone ? (clock.overLimit ? '#fca5a5' : '#86efac') : '#7dd3fc', fontFamily: 'ui-monospace, Menlo, monospace' } }, clock.inZone ? clock.limitHours + ' h' : 'n/a'),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, clock.inZone ? (clock.limitHours === 1 ? 'over 90°F: one hour, then refrigerate or discard' : 'two hours total in the zone, then refrigerate or discard') : 'outside the danger zone'))),
              // Hour-by-hour bars on a log scale, with the limit marked
              h('div', { 'aria-hidden': 'true', style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 54, padding: '0 2px', borderBottom: '1px solid rgba(100,116,139,0.35)' } },
                [1, 2, 3, 4, 5, 6, 7, 8].map(function(hr) {
                  var c = dangerClock(curTemp, hr); var hgt = Math.min(50, 4 + c.doublings * 2.1);
                  var past = c.inZone && hr > c.limitHours; var reached = hr <= hoursOut;
                  return h('div', { key: hr, title: hr + ' h: ' + fmtMult(c.multiplier), style: { flex: 1, height: hgt, background: past ? (reached ? '#dc2626' : 'rgba(220,38,38,0.35)') : (reached ? '#fbbf24' : 'rgba(251,191,36,0.3)'), borderRadius: '3px 3px 0 0' } });
                })),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                [1, 2, 3, 4, 5, 6, 7, 8].map(function(hr) { return h('span', { key: hr }, hr + 'h'); })),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginTop: 10 } },
                !clock.inZone ? (curTemp <= 40 ? 'At or below 40°F growth is on hold: the fridge does not kill bacteria, it stops the clock.' : 'At 140°F and above bacteria die rather than multiply — but toxins some have already made can survive reheating.')
                : clock.overLimit ? 'Past the limit. Reheating kills bacteria, not the toxins some of them leave behind — this food should be discarded, not rescued.'
                : 'Inside the limit. Refrigerate before it runs out; the clock is cumulative across every trip out of the fridge.'))
          ),

          // ─── USDA Safe Temps ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.usda_safe_cooking_temperatures', '🔥 USDA Safe Cooking Temperatures')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.these_are_the_minimum_internal_tempera', 'These are the minimum internal temperatures. A meat thermometer is the only way to know for sure. Color is unreliable — pink chicken at 165°F is safe; brown chicken at 140°F is not.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 12 } },
              SAFE_TEMPS.map(function(t, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid #fb923c', borderRadius: 10, padding: '12px 14px' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, t.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, t.food),
                      h('div', { style: { fontSize: 11, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                        t.tempF + '°F (' + t.tempC + '°C)'))),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 6 } },
                    h('b', { style: { color: 'var(--allo-stem-text, #e2e8f0)' } }, 'Why: '), t.why),
                  h('div', { style: { fontSize: 10, color: '#fb923c', lineHeight: 1.5, background: 'rgba(251,146,60,0.08)', padding: '6px 8px', borderRadius: 6 } },
                    h('b', null, __alloT('stem.kitchenlab.pitfall', '⚠️ Pitfall: ')), t.pitfall));
              }))),

          // ─── WHO Handwash Timer ───
          renderHandwashTimer(),

          // ─── Cross-contamination quick rules ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.cross_contamination_rules', '🚫 Cross-Contamination Rules')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 12 } },
              __alloT('stem.kitchenlab.pathogens_move_from_raw_meat_hands_cut', 'Pathogens move from raw meat → hands → cutting board → ready-to-eat food. The fixes are simple but easy to forget mid-cook.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
              [
                { icon: '🪧', rule: 'Separate cutting boards (or wash thoroughly)', detail: __alloT('stem.kitchenlab.red_board_for_raw_meat_green_for_produ', 'Red board for raw meat, green for produce. Many home kitchens skip this — it\'s the #1 home-kitchen cross-contamination source.') },
                { icon: '🧼', rule: 'Wash hands AFTER touching raw meat', detail: __alloT('stem.kitchenlab.20_seconds_with_soap_hot_water_the_20_', '20 seconds with soap + hot water. The 20 seconds is what dislodges the bacteria — soap alone doesn\'t.') },
                { icon: '🧊', rule: 'Thaw meat in fridge, never on counter', detail: __alloT('stem.kitchenlab.surface_thaws_fast_bacteria_multiply_o', 'Surface thaws fast → bacteria multiply on the outside while inside is still frozen. Fridge keeps the whole thing under 40°F.') },
                { icon: '📥', rule: 'Marinade-as-sauce: cook it first', detail: __alloT('stem.kitchenlab.marinade_that_touched_raw_meat_contain', 'Marinade that touched raw meat contains those pathogens. Boil it 1 min before using as a finishing sauce, or make extra separately.') },
                { icon: '🧽', rule: 'Replace sponges weekly + microwave wet daily', detail: __alloT('stem.kitchenlab.damp_kitchen_sponges_harbor_more_bacte', 'Damp kitchen sponges harbor more bacteria per square cm than the toilet seat. Microwaving wet for 90 seconds sanitizes most of it.') },
                { icon: '🌡️', rule: 'Two-hour rule', detail: __alloT('stem.kitchenlab.cooked_food_in_danger_zone_40_140_f_in', 'Cooked food in danger zone (40-140°F) → into fridge within 2 hours (1 hour if room is 90°F+).') }
              ].map(function(r, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid #dc2626', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { style: { fontSize: 20 }, 'aria-hidden': 'true' }, r.icon),
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a' } }, r.rule)),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, r.detail));
              }))),

          // ─── Top 9 Allergens ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.the_top_9_allergens_fda_faster_act', '⚠️ The Top 9 Allergens (FDA + FASTER Act)')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.these_9_cause_90_of_all_severe_food_al', 'These 9 cause ~90% of all severe food allergic reactions in the US. Sesame was added in 2023. By law, packaged food must declare these. The "hidden in" column matters most — that\'s where surprises happen.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              ALLERGENS_9.map(function(a, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid #eab308', padding: '12px 14px', borderRadius: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, a.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, a.name),
                      h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                        'Prevalence: ' + a.prev))),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 6 } }, a.notes),
                  h('div', { style: { fontSize: 10, color: '#fbbf24', lineHeight: 1.5, background: 'rgba(234,179,8,0.08)', padding: '6px 8px', borderRadius: 6 } },
                    h('b', null, __alloT('stem.kitchenlab.hidden_in', '🕵️ Hidden in: ')), a.hiddenIn));
              })))
        );
      }

      // ─── WHO Handwash 20-second timer ───
      function renderHandwashTimer() {
        var started = d.handwashStart;
        var baseElapsed = Math.min(20, Math.max(0, d.handwashElapsedSec || 0));
        var elapsed = started ? Math.min(20, baseElapsed + (Date.now() - started) / 1000) : baseElapsed;
        var paused = !!d.handwashPaused;
        var pct = Math.min(100, (elapsed / 20) * 100);
        if (started && !_handwashTickHandle && !_handwashCompleteHandle) {
          setTimeout(function() {
            if (!_handwashTickHandle && !_handwashCompleteHandle) scheduleHandwashTimers(20 - elapsed);
          }, 0);
        }
        return h('div', { style: cardStyle() },
          h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.20_second_handwash_cdc_who', '🧼 20-Second Handwash (CDC + WHO)')),
          h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
            __alloT('stem.kitchenlab.soap_20_seconds_friction_the_minimum_f', 'Soap + 20 seconds + friction = the minimum for hand sanitation in a kitchen. The mechanical action (friction) is what dislodges bacteria — soap loosens them, water rinses them away.')),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: started ? pauseHandwashTimer : startOrResumeHandwashTimer,
              'aria-pressed': started ? 'true' : 'false',
              style: { padding: '10px 18px', background: started ? '#b45309' : '#15803d', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
              started ? '⏸ Pause timer' : paused ? '▶ Resume timer' : elapsed >= 20 ? '↻ Start again' : '▶ Start 20s timer'),
            (paused || elapsed > 0) ? h('button', { type: 'button', onClick: resetHandwashTimer,
              style: { padding: '10px 14px', background: 'transparent', color: '#fde68a', border: '1px solid rgba(251,146,60,0.5)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.reset_timer', 'Reset timer')) : null,
            h('div', { style: { flex: 1, minWidth: 200 } },
              h('div', { role: 'progressbar', 'aria-label': __alloT('stem.kitchenlab.a11y_handwash_timer_progress', 'Handwash timer progress'), 'aria-valuemin': 0, 'aria-valuemax': 20, 'aria-valuenow': Math.round(elapsed),
                style: { height: 12, background: 'rgba(15,23,42,0.6)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)' } },
                h('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', transition: started ? 'width 0.5s linear' : 'none' } })),
              h('div', { role: 'timer', 'aria-live': 'off', style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' } },
                Math.round(elapsed) + ' / 20 sec' + (elapsed >= 20 ? ' ✓ complete' : paused ? ' — paused' : '')))),
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
              return h('li', { key: i, style: { display: 'flex', gap: 10, padding: '6px 0', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', borderBottom: i < 9 ? '1px solid rgba(100,116,139,0.15)' : 'none' } },
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
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.pick_a_cut_to_learn', 'Pick a cut to learn')),
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
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, b.val));
              }))),

          // ─── Why uniformity matters ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.why_uniformity_matters', '🎯 Why Uniformity Matters')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
              __alloT('stem.kitchenlab.when_pieces_are_different_sizes_they_f', 'When pieces are different sizes, they finish cooking at different times. Small pieces burn while large pieces are still raw. Uniform cuts = uniform cook = no kitchen guessing.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              h('div', { style: { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: 12 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.uneven_cuts', '❌ Uneven cuts')),
                h('div', { style: { fontSize: 11, color: '#fecaca', lineHeight: 1.55 } }, __alloT('stem.kitchenlab.small_pieces_blacken_at_6_min_while_la', 'Small pieces blacken at 6 min while large pieces are still raw inside at 12 min. You either eat charcoal + crunchy, or you cook so long the small pieces are inedible.'))),
              h('div', { style: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 12 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.uniform_cuts', '✅ Uniform cuts')),
                h('div', { style: { fontSize: 11, color: '#bbf7d0', lineHeight: 1.55 } }, __alloT('stem.kitchenlab.every_piece_reaches_doneness_at_the_sa', 'Every piece reaches doneness at the same moment. You can leave the pan and trust the clock. This is why professional kitchens drill knife skills before anything else.'))))),

          // ─── Knife grip + safety ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.the_claw_grip_finger_safety', '✋ The Claw Grip (Finger Safety)')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
              __alloT('stem.kitchenlab.curl_your_guiding_fingers_inward_so_yo', 'Curl your guiding fingers INWARD so your knuckles face the blade, not your fingertips. The flat of the blade slides along your knuckles as a guide. If the knife slips, it slides up your knuckle wall — not into your fingertip.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              [
                { rule: 'A sharp knife is safer than a dull one', why: 'A sharp knife cuts where you aim. A dull knife slips off the food and into your hand. Most kitchen knife injuries are from dull knives.' },
                { rule: 'Anchor the cutting board with a damp towel', why: 'A cutting board that slides while you cut is a thumb-loss waiting to happen. Damp towel under the board = friction = stable.' },
                { rule: 'Knife points DOWN when walking', why: 'If you trip, the blade goes into the floor, not your leg. Never carry a knife pointed up or at others.' },
                { rule: 'Never try to catch a falling knife', why: 'Step back, let it fall, sweep up the floor when it lands. Reflex-catching dropped knives is how cooks lose fingers.' },
                { rule: 'Wash knives alone — never in a soapy sink', why: 'Hidden blade under bubbles is the #1 kitchen ER scenario. Wash separately, dry, return to block immediately.' },
                { rule: 'Tuck thumb behind fingers when slicing', why: 'Your thumb is the last finger to curl — it sticks out. Tuck it BEHIND your other fingers so the knife can\'t reach it.' }
              ].map(function(r, i) {
                return h('div', { key: i, style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #fb923c', padding: '10px 12px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a', marginBottom: 4 } }, r.rule),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, r.why));
              })))
        );
      }

      // ─── SVG visualization of a knife cut ───
      function renderCutSvg(cut) {
        // Different shapes per cut family
        var label = cut.name + ' knife-cut diagram';
        if (cut.id === 'largeDice') return cubeGrid(3, 28, '#fb923c', label);
        if (cut.id === 'mediumDice') return cubeGrid(4, 22, '#fb923c', label);
        if (cut.id === 'smallDice') return cubeGrid(6, 14, '#fb923c', label);
        if (cut.id === 'brunoise') return cubeGrid(10, 8, '#fb923c', label);
        if (cut.id === 'julienne') return matchsticks(8, 60, 4, '#fb923c', label);
        if (cut.id === 'chiffonade') return ribbons(6, '#86efac', label);
        if (cut.id === 'mince') return cubeGrid(14, 4, '#fb923c', label);
        return roughChunks(6, '#fb923c', label);
      }
      function cubeGrid(cols, size, color, label) {
        var rows = cols;
        var w = cols * size + (cols + 1) * 4;
        var hH = rows * size + (rows + 1) * 4;
        var cells = [];
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            cells.push(h('rect', { key: r + '-' + c, x: 4 + c * (size + 4), y: 4 + r * (size + 4), width: size, height: size, fill: color, rx: 2, opacity: 0.85 }));
          }
        }
        return h('svg', { role: 'img', 'aria-label': label, width: Math.min(w, 280), height: Math.min(hH, 130), viewBox: '0 0 ' + w + ' ' + hH, style: { maxWidth: '100%' } }, cells);
      }
      function matchsticks(count, len, width, color, label) {
        var w = (width + 4) * count + 4;
        var hH = len + 8;
        var ms = [];
        for (var i = 0; i < count; i++) {
          ms.push(h('rect', { key: i, x: 4 + i * (width + 4), y: 4, width: width, height: len, fill: color, rx: 1, opacity: 0.85 }));
        }
        return h('svg', { role: 'img', 'aria-label': label, width: Math.min(w, 280), height: hH, viewBox: '0 0 ' + w + ' ' + hH, style: { maxWidth: '100%' } }, ms);
      }
      function ribbons(count, color, label) {
        var ribs = [];
        for (var i = 0; i < count; i++) {
          ribs.push(h('rect', { key: i, x: 4, y: 4 + i * 16, width: 240, height: 4, fill: color, rx: 2, opacity: 0.85 }));
        }
        return h('svg', { role: 'img', 'aria-label': label, width: 260, height: count * 16 + 8, viewBox: '0 0 260 ' + (count * 16 + 8), style: { maxWidth: '100%' } }, ribs);
      }
      function roughChunks(count, color, label) {
        var chunks = [];
        var positions = [[10, 10, 50, 35], [80, 15, 40, 45], [140, 8, 60, 28], [20, 60, 45, 50], [90, 65, 55, 30], [170, 50, 50, 45]];
        for (var i = 0; i < count && i < positions.length; i++) {
          var p = positions[i];
          chunks.push(h('rect', { key: i, x: p[0], y: p[1], width: p[2], height: p[3], fill: color, rx: 6, opacity: 0.75 + (i % 3) * 0.08 }));
        }
        return h('svg', { role: 'img', 'aria-label': label, width: 240, height: 120, viewBox: '0 0 240 120', style: { maxWidth: '100%' } }, chunks);
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
          if (Math.abs(diff) <= 25) return { label: '✅ Perfect for ' + tech.name, color: '#22c55e', note: __alloT('stem.kitchenlab.pan_is_at_the_right_temp_for_this_tech', 'Pan is at the right temp for this technique. Food browns + cooks evenly.') };
          if (diff < -25) return { label: __alloT('stem.kitchenlab.too_cold', '🥶 Too cold'), color: '#38bdf8', note: __alloT('stem.kitchenlab.below_threshold_food_will_steam_in_its', 'Below threshold — food will steam in its own juices instead of browning. No Maillard. Gray + soggy.') };
          if (diff > 25 && diff <= 75) return { label: __alloT('stem.kitchenlab.hot_but_tolerable', '🔥 Hot but tolerable'), color: '#fb923c', note: __alloT('stem.kitchenlab.workable_for_fast_cooks_but_easy_to_bu', 'Workable for fast cooks but easy to burn. Watch carefully.') };
          return { label: __alloT('stem.kitchenlab.smoking_risky', '☠️ Smoking + risky'), color: '#dc2626', ink: '#f87171', note: __alloT('stem.kitchenlab.past_the_smoke_point_of_most_cooking_o', 'Past the smoke point of most cooking oils. Acrolein-forming, bitter flavors, fire risk. Reduce heat or change oil to one with higher smoke point (avocado, refined peanut, ghee).') };
        })();
        return h('div', null,
          panelHeader('🔥 Heat & Technique',
            'Eight cooking methods. Each one is a different relationship between food + heat + water + fat. Picking the right method matters more than picking the right recipe — wrong method ruins good ingredients.'),

          // ─── Technique picker ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.pick_a_technique', 'Pick a technique')),
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
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } }, tech.whatHappens),
            // Slider
            h('div', { style: { marginBottom: 14 } },
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 6, fontWeight: 700 } },
                h('span', null, __alloT('stem.kitchenlab.your_pan_temperature', 'Your pan temperature')),
                h('span', { style: { color: heatVerdict.ink || heatVerdict.color, fontFamily: 'ui-monospace, Menlo, monospace' } }, panTemp + '°F')),
              h('input', { type: 'range', min: 100, max: 500, step: 5, value: panTemp,
                onChange: function(e) { setKL({ heatPanTempF: parseInt(e.target.value, 10) }); },
                'aria-label': units === 'C' ? __alloT('stem.kitchenlab.pan_temperature_in_celsius', 'Pan temperature in Celsius') : __alloT('stem.kitchenlab.pan_temperature_in_fahrenheit', 'Pan temperature in Fahrenheit'),
                style: { width: '100%', accentColor: heatVerdict.color } })),
            h('div', { style: { background: heatVerdict.color + '18', border: '1px solid ' + heatVerdict.color + '55', borderLeft: '4px solid ' + heatVerdict.color, padding: '10px 12px', borderRadius: 10 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: heatVerdict.ink || heatVerdict.color, marginBottom: 4 } }, heatVerdict.label),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, heatVerdict.note))),

          // ─── Try it: the technique's typical time in a pan at this temperature ───
          (function() {
            var foodId = d.heatFood || HEAT_DEFAULT_FOOD[selId] || 'mushrooms';
            var food = sandboxFood(foodId);
            var secs = HEAT_MICRO_SEC[selId] || 300;
            var live = microCook(food, panTemp, secs);
            var runs = d.heatRuns || [];
            var fd = food.doneness;
            var interior = live.foodEndF < fd.setF ? 'not set (' + Math.round(live.foodEndF) + '°F; sets from ' + fd.setF + '°F)'
              : food.wet ? 'cooked through (' + Math.round(live.foodEndF) + '°F)'
              : live.foodEndF >= fd.overF ? 'set, then dried (' + Math.round(live.foodEndF) + '°F, past ' + fd.overF + '°F)'
              : 'set (' + Math.round(live.foodEndF) + '°F)';
            var oilLine = live.oil ? (live.smokeSec > 8 ? '🌫️ ' + live.oil.oil + ' smoked (' + live.oil.smokeF + '°F) for ' + Math.round(live.smokeSec) + 's' : live.oil.oil + ' stayed clear (smokes at ' + live.oil.smokeF + '°F)') : (foodId === 'eggs' ? 'butter' : '—');
            var steamLine = live.steamSec > 5 ? '💧 ' + Math.round(live.steamSec) + 's steaming while the surface water left, then browning' : (fd.moisture ? '💧 surface water gone almost at once' : '');
            function logRun() {
              var entry = { tempF: panTemp, foodId: foodId, secs: secs, browning: live.browning, label: live.label.label, color: live.label.color, foodEndF: Math.round(live.foodEndF), interior: interior, sizzle: live.sizzle.caption, smoking: live.smokeSec > 8, tech: tech.name };
              setKL({ heatRuns: runs.concat([entry]).slice(-4) });
              klAnnounce('Logged: ' + food.name + ' at ' + panTemp + '°F for ' + klClock(secs) + ' — ' + live.label.label + ', ' + interior + '.');
            }
            var cell = function(txt, extra) { return h('td', { style: Object.assign({ padding: '6px 8px', fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', borderBottom: '1px solid rgba(100,116,139,0.2)', verticalAlign: 'top' }, extra || {}) }, txt); };
            return h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.try_it_title', '🧪 Try it: ') + klClock(secs) + __alloT('stem.kitchenlab.try_it_in_the_pan_at_this_temperature', ' in the pan at this temperature')),
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 10 } },
                __alloT('stem.kitchenlab.try_it_blurb', 'Same physics as the recipes, run in one go. Pick a food, move the slider above, and read what this technique\'s usual time does to it. Log a run, move the slider, log another — then compare.')),
              h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.kitchenlab.food_for_the_test', 'Food for the test'), style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
                SANDBOX_FOODS.map(function(f) {
                  var on = f.id === foodId;
                  return h('button', { key: f.id, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-kl-heat-food': f.id,
                    onClick: function() { setKL({ heatFood: f.id }); },
                    style: { padding: '8px 12px', background: on ? 'rgba(251,146,60,0.2)' : 'rgba(15,23,42,0.5)', color: on ? '#fde68a' : 'var(--allo-stem-text, #cbd5e1)',
                      border: '1px solid ' + (on ? 'rgba(251,146,60,0.6)' : 'rgba(100,116,139,0.3)'), borderRadius: 8, fontSize: 12, fontWeight: on ? 800 : 600, cursor: 'pointer' } },
                    h('span', { 'aria-hidden': 'true' }, f.icon + ' '), f.name);
                })),
              // Live result for the current slider position
              h('div', { 'data-kl-heat-live': live.label.label, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 } },
                h('div', { style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 10, padding: '10px 12px' } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.surface_after', 'Surface after ') + klClock(secs)),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { 'aria-hidden': 'true', style: { width: 22, height: 22, borderRadius: '50%', background: live.label.color, border: '2px solid rgba(255,255,255,0.35)', flexShrink: 0 } }),
                    h('span', { style: { fontSize: 18, fontWeight: 900, color: live.label.idx >= 4 ? '#fca5a5' : '#fde68a' } }, live.label.label)),
                  h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' } }, 'browning ' + live.browning.toFixed(2) + ' · golden at ' + fd.browningScale[1] + ' · burnt at ' + fd.browningScale[3]),
                  steamLine ? h('div', { style: { fontSize: 11, color: '#7dd3fc', marginTop: 4 } }, steamLine) : null),
                h('div', { style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 10, padding: '10px 12px' } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.interior', 'Interior')),
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: '#fde68a', lineHeight: 1.4 } }, interior),
                  food.safeF ? h('div', { style: { fontSize: 10, color: live.foodEndF >= food.safeF ? '#86efac' : '#fca5a5', marginTop: 4 } }, live.foodEndF >= food.safeF ? '✓ at or above the USDA ' + food.safeF + '°F minimum' : 'below the USDA ' + food.safeF + '°F minimum') : null),
                h('div', { style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 10, padding: '10px 12px' } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.sound_and_oil', 'Sound + oil')),
                  h('div', { style: { fontSize: 12, color: '#fde68a', lineHeight: 1.45 } }, '🔈 ' + live.sizzle.caption),
                  h('div', { style: { fontSize: 11, color: live.smokeSec > 8 ? '#fca5a5' : 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 4, lineHeight: 1.45 } }, oilLine))),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                h('button', { type: 'button', 'data-kl-heat-log': 'log', onClick: logRun,
                  style: { padding: '9px 14px', background: '#0ea5e9', color: '#082f49', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.log_this_run', '📋 Log this run') + ' (' + panTemp + '°F)'),
                runs.length ? h('button', { type: 'button', onClick: function() { setKL({ heatRuns: [] }); },
                  style: { padding: '9px 14px', background: 'transparent', color: 'var(--allo-stem-text-soft, #94a3b8)', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.clear_runs', 'Clear')) : null,
                h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, runs.length ? runs.length + (runs.length === 1 ? ' run logged' : ' runs logged') + ' (last 4 kept)' : __alloT('stem.kitchenlab.log_hint', 'Log a run, then change the temperature and log another to compare.'))),
              runs.length ? h('div', { style: { overflowX: 'auto', marginTop: 12 } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 520 }, 'data-kl-heat-runs': runs.length },
                  h('thead', null, h('tr', null, ['Pan', 'Food', 'Time', 'Surface', 'Interior', 'Sound', 'Oil'].map(function(hd) {
                    return h('th', { key: hd, style: { textAlign: 'left', padding: '4px 8px', fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(100,116,139,0.35)' } }, hd);
                  }))),
                  h('tbody', null, runs.map(function(r, i) {
                    var rf = sandboxFood(r.foodId);
                    return h('tr', { key: i },
                      cell(r.tempF + '°F', { fontFamily: 'ui-monospace, Menlo, monospace', color: '#fde68a', fontWeight: 700 }),
                      cell(rf.icon + ' ' + rf.name),
                      cell(klClock(r.secs)),
                      h('td', { style: { padding: '6px 8px', fontSize: 11, borderBottom: '1px solid rgba(100,116,139,0.2)' } },
                        h('span', { 'aria-hidden': 'true', style: { display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: r.color, border: '1px solid rgba(255,255,255,0.35)', marginRight: 6, verticalAlign: 'middle' } }),
                        h('span', { style: { color: '#fde68a', fontWeight: 700 } }, r.label)),
                      cell(r.interior),
                      cell(r.sizzle),
                      cell(r.smoking ? '🌫️ smoked' : 'clear', { color: r.smoking ? '#fca5a5' : 'var(--allo-stem-text-soft, #94a3b8)' }));
                  })))) : null);
          })(),

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
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, b.val));
              }))),

          // ─── Food examples for this technique ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, '🍽️ Foods that ' + tech.name.toLowerCase() + ' well'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              tech.foodExamples.map(function(f, i) {
                return h('div', { key: i, style: { padding: '8px 12px', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', fontWeight: 600 } }, f);
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
            h('div', { style: { fontSize: 14, fontWeight: 800, color: 'var(--allo-stem-text, #fde68a)', marginBottom: 10 } }, __alloT('stem.kitchenlab.coming_in_the_next_ship', '🚧 Coming in the next ship')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.65, marginBottom: 12 } },
              __alloT('stem.kitchenlab.this_section_is_being_built_below_is_w', 'This section is being built. Below is what\'s planned. The architecture pieces are in place — content depth is what\'s in flight.')),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 12, lineHeight: 1.8 } },
              items.map(function(it, i) { return h('li', { key: i }, it); }))));
      }

      function renderMaillard() {
        var surfF = d.maillardSurfaceF || 300;
        // Find current zone (zones have maxF — first one whose maxF >= surfF wins)
        var zone = MAILLARD_ZONES.find(function(z) { return surfF < z.maxF; }) || MAILLARD_ZONES[MAILLARD_ZONES.length - 1];
        var surfC = Math.round((surfF - 32) * 5 / 9);
        return h('div', null,
          panelHeader('🟫 The Maillard Lab',
            'The browning reaction — the chemistry behind seared steak, toasted bread, roasted coffee, browned butter, and grilled vegetables. Discovered by Louis Camille Maillard in 1912; named after him in the 1950s when its mechanism was finally worked out.'),

          // ─── What it is ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.what_s_actually_happening', '🔬 What\'s actually happening')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, lineHeight: 1.7 } },
              __alloT('stem.kitchenlab.maillard_is_a_cascade_of_chemical_reac', 'Maillard is a cascade of chemical reactions between '),
              h('b', { style: { color: 'var(--allo-stem-text, #fde68a)' } }, __alloT('stem.kitchenlab.amino_acids', 'amino acids')),
              __alloT('stem.kitchenlab.the_building_blocks_of_protein_and', ' (the building blocks of protein) and '),
              h('b', { style: { color: 'var(--allo-stem-text, #fde68a)' } }, __alloT('stem.kitchenlab.reducing_sugars', 'reducing sugars')),
              __alloT('stem.kitchenlab.glucose_fructose_lactose_sugars_that_c', ' (glucose, fructose, lactose — sugars that can give up an electron). It needs heat to start (~280°F / 140°C surface temp), and once running it produces:')),
            h('ul', { style: { color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 12, lineHeight: 1.8, margin: '10px 0 0 0', padding: '0 0 0 20px' } },
              h('li', null, h('b', { style: { color: '#fb923c' } }, __alloT('stem.kitchenlab.melanoidins', 'Melanoidins')), __alloT('stem.kitchenlab.the_brown_pigments_why_crust_is_brown', ' — the brown pigments. Why crust is brown.')),
              h('li', null, h('b', { style: { color: '#fb923c' } }, __alloT('stem.kitchenlab.1000_volatile_aroma_compounds', '1000+ volatile aroma compounds')), __alloT('stem.kitchenlab.pyrazines_nutty_roasty_furans_sweet_ca', ' — pyrazines (nutty/roasty), furans (sweet/caramel), thiophenes (meaty/sulfury). These don\'t exist in raw food at all.')),
              h('li', null, h('b', { style: { color: '#fb923c' } }, __alloT('stem.kitchenlab.complex_flavor', 'Complex flavor')), __alloT('stem.kitchenlab.maillard_is_why_seared_beef_tastes_lik', ' — Maillard is why seared beef tastes like more than the sum of "raw beef + salt." You\'re eating compounds that didn\'t exist 30 seconds earlier.')))),

          // ─── Temperature explorer ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.temperature_explorer', '🌡️ Temperature Explorer')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.drag_the_slider_to_see_what_s_happenin', 'Drag the slider to see what\'s happening at different surface temperatures. Note: '),
              h('b', { style: { color: 'var(--allo-stem-text, #fde68a)' } }, __alloT('stem.kitchenlab.surface_temp_internal_temp', 'surface temp ≠ internal temp')),
              __alloT('stem.kitchenlab.pan_temp_surface_temp_can_be_much_high', ' ≠ pan temp. Surface temp can be much higher than internal because the surface is touching the hot pan or air.')),
            h('div', { style: { marginBottom: 16 } },
              h('label', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 6, fontWeight: 700 } },
                h('span', null, __alloT('stem.kitchenlab.food_surface_temperature', 'Food surface temperature')),
                h('span', { style: { color: zone.ink || '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace' } },
                  surfF + '°F (' + surfC + '°C)')),
              h('input', { type: 'range', min: 100, max: 500, step: 5, value: surfF,
                onChange: function(e) { setKL({ maillardSurfaceF: parseInt(e.target.value, 10) }); },
                'aria-label': units === 'C' ? __alloT('stem.kitchenlab.food_surface_temperature_in_celsius', 'Food surface temperature in Celsius') : __alloT('stem.kitchenlab.food_surface_temperature_in_fahrenheit', 'Food surface temperature in Fahrenheit'),
                style: { width: '100%', accentColor: '#fb923c' } })),
            // Visual swatch
            h('div', { style: { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' } },
              h('div', { 'aria-hidden': 'true',
                style: { width: 120, height: 80, borderRadius: 12, background: zone.color,
                  border: '2px solid rgba(100,116,139,0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: zone.textColor,
                  textAlign: 'center', padding: 8, transition: 'background 0.3s' } },
                __alloT('stem.kitchenlab.visual_color', 'visual color')),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: zone.ink || zone.color, marginBottom: 4 } }, zone.label),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, zone.visual))),
            h('div', { style: { background: 'rgba(15,23,42,0.5)', borderLeft: '3px solid #7dd3fc', padding: '10px 12px', borderRadius: 8 } },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.science', '⚗️ Science')),
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, zone.science))),

          // ─── All 6 zones reference ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.all_six_zones_at_a_glance', '📊 All six zones at a glance')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              MAILLARD_ZONES.map(function(z, i) {
                var prevMax = i === 0 ? 100 : MAILLARD_ZONES[i - 1].maxF;
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,23,42,0.5)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(100,116,139,0.2)' } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 42, height: 42, borderRadius: 8, background: z.color, flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.15)' } }),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a', marginBottom: 2 } }, z.label),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, Menlo, monospace' } },
                      prevMax + '–' + z.maxF + '°F (' + Math.round((prevMax - 32) * 5 / 9) + '–' + Math.round((z.maxF - 32) * 5 / 9) + '°C)')));
              }))),

          // ─── Caramelization vs Maillard ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.caramelization_vs_maillard', '🆚 Caramelization vs Maillard')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.often_confused_they_re_different_react', 'Often confused — they\'re different reactions. Caramelization is sugar alone breaking down. Maillard needs amino acids + reducing sugars together. Most "browning" you see is Maillard, even when called "caramelizing."')),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                h('thead', null,
                  h('tr', { style: { borderBottom: '2px solid rgba(251,146,60,0.3)' } },
                    h('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', color: '#fb923c', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.aspect', 'Aspect')),
                    h('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', color: '#fbbf24', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.caramelization', 'Caramelization')),
                    h('th', { scope: 'col', style: { textAlign: 'left', padding: '8px 12px', color: '#86efac', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.maillard_3', 'Maillard')))),
                h('tbody', null,
                  CARAM_VS_MAILLARD.map(function(row, i) {
                    return h('tr', { key: i, style: { borderBottom: '1px solid rgba(100,116,139,0.15)' } },
                      h('th', { scope: 'row', style: { padding: '10px 12px', color: '#fde68a', fontWeight: 700, verticalAlign: 'top', textAlign: 'left' } }, row.aspect),
                      h('td', { style: { padding: '10px 12px', color: '#fef3c7', verticalAlign: 'top', lineHeight: 1.5 } }, row.caram),
                      h('td', { style: { padding: '10px 12px', color: '#dcfce7', verticalAlign: 'top', lineHeight: 1.5 } }, row.mai));
                  }))))),

          // ─── Browning examples ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.browning_in_the_wild', '🍽️ Browning in the wild')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.same_chemistry_different_foods_each_ca', 'Same chemistry, different foods. Each carries its own characteristic flavor profile because amino acid + reducing sugar mixes differ.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 } },
              BROWNING_EXAMPLES.map(function(b, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid #fb923c', borderRadius: 10, padding: '12px 14px' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 24 }, 'aria-hidden': 'true' }, b.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, b.food),
                      h('div', { style: { fontSize: 10, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 } },
                        'Surface: ' + b.surfaceF))),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, b.story));
              }))),

          // ─── pH effects ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.ph_effects_on_maillard', '⚗️ pH effects on Maillard')),
            h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, marginBottom: 14 } },
              __alloT('stem.kitchenlab.the_acidity_of_your_food_dramatically_', 'The acidity of your food dramatically changes how fast Maillard runs. This is one of the most underused kitchen "cheat codes."')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
              PH_EFFECTS.map(function(p, i) {
                var color = i === 0 ? '#fca5a5' : i === 1 ? '#94a3b8' : i === 2 ? '#86efac' : '#a78bfa';
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.5)', border: '1px solid ' + color + '40',
                    borderLeft: '3px solid ' + color, padding: '12px 14px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: color, marginBottom: 6 } }, p.ph),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginBottom: 6 } }, p.effect),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.55, background: 'rgba(251,146,60,0.08)', padding: '6px 8px', borderRadius: 6 } },
                    h('b', null, __alloT('stem.kitchenlab.use', '💡 Use: ')), p.use));
              }))),

          // ─── Acrylamide warning ───
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #dc2626' }) },
            h('div', { style: Object.assign({}, subheaderStyle(), { color: '#fca5a5' }) }, __alloT('stem.kitchenlab.the_dark_side_acrylamide', '☠️ The dark side: acrylamide')),
            h('div', { style: { color: '#fecaca', fontSize: 12, lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 10px 0' } },
                __alloT('stem.kitchenlab.above_250_f_120_c_starchy_foods_the_am', 'Above ~250°F (120°C), starchy foods + the amino acid '),
                h('b', null, 'asparagine'),
                __alloT('stem.kitchenlab.react_to_form', ' react to form '),
                h('b', null, 'acrylamide'),
                __alloT('stem.kitchenlab.classified_by_iarc_as_a', ' — classified by IARC as a '),
                h('em', null, __alloT('stem.kitchenlab.probable_human_carcinogen', 'probable human carcinogen')),
                __alloT('stem.kitchenlab.group_2a_it_s_the_same_compound_used_i', ' (Group 2A). It\'s the same compound used in some industrial polymer manufacturing.')),
              h('p', { style: { margin: '0 0 10px 0' } },
                __alloT('stem.kitchenlab.foods_most_affected_french_fries_potat', 'Foods most affected: french fries, potato chips, breakfast cereal, toast (especially dark), coffee, baked goods. The darker the brown, the more acrylamide. The FDA campaign tagline:')),
              h('p', { style: { margin: '0 0 10px 0', padding: '8px 12px', background: 'rgba(220,38,38,0.15)', borderRadius: 8, fontWeight: 700, color: 'var(--allo-stem-text, #fde68a)', textAlign: 'center' } },
                __alloT('stem.kitchenlab.go_for_gold_not_brown', '"Go for gold, not brown."')),
              h('p', { style: { margin: 0 } },
                __alloT('stem.kitchenlab.practical_advice_aim_for_golden_yellow', 'Practical advice: aim for golden-yellow on starchy foods, not deep brown. Don\'t store potatoes in the fridge (cold storage raises their reducing-sugar content → more acrylamide when cooked).'))))
        );
      }

      // ─────────────────────────────────────────────────────
      // RECIPE TICK — live cooking simulation
      // ─────────────────────────────────────────────────────
      // Called every 500ms while cooking. Advances pan temp via the
      // thermal model, accumulates active-time when food is in pan,
      // tracks max pan temp for the final judgement.
      function recipeTick() {
        setKL(function(prior) {
          // Self-terminate the interval once cooking ends — otherwise the 500ms setInterval keeps
          // firing (and the tick survives navigating away within the tool / unmount). Deferred so the
          // clearInterval side-effect runs outside the state-updater.
          if (prior.recipePhase !== 'cooking') { setTimeout(stopRecipeTick, 0); return {}; }
          var now = Date.now();
          var rec = RECIPES[prior.recipeActiveId];
          var simSpeed = (rec && rec.simSpeedMultiplier) || 1;
          var thermal = getRecipeThermal(rec, prior.klPanMaterial);
          // Back after more than a minute (laptop sleep, a suspended tab, the app
          // reopened): pause where we left off rather than apply the gap. The
          // clamp below still catches the 2-60 s gaps.
          if (prior.recipeLastTickAt && now - prior.recipeLastTickAt > 60000) {
            setTimeout(stopRecipeTick, 0);
            setTimeout(function() { klAnnounce(__alloT('stem.kitchenlab.sr_paused_while_away', 'Your cook was paused while you were away. Resume when you are ready.')); }, 0);
            return { recipePhase: 'paused', recipePausedAt: prior.recipeLastTickAt, recipeAutoPaused: true };
          }
          // Clamp the real-time step. Browsers throttle or suspend background
          // timers, so an unclamped dt applied a whole tab-switch (or laptop
          // sleep) as one tick: 120 s away = 120 s of cooking on return.
          // The visibilitychange guard pauses first; this catches the rest.
          var dtRealSec = Math.min(2, Math.max(0, (now - (prior.recipeLastTickAt || now)) / 1000));
          var dtSec = dtRealSec * simSpeed;
          var newTemp = tickPanTemp(prior.recipePanTempF || 70, prior.recipeBurnerLevel || 0, dtSec, thermal);
          var hasFood = (prior.recipeItemsInPan || []).length > 0;
          var newActiveTime = (prior.recipeActiveTimeSec || 0) + (hasFood ? dtSec : 0);
          var food = advanceDoneness(prior, rec, newTemp, dtSec, now);
          var simNow = (prior.recipeSimElapsedSec || 0) + dtSec;
          // Temperature trace: one sample per traceStep sim-seconds; once 240
          // points are held, keep every other one and double the step, so the
          // whole cook stays on the chart at any length (it used to keep the
          // last 120 ticks = 60 s, the tail of a 10-minute chicken).
          var hist = prior.recipeTempHistory || [];
          var traceStep = prior.recipeTraceStepSec || 1;
          var lastT = hist.length && hist[hist.length - 1].t != null ? hist[hist.length - 1].t : -Infinity;
          if (simNow - lastT >= traceStep - 1e-6) {
            hist = hist.concat([{ t: Math.round(simNow * 10) / 10, pan: Math.round(newTemp), food: Math.round(food.recipeFoodInternalF), b: Math.round(food.recipeBrowning * 100) / 100 }]);
            if (hist.length > 240) { hist = hist.filter(function(_, i) { return i % 2 === 0; }); traceStep *= 2; }
          }
          var patch = Object.assign({
            recipePanTempF: newTemp,
            recipeMaxPanTempF: Math.max(prior.recipeMaxPanTempF || 0, newTemp),
            recipeSimElapsedSec: simNow,
            recipeActiveTimeSec: newActiveTime,
            recipeLastTickAt: now,
            recipeTempHistory: hist,
            recipeTraceStepSec: traceStep
          }, food);
          // Competition mode: accumulate burner-level samples for the
          // "heat efficient" constraint, and trip the deadline if we run
          // out of time.
          if (prior.competitionActive) {
            patch.competitionBurnerLevelSum = (prior.competitionBurnerLevelSum || 0) + (prior.recipeBurnerLevel || 0) * dtSec;
            patch.competitionBurnerLevelTicks = (prior.competitionBurnerLevelTicks || 0) + dtSec;
          }
          // Pot phase machine for multi-pot recipes
          var potPatch = tickPotPhase(prior, simSpeed);
          if (Object.keys(potPatch).length) Object.assign(patch, potPatch);
          // No-sweat tracking: if food is in pan + new pan temp dipped below 200°F,
          // mark coldDipAfterFood
          if (hasFood && newTemp < 200 && !prior.coldDipAfterFood) {
            patch.coldDipAfterFood = true;
          }
          return patch;
        });
      }
      // Pot phase machine — sidecar to the main vessel for pasta recipes.
      // Pot reaches boiling ~3 sim-minutes after startPot. Pasta cooks
      // for ~9 sim-minutes after dropPasta. State transitions happen
      // here on each tick.
      function tickPotPhase(prior, simSpeed) {
        var nowMs = Date.now();
        var rec = RECIPES[prior.recipeActiveId];
        if (!rec || !rec.multiPot) return {};
        var phase = prior.potState || 'cold';
        if (phase === 'heating' && prior.potStartedAt) {
          var simSec = ((nowMs - prior.potStartedAt) / 1000) * simSpeed;
          // 3 sim-min (180 sim-sec) for water to come to boil
          if (simSec >= 180) return { potState: 'boiling' };
        } else if (phase === 'pasta-in' && prior.potPastaInAt) {
          var simSec2 = ((nowMs - prior.potPastaInAt) / 1000) * simSpeed;
          // 9 sim-min for pasta to cook
          if (simSec2 >= 540) return { potState: 'pasta-done', potPastaDoneAt: nowMs };
        }
        return {};
      }
      function startPot() {
        setKL(function(prior) {
          if (prior.potState !== 'cold') return {};
          return { potState: 'heating', potStartedAt: Date.now() };
        });
        klAnnounce(__alloT('stem.kitchenlab.sr_pasta_pot_turned_on_water_will_boil_in_about_3_mi', 'Pasta pot turned on. Water will boil in about 3 minutes.'));
      }
      function dropPasta() {
        setKL(function(prior) {
          if (prior.potState !== 'boiling') return {};
          return { potState: 'pasta-in', potPastaInAt: Date.now() };
        });
        klAnnounce(__alloT('stem.kitchenlab.sr_pasta_dropped_into_boiling_water_about_9_minutes', 'Pasta dropped into boiling water. About 9 minutes to al dente.'));
      }
      function drainPasta(reserveWater) {
        setKL(function(prior) {
          if (prior.potState !== 'pasta-done' && prior.potState !== 'pasta-in') return {};
          return { potState: 'drained', potDrainedAt: Date.now(), potWaterReserved: !!reserveWater };
        });
        klAnnounce(reserveWater ? 'Pasta drained, water reserved.' : 'Pasta drained.');
      }
      function startRecipeTick() {
        if (_recipeTickHandle) return;
        _recipeTickHandle = setInterval(recipeTick, 500);
      }
      function stopRecipeTick() {
        if (_recipeTickHandle) { clearInterval(_recipeTickHandle); _recipeTickHandle = null; }
        klAudioSet(0, 'quiet', false);
      }
      function pauseRecipe() {
        if (d.recipePhase !== 'cooking') return;
        var pausedAt = Date.now();
        stopRecipeTick();
        setKL({ recipePhase: 'paused', recipePausedAt: pausedAt });
        klAnnounce(__alloT('stem.kitchenlab.sr_cooking_paused_recipe_and_competition_timers_are', 'Cooking paused. Recipe and competition timers are stopped.'));
      }
      function resumeRecipe() {
        if (d.recipePhase !== 'paused' || !d.recipePausedAt) return;
        var now = Date.now();
        var pausedFor = Math.max(0, now - d.recipePausedAt);
        function shiftTimestamp(value) { return value ? value + pausedFor : value; }
        var shiftedItemTimes = {};
        Object.keys(d.recipeItemAddTimes || {}).forEach(function(key) {
          shiftedItemTimes[key] = shiftTimestamp(d.recipeItemAddTimes[key]);
        });
        setKL({
          recipePhase: 'cooking', recipePausedAt: null, recipeAutoPaused: false,
          recipeStartedAt: shiftTimestamp(d.recipeStartedAt),
          recipeStepStartedAt: shiftTimestamp(d.recipeStepStartedAt),
          recipeLastTickAt: now,
          recipeHeatRemovedAt: shiftTimestamp(d.recipeHeatRemovedAt),
          recipeFoodSetAt: shiftTimestamp(d.recipeFoodSetAt),
          recipeItemAddTimes: shiftedItemTimes,
          potStartedAt: shiftTimestamp(d.potStartedAt),
          potPastaInAt: shiftTimestamp(d.potPastaInAt),
          potPastaDoneAt: shiftTimestamp(d.potPastaDoneAt),
          potDrainedAt: shiftTimestamp(d.potDrainedAt),
          competitionStartedAt: shiftTimestamp(d.competitionStartedAt),
          competitionDeadline: shiftTimestamp(d.competitionDeadline)
        });
        klAnnounce(__alloT('stem.kitchenlab.sr_cooking_resumed', 'Cooking resumed.'));
      }
      // Latest closure for the hidden-tab guard (module-scope listener above)
      _klPauseHook = pauseRecipe;
      // Auto-start/stop the tick based on phase (called from render below)
      function ensureTickMatches(phase) {
        if (phase === 'cooking' && !_recipeTickHandle) setTimeout(startRecipeTick, 0);
        else if (phase !== 'cooking' && _recipeTickHandle) setTimeout(stopRecipeTick, 0);
      }

      // ─────────────────────────────────────────────────────
      // Recipe action handlers
      // ─────────────────────────────────────────────────────
      function startRecipe(recipeId) {
        var recipe = RECIPES[recipeId];
        if (!recipe) return;
        setKL({
          recipeActiveId: recipeId,
          recipePhase: 'cooking',
          recipePausedAt: null,
          recipeStartedAt: Date.now(),
          recipeLastTickAt: Date.now(),
          recipeStepStartedAt: Date.now(),
          recipeCurrentStep: 0,
          recipePanTempF: 70,
          recipeBurnerLevel: 0,
          recipeMaxPanTempF: 70,
          recipeFoodInternalF: 40,
          recipeItemsInPan: [],
          recipeIngredientOrder: [],
          recipeItemAddTimes: {}, recipeItemAddPanF: {}, recipeItemAddSimSec: {}, recipeHeatRemovedSimSec: null, recipeLastStirSimSec: null, recipeStirCount: 0, recipeUnattendedSec: 0, recipeTraceStepSec: 1, recipeOil: null, recipeSmokeSec: 0, recipeOptions: {}, recipeMarks: {}, recipeMoisture: 0, recipeSteamSec: 0,
          recipeActiveTimeSec: 0,
          recipeHeatRemovedAt: null,
          recipeTempHistory: [],
          recipeBrowning: 0, recipeFoodPeakF: 40, recipeFoodSetAt: null, recipeSecAboveOverF: 0, recipeSimElapsedSec: 0,
          recipeJudgement: null,
          // Reset pot state for multi-pot recipes
          potState: 'cold', potStartedAt: null, potPastaInAt: null,
          potPastaDoneAt: null, potDrainedAt: null, potWaterReserved: false,
          // Reset constraint trackers
          twoStepHeatAchieved: false, coldDipAfterFood: false, hadHighBurner: false,
          klNewAchievements: []
        });
        klAnnounce('Started cooking ' + recipe.name + '. Step 1: ' + recipe.steps[0].title);
        awardXP(5);
      }
      function abortRecipe() {
        setKL({ recipePhase: 'idle', recipeActiveId: null, recipeJudgement: null, recipePausedAt: null,
          competitionActive: false, competitionConstraints: [], competitionDeadline: null, pendingConfirmation: null });
        klAnnounce(__alloT('stem.kitchenlab.sr_recipe_abandoned', 'Recipe abandoned.'));
      }
      function openConfirmation(kind) {
        if (typeof document !== 'undefined') _klConfirmReturnEl = document.activeElement;
        setKL({ pendingConfirmation: kind });
        setTimeout(function() {
          if (typeof document === 'undefined') return;
          var cancel = document.getElementById('kitchen-confirm-cancel');
          if (cancel) cancel.focus();
        }, 0);
      }
      function closeConfirmation() {
        setKL({ pendingConfirmation: null });
        setTimeout(function() {
          if (_klConfirmReturnEl && typeof _klConfirmReturnEl.focus === 'function') _klConfirmReturnEl.focus();
          _klConfirmReturnEl = null;
        }, 0);
      }
      function confirmPendingAction() {
        var kind = d.pendingConfirmation;
        if (kind === 'tournament') exitTournament();
        else abortRecipe();
        setTimeout(function() {
          var region = typeof document !== 'undefined' ? document.getElementById('kitchen-lab-region') : null;
          if (region) region.focus();
          _klConfirmReturnEl = null;
        }, 0);
      }
      function renderConfirmationDialog() {
        var tournament = d.pendingConfirmation === 'tournament';
        var title = tournament ? 'Abandon tournament?' : 'Abandon this recipe?';
        var description = tournament ? 'Your current tournament progress and round will be discarded.' : 'Your current cooking progress will be discarded.';
        return h('div', {
            onClick: function(e) { if (e.target === e.currentTarget) closeConfirmation(); },
            style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(10,7,4,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
          },
          h('div', { id: 'kitchen-confirm-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'kitchen-confirm-title', 'aria-describedby': 'kitchen-confirm-description',
              onKeyDown: function(e) { trapDialogFocus(e, 'kitchen-confirm-dialog', closeConfirmation); },
              style: { maxWidth: 460, width: '100%', background: '#1c1410', color: '#f1f5f9', border: '2px solid rgba(248,113,113,0.65)', borderRadius: 14, padding: 24, boxShadow: '0 18px 60px rgba(0,0,0,0.6)' } },
            h('h2', { id: 'kitchen-confirm-title', style: { fontSize: 20, fontWeight: 900, color: '#fecaca', margin: '0 0 10px' } }, title),
            h('p', { id: 'kitchen-confirm-description', style: { fontSize: 13, lineHeight: 1.6, color: '#cbd5e1', margin: '0 0 20px' } }, description),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } },
              h('button', { id: 'kitchen-confirm-cancel', type: 'button', onClick: closeConfirmation,
                style: { padding: '10px 16px', background: 'transparent', color: '#f1f5f9', border: '1px solid #94a3b8', borderRadius: 8, fontWeight: 700, cursor: 'pointer' } }, 'Keep cooking'),
              h('button', { id: 'kitchen-confirm-action', type: 'button', onClick: confirmPendingAction,
                style: { padding: '10px 16px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' } },
                tournament ? 'Abandon tournament' : 'Abandon recipe'))));
      }

      // ─── Tournament Mode (3-round bracket) ───
      // Round 1: 1 random constraint, full time
      // Round 2: 2 random constraints, 80% time
      // Round 3: 3 constraints (Restaurant Standard FORCED + 2 random), 60% time
      function startTournament() {
        var unlocked = RECIPE_CATALOG.filter(function(r) { return r.unlocked; });
        // Shuffle + pick 3 (allow dupes if fewer than 3 unlocked)
        var pool = unlocked.slice();
        for (var i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        var recipes = [];
        for (var r = 0; r < 3; r++) recipes.push((pool[r] || pool[0]).id);
        // Roll constraints per round
        var roundConstraints = [];
        for (var rr = 0; rr < 3; rr++) {
          var nNeeded = rr + 1;  // 1, 2, 3 constraints per round
          var cPool = COMPETITION_CONSTRAINTS.slice();
          // Round 3 forces gradeA + speedDemon, plus 1 random
          if (rr === 2) {
            var forced = ['gradeA', 'speedDemon'];
            cPool = cPool.filter(function(c) { return forced.indexOf(c.id) === -1; });
            for (var s = cPool.length - 1; s > 0; s--) {
              var j2 = Math.floor(Math.random() * (s + 1));
              var t2 = cPool[s]; cPool[s] = cPool[j2]; cPool[j2] = t2;
            }
            roundConstraints.push(forced.concat([cPool[0].id]));
          } else {
            for (var s2 = cPool.length - 1; s2 > 0; s2--) {
              var j3 = Math.floor(Math.random() * (s2 + 1));
              var t3 = cPool[s2]; cPool[s2] = cPool[j3]; cPool[j3] = t3;
            }
            var picked = [];
            for (var p = 0; p < nNeeded; p++) picked.push(cPool[p].id);
            roundConstraints.push(picked);
          }
        }
        setKL({
          tournamentActive: true,
          tournamentRound: 0,
          tournamentRecipes: recipes,
          tournamentConstraintIds: roundConstraints,
          tournamentScores: [],
          competitionLastResult: null
        });
        klAnnounce(__alloT('stem.kitchenlab.sr_tournament_started_3_rounds_escalating_difficulty', 'Tournament started. 3 rounds, escalating difficulty.'));
        awardXP(15);
        // Start Round 1
        setTimeout(function() { startTournamentRound(0); }, 50);
      }

      function startTournamentRound(roundIdx) {
        setKL(function(prior) {
          var rid = (prior.tournamentRecipes || [])[roundIdx];
          var rec = RECIPES[rid];
          if (!rec) return {};
          var constraints = (prior.tournamentConstraintIds || [])[roundIdx] || [];
          // Time fraction per round: 1.0, 0.8, 0.6
          var timeFrac = roundIdx === 0 ? 1.0 : roundIdx === 1 ? 0.8 : 0.6;
          var simSpeed = rec.simSpeedMultiplier || 1;
          var deadline = Date.now() + (rec.targetTimeMin * 60 * 1000 * timeFrac / simSpeed);
          return {
            recipeActiveId: rid,
            recipePhase: 'cooking',
            recipePausedAt: null,
            recipeStartedAt: Date.now(),
            recipeLastTickAt: Date.now(),
            recipeStepStartedAt: Date.now(),
            recipeCurrentStep: 0,
            recipePanTempF: 70,
            recipeBurnerLevel: 0,
            recipeMaxPanTempF: 70,
            recipeFoodInternalF: 40,
            recipeItemsInPan: [],
            recipeIngredientOrder: [],
            recipeItemAddTimes: {}, recipeItemAddPanF: {}, recipeItemAddSimSec: {}, recipeHeatRemovedSimSec: null, recipeLastStirSimSec: null, recipeStirCount: 0, recipeUnattendedSec: 0, recipeTraceStepSec: 1, recipeOil: null, recipeSmokeSec: 0, recipeOptions: {}, recipeMarks: {}, recipeMoisture: 0, recipeSteamSec: 0,
            recipeActiveTimeSec: 0,
            recipeHeatRemovedAt: null,
            recipeTempHistory: [],
            recipeBrowning: 0, recipeFoodPeakF: 40, recipeFoodSetAt: null, recipeSecAboveOverF: 0, recipeSimElapsedSec: 0,
            recipeJudgement: null,
            potState: 'cold', potStartedAt: null, potPastaInAt: null,
            potPastaDoneAt: null, potDrainedAt: null, potWaterReserved: false,
            competitionActive: true,
            competitionConstraints: constraints,
            competitionDeadline: deadline,
            competitionStartedAt: Date.now(),
            competitionBurnerChanges: 0,
            competitionBurnerLevelSum: 0,
            competitionBurnerLevelTicks: 0,
            tournamentRound: roundIdx,
            aiCritique: null, aiCritiqueLoading: false, aiCritiqueRequestedFor: null,
            twoStepHeatAchieved: false, coldDipAfterFood: false, hadHighBurner: false,
            klNewAchievements: []
          };
        });
        klAnnounce('Round ' + (roundIdx + 1) + ' of 3 begins.');
      }

      function advanceTournament() {
        var next = (d.tournamentRound || 0) + 1;
        if (next >= 3) {
          // Tournament complete — finalize + detect tournament achievements
          var total = (d.tournamentScores || []).reduce(function(a, b) { return a + b; }, 0);
          setKL(function(prior) {
            var newBest = Math.max(prior.tournamentBestTotal || 0, total);
            var newCount = (prior.tournamentsCompleted || 0) + 1;
            var stateForCheck = Object.assign({}, prior, { tournamentsCompleted: newCount });
            var newAchievements = detectNewAchievements(stateForCheck, {
              recipe: null, judgement: null, compResult: null,
              isCompetition: false, isTournament: true,
              tournamentResult: { total: total, scores: prior.tournamentScores }
            });
            var allUnlocked = (prior.klUnlockedAchievements || []).slice();
            newAchievements.forEach(function(a) { if (allUnlocked.indexOf(a.id) === -1) allUnlocked.push(a.id); });
            return {
              recipePhase: 'tournament-done',
              tournamentLastTotal: total,
              tournamentBestTotal: newBest,
              tournamentsCompleted: newCount,
              tournamentActive: false,
              competitionActive: false,
              klUnlockedAchievements: allUnlocked,
              klNewAchievements: newAchievements.map(function(a) { return a.id; })
            };
          });
          awardXP(20);
          klAnnounce('Tournament complete. Total score: ' + total);
        } else {
          startTournamentRound(next);
          awardXP(5);
        }
      }

      function exitTournament() {
        setKL({ recipePhase: 'idle', recipeActiveId: null, recipePausedAt: null,
          tournamentActive: false, tournamentRound: 0, tournamentRecipes: [],
          tournamentConstraintIds: [], tournamentScores: [],
          competitionActive: false, competitionConstraints: [], competitionDeadline: null,
          aiCritique: null, aiCritiqueLoading: false, pendingConfirmation: null });
      }

      // ─── AI Judge (Gemini-powered personalized critique) ───
      function requestAiCritique(rec, judgement) {
        var callGemini = ctx.callGemini;
        if (!callGemini) return;  // gracefully skip if AI not wired
        var runId = d.recipeStartedAt;
        if (d.aiCritiqueRequestedFor === runId) return;  // already requested for this run
        // Build the prompt
        var compResult = judgement.compResult;
        var displayScore = compResult ? compResult.finalScore : judgement.score;
        var notesSummary = (judgement.notes || []).map(function(n) {
          return (n.neg ? '✗ ' : '✓ ') + n.label + ' — ' + n.detail;
        }).join('\n');
        var prompt = [
          'You are a friendly but honest cooking coach. A student just simulated cooking "' + rec.name + '" and scored ' + displayScore + '/100 (Grade ' + judgement.grade + ').',
          '',
          'Their pass/fail notes:',
          notesSummary,
          '',
          compResult ? 'They were in competition mode with constraints: ' + compResult.constraints.map(function(c) { return c.label + ' (' + (c.passed ? 'passed' : 'failed') + ')'; }).join(', ') : '',
          '',
          'Write a 2-3 sentence personalized critique (max 80 words). Tone: encouraging but specific. Highlight ONE thing they did well, then ONE specific thing to work on next time. No hedging, no padding, no greeting. Plain text — no markdown, no quotes.'
        ].filter(Boolean).join('\n');
        // Mark as requested + loading
        setKL({ aiCritiqueRequestedFor: runId, aiCritiqueLoading: true });
        callGemini(prompt, false).then(function(result) {
          var text = typeof result === 'string' ? result : (result && result.text ? result.text : '');
          text = String(text || '').trim().replace(/^["']|["']$/g, '');
          if (!text) text = 'Couldn\'t generate notes this time. Score breakdown above tells the story.';
          setKL({ aiCritique: text, aiCritiqueLoading: false });
        }).catch(function() {
          setKL({ aiCritique: null, aiCritiqueLoading: false });
        });
      }

      // ─── AI Recipe Suggester (Gemini-powered) ───
      // Asks Gemini to pick ONE of the 7 unlocked recipes based on the
      // student's free-text constraints (pantry, time, mood, audience).
      // Returns recipeId + a paragraph of reasoning.
      function openSuggester() {
        if (typeof document !== 'undefined') _klSuggesterReturnEl = document.activeElement;
        setKL({ suggesterOpen: true, suggesterInput: '', suggesterResult: null, suggesterError: null });
        setTimeout(function() {
          if (typeof document === 'undefined') return;
          var close = document.getElementById('kitchen-suggester-close');
          if (close) close.focus();
        }, 0);
      }
      function closeSuggester() {
        setKL({ suggesterOpen: false, suggesterLoading: false, suggesterError: null });
        setTimeout(function() {
          if (_klSuggesterReturnEl && typeof _klSuggesterReturnEl.focus === 'function') _klSuggesterReturnEl.focus();
          _klSuggesterReturnEl = null;
        }, 0);
      }
      function runSuggester(input) {
        var callGemini = ctx.callGemini;
        if (!callGemini) {
          setKL({ suggesterError: 'AI suggester is offline. Try a recipe directly from the list below.' });
          return;
        }
        var unlocked = RECIPE_CATALOG.filter(function(r) { return r.unlocked; });
        var catalogJson = unlocked.map(function(r) {
          var fullRec = RECIPES[r.id];
          return {
            id: r.id, name: r.name, difficulty: r.difficulty,
            description: fullRec ? fullRec.description : r.blurb,
            cookingMode: fullRec ? fullRec.cookingMode || 'pan' : 'pan',
            targetTimeMin: fullRec ? fullRec.targetTimeMin : 5,
            teaches: fullRec ? fullRec.teaches : []
          };
        });
        var userPrompt = (input || '').trim() || 'Just suggest something good for tonight.';
        var prompt = [
          'You are a friendly cooking coach helping a student pick a recipe to cook in the simulator. Here are the 7 recipes available:',
          '',
          JSON.stringify(catalogJson, null, 2),
          '',
          'The student says: "' + userPrompt + '"',
          '',
          'Pick ONE recipe ID from the list above and return JSON in this exact shape:',
          '{ "recipeId": "<one of the IDs>", "reasoning": "2-3 sentences (max 80 words) explaining why this matches their situation. Encouraging but specific. Plain text, no markdown." }',
          '',
          'Only the JSON object, no commentary, no code fences.'
        ].join('\n');
        setKL({ suggesterLoading: true, suggesterResult: null, suggesterError: null });
        callGemini(prompt, true).then(function(result) {
          var raw = typeof result === 'string' ? result : (result && result.text ? result.text : '');
          raw = String(raw || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          var startIdx = raw.indexOf('{'); var endIdx = raw.lastIndexOf('}');
          if (startIdx < 0 || endIdx <= startIdx) {
            setKL({ suggesterLoading: false, suggesterError: 'Suggester returned an unexpected response. Try rephrasing.' });
            return;
          }
          var parsed;
          try { parsed = JSON.parse(raw.substring(startIdx, endIdx + 1)); }
          catch (e) { setKL({ suggesterLoading: false, suggesterError: 'Suggester response was malformed.' }); return; }
          var rid = String(parsed.recipeId || '');
          var reasoning = String(parsed.reasoning || '').trim();
          var validIds = unlocked.map(function(r) { return r.id; });
          if (validIds.indexOf(rid) === -1) {
            setKL({ suggesterLoading: false, suggesterError: 'Suggester picked an invalid recipe. Try again.' });
            return;
          }
          setKL({ suggesterLoading: false, suggesterResult: { recipeId: rid, reasoning: reasoning } });
        }).catch(function() {
          setKL({ suggesterLoading: false, suggesterError: 'Couldn\'t reach the suggester. Try again later.' });
        });
      }
      function startCompetition() {
        // Pick a random unlocked recipe from the catalog
        var unlocked = RECIPE_CATALOG.filter(function(r) { return r.unlocked; });
        var pick = unlocked[Math.floor(Math.random() * unlocked.length)];
        var recipe = RECIPES[pick.id];
        if (!recipe) return;
        var constraints = rollCompetitionConstraints();
        // If any constraint imposes a time fraction, set deadline
        var timeFrac = null;
        for (var i = 0; i < constraints.length; i++) {
          if (constraints[i].timeLimitFrac) { timeFrac = constraints[i].timeLimitFrac; break; }
        }
        var simSpeed = recipe.simSpeedMultiplier || 1;
        // Wall-clock deadline scales down by sim-speed (oven recipes are
        // simulated at 12× so the deadline is 1/12 of the sim time).
        var deadline = timeFrac ? Date.now() + (recipe.targetTimeMin * 60 * 1000 * (timeFrac + 0.4) / simSpeed) : null;
        // Reset everything + flag competition
        setKL({
          recipeActiveId: recipe.id,
          recipePhase: 'cooking',
          recipePausedAt: null,
          recipeStartedAt: Date.now(),
          recipeLastTickAt: Date.now(),
          recipeStepStartedAt: Date.now(),
          recipeCurrentStep: 0,
          recipePanTempF: 70,
          recipeBurnerLevel: 0,
          recipeMaxPanTempF: 70,
          recipeFoodInternalF: 40,
          recipeItemsInPan: [],
          recipeIngredientOrder: [],
          recipeItemAddTimes: {}, recipeItemAddPanF: {}, recipeItemAddSimSec: {}, recipeHeatRemovedSimSec: null, recipeLastStirSimSec: null, recipeStirCount: 0, recipeUnattendedSec: 0, recipeTraceStepSec: 1, recipeOil: null, recipeSmokeSec: 0, recipeOptions: {}, recipeMarks: {}, recipeMoisture: 0, recipeSteamSec: 0,
          recipeActiveTimeSec: 0,
          recipeHeatRemovedAt: null,
          recipeTempHistory: [],
          recipeBrowning: 0, recipeFoodPeakF: 40, recipeFoodSetAt: null, recipeSecAboveOverF: 0, recipeSimElapsedSec: 0,
          recipeJudgement: null,
          competitionActive: true,
          competitionConstraints: constraints.map(function(c) { return c.id; }),
          competitionDeadline: deadline,
          competitionStartedAt: Date.now(),
          competitionBurnerChanges: 0,
          competitionBurnerLevelSum: 0,
          competitionBurnerLevelTicks: 0
        });
        klAnnounce('Competition started: ' + recipe.name + '. Constraints: ' + constraints.map(function(c) { return c.label; }).join(', '));
        awardXP(8);
      }
      function setBurner(level) {
        setKL(function(prior) {
          var patch = { recipeBurnerLevel: level };
          // If turning to 0 while food is in pan, record heat-removal time
          if (level === 0 && (prior.recipeItemsInPan || []).length > 0 && !prior.recipeHeatRemovedAt) {
            patch.recipeHeatRemovedAt = Date.now();
            patch.recipeHeatRemovedSimSec = prior.recipeSimElapsedSec || 0;
          }
          // Competition mode: count distinct burner-level changes for the
          // "minimalist" constraint. Only count if value actually changes.
          if (prior.competitionActive && (prior.recipeBurnerLevel || 0) !== level) {
            patch.competitionBurnerChanges = (prior.competitionBurnerChanges || 0) + 1;
          }
          // Two-step heat tracking: mark when burner went ≥6 then dropped to ≤5
          if (level >= 6) patch.hadHighBurner = true;
          if (level <= 5 && prior.hadHighBurner && !prior.twoStepHeatAchieved) {
            patch.twoStepHeatAchieved = true;
          }
          return patch;
        });
      }
      function addItem(itemId) {
        setKL(function(prior) {
          if ((prior.recipeItemsInPan || []).indexOf(itemId) !== -1) return {};
          var newItems = (prior.recipeItemsInPan || []).slice(); newItems.push(itemId);
          var newOrder = (prior.recipeIngredientOrder || []).slice(); newOrder.push(itemId);
          var newTimes = Object.assign({}, prior.recipeItemAddTimes || {}); newTimes[itemId] = Date.now();
          // Pan temp at the moment the item went in: what a sear or a garlic
          // step actually depends on (a peak reached later does not count).
          var newPanF = Object.assign({}, prior.recipeItemAddPanF || {}); newPanF[itemId] = Math.round(prior.recipePanTempF || 70);
          var simNow = prior.recipeSimElapsedSec || 0;
          var newSim = Object.assign({}, prior.recipeItemAddSimSec || {}); newSim[itemId] = simNow;
          // Cold food pulls the pan down; how far depends on the pan's thermal mass
          // (cast iron 15°F, thin non-stick 60°F). Only the main food item does this,
          // and only on the stovetop — the oven cavity does not notice a tray.
          var recNow = RECIPES[prior.recipeActiveId];
          var dnNow = recipeDoneness(recNow, prior);
          var mainItem = dnNow.browningFrom || itemId;
          var patch = { recipeItemsInPan: newItems, recipeIngredientOrder: newOrder, recipeItemAddTimes: newTimes, recipeItemAddPanF: newPanF,
            recipeItemAddSimSec: newSim, recipeLastStirSimSec: simNow };
          if (itemId === mainItem && !(recNow && recNow.cookingMode === 'oven')) {
            patch.recipePanTempF = Math.max(70, (prior.recipePanTempF || 70) - panMaterial(prior.klPanMaterial).foodDropF);
          }
          // The main ingredient brings its surface water with it
          if (itemId === mainItem && dnNow.moisture) patch.recipeMoisture = initialMoisture(recNow, prior);
          // Some ingredients cool the pan on their own (deglazing water): ing.cools in °F
          var ingNow = recipeIngredients(recNow, prior).find(function(i) { return i.id === itemId; });
          if (ingNow && ingNow.cools) {
            patch.recipePanTempF = Math.max(70, (patch.recipePanTempF != null ? patch.recipePanTempF : (prior.recipePanTempF || 70)) - ingNow.cools);
          }
          // Adding an ingredient means you are at the pan: it resets the unattended clock
          return patch;
        });
        klAnnounce('Added ' + itemId);
      }
      // The technique step made concrete. For a dish that must be kept moving
      // it resets the unattended clock; for a searing chicken breast (stir.disturbs)
      // every move breaks pan contact and gives back a fifth of the crust so far.
      function stirPan() {
        var rec = RECIPES[d.recipeActiveId];
        var stir = recipeDoneness(rec, d).stir;
        if (!stir) return;
        setKL(function(prior) {
          if (prior.recipePhase !== 'cooking' || !(prior.recipeItemsInPan || []).length) return {};
          var patch = { recipeLastStirSimSec: prior.recipeSimElapsedSec || 0, recipeStirCount: (prior.recipeStirCount || 0) + 1 };
          if (stir.disturbs) patch.recipeBrowning = (prior.recipeBrowning || 0) * 0.8;
          return patch;
        });
        klAnnounce(stir.disturbs ? __alloT('stem.kitchenlab.sr_moved_the_chicken_crust_interrupted', 'Moved the chicken. Crust interrupted.') : stir.label + '.');
      }
      function toggleSizzle() {
        var next = !d.klSizzleOn;
        if (next) { var a = klAudioEnsure(); if (a && a.ctx.state === 'suspended') { try { a.ctx.resume().catch(function() {}); } catch (e) { /* ignore */ } } }
        else klAudioSet(0, 'quiet', false);
        setKL({ klSizzleOn: next });
        klAnnounce(next ? __alloT('stem.kitchenlab.sr_sizzle_sound_on', 'Sizzle sound on.') : __alloT('stem.kitchenlab.sr_sizzle_sound_off', 'Sizzle sound off.'));
      }
      function nextStep() {
        setKL(function(prior) {
          var rec = RECIPES[prior.recipeActiveId];
          if (!rec) return {};
          var next = (prior.recipeCurrentStep || 0) + 1;
          if (next >= rec.steps.length) {
            // Done — judge!
            var elapsedSec = prior.recipeStartedAt ? (Date.now() - prior.recipeStartedAt) / 1000 : 0;
            var avgBurner = prior.competitionBurnerLevelTicks > 0
              ? (prior.competitionBurnerLevelSum / prior.competitionBurnerLevelTicks) : 0;
            var snapshot = {
              maxPanTempF: prior.recipeMaxPanTempF || 0,
              activeTimeSec: prior.recipeActiveTimeSec || 0,
              foodInternalF: prior.recipeFoodInternalF || 40,
              itemAddTimes: prior.recipeItemAddTimes || {},
              itemAddPanF: prior.recipeItemAddPanF || {},
              panMaterial: prior.klPanMaterial || 'stainless',
              options: prior.recipeOptions || {},
              marks: prior.recipeMarks || {},
              ingredientOrder: prior.recipeIngredientOrder || [],
              heatRemovedAt: prior.recipeHeatRemovedAt,
              stepsCompleted: rec.steps.length,
              lastTickAt: prior.recipeLastTickAt,
              heatRemovedBeforeOverdone: prior.recipeHeatRemovedAt && (prior.recipeActiveTimeSec || 0) < 150,
              // Competition context
              elapsedSec: elapsedSec,
              burnerChanges: prior.competitionBurnerChanges || 0,
              avgBurnerLevel: avgBurner,
              startedAt: prior.recipeStartedAt,
              twoStepHeatAchieved: prior.twoStepHeatAchieved,
              coldDipAfterFood: prior.coldDipAfterFood,
              // Integrated doneness state (see recipeTick). Judges read this
              // so one dish cannot be "browned hard" and "runny" at once.
              doneness: {
                browning: prior.recipeBrowning || 0,
                foodPeakF: prior.recipeFoodPeakF || 40,
                secAboveOverF: prior.recipeSecAboveOverF || 0,
                setAt: prior.recipeFoodSetAt || null,
                set: !!prior.recipeFoodSetAt,
                simElapsedSec: prior.recipeSimElapsedSec || 0,
                stirCount: prior.recipeStirCount || 0,
                unattendedSec: prior.recipeUnattendedSec || 0,
                smokeSec: prior.recipeSmokeSec || 0,
                oil: oilFor(rec, prior),
                steamSec: prior.recipeSteamSec || 0,
                moistureAtEnd: prior.recipeMoisture || 0
              }
            };
            var judgement = rec.judge(snapshot, prior);
            var compResult = null;
            // If competition: apply constraint modifiers
            if (prior.competitionActive) {
              snapshot.baseScore = judgement.score;
              var bonusTotal = 0, penaltyTotal = 0;
              var constraintResults = [];
              (prior.competitionConstraints || []).forEach(function(cid) {
                var c = COMPETITION_CONSTRAINTS.find(function(x) { return x.id === cid; });
                if (!c) return;
                var r = c.check(snapshot, rec);
                if (r.passed) bonusTotal += c.bonus;
                else penaltyTotal += c.penalty;
                constraintResults.push({ id: cid, label: c.label, description: c.description,
                  passed: r.passed, points: r.passed ? c.bonus : c.penalty, resultText: r.resultText });
              });
              var compScore = Math.max(0, Math.min(150, judgement.score + bonusTotal + penaltyTotal));
              var prevBest = (prior.competitionBests || {})[rec.id] || 0;
              var isNewBest = compScore > prevBest;
              var newBests = Object.assign({}, prior.competitionBests || {});
              if (isNewBest) newBests[rec.id] = compScore;
              compResult = {
                baseScore: judgement.score,
                baseGrade: judgement.grade,
                bonusTotal: bonusTotal,
                penaltyTotal: penaltyTotal,
                finalScore: compScore,
                isNewBest: isNewBest,
                previousBest: prevBest,
                constraints: constraintResults
              };
              // Merge competition flavor into judgement.verdict
              judgement = Object.assign({}, judgement, { compResult: compResult });
              // Record tournament round score (if in tournament)
              var tournamentScores = prior.tournamentScores || [];
              if (prior.tournamentActive) {
                tournamentScores = tournamentScores.slice();
                tournamentScores[prior.tournamentRound || 0] = compScore;
              }
              // Achievement detection for competition runs
              var newCompleted = (prior.recipeCompletedIds || []).indexOf(rec.id) === -1
                ? (prior.recipeCompletedIds || []).slice().concat([rec.id])
                : (prior.recipeCompletedIds || []);
              var newAGraded = (prior.aGradedRecipeIds || []).slice();
              if (judgement.grade === 'A' && newAGraded.indexOf(rec.id) === -1) newAGraded.push(rec.id);
              var stateForCheck = Object.assign({}, prior, { recipeCompletedIds: newCompleted, aGradedRecipeIds: newAGraded });
              var newAchievements = detectNewAchievements(stateForCheck, {
                recipe: rec, judgement: judgement, compResult: compResult,
                isCompetition: true, isTournament: prior.tournamentActive, tournamentResult: null
              });
              var allUnlocked = (prior.klUnlockedAchievements || []).slice();
              newAchievements.forEach(function(a) { if (allUnlocked.indexOf(a.id) === -1) allUnlocked.push(a.id); });
              // Persist new best
              return {
                recipePhase: 'done',
                recipeJudgement: judgement,
                recipeCurrentStep: rec.steps.length - 1,
                competitionBests: newBests,
                competitionLastResult: compResult,
                tournamentScores: tournamentScores,
                recipeCompletedIds: newCompleted,
                aGradedRecipeIds: newAGraded,
                klUnlockedAchievements: allUnlocked,
                klNewAchievements: newAchievements.map(function(a) { return a.id; })
              };
            }
            // Sandbox: a readout, not a completion — no unlocks, no achievements
            if (rec.sandbox) {
              return { recipePhase: 'done', recipeJudgement: judgement, recipeCurrentStep: rec.steps.length - 1, klNewAchievements: [] };
            }
            // Non-competition: persist completion as normal
            var completed = (prior.recipeCompletedIds || []).slice();
            if (completed.indexOf(rec.id) === -1) completed.push(rec.id);
            // Detect newly-unlocked achievements
            var aGraded = (prior.aGradedRecipeIds || []).slice();
            if (judgement.grade === 'A' && aGraded.indexOf(rec.id) === -1) aGraded.push(rec.id);
            var stateForCheck = Object.assign({}, prior, { recipeCompletedIds: completed, aGradedRecipeIds: aGraded });
            var newAchievements = detectNewAchievements(stateForCheck, {
              recipe: rec, judgement: judgement, compResult: null,
              isCompetition: false, isTournament: false, tournamentResult: null
            });
            var allUnlocked = (prior.klUnlockedAchievements || []).slice();
            newAchievements.forEach(function(a) { if (allUnlocked.indexOf(a.id) === -1) allUnlocked.push(a.id); });
            return {
              recipePhase: 'done',
              recipeJudgement: judgement,
              recipeCompletedIds: completed,
              recipeCurrentStep: rec.steps.length - 1,
              aGradedRecipeIds: aGraded,
              klUnlockedAchievements: allUnlocked,
              klNewAchievements: newAchievements.map(function(a) { return a.id; })
            };
          }
          var advance = { recipeCurrentStep: next, recipeStepStartedAt: Date.now() };
          // A step can record the moment it completes (the pancake flip), so the
          // judge and the trace can tell before from after.
          var finishing = rec.steps[prior.recipeCurrentStep || 0];
          if (finishing && finishing.record) {
            var marks = Object.assign({}, prior.recipeMarks || {});
            marks[finishing.record] = { simSec: prior.recipeSimElapsedSec || 0, browning: prior.recipeBrowning || 0, foodF: prior.recipeFoodInternalF || 40, panF: prior.recipePanTempF || 70, icon: finishing.recordIcon || '🔖' };
            advance.recipeMarks = marks;
          }
          return advance;
        });
        awardXP(3);
      }

      function detectNewAchievements(state, ctxObj) {
        var already = state.klUnlockedAchievements || [];
        var newly = [];
        ACHIEVEMENTS.forEach(function(a) {
          if (already.indexOf(a.id) !== -1) return;
          try {
            if (a.check(state, ctxObj)) newly.push(a);
          } catch (e) { /* defensive */ }
        });
        return newly;
      }
      // Check if current step's completion criteria are met (for auto-advance)
      function maybeAutoAdvance() {
        var rec = RECIPES[d.recipeActiveId];
        if (!rec || d.recipePhase !== 'cooking') return;
        var step = rec.steps[d.recipeCurrentStep || 0];
        if (!step) return;
        var auto = step.completeWhen;
        if (auto === 'panInRange' && step.target.panTempF) {
          var t = d.recipePanTempF || 0;
          if (t >= step.target.panTempF.min && t <= step.target.panTempF.max) {
            nextStep();
            klAnnounce(__alloT('stem.kitchenlab.sr_pan_in_range_step_complete', 'Pan in range — step complete.'));
          }
        } else if (auto === 'itemAdded' && step.target.itemAdded) {
          if ((d.recipeItemsInPan || []).indexOf(step.target.itemAdded) !== -1) {
            nextStep();
          }
        } else if (auto === 'heatRemoved') {
          if ((d.recipeBurnerLevel || 0) === 0) {
            nextStep();
            klAnnounce(__alloT('stem.kitchenlab.sr_heat_removed_carryover_cooking_begins', 'Heat removed — carryover cooking begins.'));
          }
        } else if (auto === 'internalTempReached' && step.target.foodInternalF) {
          var ft = d.recipeFoodInternalF || 40;
          if (ft >= step.target.foodInternalF.min) {
            nextStep();
            klAnnounce('Internal temp ' + Math.round(ft) + '°F — step complete.');
          }
        } else if (auto === 'potStateReached' && step.target.potState) {
          if ((d.potState || 'cold') === step.target.potState) {
            nextStep();
            klAnnounce('Pot reached ' + step.target.potState + '.');
          }
        }
      }

      // ─────────────────────────────────────────────────────
      // The main recipe view
      // ─────────────────────────────────────────────────────
      function renderRecipe() {
        // A cook left running when the app was closed comes back PAUSED, not
        // resumed: the student decides when the clock restarts, and resume shifts
        // every timestamp (a competition deadline included) by the time away.
        var stale = d.recipePhase === 'cooking' && d.recipeLastTickAt && (Date.now() - d.recipeLastTickAt) > 60000;
        if (stale) {
          setTimeout(function() {
            setKL(function(prior) {
              if (prior.recipePhase !== 'cooking' || !prior.recipeLastTickAt || (Date.now() - prior.recipeLastTickAt) <= 60000) return {};
              return { recipePhase: 'paused', recipePausedAt: prior.recipeLastTickAt, recipeAutoPaused: true };
            });
            klAnnounce(__alloT('stem.kitchenlab.sr_paused_while_away', 'Your cook was paused while you were away. Resume when you are ready.'));
          }, 0);
        }
        // Manage tick lifecycle based on current phase
        ensureTickMatches(stale ? 'paused' : d.recipePhase);
        // Auto-advance check on every render
        if (d.recipePhase === 'cooking') setTimeout(maybeAutoAdvance, 0);

        if (d.recipePhase === 'idle' || !d.recipeActiveId) return renderRecipePicker();
        if (d.recipePhase === 'tournament-done') return renderTournamentFinal();
        if (d.recipePhase === 'done') return renderRecipeResults();
        return renderRecipeCockpit();
      }

      function renderTournamentFinal() {
        var scores = d.tournamentScores || [];
        var total = scores.reduce(function(a, b) { return a + (b || 0); }, 0);
        var maxPossible = 450;
        var pct = total / maxPossible;
        var medal = pct >= 0.89 ? { icon: '🥇', label: __alloT('stem.kitchenlab.gold', 'Gold'), color: '#fbbf24', subtitle: __alloT('stem.kitchenlab.master_chef_tier_extraordinary_command', 'Master chef tier — extraordinary command of heat, timing, and constraint.') } :
                    pct >= 0.71 ? { icon: '🥈', label: __alloT('stem.kitchenlab.silver', 'Silver'), color: 'var(--allo-stem-text, #cbd5e1)', subtitle: __alloT('stem.kitchenlab.real_cook_confident_across_heat_ranges', 'Real cook. Confident across heat ranges + constraints.') } :
                    pct >= 0.53 ? { icon: '🥉', label: __alloT('stem.kitchenlab.bronze', 'Bronze'), color: '#d97706', subtitle: __alloT('stem.kitchenlab.solid_home_cook_some_constraints_still', 'Solid home cook. Some constraints still tripping you up.') } :
                                  { icon: '🍳', label: __alloT('stem.kitchenlab.honorable_mention', 'Honorable Mention'), color: 'var(--allo-stem-text-soft, #94a3b8)', subtitle: __alloT('stem.kitchenlab.you_made_it_through_tournament_punishe', 'You made it through. Tournament punishes mistakes — that\'s the point.') };
        var isNewBest = total === (d.tournamentBestTotal || 0) && total > 0;
        return h('div', null,
          panelHeader('🏆 Tournament Complete',
            'Three rounds. Escalating difficulty. Final standing:'),
          // Medal hero
          h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 40 }) },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 80, lineHeight: 1, marginBottom: 8 } }, medal.icon),
            h('div', { style: { fontSize: 28, fontWeight: 900, color: medal.color, letterSpacing: '-0.01em' } }, medal.label),
            h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 8, fontStyle: 'italic', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 } }, medal.subtitle),
            h('div', { style: { fontSize: 56, fontWeight: 900, color: medal.color, fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 18, lineHeight: 1 } }, total),
            h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 4 } }, 'out of ' + maxPossible + ' (' + Math.round(pct * 100) + '%)'),
            isNewBest ? h('div', { style: { marginTop: 16, padding: '10px 18px', background: 'rgba(251,191,36,0.18)',
                border: '1px solid rgba(251,191,36,0.5)', borderRadius: 9999, display: 'inline-block',
                fontSize: 13, fontWeight: 800, color: '#fbbf24' } },
              __alloT('stem.kitchenlab.new_personal_best', '🌟 New personal best!')) : null),
          // Per-round breakdown
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.round_by_round', '📋 Round-by-round')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              scores.map(function(score, i) {
                var rid = (d.tournamentRecipes || [])[i];
                var rname = (RECIPE_CATALOG.find(function(x) { return x.id === rid; }) || {}).name || '—';
                var constraintIds = (d.tournamentConstraintIds || [])[i] || [];
                var constraints = constraintIds.map(function(cid) {
                  var c = COMPETITION_CONSTRAINTS.find(function(x) { return x.id === cid; });
                  return c ? c.label : '';
                }).filter(Boolean);
                var scoreColor = score >= 130 ? '#86efac' : score >= 100 ? '#fbbf24' : score >= 70 ? '#fb923c' : '#fca5a5';
                return h('div', { key: i,
                  style: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                    background: 'rgba(15,23,42,0.6)', borderRadius: 10,
                    borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + scoreColor } },
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', minWidth: 80 } }, 'Round ' + (i + 1)),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: '#fde68a' } }, rname),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 3, lineHeight: 1.4 } },
                      'Constraints: ' + constraints.join(' • '))),
                  h('div', { style: { fontSize: 24, fontWeight: 900, color: scoreColor, fontFamily: 'ui-monospace, Menlo, monospace' } },
                    score || 0));
              }))),
          // Action buttons
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: function() { startTournament(); awardXP(3); },
              style: { padding: '12px 26px', background: '#fbbf24', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.new_tournament', '🏅 New tournament')),
            h('button', { onClick: function() { exitTournament(); },
              style: { padding: '12px 24px', background: 'transparent', color: '#fde68a',
                border: '1px solid rgba(251,146,60,0.4)', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.back_to_recipe_list', '🍽️ Back to recipe list')))
        );
      }

      // ─── Recipe picker (idle screen) ───
      function renderRecipePicker() {
        var completed = d.recipeCompletedIds || [];
        var unlockedCount = RECIPE_CATALOG.filter(function(r) { return r.unlocked; }).length;
        var bests = d.competitionBests || {};
        var bestEntries = Object.entries(bests).sort(function(a, b) { return b[1] - a[1]; });
        return h('div', null,
          // AI Suggester modal (only when open)
          d.suggesterOpen ? renderSuggesterModal() : null,
          panelHeader('🍽️ Real-Time Recipe Simulator',
            'Run an actual recipe in real time. Manage heat, time your additions, fix mistakes mid-cook. Mistakes have visible consequences. Success unlocks the next recipe.'),

          // ─── AI SUGGESTER CARD ───
          ctx.callGemini ? h('div', { style: { background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(56,189,248,0.12))',
              border: '2px solid rgba(167,139,250,0.55)', borderRadius: 14, padding: '18px 22px', marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' } },
              h('div', { 'aria-hidden': 'true', style: { fontSize: 38, lineHeight: 1, flexShrink: 0 } }, '🤔'),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 16, fontWeight: 800, color: '#e9d5ff', letterSpacing: '-0.01em', marginBottom: 4 } }, __alloT('stem.kitchenlab.what_should_i_cook_tonight', 'What should I cook tonight?')),
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 10 } },
                  __alloT('stem.kitchenlab.tell_the_ai_what_you_have_how_much_tim', 'Tell the AI what you have, how much time, or who you\'re feeding — it picks the right recipe from your unlocked list + explains why.')),
                h('button', { onClick: function() { openSuggester(); awardXP(2); },
                  style: { padding: '10px 18px', background: '#a78bfa', color: '#1c1410',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.ask_the_ai_chef', '💡 Ask the AI chef'))))) : null,
          // ─── COMPETITION MODE CARD (above the tutorial recipes) ───
          h('div', { style: { background: 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(251,146,60,0.18))',
              border: '2px solid rgba(251,146,60,0.6)', borderRadius: 14, padding: '20px 22px', marginBottom: 16,
              boxShadow: '0 4px 14px rgba(251,146,60,0.15)' } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' } },
              h('div', { 'aria-hidden': 'true', style: { fontSize: 44, lineHeight: 1, flexShrink: 0 } }, '🏆'),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 18, fontWeight: 900, color: '#fde68a', letterSpacing: '-0.01em', marginBottom: 4 } }, __alloT('stem.kitchenlab.competition_mode', 'Competition Mode')),
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 12 } },
                  __alloT('stem.kitchenlab.chopped_style_challenge_random_recipe_', 'Chopped-style challenge. Random recipe + 2 mystery constraints (time pressure, heat caps, ingredient discipline, restaurant-grade standard, and more). Combine recipe skill + constraint mastery for a score up to 150. Beat your personal best.')),
                h('button', { onClick: function() { startCompetition(); awardXP(3); },
                  style: { padding: '12px 22px', background: '#fb923c', color: '#1c1410',
                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(251,146,60,0.4)' } },
                  __alloT('stem.kitchenlab.start_a_random_challenge', '🎲 Start a random challenge')))),
            // Tournament mode entry inside same card
            h('div', { style: { marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(251,146,60,0.25)',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
              h('div', { 'aria-hidden': 'true', style: { fontSize: 32, lineHeight: 1, flexShrink: 0 } }, '🏅'),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a', marginBottom: 2 } }, __alloT('stem.kitchenlab.tournament_mode_3_rounds', 'Tournament Mode (3 rounds)')),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
                  __alloT('stem.kitchenlab.round_1_1_constraint_full_time_round_2', 'Round 1: 1 constraint, full time. Round 2: 2 constraints, 80% time. Round 3: 3 constraints (Restaurant Standard + Speed Demon forced), 60% time. Compete for cumulative score across 450 points.'))),
              h('button', { onClick: function() { startTournament(); awardXP(3); },
                style: { padding: '10px 18px', background: 'transparent', color: '#fde68a',
                  border: '2px solid rgba(251,146,60,0.6)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' } },
                __alloT('stem.kitchenlab.start_tournament', '🏅 Start tournament')),
              (d.tournamentBestTotal || 0) > 0 ? h('div', { style: { fontSize: 11, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace' } },
                'Best ever: ' + (d.tournamentBestTotal || 0) + ' / 450') : null),
            bestEntries.length > 0 ? h('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(251,146,60,0.25)' } },
              h('div', { style: { fontSize: 10, fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } }, __alloT('stem.kitchenlab.your_personal_bests', '🥇 Your personal bests')),
              h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                bestEntries.map(function(e) {
                  var ridName = (RECIPE_CATALOG.find(function(x) { return x.id === e[0]; }) || {}).name || e[0];
                  return h('div', { key: e[0],
                    style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(251,146,60,0.3)',
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#fde68a',
                      display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 800, color: '#86efac' } }, e[1]),
                    h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)' } }, ridName));
                }))) : null),
          // ─── Achievements panel ───
          (function() {
            var unlocked = d.klUnlockedAchievements || [];
            var byTier = { bronze: [], silver: [], gold: [] };
            ACHIEVEMENTS.forEach(function(a) {
              (byTier[a.tier] || byTier.bronze).push(Object.assign({}, a, { unlocked: unlocked.indexOf(a.id) !== -1 }));
            });
            return h('div', { style: cardStyle() },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 12 } },
                h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.achievements', '🏆 Achievements')),
                h('div', { style: { fontSize: 12, color: '#fbbf24', fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700 } },
                  unlocked.length + ' / ' + ACHIEVEMENTS.length + ' unlocked')),
              ['gold', 'silver', 'bronze'].map(function(tier) {
                var color = tier === 'gold' ? '#fbbf24' : tier === 'silver' ? '#cbd5e1' : '#d97706';
                return h('div', { key: tier, style: { marginBottom: 12 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } }, tier),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 } },
                    byTier[tier].map(function(a) {
                      return h('div', { key: a.id, title: a.description,
                        style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                          background: a.unlocked ? 'rgba(15,23,42,0.7)' : 'rgba(15,23,42,0.4)',
                          border: '1px solid ' + (a.unlocked ? color + '60' : 'rgba(100,116,139,0.2)'),
                          borderRadius: 6, opacity: a.unlocked ? 1 : 0.45 } },
                        h('div', { 'aria-hidden': 'true', style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, a.unlocked ? a.icon : '🔒'),
                        h('div', { style: { flex: 1, minWidth: 0 } },
                          h('div', { style: { fontSize: 11, fontWeight: 700, color: a.unlocked ? '#fde68a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, a.name)));
                    })));
              }));
          })(),

          // ─── Tutorial progress ───
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.tutorial_mode_recipes_mastered', '📖 Tutorial mode — recipes mastered')),
            h('div', { style: { display: 'flex', gap: 20, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace' } }, completed.length + ' / ' + unlockedCount + ' unlocked'),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.recipes_mastered', 'recipes mastered'))),
              h('div', { style: { flex: 1, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.55, minWidth: 240 } },
                __alloT('stem.kitchenlab.tutorial_mode_is_the_unhurried_run_no_', 'Tutorial mode is the unhurried run — no time pressure, no constraints. Use it to learn each recipe before taking it into competition. v0.5 adds Competition Mode + personal bests. v0.6 will unlock multi-pot recipes (Pasta + Pan Sauce, Sheet-Pan, Roast Chicken).')))),

          // ─── The 3D Recipe Kitchen ───
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #86efac' }) },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' } },
              h('div', { 'aria-hidden': 'true', style: { fontSize: 38, lineHeight: 1, flexShrink: 0 } }, '🍝'),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('div', { style: { fontSize: 16, fontWeight: 800, color: '#bbf7d0', marginBottom: 4 } }, __alloT('stem.kitchenlab.recipe_kitchen_title', 'The 3D Recipe Kitchen — two burners, one dish')),
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 10 } },
                  __alloT('stem.kitchenlab.recipe_kitchen_blurb', 'A pasta pot and a sauce pan on a 3D bench, advanced at your own pace: golden mushroom pasta or tomato and garlic pasta, for two or four. Same moisture-and-browning ideas as the recipes here, with replay and a downloadable evidence report.')),
                h('button', { type: 'button', 'data-kl-open-kitchen': 'true', onClick: function() { setSection('recipeKitchen'); },
                  style: { padding: '10px 18px', background: '#22c55e', color: '#052e16', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.open_recipe_kitchen_here', '▶ Open the Recipe Kitchen'))))),

          // ─── Free Cook (sandbox) ───
          (function() {
            var food = sandboxFood(d.sandboxFood);
            return h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #7dd3fc' }) },
              h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' } },
                h('div', { 'aria-hidden': 'true', style: { fontSize: 38, lineHeight: 1, flexShrink: 0 } }, '🧪'),
                h('div', { style: { flex: 1, minWidth: 240 } },
                  h('div', { style: { fontSize: 16, fontWeight: 800, color: '#bae6fd', marginBottom: 4 } }, __alloT('stem.kitchenlab.free_cook', 'Free cook — no steps, no grade')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 10 } },
                    __alloT('stem.kitchenlab.free_cook_blurb', 'Pick a pan, an oil and a food. Heat, add, stir or leave it, pull it when you think it is right — then read what you made in the same terms the recipes are judged on. Good for testing one idea at a time.')),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                    h('label', { htmlFor: 'kl-sandbox-food', style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 700 } }, __alloT('stem.kitchenlab.food_to_cook', 'Food to cook')),
                    h('select', { id: 'kl-sandbox-food', value: food.id, onChange: function(e) { setKL({ sandboxFood: e.target.value }); },
                      style: { padding: '6px 10px', background: 'rgba(15,23,42,0.7)', color: '#fde68a', border: '1px solid rgba(125,211,252,0.4)', borderRadius: 6, fontSize: 12, fontWeight: 600 } },
                      SANDBOX_FOODS.map(function(f) { return h('option', { key: f.id, value: f.id }, f.icon + ' ' + f.name); })),
                    h('button', { type: 'button', 'data-kl-free-cook': 'start', onClick: function() { startRecipe('freeCook'); },
                      style: { padding: '10px 18px', background: '#0ea5e9', color: '#082f49', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                      __alloT('stem.kitchenlab.start_free_cook', '▶ Start free cook'))),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 8, lineHeight: 1.5 } }, 'Reference: ' + food.guide))));
          })(),

          // Recipe cards
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 } },
            RECIPE_CATALOG.map(function(r) {
              var isCompleted = completed.indexOf(r.id) !== -1;
              var isPlayable = r.unlocked;
              var diffColor = r.difficulty === 'easy' ? '#86efac' : r.difficulty === 'medium' ? '#fbbf24' : '#fca5a5';
              return h('div', { key: r.id,
                style: { background: 'rgba(15,23,42,0.6)', border: '1px solid ' + (isPlayable ? 'rgba(251,146,60,0.45)' : 'rgba(100,116,139,0.25)'),
                  borderRadius: 12, padding: '14px 16px', opacity: isPlayable ? 1 : 0.55 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 } },
                  h('div', { 'aria-hidden': 'true', style: { fontSize: 36, lineHeight: 1, flexShrink: 0 } }, r.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a', marginBottom: 2 } }, r.name),
                    h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                      h('span', { style: { fontSize: 9, fontWeight: 700, color: diffColor, background: diffColor + '20', padding: '2px 7px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.05em' } }, r.difficulty),
                      isCompleted ? h('span', { style: { fontSize: 9, fontWeight: 700, color: '#86efac', background: 'rgba(34,197,94,0.15)', padding: '2px 7px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.mastered', '✓ Mastered')) : null,
                      !isPlayable ? h('span', { style: { fontSize: 9, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', background: 'rgba(100,116,139,0.2)', padding: '2px 7px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.kitchenlab.locked', '🔒 Locked')) : null))),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 12 } }, r.blurb),
                isPlayable ? h('button', {
                  onClick: function() { startRecipe(r.id); },
                  style: { width: '100%', padding: '10px 14px', background: '#fb923c', color: '#1c1410',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                  isCompleted ? '🍳 Cook again' : '▶ Start cooking') :
                h('div', { style: { padding: '10px 14px', background: 'rgba(100,116,139,0.15)', color: 'var(--allo-stem-text-soft, #94a3b8)',
                    border: '1px dashed rgba(100,116,139,0.3)', borderRadius: 8, fontSize: 12, textAlign: 'center', fontStyle: 'italic' } },
                  __alloT('stem.kitchenlab.unlocks_in_a_future_ship', 'Unlocks in a future ship')));
            }))
        );
      }

      // ─── Active cooking cockpit ───
      function renderRecipeCockpit() {
        var rec = RECIPES[d.recipeActiveId];
        if (!rec) { setTimeout(abortRecipe, 0); return null; } // defer: abortRecipe calls setKL (no setState-in-render)
        var stepIdx = d.recipeCurrentStep || 0;
        var step = rec.steps[stepIdx] || rec.steps[0];
        var panTemp = Math.round(d.recipePanTempF || 70);
        var burnerLevel = d.recipeBurnerLevel || 0;
        var activeTime = Math.round(d.recipeActiveTimeSec || 0);
        var maxTemp = Math.round(d.recipeMaxPanTempF || 70);
        // Temp color
        var tempColor = panTemp >= 400 ? '#dc2626' : panTemp >= 340 ? '#fb923c' : panTemp >= 220 ? '#fbbf24' : panTemp >= 100 ? '#fde68a' : '#7dd3fc';
        var tempLabel = panTemp >= 400 ? 'Smoking + risky' : panTemp >= 340 ? 'Hot — careful' : panTemp >= 220 ? 'Cooking range' : panTemp >= 100 ? 'Warming up' : 'Cold';
        // When the recipe has said what this step's pan range is, judge the label
        // against that (344°F is "hot, careful" for eggs and exactly right for pancakes).
        var rangeStep = null;
        for (var si = stepIdx; si >= 0; si--) { if (rec.steps[si].target && rec.steps[si].target.panTempF) { rangeStep = rec.steps[si].target.panTempF; break; } }
        if (rangeStep && (rangeStep.min != null || rangeStep.max != null)) {
          if (rangeStep.min != null && panTemp < rangeStep.min) tempLabel = 'below this step\'s range (' + rangeStep.min + '°F+)';
          else if (rangeStep.max != null && panTemp > rangeStep.max) tempLabel = 'above this step\'s range (' + (rangeStep.min != null ? rangeStep.min + '-' : 'up to ') + rangeStep.max + '°F)';
          else tempLabel = '✓ in range for this step' + (rangeStep.min != null && rangeStep.max != null ? ' (' + rangeStep.min + '-' + rangeStep.max + '°F)' : '');
        }
        // Available ingredients to add (not yet in pan + step allows it)
        var availableItems = recipeIngredients(rec, d).filter(function(ing) {
          return (d.recipeItemsInPan || []).indexOf(ing.id) === -1;
        });
        // Competition overlay data
        var inCompetition = !!d.competitionActive;
        var deadline = d.competitionDeadline;
        var isPaused = d.recipePhase === 'paused';
        var effectiveNow = isPaused && d.recipePausedAt ? d.recipePausedAt : Date.now();
        var msLeft = deadline ? Math.max(0, deadline - effectiveNow) : null;
        var secLeft = msLeft != null ? Math.round(msLeft / 1000) : null;
        var deadlineExceeded = msLeft != null && msLeft <= 0;
        var deadlineWarn = secLeft != null && secLeft <= 30 && secLeft > 0;
        // If deadline exceeded, force-judge (move to done with current state)
        if (deadlineExceeded && d.recipePhase === 'cooking') {
          setTimeout(function() {
            // Skip to last step + trigger judge
            setKL(function(prior) {
              if (prior.recipePhase !== 'cooking') return {};
              var r = RECIPES[prior.recipeActiveId];
              return { recipeCurrentStep: r ? r.steps.length - 1 : 0 };
            });
            setTimeout(nextStep, 50);
          }, 0);
        }
        // Active competition constraint definitions
        var activeConstraints = (d.competitionConstraints || []).map(function(cid) {
          return COMPETITION_CONSTRAINTS.find(function(x) { return x.id === cid; });
        }).filter(Boolean);

        return h('div', null,
          panelHeader(rec.icon + ' Cooking: ' + rec.name + (inCompetition ? ' 🏆 (Competition)' : ''),
            'Step ' + (stepIdx + 1) + ' of ' + rec.steps.length + ' — cook time: ' +
            klClock(d.recipeSimElapsedSec || 0) + ((rec.simSpeedMultiplier || 1) > 1 ? ' (' + rec.simSpeedMultiplier + '× sim)' : '')),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: isPaused ? resumeRecipe : pauseRecipe, 'aria-pressed': isPaused ? 'true' : 'false',
              style: { padding: '10px 16px', background: isPaused ? '#15803d' : '#b45309', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
              isPaused ? '▶ Resume cooking' : '⏸ Pause cooking'),
            h('div', { role: 'status', 'aria-live': 'polite', style: { fontSize: 12, color: isPaused ? '#fde68a' : 'var(--allo-stem-text-soft, #94a3b8)' } },
              isPaused && d.recipeAutoPaused ? __alloT('stem.kitchenlab.paused_while_away', 'Paused while you were away — the clock stopped where you left it. Resume when you are ready.') :
              isPaused ? 'Cooking and competition timers are paused.' : 'Cooking timer is running.')),

          // ─── COMPETITION HUD (only in competition mode) ───
          inCompetition ? h('div', { style: Object.assign({}, cardStyle(), {
            background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(251,146,60,0.12))',
            borderLeft: '4px solid ' + (deadlineWarn ? '#dc2626' : '#fb923c')
          }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.08em' } }, __alloT('stem.kitchenlab.competition', '🏆 Competition')),
              secLeft != null ? h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                h('span', { style: { fontSize: 32, fontWeight: 900, color: deadlineWarn ? '#dc2626' : '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1 } },
                  Math.floor(secLeft / 60) + ':' + String(secLeft % 60).padStart(2, '0')),
                h('span', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.kitchenlab.time_left', 'time left'))
              ) : null),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 } },
              activeConstraints.map(function(c, i) {
                return h('div', { key: i,
                  style: { background: 'rgba(15,23,42,0.6)', borderTop: '1px solid rgba(251,146,60,0.3)', borderRight: '1px solid rgba(251,146,60,0.3)', borderBottom: '1px solid rgba(251,146,60,0.3)', borderLeft: '3px solid #fb923c', padding: '8px 10px', borderRadius: 6 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a', marginBottom: 2 } }, c.label),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.45 } }, c.description),
                  h('div', { style: { fontSize: 10, color: '#86efac', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' } },
                    '+' + c.bonus + ' bonus / ' + c.penalty + ' penalty'));
              }))
          ) : null,

          // ─── POT SIDECAR WIDGET (only for multi-pot recipes) ───
          rec.multiPot ? renderPotWidget(d, rec) : null,

          // Current step prominently displayed
          h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fb923c' }) },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 11, color: '#fb923c', fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Step ' + (stepIdx + 1)),
              h('div', { style: { fontSize: 18, fontWeight: 800, color: '#fde68a', flex: 1, minWidth: 0 } }, step.title)),
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6, marginBottom: 12 } }, step.instruction),
            h('div', { style: { background: 'rgba(125,211,252,0.08)', borderLeft: '3px solid #7dd3fc', padding: '8px 12px', borderRadius: 6, fontSize: 11, color: '#bae6fd', lineHeight: 1.55 } },
              h('b', null, __alloT('stem.kitchenlab.what_s_happening', '🧠 What\'s happening: ')), step.teach)),

          // Pan + burner cockpit
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 } },
              // Pan temp readout
              h('div', { style: { background: 'rgba(15,23,42,0.6)', border: '1px solid ' + tempColor + '55', borderRadius: 10, padding: '12px 14px' } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.pan_temperature', 'Pan temperature')),
                h('div', { style: { fontSize: 28, fontWeight: 900, color: tempColor, fontFamily: 'ui-monospace, Menlo, monospace' } }, panTemp + '°F'),
                h('div', { style: { fontSize: 11, color: tempColor, marginTop: 2 } }, tempLabel),
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' } }, 'peak this run: ' + maxTemp + '°F')),
              // Active cook time
              h('div', { style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 10, padding: '12px 14px' } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.food_in_pan', 'Food in pan')),
                h('div', { style: { fontSize: 28, fontWeight: 900, color: '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace' } }, activeTime + 's'),
                h('div', { style: { fontSize: 11, color: (d.recipeItemsInPan || []).length > 0 ? '#86efac' : '#94a3b8', marginTop: 2 } }, (d.recipeItemsInPan || []).length > 0 ? '🟢 Cooking' : '— Empty pan')),
              // Surface colour — the browning value the judge reads, on this dish's own scale
              (function() {
                var dnT = recipeDoneness(rec, d);
                var mainIn = dnT.browningFrom ? (d.recipeItemsInPan || []).indexOf(dnT.browningFrom) !== -1 : (d.recipeItemsInPan || []).length > 0;
                var bl = browningLabel(d.recipeBrowning || 0, dnT.browningScale);
                var scale = dnT.browningScale || [1, 4, 9, 24];
                return h('div', { 'data-kl-surface': mainIn ? bl.label : 'none', style: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 10, padding: '12px 14px' } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, __alloT('stem.kitchenlab.surface_colour', 'Surface colour')),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { 'aria-hidden': 'true', style: { width: 26, height: 26, borderRadius: '50%', background: mainIn ? bl.color : 'transparent', border: '2px solid ' + (mainIn ? 'rgba(255,255,255,0.35)' : 'rgba(100,116,139,0.4)'), flexShrink: 0 } }),
                    h('div', { style: { fontSize: 22, fontWeight: 900, color: mainIn ? (bl.idx >= 4 ? '#fca5a5' : '#fde68a') : '#94a3b8', lineHeight: 1.1 } }, mainIn ? bl.label : '—')),
                  h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' } },
                    mainIn ? 'browning ' + (d.recipeBrowning || 0).toFixed(2) + ' · golden at ' + scale[1] + ' · burnt at ' + scale[3] : 'nothing browning yet'),
                  mainIn && dnT.moisture ? h('div', { 'data-kl-moisture': (d.recipeMoisture || 0) > 10 ? 'wet' : (d.recipeMoisture || 0) > 3 ? 'drying' : 'dry', style: { fontSize: 11, marginTop: 4, color: (d.recipeMoisture || 0) > 10 ? '#7dd3fc' : (d.recipeMoisture || 0) > 3 ? '#fde68a' : '#86efac' } },
                    (d.recipeMoisture || 0) > 10 ? '💧 surface still wet — browning waits' : (d.recipeMoisture || 0) > 3 ? '💧 surface drying' : '✓ surface dry — browning underway') : null);
              })()),

            // Pan choice — stovetop only, locked once food is in. Each pan is a
            // different thermal model (heat-up, cool-down, dip when food lands).
            (function() {
              if (getRecipeThermal(rec).mode === 'oven') return null;
              var current = panMaterial(d.klPanMaterial);
              var locked = (d.recipeItemsInPan || []).length > 0;
              return h('div', { style: { marginBottom: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
                  h('span', { id: 'kl-pan-label', style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 700 } }, __alloT('stem.kitchenlab.your_pan', 'Your pan')),
                  h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, locked ? __alloT('stem.kitchenlab.pan_locked', 'chosen — food is in it') : __alloT('stem.kitchenlab.pan_choose_before_food', 'choose before the first ingredient'))),
                h('div', { role: 'radiogroup', 'aria-labelledby': 'kl-pan-label', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  PAN_MATERIALS.map(function(m) {
                    var on = m.id === current.id;
                    return h('button', { key: m.id, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-kl-pan': m.id,
                      disabled: locked || isPaused, onClick: function() { setKL({ klPanMaterial: m.id }); klAnnounce(m.name + '. ' + m.note); },
                      style: { padding: '8px 12px', background: on ? 'rgba(251,146,60,0.18)' : 'rgba(15,23,42,0.6)', color: on ? '#fde68a' : 'var(--allo-stem-text, #e2e8f0)',
                        border: '1px solid ' + (on ? 'rgba(251,146,60,0.6)' : 'rgba(100,116,139,0.35)'), borderRadius: 8, fontSize: 12, fontWeight: on ? 800 : 600,
                        cursor: locked ? 'default' : 'pointer', opacity: locked && !on ? 0.45 : 1 } },
                      h('span', { 'aria-hidden': 'true' }, m.icon + ' '), m.name);
                  })),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 6, lineHeight: 1.5 } }, current.note));
            })(),

            // Oil choice — recipes that start with a fat. Locked once the oil is in.
            // Every oil in the Resources smoke-point table is offered, so the
            // stir-fry's "NOT olive oil" has a consequence you can choose to meet.
            (function() {
              var fat = recipeDoneness(rec, d).fat;
              if (!fat || getRecipeThermal(rec).mode === 'oven') return null;
              var oil = oilFor(rec, d);
              var lockedOil = (d.recipeItemsInPan || []).indexOf(fat.item) !== -1;
              var nowSmoking = !!(oil && lockedOil && panTemp > oil.smokeF);
              return h('div', { style: { marginBottom: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                  h('label', { htmlFor: 'kl-oil-select', style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 700 } }, __alloT('stem.kitchenlab.your_oil', 'Your oil')),
                  h('select', { id: 'kl-oil-select', 'data-kl-oil': oil ? oil.oil : '', value: oil ? oil.oil : fat.default, disabled: lockedOil || isPaused,
                    onChange: function(e) { setKL({ recipeOil: e.target.value }); },
                    style: { padding: '6px 10px', background: 'rgba(15,23,42,0.7)', color: '#fde68a', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 6, fontSize: 12, fontWeight: 600 } },
                    SMOKE_POINTS.map(function(o) { return h('option', { key: o.oil, value: o.oil }, o.oil + ' — smokes at ' + o.smokeF + '°F'); })),
                  h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, lockedOil ? __alloT('stem.kitchenlab.oil_locked', 'in the pan') : __alloT('stem.kitchenlab.oil_choose', 'choose before adding it'))),
                nowSmoking ? h('div', { 'data-kl-smoke': 'true', style: { marginTop: 6, fontSize: 12, fontWeight: 700, color: '#fca5a5' } },
                  '🌫️ ' + __alloT('stem.kitchenlab.oil_smoking', 'Oil smoking: ') + 'pan is ' + panTemp + '°F, ' + oil.oil.toLowerCase() + ' smokes at ' + oil.smokeF + '°F') :
                  oil ? h('div', { style: { marginTop: 6, fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, oil.use + '. ' + oil.flavor + ' flavour.') : null);
            })(),

            // Burner / oven-dial slider — labels adapt to cooking mode
            (function() {
              var thermal = getRecipeThermal(rec);
              var isOven = thermal.mode === 'oven';
              return h('div', { style: { marginBottom: 12 } },
                h('label', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 6, fontWeight: 700 } },
                  h('span', null, thermal.controlLabel),
                  h('span', { style: { color: '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 14, fontWeight: 800 } }, thermal.controlSubLabel(burnerLevel))),
                h('input', { type: 'range', min: 0, max: 10, step: 1, value: burnerLevel, disabled: isPaused,
                  onChange: function(e) { setBurner(parseInt(e.target.value, 10)); },
                  'aria-label': isOven ? 'Oven temperature dial' : 'Burner level',
                  style: { width: '100%', accentColor: tempColor } }),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--allo-stem-text-soft, #64748b)', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' } },
                  isOven ? [
                    h('span', { key: 'l1' }, 'OFF'), h('span', { key: 'l2' }, fmtT(175)), h('span', { key: 'l3' }, fmtT(300)),
                    h('span', { key: 'l4' }, fmtT(425)), h('span', { key: 'l5' }, fmtT(525))
                  ] : [
                    h('span', { key: 'l1' }, __alloT('stem.kitchenlab.0_off', '0 OFF')), h('span', { key: 'l2' }, 'low'), h('span', { key: 'l3' }, 'med'),
                    h('span', { key: 'l4' }, 'high'), h('span', { key: 'l5' }, __alloT('stem.kitchenlab.10_max', '10 MAX'))
                  ]),
                // Sound of the pan: caption always, audio only when switched on. Not a live
                // region — it changes every tick and would talk over everything else.
                isOven ? null : (function() {
                  var hasFoodNow = (d.recipeItemsInPan || []).length > 0;
                  var sz = klSizzleLevel(panTemp, hasFoodNow, d.recipeFoodInternalF || 40, d.recipeMoisture || 0);
                  var on = !!d.klSizzleOn;
                  setTimeout(function() { klAudioSet(sz.level, sz.tier, on && !isPaused && d.recipePhase === 'cooking'); }, 0);
                  return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', margin: '8px 0 0' } },
                    h('span', { 'data-kl-sizzle': sz.tier, style: { fontSize: 11, color: sz.tier === 'spatter' ? '#fca5a5' : sz.tier === 'quiet' || sz.tier === 'dry' ? 'var(--allo-stem-text-soft, #94a3b8)' : '#fde68a' } },
                      h('span', { 'aria-hidden': 'true' }, '🔈 '), __alloT('stem.kitchenlab.sound_of_the_pan', 'Sound of the pan: ') + sz.caption),
                    h('button', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: toggleSizzle,
                      style: { padding: '6px 10px', background: on ? 'rgba(251,146,60,0.18)' : 'rgba(15,23,42,0.6)', color: on ? '#fde68a' : 'var(--allo-stem-text-soft, #94a3b8)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                      on ? __alloT('stem.kitchenlab.sizzle_sound_on', '🔊 Sizzle sound on') : __alloT('stem.kitchenlab.sizzle_sound_off', '🔇 Sizzle sound off')));
                })());
            })(),

            // Recipe options (the steak's doneness target): chosen before the main
            // ingredient goes in, read by the judge from state.options.
            (rec.options || []).map(function(opt) {
              var dnO = recipeDoneness(rec, d);
              var lockedOpt = dnO.browningFrom ? (d.recipeItemsInPan || []).indexOf(dnO.browningFrom) !== -1 : false;
              var chosen = optionValue(rec, d.recipeOptions, opt.id);
              return h('div', { key: opt.id, style: { marginBottom: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
                  h('span', { id: 'kl-opt-' + opt.id, style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 700 } }, opt.label),
                  h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, lockedOpt ? __alloT('stem.kitchenlab.option_locked', 'chosen') : __alloT('stem.kitchenlab.option_choose', 'choose before the main ingredient goes in'))),
                h('div', { role: 'radiogroup', 'aria-labelledby': 'kl-opt-' + opt.id, style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  opt.choices.map(function(c) {
                    var on = chosen && chosen.id === c.id;
                    return h('button', { key: c.id, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-kl-option': opt.id + ':' + c.id,
                      disabled: lockedOpt || isPaused,
                      onClick: function() { var next = Object.assign({}, d.recipeOptions || {}); next[opt.id] = c.id; setKL({ recipeOptions: next }); klAnnounce(opt.label + ': ' + c.label + '. ' + (c.note || '')); },
                      style: { padding: '8px 12px', background: on ? 'rgba(251,146,60,0.18)' : 'rgba(15,23,42,0.6)', color: on ? '#fde68a' : 'var(--allo-stem-text, #e2e8f0)',
                        border: '1px solid ' + (on ? 'rgba(251,146,60,0.6)' : 'rgba(100,116,139,0.35)'), borderRadius: 8, fontSize: 12, fontWeight: on ? 800 : 600,
                        cursor: lockedOpt ? 'default' : 'pointer', opacity: lockedOpt && !on ? 0.45 : 1 } }, c.label);
                  })),
                chosen && chosen.note ? h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 6, lineHeight: 1.5 } }, chosen.note) : null,
                opt.footnote ? h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' } }, opt.footnote) : null);
            }),

            // Stir / toss / poke — the technique step as an action. Past the grace
            // period the caption turns amber and the food browns 1.7× faster.
            (function() {
              var stir = recipeDoneness(rec, d).stir;
              var hasFoodNow = (d.recipeItemsInPan || []).length > 0;
              if (!stir || !hasFoodNow) return null;
              var since = d.recipeLastStirSimSec != null ? Math.max(0, (d.recipeSimElapsedSec || 0) - d.recipeLastStirSimSec) : null;
              var over = !stir.disturbs && since != null && since > (stir.grace || 15) && panTemp > 250;
              var caption = stir.disturbs
                ? ((d.recipeStirCount || 0) ? 'Moved ' + d.recipeStirCount + '× — every move interrupts the crust' : 'Not moved. Good — the crust needs uninterrupted contact.')
                : since == null ? 'Not stirred yet'
                : over ? 'Last stirred ' + Math.round(since) + 's ago — unattended, browning faster'
                : 'Last stirred ' + Math.round(since) + 's ago';
              return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 } },
                h('button', { type: 'button', disabled: isPaused, onClick: stirPan, 'data-kl-stir': stir.disturbs ? 'disturbs' : 'stir',
                  style: { padding: '10px 16px', background: stir.disturbs ? 'rgba(15,23,42,0.7)' : (over ? '#b45309' : 'rgba(251,146,60,0.18)'), color: '#fde68a',
                    border: '1px solid rgba(251,146,60,0.45)', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                  h('span', { 'aria-hidden': 'true' }, (stir.icon || '🥄') + ' '), stir.label),
                h('span', { 'data-kl-stir-caption': over ? 'over' : 'ok', style: { fontSize: 11, color: over ? '#fde68a' : 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: over ? 700 : 400 } }, caption));
            })(),

            // Live trace (the whole cook so far, with ingredient marks) beside the visual pan
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' } },
              (d.recipeTempHistory || []).length > 2 ? h('div', { style: { flex: '1 1 320px', maxWidth: 560, minWidth: 0 } },
                renderTempTrace(d.recipeTempHistory, { compact: true, marks: traceMarks(rec) })) : null,
              h('div', { style: { flex: '0 0 auto' } }, renderPanCanvas(panTemp, d.recipeItemsInPan, activeTime, rec)))),

          // Ingredient tray
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.ingredients_tray', '🧺 Ingredients tray')),
            availableItems.length === 0 ?
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic', textAlign: 'center', padding: 12 } }, __alloT('stem.kitchenlab.all_ingredients_are_in_the_pan', 'All ingredients are in the pan.')) :
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                availableItems.map(function(ing) {
                  return h('button', { key: ing.id, disabled: isPaused,
                    onClick: function() { addItem(ing.id); },
                    style: { padding: '10px 14px', background: 'rgba(15,23,42,0.7)',
                      border: '1px solid rgba(251,146,60,0.4)', borderRadius: 8,
                      color: '#fde68a', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.35)', letterSpacing: '0.01em',
                      display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 20 } }, ing.icon),
                    'Add ' + ing.name);
                }))),

          // Step progress + continue
          h('div', { style: cardStyle() },
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
              rec.steps.map(function(s, i) {
                var isPast = i < stepIdx;
                var isCurrent = i === stepIdx;
                return h('div', { key: i,
                  style: { flex: 1, height: 6, borderRadius: 3,
                    background: isPast ? '#22c55e' : isCurrent ? '#fb923c' : 'rgba(100,116,139,0.3)' } });
              })),
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              step.completeWhen === 'userClick' ? h('button', { disabled: isPaused,
                onClick: function() { nextStep(); klAnnounce(__alloT('stem.kitchenlab.sr_step_complete', 'Step complete.')); },
                style: { padding: '12px 24px', background: '#22c55e', color: '#052e16',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                rec.sandbox ? __alloT('stem.kitchenlab.finish_free_cook', '✓ Finish + read what you made') : step.actionLabel ? step.actionLabel : __alloT('stem.kitchenlab.continue_to_next_step', '✓ Continue to next step')) : h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', padding: '12px 16px', background: 'rgba(15,23,42,0.5)', borderRadius: 8, fontStyle: 'italic', flex: 1, minWidth: 200 } },
                step.completeWhen === 'panInRange' ? '⏳ Auto-advances when pan reaches target temperature' :
                step.completeWhen === 'itemAdded' ? '⏳ Auto-advances when ingredient is added' :
                step.completeWhen === 'heatRemoved' ? '⏳ Auto-advances when burner reaches 0' :
                step.completeWhen === 'internalTempReached' ? '⏳ Auto-advances when internal food temperature reaches target — use the readout on the chicken' :
                step.completeWhen === 'potStateReached' ? '⏳ Auto-advances when the pasta pot reaches the target state — use the pot controls above' : '⏳ Continue when ready'),
              h('button', {
                onClick: function() { openConfirmation('recipe'); },
                style: { padding: '12px 18px', background: 'transparent', color: '#fca5a5',
                  border: '1px solid rgba(220,38,38,0.4)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
                __alloT('stem.kitchenlab.abandon', '✕ Abandon'))))
        );
      }

      // ─── AI Suggester modal ───
      // Overlay dialog with text input + suggestion result. Three states:
      // 1. Empty (input + Submit button)
      // 2. Loading (spinner + "Chef is thinking...")
      // 3. Result (recommended recipe card + reasoning + "Cook this" / "Ask again")
      function renderSuggesterModal() {
        var inputVal = d.suggesterInput || '';
        var result = d.suggesterResult;
        var loading = d.suggesterLoading;
        var err = d.suggesterError;
        var recommendedRec = result ? RECIPES[result.recipeId] : null;
        var recommendedCat = result ? RECIPE_CATALOG.find(function(r) { return r.id === result.recipeId; }) : null;
        return h('div', {
            id: 'kitchen-suggester-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': __alloT('stem.kitchenlab.ai_recipe_suggester', 'AI recipe suggester'),
            onClick: function(e) { if (e.target === e.currentTarget) closeSuggester(); },
            onKeyDown: function(e) { trapDialogFocus(e, 'kitchen-suggester-dialog', closeSuggester); },
            style: {
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(10,7,4,0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }
          },
          h('div', { style: {
              maxWidth: 560, width: '100%',
              background: 'linear-gradient(135deg, #1c1410, #2a1d14)',
              border: '2px solid rgba(167,139,250,0.5)', borderRadius: 16,
              padding: 28, color: 'var(--allo-stem-text, #f1f5f9)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
              maxHeight: '90vh', overflowY: 'auto'
            } },
            // Header
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
              h('div', { 'aria-hidden': 'true', style: { fontSize: 36, lineHeight: 1 } }, '🤔'),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontSize: 18, fontWeight: 900, color: '#e9d5ff', letterSpacing: '-0.01em' } }, __alloT('stem.kitchenlab.what_should_i_cook', 'What should I cook?')),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2 } }, __alloT('stem.kitchenlab.powered_by_ai_picks_from_your_unlocked', 'Powered by AI · picks from your unlocked recipes'))),
              h('button', { id: 'kitchen-suggester-close', type: 'button', onClick: closeSuggester, 'aria-label': __alloT('stem.kitchenlab.close_suggester', 'Close suggester'),
                style: { background: 'transparent', color: 'var(--allo-stem-text-soft, #94a3b8)', border: 'none', fontSize: 22, fontWeight: 700, cursor: 'pointer', padding: 4 } },
                '✕')),
            // Body — varies by state
            result && recommendedRec && recommendedCat ? h('div', null,
              // Result view
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 } },
                __alloT('stem.kitchenlab.chef_s_pick', '💡 Chef\'s pick')),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(167,139,250,0.4)',
                  borderRadius: 12, marginBottom: 14 } },
                h('div', { 'aria-hidden': 'true', style: { fontSize: 46, lineHeight: 1, flexShrink: 0 } }, recommendedCat.icon),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: 18, fontWeight: 800, color: '#fde68a', marginBottom: 4 } }, recommendedCat.name),
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: recommendedCat.difficulty === 'easy' ? '#86efac' : recommendedCat.difficulty === 'hard' ? '#fca5a5' : '#fbbf24',
                    textTransform: 'uppercase', letterSpacing: '0.05em' } }, recommendedCat.difficulty + ' · ' + (recommendedRec.targetTimeMin || 5) + ' min'))),
              h('div', { style: { fontSize: 13, color: '#e9d5ff', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 18,
                  padding: '12px 14px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)',
                  borderRadius: 8 } },
                '"', result.reasoning, '"'),
              h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() { closeSuggester(); startRecipe(result.recipeId); },
                  style: { padding: '12px 22px', background: '#a78bfa', color: '#1c1410',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.cook_this', '🍳 Cook this')),
                h('button', { onClick: function() { setKL({ suggesterResult: null, suggesterInput: inputVal }); },
                  style: { padding: '12px 18px', background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                    border: '1px solid rgba(100,116,139,0.5)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.ask_again', '🔄 Ask again')))
            ) : loading ? h('div', { style: { textAlign: 'center', padding: '36px 16px' } },
              h('div', { style: { fontSize: 48, marginBottom: 16 } }, '🤔'),
              h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #cbd5e1)', fontStyle: 'italic' } },
                __alloT('stem.kitchenlab.chef_is_thinking_about_what_suits_your', 'Chef is thinking about what suits your night...'))
            ) : h('div', null,
              // Input view
              h('label', { htmlFor: 'kitchen-suggester-input', style: { display: 'block', fontSize: 13, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 12 } },
                __alloT('stem.kitchenlab.tell_the_chef_about_your_situation_wha', 'Tell the chef about your situation — what you have in the kitchen, how much time, whether you\'re feeding kids, mood, etc. Or leave blank for a free pick.')),
              h('textarea', {
                id: 'kitchen-suggester-input', value: inputVal,
                onChange: function(e) { setKL({ suggesterInput: e.target.value, suggesterError: null }); },
                placeholder: __alloT('stem.kitchenlab.e_g_i_ve_got_eggs_and_butter_10_minute', 'e.g., "I\'ve got eggs and butter, 10 minutes, kids are hungry"\nor\n"want something impressive for date night"\nor leave blank'),
                rows: 4,
                style: { width: '100%', padding: '12px 14px', fontSize: 13, fontFamily: 'inherit',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(100,116,139,0.5)',
                  borderRadius: 8, color: 'var(--allo-stem-text, #f1f5f9)', resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }
              }),
              err ? h('div', { style: { fontSize: 12, color: '#fca5a5', marginBottom: 12,
                padding: '8px 12px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 6 } }, '⚠️ ' + err) : null,
              h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() { runSuggester(inputVal); },
                  style: { padding: '12px 22px', background: '#a78bfa', color: '#1c1410',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.suggest_a_recipe', '🤔 Suggest a recipe')),
                h('button', { onClick: closeSuggester,
                  style: { padding: '12px 18px', background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                    border: '1px solid rgba(100,116,139,0.5)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.cancel', 'Cancel'))))
          )
        );
      }

      // ─── Pot sidecar widget for multi-pot recipes ───
      // Shows the pot's current state + a progress bar + action buttons.
      // Pot has its own sim-time machine independent of the primary pan.
      function renderPotWidget(d, rec) {
        var simSpeed = rec.simSpeedMultiplier || 1;
        var phase = d.potState || 'cold';
        var controlsDisabled = d.recipePhase === 'paused';
        var nowMs = controlsDisabled && d.recipePausedAt ? d.recipePausedAt : Date.now();
        // Compute progress + temp
        var potTempF = 70;
        var progressPct = 0;
        var progressLabel = '';
        if (phase === 'heating' && d.potStartedAt) {
          var simSec = ((nowMs - d.potStartedAt) / 1000) * simSpeed;
          progressPct = Math.min(100, (simSec / 180) * 100);
          potTempF = 70 + (212 - 70) * progressPct / 100;
          progressLabel = 'Heating: ' + Math.round(potTempF) + '°F → 212°F (' + Math.round(progressPct) + '%)';
        } else if (phase === 'boiling') {
          potTempF = 212;
          progressPct = 100;
          progressLabel = 'Boiling at 212°F — drop pasta when ready';
        } else if (phase === 'pasta-in' && d.potPastaInAt) {
          potTempF = 212;
          var simSec2 = ((nowMs - d.potPastaInAt) / 1000) * simSpeed;
          progressPct = Math.min(100, (simSec2 / 540) * 100);
          progressLabel = 'Pasta cooking: ' + Math.round(progressPct) + '% (al dente at 100%)';
        } else if (phase === 'pasta-done') {
          potTempF = 212;
          progressPct = 100;
          progressLabel = '✓ Pasta al dente — drain now!';
        } else if (phase === 'drained') {
          potTempF = 100;
          progressPct = 100;
          progressLabel = '✓ Drained' + (d.potWaterReserved ? ' + water saved' : '');
        } else {
          progressLabel = 'Pot is cold + empty';
        }
        var phaseColor = phase === 'cold' ? '#52525b' :
                         phase === 'heating' ? '#fb923c' :
                         phase === 'boiling' ? '#38bdf8' :
                         phase === 'pasta-in' ? '#fbbf24' :
                         phase === 'pasta-done' ? '#22c55e' : '#86efac';
        return h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid ' + phaseColor }) },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
            // Pot SVG
            h('svg', { width: 110, height: 110, viewBox: '0 0 110 110', 'aria-hidden': 'true', style: { flexShrink: 0 } },
              // Steam (when boiling+)
              phase === 'boiling' || phase === 'pasta-in' || phase === 'pasta-done' ? h('g', { style: { filter: 'blur(0.7px)' } },
                h('path', { d: 'M 35 30 Q 32 18 42 8', stroke: 'rgba(220,220,230,0.7)', strokeWidth: 2, fill: 'none' }),
                h('path', { d: 'M 55 28 Q 60 15 50 5', stroke: 'rgba(220,220,230,0.7)', strokeWidth: 2, fill: 'none' }),
                h('path', { d: 'M 75 30 Q 72 18 82 8', stroke: 'rgba(220,220,230,0.7)', strokeWidth: 2, fill: 'none' })
              ) : null,
              // Pot body
              h('rect', { x: 22, y: 40, width: 66, height: 50, fill: '#3f3f46', stroke: '#1c1410', strokeWidth: 2, rx: 3 }),
              // Pot rim
              h('ellipse', { cx: 55, cy: 42, rx: 33, ry: 5, fill: '#52525b', stroke: '#1c1410', strokeWidth: 1.5 }),
              // Water + contents
              phase !== 'cold' ? h('ellipse', { cx: 55, cy: 50, rx: 28, ry: 4,
                fill: phase === 'pasta-in' || phase === 'pasta-done' ? '#fef3c7' : '#bfdbfe', opacity: 0.7 }) : null,
              // Pasta strands when cooking
              phase === 'pasta-in' || phase === 'pasta-done' ? h('g', null,
                h('path', { d: 'M 32 55 Q 55 50 78 58', stroke: '#fde68a', strokeWidth: 2, fill: 'none' }),
                h('path', { d: 'M 35 62 Q 55 56 75 62', stroke: '#fde68a', strokeWidth: 1.5, fill: 'none' })
              ) : null,
              // Bubbles when boiling
              phase === 'boiling' || phase === 'pasta-in' ? h('g', null,
                h('circle', { cx: 40, cy: 55, r: 2, fill: 'rgba(255,255,255,0.6)' }),
                h('circle', { cx: 55, cy: 52, r: 1.5, fill: 'rgba(255,255,255,0.6)' }),
                h('circle', { cx: 70, cy: 56, r: 2, fill: 'rgba(255,255,255,0.6)' })
              ) : null,
              // Handles
              h('rect', { x: 16, y: 50, width: 10, height: 4, fill: '#1c1410', rx: 1 }),
              h('rect', { x: 84, y: 50, width: 10, height: 4, fill: '#1c1410', rx: 1 }),
              // Heat indicator under pot
              phase !== 'cold' && phase !== 'drained' ? h('circle', { cx: 55, cy: 100, r: 25, fill: 'none', stroke: '#dc2626', strokeWidth: 2, opacity: 0.5, strokeDasharray: '3 4', style: { filter: 'drop-shadow(0 0 3px rgba(220,38,38,0.7))' } }) : null
            ),
            // Info + controls
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: phaseColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } },
                '🫕 Pasta Pot — ' + phase),
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 8, lineHeight: 1.45 } }, progressLabel),
              // Progress bar
              h('div', { style: { height: 8, background: 'rgba(15,23,42,0.6)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)', marginBottom: 10 } },
                h('div', { style: { height: '100%', width: progressPct + '%', background: phaseColor, transition: 'width 0.3s' } })),
              // Action buttons (vary by phase)
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                phase === 'cold' ? h('button', { disabled: controlsDisabled,
                  onClick: function() { startPot(); awardXP(1); },
                  style: { padding: '8px 14px', background: '#fb923c', color: '#1c1410',
                    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.start_pasta_water', '🔥 Start pasta water')) : null,
                phase === 'boiling' ? h('button', { disabled: controlsDisabled,
                  onClick: function() { dropPasta(); awardXP(2); },
                  style: { padding: '8px 14px', background: '#22c55e', color: '#052e16',
                    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                  __alloT('stem.kitchenlab.drop_pasta', '🍝 Drop pasta')) : null,
                (phase === 'pasta-in' || phase === 'pasta-done') ? h('button', {
                  onClick: function() { drainPasta(true); awardXP(2); },
                  disabled: controlsDisabled || phase !== 'pasta-done',
                  style: { padding: '8px 14px',
                    background: phase === 'pasta-done' ? '#22c55e' : 'rgba(100,116,139,0.3)',
                    color: phase === 'pasta-done' ? '#052e16' : '#94a3b8',
                    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    cursor: phase === 'pasta-done' ? 'pointer' : 'not-allowed' } },
                  __alloT('stem.kitchenlab.drain_save_water', '✓ Drain (save water)')) : null,
                (phase === 'pasta-in' || phase === 'pasta-done') ? h('button', {
                  onClick: function() { drainPasta(false); },
                  disabled: controlsDisabled || phase !== 'pasta-done',
                  style: { padding: '8px 14px',
                    background: 'transparent', color: '#fca5a5',
                    border: '1px solid rgba(220,38,38,0.4)', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: phase === 'pasta-done' ? 'pointer' : 'not-allowed', opacity: phase === 'pasta-done' ? 1 : 0.5 } },
                  __alloT('stem.kitchenlab.drain_waste_water', 'Drain (waste water)')) : null))));
      }

      // ─── Temperature trace (cockpit: compact + live; results: full) ───
      // Points carry sim-time t, so x is time, not sample index; marks are the
      // moments ingredients went in and the heat came off.
      function traceMarks(rec) {
        var marks = [];
        var addSim = d.recipeItemAddSimSec || {};
        recipeIngredients(rec, d).forEach(function(ing) {
          if (addSim[ing.id] != null) marks.push({ t: addSim[ing.id], icon: ing.icon, label: ing.name });
        });
        if (d.recipeHeatRemovedSimSec != null) marks.push({ t: d.recipeHeatRemovedSimSec, icon: '⏻', label: __alloT('stem.kitchenlab.heat_off', 'Heat off') });
        var rm = d.recipeMarks || {};
        Object.keys(rm).forEach(function(k) { marks.push({ t: rm[k].simSec, icon: rm[k].icon || '🔖', label: k }); });
        return marks;
      }
      function renderTempTrace(hist, opts) {
        opts = opts || {};
        var n = hist.length; if (n < 2) return null;
        var compact = !!opts.compact;
        var allT = hist.reduce(function(a, p) { a.push(p.pan, p.food); return a; }, []);
        var maxT = Math.max.apply(null, allT.concat([compact ? 300 : 250])), minT = 40;
        var W = 360, H = compact ? 96 : 150, pl = 34, pb = compact ? 16 : 20, pt = compact ? 14 : 24, pr = 8;
        var tOf = function(p, i) { return p.t != null ? p.t : i; };
        var t0 = tOf(hist[0], 0), t1 = tOf(hist[n - 1], n - 1), span = Math.max(1e-6, t1 - t0);
        var sx = function(t) { return pl + ((t - t0) / span) * (W - pl - pr); };
        var sy = function(t) { return pt + (1 - (t - minT) / (maxT - minT)) * (H - pt - pb); };
        var line = function(key) { return hist.map(function(p, i) { return sx(tOf(p, i)).toFixed(1) + ',' + sy(p[key]).toFixed(1); }).join(' '); };
        var panPeak = Math.round(Math.max.apply(null, hist.map(function(p) { return p.pan; })));
        var hasTime = hist[0].t != null;
        var refs = [{ t: 212, label: __alloT('stem.kitchenlab.boil', 'Boil'), c: '#38bdf8' }, { t: 310, label: __alloT('stem.kitchenlab.maillard_4', 'Maillard'), c: '#f97316' }];
        var marks = (opts.marks || []).filter(function(m) { return m.t >= t0 && m.t <= t1; });
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'data-kl-trace': compact ? 'live' : 'full',
            'aria-label': (compact ? 'Live temperature trace. ' : 'Pan and food internal temperature over the cook. ') + 'Pan peaked at ' + fmtT(panPeak) + (hasTime ? ' over ' + klClock(t1 - t0) + ' of cook time.' : '.') },
          refs.filter(function(r) { return r.t < maxT; }).map(function(r) {
            return h('g', { key: 'r' + r.t },
              h('line', { x1: pl, y1: sy(r.t), x2: W - pr, y2: sy(r.t), stroke: r.c, strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }),
              h('text', { x: W - pr, y: sy(r.t) - 2, textAnchor: 'end', fontSize: 7, fill: r.c }, r.label + ' ' + fmtT(r.t)));
          }),
          marks.map(function(m, i) {
            return h('g', { key: 'm' + i },
              h('line', { x1: sx(m.t), y1: pt - 2, x2: sx(m.t), y2: H - pb, stroke: 'rgba(253,230,138,0.45)', strokeWidth: 1, strokeDasharray: '2 3' }),
              h('text', { x: sx(m.t), y: pt - 4, textAnchor: 'middle', fontSize: 9 }, m.icon));
          }),
          h('polyline', { points: line('pan'), fill: 'none', stroke: '#fb923c', strokeWidth: 2 }),
          h('polyline', { points: line('food'), fill: 'none', stroke: '#ef4444', strokeWidth: 2 }),
          compact ? null : h('text', { x: pl, y: 12, fontSize: 9, fill: '#fb923c', fontWeight: 700 }, __alloT('stem.kitchenlab.pan', '— Pan')),
          compact ? null : h('text', { x: pl + 42, y: 12, fontSize: 9, fill: '#ef4444', fontWeight: 700 }, __alloT('stem.kitchenlab.food_internal', '— Food internal')),
          hasTime ? h('text', { x: pl, y: H - 4, fontSize: 7, fill: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, Menlo, monospace' }, klClock(0)) : null,
          hasTime ? h('text', { x: W - pr, y: H - 4, textAnchor: 'end', fontSize: 7, fill: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, Menlo, monospace' }, klClock(t1 - t0)) : null,
          h('text', { x: (pl + W - pr) / 2, y: H - 4, textAnchor: 'middle', fontSize: 8, fill: 'var(--allo-stem-text-soft, #94a3b8)' }, compact ? '' : __alloT('stem.kitchenlab.cook_time', 'Cook time →')),
          h('text', { x: pl - 3, y: sy(maxT) + 6, textAnchor: 'end', fontSize: 7, fill: '#64748b' }, fmtT(maxT)),
          h('text', { x: pl - 3, y: sy(minT), textAnchor: 'end', fontSize: 7, fill: '#64748b' }, fmtT(minT))
        );
      }

      // ─── Visual pan rendering ───
      function renderPanCanvas(panTemp, itemsInPan, activeTime, rec) {
        var stir = recipeDoneness(rec, d).stir;
        var simNow = d.recipeSimElapsedSec || 0;
        var sinceStir = d.recipeLastStirSimSec != null ? Math.max(0, simNow - d.recipeLastStirSimSec) : null;
        var state = { panTemp: panTemp, itemsInPan: itemsInPan || [], activeTime: activeTime,
                      foodTemp: d.recipeFoodInternalF || 40,
                      // doneness state, so colour follows what the judge will read
                      browning: d.recipeBrowning || 0, set: !!d.recipeFoodSetAt,
                      stirCount: d.recipeStirCount || 0,
                      // is the pan sitting unattended right now? (stir-type dishes only)
                      unattended: !!(stir && !stir.disturbs && sinceStir != null && sinceStir > (stir.grace || 15) && panTemp > 250 && (itemsInPan || []).length),
                      itemAddPanF: d.recipeItemAddPanF || {}, itemAddSimSec: d.recipeItemAddSimSec || {}, simElapsed: simNow,
                      marks: d.recipeMarks || {},
                      moisture: d.recipeMoisture || 0,
                      oilSmoking: (function() { var dnV = recipeDoneness(rec, d), oilV = oilFor(rec, d); return !!(oilV && dnV.fat && (itemsInPan || []).indexOf(dnV.fat.item) !== -1 && panTemp > oilV.smokeF); })() };
        // Sandbox: the visual belongs to the chosen food
        if (rec && rec.sandbox) {
          var food = sandboxFood(d.sandboxFood);
          if (food.visual === 'sear') {
            var mapped = Object.assign({}, state, { safeF: food.safeF || 165, rawColor: food.id === 'steak' ? '#b91c1c' : undefined,
              itemsInPan: state.itemsInPan.map(function(id) { return id === food.id ? 'chicken' : id; }) });
            return h('div', { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' } }, RECIPES.panSeared.renderVisual(h, mapped));
          }
          if (food.visual === 'pieces') return renderPiecesVisual(h, state, food);
          return renderDefaultPanVisual(h, state);
        }
        // A recipe can borrow the generic pieces visual (caramelised onions)
        if (rec && rec.visual === 'pieces') {
          return renderPiecesVisual(h, state, { id: rec.doneness.browningFrom, fatItem: rec.doneness.fat && rec.doneness.fat.item, doneness: rec.doneness, pieceColors: rec.pieceColors });
        }
        // Recipe-specific visual takes precedence; otherwise use default
        if (rec && typeof rec.renderVisual === 'function') {
          return h('div', { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' } },
            rec.renderVisual(h, state));
        }
        return renderDefaultPanVisual(h, state);
      }
      // Generic "pieces in a pan" visual for the sandbox's mushrooms / onion:
      // piece colour steps through the food's own palette as browning climbs.
      function renderPiecesVisual(h, state, food) {
        var panTemp = state.panTemp, items = state.itemsInPan || [];
        var hasFat = items.indexOf(food.fatItem) !== -1, hasFood = items.indexOf(food.id) !== -1;
        var bl = browningLabel(state.browning || 0, food.doneness.browningScale);
        var pieceColor = (food.pieceColors || ['#fef3c7', '#fbbf24', '#92400e', '#1c1410'])[Math.min(3, Math.max(0, bl.idx - 1))];
        if (bl.idx === 0) pieceColor = (food.pieceColors || ['#fef3c7'])[0];
        var panColor = panTemp >= 400 ? '#7c2d12' : panTemp >= 320 ? '#a3461a' : panTemp >= 220 ? '#78350f' : '#57534e';
        var steaming = hasFood && panTemp > 212 && ((state.moisture || 0) > 10 || (state.foodTemp || 40) < 205);
        var smoking = (hasFood && bl.idx >= 4) || state.oilSmoking;
        var pieces = [[100, 90, 14, 6], [122, 97, 12, 5], [143, 89, 15, 6], [165, 96, 12, 5], [184, 91, 13, 6], [112, 102, 11, 4], [154, 103, 12, 4]];
        return h('div', { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' } },
          h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-hidden': 'true' },
            panTemp >= 300 ? h('ellipse', { cx: 140, cy: 95, rx: 110, ry: 55, fill: 'rgba(251,146,60,' + Math.min(0.6, (panTemp - 300) / 300) + ')', opacity: 0.6 }) : null,
            h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 30, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
            h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 25, fill: '#1c1410' }),
            hasFat ? h('ellipse', { cx: 140, cy: 95, rx: 65, ry: 16, fill: 'rgba(255,220,120,0.35)' }) : null,
            hasFood && state.unattended ? h('ellipse', { cx: 145, cy: 99, rx: 34, ry: 8, fill: 'rgba(28,20,16,0.85)', stroke: '#7c2d12', strokeWidth: 1 }) : null,
            hasFood ? h('g', null, pieces.map(function(p, i) {
              return h('ellipse', { key: i, cx: p[0], cy: p[1], rx: p[2], ry: p[3], fill: pieceColor, stroke: 'rgba(0,0,0,0.25)', strokeWidth: 0.6 });
            })) : null,
            steaming ? h('g', { style: { filter: 'blur(0.7px)' } },
              h('path', { d: 'M 110 78 Q 113 70 110 60', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' }),
              h('path', { d: 'M 140 75 Q 145 65 138 55', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' }),
              h('path', { d: 'M 170 78 Q 173 70 170 60', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' })) : null,
            smoking ? h('g', null,
              h('path', { d: 'M 130 70 Q 135 50 125 35 Q 115 25 120 10', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' }),
              h('path', { d: 'M 160 72 Q 155 55 165 40 Q 175 28 168 12', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' })) : null,
            h('rect', { x: 232, y: 90, width: 40, height: 14, fill: '#1c1410', rx: 3 }),
            h('circle', { cx: 140, cy: 130, r: 70, fill: 'none', stroke: panTemp >= 220 ? '#fb923c' : '#52525b', strokeWidth: 2, opacity: 0.4, strokeDasharray: '4 6' })));
      }
      function renderDefaultPanVisual(h, state) {
        var panTemp = state.panTemp;
        var itemsInPan = state.itemsInPan;
        var activeTime = state.activeTime;
        // Color of pan/contents based on temp
        var panColor = panTemp >= 400 ? '#7c2d12' : panTemp >= 320 ? '#a3461a' : panTemp >= 220 ? '#78350f' : panTemp >= 100 ? '#57534e' : '#3f3f46';
        var glow = panTemp >= 300 ? 'rgba(251,146,60,' + Math.min(0.6, (panTemp - 300) / 300) + ')' : 'transparent';
        // Food appearance based on what's in
        var hasButter = (itemsInPan || []).indexOf('butter') !== -1;
        var hasEggs = (itemsInPan || []).indexOf('eggs') !== -1;
        // Egg colour follows the integrated doneness state the judge reads,
        // not elapsed time: browning for colour, set for texture.
        var browning = state.browning || 0, foodT = state.foodTemp || 40, isSet = !!state.set;
        var eggsColor = '#fef3c7';                                     // raw, glossy
        if (hasEggs && browning >= 0.5) eggsColor = '#92400e';         // browned
        else if (hasEggs && browning >= 0.3) eggsColor = '#d97706';    // colouring
        else if (hasEggs && browning >= 0.12) eggsColor = '#fbbf24';   // first gold
        else if (hasEggs && isSet) eggsColor = '#fef9c3';              // set, pale
        var curds = hasEggs && (isSet || foodT > 120);
        var steaming = hasEggs && panTemp > 212 && foodT < 205 && activeTime > 3;
        var burning = hasEggs && browning >= 0.4 && panTemp > 380;
        return h('div', { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' } },
          h('svg', { width: 280, height: 180, viewBox: '0 0 280 180', 'aria-label': __alloT('stem.kitchenlab.visual_pan', 'Visual pan'), 'aria-hidden': 'true' },
            // Glow / heat shimmer
            panTemp >= 300 ? h('ellipse', { cx: 140, cy: 95, rx: 110, ry: 55, fill: glow, opacity: 0.6 }) : null,
            // Pan rim
            h('ellipse', { cx: 140, cy: 100, rx: 100, ry: 30, fill: panColor, stroke: '#1c1410', strokeWidth: 2 }),
            // Pan interior
            h('ellipse', { cx: 140, cy: 95, rx: 92, ry: 25, fill: '#1c1410' }),
            // Butter (when added, before fully melted)
            hasButter && activeTime < 8 ? h('rect', { x: 130, y: 87, width: 20, height: 14, fill: '#fef3c7', rx: 2, opacity: 0.9 }) : null,
            // Butter pool (melted)
            hasButter && !hasEggs ? h('ellipse', { cx: 140, cy: 95, rx: 60, ry: 16, fill: '#fde68a', opacity: 0.5 }) : null,
            // Eggs
            hasEggs ? h('g', null,
              h('ellipse', { cx: 140, cy: 95, rx: 78, ry: 22, fill: eggsColor, opacity: 0.95 }),
              // A patch catching on the bottom while the pan sits unattended
              state.unattended ? h('ellipse', { cx: 150, cy: 100, rx: 26, ry: 7, fill: 'rgba(146,64,14,0.75)' }) : null,
              // Curd bumps
              curds ? h('g', null,
                h('ellipse', { cx: 105, cy: 90, rx: 12, ry: 5, fill: eggsColor, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 }),
                h('ellipse', { cx: 130, cy: 97, rx: 14, ry: 6, fill: eggsColor, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 }),
                h('ellipse', { cx: 155, cy: 91, rx: 13, ry: 5, fill: eggsColor, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 }),
                h('ellipse', { cx: 175, cy: 96, rx: 11, ry: 4, fill: eggsColor, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 })
              ) : null,
              // Steam: water leaving the eggs while the pan is above boiling
              steaming ? h('g', { style: { filter: 'blur(0.7px)' } },
                h('path', { d: 'M 110 78 Q 113 70 110 60', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' }),
                h('path', { d: 'M 140 75 Q 145 65 138 55', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' }),
                h('path', { d: 'M 170 78 Q 173 70 170 60', stroke: 'rgba(220,220,230,0.5)', strokeWidth: 2, fill: 'none' })
              ) : null,
              // Smoke + scorch warning once browning has actually accumulated
              burning ? h('g', null,
                h('path', { d: 'M 130 70 Q 135 50 125 35 Q 115 25 120 10', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' }),
                h('path', { d: 'M 160 72 Q 155 55 165 40 Q 175 28 168 12', stroke: 'rgba(60,60,60,0.6)', strokeWidth: 3, fill: 'none' }),
                h('text', { x: 140, y: 25, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#dc2626' }, __alloT('stem.kitchenlab.burning', '⚠️ BURNING'))
              ) : null
            ) : null,
            // Pan handle
            h('rect', { x: 232, y: 90, width: 40, height: 14, fill: '#1c1410', rx: 3 }),
            // Burner under pan
            h('circle', { cx: 140, cy: 130, r: 70, fill: 'none', stroke: panTemp >= 220 ? '#fb923c' : '#52525b', strokeWidth: 2, opacity: 0.4, strokeDasharray: '4 6', style: panTemp >= 220 ? { filter: 'drop-shadow(0 0 3px #fb923c)' } : undefined })
          ));
      }

      // ─── Results screen ───
      function renderRecipeResults() {
        var rec = RECIPES[d.recipeActiveId];
        var j = d.recipeJudgement;
        if (!rec || !j) return h('div', null, h('button', { onClick: abortRecipe }, __alloT('stem.kitchenlab.back', 'Back')));
        var compResult = j.compResult;
        var displayScore = compResult ? compResult.finalScore : j.score;
        var gradeColor = displayScore >= 90 ? '#86efac' : displayScore >= 80 ? '#fbbf24' : displayScore >= 70 ? '#fb923c' : '#fca5a5';
        var inTournament = !!d.tournamentActive;
        var tRound = d.tournamentRound || 0;
        var isSandbox = !!rec.sandbox;
        var sbFood = isSandbox ? sandboxFood(d.sandboxFood) : null;
        // Fire AI critique request (idempotent — gated by aiCritiqueRequestedFor); not for the sandbox
        if (!isSandbox && ctx.callGemini && !d.aiCritique && !d.aiCritiqueLoading && d.aiCritiqueRequestedFor !== d.recipeStartedAt) {
          setTimeout(function() { requestAiCritique(rec, j); }, 100);
        }
        return h('div', null,
          panelHeader(rec.icon + ' ' + rec.name + (compResult ? ' 🏆 — Competition Results' : isSandbox ? ' — What you made' : ' — Results'),
            isSandbox ? 'No grade here. The readout below describes the ' + sbFood.name.toLowerCase() + ' in the same terms the graded recipes use.' :
            'Your dish has been judged. Score breakdown below — read the notes to see what to do differently next time.'),

          // ─── Personal-best banner (competition only) ───
          compResult && compResult.isNewBest ? h('div', { style: {
            background: 'linear-gradient(135deg, #fde68a, #fb923c)', color: '#1c1410',
            padding: '14px 20px', borderRadius: 12, marginBottom: 16, textAlign: 'center',
            fontWeight: 900, fontSize: 16, boxShadow: '0 4px 12px rgba(251,146,60,0.3)' } },
            __alloT('stem.kitchenlab.new_personal_best_2', '🥇 NEW PERSONAL BEST!  '),
            h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace' } }, compResult.finalScore),
            compResult.previousBest > 0 ? h('span', { style: { fontWeight: 600, fontSize: 13, opacity: 0.85, marginLeft: 8 } },
              '(previous: ' + compResult.previousBest + ')') : null) : null,

          // Score hero (sandbox: the food and its reference line instead of a number)
          isSandbox ? h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 28 }) },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 64, lineHeight: 1 } }, sbFood.icon),
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fde68a', marginTop: 10 } }, sbFood.name),
            h('div', { style: { fontSize: 14, color: 'var(--allo-stem-text, #e2e8f0)', marginTop: 12, lineHeight: 1.6, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' } }, j.verdict)) :
          h('div', { style: Object.assign({}, cardStyle(), { textAlign: 'center', padding: 32 }) },
            h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } },
              compResult ? 'Final competition score' : 'Your score'),
            h('div', { style: { fontSize: 96, fontWeight: 900, color: gradeColor, fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1, textShadow: '0 0 28px ' + gradeColor + '66' } }, displayScore),
            compResult ? h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 8, fontFamily: 'ui-monospace, Menlo, monospace' } },
              'base ' + compResult.baseScore + (compResult.bonusTotal > 0 ? ' + ' + compResult.bonusTotal + ' bonus' : '') +
              (compResult.penaltyTotal < 0 ? ' ' + compResult.penaltyTotal + ' penalty' : '')) : null,
            h('div', { style: { fontSize: 48, fontWeight: 900, color: gradeColor, marginTop: 4 } }, 'Grade: ' + j.grade),
            h('div', { style: { fontSize: 17, color: '#fde68a', marginTop: 18, fontWeight: 700, lineHeight: 1.4 } }, j.verdict)),

          // Temperature trace — pan + food internal temp over the cook (the "when did I overheat?" view).
          (d.recipeTempHistory && d.recipeTempHistory.length > 1) && (function() {
            return h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.temperature_trace', '🌡️ Temperature trace')),
              renderTempTrace(d.recipeTempHistory, { marks: traceMarks(rec) }),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 6, lineHeight: 1.5 } }, __alloT('stem.kitchenlab.see_where_the_pan_crossed_key_threshol', 'See where the pan crossed key thresholds — and how the food\'s internal temp lagged behind the pan.'))
            );
          })(),

          // ─── Competition constraint results ───
          compResult ? h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.competition_constraints', '🏆 Competition constraints')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              compResult.constraints.map(function(c, i) {
                return h('div', { key: i,
                  style: { background: c.passed ? 'rgba(34,197,94,0.08)' : 'rgba(220,38,38,0.08)',
                    border: '1px solid ' + (c.passed ? 'rgba(34,197,94,0.3)' : 'rgba(220,38,38,0.3)'),
                    borderLeft: '4px solid ' + (c.passed ? '#22c55e' : '#dc2626'),
                    padding: '10px 14px', borderRadius: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: c.passed ? '#86efac' : '#fca5a5' } },
                      (c.passed ? '✓ ' : '✗ ') + c.label),
                    h('div', { style: { fontSize: 14, fontWeight: 900, color: c.passed ? '#86efac' : '#fca5a5', fontFamily: 'ui-monospace, Menlo, monospace' } },
                      (c.points > 0 ? '+' : '') + c.points)),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 3, fontStyle: 'italic' } }, c.description),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.5 } }, c.resultText));
              }))) : null,

          // Detailed notes
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, isSandbox ? __alloT('stem.kitchenlab.readout', '📋 Readout') : __alloT('stem.kitchenlab.judge_s_notes', '📋 Judge\'s notes')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              j.notes.map(function(n, i) {
                // neutral notes (the sandbox readout) are amber: information, not a verdict
                var tone = n.neg ? ['rgba(220,38,38,0.08)', 'rgba(220,38,38,0.3)', '#dc2626', '#fca5a5'] : n.neutral ? ['rgba(251,191,36,0.08)', 'rgba(251,191,36,0.3)', '#fbbf24', '#fde68a'] : ['rgba(34,197,94,0.08)', 'rgba(34,197,94,0.3)', '#22c55e', '#86efac'];
                return h('div', { key: i,
                  style: { background: tone[0],
                    borderTop: '1px solid ' + tone[1], borderRight: '1px solid ' + tone[1], borderBottom: '1px solid ' + tone[1],
                    borderLeft: '4px solid ' + tone[2],
                    padding: '10px 14px', borderRadius: 8 } },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: tone[3], marginBottom: 4 } }, n.label),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.5 } }, n.detail));
              }))),

          // Lessons recap
          h('div', { style: cardStyle() },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.what_this_recipe_teaches', '📖 What this recipe teaches')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              rec.teaches.map(function(t, i) {
                return h('div', { key: i, style: { padding: '8px 12px', background: 'rgba(251,146,60,0.12)',
                  border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', fontWeight: 600 } }, t);
              }))),

          // ─── Newly unlocked achievements banner ───
          (d.klNewAchievements && d.klNewAchievements.length > 0) ? h('div', { style: {
            background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(167,139,250,0.12))',
            border: '2px solid rgba(251,191,36,0.6)', borderRadius: 12, padding: '14px 18px', marginBottom: 16,
            boxShadow: '0 4px 14px rgba(251,191,36,0.2)' } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 } },
              '🎉 ' + d.klNewAchievements.length + ' new achievement' + (d.klNewAchievements.length === 1 ? '' : 's') + ' unlocked'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
              d.klNewAchievements.map(function(aid) {
                var a = ACHIEVEMENTS.find(function(x) { return x.id === aid; });
                if (!a) return null;
                var tierColor = a.tier === 'gold' ? '#fbbf24' : a.tier === 'silver' ? '#cbd5e1' : '#d97706';
                return h('div', { key: aid,
                  style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'rgba(15,23,42,0.6)', border: '1px solid ' + tierColor + '60',
                    borderRadius: 8, minWidth: 200 } },
                  h('div', { 'aria-hidden': 'true', style: { fontSize: 26, lineHeight: 1, flexShrink: 0 } }, a.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: tierColor } }, a.name),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.4 } }, a.description)));
              }))) : null,

          // ─── AI Chef's Notes (Gemini-powered critique) ───
          (ctx.callGemini) ? h('div', { style: Object.assign({}, cardStyle(), {
            borderLeft: '4px solid #a78bfa',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(15,23,42,0.6))'
          }) },
            h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.chef_s_notes_ai_generated_critique', '👨‍🍳 Chef\'s Notes (AI-generated critique)')),
            d.aiCritique ? h('div', { style: { fontSize: 13, color: '#e9d5ff', lineHeight: 1.7, fontStyle: 'italic' } },
              '"', d.aiCritique, '"') :
            d.aiCritiqueLoading ? h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic', padding: '8px 0' } },
              __alloT('stem.kitchenlab.chef_is_reviewing_your_work', '🤔 Chef is reviewing your work...')) :
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
              __alloT('stem.kitchenlab.critique_will_appear_here', 'Critique will appear here.'))) : null,

          // ─── Tournament standing (if in tournament) ───
          inTournament ? h('div', { style: Object.assign({}, cardStyle(), { borderLeft: '4px solid #fbbf24' }) },
            h('div', { style: subheaderStyle() }, '🏅 Tournament Round ' + (tRound + 1) + ' of 3'),
            h('div', { style: { display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' } },
              [0, 1, 2].map(function(i) {
                var isPast = i < tRound;
                var isCurrent = i === tRound;
                var roundScore = (d.tournamentScores || [])[i];
                var rid = (d.tournamentRecipes || [])[i];
                var rname = (RECIPE_CATALOG.find(function(x) { return x.id === rid; }) || {}).name || '—';
                return h('div', { key: i,
                  style: { flex: 1, minWidth: 120, padding: '10px 12px',
                    background: 'rgba(15,23,42,0.6)', borderRadius: 8,
                    border: '1px solid ' + (isCurrent ? 'rgba(251,191,36,0.6)' : 'rgba(100,116,139,0.3)'),
                    borderLeft: '3px solid ' + (isPast ? '#22c55e' : isCurrent ? '#fbbf24' : '#52525b'),
                    opacity: isPast || isCurrent ? 1 : 0.6 } },
                  h('div', { style: { fontSize: 10, fontWeight: 800, color: isPast ? '#86efac' : isCurrent ? '#fbbf24' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' } },
                    'Round ' + (i + 1) + (isCurrent ? ' (just finished)' : '')),
                  h('div', { style: { fontSize: 12, color: '#fde68a', marginTop: 4, lineHeight: 1.3 } }, rname),
                  roundScore != null ? h('div', { style: { fontSize: 18, fontWeight: 900, color: '#86efac', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 4 } },
                    roundScore) : null);
              })),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', textAlign: 'center' } },
              __alloT('stem.kitchenlab.running_total', 'Running total: '), h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 800, color: '#fbbf24', fontSize: 14 } },
                (d.tournamentScores || []).reduce(function(a, b) { return a + (b || 0); }, 0) + ' / ' + ((tRound + 1) * 150)))) : null,

          // Action buttons
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 } },
            inTournament && tRound < 2 ? h('button', { onClick: function() { advanceTournament(); },
              style: { padding: '12px 28px', background: '#fbbf24', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '▶ Continue to Round ' + (tRound + 2)) :
            inTournament && tRound === 2 ? h('button', { onClick: function() { advanceTournament(); },
              style: { padding: '12px 28px', background: '#22c55e', color: '#052e16',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.see_final_standings', '🏆 See final standings')) :
            compResult ? h('button', { onClick: function() { startCompetition(); awardXP(2); },
              style: { padding: '12px 24px', background: '#fb923c', color: '#1c1410',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.next_challenge', '🎲 Next challenge')) :
              h('button', { onClick: function() { startRecipe(rec.id); awardXP(2); },
                style: { padding: '12px 24px', background: '#fb923c', color: '#1c1410',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
                __alloT('stem.kitchenlab.cook_again', '🔁 Cook again')),
            !inTournament ? h('button', { onClick: function() { setKL({ recipePhase: 'idle', recipeActiveId: null,
                competitionActive: false, competitionConstraints: [], competitionDeadline: null }); },
              style: { padding: '12px 24px', background: 'transparent', color: '#fde68a',
                border: '1px solid rgba(251,146,60,0.4)', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.back_to_recipe_list_2', '🍽️ Back to recipe list')) :
              h('button', { onClick: function() { openConfirmation('tournament'); },
                style: { padding: '12px 24px', background: 'transparent', color: '#fca5a5',
                  border: '1px solid rgba(220,38,38,0.4)', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' } },
                __alloT('stem.kitchenlab.abandon_tournament', '✕ Abandon tournament')))
        );
      }

      function renderResources() {
        var sub = d.resourcesSub || 'glossary';
        var filter = (d.glossaryFilter || '').toLowerCase().trim();
        var SUBS = [
          { id: 'glossary', label: __alloT('stem.kitchenlab.glossary', 'Glossary'), icon: '📖', count: GLOSSARY.length },
          { id: 'smoke', label: __alloT('stem.kitchenlab.smoke_points', 'Smoke Points'), icon: '🛢️', count: SMOKE_POINTS.length },
          { id: 'conversions', label: __alloT('stem.kitchenlab.conversions', 'Conversions'), icon: '📏', count: CONVERSIONS.length },
          { id: 'subs', label: __alloT('stem.kitchenlab.substitutions', 'Substitutions'), icon: '🔄', count: SUBSTITUTIONS.length },
          { id: 'troubleshoot', label: __alloT('stem.kitchenlab.troubleshooter', 'Troubleshooter'), icon: '🩺', count: TROUBLESHOOTING.length },
          { id: 'sources', label: __alloT('stem.kitchenlab.sources', 'Sources'), icon: '📜' }
        ];
        var resourceTabKeyDown = function(e, index) {
          var nextIndex = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % SUBS.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + SUBS.length - 1) % SUBS.length;
          else if (e.key === 'Home') nextIndex = 0;
          else if (e.key === 'End') nextIndex = SUBS.length - 1;
          if (nextIndex < 0) return;
          e.preventDefault();
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        };
        return h('div', { role: 'tabpanel', id: 'stem-kitchen-resources-panel-' + sub, 'aria-labelledby': 'stem-kitchen-tab-resources', tabIndex: 0 },
          panelHeader('📚 Resources & Glossary',
            'Reference material — terms, conversions, smoke points, substitutions, troubleshooting. The "lookup" half of Kitchen Lab. Bookmark this section.'),

          // Sub-tab strip
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.kitchenlab.resources_sub_sections', 'Resources sub-sections'),
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            SUBS.map(function(s, subIndex) {
              var active = sub === s.id;
              return h('button', { key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                id: 'stem-kitchen-resource-tab-' + s.id,
                'aria-controls': 'stem-kitchen-resources-panel-' + s.id,
                tabIndex: active ? 0 : -1,
                onKeyDown: function(e) { resourceTabKeyDown(e, subIndex); },
                onClick: function() { setKL({ resourcesSub: s.id }); awardXP(1); },
                style: { padding: '8px 12px',
                  background: active ? 'rgba(251,146,60,0.25)' : 'rgba(15,23,42,0.5)',
                  color: active ? '#fde68a' : '#cbd5e1',
                  border: '1px solid ' + (active ? 'rgba(251,146,60,0.6)' : 'rgba(100,116,139,0.3)'),
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { 'aria-hidden': 'true' }, s.icon),
                s.label,
                s.count ? h('span', { style: { fontSize: 10, color: active ? '#fdba74' : '#94a3b8', fontFamily: 'ui-monospace, Menlo, monospace' } }, ' (' + s.count + ')') : null);
            })),

          // ─── GLOSSARY ───
          sub === 'glossary' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.culinary_glossary', '📖 Culinary Glossary')),
              h('div', { style: { marginBottom: 14 } },
                h('input', { type: 'search', value: d.glossaryFilter || '',
                  onChange: function(e) { setKL({ glossaryFilter: e.target.value }); },
                  placeholder: __alloT('stem.kitchenlab.search_terms_e_g_deglaze_emulsify_brin', 'Search terms... (e.g., "deglaze", "emulsify", "brine")'),
                  'aria-label': __alloT('stem.kitchenlab.filter_glossary_terms', 'Filter glossary terms'),
                  style: { width: '100%', padding: '10px 14px',
                    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(100,116,139,0.4)',
                    borderRadius: 8, color: 'var(--allo-stem-text, #f1f5f9)', fontSize: 13, fontFamily: 'inherit' } })),
              (function() {
                var matches = GLOSSARY.filter(function(g) {
                  if (!filter) return true;
                  return g.term.toLowerCase().includes(filter) || g.defn.toLowerCase().includes(filter);
                });
                if (matches.length === 0) {
                  return h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 12, padding: '16px 0', textAlign: 'center', fontStyle: 'italic' } },
                    'No matches for "' + filter + '". Try a partial word or check spelling.');
                }
                return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
                  matches.map(function(g, i) {
                    var tagColor = g.tag === 'science' ? '#7dd3fc' :
                                   g.tag === 'principle' ? '#a78bfa' :
                                   g.tag === 'prep' ? '#fbbf24' : '#86efac';
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid ' + tagColor, padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, g.term),
                        g.pron ? h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } }, '/' + g.pron + '/') : null,
                        h('span', { style: { fontSize: 9, fontWeight: 700, color: tagColor, background: tagColor + '15', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, g.tag)),
                      h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, g.defn));
                  }));
              })())) : null,

          // ─── SMOKE POINTS ───
          sub === 'smoke' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.cooking_oil_smoke_points', '🛢️ Cooking Oil Smoke Points')),
              h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                __alloT('stem.kitchenlab.the_smoke_point_is_the_temp_at_which_a', 'The smoke point is the temp at which an oil starts breaking down into acrolein (bitter, irritating) and free fatty acids. Cooking above smoke point = bitter taste + unhealthful compounds + real fire risk. Ranked highest to lowest.')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                SMOKE_POINTS.map(function(o, i) {
                  // Color-code: green high, amber medium, red low
                  var heatColor = o.smokeF >= 450 ? '#22c55e' : o.smokeF >= 375 ? '#fb923c' : '#dc2626';
                  var heatLabel = o.smokeF >= 450 ? 'High-heat OK' : o.smokeF >= 375 ? 'Medium-heat' : 'Low-heat only';
                  return h('div', { key: i,
                    style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
                      background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '4px solid ' + heatColor, padding: '12px 14px', borderRadius: 8 } },
                    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 } },
                      h('div', { style: { fontSize: 16, fontWeight: 900, color: heatColor, fontFamily: 'ui-monospace, Menlo, monospace' } }, o.smokeF + '°F'),
                      h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, Menlo, monospace' } }, o.smokeC + '°C')),
                    h('div', null,
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#fde68a', marginBottom: 2 } }, o.oil),
                      h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 4 } },
                        h('b', { style: { color: '#fb923c' } }, 'Use: '), o.use, ' • ',
                        h('b', { style: { color: '#fb923c' } }, 'Flavor: '), o.flavor),
                      h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.5, fontStyle: 'italic' } }, o.notes)),
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: heatColor, background: heatColor + '15', padding: '4px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' } }, heatLabel));
                })))) : null,

          // ─── CONVERSIONS ───
          sub === 'conversions' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.kitchen_conversions', '📏 Kitchen Conversions')),
              h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                __alloT('stem.kitchenlab.the_most_useful_kitchen_conversions_pl', 'The most useful kitchen conversions, plus the notes that prevent the common "why didn\'t this work" moments. Pro tip for baking: '),
                h('b', { style: { color: '#fde68a' } }, __alloT('stem.kitchenlab.measure_by_weight_when_possible', 'measure by weight when possible')),
                __alloT('stem.kitchenlab.volume_varies_up_to_20_depending_on_ho', ' — volume varies up to 20% depending on how you scoop.')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                CONVERSIONS.map(function(c, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #38bdf8', padding: '10px 14px', borderRadius: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', fontFamily: 'ui-monospace, Menlo, monospace' } }, c.from),
                      h('span', { 'aria-hidden': 'true', style: { color: '#fb923c', fontSize: 14, fontWeight: 700 } }, '→'),
                      h('div', { style: { fontSize: 12, color: '#7dd3fc', fontFamily: 'ui-monospace, Menlo, monospace' } }, c.to)),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, fontStyle: 'italic' } }, c.notes));
                })))) : null,

          // ─── SUBSTITUTIONS ───
          sub === 'subs' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.emergency_substitutions', '🔄 Emergency Substitutions')),
              h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                __alloT('stem.kitchenlab.when_you_start_cooking_realize_you_don', 'When you start cooking + realize you don\'t have an ingredient, these are the swaps that actually work. Each entry includes '),
                h('b', { style: { color: '#fde68a' } }, 'why'),
                __alloT('stem.kitchenlab.the_swap_works_so_you_can_adapt_to_sim', ' the swap works so you can adapt to similar situations.')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                SUBSTITUTIONS.map(function(s, i) {
                  return h('div', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #a78bfa', padding: '12px 14px', borderRadius: 8 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 6 } },
                      'Missing: ' + s.missing),
                    h('div', { style: { fontSize: 12, color: '#dcfce7', lineHeight: 1.55, marginBottom: 6,
                      background: 'rgba(34,197,94,0.08)', padding: '8px 10px', borderRadius: 6 } },
                      h('b', { style: { color: '#86efac' } }, 'Use: '), s.sub),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, fontStyle: 'italic' } },
                      h('b', null, 'Why: '), s.why));
                })))) : null,

          // ─── TROUBLESHOOTER ───
          sub === 'troubleshoot' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.why_did_my_x_fail_troubleshooter', '🩺 "Why did my X fail?" Troubleshooter')),
              h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 } },
                __alloT('stem.kitchenlab.the_most_common_cooking_failures_their', 'The most common cooking failures + their likely causes. Most cooking problems are some combination of these — work through the list, fix the ones that apply, try again.')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                TROUBLESHOOTING.map(function(t, i) {
                  return h('details', { key: i,
                    style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #fbbf24', borderRadius: 8 } },
                    h('summary', {
                      style: { padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fde68a',
                        listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { 'aria-hidden': 'true', style: { color: '#fb923c' } }, '▶'),
                      t.problem),
                    h('ul', { style: { margin: '0 0 12px 0', padding: '0 14px 0 36px', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 12, lineHeight: 1.7 } },
                      t.causes.map(function(c, ci) { return h('li', { key: ci, style: { marginBottom: 4 } }, c); })));
                })))) : null,

          // ─── SOURCES ───
          sub === 'sources' ? h('div', null,
            h('div', { style: cardStyle() },
              h('div', { style: subheaderStyle() }, __alloT('stem.kitchenlab.sources_further_reading', '📜 Sources + Further Reading')),
              h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.7 } },
                h('p', { style: { margin: '0 0 12px 0' } },
                  __alloT('stem.kitchenlab.kitchen_lab_content_is_anchored_in_pub', 'Kitchen Lab content is anchored in publicly available food-safety guidance + culinary science references. Where temperatures or rules appear, the cited source is the authoritative one for the US:')),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 } },
                  [
                    { name: __alloT('stem.kitchenlab.usda_fsis', 'USDA FSIS'), topic: 'Safe cooking temps, meat handling, recall data', url: 'fsis.usda.gov' },
                    { name: __alloT('stem.kitchenlab.fda_food_code_2022', 'FDA Food Code 2022'), topic: 'Bacteria danger zone, cross-contamination, allergens-9 (FASTER Act 2023 added sesame)', url: 'fda.gov/food/retail-food-protection/fda-food-code' },
                    { name: __alloT('stem.kitchenlab.cdc_foodsafety_gov', 'CDC Foodsafety.gov'), topic: 'Foodborne illness, handwashing protocols, kitchen hygiene', url: 'foodsafety.gov' },
                    { name: __alloT('stem.kitchenlab.who_12_step_handwash', 'WHO 12-step handwash'), topic: 'The technical sequence used in healthcare + commercial kitchens worldwide', url: 'who.int' },
                    { name: __alloT('stem.kitchenlab.harold_mcgee_on_food_and_cooking_2nd_e', 'Harold McGee, "On Food and Cooking" (2nd ed.)'), topic: 'The science reference for culinary curiosity — Maillard chemistry, emulsions, heat transfer', url: 'book' },
                    { name: __alloT('stem.kitchenlab.modernist_cuisine_myhrvold', 'Modernist Cuisine (Myhrvold)'), topic: 'Deep technical reference; Maillard temp data + heat transfer models', url: 'book' },
                    { name: __alloT('stem.kitchenlab.kenji_l_pez_alt_the_food_lab', 'Kenji López-Alt, "The Food Lab"'), topic: 'Practical kitchen science, accessible; technique + science integration', url: 'book' },
                    { name: __alloT('stem.kitchenlab.servsafe_instructor_guide', 'ServSafe instructor guide'), topic: 'Industry-standard food safety certification training', url: 'servsafe.com' },
                    { name: __alloT('stem.kitchenlab.iarc_monographs', 'IARC monographs'), topic: 'Acrylamide classification (Group 2A, probable human carcinogen)', url: 'monographs.iarc.who.int' }
                  ].map(function(s, i) {
                    return h('div', { key: i,
                      style: { background: 'rgba(15,23,42,0.5)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #fb923c', padding: '10px 12px', borderRadius: 8 } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fde68a', marginBottom: 4 } }, s.name),
                      h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 4 } }, s.topic),
                      s.url !== 'book' ? h('div', { style: { fontSize: 10, color: '#fb923c', fontFamily: 'ui-monospace, Menlo, monospace' } }, s.url) : null);
                  }))))) : null
        );
      }

      // ─── Style helpers ───
      function cardStyle() {
        // Longhand borders on purpose: callers override borderLeft for accent
        // rails, and React warns (and can drop the rail) when a `border`
        // shorthand and `borderLeft` meet on the same node across re-renders.
        var edge = '1px solid rgba(100,116,139,0.25)';
        return {
          background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: '16px 18px',
          borderTop: edge, borderRight: edge, borderBottom: edge, borderLeft: edge, marginBottom: 16
        };
      }
      function subheaderStyle() {
        return {
          fontSize: 14, fontWeight: 800, color: '#fde68a', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8
        };
      }


      function renderStart() {
        var paths = [
          { id: 'studio', title: 'Practice in the 3D kitchen', desc: 'Six untimed stations. Make choices, observe the result, and collect evidence of your reasoning.', tag: 'DO + EXPLAIN' },
          { id: 'safety', title: 'Build your foundations', desc: 'Start with food safety, then explore knife preparation and heat techniques.', tag: 'LEARN + REHEARSE' },
          { id: 'recipe', title: 'Put skills together', desc: 'Manage a recipe with adjustable heat and pause controls. Try competition when you are ready.', tag: 'APPLY + REFLECT' }
        ];
        return h('div', { className: 'kl-start' },
          h('p', { style: { color: '#fdba74', letterSpacing: 2, fontSize: 11, fontWeight: 800 } }, __alloT('stem.kitchenlab.learning_path', 'YOUR LEARNING PATH')),
          h('h2', { style: { fontSize: 30, lineHeight: 1.2, margin: '10px 0' } }, __alloT('stem.kitchenlab.confidence', 'Build confidence, one kitchen skill at a time.')),
          h('p', { style: { maxWidth: 720, lineHeight: 1.7 } }, __alloT('stem.kitchenlab.start_intro', 'Choose where to begin. Practice at your own pace, learn from useful feedback, then demonstrate what you know with actions and explanations.')),
          h('div', { className: 'kl-start-paths' }, paths.map(function(p) {
            return h('button', { key: p.id, type: 'button', onClick: function() { setSection(p.id); }, className: 'kl-start-path' },
              h('span', { style: { color: '#fdba74', fontSize: 11, letterSpacing: 1 } }, __alloT('stem.kitchenlab.path_' + p.id + '_tag', p.tag)),
              h('strong', { style: { display: 'block', fontSize: 21, margin: '12px 0' } }, __alloT('stem.kitchenlab.path_' + p.id + '_title', p.title)),
              h('span', { style: { lineHeight: 1.7, display: 'block', color: '#e2e8f0' } }, __alloT('stem.kitchenlab.path_' + p.id + '_desc', p.desc)));
          })),
          h('details', { style: { marginTop: 24, lineHeight: 1.7 } },
            h('summary', { style: { cursor: 'pointer', padding: '12px 0', fontWeight: 700 } }, __alloT('stem.kitchenlab.teacher_guide', 'For educators: use evidence to guide the next step')),
            h('p', null, __alloT('stem.kitchenlab.teacher_studio_guide', 'Ask learners to predict, act, observe, and explain. The studio records corrections and hints separately from independent completion. Use its downloaded notebook for a conference, a spoken or signed explanation, or a supervised practical demonstration. A completed simulation is evidence of decisions, not certification of physical kitchen skill.'))));
      }
      // The 3D Recipe Kitchen (stem_lab/kitchen_studio/recipe_lab.html): the two
      // pasta cooks with a Three.js bench and the moisture / crowding / pan-size
      // model this tab's physics now borrows from. Reached from the recipe list.
      function renderRecipeKitchen() {
        return h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' } },
            h('button', { type: 'button', onClick: function() { setSection('recipe'); }, 'data-kl-back': 'recipe',
              style: { padding: '8px 14px', background: 'rgba(15,23,42,0.6)', color: '#fde68a', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
              __alloT('stem.kitchenlab.back_to_recipe_sim', '← Back to the recipe list')),
            h('a', { href: 'stem_lab/kitchen_studio/recipe_lab.html', target: '_blank', rel: 'noopener', style: { color: '#fde68a', fontSize: 13 } }, __alloT('stem.kitchenlab.open_recipe_kitchen', 'Open the Recipe Kitchen in a full window'))),
          h('iframe', { src: 'stem_lab/kitchen_studio/recipe_lab.html', title: __alloT('stem.kitchenlab.recipe_kitchen_frame', 'Kitchen Lab 3D Recipe Kitchen'), style: { width: '100%', height: 'min(1100px, 85vh)', minHeight: 640, border: '1px solid #64748b', borderRadius: 16, background: '#f5f4eb' } }));
      }
      function renderStudio() {
        return h('div', null,
          h('p', { style: { margin: '0 0 12px', fontSize: 13 } }, h('a', { href: 'stem_lab/kitchen_studio/index.html', target: '_blank', rel: 'noopener', style: { color: '#fde68a' } }, __alloT('stem.kitchenlab.open_studio', 'Open the skills studio in a full window'))),
          h('iframe', { src: 'stem_lab/kitchen_studio/index.html', title: __alloT('stem.kitchenlab.studio_frame', 'Kitchen Lab 3D Skills Studio'), style: { width: '100%', height: 'min(1100px, 85vh)', minHeight: 640, border: '1px solid #64748b', borderRadius: 16, background: '#f5f4eb' } }));
      }

      // Sizzle audio lives only while the cockpit is on screen and cooking
      if (section !== 'recipe' || d.recipePhase !== 'cooking') setTimeout(function() { klAudioSet(0, 'quiet', false); }, 0);
      // ─── Section dispatch ───
      var content;
      if (section === 'start') content = renderStart();
      else if (section === 'studio') content = renderStudio();
      else if (section === 'knife') content = renderKnife();
      else if (section === 'heat') content = renderHeat();
      else if (section === 'maillard') content = renderMaillard();
      else if (view === 'recipeKitchen') content = renderRecipeKitchen();
      else if (section === 'recipe') content = renderRecipe();
      else if (section === 'resources') content = renderResources();
      else if (section === 'maillardHunt') content = (function() {
        var iq = d.maillardHunt || { tempF: 350, aminoPct: 50, sugarPct: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { setKL({ maillardHunt: Object.assign({}, iq, patch) }); }
        var reactivity = (iq.tempF > 280 ? (iq.tempF - 280) / 200 : 0) * (iq.aminoPct / 100) * (iq.sugarPct / 100);
        var state;
        if (reactivity < 0.05) state = 'noReact';
        else if (reactivity < 0.3) state = 'beginning';
        else if (reactivity < 0.6) state = 'active';
        else if (reactivity < 0.9) state = 'deep';
        else state = 'burnt';
        var sm = {
          noReact:   { label: __alloT('stem.kitchenlab.no_reaction', '⚪ No reaction'), color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', desc: __alloT('stem.kitchenlab.below_threshold_no_maillard_activity', 'Below threshold — no Maillard activity.') },
          beginning: { label: __alloT('stem.kitchenlab.browning_begins', '🟡 Browning begins'), color: '#92400e', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.kitchenlab.light_tan_color_mild_aroma', 'Light tan color, mild aroma.') },
          active:    { label: __alloT('stem.kitchenlab.active_maillard', '🟠 Active Maillard'), color: '#ea580c', bg: '#fff7ed', border: '#fdba74', desc: __alloT('stem.kitchenlab.golden_brown_rich_aroma_compounds_form', 'Golden-brown, rich aroma compounds forming.') },
          deep:      { label: __alloT('stem.kitchenlab.deep_brown', '🟤 Deep brown'), color: '#92400e', bg: '#fef3c7', border: '#fbbf24', desc: __alloT('stem.kitchenlab.strong_flavors_approaching_upper_limit', 'Strong flavors. Approaching upper limit.') },
          burnt:     { label: __alloT('stem.kitchenlab.burnt_acrylamide_risk', '⚫ Burnt / acrylamide risk'), color: '#1e293b', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.kitchenlab.pyrolysis_bitter_potential_acrylamide_', 'Pyrolysis. Bitter, potential acrylamide formation.') }
        }[state];
        return h('div', { className: 'p-4 rounded-xl bg-white border border-orange-300 space-y-3' },
          h('h3', { className: 'text-sm font-black text-orange-700' }, __alloT('stem.kitchenlab.maillard_browning_discovery', '🔬 Maillard browning discovery')),
          h('p', { className: 'text-[0.75rem] text-slate-700 leading-relaxed' }, __alloT('stem.kitchenlab.sliders_for_surface_temp_amino_acid_su', 'Sliders for surface temp, amino-acid %, sugar %. Discrete 5-state browning stage. No score, no reveal.')),
          h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
            h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
            h('div', { className: 'text-[0.6875rem] text-slate-700 mt-1' }, sm.desc)
          ),
          h('div', { className: 'grid grid-cols-3 gap-3' },
            [{ k: 'tempF', l: 'Surface °F', mn: 200, mx: 500, st: 5 },
             { k: 'aminoPct', l: 'Amino acid %', mn: 0, mx: 100, st: 5 },
             { k: 'sugarPct', l: 'Sugar %', mn: 0, mx: 100, st: 5 }].map(function(s) {
              return h('div', { key: s.k },
                h('label', { htmlFor: 'mh-' + s.k, className: 'block text-[0.6875rem] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-orange-700' }, iq[s.k])),
                h('input', { id: 'mh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                  onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                  className: 'w-full', 'aria-label': s.l }));
            })
          ),
          h('div', { className: 'flex gap-2 items-center flex-wrap' },
            h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ t: iq.tempF, a: iq.aminoPct, s: iq.sugarPct, st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[0.6875rem] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.kitchenlab.log', '📋 Log')),
            h('button', { onClick: function() { setIQ({ tempF: 350, aminoPct: 50, sugarPct: 50, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[0.6875rem] font-semibold text-slate-600 border border-slate-500' }, __alloT('stem.kitchenlab.reset', '↺ Reset'))
          ),
          h('textarea', { id: 'kitchen-maillard-hypothesis', 'aria-label': __alloT('stem.kitchenlab.a11y_maillard_reaction_hypothesis', 'Maillard reaction hypothesis'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.kitchenlab.hypothesis_both_amino_sugar_needed_or_', 'Hypothesis: Both amino + sugar needed? Or one is enough?'),
            className: 'w-full text-[0.75rem] border border-slate-500 rounded p-2 font-mono leading-snug bg-white text-slate-800', rows: 3 }),
          !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[0.6875rem] font-bold text-amber-800 border border-amber-300' }, __alloT('stem.kitchenlab.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
          iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-700 leading-relaxed' },
            h('ul', { className: 'list-disc pl-5 space-y-1' },
              h('li', null, __alloT('stem.kitchenlab.what_happens_at_100_amino_but_0_sugar', 'What happens at 100% amino but 0% sugar?')),
              h('li', null, __alloT('stem.kitchenlab.why_does_crust_form_on_bread_above_320', 'Why does crust form on bread above 320°F?')))),
          h('label', { className: 'flex items-center gap-2 text-[0.75rem] font-bold text-emerald-800 cursor-pointer' },
            h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
            __alloT('stem.kitchenlab.i_understand_explain_in_own_words', 'I understand — explain in own words')),
          iq.understood && h('textarea', { id: 'kitchen-maillard-explanation', 'aria-label': __alloT('stem.kitchenlab.a11y_explain_the_chemistry_of_maillard_browning', 'Explain the chemistry of Maillard browning'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.kitchenlab.explain_the_chemistry_of_maillard_brow', 'Explain the chemistry of Maillard browning.'),
            className: 'w-full text-[0.75rem] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
          h('div', { className: 'text-[0.625rem] italic text-slate-500' }, __alloT('stem.kitchenlab.design_note_discrete_5_state_browning_', 'Design note: discrete 5-state browning marker; no flavor score; no reveal — by design.'))
        );
      })();
      else content = renderSafety();

      return h('div', { id: 'kitchen-lab-region', tabIndex: -1, style: rootStyle, role: 'region', 'aria-label': __alloT('stem.kitchenlab.kitchen_lab_2', 'Kitchen Lab') },
        // ── Light-mode readability (2026-08-05) ─────────────────────────────
        // This tool paints a PERMANENTLY dark surface (rootStyle's #1c1410 →
        // #251a13 gradient); it does not follow the theme the way a light-palette
        // tool does. But its text asked for var(--allo-stem-text), which the
        // default/light palette defines as #0f172a — near-black ON near-black,
        // measured at 1.02:1. Every heading, body line and caption using the
        // variable (112 sites) was invisible in light mode while the hardcoded
        // amber accents stayed readable, which is exactly what the field report
        // showed.
        //
        // Rebind the two text variables for THIS SUBTREE ONLY, so the surface and
        // its text are described by the same palette. Measured on #1c1410:
        // 1.02:1 → 14.72:1 for body text, 7.08:1 for the soft variant. Dark theme
        // already supplied these exact values, so it renders identically; the
        // second rule keeps high-contrast yellow (16.90:1 here), which must not be
        // flattened away by the first rule.
        h('style', null,
          '#kitchen-lab-region .kl-start{max-width:1100px;margin:12px auto;padding:8px 0 36px}' +
          '#kitchen-lab-region .kl-start-paths{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:16px;margin-top:26px}' +
          '#kitchen-lab-region .kl-start-path{min-height:200px;padding:24px;text-align:left;background:#30251c;color:#fff7e3;border:1px solid #98714c;border-radius:16px;cursor:pointer;font:inherit}' +
          '#kitchen-lab-region .kl-start-path:hover{background:#403022}' +
          '#kitchen-lab-region button:focus-visible,#kitchen-lab-region a:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}' +
          '#kitchen-lab-region [role=tab]{min-height:44px}' +
          '#kitchen-lab-region{--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8;}' +
          '.theme-contrast #kitchen-lab-region{--allo-stem-text:#ffff00;--allo-stem-text-soft:#ffff00;}'),
        renderHeader(),
        renderTabs(),
        h('div', { role: 'tabpanel', id: 'stem-kitchen-panel-' + section, 'aria-labelledby': 'stem-kitchen-tab-' + section, tabIndex: 0, style: { padding: 20 } }, content),
        d.pendingConfirmation ? renderConfirmationDialog() : null
      );
    }
  });
})();
}
