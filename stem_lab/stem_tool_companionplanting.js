// ═══════════════════════════════════════════
// stem_tool_companionplanting.js — Companion Planting Lab (standalone CDN module)
// Three Sisters garden simulator with Sims-style management, seasons, soil science
// Extracted from stem_tool_science.js and enhanced
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

// Dedup: skip if already registered (hub may have loaded inline copy)
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('companionPlanting'))) {

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-companionplanting')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-companionplanting';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('companionPlanting', {
    icon: '🔬',
    label: 'companionPlanting',
    desc: '',
    color: 'slate',
    category: 'science',
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var renderTutorial = ctx.renderTutorial || function() { return null; };
      var _tutCompanionPlanting = ctx._tutCompanionPlanting || [];
      var props = ctx.props;

      // ── Tool body (companionPlanting) ──
      return (function() {
var d = (labToolData.companionPlanting) || {};

          var upd = function (key, val) { var _k = {}; _k[key] = val; setLabToolData(function (prev) { return Object.assign({}, prev, { companionPlanting: Object.assign({}, prev.companionPlanting || {}, _k) }); }); };



          // ── State defaults ──

          var phase = d.phase || 'plant';  // 'plant' | 'grow' | 'harvest'

          var growthTime = d.growthTime || 0;   // 0-100

          var growSpeed = d.growSpeed || 1;  // 1, 2, or 5

          var cornPlanted = d.cornPlanted || false;

          var beansPlanted = d.beansPlanted || false;

          var squashPlanted = d.squashPlanted || false;

          var compareMode = d.compareMode || false;

          var showCulture = d.showCulture || false;

          var showSoilDetail = d.showSoilDetail || false;

          var quizActive = d.quizActive || false;

          var quizQ = d.quizQ || 0;

          var showSciencePanel = d.showSciencePanel || false;

          var quizAnswer = d.quizAnswer || '';

          var quizFeedback = d.quizFeedback || '';



          // ── Sims-style needs/meters ──

          var day = d.day || 0;

          var moisture = typeof d.moisture === 'number' ? d.moisture : 60;

          var nitrogenLevel = typeof d.nitrogenLevel === 'number' ? d.nitrogenLevel : 35;

          var pestPressure = typeof d.pestPressure === 'number' ? d.pestPressure : 10;

          var weedCover = typeof d.weedCover === 'number' ? d.weedCover : 15;

          var soilTemp = typeof d.soilTemp === 'number' ? d.soilTemp : 20;

          var plantHealth = typeof d.plantHealth === 'number' ? d.plantHealth : 100;

          var actionCooldowns = d.actionCooldowns || {};    // { water: 0, compost: 0, weed: 0, inspect: 0, mulch: 0 }

          var eventLog = d.eventLog || [];

          var eventPopup = d.eventPopup || null;

          var synCornBeans = typeof d.synCornBeans === 'number' ? d.synCornBeans : 0;

          var synBeansSoil = typeof d.synBeansSoil === 'number' ? d.synBeansSoil : 0;

          var synSquashAll = typeof d.synSquashAll === 'number' ? d.synSquashAll : 0;

          var seasonScore = d.seasonScore || 0;

          var totalScore = d.totalScore || 0;

          var harvestCount = d.harvestCount || 0;

          var lastEventDay = d.lastEventDay || 0;

          var nitrogenCarryover = d.nitrogenCarryover || 0;



          // ── Season calculation ──

          var DAYS_PER_SEASON = 30;

          var seasonIndex = Math.floor((day % 120) / DAYS_PER_SEASON);  // 0=spring, 1=summer, 2=autumn, 3=winter

          var seasonNames = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'];

          var seasonName = seasonNames[seasonIndex];

          var dayInSeason = (day % 120) % DAYS_PER_SEASON;

          var seasonFactors = [

            { growth: 1.0, pestRate: 0.6, moistureDecay: 1.5, ambientTemp: 18 },  // spring

            { growth: 1.4, pestRate: 1.3, moistureDecay: 2.5, ambientTemp: 30 },  // summer

            { growth: 0.6, pestRate: 0.4, moistureDecay: 1.0, ambientTemp: 15 },  // autumn

            { growth: 0.0, pestRate: 0.1, moistureDecay: 0.5, ambientTemp: 4 }    // winter

          ];

          var sf = seasonFactors[seasonIndex];



          // ── Computed values from meters ──

          var allPlanted = cornPlanted && beansPlanted && squashPlanted;

          var soilHealth = Math.round(Math.max(0, Math.min(100,

            (Math.min(nitrogenLevel, 100) * 0.25) +

            (Math.min(moisture, 100) * 0.25) +

            ((100 - Math.min(pestPressure, 100)) * 0.2) +

            ((100 - Math.min(weedCover, 100)) * 0.15) +

            (plantHealth * 0.15)

          )));



          // Synergy bonuses

          var synergyBonus = 1 + (synCornBeans / 500) + (synBeansSoil / 500) + (synSquashAll / 500);



          // Monoculture comparison (simulated decline)

          var t_norm = growthTime / 100;

          var monoN = Math.max(5, 30 - 25 * t_norm);

          var monoH2O = Math.max(15, 40 - 25 * t_norm);

          var monoWeeds = Math.min(95, 30 + 65 * t_norm);

          var monoHealth = Math.round((monoN + monoH2O + (100 - monoWeeds)) / 3);



          // Legacy aliases for gauge display

          var nitrogen = nitrogenLevel;

          var weedPressure = weedCover;

          var temperature = soilTemp;



          // ── Random Events Table ──

          var _EVENTS = [

            { id: 'rain', emoji: '🌧️', title: 'Heavy Rain', desc: 'A downpour soaks the soil! Nitrogen leaches with runoff.', effects: { moisture: 40, nitrogenLevel: -5 }, lesson: 'Nutrient leaching: Heavy rain washes soluble nitrogen deeper into soil, away from plant roots. Cover crops and mulch help prevent this.' },

            { id: 'aphids', emoji: '🐛', title: 'Aphid Outbreak', desc: 'Aphids swarm the garden!', effects: { pestPressure: 30 }, lesson: 'Biological pest control: Aphids feed on plant sap. Ladybugs, lacewings, and parasitic wasps are natural predators that control aphid populations without chemicals.' },

            { id: 'pollinators', emoji: '🐝', title: 'Pollinator Visit', desc: 'Bees and butterflies visit the garden!', effects: { plantHealth: 15 }, lesson: 'Pollination biology: Squash flowers especially depend on pollinators. Companion planting attracts diverse pollinators, improving fruit set across all crops.' },

            { id: 'wind', emoji: '🌪️', title: 'Wind Storm', desc: 'Strong winds stress the plants.', effects: { plantHealth: -10, moisture: -10 }, lesson: 'Windbreak design: Dense planting and tall stalks (like corn) create natural windbreaks. Bean vines wrapped around corn stalks add structural stability.' },

            { id: 'ladybugs', emoji: '🐞', title: 'Ladybug Arrival', desc: 'Ladybugs colonize the garden!', effects: { pestPressure: -25 }, lesson: 'Beneficial insects: A single ladybug eats ~5,000 aphids in its lifetime. Companion planting creates habitat diversity that attracts these natural pest controllers.' },

            { id: 'heatwave', emoji: '☀️', title: 'Heat Wave', desc: 'Scorching heat dries the soil.', effects: { moisture: -20, soilTemp: 5 }, lesson: 'Microclimate management: Squash leaves shade the soil, reducing temperature by up to 10°F and cutting evaporation by 50%. This living mulch is nature\'s AC.' },

            { id: 'mycorrhiza', emoji: '🍄', title: 'Mycorrhizal Bloom', desc: 'Beneficial fungi spread through the root zone!', effects: { nitrogenLevel: 15, plantHealth: 10 }, lesson: 'Fungal symbiosis: Mycorrhizal fungi extend plant root systems 100-1000×, trading soil minerals for plant sugars. This underground network connects all three sisters.' }

          ];



          // ── Action definitions ──

          var _ACTIONS = [

            { id: 'water', emoji: '💧', label: 'Water', effect: function () { return { moisture: 25 }; }, cooldownDays: 4, tip: 'Irrigate the soil' },

            { id: 'compost', emoji: '🧱', label: 'Compost', effect: function () { return { nitrogenLevel: 20, plantHealth: 5 }; }, cooldownDays: 6, tip: 'Add organic compost' },

            { id: 'weed', emoji: '🧹', label: 'Weed', effect: function () { return { weedCover: -30, pestPressure: -10 }; }, cooldownDays: 3, tip: 'Remove weeds' },

            { id: 'inspect', emoji: '🔍', label: 'Inspect', effect: function () { return { pestPressure: -5 }; }, cooldownDays: 2, tip: 'Check for pests' },

            { id: 'mulch', emoji: '🍂', label: 'Mulch', effect: function () { return { weedCover: -15, moisture: 10 }; }, cooldownDays: 5, tip: 'Spread organic mulch' }

          ];



          // ── Helper: apply effects dict ──

          function applyEffects(efx) {

            setLabToolData(function (prev) {

              var cp = Object.assign({}, prev.companionPlanting || {});

              Object.keys(efx).forEach(function (k) {

                var cur = typeof cp[k] === 'number' ? cp[k] : 0;

                cp[k] = Math.max(0, Math.min(100, cur + efx[k]));

              });

              return Object.assign({}, prev, { companionPlanting: cp });

            });

          }



          // ── Perform action ──

          function doAction(actionDef) {

            var efx = actionDef.effect();

            applyEffects(efx);

            // Set cooldown

            var newCD = Object.assign({}, actionCooldowns);

            newCD[actionDef.id] = day + actionDef.cooldownDays;

            upd('actionCooldowns', newCD);

            awardStemXP('companion_action_' + actionDef.id, 5, actionDef.label + ' action');

            if (addToast) addToast(actionDef.emoji + ' ' + actionDef.label + '! ' + actionDef.tip, 'success');

          }



          // ── Quiz data ──

          var quizzes = [

            { q: 'Which plant fixes atmospheric nitrogen into the soil?', opts: ['Corn', 'Beans', 'Squash'], correct: 'Beans', explain: 'Bean roots house Rhizobium bacteria that convert N₂ gas into ammonia (NH₃), enriching the soil for all three plants.' },

            { q: 'What role do squash leaves play in the Three Sisters system?', opts: ['Structural support', 'Living mulch', 'Nitrogen fixation'], correct: 'Living mulch', explain: 'Squash\'s large leaves shade the soil, retaining moisture, cooling roots, and suppressing weed growth — acting as living mulch.' },

            { q: 'Why are beans planted around the corn stalks?', opts: ['For shade', 'To climb the stalks', 'For color'], correct: 'To climb the stalks', explain: 'Corn provides a natural trellis for bean vines to climb, replacing the need for artificial supports.' },

            { q: 'The milpa system originated approximately how many years ago?', opts: ['500 years', '2,000 years', '7,000+ years'], correct: '7,000+ years', explain: 'Archaeological evidence traces the milpa companion planting system to Mesoamerica over 7,000 years ago.' },

            { q: 'Corn and beans together provide a complete protein because:', opts: ['They taste good together', 'Their amino acid profiles complement each other', 'They grow at the same rate'], correct: 'Their amino acid profiles complement each other', explain: 'Corn is rich in methionine but low in lysine; beans are rich in lysine but low in methionine. Together they form a complete protein.' },

            { q: 'What organisms in bean root nodules actually fix nitrogen?', opts: ['Mycorrhizal fungi', 'Rhizobium bacteria', 'Earthworms'], correct: 'Rhizobium bacteria', explain: 'Rhizobium bacteria form a symbiotic relationship with legume roots, converting atmospheric N₂ into plant-usable ammonia through nitrogenase enzyme.' },

            { q: 'How do prickly squash stems help the garden?', opts: ['They attract pollinators', 'They deter pests like raccoons and deer', 'They provide nutrients'], correct: 'They deter pests like raccoons and deer', explain: 'The spiny, prickly stems and vines of many squash varieties create a natural barrier that discourages animals from entering the garden.' },

            { q: 'What is the Haudenosaunee name for the Three Sisters?', opts: ['Milpa', 'De-oh-há-ko', 'Teosinte'], correct: 'De-oh-há-ko', explain: 'De-oh-há-ko means "they sustain us" — the Haudenosaunee view the Three Sisters as inseparable spiritual beings, not merely crops.' }

          ];

          var currentQuiz = quizzes[quizQ % quizzes.length];

          // === Wave 1: COMPANION_PAIRS ===
          var COMPANION_PAIRS = [
            { plant1: 'Tomato', plant2: 'Basil', icon1: '\uD83C\uDF45', icon2: '\uD83C\uDF3F', benefit: 'Basil repels aphids, whiteflies, and mosquitoes. May improve tomato flavor.', type: 'friend', science: 'Volatile compounds (linalool, eugenol) from basil interfere with pest olfactory receptors.' },
            { plant1: 'Tomato', plant2: 'Marigold', icon1: '\uD83C\uDF45', icon2: '\uD83C\uDF3B', benefit: 'Marigold roots release alpha-terthienyl, which kills root-knot nematodes.', type: 'friend', science: 'Allelopathy: marigold root exudates are toxic to soil nematodes within a 6-inch radius.' },
            { plant1: 'Carrot', plant2: 'Onion', icon1: '\uD83E\uDD55', icon2: '\uD83E\uDDC5', benefit: 'Onion scent masks carrot smell from carrot rust flies, and vice versa.', type: 'friend', science: 'Olfactory confusion: mixed volatile profiles disrupt pest host-finding behavior.' },
            { plant1: 'Corn', plant2: 'Beans', icon1: '\uD83C\uDF3D', icon2: '\uD83E\uDED8', benefit: 'Corn provides structure for beans to climb; beans fix nitrogen for corn.', type: 'friend', science: 'Rhizobium bacteria in bean root nodules convert N\u2082 to NH\u2083 via nitrogenase enzyme.' },
            { plant1: 'Squash', plant2: 'Corn', icon1: '\uD83C\uDF83', icon2: '\uD83C\uDF3D', benefit: 'Squash leaves shade soil, reducing weeds and water loss around corn.', type: 'friend', science: 'Living mulch effect: large leaves reduce soil temperature by 5-10\u00B0F and evaporation by 50%.' },
            { plant1: 'Lettuce', plant2: 'Radish', icon1: '\uD83E\uDD6C', icon2: '\uD83E\uDED1', benefit: 'Radishes break up soil for lettuce roots and mature before lettuce needs space.', type: 'friend', science: 'Trap cropping: radishes attract flea beetles away from lettuce leaves.' },
            { plant1: 'Cucumber', plant2: 'Sunflower', icon1: '\uD83E\uDD52', icon2: '\uD83C\uDF3B', benefit: 'Sunflowers attract pollinators and provide wind protection for cucumbers.', type: 'friend', science: 'Pollinator attraction: sunflowers increase bee visits to nearby crops by 30-50%.' },
            { plant1: 'Pepper', plant2: 'Spinach', icon1: '\uD83C\uDF36\uFE0F', icon2: '\uD83E\uDD6C', benefit: 'Spinach provides ground cover; peppers provide shade as spinach prefers cool soil.', type: 'friend', science: 'Microclimate management: intercropping reduces soil temperature in the root zone.' },
            { plant1: 'Rose', plant2: 'Garlic', icon1: '\uD83C\uDF39', icon2: '\uD83E\uDDC4', benefit: 'Garlic repels aphids and Japanese beetles from roses.', type: 'friend', science: 'Sulfur compounds (allicin) from garlic act as natural insect deterrents.' },
            { plant1: 'Strawberry', plant2: 'Borage', icon1: '\uD83C\uDF53', icon2: '\uD83D\uDC1D', benefit: 'Borage attracts pollinators to strawberries and may improve flavor.', type: 'friend', science: 'Borage flowers produce exceptional amounts of nectar, attracting bees within a 50m radius.' },
            { plant1: 'Tomato', plant2: 'Walnut', icon1: '\uD83C\uDF45', icon2: '\uD83C\uDF33', benefit: 'ENEMY! Walnut roots release juglone, which kills tomatoes and peppers.', type: 'enemy', science: 'Allelopathy: juglone (5-hydroxy-1,4-naphthalenedione) inhibits respiration in sensitive plants.' },
            { plant1: 'Beans', plant2: 'Onion', icon1: '\uD83E\uDED8', icon2: '\uD83E\uDDC5', benefit: 'ENEMY! Onions stunt bean growth and inhibit nitrogen fixation.', type: 'enemy', science: 'Allium compounds suppress Rhizobium bacteria activity in legume root nodules.' },
            { plant1: 'Potato', plant2: 'Tomato', icon1: '\uD83E\uDD54', icon2: '\uD83C\uDF45', benefit: 'ENEMY! Both are Solanaceae \u2014 share late blight and attract same pests.', type: 'enemy', science: 'Disease transmission: Phytophthora infestans spreads rapidly between related hosts.' },
            { plant1: 'Fennel', plant2: 'Most Plants', icon1: '\uD83C\uDF3F', icon2: '\u274C', benefit: 'ENEMY! Fennel inhibits growth of nearly all nearby plants.', type: 'enemy', science: 'Strong allelopathic effects from anethole and fenchone suppress neighboring root growth.' },
            { plant1: 'Dill', plant2: 'Cabbage', icon1: '\uD83C\uDF3F', icon2: '\uD83E\uDD6C', benefit: 'Dill attracts wasps that parasitize cabbage worms.', type: 'friend', science: 'Braconid wasps lay eggs inside cabbage moth larvae, providing biological pest control.' },
            { plant1: 'Nasturtium', plant2: 'Squash', icon1: '\uD83C\uDF3A', icon2: '\uD83C\uDF83', benefit: 'Nasturtiums trap aphids away from squash (sacrificial trap crop).', type: 'friend', science: 'Trap cropping: aphids prefer nasturtium, concentrating pests away from the cash crop.' },
            { plant1: 'Chamomile', plant2: 'Brassicas', icon1: '\uD83C\uDF3C', icon2: '\uD83E\uDD6C', benefit: 'Chamomile attracts beneficial insects and may improve brassica flavor.', type: 'friend', science: 'Chamomile accumulates calcium, potassium, and sulfur, enriching soil when composted.' },
            { plant1: 'Corn', plant2: 'Sunflower', icon1: '\uD83C\uDF3D', icon2: '\uD83C\uDF3B', benefit: 'ENEMY! Both are heavy nitrogen feeders and compete for the same nutrients.', type: 'enemy', science: 'Resource competition: both crops have high nitrogen demand (>150 lbs N/acre).' },
            { plant1: 'Pea', plant2: 'Carrot', icon1: '\uD83E\uDED1', icon2: '\uD83E\uDD55', benefit: 'Peas fix nitrogen that carrots use; carrots loosen soil for pea roots.', type: 'friend', science: 'Temporal complementarity: peas finish before carrots need maximum root space.' },
            { plant1: 'Mint', plant2: 'Cabbage', icon1: '\uD83C\uDF3F', icon2: '\uD83E\uDD6C', benefit: 'Mint repels cabbage moths, flea beetles, and ants (but spreads aggressively!).', type: 'friend', science: 'Menthol and pulegone vapors disrupt insect nervous systems. Plant mint in containers!' }
          ];

          // === Wave 1: PLANT_FAMILIES ===
          var PLANT_FAMILIES = [
            { name: 'Solanaceae (Nightshade)', icon: '\uD83C\uDF45', members: 'Tomato, pepper, potato, eggplant', rotation: 'Never follow with another nightshade! 3-year rotation minimum.', nutrients: 'Heavy feeders \u2014 need lots of nitrogen and phosphorus.', color: '#ef4444' },
            { name: 'Fabaceae (Legume)', icon: '\uD83E\uDED8', members: 'Bean, pea, lentil, clover', rotation: 'Plant AFTER heavy feeders to replenish nitrogen. Great cover crop.', nutrients: 'Nitrogen fixers \u2014 add 50-200 lbs N/acre to soil!', color: '#22c55e' },
            { name: 'Brassicaceae (Cabbage)', icon: '\uD83E\uDD6C', members: 'Broccoli, cabbage, kale, radish, turnip', rotation: 'Avoid following with other brassicas. Susceptible to clubroot.', nutrients: 'Heavy feeders \u2014 need calcium and sulfur.', color: '#3b82f6' },
            { name: 'Cucurbitaceae (Gourd)', icon: '\uD83C\uDF83', members: 'Squash, cucumber, melon, zucchini', rotation: 'Rotate every 2 years. Susceptible to powdery mildew.', nutrients: 'Heavy feeders \u2014 need compost-rich, well-drained soil.', color: '#f59e0b' },
            { name: 'Poaceae (Grass)', icon: '\uD83C\uDF3E', members: 'Corn, wheat, rice, oats', rotation: 'Follow with legumes to rebuild nitrogen.', nutrients: 'Very heavy feeders \u2014 corn removes 150+ lbs N/acre.', color: '#8b5cf6' },
            { name: 'Apiaceae (Carrot)', icon: '\uD83E\uDD55', members: 'Carrot, parsley, dill, celery, fennel', rotation: '2-3 year rotation. Attract beneficial insects when flowering.', nutrients: 'Light feeders \u2014 too much nitrogen causes forking in root crops.', color: '#f97316' },
            { name: 'Allium (Onion)', icon: '\uD83E\uDDC5', members: 'Onion, garlic, leek, chive, shallot', rotation: 'Good rotation crop \u2014 sulfur compounds suppress soil diseases.', nutrients: 'Moderate feeders \u2014 need potassium for bulb development.', color: '#ec4899' },
            { name: 'Asteraceae (Daisy)', icon: '\uD83C\uDF3B', members: 'Sunflower, lettuce, artichoke, marigold', rotation: 'Sunflowers can deplete soil; follow with legumes.', nutrients: 'Variable \u2014 sunflowers are heavy feeders, lettuce is light.', color: '#14b8a6' }
          ];

          // === Wave 1: SOIL_TYPES ===
          var SOIL_TYPES = [
            { name: 'Sandy', icon: '\uD83C\uDFD6\uFE0F', texture: 'Large particles, gritty', drainage: 'Excellent (too fast!)', nutrients: 'Low retention \u2014 nutrients wash through', bestFor: 'Root crops (carrots, radishes), herbs', improve: 'Add compost and mulch to retain moisture', color: '#f59e0b' },
            { name: 'Clay', icon: '\uD83E\uDEA8', texture: 'Tiny particles, sticky when wet', drainage: 'Poor (waterlogged)', nutrients: 'High retention but hard for roots to access', bestFor: 'Brassicas, beans (once improved)', improve: 'Add gypsum, compost, and sand to improve drainage', color: '#6366f1' },
            { name: 'Loam', icon: '\u2B50', texture: 'Perfect mix of sand, silt, clay', drainage: 'Ideal balance', nutrients: 'Excellent retention and availability', bestFor: 'Almost everything! The gardener\'s dream soil', improve: 'Maintain with regular compost additions', color: '#22c55e' },
            { name: 'Silt', icon: '\uD83C\uDF0A', texture: 'Fine particles, smooth/silky', drainage: 'Moderate', nutrients: 'Good retention, fertile', bestFor: 'Most vegetables, especially moisture-lovers', improve: 'Add organic matter to prevent compaction', color: '#3b82f6' },
            { name: 'Peat', icon: '\uD83E\uDEB5', texture: 'Dark, spongy organic matter', drainage: 'Retains too much water', nutrients: 'Very acidic (pH 3.5-4.5), low in minerals', bestFor: 'Blueberries, azaleas, acid-loving plants', improve: 'Add lime to raise pH, sand for drainage', color: '#854d0e' },
            { name: 'Chalky', icon: '\u26AA', texture: 'Rocky, alkaline, white fragments', drainage: 'Very free-draining', nutrients: 'Alkaline (pH 7.5-8.5), can lock out iron and manganese', bestFor: 'Lavender, spinach, beets, cabbage', improve: 'Add sulfur to lower pH, lots of organic matter', color: '#94a3b8' }
          ];

          // === Wave 1: GARDEN_PESTS ===
          var GARDEN_PESTS = [
            { name: 'Aphids', icon: '\uD83D\uDC1B', damage: 'Suck plant sap, curl leaves, spread viruses', organic: 'Ladybugs, lacewings, neem oil, strong water spray', companion: 'Plant garlic, chives, or nasturtiums nearby' },
            { name: 'Cabbage Worm', icon: '\uD83D\uDC1B', damage: 'Chew large holes in brassica leaves', organic: 'Bt (Bacillus thuringiensis) spray, row covers, hand-pick', companion: 'Plant dill or thyme to attract parasitic wasps' },
            { name: 'Tomato Hornworm', icon: '\uD83D\uDC1B', damage: 'Devour entire tomato plants overnight', organic: 'Hand-pick (look for white cocoons = braconid wasp eggs!), Bt', companion: 'Plant borage and dill to attract predator wasps' },
            { name: 'Squash Bug', icon: '\uD83D\uDC1E', damage: 'Pierce stems, cause wilting and plant death', organic: 'Hand-pick eggs (copper-colored, on leaf undersides), neem oil', companion: 'Plant radishes and nasturtiums as trap crops' },
            { name: 'Japanese Beetle', icon: '\uD83D\uDC1E', damage: 'Skeletonize leaves of roses, beans, grapes', organic: 'Hand-pick into soapy water, milky spore for grubs, neem', companion: 'Plant garlic and chives; avoid linden trees nearby' },
            { name: 'Slug/Snail', icon: '\uD83D\uDC0C', damage: 'Chew irregular holes, leave slime trails, night feeders', organic: 'Beer traps, copper barriers, diatomaceous earth, iron phosphate', companion: 'Plant rosemary, lavender; avoid moist mulch near susceptible plants' },
            { name: 'Flea Beetle', icon: '\uD83D\uDC1E', damage: 'Tiny holes ("shotgun" pattern) in leaves of brassicas, eggplant', organic: 'Row covers, sticky traps, neem oil, kaolin clay', companion: 'Plant radishes as trap crop; interplant with catnip' },
            { name: 'Carrot Rust Fly', icon: '\uD83E\uDEB0', damage: 'Larvae tunnel into carrot roots, causing rust-colored damage', organic: 'Row covers (most effective), delayed planting, sand barriers', companion: 'Plant onions or leeks between carrot rows' },
            { name: 'Spider Mites', icon: '\uD83D\uDD77\uFE0F', damage: 'Stippled/yellowed leaves, fine webbing, thrive in hot dry weather', organic: 'Strong water spray, neem oil, predatory mites', companion: 'Increase humidity; plant coriander and dill for predators' },
            { name: 'Root-Knot Nematode', icon: '\uD83E\uDDA0', damage: 'Galls on roots, stunted growth, yellowing (invisible above ground)', organic: 'French marigolds (kill nematodes!), solarization, crop rotation', companion: 'Plant marigolds for at least one full season before planting susceptibles' }
          ];

          // === Wave 1: BENEFICIAL_INSECTS ===
          var BENEFICIAL_INSECTS = [
            { name: 'Ladybug', icon: '\uD83D\uDC1E', role: 'Eats 5,000+ aphids in its lifetime', attract: 'Dill, fennel, yarrow, dandelion', color: '#ef4444' },
            { name: 'Honeybee', icon: '\uD83D\uDC1D', role: 'Pollinates 80% of flowering plants', attract: 'Lavender, sunflower, borage, clover', color: '#f59e0b' },
            { name: 'Green Lacewing', icon: '\uD83E\uDD97', role: '"Aphid lion" \u2014 larvae eat 200+ aphids/week', attract: 'Coreopsis, cosmos, sweet alyssum', color: '#22c55e' },
            { name: 'Praying Mantis', icon: '\uD83E\uDD97', role: 'Ambush predator of large garden pests', attract: 'Tall grasses, shrubs for egg cases', color: '#8b5cf6' },
            { name: 'Ground Beetle', icon: '\uD83D\uDC1E', role: 'Nocturnal predator of slugs, cutworms, root maggots', attract: 'Mulch, ground cover, logs for shelter', color: '#3b82f6' },
            { name: 'Braconid Wasp', icon: '\uD83D\uDC1D', role: 'Parasitizes hornworms, aphids, caterpillars', attract: 'Dill, parsley, yarrow, wild carrot', color: '#f97316' },
            { name: 'Hoverfly', icon: '\uD83D\uDC1D', role: 'Larvae eat aphids; adults are excellent pollinators', attract: 'Alyssum, calendula, fennel', color: '#14b8a6' },
            { name: 'Earthworm', icon: '\uD83E\uDEB1', role: 'Aerates soil, creates castings (best fertilizer!)', attract: 'Organic matter, mulch, no-till practices', color: '#854d0e' }
          ];

          // === Wave 2: NITROGEN_CYCLE ===
          var NITROGEN_CYCLE = [
            { step: 1, name: 'Atmospheric N\u2082', icon: '\u2601\uFE0F', desc: '78% of air is nitrogen gas (N\u2082), but plants can\'t use it directly.', color: '#94a3b8' },
            { step: 2, name: 'Nitrogen Fixation', icon: '\uD83E\uDDA0', desc: 'Rhizobium bacteria in bean root nodules convert N\u2082 \u2192 NH\u2083 (ammonia).', color: '#22c55e' },
            { step: 3, name: 'Nitrification', icon: '\u2699\uFE0F', desc: 'Soil bacteria convert NH\u2083 \u2192 NO\u2082\u207B \u2192 NO\u2083\u207B (nitrate) \u2014 the form plants absorb.', color: '#3b82f6' },
            { step: 4, name: 'Plant Uptake', icon: '\uD83C\uDF31', desc: 'Roots absorb NO\u2083\u207B from soil water. Used to build amino acids and proteins.', color: '#10b981' },
            { step: 5, name: 'Decomposition', icon: '\uD83C\uDF42', desc: 'Dead plants/animals decompose. Decomposers release N back as NH\u2083.', color: '#f59e0b' },
            { step: 6, name: 'Denitrification', icon: '\uD83D\uDCA8', desc: 'Anaerobic bacteria convert NO\u2083\u207B back to N\u2082 gas (lost to atmosphere).', color: '#ef4444' }
          ];

          // === Wave 2: COMPOSTING_GUIDE ===
          var COMPOST_GREENS = [
            { name: 'Fruit/veggie scraps', icon: '\uD83C\uDF4E', nitrogen: 'high' },
            { name: 'Coffee grounds', icon: '\u2615', nitrogen: 'high' },
            { name: 'Fresh grass clippings', icon: '\uD83C\uDF3F', nitrogen: 'high' },
            { name: 'Plant trimmings', icon: '\u2702\uFE0F', nitrogen: 'medium' },
            { name: 'Eggshells (calcium!)', icon: '\uD83E\uDD5A', nitrogen: 'low' },
            { name: 'Tea bags', icon: '\uD83C\uDF75', nitrogen: 'medium' }
          ];
          var COMPOST_BROWNS = [
            { name: 'Dry leaves', icon: '\uD83C\uDF42', carbon: 'high' },
            { name: 'Cardboard/paper', icon: '\uD83D\uDCE6', carbon: 'high' },
            { name: 'Straw/hay', icon: '\uD83C\uDF3E', carbon: 'high' },
            { name: 'Wood chips', icon: '\uD83E\uDEB5', carbon: 'high' },
            { name: 'Dryer lint', icon: '\uD83E\uDDF5', carbon: 'medium' },
            { name: 'Sawdust', icon: '\uD83E\uDE9A', carbon: 'high' }
          ];
          var COMPOST_NEVER = ['Meat/dairy', 'Diseased plants', 'Pet waste', 'Treated wood', 'Coal ash', 'Glossy paper'];

          // === Wave 2: SEASONAL_CALENDAR ===
          var SEASONAL_CALENDAR = [
            { season: 'Early Spring', icon: '\u2744\uFE0F\u2192\uD83C\uDF31', months: 'Feb-Mar', plants: ['Peas', 'Lettuce', 'Spinach', 'Radish', 'Onion sets'], tasks: 'Start seeds indoors, prepare beds, add compost', tip: 'Cool-season crops can handle light frost!' },
            { season: 'Late Spring', icon: '\uD83C\uDF31', months: 'Apr-May', plants: ['Tomato transplants', 'Peppers', 'Beans', 'Corn', 'Squash'], tasks: 'Direct sow after last frost, mulch heavily', tip: 'The Three Sisters go in NOW after soil reaches 60\u00B0F' },
            { season: 'Summer', icon: '\u2600\uFE0F', months: 'Jun-Aug', plants: ['Succession plant beans/lettuce', 'Start fall brassicas indoors'], tasks: 'Water deeply, manage pests, harvest regularly', tip: 'Morning watering reduces disease. Harvest daily to keep plants producing!' },
            { season: 'Fall', icon: '\uD83C\uDF42', months: 'Sep-Nov', plants: ['Garlic (plant now!)', 'Kale', 'Spinach', 'Cover crops'], tasks: 'Plant cover crops, collect seeds, add mulch', tip: 'Garlic planted in fall produces the biggest bulbs. Cover crops prevent erosion!' },
            { season: 'Winter', icon: '\u2744\uFE0F', months: 'Dec-Jan', plants: ['Plan next year!', 'Order seeds', 'Indoor microgreens'], tasks: 'Soil test, clean tools, review garden journal', tip: 'Use this time to design companion planting layouts for spring.' }
          ];

          // === Wave 2: PH_SCALE ===
          var PH_PLANTS = [
            { name: 'Blueberry', ph: [4.5, 5.5], icon: '\uD83E\uDED0' },
            { name: 'Potato', ph: [5.0, 6.0], icon: '\uD83E\uDD54' },
            { name: 'Strawberry', ph: [5.5, 6.5], icon: '\uD83C\uDF53' },
            { name: 'Tomato', ph: [6.0, 7.0], icon: '\uD83C\uDF45' },
            { name: 'Corn', ph: [6.0, 7.0], icon: '\uD83C\uDF3D' },
            { name: 'Beans', ph: [6.0, 7.5], icon: '\uD83E\uDED8' },
            { name: 'Squash', ph: [6.0, 7.0], icon: '\uD83C\uDF83' },
            { name: 'Lettuce', ph: [6.0, 7.0], icon: '\uD83E\uDD6C' },
            { name: 'Garlic', ph: [6.0, 7.0], icon: '\uD83E\uDDC4' },
            { name: 'Asparagus', ph: [6.5, 8.0], icon: '\uD83E\uDD66' },
            { name: 'Cabbage', ph: [6.5, 7.5], icon: '\uD83E\uDD6C' },
            { name: 'Lavender', ph: [6.5, 8.0], icon: '\uD83D\uDC9C' }
          ];

          // === Wave 3: GARDEN_SCENARIOS ===
          var GARDEN_SCENARIOS = [
            { id: 1, scenario: 'Your tomato leaves have yellow spots and curling. The underside of leaves shows tiny white insects that fly when disturbed.', question: 'What pest is this, and what\'s the best companion planting solution?',
              options: ['Aphids \u2014 plant marigolds', 'Whiteflies \u2014 plant basil and nasturtiums', 'Spider mites \u2014 spray water', 'Leaf miners \u2014 remove leaves'], correct: 1,
              explain: 'Whiteflies! Basil\'s volatile oils repel whiteflies from tomatoes, and nasturtiums act as trap crops. This is why "tomato + basil" is the #1 companion planting pair.', concept: 'Trap Cropping & Volatile Oils' },
            { id: 2, scenario: 'You planted beans and onions in the same bed. The beans are stunted and yellow despite good soil.', question: 'What went wrong?',
              options: ['Too much water', 'Onions inhibit bean nitrogen fixation', 'Beans need more sun', 'Not enough compost'], correct: 1,
              explain: 'Allium compounds from onions suppress Rhizobium bacteria in bean root nodules, blocking nitrogen fixation. NEVER plant beans next to onions, garlic, or leeks!', concept: 'Allelopathic Interference' },
            { id: 3, scenario: 'It\'s mid-summer, 95\u00B0F, and your lettuce is bolting (going to seed) and turning bitter.', question: 'What companion planting strategy could have prevented this?',
              options: ['Plant lettuce with sunflowers for shade', 'Add more fertilizer', 'Water more frequently', 'Plant lettuce with beans'], correct: 0,
              explain: 'Tall companions (sunflowers, corn, pole beans on trellises) create afternoon shade that keeps lettuce cool. Lettuce bolts when soil temperature exceeds 80\u00B0F. Intercropping creates beneficial microclimates!', concept: 'Microclimate Management' },
            { id: 4, scenario: 'Your garden has poor, compacted clay soil with low nitrogen. You can\'t add compost this year.', question: 'Which cover crop combination would best improve this soil?',
              options: ['Crimson clover + annual ryegrass', 'Sunflowers + corn', 'Tomatoes + peppers', 'Lettuce + spinach'], correct: 0,
              explain: 'Clover (legume) fixes nitrogen while ryegrass\'s deep roots break up clay compaction. Together, they add 100+ lbs N/acre and improve soil structure. This is companion planting for the SOIL!', concept: 'Cover Cropping & Soil Building' },
            { id: 5, scenario: 'Cabbage moths are devastating your broccoli. You want to avoid all pesticides, even organic ones.', question: 'What biological control strategy uses companion planting?',
              options: ['Plant mint everywhere', 'Plant dill and yarrow to attract parasitic wasps', 'Plant more broccoli', 'Move broccoli indoors'], correct: 1,
              explain: 'Dill and yarrow attract braconid wasps, which lay eggs inside cabbage moth caterpillars (biological control). The wasps are harmless to humans but devastating to pests. This is called "farmscaping."', concept: 'Biological Control & Farmscaping' },
            { id: 6, scenario: 'You notice your squash plants have flowers but no fruit is forming.', question: 'What\'s the most likely problem?',
              options: ['Too much nitrogen', 'Lack of pollinators', 'Wrong soil pH', 'Overwatering'], correct: 1,
              explain: 'Squash requires insect pollination! Each flower opens for just one day. Plant borage, lavender, or sunflowers nearby to attract bees. In small gardens, you can hand-pollinate with a paintbrush.', concept: 'Pollination Ecology' },
            { id: 7, scenario: 'After 3 years of growing tomatoes in the same spot, yields are declining and plants show disease.', question: 'What principle have you violated?',
              options: ['Companion planting', 'Crop rotation', 'Succession planting', 'Intercropping'], correct: 1,
              explain: 'Crop rotation! Growing the same family in the same spot builds up soil-borne diseases (especially Fusarium, Verticillium). Rotate nightshades (tomato, pepper, potato) with legumes, then brassicas, then root crops.', concept: 'Crop Rotation & Disease Prevention' },
            { id: 8, scenario: 'Your neighbor planted a black walnut tree 20 feet from your garden fence. Your tomatoes near the fence are dying.', question: 'What is killing your tomatoes?',
              options: ['Shade from the tree', 'Juglone toxicity from walnut roots', 'Root competition for water', 'Walnut pollen allergy'], correct: 1,
              explain: 'Black walnuts produce juglone, a chemical that kills tomatoes, peppers, potatoes, and azaleas within the root zone (50-80 feet!). This is allelopathy \u2014 chemical warfare between plants. Plant walnut-tolerant species instead.', concept: 'Allelopathy' },
            { id: 9, scenario: 'You have a 4x8 raised bed and want to maximize food production using companion planting.', question: 'Which combination produces the most food per square foot?',
              options: ['Only tomatoes (monoculture)', 'Three Sisters (corn, beans, squash)', 'Just lettuce rows', 'Separate crops in each quadrant'], correct: 1,
              explain: 'The Three Sisters polyculture produces 20-30% MORE calories per acre than monoculture corn alone! Vertical stacking (corn), nitrogen fixation (beans), and ground cover (squash) maximize every dimension of the growing space.', concept: 'Polyculture Yield Advantage' },
            { id: 10, scenario: 'You want to reduce your garden\'s water usage by 40% without losing production.', question: 'Which companion planting strategy helps the most with water conservation?',
              options: ['Plant drought-resistant varieties only', 'Use squash as living mulch between rows', 'Water at night', 'Dig deeper beds'], correct: 1,
              explain: 'Living mulch (squash, clover, sweet potato vines) shades soil, reducing evaporation by 40-60% and soil temperature by 10\u00B0F. This is exactly why squash is a "Sister" \u2014 it\'s nature\'s mulch!', concept: 'Living Mulch & Water Conservation' }
          ];

          // === Wave 3: GARDEN_FACTS ===
          var GARDEN_FACTS = [
            '\uD83C\uDF3D The Three Sisters have been grown together for 7,000+ years \u2014 longer than the Egyptian pyramids have existed.',
            '\uD83D\uDC1E A single ladybug eats about 5,000 aphids in its lifetime. One egg mass (20-50 eggs) = 100,000+ aphids controlled!',
            '\uD83C\uDF45 Tomato and basil grow better together \u2014 studies show basil improves tomato flavor by increasing volatile oil production.',
            '\uD83E\uDEB1 There are more microorganisms in a teaspoon of healthy soil than there are people on Earth (7+ billion).',
            '\uD83C\uDF3B Sunflowers can extract heavy metals (lead, uranium) from contaminated soil \u2014 a process called phytoremediation.',
            '\uD83C\uDF3E Corn is actually a type of grass (Poaceae family). The \"ears\" are modified flower clusters!',
            '\uD83E\uDDA0 Mycorrhizal fungi connect 90% of plant species in an underground network dubbed the \"Wood Wide Web.\"',
            '\uD83D\uDCA7 A single corn plant transpires 50+ gallons of water during its life \u2014 squash living mulch saves 40% of that.',
            '\uD83E\uDED8 Legumes like beans add 50-200 lbs of nitrogen per acre \u2014 worth $100+ in synthetic fertilizer!',
            '\uD83C\uDF42 Composting diverts 30% of household waste from landfills and creates the best soil amendment money can\'t buy.',
            '\uD83C\uDF3F Mint grows so aggressively it can escape gardens and become invasive. ALWAYS plant mint in containers!',
            '\uD83C\uDF3C Marigold roots kill root-knot nematodes \u2014 plant them one full season before growing tomatoes for nematode-free soil.'
          ];

          // === Wave 3: GARDEN_QUICK_REF ===
          var GARDEN_QUICK_REF = [
            { title: 'The Three Sisters', content: 'Corn (structure) + Beans (nitrogen) + Squash (mulch). 7,000 year-old polyculture.', icon: '\uD83C\uDF3D', color: '#22c55e' },
            { title: 'Crop Rotation Rule', content: 'Legumes \u2192 Brassicas \u2192 Nightshades \u2192 Root crops. Never repeat a family in the same spot!', icon: '\uD83D\uDD04', color: '#3b82f6' },
            { title: 'Compost Ratio', content: '3 parts Brown (carbon) : 1 part Green (nitrogen). Keep moist, turn weekly.', icon: '\u267B\uFE0F', color: '#f59e0b' },
            { title: 'Soil pH Sweet Spot', content: 'Most vegetables prefer pH 6.0-7.0. Test annually. Add lime to raise, sulfur to lower.', icon: '\u2696\uFE0F', color: '#8b5cf6' },
            { title: 'Watering Rule', content: 'Deep and infrequent > shallow and often. Morning watering prevents fungal disease.', icon: '\uD83D\uDCA7', color: '#06b6d4' },
            { title: 'Pest Control Ladder', content: 'Prevention \u2192 Companion planting \u2192 Beneficial insects \u2192 Physical barriers \u2192 Organic sprays (last resort).', icon: '\uD83D\uDC1E', color: '#ef4444' },
            { title: 'Succession Planting', content: 'Plant new seeds every 2-3 weeks for continuous harvest instead of one big crop.', icon: '\uD83D\uDCC5', color: '#10b981' },
            { title: 'Mulch Everything', content: '2-4 inches of organic mulch retains moisture, suppresses weeds, and feeds soil as it decomposes.', icon: '\uD83C\uDF42', color: '#854d0e' }
          ];

          // Wave 3 state
          var gardenScenarioIdx = d.gardenScenarioIdx || 0;
          var gardenScenarioAnswer = d.gardenScenarioAnswer === undefined ? -1 : d.gardenScenarioAnswer;
          var gardenScenarioScore = d.gardenScenarioScore || 0;
          var gardenScenarioTotal = d.gardenScenarioTotal || 0;
          var gardenStreak = d.gardenStreak || 0;
          var gardenBestStreak = d.gardenBestStreak || 0;
          var factIdx = d.factIdx || Math.floor(Math.random() * 12);

          // === Wave 4: FARMING_COMPARISON ===
          var FARMING_SYSTEMS = [
            { id: 'industrial', name: 'Industrial Monoculture', icon: '\uD83C\uDFED', color: '#ef4444',
              energy: { input: 10, output: 1, unit: 'calories fossil fuel per calorie food', eroi: 0.1 },
              water: { usage: 'High (irrigation-dependent)', efficiency: '40-60% reaches crop' },
              chemicals: { fertilizer: '150-200 lbs N/acre synthetic', pesticides: '2-5 lbs/acre/year', herbicides: 'Heavy (Roundup-dependent)' },
              carbon: { emission: '+3.5 tons CO\u2082/acre/year', sequestration: 'None (releases soil carbon)', net: 'Large net emitter' },
              biodiversity: { score: 15, desc: '1 crop species, few insects, depleted soil life' },
              soil: { health: 'Declining (compaction, erosion)', organic: 'Drops 50% in 50 years' },
              yield: { short: 'High (with inputs)', long: 'Declining without increasing inputs' },
              pros: ['High short-term yield', 'Mechanization efficient', 'Cheap per calorie (subsidized)'],
              cons: ['Fossil fuel dependent', 'Soil degradation', 'Water pollution', 'Biodiversity loss', 'Antibiotic resistance'] },
            { id: 'companion', name: 'Companion Planting / Polyculture', icon: '\uD83C\uDF3D', color: '#22c55e',
              energy: { input: 1, output: 3, unit: 'calories fossil fuel per calorie food', eroi: 3.0 },
              water: { usage: 'Low-moderate (living mulch conserves)', efficiency: '80-95% reaches crop' },
              chemicals: { fertilizer: '0 synthetic (nitrogen-fixing legumes)', pesticides: '0 synthetic (biological control)', herbicides: '0 (living mulch suppresses weeds)' },
              carbon: { emission: '-1.5 tons CO\u2082/acre/year', sequestration: 'Active (soil carbon building)', net: 'Net carbon sink!' },
              biodiversity: { score: 85, desc: '10+ species, diverse insects, rich soil microbiome' },
              soil: { health: 'Improving (root diversity, organic matter)', organic: 'Increases 1-2% per decade' },
              yield: { short: 'Moderate per crop (but total higher)', long: 'Increasing as soil improves' },
              pros: ['Builds soil', 'No chemical inputs', 'Water efficient', 'Carbon negative', 'Resilient to pests'],
              cons: ['More labor-intensive', 'Harder to mechanize', 'Requires knowledge', 'Lower per-crop yield'] },
            { id: 'regenerative', name: 'Regenerative Agriculture', icon: '\uD83C\uDF31', color: '#10b981',
              energy: { input: 1, output: 5, unit: 'calories fossil fuel per calorie food', eroi: 5.0 },
              water: { usage: 'Very low (soil holds 20,000 gal/acre per 1% OM)', efficiency: '90%+ (healthy soil = sponge)' },
              chemicals: { fertilizer: '0 (compost + cover crops)', pesticides: '0 (integrated pest management)', herbicides: '0 (cover crop suppression)' },
              carbon: { emission: '-3.0 tons CO\u2082/acre/year', sequestration: 'Maximum (no-till + cover crops + compost)', net: 'Powerful carbon sink' },
              biodiversity: { score: 95, desc: 'Maximized above and below ground; wildlife corridors' },
              soil: { health: 'Rapidly improving', organic: 'Can increase 1% per year with best practices' },
              yield: { short: 'Lower in transition (years 1-3)', long: 'Matches or exceeds conventional after year 5' },
              pros: ['Reverses climate change', 'Eliminates input costs', 'Drought resilient', 'Maximum nutrition', 'Profitable long-term'],
              cons: ['3-5 year transition period', 'Knowledge-intensive', 'Requires patience', 'Not yet subsidized'] }
          ];

          // === Wave 4: FOOD_MILES ===
          var FOOD_MILES = [
            { food: 'Tomato', icon: '\uD83C\uDF45', homegrown: { miles: 0, co2: 0, energy: 0.1 }, store: { miles: 1500, co2: 0.8, energy: 4.2 }, imported: { miles: 5000, co2: 2.5, energy: 12.0 }, season: 'Summer' },
            { food: 'Lettuce', icon: '\uD83E\uDD6C', homegrown: { miles: 0, co2: 0, energy: 0.05 }, store: { miles: 2000, co2: 1.1, energy: 5.0 }, imported: { miles: 6000, co2: 3.2, energy: 15.0 }, season: 'Spring/Fall' },
            { food: 'Beans', icon: '\uD83E\uDED8', homegrown: { miles: 0, co2: 0, energy: 0.08 }, store: { miles: 1000, co2: 0.5, energy: 2.8 }, imported: { miles: 4000, co2: 2.0, energy: 9.5 }, season: 'Summer' },
            { food: 'Squash', icon: '\uD83C\uDF83', homegrown: { miles: 0, co2: 0, energy: 0.12 }, store: { miles: 1200, co2: 0.6, energy: 3.5 }, imported: { miles: 3500, co2: 1.8, energy: 8.0 }, season: 'Summer/Fall' },
            { food: 'Corn', icon: '\uD83C\uDF3D', homegrown: { miles: 0, co2: 0, energy: 0.15 }, store: { miles: 800, co2: 0.4, energy: 2.0 }, imported: { miles: 2000, co2: 1.0, energy: 5.0 }, season: 'Summer' },
            { food: 'Herbs (basil)', icon: '\uD83C\uDF3F', homegrown: { miles: 0, co2: 0, energy: 0.02 }, store: { miles: 2500, co2: 1.5, energy: 7.0 }, imported: { miles: 8000, co2: 4.0, energy: 20.0 }, season: 'Year-round (indoor)' },
            { food: 'Strawberry', icon: '\uD83C\uDF53', homegrown: { miles: 0, co2: 0, energy: 0.06 }, store: { miles: 1500, co2: 0.9, energy: 4.5 }, imported: { miles: 5500, co2: 3.0, energy: 14.0 }, season: 'Spring' },
            { food: 'Pepper', icon: '\uD83C\uDF36\uFE0F', homegrown: { miles: 0, co2: 0, energy: 0.09 }, store: { miles: 1800, co2: 0.9, energy: 4.8 }, imported: { miles: 4500, co2: 2.4, energy: 11.0 }, season: 'Summer' }
          ];

          // === Wave 4: PERMACULTURE_PRINCIPLES ===
          var PERMACULTURE_PRINCIPLES = [
            { num: 1, name: 'Observe & Interact', icon: '\uD83D\uDC41\uFE0F', desc: 'Spend a full year observing your land before making major changes. Where does water flow? Where is sun/shade? What already grows?', example: 'Watch where puddles form after rain \u2014 that\'s where to plant water-loving crops.' },
            { num: 2, name: 'Catch & Store Energy', icon: '\u2600\uFE0F', desc: 'Harvest energy when abundant (sun, rain, fertility) and store for times of need.', example: 'Rain barrels catch water; compost stores nutrients; root cellars store food.' },
            { num: 3, name: 'Obtain a Yield', icon: '\uD83C\uDF3E', desc: 'Ensure you\'re getting useful output from your work. Every element should serve a function.', example: 'A fence could also be a trellis for beans, producing food AND boundary.' },
            { num: 4, name: 'Apply Self-Regulation', icon: '\u267B\uFE0F', desc: 'Create systems that self-correct. Reduce the need for external inputs.', example: 'Companion planting creates pest control that works automatically.' },
            { num: 5, name: 'Use Renewable Resources', icon: '\uD83C\uDF3F', desc: 'Prefer renewable over non-renewable. Sunlight, compost, rainwater over fossil fuels.', example: 'Use composted leaves instead of synthetic fertilizer; saves $200+/year.' },
            { num: 6, name: 'Produce No Waste', icon: '\u2740', desc: 'Every output becomes input for another element. "Waste" is just a resource without a user.', example: 'Kitchen scraps \u2192 compost \u2192 soil \u2192 vegetables \u2192 kitchen scraps (closed loop).' },
            { num: 7, name: 'Design from Patterns', icon: '\uD83C\uDF00', desc: 'Learn nature\'s patterns (spirals, branches, waves) and apply them to garden design.', example: 'Herb spirals use vertical space efficiently; keyhole gardens maximize edge effect.' },
            { num: 8, name: 'Integrate, Don\'t Segregate', icon: '\uD83E\uDD1D', desc: 'Place elements so they support each other. Every element serves multiple functions.', example: 'The Three Sisters: each plant serves 2-3 functions for the others.' },
            { num: 9, name: 'Small & Slow Solutions', icon: '\uD83D\uDC22', desc: 'Start small. Small systems are easier to maintain and adapt.', example: 'Start with one 4\u00D78 bed, not an acre. Master that first.' },
            { num: 10, name: 'Use & Value Diversity', icon: '\uD83C\uDF08', desc: 'Diversity = resilience. Monocultures fail; polycultures thrive.', example: '20 crop species resist disease better than 1. If one fails, others compensate.' },
            { num: 11, name: 'Use Edges & Margins', icon: '\u3030\uFE0F', desc: 'The edge between two ecosystems is the most productive zone.', example: 'Forest edges, pond margins, and garden borders support the most biodiversity.' },
            { num: 12, name: 'Creatively Use Change', icon: '\uD83C\uDF0A', desc: 'Embrace succession and change. Design for evolution, not stasis.', example: 'A fallen tree becomes habitat for fungi, insects, and new plants.' }
          ];

          // === Wave 4: WATER_FOOTPRINT ===
          var WATER_FOOTPRINT = [
            { crop: 'Lettuce', icon: '\uD83E\uDD6C', gallons: 15, unit: 'per head', color: '#22c55e' },
            { crop: 'Tomato', icon: '\uD83C\uDF45', gallons: 22, unit: 'per pound', color: '#ef4444' },
            { crop: 'Corn', icon: '\uD83C\uDF3D', gallons: 108, unit: 'per pound', color: '#f59e0b' },
            { crop: 'Rice', icon: '\uD83C\uDF5A', gallons: 403, unit: 'per pound', color: '#3b82f6' },
            { crop: 'Almonds', icon: '\uD83E\uDD5C', gallons: 1900, unit: 'per pound', color: '#dc2626' },
            { crop: 'Beef', icon: '\uD83E\uDD69', gallons: 1847, unit: 'per pound', color: '#991b1b' },
            { crop: 'Chicken', icon: '\uD83C\uDF57', gallons: 518, unit: 'per pound', color: '#ea580c' },
            { crop: 'Beans', icon: '\uD83E\uDED8', gallons: 43, unit: 'per pound', color: '#16a34a' },
            { crop: 'Potato', icon: '\uD83E\uDD54', gallons: 34, unit: 'per pound', color: '#854d0e' },
            { crop: 'Apple', icon: '\uD83C\uDF4E', gallons: 83, unit: 'per pound', color: '#dc2626' }
          ];

          // === Wave 4: REGEN_PRACTICES ===
          var REGEN_PRACTICES = [
            { name: 'No-Till / Minimal Tillage', icon: '\uD83D\uDEAB', benefit: 'Preserves soil structure, mycorrhizal networks, and earthworm tunnels. Reduces CO\u2082 release.', impact: 'Saves 1 ton CO\u2082/acre/year. Reduces erosion 90%.', difficulty: 'Medium' },
            { name: 'Cover Cropping', icon: '\uD83C\uDF3F', benefit: 'Living roots feed soil biology year-round. Prevents erosion. Fixes nitrogen (legume covers).', impact: 'Adds 50-150 lbs N/acre free. Increases organic matter 0.5%/year.', difficulty: 'Easy' },
            { name: 'Composting', icon: '\u267B\uFE0F', benefit: 'Recycles nutrients, feeds soil microbiome, improves water retention.', impact: '1 inch of compost holds 20,000 extra gallons water/acre.', difficulty: 'Easy' },
            { name: 'Crop Rotation', icon: '\uD83D\uDD04', benefit: 'Breaks pest/disease cycles. Balances nutrient demands. Builds diverse soil biology.', impact: 'Reduces pesticide need 50-80%. Increases yield 10-25%.', difficulty: 'Easy' },
            { name: 'Mulching', icon: '\uD83C\uDF42', benefit: 'Suppresses weeds, retains moisture, moderates temperature, feeds soil as it decomposes.', impact: 'Cuts water use 40-60%. Eliminates most weeding.', difficulty: 'Easy' },
            { name: 'Agroforestry', icon: '\uD83C\uDF33', benefit: 'Trees + crops together. Shade, windbreaks, deep nutrient cycling, carbon storage.', impact: 'Sequesters 5-10 tons CO\u2082/acre/year. Creates microclimates.', difficulty: 'Hard' },
            { name: 'Integrated Pest Management', icon: '\uD83D\uDC1E', benefit: 'Biological control first, chemicals last resort. Preserves beneficial insects.', impact: 'Reduces pesticide use 70-90%. Saves $50-200/acre.', difficulty: 'Medium' },
            { name: 'Rainwater Harvesting', icon: '\uD83D\uDCA7', benefit: 'Capture roof/land runoff for irrigation. Reduces municipal water dependence.', impact: '1 inch rain on 1,000 sq ft roof = 623 gallons free water.', difficulty: 'Medium' },
            { name: 'Biochar', icon: '\uD83D\uDD25', benefit: 'Charcoal added to soil stores carbon for 1000+ years and improves nutrient retention.', impact: 'Sequesters carbon permanently. Improves CEC (nutrient holding capacity).', difficulty: 'Medium' },
            { name: 'Silvopasture', icon: '\uD83D\uDC04', benefit: 'Trees + livestock + pasture. Animals fertilize trees; trees shade animals; grass feeds both.', impact: 'Most carbon-sequestering agricultural practice on Earth.', difficulty: 'Hard' }
          ];



          // ── Canvas Renderer ──

          var _lastGardenCanvas = null;

          var canvasRef = function (canvasEl) {

            if (!canvasEl) {

              if (_lastGardenCanvas && _lastGardenCanvas._gardenAnim) {

                cancelAnimationFrame(_lastGardenCanvas._gardenAnim);

                _lastGardenCanvas._gardenInit = false;

              }

              _lastGardenCanvas = null;

              return;

            }

            _lastGardenCanvas = canvasEl;

            if (canvasEl._gardenInit) return;

            canvasEl._gardenInit = true;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var dpr = 2;

            var tick = 0;

            var _gt = growthTime;



            // Listen for growth updates via data attribute

            canvasEl.setAttribute('data-growth', growthTime);

            canvasEl.setAttribute('data-corn', cornPlanted ? '1' : '0');

            canvasEl.setAttribute('data-beans', beansPlanted ? '1' : '0');

            canvasEl.setAttribute('data-squash', squashPlanted ? '1' : '0');

            canvasEl.setAttribute('data-compare', compareMode ? '1' : '0');



            // Garden entities

            var particles = [];

            for (var pi = 0; pi < 40; pi++) {

              particles.push({ x: Math.random() * cW / dpr, y: Math.random() * cH * 0.3 / dpr, vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.2, life: Math.random() * 200, type: pi < 15 ? 'pollen' : pi < 25 ? 'butterfly' : 'n2' });

            }



            function drawMound(cx, cy, w, h, label, _corn, _beans, _squash, _growth, isMono) {

              var gt = _growth / 100;



              // ── Underground soil layers ──

              // Subsoil

              ctx.fillStyle = '#8B6914';

              ctx.beginPath();

              ctx.ellipse(cx, cy + h * 0.7, w * 1.2, h * 0.5, 0, 0, Math.PI * 2);

              ctx.fill();

              // Topsoil / mound

              var moundGrad = ctx.createRadialGradient(cx, cy - h * 0.1, 0, cx, cy, w);

              moundGrad.addColorStop(0, '#5C4033');

              moundGrad.addColorStop(0.6, '#3E2723');

              moundGrad.addColorStop(1, '#2E1A0E');

              ctx.fillStyle = moundGrad;

              ctx.beginPath();

              ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);

              ctx.fill();

              // Topsoil highlights

              ctx.fillStyle = 'rgba(139,109,60,0.3)';

              ctx.beginPath();

              ctx.ellipse(cx - w * 0.2, cy - h * 0.3, w * 0.3, h * 0.2, -0.3, 0, Math.PI * 2);

              ctx.fill();



              // ── Root systems underground ──

              if (_corn && gt > 0.1) {

                ctx.strokeStyle = 'rgba(255,235,180,0.25)';

                ctx.lineWidth = 1.5;

                for (var ri = 0; ri < 5; ri++) {

                  ctx.beginPath();

                  ctx.moveTo(cx, cy + h * 0.2);

                  var rx = cx + (ri - 2) * w * 0.15;

                  var ry = cy + h * (0.5 + gt * 0.4);

                  ctx.quadraticCurveTo(cx + (ri - 2) * w * 0.08, cy + h * 0.4, rx, ry);

                  ctx.stroke();

                }

              }

              // Bean root nodules (nitrogen-fixing!)

              if (_beans && gt > 0.2) {

                var noduleGlow = 0.3 + 0.4 * Math.sin(tick * 0.03);

                for (var ni = 0; ni < 6; ni++) {

                  var nx = cx + (Math.random() - 0.5) * w * 0.8;

                  var ny = cy + h * (0.3 + Math.random() * 0.4);

                  ctx.fillStyle = 'rgba(120,255,180,' + (noduleGlow * gt) + ')';

                  ctx.beginPath();

                  ctx.arc(nx, ny, 2 + gt * 3, 0, Math.PI * 2);

                  ctx.fill();

                  // N₂ label near nodule

                  if (ni < 2 && gt > 0.5) {

                    ctx.fillStyle = 'rgba(100,255,160,' + (noduleGlow * 0.7) + ')';

                    ctx.font = (8 + gt * 4) + 'px monospace';

                    ctx.fillText('N₂→NH₃', nx + 5, ny - 3);

                  }

                }

              }

              // ── Mycorrhizal fungal network (connecting all root systems) ──

              if ((_corn && _beans || _corn && _squash || _beans && _squash) && gt > 0.25) {

                var netAlpha = Math.min(0.5, (gt - 0.25) * 0.8) * (0.5 + 0.5 * Math.sin(tick * 0.015));

                ctx.strokeStyle = 'rgba(180,140,255,' + netAlpha + ')';

                ctx.lineWidth = 0.8;

                // Draw branching fungal threads across the underground zone

                var netY0 = cy + h * 0.3;

                var netY1 = cy + h * 0.7;

                var netSpanX = w * 0.9;

                for (var fi = 0; fi < 8; fi++) {

                  var fx0 = cx - netSpanX * 0.5 + fi * netSpanX * 0.14;

                  var fy0 = netY0 + (fi % 3) * (netY1 - netY0) * 0.3;

                  var fx1 = fx0 + netSpanX * 0.18 + Math.sin(tick * 0.008 + fi) * 5;

                  var fy1 = fy0 + (netY1 - netY0) * 0.2 + Math.cos(tick * 0.01 + fi * 2) * 4;

                  ctx.beginPath();

                  ctx.moveTo(fx0, fy0);

                  ctx.bezierCurveTo(fx0 + 8, fy0 - 4, fx1 - 6, fy1 + 3, fx1, fy1);

                  ctx.stroke();

                  // Branch nodes (hyphal tips / arbuscules)

                  if (fi % 2 === 0) {

                    ctx.fillStyle = 'rgba(200,160,255,' + (netAlpha * 0.8) + ')';

                    ctx.beginPath(); ctx.arc(fx1, fy1, 1.5 + gt, 0, Math.PI * 2); ctx.fill();

                  }

                }

                // Nutrient transfer indicators (small dots flowing along threads)

                if (gt > 0.5) {

                  for (var nd = 0; nd < 4; nd++) {

                    var ndFrac = ((tick * 0.01 + nd * 0.25) % 1);

                    var ndX = cx - netSpanX * 0.4 + ndFrac * netSpanX * 0.8;

                    var ndY = netY0 + (netY1 - netY0) * 0.3 + Math.sin(ndFrac * Math.PI * 2 + nd) * 6;

                    ctx.fillStyle = 'rgba(255,215,100,' + (0.3 + 0.4 * Math.sin(tick * 0.04 + nd)) + ')';

                    ctx.beginPath(); ctx.arc(ndX, ndY, 1.8, 0, Math.PI * 2); ctx.fill();

                  }

                }

              }



              // ── Corn stalks (enhanced with segments, leaf midribs, silk, husks) ──

              if (_corn) {

                var cornH = gt * h * 2.2;

                var sway = Math.sin(tick * 0.015) * 3 * gt;

                for (var ci = 0; ci < 3; ci++) {

                  var cornX = cx + (ci - 1) * w * 0.15;

                  // Stalk with segments

                  var segCount = Math.floor(3 + gt * 5);

                  for (var seg = 0; seg < segCount; seg++) {

                    var segFrac0 = seg / segCount;

                    var segFrac1 = (seg + 1) / segCount;

                    var sx0 = cornX + sway * segFrac0;

                    var sy0 = cy - h * 0.2 - cornH * segFrac0;

                    var sx1 = cornX + sway * segFrac1;

                    var sy1 = cy - h * 0.2 - cornH * segFrac1;

                    var segWidth = 3 + gt * 3 - seg * 0.3;

                    // Alternating segment shading for realism

                    ctx.strokeStyle = seg % 2 === 0 ? '#2E7D32' : '#388E3C';

                    ctx.lineWidth = Math.max(1.5, segWidth);

                    ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke();

                    // Node joint ring

                    if (seg > 0 && seg < segCount - 1) {

                      ctx.beginPath();

                      ctx.arc(sx0, sy0, segWidth * 0.6, 0, Math.PI * 2);

                      ctx.fillStyle = 'rgba(27,94,32,0.4)';

                      ctx.fill();

                    }

                  }

                  // Corn leaves with midrib

                  if (gt > 0.3) {

                    for (var li = 0; li < 4; li++) {

                      var ly = cy - h * 0.2 - cornH * (0.25 + li * 0.2);

                      var leafSway = Math.sin(tick * 0.02 + li + ci) * 5;

                      var leafDir = (li % 2 === 0 ? 1 : -1);

                      var leafLen = 30 + gt * 10 - li * 3;

                      var leafTipX = cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen + leafSway;

                      var leafTipY = ly + 8;

                      // Leaf blade

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * (0.25 + li * 0.2), ly);

                      ctx.quadraticCurveTo(

                        cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen * 0.6 + leafSway * 0.5, ly - 6,

                        leafTipX, leafTipY

                      );

                      ctx.strokeStyle = '#43A047';

                      ctx.lineWidth = 2.5;

                      ctx.stroke();

                      // Fill leaf shape

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * (0.25 + li * 0.2), ly);

                      ctx.quadraticCurveTo(

                        cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen * 0.6 + leafSway * 0.5, ly - 8,

                        leafTipX, leafTipY

                      );

                      ctx.quadraticCurveTo(

                        cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen * 0.5 + leafSway * 0.3, ly + 3,

                        cornX + sway * (0.25 + li * 0.2), ly

                      );

                      ctx.fillStyle = 'rgba(76,175,80,' + (0.3 + gt * 0.2) + ')';

                      ctx.fill();

                      // Midrib line

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * (0.25 + li * 0.2), ly);

                      ctx.lineTo(leafTipX, leafTipY);

                      ctx.strokeStyle = 'rgba(27,94,32,0.4)';

                      ctx.lineWidth = 0.8;

                      ctx.stroke();

                    }

                  }

                  // Corn tassels with silk threads

                  if (gt > 0.7) {

                    var tasselBase = cy - h * 0.2 - cornH;

                    ctx.fillStyle = '#FDD835';

                    for (var ti = 0; ti < 5; ti++) {

                      var tAngle = (ti / 5) * Math.PI - Math.PI * 0.5;

                      var tLen = 6 + gt * 4;

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * 1.3, tasselBase);

                      ctx.lineTo(cornX + sway * 1.3 + Math.cos(tAngle) * tLen, tasselBase - Math.abs(Math.sin(tAngle)) * tLen * 0.8);

                      ctx.strokeStyle = '#FDD835';

                      ctx.lineWidth = 1.2;

                      ctx.stroke();

                      // Pollen dots at tips

                      ctx.beginPath();

                      ctx.arc(cornX + sway * 1.3 + Math.cos(tAngle) * tLen, tasselBase - Math.abs(Math.sin(tAngle)) * tLen * 0.8, 1.5, 0, Math.PI * 2);

                      ctx.fill();

                    }

                  }

                  // Corn ears with husk detail

                  if (gt > 0.6) {

                    var earY = cy - h * 0.2 - cornH * 0.55;

                    var earX = cornX + sway * 0.5 + 8;

                    // Husk (outer layers)

                    ctx.beginPath();

                    ctx.ellipse(earX - 1, earY, 6 + gt * 2, 10 + gt * 5, 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#8BC34A';

                    ctx.fill();

                    // Ear (inner yellow)

                    ctx.beginPath();

                    ctx.ellipse(earX, earY, 4, 8 + gt * 4, 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#FFB300';

                    ctx.fill();

                    // Kernel rows

                    ctx.beginPath();

                    ctx.ellipse(earX, earY, 3, 6 + gt * 3, 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#C8B900';

                    ctx.fill();

                    // Silk threads emerging from top of ear

                    if (gt > 0.75) {

                      for (var si2 = 0; si2 < 4; si2++) {

                        ctx.beginPath();

                        ctx.moveTo(earX, earY - 8 - gt * 4);

                        ctx.quadraticCurveTo(

                          earX + (si2 - 1.5) * 4 + Math.sin(tick * 0.03 + si2) * 2,

                          earY - 12 - gt * 6,

                          earX + (si2 - 1.5) * 6 + Math.sin(tick * 0.02 + si2) * 3,

                          earY - 16 - gt * 5

                        );

                        ctx.strokeStyle = 'rgba(255,235,180,0.6)';

                        ctx.lineWidth = 0.6;

                        ctx.stroke();

                      }

                    }

                  }

                }

              }



              // ── Bean vines climbing corn ──

              if (_beans && _corn) {

                var beanH = gt * h * 1.8;

                for (var bi = 0; bi < 2; bi++) {

                  var bx = cx + (bi === 0 ? -1 : 1) * w * 0.12;

                  var bSway = Math.sin(tick * 0.02 + bi * 2) * 4;

                  ctx.strokeStyle = '#1B5E20';

                  ctx.lineWidth = 1.5 + gt;

                  ctx.beginPath();

                  ctx.moveTo(bx, cy - h * 0.1);

                  // Spiral up corn stalk

                  for (var bsi = 0; bsi < 10; bsi++) {

                    var bsy = cy - h * 0.1 - beanH * bsi / 10;

                    var bsx = bx + Math.sin(bsi * 0.8 + tick * 0.01) * (6 + gt * 4) + bSway * (bsi / 10);

                    ctx.lineTo(bsx, bsy);

                  }

                  ctx.stroke();

                  // Bean pods

                  if (gt > 0.5) {

                    ctx.fillStyle = '#4CAF50';

                    for (var bpi = 0; bpi < 3; bpi++) {

                      var bpy = cy - h * 0.1 - beanH * (0.3 + bpi * 0.2);

                      var bpx = bx + Math.sin(bpi * 0.8 + tick * 0.01) * (6 + gt * 4) + bSway * (bpi * 0.3 / 3) + 6;

                      ctx.beginPath();

                      ctx.ellipse(bpx, bpy, 2, 5 + gt * 3, 0.5, 0, Math.PI * 2);

                      ctx.fill();

                    }

                  }

                }

              } else if (_beans && !_corn) {

                // Beans without corn — sprawling on ground

                ctx.strokeStyle = '#1B5E20';

                ctx.lineWidth = 1.5;

                for (var bgi = 0; bgi < 4; bgi++) {

                  ctx.beginPath();

                  ctx.moveTo(cx, cy - h * 0.1);

                  ctx.quadraticCurveTo(cx + (bgi - 1.5) * w * 0.3, cy - h * 0.15 - gt * 15, cx + (bgi - 1.5) * w * 0.5, cy - h * 0.05);

                  ctx.stroke();

                }

              }



              // ── Squash vines & leaves (enhanced with multi-lobed leaves, cross-veins, flowers, ribbed fruit) ──

              if (_squash) {

                var sqSpread = gt * w * 1.3;

                for (var si = 0; si < 5; si++) {

                  var angle = (si / 5) * Math.PI * 2 - Math.PI * 0.5;

                  var sqx = cx + Math.cos(angle) * sqSpread * (0.5 + si * 0.12);

                  var sqy = cy + Math.sin(angle) * h * 0.3 * gt + h * 0.1;

                  var vineSway = Math.sin(tick * 0.01 + si) * 3;

                  // Vine with tapered width

                  ctx.strokeStyle = '#2E7D32';

                  ctx.lineWidth = 2 + gt * 2;

                  ctx.beginPath();

                  ctx.moveTo(cx, cy);

                  ctx.quadraticCurveTo(cx + (sqx - cx) * 0.5 + vineSway, sqy - 10, sqx, sqy);

                  ctx.stroke();

                  // Tendrils along vine

                  if (gt > 0.3) {

                    var midVX = cx + (sqx - cx) * 0.5 + vineSway;

                    var midVY = sqy - 10;

                    ctx.strokeStyle = 'rgba(46,125,50,0.5)';

                    ctx.lineWidth = 0.8;

                    for (var tn = 0; tn < 2; tn++) {

                      var tnX = midVX + (tn === 0 ? -8 : 8);

                      var tnY = midVY + tn * 5;

                      ctx.beginPath(); ctx.moveTo(midVX + (sqx - cx) * 0.1 * tn, midVY + tn * 3);

                      ctx.bezierCurveTo(tnX, tnY - 6, tnX + (tn === 0 ? -4 : 4), tnY - 8, tnX + (tn === 0 ? -2 : 2), tnY - 3);

                      ctx.stroke();

                    }

                  }

                  // Multi-lobed squash leaves

                  if (gt > 0.2) {

                    var leafSize = 8 + gt * 18;

                    var leafAlpha = 0.6 + gt * 0.3;

                    // Draw 5-lobed leaf shape

                    ctx.save();

                    ctx.translate(sqx + vineSway, sqy);

                    ctx.rotate(angle + Math.sin(tick * 0.01) * 0.1);

                    // Main leaf body

                    ctx.beginPath();

                    for (var lobe = 0; lobe < 5; lobe++) {

                      var lobeAngle = (lobe / 5) * Math.PI * 2 - Math.PI / 2;

                      var lobeR = leafSize * (lobe % 2 === 0 ? 1 : 0.7);

                      if (lobe === 0) {

                        ctx.moveTo(Math.cos(lobeAngle) * lobeR, Math.sin(lobeAngle) * lobeR * 0.6);

                      } else {

                        ctx.quadraticCurveTo(

                          Math.cos(lobeAngle - 0.3) * leafSize * 0.4,

                          Math.sin(lobeAngle - 0.3) * leafSize * 0.35,

                          Math.cos(lobeAngle) * lobeR,

                          Math.sin(lobeAngle) * lobeR * 0.6

                        );

                      }

                    }

                    ctx.closePath();

                    ctx.fillStyle = 'rgba(76,175,80,' + leafAlpha + ')';

                    ctx.fill();

                    ctx.strokeStyle = 'rgba(46,125,50,0.4)';

                    ctx.lineWidth = 0.6;

                    ctx.stroke();

                    // Central vein + cross veins

                    ctx.strokeStyle = 'rgba(27,94,32,0.35)';

                    ctx.lineWidth = 0.8;

                    ctx.beginPath(); ctx.moveTo(-leafSize * 0.6, 0); ctx.lineTo(leafSize * 0.6, 0); ctx.stroke();

                    ctx.beginPath(); ctx.moveTo(0, -leafSize * 0.4); ctx.lineTo(0, leafSize * 0.4); ctx.stroke();

                    // Cross veins

                    for (var cv = 0; cv < 3; cv++) {

                      var cvX = (-0.4 + cv * 0.4) * leafSize;

                      ctx.beginPath();

                      ctx.moveTo(cvX, -leafSize * 0.25); ctx.lineTo(cvX + 2, leafSize * 0.25);

                      ctx.strokeStyle = 'rgba(27,94,32,0.2)'; ctx.lineWidth = 0.5; ctx.stroke();

                    }

                    ctx.restore();

                  }

                  // Squash flower buds (before fruit)

                  if (gt > 0.4 && gt < 0.7 && si < 3) {

                    var flX = sqx + vineSway + 6;

                    var flY = sqy - 3;

                    ctx.beginPath();

                    for (var petal = 0; petal < 5; petal++) {

                      var petalAngle = (petal / 5) * Math.PI * 2;

                      var petalR = 4 + gt * 3;

                      ctx.ellipse(

                        flX + Math.cos(petalAngle) * petalR * 0.5,

                        flY + Math.sin(petalAngle) * petalR * 0.5,

                        petalR * 0.4, petalR * 0.25, petalAngle, 0, Math.PI * 2

                      );

                    }

                    ctx.fillStyle = 'rgba(255,193,7,0.7)';

                    ctx.fill();

                    // Flower center

                    ctx.beginPath(); ctx.arc(flX, flY, 2, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(255,152,0,0.8)'; ctx.fill();

                  }

                  // Squash fruits with ribs

                  if (gt > 0.65 && si < 3) {

                    var frX = sqx + 5;

                    var frY = sqy + 3;

                    var frW = 6 + gt * 5;

                    var frH = 4 + gt * 3;

                    ctx.fillStyle = si === 0 ? '#FF8F00' : si === 1 ? '#F9A825' : '#FFB300';

                    ctx.beginPath();

                    ctx.ellipse(frX, frY, frW, frH, 0.2, 0, Math.PI * 2);

                    ctx.fill();

                    // Ribs

                    ctx.strokeStyle = 'rgba(0,0,0,0.12)';

                    ctx.lineWidth = 0.6;

                    for (var rib = 0; rib < 4; rib++) {

                      ctx.beginPath();

                      var ribAngle = (rib / 4) * Math.PI;

                      ctx.ellipse(frX, frY, frW * 0.95, frH * 0.3, 0.2 + ribAngle * 0.15, 0, Math.PI * 2);

                      ctx.stroke();

                    }

                    // Shadow

                    ctx.fillStyle = 'rgba(0,0,0,0.1)';

                    ctx.beginPath();

                    ctx.ellipse(frX + 2, frY + frH * 0.7, frW * 0.8, frH * 0.3, 0.2, 0, Math.PI * 2);

                    ctx.fill();

                    // Stem nub

                    ctx.fillStyle = '#558B2F';

                    ctx.beginPath(); ctx.arc(frX - frW + 2, frY - 1, 2, 0, Math.PI * 2); ctx.fill();

                  }

                }

                // Shade coverage indicator

                if (gt > 0.3) {

                  ctx.fillStyle = 'rgba(76,175,80,0.08)';

                  ctx.beginPath();

                  ctx.ellipse(cx, cy + h * 0.1, sqSpread * 1.1, h * 0.5, 0, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // ── Earthworms in soil ──

              if (gt > 0.15) {

                for (var wi = 0; wi < 3; wi++) {

                  var wormX = cx + (wi - 1) * w * 0.35;

                  var wormY = cy + h * (0.25 + wi * 0.15);

                  var wormPhase = tick * 0.03 + wi * 2;

                  var wormAlpha = 0.3 + gt * 0.3;

                  ctx.strokeStyle = 'rgba(205,133,110,' + wormAlpha + ')';

                  ctx.lineWidth = 2;

                  ctx.lineCap = 'round';

                  ctx.beginPath();

                  ctx.moveTo(wormX, wormY);

                  for (var ws = 1; ws <= 6; ws++) {

                    ctx.lineTo(

                      wormX + ws * 4 + Math.sin(wormPhase + ws * 0.8) * 3,

                      wormY + Math.cos(wormPhase + ws * 0.6) * 2

                    );

                  }

                  ctx.stroke();

                  // Worm head

                  ctx.fillStyle = 'rgba(180,110,90,' + wormAlpha + ')';

                  ctx.beginPath();

                  ctx.arc(wormX + 24 + Math.sin(wormPhase + 4.8) * 3, wormY + Math.cos(wormPhase + 3.6) * 2, 2, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // Mound label

              if (label) {

                ctx.fillStyle = 'rgba(255,255,255,0.85)';

                ctx.font = 'bold ' + 11 + 'px system-ui';

                ctx.textAlign = 'center';

                ctx.fillText(label, cx, cy + h + 16);

              }

            }



            function draw() {

              tick++;

              // Read data attrs for latest state

              _gt = parseFloat(canvasEl.getAttribute('data-growth') || '0');

              var _corn = canvasEl.getAttribute('data-corn') === '1';

              var _beans = canvasEl.getAttribute('data-beans') === '1';

              var _squash = canvasEl.getAttribute('data-squash') === '1';

              var _compare = canvasEl.getAttribute('data-compare') === '1';

              var _season = parseInt(canvasEl.getAttribute('data-season') || '0', 10);

              var _dayNum = parseInt(canvasEl.getAttribute('data-day') || '0', 10);

              var _moistLvl = parseInt(canvasEl.getAttribute('data-moisture') || '60', 10);

              var _pestLvl = parseInt(canvasEl.getAttribute('data-pest') || '0', 10);

              var _weedLvl = parseInt(canvasEl.getAttribute('data-weed') || '0', 10);

              var _healthLvl = parseInt(canvasEl.getAttribute('data-health') || '100', 10);



              ctx.clearRect(0, 0, cW, cH);



              // ── Season-aware Sky ──

              var dayPhase = (Math.sin(tick * 0.003) + 1) / 2;

              var seasonSkies = [

                { topH: 170, topS: 65, topL: 65, botH: 90, botS: 45, botL: 80 },   // spring — fresh blue-green

                { topH: 210, topS: 70, topL: 60, botH: 40, botS: 55, botL: 82 },   // summer — deep blue

                { topH: 220, topS: 35, topL: 50, botH: 25, botS: 60, botL: 70 },   // autumn — muted orange

                { topH: 215, topS: 25, topL: 40, botH: 220, botS: 15, botL: 65 }   // winter — gray-blue

              ];

              var ssky = seasonSkies[_season];

              var skyGrad = ctx.createLinearGradient(0, 0, 0, cH * 0.45);

              skyGrad.addColorStop(0, 'hsl(' + ssky.topH + ',' + Math.round(ssky.topS + dayPhase * 10) + '%,' + Math.round(ssky.topL + dayPhase * 10) + '%)');

              skyGrad.addColorStop(1, 'hsl(' + ssky.botH + ',' + Math.round(ssky.botS + dayPhase * 15) + '%,' + Math.round(ssky.botL + dayPhase * 8) + '%)');

              ctx.fillStyle = skyGrad;

              ctx.fillRect(0, 0, cW, cH * 0.45);



              // Sun (smaller in winter, bigger in summer)

              var sunSize = _season === 1 ? 18 : _season === 3 ? 10 : 14;

              var sunX = cW * 0.15 + cW * 0.7 * dayPhase;

              var sunY = cH * 0.05 + Math.sin(dayPhase * Math.PI) * cH * -0.12 + cH * 0.15;

              var sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize * 3);

              sunGlow.addColorStop(0, _season === 3 ? 'rgba(200,210,230,0.7)' : 'rgba(255,235,59,0.9)');

              sunGlow.addColorStop(0.5, _season === 3 ? 'rgba(180,195,220,0.2)' : 'rgba(255,193,7,0.3)');

              sunGlow.addColorStop(1, 'rgba(255,193,7,0)');

              ctx.fillStyle = sunGlow;

              ctx.fillRect(sunX - sunSize * 4, sunY - sunSize * 4, sunSize * 8, sunSize * 8);

              ctx.fillStyle = _season === 3 ? '#B0BEC5' : '#FDD835';

              ctx.beginPath(); ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2); ctx.fill();



              // Snowflakes in winter

              if (_season === 3) {

                ctx.fillStyle = 'rgba(255,255,255,0.7)';

                for (var sfi = 0; sfi < 20; sfi++) {

                  var sfx = ((tick * 0.5 + sfi * 53) % cW);

                  var sfy = ((tick * 0.8 + sfi * 97) % (cH * 0.45));

                  ctx.beginPath();

                  ctx.arc(sfx, sfy, 1.5, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // Clouds

              ctx.fillStyle = _season === 3 ? 'rgba(200,210,230,0.7)' : 'rgba(255,255,255,0.6)';

              for (var cli = 0; cli < 4; cli++) {

                var clx = ((tick * 0.15 + cli * cW / 4) % (cW + 80)) - 40;

                var cly = cH * (0.05 + cli * 0.06);

                ctx.beginPath();

                ctx.ellipse(clx, cly, 30 + cli * 8, 10 + cli * 3, 0, 0, Math.PI * 2);

                ctx.fill();

                ctx.beginPath();

                ctx.ellipse(clx + 20, cly - 5, 20 + cli * 5, 8 + cli * 2, 0, 0, Math.PI * 2);

                ctx.fill();

              }



              // ── Ground (season-tinted) ──

              var groundColors = [

                ['#7CB342', '#558B2F', '#33691E'],  // spring

                ['#8BC34A', '#689F38', '#33691E'],  // summer

                ['#A1887F', '#795548', '#4E342E'],  // autumn

                ['#B0BEC5', '#78909C', '#546E7A']   // winter

              ];

              var gc = groundColors[_season];

              var groundGrad = ctx.createLinearGradient(0, cH * 0.4, 0, cH);

              groundGrad.addColorStop(0, gc[0]);

              groundGrad.addColorStop(0.3, gc[1]);

              groundGrad.addColorStop(1, gc[2]);

              ctx.fillStyle = groundGrad;

              ctx.fillRect(0, cH * 0.4, cW, cH * 0.6);



              // Grass blades (brown in autumn/winter)

              for (var gi = 0; gi < 60; gi++) {

                var gx = (gi / 60) * cW;

                var gy = cH * 0.4 + 2;

                var gSway = Math.sin(tick * 0.015 + gi * 0.5) * 3;

                ctx.strokeStyle = _season >= 2 ? 'rgba(161,136,127,0.4)' : 'rgba(104,159,56,0.5)';

                ctx.lineWidth = 1;

                ctx.beginPath();

                ctx.moveTo(gx, gy);

                ctx.lineTo(gx + gSway, gy - 6 - Math.random() * 6);

                ctx.stroke();

              }



              // ── Draw garden mound(s) ──

              if (_compare) {

                // Split view

                drawMound(cW * 0.27, cH * 0.55, 70, 25, 'Three Sisters (Milpa)', _corn, _beans, _squash, _gt, false);

                drawMound(cW * 0.73, cH * 0.55, 70, 25, 'Monoculture Corn', true, false, false, _gt, true);



                // Divider

                ctx.strokeStyle = 'rgba(255,255,255,0.3)';

                ctx.setLineDash([6, 4]);

                ctx.lineWidth = 1;

                ctx.beginPath();

                ctx.moveTo(cW / 2, cH * 0.1);

                ctx.lineTo(cW / 2, cH * 0.95);

                ctx.stroke();

                ctx.setLineDash([]);



                // Labels

                ctx.fillStyle = 'rgba(255,255,255,0.7)';

                ctx.font = 'bold 10px system-ui';

                ctx.textAlign = 'center';

                ctx.fillText('COMPANION PLANTING', cW * 0.27, cH * 0.92);

                ctx.fillText('MONOCULTURE', cW * 0.73, cH * 0.92);

              } else {

                drawMound(cW * 0.5, cH * 0.58, 100, 35, '', _corn, _beans, _squash, _gt, false);

              }



              // ── Floating particles (pollen, pollinators, N₂ symbols) ──

              particles.forEach(function (p) {

                p.life++;

                p.x += p.vx + Math.sin(tick * 0.01 + p.life * 0.1) * 0.2;

                p.y += p.vy;

                if (p.y < -10 || p.life > 250) { p.y = cH * 0.35 / dpr; p.x = Math.random() * cW / dpr; p.life = 0; }

                var pAlpha = Math.min(1, p.life / 30) * (1 - Math.max(0, p.life - 200) / 50);

                if (p.type === 'pollen' && _gt > 50) {

                  // Pollen with glow

                  ctx.fillStyle = 'rgba(255,235,59,' + (pAlpha * 0.5) + ')';

                  ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();

                  // Pollen glow halo

                  ctx.fillStyle = 'rgba(255,235,59,' + (pAlpha * 0.15) + ')';

                  ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();

                } else if (p.type === 'butterfly' && _gt > 30) {

                  // Enhanced butterfly with detailed wings

                  var wingFlap = Math.sin(tick * 0.08 + p.life) * 0.5;

                  var bfSize = 3.5;

                  ctx.save();

                  ctx.translate(p.x, p.y);

                  // Left upper wing

                  ctx.beginPath();

                  ctx.ellipse(-bfSize * 0.7, -bfSize * 0.15, bfSize * 0.9 * (0.5 + wingFlap * 0.5), bfSize * 0.55, -0.2, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,152,0,' + (pAlpha * 0.7) + ')';

                  ctx.fill();

                  // Right upper wing

                  ctx.beginPath();

                  ctx.ellipse(bfSize * 0.7, -bfSize * 0.15, bfSize * 0.9 * (0.5 + wingFlap * 0.5), bfSize * 0.55, 0.2, 0, Math.PI * 2);

                  ctx.fill();

                  // Left lower wing (smaller)

                  ctx.beginPath();

                  ctx.ellipse(-bfSize * 0.5, bfSize * 0.25, bfSize * 0.55 * (0.5 + wingFlap * 0.5), bfSize * 0.35, -0.3, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,183,77,' + (pAlpha * 0.6) + ')';

                  ctx.fill();

                  // Right lower wing

                  ctx.beginPath();

                  ctx.ellipse(bfSize * 0.5, bfSize * 0.25, bfSize * 0.55 * (0.5 + wingFlap * 0.5), bfSize * 0.35, 0.3, 0, Math.PI * 2);

                  ctx.fill();

                  // Wing pattern spots

                  ctx.fillStyle = 'rgba(230,100,0,' + (pAlpha * 0.4) + ')';

                  ctx.beginPath(); ctx.arc(-bfSize * 0.6, -bfSize * 0.1, bfSize * 0.2, 0, Math.PI * 2); ctx.fill();

                  ctx.beginPath(); ctx.arc(bfSize * 0.6, -bfSize * 0.1, bfSize * 0.2, 0, Math.PI * 2); ctx.fill();

                  // Body

                  ctx.beginPath();

                  ctx.ellipse(0, 0, bfSize * 0.08, bfSize * 0.45, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(40,40,40,' + pAlpha + ')';

                  ctx.fill();

                  // Head

                  ctx.beginPath(); ctx.arc(0, -bfSize * 0.42, bfSize * 0.1, 0, Math.PI * 2);

                  ctx.fill();

                  // Antennae

                  ctx.strokeStyle = 'rgba(40,40,40,' + (pAlpha * 0.6) + ')';

                  ctx.lineWidth = 0.5;

                  ctx.beginPath(); ctx.moveTo(0, -bfSize * 0.5); ctx.lineTo(-bfSize * 0.3, -bfSize * 0.75); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(0, -bfSize * 0.5); ctx.lineTo(bfSize * 0.3, -bfSize * 0.75); ctx.stroke();

                  // Antenna bulbs

                  ctx.fillStyle = 'rgba(40,40,40,' + (pAlpha * 0.5) + ')';

                  ctx.beginPath(); ctx.arc(-bfSize * 0.3, -bfSize * 0.75, 0.6, 0, Math.PI * 2); ctx.fill();

                  ctx.beginPath(); ctx.arc(bfSize * 0.3, -bfSize * 0.75, 0.6, 0, Math.PI * 2); ctx.fill();

                  ctx.restore();

                } else if (p.type === 'n2' && _beans && _gt > 20) {

                  ctx.fillStyle = 'rgba(130,230,170,' + (pAlpha * 0.4) + ')';

                  ctx.font = '8px monospace';

                  ctx.fillText('N₂', p.x, p.y);

                }

              });



              // ── Rain effect (moisture indicator when squash is planted) ──

              if (_squash && _gt > 10) {

                var rainIntensity = Math.min(1, _gt / 60);

                var rainCount = Math.floor(12 * rainIntensity);

                ctx.strokeStyle = 'rgba(100,180,255,' + (0.15 + rainIntensity * 0.2) + ')';

                ctx.lineWidth = 1;

                for (var ri = 0; ri < rainCount; ri++) {

                  var rx = ((tick * 2 + ri * 73) % cW);

                  var ryStart = ((tick * 3 + ri * 137) % (cH * 0.4));

                  var ryLen = 6 + rainIntensity * 8;

                  ctx.beginPath();

                  ctx.moveTo(rx, ryStart);

                  ctx.lineTo(rx - 1, ryStart + ryLen);

                  ctx.stroke();

                  // Splash at ground level

                  if (ryStart + ryLen > cH * 0.38) {

                    ctx.fillStyle = 'rgba(100,180,255,' + (0.1 + rainIntensity * 0.15) + ')';

                    ctx.beginPath();

                    ctx.arc(rx, cH * 0.4, 2, 0, Math.PI * 2);

                    ctx.fill();

                  }

                }

              }



              // ── Pest swarm overlay ──

              if (_pestLvl > 40) {

                var pestAlpha = Math.min(0.6, (_pestLvl - 40) / 100);

                ctx.fillStyle = 'rgba(180,50,30,' + pestAlpha + ')';

                for (var pi2 = 0; pi2 < Math.floor(_pestLvl / 8); pi2++) {

                  var px = ((tick * 1.5 + pi2 * 67) % cW);

                  var py = ((tick * 0.8 + pi2 * 89) % (cH * 0.35)) + cH * 0.1;

                  ctx.beginPath();

                  ctx.arc(px, py, 2 + Math.sin(tick * 0.05 + pi2) * 1, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // ── Weed overlay ──

              if (_weedLvl > 30) {

                var weedAlpha = Math.min(0.5, (_weedLvl - 30) / 140);

                ctx.strokeStyle = 'rgba(60,120,40,' + weedAlpha + ')';

                ctx.lineWidth = 1.5;

                for (var wi2 = 0; wi2 < Math.floor(_weedLvl / 10); wi2++) {

                  var wx = ((wi2 * 83 + 30) % cW);

                  var wy = cH * 0.42;

                  var wSway = Math.sin(tick * 0.02 + wi2) * 4;

                  ctx.beginPath();

                  ctx.moveTo(wx, wy);

                  ctx.quadraticCurveTo(wx + wSway, wy - 12, wx + wSway * 1.5, wy - 18 - wi2 % 4 * 3);

                  ctx.stroke();

                }

              }



              // ── Wilting tint (low moisture) ──

              if (_moistLvl < 25 && (_corn || _beans || _squash)) {

                ctx.fillStyle = 'rgba(180,150,50,' + (0.05 + (25 - _moistLvl) / 100) + ')';

                ctx.fillRect(0, cH * 0.1, cW, cH * 0.35);

              }



              // ── Day / Season HUD ──

              if (_corn || _beans || _squash) {

                var seasonNames = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'];

                var hudText = seasonNames[_season] + '  Day ' + (_dayNum % 30 + 1) + '/30';

                ctx.save();

                ctx.fillStyle = 'rgba(0,0,0,0.55)';

                var hudW = 150, hudH = 24;

                var hudX = 6, hudY = 6;

                ctx.beginPath();

                ctx.roundRect(hudX, hudY, hudW, hudH, 6);

                ctx.fill();

                ctx.fillStyle = '#fff';

                ctx.font = 'bold 11px system-ui';

                ctx.textAlign = 'left';

                ctx.fillText(hudText, hudX + 8, hudY + 16);

                ctx.restore();

              }



              // ── Seasonal Transition Animation ──

              var _dayInSeason = _dayNum % 30;

              if (_dayInSeason < 2 && _dayNum > 1 && (_corn || _beans || _squash)) {

                var _transAlpha = Math.max(0, (2 - _dayInSeason) / 2) * (0.3 + 0.25 * Math.sin(tick * 0.04));

                var _seasonOverlays = [

                  { color: 'rgba(100,200,100,', emoji: '🌱', name: 'Spring' },

                  { color: 'rgba(255,200,50,', emoji: '☀️', name: 'Summer' },

                  { color: 'rgba(180,120,50,', emoji: '🍂', name: 'Autumn' },

                  { color: 'rgba(180,200,230,', emoji: '❄️', name: 'Winter' }

                ];

                var _so = _seasonOverlays[_season];

                ctx.fillStyle = _so.color + _transAlpha + ')';

                ctx.fillRect(0, 0, cW, cH);

                // Banner

                var _bannerAlpha = Math.max(0, (2 - _dayInSeason) / 2) * (0.6 + 0.3 * Math.sin(tick * 0.06));

                ctx.save();

                ctx.fillStyle = 'rgba(0,0,0,' + (_bannerAlpha * 0.6) + ')';

                var _bannerH = 50;

                var _bannerY = cH / 2 - _bannerH / 2;

                ctx.fillRect(0, _bannerY, cW, _bannerH);

                ctx.fillStyle = 'rgba(255,255,255,' + _bannerAlpha + ')';

                ctx.font = 'bold 20px system-ui';

                ctx.textAlign = 'center';

                ctx.textBaseline = 'middle';

                ctx.fillText(_so.emoji + ' ' + _so.name + ' has arrived!', cW / 2, cH / 2);

                ctx.restore();

                // Particles burst (seasonal)

                for (var _tp = 0; _tp < 8; _tp++) {

                  var _tpx = Math.random() * cW;

                  var _tpy = Math.random() * cH * 0.4;

                  var _tpSize = 2 + Math.random() * 3;

                  var _tpAlpha2 = _transAlpha * (0.3 + Math.random() * 0.4);

                  if (_season === 0) { ctx.fillStyle = 'rgba(100,220,100,' + _tpAlpha2 + ')'; } // green buds

                  else if (_season === 1) { ctx.fillStyle = 'rgba(255,220,50,' + _tpAlpha2 + ')'; } // sun sparkles

                  else if (_season === 2) { ctx.fillStyle = 'rgba(200,120,40,' + _tpAlpha2 + ')'; } // falling leaves

                  else { ctx.fillStyle = 'rgba(240,240,255,' + _tpAlpha2 + ')'; } // snowflakes

                  ctx.beginPath(); ctx.arc(_tpx, _tpy, _tpSize, 0, Math.PI * 2); ctx.fill();

                }

              }



              canvasEl._gardenAnim = requestAnimationFrame(draw);

            }

            canvasEl._gardenAnim = requestAnimationFrame(draw);

          };



          // NOTE: Companion Planting hooks (canvas sync + day ticker) have been hoisted

          // to top level of StemLabModal to satisfy React Rules of Hooks.

          // See the top-level hooks near the Synth Keyboard Hook.



          // ── Gauge helper (inline colors to avoid Tailwind JIT purge) ──

          var _gaugeColors = {

            emerald: { light: '#34d399', dark: '#059669', text: '#047857' },

            blue: { light: '#60a5fa', dark: '#2563eb', text: '#1d4ed8' },

            orange: { light: '#fb923c', dark: '#ea580c', text: '#c2410c' },

            red: { light: '#f87171', dark: '#dc2626', text: '#b91c1c' }

          };

          function gauge(label, value, color, icon, unit) {

            var c = _gaugeColors[color] || _gaugeColors.emerald;

            return React.createElement("div", { className: "flex items-center gap-2" },

              React.createElement("span", { className: "text-sm w-5 text-center" }, icon),

              React.createElement("div", { className: "flex-1" },

                React.createElement("div", { className: "flex justify-between mb-0.5" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, label),

                  React.createElement("span", { className: "text-[10px] font-bold", style: { color: c.text } }, Math.round(value) + (unit || '%'))

                ),

                React.createElement("div", { className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden" },

                  React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: { width: Math.round(value) + '%', background: 'linear-gradient(to right, ' + c.light + ', ' + c.dark + ')' } })

                )

              )

            );

          }



          return React.createElement("div", { className: "space-y-4 animate-in fade-in duration-200" },

            // ── Tutorial ──

            renderTutorial('companionPlanting', _tutCompanionPlanting),



            // ── Header ──

            React.createElement("div", { className: "flex items-center justify-between" },

              React.createElement("div", { className: "flex items-center gap-3" },

                React.createElement("button", {

                  onClick: function () { setStemLabTool(null); },

                  className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", "aria-label": "Back to tools"

                }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

                React.createElement("div", null,

                  React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🌱 Companion Planting Lab"),

                  React.createElement("p", { className: "text-xs text-slate-500" }, "The milpa / Three Sisters — 7,000+ years of agricultural science")

                )

              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("button", {

                  onClick: function () { upd('showCulture', !showCulture); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (showCulture ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'),

                  "aria-label": "Cultural context"

                }, "📜 Origins"),

                React.createElement("button", { "aria-label": "Compare",

                  onClick: function () { upd('compareMode', !compareMode); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (compareMode ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-blue-50')

                }, "🔬 Compare"),

                React.createElement("button", { "aria-label": "Soil Science",

                  onClick: function () { upd('showSoilDetail', !showSoilDetail); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (showSoilDetail ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')

                }, "🧪 Soil Science")

              )

            ),



            // ── Cultural Context Panel ──

            showCulture && React.createElement("div", { className: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl border border-amber-200 p-4 space-y-3" },

              React.createElement("h4", { className: "text-sm font-bold text-amber-900 flex items-center gap-2" }, "📜 Cultural Origins & Living Knowledge"),

              React.createElement("div", { className: "grid md:grid-cols-2 gap-3 text-xs text-amber-800 leading-relaxed" },

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "font-bold text-amber-900" }, "Mesoamerican Origins: The Milpa"),

                  React.createElement("p", null, "The companion planting of corn, beans, and squash — known as milpa in Mesoamerica — is one of humanity's oldest agricultural innovations. Archaeological evidence traces this system to over 7,000 years ago in present-day Mexico. Squash was domesticated ~10,000 years ago, maize ~9,000 years ago from the wild grass teosinte, and common beans ~7,000 years ago."),

                  React.createElement("p", null, "The milpa system diffused northward over millennia, appearing in North America around 1070 CE. By the time European colonizers arrived around 1500, it was a foundational food system across Central and North America.")

                ),

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "font-bold text-amber-900" }, "Haudenosaunee Tradition: De-oh-há-ko"),

                  React.createElement("p", null, "The Haudenosaunee (Iroquois Confederacy) call these plants De-oh-há-ko — \"they sustain us.\" The Three Sisters are spiritual beings and precious gifts, central to Haudenosaunee language, ceremony, songs, and cosmology. This is not merely a farming technique — it is a living relationship between people and plants."),

                  React.createElement("p", null, "This knowledge is not historical artifact. Milpa and Three Sisters gardens are actively cultivated today across the Americas, representing a continuous tradition of ecological wisdom.")

                )

              ),

              React.createElement("div", { className: "flex items-center gap-2 pt-1 flex-wrap" },

                React.createElement("span", { className: "text-[10px] font-bold text-amber-600" }, "Learn more:"),

                React.createElement("a", { href: "https://www.haudenosauneeconfederacy.com/", target: "_blank", rel: "noopener noreferrer", className: "text-[10px] text-amber-700 underline hover:text-amber-900" }, "Haudenosaunee Confederacy"),

                React.createElement("span", { className: "text-[10px] text-amber-400" }, "•"),

                React.createElement("a", { href: "https://americanindian.si.edu/", target: "_blank", rel: "noopener noreferrer", className: "text-[10px] text-amber-700 underline hover:text-amber-900" }, "Smithsonian NMAI"),

                React.createElement("span", { className: "text-[10px] text-amber-400" }, "•"),

                React.createElement("a", { href: "https://www.usda.gov/media/blog/2021/11/02/three-sisters-and-more-indigenous-food-systems", target: "_blank", rel: "noopener noreferrer", className: "text-[10px] text-amber-700 underline hover:text-amber-900" }, "USDA: Three Sisters")

              )

            ),



            // ── Main Layout: Canvas + Dashboard ──

            React.createElement("div", { className: "grid md:grid-cols-3 gap-4" },



              // ── Canvas ──

              React.createElement("div", { className: "md:col-span-2" },

                React.createElement("canvas", {

                  ref: canvasRef,

                  "data-companion-canvas": "true",

                  className: "w-full rounded-xl border-2 border-emerald-200 shadow-lg",

                  style: { height: 320, cursor: phase === 'plant' ? 'pointer' : 'default', background: 'linear-gradient(180deg, #87CEEB 0%, #E8F5E9 45%, #558B2F 45%, #33691E 100%)' },

                  role: "img", "aria-label": "Companion planting garden visualization showing corn, beans, and squash growing together"

                })

              ),



              // ── Soil Chemistry Dashboard ──

              React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3 space-y-2.5" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("h4", { className: "text-xs font-bold text-emerald-800 flex items-center gap-1.5" }, "🧪 Needs & Meters"),

                    phase === 'grow' && React.createElement("span", { className: "text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full" },

                      seasonName + ' • Day ' + dayInSeason + '/30'

                    )

                  ),

                  gauge('Moisture', moisture, 'blue', '💧', '%'),

                  gauge('Nitrogen (N₂)', nitrogen, 'emerald', '🫘', '%'),

                  gauge('Pest Pressure', pestPressure, 'red', '🐛', '%'),

                  gauge('Weed Cover', weedPressure, 'orange', '🌿', '%'),

                  gauge('Soil Temp', temperature, 'orange', '🌡️', '°C'),

                  gauge('Plant Health', plantHealth, plantHealth > 60 ? 'emerald' : plantHealth > 30 ? 'orange' : 'red', '❤️', '%'),

                  React.createElement("div", { className: "border-t border-emerald-200 pt-2 mt-2" },

                    React.createElement("div", { className: "flex justify-between items-center" },

                      React.createElement("span", { className: "text-[10px] font-bold text-emerald-700" }, "Overall Soil Health"),

                      React.createElement("span", { className: "text-sm font-bold " + (soilHealth > 70 ? 'text-emerald-700' : soilHealth > 40 ? 'text-amber-600' : 'text-red-600') }, soilHealth + '%')

                    )

                  )

                ),



                // Comparison stats (visible when compare mode is on)

                compareMode && React.createElement("div", { className: "bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 p-3 space-y-2" },

                  React.createElement("h4", { className: "text-xs font-bold text-red-800" }, "🌽 Monoculture Comparison"),

                  gauge('Nitrogen', monoN, 'red', '📉', '%'),

                  gauge('Moisture', monoH2O, 'red', '📉', '%'),

                  gauge('Weeds', monoWeeds, 'red', '📈', '%'),

                  React.createElement("div", { className: "border-t border-red-200 pt-2" },

                    React.createElement("span", { className: "text-[10px] font-bold text-red-700" }, "Soil Health: " + monoHealth + "%")

                  ),

                  growthTime > 30 && React.createElement("div", { className: "text-[10px] text-red-800 bg-red-100 rounded-lg p-2 mt-1" },

                    "⚠️ Without beans, nitrogen depletes. Without squash leaves, moisture drops and weeds take over."

                  )

                ),



                // Soil detail panel

                showSoilDetail && React.createElement("div", { className: "bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl border border-stone-200 p-3 text-[10px] text-stone-700 space-y-2 leading-relaxed" },

                  React.createElement("h4", { className: "font-bold text-stone-800 text-xs" }, "🔬 The Science"),

                  React.createElement("p", null, React.createElement("b", null, "Nitrogen Fixation:"), " Rhizobium bacteria in bean root nodules convert atmospheric N₂ → NH₃ (ammonia) via nitrogenase enzyme. This biological process enriches soil without synthetic fertilizers."),

                  React.createElement("p", null, React.createElement("b", null, "Living Mulch:"), " Squash's broad leaves create ground cover that shades soil, reducing evapotranspiration by up to 50% and suppressing weed germination by blocking sunlight."),

                  React.createElement("p", null, React.createElement("b", null, "Structural Symbiosis:"), " Corn stalks serve as natural trellises for bean vines. Bean vines, in turn, stabilize corn against wind shear."),

                  React.createElement("p", null, React.createElement("b", null, "Nutritional Complementarity:"), " Corn provides methionine-rich carbohydrates; beans provide lysine-rich protein. Together they form a complete amino acid profile — a balanced diet from one garden.")

                )

              )

            ),



            // ── Event Popup ──

            eventPopup && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 p-4 space-y-2 animate-in slide-in-from-top duration-300 shadow-xl" },

              React.createElement("div", { className: "flex items-center justify-between" },

                React.createElement("h4", { className: "text-sm font-bold text-indigo-900 flex items-center gap-2" }, eventPopup.emoji + ' ' + eventPopup.title),

                React.createElement("button", { "aria-label": "Change event popup",

                  onClick: function () { upd('eventPopup', null); },

                  className: "text-indigo-400 hover:text-indigo-700 text-lg font-bold"

                }, "✕")

              ),

              React.createElement("p", { className: "text-xs text-indigo-800 leading-relaxed bg-white/50 rounded-lg p-2" },

                "🔬 ", React.createElement("b", null, "Science: "), eventPopup.lesson

              )

            ),



            // ── Controls Bar ──

            React.createElement("div", { className: "space-y-3" },



              // Seed buttons (planting phase)

              phase === 'plant' && React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },

                React.createElement("div", { className: "flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500 uppercase px-1" }, "Plant:"),

                  React.createElement("button", { "aria-label": "Corn",

                    onClick: function () {

                      upd('cornPlanted', !cornPlanted);

                      if (!cornPlanted) {

                        awardStemXP('companion_planting_corn', 10, 'Planted corn');

                        if (addToast) addToast('🌽 Corn planted! Tall stalks provide a trellis for beans.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (cornPlanted ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-slate-50 text-slate-600 hover:bg-yellow-50 border border-slate-200')

                  }, "🌽 Corn" + (cornPlanted ? ' ✓' : '')),

                  React.createElement("button", { "aria-label": "Beans",

                    onClick: function () {

                      upd('beansPlanted', !beansPlanted);

                      if (!beansPlanted) {

                        awardStemXP('companion_planting_beans', 10, 'Planted beans');

                        if (addToast) addToast('🫘 Beans planted! Rhizobium bacteria fix nitrogen.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (beansPlanted ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-slate-50 text-slate-600 hover:bg-green-50 border border-slate-200')

                  }, "🫘 Beans" + (beansPlanted ? ' ✓' : '')),

                  React.createElement("button", { "aria-label": "Squash",

                    onClick: function () {

                      upd('squashPlanted', !squashPlanted);

                      if (!squashPlanted) {

                        awardStemXP('companion_planting_squash', 10, 'Planted squash');

                        if (addToast) addToast('🎃 Squash planted! Leaves shade soil and trap moisture.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (squashPlanted ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-slate-50 text-slate-600 hover:bg-orange-50 border border-slate-200')

                  }, "🎃 Squash" + (squashPlanted ? ' ✓' : ''))

                ),

                allPlanted && React.createElement("button", { "aria-label": "Grow!",

                  onClick: function () { upd('phase', 'grow'); awardStemXP('companion_planting_grow', 15, 'Started growth simulation'); },

                  className: "px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5"

                }, "▶ Grow!"),

                !allPlanted && React.createElement("span", { className: "text-[10px] text-slate-500 italic" }, "Plant all three seeds to begin")

              ),



              // ── Action Toolbar (grow phase) ──

              phase === 'grow' && React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { className: "text-xs font-bold text-emerald-800" }, "🎮 Actions"),

                  React.createElement("div", { className: "flex-1" }),

                  // Speed controls

                  React.createElement("div", { className: "flex items-center gap-1" },

                    React.createElement("span", { className: "text-[10px] text-emerald-600 font-bold mr-1" }, "Speed:"),

                    [1, 2, 5].map(function (s) {

                      return React.createElement("button", { "aria-label": "Change grow speed",

                        key: s,

                        onClick: function () { upd('growSpeed', s); },

                        className: "px-2 py-0.5 rounded text-[10px] font-bold transition-all " + (growSpeed === s ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50')

                      }, s + '×');

                    })

                  ),

                  React.createElement("span", { className: "text-[10px] font-bold text-emerald-700 ml-2" }, Math.round(growthTime) + "% grown")

                ),

                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },

                  // Action buttons with cooldowns

                  [

                    { id: 'water', emoji: '💧', label: 'Water', tip: 'Irrigation replenishes soil moisture. Over-watering leaches nutrients.' },

                    { id: 'compost', emoji: '🧪', label: 'Compost', tip: 'Composting adds organic nitrogen and beneficial microbes.' },

                    { id: 'weed', emoji: '🌿', label: 'Weed', tip: 'Weeding removes competition for light, water, and nutrients.' },

                    { id: 'inspect', emoji: '🔍', label: 'Inspect', tip: 'Inspecting reveals plant condition and early pest signs.' },

                    { id: 'mulch', emoji: '🍂', label: 'Mulch', tip: 'Mulching regulates soil temperature and retains moisture.' }

                  ].map(function (action) {

                    var cd = (actionCooldowns && actionCooldowns[action.id]) || 0;

                    var onCooldown = cd > day;

                    var pct = onCooldown ? Math.min(100, Math.round(((cd - day) / 5) * 100)) : 0;

                    return React.createElement("button", { "aria-label": "Action",

                      key: action.id,

                      disabled: onCooldown,

                      title: action.tip,

                      onClick: function () {

                        setLabToolData(function (prev) {

                          var cp = Object.assign({}, prev.companionPlanting || {});

                          var cds = Object.assign({}, cp.actionCooldowns || {});

                          cds[action.id] = (cp.day || 0) + 5;

                          if (action.id === 'water') cp.moisture = Math.min(100, (cp.moisture || 60) + 30);

                          else if (action.id === 'compost') cp.nitrogenLevel = Math.min(100, (cp.nitrogenLevel || 35) + 20);

                          else if (action.id === 'weed') cp.weedCover = Math.max(0, (cp.weedCover || 15) - 25);

                          else if (action.id === 'inspect') {

                            cp.plantHealth = Math.min(100, (cp.plantHealth || 100) + 5);

                            cp.pestPressure = Math.max(0, (cp.pestPressure || 10) - 10);

                          }

                          else if (action.id === 'mulch') {

                            cp.soilTemp = cp.soilTemp + (22 - cp.soilTemp) * 0.3;

                            cp.moisture = Math.min(100, (cp.moisture || 60) + 10);

                          }

                          cp.actionCooldowns = cds;

                          return Object.assign({}, prev, { companionPlanting: cp });

                        });

                        if (addToast) addToast(action.emoji + ' ' + action.tip, 'success');

                        awardStemXP('companion_action_' + action.id, 5, action.label);

                      },

                      className: "relative px-3 py-2 rounded-xl text-xs font-bold transition-all border " + (

                        onCooldown

                          ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'

                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 shadow-sm hover:shadow-md'

                      ),

                      style: onCooldown ? { background: 'linear-gradient(to top, rgba(209,250,229,' + pct / 100 + ') ' + pct + '%, #f1f5f9 ' + pct + '%)' } : {}

                    }, action.emoji + ' ' + action.label + (onCooldown ? ' (' + (cd - day) + 'd)' : ''));

                  })

                )

              ),



              // ── Synergy Panel (grow phase) ──

              phase === 'grow' && React.createElement("div", { className: "bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200 p-3 space-y-2" },

                React.createElement("h4", { className: "text-xs font-bold text-purple-800 flex items-center gap-1.5" }, "🤝 Companion Synergies"),

                React.createElement("div", { className: "grid grid-cols-3 gap-3" },

                  [

                    { label: 'Corn ↔ Beans', val: synCornBeans, desc: 'Structural support & N-fixation', color: 'emerald' },

                    { label: 'Beans → Soil', val: synBeansSoil, desc: 'Rhizobium nitrogen enrichment', color: 'blue' },

                    { label: 'Squash → All', val: synSquashAll, desc: 'Living mulch & pest deterrent', color: 'orange' }

                  ].map(function (syn) {

                    var c = _gaugeColors[syn.color] || _gaugeColors.emerald;

                    var unlocked = syn.val >= 50;

                    return React.createElement("div", { key: syn.label, className: "text-center space-y-1" },

                      React.createElement("div", { className: "text-[10px] font-bold " + (unlocked ? 'text-purple-700' : 'text-slate-500') }, (unlocked ? '✨ ' : '🔒 ') + syn.label),

                      React.createElement("div", { className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden" },

                        React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: Math.round(syn.val) + '%', background: 'linear-gradient(to right, ' + c.light + ', ' + c.dark + ')' } })

                      ),

                      React.createElement("div", { className: "text-[11px] text-slate-500" }, syn.desc),

                      React.createElement("div", { className: "text-[10px] font-bold", style: { color: c.text } }, Math.round(syn.val) + '%')

                    );

                  })

                )

              ),



              // ── Harvest Panel ──

              phase === 'harvest' && (() => {

                // Calculate per-crop yields based on health, synergies, and growth

                var _yieldBase = plantHealth / 100;

                var _cornYield = cornPlanted ? Math.round(_yieldBase * (70 + synCornBeans * 0.3) * synergyBonus) : 0;

                var _beanYield = beansPlanted ? Math.round(_yieldBase * (50 + synBeansSoil * 0.4) * synergyBonus) : 0;

                var _squashYield = squashPlanted ? Math.round(_yieldBase * (60 + synSquashAll * 0.35) * synergyBonus) : 0;

                var _totalYield = _cornYield + _beanYield + _squashYield;

                var _maxSingleYield = Math.max(_cornYield, _beanYield, _squashYield, 1);

                return React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-300 p-4 space-y-3 shadow-lg" },

                React.createElement("h4", { className: "text-sm font-bold text-amber-900 flex items-center gap-2" }, "🌾 Season " + (seasonIndex + 1) + " Harvest Report"),

                // ── Per-Crop Yield Indicators ──

                React.createElement("div", { className: "bg-white rounded-xl p-3 space-y-2 border border-amber-200" },

                  React.createElement("div", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1" }, "🌾 Crop Yields"),

                  [

                    { emoji: '🌽', name: 'Corn', value: _cornYield, planted: cornPlanted, color: '#ca8a04', bgColor: '#fef9c3', unit: 'ears' },

                    { emoji: '🫘', name: 'Beans', value: _beanYield, planted: beansPlanted, color: '#16a34a', bgColor: '#dcfce7', unit: 'lbs' },

                    { emoji: '🎃', name: 'Squash', value: _squashYield, planted: squashPlanted, color: '#ea580c', bgColor: '#fff7ed', unit: 'lbs' }

                  ].map(function (crop) {

                    var pct = _maxSingleYield > 0 ? (crop.value / _maxSingleYield) * 100 : 0;

                    return React.createElement("div", { key: crop.name, className: "flex items-center gap-2" },

                      React.createElement("span", { className: "text-base w-6 text-center" }, crop.emoji),

                      React.createElement("div", { className: "flex-1" },

                        React.createElement("div", { className: "flex justify-between mb-0.5" },

                          React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, crop.name),

                          React.createElement("span", { className: "text-[10px] font-bold", style: { color: crop.color } }, crop.planted ? crop.value + ' ' + crop.unit : '—')

                        ),

                        React.createElement("div", { className: "w-full h-2.5 rounded-full overflow-hidden", style: { background: crop.bgColor } },

                          React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: (crop.planted ? Math.round(pct) : 0) + '%', background: crop.color } })

                        )

                      )

                    );

                  }),

                  React.createElement("div", { className: "flex items-center justify-between pt-1.5 border-t border-amber-100 mt-1" },

                    React.createElement("span", { className: "text-[10px] font-bold text-amber-800" }, "Total Harvest"),

                    React.createElement("span", { className: "text-sm font-bold text-amber-700" }, _totalYield + ' units'),

                    synergyBonus > 1.05 && React.createElement("span", { className: "text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full" }, '✨ +' + Math.round((synergyBonus - 1) * 100) + '% synergy bonus')

                  )

                ),

                React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-emerald-700" }, Math.round(plantHealth)),

                    React.createElement("div", { className: "text-[10px] text-slate-500" }, "Health Score")

                  ),

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-blue-700" }, Math.round((synCornBeans + synBeansSoil + synSquashAll) / 3)),

                    React.createElement("div", { className: "text-[10px] text-slate-500" }, "Avg Synergy")

                  ),

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-amber-700" }, seasonScore),

                    React.createElement("div", { className: "text-[10px] text-slate-500" }, "Season Score")

                  )

                ),

                React.createElement("div", { className: "flex items-center justify-between bg-amber-100 rounded-lg p-2" },

                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "🏆 Total Score: " + totalScore),

                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "🌾 Harvests: " + harvestCount)

                ),

                React.createElement("button", { "aria-label": "Action",

                  onClick: function () {

                    var _carry = Math.min(30, nitrogenLevel * 0.3);

                    awardStemXP('companion_planting_harvest', 20, 'Completed harvest');

                    setLabToolData(function (prev) {

                      var cp = Object.assign({}, prev.companionPlanting || {});

                      cp.phase = 'plant';

                      cp.growthTime = 0;

                      cp.cornPlanted = false; cp.beansPlanted = false; cp.squashPlanted = false;

                      cp.moisture = 60; cp.pestPressure = 10; cp.weedCover = 15;

                      cp.plantHealth = 100;

                      cp.nitrogenLevel = 35 + _carry; // nitrogen carryover from good management

                      cp.nitrogenCarryover = _carry;

                      cp.synCornBeans = 0; cp.synBeansSoil = 0; cp.synSquashAll = 0;

                      cp.totalScore = (cp.totalScore || 0) + (cp.seasonScore || 0);

                      cp.harvestCount = (cp.harvestCount || 0) + 1;

                      cp.seasonScore = 0;

                      cp.eventPopup = null;

                      return Object.assign({}, prev, { companionPlanting: cp });

                    });

                    if (addToast) addToast('🌾 Harvest complete! Yield: ' + (_cornYield + _beanYield + _squashYield) + ' units. Nitrogen carryover: +' + Math.round(_carry) + '%. +20 XP', 'success');

                  },

                  className: "w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-200 hover:from-amber-600 hover:to-yellow-700 transition-all"

                }, "🌾 Harvest & Start Next Season →")

              ); })()

            ),



            // ── Quiz Button ──

            React.createElement("div", { className: "flex items-center gap-3" },

              React.createElement("div", { className: "flex-1" }),

              React.createElement("button", { "aria-label": "Quiz",

                onClick: function () { upd('quizActive', !quizActive); upd('quizAnswer', ''); upd('quizFeedback', ''); },

                className: "px-4 py-2 rounded-xl text-xs font-bold transition-all " + (quizActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100')

              }, "🧠 Quiz"),

              React.createElement("button", { "aria-label": "Science",

                onClick: function () { upd('showSciencePanel', !showSciencePanel); },

                className: "px-4 py-2 rounded-xl text-xs font-bold transition-all " + (showSciencePanel ? 'bg-emerald-700 text-white shadow-lg' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100')

              }, "\uD83D\uDCDA Science")

            ),



            // ── Quiz Panel ──

            showSciencePanel && React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-4 space-y-4", style: { maxHeight: '60vh', overflowY: 'auto' } },

              React.createElement("h3", { className: "text-lg font-bold text-emerald-900 flex items-center gap-2" }, "\uD83C\uDF3E The Three Sisters: Science of Companion Planting"),

              React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" },

                React.createElement("div", { className: "bg-yellow-50 rounded-lg p-3 border border-yellow-200" },

                  React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF3D"),

                  React.createElement("h4", { className: "font-bold text-yellow-800" }, "Corn (Structural Support)"),

                  React.createElement("p", { className: "text-xs text-yellow-700 mt-1" }, "Grows tall stalks (6\u201310 ft) that serve as natural trellises for bean vines, providing vertical structure and replacing the need for artificial poles.")

                ),

                React.createElement("div", { className: "bg-green-50 rounded-lg p-3 border border-green-200" },

                  React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF3E"),

                  React.createElement("h4", { className: "font-bold text-green-800" }, "Beans (Nitrogen Fixation)"),

                  React.createElement("p", { className: "text-xs text-green-700 mt-1" }, "Rhizobium bacteria in root nodules convert atmospheric N\u2082 into plant-usable ammonia. This biological nitrogen fixation enriches the soil without synthetic fertilizer.")

                ),

                React.createElement("div", { className: "bg-orange-50 rounded-lg p-3 border border-orange-200" },

                  React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF83"),

                  React.createElement("h4", { className: "font-bold text-orange-800" }, "Squash (Living Mulch)"),

                  React.createElement("p", { className: "text-xs text-orange-700 mt-1" }, "Broad leaves shade the soil, reducing water evaporation by up to 50%. Prickly stems deter animal pests. Acts as natural weed suppression through ground cover.")

                )

              ),

              React.createElement("div", { className: "bg-amber-50 rounded-lg p-4 border border-amber-200" },

                React.createElement("h4", { className: "font-bold text-amber-900 mb-2" }, "\uD83E\uDDEA Underground Chemistry"),

                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },

                  React.createElement("div", { className: "space-y-2" },

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83C\uDF44"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Mycorrhizal Network"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Fungal threads extend root systems 100\u20131000x, creating an underground wood wide web that trades soil minerals for plant sugars.")

                      )

                    ),

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83E\uDDA0"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Rhizobium Nodules"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Specialized bacteria colonize bean roots, forming visible pink nodules. Nitrogenase enzyme breaks the triple bond in N\u2082 gas, producing ammonia for all plants.")

                      )

                    )

                  ),

                  React.createElement("div", { className: "space-y-2" },

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83D\uDCA7"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Water Cycling"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Squash leaf shade reduces soil temperature by up to 10\u00B0F, cutting evaporation in half. Fallen leaves build organic matter, improving water retention.")

                      )

                    ),

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83C\uDF31"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Nutrient Cycling"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Corn is a heavy nitrogen feeder. Beans replace what corn takes. Squash returns organic matter. Together they maintain soil fertility without synthetic inputs.")

                      )

                    )

                  )

                )

              ),

              React.createElement("div", { className: "bg-violet-50 rounded-lg p-4 border border-violet-200" },

                React.createElement("h4", { className: "font-bold text-violet-900 mb-2" }, "\uD83C\uDFDB\uFE0F Cultural Heritage"),

                React.createElement("p", { className: "text-xs text-violet-800" }, "The Three Sisters (De-oh-h\u00E1-ko, meaning \u201Cthey sustain us\u201D in Haudenosaunee) is a 7,000-year-old agricultural system originating in Mesoamerica. Indigenous agricultural science developed sophisticated polyculture techniques millennia before modern ecology."),

                React.createElement("p", { className: "text-xs text-violet-700 mt-2 italic" }, "Together, corn and beans provide a complete protein \u2014 corn supplies methionine while beans supply lysine \u2014 forming the nutritional foundation of many Indigenous diets.")

              )

            ),



            quizActive && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-4 space-y-3" },

              React.createElement("h4", { className: "text-sm font-bold text-indigo-900" }, "🧠 Question " + ((quizQ % quizzes.length) + 1) + " of " + quizzes.length),

              React.createElement("p", { className: "text-sm text-indigo-800" }, currentQuiz.q),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                currentQuiz.opts.map(function (opt) {

                  var isCorrect = opt === currentQuiz.correct;

                  var isSelected = quizAnswer === opt;

                  var showResult = quizAnswer !== '';

                  return React.createElement("button", { "aria-label": "Action",

                    key: opt,

                    disabled: showResult,

                    onClick: function () {

                      upd('quizAnswer', opt);

                      if (isCorrect) {

                        upd('quizFeedback', '✅ Correct! ' + currentQuiz.explain);

                        awardStemXP('companion_planting_quiz', 15, 'Quiz correct: ' + currentQuiz.q.substring(0, 30));

                      } else {

                        upd('quizFeedback', '❌ Not quite. ' + currentQuiz.explain);

                      }

                    },

                    className: "px-4 py-2 rounded-xl text-xs font-bold transition-all border " + (

                      showResult && isCorrect ? 'bg-green-100 text-green-800 border-green-400' :

                        showResult && isSelected && !isCorrect ? 'bg-red-100 text-red-800 border-red-400' :

                          'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'

                    )

                  }, opt);

                })

              ),

              quizFeedback && React.createElement("div", { className: "text-xs leading-relaxed p-3 rounded-lg " + (quizAnswer === currentQuiz.correct ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700') }, quizFeedback),

              quizFeedback && React.createElement("button", { "aria-label": "Change quiz q",

                onClick: function () { upd('quizQ', (quizQ + 1)); upd('quizAnswer', ''); upd('quizFeedback', ''); },

                className: "px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"

              }, quizQ + 1 < quizzes.length ? "Next Question →" : "🔄 Restart Quiz"),

              // AI hint for wrong answers

              quizAnswer && quizAnswer !== currentQuiz.correct && StemAIHintButton('companionPlanting', currentQuiz.q, quizAnswer, currentQuiz.correct)

            ),




            
            
            
            // === FARMING SYSTEMS COMPARISON ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-300 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-green-800" }, "\u2696\uFE0F Sustainable Farming: Industrial vs Regenerative"),
                React.createElement("button", { "aria-label": "Change show farm compare",
                  onClick: function() { upd('showFarmCompare', !d.showFarmCompare); },
                  className: "text-[10px] text-green-600 hover:text-green-800 font-bold"
                }, d.showFarmCompare ? 'Hide' : 'Compare \u2192')
              ),
              d.showFarmCompare && React.createElement("div", null,
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-3" }, "How does companion planting compare to industrial farming? The energy, water, and carbon differences are staggering."),
                // System selector
                React.createElement("div", { className: "flex gap-1 mb-3" },
                  FARMING_SYSTEMS.map(function(sys) {
                    var isActive = (d.farmSystemIdx || 'industrial') === sys.id;
                    return React.createElement("button", { "aria-label": "Change farm system idx", key: sys.id,
                      onClick: function() { upd('farmSystemIdx', sys.id); },
                      className: "flex-1 py-2 px-2 rounded-xl border-2 text-center transition-all " + (isActive ? 'scale-105 shadow-md' : 'hover:scale-[1.02]'),
                      style: { borderColor: isActive ? sys.color : sys.color + '30', background: isActive ? sys.color + '10' : '#fff' }
                    },
                      React.createElement("div", { className: "text-xl" }, sys.icon),
                      React.createElement("div", { className: "text-[11px] font-black", style: { color: sys.color } }, sys.name)
                    );
                  })
                ),
                // Comparison bars
                (function() {
                  var metrics = [
                    { label: 'Energy Efficiency (EROI)', key: 'eroi', max: 5, unit: 'x return', getVal: function(s) { return s.energy.eroi; } },
                    { label: 'Biodiversity Score', key: 'bio', max: 100, unit: '/100', getVal: function(s) { return s.biodiversity.score; } }
                  ];
                  return React.createElement("div", { className: "space-y-2 mb-3" },
                    metrics.map(function(metric) {
                      return React.createElement("div", { key: metric.key },
                        React.createElement("div", { className: "text-[11px] font-bold text-slate-600 mb-0.5" }, metric.label),
                        React.createElement("div", { className: "flex gap-0.5 items-center" },
                          FARMING_SYSTEMS.map(function(sys) {
                            var val = metric.getVal(sys);
                            var pct = Math.min(100, (val / metric.max) * 100);
                            return React.createElement("div", { key: sys.id, className: "flex-1" },
                              React.createElement("div", { className: "h-4 rounded-full bg-slate-100 overflow-hidden" },
                                React.createElement("div", { className: "h-full rounded-full transition-all", style: { width: pct + '%', background: sys.color } })
                              ),
                              React.createElement("div", { className: "text-[7px] text-center font-bold mt-0.5", style: { color: sys.color } }, val + metric.unit)
                            );
                          })
                        )
                      );
                    })
                  );
                })(),
                // Detail panel for selected system
                (function() {
                  var sys = FARMING_SYSTEMS.filter(function(s) { return s.id === (d.farmSystemIdx || 'industrial'); })[0];
                  if (!sys) return null;
                  return React.createElement("div", {
                    className: "rounded-xl p-3 border bg-white",
                    style: { borderColor: sys.color + '40' }
                  },
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 text-[11px]" },
                      React.createElement("div", { className: "rounded-lg p-2 bg-red-50 border border-red-100" },
                        React.createElement("div", { className: "font-bold text-red-700 mb-0.5" }, "\u26A1 Energy"),
                        React.createElement("div", { className: "text-slate-600" }, sys.energy.input + ' cal input \u2192 ' + sys.energy.output + ' cal food'),
                        React.createElement("div", { className: "font-bold", style: { color: sys.color } }, 'EROI: ' + sys.energy.eroi + 'x')
                      ),
                      React.createElement("div", { className: "rounded-lg p-2 bg-blue-50 border border-blue-100" },
                        React.createElement("div", { className: "font-bold text-blue-700 mb-0.5" }, "\uD83D\uDCA7 Water"),
                        React.createElement("div", { className: "text-slate-600" }, sys.water.usage),
                        React.createElement("div", { className: "text-blue-600" }, 'Efficiency: ' + sys.water.efficiency)
                      ),
                      React.createElement("div", { className: "rounded-lg p-2 bg-amber-50 border border-amber-100" },
                        React.createElement("div", { className: "font-bold text-amber-700 mb-0.5" }, "\uD83E\uDDEA Chemicals"),
                        React.createElement("div", { className: "text-slate-600" }, 'Fertilizer: ' + sys.chemicals.fertilizer),
                        React.createElement("div", { className: "text-slate-600" }, 'Pesticides: ' + sys.chemicals.pesticides)
                      ),
                      React.createElement("div", { className: "rounded-lg p-2 border " + (sys.carbon.net.indexOf('sink') >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100') },
                        React.createElement("div", { className: "font-bold " + (sys.carbon.net.indexOf('sink') >= 0 ? 'text-green-700' : 'text-red-700') + " mb-0.5" }, "\uD83C\uDF0D Carbon"),
                        React.createElement("div", { className: "text-slate-600" }, sys.carbon.emission),
                        React.createElement("div", { className: "font-bold " + (sys.carbon.net.indexOf('sink') >= 0 ? 'text-green-600' : 'text-red-600') }, sys.carbon.net)
                      )
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-2" },
                      React.createElement("div", null,
                        React.createElement("div", { className: "text-[8px] font-bold text-green-600 mb-0.5" }, '\u2705 Pros'),
                        sys.pros.map(function(p, pi) { return React.createElement("div", { key: pi, className: "text-[8px] text-slate-500" }, '\u2022 ' + p); })
                      ),
                      React.createElement("div", null,
                        React.createElement("div", { className: "text-[8px] font-bold text-red-500 mb-0.5" }, '\u26A0 Cons'),
                        sys.cons.map(function(c, ci) { return React.createElement("div", { key: ci, className: "text-[8px] text-slate-500" }, '\u2022 ' + c); })
                      )
                    )
                  );
                })()
              )
            ),

            // === FOOD MILES & CARBON CALCULATOR ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-blue-800" }, "\uD83D\uDE9A Food Miles & Carbon Calculator"),
                React.createElement("button", { "aria-label": "Change show food miles",
                  onClick: function() { upd('showFoodMiles', !d.showFoodMiles); },
                  className: "text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                }, d.showFoodMiles ? 'Hide' : 'Calculate \u2192')
              ),
              d.showFoodMiles && React.createElement("div", null,
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-2" }, "How much energy does your food travel? Homegrown food = zero food miles, zero transport emissions."),
                React.createElement("div", { className: "space-y-1" },
                  FOOD_MILES.map(function(food, fi) {
                    var maxEnergy = 20;
                    return React.createElement("div", { key: fi, className: "rounded-lg p-1.5 bg-white border border-blue-100" },
                      React.createElement("div", { className: "flex items-center gap-1.5 mb-0.5" },
                        React.createElement("span", { className: "text-lg" }, food.icon),
                        React.createElement("span", { className: "text-[10px] font-bold text-slate-700 w-16" }, food.food),
                        React.createElement("span", { className: "text-[7px] text-slate-500" }, food.season)
                      ),
                      React.createElement("div", { className: "flex gap-0.5" },
                        // Homegrown bar
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-slate-100 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full bg-green-500", style: { width: Math.max(2, food.homegrown.energy / maxEnergy * 100) + '%' } })
                          ),
                          React.createElement("div", { className: "text-[6px] text-green-600 font-bold" }, '\uD83C\uDFE1 ' + food.homegrown.energy + ' MJ')
                        ),
                        // Store bar
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-slate-100 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full bg-amber-500", style: { width: Math.max(2, food.store.energy / maxEnergy * 100) + '%' } })
                          ),
                          React.createElement("div", { className: "text-[6px] text-amber-600 font-bold" }, '\uD83D\uDED2 ' + food.store.miles + 'mi / ' + food.store.co2 + 'kg CO\u2082')
                        ),
                        // Imported bar
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-slate-100 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full bg-red-500", style: { width: Math.max(2, food.imported.energy / maxEnergy * 100) + '%' } })
                          ),
                          React.createElement("div", { className: "text-[6px] text-red-600 font-bold" }, '\u2708 ' + food.imported.miles + 'mi / ' + food.imported.co2 + 'kg CO\u2082')
                        )
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "flex gap-3 justify-center mt-2 text-[8px]" },
                  React.createElement("span", { className: "flex items-center gap-1" }, React.createElement("span", { className: "w-2 h-2 rounded-full bg-green-500" }), ' Homegrown'),
                  React.createElement("span", { className: "flex items-center gap-1" }, React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-500" }), ' Grocery Store'),
                  React.createElement("span", { className: "flex items-center gap-1" }, React.createElement("span", { className: "w-2 h-2 rounded-full bg-red-500" }), ' Imported')
                ),
                React.createElement("div", { className: "mt-2 text-center rounded-lg p-2 bg-green-50 border border-green-200 text-[11px] text-green-700 font-bold" },
                  '\uD83C\uDF0D A 4\u00D78 garden bed can save ~500 lbs CO\u2082/year compared to buying the same food imported!')
              )
            ),

            // === WATER FOOTPRINT ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-4 border border-cyan-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-cyan-800" }, "\uD83D\uDCA7 Water Footprint of Food"),
                React.createElement("button", { "aria-label": "Change show water foot",
                  onClick: function() { upd('showWaterFoot', !d.showWaterFoot); },
                  className: "text-[10px] text-cyan-600 hover:text-cyan-800 font-bold"
                }, d.showWaterFoot ? 'Hide' : 'View \u2192')
              ),
              d.showWaterFoot && React.createElement("div", null,
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-2" }, "Virtual water: the total water needed to produce food, from field to fork. Companion planting\'s living mulch cuts water use 40-60%!"),
                React.createElement("div", { className: "space-y-0.5" },
                  WATER_FOOTPRINT.sort(function(a, b) { return a.gallons - b.gallons; }).map(function(crop, ci) {
                    var maxGal = 1900;
                    var pct = Math.max(3, (crop.gallons / maxGal) * 100);
                    return React.createElement("div", { key: ci, className: "flex items-center gap-1.5" },
                      React.createElement("span", { className: "text-sm w-5 text-center" }, crop.icon),
                      React.createElement("span", { className: "text-[11px] w-14 font-bold text-slate-600 truncate" }, crop.crop),
                      React.createElement("div", { className: "flex-1 h-3 rounded-full bg-slate-100 overflow-hidden" },
                        React.createElement("div", { className: "h-full rounded-full transition-all", style: { width: pct + '%', background: crop.color } })
                      ),
                      React.createElement("span", { className: "text-[8px] font-bold w-20 text-right", style: { color: crop.color } }, crop.gallons.toLocaleString() + ' gal/' + crop.unit.split(' ')[1])
                    );
                  })
                ),
                React.createElement("div", { className: "mt-2 text-[11px] text-cyan-700 bg-cyan-50 rounded-lg p-2 border border-cyan-100" },
                  '\uD83D\uDCA1 Notice: plant-based proteins (beans: 43 gal/lb) use 43x LESS water than beef (1,847 gal/lb). The Three Sisters provide complete protein at a fraction of the water cost!')
              )
            ),

            // === PERMACULTURE PRINCIPLES ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-violet-800" }, "\uD83C\uDF00 12 Permaculture Principles"),
                React.createElement("button", { "aria-label": "Change show permaculture",
                  onClick: function() { upd('showPermaculture', !d.showPermaculture); },
                  className: "text-[10px] text-violet-600 hover:text-violet-800 font-bold"
                }, d.showPermaculture ? 'Hide' : 'Explore \u2192')
              ),
              d.showPermaculture && React.createElement("div", { className: "grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto" },
                PERMACULTURE_PRINCIPLES.map(function(p, pi) {
                  var isActive = d.permIdx === pi;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: pi,
                    onClick: function() { upd('permIdx', isActive ? null : pi); },
                    className: "cursor-pointer rounded-xl p-2 border transition-all text-center " + (isActive ? 'bg-violet-100 border-violet-400 col-span-3' : 'bg-white border-violet-100 hover:border-violet-300')
                  },
                    React.createElement("div", { className: "text-lg" }, p.icon),
                    React.createElement("div", { className: "text-[8px] font-black text-violet-700" }, '#' + p.num + ' ' + p.name),
                    isActive && React.createElement("div", { className: "text-left mt-1.5" },
                      React.createElement("div", { className: "text-[11px] text-slate-600" }, p.desc),
                      React.createElement("div", { className: "text-[11px] text-emerald-600 mt-1 bg-emerald-50 rounded p-1 border border-emerald-100" }, '\uD83C\uDF31 Example: ' + p.example)
                    )
                  );
                })
              )
            ),

            // === REGENERATIVE PRACTICES ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-emerald-800" }, "\uD83C\uDF31 Regenerative Practices"),
                React.createElement("button", { "aria-label": "Change show regen",
                  onClick: function() { upd('showRegen', !d.showRegen); },
                  className: "text-[10px] text-emerald-600 hover:text-emerald-800 font-bold"
                }, d.showRegen ? 'Hide' : 'Learn \u2192')
              ),
              d.showRegen && React.createElement("div", { className: "space-y-1.5 max-h-56 overflow-y-auto" },
                REGEN_PRACTICES.map(function(practice, pi) {
                  var isActive = d.regenIdx === pi;
                  var diffColor = practice.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : practice.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: pi,
                    onClick: function() { upd('regenIdx', isActive ? null : pi); },
                    className: "cursor-pointer rounded-xl p-2 border transition-all " + (isActive ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-emerald-100 hover:border-emerald-300')
                  },
                    React.createElement("div", { className: "flex items-center gap-1.5" },
                      React.createElement("span", { className: "text-lg" }, practice.icon),
                      React.createElement("span", { className: "text-[10px] font-bold text-emerald-800" }, practice.name),
                      React.createElement("span", { className: "text-[7px] px-1.5 py-0.5 rounded-full font-bold ml-auto " + diffColor }, practice.difficulty)
                    ),
                    isActive && React.createElement("div", { className: "mt-1.5 pl-7 space-y-1" },
                      React.createElement("div", { className: "text-[11px] text-slate-600" }, practice.benefit),
                      React.createElement("div", { className: "text-[11px] text-emerald-700 font-bold bg-emerald-50 rounded p-1 border border-emerald-100" }, '\uD83D\uDCCA Impact: ' + practice.impact)
                    )
                  );
                })
              )
            ),


            // === GARDEN SCENARIO CHALLENGES ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-200 mb-3"
            },
              React.createElement("h4", { className: "text-sm font-bold text-rose-800 mb-2" }, "\uD83C\uDFAF Garden Scenarios (" + (gardenScenarioIdx + 1) + "/" + GARDEN_SCENARIOS.length + ")"),
              React.createElement("div", { className: "flex justify-between items-center mb-2" },
                gardenStreak > 0 ? React.createElement("span", { className: "px-3 py-0.5 rounded-full text-[11px] font-bold " + (gardenStreak >= 5 ? 'bg-amber-700 text-white animate-pulse' : gardenStreak >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600') },
                  '\uD83D\uDD25 ' + gardenStreak + ' streak!') : null,
                React.createElement("span", { className: "text-[11px] text-slate-500" }, 'Score: ' + gardenScenarioScore + '/' + gardenScenarioTotal + ' | Best: ' + gardenBestStreak)
              ),
              (function() {
                var sc = GARDEN_SCENARIOS[gardenScenarioIdx];
                if (!sc) return null;
                var answered = gardenScenarioAnswer >= 0;
                var isCorrect = gardenScenarioAnswer === sc.correct;
                return React.createElement("div", null,
                  React.createElement("div", { className: "bg-white rounded-xl p-3 mb-2 border border-rose-100" },
                    React.createElement("div", { className: "text-[10px] text-slate-700 leading-relaxed" }, sc.scenario)
                  ),
                  React.createElement("div", { className: "text-[10px] font-bold text-slate-800 mb-2" }, sc.question),
                  React.createElement("div", { className: "space-y-1.5 mb-2" },
                    sc.options.map(function(opt, oi) {
                      var isSelected = gardenScenarioAnswer === oi;
                      var isRight = oi === sc.correct;
                      var cls = !answered ? 'border-rose-100 bg-white hover:border-rose-400 cursor-pointer' :
                        isRight ? 'border-green-400 bg-green-50' :
                        isSelected && !isRight ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white opacity-40';
                      return React.createElement("button", { "aria-label": "Companionplanting action", key: oi,
                        onClick: function() {
                          if (answered) return;
                          upd('gardenScenarioAnswer', oi);
                          upd('gardenScenarioTotal', gardenScenarioTotal + 1);
                          if (oi === sc.correct) {
                            upd('gardenScenarioScore', gardenScenarioScore + 1);
                            var ns = gardenStreak + 1;
                            upd('gardenStreak', ns);
                            if (ns > gardenBestStreak) upd('gardenBestStreak', ns);
                            if (addToast) addToast('\u2705 Correct! +1 streak', 'success');
                          } else {
                            upd('gardenStreak', 0);
                            if (addToast) addToast('\u274C Read the explanation!', 'info');
                          }
                        },
                        className: "w-full text-left p-2.5 rounded-xl border-2 text-xs transition-all " + cls,
                        disabled: answered
                      },
                        React.createElement("span", { className: "font-bold mr-1 " + (answered && isRight ? 'text-green-600' : answered && isSelected ? 'text-red-500' : 'text-slate-500') }, String.fromCharCode(65 + oi) + '.'),
                        React.createElement("span", { className: answered && isRight ? 'text-green-700' : answered && isSelected && !isRight ? 'text-red-600' : 'text-slate-700' }, ' ' + opt)
                      );
                    })
                  ),
                  answered && React.createElement("div", { className: "space-y-2" },
                    React.createElement("div", { className: "rounded-xl p-2.5 text-[10px] " + (isCorrect ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') },
                      (isCorrect ? '\u2705 ' : '\u274C ') + sc.explain
                    ),
                    React.createElement("div", { className: "rounded-xl p-2 text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700" },
                      '\uD83D\uDCDA Concept: ' + sc.concept
                    ),
                    React.createElement("button", { "aria-label": "Next Scenario",
                      onClick: function() {
                        upd('gardenScenarioIdx', (gardenScenarioIdx + 1) % GARDEN_SCENARIOS.length);
                        upd('gardenScenarioAnswer', -1);
                      },
                      className: "w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                    }, 'Next Scenario \u2192')
                  )
                );
              })()
            ),

            // === DID YOU KNOW? ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-3 border border-indigo-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xl" }, '\uD83E\uDD14'),
                React.createElement("div", { className: "flex-1" },
                  React.createElement("div", { className: "text-[11px] font-bold text-indigo-500 uppercase tracking-wider" }, 'Did You Know?'),
                  React.createElement("div", { className: "text-[10px] text-indigo-800 leading-relaxed" }, GARDEN_FACTS[factIdx % GARDEN_FACTS.length])
                ),
                React.createElement("button", { "aria-label": "Next",
                  onClick: function() { upd('factIdx', (factIdx + 1) % GARDEN_FACTS.length); },
                  className: "text-[10px] text-indigo-500 hover:text-indigo-700 font-bold"
                }, 'Next \u2192')
              )
            ),

            // === QUICK REFERENCE CARDS ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-4 border border-teal-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-teal-800" }, "\uD83D\uDCCB Quick Reference Cards"),
                React.createElement("button", { "aria-label": "Change show garden ref",
                  onClick: function() { upd('showGardenRef', !d.showGardenRef); },
                  className: "text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                }, d.showGardenRef ? 'Hide' : 'View \u2192')
              ),
              d.showGardenRef && React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                GARDEN_QUICK_REF.map(function(card, ci) {
                  return React.createElement("div", { key: ci,
                    className: "rounded-xl p-2.5 border bg-white hover:shadow-sm transition-all hover:scale-[1.01]",
                    style: { borderColor: card.color + '40' }
                  },
                    React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                      React.createElement("span", { className: "text-lg" }, card.icon),
                      React.createElement("span", { className: "text-[10px] font-black", style: { color: card.color } }, card.title)
                    ),
                    React.createElement("div", { className: "text-[11px] text-slate-600 leading-relaxed" }, card.content)
                  );
                })
              )
            ),


            // === NITROGEN CYCLE ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-blue-800" }, "\u267B\uFE0F The Nitrogen Cycle"),
                React.createElement("button", { "aria-label": "Change show nitrogen",
                  onClick: function() { upd('showNitrogen', !d.showNitrogen); },
                  className: "text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                }, d.showNitrogen ? 'Hide' : 'Explore \u2192')
              ),
              d.showNitrogen && React.createElement("div", null,
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-2" }, "This is why beans are so important! They hack the nitrogen cycle through bacterial symbiosis."),
                React.createElement("div", { className: "flex flex-wrap gap-1 justify-center mb-2" },
                  NITROGEN_CYCLE.map(function(step, si) {
                    var isActive = (d.nitroCycleIdx || 0) === si;
                    return React.createElement("div", { key: si, className: "flex items-center" },
                      React.createElement("button", { "aria-label": "Change nitro cycle idx",
                        onClick: function() { upd('nitroCycleIdx', si); },
                        className: "flex flex-col items-center px-2 py-1.5 rounded-xl border-2 transition-all " + (isActive ? 'scale-110 shadow-md' : 'hover:scale-105'),
                        style: { borderColor: isActive ? step.color : step.color + '30', background: isActive ? step.color + '10' : '#fff' }
                      },
                        React.createElement("span", { className: "text-lg" }, step.icon),
                        React.createElement("span", { className: "text-[7px] font-bold", style: { color: step.color } }, step.name)
                      ),
                      si < 5 && React.createElement("span", { className: "text-slate-500 mx-0.5" }, '\u2192')
                    );
                  })
                ),
                (function() {
                  var step = NITROGEN_CYCLE[d.nitroCycleIdx || 0];
                  return React.createElement("div", { className: "rounded-xl p-2.5 border bg-white text-center", style: { borderColor: step.color + '40' } },
                    React.createElement("div", { className: "text-[10px] font-bold", style: { color: step.color } }, 'Step ' + step.step + ': ' + step.name),
                    React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5" }, step.desc),
                    step.step === 2 && React.createElement("div", { className: "text-[8px] text-emerald-800 bg-emerald-50 rounded p-1 mt-1 border border-emerald-100 font-bold" }, '\uD83C\uDF31 THIS is what bean roots do! Free fertilizer from thin air!')
                  );
                })()
              )
            ),

            // === COMPOSTING GUIDE ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "\u267B\uFE0F Composting Guide"),
                React.createElement("button", { "aria-label": "GREENS (Nitrogen)",
                  onClick: function() { upd('showCompost', !d.showCompost); },
                  className: "text-[10px] text-amber-600 hover:text-amber-800 font-bold"
                }, d.showCompost ? 'Hide' : 'Learn \u2192')
              ),
              d.showCompost && React.createElement("div", null,
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-2" }, "The golden ratio: 3 parts Brown (carbon) to 1 part Green (nitrogen). Keep moist like a wrung-out sponge!"),
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                  React.createElement("div", { className: "rounded-xl p-2 border border-green-300 bg-green-50" },
                    React.createElement("div", { className: "text-[10px] font-bold text-green-700 mb-1" }, "\uD83C\uDF3F GREENS (Nitrogen)"),
                    COMPOST_GREENS.map(function(g, gi) {
                      return React.createElement("div", { key: gi, className: "flex items-center gap-1 text-[11px] text-green-800" },
                        React.createElement("span", null, g.icon), React.createElement("span", null, g.name)
                      );
                    })
                  ),
                  React.createElement("div", { className: "rounded-xl p-2 border border-amber-300 bg-amber-50" },
                    React.createElement("div", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "\uD83C\uDF42 BROWNS (Carbon)"),
                    COMPOST_BROWNS.map(function(b, bi) {
                      return React.createElement("div", { key: bi, className: "flex items-center gap-1 text-[11px] text-amber-800" },
                        React.createElement("span", null, b.icon), React.createElement("span", null, b.name)
                      );
                    })
                  )
                ),
                React.createElement("div", { className: "rounded-lg p-2 bg-red-50 border border-red-200" },
                  React.createElement("div", { className: "text-[11px] font-bold text-red-600" }, "\u274C NEVER compost: " + COMPOST_NEVER.join(' \u2022 '))
                )
              )
            ),

            // === SEASONAL PLANTING CALENDAR ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-emerald-800" }, "\uD83D\uDCC5 Seasonal Planting Calendar"),
                React.createElement("button", { "aria-label": "Change show calendar",
                  onClick: function() { upd('showCalendar', !d.showCalendar); },
                  className: "text-[10px] text-emerald-600 hover:text-emerald-800 font-bold"
                }, d.showCalendar ? 'Hide' : 'Plan \u2192')
              ),
              d.showCalendar && React.createElement("div", { className: "space-y-1.5" },
                SEASONAL_CALENDAR.map(function(season, si) {
                  var isActive = d.calendarIdx === si;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: si,
                    onClick: function() { upd('calendarIdx', isActive ? null : si); },
                    className: "cursor-pointer rounded-xl p-2 border transition-all " + (isActive ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-emerald-100 hover:border-emerald-300')
                  },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-lg" }, season.icon),
                      React.createElement("span", { className: "text-[10px] font-black text-emerald-800" }, season.season),
                      React.createElement("span", { className: "text-[8px] text-slate-500 font-mono ml-auto" }, season.months)
                    ),
                    isActive && React.createElement("div", { className: "mt-1.5 pl-7 space-y-1" },
                      React.createElement("div", { className: "flex flex-wrap gap-1" },
                        season.plants.map(function(p, pi) {
                          return React.createElement("span", { key: pi, className: "px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-100 text-emerald-700" }, p);
                        })
                      ),
                      React.createElement("div", { className: "text-[11px] text-blue-600" }, "\uD83D\uDEE0\uFE0F Tasks: " + season.tasks),
                      React.createElement("div", { className: "text-[11px] text-amber-600 italic" }, "\uD83D\uDCA1 " + season.tip)
                    )
                  );
                })
              )
            ),

            // === SOIL pH SCALE ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-purple-800" }, "\u2696\uFE0F Soil pH & Plant Preferences"),
                React.createElement("button", { "aria-label": "Change show p h",
                  onClick: function() { upd('showPH', !d.showPH); },
                  className: "text-[10px] text-purple-600 hover:text-purple-800 font-bold"
                }, d.showPH ? 'Hide' : 'View \u2192')
              ),
              d.showPH && React.createElement("div", null,
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-2" }, "pH measures soil acidity (1-14). Most veggies prefer 6.0-7.0. Test your soil!"),
                // pH scale bar
                React.createElement("div", { className: "relative h-6 rounded-full overflow-hidden mb-1", style: { background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6)' } },
                  React.createElement("div", { className: "absolute inset-0 flex items-center justify-between px-2" },
                    [4, 5, 6, 7, 8].map(function(ph) {
                      return React.createElement("span", { key: ph, className: "text-[8px] font-bold text-white drop-shadow" }, ph);
                    })
                  )
                ),
                React.createElement("div", { className: "flex justify-between text-[7px] text-slate-500 mb-2 px-1" },
                  React.createElement("span", null, "\u2190 Acidic"),
                  React.createElement("span", null, "Neutral"),
                  React.createElement("span", null, "Alkaline \u2192")
                ),
                // Plant pH ranges
                React.createElement("div", { className: "space-y-0.5" },
                  PH_PLANTS.map(function(plant, pi) {
                    var scaleMin = 4; var scaleMax = 9; var range = scaleMax - scaleMin;
                    var left = ((plant.ph[0] - scaleMin) / range) * 100;
                    var width = ((plant.ph[1] - plant.ph[0]) / range) * 100;
                    return React.createElement("div", { key: pi, className: "flex items-center gap-1" },
                      React.createElement("span", { className: "w-5 text-center text-sm" }, plant.icon),
                      React.createElement("span", { className: "w-16 text-[8px] font-bold text-slate-600 truncate" }, plant.name),
                      React.createElement("div", { className: "flex-1 relative h-3 bg-slate-100 rounded-full" },
                        React.createElement("div", {
                          className: "absolute h-full rounded-full",
                          style: { left: left + '%', width: Math.max(width, 2) + '%', background: 'linear-gradient(to right, #22c55e, #10b981)', opacity: 0.7 }
                        }),
                        React.createElement("span", { className: "absolute text-[6px] font-mono text-slate-500", style: { left: (left + width / 2) + '%', top: '-1px', transform: 'translateX(-50%)' } }, plant.ph[0] + '-' + plant.ph[1])
                      )
                    );
                  })
                )
              )
            ),


            // === COMPANION PLANTING PAIRS ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-green-800" }, "\uD83C\uDF31 Companion Planting Guide (" + COMPANION_PAIRS.length + " pairs)"),
                React.createElement("button", { "aria-label": "Change show pairs",
                  onClick: function() { upd('showPairs', !d.showPairs); },
                  className: "text-[10px] text-green-600 hover:text-green-800 font-bold"
                }, d.showPairs ? 'Hide' : 'Explore \u2192')
              ),
              d.showPairs && React.createElement("div", null,
                // Filter
                React.createElement("div", { className: "flex gap-1 mb-2" },
                  ['all', 'friend', 'enemy'].map(function(f) {
                    return React.createElement("button", { "aria-label": "Change pair filter", key: f,
                      onClick: function() { upd('pairFilter', f); },
                      className: "px-2 py-0.5 rounded-full text-[11px] font-bold " + ((d.pairFilter || 'all') === f ? 'bg-green-700 text-white' : 'bg-white text-green-700 border border-green-200')
                    }, f === 'all' ? 'All' : f === 'friend' ? '\u2705 Friends' : '\u274C Enemies');
                  })
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto" },
                  COMPANION_PAIRS.filter(function(p) { return (d.pairFilter || 'all') === 'all' || p.type === d.pairFilter; }).map(function(pair, pi) {
                    var isActive = d.pairIdx === pi;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: pi,
                      onClick: function() { upd('pairIdx', isActive ? null : pi); },
                      className: "cursor-pointer rounded-xl p-2 border-2 transition-all " + (pair.type === 'enemy' ? 'border-red-200 bg-red-50 hover:border-red-400' : 'border-green-200 bg-white hover:border-green-400') + (isActive ? ' ring-2 ring-green-400' : '')
                    },
                      React.createElement("div", { className: "flex items-center gap-1" },
                        React.createElement("span", { className: "text-lg" }, pair.icon1),
                        React.createElement("span", { className: "text-[10px] " + (pair.type === 'enemy' ? 'text-red-500' : 'text-green-500') + " font-bold" }, pair.type === 'enemy' ? '\u2718' : '\u2764'),
                        React.createElement("span", { className: "text-lg" }, pair.icon2),
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-700" }, pair.plant1 + ' + ' + pair.plant2)
                      ),
                      React.createElement("div", { className: "text-[8px] text-slate-500 mt-0.5" }, pair.benefit),
                      isActive && React.createElement("div", { className: "mt-1 text-[8px] text-indigo-600 bg-indigo-50 rounded p-1 border border-indigo-100" },
                        "\uD83D\uDD2C " + pair.science
                      )
                    );
                  })
                )
              )
            ),

            // === PLANT FAMILIES & ROTATION ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-violet-800" }, "\uD83C\uDF3E Plant Families & Crop Rotation"),
                React.createElement("button", { "aria-label": "Change show families",
                  onClick: function() { upd('showFamilies', !d.showFamilies); },
                  className: "text-[10px] text-violet-600 hover:text-violet-800 font-bold"
                }, d.showFamilies ? 'Hide' : 'Learn \u2192')
              ),
              d.showFamilies && React.createElement("div", { className: "space-y-1.5 max-h-56 overflow-y-auto" },
                React.createElement("div", { className: "text-[10px] text-slate-500 italic mb-1" }, "Never plant the same family in the same spot two years in a row! Rotate to prevent disease buildup and nutrient depletion."),
                PLANT_FAMILIES.map(function(fam, fi) {
                  var isActive = d.familyIdx === fi;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: fi,
                    onClick: function() { upd('familyIdx', isActive ? null : fi); },
                    className: "cursor-pointer rounded-xl p-2 border transition-all " + (isActive ? 'bg-white shadow-sm' : 'bg-violet-50/50 hover:bg-white'),
                    style: { borderColor: isActive ? fam.color : fam.color + '30' }
                  },
                    React.createElement("div", { className: "flex items-center gap-1.5" },
                      React.createElement("span", { className: "text-lg" }, fam.icon),
                      React.createElement("span", { className: "text-[10px] font-black", style: { color: fam.color } }, fam.name),
                      React.createElement("span", { className: "text-[8px] text-slate-500 ml-auto" }, fam.members)
                    ),
                    isActive && React.createElement("div", { className: "mt-1.5 space-y-1 pl-7" },
                      React.createElement("div", { className: "text-[11px] text-blue-600" }, "\uD83D\uDD04 Rotation: " + fam.rotation),
                      React.createElement("div", { className: "text-[11px] text-emerald-600" }, "\uD83C\uDF31 Nutrients: " + fam.nutrients)
                    )
                  );
                })
              )
            ),

            // === SOIL SCIENCE ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "\uD83E\uDEA8 Soil Types Guide"),
                React.createElement("button", { "aria-label": "Change show soil types",
                  onClick: function() { upd('showSoilTypes', !d.showSoilTypes); },
                  className: "text-[10px] text-amber-600 hover:text-amber-800 font-bold"
                }, d.showSoilTypes ? 'Hide' : 'Explore \u2192')
              ),
              d.showSoilTypes && React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                SOIL_TYPES.map(function(soil, si) {
                  var isActive = d.soilTypeIdx === si;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: si,
                    onClick: function() { upd('soilTypeIdx', isActive ? null : si); },
                    className: "cursor-pointer rounded-xl p-2 border-2 text-center transition-all " + (isActive ? 'scale-[1.03] shadow-md' : 'hover:scale-[1.01]'),
                    style: { borderColor: isActive ? soil.color : soil.color + '30', background: isActive ? soil.color + '10' : '#fff' }
                  },
                    React.createElement("div", { className: "text-xl mb-0.5" }, soil.icon),
                    React.createElement("div", { className: "text-[10px] font-black", style: { color: soil.color } }, soil.name),
                    React.createElement("div", { className: "text-[8px] text-slate-500" }, soil.texture),
                    isActive && React.createElement("div", { className: "text-left mt-1.5 space-y-0.5" },
                      React.createElement("div", { className: "text-[8px] text-blue-600" }, "\uD83D\uDCA7 Drainage: " + soil.drainage),
                      React.createElement("div", { className: "text-[8px] text-emerald-600" }, "\uD83C\uDF31 Nutrients: " + soil.nutrients),
                      React.createElement("div", { className: "text-[8px] text-amber-600" }, "\u2B50 Best for: " + soil.bestFor),
                      React.createElement("div", { className: "text-[8px] text-violet-600" }, "\uD83D\uDD27 Improve: " + soil.improve)
                    )
                  );
                })
              )
            ),

            // === PEST & BENEFICIAL INSECTS ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-4 border border-red-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-red-800" }, "\uD83D\uDC1E Garden Pests & Allies"),
                React.createElement("button", { "aria-label": "Change show pests",
                  onClick: function() { upd('showPests', !d.showPests); },
                  className: "text-[10px] text-red-600 hover:text-red-800 font-bold"
                }, d.showPests ? 'Hide' : 'Identify \u2192')
              ),
              d.showPests && React.createElement("div", null,
                React.createElement("div", { className: "flex gap-1 mb-2" },
                  React.createElement("button", { "aria-label": "Pests (",
                    onClick: function() { upd('pestTab', 'pests'); },
                    className: "px-2 py-0.5 rounded-full text-[11px] font-bold " + ((d.pestTab || 'pests') === 'pests' ? 'bg-red-700 text-white' : 'bg-white text-red-600 border border-red-200')
                  }, "\uD83D\uDC1B Pests (" + GARDEN_PESTS.length + ")"),
                  React.createElement("button", { "aria-label": "Allies (",
                    onClick: function() { upd('pestTab', 'beneficial'); },
                    className: "px-2 py-0.5 rounded-full text-[11px] font-bold " + ((d.pestTab || 'pests') === 'beneficial' ? 'bg-green-700 text-white' : 'bg-white text-green-600 border border-green-200')
                  }, "\uD83D\uDC1E Allies (" + BENEFICIAL_INSECTS.length + ")")
                ),
                (d.pestTab || 'pests') === 'pests' ?
                  React.createElement("div", { className: "space-y-1 max-h-48 overflow-y-auto" },
                    GARDEN_PESTS.map(function(pest, pi) {
                      var isActive = d.pestIdx === pi;
                      return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: pi,
                        onClick: function() { upd('pestIdx', isActive ? null : pi); },
                        className: "cursor-pointer rounded-lg p-2 border transition-all " + (isActive ? 'bg-red-50 border-red-300' : 'bg-white border-red-100 hover:border-red-300')
                      },
                        React.createElement("div", { className: "flex items-center gap-1.5" },
                          React.createElement("span", { className: "text-lg" }, pest.icon),
                          React.createElement("span", { className: "text-[10px] font-bold text-red-800" }, pest.name),
                          React.createElement("span", { className: "text-[8px] text-slate-500 ml-auto" }, pest.damage.substring(0, 30) + '...')
                        ),
                        isActive && React.createElement("div", { className: "mt-1.5 space-y-0.5 pl-7" },
                          React.createElement("div", { className: "text-[11px] text-red-600" }, "\uD83D\uDCA5 Damage: " + pest.damage),
                          React.createElement("div", { className: "text-[11px] text-green-600" }, "\uD83C\uDF3F Organic control: " + pest.organic),
                          React.createElement("div", { className: "text-[11px] text-blue-600" }, "\uD83C\uDF31 Companion fix: " + pest.companion)
                        )
                      );
                    })
                  ) :
                  React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                    BENEFICIAL_INSECTS.map(function(bug, bi) {
                      return React.createElement("div", { key: bi,
                        className: "rounded-xl p-2 border bg-white hover:shadow-sm transition-all",
                        style: { borderColor: bug.color + '40' }
                      },
                        React.createElement("div", { className: "flex items-center gap-1 mb-0.5" },
                          React.createElement("span", { className: "text-lg" }, bug.icon),
                          React.createElement("span", { className: "text-[10px] font-bold", style: { color: bug.color } }, bug.name)
                        ),
                        React.createElement("div", { className: "text-[8px] text-slate-600" }, bug.role),
                        React.createElement("div", { className: "text-[8px] text-emerald-600 mt-0.5" }, "\uD83C\uDF3C Attract with: " + bug.attract)
                      );
                    })
                  )
              )
            ),


            // ── Snapshot button ──

            React.createElement("button", { "aria-label": "Snapshot",

              onClick: function () {

                setToolSnapshots(function (prev) { return prev.concat([{ id: 'garden-' + Date.now(), tool: 'companionPlanting', label: 'Companion Planting Lab', data: Object.assign({}, d), timestamp: Date.now() }]); });

                if (addToast) addToast('📸 Garden snapshot saved!', 'success');

              },

              className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-full hover:from-emerald-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all"

            }, "📸 Snapshot")

          );
      })();
    }
  });


})();

} // end dedup guard
